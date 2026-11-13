'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {test,expect} = require('../support/fixture');
const {openTitle,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {installPageGuards} = require('../support/page-contract');
const reference = require('../fixtures/content-preparation/reference.json');
const physicalReference = require('../fixtures/content-preparation/physical-sites-reference.json');
const overlay = fs.readFileSync(path.resolve(__dirname,'../fixtures/634-core-identities/household-overlay.json'),'utf8');
const malformed = fs.readFileSync(path.resolve(__dirname,'../fixtures/authoring/ctesiphon-household-plans.json'),'utf8');
dependsOnRuntime(__filename,['js/bookmark_composition.js','js/bookmark_sources.js','js/mods.js',
  'js/world.js','js/events.js','js/main.js','js/save.js','js/save_v4.js',
  'data/bookmark_634.js','data/bookmark_sources.js','data/story_households_634_ctesiphon.js']);

async function referenceSources(page) {
  for (const file of reference.files) {
    let text = fs.readFileSync(path.resolve(__dirname,'../../..',file.path),'utf8').replace(/\r\n/g,'\n');
    for (const patch of file.patches) {
      expect(text.split(patch.current).length, 'reference anchor: ' + file.path).toBe(2);
      text = text.replace(patch.current,patch.reference);
    }
    await page.route('**/' + file.path,function (route) {
      return route.fulfill({contentType:'application/javascript',body:text});
    });
  }
}

async function snapshot(page) {
  return page.evaluate(async function () {
    async function digest(value) {
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      const hash = await crypto.subtle.digest('SHA-256',bytes);
      return Array.from(new Uint8Array(hash)).map(function (n) { return n.toString(16).padStart(2,'0'); }).join('');
    }
    return {data:await digest(FBDATA), revisions:await digest(Object.keys(FBDATA.bookmarks).map(function (id) {
      return FB.bookmarkRevisions(id);
    })), signature:FB.mods.sig(), fingerprint:FB.mods.fingerprint(FBDATA.bookmarks),
    save:FB.state ? FB.save.serialize() : null, rng:FB.getRngState(), uid:FB.getUidCounter()};
  });
}

async function physicalSiteProbe(page,baseline) {
  let source = fs.readFileSync(path.resolve(__dirname,'../../../js/world.js'),'utf8').replace(/\r\n/g,'\n');
  if (baseline) {
    for (const patch of physicalReference.patches) {
      expect(source.split(patch.current).length).toBe(2);
      source = source.replace(patch.current,patch.reference);
    }
    expect(crypto.createHash('sha256').update(source).digest('hex')).toBe(physicalReference.sourceSha256);
  }
  const begin = '    var siteSlug = /^[a-z0-9]+(_[a-z0-9]+)*$/;\n    var siteGeography',
    end = '    var supportedKinds = { village:1, town:1, city:1 };';
  expect(source.split(begin).length).toBe(2);
  expect(source.split(end).length).toBe(2);
  expect(source.split('if (!siteSlug.test(siteId))').length).toBe(2);
  source = source.replace(begin,'    var siteReviewStarted = performance.now();\n' + begin)
    .replace('if (!siteSlug.test(siteId))','if (!(window.__physicalSiteReview.rows++, siteSlug.test(siteId)))')
    .replace(end,'    window.__physicalSiteReview.calls++;\n' +
      '    window.__physicalSiteReview.elapsedMs += performance.now() - siteReviewStarted;\n' + end);
  await page.addInitScript(function () { window.__physicalSiteReview = {calls:0,rows:0,elapsedMs:0}; });
  await page.route('**/js/world.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:source});
  });
}

