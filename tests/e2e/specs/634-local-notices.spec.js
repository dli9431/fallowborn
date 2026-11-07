'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['index.html','data/story_household_effects_634.js','data/story_campaigns_634.js',
  'data/bookmark_634.js','data/bookmark_634_courts.js','data/bookmark_634_scaffold_d.js',
  'data/starts_634_ordinary.js','data/starts_634_damascus.js','data/starts_634_frontier.js',
  'data/story_households_634_damascus.js','data/story_households_634_ctesiphon.js',
  'data/story_households_634_medina.js','data/story_households_634_frontier.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/stories.js','js/story_campaign.js',
  'js/story_household.js','js/story_household_observer.js','js/wars.js','js/world.js','js/starts.js',
  'js/government_selection.js','js/save.js','js/save_v4.js','js/mods.js','js/i18n.js']);

async function load(page,info) {
  await openGame(page,info); await prepareGameContent(page);
  expect(await page.evaluate(function () {
    return FB.bookmark('634','core_courts_v4') ? FB.validateBookmark(FB.bookmark('634','core_courts_v4')) : FB.bookmarkRuntimeDiagnostics();
  })).toEqual([]);
}
async function start(page,province,scenario) {
  const code = await page.evaluate(function (input) {
    const b = FBDATA.bookmarks['634']; b.revision = 'core_courts_v4'; b.revisions.core_courts_v4.hidden = false;
    const world = FB.bookmark('634'), p = world.provinces.find(function (p) { return p.id === input.province; });
    const row = FBDATA.startScenarios.find(function (r) { return r.id === input.scenario; });
    const identity = FB.startIdentity(row,world);
    const culture = identity.startCulture || p.culture, religion = identity.startReligion || p.religion;
    if (!FB.startProvinceAllowed(row,world,p.id)) throw new Error('Unavailable report household');
    return 'LOCALREPORT-634-'+row.id+'-'+p.id+'-m-Review-established-0-'+culture+'.'+religion;
  },{province:province,scenario:scenario || 'farmer_634'});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click(); await page.locator('#ng-seed').fill(code); await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {
    FB.game.setPaused(true);
    window.LN = {
      copy:function (s) { FB.invalidateRealmCache(); return JSON.parse(JSON.stringify(s)); },
      poll:function (s,id) { FB.stories.get(id).day(s,s.stories[id]); },
      choose:function (s,id,c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); },
      start:function (s,id) {
        const d = FB.stories.get(id).declaration;
        const neighbor = Object.keys(FB.world.adj[d.target.provinceId]).sort().find(function (p) {
          return !FB.world.byId[p].wasteland && p !== s.player.provinceId;
        });
        FB.transferProvince(s,neighbor,d.actor.realmId);
        const r = FB.governmentSelection.state(s,d.actor.realmId);
        if (r && r.recognition) r.recognition.consents = FB.governmentSelection.constituency(s,d.actor.realmId)
          .filter(function (m) { return m.active; }).map(function (m) { return m.id; });
        LN.poll(s,id);
        if (s.stories[id].phase !== 'started') throw new Error('Ordinary campaign did not start: '+JSON.stringify(s.stories[id]));
      },
      effects:function (s) { return JSON.stringify([s.player,s.chars,s.owner,s.holder,s.holdings,s.populations,s.realms,s.wars]); }
    };
  });
}

