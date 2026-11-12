'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {beginBookmark,beginBookmarkFromTitle,restoreBookmark}=require('../support/game/bookmark-acceptance');
const {loadParitySave}=require('../support/game/parity');
const {corpusEntries,readCorpusExport}=require('../support/parity-fixtures');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/adopted-public-treasury-harbor.json'),
  dune:require('../fixtures/authoring/adopted-public-treasury-dune.json')};

dependsOnRuntime(__filename,['index.html','js/save.js','js/save_v4.js','js/title_ids.js',
  'js/story_expedition_preparation.js','js/story_expedition_agreements.js','js/stories.js',
  'js/world.js','js/model.js','js/mods.js','js/starts.js','js/station.js','data/eras.js','js/bookmark_setup.js','js/home_authority.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/governments.js','js/authority.js',
  'js/treasury.js','js/building_profiles.js','js/expedition_programs.js',
  'data/story_western_rulers_1096.js','data/story_pilgrim_1096.js']);

async function probes(page) {
  for (const file of ['reference.js','probe.js'])
    await page.addScriptTag({path:path.join(__dirname,'../fixtures/snapshot-copying',file)});
}

async function start(page,info,prefix) {
  const mod=JSON.parse(JSON.stringify(examples[prefix])),b=mod.bookmarks[prefix+'_world'];
  // The fixture's rank-two territorial court uses the current ducal band.
  mod.startScenarios.find(function (s) {return s.id===prefix+'_home_start';}).tier=5;
  if (prefix==='dune') b.provinces.find(function (p) {return p.id==='dune_pass';}).dev=10;
  const prep=mod.storyInstances[prefix+'_preparation'],id=prefix+'_snapshot_terms';
  const realm=b.revisions.local_policy.realms.find(function (r) {return r.id===prep.realmId;});
  mod.storyInstances[id]={id:id,type:'expedition_undertaking',name:'Original party records',
    desc:'A fictional records review preserves the original parties.',requires:[prep.id],registrationAfter:prep.id,
    actor:{kind:'realm_ruler',realmId:prep.realmId},
    source:{kind:'realm_ruler',realmId:prefix==='harbor' ? 'harbor_commune' : 'dune_oasis'},
    kind:'limited_assurance',mode:'records_only',firstTurn:0,endTurn:prep.termDays+20,countyIds:[],
    waitForFormation:{preparationId:prep.id,commandId:realm.mobile.command.id}};
  b.revisions.local_policy.stories.push(id);
  mod.buildingProfiles=mod.buildingProfiles || {};
  mod.buildingProfiles[prefix+'_snapshot_store']={buildingId:prefix+'_public_store',name:'Stored building identity',
    desc:'A fictional physical asset used to check wire defaults.',replace:{},requiresTech:[]};
  await openGame(page,info);
  expect(await page.evaluate(function (m) {return FB.mods.validate(m);},mod)).toEqual([]);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:prefix+'-snapshot.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,prefix+'_world',prefix+'_household');
  await probes(page);
  await page.evaluate(function (prefix) {
    const prep=prefix+'_preparation',terms=prefix+'_snapshot_terms',s=FB.state,
      d=FB.stories.get(prep).declaration,realm=FB.campaignBookmark(s).realms.find(function (r) {return r.id===d.realmId;});
    const county=realm.mobile.origin;
    (s.buildings[county] || (s.buildings[county]=[])).push({id:prefix+'_public_store',s:0,
      buildingProfile:FB.buildingProfiles.stamp(prefix+'_public_store',prefix+'_snapshot_store')});
    window.snapshotCase={prep:prep,terms:terms,county:county,
      provider:function (s) {
        const t=s.stories[prep],r=s.realms[t.provider.realmId];
        return {t:t,realm:r,member:r.succession.members[r.succession.rulerMemberId],character:s.chars[t.provider.characterId]};
      },
      partial:function (s,mode) {
        s=snapshotProbe.copy(s);
        if (mode==='ids' || mode==='both') Object.keys(s.chars).forEach(function (id) {s.chars[id].id=id;});
        if (mode==='alive' || mode==='both') Object.keys(s.realms).forEach(function (id) {
          if (!Object.prototype.hasOwnProperty.call(s.realms[id],'alive')) s.realms[id].alive=true;
        });
        return mode==='expanded' ? snapshotReference(s) : s;
      },
      form:function (pending) {
        const P=FB.expeditionPreparation,s=FB.state,t=s.stories[prep],
          leader=t.bindings.find(function (b) {return b.memberId===realm.mobile.opening.leaderMemberId;}).characterId;
        if (!P.commit(s,P.review(s,prep,'authorize',t.provider.characterId)) ||
            !P.commit(s,P.review(s,prep,'grant',t.provider.characterId)) ||
            !P.commit(s,P.review(s,prep,'form',leader))) throw new Error('Formation fixture failed');
        FB.stories.get(terms).day(s,s.stories[terms]);
        if (pending) {
          // Stage the valid post-formation checkpoint before either records
          // decision; the ordinary NPC day hook may already have acknowledged.
          const r=s.stories[terms];
          r.status='pending';r.decisions=[null,null];r.decisionTurns=[null,null];
          r.revision=1;r.endedTurn=null;r.reason=null;
        }
      }
    };
  },prefix);
  return mod;
}

