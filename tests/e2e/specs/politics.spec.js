'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/agency.js',
  'js/modifiers.js',
  'js/politics.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'css/style.css',
  'data/political_blocs.js',
  'data/political_institutions.js',
  'data/policies.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startPoliticsGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function configurePolitics(page) {
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
    var polityId = 'politics_liege';
    var alphaId = 'politics_alpha';
    var betaId = 'politics_beta';
    var gammaId = 'politics_gamma';
    var clientId = 'politics_alpha_client';
    var unrelatedId = 'politics_unrelated';
    var syntheticId = 'politics_synthetic';
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
    p.flags.guild_member = 1;
    p.tier = 4;
    p.gold = 500;
    p.prestige = 500;
    p.liege = polityId;
    p.liegeOp = 0;
    p.liegeOps = {};
    p.provs = countyIds.slice(2, 4);
    p.provinceId = countyIds[2];
    p.travel = null;
    p.war = null;
    me.traits = ['ambitious'];
    me.skills.mar = 6;
    me.skills.dip = 7;
    var career = FB.careerOf(s, me);
    career.profession = 'merchant';
    career.rank = 'master';
    career.guildRank = 'guildmaster';
    career.guildStanding = 100;
    p.profession = 'merchant';
    p.professionBack = null;
    p.enterprises = [];
    p.guildMonopolies = { incoming:null, outgoing:null };
    p.panelIntrosSeen = p.panelIntrosSeen || {};
    p.panelIntrosSeen.network = 1;

    realm(polityId, 'Test Crown', 3, null, countyIds[0],
      'ambitious', 0);
    realm(alphaId, 'Alpha March', 2, polityId, countyIds[4],
      'ambitious', -60);
    realm(betaId, 'Beta County', 1, polityId, countyIds[6],
      'ambitious', -60);
    s.realms[betaId].ruler.culture = Object.keys(FBDATA.cultures).filter(
      function (id) { return id !== culture; })[0] || culture;
    s.realms[betaId].religion = Object.keys(FBDATA.religions).filter(
      function (id) { return id !== religion; })[0] || religion;
    realm(gammaId, 'Gamma County', 1, polityId, countyIds[7],
      'ambitious', -60);
    realm(clientId, 'Alpha Client', 1, alphaId, countyIds[8],
      'content', -60);
    realm(unrelatedId, 'Remote Crown', 3, null, countyIds[10],
      'content', 0);
    FB.setRealmRulerStanding(s, polityId, 0);
    s.realms[syntheticId] = {
      id:syntheticId,
      name:'Empty Placeholder',
      color:'#333333',
      capital:countyIds[11],
      rank:1,
      liege:polityId,
      alive:true,
      religion:religion
    };

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
    assign(8, polityId, clientId);
    assign(9, polityId, clientId);
    assign(10, unrelatedId, unrelatedId);
    assign(11, polityId, syntheticId);

    FB.foundPlayerRealm(s);
    s.realms.player.rank = 1;
    s.realms.player.liege = polityId;
    s.realms.player.capital = countyIds[2];
    var technology = FB.realmTechRecord(s, polityId);
    [
      'scutage', 'urban_markets', 'authenticated_seals',
      'customary_law', 'representative_estates'
    ].forEach(function (techId) {
      if (technology.completed.indexOf(techId) < 0) {
        technology.completed.push(techId);
      }
      if (technology.exposed.indexOf(techId) < 0) {
        technology.exposed.push(techId);
      }
    });
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
    s.economy.investments = [];
    FB.enterpriseList(s);
    FB.invalidateRealmCache();
    /* This fixture exercises the base bloc and lobbying rules. Hold the new
       ruler-agency inputs neutral so an inherited grievance or aim cannot
       turn every bloc into committed support or opposition. */
    [polityId, alphaId, betaId, gammaId, clientId, unrelatedId].forEach(
      function (id) {
        s.agency.rulerAims[id] = {
          id:'secure_dynasty',
          generation:s.realms[id].ruler.generation,
          sinceYear:s.date.year
        };
      });
    s.politics = null;
    FB.ensurePolitics(s);
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    return {
      polityId:polityId,
      alphaId:alphaId,
      betaId:betaId,
      gammaId:gammaId,
      clientId:clientId,
      unrelatedId:unrelatedId,
      syntheticId:syntheticId,
      countyIds:countyIds
    };
  });
}

