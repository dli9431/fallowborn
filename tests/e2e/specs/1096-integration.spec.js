'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/bookmark_1096_campaigns.js',
  'data/bookmark_1096_mainz.js','data/bookmark_1096_western_expeditions.js','data/bookmark_1096_pilgrim.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/identities_1096.js','data/institutions_1096.js','data/expeditions_1096.js',
  'data/starts_pilgrim_1096.js','data/starts_mainz_1096.js',
  'data/starts_western_rulers_1096.js','data/starts_eastern_rulers_1096.js',
  'data/story_instances.js','data/story_world_1096.js','data/story_household_effects_1096.js',
  'data/story_pilgrim_1096.js','data/story_households_rhineland_1096.js',
  'data/story_western_rulers_1096.js','data/story_eastern_rulers_1096.js',
  'js/bookmark_composition.js','js/bookmark_sources.js','js/bookmark_setup.js',
  'js/starts.js','js/stories.js','js/story_household.js','js/story_ruler_agenda.js',
  'js/story_opening_goals.js','js/story_expedition_preparation.js','js/story_expedition_program.js',
  'js/story_expedition_participation.js','js/story_household_party.js',
  'js/main.js','js/world.js','js/model.js','js/save.js','js/save_v4.js','js/title_ids.js',
  'js/story_expedition_agreements.js','js/story_household_refuge.js',
  'js/treasury.js','js/actions.js','js/governments.js','js/government_lineage.js'
]);

const starts = [
  ['pilgrim_household_1096','pilgrim_household_track_1096','cologne'],
  ['mainz_jewish_household_1096','mainz_household_track_1096','mainz'],
  ['godfrey_1096','godfrey_agenda_1096','verdun'],
  ['raymond_1096','raymond_agenda_1096','toulouse'],
  ['bohemond_1096','bohemond_agenda_1096','taranto'],
  ['alexios_1096','alexios_agenda_1096','constantinople'],
  ['kilij_arslan_1096','rum_agenda_1096','nicaea']
];

async function start(page,info,row) {
  await openGame(page,info);
  const code=await page.evaluate(function (row) {
    const sc=FBDATA.startScenarios.find(function (s) {return s.id===row[0];});
    const county=FB.bookmark('1096').provinces.find(function (p) {return p.id===row[2];});
    const identity=sc.startCulture!==county.culture || sc.startReligion!==county.religion
      ? '-0-'+sc.startCulture+'.'+sc.startReligion : '';
    return 'INTEGRATION-1096-'+sc.id+'-'+row[2]+'-m-'+(sc.characterName || 'Review').replace(/ /g,'_')+
      '-'+Object.keys(sc.familyPresets)[0]+identity;
  },row);
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function () {FB.game.setPaused(true);return FB.state.start.scenarioId;})).toBe(row[0]);
}

async function restoreWithDiagnostics(page,saved) {
  try {await restoreBookmark(page,saved);} catch (error) {
    throw new Error(await page.evaluate(function (source) {
      const raw=JSON.parse(source).state,partial=JSON.parse(JSON.stringify(raw));
      // Match the platform validator's detached identity defaults, then compare
      // every attached validator with the complete canonical codec projection.
      Object.keys(partial.chars).forEach(function (id) {
        if (partial.chars[id].id===undefined) partial.chars[id].id=id;
      });
      Object.keys(partial.realms).forEach(function (id) {
        if (partial.realms[id].alive===undefined) partial.realms[id].alive=true;
      });
      function faults(state) {
        const out=[];
        FB.stories.list().forEach(function (story) {
          if (!state.stories[story.id] || !story.validate) return;
          const copy=JSON.parse(JSON.stringify(state));
          try {story.validate(copy.stories[story.id],copy);} catch (e) {out.push(story.id+': '+e.message);}
        });
        return out;
      }
      return FB.game.lastLoadStage+': '+(FB.game.lastLoadError && FB.game.lastLoadError.message)+
        '\n'+JSON.stringify({partial:faults(partial),expanded:faults(FB.save.expandedSnapshot(raw))});
    },saved));
  }
}

test('composed 1096 retains valid revisions and all required local story starts without validation mutations',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (rows) {
    const b=FB.bookmark('1096');
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const before=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const faults=[];
    FB.bookmarkRevisions('1096').forEach(function (old) {
      FB.validateBookmark(old).forEach(function (error) {faults.push(old.revision+': '+error);});
    });
    const available=rows.map(function (row) {
      const sc=FBDATA.startScenarios.find(function (s) {return s.id===row[0];});
      return !!sc && (!b.starts || b.starts.indexOf(sc.id)>=0) &&
        FB.startProvinceAllowed(sc,b,row[2]) && FB.startTracks(sc,row[2],b).indexOf(row[1])>=0;
    });
    return {revision:b.revision,faults:faults,available:available,
      unique:new Set(b.stories).size===b.stories.length,
      calls:b.stories.filter(function (id) {return FBDATA.storyInstances[id].type==='holy_war';}),
      pure:before===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },starts);
  expect(result).toEqual({revision:'pilgrim_followings_v1',faults:[],available:starts.map(function () {return true;}),
    unique:true,calls:['eastern_undertaking_1096'],pure:true});
});

