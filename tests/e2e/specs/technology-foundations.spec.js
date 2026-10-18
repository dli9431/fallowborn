'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/technology.js', 'data/technology_foundations.js',
  'data/bookmarks.js', 'data/eras.js', 'data/cultures.js',
  'js/technology.js', 'js/world.js', 'js/main.js', 'js/save.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const IDS = [
  'seed_selection', 'haymaking', 'stone_sawing', 'water_power', 'powered_mills',
  'legume_rotation', 'heavy_plough', 'improved_husbandry', 'selective_stockbreeding'
];

test.beforeEach(async function ({ page }) {
  // Capture the real base table before this supplement composes it. The browser
  // still loads the committed index; Node never imports or executes game code.
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    Object.defineProperty(window.FBDATA, 'techCorrections_foundations', {
      configurable:true,
      set:function (value) {
        window.__foundationBase = JSON.parse(JSON.stringify(this.tech));
        Object.defineProperty(this, 'techCorrections_foundations', {
          configurable:true, enumerable:true, writable:true, value:value
        });
      }
    });
  });
});

test('nine complete corrections preserve costs, graphs, effects and every adoption pair',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const changes = [], evidence = {}, costs = {};
      ids.forEach(function (id) {
        const original = JSON.parse(JSON.stringify(window.__foundationBase[id]));
        const effective = JSON.parse(JSON.stringify(FBDATA.tech[id]));
        evidence[id] = effective.history.attested;
        costs[id] = effective.cost;
        delete original.name; delete original.desc;
        delete effective.name; delete effective.desc;
        delete original.history.attested; delete effective.history.attested;
        // The three dated corrections add their direct evidence references.
        if (id === 'seed_selection' || id === 'haymaking') {
          original.sources.push('COLUMELLA');
        } else if (id === 'stone_sawing') {
          original.sources.push('RITTI_GREWE_KESSENER');
        }
        const fields = Object.keys(original).sort();
        if (JSON.stringify(fields) !== JSON.stringify(Object.keys(effective).sort()) ||
            fields.some(function (key) {
              return JSON.stringify(original[key]) !== JSON.stringify(effective[key]);
            })) changes.push(id);
      });
      const retained = ['manuring', 'water_lifting_devices',
        'undershot_watermill', 'irrigation_channels'].filter(function (id) {
        return JSON.stringify(FBDATA.tech[id]) !== JSON.stringify(window.__foundationBase[id]);
      });
      const scripts = Array.from(document.querySelectorAll('script[src]')).map(function (el) {
        return el.getAttribute('src');
      });
      return { changes:changes, retained:retained, evidence:evidence, costs:costs,
        owners:Object.keys(FBDATA.techCorrections_foundations).sort(),
        errors:FB.validateTechnologyData(),
        order:scripts.indexOf('data/technology_foundations.js') > scripts.indexOf('data/technology.js') &&
          scripts.indexOf('data/technology_foundations.js') < scripts.indexOf('data/bookmarks.js'),
        names:[FBDATA.tech.water_power.name, FBDATA.tech.powered_mills.name,
          FBDATA.tech.legume_rotation.name] };
    }, IDS);
    expect(result.changes).toEqual([]);
    expect(result.retained).toEqual([]);
    expect(result.owners).toEqual(IDS.slice().sort());
    expect(result.errors).toEqual([]);
    expect(result.order).toBe(true);
    expect(result.names).toEqual(['Water Power', 'Expanded Powered Milling', 'Organized Legume Rotation']);
    expect(result.evidence).toEqual({
      seed_selection:[1,900], haymaking:[1,900], stone_sawing:[200,1100],
      water_power:[100,700], powered_mills:[700,1200], legume_rotation:[950,1250],
      heavy_plough:[650,900], improved_husbandry:[900,1250], selective_stockbreeding:[1050,1300]
    });
    expect(result.costs).toEqual({
      seed_selection:50, haymaking:50, stone_sawing:50, water_power:20, powered_mills:50,
      legume_rotation:100, heavy_plough:50, improved_husbandry:100, selective_stockbreeding:150
    });
  });

