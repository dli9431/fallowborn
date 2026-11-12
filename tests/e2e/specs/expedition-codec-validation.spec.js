'use strict';
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {beginBookmarkFromTitle,restoreBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/adopted-public-treasury-harbor.json'),
  dune:require('../fixtures/authoring/adopted-public-treasury-dune.json')};

dependsOnRuntime(__filename,['index.html','js/save.js','js/save_v4.js','js/world.js','js/model.js',
  'js/story_expedition_preparation.js','js/story_expedition_agreements.js','js/stories.js',
  'js/bookmark_setup.js','js/starts.js','js/station.js','data/eras.js','js/home_authority.js','js/treasury.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/market.js','js/governments.js',
  'js/government_lineage.js','js/authority.js','js/population.js','js/expedition_programs.js']);

async function start(page,info,prefix) {
  const mod=JSON.parse(JSON.stringify(examples[prefix])),b=mod.bookmarks[prefix+'_world'];
  // Match the existing rank-two territorial court to the current ducal band.
  mod.startScenarios.find(function (s) {return s.id===prefix+'_home_start';}).tier=5;
  if (prefix==='dune') b.provinces.find(function (p) {return p.id==='dune_pass';}).dev=10;
  const id=prefix+'_codec_terms',prep=mod.storyInstances[prefix+'_preparation'];
  const declaration=b.revisions.local_policy.realms.find(function (r) {return r.id===prep.realmId;});
  mod.storyInstances[id]={id:id,type:'expedition_undertaking',name:'Independent records review',
    desc:'A fictional review retains its original people without granting passage or money.',
    requires:[prep.id],registrationAfter:prep.id,
    actor:{kind:'realm_ruler',realmId:prep.realmId},
    source:{kind:'realm_ruler',realmId:prefix==='harbor' ? 'harbor_commune' : 'dune_oasis'},
    kind:'limited_assurance',mode:'records_only',firstTurn:0,endTurn:prep.termDays+20,countyIds:[],
    waitForFormation:{preparationId:prep.id,commandId:declaration.mobile.command.id}};
  b.revisions.local_policy.stories.push(id);
  await openGame(page,info);
  expect(await page.evaluate(function (mod) {return FB.mods.validate(mod);},mod)).toEqual([]);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:prefix+'-codec.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,prefix+'_world',prefix+'_household');
  await page.evaluate(function (prefix) {
    window.codecCase={preparation:prefix+'_preparation',terms:prefix+'_codec_terms',
      partial:function (state,mode) {
        const s=JSON.parse(JSON.stringify(state));
        if (mode==='ids' || mode==='both') Object.keys(s.chars).forEach(function (id) {
          if (!Object.prototype.hasOwnProperty.call(s.chars[id],'id')) s.chars[id].id=id;
        });
        if (mode==='alive' || mode==='both') Object.keys(s.realms).forEach(function (id) {
          if (!Object.prototype.hasOwnProperty.call(s.realms[id],'alive')) s.realms[id].alive=true;
        });
        return s;
      },
      provider:function (s) {
        const t=s.stories[this.preparation],r=s.realms[t.provider.realmId];
        return {record:t,realm:r,member:r.succession.members[r.succession.rulerMemberId]};
      }
    };
  },prefix);
}

