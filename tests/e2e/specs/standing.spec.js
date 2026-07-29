'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

async function startStandingGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

test('typed Standing facade preserves legacy character, realm, event, and save access',
  async function ({ page }, testInfo) {
    await startStandingGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var home = FB.world.byId[s.player.provinceId];
      var person = FB.makeCharacter(s, {
        name:'Standing Witness',
        sex:'m',
        culture:home.culture,
        religion:home.religion,
        born:s.date.year - 30,
        station:2,
        quality:2,
        opinion:25
      });
      var characterTarget = { kind:'character', id:person.id };
      var initialCharacter = FB.standingOf(s, characterTarget);
      var upperClamp = FB.adjustStanding(s, characterTarget, 90,
        'test:upper_clamp');
      var lowerClamp = FB.adjustStanding(s, characterTarget, -250,
        'test:lower_clamp');
      s.roles.friend = person.id;
      FB.applyEffects(s, {
        opinion:{ role:'friend', amt:-10 }
      }, {}, { id:'standing_legacy_effect' });
      var legacyEventCharacter = FB.standingOf(s, characterTarget);

      var rid = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive;
      })[0];
      var realmTarget = { kind:'realm', id:rid };
      FB.adjustStanding(s, realmTarget,
        45 - FB.standingOf(s, realmTarget), 'test:set_realm');
      var ruler = FB.materializeRealmRuler(s, rid);
      var materialized = FB.standingOf(s, {
        kind:'character', id:ruler.id
      });
      FB.adjustStanding(s, { kind:'character', id:ruler.id }, -80,
        'test:character_view');
      var throughLegacyReader = FB.realmOpinionOf(s, rid);

      if (rid === s.player.liege) s.player.liegeOp = 70;
      else {
        s.player.liegeOps = s.player.liegeOps || {};
        s.player.liegeOps[rid] = 70;
      }
      var legacyRealmWrite = FB.standingOf(s, {
        kind:'character', id:ruler.id
      });
      ruler.opinion = 12;
      var legacyCharacterWrite = FB.standingOf(s, realmTarget);

      var payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      var restoredRuler = FB.realmRulerCharacter(FB.state, rid);
      return {
        initialCharacter:initialCharacter,
        upperClamp:upperClamp,
        lowerClamp:lowerClamp,
        legacyEventCharacter:legacyEventCharacter,
        materialized:materialized,
        throughLegacyReader:throughLegacyReader,
        legacyRealmWrite:legacyRealmWrite,
        legacyCharacterWrite:legacyCharacterWrite,
        restoredRealm:FB.standingOf(FB.state, realmTarget),
        restoredCharacter:FB.standingOf(FB.state, {
          kind:'character', id:restoredRuler.id
        })
      };
    });

    expect(result).toEqual({
      initialCharacter:25,
      upperClamp:100,
      lowerClamp:-100,
      legacyEventCharacter:-100,
      materialized:45,
      throughLegacyReader:-35,
      legacyRealmWrite:70,
      legacyCharacterWrite:12,
      restoredRealm:12,
      restoredCharacter:12
    });
  });

