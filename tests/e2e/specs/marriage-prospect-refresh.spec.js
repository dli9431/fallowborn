'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'css/style.css',
  'data/bookmarks.js',
  'data/cultures.js',
  'data/map_data.js',
  'data/actions.js',
  'js/actions.js',
  'js/events.js',
  'js/model.js',
  'js/population.js',
  'js/travel.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function addEligibleDescendant(page) {
  return page.evaluate(function () {
    const state = FB.state;
    const parent = state.chars[state.player.charId];
    state.player.tier = 2;
    state.player.gold = 1000;
    state.player.prestige = 1000;
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
    FB.spawnMatchCandidates(state, child);
    return {
      childId:child.id,
      childName:child.name,
      searchTurn:child.matchSearchTurn
    };
  });
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('Seek a match replaces all three prospects only after its cooldown',
  async function ({ page }) {
    const before = await page.evaluate(function () {
      const state = FB.state;
      const status = FB.instantStatus(state, 'seek_match');
      return {
        can:status.can,
        turn:state.turn,
        gold:state.player.gold,
        prestige:state.player.prestige,
        cooldown:status.action.cd,
        runtimeCooldown:status.action.cooldownDays(state),
        configured:FBDATA.balance.marriageProspectRefreshDays
      };
    });
    expect(before.can).toBe(true);
    expect(before.cooldown).toBe(30);
    expect(before.cooldown).toBe(before.configured);
    expect(before.runtimeCooldown).toBe(before.configured);

    await page.evaluate(function () {
      FB.runInstant(FB.state, 'seek_match', { localMatch:true });
    });
    await expect(page.getByRole('heading', {
      name:'Seeking a Match', exact:true
    })).toBeVisible();
    const first = await page.evaluate(function () {
      const state = FB.state;
      const ids = state.player.suitorIds.slice();
      return {
        ids:ids,
        profiles:ids.map(function (id) {
          return state.chars[id].suitorProfile;
        }).sort(),
        turn:state.turn,
        gold:state.player.gold,
        prestige:state.player.prestige
      };
    });
    expect(first.ids).toHaveLength(3);
    expect(first.profiles).toEqual([0, 1, 2]);
    expect(first.turn).toBe(before.turn);
    expect(first.gold).toBe(before.gold);
    expect(first.prestige).toBe(before.prestige);

    await page.locator('#gm-cancel').click();
    await page.evaluate(function () {
      FB.ui.showSuitorPicker();
    });
    const reopened = await page.evaluate(function () {
      return FB.state.player.suitorIds.slice();
    });
    expect(reopened).toEqual(first.ids);
    await page.locator('#gm-cancel').click();

    const early = await page.evaluate(function () {
      const state = FB.state;
      const firstTurn = state.player.cooldowns.seek_match;
      state.turn = firstTurn + FBDATA.balance.marriageProspectRefreshDays - 1;
      const status = FB.instantStatus(state, 'seek_match');
      FB.runInstant(state, 'seek_match', { localMatch:true });
      return {
        can:status.can,
        reason:status.reason,
        ids:state.player.suitorIds.slice()
      };
    });
    expect(early.can).toBe(false);
    expect(early.reason).toContain('1 days');
    expect(early.ids).toEqual(first.ids);

    await page.evaluate(function () {
      const state = FB.state;
      state.turn = state.player.cooldowns.seek_match +
        FBDATA.balance.marriageProspectRefreshDays;
      FB.runInstant(state, 'seek_match', { localMatch:true });
    });
    await expect(page.getByRole('heading', {
      name:'Seeking a Match', exact:true
    })).toBeVisible();
    const refreshed = await page.evaluate(function (oldIds) {
      const state = FB.state;
      const ids = state.player.suitorIds.slice();
      return {
        ids:ids,
        profiles:ids.map(function (id) {
          return state.chars[id].suitorProfile;
        }).sort(),
        oldRecords:oldIds.filter(function (id) {
          return !!state.chars[id];
        })
      };
    }, first.ids);
    expect(refreshed.ids).toHaveLength(3);
    expect(refreshed.profiles).toEqual([0, 1, 2]);
    expect(refreshed.oldRecords).toEqual([]);
    expect(refreshed.ids.some(function (id) {
      return first.ids.indexOf(id) >= 0;
    })).toBe(false);
  });

