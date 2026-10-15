'use strict';
const {test, expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/bookmarks.js','data/eras.js','data/cultures.js',
  'data/geographies.js','data/geography_expansion.js','data/political_institutions.js',
  'js/world.js','js/model.js','js/actions.js','js/religion.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js','js/governments.js']);

test('superseded faiths retain descendants, offices and relations but are not fresh targets',
  async function ({page}, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, copy = function (x) { return JSON.parse(JSON.stringify(x)); };
      const before = copy(FB.religionOf('catholic', null));
      const relation = FB.faithRelation(s,'catholic','orthodox');
      FBDATA.religions.e2e_latin = {name:'Revised Latin tradition',parent:'catholic',relationToParent:'in_fold'};
      FBDATA.religions.catholic = Object.assign({},FBDATA.religions.catholic,
        {legacy:true,supersededBy:'e2e_latin'});
      FB.invalidateReligionData();
      const after = FB.religionOf('catholic', null), child = FB.religionOf('e2e_latin', null);
      const errors = FB.validateBookmark(FBDATA.bookmarks['867']);
      const generated = {faiths:{e2e_child:{name:'Saved child',parent:'catholic',founderId:'past_founder'}}};
      const result = {
        retained:JSON.stringify(before.properties) === JSON.stringify(after.properties),
        office:JSON.stringify(before.head) === JSON.stringify(after.head),
        relation:relation === FB.faithRelation(s,'catholic','orthodox'),
        oldTarget:FB.faithAvailable('catholic',s),
        newTarget:FB.faithAvailable('catholic',null),
        childTarget:FB.faithAvailable('e2e_latin',null),
        childMetadata:child.legacy === false && child.supersededBy === undefined,
        listed:FB.religionIds(null,true).indexOf('catholic') >= 0,
        rejected:errors.some(function (e) { return e.indexOf('fresh revision names legacy faith catholic') >= 0; }),
        ancestry:FB.faithLineage('e2e_child',generated),
        descendantParent:FB.faithAvailable('catholic',generated),
        generatedOffice:FB.religionOf('e2e_child',generated).head
      };
      // Restore before save validation: metadata cannot invalidate the retained baseline.
      FBDATA.bookmarks['867'].revision = 'renewed';
      const realms = copy(FBDATA.bookmarks['867'].realms), provinces = copy(FBDATA.bookmarks['867'].provinces);
      function replace(row) {
        if (!row || typeof row !== 'object') return;
        Object.keys(row).forEach(function (key) {
          if (key === 'religion' && row[key] === 'catholic') row[key] = 'e2e_latin';
          else replace(row[key]);
        });
      }
      replace(realms); replace(provinces);
      FBDATA.bookmarks['867'].revisions = Object.assign({},FBDATA.bookmarks['867'].revisions,
        {renewed:{realms:realms,provinces:provinces}});
      result.retainedDefinition = !FB.validateBookmark(FB.bookmark('867','baseline')).some(function (e) {
        return e.indexOf('fresh revision names legacy faith') >= 0;
      });
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      result.restoredTarget = FB.faithAvailable('catholic',FB.state);
      return result;
    })).toEqual({retained:true,office:true,relation:true,oldTarget:true,newTarget:false,
      childTarget:true,childMetadata:true,listed:false,rejected:true,ancestry:['e2e_child','catholic','christian'],
      descendantParent:true,generatedOffice:null,retainedDefinition:true,restoredTarget:true});
  });