test('a materialized heir keeps tracked Standing without inheriting the ruler score',
  async function ({ page }, testInfo) {
    await startStandingGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var rid = Object.keys(s.realms).filter(function (id) {
        var realm = s.realms[id];
        if (id === 'player' || !realm || !realm.alive) return false;
        var succession = FB.ensureRealmSuccession(s, id);
        return succession && succession.order && succession.order.length;
      })[0];
      var succession = FB.ensureRealmSuccession(s, rid);
      var heirId = succession.order[0];
      var heir = FB.materializeRoyalChild(s, rid, heirId);
      FB.adjustStanding(s, { kind:'character', id:heir.id },
        33 - FB.standingOf(s, { kind:'character', id:heir.id }),
        'test:heir_relationship');
      FB.adjustStanding(s, { kind:'realm', id:rid },
        66 - FB.standingOf(s, { kind:'realm', id:rid }),
        'test:predecessor_relationship');
      var advanced = FB.advanceRealmSuccession(s, rid);
      var ruler = FB.realmRulerCharacter(s, rid);
      return {
        advanced:advanced && advanced.id,
        expectedHeir:heirId,
        rulerId:ruler && ruler.id,
        expectedRulerId:heir.id,
        realmStanding:FB.standingOf(s, { kind:'realm', id:rid }),
        characterStanding:FB.standingOf(s, {
          kind:'character', id:heir.id
        })
      };
    });

    expect(result.expectedHeir).toBeTruthy();
    expect(result.expectedRulerId).toBeTruthy();
    expect(result.advanced).toBe(result.expectedHeir);
    expect(result.rulerId).toBe(result.expectedRulerId);
    expect(result.realmStanding).toBe(33);
    expect(result.characterStanding).toBe(33);
  });

test('changing direct lieges keeps Standing attached to realm identity',
  async function ({ page }, testInfo) {
    await startStandingGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var ids = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive;
      });
      var oldRid = s.player.liege && s.realms[s.player.liege] &&
        s.realms[s.player.liege].alive ? s.player.liege : ids[0];
      var newRid = ids.filter(function (id) {
        return id !== oldRid;
      })[0];
      FB.changePlayerLiege(s, oldRid, 'test:establish_old_liege');
      FB.adjustStanding(s, { kind:'realm', id:oldRid },
        31 - FB.standingOf(s, { kind:'realm', id:oldRid }),
        'test:set_old_liege');
      FB.adjustStanding(s, { kind:'realm', id:newRid },
        44 - FB.standingOf(s, { kind:'realm', id:newRid }),
        'test:set_new_liege');

      FB.changePlayerLiege(s, newRid, 'test:switch_liege');
      var afterSwitch = {
        liege:s.player.liege,
        oldStanding:FB.standingOf(s, { kind:'realm', id:oldRid }),
        newStanding:FB.standingOf(s, { kind:'realm', id:newRid }),
        directSlot:s.player.liegeOp,
        oldRealmSlot:s.player.liegeOps[oldRid]
      };
      FB.adjustStanding(s, { kind:'realm', id:newRid }, 5,
        'test:adjust_new_liege');
      FB.changePlayerLiege(s, oldRid, 'test:restore_old_liege');
      var restored = {
        newRid:newRid,
        oldRid:oldRid,
        afterSwitch:afterSwitch,
        restoredLiege:s.player.liege,
        restoredOld:FB.standingOf(s, { kind:'realm', id:oldRid }),
        savedNew:FB.standingOf(s, { kind:'realm', id:newRid }),
        directSlot:s.player.liegeOp
      };
      FB.changePlayerLiege(s, null, 'test:release_liege');
      restored.releasedLiege = s.player.liege;
      restored.releasedOld = FB.standingOf(s, {
        kind:'realm', id:oldRid
      });
      restored.releasedNew = FB.standingOf(s, {
        kind:'realm', id:newRid
      });
      return restored;
    });

    expect(result.afterSwitch).toEqual({
      liege:result.newRid,
      oldStanding:31,
      newStanding:44,
      directSlot:44,
      oldRealmSlot:31
    });
    expect(result.restoredLiege).toBe(result.oldRid);
    expect(result.restoredOld).toBe(31);
    expect(result.savedNew).toBe(49);
    expect(result.directSlot).toBe(31);
    expect(result.releasedLiege).toBeNull();
    expect(result.releasedOld).toBe(31);
    expect(result.releasedNew).toBe(49);
  });

