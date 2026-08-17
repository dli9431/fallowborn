'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/mapview.js',
  'js/settlement.js',
  'js/siteart.js',
  'js/world.js',
  'css/style.css',
  'data/settlements.js'
]);

/* Settlement sites and the detailed map: data/validation contract, determinism,
   save/property compatibility, condition-driven development and settlement
   anchors, the universal settlement sheet, and marker rendering/tap
   precedence. Authored per docs/plans/historical-settlements-
   detailed-map.md; NOT run by the authoring agent (owner runs the harness). */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

/* ---------- data and validation ---------- */

test('both core bookmarks validate with independent settlement site lists',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      const b867 = FB.bookmark('867'), b1066 = FB.bookmark('1066');
      const roma867 = b867.provinces.find(function (p) { return p.id === 'roma'; });
      const roma1066 = b1066.provinces.find(function (p) { return p.id === 'roma'; });
      let aliased = roma867.settlements === roma1066.settlements;
      for (let i = 0; i < roma867.settlements.length; i++) {
        if (roma1066.settlements[i] === roma867.settlements[i]) aliased = true;
      }
      const table = FBDATA.settlementSites;
      return {
        errors867:FB.validateBookmark(b867),
        errors1066:FB.validateBookmark(b1066),
        aliased:aliased,
        tableIsObject:!!table && typeof table === 'object' && !Array.isArray(table),
        romaSite:table.roma,
        authoredCounties:['867', '1066'].map(function (bm) {
          return FB.bookmark(bm).provinces.filter(function (p) {
            return p.settlements;
          }).length;
        })
      };
    });

    expect(result.errors867).toEqual([]);
    expect(result.errors1066).toEqual([]);
    expect(result.aliased).toBe(false);
    expect(result.tableIsObject).toBe(true);
    expect(result.romaSite).toEqual({ x:12.4964, y:41.9028 });
    expect(result.authoredCounties[0]).toBeGreaterThan(100);
    expect(result.authoredCounties[1]).toBeGreaterThan(100);
  });

test('settlement data faults each produce an actionable validation error',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function defWith(patches) {
        const source = FB.bookmark('867');
        const definition = {};
        for (const key in source) definition[key] = source[key];
        definition.provinces = source.provinces.map(function (p) {
          if (!patches[p.id]) return p;
          const q = {};
          for (const k in p) q[k] = p[k];
          q.settlements = patches[p.id];
          return q;
        });
        return definition;
      }
      const wastelandId = FBDATA.provinces.find(function (p) {
        return p.wasteland;
      }).id;
      const cases = {
        missingSite:defWith({ london:[
          { site:'no_such_place', name:'Nowhere', kind:'town' }
        ] }),
        badKind:defWith({ london:[{ site:'london', name:'London', kind:'metropolis' }] }),
        dupSite:defWith({ london:[
          { site:'london', name:'London', kind:'town' },
          { site:'london', name:'Lundenwic', kind:'village' }
        ] }),
        dupName:defWith({ london:[
          { site:'london', name:'Same', kind:'town' },
          { site:'roma', name:'Same', kind:'village' }
        ] }),
        twoCounties:defWith({
          london:[{ site:'london', name:'London', kind:'town' }],
          winchester:[{ site:'london', name:'London too', kind:'village' }]
        }),
        wasteland:defWith({ [wastelandId]:[{ site:'london', name:'Camp', kind:'village' }] }),
        tooMany:defWith({ london:[
          { site:'london', name:'A', kind:'town' },
          { site:'roma', name:'B', kind:'town' },
          { site:'ostia', name:'C', kind:'village' },
          { site:'paris', name:'D', kind:'village' },
          { site:'aachen', name:'E', kind:'village' },
          { site:'winchester', name:'F', kind:'village' },
          { site:'york', name:'G', kind:'village' },
          { site:'norwich', name:'H', kind:'village' },
          { site:'oxford', name:'I', kind:'village' }
        ] }),
        notAList:defWith({ london:{ site:'london' } })
      };
      const out = {};
      for (const key in cases) out[key] = FB.validateBookmark(cases[key]).join('\n');

      /* physical-table faults mutate the shared table, then restore it */
      const saved = FBDATA.settlementSites;
      out.badCoords = '';
      out.badSlug = '';
      out.notObject = '';
      try {
        FBDATA.settlementSites = Object.assign({}, saved, {
          bad_coords:{ x:190, y:0 },
          'BAD SLUG':{ x:0, y:0 }
        });
        out.badCoords = FB.validateBookmark(FB.bookmark('867')).join('\n');
        FBDATA.settlementSites = ['roma'];
        out.notObject = FB.validateBookmark(FB.bookmark('867')).join('\n');
      } finally {
        FBDATA.settlementSites = saved;
      }
      return out;
    });

    expect(result.missingSite).toContain('references missing site no_such_place');
    expect(result.badKind).toContain('has invalid kind metropolis');
    expect(result.dupSite).toContain('repeats site london');
    expect(result.dupName).toContain('repeats settlement name Same');
    expect(result.twoCounties).toContain('site london is assigned to both');
    expect(result.twoCounties).toContain('winchester');
    expect(result.wasteland).toContain('declares settlements');
    expect(result.tooMany).toContain('must be an array of 1–8 records');
    expect(result.notAList).toContain('must be an array of 1–8 records');
    expect(result.badCoords).toContain('bad_coords has invalid coordinates');
    expect(result.badCoords).toContain('invalid settlement site id BAD SLUG');
    expect(result.notObject).toContain('settlementSites must be an object keyed by site id');
  });

test('the settlement data script loads in order through the normal asset list',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      const scripts = Array.from(document.scripts).map(function (script) {
        return script.getAttribute('src') || '';
      });
      return {
        hasScript:scripts.indexOf('data/settlements.js') >= 0,
        afterBookmarks:scripts.indexOf('data/settlements.js') >
          scripts.indexOf('data/bookmarks.js'),
        beforeEngine:scripts.indexOf('data/settlements.js') <
          scripts.indexOf('js/world.js'),
        table:!!FBDATA.settlementSites && !!FBDATA.settlementSites.roma,
        siteCount:Object.keys(FBDATA.settlementSites).length
      };
    });

    expect(result.hasScript).toBe(true);
    expect(result.afterBookmarks).toBe(true);
    expect(result.beforeEngine).toBe(true);
    expect(result.table).toBe(true);
    expect(result.siteCount).toBeGreaterThan(130);
  });

