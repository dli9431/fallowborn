'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/politics.js',
  'js/world.js',
  'js/ui_modals.js'
]);

/* Feudal patronage from the liege (docs/designs/realms.md): the petition for
   title grants land inside the realm — never the liege's seat, never his last
   directly held county — and only the crown can raise a man to duke. A duke's
   man who gains a duchy majority keeps the land as a claim without the style,
   and a duke kneeling to a mere duke lapses back a rung. Exercised at the
   engine level in a fresh deterministic context. */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  // helpers live in the page: evaluate callbacks cannot close over Node scope
  await page.evaluate(function () {
    window.LG = {
      /* shared reset: a clean, paused, landed count with no liege and no
         wars, seated on a mainland home with 2+ non-wasteland neighbors so
         grant candidates can exist */
      resetCount: function (s) {
        var p = s.player;
        var homeId = p.provinceId;
        function good(pid) {
          var n = 0;
          for (var nb in (FB.world.adj[pid] || {})) {
            if (!FB.world.byId[nb].wasteland) n++;
          }
          return n >= 2;
        }
        if (!good(homeId)) {
          for (var pid in s.owner) {
            if (!FB.world.byId[pid].wasteland && good(pid)) {
              homeId = pid;
              break;
            }
          }
        }
        FB.game.setPaused(true);
        FB.game.observe = false;
        p.dead = false;
        p.tier = 4;
        p.liege = null;
        p.provinceId = homeId;
        p.provs = [homeId];
        p.travel = null;
        p.war = null;
        p.greatHolyWar = null;
        p.gold = 100;
        p.prestige = 500;
        p.pop = 30;
        p.flags = {};
        delete p.titleLapse;
        delete p.liegeGrants;
        s.greatHolyWar = null;
        s.armies = [];
        for (var rid in s.realms) {
          if (s.realms[rid]) s.realms[rid].war = null;
        }
        s.owner[homeId] = 'player';
        s.holder[homeId] = 'player';
        FB.foundPlayerRealm(s);
        s.realms.player.rank = 1;
        s.realms.player.liege = null;
        s.realms.player.capital = homeId;
        FB.invalidateRealmCache();
        return homeId;
      },
      makeRealm: function (s, id, name, rank, liege, capital, religion, culture) {
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
          religion:religion,
          ruler:{
            name:name + ' Ruler',
            sex:'m',
            culture:culture,
            age:40,
            mar:7,
            trait:'ambitious',
            generation:1
          }
        };
      },
      /* a two-county duchy that does not contain the given county */
      smallDuchy: function (s, excludePid) {
        for (var did in FBDATA.duchies) {
          var cs = FB.duchyCounties(did);
          if (cs.length === 2 && cs.indexOf(excludePid) < 0) return did;
        }
        return null;
      },
      giveToPlayer: function (s, pid, sovereignId) {
        s.owner[pid] = sovereignId;
        s.holder[pid] = 'player';
        if (s.player.provs.indexOf(pid) < 0) s.player.provs.push(pid);
      },
      swearTo: function (s, rid) {
        s.player.liege = rid;
        s.realms.player.liege = rid;
        FB.invalidateRealmCache();
      },
      neighbors: function (s, pid) {
        var out = [];
        for (var nb in (FB.world.adj[pid] || {})) {
          if (!FB.world.byId[nb].wasteland) out.push(nb);
        }
        return out;
      },
      deed: function (id) {
        for (var i = 0; i < FB.instants.length; i++) {
          if (FB.instants[i].id === id) return FB.instants[i];
        }
        return null;
      }
    };
  });
}

test('a duke’s man who gains a duchy majority keeps the land but not the style',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var out = {};
      var homeId = LG.resetCount(s);
      LG.makeRealm(s, 'lg_duke', 'Test Duchy', 2, null, homeId,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_duke');
      var did = LG.smallDuchy(s, homeId);
      out.duchyFound = !!did;
      var cs = did ? FB.duchyCounties(did) : [];
      for (var i = 0; i < cs.length; i++) LG.giveToPlayer(s, cs[i], 'lg_duke');
      FB.invalidateRealmCache();
      out.holdsMajority = !!FB.playerDuchy(s);

      FB.checkTierPromotions(s);
      out.tier = p.tier;
      out.liege = p.liege;
      out.realmLiege = s.realms.player.liege;
      out.rank = s.realms.player.rank;
      out.claimHint = !!(p.flags && p.flags.duchy_claim_hint);

      // the claim survives until the crown or independence: still a count
      FB.checkTierPromotions(s);
      out.stillTier = p.tier;
      return out;
    });

    expect(result).toEqual({
      duchyFound: true,
      holdsMajority: true,
      tier: 4,
      liege: 'lg_duke',
      realmLiege: 'lg_duke',
      rank: 1,
      claimHint: true,
      stillTier: 4
    });
  });