test('Seek a match draws only live culture-faith pairs and raises mixed proposal thresholds',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const protagonist = state.chars[state.player.charId];
      state.player.provinceId = 'dublin';
      protagonist.culture = 'norse';
      protagonist.religion = 'norse_pagan';
      const pool = FB.marriageProspectIdentities(state, 'dublin');
      const candidates = FB.refreshSuitors(state);
      const generatedPairs = candidates.map(function (candidate) {
        return candidate.culture + '.' + candidate.religion;
      });
      /* Keep the standing part of this regression deterministic regardless of
         which valid weighted pairs the saved RNG drew. */
      candidates[0].culture = 'norse';
      candidates[0].religion = 'norse_pagan';
      candidates[1].culture = 'gaelic';
      candidates[1].religion = 'catholic';
      candidates[2].culture = 'norse';
      candidates[2].religion = 'norse_pagan';
      return {
        pool:pool.map(function (identity) {
          return identity.culture + '.' + identity.religion;
        }),
        generatedPairs:generatedPairs,
        candidates:candidates.map(function (candidate) {
          const premium = FB.courtshipIdentityStandingPremium(state, candidate);
          return {
            profile:candidate.suitorProfile,
            identity:candidate.culture + '.' + candidate.religion,
            culturePremium:premium.culture,
            faithPremium:premium.religion,
            threshold:FB.courtshipStandingThreshold(state, candidate)
          };
        }).sort(function (a, b) { return a.profile - b.profile; }),
        searchProvinces:candidates.map(function (candidate) {
          return candidate.suitorProvinceId;
        }),
        friendshipThreshold:FB.socialAttentionStandingThreshold(
          state, candidates[1], false),
        courtshipThreshold:FB.socialAttentionStandingThreshold(
          state, candidates[1], true),
        base:FB.relationshipOpinionThreshold(),
        culturePremium:FBDATA.balance.marriageCultureStandingPremium,
        faithPremium:FBDATA.balance.marriageFaithStandingPremium
      };
    });

    expect(result.pool).toEqual([
      'norse.norse_pagan',
      'gaelic.catholic'
    ]);
    expect(result.generatedPairs.every(function (identity) {
      return result.pool.indexOf(identity) >= 0;
    })).toBe(true);
    expect(result.searchProvinces).toEqual(['dublin', 'dublin', 'dublin']);
    expect(result.culturePremium).toBe(20);
    expect(result.faithPremium).toBe(30);
    expect(result.friendshipThreshold).toBe(result.base);
    expect(result.courtshipThreshold).toBe(
      result.base + result.culturePremium + result.faithPremium);
    expect(result.candidates[0]).toEqual({
      profile:0,
      identity:'norse.norse_pagan',
      culturePremium:0,
      faithPremium:0,
      threshold:result.base
    });
    expect(result.candidates[1]).toEqual({
      profile:1,
      identity:'gaelic.catholic',
      culturePremium:result.culturePremium,
      faithPremium:result.faithPremium,
      threshold:result.base + result.culturePremium + result.faithPremium
    });
    expect(result.candidates[2]).toEqual({
      profile:2,
      identity:'norse.norse_pagan',
      culturePremium:0,
      faithPremium:0,
      threshold:result.base
    });

    const reopened = await page.evaluate(function () {
      const ids = FB.state.player.suitorIds.slice();
      FB.state.player.provinceId = 'london';
      const candidates = FB.spawnSuitor(FB.state);
      candidates[1].homeProvinceId = 'dublin';
      candidates[1].epithetMsg = null;
      candidates[1].epithet = 'the Resolute';
      const friendVisit = FB.socialVisitPreview(FB.state, candidates[1], {
        readOnly:true
      });
      const courtshipVisit = FB.socialVisitPreview(FB.state, candidates[1], {
        readOnly:true, courtship:true
      });
      FB.ui.showSuitorPicker();
      return {
        ids:candidates.map(function (candidate) { return candidate.id; }),
        expected:ids,
        peerName:candidates[1].name,
        searchProvinces:candidates.map(function (candidate) {
          return candidate.suitorProvinceId;
        }),
        friendVisit:friendVisit,
        courtshipVisit:courtshipVisit
      };
    });
    expect(reopened.ids).toEqual(reopened.expected);
    expect(reopened.searchProvinces).toEqual(['dublin', 'dublin', 'dublin']);
    expect(reopened.friendVisit.eligible).toBe(true);
    expect(reopened.friendVisit.standingThreshold).toBe(result.base);
    expect(reopened.courtshipVisit.eligible).toBe(true);
    expect(reopened.courtshipVisit.standingThreshold).toBe(
      result.base + result.culturePremium + result.faithPremium);
    expect(reopened.courtshipVisit.daysToThreshold).toBeGreaterThan(
      reopened.friendVisit.daysToThreshold);
    await expect(page.getByText(
      'These prospects reflect the communities currently living in Dublin.',
      { exact:true }
    )).toBeVisible();
    await expect(page.locator('[data-suitor-card]').nth(0)
      .locator('.settcard-meta')).toContainText(
      'Norse · Norse Paganism');
    await expect(page.locator('[data-suitor-card]').nth(1)
      .locator('.settcard-meta')).toContainText(
      'Gaelic · Latin Christianity');
    await expect(page.locator('[data-suitor-card]').nth(2)
      .locator('.settcard-meta')).toContainText(
      'Norse · Norse Paganism');
    const peerCard = page.locator('[data-suitor-card]').nth(1);
    await expect(peerCard.locator('.settcard-head > b')).toHaveText(
      '💍 the Resolute - ' + reopened.peerName);
    await expect(peerCard.locator('.suitor-essentials')).toContainText(
      'Requires +' +
      (result.base + result.culturePremium + result.faithPremium) + ' Standing');
    await expect(peerCard.locator('.settcard-info')).toHaveAttribute(
      'aria-controls', /suitor-details-/);
    await expect(peerCard.locator('.settcard-details')).toHaveClass(/hidden/);
    await expect(peerCard.locator('.settcard-details'))
      .toContainText(/fertility|Past childbearing/);
    await expect(peerCard.locator('[data-suitor]')).toHaveAccessibleName(
      'Meet ' + reopened.peerName);
    await page.setViewportSize({ width:390, height:740 });
    await expect(peerCard.locator('.settcard-info')).toBeVisible();
    expect(await peerCard.locator('.settcard-actions .btn').evaluateAll(
      function (buttons) {
        return buttons.every(function (button) {
          const box = button.getBoundingClientRect();
          return box.width >= 44 && box.height >= 44;
        });
      })).toBe(true);
    await peerCard.locator('.settcard-info').click();
    await expect(peerCard.locator('.settcard-details')).toBeVisible();
  });

