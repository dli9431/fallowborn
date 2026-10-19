'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {useReleasedStartRules} = require('../support/game/released-starts');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'data/bookmark_1241_alexander.js','data/starts_alexander_1241.js','data/story_alexander_1241.js',
  'data/bookmark_1241_operations.js','index.html','data/bookmark_1241.js','data/bookmark_1241_scaffold_a.js',
  'data/bookmark_1241_scaffold_b.js','data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/starts_1241.js','data/story_ruler_agendas_1241.js','data/identities_1241.js',
  'data/story_instances.js','data/story_ruler_agendas.js','data/eras.js','data/government_rollout.js',
  'js/main.js','js/starts.js','js/world.js','js/model.js','js/stories.js',
  'js/story_ruler_agenda.js','js/story_opening_goals.js','js/save.js','js/save_v4.js',
  'js/bookmark_setup.js','js/ui_misc.js','js/ui_modals.js'
]);

const openings = [
  {id:'bela_1241',name:'Bela IV',title:'Bela IV at Obuda',realm:'hungary_1241',county:'szekesfehervar',
    agenda:'bela_agenda_1241',profile:'opening_bela_1241',site:'geo_obuda_3054643',born:1206,
    family:['Coloman','Maria Laskarina','Stephen'],contacts:2},
  {id:'yaroslav_1241',name:'Yaroslav Vsevolodovich',title:'Yaroslav at Vladimir',realm:'vladimir_1241',county:'suzdal',
    agenda:'yaroslav_agenda_1241',profile:'opening_yaroslav_1241',site:'geo_vladimir_473247',born:1191,
    family:['Alexander Yaroslavich','Andrei Yaroslavich','Daughter of Bryachislav','Feodosia'],contacts:3}
];

async function beginRuler(page,info,row,code) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  await page.evaluate(function () {
    FB.startProgression.noteTier(3);
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s,sc,options) {
      const me = s.chars[s.player.charId], realm = s.realms[sc.rulerRealmId];
      window.__rulerBeforeAdoption = JSON.parse(JSON.stringify({me:me,treasury:realm.treasury.gold,
        owned:Object.keys(s.owner).filter(function (id) { return s.owner[id] === sc.rulerRealmId; }).sort(),
        held:Object.keys(s.holder).filter(function (id) { return s.holder[id] === sc.rulerRealmId; }).sort()}));
      FB.adoptStartingRealm = adopt;
      return adopt(s,sc,options);
    };
  });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('RULER1241-1241-'+row.id+'-'+row.county+'-m-'+row.name.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="1241"]').click();
    await page.getByRole('button',{name:row.title,exact:true}).click();
  }
  await expect(page.locator('#cg-name')).toHaveValue(row.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('the current and retained 1241 revisions validate with separate households and settlement slots',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (rows) {
    const bytes = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const old = FB.bookmark('1241','baseline'), fresh = FB.bookmark('1241');
    const faults = FB.bookmarkRevisions('1241').map(function (b) { return FB.validateBookmark(b); });
    return {revision:fresh.revision,oldLayout:old.settlementLayout,faults:faults,
      facts:rows.map(function (row) {
        const previous = old.realms.find(function (r) { return r.id === row.realm; });
        const current = fresh.realms.find(function (r) { return r.id === row.realm; });
        return {oldCourt:!!previous.royalCourt,newCourt:!!current.royalCourt,
          excluded:old.starts.indexOf(row.id) < 0,head:FBDATA.settlementLayouts[fresh.settlementLayout][row.county][0].site,
          detached:previous !== current && previous.ruler !== current.ruler};
      }),pure:bytes === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },openings)).toEqual({revision:'operations_v2',oldLayout:'1241',faults:[[],[],[],[],[]],pure:true,facts:[
    {oldCourt:false,newCourt:true,excluded:true,head:'geo_obuda_3054643',detached:true},
    {oldCourt:false,newCourt:true,excluded:true,head:'geo_vladimir_473247',detached:true}
  ]});
});