test('the hidden assembled world attaches two five-beat campaigns and an enumerated authority source only',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () {
    const ids = ['syrian_households_634','iraqi_households_634','district_authority_households_634'];
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const b = FB.bookmark('634','core_courts_v4');
    const definitions = ids.slice(0,2).map(function (id) {
      const d = FB.stories.get(id).declaration;
      return {triggers:d.beats.map(function (v) { return v.trigger; }),reach:d.beats.map(function (v) { return v.reach; }),
        source:d.sourceStoryId,expiry:d.expiryTurns,costless:d.beats.every(function (v) {
          return v.choices.every(function (c) { return ['review_records','continue_livelihood'].indexOf(c.operation) >= 0; });
        })};
    });
    return {definitions:definitions,once:ids.concat(['damascus_household_observer_634','ctesiphon_household_observer_634','medina_household_observer_634']).every(function (id) {
      return b.stories.filter(function (s) { return s === id; }).length === 1;
    }),
      fresh:FB.bookmark('634').revision,hidden:b.hidden,older:FB.bookmarkRevisions('634').filter(function (r) {
        return r.revision !== 'core_courts_v4';
      }).every(function (r) { return ids.every(function (id) { return r.stories.indexOf(id) < 0; }); }),
      authority:['damascus_household_observer_634','ctesiphon_household_observer_634','medina_household_observer_634',ids[2]].map(function (id) {
        const d = FB.stories.get(id).declaration; return [d.source.type,d.beats[0].trigger];
      }),tech:FBDATA.techImpactReviews.features.household_world_notices.mode,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({definitions:[['syrian_front_634',30],['iraqi_front_634',20]].map(function (r) {
    return {source:r[0],expiry:r[1],triggers:['started','won','failed','diverted','interrupted'],
      reach:['local','previous','previous','previous','previous'],costless:true};
  }),once:true,fresh:'core_identities_v3',hidden:true,older:true,
  authority:Array(4).fill(['local_control','rule_changed']),tech:'none',pure:true});
});

for (const front of ['syrian','iraqi']) test(front+' ordinary household hears each real campaign result once without harm or payment',async function ({page},info) {
  await load(page,info); await start(page,front === 'syrian' ? 'damascus' : 'kufa',front === 'syrian' ? 'farmer_634' : 'craftsman_634');
  expect(await page.evaluate(function (front) {
    const s = FB.state, source = front+'_front_634', id = front+'_households_634', other = front === 'syrian' ? 'iraqi' : 'syrian';
    const quiet = !FB.stories.status(s,id) && !FB.stories.status(s,other+'_households_634');
    s.turn = 1; LN.start(s,source); LN.poll(s,id);
    const started = s.stories[id].pending[0].beatId;
    const openingEffects = LN.effects(s), q = FB.stories.quote(s,id,'records'), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.quote(s,id,'continue');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const applied = LN.choose(s,id,'records'), repeated = FB.stories.apply(s,id,'records',q);
    const costless = openingEffects === LN.effects(s), base = LN.copy(s);
    const outcomes = ['won','failed','diverted','interrupted'].map(function (result) {
      const t = LN.copy(base), d = FB.stories.get(source).declaration; t.turn = 2;
      if (result === 'won') FB.transferProvince(t,d.target.provinceId,d.actor.realmId);
      if (result === 'failed') FB.settleOrdinaryWar(t,t.stories[source].warId,'white_peace');
      if (result === 'diverted') FB.transferProvince(t,d.target.provinceId,other === 'iraqi' ? 'sasanian_634' : 'byzantium_634');
      if (result === 'interrupted') { t.realms[d.actor.realmId].ruler.generation++; t.realms[d.actor.realmId].succession.rulerGeneration++; }
      LN.poll(t,source); LN.poll(t,id);
      const item = t.stories[id].pending[0], effects = LN.effects(t), choice = FB.stories.choices(t,id)[0].id;
      const response = LN.choose(t,id,choice); LN.poll(t,id);
      return {result:t.stories[source].result,beat:item.beatId,receipt:item.event.source,
        response:response,quiet:!FB.stories.status(t,id),costless:effects === LN.effects(t),
        independent:t.stories[other+'_front_634'].phase === 'pending'};
    });
    // Existing source facts at attachment, including already finished results, are baselines.
    const historical = LN.copy(base); historical.turn = 2;
    FB.settleOrdinaryWar(historical,historical.stories[source].warId,'white_peace'); LN.poll(historical,source);
    const initial = FB.stories.get(id).init(historical);
    return {quiet:quiet,started:started,pure:pure,applied:applied,repeated:repeated,costless:costless,outcomes:outcomes,
      initialQuiet:initial.pending.length === 0 && initial.history.length === 0};
  },front)).toEqual({quiet:true,started:'started',pure:true,applied:true,repeated:false,costless:true,
    outcomes:['won','failed','diverted','interrupted'].map(function (r) {
      return {result:r,beat:r,receipt:r === 'won' ? 'control' : front+'_front_634',response:true,quiet:true,costless:true,independent:true};
    }),initialQuiet:true});
});

test('actual matching forces, declared scope, residence and source continuity gate local reports',async function ({page},info) {
  await load(page,info); await start(page,'baghdad','craftsman_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'iraqi_households_634'; s.turn = 1; LN.start(s,'iraqi_front_634');
    LN.poll(s,id); const remote = !FB.stories.status(s,id);
    // Adapter-only fixture: a living county host is evidence solely for its assigned war.
    const host = {id:'report_host',realm:'rashidun_634',men:30,at:'baghdad',warId:'unrelated_war'}; s.armies.push(host);
    LN.poll(s,id); const unrelated = !FB.stories.status(s,id);
    host.warId = s.stories.iraqi_front_634.warId; LN.poll(s,id);
    const q = FB.stories.quote(s,id,'records'), reached = q.allowed;
    s.player.travel = {currentId:'kufa'}; const absent = FB.stories.apply(s,id,'records',q); delete s.player.travel;
    s.player.provinceId = 'kufa'; const residence = FB.stories.apply(s,id,'records',q); s.player.provinceId = 'baghdad';
    host.at = 'mosul'; const departed = FB.stories.apply(s,id,'records',q); LN.poll(s,id);
    FB.settleOrdinaryWar(s,s.stories.iraqi_front_634.warId,'white_peace'); LN.poll(s,'iraqi_front_634');
    // A live force outside a declaration's scope cannot cause another regional notice.
    LN.start(s,'syrian_front_634'); host.warId = s.stories.syrian_front_634.warId; host.at = 'baghdad'; LN.poll(s,'syrian_households_634');
    const outOfScope = !FB.stories.status(s,'syrian_households_634');
    // Closure reaches only a household which had a local report from this source.
    FB.settleOrdinaryWar(s,s.stories.syrian_front_634.warId,'white_peace'); LN.poll(s,'syrian_front_634'); LN.poll(s,'syrian_households_634');
    const noClosure = !FB.stories.status(s,'syrian_households_634');
    return {remote:remote,unrelated:unrelated,reached:reached,absent:absent,residence:residence,departed:departed,outOfScope:outOfScope,noClosure:noClosure};
  })).toEqual({remote:true,unrelated:true,reached:true,absent:false,residence:false,departed:false,outOfScope:true,noClosure:true});
});

