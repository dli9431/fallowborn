'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html','data/starts_valencia_1096.js','data/story_valencia_1096.js',
  'data/bookmark_1096.js','data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js','data/identities_1096.js',
  'data/institutions_1096.js','data/eras.js','data/government_rollout.js','data/communal_revisions.js',
  'data/story_instances.js','js/starts.js','js/world.js','js/main.js','js/model.js','js/stories.js',
  'js/story_ruler_agenda.js','js/story_opening_goals.js','js/bookmark_setup.js',
  'js/treasury.js','js/authority.js','js/save.js','js/save_v4.js','js/mods.js'
]);

async function start(page, info) {
  return startParityGame(page, info, { bookmark:'1096', scenario:'rodrigo_diaz_1096', declaredOpening:true });
}

test('Valencia offers one existing ruler at its urban anchor and retains its resident communities', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const b = FB.bookmark('1096'), sc = FBDATA.startScenarios.find(function (r) { return r.id === 'rodrigo_diaz_1096'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), realm = b.realms.find(function (r) { return r.id === 'valencia_1096'; });
    const county = b.provinces.find(function (p) { return p.id === 'valencia'; });
    const layout = FBDATA.settlementLayouts['1096'].valencia;
    return { errors:errors, bookmarks:sc.bookmarkIds, form:sc.governmentForm, tier:sc.tier,
      local:FB.startProvinceAllowed(sc,b,'valencia'), away:FB.startProvinceAllowed(sc,b,'denia'),
      family:realm.royalCourt.members.map(function (m) { return m.id; }),
      counties:b.provinces.filter(function (p) { return p.realm === realm.id; }).map(function (p) { return p.id; }),
      anchor:layout[0].site, murviedro:layout.some(function (r) { return r.site === 'geo_murviedro_2511619'; }),
      communities:county.communities.map(function (c) { return [c.culture,c.religion,c.populationShare0]; }),
      storyline:FB.startStoryTracks(sc,'valencia'), tracks:FB.startTracks(sc,'valencia'),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ errors:[], bookmarks:['1096'], form:'territorial', tier:4, local:true, away:false,
    family:['jimena_diaz','diego_rodriguez','cristina_rodriguez','maria_rodriguez'], counties:['valencia'],
    anchor:'valencia', murviedro:true, communities:[['andalusi','sunni',7500],['iberian','catholic',2500]],
    storyline:['valencia_agenda_1096'], tracks:['valencia_agenda_1096','valencia_opening_profile_1096'], pure:true });
});

test('new play adopts the seeded Rodrigo and exactly the existing named family, including fixed contacts', async function ({ page }, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId], t = s.stories.valencia_opening_profile_1096;
    const family = [me.spouseId].concat(me.childrenIds).map(function (id) { return s.chars[id]; });
    const names = family.map(function (c) { return c.name; }).sort();
    const ids = Object.keys(t.contacts).map(function (id) { return t.contacts[id]; });
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.get('valencia_opening_profile_1096').people(s,t);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    return { seeded:me.id === FB.courtCharacterId('royal_valencia_1096_authored_ruler'), name:me.name,
      born:me.born, age:FB.ageOf(me,1096), faith:me.religion, culture:me.culture, home:s.player.provinceId,
      tier:s.player.tier, identity:s.start.rulerRealmId, owner:s.owner.valencia, holder:s.holder.valencia,
      counties:s.player.provs.slice().sort(), duplicate:!!s.realms.valencia_1096, compact:!!s.realms.player.succession,
      names:names, children:me.childrenIds.length,
      marriage:s.chars[me.spouseId].spouseId === me.id,
      parentage:me.childrenIds.every(function (id) { return s.chars[id].fatherId === me.id && s.chars[id].motherId === me.spouseId; }),
      unmarried:me.childrenIds.every(function (id) { return !s.chars[id].spouseId; }),
      resident:family.every(function (c) { return c.homeProvinceId === 'valencia'; }),
      contacts:ids.length === 4 && ids.every(function (id) { return !!id && family.some(function (c) { return c.id === id; }); }),
      noFriend:ids.every(function (id) { return !(s.player.friendContacts || {})[id]; }),
      agenda:s.stories.valencia_agenda_1096.subjectId === me.id, pure:pure };
  });
  expect(result).toEqual({ seeded:true, name:'Rodrigo Diaz', born:1048, age:48, faith:'catholic', culture:'iberian',
    home:'valencia', tier:4, identity:'valencia_1096', owner:'player', holder:'player', counties:['valencia'],
    duplicate:false, compact:false, names:['Cristina Rodriguez','Diego Rodriguez','Jimena Diaz','Maria Rodriguez'],
    children:3, marriage:true, parentage:true, unmarried:true, resident:true, contacts:true, noFriend:true, agenda:true, pure:true });
});

