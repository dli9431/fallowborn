'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

async function startPoliciesGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

/* Same synthetic-court pattern as politics.spec.js: a liege crown with three
   direct vassal houses and the player sworn in as a tier-4 lord. */
async function configurePolicies(page) {
  return page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var provinces = FB.world.provs.filter(function (province) {
      return !province.wasteland;
    });
    var countyIds = [];
    var home = FB.world.byId[p.provinceId];
    countyIds.push(home.id);
    for (var i = 0; i < provinces.length && countyIds.length < 12; i++) {
      if (countyIds.indexOf(provinces[i].id) < 0) {
        countyIds.push(provinces[i].id);
      }
    }
    var polityId = 'policies_liege';
    var alphaId = 'policies_alpha';
    var betaId = 'policies_beta';
    var gammaId = 'policies_gamma';
    var unrelatedId = 'policies_unrelated';
    var culture = me.culture;
    var religion = me.religion;

    function realm(id, name, rank, liege, capital, trait, favor) {
      s.realms[id] = {
        id:id,
        name:name,
        color:'#705435',
        capital:capital,
        aggression:0,
        rank:rank,
        liege:liege,
        alive:true,
        favor:favor,
        religion:religion,
        ruler:{
          name:name + ' Ruler',
          sex:'m',
          culture:culture,
          age:40,
          mar:6,
          trait:trait || 'ambitious',
          generation:1
        }
      };
    }

    FB.game.observe = false;
    p.dead = false;
    p.flags = p.flags || {};
    p.tier = 4;
    p.gold = 500;
    p.prestige = 500;
    p.liege = polityId;
    p.liegeOp = -60;
    p.liegeOps = {};
    p.provs = countyIds.slice(2, 4);
    p.provinceId = countyIds[2];
    p.travel = null;
    p.war = null;
    me.traits = ['ambitious'];
    me.skills.mar = 6;
    me.skills.dip = 7;

    realm(polityId, 'Test Crown', 3, null, countyIds[0],
      'ambitious', 0);
    realm(alphaId, 'Alpha March', 2, polityId, countyIds[4],
      'ambitious', -60);
    realm(betaId, 'Beta County', 1, polityId, countyIds[6],
      'content', -60);
    realm(gammaId, 'Gamma County', 1, polityId, countyIds[7],
      'ambitious', -60);
    realm(unrelatedId, 'Remote Crown', 3, null, countyIds[10],
      'content', 0);

    for (i = 0; i < countyIds.length; i++) {
      s.dev[countyIds[i]] = 5 + i;
    }
    function assign(index, owner, holder) {
      s.owner[countyIds[index]] = owner;
      s.holder[countyIds[index]] = holder;
    }
    assign(0, polityId, polityId);
    assign(1, polityId, polityId);
    assign(2, polityId, 'player');
    assign(3, polityId, 'player');
    assign(4, polityId, alphaId);
    assign(5, polityId, alphaId);
    assign(6, polityId, betaId);
    assign(7, polityId, gammaId);
    assign(8, polityId, alphaId);
    assign(9, polityId, alphaId);
    assign(10, unrelatedId, unrelatedId);
    assign(11, polityId, gammaId);

    FB.foundPlayerRealm(s);
    s.realms.player.rank = 1;
    s.realms.player.liege = polityId;
    s.realms.player.capital = countyIds[2];
    s.realms[polityId].obl = {
      aid:FBDATA.balance.parliamentAidBase || 0.25,
      scutage:false,
      lastMotion:null
    };
    s.eventQueue = (s.eventQueue || []).filter(function (item) {
      return !item || typeof item.id !== 'string' ||
        item.id.indexOf('parliament_') !== 0;
    });
    FB.ensureEconomy(s);
    FB.invalidateRealmCache();
    s.politics = null;
    FB.ensurePolitics(s);
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    return {
      polityId:polityId,
      unrelatedId:unrelatedId,
      countyIds:countyIds
    };
  });
}

