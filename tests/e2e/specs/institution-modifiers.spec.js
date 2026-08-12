'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

async function startInstitutionGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function configureCrownedRealm(page) {
  return page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var homeId = p.provinceId;
    var counties = [homeId];
    var available = FB.world.provs.filter(function (province) {
      return !province.wasteland && province.id !== homeId;
    });
    for (var i = 0; i < available.length && counties.length < 9; i++) {
      counties.push(available[i].id);
    }
    var externalId = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id] && s.realms[id].alive &&
        !s.realms[id].liege && s.realms[id].ruler;
    })[0];
    var direct = counties.slice(0, 6);
    var vassalCounty = counties[6];
    var vassalId = 'institution_vassal';
    var constableId = 'institution_constable';
    var almonerId = 'institution_almoner';

    function addTestVassal(id, countyId, name, standing) {
      s.owner[countyId] = 'player';
      s.holder[countyId] = id;
      s.dev[countyId] = 8;
      s.realms[id] = {
        id:id,
        name:name,
        color:'#765432',
        capital:countyId,
        aggression:0,
        rank:1,
        liege:'player',
        alive:true,
        favor:0,
        ruler:{
          name:name.split(' ')[0],
          sex:'m',
          culture:me.culture,
          age:40,
          mar:8,
          trait:'ambitious',
          generation:1
        }
      };
      FB.setRealmRulerStanding(s, id, standing);
    }

    p.tier = 6;
    p.liege = null;
    p.provs = direct.slice();
    p.provinceId = homeId;
    p.gold = 500;
    p.prestige = 500;
    p.piety = 100;
    p.pop = 10;
    p.war = null;
    p.flags = p.flags || {};
    delete p.flags.with_liege_host;
    me.skills.ste = 0;
    for (var j = 0; j < direct.length; j++) {
      s.owner[direct[j]] = 'player';
      s.holder[direct[j]] = 'player';
      s.dev[direct[j]] = 8;
    }
    FB.foundPlayerRealm(s);
    s.realms.player.alive = true;
    s.realms.player.rank = 3;
    s.realms.player.liege = null;
    s.realms.player.capital = homeId;
    addTestVassal(vassalId, vassalCounty, 'Aldred March', 25);
    addTestVassal(constableId, counties[7], 'Baldric March', 20);
    addTestVassal(almonerId, counties[8], 'Cenric March', 20);
    s.council = {
      authority:55,
      seats:{
        seneschal:null,
        constable:constableId,
        treasurer:vassalId,
        almoner:almonerId,
        chamberlain:null
      }
    };
    s.modifiers = { county:{} };
    if (externalId && s.realms[externalId]) s.realms[externalId].war = null;
    FB.invalidateRealmCache();
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    return {
      homeId:homeId,
      otherId:direct[1],
      vassalId:vassalId,
      constableId:constableId,
      almonerId:almonerId,
      externalId:externalId
    };
  });
}

async function configureEstates(page, ids) {
  return page.evaluate(function (setup) {
    var s = FB.state;
    var p = s.player;
    var liege = s.realms[setup.externalId];
    p.tier = 4;
    p.liege = setup.externalId;
    p.provs = [setup.homeId];
    p.provinceId = setup.homeId;
    p.war = null;
    s.owner[setup.homeId] = FB.topRealm(s, setup.externalId);
    s.holder[setup.homeId] = 'player';
    s.realms.player.alive = true;
    s.realms.player.rank = 1;
    s.realms.player.liege = setup.externalId;
    s.realms.player.capital = setup.homeId;
    liege.obl = { aid:0.25, scutage:false, lastMotion:null };
    liege.war = null;
    s.council = null;
    s.modifiers = { county:{} };
    FB.invalidateRealmCache();
    return {
      homeId:setup.homeId,
      liegeId:setup.externalId
    };
  }, ids);
}

