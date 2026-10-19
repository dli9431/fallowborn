'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startParityGame} = require('../support/game/parity');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_eastern_rulers_1096.js','data/story_eastern_rulers_1096.js',
  'data/bookmark_1096.js','data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js','data/identities_1096.js',
  'data/institutions_1096.js','data/bookmark_1096_campaigns.js','data/story_world_1096.js',
  'data/starts.js','data/story_instances.js','data/story_ruler_agendas.js','data/start_ambitions.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js','data/settlements_real.js',
  'data/government_rollout.js','data/technology.js','data/political_institutions.js',
  'js/starts.js','js/bookmark_setup.js','js/world.js','js/model.js','js/main.js','js/mods.js',
  'js/government_lineage.js','js/government_administration.js','js/government_aristocracy.js','js/government_support.js',
  'js/authority.js','js/lordships.js','js/settlement.js','js/fiscal.js',
  'js/stories.js','js/story_ruler_agenda.js','js/story_opening_goals.js',
  'js/treasury.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js'
]);

const openings = [
  {scenario:'alexios_1096',realm:'byzantium_1096',agenda:'alexios_agenda_1096',profile:'opening_alexios_1096',
    name:'Alexios I Komnenos',age:39,culture:'greek',religion:'orthodox',tier:7,rank:4,
    form:'administrative_monarchy',county:'constantinople',site:'constantinople',children:6,contacts:1},
  {scenario:'kilij_arslan_1096',realm:'rum_1096',agenda:'rum_agenda_1096',profile:'opening_rum_1096',
    name:'Kilij Arslan I',age:17,culture:'turkic',religion:'sunni',tier:6,rank:3,
    form:'territorial',county:'nicaea',site:'nicaea_head',children:0,contacts:1}
];

async function begin(page,info,def) {
  // Observe the real construction boundary, retaining the ordinary start journey.
  await page.addInitScript(function () {
    document.addEventListener('DOMContentLoaded',function () {
      const adopt = FB.adoptStartingRealm;
      FB.adoptStartingRealm = function (s,sc) {
        try {
          const c = s.chars[s.player.charId], r = s.realms[sc.rulerRealmId];
          window.__easternBeforeAdoption = JSON.parse(JSON.stringify({
            id:c.id,name:c.name,born:c.born,spouse:c.spouseId || null,children:c.childrenIds || [],
            treasury:r.treasury.gold,
            owned:Object.keys(s.owner).filter(function (id) {return s.owner[id] === sc.rulerRealmId;}).sort(),
            held:Object.keys(s.holder).filter(function (id) {return s.holder[id] === sc.rulerRealmId;}).sort()
          }));
          return adopt(s,sc);
        } finally { FB.adoptStartingRealm = adopt; }
      };
    },{once:true});
  });
  await startParityGame(page,info,{bookmark:'1096',scenario:def.scenario,declaredOpening:true});
}

test('eastern starts validate against the actual dated courts and reject mismatched identity purely',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const bm = FB.bookmark('1096'), before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const starts = FBDATA.startScenarios_eastern_rulers_1096;
    const accepted = FB.mods.validate({name:'Eastern court starts',startScenarios:JSON.parse(JSON.stringify(starts))});
    const invalid = JSON.parse(JSON.stringify(starts[1])); invalid.startReligion = 'orthodox';
    const rejected = FB.mods.validate({name:'Wrong court identity',startScenarios:[invalid]});
    const byz = bm.realms.find(function (r) {return r.id === 'byzantium_1096';});
    const rum = bm.realms.find(function (r) {return r.id === 'rum_1096';});
    return {errors:FB.validateBookmark(bm),accepted:accepted.errors,rejected:rejected.errors.length > 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      administration:byz.administrationProfileId,
      family:byz.royalCourt.members.map(function (m) {return [m.id,m.born,m.homeProvinceId];}),
      rum:[rum.ruler.name,rum.ruler.born,rum.royalCourt.spouseId,rum.royalCourt.members.length],
      sites:[FBDATA.settlementLayouts['1096'].constantinople[0].site,FBDATA.settlementLayouts['1096'].nicaea[0].site]};
  });
  expect(result).toEqual({errors:[],accepted:[],rejected:true,pure:true,administration:'byzantine_1066',
    family:[['irene',1066,'constantinople'],['anna',1083,'constantinople'],['maria',1085,'constantinople'],
      ['john',1087,'constantinople'],['eudokia',1094,'constantinople'],['andronikos',1091,'constantinople'],['isaac',1093,'constantinople']],
    rum:['Kilij Arslan I',1079,null,0],sites:['constantinople','nicaea_head']});
});

