'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/armies.js',
  'js/holywar.js',
  'js/model.js',
  'js/politics.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/world.js',
  'data/events_war.js',
  'data/map_data.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

async function startWarGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
}

async function configureAggressionWar(page) {
  return page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var homeId = p.provinceId;
    var targetId = Object.keys(FB.world.adj[homeId] || {}).filter(
      function (id) {
        return FB.world.byId[id] && !FB.world.byId[id].wasteland;
      })[0];
    var settled = FB.world.provs.filter(function (province) {
      return !province.wasteland && province.id !== homeId &&
        province.id !== targetId;
    });
    var vassalCountyId = settled[0].id;
    var foreignCountyId = settled[1].id;
    var enemyId = 'aggression_enemy';
    var vassalId = 'aggression_vassal';
    var foreignId = 'aggression_foreign';

    function realm(id, name, rank, liege, capital, trait) {
      s.realms[id] = {
        id:id,
        name:name,
        color:'#7a3f35',
        capital:capital,
        aggression:0,
        rank:rank,
        liege:liege,
        alive:true,
        favor:0,
        religion:me.religion,
        ruler:{
          name:name + ' Ruler',
          sex:'m',
          culture:me.culture,
          age:40,
          mar:7,
          trait:trait || 'ambitious',
          generation:1
        }
      };
    }

    FB.game.observe = false;
    p.dead = false;
    p.tier = 4;
    p.liege = null;
    p.provs = [homeId];
    p.provinceId = homeId;
    p.travel = null;
    p.war = null;
    p.greatHolyWar = null;
    p.fabricatedClaim = null;
    p.aggressiveWars = [];
    p.prestige = 200;
    p.pop = 30;
    p.gold = 500;
    p.liegeOp = 0;
    p.liegeOps = {};
    p.flags = p.flags || {};
    delete p.flags.bishop;
    delete p.flags.chief_qadi;
    delete p.flags.with_liege_host;
    delete p.flags.on_campaign;
    delete me.bishopric;
    delete me.restorationRight;
    s.greatHolyWar = null;
    s.pacts = {};
    s.alliances = [];
    s.modifiers = { county:{} };
    s.armies = [];
    for (var rid in s.realms) {
      if (s.realms[rid]) s.realms[rid].war = null;
    }

    s.owner[homeId] = 'player';
    s.holder[homeId] = 'player';
    s.dev[homeId] = 8;
    FB.foundPlayerRealm(s);
    s.realms.player.rank = 1;
    s.realms.player.liege = null;
    s.realms.player.capital = homeId;

    realm(enemyId, 'Red March', 1, null, targetId, 'ambitious');
    realm(vassalId, 'Ash County', 1, 'player', vassalCountyId,
      'ambitious');
    realm(foreignId, 'Blue Crown', 2, null, foreignCountyId, 'proud');
    s.owner[targetId] = enemyId;
    s.holder[targetId] = enemyId;
    s.dev[targetId] = 8;
    s.owner[vassalCountyId] = 'player';
    s.holder[vassalCountyId] = vassalId;
    s.dev[vassalCountyId] = 7;
    s.owner[foreignCountyId] = foreignId;
    s.holder[foreignCountyId] = foreignId;
    s.dev[foreignCountyId] = 9;
    FB.setRealmRulerStanding(s, enemyId, 25);
    FB.setRealmRulerStanding(s, vassalId, 20);
    FB.setRealmRulerStanding(s, foreignId, 30);
    FB.invalidateRealmCache();
    s.politics = null;
    FB.ensurePolitics(s);
    FB.ui.refresh();

    return {
      homeId:homeId,
      targetId:targetId,
      targetName:FB.world.byId[targetId].name,
      enemyId:enemyId,
      enemyName:s.realms[enemyId].name,
      vassalId:vassalId,
      foreignId:foreignId,
      foreignCountyId:foreignCountyId
    };
  });
}

