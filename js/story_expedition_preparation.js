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
  function jurisdictionRealmId(s,id) {
    var publicAccount=s.start && s.start.publicTreasury;
    return publicAccount && publicAccount.originalRealmId===id ? publicAccount.realmId : FB.startRealmId(s,id);
  }
  function provider(s,def,bound) {
    var rid=def.provider.jurisdiction ? jurisdictionRealmId(s,def.provider.realmId) : FB.startRealmId(s,def.provider.realmId),
      c=s.realms[rid] && s.realms[rid].alive &&
      (rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid));
    if (def.provider.kind==='home_authority') {
      var d=declaration(s,def.realmId), request={provinceId:d.mobile.origin},
        selected=def.provider.actorId && FB.bookmarkActor(s,def.provider.actorId);
      if (bound || def.provider.actorId) request.characterId=bound ? bound.characterId : selected && selected.id || '';
      if (bound && bound.appointmentId!==null) request.appointmentId=bound.appointmentId;
      var q=FB.homeAuthority.quote(s,rid,'levy',request);
      return {realmId:rid,characterId:q.allowed && q.characterId || null,generation:FB.realmRulerGeneration(s,rid),
        appointmentId:q.allowed && q.appointmentId || null};
    }
    return {realmId:rid,characterId:c && c.id || null,generation:FB.realmRulerGeneration(s,rid)};
  }
  function providerRequest(e) {
    var request={characterId:e.t.provider.characterId,provinceId:e.d.mobile.origin};
    if (e.def.provider.kind==='home_authority' && e.t.provider.appointmentId!==null) request.appointmentId=e.t.provider.appointmentId;
    return request;
  }
  function householdDonor(s,e,actorId) {
    var c=s.chars[actorId];
    return !!e.def.householdContribution && actorId===s.player.charId && live(s,c) && FB.ageOf(c,s.date.year)>=16 &&
      !s.player.travel && s.player.provinceId===e.d.mobile.origin && FB.homeAuthority.location(s,c)===e.d.mobile.origin;
  }
  function bindings(s,d) {
    return d.mobile.opening.principals.map(function (b) {
      var c=FB.bookmarkActor(s,b.person.actorId);
      return {memberId:b.memberId,characterId:c && c.id || null,person:copy(b.person)};
    });
  }
  function definitionKey(def,d) {return JSON.stringify([def,d.mobile,FBDATA.mobileProfiles[d.mobile.profileId]]);}
  function openingJurisdiction(bm,def) {
    var spec=def.provider.jurisdiction, realms=Object.create(null), holders=Object.create(null), generated=Object.create(null),
      platform=FB.resolveBookmarkPlatform(bm), rows=[], seen=Object.create(null), rid=def.provider.realmId;
    if (!spec || platform.faults.length) return null;
    (bm.realms || []).forEach(function (d) {realms[d.id]=d;});
    Object.keys(realms).forEach(function (id) {
      var form=FB.governments.resolve(platform.governments[id]), strategy=form && form.use.holders;
      if (strategy && typeof strategy.openingHolders==='function')
        Object.assign(holders,strategy.openingHolders(bm,id,generated));
    });
    Object.keys(generated).forEach(function (id) {
      if (!realms[id]) realms[id]=Object.assign({government:FBDATA.eras[platform.era].defaultGovernment},generated[id]);
    });
    var command=realms[def.realmId], origin=command && command.mobile.origin;
    if (!origin || holders[origin]!==rid) return null;
    while (rid) {
      var d=realms[rid], formId=d && (d.government || FBDATA.eras[platform.era].defaultGovernment),
        form=formId && FB.governments.resolve(formId);
      if (!d || d.mobile || d.nonTerritorial || seen[rid] || rows.length>=20) return null;
      if (!form || form.use.succession.publicCrown || form.use.succession.institutionalProperty ||
          form.use.succession.delegatedLeadership || form.use.succession.commandLeadership) return null;
      seen[rid]=true;
      rows.push({realmId:rid,characterId:FB.openingRulerCharacterId(d),generation:d.ruler && d.ruler.generation || 1,
        liegeId:d.liege || null,capital:d.capital});
      rid=d.liege;
    }
    if (rows.length<2 || rows[rows.length-1].realmId!==spec.sovereignRealmId) return null;
    return {schema:1,origin:origin,realms:rows,provider:realms[def.provider.realmId]};
  }
  function jurisdictionRecord(projected,s,def,original) {
    var appointment=null, bm=FB.campaignBookmark(s), setup=s.bookmarkSetup, revision=setup && setup.revision,
      declarations=revision!==undefined ? bm.openingRevisions && bm.openingRevisions[revision] :
        setup && bm.openingLegacyRevision ? bm.openingRevisions[bm.openingLegacyRevision] : bm.opening,
      saved=setup && setup.appointments || {};
    if (original.appointmentId!==null) {
      Object.keys(declarations && declarations.appointments || {}).some(function (id) {
        var a=declarations.appointments[id];
        if (!saved[id] || saved[id].id!==original.appointmentId) return false;
        appointment={id:original.appointmentId,officeId:a.officeId,scope:copy(a.scope),
          endTurn:a.endTurn===undefined ? null : a.endTurn};
        if (appointment.scope.kind==='realm') appointment.scope.id=def.provider.realmId;
        return true;
      });
      if (!appointment) return null;
    }
    return {schema:1,origin:projected.origin,realms:copy(projected.realms),appointment:appointment};
  }
  function jurisdictionCurrent(s,e) {
    var j=e.t.openingJurisdiction;
    if (!j) return null;
    return {blocked:FB.recruitmentCountyBlocked(s,e.t.provider.realmId,j.origin) ||
      FB.recruitmentCountyBlocked(s,jurisdictionRealmId(s,j.realms[j.realms.length-1].realmId),j.origin),
      realms:j.realms.map(function (original) {
      var rid=jurisdictionRealmId(s,original.realmId), r=s.realms[rid],
        c=r && (rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid));
      return {realmId:original.realmId,characterId:c && c.id || null,generation:FB.realmRulerGeneration(s,rid),
        liegeId:r && r.liege || null,capital:r && r.capital || null,alive:!!(r && r.alive && c && !c.dead),
        person:copy(c || null),custody:c && FB.justiceCustodyOf ? copy(FB.justiceCustodyOf(s,c.id) || null) : null};
    }),appointment:e.t.provider.appointmentId===null ? null : copy((s.authority.appointments || []).filter(function (a) {
      return a.id===e.t.provider.appointmentId;
    })[0] || null)};
  }
  function jurisdictionValid(s,e,facts) {
    var j=e.t.openingJurisdiction, last=j.realms[j.realms.length-1];
    return !facts.blocked && s.holder[j.origin]===jurisdictionRealmId(s,e.def.provider.realmId) &&
      s.owner[j.origin]===jurisdictionRealmId(s,last.realmId) && facts.realms.every(function (now,i) {
        var original=j.realms[i];
        return now.alive && now.characterId===original.characterId && now.generation===original.generation &&
          now.liegeId===(original.liegeId ? jurisdictionRealmId(s,original.liegeId) : null) && now.capital===original.capital;
      }) && FB.topRealm(s,e.t.provider.realmId)===jurisdictionRealmId(s,last.realmId) &&
      (j.appointment===null ? facts.appointment===null : !!facts.appointment &&
        facts.appointment.id===j.appointment.id && facts.appointment.officeId===j.appointment.officeId &&
        facts.appointment.endTurn===j.appointment.endTurn && same(facts.appointment.scope,
          {kind:j.appointment.scope.kind,id:j.appointment.scope.kind==='realm' ?
            jurisdictionRealmId(s,j.appointment.scope.id) : j.appointment.scope.id}));
  }
  P.referencesCharacter=function (s,id) {
    return !!id && Object.keys(s && s.stories || {}).some(function (key) {
      var story=FB.stories.get(key), t=s.stories[key];
      return !!(story && story.declaration && story.declaration.type===TYPE && t.openingJurisdiction &&
        (t.provider.characterId===id || t.issuer && t.issuer.characterId===id ||
        t.bindings.some(function (b) {return b.characterId===id;}) ||
        t.openingJurisdiction.realms.some(function (r) {return r.characterId===id;})));
    });
  };
  function check(def,context,bm) {
    function need(ok,field) {if (!ok) throw new Error('Invalid expedition preparation: '+field+'.');}
    need(keys(def,['id','type','title','intro','requires','registrationBefore','registrationAfter','realmId','termDays',
      'source','provisions','provider','acceptance','ai','householdContribution']), 'fields');
    need(display(def.title) && display(def.intro) && slug(def.realmId) && whole(def.termDays,1440) && def.termDays>0, 'identity or bounds');
    need((exact(def.provider,['kind','realmId']) && def.provider.kind==='realm_ruler' ||
      keys(def.provider,['kind','realmId','actorId','jurisdiction']) && def.provider.kind==='home_authority' &&
        (def.provider.actorId===undefined || slug(def.provider.actorId))) && slug(def.provider.realmId) &&
      def.provider.realmId!==def.realmId, 'provider');
    if (def.provider.jurisdiction!==undefined) need(def.provider.kind==='home_authority' &&
      exact(def.provider.jurisdiction,['kind','sovereignRealmId']) && def.provider.jurisdiction.kind==='direct_holder' &&
      slug(def.provider.jurisdiction.sovereignRealmId) && def.provider.jurisdiction.sovereignRealmId!==def.provider.realmId, 'jurisdiction');
    if (def.householdContribution!==undefined) need(exact(def.householdContribution,['kind','maximum']) &&
      def.householdContribution.kind==='local_household' && number(def.householdContribution.maximum,1000000) &&
      def.householdContribution.maximum>0, 'household contribution');
    need(['volunteers','closed'].indexOf(def.acceptance)>=0 && ['hold','form','refuse'].indexOf(def.ai)>=0, 'policies');
    need((exact(def.provisions,['food','maxUnitPrice']) && whole(def.provisions.food,1000000000) && def.provisions.food>0 ||
      exact(def.provisions,['targetDays','maxUnitPrice']) && whole(def.provisions.targetDays,14) && def.provisions.targetDays>0) &&
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
    var projected=def.provider.jurisdiction && openingJurisdiction(bm,def),
      d=(bm.realms || []).filter(function (r) {return r.id===def.realmId;})[0], t=d && d.mobile,
      p=t && FBDATA.mobileProfiles[t.profileId], owner=projected ? projected.provider :
        (bm.realms || []).filter(function (r) {return r.id===def.provider.realmId;})[0];
    if (def.provider.jurisdiction) need(!!projected, 'opening direct-holder jurisdiction');
    need(!!p && t.preparationId===def.id && t.command && t.opening && t.food===0 && t.treasury===0 &&
      t.columns===undefined && t.hostedAccess===undefined && t.funding && FB.homeAuthority.fundingPolicyValid(t.funding) && p.members.length<=24 &&
      t.opening.principals.length===p.members.length && !!owner && !owner.mobile, 'deferred command');
    need((bm.stories || []).indexOf(def.id)>=0 && !(def.requires || []).length, 'fresh attachment');
    var origin=(bm.provinces || []).filter(function (r) {return r.id===t.origin && !r.wasteland;})[0];
    need(!!origin && (projected || origin.realm===owner.id), 'provider locality');
    if (def.provider.kind==='home_authority') {
      var era=FBDATA.eras[bm.era], policy=FB.homeAuthority.resolvePolicy(bm,owner.government || era && era.defaultGovernment);
      need(FB.homeAuthority.policyValid(policy), 'home authority policy');
      if (def.provider.actorId!==undefined) {
        need(!!(bm.opening && bm.opening.actors && bm.opening.actors[def.provider.actorId]), 'provider actor');
        var selectedActor=bm.opening.actors[def.provider.actorId];
        need(selectedActor.ref && selectedActor.ref.kind==='realm_ruler' && selectedActor.ref.realmId===owner.id ||
          policy.delegation && Object.keys(bm.opening.appointments || {}).some(function (id) {
          var a=bm.opening.appointments[id], office=FBDATA.authorityOffices[a.officeId];
          return a.actorId===def.provider.actorId && a.realmId===owner.id && office &&
            (office.homePowers || []).indexOf('levy')>=0 &&
            (a.scope.kind==='realm' && a.scope.id===owner.id || a.scope.kind==='county' && a.scope.id===t.origin);
        }), 'declared civil provider');
      }
    }
    if (def.householdContribution!==undefined) need(t.funding.privateContributions &&
      def.householdContribution.maximum<=t.funding.maximum, 'private contribution policy');
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
    var d=e.d, t=e.t, at=d.mobile.origin, scoped=e.def.provider.kind==='home_authority',
      owner=provider(s,e.def,scoped ? t.provider : null), plan=M.openingPlan(s,d);
    var civil=scoped || e.def.source.kind==='local' ? FB.homeAuthority.quote(s,owner.realmId,'levy',providerRequest(e)) : null,
      jurisdiction=t.openingJurisdiction ? jurisdictionCurrent(s,e) : null;
    var valid=!!(t.status==='preparing' && s.turn<t.endTurn && !M.row(s,d.id) &&
      definitionKey(e.def,d)===t.definitionKey && FB.realmRulerGeneration(s,d.id)===t.realmGeneration &&
      same(owner,t.provider) && owner.characterId && live(s,s.chars[owner.characterId]) &&
      (scoped || FB.homeAuthority.location(s,s.chars[owner.characterId])===at) &&
      (jurisdiction ? jurisdictionValid(s,e,jurisdiction) : s.owner[at]===owner.realmId && s.holder[at]===owner.realmId) &&
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
    var result={valid:valid,plan:plan,provider:owner,civil:civil};
    if (jurisdiction) result.openingJurisdiction=jurisdiction;
    return result;
  }
  P.fundingSnapshot=function (s,rid) {
    var e=forRealm(s,rid), facts=e && current(s,e);
    if (!facts || !facts.valid) return null;
    var result={id:e.def.id,record:copy(e.t),issuer:M.commandIssuer(s,rid)};
    if (e.t.openingJurisdiction) result.openingJurisdiction=facts.openingJurisdiction;
    if (e.def.provisions.targetDays!==undefined) {
      result.provisions=provisionQuote(s,e);
      if (!result.provisions.allowed) return null;
    }
    return result;
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
  function provisionQuote(s,e) {
    var terms=e.def.provisions, market=FB.marketProvisionSnapshot(s,e.d.mobile.origin),
      q={allowed:false,food:terms.food || 0,fieldFood:null,target:null,market:market};
    if (terms.targetDays!==undefined) {
      var ration=M.preformationRations(s,e.d), amount=M.rationTarget(e.d.mobile.profileId,ration,terms.targetDays);
      if (!amount) return q;
      q.food=amount.food;q.fieldFood=amount.fieldFood;
      q.target={schema:1,targetDays:terms.targetDays,ration:ration,campFood:amount.campFood,
        fieldFood:amount.fieldFood,unitPrice:market ? market.price*0.1125 : 0};
    }
    q.allowed=!!market && market.stock>=q.food && market.price*0.1125<=terms.maxUnitPrice;
    return q;
  }
  P.review=function (s,id,action,actorId) {
    var e=entry(s,id), q={id:id,action:action,actorId:actorId,allowed:false,reason:'preparation',cost:0,
      trainingCost:0,foodCost:0,transfer:null,cohorts:[],funding:null,facts:null};
    if (!e || !e.d || ['form','wait','refuse','stop','authorize','revoke','contribute','grant'].indexOf(action)<0) return q;
    var t=e.t, d=e.d, f=current(s,e), p=FBDATA.mobileProfiles[d.mobile.profileId], leader=principal(e),
      actor=s.chars[actorId], isLeader=actorId===leader, isProvider=actorId===t.provider.characterId;
    var market=FB.marketProvisionSnapshot(s,d.mobile.origin), money=FB.treasuryPublicAccountSnapshot(s,d.id),
      provisions=provisionQuote(s,e);
    q.food=provisions.food;q.provisions=provisions;
    q.facts={definition:t.definitionKey,record:copy(t),turn:s.turn,date:copy(s.date),current:f,
      people:t.bindings.map(function (b) {return copy(s.chars[b.characterId] || null);}),
      providerPerson:copy(s.chars[t.provider.characterId] || null),realm:copy(s.realms[d.id]),market:market,money:money,
      owner:s.owner[d.mobile.origin],holder:s.holder[d.mobile.origin],fundingRevision:s.treasuryAccounting && s.treasuryAccounting.fundingRevision || 0};
    if (action==='contribute' && e.def.householdContribution) q.facts.household={actor:copy(actor || null),
      characterId:s.player.charId,provinceId:s.player.provinceId,travel:copy(s.player.travel || null)};
    if (t.status!=='preparing' || !live(s,actor)) return q;
    if (action==='stop' || action==='refuse') {q.allowed=isLeader || isProvider;q.reason=q.allowed ? null : 'actor';return q;}
    if (action==='wait') {q.allowed=isLeader;q.reason=q.allowed ? null : 'actor';return q;}
    if (!f.valid) {q.reason='authority';return q;}
    if (action==='authorize' || action==='revoke') {
      q.allowed=isProvider && (action==='authorize' ? t.authorizedTurn===null : t.authorizedTurn!==null);
      q.reason=q.allowed ? null : 'consent';return q;
    }
    q.trainingCost=d.mobile.fighters*p.recruitCost;
    if (market) q.foodCost=provisions.target ? provisions.food*provisions.target.unitPrice : provisions.food*market.price*0.1125;
    q.cost=q.trainingCost+q.foodCost;
    if (e.def.provisions.targetDays!==undefined && !provisions.allowed) {q.reason='provisions';return q;}
    if (action==='contribute' || action==='grant') {
      if (action==='contribute' && e.def.householdContribution && !householdDonor(s,e,actorId)) {q.reason='household';return q;}
      if (!money || !market || (action==='contribute' ? actorId!==s.player.charId ||
          !(isLeader || householdDonor(s,e,actorId)) : !isProvider)) return q;
      var amount=Math.max(0,q.cost-money.available);
      if (action==='contribute' && e.def.householdContribution) {
        amount=Math.min(amount,e.def.householdContribution.maximum);
      }
      var input={source:action==='grant' ? {kind:'public',realmId:t.provider.realmId} :
        {kind:'private',characterId:actorId},recipientRealmId:d.id,amount:amount,characterId:actorId};
      if (action==='grant' && e.def.provider.kind==='home_authority') {
        input.provinceId=d.mobile.origin;
        if (t.provider.appointmentId!==null) input.appointmentId=t.provider.appointmentId;
      }
      q.funding=FB.homeAuthority.fundingQuote(s,input);
      q.allowed=q.funding.allowed;q.reason=q.allowed ? null :
        action==='contribute' && e.def.householdContribution ? 'private_funds' : 'funds';q.cost=amount;return q;
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
    if (!provisions.allowed) {q.reason='provisions';return q;}
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
          !FB.marketWithdrawProvisions(staged,d.mobile.origin,q.food)) return false;
      var r=M.formFollowing(staged,d,q.facts.current.plan,pool,q.food,q.provisions.target ? q.provisions.fieldFood : undefined),
        migration=M.migration(staged,d.id), host=M.host(staged,d.id);
      if (!r || !migration || !host || !M.commandValid(staged,d.id)) return false;
      if (FB.expeditionPrograms) FB.expeditionPrograms.initialize(staged,d);
      se.t.status='formed';se.t.endedTurn=s.turn;se.t.revision++;se.t.reserves=[];se.t.consumed=copy(q.cohorts);
      se.t.formed={realmId:d.id,migrationId:migration.id,hostId:host.id,turn:s.turn,leaderId:r.leaderId,
        generation:r.command.leaderGeneration,trainingCost:q.trainingCost,food:q.food,foodCost:q.foodCost};
      if (q.provisions.target) se.t.formed.provisionTarget=copy(q.provisions.target);
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
      var fields=['version','definitionKey','status','reason','revision','openedTurn','endTurn','endedTurn','bindings',
        'realmGeneration','issuer','provider','authorizedTurn','reserves','consumed','released','formed'];
      if (def.provider.jurisdiction) fields.push('openingJurisdiction');
      need(exact(t,fields));
      if (def.provider.jurisdiction) need(exact(t.openingJurisdiction,['schema','origin','realms','appointment']) && t.openingJurisdiction.schema===1 &&
        slug(t.openingJurisdiction.origin) && Array.isArray(t.openingJurisdiction.realms) && t.openingJurisdiction.realms.length>=2 &&
        t.openingJurisdiction.realms.length<=20 && t.openingJurisdiction.realms.every(function (r) {
          return exact(r,['realmId','characterId','generation','liegeId','capital']) && slug(r.realmId) &&
            typeof r.characterId==='string' && r.characterId.length>0 && r.characterId.length<=200 &&
            whole(r.generation) && r.generation>0 && (r.liegeId===null || slug(r.liegeId)) && slug(r.capital);
        }));
      if (def.provider.jurisdiction) {
        var originalAppointment=t.openingJurisdiction.appointment;
        need(originalAppointment===null || exact(originalAppointment,['id','officeId','scope','endTurn']) &&
          typeof originalAppointment.id==='string' && originalAppointment.id.length>0 && originalAppointment.id.length<=200 &&
          slug(originalAppointment.officeId) && exact(originalAppointment.scope,['kind','id']) &&
          ['realm','county'].indexOf(originalAppointment.scope.kind)>=0 && slug(originalAppointment.scope.id) &&
          (originalAppointment.endTurn===null || whole(originalAppointment.endTurn) && originalAppointment.endTurn>0));
      }
      need(t.version===1 && typeof t.definitionKey==='string' && ['preparing','formed','closed'].indexOf(t.status)>=0 &&
        whole(t.revision,1000000) && t.openedTurn===0 && t.endTurn===def.termDays && whole(t.realmGeneration) && t.realmGeneration>0 &&
        (t.authorizedTurn===null || whole(t.authorizedTurn) && t.authorizedTurn<t.endTurn) &&
        (t.status==='preparing' ? t.endedTurn===null && t.reason===null : whole(t.endedTurn)) &&
        (t.status==='closed' ? ['refused','stopped','expired','interrupted'].indexOf(t.reason)>=0 : t.reason===null) &&
        (t.reason!=='expired' || t.endedTurn>=t.endTurn) &&
        (t.status==='preparing' || t.revision>0) && (t.authorizedTurn===null || t.revision>0));
      need(Array.isArray(t.bindings) && t.bindings.length>0 && t.bindings.length<=24 &&
        exact(t.provider,def.provider.kind==='home_authority' ? ['realmId','characterId','generation','appointmentId'] :
          ['realmId','characterId','generation']) && slug(t.provider.realmId) &&
        (t.provider.characterId===null || typeof t.provider.characterId==='string' && t.provider.characterId.length<=200) &&
        whole(t.provider.generation) && t.provider.generation>0);
      if (def.provider.kind==='home_authority') need((t.provider.appointmentId===null ||
        typeof t.provider.appointmentId==='string' && t.provider.appointmentId.length>0 && t.provider.appointmentId.length<=200) &&
        t.provider.characterId!==null && t.provider.characterId.length>0);
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
        t.realmGeneration===((d.ruler && d.ruler.generation) || 1) && t.realmGeneration<=FB.realmRulerGeneration(s,def.realmId) &&
        t.provider.realmId===(def.provider.jurisdiction ? jurisdictionRealmId(s,def.provider.realmId) : FB.startRealmId(s,def.provider.realmId)) &&
        t.provider.generation<=FB.realmRulerGeneration(s,t.provider.realmId) &&
        (t.provider.characterId===null || !!s.chars[t.provider.characterId]) &&
        (def.provider.kind==='home_authority' || t.provider.generation!==FB.realmRulerGeneration(s,t.provider.realmId) ||
          !presentProvider.characterId || same(t.provider,presentProvider)) &&
        (t.authorizedTurn===null || t.authorizedTurn<=s.turn) && (t.endedTurn===null || t.endedTurn<=s.turn));
      if (def.provider.kind==='home_authority') {
        var originalProjection=def.provider.jurisdiction && openingJurisdiction(bm,def),
          originalProvider=originalProjection ? originalProjection.provider : declaration(s,def.provider.realmId),
          a=t.provider.appointmentId && (s.authority.appointments || []).filter(function (a) {return a.id===t.provider.appointmentId;})[0],
          incumbent=t.provider.realmId==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,t.provider.realmId);
        need(!!originalProvider && t.provider.generation===((originalProvider.ruler && originalProvider.ruler.generation) || 1));
        if (def.provider.jurisdiction) {
          need(!!originalProjection && same(t.openingJurisdiction,jurisdictionRecord(originalProjection,s,def,t.provider)) &&
            t.openingJurisdiction.realms.every(function (r) {return !!s.chars[r.characterId];}) &&
            (t.provider.appointmentId!==null || t.provider.characterId===t.openingJurisdiction.realms[0].characterId));
        }
        if (def.provider.actorId && t.provider.characterId!==null) need(t.provider.characterId===(FB.bookmarkActor(s,def.provider.actorId) || {}).id);
        if (t.provider.appointmentId!==null) need(!!a && a.institutionId===t.provider.realmId &&
          a.holder.kind==='character' && a.holder.id===t.provider.characterId && a.appointerGeneration>=t.provider.generation &&
          a.startTurn===0 && FBDATA.authorityOffices[a.officeId] &&
          (FBDATA.authorityOffices[a.officeId].homePowers || []).indexOf('levy')>=0 &&
          (a.scope.kind==='county' && a.scope.id===d.mobile.origin || a.scope.kind==='realm' && a.scope.id===t.provider.realmId));
        else if (t.provider.characterId!==null && t.provider.generation===FB.realmRulerGeneration(s,t.provider.realmId))
          need(!!incumbent && incumbent.id===t.provider.characterId);
      }
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
      var formedFields=['realmId','migrationId','hostId','turn','leaderId','generation','trainingCost','food','foodCost'],
        target=def.provisions.targetDays!==undefined, bought=null;
      if (target) {
        formedFields.push('provisionTarget');
        var receipt=f && f.provisionTarget, roster={}, campPeople=p.members.reduce(function (n,m) {return n+m.population;},0)-d.mobile.fighters;
        d.mobile.opening.muster.forEach(function (row) {roster[row.unitId]=(roster[row.unitId] || 0)+row.count;});
        need(exact(receipt,['schema','targetDays','ration','campFood','fieldFood','unitPrice']) && receipt.schema===1 &&
          receipt.targetDays===def.provisions.targetDays && receipt.ration && receipt.ration.campPeople===campPeople &&
          same(receipt.ration.units,roster) && number(receipt.unitPrice,def.provisions.maxUnitPrice) && receipt.unitPrice>0);
        bought=M.rationTarget(d.mobile.profileId,receipt.ration,receipt.targetDays);
        need(!!bought && receipt.campFood===bought.campFood && receipt.fieldFood===bought.fieldFood &&
          f.food===bought.food && f.foodCost===bought.food*receipt.unitPrice);
      }
      need(exact(f,formedFields) && r &&
        f.realmId===def.realmId && f.migrationId===r.migrationId && f.hostId==='following_'+def.realmId &&
        whole(f.turn) && f.turn<t.endTurn && f.turn===t.endedTurn && f.generation===initial+(incumbent ? 0 : 1) &&
        f.generation<=FB.realmRulerGeneration(s,def.realmId) && f.leaderId===principal(e) &&
        (target ? f.food===bought.food : f.food===def.provisions.food) && f.trainingCost===d.mobile.fighters*p.recruitCost &&
        number(f.foodCost,f.food*def.provisions.maxUnitPrice) && f.foodCost>0 && t.revision>=2 && t.authorizedTurn!==null && t.authorizedTurn<=f.turn &&
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
      if (def.provider.kind==='home_authority') FB.bookmarkSetupAppointments(s,
        {realmId:def.provider.jurisdiction ? jurisdictionRealmId(s,def.provider.realmId) : FB.startRealmId(s,def.provider.realmId),provinceId:d.mobile.origin});
      var originalProvider=provider(s,def);
      if (def.provider.kind==='home_authority' && !originalProvider.characterId)
        throw new Error(FB.T('The expedition preparation has no eligible original local authority.'));
      var record={version:1,definitionKey:definitionKey(def,d),status:'preparing',reason:null,revision:0,openedTurn:0,
        endTurn:def.termDays,endedTurn:null,bindings:bindings(s,d),realmGeneration:FB.realmRulerGeneration(s,def.realmId),
        issuer:M.commandIssuer(s,def.realmId),provider:originalProvider,authorizedTurn:null,
        reserves:def.source.kind==='external' ? copy(def.source.cohorts) : [],consumed:[],released:[],formed:null};
      if (def.provider.jurisdiction) {
        var projected=openingJurisdiction(FB.campaignBookmark(s),def);
        if (!projected) throw new Error(FB.T('The expedition preparation has no valid original direct-holder jurisdiction.'));
        record.openingJurisdiction=jurisdictionRecord(projected,s,def,originalProvider);
        if (!record.openingJurisdiction || record.openingJurisdiction.realms.some(function (r) {
          var rid=jurisdictionRealmId(s,r.realmId), c=rid==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid);
          return !c || c.id!==r.characterId || FB.realmRulerGeneration(s,rid)!==r.generation;
        })) throw new Error(FB.T('The expedition preparation has no valid original direct-holder jurisdiction.'));
      }
      return record;
    },validate:validate,day:day,
    validatesBookmarkReference:function (bm,path,value) {
      // Reuse the same detached holder/sovereign proof as check(). This is
      // deliberately one scalar path, not a new realm in the story catalogue.
      return path==='provider.realmId' && value===def.provider.realmId &&
        def.provider.kind==='home_authority' && !!def.provider.jurisdiction && !!openingJurisdiction(bm,def);
    },
    title:function () {return FB.T(def.title);},intro:function () {return FB.T(def.intro);},
    status:function (s,t) {
      var reason={refused:FB.T('Declined'),stopped:FB.T('Stopped'),expired:FB.T('Expired'),interrupted:FB.T('Interrupted')};
      return {phase:t.status,name:FB.T(def.title),lines:[
      FB.T('Preparation: {status}. External people reserved: {people}. Deadline: day {day}.',
        {status:label(t.status),people:total(t.reserves),day:t.endTurn}),
      t.status==='formed' ? FB.T('The original expedition formed once. Its actual host, camp, people and provisions now belong to the mobile command.') :
        FB.T('No host exists until formation pays training and buys real local provisions. Local recruitment withdraws actual residents only at formation.'),
      t.status==='closed' ? reason[t.reason] : t.authorizedTurn===null ? FB.T('Local provider consent is pending.') : FB.T('The original local provider has consented.'),
      FB.T('Public command funds: {money}. Formation food: {food}.',{money:FB.treasuryAvailable(s,def.realmId),
        food:t.formed ? t.formed.food : provisionQuote(s,entry(s,def.id)).food})].concat(
        def.provisions.targetDays!==undefined ? [FB.T('Purchase target: {days} days of current camp and field rations, within field carrying capacity. Later conditions can change consumption.',
          {days:def.provisions.targetDays})] : [],
        t.openingJurisdiction ? [FB.T('The direct holder authorizes local formation under the original sovereign. Consent and public funds remain separate; no sovereignty or passage is granted.')] : [])};},
    people:function (s,t) {var e=entry(s,def.id);return [
      {characterId:principal(e),label:FB.T('Original commander'),detail:FB.T('Formation retains this person and the original mandate.'),reason:''},
      {characterId:t.provider.characterId,label:FB.T('Original local provider'),detail:FB.T('Local consent and current direct control are required separately.'),reason:''}].concat(
        t.openingJurisdiction ? t.openingJurisdiction.realms.slice(1).map(function (r) {
          return {characterId:r.characterId,label:FB.T('Original superior'),
            detail:FB.T('The original relationship must still hold. This person does not consent for the local provider.'),reason:''};
        }) : []);},
    choices:function (s,t) {
      if (t.status!=='preparing') return [];
      var e=entry(s,def.id), actor=s.player.charId, out=[];
      if (actor===t.provider.characterId) out.push({id:t.authorizedTurn===null ? 'authorize' : 'revoke',
        label:t.authorizedTurn===null ? FB.T('Authorize local formation') : FB.T('Withdraw local consent'),
        detail:FB.T('Consent covers this finite source and local purchase only. No payment or host is created by consent.')});
      if (actor===t.provider.characterId) out.push({id:'grant',label:FB.T('Grant public formation funds'),
        detail:FB.T('Transfer the current shortfall from your separate public account under ordinary civil grant authority. This grants no formation consent.')});
      if (actor===principal(e)) out.push({id:'form',label:FB.T('Form the expedition'),detail:FB.T('Withdraw the exact people, pay training and buy provisions from the public command account.')});
      if (actor===principal(e) || householdDonor(s,e,actor)) out.push({id:'contribute',label:FB.T('Contribute private formation funds'),
        detail:e.def.householdContribution ? FB.T('Give up to {maximum} from your local household purse toward the current shortfall. This gives no command, consent or refund.',
          {maximum:e.def.householdContribution.maximum}) : FB.T('Transfer the current shortfall from your private purse into the command account. There is no automatic refund.')});
      if (actor===principal(e)) out=out.concat([
        {id:'wait',label:FB.T('Wait'),detail:FB.T('Keep the preparation pending without payment or departure.')},
        {id:'stop',label:FB.T('Stop preparation'),detail:FB.T('Release unformed reserves off-map. Local residents stay home; contributed money stays in its public account.')}]);
      if (actor===principal(e) || actor===t.provider.characterId) out.push({id:'refuse',label:FB.T('Decline formation'),
        detail:FB.T('Close this preparation without a host, recruitment, payment or departure.')});
      return out;
    },quote:function (s,t,id) {return P.review(s,def.id,id,s.player.charId);},
    apply:function (s,t,id,q) {return !!q && q.id===def.id && q.action===id && q.actorId===s.player.charId && P.commit(s,q);},
    blocker:function (s,t,reason) {
      if (reason==='provisions' && def.provisions.targetDays!==undefined) return FB.T('The current ration target must fit field carrying capacity and available local food at the declared maximum price.');
      if (reason==='authority' && t.openingJurisdiction) return FB.T('Formation needs the original direct holder and sovereign relationship, living local authority or the exact civil deputy, and unchanged control of the origin.');
      if (reason==='private_funds') return FB.T('This voluntary gift needs the quoted amount in your private purse and a remaining shortfall within the command funding limit.');
      if (reason==='household') return FB.T('Only a living free adult household at the origin, without a journey, can make this private contribution.');
      return FB.T('Formation needs the original living commander and local provider, separate current consent, available people, public funds, market food and normal unit eligibility.');},
    review:function (s,t,id,q) {return [id==='contribute' ? FB.T('Private contribution: {amount}. Training need: {training}. Provision need: {food}. This gift grants no formation consent or refund.',
      {amount:q.cost,training:q.trainingCost,food:q.foodCost}) : FB.T('Public training cost: {training}. Public provision cost: {food}. Total: {cost}.',
      {training:q.trainingCost,food:q.foodCost,cost:q.cost}),
      FB.T('Formation buys {food} provisions from finite local stock.',{food:q.food || 0})].concat(
        q.provisions && q.provisions.target ? [FB.T('Camp provisions: {camp}. Field provisions: {field}. Target: {days} days.',
          {camp:q.provisions.target.campFood,field:q.provisions.target.fieldFood,days:q.provisions.target.targetDays})] : [],
        [FB.T('Only this following forms. No vow, road, safe passage, land, private money or family travel is granted.')]);}};
  }
  FB.stories.registerType(TYPE,factory,'js/story_expedition_preparation.js',check);
  var platform=FB.save.v4.validatePlatform;
  FB.save.v4.validatePlatform=function (s) {
    platform(s);
    (FB.campaignBookmark(s).realms || []).forEach(function (d) {
      var id=d.mobile && d.mobile.preparationId;
      if (id!==undefined && FB.stories.originalAttachments(s,'world').indexOf(id)>=0) {
        var e=entry(s,id);
        if (!e || e.def.realmId!==d.id) throw new Error(FB.T('Missing saved expedition preparation.'));
        FB.stories.get(id).validate(e.t,s);
      }
    });
    return true;
  };
})();