test('institution catalog is complete and every county modifier has a core grant path',
  async function ({ page }, testInfo) {
    await startInstitutionGame(page, testInfo);
    var result = await page.evaluate(function () {
      var ids = [
        'market_charter',
        'contested_tolls',
        'levy_exemption',
        'muster_burden',
        'roads_patrolled',
        'settlement_grudge',
        'tax_concession'
      ];
      var allowed = {
        tax:1,
        levy:1,
        buildingCost:1,
        commonVoice:1,
        famine:1,
        unrest:1
      };
      var grants = {};
      var crossLinks = {};
      function scan(fx, eventId) {
        if (!fx || !fx.addModifier) return;
        var spec = typeof fx.addModifier === 'string'
          ? { id:fx.addModifier } : fx.addModifier;
        if (!spec || !spec.id) return;
        grants[spec.id] = grants[spec.id] || [];
        grants[spec.id].push(eventId);
      }
      FBDATA.events.forEach(function (event) {
        (event.options || []).forEach(function (option) {
          scan(option.effects, event.id);
          scan(option.success && option.success.effects, event.id);
          scan(option.failure && option.failure.effects, event.id);
        });
      });
      Object.keys(FBDATA.collectiveDemands || {}).forEach(function (demandId) {
        var demand = FBDATA.collectiveDemands[demandId];
        var privilege = demand && FBDATA.privileges[demand.privilege];
        var effect = privilege && privilege.effect;
        if (!effect || effect.kind !== 'modifier') return;
        grants[effect.id] = grants[effect.id] || [];
        grants[effect.id].push('collective:' + demandId);
      });
      crossLinks.plotDiscovery = grants.settlement_grudge &&
        grants.settlement_grudge.indexOf('plot_discovered') >= 0;
      crossLinks.plotObligation = grants.contested_tolls &&
        grants.contested_tolls.indexOf('plot_skim_taxes') >= 0;
      crossLinks.merchantCompact = grants.market_charter &&
        grants.market_charter.indexOf('strange_bounty') >= 0;
      return {
        definitions:ids.map(function (id) {
          var def = FBDATA.modifiers[id];
          return {
            id:id,
            scope:def && def.scope,
            days:def && def.days,
            supported:def && Object.keys(def.fx || {}).every(function (key) {
              return !!allowed[key];
            }),
            sources:(grants[id] || []).slice().sort()
          };
        }),
        councilEvents:[
          'council_market_charter',
          'council_muster_burden',
          'council_domain_pressure',
          'council_sanctuary_claim'
        ].every(function (id) { return !!FB.eventById(id); }),
        estatesEvents:[
          'parliament_market_charter',
          'parliament_levy_concession',
          'parliament_local_redress',
          'parliament_sanctuary_relief'
        ].every(function (id) { return !!FB.eventById(id); }),
        crossLinks:crossLinks
      };
    });

    expect(result.definitions).toHaveLength(7);
    for (var definition of result.definitions) {
      expect(definition.scope).toBe('county');
      expect(definition.days).toBeGreaterThan(0);
      expect(definition.supported).toBe(true);
      expect(definition.sources.length).toBeGreaterThan(0);
    }
    expect(result.councilEvents).toBe(true);
    expect(result.estatesEvents).toBe(true);
    expect(result.crossLinks).toEqual({
      plotDiscovery:true,
      plotObligation:true,
      merchantCompact:true
    });
  });

test('Council stories obey seat, war, and domain gates without creating Estates state',
  async function ({ page }, testInfo) {
    await startInstitutionGame(page, testInfo);
    var ids = await configureCrownedRealm(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      function gate(eventId) {
        var event = FB.eventById(eventId);
        var trigger = {};
        Object.keys(event.trigger || {}).forEach(function (key) {
          if (key !== 'chance') trigger[key] = event.trigger[key];
        });
        return FB.checkTrigger(s, trigger, {
          locationId:setup.homeId
        });
      }
      var marketReady = gate('council_market_charter');
      FB.setRealmRulerStanding(s, setup.vassalId, -60);
      var marketWithDisgracedTreasurer = gate('council_market_charter');
      FB.setRealmRulerStanding(s, setup.vassalId, 25);
      s.council.seats.treasurer = null;
      var marketWithoutTreasurer = gate('council_market_charter');
      s.council.seats.treasurer = setup.vassalId;
      var musterAtPeace = gate('council_muster_burden');
      s.player.war = {
        enemy:setup.externalId,
        target:null,
        wins:0,
        losses:0,
        seasons:0
      };
      var musterAtWar = gate('council_muster_burden');
      s.player.war = null;
      var domainOver = gate('council_domain_pressure');
      s.council.authority =
        (FBDATA.balance.councilCharterAbove || 70) + 1;
      var domainAtHighAuthority = gate('council_domain_pressure');
      s.council.authority = 55;
      s.player.provs = [setup.homeId];
      var domainWithinLimit = gate('council_domain_pressure');
      s.player.provs = [setup.homeId, setup.otherId];
      var sanctuaryReady = gate('council_sanctuary_claim');
      var event = FB.eventById('council_market_charter');
      FB.applyEffects(s, event.options[0].effects, {
        locationId:setup.homeId
      }, event);
      var record = FB.countyModifierRecords(s, setup.homeId)[0];
      return {
        marketReady:marketReady,
        marketWithDisgracedTreasurer:marketWithDisgracedTreasurer,
        marketWithoutTreasurer:marketWithoutTreasurer,
        musterAtPeace:musterAtPeace,
        musterAtWar:musterAtWar,
        domainOver:domainOver,
        domainAtHighAuthority:domainAtHighAuthority,
        domainWithinLimit:domainWithinLimit,
        sanctuaryReady:sanctuaryReady,
        sourceEventId:record && record.sourceEventId,
        councilAuthority:s.council.authority,
        hasEstatesState:!!(s.realms.player.obl)
      };
    }, ids);

    expect(result).toEqual({
      marketReady:true,
      marketWithDisgracedTreasurer:false,
      marketWithoutTreasurer:false,
      musterAtPeace:false,
      musterAtWar:true,
      domainOver:true,
      domainAtHighAuthority:false,
      domainWithinLimit:false,
      sanctuaryReady:true,
      sourceEventId:'council_market_charter',
      councilAuthority:52,
      hasEstatesState:false
    });
  });

