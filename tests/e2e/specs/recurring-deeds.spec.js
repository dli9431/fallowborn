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
const { waitForUiRefresh } = require('../support/game/ui');

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

test('fast-forward uses recurring deeds without nested ticks and defers readiness scrolls and pausing',
  async function ({ page }) {
    const result = await page.evaluate(async function () {
      const s = FB.state, start = s.turn;
      FB.ui.revealDeedAction('mediate');
      s.player.cooldowns.mediate = start - 59;
      FB.game.uiPrefs.highlightReadyDeeds = true;
      FB.ui.refreshRecurringDeedAlerts();
      FB.game.setPaused(false, { liveTick:true });
      FB.game.auto.recurringDeeds = { give_alms:true };
      const original = Element.prototype.scrollIntoView;
      let scrolls = 0;
      Element.prototype.scrollIntoView = function () { scrolls++; };
      FB.game.fastForwarding = true;
      FB.game.passDay({ deferUi:true });
      FB.ui.refreshRecurringDeedAlerts();
      const during = scrolls;
      const pausedDuring = FB.game.paused;
      FB.game.passDay({ deferUi:true });
      FB.game.fastForwarding = false;
      FB.ui.fastForwardFinished({ liveTick:true });
      await new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
      Element.prototype.scrollIntoView = original;
      return { days:s.turn - start, last:s.player.cooldowns.give_alms,
        start:start, during:during, after:scrolls,
        pausedDuring:pausedDuring, pausedAfter:FB.game.paused };
    });
    expect(result.days).toBe(2);
    expect(result.last).toBe(result.start);
    expect(result.during).toBe(0);
    expect(result.after).toBe(1);
    expect(result.pausedDuring).toBe(false);
    expect(result.pausedAfter).toBe(true);
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
  test('readiness opens closed sections, pauses once and preserves focus on ' + view.name,
    async function ({ page }) {
      await page.setViewportSize({ width:view.width, height:view.height });
      await page.evaluate(function (grouped) {
        FB.game.uiPrefs.groupDeedsByActionType = grouped;
        FB.game.uiPrefs.highlightReadyDeeds = true;
        FB.state.player.cooldowns.mediate = FB.state.turn - 59;
        FB.ui.showTab('actions');
        FB.ui.refreshRecurringDeedAlerts();
      }, view.grouped);
      await waitForUiRefresh(page);
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
        FB.game.setPaused(false, { liveTick:true });
        FB.state.turn++;
        FB.ui.refreshRecurringDeedAlerts();
        FB.ui.refreshRecurringDeedAlerts();
        Element.prototype.scrollIntoView = original;
        return { scrolls:scrolls, paused:FB.game.paused,
          focusRetained:document.activeElement === focus };
      });
      expect(result).toEqual({ scrolls:1, paused:true, focusRetained:true });
      await waitForUiRefresh(page);
      await expect(page.locator('#btn-endturn')).toBeFocused();
      await expect(page.locator('#btn-endturn')).toContainText('Play');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const button = page.locator('[data-action-id="mediate"]');
      await expect(button).toBeEnabled();
      await expect(button.locator('..')).toHaveClass(/deed-ready/);
      await expect(button.locator('.deed-ready-label')).toHaveText('Ready again');
      await expect(button.locator('..').locator('.deed-ready-label')).toHaveCount(1);
      const resumed = await page.evaluate(function () {
        FB.game.setPaused(false, { liveTick:true });
        FB.ui.refreshRecurringDeedAlerts();
        return !FB.game.paused;
      });
      expect(resumed).toBe(true);
      await waitForUiRefresh(page);
      await expect(page.locator('#btn-endturn')).toContainText('Pause');
      await page.evaluate(function () {
        FB.game.setPaused(true);
        FB.state.player.cooldowns.mediate = FB.state.turn;
        FB.ui.refresh({ liveTick:true });
      });
      await expect(button.locator('..')).not.toHaveClass(/deed-ready/);
      await expect(button.locator('.deed-ready-label')).toHaveCount(0);
    });

  ['network', 'prov', 'log'].forEach(function (origin) {
    test('readiness switches from ' + origin + ' to Deeds and pauses on ' + view.name,
      async function ({ page }) {
        await page.setViewportSize({ width:view.width, height:view.height });
        await page.evaluate(function (options) {
          FB.game.uiPrefs.groupDeedsByActionType = options.grouped;
          FB.game.uiPrefs.highlightReadyDeeds = true;
          FB.state.player.cooldowns.mediate = FB.state.turn - 59;
          FB.ui.showTab(options.origin);
          FB.ui.refreshRecurringDeedAlerts();
        }, { grouped:view.grouped, origin:origin });
        await waitForUiRefresh(page);
        await expect(page.locator('#tab-' + origin)).toHaveClass(/active/);
        await page.locator('#sidetabs [data-tab="' + origin + '"]').focus();
        const result = await page.evaluate(async function () {
          const original = Element.prototype.scrollIntoView;
          const focus = document.activeElement;
          let scrolls = 0;
          Element.prototype.scrollIntoView = function (options) {
            if (this.getAttribute('data-action-id') === 'mediate') scrolls++;
            return original.call(this, options);
          };
          try {
            FB.game.setPaused(false, { liveTick:true });
            FB.state.turn++;
            FB.ui.refresh({ liveTick:true });
            await new Promise(function (resolve) {
              requestAnimationFrame(function () { requestAnimationFrame(resolve); });
            });
            FB.ui.refreshRecurringDeedAlerts();
            return { paused:FB.game.paused, scrolls:scrolls,
              focusRetained:document.activeElement === focus };
          } finally {
            Element.prototype.scrollIntoView = original;
            FB.game.setPaused(true, { liveTick:true });
          }
        });
        expect(result).toEqual({ paused:true, scrolls:1, focusRetained:true });
        await expect(page.locator('#tab-actions')).toHaveClass(/active/);
        await expect(page.locator('#tab-' + origin)).not.toHaveClass(/active/);
        await expect(page.locator('#btn-endturn')).toContainText('Play');
        const deed = page.locator('[data-action-id="mediate"]');
        await expect(deed).toBeVisible();
        await expect(deed).toBeEnabled();
        await expect(deed.locator('..')).toHaveClass(/deed-ready/);
      });
  });
});