test('ruler codes reject another date, name, birthplace, family, settlement or faith', async function ({ page }, info) {
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  for (const code of [
    'VALENCIA-1066-rodrigo_diaz_1096-valencia-m-Rodrigo_Diaz-standard',
    'VALENCIA-1204-rodrigo_diaz_1096-valencia-m-Rodrigo_Diaz-standard',
    'VALENCIA-1096-rodrigo_diaz_1096-denia-m-Rodrigo_Diaz-standard',
    'VALENCIA-1096-rodrigo_diaz_1096-valencia-m-Someone-standard',
    'VALENCIA-1096-rodrigo_diaz_1096-valencia-m-Rodrigo_Diaz-established',
    'VALENCIA-1096-rodrigo_diaz_1096-valencia-m-Rodrigo_Diaz-standard-1',
    'VALENCIA-1096-rodrigo_diaz_1096-valencia-m-Rodrigo_Diaz-standard-0-andalusi.sunni'
  ]) {
    await page.locator('#ng-seed').fill(code); await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  }
});

for (const finalChoice of ['continuing_consolidate','continuing_finish']) {
test('all eight reviews support a peaceful conclusion through ' + finalChoice, async function ({ page }, info) {
  await start(page, info);
  const result = await page.evaluate(function (finalChoice) {
    const s = FB.state, id = 'valencia_agenda_1096', d = FB.stories.get(id).declaration;
    const baseline = JSON.stringify([s.owner,s.holder,s.player.gold,s.player.prestige,s.player.piety,s.armies,s.wars,s.chars,s.localInstitutions]);
    const accepted = [], repeats = [];
    d.stages.forEach(function (stage) {
      s.date = { year:stage.year, season:stage.season, day:1 }; s.turn++;
      const choice = stage.choices.find(function (c) { return stage.id === 'continuing' ? c.id === finalChoice : c.operation === 'agenda_priority'; });
      const q = FB.stories.quote(s,id,choice.id);
      accepted.push(FB.stories.apply(s,id,choice.id,q)); repeats.push(FB.stories.apply(s,id,choice.id,q));
    });
    const t = s.stories.valencia_opening_profile_1096;
    return { accepted:accepted, repeats:repeats, status:s.stories[id].status, steps:s.stories[id].decisions.length,
      unchanged:baseline === JSON.stringify([s.owner,s.holder,s.player.gold,s.player.prestige,s.player.piety,s.armies,s.wars,s.chars,s.localInstitutions]),
      defense:t.goals.paid_defense.status, conclusion:t.goals.conclude.status };
  },finalChoice);
  expect(result).toEqual({ accepted:Array(8).fill(true), repeats:Array(8).fill(false), status:'agenda_complete', steps:8,
    unchanged:true, defense:'pending', conclusion:'completed' });
});
}

test('dated, stale and set-aside reviews preserve actual resources and leave action goals unfinished', async function ({ page }, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'valencia_agenda_1096';
    const before = JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.wars]);
    ['city_retain','household_retain','communities_retain'].forEach(function (c) {
      if (!FB.stories.apply(s,id,c,FB.stories.quote(s,id,c))) throw new Error('Opening review failed');
    });
    const early = FB.stories.quote(s,id,'funds_prepare').allowed;
    s.date.season = 1; s.turn++;
    const quote = FB.stories.quote(s,id,'funds_prepare'); s.turn++;
    const stale = FB.stories.apply(s,id,'funds_prepare',quote);
    const stopped = FB.stories.apply(s,id,'agenda_stop_program',FB.stories.quote(s,id,'agenda_stop_program'));
    return { early:early, stale:stale, stopped:stopped, status:s.stories[id].status,
      unchanged:before === JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.wars]),
      defense:s.stories.valencia_opening_profile_1096.goals.paid_defense.status,
      conclusion:s.stories.valencia_opening_profile_1096.goals.conclude.status };
  });
  expect(result).toEqual({ early:false, stale:false, stopped:true, status:'agenda_stopped', unchanged:true,
    defense:'pending', conclusion:'pending' });
});

