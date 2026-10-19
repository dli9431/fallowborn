/* Named companions project one ordinary journey, never a second route. */
(function () {
  'use strict';
  var P=FB.householdParties, J=P.journeys={};
  J.actions=['depart_journey','separate_person','rejoin_person','party_return','party_settle',
    'request_camp','accept_camp','decline_camp','camp_return','survivor_return'];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function exact(o,fields) { return !!o && typeof o === 'object' && !Array.isArray(o) &&
    Object.keys(o).length === fields.length && Object.keys(o).every(function(k){return fields.indexOf(k)>=0;}); }
  function whole(n) { return Number.isSafeInteger(n) && n>=0; }
  function rows(s) { return Object.keys(s.stories || {}).sort().map(function(id){return s.stories[id];}).filter(function(t){
    return t && (t.version===2 || t.version===3) && t.journey &&
      (t.journey.kind==='ordinary_journey' || t.journey.kind==='mobile_camp');
  }); }
  function holds(m) { return m.status==='following' || m.status==='separated' || m.status==='withdrawn'; }
  function live(s,id) {
    var c=s.chars[id]; return !!c && !c.dead && (c.health===undefined || c.health>0) && !c.captive && !c.prisonerOf &&
      !c.imprisoned && !c.exiled && !c.travel && !c.religiousActivity &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,id)) && !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,id)) &&
      !(FB.characterGuarded && FB.characterGuarded(s,id));
  }
  function conflict(s,id) {
    return Object.keys(s.authority && s.authority.governments || {}).some(function(rid){
      var r=FB.mobile && FB.mobile.row(s,rid);
      return r && r.status==='active' && r.members.some(function(m){return m.principal.id===id;});
    }) || Object.keys(s.stories || {}).some(function(sid){
      var r=s.stories[sid],m=FB.stories.get(sid);
      return m && m.declaration && m.declaration.type==='expedition_participation' && r.actorId===id &&
        (r.locationHeld || ['pending','active','suspended'].indexOf(r.status)>=0);
    });
  }
  function travel(s,t) {
    var v=s.player.travel,j=t.journey,c=j.recovery || j.carrier;
    return (c.actorId || t.actorId)===s.player.charId && v && v.householdPartyId===t.partyId && v.startTurn===c.startTurn &&
      v.purpose===c.purposeId && v.homeId===j.homeId && v.destinationId===c.destinationId ? v : null;
  }
  function find(s,id) { return rows(s).filter(function(t){return t.journey.members.some(function(m){return m.personId===id&&holds(m);});})[0] || null; }
  J.location=function(s,id) {
    var t=find(s,id); if(!t) return null;
    if(t.journey.kind==='mobile_camp' && !t.journey.recovery) return P.camps.location(s,t,id);
    var m=t.journey.members.filter(function(v){return v.personId===id;})[0],v=travel(s,t);
    return m.status==='following' && v ? v.currentId : m.lastPlace;
  };
  J.travelling=function(s,id) {
    var t=find(s,id),v=t && travel(s,t);
    if(t && t.journey.kind==='mobile_camp' && !t.journey.recovery) return P.camps.moving(s,t,id);
    return !!(v && v.phase!=='arrived' && t.journey.members.some(function(m){return m.personId===id&&m.status==='following';}));
  };
  J.away=function(s,id) { var at=J.location(s,id),t=find(s,id);return !!at &&
    (at!==s.player.provinceId || J.travelling(s,id) || t.journey.kind==='mobile_camp' && t.journey.status==='active'); };
  J.check=function(def,context,bm) {
    if(def.journey && def.journey.kind==='mobile_camp') return P.camps.check(def,context,bm);
    var d=def.journey,site=d && (FBDATA.travelSites || []).filter(function(v){return v.id===d.travelSiteId;})[0];
    var purpose=site && FBDATA.travelPurposes[site.purpose];
    if(!exact(d,['kind','travelSiteId']) || d.kind!=='ordinary_journey' || !purpose || purpose.targeted || purpose.mode!=='sites' ||
      ['study','pilgrimage','expedition'].indexOf(FB.travelPurposeKind(site.purpose))<0 ||
      bm && !(bm.provinces || []).some(function(p){return p.id===site.provinceId;})) throw new Error('Invalid household party journey declaration.');
  };
  function following(t) { return t.journey.members.filter(function(m){return m.status==='following';}); }
  function eligible(s,m) {
    return live(s,m.personId) && !conflict(s,m.personId) && (!m.caregiverId ||
      live(s,m.caregiverId) && FB.ageOf(s.chars[m.personId],s.date.year)<16 &&
      (s.chars[m.personId].fatherId===m.caregiverId || s.chars[m.personId].motherId===m.caregiverId));
  }
  function gate(s,method) {
    var view=Object.assign({},s,{player:Object.assign({},s.player,{travel:copy(s.player.travel)})});
    return FB[method](view,{partyReview:true});
  }
  function affected(t,id) {
    var target=t.journey.members.filter(function(m){return m.personId===id;})[0],anchor=target && target.caregiverId || id;
    return t.journey.members.filter(function(m){return holds(m) && (m.personId===anchor || m.caregiverId===anchor);}).map(function(m){return m.personId;});
  }
  function site(def) { return (FBDATA.travelSites || []).filter(function(v){return v.id===def.journey.travelSiteId;})[0]; }
  J.review=function(s,def,t,action,actorId,personId) {
    if(P.camps.handles(t,action)) return P.camps.review(s,def,t,action,actorId,personId);
    var reviewer=t.journey && t.journey.recovery ? t.journey.recovery.actorId : t.actorId;
    var owner=actorId===reviewer && actorId===s.player.charId && live(s,actorId) && !s.player.dead;
    var ids=[],excluded=[],road=null,allowed=false,cost=0,j=t.journey,v=j && travel(s,t),actor=s.chars[t.actorId];
    if(action==='depart_journey' && def.journey && t.version===1 && t.status==='forming') {
      var snapshot=P.snapshot(s,def.id),destination=site(def);
      ids=snapshot.accepted.slice(); excluded=t.members.filter(function(m){return ids.indexOf(m.personId)<0;}).map(function(m){return m.personId;});
      road=FB.travelSiteSnapshot(s,def.journey.travelSiteId); cost=road ? road.cost*ids.length : 0;
      allowed=owner && ids.indexOf(t.actorId)>=0 && ids.length>0 && !!road && s.player.gold>=cost &&
        ids.every(function(id){return !conflict(s,id);});
      // A stale accepted row must be explicitly removed before departure.
      allowed=allowed && !t.members.some(function(m){return m.status==='accepted' && ids.indexOf(m.personId)<0;});
      if(destination && road) road=Object.assign({},road,{purposeId:destination.purpose});
    } else if(j) {
      if(action==='separate_person') {
        ids=affected(t,personId);
        var target=j.members.filter(function(m){return m.personId===personId;})[0];
        allowed=ids.length>0 && !!target && target.status==='following' &&
          (owner || actorId===personId && target.caregiverId===null && live(s,actorId));
        if(personId===reviewer) ids=following(t).map(function(m){return m.personId;});
      }
      if(action==='rejoin_person') {
        var returning=j.members.filter(function(m){return m.personId===personId;})[0];
        ids=returning ? [personId] : [];
        allowed=j.status!=='returned' && j.status!=='settled' && !!returning && returning.status==='withdrawn' && eligible(s,returning) &&
          (returning.caregiverId ? actorId===returning.caregiverId && live(s,actorId) : actorId===personId) &&
          J.location(s,personId)===J.location(s,t.actorId) &&
          (!returning.caregiverId || j.members.some(function(m){return m.personId===returning.caregiverId &&
            (m.status==='following' || m.status==='separated');}));
      }
      if(action==='party_return') {
        var current=J.location(s,t.actorId),route=current && FB.travelRoute(current,j.homeId);
        ids=j.members.filter(function(m){return (m.status==='following'||m.status==='separated')&&J.location(s,m.personId)===current&&eligible(s,m);}).map(function(m){return m.personId;});
        var shadow=Object.assign({},s,{player:Object.assign({},s.player,{provinceId:current})});
        var prepaid=v && !v.partyInterrupted && v.phase==='arrived';
        if(prepaid) route=[v.homeId].concat(v.outboundRoute.slice(0,-1)).reverse();
        cost=!prepaid && route && route.length ? FB.travelCostSnapshot(null,route,shadow)*ids.length : 0;
        road={from:current,route:route,legDays:prepaid ? v.legDays : FB.travelLegDaysSnapshot(s),prepaid:!!prepaid};
        road.days=route ? FB.travelRouteUnits(current,route)*road.legDays : 0;
        allowed=owner && ids.indexOf(t.actorId)>=0 && !!route && s.player.gold>=cost &&
          FB.station.isFreeUnlanded(s.player,s) && !FB.atWarPersonally(s) && !(s.player.flags && s.player.flags.in_prison) &&
          (j.status==='interrupted' || v && v.phase==='arrived' && gate(s,'travelReturnEligible')===true) &&
          !route.some(function(pid){return FB.justiceExileBlocks && FB.justiceExileBlocks(s,actorId,pid);});
        allowed=allowed && ids.every(function(id){var m=j.members.filter(function(r){return r.personId===id;})[0];return !m.caregiverId || ids.indexOf(m.caregiverId)>=0;});
      }
      if(action==='party_settle') {
        ids=following(t).map(function(m){return m.personId;});
        allowed=owner && !!v && !v.partyInterrupted && gate(s,'travelSettlementEligible')===true &&
          ids.indexOf(t.actorId)>=0 && following(t).every(function(m){return eligible(s,m);});
      }
      excluded=j.members.filter(function(m){return ids.indexOf(m.personId)<0;}).map(function(m){return m.personId;});
    }
    if(action!=='separate_person' && action!=='rejoin_person' && personId) allowed=false;
    var household=FB.householdMembers(s),all=household.map(function(c){return c.id;}).concat(t.members.map(function(m){return m.personId;}));
    all=all.filter(function(id,i){return all.indexOf(id)===i;});
    excluded=all.filter(function(id){return ids.indexOf(id)<0;});
    return {id:def.id,action:action,actorId:actorId,personId:personId || null,caregiverId:null,journeyReview:true,
      allowed:!!allowed,people:ids,excluded:excluded,road:road,cost:cost,
      facts:copy([def,t,s.turn,s.date,s.player,all.map(function(id){return s.chars[id] || null;}),
        s.authority,s.owner,s.holder,rows(s),actor || null])};
  };
  J.commit=function(s,def,t,q) {
    if(P.camps.handles(t,q.action)) return P.camps.commit(s,def,t,q);
    var fresh=J.review(s,def,t,q.action,q.actorId,q.personId);
    if(!fresh.allowed || !same(q,fresh)) return false;
    if(q.action==='depart_journey') {
      if(!FB.travelStart(s,q.road.purposeId,q.road.destinationId,q.road.destinationRealm)) return false;
      // The ordinary departure has already paid for the protagonist.
      s.player.gold-=q.cost-q.road.cost;
      var v=s.player.travel;
      v.householdPartyId=t.partyId;
      t.version=2; t.status='closed'; t.closedTurn=s.turn; t.closeReason='departed';
      t.journey={schema:1,kind:'ordinary_journey',homeId:v.homeId,startedTurn:s.turn,status:'outbound',
        carrier:{startTurn:v.startTurn,purposeId:v.purpose,destinationId:v.destinationId},
        members:q.people.map(function(id){var m=t.members.filter(function(r){return r.personId===id;})[0];
          return {personId:id,caregiverId:m.caregiverId,status:'following',lastPlace:v.currentId,lastTurn:s.turn};})};
    } else if(q.action==='separate_person') {
      J.checkpoint(s,t);
      if(q.people.indexOf(t.journey.recovery ? t.journey.recovery.actorId : t.actorId)>=0) J.interrupt(s,t);
      t.journey.members.forEach(function(m){if(q.people.indexOf(m.personId)>=0)m.status='withdrawn';});
    } else if(q.action==='rejoin_person') {
      t.journey.members.forEach(function(m){if(q.people.indexOf(m.personId)>=0)m.status=travel(s,t) && !s.player.travel.partyInterrupted ? 'following' : 'separated';});
    } else if(q.action==='party_return') {
      s.player.gold-=q.cost;
      FB.travelPartyReturnStart(s,t.partyId,q.road.from,t.journey.homeId,q.road.route,q.road.legDays,t.journey.carrier.purposeId,q.cost);
      var road=s.player.travel;
      t.journey.carrier={startTurn:road.startTurn,purposeId:road.purpose,destinationId:road.destinationId};
      t.journey.status='return';
      t.journey.members.forEach(function(m){if(q.people.indexOf(m.personId)>=0)m.status='following';});
    } else if(q.action==='party_settle') {
      if(!FB.travelSettle(s,{partyReview:true})) return false;
    }
    t.revision++; return true;
  };
  J.checkpoint=function(s,t) {
    if(t.journey.kind==='mobile_camp' && !t.journey.recovery) return P.camps.checkpoint(s,t);
    var v=travel(s,t); if(!v)return;
    following(t).forEach(function(m){if(m.lastPlace!==v.currentId){m.lastPlace=v.currentId;m.lastTurn=s.turn;t.revision++;}});
    if(t.journey.status!==v.phase && !v.partyInterrupted){t.journey.status=v.phase;t.revision++;}
  };
  J.interrupt=function(s,t) {
    if(t.journey.kind==='mobile_camp' && !t.journey.recovery) return P.camps.interrupt(s,t);
    J.checkpoint(s,t);
    t.journey.status='interrupted';t.revision++;
    var v=travel(s,t);
    if(v){v.partyInterrupted=true;v.phase='arrived';v.remainingRoute=[];v.legDaysLeft=0;}
    following(t).forEach(function(m){m.status='separated';});
  };
  J.cancel=function(s,v) {
    var t=s.stories && s.stories[v.householdPartyId];
    if(!t || !t.journey)return false;
    J.interrupt(s,t);
    return true;
  };
  J.tick=function(s,t) {
    if(t.journey.kind==='mobile_camp' && !t.journey.recovery) return P.camps.tick(s,t);
    var j=t.journey,v=travel(s,t);
    var actorId=j.recovery ? j.recovery.actorId : t.actorId;
    if(j.status==='settled' || j.status==='returned')return;
    if(v)J.checkpoint(s,t);
    if(v && (!live(s,actorId) || s.player.dead))J.interrupt(s,t);
    if(!v && following(t).length)J.interrupt(s,t);
    j.members.forEach(function(m){if(holds(m) && (s.chars[m.personId] || {}).dead){m.status='dead';t.revision++;}});
    if(v && (s.player.dead || (s.chars[actorId] || {}).dead))s.player.travel=null;
    var failed=[];
    j.members.forEach(function(m){if(m.status==='following' && (!live(s,m.personId) || conflict(s,m.personId) ||
      m.caregiverId && m.personId!==actorId && (!live(s,m.caregiverId) || FB.ageOf(s.chars[m.personId],s.date.year)>=16)))failed.push(m.personId);});
    j.members.forEach(function(m){if(m.caregiverId && failed.indexOf(m.personId)>=0 && !(s.chars[m.personId] || {}).dead &&
        FB.ageOf(s.chars[m.personId],s.date.year)<16 && failed.indexOf(m.caregiverId)<0)failed.push(m.caregiverId);});
    if(failed.indexOf(actorId)>=0)J.interrupt(s,t);
    j.members.forEach(function(m){if(failed.indexOf(m.personId)>=0){
      m.status=(s.chars[m.personId] || {}).dead ? 'dead' : 'separated';t.revision++;
    }});
    // A child never continues on a carrier after the named parent leaves it.
    j.members.forEach(function(m){if(m.status==='following' && m.caregiverId && m.personId!==actorId && !following(t).some(function(c){return c.personId===m.caregiverId;})){
      m.status='separated';t.revision++;
    }});
  };
  J.returned=function(s,v) {
    var t=s.stories && s.stories[v.householdPartyId];if(!t || !t.journey)return;
    J.checkpoint(s,t);
    following(t).forEach(function(m){m.lastPlace=t.journey.homeId;m.lastTurn=s.turn;m.status='returned';});
    t.journey.status='returned';t.revision++;
  };
  J.settlementPeople=function(s,v) {
    var t=v && s.stories && s.stories[v.householdPartyId];
    return t && t.journey ? following(t).map(function(m){return m.personId;}) : null;
  };
  J.settled=function(s,v) {
    var t=s.stories[v.householdPartyId];if(!t || !t.journey)return;
    J.checkpoint(s,t);
    following(t).forEach(function(m){m.status='settled';});
    t.journey.status='settled';t.revision++;
  };
  J.validate=function(t,s,def,recovery) {
    if(t.version===3) return P.camps.validate(t,s,def);
    function need(ok){if(!ok)throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+t.partyId+'.journey'}));}
    var j=t.journey;
    need(t.status==='closed' && t.closeReason==='departed' && exact(j,['schema','kind','homeId','startedTurn','status','carrier','members']) &&
      j.schema===1 && j.kind==='ordinary_journey' && whole(j.startedTurn) && j.startedTurn===t.closedTurn &&
      ['outbound','arrived','return','interrupted','returned','settled'].indexOf(j.status)>=0 &&
      exact(j.carrier,['startTurn','purposeId','destinationId']) && whole(j.carrier.startTurn) && j.carrier.startTurn>=j.startedTurn &&
      j.carrier.purposeId===site(def).purpose && Array.isArray(j.members) && j.members.length>0 && j.members.length<=def.maxMembers);
    need(j.members.some(function(m){return m.personId===t.actorId;}));
    j.members.forEach(function(m,i){
      var consent=t.members.filter(function(r){return r.personId===m.personId;})[0];
      need(exact(m,['personId','caregiverId','status','lastPlace','lastTurn']) && consent && consent.status==='accepted' &&
        consent.caregiverId===m.caregiverId && consent.decidedTurn<=j.startedTurn && whole(m.lastTurn) && m.lastTurn>=j.startedTurn &&
        ['following','separated','withdrawn','dead','returned','settled'].indexOf(m.status)>=0 &&
        j.members.every(function(n,k){return i===k || n.personId!==m.personId;}));
      if(m.caregiverId)need(j.members.some(function(c){return c.personId===m.caregiverId && c.caregiverId===null &&
        (m.status!=='following' || recovery && m.personId===recovery.actorId || c.status==='following');}));
      if(j.status==='returned' || j.status==='settled')need(m.status!=='following');
      if(s){
        var c=s.chars[m.personId];
        need(m.lastTurn<=s.turn && (!holds(m) || !!c) && (!c || c.id===m.personId) && Object.prototype.hasOwnProperty.call(s.owner,m.lastPlace));
        if(m.caregiverId && holds(m))need(c.fatherId===m.caregiverId || c.motherId===m.caregiverId);
      }
    });
    if(s)need(j.carrier.startTurn<=s.turn && Object.prototype.hasOwnProperty.call(s.owner,j.homeId) &&
      Object.prototype.hasOwnProperty.call(s.owner,j.carrier.destinationId));
  };
  J.validateState=function(s,reserved) {
    function need(ok){if(!ok)throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.player.travel.householdPartyId'}));}
    rows(s).forEach(function(t){t.journey.members.forEach(function(m){if(holds(m)){
      need(!reserved[m.personId]);reserved[m.personId]=t.partyId;
    }});});
    Object.keys(s.chars).forEach(function(id){var c=s.chars[id];
      if(c.householdResidenceId!==undefined)need(typeof c.householdResidenceId==='string' && Object.prototype.hasOwnProperty.call(s.owner,c.householdResidenceId));
    });
    var v=s.player.travel;
    P.camps.validateState(s);
    rows(s).forEach(function(t){if(t.version===2 && (following(t).length || t.journey.status==='interrupted') && t.actorId===s.player.charId && !s.player.dead && !(s.chars[t.actorId] || {}).dead)need(!!travel(s,t));});
    if(!v)return;
    if(v.partyInterrupted!==undefined)need(v.partyInterrupted===true && !!v.householdPartyId && v.phase==='arrived');
    if(v.householdPartyId===undefined)return;
    var t=s.stories && s.stories[v.householdPartyId];
    if(t && t.version===3) return P.camps.validateRoad(s,t);
    need(t && t.version===2 && t.journey && !!travel(s,t) && !v.participationId &&
      Object.prototype.hasOwnProperty.call(s.owner,v.currentId) && ['outbound','arrived','return'].indexOf(v.phase)>=0 &&
      whole(v.startTurn) && v.startTurn<=s.turn && Number.isFinite(v.legDays) && v.legDays>0 &&
      Number.isFinite(v.legDaysLeft) && v.legDaysLeft>=0 && Number.isFinite(v.cost) && v.cost>=0 &&
      Array.isArray(v.remainingRoute) && v.remainingRoute.length<=Object.keys(s.owner).length &&
      v.remainingRoute.every(function(pid){return Object.prototype.hasOwnProperty.call(s.owner,pid);}) &&
      (!v.partyInterrupted || t.journey.status==='interrupted' && v.remainingRoute.length===0));
    var allowed=['purpose','householdPartyId','partyInterrupted','homeId','destinationId','destinationRealm','currentId','phase','remainingRoute',
      'outboundRoute','visited','legDaysLeft','legDays','startTurn','cost','overhead','encounters','seenCultures','seenEvents','completed',
      'stayStartTurn','nextWorkTurn','workEvents','lastWorkEventId','stayStarted'];
    need(Object.keys(v).every(function(k){return allowed.indexOf(k)>=0;}) && v.homeId===t.journey.homeId &&
      v.homeId===s.player.provinceId && v.destinationRealm===null &&
      t.journey.status===(v.partyInterrupted ? 'interrupted' : v.phase) &&
      ['outboundRoute','visited'].every(function(k){return Array.isArray(v[k]) && v[k].length<=Object.keys(s.owner).length &&
        v[k].every(function(pid){return Object.prototype.hasOwnProperty.call(s.owner,pid);});}) &&
      v.legDays<=1440 && v.cost<=1000000000 && Number.isFinite(v.overhead) && v.overhead>=0 && v.overhead<=v.cost);
    var previous=v.currentId;
    v.remainingRoute.forEach(function(pid){need(!!(FB.world.adj[previous] || {})[pid]);previous=pid;});
    need(v.phase==='arrived' ? v.remainingRoute.length===0 && (v.partyInterrupted || v.currentId===v.destinationId) : previous===v.destinationId);
    following(t).forEach(function(m){need(m.lastPlace===v.currentId);});
    need(t.journey.members.some(function(m){return m.personId===t.actorId && holds(m) && m.lastPlace===v.currentId;}));
  };
  function name(s,id){return s.chars[id] ? FB.fullName(s.chars[id]) : FB.T('Unavailable person');}
  J.menu=function(s,def,t) {
    if(t.version===3 || def.journey && def.journey.kind==='mobile_camp' || t.version===2 && t.actorId!==s.player.charId) return P.camps.menu(s,def,t);
    if(!def.journey || t.actorId!==s.player.charId)return [];
    var out=[];
    function add(action,id,label){out.push({id:JSON.stringify([action,id || null]),action:action,personId:id || null,caregiverId:null,
      label:label,detail:FB.T('Review the exact travellers, people remaining behind and private cost before confirming.')});}
    if(t.version===1 && t.status==='forming')add('depart_journey',null,FB.T('Travel with consenting relatives'));
    if(t.version===2){
      following(t).forEach(function(m){add('separate_person',m.personId,FB.T('Separate {name} from this journey',{name:name(s,m.personId)}));});
      t.journey.members.forEach(function(m){if(m.status==='withdrawn' && (m.personId===s.player.charId || m.caregiverId===s.player.charId))
        add('rejoin_person',m.personId,FB.T('Consent to travel again for {name}',{name:name(s,m.personId)}));});
      add('party_return',null,FB.T('Review the return home'));
      add('party_settle',null,FB.T('Review permanent settlement here'));
    }
    return out;
  };
  J.describe=function(s,t,q) {if(q.campReview)return P.camps.describe(s,t,q);return [FB.T('Private cost: {money:cost}.',{cost:q.cost}),
    FB.T('Travel time: {days} days.',{days:q.road && q.road.days || 0}),
    FB.T('Travellers or affected people: {names}.',{names:q.people.map(function(id){return name(s,id);}).join(', ') || FB.T('Nobody')}),
    FB.T('Excluded from this decision: {names}.',{names:q.excluded.map(function(id){return name(s,id);}).join(', ') || FB.T('Nobody')}),
    FB.T('The ordinary journey supplies movement. Separation preserves the reached county. Settlement changes only the eligible people still accompanying you.')];};
  J.lines=function(s,t){return t.version>=2 ? t.journey.members.map(function(m){var pid=J.location(s,m.personId) || m.lastPlace;
    return FB.T('{name}: {place}.',{name:name(s,m.personId),place:FB.world.byId[pid] ? FB.world.byId[pid].name : pid});}).concat(P.camps.lines(s,t)) : [];};
})();
