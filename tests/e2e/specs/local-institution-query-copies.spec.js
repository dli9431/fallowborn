'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { beginBookmark, beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startHistoricalGame } = require('../support/game/historical-start');

dependsOnRuntime(__filename, ['js/institutions.js','js/religious_institutions.js',
  'js/religious_activities.js','js/model.js','js/world.js','js/systems.js','js/authority.js',
  'js/politics.js','js/treasury.js','js/save.js','js/save_v4.js','js/mods.js',
  'data/political_institutions.js','data/bookmark_476.js','data/bookmark_1096.js',
  'data/bookmark_1204.js','data/distribution_crazygames.js']);

const fixture = path.resolve(__dirname, '../fixtures/local-institution-query-copies');
const reference = fs.readFileSync(path.join(fixture, 'season-reference.txt'), 'utf8');
const source = fs.readFileSync(path.resolve(__dirname, '../../../js/institutions.js'), 'utf8');
async function routeProbe(page) {
  const marker = '/* Site institutions share';
  const offset = source.indexOf(marker);
  expect(offset).toBeGreaterThan(0);
  const tail = source.slice(offset).replace('function copy(value) { return JSON.parse(JSON.stringify(value)); }',
    'function copy(value) { if (window.localInstitutionCopyProbe) window.localInstitutionCopyProbe(); return JSON.parse(JSON.stringify(value)); }');
  const body = (source.slice(0, offset) + tail).replace('  FB.validateLocalInstitutionState =',
    reference.replace('FB.localInstitutionsSeason =', 'FB.referenceLocalInstitutionsSeason =') + '\n  FB.validateLocalInstitutionState =');
  await page.route('**/js/institutions.js', function (route) {
    return route.fulfill({contentType:'application/javascript', body:body});
  });
}
async function inject(page) { await page.addScriptTag({path:path.join(fixture, 'probe.js')}); }

for (const bookmark of ['476','1096','1204']) {
  test('season guards preserve complete state and actual boundary copies in ' + bookmark, async function ({page}, info) {
    await routeProbe(page); await beginBookmark(page, info, bookmark); await inject(page);
    const rows = await page.evaluate(function () {
      const H = INSTITUTION_COPIES, base = H.copy(FB.state), rows = [];
      [0,89,90,91,179,180,360].forEach(function (turn) {
        const s = H.copy(base); H.stageTurn(s, turn);
        if (turn === 91 || turn === 179) s.localInstitutionPeriod = 1;
        else delete s.localInstitutionPeriod;
        rows.push({turn:turn, result:H.pair(s)});
      });
      return rows;
    });
    for (const row of rows) {
      const r = row.result;
      expect(r.reference.lists).toBeGreaterThan(0);
      if ([0,89,91,179].includes(row.turn)) {
        expect(r.candidate.lists).toBe(0); expect(r.candidate.copies).toBe(0);
        expect(r.reference.lists).toBe(1);
        expect(r.reference.copies).toBe(2 * r.reference.items[0]);
      } else {
        expect(r.candidate).toEqual(r.reference);
        expect(r.period).toBe(Math.floor(row.turn / 90));
        expect(r.candidate.lists).toBeGreaterThanOrEqual(2);
      }
    }
    if (bookmark === '476') expect(rows.find(function (r) { return r.turn === 90; }).result.settlements).toBeGreaterThan(0);
    await info.attach('institution-copy-counts', {body:Buffer.from(JSON.stringify(rows,null,2)),contentType:'application/json'});
    console.log('Institution copies ' + bookmark + ': ' + JSON.stringify(rows));
  });
}

