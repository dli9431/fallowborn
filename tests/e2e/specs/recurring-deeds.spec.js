'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js', 'data/technology.js', 'js/actions.js', 'js/main.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js', 'js/ui_topbar.js',
  'js/technology.js', 'js/events.js', 'js/model.js', 'js/intrigue.js', 'js/mods.js',
  'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.state.date.day = 20; // keep the bounded daily scenarios off a season edge
    FB.state.slotDays = [];
    FB.state.player.gold = 100;
    FB.state.player.cooldowns = {};
    FB.pickDailyEvents = function () { return []; };
    FB.game.auto.recurringDeeds = {};
    FB.ui.showTab('actions');
  });
});

test('checklist excludes decisions and persists selections without executing while open',
  async function ({ page }) {
    await page.evaluate(function () { FB.ui.showAutoResolve(); });
    for (const id of ['give_alms', 'mediate']) {
      await expect(page.locator('#ar-deed-' + id)).not.toBeChecked();
    }
    for (const id of ['seek_blessing', 'hold_court', 'hold_feast', 'convene_synod', 'seek_match']) {
      await expect(page.locator('#ar-deed-' + id)).toHaveCount(0);
    }
    for (const id of ['squeeze_taxes', 'hire_mercs', 'demand_taxes']) {
      await expect(page.locator('#ar-deed-' + id)).toHaveCount(0);
    }
    await page.locator('#ar-deed-give_alms').check();
    await page.locator('#ar-deed-mediate').check();
    const beforeClose = await page.evaluate(function () {
      FB.game.passDay({ liveTick:true });
      return {
        cooldowns:FB.state.player.cooldowns,
        saved:JSON.parse(localStorage.getItem('fb_automation')).recurringDeeds
      };
    });
    expect(beforeClose.cooldowns.give_alms).toBeUndefined();
    expect(beforeClose.cooldowns.mediate).toBeUndefined();
    expect(beforeClose.saved).toEqual({ give_alms:true, mediate:true });
    await page.locator('#ar-close').click();
    await expect(page.locator('#btn-auto')).toContainText('✓');
    await page.reload();
    await expect.poll(function () {
      return page.evaluate(function () {
        return window.FB && FB.game && FB.game.auto && FB.game.auto.recurringDeeds;
      });
    }).toEqual({ give_alms:true, mediate:true });
  });

test('selected immediate deeds spend exactly one day, replace focus and respect cooldown order',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, start = s.turn;
      s.player.cooldowns.give_alms = start - 29;
      s.player.cooldowns.mediate = start;
      FB.game.auto.recurringDeeds = { give_alms:true, mediate:true };
      const tick = FB.tickFocus, note = FB.noteDeedCompleted;
      let focused = 0, credited = 0, payments = [];
      FB.tickFocus = function (state) { focused++; return tick(state); };
      FB.noteDeedCompleted = function (state, id) {
        if (id) credited++;
        return note(state, id);
      };
      const alms = FB.instants.filter(function (a) { return a.id === 'give_alms'; })[0];
      const run = alms.run;
      alms.run = function (state) {
        const gold = state.player.gold;
        const value = run(state);
        payments.push(gold - state.player.gold);
        return value;
      };
      FB.game.passDay({ liveTick:true }); // still one day short: ordinary focus
      const notDue = { turn:s.turn, last:s.player.cooldowns.give_alms, focused:focused };
      FB.game.passDay({ liveTick:true }); // now due: actual alms, one daily tick
      const due = { turn:s.turn, last:s.player.cooldowns.give_alms, focused:focused, credited:credited };
      delete s.player.cooldowns.mediate;
      FB.game.passDay({ liveTick:true }); // alms cooling down; mediation follows
      const mediation = { turn:s.turn, last:s.player.cooldowns.mediate, focused:focused, credited:credited };
      return { start:start, notDue:notDue, due:due, mediation:mediation, payments:payments };
    });
    expect(result.notDue).toEqual({ turn:result.start + 1, last:result.start - 29, focused:1 });
    expect(result.due).toEqual({ turn:result.start + 2, last:result.start + 1, focused:1, credited:1 });
    expect(result.mediation).toEqual({ turn:result.start + 3, last:result.start + 2, focused:1, credited:2 });
    expect(result.payments).toEqual([10]);
  });

