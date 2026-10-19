/* A fresh operational world. Earlier revisions retain their own opening,
   people, layout and absent mobile records. Quantities and positions are
   disclosed abstractions in docs/research/1241-bookmark.md. */
(function () {
  'use strict';
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  var b=FBDATA.bookmarks['1241'];
  var source=Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]);
  var realms=copy(source.realms), opening=copy(source.opening);
  var layouts=copy(FBDATA.settlementLayouts[source.settlementLayout]);

  /* Named principals use their authored identities. Inherited names for
     subsequently generated people are a broad steppe presentation proxy. */
  FBDATA.cultures.mongol_1241={name:'Mongol',parent:'turkic',dyn:'of_place',
    male:['Batu','Subutai','Orda','Baidar','Qadan','Shiban']};
  FBDATA.mobileProfiles.western_command_1241={
    minAge:18,threshold:0.6,maxMembers:8,maxAgreements:8,
    recruitShare:0.4,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:90,accessPrice:4,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:['volodymyr','krakow','cluj','gyula'],
    supplyPolicy:{targetDays:30,carryDays:30,cashReserve:48,
      replacement:{targetMen:2400,maxPerReview:80,unitIds:['horsearcher','cav']}},
    members:[
      {id:'batu_people',weight:4,pledge:0.3,population:4000},
      {id:'subutai_people',weight:1,pledge:0.2,population:1000},
      {id:'baidar_people',weight:2,pledge:0.4,population:1500},
      {id:'qadan_people',weight:2,pledge:0.4,population:1000},
      {id:'shiban_people',weight:1,pledge:0.4,population:500}
    ]};
  FBDATA.mobileProfiles.koten_households_1241={
    minAge:18,threshold:0.6,maxMembers:4,maxAgreements:8,
    recruitShare:0.2,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:180,accessPrice:4,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:['szekesfehervar'],
    members:[{id:'koten_people',weight:1,pledge:0.2,population:2400}]};

  function actor(id,name,born,culture,religion,home,mar) {
    opening.actors[id]={name:name,sex:'m',born:born,culture:culture,religion:religion,
      station:1,role:'commander',home:home,skills:{mar:mar}};
  }
  actor('batu_1241','Batu',1205,'mongol_1241','tengri','volodymyr',8);
  actor('subutai_1241','Subutai',1176,'mongol_1241','tengri','volodymyr',9);
  actor('baidar_1241','Baidar',1200,'mongol_1241','tengri','volodymyr',7);
  actor('qadan_1241','Qadan',1206,'mongol_1241','tengri','volodymyr',7);
  actor('shiban_1241','Shiban',1208,'mongol_1241','tengri','volodymyr',6);
  actor('koten_1241','Koten',1180,'turkic','catholic','szekesfehervar',6);
  ['volhynia_local','silesia','hungary'].forEach(function (id) {
    opening.actors[id+'_ruler_operations_1241']={ref:{kind:'realm_ruler',realmId:id+'_1241'}};
  });
  function principal(member,id) {return {memberId:member,person:{kind:'opening_actor',actorId:id}};}
  function muster(member,horse,cav) {return [
    {memberId:member,unitId:'horsearcher',count:horse},{memberId:member,unitId:'cav',count:cav}];}
  var main=muster('batu_people',900,300), north=muster('baidar_people',450,150);
  var east=muster('qadan_people',300,100), southeast=muster('shiban_people',150,50);
  function column(id,member,county,food,roster) {
    return {id:id,commanderMemberId:member,openingLocation:{countyId:county},food:food,muster:roster};
  }
  function campaign(id,realm,target,columns) {
    return {id:id,opponent:{kind:'realm_ruler',realmId:realm+'_1241',
      actorId:realm+'_ruler_operations_1241',generation:1},target:target,columnIds:columns};
  }
  function step(id,columnId,after,adapter,terms,start,end,member,access) {
    return {id:id,columnId:columnId,after:after,adapter:adapter,terms:terms,
      window:{startTurn:start,endTurn:end},requirements:{minMen:1,minFood:1,minTreasury:0,
        memberIds:[member],access:{mode:'field',countyIds:access}}};
  }
  realms.push({id:'mongol_western_command_1241',name:'Western Mongol command',
    capital:'volodymyr',color:'#9a7848',rank:2,government:'expedition_command',
    religion:'tengri',culture:'mongol_1241',aggression:0,nonTerritorial:true,
    ruler:{name:'Batu',sex:'m',born:1205,culture:'mongol_1241',mar:8,trait:'patient'},
    mobile:{profileId:'western_command_1241',patronRealmId:null,
      sponsorship:{schema:1,kind:'independent'},origin:'volodymyr',target:'cluj',
      food:7200,fighters:2400,
      /* Rank-two ordinary opening account: 20. This one credit brings the
         existing account to 552; the 48 equipment allocation is not replayed. */
      treasury:532,
      opening:{principals:[principal('batu_people','batu_1241'),principal('subutai_people','subutai_1241'),
        principal('baidar_people','baidar_1241'),principal('qadan_people','qadan_1241'),principal('shiban_people','shiban_1241')],
        leaderMemberId:'batu_people',muster:main.concat(north,east,southeast),
        reserves:[{memberId:'batu_people',count:400},{memberId:'subutai_people',count:200},
          {memberId:'baidar_people',count:100},{memberId:'qadan_people',count:80},{memberId:'shiban_people',count:20}]},
      command:{id:'western_commission_1241',superior:{kind:'external_authority',
        id:'ogodei_superior_1241',name:'Ogodei',generation:1,endTurn:720},
        operations:['recruit','demuster','march','war','peace','move','offer','accept','trade','pledge','leave','settle']},
      columns:{schema:1,entries:[column('main','batu_people','volodymyr',360,main),
        column('north','baidar_people','krakow',180,north),column('east','qadan_people','cluj',120,east),
        column('southeast','shiban_people','gyula',60,southeast)]},
      openingCampaigns:{schema:1,entries:[campaign('volhynian_front','volhynia_local','volodymyr',['main']),
        campaign('polish_front','silesia','krakow',['north']),campaign('hungarian_front','hungary','cluj',['east','southeast'])]},
      expeditionProgram:{schema:1,id:'western_operations_1241',commandId:'western_commission_1241',steps:[
        step('main_review','main',[],'wait',{},1,30,'batu_people',[]),
        step('north_review','north',[],'wait',{},1,30,'baidar_people',[]),
        step('east_review','east',[],'wait',{},1,30,'qadan_people',[]),
        step('southeast_review','southeast',[],'wait',{},1,30,'shiban_people',[]),
        step('main_supply','main',['main_review'],'supply',{action:'load'},2,180,'batu_people',[]),
        step('north_supply','north',['north_review'],'supply',{action:'trade'},2,180,'baidar_people',[]),
        step('east_supply','east',['east_review'],'supply',{action:'trade'},2,180,'qadan_people',[]),
        step('southeast_supply','southeast',['southeast_review'],'supply',{action:'trade'},2,180,'shiban_people',[]),
        step('main_approach','main',['main_review'],'route',{mode:'field',waypoints:['cluj']},2,180,'batu_people',['cluj']),
        step('north_return','north',['north_review'],'route',{mode:'field',waypoints:['volodymyr']},2,180,'baidar_people',['volodymyr']),
        step('east_connection','east',['east_review'],'route',{mode:'field',waypoints:['gyula']},2,180,'qadan_people',['gyula']),
        step('southeast_connection','southeast',['southeast_review'],'route',{mode:'field',waypoints:['cluj']},2,180,'shiban_people',['cluj'])
      ]}}});

  /* Distinct fictional rural localities inside the directly held crown cell.
     A curated site records provenance, not sub-county travel simulation. */
  FBDATA.settlementSites.cuman_west_camp_1241={x:18.55,y:47.20};
  FBDATA.settlementSites.cuman_east_camp_1241={x:18.85,y:47.17};
  /* Seven inherited slots plus two camps exceed the ordinary eight-slot cap.
     Omit the last modern fill presentation before adding either camp. */
  layouts.szekesfehervar=layouts.szekesfehervar.filter(function (entry) {
    return entry.site!=='geo_erd_3053281';
  });
  layouts.szekesfehervar.push({site:'cuman_west_camp_1241',name:'Western Cuman camp',kind:'village'},
    {site:'cuman_east_camp_1241',name:'Eastern Cuman camp',kind:'village'});
  realms.push({id:'koten_following_1241',name:'Koten’s following',capital:'szekesfehervar',
    color:'#998956',rank:2,government:'hosted_following',religion:'tengri',culture:'turkic',
    aggression:0,nonTerritorial:true,
    ruler:{name:'Koten',sex:'m',born:1180,culture:'turkic',mar:6,trait:'patient'},
    mobile:{profileId:'koten_households_1241',patronRealmId:'hungary_1241',origin:'szekesfehervar',target:'szekesfehervar',
      food:2160,fighters:240,treasury:100,
      opening:{principals:[principal('koten_people','koten_1241')],leaderMemberId:'koten_people',
        muster:[{memberId:'koten_people',unitId:'horsearcher',count:180},{memberId:'koten_people',unitId:'cav',count:60}]},
      command:{id:'koten_mandate_1241',superior:null,
        operations:['march','peace','offer','accept','work','trade','pledge','settle']},
      hostedAccess:{id:'hungarian_hosting',partnerRealmId:'hungary_1241',partnerActorId:'hungary_ruler_operations_1241',
        countyIds:['szekesfehervar'],capacity:2400,allowRecruit:false,duration:180},
      guardedParty:{schema:1,id:'koten_personal_party',kind:'protective_guard',
        location:{countyId:'szekesfehervar',siteId:'geo_obuda_3054643'},hostRealmId:'hungary_1241',
        hostActorId:'hungary_ruler_operations_1241',actorIds:['koten_1241'],duration:90,release:'host_review'},
      civilianCamps:{schema:1,fieldFood:72,entries:[
        {id:'western_households',countyId:'szekesfehervar',siteId:'cuman_west_camp_1241',food:1044,
          members:[{memberId:'koten_people',civilians:960,reserve:120}]},
        {id:'eastern_households',countyId:'szekesfehervar',siteId:'cuman_east_camp_1241',food:1044,
          members:[{memberId:'koten_people',civilians:960,reserve:120}]}
      ]}}});

  var revision='operations_v2', layoutId='1241_operations_v2';
  FBDATA.settlementLayouts[layoutId]=layouts;
  var openingRevisions=copy(source.openingRevisions);
  openingRevisions[revision]=copy(opening);
  b.revisions[revision]={realms:realms,starts:copy(source.starts),startLocations:copy(source.startLocations),
    settlementLayout:layoutId,opening:opening,openingRevision:revision,openingRevisions:openingRevisions};
  b.revision=revision;
})();
