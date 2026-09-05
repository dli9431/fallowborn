'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_paths.js',
  'js/events.js',
  'js/main.js',
  'js/model.js',
  'js/world.js',
  'js/armies.js',
  'js/mapview.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js'
]);

/* Gentry establishment across succession (docs/designs/realms.md): a house
   that has just reached the gentry may not ordinarily petition for a barony until an
   heir of a genuinely later generation inherits its standing. The saga
   counter advances on every succession, so the gate tracks the line's
   genealogical depth (`player.lineDepth`) instead — a sibling or cousin of
   the founder's own generation must not unlock the petition, while a child,
   a nephew, or an adopted heir must. Legacy saves holding only a
   saga-generation number keep the original counter comparison. The narrow
   battlefield exception is separately covered below: only the founder who
   rose from below may command a count-or-greater patron's live host, and only
   a real field victory queues the barony. Exercised at the engine level in a
   fresh deterministic context. */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('a sibling inheriting a newly gentle house is not yet established',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const out = {
        startLineDepth:p.lineDepth,
        startGentry:p.gentryGeneration
      };
      FB.setPlayerTier(s, 2);
      out.riseRecorded = p.gentryGeneration;
      out.founderEstablished = FB.gentryEstablished(s);
      const sibling = FB.siblingsOf(s, me).filter(function (c) {
        return !c.dead;
      })[0];
      out.siblingFound = !!sibling;
      me.childrenIds = [];
      FB.game.succeedTo(sibling.id);
      out.sagaAdvanced = s.generation === 2;
      out.lineDepthHeld = p.lineDepth === 1;
      out.siblingEstablished = FB.gentryEstablished(s);
      return out;
    });

    expect(result).toEqual({
      startLineDepth:1,
      startGentry:null,
      riseRecorded:1,
      founderEstablished:false,
      siblingFound:true,
      sagaAdvanced:true,
      lineDepthHeld:true,
      siblingEstablished:false
    });
  });

test('a child inheriting the newly gentle house establishes it',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 2);
      const child = FB.makeCharacter(s, {
        name:'Godric', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 20, motherId:me.id, dyn:me.dyn, traitsN:0
      });
      me.childrenIds = [child.id];
      FB.game.succeedTo(child.id);
      return {
        sagaAdvanced:s.generation === 2,
        lineDepthAdvanced:p.lineDepth === 2,
        established:FB.gentryEstablished(s)
      };
    });

    expect(result).toEqual({
      sagaAdvanced:true,
      lineDepthAdvanced:true,
      established:true
    });
  });

test('a nephew inheriting after a sibling is a later generation',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 2);
      const sibling = FB.siblingsOf(s, me).filter(function (c) {
        return !c.dead;
      })[0];
      const nephew = FB.makeCharacter(s, {
        name:'Aelfric', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 18, fatherId:sibling.id, dyn:me.dyn, traitsN:0
      });
      sibling.childrenIds = (sibling.childrenIds || []).concat([nephew.id]);
      me.childrenIds = [];
      FB.game.succeedTo(sibling.id);
      const afterSibling = {
        established:FB.gentryEstablished(s),
        lineDepth:p.lineDepth
      };
      FB.game.succeedTo(nephew.id);
      return {
        siblingFound:!!sibling,
        afterSibling:afterSibling,
        afterNephew:{
          established:FB.gentryEstablished(s),
          lineDepth:p.lineDepth
        }
      };
    });

    expect(result).toEqual({
      siblingFound:true,
      afterSibling:{ established:false, lineDepth:1 },
      afterNephew:{ established:true, lineDepth:2 }
    });
  });

test('an adopted child counts as the next generation',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 2);
      // adoption records no blood parents, only the childrenIds back-link
      const adopted = FB.makeCharacter(s, {
        name:'Wulfstan', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 16, fatherId:null, motherId:null,
        dyn:me.dyn, traitsN:0
      });
      me.childrenIds = [adopted.id];
      FB.game.succeedTo(adopted.id);
      return {
        lineDepthAdvanced:p.lineDepth === 2,
        established:FB.gentryEstablished(s)
      };
    });

    expect(result).toEqual({
      lineDepthAdvanced:true,
      established:true
    });
  });

