'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html', 'data/technology.js', 'data/technology_foundations.js',
  'data/technology_learning.js', 'data/technology_civic_military.js',
  'data/technology_maritime.js', 'data/technology_wind.js', 'data/technology_transmission.js',
  'data/cultures.js', 'data/eras.js', 'data/bookmarks.js', 'data/bookmark_867_expansion.js',
  'data/bookmark_1066_inhabited.js', 'data/map_data.js', 'data/buildings_learning_care.js',
  'js/technology.js', 'js/world.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js', 'js/main.js'
]);

test.beforeEach(async function ({ page }) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    Object.defineProperty(FBDATA, 'techCorrections_transmission', {
      configurable:true,
      set:function (value) {
        // Observe the committed catalogue through the real index, before the
        // final supplement. Reconstruct only the three earlier changed pairs.
        const prior = JSON.parse(JSON.stringify(this.tech));
        prior.paper_scholarship.history.adoption.islamic = [760,1010];
        prior.paper_scholarship.history.adoption.persianate = [770,1020];
        prior.capitularies.history.adoption.latin = [710,870];
        window.__transmissionPrior = prior;
        Object.defineProperty(this, 'techCorrections_transmission', {
          configurable:true, enumerable:true, writable:true, value:value
        });
      }
    });
  });
});

async function seed(page, input) {
  return page.evaluate(function (config) {
    const current = FBDATA.tech;
    const state = { start:{era:'early_medieval'}, date:{year:config.year,season:0,day:1},
      realms:{transmission_review:{alive:true,liege:null,techTraditions:config.traditions,
        techSeed:config.exceptions || {}}}, realmTech:{} };
    try {
      if (config.prior) FBDATA.tech = window.__transmissionPrior;
      FB.seedRealmTechnologies(state,true);
      const r = state.realmTech.transmission_review, windows = {};
      ['paper_making','paper_scholarship','capitularies'].forEach(function (id) {
        windows[id] = FB.techHistoricalWindow(state,id,'transmission_review');
      });
      return {completed:r.completed.slice().sort(),exposed:r.exposed.slice().sort(),windows:windows};
    } finally { FBDATA.tech = current; }
  },input);
}

async function startCampaign(page, bookmark, revision) {
  await page.evaluate(function (input) {
    if (input.revision) FBDATA.bookmarks[input.bookmark].revision = input.revision;
    FB.startProgression.noteTier(3);
  },{bookmark:bookmark,revision:revision});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('TRANSMISSION-'+bookmark+'-farmer-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('only five adoption pairs change across the complete existing catalogue', async function ({ page }, info) {
  await openGame(page,info);
  const r = await page.evaluate(function () {
    const expected = JSON.parse(JSON.stringify(window.__transmissionPrior));
    expected.paper_making.history.adoption.persianate = [650,800];
    expected.paper_making.history.adoption.islamic = [750,950];
    expected.paper_scholarship.history.adoption.islamic = [800,1000];
    expected.paper_scholarship.history.adoption.persianate = [800,1000];
    expected.capitularies.history.adoption.latin = [700,800];
    Object.keys(expected).forEach(function (id) { FB.normalizeTechDefinition(id,expected[id]); });
    const before = JSON.stringify(FBDATA.tech), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateTechnologyData(true), owners = {};
    Object.keys(FBDATA).filter(function (key) { return key.indexOf('techCorrections_') === 0; })
      .forEach(function (key) { Object.keys(FBDATA[key]).forEach(function (id) {
        (owners[id] || (owners[id] = [])).push(key);
      }); });
    return {expected:expected,actual:FBDATA.tech,errors:errors,
      pure:before === JSON.stringify(FBDATA.tech) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      owners:['paper_making','paper_scholarship','capitularies'].map(function (id) { return owners[id]; }),
      sources:Array.from(document.scripts).map(function (el) { return el.getAttribute('src'); }).filter(Boolean)};
  });
  expect(Object.keys(r.actual)).toHaveLength(187);
  expect(r.actual).toEqual(r.expected); expect(r.errors).toEqual([]); expect(r.pure).toBe(true);
  expect(r.owners).toEqual([['techCorrections_transmission'],['techCorrections_learning'],['techCorrections_civic_military']]);
  expect(r.sources.filter(function (s) { return s === 'data/technology_transmission.js'; })).toHaveLength(1);
  expect(r.sources.indexOf('data/technology_transmission.js')).toBeGreaterThan(r.sources.indexOf('data/technology_wind.js'));
  expect(r.sources.indexOf('data/technology_transmission.js')).toBeLessThan(r.sources.indexOf('data/bookmarks.js'));
});

test('regional emergence and completion use inclusive boundaries without advancing time', async function ({ page }, info) {
  await openGame(page,info);
  for (const sample of [
    {id:'paper_making',tradition:'persianate',from:650,to:800},
    {id:'paper_making',tradition:'islamic',from:750,to:950},
    {id:'paper_scholarship',tradition:'persianate',from:800,to:1000},
    {id:'paper_scholarship',tradition:'islamic',from:800,to:1000},
    {id:'capitularies',tradition:'latin',from:700,to:800}
  ]) {
    for (const year of Array.from(new Set([sample.from-1,sample.from,sample.to-1,sample.to,866,867,939,940]))) {
      const r = await seed(page,{year:year,traditions:[sample.tradition]});
      expect(r.exposed.includes(sample.id),sample.id+' exposed at '+year).toBe(year >= sample.from);
      expect(r.completed.includes(sample.id),sample.id+' complete at '+year).toBe(year >= sample.to);
    }
  }
});