test('quiet landed days retain political court alignment until an input changes',
  async function ({ page }, testInfo) {
    await startPoliticsGame(page, testInfo);
    await configurePolitics(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const original = FB.politicalCourt;
      let calls = 0;
      FB.politicalCourt = function () {
        calls++;
        return original.apply(this, arguments);
      };
      for (let i = 0; i < 20; i++) {
        s.turn++;
        FB.politicsDay(s);
      }
      const quietCalls = calls;
      const court = original(s);
      const vassal = court.houses.filter(function (house) {
        return !house.isRuler && !house.isPlayer;
      })[0];
      FB.adjustRulerRegard(s, vassal.id, court.polityId, 5,
        'test:politics-cache');
      s.turn++;
      FB.politicsDay(s);
      FB.politicalCourt = original;
      return {
        quietCalls:quietCalls,
        changedCalls:calls
      };
    });

    expect(result.quietCalls).toBe(0);
    expect(result.changedCalls).toBeGreaterThan(result.quietCalls);
  });

test('direct-court scope, affiliation interests, and influence are authoritative',
  async function ({ page }, testInfo) {
    await startPoliticsGame(page, testInfo);
    var ids = await configurePolitics(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var before = JSON.stringify(s);
      var court = FB.politicalCourt(s);
      var summary = FB.politicalSummary(s);
      var redress = FB.politicalMotionForecast(s, 'redress');
      var redressPostures = {};
      for (var r = 0; r < redress.blocs.length; r++) {
        redressPostures[redress.blocs[r].id] = {
          score:redress.blocs[r].score,
          posture:redress.blocs[r].posture,
          chance:redress.blocs[r].naturalSupportChance
        };
      }
      var after = JSON.stringify(s);
      var affiliations = {};
      for (var i = 0; i < summary.blocs.length; i++) {
        for (var j = 0; j < summary.blocs[i].members.length; j++) {
          affiliations[summary.blocs[i].members[j].id] =
            summary.blocs[i].id;
        }
      }
      var influence = {};
      for (i = 0; i < court.houses.length; i++) {
        influence[court.houses[i].id] = {
          influence:court.houses[i].influence,
          rank:court.houses[i].rank,
          held:court.houses[i].directlyHeldCountyIds.length,
          territory:court.houses[i].territoryCountyIds.length,
          council:!!court.houses[i].councilSeatId
        };
      }

      var gamma = s.realms[setup.gammaId];
      var gammaCharacter = FB.realmRulerCharacterSnapshot(
        s, setup.gammaId);
      var gammaCulture = gamma.ruler.culture;
      var gammaReligion = gamma.religion;
      var gammaCharacterCulture = gammaCharacter && gammaCharacter.culture;
      var gammaCharacterReligion = gammaCharacter && gammaCharacter.religion;
      var betaCharacter = FB.realmRulerCharacterSnapshot(
        s, setup.betaId);
      var betaCulture = betaCharacter && betaCharacter.culture ||
        s.realms[setup.betaId].ruler.culture;
      var betaReligion = FB.realmReligionId(s, setup.betaId);
      var independentCulture = Object.keys(FBDATA.cultures).filter(
        function (id) {
          return id !== gammaCulture && id !== betaCulture;
        })[0];
      var gammaFaithGroup = FB.faithGroup(gammaReligion, s);
      var betaFaithGroup = FB.faithGroup(betaReligion, s);
      var independentReligion = FB.religionIds(s, true).filter(
        function (id) {
          var group = FB.faithGroup(id, s);
          return group !== gammaFaithGroup && group !== betaFaithGroup;
        })[0];
      gamma.ruler.culture = independentCulture;
      gamma.religion = independentReligion;
      if (gammaCharacter) {
        gammaCharacter.culture = independentCulture;
        gammaCharacter.religion = independentReligion;
      }
      s.politics = null;
      FB.ensurePolitics(s);
      var independentSummary = FB.politicalSummary(s);
      var independentAffiliation = null;
      for (i = 0; i < independentSummary.blocs.length; i++) {
        if (independentSummary.blocs[i].members.some(function (house) {
          return house.id === setup.gammaId;
        })) independentAffiliation = independentSummary.blocs[i].id;
      }
      gamma.ruler.culture = gammaCulture;
      gamma.religion = gammaReligion;
      if (gammaCharacter) {
        gammaCharacter.culture = gammaCharacterCulture;
        gammaCharacter.religion = gammaCharacterReligion;
      }
      s.politics = null;
      FB.ensurePolitics(s);

      var alphaTerritory = court.houses.filter(function (house) {
        return house.id === setup.alphaId;
      })[0].territoryCountyIds;
      for (i = 0; i < 3; i++) {
        FB.addModifier(s, 'market_charter', alphaTerritory[i], {
          silent:true,
          sourceEventId:'politics_test'
        });
      }
      s.politics = null;
      FB.ensurePolitics(s);
      var commercialSummary = FB.politicalSummary(s);
      var commercialAffiliation = null;
      for (i = 0; i < commercialSummary.blocs.length; i++) {
        if (commercialSummary.blocs[i].members.some(function (house) {
          return house.id === setup.alphaId;
        })) commercialAffiliation = commercialSummary.blocs[i].id;
      }

      for (i = 0; i < setup.countyIds.length; i++) {
        if (i !== 10) s.owner[setup.countyIds[i]] = 'player';
      }
      s.realms[setup.alphaId].liege = 'player';
      s.realms[setup.betaId].liege = 'player';
      s.realms[setup.gammaId].liege = 'player';
      s.realms[setup.syntheticId].liege = 'player';
      s.realms.player.liege = null;
      s.player.liege = null;
      s.player.tier = 6;
      s.realms.player.rank = 3;
      FB.setRealmRulerStanding(s, setup.alphaId, 40);
      s.council = {
        authority:50,
        seats:{
          seneschal:null,
          constable:null,
          treasurer:setup.alphaId,
          almoner:null,
          chamberlain:null
        }
      };
      FB.invalidateRealmCache();
      s.politics = null;
      FB.ensurePolitics(s);
      var crownCourt = FB.politicalCourt(s);
      var crownSummary = FB.politicalSummary(s);
      var crownAlpha = crownCourt.houses.filter(function (house) {
        return house.id === setup.alphaId;
      })[0];
      var crownAffiliation = null;
      for (i = 0; i < crownSummary.blocs.length; i++) {
        if (crownSummary.blocs[i].members.some(function (house) {
          return house.id === setup.alphaId;
        })) crownAffiliation = crownSummary.blocs[i].id;
      }
      return {
        readOnly:before === after,
        courtIds:court.houses.map(function (house) {
          return house.id;
        }),
        affiliations:affiliations,
        influence:influence,
        total:summary.totalInfluence,
        majority:summary.majority,
        redressTotal:redress.totalInfluence,
        redressMajority:redress.majority,
        redressPostures:redressPostures,
        independentAffiliation:independentAffiliation,
        commercialAffiliation:commercialAffiliation,
        crownOffice:crownAlpha.councilSeatId,
        crownInfluence:crownAlpha.influence,
        crownAffiliation:crownAffiliation
      };
    }, ids);

    expect(result.readOnly).toBe(true);
    expect(result.courtIds).toEqual([
      ids.polityId,
      ids.alphaId,
      ids.betaId,
      ids.gammaId,
      'player'
    ]);
    expect(result.courtIds).not.toContain(ids.clientId);
    expect(result.courtIds).not.toContain(ids.unrelatedId);
    expect(result.courtIds).not.toContain(ids.syntheticId);
    expect(result.affiliations[ids.polityId]).toBe('crown');
    expect(result.affiliations.player).toBe('mercantile');
    expect(result.affiliations[ids.alphaId]).toBe(
      'magnate:' + ids.alphaId);
    expect(result.affiliations[ids.betaId]).toBe(
      'magnate:' + ids.betaId);
    expect(result.affiliations[ids.gammaId]).toBe(
      'magnate:' + ids.alphaId);
    Object.keys(result.influence).forEach(function (id) {
      var item = result.influence[id];
      expect(item.influence).toBe(
        1 + item.rank * 2 + item.held +
        Math.floor((item.territory - item.held) / 2) +
        (item.council ? 1 : 0));
    });
    expect(result.influence[ids.polityId].influence).toBe(13);
    expect(result.influence[ids.alphaId].influence).toBe(8);
    expect(result.influence.player.influence).toBe(5);
    expect(result.total).toBe(34);
    expect(result.majority).toBe(18);
    expect(result.redressTotal).toBe(result.total);
    expect(result.redressMajority).toBe(result.majority);
    expect(result.redressPostures.crown).toEqual({
      score:-15,
      posture:'undecided',
      chance:0.35
    });
    expect(result.redressPostures.mercantile).toEqual({
      score:30,
      posture:'support',
      chance:0.8
    });
    /* Shared-faith ruler regard now contributes the historical relationship
       prior to this mixed magnate bloc's motion score. */
    expect(result.redressPostures['magnate:' + ids.alphaId].score)
      .toBe(23);
    expect(result.independentAffiliation).toBe(
      'independent:' + ids.gammaId);
    expect(result.commercialAffiliation).toBe('mercantile');
    expect(result.crownOffice).toBe('treasurer');
    expect(result.crownInfluence).toBe(9);
    expect(result.crownAffiliation).toBe('crown');
  });

