'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/events.js',
  'js/world.js',
  'js/save.js',
  'js/actions.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

/* Builds the reported hierarchy: the player as sovereign, a direct duchy
   vassal holding one county in its own hand, and a count sworn to that
   duchy holding another county. Counties are borrowed from remote provinces
   by direct owner/holder assignment, so the cache is invalidated by hand. */
function arrangeRevocation(page) {
  return page.evaluate(function () {
    const s = FB.state;
    const p = s.player;
    const me = s.chars[p.charId];
    const provinces = FB.world.provs.filter(function (province) {
      return !province.wasteland;
    });
    const duchyCounty = provinces[provinces.length - 3].id;
    const clientCounty = provinces[provinces.length - 2].id;
    const duchyId = 'test_revoke_duchy';
    const clientId = 'test_revoke_client';

    FB.game.observe = false;
    p.liege = null;
    p.war = null;
    p.tier = 4;
    p.provs = p.provs || [];
    FB.foundPlayerRealm(s);
    s.realms.player.liege = null;

    function realm(id, name, rank, liege, capital) {
      s.realms[id] = {
        id:id, name:name, color:'#705435', capital:capital, aggression:0,
        rank:rank, liege:liege, alive:true, favor:60, religion:me.religion,
        ruler:{
          name:name + ' Ruler', sex:'m', culture:me.culture, age:40, mar:6,
          trait:'content', generation:1
        },
        war:null, op:0
      };
    }
    realm(duchyId, 'Test Duchy', 2, 'player', duchyCounty);
    realm(clientId, 'Test Client County', 1, duchyId, clientCounty);

    s.owner[duchyCounty] = 'player';
    s.holder[duchyCounty] = duchyId;
    s.owner[clientCounty] = 'player';
    s.holder[clientCounty] = clientId;
    FB.invalidateRealmCache();
    return { duchyId:duchyId, clientId:clientId,
      duchyCounty:duchyCounty, clientCounty:clientCounty };
  });
}

test('revoking a vassal duchy passes its own vassals to the crown',
  async function ({ page }) {
    await startDeterministicGame(page);
    const ids = await arrangeRevocation(page);

    const before = await page.evaluate(function (args) {
      return {
        vassals: FB.playerVassals(FB.state).slice(),
        clientLiege: FB.state.realms[args.clientId].liege
      };
    }, ids);
    expect(before.vassals).toContain(ids.duchyId);
    expect(before.vassals).not.toContain(ids.clientId);
    expect(before.clientLiege).toBe(ids.duchyId);

    const result = await page.evaluate(function (args) {
      const s = FB.state;
      FB.fns.vassal_reclaim(s, { rid:args.duchyId });
      return {
        duchyAlive: s.realms[args.duchyId].alive,
        clientAlive: s.realms[args.clientId].alive,
        clientLiege: s.realms[args.clientId].liege,
        clientListed: FB.playerVassals(s).indexOf(args.clientId) >= 0,
        duchyCountyHolder: s.holder[args.duchyCounty],
        clientCountyHolder: s.holder[args.clientCounty],
        crownHoldsCounty: s.player.provs.indexOf(args.duchyCounty) >= 0
      };
    }, ids);

    expect(result.duchyAlive).toBe(false);
    expect(result.clientAlive).toBe(true);
    expect(result.clientLiege).toBe('player');
    expect(result.clientListed).toBe(true);
    expect(result.duchyCountyHolder).toBe('player');
    expect(result.clientCountyHolder).toBe(ids.clientId);
    expect(result.crownHoldsCounty).toBe(true);
  });

test('restore reattaches vassals orphaned under a dead house',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage encoding contract belongs to the served origin.');
    await startDeterministicGame(page);
    const ids = await arrangeRevocation(page);

    const result = await page.evaluate(function (args) {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      /* the pre-fix corruption: the duchy died by revocation while its
         vassals kept pointing at it (plus a two-link dead chain and a chain
         whose every anchor is gone) */
      s.realms[args.duchyId].alive = false;
      const chainDeadId = 'test_revoke_chain_dead';
      const chainClientId = 'test_revoke_chain_client';
      const lostDeadId = 'test_revoke_lost_dead';
      const lostClientId = 'test_revoke_lost_client';
      function realm(id, name, rank, liege, alive, capital) {
        s.realms[id] = {
          id:id, name:name, color:'#705435', capital:capital, aggression:0,
          rank:rank, liege:liege, alive:alive, favor:60,
          religion:me.religion,
          ruler:{
            name:name + ' Ruler', sex:'m', culture:me.culture, age:40,
            mar:6, trait:'content', generation:1
          },
          war:null, op:0
        };
      }
      realm(chainDeadId, 'Dead Middle Duchy', 2, args.duchyId, false,
        s.player.provinceId);
      realm(chainClientId, 'Deep Client County', 1, chainDeadId, true,
        s.player.provinceId);
      realm(lostDeadId, 'Lost Duchy', 2, 'test_revoke_no_such_realm', false,
        s.player.provinceId);
      realm(lostClientId, 'Lost Client County', 1, lostDeadId, true,
        s.player.provinceId);

      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const realms = FB.state.realms;
      return {
        clientLiege: realms[args.clientId].liege,
        chainClientLiege: realms[chainClientId].liege,
        lostClientLiege: realms[lostClientId].liege,
        duchyStillDead: realms[args.duchyId].alive === false,
        clientListed:
          FB.playerVassals(FB.state).indexOf(args.clientId) >= 0,
        chainListed:
          FB.playerVassals(FB.state).indexOf(chainClientId) >= 0
      };
    }, ids);

    expect(result.duchyStillDead).toBe(true);
    expect(result.clientLiege).toBe('player');
    expect(result.chainClientLiege).toBe('player');
    expect(result.lostClientLiege).toBe(null);
    expect(result.clientListed).toBe(true);
    expect(result.chainListed).toBe(true);
  });
