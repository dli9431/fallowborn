'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/cultures.js',
  'data/technology.js',
  'js/main.js',
  'js/events.js',
  'css/style.css',
  'js/model.js',
  'js/ui_misc.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function addEligibleDescendant(page) {
  return page.evaluate(function () {
    const state = FB.state;
    const parent = state.chars[state.player.charId];
    state.player.tier = 2;
    state.player.gold = 100;
    state.player.prestige = 100;
    const child = FB.makeCharacter(state, {
      name:'Aveline',
      sex:'f',
      culture:parent.culture,
      religion:parent.religion,
      born:state.date.year - 16,
      role:'child',
      dyn:parent.dyn,
      traitsN:0
    });
    child.health = 8;
    if (parent.sex === 'f') child.motherId = parent.id;
    else child.fatherId = parent.id;
    parent.childrenIds.push(child.id);

    const candidates = FB.spawnMatchCandidates(state, child);
    const byStation = {};
    for (const candidate of candidates) {
      byStation[FB.stationOf(candidate)] = candidate;
      delete candidate.dowryDue;
      candidate.dowryAsk = FB.stationOf(candidate) === 1 ? 0 :
        (FB.stationOf(candidate) === 2 ? 8 : 20);
    }
    return {
      childId:child.id,
      childName:child.name,
      lowId:byStation[1].id,
      peerId:byStation[2].id,
      peerName:byStation[2].name,
      highId:byStation[3].id
    };
  });
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('age preferences filter strictly, rank deterministically, and allow searches from birth', async function ({ page }) {
  const family = await addEligibleDescendant(page);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, child = s.chars[ids.childId];
    const candidates = [ids.lowId, ids.peerId, ids.highId].map(function (id) { return s.chars[id]; });
    child.sex = 'm';
    candidates.forEach(function (c) { c.sex = 'f'; });
    function ages(childAge, values) {
      child.born = s.date.year - childAge;
      candidates.forEach(function (c, i) { c.born = s.date.year - values[i]; });
    }
    function choose(mode, extra) {
      const policy = Object.assign({ enabled:true, agePreference:mode }, extra || {});
      const entry = FB.matchPolicyRecommendation(s, child, policy, candidates);
      return entry.candidate && entry.candidate.id;
    }
    ages(20, [18, 20, 48]);
    const before = JSON.stringify([s.player.gold, s.player.prestige, s.turn, FB.getRngState()]);
    const close = choose('close'), youngest = choose('youngest');
    const same = choose('same'), younger = choose('younger');
    const noYoungerAboveStation = choose('younger', { minStation:2 });
    const olderStillManual = FB.kinMatchTerms(s, child, candidates[2]).ok;
    ages(20, [10, 18, 19]);
    const youngerRanked = choose('younger');
    const youngestWithinStation = choose('youngest', { minStation:2 });
    ages(20, [20, 20, 20]);
    const sameRanked = choose('same'), youngestTieRanked = choose('youngest');
    ages(20, [15, 20, 25]);
    const inclusive = choose('close');
    ages(20, [14, 26, 48]);
    const noClose = choose('close'), noSame = choose('same');
    ages(0, [0, 1, 5]);
    const newbornClose = choose('close'), newbornYoungest = choose('youngest');
    const newbornSame = choose('same'), newbornYounger = choose('younger');
    const after = JSON.stringify([s.player.gold, s.player.prestige, s.turn, FB.getRngState()]);
    ages(20, [18, 20, 48]);
    FB.setMatchPolicy(s, { enabled:true, agePreference:'same' });
    const stored = child.matchRecommendation.policyKey;
    s.player.matchPolicy.agePreference = 'youngest';
    const staleHidden = FB.matchRecommendationOf(s, child) === null;
    FB.recommendDescendantMatches(s, { notify:false });
    const refreshed = FB.matchRecommendationOf(s, child);
    const restored = JSON.parse(JSON.stringify(s));
    const normalized = FB.ensureMatchPolicy(restored, true);
    return { close:close, youngest:youngest, same:same, younger:younger,
      noYoungerAboveStation:noYoungerAboveStation, olderStillManual:olderStillManual,
      youngerRanked:youngerRanked, youngestWithinStation:youngestWithinStation,
      sameRanked:sameRanked, youngestTieRanked:youngestTieRanked,
      inclusive:inclusive, noClose:noClose, noSame:noSame,
      newbornClose:newbornClose, newbornYoungest:newbornYoungest,
      newbornSame:newbornSame, newbornYounger:newbornYounger,
      unchanged:before === after, staleHidden:staleHidden,
      refreshed:refreshed && refreshed.candidate.id,
      changedKey:stored !== child.matchRecommendation.policyKey,
      restoredMode:normalized.agePreference,
      techMode:FBDATA.techImpactReviews.features.descendant_match_age_preferences.mode };
  }, family);
  expect(result).toEqual({ close:family.peerId, youngest:family.lowId,
    same:family.peerId, younger:family.lowId, noYoungerAboveStation:null,
    olderStillManual:true, inclusive:family.highId, noClose:null, noSame:null,
    youngerRanked:family.highId, youngestWithinStation:family.peerId,
    sameRanked:family.highId, youngestTieRanked:family.highId,
    newbornClose:family.highId, newbornYoungest:family.lowId,
    newbornSame:family.lowId, newbornYounger:null, unchanged:true,
    staleHidden:true, refreshed:family.lowId, changedKey:true,
    restoredMode:'youngest', techMode:'none' });
});