test('institutional allegiance thresholds outrank stronger magnate affinity',
  async function ({ page }, testInfo) {
    await startPoliticsGame(page, testInfo);
    var ids = await configurePolitics(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var alphaProvince = setup.countyIds[4];
      var gammaProvinces = [
        setup.countyIds[7],
        setup.countyIds[8],
        setup.countyIds[9]
      ];
      for (var i = 0; i < gammaProvinces.length; i++) {
        s.holder[gammaProvinces[i]] = setup.gammaId;
        FB.addModifier(s, 'market_charter', gammaProvinces[i], {
          silent:true,
          sourceEventId:'politics_precedence_test'
        });
      }
      var gammaAdj = FB.world.adj[gammaProvinces[0]];
      var alphaAdj = FB.world.adj[alphaProvince];
      var oldGammaAdj = gammaAdj[alphaProvince];
      var oldAlphaAdj = alphaAdj[gammaProvinces[0]];
      gammaAdj[alphaProvince] = 1;
      alphaAdj[gammaProvinces[0]] = 1;
      FB.invalidateRealmCache();

      function affiliation(summary, houseId) {
        for (var b = 0; b < summary.blocs.length; b++) {
          if (summary.blocs[b].members.some(function (house) {
            return house.id === houseId;
          })) return summary.blocs[b].id;
        }
        return null;
      }

      s.politics = {
        polityId:setup.polityId,
        allegiances:{},
        pendingMotion:null
      };
      s.politics.allegiances[setup.alphaId] = {
        blocId:'magnate:' + setup.alphaId,
        reviewedYear:s.date.year
      };

      /* Gamma now has a 58-point affinity with Alpha: shared culture and
         faith, adjacent lands, and Alpha's ducal rank. Crown reaches only 37
         at +40 Standing, while three commercial counties give Mercantile 36.
         Both institutional results must therefore be precedence, not score. */
      s.realms[setup.gammaId].favor = 40;
      var crownAffiliation = affiliation(
        FB.politicalSummary(s), setup.gammaId);
      s.realms[setup.gammaId].favor = -60;
      var mercantileAffiliation = affiliation(
        FB.politicalSummary(s), setup.gammaId);

      if (oldGammaAdj === undefined) delete gammaAdj[alphaProvince];
      else gammaAdj[alphaProvince] = oldGammaAdj;
      if (oldAlphaAdj === undefined) delete alphaAdj[gammaProvinces[0]];
      else alphaAdj[gammaProvinces[0]] = oldAlphaAdj;
      return {
        crownAffiliation:crownAffiliation,
        mercantileAffiliation:mercantileAffiliation
      };
    }, ids);

    expect(result).toEqual({
      crownAffiliation:'crown',
      mercantileAffiliation:'mercantile'
    });
  });

