'use strict';
const fs = require('fs');
const path = require('path');
const nativeSourceFiles = require('../../fixtures/bookmark-composition/native-before-shared/sources.json');
const {routeEagerDocument} = require('../../fixtures/bookmark-manifest/eager-document');
const {expect} = require('../fixture');
const corrections = require('../../fixtures/634-scenery-revisions/merged-corrections.json');
const fixtureRoot = path.resolve(__dirname,'../../fixtures/bookmark-composition/native-before-shared');
const gameRoot = path.resolve(__dirname,'../../../..');
const contributionRoot = path.resolve(__dirname,'../../fixtures/bookmark-composition/native-later-contributions');
// The shared list comes first, then every directory file in filename order.
const laterContributions = fs.readdirSync(contributionRoot)
  .filter(function (name) { return name.endsWith('.json'); }).sort()
  .reduce(function (changes,name) {
    return changes.concat(JSON.parse(fs.readFileSync(path.join(contributionRoot,name),'utf8')).changes);
  },require('../../fixtures/bookmark-composition/native-later-contributions.json').changes);

// Keep the immutable predecessor source while explicitly retaining later
// implemented contributions. Both sides are pinned; unrelated drift fails.
function applyLaterContributions(file,body) {
  laterContributions.filter(function (change) { return change.file === file; }).forEach(function (change) {
    expect(body.split(change.before)).toHaveLength(2);
    expect(fs.readFileSync(path.join(gameRoot,file),'utf8').split(change.after)).toHaveLength(2);
    body = body.replace(change.before,change.after);
  });
  return body;
}

// Keep the immutable predecessor assembler as an independent retained-world
// proof. Its later revision and personal-story sources must run with today's
// assembler, rather than attaching to a predecessor that has no such revisions.
async function installLegacy634(page,assembler) {
  const inputs = ['bookmark_634_identities.js','bookmark_634_scaffold_a.js','bookmark_634_scaffold_b.js',
    'bookmark_634_scaffold_c.js','bookmark_634_scaffold_d.js','starts_634_ordinary.js'];
  const former = inputs.map(function (file) { return fs.readFileSync(path.join(fixtureRoot,file),'utf8'); }).join('\n') + '\n' +
    (assembler || fs.readFileSync(path.join(fixtureRoot,'bookmark_634.js'),'utf8'));
  const current = fs.readFileSync(path.join(gameRoot,'data/bookmark_634.js'),'utf8');
  const before = 'window.__legacy634=(function(FBDATA,FB){var window={FBDATA:FBDATA};FBDATA.bookmarkRegions634={};\n' + former +
    '\nvar source=FBDATA.bookmarkCompositionSources&&FBDATA.bookmarkCompositionSources.autumn_634;' +
    'return source?{world:source.input&&source.input.bookmark,catalogs:source.input&&source.input.catalogs,starts:source.input&&source.input.starts.map(function(u){return u.definition;}),faults:source.faults||[]}' +
    ':(function(){var catalogs={settlementLayouts:{"634_opening":FBDATA.settlementLayouts["634_opening"]},settlementSites:{},governmentForms:{},religions:FBDATA.bookmarkReligions634,cultures:FBDATA.bookmarkCultures568};' +
    'Object.keys(FBDATA.bookmarkRegions634).forEach(function(id){var region=FBDATA.bookmarkRegions634[id];["settlementSites","governmentForms"].forEach(function(root){Object.assign(catalogs[root],region[root]||{});});});' +
    'return {world:FBDATA.bookmarks["634"],catalogs:catalogs,starts:FBDATA.startScenarios_634_ordinary,faults:[]};})();' +
    '})(JSON.parse(JSON.stringify(FBDATA)),{bookmarkCompositions:{captureStarts:function(o,g,rows){var out={};rows.forEach(function(r,i){out[r.id]=i;});return out;},captureAvailability:function(o,p){return p;}}});\n';
  const after = '\nwindow.__legacy634.current=JSON.parse(JSON.stringify(FBDATA.bookmarkCompositionSources.autumn_634.input));';
  await page.route('**/data/bookmark_634.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:before + current + after});
  });
}