for (const scenario of ['damascus_household_634','frontier_household_634']) test(scenario+' owns overlapping victory and authority receipts before dispatch and during expiry',async function ({page},info) {
  await load(page,info); await start(page,'damascus',scenario);
  expect(await page.evaluate(function (scenario) {
    const s = FB.state, personal = scenario === 'damascus_household_634' ? 'damascus_household_full_634' : 'frontier_household_track_634';
    const id = 'syrian_households_634', local = 'damascus_household_observer_634';
    if (scenario === 'damascus_household_634') { LN.choose(s,personal,'take_stock'); LN.choose(s,personal,'defer_work'); }
    else { LN.choose(s,personal,'connections_first'); LN.choose(s,personal,'decline'); }
    s.turn = 1; LN.start(s,'syrian_front_634'); LN.poll(s,id); LN.choose(s,id,'continue');
    s.turn = 2; FB.transferProvince(s,'damascus','rashidun_634'); LN.poll(s,'syrian_front_634'); LN.poll(s,id); LN.poll(s,local);
    const item = s.stories[id].pending[0], key = item.key;
    const owner = FB.householdStories.owner(s,key), hidden = !FB.stories.status(s,id) && !FB.stories.status(s,local);
    LN.poll(s,personal); s.turn = item.expiresTurn+1; LN.poll(s,id); LN.poll(s,local);
    const unclaimed = !FB.householdStories.receipt(s,key);
    const enter = LN.choose(s,personal,scenario === 'damascus_household_634' ? 'review_control' : 'changed_control');
    const effects = LN.effects(s), acknowledge = LN.choose(s,personal,'acknowledge'); LN.poll(s,id); LN.poll(s,local);
    return {source:item.event.source,owner:owner,hidden:hidden,unclaimed:unclaimed,enter:enter,acknowledge:acknowledge,
      receipt:FB.householdStories.receipt(s,key).owner,costless:effects === LN.effects(s),
      quiet:!FB.stories.status(s,id) && !FB.stories.status(s,local)};
  },scenario)).toEqual({source:'control',owner:scenario === 'damascus_household_634' ? 'damascus_household_full_634' : 'frontier_household_track_634',
    hidden:true,unclaimed:true,enter:true,acknowledge:true,receipt:scenario === 'damascus_household_634' ? 'damascus_household_full_634' : 'frontier_household_track_634',costless:true,quiet:true});
});

