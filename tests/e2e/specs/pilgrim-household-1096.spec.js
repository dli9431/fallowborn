'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {prepareGameContent} = require('../support/game/navigation');
const path = require('path');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_pilgrim_1096.js','data/story_pilgrim_1096.js',
  'data/bookmark_1096_pilgrim.js','data/bookmark_1096_western_expeditions.js',
  'data/bookmark_1096_mainz.js','data/bookmark_1096_campaigns.js',
  'js/story_expedition_preparation.js','js/story_expedition_program.js','js/expedition_programs.js',
  'js/story_expedition_participation.js','js/story_household_party.js','js/household_party_camp.js',
  'js/household_party_travel.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/home_authority.js','js/treasury.js','js/market.js','js/armies.js','js/population.js',
  'js/federates.js','js/logistics.js','js/climate.js','js/economy.js','data/actions.js',
  'data/bookmark_1096.js','data/identities_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/starts.js','data/travel.js','data/events_travel.js','data/actions.js',
  'data/story_instances.js','data/economy.js','data/government_rollout.js',
  'data/communal_revisions.js','data/eras.js','data/technology.js',
  'js/story_household.js','js/story_opening_goals.js','js/stories.js','js/starts.js',
  'js/bookmark_setup.js','js/actions.js','js/travel.js','js/events.js','js/economy.js',
  'js/main.js','js/world.js','js/model.js','js/save.js','js/save_v4.js',
  'js/i18n.js','js/ui_misc.js','js/ui_panels.js'
]);

const ID = 'pilgrim_household_track_1096';

test('the ordinary picker offers only Cologne for the pilgrim household',async function ({page},info) {
  await openGame(page,info);
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').press('Enter');
  const card=page.locator('#scenariolist [data-scenario="pilgrim_household_1096"]');
  await expect(card).toBeVisible();await expect(card).not.toHaveAttribute('aria-disabled','true');await card.press('Enter');
  expect(await page.evaluate(function () {
    const p=FB.game.pending,b=FB.activeBookmark;
    return {id:p.scenario.id,places:b.provinces.filter(function (c) {return FB.startProvinceAllowed(p.scenario,b,c.id);}).map(function (c) {return c.id;}),
      tracks:FB.startTracks(p.scenario,'cologne',b).length,state:FB.state};
  })).toEqual({id:'pilgrim_household_1096',places:['cologne'],tracks:7,state:null});
});

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'pilgrim_household_track_1096';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

async function departure(page,info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  for (const choice of ['take_stock','review_journey']) expect(await choose(page,choice)).toBe(true);
}

test('a complete Cologne household and goals are registered for the selectable 1096 bookmark', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('1096'), sc = FBDATA.startScenarios.find(function (r) { return r.id === 'pilgrim_household_1096'; });
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const source = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), county = b.provinces.find(function (p) { return p.id === 'cologne'; });
    return {errors:errors,hidden:b.hidden === true,offered:FB.bookmarkAvailable('1096'),bookmarks:sc.bookmarkIds,
      local:FB.startProvinceAllowed(sc,b,'cologne'),away:FB.startProvinceAllowed(sc,b,'mainz'),
      tracks:FB.startTracks(sc,'cologne'),awayTracks:FB.startTracks(sc,'mainz'),storyline:FB.startStoryTracks(sc,'cologne'),
      family:Object.keys(sc.familyPresets),resources:[sc.startAge,sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],
      noGrant:!sc.startEffects && !sc.rulerRealmId,community:county.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion; }),
      sourceFree:!FBDATA.storyInstances.pilgrim_household_track_1096.requires,
      pure:source === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({errors:[],hidden:false,offered:true,bookmarks:['1096'],local:true,away:false,
    tracks:[ID,'opening_pilgrim_1096'],awayTracks:[],storyline:[ID],family:['established'],
    resources:[30,1,'craftsman',15,5,0],noGrant:true,community:true,sourceFree:true,pure:true});
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], profile = s.stories.opening_pilgrim_1096;
    return {phase:s.stories.pilgrim_household_track_1096.phase,home:s.player.provinceId,
      age:FB.ageOf(c,s.date.year),culture:c.culture,faith:c.religion,profession:s.player.profession,
      gold:s.player.gold,family:FB.householdMembers(s).length > 1,travel:s.player.travel || null,
      goals:Object.keys(profile.goals).length,contact:FB.stories.resolve(s,{kind:'realm_ruler',realmId:'hre_1096'}) === profile.contacts.imperial_ruler,
      errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',home:'cologne',age:30,culture:'german',faith:'catholic',profession:'craftsman',
    gold:15,family:true,travel:null,goals:3,contact:true,errors:[]});
});

