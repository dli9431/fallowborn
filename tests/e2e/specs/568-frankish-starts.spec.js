'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {useReleasedStartRules} = require('../support/game/released-starts');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts.js','data/starts_568.js','data/starts_568_ravenna.js',
  'data/starts_rulers_568.js','data/story_ruler_agendas_568.js','data/starts_rulers_568_east.js',
  'data/story_ruler_agendas_568_east.js','data/story_instances.js',
  'data/bookmark_568.js','data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js','data/bookmark_568_identities.js',
  'data/eras.js','data/political_institutions.js','data/cultures.js','data/government_rollout.js',
  'js/main.js','js/starts.js','js/world.js','js/model.js','js/stories.js','js/story_ruler_agenda.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js'
]);

const rulers = [
  {id:'sigebert_568',name:'Sigebert I',title:'Sigebert I at Metz',realm:'austrasia_568',
    county:'metz',site:'metz_476',agenda:'sigebert_agenda_568',born:535},
  {id:'chilperic_568',name:'Chilperic I',title:'Chilperic I at Soissons',realm:'neustria_568',
    county:'laon',site:'soissons_476',agenda:'chilperic_agenda_568',born:539},
  {id:'guntram_568',name:'Guntram',title:'Guntram at Orleans',realm:'burgundy_568',
    county:'orleans',site:'orleans_476',agenda:'guntram_agenda_568',born:532}
];

async function beginRuler(page,info,row,code) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('FRANK568-568-'+row.id+'-'+row.county+'-m-'+row.name.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="568"]').click();
    await page.getByRole('button',{name:row.title,exact:true}).click();
  }
  await expect(page.locator('#cg-name')).toHaveValue(row.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('fresh and retained 568 revisions have distinct courts and start eligibility',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (rows) {
    const old = FB.bookmark('568','migration_v1'), fresh = FB.bookmark('568');
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const oldCourt = old.realms.find(function (r) { return r.id === 'austrasia_568'; }).royalCourt;
    const newCourt = fresh.realms.find(function (r) { return r.id === 'austrasia_568'; }).royalCourt;
    const spouse = newCourt.members[0];
    return {revision:fresh.revision,opening:fresh.openingRevision,oldEmpty:oldCourt.members.length === 0 && oldCourt.spouseId === null,
      newSpouse:newCourt.spouseId === 'brunhild' && newCourt.members.length === 1 && spouse.id === 'brunhild' &&
        spouse.spouseId === 'ruler' && spouse.born === 545 && spouse.culture === 'gothic' && spouse.religion === 'nicene' && spouse.homeProvinceId === 'metz',
      siblingCourts:['neustria_568','burgundy_568'].every(function (id) {
        return fresh.realms.find(function (r) { return r.id === id; }).royalCourt.members.length === 0;
      }),
      starts:rows.map(function (row) { return [old.starts.indexOf(row.id) < 0,fresh.starts.indexOf(row.id) >= 0,
        FB.startProvinceAllowed(FBDATA.startScenarios.find(function (s) { return s.id === row.id; }),fresh,row.county),
        FBDATA.settlementLayouts[fresh.settlementLayout][row.county][0].site]; }),
      retainedLayout:old.settlementLayout === fresh.settlementLayout,
      faults:FB.bookmarkRevisions('568').map(function (b) { return FB.validateBookmark(b); }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },rulers)).toEqual({revision:'eastern_courts_v3',opening:'migration_v1',oldEmpty:true,newSpouse:true,
    siblingCourts:true,starts:rulers.map(function (row) { return [true,true,true,row.site]; }),
    retainedLayout:true,faults:[[],[],[],[]],pure:true});
});

