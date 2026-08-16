'use strict';

/* Strategic fortifications. These tests are authored for the owner-run
   Playwright harness and deliberately do not execute in the authoring flow. */

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.use({
  viewport:{ width:390, height:844 },
  hasTouch:true
});

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('projects pay upfront, upgrade sequentially, transfer, and repair legacy Walls',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const pid = p.provinceId;
      const rid = FB.techRealmId(s, 'player');
      const technology = FB.realmTechRecord(s, rid);
      const allTech = [
        'ringworks', 'castle_towers', 'stone_castles',
        'concentric_defenses', 'fortified_gates'
      ];
      p.tier = 4;
      p.provs = [pid];
      s.holder[pid] = 'player';
      s.buildings[pid] = (s.buildings[pid] || []).filter(function (entry) {
        return !(entry && (entry.id === 'walls' || entry === 'walls'));
      });
      technology.completed = technology.completed.filter(function (id) {
        return allTech.indexOf(id) < 0;
      });
      FB.invalidateFortIndex();

      const locked = FB.fortProjectStatus(s, pid, 0, 1);
      technology.completed = technology.completed.concat(allTech);
      p.gold = 2000;
      const goldBefore = p.gold;
      const prestigeBefore = p.prestige;
      const project = FB.startFortProject(s, pid, 0, 1);
      const otherSite = FB.settlementsOf(s, pid).length > 1
        ? FB.fortProjectStatus(s, pid, 1, 1) : null;
      const duringBuild = {
        level:project.level,
        targetLevel:project.targetLevel,
        paid:goldBefore - p.gold,
        duration:project.completeTurn - s.turn,
        defense:FB.fortBattleBonus(s, pid, { realm:'player' }),
        burden:FB.fortGarrisonBurden(s, 'player')
      };
      s.turn = project.completeTurn;
      FB.fortificationDay(s);
      const afterFirst = {
        level:project.level,
        prestige:p.prestige - prestigeBefore,
        burden:FB.fortGarrisonBurden(s, 'player'),
        upkeep:FB.fortUpkeep(s),
        defense:FB.fortBattleBonus(s, pid, { realm:'player' })
      };

      const upgradeTurn = s.turn;
      const upgrade = FB.startFortProject(s, pid, 0, 2);
      const activeDuringUpgrade = {
        level:upgrade.level,
        targetLevel:upgrade.targetLevel,
        duration:upgrade.completeTurn - upgradeTurn,
        burden:FB.fortGarrisonBurden(s, 'player')
      };
      const heir = FB.heirsOf(s)[0] ||
        FB.siblingsOf(s, s.chars[p.charId])[0];
      if (heir) heir.dead = false;
      const succeeded = !!heir && FB.game.succeedTo(heir.id, {
        livingAbdication:true
      });
      const successionContinuity = {
        succeeded:succeeded,
        sameRecord:FB.fortAt(s, pid) === upgrade,
        targetLevel:upgrade.targetLevel,
        completeTurn:upgrade.completeTurn
      };
      const enemy = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive;
      })[0];
      s.holder[pid] = enemy;
      s.owner[pid] = FB.topRealm(s, enemy);
      s.turn = upgrade.completeTurn;
      FB.fortificationDay(s);
      const afterConquest = {
        level:upgrade.level,
        stillThere:FB.fortAt(s, pid) === upgrade,
        projectFinished:upgrade.targetLevel === undefined
      };

      s.holder[pid] = 'player';
      s.owner[pid] = 'player';
      p.provs = [pid];
      const demolition = FB.demolishFort(s, pid, 0);
      const afterDemolition = {
        demolition:demolition,
        ruined:upgrade.ruined,
        level:upgrade.level,
        projectCleared:upgrade.targetLevel === undefined
      };

      s.buildings[pid] = [{ s:0, id:'walls' }];
      const legacyTurn = s.turn;
      FB.invalidateFortIndex();
      FB.repairForts(s);
      const legacy = FB.fortAt(s, pid);
      const graceUpkeep = FB.fortUpkeep(s);
      s.turn = legacy.maintenanceGraceUntil + 1;
      const normalUpkeep = FB.fortUpkeep(s);

      return {
        locked:locked,
        duringBuild:duringBuild,
        otherSite:otherSite,
        afterFirst:afterFirst,
        activeDuringUpgrade:activeDuringUpgrade,
        successionContinuity:successionContinuity,
        afterConquest:afterConquest,
        afterDemolition:afterDemolition,
        legacy:{
          level:legacy.level,
          grace:legacy.maintenanceGraceUntil - legacyTurn,
          graceUpkeep:graceUpkeep,
          normalUpkeep:normalUpkeep
        }
      };
    });

    expect(result.locked).toMatchObject({
      ok:false, reason:'technology', missingTech:['ringworks']
    });
    expect(result.duringBuild).toEqual({
      level:0, targetLevel:1, paid:120, duration:180,
      defense:0, burden:0
    });
    if (result.otherSite) {
      expect(result.otherSite).toMatchObject({
        ok:false, reason:'other_settlement'
      });
    }
    expect(result.afterFirst).toEqual({
      level:1, prestige:10, burden:40, upkeep:2, defense:0.05
    });
    expect(result.activeDuringUpgrade).toEqual({
      level:1, targetLevel:2, duration:270, burden:40
    });
    expect(result.successionContinuity).toMatchObject({
      succeeded:true, sameRecord:true, targetLevel:2
    });
    expect(result.successionContinuity.completeTurn).toBeGreaterThan(0);
    expect(result.afterConquest).toEqual({
      level:2, stillThere:true, projectFinished:true
    });
    expect(result.afterDemolition).toEqual({
      demolition:true, ruined:true, level:0, projectCleared:true
    });
    expect(result.legacy).toEqual({
      level:3, grace:360, graceUpkeep:1, normalUpkeep:8
    });
  });

