/* Bounded physical capacity and conserved claims. No opening stock is inferred. */
(function () {
  'use strict';
  var R = FB.siteResources = {}, Q = FB.political;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function object(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return object(v) && Object.keys(v).every(function (k) { return list.indexOf(k) >= 0; }); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function integer(v,min,max) { return Number.isSafeInteger(v) && v >= min && v <= max; }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function same(a,b) { return !!a && !!b && a.kind === b.kind && a.id === b.id; }
  function actorRef(v) { return keys(v,['kind','id']) && ['realm','character'].indexOf(v.kind) >= 0 && typeof v.id === 'string' && !!v.id; }
  function live(s,c) { return !!c && !c.dead && !c.unfree && !c.prisonerOf && !c.captive && !c.imprisoned && !c.exiled &&
    FB.ageOf(c,s.date.year) >= 16 && !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)) &&
    !(c.id === s.player.charId && s.player.flags && s.player.flags.in_prison); }
  function identity(s,actor) {
    var a = actorRef(actor) && Q.actor(s,actor), c = a && s.chars[a.characterId];
    return a && live(s,c) ? {characterId:c.id,generation:actor.kind === 'realm' ? a.rulerGeneration : null} : null;
  }
  R.profileFaults = function (profiles) {
    var errors = [];
    if (!object(profiles) || Object.keys(profiles).length > 256) return ['siteResourceProfiles must be a table of at most 256 profiles.'];
    Object.keys(profiles).forEach(function (key) {
      var p = profiles[key], water = p && p.unit === 'water';
      if (!id(key) || !keys(p,['name','desc','kind','unit','capacity','periodDays']) ||
          typeof p.name !== 'string' || !p.name.trim() || p.name.length > 120 ||
          p.desc !== undefined && (typeof p.desc !== 'string' || p.desc.length > 1000) ||
          ['flow','storage','access'].indexOf(p.kind) < 0 ||
          ['water','grazing','launching'].indexOf(p.unit) < 0 ||
          !integer(p.capacity,1,1000000) || (p.kind === 'access') === water ||
          (p.kind === 'storage' ? p.periodDays !== undefined : !integer(p.periodDays,1,360)))
        errors.push('siteResourceProfiles.' + key + ': invalid typed capacity, unit or period.');
    });
    return errors;
  };
  /* The world owner supplies its detached, normalized physical presentations. */
  R.compilePrepared = function (bm) {
    var profiles = FBDATA.siteResourceProfiles || {}, errors = R.profileFaults(profiles);
    var out = {sources:[],errors:errors}, rows = bm && bm.siteResourceAssignments;
    if (rows === undefined) return out;
    function fault(detail) { errors.push('siteResourceAssignments: ' + detail); }
    if (!Array.isArray(rows) || rows.length > 256) { fault('requires at most 256 source records.'); return out; }
    var provinces = Object.create(null), sites = Object.create(null), realms = Object.create(null);
    var physical = Object.create(null), byId = Object.create(null);
    var geo = FB.geography(FB.bookmarkGeography(bm)), siteTable = geo && geo.sites || FBDATA.settlementSites || {};
    (bm.provinces || []).forEach(function (p) {
      provinces[p.id] = p;
      (p.settlements || []).forEach(function (entry) { if (entry.site) sites[entry.site] = (sites[entry.site] || 0) + 1; });
    });
    (bm.realms || []).forEach(function (r) { realms[r.id] = r; });
    rows.forEach(function (a) {
      if (!keys(a,['id','profileId','countyId','siteId','suitability','rights','connectedSourceId']) ||
          !id(a.id) || !id(a.profileId) || !id(a.countyId) || !id(a.siteId) || own(byId,a.id)) {
        fault('invalid or duplicate source identity.'); return;
      }
      byId[a.id] = a;
      var p = own(profiles,a.profileId) && profiles[a.profileId], pr = provinces[a.countyId];
      var slot = pr && (pr.settlements || []).findIndex(function (e) { return e.site === a.siteId; });
      var site = own(siteTable,a.siteId) && siteTable[a.siteId], flags = a.suitability;
      if (!p || !pr || pr.wasteland || slot < 0 || !site || sites[a.siteId] !== 1) {
        fault(a.id + ': requires a unique physical site in its inhabited county.'); return;
      }
      var alias = JSON.stringify([site.x,site.y,p.unit]);
      if (own(physical,alias)) fault(a.id + ': duplicate physical capacity or conflicting rights.');
      physical[alias] = true;
      if (!keys(flags,['source','catchment','gradient','groundwater','launching','grazing']) ||
          Object.keys(flags).some(function (key) { return typeof flags[key] !== 'boolean'; }) ||
          p.kind === 'flow' && !flags.source || p.kind === 'storage' && flags.source ||
          p.unit === 'launching' && !flags.launching || p.unit === 'grazing' && !flags.grazing ||
          p.unit === 'water' && (flags.launching || flags.grazing) ||
          p.kind === 'access' && (flags.source || flags.catchment || flags.gradient || flags.groundwater) ||
          flags.groundwater && (p.kind !== 'flow' || p.unit !== 'water' || !flags.source) ||
          p.unit === 'launching' && flags.grazing || p.unit === 'grazing' && flags.launching)
        fault(a.id + ': unsupported or missing physical suitability.');
      var rights = a.rights;
      if (!keys(rights,['kind','institutionId','officeId']) ||
          (rights.kind === 'holder' ? Object.keys(rights).length !== 1 :
            rights.kind !== 'permission' || !own(realms,rights.institutionId) || !own(FBDATA.authorityOffices,rights.officeId) ||
            !(FBDATA.authorityOffices[rights.officeId].scopes || []).some(function (scope) { return scope === 'county' || scope === 'realm'; }) ||
            !(FBDATA.authorityOffices[rights.officeId].powers || []).some(function (power) { return power === 'revenue' || power === 'consent' || power === 'peace'; })))
        fault(a.id + ': requires holder rights or one declared existing civil office permission.');
      if (a.connectedSourceId !== undefined && (p.kind !== 'storage' || !id(a.connectedSourceId)))
        fault(a.id + ': only storage may name a connected source.');
      out.sources.push(Object.assign({},copy(a),{profile:copy(p),slot:slot}));
    });
    var marks = Object.create(null);
    function visit(key) {
      if (marks[key] === 1) { fault(key + ': connected source cycle.'); return; }
      if (marks[key] === 2) return;
      marks[key] = 1;
      var a = byId[key], from = a && a.connectedSourceId;
      if (from) {
        var src = byId[from], p = a && profiles[a.profileId], sp = src && profiles[src.profileId];
        if (!src || !p || !sp || p.unit !== sp.unit) fault(key + ': connected source must exist with the same unit.');
        else visit(from);
      }
      marks[key] = 2;
    }
    Object.keys(byId).forEach(visit);
    if (errors.length) out.sources = [];
    return out;
  };
  R.compile = function (bm) { return FB.compileSiteResources(bm); };
  var cached = null;
  function plan(s) {
    var bm = FB.campaignBookmark(s), raw = bm && FBDATA.bookmarks[bm.id], revision = bm && bm.revision, signature = FB.mods.sig();
    if (!cached || cached.raw !== raw || cached.revision !== revision || cached.signature !== signature) {
      cached = {raw:raw,revision:revision,signature:signature,value:R.compile(bm)};
    }
    return cached.value;
  }
  function definitionStamp(p) {
    var sources = p.sources.map(function (a) {
      var value = copy(a); delete value.slot; delete value.profile.name; delete value.profile.desc; return value;
    }).sort(function (a,b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    return FB.mods.fingerprint(sources);
  }
  function period(s,p) { return p.kind === 'storage' ? null : Math.floor(s.turn / p.periodDays); }
  function root(s) { return s.siteResources; }
  function project(s,a) {
    var r = root(s), row = r && r.sources[a.id], current = period(s,a.profile);
    if (row && row.period === current) return copy(row);
    return {profileId:a.profileId,period:current,stock:0,consumed:0,reservations:[]};
  }
  function reserved(row) { return row.reservations.reduce(function (n,c) { return n + c.amount; },0); }
  function available(a,row) { return (a.profile.kind === 'storage' ? row.stock : a.profile.capacity - row.consumed) - reserved(row); }
  function authority(s,a,actor) {
    var who = identity(s,actor), holder = FB.settlementHolder(s,a.countyId,a.slot);
    var evidence = {holder:holder,identity:who,allowed:false,appointments:[]};
    if (!who || !holder || FB.recruitmentCountyBlocked(s,holder.kind === 'realm' ? holder.id : s.holder[a.countyId],a.countyId)) return evidence;
    if (same(holder,actor)) evidence.allowed = true;
    else if (a.rights.kind === 'holder') {
      /* Use the ordinary property authority, including its institutional boundary. */
      var q = FB.settlementConstructionAuthority(s,a.countyId,a.slot,actor);
      evidence.allowed = !!q.direct;
    }
    if (a.rights.kind === 'permission') {
      evidence.allowed = false;
      var rid = FB.startRealmId(s,a.rights.institutionId);
      if (holder.kind !== 'realm' || holder.id !== rid) return evidence;
      evidence.appointments = Q.offices(s,actor).filter(function (o) {
        return o.ref.source === 'authority.appointments' && o.ref.officeId === a.rights.officeId &&
          o.terms.institutionId === rid && o.status === 'active' &&
          o.terms.appointerGeneration === FB.realmRulerGeneration(s,rid) &&
          (o.scope.kind === 'county' && o.scope.id === a.countyId || o.scope.kind === 'realm' && o.scope.id === rid);
      });
      evidence.allowed = evidence.appointments.length > 0;
    }
    return evidence;
  }
  R.snapshot = function (s,countyId,siteId,actor) {
    var p = plan(s);
    if (p.errors.length) return [];
    return p.sources.filter(function (a) { return (!countyId || a.countyId === countyId) && (!siteId || a.siteId === siteId); }).map(function (a) {
      var row = project(s,a), auth = actor && authority(s,a,actor);
      return {id:a.id,profileId:a.profileId,countyId:a.countyId,siteId:a.siteId,kind:a.profile.kind,unit:a.profile.unit,
        capacity:a.profile.capacity,period:row.period,periodDays:a.profile.periodDays || null,suitability:copy(a.suitability),
        stock:row.stock,consumed:row.consumed,reserved:reserved(row),available:available(a,row),
        reservations:copy(row.reservations),connectedSourceId:a.connectedSourceId || null,allowed:!!auth && auth.allowed};
    });
  };
  /* Revisions cover all sources so a transfer and both of its accounts commit once. */
  R.quote = function (s,request) {
    var q = {allowed:false,reason:'request',request:object(request) ? copy(request) : null,signature:null};
    if (!keys(request,['operation','sourceId','actor','amount','reservationId','destinationId']) ||
        !actorRef(request.actor) || !id(request.sourceId) ||
        ['reserve','release','consume','transfer'].indexOf(request.operation) < 0) return q;
    var p = plan(s), a = p.sources.find(function (x) { return x.id === request.sourceId; });
    if (p.errors.length || !a) { q.reason = 'source'; return q; }
    R.validate(s);
    var row = project(s,a), auth = authority(s,a,request.actor), who = identity(s,request.actor);
    var claim = row.reservations.find(function (c) { return c.id === request.reservationId; });
    var to = request.operation === 'transfer' && p.sources.find(function (x) { return x.id === request.destinationId; });
    var target = to && project(s,to), targetAuth = to && authority(s,to,request.actor);
    q.reason = 'authority';
    if (!who) return q;
    if (request.operation === 'reserve') {
      if (request.reservationId !== undefined || request.destinationId !== undefined || !integer(request.amount,1,1000000)) { q.reason = 'amount'; return q; }
      q.allowed = auth.allowed && request.amount <= available(a,row) && row.reservations.length < 64;
      q.reason = auth.allowed ? 'capacity' : 'authority';
    } else {
      if (request.amount !== undefined || !integer(request.reservationId,1,Number.MAX_SAFE_INTEGER) ||
          request.operation !== 'transfer' && request.destinationId !== undefined || !claim) { q.reason = 'reservation'; return q; }
      var original = same(claim.actor,request.actor) && claim.characterId === who.characterId && claim.generation === who.generation;
      q.allowed = request.operation === 'release' ? auth.allowed || original : auth.allowed && original;
      if (request.operation === 'transfer') {
        q.allowed = q.allowed && !!to && to.connectedSourceId === a.id && to.profile.kind === 'storage' &&
          to.profile.unit === a.profile.unit && targetAuth.allowed && target.stock + claim.amount <= to.profile.capacity;
        q.reason = 'destination';
      }
    }
    if (root(s) && (root(s).revision >= Number.MAX_SAFE_INTEGER || root(s).nextId >= Number.MAX_SAFE_INTEGER)) q.allowed = false;
    q.reason = q.allowed ? null : q.reason;
    q.signature = JSON.stringify([s.turn,p.sources,root(s) || null,request,auth,targetAuth || null]);
    return q;
  };
  R.commit = function (s,review) {
    if (!review || !review.allowed) return false;
    var q = R.quote(s,review.request);
    if (!q.allowed || q.signature !== review.signature) return false;
    var p = plan(s), request = q.request, a = p.sources.find(function (x) { return x.id === request.sourceId; });
    var next = root(s) ? copy(root(s)) : {version:1,definition:definitionStamp(p),revision:0,nextId:1,sources:{}};
    var row = project(s,a), result = true;
    if (request.operation === 'reserve') {
      var who = identity(s,request.actor);
      result = next.nextId++;
      row.reservations.push({id:result,actor:copy(request.actor),characterId:who.characterId,generation:who.generation,amount:request.amount});
    } else {
      var at = row.reservations.findIndex(function (c) { return c.id === request.reservationId; });
      var claim = row.reservations.splice(at,1)[0];
      if (request.operation !== 'release') {
        if (a.profile.kind === 'storage') row.stock -= claim.amount;
        else row.consumed += claim.amount;
        if (request.operation === 'transfer') {
          var to = p.sources.find(function (x) { return x.id === request.destinationId; });
          var target = project(s,to); target.stock += claim.amount; next.sources[to.id] = target;
        }
      }
    }
    next.sources[a.id] = row; next.revision++;
    s.siteResources = next;
    return result;
  };
  R.validate = function (s) {
    var r = root(s);
    if (r === undefined) return true;
    function invalid(path) { throw new Error(FB.T('Invalid site resource record at {path}.',{path:path})); }
    var p = plan(s);
    if (p.errors.length || !keys(r,['version','definition','revision','nextId','sources']) || r.version !== 1 ||
        r.definition !== definitionStamp(p) || !integer(r.revision,1,Number.MAX_SAFE_INTEGER) ||
        !integer(r.nextId,1,Number.MAX_SAFE_INTEGER) || r.revision < r.nextId - 1 ||
        !object(r.sources) || !Object.keys(r.sources).length || Object.keys(r.sources).length > 256)
      invalid('state.siteResources');
    var seen = Object.create(null);
    Object.keys(r.sources).forEach(function (key) {
      var a = p.sources.find(function (x) { return x.id === key; }), row = r.sources[key], path = 'state.siteResources.sources.' + key;
      if (!a || !keys(row,['profileId','period','stock','consumed','reservations']) || row.profileId !== a.profileId ||
          (a.profile.kind === 'storage' ? row.period !== null : !integer(row.period,0,period(s,a.profile))) ||
          !integer(row.stock,0,a.profile.kind === 'storage' ? a.profile.capacity : 0) ||
          row.stock > 0 && !a.connectedSourceId ||
          !integer(row.consumed,0,a.profile.kind === 'storage' ? 0 : a.profile.capacity) ||
          !Array.isArray(row.reservations) || row.reservations.length > 64) invalid(path);
      row.reservations.forEach(function (c) {
        if (!keys(c,['id','actor','characterId','generation','amount']) || !integer(c.id,1,r.nextId - 1) || own(seen,c.id) ||
            !actorRef(c.actor) || typeof c.characterId !== 'string' || !own(s.chars,c.characterId) ||
            (c.actor.kind === 'character' ? c.actor.id !== c.characterId || c.generation !== null :
              !own(s.realms,c.actor.id) && c.actor.id !== 'player' || !integer(c.generation,0,FB.realmRulerGeneration(s,c.actor.id))) ||
            !integer(c.amount,1,a.profile.capacity)) invalid(path);
        seen[c.id] = true;
      });
      if (available(a,row) < 0) invalid(path);
    });
    return true;
  };
  R.reason = function (q) {
    if (q.allowed) return FB.T('No payment. This changes only the reviewed resource allocation.');
    if (q.reason === 'amount') return FB.T('Enter a whole amount from 1 to the available capacity.');
    if (q.reason === 'capacity') return FB.T('Not enough unreserved capacity or stored water.');
    if (q.reason === 'reservation') return FB.T('This reservation is no longer available.');
    if (q.reason === 'destination') return FB.T('The connected store needs room and current permission at both sites.');
    return FB.T('This allocation requires a living lawful holder or the exact current permitted office.');
  };
})();
