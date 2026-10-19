'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_1241.js','data/story_koten_1241.js','data/story_households_1241.js',
  'data/bookmark_1241_core_starts.js','data/bookmark_1241_operations.js','data/bookmark_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js','data/bookmark_1241_scaffold_c.js',
  'data/bookmark_1241_scaffold_d.js','data/story_ruler_agendas_1241.js','data/bookmark_1241_frederick.js',
  'data/bookmark_1241_alexander.js','data/starts_alexander_1241.js','data/starts_frederick_1241.js',
  'data/identities_1241.js','data/mobile_confederations.js','data/settlements_real.js','data/settlements.js',
  'data/travel.js','data/events_travel.js','data/economy.js','data/actions.js','data/eras.js',
  'js/main.js','js/starts.js','js/bookmark_setup.js','js/world.js','js/model.js','js/station.js',
  'js/stories.js','js/story_household.js','js/story_ruler_agenda.js','js/story_opening_goals.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_guard.js','js/mobile_camps.js',
  'js/mobile_columns.js','js/expedition_programs.js','js/federates.js','js/governments.js',
  'js/government_selection.js','js/authority.js','js/population.js','js/treasury.js','js/armies.js',
  'js/wars.js','js/market.js','js/travel.js','js/economy.js','js/actions.js','js/justice.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js'
]);

const following='koten_following_1241',track='koten_safety_1241';
const earlier=['baseline','royal_households_v2','frederick_v2','alexander_v2','operations_v2'];

async function setup(page,info) {
  await openGame(page,info);
  await page.evaluate(function () {FB.startProgression.noteTier(3);});
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
}
async function begin(page,info,mode,revision) {
  await setup(page,info);
  if (revision) await page.evaluate(function (id) {FBDATA.bookmarks['1241'].revision=id;},revision);
  if (mode==='picker') {
    await page.locator('[data-bookmark="1241"]').click();
    await page.locator('[data-scenario="koten_1241"]').click();
    await expect(page.locator('#cg-fixed')).toContainText('Protective guard');
    await expect(page.locator('#cg-name-field')).toBeHidden();
  } else {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('CORE1241-1241-koten_1241-szekesfehervar-m-Koten-standard');
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#cg-name')).toHaveValue('Koten');
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  if (mode==='direct') await page.evaluate(function () {FB.game.start();});
  else {
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
  }
  await page.evaluate(function () {FB.game.setPaused(true);});
}

test('all four core starts resolve purely, earlier worlds retain their starts and rural slots',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (earlier) {
    const bytes=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const b=FB.bookmark('1241'),old=FB.bookmark('1241','operations_v2');
    const sc=FBDATA.startScenarios.find(function (sc) {return sc.id==='koten_1241';});
    const layout=FBDATA.settlementLayouts[b.settlementLayout].szekesfehervar;
    const original=FBDATA.settlementLayouts[old.settlementLayout].szekesfehervar;
    const profiles=['bela_1241','yaroslav_1241','hungarian_village_household_1241','koten_1241'].map(function (id) {
      const s=FBDATA.startScenarios.find(function (s) {return s.id===id;});
      return b.starts.indexOf(id)>=0 && FB.startProvinceAllowed(s,b,s.fixedProvinceId) &&
        FB.startStoryTracks(s,s.fixedProvinceId).length>0;
    });
    return {revision:b.revision,opening:b.openingRevision,profiles:profiles,
      valid:FB.bookmarkRevisions('1241').every(function (v) {return FB.validateBookmark(v).length===0;}),
      retained:earlier.every(function (id) {
        const v=FB.bookmark('1241',id);
        return v.starts.indexOf(sc.id)<0 &&
          !FBDATA.settlementLayouts[v.settlementLayout].szekesfehervar.some(function (s) {return s.site==='royal_heartland_farm_1241';});
      }),
      sameOpening:JSON.stringify(b.opening)===JSON.stringify(old.opening),
      sameRealms:JSON.stringify(b.realms)===JSON.stringify(old.realms),
      extraStarts:old.starts.every(function (id) {return b.starts.indexOf(id)>=0;}),
      layout:layout.length===8 && original.length===8 && layout[0].site==='geo_obuda_3054643' &&
        layout[1].site==='royal_heartland_farm_1241' &&
        JSON.stringify(layout.filter(function (s) {return s.site!=='royal_heartland_farm_1241';}))===
          JSON.stringify(original.filter(function (s) {return s.site!=='geo_kaposvar_3050616';})),
      noDanylo:!FBDATA.startScenarios.some(function (s) {return s.id==='danylo_1241';}),
      pure:bytes===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },earlier)).toEqual({revision:'core_starts_v2',opening:'operations_v2',profiles:[true,true,true,true],
    valid:true,retained:true,sameOpening:true,sameRealms:true,extraStarts:true,layout:true,noDanylo:true,pure:true});
});

