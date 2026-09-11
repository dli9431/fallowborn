'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css/style.css', 'data/events_common.js', 'data/events_peasant.js',
  'data/events_tournament.js', 'data/events_lifepaths.js', 'data/events_council.js',
  'data/events_parliament.js', 'data/events_politics.js', 'data/events_paths.js', 'data/events_noble.js', 'data/events_war.js',
  'data/economy.js', 'data/map_data.js', 'js/main.js',
  'js/events.js', 'js/messages.js', 'js/actions.js', 'js/world.js',
  'js/ui_misc.js', 'js/ui_modals.js', 'js/keys.js', 'js/portrait.js', 'js/save.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startWarSafety } = require('../support/game/war-safety');

async function ready(page) {
  await expect.poll(function () {
    return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
  }).toBe(false);
}
async function start(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.auto.all = false;
    FB.game.auto.major = false;
    FB.game.auto.minor = false;
    FB.game.auto.war = false;
    FB.game.uiPrefs.autoResumeAfterEvents = false;
    FB.state.eventQueue = [];
  });
}
async function fever(page, success) {
  return page.evaluate(function (success) {
    const s = FB.state, me = s.chars[s.player.charId];
    const c = FB.makeCharacter(s, {
      name:'Outcome Child', culture:me.culture, religion:me.religion,
      born:s.date.year - 6, traitsN:0, dyn:me.dyn,
      fatherId:me.sex === 'm' ? me.id : null,
      motherId:me.sex === 'f' ? me.id : null
    });
    me.childrenIds.push(c.id);
    me.health = 8;
    s.player.gold = 100;
    const ev = FB.eventById('child_fever');
    ev.options[0].chance = success ? 1 : 0;
    FB.ui.runEvents([{ id:ev.id, ctx:FB.eventContext(s, { childId:c.id }) }]);
    return c.id;
  }, success);
}

test('event footer protects the decision and closes a settled outcome without repeating it',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    await fever(page, true);
    await expect(page.locator('#event-nav-back')).toBeDisabled();
    await expect(page.locator('#event-nav-close')).toBeDisabled();
    await ready(page);
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#outcome-continue')).toBeVisible();
    await expect(page.locator('#event-nav-close')).toBeEnabled();
    const before = await page.evaluate(function () {
      return { gold:FB.state.player.gold, rng:FB.getRngState(), log:FB.state.log.length };
    });
    await ready(page);
    await page.locator('#event-nav-close').click();
    await expect(page.locator('#eventmodal')).toBeHidden();
    expect(await page.evaluate(function () {
      return { gold:FB.state.player.gold, rng:FB.getRngState(), log:FB.state.log.length };
    })).toEqual(before);
  });

for (const success of [true, false]) {
  test('child fever ' + (success ? 'recovery' : 'bereavement') + ' is acknowledged exactly once',
    async function ({ page }, testInfo) {
      await start(page, testInfo);
      const childId = await fever(page, success);
      await ready(page);
      const guarded = await page.evaluate(function () {
        document.querySelector('#ev-options .evopt').click();
        document.getElementById('outcome-continue').click();
        return !document.getElementById('eventmodal').classList.contains('hidden');
      });
      expect(guarded).toBe(true);
      await expect(page.locator('#eventmodal')).toBeVisible();
      await expect(page.locator('#ev-title')).toHaveText(success ? 'The fever breaks' : 'A child lost');
      await expect(page.locator('#ev-text')).toContainText(success ? 'The child will live' : 'The child is gone');
      await expect(page.locator('canvas.pface[data-cid="' + childId + '"]').first()).toBeVisible();
      await expect(page.locator('.event-receipt-toast')).toBeVisible();
      const before = await page.evaluate(function (childId) {
        return { gold:FB.state.player.gold, dead:!!FB.state.chars[childId].dead,
          rng:FB.getRngState(), choices:FB.state.log.filter(function (e) { return !!e.receipt; }).length };
      }, childId);
      expect(before.gold).toBe(90);
      expect(before.dead).toBe(!success);
      await ready(page);
      await page.keyboard.press('Escape');
      await expect(page.locator('#eventmodal')).toBeHidden();
      expect(await page.evaluate(function (childId) {
        return { gold:FB.state.player.gold, dead:!!FB.state.chars[childId].dead,
          rng:FB.getRngState(), choices:FB.state.log.filter(function (e) { return !!e.receipt; }).length };
      }, childId)).toEqual(before);
      expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
    });
}

