'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {installRestoreFacts} = require('../support/game/restore-facts');
const example = require('../fixtures/authoring/mobile-principal-starts-glassroad.json');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['data/bookmark_manifest.js','data/starts_mobile_principal.js','data/story_mobile_principal.js',
  'data/starts_mobile_leaders.js','data/story_mobile_leadership.js','data/bookmark_1204_terrain.js','data/mobile_confederations.js',
  'js/schema.js','js/starts.js','js/main.js','js/bookmark_setup.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/story_opening_goals.js','js/story_household.js',
  'js/story_ruler_agenda.js','js/stories.js','js/ui_mobile.js','js/ui_modals.js','js/treasury.js','js/population.js',
  'js/market.js','js/model.js','js/armies.js','js/governments.js','js/government_selection.js','js/station.js',
  'js/modifiers.js','js/holywar.js','js/rebellions.js','js/agency.js']);

async function imported(page,info) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  expect(await page.evaluate(function (input) {return FB.mods.validate(input);},example)).toEqual([]);
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-principal-starts-glassroad.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}
async function choose(page) {
  await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
}
async function beginCode(page,code) {
  await choose(page);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);});
}
async function beginImported(page,info,member) {
  await imported(page,info);
  await beginCode(page,'GLASSROAD-dune_world-dune_'+(member ? 'member' : 'leader')+'_start-dune_well-f-'+
    (member ? 'Nari_Ash' : 'Sela_Vey')+'-standard');
  await installRestoreFacts(page);
  await page.evaluate(function () {
    // Settle existing lazy owners before an exact whole-state checkpoint.
    // These reads create empty ledgers and current-generation aim metadata;
    // they do not advance time or perform a public transaction.
    window.principalCheckpoint = function (s) {
      FB.ensureCountySupport(s);FB.ensureGreatHolyWar(s);FB.ensureRebellions(s);FB.ensureAgency(s);
      return restoreFacts(s,function (s) {return s;},{technologySets:true});
    };
  });
}
function coalitionFacts() {
  const s=FB.state,M=FB.mobile,sc=FB.campaignStart(s),b=s.start.mobilePrincipal,r=M.row(s,b.realmId),me=s.chars[s.player.charId];
  const d=FB.campaignBookmark(s).realms.find(function (d) {return d.id===b.realmId;}),host=M.host(s,b.realmId);
  const member=r.members.find(function (m) {return m.id===b.memberId;});
  const publicGold=FB.treasuryAvailable(s,b.realmId),privateGold=s.player.gold;
  s.player.gold=0;const separate=FB.treasuryAvailable(s,b.realmId)===publicGold;s.player.gold=privateGold;
  const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
  const repeated=FB.adoptStartingMobilePrincipal(s,sc);
  FB.mobileInitialize(s,FB.campaignBookmark(s).realms);FB.mobileInitializeAuthored(s,FB.campaignBookmark(s).realms);
  return {identity:member.principal.id===me.id && b.charId===me.id,
    bound:!d.mobile.opening || r.openingBindings.some(function (b) {return b.characterId===me.id && FB.bookmarkActor(s,b.person.actorId)===me;}),
    one:d.mobile.opening ? Object.values(s.chars).filter(function (c) {return c.name===me.name;}).length :
      r.members.filter(function (m) {return m.principal.id===me.id;}).length,
    noInventedFamily:!me.fatherId && !me.motherId && !me.spouseId && me.childrenIds.length===0,
    leader:M.leader(s,b.realmId).id===me.id,court:s.player.liege===b.realmId && M.migration(s,b.realmId).courtIds.indexOf(me.id)>=0,
    noLand:s.player.provs.length===0 && s.player.landPlots.length===0 && FB.realmTerritory(s,b.realmId).length===0,
    institution:!!s.realms[b.realmId] && !s.realms.player,separate:separate,privateGold:privateGold,
    food:r.food+host.mobileFood,declaredFood:d.mobile.food,men:host.men,declaredMen:d.mobile.fighters,
    total:M.total(s,b.realmId),initial:r.accounting.initial,schema:r.schema,members:r.members.length,
    noAgreement:r.agreements.length===0,profile:!!s.stories[sc.tracks[1]],
    repeatPure:!repeated && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),valid:M.validate(s)};
}

