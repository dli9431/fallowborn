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
  function localAccess(step) {return !!step && (step.adapter==='local_access' || step.adapter==='corridor_access');}
  function corridorProgram(p) {return p.steps.some(function (step) {return !!step && step.adapter==='corridor_access';});}
  function accessProgram(p) {return p.steps.some(localAccess);}
  function campaignIdentity(v) {return typeof v==='string' && v.length<=96 && /^ghw_[1-9][0-9]*$/.test(v);}
  function alive(s,c) {return !!c && !c.dead && !c.prisonerOf && !c.captive && !c.imprisoned && !c.exiled &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id));}
  function declaration(s,rid) {
    return (FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0] || null;
  }
  E.passagePolicyFaults=function (bookmark) {
    var policies=bookmark && bookmark.localPassagePolicies;
    if (policies===undefined) return [];
    if (!policies || typeof policies!=='object' || Array.isArray(policies) ||
        !Object.keys(policies).length || Object.keys(policies).length>64 || Object.keys(policies).some(function (fid) {
          var p=policies[fid];
          return !own(FBDATA.governmentForms,fid) || !keys(p,['schema','response']) || p.schema!==1 ||
            ['accept','decline'].indexOf(p.response)<0;
        })) return [FB.T('Invalid local passage policies.')];
    return [];
  };
  E.resolvePassagePolicy=function (bookmark,formId) {
    var policies=bookmark && bookmark.localPassagePolicies;
    return own(policies,formId) ? policies[formId].response : null;
  };
  function policyTerms(policies) {
    return policies===undefined ? null : Object.keys(policies).sort().map(function (fid) {
      return [fid,policies[fid].schema,policies[fid].response];
    });
  }
  E.validatePassagePolicies=function (s) {
    var bm=FB.campaignBookmark(s),policies=bm && bm.localPassagePolicies,saved=s.localPassagePolicies;
    if (E.passagePolicyFaults(bm).length || (policies===undefined ? saved!==undefined :
        !keys(saved,['schema','policies']) || saved.schema!==1 || saved.policies===undefined ||
        E.passagePolicyFaults({localPassagePolicies:saved.policies}).length ||
        JSON.stringify(policyTerms(policies))!==JSON.stringify(policyTerms(saved.policies))))
      throw new Error(FB.T('Invalid saved local passage policy provenance.'));
    return true;
  };
  E.initializePassagePolicies=function (s) {
    var bm=FB.campaignBookmark(s);
    if (E.passagePolicyFaults(bm).length) throw new Error(FB.T('Invalid local passage policies.'));
    if (bm && bm.localPassagePolicies!==undefined && s.localPassagePolicies===undefined)
      s.localPassagePolicies={schema:1,policies:copy(bm.localPassagePolicies)};
    E.validatePassagePolicies(s);
  };
  function passagePolicy(s,rid) {
    var form=FB.governments.forRealm(s,rid);
    return form ? {formId:form.id,response:E.resolvePassagePolicy(FB.campaignBookmark(s),form.id)} : null;
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
  function authority(s,pid) {
    var rid=s.holder[pid], owner=s.owner[pid], chain=[],seen=Object.create(null);
    if (!rid || FB.recruitmentCountyBlocked && (FB.recruitmentCountyBlocked(s,rid,pid) ||
        FB.recruitmentCountyBlocked(s,owner,pid))) return null;
    while (rid) {
      var realm=s.realms[rid],person=rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid);
      if (seen[rid] || chain.length>=16 || !realm || !realm.alive || !alive(s,person)) return null;
      seen[rid]=true;chain.push({courtId:rid,personId:person.id,generation:FB.realmRulerGeneration(s,rid)});
      rid=realm.liege;
    }
    return chain.length && chain[chain.length-1].courtId===owner ? chain : null;
  }
  function accessStep(s,rid,stepId) {
    var p=specification(s,rid);
    return p && p.steps.filter(function (a) {return a.id===stepId && localAccess(a);})[0];
  }
  /* Canonical offer validation calls this pure projection too. A caller cannot
     attach fabricated origin metadata to an ordinary access transaction. */
  E.accessOrigin=function (s,rid,terms) {
    var step=accessStep(s,rid,terms.programStepId),r=M.row(s,rid),leader=M.leader(s,rid);
    var saved=r && r.expeditionProgram,index=specification(s,rid) && specification(s,rid).steps.indexOf(step);
    if (!step || !r || !leader || !saved || saved.status!=='active' || saved.steps[index].status!=='pending' ||
        s.turn<step.window.startTurn || s.turn>=step.window.endTurn || !M.commandValid(s,rid) ||
        !Array.isArray(terms.countyIds) || terms.countyIds.length!==1 ||
        step.terms.countyIds.indexOf(terms.countyIds[0])<0 || terms.kind!=='access' || terms.levy!==0 ||
        ['capacity','allowRecruit','price','duration'].some(function (k) {return terms[k]!==step.terms[k];}) ||
        M.agreements(s,rid).some(function (a) {return a.accessOrigin && a.accessOrigin.stepId===step.id &&
          a.countyIds.indexOf(terms.countyIds[0])>=0;})) return null;
    if (E.corridorStep(s,rid,step.id) && !E.corridorOffer(s,rid,terms)) return null;
    var chain=authority(s,terms.countyIds[0]);
    if (!chain || chain[0].courtId!==terms.partnerId || terms.partnerId===rid) return null;
    var origin={schema:1,programId:specification(s,rid).id,stepId:step.id,offeredTurn:s.turn,commanderId:leader.id,
      commandGeneration:r.command.leaderGeneration,chain:chain};
    if (FB.campaignBookmark(s).localPassagePolicies!==undefined) {
      origin.schema=2;origin.passagePolicy=passagePolicy(s,terms.partnerId);
      if (!origin.passagePolicy) return null;
    }
    if (E.corridorStep(s,rid,step.id)) {
      var binding=r.expeditionProgram.corridor,entry=binding && binding.entries.filter(function (e) {
        return e.countyId===terms.countyIds[0];
      })[0];
      if (entry) origin.chain=copy(entry.chain);
    }
    return origin;
  };
  E.accessCurrent=function (s,rid,a) {
    if (!a.accessOrigin) return true;
    var o=a.accessOrigin,r=M.row(s,rid),leader=M.leader(s,rid),chain=authority(s,a.countyIds[0]),
      opted=FB.campaignBookmark(s).localPassagePolicies!==undefined,policy=opted && passagePolicy(s,a.partnerId);
    if (E.corridorStep(s,rid,a.programStepId)) {
      var entry=corridorEntry(r,a);
      chain=chain && entry && chain.every(function (v,i) {return entry.chain[i] &&
        v.courtId===entry.liveChain[i] && v.personId===entry.chain[i].personId && v.generation===entry.chain[i].generation;}) &&
        chain.length===entry.chain.length ? o.chain : null;
    }
    return !!(r && leader && leader.id===o.commanderId && alive(s,leader) && M.commandValid(s,rid) &&
      r.command.leaderGeneration===o.commandGeneration && chain && JSON.stringify(chain)===JSON.stringify(o.chain) &&
      (o.schema===1 ? !opted : o.schema===2 && policy && o.passagePolicy &&
        policy.formId===o.passagePolicy.formId && policy.response===o.passagePolicy.response));
  };
  E.corridorStep=function (s,rid,stepId) {
    var step=accessStep(s,rid,stepId);return !!step && step.adapter==='corridor_access';
  };
  function corridorEntries(p) {
    var entries=[];
    p.steps.forEach(function (step) {if (step.adapter==='corridor_access') step.terms.countyIds.forEach(function (pid) {
      entries.push({stepId:step.id,countyId:pid});
    });});return entries;
  }
  function corridorEntry(r,a) {
    var binding=r && r.expeditionProgram && r.expeditionProgram.corridor;
    return binding && binding.entries.filter(function (entry) {return entry.stepId===a.programStepId && entry.countyId===a.countyIds[0];})[0];
  }
  function envelopeId(p,n) {return 'corridor_'+p.id+'_'+n;}
  /* A complete prospective quote binds storage and original authorities before
     the first county offer. It grants no permission and consumes no identity. */
  E.corridorReview=function (s,rid) {
    var p=specification(s,rid),r=M.row(s,rid),host=M.host(s,rid),moving=M.migration(s,rid),leader=M.leader(s,rid);
    var denied={allowed:false,binding:null};
    if (!p || !corridorProgram(p) || !r || !host || !moving || !leader || !M.commandValid(s,rid)) return denied;
    var saved=r.expeditionProgram,binding=saved && saved.corridor,entries=corridorEntries(p),routes=[],footprint=[],money=0;
    if (!saved) return denied;
    if (entries.length<1 || entries.length>64 || (!binding && r.agreements.length+Math.ceil(entries.length/16)>M.profile(s,rid).maxAgreements)) return denied;
    function include(pid) {if (footprint.indexOf(pid)<0) footprint.push(pid);}
    var failed=false;
    p.steps.forEach(function (step,index) {
      if (step.adapter!=='route') return;
      var checkpoint=saved.steps[index],original=binding && binding.routes.filter(function (route) {return route.stepId===step.id;})[0];
      if (binding && checkpoint.status!=='pending') return;
      var at=step.terms.mode==='camp' ? moving.at : host.at,route={stepId:step.id,origin:at,legs:[]};include(at);
      step.terms.waypoints.forEach(function (target,i) {
        if (binding && i<checkpoint.cursor) return;
        var prospective=Object.assign({},host,{at:at,from:null,path:[],goal:null,moveLeft:0,mobileCourt:step.terms.mode==='camp'});
        var plan=FB.armyOrderPlan(s,prospective,target),leg=original && original.legs[i];
        if (!plan || !plan.ok || plan.requested!==target || plan.stop!==target || !Array.isArray(plan.path) ||
            (at===target ? plan.path.length!==0 : !plan.path.length || plan.path[plan.path.length-1]!==target)) {failed=true;return;}
        if (binding) {
          var full=leg && [i ? original.legs[i-1].target : original.origin].concat(leg.path),start=full && full.indexOf(at);
          if (!full || start<0 || JSON.stringify(plan.path)!==JSON.stringify(full.slice(start+1))) failed=true;
        }
        plan.path.forEach(include);route.legs.push({target:target,path:plan.path.slice()});at=target;
      });routes.push(route);
    });
    if (failed || footprint.some(function (pid) {return !entries.some(function (e) {return e.countyId===pid;});})) return denied;
    var projected=entries.map(function (entry,index) {
      var chain=authority(s,entry.countyId),old=binding && binding.entries[index],step=accessStep(s,rid,entry.stepId);
      var a=M.agreements(s,rid).filter(function (a) {return a.programStepId===entry.stepId && a.countyIds[0]===entry.countyId;})[0];
      var available=M.accessCapacity(s,entry.countyId),policy=chain && passagePolicy(s,chain[0].courtId);
      if (!chain || chain[0].courtId===rid || !policy ||
          (FB.armiesHostile(s,{realm:rid},{realm:chain[0].courtId})) ||
          binding && (!old || chain.length!==old.chain.length || chain.some(function (v,i) {
            return v.courtId!==old.liveChain[i] || v.personId!==old.chain[i].personId || v.generation!==old.chain[i].generation;
          }) || JSON.stringify(policy)!==JSON.stringify(old.passagePolicy)) ||
          a && (!E.accessCurrent(s,rid,a) || a.status==='ended' || a.endTurn<=s.turn) ||
          step.terms.capacity+available.allocated-(a && a.status==='active' ? a.capacity : 0)>available.capacity) failed=true;
      if (!a || a.status!=='active') money+=step.terms.price;
      return old || {stepId:entry.stepId,countyId:entry.countyId,chain:chain,
        liveChain:chain && chain.map(function (v) {return v.courtId;}),passagePolicy:policy};
    });
    if (failed || FB.treasuryAvailable(s,rid)<money || binding &&
        (binding.commanderId!==leader.id || binding.commandGeneration!==r.command.leaderGeneration)) return denied;
    return {allowed:true,binding:binding ? copy(binding) : {schema:1,allocatedTurn:s.turn,commanderId:leader.id,
      commandGeneration:r.command.leaderGeneration,entries:projected,routes:routes}};
  };
  E.corridorOffer=function (s,rid,t) {
    if (!E.corridorStep(s,rid,t.programStepId) || !Array.isArray(t.countyIds) || t.countyIds.length!==1) return false;
    var q=E.corridorReview(s,rid),r=M.row(s,rid),p=specification(s,rid),entries=corridorEntries(p);
    var index=entries.map(function (e) {return e.stepId+'|'+e.countyId;}).indexOf(t.programStepId+'|'+t.countyIds[0]);
    if (!q.allowed || index<0) return false;
    var envelope=r.agreements.filter(function (a) {return a.id===envelopeId(p,Math.floor(index/16));})[0];
    return !r.expeditionProgram.corridor || !!envelope && envelope.receipts[index%16]===null;
  };
  E.storeCorridorReceipt=function (s,rid,a) {
    var r=M.row(s,rid),p=specification(s,rid),q=E.corridorReview(s,rid);
    /* Called only inside a freshly rechecked canonical offer transaction. */
    if (!E.recordingAccess(s) || !q.allowed || !E.corridorOffer(s,rid,a)) return false;
    execution(r.expeditionProgram);
    if (!r.expeditionProgram.corridor) {
      r.expeditionProgram.corridor=copy(q.binding);
      for (var i=0;i<Math.ceil(q.binding.entries.length/16);i++) {
        var receipts=[];
        for (var j=0;j<Math.min(16,q.binding.entries.length-i*16);j++) receipts.push(null);
        r.agreements.push({schema:1,id:envelopeId(p,i),kind:'corridor',programId:p.id,receipts:receipts});
      }
    }
    var entries=r.expeditionProgram.corridor.entries,index=entries.map(function (e) {return e.stepId+'|'+e.countyId;}).indexOf(a.programStepId+'|'+a.countyIds[0]);
    a.id='corridor_receipt_'+rid+'_'+index;
    r.agreements.filter(function (e) {return e.id===envelopeId(p,Math.floor(index/16));})[0].receipts[index%16]=a;
    return true;
  };
  E.validateCorridor=function (s,rid) {
    var r=M.row(s,rid),p=specification(s,rid),saved=r && r.expeditionProgram,binding=saved && saved.corridor;
    var envelopes=r.agreements.filter(function (a) {return a && a.kind==='corridor';});
    function need(valid) {if (!valid) throw new Error(FB.T('Invalid saved corridor receipts.'));}
    if (!p || !corridorProgram(p)) {need(!envelopes.length && (!saved || saved.corridor===undefined));return;}
    need(!!saved && recordValid(p,saved));
    if (!binding) {
      need(!envelopes.length && !M.agreements(s,rid).some(function (a) {return a.accessOrigin;}) &&
        (saved.schema===1 || saved.schema===5 && saved.corridor===null));return;
    }
    var entries=corridorEntries(p),routes=p.steps.filter(function (step) {return step && step.adapter==='route';});
    need(saved.schema===5 && keys(binding,['schema','allocatedTurn','commanderId','commandGeneration','entries','routes']) && binding.schema===1 &&
      integer(binding.allocatedTurn,1439) && binding.allocatedTurn<=s.turn && !!s.chars[binding.commanderId] &&
      integer(binding.commandGeneration,1000000000) && binding.commandGeneration>0 &&
      Array.isArray(binding.entries) && binding.entries.length===entries.length &&
      Array.isArray(binding.routes) && binding.routes.length===routes.length && envelopes.length===Math.ceil(entries.length/16));
    var footprint=[];
    function include(pid) {if (footprint.indexOf(pid)<0) footprint.push(pid);}
    binding.routes.forEach(function (route,i) {
      var step=routes[i];
      need(keys(route,['stepId','origin','legs']) && route.stepId===step.id && typeof route.origin==='string' &&
        Array.isArray(route.legs) && route.legs.length===step.terms.waypoints.length);include(route.origin);
      route.legs.forEach(function (leg,j) {
        var origin=j ? route.legs[j-1].target : route.origin;
        need(keys(leg,['target','path']) && leg.target===step.terms.waypoints[j] && unique(leg.path,64,function (pid) {
          return entries.some(function (e) {return e.countyId===pid;});
        }) && (origin===leg.target ? leg.path.length===0 : leg.path.length>0 && leg.path[leg.path.length-1]===leg.target));
        var at=origin;leg.path.forEach(function (pid) {
          if (FB.activeBookmark && FB.activeBookmark.id===s.start.id &&
              (FB.activeBookmark.revision || 'baseline')===s.start.revision && FB.world)
            need(!!FB.world.adj[at] && !!FB.world.adj[at][pid]);
          include(pid);at=pid;
        });
      });
    });
    need(footprint.every(function (pid) {return entries.some(function (e) {return e.countyId===pid;});}));
    envelopes.forEach(function (envelope,i) {
      need(keys(envelope,['schema','id','kind','programId','receipts']) && envelope.schema===1 && envelope.id===envelopeId(p,i) &&
        envelope.kind==='corridor' && envelope.programId===p.id && Array.isArray(envelope.receipts) &&
        envelope.receipts.length===Math.min(16,entries.length-i*16));
    });
    binding.entries.forEach(function (entry,i) {
      need(keys(entry,['stepId','countyId','chain','liveChain','passagePolicy']) && entry.stepId===entries[i].stepId && entry.countyId===entries[i].countyId &&
        Array.isArray(entry.chain) && entry.chain.length>0 && entry.chain.length<=16 &&
        Array.isArray(entry.liveChain) && entry.liveChain.length===entry.chain.length &&
        keys(entry.passagePolicy,['formId','response']) && own(FBDATA.governmentForms,entry.passagePolicy.formId) &&
        entry.passagePolicy.response===E.resolvePassagePolicy(FB.campaignBookmark(s),entry.passagePolicy.formId));
      var seen=Object.create(null);
      entry.chain.forEach(function (v,j) {
        need(keys(v,['courtId','personId','generation']) && typeof v.courtId==='string' && !seen[v.courtId] && !!s.chars[v.personId] &&
          integer(v.generation,1000000000) && v.generation>0 && typeof entry.liveChain[j]==='string' && !!s.realms[entry.liveChain[j]]);
        seen[v.courtId]=true;
      });
      var a=envelopes[Math.floor(i/16)].receipts[i%16];
      if (a!==null) need(!!a && a.id==='corridor_receipt_'+rid+'_'+i && a.programStepId===entry.stepId && Array.isArray(a.countyIds) && a.countyIds.length===1 &&
        a.countyIds[0]===entry.countyId && a.partnerId===entry.liveChain[0] && !!a.accessOrigin &&
        JSON.stringify(a.accessOrigin.chain)===JSON.stringify(entry.chain) &&
        (a.accessOrigin.schema===1 ? entry.passagePolicy.response===null : JSON.stringify(a.accessOrigin.passagePolicy)===JSON.stringify(entry.passagePolicy)) &&
        a.accessOrigin.commanderId===binding.commanderId && a.accessOrigin.commandGeneration===binding.commandGeneration &&
        a.accessOrigin.offeredTurn>=binding.allocatedTurn);
    });
    need(!r.agreements.some(function (a) {return a.kind!=='corridor' && (a.accessOrigin || envelopes.some(function (e) {return e.id===a.id;}));}) &&
      M.agreements(s,rid).some(function (a) {return !!a.accessOrigin;}));
  };
  function accessTerms(t,c,limit) {
    return !c.mobile.columns && !c.mobile.civilianCamps &&
      ['offer','accept'].every(function (v) {return c.mobile.command.operations.indexOf(v)>=0;}) &&
      keys(t,['countyIds','capacity','allowRecruit','price','duration']) &&
      unique(t.countyIds,limit,c.county) && t.countyIds.length>0 && integer(t.capacity,100000000) && t.capacity>0 &&
      typeof t.allowRecruit==='boolean' && integer(t.price,1000000) && integer(t.duration,1440) && t.duration>0;
  }
  function accessReview(c) {
    var t=c.step.terms;
    for (var i=0;i<t.countyIds.length;i++) {
      var pid=t.countyIds[i],a=M.agreements(c.s,c.rid).filter(function (a) {return a.accessOrigin &&
        a.accessOrigin.stepId===c.step.id && a.countyIds[0]===pid;})[0];
      /* Once requested, original parties remain binding even if another
         agreement later happens to cover the same county. */
      if (a && (!E.accessCurrent(c.s,c.rid,a) || a.endTurn<=c.s.turn || a.status==='ended'))
        return {observation:'unavailable',operation:null};
      if (M.provisioningAccess(c.s,c.rid,pid) && (c.step.adapter!=='corridor_access' || a && a.status==='active')) continue;
      if (a) {
        if (a.status!=='offered') return {observation:'unavailable',operation:null};
        var partner=c.s.chars[a.accessOrigin.chain[0].personId],form=FB.governments.forRealm(c.s,a.partnerId);
        if (!partner || partner.id===c.s.player.charId || !form) return {observation:'outside_consent',operation:null};
        var response=E.resolvePassagePolicy(FB.campaignBookmark(c.s),form.id);
        var action=response===null ? (form.use.ai.canNegotiate(c.s,a.partnerId,{}) ? 'accept' : 'decline') : response;
        return {observation:'outside_consent',operation:M.review(c.s,{realmId:c.rid,action:action,
          actor:{kind:'realm',id:a.partnerId},terms:{agreementId:a.id}})};
      }
      return {observation:'offer',operation:M.review(c.s,{realmId:c.rid,action:'offer',actor:c.actor,
        terms:{kind:'access',partnerId:c.s.holder[pid],countyIds:[pid],capacity:t.capacity,allowRecruit:t.allowRecruit,
          price:t.price,duration:t.duration,levy:0,programStepId:c.step.id}})};
    }
    return {observation:'reached',operation:null};
  }
  register('local_access',function (t,c) {return accessTerms(t,c,16);},accessReview);
  register('corridor_access',function (t,c) {return accessTerms(t,c,64);},accessReview);
  E.adapterIds=function () {return Object.keys(adapters);};
  /* The program owns prospective strategic orders even while paused or
     expired. Defeat and retreat remain under the ordinary army owner. */
  E.ownsOrders=function (s,a) {
    var r=a && M.row(s,a.realm);
    if (!r || !r.expeditionProgram || !a.mobileFollowing || a.broken!==undefined) return false;
    var p=specification(s,a.realm),moving=M.migration(s,a.realm);
    return !!(p && (religiousProgram(p) || accessProgram(p)) && moving && moving.hostId===a.id);
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
    if (accessProgram(p) && (religiousProgram(p) || p.steps.reduce(function (n,a) {
      return n+(localAccess(a) && a.terms && Array.isArray(a.terms.countyIds) ? a.terms.countyIds.length : 0);
    },0)>(corridorProgram(p) ? 64 : 16) ||
        corridorProgram(p) && (p.steps.some(function (a) {return a && (a.adapter==='local_access' || a.adapter==='access_offer');}) ||
          !p.steps.some(function (a) {return a.adapter==='route';}) ||
          p.steps.reduce(function (n,a) {return n+(a && a.adapter==='route' && a.terms && Array.isArray(a.terms.waypoints) ? a.terms.waypoints.length : 0);},0)>32) || p.steps.some(function (a) {return a && a.adapter==='supply' && p.steps.some(function (b) {
      return b && Array.isArray(b.after) && b.after.indexOf(a.id)>=0;
    });}))) return bad();
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
    if (accessProgram(p)) {
      var requested=Object.create(null);
      if (p.steps.some(function (a) {return localAccess(a) && a.terms.countyIds.some(function (pid) {
        if (requested[pid]) return true;requested[pid]=true;return false;
      });})) return bad();
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
    if (!r || !keys(r,r.schema===5 ? ['schema','id','commandId','definitionKey','status','steps','execution','corridor'] :
        r.schema>=2 ? ['schema','id','commandId','definitionKey','status','steps','execution'] :
        ['schema','id','commandId','definitionKey','status','steps']) || [1,2,3,4,5].indexOf(r.schema)<0 ||
        r.schema===2 && (religiousProgram(p) || accessProgram(p)) || r.schema===3 && !religiousProgram(p) ||
        r.schema===4 && (!accessProgram(p) || corridorProgram(p)) || r.schema===5 && !corridorProgram(p) || r.id!==p.id ||
        r.commandId!==p.commandId || r.definitionKey!==JSON.stringify(p) || ['active','cancelled','complete'].indexOf(r.status)<0 ||
        !Array.isArray(r.steps) || r.steps.length!==p.steps.length) return false;
    var done=Object.create(null);
    var valid=r.steps.every(function (v,i) {
      var a=p.steps[i], route=a.adapter==='route', complete=v && v.status==='complete',access=r.schema>=4 && localAccess(a);
      if (!keys(v,access ? ['id','status','cursor','agreementIds'] : ['id','status','cursor']) ||
          access && !unique(v.agreementIds,a.terms.countyIds.length,function (id) {return typeof id==='string' && id.length>0 && id.length<=160;}) ||
          v.id!==a.id || ['pending','complete','cancelled','expired'].indexOf(v.status)<0 ||
          !integer(v.cursor,route ? a.terms.waypoints.length : 0) ||
          route && (complete ? v.cursor!==a.terms.waypoints.length : v.cursor>=a.terms.waypoints.length) ||
          (complete || v.cursor>0) && !a.after.every(function (id) {return done[id];}) ||
          r.status==='complete' && v.status==='pending') return false;
      done[v.id]=complete;return true;
    });
    if (!valid) return false;
    if (r.schema===1) return !religiousProgram(p) && !accessProgram(p) || r.status==='active' && r.steps.every(function (v) {
      return v.status==='pending' && v.cursor===0;
    });
    var e=r.execution;
    return keys(e,r.schema===3 ? ['revision','lastTurn','paused','orders','lastCommitTurn','campaignId'] :
      r.schema>=4 ? ['revision','lastTurn','paused','orders','lastCommitTurn'] :
      ['revision','lastTurn','paused','orders']) && integer(e.revision,1000000000) &&
      Number.isSafeInteger(e.lastTurn) && e.lastTurn>=-1 && e.lastTurn<=1440 && typeof e.paused==='boolean' &&
      (r.schema<3 || Number.isSafeInteger(e.lastCommitTurn) && e.lastCommitTurn>=-1 && e.lastCommitTurn<=1439) &&
      (r.schema!==3 || e.campaignId===null || campaignIdentity(e.campaignId) && e.lastCommitTurn>=0) &&
      (r.schema<3 || r.steps.every(function (v,i) {return v.status!=='complete' || e.lastCommitTurn>=0 &&
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
  function validAccessHistory(s,rid,r,p) {
    var used=Object.create(null);
    if (p && (!recordValid(p,r.expeditionProgram) || r.expeditionProgram.schema>=4 && !p.steps.every(function (step,i) {
      if (!localAccess(step)) return true;
      var records=M.agreements(s,rid).filter(function (a) {return a.accessOrigin && a.programStepId===step.id;});
      return JSON.stringify(records.map(function (a) {return a.id;}))===JSON.stringify(r.expeditionProgram.steps[i].agreementIds);
    }))) return false;
    return M.agreements(s,rid).every(function (a) {
      if (a.accessOrigin===undefined && a.programStepId===undefined) return true;
      var o=a.accessOrigin,step=accessStep(s,rid,a.programStepId),pid=a.countyIds && a.countyIds[0];
      var opted=FB.campaignBookmark(s).localPassagePolicies!==undefined;
      if (!step || !p || !keys(o,opted ?
          ['schema','programId','stepId','offeredTurn','commanderId','commandGeneration','chain','passagePolicy'] :
          ['schema','programId','stepId','offeredTurn','commanderId','commandGeneration','chain']) ||
          o.schema!==(opted ? 2 : 1) || opted && (!keys(o.passagePolicy,['formId','response']) ||
            !own(FBDATA.governmentForms,o.passagePolicy.formId) ||
            o.passagePolicy.response!==E.resolvePassagePolicy(FB.campaignBookmark(s),o.passagePolicy.formId)) ||
          o.programId!==p.id || o.stepId!==step.id || a.kind!=='access' || a.levy!==0 ||
          a.countyIds.length!==1 || step.terms.countyIds.indexOf(pid)<0 || used[pid] ||
          ['capacity','allowRecruit','price','duration'].some(function (k) {return a[k]!==step.terms[k];}) ||
          !integer(o.offeredTurn,1439) || o.offeredTurn>s.turn || o.offeredTurn<step.window.startTurn ||
          o.offeredTurn>=step.window.endTurn || a.startTurn<o.offeredTurn ||
          !s.chars[o.commanderId] || !integer(o.commandGeneration,1000000000) || !o.commandGeneration ||
          o.commandGeneration!==a.generations[0] ||
          !Array.isArray(o.chain) || !o.chain.length || o.chain.length>16 ||
          (corridorProgram(p) ? corridorEntry(r,a).liveChain[0] : o.chain[0].courtId)!==a.partnerId || o.chain[0].generation!==a.generations[1] ||
          r.expeditionProgram.schema<4 || r.expeditionProgram.execution.lastCommitTurn<o.offeredTurn) return false;
      var seen=Object.create(null);
      if (!o.chain.every(function (v) {
        if (!keys(v,['courtId','personId','generation']) || typeof v.courtId!=='string' || seen[v.courtId] ||
            (!corridorProgram(p) && !s.realms[v.courtId]) || !s.chars[v.personId] || !integer(v.generation,1000000000) || !v.generation) return false;
        seen[v.courtId]=true;return true;
      })) return false;
      used[pid]=true;return true;
    });
  }
  M.validate=function (s) {
    E.validatePassagePolicies(s);
    validate(s);
    var bm=FB.campaignBookmark(s);
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid);if (!r) return;
      var p=specification(s,rid);
      if (!validAccessHistory(s,rid,r,p)) throw new Error(FB.T('Invalid saved expedition access.'));
      if (p===undefined ? r.expeditionProgram!==undefined : !recordValid(p,r.expeditionProgram) ||
          r.expeditionProgram.schema>=2 && (r.expeditionProgram.execution.lastTurn>s.turn ||
            r.expeditionProgram.schema>=3 && r.expeditionProgram.execution.lastCommitTurn>s.turn ||
            r.expeditionProgram.execution.orders.some(function (o) {
              var a=p.steps.filter(function (v) {return v.id===o.stepId;})[0], c=r.columns &&
                r.columns.entries.filter(function (v) {return v.id===a.columnId;})[0];
              var moving=M.migration(s,rid);
              return o.issuedTurn>s.turn || liveObjective(a) && !(bm.provinces || []).some(function (pr) {
                return pr.id===o.countyId && !pr.wasteland;
              }) ||
                r.expeditionProgram.schema>=3 && o.issuedTurn>r.expeditionProgram.execution.lastCommitTurn ||
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
    if (!ownedMarch && saved.schema>=3 && saved.execution.lastCommitTurn===s.turn) return no('daily_limit');
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
    if (localAccess(step)) q.facts.access=step.terms.countyIds.map(function (pid) {
      return {countyId:pid,authority:authority(s,pid),agreement:M.accessAt(s,rid,pid)};
    });
    if (host.men<req.minMen || host.mobileFood<req.minFood || q.facts.treasury<req.minTreasury) return no('resources');
    if (!req.access.countyIds.every(function (pid) {return M.passage(s,rid,pid,req.access.mode==='camp');})) return no('access');
    /* Pending manual movement and broken hosts remain under the army owner. */
    if (host.broken!==undefined || host.manual || host.holdManual || !ownedMarch && (host.moveLeft>0 || (host.path || []).length) ||
        saved.schema>=2 && saved.execution.orders.some(function (o) {return o.hostId===host.id && o.stepId!==stepId;})) return no('commitment');
    if (corridorProgram(p)) {
      q.facts.corridor=E.corridorReview(s,rid);
      if (!q.facts.corridor.allowed) return no('access');
    }
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
      var p=JSON.parse(r.definitionKey);
      r.schema=religiousProgram(p) ? 3 : corridorProgram(p) ? 5 : accessProgram(p) ? 4 : 2;
      if (r.schema===5) r.corridor=null;
      r.execution={revision:0,lastTurn:-1,paused:false,orders:[]};
      if (r.schema>=3) r.execution.lastCommitTurn=-1;
      if (r.schema===3) r.execution.campaignId=null;
      if (r.schema>=4) p.steps.forEach(function (step,i) {if (localAccess(step)) r.steps[i].agreementIds=[];});
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
  E.recordingAccess=function (s) {return dispatching===s;};
  E.corridorResponseAllowed=function (s,rid,a) {
    if (!E.corridorStep(s,rid,a.programStepId)) return true;
    var saved=M.row(s,rid).expeditionProgram;
    return saved.schema===5 && saved.execution.lastCommitTurn!==s.turn &&
      (dispatching===s || !FB.expeditionStoryPrograms || FB.expeditionStoryPrograms.allowCorridorResponse(s,rid));
  };
  E.recordCorridorResponse=function (s,rid,a) {
    if (!E.corridorStep(s,rid,a.programStepId)) return;
    var saved=M.row(s,rid).expeditionProgram;saved.execution.lastCommitTurn=s.turn;
    if (dispatching!==s) {
      changed(M.row(s,rid));
      if (FB.expeditionStoryPrograms) FB.expeditionStoryPrograms.recordCorridorResponse(s,rid);
    }
  };
  function canonicalCommit(s,q) {
    var previous=dispatching;dispatching=s;
    try {return M.commit(s,q);} finally {dispatching=previous;}
  }
  E.commit=function (s,q) {
    if (!E.matchesReview(s,q)) return false;
    var r=M.row(s,q.realmId),p=specification(s,q.realmId),n=p.steps.map(function (v) {return v.id;}).indexOf(q.stepId);
    var step=p.steps[n],saved=r.expeditionProgram,checkpoint=saved.steps[n],a=hostFor(s,q.realmId,step);
    if (saved.schema>=3 && saved.execution.lastCommitTurn===s.turn) return false;
    /* The full review is checked before, and the canonical envelope is checked
       again inside its transaction. A refusal leaves every checkpoint intact. */
    if (q.operation && !canonicalCommit(s,q.operation)) return false;
    var e=execution(saved);
    if (saved.schema>=3) e.lastCommitTurn=s.turn;
    if (localAccess(step) && q.operation && q.operation.request.action==='offer')
      checkpoint.agreementIds=M.agreements(s,q.realmId).filter(function (a) {
        return a.programStepId===step.id;
      }).map(function (a) {return a.id;});
    if (liveObjective(step)) e.campaignId=q.objective.campaignId;
    e.orders=e.orders.filter(function (o) {return o.stepId!==step.id;});
    if (ordered(step) && q.operation) {
      var ticket={stepId:step.id,hostId:a.id,countyId:liveObjective(step) ? q.objective.countyId : step.terms.waypoints[checkpoint.cursor],
        mode:liveObjective(step) ? 'field' : step.terms.mode,
        actorId:q.actor.id,commandRevision:r.command.revision,leaderGeneration:r.command.leaderGeneration,
        warId:a.warId || null,issuedTurn:s.turn};
      if (liveObjective(step)) ticket.campaignId=q.objective.campaignId;
      e.orders.push(ticket);
    } else if (!localAccess(step) || !q.operation) {
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
  /* Lifecycle closure releases only this owner's prospective orders. It is
     also valid after the original mandate expires; it grants no operation. */
  E.endIntent=function (s,rid) {
    var r=M.row(s,rid),p=r && r.expeditionProgram;
    if (!p || p.status!=='active') return false;
    stopOrders(s,rid);p.status='cancelled';
    p.steps.forEach(function (v) {if (v.status==='pending') v.status='cancelled';});
    changed(r);return true;
  };
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
    if (q.source==='coalition_leadership' && ['pledge','leave','join','accept','decline','assent','support'].indexOf(request.action)>=0) return result;
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
      if (!p || !recordValid(p,saved) || r.status!=='active' || !leader || !M.commandValid(s,rid)) return;
      if (leader.id===s.player.charId && (!accessProgram(p) || !M.agreements(s,rid).some(function (a) {
        return a.accessOrigin && a.status==='offered' && a.accessOrigin.chain[0].personId!==s.player.charId;
      }))) return;
      if (FB.expeditionStoryPrograms && !FB.expeditionStoryPrograms.allowMobileAI(s,rid)) return;
      var e=execution(saved);if (e.paused || e.lastTurn===s.turn) return;
      e.lastTurn=Math.min(1440,s.turn);changed(r);
      var used=Object.create(null);
      p.steps.forEach(function (step) {
        var key=step.columnId || rid,a=hostFor(s,rid,step),c=r.columns && r.columns.entries.filter(function (v) {return v.id===step.columnId;})[0];
        if (used[key] || c && c.commanderId===s.player.charId || !a || e.orders.some(function (o) {
          return o.hostId===a.id && (a.moveLeft>0 || (a.path || []).length);
        })) return;
        var q=E.review(s,rid,step.id);
        /* The outside government responds through its own policy, even when
           the original commander is the player. No strategic AI is enabled. */
        if (leader.id===s.player.charId && !(localAccess(step) && q.operation &&
            ['accept','decline'].indexOf(q.operation.request.action)>=0)) return;
        if (q.allowed && E.commit(s,q)) used[key]=true;
      });
    });
  };
  var ai=M.ai;
  M.ai=function (s,rid) {return M.row(s,rid) && M.row(s,rid).expeditionProgram ? false : ai(s,rid);};
  var day=M.day;
  M.day=function (s) {E.reconcile(s);var result=day(s);E.day(s);return result;};
  FB.mobileDay=M.day;
  var retainedAccess=FB.courtRecordRetained;
  FB.courtRecordRetained=function (s,c,kin,links) {
    var found=Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var r=M.row(s,rid);
      var binding=r && r.expeditionProgram && r.expeditionProgram.corridor;
      return !!(binding && (binding.commanderId===c.id || binding.entries.some(function (entry) {
        return entry.chain.some(function (v) {return v.personId===c.id;});
      }))) || r && M.agreements(s,rid).some(function (a) {return a.accessOrigin &&
        (a.accessOrigin.commanderId===c.id || a.accessOrigin.chain.some(function (v) {return v.personId===c.id;}));});
    });
    return found || !!(retainedAccess && retainedAccess(s,c,kin,links));
  };
})();