/* ---------- determinism and bookmark switching ---------- */

test('authored and generated settlement data is deterministic and read-only',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const before = {
        rng:FB.getRngState(),
        serialized:JSON.stringify(s)
      };
      const roma867 = FB.settlementsOf(s, 'roma');
      const romaAgain = FB.settlementsOf(s, 'roma');
      /* a county the real-world fill only partly covers keeps deterministic
         generated slots behind its real presentations */
      let generatedPid = null, generatedRecs = null;
      for (const pr of FB.world.provs) {
        const info = FB.world.sitesByProv[pr.id];
        if (pr.wasteland || !info) continue;
        const gen = info.list.filter(function (rec) { return !rec.authored; });
        if (gen.length >= 2) {
          generatedPid = pr.id;
          generatedRecs = gen;
          break;
        }
      }
      const generated = generatedPid ? FB.settlementsOf(s, generatedPid) : [];
      const generatedAgain = generatedPid ? FB.settlementsOf(s, generatedPid) : [];
      /* generated slots spread across a county with room instead of
         stacking on its centroid */
      let minGap = Infinity;
      for (let i = 0; generatedRecs && i < generatedRecs.length; i++) {
        for (let j = i + 1; j < generatedRecs.length; j++) {
          const dx = generatedRecs[i].x - generatedRecs[j].x;
          const dy = generatedRecs[i].y - generatedRecs[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minGap) minGap = d;
        }
      }
      return {
        roma:roma867,
        romaStable:JSON.stringify(roma867) === JSON.stringify(romaAgain),
        generatedPid:generatedPid,
        generatedRecs:generatedRecs,
        generatedStable:JSON.stringify(generated) === JSON.stringify(generatedAgain),
        minGap:minGap,
        rngUnchanged:JSON.stringify(FB.getRngState()) === JSON.stringify(before.rng),
        stateUnchanged:JSON.stringify(s) === before.serialized,
        noSiteFieldsInState:before.serialized.indexOf('generated__') < 0 &&
          before.serialized.indexOf('"site":') < 0,
        development:FB.settlementDevelopment(s, 'roma')
      };
    });

    expect(result.roma[0]).toMatchObject({
      site:'roma', name:'Rome', kind:'town', authored:true
    });
    expect(typeof result.roma[0].x).toBe('number');
    expect(typeof result.roma[0].y).toBe('number');
    expect(result.romaStable).toBe(true);
    expect(result.generatedPid).toBeTruthy();
    expect(result.generatedRecs.length).toBeGreaterThanOrEqual(2);
    for (const rec of result.generatedRecs) {
      expect(rec).toMatchObject({ kind:'village', authored:false });
      expect(rec.site).toMatch(new RegExp('^generated__' + result.generatedPid + '__\\d+$'));
    }
    expect(result.generatedStable).toBe(true);
    /* generated slots spread across a county with room instead of stacking
       on its centroid */
    expect(result.minGap).toBeGreaterThanOrEqual(3);
    expect(result.rngUnchanged).toBe(true);
    expect(result.stateUnchanged).toBe(true);
    expect(result.noSiteFieldsInState).toBe(true);
    /* Rome is authored as a town at both dates: the dev-4 head-town threshold
       is already satisfied and must not be promised. */
    expect(result.development.change).not.toBe('head_town');
  });

test('bookmark switching restores exact compiled sites and clears stale markers',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const first = await page.evaluate(function () {
      const rec = FB.world.sitesByProv.roma.list[0];
      return { x:rec.x, y:rec.y, site:rec.site, name:rec.name, kind:rec.kind };
    });

    /* detailed zoom produces hit targets, then the switch must drop them */
    await page.evaluate(function () { FB.map.centerOn('roma', 13); });
    await waitForUiRefresh(page);
    const beforeSwitch = await page.evaluate(function () {
      return FB.map.visibleSites.length;
    });
    expect(beforeSwitch).toBeGreaterThan(0);

    const second = await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('1066', function () {}, function (error) {
          const rec = FB.world.sitesByProv.roma.list[0];
          resolve({
            error:error && error.message,
            staleMarkers:FB.map.visibleSites.length,
            roma:{ x:rec.x, y:rec.y, site:rec.site, name:rec.name, kind:rec.kind }
          });
        });
      });
    });
    expect(second.error).toBeNull();
    expect(second.staleMarkers).toBe(0);
    /* the same physical slug compiles to the same point in both dates */
    expect(second.roma.x).toBe(first.x);
    expect(second.roma.y).toBe(first.y);
    expect(second.roma.site).toBe('roma');
    expect(second.roma.name).toBe('Rome');
    expect(second.roma.kind).toBe('city'); // 1066 baseline is a city

    const third = await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('867', function () {}, function (error) {
          const rec = FB.world.sitesByProv.roma.list[0];
          resolve({
            error:error && error.message,
            roma:{ x:rec.x, y:rec.y, site:rec.site, name:rec.name, kind:rec.kind }
          });
        });
      });
    });
    expect(third.error).toBeNull();
    expect(third.roma).toEqual(first);
  });

/* ---------- save and property compatibility ---------- */