test('annual allegiance review uses hysteresis and defers voluntary realignment',
  async function ({ page }, testInfo) {
    await startPoliticsGame(page, testInfo);
    var ids = await configurePolitics(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      var magnateId = 'magnate:' + setup.alphaId;
      s.politics.allegiances.player = {
        blocId:magnateId,
        reviewedYear:s.date.year - 1
      };
      FB.repairPolitics(s);
      var belowMargin = s.politics.allegiances.player.blocId;

      p.guildMonopolies.incoming = { id:'test_monopoly' };
      p.guildMonopolies.outgoing = { id:'test_grant' };
      s.date.year++;
      FB.repairPolitics(s);
      var aboveMargin = s.politics.allegiances.player.blocId;

      s.politics.allegiances.player = {
        blocId:magnateId,
        reviewedYear:s.date.year - 1
      };
      s.politics.pendingMotion = {
        id:'motion:test',
        motionId:'redress',
        polityId:setup.polityId,
        proposerHouseId:'player',
        startedTurn:s.turn,
        expiresTurn:s.turn + 90,
        locationId:p.provinceId,
        pledges:{},
        lobby:{ used:false, blocId:null, success:null },
        result:null
      };
      FB.repairPolitics(s);
      var whilePending = s.politics.allegiances.player.blocId;
      var reviewWhilePending =
        s.politics.allegiances.player.reviewedYear;
      s.politics.pendingMotion = null;
      FB.repairPolitics(s);
      var afterPending = s.politics.allegiances.player.blocId;

      s.politics.allegiances[setup.gammaId] = {
        blocId:'magnate:missing_house',
        reviewedYear:s.date.year
      };
      FB.repairPolitics(s);
      var invalidLeader = s.politics.allegiances[setup.gammaId].blocId;
      return {
        belowMargin:belowMargin,
        aboveMargin:aboveMargin,
        whilePending:whilePending,
        afterPending:afterPending,
        reviewWhilePending:reviewWhilePending,
        currentYear:s.date.year,
        invalidLeader:invalidLeader
      };
    }, ids);

    expect(result.belowMargin).toBe('magnate:' + ids.alphaId);
    expect(result.aboveMargin).toBe('mercantile');
    expect(result.whilePending).toBe('magnate:' + ids.alphaId);
    expect(result.reviewWhilePending).toBe(result.currentYear - 1);
    expect(result.afterPending).toBe('mercantile');
    expect(result.invalidLeader).not.toBe('magnate:missing_house');
  });