test('legacy metadata is validated without changing live data or random state', async function ({page}, testInfo) {
  await openGame(page, testInfo);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA.religions), rng = FB.getRngState(), uid = FB.getUidCounter();
    return [{legacy:'yes'}, {legacy:true}, {legacy:true,supersededBy:'missing'},
      {legacy:true,supersededBy:'e2e_old'}, {supersededBy:'catholic'}].map(function (metadata) {
      const row = Object.assign({name:'Invalid legacy',parent:'christian'},metadata);
      return FB.mods.validate({religions:{e2e_old:row}}).length > 0 &&
        before === JSON.stringify(FBDATA.religions) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual([true,true,true,true,true]);
});

test('baseline government assignments and authoritative stamps survive legacy migration under a new revision',
  async function ({page}, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {FBDATA.bookmarks['867'].revision='baseline';});
    await startDeterministicGame(page);
    const source = await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize());
      const root = FBDATA.bookmarks['867'];
      FBDATA.governmentForms.e2e_new_court = Object.assign({},FBDATA.governmentForms.territorial);
      FB.governments.invalidate();
      const realms = JSON.parse(JSON.stringify(root.realms));
      realms.forEach(function (r) { r.government = 'e2e_new_court'; });
      root.revision = 'renewed'; root.revisions = Object.assign({},root.revisions,{renewed:{realms:realms}});
      data.platformSchema = 1; delete data.state.start.revision;
      return JSON.stringify(data);
    });
    await restoreBookmark(page,source);
    expect(await page.evaluate(function () {
      const s = FB.state, exported = JSON.parse(FB.save.serialize());
      return {revision:s.start.revision,platform:exported.platformSchema,
        default:s.start.defaultGovernment,old:FB.governments.forRealm(s,'wessex').id,
        fresh:FB.bookmark('867').realms[0].government};
    })).toEqual({revision:'baseline',platform:2,default:'territorial',old:'territorial',fresh:'e2e_new_court'});
  });

test('a fresh revised campaign receives its declared form without rewriting the retained world',
  async function ({page}, testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function () {
      const root = FBDATA.bookmarks['867'];
      const realms = JSON.parse(JSON.stringify(root.realms));
      FBDATA.governmentForms.e2e_fresh_court = Object.assign({},FBDATA.governmentForms.territorial);
      FB.governments.invalidate();
      realms.forEach(function (r) { r.government = 'e2e_fresh_court'; });
      root.revision = 'new_courts'; root.revisions = {baseline:{},new_courts:{realms:realms}};
    });
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return {revision:FB.state.start.revision,form:FB.governments.forRealm(FB.state,'wessex').id,
        retained:FB.bookmark('867','baseline').realms.every(function (r) { return r.government !== 'e2e_fresh_court'; }),
        stamp:FB.state.start.defaultGovernment};
    })).toEqual({revision:'new_courts',form:'e2e_fresh_court',retained:true,stamp:'territorial'});
  });

test('unknown forms, strategies, revisions and plain-bookmark geography mismatches fail without adoption',
  async function ({page}, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const live = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      const original = JSON.parse(FB.save.serialize());
      const rejected = [function (s) { s.platformSchema = 99; },
        function (s) { s.state.start.revision = 'missing'; },
        function (s) { s.state.start.geography = 'europe_regional_2'; }].map(function (change) {
        const save = JSON.parse(JSON.stringify(original)); change(save);
        const before = JSON.stringify(save);
        return FB.game.loadData(save) === false && before === JSON.stringify(save);
      });
      const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['867']));
      b.realms[0].government = 'missing';
      const unknown = FB.mods.validate({bookmarks:{'867':b}}).length > 0;
      const bad = Object.assign({},FBDATA.governmentForms.territorial,{succession:'unregistered'});
      const strategy = FB.mods.validate({governmentForms:{e2e_bad:bad}}).length > 0;
      return {rejected:rejected,unknown:unknown,strategy:strategy,
        stable:live === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rejected:[true,true,true],unknown:true,strategy:true,stable:true});
  });

test('opening aliases select retained declarations and retirement cannot be cleared by a child geography',
  async function ({page}, testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['476']));
      b.revisions.e2e_alias = {opening:b.openingRevision}; b.revision = 'e2e_alias';
      const alias = FB.bookmarkRevisions('476',b).find(function (r) { return r.revision === 'e2e_alias'; });
      const same = JSON.stringify(alias.opening) === JSON.stringify(b.openingRevisions[b.openingRevision]);
      const before = JSON.stringify(FBDATA.geographies);
      const mod = {geographies:{e2e_retired:{extends:'europe_regional',retiredProvinceIds:['e2e_gone']},
        e2e_child:{extends:'e2e_retired',retiredProvinceIds:[],
          provinceAdditions:[{id:'e2e_gone',name:'Gone',x:9,y:28,terrain:'desert'}]}}};
      return {alias:same,retired:FB.mods.validate(mod).length > 0,
        unchanged:before === JSON.stringify(FBDATA.geographies)};
    })).toEqual({alias:true,retired:true,unchanged:true});
  });
