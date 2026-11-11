'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js',
  'index.html','data/start_ambitions_634.js','data/story_opening_goals_634.js',
  'data/bookmark_634.js','data/bookmark_634_courts.js','data/bookmark_sources.js',
  'data/starts_634_rulers.js','data/starts_634_medina.js','data/starts_634_frontier.js',
  'data/starts_634_damascus.js','data/starts_634_ctesiphon.js',
  'data/story_ruler_agendas_634.js','data/story_households_634_medina.js',
  'data/story_households_634_frontier.js','data/story_households_634_damascus.js',
  'data/story_households_634_ctesiphon.js','data/story_campaigns_634.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/starts.js','js/stories.js',
  'js/story_opening_goals.js','js/story_ruler_agenda.js','js/story_household.js',
  'js/actions.js','js/save.js','js/save_v4.js','js/mods.js'
]);

async function load(page,info) {
  await openGame(page,info); await prepareGameContent(page);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634','core_courts_v4');
    return b ? FB.validateBookmark(b) : FB.bookmarkRuntimeDiagnostics();
  })).toEqual([]);
}

async function begin(page,info,id,revision,loaded) {
  if (!loaded) await load(page,info);
  const ruler = await page.evaluate(function (input) {
    const b = FBDATA.bookmarks['634']; b.revision = input.revision;
    if (b.revisions[input.revision]) b.revisions[input.revision].hidden = false;
    const row = FBDATA.startScenarios.find(function (r) { return r.id === input.id; });
    row.hidden = false;
    if (!row.rulerRealmId) return null;
    const p = FB.startIdentity(row,FB.bookmark('634'));
    return 'GOALS634-634-'+row.id+'-'+row.fixedProvinceId+'-m-'+row.characterName+
      '-standard-0-'+p.startCulture+'.'+p.startReligion;
  },{id:id,revision:revision || 'core_courts_v4'});
  if (!ruler) return beginBookmarkFromTitle(page,'634',id);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(ruler); await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

const cases = [
  ['umar_634','opening_umar_court_634','Heraclius'],
  ['heraclius_634','opening_heraclius_court_634','Umar'],
  ['damascus_household_634','opening_damascus_full_634',null],
  ['ctesiphon_household_634','opening_ctesiphon_634',null],
  ['medina_household_634','opening_medina_634','Umar'],
  ['frontier_household_634','opening_frontier_634',null]
];

test('every offered revision resolves one profile per story start and preserves hidden world visibility',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () {
    const errors = [], counts = [], rootProfiles = [];
    FB.bookmarkRevisions('634',FBDATA.bookmarks['634']).forEach(function (bm) {
      errors.push.apply(errors,FB.validateBookmark(bm));
      ['umar_634','heraclius_634','damascus_household_634','ctesiphon_household_634','medina_household_634','frontier_household_634'].forEach(function (id) {
        if (bm.starts && bm.starts.indexOf(id) < 0) return;
        const sc = FBDATA.startScenarios.find(function (row) { return row.id === id; });
        const profiles = FB.startTracks(sc,sc.fixedProvinceId,bm).filter(function (key) { return FB.stories.get(key).declaration.type === 'opening_profile'; });
        counts.push(profiles.length);
        if (bm.revision === 'ordinary_settlement_v2' && sc.rulerRealmId) rootProfiles.push(profiles[0]);
      });
    });
    return {errors:errors,oneEach:counts.length > 0 && counts.every(function (n) { return n === 1; }),rootProfiles:rootProfiles.sort(),
      fullHidden:FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden,
      selected:FB.bookmark('634').revision,
      held:FBDATA.startScenarios.some(function (s) { return s.id === 'yazdegerd_634' || s.id === 'jabala_634'; })};
  })).toEqual({errors:[],oneEach:true,rootProfiles:['opening_heraclius_634','opening_umar_634'],fullHidden:true,selected:'core_identities_v3',held:false});
});

for (const entry of cases) {
  test(entry[0]+' has one optional three-goal profile with stable people and safe persistence',async function ({page},info) {
    await begin(page,info,entry[0]);
    expect(await page.evaluate(function (entry) {
      const s = FB.state, id = entry[1], t = s.stories[id], story = FB.stories.get(id);
      const profiles = Object.keys(s.stories).filter(function (key) { return FB.stories.get(key).declaration.type === 'opening_profile'; });
      const people = story.people(s,t), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.stories.status(s,id); FB.stories.choices(s,id); story.people(s,t);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const names = people.map(function (p) { return s.chars[p.characterId].name; });
      const noFriends = people.every(function (p) { return !(s.player.friendContacts || {})[p.characterId]; });
      const facts = JSON.stringify([s.stories,s.player.gold]), savedRng = FB.getRngState() >>> 0, savedUid = FB.getUidCounter();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const retained = facts === JSON.stringify([FB.state.stories,FB.state.player.gold]) &&
        savedRng === (FB.getRngState() >>> 0) && savedUid === FB.getUidCounter();
      const restored = FB.state, g = restored.stories[id];
      restored.chars[g.actorId].dead = true; story.day(restored,g);
      const archived = Object.keys(g.goals).every(function (key) { return g.goals[key].status === 'archived'; });
      return {profiles:profiles,ready:t.ready,count:Object.keys(t.goals).length,names:names,noFriends:noFriends,pure:pure,retained:retained,archived:archived};
    },entry)).toEqual({profiles:[entry[1]],ready:true,count:3,names:entry[2] ? [entry[2]] : [],noFriends:true,pure:true,retained:true,archived:true});
  });
}