test('routes bypass strongpoints, stop at unavoidable forts, and clear stale orders',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const oldWorld = FB.world;
      FB.world = {
        adj:{
          a:{ b:1, c:1 }, b:{ a:1, d:1 },
          c:{ a:1, d:1 }, d:{ b:1, c:1 }
        },
        waterAdj:{},
        byId:{
          a:{ id:'a', name:'A' }, b:{ id:'b', name:'B' },
          c:{ id:'c', name:'C' }, d:{ id:'d', name:'D' }
        }
      };
      s.owner = { a:'player', b:'enemy', c:'enemy', d:'enemy' };
      s.holder = { a:'player', b:'enemy', c:'enemy', d:'enemy' };
      s.player.provs = ['a'];
      s.buildings = { b:[{ s:0, id:'walls', level:1 }] };
      FB.invalidateFortIndex();
      const host = {
        id:'route-host', realm:'player', men:300,
        units:{ levy:300, arch:0, cav:0, ret:0, mercs:0 },
        at:'a', from:'a', path:[], goal:null, moveLeft:0
      };
      const around = FB.findArmyPath(s, host, 'd');

      FB.world = {
        adj:{
          a:{ b:1, c:1 }, b:{ a:1, d:1 }, c:{ a:1 }, d:{ b:1 }
        },
        waterAdj:FB.world.waterAdj,
        byId:FB.world.byId
      };
      const unavoidable = FB.findArmyPath(s, host, 'd');
      host.at = 'b';
      host.from = 'a';
      const pinned = FB.fortPinnedStatus(s, host);
      const forbidden = FB.findArmyPath(s, host, 'd');
      const retreat = FB.findArmyPath(s, host, 'a');
      s.holder.d = 'player';
      const friendlyExit = FB.findArmyPath(s, host, 'd');

      const completing = s.buildings.b[0];
      completing.level = 0;
      completing.targetLevel = 1;
      completing.completeTurn = s.turn;
      host.path = ['d'];
      host.goal = 'd';
      host.moveLeft = 5;
      s.holder.d = 'enemy';
      s.armies = [host];
      FB.invalidateFortIndex();
      FB.fortificationDay(s);
      const staleCleared = {
        path:host.path.slice(), goal:host.goal, moveLeft:host.moveLeft
      };
      FB.world = oldWorld;
      return {
        around:around,
        unavoidable:unavoidable,
        pinned:pinned,
        forbidden:forbidden,
        retreat:retreat,
        friendlyExit:friendlyExit,
        staleCleared:staleCleared
      };
    });

    expect(result.around.path).toEqual(['c', 'd']);
    expect(result.around.routedAroundForts).toContain('b');
    expect(result.unavoidable).toMatchObject({
      path:['b'], blockedByFort:'b'
    });
    expect(result.pinned).toMatchObject({
      pid:'b', level:1, retreat:'a', minimum:120
    });
    expect(result.forbidden).toBeNull();
    expect(result.retreat.path).toEqual(['a']);
    expect(result.friendlyExit.path).toEqual(['d']);
    expect(result.staleCleared).toEqual({ path:[], goal:null, moveLeft:0 });
  });

