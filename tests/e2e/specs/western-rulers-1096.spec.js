'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html','data/starts_western_rulers_1096.js','data/story_western_rulers_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js','data/bookmark_1096.js','data/starts.js',
  'data/government_rollout.js','data/story_instances.js','data/communal_revisions.js',
  'js/main.js','js/world.js','js/starts.js','js/model.js','js/stories.js',
  'js/story_ruler_agenda.js','js/story_opening_goals.js','js/save.js','js/save_v4.js'
]);

const openings = [
  { scenario:'godfrey_1096', agenda:'godfrey_agenda_1096', profile:'opening_godfrey_1096',
    realm:'lower_lotharingia_1096', county:'verdun', name:'Godfrey of Bouillon', born:1060,
    kin:['Ida of Lorraine','Eustace III','Baldwin'], contact:'imperial_ruler', other:'hre_1096', site:'geo_bouillon_2801283' },
  { scenario:'raymond_1096', agenda:'raymond_agenda_1096', profile:'opening_raymond_1096',
    realm:'toulouse_1096', county:'toulouse', name:'Raymond IV', born:1042,
    kin:['Elvira of Castile','Bertrand'], contact:'french_ruler', other:'france_1096', site:'toulouse_head' },
  { scenario:'bohemond_1096', agenda:'bohemond_agenda_1096', profile:'opening_bohemond_1096',
    realm:'bohemond_lordships_1096', county:'taranto', name:'Bohemond', born:1054,
    kin:[], contact:'papal_ruler', other:'papacy_1096', site:'taranto_head' }
];

async function start(page, info, row) {
  await startParityGame(page, info, { bookmark:'1096', scenario:row.scenario, declaredOpening:true });
}

test('western rulers use ordinary birthplace, Story and start-code gates', async function ({ page }, info) {
  await openGame(page, info);
  const button = page.locator('#btn-choose-beginning');
  if (await button.isVisible()) await button.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').click();
  for (const row of openings) {
    await expect(page.locator('#scenariolist [data-scenario="' + row.scenario + '"]')).toBeVisible();
    await expect(page.locator('#scenariolist [data-scenario="' + row.scenario + '"]')).not.toHaveAttribute('aria-disabled', 'true');
  }
  expect(await page.evaluate(function (rows) {
    const b = FB.bookmark('1096'), before = JSON.stringify(FBDATA), rng = FB.getRngState();
    return { errors:FB.validateBookmark(b), rows:rows.map(function (r) {
      const sc = FBDATA.startScenarios.find(function (s) { return s.id === r.scenario; });
      return { id:sc.id, local:FB.startProvinceAllowed(sc,b,r.county), away:FB.startProvinceAllowed(sc,b,'cologne'),
        wrongDate:sc.bookmarkIds.indexOf('1066') >= 0 && FB.startProvinceAllowed(sc,FB.bookmark('1066'),r.county),
        tracks:FB.startStoryTracks(sc,r.county), family:Object.keys(sc.familyPresets),
        anchor:b.startLocations[sc.id], grants:sc.startEffects || null };
    }), pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() };
  }, openings)).toEqual({ errors:[], rows:openings.map(function (r) {
    return { id:r.scenario, local:true, away:false, wrongDate:false, tracks:[r.agenda], family:['standard'], anchor:[r.county], grants:null };
  }), pure:true });
});