test('Network, Governance, and Estates share blocs without state or RNG drift',
  async function ({ page }, testInfo) {
    await startPoliticsGame(page, testInfo);
    await configurePolitics(page);
    await page.locator('.tab[data-tab="network"]').click();
    var networkBloc = page.locator('[data-network-political-bloc]').first();
    var networkBlocCard = networkBloc.locator('..');
    await expect(networkBloc).toBeVisible();
    await expect(networkBlocCard.locator('.large-list-state')).toHaveCount(0);
    await expect(networkBlocCard.locator('.settcard-details'))
      .toContainText('Established');
    await expect(networkBlocCard.locator('.settcard-details'))
      .toContainText('Leader:');
    await expect(networkBlocCard.locator('.settcard-details'))
      .toContainText('Members');
    await expect(networkBlocCard.locator('.settcard-details'))
      .toContainText('Key interests');
    var truncatedBlocCard = page.locator('.network-list-entry').filter({
      has:page.locator('.network-state-context-more')
    }).first();
    var truncatedBloc = truncatedBlocCard.locator(
      '[data-network-political-bloc]');
    await expect(truncatedBlocCard.locator(
      '.network-state-interest-preview'))
      .toHaveCount(3);
    await expect(truncatedBlocCard.locator('.network-state-context-more'))
      .toContainText('Open Governance for the full breakdown');
    await truncatedBloc.hover();
    await expect(page.locator('#tooltip')).toContainText('Key interests');
    await expect(page.locator('#tooltip'))
      .toContainText('Open Governance for the full breakdown');
    await page.locator('.tab[data-tab="actions"]').click();
    var before = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState()
      };
    });

    await page.locator('.tab[data-tab="network"]').click();
    var networkIds = await page.locator(
      '[data-network-political-bloc]').evaluateAll(function (nodes) {
        return nodes.map(function (node) {
          return node.dataset.networkPoliticalBloc;
        }).sort();
      });
    await expect(page.locator(
      '[data-network-political-bloc]').first()).toContainText(
        'Redress of the Aid:');
    await expect(page.locator(
      '[data-network-political-bloc]').first()).toContainText('Scutage:');
    await page.locator('#network-politics').click();
    await expect(page.locator('#governance-blocs')).toBeVisible();
    await expect(page.locator('#governance-blocs')).toContainText(
      'Redress of the Aid posture');
    await expect(page.locator('#governance-blocs')).toContainText(
      'Scutage posture');
    expect(await page.locator(
      '#governance-blocs .political-reasons li').count()).toBeGreaterThan(3);
    var governanceBlocCard = page.locator(
      '#governance-blocs .political-bloc-card').first();
    await expect(governanceBlocCard.locator('.political-posture'))
      .toHaveCount(0);
    await expect(governanceBlocCard.locator('.political-bloc-details'))
      .toBeHidden();
    await governanceBlocCard.hover();
    await expect(page.locator('#tooltip')).toContainText('Member houses');
    await expect(page.locator('#tooltip')).toContainText('Interests');
    var governance = await page.evaluate(function () {
      var cards = Array.prototype.slice.call(
        document.querySelectorAll('[data-political-bloc]'));
      return {
        ids:cards.map(function (card) {
          return card.dataset.politicalBloc;
        }).sort(),
        realmLinks:Array.prototype.slice.call(document.querySelectorAll(
          '#governance-blocs [data-governance-realm]')).map(
            function (button) {
              return button.dataset.governanceRealm;
            }),
        playerLinks:document.querySelectorAll(
          '#governance-blocs [data-political-character]').length
      };
    });
    await page.locator('#governance-close').click();
    await page.evaluate(function () {
      FB.ui.showParliament();
    });
    await expect(page.getByText('Lobbying strength', { exact:true }))
      .toBeVisible();
    await expect(page.getByText('Vote chance', { exact:true }))
      .toHaveCount(0);
    await page.locator('#gm-cancel').click();
    var after = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState()
      };
    });

    expect(governance.ids).toEqual(networkIds);
    expect(governance.realmLinks.length).toBeGreaterThan(0);
    expect(governance.playerLinks).toBeGreaterThan(0);
    expect(after).toEqual(before);
  });