function expectReuse(row,requests) {
  expect(row.error).toBeNull();
  expect(row.stats.requests).toBe(requests);
  expect(row.stats.eligibleBuilds).toBe(1);
  expect(row.stats.views).toBe(1);
  expect(row.stats.stringifies).toBe(row.stats.builds);
  expect(row.stats.parses).toBe(row.stats.builds);
  expect(row.stats.raw).toBe(true);
  expect(row.stats.equivalent).toBe(true);
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' frozen semantic view preserves raw visits and exact output across compact aliases and formation',async function ({page},info) {
    await start(page,info,prefix);
    for (const formed of [false,true]) {
      if (formed) await page.evaluate(function () {snapshotCase.form();});
      const result=await page.evaluate(function () {
        const C=snapshotCase,Q=snapshotProbe,S=FB.save,source=JSON.parse(S.serialize()),
          before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),signature=FB.mods.sig();
        const rows=['raw','ids','alive','both','expanded'].map(function (mode) {
          const input=C.partial(source.state,mode),bytes=JSON.stringify(input);
          const candidate=Q.run(false,function () {return S.v4.migrate(Object.assign({},source,{state:input}));});
          const reference=Q.run(true,function () {return S.v4.migrate(Object.assign({},source,{state:input}));});
          const direct=Q.run(false,function () {return S.v4.validatePlatform(input);});
          const stories=Q.run(false,function () {
            [C.prep,C.terms].forEach(function (id) {FB.stories.get(id).validate(input.stories[id],input);});
          });
          return {mode:mode,candidate:candidate,reference:reference,direct:direct,stories:stories,
            pure:bytes===JSON.stringify(input),same:JSON.stringify(candidate.result)===JSON.stringify(reference.result)};
        });
        const candidate=Q.run(false,function () {return S.serialize();}),reference=Q.run(true,function () {return S.serialize();});
        return {rows:rows,candidate:candidate,reference:reference,
          pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter() && signature===FB.mods.sig()};
      });
      expect(result.pure).toBe(true);
      for (const row of result.rows) {
        expectReuse(row.candidate,3);
        expect(row.reference.error).toBeNull();
        expect(row.reference.stats.eligibleBuilds).toBe(3);
        expect(row.reference.stats.visits).toEqual(row.candidate.stats.visits);
        expect(row.direct.error).toBeNull();
        expect(row.direct.stats.eligibleBuilds).toBe(3);
        expect(row.direct.stats.views).toBe(3);
        expect(row.stories.error).toBeNull();
        expect(row.stories.stats.eligibleBuilds).toBe(2);
        expect(row.stories.stats.views).toBe(2);
        expect(row.pure && row.same).toBe(true);
      }
      expect(result.rows[0].candidate.stats.aliases).toEqual(['chars','realms','buildings']);
      expectReuse(result.candidate,3);
      expect(result.reference.stats.eligibleBuilds).toBe(3);
      expect(result.reference.stats.visits).toEqual(result.candidate.stats.visits);
      expect(result.candidate.result).toBe(result.reference.result);
      const original=JSON.parse(result.candidate.result);
      for (let round=0;round<2;round++) {
        await restoreBookmark(page,result.candidate.result);
        const after=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
        for (const key of ['stories','chars','realms','authority','player','armies','owner','holder','start','population','market','buildings'])
          expect(after.state[key],key).toEqual(original.state[key]);
        expect(after.rng >>> 0).toBe(original.rng >>> 0);
        expect(after.uid).toBe(original.uid);
        expect(after.mods).toBe(original.mods);
      }
    }
  });

  test(prefix+' malformed identities and optional fields preserve exact uncached errors and publication purity',async function ({page},info) {
    await start(page,info,prefix);
    const rows=await page.evaluate(function () {
      const C=snapshotCase,Q=snapshotProbe,S=FB.save,source=JSON.parse(S.serialize()),
        live=JSON.stringify([FB.state,FBDATA]),storage=JSON.stringify(Object.assign({},localStorage)),
        rng=FB.getRngState(),uid=FB.getUidCounter();
      const kinds=['nullId','wrongId','missingPerson','nullLink','wrongLink','wrongLineage','wrongMember','nullAlive','deadRealm',
        'extraPreparation','missingPreparationField','extraTerms','missingTermsField','provider','party','duplicateParty','generation','appointment',
        'duplicateBinding','missingAttachment','missingStories','nullBuilding','stringBuilding','fractionBuilding','negativeBuilding',
        'rng','uid','mods','revision','multipleErrors'];
      return kinds.map(function (kind) {
        const input=Q.copy(source),s=input.state,p=C.provider(s),t=s.stories[C.terms];
        if (kind==='nullId' || kind==='multipleErrors') p.character.id=null;
        if (kind==='wrongId') p.character.id=s.player.charId;
        if (kind==='missingPerson') delete s.chars[p.t.provider.characterId];
        if (kind==='nullLink') p.member.charId=null;
        if (kind==='wrongLink') p.member.charId=s.player.charId;
        if (kind==='wrongLineage') p.character.royalLine.realmId='absent';
        if (kind==='wrongMember') p.character.royalLine.memberId='absent';
        if (kind==='nullAlive') p.realm.alive=null;
        if (kind==='deadRealm') p.realm.alive=false;
        if (kind==='extraPreparation' || kind==='multipleErrors') p.t.extra=true;
        if (kind==='missingPreparationField') delete p.t.authorizedTurn;
        if (kind==='extraTerms') t.extra=true;
        if (kind==='missingTermsField') delete t.formation;
        if (kind==='provider') p.t.provider.characterId=s.player.charId;
        if (kind==='party') t.partyIds[1]=s.player.charId;
        if (kind==='duplicateParty') t.partyIds[1]=t.partyIds[0];
        if (kind==='generation') t.generations[1]++;
        if (kind==='appointment') p.t.provider.appointmentId='absent';
        if (kind==='duplicateBinding') p.t.bindings.push(Q.copy(p.t.bindings[0]));
        if (kind==='missingAttachment') delete s.stories[C.prep];
        if (kind==='missingStories') delete s.stories;
        const slots={nullBuilding:null,stringBuilding:'0',fractionBuilding:0.5,negativeBuilding:-1};
        if (Object.prototype.hasOwnProperty.call(slots,kind)) s.buildings[C.county][s.buildings[C.county].length-1].s=slots[kind];
        if (kind==='rng') input.rng=null;
        if (kind==='uid') input.uid=-1;
        if (kind==='mods') input.mods='changed';
        if (kind==='revision') s.start.revision='absent';
        const bytes=JSON.stringify(input),candidate=Q.run(false,function () {return S.v4.migrate(input);}),
          reference=Q.run(true,function () {return S.v4.migrate(input);});
        let restoreError=null;
        try {S.restore(input);} catch (error) {restoreError=error.message;}
        return {kind:kind,error:candidate.error,reference:reference.error,restoreError:restoreError,
          sameVisits:JSON.stringify(candidate.stats.visits)===JSON.stringify(reference.stats.visits),
          pure:bytes===JSON.stringify(input) && live===JSON.stringify([FB.state,FBDATA]) &&
            storage===JSON.stringify(Object.assign({},localStorage)) && rng===FB.getRngState() && uid===FB.getUidCounter()};
      });
    });
    for (const row of rows) {
      expect(row.error,row.kind).toBeTruthy();
      expect(row.error,row.kind).toBe(row.reference);
      expect(row.restoreError,row.kind).toBeTruthy();
      expect(row.sameVisits && row.pure,row.kind).toBe(true);
    }
    expect(rows.find(function (r) {return r.kind==='multipleErrors';}).error)
      .toBe(rows.find(function (r) {return r.kind==='nullId';}).error);
  });

  test(prefix+' terminal preparations and undertaking receipts retain original records without replay',async function ({page},info) {
    await start(page,info,prefix);
    const rows=await page.evaluate(function () {
      const Q=snapshotProbe,C=snapshotCase,S=FB.save,live=FB.state,opening=Q.copy(live),
        rng=FB.getRngState(),uid=FB.getUidCounter();
      const rows=[];
      try {
        ['stopped','refused','expired','pending','reviewed','declined','term'].forEach(function (kind) {
          FB.state=Q.copy(opening);
          const s=FB.state,p=s.stories[C.prep],P=FB.expeditionPreparation,E=FB.expeditionAgreements;
          let terms=s.stories[C.terms];
          if (['stopped','refused','expired'].indexOf(kind)>=0) {
            if (kind==='expired') {s.turn=p.endTurn;FB.stories.get(C.prep).day(s,p);}
            else if (!P.commit(s,P.review(s,C.prep,kind==='stopped' ? 'stop' : 'refuse',p.provider.characterId)))
              throw new Error('Closure fixture failed: '+kind);
            FB.stories.get(C.terms).day(s,terms);
          } else {
            C.form(true);
            terms=s.stories[C.terms];
            if (kind==='reviewed' || kind==='declined') {
              terms.partyIds.forEach(function (id,i) {
                if (kind==='declined' && i>0) return;
                const action=kind==='declined' ? 'decline' : 'acknowledge';
                if (!E.commit(s,C.terms,E.review(s,C.terms,action,id))) throw new Error('Undertaking fixture failed: '+kind);
              });
            }
            if (kind==='term') {s.turn=FB.stories.get(C.terms).declaration.endTurn;FB.stories.get(C.terms).day(s,terms);}
          }
          const before=JSON.stringify([s,FBDATA]),candidate=Q.run(false,function () {return S.serialize();}),
            reference=Q.run(true,function () {return S.serialize();});
          if (candidate.error || reference.error) throw new Error(kind+': '+candidate.error+' / '+reference.error);
          const restored=Q.run(false,function () {
            S.restore(JSON.parse(candidate.result));
            const first=S.serialize();S.restore(JSON.parse(first));return S.serialize();
          });
          if (restored.error) throw new Error(kind+' restore: '+restored.error);
          const saved=JSON.parse(candidate.result),again=JSON.parse(restored.result);
          const roundtrip=!restored.error && ['stories','authority','chars','realms','player','armies','population','market','start'].every(function (key) {
            return Q.canonical(saved.state[key])===Q.canonical(again.state[key]);
          }) && (saved.rng >>> 0)===(again.rng >>> 0) && saved.uid===again.uid && saved.mods===again.mods;
          let badReceipt=null,badReference=null;
          if (p.formed) {
            const forged=JSON.parse(candidate.result);forged.state.stories[C.prep].formed.foodCost++;
            badReceipt=Q.run(false,function () {return S.v4.migrate(forged);}).error;
            badReference=Q.run(true,function () {return S.v4.migrate(forged);}).error;
          }
          rows.push({kind:kind,preparation:p.status,undertaking:terms.status,candidate:candidate,reference:reference,roundtrip:roundtrip,
            receipt:!p.formed || !!badReceipt && badReceipt===badReference,
            pure:before===JSON.stringify([s,FBDATA]) && (rng >>> 0)===(FB.getRngState() >>> 0) && uid===FB.getUidCounter()});
        });
      } finally {FB.state=live;}
      return rows;
    });
    expect(rows.map(function (r) {return [r.preparation,r.undertaking];})).toEqual([
      ['closed','interrupted'],['closed','declined'],['closed','expired'],['formed','pending'],
      ['formed','reviewed'],['formed','declined'],['formed','expired']]);
    for (const row of rows) {
      expectReuse(row.candidate,3);
      expect(row.reference.error,row.kind).toBeNull();
      expect(row.candidate.result,row.kind).toBe(row.reference.result);
      expect(row.candidate.stats.visits,row.kind).toEqual(row.reference.stats.visits);
      expect(row.receipt && row.pure && row.roundtrip,row.kind).toBe(true);
    }
  });
}

