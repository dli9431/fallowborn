/* Preparation reserves are not a second mobile population. Only a funded,
   consented commit transfers them into the canonical following and host. */
(function () {
  'use strict';
  var P=FB.expeditionPreparation={}, M=FB.mobile, TYPE='expedition_preparation';
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function same(a,b) {return JSON.stringify(a)===JSON.stringify(b);}
  function keys(v,list) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).every(function (k) {return list.indexOf(k)>=0;});}
  function exact(v,list) {return keys(v,list) && Object.keys(v).length===list.length;}
  function whole(v,max) {return Number.isSafeInteger(v) && v>=0 && v<=(max===undefined ? Number.MAX_SAFE_INTEGER : max);}
  function number(v,max) {return Number.isFinite(v) && v>=0 && v<=max;}
  function slug(v) {return typeof v==='string' && /^[a-z][a-z0-9_]{0,199}$/.test(v);}
  function display(v) {return typeof v==='string' && v.length>0 && v.length<=4000;}
  function total(rows) {return rows.reduce(function (n,c) {return n+c.count;},0);}
  function declaration(s,rid) {return (FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0];}
  function entry(s,id) {
    var story=FB.stories.get(id), def=story && story.declaration, t=s.stories && s.stories[id];
    return def && def.type===TYPE && t ? {def:def,t:t,d:declaration(s,def.realmId)} : null;
  }
  function forRealm(s,rid) {
    var d=declaration(s,rid);
    return d && d.mobile && d.mobile.preparationId ? entry(s,d.mobile.preparationId) : null;
  }
  function live(s,c) {return !!c && !c.dead && !c.unfree && !c.prisonerOf && !c.imprisoned && !c.captive && !c.exiled &&
    !c.travel && !c.religiousActivity &&
    (c.health===undefined || c.health>0) && !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)) &&
    !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,c.id)) &&
    !(c.id===s.player.charId && s.player.flags && s.player.flags.in_prison);}
  function provider(s,def) {
    var rid=FB.startRealmId(s,def.provider.realmId), c=s.realms[rid] && s.realms[rid].alive &&
      (rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid));
    return {realmId:rid,characterId:c && c.id || null,generation:FB.realmRulerGeneration(s,rid)};
  }
  function bindings(s,d) {
    return d.mobile.opening.principals.map(function (b) {
      var c=FB.bookmarkActor(s,b.person.actorId);
      return {memberId:b.memberId,characterId:c && c.id || null,person:copy(b.person)};
    });
  }
  function definitionKey(def,d) {return JSON.stringify([def,d.mobile,FBDATA.mobileProfiles[d.mobile.profileId]]);}
  function check(def,context,bm) {
    function need(ok,field) {if (!ok) throw new Error('Invalid expedition preparation: '+field+'.');}
    need(keys(def,['id','type','title','intro','requires','registrationBefore','registrationAfter','realmId','termDays',
      'source','provisions','provider','acceptance','ai']), 'fields');
    need(display(def.title) && display(def.intro) && slug(def.realmId) && whole(def.termDays,1440) && def.termDays>0, 'identity or bounds');
    need(exact(def.provider,['kind','realmId']) && def.provider.kind==='realm_ruler' && slug(def.provider.realmId) &&
      def.provider.realmId!==def.realmId, 'provider');
    need(['volunteers','closed'].indexOf(def.acceptance)>=0 && ['hold','form','refuse'].indexOf(def.ai)>=0, 'policies');
    need(exact(def.provisions,['food','maxUnitPrice']) && whole(def.provisions.food,1000000000) && def.provisions.food>0 &&
      number(def.provisions.maxUnitPrice,1000) && def.provisions.maxUnitPrice>0, 'provisions');
    var source=def.source;
    need(keys(source,['kind','cohorts','provinceId']), 'source');
    if (source.kind==='external') {
      need(exact(source,['kind','cohorts']) && Array.isArray(source.cohorts) && source.cohorts.length>0 && source.cohorts.length<=64, 'external reserve');
      var pairs=Object.create(null);
      source.cohorts.forEach(function (c) {
        need(exact(c,['memberId','culture','religion','count']) && slug(c.memberId) &&
          Object.prototype.hasOwnProperty.call(FBDATA.cultures,c.culture) && Object.prototype.hasOwnProperty.call(FBDATA.religions,c.religion) &&
          whole(c.count,10000000) && c.count>0, 'cohort');
        var key=c.memberId+'|'+c.culture+'|'+c.religion;need(!pairs[key], 'duplicate cohort');pairs[key]=true;
      });
    } else need(source.kind==='local' && exact(source,['kind','provinceId']) && slug(source.provinceId), 'local withdrawal');
    if (!bm) return;
    var d=(bm.realms || []).filter(function (r) {return r.id===def.realmId;})[0], t=d && d.mobile,
      p=t && FBDATA.mobileProfiles[t.profileId], owner=(bm.realms || []).filter(function (r) {return r.id===def.provider.realmId;})[0];
    need(!!p && t.preparationId===def.id && t.command && t.opening && t.food===0 && t.treasury===0 &&
      t.columns===undefined && t.hostedAccess===undefined && t.funding && FB.homeAuthority.fundingPolicyValid(t.funding) && p.members.length<=24 &&
      t.opening.principals.length===p.members.length && !!owner && !owner.mobile, 'deferred command');
    need((bm.stories || []).indexOf(def.id)>=0 && !(def.requires || []).length, 'fresh attachment');
    var origin=(bm.provinces || []).filter(function (r) {return r.id===t.origin && !r.wasteland;})[0];
    need(!!origin && origin.realm===owner.id, 'provider locality');
    if (source.kind==='local') need(source.provinceId===t.origin, 'local origin');
    else {
      need(source.cohorts.every(function (c) {return p.members.some(function (m) {return m.id===c.memberId;});}), 'member reference');
      p.members.forEach(function (m) {need(total(source.cohorts.filter(function (c) {return c.memberId===m.id;}))===m.population, 'member total');});
    }
    (bm.stories || []).forEach(function (id) {
      var other=context.get(id), decl=other && other.declaration;
      if (decl && decl.type===TYPE && id!==def.id) need(decl.realmId!==def.realmId, 'duplicate preparation');
    });
  }
  P.definitionFaults=function (d,bm,stories) {
    var id=d.mobile && d.mobile.preparationId;
    if (id===undefined) return [];
    var story=slug(id) && stories.get(id), def=story && story.declaration;
    return def && def.type===TYPE && def.realmId===d.id && (bm.stories || []).indexOf(id)>=0 ? [] :
      [FB.T('A deferred command requires its attached expedition preparation.')];
  };
  P.unformed=function (s,rid) {
    var e=forRealm(s,rid);
    return !!e && e.t.version===1 && ['preparing','closed'].indexOf(e.t.status)>=0 && e.t.formed===null;
  };
  P.formedTurn=function (s,rid) {var e=forRealm(s,rid);return e && e.t.formed && e.t.formed.turn;};
  function principal(e) {
    var b=e.t.bindings.filter(function (b) {return b.memberId===e.d.mobile.opening.leaderMemberId;})[0];
    return b && b.characterId;
  }
  function current(s,e) {
    var d=e.d, t=e.t, at=d.mobile.origin, owner=provider(s,e.def), plan=M.openingPlan(s,d);
    var civil=e.def.source.kind==='local' ? FB.homeAuthority.quote(s,owner.realmId,'levy',
      {characterId:owner.characterId,provinceId:at}) : null;
    var valid=!!(t.status==='preparing' && s.turn<t.endTurn && !M.row(s,d.id) &&
      definitionKey(e.def,d)===t.definitionKey && FB.realmRulerGeneration(s,d.id)===t.realmGeneration &&
      same(owner,t.provider) && owner.characterId && live(s,s.chars[owner.characterId]) &&
      FB.homeAuthority.location(s,s.chars[owner.characterId])===at && s.owner[at]===owner.realmId && s.holder[at]===owner.realmId &&
      !FB.armiesHostile(s,{realm:d.id},{realm:owner.realmId}) &&
      same(M.commandIssuer(s,d.id),t.issuer) && plan.allowed && same(plan.bindings,t.bindings) &&
      t.bindings.every(function (b) {return live(s,s.chars[b.characterId]) && FB.homeAuthority.location(s,s.chars[b.characterId])===at &&
        !(b.characterId===s.player.charId && s.player.travel) &&
        !(FB.householdParties && FB.householdParties.reservedBy(s,b.characterId)) &&
        !Object.keys(s.stories || {}).some(function (id) {
          var mod=FB.stories.get(id), rec=s.stories[id];
          return mod && mod.declaration && mod.declaration.type==='expedition_participation' &&
            rec.actorId===b.characterId && (rec.locationHeld || ['pending','active','suspended'].indexOf(rec.status)>=0);
        });}) &&
      (!civil || civil.allowed));
    // Sources cannot double as another named carrier or reserve principal.
    if (valid) Object.keys(s.stories || {}).some(function (id) {
      var other=entry(s,id);
      if (!other || id===e.def.id || other.t.status!=='preparing') return false;
      if (other.t.bindings.some(function (b) {return t.bindings.some(function (a) {return a.characterId===b.characterId;});})) valid=false;
      return !valid;
    });
    return {valid:valid,plan:plan,provider:owner,civil:civil};
  }
  P.fundingSnapshot=function (s,rid) {
    var e=forRealm(s,rid);
    return e && current(s,e).valid ? {id:e.def.id,record:copy(e.t),issuer:M.commandIssuer(s,rid)} : null;
  };
  function pools(e,cohorts) {
    var out={}, source=copy(cohorts), p=FBDATA.mobileProfiles[e.d.mobile.profileId];
    p.members.forEach(function (m) {
      out[m.id]=[];
      if (e.def.source.kind==='external') out[m.id]=source.filter(function (c) {return c.memberId===m.id;}).map(function (c) {
        return {culture:c.culture,religion:c.religion,count:c.count};
      });
      else {
        var left=m.population;
        source.forEach(function (c) {var n=Math.min(left,c.count);if (n) out[m.id].push({culture:c.culture,religion:c.religion,count:n});c.count-=n;left-=n;});
      }
    });
    return out;
  }
  function flatten(pools) {
    var out=[];Object.keys(pools).forEach(function (id) {pools[id].forEach(function (c) {out.push(Object.assign({memberId:id},c));});});return out;
  }
  P.review=function (s,id,action,actorId) {
    var e=entry(s,id), q={id:id,action:action,actorId:actorId,allowed:false,reason:'preparation',cost:0,
      trainingCost:0,foodCost:0,transfer:null,cohorts:[],funding:null,facts:null};
    if (!e || !e.d || ['form','wait','refuse','stop','authorize','revoke','contribute','grant'].indexOf(action)<0) return q;
    var t=e.t, d=e.d, f=current(s,e), p=FBDATA.mobileProfiles[d.mobile.profileId], leader=principal(e),
      actor=s.chars[actorId], isLeader=actorId===leader, isProvider=actorId===t.provider.characterId;
    var market=FB.marketProvisionSnapshot(s,d.mobile.origin), money=FB.treasuryPublicAccountSnapshot(s,d.id);
    q.facts={definition:t.definitionKey,record:copy(t),turn:s.turn,date:copy(s.date),current:f,
      people:t.bindings.map(function (b) {return copy(s.chars[b.characterId] || null);}),
      providerPerson:copy(s.chars[t.provider.characterId] || null),realm:copy(s.realms[d.id]),market:market,money:money,
      owner:s.owner[d.mobile.origin],holder:s.holder[d.mobile.origin],fundingRevision:s.treasuryAccounting && s.treasuryAccounting.fundingRevision || 0};
    if (t.status!=='preparing' || !live(s,actor)) return q;
    if (action==='stop' || action==='refuse') {q.allowed=isLeader || isProvider;q.reason=q.allowed ? null : 'actor';return q;}
    if (action==='wait') {q.allowed=isLeader;q.reason=q.allowed ? null : 'actor';return q;}
    if (!f.valid) {q.reason='authority';return q;}
    if (action==='authorize' || action==='revoke') {
      q.allowed=isProvider && (action==='authorize' ? t.authorizedTurn===null : t.authorizedTurn!==null);
      q.reason=q.allowed ? null : 'consent';return q;
    }
    q.trainingCost=d.mobile.fighters*p.recruitCost;
    if (market) q.foodCost=e.def.provisions.food*market.price*0.1125;
    q.cost=q.trainingCost+q.foodCost;
    if (action==='contribute' || action==='grant') {
      if (!money || !market || (action==='contribute' ? !isLeader || actorId!==s.player.charId : !isProvider)) return q;
      var amount=Math.max(0,q.cost-money.available);
      q.funding=FB.homeAuthority.fundingQuote(s,{source:action==='grant' ? {kind:'public',realmId:t.provider.realmId} :
        {kind:'private',characterId:actorId},recipientRealmId:d.id,amount:amount,characterId:actorId});
      q.allowed=q.funding.allowed;q.reason=q.allowed ? null : 'funds';q.cost=amount;return q;
    }
    if (!isLeader || t.authorizedTurn===null) {q.reason='consent';return q;}
    var people=p.members.reduce(function (n,m) {return n+m.population;},0), pool;
    if (e.def.source.kind==='local') {
      q.transfer=FB.populationPoolQuote(s,e.def.source.provinceId,[],people,-1);
      if (!q.transfer) {q.reason='population';return q;}
      pool=pools(e,q.transfer.cohorts);
    } else pool=pools(e,t.reserves);
    q.cohorts=flatten(pool);
    if (q.cohorts.length>64) {q.reason='capacity';return q;}
    if (!market || market.stock<e.def.provisions.food || market.price*0.1125>e.def.provisions.maxUnitPrice) {q.reason='provisions';return q;}
    if (!money || money.available<q.cost || !FB.treasuryPublicAccountSnapshot(s,t.provider.realmId)) {q.reason='funds';return q;}
    q.allowed=true;q.reason=null;return q;
  };
  function close(s,e,reason) {
    e.t.status='closed';e.t.reason=reason;e.t.endedTurn=s.turn;e.t.revision++;
    e.t.released=copy(e.t.reserves);e.t.reserves=[];
  }
  P.commit=function (s,reviewed) {
    if (!reviewed) return false;
    var q=P.review(s,reviewed.id,reviewed.action,reviewed.actorId);
    if (!q.allowed || !same(q,reviewed)) return false;
    var e=entry(s,q.id), t=e.t;
    if (q.action==='refuse' || q.action==='stop') {close(s,e,q.action==='refuse' ? 'refused' : 'stopped');return true;}
    if (q.action==='authorize' || q.action==='revoke') {t.authorizedTurn=q.action==='authorize' ? s.turn : null;t.revision++;return true;}
    if (q.action==='wait') {t.revision++;return true;}
    if (q.funding) {if (!FB.homeAuthority.fund(s,q.funding)) return false;t.revision++;return true;}
    /* Stage the canonical transactions together. This path binds every person;
       it allocates only an authority-owned migration id, never RNG or UID. */
    var staged=copy(s), se=entry(staged,q.id), d=se.d, pool;
    // q.cohorts is already member-partitioned, including a local withdrawal.
    pool={};q.cohorts.forEach(function (c) {
      if (!pool[c.memberId]) pool[c.memberId]=[];
      pool[c.memberId].push({culture:c.culture,religion:c.religion,count:c.count});
    });
    try {
      var withdrawn=[];
      if (q.transfer && !FB.populationPoolApply(staged,withdrawn,q.transfer)) return false;
      if (!FB.treasurySpend(staged,d.id,q.trainingCost) ||
          !FB.treasuryTransfer(staged,d.id,se.t.provider.realmId,q.foodCost) ||
          !FB.marketWithdrawProvisions(staged,d.mobile.origin,se.def.provisions.food)) return false;
      var r=M.formFollowing(staged,d,q.facts.current.plan,pool,se.def.provisions.food),
        migration=M.migration(staged,d.id), host=M.host(staged,d.id);
      if (!r || !migration || !host || !M.commandValid(staged,d.id)) return false;
      if (FB.expeditionPrograms) FB.expeditionPrograms.initialize(staged,d);
      se.t.status='formed';se.t.endedTurn=s.turn;se.t.revision++;se.t.reserves=[];se.t.consumed=copy(q.cohorts);
      se.t.formed={realmId:d.id,migrationId:migration.id,hostId:host.id,turn:s.turn,leaderId:r.leaderId,
        generation:r.command.leaderGeneration,trainingCost:q.trainingCost,food:se.def.provisions.food,foodCost:q.foodCost};
      M.validate(staged);
      FB.stories.get(q.id).validate(se.t,staged);
    } catch (error) {return false;}
    // Keep the original story record object for the shared sheet and dispatcher.
    Object.keys(t).forEach(function (key) {t[key]=se.t[key];});staged.stories[q.id]=t;
    ['authority','realms','chars','armies','population','market','stories'].forEach(function (key) {s[key]=staged[key];});
    FB.governments.invalidate();FB.invalidateRealmCache();return true;
  };
  function factory(def) {
    function validate(t,s) {
      function need(ok) {if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+def.id}));}
      need(exact(t,['version','definitionKey','status','reason','revision','openedTurn','endTurn','endedTurn','bindings',
        'realmGeneration','issuer','provider','authorizedTurn','reserves','consumed','released','formed']));
      need(t.version===1 && typeof t.definitionKey==='string' && ['preparing','formed','closed'].indexOf(t.status)>=0 &&
        whole(t.revision,1000000) && t.openedTurn===0 && t.endTurn===def.termDays && whole(t.realmGeneration) && t.realmGeneration>0 &&
        (t.authorizedTurn===null || whole(t.authorizedTurn) && t.authorizedTurn<t.endTurn) &&
        (t.status==='preparing' ? t.endedTurn===null && t.reason===null : whole(t.endedTurn)) &&
        (t.status==='closed' ? ['refused','stopped','expired','interrupted'].indexOf(t.reason)>=0 : t.reason===null) &&
        (t.reason!=='expired' || t.endedTurn>=t.endTurn) &&
        (t.status==='preparing' || t.revision>0) && (t.authorizedTurn===null || t.revision>0));
      need(Array.isArray(t.bindings) && t.bindings.length>0 && t.bindings.length<=24 &&
        exact(t.provider,['realmId','characterId','generation']) && slug(t.provider.realmId) &&
        (t.provider.characterId===null || typeof t.provider.characterId==='string' && t.provider.characterId.length<=200) &&
        whole(t.provider.generation) && t.provider.generation>0);
      [t.reserves,t.consumed,t.released].forEach(function (rows) {
        need(Array.isArray(rows) && rows.length<=64);
        var seen={};rows.forEach(function (c) {
          need(exact(c,['memberId','culture','religion','count']) && slug(c.memberId) && FBDATA.cultures[c.culture] &&
            (FBDATA.religions[c.religion] || s && s.faiths && s.faiths[c.religion]) && whole(c.count,10000000) && c.count>0);
          var key=c.memberId+'|'+c.culture+'|'+c.religion;need(!seen[key]);seen[key]=true;
        });
      });
      need(t.status==='formed' ? t.reserves.length===0 && t.released.length===0 && t.consumed.length>0 && t.formed!==null :
        t.consumed.length===0 && t.formed===null);
      if (def.source.kind==='external') {
        if (t.status==='preparing') need(same(t.reserves,def.source.cohorts) && t.released.length===0);
        if (t.status==='closed') need(t.reserves.length===0 && same(t.released,def.source.cohorts));
      } else need(t.reserves.length===0 && t.released.length===0);
      if (!s) return;
      var e={def:def,t:t,d:declaration(s,def.realmId)}, d=e.d, r=M.row(s,def.realmId), bm=FB.campaignBookmark(s),
        presentProvider=provider(s,def);
      need(!!d && (bm.stories || []).indexOf(def.id)>=0 && t.definitionKey===definitionKey(def,d) && same(t.bindings,bindings(s,d)) &&
        t.bindings.every(function (b) {return exact(b,['memberId','characterId','person']) &&
          (b.characterId===null || !!s.chars[b.characterId]);}) &&
        t.realmGeneration===((d.ruler && d.ruler.generation) || 1) && t.realmGeneration<=FB.realmRulerGeneration(s,def.realmId) && t.provider.realmId===FB.startRealmId(s,def.provider.realmId) &&
        t.provider.generation<=FB.realmRulerGeneration(s,t.provider.realmId) &&
        (t.provider.characterId===null || !!s.chars[t.provider.characterId]) &&
        (t.provider.generation!==FB.realmRulerGeneration(s,t.provider.realmId) || !presentProvider.characterId || same(t.provider,presentProvider)) &&
        (t.authorizedTurn===null || t.authorizedTurn<=s.turn) && (t.endedTurn===null || t.endedTurn<=s.turn));
      var superior=d.mobile.command.superior, issuer=t.issuer;
      if (!superior) need(issuer===null);
      else if (superior.kind==='external_authority') need(exact(issuer,['externalAuthorityId','generation']) && issuer.externalAuthorityId===superior.id && issuer.generation===superior.generation);
      else {
        need(exact(issuer,['characterId','generation']) && !!s.chars[issuer.characterId]);
        if (superior.kind==='opening_actor') need(issuer.generation===null && issuer.characterId===(FB.bookmarkActor(s,superior.actorId) || {}).id);
        else need(whole(issuer.generation) && issuer.generation>0 && issuer.generation<=FB.realmRulerGeneration(s,superior.realmId) &&
          (issuer.generation!==FB.realmRulerGeneration(s,superior.realmId) || !M.commandIssuer(s,def.realmId) || same(issuer,M.commandIssuer(s,def.realmId))));
      }
      if (t.status!=='formed') {
        need(!r && !M.landedLink(s,def.realmId) && !s.armies.some(function (a) {return a.realm===def.realmId;}) &&
          !(s.authority.migrations || []).some(function (m) {return m.realmId===def.realmId;}));
        return;
      }
      var f=t.formed, p=FBDATA.mobileProfiles[d.mobile.profileId], initial=d.ruler && d.ruler.generation || 1,
        incumbent=d.mobile.opening.principals.some(function (b) {return b.memberId===d.mobile.opening.leaderMemberId && b.person.kind==='realm_ruler' && b.person.realmId===d.id;});
      need(exact(f,['realmId','migrationId','hostId','turn','leaderId','generation','trainingCost','food','foodCost']) && r &&
        f.realmId===def.realmId && f.migrationId===r.migrationId && f.hostId==='following_'+def.realmId &&
        whole(f.turn) && f.turn<t.endTurn && f.turn===t.endedTurn && f.generation===initial+(incumbent ? 0 : 1) &&
        f.generation<=FB.realmRulerGeneration(s,def.realmId) && f.leaderId===principal(e) &&
        f.food===def.provisions.food && f.trainingCost===d.mobile.fighters*p.recruitCost &&
        number(f.foodCost,def.provisions.food*def.provisions.maxUnitPrice) && f.foodCost>0 && t.revision>=2 && t.authorizedTurn!==null && t.authorizedTurn<=f.turn &&
        same(r.openingBindings,t.bindings));
      if (def.source.kind==='external') need(same(t.consumed,flatten(pools(e,def.source.cohorts))));
      p.members.forEach(function (m) {need(total(t.consumed.filter(function (c) {return c.memberId===m.id;}))===m.population);});
      need(t.consumed.every(function (c) {return p.members.some(function (m) {return m.id===c.memberId;});}) &&
        r.accounting.initial===0 && r.accounting.arrivals>=total(t.consumed));
      var moving=M.migration(s,def.realmId);need(moving && moving.startTurn===f.turn && moving.hostId===f.hostId);
    }
    function day(s,t) {
      if (t.status!=='preparing') return;
      var e=entry(s,def.id);
      if (s.turn>=t.endTurn) {close(s,e,'expired');return;}
      if (!current(s,e).valid) {close(s,e,'interrupted');return;}
      if (FB.expeditionStoryPrograms && !FB.expeditionStoryPrograms.allowPreparationAI(s,def.realmId)) return;
      var leader=principal(e), providerId=t.provider.characterId;
      if (t.authorizedTurn===null && providerId!==s.player.charId && def.acceptance==='volunteers') {
        P.commit(s,P.review(s,def.id,'authorize',providerId));return;
      }
      if (leader===s.player.charId || def.ai==='hold') return;
      P.commit(s,P.review(s,def.id,def.ai==='refuse' ? 'refuse' : 'form',leader));
    }
    function label(status) {return {preparing:FB.T('Preparing'),formed:FB.T('Formed'),closed:FB.T('Closed')}[status];}
    return {id:def.id,kind:'world',requires:def.requires,init:function (s) {
      if (s.turn!==0) return;
      var d=declaration(s,def.realmId);
      return {version:1,definitionKey:definitionKey(def,d),status:'preparing',reason:null,revision:0,openedTurn:0,
        endTurn:def.termDays,endedTurn:null,bindings:bindings(s,d),realmGeneration:FB.realmRulerGeneration(s,def.realmId),
        issuer:M.commandIssuer(s,def.realmId),provider:provider(s,def),authorizedTurn:null,
        reserves:def.source.kind==='external' ? copy(def.source.cohorts) : [],consumed:[],released:[],formed:null};
    },validate:validate,day:day,
    title:function () {return FB.T(def.title);},intro:function () {return FB.T(def.intro);},
    status:function (s,t) {
      var reason={refused:FB.T('Declined'),stopped:FB.T('Stopped'),expired:FB.T('Expired'),interrupted:FB.T('Interrupted')};
      return {phase:t.status,name:FB.T(def.title),lines:[
      FB.T('Preparation: {status}. External people reserved: {people}. Deadline: day {day}.',
        {status:label(t.status),people:total(t.reserves),day:t.endTurn}),
      t.status==='formed' ? FB.T('The original expedition formed once. Its actual host, camp, people and provisions now belong to the mobile command.') :
        FB.T('No host exists until formation pays training and buys real local provisions. Local recruitment withdraws actual residents only at formation.'),
      t.status==='closed' ? reason[t.reason] : t.authorizedTurn===null ? FB.T('Local provider consent is pending.') : FB.T('The original local provider has consented.'),
      FB.T('Public command funds: {money}. Formation food: {food}.',{money:FB.treasuryAvailable(s,def.realmId),food:def.provisions.food})]};},
    people:function (s,t) {var e=entry(s,def.id);return [
      {characterId:principal(e),label:FB.T('Original commander'),detail:FB.T('Formation retains this person and the original mandate.'),reason:''},
      {characterId:t.provider.characterId,label:FB.T('Original local provider'),detail:FB.T('Local consent and current direct control are required separately.'),reason:''}];},
    choices:function (s,t) {
      if (t.status!=='preparing') return [];
      var e=entry(s,def.id), actor=s.player.charId, out=[];
      if (actor===t.provider.characterId) out.push({id:t.authorizedTurn===null ? 'authorize' : 'revoke',
        label:t.authorizedTurn===null ? FB.T('Authorize local formation') : FB.T('Withdraw local consent'),
        detail:FB.T('Consent covers this finite source and local purchase only. No payment or host is created by consent.')});
      if (actor===t.provider.characterId) out.push({id:'grant',label:FB.T('Grant public formation funds'),
        detail:FB.T('Transfer the current shortfall from your separate public account under ordinary civil grant authority. This grants no formation consent.')});
      if (actor===principal(e)) out=out.concat([{id:'form',label:FB.T('Form the expedition'),detail:FB.T('Withdraw the exact people, pay training and buy provisions from the public command account.')},
        {id:'contribute',label:FB.T('Contribute private formation funds'),detail:FB.T('Transfer the current shortfall from your private purse into the command account. There is no automatic refund.')},
        {id:'wait',label:FB.T('Wait'),detail:FB.T('Keep the preparation pending without payment or departure.')},
        {id:'stop',label:FB.T('Stop preparation'),detail:FB.T('Release unformed reserves off-map. Local residents stay home; contributed money stays in its public account.')}]);
      if (actor===principal(e) || actor===t.provider.characterId) out.push({id:'refuse',label:FB.T('Decline formation'),
        detail:FB.T('Close this preparation without a host, recruitment, payment or departure.')});
      return out;
    },quote:function (s,t,id) {return P.review(s,def.id,id,s.player.charId);},
    apply:function (s,t,id,q) {return !!q && q.id===def.id && q.action===id && q.actorId===s.player.charId && P.commit(s,q);},
    blocker:function () {return FB.T('Formation needs the original living commander and local provider, separate current consent, available people, public funds, market food and normal unit eligibility.');},
    review:function (s,t,id,q) {return [FB.T('Public training cost: {training}. Public provision cost: {food}. Total: {cost}.',
      {training:q.trainingCost,food:q.foodCost,cost:q.cost}),
      FB.T('Only this following forms. No vow, road, safe passage, land, private money or family travel is granted.')];}};
  }
  FB.stories.registerType(TYPE,factory,'js/story_expedition_preparation.js',check);
  var platform=FB.save.v4.validatePlatform;
  FB.save.v4.validatePlatform=function (s) {
    platform(s);
    (FB.campaignBookmark(s).realms || []).forEach(function (d) {
      var id=d.mobile && d.mobile.preparationId;
      if (id!==undefined) {
        var e=entry(s,id);
        if (!e || e.def.realmId!==d.id) throw new Error(FB.T('Missing saved expedition preparation.'));
        FB.stories.get(id).validate(e.t,s);
      }
    });
    return true;
  };
})();
