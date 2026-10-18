/* A finite story projects preparation and canonical intent, never a route. */
(function () {
  'use strict';
  var W=FB.expeditionStoryPrograms={}, P=FB.expeditionPreparation, E=FB.expeditionPrograms,
    M=FB.mobile, S=FB.governmentSelection, TYPE='expedition_program', formingId=null;
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function same(a,b) {return JSON.stringify(a)===JSON.stringify(b);}
  function exact(v,fields) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).length===fields.length && fields.every(function (k) {return Object.prototype.hasOwnProperty.call(v,k);});}
  function slug(v) {return typeof v==='string' && /^[a-z][a-z0-9_]{0,199}$/.test(v);}
  function whole(v,max) {return Number.isSafeInteger(v) && v>=0 && v<=max;}
  function display(v) {return typeof v==='string' && v.length>0 && v.length<=4000;}
  function declaration(s,rid) {return (FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0];}
  function entry(s,id) {
    var story=FB.stories.get(id),def=story && story.declaration,t=s.stories && s.stories[id];
    return def && def.type===TYPE && t ? {def:def,t:t,d:declaration(s,def.realmId),
      prep:s.stories[def.preparationId]} : null;
  }
  function forRealm(s,rid) {
    var ids=FB.campaignBookmark(s).stories || [];
    for (var i=0;i<ids.length;i++) {
      var story=FB.stories.get(ids[i]),d=story && story.declaration;
      if (d && d.type===TYPE && d.realmId===rid) return entry(s,d.id);
    }
    return null;
  }
  function leader(e) {
    var b=e.prep && e.prep.bindings.filter(function (b) {return b.memberId===e.d.mobile.opening.leaderMemberId;})[0];
    return b && b.characterId;
  }
  function key(def,d) {return JSON.stringify([def,d.mobile]);}
  function formed(e) {
    var f=e.prep && e.prep.formed;
    return f ? {migrationId:f.migrationId,hostId:f.hostId,leaderGeneration:f.generation} : null;
  }
  function originals(s,e) {
    var r=M.row(s,e.def.realmId),f=e.prep && e.prep.formed, moving=M.migration(s,e.def.realmId);
    return !!(e.d && e.prep && key(e.def,e.d)===e.t.definitionKey && leader(e)===e.t.actorId &&
      e.prep.realmGeneration===e.t.realmGeneration && f && r && moving &&
      r.leaderId===e.t.actorId && r.command.leaderGeneration===f.generation &&
      moving.id===f.migrationId && moving.hostId===f.hostId &&
      same(r.openingBindings,e.prep.bindings) && same(M.commandIssuer(s,e.def.realmId),e.prep.issuer) &&
      M.commandValid(s,e.def.realmId));
  }
  function view(s,e) {
    if (e.t.status==='closed') return {status:'closed',reason:e.t.reason};
    if (s.turn>=e.t.endTurn) return {status:'closed',reason:'expired'};
    if (!e.prep || e.prep.status==='closed' || e.prep.status==='preparing' && s.turn>=e.prep.endTurn)
      return {status:'closed',reason:'preparation_closed'};
    if (e.prep.status==='preparing') return {status:'preparing',reason:null};
    var r=M.row(s,e.def.realmId),p=r && r.expeditionProgram;
    if (!p) return {status:'paused',reason:'authority'};
    if (p.status!=='active') return {status:'closed',reason:p.status==='cancelled' ? 'stopped' :
      p.steps.some(function (v) {return v.status==='expired';}) ? 'expired' : 'complete'};
    if (!originals(s,e)) return {status:'paused',reason:'authority'};
    return p.schema>=2 && p.execution.paused ? {status:'paused',reason:'manual'} : {status:'active',reason:null};
  }
  function sync(s,e) {
    var v=view(s,e),f=formed(e),changed=e.t.status!==v.status || e.t.reason!==v.reason || !same(e.t.formation,f);
    if (v.status==='closed' && e.t.status!=='closed') {
      if (e.prep && e.prep.status==='preparing' && s.turn>=e.prep.endTurn)
        FB.stories.get(e.def.preparationId).day(s,e.prep);
      E.endIntent(s,e.def.realmId);e.t.closedTurn=s.turn;
    }
    e.t.status=v.status;e.t.reason=v.reason;e.t.formation=f;
    if (changed) e.t.revision++;
  }
  function available(s,e) {return !!e && e.t.lastActionTurn!==s.turn && view(s,e).status!=='closed';}
  W.allowPreparationAI=function (s,rid) {var e=forRealm(s,rid);return !e || e.def.ai==='advance' && available(s,e);};
  W.allowMobileAI=function (s,rid) {var e=forRealm(s,rid);return !e || e.def.ai==='advance' && available(s,e) && view(s,e).status==='active';};
  function attempt(s,e,run) {
    var id=e.def.id,result=run();
    // Formation publishes a staged stories map. Reacquire the original id.
    e=entry(s,id);e.t.lastActionTurn=s.turn;e.t.revision++;sync(s,e);return result;
  }
  function check(def,context,bm) {
    function need(ok,field) {if (!ok) throw new Error('Invalid expedition story program: '+field+'.');}
    var fields=['id','type','title','intro','requires','preparationId','realmId','commandId','programId','termDays','ai'];
    need(exact(def,fields) && display(def.title) && display(def.intro) &&
      [def.preparationId,def.realmId,def.commandId,def.programId].every(slug) &&
      whole(def.termDays,1440) && def.termDays>0 && ['hold','advance','refuse'].indexOf(def.ai)>=0,'fields');
    var parent=context.get(def.preparationId),pd=parent && parent.declaration;
    need(same(def.requires,[def.preparationId]) && pd && pd.type==='expedition_preparation' && pd.realmId===def.realmId,'preparation');
    if (!bm) return;
    var d=(bm.realms || []).filter(function (d) {return d.id===def.realmId;})[0],m=d && d.mobile,p=m && m.expeditionProgram;
    need(m && m.preparationId===def.preparationId && m.command && m.command.id===def.commandId &&
      !m.columns && p && p.id===def.programId && p.commandId===def.commandId &&
      Array.isArray(p.steps) && p.steps.length>0 && p.steps.length<=16,'canonical program');
    need(def.termDays===Math.max.apply(null,p.steps.map(function (a) {return a.window.endTurn;})) &&
      pd.termDays<=def.termDays && p.steps.reduce(function (n,a) {return n+(a.adapter==='route' ? a.terms.waypoints.length : 0);},0)<=32,'bounds');
    need((bm.stories || []).indexOf(def.id)>=0,'attachment');
    (bm.stories || []).forEach(function (id) {
      var other=context.get(id),o=other && other.declaration;
      if (o && o.type===TYPE && id!==def.id) need(o.realmId!==def.realmId,'duplicate realm');
    });
  }
  /* Direct owner APIs, preparation automation and mobile daily dispatch all
     share the same budget and original-person guard for this opt-in story. */
  var preparationReview=P.review, preparationCommit=P.commit, stepReview=E.review, stepCommit=E.commit,
    sourceReview=S.reviewSource,sourceCommit=S.commitSource;
  P.review=function (s,id,action,actorId) {
    var q=preparationReview(s,id,action,actorId),story=FB.stories.get(id),d=story && story.declaration,
      e=d && forRealm(s,d.realmId);
    if (e && e.def.preparationId===id) {
      q.composition=copy(e.t);
      if (!available(s,e) || leader(e)!==e.t.actorId) {
        q.allowed=false;q.reason=e.t.lastActionTurn===s.turn ? 'daily_limit' : 'authority';
      }
    }
    return q;
  };
  P.commit=function (s,q) {
    var story=q && FB.stories.get(q.id),d=story && story.declaration,e=d && forRealm(s,d.realmId);
    if (!e || e.def.preparationId!==q.id) return preparationCommit(s,q);
    if (!q.allowed || !same(q,P.review(s,q.id,q.action,q.actorId))) return false;
    return attempt(s,e,function () {
      var previous=formingId;formingId=q.action==='form' ? e.def.id : null;
      try {return preparationCommit(s,q);} finally {formingId=previous;}
    });
  };
  E.review=function (s,rid,stepId,actor) {
    var q=stepReview(s,rid,stepId,actor),e=forRealm(s,rid);
    if (e) {
      q.composition=copy(e.t);
      if (!available(s,e) || view(s,e).status!=='active' || !originals(s,e)) {
        q.allowed=false;q.reason=e.t.lastActionTurn===s.turn ? 'daily_limit' : view(s,e).status==='paused' ? 'paused' : 'authority';
      }
    }
    return q;
  };
  E.commit=function (s,q) {
    var e=q && forRealm(s,q.realmId);
    if (!e) return stepCommit(s,q);
    if (!E.matchesReview(s,q)) return false;
    return attempt(s,e,function () {return stepCommit(s,q);});
  };
  S.reviewSource=function (s,id,request) {
    var q=sourceReview(s,id,request),e=id===TYPE && request && forRealm(s,request.realmId);
    if (e && q) {
      // Keep adapter-owned quote fields exact for its canonical apply check.
      q.composition=copy(e.t);
      if (!available(s,e) || !originals(s,e)) {
        q.review.allowed=false;q.review.reason=e.t.lastActionTurn===s.turn ? 'daily_limit' : 'authority';
      }
    }
    return q;
  };
  S.commitSource=function (s,q) {
    var e=q && q.source===TYPE && q.request && forRealm(s,q.request.realmId);
    if (!e) return sourceCommit(s,q);
    if (!available(s,e) || !originals(s,e) || !same(q,E.reviewControl(s,q.request)) || !q.review.allowed) return false;
    return attempt(s,e,function () {return sourceCommit(s,q);});
  };
  W.review=function (s,id,action,actorId,stepId) {
    var e=entry(s,id),q={id:id,action:action,actorId:actorId,stepId:stepId===undefined ? null : stepId,
      allowed:false,reason:'program',operation:null,facts:null};
    if (!e) return q;
    var v=view(s,e),actor=s.chars[actorId];
    q.facts={record:copy(e.t),preparation:copy(e.prep),turn:s.turn,view:v};
    if (!available(s,e)) {q.reason=e.t.lastActionTurn===s.turn ? 'daily_limit' : 'closed';return q;}
    if (!actor || actor.dead || actorId!==e.t.actorId &&
        !(v.status==='preparing' && actorId===e.prep.provider.characterId)) return q;
    if (v.status==='preparing') {
      if (q.stepId!==null) return q;
      q.operation={kind:'preparation',review:P.review(s,e.def.preparationId,action,actorId)};
      q.allowed=q.operation.review.allowed;q.reason=q.operation.review.reason;return q;
    }
    if (actorId!==e.t.actorId) return q;
    if (action==='step') {
      q.operation={kind:'step',review:E.review(s,e.def.realmId,q.stepId,{kind:'character',id:actorId})};
    } else if (q.stepId===null && (action==='stop' || action==='refuse')) {
      q.operation={kind:'end'};q.allowed=true;q.reason=null;return q;
    } else if (q.stepId===null && ['pause','resume'].indexOf(action)>=0) {
      q.operation={kind:'control',review:E.reviewControl(s,{realmId:e.def.realmId,action:action,
        stepId:null,actor:{kind:'character',id:actorId}})};
    } else if (action==='wait' && q.stepId===null) {
      q.allowed=true;q.reason=null;return q;
    } else return q;
    var inner=q.operation.review;
    q.allowed=originals(s,e) && (q.operation.kind==='control' ? inner.review.allowed : inner.allowed);
    q.reason=q.allowed ? null : !originals(s,e) ? 'authority' :
      q.operation.kind==='control' ? inner.review.reason : inner.reason;return q;
  };
  W.commit=function (s,q) {
    if (!q || !q.allowed || !same(q,W.review(s,q.id,q.action,q.actorId,q.stepId))) return false;
    var e=entry(s,q.id),op=q.operation,result;
    if (!op) return attempt(s,e,function () {return true;});
    if (op.kind==='end') return attempt(s,e,function () {
      E.endIntent(s,e.def.realmId);e.t.status='closed';e.t.reason=q.action==='refuse' ? 'refused' : 'stopped';
      e.t.closedTurn=s.turn;return true;
    });
    if (op.kind==='preparation') result=P.commit(s,op.review);
    else if (op.kind==='step') result=E.commit(s,op.review);
    else result=S.commitSource(s,op.review);
    if (result && q.action==='refuse') {e=entry(s,q.id);e.t.reason='refused';}
    return result;
  };
  function factory(def) {
    function validate(t,s) {
      function need(ok) {if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+def.id}));}
      need(exact(t,['version','definitionKey','preparationId','realmId','commandId','programId','actorId','realmGeneration',
        'openedTurn','endTurn','closedTurn','reason','revision','status','lastActionTurn','formation']));
      need(t.version===1 && typeof t.definitionKey==='string' && t.preparationId===def.preparationId && t.realmId===def.realmId &&
        t.commandId===def.commandId && t.programId===def.programId && typeof t.actorId==='string' && t.actorId.length<=200 &&
        whole(t.realmGeneration,1000000000) && t.realmGeneration>0 && t.openedTurn===0 && t.endTurn===def.termDays &&
        whole(t.revision,1000000000) && Number.isSafeInteger(t.lastActionTurn) && t.lastActionTurn>=-1 && t.lastActionTurn<t.endTurn &&
        ['preparing','active','paused','closed'].indexOf(t.status)>=0 &&
        (t.lastActionTurn===-1 || t.revision>0));
      need(t.status==='closed' ? whole(t.closedTurn,Number.MAX_SAFE_INTEGER) && t.revision>0 &&
        ['expired','preparation_closed','stopped','refused','complete'].indexOf(t.reason)>=0 &&
        (t.reason!=='expired' || t.closedTurn>=t.endTurn || t.formation!==null) : t.closedTurn===null &&
        (t.status==='paused' ? ['manual','authority'].indexOf(t.reason)>=0 : t.reason===null));
      need(t.formation===null ? t.status==='preparing' || t.status==='closed' :
        exact(t.formation,['migrationId','hostId','leaderGeneration']) && typeof t.formation.migrationId==='string' &&
        typeof t.formation.hostId==='string' && whole(t.formation.leaderGeneration,1000000000) && t.formation.leaderGeneration>0);
      if (!s) return;
      var e=entry(s,def.id);need(e && e.d && e.prep && key(def,e.d)===t.definitionKey &&
        t.actorId===leader(e) && !!s.chars[t.actorId] && t.realmGeneration===e.prep.realmGeneration &&
        (t.formation===null || same(t.formation,formed(e))) && t.lastActionTurn<=s.turn &&
        (t.closedTurn===null || t.closedTurn<=s.turn && t.closedTurn>=t.lastActionTurn));
      if (t.status==='preparing') need(t.formation===null && (e.prep.status!=='formed' || formingId===def.id));
      if (t.formation!==null) need(e.prep.status==='formed' && t.lastActionTurn>=e.prep.formed.turn);
      if (t.status==='active' || t.status==='paused') need(e.prep.status==='formed' && t.formation!==null);
      if (t.status==='closed' && t.formation===null) need(e.prep.status==='closed');
      if (t.status==='closed' && t.formation!==null) {
        var r=M.row(s,def.realmId),p=r && r.expeditionProgram;
        need(p && p.status!=='active' && (t.reason==='stopped' || t.reason==='refused' ? p.status==='cancelled' :
          t.reason==='complete' ? p.status==='complete' && !p.steps.some(function (a) {return a.status==='expired';}) :
          t.reason==='expired' && (t.closedTurn>=t.endTurn || p.steps.some(function (a) {return a.status==='expired';}))));
      }
    }
    function day(s) {
      var e=entry(s,def.id);sync(s,e);
      if (e.t.status==='closed' || !available(s,e) || def.ai==='hold') return;
      var actor=e.t.actorId;
      if (actor===s.player.charId) return;
      // Preparation's own provider/leader policy retains its separate consent.
      if (e.t.status==='preparing') {
        if (def.ai==='refuse') W.commit(s,W.review(s,def.id,'refuse',actor));
        return;
      }
      if (def.ai==='refuse') W.commit(s,W.review(s,def.id,'refuse',actor));
      // The mobile daily owner alone chooses and dispatches active steps.
    }
    return {id:def.id,kind:'world',requires:def.requires,
      init:function (s) {
        if (s.turn!==0) return;
        var d=declaration(s,def.realmId),prep=s.stories[def.preparationId],e={d:d,prep:prep};
        return {version:1,definitionKey:key(def,d),preparationId:def.preparationId,realmId:def.realmId,commandId:def.commandId,
          programId:def.programId,actorId:leader(e),realmGeneration:prep.realmGeneration,openedTurn:0,endTurn:def.termDays,
          closedTurn:null,reason:null,revision:0,status:'preparing',lastActionTurn:-1,formation:null};
      },validate:validate,day:day,title:function () {return FB.T(def.title);},intro:function () {return FB.T(def.intro);},
      status:function (s) {
        var e=entry(s,def.id),v=view(s,e),r=M.row(s,def.realmId),p=r && r.expeditionProgram,
          labels={preparing:FB.T('Preparing'),active:FB.T('Active'),paused:FB.T('Paused'),closed:FB.T('Closed')},
          reasons={expired:FB.T('Expired'),preparation_closed:FB.T('Preparation ended without departure.'),
            stopped:FB.T('Stopped'),refused:FB.T('Declined'),complete:FB.T('All program opportunities have ended.'),
            manual:FB.T('Program intent is paused.'),authority:FB.T('The original command is unavailable.')};
        var lines=[FB.T('Program: {status}. Last eligible day: {day}.',{status:labels[v.status],day:def.termDays-1}),
          v.reason ? reasons[v.reason] : FB.T('Reviews use the original people, current consent and actual public resources.'),
          FB.T('Stopping intent does not end a vow or paid service, return the host, or refund money.')];
        if (p) p.steps.forEach(function (step,i) {
          var a=e.d.mobile.expeditionProgram.steps[i],status={pending:FB.T('Pending'),complete:FB.T('Completed'),cancelled:FB.T('Cancelled'),expired:FB.T('Expired')};
          lines.push(FB.T('Step {number}: {status}. Observed waypoints: {count}.',{number:i+1,status:status[step.status],count:step.cursor}));
          if (a.adapter==='holy_objective') lines.push(FB.T('The current religious objective requires separate voluntary admission and the actual field host.'));
        });
        return {phase:v.status,name:FB.T(def.title),lines:lines};
      },people:function (s,t) {return [{characterId:t.actorId,label:FB.T('Original commander'),
        detail:FB.T('The program never passes to a replacement commander or heir.'),reason:''}];},
      choices:function (s) {
        var e=entry(s,def.id),v=view(s,e),out=[],actor=s.player.charId;
        if (v.status==='closed') return out;
        if (v.status==='preparing') return FB.stories.get(def.preparationId).choices(s,e.prep);
        if (actor!==e.t.actorId) return out;
        e.d.mobile.expeditionProgram.steps.forEach(function (a,i) {out.push({id:'step:'+a.id,
          label:FB.T('Review program step {number}',{number:i+1}),detail:FB.T('Use the current canonical operation and observe actual arrival. No outcome is promised.')});});
        out.push({id:v.status==='paused' ? 'resume' : 'pause',label:v.status==='paused' ? FB.T('Resume intent') : FB.T('Pause intent'),
          detail:FB.T('Retain the existing host and all current commitments.')});
        return out.concat([{id:'wait',label:FB.T('Wait'),detail:FB.T('Use this day without dispatch, payment or departure.')},
          {id:'refuse',label:FB.T('Decline further intent'),detail:FB.T('End prospective orders while retaining actual people and independent commitments.')},
          {id:'stop',label:FB.T('Stop the program'),detail:FB.T('Stop only matching program orders. No return journey or refund is supplied.')}]);
      },quote:function (s,t,id) {return W.review(s,def.id,id.indexOf('step:')===0 ? 'step' : id,s.player.charId,
        id.indexOf('step:')===0 ? id.slice(5) : null);},
      apply:function (s,t,id,q) {return !!q && q.id===def.id && q.actorId===s.player.charId &&
        (q.action==='step' ? id==='step:'+q.stepId : id===q.action) && W.commit(s,q);},
      blocker:function (s,t,reason) {
        var reasons={daily_limit:FB.T('This day’s program action has already been attempted.'),
          closed:FB.T('This finite program opportunity has ended.'),authority:FB.T('The original living command or provider is unavailable.'),
          paused:FB.T('Intent is paused. Review resuming it or keep waiting.'),funds:FB.T('The paying account lacks the exact public cost.'),
          resources:FB.T('The actual host lacks the declared people, carried provisions or public funds.'),
          access:FB.T('The current route requires lawful access.'),consent:FB.T('The original participants or provider have not given current consent.'),
          provisions:FB.T('The local market lacks the required provisions at the accepted price.'),
          population:FB.T('The local source cannot supply the required actual residents.'),window:FB.T('This opportunity has not opened yet.'),
          expired:FB.T('This opportunity has expired.'),dependency:FB.T('The required earlier steps have not completed.'),
          command:FB.T('The original command mandate is unavailable.'),host:FB.T('The original field host is unavailable.'),
          commitment:FB.T('An independent or changed order prevents this program action.'),
          campaign:FB.T('The originally bound religious campaign is no longer current.'),
          objective:FB.T('The current religious objective changed. Review it again.'),
          unavailable:FB.T('The underlying operation is currently unavailable.')};
        return reasons[reason] || FB.T('Review the original command, consent, current resources, opportunity window and this day’s remaining program action.');
      },
      review:function (s,t,id,q) {
        if (q.operation && q.operation.kind==='preparation') return FB.stories.get(def.preparationId).review(s,
          s.stories[def.preparationId],id,q.operation.review);
        var operation=q.operation && q.operation.kind==='step' && q.operation.review.operation,
          cost=operation ? operation.review.cost || 0 : 0;
        return [FB.T('Current public operation cost: {cost}.',{cost:cost}),
          FB.T('One current program action may be attempted per day. Review changes no resources.'),
          FB.T('The underlying operation retains its actual public costs and access requirements. Vows, service and the civilian camp remain independent.')];
      }};
  }
  FB.stories.registerType(TYPE,factory,'js/story_expedition_program.js',check);
  var platform=FB.save.v4.validatePlatform;
  FB.save.v4.validatePlatform=function (s) {
    platform(s);
    (FB.campaignBookmark(s).stories || []).forEach(function (id) {
      var story=FB.stories.get(id),def=story && story.declaration;
      if (def && def.type===TYPE) {
        var e=entry(s,id);
        if (!e) throw new Error(FB.T('Missing saved expedition story program.'));
        story.validate(e.t,s);
      }
    });return true;
  };
})();
