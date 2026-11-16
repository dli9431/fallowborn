'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const runtimeInputs=['js/events.js','js/schema.js','js/mods.js','js/systems.js',
  'js/governments.js','js/authority.js','js/federates.js','js/mobile_confederations.js',
  'js/religious_institutions.js','js/industry_laws.js','js/episcopal_claims.js',
  'js/religious_cases.js','js/story_track.js','data/systems.js'];

// Append fixture registrations here; the discovery assertion prevents silent omissions.
const fixtureFiles = [
  {file:'state-readers-native.json',runtime:['data/events_common.js','data/industry_laws.js']}
  ,{file:'711.json',runtime:['data/events_711.js','js/lordships.js']}
  ,{file:'800.json',runtime:['data/events_800.js','js/lordships.js']}
];
dependsOnRuntime(__filename,fixtureFiles.reduce(function (out,entry) {return out.concat(entry.runtime);},runtimeInputs));
const directory = path.resolve(__dirname,'../fixtures/event-packs');

test('every event pack and registered semantic fixture has a valid declaration',async function ({page},info) {
  const registered=fixtureFiles.map(function (entry) {return entry.file;});
  expect(registered.slice().sort()).toEqual(fs.readdirSync(directory).filter(function (f) {return f.endsWith('.json');}).sort());
  expect(new Set(registered).size).toBe(fixtureFiles.length);
  await openGame(page,info);
  const fixtures = fixtureFiles.map(function (entry) {return require(path.join(directory,entry.file));});
  const result = await page.evaluate(function (fixtures) {
    const faults = [], ids = new Set(), packs = FBDATA.eventPacks;
    const rows = fixtures.reduce(function (out,f) {return out.concat(f.rows);},[]);
    Object.keys(packs).forEach(function (id) {
      const p = packs[id], fault = FB.contentPeriodFault(p);
      if (fault || !Array.isArray(p.eras) || !p.eras.length) faults.push(id + ': ' + fault);
    });
    FBDATA.events.forEach(function (ev) {
      if (ids.has(ev.id) || !packs[ev.pack]) faults.push(ev.id + ': duplicate or unregistered pack');
      ids.add(ev.id);
      const fault = FB.validateEventPeriod(ev,packs);
      if (fault) faults.push(ev.id + ': ' + fault);
      faults.push.apply(faults,FB.validateEventStateConditions(ev));
      FB.validateEventParticipants(ev);
      if (ev.pack && !Array.isArray(ev.options)) faults.push(ev.id + ': missing options');
    });
    faults.push.apply(faults,FB.validateEventLifecycle(FBDATA.eventSubscriptions,FBDATA.events));
    faults.push.apply(faults,FB.validateEventChances(FBDATA.eventChances,FBDATA.events));
    fixtures.filter(function (f) {return !!f.packId;}).forEach(function (fixture) {
      const pack=packs[fixture.packId],events=FBDATA.events.filter(function (e) {return e.pack===fixture.packId;});
      const bounds=fixture.eventCount || {min:20,max:24};
      if (!pack || !Number.isInteger(pack.yearMin) || !Number.isInteger(pack.yearMax) ||
          !Number.isInteger(bounds.min) || !Number.isInteger(bounds.max) || bounds.min<1 || bounds.max>64 ||
          bounds.max<bounds.min || events.length<bounds.min || events.length>bounds.max)
        faults.push(fixture.packId + ': explicit period and event count');
      let decisions=0;
      const scalar=['gold','prestige','piety','health','skills','popularOpinion','liegeOpinion','opinion','log','goldCounterparty'];
      events.forEach(function (ev) {
        const subscriptions=(FBDATA.eventSubscriptions || {})[ev.id] || [];
        if (!(ev.trigger && ev.trigger.state && ev.trigger.state.length) && !subscriptions.length && !ev.contextValidator)
          faults.push(ev.id + ': missing state condition or system moment');
        if (!fixture.rows.some(function (row) {return row.eventId===ev.id;})) faults.push(ev.id + ': missing semantic row');
        if (fixture.rows.some(function (row) {return row.eventId===ev.id && (row.readers || []).length===0;}) &&
            !subscriptions.length && !ev.contextValidator) faults.push(ev.id + ': missing moment assertion');
        if ((ev.options || []).some(function (option) {
          if (option.review) return true;
          return [option.effects,option.success && option.success.effects,option.failure && option.failure.effects].some(function (fx) {
            return fx && Object.keys(fx).some(function (key) {return scalar.indexOf(key)<0;});
          });
        })) decisions++;
      });
      if (decisions<Math.ceil(events.length/3)) faults.push(fixture.packId + ': fewer than one third non-scalar decisions');
      fixture.rows.forEach(function (row) {if (!events.some(function (e) {return e.id===row.eventId;})) faults.push(row.eventId + ': wrong fixture pack');});
    });
    rows.forEach(function (row) {
      const ev = FB.eventById(row.eventId), expected = row.readers.slice().sort();
      if (!ev || !row.bookmark || !row.code || !row.cases.length) {faults.push('Malformed fixture ' + row.eventId);return;}
      const subscription = row.hook && (FBDATA.eventSubscriptions[ev.id] || []).find(function (r) {return r.hook===row.hook;});
      const condition = row.hook ? subscription && subscription.require : row.optionIndex === undefined ? ev.trigger : ev.options[row.optionIndex].require;
      const actual = (condition && condition.state || []).map(function (c) {return c.reader;}).sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) faults.push(row.eventId + ': reader inventory');
      if (!row.cases.some(function (c) {return c.expected === true;}) ||
          !row.cases.some(function (c) {return c.expected === false;})) faults.push(row.eventId + ': missing polarity');
    });
    return {faults:faults,packs:Object.keys(packs).length,events:ids.size};
  },fixtures);
  expect(result.faults).toEqual([]);
  expect(result.packs).toBeGreaterThan(0);
  expect(result.events).toBeGreaterThan(0);
});