test('ancient evidence changes soft research review while prerequisites and paid progress remain real',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const results = await page.evaluate(function () {
      const liveBefore = JSON.stringify(FB.state);
      const out = ['seed_selection', 'haymaking', 'stone_sawing'].map(function (id) {
        const state = JSON.parse(JSON.stringify(FB.state));
        const rid = Object.keys(state.realms).filter(function (key) {
          return key !== FB.techRealmId(state) && state.realms[key].alive && !state.realms[key].liege;
        })[0];
        const buildings = JSON.stringify(state.buildings);
        state.date.year = 476;
        state.realms[rid].techTraditions = ['byzantine'];
        state.realmTech[rid] = { completed:[], exposed:[], active:[], progress:{}, reserve:0, priorities:{} };
        const record = FB.realmTechRecord(state, rid);
        const beforeReject = JSON.stringify(record);
        const locked = FB.techCandidate(state, id, rid);
        const rejected = !FB.selectTechProject(state, id, rid, true);
        const pureReject = beforeReject === JSON.stringify(record);
        record.completed = ['scratch_plough', 'crop_rotation', 'iron_sickles',
          'quern_stones', 'water_power', 'lime_mortar'];
        const review = FB.techCandidate(state, id, rid);
        const current = FBDATA.tech[id];
        let oldCost;
        try {
          FBDATA.tech[id] = window.__foundationBase[id];
          oldCost = FB.techCostBreakdown(state, id, rid);
        } finally { FBDATA.tech[id] = current; }
        const selected = FB.selectTechProject(state, id, rid, true);
        const notFree = !FB.hasTech(state, id, rid);
        FB.addResearch(state, review.cost - 0.1, rid);
        const incomplete = !FB.hasTech(state, id, rid);
        FB.addResearch(state, 0.1, rid);
        return { id:id, locked:locked.reqLocked, rejected:rejected, pureReject:pureReject,
          available:review.available, phase:review.breakdown.phase, base:review.breakdown.base,
          cheaper:review.cost < oldCost.total, oldPhase:oldCost.phase,
          selected:selected, notFree:notFree, incomplete:incomplete,
          completed:FB.hasTech(state, id, rid), progress:record.progress[id], cost:review.cost,
          reserve:record.reserve, noPhysicalSeed:buildings === JSON.stringify(state.buildings) };
      });
      return { rows:out, liveUnchanged:liveBefore === JSON.stringify(FB.state) };
    });
    expect(results.liveUnchanged).toBe(true);
    for (const row of results.rows) {
      expect(row).toMatchObject({ locked:true, rejected:true, pureReject:true, available:true,
        phase:'attested', base:50, cheaper:true, oldPhase:'before_attestation',
        selected:true, notFree:true, incomplete:true, completed:true, noPhysicalSeed:true });
      expect(row.progress).toBe(row.cost);
      expect(row.reserve).toBeCloseTo(0, 8);
    }
  });

test('completed foundations retain their exact scalar bonuses and capability lists',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (ids) {
      const state = JSON.parse(JSON.stringify(FB.state));
      const rid = FB.techRealmId(state);
      state.realmTech[rid] = { completed:ids, exposed:ids, active:[], progress:{}, reserve:0, priorities:{} };
      return { tax:FB.techBonus(state, 'tax', rid), levy:FB.techBonus(state, 'levy', rid),
        capacity:FB.techBonus(state, 'populationCapacity', rid), dev:FB.techBonus(state, 'devCap', rid),
        build:FB.techCostFactor(state, 'build', rid), enterprise:FB.techCostFactor(state, 'enterprise', rid),
        capabilities:ids.reduce(function (all, id) { return all.concat(FBDATA.tech[id].capabilities); }, []) };
    }, IDS);
    expect(result.tax).toBeCloseTo(0.08, 8);
    expect(result.levy).toBeCloseTo(0.01, 8);
    expect(result.capacity).toBeCloseTo(0.08, 8);
    expect(result.dev).toBe(1);
    expect(result.build).toBeCloseTo(0.935, 8);
    expect(result.enterprise).toBeCloseTo(0.95, 8);
    expect(result.capabilities).toEqual([]);
  });

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' baseline keeps starting-knowledge closure and matching save knowledge',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      await page.evaluate(function (id) {
        FBDATA.bookmarks[id].revision = 'baseline';
        FB.startProgression.noteTier(1);
      }, bookmark);
      const fullStart = page.locator('#btn-choose-beginning');
      if (await fullStart.isVisible()) await fullStart.click();
      else await page.getByRole('button', { name:'New Game', exact:true }).click();
      await page.locator('#btn-bm-seed').click();
      await page.locator('#ng-seed').fill('FOUNDATIONS-' + bookmark + '-farmer-london-f-Ada');
      await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
      await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
      await page.getByRole('button', { name:'Begin', exact:true }).click();
      const result = await page.evaluate(function (ids) {
        FB.game.setPaused(true);
        const originals = {}, current = JSON.parse(JSON.stringify(FB.state));
        current.realmTech = {};
        FB.seedRealmTechnologies(current, true);
        const old = JSON.parse(JSON.stringify(FB.state));
        old.realmTech = {};
        try {
          ids.forEach(function (id) {
            originals[id] = FBDATA.tech[id];
            FBDATA.tech[id] = window.__foundationBase[id];
          });
          FB.seedRealmTechnologies(old, true);
        } finally {
          ids.forEach(function (id) { FBDATA.tech[id] = originals[id]; });
        }
        const mismatch = Object.keys(current.realmTech).filter(function (rid) {
          return ['completed', 'exposed'].some(function (key) {
            return JSON.stringify(current.realmTech[rid][key].slice().sort()) !==
              JSON.stringify(old.realmTech[rid][key].slice().sort());
          });
        });
        window.__foundationSavedKnowledge = JSON.stringify(FB.state.realmTech);
        return { mismatch:mismatch, realms:Object.keys(current.realmTech).length,
          revision:FB.campaignBookmark(FB.state).revision || 'baseline',
          text:FB.save.serialize() };
      }, IDS);
      expect(result.revision).toBe('baseline');
      expect(result.realms).toBeGreaterThan(10);
      expect(result.mismatch).toEqual([]);
      await page.evaluate(function (text) {
        window.__foundationRestored = false;
        const accepted = FB.game.loadData(JSON.parse(text), function () {
          FB.game.setPaused(true);
          window.__foundationRestored = true;
        });
        if (accepted === false) throw new Error('Matching foundation save was rejected.');
      }, result.text);
      await expect.poll(function () {
        return page.evaluate(function () { return window.__foundationRestored; });
      }).toBe(true);
      const knowledge = await page.evaluate(function () {
        return { saved:JSON.parse(window.__foundationSavedKnowledge), restored:FB.state.realmTech };
      });
      expect(knowledge.restored).toEqual(knowledge.saved);
    });
}
