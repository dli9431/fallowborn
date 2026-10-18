'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/expedition-command-harbor.json'),
  dune:require('../fixtures/authoring/expedition-command-dune.json')};

dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/eras.js',
  'js/main.js','js/starts.js','js/world.js','js/bookmark_setup.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js',
  'js/mods.js','js/model.js','js/station.js','js/governments.js','js/government_selection.js',
  'js/government_continuity.js','js/government_support.js','js/authority.js','js/federates.js',
  'js/population.js','js/market.js','js/treasury.js','js/armies.js','js/fortifications.js',
  'js/stories.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js']);

async function importExample(page,info,prefix,modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'command-start.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} :
    path.resolve(__dirname,'../fixtures/authoring/expedition-command-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];
  },prefix);
}

function codeFor(prefix) {
  const sc=examples[prefix].startScenarios.find(function (sc) {return sc.id===prefix+'_command_start';});
  return 'COMMANDSTART-'+prefix+'_world-'+sc.id+'-'+sc.fixedProvinceId+'-'+sc.sex+'-'+
    sc.characterName.replace(/-/g,'').replace(/ /g,'_')+'-standard';
}

async function beginCommand(page,prefix) {
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(codeFor(prefix));
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue(examples[prefix].startScenarios.find(function (sc) {
    return sc.id===prefix+'_command_start';
  }).characterName);
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);});
}

async function campaignFacts(page) {
  return page.evaluate(function () {
    const s=FB.state,M=FB.mobile,bm=FB.campaignBookmark(s),d=bm.realms.find(function (r) {return r.mobile;});
    const r=M.row(s,d.id),host=M.host(s,d.id),sc=FBDATA.startScenarios.find(function (sc) {
      return sc.id===s.start.scenarioId;
    });
    const actorId=FB.startCommandActorId(bm,d,sc.governmentForm),me=s.chars[s.player.charId];
    const expected=d.mobile.opening.muster.reduce(function (out,row) {
      out[row.unitId]=(out[row.unitId] || 0)+row.count;return out;
    },{});
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const profile=FB.startRulerProfile(bm,d,sc.governmentForm);
    const blocked=FB.prepareStartingCommandActor(s,sc)===null;
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    return {scenario:s.start.scenarioId,source:s.start.rulerRealmId,turn:s.turn,
      sameActor:FB.bookmarkActor(s,actorId)===me && M.leader(s,d.id)===me &&
        FB.realmRulerCharacterSnapshot(s,d.id)===me && FB.realmIdForRulerCharacter(s,me)===d.id,
      onePerson:Object.keys(s.chars).filter(function (cid) {return s.chars[cid].name===me.name;}).length===1,
      family:me.motherId===FB.bookmarkActor(s,bm.opening.actors[actorId].mother).id &&
        s.chars[me.motherId].childrenIds.filter(function (cid) {return cid===me.id;}).length===1,
      publicRealm:!!s.realms[d.id] && !s.realms.player && !s.realms[d.id].succession,
      noLand:s.player.provs.length===0 && FB.realmTerritory(s,d.id).length===0,
      privateTier:s.player.tier,privateGold:s.player.gold,publicGold:FB.treasuryAvailable(s,d.id),
      commanded:M.commandValid(s,d.id),generation:FB.realmRulerGeneration(s,d.id),
      profile:profile.name===me.name && profile.sex===me.sex && profile.culture===me.culture,
      total:M.total(s,d.id)===r.accounting.initial,
      oneHost:s.armies.filter(function (a) {return a.realm===d.id && a.mobileFollowing;}).length===1,
      composition:FB.unitClassIds().every(function (id) {return host.units[id]===(expected[id] || 0);}),
      food:Math.abs(r.food+host.mobileFood-d.mobile.food)<0.000001,
      originalGeneration:r.command.leaderGeneration===FB.realmRulerGeneration(s,d.id),
      valid:M.validate(s),blocked:blocked,pure:pure};
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' starts as its existing principal with one funded following and retained family',async function ({page},info) {
    await importExample(page,info,prefix);
    await beginCommand(page,prefix);
    const facts=await campaignFacts(page);
    expect(facts).toMatchObject({scenario:prefix+'_command_start',turn:0,sameActor:true,onePerson:true,family:true,
      publicRealm:true,noLand:true,privateTier:1,privateGold:prefix==='harbor' ? 7 : 11,
      commanded:true,profile:true,total:true,oneHost:true,composition:true,food:true,
      originalGeneration:true,valid:true,blocked:true,pure:true});
    expect(facts.generation).toBe(prefix==='harbor' ? 2 : 1);
    expect(facts.publicGold).toBeGreaterThanOrEqual(70);
    const preserved=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,bm=FB.campaignBookmark(s),d=bm.realms.find(function (r) {return r.mobile;});
      function facts(s) {
        const people=Object.keys(s.chars).sort().map(function (id) {
          const c=s.chars[id];return [id,c.name,c.born,c.motherId,c.fatherId,c.spouseId,c.childrenIds];
        });
        return JSON.stringify([people,s.player.gold,s.player.charId,s.bookmarkSetup,
          M.row(s,d.id),M.migration(s,d.id),M.host(s,d.id),s.realms[d.id].treasury]);
      }
      const before=facts(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      FB.mobileInitializeAuthored(s,bm.realms);
      FB.stories.start(s,{tracks:[]});
      const repeat=before===facts(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const saved=JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return {repeat:repeat,matching:before===facts(FB.state),valid:M.validate(FB.state),
        rng:(saved.rng>>>0)===(FB.getRngState()>>>0),uid:saved.uid===FB.getUidCounter()};
    });
    expect(preserved).toEqual({repeat:true,matching:true,valid:true,rng:true,uid:true});
  });

  test(prefix+' command start replays its exact people, resources and opening from its code',async function ({page},info) {
    await importExample(page,info,prefix);
    await beginCommand(page,prefix);
    async function snapshot() {
      return page.evaluate(function () {
        const s=FB.state;
        return JSON.stringify([s.seed,s.chars,s.player,s.owner,s.holder,s.bookmarkSetup,s.authority,s.armies,s.stories,
          FB.getRngState()>>>0,FB.getUidCounter()]);
      });
    }
    const first=await snapshot();
    await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
    await beginCommand(page,prefix);
    expect(await snapshot()).toBe(first);
  });

  test(prefix+' applies an explicit empty inventory before funding and adopting the command',async function ({page},info) {
    const input=JSON.parse(JSON.stringify(examples[prefix])),bm=input.bookmarks[prefix+'_world'];
    bm.openingInfrastructure={version:1,placements:[]};
    await importExample(page,info,prefix,input);
    await beginCommand(page,prefix);
    expect(await campaignFacts(page)).toMatchObject({sameActor:true,onePerson:true,family:true,publicRealm:true,
      privateGold:prefix==='harbor' ? 7 : 11,composition:true,food:true,valid:true,commanded:true});
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
      const before=JSON.stringify([s.buildings,s.openingInfrastructureState,M.row(s,d.id),M.host(s,d.id),s.realms[d.id].treasury]);
      FB.initializeOpeningInfrastructure(s);
      const repeated=before===JSON.stringify([s.buildings,s.openingInfrastructureState,M.row(s,d.id),M.host(s,d.id),s.realms[d.id].treasury]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=FB.state;
      return {repeated:repeated,retained:before===JSON.stringify([restored.buildings,restored.openingInfrastructureState,
        M.row(restored,d.id),M.host(restored,d.id),restored.realms[d.id].treasury]),
        explicit:restored.openingInfrastructureState.explicit,publicGold:FB.treasuryAvailable(restored,d.id)};
    });
    expect(result).toMatchObject({repeated:true,retained:true,explicit:true});
    expect(result.publicGold).toBeGreaterThanOrEqual(70);
  });
}