test('checklist retains relevant deeds during cooldowns and resource shortages and hides adult deeds for children',
  async function ({ page }) {
    await page.evaluate(function () {
      FB.state.player.gold = 0;
      FB.state.player.cooldowns.mediate = FB.state.turn;
      delete FB.state.roles.rival;
      FB.ui.showAutoResolve();
    });
    await expect(page.locator('#ar-deed-give_alms')).toBeVisible();
    await expect(page.locator('#ar-deed-status-give_alms')).toContainText('Nothing to spare');
    await expect(page.locator('#ar-deed-mediate')).toBeVisible();
    await expect(page.locator('#ar-deed-status-mediate')).toContainText('Ready in 60 days');
    await expect(page.locator('#ar-deed-scheme_rival')).toHaveCount(0);
    await page.locator('#ar-close').click();
    await page.evaluate(function () {
      const s = FB.state;
      s.chars[s.player.charId].born = s.date.year - 12;
      FB.ui.showAutoResolve();
    });
    await expect(page.locator('[id^="ar-deed-"][type="checkbox"]')).toHaveCount(0);
  });

test('checklist follows character rank and retains selections hidden by a new role',
  async function ({ page }) {
    await page.evaluate(function () { FB.ui.showAutoResolve(); });
    await page.locator('#ar-deed-mediate').check();
    await page.locator('#ar-close').click();
    await page.evaluate(function () {
      const s = FB.state, home = s.player.provinceId;
      s.player.tier = 4;
      s.player.provs = [home];
      s.owner[home] = 'player'; s.holder[home] = 'player';
      FB.foundPlayerRealm(s);
      FB.invalidateRealmCache();
      FB.ui.showAutoResolve();
    });
    await expect(page.locator('#ar-deed-squeeze_taxes')).toBeVisible();
    await expect(page.locator('#ar-deed-mediate')).toHaveCount(0);
    await page.locator('#ar-deed-give_alms').check();
    await page.locator('#ar-close').click();
    expect(await page.evaluate(function () {
      return FB.game.auto.recurringDeeds.mediate;
    })).toBe(true);
    await page.evaluate(function () {
      FB.state.player.tier = 1;
      FB.ui.showAutoResolve();
    });
    await expect(page.locator('#ar-deed-mediate')).toBeChecked();
    await expect(page.locator('#ar-deed-squeeze_taxes')).toHaveCount(0);
  });

test('automatic execution rechecks cost, age, rank, travel, captivity and manual day exclusion',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, me = s.chars[p.charId];
      const born = me.born;
      const selected = { give_alms:true };
      p.gold = 0;
      const poor = FB.autoRecurringDeed(s, selected);
      p.gold = 100;
      me.born = s.date.year - 12;
      const child = FB.autoRecurringDeed(s, selected);
      me.born = born;
      p.travel = {};
      const travel = FB.autoRecurringDeed(s, selected);
      delete p.travel;
      p.flags.in_prison = true;
      const captive = FB.autoRecurringDeed(s, selected);
      delete p.flags.in_prison;
      const wrongRole = FB.autoRecurringDeed(s, { squeeze_taxes:true });
      FB.game.auto.recurringDeeds = selected;
      FB.game.passDay({ skipFocus:true, liveTick:true });
      const manual = p.cooldowns.give_alms;
      const gold = p.gold;
      const recovered = FB.autoRecurringDeed(s, selected);
      return { poor:poor, child:child, travel:travel, captive:captive, wrongRole:wrongRole,
        manual:manual, recovered:recovered, payment:gold - p.gold };
    });
    expect(result).toEqual({ poor:false, child:false, travel:false, captive:false,
      wrongRole:false, recovered:true, payment:10 });
  });

test('several ready selections use catalogue priority and Observe performs none',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, start = s.turn;
      FB.game.auto.recurringDeeds = { mediate:true, give_alms:true };
      FB.game.passDay({ liveTick:true });
      const first = Object.assign({}, s.player.cooldowns);
      FB.game.passDay({ liveTick:true });
      const second = Object.assign({}, s.player.cooldowns);
      delete s.player.cooldowns.give_alms;
      FB.game.observe = true;
      FB.game.passDay({ liveTick:true });
      FB.game.observe = false;
      return { start:start, first:first, second:second, observed:s.player.cooldowns.give_alms };
    });
    expect(result.first).toEqual({ give_alms:result.start });
    expect(result.second).toEqual({ give_alms:result.start, mediate:result.start + 1 });
    expect(result.observed).toBeUndefined();
  });

test('automatic ruler taxes preserve the normal payment, political cost and repeat interval',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, home = p.provinceId;
      p.tier = 4;
      p.provs = [home];
      s.owner[home] = 'player'; s.holder[home] = 'player';
      FB.foundPlayerRealm(s);
      FB.invalidateRealmCache();
      const gold = p.gold, support = FB.countyPopularSupport(s, home);
      const payment = Math.max(4, Math.round(FB.playerTax(s) * 0.8));
      const start = s.turn;
      const first = FB.autoRecurringDeed(s, { squeeze_taxes:true });
      const second = FB.autoRecurringDeed(s, { squeeze_taxes:true });
      return { first:first, second:second, payment:p.gold - gold, expected:payment,
        support:FB.countyPopularSupport(s, home) - support,
        start:start, last:p.cooldowns.squeeze_taxes,
        ready:FB.instantStatusReadyTurn(s, 'squeeze_taxes') };
    });
    expect(result.first).toBe(true);
    expect(result.second).toBe(false);
    expect(result.payment).toBe(result.expected);
    expect(result.support).toBe(-6);
    expect(result.last).toBe(result.start);
    expect(result.ready).toBe(result.start + 180);
  });

