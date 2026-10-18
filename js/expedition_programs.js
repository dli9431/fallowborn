/* Bounded expedition intent over canonical command, movement and supply owners. */
(function () {
  'use strict';
  var E=FB.expeditionPrograms={}, M=FB.mobile, adapters=Object.create(null);
  function own(v,k) {return !!v && Object.prototype.hasOwnProperty.call(v,k);}
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function keys(v,list) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).length===list.length && Object.keys(v).every(function (k) {return list.indexOf(k)>=0;});}
  function id(v) {return typeof v==='string' && /^[a-z][a-z0-9_]{0,95}$/.test(v);}
  function bound(v,max) {return Number.isFinite(v) && v>=0 && v<=max;}
  function integer(v,max) {return Number.isSafeInteger(v) && bound(v,max);}
  function unique(v,max,valid) {return Array.isArray(v) && v.length<=max && v.every(function (x,i) {
    return v.indexOf(x)===i && valid(x);
  });}
  function mode(v) {return v==='field' || v==='camp';}
  function liveObjective(step) {return step.adapter==='holy_objective';}
  function ordered(step) {return step.adapter==='route' || liveObjective(step);}
  function religiousProgram(p) {return p.steps.some(liveObjective);}
  function campaignIdentity(v) {return typeof v==='string' && v.length<=96 && /^ghw_[1-9][0-9]*$/.test(v);}
  function alive(s,c) {return !!c && !c.dead && !c.prisonerOf && !c.captive && !c.imprisoned && !c.exiled &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id));}
  function declaration(s,rid) {
    return (FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0] || null;
  }
  function specification(s,rid) {var d=declaration(s,rid);return d && d.mobile && d.mobile.expeditionProgram;}
  function canonical(c,action,terms) {
    var request={realmId:c.rid,action:action,terms:terms,actor:c.actor};
    if (c.row.columns) {request.terms.columnId=c.step.columnId;return M.reviewColumns(c.s,request);}
    return M.review(c.s,request);
  }
  function register(name,validate,review) {adapters[name]={validate:validate,review:review};}
  register('wait',function (t) {return keys(t,[]);},function () {return {observation:'waiting',operation:null};});
  register('route',function (t,c) {
    return keys(t,['mode','waypoints']) && mode(t.mode) && Array.isArray(t.waypoints) &&
      t.waypoints.length>0 && t.waypoints.length<=16 && t.waypoints.every(c.county);
  },function (c) {
    var target=c.step.terms.waypoints[c.saved.cursor], camp=c.step.terms.mode==='camp';
    if (c.host.at===target && (!camp || c.moving.at===target)) return {observation:'reached',operation:null};
    return {observation:'route',operation:canonical(c,camp ? 'move' : 'march',{countyId:target})};
  });
  register('holy_objective',function (t,c) {
    return keys(t,[]) && !c.mobile.columns;
  },function (c) {
    var g=c.s.greatHolyWar, part=g && ['attackers','defenders'].reduce(function (found,camp) {
      return found || (g.participants[camp] || []).filter(function (p) {return p.realm===c.rid;})[0];
    },null), vow=part && part.mobileVow;
    if (!g || g.phase!=='active' || !vow || !part.mustered || c.host.warId!=='holy' ||
        vow.hostId!==c.host.id || vow.leaderId!==c.actor.id || vow.generation!==c.row.command.leaderGeneration ||
        !FB.mobileGreatHolyWarEffective(c.s,c.rid)) return {observation:'unavailable',operation:null};
    var target=FB.greatHolyWarArmyGoal(c.s,c.rid,c.host.at);
    /* The canonical goal may fall back to a capital when there is no live
       objective. That fallback is not a new expedition or a return journey. */
    if (!target || g.objectiveCounties.indexOf(target)<0) return {observation:'unavailable',operation:null};
    return {observation:c.host.at===target ? 'reached' : 'route',
      operation:c.host.at===target ? null : canonical(c,'march',{countyId:target}),
      objective:{campaignId:g.id,countyId:target,stamp:JSON.stringify(g)}};
  });
  register('supply',function (t,c) {
    return keys(t,['action']) && ['trade','recruit','load','unload'].indexOf(t.action)>=0 &&
      !!c.profile.supplyPolicy && (!!c.mobile.columns || t.action==='trade' || t.action==='recruit');
  },function (c) {
    return {observation:'supply',operation:c.row.columns ?
      M.columnSupplyReview(c.s,c.rid,c.step.columnId,c.step.terms.action,c.actor) :
      M.supplyReview(c.s,c.rid,c.step.terms.action,c.actor)};
  });
  register('war',function (t,c) {
    /* The canonical mobile owner currently supports one aggression objective.
       Other claim packages need their own supported canonical adapter. */
    return keys(t,['causes']) && Array.isArray(t.causes) && t.causes.length===1 &&
      keys(t.causes[0],['type','enemy','target']) && t.causes[0].type==='aggression' &&
      own(c.realms,t.causes[0].enemy) && t.causes[0].enemy!==c.rid && c.county(t.causes[0].target);
  },function (c) {
    var causes=copy(c.step.terms.causes);
    causes.forEach(function (v) {v.enemy=FB.startRealmId(c.s,v.enemy);});
    return {observation:'objective',operation:canonical(c,'war',{causes:causes})};
  });
  register('access_offer',function (t,c) {
    return keys(t,['partnerRealmId','countyIds','capacity','allowRecruit','price','duration']) &&
      own(c.realms,t.partnerRealmId) && t.partnerRealmId!==c.rid &&
      unique(t.countyIds,16,c.county) && t.countyIds.length>0 && integer(t.capacity,100000000) && t.capacity>0 &&
      typeof t.allowRecruit==='boolean' && integer(t.price,1000000) && integer(t.duration,1440) && t.duration>0;
  },function (c) {
    var t=c.step.terms;
    /* An offer never asserts the partner's acceptance or grants passage. */
    return {observation:'offer',operation:M.review(c.s,{realmId:c.rid,action:'offer',actor:c.actor,
      terms:{kind:'access',partnerId:FB.startRealmId(c.s,t.partnerRealmId),countyIds:t.countyIds.slice(),capacity:t.capacity,
        allowRecruit:t.allowRecruit,price:t.price,duration:t.duration,levy:0}})};
  });
  E.adapterIds=function () {return Object.keys(adapters);};
  /* The program owns prospective strategic orders even while paused or
     expired. Defeat and retreat remain under the ordinary army owner. */
  E.ownsOrders=function (s,a) {
    var r=a && M.row(s,a.realm);
    if (!r || !r.expeditionProgram || !a.mobileFollowing || a.broken!==undefined) return false;
    var p=specification(s,a.realm),moving=M.migration(s,a.realm);
    return !!(p && religiousProgram(p) && moving && moving.hostId===a.id);
  };
  E.definitionFaults=function (d,provinces,realms,profiles) {
    var t=d.mobile, p=t && t.expeditionProgram;
    if (p===undefined) return [];
    function bad() {return [FB.T('Invalid expedition program declaration.')];}
    var counties=Object.create(null), seen=Object.create(null), profile=t && (profiles || FBDATA.mobileProfiles)[t.profileId];
    (provinces || []).forEach(function (pr) {if (!pr.wasteland) counties[pr.id]=true;});
    var context={rid:d.id,mobile:t,realms:realms,profile:profile,county:function (v) {return typeof v==='string' && own(counties,v);}};
    if (!t.command || !t.opening || !profile || !keys(p,['schema','id','commandId','steps']) || p.schema!==1 ||
        !id(p.id) || p.commandId!==t.command.id || !Array.isArray(p.steps) || !p.steps.length || p.steps.length>16) return bad();
    for (var i=0;i<p.steps.length;i++) {
      var a=p.steps[i], req=a && a.requirements, adapter=a && own(adapters,a.adapter) && adapters[a.adapter];
      if (!keys(a,['id','after','window','columnId','adapter','terms','requirements']) || !id(a.id) || own(seen,a.id) ||
          !unique(a.after,16,function (v) {return typeof v==='string' && own(seen,v);}) ||
          !keys(a.window,['startTurn','endTurn']) || !integer(a.window.startTurn,1439) ||
          !integer(a.window.endTurn,1440) || a.window.endTurn<=a.window.startTurn ||
          (t.columns ? !t.columns.entries.some(function (c) {return c.id===a.columnId;}) : a.columnId!==null) ||
          !keys(req,['minMen','minFood','minTreasury','memberIds','access']) || !integer(req.minMen,100000000) ||
          !bound(req.minFood,1000000000) || !bound(req.minTreasury,1000000) ||
          !unique(req.memberIds,32,function (v) {return t.opening.principals.some(function (b) {return b.memberId===v;});}) ||
          !keys(req.access,['mode','countyIds']) || !mode(req.access.mode) || !unique(req.access.countyIds,16,context.county) ||
          !adapter || !adapter.validate(a.terms,context)) return bad();
      seen[a.id]=true;
    }
    return [];
  };
  var faults=M.definitionFaults;
  M.definitionFaults=function (d,formId,provinces,realms,profiles,bookmark) {
    var errors=faults(d,formId,provinces,realms,profiles,bookmark);
    return errors.length ? errors : E.definitionFaults(d,provinces,realms,profiles);
  };
  var initialize=M.initialize;
  M.initialize=function (s,defs) {
    var fresh=defs.filter(function (d) {return d.mobile && d.mobile.preparationId===undefined && d.mobile.expeditionProgram!==undefined && !M.row(s,d.id);});
    /* Preflight the complete batch before any existing initializer mutates it. */
    fresh.forEach(function (d) {
      var actual=declaration(s,d.id);
      if (!actual || JSON.stringify(actual.mobile)!==JSON.stringify(d.mobile) || !M.openingPlan(s,d).allowed)
        throw new Error(FB.T('Invalid expedition program declaration.'));
    });
    initialize(s,defs);
    fresh.forEach(function (d) {
      E.initialize(s,d);
    });
  };
  E.initialize=function (s,d) {
    var p=d.mobile.expeditionProgram;
    if (p!==undefined && !M.row(s,d.id).expeditionProgram)
      M.row(s,d.id).expeditionProgram={schema:1,id:p.id,commandId:p.commandId,definitionKey:JSON.stringify(p),status:'active',
        steps:p.steps.map(function (a) {return {id:a.id,status:'pending',cursor:0};})};
  };
  function recordValid(p,r) {
    if (!r || !keys(r,r.schema>=2 ? ['schema','id','commandId','definitionKey','status','steps','execution'] :
        ['schema','id','commandId','definitionKey','status','steps']) || [1,2,3].indexOf(r.schema)<0 ||
        r.schema===2 && religiousProgram(p) || r.schema===3 && !religiousProgram(p) || r.id!==p.id ||
        r.commandId!==p.commandId || r.definitionKey!==JSON.stringify(p) || ['active','cancelled','complete'].indexOf(r.status)<0 ||
        !Array.isArray(r.steps) || r.steps.length!==p.steps.length) return false;
    var done=Object.create(null);
    var valid=r.steps.every(function (v,i) {
      var a=p.steps[i], route=a.adapter==='route', complete=v && v.status==='complete';
      if (!keys(v,['id','status','cursor']) || v.id!==a.id || ['pending','complete','cancelled','expired'].indexOf(v.status)<0 ||
          !integer(v.cursor,route ? a.terms.waypoints.length : 0) ||
          route && (complete ? v.cursor!==a.terms.waypoints.length : v.cursor>=a.terms.waypoints.length) ||
          (complete || v.cursor>0) && !a.after.every(function (id) {return done[id];}) ||
          r.status==='complete' && v.status==='pending') return false;
      done[v.id]=complete;return true;
    });
    if (!valid) return false;
    if (r.schema===1) return !religiousProgram(p) || r.status==='active' && r.steps.every(function (v) {
      return v.status==='pending' && v.cursor===0;
    });
    var e=r.execution;
    return keys(e,r.schema===3 ? ['revision','lastTurn','paused','orders','lastCommitTurn','campaignId'] :
      ['revision','lastTurn','paused','orders']) && integer(e.revision,1000000000) &&
      Number.isSafeInteger(e.lastTurn) && e.lastTurn>=-1 && e.lastTurn<=1440 && typeof e.paused==='boolean' &&
      (r.schema!==3 || Number.isSafeInteger(e.lastCommitTurn) && e.lastCommitTurn>=-1 && e.lastCommitTurn<=1439) &&
      (r.schema!==3 || e.campaignId===null || campaignIdentity(e.campaignId) && e.lastCommitTurn>=0) &&
      (r.schema!==3 || r.steps.every(function (v,i) {return v.status!=='complete' || e.lastCommitTurn>=0 &&
        (!liveObjective(p.steps[i]) || e.campaignId!==null);})) &&
      Array.isArray(e.orders) && e.orders.length<=4 && (!e.orders.length || r.status==='active' && !e.paused) &&
      e.orders.every(function (o,i) {
        var n=p.steps.map(function (a) {return a.id;}).indexOf(o && o.stepId), a=p.steps[n], v=r.steps[n];
        return a && keys(o,liveObjective(a) ?
          ['stepId','hostId','countyId','mode','actorId','commandRevision','leaderGeneration','warId','issuedTurn','campaignId'] :
          ['stepId','hostId','countyId','mode','actorId','commandRevision','leaderGeneration','warId','issuedTurn']) &&
          ordered(a) && v.status==='pending' && (liveObjective(a) ? r.schema===3 && typeof o.countyId==='string' &&
            o.countyId.length>0 && o.countyId.length<=160 &&
            o.mode==='field' && o.warId==='holy' && campaignIdentity(o.campaignId) && o.campaignId===e.campaignId :
            o.countyId===a.terms.waypoints[v.cursor] && o.mode===a.terms.mode) &&
          typeof o.hostId==='string' && o.hostId.length>0 && o.hostId.length<=160 &&
          typeof o.actorId==='string' && o.actorId.length>0 && o.actorId.length<=160 &&
          integer(o.commandRevision,1000000000) && integer(o.leaderGeneration,1000000000) && integer(o.issuedTurn,1439) &&
          (o.warId===null || typeof o.warId==='string' && o.warId.length>0 && o.warId.length<=160) &&
          e.orders.slice(0,i).every(function (b) {return b.stepId!==o.stepId && b.hostId!==o.hostId;});
      });
  }
  var validate=M.validate;
  M.validate=function (s) {
    validate(s);
    var bm=FB.campaignBookmark(s);
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid);if (!r) return;
      var p=specification(s,rid);
      if (p===undefined ? r.expeditionProgram!==undefined : !recordValid(p,r.expeditionProgram) ||
          r.expeditionProgram.schema>=2 && (r.expeditionProgram.execution.lastTurn>s.turn ||
            r.expeditionProgram.schema===3 && r.expeditionProgram.execution.lastCommitTurn>s.turn ||
            r.expeditionProgram.execution.orders.some(function (o) {
              var a=p.steps.filter(function (v) {return v.id===o.stepId;})[0], c=r.columns &&
                r.columns.entries.filter(function (v) {return v.id===a.columnId;})[0];
              var moving=M.migration(s,rid);
              return o.issuedTurn>s.turn || liveObjective(a) && !(bm.provinces || []).some(function (pr) {
                return pr.id===o.countyId && !pr.wasteland;
              }) ||
                r.expeditionProgram.schema===3 && o.issuedTurn>r.expeditionProgram.execution.lastCommitTurn ||
                o.hostId!==(c ? c.hostId : moving && moving.hostId) || !s.chars[o.actorId] ||
                o.commandRevision>r.command.revision || o.leaderGeneration>FB.realmRulerGeneration(s,rid);
            })))
        throw new Error(FB.T('Invalid saved expedition program.'));
    });
    return true;
  };
  function project(s,rid,stepId,actor,ownedMarch) {
    var p=specification(s,rid), r=M.row(s,rid), saved=r && r.expeditionProgram;
    var q={realmId:rid,stepId:stepId,actor:actor===undefined || actor===null ? null : copy(actor),allowed:false,reason:'program',
      observation:null,operation:null,facts:null,signature:null};
    function no(reason) {q.reason=reason;return q;}
    if (!p || !recordValid(p,saved) || saved.status!=='active' || r.status!=='active') return q;
    if (saved.schema>=2 && saved.execution.paused) return no('paused');
    var index=p.steps.map(function (a) {return a.id;}).indexOf(stepId), leader=M.leader(s,rid);
    if (index<0) return q;
    var step=p.steps[index], checkpoint=saved.steps[index];
    if (q.actor===null) q.actor=leader ? {kind:'character',id:leader.id} : null;
    if (checkpoint.status!=='pending') return no('closed');
    if (!ownedMarch && saved.schema===3 && saved.execution.lastCommitTurn===s.turn) return no('daily_limit');
    if (s.turn<step.window.startTurn) return no('window');
    if (s.turn>=step.window.endTurn) return no('expired');
    if (!step.after.every(function (id) {return saved.steps.some(function (a) {return a.id===id && a.status==='complete';});})) return no('dependency');
    if (!M.commandValid(s,rid) || !keys(q.actor,['kind','id']) || q.actor.kind!=='character') return no('command');
    var column=r.columns && r.columns.entries.filter(function (c) {return c.id===step.columnId;})[0];
    var host=column ? (s.armies || []).filter(function (a) {return a.id===column.hostId && a.realm===rid;})[0] : M.host(s,rid);
    var moving=M.migration(s,rid), req=step.requirements;
    if (!host || !moving || moving.endTurn<=s.turn || column && column.status!=='active') return no('host');
    var ticket=saved.schema>=2 && saved.execution.orders.filter(function (o) {return o.stepId===stepId;})[0];
    if (ticket && (ticket.commandRevision!==r.command.revision || ticket.leaderGeneration!==r.command.leaderGeneration ||
        ticket.actorId!==q.actor.id || ticket.hostId!==host.id || ticket.warId!==(host.warId || null))) return no('commitment');
    if (column ? !M.columnAuthority(s,rid,column.id,q.actor) : !leader || q.actor.id!==leader.id) return no('command');
    if (!alive(s,s.chars[q.actor.id]) || !req.memberIds.every(function (id) {
      return r.members.some(function (m) {return m.id===id && m.allegiance && alive(s,s.chars[m.principal.id]);});
    })) return no('consent');
    q.facts={hostId:host.id,columnId:step.columnId,fieldCountyId:host.at,campCountyId:moving.at,
      men:host.men,fieldFood:host.mobileFood,campFood:r.food,treasury:FB.treasuryAvailable(s,rid),cursor:checkpoint.cursor};
    if (host.men<req.minMen || host.mobileFood<req.minFood || q.facts.treasury<req.minTreasury) return no('resources');
    if (!req.access.countyIds.every(function (pid) {return M.passage(s,rid,pid,req.access.mode==='camp');})) return no('access');
    /* Pending manual movement and broken hosts remain under the army owner. */
    if (host.broken!==undefined || host.manual || host.holdManual || !ownedMarch && (host.moveLeft>0 || (host.path || []).length) ||
        saved.schema>=2 && saved.execution.orders.some(function (o) {return o.hostId===host.id && o.stepId!==stepId;})) return no('commitment');
    var outcome=adapters[step.adapter].review({s:s,rid:rid,row:r,host:host,moving:moving,actor:q.actor,step:step,saved:checkpoint});
    q.observation=outcome.observation;q.operation=outcome.operation;
    if (liveObjective(step)) {
      q.objective=outcome.objective || null;
      if (saved.schema===3 && saved.execution.campaignId!==null &&
          (!q.objective || saved.execution.campaignId!==q.objective.campaignId)) return no('campaign');
      if (ticket && (!q.objective || ticket.campaignId!==q.objective.campaignId || ticket.countyId!==q.objective.countyId))
        return no('objective');
    }
    if (q.operation && !q.operation.review.allowed) return no(q.operation.review.reason);
    if (!q.operation && step.adapter!=='wait' && q.observation!=='reached') return no('unavailable');
    q.allowed=true;q.reason=null;
    q.signature=JSON.stringify([s.turn,s.date.year,p,r,q.actor,M.commandSnapshot(s,rid),host,moving,
      req.access.countyIds.map(function (pid) {return [pid,s.owner[pid],s.holder[pid]];}),q.facts,q.operation,q.objective]);
    return q;
  }
  E.review=function (s,rid,stepId,actor) {return project(s,rid,stepId,actor,false);};
  E.matchesReview=function (s,q) {
    return !!q && q.allowed && JSON.stringify(E.review(s,q.realmId,q.stepId,q.actor))===JSON.stringify(q);
  };
  function execution(r) {
    if (r.schema===1) {
      r.schema=religiousProgram(JSON.parse(r.definitionKey)) ? 3 : 2;
      r.execution={revision:0,lastTurn:-1,paused:false,orders:[]};
      if (r.schema===3) {r.execution.lastCommitTurn=-1;r.execution.campaignId=null;}
    }
    return r.execution;
  }
  function changed(r) {execution(r.expeditionProgram).revision++;r.revision++;}
  function hostFor(s,rid,step) {
    var r=M.row(s,rid),c=r.columns && r.columns.entries.filter(function (v) {return v.id===step.columnId;})[0];
    return c ? (s.armies || []).filter(function (a) {return a.realm===rid && a.id===c.hostId;})[0] : M.host(s,rid);
  }
  function orderOwned(a,o) {
    return a && a.id===o.hostId && a.goal===o.countyId && a.mobileCourt===(o.mode==='camp') &&
      a.broken===undefined && !a.manual && !a.holdManual;
  }
  /* A stop changes only this owner's still-matching order, never position,
     retreat orders or another commander's replacement route. */
  function stopOrder(s,rid,o,exceptHost) {
    var a=(s.armies || []).filter(function (a) {return a.realm===rid && a.id===o.hostId;})[0];
    if (a && a.id!==exceptHost && orderOwned(a,o)) {a.path=[];a.goal=null;a.moveLeft=0;}
  }
  function stopOrders(s,rid,exceptHost) {
    var r=M.row(s,rid),p=r.expeditionProgram;
    if (p.schema>=2) {p.execution.orders.forEach(function (o) {stopOrder(s,rid,o,exceptHost);});p.execution.orders=[];}
  }
  function finish(r) {
    var p=r.expeditionProgram;
    if (p.status==='active' && p.steps.every(function (v) {return v.status!=='pending';})) {p.status='complete';return true;}
    return false;
  }
  var dispatching=null, S=FB.governmentSelection;
  function canonicalCommit(s,q) {
    var previous=dispatching;dispatching=s;
    try {return M.commit(s,q);} finally {dispatching=previous;}
  }
  E.commit=function (s,q) {
    if (!E.matchesReview(s,q)) return false;
    var r=M.row(s,q.realmId),p=specification(s,q.realmId),n=p.steps.map(function (v) {return v.id;}).indexOf(q.stepId);
    var step=p.steps[n],saved=r.expeditionProgram,checkpoint=saved.steps[n],a=hostFor(s,q.realmId,step);
    if (saved.schema===3 && saved.execution.lastCommitTurn===s.turn) return false;
    /* The full review is checked before, and the canonical envelope is checked
       again inside its transaction. A refusal leaves every checkpoint intact. */
    if (q.operation && !canonicalCommit(s,q.operation)) return false;
    var e=execution(saved);
    if (saved.schema===3) e.lastCommitTurn=s.turn;
    if (liveObjective(step)) e.campaignId=q.objective.campaignId;
    e.orders=e.orders.filter(function (o) {return o.stepId!==step.id;});
    if (ordered(step) && q.operation) {
      var ticket={stepId:step.id,hostId:a.id,countyId:liveObjective(step) ? q.objective.countyId : step.terms.waypoints[checkpoint.cursor],
        mode:liveObjective(step) ? 'field' : step.terms.mode,
        actorId:q.actor.id,commandRevision:r.command.revision,leaderGeneration:r.command.leaderGeneration,
        warId:a.warId || null,issuedTurn:s.turn};
      if (liveObjective(step)) ticket.campaignId=q.objective.campaignId;
      e.orders.push(ticket);
    } else {
      if (step.adapter==='route') checkpoint.cursor++;
      if (step.adapter!=='route' || checkpoint.cursor===step.terms.waypoints.length) checkpoint.status='complete';
    }
    finish(r);changed(r);return true;
  };
  function controlQuote(s,request) {
    var q={allowed:false,reason:'program',signature:null,route:null};
    if (!keys(request,['realmId','action','stepId','actor'])) return q;
    var rid=request.realmId,r=M.row(s,rid),p=specification(s,rid),saved=r && r.expeditionProgram,leader=M.leader(s,rid);
    if (!p || !recordValid(p,saved) || saved.status!=='active' || !M.commandValid(s,rid) ||
        !keys(request.actor,['kind','id']) || request.actor.kind!=='character' || !leader || request.actor.id!==leader.id ||
        !alive(s,leader) || ['pause','resume','cancel','redirect'].indexOf(request.action)<0) return q;
    var paused=saved.schema>=2 && saved.execution.paused;
    if (request.action==='redirect') {
      var step=p.steps.filter(function (a) {return a.id===request.stepId;})[0];
      if (!step || step.adapter!=='route') return q;
      /* Preview the declared alternative after stopping only owned orders.
         The real route is still re-reviewed separately before dispatch. */
      var candidate=copy(s),cr=M.row(candidate,rid);stopOrders(candidate,rid);
      execution(cr.expeditionProgram).paused=false;
      q.route=E.review(candidate,rid,step.id,request.actor);
      if (!q.route.allowed) {q.reason=q.route.reason;return q;}
    } else if (request.stepId!==null || request.action==='pause' && paused || request.action==='resume' && !paused) return q;
    q.allowed=true;q.reason=null;
    q.signature=JSON.stringify([s.turn,saved,r,M.commandSnapshot(s,rid),s.armies,M.migration(s,rid)]);return q;
  }
  S.registerSource('expedition_program',{
    quote:controlQuote,
    apply:function (s,request,q) {
      if (JSON.stringify(controlQuote(s,request))!==JSON.stringify(q) || !q.allowed) return false;
      var r=M.row(s,request.realmId),p=r.expeditionProgram,e=execution(p),spec=specification(s,request.realmId);
      stopOrders(s,request.realmId);
      if (request.action==='cancel') {
        p.status='cancelled';p.steps.forEach(function (v) {if (v.status==='pending') v.status='cancelled';});
      } else if (request.action==='redirect') {
        var target=spec.steps.filter(function (v) {return v.id===request.stepId;})[0];
        spec.steps.forEach(function (a,i) {
          if (a.id!==target.id && a.columnId===target.columnId && p.steps[i].status==='pending') p.steps[i].status='cancelled';
        });
        e.paused=false;
      } else e.paused=request.action==='pause';
      changed(r);return true;
    }
  });
  E.reviewControl=function (s,request) {return S.reviewSource(s,'expedition_program',request);};
  /* Observe the common transaction boundary, including direct UI/source calls.
     Only our own successful commits carry the synchronous dispatch permit. */
  var commitSource=S.commitSource;
  S.commitSource=function (s,q) {
    var result=commitSource(s,q);
    if (!result || dispatching===s || !q || ['mobile_columns','coalition_leadership','mobile_command'].indexOf(q.source)<0) return result;
    var request=q.request,r=request && M.row(s,request.realmId),p=r && r.expeditionProgram;
    if (!p || p.status!=='active') return result;
    /* Outside acceptance and personal member decisions are facts to recheck,
       rather than manual orders from the command. */
    if (q.source==='coalition_leadership' && ['pledge','leave','join','accept','assent','support'].indexOf(request.action)>=0) return result;
    var t=request.terms || {},c=r.columns && r.columns.entries.filter(function (v) {return v.id===t.columnId;})[0];
    var replacement=request.action==='march' || request.action==='move';
    stopOrders(s,request.realmId,replacement ? c ? c.hostId : M.host(s,request.realmId) && M.host(s,request.realmId).id : null);
    execution(p).paused=true;changed(r);return result;
  };
  var orderArmy=FB.orderArmy;
  FB.orderArmy=function (s,a,pid,plan) {
    var result=orderArmy(s,a,pid,plan),r=a && M.row(s,a.realm),p=r && r.expeditionProgram;
    if (result && dispatching!==s && p && p.status==='active') {
      stopOrders(s,a.realm,a.id);execution(p).paused=true;changed(r);
    }
    return result;
  };
  function activeRealms(s,fn) {
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid),p=r && r.expeditionProgram;
      if (p && p.status==='active') fn(rid,r,p,specification(s,rid));
    });
  }
  E.reconcile=function (s) {
    activeRealms(s,function (rid,r,saved,p) {
      if (!p || !recordValid(p,saved)) return;
      var e=saved.schema>=2 && saved.execution;
      var manual=false;
      if (e) e.orders=e.orders.filter(function (o) {
        var step=p.steps.filter(function (a) {return a.id===o.stepId;})[0],a=hostFor(s,rid,step);
        /* Only our own in-flight ticket may bypass the halted-host review
           guard. All current command, resources and route gates still run. */
        var q=project(s,rid,step.id,{kind:'character',id:o.actorId},true);
        var moving=M.migration(s,rid),arrived=a && a.at===o.countyId && !a.moveLeft && !(a.path || []).length &&
          (o.mode!=='camp' || moving && moving.at===o.countyId);
        var valid=q.allowed && r.command.revision===o.commandRevision && r.command.leaderGeneration===o.leaderGeneration &&
          a && (a.warId || null)===o.warId && (arrived || orderOwned(a,o)) &&
          (a.path || []).every(function (pid) {return M.passage(s,rid,pid,o.mode==='camp');});
        if (valid) return true;
        if (a && (a.manual || a.holdManual || !arrived && !orderOwned(a,o)) || a && (a.warId || null)!==o.warId ||
            r.command.revision!==o.commandRevision || r.command.leaderGeneration!==o.leaderGeneration) manual=true;
        stopOrder(s,rid,o);changed(r);return false;
      });
      if (manual) {stopOrders(s,rid);e.paused=true;changed(r);}
      p.steps.forEach(function (a,i) {
        if (saved.steps[i].status==='pending' && s.turn>=a.window.endTurn) {saved.steps[i].status='expired';changed(r);}
      });
      if (finish(r)) changed(r);
    });
  };
  E.day=function (s) {
    E.reconcile(s);
    activeRealms(s,function (rid,r,saved,p) {
      var leader=M.leader(s,rid);
      if (!p || !recordValid(p,saved) || r.status!=='active' || !leader || leader.id===s.player.charId || !M.commandValid(s,rid)) return;
      var e=execution(saved);if (e.paused || e.lastTurn===s.turn) return;
      e.lastTurn=Math.min(1440,s.turn);changed(r);
      var used=Object.create(null);
      p.steps.forEach(function (step) {
        var key=step.columnId || rid,a=hostFor(s,rid,step),c=r.columns && r.columns.entries.filter(function (v) {return v.id===step.columnId;})[0];
        if (used[key] || c && c.commanderId===s.player.charId || !a || e.orders.some(function (o) {
          return o.hostId===a.id && (a.moveLeft>0 || (a.path || []).length);
        })) return;
        var q=E.review(s,rid,step.id);
        if (q.allowed && E.commit(s,q)) used[key]=true;
      });
    });
  };
  var ai=M.ai;
  M.ai=function (s,rid) {return M.row(s,rid) && M.row(s,rid).expeditionProgram ? false : ai(s,rid);};
  var day=M.day;
  M.day=function (s) {E.reconcile(s);var result=day(s);E.day(s);return result;};
  FB.mobileDay=M.day;
})();