test('sieges enforce force, attrition, decay, snapshots, and breach-only transfer',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = p.provinceId;
      const enemy = Object.keys(s.realms).filter(function (id) {
        const realm = s.realms[id];
        return id !== 'player' && realm && realm.alive;
      })[0];
      const target = s.realms[enemy].capital;
      p.tier = 4;
      p.provs = [home];
      s.holder[home] = 'player';
      s.owner[home] = 'player';
      s.buildings[home] = [{ s:0, id:'walls', level:2 }];
      FB.invalidateFortIndex();

      function siegeHost(men) {
        return {
          id:'siege-' + men, realm:'player', men:men,
          units:{ levy:men, arch:0, cav:0, ret:0, mercs:0 },
          at:home, from:home, path:[], moveLeft:0
        };
      }
      const short = FB.fortSiegeStatus(s, home, { progress:0 }, 239);
      const host = siegeHost(240);
      const record = { progress:0 };
      const first = FB.advanceFortSiegePulse(s, home, record, {
        hosts:[host]
      });
      const second = FB.advanceFortSiegePulse(s, home, record, {
        hosts:[host]
      });

      const snapshotHost = siegeHost(1000);
      const snapshot = { progress:0 };
      FB.advanceFortSiegePulse(s, home, snapshot, { hosts:[snapshotHost] });
      s.buildings[home][0].level = 4;
      FB.invalidateFortIndex();
      const afterUpgrade = FB.fortSiegeStatus(s, home, snapshot, snapshotHost);
      const localDefense = FB.fortBattleBonus(s, home, { realm:'player' });

      s.buildings[target] = [{ s:0, id:'walls', level:1 }];
      FB.invalidateFortIndex();
      s.owner[target] = enemy;
      s.holder[target] = enemy;
      s.dev[target] = 5;
      p.war = {
        enemy:enemy, target:target, wins:0, losses:0, seasons:0,
        defending:false, siege:0, casus:{ type:'conquest', target:target }
      };
      const blockedCapture = FB.warCapture(s);
      const developmentWhileBlocked = s.dev[target];
      const targetStatus = FB.fortSiegeStatus(s, target, {}, 0);
      p.war.siegeFortLevel = targetStatus.level;
      p.war.siege = targetStatus.required;
      const captured = FB.warCapture(s);
      const developmentAfterCapture = s.dev[target];
      const intactAfterCapture = FB.fortAt(s, target).level;

      s.realms[enemy].alive = true;
      s.owner[target] = 'player';
      s.holder[target] = 'player';
      p.provs = [target];
      s.dev[target] = 5;
      p.war = {
        enemy:enemy, target:null, wins:0, losses:0, seasons:0,
        defending:true, enemyTarget:target, enemySiege:0,
        casus:{ type:'conquest' }
      };
      const submissionBlocked = FB.fns.war_submission_valid(s);
      p.flags.in_prison = 1;
      const cessionBlocked = FB.fns.prison_can_cede(s);
      delete p.flags.in_prison;
      const heldWithoutBreach = FB.warLoseProvince(s, target, false);
      const developmentWhileHeld = s.dev[target];
      const defenseStatus = FB.fortSiegeStatus(s, target, {}, 0);
      p.war.enemySiegeFortLevel = defenseStatus.level;
      p.war.enemySiege = defenseStatus.required;
      const lostAfterBreach = FB.warLoseProvince(s, target, true);
      const developmentAfterLoss = s.dev[target];

      s.owner[target] = enemy;
      s.holder[target] = enemy;
      p.provs = [home];
      p.war = {
        enemy:enemy, target:target, wins:0, losses:0, seasons:0,
        defending:false, siege:2, siegeFortLevel:1,
        lastSiegeTurn:s.turn - 181,
        casus:{ type:'conquest', target:target }
      };
      FB.playerWarTick(s);
      const decayed = p.war && p.war.siege;

      return {
        short:short,
        first:{ progress:record.progress, men:host.men,
          attrition:first.attrition, losses:first.losses.total },
        second:{ stalled:second.stalled, shortage:second.shortage, men:host.men },
        snapshot:{ level:snapshot.fortLevel, required:afterUpgrade.required },
        localDefense:localDefense,
        blockedCapture:blockedCapture,
        developmentWhileBlocked:developmentWhileBlocked,
        captured:captured,
        developmentAfterCapture:developmentAfterCapture,
        intactAfterCapture:intactAfterCapture,
        submissionBlocked:submissionBlocked,
        cessionBlocked:cessionBlocked,
        heldWithoutBreach:heldWithoutBreach,
        developmentWhileHeld:developmentWhileHeld,
        lostAfterBreach:lostAfterBreach,
        developmentAfterLoss:developmentAfterLoss,
        decayed:decayed
      };
    });

    expect(result.short).toMatchObject({
      level:2, minimum:240, shortage:1, canProgress:false, attrition:12,
      required:5
    });
    expect(result.first).toEqual({ progress:1, men:228, attrition:12, losses:12 });
    expect(result.second).toEqual({ stalled:'shortage', shortage:12, men:228 });
    expect(result.snapshot).toEqual({ level:2, required:5 });
    expect(result.localDefense).toBe(0.2);
    expect(result.blockedCapture).toBe(false);
    expect(result.developmentWhileBlocked).toBe(5);
    expect(result.captured).toBe(true);
    expect(result.developmentAfterCapture).toBe(4);
    expect(result.intactAfterCapture).toBe(1);
    expect(result.submissionBlocked).toBe(false);
    expect(result.cessionBlocked).toBe(false);
    expect(result.heldWithoutBreach).toBe(false);
    expect(result.developmentWhileHeld).toBe(5);
    expect(result.lostAfterBreach).toBe(true);
    expect(result.developmentAfterLoss).toBe(4);
    expect(result.decayed).toBe(1);
  });

