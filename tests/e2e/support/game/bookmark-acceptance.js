'use strict';
const { expect } = require('../fixture');
const { openGame } = require('./navigation');
const { injectBrowserHarness } = require('./browser-harness');
const { captureWorldSnapshot } = require('./parity');

async function beginBookmark(page, testInfo, id, scenarioId) {
  await openGame(page, testInfo);
  const setup = await page.evaluate(function (input) {
    const id = input.id;
    const bm = FB.bookmark(id);
    if (!bm) throw new Error('Bookmark ' + id + ' was not registered at boot.');
    const errors = FB.validateBookmark(bm);
    if (errors.length) throw new Error(errors.join('\n'));
    // Owner review inside this isolated test context. Production visibility
    // and the definition in the shipped source are never changed.
    bm.hidden = false;
    FB.startProgression.noteTier(3);
    const offered = FBDATA.startScenarios.filter(function (s) {
      return !s.hidden && !s.rulerRealmId &&
        (!s.bookmarkIds || s.bookmarkIds.indexOf(id) >= 0) &&
        (!s.eras || s.eras.indexOf(bm.era) >= 0) && (!bm.starts || bm.starts.indexOf(s.id) >= 0);
    });
    const scenario = input.scenarioId ? offered.filter(function (s) { return s.id === input.scenarioId; })[0]
      : offered.filter(function (s) { return s.profession === 'farmer'; })[0] || offered[0];
    if (!scenario) throw new Error('No ordinary start for bookmark ' + id);
    const county = bm.provinces.filter(function (p) {
      return !p.wasteland && (scenario.fixedProvinceId ? p.id === scenario.fixedProvinceId : true);
    })[0];
    const culture = scenario.startCulture || county.culture, faith = scenario.startReligion || county.religion;
    const family = scenario.familyPresets ? Object.keys(scenario.familyPresets)[0] : 'established';
    const code = 'BOOKMARKSMOKE-' + id + '-' + scenario.id + '-' + county.id + '-m-Review-' + family;
    // Principal identities need no suffix. The ninth part requires an
    // explicitly authored community, which fallback-only counties lack.
    const nonPrincipal = culture !== county.culture || faith !== county.religion;
    return { code:code + (nonPrincipal ? '-0-' + culture + '.' + faith : '') };
  }, { id:id, scenarioId:scenarioId });
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(setup.code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await injectBrowserHarness(page);
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    delete FB.state.player.flags.tutorial;
  });
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(id);
}

async function advanceBookmark(page, days) {
  // Bounded quarters keep browser work responsive and expose the exact
  // natural-day boundary that failed rather than silently skipping time.
  for (let elapsed = 0; elapsed < days; elapsed += 90) {
    const result = await page.evaluate(function (days) {
      const target = FB.state.turn + days;
      for (let attempts = 0; attempts < days + 30 && FB.state.turn < target; attempts++) {
        if (FB.state.player.dead) {
          const heirs = FB.heirsOf(FB.state);
          if (!heirs.length) throw new Error('The review dynasty ended before the smoke boundary.');
          FB.ui.closeModal(); FB.game.succeedTo(heirs[0].id); FB.ui.closeModal();
          FB.game.auto.all = true;
        }
        FB.game.passDay({ deferUi:true });
      }
      return { remaining:target - FB.state.turn, errors:FBTEST.checkInvariants() };
    }, Math.min(90, days - elapsed));
    expect(result).toEqual({ remaining:0, errors:[] });
  }
}

async function restoreBookmark(page, text) {
  if (!await page.evaluate(function () { return !!window.FBTEST; })) await injectBrowserHarness(page);
  await page.evaluate(function (source) {
    window.__bookmarkRestored = false;
    const accepted = FB.game.loadData(JSON.parse(source), function () {
      FB.game.setPaused(true); window.__bookmarkRestored = true;
    });
    if (accepted === false) throw new Error('Bookmark smoke restore was rejected.');
  }, text);
  await expect.poll(function () { return page.evaluate(function () { return window.__bookmarkRestored; }); },
    { timeout:120 * 1000 }).toBe(true);
  await page.evaluate(function () { FB.game.auto.all = true; FB.game.auto.style = 'first'; });
}

async function facts(page) {
  const snapshot = await captureWorldSnapshot(page, null);
  // rng() uses signed bitwise arithmetic; restore accepts the same bits as
  // uint32. Preserve every bit while comparing those equivalent representations.
  snapshot.rng = snapshot.rng >>> 0;
  return { snapshot:snapshot, campaign:await page.evaluate(function () {
    const s = FB.state, out = { rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(), start:s.start, date:s.date, turn:s.turn };
    // The serializer adds this schema stamp to its detached authority copy.
    // Compare the ledger facts; the envelope contract is validated separately.
    ['stories','bookmarkSetup','authority','religiousHeads','religiousHeadVacancies','localInstitutions'].forEach(function (key) {
      if (s[key] !== undefined) out[key] = key === 'authority'
        ? Object.assign({}, s[key], { schema:undefined }) : s[key];
    });
    return JSON.parse(JSON.stringify(out));
  }) };
}

module.exports = { beginBookmark, advanceBookmark, restoreBookmark, facts };