test('a motion spends once, lobbies once, and tallies one roll per undecided bloc',
  async function ({ page }, testInfo) {
    await startPoliticsGame(page, testInfo);
    await configurePolitics(page);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      /* Keep the ordinary vote below its 85% cap so the evidence bonus is
         observable instead of both totals clamping to the same value. */
      p.prestige = 100;
      var liege = s.realms[p.liege];
      p.flags.plot_obligation_evidence = {
        realmId:p.liege,
        institution:'estates',
        contractId:'obl'
      };
      var baseline = JSON.parse(FB.save.serialize());
      var gold = p.gold;
      var began = FB.parliamentBeginMotion(s, 'redress');
      var queuedAtStart = s.eventQueue.some(function (item) {
        return item.id === 'parliament_redress';
      });
      var pending = s.politics.pendingMotion;
      var forecast = FB.politicalMotionForecast(s, 'redress');
      var target = forecast.blocs.filter(function (bloc) {
        return bloc.posture === 'undecided';
      })[0];
      var expectedLobbyChance =
        (target.naturalSupportChance + forecast.playerVoteChance) / 2;
      var ordinaryLobbyingStrength = FB.parliamentVoteChance(s, false);
      var originalRng = FB.rng;
      var rolls = [];
      FB.rng = function () {
        rolls.push(0);
        return 0;
      };
      var lobby = FB.parliamentLobbyMotion(s, target.id);
      var secondLobby = FB.parliamentLobbyMotion(s, target.id);
      var afterLobby = FB.politicalMotionForecast(s, 'redress');
      var unresolved = afterLobby.blocs.filter(function (bloc) {
        return bloc.posture === 'undecided';
      }).length;
      var called = FB.parliamentCallVote(s);
      FB.rng = originalRng;
      var outcomeOrder = Object.keys(
        s.politics.pendingMotion.result.outcomes);
      var sortedOrder = outcomeOrder.slice().sort();
      var queued = s.eventQueue.filter(function (item) {
        return item.id === 'parliament_redress';
      });
      var first = {
        began:began,
        spent:gold - p.gold,
        motionYear:liege.obl.lastMotion,
        currentYear:s.date.year,
        expiresIn:pending.expiresTurn - pending.startedTurn,
        queuedAtStart:queuedAtStart,
        lobbyOk:lobby.ok,
        lobbySuccess:lobby.success,
        lobbyChance:lobby.chance,
        expectedLobbyChance:expectedLobbyChance,
        evidenceLobbyingStrength:forecast.playerVoteChance,
        ordinaryLobbyingStrength:ordinaryLobbyingStrength,
        secondLobby:secondLobby,
        unresolved:unresolved,
        rolls:rolls.length,
        outcomeOrder:outcomeOrder,
        sortedOrder:sortedOrder,
        support:called.supportInfluence,
        opposition:called.oppositionInfluence,
        uncertain:called.uncertainInfluence,
        total:called.totalInfluence,
        majority:called.majority,
        passed:s.politics.pendingMotion.result.passed,
        queued:queued.length
      };

      FB.save.restore(JSON.parse(JSON.stringify(baseline)));
      s = FB.state;
      var savedCrown = FBDATA.politicalBlocs.crown.motions.redress;
      var savedMagnate = FBDATA.politicalBlocs.magnate.motions.redress;
      FBDATA.politicalBlocs.crown.motions.redress = 25;
      FBDATA.politicalBlocs.magnate.motions.redress = 25;
      FB.parliamentBeginMotion(s, 'redress');
      var lockedBefore = FB.politicalMotionForecast(s, 'redress');
      var lockedRolls = 0;
      originalRng = FB.rng;
      FB.rng = function () {
        lockedRolls++;
        return 0.5;
      };
      var lockedResult = FB.parliamentCallVote(s);
      FB.rng = originalRng;
      FBDATA.politicalBlocs.crown.motions.redress = savedCrown;
      FBDATA.politicalBlocs.magnate.motions.redress = savedMagnate;
      first.lockedUncertain = lockedBefore.uncertainInfluence;
      first.lockedRolls = lockedRolls;
      first.lockedSupport = lockedResult.supportInfluence;
      first.lockedMajority = lockedResult.majority;
      first.lockedPassed = s.politics.pendingMotion.result.passed;
      return first;
    });

    expect(result.began).toBe(true);
    expect(result.spent).toBe(15);
    expect(result.motionYear).toBe(result.currentYear);
    expect(result.expiresIn).toBe(90);
    expect(result.queuedAtStart).toBe(false);
    expect(result.lobbyOk).toBe(true);
    expect(result.lobbySuccess).toBe(true);
    expect(result.lobbyChance).toBe(result.expectedLobbyChance);
    expect(result.evidenceLobbyingStrength).toBeGreaterThan(
      result.ordinaryLobbyingStrength);
    expect(result.secondLobby).toBe(false);
    expect(result.rolls).toBe(1 + result.unresolved);
    expect(result.outcomeOrder).toEqual(result.sortedOrder);
    expect(result.support + result.opposition).toBe(result.total);
    expect(result.uncertain).toBe(0);
    expect(result.support).toBeGreaterThanOrEqual(result.majority);
    expect(result.passed).toBe(true);
    expect(result.queued).toBe(1);
    expect(result.lockedUncertain).toBe(0);
    expect(result.lockedRolls).toBe(0);
    expect(result.lockedSupport).toBeGreaterThanOrEqual(
      result.lockedMajority);
    expect(result.lockedPassed).toBe(true);
  });

