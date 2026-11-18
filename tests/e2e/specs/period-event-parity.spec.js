'use strict';
const {test,expect} = require('../support/fixture');
const {startParityGame} = require('../support/game/parity');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['js/events.js','js/schema.js','js/governments.js','js/authority.js',
  'js/federates.js','js/mobile_confederations.js','js/religious_institutions.js','js/industry_laws.js',
  'js/episcopal_claims.js','js/religious_cases.js','js/story_track.js','js/systems.js',
  'data/events_common.js','data/systems.js','data/technology.js']);

for (const bookmark of ['867','1066']) test(bookmark + ' fixed-seed event selection matches the pre-observation catalogue without reader work',async function ({page},info) {
  await startParityGame(page,info,{bookmark:bookmark,code:'PERIOD-'+bookmark+'-farmer-london-m-Period'});
  const result = await page.evaluate(function () {
    const s=FB.state,all=FBDATA.events,baseline=JSON.stringify(s),uid=FB.getUidCounter();
    const additions=all.filter(function (e) {return !!(e.trigger && e.trigger.state);});
    const excluded=additions.every(function (e) {return !FB.eventPeriodEnabled(s,e);});
    let reads=0;const native=FB.eventStateReaders.test;
    FB.eventStateReaders.test=function () {reads++;return native.apply(this,arguments);};
    function sequence(events) {
      const state=JSON.parse(baseline);FBDATA.events=events;FB.invalidateEventIndex();
      FB.setRngState(8671066);FB.setUidCounter(uid);
      const rows=[];
      // Repeated selection passes only: no daily simulation or effect replay.
      for (let i=0;i<24;i++) {
        state.eventQueue=[];state.slotDays=[state.date.day];
        rows.push({events:FB.pickDailyEvents(state),rng:FB.getRngState(),uid:FB.getUidCounter()});
      }
      return rows;
    }
    const control=sequence(all.filter(function (e) {return additions.indexOf(e)<0;}));
    const current=sequence(all);
    FB.eventStateReaders.test=native;FBDATA.events=all;FB.invalidateEventIndex();
    return {control:control,current:current,excluded:excluded,additions:additions.map(function (e) {return e.id;}),reads:reads};
  });
  expect(result.additions).toEqual(['operating_terms_notice']);
  expect(result.excluded).toBe(true);
  expect(result.reads).toBe(0);
  expect(result.current).toEqual(result.control);
});