test('registered aliases, unregistered lookalikes, nested states and catalogues have isolated lifetimes',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const S=FB.save,Q=snapshotProbe,root=JSON.parse(S.serialize()).state,other=Q.copy(root),catalogue=FBDATA,
      validate=S.v4.validatePlatform,expand=S.expandedSnapshot,register=S._registerValidationAlias,
      views=[],aliases=[],counts=[],original=JSON.stringify([root,other,FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    other.turn++;
    const staged=JSON.stringify([root,other,FB.state,FBDATA]);
    let builds=0,outer,inner,switched,unregistered,thrownView,nestedThrow=false,nestedError=false,thrown=false,expandedFailure=false;
    S.expandedSnapshot=function (s) {builds++;return expand(s);};
    S._registerValidationAlias=function (raw,partial) {aliases.push([raw,partial]);return register(raw,partial);};
    S.v4.validatePlatform=function (s) {
      if (s===other) {
        inner=S._validationSnapshot(s);
        if (nestedThrow) throw new Error('nested sentinel');
        return true;
      }
      if (FBDATA!==catalogue) {switched=S._validationSnapshot(s);return true;}
      // Actual base validation creates all three aliases and dispatches both tails.
      validate(s);
      outer=S._validationSnapshot(s);
      const publicA=S.expandedSnapshot(s),publicB=S.expandedSnapshot(s);
      publicA.chars[s.player.charId].name='Detached caller edit';
      views.push(publicA!==publicB && publicA!==outer &&
        publicB.chars[s.player.charId].name===outer.chars[s.player.charId].name);
      aliases.forEach(function (pair) {views.push(S._validationSnapshot(pair[1])===outer);});
      const similar=Object.assign({},s,{expanded:true});
      unregistered=S._validationSnapshot(similar);
      const comparable=Object.assign({},unregistered);delete comparable.expanded;
      views.push(unregistered!==outer && unregistered.expanded===true && Q.canonical(comparable)===Q.canonical(outer));
      S._validatePlatform(other);
      views.push(S._validationSnapshot(s)===outer && inner!==outer && inner.turn===other.turn);
      nestedThrow=true;
      try {S._validatePlatform(other);} catch (e) {nestedError=e.message==='nested sentinel';}
      views.push(S._validationSnapshot(s)===outer);
      window.FBDATA=Object.assign({},catalogue);
      try {
        const outside=S._validationSnapshot(s);
        views.push(outside!==outer);
        S._validatePlatform(s);
        views.push(switched!==outer && switched!==outside);
      } finally {window.FBDATA=catalogue;}
      views.push(S._validationSnapshot(s)===outer);
      return true;
    };
    try {
      S._validatePlatform(root); counts.push(builds);
      views.push(S._validationSnapshot(root)!==outer); // no context after return
      S.v4.validatePlatform=function (s) {thrownView=S._validationSnapshot(s);throw new Error('validation sentinel');};
      try {S._validatePlatform(root);} catch (e) {thrown=e.message==='validation sentinel';}
      const after=S._validationSnapshot(root);views.push(after!==thrownView && S._validationSnapshot(root)!==after);
      S.expandedSnapshot=function () {throw new Error('expansion sentinel');};
      try {S._validatePlatform(root);} catch (e) {expandedFailure=e.message==='expansion sentinel';}
      S.expandedSnapshot=function (s) {builds++;return expand(s);};
      const recovered=S._validationSnapshot(root);views.push(recovered!==S._validationSnapshot(root));
      S.v4.validatePlatform=function (s) {const a=S._validationSnapshot(s);views.push(a!==after);return true;};
      S._validatePlatform(root);
      const publicA=S.expandedSnapshot(root),publicB=S.expandedSnapshot(root);
      publicA.chars[root.player.charId].name='Changed detached name';
      views.push(publicA!==publicB && publicB.chars[root.player.charId].name===root.chars[root.player.charId].name);
    } finally {
      S.v4.validatePlatform=validate;S.expandedSnapshot=expand;S._registerValidationAlias=register;window.FBDATA=catalogue;
    }
    return {views:views,firstBuilds:counts[0],aliases:aliases.length,thrown:thrown,nestedError:nestedError,expandedFailure:expandedFailure,
      pure:staged===JSON.stringify([root,other,FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter(),
      staged:original!==staged};
  });
  expect(result.aliases).toBe(3);
  expect(result.firstBuilds).toBe(8); // root, two public copies, lookalike, two nested states, two catalogue copies
  expect(result.views.every(Boolean)).toBe(true);
  expect(result.thrown && result.nestedError && result.expandedFailure && result.pure && result.staged).toBe(true);
});

test('successive transactions see live mutations, real candidate catalogues and expansion-free early returns',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const S=FB.save,Q=snapshotProbe,s=FB.state,C=snapshotCase,original=JSON.stringify([s,FBDATA]),
      rng=FB.getRngState(),uid=FB.getUidCounter(),source=JSON.parse(S.serialize()),p=C.provider(s),
      field=p.character.name,modSource=JSON.parse(localStorage.getItem('fb_mods') || 'null');
    const first=Q.run(false,function () {return S.serialize();});
    p.character.name=field+' revised';
    const second=Q.run(false,function () {return S.serialize();});
    p.character.name=field;
    const third=Q.run(false,function () {return S.serialize();});
    const beforeCandidate=JSON.stringify([s,FBDATA]),signature=FB.mods.sig();
    // The real ordinary JSON validator temporarily installs candidate tables.
    const culture=Q.copy(FBDATA.cultures[s.chars[s.player.charId].culture]);culture.name='Snapshot culture';
    const errors=FB.mods.validate({name:'Snapshot candidate',cultures:{snapshot_culture:culture}});
    const afterCandidate=Q.run(false,function () {return S.serialize();});
    const early=Q.run(false,function () {
      const bad=Q.copy(source);bad.state.chars[bad.state.player.charId].id=null;return S.v4.migrate(bad);
    });
    return {first:first,second:second,third:third,afterCandidate:afterCandidate,early:early,errors:errors,
      changed:first.result!==second.result,restored:first.result===third.result && third.result===afterCandidate.result,
      pure:beforeCandidate===JSON.stringify([s,FBDATA]) && original===JSON.stringify([s,FBDATA]) && signature===FB.mods.sig() &&
        rng===FB.getRngState() && uid===FB.getUidCounter() && JSON.stringify(modSource)===JSON.stringify(JSON.parse(localStorage.getItem('fb_mods') || 'null'))};
  });
  for (const key of ['first','second','third','afterCandidate']) expectReuse(result[key],3);
  expect(result.changed && result.restored && result.pure).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.early.error).toBeTruthy();
  expect(result.early.stats.eligibleBuilds).toBe(0);
});

