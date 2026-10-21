'use strict';

// This leaf is used only by danube-corridor.spec.js. All game calls execute
// in the browser. The ordinary Mods picker publishes the serialized result.
function buildCorridorMod(input) {
  const c=input.configuration, copy=function (v) {return JSON.parse(JSON.stringify(v));};
  const base=copy(FBDATA.bookmarks['1096']), effective=copy(FB.bookmark('1096'));
  const rid='route_review_'+c.id, actorId=rid+'_leader', profileId=rid+'_profile', memberId='travellers';
  const opening=copy(effective.opening);
  opening.actors[actorId]={name:'Route reviewer '+c.id,sex:'m',born:1066,culture:'german',religion:'catholic',
    station:1,role:'commander',home:'cologne',skills:{mar:6}};
  const requirements=function () {return {minMen:1,minFood:0,minTreasury:0,memberIds:[memberId],access:{mode:'camp',countyIds:[]}};};
  const step=function (id,adapter,terms,after) {return {id:id,after:after || [],window:{startTurn:0,endTurn:c.horizon},
    columnId:null,adapter:adapter,terms:terms,requirements:requirements()};};
  const counties=input.countyIds || ['cologne'];
  // Never trim an over-bound set to make validation pass. The bootstrap import
  // has only local Cologne terms and is never permission for onward movement.
  const permissions=[];
  for (let i=0;i<counties.length;i+=16) permissions.push(step('permission_'+permissions.length,'local_access',{
    countyIds:counties.slice(i,i+16),capacity:c.capacity,allowRecruit:false,price:c.price,duration:c.duration}));
  const after=permissions.map(function (s) {return s.id;});
  const program={schema:1,id:rid+'_route',commandId:rid+'_command',steps:permissions.concat([
    step('field_route','route',{mode:'field',waypoints:c.waypoints.slice()},after),
    step('camp_route','route',{mode:'camp',waypoints:c.waypoints.slice()},after),
    step('provisions','supply',{action:'trade'}),step('wait','wait',{},['field_route','camp_route'])])};
  const profile={minAge:18,threshold:0.6,maxMembers:1,maxAgreements:12,recruitShare:0.5,recruitCost:0.02,
    foodPerPerson:0.01,pasturePerPerson:1.8,accessDays:c.duration,accessPrice:c.price,starvationShare:0.001,
    defeatShare:0.02,settlementForm:'regnum',regions:[],members:[{id:memberId,weight:1,
      pledge:c.fighters/(c.fighters+c.civilians),population:c.fighters+c.civilians}],
    supplyPolicy:{schema:1,targetDays:c.rationDays,carryDays:c.rationDays,cashReserve:0}};
  const mobile={profileId:profileId,patronRealmId:null,origin:'cologne',target:'constantinople',
    food:Math.ceil((c.fighters+c.civilians)*profile.foodPerPerson*c.rationDays),fighters:c.fighters,treasury:c.treasury,
    opening:{principals:[{memberId:memberId,person:{kind:'realm_ruler',actorId:actorId,realmId:rid,generation:1}}],
      leaderMemberId:memberId,muster:[{memberId:memberId,unitId:'levy',count:c.fighters}]},
    command:{id:program.commandId,superior:null,operations:['recruit','demuster','move','march','offer','accept','trade','pledge','leave']},
    sponsorship:{schema:1,kind:'independent'},expeditionProgram:program};
  const realm={id:rid,name:'Route review '+c.id,capital:'cologne',color:'#99743d',aggression:0,rank:1,
    government:'hosted_following',religion:'catholic',culture:'german',nonTerritorial:true,
    ruler:{name:opening.actors[actorId].name,sex:'m',born:1066,culture:'german',mar:6,trait:'patient'},mobile:mobile};
  // A new whole-field revision retains every existing saved world and actor.
  // No county, holder strategy, court, fort or historical story is rewritten.
  const revision={};
  Object.keys(base.revisions.baseline).concat(Object.keys(base.revisions[base.revision])).forEach(function (key) {
    revision[key]=copy(effective[key]);
  });
  revision.realms=copy(effective.realms).filter(function (d) {return d.id!==rid;}).concat([realm]);revision.opening=opening;
  revision.openingRevision='route_review_v1';revision.openingRevisions=copy(effective.openingRevisions);
  revision.openingRevisions.route_review_v1=opening;
  revision.localPassagePolicies=copy(c.policies);
  base.revisions.route_review_v1=revision;base.revision='route_review_v1';
  const mod={name:'Danube route review '+c.id,bookmarks:{'1096':base},mobileProfiles:{}};
  mod.mobileProfiles[profileId]=profile;
  return mod;
}