for (const row of openings) {
  test(row.scenario + ' adopts one incumbent and the exact named household at its home site', async function ({ page }, info) {
    await start(page, info, row); // The real code-entry and new-game path, including its identity gates.
    const result = await page.evaluate(function (r) {
      const s = FB.state, me = s.chars[s.player.charId], p = s.player;
      const kin = r.kin.map(function (name) {
        return Object.keys(s.chars).map(function (id) { return s.chars[id]; }).filter(function (c) { return c.name === name && !c.dead; });
      });
      const profile = s.stories[r.profile], other = FB.realmRulerCharacterSnapshot(s,r.other);
      const b = FB.bookmark('1096'), definition = b.realms.find(function (d) { return d.id === r.realm; });
      const expected = b.provinces.filter(function (c) { return c.realm === r.realm; }).map(function (c) { return c.id; }).sort();
      const home = FB.world.byId[p.provinceId].settlements[p.homeSettlement];
      const familyOK = r.scenario === 'bohemond_1096' ? !me.spouseId && me.childrenIds.length === 0
        : r.scenario === 'godfrey_1096'
        ? !me.spouseId && me.childrenIds.length === 0 && me.motherId === kin[0][0].id &&
          kin[1][0].motherId === me.motherId && kin[2][0].motherId === me.motherId
        : me.spouseId === kin[0][0].id && kin[0][0].spouseId === me.id &&
          kin[1][0].fatherId === me.id && kin[1][0].motherId !== kin[0][0].id && me.childrenIds.length === 1;
      return { name:me.name, born:me.born, count:Object.values(s.chars).filter(function (c) { return c.name === r.name && !c.dead; }).length,
        home:p.provinceId, site:home.site, adopted:!s.realms[r.realm] && !!s.realms.player,
        ruler:FB.realmRulerCharacterSnapshot(s,'player').id === me.id,
        holdings:p.provs.slice().sort(), expected:expected, liege:p.liege,
        expectedLiege:definition.liege || null, kin:kin.map(function (list) { return list.length; }), familyOK:familyOK,
        localStories:openingsIgnored(), goals:Object.keys(profile.goals).length,
        contact:profile.contacts[r.contact] === other.id, freeFriend:!!((s.friends || {})[other.id]),
        journey:p.travel || null, homeUnchanged:s.owner.liege === 'hre_1096' };
      function openingsIgnored() {
        return ['godfrey_agenda_1096','raymond_agenda_1096','bohemond_agenda_1096'].filter(function (id) { return !!s.stories[id]; });
      }
    }, row);
    expect(result).toMatchObject({ name:row.name, born:row.born, count:1, home:row.county, site:row.site,
      adopted:true, ruler:true, kin:row.kin.map(function () { return 1; }), familyOK:true,
      localStories:[row.agenda], goals:3, contact:true, freeFriend:false, journey:null, homeUnchanged:true });
    expect(result.holdings).toEqual(result.expected);
    expect(result.liege).toBe(result.expectedLiege);
  });

  test(row.scenario + ' completes eight dated reviews with no resource, family, army or property effects', async function ({ page }, info) {
    await start(page, info, row);
    expect(await page.evaluate(function (r) {
      const s = FB.state, id = r.agenda, story = FB.stories.get(id), d = story.declaration;
      function resources() { return JSON.stringify([s.owner,s.holder,s.player.gold,s.player.prestige,s.player.piety,
        s.armies,s.authority.contracts,s.player.travel,s.player.provs,Object.keys(s.chars)]); }
      const before = resources(), pureBefore = JSON.stringify(s), rng = FB.getRngState();
      FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.quote(s,id,d.stages[0].choices[0].id);
      const pure = pureBefore === JSON.stringify(s) && rng === FB.getRngState();
      const advanced = d.stages.map(function (stage) {
        s.date = { year:stage.year, season:stage.season, day:1 }; s.turn++;
        const c = stage.choices.find(function (choice) { return choice.operation === 'agenda_priority'; });
        return FB.stories.apply(s,id,c.id,FB.stories.quote(s,id,c.id));
      });
      const t = s.stories[id], goal = s.stories[r.profile].goals;
      const saved = JSON.parse(FB.save.serialize()), record = JSON.stringify([t,s.stories[r.profile]]);
      FB.save.restore(saved);
      return { pure:pure, advanced:advanced, unchanged:before === resources(), status:t.status, decisions:t.decisions.length,
        goals:Object.keys(goal).filter(function (key) { return key !== 'reserve'; }).every(function (key) { return goal[key].status === 'completed'; }),
        restored:record === JSON.stringify([FB.state.stories[id],FB.state.stories[r.profile]]) };
    }, row)).toEqual({ pure:true, advanced:Array(8).fill(true), unchanged:true, status:'agenda_complete', decisions:8, goals:true, restored:true });
  });

  test(row.scenario + ' can stop, rejects replay and preserves absent records through restore', async function ({ page }, info) {
    await start(page, info, row);
    expect(await page.evaluate(function (r) {
      let s = FB.state;
      const id = r.agenda, q = FB.stories.quote(s,id,'agenda_stop_program'), gold = s.player.gold;
      function family() {
        return JSON.stringify([r.name].concat(r.kin).map(function (name) {
          const c = Object.values(FB.state.chars).find(function (c) { return c.name === name && !c.dead; });
          return [c.id,c.born,c.motherId,c.fatherId,c.spouseId,c.childrenIds,c.homeProvinceId];
        }));
      }
      const identity = family();
      const stopped = FB.stories.apply(s,id,'agenda_stop_program',q);
      const repeated = FB.stories.apply(s,id,'agenda_stop_program',q), status = s.stories[id].status;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved); s = FB.state;
      const retained = s.stories[id].status === status && s.player.gold === gold && identity === family();
      delete s.stories[id]; delete s.stories[r.profile];
      const absent = JSON.parse(FB.save.serialize()); FB.save.restore(absent);
      return { stopped:stopped, repeated:repeated, status:status, retained:retained,
        absent:!FB.state.stories[id] && !FB.state.stories[r.profile] && identity === family() };
    }, row)).toEqual({ stopped:true, repeated:false, status:'agenda_stopped', retained:true, absent:true });
  });

  test(row.scenario + ' interrupts when the original protagonist dies without executing a pending choice', async function ({ page }, info) {
    await start(page, info, row);
    expect(await page.evaluate(function (r) {
      const s = FB.state, story = FB.stories.get(r.agenda), t = s.stories[r.agenda];
      const c = story.declaration.stages[0].choices[0].id, quote = FB.stories.quote(s,r.agenda,c);
      const money = s.player.gold, owners = JSON.stringify(s.owner);
      s.chars[s.player.charId].dead = true;
      story.day(s,t);
      const applied = FB.stories.apply(s,r.agenda,c,quote);
      FB.stories.get(r.profile).day(s,s.stories[r.profile]);
      return { applied:applied, status:t.status, decisions:t.decisions.length,
        unchanged:money === s.player.gold && owners === JSON.stringify(s.owner),
        archived:Object.keys(s.stories[r.profile].goals).every(function (id) {
          return s.stories[r.profile].goals[id].status !== 'pending';
        }) };
    }, row)).toEqual({ applied:false, status:'agenda_interrupted', decisions:0, unchanged:true, archived:true });
  });
}