async function assertLegacy634(page) {
  const publication = await page.evaluate(function () {
    return {available:!!FBDATA.bookmarks['634'], diagnostics:FB.bookmarkRuntimeDiagnostics()};
  });
  expect(publication.available, JSON.stringify(publication.diagnostics)).toBe(true);
  const proof = await page.evaluate(function () { return window.__legacy634; });
  expect(proof.faults).toEqual([]);
  const former = proof.world, current = proof.current.bookmark;
  expect({hidden:former.hidden,revision:former.revision,revisions:former.revisions})
    .toEqual({hidden:true,revision:'baseline',revisions:{baseline:{}}});
  ['provinces','realms'].forEach(function (key) {
    corrections[key].forEach(function (change) {
      const row = former[key].find(function (row) { return row.id === change.id; });
      Object.keys(change.before).forEach(function (field) { expect(row[field]).toEqual(change.before[field]); });
      Object.assign(row,change.after);
    });
  });
  corrections.addedRealms.forEach(function (change) {
    expect(former.realms.some(function (row) { return row.id === change.definition.id; })).toBe(false);
    const at = former.realms.findIndex(function (row) { return row.id === change.after; });
    expect(at).toBeGreaterThanOrEqual(0);
    former.realms.splice(at + 1,0,change.definition);
  });
  expect(current.revision).toBe('core_courts_v4');
  expect(Object.keys(current.revisions)).toEqual(['baseline','scenery_protected_v1','ordinary_settlement_v2','core_identities_v3','core_courts_v4']);
  // Compare every predecessor world field. Added revisions stay in the full
  // cross-page catalogue equality; they are not removed from that fingerprint.
  delete former.hidden;
  former.revision = current.revision;
  former.revisions = current.revisions;
  former.starts = [];
  if (Object.keys(former.startLocations).length) {
    // The pre-conversion composer published locations itself. The converted
    // input delegates that exact map to the canonical publication transaction.
    proof.current.starts.forEach(function (unit) { current.startLocations[unit.definition.id] = unit.locations; });
  }
  expect(current).toEqual(former);
  expect(proof.current.starts.map(function (unit) { return unit.definition; })).toEqual(proof.starts);
  Object.keys(proof.catalogs).forEach(function (root) {
    Object.keys(proof.catalogs[root]).forEach(function (id) {
      expect(proof.current.catalogs[root][id]).toEqual(proof.catalogs[root][id]);
    });
  });
}

async function installLegacyEventReferences(page) {
  // The former eager publisher reviews these two pending sources in sequence.
  // Current dated events can reference either source before its publication.
  // Supply their frozen declarations to detached review, never to live data or
  // ordinary JSON validation. Canonical validators still decide acceptance.
  function references() {
    const declared = {bookmarks:{},storyInstances:{}}, starts = FBDATA.startScenarios.slice();
    [['spring_568','568'],['autumn_634','634']].forEach(function (pair) {
      const source = FBDATA.bookmarkCompositionSources[pair[0]], input = source && source.input;
      // The original 568 assembler already published its world and starts.
      if (!input && FBDATA.bookmarks[pair[1]]) return;
      if (!input || input.bookmark.id !== pair[1]) throw new Error('Missing retained source reference: ' + pair[0]);
      declared.bookmarks[pair[1]] = input.bookmark;
      Object.keys(input.catalogs || {}).forEach(function (root) {
        declared[root] = Object.assign({},declared[root],input.catalogs[root]);
      });
      input.starts.forEach(function (unit) {
        starts.push(unit.definition);
        Object.assign(declared.storyInstances,unit.storyInstances);
      });
    });
    if (FB.bookmarkSources.eventReviewData) throw new Error('Retained event references already have an owner.');
    FB.bookmarkSources.eventReviewData = function (data) {
      if (data.bookmarkCompositionReferences !== starts) return data;
      return Object.assign({},data,{bookmarks:Object.assign({},declared.bookmarks,data.bookmarks),
        startScenarios:starts,storyInstances:Object.assign({},declared.storyInstances,data.storyInstances)});
    };
    const prepare = FB.mods.prepareComposition;
    FB.mods.prepareComposition = function (mod,worldId,base,complete) {
      if (!base || ['568','634'].indexOf(worldId) < 0) return prepare.apply(this,arguments);
      const proof = Object.assign({},base,{bookmarkCompositionReferences:starts});
      Object.keys(declared).forEach(function (root) {
        if (root !== 'storyInstances') proof[root] = Object.assign({},declared[root],base[root]);
      });
      return prepare.call(this,mod,worldId,proof,complete);
    };
  }
  await page.route('**/js/main.js',async function (route) {
    const response = await route.fetch();
    await route.fulfill({response:response,body:'(' + references.toString() + ')();\n' + await response.text()});
  });
}

