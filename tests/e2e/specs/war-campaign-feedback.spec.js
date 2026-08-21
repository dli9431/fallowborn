'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js',
  'js/events.js',
  'js/ui_modals.js',
  'data/events_war.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startCampaignGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var homeId = p.provinceId;
    var enemyId = Object.keys(s.realms).filter(function (rid) {
      return rid !== 'player' && s.realms[rid] && s.realms[rid].alive &&
        !s.realms[rid].liege;
    })[0];
    p.tier = 4;
    p.liege = null;
    p.provs = [homeId];
    p.gold = 500;
    p.prestige = 100;
    s.owner[homeId] = 'player';
    s.holder[homeId] = 'player';
    FB.foundPlayerRealm(s);
    s.realms.player.rank = 1;
    s.realms.player.liege = null;
    s.realms.player.capital = homeId;
    p.war = {
      enemy:enemyId,
      target:s.realms[enemyId].capital,
      wins:0,
      losses:0,
      seasons:2,
      defending:false,
      strength:1,
      casus:{ type:'fabricated' }
    };
    s.armies = [{
      id:'campaign-feedback-host',
      realm:'player',
      men:500,
      size:500,
      units:{ levy:300, arch:80, cav:40, ret:50, mercs:30 },
      at:homeId,
      from:homeId,
      moveLeft:0,
      path:[],
      goal:null
    }];
    s.eventQueue = [];
    FB.ensurePlayerWarFeedback(s);
    FB.ui.refresh();
    return { enemyId:enemyId, homeId:homeId };
  });
}

test('filtered declarations initialize campaign feedback and preserve the catalogue after withdrawal',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    var setup = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var home = null;
      var target = null;
      for (var i = 0; i < FB.world.provs.length; i++) {
        var province = FB.world.provs[i];
        if (province.wasteland) continue;
        var neighbors = Object.keys(FB.world.adj[province.id] || {}).filter(
          function (id) {
            return FB.world.byId[id] && !FB.world.byId[id].wasteland;
          });
        if (neighbors.length) {
          home = province;
          target = neighbors[0];
          break;
        }
      }
      s.realms.integration_enemy = {
        id:'integration_enemy', name:'Campaign Test March', color:'#784336',
        capital:target, aggression:0, rank:1, liege:null, alive:true, favor:0,
        religion:me.religion,
        ruler:{
          name:'Osric Campaigner', sex:'m', culture:me.culture, age:42,
          mar:7, trait:'ambitious', generation:1
        }
      };
      p.tier = 4;
      p.liege = null;
      p.provinceId = home.id;
      p.provs = [home.id];
      p.gold = 500;
      p.prestige = 100;
      p.war = null;
      p.greatHolyWar = null;
      s.greatHolyWar = null;
      s.owner[home.id] = 'player';
      s.holder[home.id] = 'player';
      s.owner[target] = 'integration_enemy';
      s.holder[target] = 'integration_enemy';
      s.dev[target] = 7;
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 1;
      s.realms.player.capital = home.id;
      p.fabricatedClaim = { pid:target, madeTurn:s.turn };
      s.pacts = {};
      s.alliances = [];
      FB.invalidateRealmCache();
      FB.ui.showWarTargets();
      return { target:target };
    });

    await page.locator('#war-target-basis').selectOption('claim');
    var targetRow = page.locator('[data-war-cause-target="' +
      setup.target + '"]');
    await expect(targetRow).toBeVisible();
    await targetRow.click();

    var active = await page.evaluate(function () {
      var s = FB.state;
      var feedback = FB.warFeedback(s);
      return {
        cause:s.player.war && s.player.war.casus.type,
        battles:s.player.war && s.player.war.battles,
        effects:s.player.war && s.player.war.effects,
        losses:s.player.war && s.player.war.lossesByClass,
        hostMen:feedback && feedback.host && feedback.host.men,
        upkeep:feedback && feedback.upkeep.total,
        summary:FB.warStateText(s)
      };
    });
    expect(active.cause).toBe('fabricated');
    expect(active.battles).toEqual([]);
    expect(active.effects).toEqual([]);
    // loss records are keyed by every unit class (data/units.js); assert the
    // baseline five without demanding the exact key set
    expect(active.losses).toMatchObject({
      levy:0, arch:0, cav:0, ret:0, mercs:0
    });
    expect(active.hostMen).toBeGreaterThan(0);
    expect(active.upkeep).toBeGreaterThan(0);
    expect(active.summary).toContain('Your host:');
    expect(active.summary).not.toContain('not yet mustered');
    expect(active.summary).toContain('at ');
    expect(active.summary).not.toContain('Battle record');

    await page.evaluate(function () {
      var s = FB.state;
      FB.fns.war_negotiated_withdrawal(s);
      s.armies = (s.armies || []).filter(function (army) {
        return army.realm !== 'player';
      });
      FB.ui.showWarTargets();
    });
    await expect(page.locator('#war-target-basis')).toHaveValue('claim');
    await expect(page.locator('[data-war-cause-target="' +
      setup.target + '"]')).toBeVisible();
    await expect(page.locator('#war-guide')).toBeVisible();
  });