test('aggression is explicit, read-only to review, and subordinate to real claims',
  async function ({ page }, testInfo) {
    await startWarGame(page, testInfo);
    var ids = await configureAggressionWar(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var cause = FB.warCauses(s, false, true).filter(function (item) {
        return item.target === setup.targetId;
      })[0];
      var before = JSON.stringify(s);
      var rngBefore = FB.getRngState();
      var preview = FB.warCausePreview(s, cause);
      var reviewed = JSON.stringify(s);
      var rngAfter = FB.getRngState();
      var rejected = FB.startPlayerWar(s, cause);
      var afterRejected = JSON.stringify(s);

      s.pacts[setup.enemyId] = s.turn + 90;
      var pactCause = FB.warCauses(s, true, true).filter(function (item) {
        return item.target === setup.targetId;
      })[0];
      var pactVisible = FB.warCauses(s, false, true).some(function (item) {
        return item.target === setup.targetId;
      });
      delete s.pacts[setup.enemyId];

      FB.formAlliance(s, 'player', setup.enemyId, 'test');
      var allianceCause = FB.warCauses(s, true, true).filter(
        function (item) {
          return item.target === setup.targetId;
        })[0];
      var allianceVisible = FB.warCauses(s, false, true).some(
        function (item) {
          return item.target === setup.targetId;
        });
      FB.breakAlliance(s, 'player', setup.enemyId);

      s.player.fabricatedClaim = {
        pid:setup.targetId,
        madeTurn:s.turn
      };
      var lawful = FB.warCauses(s, false, true).filter(function (item) {
        return item.target === setup.targetId;
      });
      var prestigeBefore = s.player.prestige;
      var started = FB.startPlayerWar(s, lawful[0]);
      return {
        causeType:cause && cause.type,
        previewType:preview && preview.type,
        previewAggression:!!(preview && preview.aggression),
        stateStable:before === reviewed && before === afterRejected,
        rngStable:rngBefore === rngAfter,
        rejected:rejected,
        pactBlocked:pactCause && pactCause.blocked,
        pactVisible:pactVisible,
        allianceBlocked:allianceCause && allianceCause.blocked,
        allianceVisible:allianceVisible,
        lawfulTypes:lawful.map(function (item) { return item.type; }),
        started:started,
        casus:s.player.war && s.player.war.casus.type,
        enemyStanding:FB.standingOf(s, {
          kind:'realm', id:setup.enemyId
        }),
        enemyStandingApplied:s.player.war &&
          s.player.war.enemyStandingApplied,
        prestigeChange:s.player.prestige - prestigeBefore,
        aggressionHistory:s.player.aggressiveWars.length
      };
    }, ids);

    expect(result).toEqual({
      causeType:'aggression',
      previewType:'aggression',
      previewAggression:true,
      stateStable:true,
      rngStable:true,
      rejected:false,
      pactBlocked:'pact',
      pactVisible:false,
      allianceBlocked:'alliance',
      allianceVisible:false,
      lawfulTypes:['fabricated'],
      started:true,
      casus:'fabricated',
      enemyStanding:-60,
      enemyStandingApplied:1,
      prestigeChange:5,
      aggressionHistory:0
    });
  });

