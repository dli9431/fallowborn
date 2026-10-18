/* Public decisions resolve presence and an existing exact civil delegation.
   Funding conserves explicitly selected accounts, never an inferred purse. */
(function () {
  'use strict';
  var H = FB.homeAuthority = {}, G = FB.governments, Q = FB.political, M = FB.mobile;
  var operations = ['levy','appointment','grant','war','spend'];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function keys(v,list) { return !!v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).every(function (k) { return list.indexOf(k) >= 0; }); }
  function live(s,c) { return !!c && !c.dead && !c.unfree && FB.ageOf(c,s.date.year) >= 16 &&
    !c.prisonerOf && !c.captive && !c.imprisoned && !c.exiled &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)) &&
    !(c.id === s.player.charId && s.player.flags && s.player.flags.in_prison); }
  function ruler(s,rid) { return rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid); }
  H.policy = function (s,rid) {
    var form = G.forRealm(s,rid), def = form && FBDATA.governmentForms[form.id];
    return def && def.homeAuthority || null;
  };
  H.policyValid = function (p) {
    return keys(p,['schema','presence','delegation']) && p.schema === 1 &&
      ['capital','territory'].indexOf(p.presence) >= 0 && typeof p.delegation === 'boolean';
  };
  H.powersValid = function (d) {
    return d.homePowers === undefined || Array.isArray(d.homePowers) && d.homePowers.length > 0 &&
      d.homePowers.length <= operations.length && Array.isArray(d.scopes) &&
      d.scopes.some(function (kind) { return kind === 'realm' || kind === 'county'; }) &&
      d.homePowers.every(function (op,i) { return operations.indexOf(op) >= 0 && d.homePowers.indexOf(op) === i; });
  };
  /* Do not call travelEnsure or fall back from an unknown location to home.
     A mobile principal's actual carrier precedes their permanent residence. */
  H.location = function (s,c) {
    if (!live(s,c)) return null;
    if (c.id === s.player.charId && s.player.travel) {
      var t = s.player.travel;
      if (t.phase !== 'arrived' || t.legDaysLeft > 0) return null;
      return t.participationId && FB.expeditionParticipants ? FB.expeditionParticipants.location(s) : t.currentId;
    }
    var found = null, carried = false;
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var row = M.row(s,rid);
      if (!row || row.status !== 'active' || !row.members.some(function (m) { return m.principal.id === c.id; })) return;
      var migration = M.migration(s,rid), host = M.host(s,rid);
      var at = migration && !(host && host.mobileCourt && (host.moveLeft > 0 || (host.path || []).length)) ? migration.at : null;
      if (row.leaderId === c.id && host && !host.mobileCourt && host.men > 0 &&
          (host.at !== at || host.moveLeft > 0)) at = null;
      if (row.columns) row.columns.entries.forEach(function (column) {
        if (column.commanderId !== c.id || column.status !== 'active') return;
        var army = (s.armies || []).filter(function (a) { return a.id === column.hostId; })[0];
        if (army && (army.at !== at || army.moveLeft > 0)) at = null;
      });
      if (carried && found !== at) found = null;
      else if (!carried) found = at;
      carried = true;
    });
    if (carried) return found;
    if (c.id === s.player.charId) return s.player.provinceId;
    if (c.homeProvinceId && !(FB.world && FB.world.byId[c.homeProvinceId])) return null;
    /* The owning residence lookup has a protagonist-home fallback. An unknown
       foreign person is not proof of presence at that fallback. */
    var seated = Object.keys(s.realms || {}).some(function (rid) { var r = ruler(s,rid); return r && r.id === c.id; });
    if (!seated && !c.homeProvinceId && !c.royalLine && !Object.keys(s.provChars || {}).some(function (pid) {
      return s.provChars[pid].indexOf(c.id) >= 0;
    })) return null;
    return FB.characterResidence(s,c);
  };
  H.quote = function (s,rid,operation,request) {
    request = request || {};
    var p = H.policy(s,rid), r = s.realms && s.realms[rid], incumbent = r && r.alive && ruler(s,rid);
    var q = {allowed:false,reason:'home_authority',realmId:rid,operation:operation,
      characterId:null,appointmentId:null,signature:null};
    if (!keys(request,['characterId','appointmentId','provinceId']) || operations.indexOf(operation) < 0) return q;
    if (['characterId','appointmentId','provinceId'].some(function (key) {
      return own(request,key) && (typeof request[key] !== 'string' || !request[key] || request[key].length > 200);
    })) return q;
    if (!p) { q.allowed = true; q.reason = null; return q; }
    if (!r || !r.alive || !H.policyValid(p)) return q;
    var territory = FB.realmTerritory(s,rid).slice().sort(), generation = FB.realmRulerGeneration(s,rid);
    var target = request.provinceId || null;
    function local(c) {
      var at = H.location(s,c);
      return !!at && (p.presence === 'capital' ? at === r.capital : territory.indexOf(at) >= 0);
    }
    var evidence = [], appointments = s.authority && s.authority.appointments || [];
    if (!request.appointmentId && incumbent && (!request.characterId || request.characterId === incumbent.id) && local(incumbent)) {
      q.characterId = incumbent.id;
    } else if (p.delegation && incumbent && !incumbent.dead) {
      appointments.slice().sort(function (a,b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }).some(function (a) {
        if (a.institutionId !== rid || a.holder.kind !== 'character' ||
            request.appointmentId && request.appointmentId !== a.id || request.characterId && request.characterId !== a.holder.id) return false;
        var d = FBDATA.authorityOffices[a.officeId], c = s.chars[a.holder.id];
        var at = H.location(s,c), scope = a.scope;
        var effective = Q.offices(s,a.holder).some(function (o) { return o.ref.appointmentId === a.id && o.status === 'active'; });
        evidence.push([a,d && d.homePowers,at,effective]);
        if (!d || !H.powersValid(d) || !d.homePowers || d.homePowers.indexOf(operation) < 0 || !effective ||
            !local(c) || a.appointerGeneration !== generation ||
            scope.kind !== 'realm' && scope.kind !== 'county' ||
            scope.kind === 'realm' && scope.id !== rid ||
            scope.kind === 'county' && (!target || target !== scope.id || at !== scope.id)) return false;
        q.characterId = c.id; q.appointmentId = a.id; return true;
      });
    }
    q.allowed = !!q.characterId; q.reason = q.allowed ? null : 'home_authority';
    q.signature = JSON.stringify([s.turn,p,generation,r.capital,territory,target,
      incumbent && [incumbent.id,live(s,incumbent),H.location(s,incumbent)],
      q.characterId,request,evidence]);
    return q;
  };
  H.reason = function () { return FB.T('This public decision needs the incumbent locally or a current civil deputy with this exact power and scope.'); };
  H.committedGrant = function (s,rid,context) {
    var ref = context && context.commitment;
    if (!keys(ref,['contractId','awardIndex']) || typeof ref.contractId !== 'string' ||
        !Number.isSafeInteger(ref.awardIndex) || ref.awardIndex < 0) return null;
    var c = Q.contract(s,ref.contractId), award = c && c.settlementAwards && c.settlementAwards[ref.awardIndex];
    return c && c.effective && c.patronRealmId === rid && award && !award.fulfilled &&
      award.provinceId === context.provinceId && award.settlement === context.settlement &&
      award.recipientId === context.recipientId ? c : null;
  };

  /* Government consent is the common player/AI boundary for new levies,
     declarations and land grants. Existing commitments do not pass here. */
  var call = G.call;
  G.call = function (s,rid,slot,method,context,resolved) {
    var op = slot === 'consent' && method === 'decision' && context && context.operation;
    if ((op === 'levy' || op === 'war' || op === 'grant') && H.policy(s,rid) &&
        !(op === 'grant' && H.committedGrant(s,rid,context.scope))) {
      var at = context.scope && context.scope.provinceId;
      var q = H.quote(s,rid,op,at ? {provinceId:at} : {});
      if (!q.allowed) return {allowed:false,reason:'home_authority',required:[],approvals:{},homeDecision:q};
    }
    return call(s,rid,slot,method,context,resolved);
  };
  var appoint = FB.authorityAppoint;
  FB.authorityAppoint = function (s,t) {
    if (t && !H.quote(s,t.institutionId,'appointment',t.scope && t.scope.kind === 'county' ? {provinceId:t.scope.id} : {}).allowed) return null;
    return appoint(s,t);
  };
  ['officeAppointmentQuote','publicAppointmentQuote'].forEach(function (name) {
    var original = FB[name];
    FB[name] = function (s,actor,t) {
      var q = original(s,actor,t), rid = t && t.institutionId;
      if (rid && H.policy(s,rid)) {
        q.homeDecision = H.quote(s,rid,'appointment',t.scope && t.scope.kind === 'county' ? {provinceId:t.scope.id} : {});
        if (!q.homeDecision.allowed) { q.allowed = false; q.reason = H.reason(); }
      }
      return q;
    };
  });
  var spending = FB.treasurySpendOptional;
  FB.treasurySpendOptional = function (s,rid,amount,reserve) {
    return H.quote(s,rid,'spend').allowed && spending(s,rid,amount,reserve);
  };
  var distribution = FB.publicDistributionQuote;
  FB.publicDistributionQuote = function (s,rid,fiscal) {
    var q = distribution(s,rid,fiscal);
    if (H.policy(s,rid)) {
      q.homeDecision = H.quote(s,rid,'spend');
      if (!q.homeDecision.allowed) { q.eligible = false; q.ready = false; }
    }
    return q;
  };
  var register = FB.registerOrdinaryWar;
  FB.registerOrdinaryWar = function (s,rid,w) {
    var declaring = rid === 'player' && w && w.defending ? w.enemy : rid;
    var existing = w && s.wars && (w.id && s.wars[w.id] === w || FB.ordinaryWarBetween(s,rid,w.enemy));
    if (w && !existing && !H.quote(s,declaring,'war').allowed) return null;
    return register(s,rid,w);
  };
  ['grantCounty','grantDuchy','grantCountiesToVassal'].forEach(function (name) {
    var original = FB[name];
    FB[name] = function (s) { return H.quote(s,'player','grant').allowed && original.apply(FB,arguments); };
  });
  var build = FB.canBuildAt, aiBuild = FB.aiCanBuildAt;
  FB.canBuildAt = function (s,pid,slot) {
    var holder = H.policy(s,'player') && FB.settlementHolder(s,pid,slot);
    return (!holder || holder.kind !== 'realm' || holder.id !== 'player' ||
      H.quote(s,'player','spend',{provinceId:pid}).allowed) && build.apply(FB,arguments);
  };
  FB.aiCanBuildAt = function (s,rid,pid) { return H.quote(s,rid,'spend',{provinceId:pid}).allowed && aiBuild.apply(FB,arguments); };

  H.fundingPolicyValid = function (p) {
    return keys(p,['schema','publicGrants','privateContributions','maximum']) && p.schema === 1 &&
      typeof p.publicGrants === 'boolean' && typeof p.privateContributions === 'boolean' &&
      (p.publicGrants || p.privateContributions) && Number.isFinite(p.maximum) && p.maximum > 0 && p.maximum <= 1000000;
  };
  H.fundingPolicy = function (s,rid) {
    var d = (FB.campaignBookmark(s).realms || []).filter(function (d) { return d.id === rid; })[0];
    return d && d.mobile && d.mobile.funding || null;
  };
  H.fundingQuote = function (s,input) {
    var q = {allowed:false,reason:'funding',input:copy(input || null),amount:0,cost:0,payer:null,recipientRealmId:null,
      terms:{},homeDecision:null,signature:null};
    if (!keys(input,['source','recipientRealmId','amount','characterId','appointmentId','provinceId']) ||
        !Number.isFinite(input.amount) || input.amount <= 0 || !keys(input.source,['kind','realmId','characterId'])) return q;
    var rid = input.recipientRealmId, p = H.fundingPolicy(s,rid), source = input.source, c = s.chars[input.characterId];
    var target = FB.treasuryPublicAccountSnapshot(s,rid), row = M.row(s,rid);
    var preparation=FB.expeditionPreparation && FB.expeditionPreparation.fundingSnapshot(s,rid);
    if (!p || !H.fundingPolicyValid(p) || input.amount > p.maximum || !target || (!preparation && (!row || !row.command || !M.commandValid(s,rid))) || !live(s,c)) return q;
    var from;
    if (source.kind === 'public' && keys(source,['kind','realmId']) && p.publicGrants && source.realmId !== rid) {
      from = FB.treasuryPublicAccountSnapshot(s,source.realmId);
      var request = {characterId:c.id};
      if (input.appointmentId !== undefined) request.appointmentId = input.appointmentId;
      if (input.provinceId !== undefined) request.provinceId = input.provinceId;
      q.homeDecision = H.quote(s,source.realmId,'grant',request);
      /* A legacy form still needs its actual living ruler's consent. */
      var incumbent = ruler(s,source.realmId);
      if (!H.policy(s,source.realmId) && (!incumbent || incumbent.id !== c.id)) return q;
      if (!q.homeDecision.allowed) return q;
      q.payer = 'public';
    } else if (source.kind === 'private' && keys(source,['kind','characterId']) && p.privateContributions &&
        source.characterId === s.player.charId && c.id === source.characterId &&
        input.appointmentId === undefined && input.provinceId === undefined) {
      from = {characterId:c.id,gold:s.player.gold,available:Math.max(0,s.player.gold)};
      q.payer = 'private';
    } else return q;
    if (!from || from.available < input.amount || target.gold + input.amount > Number.MAX_SAFE_INTEGER) return q;
    var revision = s.treasuryAccounting && s.treasuryAccounting.fundingRevision;
    if (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 0 || revision === Number.MAX_SAFE_INTEGER)) return q;
    q.amount = input.amount; q.cost = input.amount; q.recipientRealmId = rid;
    q.terms = {fundingKind:q.payer,payerRealmId:source.realmId || null,recipientRealmId:rid,amount:input.amount};
    q.signature = JSON.stringify([s.turn,revision || 0,p,source,from,target,c.id,live(s,c),q.homeDecision,M.commandSnapshot(s,rid),preparation || null]);
    q.allowed = true; q.reason = null; return q;
  };
  H.fund = function (s,reviewed) {
    if (!reviewed) return false;
    var fresh = H.fundingQuote(s,reviewed.input);
    if (!fresh.allowed || JSON.stringify(fresh) !== JSON.stringify(reviewed) ||
        !FB.treasuryFundingTransfer(s,fresh.input.source,fresh.recipientRealmId,fresh.amount)) return false;
    s.treasuryAccounting.fundingRevision = (s.treasuryAccounting.fundingRevision || 0) + 1;
    return true;
  };
})();
