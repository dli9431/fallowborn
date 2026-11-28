'use strict';
const {installRestoreFacts} = require('../support/game/restore-facts');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {useReleasedStartRules} = require('../support/game/released-starts');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'js/bookmark_composition.js','index.html','data/starts.js','data/starts_568.js','data/starts_rulers_568.js',
  'data/story_ruler_agendas_568.js','data/starts_rulers_568_east.js',
  'data/story_ruler_agendas_568_east.js','data/story_instances.js','data/bookmark_568.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmark_568_identities.js','data/eras.js','data/political_institutions.js',
  'data/government_rollout.js','js/main.js','js/starts.js','js/world.js','js/model.js','js/authority.js','js/governments.js',
  'js/treasury.js','js/stories.js','js/story_ruler_agenda.js','js/government_administration.js',
  'js/government_aristocracy.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js'
]);

const courts = [
  {id:'justin_568',name:'Justin II',title:'Justin II at Constantinople',realm:'east_568',
    county:'constantinople',site:'constantinople',agenda:'justin_agenda_568',born:515,
    form:'roman_civic',profiles:[null,null]},
  {id:'khosrow_568',name:'Khosrow I',title:'Khosrow I at Ctesiphon',realm:'sasanian_568',
    county:'baghdad',site:'baghdad_outer_476',agenda:'khosrow_agenda_568',born:513,
    form:'aristocratic_monarchy',profiles:['sasanian_provinces_568','sasanian_568']}
];

// Keep activation outside the synchronous restore guard, then resume the proof.
async function evaluateAcrossBookmark(page, compute, argument) {
  await installRestoreFacts(page);
  await page.evaluate(compute, argument);
  const checkpoint = await page.evaluate(function () { return window.__startRestoreSave; });
  await restoreBookmark(page, checkpoint);
  expect(await page.evaluate(function () {
    return [FB.getRngState() >>> 0, FB.getUidCounter()];
  })).toEqual(await page.evaluate(function () { return window.__startRestoreSequence; }));
  return page.evaluate(function () { return window.__afterStartRestore(); });
}

async function beginCourt(page,info,court,code) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('EAST568-568-'+court.id+'-'+court.county+'-m-'+court.name.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="568"]').click();
    await page.locator('[data-scenario="'+court.id+'"]').click();
  }
  await expect(page.locator('#cg-name')).toHaveValue(court.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await page.evaluate(function () {
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s,scenario) {
      const c = s.chars[s.player.charId], r = s.realms[scenario.rulerRealmId];
      const government = s.authority.governments[scenario.rulerRealmId] || {};
      window.__openingCourt = {id:c.id,spouse:c.spouseId,children:c.childrenIds.slice(),
        treasury:r.treasury.gold,capital:r.capital,administration:government.administrationProfileId || null,
        aristocracy:government.aristocracy && government.aristocracy.profileId || null,source:scenario.rulerRealmId};
      FB.adoptStartingRealm = adopt;
      return adopt(s,scenario);
    };
  });
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('the fresh eastern revision preserves Frankish households and retained start lists',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (courts) {
    const b=FBDATA.bookmarks['568'], old=FB.bookmark('568','migration_v1'),
      frankish=FB.bookmark('568','frankish_courts_v2'), fresh=FB.bookmark('568');
    const before=JSON.stringify(FBDATA), rng=FB.getRngState(), uid=FB.getUidCounter();
    const spouse=frankish.realms.find(function (r) { return r.id==='austrasia_568'; }).royalCourt;
    const newSpouse=fresh.realms.find(function (r) { return r.id==='austrasia_568'; }).royalCourt;
    return {revision:b.revision,oldAbsent:courts.every(function (c) { return old.starts.indexOf(c.id)<0 && frankish.starts.indexOf(c.id)<0; }),
      newPresent:courts.every(function (c) { return fresh.starts.indexOf(c.id)>=0 &&
        FB.startProvinceAllowed(FBDATA.startScenarios.find(function (s) { return s.id===c.id; }),fresh,c.county); }),
      frankishPresent:['sigebert_568','chilperic_568','guntram_568'].every(function (id) { return fresh.starts.indexOf(id)>=0; }),
      familyPreserved:JSON.stringify(spouse)===JSON.stringify(newSpouse),
      easternCourts:courts.map(function (c) { return fresh.realms.find(function (r) { return r.id===c.realm; }).royalCourt; }),
      sites:courts.map(function (c) { return FBDATA.settlementLayouts[fresh.settlementLayout][c.county][0].site; }),
      faults:FB.bookmarkRevisions('568').map(function (rev) { return FB.validateBookmark(rev); }),
      pure:before===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },courts)).toMatchObject({revision:'eastern_courts_v3',oldAbsent:true,newPresent:true,frankishPresent:true,
    familyPreserved:true,sites:courts.map(function (c) { return c.site; }),faults:[[],[],[],[]],pure:true});
});

