'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

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
