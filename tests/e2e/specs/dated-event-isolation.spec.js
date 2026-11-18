'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark,beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const lantern = require('../fixtures/authoring/dated-event-isolation-lantern.json');
const lanternPath = path.resolve(__dirname,'../fixtures/authoring/dated-event-isolation-lantern.json');
const highMedieval = require('../fixtures/authoring/dated-event-isolation-high-medieval.json');

dependsOnRuntime(__filename,['data/events_1096.js','data/events_1204.js','data/events_1241.js']);

dependsOnRuntime(__filename,['js/events.js','js/starts.js','js/schema.js','js/world.js','js/mods.js','js/bookmark_sources.js',
  'js/bookmark_composition.js','js/systems.js','js/stories.js','js/story_track.js',
  'js/story_household.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js',
  'data/events_493.js','data/events_568.js','data/events_634.js','data/events_711.js','data/events_800.js',
  'data/story_households_568_ravenna.js','data/starts_568_ravenna.js',
  'data/story_households_634_medina.js','data/starts_634_medina.js','data/systems.js','data/bookmark_711.js']);

// Every proof owns a fresh page and campaign; independent cases may shard.
test.describe.configure({mode:'parallel'});

for (const row of highMedieval.rows) test(row.bookmark + ' restored native pool and delivery exclude every other campaign at the same live year',async function ({page},info) {
  await startHistoricalGame(page,info,row);
  await prepareGameContent(page);
  const snapshot = await page.evaluate(function (row) {
    const s = FB.state;
    // Put every event inside its declared window, including the later local notices.
    s.turn += (row.liveYear - s.date.year) * 360;s.date.year = row.liveYear;
    return {saved:FB.save.serialize(),start:s.start,gold:s.player.gold,holdings:s.player.holdings,
      date:s.date,turn:s.turn,queue:s.eventQueue,stories:s.stories,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
  },row);
  // Warm a foreign identity's pool before restoring the real campaign.
  await page.evaluate(function (row) {
    const s = JSON.parse(JSON.stringify(FB.state));s.start.id = '1066';
    delete s.start.revision;
    s.start.era = 'high_medieval';s.date.year = row.liveYear;
    if (FB.eventYearPool(s).some(function (ev) {return ev.pack === row.packId;})) throw new Error('Foreign pool leak');
  },row);
  await restoreBookmark(page,snapshot.saved);
  expect(await page.evaluate(function (expected) {
    const s = FB.state;
    return JSON.stringify(s.start) === JSON.stringify(expected.start) && s.player.gold === expected.gold &&
      JSON.stringify(s.date) === JSON.stringify(expected.date) && s.turn === expected.turn &&
      JSON.stringify(s.player.holdings) === JSON.stringify(expected.holdings) &&
      JSON.stringify(s.eventQueue) === JSON.stringify(expected.queue) && JSON.stringify(s.stories) === JSON.stringify(expected.stories) &&
      FB.getRngState() >>> 0 === expected.rng && FB.getUidCounter() === expected.uid && FB.game.contentReady;
  },snapshot)).toBe(true);
  const result = await page.evaluate(function (row) {
    const original = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter(), faults = [];
    const own = JSON.parse(original), pack = FBDATA.eventPacks[row.packId];
    const events = FBDATA.events.filter(function (ev) {return ev.pack === row.packId;});
    const active = events.filter(function (ev) {
      return (ev.yearMin === undefined || own.date.year >= ev.yearMin) &&
        (ev.yearMax === undefined || own.date.year <= ev.yearMax);
    });
    row.patches.forEach(function (patch) {
      let target = own;
      patch.path.slice(0,-1).forEach(function (key) {target = target[key];});
      target[patch.path[patch.path.length-1]] = JSON.parse(JSON.stringify(patch.value));
    });
    // The real restored queue was checked above. Isolate this delivery from
    // opening decisions: the dispatcher intentionally emits only one per day.
    own.eventQueue = [];
    const first = FB.eventById(row.eventId), ctx = FB.eventContextFor(own,first,{});
    if (!ctx || !FB.queueEvent(own,first.id,{}) || !FB.pickDailyEvents(own).some(function (item) {return item.id === first.id;}))
      faults.push('own queued delivery');
    if (!FB.contentPeriodEnabled(own,pack) || events.some(function (ev) {
      const expected = active.indexOf(ev) >= 0;
      return FB.eventPeriodEnabled(own,ev) !== expected || (FB.eventYearPool(own).indexOf(ev) >= 0) !== expected;
    })) faults.push('restored own pool');
    const others = Object.keys(FBDATA.bookmarks).filter(function (id) {return id !== row.bookmark;});
    others.forEach(function (id) {
      const foreign = JSON.parse(JSON.stringify(own));foreign.start.id = id;
      delete foreign.start.revision;
      // Preserve the positive local facts, era and year: only campaign identity changes.
      foreign.eventQueue = [];
      const before = JSON.stringify(foreign), beforeRng = FB.getRngState(), beforeUid = FB.getUidCounter();
      for (let pass = 0; pass < 2; pass++) {
        if (FB.contentPeriodEnabled(foreign,pack) || events.some(function (ev) {
          return FB.eventPeriodEnabled(foreign,ev) || FB.eventYearPool(foreign).indexOf(ev) >= 0 ||
            FB.eventContextFor(foreign,ev,{}) || FB.ensureEventParticipants(foreign,ev,{}) ||
            FB.queueEvent(foreign,ev.id,{}) || FB.eventContextStillValid(foreign,ev,ctx) ||
            FB.eventOptionStatus(foreign,ev,ev.options[0],ctx).ready ||
            FB.resolveEventOption(foreign,ev,ev.options[0],ctx,{automated:true});
        })) faults.push('foreign routes: ' + id);
      }
      if (before !== JSON.stringify(foreign) || beforeRng !== FB.getRngState() || beforeUid !== FB.getUidCounter())
        faults.push('impure rejection: ' + id);
      foreign.eventQueue = [{id:first.id,ctx:ctx}];foreign.slotDays = [];
      if (FB.pickDailyEvents(foreign).some(function (item) {return item.id === first.id;})) faults.push('queued dispatch: ' + id);
      foreign.eventQueue = [];foreign.slotDays = [foreign.date.day];
      if (FB.pickDailyEvents(foreign).some(function (item) {return events.indexOf(FB.eventById(item.id)) >= 0;}))
        faults.push('random dispatch: ' + id);
      if (FB.eventYearPool(own).filter(function (ev) {return ev.pack === row.packId;}).length !== active.length)
        faults.push('return cache: ' + id);
    });
    FB.setRngState(rng);FB.setUidCounter(uid);
    return {faults:faults,count:events.length,active:active.length,others:others,
      pure:original === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },row);
  expect(result.faults).toEqual([]);
  expect(result.count).toBe(10);
  expect(result.active).toBe(10);
  expect(result.others).toEqual(expect.arrayContaining(['867','1066']));
  expect(result.others.length).toBeGreaterThanOrEqual(10);
  expect(result.pure).toBe(true);
});

async function withholdCampaign(page) {
  const source = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_711.js'),'utf8');
  await page.route('**/data/bookmark_711.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:source.replace('function (FBDATA) {',
      "function (FBDATA) { throw new Error('Withheld world fixture');")});
  });
}