for (const pair of [1,2,3]) for (const modded of [false,true]) {
  test('complete preparation paired stages ' + pair + ' ' + (modded ? 'with household JSON' : 'without mods'),async function ({browser},info) {
    test.skip(!info.project.name.endsWith('-served'),'Stage counters use served source interception.');
    const samples = [];
    for (const baseline of pair % 2 ? [true,false] : [false,true]) {
      const context = await browser.newContext(), page = await context.newPage(), guard = installPageGuards(page);
      try {
        await physicalSiteProbe(page,baseline);
        await openTitle(page,info);
        const title = await page.evaluate(function (text) {
          localStorage.removeItem(FB.storageKey('fb_mods'));
          if (text) localStorage.setItem(FB.storageKey('fb_mods'),JSON.stringify([text]));
          FB.seedRng(634); FB.setUidCounter(0);
          window.__physicalSiteReview = {calls:0,rows:0,elapsedMs:0};
          FB.game.loadTiming.enable(true);
          return {bootReady:FB.game.bootReady,contentReady:FB.game.contentReady};
        },modded ? overlay : null);
        expect(title).toEqual({bootReady:true,contentReady:false});
        const elapsedMs = await page.evaluate(function () {
          const restore = [];
          [['geography',FB],['resolveBookmarkPlatform',FB],['bookmarkRequirementFaults',FB],
            ['royalCourtFaults',FB]].forEach(function (row) {
            const name = row[0], owner = row[1], original = owner[name];
            owner[name] = function () { return FB.loadTiming.measure(name,original,this,arguments); };
            restore.push(function () { owner[name] = original; });
          });
          FB.game.loadTiming.begin('complete-content');
          const started = performance.now();
          return new Promise(function (resolve,reject) {
            FB.game.prepareContent(function (error) {
              const elapsed = performance.now() - started;
              FB.game.loadTiming.finish(error ? 'failed' : 'ready');
              restore.reverse().forEach(function (work) { work(); });
              if (error) reject(error); else resolve(elapsed);
            });
          });
        });
        await page.waitForFunction(function () { return FB.game.loadTiming.reports().length > 0; });
        const report = await page.evaluate(function () {
          FB.mods.assertReady();
          return {timing:FB.game.loadTiming.reports().slice(-1)[0],modCount:FB.mods.count(),
            physicalSites:window.__physicalSiteReview,
            contentReady:FB.game.contentReady,datesLoaded:FB.bookmarkSources.datesLoaded(null),
            bookmarkIds:Object.keys(FBDATA.bookmarks),startIds:FBDATA.startScenarios.map(function (row) { return row.id; })};
        });
        expect(report.contentReady).toBe(true);
        expect(report.datesLoaded).toBe(true);
        expect(report.modCount).toBe(modded ? 1 : 0);
        expect(report.timing.status).toBe('ready');
        const facts = await snapshot(page);
        const result = {baseline:baseline,mode:modded ? 'household-overlay' : 'unmodded',browser:browser.version(),
          elapsedMs:elapsedMs,report:report,facts:facts};
        samples.push(result);
        expect(guard.faults).toEqual([]);
      } finally { await context.close(); }
    }
    const before = samples.find(function (row) { return row.baseline; }), after = samples.find(function (row) { return !row.baseline; });
    expect(after.facts).toEqual(before.facts);
    expect(after.report.bookmarkIds).toEqual(before.report.bookmarkIds);
    expect(after.report.startIds).toEqual(before.report.startIds);
    expect(after.report.physicalSites.calls).toBe(before.report.physicalSites.calls);
    expect(after.report.physicalSites.rows).toBeLessThan(before.report.physicalSites.rows);
    const result = {pair:pair,sourceCommit:physicalReference.sourceCommit,samples:samples};
    await info.attach('complete-content-stages',{body:JSON.stringify(result,null,2),contentType:'application/json'});
    console.log('COMPLETE_CONTENT_STAGES ' + JSON.stringify(result));
  });
}