for (const court of courts) {
  for (const code of [false,true]) {
    test(court.id+' adopts its actual ruler through '+(code?'a code':'the picker'),async function ({page},info) {
      await beginCourt(page,info,court,code);
      expect(await evaluateAcrossBookmark(page, function (court) {
        const s=FB.state, me=s.chars[s.player.charId], original=window.__openingCourt,
          realm=s.realms.player, saved=JSON.parse(FB.save.serialize());
        const government=s.authority.governments.player || {};
        const snapshotProject = function (s) { const me = s.chars[s.player.charId]; return [s.start,s.player,s.realms,s.chars,s.owner,s.holder,s.authority,s.stories]; };
        const snapshot = window.restoreFacts(s,snapshotProject);
        window.__startRestoreSave = JSON.stringify(saved);
        window.__startRestoreSequence = [FB.getRngState() >>> 0, FB.getUidCounter()];
        FB.activateBookmark('867');
        window.__afterStartRestore = function () {
          return {name:me.name,born:me.born,tier:s.player.tier,rank:realm.rank,
            home:s.player.provinceId,site:FB.settlementsOf(s,court.county)[s.player.homeSettlement].site,
            form:FB.political.government(s,{kind:'realm',id:'player'}).formId,source:s.start.rulerRealmId,sourceGone:!s.realms[court.realm],
            mapped:FB.startRealmId(s,court.realm),samePerson:me.id===original.id,
            unique:Object.values(s.chars).filter(function (c) { return c.name===court.name && !c.dead; }).length,
            family:JSON.stringify([me.spouseId,me.childrenIds])===JSON.stringify([original.spouse,original.children]),
            justinNoSpouse:court.id!=='justin_568' || !me.spouseId,
            publicFunds:FB.treasuryAvailable(s,'player')===original.treasury,
            provincialProfile:(government.administrationProfileId || null)===original.administration &&
              (government.aristocracy && government.aristocracy.profileId || null)===original.aristocracy,
            profiles:[government.administrationProfileId || null,government.aristocracy && government.aristocracy.profileId || null],
            agenda:s.stories[court.agenda].subjectId===me.id,revision:s.start.revision,
            restored:snapshot === window.restoreFacts(FB.state,snapshotProject)};
        };
      },court)).toEqual({name:court.name,born:court.born,tier:7,rank:4,home:court.county,site:court.site,
        form:court.form,source:court.realm,sourceGone:true,mapped:'player',samePerson:true,unique:1,
        family:true,justinNoSpouse:true,publicFunds:true,provincialProfile:true,profiles:court.profiles,agenda:true,
        revision:'eastern_courts_v3',restored:true});
    });
  }

  test(court.id+' completes six retained reviews without creating historical outcomes',async function ({page},info) {
    await beginCourt(page,info,court,true);
    expect(await page.evaluate(function (court) {
      const s=FB.state, d=FBDATA.rulerAgendas_568_east[court.agenda], record=s.stories[court.agenda];
      const before=JSON.stringify([s.owner,s.holder,s.player.gold,s.realms,s.armies,s.chars,s.authority]);
      const applied=[],repeated=[];
      d.stages.forEach(function (stage) {
        s.date={year:stage.year,season:stage.season,day:1}; s.turn++;
        const choice=stage.choices[stage.choices.length-1].id, quote=FB.stories.quote(s,court.agenda,choice);
        applied.push(FB.stories.apply(s,court.agenda,choice,quote));
        repeated.push(FB.stories.apply(s,court.agenda,choice,quote));
      });
      const result={stages:d.stages.length,alternatives:d.stages.every(function (stage) {
        return stage.choices[stage.choices.length-1].operation==='agenda_priority'; }),
        applied:applied,repeated:repeated,status:record.status,decisions:record.decisions.length,
        unchanged:before===JSON.stringify([s.owner,s.holder,s.player.gold,s.realms,s.armies,s.chars,s.authority])};
      const saved=JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      result.restored=FB.state.stories[court.agenda].status==='agenda_complete' &&
        FB.state.stories[court.agenda].decisions.length===6;
      return result;
    },court)).toEqual({stages:6,alternatives:true,applied:Array(6).fill(true),
      repeated:Array(6).fill(false),status:'agenda_complete',decisions:6,unchanged:true,restored:true});
  });

  test(court.id+' interrupts its personal reviews after the incumbent dies',async function ({page},info) {
    await beginCourt(page,info,court,true);
    expect(await page.evaluate(function (court) {
      const s=FB.state, record=s.stories[court.agenda];
      s.chars[s.player.charId].dead=true;
      FB.stories.get(court.agenda).day(s,record);
      return {status:record.status,choices:FB.stories.choices(s,court.agenda).length};
    },court)).toEqual({status:'agenda_interrupted',choices:0});
  });

  test(court.id+' retains a pending review through a matching save',async function ({page},info) {
    await beginCourt(page,info,court,true);
    expect(await evaluateAcrossBookmark(page, function (court) {
      const s=FB.state, record=s.stories[court.agenda], before=JSON.stringify(record);
      const people=Object.keys(s.chars).length, funds=FB.treasuryAvailable(s,'player');
      const saved=JSON.parse(FB.save.serialize());
      window.__startRestoreSave = JSON.stringify(saved);
      window.__startRestoreSequence = [FB.getRngState() >>> 0, FB.getUidCounter()];
      FB.activateBookmark('867');
      window.__afterStartRestore = function () {
        return {record:before===JSON.stringify(FB.state.stories[court.agenda]),
          people:people===Object.keys(FB.state.chars).length,
          funds:funds===FB.treasuryAvailable(FB.state,'player'),
          choices:FB.stories.choices(FB.state,court.agenda).length>0};
      };
    },court)).toEqual({record:true,people:true,funds:true,choices:true});
  });

  test(court.id+' interrupts its personal reviews after loss of jurisdiction',async function ({page},info) {
    await beginCourt(page,info,court,true);
    expect(await page.evaluate(function (court) {
      const s=FB.state, record=s.stories[court.agenda];
      s.realms.player.alive=false;
      FB.stories.get(court.agenda).day(s,record);
      return {status:record.status,choices:FB.stories.choices(s,court.agenda).length};
    },court)).toEqual({status:'agenda_interrupted',choices:0});
  });
}