test('native leader picker keeps the existing Qipchaq opening and offers current leader reviews',async function ({page},info) {
  await openGame(page,info);await choose(page);
  await page.locator('[data-bookmark="1204"]').click();
  const card=page.locator('[data-scenario="qipchaq_principal_1204"]');
  await expect(card).toContainText('generated river principal');await card.click();
  await expect(page.locator('#cg-name-field')).toBeHidden();
  await expect(page.locator('#cg-fixed')).toContainText('private purse');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);});
  const facts=await page.evaluate(coalitionFacts);
  expect(facts).toMatchObject({identity:true,bound:true,one:1,noInventedFamily:true,leader:true,court:true,noLand:true,
    institution:true,separate:true,privateGold:12,food:3200,declaredFood:3200,men:80,declaredMen:80,total:1600,initial:1600,
    schema:1,members:2,noAgreement:true,profile:true,repeatPure:true,valid:true});
  const native=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='qipchaq_following_1204',r=M.row(s,rid),actor={kind:'character',id:s.player.charId};
    const request={realmId:rid,action:'propose',actor:actor,terms:{operation:'agreement',
      proposal:{kind:'tribute',partnerId:'khwarazm_1204',levy:0,price:6,duration:30}}};
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const review=M.review(s,request),ai=M.review(s,Object.assign({},request,{actor:{kind:'realm',id:rid}}));
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    s.player.gold++;const changed=JSON.stringify(s),stale=!M.commit(s,review),stalePure=changed===JSON.stringify(s);s.player.gold--;
    const agenda='qipchaq_principal_agenda_1204';
    const chosen=FB.stories.apply(s,agenda,'review_members',FB.stories.quote(s,agenda,'review_members'));
    const completed=s.stories.opening_qipchaq_principal_1204.goals.members.status==='completed';
    const accounts=JSON.stringify([r,s.realms[rid].treasury,s.player.gold]),cid=s.player.charId;
    FB.save.restore(JSON.parse(FB.save.serialize()));FB.save.restore(JSON.parse(FB.save.serialize()));
    return {pure:pure,allowed:review.review.allowed,parity:ai.review.allowed===review.review.allowed && ai.review.cost===review.review.cost,
      stale:stale,stalePure:stalePure,chosen:chosen,completed:completed,restored:FB.state.player.charId===cid &&
        accounts===JSON.stringify([M.row(FB.state,rid),FB.state.realms[rid].treasury,FB.state.player.gold]) &&
        FB.state.stories.opening_qipchaq_principal_1204.goals.members.status==='completed'};
  });
  expect(native).toEqual({pure:true,allowed:true,parity:true,stale:true,stalePure:true,chosen:true,completed:true,restored:true});
  await page.evaluate(function () {FB.ui.showMobileConfederation('qipchaq_following_1204');});
  await expect(page.locator('#gm-body')).toContainText('Coalition leader');
  await expect(page.getByRole('button',{name:'Propose seasonal access to members',exact:false})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Recruit fighters',exact:false})).toBeEnabled();
});