test('a withheld campaign retains pure native references and healthy scoped pool reads',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  await withholdCampaign(page);
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const report = FB.bookmarkCompositions.sourceReports().find(function (row) {return row.bookmarkId === '711';});
    return {withheld:!!report && !report.published && !FBDATA.bookmarks['711'],
      healthy:FB.bookmarkCompositions.sourceReports().some(function (row) {return row.bookmarkId === '493' && row.published;})};
  })).toEqual({withheld:true,healthy:true});
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const pack = {retained:FBDATA.eventPacks.dated_711}, event = {id:'retained_selector',pack:'retained'};
    const scenario = FBDATA.startScenarios.find(function (row) {return row.id === 'toledo_household_711';});
    const bookmark = FB.bookmark('493'), candidate = {data:FBDATA};
    const detached = JSON.parse(JSON.stringify(FBDATA));
    detached.bookmarkCompositionReferences = [];
    const results = [];
    for (let pass = 0; pass < 3; pass++) {
      const nativeStart = FB.startSelectorReport(scenario,bookmark);
      results.push(!FB.validateEventPacks(pack).length && !FB.validateEventPeriod(event,pack) &&
        FB.validateEventPacks(pack,candidate).length > 0 && !!FB.validateEventPeriod(event,pack,candidate) &&
        FB.validateEventPacks(pack,{data:detached}).length > 0 &&
        nativeStart.valid && !nativeStart.matches && !FB.startSelectorReport(scenario,bookmark,undefined,detached).valid &&
        FB.validateEventPacks({unknown:{eras:['late_antique'],bookmarkIds:['unknown_campaign']}}).length > 0 &&
        !FB.startSelectorReport({id:'unknown_start',bookmarkIds:['unknown_campaign']},bookmark).valid);
    }
    return {results:results,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({results:[true,true,true],pure:true});
  expect(await page.evaluate(function () {
    const state = {start:{id:'493',era:'late_antique'},date:{year:493}};
    return FB.eventYearPool(state).filter(function (ev) {return ev.pack === 'dated_493';}).length;
  })).toBe(10);
});

test('a withheld campaign leaves healthy campaign entry available and its own events closed',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  await withholdCampaign(page);
  await startHistoricalGame(page,info,{bookmark:'493',code:'ISOLATION-493-farmer_493-ravenna-m-Reader'});
  expect(await page.evaluate(function () {
    const s = FB.state, own = FBDATA.eventPacks.dated_493, unavailable = FBDATA.eventPacks.dated_711;
    const foreign = JSON.parse(JSON.stringify(s));foreign.start = {id:'711',era:'early_medieval'};foreign.date.year = 711;
    return FB.contentPeriodEnabled(s,own) && FB.eventYearPool(s).some(function (ev) {return ev.pack === 'dated_493';}) &&
      !FB.contentPeriodEnabled(foreign,unavailable) && !FB.eventYearPool(foreign).some(function (ev) {return ev.pack === 'dated_711';});
  })).toBe(true);
});