test('Estates agenda reacts to terms, war, and local disputes without forming a Council',
  async function ({ page }, testInfo) {
    await startInstitutionGame(page, testInfo);
    var crowned = await configureCrownedRealm(page);
    var ids = await configureEstates(page, crowned);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var liege = s.realms[setup.liegeId];
      var peace = FB.parliamentSessionCandidates(s);
      var levyEvent = FB.eventById('parliament_levy_concession');
      var aidRaiseReady = FB.checkTrigger(
        s, levyEvent.options[1].require, { locationId:setup.homeId });
      FB.addModifier(s, 'contested_tolls', setup.homeId, {
        sourceEventId:'plot_skim_taxes'
      });
      var disputed = FB.parliamentSessionCandidates(s);
      liege.war = {
        enemy:'player',
        target:setup.homeId,
        years:0,
        captures:0
      };
      var war = FB.parliamentSessionCandidates(s);
      liege.obl.aid = FBDATA.balance.parliamentAidMax;
      var maxAid = FB.parliamentSessionCandidates(s);
      var aidRaiseAtMax = FB.checkTrigger(
        s, levyEvent.options[1].require, { locationId:setup.homeId });
      var redress = FB.eventById('parliament_local_redress');
      FB.applyEffects(s, redress.options[0].effects, {
        locationId:setup.homeId
      }, redress);
      return {
        peace:peace,
        disputed:disputed,
        war:war,
        maxAid:maxAid,
        aidRaiseReady:aidRaiseReady,
        aidRaiseAtMax:aidRaiseAtMax,
        tollsEnded:!FB.hasModifier(s, 'contested_tolls', setup.homeId),
        charterAdded:FB.hasModifier(s, 'market_charter', setup.homeId),
        source:FB.countyModifierRecords(s, setup.homeId)[0].sourceEventId,
        council:s.council
      };
    }, ids);

    expect(result.peace).toContain('parliament_market_charter');
    expect(result.peace).toContain('parliament_sanctuary_relief');
    expect(result.peace).not.toContain('parliament_levy_concession');
    expect(result.disputed).toContain('parliament_local_redress');
    expect(result.disputed).not.toContain('parliament_market_charter');
    expect(result.war).toContain('parliament_subsidy');
    expect(result.war).toContain('parliament_levy_concession');
    expect(result.war).not.toContain('parliament_sanctuary_relief');
    expect(result.maxAid).not.toContain('parliament_aid_hike');
    expect(result.aidRaiseReady).toBe(true);
    expect(result.aidRaiseAtMax).toBe(false);
    expect(result.tollsEnded).toBe(true);
    expect(result.charterAdded).toBe(true);
    expect(result.source).toBe('parliament_local_redress');
    expect(result.council).toBeNull();
  });