test('age forty adds a fourth adult prospect without capping older age bands',
  async function ({ page }) {
    const prospects = await page.evaluate(function () {
      const state = FB.state;
      const protagonist = state.chars[state.player.charId];
      protagonist.born = state.date.year - 39;
      const belowForty = FB.refreshSuitors(state).map(function (candidate) {
        return candidate.suitorProfile;
      }).sort();
      protagonist.born = state.date.year - 40;
      const atForty = FB.spawnSuitor(state).map(function (candidate) {
        return candidate.suitorProfile;
      }).sort();
      protagonist.born = state.date.year - 48;
      const candidates = FB.refreshSuitors(state);
      const byProfile = {};
      candidates.forEach(function (candidate) {
        byProfile[candidate.suitorProfile] =
          FB.ageOf(candidate, state.date.year);
      });
      return {
        ages:byProfile,
        belowForty:belowForty,
        atForty:atForty,
        profiles:candidates.map(function (candidate) {
          return candidate.suitorProfile;
        }).sort()
      };
    });

    const ages = prospects.ages;
    expect(prospects.belowForty).toEqual([0, 1, 2]);
    expect(prospects.atForty).toEqual([0, 1, 2, 3]);
    expect(prospects.profiles).toEqual([0, 1, 2, 3]);
    expect(ages[0]).toBeGreaterThanOrEqual(48);
    expect(ages[0]).toBeLessThanOrEqual(56);
    expect(ages[1]).toBeGreaterThanOrEqual(43);
    expect(ages[1]).toBeLessThanOrEqual(53);
    expect(ages[2]).toBeGreaterThanOrEqual(30);
    expect(ages[2]).toBeLessThanOrEqual(40);
    expect(ages[3]).toBeGreaterThanOrEqual(16);
    expect(ages[3]).toBeLessThanOrEqual(24);

    await page.evaluate(function () {
      FB.ui.showSuitorPicker();
    });
    await expect(page.locator('[data-suitor-card]')).toHaveCount(4);
    await expect(page.getByText(
      'Kin and gossips name 4 people who would hear your suit:',
      { exact:true }
    )).toBeVisible();
  });