// 7b557cd0 source text, executed at the original URLs only by the owner's
// browser harness. The compatibility adapter supplies no runtime validation.
async function installNativeLegacy(page) {
  // The pinned stage-only adapter predates lazy dates. Restore the former
  // document positions before executing any immutable source replacements.
  await routeEagerDocument(page);
  await installLegacyEventReferences(page);
  await page.route('**/js/bookmark_sources.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:
      'FB.bookmarkSources={current:function(){return null;},ready:function(){return false;},owns:function(){return false;},reports:function(){return [];},unreviewedReference:function(){return false;},hasRetainedCatalogueTransitions:function(){return false;},finish:function(){},eventBoundary:function(){},eventPack:function(source,fn){fn(FBDATA);},stage:function(spec,fn){fn(FBDATA);}};'});
  });
  for (const file of nativeSourceFiles) {
    if (file.indexOf('_634') >= 0) continue;
    let body = fs.readFileSync(path.resolve(__dirname,'../../fixtures/bookmark-composition/native-before-shared',path.basename(file)),'utf8');
    body = applyLaterContributions(file,body);
    if (file === 'data/story_pilgrim_1096.js') {
      // Preserve both frozen household declarations. Add the later independent
      // following group that the current 1096 world explicitly references.
      const current = fs.readFileSync(path.join(gameRoot,file),'utf8');
      const declarations = current.match(/\/\* These source cards attach only in the fresh following revision\. \*\/[\s\S]*?(?=FBDATA\.openingProfiles_pilgrim_1096 =)/g);
      const registration = current.match(/  var following=FBDATA\.householdTracks_pilgrim_followings_1096[\s\S]*?(?=\n\}\)\(\);)/g);
      expect(declarations).toHaveLength(1);
      expect(registration).toHaveLength(1);
      body += '\n' + declarations[0] + '\n(function(){var expiry={kind:"year",min:1097,max:10000};function route(when,next){return {when:when,next:next};}\n' + registration[0] + '\n})();';
    }
    if (file === 'data/story_households_baghdad_800.js') {
      // The former choice selected licensed work directly. Preserve the later
      // deliberate correction: an opening decision only records the intention.
      const before = "{ id:'keep_copying', label:'Keep copying as a livelihood', detail:'Select ordinary scholarly work and review a local order. Choosing work pays nothing by itself.', operation:{ kind:'set_focus', focusId:'scholarly_work' }, next:'offer' }";
      const after = "{ id:'keep_copying', label:'Keep copying as a livelihood', detail:'Consider a funded copying order. This choice pays nothing and grants no scholarly license. Each paid shift needs its own review.', operation:{ kind:'record_decision' }, next:'offer' }";
      expect(body.split(before)).toHaveLength(2);
      expect(fs.readFileSync(path.join(gameRoot,file),'utf8').split(after)).toHaveLength(2);
      body = body.replace(before,after);
    }
    await page.route('**/' + file,function (route) { return route.fulfill({contentType:'application/javascript',body:body}); });
  }
  // The immutable registry predates the later imperial-service declarations.
  // Retain their explicit registration at the same position on both sides.
  const former = fs.readFileSync(path.join(fixtureRoot,'story_instances.js'),'utf8');
  const current = fs.readFileSync(path.join(gameRoot,'data/story_instances.js'),'utf8');
  const anchor = '  Object.keys(FBDATA.storyCourts476 || {}).forEach(function (id) {';
  const registration = "  add(FBDATA.householdTracks_imperial_service, 'registrationAfter', 'western_office_476');";
  expect(former.split(anchor)).toHaveLength(2);
  expect(former.split(registration)).toHaveLength(1);
  expect(current.split(registration)).toHaveLength(2);
  await page.route('**/data/story_instances.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:former.replace(anchor,registration + '\n' + anchor)});
  });
  await installLegacy634(page);
  await page.route('**/data/bookmark_sources.js',function (route) {
    function reconcile(changes) {
      changes.forEach(function (change) {
        const group = FBDATA[change.root][change.group];
        if (JSON.stringify(group[change.id]) !== JSON.stringify(change.before)) throw new Error('Unexpected predecessor public definition: ' + change.id);
        group[change.id] = change.after;
      });
    }
    const source = fs.readFileSync(path.join(gameRoot,'data/bookmark_sources.js'),'utf8');
    return route.fulfill({contentType:'application/javascript',body:source + '\n(' + reconcile.toString() + ')(' + JSON.stringify(corrections.publicDefinitions) + ');'});
  });
}
module.exports = {installNativeLegacy,nativeSourceFiles,installLegacy634,assertLegacy634,
  laterContributions,applyLaterContributions};