test('the stay and postpone paths create no income, journey, command or protection', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096';
    const funds = [s.player.gold,s.player.prestige,s.player.piety], owner = JSON.stringify(s.owner), people = Object.keys(s.chars).length;
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const chosen = [pick('postpone'),pick('keep_livelihood')], goals = s.stories.opening_pilgrim_1096.goals;
    return {chosen:chosen,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel || null,
      same:JSON.stringify(funds) === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety]) && owner === JSON.stringify(s.owner) && people === Object.keys(s.chars).length,
      goals:[goals.craft_income.status,goals.private_reserve.status,goals.home_decision.status]};
  })).toEqual({chosen:[true,true],phase:'stayed',home:'cologne',travel:null,same:true,goals:['pending','pending','completed']});
});

test('work selection and savings cannot masquerade as earned craft income', async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  for (const choice of ['take_stock','prepare','work_bench']) expect(await choose(page,choice)).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, profile = FB.stories.get('opening_pilgrim_1096'), t = s.stories.opening_pilgrim_1096;
    const working = s.stories.pilgrim_household_track_1096.phase;
    s.player.gold = 50; profile.day(s,t);
    const reserve = t.goals.private_reserve.status, notEarned = t.goals.craft_income.status;
    const cash = s.player.gold; s.turn++; FB.tickFocus(s);
    const phase = s.stories.pilgrim_household_track_1096.phase, paid = s.player.gold > cash;
    for (let day = 0; day < 45 && t.goals.craft_income.status === 'pending'; day++) { s.turn++; FB.tickFocus(s); }
    const money = s.player.gold, snapshot = JSON.stringify(t); profile.day(s,t); profile.day(s,t);
    return {working:working,reserve:reserve,notEarned:notEarned,paid:paid,phase:phase,
      actual:Math.abs(t.earnings.craft_work-(money-cash))<1e-8 && t.earnings.craft_work>0,
      earned:t.goals.craft_income.status,noReward:money === s.player.gold,once:snapshot === JSON.stringify(t)};
  })).toEqual({working:'working',reserve:'completed',notEarned:'pending',paid:true,phase:'earned',actual:true,earned:'pending',noReward:true,once:true});
});

test('fixed-income JSON craft work completes ten earned gold through ten actual paid ticks only',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/pilgrim-paid-craft.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'1096','pilgrim_household_1096');
  for (const choice of ['take_stock','prepare','work_bench']) expect(await choose(page,choice)).toBe(true);
  expect(await page.evaluate(function () {
    const s=FB.state,t=s.stories.opening_pilgrim_1096,profile=FB.stories.get('opening_pilgrim_1096'),cash=s.player.gold;
    const selected=t.earnings.craft_work===0 && t.goals.craft_income.status==='pending';
    for (let day=0;day<9;day++) {s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;FB.tickFocus(s);}
    const before=t.goals.craft_income.status,earned=t.earnings.craft_work;
    s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;FB.tickFocus(s);
    const record=JSON.stringify(t),money=s.player.gold;
    profile.day(s,t);profile.day(s,t);
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {selected:selected,before:before,earned:earned,completed:t.goals.craft_income.status,
      actual:s.player.gold-cash,total:t.earnings.craft_work,noReward:money===s.player.gold,
      once:record===JSON.stringify(t),restored:record===JSON.stringify(FB.state.stories.opening_pilgrim_1096)};
  })).toEqual({selected:true,before:'pending',earned:9,completed:'completed',actual:10,total:10,noReward:true,once:true,restored:true});
});

test('poor, imprisoned, disconnected and stale departure reviews retain a free fallback', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096';
    function q() { return FB.stories.quote(s,id,'go_alone'); }
    s.player.gold = 0; const poor = q().allowed, fallback = FB.stories.quote(s,id,'stay_instead').allowed;
    s.player.gold = 1000; s.player.flags.in_prison = 1; const prisoner = q().allowed; delete s.player.flags.in_prison;
    const adj = FB.world.adj.cologne; FB.world.adj.cologne = {}; const disconnected = q().allowed; FB.world.adj.cologne = adj;
    const stale = q(); s.player.gold--;
    const cash = s.player.gold, rejected = FB.stories.apply(s,id,'go_alone',stale);
    return {poor:poor,fallback:fallback,prisoner:prisoner,disconnected:disconnected,rejected:rejected,
      noCharge:cash === s.player.gold,phase:s.stories[id].phase,travel:s.player.travel || null,
      constantinople:FB.travelSiteSnapshot(s,'pilgrim_constantinople')};
  })).toEqual({poor:false,fallback:true,prisoner:false,disconnected:false,rejected:false,noCharge:true,phase:'departure',travel:null,constantinople:null});
});