test('readiness closes the mobile Kin drawer and keeps focus visible without resuming time',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    await page.evaluate(function () {
      FB.game.uiPrefs.highlightReadyDeeds = true;
      FB.state.player.cooldowns.mediate = FB.state.turn - 59;
      FB.ui.refreshRecurringDeedAlerts();
      FB.game.setPaused(false, { liveTick:true });
      FB.ui.showTab('family');
    });
    await waitForUiRefresh(page);
    await expect(page.locator('body')).toHaveClass(/showself/);
    await page.locator('#lefttabs [data-tab="family"]').focus();
    await page.evaluate(function () {
      FB.state.turn++;
      FB.ui.refreshRecurringDeedAlerts();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('body')).not.toHaveClass(/showself/);
    await expect(page.locator('#tab-actions')).toHaveClass(/active/);
    await expect(page.locator('[data-action-id="mediate"]')).toBeFocused();
    await expect(page.locator('#btn-endturn')).toContainText('Play');
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
  });

test('readiness waits through a dialog then switches from Network, and disabled settings never scroll or pause',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      FB.ui.revealDeedAction('mediate');
      const original = Element.prototype.scrollIntoView;
      let scrolls = 0;
      Element.prototype.scrollIntoView = function () { scrolls++; };
      FB.game.setPaused(false, { liveTick:true });
      s.player.cooldowns.mediate = s.turn - 59;
      FB.ui.refreshRecurringDeedAlerts();
      s.turn++;
      FB.ui.refreshRecurringDeedAlerts();
      const disabled = scrolls;
      const disabledPaused = FB.game.paused;
      FB.game.uiPrefs.highlightReadyDeeds = true;
      s.player.cooldowns.mediate = s.turn - 59;
      FB.ui.refreshRecurringDeedAlerts();
      const baselinePaused = FB.game.paused;
      FB.ui.showTab('network');
      FB.ui.showAutoResolve();
      const focus = document.activeElement;
      s.turn++;
      FB.ui.refreshRecurringDeedAlerts();
      const modal = { scrolls:scrolls, focused:document.activeElement === focus,
        paused:FB.game.paused };
      FB.ui.closeModal();
      FB.ui.refreshRecurringDeedAlerts();
      const returned = scrolls;
      const returnedPaused = FB.game.paused;
      const deedsActive = document.getElementById('tab-actions').classList.contains('active');
      FB.game.setPaused(false, { liveTick:true });
      FB.ui.refreshRecurringDeedAlerts();
      const repeated = scrolls;
      const repeatedPaused = FB.game.paused;
      FB.game.uiPrefs.highlightReadyDeeds = false;
      FB.ui.refreshRecurringDeedAlerts();
      const marked = document.querySelectorAll('.deed-ready').length;
      Element.prototype.scrollIntoView = original;
      return { disabled:disabled, modal:modal, returned:returned,
        repeated:repeated, marked:marked, disabledPaused:disabledPaused,
        baselinePaused:baselinePaused, deedsActive:deedsActive,
        returnedPaused:returnedPaused,
        repeatedPaused:repeatedPaused };
    });
    expect(result).toEqual({ disabled:0, modal:{ scrolls:0, focused:true, paused:false },
      returned:1, repeated:1, marked:0, disabledPaused:false,
      baselinePaused:false, deedsActive:true, returnedPaused:true,
      repeatedPaused:false });
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
