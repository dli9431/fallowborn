'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/revision-start-tracks-harbor.json'),
  dune:require('../fixtures/authoring/revision-start-tracks-dune.json')};

dependsOnRuntime(__filename,['index.html','js/starts.js','js/world.js','js/mods.js','js/main.js',
  'js/model.js','js/stories.js','js/crazygames.js','data/starts.js','data/bookmarks.js',
  'data/eras.js','data/bookmark_493.js','data/bookmark_493_world.js',
  'data/mobile_confederations.js','js/bookmark_setup.js','js/story_government_selection.js',
  'js/story_opening_goals.js','js/story_expedition_preparation.js','js/story_expedition_participation.js',
  'js/story_household_party.js','js/household_party_camp.js','js/mobile_confederations.js',
  'js/mobile_command.js','js/treasury.js','js/authority.js','js/save.js','js/save_v4.js',
  'js/ui_misc.js','js/ui_modals.js']);

for (const crazy of [false,true]) {
  test('start selector validity stays separate from matching on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      const result = await page.evaluate(function () {
        const bookmark = Object.assign({},FB.bookmark('493'),{starts:undefined});
        const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world, active = FB.activeBookmark;
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        function report(fields, changes) {
          return FB.startSelectorReport(Object.assign({id:'selector_probe'},fields),
            Object.assign({},bookmark,changes));
        }
        const reports = [
          report({}),
          report({bookmarkIds:['493'],eras:['late_antique']}),
          report({bookmarkIds:[]}),
          report({eras:[]}),
          report({bookmarkIds:['867']}),
          report({eras:['early_medieval']}),
          report({}, {starts:[]}),
          report({}, {starts:['selector_other']}),
          report({}, {starts:['selector_probe']}),
          report({bookmarkIds:null}),
          report({bookmarkIds:'493'}),
          report({bookmarkIds:['493','493']}),
          report({bookmarkIds:['selector_missing_bookmark']}),
          report({bookmarkIds:['493','selector_missing_bookmark']}),
          report({bookmarkIds:['constructor']}),
          report({eras:null}),
          report({eras:['late_antique','late_antique']}),
          report({eras:['late_antique','selector_missing_era']}),
          report({bookmarkIds:[17,'']}),
          FB.startSelectorReport(null,bookmark)
        ];
        return {reports:reports,unchanged:before === JSON.stringify(FBDATA) && state === FB.state &&
          world === FB.world && active === FB.activeBookmark && rng === FB.getRngState() && uid === FB.getUidCounter()};
      });
      expect(result).toEqual({reports:[
        {matches:true,valid:true,faults:[]},
        {matches:true,valid:true,faults:[]},
        {matches:false,valid:true,faults:[]},
        {matches:false,valid:true,faults:[]},
        {matches:false,valid:true,faults:[]},
        {matches:false,valid:true,faults:[]},
        {matches:false,valid:true,faults:[]},
        {matches:false,valid:true,faults:[]},
        {matches:true,valid:true,faults:[]},
        {matches:false,valid:false,faults:['start selector_probe.bookmarkIds: must be a list.']},
        {matches:false,valid:false,faults:['start selector_probe.bookmarkIds: must be a list.']},
        {matches:true,valid:false,faults:['start selector_probe.bookmarkIds: invalid or duplicate id 493.']},
        {matches:false,valid:false,faults:['start selector_probe: unknown bookmark selector_missing_bookmark.']},
        {matches:true,valid:false,faults:['start selector_probe: unknown bookmark selector_missing_bookmark.']},
        {matches:false,valid:false,faults:['start selector_probe: unknown bookmark constructor.']},
        {matches:false,valid:false,faults:['start selector_probe.eras: must be a list.']},
        {matches:true,valid:false,faults:['start selector_probe.eras: invalid or duplicate id late_antique.']},
        {matches:true,valid:false,faults:['start selector_probe: unknown era selector_missing_era.']},
        {matches:false,valid:false,faults:['start selector_probe.bookmarkIds: invalid or duplicate id 17.',
          'start selector_probe.bookmarkIds: invalid or duplicate id .']},
        {matches:false,valid:false,faults:['Start definition is missing or has no id.']}
      ],unchanged:true});
    });
}

