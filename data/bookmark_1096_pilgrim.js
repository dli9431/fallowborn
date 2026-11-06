FB.bookmarkSources.stage({"source":"data/bookmark_1096_pilgrim.js","bookmarks":["1096"],"catalogs":["mobileProfiles"],"shared":[]}, function (FBDATA) {
/* Independent, initially unfunded preparations. Counts and ages are simulation choices. */
FBDATA.mobileProfiles_pilgrim_1096 = {
  peter_following_1096:{minAge:18,threshold:0.6,maxMembers:1,maxAgreements:12,
    recruitShare:0.5,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:1080,accessPrice:2,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:[],members:[{id:'peter_people',weight:1,pledge:0.4,population:600}],
    supplyPolicy:{schema:1,targetDays:14,carryDays:30,cashReserve:0}},
  walter_following_1096:{minAge:18,threshold:0.6,maxMembers:1,maxAgreements:12,
    recruitShare:0.5,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:720,accessPrice:3,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:[],members:[{id:'walter_people',weight:1,pledge:0.5,population:320}],
    supplyPolicy:{schema:1,targetDays:14,carryDays:30,cashReserve:0}}
};
FBDATA.bookmarkRevisionContent_1096_pilgrim = {
  bookmarkId:'1096',revision:'pilgrim_followings_v1',
  realms:[
    {id:'peter_following_1096',name:'Peter’s following',capital:'cologne',color:'#a98a56',aggression:0,
      rank:1,government:'hosted_following',religion:'catholic',culture:'frankish',nonTerritorial:true,
      ruler:{name:'Peter the Hermit',sex:'m',born:1050,culture:'frankish',mar:4,trait:'zealous'},
      mobile:{profileId:'peter_following_1096',patronRealmId:null,origin:'cologne',target:'constantinople',
        food:0,fighters:240,treasury:0,preparationId:'peter_preparation_1096',
        opening:{principals:[{memberId:'peter_people',person:{kind:'realm_ruler',actorId:'pilgrim_peter_1096',realmId:'peter_following_1096',generation:1}}],
          leaderMemberId:'peter_people',muster:[{memberId:'peter_people',unitId:'levy',count:240}]},
        command:{id:'peter_command_1096',superior:null,operations:['recruit','demuster','move','march','offer','accept','work','trade','pledge','leave']},
        funding:{schema:1,publicGrants:true,privateContributions:true,maximum:250},sponsorship:{schema:1,kind:'independent'}}},
    {id:'walter_following_1096',name:'Walter’s following',capital:'cologne',color:'#899a72',aggression:0,
      rank:1,government:'hosted_following',religion:'catholic',culture:'frankish',nonTerritorial:true,
      ruler:{name:'Walter Sans Avoir',sex:'m',born:1060,culture:'frankish',mar:6,trait:'patient'},
      mobile:{profileId:'walter_following_1096',patronRealmId:null,origin:'cologne',target:'constantinople',
        food:0,fighters:160,treasury:0,preparationId:'walter_preparation_1096',
        opening:{principals:[{memberId:'walter_people',person:{kind:'realm_ruler',actorId:'pilgrim_walter_1096',realmId:'walter_following_1096',generation:1}}],
          leaderMemberId:'walter_people',muster:[{memberId:'walter_people',unitId:'levy',count:160}]},
        command:{id:'walter_command_1096',superior:null,operations:['recruit','demuster','move','march','offer','accept','work','trade','pledge','leave']},
        funding:{schema:1,publicGrants:true,privateContributions:true,maximum:250},sponsorship:{schema:1,kind:'independent'}}}
  ]
};
(function () {
  'use strict';
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  var b=FBDATA.bookmarks['1096'],prior=Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]),
    opening=copy(prior.opening),revisions=copy(prior.openingRevisions),
    realms=copy(FBDATA.bookmarkRevisionContent_1096_pilgrim.realms),
    policies=copy(prior.homeAuthorityPolicies || {}),passage=copy(prior.localPassagePolicies || {}),
    overrides=copy(prior.startTrackOverrides || {schema:1,entries:{}});
  var counties=['cologne','frankfurt','wurzburg','nurnberg','regensburg','passau','linz','wien','moson','szekesfehervar','sirmium','vidin','serdica','philippopolis','adrianople','constantinople'];
  var waypoints=['regensburg','wien','sirmium','serdica','philippopolis','adrianople','constantinople'];
  realms.forEach(function (d,index) {
    var prefix=index ? 'walter' : 'peter',member=prefix+'_people',profile=FBDATA.mobileProfiles_pilgrim_1096[d.id];
    opening.actors['pilgrim_'+prefix+'_1096']={name:d.ruler.name,sex:d.ruler.sex,born:d.ruler.born,
      culture:d.culture,religion:d.religion,station:1,role:'commander',home:'cologne',skills:{mar:d.ruler.mar}};
    function step(id,adapter,terms,after) {
      return {id:id,after:after || [],window:{startTurn:0,endTurn:1440},columnId:null,adapter:adapter,terms:terms,
        requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:[member],access:{mode:'camp',countyIds:[]}}};
    }
    d.mobile.expeditionProgram={schema:1,id:prefix+'_route_1096',commandId:prefix+'_command_1096',steps:[
      step('permission','corridor_access',{countyIds:counties.slice(),capacity:index ? 320 : 600,allowRecruit:false,price:profile.accessPrice,duration:profile.accessDays}),
      step('field_route','route',{mode:'field',waypoints:waypoints.slice()},['permission']),
      step('camp_route','route',{mode:'camp',waypoints:waypoints.slice()},['permission']),
      step('provisions','supply',{action:'trade'}),step('wait','wait',{},['field_route','camp_route'])
    ]};
  });
  Object.assign(FBDATA.mobileProfiles,FBDATA.mobileProfiles_pilgrim_1096);
  policies.territorial={schema:1,presence:'capital',delegation:true};
  passage.territorial={schema:1,response:'accept'};
  passage.administrative_monarchy={schema:1,response:'accept'};
  revisions.pilgrim_followings_v1=opening;
  var tracks=['pilgrim_household_track_1096','opening_pilgrim_1096','pilgrim_following_track_1096',
    'pilgrim_peter_admission_1096','pilgrim_walter_admission_1096','pilgrim_peter_party_1096','pilgrim_walter_party_1096'],locations={};
  tracks.forEach(function (id) {locations[id]=['cologne'];});
  overrides.entries.pilgrim_household_1096={tracks:tracks,trackLocations:locations};
  b.revisions.pilgrim_followings_v1=Object.assign({},b.revisions.baseline,b.revisions[b.revision],{
    realms:copy(prior.realms).concat(realms),opening:opening,openingRevision:'pilgrim_followings_v1',openingRevisions:revisions,
    homeAuthorityPolicies:policies,localPassagePolicies:passage,startTrackOverrides:overrides,
    stories:prior.stories.concat(['peter_preparation_1096','peter_program_1096','walter_preparation_1096','walter_program_1096'])
  });
  b.revision='pilgrim_followings_v1';
})();
});