test('the crown can make a duke: a king’s vassal rises and stays in the realm',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var out = {};
      var homeId = LG.resetCount(s);
      LG.makeRealm(s, 'lg_king', 'Test Kingdom', 3, null, homeId,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_king');
      var did = LG.smallDuchy(s, homeId);
      out.duchyFound = !!did;
      var cs = did ? FB.duchyCounties(did) : [];
      for (var i = 0; i < cs.length; i++) LG.giveToPlayer(s, cs[i], 'lg_king');
      FB.invalidateRealmCache();

      FB.checkTierPromotions(s);
      out.tier = p.tier;
      out.liege = p.liege;
      out.realmLiege = s.realms.player.liege;
      out.rank = s.realms.player.rank;
      out.claimHint = !!(p.flags && p.flags.duchy_claim_hint);
      out.ownerKept = cs.length > 0 &&
        cs.every(function (pid) { return s.owner[pid] === 'lg_king'; });
      return out;
    });

    expect(result).toEqual({
      duchyFound: true,
      tier: 5,
      liege: 'lg_king',
      realmLiege: 'lg_king',
      rank: 2,
      claimHint: false,
      ownerKept: true
    });
  });

test('an independent count with a duchy majority still promotes as before',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var out = {};
      var homeId = LG.resetCount(s);
      var did = LG.smallDuchy(s, homeId);
      out.duchyFound = !!did;
      var cs = did ? FB.duchyCounties(did) : [];
      for (var i = 0; i < cs.length; i++) LG.giveToPlayer(s, cs[i], 'player');
      FB.invalidateRealmCache();

      FB.checkTierPromotions(s);
      out.tier = p.tier;
      out.liege = p.liege;
      out.claimHint = !!(p.flags && p.flags.duchy_claim_hint);
      return out;
    });

    expect(result).toEqual({
      duchyFound: true,
      tier: 5,
      liege: null,
      claimHint: false
    });
  });

test('a duke kneeling to a mere duke lapses back to count',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var out = {};
      var B = FBDATA.balance;
      var homeId = LG.resetCount(s);
      LG.makeRealm(s, 'lg_duke', 'Test Duchy', 2, null, homeId,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_duke');
      p.tier = 5;
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 2;
      s.realms.player.liege = 'lg_duke';
      var did = LG.smallDuchy(s, homeId);
      out.duchyFound = !!did;
      var cs = did ? FB.duchyCounties(did) : [];
      for (var i = 0; i < cs.length; i++) LG.giveToPlayer(s, cs[i], 'lg_duke');
      FB.invalidateRealmCache();

      FB.checkTierPromotions(s);
      out.stamped = !!p.titleLapse && p.titleLapse.tier === 5;

      s.turn += (B.titleLapseDemoteDays || 540) + 1;
      FB.checkTierPromotions(s);
      out.fallenTier = p.tier;
      out.lapseCleared = !p.titleLapse;
      out.liegeKept = p.liege;
      out.rank = s.realms.player.rank;

      // the land remains, the style stays out of reach: stable as a count
      FB.checkTierPromotions(s);
      out.stillTier = p.tier;
      return out;
    });

    expect(result).toEqual({
      duchyFound: true,
      stamped: true,
      fallenTier: 4,
      lapseCleared: true,
      liegeKept: 'lg_duke',
      rank: 1,
      stillTier: 4
    });
  });

test('a duke sworn to a king keeps his style (no lapse under the crown)',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var out = {};
      var homeId = LG.resetCount(s);
      LG.makeRealm(s, 'lg_king', 'Test Kingdom', 3, null, homeId,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_king');
      p.tier = 5;
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 2;
      s.realms.player.liege = 'lg_king';
      var did = LG.smallDuchy(s, homeId);
      out.duchyFound = !!did;
      var cs = did ? FB.duchyCounties(did) : [];
      for (var i = 0; i < cs.length; i++) LG.giveToPlayer(s, cs[i], 'lg_king');
      FB.invalidateRealmCache();

      FB.checkTierPromotions(s);
      out.noLapse = !p.titleLapse;
      out.tier = p.tier;
      return out;
    });

    expect(result).toEqual({
      duchyFound: true,
      noLapse: true,
      tier: 5
    });
  });