test('fast-forward uses recurring deeds without nested ticks and defers readiness scrolls',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, start = s.turn;
      FB.ui.revealDeedAction('mediate');
      s.player.cooldowns.mediate = start - 59;
      FB.game.uiPrefs.highlightReadyDeeds = true;
      FB.ui.refreshRecurringDeedAlerts();
      FB.game.auto.recurringDeeds = { give_alms:true };
      const original = Element.prototype.scrollIntoView;
      let scrolls = 0;
      Element.prototype.scrollIntoView = function () { scrolls++; };
      FB.game.fastForwarding = true;
      FB.game.passDay({ deferUi:true });
      FB.ui.refreshRecurringDeedAlerts();
      const during = scrolls;
      FB.game.passDay({ deferUi:true });
      FB.game.fastForwarding = false;
      FB.ui.fastForwardFinished({ liveTick:true });
      Element.prototype.scrollIntoView = original;
      return { days:s.turn - start, last:s.player.cooldowns.give_alms,
        start:start, during:during, after:scrolls };
    });
    expect(result.days).toBe(2);
    expect(result.last).toBe(result.start);
    expect(result.during).toBe(0);
    expect(result.after).toBe(1);
  });

test('readiness tracking consumes no RNG and resets at campaign and protagonist boundaries',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      FB.ui.revealDeedAction('mediate');
      FB.game.uiPrefs.highlightReadyDeeds = true;
      s.player.cooldowns.mediate = s.turn - 59;
      FB.ui.refreshRecurringDeedAlerts();
      const rng = FB.getRngState();
      s.turn++;
      FB.ui.refreshRecurringDeedAlerts();
      const marked = document.querySelectorAll('.deed-ready').length;
      const unchanged = rng === FB.getRngState();
      const oldId = s.player.charId;
      const relative = Object.keys(s.chars).filter(function (id) {
        return id !== oldId && !s.chars[id].dead;
      })[0];
      s.player.charId = relative;
      FB.ui.refreshRecurringDeedAlerts();
      const successor = document.querySelectorAll('.deed-ready').length;
      s.player.charId = oldId;
      FB.state = JSON.parse(JSON.stringify(s));
      FB.ui.refreshRecurringDeedAlerts();
      const loaded = document.querySelectorAll('.deed-ready').length;
      return { marked:marked, unchanged:unchanged, successor:successor, loaded:loaded };
    });
    expect(result).toEqual({ marked:1, unchanged:true, successor:0, loaded:0 });
  });

[
  { name:'desktop thematic', width:1505, height:900, grouped:false, group:'life' },
  { name:'mobile action type', width:390, height:844, grouped:true, group:'deeds' }
].forEach(function (view) {
  test('readiness opens closed sections once and preserves focus on ' + view.name,
    async function ({ page }) {
      await page.setViewportSize({ width:view.width, height:view.height });
      await page.evaluate(function (grouped) {
        FB.game.uiPrefs.groupDeedsByActionType = grouped;
        FB.game.uiPrefs.highlightReadyDeeds = true;
        FB.state.player.cooldowns.mediate = FB.state.turn - 59;
        FB.ui.showTab('actions');
        FB.ui.refreshRecurringDeedAlerts();
      }, view.grouped);
      const toggle = page.locator('[data-action-group="' + view.group + '"]');
      if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
      await page.locator('#btn-endturn').focus();
      const result = await page.evaluate(function () {
        const original = Element.prototype.scrollIntoView;
        const focus = document.activeElement;
        let scrolls = 0;
        Element.prototype.scrollIntoView = function (options) {
          if (this.getAttribute('data-action-id') === 'mediate') scrolls++;
          return original.call(this, options);
        };
        FB.state.turn++;
        FB.ui.refresh({ liveTick:true });
        FB.ui.refresh({ liveTick:true });
        Element.prototype.scrollIntoView = original;
        return { scrolls:scrolls, focusRetained:document.activeElement === focus };
      });
      expect(result).toEqual({ scrolls:1, focusRetained:true });
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const button = page.locator('[data-action-id="mediate"]');
      await expect(button).toBeEnabled();
      await expect(button.locator('..')).toHaveClass(/deed-ready/);
      await expect(button.locator('..')).toContainText('Ready again');
      await page.evaluate(function () {
        FB.state.player.cooldowns.mediate = FB.state.turn;
        FB.ui.refresh({ liveTick:true });
      });
      await expect(button.locator('..')).not.toHaveClass(/deed-ready/);
    });
});

