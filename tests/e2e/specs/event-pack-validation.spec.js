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
dependsOnRuntime(__filename,['js/ui_modals.js','js/world.js']);

// Append fixture registrations here; the discovery assertion prevents silent omissions.
const fixtureFiles = [
  {file:'451.json',runtime:['data/events_451.js','data/bookmark_451_governments.js','data/bookmark_manifest.js','js/wars.js','js/save.js','js/save_v4.js']},
  {file:'imperial_office.json',runtime:['data/events_imperial_office.js','data/political_institutions.js','js/government_administration.js','js/government_recognition.js']},
  {file:'imperial_service.json',runtime:['data/events_imperial_service.js','data/story_imperial_service.js','data/starts_imperial_officer.js','data/office_mandates.js','js/office_mandates.js','js/story_household.js','js/story_ruler_agenda.js','js/story_opening_goals.js','data/bookmark_manifest.js']},
  {file:'state-readers-native.json',runtime:['data/events_common.js','data/industry_laws.js']}
  ,{file:'711.json',runtime:['data/events_711.js','js/lordships.js']}
  ,{file:'800.json',runtime:['data/events_800.js','js/lordships.js']}
  ,{file:'religious_life.json',runtime:['data/events_religious_life.js','data/religious_activities.js','data/religious_institutions.js','data/episcopal_claims.js','data/religious_cases.js','data/holy_war_causes.js','js/religious_activities.js','js/holywar.js']}
  ,{file:'mobile_life.json',runtime:['data/events_mobile_life.js','data/starts_mobile_principal.js','data/mobile_confederations.js','data/bookmark_1204_terrain.js']}
  ,{file:'federate_life.json',runtime:['data/events_federate_life.js','data/political_institutions.js','data/mobile_confederations.js','js/story_agreements.js','js/story_household_refuge.js']}
  ,{file:'works_technology.json',runtime:['data/events_works_technology.js','js/production.js','js/production_economy.js','js/site_resources.js','js/building_operations.js','js/building_profiles.js','js/building_seasons.js','js/maritime_work.js']}
  ,{file:'kingship_succession.json',runtime:['data/events_kingship_succession.js','js/lordships.js','js/government_selection.js','js/government_recognition.js','js/government_aristocracy.js','js/story_settlements.js','js/story_ruler_agenda.js','data/bookmark_800_history.js','data/story_ruler_agendas.js','data/story_ruler_agendas_800.js']}
  ,{file:'civic_assembly.json',runtime:['data/events_civic_assembly.js','data/industry_laws.js','data/civic_profiles.js','data/assembly_polities.js','js/civic_transactions.js','js/government_civic.js','js/government_support.js','js/government_collective.js','js/actions.js','js/parliament.js','js/justice.js']}
  ,{file:'493.json',runtime:['data/events_493.js']}
  ,{file:'568.json',runtime:['data/events_568.js','data/story_households_568_ravenna.js','js/story_household.js']}
  ,{file:'634.json',runtime:['data/events_634.js','data/story_households_634_medina.js','js/story_household.js']}
  ,{file:'1096.json',runtime:['data/events_1096.js','data/story_households_rhineland_1096.js','data/bookmark_1096_western_expeditions.js']}
  ,{file:'1204.json',runtime:['data/events_1204.js','data/industry_laws.js','data/episcopal_claims.js','data/religious_cases.js','data/holy_war_causes.js']}
  ,{file:'1241.json',runtime:['data/events_1241.js','data/story_koten_1241.js','data/bookmark_1241_operations.js']}
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

// Each semantic row owns a fresh page and cloned state. Only these independent
// cases are parallel groups, so sharding can divide a growing fixture catalogue.
test.describe('independent event eligibility',function () {
test.describe.configure({mode:'parallel'});
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
});

// Empty declarations share the normal period validator and add no random pool members.
dependsOnRuntime(__filename,['index.html','data/bookmark_manifest.js',
  'data/events_imperial_office.js','data/events_federate_life.js','data/events_civic_assembly.js',
  'data/events_religious_life.js','data/events_kingship_succession.js','data/events_works_technology.js',
  'data/events_493.js','data/events_568.js','data/events_634.js','data/events_711.js','data/events_800.js',
  'data/events_1096.js','data/events_1204.js','data/events_1241.js','data/events_mobile_life.js','data/events_imperial_service.js']);

const {prepareGameContent} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');

test.describe('retained household decisions in 451',function () {
test.describe.configure({mode:'parallel'});
for (const row of [
  {event:'constantinople_church_copy_451',county:'constantinople',holding:'letters',cost:30},
  {event:'orleans_door_list_451',county:'orleans',flag:'gate_list_451',chance:'gate_explanation_451',cost:1},
  {event:'paris_road_notes_451',county:'paris',flag:'road_notes_451',chance:'road_inquiry_451',cost:1},
  {event:'thessalonica_reserve_list_451',county:'thessaloniki',flag:'reserve_list_451',chance:'reserve_accounts_451',cost:1}
]) test(row.event + ' retains its private cost and useful preparation after two restores',async function ({page},info) {
  await startHistoricalGame(page,info,{bookmark:'451',code:'PACK-451-farmer_451-' + row.county + '-m-Reader'});
  await prepareGameContent(page);
  const before = await page.evaluate(function (row) {
    const s = FB.state, ev = FB.eventById(row.event);
    // Stage the finite calendar boundary; no daily simulation or public war is needed.
    s.turn += 270;s.date.season = 3;s.date.day = 1;
    s.player.gold = 100;s.player.holdings = [];
    const local = s, originalWars = s.wars;
    if (ev.trigger.realmAtWar) {
      const owner = local.owner[row.county];
      local.wars = {war_fixture:{id:'war_fixture',attacker:owner,defender:'east_451',status:'active',startedTurn:0}};
    }
    // War is an eligibility fact for the local scene, never an event reward.
    const ctx = FB.eventContextFor(local,ev,{});
    const refusal = JSON.parse(JSON.stringify(local)), poor = JSON.parse(JSON.stringify(local));
    poor.player.gold = 0;
    const denied = !FB.eventOptionStatus(poor,ev,ev.options[0],ctx).ready;
    const refused = FB.resolveEventOption(refusal,ev,ev.options[1],ctx,{automated:true});
    const chanceBefore = row.chance ? FB.namedChance(local,row.chance,{}) : null;
    const accepted = FB.resolveEventOption(local,ev,ev.options[0],ctx,{automated:true});
    const chanceAfter = row.chance ? FB.namedChance(local,row.chance,{}) : null;
    if (!accepted) throw new Error('Household decision rejected');
    // The synthetic eligibility fact is separate from the real private transaction.
    s.wars = originalWars;
    s.eventQueue = [];
    return {denied:denied,refused:!!refused,refusalGold:refusal.player.gold,gold:s.player.gold,
      holdings:s.player.holdings,flags:s.player.flags,chanceBefore:chanceBefore,chanceAfter:chanceAfter,
      saved:FB.save.serialize(),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),start:s.start};
  },row);
  expect(before.denied).toBe(true);
  expect(before.refused).toBe(true);
  expect(before.refusalGold).toBe(100);
  expect(before.gold).toBe(100-row.cost);
  if (row.holding) expect(before.holdings).toContain(row.holding);
  if (row.flag) {
    expect(before.flags[row.flag]).toBeTruthy();
    expect(before.chanceAfter).toBeGreaterThan(before.chanceBefore);
    expect(before.chanceAfter).toBeCloseTo(Math.min(0.85,before.chanceBefore+0.15),10);
  }
  for (let pass=0;pass<2;pass++) {
    await restoreBookmark(page,before.saved);
    const retained = await page.evaluate(function (row) {
      const s = FB.state, ev = FB.eventById(row.event), ctx = FB.eventContextFor(s,ev,{});
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const pool = FB.eventYearPool(s).filter(function (e) {return e.pack === 'dated_451';});
      const duplicate = !FB.checkTrigger(s,ev.options[0].require,ctx);
      return {gold:s.player.gold,holdings:s.player.holdings,flags:s.player.flags,start:s.start,
        count:pool.length,duplicate:duplicate,pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        rng:rng >>> 0,uid:uid,saved:FB.save.serialize()};
    },row);
    expect(retained.gold).toBe(before.gold);
    expect(retained.holdings).toEqual(before.holdings);
    expect(retained.flags).toEqual(before.flags);
    expect(retained.start).toEqual(before.start);
    expect(retained.count).toBe(22);
    expect(retained.duplicate).toBe(true);
    expect(retained.pure).toBe(true);
    expect(retained.rng).toBe(before.rng);
    expect(retained.uid).toBe(before.uid);
    before.saved = retained.saved;
  }
});
});

test('451 county-local season triggers stay reachable under each county climate',async function ({page},info) {
  await startHistoricalGame(page,info,{bookmark:'451',code:'PACK-451-farmer_451-ravenna-m-Reader'});
  const result = await page.evaluate(function () {
    const unreachable=[],checked=[];
    FBDATA.events.filter(function (ev) {return ev.pack==='dated_451' && ev.trigger && ev.trigger.seasonKinds;}).forEach(function (ev) {
      checked.push(ev.id);
      (ev.trigger.countyIds || []).forEach(function (county) {
        // The calendar's winter is a county's own kind: mild winter in a Mediterranean county.
        if (ev.trigger.seasonKinds.indexOf(FB.seasonKindAt(county,3,FB.campaignBookmark(FB.state)))<0)
          unreachable.push(ev.id + ': ' + county + ' ' + FB.seasonKindAt(county,3,FB.campaignBookmark(FB.state)));
      });
    });
    return {checked:checked,unreachable:unreachable};
  });
  expect(result.checked.length).toBe(5);
  expect(result.unreachable).toEqual([]);
});
dependsOnRuntime(__filename,['js/climate.js','data/climate.js']);