test('numeric property at pre-feature indices resolves in the settlement sheet',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const setup = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId; // the CADENCE start is london, authored
      /* pre-feature numeric property records: a building, plots, a manor, and
         an enterprise, all keyed by province id + numeric settlement index */
      s.buildings[pid] = [{ s:1, id:'mill' }];
      s.player.landPlots = [{ provinceId:pid, settlement:1 }];
      s.player.manor = { provinceId:pid, settlement:1 };
      const enterpriseType = Object.keys(FBDATA.enterprises)[0];
      s.player.enterprises = [{
        uid:'e2e_ent', type:enterpriseType, provinceId:pid, settlement:1,
        workerId:null
      }];
      const slots = FB.settlementsOf(s, pid);
      FB.ui.showSettlement(pid, 1);
      return {
        pid:pid,
        slotCount:slots.length,
        slot1:slots[1],
        enterpriseType:enterpriseType,
        enterpriseName:FBDATA.enterprises[enterpriseType].name
      };
    });

    expect(setup.slotCount).toBeGreaterThanOrEqual(2);
    const body = page.locator('#gm-body');
    await expect(body).toContainText('County development:');
    await expect(body).toContainText('farms 1 plots');
    await expect(body).toContainText('manor stands here');
    await expect(body).toContainText('operates here');
    await expect(body).toContainText('Watermill');
    /* the CADENCE farmer's home county is in their demesne, so demolishing
       their own building is offered; the tier gate keeps construction away */
    await expect(page.locator('#gm-body [data-demolish]')).toHaveCount(1);
    await expect(page.locator('#gm-raise')).toHaveCount(0);

    /* neighboring slot shows none of the slot-1 property */
    await page.evaluate(function (pid) {
      FB.ui.showSettlement(pid, 0);
    }, setup.pid);
    await expect(body).not.toContainText('farms 1 plots');
    await expect(body).not.toContainText('manor stands here');
    await expect(body).not.toContainText('operates here');
    await expect(body).toContainText('No buildings');

    /* Escape and keyboard Back behavior stay consistent */
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });

test('a valid demesne sheet retains construction and demolition controls',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const setup = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      s.player.tier = 5;
      s.player.liege = null;
      s.player.provs = [pid];
      FB.foundPlayerRealm(s);
      s.buildings[pid] = [{ s:0, id:'mill' }];
      const buildable = FB.buildable(s, pid, 0).length > 0;
      FB.ui.showSettlement(pid, 0);
      return { pid:pid, buildable:buildable };
    });

    await expect(page.locator('#gm-body [data-demolish]')).toHaveCount(1);
    if (setup.buildable) {
      await expect(page.locator('#gm-raise')).toHaveCount(1);
    }
    /* a foreign county sheet shows structures but no mutating control */
    await page.evaluate(function () {
      const s = FB.state;
      let foreign = null;
      for (const pr of FB.world.provs) {
        if (pr.wasteland) continue;
        const holder = (s.holder && s.holder[pr.id]) || s.owner[pr.id];
        if (holder && holder !== 'player') { foreign = pr.id; break; }
      }
      FB.ui.showSettlement(foreign, 0);
    });
    await expect(page.locator('#gm-body [data-demolish]')).toHaveCount(0);
    await expect(page.locator('#gm-raise')).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

/* ---------- condition-driven development and settlement anchors ---------- */

test('development decline never conceals an anchored settlement',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId; // the CADENCE start is london
      const info = FB.world.sitesByProv[pid];
      const savedDev = s.dev[pid];
      const savedBuildings = s.buildings[pid];
      const savedEnterprises = s.player.enterprises;
      const savedHome = s.player.homeSettlement;
      const out = { pid:pid };
      try {
        s.dev[pid] = 1; // below every reveal threshold
        const base = FB.settlementVisibleCount(s, pid);
        out.base = base;
        out.slotCount = info.list.length;
        const hidden = info.list[base]; // the first concealed slot
        out.startHidden = !FB.siteVisible(s, hidden);

        /* a standing building anchors its slot; a ruin releases it */
        s.buildings[pid] = [{ s:base, id:'mill' }];
        out.buildingKeeps = FB.siteVisible(s, hidden);
        s.buildings[pid][0].ruined = true;
        out.ruinReleases = !FB.siteVisible(s, hidden);
        s.buildings[pid] = [];

        /* a family enterprise anchors its slot; selling releases it */
        const enterpriseType = Object.keys(FBDATA.enterprises)[0];
        s.player.enterprises = [{
          uid:'e2e_anchor', type:enterpriseType, provinceId:pid,
          settlement:base, workerId:null
        }];
        out.enterpriseKeeps = FB.siteVisible(s, hidden);
        s.player.enterprises = [];
        out.enterpriseReleases = !FB.siteVisible(s, hidden);

        /* the player's own home anchors its slot */
        s.player.homeSettlement = base;
        out.homeKeeps = FB.siteVisible(s, hidden);

        /* growth still scales past every anchor */
        s.dev[pid] = 9;
        out.grown = FB.settlementVisibleCount(s, pid);
      } finally {
        s.dev[pid] = savedDev;
        if (savedBuildings === undefined) delete s.buildings[pid];
        else s.buildings[pid] = savedBuildings;
        s.player.enterprises = savedEnterprises;
        s.player.homeSettlement = savedHome;
      }
      return out;
    });

    expect(result.slotCount).toBeGreaterThan(result.base);
    expect(result.startHidden).toBe(true);
    expect(result.buildingKeeps).toBe(true);
    expect(result.ruinReleases).toBe(true);
    expect(result.enterpriseKeeps).toBe(true);
    expect(result.enterpriseReleases).toBe(true);
    expect(result.homeKeeps).toBe(true);
    expect(result.grown).toBeGreaterThan(result.base);
  });

test('annual AI building construction skips direct player counties but places infrastructure under AI rulers',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const pid = p.provinceId;
      let governed = null;
      for (const pr of FB.world.provs) {
        if (pr.wasteland || pr.id === pid) continue;
        const holder = (s.holder && s.holder[pr.id]) || s.owner[pr.id];
        if (holder && holder !== 'player') { governed = pr.id; break; }
      }
      const savedDev = s.dev;
      const savedProvs = p.provs;
      const savedBuildings = s.buildings;
      const out = {};
      try {
        p.provs = [pid];
        s.dev = {};
        s.dev[pid] = 5;
        s.dev[governed] = 5;
        s.buildings = {};
        s.buildings[pid] = [];
        s.buildings[governed] = [];
        FB.aiBuildingsYear(s);
        out.directBuildings = (s.buildings[pid] || []).length;
        out.governedBuildings = (s.buildings[governed] || []).length;

        p.provs = [];
        s.buildings[pid] = [];
        FB.aiBuildingsYear(s);
        out.returnedToAiBuildings = (s.buildings[pid] || []).length;
      } finally {
        s.dev = savedDev;
        p.provs = savedProvs;
        s.buildings = savedBuildings;
      }
      return out;
    });

    expect(result.directBuildings).toBe(0);
    expect(result.governedBuildings).toBeGreaterThan(0);
    expect(result.returnedToAiBuildings).toBeGreaterThan(0);
  });

