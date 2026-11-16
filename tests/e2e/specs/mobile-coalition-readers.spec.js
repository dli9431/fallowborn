'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {startHistoricalGame}=require('../support/game/historical-start');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const example=require('../fixtures/authoring/mobile-life-glassroad.json');

dependsOnRuntime(__filename,['js/mobile_confederations.js','js/mobile_columns.js','js/mobile_camps.js',
  'js/events.js','js/schema.js','js/systems.js','js/model.js','js/travel.js','js/starts.js',
  'js/main.js','js/mods.js','js/governments.js','js/government_selection.js','js/authority.js',
  'data/events_mobile_life.js','data/mobile_confederations.js','data/starts_mobile_principal.js',
  'data/starts_mobile_leaders.js','data/bookmark_1204_terrain.js','data/systems.js']);

async function begin(page,info,kind,role) {
  if (kind==='native') {
    await startHistoricalGame(page,info,{bookmark:'1204',code:'CAMP-1204-qipchaq_'+
      (role==='leader' ? 'principal' : 'member')+'_1204-lower_syr_darya-m-'+(role==='leader' ? 'Busir' : 'Almish')+'-standard-0-turkic.tengri'});
    return;
  }
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  expect(await page.evaluate(function (input) {return FB.mods.validate(input);},example)).toEqual([]);
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-life-glassroad.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  if (await page.locator('#btn-choose-beginning').isVisible()) await page.locator('#btn-choose-beginning').click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const start=role==='household' ? 'dune_household' : 'dune_'+role+'_start';
  await page.locator('#ng-seed').fill('CAMP-dune_world-'+start+'-dune_well-f-'+
    (role==='member' ? 'Nari_Ash' : 'Sela_Vey')+'-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);});
}

for (const kind of ['native','JSON']) for (const role of (kind==='native' ? ['leader','member'] : ['leader','member','household'])) {
  test(kind+' '+role+' uses the same mobile pack and pure coalition projections',async function ({page},info) {
    await begin(page,info,kind,role);
    const result=await page.evaluate(function (input) {
      const s=FB.state,M=FB.mobile,rid=input.kind==='native' ? 'qipchaq_following_1204' : 'dune_coalition';
      const original=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const r=M.row(s,rid),cid=s.player.charId;
      function clone() {return JSON.parse(original);}
      let allReadsPure=true;
      function read(state,reader,args,ctx) {
        const before=JSON.stringify(state),rngBefore=FB.getRngState(),uidBefore=FB.getUidCounter();
        const value=FB.eventStateReaders.test(state,[{reader:reader,args:args}],ctx || {});
        allReadsPure=allReadsPure && before===JSON.stringify(state) && rngBefore===FB.getRngState() && uidBefore===FB.getUidCounter();
        return value;
      }
      function eligible(state,id,ctx) {
        const ev=FB.eventById(id);
        return FB.eventPeriodEnabled(state,ev) && FB.checkTrigger(state,ev.trigger,ctx || {});
      }
      const current={following:'current'},explicit={realmId:rid},moment={following:'moment'};
      const projected=[];
      for (let i=0;i<3;i++) projected.push({
        member:read(s,'mobile_coalition_member',current),
        leader:read(s,'mobile_role',{following:'current',role:'leader'}),
        nonleader:read(s,'mobile_role',{following:'current',role:'member'}),
        household:read(s,'mobile_camp_household',current),
        explicitRole:input.role==='household' ? false : read(s,'mobile_role',{realmId:rid,role:input.role}),
        explicit:read(s,input.role==='household' ? 'mobile_camp_household' : 'mobile_coalition_member',explicit),
        moment:read(s,input.role==='household' ? 'mobile_camp_household' : 'mobile_coalition_member',moment,{realmId:rid})
      });
      const state=clone();M.row(state,rid).food=0;
      const pack=FBDATA.events.filter(function (ev) {return ev.pack==='mobile_life';});
      const scarcity=[read(state,'mobile_scarcity',current),read(state,'mobile_scarcity',explicit),
        read(state,'mobile_scarcity',moment,{realmId:rid})];
      M.row(state,rid).food=M.total(state,rid)*M.profile(state,rid).foodPerPerson*30;
      scarcity.push(read(state,'mobile_scarcity',explicit));
      M.row(state,rid).food=0;
      const available=pack.filter(function (ev) {return eligible(state,ev.id);}).map(function (ev) {return ev.id;});
      const audience=input.role==='household' ? 'mobile_camp_household' : 'mobile_coalition_member';
      const absent=[{}, {realmId:'missing'}, {realmId:null}].map(function (ctx) {return read(s,audience,moment,ctx);});
      const negatives=[];
      ['settled','dispersed'].forEach(function (status) {const t=clone();M.row(t,rid).status=status;negatives.push(read(t,audience,current));});
      let t=clone();t.realms[rid].alive=false;negatives.push(read(t,audience,explicit));
      t=clone();t.chars[cid].dead=true;negatives.push(read(t,audience,current));
      t=clone();t.chars[cid].captive=true;negatives.push(read(t,audience,moment,{realmId:rid}));
      t=clone();delete t.authority.governments[rid];negatives.push(read(t,audience,current));
      // Missing or conflicting selectors reject through the typed reader schema.
      const malformed=[{}, {realmId:rid,following:'current'}, {following:'nearest'}, {following:'moment',extra:true}]
        .map(function (args) {return FB.eventStateReaders.faults([{reader:audience,args:args}],'calls').length>0;});
      let departed=null;
      if (input.role!=='household') {
        t=clone();M.row(t,rid).members.find(function (m) {return m.principal.id===cid;}).allegiance=false;
        departed=[read(t,'mobile_coalition_member',explicit),read(t,'mobile_coalition_member',current),
          read(t,'mobile_camp_household',current)];
        t=clone();M.row(t,rid).members=M.row(t,rid).members.filter(function (m) {return m.principal.id!==cid;});
        departed.push(read(t,'mobile_coalition_member',moment,{realmId:rid}));
      }
      // A second real following at the same household locality makes current ambiguous.
      // Detached staging reuses its canonical row/migration, without installing state.
      t=clone();const other='other_following';
      t.realms[other]=JSON.parse(JSON.stringify(t.realms[rid]));
      t.authority.governments[other]=JSON.parse(JSON.stringify(t.authority.governments[rid]));
      const migration=JSON.parse(JSON.stringify(M.migration(t,rid)));
      migration.id='other_migration';migration.realmId=other;t.authority.migrations.push(migration);
      M.row(t,other).migrationId=migration.id;
      const ambiguous=read(t,audience,current),selected=read(t,audience,moment,{realmId:rid});
      const explicitSelected=read(t,audience,explicit);
      // Ordinary residence gives conversation only, even with different identities.
      t=clone();t.player.charId='ordinary_resident';
      t.chars.ordinary_resident={id:'ordinary_resident',name:'Resident',born:t.date.year-24,sex:'f',culture:'frankish',religion:'catholic'};
      const resident=read(t,'mobile_camp_household',current),notPrincipal=read(t,'mobile_coalition_member',explicit);
      const noAuthority=read(t,'mobile_role',{realmId:rid,role:'leader'});
      let away=JSON.parse(JSON.stringify(t));away.player.provinceId='elsewhere';
      const unrelated=read(away,'mobile_camp_household',explicit);
      away=JSON.parse(JSON.stringify(t));away.chars.ordinary_resident.householdResidenceId=Object.keys(FB.world.byId).find(function (id) {return id!==M.migration(away,rid).at;});
      const visitor=read(away,'mobile_camp_household',explicit);
      away=JSON.parse(JSON.stringify(t));M.migration(away,rid).status='failed';
      const failedCamp=read(away,'mobile_camp_household',explicit);
      away=JSON.parse(JSON.stringify(t));const host=M.host(away,rid);
      host.mobileCourt=true;host.moveLeft=1;
      const moving=read(away,'mobile_camp_household',explicit);
      away=JSON.parse(JSON.stringify(t));M.row(away,rid).camps={schema:1,entries:[]};
      const dispersedCamp=read(away,'mobile_camp_household',explicit);
      away=JSON.parse(JSON.stringify(t));away.authority.migrations=[];
      const missingCamp=read(away,'mobile_camp_household',explicit);
      away=JSON.parse(JSON.stringify(t));away.armies=away.armies.filter(function (a) {return a.id!==M.migration(away,rid).hostId;});
      const survivingCamp=read(away,'mobile_camp_household',explicit);
      const moments=[];
      if (input.role!=='household') {
        const m=M.migration(s,rid),h=M.host(s,rid),member=r.members[0];
        [
          ['coalition_leader_selected','mobile_life_new_leader',{realmId:rid,characterId:r.leaderId,formerCharacterId:null}],
          ['coalition_member_joined','mobile_life_new_member',{realmId:rid,memberId:member.id,characterId:member.principal.id}],
          ['coalition_member_departed','mobile_life_departed_member',{realmId:rid,memberId:member.id,characterId:member.principal.id}],
          ['camp_arrived','mobile_life_camp_checkpoint',{realmId:rid,migrationId:m.id,hostId:h.id,fromProvinceId:m.at,locationId:m.at}],
          ['field_host_lost','mobile_life_lost_host',{realmId:rid,hostId:h.id}],
          ['access_expired','mobile_life_ended_access',{realmId:rid,agreementId:'ended_access',partnerRealmId:'outside_court'}]
        ].forEach(function (row) {
          const local=clone(),queued=FB.queueLifecycleEvents(local,row[0],row[2]);
          const item=queued.find(function (v) {return v.id===row[1];});
          const foreign=clone(),ctx=Object.assign({},row[2],{realmId:'unrelated_following'});
          const wrong=FB.queueLifecycleEvents(foreign,row[0],ctx).some(function (v) {return v.id===row[1];});
          const stale=clone();M.row(stale,rid).status='settled';
          moments.push({queued:!!item,wrong:wrong,valid:!!item && FB.eventContextStillValid(local,FB.eventById(row[1]),item.ctx),
            stale:!!item && FB.eventContextStillValid(stale,FB.eventById(row[1]),item.ctx)});
        });
      }
      const pure=original===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      return {projected:projected,scarcity:scarcity,available:available,absent:absent,negatives:negatives,malformed:malformed,
        departed:departed,ambiguous:ambiguous,selected:selected,explicitSelected:explicitSelected,
        moments:moments,allReadsPure:allReadsPure,resident:resident,notPrincipal:notPrincipal,noAuthority:noAuthority,unrelated:unrelated,visitor:visitor,
        failedCamp:failedCamp,dispersedCamp:dispersedCamp,missingCamp:missingCamp,moving:moving,survivingCamp:survivingCamp,pure:pure,count:pack.length,
        leader:r.leaderId===cid};
    },{kind:kind,role:role});
    const facts={member:role!=='household',leader:role==='leader',nonleader:role==='member',
      household:role==='household',explicitRole:role!=='household',explicit:true,moment:true};
    expect(result.projected).toEqual([facts,facts,facts]);
    expect(result.scarcity).toEqual([true,true,true,false]);
    expect(result.absent).toEqual([false,false,false]);
    expect(result.negatives).toEqual(Array(6).fill(false));
    expect(result.malformed).toEqual(Array(4).fill(true));
    expect(result.departed).toEqual(role==='household' ? null : Array(4).fill(false));
    expect(result).toMatchObject({count:24,ambiguous:false,selected:true,explicitSelected:true,resident:true,
      notPrincipal:false,noAuthority:false,unrelated:false,visitor:false,failedCamp:false,moving:false,
      dispersedCamp:false,missingCamp:false,survivingCamp:true,pure:true,allReadsPure:true});
    expect(result.moments).toEqual(role==='household' ? [] : Array(6).fill({queued:true,wrong:false,valid:true,stale:false}));
    const audiences={
      leader:['larger_share','court_hire','court_gift','held_ground','subject_test','town_trade','town_gate','settlement_question','service_argument'],
      member:['member_share','member_voice','member_envoy','member_settlement','share_argument'],
      household:['ration_account','scarcity_witness','scarcity_rumor','scarcity_rest']
    };
    expect(result.available).toEqual(audiences[role].map(function (id) {return 'mobile_life_'+id;}));
  });
}
