'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/politics.js',
  'js/world.js',
  'data/events_politics.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

/* Builds a synthetic independent rank-3 realm claiming the first de jure
   kingdom, directly holding the given counties, and returns the ids the
   scenario needs. Counties are stolen from their current owners by direct
   assignment, so the cache is invalidated by hand. */
function arrangeClaimant(page, countyIds, capital) {
  return page.evaluate(function (args) {
    const s = FB.state;
    const kid = Object.keys(FBDATA.kingdoms)[0];
    const rid = 'test_claimant';
    s.realms[rid] = {
      id: rid, name: 'Kingdom of ' + FBDATA.kingdoms[kid].name,
      color: '#123456', capital: args.capital, aggression: 1, rank: 3,
      liege: null, religion: null, alive: true,
      ruler: { name: 'Test King', sex: 'm', culture: 'frankish', age: 40,
        mar: 5, generation: 1 },
      war: null, op: 0
    };
    for (const pid of args.countyIds) {
      s.owner[pid] = rid;
      s.holder[pid] = rid;
    }
    FB.invalidateRealmCache();
    return { rid: rid, kid: kid };
  }, { countyIds: countyIds, capital: capital });
}

/* The fixture geography: the claimed kingdom, one whole duchy outside it
   (2+ counties), and one county inside the kingdom. */
function fixtureGeography(page) {
  return page.evaluate(function () {
    const kid = Object.keys(FBDATA.kingdoms)[0];
    let outsideDuchy = null;
    for (const did in FBDATA.duchies) {
      if (FBDATA.duchies[did].kingdom === kid) continue;
      if (FB.duchyCounties(did).length >= 2) { outsideDuchy = did; break; }
    }
    const outsideCounties = FB.duchyCounties(outsideDuchy);
    const insideCounty = FB.kingdomCounties(kid)[0];
    return {
      kid: kid,
      outsideDuchy: outsideDuchy,
      outsideDuchyName: FBDATA.duchies[outsideDuchy].name,
      outsideCounties: outsideCounties,
      outsideOne: [outsideCounties[0]],
      outsideOneCapitalName: FB.world.byId[outsideCounties[0]].name,
      insideCounty: insideCounty
    };
  });
}

test('a king with no land left in his kingdom is restyled to his duchy majority',
  async function ({ page }) {
    await startDeterministicGame(page);
    const geo = await fixtureGeography(page);
    const claim = await arrangeClaimant(page, geo.outsideCounties,
      geo.outsideCounties[0]);
    const result = await page.evaluate(function (args) {
      const s = FB.state;
      const lapsed = FB.checkCrownRecognition(s, args.rid);
      const r = s.realms[args.rid];
      return {
        lapsed: lapsed,
        rank: r.rank,
        name: r.name,
        alive: r.alive,
        news: s.log.some(function (entry) {
          return entry.msg && entry.msg.key === 'news.world.crown_lapsed' &&
            entry.msg.params.kingdom === FBDATA.kingdoms[args.kid].name;
        })
      };
    }, claim);

    expect(result.lapsed).toBe(true);
    expect(result.alive).toBe(true);
    expect(result.rank).toBe(2);
    expect(result.name).toBe('Duchy of ' + geo.outsideDuchyName);
    expect(result.news).toBe(true);
  });

test('a king without even a duchy majority falls to his capital county',
  async function ({ page }) {
    await startDeterministicGame(page);
    const geo = await fixtureGeography(page);
    const claim = await arrangeClaimant(page, geo.outsideOne, geo.outsideOne[0]);
    const result = await page.evaluate(function (rid) {
      const s = FB.state;
      const lapsed = FB.checkCrownRecognition(s, rid);
      const r = s.realms[rid];
      return { lapsed: lapsed, rank: r.rank, name: r.name };
    }, claim.rid);

    expect(result.lapsed).toBe(true);
    expect(result.rank).toBe(1);
    expect(result.name).toBe('County of ' + geo.outsideOneCapitalName);
  });

test('a rival king holding land in his kingdom keeps the royal style',
  async function ({ page }) {
    await startDeterministicGame(page);
    const geo = await fixtureGeography(page);
    const claim = await arrangeClaimant(page, [geo.insideCounty],
      geo.insideCounty);
    const result = await page.evaluate(function (args) {
      const s = FB.state;
      FB.checkAllCrownRecognition(s); // the yearly sweep leaves rivals be
      const r = s.realms[args.rid];
      return {
        rank: r.rank,
        name: r.name,
        expectedName: 'Kingdom of ' + FBDATA.kingdoms[args.kid].name
      };
    }, claim);

    expect(result.rank).toBe(3);
    expect(result.name).toBe(result.expectedName);
  });

