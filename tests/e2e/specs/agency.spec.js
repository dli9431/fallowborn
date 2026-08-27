'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/agency.js',
  'js/politics.js',
  'js/ui_modals.js',
  'data/events_agency.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startAgencyGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

test('ruler contact is gated by county distance, culture, and faith',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var home = s.player.provinceId;
      var distances = {};
      var queue = [home];
      var head = 0;
      distances[home] = 0;
      while (head < queue.length) {
        var pid = queue[head++];
        var adjacent = FB.world.adj[pid] || {};
        for (var next in adjacent) {
          if (distances[next] !== undefined) continue;
          distances[next] = distances[pid] + 1;
          queue.push(next);
        }
      }
      var ids = Object.keys(distances).sort(function (a, b) {
        return distances[b] - distances[a];
      });
      var far = ids[0];
      var near = Object.keys(FB.world.adj[home] || {})[0] || home;
      var affine = ids.filter(function (id) {
        return distances[id] >= 4 && distances[id] <= 8;
      })[0];
      var otherCulture = Object.keys(FBDATA.cultures).filter(function (id) {
        return id !== me.culture;
      })[0];
      var playerGroup = FB.religionOf(me.religion).group;
      var otherReligion = Object.keys(FBDATA.religions).filter(function (id) {
        return FB.religionOf(id).group !== playerGroup;
      })[0];
      function addRealm(id, capital) {
        s.realms[id] = {
          id:id, name:id, color:'#123456', capital:capital,
          rank:3, liege:null, alive:true, religion:otherReligion,
          ruler:{ name:id + ' ruler', sex:'m', culture:otherCulture,
            age:40, born:s.date.year - 40, mar:5, trait:'content',
            generation:1 }
        };
      }
      addRealm('agency_far', far);
      addRealm('agency_near', near);
      addRealm('agency_affine', affine);
      s.realms.agency_affine.religion = me.religion;
      s.realms.agency_affine.ruler.culture = me.culture;
      var farStatus = FB.rulerPlayerRelevance(s, 'agency_far');
      var nearStatus = FB.rulerPlayerRelevance(s, 'agency_near');
      var affineStatus = FB.rulerPlayerRelevance(s, 'agency_affine');

      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.liege = null;
      s.player.liege = null;
      s.realms.agency_far.liege = 'player';
      var insideStatus = FB.rulerPlayerRelevance(s, 'agency_far');
      delete s.agency.rebelSupport.agency_far;
      var baseBreakaway = FB.vassalBreakawayChance(s, 'agency_far');
      s.agency.rebelSupport.agency_far = {
        sponsorRid:'agency_near', expiresYear:s.date.year + 1,
        sponsorGeneration:s.realms.agency_near.ruler.generation,
        multiplier:1.75
      };
      var supportedBreakaway = FB.vassalBreakawayChance(s, 'agency_far');
      return {
        farDistance:farStatus.distance,
        farEligible:farStatus.eligible,
        farReason:farStatus.reason,
        nearDistance:nearStatus.distance,
        nearEligible:nearStatus.eligible,
        affineDistance:affineStatus.distance,
        affineEligible:affineStatus.eligible,
        insideEligible:insideStatus.eligible,
        insideRealm:insideStatus.inRealm,
        baseBreakaway:baseBreakaway,
        supportedBreakaway:supportedBreakaway
      };
    });

    expect(result.farDistance).toBeGreaterThan(3);
    expect(result.farEligible).toBe(false);
    expect(result.farReason).toBe('too_distant');
    expect(result.nearDistance).toBeLessThanOrEqual(1);
    expect(result.nearEligible).toBe(true);
    expect(result.affineDistance).toBeGreaterThan(3);
    expect(result.affineEligible).toBe(true);
    expect(result.insideEligible).toBe(true);
    expect(result.insideRealm).toBe(true);
    expect(result.supportedBreakaway).toBeGreaterThan(result.baseBreakaway);
  });