async function start(page,info,imported) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    return FB.bookmarkCompositions.sourceReports().filter(function (row) {return !row.ready;}).map(function (row) {
      return {bookmark:row.bookmarkId,faults:row.worldFaults,starts:row.starts};
    });
  })).toEqual([]);
  if (imported) {
    expect(await page.evaluate(function (mod) {return FB.mods.validate(mod);},lantern)).toEqual([]);
    await page.evaluate(function () {FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(lanternPath);
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await beginBookmarkFromTitle(page,'568','ravenna_household_568');
}

test('native and detached JSON selector validation is pure and rejects invalid hidden and empty packs atomically',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function (mod) {
    const before = JSON.stringify(FB.state), data = JSON.stringify(FBDATA), input = JSON.stringify(mod);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), sig = FB.mods.sig(), storage = JSON.stringify(localStorage);
    const rejected = [];
    function reject(edit) {
      const candidate = JSON.parse(input);edit(candidate);
      const original = JSON.stringify(candidate), faults = FB.mods.validate(candidate);
      let failed = false;try {FB.mods.apply(candidate);} catch (error) {failed = true;}
      rejected.push(faults.length > 0 && failed && original === JSON.stringify(candidate));
    }
    reject(function (m) {m.eventPacks.lantern_periods.bookmarkIds = [];});
    reject(function (m) {m.eventPacks.lantern_periods.bookmarkIds = ['568','568'];});
    reject(function (m) {m.eventPacks.lantern_periods.bookmarkIds = ['unknown_campaign'];});
    reject(function (m) {m.eventPacks.lantern_periods.bookmarkIds = [568];});
    reject(function (m) {m.events[0].bookmarkIds = null;});
    reject(function (m) {m.events[1].bookmarkIds = ['unknown_campaign'];});
    reject(function (m) {m.eventPacks.unused_period = {eras:['late_antique'],bookmarkIds:[]};});
    reject(function (m) {m.eventPacks.lantern_periods.yearMax = 567;});
    reject(function (m) {m.events[0].options[0].review.args.choiceId = 'absent_choice';});
    reject(function (m) {m.events[0].options[1].require = {goldMin:1};});
    const ev = {id:'detached_period',bookmarkIds:['fictional_campaign']};
    const packs = {detached:{eras:['late_antique'],bookmarkIds:['fictional_campaign']}};
    const candidate = {data:Object.assign({},FBDATA,{bookmarks:{fictional_campaign:{id:'fictional_campaign'}}})};
    const candidateBefore = JSON.stringify(candidate);
    const detached = FB.validateEventPacks(packs,candidate).length === 0 &&
      !FB.validateEventPeriod(ev,{},candidate) && !!FB.validateEventPeriod(ev,{}) &&
      candidateBefore === JSON.stringify(candidate);
    const native = [null,[],{}, {bad:{eras:['late_antique'],bookmarkIds:[]}},
      {bad:{eras:['late_antique'],bookmarkIds:['568','568']}},
      {bad:{eras:['late_antique'],bookmarkIds:['unknown_campaign']}}].map(function (p) {
        return p && !Object.keys(p).length && !Array.isArray(p) ? FB.validateEventPacks(p).length === 0 : FB.validateEventPacks(p).length > 0;
      });
    return {rejected:rejected,native:native,detached:detached,pure:before === JSON.stringify(FB.state) &&
      data === JSON.stringify(FBDATA) && input === JSON.stringify(mod) && rng === FB.getRngState() &&
      uid === FB.getUidCounter() && sig === FB.mods.sig() && storage === JSON.stringify(localStorage)};
  },lantern);
  expect(result).toEqual({rejected:Array(10).fill(true),native:Array(6).fill(true),detached:true,pure:true});
});