test('campaign feedback shares battle, class-loss, effect, and upkeep facts',
  async function ({ page }, testInfo) {
    await startCampaignGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      function fieldLoss(amount) {
        var host = FB.playerHost(s);
        var before = host.men;
        var losses = FB.applyHostLosses(host, amount);
        FB.fns.war_loss(s, { battleRecord:{
          turn:s.turn, outcome:'loss', mode:'field', pid:host.at,
          playerBefore:before, playerAfter:host.men,
          enemyBefore:420, enemyAfter:360,
          playerLosses:losses,
          enemyLosses:{ levy:60, arch:0, cav:0, ret:0, mercs:0 }
        }}, FB.eventById('field_battle_lost'));
        return losses;
      }
      var first = fieldLoss(100);
      s.turn += 20;
      var second = fieldLoss(80);
      FB.fns.war_supply(s, {}, FB.eventById('war_grain_seller'));
      var feedback = FB.warFeedback(s);
      var upkeep = FB.playerHostUpkeepParts(s);
      var summary = FB.warStateText(s);
      FB.ui.showTab('actions');
      return {
        first:first,
        second:second,
        battles:feedback.battles.map(function (battle) {
          return battle.outcome;
        }),
        streak:feedback.streak,
        losses:feedback.losses,
        lossTotal:feedback.lossTotal,
        effect:feedback.effects[feedback.effects.length - 1],
        upkeep:feedback.upkeep,
        authoritativeUpkeep:upkeep,
        summary:summary,
        deserters:FB.warDeserterStatus(s)
      };
    });

    expect(result.first).toMatchObject({
      total:100, levy:100, arch:0, cav:0, ret:0, mercs:0
    });
    expect(result.second).toMatchObject({
      total:80, levy:80, arch:0, cav:0, ret:0, mercs:0
    });
    expect(result.battles).toEqual(['loss', 'loss']);
    expect(result.streak).toEqual({ outcome:'loss', count:2 });
    expect(result.losses).toMatchObject({
      levy:180, arch:0, cav:0, ret:0, mercs:0
    });
    expect(result.lossTotal).toBe(180);
    expect(result.effect).toMatchObject({
      source:'war_grain_seller',
      condition:'supply',
      target:'strength',
      troopTotal:0
    });
    expect(result.upkeep).toEqual(result.authoritativeUpkeep);
    expect(result.deserters).toMatchObject({
      eligible:true,
      recentDefeat:true,
      intervalReady:true,
      lossTotal:180
    });
    // the injected event summary stays compact; the panels carry the detail
    expect(result.summary).toContain('Your host:');
    expect(result.summary).toContain('2-defeat streak');
    expect(result.summary).toContain('Logistics:');
    expect(result.summary).not.toContain('Battle record');
    expect(result.summary).not.toContain('Campaign losses');
    expect(result.summary).not.toContain('Campaign effects');
    await expect(page.locator('#tab-actions')).toContainText('Battle record');
    await expect(page.locator('#tab-actions')).toContainText(
      'Campaign losses from the live host');
    await page.evaluate(function () {
      FB.selectArmy('campaign-feedback-host');
      FB.ui.showTab('prov');
      FB.ui.refresh();
    });
    await expect(page.locator('#tab-prov')).toContainText('Battle record');
    await expect(page.locator('#tab-prov')).toContainText(
      'Campaign losses from the live host');
  });