test('foreign household members remain at their declared homes and no later infant is invented', async function ({ page }, info) {
  await start(page, info, openings[0]);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return ['Ida of Lorraine','Eustace III','Baldwin'].map(function (name) {
      const c = Object.values(s.chars).find(function (c) { return c.name === name && !c.dead; });
      return [c.name,c.homeProvinceId];
    });
  })).toEqual([['Ida of Lorraine','boulogne'],['Eustace III','boulogne'],['Baldwin','verdun']]);
  await start(page, info, openings[1]);
  expect(await page.evaluate(function () {
    const me = FB.state.chars[FB.state.player.charId];
    return me.childrenIds.map(function (id) { return FB.state.chars[id].name; });
  })).toEqual(['Bertrand']);
});

test('an ordinary 1096 household attaches no western ruler program or profile', async function ({ page }, info) {
  await startParityGame(page, info, { bookmark:'1096', scenario:'pilgrim_household_1096', declaredOpening:true });
  expect(await page.evaluate(function () {
    return ['godfrey_agenda_1096','raymond_agenda_1096','bohemond_agenda_1096',
      'opening_godfrey_1096','opening_raymond_1096','opening_bohemond_1096']
      .filter(function (id) { return !!FB.state.stories[id]; });
  })).toEqual([]);
});

test('Bohemond can consider the road and finish without creating a journey, command or eastern possession', async function ({ page }, info) {
  await start(page, info, openings[2]);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'bohemond_agenda_1096', d = FB.stories.get(id).declaration;
    const before = JSON.stringify([s.owner,s.holder,s.player.provs,s.player.provinceId,s.player.gold,
      s.player.travel,s.armies,s.authority.contracts,Object.keys(s.chars)]);
    const chosen = d.stages.map(function (stage, i) {
      s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
      const c = i === 3 ? 'bohemond_consider_road' : i === 7 ? 'bohemond_finish' : stage.choices[0].id;
      const quote = FB.stories.quote(s,id,c), ok = FB.stories.apply(s,id,c,quote);
      return [c,ok,FB.stories.apply(s,id,c,quote)];
    });
    return { choices:chosen, status:s.stories[id].status, holdings:s.player.provs.slice().sort(),
      unchanged:before === JSON.stringify([s.owner,s.holder,s.player.provs,s.player.provinceId,s.player.gold,
        s.player.travel,s.armies,s.authority.contracts,Object.keys(s.chars)]) };
  })).toEqual({ choices:[
    ['bohemond_review_home',true,false],['bohemond_keep_resources',true,false],['bohemond_review_news',true,false],
    ['bohemond_consider_road',true,false],['bohemond_keep_position',true,false],['bohemond_keep_obligations',true,false],
    ['bohemond_keep_relations',true,false],['bohemond_finish',true,false]
  ], status:'agenda_complete', holdings:['bari','brindisi','taranto'], unchanged:true });
});

test('Bohemond loses pending reviews with his office and retains the original papal contact', async function ({ page }, info) {
  await start(page, info, openings[2]);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'bohemond_agenda_1096', t = s.stories[id], p = s.stories.opening_bohemond_1096;
    const choice = 'bohemond_review_home', quote = FB.stories.quote(s,id,choice), gold = s.player.gold;
    const contact = p.contacts.papal_ruler, rng = FB.getRngState();
    s.chars[contact].dead = true;
    FB.stories.get('opening_bohemond_1096').day(s,p);
    const fixed = p.contacts.papal_ruler === contact && rng === FB.getRngState();
    s.player.provs.forEach(function (pid) { s.owner[pid] = 'apulia_1096'; s.holder[pid] = 'apulia_1096'; });
    s.player.provs = [];
    FB.invalidateRealmCache();
    FB.stories.get(id).day(s,t);
    FB.stories.get('opening_bohemond_1096').day(s,p);
    return { applied:FB.stories.apply(s,id,choice,quote), status:t.status, decisions:t.decisions.length,
      unchanged:s.player.gold === gold, fixed:fixed,
      archived:Object.keys(p.goals).every(function (key) { return p.goals[key].status === 'archived'; }) };
  })).toEqual({ applied:false, status:'agenda_interrupted', decisions:0, unchanged:true, fixed:true, archived:true });
});
