/* Shared fiscal, military and property owners remain authoritative. */
(function () {
  'use strict';
  var G = FB.governments, E = FB.ecclesiasticalGovernment, C = G.support, Q = FB.political;
  function compose(slot,id,patch) { return Object.assign({},G.strategy(slot,id),patch); }
  G.register('holders','institutional_holders',compose('holders','direct',{
    conquest:function (s,rid) { return rid; },vacancy:function (s,rid) { return rid; }
  }));
  G.register('succession','religious_office_bound',{
    officeBound:true,institutionalProperty:true,delegatedLeadership:true,repairEmpty:false,
    eligible:function () { return false; },order:function () { return []; },
    candidates:function (s,rid) { var c = E.incumbent(s,rid); return c ? [c.id] : []; },
    vacancy:function (s,rid) { return { allowed:false,rulerGeneration:FB.realmRulerGeneration(s,rid) }; },
    accession:function () { return null; },refresh:function () { return false; }
  });
  G.register('territory','institutional_territory',compose('territory','fixed',{
    profile:function () { return { movingCourt:false,holdsCounties:true,allowsTitleGrowth:false }; }
  }));
  G.register('consent','ecclesiastical_consent',{
    local:function () { return false; },
    decision:function (s,rid,c) {
      var actor = c.actor, chief = E.incumbent(s,rid);
      if (!actor || actor.kind === 'realm' && actor.id !== rid || actor.kind === 'character' && (!chief || chief.id !== actor.id)) {
        // Ordinary household activity does not require holding spiritual office.
        var person = actor && actor.kind === 'character' && s.chars[actor.id];
        var home = person && (person.id === s.player.charId ? s.player.provinceId : person.homeProvinceId);
        return { allowed:!!person && !person.dead && c.operation === 'household' && E.controlled(s,rid,home),reason:'no_mandate',required:[],approvals:{} };
      }
      return E.decision(s,rid,c.operation,c.scope);
    },
    constituency:function (s,rid,c) { return { kind:'religious_institution',realmId:rid,members:(c.decision.required || []).slice() }; }
  });
  var levy = G.strategy('levy','feudal_levy'), revenue = G.strategy('revenue','demesne_revenue');
  function rate(s,rid,kind,pid) {
    var p = E.profile(s,rid);
    return p && E.decision(s,rid,kind === 'revenueRate' ? 'revenue' : 'levy',pid ? { provinceId:pid } : null).allowed ? p[kind] : 0;
  }
  G.register('levy','ecclesiastical_service',compose('levy','feudal_levy',{
    countyBase:function (s,rid,c) { return levy.countyBase(s,rid,c) * rate(s,rid,'levyRate',c.provinceId); },
    settlementBase:function (s,rid,c) { return levy.settlementBase(s,rid,c) * rate(s,rid,'levyRate',c.provinceId); },
    mayCall:function (s,rid) { return E.decision(s,rid,'levy').allowed; },
    service:function (s,rid,c) { return levy.service(s,rid,c) * rate(s,rid,'levyRate',c.provinceId); }
  }));
  G.register('revenue','ecclesiastical_receipts',compose('revenue','demesne_revenue',{
    countyBase:function (s,rid,c) { return revenue.countyBase(s,rid,c) * rate(s,rid,'revenueRate',c.provinceId); },
    settlementBase:function (s,rid,c) {
      var holder = FB.settlementHolder(s,c.provinceId,c.settlement);
      return revenue.settlementBase(s,rid,c) * (holder && holder.kind === 'character' ? 1 : rate(s,rid,'revenueRate',c.provinceId));
    },
    buildingIncome:function (s,rid,c) {
      return revenue.buildingIncome(s,rid,c) * (c.holder && c.holder.kind === 'character' ? 1 : rate(s,rid,'revenueRate',c.provinceId));
    }
  }));
  G.register('council','ecclesiastical_council',{
    seats:function () { return []; },eligible:function () { return false; },vacancy:function () { return null; }
  });
  G.register('diplomacy','ecclesiastical_diplomacy',compose('diplomacy','territorial_diplomacy',{
    goalAllowed:function (s,rid) { return E.decision(s,rid,'war').allowed; }
  }));
  G.register('ai','ecclesiastical_decisions',compose('ai','realm_decisions',{
    offices:function (s,rid) { return E.tick(s,rid); },
    goals:function (s,rid,c) { return E.decision(s,rid,'war').allowed ? G.strategy('ai','realm_decisions').goals(s,rid,c) : { warChance:0,allianceChance:0 }; }
  }));
  var base = G.strategy('ladder','local_service'), bands = {};
  for (var i = 0; i < FB.station.bandCount; i++) bands[i] = Object.assign({},base.bands[i]);
  bands[1].promotion = { route:'standing',next:2,cost:{ gold:10,prestige:5,piety:0 },paths:[{ roles:['clergy','cloister','civic','labor','craft','arms'],years:2,prestige:10 }] };
  bands[2].promotion = { route:'standing',next:3,cost:{ gold:20,prestige:10,piety:0 },paths:[{ roles:['clergy','cloister','civic','craft','arms'],years:4,prestige:30 }] };
  G.register('ladder','ecclesiastical_careers',{ bands:bands });

  var delegated = C.isDelegated, initialize = C.initialize, delegate = C.delegate, tick = C.tick, day = C.day;
  C.isDelegated = function (s,rid) { return !E.active(s,rid) && delegated(s,rid); };
  var definitionFaults = C.definitionFaults;
  C.definitionFaults = function (d,formId,year,provinces) {
    return G.resolve(formId).use.succession.officeBound ?
      (d.constituency !== undefined ? ['religious institutions do not create a second electorate'] : []) : definitionFaults(d,formId,year,provinces);
  };
  C.initialize = function (s,defs) { return initialize(s,defs.filter(function (d) { return !E.active(s,d.id); })); };
  C.delegate = function (s,rid) { return E.active(s,rid) ? E.incumbent(s,rid) : delegate(s,rid); };
  C.tick = function (s,rid) { return E.active(s,rid) ? E.tick(s,rid) : tick(s,rid); };
  C.day = function (s) { day(s); Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
    if (E.active(s,rid)) E.sync(s,rid);
  }); };
  var snapshot = FB.realmRulerCharacterSnapshot, materialize = FB.materializeRealmRuler, rulerRealm = FB.realmIdForRulerCharacter;
  var boundRealms = new WeakMap(), invalidate = G.invalidate;
  G.invalidate = function () { boundRealms = new WeakMap(); return invalidate.apply(G,arguments); };
  function bindings(s) {
    var roots = s.authority && s.authority.governments, cached = boundRealms.get(s);
    if (!cached || cached.roots !== roots) {
      cached = { roots:roots,ids:Object.keys(roots || {}).filter(function (rid) { return !!E.row(s,rid) && E.active(s,rid); }) };
      boundRealms.set(s,cached);
    }
    return cached.ids;
  }
  FB.realmRulerCharacterSnapshot = function (s,rid) { return E.active(s,rid) && E.row(s,rid) ? E.incumbent(s,rid) : snapshot(s,rid); };
  FB.materializeRealmRuler = function (s,rid) { return E.active(s,rid) && E.row(s,rid) ? E.incumbent(s,rid) : materialize.apply(FB,arguments); };
  FB.realmIdForRulerCharacter = function (s,value) {
    var cid = typeof value === 'string' ? value : value && value.id;
    if (!s || !cid) return null;
    var ids = bindings(s);
    for (var i = 0; i < ids.length; i++) { var c = s.realms[ids[i]] && s.realms[ids[i]].alive && E.incumbent(s,ids[i]); if (c && c.id === cid) return ids[i]; }
    var inherited = rulerRealm(s,value); return inherited && E.active(s,inherited) && E.row(s,inherited) ? null : inherited;
  };
  var died = FB.royalCharDied, advance = FB.advanceRealmSuccession, absorb = FB.absorbRealm;
  FB.royalCharDied = function (s,c,rid) {
    // The religious owner handles death before the government observes it.
    var line = c && c.royalLine, family = line && s.realms[line.realmId] && s.realms[line.realmId].succession;
    if (line && E.active(s,line.realmId) && family && family.members[line.memberId]) {
      family.members[line.memberId].alive = false; family.members[line.memberId].died = s.date.year;
      if (FB.syncLinkedRoyalCourts) FB.syncLinkedRoyalCourts(s,line.realmId);
    }
    if (rid && E.active(s,rid) || line && E.active(s,line.realmId)) { E.sync(s,rid || line.realmId); return; }
    return died.apply(FB,arguments);
  };
  FB.advanceRealmSuccession = function (s,rid,opts) {
    if (!E.active(s,rid)) return advance.apply(FB,arguments);
    var c = E.incumbent(s,rid);
    if (c && (!opts || !opts.repair && (!opts.cause || opts.cause === 'death'))) FB.killChar(s,c);
    E.sync(s,rid); return E.incumbent(s,rid);
  };
  FB.absorbRealm = function (s,rid) { return E.active(s,rid) ? false : absorb.apply(FB,arguments); };
  var characterRealm = FB.treasuryCharacterRealm;
  FB.treasuryCharacterRealm = function (s,cid) { return cid !== s.player.charId && E.active(s,FB.realmIdForRulerCharacter(s,cid)) ? null : characterRealm(s,cid); };
  var setForm = FB.authoritySetGovernment;
  E.setFormReviewed = setForm;
  FB.authoritySetGovernment = function (s,rid,id) {
    var f = FBDATA.governmentForms[id], rule = f && G.strategy('succession',f.succession);
    return E.active(s,rid) || rule && rule.officeBound ? false : setForm.apply(FB,arguments);
  };
  var registerWar = FB.registerOrdinaryWar;
  FB.registerOrdinaryWar = function (s,rid,war) {
    var attacker = rid === 'player' && war && war.defending ? war.enemy : rid;
    // Existing wars survive vacancy; a new declaration needs a current mandate.
    var existing = war && war.id && s.wars && s.wars[war.id] === war;
    if (!existing && E.active(s,attacker) && E.row(s,attacker) && !E.decision(s,attacker,'war').allowed) return null;
    return registerWar.apply(FB,arguments);
  };
  var formAlliance = FB.formAlliance, settleWar = FB.settleOrdinaryWar;
  FB.formAlliance = function (s,a,b) {
    if ([a,b].some(function (rid) { return E.active(s,rid) && !E.decision(s,rid,'treaty').allowed; })) return false;
    return formAlliance.apply(FB,arguments);
  };
  FB.settleOrdinaryWar = function (s,id,result) {
    var war = FB.ordinaryWarById(s,id);
    if (war && result === 'white_peace' && [war.attacker,war.defender].some(function (rid) {
      return s.realms[rid] && s.realms[rid].alive && E.active(s,rid) && !E.decision(s,rid,'treaty').allowed;
    })) return false;
    return settleWar.apply(FB,arguments);
  };
  var power = Q.power;
  Q.power = function (s,actor,kind,at) {
    var result = power.apply(Q,arguments), pid = at && at.provinceId, rid = pid && s.holder[pid];
    if (!E.active(s,rid) || !E.row(s,rid)) return result;
    if ((result.basis || []).some(function (b) {
      if (['appointment','federate_service','legacy_command','federate_pay'].indexOf(b.kind) >= 0) return true;
      return b.kind === 'custom' && (s.authority.rights || []).some(function (right) {
        return right.id === b.id && ['possession','recognition'].indexOf(right.basis) < 0;
      });
    })) return result;
    var c = E.incumbent(s,rid), p = E.profile(s,rid);
    var publicActor = actor && (actor.kind === 'realm' && actor.id === rid || actor.kind === 'character' && c && actor.id === c.id && E.recognized(s,rid));
    var allowed = publicActor && p.powers.indexOf(kind) >= 0 && E.decision(s,rid,kind === 'ban' ? 'levy' : kind,at).allowed;
    return { allowed:!!allowed,reason:allowed ? null : 'no_mandate',basis:allowed ? [{ kind:'religious_office',id:E.row(s,rid).officeId }] : [],consents:[] };
  };
})();
