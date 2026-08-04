'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

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
      minStation:0,
      maxDowry:null,
      maxGold:null,
      maxPrestige:null
    });
    expect(result.invalidRecommendationCleared).toBe(true);
    expect(result.policy).toEqual({
      enabled:true,
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
      candidate.born = state.date.year - 11;
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

test('previews, saves, and reviews a recommendation from Household Plan',
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
    await page.getByRole('button', {
      name:'Preview recommendations',
      exact:true
    }).click();

    const card = page.locator('.match-policy-preview-card').filter({
      hasText:family.childName
    });
    await expect(card).toContainText(family.peerName);
    await expect(card).toContainText('Gentry');
    await expect(card).toContainText('8');
    await expect(card).toContainText('no pledge has been made');

    await page.getByRole('button', {
      name:'Save assistant limits',
      exact:true
    }).click();
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
    await expect(page.locator('#gm-title')).toContainText('Household Plan');
    const sealed = await page.evaluate(function (ids) {
      const child = FB.state.chars[ids.childId];
      return {
        protected:FB.isProtected(
          FB.state, 'matchCharacter', ids.childId),
        betrothedId:child.betrothedId,
        turn:FB.state.turn
      };
    }, family);
    expect(sealed.protected).toBe(false);
    expect(sealed.betrothedId).toBe(family.peerId);
    expect(sealed.turn).toBe(1);
  });