test('Empty Bedrolls is loss-aware and seeded desertion changes live troops',
  async function ({ page }, testInfo) {
    await startCampaignGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var event = FB.eventById('war_deserters');
      var beforeLoss = FB.fns.war_deserters_due(s);
      var hostForLoss = FB.playerHost(s);
      var before = hostForLoss.men;
      var recordedLosses = FB.applyHostLosses(hostForLoss, 100);
      FB.fns.war_loss(s, { battleRecord:{
        turn:s.turn, outcome:'loss', mode:'field', pid:hostForLoss.at,
        playerBefore:before, playerAfter:hostForLoss.men,
        enemyBefore:420, enemyAfter:360,
        playerLosses:recordedLosses,
        enemyLosses:{ levy:60, arch:0, cav:0, ret:0, mercs:0 }
      }}, FB.eventById('field_battle_lost'));
      var status = FB.warDeserterStatus(s);
      var label = FB.eventText(
        s, s.player.charId, event, 'options.1.label', {});
      var snapshot = JSON.stringify(s);
      function desertOnce() {
        var copy = JSON.parse(snapshot);
        FB.setRngState(246813579);
        FB.fns.war_desert(copy, {}, event);
        var host = FB.playerHost(copy);
        var effect = copy.player.war.effects[
          copy.player.war.effects.length - 1];
        return {
          men:host.men,
          units:host.units,
          effect:effect,
          interval:FB.warDeserterStatus(copy).intervalReady
        };
      }
      var first = desertOnce();
      var second = desertOnce();
      var paid = JSON.parse(snapshot);
      var pay = FB.warDeserterPayment(paid);
      var goldBefore = paid.player.gold;
      var menBefore = FB.playerHost(paid).men;
      FB.fns.war_pay_deserters(paid, {}, event);
      var allocationHost = {
        men:100,
        units:{ levy:20, arch:20, cav:20, ret:20, mercs:20 }
      };
      var allocation = FB.applyHostLosses(allocationHost, 65);
      return {
        beforeLoss:beforeLoss,
        afterLoss:FB.fns.war_deserters_due(s),
        status:status,
        label:label,
        first:first,
        second:second,
        payment:pay,
        goldSpent:goldBefore - paid.player.gold,
        paidMen:FB.playerHost(paid).men,
        menBefore:menBefore,
        minRate:FBDATA.balance.warDeserterLossMin,
        maxRate:FBDATA.balance.warDeserterLossMax,
        allocation:allocation,
        paidEffect:paid.player.war.effects[
          paid.player.war.effects.length - 1]
      };
    });

    expect(result.beforeLoss).toBe(false);
    expect(result.afterLoss).toBe(true);
    expect(result.status.eligible).toBe(true);
    expect(result.label).toContain(String(result.payment));
    expect(result.first).toEqual(result.second);
    expect(result.first.effect).toMatchObject({
      source:'war_deserters',
      condition:'desertion',
      target:'troops'
    });
    expect(result.first.effect.rate).toBeGreaterThanOrEqual(
      result.minRate);
    expect(result.first.effect.rate).toBeLessThanOrEqual(
      result.maxRate);
    expect(result.first.units.arch).toBe(80);
    expect(result.first.units.cav).toBe(40);
    expect(result.first.units.ret).toBe(50);
    expect(result.first.units.mercs).toBe(30);
    // the allocator result is keyed by every unit class (data/units.js);
    // assert the baseline five without demanding the exact key set
    expect(result.allocation).toMatchObject({
      total:65, levy:20, arch:20, cav:5, ret:0, mercs:20
    });
    expect(result.first.interval).toBe(false);
    expect(result.goldSpent).toBe(result.payment);
    expect(result.paidMen).toBe(result.menBefore);
    expect(result.paidEffect).toMatchObject({
      source:'war_deserters',
      condition:'supply',
      target:'strength'
    });
  });

