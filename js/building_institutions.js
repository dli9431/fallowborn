/* Institutional construction composes existing property, offices and payer accounts. */
window.FB = window.FB || {};
(function () {
  'use strict';
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function own(v, k) { return Object.prototype.hasOwnProperty.call(v || {}, k); }
  function keys(v, fields) { return plain(v) && Object.keys(v).length === fields.length && fields.every(function (k) { return own(v, k); }); }
  function ident(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,95}$/.test(v) && ['constructor','prototype','__proto__'].indexOf(v) < 0; }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function actor(s, a) {
    if (a === undefined || a === 'player') return { kind:'character', id:s.player.charId };
    if (typeof a === 'string') return { kind:'realm', id:a };
    return a;
  }
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(function (k) { return own(b, k) && same(a[k], b[k]); });
  }
  function profiles(c) { return c.buildingInstitutionProfiles || {}; }
  function free(s, c) {
    return !!c && !c.dead && !c.captive && !c.unfree && !c.prisonerOf && !c.imprisoned && !c.exiled &&
      !(c.id === s.player.charId && s.player.flags.in_prison) &&
      !(FB.justiceCustodyOf && FB.justiceCustodyOf(s, c.id)) && !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, c.id)) &&
      !(s.justice && s.justice.exiles && s.justice.exiles[c.id] && s.justice.exiles[c.id].endTurn > s.turn);
  }
  FB.buildingInstitutionCatalogFaults = function (c) {
    var out = [], table = profiles(c);
    if (!plain(table) || Object.keys(table).length > 128) return ['buildingInstitutionProfiles must be a bounded object.'];
    Object.keys(table).forEach(function (id) {
      var d = table[id];
      if (!ident(id) || !keys(d, ['kinds','property','permission','incumbent','exclusiveRoles']) ||
          !Array.isArray(d.kinds) || !d.kinds.length || d.kinds.length > 10 || d.kinds.some(function (k, i) {
            return ['senate','council','see','patriarchate','congregation','school','temple','monastery','ritual_community'].indexOf(k) < 0 || d.kinds.indexOf(k) !== i;
          }) || ['seat','abbey'].indexOf(d.property) < 0 || ['holder','property_patron'].indexOf(d.permission) < 0 ||
          (d.permission === 'property_patron') !== (d.property === 'abbey') || ['required','none'].indexOf(d.incumbent) < 0 ||
          !Array.isArray(d.exclusiveRoles) || !d.exclusiveRoles.length || d.exclusiveRoles.length > 16 || d.exclusiveRoles.some(function (r, i) {
            return !own(FB.BUILDING_ROLES, r) || r === 'fortification' || d.exclusiveRoles.indexOf(r) !== i;
          })) out.push('buildingInstitutionProfiles.' + id + ': invalid binding policy.');
    });
    Object.keys(c.buildings || {}).forEach(function (id) {
      var d = c.buildings[id];
      if (d && d.institutionProfile !== undefined && (!ident(d.institutionProfile) || !own(table, d.institutionProfile) || d.fort ||
          !table[d.institutionProfile] || !Array.isArray(table[d.institutionProfile].exclusiveRoles) ||
          table[d.institutionProfile].exclusiveRoles.indexOf(d.role) < 0)) out.push('Building ' + id + ': invalid institutionProfile.');
    });
    return out;
  };
  FB.buildingInstitutionDefinitionFaults = function (bm, c) {
    var rows = bm.buildingInstitutionAssignments, out = [];
    if (rows === undefined) return out;
    if (!Array.isArray(rows) || rows.length > 256) return ['buildingInstitutionAssignments must be a list of at most 256 bindings.'];
    var geo = (c.geographies || {})[FB.bookmarkGeography(bm)], sites = geo && geo.sites || c.settlementSites || {};
    var layoutId = bm.settlementLayout !== undefined ? bm.settlementLayout : own(c.settlementLayouts, bm.id) ? bm.id : geo && geo.defaultLayout;
    var layout = (c.settlementLayouts || {})[layoutId] || {}, used = {};
    rows.forEach(function (r) {
      var p = r && profiles(c)[r.profileId], d = r && (bm.localInstitutions || c.localInstitutions || {})[r.institutionId];
      var pr = d && (bm.provinces || []).filter(function (v) { return v.id === d.provinceId && !v.wasteland; })[0];
      var slots = pr && (pr.settlements || layout[pr.id]) || [];
      var physical = d && sites[d.site];
      var key = r && d ? r.profileId + ':' + d.site : '';
      if (!keys(r, ['profileId','institutionId']) || !ident(r.profileId) || !ident(r.institutionId) || !p || !d || !pr ||
          !Array.isArray(p.kinds) || p.kinds.indexOf(d.kind) < 0 || !d.site || !physical ||
          !slots.some(function (v) { return v && v.site === d.site; }) ||
          p.property === 'abbey' && !d.abbeyId || p.incumbent === 'required' && !d.officeId || used[key])
        out.push('buildingInstitutionAssignments: invalid, missing, foreign or ambiguous foundation.');
      used[key] = true;
    });
    return out;
  };
  function record(s, pid, idx, id) {
    return (s.buildings && s.buildings[pid] || []).filter(function (r) { return r && r.s === idx && r.id === id; })[0] || null;
  }
  function current(s, pid, idx, id, a, definition) {
    var def = definition || FBDATA.buildings[id], profileId = def && def.institutionProfile;
    if (!profileId) return { allowed:true, reason:'', binding:null };
    var p = profiles(FBDATA)[profileId], bm = FB.campaignBookmark(s), defs = FB.localInstitutionDefinitions(s);
    var physical = FB.world.sitesByProv && FB.world.sitesByProv[pid];
    var site = (physical && physical.list[idx] || {}).site, rows = (bm.buildingInstitutionAssignments || []).filter(function (r) {
      return r.profileId === profileId && defs[r.institutionId] && defs[r.institutionId].provinceId === pid && defs[r.institutionId].site === site;
    });
    var row = rows.length === 1 ? rows[0] : null, d = row && defs[row.institutionId], saved = row && s.localInstitutions && s.localInstitutions[row.institutionId];
    var office = d && d.officeId && FB.religiousOfficeSnapshot(s, d.officeId), holder = FB.settlementCountyHolder(s, pid);
    var person = a.kind === 'character' ? s.chars[a.id] : FB.realmRulerCharacterSnapshot(s, a.id);
    var h = d && d.abbeyId && (s.abbeys && s.abbeys.houses || []).filter(function (v) { return v.id === d.abbeyId; })[0];
    var plots = h && (h.plots || []).reduce(function (n, v) {
      return n + (v.provinceId === pid && v.settlement === idx ? v.count === undefined ? 1 : v.count : 0);
    }, 0);
    var reason = null;
    if (!p || !d || !saved || !site || !FB.localInstitutionEnabled(s, d) || saved.status && saved.status !== 'active' ||
        !holder || s.owner[pid] !== FB.topRealm(s, holder)) reason = FB.T('An available institution at this exact site is required.');
    else if (a.kind === 'realm' && a.id === 'player' || !FB.settlementConstructionAuthority(s, pid, idx, a).direct || !free(s, person))
      reason = FB.T('The builder must lawfully hold this settlement and be free to act.');
    else if (p.incumbent === 'required' && !free(s, office)) reason = FB.T('The required institutional office is vacant or unavailable.');
    else if (p.property === 'abbey' && (!h || h.provinceId !== pid || h.activityInstitutionId && h.activityInstitutionId !== row.institutionId ||
        !(h.plots || []).some(function (v) { return v.provinceId === pid && v.settlement === idx && (v.count === undefined || v.count > 0); })))
      reason = FB.T('An actually endowed property at this site is required.');
    else if (p.permission === 'property_patron' && (!person.dyn || h.patronDyn !== person.dyn))
      reason = FB.T('The existing property patron must authorize and pay for these works.');
    var binding = d && p ? { v:1, profileId:profileId, institutionId:row.institutionId, siteId:site,
      propertyId:p.property === 'abbey' ? d.abbeyId : null, builder:copy(a), payer:copy(a),
      incumbentId:office && office.id || null, generation:JSON.stringify([holder, holder && FB.realmRulerGeneration(s, holder),
        s.owner[pid], d.officeId || null, office && office.id || null, h && [h.id,h.foundedTurn,h.patronDyn,h.holderId,plots] || null]),
      boundTurn:s.turn, revision:1 } : null;
    return { allowed:!reason, reason:reason || '', binding:binding };
  }
  function foundation(b) { return b.propertyId ? 'property:' + b.propertyId : 'institution:' + b.institutionId; }
  FB.buildingInstitutionStatus = function (s, pid, idx, id, a, existing, definition) {
    a = actor(s, a);
    if (!keys(a, ['kind','id']) || ['character','realm'].indexOf(a.kind) < 0 || typeof a.id !== 'string')
      return { allowed:false, reason:FB.T('A lawful builder and payer are required.'), binding:null };
    if (existing && !existing.institutionBinding && !(existing.buildingProfile && FB.buildingProfiles.assetDefinition(existing).institutionProfile))
      return { allowed:true, reason:'', binding:null };
    var q = current(s, pid, idx, id, a, definition || existing && FB.buildingProfiles.assetDefinition(existing)), b = q.binding;
    if (!q.allowed || !b) return q;
    var roles = profiles(FBDATA)[b.profileId].exclusiveRoles;
    var occupied = (!existing || !existing.institutionBinding) && (s.buildings && s.buildings[pid] || []).some(function (raw) {
        var r = typeof raw === 'string' ? { id:raw, s:0 } : raw;
        if (!r || r === existing) return false;
        return r.institutionBinding && foundation(r.institutionBinding) === foundation(b) ||
          r.s === idx && roles.indexOf(FB.buildingRole(r.id)) >= 0;
    });
    if (occupied) { q.allowed = false; q.reason = FB.T('This physical foundation is already occupied, including ruins.'); }
    if (existing && existing.institutionBinding) {
      var prior = copy(existing.institutionBinding), fresh = copy(b);
      delete prior.boundTurn; delete prior.revision; delete fresh.boundTurn; delete fresh.revision;
      if (!same(prior, fresh)) { q.allowed = false; q.reason = FB.T('Institutional permission changed. Review this asset before operating or paying for it again.'); }
    }
    return q;
  };
  FB.buildingInstitutionOperating = function (s, pid, r) {
    if (!r.institutionBinding) return true;
    return FB.buildingInstitutionStatus(s, pid, r.s, r.id, r.institutionBinding.payer, r).allowed;
  };
  FB.buildingInstitutionCountyKey = function (s, pid, rows) {
    return rows.map(function (r) { return r && r.institutionBinding ? FB.buildingInstitutionOperating(s, pid, r) : null; }).join(',');
  };
  FB.buildingInstitutionQuote = function (s, pid, idx, id, a, mode) {
    a = actor(s, a); mode = mode || 'construct';
    if (!keys(a, ['kind','id']) || ['character','realm'].indexOf(a.kind) < 0 || typeof a.id !== 'string' ||
        !Number.isSafeInteger(idx) || idx < 0) return null;
    var r = record(s, pid, idx, id), q = current(s, pid, idx, id, a, r && FB.buildingProfiles.assetDefinition(r));
    var status = FB.buildingInstitutionStatus(s, pid, idx, id, a, mode === 'reaffirm' ? r : null);
    if (mode === 'reaffirm' && r && q.binding && (r.institutionBinding || r.buildingProfile && r.buildingProfile.inherited)) {
      if (!r.institutionBinding && !status.allowed) { q.allowed = false; q.reason = status.reason; }
      q.binding.revision = r.institutionBinding ? r.institutionBinding.revision + 1 : 1;
      // Reaffirm changes permission on the same occupied asset, never its footprint.
      var old = r.institutionBinding, prior = old ? copy(old) : {}, next = copy(q.binding);
      delete prior.boundTurn; delete prior.revision; delete next.boundTurn; delete next.revision;
      if (same(prior, next)) { q.allowed = false; q.reason = FB.T('This institutional binding is already current.'); }
    } else if (mode === 'construct') q = status;
    else { q.allowed = false; q.reason = FB.T('There is no bound asset to review.'); }
    if (mode === 'construct' && !(a.kind === 'character' && a.id === s.player.charId ? FB.canBuildAt(s, pid, idx, id) : FB.aiCanBuildAt(s, a, pid, idx, id))) q.allowed = false;
    if (mode !== 'construct' && mode !== 'reaffirm') q.allowed = false;
    if (!q.binding) { q.allowed = false; q.reason = FB.T('This building has no institutional binding.'); }
    return copy({ provinceId:pid, settlement:idx, buildingId:id, actor:a, mode:mode, allowed:q.allowed, reason:q.reason,
      binding:q.binding, cost:mode === 'construct' ? FB.buildCost(s, pid, id, a.kind === 'realm' ? a.id : a.id !== s.player.charId ? FB.settlementCountyHolder(s, pid) : undefined) : 0,
      funds:a.kind === 'character' ? a.id === s.player.charId ? s.player.gold : (FB.baronyAccount(s, a.id) || {}).gold : FB.treasuryAvailable(s, a.id),
      previous:r && r.institutionBinding || null });
  };
  FB.buildingInstitutionApply = function (s, reviewed) {
    if (!plain(reviewed) || !reviewed.allowed) return false;
    var q = FB.buildingInstitutionQuote(s, reviewed.provinceId, reviewed.settlement, reviewed.buildingId, reviewed.actor, reviewed.mode);
    if (!q || !q.allowed || !same(q, reviewed)) return false;
    if (!q.binding) return false;
    if (q.mode === 'reaffirm') {
      record(s, q.provinceId, q.settlement, q.buildingId).institutionBinding = copy(q.binding);
      FB.invalidateBuildingIndex(s, q.provinceId); return true;
    }
    if (q.actor.kind === 'character') return q.actor.id === s.player.charId
      ? FB.build(s, q.provinceId, q.settlement, q.buildingId) : FB.buildBarony(s, q.actor.id, q.provinceId, q.settlement, q.buildingId);
    return FB.buildRealm(s, q.actor.id, q.provinceId, q.settlement, q.buildingId);
  };
  FB.validateBuildingInstitutionState = function (s) {
    var seen = {}, defs = FB.localInstitutionDefinitions(s);
    function fail() { throw new Error(FB.T('Invalid saved institutional building binding.')); }
    Object.keys(s.buildings || {}).forEach(function (pid) {
      (s.buildings[pid] || []).forEach(function (r) {
        if (!r || !own(r, 'institutionBinding')) return;
        var b = r.institutionBinding, d = b && defs[b.institutionId], p = b && profiles(FBDATA)[b.profileId];
        var slots = FB.campaignBookmark(s).provinces.filter(function (v) { return v.id === pid; });
        if (!keys(b, ['v','profileId','institutionId','siteId','propertyId','builder','payer','incumbentId','generation','boundTurn','revision']) || b.v !== 1 ||
            !p || !d || !FB.buildingProfiles.assetDefinition(r) || FB.buildingProfiles.assetDefinition(r).institutionProfile !== b.profileId ||
            d.site !== b.siteId || d.provinceId !== pid || !slots.length ||
            !Number.isSafeInteger(r.s) || r.s < 0 || !Number.isSafeInteger(b.boundTurn) || b.boundTurn < 0 || b.boundTurn > s.turn ||
            !Number.isSafeInteger(b.revision) || b.revision < 1 ||
            typeof b.generation !== 'string' || !b.generation.length || b.generation.length > 8192 ||
            b.propertyId !== (p.property === 'abbey' ? d.abbeyId : null) ||
            b.incumbentId !== null && !own(s.chars, b.incumbentId) || p.incumbent === 'required' && b.incumbentId === null ||
            !keys(b.builder, ['kind','id']) || !keys(b.payer, ['kind','id']) || !same(b.builder, b.payer) ||
            b.builder.kind === 'character' && !own(s.chars, b.builder.id) ||
            b.builder.kind === 'realm' && !own(s.realms, b.builder.id) || ['character','realm'].indexOf(b.builder.kind) < 0) fail();
        var bm = FB.campaignBookmark(s), geo = FBDATA.geographies[FB.bookmarkGeography(bm)];
        var layoutId = bm.settlementLayout !== undefined ? bm.settlementLayout : own(FBDATA.settlementLayouts, bm.id) ? bm.id : geo.defaultLayout;
        var placements = slots[0].settlements || (FBDATA.settlementLayouts[layoutId] || {})[pid] || [];
        if (!placements[r.s] || placements[r.s].site !== b.siteId ||
            !(bm.buildingInstitutionAssignments || []).some(function (a) { return a.profileId === b.profileId && a.institutionId === b.institutionId; })) fail();
        var key = foundation(b); if (seen[key]) fail(); seen[key] = true;
        if ((s.buildings[pid] || []).some(function (other) {
          return other !== r && other && other.s === r.s && p.exclusiveRoles.indexOf(FB.buildingRole(other.id)) >= 0;
        })) fail();
        var g;
        try { g = JSON.parse(b.generation); } catch (e) { fail(); }
        if (!Array.isArray(g) || g.length !== 6 || !own(s.realms, g[0]) || !Number.isSafeInteger(g[1]) || g[1] < 1 ||
            g[2] !== null && !own(s.realms, g[2]) || g[3] !== (d.officeId || null) || g[4] !== b.incumbentId ||
            b.propertyId === null && g[5] !== null || b.propertyId !== null && (!Array.isArray(g[5]) || g[5].length !== 5 || g[5][0] !== b.propertyId ||
              !Number.isSafeInteger(g[5][1]) || g[5][1] < 0 || g[5][1] > b.boundTurn ||
              typeof g[5][2] !== 'string' || !g[5][2] || g[5][2].length > 256 ||
              g[5][3] !== null && !own(s.chars, g[5][3]) || !Number.isSafeInteger(g[5][4]) || g[5][4] < 1)) fail();
      });
    });
  };
})();