test('the catalog drives availability, wartime gates, and per-family cooldowns',
  async function ({ page }, testInfo) {
    await startPoliciesGame(page, testInfo);
    var ids = await configurePolicies(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      var list = FB.policyList();
      var peacetime = {};
      list.forEach(function (entry) {
        peacetime[entry.id] = FB.parliamentMotionStatus(s, entry.id);
      });
      /* Begin redress (family 'aid'): once the campaign is withdrawn the
         family's yearly hearing is still spent, while 'service' stays open. */
      var beganRedress = FB.parliamentBeginMotion(s, 'redress');
      FB.parliamentWithdrawMotion(s);
      var redressAgain = FB.parliamentMotionStatus(s, 'redress');
      var afterWithdraw = redressAgain;
      var scutageAfter = FB.parliamentMotionStatus(s, 'scutage');
      /* Wartime opens the war family and the emergency subsidy; the
         emergency rule ignores the already-spent 'aid' family hearing. */
      s.realms[setup.polityId].war = { enemy:setup.unrelatedId };
      var wartime = {
        emergency:FB.parliamentMotionStatus(s, 'emergency_subsidy'),
        authorize:FB.parliamentMotionStatus(s, 'war_authorization'),
        condemn:FB.parliamentMotionStatus(s, 'war_condemnation')
      };
      var beganSubsidy = FB.parliamentBeginMotion(s, 'emergency_subsidy');
      var subsidyFamily = s.politics.pendingMotion
        ? s.politics.pendingMotion.family : null;
      FB.parliamentWithdrawMotion(s);
      delete s.realms[setup.polityId].war;
      var peaceAgain = FB.parliamentMotionStatus(s, 'emergency_subsidy');
      return {
        ids:list.map(function (entry) { return entry.id; }),
        peacetime:peacetime,
        beganRedress:beganRedress,
        redressAgain:redressAgain,
        afterWithdraw:afterWithdraw,
        scutageAfter:scutageAfter,
        wartime:wartime,
        beganSubsidy:beganSubsidy,
        subsidyFamily:subsidyFamily,
        peaceAgain:peaceAgain,
        motionYears:s.realms[setup.polityId].obl.motionYears,
        year:s.date.year
      };
    }, ids);

    expect(result.ids).toEqual([
      'redress', 'emergency_subsidy', 'scutage', 'levy_relief',
      'market_charter', 'local_custom', 'revocation_consent',
      'war_authorization', 'war_condemnation'
    ]);
    expect(result.peacetime.redress.ready).toBe(true);
    expect(result.peacetime.scutage.ready).toBe(true);
    expect(result.peacetime.levy_relief.ready).toBe(true);
    expect(result.peacetime.market_charter.ready).toBe(true);
    expect(result.peacetime.local_custom.ready).toBe(true);
    expect(result.peacetime.revocation_consent.ready).toBe(true);
    expect(result.peacetime.emergency_subsidy.ready).toBe(false);
    expect(result.peacetime.emergency_subsidy.reason).toContain('at war');
    expect(result.peacetime.war_authorization.ready).toBe(false);
    expect(result.peacetime.war_authorization.reason).toContain('no war');
    expect(result.peacetime.war_condemnation.ready).toBe(false);
    expect(result.beganRedress).toBe(true);
    expect(result.redressAgain.ready).toBe(false);
    expect(result.redressAgain.reason).toContain('aid');
    expect(result.afterWithdraw.ready).toBe(false);
    expect(result.scutageAfter.ready).toBe(true);
    expect(result.wartime.emergency.ready).toBe(true);
    expect(result.wartime.authorize.ready).toBe(true);
    expect(result.wartime.condemn.ready).toBe(true);
    expect(result.beganSubsidy).toBe(true);
    expect(result.subsidyFamily).toBe('aid');
    expect(result.peaceAgain.ready).toBe(false);
    expect(result.motionYears.aid).toBe(result.year);
    expect(result.motionYears.service).toBeUndefined();
  });

test('a catalog policy campaign lobbies, tallies, and applies its result event',
  async function ({ page }, testInfo) {
    await startPoliciesGame(page, testInfo);
    await configurePolicies(page);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var began = FB.parliamentBeginMotion(s, 'market_charter');
      var forecast = FB.politicalMotionForecast(s, 'market_charter');
      var target = forecast.blocs.filter(function (bloc) {
        return bloc.posture === 'undecided';
      })[0];
      var originalRng = FB.rng;
      var rolls = 0;
      FB.rng = function () {
        rolls++;
        return 0;
      };
      var lobby = target
        ? FB.parliamentLobbyMotion(s, target.id) : null;
      var called = FB.parliamentCallVote(s);
      FB.rng = originalRng;
      var pending = s.politics.pendingMotion;
      var queued = s.eventQueue.filter(function (item) {
        return item.id === 'parliament_market_charter_grant';
      });
      return {
        began:began,
        lobbyOk:lobby ? lobby.ok : null,
        rolls:rolls,
        support:called.supportInfluence,
        majority:called.majority,
        passed:pending.result.passed,
        queued:queued.length
      };
    });

    expect(result.began).toBe(true);
    expect(result.lobbyOk).toBe(true);
    expect(result.support).toBeGreaterThanOrEqual(result.majority);
    expect(result.passed).toBe(true);
    expect(result.queued).toBe(1);

    await page.evaluate(function () {
      var item = FB.state.eventQueue.pop();
      FB.ui.runEvents([item]);
    });
    await expect(page.locator('#eventmodal:not(.hidden)')).toBeVisible();
    await expect(page.locator('#ev-options .evopt')).toHaveCount(1);
    await page.locator('#ev-options .evopt').click();
    var applied = await page.evaluate(function () {
      var s = FB.state;
      return {
        chartered:FB.hasModifier(s, 'market_charter', s.player.provinceId),
        pending:s.politics.pendingMotion
      };
    });
    expect(applied.chartered).toBe(true);
    expect(applied.pending).toBeNull();

    /* Once the charter is in force, the policy's gate closes with its exact
       reason. */
    var regated = await page.evaluate(function () {
      return FB.parliamentMotionStatus(FB.state, 'market_charter');
    });
    expect(regated.ready).toBe(false);
    expect(regated.reason).toContain('market charter');
  });