test('physical site faults preserve world labels, candidate isolation and fresh review after edits or exceptions',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Reference source interception uses the served project.');
  const outcomes = [];
  for (const baseline of [true,false]) {
    await physicalSiteProbe(page,baseline);
    await openTitle(page,info);
    await prepareGameContent(page);
    const result = await page.evaluate(function () {
      const live = FBDATA, table = live.settlementSites, native = FB.validateBookmarkWorld;
      const worlds = [FB.bookmark('867'),FB.bookmark('1066')];
      const data = JSON.stringify(live), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = {};
      try {
        table['Invalid Site'] = {x:181,y:91};
        rows.invalid = FB.validateBookmarkWorlds(worlds);
        delete table['Invalid Site'];
        rows.repaired = FB.validateBookmarkWorlds(worlds);
        table.content_review_probe = {x:181,y:0};
        rows.edited = FB.validateBookmarkWorlds(worlds);
        delete table.content_review_probe;
        rows.afterEdit = FB.validateBookmarkWorlds(worlds);
        // A recursive review under another root must not borrow or overwrite
        // the outer candidate's shared physical-table result.
        let nested = false;
        FB.validateBookmarkWorld = function () {
          const faults = native.apply(this,arguments);
          if (!nested) {
            nested = true;
            window.FBDATA = Object.assign({},live,{settlementSites:Object.assign({},table,{content_nested_probe:{x:0,y:91}})});
            try { rows.nested = FB.validateBookmarkWorlds(worlds); }
            finally { window.FBDATA = live; nested = false; }
          }
          return faults;
        };
        rows.outer = FB.validateBookmarkWorlds(worlds);
        FB.validateBookmarkWorld = function () {
          native.apply(this,arguments);
          throw new Error('injected physical review failure');
        };
        try { FB.validateBookmarkWorlds(worlds); } catch (error) { rows.failure = error.message; }
        FB.validateBookmarkWorld = native;
        table.content_after_failure = {x:0,y:91};
        rows.afterFailure = FB.validateBookmarkWorlds(worlds);
        delete table.content_after_failure;
        rows.final = FB.validateBookmarkWorlds(worlds);
        rows.import = FB.mods.validate({name:'Physical site review',settlementSites:{content_import_probe:{x:181,y:0}}});
        live.settlementSites = [];
        rows.array = FB.validateBookmarkWorlds(worlds);
        live.settlementSites = table;
        rows.pure = JSON.stringify(live) === data && FB.getRngState() === rng && FB.getUidCounter() === uid;
        return rows;
      } finally {
        delete table['Invalid Site']; delete table.content_review_probe; delete table.content_after_failure;
        live.settlementSites = table; window.FBDATA = live; FB.validateBookmarkWorld = native;
      }
    });
    expect(result.pure).toBe(true);
    for (const key of ['repaired','afterEdit','outer','final']) expect(result[key]).toEqual([[],[]]);
    expect(result.invalid).toEqual(['867','1066'].map(function (id) {
      return ['Bookmark ' + id + ': invalid settlement site id Invalid Site.',
        'Bookmark ' + id + ': settlement site Invalid Site has invalid coordinates.'];
    }));
    expect(result.edited[0]).toContain('Bookmark 867: settlement site content_review_probe has invalid coordinates.');
    expect(result.nested[0]).toContain('Bookmark 867: settlement site content_nested_probe has invalid coordinates.');
    expect(result.afterFailure[0]).toContain('Bookmark 867: settlement site content_after_failure has invalid coordinates.');
    expect(result.failure).toBe('injected physical review failure');
    expect(result.import.length).toBeGreaterThan(0);
    expect(result.array[0]).toContain('Bookmark 867: FBDATA.settlementSites must be an object keyed by site id.');
    outcomes.push(result);
  }
  expect(outcomes[1]).toEqual(outcomes[0]);
});

