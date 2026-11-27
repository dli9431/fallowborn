'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/model.js',
  'js/economy.js',
  'js/items.js',
  'js/world.js',
  'js/treasury.js',
  'js/papacy.js',
  'js/events.js'
]);

const { test, expect } = require('../support/fixture');
const { openTitle } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { injectBrowserHarness } = require('../support/game/browser-harness');

test('a bounded simulation preserves game-state invariants',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The initial invariant smoke test runs against the primary file target.');

    await openTitle(page, testInfo);
    await startDeterministicGame(page);
    await injectBrowserHarness(page);
    const result = await page.evaluate(function () {
      return FBTEST.advanceDays({
        days: 120,
        maxDays: 120,
        maxEvents: 80,
        maxInterruptions: 0,
        checkEvery: 15,
        style: 'first'
      });
    });

    expect(result).toMatchObject({
      startTurn: 0,
      endTurn: 120,
      advanced: 120,
      interruptions: 0
    });
    expect(result.events).toBeLessThanOrEqual(80);
    expect(await page.evaluate(function () {
      return FBTEST.checkInvariants();
    })).toEqual([]);
  });

test('year-boundary work does not grow with the character record count',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The year-boundary cost check runs against the primary file target.');
    test.slow();

    await openTitle(page, testInfo);
    await startDeterministicGame(page);
    await injectBrowserHarness(page);

    /* The defect this guards against is O(records x realms): every record
       that is not a reigning ruler paying a full realm scan in the yearly
       mortality pass. Rather than time it, which is flaky in CI, assert the
       shape directly - a tenfold record count must not multiply the number of
       realm lookups the reigning-ruler question costs. */
    expect(await page.evaluate(function () {
      const s = FB.state;
      function probe() {
        let realmReads = 0;
        const realms = s.realms;
        const proxy = new Proxy(realms, {
          get:function (target, key) {
            if (typeof key === 'string') realmReads++;
            return target[key];
          },
          ownKeys:function (target) { return Reflect.ownKeys(target); }
        });
        s.realms = proxy;
        try {
          for (const id in s.chars) {
            const c = s.chars[id];
            if (c.dead) continue;
            FB.isReigningRealmRuler(s, c);
          }
        } finally {
          s.realms = realms;
        }
        return realmReads;
      }

      const baselineRecords = Object.keys(s.chars).length;
      const baselineReads = probe();

      /* Add a thousand ordinary records - the shape a long campaign reaches. */
      const me = s.chars[s.player.charId];
      for (let i = 0; i < 1000; i++) {
        FB.makeCharacter(s, {
          culture:me.culture, religion:me.religion,
          born:s.date.year - 30, traitsN:0
        });
      }
      const grownReads = probe();
      return {
        baselineRecords:baselineRecords,
        grownRecords:Object.keys(s.chars).length,
        /* Each added record may cost a small constant number of realm reads,
           never one per realm. The realm count is in the hundreds, so a
           per-record scan would blow through this bound immediately. */
        perAddedRecord:(grownReads - baselineReads) / 1000,
        realms:Object.keys(s.realms).length
      };
    }).then(function (result) {
      return {
        grew:result.grownRecords > result.baselineRecords,
        boundedPerRecord:result.perAddedRecord < 8,
        manyRealms:result.realms > 100
      };
    })).toEqual({ grew:true, boundedPerRecord:true, manyRealms:true });
  });