test('all dated packs exclude every other declared campaign at the same live year across pools and delivery routes',async function ({page},info) {
  await start(page,info,false);
  const result = await page.evaluate(function () {
    const original = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = [], bookmarks = Object.keys(FBDATA.bookmarks), counts = {};
    for (const id of ['493','568','634','711','800']) {
      const packId = 'dated_' + id, pack = FBDATA.eventPacks[packId];
      const events = FBDATA.events.filter(function (ev) {return ev.pack === packId;});
      counts[id] = events.length;
      const own = JSON.parse(original);
      own.start = {id:id,era:pack.eras[0]};own.date.year = pack.yearMin;
      const first = events[0], ctx = FB.eventContextFor(own,first,{});
      if (!ctx || !FB.contentPeriodEnabled(own,pack) || events.some(function (ev) {
        return !FB.eventPeriodEnabled(own,ev) || FB.eventYearPool(own).indexOf(ev) < 0;
      })) faults.push(id + ': own campaign');
      for (const other of bookmarks.filter(function (b) {return b !== id;})) {
        const fork = JSON.parse(JSON.stringify(own));fork.start.id = other;
        const before = JSON.stringify(fork), beforeRng = FB.getRngState(), beforeUid = FB.getUidCounter();
        for (let pass = 0; pass < 3; pass++) {
          if (FB.contentPeriodEnabled(fork,pack) || events.some(function (ev) {
            return FB.eventPeriodEnabled(fork,ev) || FB.eventYearPool(fork).indexOf(ev) >= 0 ||
              FB.eventContextFor(fork,ev,{}) || FB.ensureEventParticipants(fork,ev,{}) ||
              FB.queueEvent(fork,ev.id,{}) || FB.eventContextStillValid(fork,ev,ctx) ||
              FB.eventOptionStatus(fork,ev,ev.options[0],ctx).ready ||
              FB.resolveEventOption(fork,ev,ev.options[0],ctx,{automated:true});
          })) faults.push(id + ': leaked to ' + other);
        }
        if (before !== JSON.stringify(fork) || beforeRng !== FB.getRngState() || beforeUid !== FB.getUidCounter())
          faults.push(id + ': impure exclusion ' + other);
        // A previously queued decision must be discarded on actual dispatch.
        fork.eventQueue = [{id:first.id,ctx:ctx}];fork.slotDays = [];
        if (FB.pickDailyEvents(fork).some(function (item) {return item.id === first.id;})) faults.push(id + ': queued dispatch');
        // Build and use the cached random pool in the other campaign as well.
        fork.eventQueue = [];fork.slotDays = [fork.date.day];
        if (FB.pickDailyEvents(fork).some(function (item) {return events.some(function (ev) {return ev.id === item.id;});}))
          faults.push(id + ': random dispatch');
        if (FB.eventYearPool(own).filter(function (ev) {return ev.pack === packId;}).length !== events.length)
          faults.push(id + ': return cache');
      }
    }
    FB.setRngState(rng);FB.setUidCounter(uid);
    return {faults:faults,counts:counts,bookmarks:bookmarks.length,complete:FB.game.contentReady,
      pure:original === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.faults).toEqual([]);
  expect(result.counts).toEqual({'493':10,'568':10,'634':10,'711':12,'800':12});
  expect(result.bookmarks).toBeGreaterThanOrEqual(11);
  expect(result.complete).toBe(true);expect(result.pure).toBe(true);
});

test('imported multi-bookmark periods, event overrides, invalid revisions and legacy periods switch caches without broadening',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter(), faults = [];
    const scoped = FB.eventById('lantern_household_review'), override = FB.eventById('lantern_period_override');
    const legacy = FB.eventById('lantern_legacy_period'), pack = FBDATA.eventPacks.lantern_periods;
    for (const id of Object.keys(FBDATA.bookmarks)) {
      const s = JSON.parse(before);s.start = {id:id,era:'late_antique'};s.date.year = 568;
      const expected = pack.bookmarkIds.indexOf(id) >= 0;
      if (FB.eventPeriodEnabled(s,scoped) !== expected || FB.contentPeriodEnabled(s,pack) !== expected ||
          (FB.eventYearPool(s).indexOf(scoped) >= 0) !== expected || !FB.eventPeriodEnabled(s,legacy)) faults.push(id + ': pack/legacy');
      s.date.year = 634;
      if (FB.eventPeriodEnabled(s,override) !== (id === '634') ||
          (FB.eventYearPool(s).indexOf(override) >= 0) !== (id === '634')) faults.push(id + ': override');
    }
    const s = JSON.parse(before), checks = [];
    for (const stamp of [null,{}, {id:'unknown_campaign',era:'late_antique'},
      {id:'568',era:'late_antique',revision:'unknown_revision'}, {id:'568',era:'late_antique'}]) {
      s.start = stamp;s.date.year = 568;
      const expected = !!(stamp && stamp.id === '568' && !stamp.revision);
      checks.push(FB.eventPeriodEnabled(s,scoped) === expected && FB.contentPeriodEnabled(s,pack) === expected &&
        (FB.eventYearPool(s).indexOf(scoped) >= 0) === expected);
    }
    // An invalid explicit revision must not reuse the missing-stamp baseline pool.
    s.start.revision = null;
    checks.push(!FB.eventPeriodEnabled(s,scoped) && !FB.contentPeriodEnabled(s,pack) && FB.eventYearPool(s).indexOf(scoped) < 0);
    delete s.start.revision;
    s.start = {id:'568',era:'high_medieval'};checks.push(!FB.eventPeriodEnabled(s,scoped) && FB.eventYearPool(s).indexOf(scoped) < 0);
    s.start.era = 'late_antique';s.date.year = 589;checks.push(!FB.eventPeriodEnabled(s,scoped) && FB.eventYearPool(s).indexOf(scoped) < 0);
    s.date.year = 588;checks.push(FB.eventPeriodEnabled(s,scoped) && FB.eventYearPool(s).indexOf(scoped) >= 0);
    // Actual catalogue publication invalidates compiled periods on the same page.
    const replacement = {eventPacks:{lantern_periods:Object.assign({},pack,{bookmarkIds:['634']})}};
    FB.mods.apply(replacement);
    const invalidated = !FB.eventPeriodEnabled(FB.state,scoped) && FB.eventYearPool(FB.state).indexOf(scoped) < 0;
    return {faults:faults,checks:checks,invalidated:invalidated,pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({faults:[],checks:Array(9).fill(true),invalidated:true,pure:true});
});

test('scoped lifecycle subscriptions deliver only to matching campaigns and recheck restored queued contexts',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function () {
    const s = FB.state, ev = FB.eventById('lantern_household_review');
    FB.stories.start(s,{tracks:['lantern_household']});s.player.flags.lantern_notice = 1;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter(), faults = [];
    for (const id of Object.keys(FBDATA.bookmarks)) {
      const fork = JSON.parse(before);fork.start = {id:id,era:'late_antique'};
      const expected = FBDATA.eventPacks.lantern_periods.bookmarkIds.indexOf(id) >= 0;
      const queued = FB.queueLifecycleEvents(fork,'household_birth',{}).filter(function (q) {return q.id === ev.id;});
      if (queued.length !== (expected ? 1 : 0)) faults.push(id + ': subscription');
      if (expected) {
        const ctx = JSON.parse(JSON.stringify(queued[0].ctx));
        if (!FB.eventContextStillValid(fork,ev,ctx)) faults.push(id + ': eligible context');
        fork.start.id = '476';
        const changed = JSON.stringify(fork);
        if (FB.eventContextStillValid(fork,ev,ctx) || FB.resolveEventOption(fork,ev,ev.options[0],ctx,{automated:true}) || changed !== JSON.stringify(fork))
          faults.push(id + ': stale context');
      }
    }
    const raw = FBDATA.bookmarks[s.start.id], systems = raw.systems;
    raw.systems = Object.assign({},systems,{event_story_tracks:false});
    const disabled = !FB.queueLifecycleEvents(JSON.parse(before),'household_birth',{}).some(function (q) {return q.id === ev.id;});
    raw.systems = systems;
    return {faults:faults,disabled:disabled,pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({faults:[],disabled:true,pure:true});
});

test('restoring two real campaigns in the same era and live year never borrows the other campaign pool',async function ({page},info) {
  const saves = [];
  for (const id of ['476','493']) {
    await startHistoricalGame(page,info,{bookmark:id,code:'RESTORE-' + id + '-farmer_' + id + '-ravenna-m-Reader'});
    saves.push(await page.evaluate(function () {
      const s = FB.state;
      // Stage the calendar boundary; no long daily simulation is involved.
      s.turn += (493 - s.date.year) * 360;s.date.year = 493;
      const queued = FB.queueEvent(s,'ravenna_family_letters_493',{});
      if (!!queued !== (s.start.id === '493')) throw new Error('Wrong native queue membership');
      return {saved:FB.save.serialize(),start:s.start,gold:s.player.gold,holdings:s.player.holdings,
        queue:s.eventQueue,stories:s.stories,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
    }));
  }
  for (const snapshot of [saves[0],saves[1],saves[0],saves[1]]) {
    await restoreBookmark(page,snapshot.saved);
    expect(await page.evaluate(function (expected) {
      const s = FB.state;
      return JSON.stringify(s.start) === JSON.stringify(expected.start) && s.player.gold === expected.gold &&
        JSON.stringify(s.player.holdings) === JSON.stringify(expected.holdings) && JSON.stringify(s.eventQueue) === JSON.stringify(expected.queue) &&
        JSON.stringify(s.stories) === JSON.stringify(expected.stories) && s.date.year === 493 &&
        FB.campaignEra(s) === 'late_antique' && FB.getRngState() >>> 0 === expected.rng && FB.getUidCounter() === expected.uid &&
        FB.eventYearPool(s).some(function (ev) {return ev.pack === 'dated_493';}) === (expected.start.id === '493');
    },snapshot)).toBe(true);
  }
});

for (const imported of [false,true]) test((imported ? 'ordinary JSON' : 'native') + ' reviews retain canonical payment, refusal, live identity, system gates and exact restores',async function ({page},info) {
  await start(page,info,imported);
  const result = await page.evaluate(function (imported) {
    const s = FB.state, p = s.player, story = imported ? 'lantern_household' : 'ravenna_household_track_568';
    if (imported) FB.stories.start(s,{tracks:[story]});
    else if (!FB.stories.apply(s,story,'take_stock',FB.stories.quote(s,story,'take_stock'))) throw new Error('Native supplies stage unavailable');
    p.gold = 20;
    const ev = FB.eventById(imported ? 'lantern_household_review' : 'ravenna_stationary_repairs_568');
    const opt = ev.options.find(function (o) {return !!o.review;}), ctx = FB.eventContextFor(s,ev,{});
    const q = FB.eventReviews.quote(s,opt,ctx), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const repeated = Array(5).fill(0).every(function () {
      return JSON.stringify(FB.eventReviews.quote(s,opt,ctx)) === JSON.stringify(q) &&
        FB.eventContextStillValid(s,ev,ctx) && FB.eventOptionStatus(s,ev,opt,ctx).ready;
    });
    const readPure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const missing = !FB.resolveEventOption(s,ev,opt,ctx,{}) && before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    p.gold = 0;const poor = JSON.stringify(s), deniedQuote = FB.eventReviews.quote(s,opt,ctx);
    const denied = deniedQuote && !deniedQuote.quote.allowed && !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:deniedQuote}) && poor === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const refusalState = JSON.parse(poor), record = JSON.stringify(refusalState.stories[story]);
    const refused = FB.resolveEventOption(refusalState,ev,opt,ctx,{automated:true});
    const refusal = !!refused && refused.optionIndex === 1 && refusalState.player.gold === 0 && record === JSON.stringify(refusalState.stories[story]) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.setRngState(rng);FB.setUidCounter(uid);p.gold = 19;
    const changed = JSON.stringify(s), stale = !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:q}) && changed === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const person = s.chars[p.charId], wasDead = person.dead, hadDead = Object.prototype.hasOwnProperty.call(person,'dead');person.dead = true;
    const deadState = JSON.stringify(s), deadQuote = FB.eventReviews.quote(s,opt,ctx);
    const dead = !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:deadQuote}) && deadState === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    if (hadDead) person.dead = wasDead;else delete person.dead;
    const raw = FBDATA.bookmarks[s.start.id], systems = raw.systems;
    raw.systems = Object.assign({},systems,{event_story_tracks:false,event_governments:false});
    const disabledState = JSON.stringify(s);
    const disabled = !FB.eventReviews.quote(s,opt,ctx) && !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:q}) &&
      !FB.eventStateReaders.test(s,[{reader:'active_story_stage',args:{storyId:story,stage:'supplies'},not:true}],ctx) && disabledState === JSON.stringify(s);
    raw.systems = systems;
    const cross = JSON.parse(changed);cross.start = {id:'476',era:'late_antique'};
    const crossState = JSON.stringify(cross), identity = !FB.resolveEventOption(cross,ev,opt,ctx,{reviewed:q}) && crossState === JSON.stringify(cross);
    let authority = true;
    if (!imported) {
      const lost = JSON.parse(changed), holder = lost.holder.ravenna;
      lost.authority.governments[holder] = {formId:'territorial'};
      const lostState = JSON.stringify(lost);
      authority = !FB.eventContextStillValid(lost,ev,ctx) && !FB.resolveEventOption(lost,ev,opt,ctx,{reviewed:q}) && lostState === JSON.stringify(lost);
    }
    const fresh = FB.eventReviews.quote(s,opt,ctx), canonical = JSON.parse(changed), automated = JSON.parse(changed);
    const canonicalQuote = FB.stories.quote(canonical,story,'buy_supplies');
    const direct = FB.stories.apply(canonical,story,'buy_supplies',canonicalQuote);
    const auto = FB.resolveEventOption(automated,ev,opt,ctx,{automated:true});
    FB.setRngState(rng);FB.setUidCounter(uid);
    const paid = p.gold, receipt = FB.resolveEventOption(s,ev,opt,ctx,{reviewed:fresh});
    const parity = !!direct && !!auto && !!receipt && p.gold === canonical.player.gold && p.gold === automated.player.gold &&
      JSON.stringify(s.stories[story]) === JSON.stringify(canonical.stories[story]) && JSON.stringify(s.stories[story]) === JSON.stringify(automated.stories[story]);
    const settled = JSON.stringify(s), duplicate = !FB.resolveEventOption(s,ev,opt,ctx,{reviewed:fresh}) && settled === JSON.stringify(s);
    const queued = FB.queueEvent(s,ev.id,ctx);
    if (!queued) throw new Error('Queue failed');
    window.periodCheckpoint = {start:JSON.stringify(s.start),date:JSON.stringify(s.date),gold:p.gold,holdings:JSON.stringify(p.holdings),
      stories:JSON.stringify(s.stories),queue:JSON.stringify(s.eventQueue),people:Object.keys(s.chars).sort(),
      rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),sig:FB.mods.sig()};
    return {repeated:repeated,readPure:readPure,missing:missing,denied:!!denied,refusal:refusal,stale:stale,dead:dead,disabled:disabled,identity:identity,authority:authority,
      parity:parity,duplicate:duplicate,charge:paid-p.gold,saved:FB.save.serialize()};
  },imported);
  expect(result).toMatchObject({repeated:true,readPure:true,missing:true,denied:true,refusal:true,stale:true,dead:true,disabled:true,identity:true,authority:true,parity:true,duplicate:true,charge:imported ? 5 : 3});
  for (let pass = 0; pass < 2; pass++) {
    await restoreBookmark(page,pass ? await page.evaluate(function () {return FB.save.serialize();}) : result.saved);
    expect(await page.evaluate(function () {
      const s = FB.state, c = periodCheckpoint;
      const other = JSON.parse(JSON.stringify(s));other.start = {id:'476',era:'late_antique'};
      // Warm the foreign cache immediately before reading the restored campaign.
      FB.eventYearPool(other);
      return c.start === JSON.stringify(s.start) && c.date === JSON.stringify(s.date) && c.gold === s.player.gold &&
        c.holdings === JSON.stringify(s.player.holdings) && c.stories === JSON.stringify(s.stories) && c.queue === JSON.stringify(s.eventQueue) &&
        JSON.stringify(c.people) === JSON.stringify(Object.keys(s.chars).sort()) && c.rng === (FB.getRngState() >>> 0) && c.uid === FB.getUidCounter() && c.sig === FB.mods.sig() &&
        FB.eventYearPool(s).some(function (ev) {return ev.pack === 'dated_568';}) && !FB.eventYearPool(s).some(function (ev) {return ev.pack === 'dated_493';});
    })).toBe(true);
  }
});

