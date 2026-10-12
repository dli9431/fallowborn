'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/cultures.js','data/bookmarks.js','data/bookmark_476.js',
  'data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js','data/bookmark_493_world.js',
  'data/bookmark_711.js','data/bookmark_711_terrain.js','data/bookmark_800_expansion.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js','data/bookmark_1204_terrain.js',
  'data/government_rollout.js','data/technology.js','js/model.js','js/world.js','js/actions.js',
  'js/religion.js','js/population.js','js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/ui_modals.js']);

test('the existing catalogue declares local availability without changing released effective rules',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ids = FB.religionIds(null,false);
      const results = ids.every(function (id) {
        const availability = FB.faithAvailability(id,null);
        availability.yearMin = 9999; // Returned metadata is detached.
        return FBDATA.religions[id].availability !== undefined &&
          FB.faithAvailability(id,null).yearMin !== 9999 &&
          FB.religionOf(id,null).properties.availability === undefined;
      });
      return {complete:ids.length === Object.keys(FBDATA.religions).length,declared:results,errors:FB.validateReligionData(null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({complete:true,declared:true,errors:[],pure:true});
  });

test('all fresh worlds validate, with distinct original and wider 476 and dated Islamic targets',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const dates = ['476','493','711','800','867','1066','1204'];
      const rng = FB.getRngState(), uid = FB.getUidCounter(), before = JSON.stringify(FBDATA);
      const errors = dates.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); });
      const allowed = dates.map(function (id) {
        return ['sunni','shia','ashari','maturidi'].map(function (faith) {
          return FB.faithHistoricalAvailable(faith,FB.bookmark(id),'community');
        });
      });
      const base = FB.bookmark('476','baseline'), wider = FB.bookmark('476');
      return {errors:errors,allowed:allowed,distinct:base.revision !== wider.revision,
        original:FB.validateBookmark(base),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({errors:[[],[],[],[],[],[],[]],
      allowed:[[false,false,false,false],[false,false,false,false],[true,true,false,false],
        [true,true,false,false],[true,true,false,false],[true,true,true,true],[true,true,true,true]],
      distinct:true,original:[],pure:true});
  });

test('dated consumer rejection covers communities, rulers, courts, openings, institutions and beginnings',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const original = FB.bookmark('476');
      function rejects(change) {
        const b = JSON.parse(JSON.stringify(original));
        change(b);
        return FB.validateBookmark(b).some(function (error) {
          return error.indexOf('unavailable for this dated consumer') >= 0;
        });
      }
      const results = [
        rejects(function (b) { b.provinces.find(function (p) { return !p.wasteland; }).religion = 'sunni'; }),
        rejects(function (b) { b.provinces.find(function (p) { return p.communities && p.communities.length; }).communities[0].religion = 'ashari'; }),
        rejects(function (b) { b.realms[0].religion = 'shia'; }),
        rejects(function (b) { b.realms[0].royalCourt = {members:[{id:'e2e_court',religion:'maturidi'}]}; }),
        rejects(function (b) { b.opening.actors.e2e_future = {name:'Future',religion:'ashari'}; }),
        rejects(function (b) { const id = Object.keys(b.localInstitutions)[0]; b.localInstitutions[id].religion = 'sunni'; })
      ];
      const scenario = FBDATA.startScenarios.find(function (s) {
        return s.startReligion && (!s.bookmarkIds || s.bookmarkIds.indexOf('476') >= 0) &&
          (!s.eras || s.eras.indexOf(original.era) >= 0) && (!original.starts || original.starts.indexOf(s.id) >= 0);
      });
      const old = scenario.startReligion;
      try { scenario.startReligion = 'ashari'; results.push(rejects(function () {})); }
      finally { scenario.startReligion = old; }
      return {rejected:results,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rejected:[true,true,true,true,true,true,true],pure:true});
  });