test('ruler regard uses the directional historical faith baselines',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      function addRealm(id, religion) {
        s.realms[id] = {
          id:id, name:id, color:'#123456', capital:s.player.provinceId,
          rank:3, liege:null, alive:true, religion:religion,
          ruler:{
            name:id + ' ruler', sex:'m', culture:'frankish',
            age:40, born:s.date.year - 40, mar:5, trait:'content',
            generation:1
          }
        };
      }
      addRealm('faith_regard_from', 'catholic');
      addRealm('faith_regard_same', 'catholic');
      addRealm('faith_regard_schism', 'orthodox');
      addRealm('faith_regard_foreign', 'sunni');
      var answer = {
        same:FB.rulerRegard(s, 'faith_regard_from', 'faith_regard_same'),
        schismatic:FB.rulerRegard(
          s, 'faith_regard_from', 'faith_regard_schism'),
        foreign:FB.rulerRegard(
          s, 'faith_regard_from', 'faith_regard_foreign')
      };
      FB.setFaithRelation(s, 'catholic', 'orthodox', 'hostile');
      answer.hostile = FB.rulerRegard(
        s, 'faith_regard_from', 'faith_regard_schism');
      return answer;
    });

    expect(result).toEqual({
      same:30,
      schismatic:20,
      foreign:5,
      hostile:-10
    });
  });

test('ruler aims and sparse regard survive restore and reset on succession',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var ids = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive &&
          s.realms[id].ruler;
      });
      var a = ids[0];
      var b = ids.filter(function (id) {
        return id !== a && s.realms[a].liege !== id;
      })[0];
      FB.ensureAgency(s);
      var first = FB.rulerAimSnapshot(s, a);
      var baseline = FB.rulerRegard(s, a, b);
      FB.adjustRulerRegard(s, a, b, 17, 'test:cultivation');
      var adjusted = FB.rulerRegard(s, a, b);
      var saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      var restored = FB.rulerRegard(FB.state, a, b);
      FB.state.realms[a].ruler.generation++;
      FB.ensureAgency(FB.state);
      var next = FB.rulerAimSnapshot(FB.state, a);
      var afterSuccession = FB.rulerRegard(FB.state, a, b);
      return {
        baseline:baseline,
        adjusted:adjusted,
        restored:restored,
        firstGeneration:first.generation,
        nextGeneration:next.generation,
        afterSuccession:afterSuccession,
        motionEffect:FB.rulerAimMotionValue(FB.state, a, 'redress'),
        relationCount:Object.keys(FB.state.agency.relations).length
      };
    });

    expect(result.adjusted).toBe(result.baseline + 17);
    expect(result.restored).toBe(result.adjusted);
    expect(result.nextGeneration).toBe(result.firstGeneration + 1);
    expect(result.afterSuccession).toBe(result.baseline);
    expect(Number.isFinite(result.motionEffect)).toBe(true);
    expect(result.relationCount).toBe(0);
  });