test('legacy direct development is rebuilt once from bookmark and standing buildings',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const result = await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize());
      const s = data.state;
      const p = s.player;
      let pid = null;
      let risenPid = null;
      let aiPid = null;
      for (const pr of FB.world.provs) {
        if (pr.wasteland) continue;
        if (!pid && pr.dev0 <= 8) pid = pr.id;
        else if (!risenPid && pr.dev0 <= 8) risenPid = pr.id;
        else if (!aiPid) aiPid = pr.id;
        if (pid && risenPid && aiPid) break;
      }
      p.provs = [pid, risenPid];
      delete p.developmentBaselineMigration;
      s.dev[pid] = 1;
      s.dev[risenPid] = 10;
      s.dev[aiPid] = 9;
      s.buildings[pid] = [
        'bridge',
        { s:1, id:'mill' },
        { s:2, id:'harbor', ruined:true }
      ];

      FB.save.restore(data);
      const restored = FB.state;
      const first = {
        development:restored.dev[pid],
        risenDevelopment:restored.dev[risenPid],
        aiDevelopment:restored.dev[aiPid],
        marker:restored.player.developmentBaselineMigration,
        records:restored.buildings[pid]
      };
      restored.dev[pid] = 2;
      const changedAgain = FB.migratePlayerDevelopment(restored);
      return {
        bookmark:FB.world.byId[pid].dev0,
        risenBookmark:FB.world.byId[risenPid].dev0,
        first:first,
        changedAgain:changedAgain,
        afterSecondCall:restored.dev[pid]
      };
    });

    expect(result.first.development).toBe(result.bookmark + 2);
    expect(result.first.risenDevelopment).toBe(result.risenBookmark);
    expect(result.first.aiDevelopment).toBe(9);
    expect(result.first.marker).toBe(1);
    expect(result.first.records).toEqual([
      { s:0, id:'bridge', devGranted:1 },
      { s:1, id:'mill', devGranted:1 },
      { s:2, id:'harbor', ruined:true }
    ]);
    expect(result.changedAgain).toBe(false);
    expect(result.afterSecondCall).toBe(2);
  });

test('building development reverses on demolition without inventing legacy loss',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const pid = p.provinceId;
      p.tier = 4;
      p.provs = [pid];
      p.gold = 10000;
      s.owner[pid] = 'player';
      s.holder[pid] = 'player';
      s.buildings[pid] = [];
      FB.foundPlayerRealm(s);
      const technology = FB.realmTechRecord(s, FB.techRealmId(s));
      const requirement = FBDATA.buildings.market.requiresTech;
      if (technology.completed.indexOf(requirement) < 0) {
        technology.completed.push(requirement);
      }

      s.dev[pid] = 5;
      const raised = FB.build(s, pid, 0, 'market');
      const record = FB.builtIn(s, pid)[0];
      const afterRaise = s.dev[pid];
      const demolished = FB.demolishBuilding(s, pid, 0, 'market');
      const afterDemolition = s.dev[pid];
      const demolitionNews = s.log.filter(function (entry) {
        return entry.msg &&
          entry.msg.key === 'news.world.development_infrastructure_lost';
      }).length;

      s.buildings[pid] = [];
      const cap = FB.devCap(s, pid);
      s.dev[pid] = cap;
      FB.build(s, pid, 0, 'market');
      const cappedRecord = FB.builtIn(s, pid)[0];
      FB.demolishBuilding(s, pid, 0, 'market');
      const afterCappedDemolition = s.dev[pid];

      s.buildings[pid] = [{ s:0, id:'market' }];
      s.dev[pid] = 5;
      FB.demolishBuilding(s, pid, 0, 'market');

      const developmentBuildings = Object.keys(FBDATA.buildings).filter(function (id) {
        return FBDATA.buildings[id].dev;
      }).sort();

      return {
        raised:raised,
        granted:record.devGranted,
        afterRaise:afterRaise,
        demolished:demolished,
        afterDemolition:afterDemolition,
        demolitionNews:demolitionNews,
        cappedGranted:cappedRecord.devGranted,
        afterCappedDemolition:afterCappedDemolition,
        cap:cap,
        legacyAfterDemolition:s.dev[pid],
        developmentBuildings:developmentBuildings
      };
    });

    expect(result).toEqual({
      raised:true,
      granted:1,
      afterRaise:6,
      demolished:true,
      afterDemolition:5,
      demolitionNews:1,
      cappedGranted:0,
      afterCappedDemolition:result.cap,
      cap:result.cap,
      legacyAfterDemolition:5,
      developmentBuildings:['arsenal', 'bridge', 'cathedral', 'exchange', 'guildhall', 'harbor', 'market', 'mill', 'windmill']
    });
  });

/* ---------- map markers and input ---------- */