test('legacy saves keep their original establishment rule',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const out = {};

      // pre-gate save: neither field exists — always treated as established
      delete p.gentryGeneration;
      delete p.lineDepth;
      p.tier = 2;
      out.preGateEstablished = FB.gentryEstablished(s);

      // scenario start shape: established marker 0 with line-depth tracking
      p.gentryGeneration = 0;
      p.lineDepth = 1;
      out.scenarioStartEstablished = FB.gentryEstablished(s);

      // save holding only a saga-generation number: the old counter rule
      p.gentryGeneration = 1;
      delete p.lineDepth;
      out.legacyFounderEstablished = FB.gentryEstablished(s);
      const sibling = FB.siblingsOf(s, me).filter(function (c) {
        return !c.dead;
      })[0];
      me.childrenIds = [];
      FB.game.succeedTo(sibling.id);
      out.legacyLineDepthUntracked = p.lineDepth === undefined;
      out.legacySiblingEstablished = FB.gentryEstablished(s);
      return out;
    });

    expect(result).toEqual({
      preGateEstablished:true,
      scenarioStartEstablished:true,
      legacyFounderEstablished:false,
      legacyLineDepthUntracked:true,
      // the pre-fix behavior is preserved for saves that predate lineDepth
      legacySiblingEstablished:true
    });
  });

test('a serf marked for battlefield knighting can rise only during a live war',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Eadgyth', sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 38, dyn:me.dyn, station:0, unfree:true,
        traitsN:0
      });
      const adultChild = FB.makeCharacter(s, {
        name:'Oswin', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 20, dyn:me.dyn, station:0, unfree:true,
        fatherId:me.sex === 'm' ? me.id : spouse.id,
        motherId:me.sex === 'f' ? me.id : spouse.id, traitsN:0
      });
      const grandchild = FB.makeCharacter(s, {
        name:'Wulf', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 2, dyn:me.dyn, station:0, unfree:true,
        fatherId:adultChild.id, traitsN:0
      });
      const parent = FB.makeCharacter(s, {
        name:'Leofrun', sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 62, dyn:me.dyn, station:0, unfree:true,
        traitsN:0
      });
      const sibling = FB.makeCharacter(s, {
        name:'Cenric', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 30, dyn:me.dyn, station:0, unfree:true,
        motherId:parent.id, traitsN:0
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      me.childrenIds = (me.childrenIds || []).concat([adultChild.id]);
      spouse.childrenIds = (spouse.childrenIds || []).concat([adultChild.id]);
      adultChild.childrenIds = [grandchild.id];
      me.motherId = parent.id;
      parent.childrenIds = [me.id, sibling.id];
      FB.touchFamily();
      FB.setPlayerTier(s, 0);
      p.profession = 'soldier';
      p.flags.lords_favor = 1;
      p.war = null;
      Object.keys(s.realms).forEach(function (id) {
        s.realms[id].war = null;
      });
      const event = FB.eventById('knighted');
      const eligibleAtPeace = FB.checkTrigger(s, event.trigger);
      const sovereignId = FB.topRealm(s, s.owner[p.provinceId]);
      const enemyId = Object.keys(s.realms).filter(function (id) {
        const realm = s.realms[id];
        return realm && realm.alive && id !== 'player' && id !== sovereignId &&
          FB.topRealm(s, id) === id;
      })[0];
      s.realms[sovereignId].war = {
        enemy:enemyId,
        target:s.realms[enemyId].capital,
        started:s.turn,
        fw:0,
        fl:0
      };
      const eligibleAtWar = FB.checkTrigger(s, event.trigger);
      FB.applyEffects(s, event.options[0].effects, {}, event);
      return {
        chance:event.trigger.chance,
        explicitWarGate:event.trigger.realmAtWar === true,
        eligibleAtPeace:eligibleAtPeace,
        eligibleAtWar:eligibleAtWar,
        tierAfterAccept:p.tier,
        professionAfterAccept:p.profession,
        protagonistStation:me.station,
        spouseStation:spouse.station,
        spouseUnfree:spouse.unfree === true,
        adultChildStation:adultChild.station,
        adultChildUnfree:adultChild.unfree === true,
        grandchildStation:grandchild.station,
        grandchildUnfree:grandchild.unfree === true,
        parentStation:parent.station,
        parentUnfree:parent.unfree === true,
        siblingStation:sibling.station,
        siblingUnfree:sibling.unfree === true
      };
    });

    expect(result).toEqual({
      chance:0.2,
      explicitWarGate:true,
      eligibleAtPeace:false,
      eligibleAtWar:true,
      tierAfterAccept:2,
      professionAfterAccept:'noble',
      protagonistStation:2,
      spouseStation:1,
      spouseUnfree:false,
      adultChildStation:1,
      adultChildUnfree:false,
      grandchildStation:1,
      grandchildUnfree:false,
      parentStation:0,
      parentUnfree:true,
      siblingStation:0,
      siblingUnfree:true
    });
  });