test('spring realm AI reuses political status and bounds succession repairs',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The Spring rollover shape check runs against the primary file target.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.war = null;
      for (const rid in s.realms) {
        if (s.realms[rid]) s.realms[rid].war = null;
      }
      const names = [
        'isRealmAtWar',
        'allianceOf',
        'refreshRealmSuccession',
        'fortAIYear',
        'populationYear',
        'papacyYearly',
        'greatHolyWarYearly',
        'greatHolyWarCamp',
        'rulerAgencyYearly',
        'aiBuildingsYear',
        'ensurePapacy'
      ];
      const original = {};
      const calls = { war:0, alliance:0, succession:0, papacyRepair:0 };
      for (let i = 0; i < names.length; i++) original[names[i]] = FB[names[i]];
      const originalChance = FB.chance;
      FB.isRealmAtWar = function () {
        calls.war++;
        return original.isRealmAtWar.apply(this, arguments);
      };
      FB.allianceOf = function () {
        calls.alliance++;
        return original.allianceOf.apply(this, arguments);
      };
      FB.refreshRealmSuccession = function () {
        calls.succession++;
        return original.refreshRealmSuccession.apply(this, arguments);
      };
      FB.ensurePapacy = function () {
        calls.papacyRepair++;
        return original.ensurePapacy.apply(this, arguments);
      };
      /* Keep the probe on the realm-AI core. These independently covered
         annual systems can ask political questions of their own. */
      FB.fortAIYear = function () {};
      FB.populationYear = function () {};
      FB.papacyYearly = function () {};
      FB.greatHolyWarYearly = function () {};
      FB.greatHolyWarCamp = function () { return null; };
      FB.rulerAgencyYearly = function () {};
      FB.aiBuildingsYear = function () {};
      FB.chance = function () { return false; };
      try {
        /* Converge any legitimate one-time defensive repair before measuring
           steady-state Spring work. Both phases must remain limited to an
           exceptional handful rather than refreshing the whole realm table. */
        FB.ensureDynasticState(s, { yearly:true });
        const preparationSuccessionRefreshes = calls.succession;
        calls.succession = 0;
        calls.war = 0;
        calls.alliance = 0;
        calls.papacyRepair = 0;
        s.date.year++;
        s.turn += 360;
        FB.worldTick(s);
        calls.preparationSuccessionRefreshes =
          preparationSuccessionRefreshes;
      } finally {
        FB.chance = originalChance;
        for (let i = 0; i < names.length; i++) FB[names[i]] = original[names[i]];
      }
      let living = 0;
      for (const rid in s.realms) {
        if (rid !== 'player' && s.realms[rid] && s.realms[rid].alive) living++;
      }
      return {
        warScans:calls.war,
        allianceScans:calls.alliance,
        successionRefreshes:calls.succession,
        preparationSuccessionRefreshes:
          calls.preparationSuccessionRefreshes,
        papacyRepairs:calls.papacyRepair,
        livingRealms:living
      };
    });
    const successionRepairLimit = Math.max(2,
      Math.floor(result.livingRealms * 0.01));
    expect(result.warScans).toBe(0);
    expect(result.allianceScans).toBe(0);
    expect(result.papacyRepairs).toBe(0);
    expect(result.livingRealms).toBeGreaterThan(100);
    expect(result.preparationSuccessionRefreshes)
      .toBeLessThanOrEqual(successionRepairLimit);
    expect(result.successionRefreshes)
      .toBeLessThanOrEqual(successionRepairLimit);
  });