test('empty and absent rosters retain callback order and do not stamp an unsettled period', async function ({page}, info) {
  await routeProbe(page); await beginBookmark(page, info, '476'); await inject(page);
  const results = await page.evaluate(function () {
    const H = INSTITUTION_COPIES, base = H.copy(FB.state), results = [];
    ['absent','empty','remove','create'].forEach(function (kind) {
      const s = H.copy(base); H.stageTurn(s, 90); delete s.localInstitutionPeriod;
      if (kind === 'absent') delete s.localInstitutions;
      if (kind === 'empty') s.localInstitutions = {};
      // Stub callbacks only for these guard-order cases. The create callback
      // replaces an empty ledger; the remove callback removes a real ledger.
      results.push({kind:kind, result:H.pair(s,{callbacks:kind})});
    });
    return results;
  });
  for (const row of results) {
    expect(row.result.candidate).toEqual(row.result.reference);
    if (row.kind === 'absent' || row.kind === 'remove') expect(row.result.candidate.lists).toBe(0);
    if (row.kind === 'empty') expect(row.result.candidate.lists).toBe(1);
    expect(row.result.period).toBe(row.kind === 'create' ? 1 : undefined);
  }
});

test('same-period additions, definition replacement, detached lists and restore stay live', async function ({page}, info) {
  await routeProbe(page); await beginBookmark(page, info, '476'); await inject(page);
  const result = await page.evaluate(function () {
    const H = INSTITUTION_COPIES, s = FB.state, defs = FB.localInstitutionDefinitions(s);
    const returned = FB.localInstitutionList(s);
    const item = returned.find(function (item) { return item.def.kind === 'council'; });
    if (!item) throw new Error('A civic institution is required');
    const data = JSON.stringify(FBDATA), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    item.def.city = 'Changed'; item.record.history.push({changed:true}); item.record.standing.detached = 99;
    returned.length = 0;
    const fresh = FB.localInstitutionList(s).find(function (r) { return r.id === item.id; });
    const detached = fresh.def.city !== 'Changed' && !fresh.record.standing.detached &&
      before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    H.stageTurn(s, 91); s.localInstitutionPeriod = 1;
    defs.query_copy_council = H.copy(defs[item.id]);
    const catalogueOnly = H.pair(s);
    const absent = !FB.localInstitutionList(FB.state).some(function (r) { return r.id === 'query_copy_council'; });
    s.localInstitutions.query_copy_council = H.copy(s.localInstitutions[item.id]);
    s.localInstitutions.query_copy_council.id = 'query_copy_council';
    const added = H.pair(s);
    const visible = FB.localInstitutionList(FB.state).some(function (r) { return r.id === 'query_copy_council'; });
    defs.query_copy_council = Object.assign({}, defs.query_copy_council, {city:'Replacement'});
    const replaced = FB.localInstitutionList(FB.state).find(function (r) { return r.id === 'query_copy_council'; }).def.city;
    const skipped = H.pair(FB.state);
    H.stageTurn(FB.state, 180);
    const boundary = H.pair(FB.state);
    const newStanding = Object.keys(FB.state.localInstitutions.query_copy_council.standing).length;
    // Remove the synthetic row before real save restoration; the supported
    // catalogue and all ordinary institution records remain unchanged.
    delete defs.query_copy_council; delete FB.state.localInstitutions.query_copy_council;
    const envelope = JSON.parse(FB.save.serialize()); FB.save.restore(envelope);
    const restored = H.pair(FB.state);
    H.stageTurn(FB.state, 270); const next = H.pair(FB.state);
    return {detached:detached,absent:absent,catalogueOnly:catalogueOnly,visible:visible,replaced:replaced,added:added,skipped:skipped,
      boundary:boundary,newStanding:newStanding,restored:restored,next:next};
  });
  expect(result).toMatchObject({detached:true,absent:true,visible:true,replaced:'Replacement'});
  for (const key of ['catalogueOnly','added','skipped','restored']) expect(result[key].candidate.lists).toBe(0);
  expect(result.boundary.candidate).toEqual(result.boundary.reference);
  expect(result.newStanding).toBeGreaterThan(0);
  expect(result.next.candidate).toEqual(result.next.reference);
});