for (const modded of [false,true]) {
  test('complete preparation matches the prior implementation ' + (modded ? 'with household JSON' : 'without mods'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Reference source interception uses the served project.');
    const outcomes = [];
    for (const old of [false,true]) {
      if (old) await referenceSources(page);
      await openTitle(page,info);
      await page.evaluate(function (text) {
        localStorage.removeItem(FB.storageKey('fb_mods'));
        if (text) localStorage.setItem(FB.storageKey('fb_mods'),JSON.stringify([text]));
        FB.seedRng(634); FB.setUidCounter(0);
      },modded ? overlay : null);
      await prepareGameContent(page);
      expect(await page.evaluate(function () { FB.mods.assertReady(); return FB.mods.count(); })).toBe(modded ? 1 : 0);
      const prepared = await snapshot(page);
      if (modded) expect(prepared.signature).toMatch(/^effective-1-[a-f0-9]{64}$/);
      else expect(prepared.signature).toBe('');
      const rejected = await page.evaluate(function (text) {
        const mod = JSON.parse(text);
        mod.startScenarios[0].fixedProvinceId = 'missing_content_preparation_county';
        const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
        const faults = FB.mods.validate(mod);
        return {faults:faults,pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      },malformed);
      expect(rejected.faults.length).toBeGreaterThan(0);
      expect(rejected.pure).toBe(true);
      await beginBookmarkFromTitle(page,'634','ctesiphon_household_634');
      const campaign = await snapshot(page);
      outcomes.push({prepared:prepared,rejected:rejected,campaign:campaign});
      await page.evaluate(function () { localStorage.clear(); });
    }
    expect(outcomes[0]).toEqual(outcomes[1]);
  });
}

test('whole-world replacement faults match the preceding validator without publication',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Reference source interception uses the served project.');
  const outcomes = [];
  for (const old of [false,true]) {
    if (old) await referenceSources(page);
    await openTitle(page,info);
    await prepareGameContent(page);
    const result = await page.evaluate(function () {
      const world = JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
      // A complete fresh court roster is not a valid replacement for an older
      // revision that lacks its government and opening declarations.
      world.revisions.core_identities_v3.realms = JSON.parse(JSON.stringify(FB.bookmark('634').realms));
      const mod = {name:'Court replacement review',bookmarks:{'634':world}};
      const data = JSON.stringify(FBDATA), input = JSON.stringify(mod), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faults = FB.mods.validate(mod);
      return {faults:faults,pure:data === JSON.stringify(FBDATA) && input === JSON.stringify(mod) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    expect(result.pure).toBe(true);
    expect(result.faults.length).toBeGreaterThan(0);
    outcomes.push(result);
  }
  expect(outcomes[0]).toEqual(outcomes[1]);
});

test('shared values retain exact JSON semantics and invalidate every edited descendant',async function ({page},info) {
  await openTitle(page,info);
  const result = await page.evaluate(function () {
    const values = FB.contentValues, shared = {text:'é\ud800',n:1}, value = {z:shared,a:[shared]};
    const first = values.snapshot(value), hash = FB.mods.fingerprint(value);
    const checks = [Object.isFrozen(first),Object.isFrozen(first.z),first.z === first.a[0],first === values.snapshot(value)];
    shared.n = 2;
    const second = values.snapshot(value);
    checks.push(second !== first,second.z !== first.z,first.z.n === 1,FB.mods.fingerprint(value) !== hash);
    delete shared.n; shared.other = 3;
    checks.push(values.snapshot(value) !== second);
    const third = values.snapshot(value), text = shared.text;
    delete shared.text; shared.text = text;
    checks.push(values.snapshot(value) !== third);
    const mutableCopy = JSON.parse(JSON.stringify(value));
    values.copied(value,mutableCopy);
    const copied = values.snapshot(mutableCopy);
    mutableCopy.z.other = 4;
    checks.push(values.snapshot(mutableCopy) !== copied,copied.z.other === 3);
    const originalLeaf = {n:1}, frozenLeaf = values.snapshot(originalLeaf), independentLeaf = {n:1};
    values.copied(frozenLeaf,independentLeaf);
    const independent = values.snapshot({original:originalLeaf,copy:independentLeaf});
    checks.push(independent.original !== independent.copy);
    const sparse = []; sparse.length = 2;
    const cases = [value,{b:undefined,a:NaN,c:[undefined,Infinity,,null]},sparse,
      {toJSON:function () { return {z:1,a:2}; }},JSON.parse('{"__proto__":{"x":1}}')];
    // JSON quotes add two bytes: exercise both sides of the SHA padding and
    // block boundaries, plus all UTF-8 widths across many reused work blocks.
    [0,1,53,54,55,61,62,63,64,65,127,128].forEach(function (size) {
      cases.push(new Array(size + 1).join('a'));
    });
    cases.push(new Array(8193).join('aé\u0800\ud83d\ude00'));
    const leaf = new Array(600).fill(1), expanded = new Array(600).fill(leaf);
    let deep = leaf;
    for (let i = 0; i < 65; i++) deep = {child:deep};
    const cycle = {}; cycle.child = cycle;
    const shapeFaults = [expanded,{shallow:leaf,deep:deep},cycle].map(function (input) {
      return FB.bookmarkCompositions.prepare(input).report().worldFaults;
    });
    return {checks:checks,shapeFaults:shapeFaults, cases:cases.map(function (row) {
      return {json:JSON.stringify(row),hash:FB.mods.fingerprint(row)};
    })};
  });
  expect(result.checks.every(Boolean)).toBe(true);
  expect(result.shapeFaults).toEqual([
    ['Composition exceeds its data limits.'],['Composition exceeds its data limits.'],
    ['Composition data contains a cycle.']
  ]);
  function canonical(row) {
    if (Array.isArray(row)) return '[' + row.map(canonical).join(',') + ']';
    if (row && typeof row === 'object') return '{' + Object.keys(row).sort().map(function (key) {
      return JSON.stringify(key) + ':' + canonical(row[key]);
    }).join(',') + '}';
    return JSON.stringify(row);
  }
  result.cases.forEach(function (row) {
    expect(row.hash).toBe(crypto.createHash('sha256').update(canonical(JSON.parse(row.json))).digest('hex'));
  });
});

test('bookmark batches review duplicates once and never retain validation across edits or failures',async function ({page},info) {
  await openTitle(page,info);
  await prepareGameContent(page);
  const result = await page.evaluate(function () {
    const world = FB.bookmark(FBDATA.defaultBookmark), validate = FB.validateBookmarkWorld;
    let calls = 0;
    FB.validateBookmarkWorld = function () { calls++; return validate.apply(this,arguments); };
    try {
      const expected = validate(world), rows = FB.validateBookmarkWorlds([world,world]);
      const once = calls === 1;
      rows[0].push('caller edit');
      const detached = rows[1].indexOf('caller edit') < 0;
      const edited = Object.assign({},world,{hidden:'invalid'});
      const faults = FB.validateBookmarkWorlds([edited])[0];
      const fresh = calls === 2;
      // JSON serialization omits function-valued fields. Such a malformed
      // definition must never borrow a valid sibling's review.
      const invalid = Object.assign({},world,{hidden:function () {}});
      const malformedFaults = FB.validateBookmarkWorlds([world,invalid])[1];
      FB.validateBookmarkWorld = function () { throw new Error('injected validation failure'); };
      let failed = false;
      try { FB.validateBookmarkWorlds([world]); } catch (error) { failed = true; }
      FB.validateBookmarkWorld = validate;
      return {expected:expected,actual:rows[1],once:once,detached:detached,fresh:fresh,
        faults:faults,malformedFaults:malformedFaults,failed:failed,after:FB.validateBookmarkWorlds([world])[0]};
    } finally { FB.validateBookmarkWorld = validate; }
  });
  expect(result.actual).toEqual(result.expected);
  expect(result.after).toEqual(result.expected);
  expect(result).toMatchObject({once:true,detached:true,fresh:true,failed:true});
  expect(result.faults.length).toBeGreaterThan(0);
  expect(result.malformedFaults.length).toBeGreaterThan(0);
});

test('content measurement reports sampled self time without adding ancestor time',function () {
  const {topFunctions} = require('../measure/content');
  expect(topFunctions({nodes:[
    {id:1,callFrame:{functionName:'prepare',url:'http://127.0.0.1/js/main.js',lineNumber:9}},
    {id:2,callFrame:{functionName:'review',url:'http://127.0.0.1/js/world.js',lineNumber:19}}
  ],samples:[1,2,2],timeDeltas:[1000,2000,3000]})).toEqual([
    {name:'review',url:'http://127.0.0.1/js/world.js',line:20,selfMs:5,samples:2},
    {name:'prepare',url:'http://127.0.0.1/js/main.js',line:10,selfMs:1,samples:1}
  ]);
});