for (const funds of [1,5]) {
  test('the defense goal observes an ordinary military payment with available funds ' + funds, async function ({ page }, info) {
    await start(page, info);
    const result = await page.evaluate(function (funds) {
      const s = FB.state, t = s.stories.valencia_opening_profile_1096;
      s.turn++; s.player.gold = funds;
      FB.treasuryCommitMilitary(s,{ costs:{player:2}, playerMercs:0 });
      const record = JSON.stringify(t), gold = s.player.gold;
      FB.treasuryCommitMilitary(s,{ costs:{player:2}, playerMercs:0 });
      return { completed:t.goals.paid_defense.status === 'completed', noRepeat:record === JSON.stringify(t),
        noReward:gold === s.player.gold, conclusion:t.goals.conclude.status };
    },funds);
    expect(result).toEqual({ completed:funds >= 2, noRepeat:true, noReward:true, conclusion:'pending' });
  });
}

test('matching restore preserves the family and pending program, and malformed records reject without adoption', async function ({ page }, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'valencia_agenda_1096';
    FB.stories.apply(s,id,'city_retain',FB.stories.quote(s,id,'city_retain'));
    const before = JSON.stringify([s.player.charId,s.chars,s.owner,s.holder,s.stories,s.player.gold]);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    const restored = before === JSON.stringify([FB.state.player.charId,FB.state.chars,FB.state.owner,FB.state.holder,FB.state.stories,FB.state.player.gold]);
    const source = JSON.stringify(FBDATA), live = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = [
      function (x) { x.state.stories[id].decisions[0].choiceId = 'not_a_choice'; },
      function (x) { x.state.stories.valencia_opening_profile_1096.contacts.jimena = 'missing_person'; }
    ].map(function (change) {
      const bad = JSON.parse(JSON.stringify(saved)); change(bad);
      try { FB.save.restore(bad); return false; } catch (_) {
        return live === JSON.stringify(FB.state) && source === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
      }
    });
    return { restored:restored, rejected:rejected, pending:FB.state.stories[id].status };
  });
  expect(result).toEqual({ restored:true, rejected:[true,true], pending:'agenda_open' });
});

test('loss of jurisdiction interrupts this ruler agenda and archives its unfinished office goals', async function ({ page }, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'valencia_agenda_1096', profileId = 'valencia_opening_profile_1096';
    const contacts = JSON.stringify(s.stories[profileId].contacts);
    s.owner.valencia = 'almoravid_1096'; s.holder.valencia = 'almoravid_1096';
    FB.invalidateRealmCache();
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(profileId).day(s,s.stories[profileId]);
    return { agenda:s.stories[id].status, defense:s.stories[profileId].goals.paid_defense.status,
      conclusion:s.stories[profileId].goals.conclude.status, choices:FB.stories.choices(s,id).length,
      fixedContacts:contacts === JSON.stringify(s.stories[profileId].contacts) };
  });
  expect(result).toEqual({ agenda:'agenda_interrupted', defense:'archived', conclusion:'archived', choices:0, fixedContacts:true });
});

test('ordinary succession ends Rodrigo’s personal program and retains its original family contacts', async function ({ page }, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'valencia_agenda_1096', profileId = 'valencia_opening_profile_1096';
    const former = s.chars[s.player.charId], heir = s.stories[profileId].contacts.diego;
    const contacts = JSON.stringify(s.stories[profileId].contacts);
    // Stage death, then use the ordinary succession boundary once.
    former.dead = true; former.died = s.date.year; s.player.dead = true;
    s.legends.push({ id:former.id, name:former.name, born:former.born, died:former.died });
    const succeeded = FB.game.succeedTo(heir), after = FB.state;
    FB.stories.get(id).day(after,after.stories[id]);
    FB.stories.get(profileId).day(after,after.stories[profileId]); FB.openingGoals.start(after);
    return { succeeded:succeeded, heir:after.player.charId === heir, agenda:after.stories[id].status,
      original:after.stories[id].subjectId === former.id,
      defense:after.stories[profileId].goals.paid_defense.status,
      conclusion:after.stories[profileId].goals.conclude.status,
      fixedContacts:contacts === JSON.stringify(after.stories[profileId].contacts) };
  });
  expect(result).toEqual({ succeeded:true, heir:true, agenda:'agenda_interrupted', original:true,
    defense:'archived', conclusion:'archived', fixedContacts:true });
});
