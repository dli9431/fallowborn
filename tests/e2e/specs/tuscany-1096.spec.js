'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { startHistoricalGame } = require('../support/game/historical-start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/bookmark_1096.js','data/bookmark_1096_scaffold_b.js',
  'data/starts_tuscany_1096.js','data/story_tuscany_1096.js','data/political_institutions.js',
  'js/world.js','js/starts.js','js/main.js','js/stories.js','js/story_ruler_agenda.js',
  'js/story_opening_goals.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/crazygames.js']);

async function start(page, info) {
  await startParityGame(page, info, {bookmark:'1096', scenario:'matilda_1096', declaredOpening:true});
}

test('the picker offers the actual Canossan ruler only at Modena', async function ({page}, info) {
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', {name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').click();
  const card = page.locator('#scenariolist [data-scenario="matilda_1096"]');
  await expect(card).toBeVisible();
  await expect(card).not.toHaveAttribute('aria-disabled','true');
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (s) { return s.id === 'matilda_1096'; });
    return {home:FB.startProvinceAllowed(sc,FB.bookmark('1096'),'modena'),
      wrong:FB.startProvinceAllowed(sc,FB.bookmark('1096'),'parma'),state:FB.state};
  })).toEqual({home:true,wrong:false,state:null});
  await page.locator('#btn-ng-back').click();
  await page.locator('#bookmarklist [data-bookmark="1066"]').click();
  await expect(page.locator('#scenariolist [data-scenario="matilda_1096"]')).toHaveCount(0);
});

test('one female incumbent adopts the five counties with no invented resident family', async function ({page}, info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId], bm = FB.campaignBookmark(s);
    const court = bm.realms.find(function (r) { return r.id === 'canossa_1096'; });
    return {name:me.name,sex:me.sex,born:me.born,culture:me.culture,religion:me.religion,
      tier:s.player.tier,home:s.player.provinceId,
      site:FB.settlementsOf(s,'modena')[s.player.homeSettlement].site,
      expectedSite:FBDATA.settlementLayouts[bm.settlementLayout].modena[0].site,
      spouse:me.spouseId || null,children:me.childrenIds,
      one:Object.keys(s.chars).filter(function (id) { return s.chars[id].name === 'Matilda of Canossa'; }).length,
      oldRealm:!!s.realms.canossa_1096,
      counties:Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort(),
      court:court.royalCourt,
      subject:s.stories.matilda_agenda_1096.subjectId === me.id,
      goals:!!s.stories.opening_matilda_1096};
  })).toEqual({name:'Matilda of Canossa',sex:'f',born:1046,culture:'italian',religion:'catholic',
    tier:5,home:'modena',site:'modena_head',expectedSite:'modena_head',spouse:null,children:[],one:1,oldRealm:false,
    counties:['firenze','lucca','modena','pisa','siena'],court:{dynasty:'Canossa',spouseId:null,members:[]},subject:true,goals:true});
});

test('all eight review boundaries preserve resources and actual politics, and goals observe each decision once', async function ({page}, info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'matilda_agenda_1096', d = FB.stories.get(id).declaration;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.status(s,id); FB.stories.choices(s,id); FB.stories.quote(s,id,'matilda_review_household');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    function assets() { return JSON.stringify([s.owner,s.holder,s.player.gold,s.player.prestige,s.player.piety,
      s.armies,s.authority,s.pacts,s.alliances,s.chars[s.player.charId].spouseId]); }
    const original = assets(), allowed = [], repeated = [];
    d.stages.forEach(function (stage) {
      // Stage each review boundary directly, without running the daily loop.
      s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
      const choice = stage.choices.find(function (c) { return c.operation === 'agenda_priority'; });
      const q = FB.stories.quote(s,id,choice.id);
      allowed.push(FB.stories.apply(s,id,choice.id,q));
      repeated.push(FB.stories.apply(s,id,choice.id,q));
    });
    const t = s.stories[id], goals = s.stories.opening_matilda_1096;
    const record = JSON.stringify([t,goals]), cash = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {pure:pure,allowed:allowed,repeated:repeated,unchanged:original === assets(),
      complete:t.status,decisions:t.decisions.length,
      goals:Object.keys(goals.goals).map(function (key) { return goals.goals[key].status; }),
      retained:record === JSON.stringify([FB.state.stories[id],FB.state.stories.opening_matilda_1096]),
      noPayment:cash === FB.state.player.gold};
  })).toEqual({pure:true,allowed:Array(8).fill(true),repeated:Array(8).fill(false),unchanged:true,
    complete:'agenda_complete',decisions:8,goals:['completed','completed','completed'],retained:true,noPayment:true});
});