test('solo pilgrimage pays exactly the ordinary quote, leaves kin home and restores in flight', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'pilgrim_household_track_1096';
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    s.player.gold = 1000;
    const q = FB.stories.quote(s,id,'go_alone'), cash = s.player.gold;
    const started = FB.stories.apply(s,id,'go_alone',q), exactCharge = cash - s.player.gold === q.facts.terms.cost;
    const repeated = FB.stories.apply(s,id,'go_alone',q), journey = JSON.stringify(s.player.travel), funds = s.player.gold, record = JSON.stringify(s.stories);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {started:started,exactCharge:exactCharge,repeated:repeated,home:s.player.provinceId,
      destination:s.player.travel.destinationId,purpose:s.player.travel.purpose,phase:s.stories[id].phase,
      retained:journey === JSON.stringify(s.player.travel) && funds === s.player.gold && record === JSON.stringify(s.stories),
      kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; }),
      goal:s.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({started:true,exactCharge:true,repeated:false,home:'cologne',destination:'jerusalem',purpose:'pilgrimage',phase:'travelling',retained:true,kinStayed:true,goal:'pending'});
});

test('arrival is observed only after the canonical final leg and return waits for actual home arrival', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096', story = FB.stories.get(id);
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 1000; const started = pick('go_alone'), t = s.player.travel;
    // Stage the last real route leg; the test targets observation and return,
    // not months of daily simulation or the independent road encounters.
    t.currentId = t.outboundRoute[t.outboundRoute.length - 2] || t.homeId;
    t.visited = [t.homeId].concat(t.outboundRoute.slice(0,-1));
    t.remainingRoute = [t.destinationId]; t.legDaysLeft = 1;
    const before = s.stories[id].phase; s.turn++; FB.travelTick(s); story.day(s,s.stories[id]);
    const arrival = s.stories[id].phase, pending = s.stories.opening_pilgrim_1096.goals.home_decision.status;
    const queued = s.eventQueue.some(function (e) { return e.id === FBDATA.travelRules.pilgrimage.arrivalEvent; });
    FB.travelCapstoneDone(s);
    const early = pick('return_home'); s.turn += FBDATA.balance.travelMinStayDays || 90;
    const returning = pick('return_home'), stillPending = s.stories.opening_pilgrim_1096.goals.home_decision.status;
    t.currentId = t.outboundRoute[0]; t.remainingRoute = [t.homeId]; t.legDaysLeft = 1;
    s.turn++; FB.travelTick(s); story.day(s,s.stories[id]);
    FB.stories.get('opening_pilgrim_1096').day(s,s.stories.opening_pilgrim_1096);
    return {started:started,before:before,arrival:arrival,pending:pending,queued:queued,early:early,returning:returning,
      stillPending:stillPending,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel || null,
      completed:s.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({started:true,before:'travelling',arrival:'arrival',pending:'pending',queued:true,early:false,returning:true,
    stillPending:'pending',phase:'returned',home:'cologne',travel:null,completed:'completed'});
});

test('turning back and cancellation do not claim a destination arrival', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096', story = FB.stories.get(id);
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const initial = JSON.parse(FB.save.serialize());
    s.player.gold = 1000; const started = pick('go_alone'), returned = pick('turn_back');
    story.day(s,s.stories[id]);
    const actual = s.stories[id].phase;
    FB.save.restore(initial);
    const restored = FB.state; restored.player.gold = 1000;
    FB.stories.apply(restored,id,'go_alone',FB.stories.quote(restored,id,'go_alone'));
    FB.travelCancel(restored); story.day(restored,restored.stories[id]);
    return {started:started,turnedBack:returned,actual:actual,cancelled:restored.stories[id].phase,
      home:restored.player.provinceId,goal:restored.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({started:true,turnedBack:true,actual:'returned',cancelled:'journey_ended',home:'cologne',goal:'pending'});
});

test('the bounded opening closes without cancelling a live personal journey', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096'; s.player.gold = 1000;
    FB.stories.apply(s,id,'go_alone',FB.stories.quote(s,id,'go_alone'));
    const travel = JSON.stringify(s.player.travel), cash = s.player.gold;
    s.date.year = 1097; s.date.season = 0; s.date.day = 1; s.turn = 360;
    FB.stories.get(id).day(s,s.stories[id]);
    return {phase:s.stories[id].phase,home:s.player.provinceId,
      same:travel === JSON.stringify(s.player.travel) && cash === s.player.gold,
      pending:s.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({phase:'deferred',home:'cologne',same:true,pending:'pending'});
});