test('only managed family receive ambitions and family offices exclude enterprise work',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var child = FB.makeCharacter(s, {
        name:'Family Factor', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 24,
        dyn:me.dyn, fatherId:me.id, traitsN:0
      });
      me.childrenIds.push(child.id);
      FB.touchFamily();
      FB.setCareer(s, child, 'merchant', 'journeyman');
      var stranger = FB.makeCharacter(s, {
        name:'Unrelated Merchant', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 30,
        dyn:'Other House', traitsN:0
      });
      FB.setCareer(s, stranger, 'merchant', 'journeyman');
      s.player.tier = Math.max(2, s.player.tier);
      var merchantEnterprise = Object.keys(FBDATA.enterprises).filter(
        function (id) {
          return FBDATA.enterprises[id].profession === 'merchant';
        })[0];
      s.player.enterprises = [{
        uid:'agency_enterprise', type:merchantEnterprise,
        provinceId:s.player.provinceId, settlement:'market',
        workerId:child.id
      }];
      FB.ensureAgency(s);
      var ambition = FB.familyAmbitionSnapshot(s, child.id);
      var strangerAmbition = FB.familyAmbitionSnapshot(s, stranger.id);
      var appointed = FB.appointFamilyOffice(s, 'factor', child.id);
      var contributionKey = Object.keys(FBDATA.positions.factor.fx)[0];
      var contribution = FB.positionContributions(s, contributionKey).filter(
        function (row) {
          return row.kind === 'family-office' && row.charId === child.id;
        });
      return {
        childId:child.id,
        ambition:ambition && ambition.id,
        strangerAmbition:strangerAmbition,
        appointed:appointed,
        office:FB.familyOfficeRecord(s, child.id),
        enterpriseWorker:s.player.enterprises[0].workerId,
        contribution:contribution.length,
        retainerBlocked:FB.canHireRetainer(s, 'factor', null),
        strangerBlocked:FB.canAppointFamilyOffice(s, 'factor', stranger.id)
      };
    });

    expect(result.ambition).toBeTruthy();
    expect(result.strangerAmbition).toBeNull();
    expect(result.appointed).toBe(true);
    expect(result.office.office).toBe('factor');
    expect(result.enterpriseWorker).toBeNull();
    expect(result.contribution).toBe(1);
    expect(result.retainerBlocked).toBe(false);
    expect(result.strangerBlocked).toBe(false);
    await page.evaluate(function (cid) {
      FB.ui.showCharModal(cid);
    }, result.childId);
    await expect(page.locator('#gm-body')).toContainText('Personal ambition');
    await expect(page.locator('#gm-body')).toContainText('Guide their ambition');

    await page.evaluate(function (cid) {
      FB.ui.showFamilyAmbition(cid);
    }, result.childId);
    await expect(page.locator(
      '#gm-body > .gm-footer > #gm-cancel')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
    }).toBe('genmodal');

    await page.evaluate(function (cid) {
      FB.ui.showFamilyOffice(cid);
    }, result.childId);
    await expect(page.locator(
      '#gm-body > .gm-footer > #gm-cancel')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
    }).toBe('genmodal');
  });

