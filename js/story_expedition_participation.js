/* Named guests use existing camp and army carriers. Admission never recruits
   population, creates command authority or settles a household. */
(function () {
  'use strict';
  var P = FB.expeditionParticipants = {}, TYPE = 'expedition_participation';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function keys(o,allowed) { return !!o && typeof o === 'object' && !Array.isArray(o) &&
    Object.keys(o).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function ref(v) { return typeof v === 'string' && v.length > 0 && v.length <= 200; }
  function whole(v) { return Number.isSafeInteger(v) && v >= 0; }
  function display(v) { return typeof v === 'string' && v.length > 0 && v.length <= 4000; }
  function free(s,c) { return !!c && !c.dead && !c.captive && !c.prisonerOf && !c.imprisoned && !c.exiled &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)); }
  function rows(s) {
    return Object.keys(s.stories || {}).sort().filter(function (id) {
      var module = FB.stories.get(id);
      return module && module.declaration && module.declaration.type === TYPE;
    }).map(function (id) { return {id:id,def:FB.stories.get(id).declaration,t:s.stories[id]}; });
  }
  function role(def,t) { return def.roles.filter(function (r) { return r.id === t.roleId; })[0] || null; }
  function realm(s,def) { return FB.startRealmId(s,def.host.realmId); }
  function carrier(s,def,t) {
    var rid=realm(s,def), r=FB.mobile.row(s,rid), m=FB.mobile.migration(s,rid), kind=role(def,t);
    if (!r || r.status !== 'active' || !s.realms[rid] || !s.realms[rid].alive || !m || m.id !== t.migrationId ||
        ['settled','failed'].indexOf(m.status) >= 0) return null;
    if (kind && kind.kind === 'combatant') {
      var h=FB.mobile.host(s,rid), c=s.chars[t.actorId];
      var count=h && (h.mobileRoster || []).reduce(function (n,v) {
        return n + (v.memberId === kind.memberId && c && v.culture === c.culture && v.religion === c.religion ? v.count : 0);
      },0);
      return h && h.id === t.hostId && count >= t.slot ? h.at : null;
    }
    return m.at;
  }
  function check(def,context,bm) {
    function need(ok,field) { if (!ok) throw new Error('Invalid personal expedition declaration: '+field+'.'); }
    need(keys(def,['id','type','title','intro','requires','host','termDays','capacity','acceptance','roles','registrationBefore','registrationAfter']), 'fields');
    need(display(def.title) && display(def.intro) && keys(def.host,['kind','realmId']) &&
      def.host.kind === 'realm_ruler' && slug(def.host.realmId), 'host or display');
    need(whole(def.termDays) && def.termDays >= 1 && def.termDays <= 1440 &&
      whole(def.capacity) && def.capacity >= 1 && def.capacity <= 32, 'bounds');
    need(['volunteers','closed'].indexOf(def.acceptance) >= 0, 'acceptance policy');
    need(Array.isArray(def.roles) && def.roles.length >= 1 && def.roles.length <= 2, 'roles');
    def.roles.forEach(function (r,i) {
      need(keys(r,['id','kind','memberId']) && slug(r.id) && ['leave','cancel','confirm','return_home'].indexOf(r.id) < 0 &&
        def.roles.every(function (v,j) { return i === j || v.id !== r.id; }), 'role id');
      need(['civilian','combatant'].indexOf(r.kind) >= 0 && (r.kind === 'combatant' ? slug(r.memberId) : r.memberId === undefined), 'role kind');
    });
    if (bm) {
      var d=(bm.realms || []).filter(function (r) { return r.id === def.host.realmId; })[0];
      var p=d && d.mobile && FBDATA.mobileProfiles[d.mobile.profileId];
      need(!!p, 'mobile host');
      def.roles.forEach(function (r) { if (r.kind === 'combatant') need(p.members.some(function (m) { return m.id === r.memberId; }), 'roster member'); });
      (bm.stories || []).forEach(function (id) {
        var other=context.get(id), decl=other && other.declaration;
        if (decl && decl.type === TYPE && decl.host.realmId === def.host.realmId) need(decl.capacity === def.capacity, 'shared host capacity');
      });
    }
  }
  P.location = function (s) {
    if (s.player.travel && s.player.travel.participationId && s.player.travel.phase === 'return') return s.player.travel.currentId;
    var found=rows(s).filter(function (v) { return v.t.actorId === s.player.charId && v.t.locationHeld; })[0];
    return found ? (['active','suspended'].indexOf(found.t.status) >= 0 && carrier(s,found.def,found.t) || found.t.lastPlace) : null;
  };
  P.arrivedHome = function (s) { P.checkpoint(s,s.player.provinceId,true); };
  P.checkpoint = function (s,pid,released) {
    rows(s).forEach(function (v) {
      if (v.t.actorId === s.player.charId && v.t.locationHeld) {
        v.t.lastPlace=pid; v.t.lastTurn=s.turn; v.t.locationHeld=!released; v.t.revision++;
      }
    });
  };
  P.review = function (s,id,action,actorId,roleId) {
    var module=FB.stories.get(id);
    return module && module.declaration && module.declaration.type === TYPE ? module.participationReview(s,s.stories[id],action,actorId,roleId) : null;
  };
  P.commit = function (s,q) {
    var module=q && FB.stories.get(q.id);
    return !!(module && module.declaration && module.declaration.type === TYPE &&
      module.participationCommit(s,s.stories[q.id],q));
  };
  P.validateCarriers = function (s) {
    function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.player.travel.participationId'})); }
    var scenario=s.start && (FBDATA.startScenarios || []).filter(function (r) { return r.id === s.start.scenarioId; })[0];
    (scenario ? FB.startTracks(scenario,s.start.provinceId || scenario.fixedProvinceId || s.player.provinceId) : []).forEach(function (id) {
      var module=FB.stories.get(id);
      if (module && module.declaration && module.declaration.type === TYPE) need(!!s.stories && !!s.stories[id]);
    });
    var t=s.player.travel, all=rows(s), held=all.filter(function (v) { return v.t.actorId === s.player.charId && v.t.locationHeld; });
    need(held.length <= 1);
    if (held.length && !s.player.dead && !(s.chars[s.player.charId] || {}).dead) need(!!t && t.participationId === held[0].id);
    if (!t || t.participationId === undefined) return true;
    var owner=all.filter(function (v) { return v.id === t.participationId; })[0];
    need(!!owner && owner.t.actorId === s.player.charId && owner.t.locationHeld);
    need(keys(t,['purpose','participationId','homeId','destinationId','destinationRealm','currentId','phase','remainingRoute',
      'outboundRoute','visited','legDaysLeft','legDays','startTurn','cost','overhead','encounters','seenCultures','seenEvents','completed']) && Object.keys(t).length === 19);
    need(t.purpose === FB.travelDefault('relationship') && t.homeId === s.player.provinceId && t.destinationRealm === null &&
      ['arrived','return'].indexOf(t.phase) >= 0 && t.completed === true && whole(t.startTurn) && t.startTurn <= s.turn);
    need([t.currentId,t.destinationId].every(function (pid) { return Object.prototype.hasOwnProperty.call(s.owner,pid); }));
    need(Number.isFinite(t.legDays) && t.legDays > 0 && t.legDays <= 1440 && Number.isFinite(t.legDaysLeft) && t.legDaysLeft >= 0 &&
      Number.isFinite(t.cost) && t.cost >= 0 && t.cost <= 1000000000 && t.overhead === t.cost);
    ['remainingRoute','outboundRoute','visited'].forEach(function (key) {
      need(Array.isArray(t[key]) && t[key].length <= Object.keys(s.owner).length && t[key].every(function (pid) {
        return Object.prototype.hasOwnProperty.call(s.owner,pid);
      }));
    });
    need(t.outboundRoute.length === 0 && t.visited.length === 1 && t.visited[0] === t.destinationId);
    need(keys(t.encounters,['culture','road']) && whole(t.encounters.culture) && whole(t.encounters.road) &&
      keys(t.seenCultures,Object.keys(FBDATA.cultures)) && keys(t.seenEvents,(FBDATA.events || []).map(function (e) { return e.id; })) &&
      Object.keys(t.seenCultures).every(function (id) { return t.seenCultures[id] === 1; }) &&
      Object.keys(t.seenEvents).every(function (id) { return t.seenEvents[id] === 1; }));
    if (t.phase === 'arrived') need(t.remainingRoute.length === 0 && t.legDaysLeft === 0 && t.currentId === owner.t.lastPlace);
    else {
      need(['active','suspended','pending'].indexOf(owner.t.status) < 0 && t.remainingRoute.length > 0 &&
        t.remainingRoute[t.remainingRoute.length-1] === t.homeId);
      var previous=t.currentId;
      t.remainingRoute.forEach(function (pid) { need(!!FB.world.adj[previous] && !!FB.world.adj[previous][pid]); previous=pid; });
    }
    return true;
  };
  function factory(def) {
    function facts(s,t) {
      var rid=realm(s,def), r=FB.mobile.row(s,rid), m=FB.mobile.migration(s,rid), leader=FB.mobile.leader(s,rid), h=FB.mobile.host(s,rid);
      return {rid:rid,r:r,m:m,h:h,leader:leader,generation:FB.realmRulerGeneration(s,rid)};
    }
    function present(s,t,f) {
      var pid=P.location(s) || s.player.provinceId;
      return !!f.m && pid === f.m.at && (!f.h || !f.h.mobileCourt || !(f.h.moveLeft > 0 || (f.h.path || []).length));
    }
    function eligible(s,t,f) {
      var c=s.chars[t.actorId];
      return t.actorId === s.player.charId && !s.player.dead && free(s,c) && FB.ageOf(c,s.date.year) >= 16 &&
        FB.station.isFreeUnlanded(s.player,s) && (!s.player.travel || s.player.travel.participationId === def.id) && !(s.player.flags && s.player.flags.in_prison) &&
        !FB.atWarPersonally(s) && !!f.leader && !!f.r && f.r.status === 'active' && present(s,t,f) &&
        !Object.keys(s.authority.governments).some(function (rid) {
          var r=FB.mobile.row(s,rid); return r && r.members.some(function (m) { return m.principal.id === t.actorId; });
        });
    }
    function allocation(s,t,f,selected) {
      var peers=rows(s).filter(function (v) { return v.t !== t && ['active','suspended','pending'].indexOf(v.t.status) >= 0 &&
        v.t.roleId && realm(s,v.def) === f.rid; });
      var capacity=Math.min.apply(Math,[def.capacity].concat(peers.map(function (v) { return v.def.capacity; })));
      if (peers.length >= capacity || rows(s).some(function (v) { return v.t !== t && v.t.actorId === t.actorId &&
          (v.t.locationHeld || v.t.roleId && ['active','suspended','pending'].indexOf(v.t.status) >= 0); })) return null;
      if (selected.kind === 'civilian') return {hostId:null,slot:null};
      var c=s.chars[t.actorId], h=f.h;
      if (!h || h.at !== f.m.at || h.moveLeft > 0 || (h.path || []).length) return null;
      var count=(h.mobileRoster || []).reduce(function (n,v) {
        return n+(v.memberId === selected.memberId && v.culture === c.culture && v.religion === c.religion ? v.count : 0);
      },0), slot=1;
      while (peers.some(function (v) { var r=role(v.def,v.t); return r && r.kind === 'combatant' &&
        r.memberId === selected.memberId && v.t.hostId === h.id && v.t.slot === slot; })) slot++;
      return slot <= count ? {hostId:h.id,slot:slot} : null;
    }
    function review(s,t,action,actorId,roleId) {
      if (!t) return null;
      var f=facts(s,t), selected=def.roles.filter(function (r) { return r.id === (roleId || t.roleId); })[0],
        ownActor=actorId === t.actorId && actorId === s.player.charId,
        hostActor=!!f.leader && actorId === f.leader.id,
        alloc=selected && f.m && allocation(s,t,f,selected), allowed=false, road=null;
      if (action === 'request') allowed=ownActor && t.status === 'pending' && t.roleId === null && !!selected && !!alloc && eligible(s,t,f);
      if (action === 'confirm') allowed=ownActor && t.status === 'suspended' && s.turn < t.endTurn && eligible(s,t,f);
      if (action === 'accept') allowed=hostActor && def.acceptance === 'volunteers' && t.status === 'pending' && !!t.roleId &&
        s.turn < t.endTurn && eligible(s,t,f) && !!alloc && t.leaderId === f.leader.id && t.generation === f.generation && t.migrationId === f.m.id;
      if (action === 'decline') allowed=hostActor && t.status === 'pending' && !!t.roleId;
      if (action === 'leave') allowed=ownActor && ['pending','active','suspended'].indexOf(t.status) >= 0;
      if (action === 'return_home') {
        road=FB.travelTemporaryReturnQuote(s);
        allowed=ownActor && ['pending','active','suspended'].indexOf(t.status) < 0 && t.locationHeld && !!road && road.allowed;
      }
      if (action !== 'request' && roleId !== undefined && roleId !== null) allowed=false;
      return {id:def.id,action:action,actorId:actorId,roleId:roleId || null,allowed:!!allowed,allocation:alloc,road:road,
        facts:copy([def,t,s.turn,s.date,s.player,s.chars[t.actorId],f,s.authority.contracts,rows(s),s.owner,s.holder])};
    }
    function close(s,t,status,reason) {
      var at=carrier(s,def,t);
      if (at && t.locationHeld) { t.lastPlace=at; t.lastTurn=s.turn; }
      t.status=status; t.endedTurn=s.turn; t.reason=reason; t.revision++;
      if (s.player.travel && s.player.travel.participationId === def.id && t.lastPlace) FB.travelUpdateTemporaryCarrier(s,t.lastPlace);
      if (t.actorId !== s.player.charId || s.player.dead || (s.chars[t.actorId] || {}).dead) {
        t.locationHeld=false;
        if (s.player.travel && s.player.travel.participationId === def.id) s.player.travel=null;
      }
      if (t.lastPlace === s.player.provinceId) {
        t.locationHeld=false;
        if (s.player.travel && s.player.travel.participationId === def.id) s.player.travel=null;
      }
    }
    function commit(s,t,q) {
      var fresh=q && review(s,t,q.action,q.actorId,q.roleId);
      if (!fresh || !fresh.allowed || !same(fresh,q)) return false;
      var f=facts(s,t);
      if (q.action === 'leave' || q.action === 'decline') close(s,t,q.action === 'leave' ? 'left' : 'declined',q.action);
      else if (q.action === 'return_home') {
        if (!FB.travelTemporaryReturnApply(s,q.road)) return false;
      } else if (q.action === 'request' || q.action === 'confirm') {
        t.status='pending'; t.roleId=q.roleId || t.roleId; t.leaderId=f.leader.id; t.generation=f.generation;
        t.migrationId=f.m.id; t.requestedTurn=s.turn;
        if (t.endTurn === null) t.endTurn=s.turn+def.termDays;
        t.revision++;
      } else if (q.action === 'accept') {
        t.status='active'; t.hostId=q.allocation.hostId; t.slot=q.allocation.slot;
        if (t.acceptedTurn === null) t.acceptedTurn=s.turn;
        t.lastPlace=f.m.at; t.lastTurn=s.turn; t.locationHeld=true; t.revision++;
        if (!s.player.travel) FB.travelAttachTemporaryCarrier(s,def.id,f.m.at);
      }
      return true;
    }
    function day(s,t) {
      if (['pending','active','suspended'].indexOf(t.status) < 0) return;
      if (t.actorId !== s.player.charId || s.player.dead || !free(s,s.chars[t.actorId])) { close(s,t,'interrupted','person'); return; }
      if (!t.roleId) return;
      if (s.turn >= t.endTurn) { close(s,t,'expired','term'); return; }
      var f=facts(s,t), at=carrier(s,def,t);
      if (t.locationHeld && !at || !f.r || f.r.status !== 'active' || !f.m || f.m.id !== t.migrationId) { close(s,t,'interrupted','carrier'); return; }
      if (t.locationHeld && at) {
        t.lastPlace=at; t.lastTurn=s.turn;
        if (s.player.travel && s.player.travel.participationId === def.id) FB.travelUpdateTemporaryCarrier(s,at);
      }
      if (!f.leader || f.leader.id !== t.leaderId || f.generation !== t.generation) {
        if (t.status !== 'suspended') { t.status='suspended'; t.revision++; } return;
      }
      if (s.player.travel && s.player.travel.participationId !== def.id || FB.atWarPersonally(s)) { close(s,t,'interrupted','commitment'); return; }
      if (t.status === 'pending' && f.leader.id !== s.player.charId) {
        var q=review(s,t,def.acceptance === 'closed' ? 'decline' : 'accept',f.leader.id);
        if (q && q.allowed) commit(s,t,q);
      }
    }
    var fields=['version','householdId','actorId','revision','status','roleId','leaderId','generation','migrationId','hostId','slot',
      'openedTurn','requestedTurn','acceptedTurn','endTurn','endedTurn','reason','lastPlace','lastTurn','locationHeld'];
    function validate(t,s) {
      function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+def.id})); }
      need(keys(t,fields) && Object.keys(t).length === fields.length && t.version === 1 && ref(t.householdId) && ref(t.actorId) &&
        t.householdId === t.actorId && whole(t.revision));
      need(['pending','active','suspended','left','expired','interrupted','declined'].indexOf(t.status) >= 0 && typeof t.locationHeld === 'boolean');
      need(whole(t.openedTurn) && whole(t.lastTurn) && t.lastTurn >= t.openedTurn);
      ['requestedTurn','acceptedTurn','endTurn','endedTurn'].forEach(function (k) { need(t[k] === null || whole(t[k]) && t[k] >= t.openedTurn); });
      need(t.roleId === null || !!role(def,t));
      need(t.leaderId === null || ref(t.leaderId)); need(t.migrationId === null || ref(t.migrationId));
      need(t.hostId === null || ref(t.hostId)); need(t.lastPlace === null || slug(t.lastPlace));
      need(t.generation === null || whole(t.generation) && t.generation >= 1);
      need(t.reason === null || ['leave','decline','person','term','carrier','commitment'].indexOf(t.reason) >= 0);
      var open=['pending','active','suspended'].indexOf(t.status) >= 0;
      need(open ? t.endedTurn === null && t.reason === null : t.endedTurn !== null && t.reason !== null);
      if (!open) need(t.status === 'left' ? t.reason === 'leave' : t.status === 'declined' ? t.reason === 'decline' :
        t.status === 'expired' ? t.reason === 'term' : ['person','carrier','commitment'].indexOf(t.reason) >= 0);
      if (t.roleId === null) need(t.requestedTurn === null && t.acceptedTurn === null && t.endTurn === null &&
        t.leaderId === null && t.generation === null && t.migrationId === null);
      else need(t.requestedTurn !== null && ref(t.leaderId) && t.generation >= 1 && ref(t.migrationId) &&
        t.endTurn > t.requestedTurn && t.endTurn <= t.requestedTurn + def.termDays);
      need(t.acceptedTurn === null || t.acceptedTurn >= t.openedTurn && t.acceptedTurn < t.endTurn);
      need(t.acceptedTurn !== null || !t.locationHeld && t.hostId === null && t.slot === null && t.lastPlace === null && t.lastTurn === t.openedTurn);
      if (t.status === 'active') need(t.acceptedTurn !== null && t.locationHeld);
      if (t.status === 'suspended' || t.status === 'declined' || t.status === 'expired') need(t.roleId !== null);
      if (!open) need((t.acceptedTurn === null || t.endedTurn >= t.acceptedTurn) &&
        (t.requestedTurn === null || t.endedTurn >= t.requestedTurn));
      var r=role(def,t);
      need(r && r.kind === 'combatant' && t.acceptedTurn !== null ? ref(t.hostId) && whole(t.slot) && t.slot >= 1 : t.hostId === null && t.slot === null);
      if (t.locationHeld) need(slug(t.lastPlace));
      if (s) {
        need((!open || !!s.chars[t.actorId]) && ref(t.householdId) && t.openedTurn <= s.turn && t.lastTurn <= s.turn);
        ['requestedTurn','acceptedTurn','endedTurn'].forEach(function (k) { need(t[k] === null || t[k] <= s.turn); });
        need(t.lastPlace === null || !!s.owner && Object.prototype.hasOwnProperty.call(s.owner,t.lastPlace));
        if (t.status === 'expired') need(t.endTurn !== null && t.endedTurn >= t.endTurn);
        if (t.roleId) {
          var f=facts(s,t);
          need((!open || !!s.chars[t.leaderId]) && !!f.r && t.migrationId === f.r.migrationId && t.generation <= f.generation);
          if (f.generation === t.generation && f.leader && open) need(t.leaderId === f.leader.id);
          if (t.hostId && f.m) need(t.hostId === f.m.hostId && t.slot <= 1000000);
        }
        var peers=rows(s).filter(function (v) { return v.t !== t; });
        if (t.locationHeld || open && t.roleId) need(!peers.some(function (v) {
          return v.t.actorId === t.actorId && (v.t.locationHeld || ['active','suspended','pending'].indexOf(v.t.status) >= 0 && v.t.roleId);
        }));
        var enrolled=peers.filter(function (v) { return realm(s,v.def) === realm(s,def) &&
          ['active','suspended','pending'].indexOf(v.t.status) >= 0 && v.t.roleId; });
        if (open && t.roleId) need(enrolled.length < def.capacity);
        if (t.hostId && open) need(!enrolled.some(function (v) { var other=role(v.def,v.t); return other &&
          other.memberId === r.memberId && v.t.hostId === t.hostId && v.t.slot === t.slot; }));
      }
    }
    var module={id:def.id,kind:'track',requires:def.requires,
      appliesToBookmark:function (bm) { return (bm.realms || []).some(function (d) { return d.id === def.host.realmId && !!d.mobile; }); },
      init:function (s) { return {version:1,householdId:FB.householdStories.householdId(s),actorId:s.player.charId,revision:0,status:'pending',
        roleId:null,leaderId:null,generation:null,migrationId:null,hostId:null,slot:null,openedTurn:s.turn,requestedTurn:null,
        acceptedTurn:null,endTurn:null,endedTurn:null,reason:null,lastPlace:null,lastTurn:s.turn,locationHeld:false}; },
      title:function () { return FB.T(def.title); }, intro:function () { return FB.T(def.intro); },
      status:function (s,t) { var labels={pending:FB.T('Awaiting consent'),active:FB.T('Admitted'),suspended:FB.T('Consent suspended'),
        left:FB.T('Participation ended'),expired:FB.T('Term expired'),interrupted:FB.T('Participation interrupted'),declined:FB.T('Admission declined')};
        return {phase:t.status,name:FB.T(def.title),lines:[
        FB.T('Participation: {status}.',{status:labels[t.status]}),
        FB.T('Only the protagonist travels. Household residence, vows, private property and paid service remain separate.'),
        t.locationHeld ? FB.T('Present location: {place}.',{place:(FB.world.byId[P.location(s)] || {}).name || t.lastPlace}) :
          FB.T('No personal carrier is attached.'),
        t.endTurn !== null ? FB.T('Admission ends in {days} days.',{days:Math.max(0,t.endTurn-s.turn)}) : FB.T('No terms have been requested.') ]}; },
      choices:function (s,t) {
        if (t.actorId !== s.player.charId) return [];
        var out=[];
        if (t.status === 'pending' && !t.roleId) out=def.roles.map(function (r) { return {id:r.id,label:r.kind === 'civilian' ? FB.T('Request civilian admission') : FB.T('Request combatant admission'),
          detail:FB.T('Ask the current host for unpaid individual participation. Admission requires a separate host decision and grants no troops, command, vow or family carriage.')}; });
        if (t.status === 'suspended') out.push({id:'confirm',label:FB.T('Request fresh commander consent'),detail:FB.T('Review the present commander without extending the original admission deadline.')});
        if (['pending','active','suspended'].indexOf(t.status) >= 0) out.push({id:'leave',label:FB.T('Leave or decline participation'),detail:FB.T('End these admission terms at the actual location. Other obligations remain in force. Returning home is a separate journey.')});
        else if (t.locationHeld) out.push({id:'return_home',label:FB.T('Review the return road'),detail:FB.T('Travel home alone from the last actual location, paying ordinary road costs. No household relocation occurs.')});
        return out;
      },
      quote:function (s,t,id) { return review(s,t,def.roles.some(function (r) { return r.id === id; }) ? 'request' : id,s.player.charId,
        def.roles.some(function (r) { return r.id === id; }) ? id : null); },
      apply:function (s,t,id,q) { return !!q && (id === q.action || q.action === 'request' && id === q.roleId) && commit(s,t,q); },
      blocker:function () { return FB.T('Admission requires the original free protagonist at a stationary camp, available capacity, a current consenting commander and no conflicting journey, command or private war. Combatants also need an existing compatible counted position.'); },
      review:function (s,t,id,q) { return [FB.T('Term: at most {days} days. Named-person capacity: {count}. No wages or equipment are supplied.',{days:def.termDays,count:def.capacity}),
        q.road ? FB.T('Private road cost: {money:cost}. Travel time: {days} days.',{cost:q.road.cost,days:q.road.days}) : FB.T('This decision costs no money and adds no demographic people.')]; },
      day:day,season:day,year:day,validate:validate};
    module.participationReview=review; module.participationCommit=commit;
    return module;
  }
  FB.stories.registerType(TYPE,factory,'js/story_expedition_participation.js',check);
})();