test('freedom service acceptance and completion have separate truthful outcomes',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    await page.evaluate(function () {
      const s = FB.state;
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      FB.ensureSerfTenure(s, 'new_game');
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 60 - FB.standingOf(s, target), 'test:outcome');
      s.player.gold = 10000;
      s.player.freedomOffer = null;
      const offer = FB.createFreedomOffer(s, 'petition');
      const item = FB.queueEvent(s, 'manumission', {
        offerCreatedTurn:offer.createdTurn, lordId:offer.lordId,
        protagonistId:offer.protagonistId, provinceId:offer.provinceId,
        locationId:offer.provinceId, settlementIndex:offer.settlementIndex,
        tenureFormedTurn:offer.tenureFormedTurn, tenureRevision:offer.tenureRevision,
        price:offer.price, serviceDays:offer.serviceDays, expiryTurn:offer.expiryTurn
      });
      s.eventQueue = [];
      FB.ui.runEvents([item]);
    });
    await ready(page);
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#ev-text')).toContainText('90 days of final service');
    await expect(page.locator('#ev-title')).not.toHaveText('Freedom gained');
    expect(await page.evaluate(function () { return FB.state.player.tier; })).toBe(0);
    await ready(page);
    await page.locator('#outcome-continue').click();
    const completion = await page.evaluate(function () {
      const s = FB.state;
      s.eventQueue = [];
      const gold = s.player.gold;
      s.turn = s.player.freedomOffer.serviceEndTurn;
      FB.freedomDay(s);
      const queued = s.eventQueue.filter(function (e) { return e.id === 'decision_outcome'; });
      // Pending outcomes survive serialization with descriptor/identity metadata.
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restored = FB.state.eventQueue.filter(function (e) { return e.id === 'decision_outcome'; });
      FB.state.eventQueue = [];
      FB.ui.runEvents(restored);
      return { count:queued.length, gold:gold, actual:FB.state.player.gold, tier:FB.state.player.tier };
    });
    expect(completion.count).toBe(1);
    expect(completion.actual).toBe(completion.gold);
    expect(completion.tier).toBe(1);
    await expect(page.locator('#ev-title')).toHaveText('Freedom gained');
    await expect(page.locator('#toasts .toast').first()).toBeVisible();
    await expect(page.locator('.decision-outcome-summary')).toHaveCount(1);
    await expect(page.locator('#ev-text')).toContainText('rises from Serf to Freeholder');
    await expect(page.locator('#ev-text')).toContainText('Freed household head');
    await expect(page.locator('#ev-text')).toContainText('Former lord');
  });

test('purchase queues freedom while automated event decisions do not queue duplicate outcomes',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const purchase = await page.evaluate(function () {
      const s = FB.state;
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      FB.ensureSerfTenure(s, 'new_game');
      FB.getRole(s, 'lord', true);
      s.player.gold = 10000;
      s.eventQueue = [];
      const result = FB.resolveSerfFreedom(s, { route:'purchase' }, {});
      const items = s.eventQueue.filter(function (e) { return e.id === 'decision_outcome'; });
      s.eventQueue = [];
      FB.ui.runEvents(items);
      return { resolved:!!result, count:items.length };
    });
    expect(purchase).toEqual({ resolved:true, count:1 });
    await expect(page.locator('#ev-title')).toHaveText('Freedom gained');
    await expect(page.locator('#toasts .toast').first()).toBeVisible();
    await expect(page.locator('.decision-outcome-summary')).toHaveCount(1);
    await ready(page);
    await page.locator('#outcome-continue').click();
    await page.evaluate(function () { FB.game.auto.all = true; });
    await fever(page, true);
    await expect(page.locator('#eventmodal')).toBeHidden();
    expect(await page.evaluate(function () {
      return FB.state.eventQueue.filter(function (e) { return e.id === 'decision_outcome'; }).length;
    })).toBe(0);
  });