test('a battle-proven founder can manually march and win by real field command',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 0);
      FB.setPlayerTier(s, 2);
      p.profession = 'noble';
      p.flags.seen_battle = 1;
      p.flags.lords_favor = 1;
      p.prestige = FBDATA.balance.militaryBaronyPrestige;
      me.skills.mar = FBDATA.balance.militaryBaronyMartial + 5;

      const patronId = (s.holder && s.holder[p.provinceId]) ||
        s.owner[p.provinceId];
      const patron = s.realms[patronId];
      const sovereignId = FB.topRealm(s, patronId);
      Object.keys(s.realms).forEach(function (id) {
        s.realms[id].war = null;
      });
      const enemyId = Object.keys(s.realms).filter(function (id) {
        const realm = s.realms[id];
        return realm && realm.alive && id !== 'player' && id !== sovereignId &&
          FB.topRealm(s, id) === id;
      })[0];
      s.realms[sovereignId].war = {
        enemy:enemyId,
        target:s.realms[enemyId].capital,
        started:s.turn,
        fw:0,
        fl:0
      };
      const commandHost = {
        id:'founder-command-host', realm:sovereignId, men:400, size:400,
        units:{ levy:300, arch:40, cav:20, ret:40, mercs:0 },
        at:s.realms[sovereignId].capital,
        from:s.realms[sovereignId].capital,
        path:[s.realms[enemyId].capital],
        goal:s.realms[enemyId].capital,
        moveLeft:9,
        supply:100
      };
      s.armies = [commandHost];
      s.armyDown = {};
      Object.keys(s.realms).forEach(function (id) {
        s.armyDown[id] = s.turn;
      });

      const ordinary = FB.rankElevationStatus(
        s, null, { route:'barony' });
      const savedRank = patron.rank;
      patron.rank = 0;
      const belowCount = FB.militaryCommandStatus(s);
      patron.rank = savedRank;
      const ready = FB.militaryCommandStatus(s);
      const began = FB.beginMilitaryCommand(s);
      const personallyAtWar = FB.atWarPersonally(s);
      const exactHostBound = p.militaryCommand.hostId === commandHost.id;
      const wrongWinner = FB.noteMilitaryCommandVictory(s,
        { realm:enemyId }, { realm:sovereignId }, p.provinceId);
      const activeAfterWrongWinner = !!FB.activeMilitaryCommand(s);

      /* Taking command halts the inherited AI route. In manual mode the same
         map-tap path used by the canvas must select the sovereign-owned host,
         accept a new route, and advance it without AI replacing the goal. */
      const inheritedRouteHalted = commandHost.path.length === 0 &&
        commandHost.moveLeft === 0 && commandHost.holdManual === 1;
      FB.game.auto.hosts = 'manual';
      FB.selectArmy(null);
      const commandHostPos = FB.armyWorldPos(s, commandHost);
      FB.armyTap(s, FB.world.byId[commandHost.at],
        commandHostPos[0], commandHostPos[1]);
      const selectedCommandHost = FB.selectedArmy(s) === commandHost;
      FB.map.select(commandHost.at);
      FB.ui.showTab('prov');
      FB.ui.refresh();
      const haltControlVisible = !!document.getElementById('btn-host-halt');
      const marchTarget = Object.keys(FB.world.adj[commandHost.at] || {}).filter(
        function (pid) {
          return FB.world.byId[pid] && !FB.world.byId[pid].wasteland;
        })[0];
      const marchProvince = FB.world.byId[marchTarget];
      const orderAccepted = FB.armyTap(s, marchProvince,
        marchProvince.cx, marchProvince.cy);
      const orderedDays = commandHost.moveLeft;
      const manualOrderStarted = orderedDays > 0 &&
        commandHost.goal === marchTarget && commandHost.path[0] === marchTarget;
      FB.armyTick(s);
      const manualRouteStateValid = commandHost.at === marchTarget
        ? commandHost.goal === marchTarget ||
          (commandHost.goal === null && commandHost.path.length === 0 &&
            FB.fortBlocksArmy(s, marchTarget, commandHost))
        : commandHost.goal === marchTarget &&
          commandHost.path[0] === marchTarget;
      const manualMarchAdvanced = commandHost.at === marchTarget ||
        commandHost.moveLeft === Math.max(0, orderedDays - 1);

      commandHost.path = [];
      commandHost.goal = null;
      commandHost.moveLeft = 0;
      commandHost.holdManual = 1;
      s.armies.push({
        id:'command-enemy-host', realm:enemyId, men:1, size:1,
        units:{ levy:1, arch:0, cav:0, ret:0, mercs:0 },
        at:commandHost.at, from:commandHost.at, path:[], moveLeft:0
      });
      FB.armyTick(s);
      const queued = s.eventQueue.filter(function (item) {
        return item.id === 'military_barony_victory';
      })[0];
      const event = FB.eventById('military_barony_victory');
      FB.applyEffects(s, event.options[0].effects, queued.ctx, event);
      return {
        ordinaryLocked:!ordinary.ready &&
          ordinary.reason.indexOf('newly gentle') >= 0,
        countGate:!belowCount.ready &&
          belowCount.reason.indexOf('count or greater') >= 0,
        ready:ready.ready,
        patron:ready.patronRealmId === patronId,
        began:began,
        personallyAtWar:personallyAtWar,
        exactHostBound:exactHostBound,
        wrongWinner:wrongWinner,
        activeAfterWrongWinner:activeAfterWrongWinner,
        inheritedRouteHalted:inheritedRouteHalted,
        selectedCommandHost:selectedCommandHost,
        haltControlVisible:haltControlVisible,
        orderAccepted:orderAccepted,
        manualOrderStarted:manualOrderStarted,
        manualRouteStateValid:manualRouteStateValid,
        manualMarchAdvanced:manualMarchAdvanced,
        won:!!queued,
        queued:!!queued,
        commandCleared:!p.militaryCommand,
        tier:p.tier,
        liegeMatchesPatron:p.liege === patronId,
        grantCount:p.liegeGrants
      };
    });

    expect(result).toEqual({
      ordinaryLocked:true,
      countGate:true,
      ready:true,
      patron:true,
      began:true,
      personallyAtWar:true,
      exactHostBound:true,
      wrongWinner:false,
      activeAfterWrongWinner:true,
      inheritedRouteHalted:true,
      selectedCommandHost:true,
      haltControlVisible:true,
      orderAccepted:true,
      manualOrderStarted:true,
      manualRouteStateValid:true,
      manualMarchAdvanced:true,
      won:true,
      queued:true,
      commandCleared:true,
      tier:3,
      liegeMatchesPatron:true,
      grantCount:1
    });
  });

test('field command cannot bypass the founder-life boundary for an established heir',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 2);
      const child = FB.makeCharacter(s, {
        name:'Osric', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 20, motherId:me.id, dyn:me.dyn, traitsN:0
      });
      me.childrenIds = [child.id];
      FB.game.succeedTo(child.id);
      p.flags.seen_battle = 1;
      p.flags.lords_favor = 1;
      p.prestige = FBDATA.balance.militaryBaronyPrestige;
      child.skills.mar = FBDATA.balance.militaryBaronyMartial + 5;
      const status = FB.militaryCommandStatus(s);
      return {
        established:FB.gentryEstablished(s),
        visible:status.visible,
        ready:status.ready,
        began:FB.beginMilitaryCommand(s)
      };
    });

    expect(result).toEqual({
      established:true,
      visible:false,
      ready:false,
      began:false
    });
  });
