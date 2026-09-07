'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/agency.js', 'js/model.js', 'js/events.js',
  'js/world.js', 'js/travel.js', 'js/items.js', 'js/economy.js', 'js/actions.js',
  'js/ui_modals.js', 'js/ui_panels.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const child = FB.makeCharacter(s, { name:'Discovery Child', sex:me.sex,
      born:s.date.year - 18, culture:me.culture, religion:me.religion, station:1 });
    child.fatherId = me.id;
    me.childrenIds = (me.childrenIds || []).concat(child.id);
    child.homeProvinceId = s.player.provinceId;
    FB.touchFamily();
    window.discoveryChildId = child.id;
  });
});

test('both subjects browse scopes and filters without writing state or consuming RNG', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.chars[s.player.charId].spouseId = 'missing-legacy-spouse';
    const before = JSON.stringify(s), rng = FB.getRngState();
    const subjects = FB.marriageDiscoverySubjects(s).map(function (c) { return c.id; });
    const all = FB.marriageCandidateQuery(s, { scope:'all', availability:'all' });
    const nearby = FB.marriageCandidateQuery(s, { availability:'all' });
    const child = FB.marriageCandidateQuery(s, { subjectId:window.discoveryChildId, scope:'all' });
    const sample = all[0];
    const filtered = sample ? FB.marriageCandidateQuery(s, { scope:'all', availability:'all',
      search:sample.name, minAge:sample.age, maxAge:sample.age, faith:sample.faith,
      rank:String(sample.rank), heirs:sample.heir }) : [];
    return { same:JSON.stringify(s) === before, rngSame:FB.getRngState() === rng,
      subjects:subjects, childId:window.discoveryChildId, count:all.length,
      unique:new Set(all.map(function (r) { return r.key; })).size,
      nearbyValid:nearby.every(function (r) {
        const home = FB.playerRealmId(s), court = FB.topRealm(s, r.realmId);
        return (home === court || FB.realmsAdjacent(s, home, court)) &&
          all.some(function (a) { return a.key === r.key; });
      }),
      filtersValid:filtered.length > 0 && filtered.every(function (r) {
        return r.age === sample.age && r.faith === sample.faith && r.rank === sample.rank && (!sample.heir || r.heir);
      }), blockedExplain:child.every(function (r) { return r.status.ready || !!r.status.reason; }) };
  });
  expect(result.same).toBe(true);
  expect(result.rngSame).toBe(true);
  expect(result.subjects).toContain(result.childId);
  expect(result.count).toBeGreaterThan(0);
  expect(result.unique).toBe(result.count);
  expect(result.nearbyValid).toBe(true);
  expect(result.filtersValid).toBe(true);
  expect(result.blockedExplain).toBe(true);
});

test('compact court review restores filters, scroll and keyboard focus', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showMarriageFinder(); });
  await page.locator('#finder-scope').selectOption('all');
  await page.locator('#finder-availability').selectOption('all');
  const button = page.locator('[data-finder-court]').first();
  await expect(button).toBeVisible();
  await button.focus();
  const saved = await page.evaluate(function () {
    const body = document.getElementById('gm-body');
    return { scroll:body.scrollTop, court:document.activeElement.dataset.finderCourt };
  });
  await button.press('Enter');
  await page.locator('#cm-close').click();
  await expect(page.locator('#finder-scope')).toHaveValue('all');
  await expect(page.locator('#finder-availability')).toHaveValue('all');
  await expect(page.locator('[data-finder-court="' + saved.court + '"]').first()).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBe(saved.scroll);
});

test('descendant review retains the selected pair and stale clicks cannot propose', async function ({ page }) {
  const ids = await page.evaluate(function () {
    const s = FB.state;
    const row = FB.marriageCandidateQuery(s, { subjectId:window.discoveryChildId, scope:'all' })[0];
    FB.ensureRealmCourtForDisplay(s, row.realmId);
    const member = FB.realmFamilySnapshot(s, row.realmId)[0];
    const partner = FB.materializeRoyalChild(s, row.realmId, member.id);
    partner.sex = s.chars[window.discoveryChildId].sex === 'm' ? 'f' : 'm';
    member.sex = partner.sex;
    FB.ui.showMarriageFinder(window.discoveryChildId, row.realmId);
    return { child:window.discoveryChildId, partner:partner.id };
  });
  await page.locator('#finder-scope').selectOption('all');
  await page.locator('#finder-availability').selectOption('all');
  await page.locator('[data-finder-review="' + ids.partner + '"]').click();
  await expect(page.locator('[data-royal-kin-match]')).toHaveCount(1);
  await expect(page.locator('[data-royal-kin-match]')).toHaveAttribute('data-royal-kin-match', ids.child);
  await page.locator('#gm-cancel').click();
  const before = await page.evaluate(function (id) {
    FB.state.chars[id].dead = true;
    FB.touchFamily();
    return { turn:FB.state.turn, gold:FB.state.player.gold, rng:FB.getRngState() };
  }, ids.partner);
  await page.locator('[data-finder-review="' + ids.partner + '"]').click();
  await expect(page.locator('[data-finder-review="' + ids.partner + '"]')).toHaveCount(0);
  expect(await page.evaluate(function () {
    return { turn:FB.state.turn, gold:FB.state.player.gold, rng:FB.getRngState() };
  })).toEqual(before);
});

test('finder controls fit a mobile viewport and retain native keyboard input', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showMarriageFinder(window.discoveryChildId); });
  await page.locator('#finder-search').fill('No such dynasty');
  await expect(page.locator('#finder-results')).toContainText('No matches');
  const layout = await page.locator('.marriage-finder').evaluate(function (root) {
    return Array.from(root.querySelectorAll('select, input:not([type="checkbox"]), button')).every(function (el) {
      const box = el.getBoundingClientRect();
      return box.width <= 390 && box.height >= 44;
    });
  });
  expect(layout).toBe(true);
});


test('descendant sheets link to the preselected finder without changing the game', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showCharModal(window.discoveryChildId); });
  await page.getByRole('button', { name:'Find a marriage', exact:false }).click();
  const childId = await page.evaluate(function () { return window.discoveryChildId; });
  await expect(page.locator('#finder-subject')).toHaveValue(childId);
  const before = await page.evaluate(function () { return { state:JSON.stringify(FB.state), rng:FB.getRngState() }; });
  await page.locator('#finder-scope').selectOption('all');
  await page.locator('#finder-heirs').check();
  await page.locator('#finder-minAge').fill('16');
  await page.locator('#finder-maxAge').fill('40');
  expect(await page.evaluate(function () { return { state:JSON.stringify(FB.state), rng:FB.getRngState() }; })).toEqual(before);
});
