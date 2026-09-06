'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/bookmarks.js',
  'data/counties.js',
  'data/cultures.js',
  'data/modifiers.js',
  'data/technology.js',
  'js/economy.js',
  'js/events.js',
  'js/institutions.js',
  'js/market.js',
  'js/model.js',
  'js/modifiers.js',
  'js/actions.js',
  'js/population.js',
  'js/save.js',
  'js/world.js',
  'data/map_data.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test.describe('County Population & Lightweight Demographics Engine', function () {
  test('Market-scale reads and targeted writes do not trigger full-world population repair',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const oldEnsure = FB.ensurePopulationState;
        let fullRepairs = 0;
        FB.ensurePopulationState = function (target) {
          fullRepairs++;
          return oldEnsure(target);
        };
        let populationReads = 0;
        try {
          for (let i = 0; i < FB.world.provs.length; i++) {
            const province = FB.world.provs[i];
            if (!province || province.wasteland) continue;
            FB.countyPopulation(state, province.id);
            populationReads++;
          }
          FB.changeCountyPopulation(
            state, state.player.provinceId, 1, 'e2e targeted write');
          state.turn++;
          FB.marketSeason(state);
        } finally {
          FB.ensurePopulationState = oldEnsure;
        }
        return { fullRepairs:fullRepairs, populationReads:populationReads };
      });
      expect(result.populationReads).toBeGreaterThan(400);
      expect(result.fullRepairs).toBe(0);
    });

  test('Deterministic opening baseline fallback and bookmark overrides', async function ({ page }) {
    const results = await page.evaluate(function () {
      const state = FB.state || {};
      const provs = FB.world.provs.filter(function (p) { return !p.wasteland; });
      const floor = FBDATA.balance.populationFloor || 1000;
      let allAboveFloor = true;
      let matchesMath = true;
      const sample = [];

      for (let i = 0; i < Math.min(10, provs.length); i++) {
        const pr = provs[i];
        const base = FB.countyPopulationBaseline(state, pr.id);
        if (base < floor) allAboveFloor = false;

        const dev0 = pr.dev0 || pr.dev || 1;
        const table = FBDATA.balance.populationByDevelopment;
        const terrainFactors = FBDATA.balance.populationTerrainFactors;
        const tf = terrainFactors[pr.terrain] !== undefined ? terrainFactors[pr.terrain] : 1.0;
        const expected = Math.max(floor, Math.round((table[dev0 - 1] * tf) / 100) * 100);
        if (base !== expected) matchesMath = false;

        sample.push({ pid: pr.id, dev0: dev0, terrain: pr.terrain, base: base, expected: expected });
      }

      return { allAboveFloor: allAboveFloor, matchesMath: matchesMath, sample: sample };
    });

    expect(results.allAboveFloor).toBe(true);
    expect(results.matchesMath).toBe(true);
  });

  test('Schema-2 opening communities exactly partition county population without mutating authored data',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const authoredBefore = JSON.stringify(FB.bookmark(state.start.id).provinces);
        let exact = true;
        let inhabited = 0;
        for (let i = 0; i < FB.world.provs.length; i++) {
          const province = FB.world.provs[i];
          if (!province || province.wasteland) continue;
          inhabited++;
          const rec = state.population.counties[province.id];
          const sum = rec.communities.reduce(function (total, community) {
            return total + community.count;
          }, 0);
          if (sum !== rec.count || rec.communities.some(function (community) {
            return !Number.isInteger(community.count) || community.count <= 0;
          })) exact = false;
        }
        const york = FB.countyCommunities(state, 'york');
        york[0].count = 1;
        const dominant = FB.countyDominantCommunity(state, 'york');
        const originalRng = FB.rng;
        FB.rng = function () { return 0.99; };
        const picked = FB.pickCountyCommunity(state, 'york');
        FB.rng = originalRng;
        const authoredAfter = JSON.stringify(FB.bookmark(state.start.id).provinces);
        return {
          schema:state.population.schema,
          exact:exact,
          inhabited:inhabited,
          records:Object.keys(state.population.counties).filter(function (pid) {
            return FB.world.byId[pid] && !FB.world.byId[pid].wasteland;
          }).length,
          copySafe:FB.countyCommunities(state, 'york')[0].count !== 1,
          authoredStable:authoredBefore === authoredAfter,
          yorkCulture:FB.countyCulture(state, 'york'),
          yorkReligion:FB.countyReligion(state, 'york'),
          dominant:dominant.culture + '.' + dominant.religion,
          weightedPick:picked.culture + '.' + picked.religion,
          englishShare:FB.countyCultureShare(state, 'york', 'english'),
          catholicShare:FB.countyReligionShare(state, 'york', 'catholic')
        };
      });

      expect(result.schema).toBe(2);
      expect(result.exact).toBe(true);
      expect(result.records).toBe(result.inhabited);
      expect(result.copySafe).toBe(true);
      expect(result.authoredStable).toBe(true);
      expect(result.yorkCulture).toBe('english');
      expect(result.yorkReligion).toBe('catholic');
      expect(result.dominant).toBe('english.catholic');
      expect(result.weightedPick).toBe('norse.norse_pagan');
      expect(result.englishShare).toBeCloseTo(0.75, 4);
      expect(result.catholicShare).toBeCloseTo(0.75, 4);
    });

  test('Population mutations apportion ordinary changes, honor targeted policies, and move exact cohorts',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const york = state.population.counties.york;
        york.count = 10000;
        york.communities = [
          { culture:'english', religion:'catholic', count:8000 },
          { culture:'norse', religion:'norse_pagan', count:2000 }
        ];
        FB.reconcileCountyCommunities(state, 'york');

        const growth = FB.changeCountyPopulation(state, 'york', 7, 'test_growth');
        const afterGrowth = FB.countyCommunities(state, 'york');
        const ordinaryLoss = FB.changeCountyPopulation(
          state, 'york', -7, 'test_loss');
        const afterOrdinary = FB.countyCommunities(state, 'york');
        const capture = FB.damageCountyPopulation(state, 'york', 'test_capture');
        const afterCapture = FB.countyCommunities(state, 'york');

        york.count = 10000;
        york.communities = [
          { culture:'english', religion:'catholic', count:8000 },
          { culture:'norse', religion:'norse_pagan', count:2000 }
        ];
        FB.reconcileCountyCommunities(state, 'york');
        const targeted = FB.changeCountyPopulationRate(
          state, 'york', -0.10, 'test_persecution', {
            communityPolicy:{ religion:'norse_pagan' }
          });
        const afterTargeted = FB.countyCommunities(state, 'york');
        FB.applyEffects(state, {
          populationLoss:100,
          populationCommunity:{ culture:'english', religion:'catholic' }
        }, { provinceId:'york' }, { id:'test_targeted_population' });
        const afterScripted = FB.countyCommunities(state, 'york');
        const colonized = FB.changeCountyPopulation(
          state, 'york', 30, 'test_colonization', {
            communityPolicy:{ culture:'gaelic', religion:'orthodox' }
          });
        const moved = FB.moveCommunityPopulation(state, 'york', 'london', [
          { culture:'gaelic', religion:'orthodox', count:30 }
        ], 'test_expulsion');
        const london = FB.countyCommunities(state, 'london');
        const floorLoss = FB.changeCountyPopulation(
          state, 'york', -1000000, 'test_floor');
        return {
          growth:growth,
          afterGrowth:afterGrowth,
          ordinaryLoss:ordinaryLoss,
          afterOrdinary:afterOrdinary,
          capture:capture,
          afterCapture:afterCapture,
          targeted:targeted,
          afterTargeted:afterTargeted,
          afterScripted:afterScripted,
          colonized:colonized,
          moved:moved,
          londonIntroduced:london.filter(function (community) {
            return community.culture === 'gaelic' &&
              community.religion === 'orthodox';
          })[0],
          floorLoss:floorLoss,
          floorCount:state.population.counties.york.count,
          populationFloor:FBDATA.balance.populationFloor || 1000,
          faults:FB.validatePopulationCommunities(state)
        };
      });

      expect(result.growth).toBe(7);
      expect(result.afterGrowth).toEqual([
        { culture:'english', religion:'catholic', count:8006 },
        { culture:'norse', religion:'norse_pagan', count:2001 }
      ]);
      expect(result.ordinaryLoss).toBe(-7);
      expect(result.afterOrdinary).toEqual([
        { culture:'english', religion:'catholic', count:8000 },
        { culture:'norse', religion:'norse_pagan', count:2000 }
      ]);
      expect(result.capture).toBeLessThan(0);
      expect(result.afterCapture[0].count + result.afterCapture[1].count)
        .toBe(10000 + result.capture);
      expect(result.afterCapture[0].count * 4).toBe(result.afterCapture[1].count * 16);
      expect(result.targeted).toBe(-1000);
      expect(result.afterTargeted).toEqual([
        { culture:'english', religion:'catholic', count:8000 },
        { culture:'norse', religion:'norse_pagan', count:1000 }
      ]);
      expect(result.afterScripted[0].count).toBeLessThan(8000);
      expect(result.afterScripted[1]).toEqual({
        culture:'norse', religion:'norse_pagan', count:1000
      });
      expect(result.colonized).toBe(30);
      expect(result.moved).toEqual({
        count:30,
        cohorts:[{ culture:'gaelic', religion:'orthodox', count:30 }]
      });
      expect(result.londonIntroduced).toEqual({
        culture:'gaelic', religion:'orthodox', count:30
      });
      expect(result.floorCount).toBe(result.populationFloor);
      expect(result.floorLoss).toBe(-result.afterScripted[0].count);
      expect(result.faults).toEqual([]);
    });

  test('Annual cohort migration is conserved, order-independent, and zero-RNG',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const sourcePid = 'york';
        const targetPid = Object.keys(FB.world.adj[sourcePid] || {}).sort().filter(
          function (pid) {
            return FB.world.byId[pid] && !FB.world.byId[pid].wasteland;
          })[0];
        const first = JSON.parse(JSON.stringify(FB.state));
        first.date.year += 1;
        first.population.lastYear = first.date.year - 1;
        first.population.counties[sourcePid].count = 100000;
        first.population.counties[sourcePid].communities = [
          { culture:'english', religion:'catholic', count:50000 },
          { culture:'gaelic', religion:'orthodox', count:50000 }
        ];
        const targetDef = FB.world.byId[targetPid];
        const targetCount = first.population.counties[targetPid].count;
        first.population.counties[targetPid].communities = [{
          culture:targetDef.culture, religion:targetDef.religion, count:targetCount
        }];
        FB.reconcileCountyCommunities(first, sourcePid);
        FB.reconcileCountyCommunities(first, targetPid);
        const second = JSON.parse(JSON.stringify(first));
        const originalAttraction = FB.countyMigrationAttraction;
        const originalProvs = FB.world.provs;
        const originalAdj = FB.world.adj;
        const rngBefore = FB.getRngState();
        let rngAfter;
        try {
          FB.countyMigrationAttraction = function (state, pid) {
            return pid === targetPid ? 5 : 0;
          };
          FB.populationYear(first);
          rngAfter = FB.getRngState();

          FB.world.provs = originalProvs.slice().reverse();
          const reversedAdj = {};
          Object.keys(originalAdj).sort().reverse().forEach(function (pid) {
            reversedAdj[pid] = {};
            Object.keys(originalAdj[pid] || {}).sort().reverse().forEach(
              function (neighbor) {
                reversedAdj[pid][neighbor] = originalAdj[pid][neighbor];
              });
          });
          FB.world.adj = reversedAdj;
          FB.populationYear(second);
        } finally {
          FB.countyMigrationAttraction = originalAttraction;
          FB.world.provs = originalProvs;
          FB.world.adj = originalAdj;
        }
        let migrationTotal = 0;
        for (const pid in first.population.counties) {
          migrationTotal += first.population.counties[pid].migration;
        }
        return {
          targetPid:targetPid,
          migrationTotal:migrationTotal,
          targetMigration:first.population.counties[targetPid].migration,
          introduced:FB.countyCommunities(first, targetPid).some(function (community) {
            return community.culture === 'gaelic' &&
              community.religion === 'orthodox' && community.count > 0;
          }),
          samePopulation:JSON.stringify(first.population) ===
            JSON.stringify(second.population),
          rngStable:rngBefore === rngAfter,
          faults:FB.validatePopulationCommunities(first)
        };
      });

      expect(result.targetPid).toBeTruthy();
      expect(result.migrationTotal).toBe(0);
      expect(result.targetMigration).toBeGreaterThan(0);
      expect(result.introduced).toBe(true);
      expect(result.samePopulation).toBe(true);
      expect(result.rngStable).toBe(true);
      expect(result.faults).toEqual([]);
    });

  test('Atomic community transfers preserve population and the untouched identity axis',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const rec = state.population.counties.york;
        rec.count = 10000;
        rec.communities = [
          { culture:'english', religion:'catholic', count:6000 },
          { culture:'norse', religion:'catholic', count:1000 },
          { culture:'norse', religion:'norse_pagan', count:3000 }
        ];
        rec.identity = {
          culture:'english', religion:'catholic',
          cultureSince:state.date.year - 20,
          religionSince:state.date.year - 20
        };
        FB.reconcileCountyCommunities(state, 'york');
        const before = JSON.stringify(FB.countyCommunities(state, 'york'));
        const faith = FB.convertCountyCommunity(state, 'york', {
          kind:'faith', target:'orthodox', source:'catholic', amount:2800
        });
        const afterFaith = FB.countyCommunities(state, 'york');
        const faithTotals = {};
        afterFaith.forEach(function (community) {
          faithTotals[community.religion] =
            (faithTotals[community.religion] || 0) + community.count;
        });
        const culture = FB.convertCountyCommunity(state, 'york', {
          kind:'culture', target:'gaelic', source:'norse', amount:2000
        });
        const afterCulture = FB.countyCommunities(state, 'york');
        const afterCultureFaithTotals = {};
        afterCulture.forEach(function (community) {
          afterCultureFaithTotals[community.religion] =
            (afterCultureFaithTotals[community.religion] || 0) + community.count;
        });
        const customFaith = FB.foundFaith(state, {
          id:'e2e_project_faith', name:'Project Test Faith',
          group:'$current', relationToParent:'in_fold'
        }, { convertFounder:false });
        const custom = FB.convertCountyCommunity(state, 'york', {
          kind:'faith', target:customFaith, amount:100
        });
        return {
          before:before,
          faith:faith,
          afterFaith:afterFaith,
          faithTotals:faithTotals,
          culture:culture,
          afterCulture:afterCulture,
          afterCultureFaithTotals:afterCultureFaithTotals,
          customFaith:customFaith,
          custom:custom,
          customShare:FB.countyReligionShare(state, 'york', customFaith),
          count:rec.count,
          sum:FB.countyCommunities(state, 'york').reduce(
            function (total, community) { return total + community.count; }, 0),
          changes:rec.communityChange,
          faults:FB.validatePopulationCommunities(state)
        };
      });

      expect(result.before).toContain('english');
      expect(result.faith.count).toBe(2800);
      expect(result.faith.cohorts).toEqual([
        {
          fromCulture:'english', fromReligion:'catholic',
          toCulture:'english', toReligion:'orthodox', count:2400
        },
        {
          fromCulture:'norse', fromReligion:'catholic',
          toCulture:'norse', toReligion:'orthodox', count:400
        }
      ]);
      expect(result.faithTotals).toEqual({
        catholic:4200, norse_pagan:3000, orthodox:2800
      });
      expect(result.culture.count).toBe(2000);
      expect(result.afterCultureFaithTotals).toEqual(result.faithTotals);
      expect(result.afterCulture.filter(function (community) {
        return community.culture === 'gaelic';
      }).reduce(function (total, community) {
        return total + community.count;
      }, 0)).toBe(2000);
      expect(result.customFaith).toBe('e2e_project_faith');
      expect(result.custom.count).toBe(100);
      expect(result.customShare).toBeCloseTo(0.01, 6);
      expect(result.count).toBe(10000);
      expect(result.sum).toBe(10000);
      expect(result.changes).toEqual({
        faithConverted:2900, cultureAssimilated:2000
      });
      expect(result.faults).toEqual([]);
    });

  test('County project progress is saved, bounded, deterministic, and once yearly',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const player = state.player;
        const me = state.chars[player.charId];
        const rec = state.population.counties.york;
        state.owner.york = 'player';
        player.tier = 4;
        if (player.provs.indexOf('york') < 0) player.provs.push('york');
        me.culture = 'norse';
        me.religion = 'norse_pagan';
        if (state.realms.player) state.realms.player.religion = 'norse_pagan';
        rec.count = 10000;
        rec.communities = [
          { culture:'english', religion:'catholic', count:7000 },
          { culture:'norse', religion:'norse_pagan', count:3000 }
        ];
        rec.identity = {
          culture:'english', religion:'catholic',
          cultureSince:state.date.year - 30,
          religionSince:state.date.year - 30
        };
        FB.reconcileCountyCommunities(state, 'york');
        const faith = FB.startCountyCommunityProject(state, 'york', {
          kind:'faith', target:'norse_pagan', policy:'voluntary',
          sponsor:'player'
        });
        const orderStatus = FB.countyCommunityProjectOrderStatus(
          state, 'york', 'culture', 'norse', 'integrative');
        const ordered = FB.orderCountyCommunityProject(
          state, 'york', 'culture', 'norse', 'integrative');
        const culture = FB.countyCommunityProject(state, 'york', 'culture');
        const status = FB.countyCommunityProjectStatus(state, 'york', 'faith');
        state.date.year += 1;
        const snapshot = JSON.stringify(state);
        const first = FB.resolveCountyCommunityProjects(
          state, 'york', state.date.year);
        const afterFirst = JSON.stringify(state.population.counties.york);
        const repeated = FB.resolveCountyCommunityProjects(
          state, 'york', state.date.year);
        const replay = JSON.parse(snapshot);
        const second = FB.resolveCountyCommunityProjects(
          replay, 'york', replay.date.year);
        const afterSecond = JSON.stringify(replay.population.counties.york);
        const conquered = JSON.parse(snapshot);
        conquered.owner.york = 'abbasid';
        conquered.holder = conquered.holder || {};
        conquered.holder.york = 'abbasid';
        const conqueredBefore = JSON.stringify(
          FB.countyCommunities(conquered, 'york'));
        const conqueredResult = FB.resolveCountyCommunityProjects(
          conquered, 'york', conquered.date.year);
        return {
          faith:faith,
          culture:culture,
          orderStatus:orderStatus,
          ordered:ordered,
          status:status,
          first:first,
          repeated:repeated,
          sameResults:JSON.stringify(first) === JSON.stringify(second),
          sameState:afterFirst === afterSecond,
          conqueredResult:conqueredResult,
          conquestStable:conqueredBefore === JSON.stringify(
            FB.countyCommunities(conquered, 'york')),
          conqueredProject:FB.countyCommunityProject(
            conquered, 'york', 'faith'),
          faithProject:FB.countyCommunityProject(state, 'york', 'faith'),
          cultureProject:FB.countyCommunityProject(state, 'york', 'culture'),
          total:state.population.counties.york.count,
          sum:FB.countyCommunities(state, 'york').reduce(
            function (total, community) { return total + community.count; }, 0),
          faults:FB.validatePopulationCommunities(state)
        };
      });

      expect(result.faith).toMatchObject({
        target:'norse_pagan', sponsor:'player', policy:'voluntary',
        progress:0, converted:0, resistance:0, lastTransfer:0
      });
      expect(result.culture).toMatchObject({
        target:'norse', sponsor:'player', policy:'integrative'
      });
      expect(result.orderStatus.ready).toBe(true);
      expect(result.ordered).toBe(true);
      expect(result.status.control).toBe(true);
      expect(result.status.rulerMatches).toBe(true);
      expect(result.status.rate).toBeGreaterThan(0);
      expect(result.status.rate).toBeLessThanOrEqual(0.006);
      expect(result.first).toHaveLength(2);
      expect(result.first[0].count).toBeGreaterThan(0);
      expect(result.first[1].count).toBeGreaterThan(0);
      expect(result.repeated).toEqual([]);
      expect(result.sameResults).toBe(true);
      expect(result.sameState).toBe(true);
      expect(result.conqueredResult.every(function (entry) {
        return entry.count === 0;
      })).toBe(true);
      expect(result.conquestStable).toBe(true);
      expect(result.conqueredProject).not.toBeNull();
      expect(result.faithProject.converted).toBe(result.first[0].count);
      expect(result.cultureProject.converted).toBe(result.first[1].count);
      expect(result.total).toBe(10000);
      expect(result.sum).toBe(10000);
      expect(result.faults).toEqual([]);
    });

  test('Coercive policy raises resistance, unrest, and migration pressure',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const baseline = JSON.parse(JSON.stringify(FB.state));
        function prepare(policy) {
          const state = JSON.parse(JSON.stringify(baseline));
          const player = state.player;
          const me = state.chars[player.charId];
          state.owner.york = 'player';
          player.tier = 4;
          if (player.provs.indexOf('york') < 0) player.provs.push('york');
          me.religion = 'norse_pagan';
          if (state.realms.player) state.realms.player.religion = 'norse_pagan';
          const rec = state.population.counties.york;
          rec.count = 10000;
          rec.communities = [
            { culture:'english', religion:'catholic', count:8000 },
            { culture:'norse', religion:'norse_pagan', count:2000 }
          ];
          rec.identity = {
            culture:'english', religion:'catholic',
            cultureSince:state.date.year - 40,
            religionSince:state.date.year - 40
          };
          FB.reconcileCountyCommunities(state, 'york');
          FB.startCountyCommunityProject(state, 'york', {
            kind:'faith', target:'norse_pagan', policy:policy, sponsor:'player'
          });
          return state;
        }
        const voluntary = prepare('voluntary');
        const integrative = prepare('integrative');
        const coercive = prepare('coercive');
        const voluntaryStatus = FB.countyCommunityProjectStatus(
          voluntary, 'york', 'faith');
        const integrativeStatus = FB.countyCommunityProjectStatus(
          integrative, 'york', 'faith');
        const coerciveStatus = FB.countyCommunityProjectStatus(
          coercive, 'york', 'faith');
        return {
          voluntary:voluntaryStatus,
          integrative:integrativeStatus,
          coercive:coerciveStatus,
          migration:FB.countyCommunityProjectMigrationPressure(coercive, 'york'),
          modifiers:(coercive.modifiers.county.york || []).map(
            function (modifier) { return modifier.id; })
        };
      });

      expect(result.voluntary.rate).toBeLessThanOrEqual(0.006);
      expect(result.integrative.rate).toBeLessThanOrEqual(0.012);
      expect(result.coercive.rate).toBeLessThanOrEqual(0.009);
      expect(result.coercive.resistance).toBeGreaterThan(
        result.integrative.resistance);
      expect(result.migration).toBeLessThan(0);
      expect(result.modifiers).toContain('community_coercion');
    });

  test('Plurality hysteresis is stable near a tie and yields to a clear lead or majority',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const rec = state.population.counties.york;
        rec.count = 10000;
        rec.identity = {
          culture:'english', religion:'catholic',
          cultureSince:state.date.year - 15,
          religionSince:state.date.year - 15
        };
        rec.communities = [
          { culture:'english', religion:'catholic', count:3201 },
          { culture:'norse', religion:'catholic', count:3499 },
          { culture:'gaelic', religion:'catholic', count:3300 }
        ];
        FB.reconcileCountyCommunities(state, 'york');
        const nearTie = FB.countyCulture(state, 'york');
        rec.communities = [
          { culture:'english', religion:'catholic', count:3100 },
          { culture:'norse', religion:'catholic', count:3600 },
          { culture:'gaelic', religion:'catholic', count:3300 }
        ];
        FB.reconcileCountyCommunities(state, 'york');
        const clearLead = FB.countyCulture(state, 'york');
        rec.communities = [
          { culture:'english', religion:'catholic', count:5100 },
          { culture:'norse', religion:'catholic', count:3000 },
          { culture:'gaelic', religion:'catholic', count:1900 }
        ];
        FB.reconcileCountyCommunities(state, 'york');
        return {
          nearTie:nearTie,
          clearLead:clearLead,
          majority:FB.countyCulture(state, 'york')
        };
      });

      expect(result).toEqual({
        nearTie:'english', clearLead:'norse', majority:'english'
      });
    });

  test('Event effects transfer, begin, and stop county community work explicitly',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const rec = state.population.counties.york;
        state.owner.york = 'player';
        rec.count = 10000;
        rec.communities = [
          { culture:'english', religion:'catholic', count:8000 },
          { culture:'norse', religion:'norse_pagan', count:2000 }
        ];
        FB.reconcileCountyCommunities(state, 'york');
        const transferEffects = {
          countyCommunityTransfer:{
            kind:'faith', target:'norse_pagan', amount:125
          }
        };
        const preview = FB.previewEventOption(state, {
          id:'e2e_community_preview', title:'Community preview', text:'Preview.'
        }, { label:'Proceed', effects:transferEffects }, { locationId:'york' });
        const previewActions = [];
        preview.sections.forEach(function (section) {
          section.impacts.forEach(function (impact) {
            if (impact.action) previewActions.push(impact.action);
          });
        });
        const transferLedger = FB.applyEffects(state, transferEffects,
          { locationId:'york' }, { id:'e2e_community_transfer' });
        const projectLedger = FB.applyEffects(state, {
          countyCommunityProject:{
            kind:'culture', target:'norse', policy:'integrative',
            sponsor:'$owner'
          }
        }, { locationId:'york' }, { id:'e2e_community_project' });
        const project = FB.countyCommunityProject(state, 'york', 'culture');
        const stopLedger = FB.applyEffects(state, {
          stopCountyCommunityProject:'culture'
        }, { locationId:'york' }, { id:'e2e_community_stop' });
        return {
          previewActions:previewActions,
          transferred:FB.countyReligionShare(state, 'york', 'norse_pagan'),
          transferLedger:transferLedger,
          projectLedger:projectLedger,
          project:project,
          stopLedger:stopLedger,
          stopped:FB.countyCommunityProject(state, 'york', 'culture')
        };
      });

      expect(result.previewActions).toContain('community_transfer');
      expect(result.transferred).toBeCloseTo(0.2125, 6);
      expect(result.transferLedger).toContainEqual(expect.objectContaining({
        type:'population', action:'community_transfer', pid:'york', amount:125,
        resolved:true
      }));
      expect(result.project).toMatchObject({
        target:'norse', sponsor:'player', policy:'integrative'
      });
      expect(result.projectLedger).toContainEqual(expect.objectContaining({
        type:'population', action:'community_project_start', pid:'york',
        resolved:true
      }));
      expect(result.stopLedger).toContainEqual(expect.objectContaining({
        type:'population', action:'community_project_stop', pid:'york',
        resolved:true
      }));
      expect(result.stopped).toBeNull();
    });

  test('Carrying capacity responds to buildings and technology with caps', async function ({ page }) {
    const capacityData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        owner: { dorset: 'wessex' },
        buildings: { dorset: [] },
        dev: { dorset: 2 },
        realms: { wessex: { id: 'wessex', alive: true, culture: 'anglo_saxon', religion: 'catholic' } },
        realmTechMigration: 2,
        realmTech: { wessex: { completed: [], active: [], exposed: [], progress: {}, reserve: 0 } }
      };
      FB.ensurePopulationState(state);

      const cap0 = FB.countyPopulationCapacity(state, 'dorset');
      const basePop = FB.countyPopulationBaseline(state, 'dorset');

      // Add mill (+5%) and harbor (+3%)
      state.buildings.dorset = [
        { id: 'mill', s: 0, turns: 0 },
        { id: 'harbor', s: 0, turns: 0 }
      ];
      const capWithBldgs = FB.countyPopulationCapacity(state, 'dorset');

      return {
        basePop: basePop,
        cap0: cap0,
        capWithBldgs: capWithBldgs,
        expectedBldgMultiplier: 1 + 0.05 + 0.03
      };
    });

    expect(capacityData.cap0).toBeGreaterThanOrEqual(capacityData.basePop);
    expect(capacityData.capWithBldgs).toBe(Math.round(capacityData.cap0 * capacityData.expectedBldgMultiplier));
  });

  test('Natural growth exhibits logistic pressure and clamps', async function ({ page }) {
    const growthData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        owner: {},
        dev: {},
        player: { charId: 'p1', provinceId: 'london', liege: null },
        realmTechMigration: 2,
        realmTech: {},
        population: {
          schema: 1,
          lastYear: 866,
          counties: {}
        }
      };

      const provs = FB.world.provs.filter(function (p) { return !p.wasteland; });
      const testPid = provs[0].id;
      const baseCap = FB.countyPopulationCapacity(state, testPid);

      // Sub-capacity state (P = 50% K)
      state.population.counties[testPid] = {
        count: Math.round(baseCap * 0.5),
        natural: 0,
        migration: 0,
        losses: 0
      };

      FB.populationYear(state);
      const subGrowth = state.population.counties[testPid].natural;

      // Over-capacity state (P = 150% K)
      state.date.year = 868;
      state.population.counties[testPid].count = Math.round(baseCap * 1.5);
      FB.populationYear(state);
      const overGrowth = state.population.counties[testPid].natural;

      return { subGrowth: subGrowth, overGrowth: overGrowth };
    });

    expect(growthData.subGrowth).toBeGreaterThan(0);
    expect(growthData.overGrowth).toBeLessThan(0);
  });

  test('Conserved land migration maintains zero world-sum delta and respects limits', async function ({ page }) {
    const migrationResult = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        owner: {},
        buildings: {},
        dev: {},
        player: { charId: 'p1', provinceId: 'london', liege: null },
        realmTechMigration: 2,
        realmTech: {},
        population: {
          schema: 1,
          lastYear: 866,
          counties: {}
        }
      };

      const provs = FB.world.provs.filter(function (p) { return !p.wasteland; });
      for (const pr of provs) {
        state.population.counties[pr.id] = {
          count: FB.countyPopulationBaseline(state, pr.id),
          natural: 0,
          migration: 0,
          losses: 0
        };
      }

      // Create an attraction disparity by giving one county buildings and low relative population
      const sourcePid = provs[0].id;
      const targetPid = Object.keys(FB.world.adj[sourcePid] || {})[0];
      if (targetPid) {
        state.buildings[targetPid] = [
          { id: 'market', s: 0, turns: 0 },
          { id: 'bridge', s: 0, turns: 0 }
        ];
      }

      FB.populationYear(state);

      let sumMigration = 0;
      let hasFlow = false;
      let communitiesExact = true;
      for (const pr of provs) {
        const rec = state.population.counties[pr.id];
        const mig = rec.migration;
        sumMigration += mig;
        if (mig !== 0) hasFlow = true;
        const communityTotal = rec.communities.reduce(function (sum, community) {
          return sum + community.count;
        }, 0);
        if (communityTotal !== rec.count) communitiesExact = false;
      }

      return {
        sumMigration:sumMigration,
        hasFlow:hasFlow,
        communitiesExact:communitiesExact
      };
    });

    expect(migrationResult.sumMigration).toBe(0);
    expect(migrationResult.hasFlow).toBe(true);
    expect(migrationResult.communitiesExact).toBe(true);
  });

  test('Annual migration calculates each county capacity once',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const originalCapacity = FB.countyPopulationCapacity;
        let capacityCalls = 0;
        FB.countyPopulationCapacity = function () {
          capacityCalls++;
          return originalCapacity.apply(this, arguments);
        };
        let inhabited = 0;
        for (let i = 0; i < FB.world.provs.length; i++) {
          if (FB.world.provs[i] && !FB.world.provs[i].wasteland) inhabited++;
        }
        state.population.lastYear = state.date.year - 1;
        try {
          FB.populationYear(state);
        } finally {
          FB.countyPopulationCapacity = originalCapacity;
        }
        return { capacityCalls:capacityCalls, inhabited:inhabited };
      });

      expect(result.capacityCalls).toBe(result.inhabited);
    });

  test('Population factor scales tax, levies, and market demand within 0.50 - 1.50 range', async function ({ page }) {
    const factorData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        population: { schema: 1, lastYear: 867, counties: {} }
      };

      const pid = 'dorset';
      const basePop = FB.countyPopulationBaseline(state, pid);

      // At baseline
      state.population.counties[pid] = { count: basePop, natural: 0, migration: 0, losses: 0 };
      const factorBase = FB.countyPopulationFactor(state, pid);

      // At 4x baseline -> sqrt(4) = 2.0 -> clamped to 1.50
      state.population.counties[pid].count = basePop * 4;
      const factorHigh = FB.countyPopulationFactor(state, pid);

      // At 0.25x baseline -> sqrt(0.25) = 0.50 -> clamped to 0.50
      state.population.counties[pid].count = Math.max(1000, Math.round(basePop * 0.25));
      const factorLow = FB.countyPopulationFactor(state, pid);

      return { factorBase: factorBase, factorHigh: factorHigh, factorLow: factorLow };
    });

    expect(factorData.factorBase).toBeCloseTo(1.0, 2);
    expect(factorData.factorHigh).toBe(1.50);
    expect(factorData.factorLow).toBe(0.50);
  });

  test('Fort tiers mitigate hostile siege capture losses', async function ({ page }) {
    const siegeData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        buildings: {},
        population: { schema: 1, lastYear: 867, counties: {} }
      };

      const pid = 'dorset';
      const basePop = FB.countyPopulationBaseline(state, pid);

      // Fort tier 0 (no fort)
      state.population.counties[pid] = { count: basePop, natural: 0, migration: 0, losses: 0 };
      const lossTier0 = FB.damageCountyPopulation(state, pid, 'capture');

      // Fort tier 4 (50% protection)
      state.buildings[pid] = [{ id: 'walls', s: 0, level: 4, ruined: false }];
      FB.rebuildFortIndex(state);
      state.population.counties[pid] = { count: basePop, natural: 0, migration: 0, losses: 0 };
      const lossTier4 = FB.damageCountyPopulation(state, pid, 'capture');

      return { lossTier0: lossTier0, lossTier4: lossTier4 };
    });

    expect(Math.abs(siegeData.lossTier4)).toBeLessThan(Math.abs(siegeData.lossTier0));
    expect(Math.abs(siegeData.lossTier4)).toBe(Math.round(Math.abs(siegeData.lossTier0) * 0.50));
  });

  test('Settlement population allocations sum exactly to county population', async function ({ page }) {
    const settlementResult = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        population: { schema: 1, lastYear: 867, counties: {} }
      };

      const provs = FB.world.provs.filter(function (p) {
        return !p.wasteland && FB.settlementsOf(state, p.id).length > 1;
      });
      let allSumExact = true;
      const samples = [];

      for (let i = 0; i < Math.min(10, provs.length); i++) {
        const pr = provs[i];
        const total = FB.countyPopulation(state, pr.id);
        const allocations = FB.settlementPopulations(state, pr.id);
        const sum = allocations.reduce(function (a, b) { return a + b; }, 0);
        if (sum !== total) allSumExact = false;
        samples.push({ pid: pr.id, total: total, allocations: allocations, sum: sum });
      }

      return { allSumExact: allSumExact, samples: samples };
    });

    expect(settlementResult.allSumExact).toBe(true);
  });

  test('Lazy save migration backfills population with dev scaling and building bonuses', async function ({ page }) {
    const migrationResult = await page.evaluate(function () {
      const oldState = {
        turn: 50,
        date: { year: 880 },
        dev: { dorset: 4 },
        buildings: { dorset: [{ id: 'mill', s: 0 }] },
        player: { charId: 'p1', provinceId: 'dorset', liege: null },
        realmTechMigration: 2,
        realmTech: {}
      };

      FB.ensurePopulationState(oldState);
      const dorsetRec = oldState.population && oldState.population.counties && oldState.population.counties.dorset;

      return {
        hasPopulation: !!oldState.population,
        schema: oldState.population ? oldState.population.schema : null,
        dorsetCount: dorsetRec ? dorsetRec.count : 0,
        baseline: FB.countyPopulationBaseline(oldState, 'dorset')
      };
    });

    expect(migrationResult.hasPopulation).toBe(true);
    expect(migrationResult.schema).toBe(2);
    expect(migrationResult.dorsetCount).toBeGreaterThan(migrationResult.baseline);
  });

  test('Schema-1 migration uses current totals, largest remainders, and byte-stable repair',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const oldState = {
          turn:500,
          start:{ id:'867', year:867, season:0, day:1 },
          date:{ year:912, season:2, day:20 },
          population:{
            schema:1,
            lastYear:911,
            counties:{
              atil:{ count:1001, natural:4, migration:-2, losses:-7 }
            }
          }
        };
        FB.ensurePopulationState(oldState);
        const first = JSON.stringify(oldState.population);
        const atil = JSON.parse(JSON.stringify(oldState.population.counties.atil));
        FB.ensurePopulationState(oldState);
        return {
          schema:oldState.population.schema,
          lastYear:oldState.population.lastYear,
          communities:atil.communities,
          identity:atil.identity,
          currentCount:atil.count,
          stable:first === JSON.stringify(oldState.population)
        };
      });

      expect(result.schema).toBe(2);
      expect(result.lastYear).toBe(911);
      expect(result.currentCount).toBe(1001);
      expect(result.communities).toEqual([
        { culture:'khazar', religion:'jewish', count:401 },
        { culture:'khazar', religion:'tengri', count:350 },
        { culture:'turkic', religion:'tengri', count:250 }
      ]);
      expect(result.identity).toEqual({
        culture:'khazar', religion:'tengri',
        cultureSince:912, religionSince:912
      });
      expect(result.stable).toBe(true);
    });

  test('Malformed and custom-faith communities repair deterministically with the principal remainder',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const customFaith = FB.foundFaith(state, {
          id:'e2e_county_faith',
          name:'County Test Faith',
          group:'$current',
          relationToParent:'in_fold'
        }, { convertFounder:false });
        const rec = state.population.counties.york;
        rec.count = 1000;
        rec.communities = [
          { culture:'english', religion:'catholic', count:100 },
          { culture:'english', religion:'catholic', count:50 },
          { culture:'norse', religion:'norse_pagan', count:200 },
          { culture:'norse', religion:'norse_pagan', count:100 },
          { culture:'english', religion:customFaith, count:100 },
          { culture:'missing', religion:'catholic', count:100 },
          { culture:'english', religion:'catholic', count:-25 }
        ];
        rec.identity = { culture:'missing', religion:'missing' };
        FB.ensurePopulationState(state);
        const first = JSON.stringify(rec);
        const projection = FB.countyCommunities(state, 'york');
        FB.ensurePopulationState(state);
        const overfull = state.population.counties.scarborough;
        overfull.count = 1000;
        overfull.communities = [
          { culture:'norse', religion:'norse_pagan', count:800 },
          { culture:'gaelic', religion:customFaith, count:600 }
        ];
        FB.ensurePopulationState(state);
        return {
          communities:projection,
          overfull:FB.countyCommunities(state, 'scarborough'),
          identity:rec.identity,
          customFaith:customFaith,
          exact:projection.reduce(function (sum, community) {
            return sum + community.count;
          }, 0) === rec.count,
          stable:first === JSON.stringify(rec)
        };
      });

      expect(result.customFaith).toBe('e2e_county_faith');
      expect(result.communities).toEqual([
        { culture:'english', religion:'catholic', count:600 },
        { culture:'norse', religion:'norse_pagan', count:300 },
        { culture:'english', religion:'e2e_county_faith', count:100 }
      ]);
      expect(result.overfull).toEqual([
        { culture:'norse', religion:'norse_pagan', count:571 },
        { culture:'gaelic', religion:'e2e_county_faith', count:429 }
      ]);
      expect(result.identity.culture).toBe('english');
      expect(result.identity.religion).toBe('catholic');
      expect(result.exact).toBe(true);
      expect(result.stable).toBe(true);
    });

  test('Community save growth stays bounded for both bookmarks and mature mixed states',
    async function ({ page }) {
      const result = await page.evaluate(async function () {
        function activate(bookmarkId) {
          return new Promise(function (resolve, reject) {
            FB.activateBookmark(bookmarkId, function () {}, function (error) {
              if (error) reject(error);
              else resolve();
            });
          });
        }
        function withoutCommunities(population) {
          const legacy = JSON.parse(JSON.stringify(population));
          legacy.schema = 1;
          for (const pid in legacy.counties) {
            delete legacy.counties[pid].communities;
            delete legacy.counties[pid].identity;
            delete legacy.counties[pid].communityChange;
            delete legacy.counties[pid].communityProjects;
            delete legacy.counties[pid].settlementCommunityProjects;
          }
          return legacy;
        }
        function measure() {
          const state = {
            start:{ id:FB.activeBookmarkId, year:FB.activeBookmark.date.year },
            date:{ year:FB.activeBookmark.date.year },
            owner:{}, buildings:{}, dev:{}, realms:{},
            realmTechMigration:2, realmTech:{}
          };
          FB.ensurePopulationState(state);
          const schema2 = JSON.stringify(state.population).length;
          const schema1 = JSON.stringify(withoutCommunities(state.population)).length;
          const cultureIds = Object.keys(FBDATA.cultures).sort();
          const faithIds = Object.keys(FBDATA.religions).sort().filter(
            function (faithId) {
              return !FB.faithAssignable ||
                FB.faithAssignable(faithId, state);
            });
          const pids = Object.keys(state.population.counties).sort();
          let projects = 0;
          for (let pi = 0; pi < pids.length; pi++) {
            const pid = pids[pi];
            const rec = state.population.counties[pid];
            const originalCulture = rec.identity.culture;
            const originalFaith = rec.identity.religion;
            rec.communities = [{
              culture:originalCulture,
              religion:originalFaith,
              count:rec.count
            }];
            FB.reconcileCountyCommunities(state, pid);
            const cultureTargets = cultureIds.filter(function (cultureId) {
              return cultureId !== originalCulture;
            }).slice(0, 2);
            for (let ci = 0; ci < cultureTargets.length; ci++) {
              FB.convertCountyCommunity(state, pid, {
                kind:'culture', target:cultureTargets[ci],
                amount:Math.max(1, Math.floor(rec.count * 0.03)),
                cause:'e2e mature community spread'
              });
            }
            const faithTarget = faithIds.filter(function (faithId) {
              return faithId !== originalFaith;
            })[0];
            if (faithTarget) {
              FB.convertCountyCommunity(state, pid, {
                kind:'faith', target:faithTarget,
                amount:Math.max(1, Math.floor(rec.count * 0.09)),
                cause:'e2e mature community spread'
              });
            }
            if (pi % 4 === 0) FB.materializeSettlementCommunities(state, pid);
            if (projects < 4) {
              let target = null;
              for (let ci = 0; ci < rec.communities.length; ci++) {
                if (rec.communities[ci].culture !== rec.identity.culture) {
                  target = rec.communities[ci].culture;
                  break;
                }
              }
              if (target && FB.startCountyCommunityProject(state, pid, {
                kind:'culture', target:target, policy:'voluntary',
                sponsor:'e2e_ai_' + projects
              })) projects++;
            }
          }
          const mature = FB.populationSaveDiagnostics(state);
          return {
            total:schema2,
            added:schema2 - schema1,
            matureAdded:mature.bytes - schema1,
            mature:mature
          };
        }
        await activate('867');
        const bookmark867 = measure();
        await activate('1066');
        const bookmark1066 = measure();
        return { bookmark867:bookmark867, bookmark1066:bookmark1066 };
      });

      for (const measurement of [result.bookmark867, result.bookmark1066]) {
        expect(measurement.added).toBeGreaterThan(0);
        expect(measurement.added).toBeLessThan(200000);
        expect(measurement.matureAdded).toBeLessThan(900000);
        expect(measurement.total).toBeLessThan(1.6 * 1024 * 1024);
        expect(measurement.mature.bytes).toBeLessThan(2.5 * 1024 * 1024);
        expect(measurement.mature.communityRecords).toBeLessThanOrEqual(
          measurement.mature.counties * 6);
        expect(measurement.mature.maxCountyCommunities).toBeLessThanOrEqual(6);
        expect(measurement.mature.materializedCounties).toBeGreaterThan(80);
        expect(measurement.mature.settlementCells).toBeGreaterThan(0);
        expect(measurement.mature.projectCount).toBe(4);
      }
    });
});