test('grant candidates exclude the liege’s seat and his last county',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var out = {};
      var homeId = LG.resetCount(s);
      LG.makeRealm(s, 'lg_duke', 'Test Duchy', 2, null, null,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_duke');
      var nbs = LG.neighbors(s, homeId);
      out.twoNeighbors = nbs.length >= 2;
      var a = nbs[0], b = nbs[1];
      s.owner[a] = 'lg_duke';
      s.holder[a] = 'lg_duke';
      s.owner[b] = 'lg_duke';
      s.holder[b] = 'lg_duke';
      s.realms.lg_duke.capital = a;
      FB.invalidateRealmCache();

      // two counties in hand, one of them his seat: only the other is giftable
      var cands = FB.liegeGrantCandidates(s);
      out.onlyNonCapital = cands.length === 1 && cands[0] === b;

      // one county in hand: nothing at all — he would give his power base away
      s.holder[b] = 'player';
      s.player.provs.push(b);
      FB.invalidateRealmCache();
      out.emptyWhenOneLeft = FB.liegeGrantCandidates(s).length === 0;
      return out;
    });

    expect(result).toEqual({
      twoNeighbors: true,
      onlyNonCapital: true,
      emptyWhenOneLeft: true
    });
  });

test('grantByLiege grants a county inside the realm and keeps the liege',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var out = {};
      var homeId = LG.resetCount(s);
      LG.makeRealm(s, 'lg_duke', 'Test Duchy', 2, null, null,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_duke');
      var nbs = LG.neighbors(s, homeId);
      out.twoNeighbors = nbs.length >= 2;
      var a = nbs[0], b = nbs[1];
      s.owner[a] = 'lg_duke';
      s.holder[a] = 'lg_duke';
      s.owner[b] = 'lg_duke';
      s.holder[b] = 'lg_duke';
      s.realms.lg_duke.capital = a;
      FB.invalidateRealmCache();

      // b is the only candidate (a is his seat), so the pick is deterministic
      FB.grantByLiege(s);
      out.gotCounty = p.provs.indexOf(b) >= 0;
      out.holderFlipped = s.holder[b] === 'player';
      out.liegeKept = p.liege === 'lg_duke';
      out.realmLiegeKept = s.realms.player.liege === 'lg_duke';
      out.ownerKept = s.owner[b] === 'lg_duke';
      out.dukeKeepsSeat = s.holder[a] === 'lg_duke' &&
        !!s.realms.lg_duke.alive;
      out.grantCounted = (p.liegeGrants || 0) === 1;
      out.tierStayed = p.tier === 4;
      return out;
    });

    expect(result).toEqual({
      twoNeighbors: true,
      gotCounty: true,
      holderFlipped: true,
      liegeKept: true,
      realmLiegeKept: true,
      ownerKept: true,
      dukeKeepsSeat: true,
      grantCounted: true,
      tierStayed: true
    });
  });

test('the petition deed explains itself when the liege has nothing to give',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var me = s.chars[s.player.charId];
      var out = {};
      var homeId = LG.resetCount(s);
      LG.makeRealm(s, 'lg_duke', 'Test Duchy', 2, null, null,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_duke');
      FB.setRealmRulerStanding(s, 'lg_duke', 100);
      var deed = LG.deed('petition_liege');
      out.deedFound = !!deed;
      if (!deed) return out;

      // standing and prestige suffice, but the duke holds no land in his gift
      out.noGiftReason = typeof deed.can(s) === 'string';
      out.descHintsCrown = deed.desc(s).indexOf('crown') >= 0;

      // land in hand (one county not his seat): the deed opens
      var nbs = LG.neighbors(s, homeId);
      out.twoNeighbors = nbs.length >= 2;
      var a = nbs[0], b = nbs[1];
      s.owner[a] = 'lg_duke';
      s.holder[a] = 'lg_duke';
      s.owner[b] = 'lg_duke';
      s.holder[b] = 'lg_duke';
      s.realms.lg_duke.capital = a;
      FB.invalidateRealmCache();
      out.canWhenGiftable = deed.can(s) === true;

      // a king liege gets the full ask (lands and style)
      LG.makeRealm(s, 'lg_king', 'Test Kingdom', 3, null, null,
        me.religion, me.culture);
      LG.swearTo(s, 'lg_king');
      FB.setRealmRulerStanding(s, 'lg_king', 100);
      out.descUnderKing = deed.desc(s).indexOf('higher style') >= 0;
      return out;
    });

    expect(result).toEqual({
      deedFound: true,
      noGiftReason: true,
      descHintsCrown: true,
      twoNeighbors: true,
      canWhenGiftable: true,
      descUnderKing: true
    });
  });