test('AI expansion finishes a partial de jure duchy before opening a weaker frontier',
  async function ({ page }, testInfo) {
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      let consolidation = null;
      let frontier = null;
      for (const pr of FB.world.provs) {
        if (pr.wasteland || !pr.duchy) continue;
        const adj = FB.world.adj[pr.id] || {};
        for (const nb in adj) {
          const other = FB.world.byId[nb];
          if (!other || other.wasteland || !other.duchy) continue;
          if (!consolidation && other.duchy === pr.duchy &&
              FB.duchyCounties(pr.duchy).length >= 3) {
            consolidation = { held:pr.id, target:other.id, duchy:pr.duchy };
          }
        }
        if (consolidation) break;
      }
      for (const pr of FB.world.provs) {
        if (!consolidation || pr.wasteland || !pr.duchy ||
            pr.duchy === consolidation.duchy ||
            pr.id === consolidation.held || pr.id === consolidation.target) {
          continue;
        }
        const adj = FB.world.adj[pr.id] || {};
        for (const nb in adj) {
          const other = FB.world.byId[nb];
          if (!other || other.wasteland || !other.duchy ||
              other.duchy === pr.duchy ||
              other.duchy === consolidation.duchy ||
              other.id === consolidation.held ||
              other.id === consolidation.target) continue;
          frontier = { held:pr.id, target:other.id };
          break;
        }
        if (frontier) break;
      }
      if (!consolidation || !frontier) return { found:false };

      const attacker = 'e2e_compact_expander';
      const consolidatingDefender = 'e2e_duchy_defender';
      const weakFrontier = 'e2e_weak_frontier';
      s.realms[attacker] = {
        id:attacker, name:'Compact Expander', alive:true, liege:null,
        rank:2, capital:consolidation.held, ruler:{ mar:8 }
      };
      s.realms[consolidatingDefender] = {
        id:consolidatingDefender, name:'Duchy Defender', alive:true,
        liege:null, rank:1, capital:consolidation.target, ruler:{ mar:8 }
      };
      s.realms[weakFrontier] = {
        id:weakFrontier, name:'Weak Frontier', alive:true, liege:null,
        rank:1, capital:frontier.target, ruler:{ mar:2 }
      };
      s.owner[consolidation.held] = attacker;
      s.owner[consolidation.target] = consolidatingDefender;
      s.owner[frontier.held] = attacker;
      s.owner[frontier.target] = weakFrontier;
      s.holder[consolidation.held] = attacker;
      s.holder[consolidation.target] = consolidatingDefender;
      s.holder[frontier.held] = attacker;
      s.holder[frontier.target] = weakFrontier;
      FB.invalidateRealmCache();

      const duchyPriority = FB.aiExpansionPriority(
        s, attacker, consolidation.target);
      const frontierPriority = FB.aiExpansionPriority(
        s, attacker, frontier.target);
      const choice = FB.aiExpansionTarget(s, attacker,
        [weakFrontier, consolidatingDefender], function (rid) {
          return rid === consolidatingDefender ? 10000 : 1;
        });
      return {
        found:true,
        duchyBand:duchyPriority.band,
        duchyKind:duchyPriority.titleKind,
        duchyId:duchyPriority.titleId,
        frontierBand:frontierPriority.band,
        targetRealm:choice && choice.realmId,
        targetProvince:choice && choice.pid,
        expectedRealm:consolidatingDefender,
        expectedProvince:consolidation.target,
        expectedDuchy:consolidation.duchy
      };
    });

    expect(result.found).toBe(true);
    expect(result.duchyBand).toBe(0);
    expect(result.duchyKind).toBe('duchy');
    expect(result.duchyId).toBe(result.expectedDuchy);
    expect(result.targetRealm).toBe(result.expectedRealm);
    expect(result.targetProvince).toBe(result.expectedProvince);
    expect(result.expectedRealm).toBe('e2e_duchy_defender');
    expect(result.frontierBand).toBeGreaterThan(result.duchyBand);
  });

test('AI expansion steps outward from kingdom to empire before a fresh realm',
  async function ({ page }, testInfo) {
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      let core = null;
      let kingdomTarget = null;
      let empireTarget = null;
      let foreignTarget = null;
      for (const pr of FB.world.provs) {
        if (pr.wasteland || !pr.duchy) continue;
        const dj = FB.dejureOf(pr.id);
        if (!dj.kingdom || !dj.empire) continue;
        const sameKingdom = FB.kingdomCounties(dj.kingdom).filter(function (pid) {
          return FB.dejureOf(pid).duchy !== dj.duchy;
        })[0];
        let sameEmpire = null;
        let otherEmpire = null;
        for (const candidate of FB.world.provs) {
          if (candidate.wasteland || !candidate.duchy) continue;
          const candidateDj = FB.dejureOf(candidate.id);
          if (!sameEmpire && candidateDj.empire === dj.empire &&
              candidateDj.kingdom !== dj.kingdom) sameEmpire = candidate.id;
          if (!otherEmpire && candidateDj.empire &&
              candidateDj.empire !== dj.empire) otherEmpire = candidate.id;
          if (sameEmpire && otherEmpire) break;
        }
        if (sameKingdom && sameEmpire && otherEmpire) {
          core = pr.id;
          kingdomTarget = sameKingdom;
          empireTarget = sameEmpire;
          foreignTarget = otherEmpire;
          break;
        }
      }
      if (!core) return { found:false };
      const attacker = 'e2e_title_hierarchy_expander';
      s.realms[attacker] = {
        id:attacker, name:'Title Hierarchy Expander', alive:true,
        liege:null, rank:2, capital:core, ruler:{ mar:8 }
      };
      s.owner[core] = attacker;
      s.holder[core] = attacker;
      FB.invalidateRealmCache();
      return {
        found:true,
        kingdomBand:FB.aiExpansionPriority(
          s, attacker, kingdomTarget).band,
        empireBand:FB.aiExpansionPriority(
          s, attacker, empireTarget).band,
        freshBand:FB.aiExpansionPriority(
          s, attacker, foreignTarget).band
      };
    });

    expect(result).toEqual({
      found:true,
      kingdomBand:1,
      empireBand:2,
      freshBand:3
    });
  });