for (const width of [390, 1280]) {
  test('match age preference saves and reopens at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    await addEligibleDescendant(page);
    await page.evaluate(function () { FB.ui.showHouseholdPlan(); });
    await page.locator('#household-match-policy').click();
    await page.locator('#match-policy-enabled').check();
    const selector = page.locator('#match-policy-age-preference');
    await expect(selector.locator('option')).toHaveCount(4);
    await expect(selector).toHaveValue('close');
    for (const mode of ['youngest', 'same', 'younger', 'close']) {
      await selector.selectOption(mode);
      await page.locator('#match-policy-save').click();
      expect(await page.evaluate(function () {
        return FB.state.player.matchPolicy.agePreference;
      })).toBe(mode);
      await page.locator('#household-match-policy').click();
      await expect(selector).toHaveValue(mode);
    }
    await selector.selectOption('youngest');
    await page.locator('#match-policy-back').click();
    expect(await page.evaluate(function () {
      return FB.state.player.matchPolicy.agePreference;
    })).toBe('close');
  });
}

test('recommends within saved limits without pledging or spending',
  async function ({ page }) {
    const family = await addEligibleDescendant(page);
    const result = await page.evaluate(function (ids) {
      const state = FB.state;
      const child = state.chars[ids.childId];
      const before = {
        turn:state.turn,
        gold:state.player.gold,
        prestige:state.player.prestige,
        log:state.log.length
      };
      delete state.player.matchPolicy;
      child.matchRecommendation = 'legacy-invalid';
      const defaults = FB.ensureMatchPolicy(state, true);
      const invalidRecommendationCleared = !child.matchRecommendation;
      const policy = FB.setMatchPolicy(state, {
        enabled:true,
        minStation:2,
        maxDowry:10,
        maxGold:10,
        maxPrestige:0
      });
      const recommendation = FB.matchRecommendationOf(state, child);
      const afterFirst = state.log.length;
      FB.recommendDescendantMatches(state);
      return {
        defaults:defaults,
        invalidRecommendationCleared:invalidRecommendationCleared,
        policy:policy,
        recommendedId:recommendation && recommendation.candidate.id,
        lowStillManual:FB.kinMatchTerms(
          state, child, state.chars[ids.lowId]).ok,
        betrothedId:child.betrothedId || null,
        turn:state.turn,
        gold:state.player.gold,
        prestige:state.player.prestige,
        firstNotices:afterFirst - before.log,
        repeatedNotices:state.log.length - afterFirst
      };
    }, family);

    expect(result.defaults).toEqual({
      enabled:false,
      agePreference:'close',
      minStation:0,
      maxDowry:null,
      maxGold:null,
      maxPrestige:null
    });
    expect(result.invalidRecommendationCleared).toBe(true);
    expect(result.policy).toEqual({
      enabled:true,
      agePreference:'close',
      minStation:2,
      maxDowry:10,
      maxGold:10,
      maxPrestige:0
    });
    expect(result.recommendedId).toBe(family.peerId);
    expect(result.lowStillManual).toBe(true);
    expect(result.betrothedId).toBeNull();
    expect(result.turn).toBe(0);
    expect(result.gold).toBe(100);
    expect(result.prestige).toBe(100);
    expect(result.firstNotices).toBe(1);
    expect(result.repeatedNotices).toBe(0);
  });