for (const who of ['umar','heraclius']) {
  test(who+' can complete all court goals peacefully and archives unfinished goals on office loss',async function ({page},info) {
    await begin(page,info,who+'_634');
    expect(await page.evaluate(function (who) {
      const s = FB.state, id = who+'_court_agenda_634', gid = 'opening_'+who+'_court_634';
      const g = s.stories[gid], profile = FB.stories.get(gid), baseline = JSON.stringify(g);
      const cash = JSON.stringify([s.player.gold,s.realms,s.wars,s.owner]);
      const choices = who === 'umar' ? ['umar_keep_accounts','umar_keep_syria','umar_keep_iraq','umar_keep_court'] :
        ['heraclius_keep_administration','heraclius_keep_accounts','heraclius_keep_syria','heraclius_keep_court'];
      const q = FB.stories.quote(s,id,choices[0]);
      const preview = Object.keys(g.goals).every(function (key) { return g.goals[key].status === 'pending'; });
      let blockedOutcome = false;
      const applied = choices.every(function (choice,i) {
        if (choice === who+'_keep_syria') {
          const unavailable = FB.stories.quote(s,id,who+'_record_syria');
          blockedOutcome = !unavailable.allowed && !FB.stories.apply(s,id,who+'_record_syria',unavailable) && g.goals.syria.status === 'pending';
        }
        return FB.stories.apply(s,id,choice,i ? FB.stories.quote(s,id,choice) : q);
      });
      const completed = Object.keys(g.goals).every(function (key) { return g.goals[key].status === 'completed'; });
      const noReward = cash === JSON.stringify([s.player.gold,s.realms,s.wars,s.owner]);
      const repeat = !FB.stories.apply(s,id,choices[0],q);
      s.stories[gid] = JSON.parse(baseline);
      s.realms.player.ruler.generation++;
      if (s.realms.player.succession) s.realms.player.succession.rulerGeneration++;
      profile.day(s,s.stories[gid]);
      return {preview:preview,applied:applied,completed:completed,noReward:noReward,repeat:repeat,blockedOutcome:blockedOutcome,
        archived:Object.keys(s.stories[gid].goals).every(function (key) { return s.stories[gid].goals[key].status === 'archived'; })};
    },who)).toEqual({preview:true,applied:true,completed:true,noReward:true,repeat:true,blockedOutcome:true,archived:true});
  });
}

for (const who of ['medina','frontier']) {
  test(who+' distinguishes paid work, savings and a peaceful conclusion',async function ({page},info) {
    await begin(page,info,who+'_household_634');
    expect(await page.evaluate(function (who) {
      const s = FB.state, id = 'opening_'+who+'_634', g = s.stories[id], story = FB.stories.get(id);
      const focus = who === 'medina' ? 'work_land' : 'craft_work', income = who === 'medina' ? 'field_income' : 'craft_income';
      s.player.gold = 25; story.day(s,g);
      const savingsOnly = g.goals.household_reserve.status === 'completed' && g.goals[income].status === 'pending';
      s.player.focus = focus;
      // Stage just below the cumulative threshold, then use the real payment
      // boundary once; this avoids simulating days solely to accumulate money.
      g.earnings[focus] = 5 - 0.000001;
      const cash = s.player.gold;
      s.turn++; FB.tickFocus(s);
      const paid = s.player.gold > cash && g.goals[income].status === 'completed';
      const track = who+'_household_track_634';
      function choose(c) { return FB.stories.apply(s,track,c,FB.stories.quote(s,track,c)); }
      // Use a real costless route to its terminal conclusion, independent of earnings.
      const concluded = who === 'medina' ? choose('close_opening') && choose('leave_future_open') :
        choose('work_first') && choose('decline') && choose('independent') && choose('stay');
      const before = s.player.gold; story.day(s,g); story.day(s,g);
      return {savingsOnly:savingsOnly,paid:paid,concluded:concluded,home:g.goals.home_decision.status,noReward:before === s.player.gold};
    },who)).toEqual({savingsOnly:true,paid:true,concluded:true,home:'completed',noReward:true});
  });
}

test('a real independent JSON goal import validates purely and retains spent resources',async function ({page},info) {
  await load(page,info);
  const fixture = path.resolve(__dirname,'../fixtures/authoring/634-opening-goals.json');
  const mod = JSON.parse(fs.readFileSync(fixture,'utf8'));
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const valid = FB.mods.validate(mod), invalid = JSON.parse(JSON.stringify(mod));
    invalid.storyInstances.opening_medina_634.goals[0].criterion.focusIds = ['invented_work'];
    return {valid:valid,rejected:FB.mods.validate(invalid).length > 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },mod)).toEqual({valid:[],rejected:true,pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(fixture);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await begin(page,info,'medina_household_634','core_courts_v4',true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'opening_medina_634', story = FB.stories.get(id), t = s.stories[id];
    s.player.gold = 33; story.day(s,t); s.player.gold -= 7;
    const before = JSON.stringify([t,s.player.gold]);
    FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize()));
    return {count:Object.keys(t.goals).length,reserve:t.goals.import_reserve.status,
      retained:before === JSON.stringify([FB.state.stories[id],FB.state.player.gold]),contacts:story.people(FB.state,FB.state.stories[id]).length};
  })).toEqual({count:2,reserve:'completed',retained:true,contacts:0});
});