for (const row of rulers) {
  for (const code of [false,true]) {
    test(row.id+' adopts its original ruler through '+(code?'a start code':'the picker'),async function ({page},info) {
      await beginRuler(page,info,row,code);
      expect(await page.evaluate(function (row) {
        const s = FB.state, me = s.chars[s.player.charId];
        const site = FB.settlementsOf(s,row.county)[s.player.homeSettlement];
        const saved = JSON.parse(FB.save.serialize());
        const snapshot = JSON.stringify([s.start,s.player,s.chars,s.owner,s.holder,s.stories]);
        FB.activateBookmark('867'); FB.save.restore(saved);
        const restored = snapshot === JSON.stringify([FB.state.start,FB.state.player,FB.state.chars,FB.state.owner,FB.state.holder,FB.state.stories]);
        return {name:me.name,born:me.born,tier:s.player.tier,rank:s.realms.player.rank,
          home:s.player.provinceId,site:site.site,form:s.realms.player.government,
          sourceGone:!s.realms[row.realm],single:Object.values(s.chars).filter(function (c) { return c.name === row.name && !c.dead; }).length,
          agenda:s.stories[row.agenda].subjectId === me.id,revision:s.start.revision,
          spouse:row.id === 'sigebert_568' ? Object.values(s.chars).filter(function (c) { return c.name === 'Brunhild' && !c.dead && c.spouseId === me.id && me.spouseId === c.id; }).length : 0,
          restored:restored};
      },row)).toEqual({name:row.name,born:row.born,tier:6,rank:3,home:row.county,site:row.site,
        form:'regnum',sourceGone:true,single:1,agenda:true,revision:'eastern_courts_v3',
        spouse:row.id === 'sigebert_568'?1:0,restored:true});
    });
  }

  test(row.id+' completes five costless reviews and saves the decisions',async function ({page},info) {
    await beginRuler(page,info,row,true);
    expect(await page.evaluate(function (row) {
      const s = FB.state, d = FBDATA.rulerAgendas_568[row.agenda], t = s.stories[row.agenda];
      const before = JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.chars]);
      const progress = [], repeats = [];
      d.stages.forEach(function (stage) {
        s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
        const choice = stage.choices[1].id, quote = FB.stories.quote(s,row.agenda,choice);
        progress.push(FB.stories.apply(s,row.agenda,choice,quote));
        repeats.push(FB.stories.apply(s,row.agenda,choice,quote));
      });
      const result = {stages:d.stages.length,progress:progress,repeats:repeats,
        status:t.status,decisions:t.decisions.length,
        costless:before === JSON.stringify([s.owner,s.holder,s.player.gold,s.armies,s.chars])};
      const save = JSON.parse(FB.save.serialize()); FB.save.restore(save);
      result.restored = FB.state.stories[row.agenda].status === 'agenda_complete';
      return result;
    },row)).toEqual({stages:5,progress:Array(5).fill(true),repeats:Array(5).fill(false),
      status:'agenda_complete',decisions:5,costless:true,restored:true});
  });

  test(row.id+' ends an unfinished review when its original ruler dies',async function ({page},info) {
    await beginRuler(page,info,row,true);
    expect(await page.evaluate(function (row) {
      const s = FB.state, t = s.stories[row.agenda];
      s.chars[s.player.charId].dead = true;
      FB.stories.get(row.agenda).day(s,t);
      return {status:t.status,choices:FB.stories.choices(s,row.agenda).length};
    },row)).toEqual({status:'agenda_interrupted',choices:0});
  });
}

test('a migration_v1 save retains its empty Frankish courts after the fresh revision is selected',async function ({page},info) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  await page.evaluate(function () { FBDATA.bookmarks['568'].revision = 'migration_v1'; });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('OLD568-568-farmer_568-metz-m-Review');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function () {
    const s = FB.state, before = Object.values(s.chars).filter(function (c) { return c.name === 'Brunhild'; }).length;
    const save = JSON.parse(FB.save.serialize());
    FBDATA.bookmarks['568'].revision = 'frankish_courts_v2';
    FB.save.restore(save);
    return {revision:FB.state.start.revision,before:before,
      after:Object.values(FB.state.chars).filter(function (c) { return c.name === 'Brunhild'; }).length,
      oldStarts:FB.campaignBookmark(FB.state).starts.indexOf('sigebert_568') < 0};
  })).toEqual({revision:'migration_v1',before:0,after:0,oldStarts:true});
});
