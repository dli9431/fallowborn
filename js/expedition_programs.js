/* Bounded expedition intent. Reviews project existing transactions and actual
   carriers; they neither dispatch orders nor advance saved checkpoints. */
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
    var fresh=defs.filter(function (d) {return d.mobile && d.mobile.expeditionProgram!==undefined && !M.row(s,d.id);});
    /* Preflight the complete batch before any existing initializer mutates it. */
    fresh.forEach(function (d) {
      var actual=declaration(s,d.id);
      if (!actual || JSON.stringify(actual.mobile)!==JSON.stringify(d.mobile) || !M.openingPlan(s,d).allowed)
        throw new Error(FB.T('Invalid expedition program declaration.'));
    });
    initialize(s,defs);
    fresh.forEach(function (d) {
      var p=d.mobile.expeditionProgram;
      M.row(s,d.id).expeditionProgram={schema:1,id:p.id,commandId:p.commandId,definitionKey:JSON.stringify(p),status:'active',
        steps:p.steps.map(function (a) {return {id:a.id,status:'pending',cursor:0};})};
    });
  };
  function recordValid(p,r) {
    if (!keys(r,['schema','id','commandId','definitionKey','status','steps']) || r.schema!==1 || r.id!==p.id ||
        r.commandId!==p.commandId || r.definitionKey!==JSON.stringify(p) || ['active','cancelled','complete'].indexOf(r.status)<0 ||
        !Array.isArray(r.steps) || r.steps.length!==p.steps.length) return false;
    var done=Object.create(null);
    return r.steps.every(function (v,i) {
      var a=p.steps[i], route=a.adapter==='route', complete=v && v.status==='complete';
      if (!keys(v,['id','status','cursor']) || v.id!==a.id || ['pending','complete','cancelled','expired'].indexOf(v.status)<0 ||
          !integer(v.cursor,route ? a.terms.waypoints.length : 0) ||
          route && (complete ? v.cursor!==a.terms.waypoints.length : v.cursor>=a.terms.waypoints.length) ||
          (complete || v.cursor>0) && !a.after.every(function (id) {return done[id];}) ||
          r.status==='complete' && v.status==='pending') return false;
      done[v.id]=complete;return true;
    });
  }
  var validate=M.validate;
  M.validate=function (s) {
    validate(s);
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid);if (!r) return;
      var p=specification(s,rid);
      if (p===undefined ? r.expeditionProgram!==undefined : !recordValid(p,r.expeditionProgram))
        throw new Error(FB.T('Invalid saved expedition program.'));
    });
    return true;
  };
  E.review=function (s,rid,stepId,actor) {
    var p=specification(s,rid), r=M.row(s,rid), saved=r && r.expeditionProgram;
    var q={realmId:rid,stepId:stepId,actor:actor===undefined || actor===null ? null : copy(actor),allowed:false,reason:'program',
      observation:null,operation:null,facts:null,signature:null};
    function no(reason) {q.reason=reason;return q;}
    if (!p || !recordValid(p,saved) || saved.status!=='active' || r.status!=='active') return q;
    var index=p.steps.map(function (a) {return a.id;}).indexOf(stepId), leader=M.leader(s,rid);
    if (index<0) return q;
    var step=p.steps[index], checkpoint=saved.steps[index];
    if (q.actor===null) q.actor=leader ? {kind:'character',id:leader.id} : null;
    if (checkpoint.status!=='pending') return no('closed');
    if (s.turn<step.window.startTurn) return no('window');
    if (s.turn>=step.window.endTurn) return no('expired');
    if (!step.after.every(function (id) {return saved.steps.some(function (a) {return a.id===id && a.status==='complete';});})) return no('dependency');
    if (!M.commandValid(s,rid) || !keys(q.actor,['kind','id']) || q.actor.kind!=='character') return no('command');
    var column=r.columns && r.columns.entries.filter(function (c) {return c.id===step.columnId;})[0];
    var host=column ? (s.armies || []).filter(function (a) {return a.id===column.hostId && a.realm===rid;})[0] : M.host(s,rid);
    var moving=M.migration(s,rid), req=step.requirements;
    if (!host || !moving || moving.endTurn<=s.turn || column && column.status!=='active') return no('host');
    if (column ? !M.columnAuthority(s,rid,column.id,q.actor) : !leader || q.actor.id!==leader.id) return no('command');
    if (!alive(s,s.chars[q.actor.id]) || !req.memberIds.every(function (id) {
      return r.members.some(function (m) {return m.id===id && m.allegiance && alive(s,s.chars[m.principal.id]);});
    })) return no('consent');
    q.facts={hostId:host.id,columnId:step.columnId,fieldCountyId:host.at,campCountyId:moving.at,
      men:host.men,fieldFood:host.mobileFood,campFood:r.food,treasury:FB.treasuryAvailable(s,rid),cursor:checkpoint.cursor};
    if (host.men<req.minMen || host.mobileFood<req.minFood || q.facts.treasury<req.minTreasury) return no('resources');
    if (!req.access.countyIds.every(function (pid) {return M.passage(s,rid,pid,req.access.mode==='camp');})) return no('access');
    /* Pending manual movement and broken hosts remain under the army owner. */
    if (host.moveLeft>0 || (host.path || []).length || host.broken!==undefined) return no('commitment');
    var outcome=adapters[step.adapter].review({s:s,rid:rid,row:r,host:host,moving:moving,actor:q.actor,step:step,saved:checkpoint});
    q.observation=outcome.observation;q.operation=outcome.operation;
    if (q.operation && !q.operation.review.allowed) return no(q.operation.review.reason);
    if (!q.operation && step.adapter!=='wait' && q.observation!=='reached') return no('unavailable');
    q.allowed=true;q.reason=null;
    q.signature=JSON.stringify([s.turn,s.date.year,p,r,q.actor,M.commandSnapshot(s,rid),host,moving,
      req.access.countyIds.map(function (pid) {return [pid,s.owner[pid],s.holder[pid]];}),q.facts,q.operation]);
    return q;
  };
  E.matchesReview=function (s,q) {
    return !!q && q.allowed && JSON.stringify(E.review(s,q.realmId,q.stepId,q.actor))===JSON.stringify(q);
  };
})();