test('CrazyGames preserves boundary settlement and skipped-day copies', async function ({page}, info) {
  await routeProbe(page);
  await startHistoricalGame(page, info, {bookmark:'476',code:'INSTITUTIONS-476-farmer_476-roma-m-Leo-established'}, true);
  await inject(page);
  const rows = await page.evaluate(function () {
    const H = INSTITUTION_COPIES, s = FB.state;
    H.stageTurn(s, 90); const boundary = H.pair(s);
    H.stageTurn(FB.state, 91); const skipped = H.pair(FB.state);
    return {boundary:boundary,skipped:skipped};
  });
  expect(rows.boundary.candidate).toEqual(rows.boundary.reference);
  expect(rows.boundary.period).toBe(1);
  expect(rows.skipped.candidate.lists).toBe(0); expect(rows.skipped.candidate.copies).toBe(0);
});

const officeMod = require('../fixtures/political-religious-head/estuary.json');
function institutionMod(replacement) {
  const mod = JSON.parse(JSON.stringify(officeMod));
  mod.name = 'Institution query example';
  const def = mod.bookmarks.paired_office_world.localInstitutions.river_council_demo;
  def.city = replacement ? 'River Port' : 'River Village';
  if (replacement) def.representative.skills.mar = 11;
  return mod;
}
async function importMod(page, mod) {
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'institution-queries.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}
async function modFacts(page) {
  await beginBookmarkFromTitle(page, 'paired_office_world', 'estuary_household_demo'); await inject(page);
  return page.evaluate(function () {
    const H = INSTITUTION_COPIES, s = FB.state;
    const city = FB.localInstitutionList(s).find(function (r) { return r.id === 'river_council_demo'; }).def.city;
    H.stageTurn(s, 90); const boundary = H.pair(s);
    const envelope = JSON.parse(FB.save.serialize()); FB.save.restore(envelope);
    const skipped = H.pair(FB.state);
    H.stageTurn(FB.state, 180); const next = H.pair(FB.state);
    return {city:city,boundary:boundary,skipped:skipped,next:next,count:FB.mods.count(),
      signature:FB.mods.sig(),matching:!FB.save.otherWorld(envelope)};
  });
}
function expectModFacts(facts, city) {
  expect(facts).toMatchObject({city:city,count:1,matching:true});
  expect(facts.boundary.candidate).toEqual(facts.boundary.reference);
  expect(facts.boundary.period).toBe(1);
  expect(facts.skipped.candidate.lists).toBe(0); expect(facts.skipped.candidate.copies).toBe(0);
  expect(facts.next.candidate).toEqual(facts.next.reference);
  expect(facts.next.period).toBe(2);
}

test('ordinary JSON institution import and replacement retain current boundary outcomes and restore', async function ({page}, info) {
  await routeProbe(page); await openGame(page, info);
  await importMod(page, institutionMod(false));
  const first = await modFacts(page); expectModFacts(first, 'River Village');
  await importMod(page, institutionMod(true));
  const second = await modFacts(page); expectModFacts(second, 'River Port');
  expect(second.signature).not.toBe(first.signature);
});

test('ordinary JSON institution removal restores live unmodded queries', async function ({page}, info) {
  await routeProbe(page); await openGame(page, info);
  await importMod(page, institutionMod(false)); expectModFacts(await modFacts(page), 'River Village');
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(function () { FB.mods.removeAt(0); })]);
  await prepareGameContent(page); await beginBookmarkFromTitle(page, '476'); await inject(page);
  const result = await page.evaluate(function () {
    const s = FB.state; INSTITUTION_COPIES.stageTurn(s, 90);
    return {count:FB.mods.count(),signature:FB.mods.sig(),
      absent:!FB.localInstitutionDefinitions(s).river_council_demo,pair:INSTITUTION_COPIES.pair(s)};
  });
  expect(result).toMatchObject({count:0,signature:'',absent:true});
  expect(result.pair.candidate).toEqual(result.pair.reference);
});
