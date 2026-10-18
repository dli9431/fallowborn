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
  function reservesPerson(r,m) { return ['requested','offered'].indexOf(r.status) >= 0 ||
    ['active','challenged'].indexOf(r.status) >= 0 && m.admittedTurn !== null && m.leftTurn === null; }
  function places(r) { return r.status === 'offered' ? r.members.length :
    r.members.filter(function(m) { return m.admittedTurn !== null && m.leftTurn === null; }).length; }
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
        v.def.provider.institutionId !== institutionId && m.admittedTurn !== null && m.leftTurn === null); });
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
  function end(s,t,r,status,reason) { r.status=status;r.closedTurn=s.turn;r.reason=reason;t.revision++; }
  function cost(def,count) { return def.funding.perPersonDay*def.termDays*count; }
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
        }
      }
      return {id:def.id,action:action,actorId:actorId,terms:copy(terms),allowed:!!allowed,cost:amount,
        facts:{definition:copy(def),record:copy(t),provider:c,budget:b,pressure:p,people:people,
          characters:copy(s.chars),parties:def.partyIds.map(function(id) { return copy(party(s,id)); }),
          travel:copy(s.player.travel || null),player:copy(s.player),turn:s.turn,date:now}};
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
        // A fresh confirmed term may supersede an ended promise at this same
        // site. Release only its old presence witness, never move the person.
        providers(s).forEach(function(v) { if (v.def.provider.institutionId !== def.provider.institutionId) return;
          v.t.requests.forEach(function(prior) { if (prior === r || liveStates.indexOf(prior.status) >= 0) return;
            prior.members.forEach(function(m) { if (m.admittedTurn !== null && m.leftTurn === null && q.terms.personIds.indexOf(m.personId) >= 0) {
              m.leftTurn=s.turn;v.t.revision++;
            } });
          });
        });
        r.members.forEach(function(m) { if (q.terms.personIds.indexOf(m.personId) >= 0) m.admittedTurn=s.turn; });
        r.status='active';r.endTurn=s.turn+def.termDays;
      } else { end(s,t,r,q.action === 'decline' ? 'declined' : 'ended',q.action);return true; }
      t.revision++;return true;
    }
    function tick(s,t) {
      var c=current(s,def),b=budget(s,def),p=pressure(s,def);
      t.requests.forEach(function(r) {
        var active=liveStates.indexOf(r.status) >= 0,ids=r.members.map(function(m) { return m.personId; });
        r.members.forEach(function(m) {
          if (m.admittedTurn !== null && m.leftTurn === null && !countyPresent(s,m.personId,def.locality.provinceId)) {
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
          if (s.turn >= r.endTurn) { end(s,t,r,'expired','term');return; }
          var occupants=r.members.filter(function(m) { return m.admittedTurn !== null && m.leftTurn === null; });
          if (!occupants.length) { end(s,t,r,'ended','departure');return; }
          if (occupants.some(function(m) { return !eligibleMembers(s,r,occupants.map(function(v) { return v.personId; })); })) {
            end(s,t,r,'interrupted','care');return;
          }
          if (p.length && r.status === 'active') { r.status='challenged';r.incident=copy(p[p.length-1]);t.revision++; }
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
      need(exact(t,['version','locality','revision','openedTurn','requests']) && t.version === 1 && same(t.locality,def.locality) &&
        whole(t.revision) && t.revision <= 1000000 && t.openedTurn === 0 && Array.isArray(t.requests) && t.requests.length <= 8);
      var known=[];
      if (s) need((FB.campaignBookmark(s).stories || []).indexOf(def.id) >= 0 && FB.householdStories.localityValid(t.locality,FB.campaignBookmark(s)));
      t.requests.forEach(function(r,i) {
        need(exact(r,['id','partyId','actorId','provider','members','status','requestedTurn','replyTurn','endTurn','closedTurn','reason','authorization','payment','incident']) &&
          r.id === 'r'+(i+1) && def.partyIds.indexOf(r.partyId) >= 0 && ref(r.actorId) && whole(r.requestedTurn) &&
          r.replyTurn === r.requestedTurn+def.acceptanceDays && liveStates.concat(closedStates).indexOf(r.status) >= 0);
        var v=r.provider;
        need(exact(v,['institutionId','officeId','incumbentId','realmId','rulerId','generation']) &&
          v.institutionId === def.provider.institutionId && v.officeId === def.provider.officeId && ref(v.realmId) &&
          ref(v.rulerId) && ref(v.incumbentId) && whole(v.generation) && v.generation >= 1);
        need(Array.isArray(r.members) && r.members.length > 0 && r.members.length <= def.capacity);
        var seen=[],admitted=[];
        r.members.forEach(function(m) {
          need(exact(m,['personId','caregiverId','partyConsentTurn','consentBy','consentTurn','admittedTurn','leftTurn']) && ref(m.personId) &&
            seen.indexOf(m.personId) < 0 && (m.caregiverId === null || ref(m.caregiverId) && m.caregiverId !== m.personId));
          need(whole(m.partyConsentTurn) && m.partyConsentTurn <= r.requestedTurn);
          seen.push(m.personId);if (known.indexOf(m.personId) < 0) known.push(m.personId);
          need(m.consentBy === null ? m.consentTurn === null : m.consentBy === (m.caregiverId || m.personId) &&
            whole(m.consentTurn) && m.consentTurn >= r.requestedTurn && m.consentTurn < r.replyTurn);
          need(m.admittedTurn === null ? m.leftTurn === null : m.consentBy !== null && whole(m.admittedTurn) &&
            m.admittedTurn >= m.consentTurn && m.admittedTurn < r.replyTurn && r.payment && m.admittedTurn >= r.payment.turn &&
            (m.leftTurn === null || whole(m.leftTurn) && m.leftTurn >= m.admittedTurn));
          if (m.admittedTurn !== null) admitted.push(m.personId);
          if (s) {
            var pt=party(s,r.partyId),pm=pt && pt.members.filter(function(v) { return v.personId === m.personId; })[0];
            need(!!s.chars[m.personId] && pm && pm.decidedTurn !== null &&
              (pm.status === 'accepted' && pm.decidedTurn === m.partyConsentTurn || pm.status === 'withdrawn' && pm.decidedTurn >= m.partyConsentTurn) &&
              m.partyConsentTurn >= pm.invitedTurn && m.partyConsentTurn < pm.endTurn &&
              (pm.kind === 'dependent' ? pm.caregiverId : null) === m.caregiverId &&
              (m.caregiverId === null || s.chars[m.personId].motherId === m.caregiverId || s.chars[m.personId].fatherId === m.caregiverId) &&
              (m.consentTurn === null || m.consentTurn <= s.turn) && (m.admittedTurn === null || m.admittedTurn <= s.turn) &&
              (m.leftTurn === null || m.leftTurn <= s.turn));
            [r.requestedTurn,m.consentTurn,m.admittedTurn].filter(function(turn) { return turn !== null; }).forEach(function(turn) {
              var year=FB.dateAtTurn(s,turn).year,age=FB.ageOf(s.chars[m.personId],year);
              need(m.caregiverId === null ? age >= 16 : age < 16 && FB.ageOf(s.chars[m.caregiverId],year) >= 16);
            });
          }
        });
        need(known.length <= 16 && r.members.every(function(m) { return !m.caregiverId || seen.indexOf(m.caregiverId) >= 0 &&
          (m.admittedTurn === null || admitted.indexOf(m.caregiverId) >= 0); }));
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
        if (r.status === 'requested') need(r.payment === null && !admitted.length);
        if (r.status === 'offered') need(r.payment !== null && !admitted.length);
        if (r.status === 'active' || r.status === 'challenged') need(r.payment !== null && admitted.length > 0);
        need(liveStates.indexOf(r.status) >= 0 ? r.closedTurn === null && r.reason === null : whole(r.closedTurn) &&
          r.closedTurn >= r.requestedTurn && ['decline','leave','provider','deadline','consent','attempt','term','departure','care'].indexOf(r.reason) >= 0);
        if (r.closedTurn !== null) need((r.authorization === null || r.authorization.turn <= r.closedTurn) &&
          (r.payment === null || r.payment.turn <= r.closedTurn) && r.members.every(function(m) {
            return (m.consentTurn === null || m.consentTurn <= r.closedTurn) && (m.admittedTurn === null || m.admittedTurn <= r.closedTurn);
          }));
        if (r.status === 'expired') need(r.reason === 'deadline' ? !admitted.length && r.closedTurn >= r.replyTurn :
          r.reason === 'term' && admitted.length > 0 && r.closedTurn >= r.endTurn);
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
        FB.T('Payment is final when offered. Places promise no provisions, guards, safe road, conversion or property transfer.')].concat(t.requests.map(function(r) {
          return FB.T('Request {id}: {status}. Days remaining in this offer or term: {days}. People still present at the shelter: {count}.',
            {id:r.id,status:phaseLabel(r.status),days:liveStates.indexOf(r.status) >= 0 ? Math.max(0,(r.endTurn === null ? r.replyTurn : r.endTurn)-s.turn) : 0,count:r.members.filter(function(m) {
            return m.admittedTurn !== null && m.leftTurn === null && countyPresent(s,m.personId,def.locality.provinceId);
          }).length});
        }))}; },
      choices:menu,
      quote:function(s,t,id) { var m=menu(s,t).filter(function(v) { return v.id === id; })[0];return m ? quote(s,t,m.action,m.actorId,m.terms) : {allowed:false}; },
      apply:function(s,t,id,q) { var m=menu(s,t).filter(function(v) { return v.id === id; })[0];return !!(m && q && q.action === m.action && q.actorId === m.actorId && same(q.terms,m.terms) && commit(s,t,q)); },
      review:function(s,t,id,q) { var r=q.terms.requestId && row(t,q.terms.requestId),ids=q.terms.personIds ||
        r && r.members.map(function(m) { return m.personId; }) || [];
        return [FB.T('Exact people: {names}.',{names:ids.map(function(id) { return (s.chars[id] || {}).name || id; }).join(', ')}),
        FB.T('Institutional consent: {protector}. Civil authorization and public payer: {ruler}.',
          {protector:(q.facts.provider.office || {}).name || FB.T('Unavailable person'),ruler:(q.facts.provider.ruler || {}).name || FB.T('Unavailable person')}),
        FB.T('Public cost now: {money:cost}. No household fee. No action days.',{cost:q.cost}),
        FB.T('Offering prepays {money:cost} for these people. No refund is promised. Ending this agreement ends protection for its whole named group.',
          {cost:cost(def,r ? r.members.length : ids.length)}),
        FB.T('Every adult and actual caregiver decides separately. Ending protection does not move the occupants.'),
        FB.T('Use the ordinary named-party journey for departure, return or eligible settlement.')]; },
      blocker:function() { return FB.T('Current consent, local access, a living authorized provider, free places, unexpired terms and the named public funds are required. A committed local attempt blocks entry.'); },
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
      return m.personId === id && m.admittedTurn !== null && m.leftTurn === null && countyPresent(s,id,v.def.locality.provinceId);
    })) found=copy(v.def.locality); }); });return found;
  };
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
        var location=m.admittedTurn !== null && m.leftTurn === null;
        if (reservesPerson(r,m)) {
          if (reserved[m.personId]) throw new Error(FB.T('Invalid saved shelter reservation.'));
          reserved[m.personId]=true;
        }
        if (location) { if (present[m.personId]) throw new Error(FB.T('Invalid saved shelter presence.'));present[m.personId]=true; }
      }); });
      var b=budget(s,v.def);
      if (b.used > b.capacity) throw new Error(FB.T('Invalid saved shelter capacity.'));
    });return true;
  };
})();