test('death and succession archive the personal graph and missing saved tracks remain missing', async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  const saved = await page.evaluate(function () {
    let s = FB.state; const id = 'pilgrim_household_track_1096', saved = JSON.parse(FB.save.serialize());
    s.player.dead = true;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get('opening_pilgrim_1096').day(s,s.stories.opening_pilgrim_1096);
    if (s.stories[id].phase !== 'interrupted' || s.stories.opening_pilgrim_1096.goals.craft_income.status !== 'archived') throw new Error('Personal plan survived death');
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get('opening_pilgrim_1096').day(s,s.stories.opening_pilgrim_1096);
    if (s.stories[id].phase !== 'interrupted' || s.stories.opening_pilgrim_1096.goals.craft_income.status !== 'archived') throw new Error('Personal plan replayed for heir');
    delete saved.state.stories[id]; delete saved.state.stories.opening_pilgrim_1096;
    saved.state.start.storyAttachments.tracks = saved.state.start.storyAttachments.tracks.filter(function (track) {
      return track !== id && track !== 'opening_pilgrim_1096';
    });
    FBDATA.bookmarks['1096'].hidden = true;
    return JSON.stringify(saved);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('1096').hidden,home:FB.state.player.provinceId,
      absent:!FB.state.stories.pilgrim_household_track_1096 && !FB.state.stories.opening_pilgrim_1096};
  })).toEqual({hidden:true,home:'cologne',absent:true});
});

async function formFollowing(page,prefix) {
  return page.evaluate(function (prefix) {
    const s=FB.state,P=FB.expeditionPreparation,id=prefix+'_preparation_1096',t=s.stories[id],rid=prefix+'_following_1096';
    function next() {s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;}
    function commit(action,actor) {
      const q=P.review(s,id,action,actor);
      if (!q.allowed || !P.commit(s,q)) throw new Error(action+': '+q.reason+' '+JSON.stringify({provisions:q.provisions,
        training:q.trainingCost,food:q.foodCost,total:q.cost,available:q.facts && q.facts.money && q.facts.money.available,
        afterTraining:q.facts && q.facts.money && q.facts.money.available-q.trainingCost}));
      next();return q;
    }
    s.player.gold=500;
    commit('authorize',t.provider.characterId);
    const before=s.player.gold,market=FB.marketProvisionSnapshot(s,'cologne').stock,
      seller=FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold,population=JSON.stringify(s.population),
      other=JSON.stringify(s.stories[(prefix==='peter' ? 'walter' : 'peter')+'_preparation_1096']);
    for (let n=0;n<40;n++) {
      const q=P.review(s,id,'form',t.bindings[0].characterId);
      if (q.allowed) break;
      commit('contribute',s.player.charId);
    }
    const q=commit('form',t.bindings[0].characterId),formed=s.stories[id].formed;
    const snapshot=JSON.stringify(s),repeated=P.commit(s,q);
    return {status:s.stories[id].status,paid:before-s.player.gold,cost:q.trainingCost+q.foodCost,
      food:market-FB.marketProvisionSnapshot(s,'cologne').stock,bought:formed.food,
      people:FB.mobile.total(s,rid),host:FB.mobile.host(s,rid).men,
      sellerPaid:Math.abs(FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold-seller-q.foodCost)<1e-8,
      empty:FB.treasuryAvailable(s,rid)===0,finite:FB.marketProvisionSnapshot(s,'cologne').stock>=0,
      noLocalRecruit:population===JSON.stringify(s.population),
      independent:other===JSON.stringify(s.stories[(prefix==='peter' ? 'walter' : 'peter')+'_preparation_1096']),
      repeated:repeated,rejectionPure:snapshot===JSON.stringify(s),
      repeat:P.review(s,id,'form',t.bindings[0].characterId).allowed,
      provider:s.stories[id].provider.realmId,home:s.player.provinceId,travel:s.player.travel || null};
  },prefix);
}

test('six optional reviews and their expiry grant no reward, vow or recruitment',async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  expect(await page.evaluate(function () {
    let s=FB.state;const id='pilgrim_following_track_1096',saved=JSON.parse(FB.save.serialize());
    const before=JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.population,s.armies,s.player.travel]);
    const choices=['review_livelihood','review_devotion','review_admission','review_family','review_presence','continue'];
    const applied=choices.map(function (c) {return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c));});
    const phase=s.stories[id].phase,unchanged=before===JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.population,s.armies,s.player.travel]);
    FB.save.restore(saved);s=FB.state;s.date=FB.dateAtTurn(s,360);s.turn=360;
    FB.stories.get(id).day(s,s.stories[id]);
    return {applied:applied,phase:phase,unchanged:unchanged,expired:s.stories[id].phase,
      stay:FB.focusStatus(s,'craft_work').can,home:s.player.provinceId};
  })).toEqual({applied:[true,true,true,true,true,true],phase:'independent',unchanged:true,expired:'deferred',stay:true,home:'cologne'});
});