test('AI royal offers hard-gate a lowborn sibling by station and prestige',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var homeNeighbor = Object.keys(FB.world.adj[s.player.provinceId] || {})[0] ||
        s.player.provinceId;
      var rid = Object.keys(s.realms).filter(function (id) {
        var realm = s.realms[id];
        return id !== 'player' && realm && realm.alive && realm.ruler &&
          FB.realmFamilySnapshot(s, id).some(function (member) {
            var c = member.charId && s.chars[member.charId];
            return c && !c.dead && FB.ageOf(c, s.date.year) >= 16 &&
              !(FB.papacyCelibateSnapshot &&
                FB.papacyCelibateSnapshot(s, c)) &&
              !FB.spousesSnapshot(s, c).length && !c.betrothedId;
          });
      })[0];
      var realm = s.realms[rid];
      realm.capital = homeNeighbor;
      realm.religion = me.religion;
      realm.ruler.culture = me.culture;
      var partner = FB.realmFamilySnapshot(s, rid).map(function (member) {
        return member.charId && s.chars[member.charId];
      }).filter(function (c) {
        return c && !c.dead && FB.ageOf(c, s.date.year) >= 16 &&
          !(FB.papacyCelibateSnapshot && FB.papacyCelibateSnapshot(s, c)) &&
          !FB.spousesSnapshot(s, c).length && !c.betrothedId;
      })[0];
      partner.religion = me.religion;
      partner.spouseId = null;
      partner.betrothedId = null;

      var parent = me.fatherId && s.chars[me.fatherId];
      if (!parent) {
        parent = FB.makeCharacter(s, {
          name:'Shared Parent', sex:'m', culture:me.culture,
          religion:me.religion, born:s.date.year - 48,
          dyn:me.dyn, traitsN:0
        });
        me.fatherId = parent.id;
      }
      parent.childrenIds = parent.childrenIds || [];
      if (parent.childrenIds.indexOf(me.id) < 0) parent.childrenIds.push(me.id);
      var sibling = FB.makeCharacter(s, {
        name:'Lowborn Sibling', sex:partner.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 20, dyn:me.dyn,
        fatherId:parent.id, role:'sibling', station:0, traitsN:0
      });
      sibling.homeProvinceId = s.player.provinceId;
      parent.childrenIds.push(sibling.id);
      FB.touchFamily();
      FB.ensureAgency(s);

      var terms = FB.marriageTerms(s, sibling, partner);
      var ctx = {
        realmId:rid, rulerGeneration:realm.ruler.generation,
        studentId:sibling.id, partnerId:partner.id,
        dowry:terms.amount, playerPays:terms.subjectPays ? 'yes' : 'no'
      };
      s.player.tier = 0;
      s.player.prestige = 999;
      var stationBlocked = FB.agencyMarriageOfferStatus(s, partner, sibling);
      var stationContext = FB.fns.agency_marriage_context_valid(s, ctx);
      s.eventQueue = [];
      for (var agencyRid in s.agency.rulerAims) {
        s.agency.rulerAims[agencyRid].id = 'secure_dynasty';
        delete s.agency.rulerAims[agencyRid].lastApproachYear;
      }
      delete s.agency.lastPlayerApproachYear;
      var originalChance = FB.chance;
      FB.chance = function () { return true; };
      FB.rulerAgencyYearly(s);
      FB.chance = originalChance;
      var queuedSerfMarriage = s.eventQueue.some(function (item) {
        return item.id === 'ruler_marriage_offer';
      });

      s.player.tier = 1;
      s.player.prestige = 999;
      var freemanBlocked = FB.agencyMarriageOfferStatus(s, partner, sibling);
      var freemanContext = FB.fns.agency_marriage_context_valid(s, ctx);
      s.eventQueue = [];
      for (agencyRid in s.agency.rulerAims) {
        delete s.agency.rulerAims[agencyRid].lastApproachYear;
      }
      delete s.agency.lastPlayerApproachYear;
      originalChance = FB.chance;
      FB.chance = function () { return true; };
      FB.rulerAgencyYearly(s);
      FB.chance = originalChance;
      var queuedFreemanMarriage = s.eventQueue.some(function (item) {
        return item.id === 'ruler_marriage_offer';
      });

      s.player.tier = FB.stationOf(partner) - 1;
      var prestigeNeed = FB.kinMatchPrestigeNeed(s, partner);
      s.player.prestige = prestigeNeed - 1;
      var prestigeBlocked = FB.agencyMarriageOfferStatus(s, partner, sibling);
      var prestigeContext = FB.fns.agency_marriage_context_valid(s, ctx);

      s.player.prestige = prestigeNeed;
      var ready = FB.agencyMarriageOfferStatus(s, partner, sibling);
      var readyContext = FB.fns.agency_marriage_context_valid(s, ctx);
      s.player.prestige = prestigeNeed - 1;
      var staleContext = FB.fns.agency_marriage_context_valid(s, ctx);
      return {
        manageable:FB.manageableKinKind(s, sibling.id),
        partnerStation:FB.stationOf(partner),
        stationReason:stationBlocked.reason,
        stationGap:stationBlocked.stationGap,
        stationContext:stationContext,
        queuedSerfMarriage:queuedSerfMarriage,
        freemanReason:freemanBlocked.reason,
        freemanGap:freemanBlocked.stationGap,
        freemanContext:freemanContext,
        queuedFreemanMarriage:queuedFreemanMarriage,
        prestigeReason:prestigeBlocked.reason,
        prestigeNeed:prestigeNeed,
        prestigeContext:prestigeContext,
        ready:ready.ready,
        readyContext:readyContext,
        staleContext:staleContext
      };
    });

    expect(result.manageable).toBe('sibling');
    expect(result.partnerStation).toBeGreaterThanOrEqual(3);
    expect(result.stationReason).toBe('station');
    expect(result.stationGap).toBeGreaterThanOrEqual(3);
    expect(result.stationContext).toBe(false);
    expect(result.queuedSerfMarriage).toBe(false);
    expect(result.freemanReason).toBe('station');
    expect(result.freemanGap).toBeGreaterThanOrEqual(2);
    expect(result.freemanContext).toBe(false);
    expect(result.queuedFreemanMarriage).toBe(false);
    expect(result.prestigeReason).toBe('prestige');
    expect(result.prestigeNeed).toBe(20);
    expect(result.prestigeContext).toBe(false);
    expect(result.ready).toBe(true);
    expect(result.readyContext).toBe(true);
    expect(result.staleContext).toBe(false);
  });