test('confirmed aggression applies exact visible costs and escalates revolt pressure',
  async function ({ page }, testInfo) {
    await startWarGame(page, testInfo);
    var ids = await configureAggressionWar(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      var cause = FB.warCauses(s, false, true).filter(function (item) {
        return item.target === setup.targetId;
      })[0];
      var preview = FB.warCausePreview(s, cause);
      var prestigeBefore = p.prestige;
      var voiceBefore = p.pop;
      var standingsBefore = {};
      preview.aggression.vassals.concat(
        preview.aggression.foreign).forEach(function (entry) {
          standingsBefore[entry.realmId] = entry.before;
        });
      var started = FB.startPlayerWar(s, cause, {
        confirmAggression:true
      });
      var exactStandings = preview.aggression.vassals.concat(
        preview.aggression.foreign).every(function (entry) {
          return FB.standingOf(s, {
            kind:'realm',
            id:entry.realmId
          }) === (entry.realmId === setup.enemyId
            ? preview.enemyStanding.after : entry.after);
        });
      var startedCasus = p.war && p.war.casus.type;
      FB.endPlayerWar(s);

      p.aggressiveWars.push({
        turn:s.turn - FBDATA.balance.warAggressionMemoryDays,
        charId:p.charId,
        enemy:'expired',
        target:'expired'
      });
      p.aggressiveWars.push({ turn:'not-a-turn' });
      p.aggressiveWars.push({
        turn:s.turn,
        charId:'previous_protagonist',
        enemy:setup.enemyId,
        target:setup.targetId
      });
      var recent = FB.aggressiveWarHistory(s);
      var secondCause = FB.warCauses(s, false, true).filter(
        function (item) {
          return item.target === setup.targetId;
        })[0];
      var secondPreview = FB.warCausePreview(s, secondCause);
      var baseBreakaway = FBDATA.balance.breakawayChance;
      FB.setRealmRulerStanding(s, setup.vassalId, -100);
      var hostileBreakaway = FB.vassalBreakawayChance(
        s, setup.vassalId);

      return {
        started:started,
        casus:startedCasus,
        declarationReward:preview.declarationPrestige,
        victoryReward:preview.victoryPrestige,
        prestigeChange:p.prestige - prestigeBefore,
        expectedPrestige:preview.aggression.prestigeChange,
        voiceChange:p.pop - voiceBefore,
        expectedVoice:preview.aggression.commonVoiceChange,
        exactStandings:exactStandings,
        enemyStanding:FB.standingOf(s, {
          kind:'realm', id:setup.enemyId
        }),
        historyCount:recent.length,
        historyRecord:recent[0],
        firstMultiplier:preview.aggression.escalationMultiplier,
        secondMultiplier:secondPreview.aggression.escalationMultiplier,
        firstBreakaway:preview.aggression.breakawayMultiplier,
        secondBreakaway:secondPreview.aggression.breakawayMultiplier,
        firstPrestigeCost:preview.aggression.prestigeChange,
        secondPrestigeCost:secondPreview.aggression.prestigeChange,
        baseBreakaway:baseBreakaway,
        hostileBreakaway:hostileBreakaway,
        standingsRecorded:Object.keys(standingsBefore).length > 2
      };
    }, ids);

    expect(result.started).toBe(true);
    expect(result.casus).toBe('aggression');
    expect(result.declarationReward).toBe(0);
    expect(result.victoryReward).toBe(0);
    expect(result.prestigeChange).toBe(result.expectedPrestige);
    expect(result.voiceChange).toBe(result.expectedVoice);
    expect(result.exactStandings).toBe(true);
    expect(result.enemyStanding).toBe(-60);
    expect(result.historyCount).toBe(1);
    expect(result.historyRecord).toMatchObject({
      charId:expect.any(String),
      enemy:ids.enemyId,
      target:ids.targetId
    });
    expect(result.firstMultiplier).toBe(1);
    expect(result.secondMultiplier).toBe(1.5);
    expect(result.firstBreakaway).toBe(1.5);
    expect(result.secondBreakaway).toBe(2);
    expect(result.secondPrestigeCost).toBeLessThan(
      result.firstPrestigeCost);
    expect(result.hostileBreakaway).toBeGreaterThan(
      result.baseBreakaway);
    expect(result.standingsRecorded).toBe(true);
  });

test('defensive and repaired wars make the enemy ruler Hostile once',
  async function ({ page }, testInfo) {
    await startWarGame(page, testInfo);
    var ids = await configureAggressionWar(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      FB.setRealmRulerStanding(s, setup.enemyId, 45);
      p.war = {
        enemy:setup.enemyId, target:null, defending:true,
        wins:0, losses:0, seasons:0
      };
      FB.warFooting(s);
      var defensive = FB.standingOf(s, {
        kind:'realm', id:setup.enemyId
      });
      var stamped = p.war.enemyStandingApplied;
      FB.setRealmRulerStanding(s, setup.enemyId, -55);
      FB.warFooting(s);
      var noRepeatedDrain = FB.standingOf(s, {
        kind:'realm', id:setup.enemyId
      });

      FB.endPlayerWar(s);
      FB.setRealmRulerStanding(s, setup.enemyId, 30);
      p.war = {
        enemy:setup.enemyId, target:null, defending:true,
        wins:0, losses:0, seasons:0
      };
      FB.repairWars(s);
      return {
        defensive:defensive,
        stamped:stamped,
        noRepeatedDrain:noRepeatedDrain,
        repaired:FB.standingOf(s, {
          kind:'realm', id:setup.enemyId
        }),
        repairStamped:p.war && p.war.enemyStandingApplied
      };
    }, ids);

    expect(result).toEqual({
      defensive:-60,
      stamped:1,
      noRepeatedDrain:-55,
      repaired:-60,
      repairStamped:1
    });
  });