for (const width of [1440, 390, 320]) {
  test('outcome portraits and details retain the shared interaction pattern at ' + width,
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:width, height:900 });
      await start(page, testInfo);
      const childId = await page.evaluate(function () {
        const s = FB.state, me = s.chars[s.player.charId];
        FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
        FB.ensureSerfTenure(s, 'new_game');
        FB.getRole(s, 'lord', true);
        s.player.gold = 10000;
        let last;
        for (let i = 0; i < 9; i++) {
          const child = FB.makeCharacter(s, {
            name:'Freed Child ' + i, culture:me.culture, religion:me.religion,
            born:s.date.year - 10, station:0, traitsN:0, dyn:me.dyn,
            fatherId:me.sex === 'm' ? me.id : null,
            motherId:me.sex === 'f' ? me.id : null
          });
          me.childrenIds.push(child.id);
          last = child.id;
        }
        s.eventQueue = [];
        FB.resolveSerfFreedom(s, { route:'purchase' }, {});
        const items = s.eventQueue.slice();
        s.eventQueue = [];
        FB.ui.runEvents(items);
        return last;
      });
      const person = page.locator('[data-event-character="' + childId + '"]');
      const card = person.locator('xpath=ancestor::*[contains(@class,"event-participant-card")]');
      if (width > 1100) {
        await person.focus();
        await expect(page.locator('#tooltip')).toBeVisible();
        await expect(card.locator('.settcard-info')).toBeHidden();
      } else {
        const details = card.locator('.settcard-info');
        await expect(details).toBeVisible();
        expect(await details.evaluate(function (e) { return e.getBoundingClientRect().height; })).toBeGreaterThanOrEqual(44);
        await ready(page);
        await details.click();
        await expect(details).toHaveAttribute('aria-expanded', 'true');
        await expect(card.locator('.settcard-details')).toBeVisible();
      }
      await ready(page);
      await person.scrollIntoViewIfNeeded();
      const scroll = await page.locator('#eventmodal .modalcard').evaluate(function (e) { return e.scrollTop; });
      expect(scroll).toBeGreaterThan(0);
      await person.click();
      await expect(page.locator('#genmodal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#genmodal')).toBeHidden();
      await expect(person).toBeFocused();
      expect(await page.locator('#eventmodal .modalcard').evaluate(function (e) { return e.scrollTop; })).toBeCloseTo(scroll, 0);
      expect(await page.locator('#eventmodal .modalcard').evaluate(function (e) { return e.scrollWidth <= e.clientWidth + 1; })).toBe(true);
    });
}

test('a final downfall confirms land and station lost even when it also ends a war',
  async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    await page.evaluate(function () {
      FB.game.uiPrefs.autoResumeAfterEvents = false;
      const ev = FB.eventById('df_revolt');
      ev.options[0].chance = 0;
      FB.ui.runEvents([{ id:ev.id, ctx:FB.eventContext(FB.state, {}) }]);
    });
    await ready(page);
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#ev-title')).toHaveText('Station lost');
    await expect(page.locator('.decision-outcome-summary').first()).toHaveText(
      'The uprising defeats your host, and you flee without your lands or title.');
    await expect(page.locator('.decision-outcome-changes')).toContainText('Gentlewoman');
    expect(await page.evaluate(function () {
      return { tier:FB.state.player.tier, lands:FB.state.player.provs.length,
        duplicates:FB.state.eventQueue.filter(function (e) { return e.id === 'decision_outcome'; }).length };
    })).toEqual({ tier:2, lands:0, duplicates:0 });
  });

test('guild membership is celebrated, while an existing investiture result needs no second acknowledgement',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    await page.evaluate(function () {
      FB.state.player.gold = 100;
      FB.ui.runEvents([{ id:'guild_entry', ctx:FB.eventContext(FB.state, {}) }]);
    });
    await ready(page);
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#outcome-continue')).toBeVisible();
    await expect(page.locator('#ev-text')).toContainText('Joined the craft guild');
    const archived = await page.evaluate(function () {
      const s = FB.state;
      const rows = s.chronicle.entries.map(function (row) { return FB.chronicleEntry(s.chronicle, row); });
      const entry = rows.filter(function (row) { return row.receipt && row.receipt.eventId === 'guild_entry'; }).pop();
      return { membership:!!s.player.flags.guild_member, gold:s.player.gold,
        portrait:entry.receipt.characterIds.indexOf(s.player.charId) >= 0,
        result:entry.receipt.showOutcome };
    });
    expect(archived).toEqual({ membership:true, gold:85, portrait:true, result:true });
    await ready(page);
    await page.locator('#outcome-continue').click();
    await page.evaluate(function () {
      FB.ui.runEvents([{ id:'rank_elevation_result', ctx:FB.eventContext(FB.state, { newtitle:'Count' }) }]);
    });
    await ready(page);
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#eventmodal')).toBeHidden();
    await expect(page.locator('#outcome-continue')).toHaveCount(0);
  });

test('a delayed acknowledgement does not consume a seasonal story slot or its random draw',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      FB.state.eventQueue = [];
      FB.state.slotDays = [FB.state.date.day];
      const saved = JSON.parse(FB.save.serialize());
      function select(withOutcome) {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.setRngState(12345678);
        if (withOutcome) FB.queueEvent(FB.state, 'decision_outcome', {
          receipt:{ schema:1, eventId:'decision_outcome', characterIds:[], impacts:[] },
          outcomeTurn:FB.state.turn
        });
        const selected = FB.pickDailyEvents(FB.state);
        return { decisions:selected.filter(function (e) { return e.id !== 'decision_outcome'; }),
          notifications:selected.filter(function (e) { return e.id === 'decision_outcome'; }).length,
          slots:FB.state.slotDays.slice(), rng:FB.getRngState() };
      }
      return { baseline:select(false), notified:select(true) };
    });
    expect(result.notified.notifications).toBe(1);
    expect(result.notified.decisions).toEqual(result.baseline.decisions);
    expect(result.notified.slots).toEqual(result.baseline.slots);
    expect(result.notified.rng).toEqual(result.baseline.rng);
  });