test('a royal family sheet arranges an exact match with a managed descendant',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const setup = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var rid = Object.keys(s.realms).filter(function (id) {
        var realm = s.realms[id];
        return id !== 'player' && realm && realm.alive && realm.ruler &&
          FB.realmFamilySnapshot(s, id).some(function (member) {
            var c = member.charId && s.chars[member.charId];
            return c && !c.dead && FB.ageOf(c, s.date.year) >= 12 &&
              !(FB.isReigningRealmRuler &&
                FB.isReigningRealmRuler(s, c)) &&
              !FB.spousesSnapshot(s, c).length && !c.betrothedId &&
              !(FB.papacyCelibateSnapshot &&
                FB.papacyCelibateSnapshot(s, c));
          });
      })[0];
      var realm = s.realms[rid];
      var partner = FB.realmFamilySnapshot(s, rid).map(function (member) {
        return member.charId && s.chars[member.charId];
      }).filter(function (c) {
        return c && !c.dead && FB.ageOf(c, s.date.year) >= 12 &&
          !(FB.isReigningRealmRuler && FB.isReigningRealmRuler(s, c)) &&
          !FB.spousesSnapshot(s, c).length && !c.betrothedId &&
          !(FB.papacyCelibateSnapshot &&
            FB.papacyCelibateSnapshot(s, c));
      })[0];
      p.tier = 4;
      p.liege = rid;
      p.prestige = 500;
      p.gold = 500;
      partner.religion = me.religion;
      partner.spouseId = null;
      partner.betrothedId = null;
      var child = FB.makeCharacter(s, {
        name:'Negotiated Child',
        sex:partner.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:me.religion,
        born:s.date.year - 14,
        dyn:me.dyn,
        fatherId:me.id,
        station:4,
        traitsN:0
      });
      child.homeProvinceId = p.provinceId;
      child.betrothedId = null;
      me.childrenIds = me.childrenIds || [];
      me.childrenIds.push(child.id);
      FB.touchFamily();
      FB.ensureAgency(s);
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();
      var status = FB.royalKinMatchStatus(s, child, partner);
      var model = FB.ui.characterInteractionCard(s, partner.id);
      var action = model.actions.filter(function (item) {
        return item.id === 'relationship.royal-family-match';
      })[0];
      return {
        rid:rid,
        partnerId:partner.id,
        childId:child.id,
        ready:status.ready,
        reason:status.reason,
        dowry:status.terms.amount,
        playerPays:status.terms.subjectPays,
        actionEnabled:action && action.enabled
      };
    });

    expect(setup.ready, setup.reason).toBe(true);
    expect(setup.actionEnabled).toBe(true);
    await page.evaluate(function (partnerId) {
      FB.ui.showCharModal(partnerId);
    }, setup.partnerId);
    const arrange = page.locator(
      '[data-interaction-action="relationship.royal-family-match"]');
    await expect(arrange).toBeVisible();
    await arrange.click();
    const candidate = page.locator(
      '[data-royal-kin-match="' + setup.childId + '"]');
    await expect(candidate).toBeEnabled();
    await expect(page.locator('#gm-title')).toContainText('Marriage to');

    await page.evaluate(function () {
      var originalChance = FB.chance;
      FB.chance = function () {
        FB.chance = originalChance;
        return false;
      };
    });
    await candidate.click();
    const refused = await page.evaluate(function (ids) {
      var child = FB.state.chars[ids.childId];
      var partner = FB.state.chars[ids.partnerId];
      return {
        childBetrothed:child.betrothedId,
        partnerBetrothed:partner.betrothedId,
        refused:partner.royalMatchRefusals.indexOf(child.id) >= 0,
        status:FB.royalKinMatchStatus(FB.state, child, partner).reasonCode
      };
    }, setup);
    expect(refused).toEqual({
      childBetrothed:null,
      partnerBetrothed:null,
      refused:true,
      status:'refused'
    });

    await page.evaluate(function (ids) {
      var partner = FB.state.chars[ids.partnerId];
      partner.royalMatchRefusals = [];
      var originalChance = FB.chance;
      FB.chance = function () {
        FB.chance = originalChance;
        return true;
      };
      FB.ui.showCharModal(ids.partnerId);
    }, setup);
    await page.locator(
      '[data-interaction-action="relationship.royal-family-match"]').click();
    await page.locator(
      '[data-royal-kin-match="' + setup.childId + '"]').click();
    const accepted = await page.evaluate(function (ids) {
      var child = FB.state.chars[ids.childId];
      var partner = FB.state.chars[ids.partnerId];
      return {
        childBetrothed:child.betrothedId,
        partnerBetrothed:partner.betrothedId,
        gold:FB.state.player.gold
      };
    }, setup);
    expect(accepted.childBetrothed).toBe(setup.partnerId);
    expect(accepted.partnerBetrothed).toBe(setup.childId);
    expect(accepted.gold).toBe(setup.playerPays
      ? 500 - setup.dowry : 500);
  });