test('the bound leader supplies the offered identity rather than a mobile ruler presentation',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));
  input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).ruler.name='Former display';
  await importExample(page,info,'harbor',input);
  await beginCommand(page,'harbor');
  expect(await campaignFacts(page)).toMatchObject({sameActor:true,onePerson:true,profile:true,commanded:true});
});

test('detached validation rejects mismatched command starts without publishing or allocating identities',async function ({page},info) {
  await openGame(page,info);
  const results=await page.evaluate(function (source) {
    const changes=[function (sc) {sc.characterName='Another person';},
      function (sc) {sc.sex='m';},function (sc) {sc.fixedProvinceId='harbor_ridge';},
      function (sc,bm,d) {delete d.mobile.opening;},
      function (sc,bm,d) {bm.opening.actors.harbor_leader.ref={kind:'realm_ruler',realmId:d.id};},
      function (sc,bm,d) {d.mobile.opening.leaderMemberId='missing';},
      function (sc,bm,d) {d.mobile.opening.principals.find(function (b) {
        return b.memberId===d.mobile.opening.leaderMemberId;
      }).person.actorId='constructor';}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),bm=input.bookmarks.harbor_world;
      const sc=input.startScenarios.find(function (sc) {return sc.id==='harbor_command_start';});
      change(sc,bm,bm.realms.find(function (r) {return r.mobile;}));
      const bytes=JSON.stringify(input),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),
        rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && data===JSON.stringify(FBDATA) &&
        state===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(results).toEqual(Array(7).fill(true));
});