test('campaign repair, withdrawal, expiry, liege changes, and save round trips are bounded',
  async function ({ page }, testInfo) {
    await startPoliticsGame(page, testInfo);
    var ids = await configurePolitics(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      p.flags.plot_obligation_evidence = {
        realmId:setup.polityId,
        institution:'estates',
        contractId:'obl'
      };
      var startingGold = p.gold;
      FB.parliamentBeginMotion(s, 'redress');
      var campaign = JSON.parse(FB.save.serialize());
      var campaignId = s.politics.pendingMotion.id;
      FB.save.restore(JSON.parse(JSON.stringify(campaign)));
      s = FB.state;
      var restoredCampaign =
        s.politics.pendingMotion.id === campaignId;
      FB.parliamentCallVote(s);
      var tallied = JSON.parse(FB.save.serialize());
      var talliedResult = JSON.stringify(
        s.politics.pendingMotion.result);
      FB.save.restore(JSON.parse(JSON.stringify(tallied)));
      s = FB.state;
      var restoredTally = JSON.stringify(
        s.politics.pendingMotion.result) === talliedResult;

      FB.save.restore(JSON.parse(JSON.stringify(campaign)));
      s = FB.state;
      var withdrew = FB.parliamentWithdrawMotion(s);
      var withdrawal = {
        pending:s.politics.pendingMotion,
        evidence:!!s.player.flags.plot_obligation_evidence,
        gold:s.player.gold,
        lastMotion:s.realms[setup.polityId].obl.lastMotion
      };

      FB.save.restore(JSON.parse(JSON.stringify(campaign)));
      s = FB.state;
      s.turn = s.politics.pendingMotion.expiresTurn;
      FB.repairPolitics(s);
      var expiry = {
        pending:s.politics.pendingMotion,
        evidence:!!s.player.flags.plot_obligation_evidence,
        gold:s.player.gold,
        lastMotion:s.realms[setup.polityId].obl.lastMotion
      };

      FB.save.restore(JSON.parse(JSON.stringify(campaign)));
      s = FB.state;
      FB.parliamentCallVote(s);
      var queued = s.eventQueue.filter(function (item) {
        return item.id === 'parliament_redress';
      })[0];
      FB.changePlayerLiege(s, setup.unrelatedId, 'test');
      var liegeChange = {
        pending:s.politics.pendingMotion,
        contextValid:FB.eventContextStillValid(
          s, FB.eventById('parliament_redress'), queued.ctx)
      };

      var oldSave = JSON.parse(JSON.stringify(campaign));
      delete oldSave.state.politics;
      FB.save.restore(oldSave);
      var repaired = FB.state.politics;
      return {
        restoredCampaign:restoredCampaign,
        restoredTally:restoredTally,
        withdrew:withdrew,
        withdrawal:withdrawal,
        expiry:expiry,
        liegeChange:liegeChange,
        repaired:{
          polityId:repaired.polityId,
          allegianceCount:Object.keys(repaired.allegiances).length,
          pending:repaired.pendingMotion
        },
        expectedGold:startingGold - 15,
        expectedYear:campaign.state.date.year
      };
    }, ids);

    expect(result.restoredCampaign).toBe(true);
    expect(result.restoredTally).toBe(true);
    expect(result.withdrew).toBe(true);
    expect(result.withdrawal.pending).toBeNull();
    expect(result.withdrawal.evidence).toBe(true);
    expect(result.withdrawal.gold).toBe(result.expectedGold);
    expect(result.withdrawal.lastMotion).toBe(result.expectedYear);
    expect(result.expiry.pending).toBeNull();
    expect(result.expiry.evidence).toBe(true);
    expect(result.expiry.gold).toBe(result.expectedGold);
    expect(result.expiry.lastMotion).toBe(result.expectedYear);
    expect(result.liegeChange.pending).toBeNull();
    expect(result.liegeChange.contextValid).toBe(false);
    expect(result.repaired.polityId).toBe(ids.polityId);
    expect(result.repaired.allegianceCount).toBeGreaterThan(0);
    expect(result.repaired.pending).toBeNull();
  });