test('AI royal offers revalidate exact managed kin, ruler generation, and dowry',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var homeNeighbor = Object.keys(FB.world.adj[s.player.provinceId] || {})[0] ||
        s.player.provinceId;
      var rid = Object.keys(s.realms).filter(function (id) {
        var realm = s.realms[id];
        return id !== 'player' && realm && realm.alive && realm.ruler &&
          FB.realmFamilySnapshot(s, id).some(function (member) {
            var c = member.charId && s.chars[member.charId];
            return c && !c.dead && FB.ageOf(c, s.date.year) >= 16 &&
              !(FB.papacyCelibateSnapshot &&
                FB.papacyCelibateSnapshot(s, c)) &&
              !FB.spousesSnapshot(s, c).length && !c.betrothedId;
          });
      })[0];
      var realm = s.realms[rid];
      realm.capital = homeNeighbor;
      realm.religion = me.religion;
      realm.ruler.culture = me.culture;
      var partner = FB.realmFamilySnapshot(s, rid).map(function (member) {
        return member.charId && s.chars[member.charId];
      }).filter(function (c) {
        return c && !c.dead && FB.ageOf(c, s.date.year) >= 16 &&
          !(FB.papacyCelibateSnapshot && FB.papacyCelibateSnapshot(s, c)) &&
          !FB.spousesSnapshot(s, c).length && !c.betrothedId;
      })[0];
      partner.religion = me.religion;
      partner.spouseId = null;
      partner.betrothedId = null;
      var child = FB.makeCharacter(s, {
        name:'Proposed Kin', sex:partner.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 20, dyn:me.dyn,
        fatherId:me.id, traitsN:0
      });
      me.childrenIds.push(child.id);
      FB.touchFamily();
      FB.ensureAgency(s);
      var terms = FB.marriageTerms(s, child, partner);
      var ctx = {
        realmId:rid, rulerGeneration:realm.ruler.generation,
        studentId:child.id, partnerId:partner.id,
        dowry:terms.amount, playerPays:terms.subjectPays ? 'yes' : 'no'
      };
      s.player.gold = 500;
      s.player.tier = FB.stationOf(partner) - 1;
      s.player.prestige = FB.kinMatchPrestigeNeed(s, partner);
      var valid = FB.fns.agency_marriage_context_valid(s, ctx);
      var stale = {};
      for (var key in ctx) stale[key] = ctx[key];
      stale.rulerGeneration++;
      var staleBeforeAcceptance =
        FB.fns.agency_marriage_context_valid(s, stale);
      var expectedGold = 500 + terms.playerDelta;
      var accepted = FB.fns.agency_marriage_accept(s, ctx);
      return {
        valid:valid,
        accepted:accepted,
        spouse:child.spouseId,
        partner:partner.id,
        staleValid:staleBeforeAcceptance,
        gold:s.player.gold,
        expectedGold:expectedGold,
        familyOnly:FB.isAgencyFamilyMember(s, child.id)
      };
    });

    expect(result.valid).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.spouse).toBe(result.partner);
    expect(result.staleValid).toBe(false);
    expect(result.gold).toBe(result.expectedGold);
    expect(result.familyOnly).toBe(false);
  });

