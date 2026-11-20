/* Consented temporary places at an existing institutional seat. County motion,
   property, custody and public money retain their canonical owners. */
(function () {
  'use strict';
  var R = FB.householdRefuges = {}, TYPE = 'household_refuge';
  var liveStates = ['requested','offered','active','challenged'];
  var closedStates = ['declined','ended','expired','interrupted'];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function keys(v,list) { return !!v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).every(function(k) { return list.indexOf(k) >= 0; }); }
  function exact(v,list) { return keys(v,list) && Object.keys(v).length === list.length; }
  function whole(v) { return Number.isSafeInteger(v) && v >= 0; }
  function ref(v) { return typeof v === 'string' && /^[a-zA-Z0-9_/-]{1,200}$/.test(v); }
  function text(v) { return typeof v === 'string' && v.length > 0 && v.length <= 4000; }
  function free(s,id) {
    var c=s.chars[id];
    return !!c && !c.dead && !c.captive && !c.prisonerOf && !c.imprisoned && !c.exiled && !c.travel && !c.religiousActivity &&
      (c.health === undefined || c.health > 0) && !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,id)) &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,id)) &&
      !(id === s.player.charId && (s.player.dead || s.player.flags && s.player.flags.in_prison)) &&
      !(s.justice && s.justice.exiles && s.justice.exiles[id] && s.justice.exiles[id].endTurn > s.turn);
  }
  function adult(s,id) { return !!s.chars[id] && FB.ageOf(s.chars[id],s.date.year) >= 16; }
  function providers(s) {
    return Object.keys(s.stories || {}).sort().map(function(id) {
      var m=FB.stories.get(id); return m && m.declaration && m.declaration.type === TYPE ? {id:id,def:m.declaration,t:s.stories[id]} : null;
    }).filter(Boolean);
  }
  function held(r) { return ['offered','active','challenged'].indexOf(r.status) >= 0; }
  function admittedHere(m) { return m.admittedTurn !== null && m.leftTurn === null; }
  function protectivePlace(m) { return admittedHere(m) && m.releasedTurn === undefined; }
  function reservesPerson(r,m) { return ['requested','offered'].indexOf(r.status) >= 0 ||
    ['active','challenged'].indexOf(r.status) >= 0 && protectivePlace(m); }
  function places(r) { return r.status === 'offered' ? r.members.length : r.members.filter(protectivePlace).length; }
  function careGroup(r,adultId) { return r.members.filter(function(m) {
    return m.admittedTurn !== null && (m.personId === adultId || m.caregiverId === adultId);
  }); }
  function seat(s,def) {
    var info=FB.world.sitesByProv && FB.world.sitesByProv[def.locality.provinceId];
    return info && info.list.filter(function(v) { return v.site === def.locality.siteId && v.authored && FB.siteVisible(s,v); })[0] || null;
  }
  function countyPresent(s,id,pid) {
    if (!free(s,id) || FB.characterLocation(s,s.chars[id]) !== pid ||
        FB.householdParties.journeys.travelling(s,id)) return false;
    if (id === s.player.charId && (s.player.war || FB.atWarPersonally && FB.atWarPersonally(s))) return false;
    var road=id === s.player.charId && s.player.travel;
    if (road && (road.phase !== 'arrived' || road.legDaysLeft > 0 || road.participationId)) return false;
    // A mobile host's county does not authorize detaching its named passenger.
    return !Object.keys(s.stories || {}).some(function(sid) {
      var m=FB.stories.get(sid),t=s.stories[sid];
      return m && m.declaration && m.declaration.type === 'expedition_participation' && t.actorId === id &&
        (t.locationHeld || ['pending','active','suspended'].indexOf(t.status) >= 0);
    }) && !Object.keys(s.authority && s.authority.governments || {}).some(function(rid) {
      var row=FB.mobile.row(s,rid);
      return row && row.status === 'active' && row.members.some(function(m) { return m.principal.id === id; });
    });
  }
  function current(s,def) {
    var d=FB.localInstitutionDefinitions(s)[def.provider.institutionId],saved=s.localInstitutions && s.localInstitutions[def.provider.institutionId];
    var office=d && FB.religiousOfficeSnapshot(s,def.provider.officeId),rid=FB.startRealmId(s,def.provider.realmId);
    var ruler=FB.realmRulerCharacterSnapshot(s,rid),r=s.realms[rid],pid=def.locality.provinceId;
    var form=FB.governments.forRealm(s,rid),info=FB.world.sitesByProv && FB.world.sitesByProv[pid];
    var slot=info ? info.list.findIndex(function(v) { return v.site === def.locality.siteId; }) : -1;
    var property=slot >= 0 ? FB.settlementConstructionAuthority(s,pid,slot,{kind:'realm',id:rid}) : null;
    var binding={institutionId:def.provider.institutionId,officeId:def.provider.officeId,incumbentId:office && office.id || null,
      realmId:rid,rulerId:ruler && ruler.id || null,generation:FB.realmRulerGeneration(s,rid)};
    var permission=FB.homeAuthority.quote(s,rid,'spend',{provinceId:pid,characterId:ruler && ruler.id || ''});
    return {binding:binding,allowed:!!(d && d.kind === 'see' && !d.abbeyId && saved && (!saved.status || saved.status === 'active') &&
      d.officeId === def.provider.officeId && d.provinceId === pid && d.site === def.locality.siteId &&
      FB.localInstitutionEnabled(s,d) && seat(s,def) && r && r.alive && form && form.use.consent.territorialConsent &&
      property && property.direct && !FB.recruitmentCountyBlocked(s,rid,pid) && s.holder[pid] === rid && s.owner[pid] === FB.topRealm(s,rid) &&
      office && free(s,office.id) && adult(s,office.id) && FB.homeAuthority.location(s,office) === pid &&
      ruler && free(s,ruler.id) && adult(s,ruler.id) && FB.homeAuthority.location(s,ruler) === pid && permission.allowed),
      permission:permission,property:copy(property),funds:FB.treasuryAvailable(s,rid),institution:copy(saved || null),
      office:copy(office || null),ruler:copy(ruler || null),owner:s.owner[pid] || null,holder:s.holder[pid] || null};
  }
  function budget(s,def) {
    var rows=providers(s).filter(function(v) { return v.def.provider.institutionId === def.provider.institutionId; });
    return {capacity:Math.min.apply(Math,rows.map(function(v) { return v.def.capacity; })),used:rows.reduce(function(n,v) {
      return n+v.t.requests.reduce(function(total,r) { return total+(held(r) ? places(r) : 0); },0);
    },0)};
  }
  function pressure(s,def,history) {
    var ids=[];
    providers(s).filter(function(v) { return v.def.provider.institutionId === def.provider.institutionId; }).forEach(function(v) {
      v.def.threatIds.forEach(function(id) { if (ids.indexOf(id) < 0) ids.push(id); });
    });
    return ids.sort().reduce(function(out,id) {
      FB.householdStories.localEvents(s,id).filter(function(e) { return (history || (s.stories[id] || {}).status === 'attempted') && e.milestone === 'attempted' &&
        e.provinceId === def.locality.provinceId && e.siteId === def.locality.siteId; }).forEach(function(e) {
        out.push({source:id,turn:e.turn,serial:2});
      });
      return out;
    },[]);
  }
  function party(s,id) {
    var m=FB.stories.get(id),t=s.stories && s.stories[id];
    return m && m.declaration && m.declaration.type === 'household_party' && t ? t : null;
  }
  function partyMember(s,t,id) {
    var m=t && t.members.filter(function(v) { return v.personId === id; })[0];
    if (!m || m.status !== 'accepted' || !free(s,id)) return null;
    var j=t.journey && t.journey.members.filter(function(v) { return v.personId === id; })[0];
    if (t.journey && t.journey.kind === 'mobile_camp' && ['requested','active'].indexOf(t.journey.status) >= 0) return null;
    if (j && ['following','separated','returned','settled'].indexOf(j.status) < 0) return null;
    if (m.kind === 'adult' ? !adult(s,id) : adult(s,id) || !adult(s,m.caregiverId) || !free(s,m.caregiverId) ||
        !(s.chars[id].fatherId === m.caregiverId || s.chars[id].motherId === m.caregiverId)) return null;
    return m;
  }
  function roster(s,partyId,ids) {
    var t=party(s,partyId);
    if (!t || !Array.isArray(ids) || !ids.length || ids.length > 16 || ids.some(function(id,i) {
      return !ref(id) || ids.indexOf(id) !== i || !partyMember(s,t,id);
    })) return null;
    var out=ids.slice().sort().map(function(id) {
      var m=partyMember(s,t,id);
      return {personId:id,caregiverId:m.kind === 'dependent' ? m.caregiverId : null};
    });
    return out.some(function(m) { return m.caregiverId && ids.indexOf(m.caregiverId) < 0; }) ||
      t.members.some(function(m) { return m.kind === 'dependent' && ids.indexOf(m.caregiverId) >= 0 &&
        partyMember(s,t,m.personId) && ids.indexOf(m.personId) < 0; }) ? null : out;
  }
  function conflict(s,id,except,institutionId) {
    return providers(s).some(function(v) { return v.t.requests.some(function(r) {
      return r !== except && r.members.some(function(m) { return m.personId === id && (reservesPerson(r,m) ||
        v.def.provider.institutionId !== institutionId && admittedHere(m)); });
    }); });
  }
  function eligibleMembers(s,r,ids) {
    var declared=roster(s,r.partyId,ids);
    return !!declared && declared.every(function(m) {
      var original=r.members.filter(function(v) { return v.personId === m.personId; })[0];
      return original && original.caregiverId === m.caregiverId && original.consentBy === (m.caregiverId || m.personId) &&
        !conflict(s,m.personId,r,r.provider.institutionId);
    });
  }
  function row(t,id) { return t.requests.filter(function(r) { return r.id === id; })[0] || null; }
  function clearExtension(r) { if (r.extension && !r.extension.payment) delete r.extension; }
  function end(s,t,r,status,reason) {
    clearExtension(r);r.status=status;r.closedTurn=s.turn;r.reason=reason;t.revision++;
  }
  function cost(def,count) { return def.funding.perPersonDay*def.termDays*count; }
  function deadline(def,r) { return r.extension && r.extension.payment ? r.endTurn+def.termDays : r.endTurn; }
  function extensionActors(r,ids) {
    return r.members.filter(function(m) { return m.caregiverId === null && ids.indexOf(m.personId) >= 0; })
      .map(function(m) { return m.personId; });
  }
  function extensionBlock(s,def,r,c,b,p,ids) {
    if (r.status !== 'active' || s.turn >= r.endTurn || !r.payment || r.extension && r.extension.payment)
      return 'extension_term';
    if (p.length) return 'extension_threat';
    if (!c.allowed || !same(c.binding,r.provider) || b.used > b.capacity) return 'extension_provider';
    if (!same(ids,r.members.filter(protectivePlace).map(function(m) { return m.personId; })) ||
        !eligibleMembers(s,r,ids) || !ids.every(function(id) { return countyPresent(s,id,def.locality.provinceId); }))
      return 'extension_people';
    return null;
  }
  function extensionReview(s,def,r,action,actor,c,b,p) {
    var pending=r.extension && !r.extension.payment ? r.extension : null;
    var ids=pending ? pending.personIds : r.members.filter(protectivePlace).map(function(m) { return m.personId; });
    var adults=extensionActors(r,ids),provider=r.provider;
    var account=r.payment && FB.treasuryPublicAccountSnapshot(s,r.payment.realmId);
    var amount=cost(def,ids.length),reason=extensionBlock(s,def,r,c,b,p,ids);
    if (action === 'extension_decline') {
      reason=pending && r.status === 'active' && s.turn < r.endTurn && free(s,actor) &&
        (adults.indexOf(actor) >= 0 || actor === provider.rulerId || actor === provider.incumbentId) ? null : 'extension_role';
    } else if (!reason) {
      if (action === 'extension_request' ? pending || actor !== s.player.charId || adults.indexOf(actor) < 0 :
          !pending || (action === 'extension_consent' ? adults.indexOf(actor) < 0 ||
            pending.consents.some(function(v) { return v.actorId === actor; }) :
            action === 'extension_authorize' ? actor !== provider.rulerId || pending.authorization :
              actor !== provider.incumbentId)) reason='extension_role';
      else if (action === 'extension_authorize' && pending.consents.length !== adults.length ||
          action === 'extension_fund' && !pending.authorization) reason='extension_consent';
      else if (action !== 'extension_consent' && (!account || account.available < amount)) reason='extension_funds';
    }
    return {personIds:ids,oldEndTurn:r.endTurn,newEndTurn:r.endTurn === null ? null : r.endTurn+def.termDays,
      amount:amount,account:account,provider:copy(provider),reason:reason};
  }
  var extensionActions=['extension_request','extension_consent','extension_authorize','extension_fund','extension_decline'];
  function termDate(s,turn) {
    var d=FB.dateAtTurn(s,turn);
    return FB.T('{season} {year}, day {day}',{season:FB.seasonName(d.season),year:d.year,day:d.day});
  }
  function termMoney(s,amount) { return FB.money(amount,{state:s,style:'long',exact:true}); }
  function check(def,context,bm) {
    function need(ok,field) { if (!ok) throw new Error('Invalid household refuge: '+field+'.'); }
    need(keys(def,['id','type','title','intro','requires','registrationBefore','registrationAfter','locality','provider','capacity',
      'acceptanceDays','termDays','funding','partyIds','threatIds','providerPolicy','adultPolicy']), 'fields');
    need(text(def.title) && text(def.intro) && exact(def.locality,['provinceId','siteId']) && ref(def.locality.provinceId) && ref(def.locality.siteId), 'display or locality');
    need(exact(def.provider,['institutionId','officeId','realmId']) && Object.keys(def.provider).every(function(k) { return ref(def.provider[k]); }), 'provider');
    need(whole(def.capacity) && def.capacity >= 1 && def.capacity <= 16 && whole(def.acceptanceDays) && def.acceptanceDays >= 1 && def.acceptanceDays <= 90 &&
      whole(def.termDays) && def.termDays >= 1 && def.termDays <= 1440, 'finite bounds');
    need(exact(def.funding,['perPersonDay']) && Number.isFinite(def.funding.perPersonDay) && def.funding.perPersonDay >= 0 && def.funding.perPersonDay <= 10, 'funding');
    need(['review','volunteers','refuse'].indexOf(def.providerPolicy) >= 0 && ['review','volunteers','refuse'].indexOf(def.adultPolicy) >= 0, 'consent policies');
    [['partyIds','household_party',1],['threatIds','local_threat',0]].forEach(function(rule) {
      var ids=def[rule[0]];
      need(Array.isArray(ids) && ids.length >= rule[2] && ids.length <= 8 && ids.every(function(id,i) {
        var m=context.get(id); return ref(id) && ids.indexOf(id) === i && m && m.declaration && m.declaration.type === rule[1] &&
          (rule[1] !== 'local_threat' || same(m.declaration.locality,def.locality));
      }),rule[0]);
    });
    // One physical institution cannot acquire another site or office through a second ledger.
    context.list().forEach(function(m) {
      var d=m.declaration;
      if (bm && (bm.stories || []).indexOf(def.id) >= 0 && d && d.id !== def.id && (bm.stories || []).indexOf(d.id) >= 0 &&
          d.type === TYPE && d.provider.institutionId === def.provider.institutionId)
        need(same(d.locality,def.locality) && same(d.provider,def.provider),'shared provider identity');
    });
    if (bm) {
      var d=(bm.localInstitutions || {})[def.provider.institutionId];
      need(FB.householdStories.localityValid(def.locality,bm) && d && d.kind === 'see' && !d.abbeyId &&
        d.officeId === def.provider.officeId && d.provinceId === def.locality.provinceId && d.site === def.locality.siteId &&
        (bm.realms || []).some(function(r) { return r.id === def.provider.realmId; }), 'resolved seat and jurisdiction');
      need(def.partyIds.every(function(id) { return FBDATA.startScenarios.some(function(d) {
        return (!bm.starts || bm.starts.indexOf(d.id) >= 0) && (!d.bookmarkIds || d.bookmarkIds.indexOf(bm.id) >= 0) &&
          (!d.eras || d.eras.indexOf(bm.era) >= 0) && (d.tracks || []).indexOf(id) >= 0;
      }); }), 'reachable party');
      need(def.threatIds.every(function(id) { return (bm.stories || []).indexOf(id) >= 0; }), 'attached incidents');
    }
  }
  function factory(def) {
    function quote(s,t,action,actorId,terms) {
      terms=terms || {};
      var c=current(s,def),b=budget(s,def),p=pressure(s,def),r=terms.requestId && row(t,terms.requestId),allowed=false;
      var ids=terms.personIds,people=null,amount=0,now=copy(s.date);
      var release=null,extension=null;
      if (action === 'request' && exact(terms,['partyId','personIds'])) {
        people=roster(s,terms.partyId,ids);
        var pt=party(s,terms.partyId),known=[];
        t.requests.forEach(function(v) { v.members.forEach(function(m) { if (known.indexOf(m.personId) < 0) known.push(m.personId); }); });
        allowed=!!(c.allowed && !p.length && pt && pt.actorId === actorId && actorId === s.player.charId && free(s,actorId) &&
          def.partyIds.indexOf(terms.partyId) >= 0 && people && people.length <= b.capacity && t.requests.length < 8 &&
          known.concat(ids.filter(function(id) { return known.indexOf(id) < 0; })).length <= 16 && people.every(function(m) {
            return !conflict(s,m.personId,null,def.provider.institutionId);
          }));
      } else if (r && exact(terms,action === 'consent' ? ['requestId','personId'] : action === 'enter' ? ['requestId','personIds'] : ['requestId'])) {
        var selected=r.members.map(function(m) { return m.personId; }),live=liveStates.indexOf(r.status) >= 0;
        var valid=c.allowed && same(c.binding,r.provider) && s.turn < r.replyTurn && !p.length;
        if (action === 'consent') {
          var member=r.members.filter(function(m) { return m.personId === terms.personId; })[0];
          allowed=!!(r.status === 'requested' && valid && member && member.consentBy === null && free(s,actorId) &&
            actorId === (member.caregiverId || member.personId) && roster(s,r.partyId,selected));
        } else if (action === 'authorize') {
          allowed=r.status === 'requested' && valid && actorId === r.provider.rulerId && !r.authorization && eligibleMembers(s,r,selected) &&
            (def.funding.perPersonDay === 0 || FB.treasuryPublicAccountSnapshot(s,r.provider.realmId) !== null);
        } else if (action === 'offer') {
          amount=cost(def,r.members.length);
          allowed=r.status === 'requested' && valid && actorId === r.provider.incumbentId && !!r.authorization &&
            eligibleMembers(s,r,selected) && b.used+r.members.length <= b.capacity &&
            (amount === 0 || FB.treasuryPublicAccountSnapshot(s,r.provider.realmId) !== null && c.funds >= amount);
        } else if (action === 'enter') {
          allowed=r.status === 'offered' && valid && actorId === r.actorId && actorId === s.player.charId && free(s,actorId) &&
            Array.isArray(ids) && ids.length > 0 && eligibleMembers(s,r,ids) && ids.every(function(id) {
              return countyPresent(s,id,def.locality.provinceId);
            }) && b.used <= b.capacity;
        } else if (action === 'decline') {
          allowed=['requested','offered'].indexOf(r.status) >= 0 && free(s,actorId) &&
            (actorId === r.actorId || actorId === r.provider.incumbentId || actorId === r.provider.rulerId ||
              r.members.some(function(m) { return actorId === (m.caregiverId || m.personId); }));
        } else if (action === 'leave') {
          allowed=live && free(s,actorId) && (actorId === r.actorId && actorId === s.player.charId ||
            actorId === r.provider.incumbentId || actorId === r.provider.rulerId ||
            r.members.some(function(m) { return actorId === (m.caregiverId || m.personId); }));
        } else if (extensionActions.indexOf(action) >= 0) {
          extension=extensionReview(s,def,r,action,actorId,c,b,p);
          allowed=extension.reason === null;
          amount=action === 'extension_fund' ? extension.amount : 0;
        } else if (action === 'release_group') {
          // The acting adult supplies their own consent, never a target on behalf of another adult.
          var group=careGroup(r,actorId),occupants=r.members.filter(protectivePlace);
          var affected=group.map(function(m) { return m.personId; });
          var reason='release_care';
          if (r.status !== 'active' && r.status !== 'challenged' || s.turn >= deadline(def,r) || !r.payment) reason='release_term';
          else if (p.length && r.status === 'active') reason='release_attempt';
          else if (!c.allowed || !same(c.binding,r.provider) || b.used > b.capacity) reason='release_provider';
          else if (adult(s,actorId) && group.some(function(m) { return m.personId === actorId && m.caregiverId === null; }) &&
              group.every(function(m) { return protectivePlace(m) && !(FB.characterGuarded && FB.characterGuarded(s,m.personId)); }) &&
              occupants.every(function(m) { return countyPresent(s,m.personId,def.locality.provinceId); }) &&
              eligibleMembers(s,r,occupants.map(function(m) { return m.personId; }))) reason=null;
          allowed=reason === null;
          release={affected:affected,remaining:occupants.filter(function(m) { return affected.indexOf(m.personId) < 0; })
            .map(function(m) { return m.personId; }),prepaid:r.payment && r.payment.amount,reason:reason};
        }
      }
      var quoted={id:def.id,action:action,actorId:actorId,terms:copy(terms),allowed:!!allowed,cost:amount,
        facts:{definition:copy(def),record:copy(t),provider:c,budget:b,pressure:p,people:people,
          characters:copy(s.chars),parties:def.partyIds.map(function(id) { return copy(party(s,id)); }),
          travel:copy(s.player.travel || null),player:copy(s.player),turn:s.turn,date:now}};
      if (release) { quoted.release=release;quoted.reason=release.reason; }
      if (extension) { quoted.extension=extension;quoted.reason=extension.reason; }
      return quoted;
    }
    function commit(s,t,q) {
      if (!q || !same(q,quote(s,t,q.action,q.actorId,q.terms)) || !q.allowed) return false;
      var r=q.terms.requestId && row(t,q.terms.requestId);
      if (q.action === 'request') {
        var pt=party(s,q.terms.partyId);
        t.requests.push({id:'r'+(t.requests.length+1),partyId:q.terms.partyId,actorId:q.actorId,provider:copy(q.facts.provider.binding),
          members:q.facts.people.map(function(m) { return {personId:m.personId,caregiverId:m.caregiverId,
            partyConsentTurn:pt.members.filter(function(v) { return v.personId === m.personId; })[0].decidedTurn,consentBy:null,consentTurn:null,
            admittedTurn:null,leftTurn:null}; }),status:'requested',requestedTurn:s.turn,replyTurn:s.turn+def.acceptanceDays,
          endTurn:null,closedTurn:null,reason:null,authorization:null,payment:null,incident:null});
      } else if (q.action === 'consent') {
        var m=r.members.filter(function(v) { return v.personId === q.terms.personId; })[0];
        m.consentBy=q.actorId;m.consentTurn=s.turn;
      } else if (q.action === 'authorize') r.authorization={actorId:q.actorId,generation:r.provider.generation,turn:s.turn};
      else if (q.action === 'offer') {
        if (q.cost > 0 && !FB.treasurySpend(s,r.provider.realmId,q.cost)) return false;
        r.payment={realmId:r.provider.realmId,amount:q.cost,turn:s.turn};
        r.status='offered';
      } else if (q.action === 'enter') {
        // A fresh confirmed term may supersede an unprotected witness at this same site.
        providers(s).forEach(function(v) { if (v.def.provider.institutionId !== def.provider.institutionId) return;
          v.t.requests.forEach(function(prior) { if (prior === r) return;
            prior.members.forEach(function(m) { if (admittedHere(m) && !reservesPerson(prior,m) && q.terms.personIds.indexOf(m.personId) >= 0) {
              m.leftTurn=s.turn;v.t.revision++;
            } });
          });
        });
        r.members.forEach(function(m) { if (q.terms.personIds.indexOf(m.personId) >= 0) m.admittedTurn=s.turn; });
        r.status='active';r.endTurn=s.turn+def.termDays;
      } else if (q.action === 'release_group') {
        clearExtension(r);
        careGroup(r,q.actorId).forEach(function(m) { m.releasedTurn=s.turn; });
        if (!q.release.remaining.length) { end(s,t,r,'ended','leave');return true; }
      } else if (q.action === 'extension_request') {
        r.extension={actorId:q.actorId,requestedTurn:s.turn,personIds:q.extension.personIds.slice(),
          consents:[{actorId:q.actorId,turn:s.turn}],authorization:null,payment:null};
      } else if (q.action === 'extension_consent') {
        r.extension.consents.push({actorId:q.actorId,turn:s.turn});
      } else if (q.action === 'extension_authorize') {
        r.extension.authorization={actorId:q.actorId,generation:r.provider.generation,turn:s.turn};
      } else if (q.action === 'extension_fund') {
        var payer=r.payment.realmId;
        if (q.cost > 0 && !FB.treasurySpend(s,payer,q.cost)) return false;
        r.extension.payment={actorId:q.actorId,realmId:payer,amount:q.cost,turn:s.turn};
      } else if (q.action === 'extension_decline') {
        clearExtension(r);
      } else { end(s,t,r,q.action === 'decline' ? 'declined' : 'ended',q.action);return true; }
      t.revision++;return true;
    }
    function reviewExtensionAI(s,t,r) {
      function decide(action,actor,policy) {
        if (!r.extension || r.extension.payment || actor === s.player.charId || policy === 'review') return;
        commit(s,t,quote(s,t,policy === 'refuse' ? 'extension_decline' : action,actor,{requestId:r.id}));
      }
      extensionActors(r,r.extension.personIds).forEach(function(id) {
        if (r.extension && !r.extension.consents.some(function(v) { return v.actorId === id; }))
          decide('extension_consent',id,def.adultPolicy);
      });
      if (r.extension && !r.extension.authorization) decide('extension_authorize',r.provider.rulerId,def.providerPolicy);
      decide('extension_fund',r.provider.incumbentId,def.providerPolicy);
    }
    function tick(s,t) {
      var c=current(s,def),b=budget(s,def),p=pressure(s,def);
      t.requests.forEach(function(r) {
        var active=liveStates.indexOf(r.status) >= 0,ids=r.members.map(function(m) { return m.personId; });
        r.members.forEach(function(m) {
          if (admittedHere(m) && !countyPresent(s,m.personId,def.locality.provinceId)) {
            m.leftTurn=s.turn;t.revision++;
          }
        });
        if (!active) return;
        if (!c.allowed || !same(c.binding,r.provider) || held(r) && b.used > b.capacity) { end(s,t,r,'interrupted','provider');return; }
        if (['requested','offered'].indexOf(r.status) >= 0) {
          if (s.turn >= r.replyTurn) { end(s,t,r,'expired','deadline');return; }
          if (!roster(s,r.partyId,ids) || r.status === 'offered' && !eligibleMembers(s,r,ids)) { end(s,t,r,'interrupted','consent');return; }
          if (p.length) { r.incident=copy(p[p.length-1]);end(s,t,r,'interrupted','attempt');return; }
        } else {
          if (s.turn >= deadline(def,r)) { end(s,t,r,'expired','term');return; }
          var occupants=r.members.filter(protectivePlace);
          if (!occupants.length) { end(s,t,r,'ended','departure');return; }
          if (!eligibleMembers(s,r,occupants.map(function(m) { return m.personId; }))) {
            end(s,t,r,'interrupted','care');return;
          }
          if (p.length && r.status === 'active') { r.status='challenged';r.incident=copy(p[p.length-1]);t.revision++; }
          if (r.extension && !r.extension.payment) {
            if (extensionBlock(s,def,r,c,b,p,r.extension.personIds)) { clearExtension(r);t.revision++; }
            else reviewExtensionAI(s,t,r);
          }
        }
        if (r.status === 'requested') {
          r.members.forEach(function(m) {
            var id=m.caregiverId || m.personId;
            if (m.consentBy || id === s.player.charId || def.adultPolicy === 'review') return;
            var q=quote(s,t,def.adultPolicy === 'refuse' ? 'decline' : 'consent',id,
              def.adultPolicy === 'refuse' ? {requestId:r.id} : {requestId:r.id,personId:m.personId});
            commit(s,t,q);
          });
          if (def.providerPolicy !== 'review') ['authorize','offer'].forEach(function(op) {
            var actor=op === 'authorize' ? r.provider.rulerId : r.provider.incumbentId;
            if (actor === s.player.charId) return;
            commit(s,t,quote(s,t,def.providerPolicy === 'refuse' ? 'decline' : op,actor,{requestId:r.id}));
          });
        }
      });
    }
    function validate(t,s) {
      function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+def.id})); }
      function validateExtension(r) {
        var x=r.extension,v=r.provider;
        need(exact(x,['actorId','requestedTurn','personIds','consents','authorization','payment']) &&
          r.endTurn !== null && whole(deadline(def,r)) && whole(x.requestedTurn) &&
          x.requestedTurn >= r.endTurn-def.termDays && x.requestedTurn < r.endTurn &&
          Array.isArray(x.personIds) && x.personIds.length > 0 && Array.isArray(x.consents));
        var members=r.members.filter(function(m) { return x.personIds.indexOf(m.personId) >= 0; });
        var adults=extensionActors(r,x.personIds),last=x.requestedTurn;
        need(same(x.personIds,members.map(function(m) { return m.personId; })) && adults.indexOf(x.actorId) >= 0 &&
          x.consents.length > 0 && x.consents.length <= adults.length);
        var consented=[];
        x.consents.forEach(function(c,i) {
          need(exact(c,['actorId','turn']) && adults.indexOf(c.actorId) >= 0 && consented.indexOf(c.actorId) < 0 &&
            whole(c.turn) && c.turn >= last && c.turn < r.endTurn && (i > 0 || c.actorId === x.actorId && c.turn === x.requestedTurn));
          last=c.turn;consented.push(c.actorId);
        });
        if (x.authorization !== null) {
          var a=x.authorization;
          need(exact(a,['actorId','generation','turn']) && a.actorId === v.rulerId && a.generation === v.generation &&
            consented.length === adults.length && whole(a.turn) && a.turn >= last && a.turn < r.endTurn);
          last=a.turn;
        }
        if (x.payment !== null) {
          var pay=x.payment;
          need(exact(pay,['actorId','realmId','amount','turn']) && pay.actorId === v.incumbentId &&
            pay.realmId === r.payment.realmId && pay.amount === cost(def,members.length) && x.authorization &&
            whole(pay.turn) && pay.turn >= last && pay.turn < r.endTurn);
          last=pay.turn;
        } else need(r.status === 'active' && r.incident === null);
        need((!s || last <= s.turn) && (r.closedTurn === null || last <= r.closedTurn) &&
          (r.incident === null || last <= r.incident.turn));
        r.members.forEach(function(m) {
          if (x.personIds.indexOf(m.personId) >= 0) {
            need(m.admittedTurn !== null && m.admittedTurn <= x.requestedTurn &&
              (m.leftTurn === null || m.leftTurn >= last) &&
              (m.releasedTurn === undefined || m.releasedTurn >= last) &&
              (!m.caregiverId || adults.indexOf(m.caregiverId) >= 0));
            if (s) {
              var age=FB.ageOf(s.chars[m.personId],FB.dateAtTurn(s,last).year);
              need(m.caregiverId === null ? age >= 16 : age < 16);
            }
          } else {
            // Departure or release may share a turn with the next request.
            need(m.admittedTurn === null || m.leftTurn !== null && m.leftTurn <= x.requestedTurn ||
              m.releasedTurn !== undefined && m.releasedTurn <= x.requestedTurn);
          }
        });
      }
      need(exact(t,['version','locality','revision','openedTurn','requests']) && t.version === 1 && same(t.locality,def.locality) &&
        whole(t.revision) && t.revision <= 1000000 && t.openedTurn === 0 && Array.isArray(t.requests) && t.requests.length <= 8);
      var known=[];
      var memberFields=['personId','caregiverId','partyConsentTurn','consentBy','consentTurn','admittedTurn','leftTurn'];
      var requestFields=['id','partyId','actorId','provider','members','status','requestedTurn','replyTurn','endTurn','closedTurn','reason','authorization','payment','incident'];
      if (s) need((FB.campaignBookmark(s).stories || []).indexOf(def.id) >= 0 && FB.householdStories.localityValid(t.locality,FB.campaignBookmark(s)));
      t.requests.forEach(function(r,i) {
        need(exact(r,r.extension === undefined ? requestFields : requestFields.concat('extension')) &&
          r.id === 'r'+(i+1) && def.partyIds.indexOf(r.partyId) >= 0 && ref(r.actorId) && whole(r.requestedTurn) &&
          r.replyTurn === r.requestedTurn+def.acceptanceDays && liveStates.concat(closedStates).indexOf(r.status) >= 0);
        var v=r.provider;
        need(exact(v,['institutionId','officeId','incumbentId','realmId','rulerId','generation']) &&
          v.institutionId === def.provider.institutionId && v.officeId === def.provider.officeId && ref(v.realmId) &&
          ref(v.rulerId) && ref(v.incumbentId) && whole(v.generation) && v.generation >= 1);
        need(Array.isArray(r.members) && r.members.length > 0 && r.members.length <= def.capacity);
        var seen=[],admitted=[];
        r.members.forEach(function(m) {
          need(exact(m,m.releasedTurn === undefined ? memberFields : memberFields.concat('releasedTurn')) && ref(m.personId) &&
            seen.indexOf(m.personId) < 0 && (m.caregiverId === null || ref(m.caregiverId) && m.caregiverId !== m.personId));
          need(whole(m.partyConsentTurn) && m.partyConsentTurn <= r.requestedTurn);
          seen.push(m.personId);if (known.indexOf(m.personId) < 0) known.push(m.personId);
          need(m.consentBy === null ? m.consentTurn === null : m.consentBy === (m.caregiverId || m.personId) &&
            whole(m.consentTurn) && m.consentTurn >= r.requestedTurn && m.consentTurn < r.replyTurn);
          need(m.admittedTurn === null ? m.leftTurn === null : m.consentBy !== null && whole(m.admittedTurn) &&
            m.admittedTurn >= m.consentTurn && m.admittedTurn < r.replyTurn && r.payment && m.admittedTurn >= r.payment.turn &&
            (m.leftTurn === null || whole(m.leftTurn) && m.leftTurn >= m.admittedTurn));
          if (m.releasedTurn !== undefined) need(whole(m.releasedTurn) && m.admittedTurn !== null &&
            m.releasedTurn >= m.admittedTurn && m.releasedTurn < deadline(def,r) &&
            (m.leftTurn === null || m.releasedTurn <= m.leftTurn) && (r.closedTurn === null || m.releasedTurn <= r.closedTurn));
          if (m.admittedTurn !== null) admitted.push(m.personId);
          if (s) {
            var pt=party(s,r.partyId),pm=pt && pt.members.filter(function(v) { return v.personId === m.personId; })[0];
            need(!!s.chars[m.personId] && pm && pm.decidedTurn !== null &&
              (pm.status === 'accepted' && pm.decidedTurn === m.partyConsentTurn || pm.status === 'withdrawn' && pm.decidedTurn >= m.partyConsentTurn) &&
              m.partyConsentTurn >= pm.invitedTurn && m.partyConsentTurn < pm.endTurn &&
              (pm.kind === 'dependent' ? pm.caregiverId : null) === m.caregiverId &&
              (m.caregiverId === null || s.chars[m.personId].motherId === m.caregiverId || s.chars[m.personId].fatherId === m.caregiverId) &&
              (m.consentTurn === null || m.consentTurn <= s.turn) && (m.admittedTurn === null || m.admittedTurn <= s.turn) &&
              (m.leftTurn === null || m.leftTurn <= s.turn) && (m.releasedTurn === undefined || m.releasedTurn <= s.turn));
            [r.requestedTurn,m.consentTurn,m.admittedTurn,m.releasedTurn].filter(whole).forEach(function(turn) {
              var year=FB.dateAtTurn(s,turn).year,age=FB.ageOf(s.chars[m.personId],year);
              need(m.caregiverId === null ? age >= 16 : age < 16 && FB.ageOf(s.chars[m.caregiverId],year) >= 16);
            });
          }
        });
        need(known.length <= 16 && r.members.every(function(m) { return !m.caregiverId || seen.indexOf(m.caregiverId) >= 0 &&
          (m.admittedTurn === null || admitted.indexOf(m.caregiverId) >= 0); }));
        r.members.forEach(function(m) {
          if (!m.caregiverId || m.admittedTurn === null) return;
          var care=r.members.filter(function(v) { return v.personId === m.caregiverId; })[0];
          need(m.releasedTurn === care.releasedTurn);
        });
        if (r.authorization !== null) need(exact(r.authorization,['actorId','generation','turn']) &&
          r.authorization.actorId === v.rulerId && r.authorization.generation === v.generation &&
          whole(r.authorization.turn) && r.authorization.turn >= r.requestedTurn && r.authorization.turn < r.replyTurn &&
          r.members.every(function(m) { return m.consentBy !== null && m.consentTurn <= r.authorization.turn; }));
        if (r.payment !== null) need(exact(r.payment,['realmId','amount','turn']) && r.payment.realmId === v.realmId &&
          r.payment.amount === cost(def,r.members.length) && whole(r.payment.turn) && r.authorization &&
          r.payment.turn >= r.authorization.turn && r.payment.turn < r.replyTurn);
        need(r.endTurn === null ? admitted.length === 0 : admitted.length > 0 && whole(r.endTurn) && r.members.every(function(m) {
          return m.admittedTurn === null || r.endTurn === m.admittedTurn+def.termDays;
        }));
        if (r.extension !== undefined) validateExtension(r);
        if (r.status === 'requested') need(r.payment === null && !admitted.length);
        if (r.status === 'offered') need(r.payment !== null && !admitted.length);
        if (r.status === 'active' || r.status === 'challenged') need(r.payment !== null && admitted.length > 0 &&
          (!r.members.some(function(m) { return m.releasedTurn !== undefined; }) || r.members.some(protectivePlace)));
        need(liveStates.indexOf(r.status) >= 0 ? r.closedTurn === null && r.reason === null : whole(r.closedTurn) &&
          r.closedTurn >= r.requestedTurn && ['decline','leave','provider','deadline','consent','attempt','term','departure','care'].indexOf(r.reason) >= 0);
        if (r.closedTurn !== null) need((r.authorization === null || r.authorization.turn <= r.closedTurn) &&
          (r.payment === null || r.payment.turn <= r.closedTurn) && r.members.every(function(m) {
            return (m.consentTurn === null || m.consentTurn <= r.closedTurn) && (m.admittedTurn === null || m.admittedTurn <= r.closedTurn);
          }));
        if (r.status === 'expired') need(r.reason === 'deadline' ? !admitted.length && r.closedTurn >= r.replyTurn :
          r.reason === 'term' && admitted.length > 0 && r.closedTurn >= deadline(def,r));
        if (r.status === 'declined') need(!admitted.length && r.reason === 'decline');
        if (r.reason === 'attempt') need(r.status === 'interrupted' && r.incident !== null);
        if (r.incident !== null) {
          need(exact(r.incident,['source','turn','serial']) && ref(r.incident.source) && whole(r.incident.turn) && r.incident.serial === 2);
          need(r.incident.turn >= r.requestedTurn && (r.closedTurn === null || r.incident.turn <= r.closedTurn));
          if (r.status === 'challenged') need(r.incident.turn >= r.endTurn-def.termDays);
          if (s) need(r.incident.turn <= s.turn && pressure(s,def,true).some(function(p) { return same(p,r.incident); }));
        }
        if (r.status === 'challenged') need(r.incident !== null);
        if (s) {
          var pt=party(s,r.partyId);
          need(pt && pt.actorId === r.actorId && v.realmId === FB.startRealmId(s,def.provider.realmId) && s.realms[v.realmId] &&
            s.chars[v.rulerId] && s.chars[v.incumbentId] && v.generation <= FB.realmRulerGeneration(s,v.realmId) &&
            r.requestedTurn <= s.turn && (r.closedTurn === null || r.closedTurn <= s.turn) &&
            (r.authorization === null || r.authorization.turn <= s.turn) && (r.payment === null || r.payment.turn <= s.turn));
        }
      });
      need(t.revision >= t.requests.length);
    }
    function menu(s,t) {
      var out=[],actor=s.player.charId;
      function groups(pt,ids) {
        return ids.filter(function(id) { var m=pt.members.filter(function(m) { return m.personId === id; })[0];
          return m && m.kind === 'adult';
        }).map(function(id) { return [id].concat(pt.members.filter(function(m) {
          return m.caregiverId === id && ids.indexOf(m.personId) >= 0;
        }).map(function(m) { return m.personId; })); });
      }
      function names(ids) { return ids.map(function(id) { return (s.chars[id] || {}).name || id; }).join(', '); }
      def.partyIds.forEach(function(id) {
        var pt=party(s,id),snap=FB.householdParties.snapshot(s,id);
        var ids=pt && pt.journey ? pt.journey.members.filter(function(m) { return partyMember(s,pt,m.personId); }).map(function(m) { return m.personId; }) : snap && snap.accepted;
        if (pt && pt.actorId === actor && ids && ids.length) {
          out.push({id:'request/'+id,action:'request',actorId:actor,
            terms:{partyId:id,personIds:ids},label:FB.T('Request places for {names}',{names:names(ids)}),detail:FB.T('Shelter consent and local entry remain separate.')});
          groups(pt,ids).forEach(function(selected) { if (selected.length === ids.length) return;
            out.push({id:'request/'+id+'/'+selected[0],action:'request',actorId:actor,terms:{partyId:id,personIds:selected},
              label:FB.T('Request places for {names}',{names:names(selected)}),detail:FB.T('Keep this exact care group together. Other relatives remain outside this request.')});
          });
        }
      });
      t.requests.forEach(function(r) {
        if (r.status === 'active' && s.turn < r.endTurn && (!r.extension || !r.extension.payment)) {
          var x=r.extension,ids=x ? x.personIds : r.members.filter(protectivePlace).map(function(m) { return m.personId; });
          var member=extensionActors(r,ids).indexOf(actor) >= 0;
          var ruler=actor === r.provider.rulerId,host=actor === r.provider.incumbentId;
          var detail=FB.T('Public cost {cost} for {days} days. Current expiry {oldDate}. Proposed expiry {newDate}.',
            {cost:termMoney(s,cost(def,ids.length)),days:def.termDays,oldDate:termDate(s,r.endTurn),newDate:termDate(s,r.endTurn+def.termDays)});
          function choice(action,label) {
            out.push({id:action+'/'+r.id,action:action,actorId:actor,terms:{requestId:r.id},
              label:label,detail:detail,reviewBlocker:true});
          }
          if (!x && member) choice('extension_request',FB.T('Request another shelter term'));
          if (x) {
            if (member && !x.consents.some(function(v) { return v.actorId === actor; }))
              choice('extension_consent',FB.T('Consent to another shelter term'));
            if (ruler && !x.authorization) choice('extension_authorize',FB.T('Authorize public payment for another shelter term'));
            if (host) choice('extension_fund',FB.T('Agree to provide another shelter term'));
            if (member || ruler || host) choice('extension_decline',actor === x.actorId ?
              FB.T('Withdraw the additional shelter request') : FB.T('Decline the additional shelter request'));
          }
        }
        if (['active','challenged'].indexOf(r.status) >= 0 && r.members.some(function(m) {
          return m.personId === actor && m.caregiverId === null && protectivePlace(m);
        })) out.push({id:'release_group/'+r.id,action:'release_group',actorId:actor,terms:{requestId:r.id},
          label:FB.T('Release my care group’s shelter places'),
          detail:FB.T('End protection for your own care group and free its places without a refund. Everyone stays where they are.')});
        r.members.forEach(function(m) {
          if (r.status === 'requested' && (m.caregiverId || m.personId) === actor && m.consentBy === null)
            out.push({id:'consent/'+r.id+'/'+m.personId,action:'consent',actorId:actor,terms:{requestId:r.id,personId:m.personId},
              label:FB.T('Consent for {name}',{name:(s.chars[m.personId] || {}).name || m.personId}),detail:FB.T('Agree to this temporary shelter only. No property or custody right is granted.')});
        });
        ['authorize','offer','enter','decline','leave'].forEach(function(op) {
          var relevant=op === 'authorize' ? actor === r.provider.rulerId : op === 'offer' ? actor === r.provider.incumbentId :
            op === 'enter' ? actor === r.actorId : actor === r.actorId || actor === r.provider.rulerId || actor === r.provider.incumbentId ||
              r.members.some(function(m) { return actor === (m.caregiverId || m.personId); });
          if (!relevant || liveStates.indexOf(r.status) < 0 || op === 'enter' && r.status !== 'offered' ||
              (op === 'authorize' || op === 'offer') && r.status !== 'requested') return;
          out.push({id:op+'/'+r.id,action:op,actorId:actor,terms:op === 'enter' ? {requestId:r.id,personIds:r.members.map(function(m) { return m.personId; })} : {requestId:r.id},
            label:{authorize:FB.T('Authorize these places'),offer:FB.T('Offer these places'),enter:FB.T('Enter the shelter'),decline:FB.T('Decline these places'),leave:FB.T('End the shelter agreement')}[op],
            detail:FB.T('Recheck the exact people, current permission, capacity, deadline and public payment before confirming.')});
        });
        if (r.status === 'offered' && actor === r.actorId) groups(party(s,r.partyId),r.members.map(function(m) { return m.personId; })).forEach(function(ids) {
          if (ids.length === r.members.length) return;
          out.push({id:'enter/'+r.id+'/'+ids[0],action:'enter',actorId:actor,terms:{requestId:r.id,personIds:ids},
            label:FB.T('Enter with {names}',{names:names(ids)}),detail:FB.T('Only these actual people enter. Unused offered places release.')});
        });
      });
      return out;
    }
    return {id:def.id,kind:'world',requires:def.requires,
      init:function(s) { if (s.turn === 0) return {version:1,locality:copy(def.locality),revision:0,openedTurn:0,requests:[]}; },
      title:function() { return FB.T(def.title); },intro:function() { return FB.T(def.intro); },
      status:function(s,t) { var b=budget(s,def),c=current(s,def),site=seat(s,def);return {phase:t.requests.length ? t.requests[t.requests.length-1].status : 'available',name:FB.T(def.title),lines:[
        FB.T('Reserved protective places: {used} of {capacity}.',{used:b.used,capacity:b.capacity}),
        FB.T('Shelter site: {site}. Protector: {protector}. Civil authority: {ruler}.',
          {site:site ? site.name : def.locality.siteId,protector:(c.office || {}).name || FB.T('Unavailable person'),ruler:(c.ruler || {}).name || FB.T('Unavailable person')}),
        FB.T('Acceptance: {days} days. Protection: {term} days after entry. Public prepaid cost per person: {money:cost}.',
          {days:def.acceptanceDays,term:def.termDays,cost:cost(def,1)}),
        FB.T('Payment is final when offered. Places promise no provisions, guards, safe road, conversion or property transfer.')].concat(t.requests.reduce(function(lines,r) {
          var endTurn=deadline(def,r);
          lines.push(FB.T('Request {id}: {status}. Days remaining in this offer or term: {days}. People still present at the shelter: {count}.',
            {id:r.id,status:phaseLabel(r.status),days:liveStates.indexOf(r.status) >= 0 ? Math.max(0,(endTurn === null ? r.replyTurn : endTurn)-s.turn) : 0,count:r.members.filter(function(m) {
            return admittedHere(m) && countyPresent(s,m.personId,def.locality.provinceId);
          }).length}));
          if (r.extension) lines.push(r.extension.payment ?
            FB.T('Additional term prepaid: {cost}. Original expiry {oldDate}. Extended expiry {newDate}.',
              {cost:termMoney(s,r.extension.payment.amount),oldDate:termDate(s,r.endTurn),newDate:termDate(s,endTurn)}) :
            FB.T('Additional term awaiting consent and funding. Current expiry {date}.',{date:termDate(s,r.endTurn)}));
          return lines;
        },[]))}; },
      choices:menu,
      quote:function(s,t,id) { var m=menu(s,t).filter(function(v) { return v.id === id; })[0];return m ? quote(s,t,m.action,m.actorId,m.terms) : {allowed:false}; },
      apply:function(s,t,id,q) { var m=menu(s,t).filter(function(v) { return v.id === id; })[0];return !!(m && q && q.action === m.action && q.actorId === m.actorId && same(q.terms,m.terms) && commit(s,t,q)); },
      reviewPeople:function(s,t,id,q) {
        if (q.extension) return q.extension.personIds.map(function(personId) {
          return {characterId:personId,label:FB.T('Keeps a protective place')};
        }).concat([
          {characterId:q.extension.provider.incumbentId,label:FB.T('Institutional host')},
          {characterId:q.extension.provider.rulerId,label:FB.T('Civil spending authority')}
        ]);
        if (!q.release) return [];
        return q.release.affected.map(function(personId) { return {characterId:personId,label:FB.T('Releases a protective place')}; })
          .concat(q.release.remaining.map(function(personId) { return {characterId:personId,label:FB.T('Keeps a protective place')}; }));
      },
      reviewFacts:function(s,t,id,q) {
        var x=q.extension;
        if (!x) return null;
        var payer=s.realms[x.provider.realmId],site=seat(s,def);
        return [
          [FB.T('Shelter site'),site ? site.name : FB.T('Unavailable')],
          [FB.T('Protected places'),x.personIds.length],
          [FB.T('Current expiry'),termDate(s,x.oldEndTurn)],
          [FB.T('Proposed expiry'),termDate(s,x.newEndTurn)],
          [FB.T('Public payer'),payer ? payer.name : FB.T('Unavailable')],
          [FB.T('Public cost of the additional term'),termMoney(s,x.amount)],
          [FB.T('Public funds available'),x.account ? termMoney(s,x.account.available) : FB.T('Unavailable')],
          [FB.T('Public payment now'),termMoney(s,q.action === 'extension_fund' && q.allowed ? x.amount : 0)]
        ];
      },
      review:function(s,t,id,q) {
        if (q.extension) return [
          FB.T('The additional term requires each protected adult’s agreement for their care group, fresh civil authorization, and the original host’s consent. Requesting also gives your own care group’s consent.'),
          FB.T('Only the host’s final confirmation prepays the entire term. Declining or putting off this decision leaves the current expiry in place.'),
          FB.T('Everyone keeps their current place and residence. The additional term starts at the original expiry. There is no action day.')
        ];
        if (q.release) return [
          FB.T('Protective places freed: {count}.',{count:q.release.affected.length}),
          q.release.remaining.length ? FB.T('The remaining places keep the same shelter term.') : FB.T('This ends the shelter agreement.'),
          FB.T('Original public prepayment: {cost}. There is no refund, new charge or action day.',
            {cost:FB.money(q.release.prepaid,{state:s,style:'long',exact:true})}),
          FB.T('Everyone stays at {site}. Residence is unchanged. Use ordinary travel to depart.',{site:seat(s,def).name})];
        var r=q.terms.requestId && row(t,q.terms.requestId),ids=q.terms.personIds ||
        r && r.members.map(function(m) { return m.personId; }) || [];
        return [FB.T('Exact people: {names}.',{names:ids.map(function(id) { return (s.chars[id] || {}).name || id; }).join(', ')}),
        FB.T('Institutional consent: {protector}. Civil authorization and public payer: {ruler}.',
          {protector:(q.facts.provider.office || {}).name || FB.T('Unavailable person'),ruler:(q.facts.provider.ruler || {}).name || FB.T('Unavailable person')}),
        FB.T('Public cost now: {money:cost}. No household fee. No action days.',{cost:q.cost}),
        FB.T('Offering prepays {money:cost} for these people. No refund is promised. Ending this agreement ends protection for its whole named group.',
          {cost:cost(def,r ? r.members.length : ids.length)}),
        FB.T('Every adult and actual caregiver decides separately. Ending protection does not move the occupants.'),
        FB.T('Use the ordinary named-party journey for departure, return or eligible settlement.')]; },
      blocker:function(s,t,reason) {
        if (reason === 'extension_term') return FB.T('An active, unchallenged original term must still be running. Each agreement can be extended once.');
        if (reason === 'extension_threat') return FB.T('A committed local attempt prevents an additional term.');
        if (reason === 'extension_provider') return FB.T('The original host and civil authority must still be eligible at this site.');
        if (reason === 'extension_people') return FB.T('The same protected people must still be present with valid consent and care.');
        if (reason === 'extension_role') return FB.T('This person cannot give that decision for the additional term.');
        if (reason === 'extension_consent') return FB.T('The protected adults must consent and the civil authority must authorize spending before the host can confirm.');
        if (reason === 'extension_funds') return FB.T('The original public account must be able to prepay the full additional term.');
        if (reason === 'release_term') return FB.T('Only a current shelter term with admitted places can be released.');
        if (reason === 'release_attempt') return FB.T('A committed attempt has interrupted this review. Wait for the shelter to record the challenge.');
        if (reason === 'release_provider') return FB.T('The original provider, local permission and protective capacity must still be valid.');
        if (reason === 'release_care') return FB.T('An admitted adult may release only their own consenting care group. Everyone still using these places must be present with valid consent and care.');
        return FB.T('Current consent, local access, a living authorized provider, free places, unexpired terms and the named public funds are required. A committed local attempt blocks entry.');
      },
      people:function(s,t) { var ids=[];t.requests.forEach(function(r) { [r.provider.incumbentId,r.provider.rulerId].concat(r.members.map(function(m) { return m.personId; })).forEach(function(id) {
        if (ids.indexOf(id) < 0) ids.push(id);
      }); });return ids.map(function(id) { return {characterId:id,label:FB.T('Shelter participant'),detail:FB.T('Exact original person; no successor is enrolled automatically.'),reason:''}; }); },
      refugeReview:quote,refugeCommit:commit,day:tick,season:tick,year:tick,validate:validate};
  }
  function phaseLabel(status) { return {requested:FB.T('Requested'),offered:FB.T('Offered'),active:FB.T('Active'),challenged:FB.T('Challenged'),
    declined:FB.T('Declined'),ended:FB.T('Ended'),expired:FB.T('Expired'),interrupted:FB.T('Interrupted')}[status]; }
  R.review=function(s,id,action,actorId,terms) { var m=FB.stories.get(id),t=s.stories && s.stories[id];
    return m && t && m.declaration.type === TYPE ? m.refugeReview(s,t,action,actorId,terms) : null; };
  R.commit=function(s,q) { var m=q && FB.stories.get(q.id),t=q && s.stories && s.stories[q.id];
    return !!(m && t && m.declaration.type === TYPE && m.refugeCommit(s,t,q)); };
  R.presence=function(s,id) {
    var found=null;
    providers(s).forEach(function(v) { v.t.requests.forEach(function(r) { if (r.members.some(function(m) {
      return m.personId === id && admittedHere(m) && countyPresent(s,id,v.def.locality.provinceId);
    })) found=copy(v.def.locality); }); });return found;
  };
  var eventArgs={type:'object',fields:{
    storyId:{type:'string',minLength:1,maxLength:80,optional:true},
    action:{enum:['request','consent','authorize','offer','enter','decline','leave'].concat(extensionActions)},
    partyId:{type:'string',minLength:1,maxLength:80,optional:true},
    requestId:{type:'string',minLength:1,maxLength:200,optional:true},
    personId:{type:'string',minLength:1,maxLength:200,optional:true}
  },test:function(a,c) {
    var data=c.data || FBDATA,d=(data.storyInstances || {})[a.storyId],p=(data.storyInstances || {})[a.partyId];
    return FB.stories.eventReviewCandidate(TYPE,a,c) &&
    (c.runtime || !a.partyId || p && p.type === 'household_party' &&
      (!d || Array.isArray(d.partyIds) && d.partyIds.indexOf(a.partyId) >= 0)) &&
    (!a.partyId || a.action === 'request') && (!a.requestId || a.action !== 'request') &&
    (!a.personId || a.action === 'consent');}};
  function eventSource(s,a,ctx) {
    return FB.stories.eventReviewSource(s,TYPE,a,ctx,function(state,m) {
      var choices=FB.stories.choices(state,m.id).filter(function(v) {
        return v.action === a.action && (!a.partyId || v.terms.partyId === a.partyId) &&
          (!a.requestId || v.terms.requestId === a.requestId) && (!a.personId || v.terms.personId === a.personId) &&
          // A generic review selects a whole request, never an arbitrary first care group.
          (v.action !== 'request' && v.action !== 'enter' || v.id.split('/').length === 2);
      });
      return choices.length === 1 ? choices[0] : null;
    });
  }
  function eventParties(s,source) {
    var m=FB.stories.get(source.storyId),t=FB.stories.record(s,source.storyId);
    var choice=FB.stories.choices(s,source.storyId).filter(function(v) {return v.id === source.choiceId;})[0];
    if (!choice) return null;
    var request=choice.terms.requestId && row(t,choice.terms.requestId),c=current(s,m.declaration);
    return {refuge_host:request ? request.provider.incumbentId : c.binding.incumbentId,
      refuge_ruler:request ? request.provider.rulerId : c.binding.rulerId,
      refuge_guest:choice.action === 'extension_request' ? choice.actorId : request ?
        (extensionActions.indexOf(choice.action) >= 0 && request.extension ? request.extension.actorId : request.actorId) : s.player.charId};
  }
  function eventQuote(s,a,ctx) {
    var source=eventSource(s,a,ctx),people=source && eventParties(s,source);
    if (!people || !ctx.storyReviewSource || Object.keys(people).some(function(slot) {
      var id=people[slot];return !ctx.participants || ctx.participants[slot] !== id || !s.chars[id] || s.chars[id].dead;
    })) return null;
    var q=FB.stories.quote(s,source.storyId,source.choiceId);
    return {allowed:!!q.allowed,source:source,review:q};
  }
  FB.eventStateReaders.register({id:'household_refuge_review',system:'story_tracks',args:eventArgs,
    read:function(s,a) {var source=eventSource(s,a,{});return !!(source && FB.stories.quote(s,source.storyId,source.choiceId).allowed);}});
  FB.eventReviews.register('household_refuge',{owner:'story_tracks',args:eventArgs,
    partySlots:{refuge_host:true,refuge_ruler:true,refuge_guest:true},
    bind:function(s,a,ctx) {var source=eventSource(s,a,ctx);return source ?
      {storyReviewSource:source,participants:eventParties(s,source)} : null;},
    quote:eventQuote,
    apply:function(s,a,q) {return FB.stories.apply(s,q.source.storyId,q.source.choiceId,q.review);},
    details:function(s,a,q) {var m=FB.stories.get(q.source.storyId),t=FB.stories.record(s,q.source.storyId);
      var facts=m.reviewFacts(s,t,q.source.choiceId,q.review) || [];
      return facts.map(function(v) { return FB.T('{label}: {value}',{label:v[0],value:v[1]}); })
        .concat(m.review(s,t,q.source.choiceId,q.review),q.allowed ? [] : [m.blocker(s,t,q.review.reason)]);}
  });
  FB.stories.registerType(TYPE,factory,'js/story_household_refuge.js',check);
  var validatePlatform=FB.save.v4.validatePlatform;
  FB.save.v4.validatePlatform=function(s) {
    validatePlatform(s);
    var bm=s.start && FB.campaignBookmark(s),reserved={},present={};
    (bm && bm.stories || []).forEach(function(id) { var m=FB.stories.get(id);
      if (m && m.declaration && m.declaration.type === TYPE && !FB.stories.record(s,id))
        throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+id}));
    });
    providers(s).forEach(function(v) {
      v.t.requests.forEach(function(r) { r.members.forEach(function(m) {
        if (reservesPerson(r,m)) {
          if (reserved[m.personId]) throw new Error(FB.T('Invalid saved shelter reservation.'));
          reserved[m.personId]=true;
        }
        if (admittedHere(m)) { if (present[m.personId]) throw new Error(FB.T('Invalid saved shelter presence.'));present[m.personId]=true; }
      }); });
      var b=budget(s,v.def);
      if (b.used > b.capacity) throw new Error(FB.T('Invalid saved shelter capacity.'));
    });return true;
  };
})();