for (const imported of [false,true]) test((imported ? 'ordinary JSON' : 'native') + ' playable review cancels without spending and confirms through the canonical owner',async function ({page},info) {
  await start(page,info,imported);
  await page.evaluate(function (imported) {
    const s = FB.state, story = imported ? 'lantern_household' : 'ravenna_household_track_568';
    if (imported) FB.stories.start(s,{tracks:[story]});
    else if (!FB.stories.apply(s,story,'take_stock',FB.stories.quote(s,story,'take_stock'))) throw new Error('Native supplies stage unavailable');
    const ev = FB.eventById(imported ? 'lantern_household_review' : 'ravenna_stationary_repairs_568');
    Object.assign(FB.game.auto,{all:false,major:false,minor:false});
    FB.ui.runEvents([{id:ev.id,ctx:FB.eventContextFor(s,ev,{})}]);
    window.reviewBefore = JSON.stringify(s);window.reviewGold = s.player.gold;
    window.reviewRng = FB.getRngState();window.reviewUid = FB.getUidCounter();
  },imported);
  const option = page.locator('#ev-options .evopt').filter({hasText:imported ? 'Review supplies' : 'Review the household supplies'});
  async function ready() {await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);}
  await ready();await option.click();await expect(page.locator('#event-review-cancel')).toBeVisible();await ready();
  await page.locator('#event-review-cancel').click();await expect(option).toBeVisible();
  expect(await page.evaluate(function () {return reviewBefore === JSON.stringify(FB.state) && reviewRng === FB.getRngState() && reviewUid === FB.getUidCounter();})).toBe(true);
  await ready();await option.click();await ready();await page.locator('#event-review-confirm').click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  expect(await page.evaluate(function (cost) {return reviewGold - FB.state.player.gold === cost;},imported ? 5 : 3)).toBe(true);
});

