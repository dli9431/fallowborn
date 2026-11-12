'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const probe = require('../fixtures/residual-read-audit/probe');
const sources = probe.paths.map(function (file) { return fs.readFileSync(path.resolve(__dirname,'../../..',file),'utf8'); });

dependsOnRuntime(__filename, ['js/model.js','js/world.js','js/government_aristocracy.js','js/government_recognition.js',
  'js/government_selection.js','js/mobile_confederations.js','js/governments.js','js/government_support.js',
  'js/government_ecclesiastical.js','js/ecclesiastical_strategies.js','js/authority.js','js/actions.js',
  'js/treasury.js','js/lordships.js','js/main.js','js/politics.js','js/systems.js']);

const starts = [
  {bookmark:'476', scenario:'mobile_household_476', code:'MEASURE-476-mobile_household_476-cherson-m-Measure'},
  {bookmark:'476', scenario:'peroz_sasanian_476', code:'MEASURE-476-peroz_sasanian_476-baghdad-m-Peroz'},
  {bookmark:'1096', scenario:'yaghi_siyan_1096', code:'MEASURE-1096-yaghi_siyan_1096-antioch-m-YaghiSiyan'},
  {bookmark:'1096', scenario:'bohemond_1096', code:'MEASURE-1096-bohemond_1096-taranto-m-Bohemond'},
  {bookmark:'1204', scenario:'muhammad_1204', code:'MEASURE-1204-muhammad_1204-gurganj_district-m-Muhammad_II'}
];

async function route(page,enabled) {
  for (let i = 0; i < probe.paths.length; i++) {
    const file = probe.paths[i];
    await page.unroute('**/' + file);
    if (enabled) await page.route('**/' + file,function (request) {
      return request.fulfill({contentType:'application/javascript',body:probe.instrument(file,sources[i])});
    });
  }
}

async function begin(page,info,start) {
  await openGame(page,info);
  await page.evaluate(function (start) {
    const scenario = FBDATA.startScenarios.find(function (row) { return row.id === start.scenario; });
    if (!scenario) throw new Error('Missing audit start');
    scenario.hidden = false;
    const bookmark = [FB.bookmark(start.bookmark)].concat(FB.bookmarkRevisions(start.bookmark)).find(function (row) {
      return (!row.starts || row.starts.indexOf(start.scenario) >= 0) &&
        row.provinces.some(function (p) { return FB.startProvinceAllowed(scenario,row,p.id); });
    });
    if (!bookmark) throw new Error('No compatible audit opening');
    FBDATA.bookmarks[start.bookmark].hidden = false;
    FBDATA.bookmarks[start.bookmark].revision = bookmark.revision;
    FB.startProgression.noteTier(3);
  },start);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(start.code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    Object.assign(FB.game.auto,{minor:false,major:false,war:false,all:true,style:'first',hosts:'manual',
      hostResupply:true,buySupplies:true,forceSupplies:false,supplyTarget:75,build:false,research:false,researchMode:'cheapest'});
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

for (const start of starts) {
  test('read audit preserves ordinary and staged boundary outputs for ' + start.scenario, async function ({page},info) {
    const outputs = [], evidence = [];
    for (const enabled of [false,true]) {
      await route(page,enabled);
      await begin(page,info,start);
      if (enabled) await page.evaluate(probe.install);
      const result = await page.evaluate(async function () {
        async function hash(text) {
          const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
          return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2,'0'); }).join('');
        }
        const p = window.__residualReadAudit, states = [], counts = [];
        try {
          for (const phase of ['ordinary','season','year']) {
            const s = FB.state;
            if (phase !== 'ordinary') {
              const season = phase === 'year' ? 3 : s.date.season;
              s.turn += (season - s.date.season) * 90 + 90 - s.date.day;
              s.date.season = season; s.date.day = 90;
            }
            if (p) p.reset();
            const turn = s.turn;
            FB.game.passDay({deferUi:true});
            if (s.turn !== turn + 1) throw new Error('Unexpected audit advancement');
            if (p) counts.push({phase:phase,report:p.snapshot()});
            states.push({phase:phase, turn:s.turn, date:JSON.parse(JSON.stringify(s.date)), state:await hash(JSON.stringify(s)),
              save:await hash(FB.save.serialize()),data:await hash(JSON.stringify(FBDATA)),
              rng:FB.getRngState(),uid:FB.getUidCounter()});
          }
        } finally { if (p) p.stop(); }
        return {states:states,counts:counts,stopped:!window.__residualReadAudit};
      });
      expect(result.stopped).toBe(true);
      outputs.push(result.states); evidence.push(result.counts);
    }
    expect(outputs[1]).toEqual(outputs[0]);
    for (const row of evidence[1]) {
      expect(row.report.total.officeEntries).toBeGreaterThan(0);
      expect(row.report.total.mobileEntries).toBeGreaterThan(0);
    }
    await info.attach('read-audit-counts',{body:JSON.stringify({start:start,phases:evidence[1]}),contentType:'application/json'});
  });
}

test('read audit detects repeated index inputs, edits and cleanup without caching answers', async function ({page},info) {
  await route(page,true);
  await begin(page,info,starts[1]);
  await page.evaluate(probe.install);
  const result = await page.evaluate(function () {
    const s = FB.state, p = window.__residualReadAudit, A = FB.aristocracy;
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rid = Object.keys(s.authority.governments).find(function (id) { const row = A.state(s,id); return row && row.interests.length >= 2; });
    if (!rid) throw new Error('No indexed constituency');
    try {
      p.reset();
      p.query('control',s,function () { A.constituency(s,rid); A.constituency(s,rid); });
      const equal = p.snapshot();
      p.reset();
      const row = s.authority.rights[0], id = row.id;
      try {
        p.query('control',s,function () { A.constituency(s,rid); row.id = id + '_edited'; A.constituency(s,rid); });
      } finally { row.id = id; }
      const changed = p.snapshot();
      p.reset(); FB.religiousOffices(s); const office = p.snapshot();
      p.reset();
      p.query('control',s,function () { FB.realmIdForRulerCharacter(s,s.chars[s.player.charId]); FB.realmIdForRulerCharacter(s,s.chars[s.player.charId]); });
      const mobile = p.snapshot();
      p.reset();
      try { p.query('error-control',s,function () { throw new Error('audit-sentinel'); }); }
      catch (error) { if (error.message !== 'audit-sentinel') throw error; }
      const error = p.snapshot();
      return {equal:equal,changed:changed,office:office,mobile:mobile,error:error,
        pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally { p.stop(); }
  });
  expect(result.equal.scopes.control.equivalentIndexRepeats).toBe(1);
  expect(result.changed.scopes.control.equivalentIndexRepeats).toBe(0);
  expect(result.changed.scopes.control.changedIndexInputs).toBe(1);
  expect(result.office.total.officeWorldReads).toBe(2);
  expect(result.office.total.officeWorldRepeats).toBe(1);
  expect(result.mobile.scopes.control.repeatedCharacterQueries).toBeGreaterThan(0);
  expect(result.error.scopes['error-control'].errors).toBe(1);
  expect(result.pure).toBe(true);
  expect(await page.evaluate(function () { return !window.__residualReadAudit; })).toBe(true);
  await info.attach('read-audit-controls',{body:JSON.stringify(result),contentType:'application/json'});
});