test('honors age, faith, close-kin, doctrine, compact, and resource gates',
  async function ({ page }) {
    const family = await addEligibleDescendant(page);
    const gates = await page.evaluate(function (ids) {
      const state = FB.state;
      const child = state.chars[ids.childId];
      const candidate = state.chars[ids.peerId];
      const originalBorn = candidate.born;
      candidate.born = state.date.year + 1;
      const age = FB.kinMatchTerms(state, child, candidate).reason;
      candidate.born = originalBorn;

      const originalReligion = candidate.religion;
      candidate.religion = originalReligion === 'catholic'
        ? 'orthodox' : 'catholic';
      const faith = FB.kinMatchTerms(state, child, candidate).reason;
      candidate.religion = originalReligion;

      candidate.motherId = child.motherId;
      candidate.fatherId = child.fatherId;
      const kinship = FB.kinMatchTerms(state, child, candidate).reason;
      candidate.motherId = null;
      candidate.fatherId = null;

      const papacyCelibate = FB.papacyCelibate;
      FB.papacyCelibate = function (testState, value) {
        return value && value.id === child.id;
      };
      const doctrine = FB.kinMatchTerms(state, child, candidate).reason;
      FB.papacyCelibate = papacyCelibate;

      candidate.royalLine = { realmId:'test', memberId:'test' };
      const compact = FB.kinMatchTerms(state, child, candidate).reason;
      delete candidate.royalLine;

      state.player.gold = 0;
      const gold = FB.kinMatchTerms(state, child, candidate).reason;
      state.player.gold = 100;
      state.player.prestige = 0;
      candidate.station = 3;
      const prestige = FB.kinMatchTerms(state, child, candidate).reason;
      return {
        age:age,
        faith:faith,
        kinship:kinship,
        doctrine:doctrine,
        compact:compact,
        gold:gold,
        prestige:prestige
      };
    }, family);

    expect(gates).toEqual({
      age:'age',
      faith:'faith',
      kinship:'kinship',
      doctrine:'doctrine',
      compact:'compact',
      gold:'gold',
      prestige:'prestige'
    });
  });

