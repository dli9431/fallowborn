'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const openings={harbor:require('../fixtures/authoring/mobile-opening-harbor.json'),
  dune:require('../fixtures/authoring/mobile-opening-dune.json')};
const commands={harbor:require('../fixtures/authoring/mobile-command-harbor.json'),
  dune:require('../fixtures/authoring/mobile-command-dune.json')};

dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/eras.js','data/technology.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/expedition_programs.js','js/mobile_columns.js','js/bookmark_setup.js','js/world.js',
  'js/governments.js','js/government_selection.js','js/government_continuity.js','js/government_support.js',
  'js/starts.js','js/model.js','js/station.js','js/mods.js','js/stories.js','js/authority.js',
  'js/federates.js','js/population.js','js/armies.js','js/technology.js','js/treasury.js',
  'js/main.js','js/save.js','js/save_v4.js']);

async function startImported(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'mobile-principals-'+prefix+'.json',
    mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];
  },prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

function adoptionExample(prefix) {
  const input=JSON.parse(JSON.stringify(commands[prefix])),bm=input.bookmarks[prefix+'_world'];
  const d=bm.realms.find(function (r) {return r.mobile;});
  // Import the declaration through Mods, then exercise adoption of the already
  // initialized person. This does not assert a fresh command-start boot path.
  const scenario={id:prefix+'_principal_review',hidden:true,alwaysUnlocked:true,
    bookmarkIds:[bm.id],eras:[bm.era],rulerRealmId:d.id,governmentForm:d.government,
    characterName:d.ruler.name,sex:d.ruler.sex,fixedProvinceId:d.mobile.origin,
    startCulture:d.culture,startReligion:d.religion,tier:1,profession:'farmer',
    gold:7,prestige:5,piety:0,onboarding:'ruler',name:'Existing principal',
    desc:'Keep the initialized person and the separately funded following.',
    intro:'Review the existing principal.',familyPresets:{standard:{name:'Existing household',diff:'unchanged'}}};
  input.startScenarios.push(scenario);bm.starts.push(scenario.id);
  return input;
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' bound principal survives adoption and matching restore without a second person or muster',async function ({page},info) {
    await startImported(page,info,prefix,adoptionExample(prefix));
    const result=await page.evaluate(function (prefix) {
      const s=FB.state,M=FB.mobile,bm=FB.campaignBookmark(s),d=bm.realms.find(function (r) {return r.mobile;});
      const r=M.row(s,d.id),leader=M.leader(s,d.id),personId=leader.id,generation=FB.realmRulerGeneration(s,d.id);
      const scenario=FBDATA.startScenarios.find(function (sc) {return sc.id===prefix+'_principal_review';});
      const before=JSON.stringify([r,M.host(s,d.id),M.migration(s,d.id),s.bookmarkSetup.actors]);
      const people=Object.keys(s.chars).sort(),treasury=FB.treasuryAvailable(s,d.id);
      const rng=FB.getRngState(),uid=FB.getUidCounter();
      s.player.charId=personId;s.player.tier=scenario.tier;
      const adopted=FB.adoptStartingRealm(s,scenario,{deferSetup:true});
      FB.validateStartingRealm(s);
      const canonical=FB.realmRulerCharacterSnapshot(s,d.id).id===personId &&
        FB.realmIdForRulerCharacter(s,personId)===d.id && M.leader(s,d.id)===s.chars[s.player.charId] &&
        r.openingBindings.some(function (b) {return b.characterId===personId &&
          FB.bookmarkActor(s,b.person.actorId).id===personId;});
      const adoptionPure=before===JSON.stringify([r,M.host(s,d.id),M.migration(s,d.id),s.bookmarkSetup.actors]) &&
        rng===FB.getRngState() && uid===FB.getUidCounter() && JSON.stringify(people)===JSON.stringify(Object.keys(s.chars).sort());
      M.initialize(s,bm.realms);FB.mobileInitializeAuthored(s,bm.realms);
      const repeatPure=before===JSON.stringify([r,M.host(s,d.id),M.migration(s,d.id),s.bookmarkSetup.actors]) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
      const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
      return {adopted:adopted,canonical:canonical,adoptionPure:adoptionPure,repeatPure:repeatPure,
        onePerson:JSON.stringify(people)===JSON.stringify(Object.keys(FB.state.chars).sort()) &&
          FB.state.player.charId===personId && M.leader(FB.state,d.id).id===personId,
        retained:before===JSON.stringify([M.row(FB.state,d.id),M.host(FB.state,d.id),M.migration(FB.state,d.id),FB.state.bookmarkSetup.actors]),
        generation:FB.realmRulerGeneration(FB.state,d.id)===generation,publicRealm:!!FB.state.realms[d.id] && !FB.state.realms.player,
        privateGold:FB.state.player.gold,publicGold:FB.treasuryAvailable(FB.state,d.id)===treasury,
        noLand:FB.state.player.provs.length===0 && FB.realmTerritory(FB.state,d.id).length===0,
        valid:M.validate(FB.state),rng:(saved.rng>>>0)===(FB.getRngState()>>>0),uid:saved.uid===FB.getUidCounter()};
    },prefix);
    expect(result).toEqual({adopted:true,canonical:true,adoptionPure:true,repeatPure:true,onePerson:true,
      retained:true,generation:true,publicRealm:true,privateGold:7,publicGold:true,noLand:true,valid:true,rng:true,uid:true});
  });

  test(prefix+' omission retains generated principals and the legacy infantry opening',async function ({page},info) {
    const input=JSON.parse(JSON.stringify(openings[prefix])),bm=input.bookmarks[prefix+'_world'];
    const d=bm.realms.find(function (r) {return r.mobile;});delete d.mobile.opening;
    d.mobile.fighters=prefix==='harbor' ? 40 : 100;
    await startImported(page,info,prefix,input);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,bm=FB.campaignBookmark(s),d=bm.realms.find(function (r) {return r.mobile;});
      const r=M.row(s,d.id),host=M.host(s,d.id),profile=M.profile(s,d.id),actors=Object.keys(s.bookmarkSetup.actors).map(function (id) {
        return s.bookmarkSetup.actors[id];
      });
      const generated=r.members.every(function (m) {
        const c=s.chars[m.principal.id];
        return actors.indexOf(c.id)<0 && c.sex==='m' && s.date.year-c.born===30;
      });
      const infantry=FB.unitRoleClass('levy_infantry'),initial=profile.members.reduce(function (n,m) {return n+m.population;},0);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.initialize(s,bm.realms);FB.mobileInitializeAuthored(s,bm.realms);
      const facts={schema:r.schema,noBindings:r.openingBindings===undefined,generated:generated,leader:r.leaderId===r.members[0].principal.id,
        infantry:FB.unitClassIds().every(function (id) {return host.units[id]===(id===infantry ? d.mobile.fighters : 0);}),
        conserved:M.total(s,d.id)===initial && r.accounting.initial===initial && r.accounting.arrivals===0,
        finiteFood:r.food+host.mobileFood===d.mobile.food,valid:M.validate(s),
        repeatPure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
      const record=JSON.stringify([r,host,s.bookmarkSetup.actors]);FB.save.restore(JSON.parse(FB.save.serialize()));
      facts.restored=record===JSON.stringify([M.row(FB.state,d.id),M.host(FB.state,d.id),FB.state.bookmarkSetup.actors]);
      return facts;
    });
    expect(result).toEqual({schema:1,noBindings:true,generated:true,leader:true,infantry:true,conserved:true,
      finiteFood:true,valid:true,repeatPure:true,restored:true});
  });
}