test('war status names every opposing realm', async function ({ page }, testInfo) {
  test.slow();
  await startWarGame(page, testInfo);
  var ids = await configureAggressionWar(page);
  var result = await page.evaluate(function (setup) {
    var s = FB.state;
    var cause = FB.warCauses(s, false, true).filter(function (item) {
      return item.target === setup.targetId;
    })[0];
    FB.startPlayerWar(s, cause, { confirmAggression:true });
    var playerOpponents = FB.warOpponents(s, 'player');
    var enemyOpponents = FB.warOpponents(s, setup.enemyId);
    var playerStatus = FB.warStatusText(s, 'player');
    FB.endPlayerWar(s);
    s.realms[setup.foreignId].war = { enemy:setup.enemyId };
    var foreignOpponents = FB.warOpponents(s, setup.foreignId);
    var enemyForeignOpponents = FB.warOpponents(s, setup.enemyId);
    var foreignStatus = FB.warStatusText(s, setup.foreignId);
    s.realms[setup.foreignId].war = null;
    s.greatHolyWar = {
      id:'war-status-labels', phase:'active',
      participants:{
        attackers:[{ realm:'player', sovereign:true }],
        defenders:[
          { realm:setup.enemyId, sovereign:true },
          { realm:setup.foreignId, sovereign:true }
        ]
      }
    };
    var holyWarOpponents = FB.warOpponents(s, 'player');
    var holyWarStatus = FB.warStatusText(s, 'player');
    var holyWarLock = FB.warLockedReason(s);
    s.greatHolyWar = null;
    return {
      playerOpponents:playerOpponents,
      enemyOpponents:enemyOpponents,
      playerRealmName:s.realms[FB.playerRealmId(s)].name,
      playerStatus:playerStatus,
      foreignOpponents:foreignOpponents,
      enemyForeignOpponents:enemyForeignOpponents,
      foreignStatus:foreignStatus,
      holyWarOpponents:holyWarOpponents,
      holyWarStatus:holyWarStatus,
      holyWarLock:holyWarLock
    };
  }, ids);

  expect(result.playerOpponents).toEqual([ids.enemyId]);
  expect(result.enemyOpponents).toEqual(['player']);
  expect(result.playerStatus).toBe(
    result.playerRealmName + ' is at war with ' + ids.enemyName + '.');
  expect(result.foreignOpponents).toEqual([ids.enemyId]);
  expect(result.enemyForeignOpponents).toEqual([ids.foreignId]);
  expect(result.foreignStatus).toBe('Blue Crown is at war with Red March.');
  expect(result.holyWarOpponents).toEqual([ids.enemyId, ids.foreignId]);
  expect(result.holyWarStatus).toBe(result.playerRealmName +
    ' is at war with Red March, Blue Crown.');
  expect(result.holyWarLock).toBe(result.holyWarStatus);
});