test('annual AI construction snapshots holdings before development invalidation',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The AI construction cache-shape check runs against the primary file target.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      const owner = s.owner;
      const buildings = s.buildings;
      const definitions = FBDATA.buildings;
      const originalSettlements = FB.settlementsOf;
      const originalBuiltIn = FB.builtIn;
      const originalDevelopment = FB.changeCountyDevelopment;
      let ownerTablePasses = 0;
      let developmentChanges = 0;
      s.turn++;
      for (const pid in s.dev) s.dev[pid] = 1;
      s.buildings = {};
      FB.treasuryInitialize(s);
      for (const rid in s.realms) {
        const treasury = s.realms[rid] && s.realms[rid].treasury;
        if (treasury && treasury.version === 1) treasury.gold = 1000000;
      }
      FBDATA.buildings = { mill:{ dev:1, aiBuildOrder:1 } };
      FB.settlementsOf = function () {
        return [{ site:'test', name:'Test', kind:'village' }];
      };
      FB.builtIn = function () { return []; };
      FB.changeCountyDevelopment = function () {
        developmentChanges++;
        return originalDevelopment.apply(this, arguments);
      };
      s.owner = new Proxy(owner, {
        get:function (target, key) { return target[key]; },
        ownKeys:function (target) {
          ownerTablePasses++;
          return Reflect.ownKeys(target);
        }
      });
      FB.invalidateRealmCache();
      try {
        FB.aiBuildingsYear(s);
      } finally {
        s.owner = owner;
        s.buildings = buildings;
        FBDATA.buildings = definitions;
        FB.settlementsOf = originalSettlements;
        FB.builtIn = originalBuiltIn;
        FB.changeCountyDevelopment = originalDevelopment;
        FB.invalidateRealmCache();
        if (FB.invalidateBuildingIndex) FB.invalidateBuildingIndex();
      }
      return {
        ownerTablePasses:ownerTablePasses,
        developmentChanges:developmentChanges
      };
    }).then(function (result) {
      return {
        oneHoldingsBuild:result.ownerTablePasses <= 2,
        manyBuilders:result.developmentChanges > 20
      };
    })).toEqual({ oneHoldingsBuild:true, manyBuilders:true });
  });