test('two independent fictional profiles enter through the public stored JSON mod path',
  async function ({page},testInfo) {
    const mod = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/religion-coverage-mod.json'),'utf8'));
    await openGame(page,testInfo);
    expect(await page.evaluate(function (mod) {
      const errors = FB.mods.validate(mod);
      if (!errors.length) localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
      return errors;
    },mod)).toEqual([]);
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const early = 'e2e_river_observance', late = 'e2e_city_teaching';
      const a = JSON.parse(JSON.stringify(FB.bookmark('476'))), b = JSON.parse(JSON.stringify(FB.bookmark('1066')));
      function minority(bookmark, pid, faith) {
        const p = bookmark.provinces.find(function (row) { return row.id === pid; });
        p.communities = p.communities || [{culture:p.culture,religion:p.religion,populationShare0:10000}];
        p.communities[0].populationShare0 -= 1000;
        p.communities.push({culture:p.culture,religion:faith,populationShare0:1000,paired:true});
      }
      minority(a,'candia',early); minority(b,'london',late);
      function atYear(id, year) {
        return FB.faithHistoricalAvailable(id,Object.assign({},a,{date:{year:year,season:0,day:1}}),'community');
      }
      return {early476:FB.faithHistoricalAvailable(early,FB.bookmark('476'),'community'),
        early493:FB.faithHistoricalAvailable(early,FB.bookmark('493'),'character'),
        early711:FB.faithHistoricalAvailable(early,FB.bookmark('711'),'community'),
        earlyOffice:FB.faithHistoricalAvailable(early,FB.bookmark('476'),'institution'),
        late867:FB.faithHistoricalAvailable(late,FB.bookmark('867'),'community'),
        late1066:FB.faithHistoricalAvailable(late,FB.bookmark('1066'),'institution'),
        late1204:FB.faithHistoricalAvailable(late,FB.bookmark('1204'),'community'),
        independentAssignments:[FB.validateBookmark(a),FB.validateBookmark(b)],
        boundaries:[atYear(early,475),atYear(early,476),atYear(early,620),atYear(early,621),
          atYear(late,999),atYear(late,1000),atYear(late,1250),atYear(late,1251)],
        roles:[FB.religionOf(early,null).roles.priestM,FB.religionOf(late,null).roles.priestM],
        headless:FB.faithOfficeId(early,null) === null && FB.faithOfficeId(late,null) === null};
    })).toEqual({early476:true,early493:true,early711:false,earlyOffice:false,
      late867:false,late1066:true,late1204:true,independentAssignments:[[],[]],
      boundaries:[false,true,true,false,false,true,true,false],roles:['Keeper','Teacher'],headless:true});
    await startDeterministicGame(page);
    const saved = await page.evaluate(function () { return FB.save.serialize(); });
    await openGame(page,testInfo);
    await restoreBookmark(page,saved);
    expect(await page.evaluate(function (saved) {
      return JSON.parse(FB.save.serialize()).mods === JSON.parse(saved).mods &&
        FB.religionOf('e2e_city_teaching',FB.state).roles.priestM === 'Teacher';
    },saved)).toBe(true);
  });

test('fresh head assignments apply the same period gate to faith and office keys',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const id = 'e2e_future_head', office = 'e2e_future_head_office';
      FBDATA.religions[id] = {name:'Future head',parent:'jewish',availability:{yearMin:900},
        properties:{head:{officeId:office,title:'Guide',realm:null}}};
      FB.invalidateReligionData();
      let rejected;
      try {
        rejected = [id,office].map(function (key) {
          const b = JSON.parse(JSON.stringify(FB.bookmark('476')));
          b.religiousHeads[key] = b.realms[0].id;
          return FB.validateBookmark(b).some(function (error) {
            return error.indexOf('religious head ' + key) >= 0 &&
              error.indexOf('unavailable for this dated consumer') >= 0;
          });
        });
      } finally {
        delete FBDATA.religions[id];
        FB.invalidateReligionData();
      }
      return {rejected:rejected,pure:before === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rejected:[true,true],pure:true});
  });

test('availability validation rejects malformed dates, selectors and references without mutation',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const bad = [null,[],{yearMin:'900'},{yearMin:900.5},{yearMin:1000,yearMax:900},
        {eras:['missing']},{bookmarkIds:['missing']},{consumers:['affiliation']},
        {consumers:['community','community']},{affiliations:['missing']}];
      const errors = bad.map(function (availability) {
        return FB.mods.validate({religions:{e2e_invalid:{name:'Invalid',parent:'christian',availability:availability}}}).length > 0;
      });
      errors.push(FB.mods.validate({religions:{e2e_orphan:{name:'Orphan',parent:'missing'}}}).length > 0);
      errors.push(FB.mods.validate({religions:{e2e_nested:{name:'Nested',parent:'christian',properties:{availability:{yearMin:900}}}}}).length > 0);
      return {errors:errors,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({errors:Array(12).fill(true),pure:true});
  });