test('an ordinary JSON admission policy refuses without taking money or moving the household',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/pilgrim-walter-refusal.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'1096','pilgrim_household_1096');
  await formFollowing(page,'walter');
  expect(await page.evaluate(function () {
    let s=FB.state;const id='pilgrim_walter_admission_1096',P=FB.expeditionParticipants,cash=s.player.gold;
    const requested=P.commit(s,P.review(s,id,'request',s.player.charId,'civilian'));
    FB.stories.get(id).day(s,s.stories[id]);
    const record=JSON.stringify(s.stories[id]),sig=FB.mods.sig();FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    return {requested:requested,status:s.stories[id].status,travel:s.player.travel || null,home:s.player.provinceId,
      cash:cash===s.player.gold,restored:record===JSON.stringify(s.stories[id]),signature:sig===FB.mods.sig(),
      work:FB.stories.quote(s,'pilgrim_household_track_1096','take_stock').allowed};
  })).toEqual({requested:true,status:'declined',travel:null,home:'cologne',cash:true,restored:true,signature:true,work:true});
});

test('retained two-track and genuine unstamped saves acquire no new people, preparations or admissions',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () {FBDATA.bookmarks['1096'].revision='western_expeditions_v1';});
  await beginBookmarkFromTitle(page,'1096','pilgrim_household_1096');
  const saved=await page.evaluate(function () {
    const saved=FB.save.serialize();FBDATA.bookmarks['1096'].revision='pilgrim_followings_v1';return saved;
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    const saved=JSON.parse(FB.save.serialize()),original=JSON.stringify([saved.state.chars,saved.state.player.gold]);
    const tracks=saved.state.start.storyAttachments.tracks;
    delete saved.state.start.storyAttachments;delete saved.storyAttachmentSchema;
    FB.save.restore(saved);
    const after=JSON.parse(FB.save.serialize());
    return {tracks:tracks,revision:after.state.start.revision,legacy:after.state.start.storyAttachments===undefined,
      unchanged:original===JSON.stringify([after.state.chars,after.state.player.gold]),
      absent:['peter_preparation_1096','walter_preparation_1096','pilgrim_peter_admission_1096','pilgrim_peter_party_1096'].every(function (id) {return !after.state.stories[id];})};
  })).toEqual({tracks:[ID,'opening_pilgrim_1096'],revision:'western_expeditions_v1',legacy:true,unchanged:true,absent:true});
});

test('named consent and host acceptance remain separate; field loss, expiry and following loss preserve paid recovery',async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');await formFollowing(page,'peter');
  expect(await page.evaluate(function () {
    let s=FB.state;const P=FB.householdParties,E=FB.expeditionParticipants,id='pilgrim_peter_party_1096',pid='pilgrim_peter_admission_1096';
    const actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
    function decide(action,who,person) {
      const q=P.review(s,id,action,who,person);if (!q.allowed || !P.commit(s,q)) throw new Error(action+': '+q.reason);
    }
    decide('invite',actor,actor);decide('accept',actor,actor);decide('invite',actor,spouse.id);decide('accept',spouse.id,spouse.id);
    const source=JSON.stringify([s.population,s.armies,s.player.gold]);
    if (!E.commit(s,E.review(s,pid,'request',actor,'civilian'))) throw new Error('personal request');
    FB.stories.get(pid).day(s,s.stories[pid]);decide('request_camp',actor);
    const pending=s.stories[id].journey.status,record=JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    const retained=record===JSON.stringify(s.stories[id]);FB.stories.get(id).day(s,s.stories[id]);
    const accepted=s.stories[id].journey.status,conserved=source===JSON.stringify([s.population,s.armies,s.player.gold]);
    const t=s.stories[id],rid='peter_following_1096',m=FB.mobile.migration(s,rid),h=FB.mobile.host(s,rid);
    // Stage independent committed field/camp checkpoints, not a simulated road.
    h.at='frankfurt';h.mobileCourt=false;
    const separate=FB.characterLocation(s,s.chars[spouse.id])==='cologne';
    const lost=h.men;h.men=0;h.units={};FB.mobileHostLosses(s,h,lost);FB.disbandArmy(s,h);
    m.at='frankfurt';FB.stories.get(id).day(s,t);FB.stories.get(pid).day(s,s.stories[pid]);
    const survived=t.journey.status==='active' && s.stories[pid].status==='active',place=FB.characterLocation(s,s.chars[spouse.id]);
    const base=JSON.parse(FB.save.serialize());FB.save.restore(base);
    const alternative=JSON.stringify(FB.state.stories.pilgrim_walter_admission_1096);
    if (FB.state.stories.pilgrim_walter_admission_1096.roleId!==null) throw new Error('Alternative admission must remain unrequested');
    const outcomes=['expiry','loss'].map(function (kind) {
      FB.save.restore(base);s=FB.state;const party=s.stories[id];
      if (kind==='expiry') {s.date=FB.dateAtTurn(s,party.journey.carrier.endTurn);s.turn=party.journey.carrier.endTurn;}
      else FB.markRealmDead(s,'peter_following_1096');
      FB.stories.get('peter_program_1096').day(s,s.stories.peter_program_1096);
      FB.stories.get(pid).day(s,s.stories[pid]);FB.stories.get(id).day(s,party);
      const status=s.stories[pid].status,checkpoint=FB.characterLocation(s,s.chars[spouse.id]),record=JSON.stringify([party,s.stories[pid]]);
      FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
      const restored=record===JSON.stringify([s.stories[id],s.stories[pid]]),cash=s.player.gold;
      const road=P.review(s,id,'camp_return',actor),back=P.commit(s,road),once=!P.commit(s,road);
      const paid=road.cost>0 && cash-s.player.gold===road.cost;
      FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
      for (let n=0;n<16 && s.player.travel;n++) {s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);}
      return {status:status,checkpoint:checkpoint,restored:restored,back:back,once:once,paid:paid,
        returned:!s.player.travel && s.stories[id].journey.members.every(function (v) {return v.status==='returned';}),
        alternative:alternative===JSON.stringify(s.stories.pilgrim_walter_admission_1096),
        home:FB.characterResidence(s,s.chars[spouse.id]),work:FB.focusStatus(s,'craft_work').can};
    });
    return {pending:pending,retained:retained,accepted:accepted,conserved:conserved,separate:separate,survived:survived,
      place:place,outcomes:outcomes};
  })).toEqual({pending:'requested',retained:true,accepted:'active',conserved:true,separate:true,survived:true,
    place:'frankfurt',outcomes:[{status:'expired',checkpoint:'frankfurt',restored:true,back:true,once:true,paid:true,returned:true,alternative:true,home:'cologne',work:true},
      {status:'interrupted',checkpoint:'frankfurt',restored:true,back:true,once:true,paid:true,returned:true,alternative:true,home:'cologne',work:true}]});
});