test('county modifier ledgers refresh, persist, transfer, remove, and expire authoritatively',
  async function ({ page }, testInfo) {
    await startInstitutionGame(page, testInfo);
    var ids = await configureCrownedRealm(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      var buildingId = Object.keys(FBDATA.buildings)[0];
      var before = {
        tax:FB.playerTax(s),
        levy:FB.playerLevy(s),
        building:FB.buildCost(s, setup.homeId, buildingId),
        voice:FB.popEffective(s),
        income:FB.reliableGoldIncome(s)
      };
      FB.addModifier(s, 'market_charter', setup.homeId, {
        sourceEventId:'council_market_charter'
      });
      FB.addModifier(s, 'levy_exemption', setup.homeId, {
        sourceEventId:'parliament_levy_concession'
      });
      var gainEntry = s.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.modifier.county_gained' &&
          entry.msg.params.modifier &&
          entry.msg.params.modifier.id === 'levy_exemption';
      })[0];
      var after = {
        tax:FB.playerTax(s),
        levy:FB.playerLevy(s),
        building:FB.buildCost(s, setup.homeId, buildingId),
        voice:FB.popEffective(s),
        income:FB.reliableGoldIncome(s),
        upkeep:FB.modifierUpkeep(s, 'gold'),
        upkeepEntries:FB.modifierUpkeepEntries(s, 'gold').map(function (entry) {
          return entry.id;
        })
      };
      FB.addModifier(s, 'contested_tolls', setup.homeId, {
        sourceEventId:'plot_skim_taxes',
        silent:true
      });
      var scaledUnrest = FB.scaleEventEffects(s, {
        gold:-20,
        popularOpinion:-8
      }, { locationId:setup.homeId }, { tags:['unrest'] });
      FB.removeModifier(s, 'contested_tolls', setup.homeId);
      s.turn += 10;
      FB.addModifier(s, 'market_charter', setup.homeId, {
        sourceEventId:'strange_bounty'
      });
      var refreshed = FB.countyModifierRecords(s, setup.homeId).filter(
        function (record) { return record.id === 'market_charter'; });
      var expectedRefreshEnd = s.turn + 1440;
      var saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      s = FB.state;
      p = s.player;
      var restored = FB.countyModifierRecords(s, setup.homeId).filter(
        function (record) { return record.id === 'market_charter'; })[0];
      p.provs = p.provs.filter(function (pid) {
        return pid !== setup.homeId;
      });
      s.holder[setup.homeId] = setup.vassalId;
      FB.invalidateRealmCache();
      var transfer = {
        present:FB.hasModifier(s, 'market_charter', setup.homeId),
        taxBonus:FB.modBonus(s, 'tax', setup.homeId),
        upkeep:FB.modifierUpkeep(s, 'gold'),
        voice:FB.popEffective(s)
      };
      var removeEvent = FB.eventById('parliament_local_redress');
      FB.applyEffects(s, {
        removeModifier:{id:'market_charter'}
      }, { locationId:setup.homeId }, removeEvent);
      var removalKey = s.log[s.log.length - 1].msg.key;
      FB.addModifier(s, 'contested_tolls', setup.homeId, {
        sourceEventId:'plot_skim_taxes'
      });
      var expiring = FB.countyModifierRecords(s, setup.homeId).filter(
        function (record) { return record.id === 'contested_tolls'; })[0];
      s.turn = expiring.endTurn;
      FB.modifierTick(s);
      var expiryKey = s.log[s.log.length - 1].msg.key;
      return {
        before:before,
        after:after,
        scaledUnrest:scaledUnrest,
        refreshCount:refreshed.length,
        refreshEnd:refreshed[0].endTurn,
        expectedRefreshEnd:expectedRefreshEnd,
        refreshSource:refreshed[0].sourceEventId,
        restoredSource:restored.sourceEventId,
        transfer:transfer,
        gainMessage:{
          key:gainEntry.msg.key,
          modifier:gainEntry.msg.params.modifier,
          province:gainEntry.msg.params.province
        },
        expectedProvince:FB.world.byId[setup.homeId].name,
        removalKey:removalKey,
        removed:!FB.hasModifier(s, 'market_charter', setup.homeId),
        expiryKey:expiryKey,
        expired:!FB.hasModifier(s, 'contested_tolls', setup.homeId)
      };
    }, ids);

    expect(result.after.tax).toBeGreaterThan(result.before.tax);
    expect(result.after.levy).toBeLessThan(result.before.levy);
    expect(result.after.building).toBeLessThan(result.before.building);
    expect(result.after.voice).toBe(result.before.voice + 6);
    expect(result.after.income).toBeCloseTo(
      result.before.income + result.after.tax - result.before.tax - 1);
    expect(result.after.upkeep).toBe(1);
    expect(result.after.upkeepEntries).toEqual(['market_charter']);
    expect(result.scaledUnrest.gold).toBe(-25);
    expect(result.scaledUnrest.popularOpinion).toBe(-10);
    expect(result.refreshCount).toBe(1);
    expect(result.refreshEnd).toBe(result.expectedRefreshEnd);
    expect(result.refreshSource).toBe('strange_bounty');
    expect(result.restoredSource).toBe('strange_bounty');
    expect(result.transfer.present).toBe(true);
    expect(result.transfer.taxBonus).toBeCloseTo(0.08);
    expect(result.transfer.upkeep).toBe(0);
    expect(result.transfer.voice).toBe(result.before.voice);
    expect(result.gainMessage).toEqual({
      key:'news.modifier.county_gained',
      modifier:{
        $data:'modifier',
        id:'levy_exemption',
        path:'name'
      },
      province:result.expectedProvince
    });
    expect(result.removalKey).toBe('news.modifier.county_expired');
    expect(result.removed).toBe(true);
    expect(result.expiryKey).toBe('news.modifier.county_expired');
    expect(result.expired).toBe(true);
  });