test('succession refresh is linear in accumulated royal history',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The succession cost-shape check runs against the primary file target.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      for (const candidate in s.realms) {
        const realm = s.realms[candidate];
        if (candidate !== 'player' && realm && realm.alive &&
            !(FB.papacyTerritorialRealm &&
              FB.papacyTerritorialRealm(s, candidate))) {
          rid = candidate;
          break;
        }
      }
      if (!rid) return { skipped:true };

      const realm = s.realms[rid];
      const original = realm.succession;
      const raw = {};
      const count = 600;
      raw.root = {
        id:'root', name:'Root', sex:'m', born:700, alive:true,
        parentId:null, childIds:['dead_0'], charId:null, role:null
      };
      for (let i = 0; i < count; i++) {
        const id = 'dead_' + i;
        const childId = i + 1 < count ? 'dead_' + (i + 1) : 'living';
        raw[id] = {
          id:id, name:'Ancestor ' + i, sex:'m', born:701 + i,
          alive:false, parentId:i ? 'dead_' + (i - 1) : 'root',
          childIds:[childId], charId:null, role:null
        };
      }
      raw.living = {
        id:'living', name:'Living heir', sex:'f', born:701 + count,
        alive:true, parentId:'dead_' + (count - 1), childIds:[],
        charId:null, role:null
      };
      let memberReads = 0;
      const members = new Proxy(raw, {
        get:function (target, key) {
          if (typeof key === 'string') memberReads++;
          return target[key];
        }
      });
      try {
        realm.succession = {
          rulerGeneration:1,
          rulerMemberId:'root',
          members:members,
          order:['dead_0'],
          heirId:'dead_0'
        };
        const refreshed = FB.refreshRealmSuccession(s, rid);
        return {
          skipped:false,
          memberReads:memberReads,
          records:Object.keys(raw).length,
          order:refreshed.order.slice(),
          heirId:refreshed.heirId
        };
      } finally {
        realm.succession = original;
      }
    }).then(function (result) {
      if (result.skipped) return result;
      return {
        skipped:false,
        linearReads:result.memberReads < result.records * 8,
        oneLivingHeir:result.order.length === 1 &&
          result.order[0] === 'living' && result.heirId === 'living'
      };
    })).toEqual({
      skipped:false,
      linearReads:true,
      oneLivingHeir:true
    });
  });

test('stable Spring court rolls ignore accumulated dead generations',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The court-frontier cost-shape check runs against the primary file target.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      for (const candidate in s.realms) {
        const realm = s.realms[candidate];
        if (candidate !== 'player' && realm && realm.alive &&
            realm.succession && !realm.succession.papalElective) {
          rid = candidate;
          break;
        }
      }
      if (!rid) return { skipped:true };

      const realm = s.realms[rid];
      const succession = realm.succession;
      const originalMembers = succession.members;
      const members = {};
      for (const memberId in originalMembers) {
        members[memberId] = originalMembers[memberId];
      }
      for (let i = 0; i < 900; i++) {
        members['old_generation_' + i] = {
          id:'old_generation_' + i,
          name:'Dead ancestor ' + i,
          sex:'m', born:500 + i, alive:false,
          parentId:null, childIds:[], charId:null, role:null
        };
      }
      let deadReads = 0;
      const proxy = new Proxy(members, {
        get:function (target, key) {
          if (typeof key === 'string' && key.indexOf('old_generation_') === 0) {
            deadReads++;
          }
          return target[key];
        }
      });
      succession.members = proxy;
      /* Mutation/load repair pays for history once and establishes the
         derived living frontier used by ordinary annual rolls. */
      FB.refreshRealmSuccession(s, rid);
      deadReads = 0;

      const names = [
        'fortAIYear', 'populationYear', 'papacyYearly',
        'greatHolyWarYearly', 'greatHolyWarCamp',
        'rulerAgencyYearly', 'aiBuildingsYear'
      ];
      const original = {};
      for (let i = 0; i < names.length; i++) original[names[i]] = FB[names[i]];
      const originalChance = FB.chance;
      FB.fortAIYear = function () {};
      FB.populationYear = function () {};
      FB.papacyYearly = function () {};
      FB.greatHolyWarYearly = function () {};
      FB.greatHolyWarCamp = function () { return null; };
      FB.rulerAgencyYearly = function () {};
      FB.aiBuildingsYear = function () {};
      FB.chance = function () { return false; };
      try {
        s.date.year++;
        s.turn += 360;
        FB.worldTick(s);
      } finally {
        FB.chance = originalChance;
        for (let i = 0; i < names.length; i++) FB[names[i]] = original[names[i]];
        succession.members = originalMembers;
      }
      return { skipped:false, deadReads:deadReads };
    })).toEqual({ skipped:false, deadReads:0 });
  });

