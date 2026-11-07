'use strict';
const {test,expect} = require('../support/fixture');
const path = require('path');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmark,beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_634_medina.js','data/story_households_634_medina.js',
  'data/bookmark_634.js','data/starts_634_ordinary.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_sources.js','data/story_instances.js','data/starts.js','data/actions.js','data/travel.js',
  'data/economy.js','data/eras.js','data/systems.js','data/technology.js',
  'data/bookmark_634_courts.js','js/story_household_observer.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/story_household.js',
  'js/stories.js','js/starts.js','js/bookmark_setup.js','js/actions.js','js/travel.js',
  'js/main.js','js/model.js','js/world.js','js/save.js','js/save_v4.js','js/i18n.js','js/mods.js'
]);

async function begin(page,info,full) {
  if (full) {
    await openGame(page,info); await prepareGameContent(page);
    await page.evaluate(function () {
      // Review the integrated courts without changing shipped visibility.
      FBDATA.bookmarks['634'].revision = 'core_courts_v4';
      FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden = false;
    });
    await beginBookmarkFromTitle(page,'634','medina_household_634');
  } else await beginBookmark(page,info,'634','medina_household_634');
  await page.evaluate(function () {
    const id = 'medina_household_track_634';
    window.medinaReview = {
      pick:function (choice) { const s = FB.state; return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)); },
      day:function () { FB.stories.get(id).day(FB.state,FB.state.stories[id]); },
      phase:function () { return FB.state.stories[id].phase; },
      facts:function () {
        const s = FB.state;
        return JSON.stringify({stories:s.stories,gold:s.player.gold,property:s.player.land,
          plots:s.player.landPlots,holdings:s.player.holdings,owner:s.owner,setup:s.bookmarkSetup,
          rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()});
      },
      roundTrip:function () {
        const before = this.facts();
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return before === this.facts();
      }
    };
  });
}

test('Medina remains offered in the selectable opening while the expanded courts stay hidden',async function ({page},info) {
  await openGame(page,info); await prepareGameContent(page);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634'), sc = FBDATA.startScenarios.find(function (r) { return r.id === 'medina_household_634'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const county = b.provinces.find(function (p) { return p.id === 'medina'; });
    const absent = JSON.parse(JSON.stringify(b));
    absent.provinces.find(function (p) { return p.id === 'medina'; }).communities = [{culture:'arabian_476',religion:'jewish',populationShare0:10000}];
    absent.revision = 'unsupported';
    const rejected = FB.mods.startDefinitionFaults(sc,absent,FB.stories);
    absent.startLocations.medina_household_634 = [];
    return {errors:FB.validateBookmark(b),hidden:FB.bookmark('634','core_courts_v4').hidden,available:FB.bookmarkAvailable('634'),fresh:b.revision,
      local:FB.startProvinceAllowed(sc,b,'medina'),away:FB.startProvinceAllowed(sc,b,'mecca'),
      tracks:FB.startStoryTracks(sc,'medina'),pair:county.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion; }),
      unsupported:rejected.length > 0,excluded:!FB.startProvinceAllowed(sc,absent,'medina'),
      noFronts:!FBDATA.storyInstances.syrian_front_634 && !FBDATA.storyInstances.iraqi_front_634,
      noSources:!FBDATA.storyInstances.medina_household_track_634.requires,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({errors:[],hidden:true,available:true,fresh:'core_identities_v3',local:true,away:false,tracks:['medina_household_track_634'],
    pair:true,unsupported:true,excluded:true,noFronts:true,noSources:true,pure:true});
  await begin(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], t = s.stories.medina_household_track_634;
    const court = s.realms.rashidun_634.succession, ruler = court.members[court.rulerMemberId];
    return {phase:t.phase,actor:t.actorId === c.id,home:s.player.provinceId,age:FB.ageOf(c,s.date.year),
      identity:[c.culture,c.religion],family:FB.householdMembers(s).length > 1,profession:s.player.profession,
      separate:c.id !== ruler.charId && c.name !== 'Umar',oneRuler:Object.keys(court.members).length,
      jobs:!!t.jobs,institutions:Object.keys(s.localInstitutions || {}).length,errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',actor:true,home:'medina',age:24,identity:['arabic','early_islam_634'],family:true,
    profession:'farmer',separate:true,oneRuler:1,jobs:false,institutions:0,errors:[]});
});