test('lawful replacement after death retains original binding provenance and restores the depleted host once',async function ({page},info) {
  await startImported(page,info,'dune',commands.dune);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),original=M.leader(s,rid);
    const bindings=JSON.stringify(r.openingBindings),people=Object.keys(s.chars).sort(),initial=M.total(s,rid);
    const deputy=FB.bookmarkActor(s,'dune_deputy'),issuer=FB.bookmarkActor(s,'dune_authorizer');
    const generation=FB.realmRulerGeneration(s,rid);
    FB.applyHostLosses(M.host(s,rid),20,s);
    original.dead=true;FB.royalCharDied(s,original,rid);
    const vacant=!M.leader(s,rid) && r.command.status==='vacant' && r.selection===null;
    const appointed=M.commit(s,M.reviewCommand(s,{realmId:rid,commandId:r.command.id,action:'appoint',candidateId:deputy.id,
      actor:{kind:'character',id:issuer.id}}));
    const record=JSON.stringify([r,M.host(s,rid),s.bookmarkSetup.actors]),saved=JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const current=FB.state,row=M.row(current,rid),before=JSON.stringify(current),rng=FB.getRngState(),uid=FB.getUidCounter();
    M.initialize(current,FB.campaignBookmark(current).realms);
    return {vacant:vacant,appointed:appointed,leader:M.leader(current,rid).id===deputy.id,
      original:current.chars[original.id].dead && FB.bookmarkActor(current,'dune_incumbent').id===original.id,
      provenance:bindings===JSON.stringify(row.openingBindings),generation:FB.realmRulerGeneration(current,rid)===generation+1,
      noNewPeople:JSON.stringify(people)===JSON.stringify(Object.keys(current.chars).sort()),
      casualties:M.total(current,rid)===initial-20 && row.accounting.dead===20,
      restored:record===JSON.stringify([row,M.host(current,rid),current.bookmarkSetup.actors]),
      repeatPure:before===JSON.stringify(current) && rng===FB.getRngState() && uid===FB.getUidCounter(),valid:M.validate(current)};
  });
  expect(result).toEqual({vacant:true,appointed:true,leader:true,original:true,provenance:true,generation:true,
    noNewPeople:true,casualties:true,restored:true,repeatPure:true,valid:true});
});
