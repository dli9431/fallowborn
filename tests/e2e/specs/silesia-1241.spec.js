'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html','data/starts.js','data/starts_silesia_1241.js','data/story_silesia_1241.js',
  'data/bookmark_1241.js','data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js','data/identities_1241.js',
  'data/story_instances.js','data/eras.js','data/political_institutions.js','data/cultures.js',
  'js/starts.js','js/world.js','js/model.js','js/main.js','js/stories.js',
  'js/story_ruler_agenda.js','js/story_opening_goals.js','js/government_support.js',
  'js/government_lineage.js','js/government_selection.js','js/treasury.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js'
]);

async function startHenry(page, info) {
  await startParityGame(page, info, {bookmark:'1241',scenario:'henry_pious_1241',declaredOpening:true});
}

test('Henry is offered only at the dated Wroclaw court and validates without changing definitions', async function ({page}, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (row) { return row.id === 'henry_pious_1241'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const b = FB.bookmark('1241'), r = b.realms.find(function (row) { return row.id === sc.rulerRealmId; });
    const faults = FB.validateBookmark(b);
    return {faults:faults, home:FB.startProvinceAllowed(sc,b,'wroclaw'),
      away:FB.startProvinceAllowed(sc,b,'krakow'),
      tracks:FB.startTracks(sc,'wroclaw'), ruler:r.ruler.name,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({faults:[],home:true,away:false,
    tracks:['silesia_agenda_1241','opening_silesia_1241'],ruler:'Henry II the Pious',pure:true});
});

test('adoption preserves one Henry, Anna, all declared children and the existing public account', async function ({page}, info) {
  await openGame(page, info);
  await page.evaluate(function () {
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s, sc, options) {
      const me = s.chars[s.player.charId], r = s.realms[sc.rulerRealmId];
      window.__henryBefore = {id:me.id,spouse:me.spouseId,children:me.childrenIds.slice(),gold:r.treasury.gold,
        owners:JSON.parse(JSON.stringify(s.owner)),holders:JSON.parse(JSON.stringify(s.holder))};
      FB.adoptStartingRealm = adopt;
      return adopt(s,sc,options);
    };
    FBDATA.bookmarks['1241'].hidden = false;
    FB.startProgression.noteTier(3);
  });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('SILESIA-1241-henry_pious_1241-wroclaw-m-Henry_II_the_Pious-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#cg-name')).toHaveValue('Henry II the Pious');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result = await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, me = s.chars[s.player.charId], before = window.__henryBefore;
    const spouse = s.chars[me.spouseId];
    const children = me.childrenIds.map(function (id) {
      const c = s.chars[id];
      return [c.name,c.born,c.fatherId === me.id,c.motherId === spouse.id];
    }).sort(function (a,b) { return a[1]-b[1]; });
    function mapped(old, current) { return Object.keys(old).every(function (pid) {
      return current[pid] === (old[pid] === 'silesia_1241' ? 'player' : old[pid]);
    }); }
    const profile = FB.stories.get('opening_silesia_1241'), rec = s.stories.opening_silesia_1241;
    const people = profile.people(s,rec).map(function (p) { return p.characterId; });
    const facts = {name:me.name,born:me.born,culture:me.culture,faith:me.religion,tier:s.player.tier,
      location:s.player.provinceId,settlement:s.player.homeSettlement,
      single:Object.values(s.chars).filter(function (c) {return !c.dead && c.name === me.name;}).length,
      samePerson:before.id === me.id,adopted:!s.realms.silesia_1241 && s.start.rulerRealmId === 'silesia_1241',
      sameFamily:me.spouseId === before.spouse && JSON.stringify(me.childrenIds) === JSON.stringify(before.children),
      spouse:[spouse.name,spouse.born,spouse.spouseId === me.id],children:children,
      oneAccount:s.player.gold === before.gold,owners:mapped(before.owners,s.owner),holders:mapped(before.holders,s.holder),
      holdings:[s.owner.wroclaw,s.owner.krakow],
      contacts:people.length === 1 && s.chars[people[0]].name === 'Wenceslas I' &&
        people[0] === FB.realmRulerCharacterSnapshot(s,'bohemia_1241').id};
    const saved = JSON.parse(FB.save.serialize());
    const snapshot = JSON.stringify([s.player,s.realms.player,s.owner,s.holder,s.stories,me.spouseId,me.childrenIds]);
    FBDATA.bookmarks['1241'].hidden = true;
    FB.activateBookmark('867'); FB.save.restore(saved);
    const restored = FB.state, actor = restored.chars[restored.player.charId];
    facts.retained = snapshot === JSON.stringify([restored.player,restored.realms.player,restored.owner,restored.holder,
      restored.stories,actor.spouseId,actor.childrenIds]);
    facts.valid = FB.save.v4.validatePlatform(restored);
    return facts;
  });
  expect(result).toEqual({name:'Henry II the Pious',born:1200,culture:'slavic',faith:'catholic',tier:5,
    location:'wroclaw',settlement:0,single:1,samePerson:true,adopted:true,sameFamily:true,
    spouse:['Anna of Bohemia',1204,true],children:[['Boleslaw',1223,true,true],['Mieszko',1225,true,true],
      ['Elisabeth',1228,true,true],['Henry III',1229,true,true],['Conrad',1230,true,true],['Wladyslaw',1236,true,true]],
    oneAccount:true,owners:true,holders:true,holdings:['player','player'],contacts:true,retained:true,valid:true});
});

