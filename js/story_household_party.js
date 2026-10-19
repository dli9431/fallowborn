/* Named association and consent. Optional journey adapters use the ordinary
   travel owner; property, custody and demographic people retain their owners. */
(function () {
  'use strict';
  var P = FB.householdParties = {}, TYPE = 'household_party';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function keys(o,list) { return !!o && typeof o === 'object' && !Array.isArray(o) &&
    Object.keys(o).every(function (k) { return list.indexOf(k) >= 0; }); }
  function exact(o,list) { return keys(o,list) && Object.keys(o).length === list.length; }
  function has(o,id) { return !!o && Object.prototype.hasOwnProperty.call(o,id); }
  function whole(n) { return Number.isSafeInteger(n) && n >= 0; }
  function ref(v) { return typeof v === 'string' && v.length > 0 && v.length <= 200; }
  function display(v) { return typeof v === 'string' && v.length > 0 && v.length <= 4000; }
  function rows(s) {
    return Object.keys(s.stories || {}).sort().filter(function (id) {
      var m=FB.stories.get(id); return m && m.declaration && m.declaration.type === TYPE;
    }).map(function (id) { return {id:id,t:s.stories[id]}; });
  }
  function reserves(m) { return m.status === 'invited' || m.status === 'accepted'; }
  function member(t,id) { return t.members.filter(function (m) { return m.personId === id; })[0] || null; }
  function adult(s,c) { return !!c && FB.ageOf(c,s.date.year) >= 16; }
  function parent(s,childId,parentId) {
    var c=s.chars[childId]; return !!c && (c.motherId === parentId || c.fatherId === parentId);
  }
  function free(s,c) {
    return !!c && !c.dead && !c.captive && !c.prisonerOf && !c.imprisoned && !c.exiled &&
      (c.health === undefined || c.health > 0) && !c.travel && !c.religiousActivity &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,c.id)) &&
      !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)) && !(FB.characterGuarded && FB.characterGuarded(s,c.id)) &&
      !(s.justice && s.justice.exiles && s.justice.exiles[c.id] && s.justice.exiles[c.id].endTurn > s.turn);
  }
  function homeAvailable(s,id) {
    var c=s.chars[id], p=s.player;
    if (P.journeys && P.journeys.location(s,id)) return false;
    if (!free(s,c) || !FB.householdMembers(s).some(function (v) { return v.id === id; }) ||
        c.homeProvinceId && c.homeProvinceId !== p.provinceId || FB.characterResidence(s,c) !== p.provinceId) return false;
    if (id === p.charId && (p.dead || p.travel || p.war || FB.atWarPersonally(s) || p.flags && p.flags.in_prison)) return false;
    // A real military or camp commitment is not an available relative at home.
    if (Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var r=FB.mobile && FB.mobile.row(s,rid);
      return r && r.status === 'active' && r.members.some(function (m) { return m.principal.id === id; });
    })) return false;
    if (Object.keys(s.stories || {}).some(function (sid) {
      var m=FB.stories.get(sid), t=s.stories[sid];
      return m && m.declaration && m.declaration.type === 'expedition_participation' && t.actorId === id &&
        (t.locationHeld || t.roleId && ['pending','active','suspended'].indexOf(t.status) >= 0);
    })) return false;
    return true;
  }
  P.reservedBy = function (s,id) {
    var found=rows(s).filter(function (r) { return r.t.status === 'forming' && r.t.members.some(function (m) {
      return m.personId === id && reserves(m);
    }); })[0];
    return found ? found.id : null;
  };
  function available(s,t,id) {
    var held=P.reservedBy(s,id);
    return (homeAvailable(s,id) || P.camps && P.camps.associationAvailable(s,t,id)) && (!held || held === t.partyId);
  }
  function cared(s,t,m) {
    var a=member(t,m.caregiverId);
    return !!a && a.kind === 'adult' && a.status === 'accepted' && adult(s,s.chars[a.personId]) &&
      available(s,t,a.personId) && parent(s,m.personId,a.personId);
  }
  function projection(s,t) {
    var accepted=[], waiting=[], excluded=[];
    t.members.forEach(function (m) {
      var ok=t.status === 'forming' && m.status === 'accepted' && available(s,t,m.personId) &&
        (m.kind === 'adult' ? adult(s,s.chars[m.personId]) : !adult(s,s.chars[m.personId]) && cared(s,t,m));
      if (ok) accepted.push(m.personId);
      else if (t.status === 'forming' && m.status === 'invited' && s.turn < m.endTurn && available(s,t,m.personId) &&
          (m.kind === 'adult' ? adult(s,s.chars[m.personId]) : !adult(s,s.chars[m.personId]) && cared(s,t,m))) waiting.push(m.personId);
      else excluded.push(m.personId);
    });
    return {accepted:accepted,waiting:waiting,excluded:excluded};
  }
  P.snapshot = function (s,id) {
    var m=FB.stories.get(id), t=s.stories && s.stories[id];
    return m && m.declaration && m.declaration.type === TYPE && t ? projection(s,t) : null;
  };
  P.review = function (s,id,action,actorId,personId,caregiverId) {
    var m=FB.stories.get(id);
    return m && m.declaration && m.declaration.type === TYPE ?
      m.partyReview(s,s.stories && s.stories[id],action,actorId,personId,caregiverId) : null;
  };
  P.commit = function (s,q) {
    var m=q && FB.stories.get(q.id);
    return !!(m && m.declaration && m.declaration.type === TYPE && m.partyCommit(s,s.stories && s.stories[q.id],q));
  };
  function check(def,context,bm) {
    function need(ok,field) { if (!ok) throw new Error('Invalid household party declaration: '+field+'.'); }
    need(keys(def,['id','type','title','intro','requires','registrationBefore','registrationAfter',
      'maxMembers','allowDependents','invitationDays','adultPolicy','journey']), 'fields');
    need(display(def.title) && display(def.intro), 'display');
    need(whole(def.maxMembers) && def.maxMembers >= 1 && def.maxMembers <= 16 &&
      whole(def.invitationDays) && def.invitationDays >= 1 && def.invitationDays <= 90, 'bounds');
    need(typeof def.allowDependents === 'boolean' && ['volunteers','refuse'].indexOf(def.adultPolicy) >= 0, 'consent policy');
    if (def.journey !== undefined) P.journeys.check(def,context,bm);
  }
  function factory(def) {
    function review(s,t,action,actorId,personId,caregiverId) {
      if (!t) return null;
      if (P.journeys && P.journeys.actions.indexOf(action) >= 0) return P.journeys.review(s,def,t,action,actorId,personId);
      personId=personId || null; caregiverId=caregiverId || null;
      var c=s.chars[personId], m=member(t,personId), owner=actorId === t.actorId && actorId === s.player.charId;
      var open=t.status === 'forming' && t.actorId === s.player.charId && free(s,s.chars[t.actorId]) && !s.player.dead;
      var allowed=false, affected=[];
      if (action === 'invite') {
        var care=member(t,caregiverId), isAdult=adult(s,c);
        allowed=open && owner && !m && t.members.length < def.maxMembers && available(s,t,t.actorId) && available(s,t,personId) &&
          (isAdult ? caregiverId === null : def.allowDependents && care && care.kind === 'adult' && care.status === 'accepted' &&
            adult(s,s.chars[caregiverId]) && available(s,t,caregiverId) && parent(s,personId,caregiverId));
      }
      if (action === 'accept') allowed=open && !!m && m.status === 'invited' && s.turn < m.endTurn && available(s,t,m.personId) &&
        (m.kind === 'adult' ? caregiverId === null && actorId === m.personId && adult(s,c) &&
          (owner || def.adultPolicy === 'volunteers') : caregiverId === m.caregiverId && actorId === m.caregiverId &&
          !adult(s,c) && cared(s,t,m));
      if (action === 'refuse') allowed=open && !!m && m.status === 'invited' &&
        (m.kind === 'adult' ? actorId === m.personId && free(s,c) && adult(s,c) :
          actorId === m.caregiverId && free(s,s.chars[actorId]) && adult(s,s.chars[actorId]) && parent(s,m.personId,actorId));
      if (action === 'withdraw') allowed=open && !!m && reserves(m) && (owner || actorId === m.personId && m.kind === 'adult' ||
        m.kind === 'dependent' && actorId === m.caregiverId && parent(s,m.personId,actorId)) && free(s,s.chars[actorId]) && adult(s,s.chars[actorId]);
      if (action === 'finish') allowed=t.status === 'forming' && owner && free(s,s.chars[t.actorId]) && !s.player.dead;
      if (action !== 'invite' && action !== 'accept' && caregiverId !== null) allowed=false;
      if (action === 'finish' && personId !== null) allowed=false;
      if (m && (action === 'withdraw' || action === 'refuse')) affected=[m.personId].concat(t.members.filter(function (d) {
        return d.caregiverId === m.personId && reserves(d);
      }).map(function (d) { return d.personId; }));
      return {id:def.id,action:action,actorId:actorId,personId:personId,caregiverId:caregiverId,allowed:!!allowed,affected:affected,
        facts:copy([def,t,s.turn,s.date,s.player.charId,!!s.player.dead,
          [actorId,personId,caregiverId].concat(t.members.map(function (v) { return v.personId; })).map(function (id) {
            var person=s.chars[id]; return [person || null,!!person && available(s,t,id)];
          }),projection(s,t)])};
    }
    function decide(s,m,status,actorId) { m.status=status; m.decidedTurn=s.turn; m.consentActorId=actorId; }
    function commit(s,t,q) {
      if (P.journeys && q && P.journeys.actions.indexOf(q.action) >= 0) return P.journeys.commit(s,def,t,q);
      var fresh=q && review(s,t,q.action,q.actorId,q.personId,q.caregiverId);
      if (!fresh || !fresh.allowed || !same(q,fresh)) return false;
      if (q.action === 'invite') {
        t.members.push({personId:q.personId,kind:adult(s,s.chars[q.personId]) ? 'adult' : 'dependent',caregiverId:q.caregiverId,
          status:'invited',invitedTurn:s.turn,endTurn:s.turn+def.invitationDays,decidedTurn:null,consentActorId:null});
      } else if (q.action === 'finish') {
        t.status='closed'; t.closedTurn=s.turn; t.closeReason='finished';
      } else {
        var m=member(t,q.personId);
        decide(s,m,q.action === 'accept' ? 'accepted' : q.action === 'refuse' ? 'refused' : 'withdrawn',q.actorId);
        if (q.action !== 'accept') t.members.forEach(function (d) {
          if (d.caregiverId === m.personId && reserves(d)) decide(s,d,'withdrawn',q.actorId);
        });
      }
      t.revision++; return true;
    }
    function day(s,t) {
      if (P.journeys && t.version >= 2) { P.journeys.tick(s,t); return; }
      if (t.status !== 'forming') return;
      if (t.actorId !== s.player.charId || s.player.dead || !free(s,s.chars[t.actorId])) {
        t.status='closed'; t.closedTurn=s.turn; t.closeReason=t.actorId !== s.player.charId ? 'succession' : 'actor'; t.revision++; return;
      }
      t.members.forEach(function (m) {
        if (!reserves(m)) return;
        if (m.status === 'invited' && s.turn >= m.endTurn) { decide(s,m,'expired',null); t.revision++; return; }
        if (!available(s,t,m.personId) || m.kind === 'adult' && !adult(s,s.chars[m.personId]) ||
            m.kind === 'dependent' && (adult(s,s.chars[m.personId]) || !cared(s,t,m))) {
          decide(s,m,'withdrawn',null); t.revision++; return;
        }
        if (m.kind === 'adult' && m.status === 'invited' && m.personId !== s.player.charId) {
          var q=review(s,t,def.adultPolicy === 'volunteers' ? 'accept' : 'refuse',m.personId,m.personId);
          if (q.allowed) commit(s,t,q);
        }
      });
      // A removed parent releases every still-reserved dependent in this boundary.
      t.members.forEach(function (m) {
        if (m.kind === 'dependent' && reserves(m) && !cared(s,t,m)) { decide(s,m,'withdrawn',null); t.revision++; }
      });
    }
    var fields=['version','partyId','householdId','actorId','revision','status','openedTurn','closedTurn','closeReason','members'];
    var memberFields=['personId','kind','caregiverId','status','invitedTurn','endTurn','decidedTurn','consentActorId'];
    function validate(t,s) {
      function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+def.id})); }
      need(exact(t,t.version >= 2 ? fields.concat(['journey']) : fields) && (t.version === 1 || t.version === 2 && !!def.journey &&
        def.journey.kind === 'ordinary_journey' || t.version === 3 && !!def.journey) && t.partyId === def.id && ref(t.actorId) && t.householdId === t.actorId && whole(t.revision) &&
        whole(t.openedTurn) && ['forming','closed'].indexOf(t.status) >= 0);
      need(t.status === 'forming' ? t.closedTurn === null && t.closeReason === null : whole(t.closedTurn) && t.closedTurn >= t.openedTurn &&
        (['finished','actor','succession'].indexOf(t.closeReason) >= 0 || t.version >= 2 && t.closeReason === 'departed'));
      need(Array.isArray(t.members) && t.members.length <= def.maxMembers);
      t.members.forEach(function (m,i) {
        need(exact(m,memberFields) && ref(m.personId) && t.members.every(function (v,j) { return i === j || v.personId !== m.personId; }) &&
          ['adult','dependent'].indexOf(m.kind) >= 0 && ['invited','accepted','refused','withdrawn','expired'].indexOf(m.status) >= 0 &&
          whole(m.invitedTurn) && m.invitedTurn >= t.openedTurn && m.endTurn === m.invitedTurn+def.invitationDays &&
          (m.decidedTurn === null || whole(m.decidedTurn) && m.decidedTurn >= m.invitedTurn));
        need(m.status === 'invited' ? m.decidedTurn === null && m.consentActorId === null : m.decidedTurn !== null);
        need(m.status !== 'accepted' && m.status !== 'refused' || m.consentActorId === (m.kind === 'adult' ? m.personId : m.caregiverId));
        if (m.status === 'accepted') need(m.decidedTurn < m.endTurn && (m.personId === t.actorId || m.kind === 'dependent' || def.adultPolicy === 'volunteers'));
        if (m.status === 'expired') need(m.decidedTurn >= m.endTurn && m.consentActorId === null);
        if (m.status === 'withdrawn') need(m.consentActorId === null || m.consentActorId === t.actorId || m.consentActorId === m.personId || m.consentActorId === m.caregiverId);
        var care=member(t,m.caregiverId);
        need(m.kind === 'adult' ? m.caregiverId === null : def.allowDependents && ref(m.caregiverId) && m.caregiverId !== m.personId &&
          care && care.kind === 'adult' && care.invitedTurn <= m.invitedTurn);
        if (m.kind === 'dependent' && reserves(m)) need(care.status === 'accepted' && care.decidedTurn <= m.invitedTurn);
        if (s) {
          need(m.invitedTurn <= s.turn && (m.decidedTurn === null || m.decidedTurn <= s.turn) &&
            (t.closedTurn === null || m.invitedTurn <= t.closedTurn && (m.decidedTurn === null || m.decidedTurn <= t.closedTurn)));
          if (t.status === 'forming' && reserves(m)) {
            need(has(s.chars,m.personId) && s.chars[m.personId].id === m.personId);
            if (m.kind === 'dependent') need(parent(s,m.personId,m.caregiverId));
          }
        }
      });
      if (t.version >= 2) P.journeys.validate(t,s,def);
      if (s) need(t.actorId === s.player.houseFounderId && t.openedTurn <= s.turn && (t.closedTurn === null || t.closedTurn <= s.turn) &&
        (t.status === 'closed' || has(s.chars,t.actorId) && s.chars[t.actorId].id === t.actorId));
    }
    function name(s,id) { return s.chars[id] ? FB.fullName(s.chars[id]) : FB.T('Unavailable person'); }
    function label(status) { return {invited:FB.T('Awaiting consent'),accepted:FB.T('Consented'),refused:FB.T('Declined'),
      withdrawn:FB.T('Withdrawn'),expired:FB.T('Invitation expired')}[status]; }
    function menu(s,t) {
      var out=P.journeys ? P.journeys.menu(s,def,t) : [];
      if (t.status !== 'forming' || t.actorId !== s.player.charId) return out;
      function add(action,id,care,text) {
        out.push({id:JSON.stringify([action,id || null,care || null]),label:text,detail:FB.T('Review named consent. This costs no money and moves nobody.'),
          action:action,personId:id || null,caregiverId:care || null});
      }
      FB.householdMembers(s).slice().sort(function (a,b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }).slice(0,32).forEach(function (c) {
        if (member(t,c.id)) return;
        if (adult(s,c)) add('invite',c.id,null,FB.T('Invite {name}',{name:name(s,c.id)}));
        else if (def.allowDependents) t.members.filter(function (a) { return a.kind === 'adult' && a.status === 'accepted' && parent(s,c.id,a.personId); }).forEach(function (a) {
          add('invite',c.id,a.personId,FB.T('Invite {name} with {parent} as caregiver',{name:name(s,c.id),parent:name(s,a.personId)}));
        });
      });
      t.members.forEach(function (m) {
        if (m.status === 'invited' && (m.personId === t.actorId || m.caregiverId === t.actorId)) {
          add('accept',m.personId,m.caregiverId,FB.T('Consent for {name}',{name:name(s,m.personId)}));
          add('refuse',m.personId,null,FB.T('Decline for {name}',{name:name(s,m.personId)}));
        }
        if (reserves(m)) add('withdraw',m.personId,null,FB.T('Remove {name} from the plan',{name:name(s,m.personId)}));
      });
      add('finish',null,null,FB.T('Set this plan aside')); return out;
    }
    var module={id:def.id,kind:'track',requires:def.requires,
      init:function (s) { return {version:1,partyId:def.id,householdId:s.player.charId,actorId:s.player.charId,revision:0,
        status:'forming',openedTurn:s.turn,closedTurn:null,closeReason:null,members:[]}; },
      title:function () { return FB.T(def.title); },intro:function () { return FB.T(def.intro); },
      status:function (s,t) { return {phase:t.status,name:FB.T(def.title),lines:[
        t.status === 'forming' ? FB.T('A named household plan is open. Each adult decides separately.') : FB.T('This household plan is closed.'),
        FB.T('Association alone supplies no journey, camp admission or change of residence.')].concat(P.journeys ? P.journeys.lines(s,t) : []).concat(t.members.map(function (m) {
          return FB.T('{name}: {status}.',{name:name(s,m.personId),status:label(m.status)});
        }))}; },
      people:function (s,t) { return t.members.map(function (m) { return {characterId:m.personId,label:label(m.status),
        detail:m.caregiverId ? FB.T('Caregiver: {name}.',{name:name(s,m.caregiverId)}) : FB.T('Adult consent is personal.'),reason:''}; }); },
      choices:menu,
      quote:function (s,t,id) { var c=menu(s,t).filter(function (v) { return v.id === id; })[0];
        return review(s,t,c ? c.action : '',s.player.charId,c && c.personId,c && c.caregiverId); },
      apply:function (s,t,id,q) { var c=menu(s,t).filter(function (v) { return v.id === id; })[0];
        return !!(c && q && q.actorId === s.player.charId && c.action === q.action && c.personId === q.personId && c.caregiverId === q.caregiverId && commit(s,t,q)); },
      blocker:function () { return FB.T('Use free, present people with current consent and parent care. Journey decisions also require an available ordinary route, sufficient private funds and the normal return or settlement eligibility.'); },
      review:function (s,t,id,q) { if (q.journeyReview) return P.journeys.describe(s,t,q);
        return [FB.T('This costs no money, action days or population and grants no travel or admission.'),
        q.affected.length ? FB.T('This review removes: {names}.',{names:q.affected.map(function (pid) { return name(s,pid); }).join(', ')}) :
          FB.T('A separate invitation expires after {days} days unless accepted.',{days:def.invitationDays})]; },
      day:day,season:day,year:day,validate:validate};
    module.partyReview=review; module.partyCommit=commit; return module;
  }
  P.validateAssociations = function (s) {
    function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.household_party'})); }
    FB.stories.originalAttachments(s,'track').forEach(function (id) {
      var m=FB.stories.get(id); if (m && m.declaration && m.declaration.type === TYPE) need(!!s.stories && !!s.stories[id]);
    });
    var reserved=Object.create(null);
    rows(s).forEach(function (r) { if (r.t.status === 'forming') r.t.members.forEach(function (m) {
      if (reserves(m)) { need(!reserved[m.personId]); reserved[m.personId]=r.id; }
    }); });
    if (P.journeys) P.journeys.validateState(s,reserved);
    return true;
  };
  FB.stories.registerType(TYPE,factory,'js/story_household_party.js',check);
})();