for (const ending of ['continue_farming','leave_future_open']) {
  test('all eight beats conclude at home without campaigns or grants: ' + ending,async function ({page},info) {
    await begin(page,info);
    expect(await page.evaluate(function (ending) {
      const r = medinaReview, s = FB.state;
      const resources = JSON.stringify([s.player.gold,s.player.piety,s.player.prestige,s.player.profession,s.owner,s.realms,s.localInstitutions,s.religiousHeads,s.player.landPlots]);
      const chosen = ['consider_home','decline_work','preserve_savings','keep_day','reflect','review_obligations',ending].map(function (c) { return r.pick(c); });
      const unchanged = resources === JSON.stringify([s.player.gold,s.player.piety,s.player.prestige,s.player.profession,s.owner,s.realms,s.localInstitutions,s.religiousHeads,s.player.landPlots]);
      const phase = r.phase(), exact = r.roundTrip();
      r.day(); r.day();
      return {chosen:chosen,phase:phase,exact:exact,repeat:r.pick(ending),terminal:r.phase() === phase,
        unchanged:unchanged,
        fronts:!!FB.state.stories.syrian_front_634 || !!FB.state.stories.iraqi_front_634};
    },ending)).toEqual({chosen:[true,true,true,true,true,true,true],phase:ending === 'continue_farming' ? 'farming' : 'open_future',exact:true,repeat:false,terminal:true,unchanged:true,fronts:false});
  });
}

test('focus selection, gifts and restore do not substitute for actual paid farming',async function ({page},info) {
  await begin(page,info);
  expect(await page.evaluate(function () {
    const r = medinaReview; let s = FB.state;
    r.pick('consider_home'); const money = s.player.gold;
    const selected = r.pick('work_land'), noPay = money === s.player.gold, pending = r.phase();
    s.player.gold += 9; r.day(); const gift = r.phase(), beforePaid = r.roundTrip();
    s = FB.state; const cash = s.player.gold;
    s.turn++; FB.tickFocus(s);
    const phase = r.phase(), paid = s.player.gold > cash, afterPaid = r.roundTrip();
    return {selected:selected,noPay:noPay,pending:pending,gift:gift,beforePaid:beforePaid,paid:paid,phase:phase,afterPaid:afterPaid};
  })).toEqual({selected:true,noPay:true,pending:'working',gift:'working',beforePaid:true,paid:true,phase:'accounts',afterPaid:true});
});

test('unavailable farming and a declined wait retain the costless household route',async function ({page},info) {
  await begin(page,info);
  expect(await page.evaluate(function () {
    const r = medinaReview, s = FB.state, id = 'medina_household_track_634';
    r.pick('consider_home'); s.player.profession = 'craftsman';
    const unavailable = FB.stories.quote(s,id,'work_land').allowed, alternative = FB.stories.quote(s,id,'decline_work').allowed;
    s.player.profession = 'farmer'; r.pick('work_land'); const skipped = r.pick('skip_wait');
    return {unavailable:unavailable,alternative:alternative,skipped:skipped,phase:r.phase(),restored:r.roundTrip()};
  })).toEqual({unavailable:false,alternative:true,skipped:true,phase:'accounts',restored:true});
});

test('the optional holding day requires a free day and replaces focus income once',async function ({page},info) {
  await begin(page,info);
  expect(await page.evaluate(function () {
    const r = medinaReview, s = FB.state, id = 'medina_household_track_634';
    ['consider_home','decline_work','household_needs'].forEach(function (c) { r.pick(c); });
    FB.setFocus(s,'work_land');
    s.player.flags.in_prison = 1;
    const blocked = FB.stories.quote(s,id,'attend_holding').allowed, fallback = FB.stories.quote(s,id,'keep_day').allowed;
    delete s.player.flags.in_prison;
    const quote = FB.stories.quote(s,id,'attend_holding');
    const turn = s.turn, gold = s.player.gold, uid = FB.getUidCounter(), plots = JSON.stringify(s.player.landPlots);
    const tick = FB.tickFocus; let focusCalls = 0;
    FB.tickFocus = function (state) { focusCalls++; return tick(state); };
    let used;
    try { used = FB.stories.apply(s,id,'attend_holding',quote); }
    finally { FB.tickFocus = tick; }
    return {blocked:blocked,fallback:fallback,used:used,days:s.turn - turn,focusCalls:focusCalls,
      noIncome:s.player.gold <= gold,phase:r.phase(),repeat:FB.stories.apply(s,id,'attend_holding',quote),
      noPlot:plots === JSON.stringify(s.player.landPlots),noPerson:uid === FB.getUidCounter(),restored:r.roundTrip()};
  })).toEqual({blocked:false,fallback:true,used:true,days:1,focusCalls:0,noIncome:true,phase:'devotion',repeat:false,noPlot:true,noPerson:true,restored:true});
});