function installCorridorCase(c) {
  const copy=function (v) {return JSON.parse(JSON.stringify(v));};
  const C=window.corridorCase={configuration:c,rid:'route_review_'+c.id};
  C.definition=function (s) {return FB.campaignBookmark(s).realms.find(function (d) {return d.id===C.rid;});};
  C.row=function (s) {return FB.mobile.row(s,C.rid);};
  C.atTurn=function (s,turn) {const date=FB.dateAtTurn(s,turn);s.turn=turn;s.date=date;};
  C.next=function (s) {C.atTurn(s,s.turn+1);};
  C.permissionSteps=function (s) {return C.definition(s).mobile.expeditionProgram.steps.filter(function (a) {return a.adapter==='local_access';});};
  C.control=function (s,action) {return FB.expeditionPrograms.reviewControl(s,{realmId:C.rid,action:action,stepId:null,
    actor:{kind:'character',id:C.row(s).leaderId}});};
  C.chain=function (s,pid) {
    const result=[],seen={};let rid=s.holder[pid];
    while (rid && !seen[rid]) {
      seen[rid]=true;const realm=s.realms[rid],person=rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid);
      if (!realm || !realm.alive || !person) return null;
      result.push({courtId:rid,personId:person.id,generation:FB.realmRulerGeneration(s,rid),
        alive:!person.dead && !person.captive && !person.prisonerOf && !person.imprisoned && !person.exiled &&
          !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,person.id)),
        formId:FB.governments.forRealm(s,rid).id});
      rid=realm.liege;
    }
    return rid || !result.length || result[result.length-1].courtId!==s.owner[pid] ? null : result;
  };
  C.complete=function (plan,origin,target) {return !!(plan && plan.ok && plan.requested===target && plan.stop===target &&
    (origin===target ? plan.path.length===0 : plan.path.length>0 && plan.path[plan.path.length-1]===target));};
  C.inventory=function (s,origins) {
    const M=FB.mobile,a=M.host(s,C.rid),moving=M.migration(s,C.rid),before=JSON.stringify([s,FBDATA]),
      rng=FB.getRngState(),uid=FB.getUidCounter(),legs=[],ids=[];
    const include=function (pid) {if (ids.indexOf(pid)<0) ids.push(pid);};
    ['field','camp'].forEach(function (mode) {
      let at=origins && origins[mode] || (mode==='camp' ? moving.at : a.at);
      // The planner excludes the origin. Cologne provisioning and all later
      // origins must therefore be included independently of returned paths.
      include(at);
      c.waypoints.forEach(function (target,index) {
        const prospective=copy(a);prospective.at=at;prospective.from=null;prospective.path=[];
        prospective.goal=null;prospective.moveLeft=0;prospective.mobileCourt=mode==='camp';
        const plan=FB.armyOrderPlan(s,prospective,target);
        legs.push({mode:mode,index:index,origin:at,target:target,complete:C.complete(plan,at,target),plan:copy(plan)});
        plan.path.forEach(include);include(target);at=target;
      });
    });
    const counties=ids.map(function (pid) {
      const chain=C.chain(s,pid),form=chain && chain[0].formId;
      const allocations=[];
      Object.keys(s.authority.governments).forEach(function (rid) {
        const row=M.row(s,rid);
        if (row) row.agreements.forEach(function (a) {
          if (a.kind==='access' && a.status==='active' && a.endTurn>s.turn && a.countyIds.indexOf(pid)>=0)
            allocations.push({realmId:rid,agreementId:a.id,capacity:a.capacity,endTurn:a.endTurn});
        });
      });
      return {countyId:pid,owner:s.owner[pid],holder:s.holder[pid],chain:chain,
        capacity:Math.floor(s.population.counties[pid].count*0.15),allocations:allocations,
        allocated:allocations.reduce(function (n,a) {return n+a.capacity;},0),
        blocked:!!(FB.recruitmentCountyBlocked(s,s.owner[pid],pid) || FB.recruitmentCountyBlocked(s,s.holder[pid],pid)),
        policy:form && FB.expeditionPrograms.resolvePassagePolicy(FB.campaignBookmark(s),form),
        currentProvisioning:M.provisioningAccess(s,C.rid,pid),currentField:M.passage(s,C.rid,pid,false),
        currentCamp:M.passage(s,C.rid,pid,true)};
    });
    const occupied=C.row(s).agreements.map(function (a) {return {id:a.id,status:a.status,original:!!a.accessOrigin,
      countyIds:a.countyIds.slice(),endTurn:a.endTurn,price:a.price,capacity:a.capacity};});
    // Count potential original receipts for the whole declared corridor even
    // when a temporary ordinary agreement currently happens to grant access.
    return {configuration:copy(c),origins:{field:a.at,camp:moving.at},legs:legs,counties:counties,countyIds:ids,
      requiredRecords:ids.length,occupied:occupied,availableRecords:M.profile(s,C.rid).maxAgreements-occupied.length,
      totalPrice:ids.length*c.price,steps:Math.ceil(ids.length/16)+4,waypointOccurrences:c.waypoints.length*2,
      pure:before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  };
  C.covered=function (s,inventory) {return inventory.legs.every(function (leg) {
    return leg.complete && [leg.origin].concat(leg.plan.path).every(function (pid) {
      return FB.mobile.provisioningAccess(s,C.rid,pid) && FB.mobile.passage(s,C.rid,pid,leg.mode==='camp');
    });
  });};
  C.negotiate=function (s,automatic) {
    const E=FB.expeditionPrograms,steps=C.permissionSteps(s),trace=[];
    // At most 16 offers, 16 independent responses and one completion per
    // step. This is transaction dispatch only, never daily world simulation.
    for (let n=0;n<35;n++) {
      const step=steps.find(function (v) {return C.row(s).expeditionProgram.steps.find(function (r) {return r.id===v.id;}).status==='pending';});
      if (!step) return {complete:true,trace:trace};
      const q=E.review(s,C.rid,step.id);
      if (!q.allowed) return {complete:false,reason:q.reason,trace:trace};
      const request=q.operation && q.operation.request,balances={};
      if (request && request.action==='accept') {
        const a=C.row(s).agreements.find(function (a) {return a.id===request.terms.agreementId;});
        balances.before=FB.treasuryAvailable(s,C.rid);balances.outside=FB.treasuryAvailable(s,a.partnerId);balances.price=a.price;
        balances.partner=a.partnerId;
      }
      if (automatic) E.day(s);else if (!E.commit(s,q)) return {complete:false,reason:'commit',trace:trace};
      E.day(s);const after=JSON.stringify(s);E.day(s);
      if (after!==JSON.stringify(s)) throw new Error('More than one dispatch on the same day');
      if (balances.partner) {
        balances.debit=balances.before-FB.treasuryAvailable(s,C.rid);
        balances.credit=FB.treasuryAvailable(s,balances.partner)-balances.outside;
      }
      trace.push({action:request ? request.action : 'complete',balances:balances});C.next(s);
    }
    return {complete:false,reason:'bounded dispatch exhausted',trace:trace};
  };
  C.restore=function () {
    const facts=function () {
      const s=FB.state,row=C.row(s),ids=[row.leaderId];
      row.agreements.forEach(function (a) {if (a.accessOrigin) a.accessOrigin.chain.forEach(function (p) {
        if (ids.indexOf(p.personId)<0) ids.push(p.personId);
      });});
      const originals=ids.map(function (id) {const p=s.chars[id];return p && {id:p.id,name:p.name,born:p.born,
        dead:!!p.dead,captive:!!p.captive,prisonerOf:p.prisonerOf || null,homeProvinceId:p.homeProvinceId};});
      return JSON.stringify([row,s.armies,s.owner,s.holder,s.realms,s.treasury,s.market,s.population,
        s.localPassagePolicies,s.stories,s.bookmarkSetup,originals]);
    };
    const before=facts(),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    for (let i=0;i<2;i++) FB.save.restore(JSON.parse(FB.save.serialize()));
    return before===facts() && rng===(FB.getRngState()>>>0) && uid===FB.getUidCounter() && FB.mobile.validate(FB.state);
  };
  C.copy=copy;
}

module.exports={buildCorridorMod:buildCorridorMod,installCorridorCase:installCorridorCase};