test('descendant picker refreshes in place without spending time or resources',
  async function ({ page }) {
    const family = await addEligibleDescendant(page);
    const otherFamily = await addEligibleDescendant(page);
    await page.evaluate(function () {
      FB.setMatchPolicy(FB.state, {
        enabled:true,
        minStation:0,
        maxDowry:null,
        maxGold:null,
        maxPrestige:null
      });
      FB.ui.showHouseholdPlan();
    });
    const matchCell = page.locator(
      '[data-household-plan-action="match"]' +
      '[data-household-plan-cid="' + family.childId + '"]');
    await matchCell.click();
    await expect(page.getByRole('heading', {
      name:'A Match for ' + family.childName,
      exact:true
    })).toBeVisible();
    const refreshButton = page.locator('#match-candidate-refresh');
    await expect(refreshButton).toBeDisabled();
    await expect(refreshButton).toContainText('Ready in 30 days.');
    await expect(page.locator('[data-match]')).toHaveCount(3);
    const firstIds = await page.locator('[data-match]').evaluateAll(
      function (buttons) {
        return buttons.map(function (button) { return button.dataset.match; });
      });

    await page.locator('#gm-cancel').click();
    await expect(page.getByRole('heading', {
      name:/Household Plan/
    })).toBeVisible();
    await matchCell.click();
    const reopenedIds = await page.locator('[data-match]').evaluateAll(
      function (buttons) {
        return buttons.map(function (button) { return button.dataset.match; });
      });
    expect(reopenedIds.slice().sort()).toEqual(firstIds.slice().sort());
    await page.locator('#gm-cancel').click();

    const resources = await page.evaluate(function (childId) {
      const state = FB.state;
      const child = state.chars[childId];
      state.turn = child.matchSearchTurn +
        FBDATA.balance.marriageProspectRefreshDays;
      return {
        turn:state.turn,
        gold:state.player.gold,
        prestige:state.player.prestige,
        log:state.log.length
      };
    }, family.childId);
    await matchCell.click();
    await expect(page.locator('#match-candidate-refresh')).toBeEnabled();
    await page.locator('#match-candidate-refresh').click();
    await expect(page.getByRole('heading', {
      name:'A Match for ' + family.childName,
      exact:true
    })).toBeVisible();
    const refreshed = await page.evaluate(function (details) {
      const state = FB.state;
      const child = state.chars[details.childId];
      const recommendation = FB.matchRecommendationOf(state, child);
      return {
        ids:child.matchIds.slice(),
        stations:child.matchIds.map(function (id) {
          return FB.stationOf(state.chars[id]);
        }).sort(),
        oldRecords:details.oldIds.filter(function (id) {
          return !!state.chars[id];
        }),
        recommendationId:recommendation && recommendation.candidate.id,
        turn:state.turn,
        gold:state.player.gold,
        prestige:state.player.prestige,
        log:state.log.length,
        status:FB.matchCandidateRefreshStatus(state, child),
        otherStatus:FB.matchCandidateRefreshStatus(
          state, state.chars[details.otherChildId])
      };
    }, {
      childId:family.childId,
      otherChildId:otherFamily.childId,
      oldIds:firstIds
    });
    expect(refreshed.ids).toHaveLength(3);
    expect(refreshed.stations).toEqual([1, 2, 3]);
    expect(refreshed.oldRecords).toEqual([]);
    expect(refreshed.ids.some(function (id) {
      return firstIds.indexOf(id) >= 0;
    })).toBe(false);
    expect(refreshed.ids).toContain(refreshed.recommendationId);
    expect(refreshed.turn).toBe(resources.turn);
    expect(refreshed.gold).toBe(resources.gold);
    expect(refreshed.prestige).toBe(resources.prestige);
    expect(refreshed.log).toBe(resources.log);
    expect(refreshed.status).toEqual({
      eligible:true,
      ready:false,
      daysRemaining:30
    });
    expect(refreshed.otherStatus).toEqual({
      eligible:true,
      ready:true,
      daysRemaining:0
    });

    await page.locator('#gm-cancel').click();
    await expect(page.getByRole('heading', {
      name:/Household Plan/
    })).toBeVisible();

    const protectedRefresh = await page.evaluate(function (childId) {
      const state = FB.state;
      const child = state.chars[childId];
      const beforeIds = child.matchIds.slice();
      FB.setProtected(state, 'matchCharacter', child.id, true);
      state.turn += FBDATA.balance.marriageProspectRefreshDays;
      const candidates = FB.refreshMatchCandidates(state, child);
      return {
        replaced:!!candidates && candidates.every(function (candidate) {
          return beforeIds.indexOf(candidate.id) < 0;
        }),
        count:candidates && candidates.length,
        recommendation:child.matchRecommendation || null,
        resolved:FB.matchRecommendationOf(state, child),
        manual:candidates && candidates.every(function (candidate) {
          return FB.kinMatchTerms(state, child, candidate).ok;
        })
      };
    }, family.childId);
    expect(protectedRefresh).toEqual({
      replaced:true,
      count:3,
      recommendation:null,
      resolved:null,
      manual:true
    });
  });