async function checkpoint(page) {
  expect(await page.evaluate(function () {
    const S=FB.save,snapshot=S._validationSnapshot,expand=S.expandedSnapshot;
    let requests=0,builds=0,reading=false;
    S._validationSnapshot=function (s) {
      requests++;reading=true;
      try {return snapshot(s);} finally {reading=false;}
    };
    S.expandedSnapshot=function (s) {if (reading) builds++;return expand(s);};
    try {S.serialize();return {requests:requests,builds:builds};}
    finally {S._validationSnapshot=snapshot;S.expandedSnapshot=expand;}
  })).toEqual({requests:3,builds:1});
  const result=await page.evaluate(function () {
    const C=codecCase,source=FB.save.serialize(),wire=JSON.parse(source),p=C.provider(wire.state);
    if (Object.prototype.hasOwnProperty.call(p.member,'charId') ||
        !wire.state.chars[p.record.provider.characterId]) throw new Error('Expected an actual compact royal link');
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const views=['raw','ids','alive','both','expanded'].map(function (mode) {
      const s=mode==='expanded' ? FB.save.expandedSnapshot(wire.state) : C.partial(wire.state,mode);
      const bytes=JSON.stringify(s),errors=[];
      [C.preparation,C.terms].forEach(function (id) {
        try {FB.stories.get(id).validate(s.stories[id],s);} catch(error) {errors.push(id+': '+error.message);}
      });
      try {FB.save.v4.validatePlatform(s);} catch(error) {errors.push('platform: '+error.message);}
      return {mode:mode,errors:errors,pure:bytes===JSON.stringify(s)};
    });
    return {source:source,views:views,pure:before===JSON.stringify([FB.state,FBDATA]) &&
      rng===FB.getRngState() && uid===FB.getUidCounter() && source===JSON.stringify(wire)};
  });
  expect(result.views).toEqual(['raw','ids','alive','both','expanded'].map(function (mode) {
    return {mode:mode,errors:[],pure:true};
  }));
  expect(result.pure).toBe(true);
  const original=JSON.parse(result.source);
  for (let round=0;round<2;round++) {
    await restoreBookmark(page,result.source);
    const after=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
    for (const key of ['stories','chars','realms','authority','player','armies','owner','holder','start','population','market'])
      expect(after.state[key],key).toEqual(original.state[key]);
    expect(after.rng >>> 0).toBe(original.rng >>> 0);
    expect(after.uid).toBe(original.uid);
    expect(after.mods).toBe(original.mods);
  }
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' pending and formed preparations validate compact, partial and expanded identities without replay',async function ({page},info) {
    await start(page,info,prefix);
    await checkpoint(page);
    expect(await page.evaluate(function () {
      const s=FB.state,C=codecCase,P=FB.expeditionPreparation,t=s.stories[C.preparation];
      const authorized=P.commit(s,P.review(s,C.preparation,'authorize',t.provider.characterId));
      const funded=P.commit(s,P.review(s,C.preparation,'grant',t.provider.characterId));
      const d=FB.stories.get(C.preparation).declaration;
      const realm=FB.campaignBookmark(s).realms.find(function (r) {return r.id===d.realmId;});
      const leader=t.bindings.find(function (b) {return b.memberId===realm.mobile.opening.leaderMemberId;}).characterId;
      const formed=P.commit(s,P.review(s,C.preparation,'form',leader));
      FB.stories.get(C.terms).day(s,s.stories[C.terms]);
      return {authorized:authorized,funded:funded,formed:formed};
    })).toEqual({authorized:true,funded:true,formed:true});
    await checkpoint(page);
  });

  test(prefix+' partial core defaults cannot hide forged current people, royal links or optional story fields',async function ({page},info) {
    await start(page,info,prefix);
    expect(await page.evaluate(function () {
      const C=codecCase,source=JSON.parse(FB.save.serialize());
      const cases=['provider','party','nullLink','wrongLink','wrongCharacter','wrongLineage',
        'missingPerson','deadRealm','extraPreparation','extraTerms'];
      return cases.map(function (kind) {
        const s=C.partial(source.state,'both'),p=C.provider(s),original=p.record.provider.characterId;
        if (kind==='provider') p.record.provider.characterId=s.player.charId;
        if (kind==='party') s.stories[C.terms].partyIds[1]=s.player.charId;
        if (kind==='nullLink') p.member.charId=null;
        if (kind==='wrongLink') p.member.charId=s.player.charId;
        if (kind==='wrongCharacter') s.chars[original].id=s.player.charId;
        if (kind==='wrongLineage') s.chars[original].royalLine.realmId='absent';
        if (kind==='missingPerson') delete s.chars[original];
        if (kind==='deadRealm') p.realm.alive=false;
        if (kind==='extraPreparation') p.record.extra=true;
        if (kind==='extraTerms') s.stories[C.terms].extra=true;
        const before=JSON.stringify([s,FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
        const target=kind==='party' || kind==='extraTerms' ? C.terms : C.preparation;
        let direct=false,platform=false;
        try {FB.stories.get(target).validate(s.stories[target],s);} catch(error) {direct=true;}
        try {FB.save.v4.migrate(Object.assign({},source,{state:s}));} catch(error) {platform=true;}
        const expanded=FB.save.expandedSnapshot(s);
        const explicit=kind!=='nullLink' && kind!=='wrongLink' ||
          expanded.realms[p.record.provider.realmId].succession.members[p.realm.succession.rulerMemberId].charId===p.member.charId;
        const dead=kind!=='deadRealm' || expanded.realms[p.record.provider.realmId].alive===false;
        return direct && platform && explicit && dead && before===JSON.stringify([s,FB.state,FBDATA]) &&
          rng===FB.getRngState() && uid===FB.getUidCounter();
      });
    })).toEqual(Array(10).fill(true));
  });
}