for (const member of [false,true]) test('ordinary JSON selects the '+(member ? 'other member' : 'bound incumbent')+' without duplicates or extra resources',async function ({page},info) {
  await beginImported(page,info,member);
  expect(await page.evaluate(coalitionFacts)).toMatchObject({identity:true,bound:true,one:1,noInventedFamily:true,
    leader:!member,court:true,noLand:true,institution:true,separate:true,privateGold:member ? 9 : 23,
    food:3200,declaredFood:3200,men:160,declaredMen:160,total:1600,initial:1600,schema:2,members:2,
    noAgreement:true,profile:true,repeatPure:true,valid:true});
  const restore=await page.evaluate(function () {
    const s=FB.state,rid=s.start.mobilePrincipal.realmId,M=FB.mobile;
    s.player.gold-=3;FB.treasurySpend(s,rid,4);M.row(s,rid).food-=7;
    function facts() {return restoreFacts(FB.state,function (s) {return s;},{technologySets:true});}
    // Keep the whole state, every ordered array, RNG and UID. Only the codec's
    // authority tag and technology membership sets use their shared normalization.
    const before=principalCheckpoint(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const same=assertRestoreFacts(facts(),before),once=facts();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {same:same,twice:assertRestoreFacts(facts(),once),valid:M.validate(FB.state),gold:FB.state.player.gold};
  });
  expect(restore).toEqual({same:true,twice:true,valid:true,gold:member ? 6 : 20});
});

test('a native start code reopens the same generated principal and canonical following on a cold page',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  await page.evaluate(function () {FB.game.uiPrefs.onboardingStarted=true;FB.game.saveUiPrefs();});
  await beginCode(page,'COALITION-1204-qipchaq_principal_1204-lower_syr_darya-m-Principal-standard');
  const snapshot=async function () {return page.evaluate(function () {
    const s=FB.save.expandedSnapshot(FB.state);
    return {seed:s.seed,facts:FB.contentValues.canonical([s.start,s.chars,s.player,s.authority,s.armies,s.stories,
      FB.getRngState()>>>0,FB.getUidCounter()])};
  });};
  const first=await snapshot();await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);
  await beginCode(page,first.seed);expect(await snapshot()).toEqual(first);
});