test('AI seats, annual works, holy-war occupation, and daily indexing stay bounded',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const seeded = [];
      for (const rid in s.realms) {
        const realm = s.realms[rid];
        if (rid === 'player' || !realm || !realm.alive || realm.rank < 2) continue;
        seeded.push({
          rid:rid,
          capital:realm.capital,
          level:FB.fortAt(s, realm.capital) && FB.fortAt(s, realm.capital).level,
          supported:FB.fortHighestSupportedLevel(s, rid)
        });
      }

      let builder = null;
      for (const rid in s.realms) {
        const realm = s.realms[rid];
        if (rid === 'player' || !realm || !realm.alive) continue;
        const counties = Object.keys(s.dev).filter(function (pid) {
          return ((s.holder && s.holder[pid]) || s.owner[pid]) === rid;
        });
        if (counties.length >= 2) {
          builder = { rid:rid, realm:realm, counties:counties };
          break;
        }
      }
      if (!builder) {
        const rid = Object.keys(s.realms).filter(function (id) {
          return id !== 'player' && s.realms[id] && s.realms[id].alive;
        })[0];
        const counties = Object.keys(s.dev).slice(0, 2);
        builder = { rid:rid, realm:s.realms[rid], counties:counties };
        builder.realm.capital = counties[0];
        counties.forEach(function (pid) { s.holder[pid] = rid; });
      }
      builder.realm.capital = builder.counties[0];
      builder.counties.forEach(function (pid) {
        s.buildings[pid] = (s.buildings[pid] || []).filter(function (entry) {
          return !(entry && entry.id === 'walls');
        });
      });
      const tech = FB.realmTechRecord(s, builder.rid);
      ['ringworks','castle_towers','stone_castles','concentric_defenses',
        'fortified_gates'].forEach(function (id) {
        if (tech.completed.indexOf(id) < 0) tech.completed.push(id);
      });
      builder.realm.fortWorks = 400;
      delete builder.realm.fortWorksYear;
      delete builder.realm.fortProjectYear;
      FB.invalidateFortIndex();
      FB.fortAIYear(s);
      const firstProjects = FB.fortList(s).filter(function (item) {
        return builder.counties.indexOf(item.pid) >= 0 && item.record.targetLevel;
      });
      const worksAfterFirst = builder.realm.fortWorks;
      FB.fortAIYear(s);
      const sameYearProjects = FB.fortList(s).filter(function (item) {
        return builder.counties.indexOf(item.pid) >= 0 && item.record.targetLevel;
      });

      const fortPid = builder.counties[0];
      s.buildings[fortPid] = [{ s:0, id:'walls', level:2 }];
      FB.invalidateFortIndex();
      const sovereigns = Object.keys(s.realms).filter(function (id) {
        const realm = s.realms[id];
        return id !== 'player' && realm && realm.alive && !realm.liege;
      });
      s.alliances = [];
      const besieger = sovereigns.filter(function (id) {
        return id !== s.owner[fortPid];
      })[0];
      const aiHost = {
        id:'annual-fort-siege', realm:besieger, at:fortPid, from:null,
        men:300, units:{ levy:300, arch:0, cav:0, ret:0, mercs:0 },
        path:[], goal:null, moveLeft:0
      };
      s.armies = [aiHost];
      const aiWar = { fortSieges:{} };
      const yearlySiege = FB.advanceAIYearlyFortSiege(
        s, aiWar, fortPid, besieger);
      const expectedYearlyProgress = 4 * (1 + (FB.techBonus
        ? FB.techBonus(s, 'siege', besieger) * 3 : 0));
      const baseOccupation = (FBDATA.balance.greatHolyWarSiegeBase || 120) +
        (s.dev[fortPid] || 1) *
        (FBDATA.balance.greatHolyWarSiegePerDev || 10);
      const occupation = { occupied:true, progress:0, fortLevel:2 };
      const requirement = FB.greatHolyWarSiegeRequirement(s, fortPid, occupation);
      const attacker = sovereigns[0];
      const defender = sovereigns[1];
      const oldGreatHolyWar = s.greatHolyWar;
      s.greatHolyWar = {
        phase:'active', occupations:{},
        participants:{
          attackers:[{ realm:attacker, sovereign:true }],
          defenders:[{ realm:defender, sovereign:true }]
        }
      };
      s.greatHolyWar.occupations[fortPid] = occupation;
      const attackingHost = { realm:attacker, at:fortPid, men:300 };
      const defendingHost = { realm:defender, at:fortPid, men:300 };
      const occupiedPass = FB.fortBlocksArmy(s, fortPid, attackingHost);
      const recaptureBlock = FB.fortBlocksArmy(s, fortPid, defendingHost);
      s.greatHolyWar = oldGreatHolyWar;
      const dailySource = String(FB.fortificationDay);

      return {
        seeded:seeded,
        firstProjectCount:firstProjects.length,
        firstProject:firstProjects[0] && {
          pid:firstProjects[0].pid,
          duration:firstProjects[0].record.completeTurn - s.turn
        },
        sameYearProjectCount:sameYearProjects.length,
        capital:builder.realm.capital,
        worksAfterFirst:worksAfterFirst,
        worksAfterSecond:builder.realm.fortWorks,
        yearlySiege:{
          progress:yearlySiege.progress,
          breached:yearlySiege.breached,
          men:aiHost.men
        },
        expectedYearlyProgress:expectedYearlyProgress,
        occupationDelay:requirement - baseOccupation,
        occupiedPass:occupiedPass,
        recaptureBlock:recaptureBlock,
        dailyScansWorld:dailySource.indexOf('state.dev') >= 0 ||
          dailySource.indexOf('state.realms') >= 0
      };
    });

    expect(result.seeded.length).toBeGreaterThan(0);
    result.seeded.forEach(function (seat) {
      expect(seat.level || 0).toBe(seat.supported);
    });
    expect(result.firstProjectCount).toBe(1);
    expect(result.firstProject).toEqual({ pid:result.capital, duration:180 });
    expect(result.sameYearProjectCount).toBe(1);
    expect(result.worksAfterFirst).toBe(340);
    expect(result.worksAfterSecond).toBe(result.worksAfterFirst);
    expect(result.yearlySiege.progress).toBeCloseTo(
      result.expectedYearlyProgress, 8);
    expect(result.yearlySiege.breached).toBe(false);
    expect(result.yearlySiege.men).toBe(252);
    expect(result.occupationDelay).toBe(180);
    expect(result.occupiedPass).toBe(false);
    expect(result.recaptureBlock).toBe(true);
    expect(result.dailyScansWorld).toBe(false);
  });