test('Spring mortality classifies unrelated courtiers only once',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The annual court handoff check runs against the primary file target.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      const links = FB.familyLinksSnapshot(s);
      let candidate = null;
      for (const id in s.chars) {
        const c = s.chars[id];
        if (!c || c.dead || !FB.isCourtCharacter(s, c) ||
            FB.isReigningRealmRuler(s, c) ||
            FB.courtRecordRetained(s, c, links.kinById, links)) continue;
        candidate = c;
        break;
      }
      if (!candidate) return { found:false, retentionChecks:0 };

      const originalRetention = FB.courtRecordRetained;
      const originalChance = FB.chance;
      const originalPapacyYearly = FB.papacyYearly;
      let retentionChecks = 0;
      FB.courtRecordRetained = function (state, c) {
        if (c && c.id === candidate.id) retentionChecks++;
        return originalRetention.apply(this, arguments);
      };
      FB.chance = function () { return false; };
      FB.papacyYearly = function () {};
      s.date.season = 3;
      s.date.day = 90;
      try {
        FB.game.passDay({ deferUi:true });
      } finally {
        FB.courtRecordRetained = originalRetention;
        FB.chance = originalChance;
        FB.papacyYearly = originalPapacyYearly;
      }
      return { found:true, retentionChecks:retentionChecks };
    })).toEqual({ found:true, retentionChecks:1 });
  });

test('annual household checks reuse reverse spouse links',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The household cost-shape check runs against the primary file target.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const child = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 20, traits:[], traitsN:0,
        dyn:me.dyn, fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null
      });
      me.childrenIds.push(child.id);
      const spouse = FB.makeCharacter(s, {
        sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 22, traits:[], traitsN:0
      });
      /* Exercise the reverse-only link used by polygynous and repaired
         records: the child does not point back at this spouse. */
      spouse.spouseId = child.id;
      FB.touchFamily();
      const links = FB.familyLinksSnapshot(s);
      const chars = s.chars;
      let wholeTableWalks = 0;
      s.chars = new Proxy(chars, {
        get:function (target, key) { return target[key]; },
        ownKeys:function (target) {
          wholeTableWalks++;
          return Reflect.ownKeys(target);
        }
      });
      try {
        const married = FB.isHouseholdCharacter(s, child.id, links);
        spouse.dead = true;
        const widowed = FB.isHouseholdCharacter(s, child.id, links);
        const household = FB.householdMembers(s);
        const workers = FB.householdWorkers(s);
        return {
          married:married,
          widowed:widowed,
          widowedAtHome:household.some(function (c) {
            return c.id === child.id;
          }),
          widowedWorker:workers.some(function (c) {
            return c.id === child.id;
          }),
          wholeTableWalks:wholeTableWalks
        };
      } finally {
        s.chars = chars;
      }
    })).toEqual({
      married:false,
      widowed:true,
      widowedAtHome:true,
      widowedWorker:true,
      wholeTableWalks:0
    });
  });

