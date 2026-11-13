'use strict';
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const probe = require('../fixtures/religious-office-tables/lookup-probe');
const structure = require('../fixtures/office-lookup-probe/structure');
const source = fs.readFileSync(path.resolve(__dirname, '../../../js/model.js'), 'utf8');
const instrumented = structure.instrument(probe.instrument(source));

dependsOnRuntime(__filename, ['js/model.js', 'js/ecclesiastical_strategies.js',
  'js/government_ecclesiastical.js', 'js/authority.js', 'js/religious_institutions.js',
  'js/papacy.js', 'js/world.js', 'js/systems.js', 'js/religion.js', 'js/main.js',
  'js/mods.js', 'js/save.js', 'js/save_v4.js']);

const starts = [
  {bookmark:'476', scenario:'mobile_household_476', code:'MEASURE-476-mobile_household_476-cherson-m-Measure'},
  {bookmark:'476', scenario:'peroz_sasanian_476', code:'MEASURE-476-peroz_sasanian_476-baghdad-m-Peroz'},
  {bookmark:'1096', scenario:'yaghi_siyan_1096', code:'MEASURE-1096-yaghi_siyan_1096-antioch-m-YaghiSiyan'},
  {bookmark:'1096', scenario:'bohemond_1096', code:'MEASURE-1096-bohemond_1096-taranto-m-Bohemond'},
  {bookmark:'1204', scenario:'muhammad_1204', code:'MEASURE-1204-muhammad_1204-gurganj_district-m-Muhammad_II'}
];