test('ordinary authority and campaign aliases acknowledge once and current saves preserve pending and closed facts',async function ({page},info) {
  await load(page,info); await start(page,'kufa');
  await page.evaluate(function () {
    const s = FB.state; s.turn = 1; LN.start(s,'iraqi_front_634'); LN.poll(s,'iraqi_households_634');
    LN.choose(s,'iraqi_households_634','continue'); s.turn = 2;
    FB.transferProvince(s,'kufa','rashidun_634'); LN.poll(s,'iraqi_front_634');
    LN.poll(s,'iraqi_households_634'); LN.poll(s,'district_authority_households_634'); s.player.gold -= 3;
  });
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  const facts = await page.evaluate(function () { return JSON.stringify([FB.state.stories,FB.state.player,FB.state.owner,FB.getRngState(),FB.getUidCounter()]); });
  await page.evaluate(function (text) { FB.save.restore(JSON.parse(text)); },saved);
  expect(await page.evaluate(function () { return JSON.stringify([FB.state.stories,FB.state.player,FB.state.owner,FB.getRngState(),FB.getUidCounter()]); })).toBe(facts);
  expect(await page.evaluate(function () {
    const source = FB.save.serialize(), before = JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
    return ['source','beat','key'].map(function (fault) {
      const broken = JSON.parse(source), item = broken.state.stories.iraqi_households_634.pending[0];
      if (fault === 'source') item.event.source = 'invented_source';
      if (fault === 'beat') item.beatId = 'invented_beat';
      if (fault === 'key') item.key = JSON.stringify(['invented_household','control','rule_changed','kufa',2,'sasanian_634','rashidun_634']);
      const input = JSON.stringify(broken); let refused = false;
      try { FB.save.restore(broken); } catch (_) { refused = true; }
      return refused && input === JSON.stringify(broken) && before === JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
    });
  })).toEqual([true,true,true]);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'iraqi_households_634', local = 'district_authority_households_634';
    const a = s.stories[id].pending[0], b = s.stories[local].pending[0], q = FB.stories.quote(s,id,'records');
    const effects = LN.effects(s), applied = LN.choose(s,local,'records'), duplicate = FB.stories.apply(s,id,'records',q);
    LN.poll(s,id); LN.poll(s,local);
    return {same:a.key === b.key,source:a.event.source,applied:applied,duplicate:duplicate,
      quiet:!FB.stories.status(s,id) && !FB.stories.status(s,local),costless:effects === LN.effects(s)};
  })).toEqual({same:true,source:'control',applied:true,duplicate:false,quiet:true,costless:true});
  const closed = await page.evaluate(function () { return FB.save.serialize(); });
  const closedFacts = await page.evaluate(function () { return JSON.stringify([FB.state.stories,FB.state.player.gold,FB.getRngState(),FB.getUidCounter()]); });
  await restoreBookmark(page,closed); await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return JSON.stringify([FB.state.stories,FB.state.player.gold,FB.getRngState(),FB.getUidCounter()]); })).toBe(closedFacts);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()); delete saved.state.stories.iraqi_households_634;
    saved.state.start.storyAttachments.world = saved.state.start.storyAttachments.world.filter(function (id) { return id !== 'iraqi_households_634'; });
    FB.save.restore(saved); return !FB.state.stories.iraqi_households_634;
  })).toBe(true);
});