test('levy relief trades one aid step for a county exemption',
  async function ({ page }, testInfo) {
    await startPoliciesGame(page, testInfo);
    await configurePolicies(page);
    var before = await page.evaluate(function () {
      var s = FB.state;
      FB.parliamentBeginMotion(s, 'levy_relief');
      var forecast = FB.politicalMotionForecast(s, 'levy_relief');
      for (var i = 0; i < forecast.blocs.length; i++) {
        s.politics.pendingMotion.pledges[forecast.blocs[i].id] = 'support';
      }
      FB.parliamentCallVote(s);
      return { aid:s.realms[s.player.liege].obl.aid };
    });
    await page.evaluate(function () {
      var item = FB.state.eventQueue.pop();
      FB.ui.runEvents([item]);
    });
    await expect(page.locator('#eventmodal:not(.hidden)')).toBeVisible();
    await page.locator('#ev-options .evopt').click();
    var after = await page.evaluate(function () {
      var s = FB.state;
      return {
        aid:s.realms[s.player.liege].obl.aid,
        exempt:FB.hasModifier(s, 'levy_exemption', s.player.provinceId),
        pending:s.politics.pendingMotion,
        step:FBDATA.balance.parliamentAidStep || 0.05
      };
    });
    expect(after.exempt).toBe(true);
    expect(after.aid).toBeCloseTo(before.aid + after.step, 5);
    expect(after.pending).toBeNull();
  });

test('revocation consent removes the unilateral aid demand from the agenda',
  async function ({ page }, testInfo) {
    await startPoliciesGame(page, testInfo);
    await configurePolicies(page);
    var before = await page.evaluate(function () {
      var s = FB.state;
      var candidates = FB.parliamentSessionCandidates(s);
      FB.parliamentBeginMotion(s, 'revocation_consent');
      var forecast = FB.politicalMotionForecast(s, 'revocation_consent');
      for (var i = 0; i < forecast.blocs.length; i++) {
        s.politics.pendingMotion.pledges[forecast.blocs[i].id] = 'support';
      }
      FB.parliamentCallVote(s);
      return { candidates:candidates };
    });
    expect(before.candidates).toContain('parliament_aid_hike');
    await page.evaluate(function () {
      var item = FB.state.eventQueue.pop();
      FB.ui.runEvents([item]);
    });
    await expect(page.locator('#eventmodal:not(.hidden)')).toBeVisible();
    await page.locator('#ev-options .evopt').click();
    var after = await page.evaluate(function () {
      var s = FB.state;
      return {
        consent:FB.parliamentTerms(s).revocationConsent,
        candidates:FB.parliamentSessionCandidates(s),
        pending:s.politics.pendingMotion,
        gated:FB.parliamentMotionStatus(s, 'revocation_consent')
      };
    });
    expect(after.consent).toBe(true);
    expect(after.candidates).not.toContain('parliament_aid_hike');
    expect(after.candidates).toContain('parliament_session');
    expect(after.pending).toBeNull();
    expect(after.gated.ready).toBe(false);
    expect(after.gated.reason).toContain('consent');
  });