test('readiness waits through a dialog and another tab, and disabled settings never scroll',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      FB.ui.revealDeedAction('mediate');
      const original = Element.prototype.scrollIntoView;
      let scrolls = 0;
      Element.prototype.scrollIntoView = function () { scrolls++; };
      s.player.cooldowns.mediate = s.turn - 59;
      FB.ui.refresh({ liveTick:true });
      s.turn++;
      FB.ui.refresh({ liveTick:true });
      const disabled = scrolls;
      FB.game.uiPrefs.highlightReadyDeeds = true;
      s.player.cooldowns.mediate = s.turn - 59;
      FB.ui.refreshRecurringDeedAlerts();
      FB.ui.showAutoResolve();
      const focus = document.activeElement;
      s.turn++;
      FB.ui.refresh({ liveTick:true });
      const modal = { scrolls:scrolls, focused:document.activeElement === focus };
      FB.ui.closeModal();
      FB.ui.showTab('log');
      const otherTab = scrolls;
      FB.ui.showTab('actions');
      const returned = scrolls;
      FB.ui.refresh({ liveTick:true });
      const repeated = scrolls;
      FB.game.uiPrefs.highlightReadyDeeds = false;
      FB.ui.refreshRecurringDeedAlerts();
      const marked = document.querySelectorAll('.deed-ready').length;
      Element.prototype.scrollIntoView = original;
      return { disabled:disabled, modal:modal, otherTab:otherTab, returned:returned, repeated:repeated, marked:marked };
    });
    expect(result).toEqual({ disabled:0, modal:{ scrolls:0, focused:true },
      otherTab:0, returned:1, repeated:1, marked:0 });
  });

test('settings persistence and malformed automation preferences are bounded at boot',
  async function ({ page }) {
    await page.evaluate(function () { FB.ui.showSettings(); });
    await page.locator('#set-highlight-ready-deeds').check();
    expect(await page.evaluate(function () {
      return JSON.parse(localStorage.getItem('fb_ui')).highlightReadyDeeds;
    })).toBe(true);
    await page.evaluate(function () {
      localStorage.setItem('fb_automation', JSON.stringify({ recurringDeeds:{
        give_alms:true, mediate:'yes', hold_court:true, unknown:true
      } }));
    });
    await page.reload();
    await expect.poll(function () {
      return page.evaluate(function () {
        return window.FB && FB.game && FB.game.auto && {
          selected:FB.game.auto.recurringDeeds,
          highlight:FB.game.uiPrefs.highlightReadyDeeds
        };
      });
    }).toEqual({ selected:{ give_alms:true }, highlight:true });
  });

test('effective cooldown and technology restrictions apply and mod-added deeds remain manual',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const alms = FB.instants.filter(function (a) { return a.id === 'give_alms'; })[0];
      const oldCd = alms.cd, oldTech = alms.requiresTech;
      alms.cd = 0;
      const zero = FB.autoRecurringDeed(s, { give_alms:true });
      alms.cd = oldCd;
      alms.requiresTech = 'standardized_coinage';
      const requirement = FB.techRequirementMet;
      FB.techRequirementMet = function () { return false; };
      const tech = FB.autoRecurringDeed(s, { give_alms:true });
      FB.techRequirementMet = requirement;
      alms.requiresTech = oldTech;
      FB.mods.apply({ deeds:[{
        id:'mod_recurring', handler:'declarative_deed', label:'Recurring manual deed',
        desc:'A bounded manual transaction.', order:FBDATA.deeds.length,
        group:'life', cooldownDays:30, spendsDay:true, effects:{ prestige:1 }
      }] });
      const eligibleMod = FB.instantStatus(s, 'mod_recurring').can;
      const before = s.player.prestige;
      const mod = FB.autoRecurringDeed(s, { mod_recurring:true });
      const untouched = s.player.prestige === before;
      FB.runInstant(s, 'mod_recurring');
      const manualEffect = s.player.prestige - before;
      const choice = FB.runInstant(s, 'hold_court', { automaticDay:true });
      return { zero:zero, tech:tech, mod:mod, choice:choice,
        eligibleMod:eligibleMod, untouched:untouched, manualEffect:manualEffect,
        mode:FBDATA.techImpactReviews.features.recurring_deed_automation.mode,
        errors:FB.validateTechnologyData() };
    });
    expect(result).toEqual({ zero:false, tech:false, mod:false, choice:false,
      eligibleMod:true, untouched:true, manualEffect:1, mode:'none', errors:[] });
  });