test('seasonal waits, cancellation and stale reviews leave the next choice voluntary', async function ({page}, info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'matilda_agenda_1096';
    const first = FB.stories.quote(s,id,'matilda_review_household'), before = JSON.stringify(s);
    // A quote is a review only; closing the shared sheet has no transaction.
    FB.ui.showStorySheet(id); FB.ui.closeModal();
    const cancelled = before === JSON.stringify(s);
    s.turn++;
    const stale = FB.stories.apply(s,id,'matilda_review_household',first);
    ['matilda_review_household','matilda_review_rights','matilda_review_alliances'].forEach(function (c) {
      FB.stories.apply(s,id,c,FB.stories.quote(s,id,c));
    });
    const early = FB.stories.quote(s,id,'matilda_prioritize_defense').allowed;
    const stopped = FB.stories.apply(s,id,'agenda_stop_program',FB.stories.quote(s,id,'agenda_stop_program'));
    const record = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {cancelled:cancelled,stale:stale,early:early,stopped:stopped,status:FB.state.stories[id].status,
      retained:record === JSON.stringify(FB.state.stories[id])};
  })).toEqual({cancelled:true,stale:false,early:false,stopped:true,status:'agenda_stopped',retained:true});
});

test('defense remains a costless priority with empty funds and without an enemy host', async function ({page}, info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'matilda_agenda_1096';
    ['matilda_keep_household','matilda_keep_obligations','matilda_keep_alliances'].forEach(function (c) {
      FB.stories.apply(s,id,c,FB.stories.quote(s,id,c));
    });
    s.player.gold = 0; s.date.season = 1;
    const before = JSON.stringify([s.owner,s.holder,s.armies,s.authority,s.alliances,s.pacts]);
    const accepted = FB.stories.apply(s,id,'matilda_prioritize_defense',FB.stories.quote(s,id,'matilda_prioritize_defense'));
    return {accepted:accepted,gold:s.player.gold,unchanged:before === JSON.stringify([s.owner,s.holder,s.armies,s.authority,s.alliances,s.pacts])};
  })).toEqual({accepted:true,gold:0,unchanged:true});
});

test('contacts retain original people when the papal and imperial courts change', async function ({page}, info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'opening_matilda_1096', story = FB.stories.get(id), t = s.stories[id];
    const contacts = JSON.stringify(t.contacts), imperial = t.contacts.imperial_court, papal = t.contacts.papal_court;
    const names = [s.chars[imperial].name,s.chars[papal].name];
    s.chars[imperial].dead = true; s.chars[papal].dead = true;
    s.realms.hre_1096.ruler.generation++; s.realms.papacy_1096.ruler.generation++;
    story.day(s,t); const people = story.people(s,t);
    // Cooperation remains a policy choice when an opening contact is unavailable.
    const agenda = 'matilda_agenda_1096';
    ['matilda_review_household','matilda_review_rights','matilda_review_alliances'].forEach(function (c) {
      FB.stories.apply(s,agenda,c,FB.stories.quote(s,agenda,c));
    });
    s.date.season = 1;
    ['matilda_keep_frontier','matilda_prioritize_cooperation'].forEach(function (c) {
      FB.stories.apply(s,agenda,c,FB.stories.quote(s,agenda,c));
    });
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {names:names,bound:contacts === JSON.stringify(FB.state.stories[id].contacts),
      unavailable:people.every(function (p) { return p.reason.indexOf('has died') >= 0; }),step:FB.state.stories[agenda].step};
  })).toEqual({names:['Henry IV','Urban II'],bound:true,unavailable:true,step:5});
});