test('visible and autoresolved catalog policy outcomes match',
  async function ({ page }, testInfo) {
    await startPoliciesGame(page, testInfo);
    await configurePolicies(page);
    var setup = await page.evaluate(function () {
      var s = FB.state;
      FB.parliamentBeginMotion(s, 'local_custom');
      var forecast = FB.politicalMotionForecast(s, 'local_custom');
      for (var i = 0; i < forecast.blocs.length; i++) {
        s.politics.pendingMotion.pledges[forecast.blocs[i].id] = 'support';
      }
      FB.parliamentCallVote(s);
      var event = FB.eventById('parliament_local_custom');
      return {
        payload:JSON.parse(FB.save.serialize()),
        optionChance:event.options.some(function (option) {
          return option.chance !== undefined;
        }),
        validOptions:event.options.filter(function (option) {
          return !option.require || FB.checkTrigger(
            s, option.require, s.eventQueue[s.eventQueue.length - 1].ctx);
        }).length
      };
    });

    expect(setup.optionChance).toBe(false);
    expect(setup.validOptions).toBe(1);
    await page.evaluate(function () {
      var item = FB.state.eventQueue.pop();
      FB.ui.runEvents([item]);
    });
    await expect(page.locator('#eventmodal:not(.hidden)')).toBeVisible();
    await expect(page.locator('#ev-options .evopt')).toHaveCount(1);
    await page.locator('#ev-options .evopt').click();
    var visible = await page.evaluate(function () {
      var s = FB.state;
      var pid = s.player.provinceId;
      return {
        prestige:s.player.prestige,
        modifiers:FB.countyModifierRecords(s, pid).map(
          function (record) { return record.id; }).sort(),
        pending:s.politics.pendingMotion
      };
    });

    var automated = await page.evaluate(function (payload) {
      FB.save.restore(JSON.parse(JSON.stringify(payload)));
      FB.game.auto = FB.game.auto || {};
      FB.game.auto.all = true;
      FB.game.auto.style = 'first';
      var item = FB.state.eventQueue.pop();
      FB.ui.runEvents([item]);
      var s = FB.state;
      var pid = s.player.provinceId;
      return {
        prestige:s.player.prestige,
        modifiers:FB.countyModifierRecords(s, pid).map(
          function (record) { return record.id; }).sort(),
        pending:s.politics.pendingMotion
      };
    }, setup.payload);

    expect(automated).toEqual(visible);
    expect(visible.pending).toBeNull();
    expect(visible.modifiers).toContain('custom_confirmed');
  });

test('old saves heal per-family cooldowns and politics state',
  async function ({ page }, testInfo) {
    await startPoliciesGame(page, testInfo);
    await configurePolicies(page);
    var result = await page.evaluate(function () {
      var s = FB.state;
      FB.parliamentBeginMotion(s, 'redress');
      FB.parliamentWithdrawMotion(s);
      var payload = JSON.parse(FB.save.serialize());
      /* Legacy shape: only the single yearly lastMotion stamp, no
         motionYears, no politics blob. */
      delete payload.state.realms[s.player.liege].obl.motionYears;
      delete payload.state.politics;
      FB.save.restore(JSON.parse(JSON.stringify(payload)));
      s = FB.state;
      var terms = FB.parliamentTerms(s);
      return {
        motionYears:terms.motionYears,
        year:s.date.year,
        redress:FB.parliamentMotionStatus(s, 'redress'),
        scutage:FB.parliamentMotionStatus(s, 'scutage'),
        polityId:s.politics.polityId,
        allegiances:Object.keys(s.politics.allegiances).length
      };
    });

    expect(result.motionYears.aid).toBe(result.year);
    expect(result.motionYears.service).toBe(result.year);
    expect(result.motionYears.commerce).toBe(result.year);
    expect(result.motionYears.custom).toBe(result.year);
    expect(result.motionYears.war).toBe(result.year);
    expect(result.redress.ready).toBe(false);
    expect(result.scutage.ready).toBe(false);
    expect(result.polityId).toBe('policies_liege');
    expect(result.allegiances).toBeGreaterThan(0);
  });

test('the Estates sheet lists the catalog and consumes no state or RNG',
  async function ({ page }, testInfo) {
    await startPoliciesGame(page, testInfo);
    await configurePolicies(page);
    var before = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState()
      };
    });
    await page.evaluate(function () {
      FB.ui.showParliament();
    });
    await expect(page.locator('[data-motion="redress"]')).toBeVisible();
    await expect(page.locator('[data-motion="scutage"]')).toBeVisible();
    await expect(page.locator('[data-motion="market_charter"]')).toBeVisible();
    await expect(page.locator(
      '[data-motion="war_authorization"]')).toBeDisabled();
    await expect(page.locator(
      '[data-motion="war_condemnation"]')).toBeDisabled();
    await expect(page.locator(
      '[data-motion="emergency_subsidy"]')).toBeDisabled();
    var count = await page.locator('[data-motion]').count();
    expect(count).toBe(9);
    await page.locator('#gm-cancel').click();
    var after = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState()
      };
    });
    expect(after).toEqual(before);
  });