test('the historical picker offers the two fixed eastern identities and one existing-family option',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').click();
  await expect(page.getByRole('button',{name:'Alexios at Constantinople',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Kilij Arslan at Nicaea',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Kilij Arslan at Nicaea',exact:true}).click();
  await expect(page.locator('#cg-name')).toHaveValue('Kilij Arslan I');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await expect(page.locator('#cg-community')).toHaveClass(/hidden/);
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  await expect(page.locator('input[name=cg-family][value=standard]')).toBeChecked();
});

for (const def of openings) {
  test(def.scenario + ' adopts one incumbent with the same household, public resources and holdings',async function ({page},info) {
    await begin(page,info,def);
    const result = await page.evaluate(function (d) {
      const s = FB.state, me = s.chars[s.player.charId], before = window.__easternBeforeAdoption;
      const family = (me.childrenIds || []).map(function (id) {const c=s.chars[id];return [c.name,c.born,c.fatherId,c.motherId];});
      const profile = s.stories[d.profile], people = FB.stories.get(d.profile).people(s,profile);
      const contacts = people.map(function (p) {return s.chars[p.characterId].name;});
      const snapshot = JSON.stringify([s.start,s.player,s.owner,s.holder,s.chars,s.stories]);
      const saved = JSON.parse(FB.save.serialize());
      FB.activateBookmark('867'); FB.save.restore(saved);
      const restored = FB.state;
      return {identity:me.id === before.id && me.name === before.name && me.born === before.born,
        household:JSON.stringify([me.spouseId || null,me.childrenIds || []]) === JSON.stringify([before.spouse,before.children]),
        money:s.player.gold === before.treasury,
        owned:JSON.stringify(Object.keys(s.owner).filter(function (id) {return s.owner[id] === 'player';}).sort()) === JSON.stringify(before.owned),
        held:JSON.stringify(Object.keys(s.holder).filter(function (id) {return s.holder[id] === 'player';}).sort()) === JSON.stringify(before.held),
        sourceRemoved:!s.realms[d.realm],single:Object.values(s.chars).filter(function (c) {return !c.dead && c.name === d.name;}).length,
        name:me.name,age:FB.ageOf(me,s.date.year),culture:me.culture,religion:me.religion,tier:s.player.tier,rank:s.realms.player.rank,
        form:FB.political.government(s,{kind:'realm',id:'player'}).formId,
        site:FB.world.byId[d.county].settlements[s.player.homeSettlement].site,
        spouse:me.spouseId ? s.chars[me.spouseId].name : null,children:family,contacts:contacts,
        pendingGoals:Object.keys(profile.goals).every(function (id) {return profile.goals[id].status === 'pending';}),
        tracks:!!s.stories[d.agenda] && !!profile && !s.stories.pilgrim_household_track_1096,
        restored:snapshot === JSON.stringify([restored.start,restored.player,restored.owner,restored.holder,restored.chars,restored.stories])};
    },def);
    expect(result).toMatchObject({identity:true,household:true,money:true,owned:true,held:true,sourceRemoved:true,single:1,
      name:def.name,age:def.age,culture:def.culture,religion:def.religion,tier:def.tier,rank:def.rank,form:def.form,site:def.site,
      pendingGoals:true,tracks:true,restored:true});
    expect(result.children).toHaveLength(def.children);
    expect(result.contacts).toHaveLength(def.contacts);
    if (def.scenario === 'alexios_1096') {
      expect(result.spouse).toBe('Irene Doukaina');
      expect(result.children.map(function (row) {return row.slice(0,2);}).sort()).toEqual([
        ['Andronikos Komnenos',1091],['Anna Komnene',1083],['Eudokia Komnene',1094],
        ['Isaac Komnenos',1093],['John Komnenos',1087],['Maria Komnene',1085]
      ]);
      expect(result.contacts).toEqual(['Kilij Arslan I']);
    } else {
      expect(result.spouse).toBeNull();
      expect(result.contacts).toEqual(['Alexios I Komnenos']);
    }
  });

  test(def.scenario + ' completes bounded priority reviews once without money, troops, treaties or movement',async function ({page},info) {
    await begin(page,info,def);
    const result = await page.evaluate(function (d) {
      const s = FB.state, story = FB.stories.get(d.agenda), rec = s.stories[d.agenda], declaration = story.declaration;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.stories.cards(s); FB.stories.choices(s,d.agenda); FB.stories.get(d.profile).people(s,s.stories[d.profile]);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const assets = JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.wars,s.authority,s.player.provinceId,s.player.homeSettlement]);
      const first = declaration.stages[0].choices.find(function (c) {return c.operation === 'agenda_priority';});
      const stale = FB.stories.quote(s,d.agenda,first.id); s.turn++;
      const refused = !FB.stories.apply(s,d.agenda,first.id,stale);
      const steps = [], repeats = [];
      declaration.stages.forEach(function (stage) {
        // Exercise dated boundaries directly, without simulating a year.
        s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
        const c = stage.choices.find(function (row) {return row.operation === 'agenda_priority';});
        const q = FB.stories.quote(s,d.agenda,c.id);
        steps.push(FB.stories.apply(s,d.agenda,c.id,q));
        repeats.push(FB.stories.apply(s,d.agenda,c.id,q));
      });
      const profile = s.stories[d.profile], goals = Object.keys(profile.goals).map(function (id) {return profile.goals[id].status;});
      const bytes = JSON.stringify([rec,profile]), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return {pure:pure,refused:refused,steps:steps,repeats:repeats,status:rec.status,
        unchanged:assets === JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.wars,s.authority,s.player.provinceId,s.player.homeSettlement]),
        goals:goals,retained:bytes === JSON.stringify([FB.state.stories[d.agenda],FB.state.stories[d.profile]])};
    },def);
    expect(result).toEqual({pure:true,refused:true,steps:[true,true,true,true,true,true,true,true],repeats:[false,false,false,false,false,false,false,false],
      status:'agenda_complete',unchanged:true,goals:['completed','pending','pending'],retained:true});
  });

  test(def.scenario + ' can stop before the next window and loses unfinished authority on protagonist death',async function ({page},info) {
    await begin(page,info,def);
    const result = await page.evaluate(function (d) {
      const s = FB.state, story = FB.stories.get(d.agenda), saved = JSON.parse(FB.save.serialize());
      const first = story.declaration.stages[0].choices.find(function (c) {return c.operation === 'agenda_priority';});
      FB.stories.apply(s,d.agenda,first.id,FB.stories.quote(s,d.agenda,first.id));
      const future = story.declaration.stages[1].choices[0].id;
      const early = FB.stories.quote(s,d.agenda,future).allowed;
      const stop = FB.stories.apply(s,d.agenda,'agenda_stop_program',FB.stories.quote(s,d.agenda,'agenda_stop_program'));
      const status = s.stories[d.agenda].status;
      FB.save.restore(saved);
      const restored = FB.state, me = restored.chars[restored.player.charId];
      me.dead = true; restored.player.dead = true;
      story.day(restored,restored.stories[d.agenda]);
      const profile = FB.stories.get(d.profile); profile.day(restored,restored.stories[d.profile]);
      return {early:early,stop:stop,status:status,interrupted:restored.stories[d.agenda].status,
        archived:Object.keys(restored.stories[d.profile].goals).every(function (id) {return restored.stories[d.profile].goals[id].status === 'archived';})};
    },def);
    expect(result).toEqual({early:false,stop:true,status:'agenda_stopped',interrupted:'agenda_interrupted',archived:true});
  });

  test(def.scenario + ' retains its original foreign contact after that ruler dies',async function ({page},info) {
    await begin(page,info,def);
    const result = await page.evaluate(function (d) {
      const s = FB.state, profile = FB.stories.get(d.profile), record = s.stories[d.profile];
      const original = profile.people(s,record)[0].characterId, person = s.chars[original];
      const noFriend = !(s.player.friendContacts || {})[original];
      FB.killChar(s,person);
      const after = profile.people(s,record)[0];
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      const restored = profile.people(FB.state,FB.state.stories[d.profile])[0];
      return {noFriend:noFriend,dead:person.dead,retained:after.characterId === original && restored.characterId === original,
        unavailable:/died/.test(after.reason)};
    },def);
    expect(result).toEqual({noFriend:true,dead:true,retained:true,unavailable:true});
  });

  for (const ending of ['continue_rule','finish_review']) {
    test(def.scenario + ' preserves the earlier four-review completion with ' + ending,async function ({page},info) {
      await begin(page,info,def);
      const result = await page.evaluate(function (input) {
        const d = input.def, s = FB.state, story = FB.stories.get(d.agenda), rec = s.stories[d.agenda];
        const prefix = d.scenario === 'alexios_1096' ? 'alexios_' : 'rum_';
        story.declaration.stages.slice(0,3).forEach(function (stage) {
          s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
          const c = stage.choices.find(function (c) {return c.operation === 'agenda_priority';});
          if (!FB.stories.apply(s,d.agenda,c.id,FB.stories.quote(s,d.agenda,c.id))) throw new Error('Opening priority failed');
        });
        s.date = {year:1097,season:0,day:1}; s.turn++;
        // Exact semantic decision records written by the former four-stage declaration.
        // The old continue_rule priority also completed that program at its last stage.
        const legacy = d.scenario === 'alexios_1096' ? [
          ['alexios_administration','alexios_retain_administration'],['alexios_frontier','alexios_defensive_priority'],
          ['alexios_passage','alexios_passage_priority']
        ] : [
          ['rum_court','rum_review_resources'],['rum_approaches','rum_defensive_priority'],
          ['rum_eastern_policy','rum_eastern_priority']
        ];
        if (JSON.stringify(rec.decisions.map(function (row) {return [row.stageId,row.choiceId];})) !== JSON.stringify(legacy))
          throw new Error('Earlier decision identities changed');
        rec.decisions.push({stageId:prefix + 'continuation',choiceId:prefix + input.ending,turn:s.turn});
        rec.step = 4; rec.status = 'agenda_complete'; rec.outcomeTurn = s.turn;
        const bytes = JSON.stringify([rec,s.stories[d.profile]]), saved = JSON.parse(FB.save.serialize());
        FB.activateBookmark('867'); FB.save.restore(saved);
        const restored = FB.state;
        story.day(restored,restored.stories[d.agenda]);
        return {retained:bytes === JSON.stringify([restored.stories[d.agenda],restored.stories[d.profile]]),
          status:restored.stories[d.agenda].status,step:restored.stories[d.agenda].step,
          noReplay:FB.stories.choices(restored,d.agenda).length === 0};
      },{def:def,ending:ending});
      expect(result).toEqual({retained:true,status:'agenda_complete',step:4,noReplay:true});
    });
  }

  test(def.scenario + ' can save at the old final review, extend voluntarily and stop before the next date',async function ({page},info) {
    await begin(page,info,def);
    const result = await page.evaluate(function (d) {
      let s = FB.state; const story = FB.stories.get(d.agenda), prefix = d.scenario === 'alexios_1096' ? 'alexios_' : 'rum_';
      story.declaration.stages.slice(0,3).forEach(function (stage) {
        s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
        const c = stage.choices.find(function (c) {return c.operation === 'agenda_priority';});
        if (!FB.stories.apply(s,d.agenda,c.id,FB.stories.quote(s,d.agenda,c.id))) throw new Error('Opening priority failed');
      });
      const pending = JSON.stringify(s.stories[d.agenda]), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved); s = FB.state;
      const retained = pending === JSON.stringify(s.stories[d.agenda]);
      const early = FB.stories.quote(s,d.agenda,prefix + 'extend_review').allowed;
      s.date = {year:1097,season:0,day:1}; s.turn++;
      const concluded = FB.stories.apply(s,d.agenda,prefix + 'continue_rule',FB.stories.quote(s,d.agenda,prefix + 'continue_rule')) &&
        s.stories[d.agenda].status === 'agenda_complete' && s.stories[d.agenda].step === 4;
      FB.save.restore(saved); s = FB.state;
      s.date = {year:1097,season:0,day:1}; s.turn++;
      const extend = FB.stories.apply(s,d.agenda,prefix + 'extend_review',FB.stories.quote(s,d.agenda,prefix + 'extend_review'));
      const stage = story.declaration.stages[4], c = stage.choices.find(function (c) {return c.operation === 'agenda_priority';});
      const continued = FB.stories.apply(s,d.agenda,c.id,FB.stories.quote(s,d.agenda,c.id));
      const next = story.declaration.stages[5].choices[0].id;
      const tooEarly = !FB.stories.quote(s,d.agenda,next).allowed;
      const stopped = FB.stories.apply(s,d.agenda,'agenda_stop_program',FB.stories.quote(s,d.agenda,'agenda_stop_program'));
      const bytes = JSON.stringify(s.stories[d.agenda]); FB.save.restore(JSON.parse(FB.save.serialize()));
      return {retained:retained,early:early,concluded:concluded,extend:extend,continued:continued,tooEarly:tooEarly,stopped:stopped,
        status:FB.state.stories[d.agenda].status,step:FB.state.stories[d.agenda].step,
        savedStop:bytes === JSON.stringify(FB.state.stories[d.agenda])};
    },def);
    expect(result).toEqual({retained:true,early:false,concluded:true,extend:true,continued:true,tooEarly:true,stopped:true,
      status:'agenda_stopped',step:5,savedStop:true});
  });

  test(def.scenario + ' loses the extended agenda on loss of its actual jurisdiction',async function ({page},info) {
    await begin(page,info,def);
    const result = await page.evaluate(function (d) {
      const s = FB.state, story = FB.stories.get(d.agenda), rec = s.stories[d.agenda];
      story.declaration.stages.slice(0,4).forEach(function (stage) {
        s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
        const c = stage.choices.find(function (c) {return c.operation === 'agenda_priority';});
        if (!FB.stories.apply(s,d.agenda,c.id,FB.stories.quote(s,d.agenda,c.id))) throw new Error('Opening priority failed');
      });
      const choice = story.declaration.stages[4].choices.find(function (c) {return c.operation === 'agenda_priority';});
      const q = FB.stories.quote(s,d.agenda,choice.id), person = s.player.charId;
      const receiver = d.realm === 'rum_1096' ? 'byzantium_1096' : 'rum_1096';
      FB.realmTerritory(s,'player').slice().forEach(function (pid) {FB.transferProvince(s,pid,receiver);});
      const before = JSON.stringify(s), rejected = !FB.stories.apply(s,d.agenda,choice.id,q);
      const pure = before === JSON.stringify(s); story.day(s,rec);
      return {rejected:rejected,pure:pure,samePerson:person === s.player.charId,status:rec.status};
    },def);
    expect(result).toEqual({rejected:true,pure:true,samePerson:true,status:'agenda_interrupted'});
  });
}

