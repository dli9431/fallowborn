/* Optional formations retain the existing home rulers and their lawful lieges. */
window.FBDATA = window.FBDATA || {};
FBDATA.mobileProfiles_western_1096 = {
  godfrey_following_1096:{minAge:18,threshold:0.6,maxMembers:1,maxAgreements:12,
    recruitShare:0.5,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:360,accessPrice:4,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:[],members:[{id:'godfrey_people',weight:1,pledge:0.5,population:640}],
    supplyPolicy:{schema:1,targetDays:14,carryDays:14,cashReserve:0}},
  raymond_following_1096:{minAge:18,threshold:0.6,maxMembers:1,maxAgreements:12,
    recruitShare:0.5,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:360,accessPrice:4,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:[],members:[{id:'raymond_people',weight:1,pledge:0.4,population:800}],
    supplyPolicy:{schema:1,targetDays:14,carryDays:14,cashReserve:0}},
  bohemond_following_1096:{minAge:18,threshold:0.6,maxMembers:1,maxAgreements:12,
    recruitShare:0.5,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:360,accessPrice:4,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:[],members:[{id:'bohemond_people',weight:1,pledge:0.5,population:480}],
    supplyPolicy:{schema:1,targetDays:14,carryDays:14,cashReserve:0}}
};
Object.assign(FBDATA.mobileProfiles,FBDATA.mobileProfiles_western_1096);