test('a future scripted definition does not establish a faith before its live date',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, root = FBDATA.bookmarks[s.start.id];
      const revision = root.revisions ? root.revisions[s.start.revision] : root;
      const owned = Object.prototype.hasOwnProperty.call(revision,'scripted'), prior = revision.scripted;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      revision.scripted = (FB.campaignBookmark(s).scripted || []).concat([
        {year:900,newRealm:{id:'e2e_future_court',religion:'ashari'}}]);
      let result;
      try {
        const future = Object.assign({},FB.campaignBookmark(s),{date:{year:900,season:0,day:1}});
        result = {future:FB.faithHistoricalAvailable('ashari',future,'ruler'),
          now:FB.faithAvailable('ashari',s),listed:FB.religionIds(s,true).indexOf('ashari') >= 0,
          pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      } finally {
        if (owned) revision.scripted = prior; else delete revision.scripted;
      }
      return result;
    })).toEqual({future:true,now:false,listed:false,pure:true});
  });

test('era, bookmark and empty selectors are local to their own historical profile',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const parent = 'e2e_scoped_parent', child = 'e2e_unrestricted_child';
      const scope = {eras:['high_medieval'],bookmarkIds:['1066'],consumers:['community']};
      FBDATA.religions[parent] = {name:'Scoped tradition',parent:'christian',availability:scope};
      FBDATA.religions[child] = {name:'Independent branch',parent:parent};
      FB.invalidateReligionData();
      let result;
      try {
        const b = FB.bookmark('1066');
        result = {matches:FB.faithHistoricalAvailable(parent,b,'community'),
          wrongBookmark:FB.faithHistoricalAvailable(parent,FB.bookmark('1204'),'community'),
          wrongEra:FB.faithHistoricalAvailable(parent,Object.assign({},b,{era:'late_antique'}),'community'),
          wrongConsumer:FB.faithHistoricalAvailable(parent,b,'ruler'),
          child:FB.faithHistoricalAvailable(child,FB.bookmark('867'),'conversion'),
          childMetadata:FB.faithAvailability(child,null)};
        result.empty = ['eras','bookmarkIds','consumers'].map(function (field) {
          FBDATA.religions[parent].availability = Object.assign({},scope,{[field]:[]});
          FB.invalidateReligionData();
          return FB.faithHistoricalAvailable(parent,b,'community');
        });
      } finally {
        delete FBDATA.religions[parent]; delete FBDATA.religions[child];
        FB.invalidateReligionData();
      }
      result.pure = before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
      return result;
    })).toEqual({matches:true,wrongBookmark:false,wrongEra:false,wrongConsumer:false,
      child:true,childMetadata:{},empty:[false,false,false],pure:true});
  });

test('project and official-faith consumer rules agree with the canonical action gates',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, project = 'e2e_project_only', lay = 'e2e_lay_only';
      FBDATA.religions[project] = {name:'Community project tradition',parent:'christian',
        availability:{consumers:['community','project']}};
      FBDATA.religions[lay] = {name:'Lay tradition',parent:'christian',
        availability:{consumers:['community','character','conversion']}};
      FBDATA.rulerFaithTargets.push(lay);
      FB.invalidateReligionData();
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {projectList:FB.religionIds(s,true,'project').indexOf(project) >= 0,
        personalList:FB.religionIds(s,true).indexOf(project) >= 0,
        projectPreview:!!FB.countyCommunityProjectPreview(s,s.player.provinceId,{kind:'faith',target:project,policy:'voluntary'}),
        personalTarget:FB.faithAvailable(lay,s),officialTarget:FB.faithAvailable(lay,s,'ruler'),
        medievalTarget:FB.conversionStatus(s,'faith',lay,'realm').targetValid,
        publicTarget:FB.rulerFaithConversionStatus(s,'byzantium',lay).targetValid,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({projectList:true,personalList:false,projectPreview:true,personalTarget:true,
      officialTarget:false,medievalTarget:false,publicTarget:false,pure:true});
  });