test('detached imports reject bad selectors, identity, home and authority before publication',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  const result=await page.evaluate(function (input) {
    const before=FB.contentValues.canonical(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const edits=[function (s) {s.mobilePrincipal.memberId='absent';},function (s) {s.mobilePrincipal.realmId='dune_oasis';},
      function (s) {s.mobilePrincipal.extra=true;},function (s) {s.characterName='Another Person';},
      function (s) {s.startAge++;},function (s) {s.startReligion='catholic';},function (s) {s.sex='m';},
      function (s) {s.fixedProvinceId='dune_pass';},function (s) {s.governmentForm='regnum';},
      function (s) {s.originalPrincipal={realmId:'dune_coalition',actorId:'dune_incumbent'};},
      function (s) {s.existingPerson={realmId:'dune_coalition',memberId:'ruler',householdMemberIds:['ruler']};},
      function (s) {s.tracks=['opening_dune_leader_start'];},function (s) {s.familyPresets.established={};}];
    return {faults:FB.mods.validate(input),rejected:edits.map(function (edit) {
      const candidate=JSON.parse(JSON.stringify(input));edit(candidate.startScenarios.find(function (s) {return s.id==='dune_leader_start';}));
      return FB.mods.validate(candidate).length>0;
    }),pure:before===FB.contentValues.canonical(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },example);
  expect(result.faults).toEqual([]);expect(result.pure).toBe(true);expect(result.rejected).toEqual(Array(13).fill(true));
});

test('opening priorities observe committed choices and cancellation changes no accounts',async function ({page},info) {
  await beginImported(page,info,false);
  const result=await page.evaluate(function () {
    const s=FB.state,id='dune_principal_household',profile=s.stories.opening_dune_leader_start;
    const before=JSON.stringify([s.player.gold,s.realms.dune_coalition.treasury,FB.mobile.row(s,'dune_coalition')]);
    const review=FB.stories.quote(s,id,'review_private');
    const pure=before===JSON.stringify([s.player.gold,s.realms.dune_coalition.treasury,FB.mobile.row(s,'dune_coalition')]);
    const committed=FB.stories.apply(s,id,'review_private',review);
    return {pure:pure,committed:committed,status:profile.goals.review.status,
      noTransfer:before===JSON.stringify([s.player.gold,s.realms.dune_coalition.treasury,FB.mobile.row(s,'dune_coalition')])};
  });
  expect(result).toEqual({pure:true,committed:true,status:'completed',noTransfer:true});
});

test('withholding allegiance retains membership, while a reviewed local departure releases the player court',async function ({page},info) {
  await beginImported(page,info,false);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',actor={kind:'character',id:s.player.charId};
    const terms={kind:'access',partnerId:'dune_oasis',countyIds:['dune_well'],capacity:1600,allowRecruit:true,price:0,duration:30};
    function commit(action,acting,terms) {return M.commit(s,M.review(s,{realmId:rid,action:action,actor:acting,terms:terms}));}
    const proposed=commit('propose',actor,{operation:'agreement',proposal:terms});
    M.members(s,rid).forEach(function (m) {commit('assent',m.principal,{assent:true});});
    const offered=commit('offer',actor,terms),offer=M.agreements(s,rid)[0];
    const accepted=offer && commit('accept',{kind:'realm',id:'dune_oasis'},{agreementId:offer.id});
    const demustered=commit('demuster',actor,{});
    const withheld=commit('pledge',actor,{memberId:'well_following',allegiance:false,pledge:0});
    M.restorePlayerCourt(s);const retained=s.player.liege===rid;
    const before=JSON.stringify(s);
    const review=M.review(s,{realmId:rid,action:'leave',actor:actor,terms:{memberId:'well_following',countyId:'dune_well'}});
    const cancelPure=before===JSON.stringify(s);
    const left=M.commit(s,review);
    const marker=JSON.stringify(s.start.mobilePrincipal),location=s.player.provinceId,privateGold=s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {proposed:proposed,offered:offered,accepted:!!accepted,demustered:demustered,withheld:withheld,retained:retained,
      cancelPure:cancelPure,left:left,court:FB.state.player.liege==='dune_oasis',samePlace:FB.state.player.provinceId===location,
      samePurse:FB.state.player.gold===privateGold,provenance:marker===JSON.stringify(FB.state.start.mobilePrincipal),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({proposed:true,offered:true,accepted:true,demustered:true,withheld:true,retained:true,cancelPure:true,
    left:true,court:true,samePlace:true,samePurse:true,provenance:true,valid:true});
});

for (const heirKind of ['household','member','selected']) test('death and '+heirKind+' succession retain the coalition account and original principal across restore',async function ({page},info) {
  await beginImported(page,info,false);
  const result=await page.evaluate(function (kind) {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),old=s.chars[s.player.charId],other=FB.bookmarkActor(s,'dune_deputy');
    const child=FB.makeCharacter(s,{name:'Lara',sex:'f',culture:old.culture,religion:old.religion,born:880,station:1});
    child.homeProvinceId='dune_well';child.skills.dip=6;child.motherId=old.id;old.childrenIds.push(child.id);FB.touchFamily();
    const publicGold=FB.treasuryAvailable(s,rid),food=r.food,host=M.host(s,rid),hostId=host.id,bindings=JSON.stringify(r.openingBindings);
    FB.game.die('Old age');
    const vacant=!M.leader(s,rid) && !!r.selection;
    function commit(action,actor,terms) {return M.commit(s,M.review(s,{realmId:rid,action:action,actor:actor,terms:terms}));}
    // Member replacement is a separate existing political decision, never inheritance.
    if (kind!=='household') {
      const appointed=commit('replace_member',{kind:'character',id:other.id},{memberId:'well_following',candidateId:child.id});
      // Existing leadership first needs a leader; represent only after all original
      // principals are unavailable is intentionally not used to bypass that rule.
      if (appointed) throw new Error('A surviving ordinary member cannot appoint a replacement.');
    }
    const supported=commit('support',{kind:'character',id:other.id},{candidateId:other.id});
    const selected=commit('select',{kind:'realm',id:rid},{candidateId:other.id});
    if (kind!=='household') {
      if (!commit('replace_member',{kind:'character',id:other.id},{memberId:'well_following',candidateId:child.id})) throw new Error('Leader appointment failed.');
      if (kind==='selected') {
        // Stage a genuine vacancy and let the current members cast their own votes.
        FB.advanceRealmSuccession(s,rid,{cause:'vacancy'});
        r.members.forEach(function (m) {commit('support',m.principal,{candidateId:child.id});});
        if (!commit('select',{kind:'realm',id:rid},{candidateId:child.id})) throw new Error('Member selection failed.');
      }
    }
    const heir=FB.game.succeedTo(child.id);
    FB.stories.get('dune_principal_household').day(s,s.stories.dune_principal_household);
    FB.stories.get('opening_dune_leader_start').day(s,s.stories.opening_dune_leader_start);
    const expectedLeader=kind==='selected' ? child.id : other.id;
    const before=principalCheckpoint(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));FB.save.restore(JSON.parse(FB.save.serialize()));
    const current=FB.state;
    return {vacant:vacant,supported:supported,selected:selected,heir:heir,leader:M.leader(current,rid).id===expectedLeader,
      original:current.start.mobilePrincipal.charId===old.id && current.chars[old.id].dead,
      personalHistory:current.stories.dune_principal_household.actorId===old.id && current.stories.dune_principal_household.phase==='interrupted' &&
        current.stories.opening_dune_leader_start.goals.review.status==='archived',
      publicGold:FB.treasuryAvailable(current,rid)===publicGold,food:M.row(current,rid).food===food,
      host:M.host(current,rid).id===hostId && M.host(current,rid).men===160,bindings:JSON.stringify(M.row(current,rid).openingBindings)===bindings,
      institution:!!current.realms[rid] && !current.realms.player,court:kind==='household' ? current.player.liege==='dune_oasis' : current.player.liege===rid,
      restored:assertRestoreFacts(restoreFacts(current,function (s) {return s;},{technologySets:true}),before),valid:M.validate(current)};
  },heirKind);
  expect(result).toEqual({vacant:true,supported:true,selected:true,heir:true,leader:true,original:true,personalHistory:true,publicGold:true,food:true,
    host:true,bindings:true,institution:true,court:true,restored:true,valid:true});
});

test('malformed saved provenance and changed JSON content reject atomically',async function ({page},info) {
  await beginImported(page,info,false);
  const result=await page.evaluate(function (input) {
    const saved=JSON.parse(FB.save.serialize()),state=FB.state,rng=FB.getRngState(),uid=FB.getUidCounter(),storage=JSON.stringify(localStorage);
    const edits=[function (s) {s.stories.opening_dune_leader_start.revision='forged';},
      function (s) {delete s.start.mobilePrincipal;},function (s) {s.start.mobilePrincipal.charId='forged';},
      function (s) {s.start.mobilePrincipal.memberId='ridge_following';},function (s) {s.start.mobilePrincipal.extra=true;},
      function (s) {s.start.mobilePrincipal.version=2;}];
    const rejected=edits.map(function (edit) {const bad=JSON.parse(JSON.stringify(saved));edit(bad.state);
      try {FB.save.restore(bad);return false;} catch (e) {return true;}});
    input.startScenarios.find(function (s) {return s.id==='dune_leader_start';}).gold++;
    FB.mods.apply(input);
    try {FB.save.restore(saved);rejected.push(false);} catch (e) {rejected.push(/different mod/.test(e.message));}
    return {rejected:rejected,pure:FB.state===state && rng===FB.getRngState() && uid===FB.getUidCounter() && storage===JSON.stringify(localStorage)};
  },JSON.parse(JSON.stringify(example)));
  expect(result).toEqual({rejected:[true,true,true,true,true,true,true],pure:true});
});