test('the annual agency pass caps player approaches and family requests',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var child = FB.makeCharacter(s, {
        name:'Requesting Kin', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year - 18,
        dyn:me.dyn, fatherId:me.id, traitsN:0
      });
      me.childrenIds.push(child.id);
      FB.touchFamily();
      var rid = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive &&
          s.realms[id].ruler;
      })[0];
      var realm = s.realms[rid];
      realm.capital = Object.keys(FB.world.adj[s.player.provinceId] || {})[0] ||
        s.player.provinceId;
      realm.religion = me.religion;
      realm.ruler.culture = me.culture;
      s.eventQueue = [];
      FB.ensureAgency(s);
      var originalChance = FB.chance;
      FB.chance = function () { return true; };
      FB.rulerAgencyYearly(s);
      FB.rulerAgencyYearly(s);
      FB.chance = originalChance;
      var approaches = s.eventQueue.filter(function (item) {
        return item.id === 'ruler_overture' ||
          item.id === 'ruler_marriage_offer';
      });
      var family = s.eventQueue.filter(function (item) {
        return item.id === 'family_ambition_request';
      });
      return {
        approaches:approaches.length,
        family:family.length,
        approachYear:s.agency.lastPlayerApproachYear,
        familyYear:s.agency.lastFamilyRequestYear,
        currentYear:s.date.year
      };
    });

    expect(result.approaches).toBe(1);
    expect(result.family).toBe(1);
    expect(result.approachYear).toBe(result.currentYear);
    expect(result.familyYear).toBe(result.currentYear);
  });