test('fresh followings retain local authority, independent zero funds and revision-scoped attachments',async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  expect(await page.evaluate(function () {
    const s=FB.state,b=FB.campaignBookmark(s),sc=FBDATA.startScenarios.find(function (v) {return v.id==='pilgrim_household_1096';});
    const retained=FB.bookmark('1096','western_expeditions_v1');
    return {revision:b.revision,tracks:FB.startTracks(sc,'cologne',b).length,
      retained:FB.startTracks(sc,'cologne',retained),oldHosts:retained.realms.some(function (r) {return r.id==='peter_following_1096' || r.id==='walter_following_1096';}),
      rows:['peter','walter'].map(function (p) {
        const id=p+'_following_1096',t=s.stories[p+'_preparation_1096'];
        return {status:t.status,provider:t.provider.realmId,holder:s.holder.cologne,owner:s.owner.cologne,
          funds:FB.treasuryAvailable(s,id),host:!!FB.mobile.host(s,id),row:!!FB.mobile.row(s,id),
          reserve:t.reserves.reduce(function (n,r) {return n+r.count;},0),person:t.bindings[0].characterId};
      }),original:s.start.storyAttachments.tracks,home:s.player.provinceId};
  })).toMatchObject({revision:'pilgrim_followings_v1',tracks:7,retained:[ID,'opening_pilgrim_1096'],oldHosts:false,
    rows:[{status:'preparing',provider:'c_cologne',holder:'c_cologne',owner:'hre_1096',funds:0,host:false,row:false,reserve:600},
      {status:'preparing',provider:'c_cologne',holder:'c_cologne',owner:'hre_1096',funds:0,host:false,row:false,reserve:320}],home:'cologne'});
  expect(await page.evaluate(function () {
    const before=JSON.stringify(FB.state.stories),funds=FB.state.player.gold;
    const saved=JSON.parse(FB.save.serialize()),id='pilgrim_peter_party_1096',actor=saved.state.stories[id].actorId;
    FB.stories.get(id).validate(saved.state.stories[id],FB.save.expandedSnapshot(saved.state));
    try {FB.save.restore(saved);} catch (error) {throw new Error(error.message+' '+JSON.stringify({actor:actor,
      founder:saved.state.player.houseFounderId,liveId:FB.state.chars[actor].id,wireId:saved.state.chars[actor].id,expandedValidation:true}));}
    return before===JSON.stringify(FB.state.stories) && funds===FB.state.player.gold;
  })).toBe(true);
});