test('a death-heavy realm rollover reuses one family snapshot',
  async function ({ page }, testInfo) {
    test.skip(['chromium-file', 'chromium-served'].indexOf(testInfo.project.name) < 0,
      'The rollover shape check runs against both Chromium origins.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const originalSnapshot = FB.familyLinksSnapshot;
      const originalKin = FB.kinOf;
      const originalChance = FB.chance;
      const originalMortality = FBDATA.balance.mortalityBase;
      let snapshots = 0;
      let kinReads = 0;
      const kinCallers = {};
      let deaths = 0;
      for (const rid in s.realms) {
        const succession = s.realms[rid] && s.realms[rid].succession;
        if (!succession) continue;
        for (const memberId in succession.members) {
          const member = succession.members[memberId];
          if (member && memberId !== succession.rulerMemberId) {
            member.born = s.date.year - 90;
          }
        }
      }
      FB.familyLinksSnapshot = function (state) {
        snapshots++;
        return originalSnapshot(state);
      };
      FB.kinOf = function (state) {
        kinReads++;
        const caller = (new Error().stack || '').split('\n')[2] || 'unknown caller';
        kinCallers[caller] = (kinCallers[caller] || 0) + 1;
        return originalKin(state);
      };
      FBDATA.balance.mortalityBase = 0.024;
      FB.chance = function (q) {
        /* A 90-year-old court member has .25 base mortality, doubled by the
           balance knob. Keep realm rulers and unrelated yearly rolls alive. */
        if (Math.abs(q - 0.5) < 0.0000001) {
          deaths++;
          return true;
        }
        return false;
      };
      const started = performance.now();
      let elapsedMs;
      try {
        s.date.year++;
        s.turn += 360;
        FB.worldTick(s);
        elapsedMs = performance.now() - started;
      } finally {
        FB.familyLinksSnapshot = originalSnapshot;
        FB.kinOf = originalKin;
        FB.chance = originalChance;
        FBDATA.balance.mortalityBase = originalMortality;
      }
      return {
        manyDeaths:deaths > 20,
        snapshots:snapshots,
        kinReads:kinReads,
        kinCallers:kinCallers,
        deaths:deaths,
        elapsedMs:elapsedMs,
        rng:FB.getRngState(),
        uid:FB.getUidCounter(),
        state:JSON.stringify(s)
      };
    });
    const digest = require('crypto').createHash('sha256').update(result.state).digest('hex');
    console.log('Death-heavy rollover: ' + JSON.stringify({ deaths:result.deaths,
      snapshots:result.snapshots, kinReads:result.kinReads, kinCallers:result.kinCallers,
      elapsedMs:result.elapsedMs, rng:result.rng, uid:result.uid, stateDigest:digest }));
    await testInfo.attach('rollover-state', { body:result.state, contentType:'application/json' });
    expect({manyDeaths:result.manyDeaths,snapshots:result.snapshots,kinReads:result.kinReads},
      JSON.stringify(result.kinCallers)).toEqual({ manyDeaths:true, snapshots:1, kinReads:1 });
  });

test('death-heavy court repairs preserve the live-kin reference state, deaths, RNG and identities',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Source interception for the live-read reference requires the served origin.');
    const outcomes = [];
    for (const liveKin of [true, false]) {
      if (liveKin) {
        await page.route('**/js/world.js', async function (route) {
          const response = await route.fetch();
          const source = await response.text();
          const lookup = /const familyLinks = royalMortalityContext && royalMortalityContext\.state === state &&\s+royalMortalityContext\.familyLinks;/g;
          expect(source.match(lookup)).toHaveLength(1);
          await route.fulfill({ response:response, body:source.replace(lookup, 'const familyLinks = null;') });
        });
      } else await page.unroute('**/js/world.js');
      await openTitle(page, testInfo);
      await startDeterministicGame(page);
      outcomes.push(await page.evaluate(function () {
        const s = FB.state, chance = FB.chance, mortality = FBDATA.balance.mortalityBase;
        let deaths = 0;
        for (const rid in s.realms) {
          const succession = s.realms[rid] && s.realms[rid].succession;
          if (!succession) continue;
          for (const id in succession.members) {
            const member = succession.members[id];
            if (member && id !== succession.rulerMemberId) member.born = s.date.year - 90;
          }
        }
        FBDATA.balance.mortalityBase = 0.024;
        FB.chance = function (q) {
          if (Math.abs(q - 0.5) < 0.0000001) { deaths++; return true; }
          return false;
        };
        try {
          s.date.year++;
          s.turn += 360;
          FB.worldTick(s);
        } finally {
          FB.chance = chance;
          FBDATA.balance.mortalityBase = mortality;
        }
        return { state:JSON.stringify(s), deaths:deaths, rng:FB.getRngState(), uid:FB.getUidCounter() };
      }));
    }
    expect(outcomes[0].deaths).toBeGreaterThan(20);
    expect(outcomes[1]).toEqual(outcomes[0]);
  });