for (const change of ['departure','faith','control','death','succession']) {
  test('stale review and matching restore preserve the ' + change + ' conclusion',async function ({page},info) {
    await begin(page,info);
    expect(await page.evaluate(function (change) {
      const r = medinaReview, s = FB.state, id = 'medina_household_track_634';
      const actor = s.player.charId, relatives = FB.householdMembers(s).filter(function (c) { return c.id !== actor; }).map(function (c) { return [c.id,c.homeProvinceId]; });
      const quote = FB.stories.quote(s,id,'consider_home'), cash = s.player.gold;
      if (change === 'departure') {
        // The ordinary journey owner makes a real personal departure; no story travel adapter is added.
        s.player.gold = 1000;
        const purpose = 'service';
        const destination = Object.keys(s.realms).filter(function (id) { return s.realms[id].capital !== 'medina'; }).find(function (id) {
          return !!FB.travelRealmSnapshot(s,purpose,id);
        });
        if (!destination || !FB.travelStart(s,purpose,FB.travelRealmSnapshot(s,purpose,destination).destinationId,destination)) throw new Error('No ordinary personal journey');
      }
      if (change === 'faith') s.chars[actor].religion = 'jewish';
      if (change === 'control') FB.transferProvince(s,'medina','byzantium_634');
      if (change === 'death') s.player.dead = true;
      if (change === 'succession') s.player.charId = relatives[0][0];
      const stale = FB.stories.apply(s,id,'consider_home',quote);
      r.day(); const phase = r.phase();
      return {stale:stale,phase:phase,actor:FB.state.stories[id].actorId === actor,
        relatives:relatives.every(function (row) { return s.chars[row[0]].homeProvinceId === row[1]; }),
        noGrant:change === 'departure' || s.player.gold === cash,restored:r.roundTrip()};
    },change)).toEqual({stale:false,phase:change === 'departure' ? 'remote' : change === 'faith' ? 'changed_identity' : change === 'control' ? 'changed_rule' : 'interrupted',actor:true,relatives:true,noGrant:true,restored:true});
  });
}

test('late review never replays accession and hidden restore leaves absent stories absent',async function ({page},info) {
  await begin(page,info);
  const saved = await page.evaluate(function () {
    const s = FB.state, r = medinaReview;
    s.date.year = 640;
    r.day();
    if (r.phase() !== 'household') throw new Error('Late review incorrectly expired');
    if (!r.pick('close_opening') || !r.pick('leave_future_open') || !r.roundTrip()) throw new Error('Late close failed');
    const saved = JSON.parse(FB.save.serialize());
    delete saved.state.stories.medina_household_track_634;
    // Current saves retain successful original attachments, including closed tracks.
    const before = r.facts(); let rejected = false;
    try { FB.save.restore(saved); } catch (error) { rejected = true; }
    if (!rejected || before !== r.facts()) throw new Error('Missing original track was accepted or mutated the campaign');
    // Genuine legacy saves have neither provenance field; absence is not new opt-in.
    delete saved.state.start.storyAttachments;
    delete saved.storyAttachmentSchema;
    FBDATA.bookmarks['634'].hidden = true;
    return JSON.stringify(saved);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('634').hidden,absent:!FB.state.stories.medina_household_track_634,
      fronts:!!FB.state.stories.syrian_front_634 || !!FB.state.stories.iraqi_front_634};
  })).toEqual({hidden:true,absent:true,fronts:false});
});