test('Household Plan arranges a descendant match and can replace its pledge',
  async function ({ page }) {
    const family = await addEligibleDescendant(page);
    await page.evaluate(function (childId) {
      const state = FB.state;
      state.chars[childId].born = state.date.year - 14;
      FB.touchFamily();
      FB.ui.showHouseholdPlan();
    }, family.childId);

    const matchCell = page.locator(
      '[data-household-plan-action="match"]' +
      '[data-household-plan-cid="' + family.childId + '"]');
    await expect(matchCell).toContainText('Arrange a match');
    await matchCell.click();
    await expect(page.getByRole('heading', {
      name:'A Match for ' + family.childName,
      exact:true
    })).toBeVisible();
    const candidateCards = page.locator('.match-candidate-card');
    await expect(candidateCards).toHaveCount(3);
    await expect(page.locator('[data-match] .adesc')).toHaveCount(0);
    await expect(candidateCards.first().locator('.settcard-meta'))
      .toContainText('age');
    await candidateCards.first().hover();
    await expect(page.locator('#tooltip')).toContainText('Match details');
    await expect(page.locator('#tooltip')).toContainText(
      'Child identity preview');

    const firstChoice = page.locator('[data-match]').last();
    const firstId = await firstChoice.getAttribute('data-match');
    const firstTerms = await page.evaluate(function (candidateId) {
      const state = FB.state;
      const candidate = state.chars[candidateId];
      return {
        gold:state.player.gold,
        dowry:Math.max(0, Number(candidate.dowryAsk) || 0)
      };
    }, firstId);
    expect(firstTerms.dowry).toBeGreaterThan(0);
    await firstChoice.click();

    await expect(page.getByRole('heading', {
      name:/Household Plan/
    })).toBeVisible();
    await expect(matchCell).toContainText('Betrothed');
    await expect(matchCell).toContainText('Promised to');
    await expect(matchCell).toContainText('Select to review, change, or end this pledge');
    const firstPledge = await page.evaluate(function (ids) {
      const state = FB.state;
      const child = state.chars[ids.childId];
      const former = state.chars[ids.formerId];
      return {
        childBetrothedId:child.betrothedId,
        formerBetrothedId:former && former.betrothedId,
        gold:state.player.gold,
        turn:state.turn
      };
    }, { childId:family.childId, formerId:firstId });
    expect(firstPledge).toEqual({
      childBetrothedId:firstId,
      formerBetrothedId:family.childId,
      gold:firstTerms.gold - firstTerms.dowry,
      turn:1
    });

    await matchCell.click();
    await expect(page.getByRole('heading', {
      name:'Change the Match for ' + family.childName,
      exact:true
    })).toBeVisible();
    await expect(page.getByText(
      /Choosing another match sets aside the current pledge/
    )).toBeVisible();
    await expect(page.getByText(
      /Any dowry already paid is not refunded/
    )).toBeVisible();
    const browsing = await page.evaluate(function (ids) {
      const state = FB.state;
      const child = state.chars[ids.childId];
      const former = state.chars[ids.formerId];
      return {
        childBetrothedId:child.betrothedId,
        formerBetrothedId:former && former.betrothedId,
        alternatives:child.matchIds && child.matchIds.length
      };
    }, { childId:family.childId, formerId:firstId });
    expect(browsing).toEqual({
      childBetrothedId:firstId,
      formerBetrothedId:family.childId,
      alternatives:3
    });

    const replacementChoice = page.locator('[data-match]').first();
    const replacementId = await replacementChoice.getAttribute('data-match');
    const replacementTerms = await page.evaluate(function (candidateId) {
      const state = FB.state;
      const candidate = state.chars[candidateId];
      return {
        gold:state.player.gold,
        dowry:Math.max(0, Number(candidate.dowryAsk) || 0)
      };
    }, replacementId);
    await replacementChoice.click();

    await expect(page.getByRole('heading', {
      name:/Household Plan/
    })).toBeVisible();
    const replaced = await page.evaluate(function (ids) {
      const state = FB.state;
      const child = state.chars[ids.childId];
      const replacement = state.chars[ids.replacementId];
      return {
        childBetrothedId:child.betrothedId,
        replacementBetrothedId:replacement && replacement.betrothedId,
        formerStillTracked:!!state.chars[ids.formerId],
        gold:state.player.gold,
        turn:state.turn,
        forfeitureLogged:state.log.some(function (entry) {
          return entry.msg &&
            entry.msg.key === 'news.event.kin_pledge_replaced_forfeit' &&
            entry.msg.params.former;
        })
      };
    }, {
      childId:family.childId,
      formerId:firstId,
      replacementId:replacementId
    });
    expect(replaced).toEqual({
      childBetrothedId:replacementId,
      replacementBetrothedId:family.childId,
      formerStillTracked:false,
      gold:replacementTerms.gold - replacementTerms.dowry,
      turn:2,
      forfeitureLogged:true
    });
  });