test('JSON reports vary scope and expiry, share receipts, reject unsupported demands purely and do not reopen old local changes',async function ({page},info) {
  await load(page,info);
  const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../fixtures/authoring/634-local-notices.json'),'utf8'));
  const input = await page.evaluate(function (mod) {
    const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
    b.revisions.core_courts_v4.stories = b.revisions.core_courts_v4.stories.concat(Object.keys(mod.storyInstances));
    mod.bookmarks = {'634':b}; return mod;
  },fixture);
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), errors = FB.mods.validate(mod);
    const rejected = ['paid_work','tax','levy','refugees','siege','battle','host_arrived'].map(function (trigger) {
      const bad = JSON.parse(JSON.stringify(mod)); bad.storyInstances.emesa_campaign_report.beats[0].trigger = trigger;
      return FB.mods.validate(bad).length > 0;
    });
    const bad = JSON.parse(JSON.stringify(mod)); bad.storyInstances.hira_authority_report.beats[0].choices[0].operation = 'give_gold';
    let refused = false; try { FB.mods.apply(bad); } catch (err) { refused = true; }
    return {errors:errors,rejected:rejected,refused:refused,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },input)).toEqual({errors:[],rejected:Array(7).fill(true),refused:true,pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'district-reports.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page); await start(page,'kufa');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'hira_authority_report', native = 'district_authority_households_634';
    const initial = !FB.stories.status(s,id); s.turn = 3; FB.transferProvince(s,'kufa','rashidun_634'); LN.poll(s,id); LN.poll(s,native);
    const item = s.stories[id].pending[0], same = item.key === s.stories[native].pending[0].key;
    const q = FB.stories.quote(s,id,'continue'), effects = LN.effects(s);
    s.turn = item.expiresTurn+1; LN.poll(s,id);
    const stale = FB.stories.apply(s,id,'continue',q), expiredAlias = !FB.stories.status(s,native);
    const costless = effects === LN.effects(s);
    const saved = JSON.parse(FB.save.serialize()), mods = saved.mods; FB.save.restore(saved); s = FB.state;
    const retained = JSON.parse(FB.save.serialize()).mods === mods;
    // A change observed away from home is consumed, not offered on a later return.
    s.player.provinceId = 'baghdad'; s.turn++; FB.transferProvince(s,'kufa','sasanian_634'); LN.poll(s,id);
    s.player.provinceId = 'kufa'; LN.poll(s,id);
    return {initial:initial,same:same,expiry:item.expiresTurn-item.offeredTurn,stale:stale,expiredAlias:expiredAlias,
      retained:retained,costless:costless,late:!FB.stories.status(s,id)};
  })).toEqual({initial:true,same:true,expiry:2,stale:false,expiredAlias:true,retained:true,costless:true,late:true});
  expect(await page.evaluate(function () {
    const text = FB.save.serialize(), d = JSON.parse(JSON.stringify(FBDATA.storyInstances.hira_authority_report));
    d.expiryTurns++; FB.mods.apply({storyInstances:{hira_authority_report:d}});
    const state = FB.state, before = JSON.stringify([state,FB.getRngState(),FB.getUidCounter(),localStorage]);
    let rejected = false; try { FB.save.restore(JSON.parse(text)); } catch (_) { rejected = true; }
    return rejected && state === FB.state && before === JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
  })).toBe(true);
});