async function begin(page, info, start) {
  await openGame(page, info);
  await page.evaluate(function (start) {
    const scenario = FBDATA.startScenarios.find(function (row) { return row.id === start.scenario; });
    if (!scenario) throw new Error('Missing probe start');
    scenario.hidden = false;
    const candidates = [FB.bookmark(start.bookmark)].concat(FB.bookmarkRevisions(start.bookmark));
    const bookmark = candidates.find(function (row) {
      return (!row.starts || row.starts.indexOf(start.scenario) >= 0) &&
        row.provinces.some(function (p) { return FB.startProvinceAllowed(scenario, row, p.id); });
    });
    if (!bookmark) throw new Error('No compatible probe opening');
    FBDATA.bookmarks[start.bookmark].hidden = false;
    FBDATA.bookmarks[start.bookmark].revision = bookmark.revision;
    FB.startProgression.noteTier(3);
  }, start);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', {name:'New Game', exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(start.code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
  await page.getByRole('button', {name:'Begin', exact:true}).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    Object.assign(FB.game.auto, {minor:false, major:false, war:false, all:true, style:'first',
      hosts:'manual', hostResupply:true, buySupplies:true, forceSupplies:false,
      supplyTarget:75, build:false, research:false, researchMode:'cheapest'});
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

for (const start of starts) {
  test('office lookup diagnostics preserve ordinary and boundary days for ' + start.scenario, async function ({page}, info) {
    if (start === starts[0]) console.log('OFFICE_LOOKUP_ENVIRONMENT ' + JSON.stringify({
      node:process.version, platform:process.platform, playwright:require('@playwright/test/package.json').version,
      browser:page.context().browser().version(), modelSha256:require('crypto').createHash('sha256').update(source).digest('hex')
    }));
    const parity = [], evidence = [];
    for (const enabled of [false, true]) {
      await page.unroute('**/js/model.js');
      if (enabled) await page.route('**/js/model.js', function (route) {
        return route.fulfill({contentType:'application/javascript', body:instrumented});
      });
      await begin(page, info, start);
      if (enabled) await page.evaluate(probe.install);
      if (enabled) await page.evaluate(structure.install);
      const result = await page.evaluate(async function (enabled) {
        async function digest(text) {
          const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
          return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
        }
        const out = [], readings = [], p = window.__officeLookupProbe, scans = window.__officeStructureProbe;
        function facts() {
          const s = FB.state, bookmark = FB.campaignBookmark(s), local = FB.localInstitutionDefinitions(s);
          return {start:s.start, characters:Object.keys(s.chars).length, realms:Object.keys(s.realms).length,
            governments:Object.keys(s.authority && s.authority.governments || {}).length,
            appointments:(s.authority && s.authority.appointments || []).length,
            rights:(s.authority && s.authority.rights || []).length,
            recognitions:(s.authority && s.authority.recognitions || []).length,
            institutions:Object.keys(s.localInstitutions || {}).length, localDefinitions:Object.keys(local).length,
            openingRealms:(bookmark.realms || []).length, openingProvinces:(bookmark.provinces || []).length,
            openingHeadKeys:Object.keys(bookmark.religiousHeads || {}).length,
            signature:FB.mods.sig(), fingerprint:FB.mods.fingerprint(bookmark)};
        }
        try {
          for (const phase of ['ordinary', 'season', 'year']) {
            const s = FB.state;
            if (phase !== 'ordinary') {
              const targetSeason = phase === 'year' ? 3 : s.date.season;
              s.turn += (targetSeason - s.date.season) * 90 + 90 - s.date.day;
              s.date.season = targetSeason; s.date.day = 90;
            }
            const workloadBefore = facts();
            if (p) p.reset();
            if (scans) scans.reset();
            const before = {turn:s.turn, date:JSON.parse(JSON.stringify(s.date))};
            FB.game.passDay({deferUi:true});
            if (p) readings.push({phase:phase, counts:p.snapshot(), scans:scans.snapshot()});
            const offices = FB.religiousOffices(s), holders = {};
            Object.keys(offices).forEach(function (id) {
              const holder = FB.religiousOfficeSnapshot(s, id, offices);
              holders[id] = holder && holder.id || null;
            });
            out.push({phase:phase, before:before, turn:s.turn, date:JSON.parse(JSON.stringify(s.date)),
              state:await digest(JSON.stringify(s)), save:await digest(FB.save.serialize()),
              data:await digest(JSON.stringify(FBDATA)), rng:FB.getRngState(), uid:FB.getUidCounter(),
              offices:await digest(JSON.stringify(offices)), holders:await digest(JSON.stringify(holders)),
              officeCount:Object.keys(offices).length, workloadBefore:workloadBefore, workloadAfter:facts()});
          }
        } finally { if (p) p.stop(); if (scans) scans.stop(); }
        return {parity:out, evidence:readings, stopped:!window.__officeLookupProbe && !window.__officeStructureProbe};
      }, enabled);
      expect(result.stopped).toBe(true);
      parity.push(result.parity); evidence.push(result.evidence);
    }
    expect(parity[1]).toEqual(parity[0]);
    for (const phase of parity[1]) expect(phase.turn, phase.phase).toBe(phase.before.turn + 1);
    for (const phase of evidence[1]) {
      expect(phase.counts.keyBuilds).toBe(phase.counts.hits + phase.counts.misses);
      expect(phase.counts.keyBuilds).toBeGreaterThan(0);
      expect(phase.scans.comparisons).toBeGreaterThan(0);
      expect(phase.scans.localComparisonRows).toBeGreaterThan(0);
      expect(phase.scans.headKeyArrays).toBeGreaterThan(0);
      expect(phase.scans.localComparisonRows).toBeLessThanOrEqual(phase.counts.localRows);
      expect(phase.scans.realmComparisonRows + phase.scans.provinceComparisonRows).toBeLessThanOrEqual(phase.counts.faithRows);
      expect(phase.scans.tableBuilds).toBe(phase.counts.misses);
      expect(phase.counts.inputRecords + phase.counts.reusedInputRecords).toBe(phase.counts.keyBuilds);
      expect(phase.counts.tableComparisons + phase.counts.reusedInputRecords).toBe(phase.counts.keyBuilds);
      if (source.indexOf('    if (inputs === old) return old.table;') >= 0) {
        expect(phase.counts.reusedInputRecords).toBeGreaterThan(0);
        expect(phase.counts.inputRecords).toBeLessThan(phase.counts.keyBuilds);
      }
    }
    console.log('OFFICE_LOOKUP_FACTS ' + JSON.stringify({start:start.scenario, phases:parity[1]}));
    console.log('OFFICE_LOOKUP_PROBE ' + JSON.stringify({start:start.scenario, code:start.code, phases:evidence[1]}));
    await info.attach('office-lookup-counts', {body:JSON.stringify({start:start, phases:evidence[1]}), contentType:'application/json'});
  });
}

test('office lookup probe distinguishes equal inputs, edits and scope cleanup', async function ({page}, info) {
  await page.route('**/js/model.js', function (route) {
    return route.fulfill({contentType:'application/javascript', body:probe.instrument(source)});
  });
  await begin(page, info, starts[2]);
  await page.evaluate(probe.install);
  const result = await page.evaluate(function () {
    const s = FB.state, p = window.__officeLookupProbe;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    try {
      p.reset();
      p.measure('control', function () { FB.religiousOffices(s); FB.religiousOffices(s); });
      const equal = p.snapshot();
      p.reset();
      const local = FB.localInstitutionDefinitions(s), id = Object.keys(local).find(function (id) { return !!local[id].officeId; });
      const row = local[id], old = row.officeId;
      try {
        p.measure('control', function () {
          FB.religiousOffices(s); row.officeId = old + '_changed'; FB.religiousOffices(s);
        });
      } finally { row.officeId = old; }
      const edited = p.snapshot();
      p.reset();
      const detached = JSON.parse(JSON.stringify(s));
      p.measure('control', function () { FB.religiousOffices(s); FB.religiousOffices(detached); });
      const states = p.snapshot();
      p.reset();
      const installed = FBDATA;
      try {
        p.measure('control', function () {
          FB.religiousOffices(s); window.FBDATA = Object.assign({}, installed); FB.religiousOffices(s);
        });
      } finally { window.FBDATA = installed; }
      const catalogues = p.snapshot();
      p.reset();
      try { p.measure('control', function () { throw new Error('probe-sentinel'); }); }
      catch (error) { if (error.message !== 'probe-sentinel') throw error; }
      const cleanup = p.snapshot();
      return {equal:equal, edited:edited, states:states, catalogues:catalogues, cleanup:cleanup,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally { p.stop(); }
  });
  expect(result.equal.byKind.control.repeatedEquivalentDirectBuilds).toBe(1);
  expect(result.equal.byKind.control.queriesWithChangedDirectInputs).toBe(0);
  expect(result.edited.byKind.control.repeatedEquivalentDirectBuilds).toBe(0);
  expect(result.edited.byKind.control.queriesWithChangedDirectInputs).toBe(1);
  expect(result.states.byKind.control.queriesWithChangedDirectInputs).toBe(1);
  expect(result.catalogues.byKind.control.queriesWithChangedDirectInputs).toBe(1);
  expect(result.cleanup.byKind.control.errors).toBe(1);
  expect(result.pure).toBe(true);
  expect(await page.evaluate(function () { return !window.__officeLookupProbe; })).toBe(true);
});

test('office structure counters distinguish full comparisons, early rejection and live holders', async function ({page}, info) {
  await page.route('**/js/model.js', function (route) {
    return route.fulfill({contentType:'application/javascript', body:instrumented});
  });
  await begin(page, info, starts[2]);
  await page.evaluate(structure.install);
  const result = await page.evaluate(function () {
    const s = FB.state, p = window.__officeStructureProbe;
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const local = FB.localInstitutionDefinitions(s), bookmark = FB.campaignBookmark(s);
    const id = Object.keys(local)[0], row = local[id], saved = row.officeId;
    try {
      FB.religiousOffices(s);
      p.reset(); FB.religiousOffices(s); const warm = p.snapshot();
      p.reset();
      try { row.officeId = saved + '_counter_edit'; FB.religiousOffices(s); }
      finally { if (saved === undefined) delete row.officeId; else row.officeId = saved; }
      const edit = p.snapshot();
      const restored = FB.religiousOffices(s);
      const officeId = Object.keys(restored).find(function (id) { return !!FB.religiousOfficeSnapshot(s, id, restored); });
      if (!officeId) throw new Error('Missing live holder for structure control');
      p.reset(); FB.religiousOfficeSnapshot(s, officeId, restored); const live = p.snapshot();
      const holder = s.religiousHeads[officeId];
      let absent;
      try { s.religiousHeads[officeId] = null; absent = FB.religiousOfficeSnapshot(s, officeId, restored); }
      finally { s.religiousHeads[officeId] = holder; }
      return {warm:warm, edit:edit, live:live, absent:absent,
        localRows:Object.keys(local).length, realmRows:(bookmark.realms || []).length,
        provinceRows:(bookmark.provinces || []).length,
        pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally { p.stop(); }
  });
  expect(result.warm.comparisons).toBe(1);
  expect(result.warm.localComparisonRows).toBe(result.localRows);
  expect(result.warm.realmComparisonRows).toBe(result.realmRows);
  expect(result.warm.provinceComparisonRows).toBe(result.provinceRows);
  expect(result.warm.headKeyArrays).toBe(1);
  expect(result.warm.tableBuilds).toBe(0);
  expect(result.edit.localComparisonRows).toBe(1);
  expect(result.edit.realmComparisonRows + result.edit.provinceComparisonRows).toBe(0);
  expect(result.edit.headKeyArrays).toBe(0);
  expect(result.edit.serializedLocalRows).toBe(result.localRows);
  expect(result.edit.tableBuilds).toBe(1);
  expect(result.live.holderEvaluations).toBeGreaterThan(0);
  expect(result.absent).toBe(null);
  expect(result.pure).toBe(true);
  await info.attach('office-structure-control', {body:JSON.stringify(result), contentType:'application/json'});
});