test('a descendant can be pledged from birth and the pledge can be ended without a refund',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const state = FB.state;
      const parent = state.chars[state.player.charId];
      state.player.tier = 2;
      state.player.gold = 1000;
      state.player.prestige = 1000;
      const child = FB.makeCharacter(state, {
        name:'Newborn Aveline',
        sex:'f',
        culture:parent.culture,
        religion:parent.religion,
        born:state.date.year,
        role:'child',
        dyn:parent.dyn,
        traitsN:0
      });
      if (parent.sex === 'f') child.motherId = parent.id;
      else child.fatherId = parent.id;
      parent.childrenIds.push(child.id);
      FB.touchFamily();
      FB.ui.showCharModal(child.id);
      return {
        childId:child.id,
        childName:child.name,
        turn:state.turn,
        gold:state.player.gold
      };
    });
    const characterMatch = page.locator(
      '[data-interaction-action="management.arranged-match"]');
    await expect(characterMatch).toContainText('Arrange a match');
    await expect(characterMatch).toBeEnabled();
    await characterMatch.click();
    await expect(page.getByRole('heading', {
      name:'A Match for ' + setup.childName,
      exact:true
    })).toBeVisible();
    const earlyProspects = await page.evaluate(function (childId) {
      const state = FB.state;
      return state.chars[childId].matchIds.map(function (id) {
        const candidate = state.chars[id];
        return {
          age:FB.ageOf(candidate, state.date.year),
          career:candidate.career || null
        };
      });
    }, setup.childId);
    expect(earlyProspects).toHaveLength(3);
    expect(earlyProspects.every(function (prospect) {
      return prospect.age >= 0 && prospect.age <= 5 && !prospect.career;
    })).toBe(true);

    const choice = page.locator('[data-match]').last();
    const partnerId = await choice.getAttribute('data-match');
    const dowry = await page.evaluate(function (id) {
      return Math.max(0, Number(FB.state.chars[id].dowryAsk) || 0);
    }, partnerId);
    expect(dowry).toBeGreaterThan(0);
    await choice.click();
    await expect(page.locator('#gm-title')).toContainText(setup.childName);
    await page.evaluate(function () { FB.ui.showHouseholdPlan(); });
    await expect(page.getByRole('heading', { name:/Household Plan/ }))
      .toBeVisible();
    const matchCell = page.locator(
      '[data-household-plan-action="match"]' +
      '[data-household-plan-cid="' + setup.childId + '"]');
    await expect(matchCell).toContainText('Betrothed');
    await expect(matchCell).toContainText(
      'Select to review, change, or end this pledge');

    await matchCell.click();
    await expect(page.locator('#match-betrothal-break')).toBeVisible();
    await page.locator('#match-betrothal-break').click();
    await expect(page.getByRole('heading', {
      name:'Break Betrothal', exact:true
    })).toBeVisible();
    await expect(page.getByText(/paid dowry.*will not be returned/i))
      .toBeVisible();
    await page.locator('#betrothal-break-confirm').click();
    await expect(page.getByRole('heading', { name:/Household Plan/ }))
      .toBeVisible();

    const ended = await page.evaluate(function (ids) {
      const state = FB.state;
      const child = state.chars[ids.childId];
      return {
        childBetrothedId:child.betrothedId,
        partnerStillTracked:!!state.chars[ids.partnerId],
        gold:state.player.gold,
        turn:state.turn,
        logged:state.log.some(function (entry) {
          return entry.msg &&
            entry.msg.key === 'news.event.kin_pledge_broken_forfeit';
        })
      };
    }, { childId:setup.childId, partnerId:partnerId });
    expect(ended).toEqual({
      childBetrothedId:null,
      partnerStillTracked:false,
      gold:setup.gold - dowry,
      turn:setup.turn + 1,
      logged:true
    });
    await expect(matchCell).toContainText('Arrange a match');
  });