test('mixed traditions select one whole pair and omissions still block prerequisite closure', async function ({ page }, info) {
  await openGame(page,info);
  const mixed = await seed(page,{year:800,traditions:['islamic','persianate']});
  const reverse = await seed(page,{year:800,traditions:['persianate','islamic']});
  expect(mixed.windows.paper_making).toMatchObject({emergence:650,widespread:800,tradition:'persianate'});
  expect(mixed.windows.paper_scholarship).toMatchObject({emergence:800,widespread:1000});
  expect(mixed.completed).toEqual(reverse.completed); expect(mixed.exposed).toEqual(reverse.exposed);
  const omitted = await seed(page,{year:1066,traditions:['persianate'],
    exceptions:{complete:['paper_scholarship'],omit:['paper_making']}});
  expect(omitted.completed).not.toContain('paper_making');
  expect(omitted.completed).not.toContain('paper_scholarship');
  expect(omitted.completed).toContain('scriptoria');
});

for (const year of [867,1066]) {
  test(year+' changes only the approved existing completion sets for every tradition', async function ({ page }, info) {
    await openGame(page,info);
    const traditions = await page.evaluate(function () { return Object.keys(FBDATA.techTraditions); });
    for (const tradition of traditions) {
      const old = await seed(page,{year:year,traditions:[tradition],prior:true});
      const current = await seed(page,{year:year,traditions:[tradition]});
      const added = year === 867 && tradition === 'persianate' ? ['paper_making']
        : year === 867 && tradition === 'latin' ? ['capitularies'] : [];
      expect(current.completed.filter(function (id) { return !old.completed.includes(id); }),tradition).toEqual(added);
      expect(old.completed.filter(function (id) { return !current.completed.includes(id); }),tradition).toEqual([]);
      expect(current.exposed,tradition).toEqual(old.exposed);
    }
  });
}

for (const bookmark of ['867','1066']) for (const revision of ['baseline',null]) {
  test(bookmark+' '+(revision || 'current')+' retains partial research and property under the corrected catalogue',
    async function ({ page }, info) {
      await openGame(page,info);
      await startCampaign(page,bookmark,revision);
      const before = await page.evaluate(function () {
        const s = FB.state, rec = FB.realmTechRecord(s), pid = s.player.provinceId;
        rec.completed = ['manuscript_codex']; rec.exposed = ['manuscript_codex','paper_making','paper_scholarship'];
        rec.active = ['paper_making']; rec.progress = {paper_making:7.5,paper_scholarship:11};
        rec.reserve = 3; rec.historicalSeeded = 1;
        s.buildings[pid] = [{s:0,id:'library'},{s:0,id:'temple',ruined:true}];
        FB.invalidateBuildingIndex(s,pid); FB.invalidateTechBonuses();
        return {record:rec,assets:s.buildings,revision:s.start.revision,save:FB.save.serialize()};
      });
      await restoreBookmark(page,before.save);
      const after = await page.evaluate(function () {
        return {record:FB.realmTechRecord(FB.state),assets:FB.state.buildings,revision:FB.state.start.revision};
      });
      expect(after).toEqual({record:before.record,assets:before.assets,revision:before.revision});
    });
}

for (const sample of [
  {file:'transmission-paper.json',year:900,traditions:['islamic','persianate'],paper:true,
    window:{emergence:680,widespread:820,tradition:'persianate'},tie:'islamic'},
  {file:'transmission-orders.json',year:900,traditions:['islamic','persianate'],paper:false,
    window:{emergence:750,widespread:1000,tradition:'islamic'},tie:null}
]) {
  test(sample.file+' imports its own schedule and preserves partial knowledge on matching restore', async function ({ page }, info) {
    await openGame(page,info); await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+sample.file));
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
    await startCampaign(page,'867');
    const r = await seed(page,{year:sample.year,traditions:sample.traditions});
    expect(r.windows.paper_making).toMatchObject(sample.window);
    expect(r.completed.includes('paper_making')).toBe(sample.paper);
    if (sample.tie) expect(r.windows.paper_scholarship).toMatchObject({emergence:850,widespread:1010,tradition:sample.tie});
    else {
      const early = await seed(page,{year:867,traditions:['latin']});
      const later = await seed(page,{year:880,traditions:['latin']});
      expect(early.completed).not.toContain('capitularies'); expect(later.completed).toContain('capitularies');
    }
    const before = await page.evaluate(function () {
      const s = FB.state, rec = FB.realmTechRecord(s);
      rec.completed = ['manuscript_codex']; rec.exposed = ['manuscript_codex','paper_making'];
      rec.active = ['paper_making']; rec.progress = {paper_making:9}; rec.reserve = 2; rec.historicalSeeded = 1;
      return {record:rec,assets:s.buildings,save:FB.save.serialize()};
    });
    await restoreBookmark(page,before.save);
    expect(await page.evaluate(function () { return {record:FB.realmTechRecord(FB.state),assets:FB.state.buildings}; }))
      .toEqual({record:before.record,assets:before.assets});
    const pure = await page.evaluate(function () {
      const mod = {tech:{paper_making:JSON.parse(JSON.stringify(FBDATA.tech.paper_making))}};
      mod.tech.paper_making.history.adoption.default = [1000,900];
      const before = JSON.stringify([FBDATA.tech,FB.state]), world = FB.world;
      const rng = FB.getRngState(), uid = FB.getUidCounter(), source = JSON.stringify(mod);
      const errors = FB.mods.validate(mod);
      return errors.length > 0 && source === JSON.stringify(mod) && world === FB.world &&
        before === JSON.stringify([FBDATA.tech,FB.state]) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    expect(pure).toBe(true);
  });
}