for (const row of openings) {
  for (const code of [false,true]) {
    test(row.id+' adopts its existing family through '+(code?'a shared code':'the historical card'),async function ({page},info) {
      await beginRuler(page,info,row,code);
      expect(await page.evaluate(function (row) {
        const s = FB.state, me = s.chars[s.player.charId], before = window.__rulerBeforeAdoption;
        const site = FB.settlementsOf(s,row.county)[s.player.homeSettlement];
        const goals = s.stories[row.profile], people = FB.stories.get(row.profile).people(s,goals);
        function identity(c) { return [c.id,c.name,c.born,c.dyn,c.skills,c.spouseId,c.childrenIds]; }
        const save = JSON.parse(FB.save.serialize());
        function snapshot(state) { return JSON.stringify([state.start,state.owner,state.holder,state.player,state.chars,state.stories,state.bookmarkSetup]); }
        const saved = snapshot(s);
        FB.activateBookmark('867'); FB.save.restore(save);
        return {name:me.name,born:me.born,tier:s.player.tier,rank:s.realms.player.rank,home:s.player.provinceId,site:site.site,
          physical:FB.provinceAtGrid(site.x,site.y).id,
          adopted:JSON.stringify(identity(me)) === JSON.stringify(identity(before.me)),treasury:s.player.gold === before.treasury,
          sourceGone:!s.realms[row.realm],single:Object.values(s.chars).filter(function (c) { return c.name === row.name && !c.dead; }).length,
          owners:JSON.stringify(before.owned) === JSON.stringify(Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort()),
          holders:JSON.stringify(before.held) === JSON.stringify(Object.keys(s.holder).filter(function (id) { return s.holder[id] === 'player'; }).sort()),
          family:row.family.map(function (name) { return Object.values(s.chars).filter(function (c) { return c.name === name && !c.dead; }).length; }),
          contacts:people.length,linked:people.every(function (p) { return !!p.characterId && !!s.chars[p.characterId]; }),
          agenda:s.stories[row.agenda].subjectId === me.id,restored:saved === snapshot(FB.state)};
      },row)).toEqual({name:row.name,born:row.born,tier:6,rank:3,home:row.county,site:row.site,physical:row.county,
        adopted:true,treasury:true,sourceGone:true,single:1,owners:true,holders:true,family:row.family.map(function () { return 1; }),
        contacts:row.contacts,linked:true,agenda:true,restored:true});
    });
  }

  test(row.id+' follows all eight deferred priorities without money, territory or soldiers',async function ({page},info) {
    await beginRuler(page,info,row,true);
    expect(await page.evaluate(function (row) {
      const s = FB.state, d = FBDATA.rulerAgendas_1241[row.agenda], t = s.stories[row.agenda];
      const checkpoint = JSON.parse(FB.save.serialize());
      const possessions = JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.authority.contracts]);
      const progress = [], repeats = [];
      d.stages.forEach(function (stage) {
        s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
        const choice = stage.choices.filter(function (c) { return c.operation === 'agenda_priority'; }).pop();
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const quote = FB.stories.quote(s,row.agenda,choice.id);
        if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure agenda review');
        progress.push(FB.stories.apply(s,row.agenda,choice.id,quote));
        repeats.push(FB.stories.apply(s,row.agenda,choice.id,quote));
      });
      const result = {progress:progress,repeats:repeats,status:t.status,steps:t.decisions.length,
        noRewards:possessions === JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.authority.contracts])};
      FB.save.restore(checkpoint);
      result.stop = FB.stories.apply(FB.state,row.agenda,'agenda_stop_program',FB.stories.quote(FB.state,row.agenda,'agenda_stop_program'));
      const ended = JSON.parse(FB.save.serialize()); FB.save.restore(ended);
      result.stopped = FB.state.stories[row.agenda].status;
      return result;
    },row)).toEqual({progress:Array(8).fill(true),repeats:Array(8).fill(false),status:'agenda_complete',steps:8,noRewards:true,stop:true,stopped:'agenda_stopped'});
  });

  test(row.id+' rejects stale reviews, observes real decisions and ends with its protagonist',async function ({page},info) {
    await beginRuler(page,info,row,true);
    expect(await page.evaluate(function (row) {
      const s = FB.state, first = FBDATA.rulerAgendas_1241[row.agenda].stages[0].choices[0].id;
      const q = FB.stories.quote(s,row.agenda,first); s.player.gold++;
      const bytes = JSON.stringify(s), stale = FB.stories.apply(s,row.agenda,first,q);
      const pure = bytes === JSON.stringify(s);
      const accepted = FB.stories.apply(s,row.agenda,first,FB.stories.quote(s,row.agenda,first));
      const profile = s.stories[row.profile]; FB.stories.get(row.profile).observe(s,profile);
      const goal = profile.goals[row.id === 'bela_1241'?'bela_accounts_goal':'yaroslav_accounts_goal'].status;
      const pending = profile.goals[row.id === 'bela_1241'?'bela_host_payment':'yaroslav_receipt'].status;
      s.chars[s.player.charId].dead = true;
      FB.stories.get(row.agenda).day(s,s.stories[row.agenda]);
      return {stale:stale,pure:pure,accepted:accepted,goal:goal,pending:pending,choices:FB.stories.choices(s,row.agenda).length};
    },row)).toEqual({stale:false,pure:true,accepted:true,goal:'completed',pending:'pending',choices:0});
  });

  test(row.id+' replays one deterministic court and family from its seed',async function ({page},info) {
    async function snapshot() {
      return page.evaluate(function () {
        const s = FB.state;
        return JSON.parse(JSON.stringify([s.start,s.player,s.chars,s.owner,s.holder,s.stories,FB.getRngState() >>> 0,FB.getUidCounter()]));
      });
    }
    await beginRuler(page,info,row,true);
    const first = await snapshot();
    await beginRuler(page,info,row,true);
    expect(await snapshot()).toEqual(first);
  });
}