test('adult refusal, parent consent and refused family places preserve independent personal admission',async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');await formFollowing(page,'walter');
  expect(await page.evaluate(function () {
    let s=FB.state;const id='pilgrim_walter_party_1096',pid='pilgrim_walter_admission_1096',P=FB.householdParties,E=FB.expeditionParticipants,
      actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0],child=FB.householdMembers(s).find(function (c) {return FB.ageOf(c,s.date.year)<16;});
    function act(action,who,person,care) {return P.commit(s,P.review(s,id,action,who,person,care));}
    const before=JSON.stringify([s.population,s.player.gold,s.player.provinceId,s.armies]);
    const consent=act('invite',actor,actor) && act('accept',actor,actor) && act('invite',actor,spouse.id);
    const impersonation=!act('accept',actor,spouse.id),refused=act('refuse',spouse.id,spouse.id);
    const dependent=act('invite',actor,child.id,actor) && act('accept',actor,child.id,actor);
    const requested=E.commit(s,E.review(s,pid,'request',actor,'civilian')),
      admitted=E.commit(s,E.review(s,pid,'accept',FB.mobile.leader(s,'walter_following_1096').id));
    const family=act('request_camp',actor),pending=s.stories[id].journey.status;
    const declined=act('decline_camp',FB.mobile.leader(s,'walter_following_1096').id);
    const record=JSON.stringify([s.stories[id],s.stories[pid]]),unmoved=before===JSON.stringify([s.population,s.player.gold,s.player.provinceId,s.armies]);
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    return {consent:consent,impersonation:impersonation,refused:refused,dependent:dependent,requested:requested,admitted:admitted,
      family:family,pending:pending,declined:declined,personal:s.stories[pid].status,unmoved:unmoved,
      restored:record===JSON.stringify([s.stories[id],s.stories[pid]]),spouse:FB.characterLocation(s,s.chars[spouse.id]),child:FB.characterLocation(s,s.chars[child.id])};
  })).toEqual({consent:true,impersonation:true,refused:true,dependent:true,requested:true,admitted:true,family:true,pending:'requested',
    declined:true,personal:'active',unmoved:true,restored:true,spouse:'cologne',child:'cologne'});
});