test('court and community reviews conclude at home with private and public authority separate',async function ({page},info) {
  await begin(page,info,true);
  expect(await page.evaluate(function () {
    const r = medinaReview, s = FB.state, actor = s.player.charId;
    const publicFacts = JSON.stringify([s.realms,s.owner,s.localInstitutions,s.religiousHeads]);
    const privateFacts = JSON.stringify([s.player,s.chars]);
    const turn = s.turn, rng = FB.getRngState(), uid = FB.getUidCounter();
    const results = ['review_court','review_current_authority','consider_notice','review_local_records','decline_work',
      'preserve_savings','keep_day','family_affairs','independent_livelihood','continue_farming'].map(function (choice) { return r.pick(choice); });
    const court = s.realms.rashidun_634.succession;
    const beforeRestore = r.facts();
    const once = r.roundTrip(), twice = r.roundTrip();
    return {results:results,phase:r.phase(),home:s.player.provinceId,turn:s.turn === turn,
      publicSame:publicFacts === JSON.stringify([s.realms,s.owner,s.localInstitutions,s.religiousHeads]),
      privateSame:privateFacts === JSON.stringify([s.player,s.chars]),
      independent:!s.realms.player && court.members[court.rulerMemberId].charId !== actor,
      randomSame:rng === FB.getRngState() && uid === FB.getUidCounter(),
      exact:once && twice && beforeRestore === r.facts(),jobs:!!s.stories.medina_household_track_634.jobs};
  })).toEqual({results:[true,true,true,true,true,true,true,true,true,true],phase:'farming',home:'medina',turn:true,
    publicSame:true,privateSame:true,independent:true,randomSame:true,exact:true,jobs:false});
});

test('provisions cost exactly the reviewed private amount and cannot replay after restore',async function ({page},info) {
  await begin(page,info,true);
  const result = await page.evaluate(function () {
    const r = medinaReview, s = FB.state, id = 'medina_household_track_634';
    r.pick('consider_home'); r.pick('decline_work');
    const publicFacts = JSON.parse(FB.save.serialize()).state.realms, property = JSON.stringify(s.player.landPlots), turn = s.turn;
    s.player.gold = 1;
    const blocked = FB.stories.quote(s,id,'buy_provisions').allowed;
    const free = FB.stories.quote(s,id,'household_needs').allowed;
    s.player.gold = 20;
    const stale = FB.stories.quote(s,id,'buy_provisions'); s.player.gold = 19;
    const rejected = FB.stories.apply(s,id,'buy_provisions',stale), before = s.player.gold;
    const bought = r.pick('buy_provisions'), spent = before - s.player.gold;
    const exact = r.roundTrip(), repeat = r.pick('buy_provisions');
    return {blocked:blocked,free:free,rejected:rejected,bought:bought,spent:spent,exact:exact,repeat:repeat,
      phase:r.phase(),gold:FB.state.player.gold,days:FB.state.turn - turn,
      publicBefore:publicFacts,publicAfter:JSON.parse(FB.save.serialize()).state.realms,property:property === JSON.stringify(FB.state.player.landPlots)};
  });
  expect(result.publicAfter).toEqual(result.publicBefore);
  delete result.publicAfter; delete result.publicBefore;
  expect(result).toEqual({blocked:false,free:true,rejected:false,bought:true,spent:2,exact:true,repeat:false,
    phase:'holding',gold:17,days:0,property:true});
});

test('opening accession and a new incumbent within the same court produce no sovereignty notice',async function ({page},info) {
  await begin(page,info,true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'medina_household_observer_634', m = FB.stories.get(id), t = s.stories[id];
    const before = JSON.stringify(t), court = s.realms.rashidun_634;
    m.day(s,t); m.season(s,t);
    const quietOpening = !FB.stories.status(s,id) && before === JSON.stringify(t);
    court.ruler.generation++; court.succession.rulerGeneration++;
    m.day(s,t);
    const quote = FB.stories.quote(s,'medina_household_track_634','review_court');
    const snapshot = JSON.stringify(s);
    FB.stories.status(s,id); FB.stories.choices(s,id);
    return {quietOpening:quietOpening,sameCourt:before === JSON.stringify(t),pending:t.pending.length,
      personal:quote.allowed,pure:snapshot === JSON.stringify(s),exact:medinaReview.roundTrip()};
  })).toEqual({quietOpening:true,sameCourt:true,pending:0,personal:true,pure:true,exact:true});
});

