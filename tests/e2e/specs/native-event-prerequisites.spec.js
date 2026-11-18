'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openTitle,openGame,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {expectModAdmission} = require('../support/game/mod-admission');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {routeEagerDocument,gameRoot} = require('../fixtures/bookmark-manifest/eager-document');
const fictional = require('../fixtures/authoring/office-mandates-lantern.json');

dependsOnRuntime(__filename,['js/bookmark_sources.js','js/story_track.js','js/authority.js',
  'js/government_administration.js','js/mods.js','data/events_common.js','data/events_493.js',
  'data/events_568.js','data/events_634.js','data/events_711.js','data/events_800.js',
  'data/events_1096.js','data/events_1204.js','data/events_1241.js','data/bookmark_manifest.js',
  'data/story_households_568_ravenna.js','data/starts_568_ravenna.js']);
test.describe.configure({mode:'parallel'});

async function load(page,ids) {
  await page.evaluate(function (ids) {
    return new Promise(function (resolve,reject) {
      FB.bookmarkSources.loadDates(ids,function (error) {if (error) reject(error); else resolve();});
    });
  },ids);
}
async function catalogue(page) {
  return page.evaluate(function () {
    return {events:FBDATA.events.map(function (row) {return row.id;}),
      packs:Object.keys(FBDATA.eventPacks),chances:Object.keys(FBDATA.eventChances),
      signature:FB.mods.fingerprint([FBDATA.events,FBDATA.eventPacks,FBDATA.eventChances]),
      faults:FB.bookmarkSources.manifestReport().publicFaults};
  });
}

for (const order of [['800','711'],['711','800']]) test('dated declarations retain eager order after loading ' + order.join(' then '),async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  const context = await browser.newContext(), eager = await context.newPage();
  try {
    await routeEagerDocument(eager);await openTitle(eager,info);await prepareGameContent(eager);
    const expected = await catalogue(eager);
    await openTitle(page,info);
    expect(await page.evaluate(function () {
      const selected = FB.bookmarkSources.prepareSetup('867');
      if (!selected.published) throw new Error(selected.worldFaults.join(' '));
      return FB.eventById('aachen_report_800');
    })).toBeNull();
    for (const id of order) await load(page,[id]);
    await prepareGameContent(page);
    expect(await page.evaluate(function () {return !!FB.eventById('aachen_report_800');})).toBe(true);
    const actual = await catalogue(page);
    expect(actual).toEqual(expected);
    expect(new Set(actual.events).size).toBe(actual.events.length);
    expect(actual.events.filter(function (id) {return /_711$/.test(id);}).length).toBeGreaterThanOrEqual(12);
    const before = await catalogue(page);
    await load(page,order);expect(await catalogue(page)).toEqual(before);
  } finally {await context.close();}
});

test('native optional story reviews validate without installing their graphs into another selected date',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  const file = 'data/events_568.js', source = fs.readFileSync(path.join(gameRoot,file),'utf8');
  const declaration = {
    id:'source_household_review',pack:'dated_568',title:'Household supplies',text:'Review the household account.',weight:1,
    trigger:{state:[{reader:'active_story_stage',args:{storyId:'ravenna_household_track_568',stage:'supplies'}}]},
    options:[{label:'Review supplies',review:{type:'story_choice',args:{storyId:'ravenna_household_track_568',choiceId:'buy_supplies'},refusalOption:1}},
      {label:'Keep current plans',effects:{}}]
  };
  const at = source.lastIndexOf('\n}, {');
  expect(at).toBeGreaterThan(0);
  await page.route('**/' + file + '*',function (route) {
    return route.fulfill({contentType:'application/javascript',body:source.slice(0,at) +
      '\nFBDATA.events.push(' + JSON.stringify(declaration) + ');' + source.slice(at)});
  });
  await openTitle(page,info);await load(page,['568']);
  const selected = await page.evaluate(function () {
    const report = FB.bookmarkSources.prepareSetup('476');
    return {ready:report.published,faults:report.worldFaults,indexed:!!FB.eventById('source_household_review'),
      optional:!!FBDATA.storyInstances.ravenna_household_track_568};
  });
  expect(selected).toEqual({ready:true,faults:[],indexed:true,optional:false});
  await prepareGameContent(page);
  const result = await page.evaluate(function () {
    const event = FB.eventById('source_household_review');
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const valid = FB.validateEventStateConditions(event,{data:FBDATA});
    const faults = ['absent_story','ravenna_household_track_568'].map(function (id) {
      const changed = JSON.parse(JSON.stringify(event));
      changed.id += '_' + id;
      if (id === 'absent_story') changed.options[0].review.args.storyId = id;
      else changed.options[0].review.args.choiceId = 'absent_choice';
      return FB.mods.validate({name:'Invalid optional review',events:[changed]}).length > 0;
    });
    return {valid:valid,rejected:faults,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({valid:[],rejected:[true,true],pure:true});
});

for (const imported of [false,true]) test((imported ? 'ordinary JSON public' : 'native Roman') + ' court availability shares the canonical system gate without allocating state',async function ({page},info) {
  if (imported) {
    await openGame(page,info);await page.evaluate(function () {FB.ui.showMods();});
    await expectModAdmission(page,fictional);
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/office-mandates-lantern.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);await beginBookmarkFromTitle(page,'mandate_coast','mandate_household');
  } else await startHistoricalGame(page,info,{bookmark:'476',code:'GATE-476-court_service_household_476-split-m-Officer'});
  const result = await page.evaluate(function (imported) {
    const s = FB.state, rid = imported ? 'ridge_court' : 'croatia';
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const enabled = FB.courtOfficeSystemEnabled(s,rid), missing = FB.courtOfficeSystemEnabled(s,'absent_court');
    const system = imported ? 'public_offices' : 'roman_offices', raw = FBDATA.bookmarks[s.start.id], old = raw.systems;
    raw.systems = Object.assign({},old);raw.systems[system] = false;
    const disabled = FB.courtOfficeSystemEnabled(s,rid);raw.systems = old;
    return {enabled:enabled,missing:missing,disabled:disabled,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },imported);
  expect(result).toEqual({enabled:true,missing:false,disabled:false,pure:true});
});