for (const cause of ['death','successor','jurisdiction']) {
  test('the personal agenda ends after ' + cause + ' without a replacement biography', async function ({page}, info) {
    await start(page,info);
    expect(await page.evaluate(function (cause) {
      const s = FB.state, id = 'matilda_agenda_1096', t = s.stories[id], original = t.subjectId;
      if (cause === 'death') s.chars[original].dead = true;
      if (cause === 'successor') s.realms.player.ruler.generation++;
      if (cause === 'jurisdiction') s.player.provs.slice().forEach(function (pid) {
        s.owner[pid] = 'hre_1096'; s.holder[pid] = 'hre_1096';
      });
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();
      FB.stories.get(id).day(s,t);
      const record = JSON.stringify(t); FB.stories.get(id).day(s,t);
      return {status:t.status,original:t.subjectId === original,once:record === JSON.stringify(t),
        blocked:!FB.stories.quote(s,id,'matilda_review_household').allowed};
    },cause)).toEqual({status:'agenda_interrupted',original:true,once:true,blocked:true});
  });
}

test('CrazyGames adopts and restores the same household and personal records', async function ({page}, info) {
  await startHistoricalGame(page,info,{bookmark:'1096',
    code:'TUSCANY-1096-matilda_1096-modena-f-Matilda_of_Canossa-standard'},true);
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId], id = 'matilda_agenda_1096';
    FB.stories.apply(s,id,'matilda_keep_household',FB.stories.quote(s,id,'matilda_keep_household'));
    const record = JSON.stringify([s.stories[id],s.stories.opening_matilda_1096]), identity = me.id;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state.chars[FB.state.player.charId];
    return {distribution:FB.platform.isCrazyGames,name:restored.name,same:identity === restored.id,
      children:restored.childrenIds.length,spouse:restored.spouseId || null,
      retained:record === JSON.stringify([FB.state.stories[id],FB.state.stories.opening_matilda_1096])};
  })).toEqual({distribution:true,name:'Matilda of Canossa',same:true,children:0,spouse:null,retained:true});
});

test('restore retains absent optional tracks without attaching an opening or reseeding people', async function ({page}, info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize());
    delete saved.state.stories.matilda_agenda_1096;
    delete saved.state.stories.opening_matilda_1096;
    const people = Object.keys(saved.state.chars).sort();
    FB.save.restore(saved);
    const s = FB.state;
    return {agenda:!!s.stories.matilda_agenda_1096,goals:!!s.stories.opening_matilda_1096,
      samePeople:JSON.stringify(people) === JSON.stringify(Object.keys(s.chars).sort()),
      childless:s.chars[s.player.charId].childrenIds.length === 0};
  })).toEqual({agenda:false,goals:false,samePeople:true,childless:true});
});

test('an ordinary 1096 household receives neither the agenda nor its opening contacts', async function ({page}, info) {
  await startParityGame(page,info,{bookmark:'1096',scenario:'pilgrim_household_1096',declaredOpening:true});
  expect(await page.evaluate(function () {
    const s = FB.state, me = FB.realmRulerCharacterSnapshot(s,'canossa_1096');
    return {agenda:!!s.stories.matilda_agenda_1096,goals:!!s.stories.opening_matilda_1096,
      ruler:me.name,spouse:me.spouseId || null,children:me.childrenIds};
  })).toEqual({agenda:false,goals:false,ruler:'Matilda of Canossa',spouse:null,children:[]});
});