test('failed generated definitions and unavailable project targets leave serials, resources and communities intact',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const pid = s.player.provinceId;
      const failures = [FB.createFaith(s,{name:'Orphan',parent:'missing'}),
        FB.createFaith(s,{name:'Future',parent:'christian',availability:{yearMin:1200}}),
        FB.createFaith(s,{name:'Unknown affiliation',availability:{affiliations:['missing']}}),
        FB.countyCommunityProjectPreview(s,pid,{kind:'faith',target:'ashari',policy:'voluntary'}),
        FB.startCountyCommunityProject(s,pid,{kind:'faith',target:'ashari',policy:'voluntary'}),
        FB.startSettlementCommunityProject(s,pid,0,{kind:'faith',target:'maturidi',policy:'voluntary'})];
      return {rejected:failures.every(function (value) { return value === null; }),
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rejected:true,pure:true});
  });

test('saved generated ancestry, directional relations, offices and mixed projects survive later catalogue dates',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    const source = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      const id = FB.createFaith(s,{id:'e2e_saved_branch',name:'Saved branch',parent:'catholic',
        relationToParent:{childView:'in_fold',parentView:'schismatic'},founderId:s.player.charId,
        properties:{head:{},clergyMarriage:true}});
      if (!id) throw new Error('Faith creation failed.');
      s.faithRelations[id] = {orthodox:'in_fold'};
      const transfer = FB.convertCountyCommunity(s,pid,{kind:'faith',target:id,amount:100});
      if (!transfer || transfer.count !== 100 || FB.countyCommunities(s,pid).length < 2)
        throw new Error('Mixed community setup failed.');
      if (!FB.startCountyCommunityProject(s,pid,{kind:'faith',target:id,sponsor:'player',policy:'voluntary'}))
        throw new Error('Project creation failed.');
      const project = s.population.counties[pid].communityProjects.faith;
      project.progress = 0.25;
      const before = {communities:FB.countyCommunities(s,pid),project:FB.countyCommunityProject(s,pid,'faith'),
        lineage:FB.faithLineage(id,s),office:FB.faithOfficeId(id,s),properties:FB.religionOf(id,s).properties,
        heads:JSON.parse(JSON.stringify(s.religiousHeads)),stories:JSON.parse(JSON.stringify(s.stories || {})),start:JSON.parse(JSON.stringify(s.start))};
      return {saved:FB.save.serialize(),before:before,pid:pid};
    });
    await openGame(page,testInfo);
    await restoreBookmark(page,source.saved);
    expect(await page.evaluate(function (input) {
      const s = FB.state, id = 'e2e_saved_branch';
      const restored = {communities:FB.countyCommunities(s,input.pid),project:FB.countyCommunityProject(s,input.pid,'faith'),
        lineage:FB.faithLineage(id,s),office:FB.faithOfficeId(id,s),properties:FB.religionOf(id,s).properties,
        heads:JSON.parse(JSON.stringify(s.religiousHeads)),stories:JSON.parse(JSON.stringify(s.stories || {})),start:JSON.parse(JSON.stringify(s.start))};
      FBDATA.religions.catholic.availability = {yearMin:1200};
      FB.invalidateReligionData();
      return {restored:restored,relation:FB.faithRelation(s,id,'orthodox'),
        parentRetained:FB.faithAvailable('catholic',s),branchRetained:FB.faithAvailable(id,s)};
    },source)).toEqual({restored:source.before,relation:'in_fold',parentRetained:true,branchRetained:true});
  });

test('expired profiles preserve an ongoing project without manufacturing followers or advancement',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId, id = 'e2e_short_lived';
      FBDATA.religions[id] = {name:'Early community',parent:'christian',availability:{yearMax:867}};
      FB.invalidateReligionData();
      const communities = JSON.stringify(FB.countyCommunities(s,pid));
      const project = FB.startCountyCommunityProject(s,pid,{kind:'faith',target:id,sponsor:'player',policy:'voluntary'});
      if (!project) throw new Error('Project creation failed.');
      s.date.year = 868;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {exists:FB.faithAssignable(id,s),survives:FB.faithAvailable(id,s,'project'),
        preview:!!FB.countyCommunityProjectPreview(s,pid,{kind:'faith',target:id,policy:'voluntary'}),
        unchanged:JSON.stringify(FB.countyCommunities(s,pid)) === communities &&
          JSON.stringify(FB.countyCommunityProject(s,pid,'faith')) === JSON.stringify(project),
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({exists:true,survives:true,preview:true,unchanged:true,pure:true});
  });