test('a reentrant detached migration owns one expansion independently of the enclosing save',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const S=FB.save,Q=snapshotProbe,source=JSON.parse(S.serialize()),input=Q.copy(source),platform=S.v4.validatePlatform,
      before=JSON.stringify([input,FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    input.state.turn++;
    const staged=JSON.stringify([input,FB.state,FBDATA]);
    function run(reference) {
      let entered=false,nested=null;
      S.v4.validatePlatform=function (s) {
        if (!entered) {entered=true;nested=S.v4.migrate(input);}
        return platform(s);
      };
      try {
        const measured=Q.run(reference,function () {return S.serialize();});
        return {measured:measured,nested:nested};
      } finally {S.v4.validatePlatform=platform;}
    }
    const candidate=run(false),reference=run(true);
    return {candidate:candidate,reference:reference,
      pure:before!==staged && staged===JSON.stringify([input,FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result.candidate.measured.error).toBeNull();expect(result.reference.measured.error).toBeNull();
  expect(result.candidate.measured.stats.requests).toBe(6);
  expect(result.candidate.measured.stats.eligibleBuilds).toBe(2);
  expect(result.candidate.measured.stats.views).toBe(2);
  expect(result.reference.measured.stats.eligibleBuilds).toBe(6);
  expect(result.candidate.measured.stats.visits).toEqual(result.reference.measured.stats.visits);
  expect(result.candidate.measured.result).toBe(result.reference.measured.result);
  expect(result.candidate.nested).toEqual(result.reference.nested);
  expect(result.pure && result.candidate.measured.stats.raw && result.candidate.measured.stats.equivalent).toBe(true);
});

test('validation context ends before chronicle pruning and the migrated authority stamp',async function ({page},info) {
  await start(page,info,'harbor');
  expect(await page.evaluate(function () {
    const S=FB.save,Q=snapshotProbe,source=JSON.parse(S.serialize()),snapshot=S._validationSnapshot,
      validate=S.v4.validatePlatform,prune=FB.pruneChronicle,checks=[];
    let borrowed=null;
    S._validationSnapshot=function (s) {const view=snapshot(s);if (!borrowed) borrowed=view;return view;};
    FB.pruneChronicle=function (s) {
      const a=snapshot(s),b=snapshot(s);checks.push(a!==b && a!==borrowed && b!==borrowed);
      return prune(s);
    };
    try {
      S.serialize();
      FB.pruneChronicle=prune;borrowed=null;
      S.v4.validatePlatform=function (s) {
        const result=validate(s);let schema=s.authority.schema;
        Object.defineProperty(s.authority,'schema',{configurable:true,enumerable:true,
          get:function () {return schema;},set:function (value) {
            const a=snapshot(s),b=snapshot(s);checks.push(a!==b && a!==borrowed && b!==borrowed);schema=value;
          }});
        return result;
      };
      const input=JSON.stringify(source),migrated=S.v4.migrate(source);
      S.v4.validatePlatform=validate;S._validationSnapshot=snapshot;
      checks.push(input===JSON.stringify(source) && Q.canonical(migrated)===Q.canonical(S.v4.migrate(source)));
    } finally {S.v4.validatePlatform=validate;S._validationSnapshot=snapshot;FB.pruneChronicle=prune;}
    return checks;
  })).toEqual([true,true,true]);
});

for (const change of ['replacement','restoration','removal']) test('ordinary JSON '+change+' cannot reuse a previous catalogue view',async function ({page},info) {
  const mod=await start(page,info,'harbor'),original=JSON.parse(JSON.stringify(mod)),
    saved=await page.evaluate(function () {return FB.save.serialize();});
  async function install(value) {
    await page.evaluate(function () {FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles({name:'snapshot-replacement.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(value))});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);await probes(page);
  }
  async function rejection() {
    const result=await page.evaluate(function (saved) {
      const S=FB.save,Q=snapshotProbe,input=JSON.parse(saved),before=JSON.stringify(input),
        candidate=Q.run(false,function () {return S.v4.migrate(input);}),reference=Q.run(true,function () {return S.v4.migrate(input);});
      return {candidate:candidate,reference:reference,pure:before===JSON.stringify(input)};
    },saved);
    expect(result.candidate.error).toBeTruthy();
    expect(result.candidate.error).toBe(result.reference.error);
    expect(result.candidate.stats.eligibleBuilds).toBe(0);
    expect(result.pure).toBe(true);
  }
  if (change==='replacement') {
    mod.buildingProfiles.harbor_snapshot_store.replace.tax=3;
    await install(mod);await rejection();
  } else if (change==='restoration') {
    mod.buildingProfiles.harbor_snapshot_store.replace.tax=3;
    await page.evaluate(function (profiles) {
      FB.mods.apply(JSON.parse(JSON.stringify({buildingProfiles:profiles})));
    },mod.buildingProfiles);
    await rejection();
    // Rebuild the complete matching stored catalogue before loading its save.
    await install(original);await restoreBookmark(page,saved);
    const restored=await page.evaluate(function () {return snapshotProbe.run(false,function () {return FB.save.serialize();});});
    expectReuse(restored,3);
    expect(JSON.parse(restored.result).state.stories).toEqual(JSON.parse(saved).state.stories);
  } else {
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(function () {FB.mods.removeAt(0);})]);
    await prepareGameContent(page);await probes(page);await rejection();
  }
});

test('native 1096 preparations keep every validation visit while eleven semantic expansions become one',async function ({page},info) {
  await beginBookmark(page,info,'1096');
  await probes(page);
  const result=await page.evaluate(function () {
    const Q=snapshotProbe,S=FB.save;
    S.serialize(); // finish the unchanged chronicle pruning boundary before purity capture
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const candidate=Q.run(false,function () {return S.serialize();}),reference=Q.run(true,function () {return S.serialize();});
    return {candidate:candidate,reference:reference,pure:before===JSON.stringify([FB.state,FBDATA]) &&
      rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expectReuse(result.candidate,11);
  expect(result.reference.error).toBeNull();
  expect(result.reference.stats.eligibleBuilds).toBe(11);
  expect(result.reference.stats.visits).toEqual(result.candidate.stats.visits);
  expect(result.reference.stats.builds-result.candidate.stats.builds).toBe(10);
  expect(result.reference.result).toBe(result.candidate.result);
  expect(result.pure).toBe(true);
  await info.attach('expansion-counts.json',{contentType:'application/json',body:JSON.stringify({
    requests:result.candidate.stats.requests,referenceBuilds:result.reference.stats.eligibleBuilds,
    candidateBuilds:result.candidate.stats.eligibleBuilds,
    removedStringifyParseInflatePasses:result.reference.stats.builds-result.candidate.stats.builds})});
});

for (const bookmark of ['476','1096','1204']) test(bookmark+' directly staged mature records preserve save bytes and bounded expansion counts',async function ({page},info) {
  await beginBookmark(page,info,bookmark,bookmark==='476' ? 'mobile_household_476' : undefined);
  await probes(page);
  const result=await page.evaluate(function () {
    const s=FB.state,Q=snapshotProbe,S=FB.save,year=s.date.year;
    FB.authorityYear(s);
    s.turn=30*360;s.date.year=year+30;
    const rights=s.authority.rights;
    if (!rights.length) throw new Error('Expected ordinary customary rights');
    rights.forEach(function (r) {
      for (let y=1;y<=30;y++) r.history.push({turn:y*360,year:year+y-1,event:'possession',evidence:null});
    });
    S.serialize();
    const before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),
      candidate=Q.run(false,function () {return S.serialize();}),reference=Q.run(true,function () {return S.serialize();});
    return {candidate:candidate,reference:reference,records:rights.reduce(function (n,r) {return n+r.history.length;},0),
      pure:before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result.candidate.error).toBeNull();
  expect(result.reference.error).toBeNull();
  expect(result.candidate.stats.requests).toBe(bookmark==='1096' ? 11 : 0);
  expect(result.candidate.stats.eligibleBuilds).toBe(bookmark==='1096' ? 1 : 0);
  expect(result.candidate.result).toBe(result.reference.result);
  expect(result.records).toBeGreaterThanOrEqual(30);
  expect(result.pure).toBe(true);
});

test('supported v3 envelopes preserve explicit null royal identities through two restores',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  await page.evaluate(function () {FBDATA.bookmarks['867'].revision='baseline';});
  await beginBookmarkFromTitle(page,'867');await probes(page);
  const result=await page.evaluate(function () {
    const S=FB.save,Q=snapshotProbe,s=FB.state;
    let selected=null;
    Object.keys(s.realms).some(function (rid) {
      const succession=s.realms[rid].succession,members=succession && succession.members || {};
      return Object.keys(members).some(function (id) {
        const m=members[id],c=s.chars[m.charId];
        if (id===succession.rulerMemberId || !c || !c.royalLine) return false;
        m.charId=null;selected={realm:rid,member:id};return true;
      });
    });
    if (!selected) throw new Error('No ordinary non-ruling royal member');
    const input=JSON.parse(S.serialize());input.v=3;
    delete input.titleIds;delete input.authoritySchema;delete input.platformSchema;
    delete input.state.start.revision;
    if (input.state.authority) delete input.state.authority.schema;
    const before=JSON.stringify(input),candidate=Q.run(false,function () {return S.v4.migrate(input);}),
      reference=Q.run(true,function () {return S.v4.migrate(input);});
    S.restore(input);const first=JSON.parse(S.serialize());S.restore(first);const second=JSON.parse(S.serialize());
    return {candidate:candidate,reference:reference,pure:before===JSON.stringify(input),
      explicit:input.state.realms[selected.realm].succession.members[selected.member].charId===null &&
        FB.state.realms[selected.realm].succession.members[selected.member].charId===null,
      same:Q.canonical(first.state)===Q.canonical(second.state) && (first.rng >>> 0)===(second.rng >>> 0) &&
        first.uid===second.uid && first.mods===second.mods};
  });
  expect(result.candidate.error).toBeNull();expect(result.reference.error).toBeNull();
  expect(result.candidate.result).toEqual(result.reference.result);
  expect(result.pure && result.explicit && result.same).toBe(true);
});

test('released v1 corpus restore and re-save retain uncached validation parity',async function ({page},info) {
  const entry=corpusEntries().find(function (e) {return e.path.indexOf('v1.182.2-test-saves/01-')>=0;}),source=readCorpusExport(entry);
  test.skip(!!source.missing,'Released corpus export is supplied through FB_PARITY_CORPUS.');
  expect(source.sha256).toBe(entry.sha256);
  await loadParitySave(page,info,source.text);
  await probes(page);
  const result=await page.evaluate(function (source) {
    const Q=snapshotProbe,S=FB.save;
    const input=S.parseExport(source),before=JSON.stringify(input),
      candidate=Q.run(false,function () {return S.v4.migrate(input);}),reference=Q.run(true,function () {return S.v4.migrate(input);});
    const saved=S.serialize();S.restore(input);const first=S.serialize();S.restore(JSON.parse(first));const second=S.serialize();
    return {candidate:candidate,reference:reference,pure:before===JSON.stringify(input),
      same:Q.canonical(JSON.parse(saved))===Q.canonical(JSON.parse(first)) && Q.canonical(JSON.parse(first))===Q.canonical(JSON.parse(second))};
  },source.text);
  expect(result.candidate.error).toBeNull();
  expect(result.reference.error).toBeNull();
  expect(result.candidate.result).toEqual(result.reference.result);
  expect(result.pure && result.same).toBe(true);
});