test('visible and autoresolved campaign choices use the same effects',
  async function ({ page }, testInfo) {
    await startCampaignGame(page, testInfo);
    var result = await page.evaluate(function () {
      var event = FB.eventById('war_grain_seller');
      var baseline = JSON.parse(FB.save.serialize());
      var oldAuto = FB.game.auto;
      FB.game.auto = {
        all:true,
        minor:true,
        major:true,
        war:true,
        style:'first'
      };
      FB.ui.runEvents([{ id:event.id, ctx:{}, rnd:true }]);
      var autoEffect = FB.state.player.war.effects[
        FB.state.player.war.effects.length - 1];
      var automated = {
        gold:FB.state.player.gold,
        strength:FB.state.player.war.strength,
        effect:autoEffect
      };

      FB.save.restore(baseline);
      event = FB.eventById('war_grain_seller');
      FB.applyEffects(FB.state, event.options[0].effects, {}, event);
      var visibleEffect = FB.state.player.war.effects[
        FB.state.player.war.effects.length - 1];
      var visible = {
        gold:FB.state.player.gold,
        strength:FB.state.player.war.strength,
        effect:visibleEffect
      };
      FB.game.auto = oldAuto;
      return { automated:automated, visible:visible };
    });

    expect(result.automated).toEqual(result.visible);
    expect(result.visible.effect).toMatchObject({
      source:'war_grain_seller',
      condition:'supply',
      target:'strength'
    });
  });

test('whole-war withdrawals mutate live and campaign state',
  async function ({ page }, testInfo) {
    var setup = await startCampaignGame(page, testInfo);
    var result = await page.evaluate(function (ids) {
      var s = FB.state;
      var host = FB.playerHost(s);
      s.player.war.defending = true;
      host.allied = { ally:ids.enemyId, men:80 };
      var before = FB.fns.war_has_allied_host(s);
      FB.fns.war_allied_withdrawal(
        s, {}, FB.eventById('war_allied_hesitation'));
      var effect = s.player.war.effects[s.player.war.effects.length - 1];
      var facts = {
        before:before,
        after:FB.fns.war_has_allied_host(s),
        men:host.men,
        size:host.size,
        units:host.units,
        allied:host.allied,
        withdrew:s.player.war.alliedWithdrew,
        losses:s.player.war.lossesByClass,
        effect:effect
      };
      var prestigeBefore = s.player.prestige;
      FB.fns.war_negotiated_withdrawal(s);
      facts.negotiated = {
        war:s.player.war,
        prestigeSpent:prestigeBefore - s.player.prestige
      };
      return facts;
    }, setup);

    expect(result.before).toBe(true);
    expect(result.after).toBe(false);
    expect(result.men).toBe(420);
    expect(result.size).toBe(420);
    expect(result.units.levy).toBe(220);
    expect(result.allied).toBeNull();
    expect(result.withdrew).toBe(1);
    expect(result.losses.levy).toBe(80);
    expect(result.effect).toMatchObject({
      source:'war_allied_hesitation',
      condition:'thin_ranks',
      target:'both',
      troopTotal:80
    });
    expect(result.negotiated).toEqual({ war:null, prestigeSpent:4 });
  });

test('the military writing tranche covers personal, host, and whole-war scales',
  async function ({ page }, testInfo) {
    await startCampaignGame(page, testInfo);
    expect(await page.evaluate(function () {
      var groups = {
        personal:[
          'campaign_fear_before_dawn',
          'campaign_wound_watch',
          'campaign_orders_in_mud',
          'campaign_camp_fever',
          'campaign_name_on_the_roll'
        ],
        host:[
          'war_pay_chest',
          'war_grain_seller',
          'war_camp_discipline',
          'war_deserters',
          'war_officers_divided',
          'war_camp_followers',
          'war_local_requisition'
        ],
        war:[
          'war_objective_council',
          'war_allied_hesitation',
          'war_enemy_concessions',
          'war_public_exhaustion',
          'war_occupation_policy',
          'war_negotiated_withdrawal'
        ]
      };
      var result = {};
      Object.keys(groups).forEach(function (group) {
        result[group] = groups[group].every(function (id) {
          var event = FB.eventById(id);
          return !!(event && event.wartime && event.options.length >= 2);
        });
      });
      return result;
    })).toEqual({ personal:true, host:true, war:true });
  });