test('zoom tiers control settlement hit targets and visibility',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    /* strategic zoom: no settlement hit targets at all — the layer only
       exists at close zoom */
    await page.evaluate(function () { FB.map.fitView(); FB.map.request(); });
    await waitForUiRefresh(page);
    const strategic = await page.evaluate(function () {
      return { zoom:FB.map.zoom, targets:FB.map.visibleSites.length };
    });
    expect(strategic.zoom).toBeLessThan(6);
    expect(strategic.targets).toBe(0);

    /* detailed zoom (>= 12): every hit target is a currently visible site
       drawn as a procedural emblem (hs > 0) that registers its own obstacle
       rect */
    await page.evaluate(function () { FB.map.centerOn('roma', 13); });
    await waitForUiRefresh(page);
    const detailed = await page.evaluate(function () {
      const s = FB.state;
      let allVisible = true, allEmblems = true, romaHead = null;
      for (const hit of FB.map.visibleSites) {
        if (!FB.siteVisible(s, hit)) allVisible = false;
        if (!(hit.hs > 0)) allEmblems = false;
        if (hit.pid === 'roma' && hit.index === 0) romaHead = hit;
      }
      return {
        targets:FB.map.visibleSites.length,
        allVisible:allVisible,
        allEmblems:allEmblems,
        romaHead:!!romaHead,
        blockedRects:FB.map._rectCount,
        smoothing:FB.map.ctx.imageSmoothingEnabled,
        flatBase:!!FB.map.baseFlat && FB.map.baseFlat.width === FB.world.W
      };
    });
    expect(detailed.targets).toBeGreaterThan(0);
    expect(detailed.allVisible).toBe(true);
    expect(detailed.allEmblems).toBe(true);
    expect(detailed.romaHead).toBe(true);
    /* label collision may reject labels but never removes markers, and every
       drawn emblem blocks later labels with its own rect */
    expect(detailed.blockedRects).toBeGreaterThanOrEqual(detailed.targets);
    /* the settlement close-up band blits a flat per-county backdrop with
       smoothing on behind the emblems and the vector border pass */
    expect(detailed.smoothing).toBe(true);
    expect(detailed.flatBase).toBe(true);

    /* a selection keeps both outline variants: the pixel-edge staircase for
       ordinary zooms and the smoothed contour that coincides with the vector
       borders in the close-zoom band */
    const outlines = await page.evaluate(function () {
      FB.map.select('roma');
      return {
        stair:!!FB.map.selectedOutline,
        smooth:!!FB.map.selectedOutlineSmooth,
        groupStair:!!FB.map.groupOutline,
        groupSmooth:!!FB.map.groupOutlineSmooth
      };
    });
    expect(outlines.stair).toBe(true);
    expect(outlines.smooth).toBe(true);
    expect(outlines.groupStair).toBe(true);
    expect(outlines.groupSmooth).toBe(true);

    /* intermediate zoom (>= 6): county heads and authored cities only, shape
       markers with no emblem hit sizing and no name labels (labels live only
       in the emblem band); zoom is set directly because centerOn's zoomTo
       only ever raises the level */
    await page.evaluate(function () {
      FB.map.zoom = 7;
      FB.map.centerOn('roma');
    });
    await waitForUiRefresh(page);
    const intermediate = await page.evaluate(function () {
      const s = FB.state;
      let rule = true, shapes = true;
      for (const hit of FB.map.visibleSites) {
        if (hit.hs !== 0) shapes = false;
        const info = FB.world.sitesByProv[hit.pid];
        const rec = info && info.list[hit.index];
        if (!rec) { rule = false; continue; }
        const rank = FB.siteKindRank(s, rec);
        if (!(rec.index === 0 || (rec.authored && rank === 2))) rule = false;
      }
      return {
        targets:FB.map.visibleSites.length, rule:rule, shapes:shapes,
        rects:FB.map._rectCount
      };
    });
    expect(intermediate.targets).toBeGreaterThan(0);
    expect(intermediate.rule).toBe(true);
    expect(intermediate.shapes).toBe(true);
    /* bare markers register no label or emblem obstacle rects at all */
    expect(intermediate.rects).toBe(0);

    /* mid zoom (2..6) has no settlement layer and keeps the crisp pixel
       raster */
    await page.evaluate(function () {
      FB.map.zoom = 3;
      FB.map.centerOn('roma');
    });
    await waitForUiRefresh(page);
    const midBand = await page.evaluate(function () {
      return {
        targets:FB.map.visibleSites.length,
        smoothing:FB.map.ctx.imageSmoothingEnabled
      };
    });
    expect(midBand.targets).toBe(0);
    expect(midBand.smoothing).toBe(false);
  });

test('settlement emblems are deterministic per site and distinct per kind',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function pixels(cv) {
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let out = '';
        for (let i = 0; i < d.length; i += 61) out += d[i] + ',';
        return out;
      }
      const city = FB.siteArt(2, 'paris');
      const cached = FB.siteArt(2, 'paris');
      const freshPixels = pixels(FB.siteArt(2, 'paris'));
      const distinct = {};
      let distinctCities = 0;
      for (const slug of ['paris', 'london', 'roma', 'cordoba', 'aachen', 'venezia']) {
        distinct[pixels(FB.siteArt(2, slug))] = 1;
      }
      for (const key in distinct) distinctCities++;
      const corner = city.getContext('2d').getImageData(0, 0, 1, 1).data;
      return {
        cachedInstance:city === cached,
        stablePixels:pixels(city) === freshPixels,
        size:[city.width, city.height],
        kindDistinct:pixels(city) !== pixels(FB.siteArt(1, 'paris')) &&
          pixels(city) !== pixels(FB.siteArt(0, 'paris')) &&
          pixels(FB.siteArt(1, 'paris')) !== pixels(FB.siteArt(0, 'paris')),
        distinctCities:distinctCities,
        transparentCorner:corner[3] === 0
      };
    });

    expect(result.cachedInstance).toBe(true);
    expect(result.stablePixels).toBe(true);
    expect(result.size[0]).toBe(result.size[1]);
    expect(result.size[0]).toBeGreaterThanOrEqual(64);
    expect(result.kindDistinct).toBe(true);
    expect(result.distinctCities).toBeGreaterThan(1);
    expect(result.transparentCorner).toBe(true);
  });

test('the map zooms past the old ceiling into dense settlement clusters',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      FB.game.setPaused(true);
      const rec = FB.world.sitesByProv.paris.list[0];
      FB.map.centerOn('paris', 3);
      /* keep the head site pinned at the canvas center while zooming in */
      FB.map.viewX = rec.x - FB.map.canvas.width / FB.map.zoom / 2;
      FB.map.viewY = rec.y - FB.map.canvas.height / FB.map.zoom / 2;
      for (let i = 0; i < 80; i++) FB.map.zoomIn();
      FB.map.request();
      return { zoom:FB.map.zoom, max:FB.map.maxZoom, site:rec.site };
    });
    await waitForUiRefresh(page);

    expect(result.max).toBeGreaterThanOrEqual(80);
    expect(result.zoom).toBe(result.max);

    /* at maximum zoom the pinned site resolves to exactly one emblem target */
    const emblem = await page.evaluate(function (slug) {
      const out = [];
      for (const hit of FB.map.visibleSites) {
        const rec = FB.world.sitesByProv[hit.pid].list[hit.index];
        if (rec.site === slug) out.push(hit.hs);
      }
      return out;
    }, result.site);
    expect(emblem.length).toBe(1);
    expect(emblem[0]).toBeGreaterThan(0);
  });