test('a significant manual decision retains its toast beside Continue', async function ({ page }, testInfo) {
  await start(page, testInfo);
  await fever(page, true);
  await ready(page);
  await page.locator('#ev-options .evopt').first().click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  await expect(page.locator('.event-receipt-toast')).toBeVisible();
});


test('Resolve everything still announces delayed freedom by toast', async function ({ page }, testInfo) {
  await start(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state;
    FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
    FB.ensureSerfTenure(s, 'outcome_toast');
    FB.getRole(s, 'lord', true);
    s.player.gold = 10000;
    s.eventQueue = [];
    FB.game.auto.all = true;
    FB.resolveSerfFreedom(s, { route:'purchase' }, {});
    const queued = s.eventQueue.slice();
    s.eventQueue = [];
    FB.ui.runEvents(queued);
    FB.ui.refresh();
  });
  await expect(page.locator('#eventmodal')).toBeHidden();
  await expect(page.locator('#toasts')).toContainText('bought lawful freedom');
});


for (const success of [true, false]) {
  test('melee outcome uses concise prose and preserves its actual consequences: ' + success, async function ({ page }, testInfo) {
    await start(page, testInfo);
    await page.evaluate(function (success) {
      const s = FB.state;
      s.player.gold = 100;
      s.chars[s.player.charId].health = 8;
      const ev = FB.eventById('tournament_invitation');
      ev.options[1].chance = success ? 1 : 0;
      FB.ui.runEvents([{ id:ev.id, ctx:FB.eventContext(s, {}) }]);
    }, success);
    await ready(page);
    await page.locator('#ev-options .evopt').nth(1).click();
    await expect(page.locator('.decision-outcome-summary')).toHaveText(success
      ? 'You win the melee and earn the captains’ respect.'
      : 'An injury ends your melee; the surgeon tends your wounds.');
    expect(await page.evaluate(function () {
      return { gold:FB.state.player.gold, health:FB.state.chars[FB.state.player.charId].health };
    })).toEqual({ gold:success ? 108 : 100, health:success ? 8 : 7 });
    await expect(page.locator('.event-receipt-toast')).toBeVisible();
  });
}

test('an outcome without authored prose shows consequences without repeating the instruction', async function ({ page }, testInfo) {
  await start(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state;
    const ev = FB.eventById('tournament_invitation');
    ev.options[1].chance = 0;
    delete ev.options[1].failure.text;
    s.chars[s.player.charId].health = 8;
    FB.ui.runEvents([{ id:ev.id, ctx:FB.eventContext(s, {}) }]);
  });
  await ready(page);
  await page.locator('#ev-options .evopt').nth(1).click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  await expect(page.locator('#ev-text')).not.toContainText('Resolved:');
  await expect(page.locator('#ev-text')).not.toContainText('It goes poorly.');
  await expect(page.locator('.decision-outcome-changes')).toBeHidden();
});

for (const width of [390, 1280]) {
  test('outcome chips stay in accessible details at ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:844 });
    await start(page, testInfo);
    await fever(page, true);
    await ready(page);
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#outcome-continue')).toBeVisible();
    const details = page.locator('#outcome-details');
    await expect(details).toBeHidden();
    expect(await page.locator('#eventmodal .event-impact-chip').count()).toBeGreaterThan(0);
    expect(await page.locator('#eventmodal .event-impact-chip').evaluateAll(function (chips) {
      return chips.every(function (chip) { return !!chip.closest('.settcard-details'); });
    })).toBe(true);
    const before = await page.evaluate(function () { return FB.state.player.gold; });
    if (width === 390) {
      const toggle = page.locator('[aria-controls="outcome-details"]');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(details).toBeVisible();
      await expect(details.locator('.event-impact-chip').first()).toBeVisible();
      await toggle.click();
      await expect(details).toBeHidden();
    } else {
      await page.locator('.decision-outcome-details .settcard-head').focus();
      await expect(page.locator('#tooltip')).toBeVisible();
      await expect(page.locator('#tooltip .event-impact-chip').first()).toBeVisible();
      await expect(details).toBeHidden();
    }
    expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(before);
    await ready(page);
    await page.locator('#outcome-continue').click();
    await expect(page.locator('#eventmodal')).toBeHidden();
  });
}