for (const entry of fixtureFiles) {
  const file=entry.file;
  const fixture = require(path.join(directory,file));
  for (const row of fixture.rows) test(file + ': ' + row.eventId + (row.optionIndex === undefined ? '' : ' option ' + row.optionIndex),async function ({page},info) {
    await startHistoricalGame(page,info,{bookmark:row.bookmark,code:row.code});
    const result = await page.evaluate(function (row) {
      const original = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
      return row.cases.map(function (example) {
        const state = JSON.parse(original);
        (example.patches || []).forEach(function (patch) {
          if (!Array.isArray(patch.path) || !patch.path.length || patch.path.some(function (k) {
            return ['__proto__','constructor','prototype'].indexOf(k) >= 0;
          })) throw new Error('Invalid fixture patch');
          let target = state;
          patch.path.slice(0,-1).forEach(function (key) {target = target[key];});
          target[patch.path[patch.path.length-1]] = JSON.parse(JSON.stringify(patch.value));
        });
        const ev = FB.eventById(row.eventId), before = JSON.stringify(state);
        const subscription = row.hook && (FBDATA.eventSubscriptions[ev.id] || []).find(function (r) {return r.hook===row.hook;});
        if (row.hook && !subscription) throw new Error('Missing fixture lifecycle hook');
        const condition = row.hook ? subscription.require : row.optionIndex === undefined ? ev.trigger : ev.options[row.optionIndex].require;
        const actual = FB.eventPeriodEnabled(state,ev) && (row.contextCheck
          ? FB.eventContextStillValid(state,ev,row.context || {}) : FB.checkTrigger(state,condition,row.context || {}));
        return {actual:actual,expected:example.expected,pure:before === JSON.stringify(state) &&
          original === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      });
    },row);
    for (const example of result) {expect(example.actual).toBe(example.expected);expect(example.pure).toBe(true);}
  });
}

// Empty declarations share the normal period validator and add no random pool members.
dependsOnRuntime(__filename,['index.html','data/bookmark_manifest.js',
  'data/events_imperial_office.js','data/events_federate_life.js','data/events_civic_assembly.js',
  'data/events_religious_life.js','data/events_kingship_succession.js','data/events_works_technology.js',
  'data/events_493.js','data/events_568.js','data/events_634.js','data/events_711.js','data/events_800.js',
  'data/events_1096.js','data/events_1204.js','data/events_1241.js','data/events_mobile_life.js','data/events_imperial_service.js']);