test('Alexios records actual current service once and rejects a review after that commission is removed',async function ({page},info) {
  await begin(page,info,openings[0]);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'alexios_agenda_1096', story = FB.stories.get(id), patron = {kind:'realm',id:'player'};
    FB.publicOfficeRows(s,'player').filter(function (row) {return row.effective;}).forEach(function (row) {
      if (!FB.publicOfficeApply(s,FB.publicOfficeQuote(s,patron,row.id,'remove'))) throw new Error('Opening commission removal failed');
    });
    const pid = 'constantinople', site = FB.settlementGrantSites(s,pid,'player')[0];
    if (!site) throw new Error('The capital needs a secondary productive settlement');
    // Use a real independent estate and the normal appointment transaction.
    const holder = FB.makeCharacter(s,{id:'eastern_account_source',name:'Local estate holder',sex:'m',
      culture:'greek',religion:'orthodox',born:1060,station:3,traits:[]});
    holder.homeProvinceId = pid; s.chars[holder.id] = holder;
    FB.SKILLS.forEach(function (skill) {holder.skills[skill] = 1;});
    if (!FB.assignSettlementLordship(s,pid,site.settlement,holder.id)) throw new Error('No productive estate');
    const officer = FB.makeCharacter(s,{id:'eastern_public_officer',name:'Provincial officer',sex:'m',
      culture:'greek',religion:'orthodox',born:1060,station:3,traits:[]});
    officer.homeProvinceId = pid; s.chars[officer.id] = officer;
    FB.SKILLS.forEach(function (skill) {officer.skills[skill] = 20;});
    s.player.gold = 1000;
    const input = {institutionId:'player',officeId:FB.administrationProfile(s,'player').governor,
      holderId:officer.id,provinceId:pid,scope:{kind:'county',id:pid}};
    const appointment = FB.publicAppointmentQuote(s,patron,input);
    if (!appointment.allowed) throw new Error(appointment.reason);
    const row = FB.publicAppoint(s,appointment);
    if (!row) throw new Error('Appointment failed');
    story.declaration.stages.slice(0,4).forEach(function (stage) {
      s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
      const c = stage.choices.find(function (c) {return c.operation === 'agenda_priority';});
      if (!FB.stories.apply(s,id,c.id,FB.stories.quote(s,id,c.id))) throw new Error('Opening priority failed');
    });
    const choice = 'alexios_record_current_service', q = FB.stories.quote(s,id,choice);
    const source = q.facts.source.rows.some(function (r) {return r.id === row.id && r.effective;});
    const pending = JSON.parse(FB.save.serialize());
    if (!FB.publicOfficeApply(s,FB.publicOfficeQuote(s,patron,row.id,'remove'))) throw new Error('Removal failed');
    const before = JSON.stringify(s), stale = !FB.stories.apply(s,id,choice,q), pure = before === JSON.stringify(s);
    const absent = !FB.stories.quote(s,id,choice).allowed;
    const fallback = FB.stories.quote(s,id,'alexios_keep_current_service').allowed;
    FB.save.restore(pending); const restored = FB.state;
    const assets = JSON.stringify([restored.authority,restored.player.gold,restored.owner,restored.holder,restored.armies]);
    const fresh = FB.stories.quote(restored,id,choice), accepted = FB.stories.apply(restored,id,choice,fresh);
    const repeated = FB.stories.apply(restored,id,choice,fresh);
    return {source:source,stale:stale,pure:pure,absent:absent,fallback:fallback,accepted:accepted,repeated:repeated,
      unchanged:assets === JSON.stringify([restored.authority,restored.player.gold,restored.owner,restored.holder,restored.armies])};
  });
  expect(result).toEqual({source:true,stale:true,pure:true,absent:true,fallback:true,accepted:true,repeated:false,unchanged:true});
});