test('mouse and touch taps open the exact settlement with kind-shaped precedence',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const marker = await page.evaluate(function () {
      FB.game.setPaused(true);
      const pid = FB.state.player.provinceId; // london: authored county head
      FB.map.centerOn(pid, 7.0);
      FB.map.request();
      return pid;
    });
    await waitForUiRefresh(page);

    const point = await page.evaluate(function (pid) {
      let hit = null;
      for (const s of FB.map.visibleSites) {
        if (s.pid === pid && s.index === 0) hit = s;
      }
      if (!hit) return null;
      const rect = FB.map.canvas.getBoundingClientRect();
      return {
        x:rect.left + hit.x / FB.map.dpr,
        y:rect.top + hit.y / FB.map.dpr,
        name:FB.settlementsOf(FB.state, pid)[0].name
      };
    }, marker);
    expect(point).not.toBeNull();

    /* an ordinary mouse click on the marker opens its settlement sheet and
       selects the parent county */
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#gm-title')).toContainText(point.name);
    const selected = await page.evaluate(function () { return FB.map.selected; });
    expect(selected).toBe(marker);
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    /* a near miss beyond the mouse radius keeps ordinary county behavior */
    await page.mouse.click(point.x + 12, point.y);
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    /* the wider touch radius accepts the same near miss */
    await page.evaluate(function (p) {
      /* synthetic pointers are untrusted: capture calls reject their ids */
      Element.prototype.setPointerCapture = function () {};
      const canvas = FB.map.canvas;
      const opts = {
        bubbles:true, cancelable:true, pointerId:7, isPrimary:true,
        pointerType:'touch', clientX:p.x + 12, clientY:p.y
      };
      canvas.dispatchEvent(new PointerEvent('pointerdown', opts));
      canvas.dispatchEvent(new PointerEvent('pointerup', opts));
    }, point);
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#gm-title')).toContainText(point.name);
    await page.keyboard.press('Escape');
  });

test('Land tab settlement names open the exact sheet and center the map county',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    /* an interior foreign county: every settlement name is a link, not just
       demesne ones */
    const pid = await page.evaluate(function () {
      const s = FB.state;
      /* keep the first-visit Land tab intro sheet from covering the panel */
      s.player.panelIntrosSeen = s.player.panelIntrosSeen || {};
      s.player.panelIntrosSeen.prov = 1;
      let foreign = null;
      for (const pr of FB.world.provs) {
        if (pr.wasteland) continue;
        if (pr.cx < 120 || pr.cy < 120 ||
            pr.cx > FB.world.W - 120 || pr.cy > FB.world.H - 120) continue;
        const holder = (s.holder && s.holder[pr.id]) || s.owner[pr.id];
        if (holder && holder !== 'player') { foreign = pr.id; break; }
      }
      FB.map.zoom = 4;
      /* the Land tab renders selectedProv, which only the production
         selection path sets — a bare FB.map.select leaves it on the
         player's home county */
      FB.ui.selectProvince(foreign);
      FB.ui.showTab('prov', { history:false });
      return foreign;
    });
    await waitForUiRefresh(page);

    const names = await page.evaluate(function (id) {
      return FB.settlementsOf(FB.state, id).map(function (rec) { return rec.name; });
    }, pid);
    const links = page.locator('#tab-prov .settlink');
    expect(await links.count()).toBe(names.length);
    expect(names.length).toBeGreaterThan(0);

    /* clicking the head settlement opens its sheet and centers the map on
       the parent county */
    await links.nth(0).click();
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#gm-title')).toContainText(names[0]);
    const centered = await page.evaluate(function (id) {
      const pr = FB.world.byId[id];
      return {
        dx:Math.abs(FB.map.viewX + FB.map.canvas.width / FB.map.zoom / 2 - pr.cx),
        dy:Math.abs(FB.map.viewY + FB.map.canvas.height / FB.map.zoom / 2 - pr.cy)
      };
    }, pid);
    expect(centered.dx).toBeLessThan(1);
    expect(centered.dy).toBeLessThan(1);
    await page.keyboard.press('Escape');
  });

test('the guide returns to the context modal on Back and dismisses on Close',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const pid = await page.evaluate(function () {
      const id = FB.state.player.provinceId;
      FB.ui.showSettlement(id, 0);
      return id;
    });
    const name = await page.evaluate(function (id) {
      return FB.settlementsOf(FB.state, id)[0].name;
    }, pid);
    await expect(page.locator('#gm-title')).toContainText(name);
    const guide = page.locator('#genmodal .gm-heading > #settlement-guide');
    await expect(guide).toHaveClass(/modal-guide-button/);
    await expect(guide).toHaveText('i');
    await expect(guide).toHaveAttribute(
      'aria-label', 'Guide: settlements and development');
    await expect(page.locator('#genmodal .gm-footer #settlement-guide')).toHaveCount(0);

    /* closing the guide returns to the sheet with its live nodes, listeners,
       and header help control restored */
    await guide.click();
    await expect(page.locator('#gm-title')).toContainText('Guide');
    await expect(page.locator('#guide-back')).toHaveCount(0);
    await page.locator('#guide-close').click();
    await expect(page.locator('#gm-title')).toContainText(name);
    await expect(page.locator('#genmodal .gm-heading > #settlement-guide'))
      .toBeVisible();
    /* the restored sheet's own buttons still work */
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    /* Close consistently returns to the source sheet. */
    await page.evaluate(function (id) { FB.ui.showSettlement(id, 0); }, pid);
    await page.locator('#settlement-guide').click();
    await expect(page.locator('#gm-title')).toContainText('Guide');
    await page.locator('#guide-close').click();
    await expect(page.locator('#gm-title')).toContainText(name);
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });

test('targeting modes keep the parent county before any settlement sheet',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      const prov = FB.world.byId[pid];
      const site = { pid:pid, index:0 };
      const out = {};
      const realShowSettlement = FB.ui.showSettlement;
      const sheets = [];
      FB.ui.showSettlement = function (p, i) { sheets.push([p, i]); };
      try {
        /* new-game pick mode: the tap is the parent county */
        let picked = null;
        const realPick = FB.game.pickProvince;
        FB.game.pickMode = true;
        FB.game.pickProvince = function (pr) { picked = pr && pr.id; };
        FB.map.onTap(null, prov.cx, prov.cy, site);
        out.pickCounty = picked;
        out.pickSheetCount = sheets.length;
        FB.game.pickProvince = realPick;
        FB.game.pickMode = false;

        /* travel picker: the tap is the parent county */
        const realOpen = FB.ui.travelPickerOpen;
        const realTravelPick = FB.ui.travelPickProvince;
        let traveled = null;
        FB.ui.travelPickerOpen = function () { return true; };
        FB.ui.travelPickProvince = function (id) { traveled = id; };
        FB.map.onTap(prov, prov.cx, prov.cy, site);
        out.travelCounty = traveled;
        out.travelSheetCount = sheets.length;
        FB.ui.travelPickerOpen = realOpen;
        FB.ui.travelPickProvince = realTravelPick;

        /* army tap: receives the parent county and consumes the tap */
        const realArmyTap = FB.armyTap;
        let army = null;
        FB.armyTap = function (st, pr) { army = pr && pr.id; return true; };
        FB.map.onTap(prov, prov.cx, prov.cy, site);
        out.armyCounty = army;
        out.armySheetCount = sheets.length;
        FB.armyTap = realArmyTap;

        /* ordinary browsing: selects the county and opens the exact slot */
        FB.map.onTap(prov, prov.cx, prov.cy, site);
        out.browseSheet = sheets.length ? sheets[sheets.length - 1] : null;
        out.browseSelected = FB.map.selected;
      } finally {
        FB.ui.showSettlement = realShowSettlement;
      }
      return out;
    });

    expect(result.pickCounty).toBe(await page.evaluate(function () {
      return FB.state.player.provinceId;
    }));
    expect(result.pickSheetCount).toBe(0);
    expect(result.travelCounty).toBe(result.pickCounty);
    expect(result.travelSheetCount).toBe(0);
    expect(result.armyCounty).toBe(result.pickCounty);
    expect(result.armySheetCount).toBe(0);
    expect(result.browseSheet).toEqual([result.pickCounty, 0]);
    expect(result.browseSelected).toBe(result.pickCounty);
  });

test('the Land tab flags a sovereign realm capital and spares other counties',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const pids = await page.evaluate(function () {
      const s = FB.state;
      let capital = null, ordinary = null, realmName = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        if (!r.alive || r.liege) continue;
        const pr = FB.world.byId[r.capital];
        if (!pr || pr.wasteland) continue;
        capital = r.capital;
        realmName = r.name;
        break;
      }
      for (const pr of FB.world.provs) {
        if (pr.wasteland || pr.id === capital) continue;
        let isCap = false;
        for (const id in s.realms) {
          const r = s.realms[id];
          if (r.alive && !r.liege && r.capital === pr.id) isCap = true;
        }
        if (!isCap) { ordinary = pr.id; break; }
      }
      return { capital:capital, ordinary:ordinary, realmName:realmName };
    });

    /* the capital county names its realm beside the ★ row */
    await page.evaluate(function (id) {
      FB.map.select(id);
      FB.ui.showTab('prov', { history:false });
    }, pids.capital);
    await waitForUiRefresh(page);
    await expect(page.locator('#tab-prov')).toContainText('Realm capital');
    await expect(page.locator('#tab-prov')).toContainText(pids.realmName);

    /* an ordinary county shows no such row */
    await page.evaluate(function (id) {
      FB.map.select(id);
      FB.ui.showTab('prov', { history:false });
    }, pids.ordinary);
    await waitForUiRefresh(page);
    await expect(page.locator('#tab-prov')).not.toContainText('Realm capital');
  });

test('Venice sits on its lagoon island while its county keeps the mainland',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const w = FB.world, grid = w.grid;
      const pr = w.byId.venezia;
      const info = w.sitesByProv.venezia;
      const head = info.list[0];
      function seaOnPath(x0, y0, x1, y1) {
        for (let i = 1; i < 60; i++) {
          const x = Math.round(x0 + (x1 - x0) * i / 60);
          const y = Math.round(y0 + (y1 - y0) * i / 60);
          if (!grid[y * w.W + x]) return true;
        }
        return false;
      }
      /* Venice (the county head) is on a land fragment cut off from the
         county centroid by open water — the lagoon island */
      const headInCounty = grid[head.y * w.W + head.x] === pr.idx + 1;
      const island = seaOnPath(head.x, head.y, pr.cx, pr.cy);
      /* the county still holds its mainland strip, so a mainland settlement
         reaches the centroid over land */
      const mainland = info.list.filter(function (rec) {
        return !seaOnPath(rec.x, rec.y, pr.cx, pr.cy);
      });
      return {
        headName:head.name, headInCounty:headInCounty, island:island,
        mainlandNames:mainland.map(function (rec) { return rec.name; }),
        area:pr.area
      };
    });

    expect(result.headName).toBe('Venice');
    expect(result.headInCounty).toBe(true);
    expect(result.island).toBe(true);
    expect(result.mainlandNames.length).toBeGreaterThan(0);
    /* far more than the island's handful of cells — the strip survives */
    expect(result.area).toBeGreaterThan(30);
  });

/* ---------- coastal placement ---------- */