test('fort badges and settlement sheets expose tier, works, locks, and touch controls',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const pid = p.provinceId;
      const tech = FB.realmTechRecord(s);
      p.tier = 4;
      p.provs = [pid];
      s.holder[pid] = 'player';
      s.dev[pid] = 1;
      ['ringworks','castle_towers','stone_castles','concentric_defenses',
        'fortified_gates'].forEach(function (id) {
        if (tech.completed.indexOf(id) < 0) tech.completed.push(id);
      });
      const hiddenIndex = Math.min(7, FB.world.sitesByProv[pid].list.length - 1);
      const foreignPid = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== pid &&
          s.holder[province.id] !== 'player' &&
          FB.world.sitesByProv[province.id] &&
          FB.world.sitesByProv[province.id].list.length > 0;
      })[0].id;
      s.buildings[foreignPid] = (s.buildings[foreignPid] || []).filter(
        function (entry) { return !(entry && entry.id === 'walls'); });
      s.buildings[foreignPid].push({ s:0, id:'walls', level:2 });
      const record = {
        s:hiddenIndex, id:'walls', level:3, targetLevel:4,
        completeTurn:s.turn + 720
      };
      s.buildings[pid] = [record];
      FB.invalidateFortIndex();
      FB.ui.showSettlement(pid, hiddenIndex);
      const tierMarks = [];
      for (let level = 1; level <= 4; level++) {
        record.level = level;
        delete record.targetLevel;
        tierMarks.push(FB.fortBadgeDescriptor(s, pid, hiddenIndex).marks);
      }
      record.level = 3;
      record.targetLevel = 4;
      return {
        pid:pid,
        index:hiddenIndex,
        foreignPid:foreignPid,
        visible:FB.settlementVisibleCount(s, pid),
        badge:FB.fortBadgeDescriptor(s, pid, hiddenIndex),
        tierMarks:tierMarks
      };
    });

    expect(setup.visible).toBeGreaterThan(setup.index);
    expect(setup.badge).toEqual({
      level:3, marks:3, constructing:true, targetLevel:4
    });
    expect(setup.tierMarks).toEqual([1, 2, 3, 4]);
    await expect(page.locator('#gm-body')).toContainText('Stone Castle');
    await expect(page.locator('#gm-body')).toContainText('Concentric Fortress');
    await expect(page.locator('#gm-body')).toContainText('420 uncontested besiegers');
    await expect(page.locator('#gm-body')).toContainText('21 casualties');
    await expect(page.locator('#gm-body')).toContainText('current tier remains active');
    await expect(page.locator('[data-fort-start]')).toHaveCount(0);
    const demolition = page.locator('.sett-demolish');
    await expect(demolition).toBeVisible();
    expect((await demolition.boundingBox()).height).toBeGreaterThanOrEqual(44);

    const foreign = await page.evaluate(function (config) {
      const s = FB.state;
      const item = FB.fortAt(s, config.foreignPid);
      if (!item) return null;
      FB.ui.showSettlement(config.foreignPid, item.s);
      return {
        name:FB.fortLevelName(s, item.level),
        pid:config.foreignPid
      };
    }, setup);
    expect(foreign).toBeTruthy();
    await expect(page.locator('#gm-body')).toContainText(foreign.name);
    await expect(page.locator('[data-fort-start]')).toHaveCount(0);
    await expect(page.locator('.sett-demolish')).toHaveCount(0);

    await page.evaluate(function (config) {
      const s = FB.state;
      const tech = FB.realmTechRecord(s);
      tech.completed = tech.completed.filter(function (id) {
        return id !== 'ringworks';
      });
      s.buildings[config.pid] = [];
      FB.invalidateFortIndex();
      FB.ui.showSettlement(config.pid, 0);
    }, setup);
    const locked = page.locator('[data-fort-tech="ringworks"]');
    await expect(locked).toBeVisible();
    expect((await locked.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await locked.focus();
    await expect(locked).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name:/Ringworks/ }))
      .toBeVisible();
  });