FBDATA.bookmarkRevisionContent_1096_western = {
  bookmarkId:'1096',revision:'western_expeditions_v1',
  realms:[
    {id:'godfrey_host_1096',name:'Godfrey’s following',capital:'verdun',color:'#b7a45c',aggression:0,
      rank:1,government:'hosted_following',religion:'catholic',culture:'frankish',nonTerritorial:true,
      mobile:{profileId:'godfrey_following_1096',patronRealmId:null,origin:'verdun',target:'trier',
        food:0,fighters:320,treasury:0,preparationId:'godfrey_preparation_1096',
        opening:{principals:[{memberId:'godfrey_people',person:{kind:'realm_ruler',
          actorId:'western_godfrey_1096',realmId:'lower_lotharingia_1096',generation:1}}],
          leaderMemberId:'godfrey_people',muster:[{memberId:'godfrey_people',unitId:'levy',count:320}]},
        command:{id:'godfrey_command_1096',superior:null,
          operations:['recruit','demuster','move','march','offer','accept','work','trade','pledge','leave'],
          landedCommandLink:{schema:1,actorId:'western_godfrey_1096',homeRealmId:'lower_lotharingia_1096',homeGeneration:1,endTurn:720}},
        funding:{schema:1,publicGrants:true,privateContributions:true,maximum:250},
        sponsorship:{schema:1,kind:'independent'},
        expeditionProgram:{schema:1,id:'godfrey_route_1096',commandId:'godfrey_command_1096',steps:[
          {id:'local_permission',after:[],window:{startTurn:0,endTurn:720},columnId:null,adapter:'local_access',
            terms:{countyIds:['verdun','luxembourg','metz','trier'],capacity:640,allowRecruit:false,price:1,duration:360},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['godfrey_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'first_leg',after:['local_permission'],window:{startTurn:0,endTurn:720},columnId:null,adapter:'route',
            terms:{mode:'camp',waypoints:['trier']},
            requirements:{minMen:1,minFood:1,minTreasury:0,memberIds:['godfrey_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'provisions',after:[],window:{startTurn:0,endTurn:720},columnId:null,adapter:'supply',terms:{action:'trade'},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['godfrey_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'review_onward',after:['first_leg'],window:{startTurn:0,endTurn:720},columnId:null,adapter:'wait',terms:{},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['godfrey_people'],access:{mode:'camp',countyIds:[]}}}
        ]}}},
    {id:'raymond_host_1096',name:'Raymond’s following',capital:'toulouse',color:'#c18456',aggression:0,
      rank:1,government:'hosted_following',religion:'catholic',culture:'occitan',nonTerritorial:true,
      mobile:{profileId:'raymond_following_1096',patronRealmId:null,origin:'toulouse',target:'narbonne',
        food:0,fighters:320,treasury:0,preparationId:'raymond_preparation_1096',
        opening:{principals:[{memberId:'raymond_people',person:{kind:'realm_ruler',
          actorId:'western_raymond_1096',realmId:'toulouse_1096',generation:1}}],
          leaderMemberId:'raymond_people',muster:[{memberId:'raymond_people',unitId:'levy',count:320}]},
        command:{id:'raymond_command_1096',superior:null,
          operations:['recruit','demuster','move','march','offer','accept','work','trade','pledge','leave'],
          landedCommandLink:{schema:1,actorId:'western_raymond_1096',homeRealmId:'toulouse_1096',homeGeneration:1,endTurn:720}},
        funding:{schema:1,publicGrants:true,privateContributions:true,maximum:250},
        sponsorship:{schema:1,kind:'independent'},
        expeditionProgram:{schema:1,id:'raymond_route_1096',commandId:'raymond_command_1096',steps:[
          {id:'local_permission',after:[],window:{startTurn:0,endTurn:720},columnId:null,adapter:'local_access',
            terms:{countyIds:['toulouse','carcassonne','narbonne'],capacity:800,allowRecruit:false,price:1,duration:360},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['raymond_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'first_leg',after:['local_permission'],window:{startTurn:0,endTurn:720},columnId:null,adapter:'route',
            terms:{mode:'camp',waypoints:['narbonne']},
            requirements:{minMen:1,minFood:1,minTreasury:0,memberIds:['raymond_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'provisions',after:[],window:{startTurn:0,endTurn:720},columnId:null,adapter:'supply',terms:{action:'trade'},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['raymond_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'review_onward',after:['first_leg'],window:{startTurn:0,endTurn:720},columnId:null,adapter:'wait',terms:{},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['raymond_people'],access:{mode:'camp',countyIds:[]}}}
        ]}}},
    {id:'bohemond_host_1096',name:'Bohemond’s following',capital:'taranto',color:'#8b9cba',aggression:0,
      rank:1,government:'hosted_following',religion:'catholic',culture:'norman',nonTerritorial:true,
      mobile:{profileId:'bohemond_following_1096',patronRealmId:null,origin:'taranto',target:'bari',
        food:0,fighters:240,treasury:0,preparationId:'bohemond_preparation_1096',
        opening:{principals:[{memberId:'bohemond_people',person:{kind:'realm_ruler',
          actorId:'western_bohemond_1096',realmId:'bohemond_lordships_1096',generation:1}}],
          leaderMemberId:'bohemond_people',muster:[{memberId:'bohemond_people',unitId:'levy',count:240}]},
        command:{id:'bohemond_command_1096',superior:null,
          operations:['recruit','demuster','move','march','offer','accept','work','trade','pledge','leave'],
          landedCommandLink:{schema:1,actorId:'western_bohemond_1096',homeRealmId:'bohemond_lordships_1096',homeGeneration:1,endTurn:720}},
        funding:{schema:1,publicGrants:true,privateContributions:true,maximum:250},
        sponsorship:{schema:1,kind:'independent'},
        expeditionProgram:{schema:1,id:'bohemond_route_1096',commandId:'bohemond_command_1096',steps:[
          {id:'local_permission',after:[],window:{startTurn:0,endTurn:720},columnId:null,adapter:'local_access',
            terms:{countyIds:['taranto','brindisi','bari'],capacity:480,allowRecruit:false,price:1,duration:360},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['bohemond_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'first_leg',after:['local_permission'],window:{startTurn:0,endTurn:720},columnId:null,adapter:'route',
            terms:{mode:'camp',waypoints:['bari']},
            requirements:{minMen:1,minFood:1,minTreasury:0,memberIds:['bohemond_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'provisions',after:[],window:{startTurn:0,endTurn:720},columnId:null,adapter:'supply',terms:{action:'trade'},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['bohemond_people'],access:{mode:'camp',countyIds:[]}}},
          {id:'review_onward',after:['first_leg'],window:{startTurn:0,endTurn:720},columnId:null,adapter:'wait',terms:{},
            requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:['bohemond_people'],access:{mode:'camp',countyIds:[]}}}
        ]}}}
  ]
};

(function () {
  'use strict';
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  var b=FBDATA.bookmarks['1096'],prior=Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]),
    content=FBDATA.bookmarkRevisionContent_1096_western,revisions=copy(prior.openingRevisions),
    opening=copy(typeof prior.opening==='string' ? revisions[prior.opening] : prior.opening),
    realms=copy(prior.realms),policies=copy(prior.homeAuthorityPolicies || {});
  function rulerActor(home,preferred) {
    var found=Object.keys(opening.actors).filter(function (id) {
      var a=opening.actors[id];return a.ref && a.ref.kind==='realm_ruler' && a.ref.realmId===home;
    })[0];
    if (found) return found;
    if (opening.actors[preferred]) throw new Error('Conflicting opening actor '+preferred+'.');
    opening.actors[preferred]={ref:{kind:'realm_ruler',realmId:home}};return preferred;
  }
  copy(content.realms).forEach(function (d) {
    var link=d.mobile.command.landedCommandLink,actor=rulerActor(link.homeRealmId,link.actorId),
      home=realms.filter(function (r) {return r.id===link.homeRealmId;})[0];
    if (!home) throw new Error('Missing expedition home '+link.homeRealmId+'.');
    home.publicTreasury={schema:1};
    link.actorId=actor;d.mobile.opening.principals[0].person.actorId=actor;
    realms.push(d);
  });
  /* The existing imperial person remains available to the original-party review. */
  rulerActor('byzantium_1096','western_alexios_1096');
  revisions.western_expeditions_v1=opening;
  policies.territorial={schema:1,presence:'capital',delegation:true};
  b.revisions.western_expeditions_v1=Object.assign({},b.revisions.baseline,b.revisions[b.revision],{
    realms:realms,opening:opening,openingRevision:'western_expeditions_v1',openingRevisions:revisions,
    homeAuthorityPolicies:policies,startLocations:Object.assign({},b.startLocations,prior.startLocations),
    stories:prior.stories.concat(Object.keys(FBDATA.storyExpeditions_western_1096))
  });
  b.revision='western_expeditions_v1';
})();