test('Self can end an inherited betrothal without spending a day',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const partner = FB.makeCharacter(state, {
        name:'Inherited Pledge',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:me.religion,
        born:me.born,
        role:'kinspouse',
        station:FB.stationOf(me),
        traitsN:0
      });
      me.spouseId = null;
      partner.spouseId = null;
      me.betrothedId = partner.id;
      partner.betrothedId = me.id;
      partner.dowryAsk = 23;
      FB.touchFamily();
      FB.ui.showTab('char', { history:false });
      return {
        meId:me.id,
        partnerId:partner.id,
        turn:state.turn,
        gold:state.player.gold
      };
    });
    await expect(page.locator('#self-betrothed-person'))
      .toContainText('Inherited Pledge');
    await expect(page.locator('#self-break-betrothal')).toBeVisible();
    await page.locator('#self-break-betrothal').click();
    await expect(page.getByRole('heading', {
      name:'Break Betrothal', exact:true
    })).toBeVisible();
    await expect(page.getByText(/paid dowry.*will not be returned/i))
      .toBeVisible();
    await page.locator('#betrothal-break-confirm').click();
    await expect(page.locator('#self-break-betrothal')).toHaveCount(0);
    const ended = await page.evaluate(function (ids) {
      const state = FB.state;
      return {
        playerBetrothedId:state.chars[ids.meId].betrothedId,
        partnerStillTracked:!!state.chars[ids.partnerId],
        turn:state.turn,
        gold:state.player.gold
      };
    }, setup);
    expect(ended).toEqual({
      playerBetrothedId:null,
      partnerStillTracked:false,
      turn:setup.turn,
      gold:setup.gold
    });
  });