test('war notices lead unified ruler sheets and the Land tab',
  async function ({ page }, testInfo) {
    await startWarGame(page, testInfo);
    var ids = await configureAggressionWar(page);
    var setup = await page.evaluate(function (data) {
      var s = FB.state;
      s.player.panelIntrosSeen = s.player.panelIntrosSeen || {};
      s.player.panelIntrosSeen.prov = 1;
      s.player.roleOrientationsSeen =
        s.player.roleOrientationsSeen || {};
      s.player.roleOrientationsSeen['role-tier-' + s.player.tier] = 1;
      s.realms[data.foreignId].war = {
        enemy:data.enemyId,
        casus:{ type:'border', label:'Border war' }
      };
      FB.ui.showLiegeModal(data.foreignId);
      return {
        muster:FB.T('Realm muster: ~{troops}', {
          troops:FB.ui._shared.menText(s,
            FB.aiBaseHost(s, data.foreignId))
        }),
        foreignRuler:s.realms[data.foreignId].ruler.name,
        enemyRuler:s.realms[data.enemyId].ruler.name
      };
    }, ids);

    var sheet = page.locator('.character-interaction-modal');
    await expect(sheet.locator('.realm-ruler-card .realm-ruler-muster'))
      .toHaveText(setup.muster);
    await expect(sheet.locator(
      '[data-current-war] [data-war-realm]'))
      .toHaveCount(2);
    await expect(sheet.locator(
      '#gm-body > .charcard + [data-current-war]')).toBeVisible();
    await expect(sheet.locator('.character-war-goal')).toHaveCount(2);
    await expect(sheet.locator('.character-war-goal').nth(0))
      .toContainText('Goal: Blue Crown');
    await expect(sheet.locator('.character-war-goal').nth(0))
      .toContainText('Seize border territory from Red March.');
    await expect(sheet.locator('.character-war-goal').nth(1))
      .toContainText('Goal: Red March');
    await expect(sheet.locator('.character-war-goal').nth(1))
      .toContainText('Repel Blue Crown and hold the border.');
    await sheet.locator('[data-war-realm="' + ids.enemyId + '"]').click();
    await expect(sheet.locator('.realm-ruler-card .ccname')).toContainText(
      setup.enemyRuler);
    await expect(sheet.locator('.character-war-goal').nth(0))
      .toContainText('Goal: Blue Crown');
    await expect(sheet.locator('.character-war-goal').nth(1))
      .toContainText('Goal: Red March');

    await page.evaluate(function (data) {
      FB.ui.closeModal();
      FB.ui.showLiegeModal(data.foreignId);
    }, ids);
    await waitForUiRefresh(page);
    await sheet.locator('[data-war-realm="' + ids.foreignId + '"]').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {
      return FB.map.selected;
    })).toBe(ids.foreignCountyId);

    await expect(page.locator('#tab-prov [data-war-realm]')).toHaveCount(2);
    await expect(page.locator(
      '#tab-prov > .panelh + .land-current-war')).toBeVisible();
    await page.locator(
      '#tab-prov [data-war-realm="' + ids.foreignId + '"]').click();
    await expect(page.locator(
      '.character-interaction-modal .realm-ruler-card .ccname')).toContainText(
      setup.foreignRuler);

    await page.evaluate(function (data) {
      FB.ui.closeModal();
      FB.ui.selectProvince(data.foreignCountyId);
    }, ids);
    await waitForUiRefresh(page);
    await page.locator(
      '#tab-prov [data-war-realm="' + ids.enemyId + '"]').click();
    await expect(page.locator(
      '.character-interaction-modal .realm-ruler-card .ccname')).toContainText(
      setup.enemyRuler);
  });

test('aggressive conquest grants no victory prestige and burdens the county',
  async function ({ page }, testInfo) {
    await startWarGame(page, testInfo);
    var ids = await configureAggressionWar(page);
    var result = await page.evaluate(function (setup) {
      var s = FB.state;
      var p = s.player;
      var cause = FB.warCauses(s, false, true).filter(function (item) {
        return item.target === setup.targetId;
      })[0];
      FB.startPlayerWar(s, cause, { confirmAggression:true });
      var afterDeclaration = p.prestige;
      p.tier = 7;
      s.realms.player.rank = 4;
      var strongpoint = FB.fortSiegeStatus(s, setup.targetId, {}, 0);
      p.war.siegeFortLevel = strongpoint.level;
      p.war.siege = strongpoint.required;
      FB.warCapture(s);
      var records = FB.countyModifierRecords(s, setup.targetId);
      var record = records.filter(function (item) {
        return item.id === 'conquered_without_right';
      })[0];
      var effects = {
        tax:FB.modBonus(s, 'tax', setup.targetId),
        levy:FB.modBonus(s, 'levy', setup.targetId),
        commonVoice:FB.modBonus(s, 'commonVoice', setup.targetId),
        unrest:FB.modBonus(s, 'unrest', setup.targetId)
      };
      var expectedEnd = s.turn +
        FBDATA.modifiers.conquered_without_right.days;
      var endTurn = record && record.endTurn;
      s.turn = endTurn;
      FB.modifierTick(s);
      return {
        owner:s.owner[setup.targetId],
        holder:s.holder[setup.targetId],
        war:p.war,
        victoryPrestige:p.prestige - afterDeclaration,
        recordId:record && record.id,
        endTurn:endTurn,
        expectedEnd:expectedEnd,
        effects:effects,
        expired:!FB.hasModifier(
          s, 'conquered_without_right', setup.targetId)
      };
    }, ids);

    expect(result.owner).toBe('player');
    expect(result.holder).toBe('player');
    expect(result.war).toBe(null);
    expect(result.victoryPrestige).toBe(0);
    expect(result.recordId).toBe('conquered_without_right');
    expect(result.endTurn).toBe(result.expectedEnd);
    expect(result.effects).toEqual({
      tax:-0.15,
      levy:-0.20,
      commonVoice:-8,
      unrest:0.40
    });
    expect(result.expired).toBe(true);
  });