test('the Medinan scene offers its existing private provisions review without public powers',async function ({page},info) {
  await startHistoricalGame(page,info,{bookmark:'634',code:'PERIOD-634-medina_household_634-medina-m-Reader-established'});
  const result = await page.evaluate(function () {
    const s = FB.state, story = 'medina_household_track_634';
    for (const choice of ['consider_home','decline_work']) {
      if (!FB.stories.apply(s,story,choice,FB.stories.quote(s,story,choice))) throw new Error('Household account progression failed');
    }
    const ev = FB.eventById('medina_independent_accounts_634'), opt = ev.options[2], ctx = FB.eventContextFor(s,ev,{});
    const gold = s.player.gold, q = FB.eventReviews.quote(s,opt,ctx), before = JSON.stringify(s);
    const pure = !!q && q.quote.allowed && before === JSON.stringify(s);
    const receipt = FB.resolveEventOption(s,ev,opt,ctx,{reviewed:q});
    return {pure:pure,committed:!!receipt,charge:gold-s.player.gold,phase:FB.stories.record(s,story).phase};
  });
  expect(result).toEqual({pure:true,committed:true,charge:2,phase:'holding'});
});

const spring451 = require('../fixtures/authoring/dated-event-isolation-451.json');
dependsOnRuntime(__filename,['data/events_451.js','data/bookmark_451_governments.js','data/bookmark_manifest.js']);