test('a managed sibling can expose and end an accepted household pledge',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const sibling = FB.makeCharacter(state, {
        name:'Resident Sibling',
        sex:'f',
        culture:me.culture,
        religion:me.religion,
        born:state.date.year - 18,
        role:'sibling',
        dyn:me.dyn,
        fatherId:me.fatherId,
        motherId:me.motherId,
        station:0,
        traitsN:0
      });
      sibling.homeProvinceId = state.player.provinceId;
      sibling.residenceProvinceId = state.player.provinceId;
      const partner = FB.makeCharacter(state, {
        name:'Sibling Pledge',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:state.date.year - 18,
        role:'kinspouse',
        station:0,
        traitsN:0
      });
      sibling.betrothedId = partner.id;
      partner.betrothedId = sibling.id;
      FB.touchFamily();
      const manageable = FB.manageableKinKind(state, sibling.id);
      FB.ui.showCharModal(sibling.id);
      return {
        siblingId:sibling.id,
        partnerId:partner.id,
        manageable:manageable,
        turn:state.turn
      };
    });
    expect(setup.manageable).toBe('sibling');
    const release = page.locator(
      '[data-interaction-action="management.break-betrothal"]');
    await expect(release).toBeVisible();
    await page.evaluate(function () { FB.ui.showHouseholdPlan(); });
    const planRelease = page.locator(
      '[data-household-plan-action="break-betrothal"]' +
      '[data-household-plan-cid="' + setup.siblingId + '"]');
    await expect(planRelease).toContainText('Select to end this pledge');
    await planRelease.click();
    await page.locator('#betrothal-break-confirm').click();
    await expect(page.getByRole('heading', { name:/Household Plan/ }))
      .toBeVisible();
    await expect(planRelease).toHaveCount(0);
    const ended = await page.evaluate(function (ids) {
      const state = FB.state;
      return {
        siblingBetrothedId:state.chars[ids.siblingId].betrothedId,
        partnerStillTracked:!!state.chars[ids.partnerId],
        turn:state.turn
      };
    }, setup);
    expect(ended).toEqual({
      siblingBetrothedId:null,
      partnerStillTracked:false,
      turn:setup.turn
    });
  });

test('descendant search clocks survive restore and legacy pools refresh immediately',
  async function ({ page }) {
    const family = await addEligibleDescendant(page);
    const result = await page.evaluate(function (childId) {
      let state = FB.state;
      let child = state.chars[childId];
      const initialTurn = child.matchSearchTurn;
      const initialIds = child.matchIds.slice();
      const blockedRefresh = FB.refreshMatchCandidates(state, child);
      const blockedStable = child.matchIds.every(function (id, index) {
        return id === initialIds[index];
      });
      const unavailableId = child.matchIds[0];
      state.chars[unavailableId].dead = true;
      const repaired = FB.spawnMatchCandidates(state, child);
      const automaticTurn = child.matchSearchTurn;
      state.turn += 10;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      state = FB.state;
      child = state.chars[childId];
      const restoredTurn = child.matchSearchTurn;
      const restoredStatus = FB.matchCandidateRefreshStatus(state, child);
      delete child.matchSearchTurn;
      const legacyStatus = FB.matchCandidateRefreshStatus(state, child);
      const oldIds = child.matchIds.slice();
      const before = {
        turn:state.turn,
        gold:state.player.gold,
        prestige:state.player.prestige
      };
      const refreshed = FB.refreshMatchCandidates(state, child);
      return {
        initialTurn:initialTurn,
        blocked:blockedRefresh === null,
        blockedStable:blockedStable,
        automaticTurn:automaticTurn,
        repairedCount:repaired.length,
        restoredTurn:restoredTurn,
        restoredStatus:restoredStatus,
        legacyStatus:legacyStatus,
        refreshedCount:refreshed && refreshed.length,
        replaced:refreshed && refreshed.every(function (candidate) {
          return oldIds.indexOf(candidate.id) < 0;
        }),
        oldRecords:oldIds.filter(function (id) { return !!state.chars[id]; }),
        searchTurn:child.matchSearchTurn,
        afterStatus:FB.matchCandidateRefreshStatus(state, child),
        costs:{
          turn:state.turn,
          gold:state.player.gold,
          prestige:state.player.prestige
        },
        before:before
      };
    }, family.childId);

    expect(result.initialTurn).toBe(family.searchTurn);
    expect(result.blocked).toBe(true);
    expect(result.blockedStable).toBe(true);
    expect(result.automaticTurn).toBe(result.initialTurn);
    expect(result.repairedCount).toBe(3);
    expect(result.restoredTurn).toBe(result.initialTurn);
    expect(result.restoredStatus).toEqual({
      eligible:true,
      ready:false,
      daysRemaining:20
    });
    expect(result.legacyStatus).toEqual({
      eligible:true,
      ready:true,
      daysRemaining:0
    });
    expect(result.refreshedCount).toBe(3);
    expect(result.replaced).toBe(true);
    expect(result.oldRecords).toEqual([]);
    expect(result.searchTurn).toBe(family.searchTurn + 10);
    expect(result.afterStatus).toEqual({
      eligible:true,
      ready:false,
      daysRemaining:30
    });
    expect(result.costs).toEqual(result.before);
  });
