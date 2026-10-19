/* Named civilian places project the existing migration. A recovery road keeps
   that original binding and uses the ordinary personal travel clock. */
(function () {
  'use strict';
  var P=FB.householdParties, J=P.journeys, C=P.camps={};
  var actions=['request_camp','accept_camp','decline_camp','camp_return','survivor_return'];
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function exact(o,fields){return !!o && typeof o==='object' && !Array.isArray(o) &&
    Object.keys(o).length===fields.length && Object.keys(o).every(function(k){return fields.indexOf(k)>=0;});}
  function whole(n){return Number.isSafeInteger(n) && n>=0;}
  function ref(v){return typeof v==='string' && v.length>0 && v.length<=200;}
  function held(m){return ['following','separated','withdrawn'].indexOf(m.status)>=0;}
  function member(t,id){return t.journey.members.filter(function(m){return m.personId===id;})[0];}
  function free(s,id){var c=s.chars[id];return !!c && !c.dead && !c.captive && !c.prisonerOf && !c.imprisoned &&
    !c.exiled && (c.health===undefined || c.health>0) && !c.travel && !c.religiousActivity &&
    !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,id)) && !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,id)) &&
    !(FB.characterGuarded && FB.characterGuarded(s,id)) &&
    !(s.justice && s.justice.exiles && s.justice.exiles[id] && s.justice.exiles[id].endTurn>s.turn);}
  function principal(s,id){return Object.keys(s.authority && s.authority.governments || {}).some(function(rid){
    var r=FB.mobile.row(s,rid);return r && r.status==='active' && r.members.some(function(m){return m.principal.id===id;});
  });}
  function personal(s,id,except){return Object.keys(s.stories || {}).some(function(sid){
    var d=FB.stories.get(sid),t=s.stories[sid];return sid!==except && d && d.declaration &&
      d.declaration.type==='expedition_participation' && t.actorId===id &&
      (t.locationHeld || t.roleId && ['pending','active','suspended'].indexOf(t.status)>=0);
  });}
  function rows(s){return Object.keys(s.stories || {}).sort().filter(function(id){var mod=FB.stories.get(id);
    return mod && mod.declaration && mod.declaration.type==='household_party';
  }).map(function(id){return s.stories[id];}).filter(function(t){return t && t.version===3 && t.journey;});}
  function camp(t){return !!t.journey && t.journey.kind==='mobile_camp';}
  function definition(t){return FB.stories.get(t.partyId).declaration;}
  function facts(s,def){
    var d=def.journey,mod=d && FB.stories.get(d.participationId),decl=mod && mod.declaration;
    var rid=decl && FB.startRealmId(s,decl.host.realmId),r=rid && FB.mobile.row(s,rid),m=rid && FB.mobile.migration(s,rid);
    return {rid:rid || null,row:r || null,migration:m || null,leader:rid && FB.mobile.leader(s,rid) || null,
      generation:rid ? FB.realmRulerGeneration(s,rid) : null,participation:d && s.stories[d.participationId] || null,decl:decl || null};
  }
  function migration(s,t){var b=t.journey.carrier,f=facts(s,definition(t)),m=f.migration;
    return f.rid===b.realmId && f.row && f.row.status==='active' && s.realms[b.realmId] && s.realms[b.realmId].alive &&
      m && m.id===b.migrationId && ['settled','failed'].indexOf(m.status)<0 ? m : null;
  }
  function civilian(f,actorId){var p=f.participation,r=p && f.decl && f.decl.roles.filter(function(v){return v.id===p.roleId;})[0];
    return !!(p && p.actorId===actorId && p.status==='active' && p.locationHeld && r && r.kind==='civilian' &&
      f.migration && p.migrationId===f.migration.id && f.leader && p.leaderId===f.leader.id && p.generation===f.generation);
  }
  function stationary(s,f){return !!f.migration && !(s.armies || []).some(function(h){
    return h.realm===f.rid && h.mobileCourt && (h.moveLeft>0 || (h.path || []).length);
  });}
  function parent(s,id,care){var c=s.chars[id];return !!c && (c.fatherId===care || c.motherId===care);}
  function eligible(s,m,except){return free(s,m.personId) && !principal(s,m.personId) && !personal(s,m.personId,except) &&
    (!m.caregiverId || free(s,m.caregiverId) && FB.ageOf(s.chars[m.personId],s.date.year)<16 && parent(s,m.personId,m.caregiverId));}
  function recoveryEligible(s,m,actorId,except){return m.personId===actorId ?
    free(s,actorId) && FB.ageOf(s.chars[actorId],s.date.year)>=16 && !principal(s,actorId) && !personal(s,actorId,except) : eligible(s,m);}
  function carrying(s,t,m){var b=t.journey.carrier,f=facts(s,definition(t));
    return t.journey.status==='active' && t.actorId===s.player.charId && !s.player.dead && free(s,t.actorId) &&
      f.leader && f.leader.id===b.leaderId && f.generation===b.generation && s.turn<b.endTurn && civilian(f,t.actorId) &&
      m.status==='following' && eligible(s,m,m.personId===t.actorId ? b.participationId : null) &&
      !t.journey.members.some(function(child){return child.caregiverId===m.personId && child.status==='following' &&
        !(s.chars[child.personId] || {}).dead && FB.ageOf(s.chars[child.personId],s.date.year)<16 && !eligible(s,child);});
  }
  function allocation(s,def,t,people,rid){
    var peers=rows(s).filter(function(v){return v!==t && camp(v) && v.journey.carrier.realmId===rid &&
      ['requested','active'].indexOf(v.journey.status)>=0;});
    var limit=Math.min.apply(Math,[def.journey.capacity].concat(peers.map(function(v){return definition(v).journey.capacity;})));
    var used=peers.reduce(function(n,v){return n+v.journey.members.filter(function(m){
      return m.personId!==v.actorId && (v.journey.status==='requested' ? m.status==='separated' : m.status==='following');
    }).length;},0);
    return {capacity:limit,used:used,requested:people.filter(function(id){return id!==t.actorId;}).length};
  }
  C.check=function(def,context,bm){
    var d=def.journey,mod=d && context.get(d.participationId),p=mod && mod.declaration;
    if(!exact(d,['kind','participationId','capacity','termDays','acceptance']) || d.kind!=='mobile_camp' || !ref(d.participationId) ||
      !whole(d.capacity) || d.capacity<1 || d.capacity>32 || !whole(d.termDays) || d.termDays<1 || d.termDays>1440 ||
      ['volunteers','closed'].indexOf(d.acceptance)<0 || !p || p.type!=='expedition_participation' ||
      !Array.isArray(def.requires) || def.requires.indexOf(d.participationId)<0 ||
      !p.roles.some(function(r){return r.kind==='civilian';}) ||
      bm && !(bm.realms || []).some(function(r){return r.id===p.host.realmId && !!r.mobile;}))
      throw new Error('Invalid household party camp declaration.');
  };
  C.associationAvailable=function(s,t,id){
    var def=definition(t);
    if(id!==t.actorId || !def.journey || def.journey.kind!=='mobile_camp')return false;
    var f=facts(s,def);
    return free(s,id) && !s.player.dead && civilian(f,id) && stationary(s,f) &&
      f.migration.at===s.player.provinceId && !principal(s,id) && !personal(s,id,def.journey.participationId) &&
      !!s.player.travel && s.player.travel.participationId===def.journey.participationId && s.player.travel.phase==='arrived';
  };
  C.handles=function(t,action){return actions.indexOf(action)>=0 || t.version===3 && action==='party_return' ||
    camp(t) && !t.journey.recovery && ['separate_person','rejoin_person','party_settle','depart_journey'].indexOf(action)>=0;};
  C.location=function(s,t,id){var m=member(t,id),moving=(carrying(s,t,m) ||
      t.journey.status==='requested' && id===t.actorId) && migration(s,t);
    return moving ? moving.at : m.lastPlace;
  };
  C.moving=function(s,t,id){var m=member(t,id),f=facts(s,definition(t));return !!(m && m.status==='following' &&
    carrying(s,t,m) && migration(s,t) && !stationary(s,f));};
  C.checkpoint=function(s,t){var moving=t.journey.status==='active' && migration(s,t);if(!moving)return;
    t.journey.members.forEach(function(m){if(carrying(s,t,m) && m.lastPlace!==moving.at){
      m.lastPlace=moving.at;m.lastTurn=s.turn;t.revision++;
    }});
  };
  function personalParty(s,id){return rows(s).filter(function(t){return camp(t) && !t.journey.recovery &&
    t.journey.carrier.participationId===id && t.actorId===s.player.charId && held(member(t,t.actorId));})[0];}
  C.personalLocation=function(s,id){var t=personalParty(s,id);return t ? J.location(s,t.actorId) : null;};
  C.personalCheckpoint=function(s,id){var t=personalParty(s,id);if(!t)return null;
    C.checkpoint(s,t);return C.personalLocation(s,id);
  };
  // Release personal carriage through its existing consent and location owners.
  function release(s,t){var b=t.journey.carrier,p=s.stories[b.participationId];
    if(t.actorId!==s.player.charId || !p || p.actorId!==t.actorId)return;
    if(['pending','active','suspended'].indexOf(p.status)>=0){
      var q=FB.expeditionParticipants.review(s,b.participationId,'leave',t.actorId);
      if(q && q.allowed)FB.expeditionParticipants.commit(s,q);
    }
    if(p.locationHeld)FB.expeditionParticipants.checkpoint(s,p.lastPlace,true);
    if(s.player.travel && s.player.travel.participationId===b.participationId)s.player.travel=null;
  }
  C.interrupt=function(s,t,withdraw){
    C.checkpoint(s,t);
    if(t.journey.status==='requested'){
      var moving=migration(s,t),actor=member(t,t.actorId);
      if(moving && actor && actor.lastPlace!==moving.at){actor.lastPlace=moving.at;actor.lastTurn=s.turn;t.revision++;}
    }
    if(t.journey.status!=='interrupted'){t.journey.status='interrupted';t.revision++;}
    t.journey.members.forEach(function(m){if(m.status==='following'){m.status='separated';t.revision++;}});
    var actor=member(t,t.actorId),p=s.stories[t.journey.carrier.participationId];
    var care=t.journey.carrier.acceptedTurn!==null && t.journey.members.some(function(m){return held(m) &&
      m.caregiverId===t.actorId && !(s.chars[m.personId] || {}).dead && FB.ageOf(s.chars[m.personId],s.date.year)<16;});
    if(!withdraw && !care && free(s,t.actorId) && p && ['pending','active','suspended'].indexOf(p.status)>=0){
      if(actor && held(actor)){actor.status='released';t.revision++;}
    }else release(s,t);
  };
  function requestPeople(s,t,def,f){return t.members.filter(function(m){
    var existing=J.location(s,m.personId),c=s.chars[m.personId];
    return m.status==='accepted' && !existing && eligible(s,m,m.personId===t.actorId ? def.journey.participationId : null) &&
      FB.householdMembers(s).some(function(v){return v.id===m.personId;}) &&
      (m.kind==='adult' ? FB.ageOf(c,s.date.year)>=16 : FB.ageOf(c,s.date.year)<16 && parent(s,m.personId,m.caregiverId)) &&
      FB.characterLocation(s,c)===f.migration.at;
  }).map(function(m){return m.personId;});}
  C.review=function(s,def,t,action,actorId,personId){
    var j=t.journey,isCamp=def.journey && def.journey.kind==='mobile_camp',f=isCamp ? facts(s,def) : null;
    var people=[],allowed=false,road=null,capacity=null,cost=0,own=actorId===s.player.charId && free(s,actorId) && !s.player.dead;
    if(action==='request_camp' && isCamp && t.version===1 && t.status==='forming' && f.migration){
      people=requestPeople(s,t,def,f);capacity=allocation(s,def,t,people,f.rid);
      allowed=own && actorId===t.actorId && C.associationAvailable(s,t,actorId) && people.indexOf(t.actorId)>=0 &&
        people.every(function(id){var m=t.members.filter(function(v){return v.personId===id;})[0];return !m.caregiverId || people.indexOf(m.caregiverId)>=0;}) &&
        !t.members.some(function(m){return m.status==='accepted' && people.indexOf(m.personId)<0;}) &&
        capacity.used+capacity.requested<=capacity.capacity && s.turn<f.participation.endTurn;
    }
    if(j && isCamp && !j.recovery && action==='accept_camp'){
      people=j.members.filter(function(m){return held(m);}).map(function(m){return m.personId;});
      capacity=allocation(s,def,t,people,j.carrier.realmId);
      allowed=j.status==='requested' && def.journey.acceptance==='volunteers' && f.leader && actorId===f.leader.id && free(s,actorId) &&
        f.generation===j.carrier.generation && f.leader.id===j.carrier.leaderId && !!migration(s,t) && stationary(s,f) &&
        civilian(f,t.actorId) && s.turn<j.carrier.endTurn && t.actorId===s.player.charId && !s.player.dead &&
        capacity.used+capacity.requested<=capacity.capacity && people.indexOf(t.actorId)>=0 &&
        j.members.every(function(m){return m.status==='separated' && eligible(s,m,m.personId===t.actorId ? def.journey.participationId : null) &&
          m.lastPlace===f.migration.at && (!m.caregiverId || people.indexOf(m.caregiverId)>=0);});
    }
    if(j && isCamp && !j.recovery && action==='decline_camp'){
      allowed=j.status==='requested' && f.leader && actorId===f.leader.id && free(s,actorId);
      people=j.members.filter(held).map(function(m){return m.personId;});
    }
    if(j && isCamp && !j.recovery && action==='separate_person'){
      var target=member(t,personId);
      var anchor=target && target.caregiverId || personId;
      people=j.members.filter(function(m){return held(m) && (m.personId===anchor || m.caregiverId===anchor);}).map(function(m){return m.personId;});
      if(anchor===t.actorId)people=j.members.filter(held).map(function(m){return m.personId;});
      allowed=!!target && target.status==='following' && (own && actorId===t.actorId ||
        (actorId===personId && !target.caregiverId || actorId===target.caregiverId) && free(s,actorId));
    }
    if(j && isCamp && !j.recovery && action==='rejoin_person'){
      var returning=member(t,personId),care=returning && member(t,returning.caregiverId);
      people=returning ? [personId] : [];
      allowed=j.status==='active' && !!returning && ['withdrawn','separated'].indexOf(returning.status)>=0 && !!migration(s,t) &&
        !!f.leader && f.leader.id===j.carrier.leaderId && f.generation===j.carrier.generation &&
        s.turn<j.carrier.endTurn && civilian(f,t.actorId) && eligible(s,returning) &&
        returning.lastPlace===f.migration.at && (returning.caregiverId ?
          actorId===returning.caregiverId && !!care && care.status==='following' : actorId===personId);
      if(allowed){capacity=allocation(s,def,t,j.members.filter(function(m){return m.status==='following' || m.personId===personId;}).map(function(m){return m.personId;}),j.carrier.realmId);
        allowed=capacity.used+capacity.requested<=capacity.capacity;}
    }
    if(j && (action==='camp_return' || action==='party_return' || action==='survivor_return')){
      var survivor=action==='survivor_return',current=member(t,actorId),at=current &&
        (J.location(s,actorId) || current.status==='released' && FB.characterLocation(s,s.chars[actorId]));
      var ownParticipation=isCamp && actorId===t.actorId && f.participation &&
        ['pending','active','suspended'].indexOf(f.participation.status)<0 ? def.journey.participationId : null;
      if(survivor || current && current.status==='withdrawn'){
        people=j.members.filter(function(m){return (m.personId===actorId || m.caregiverId===actorId) &&
          held(m) && m.lastPlace===at && recoveryEligible(s,m,actorId);}).map(function(m){return m.personId;});
      }else people=j.members.filter(function(m){return (m.status==='following' || m.status==='separated' || m.personId===actorId && m.status==='released') &&
        (J.location(s,m.personId) || m.personId===actorId && at)===at &&
        eligible(s,m,m.personId===actorId ? ownParticipation : null);}).map(function(m){return m.personId;});
      road=at && FB.travelRecoveryRoadQuote(s,at,j.homeId,people.length);cost=road ? road.cost : 0;
      var personalEnded=!personal(s,actorId,ownParticipation),v=s.player.travel;
      allowed=own && !!current && (held(current) || !survivor && current.status==='released') &&
        (survivor || !current.caregiverId) && FB.ageOf(s.chars[actorId],s.date.year)>=16 &&
        (j.status==='interrupted' || survivor && ['returned','settled'].indexOf(j.status)>=0) &&
        (survivor ? actorId!==t.actorId : isCamp && actorId===t.actorId) &&
        personalEnded && !principal(s,actorId) && (!v || v.householdPartyId===t.partyId && v.partyInterrupted ||
          ownParticipation && v.participationId===ownParticipation && v.phase==='arrived') &&
        !!road && road.allowed && j.homeId===s.player.provinceId && people.indexOf(actorId)>=0 &&
        people.every(function(id){var m=member(t,id);return id===actorId || !m.caregiverId || people.indexOf(m.caregiverId)>=0;}) &&
        !j.members.some(function(m){return held(m) && m.caregiverId===actorId && FB.ageOf(s.chars[m.personId],s.date.year)<16 && people.indexOf(m.personId)<0;});
    }
    if(personId && action!=='separate_person' && action!=='rejoin_person')allowed=false;
    var known=FB.householdMembers(s).map(function(c){return c.id;}).concat(t.members.map(function(m){return m.personId;}));
    var excluded=known.filter(function(id,i){return known.indexOf(id)===i && people.indexOf(id)<0;});
    return {id:def.id,action:action,actorId:actorId,personId:personId || null,caregiverId:null,journeyReview:true,campReview:true,
      allowed:!!allowed,people:people,excluded:excluded,road:road,cost:cost,capacity:capacity,
      facts:copy([def,t,s.turn,s.date,s.player,known.concat([actorId,f && f.leader && f.leader.id]).map(function(id){return s.chars[id] || null;}),
        rows(s),f,s.authority,s.owner,s.holder,s.armies])};
  };
  C.commit=function(s,def,t,q){
    var fresh=C.review(s,def,t,q.action,q.actorId,q.personId);if(!fresh.allowed || !same(q,fresh))return false;
    if(q.action==='request_camp'){
      var f=facts(s,def),d=def.journey;
      t.version=3;t.status='closed';t.closedTurn=s.turn;t.closeReason='departed';
      t.journey={schema:2,kind:'mobile_camp',homeId:s.player.provinceId,startedTurn:s.turn,status:'requested',
        carrier:{participationId:d.participationId,realmId:f.rid,migrationId:f.migration.id,leaderId:f.leader.id,
          generation:f.generation,requestedTurn:s.turn,acceptedTurn:null,endTurn:Math.min(s.turn+d.termDays,f.participation.endTurn)},
        recovery:null,members:q.people.map(function(id){var m=t.members.filter(function(v){return v.personId===id;})[0];
          return {personId:id,caregiverId:m.caregiverId,status:'separated',lastPlace:f.migration.at,lastTurn:s.turn};})};
    }else if(q.action==='accept_camp'){
      t.journey.carrier.acceptedTurn=s.turn;t.journey.status='active';
      t.journey.members.forEach(function(m){m.status='following';});
    }else if(q.action==='decline_camp')C.interrupt(s,t);
    else if(q.action==='rejoin_person'){
      var m=member(t,q.personId);m.status='following';m.lastTurn=s.turn;
    }
    else if(q.action==='separate_person'){
      C.checkpoint(s,t);
      if(q.people.indexOf(t.actorId)>=0)C.interrupt(s,t,true);
      t.journey.members.forEach(function(m){if(q.people.indexOf(m.personId)>=0 && m.status!=='released')m.status='withdrawn';});
    }else{
      if(camp(t) && q.actorId===t.actorId)release(s,t);
      s.player.gold-=q.cost;
      var purpose=FB.travelDefault('relationship');
      FB.travelPartyReturnStart(s,t.partyId,q.road.from,t.journey.homeId,q.road.route,q.road.legDays,purpose,q.cost);
      t.version=3;t.journey.status='return';
      t.journey.recovery={actorId:q.actorId,startTurn:s.turn,purposeId:purpose,destinationId:t.journey.homeId,people:q.people.slice()};
      t.journey.members.forEach(function(m){if(q.people.indexOf(m.personId)>=0)m.status='following';});
    }
    t.revision++;return true;
  };
  C.tick=function(s,t){
    var j=t.journey;
    C.checkpoint(s,t);
    var original=member(t,t.actorId),personalRecord=s.stories[j.carrier.participationId];
    if(original && original.status==='released' && personalRecord && personalRecord.actorId===t.actorId){
      var place=t.actorId===s.player.charId && FB.expeditionParticipants.location(s) || personalRecord.lastPlace;
      if(place && original.lastPlace!==place){original.lastPlace=place;original.lastTurn=s.turn;t.revision++;}
      if(t.actorId!==s.player.charId || !personalRecord.locationHeld){
        original.status=(s.chars[t.actorId] || {}).dead ? 'dead' : original.lastPlace===j.homeId ? 'returned' : 'separated';t.revision++;
      }
    }
    j.members.forEach(function(m){if(held(m) && (s.chars[m.personId] || {}).dead){m.status='dead';t.revision++;}});
    if(j.status==='returned' || j.status==='settled' || j.status==='interrupted')return;
    var f=facts(s,definition(t)),b=j.carrier;
    if(t.actorId!==s.player.charId || s.player.dead || !free(s,t.actorId) || s.turn>=b.endTurn || !migration(s,t) ||
      !f.leader || f.leader.id!==b.leaderId || f.generation!==b.generation || !civilian(f,t.actorId) ||
      j.status==='requested' && j.members.some(function(m){return m.lastPlace!==f.migration.at;}))C.interrupt(s,t);
    var failed=[];
    j.members.forEach(function(m){if(m.status==='following' && !eligible(s,m,m.personId===t.actorId ? b.participationId : null))failed.push(m.personId);});
    j.members.forEach(function(m){if(m.caregiverId && failed.indexOf(m.personId)>=0 && held(m) &&
      !(s.chars[m.personId] || {}).dead && FB.ageOf(s.chars[m.personId],s.date.year)<16 && failed.indexOf(m.caregiverId)<0)failed.push(m.caregiverId);});
    if(failed.indexOf(t.actorId)>=0)C.interrupt(s,t);
    j.members.forEach(function(m){if(m.status==='following' && (failed.indexOf(m.personId)>=0 || failed.indexOf(m.caregiverId)>=0 ||
      m.caregiverId && !j.members.some(function(c){return c.personId===m.caregiverId && c.status==='following';}))){m.status='separated';t.revision++;}});
    if(j.status==='requested'){
      var action=definition(t).journey.acceptance==='closed' ? 'decline_camp' : 'accept_camp';
      var q=C.review(s,definition(t),t,action,f.leader && f.leader.id);
      if(q.allowed && q.actorId!==s.player.charId)C.commit(s,definition(t),t,q);
    }
  };
  function need(ok,path){if(!ok)throw new Error(FB.T('Invalid v4 save field at {path}.',{path:path}));}
  C.validate=function(t,s,def){
    var j=t.journey,path='state.stories.'+t.partyId+'.journey';
    need(exact(j,['schema','kind','homeId','startedTurn','status','carrier','recovery','members']),path);
    if(j.kind==='ordinary_journey'){
      need(!!j.recovery && j.schema===1 && def.journey.kind==='ordinary_journey',path);
      var base=copy(t);base.version=2;delete base.journey.recovery;
      J.validate(base,s,def,j.recovery);
    }else{
      var b=j.carrier;
      need(j.kind==='mobile_camp' && def.journey.kind==='mobile_camp' && j.schema===2 && t.status==='closed' &&
        t.closeReason==='departed' && j.startedTurn===t.closedTurn && whole(j.startedTurn) &&
        ['requested','active','interrupted','return','returned'].indexOf(j.status)>=0 &&
        exact(b,['participationId','realmId','migrationId','leaderId','generation','requestedTurn','acceptedTurn','endTurn']) &&
        b.participationId===def.journey.participationId && ref(b.realmId) && ref(b.migrationId) && ref(b.leaderId) &&
        whole(b.generation) && b.generation>=1 && b.requestedTurn===j.startedTurn && whole(b.endTurn) &&
        b.endTurn>b.requestedTurn && b.endTurn<=b.requestedTurn+def.journey.termDays &&
        (b.acceptedTurn===null || whole(b.acceptedTurn) && b.acceptedTurn>=b.requestedTurn && b.acceptedTurn<b.endTurn) &&
        (j.status!=='active' || b.acceptedTurn!==null) && (j.status!=='requested' || b.acceptedTurn===null) &&
        Array.isArray(j.members) && j.members.length>0 && j.members.length<=def.maxMembers &&
        j.members.some(function(m){return m.personId===t.actorId && (j.status!=='active' || m.status==='following');}),path);
      j.members.forEach(function(m,i){var consent=t.members.filter(function(v){return v.personId===m.personId;})[0];
        need(exact(m,['personId','caregiverId','status','lastPlace','lastTurn']) && consent && consent.status==='accepted' &&
          consent.caregiverId===m.caregiverId && consent.decidedTurn<=j.startedTurn && whole(m.lastTurn) && m.lastTurn>=j.startedTurn &&
          ['following','separated','withdrawn','released','dead','returned'].indexOf(m.status)>=0 &&
          (m.status!=='released' || m.personId===t.actorId && ['requested','active'].indexOf(j.status)<0) &&
          j.members.every(function(v,k){return i===k || v.personId!==m.personId;}) &&
          (j.status!=='requested' || m.status==='separated') &&
          (j.status!=='interrupted' || m.status!=='following') &&
          (j.status!=='returned' && j.status!=='settled' || m.status!=='following'),path);
        if(m.caregiverId)need(j.members.some(function(v){return v.personId===m.caregiverId && !v.caregiverId &&
          (m.status!=='following' || j.recovery && m.personId===j.recovery.actorId || v.status==='following');}),path);
        if(s){var c=s.chars[m.personId];need(m.lastTurn<=s.turn && (!held(m) || !!c) &&
          Object.prototype.hasOwnProperty.call(s.owner,m.lastPlace) && (!m.caregiverId || !held(m) || parent(s,m.personId,m.caregiverId)),path);}
      });
      if(s){var f=facts(s,def),p=f.participation;
        need(j.startedTurn<=s.turn && Object.prototype.hasOwnProperty.call(s.owner,j.homeId) && f.rid===b.realmId &&
          !!f.row && f.row.migrationId===b.migrationId && b.generation<=f.generation &&
          (b.acceptedTurn===null || b.acceptedTurn<=s.turn) && !!p && p.actorId===t.actorId &&
          p.migrationId===b.migrationId && p.leaderId===b.leaderId && p.generation===b.generation &&
          p.acceptedTurn!==null && p.acceptedTurn<=b.requestedTurn && b.endTurn===Math.min(b.requestedTurn+def.journey.termDays,p.endTurn) &&
          (b.generation!==f.generation || !f.leader || f.leader.id===b.leaderId),path);}
    }
    var r=j.recovery;
    need(r===null || exact(r,['actorId','startTurn','purposeId','destinationId','people']) && ref(r.actorId) &&
      whole(r.startTurn) && r.startTurn>=j.startedTurn && r.purposeId===FB.travelDefault('relationship') &&
      r.destinationId===j.homeId && Array.isArray(r.people) && r.people.length>0 && r.people.length<=j.members.length &&
      r.people.indexOf(r.actorId)>=0 && r.people.every(function(id,i){var m=member(t,id);return r.people.indexOf(id)===i &&
        !!m && (id===r.actorId || r.actorId===t.actorId || m.caregiverId===r.actorId) &&
        (id===r.actorId || !m.caregiverId || r.people.indexOf(m.caregiverId)>=0);}) &&
      j.members.every(function(m){return m.status!=='following' || r.people.indexOf(m.personId)>=0;}) &&
      (!s || r.startTurn<=s.turn && (!held(member(t,r.actorId)) || !!s.chars[r.actorId])),path);
    if(r)need(['interrupted','return','returned'].indexOf(j.status)>=0,path);
    if(r){
      need(j.kind!=='ordinary_journey' || r.actorId!==t.actorId,path);
      if(s){var adult=s.chars[r.actorId],year=s.date.year+Math.floor((s.date.season*90+s.date.day-1-(s.turn-r.startTurn))/360);
        need(adult ? FB.ageOf(adult,year)>=16 : !member(t,r.actorId).caregiverId,path);}
    }
    if(j.kind==='mobile_camp')need(['return','returned'].indexOf(j.status)<0 || !!r,path);
  };
  C.validateState=function(s){
    rows(s).forEach(function(t){var j=t.journey;
      if(camp(t)){
        var def=definition(t),f=facts(s,def),b=j.carrier;
        if(['requested','active'].indexOf(j.status)>=0){
          var cap=allocation(s,def,t,j.members.filter(function(m){return j.status==='requested' ? m.status==='separated' : m.status==='following';}).map(function(m){return m.personId;}),b.realmId);
          need(cap.used+cap.requested<=cap.capacity,'state.stories.'+t.partyId+'.capacity');
          if(j.status==='active' && t.actorId===s.player.charId && !s.player.dead && !(s.chars[t.actorId] || {}).dead)
            need(!!f.participation && f.participation.locationHeld && !!s.player.travel &&
              s.player.travel.participationId===b.participationId,'state.stories.'+t.partyId+'.carrier');
        }
        j.members.forEach(function(m){if(held(m))need(!principal(s,m.personId) &&
          !personal(s,m.personId,m.personId===t.actorId && ['requested','active'].indexOf(j.status)>=0 ?
            b.participationId : null),'state.stories.'+t.partyId+'.members');});
      }
      var r=j.recovery;
      if(r && r.actorId===s.player.charId && !s.player.dead && !(s.chars[r.actorId] || {}).dead &&
        (j.status==='return' || j.status==='interrupted'))C.validateRoad(s,t);
    });
  };
  C.validateRoad=function(s,t){
    var j=t.journey,r=j.recovery,v=s.player.travel,path='state.player.travel.householdPartyId';
    need(r && v && v.householdPartyId===t.partyId && r.actorId===s.player.charId && v.startTurn===r.startTurn &&
      v.purpose===r.purposeId && v.destinationId===r.destinationId && v.destinationRealm===null && v.homeId===j.homeId &&
      v.homeId===s.player.provinceId && ['return','arrived'].indexOf(v.phase)>=0 &&
      v.phase===(j.status==='return' ? 'return' : 'arrived') && v.completed===true &&
      (!v.partyInterrupted || v.partyInterrupted===true && j.status==='interrupted') &&
      (v.phase!=='arrived' || v.partyInterrupted===true) && Number.isFinite(v.legDays) && v.legDays>0 && v.legDays<=1440 &&
      Number.isFinite(v.legDaysLeft) && v.legDaysLeft>=0 && Number.isFinite(v.cost) && v.cost>=0 && v.cost<=1000000000 &&
      v.overhead===v.cost && Object.prototype.hasOwnProperty.call(s.owner,v.currentId),path);
    need(exact(v,['purpose','householdPartyId','homeId','destinationId','destinationRealm','currentId','phase','remainingRoute',
      'outboundRoute','visited','legDaysLeft','legDays','startTurn','cost','overhead','encounters','seenCultures','seenEvents','completed'].
      concat(v.partyInterrupted===true ? ['partyInterrupted'] : [])),path);
    ['remainingRoute','outboundRoute','visited'].forEach(function(k){need(Array.isArray(v[k]) && v[k].length<=Object.keys(s.owner).length &&
      v[k].every(function(id){return Object.prototype.hasOwnProperty.call(s.owner,id);}),path);});
    need(v.outboundRoute.length===0 && v.visited.length===1 && exact(v.encounters,['culture','road']) &&
      whole(v.encounters.culture) && whole(v.encounters.road) && !!v.seenCultures && !!v.seenEvents &&
      Object.keys(v.seenCultures).every(function(id){return !!FBDATA.cultures[id] && v.seenCultures[id]===1;}) &&
      Object.keys(v.seenEvents).every(function(id){return (FBDATA.events || []).some(function(e){return e.id===id;}) && v.seenEvents[id]===1;}),path);
    var previous=v.currentId;v.remainingRoute.forEach(function(id){need(!!(FB.world.adj[previous] || {})[id],path);previous=id;});
    need(v.phase==='arrived' ? v.remainingRoute.length===0 : previous===j.homeId,path);
    j.members.forEach(function(m){if(m.status==='following')need(r.people.indexOf(m.personId)>=0 && m.lastPlace===v.currentId,path);});
    need(member(t,r.actorId) && held(member(t,r.actorId)) && member(t,r.actorId).lastPlace===v.currentId,path);
    return true;
  };
  function name(s,id){return s.chars[id] ? FB.fullName(s.chars[id]) : FB.T('Unavailable person');}
  C.menu=function(s,def,t){var out=[];
    function add(action,id,label){out.push({id:JSON.stringify([action,id || null]),action:action,personId:id || null,caregiverId:null,
      label:label,detail:FB.T('Review the exact people, separate host consent, finite places and actual private road cost.')});}
    if(t.version===1 && t.actorId===s.player.charId && t.status==='forming')add('request_camp',null,FB.T('Request named family places at camp'));
    if(t.journey){
      if(t.journey.status==='requested'){
        var f=facts(s,def);
        if(f.leader && f.leader.id===s.player.charId){
          add('accept_camp',null,FB.T('Accept these named companions'));
          add('decline_camp',null,FB.T('Decline these named companions'));
        }
      }
      t.journey.members.forEach(function(m){if(m.status==='following' &&
        (s.player.charId===t.actorId || m.personId===s.player.charId || m.caregiverId===s.player.charId))
        add('separate_person',m.personId,FB.T('Separate {name} from this journey',{name:name(s,m.personId)}));});
      t.journey.members.forEach(function(m){if(m.status==='withdrawn' &&
        (m.personId===s.player.charId || m.caregiverId===s.player.charId))
        add('rejoin_person',m.personId,FB.T('Consent to travel again for {name}',{name:name(s,m.personId)}));});
      if(t.actorId===s.player.charId && camp(t))add('camp_return',null,FB.T('Review the return home'));
      if(t.actorId!==s.player.charId && member(t,s.player.charId))add('survivor_return',null,FB.T('Review my new recovery road'));
    }
    return out;
  };
  C.describe=function(s,t,q){return [
    FB.T('Private road cost: {money:cost}. Travel time: {days} days.',{cost:q.cost,days:q.road && q.road.days || 0}),
    FB.T('Travellers or affected people: {names}.',{names:q.people.map(function(id){return name(s,id);}).join(', ') || FB.T('Nobody')}),
    FB.T('Excluded from this decision: {names}.',{names:q.excluded.map(function(id){return name(s,id);}).join(', ') || FB.T('Nobody')}),
    q.capacity ? FB.T('Companion places: {used} used, {requested} requested, {capacity} available in total. The protagonist has separate personal admission.',q.capacity) :
      FB.T('The new road carries only the reviewed existing people. Original carrier identity, residence and other obligations remain recorded.'),
    FB.T('Family refusal preserves solo admission. Withdrawing the protagonist or keeping their dependent-care group together ends personal carriage at the reached checkpoint.'),
    FB.T('Camp acceptance is separate from family consent. No people, soldiers, votes, protection, property or settlement rights are granted.')];};
  C.lines=function(s,t){
    if(!camp(t))return [];
    var labels={requested:FB.T('Awaiting host consent'),active:FB.T('Named companions admitted'),interrupted:FB.T('Family carriage ended'),
      return:FB.T('On a separately funded road'),returned:FB.T('Return road completed'),settled:FB.T('Settled through ordinary eligibility')};
    var b=t.journey.carrier;
    return [FB.T('Family places: {status}.',{status:labels[t.journey.status]}),
      FB.T('Requested commander: {name}. Original deadline in {days} days.',{name:name(s,b.leaderId),days:Math.max(0,b.endTurn-s.turn)})];
  };
})();