test('the Guide exposes aggression through search and the conquest picker',
  async function ({ page }, testInfo) {
    await startWarGame(page, testInfo);
    var ids = await configureAggressionWar(page);
    await page.evaluate(function () {
      FB.ui.showGuide({ query:'aggression' });
    });

    var result = page.locator('[data-guide-entry="war"]');
    await expect(result).toBeVisible();
    await expect(result).toContainText('War, claims, and conquest');
    await result.click();
    await expect(result).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('heading', { name:'Guide', exact:true }))
      .toBeVisible();
    await expect(page.locator('#genmodal')).toContainText(
      'War of Aggression');
    await expect(page.locator('#genmodal')).toContainText(
      'Conquered Without Right');
    await expect(page.locator('#genmodal')).toContainText(
      'three siege steps');

    await page.evaluate(function (enemyId) {
      FB.ui.showWarTargets(enemyId);
    }, ids.enemyId);
    var guideButton = page.getByRole('button', {
      name:'Guide: war',
      exact:true
    });
    await expect(guideButton).toBeVisible();
    await expect(guideButton).toHaveClass(/modal-guide-button/);
    await expect(page.locator('#genmodal .gm-heading > #war-guide')).toHaveCount(1);
    await expect(page.locator('#genmodal .gm-footer #war-guide')).toHaveCount(0);
    await guideButton.click();
    result = page.locator('[data-guide-entry="war"]');
    await expect(result).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('heading', { name:'Guide', exact:true }))
      .toBeVisible();
  });

test('war picker names aggression and requires its consequence sheet',
  async function ({ page }, testInfo) {
    await startWarGame(page, testInfo);
    var ids = await configureAggressionWar(page);
    await page.evaluate(function (enemyId) {
      FB.ui.showWarTargets(enemyId);
    }, ids.enemyId);

    var row = page.locator(
      '[data-war-cause-type="aggression"][data-war-cause-target="' +
      ids.targetId + '"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('War of Aggression');
    await expect(row).toContainText('Conquered Without Right');
    await row.click();

    await expect(page.getByRole('heading', {
      name:'Declare a War of Aggression?',
      exact:true
    })).toBeVisible();
    await expect(page.locator('#genmodal')).toContainText(
      'This war has no recognized right.');
    await expect(page.locator('#genmodal')).toContainText(ids.enemyName);
    await expect(page.locator('#genmodal')).toContainText(ids.targetName);
    await expect(page.locator('#genmodal')).toContainText(
      'Immediate consequences');
    await expect(page.locator('#genmodal')).toContainText(
      'Continuing consequences');
    await expect(page.locator('#genmodal')).toContainText(
      'Conquered Without Right');
    await expect(page.locator('#genmodal')).toContainText(
      'Most likely opposition');

    var beforeConfirm = await page.evaluate(function () {
      return {
        war:FB.state.player.war,
        history:FB.state.player.aggressiveWars.length
      };
    });
    expect(beforeConfirm).toEqual({ war:null, history:0 });

    await page.getByRole('button', {
      name:'Think better of it',
      exact:true
    }).click();
    await expect(page.getByRole('heading', {
      name:'Choose Your Conquest',
      exact:true
    })).toBeVisible();
    var afterCancel = await page.evaluate(function () {
      return {
        war:FB.state.player.war,
        history:FB.state.player.aggressiveWars.length
      };
    });
    expect(afterCancel).toEqual({ war:null, history:0 });
    await row.click();

    await page.getByRole('button', {
      name:/Accept the consequences and declare war/
    }).click();
    var afterConfirm = await page.evaluate(function () {
      return {
        type:FB.state.player.war && FB.state.player.war.casus.type,
        history:FB.state.player.aggressiveWars.length
      };
    });
    expect(afterConfirm).toEqual({ type:'aggression', history:1 });
  });