test('Yaroslav’s family keeps reciprocal parentage, separate homes and one Alexander',async function ({page},info) {
  await beginRuler(page,info,openings[1],true);
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    function person(name) { return Object.values(s.chars).find(function (c) { return c.name === name; }); }
    const mother = person('Feodosia'), alexander = person('Alexander Yaroslavich');
    const wife = person('Daughter of Bryachislav'), andrei = person('Andrei Yaroslavich');
    return {marriage:me.spouseId === mother.id && mother.spouseId === me.id,
      alexanderMarriage:alexander.spouseId === wife.id && wife.spouseId === alexander.id,
      parentage:[alexander,andrei].every(function (c) { return c.fatherId === me.id && c.motherId === mother.id && me.childrenIds.indexOf(c.id) >= 0 && mother.childrenIds.indexOf(c.id) >= 0; }),
      homes:[mother,alexander,wife].map(function (c) { return FB.characterResidence(s,c); }),
      novgorod:FB.realmRulerCharacterSnapshot(s,'novgorod_1241').id !== alexander.id,
      noOperations:!s.realms.mongol_western_command_1241 && !s.realms.koten_following_1241};
  })).toEqual({marriage:true,alexanderMarriage:true,parentage:true,homes:['rostov','rostov','rostov'],novgorod:true,noOperations:true});
});

test('invalid detached ruler and household declarations fail without mutation',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const bytes = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const results = ['name','born','spouse'].map(function (kind) {
      const b = JSON.parse(JSON.stringify(FB.bookmark('1241')));
      const r = b.realms.find(function (r) { return r.id === 'hungary_1241'; });
      if (kind === 'name') r.ruler.name = 'Another ruler';
      if (kind === 'born') r.royalCourt.members[1].born = 1207;
      if (kind === 'spouse') r.royalCourt.members[0].spouseId = 'missing';
      return FB.validateBookmark(b).length > 0;
    });
    return {results:results,pure:bytes === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({results:[true,true,true],pure:true});
});