for (const prefix of ['peter','walter']) {
  test(prefix+' pays for the complete corridor and carries named people only on an actual camp leg',async function ({page},info) {
    await beginBookmark(page,info,'1096','pilgrim_household_1096');await formFollowing(page,prefix);
    expect(await page.evaluate(function (prefix) {
      let s=FB.state;const rid=prefix+'_following_1096',E=FB.expeditionPrograms,M=FB.mobile,
        pid='pilgrim_'+prefix+'_admission_1096',id='pilgrim_'+prefix+'_party_1096',P=FB.householdParties,
        actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
      function next() {s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;}
      function party(action,who,person,care) {const q=P.review(s,id,action,who,person,care);if (!P.commit(s,q)) throw new Error(action+': '+q.reason);}
      const blocked=E.review(s,rid,'permission'),bytes=JSON.stringify(s);
      const unfunded=!blocked.allowed && !E.commit(s,blocked) && bytes===JSON.stringify(s);
      const price=prefix==='peter' ? 32 : 48,cash=s.player.gold;
      const gift=FB.homeAuthority.fundingQuote(s,{source:{kind:'private',characterId:actor},recipientRealmId:rid,amount:price,characterId:actor});
      if (!FB.homeAuthority.fund(s,gift)) throw new Error('Corridor funding');
      for (let i=0;i<35;i++) {
        if (M.row(s,rid).expeditionProgram.steps.find(function (v) {return v.id==='permission';}).status!=='pending') break;
        const q=E.review(s,rid,'permission');if (!E.commit(s,q)) throw new Error('Permission: '+q.reason);next();
      }
      const permission=M.row(s,rid).expeditionProgram.steps.find(function (v) {return v.id==='permission';}).status;
      const paid=cash-s.player.gold===price && FB.treasuryAvailable(s,rid)===0;
      const decl=FB.campaignBookmark(s).realms.find(function (v) {return v.id===rid;}).mobile.expeditionProgram;
      const counties=decl.steps[0].terms.countyIds;
      const covered=counties.length===16 && counties.every(function (p) {return M.passage(s,rid,p,true) && M.provisioningAccess(s,rid,p);});
      const EP=FB.expeditionParticipants;
      if (!EP.commit(s,EP.review(s,pid,'request',actor,'civilian')) || !EP.commit(s,EP.review(s,pid,'accept',M.leader(s,rid).id))) throw new Error('Admission');
      party('invite',actor,actor);party('accept',actor,actor);party('invite',actor,spouse.id);party('accept',spouse.id,spouse.id);
      party('request_camp',actor);party('accept_camp',M.leader(s,rid).id);
      const h=M.host(s,rid),m=M.migration(s,rid),target='regensburg';
      // Independent bounded first-leg checkpoint; do not simulate the whole corridor.
      M.row(s,rid).expeditionProgram.steps.find(function (v) {return v.id==='field_route';}).status='cancelled';
      h.mobileCourt=true;
      const q=E.review(s,rid,'camp_route'),plan=FB.armyOrderPlan(s,h,target),issued=E.commit(s,q);
      const before=FB.characterLocation(s,s.chars[spouse.id]);
      const raw=JSON.parse(FB.save.serialize());FB.save.restore(raw);s=FB.state;
      const host=M.host(s,rid),camp=M.migration(s,rid),previous=plan.path[plan.path.length-2];
      host.at=previous;host.from=null;host.path=[target];host.moveLeft=1;host.goal=target;camp.at=previous;
      next();FB.armyTick(s);FB.federateDay(s);E.reconcile(s);
      FB.stories.get(pid).day(s,s.stories[pid]);FB.stories.get(id).day(s,s.stories[id]);
      const arrived=host.at===target && camp.at===target && FB.characterLocation(s,s.chars[spouse.id])===target;
      const record=JSON.stringify([s.stories[id],s.stories[pid],M.row(s,rid).agreements]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {unfunded:unfunded,permission:permission,paid:paid,covered:covered,issued:issued,before:before,arrived:arrived,
        restored:record===JSON.stringify([FB.state.stories[id],FB.state.stories[pid],M.row(FB.state,rid).agreements]),
        home:FB.characterResidence(FB.state,FB.state.chars[spouse.id])};
    },prefix)).toEqual({unfunded:true,permission:'complete',paid:true,covered:true,issued:true,before:'cologne',arrived:true,restored:true,home:'cologne'});
  });

  test(prefix+' forms once from paid finite reserves and admits a civilian without recruitment',async function ({page},info) {
    await beginBookmark(page,info,'1096','pilgrim_household_1096');
    const formed=await formFollowing(page,prefix);
    expect(formed).toMatchObject({status:'formed',people:prefix==='peter' ? 600 : 320,host:prefix==='peter' ? 240 : 160,
      repeat:false,provider:'c_cologne',home:'cologne',travel:null,sellerPaid:true,empty:true,finite:true,
      noLocalRecruit:true,independent:true,repeated:false,rejectionPure:true});
    expect(formed.paid).toBeCloseTo(formed.cost,8);expect(formed.food).toBe(formed.bought);
    expect(await page.evaluate(function (prefix) {
      let s=FB.state;const id='pilgrim_'+prefix+'_admission_1096',rid=prefix+'_following_1096',P=FB.expeditionParticipants;
      const before=JSON.stringify([s.population,FB.mobile.row(s,rid),FB.mobile.host(s,rid)]),funds=s.player.gold;
      const request=P.review(s,id,'request',s.player.charId,'civilian');
      const requested=P.commit(s,request),pending=s.stories[id].status;
      const accepted=P.commit(s,P.review(s,id,'accept',FB.mobile.leader(s,rid).id));
      const noRecruit=before===JSON.stringify([s.population,FB.mobile.row(s,rid),FB.mobile.host(s,rid)]);
      const saved=JSON.parse(FB.save.serialize()),record=JSON.stringify(s.stories[id]);FB.save.restore(saved);s=FB.state;
      return {requested:requested,pending:pending,accepted:accepted,status:s.stories[id].status,noRecruit:noRecruit,
        same:record===JSON.stringify(s.stories[id]),funds:funds===s.player.gold,home:s.player.provinceId,
        location:FB.characterLocation(s,s.chars[s.player.charId]),carrier:s.player.travel.participationId};
    },prefix)).toEqual({requested:true,pending:'pending',accepted:true,status:'active',noRecruit:true,same:true,funds:true,
      home:'cologne',location:'cologne',carrier:'pilgrim_'+prefix+'_admission_1096'});
  });
}

test('shared journey review cancels freely and confirms a single ordinary fare', async function ({page},info) {
  await departure(page,info);
  await page.evaluate(function () { FB.state.player.gold = 1000; });
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click(); await page.locator('[data-story-choice="go_alone"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="postpone"]')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return [FB.state.player.gold,FB.state.player.travel || null]; })).toEqual([1000,null]);
  const cost = await page.evaluate(function () { return FB.stories.quote(FB.state,'pilgrim_household_track_1096','go_alone').facts.terms.cost; });
  await card.click(); await page.locator('[data-story-choice="go_alone"]').click();
  await page.locator('#gm-story-confirm').click();
  expect(await page.evaluate(function () {
    return {gold:FB.state.player.gold,phase:FB.state.stories.pilgrim_household_track_1096.phase,home:FB.state.player.provinceId};
  })).toEqual({gold:1000-cost,phase:'travelling',home:'cologne'});
});
