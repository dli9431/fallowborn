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
      FB.runInstant(FB.state, 'seek_match');
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
      FB.runInstant(state, 'seek_match');
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
      FB.runInstant(state, 'seek_match');
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
