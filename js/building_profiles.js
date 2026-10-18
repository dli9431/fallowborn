/* Typed variants replace supported values on one canonical physical asset. */
(function () {
  'use strict';
  var P = FB.buildingProfiles = {};
  var scalars = ['cost','upkeep','devMin','tax','dev','pop','prestige','piety','research',
    'levy','retinue','archers','defense','siege','populationCapacity',
    'populationFamineProtection','populationCrisisProtection','migrationAttraction','communityFaithPressure'];
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o || {},k); }
  function object(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function keys(o,list) { return object(o) && Object.keys(o).every(function (k) { return list.indexOf(k) >= 0; }); }
  function ident(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v) && ['constructor','prototype','__proto__'].indexOf(v) < 0; }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function equal(a,b) { return FB.mods.fingerprint(a) === FB.mods.fingerprint(b); }
  P.ids = function (buildingId, c) {
    c = c || FBDATA;
    return Object.keys(c.buildingProfiles || {}).filter(function (id) { return c.buildingProfiles[id].buildingId === buildingId; }).sort();
  };
  P.definition = function (buildingId, profileId, c) {
    c = c || FBDATA;
    var d = c.buildings && c.buildings[buildingId];
    if (profileId === undefined || profileId === null) return d;
    var p = own(c.buildingProfiles,profileId) && c.buildingProfiles[profileId];
    if (!d || !p || p.buildingId !== buildingId) return null;
    var out = Object.assign({},d,p.replace);
    ['operationProfile','institutionProfile'].forEach(function (k) { if (own(p,k)) out[k] = p[k]; });
    var base = d.requiresTech ? [].concat(d.requiresTech) : [];
    out.requiresTech = base.concat(p.requiresTech || []).filter(function (v,i,a) { return a.indexOf(v) === i; });
    // Display stays in the profile namespace; the base building is never mutated.
    out.name = p.name; out.desc = p.desc;
    return out;
  };
  P.assetDefinition = function (r) { return P.definition(r.id,r.buildingProfile && r.buildingProfile.id); };
  P.catalogFaults = function (c) {
    var out = [], table = c.buildingProfiles;
    if (!object(table) || Object.keys(table).length > 256) return ['buildingProfiles must be a table of at most 256 profiles.'];
    Object.keys(table).forEach(function (id) {
      var p = table[id], d = p && c.buildings && c.buildings[p.buildingId];
      function fault(text) { out.push('buildingProfiles.' + id + ': ' + text); }
      if (!ident(id) || !keys(p,['buildingId','name','desc','replace','requiresTech','applicability',
          'siteResourceProfile','operationProfile','institutionProfile','techImpactReview','inheritance']) || !ident(p.buildingId) || !d ||
          typeof p.name !== 'string' || !p.name.trim() || p.name.length > 120 ||
          typeof p.desc !== 'string' || !p.desc.trim() || p.desc.length > 1000 || !keys(p.replace,scalars) ||
          Object.keys(p.replace).some(function (k) { return typeof p.replace[k] !== 'number' || !Number.isFinite(p.replace[k]) || p.replace[k] < 0 || p.replace[k] > 1000000; }) ||
          !Array.isArray(p.requiresTech) || p.requiresTech.length > 16 || p.requiresTech.some(function (v,i) {
            return !ident(v) || !own(c.tech,v) || p.requiresTech.indexOf(v) !== i;
          })) { fault('invalid base, display, replacement values or technology references.'); return; }
      if (d.fort && (Object.keys(p.replace).length || p.operationProfile || p.institutionProfile)) {
        fault('strategic forts retain canonical level values and cannot use ordinary operation or institution bindings.'); return;
      }
      ['siteResourceProfile','operationProfile','institutionProfile'].forEach(function (k) {
        var refs = k === 'siteResourceProfile' ? c.siteResourceProfiles : k === 'operationProfile' ? c.buildingOperationProfiles : c.buildingInstitutionProfiles;
        if (own(p,k) && (!ident(p[k]) || !own(refs,p[k]))) fault('unknown ' + k + '.');
      });
      var effective = P.definition(p.buildingId,id,c), buildings = Object.assign({},c.buildings);
      buildings[p.buildingId] = effective;
      FB.validateBuildingData(buildings,true).forEach(fault);
      FB.buildingOperations.catalogFaults(Object.assign({},c,{buildings:buildings})).forEach(fault);
      if (own(p,'inheritance') && p.inheritance !== 'retain') fault('inheritance must be retain when supplied.');
      if (p.applicability !== undefined) {
        buildings[p.buildingId] = Object.assign({},effective,{applicability:p.applicability});
        FB.validateBuildingData(buildings,true).forEach(fault);
      }
      if (p.requiresTech.length) {
        var review = c.techImpactReviews && c.techImpactReviews.features && c.techImpactReviews.features[p.techImpactReview];
        if (!ident(p.techImpactReview) || !review || ['hard','soft'].indexOf(review.mode) < 0 ||
            p.requiresTech.some(function (v) { return (review.tech || []).indexOf(v) < 0; })) fault('machinery needs its exact hard or soft technology-impact review.');
      } else if (p.techImpactReview !== undefined) fault('an ungated profile does not name a machinery review.');
    });
    return out;
  };
  P.stamp = function (buildingId, profileId) {
    if (profileId === undefined || profileId === null) return null;
    return {v:1,id:profileId,definition:FB.mods.fingerprint({profile:FBDATA.buildingProfiles[profileId],base:FBDATA.buildings[buildingId]})};
  };
  P.attach = function (r, profileId) {
    var value = P.stamp(r.id,profileId);
    if (value) {
      r.buildingProfile = value;
      if (!FBDATA.buildings[r.id].fort) r.devGranted = 0;
    }
  };
  // Opening inventory waives construction chronology, never physical requirements.
  P.inheritedFault = function (bm, placement, pr) {
    var p = FBDATA.buildingProfiles[placement.profileId], d = P.definition(placement.buildingId,placement.profileId);
    if (!ident(placement.profileId) || !p || !d || p.inheritance !== 'retain') return 'profile does not permit inherited inventory.';
    if (d.coastal && !pr.coastal || d.terrains && d.terrains.indexOf(pr.terrain) < 0)
      return 'inherited profile has incompatible physical terrain or coast.';
    if (p.siteResourceProfile && !FB.siteResources.compilePrepared(bm).sources.some(function (a) {
      return a.countyId === pr.id && a.siteId === placement.siteId && a.profileId === p.siteResourceProfile;
    })) return 'inherited profile requires its declared physical source, including when empty.';
    if (d.operationProfile && !(bm.buildingOperationAssignments || []).some(function (a) {
      return a.countyId === pr.id && a.siteId === placement.siteId && a.buildingId === placement.buildingId && a.profileId === d.operationProfile;
    })) return 'inherited profile requires its exact operation assignment.';
    if (d.institutionProfile && !(bm.buildingInstitutionAssignments || []).some(function (a) {
      var institution = (bm.localInstitutions || FBDATA.localInstitutions || {})[a.institutionId];
      return a.profileId === d.institutionProfile && institution && institution.provinceId === pr.id && institution.site === placement.siteId;
    })) return 'inherited profile requires its exact institutional assignment.';
    return '';
  };
  P.inherit = function (s,pid,r,placement) {
    P.attach(r,placement.profileId);
    r.buildingProfile.inherited = {bookmarkId:s.start.id,revision:s.start.revision,countyId:pid,siteId:placement.siteId};
    var d = P.assetDefinition(r);
    if (d.operationProfile) {
      var a = FB.compileBuildingOperations(FB.campaignBookmark(s)).assignments.find(function (a) {
        return a.countyId === pid && a.slot === r.s && a.buildingId === r.id && a.profileId === d.operationProfile;
      });
      if (!a) throw new Error('Missing inherited building operation.');
      r.waterOperation = {v:1,id:'inherited_' + FB.mods.fingerprint([s.start.id,s.start.revision,pid,r.s,r.id]),
        profileId:a.profileId,assignmentId:a.id,revision:0};
    }
    // Institutional permission is reviewed against actual living offices after boot.
  };
  P.inventoryFaults = function (bm,placements) {
    var out = [], foundations = {};
    placements.forEach(function (a) {
      var d = P.definition(a.buildingId,a.profileId);
      if (!a.profileId || !d || !d.institutionProfile) return;
      var row = (bm.buildingInstitutionAssignments || []).find(function (b) {
        var i = (bm.localInstitutions || FBDATA.localInstitutions || {})[b.institutionId];
        return b.profileId === d.institutionProfile && i && i.provinceId === a.countyId && i.site === a.siteId;
      });
      if (!row) return;
      var institution = (bm.localInstitutions || FBDATA.localInstitutions)[row.institutionId];
      var policy = FBDATA.buildingInstitutionProfiles[d.institutionProfile];
      var foundation = institution.abbeyId ? 'property:' + institution.abbeyId : 'institution:' + row.institutionId;
      if (foundations[foundation] || placements.some(function (b) {
        return b !== a && b.countyId === a.countyId && b.siteId === a.siteId && policy.exclusiveRoles.indexOf(FB.buildingRole(b.buildingId)) >= 0;
      })) out.push('openingInfrastructure: inherited institutional footprint is already occupied, including ruins.');
      foundations[foundation] = true;
    });
    return out;
  };
  P.operationReady = function (s,pid,r) {
    var d = P.assetDefinition(r);
    if (!r.buildingProfile) return !!d && !r.ruined && (!r.institutionBinding || FB.buildingInstitutionOperating(s,pid,r));
    return !!d && !r.ruined && (!d.institutionProfile || !!r.institutionBinding && FB.buildingInstitutionOperating(s,pid,r)) &&
      (!d.operationProfile || !!r.waterOperation);
  };
  P.effectRows = function (s,key,recruitmentRealm) {
    var rows = {}, out = [];
    FB.directSettlements(s).forEach(function (site) {
      if (recruitmentRealm && FB.recruitmentCountyBlocked(s,recruitmentRealm,site.provinceId)) return;
      FB.builtIn(s,site.provinceId).forEach(function (r) {
        if (r.s !== site.settlement || !P.operationReady(s,site.provinceId,r)) return;
        var d = FB.buildingOperations.effects(s,site.provinceId,r), amount = d[key] || 0;
        if (!amount || d.fort) return;
        var profileId = r.buildingProfile && r.buildingProfile.id || null, id = JSON.stringify([r.id,profileId]);
        if (!rows[id]) { rows[id] = {buildingId:r.id,profileId:profileId,count:0,amount:0}; out.push(rows[id]); }
        rows[id].count++; rows[id].amount += amount;
      });
    });
    return out;
  };
  P.aiChoices = function (s,actor,pid,slot,buildingId) {
    var choices = [null].concat(P.ids(buildingId)).map(function (profileId) {
      var d = P.definition(buildingId,profileId);
      if (!d || d.fort || !FB.aiCanBuildAt(s,actor,pid,slot,buildingId,profileId)) return null;
      var realm = actor.kind === 'realm' ? actor.id : FB.settlementCountyHolder(s,pid);
      var cost = FB.buildCost(s,pid,buildingId,realm,profileId);
      var benefit = scalars.filter(function (k) { return ['cost','upkeep','devMin'].indexOf(k) < 0; })
        .reduce(function (n,k) { return n + (d[k] || 0); },0);
      return benefit > 0 ? {id:buildingId,profileId:profileId,def:d,cost:cost,
        score:benefit / Math.max(1,cost + (d.upkeep || 0) * (FBDATA.balance.realmReserveSeasons || 2))} : null;
    }).filter(function (v) { return !!v; });
    return choices.sort(function (a,b) { return b.score-a.score || a.cost-b.cost || (String(a.profileId) < String(b.profileId) ? -1 : String(a.profileId) > String(b.profileId) ? 1 : 0); });
  };
  P.reviewInheritedAI = function (s) {
    if (!Object.keys(FBDATA.buildingProfiles).length) return 0;
    var attempts = 0, changed = 0;
    Object.keys(s.buildings || {}).sort().forEach(function (pid) {
      (s.buildings[pid] || []).forEach(function (r) {
        if (attempts >= 32 || !r || !r.buildingProfile || !r.buildingProfile.inherited || r.institutionBinding ||
            !P.assetDefinition(r).institutionProfile) return;
        var holder = FB.settlementHolder(s,pid,r.s);
        if (!holder || holder.id === 'player' || holder.kind === 'character' && holder.id === s.player.charId) return;
        attempts++;
        if (FB.buildingInstitutionApply(s,FB.buildingInstitutionQuote(s,pid,r.s,r.id,holder,'reaffirm'))) changed++;
      });
    });
    return changed;
  };
  P.status = function (s,pid,slot,buildingId,profileId,payer) {
    var p = own(FBDATA.buildingProfiles,profileId) && FBDATA.buildingProfiles[profileId];
    var d = P.definition(buildingId,profileId), a = FB.settlementActor(s,payer);
    function blocked(reason) { return {ready:false,reason:reason}; }
    if (!p || !d) return blocked(FB.T('This construction profile is unavailable.'));
    var who = FB.political.actor(s,a), person = who && s.chars[who.characterId];
    if (!person || person.dead || person.captive || person.unfree || person.imprisoned || person.prisonerOf || person.exiled ||
        FB.ageOf(person,s.date.year) < 16 || FB.justiceCustodyOf(s,person.id) ||
        person.id === s.player.charId && s.player.flags.in_prison)
      return blocked(FB.T('The builder must be alive and free to authorize these works.'));
    var base = FB.buildingApplicabilityStatus(s,pid,buildingId,a);
    if (!base.ready) return base;
    if (p.applicability !== undefined) {
      var scoped = FB.buildingApplicabilityStatus(s,pid,buildingId,a,Object.assign({},d,{applicability:p.applicability}));
      if (!scoped.ready) return scoped;
    }
    var realm = a.kind === 'realm' ? a.id : FB.settlementCountyHolder(s,pid);
    for (var i=0; i<d.requiresTech.length; i++) if (!FB.techRequirementMet(s,d.requiresTech[i],realm))
      return blocked(FB.T('Requires {technology}.',{technology:FB.dataText(s,s.player.charId,'tech',d.requiresTech[i],FBDATA.tech[d.requiresTech[i]],'name',{})}));
    if (p.siteResourceProfile) {
      var site = FB.settlementsOf(s,pid)[slot];
      if (!site || !site.site || !FB.siteResources.snapshot(s,pid,site.site,a).some(function (r) {
        return r.profileId === p.siteResourceProfile && r.allowed && r.available > 0;
      })) return blocked(FB.T('A lawful available source of the declared kind is required at this exact site.'));
    }
    return {ready:true,reason:''};
  };
  function requestValid(r) {
    return keys(r,['countyId','settlement','buildingId','profileId','actor','targetLevel']) && ident(r.countyId) &&
      Number.isSafeInteger(r.settlement) && r.settlement >= 0 && ident(r.buildingId) && ident(r.profileId) &&
      keys(r.actor,['kind','id']) && Object.keys(r.actor).length === 2 && ['realm','character'].indexOf(r.actor.kind) >= 0 && typeof r.actor.id === 'string';
  }
  P.quote = function (s,r) {
    var q = {allowed:false,reason:FB.T('This construction profile is unavailable.'),request:object(r) ? copy(r) : null};
    if (!requestValid(r) || r.actor.kind === 'realm' && r.actor.id === 'player' || !FB.world.byId[r.countyId] || FB.world.byId[r.countyId].wasteland ||
        !FB.settlementsOf(s,r.countyId)[r.settlement]) return q;
    var d = P.definition(r.buildingId,r.profileId);
    var realmForPrice = r.actor.kind === 'realm' ? r.actor.id : r.actor.id === s.player.charId ? undefined : FB.settlementCountyHolder(s,r.countyId);
    q.cost = d && !d.fort ? FB.buildCost(s,r.countyId,r.buildingId,realmForPrice,r.profileId) : 0;
    var status = P.status(s,r.countyId,r.settlement,r.buildingId,r.profileId,r.actor);
    if (!d || !status.ready) { q.reason = status.reason; return q; }
    if (own(r,'targetLevel') && (!d.fort || !Number.isSafeInteger(r.targetLevel) || r.targetLevel < 1 || r.targetLevel > 4)) return q;
    var player = r.actor.kind === 'character' && r.actor.id === s.player.charId;
    var realm = r.actor.kind === 'realm' ? r.actor.id : player ? undefined : FB.settlementCountyHolder(s,r.countyId);
    if (d.fort && !player) { q.reason = FB.T('Strategic fort construction uses the existing ruler work budget.'); return q; }
    var fort = d.fort && FB.fortProjectStatus(s,r.countyId,r.settlement,r.targetLevel,{realm:realm || 'player',profileId:r.profileId});
    var can = d.fort ? fort.ok : player ? FB.canBuildAt(s,r.countyId,r.settlement,r.buildingId,null,r.profileId) :
      FB.aiCanBuildAt(s,r.actor,r.countyId,r.settlement,r.buildingId,r.profileId);
    q.cost = d.fort ? fort.cost : FB.buildCost(s,r.countyId,r.buildingId,realm,r.profileId);
    q.funds = r.actor.kind === 'realm' ? FB.treasuryAvailable(s,r.actor.id) : player ? s.player.gold : FB.baronyConstructionFunds(s,r.actor.id);
    q.reserve = r.actor.kind === 'realm' ? (FB.treasuryConstructionReserves(s) || {})[r.actor.id] : 0;
    var floor = r.actor.kind === 'realm' ? q.reserve + (d.upkeep || 0) * (FBDATA.balance.realmReserveSeasons || 2) :
      player ? 0 : (d.upkeep || 0) * (FBDATA.balance.realmReserveSeasons || 2);
    q.allowed = !!can && Number.isFinite(q.funds) && Number.isFinite(floor) && q.funds >= q.cost + floor;
    q.reason = q.allowed ? '' : FB.T('Current authority, capacity, funding and construction requirements must all be met.');
    var site = FB.settlementsOf(s,r.countyId)[r.settlement], institutional = FB.buildingInstitutionStatus(s,r.countyId,r.settlement,r.buildingId,r.actor,null,d);
    q.context = {turn:s.turn,date:copy(s.date),site:site && site.site || null,stamp:P.stamp(r.buildingId,r.profileId),
      mods:FB.mods.sig(),holder:FB.settlementHolder(s,r.countyId,r.settlement),owner:s.owner[r.countyId],
      actor:FB.political.actor(s,r.actor),institution:institutional.binding,
      sources:FB.siteResources.snapshot(s,r.countyId,site && site.site,r.actor),
      buildings:copy(s.buildings[r.countyId] || []),fort:fort || null};
    return q;
  };
  P.commit = function (s,reviewed) {
    if (!object(reviewed) || !reviewed.allowed || !requestValid(reviewed.request)) return false;
    var r = reviewed.request, q = P.quote(s,r);
    if (!q.allowed || !equal(q,reviewed)) return false;
    var d = P.definition(r.buildingId,r.profileId), player = r.actor.kind === 'character' && r.actor.id === s.player.charId;
    if (d.fort) {
      // Public AI fort work retains the separate annual work-budget owner.
      if (!player) return false;
      return !!FB.startFortProject(s,r.countyId,r.settlement,r.targetLevel,{profileId:r.profileId});
    }
    return player ? FB.build(s,r.countyId,r.settlement,r.buildingId,r.profileId) : r.actor.kind === 'realm' ?
      FB.buildRealm(s,r.actor.id,r.countyId,r.settlement,r.buildingId,undefined,r.profileId) :
      FB.buildBarony(s,r.actor.id,r.countyId,r.settlement,r.buildingId,r.profileId);
  };
  P.validate = function (s) {
    var inheritedPlan = null;
    Object.keys(s.buildings || {}).forEach(function (pid) {
      (s.buildings[pid] || []).forEach(function (r) {
        if (!r || !own(r,'buildingProfile')) return;
        var b = r.buildingProfile, d = object(b) && P.definition(r.id,b.id);
        var identity = object(b) && {v:b.v,id:b.id,definition:b.definition};
        if (!keys(b,['v','id','definition','inherited']) || Object.keys(b).length !== (own(b,'inherited') ? 4 : 3) || b.v !== 1 || !ident(b.id) ||
            !d || !equal(identity,P.stamp(r.id,b.id)) || !Number.isSafeInteger(r.s) || r.s < 0 ||
            d.operationProfile && (!r.waterOperation || r.waterOperation.profileId !== d.operationProfile) ||
            d.institutionProfile && (!r.institutionBinding && !b.inherited || r.institutionBinding && r.institutionBinding.profileId !== d.institutionProfile))
          throw new Error(FB.T('Invalid saved building profile.'));
        if (own(b,'inherited')) {
          var h = b.inherited, bm = FB.campaignBookmark(s);
          var plan = inheritedPlan || (inheritedPlan = bm && FB.compileOpeningInfrastructure(bm));
          var placement = plan && !plan.errors.length && plan.placements.find(function (p) {
            return object(h) && p.countyId === pid && p.siteId === h.siteId && p.s === r.s && p.buildingId === r.id && p.profileId === b.id;
          });
          if (!keys(h,['bookmarkId','revision','countyId','siteId']) || Object.keys(h).length !== 4 || !s.start ||
              h.bookmarkId !== s.start.id || h.revision !== s.start.revision || h.countyId !== pid ||
              !placement)
            throw new Error(FB.T('Invalid inherited building profile.'));
        }
      });
    });
    return true;
  };
})();