test('an interrupted court mortality pass releases its snapshot before ordinary succession repair',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The court mortality exception boundary runs against the served origin.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, chance = FB.chance, died = FB.courtMemberDied;
      const mortality = FBDATA.balance.mortalityBase, fault = new Error('Court mortality interrupted');
      for (const rid in s.realms) {
        const line = s.realms[rid] && s.realms[rid].succession;
        if (!line) continue;
        for (const id in line.members) {
          if (id !== line.rulerMemberId) line.members[id].born = s.date.year - 90;
        }
      }
      let propagated = false;
      FBDATA.balance.mortalityBase = 0.024;
      FB.chance = function (q) { return Math.abs(q - 0.5) < 0.0000001; };
      FB.courtMemberDied = function () { throw fault; };
      try { s.date.year++; s.turn += 360; FB.worldTick(s); }
      catch (error) { if (error !== fault) throw error; propagated = true; }
      finally { FB.chance = chance; FB.courtMemberDied = died; FBDATA.balance.mortalityBase = mortality; }
      const rid = Object.keys(s.realms).find(function (id) {
        const r = s.realms[id], line = r.succession;
        const root = line && line.members && line.members[line.rulerMemberId];
        const policy = FB.governments.successionForRealm(s, id);
        return id !== 'player' && r.alive && root && root.charId && !line.authoredCourt &&
          !s.chars[root.charId].dead && !policy.selectionManaged && policy.repairEmpty !== false &&
          !(FB.mobile && FB.mobile.settledPrincipal(s, id));
      });
      if (!rid) throw new Error('A living ordinary court is required');
      const line = s.realms[rid].succession;
      // Stage an exhausted frontier without changing the living ruler.
      for (const id in line.members) {
        if (id === line.rulerMemberId) continue;
        const member = line.members[id];
        member.alive = false;
        if (member.charId) s.chars[member.charId].dead = true;
      }
      line.order = []; line.heirId = null;
      const kin = FB.kinOf;
      let liveReads = 0;
      FB.kinOf = function (state) { liveReads++; return kin(state); };
      try { FB.refreshRealmSuccession(s, rid); }
      finally { FB.kinOf = kin; }
      return { propagated:propagated, liveRead:liveReads > 0, repaired:!!line.heirId };
    });
    expect(result).toEqual({ propagated:true, liveRead:true, repaired:true });
  });

test('home pestilence mortality does not follow extended kin to another county',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The yearly family-mortality check runs against the primary file target.');
    await openTitle(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = s.player.provinceId;
      const away = FB.world.provs.find(function (province) {
        return !province.wasteland && province.id !== home;
      }).id;
      const sibling = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 40, traits:[], traitsN:0, dyn:me.dyn,
        fatherId:me.fatherId, motherId:me.motherId
      });
      const localNiece = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 30, traits:[], traitsN:0, dyn:me.dyn,
        motherId:sibling.id
      });
      const remoteNiece = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 30, traits:[], traitsN:0, dyn:me.dyn,
        motherId:sibling.id
      });
      localNiece.homeProvinceId = home;
      remoteNiece.homeProvinceId = away;
      sibling.childrenIds.push(localNiece.id, remoteNiece.id);
      FB.touchFamily();

      const originalChance = FB.chance;
      s.player.flags.plague_here = 1;
      s.date.season = 3;
      s.date.day = 90;
      FB.chance = function (chance) {
        /* Age 30 has 0.8% base mortality. Only a resident receives the
           pestilence's additional five percentage points. */
        return Math.abs(chance - 0.058) < 0.0000001;
      };
      try {
        FB.game.passDay();
      } finally {
        FB.chance = originalChance;
      }
      return {
        localDead:localNiece.dead,
        remoteDead:remoteNiece.dead,
        localAtHome:FB.characterResidence(s, localNiece) === home,
        remoteAtAway:FB.characterResidence(s, remoteNiece) === away,
        localRelation:FB.kinOf(s).byId[localNiece.id],
        remoteRelation:FB.kinOf(s).byId[remoteNiece.id]
      };
    })).toEqual({
      localDead:true,
      remoteDead:false,
      localAtHome:true,
      remoteAtAway:true,
      localRelation:'Niece',
      remoteRelation:'Niece'
    });
  });