test('player succession clears predecessor Standing and applies only bounded service carryover',
  async function ({ page }, testInfo) {
    await startStandingGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var home = FB.world.byId[p.provinceId];
      var counterpart = FB.makeCharacter(s, {
        name:'Old Acquaintance',
        sex:'f',
        culture:home.culture,
        religion:home.religion,
        born:s.date.year - 35,
        station:2,
        quality:2,
        opinion:52
      });
      var servant = FB.makeCharacter(s, {
        name:'Inherited Servant',
        sex:'m',
        culture:home.culture,
        religion:home.religion,
        born:s.date.year - 40,
        station:2,
        quality:2,
        opinion:48
      });
      var office = Object.keys(FBDATA.positions).filter(function (id) {
        return FBDATA.positions[id].kind === 'retainer';
      })[0];
      p.retainers = [{
        charId:servant.id,
        office:office,
        pay:FBDATA.positions[office].pay || 0,
        startedTurn:s.turn,
        unpaid:0
      }];
      var rid = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive;
      })[0];
      FB.adjustStanding(s, { kind:'realm', id:rid },
        -35 - FB.standingOf(s, { kind:'realm', id:rid }),
        'test:predecessor_realm');
      p.foreignPolicy = {};
      p.foreignPolicy[rid] = 1;

      var heir = FB.heirsOf(s)[0];
      heir.dead = false;
      var succeeded = FB.game.succeedTo(heir.id);
      return {
        succeeded:succeeded,
        counterpart:FB.standingOf(s, {
          kind:'character', id:counterpart.id
        }),
        servant:FB.standingOf(s, {
          kind:'character', id:servant.id
        }),
        realm:FB.standingOf(s, { kind:'realm', id:rid }),
        foreignPolicy:Object.keys(p.foreignPolicy)
      };
    });

    expect(result).toEqual({
      succeeded:true,
      counterpart:0,
      servant:-15,
      realm:0,
      foreignPolicy:[]
    });
  });

test('realm and character sheets show the same Standing value, band, and context',
  async function ({ page }, testInfo) {
    await startStandingGame(page, testInfo);
    const ids = await page.evaluate(function () {
      var s = FB.state;
      var rid = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && id !== s.player.liege &&
          s.realms[id] && s.realms[id].alive &&
          !s.realms[id].liege;
      })[0];
      FB.adjustStanding(s, { kind:'realm', id:rid },
        45 - FB.standingOf(s, { kind:'realm', id:rid }),
        'test:sheet_value');
      var ruler = FB.materializeRealmRuler(s, rid);
      FB.ui.showLiegeModal(rid);
      return {
        rid:rid,
        cid:ruler.id,
        rounded:FB.standingPresentationText(45.26),
        clamped:FB.standingPresentationText(150),
        negativeEffect:FB.standingEffectRow('Test', -15)
          .indexOf('bd-amt op-bad') >= 0
      };
    });

    expect(ids.rounded).toBe('+45.3 (Favorable)');
    expect(ids.clamped).toBe('+100 (Warm)');
    expect(ids.negativeEffect).toBe(true);
    await expect(page.locator(
      '#gm-body .interaction-standing .op-good').first()).toContainText(
      '+45 (Favorable)');
    await expect(page.locator('#gm-body')).toContainText(
      'affects envoys, pacts, aid, hostility, and the chance of war');

    await page.evaluate(function (cid) {
      FB.ui.closeModal();
      FB.ui.showCharModal(cid);
    }, ids.cid);
    await expect(page.locator('#gm-body .ccmeta .op-good').first()).toContainText(
      '+45 (Favorable)');
    await expect(page.locator('#gm-body')).toContainText(
      'affects envoys, pacts, aid, hostility, and the chance of war');

    await page.evaluate(function (data) {
      FB.adjustStanding(FB.state, { kind:'character', id:data.cid }, -80,
        'test:sheet_negative');
      FB.ui.closeModal();
      FB.ui.showLiegeModal(data.rid);
    }, ids);
    await expect(page.locator(
      '#gm-body .interaction-standing .op-bad').first()).toContainText(
      '-35 (Guarded)');
  });