for (const row of spring451.rows) test(row.bookmark + ' restored native pool and delivery exclude every other campaign at the same live year',async function ({page},info) {
  await startHistoricalGame(page,info,row);
  await prepareGameContent(page);
  const snapshot = await page.evaluate(function (row) {
    const s = FB.state;
    // Put every event inside its declared window, including the later local notices.
    s.turn += (row.liveYear - s.date.year) * 360;s.date.year = row.liveYear;
    if (!FB.queueEvent(s,row.eventId,{})) throw new Error('Native notice queue rejected');
    return {saved:FB.save.serialize(),start:s.start,gold:s.player.gold,holdings:s.player.holdings,
      date:s.date,turn:s.turn,queue:s.eventQueue,stories:s.stories,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
  },row);
  // Warm a foreign identity's pool before restoring the real campaign.
  await page.evaluate(function (row) {
    const s = JSON.parse(JSON.stringify(FB.state));s.start.id = '1066';
    delete s.start.revision;
    s.start.era = 'high_medieval';s.date.year = row.liveYear;
    if (FB.eventYearPool(s).some(function (ev) {return ev.pack === row.packId;})) throw new Error('Foreign pool leak');
  },row);
  await restoreBookmark(page,snapshot.saved);
  expect(await page.evaluate(function (expected) {
    const s = FB.state;
    return JSON.stringify(s.start) === JSON.stringify(expected.start) && s.player.gold === expected.gold &&
      JSON.stringify(s.date) === JSON.stringify(expected.date) && s.turn === expected.turn &&
      JSON.stringify(s.player.holdings) === JSON.stringify(expected.holdings) &&
      JSON.stringify(s.eventQueue) === JSON.stringify(expected.queue) && JSON.stringify(s.stories) === JSON.stringify(expected.stories) &&
      FB.getRngState() >>> 0 === expected.rng && FB.getUidCounter() === expected.uid && FB.game.contentReady;
  },snapshot)).toBe(true);
  const result = await page.evaluate(function (row) {
    const original = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter(), faults = [];
    const own = JSON.parse(original), pack = FBDATA.eventPacks[row.packId];
    const events = FBDATA.events.filter(function (ev) {return ev.pack === row.packId;});
    const active = events.filter(function (ev) {
      return (ev.yearMin === undefined || own.date.year >= ev.yearMin) &&
        (ev.yearMax === undefined || own.date.year <= ev.yearMax);
    });
    row.patches.forEach(function (patch) {
      let target = own;
      patch.path.slice(0,-1).forEach(function (key) {target = target[key];});
      target[patch.path[patch.path.length-1]] = JSON.parse(JSON.stringify(patch.value));
    });
    // The real restored queue was checked above. Isolate this delivery from
    // opening decisions: the dispatcher intentionally emits only one per day.
    own.eventQueue = [];
    const first = FB.eventById(row.eventId), ctx = FB.eventContextFor(own,first,{});
    if (!ctx || !FB.queueEvent(own,first.id,{}) || !FB.pickDailyEvents(own).some(function (item) {return item.id === first.id;}))
      faults.push('own queued delivery');
    if (!FB.contentPeriodEnabled(own,pack) || events.some(function (ev) {
      const expected = active.indexOf(ev) >= 0;
      return FB.eventPeriodEnabled(own,ev) !== expected || (FB.eventYearPool(own).indexOf(ev) >= 0) !== expected;
    })) faults.push('restored own pool');
    const others = Object.keys(FBDATA.bookmarks).filter(function (id) {return id !== row.bookmark;});
    others.forEach(function (id) {
      const foreign = JSON.parse(JSON.stringify(own));foreign.start.id = id;
      delete foreign.start.revision;
      // Preserve the positive local facts, era and year: only campaign identity changes.
      foreign.eventQueue = [];
      const before = JSON.stringify(foreign), beforeRng = FB.getRngState(), beforeUid = FB.getUidCounter();
      for (let pass = 0; pass < 2; pass++) {
        if (FB.contentPeriodEnabled(foreign,pack) || events.some(function (ev) {
          return FB.eventPeriodEnabled(foreign,ev) || FB.eventYearPool(foreign).indexOf(ev) >= 0 ||
            FB.eventContextFor(foreign,ev,{}) || FB.ensureEventParticipants(foreign,ev,{}) ||
            FB.queueEvent(foreign,ev.id,{}) || FB.eventContextStillValid(foreign,ev,ctx) ||
            FB.eventOptionStatus(foreign,ev,ev.options[0],ctx).ready ||
            FB.resolveEventOption(foreign,ev,ev.options[0],ctx,{automated:true});
        })) faults.push('foreign routes: ' + id);
      }
      if (before !== JSON.stringify(foreign) || beforeRng !== FB.getRngState() || beforeUid !== FB.getUidCounter())
        faults.push('impure rejection: ' + id);
      foreign.eventQueue = [{id:first.id,ctx:ctx}];foreign.slotDays = [];
      if (FB.pickDailyEvents(foreign).some(function (item) {return item.id === first.id;})) faults.push('queued dispatch: ' + id);
      foreign.eventQueue = [];foreign.slotDays = [foreign.date.day];
      if (FB.pickDailyEvents(foreign).some(function (item) {return events.indexOf(FB.eventById(item.id)) >= 0;}))
        faults.push('random dispatch: ' + id);
      if (FB.eventYearPool(own).filter(function (ev) {return ev.pack === row.packId;}).length !== active.length)
        faults.push('return cache: ' + id);
    });
    FB.setRngState(rng);FB.setUidCounter(uid);
    return {faults:faults,count:events.length,active:active.length,others:others,
      pure:original === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },row);
  expect(result.faults).toEqual([]);
  expect(result.count).toBe(22);
  expect(result.active).toBe(22);
  expect(result.others).toEqual(expect.arrayContaining(['867','1066']));
  expect(result.others.length).toBeGreaterThanOrEqual(10);
  expect(result.pure).toBe(true);
});