test('Land, Governance, detail, previews, and autoresolve share the same records',
  async function ({ page }, testInfo) {
    await startInstitutionGame(page, testInfo);
    var ids = await configureCrownedRealm(page);
    var baseline = await page.evaluate(function (setup) {
      var s = FB.state;
      FB.addModifier(s, 'market_charter', setup.homeId, {
        sourceEventId:'council_market_charter'
      });
      FB.addModifier(s, 'contested_tolls', setup.homeId, {
        sourceEventId:'plot_skim_taxes'
      });
      FB.ui.selectProvince(setup.homeId);
      function chips(selector) {
        return Array.from(document.querySelectorAll(selector)).map(
          function (chip) {
            return {
              id:chip.getAttribute('data-modifier'),
              text:chip.textContent.trim()
            };
          }).sort(function (a, b) {
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
          });
      }
      var land = chips('#tab-prov .modifierchip');
      FB.ui.showGovernance('institution');
      var governance = chips('#governance-institution .modifierchip');
      return {
        land:land,
        governance:governance,
        save:JSON.parse(FB.save.serialize())
      };
    }, ids);

    expect(baseline.governance).toEqual(baseline.land);
    expect(baseline.governance.map(function (chip) {
      return chip.id;
    })).toEqual([
      'contested_tolls',
      'market_charter'
    ]);
    await page.locator(
      '#governance-institution [data-modifier="market_charter"]').click();
    await expect(page.locator('#gm-body')).toContainText(
      'Event: The Charter at the Exchequer');
    await expect(page.locator('#gm-body')).toContainText('+8% county tax');
    await expect(page.locator('#gm-body')).toContainText(
      '-8% construction cost');
    await expect(page.locator('#gm-body')).toContainText(
      'Stays with the county when political control changes');
    await page.locator('#mm-close').click();

    await page.evaluate(function (setup) {
      var event = FB.eventById('council_market_charter');
      FB.ui.runEvents([{
        id:event.id,
        ctx:FB.eventContext(FB.state, { locationId:setup.homeId })
      }]);
    }, ids);
    var firstOption = page.locator('#ev-options .evopt').first();
    await expect(firstOption).toContainText('Market Charter');
    await expect(firstOption).toContainText('1440 days');
    await expect(firstOption).toContainText(
      'Benefits: county tax, construction costs');
    await expect(firstOption).not.toContainText('+8% county tax');
    await expect(firstOption).not.toContainText('-8% construction cost');
    await expect(firstOption).toContainText('each season');
    await expect(firstOption).toContainText(
      'stays with the county after transfer');
    await firstOption.click();
    var visible = await page.evaluate(function (setup) {
      var s = FB.state;
      return {
        gold:s.player.gold,
        pop:s.player.pop,
        authority:s.council.authority,
        standing:FB.standingOf(s, {
          kind:'realm',
          id:'institution_vassal'
        }),
        record:FB.countyModifierRecords(s, setup.homeId).filter(
          function (item) { return item.id === 'market_charter'; })[0]
      };
    }, ids);

    var automatic = await page.evaluate(function (payload) {
      FB.save.restore(payload.save);
      var oldAuto = FB.game.auto;
      FB.game.auto = {
        all:true,
        minor:true,
        major:true,
        war:true,
        style:'first'
      };
      FB.ui.runEvents([{
        id:'council_market_charter',
        ctx:FB.eventContext(FB.state, { locationId:payload.homeId })
      }]);
      var s = FB.state;
      var result = {
        gold:s.player.gold,
        pop:s.player.pop,
        authority:s.council.authority,
        standing:FB.standingOf(s, {
          kind:'realm',
          id:'institution_vassal'
        }),
        record:FB.countyModifierRecords(s, payload.homeId).filter(
          function (item) { return item.id === 'market_charter'; })[0]
      };
      FB.game.auto = oldAuto;
      return result;
    }, {
      save:baseline.save,
      homeId:ids.homeId
    });

    expect(automatic).toEqual(visible);
    expect(automatic.record.sourceEventId).toBe('council_market_charter');
  });
