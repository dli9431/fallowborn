/* Civic strategy composition and mutation boundaries. Historical identity
   is supplied exclusively by declarations and the saved profile reference. */
(function () {
  'use strict';
  var G = FB.governments, V = FB.civicGovernment, C = G.support, warCommit = null, peaceCommit = null;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function equal(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function compose(slot,id,patch) { return Object.assign({},G.strategy(slot,id),patch); }
  function civic(s,rid) { var f = G.forRealm(s,rid); return !!(f && f.use.succession.civicLeadership); }
  G.register('holders','civic_holders',compose('holders','direct',{
    conquest:function (s,rid) { return rid; }, vacancy:function (s,rid) { return rid; }
  }));
  G.register('succession','civic_magistracies',{
    civicLeadership:true, institutionalProperty:true, delegatedLeadership:true, repairEmpty:false,
    eligible:function () { return false; }, order:function () { return []; },
    candidates:function (s,rid) { var p = V.profile(s,rid); return p ? V.candidates(s,rid,p.offices[0].id) : []; },
    vacancy:function (s,rid,c) { return { allowed:false,cause:c.cause,rulerGeneration:FB.realmRulerGeneration(s,rid) }; },
    accession:function () { return null; }, refresh:function () { return false; }
  });
  G.register('territory','civic_territory',compose('territory','fixed',{
    profile:function () { return { movingCourt:false,holdsCounties:true,allowsTitleGrowth:false }; },
    defeat:function () { return { dissolve:false }; }
  }));
  G.register('consent','civic_consent',{
    local:function () { return false; },
    decision:function (s,rid,c) {
      var p = V.profile(s,rid), actor = c.actor, chief = V.chief(s,rid), row = C.row(s,rid);
      var local = !!actor && actor.kind === 'character' && s.chars[actor.id] && !s.chars[actor.id].dead && row &&
        row.scopes.indexOf(actor.id === s.player.charId ? s.player.provinceId : s.chars[actor.id].homeProvinceId) >= 0;
      if (local && ['household','defence','levy'].indexOf(c.operation) >= 0 && V.controlled(s,rid))
        return { allowed:true,reason:null,required:[],approvals:{} };
      var valid = !!p && !!actor && (actor.kind === 'realm' && actor.id === rid || actor.kind === 'character' && V.row(s,rid).offices.some(function (o) {
        var c = V.incumbent(s,rid,o.id); return !!c && c.id === actor.id;
      }));
      var result = valid ? V.decision(s,rid,c.operation,c.scope) : { allowed:false,reason:'no_mandate' };
      if (valid && p.consent[c.operation] !== undefined && c.operation !== 'war') {
        // Public commitments are made by the owner transaction after an exact
        // review, never by a generic household or territorial shortcut.
        result = { allowed:false,reason:'civic_review' };
      }
      return { allowed:result.allowed,reason:result.reason,required:p && p.consent[c.operation] !== undefined ? C.members(s,rid).map(function (m) { return m.id; }) : [],approvals:{} };
    },
    constituency:function (s,rid,c) { return { kind:'civic_interests',realmId:rid,operation:c.operation,members:(c.decision.required || []).slice() }; }
  });
  var levy = G.strategy('levy','feudal_levy'), revenue = G.strategy('revenue','demesne_revenue');
  G.register('levy','civic_service',compose('levy','feudal_levy',{
    countyBase:function (s,rid,c) { return V.controlled(s,rid) ? levy.countyBase(s,rid,c) * C.profile(s,rid).obligations.levyRate : 0; },
    settlementBase:function (s,rid,c) { return V.controlled(s,rid) ? levy.settlementBase(s,rid,c) * C.profile(s,rid).obligations.levyRate : 0; },
    fieldHost:function (s,rid,c) { return V.controlled(s,rid) ? Math.min(C.profile(s,rid).obligations.maxLevy,levy.fieldHost(s,rid,c)) : 0; },
    mayCall:function (s,rid) { return V.controlled(s,rid) && V.decision(s,rid,'levy').allowed; },
    subjectRate:function () { return 0; },subjectContribution:function () { return 0; },
    service:function (s,rid,c) { return levy.service(s,rid,c) * C.profile(s,rid).obligations.levyRate; }
  }));
  G.register('revenue','civic_receipts',compose('revenue','demesne_revenue',{
    countyBase:function (s,rid,c) { return V.controlled(s,rid) ? revenue.countyBase(s,rid,c) * C.profile(s,rid).obligations.revenueRate : 0; },
    settlementBase:function (s,rid,c) { return V.controlled(s,rid) ? revenue.settlementBase(s,rid,c) * C.profile(s,rid).obligations.revenueRate : 0; },
    realmIncome:function (s,rid,c) { var r = V.row(s,rid); return V.controlled(s,rid) ? revenue.realmIncome(s,rid,c) +
      (r && r.dues && r.dues.endTurn > s.turn ? r.dues.amount : 0) : 0; },
    subjectContribution:function () { return 0; },remittance:function () { return 0; },
    loanAssignment:function () { return 0; },fiscalAssignment:function () { return 0; }
  }));
  G.register('council','civic_council',{
    seats:function () { return []; },eligible:function () { return false; },vacancy:function () { return null; }
  });
  G.register('diplomacy','civic_diplomacy',compose('diplomacy','territorial_diplomacy',{
    subjectRelation:function () { return { kind:'civic_institution',liegeId:null }; },
    goalAllowed:function (s,rid,c) { return V.decision(s,rid,'war',{ causes:[c.cause] }).allowed; }
  }));
  G.register('ai','civic_decisions',compose('ai','realm_decisions',{
    goals:function () { return { warChance:0,allianceChance:0 }; },
    campaign:function (s,rid) { V.tick(s,rid); return false; },
    offices:function (s,rid) { V.tick(s,rid); return false; },
    raid:function () { return false; },breakawayChance:function () { return 0; },canNegotiate:function () { return false; }
  }));
  var bands = {}, base = G.strategy('ladder','local_service');
  for (var i = 0; i < FB.station.bandCount; i++) bands[i] = Object.assign({},base.bands[i]);
  bands[1].promotion = { route:'standing',next:2,cost:{ gold:10,prestige:5,piety:0 },paths:[{ roles:['civic','craft','labor','arms'],years:2,prestige:10 },{ wealth:100,prestige:20 }] };
  bands[2].promotion = { route:'standing',next:3,cost:{ gold:20,prestige:10,piety:0 },paths:[{ roles:['civic','craft','arms'],years:4,prestige:30 }] };
  // Realm rank describes an institution's size, independently of the personal
  // station of a magistrate. Never collapse a civic polity's public account.
  G.register('ladder','civic_careers',{ bands:bands });

  var transfer = FB.transferProvince;
  FB.transferProvince = function (s,pid,toRealm) {
    var rid = s.holder[pid];
    if (civic(s,rid) && V.row(s,rid)) {
      if (!s.realms[toRealm] || !s.realms[toRealm].alive || s.owner[pid] === toRealm) return;
      s.owner[pid] = toRealm; V.row(s,rid).revision++; FB.invalidateRealmCache();
      return;
    }
    var result = transfer.apply(FB,arguments);
    if (civic(s,toRealm) && V.row(s,toRealm) && s.holder[pid] === toRealm) {
      var electorate = C.row(s,toRealm);
      if (electorate.scopes.indexOf(pid) < 0) {
        electorate.scopes.push(pid); electorate.members.forEach(function (m) { m.scope.push(pid); });
        electorate.revision++; V.row(s,toRealm).revision++;
      }
    }
    return result;
  };
  var setForm = FB.authoritySetGovernment;
  FB.authoritySetGovernment = function (s,rid,id) {
    var target = FBDATA.governmentForms[id];
    var succession = target && G.strategy('succession',target.succession);
    if (civic(s,rid) || succession && succession.civicLeadership) return false;
    return setForm.apply(FB,arguments);
  };
  V.setFormReviewed = setForm;
  var registerWar = FB.registerOrdinaryWar;
  FB.registerOrdinaryWar = function (s,rid,war) {
    var attacker = rid === 'player' && war && war.defending ? war.enemy : rid;
    if (civic(s,attacker) && (!warCommit || warCommit.state !== s || warCommit.realmId !== attacker ||
        !equal(war.objectives || [war.casus],warCommit.causes))) return null;
    return registerWar.apply(FB,arguments);
  };
  V.warQuote = function (s,rid,terms) {
    if (!V.row(s,rid)) return null;
    var t = copy(terms || {}), decision = V.decision(s,rid,'war',t), reason = decision.reason;
    var valid = Array.isArray(t.causes) && t.causes.length > 0 && t.causes.length <= 8 && Object.keys(t).length === 1 &&
      t.causes.every(function (c) { return c && ['aggression','customary','fabricated','dejure'].indexOf(c.type) >= 0 &&
        typeof c.target === 'string' && FB.world.byId[c.target] && s.realms[c.enemy] && s.realms[c.enemy].alive && c.enemy !== rid &&
        c.enemy === t.causes[0].enemy && FB.warTargetDefender(s,rid,c.target) === c.enemy; });
    var declaration = valid ? FB.warDeclarationPreview(s,rid,t.causes,{ frontier:FB.realmTerritory(s,rid),rights:Object.create(null) }) : null;
    if (!valid || !declaration || !declaration.valid || declaration.unlawful) reason = reason || 'outside_scope';
    return { realmId:rid,terms:t,stamp:V.stamp(s,rid),decision:decision,declaration:declaration,
      partner:valid ? { id:t.causes[0].enemy,generation:FB.realmRulerGeneration(s,t.causes[0].enemy),
        government:copy(FB.political.government(s,{ kind:'realm',id:t.causes[0].enemy })),strength:FB.realmStrength(s,t.causes[0].enemy) } : null,
      allowed:!reason,reason:reason,charge:0 };
  };
  V.launchWar = function (s,reviewed) {
    var q = reviewed && V.warQuote(s,reviewed.realmId,reviewed.terms);
    if (!q || !q.allowed || !equal(q,reviewed)) return false;
    var causes = q.terms.causes, war;
    warCommit = { state:s,realmId:q.realmId,causes:causes };
    try { war = FB.registerOrdinaryWar(s,q.realmId,{ enemy:causes[0].enemy,target:causes[0].target,
      casus:causes[0],objectives:causes,legacy:false }); }
    finally { warCommit = null; }
    if (!war) return false;
    FB.recordWarDeclaration(s,war,q.declaration); V.row(s,q.realmId).revision++;
    return true;
  };
  var settleWar = FB.settleOrdinaryWar;
  FB.settleOrdinaryWar = function (s,id,result) {
    var w = FB.ordinaryWarById(s,id);
    if (w && result === 'white_peace' && [w.attacker,w.defender].some(function (rid) { return civic(s,rid); }) &&
        (!peaceCommit || peaceCommit.state !== s || peaceCommit.warId !== id)) return false;
    return settleWar.apply(FB,arguments);
  };
  V.peaceQuote = function (s,rid,terms) {
    var w = terms && FB.ordinaryWarById(s,terms.warId), p = V.profile(s,rid);
    if (!p || !w || [w.attacker,w.defender].indexOf(rid) < 0) return null;
    var t = copy(terms), decision = V.decision(s,rid,'treaty',t), other = w.attacker === rid ? w.defender : w.attacker;
    var counterpart = civic(s,other) ? V.decision(s,other,'treaty',t) : C.isDelegated(s,other) ?
      C.assentQuote(s,other,'treaty',{ warId:w.id,kind:'white_peace' }) : { allowed:!s.realms[other].alive || w.seasons >= 4 || FB.realmStrength(s,other) <= FB.realmStrength(s,rid) * 1.5 };
    var reason = decision.reason || (w.status !== 'active' || Object.keys(t).length !== 1 ? 'outside_scope' : !counterpart.allowed ? 'partner_withheld' : null);
    return { realmId:rid,terms:t,stamp:V.stamp(s,rid),war:copy(w),partnerId:other,
      strengths:{ local:FB.realmStrength(s,rid),partner:FB.realmStrength(s,other) },
      partnerGovernment:copy(FB.political.government(s,{ kind:'realm',id:other })),partnerCivic:civic(s,other) ? V.stamp(s,other) : null,
      partnerGeneration:FB.realmRulerGeneration(s,other),counterpart:copy(counterpart),decision:decision,allowed:!reason,reason:reason,charge:0 };
  };
  V.makePeace = function (s,reviewed) {
    var q = reviewed && V.peaceQuote(s,reviewed.realmId,reviewed.terms);
    if (!q || !q.allowed || !equal(q,reviewed)) return false;
    var partner = C.isDelegated(s,q.partnerId) && C.row(s,q.partnerId), old = partner && { serial:partner.serial,decisions:copy(partner.decisions) };
    if (partner && !C.authorization(s,q.partnerId,'treaty',{ warId:q.war.id,kind:'white_peace' })) C.assent(s,q.counterpart);
    var applied;
    peaceCommit = { state:s,warId:q.war.id };
    try { applied = FB.settleOrdinaryWar(s,q.war.id,'white_peace'); }
    finally { peaceCommit = null; }
    if (!applied && partner) { partner.serial = old.serial; partner.decisions = old.decisions; }
    if (applied) V.row(s,q.realmId).revision++;
    return !!applied;
  };
})();