[
  { motionId:'redress', outcome:'support' },
  { motionId:'redress', outcome:'oppose' },
  { motionId:'scutage', outcome:'support' },
  { motionId:'scutage', outcome:'oppose' }
].forEach(function (scenario) {
  test('visible and autoresolved ' + scenario.motionId + ' ' +
    scenario.outcome + ' apply the same predetermined effects',
    async function ({ page }, testInfo) {
      await startPoliticsGame(page, testInfo);
      var ids = await configurePolitics(page);
      var setup = await page.evaluate(function (input) {
        var s = FB.state;
        var p = s.player;
        p.flags.plot_obligation_evidence = {
          realmId:input.ids.polityId,
          institution:'estates',
          contractId:'obl'
        };
        var motionId = input.scenario.motionId;
        FB.parliamentBeginMotion(s, motionId);
        var forecast = FB.politicalMotionForecast(s, motionId);
        for (var i = 0; i < forecast.blocs.length; i++) {
          s.politics.pendingMotion.pledges[forecast.blocs[i].id] =
            input.scenario.outcome;
        }
        FB.parliamentCallVote(s);
        var event = FB.eventById('parliament_' + motionId);
        return {
          payload:JSON.parse(FB.save.serialize()),
          expectedPass:input.scenario.outcome === 'support',
          optionChance:event.options.some(function (option) {
            return option.chance !== undefined;
          }),
          validOptions:event.options.filter(function (option) {
            return !option.require || FB.checkTrigger(
              s, option.require, s.eventQueue[s.eventQueue.length - 1].ctx);
          }).length
        };
      }, { ids:ids, scenario:scenario });

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
          aid:s.realms[s.player.liege].obl.aid,
          scutage:s.realms[s.player.liege].obl.scutage,
          prestige:s.player.prestige,
          standing:FB.standingOf(s, {
            kind:'realm', id:s.player.liege
          }),
          evidence:!!s.player.flags.plot_obligation_evidence,
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
          aid:s.realms[s.player.liege].obl.aid,
          scutage:s.realms[s.player.liege].obl.scutage,
          prestige:s.player.prestige,
          standing:FB.standingOf(s, {
            kind:'realm', id:s.player.liege
          }),
          evidence:!!s.player.flags.plot_obligation_evidence,
          modifiers:FB.countyModifierRecords(s, pid).map(
            function (record) { return record.id; }).sort(),
          pending:s.politics.pendingMotion
        };
      }, setup.payload);

      expect(automated).toEqual(visible);
      expect(visible.pending).toBeNull();
      expect(visible.evidence).toBe(
        scenario.motionId !== 'redress');
      if (scenario.motionId === 'redress' && setup.expectedPass) {
        expect(visible.modifiers).toContain('custom_confirmed');
      }
      if (scenario.motionId === 'scutage') {
        expect(visible.scutage).toBe(setup.expectedPass);
      }
    });
});

test('political bloc and lobbying controls remain usable on a narrow touch layout',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startPoliticsGame(page, testInfo);
    await configurePolitics(page);
    await page.evaluate(function () {
      FB.ui.showGovernance('blocs');
    });
    await expect(page.locator('#governance-blocs')).toBeVisible();
    var touchBlocCard = page.locator('.political-bloc-card').first();
    await expect(touchBlocCard).toBeVisible();
    var touchDetails = touchBlocCard.locator('.political-bloc-details');
    await expect(touchDetails).toBeHidden();
    var touchInfo = touchBlocCard.locator('.settcard-info');
    await expect(touchInfo).toBeVisible();
    await touchInfo.click();
    await expect(touchDetails).toBeVisible();
    await expect(touchDetails).toContainText('Member houses');
    await expect(touchDetails).toContainText('Interests');
    await touchInfo.click();
    await expect(touchDetails).toBeHidden();
    var cardGeometry = await touchBlocCard.evaluate(function (card) {
        var rect = card.getBoundingClientRect();
        return {
          left:rect.left,
          right:rect.right,
          viewport:window.innerWidth
        };
      });
    expect(cardGeometry.left).toBeGreaterThanOrEqual(0);
    expect(cardGeometry.right).toBeLessThanOrEqual(cardGeometry.viewport + 1);

    await page.locator('[data-governance-section="institution"]').click();
    await page.locator(
      '#governance-institution [data-governance-institution="estates"]').click();
    await page.locator('[data-motion="redress"]').click();
    var lobby = page.locator('[data-lobby-bloc]').first();
    await expect(lobby).toBeVisible();
    var height = await lobby.evaluate(function (button) {
      return button.getBoundingClientRect().height;
    });
    expect(height).toBeGreaterThanOrEqual(44);
    await page.evaluate(function () {
      history.back();
    });
    await expect(page.locator('#governance-institution')).toBeFocused();
  });