test('annual ruler intrigue obeys weighting, cadence, caps, cooldowns, and lethal warnings',
  async function ({ page }, testInfo) {
    await startAgencyGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var intrigue = FB.ensureIntrigue(s);
      intrigue.aiSchemes = [];
      intrigue.cooldowns = {};
      intrigue.startYear = null;
      intrigue.startsThisYear = 0;
      intrigue.playerFacingStartsThisYear = 0;
      FB.ensureAgency(s);
      s.agency.rulerAims = s.agency.rulerAims || {};
      var topIds = Object.keys(s.realms).filter(function (id) {
        var realm = s.realms[id];
        return id !== 'player' && realm && realm.alive && !realm.liege;
      });
      var actors = [];
      var favored = {};
      for (var i = 0; i < topIds.length; i++) {
        var rid = topIds[i];
        var actor = FB.materializeRealmRuler(s, rid);
        if (!actor) continue;
        var capital = s.realms[rid].capital;
        var place = FB.world.byId[capital];
        var target = FB.makeCharacter(s, {
          name:'Court Intrigue Target ' + i,
          sex:i % 2 ? 'f' : 'm',
          culture:place.culture, religion:place.religion,
          born:s.date.year - 30, station:2, traitsN:0
        });
        target.homeProvinceId = capital;
        actor.traits = ['kind', 'honest'];
        s.agency.rulerAims[rid] = { id:'keep_peace' };
        actors.push({ rid:rid, id:actor.id });
      }
      for (i = 0; i < Math.min(3, actors.length); i++) {
        s.chars[actors[i].id].traits = ['cruel'];
        s.agency.rulerAims[actors[i].rid] = { id:'expand_realm' };
        favored[actors[i].id] = 1;
      }
      var year = s.date.year;
      var originalChance = FB.chance;
      FB.chance = function () { return true; };
      FB.intrigueAgencyYearly(s);
      var firstCount = intrigue.aiSchemes.length;
      var firstIds = intrigue.aiSchemes.map(function (scheme) {
        return scheme.actorId;
      });
      var firstPlayerFacing = intrigue.playerFacingStartsThisYear;
      FB.intrigueAgencyYearly(s);
      var repeatedCount = intrigue.aiSchemes.length;

      for (i = 0; i < actors.length; i++) {
        s.chars[actors[i].id].traits = ['cruel'];
        s.agency.rulerAims[actors[i].rid] = { id:'expand_realm' };
      }
      var growth = [];
      for (var offset = 1; offset <= 3; offset++) {
        s.date.year = year + offset;
        var before = intrigue.aiSchemes.length;
        FB.intrigueAgencyYearly(s);
        growth.push(intrigue.aiSchemes.length - before);
      }
      var maxCount = intrigue.aiSchemes.length;
      var activeActorIds = intrigue.aiSchemes.map(function (scheme) {
        return scheme.actorId;
      });
      var majorTargetIds = intrigue.aiSchemes.filter(function (scheme) {
        return scheme.schemeId === 'assassination' ||
          scheme.schemeId === 'abduction';
      }).map(function (scheme) { return scheme.context.characterId; });
      s.date.year = year + 4;
      var beforeCap = intrigue.aiSchemes.length;
      FB.intrigueAgencyYearly(s);
      var afterCap = intrigue.aiSchemes.length;

      intrigue.aiSchemes = [];
      var playerSovereign = FB.playerRealmId(s);
      var warningRealm = playerSovereign !== 'player'
        ? playerSovereign : Object.keys(s.realms).filter(function (id) {
          return id !== 'player' && s.realms[id] && s.realms[id].alive &&
            FB.topRealm(s, id) === playerSovereign;
        })[0];
      var warningActor = FB.materializeRealmRuler(s, warningRealm);
      var playerOption = warningActor && FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination, warningActor.id, warningRealm).filter(
        function (option) {
          return option.characterId === s.player.charId;
        })[0];
      if (warningActor && playerOption) {
        intrigue.aiSchemes.push({
          recordId:'warning-test', schemeId:'assassination',
          actorId:warningActor.id, actorRealmId:warningRealm,
          actorGeneration:FB.realmRulerGeneration(s, warningRealm),
          context:playerOption.context, methodId:'forceful',
          power:FBDATA.plots.assassination.need,
          startedTurn:s.turn, accomplice:null,
          playerFacing:true, warningStatus:null
        });
      }
      s.eventQueue = [];
      var playerAliveBefore = !s.chars[s.player.charId].dead;
      FB.intrigueSeason(s);
      var warning = s.eventQueue.filter(function (entry) {
        return entry.id === 'intrigue_warning';
      });
      var warningPending = intrigue.aiSchemes.length === 1 &&
        intrigue.aiSchemes[0].warningStatus === 'pending';
      var deathCalls = 0;
      var originalDie = FB.game.die;
      FB.game.die = function () { deathCalls++; };
      if (warning.length) {
        FB.fns.intrigue_warning_ignore(s, warning[0].ctx);
        FB.intrigueSeason(s);
      }
      FB.game.die = originalDie;
      FB.chance = originalChance;
      return {
        actorCount:actors.length,
        firstCount:firstCount,
        repeatedCount:repeatedCount,
        favoredOnly:firstIds.every(function (id) { return !!favored[id]; }),
        firstPlayerFacing:firstPlayerFacing,
        cooldowns:firstIds.map(function (id) {
          return intrigue.cooldowns[id] - year;
        }),
        growth:growth,
        maxCount:maxCount,
        uniqueActors:activeActorIds.every(function (id, index) {
          return activeActorIds.indexOf(id) === index;
        }),
        uniqueMajorTargets:majorTargetIds.every(function (id, index) {
          return majorTargetIds.indexOf(id) === index;
        }),
        capGrowth:afterCap - beforeCap,
        warningPrepared:!!(warningActor && playerOption),
        warningCount:warning.length,
        warningPending:warningPending,
        deathCalls:deathCalls,
        resolvedAfterWarning:intrigue.aiSchemes.length === 0,
        playerStillAlive:playerAliveBefore &&
          !s.chars[s.player.charId].dead
      };
    });

    expect(result.actorCount).toBeGreaterThanOrEqual(6);
    expect(result.firstCount).toBe(2);
    expect(result.repeatedCount).toBe(2);
    expect(result.favoredOnly).toBe(true);
    expect(result.firstPlayerFacing).toBeLessThanOrEqual(1);
    expect(result.cooldowns).toEqual([4, 4]);
    expect(result.growth).toEqual([2, 2, 0]);
    expect(result.maxCount).toBe(6);
    expect(result.uniqueActors).toBe(true);
    expect(result.uniqueMajorTargets).toBe(true);
    expect(result.capGrowth).toBe(0);
    expect(result.warningPrepared).toBe(true);
    expect(result.warningCount).toBe(1);
    expect(result.warningPending).toBe(true);
    expect(result.deathCalls).toBe(1);
    expect(result.resolvedAfterWarning).toBe(true);
    expect(result.playerStillAlive).toBe(true);
  });