for (const mode of ['picker','code','direct']) {
  test('Koten '+mode+' selects the original guarded person without adopting the public following',async function ({page},info) {
    await begin(page,info,mode);
    expect(await page.evaluate(function (ids) {
      const s=FB.state,M=FB.mobile,r=M.row(s,ids.following),me=s.chars[s.player.charId];
      const binding=s.start.originalPrincipal,site=FB.settlementsOf(s,'szekesfehervar')[s.player.homeSettlement];
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.initialize(s,FB.campaignBookmark(s).realms);
      return {revision:s.start.revision,name:me.name,born:me.born,age:FB.ageOf(me,s.date.year),
        identity:[me.culture,me.religion],private:[s.player.tier,s.player.profession,s.player.gold],
        one:Object.values(s.chars).filter(function (c) {return c.name==='Koten';}).length,
        same:me===FB.bookmarkActor(s,'koten_1241') && r.leaderId===me.id && r.guardedParty.characterIds[0]===me.id,
        family:[me.fatherId,me.motherId,me.spouseId].filter(Boolean).length+me.childrenIds.length,
        source:binding.realmId,site:site.site,physical:FB.provinceAtGrid(site.x,site.y).id,
        phase:s.stories[ids.track].phase,actor:s.stories[ids.track].actorId===me.id,
        cash:FB.treasuryAvailable(s,ids.following),total:M.total(s,ids.following),
        camps:r.camps.entries.length,host:M.host(s,ids.following).men,
        noLand:!s.realms.player && !s.player.provs.length && !s.player.landPlots.length,
        noOffice:!FB.realmRulerCharacterSnapshot(s,ids.following) && !M.commandValid(s,ids.following),
        guarded:r.guardedParty.status,valid:M.validate(s),
        repeat:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
    },{following:following,track:track})).toEqual({revision:'core_starts_v2',name:'Koten',born:1180,age:61,
      identity:['turkic','catholic'],private:[1,'soldier',20],one:1,same:true,family:0,source:following,
      site:'geo_obuda_3054643',physical:'szekesfehervar',phase:'circumstances',actor:true,cash:120,total:2400,
      camps:2,host:240,noLand:true,noOffice:true,guarded:'guarded',valid:true,repeat:true});
  });
}

test('the complete personal path records intentions once, rejects stale reviews and conserves every public owner',async function ({page},info) {
  await begin(page,info,'code');
  expect(await page.evaluate(function (ids) {
    let s=FB.state;
    function material(s) {return JSON.stringify([s.player.gold,s.chars,s.realms,s.authority,s.armies,s.population,s.market,s.owner,s.holder]);}
    const before=material(s),first=FB.stories.quote(s,ids.track,'review_position');
    const rng=FB.getRngState(),uid=FB.getUidCounter(),bytes=JSON.stringify(s);
    FB.stories.status(s,ids.track);FB.stories.quote(s,ids.track,'review_position');FB.stories.cards(s);
    const pure=bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    s.turn=1;s.date=FB.dateAtTurn(s,1);
    const stale=!FB.stories.apply(s,ids.track,'review_position',first);
    const picks=['review_position','keep_private_resources','consider_hosting','consider_following','keep_options_open'];
    const decisions=picks.map(function (id) {return FB.stories.apply(s,ids.track,id,FB.stories.quote(s,ids.track,id));});
    const record=JSON.stringify(s.stories[ids.track]),unmoved=material(s)===before;
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    return {pure:pure,stale:stale,decisions:decisions,unmoved:unmoved,phase:s.stories[ids.track].phase,
      retained:record===JSON.stringify(s.stories[ids.track]),repeat:FB.stories.apply(s,ids.track,picks[4],FB.stories.quote(s,ids.track,picks[4])),
      receipts:Object.keys(s.stories[ids.track].householdReceipts).length,
      guard:FB.mobile.row(s,ids.following).guardedParty.status,noCommand:!FB.mobile.commandValid(s,ids.following),
      noTravel:FB.travelEligible(s,'hungarian_visit_1241',{readOnly:true})!==true,
      noSelfRelease:!FB.mobile.reviewGuard(s,{realmId:ids.following,action:'release',actor:{kind:'character',id:s.player.charId}}).review.allowed};
  },{following:following,track:track})).toEqual({pure:true,stale:true,decisions:[true,true,true,true,true],unmoved:true,
    phase:'reviewed',retained:true,repeat:false,receipts:0,guard:'guarded',noCommand:true,noTravel:true,noSelfRelease:true});
});

test('the shared personal review cancels without changing guard, money or decisions',async function ({page},info) {
  await begin(page,info,'picker');
  const before=await page.evaluate(function (track) {
    return JSON.stringify([FB.state.player.gold,FB.state.stories[track],FB.mobile.row(FB.state,'koten_following_1241')]);
  },track);
  await page.locator('[data-tab="actions"]').click();await page.evaluate(function () {FB.ui.refresh();});
  const card=page.locator('[data-story-card="'+track+'"]');
  await card.click();await page.locator('[data-story-choice="review_position"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('[data-story-choice="postpone"]')).toBeVisible();
  await page.keyboard.press('Escape');await expect(card).toBeFocused();
  expect(await page.evaluate(function (track) {
    return JSON.stringify([FB.state.player.gold,FB.state.stories[track],FB.mobile.row(FB.state,'koten_following_1241')]);
  },track)).toBe(before);
});

test('matching guarded and released saves retain depleted resources and reject erased or forged personal bindings',async function ({page},info) {
  await begin(page,info,'direct');
  expect(await page.evaluate(function (ids) {
    let s=FB.state;const M=FB.mobile,r=M.row(s,ids.following),original=s.player.charId;
    s.player.gold=2;r.camps.entries[0].food-=7;s.realms[ids.following].treasury.gold-=3;
    FB.stories.apply(s,ids.track,'postpone',FB.stories.quote(s,ids.track,'postpone'));
    function material(s) {return JSON.stringify([s.start,s.player,s.chars,s.stories,s.realms,
      Object.assign({},s.authority,{schema:undefined}),s.armies,s.bookmarkSetup]);}
    const before=material(s),save=JSON.parse(FB.save.serialize());FB.save.restore(save);s=FB.state;
    const guarded=before===material(s),stable=s,rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=[function (s) {delete s.start.originalPrincipal;},function (s) {s.start.originalPrincipal.actorId='other';},
      function (s) {s.start.originalPrincipal.location.siteId='royal_heartland_farm_1241';},
      function (s) {delete s.stories[ids.track];},function (s) {s.start.revision='operations_v2';}].map(function (change) {
        const invalid=JSON.parse(JSON.stringify(save));change(invalid.state);
        try {FB.save.restore(invalid);return false;} catch (e) {return FB.state===stable && rng===FB.getRngState() && uid===FB.getUidCounter();}
      });
    const g=M.row(s,ids.following).guardedParty;
    const request={realmId:ids.following,action:'release',actor:{kind:'character',id:g.authority.characterId}};
    const q=M.reviewGuard(s,request),host=s.chars[g.authority.characterId];host.captive=true;
    const stale=!M.commit(s,q);delete host.captive;
    const released=M.commit(s,M.reviewGuard(s,request)),repeat=M.commit(s,M.reviewGuard(s,request));
    const after=material(s);FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    return {guarded:guarded,rejected:rejected,stale:stale,released:released,repeat:repeat,
      retained:after===material(s),same:s.player.charId===original && s.start.originalPrincipal.charId===original,
      phase:s.stories[ids.track].phase,cash:s.player.gold,publicCash:FB.treasuryAvailable(s,ids.following),
      effective:M.commandValid(s,ids.following),noMove:s.player.provinceId==='szekesfehervar' && s.player.homeSettlement===0};
  },{following:following,track:track})).toEqual({guarded:true,rejected:[true,true,true,true,true],stale:true,released:true,
    repeat:false,retained:true,same:true,phase:'deferred',cash:2,publicCash:117,effective:true,noMove:true});
});

test('death and actual player succession archive the original personal story without rebuilding a leader',async function ({page},info) {
  await begin(page,info,'code');
  expect(await page.evaluate(function (ids) {
    const s=FB.state,original=s.player.charId,me=s.chars[original];
    // A later relative is staged only for the succession boundary, not authored at opening.
    const child=FB.makeCharacter(s,{name:'Later household member',sex:'m',born:1220,culture:me.culture,religion:me.religion,station:1});
    child.fatherId=me.id;me.childrenIds.push(child.id);
    FB.game.die('A bounded succession fixture.');FB.game.succeedTo(child.id);
    FB.stories.get(ids.track).day(s,s.stories[ids.track]);
    const before=JSON.stringify(s.stories[ids.track]);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {dead:FB.state.chars[original].dead,player:FB.state.player.charId===child.id,
      original:FB.state.start.originalPrincipal.charId===original,actor:FB.state.stories[ids.track].actorId===original,
      phase:FB.state.stories[ids.track].phase,retained:before===JSON.stringify(FB.state.stories[ids.track]),
      noCommand:!FB.mobile.commandValid(FB.state,ids.following),
      one:Object.values(FB.state.chars).filter(function (c) {return c.name==='Koten';}).length};
  },{following:following,track:track})).toEqual({dead:true,player:true,original:true,actor:true,phase:'interrupted',retained:true,noCommand:true,one:1});
});

test('the fictional rural site uses actual farm property and contextual reviews change no public arrangement',async function ({page},info) {
  await setup(page,info);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('RURAL1241-1241-hungarian_village_household_1241-szekesfehervar-m-Review-standard-1');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function () {
    FB.game.setPaused(true);let s=FB.state;const id='hungarian_village_track_1241';
    const site=FB.settlementsOf(s,'szekesfehervar')[s.player.homeSettlement];
    const before=JSON.stringify([s.player.gold,FB.landPlots(s),s.realms,s.authority,s.population,s.armies,s.chars]);
    function pick(choice) {return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));}
    const choices=[pick('seek_work'),pick('defer_work')];
    FB.stories.get(id).day(s,s.stories[id]);
    const actualWar=s.stories[id].phase==='war_review';choices.push(pick('consider_hosted_people'));
    const noIncident=!Object.keys(s.stories[id].householdReceipts).length;
    choices.push(pick('keep_local_life'));
    const unchanged=before===JSON.stringify([s.player.gold,FB.landPlots(s),s.realms,s.authority,s.population,s.armies,s.chars]);
    const story=JSON.stringify(s.stories);FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    return {site:site.site,physical:FB.provinceAtGrid(site.x,site.y).id,slot:s.player.homeSettlement,
      plot:FB.landPlots(s).map(function (p) {return [p.provinceId,p.settlement];}),
      family:FB.householdMembers(s).length>1,choices:choices,actualWar:actualWar,noIncident:noIncident,
      unchanged:unchanged,phase:s.stories[id].phase,retained:story===JSON.stringify(s.stories),
      noOffice:!s.start.originalPrincipal && !s.realms.player};
  })).toEqual({site:'royal_heartland_farm_1241',physical:'szekesfehervar',slot:1,plot:[['szekesfehervar',1]],
    family:true,choices:[true,true,true,true],actualWar:true,noIncident:true,unchanged:true,phase:'stayed',retained:true,noOffice:true});
});

for (const revision of earlier) {
  test(revision+' excludes the guarded personal start and rejects its code',async function ({page},info) {
    await openGame(page,info);
    await page.evaluate(function (revision) {FBDATA.bookmarks['1241'].revision=revision;},revision);
    const full=page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('[data-bookmark="1241"]').click();
    await expect(page.locator('[data-scenario="koten_1241"]')).toHaveCount(0);
    await page.locator('#btn-ng-back').click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('OLDCORE-1241-koten_1241-szekesfehervar-m-Koten-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
  });
}