test('strict bookmark validation retains selector faults and applicable-start diagnostics',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world;
    const rng = FB.getRngState(), uid = FB.getUidCounter(), original = FBDATA.startScenarios;
    const scenario = Object.assign({},original.find(function (row) { return row.id === 'farmer_493'; }),
      {id:'selector_probe',bookmarkIds:['493','selector_missing_bookmark'],
        requirements:{provinces:['selector_missing_province']}});
    let faults, excluded;
    try {
      FBDATA.startScenarios = original.concat([scenario]);
      faults = ['493','867'].map(function (id) {
        return FB.validateBookmark(FB.bookmark(id)).filter(function (line) { return line.indexOf('start selector_probe:') >= 0; });
      });
      scenario.bookmarkIds = ['867'];
      excluded = FB.validateBookmark(Object.assign({},FB.bookmark('493'),{starts:['selector_probe']}))
        .filter(function (line) { return line.indexOf('start selector_probe:') >= 0; });
    } finally { FBDATA.startScenarios = original; }
    return {faults:faults,excluded:excluded,unchanged:before === JSON.stringify(FBDATA) && state === FB.state &&
      world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({faults:[[
    'Bookmark 493: start selector_probe: unknown bookmark selector_missing_bookmark.',
    'Bookmark 493: start selector_probe: unknown provinces requirement selector_missing_province.'
  ],['Bookmark 867: start selector_probe: unknown bookmark selector_missing_bookmark.']],
    excluded:['Bookmark 493: start selector_probe: cannot apply to this bookmark.'],unchanged:true});
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' selector reports resolve detached and imported revision declarations',async function ({page},info) {
    await openGame(page,info);
    const candidate = await page.evaluate(function (input) {
      const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world;
      const rng = FB.getRngState(), uid = FB.getUidCounter(), id = input.prefix + '_world';
      const mod = input.mod, scenario = mod.startScenarios[0];
      const catalogs = {bookmarks:Object.assign({},FBDATA.bookmarks,mod.bookmarks),eras:FBDATA.eras};
      const reports = FB.bookmarkRevisions(id,mod.bookmarks[id]).map(function (bookmark) {
        return FB.startSelectorReport(scenario,bookmark,FB.bookmarkEra(bookmark),catalogs);
      });
      const bad = ['null','duplicate','unknown'].map(function (kind) {
        const altered = JSON.parse(JSON.stringify(mod)), start = altered.startScenarios[0];
        if (kind === 'null') start.bookmarkIds = null;
        if (kind === 'duplicate') start.bookmarkIds.push(start.bookmarkIds[0]);
        if (kind === 'unknown') start.bookmarkIds.push('selector_missing_bookmark');
        return FB.mods.validate(altered).length > 0;
      });
      return {registered:!!FBDATA.bookmarks[id],reports:reports,modFaults:FB.mods.validate(mod),rejected:bad,
        unchanged:before === JSON.stringify(FBDATA) && state === FB.state && world === FB.world &&
          rng === FB.getRngState() && uid === FB.getUidCounter()};
    },{prefix:prefix,mod:examples[prefix]});
    expect(candidate).toEqual({registered:false,reports:[{matches:true,valid:true,faults:[]},
      {matches:true,valid:true,faults:[]}],modFaults:[],rejected:[true,true,true],unchanged:true});
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
      '../fixtures/authoring/revision-start-tracks-' + prefix + '.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await page.waitForFunction(function (prefix) {
      return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
    },prefix);
    expect(await page.evaluate(function (prefix) {
      const scenario = FBDATA.startScenarios.find(function (row) { return row.id === prefix + '_household'; });
      return FB.bookmarkRevisions(prefix + '_world').map(function (bookmark) {
        return {revision:bookmark.revision,report:FB.startSelectorReport(scenario,bookmark),
          excluded:FB.startSelectorReport(scenario,Object.assign({},bookmark,{starts:[]}))};
      });
    },prefix)).toEqual(['baseline','expanded'].map(function (revision) {
      return {revision:revision,report:{matches:true,valid:true,faults:[]},excluded:{matches:false,valid:true,faults:[]}};
    }));
  });
}