for (const closing of ['henry_continue_court','henry_finish_reviews']) {
test(closing + ' completes eight reviews with no invasion, reward, free preparations or scheduled death', async function ({page}, info) {
  await startHenry(page,info);
  const result = await page.evaluate(function (closing) {
    const s = FB.state, id = 'silesia_agenda_1241', t = s.stories[id], story = FB.stories.get(id);
    const snapshot = function () {return JSON.stringify([s.owner,s.holder,s.armies,s.wars,s.authority.contracts,
      s.player.gold,s.realms.player.treasury]);};
    const initial = snapshot(), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.get('opening_silesia_1241').people(s,s.stories.opening_silesia_1241);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const results = story.declaration.stages.map(function (st) {
      s.date = {year:st.year,season:st.season,day:1}; s.turn++;
      const c = st.id === 'continuing_court' ? st.choices.find(function (row) {return row.id === closing;}) :
        st.choices.find(function (row) {return row.operation === 'agenda_priority';});
      return FB.stories.apply(s,id,c.id,FB.stories.quote(s,id,c.id));
    });
    const profile = FB.stories.get('opening_silesia_1241'), profileRecord = s.stories.opening_silesia_1241;
    profile.day(s,profileRecord);
    s.date = {year:1241,season:1,day:30}; story.day(s,t);
    const record = JSON.stringify([t,profileRecord]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return {results:results,pure:pure,status:t.status,choices:t.decisions.length,unchanged:initial === snapshot(),
      living:!s.chars[s.player.charId].dead && !s.player.dead,
      goals:Object.keys(profileRecord.goals).map(function (key) {return profileRecord.goals[key].status;}),
      retained:record === JSON.stringify([FB.state.stories[id],FB.state.stories.opening_silesia_1241])};
  },closing);
  expect(result).toEqual({results:[true,true,true,true,true,true,true,true],pure:true,status:'agenda_complete',
    choices:8,unchanged:true,living:true,goals:['completed','completed','completed'],retained:true});
});
}

for (const code of ['SILESIA-1204-henry_pious_1241-wroclaw-m-Henry-standard',
  'SILESIA-1241-henry_pious_1241-krakow-m-Henry-standard']) {
  test('the ordinary code gate rejects ' + code, async function ({page}, info) {
    await openGame(page,info);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(code);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  });
}

test('stale reviews, repeated choices and future review gates preserve the account', async function ({page}, info) {
  await startHenry(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'silesia_agenda_1241', choice = 'henry_review_holdings';
    const stale = FB.stories.quote(s,id,choice); s.player.gold = 0;
    const before = JSON.stringify(s), refused = !FB.stories.apply(s,id,choice,stale);
    const pure = before === JSON.stringify(s);
    const q = FB.stories.quote(s,id,choice), accepted = FB.stories.apply(s,id,choice,q);
    const repeated = FB.stories.apply(s,id,choice,q);
    const def = FB.stories.get(id).declaration;
    def.stages.slice(1,7).forEach(function (st) {
      const c = st.choices[0]; FB.stories.apply(s,id,c.id,FB.stories.quote(s,id,c.id));
    });
    const future = FB.stories.quote(s,id,'henry_finish_reviews').allowed;
    const stopped = FB.stories.apply(s,id,'agenda_stop_program',FB.stories.quote(s,id,'agenda_stop_program'));
    return {refused:refused,pure:pure,accepted:accepted,repeated:repeated,future:future,stopped:stopped,
      status:s.stories[id].status,gold:s.player.gold};
  });
  expect(result).toEqual({refused:true,pure:true,accepted:true,repeated:false,future:false,stopped:true,status:'agenda_stopped',gold:0});
});

for (const boundary of ['death','succession','jurisdiction']) {
  test(boundary + ' interrupts the original program without rewarding or replacing its people', async function ({page}, info) {
    await startHenry(page,info);
    const result = await page.evaluate(function (boundary) {
      const s = FB.state, id = 'silesia_agenda_1241', t = s.stories[id];
      const gold = s.player.gold, chars = Object.keys(s.chars).join();
      if (boundary === 'death') s.chars[s.player.charId].dead = true;
      else if (boundary === 'succession') s.realms.player.ruler.generation = FB.realmRulerGeneration(s,'player') + 1;
      else ['wroclaw','krakow'].forEach(function (pid) {FB.transferProvince(s,pid,'bohemia_1241');});
      FB.stories.get(id).day(s,t);
      return {status:t.status,allowed:FB.stories.quote(s,id,'henry_review_holdings').allowed,
        gold:s.player.gold === gold,people:Object.keys(s.chars).join() === chars,choices:t.decisions.length};
    },boundary);
    expect(result).toEqual({status:'agenda_interrupted',allowed:false,gold:true,people:true,choices:0});
  });
}

test('a neighboring household receives no ducal agenda or personal goals', async function ({page}, info) {
  await beginBookmark(page,info,'1241','hungarian_village_household_1241');
  expect(await page.evaluate(function () {
    return !FB.state.stories.silesia_agenda_1241 && !FB.state.stories.opening_silesia_1241;
  })).toBe(true);
});