for (const row of starts) {
  test(row[0]+' preserves its composed world, personal attachments and resources on restore',async function ({page},info) {
    await start(page,info,row);
    const saved=await page.evaluate(function (row) {
      const s=FB.state,b=FB.campaignBookmark(s),a=s.start.storyAttachments;
      if (s.start.revision!=='pilgrim_followings_v1') throw new Error('Start fell back to a retained world');
      if (s.player.provinceId!==row[2] || !s.stories[row[1]]) throw new Error('Missing local personal story');
      function ordered(ids) {return FB.stories.list().filter(function (v) {return ids.indexOf(v.id)>=0;}).map(function (v) {return v.id;});}
      if (JSON.stringify(a.world)!==JSON.stringify(ordered(b.stories))) throw new Error('World attachment order changed: '+JSON.stringify(a.world));
      const sc=FBDATA.startScenarios.find(function (v) {return v.id===row[0];});
      if (JSON.stringify(a.tracks)!==JSON.stringify(ordered(FB.startTracks(sc,row[2],b)))) throw new Error('Track closure changed');
      return FB.save.serialize();
    },row);
    await restoreWithDiagnostics(page,saved);
    const after=await page.evaluate(function () {return JSON.parse(FB.save.serialize()).state;});
    const before=JSON.parse(saved).state;
    for (const key of ['start','stories','chars','owner','holder','realms','player','armies']) {
      // Report every mismatch and still exercise rejection checks in this case.
      // Every equality remains required for the test to pass.
      expect.soft(after[key],key).toEqual(before[key]);
    }
    expect(await page.evaluate(function (source) {
      const base=JSON.parse(source),before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      if (FB.save.envelopeIssue(base)) throw new Error('Valid envelope rejected');
      FB.save.v4.validatePlatform(base.state);
      const rejected=['missingRecord','duplicateTrack','missingMarker','missingLedger'].map(function (kind) {
        const bad=JSON.parse(JSON.stringify(base)),a=bad.state.start.storyAttachments;
        if (kind==='missingRecord') delete bad.state.stories[a.tracks[0]];
        if (kind==='duplicateTrack') a.tracks.push(a.tracks[0]);
        if (kind==='missingMarker') delete bad.storyAttachmentSchema;
        if (kind==='missingLedger') delete bad.state.start.storyAttachments;
        const original=JSON.stringify(bad);
        let failed=!!FB.save.envelopeIssue(bad);
        if (!failed) try {FB.save.v4.validatePlatform(bad.state);} catch (error) {failed=true;}
        return failed && original===JSON.stringify(bad);
      });
      return {rejected:rejected,pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
    },saved)).toEqual({rejected:[true,true,true,true],pure:true});
  });
}

test('a retained western world restores across fresh activation without adding pilgrim attachments or provenance',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () {FBDATA.bookmarks['1096'].revision='western_expeditions_v1';});
  await beginBookmarkFromTitle(page,'1096','pilgrim_household_1096');
  const saved=await page.evaluate(function () {return FB.save.serialize();});
  await page.evaluate(async function () {
    FBDATA.bookmarks['1096'].revision='pilgrim_followings_v1';
    await new Promise(function (resolve,reject) {
      FB.activateBookmark('1096',null,function (error) {if (error) reject(error);else resolve();});
    });
  });
  await restoreWithDiagnostics(page,saved);
  expect(await page.evaluate(function (source) {
    const original=JSON.parse(source),saved=JSON.parse(FB.save.serialize());
    const same=JSON.stringify(original.state.stories)===JSON.stringify(saved.state.stories) &&
      JSON.stringify(original.state.chars)===JSON.stringify(saved.state.chars);
    delete saved.storyAttachmentSchema;delete saved.state.start.storyAttachments;
    FB.save.restore(saved);
    const after=JSON.parse(FB.save.serialize());
    return {same:same,revision:after.state.start.revision,legacy:after.storyAttachmentSchema===undefined &&
      after.state.start.storyAttachments===undefined,stories:JSON.stringify(after.state.stories)===JSON.stringify(original.state.stories),
      people:JSON.stringify(after.state.chars)===JSON.stringify(original.state.chars),
      absent:!after.state.stories.peter_preparation_1096 && !after.state.stories.walter_preparation_1096};
  },saved)).toEqual({same:true,revision:'western_expeditions_v1',legacy:true,stories:true,people:true,absent:true});
});