test('reviews recommendations in shared details and saves directly from Household Plan',
  async function ({ page }) {
    const family = await addEligibleDescendant(page);
    await page.evaluate(function () {
      FB.ui.showHouseholdPlan();
    });

    await expect(page.getByRole('heading', {
      name:/Household Plan/
    })).toBeVisible();
    await page.locator('#household-match-policy').click();
    await expect(page.getByRole('heading', {
      name:/Descendant Match Assistant/
    })).toBeVisible();

    const enabled = page.getByRole('checkbox', {
      name:/Recommend descendant matches/
    });
    await enabled.check();
    await page.locator('#match-policy-station').selectOption('2');
    await page.locator('#match-policy-dowry').fill('10');
    await page.locator('#match-policy-gold').fill('10');
    await page.locator('#match-policy-prestige').fill('0');
    await expect(page.locator('#match-policy-preview')).toHaveCount(0);

    const preview = page.locator('.household-policy-inline-preview');
    await preview.hover();
    const card = page.locator('#tooltip .match-policy-preview-card').filter({
      hasText:family.childName
    });
    await expect(card).toBeVisible();
    await expect(card).toContainText(family.peerName);
    await expect(card).toContainText('Gentry');
    await expect(card).toContainText('8');
    await expect(card).toContainText('no pledge has been made');

    await page.setViewportSize({ width:390, height:740 });
    const info = preview.locator('.settcard-info');
    await expect(info).toBeVisible();
    await info.click();
    const inlineCard = page.locator(
      '#match-policy-preview-details .match-policy-preview-card').filter({
      hasText:family.childName
    });
    await expect(inlineCard).toBeVisible();
    await expect(inlineCard).toContainText(family.peerName);

    await page.locator('#match-policy-save').click();
    const matchCell = page.locator(
      '[data-household-plan-action="match"]' +
      '[data-household-plan-cid="' + family.childId + '"]');
    await expect(matchCell).toContainText('Recommended: ' + family.peerName);

    const saved = await page.evaluate(function (childId) {
      const state = FB.state;
      const child = state.chars[childId];
      return {
        policy:state.player.matchPolicy,
        betrothedId:child.betrothedId || null,
        turn:state.turn,
        gold:state.player.gold
      };
    }, family.childId);
    expect(saved.policy).toEqual({
      enabled:true,
      agePreference:'close',
      minStation:2,
      maxDowry:10,
      maxGold:10,
      maxPrestige:0
    });
    expect(saved.betrothedId).toBeNull();
    expect(saved.turn).toBe(0);
    expect(saved.gold).toBe(100);

    await matchCell.click();
    await expect(page.getByRole('heading', {
      name:'A Match for ' + family.childName,
      exact:true
    })).toBeVisible();
    const choices = page.locator('[data-match]');
    await expect(choices.first()).toHaveAttribute('data-match', family.peerId);
    await expect(choices.first()).toContainText(
      'Recommended by your assistant limits');
    await expect(choices).toHaveCount(3);
    await expect(page.locator('[data-match="' + family.highId + '"]'))
      .toBeEnabled();
  });

test('reserved descendants stay manual and a sealed match returns to Household Plan',
  async function ({ page }) {
    const family = await addEligibleDescendant(page);
    const protectedResult = await page.evaluate(function (ids) {
      const state = FB.state;
      const child = state.chars[ids.childId];
      FB.setMatchPolicy(state, {
        enabled:true,
        minStation:2,
        maxDowry:10,
        maxGold:10,
        maxPrestige:0
      });
      const hadRecommendation = !!child.matchRecommendation;
      FB.setProtected(state, 'matchCharacter', child.id, true);
      FB.recommendDescendantMatches(state, { notify:false });
      FB.ui.showHouseholdPlan();
      return {
        hadRecommendation:hadRecommendation,
        recommendationCleared:!child.matchRecommendation,
        previewOmitted:FB.matchPolicyPreview(state).every(function (entry) {
          return entry.child.id !== child.id;
        })
      };
    }, family);

    expect(protectedResult.hadRecommendation).toBe(true);
    expect(protectedResult.recommendationCleared).toBe(true);
    expect(protectedResult.previewOmitted).toBe(true);

    const matchCell = page.locator(
      '[data-household-plan-action="match"]' +
      '[data-household-plan-cid="' + family.childId + '"]');
    await matchCell.click();
    const protection = page.getByRole('checkbox', {
      name:/Manage this descendant.*matches manually/
    });
    await expect(protection).toBeChecked();
    await expect(page.locator('#gm-cancel')).toHaveText('Back');
    await expect(page.locator('[data-match]')).toHaveCount(3);

    await protection.uncheck();
    await page.locator('[data-match="' + family.peerId + '"]').click();
    await page.locator('#marriage-lineage-confirm').click();
    await expect(page.locator('#gm-title')).toContainText('Household Plan');
    const sealed = await page.evaluate(function (ids) {
      const child = FB.state.chars[ids.childId];
      return {
        protected:FB.isProtected(
          FB.state, 'matchCharacter', ids.childId),
        partnerId:child.spouseId || child.betrothedId || null,
        turn:FB.state.turn
      };
    }, family);
    expect(sealed.protected).toBe(false);
    expect(sealed.partnerId).toBe(family.peerId);
    expect(sealed.turn).toBe(1);
  });