test('actual local sovereignty has one notice independent of the personal conclusion',async function ({page},info) {
  await begin(page,info,true);
  expect(await page.evaluate(function () {
    let s = FB.state;
    const r = medinaReview, id = 'medina_household_observer_634', m = FB.stories.get(id);
    r.pick('close_opening'); r.pick('leave_future_open');
    const resources = JSON.stringify([s.player.gold,s.player.piety,s.player.prestige,s.player.landPlots]);
    s.turn = 4; FB.transferProvince(s,'medina','byzantium_634'); FB.stories.day(s);
    const event = s.stories[id].pending[0].event;
    const actual = event.source === 'control' && event.milestone === 'rule_changed' && event.turn === 4 &&
      event.provinceId === 'medina' && event.before === 'rashidun_634' && event.after === 'byzantium_634';
    const pending = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const restored = pending === JSON.stringify(s.stories[id]);
    const quote = FB.stories.quote(s,id,'review_records');
    s.player.provinceId = 'mecca';
    const remote = FB.stories.apply(s,id,'review_records',quote);
    s.player.provinceId = 'medina';
    const applied = FB.stories.apply(s,id,'review_records',FB.stories.quote(s,id,'review_records'));
    const repeated = FB.stories.apply(s,id,'review_records',quote);
    const closed = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state; m.day(s,s.stories[id]);
    return {actual:actual,restored:restored,remote:remote,applied:applied,repeated:repeated,
      closed:closed === JSON.stringify(s.stories[id]),quiet:!FB.stories.status(s,id),
      receipts:Object.keys(s.stories[id].householdReceipts).length,phase:r.phase(),
      unchanged:resources === JSON.stringify([s.player.gold,s.player.piety,s.player.prestige,s.player.landPlots])};
  })).toEqual({actual:true,restored:true,remote:false,applied:true,repeated:false,closed:true,quiet:true,
    receipts:1,phase:'open_future',unchanged:true});
});

test('ordinary JSON import varies household spending and preserves exact current-content saves',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/medina-household-plans.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.evaluate(function () {
    FBDATA.bookmarks['634'].revision = 'core_courts_v4';
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden = false;
  });
  await beginBookmarkFromTitle(page,'634','medina_household_634');
  const result = await page.evaluate(function () {
    let s = FB.state;
    const id = 'medina_reserve_example', before = s.player.gold;
    const applied = FB.stories.apply(s,id,'provide',FB.stories.quote(s,id,'provide'));
    const saved = JSON.parse(FB.save.serialize()), rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const after = JSON.parse(FB.save.serialize());
    // Restore's existing repair hooks create these empty stores when absent.
    // Compare every other wire field, and require the exact empty defaults.
    const expected = JSON.parse(JSON.stringify(saved.state));
    if (!Object.prototype.hasOwnProperty.call(expected,'countySupport')) expected.countySupport = {};
    if (!Object.prototype.hasOwnProperty.call(expected,'rebellions')) expected.rebellions = {groups:{},warnings:{},cooldowns:{}};
    FB.save.restore(after); s = FB.state;
    const second = JSON.parse(FB.save.serialize());
    const exact = rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
    const tampered = JSON.parse(FB.save.serialize()); tampered.state.stories[id].phase = 'invented';
    const live = FB.save.serialize(); let rejected = false;
    try { FB.save.restore(tampered); } catch (error) { rejected = true; }
    return {before:before,applied:applied,gold:s.player.gold,phase:s.stories[id].phase,exact:exact,beforeState:expected,afterState:after.state,secondState:second.state,
      repeated:FB.stories.apply(s,id,'provide',FB.stories.quote(s,id,'provide')),
      atomic:rejected && live === FB.save.serialize(),original:!!s.stories.medina_household_track_634};
  });
  expect(result.afterState).toEqual(result.beforeState);
  expect(result.secondState).toEqual(result.afterState);
  delete result.afterState; delete result.beforeState; delete result.secondState;
  expect(result).toEqual({before:8,applied:true,gold:5,phase:'done',exact:true,repeated:false,atomic:true,original:false});
});

test('integrated Medinan farming advances through one ordinary paid day without public service',async function ({page},info) {
  await begin(page,info,true);
  expect(await page.evaluate(function () {
    const r = medinaReview, s = FB.state;
    r.pick('consider_home');
    const gold = s.player.gold, turn = s.turn;
    const selected = r.pick('work_land'), pending = r.phase(), noAdvance = s.turn === turn && s.player.gold === gold;
    FB.game.passDay({deferUi:true});
    return {selected:selected,pending:pending,noAdvance:noAdvance,phase:r.phase(),days:s.turn - turn,
      paid:s.player.gold > gold,privateHousehold:!s.realms.player,
      job:!!s.stories.medina_household_track_634.jobs,restored:r.roundTrip()};
  })).toEqual({selected:true,pending:'working',noAdvance:true,phase:'accounts',days:1,
    paid:true,privateHousehold:true,job:false,restored:true});
});