test('compiled sites stay in-county and keep a land margin from the sea',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const w = FB.world, W = w.W, H = w.H, grid = w.grid;
      function seaAdjacent(x, y) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) return true;
            if (!grid[ny * W + nx]) return true;
          }
        }
        return false;
      }
      let total = 0, inCounty = true, offshore = 0;
      const coastal = { oviedo:[], santander:[] };
      for (const rec of w.sites) {
        total++;
        if (grid[rec.y * W + rec.x] !== rec.pidx + 1) inCounty = false;
        const adjacent = seaAdjacent(rec.x, rec.y);
        if (adjacent) offshore++;
        if (rec.pid in coastal) {
          coastal[rec.pid].push({ name:rec.name, offshore:adjacent });
        }
      }
      return {
        total:total, inCounty:inCounty, offshore:offshore, coastal:coastal
      };
    });

    /* every site — curated, real-world fill, or generated — still sits on
       one of its own county's cells after the inland nudge */
    expect(result.inCounty).toBe(true);
    /* islet/fjord fallbacks are rare: essentially every site keeps a full
       land margin so its emblem cannot read as floating offshore */
    expect(result.offshore).toBeLessThan(result.total * 0.02);
    /* the reported Bay of Biscay counties: their real coastal towns no
       longer hang over the painted water */
    for (const pid of ['oviedo', 'santander']) {
      expect(result.coastal[pid].length).toBeGreaterThan(0);
      for (const rec of result.coastal[pid]) {
        expect(rec.offshore).toBe(false);
      }
    }
  });

test('the capital-star lookup tracks exactly the sovereign realm capitals',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });

    const result = await page.evaluate(function () {
      const s = FB.state;
      const expected = {};
      for (const id in s.realms) {
        const r = s.realms[id];
        if (r.alive && !r.liege && FB.world.byId[r.capital]) {
          expected[r.capital] = 1;
        }
      }
      let sovereign = 0, extras = 0, missing = 0;
      for (const pid in expected) {
        sovereign++;
        if (!FB.map.capitalSet[pid]) missing++;
      }
      for (const pid in FB.map.capitalSet) {
        if (!expected[pid]) extras++;
      }
      return { sovereign:sovereign, missing:missing, extras:extras };
    });

    /* the renderer stars a county label iff it is a living sovereign's
       capital — no vassal seats, no dead realms, none dropped */
    expect(result.sovereign).toBeGreaterThan(20);
    expect(result.missing).toBe(0);
    expect(result.extras).toBe(0);
  });

/* ---------- mod compatibility ---------- */

test('mods merge physical sites and compile complete province presentations',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      return new Promise(function (resolve) {
        const source = FBDATA.provinces.find(function (p) { return p.id === 'london'; });
        const replacement = {};
        for (const key in source) replacement[key] = source[key];
        replacement.settlements = [
          { site:'e2e_testton', name:'Testton', kind:'town' },
          { site:'london', name:'Lunden', kind:'village' }
        ];
        FB.mods.apply({
          settlementSites:{ e2e_testton:{ x:-0.09, y:51.51 } },
          provinces:[replacement]
        });
        const definition = {};
        for (const key in FB.bookmark('867')) definition[key] = FB.bookmark('867')[key];
        definition.id = 'e2e_sites';
        FBDATA.bookmarks.e2e_sites = definition;
        FB.activateBookmark('e2e_sites', function () {}, function (error) {
          if (error) { resolve({ error:error.message }); return; }
          const list = FB.world.sitesByProv.london.list;
          resolve({
            error:null,
            head:{
              site:list[0].site, name:list[0].name, kind:list[0].kind,
              authored:list[0].authored, index:list[0].index
            },
            second:{
              site:list[1].site, name:list[1].name, authored:list[1].authored
            },
            generatedFill:list.slice(2).map(function (rec) {
              return { site:rec.site, authored:rec.authored };
            }),
            visible:FB.settlementsOf(null, 'london').map(function (rec) {
              return rec.name;
            })
          });
        });
      });
    });

    expect(result.error).toBeNull();
    expect(result.head).toMatchObject({
      site:'e2e_testton', name:'Testton', kind:'town', authored:true, index:0
    });
    expect(result.second).toMatchObject({ site:'london', name:'Lunden', authored:true });
    expect(result.generatedFill.length).toBeGreaterThan(0);
    for (const rec of result.generatedFill) {
      expect(rec.authored).toBe(false);
      expect(rec.site).toMatch(/^generated__london__\d+$/);
    }
    expect(result.visible).toContain('Testton');

    /* restore the base world for later tests on this page */
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('867', function () {}, function () { resolve(); });
      });
    });
  });

test('a legacy mod without site data keeps deterministic generated settlements',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const before = await page.evaluate(function () {
      return FB.settlementsOf(null, 'london').map(function (rec) {
        return { name:rec.name, kind:rec.kind };
      });
    });

    const result = await page.evaluate(function () {
      return new Promise(function (resolve) {
        const source = FBDATA.provinces.find(function (p) { return p.id === 'london'; });
        const replacement = {};
        for (const key in source) {
          if (key !== 'settlements') replacement[key] = source[key];
        }
        FB.mods.apply({ provinces:[replacement] });
        const definition = {};
        for (const key in FB.bookmark('867')) definition[key] = FB.bookmark('867')[key];
        definition.id = 'e2e_legacy';
        FBDATA.bookmarks.e2e_legacy = definition;
        FB.activateBookmark('e2e_legacy', function () {}, function (error) {
          if (error) { resolve({ error:error.message }); return; }
          const info = FB.world.sitesByProv.london;
          resolve({
            error:null,
            authored:info.authored,
            list:info.list.map(function (rec) {
              return { site:rec.site, name:rec.name, kind:rec.kind, authored:rec.authored };
            }),
            visible:FB.settlementsOf(null, 'london').map(function (rec) {
              return { name:rec.name, kind:rec.kind };
            })
          });
        });
      });
    });

    expect(result.error).toBeNull();
    expect(result.authored).toBe(0);
    for (const rec of result.list) {
      expect(rec.authored).toBe(false);
      expect(rec.site).toMatch(/^generated__london__\d+$/);
    }
    /* generated slots keep the same deterministic names and indices the
       pre-feature build would have used */
    for (let i = 0; i < before.length; i++) {
      expect(result.visible[i]).toEqual(before[i]);
    }

    await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('867', function () {}, function () { resolve(); });
      });
    });
  });
