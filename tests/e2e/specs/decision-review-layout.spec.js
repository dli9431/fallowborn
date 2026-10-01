'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_panels.js', 'css/style.css',
  'js/travel.js', 'data/travel.js', 'js/economy.js', 'data/economy.js',
  'js/main.js', 'js/portrait.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Decision reviews share one layout: a fact card of label/value rows, named
   people with portraits, full-width action cards whose cost or first blocker
   stays on the face, and supporting rules behind Details. */
test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.game.setPaused(true); });
});

test('journey review shows terms as rows and keeps travel rules behind Details', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state;
    const destination = FB.world.provs.filter(function (pr) {
      return pr.id !== s.player.provinceId && !pr.wasteland;
    })[0];
    FB.ui._shared.travelPicker = { kind:'travel', purpose:'pilgrimage', choices:[],
      selected:{ destinationId:destination.id, legs:3, days:12, cost:7 } };
    FB.ui._shared.reviewTravelChoice();
  });
  const facts = page.locator('[data-travel-review]');
  await expect(facts.locator('.kv')).toHaveCount(6);
  await expect(facts).toContainText('3 county legs');
  await expect(facts).toContainText('12 days each way');
  await expect(page.locator('#travel-depart')).toContainText('no refund if you turn back');
  await expect(page.locator('#travel-depart-details')).toBeHidden();
  await expect(page.locator('#travel-depart-details')).toContainText('Turning back refunds nothing.');
  await expect(page.locator('#gm-body .gm-footer #travel-review-back')).toHaveCount(1);
  await expect(page.locator('#gm-body > .gm-body-text > p')).toHaveCount(0);
});

test('post-marriage residence shows every named person with a portrait', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const spouse = FB.makeCharacter(s, { name:'Residence spouse', sex:me.sex === 'm' ? 'f' : 'm',
      born:s.date.year - 25, culture:me.culture, religion:me.religion, traitsN:0 });
    const destination = FB.world.provs.filter(function (pr) {
      return pr.id !== s.player.provinceId && !pr.wasteland;
    })[0].id;
    s.player.travel = { purpose:'relationship', phase:'arrived', currentId:destination,
      destinationId:destination, homeId:s.player.provinceId,
      marriageResidence:{ spouseId:spouse.id, destinationId:destination } };
    FB.ui.showMarriageResidence();
  });
  const facts = page.locator('[data-marriage-residence]');
  await expect(facts.locator('canvas.pface')).toHaveCount(await page.evaluate(function () {
    return FB.heirsOf(FB.state).length ? 3 : 2;
  }));
  await expect(page.locator('#marriage-residence-defer')).toContainText('Keep the ordinary stay');
  await expect(page.locator('#marriage-residence-defer-details')).toBeHidden();
  await expect(page.locator('#gm-title-details')).toContainText('The wedding is complete');
  await expect(page.locator('#gm-title-details')).toBeHidden();
});

test('career picker uses a current-work card and option cards with fees on the face', async function ({ page }) {
  const choice = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    s.player.tier = 1;
    me.born = s.date.year - 25;
    s.player.gold = 0;
    FB.ui.showCareerPicker(me.id);
    const item = FB.careerChoices(s, me).filter(function (entry) { return entry.cost > 0; })[0];
    return item ? { id:item.id, cost:item.cost } : null;
  });
  await expect(page.locator('[data-career-current] canvas.pface')).toHaveCount(1);
  await expect(page.locator('[data-career-current] .kv').first()).toContainText('Occupation');
  const cards = page.locator('.review-action-card [data-career-choice]');
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(page.locator('[id^="career-choice-details-"]').first()).toBeHidden();
  if (choice) {
    const card = page.locator('[data-career-choice="' + choice.id + '"]');
    await expect(card).toBeDisabled();
    await expect(card.locator('.adesc')).toHaveClass(/review-note-warn/);
    await expect(card.locator('.adesc')).toContainText('you have');
    await expect(card.locator('xpath=ancestor::div[contains(@class,"settcard")][1]')).toHaveAttribute('tabindex', '0');
  }
  await expect(page.locator('#gm-title-details')).toContainText('Changing work spends the day');
  await expect(page.locator('#gm-body .gm-footer #gm-cancel')).toHaveText('Back');
});

test('retirement summarizes the handover with portraits and moves rules to Details', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    me.born = s.date.year - 55;
    const child = FB.makeCharacter(s, { name:'Review heir', sex:'m', culture:me.culture,
      religion:me.religion, born:s.date.year - 25, motherId:me.id, dyn:me.dyn, traitsN:0 });
    child.health = 8;
    me.childrenIds.push(child.id);
    FB.touchFamily();
    FB.ui.showRetirement();
  });
  await expect(page.locator('[data-retire-summary] canvas.pface')).toHaveCount(1);
  await expect(page.locator('[data-retire-summary]')).toContainText('New head receives');
  await expect(page.locator('.review-actions [data-retire-heir] canvas.pface').first()).toBeVisible();
  await expect(page.locator('#gm-title-details')).toContainText('retired elder');
  await expect(page.locator('#gm-title-details')).toBeHidden();
});

test('confirmations keep costs as rows, actions as cards and exits in the footer', async function ({ page }) {
  // Eligibility stubs isolate presentation; each is restored before assertions.
  await page.evaluate(function () {
    const original = FB.canSeekAbsolution;
    FB.canSeekAbsolution = function () { return true; };
    try { FB.ui.showAbsolution(); } finally { FB.canSeekAbsolution = original; }
  });
  await expect(page.locator('[data-absolution] .kv').first()).toContainText('Cost');
  await expect(page.locator('#absolution-confirm')).toContainText('piety now');
  await expect(page.locator('#absolution-confirm-details')).toBeHidden();
  await expect(page.locator('#gm-body > .gm-footer [data-modal-nav]').first()).toBeVisible();
  await expect(page.locator('#gm-body > .gm-body-text > p')).toHaveCount(0);

  await page.evaluate(function () {
    FB.ui.closeModal();
    const s = FB.state, me = s.chars[s.player.charId];
    const friend = FB.makeCharacter(s, { name:'Layout friend', sex:'m', born:s.date.year - 30,
      culture:me.culture, religion:me.religion, traitsN:0 });
    const original = FB.canNameFriend;
    FB.canNameFriend = function () { return true; };
    try { FB.ui.showFriendConfirm(friend.id); } finally { FB.canNameFriend = original; }
  });
  await expect(page.locator('[data-friend-review] canvas.pface').first()).toBeVisible();
  await expect(page.locator('#friend-confirm')).toContainText('Takes 1 day');
  await expect(page.locator('#friend-confirm-details')).toBeHidden();
});

test('retainer hiring shows capacity and office blockers on the face', async function ({ page }) {
  await page.evaluate(function () {
    FB.state.player.gold = 0;
    FB.ui.showRetainerHire();
  });
  await expect(page.locator('#gm-body .review-fact-card .kv')).toContainText('Household capacity');
  const offices = page.locator('.review-action-card [data-retainer-office]');
  expect(await offices.count()).toBeGreaterThan(0);
  await expect(offices.first().locator('.adesc')).not.toHaveText('');
  await expect(page.locator('[id^="retainer-office-details-"]').first()).toBeHidden();
  await expect(page.locator('#gm-title-details')).toContainText('Retainers are named, paid servants.');
});