test('a lapsed crown looses vassals of equal rank',
  async function ({ page }) {
    await startDeterministicGame(page);
    const geo = await fixtureGeography(page);
    const claim = await arrangeClaimant(page, geo.outsideCounties,
      geo.outsideCounties[0]);
    const result = await page.evaluate(function (args) {
      const s = FB.state;
      const vid = 'test_vassal_duke';
      s.realms[vid] = {
        id: vid, name: 'Duchy of Nowhere', color: '#654321',
        capital: args.vassalCounty, aggression: 1, rank: 2, liege: args.rid,
        religion: null, alive: true,
        ruler: { name: 'Test Duke', sex: 'm', culture: 'frankish', age: 40,
          mar: 5, generation: 1 },
        war: null, op: 0
      };
      // the duke holds one county of the claimant's bloc directly
      s.holder[args.vassalCounty] = vid;
      FB.invalidateRealmCache();
      FB.checkCrownRecognition(s, args.rid);
      const v = s.realms[vid];
      return {
        vassalLiege: v.liege,
        vassalCountyOwner: s.owner[args.vassalCounty],
        vassalCountyHolder: s.holder[args.vassalCounty],
        news: s.log.some(function (entry) {
          return entry.msg && entry.msg.key === 'news.world.vassal_loosed' &&
            entry.msg.params.realm === 'Duchy of Nowhere';
        })
      };
    }, { rid: claim.rid, vassalCounty: geo.outsideCounties[1] });

    expect(result.vassalLiege).toBeNull();
    expect(result.vassalCountyOwner).toBe('test_vassal_duke'); // sovereignty follows
    expect(result.vassalCountyHolder).toBe('test_vassal_duke');
    expect(result.news).toBe(true);
  });

test('conquest of the last in-kingdom county lapses the crown through transferProvince',
  async function ({ page }) {
    await startDeterministicGame(page);
    const geo = await fixtureGeography(page);
    // the rival holds one English county plus a foreign power base
    const holdings = [geo.insideCounty].concat(geo.outsideCounties);
    const claim = await arrangeClaimant(page, holdings, geo.outsideCounties[0]);
    const result = await page.evaluate(function (args) {
      const s = FB.state;
      const conqueror = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && id !== args.rid && s.realms[id].alive;
      })[0];
      const before = {
        rank: s.realms[args.rid].rank,
        lapsedBefore: FB.checkCrownRecognition(s, args.rid) // no-op while recognized
      };
      FB.transferProvince(s, args.insideCounty, conqueror);
      const r = s.realms[args.rid];
      return {
        beforeRank: before.rank,
        lapsedBefore: before.lapsedBefore,
        rank: r.rank,
        name: r.name,
        expectedName: 'Duchy of ' + args.outsideDuchyName,
        alive: r.alive,
        insideOwner: s.owner[args.insideCounty]
      };
    }, { rid: claim.rid, insideCounty: geo.insideCounty,
      outsideDuchyName: geo.outsideDuchyName });

    expect(result.beforeRank).toBe(3);
    expect(result.lapsedBefore).toBe(false); // rival phase held
    expect(result.insideOwner).not.toBe(claim.rid);
    expect(result.alive).toBe(true);
    expect(result.rank).toBe(2);
    expect(result.name).toBe(result.expectedName);
  });

test('a realm left with zero counties still dies instead of lapsing',
  async function ({ page }) {
    await startDeterministicGame(page);
    const geo = await fixtureGeography(page);
    const claim = await arrangeClaimant(page, geo.outsideOne, geo.outsideOne[0]);
    const result = await page.evaluate(function (args) {
      const s = FB.state;
      const conqueror = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && id !== args.rid && s.realms[id].alive;
      })[0];
      FB.transferProvince(s, args.county, conqueror);
      const r = s.realms[args.rid];
      return { alive: r.alive, rank: r.rank, name: r.name };
    }, { rid: claim.rid, county: geo.outsideOne[0] });

    expect(result.alive).toBe(false); // realm-death boundary, not a restyle
    expect(result.rank).toBe(3);
    expect(result.name).toContain('Kingdom of');
  });