test('the Justin and Khosrow agendas and starts name their people and places without disclaimers',async function ({page},info) {
  await beginCourt(page,info,courts[0],true);
  expect(await page.evaluate(function (courts) {
    const banned = /grants? no |creates? no |Record (a |an )?(costless )?(priority|intention|preference)|Record attention|\bordinary\b|\bactual(ly)?\b|\bexisting\b|\boriginal\b|\bauthored\b|historical opportunity|political opportunity/i;
    const labelWords = /\b(ordinary|actual|actually|existing|current|original|authored|declared)\b/i;
    const lostApostrophe = /[A-Za-z]\?[A-Za-z]/;
    const faults = [];
    function check(owner,field,value,prose) {
      if (typeof value !== 'string' || !value) { faults.push(owner+' '+field+' is missing'); return; }
      if (lostApostrophe.test(value)) faults.push(owner+' '+field+' has a lost apostrophe');
      if (value.indexOf('—') >= 0) faults.push(owner+' '+field+' has an em dash');
      if (prose && banned.test(value)) faults.push(owner+' '+field+' uses banned wording');
    }
    courts.forEach(function (court) {
      const d = FBDATA.rulerAgendas_568_east[court.agenda];
      check(court.agenda,'title',d.title,false);
      check(court.agenda,'intro',d.intro,true);
      d.stages.forEach(function (stage) {
        check(stage.id,'name',stage.name,false);
        check(stage.id,'text',stage.text,true);
        stage.choices.forEach(function (c) {
          check(c.id,'label',c.label,false);
          if (c.label.split(/\s+/).length > 8) faults.push(c.id+' label is longer than eight words');
          if (labelWords.test(c.label)) faults.push(c.id+' label uses a process word');
          check(c.id,'detail',c.detail,true);
          if (/^Record\b|\b(no|not|without)\b/i.test(c.detail)) faults.push(c.id+' detail lists what it does not do');
          if (c.operation !== 'agenda_priority') faults.push(c.id+' operation changed');
        });
      });
      const sc = FBDATA.startScenarios.find(function (s) { return s.id === court.id; });
      check(sc.id,'name',sc.name,false);
      check(sc.id,'desc',sc.desc,true);
      check(sc.id,'intro',sc.intro,true);
      check(sc.id,'family desc',sc.familyPresets.standard.desc,true);
      if (sc.intro.split(/[.!?](?:\s+|$)/).filter(Boolean).length > 4) faults.push(sc.id+' intro is longer than four sentences');
      if (!/Open your court agenda in Deeds to begin\.$/.test(sc.intro)) faults.push(sc.id+' intro does not say where to begin');
    });
    const s = FB.state, id = 'justin_agenda_568', d = FBDATA.rulerAgendas_568_east[id];
    const first = d.stages[0].choices[0].id, quote = FB.stories.quote(s,id,first);
    const moved = FB.stories.apply(s,id,first,quote);
    const status = FB.stories.status(s,id);
    const justin = FBDATA.startScenarios.find(function (sc) { return sc.id === 'justin_568'; });
    return {faults:faults,
      titles:courts.map(function (court) { return FBDATA.rulerAgendas_568_east[court.agenda].title; }),
      moved:moved,stage:s.stories[id].step,italy:status.lines[0],
      sophia:justin.familyPresets.standard.desc.split('Sophia').length - 1,
      offered:FB.stories.choices(s,id).filter(function (c) { return c.id !== 'agenda_stop_program'; }).map(function (c) { return c.id; })};
  },courts)).toEqual({faults:[],
    titles:['Justin: the eastern court','Khosrow: the Sasanian court'],
    moved:true,stage:1,italy:'Narses still commands in Italy while voices at court press for his recall.',
    sophia:1,offered:['ji_review_italy','ji_keep_italy']});
});

test('a retained 568 campaign never acquires the eastern starts on restore',async function ({page},info) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  await page.evaluate(function () { FBDATA.bookmarks['568'].revision='frankish_courts_v2'; });
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('OLD568-568-farmer_568-metz-m-Review');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function (courts) {
    const save=JSON.parse(FB.save.serialize()), before=Object.keys(FB.state.chars).length;
    FBDATA.bookmarks['568'].revision='eastern_courts_v3';
    FB.save.restore(save);
    const b=FB.campaignBookmark(FB.state);
    return {revision:FB.state.start.revision,people:before===Object.keys(FB.state.chars).length,
      absent:courts.every(function (c) { return b.starts.indexOf(c.id)<0 && (!FB.state.stories || !FB.state.stories[c.agenda]); })};
  },courts)).toEqual({revision:'frankish_courts_v2',people:true,absent:true});
});
