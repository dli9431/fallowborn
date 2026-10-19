/* Original personal parties remain separate from civilian and military pools.
   Protective guard is not a conviction, criminal custody or safe passage. */
(function () {
  'use strict';
  var M=FB.mobile, S=FB.governmentSelection, partyIndex=new WeakMap();
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function own(v,k) {return !!v && Object.prototype.hasOwnProperty.call(v,k);}
  function keys(v,list) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).length===list.length && Object.keys(v).every(function (k) {return list.indexOf(k)>=0;});}
  function whole(n) {return Number.isSafeInteger(n) && n>=0;}
  function free(s,c) {return !!c && !c.dead && !c.captive && !c.prisonerOf && !c.imprisoned && !c.exiled &&
    !(s.player && s.player.charId===c.id && (s.player.dead || s.player.flags && s.player.flags.in_prison)) &&
    !(s.justice && s.justice.exiles && s.justice.exiles[c.id] && s.justice.exiles[c.id].endTurn>s.turn) &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)) &&
    !(s.intrigue && Array.isArray(s.intrigue.captives) && s.intrigue.captives.some(function (row) {return row.captiveId===c.id;}));}
  function definition(s,rid) {
    var d=(FB.campaignBookmark(s).realms || []).filter(function (v) {return v.id===rid;})[0];
    return d && d.mobile && d.mobile.guardedParty;
  }
  function record(s,rid) {var r=M.row(s,rid);return r && r.guardedParty;}
  /* These identities are immutable within a campaign. Index only the bounded
     opted-in parties, leaving ordinary per-character reads constant-time. */
  function entries(s) {
    var root=s.authority && s.authority.governments, cached=partyIndex.get(s);
    if (cached && cached.root===root) return cached.rows;
    var rows=Object.keys(root || {}).map(function (rid) {return {realmId:rid,guard:record(s,rid)};})
      .filter(function (v) {return !!v.guard;});
    partyIndex.set(s,{root:root,rows:rows});return rows;
  }
  function personal(s,c) {return !!(c.travel || c.religiousActivity ||
    s.player && s.player.charId===c.id && s.player.travel ||
    FB.householdParties && FB.householdParties.journeys && FB.householdParties.journeys.location(s,c.id));}
  function localControl(s,rid,pid) {return !!s.realms[rid] && s.realms[rid].alive &&
    s.holder[pid]===rid && s.owner[pid]===FB.topRealm(s,rid);}
  function authority(s,g) {
    var rid=FB.startRealmId(s,g.declaration.hostRealmId), c=s.chars[g.authority.characterId];
    var current=rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid);
    return free(s,c) && !(FB.characterGuarded && FB.characterGuarded(s,c.id)) && current && current.id===c.id &&
      FB.realmRulerGeneration(s,rid)===g.authority.generation &&
      localControl(s,rid,g.declaration.location.countyId) ? c : null;
  }
  function disposition(s,rid,g) {
    if (g.status==='released' || g.status==='interrupted') return g.status;
    var r=M.row(s,rid), c=s.chars[g.characterIds[0]];
    if (!r || r.status!=='active' || !s.realms[rid].alive || !free(s,c) || !authority(s,g)) return 'interrupted';
    return s.turn>=g.endTurn ? 'expired' : 'guarded';
  }
  M.separatePartyMember=function (s,rid,cid) {
    var g=record(s,rid);return !!g && g.characterIds.indexOf(cid)>=0;
  };
  FB.characterGuarded=function (s,cid) {
    return entries(s).some(function (v) {return v.guard.status!=='released' && v.guard.characterIds.indexOf(cid)>=0;});
  };
  FB.guardedPartyResidence=function (s,cid) {
    var entry=entries(s).filter(function (v) {return v.guard.characterIds.indexOf(cid)>=0;})[0];
    if (!entry) return null;
    var g=entry.guard, c=s.chars[cid];
    if (!free(s,c)) return null;
    if (g.status!=='released') return g.declaration.location.countyId;
    return c && (cid===s.player.charId ? s.player.provinceId : c.householdResidenceId || c.homeProvinceId) || null;
  };
  M.guardCommandReach=function (s,rid,cid) {
    if (!M.separatePartyMember(s,rid,cid)) return true;
    var g=record(s,rid), c=s.chars[cid], moving=M.migration(s,rid);
    return g.status==='released' && !!moving && !!c && !personal(s,c) && FB.characterLocation(s,c)===moving.at;
  };
  /* Hosting consent belongs to the original parties, independently of an
     effective military mandate. Guard never revives ended or expired access. */
  M.guardHostedLeader=function (s,rid) {
    var g=record(s,rid), r=M.row(s,rid), c=g && s.chars[g.characterIds[0]];
    return !!g && !!r && r.leaderId===g.characterIds[0] && free(s,c) &&
      disposition(s,rid,g)!=='interrupted';
  };
  M.guardedOpeningBinding=function (d,b) {
    var t=d.mobile, g=t && t.guardedParty;
    return !!g && !!t.opening && b.memberId===t.opening.leaderMemberId && b.person &&
      Array.isArray(g.actorIds) && g.actorIds[0]===b.person.actorId;
  };
  var faults=M.definitionFaults;
  M.definitionFaults=function (d,formId,provinces,realms,profiles,bookmark) {
    var errors=faults(d,formId,provinces,realms,profiles,bookmark), t=d.mobile, g=t && t.guardedParty;
    if (g===undefined || errors.length) return errors;
    function fail() {errors.push(FB.T('Invalid protective guard declaration.'));return errors;}
    if (!keys(g,['schema','id','kind','location','hostRealmId','hostActorId','actorIds','duration','release']) ||
        g.schema!==1 || typeof g.id!=='string' || !/^[a-z][a-z0-9_]{0,47}$/.test(g.id) ||
        g.kind!=='protective_guard' || g.release!=='host_review' || !t.opening || !t.command || t.preparationId!==undefined ||
        t.command.landedCommandLink!==undefined || !bookmark || !bookmark.opening || !bookmark.opening.actors ||
        !keys(g.location,own(g.location,'siteId') ? ['countyId','siteId'] : ['countyId']) ||
        !own(realms,g.hostRealmId) || g.hostRealmId===d.id || realms[g.hostRealmId].mobile ||
        !whole(g.duration) || !g.duration || g.duration>1440 ||
        !Array.isArray(g.actorIds) || !g.actorIds.length || g.actorIds.length>16) return fail();
    var county=provinces.filter(function (v) {return v.id===g.location.countyId;})[0];
    var actors=bookmark.opening.actors, host=own(actors,g.hostActorId) && actors[g.hostActorId];
    var leader=t.opening.principals.filter(function (b) {return b.memberId===t.opening.leaderMemberId;})[0];
    if (!county || county.wasteland || county.realm!==g.hostRealmId ||
        own(g.location,'siteId') && !FB.householdStories.localityValid({provinceId:county.id,siteId:g.location.siteId},bookmark) ||
        !host || !host.ref || host.ref.kind!=='realm_ruler' || host.ref.realmId!==g.hostRealmId ||
        !leader || leader.person.actorId!==g.actorIds[0] ||
        t.command.superior && t.command.superior.kind==='opening_actor' && g.actorIds.indexOf(t.command.superior.actorId)>=0 ||
        g.actorIds.some(function (id,i) {
          var actor=own(actors,id) && actors[id];
          return typeof id!=='string' || g.actorIds.indexOf(id)!==i || !actor || actor.ref ||
            actor.home!==g.location.countyId || id===g.hostActorId ||
            t.opening.principals.some(function (b) {return b.person.actorId===id && b.memberId!==t.opening.leaderMemberId;});
        })) return fail();
    /* Cross-following exclusivity includes companions, not only principals. */
    if ((bookmark.realms || []).some(function (other) {
      if (other.id===d.id || !other.mobile) return false;
      var guard=other.mobile.guardedParty, opening=other.mobile.opening;
      return guard && Array.isArray(guard.actorIds) && guard.actorIds.some(function (id) {return g.actorIds.indexOf(id)>=0;}) ||
        opening && Array.isArray(opening.principals) && opening.principals.some(function (b) {return b.person && g.actorIds.indexOf(b.person.actorId)>=0;});
    })) return fail();
    return errors;
  };
  M.guardPlan=function (s,d) {
    var spec=d.mobile && d.mobile.guardedParty;
    if (spec===undefined) return null;
    var bm=FB.campaignBookmark(s), realms=Object.create(null);
    (bm.realms || []).forEach(function (v) {realms[v.id]=v;});
    if (s.turn!==0 || M.definitionFaults(d,FB.governments.forRealm(s,d.id).id,bm.provinces,realms,null,bm).length) return null;
    var host=FB.bookmarkActor(s,spec.hostActorId), rid=FB.startRealmId(s,spec.hostRealmId);
    var current=rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid);
    if (!free(s,host) || !current || host.id!==current.id || !localControl(s,rid,spec.location.countyId) ||
        FB.armiesHostile(s,{realm:d.id},{realm:rid}) ||
        own(spec.location,'siteId') && !(FB.world.sitesByProv[spec.location.countyId] || {list:[]}).list.some(function (v) {return v.site===spec.location.siteId;})) return null;
    var ids=spec.actorIds.map(function (id) {var c=FB.bookmarkActor(s,id);return c && c.id;});
    if (ids.some(function (id,i) {
      var c=s.chars[id];
      return !id || ids.indexOf(id)!==i || !free(s,c) || personal(s,c) ||
        c.homeProvinceId!==spec.location.countyId || FB.characterGuarded(s,id) ||
        entries(s).some(function (v) {return v.guard.characterIds.indexOf(id)>=0;});
    })) return null;
    return {schema:1,declaration:copy(spec),characterIds:ids,
      authority:{characterId:host.id,generation:FB.realmRulerGeneration(s,rid)},startTurn:0,endTurn:spec.duration,
      status:'guarded',changedTurn:0,revision:0,releaseTurn:null,releasedBy:null};
  };
  var plan=M.openingPlan;
  M.openingPlan=function (s,d) {
    var result=plan(s,d);
    if (result.allowed && d.mobile.guardedParty!==undefined) {
      result.guard=M.guardPlan(s,d);if (!result.guard) result.allowed=false;
    }
    return result;
  };
  M.initializeGuard=function (s,d,planned) {
    if (d.mobile.guardedParty===undefined) return;
    if (!planned || !planned.guard) throw new Error(FB.T('Invalid protective guard opening.'));
    M.row(s,d.id).guardedParty=copy(planned.guard);
    partyIndex.delete(s);
  };
  M.guardBirthAllowed=function (s,d) {
    var r=M.row(s,d.id), g=r && r.guardedParty;
    return s.turn===0 && !!r && r.migrationId===null && !!g && g.status==='guarded' &&
      JSON.stringify(g.declaration)===JSON.stringify(d.mobile.guardedParty) &&
      r.leaderId===g.characterIds[0] && !!authority(s,g);
  };
  M.guardBirthLeader=function (s,rid) {
    var d=(FB.campaignBookmark(s).realms || []).filter(function (v) {return v.id===rid;})[0];
    return d && M.guardBirthAllowed(s,d) ? s.chars[M.row(s,rid).leaderId] : null;
  };
  var references=M.referencesCharacter;
  M.referencesCharacter=function (s,cid) {
    return entries(s).some(function (v) {return v.guard.characterIds.indexOf(cid)>=0 || v.guard.authority.characterId===cid;}) || references(s,cid);
  };
  var local=M.localRealm;
  M.localRealm=function (s) {
    var ordinary=local(s);
    if (ordinary) return ordinary;
    var entry=entries(s).filter(function (v) {
      return v.guard.declaration.location.countyId===s.player.provinceId &&
        (v.guard.authority.characterId===s.player.charId || v.guard.characterIds.indexOf(s.player.charId)>=0);
    })[0];
    return entry ? entry.realmId : null;
  };
  var initialize=M.initialize;
  M.initialize=function (s,defs) {
    defs.forEach(function (d) {
      if (!d.mobile || d.mobile.guardedParty===undefined || M.row(s,d.id)) return;
      var declared=(FB.campaignBookmark(s).realms || []).filter(function (v) {return v.id===d.id;})[0];
      if (!declared || JSON.stringify(d.mobile)!==JSON.stringify(declared.mobile) || !M.openingPlan(s,d).allowed)
        throw new Error(FB.T('Invalid protective guard opening.'));
    });
    return initialize(s,defs);
  };
  M.guardSnapshot=function (s,rid) {
    var g=record(s,rid);
    return g ? {status:disposition(s,rid,g),location:copy(g.declaration.location),
      characterIds:g.characterIds.slice(),authority:copy(g.authority),endTurn:g.endTurn,
      commandReach:M.guardCommandReach(s,rid,g.characterIds[0])} : null;
  };
  function quote(s,request) {
    var rid=request.realmId, g=record(s,rid), r=M.row(s,rid), host=g && authority(s,g);
    var q={allowed:false,reason:'guard',cost:0,terms:{},signature:null};
    if (!keys(request,['realmId','action','actor']) || request.action!=='release' || !g || !r ||
        !keys(request.actor,['kind','id']) || request.actor.kind!=='character') return q;
    q.terms={countyId:g.declaration.location.countyId,duration:Math.max(0,g.endTurn-s.turn),partyIds:g.characterIds.slice()};
    q.signature=JSON.stringify([s.turn,g,request.actor,host || null,r.status,s.realms[rid],
      g.characterIds.map(function (id) {return [s.chars[id],FB.characterLocation(s,s.chars[id])];}),
      host && FB.characterLocation(s,host),s.owner,s.holder,M.migration(s,rid),M.commandSnapshot(s,rid),
      s.justice || null,s.intrigue || null,s.player && [s.player.charId,s.player.provinceId,s.player.travel || null]]);
    q.allowed=!!host && host.id===request.actor.id && !personal(s,host) &&
      FB.characterLocation(s,host)===g.declaration.location.countyId &&
      ['guarded','expired'].indexOf(disposition(s,rid,g))>=0 && free(s,s.chars[g.characterIds[0]]) &&
      g.characterIds.every(function (id) {var c=s.chars[id];return !!c && (c.dead || !personal(s,c));});
    if (q.allowed) q.reason=null;
    return q;
  }
  S.registerSource('mobile_guard',{
    quote:quote,
    apply:function (s,request,review) {
      if (!review.allowed || JSON.stringify(quote(s,request))!==JSON.stringify(review)) return false;
      var g=record(s,request.realmId), r=M.row(s,request.realmId);
      g.status='released';g.changedTurn=s.turn;g.releaseTurn=s.turn;g.releasedBy=copy(g.authority);g.revision++;
      r.revision++;FB.governments.invalidate();return true;
    }
  });
  M.reviewGuard=function (s,request) {return S.reviewSource(s,'mobile_guard',request);};
  var day=M.day;
  M.day=function (s) {
    entries(s).forEach(function (v) {
      var g=v.guard, next=disposition(s,v.realmId,g);
      if (next!==g.status) {g.status=next;g.changedTurn=s.turn;g.revision++;M.row(s,v.realmId).revision++;}
    });
    return day(s);
  };
  FB.mobileDay=M.day;
  var validate=M.validate;
  M.validate=function (s) {
    var seen=Object.create(null);
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid), spec=definition(s,rid), g=r && r.guardedParty;
      function fail() {throw new Error(FB.T('Invalid saved protective guard.'));}
      if (!r) return;
      if (spec===undefined) {if (g!==undefined) fail();return;}
      if (r.schema!==3 || !keys(g,['schema','declaration','characterIds','authority','startTurn','endTurn','status','changedTurn','revision','releaseTurn','releasedBy']) ||
          g.schema!==1 || JSON.stringify(g.declaration)!==JSON.stringify(spec) || g.startTurn!==0 || g.endTurn!==spec.duration ||
          !Array.isArray(g.characterIds) || g.characterIds.length!==spec.actorIds.length ||
          !keys(g.authority,['characterId','generation']) || !whole(g.authority.generation) || !g.authority.generation ||
          g.authority.generation>FB.realmRulerGeneration(s,FB.startRealmId(s,spec.hostRealmId)) ||
          !FB.bookmarkActor(s,spec.hostActorId) || FB.bookmarkActor(s,spec.hostActorId).id!==g.authority.characterId ||
          ['guarded','expired','interrupted','released'].indexOf(g.status)<0 ||
          !whole(g.changedTurn) || g.changedTurn>s.turn || !whole(g.revision) || g.revision>3 || g.revision>r.revision ||
          g.status==='guarded' && (g.revision!==0 || g.changedTurn!==0) ||
          g.status==='expired' && (g.revision!==1 || g.changedTurn<g.endTurn) ||
          g.status==='interrupted' && (g.revision<1 || g.revision>2) ||
          g.status!=='released' && (g.releaseTurn!==null || g.releasedBy!==null) ||
          g.status==='released' && (!whole(g.releaseTurn) || g.releaseTurn>s.turn || g.changedTurn!==g.releaseTurn ||
            (g.revision!==1 && g.revision!==2 || g.revision===2 && g.releaseTurn<g.endTurn) ||
            JSON.stringify(g.releasedBy)!==JSON.stringify(g.authority))) fail();
      var moving=M.migration(s,rid);
      g.characterIds.forEach(function (id,i) {
        var c=s.chars[id], actor=FB.bookmarkActor(s,spec.actorIds[i]);
        if (!c || !actor || actor.id!==id || seen[id] || moving && moving.courtIds.indexOf(id)>=0 ||
            g.status!=='released' && free(s,c) && (personal(s,c) || c.homeProvinceId!==spec.location.countyId)) fail();
        seen[id]=true;
      });
      var original=r.openingBindings && r.openingBindings.filter(function (b) {
        return b.person.actorId===spec.actorIds[0];
      })[0];
      if (!original || original.characterId!==g.characterIds[0]) fail();
    });
    return validate(s);
  };
})();
