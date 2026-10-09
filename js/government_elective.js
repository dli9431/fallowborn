/* Elective crowns compose the shared selection owner. Public accounts and
   ordinary people retain their identities through political succession. */
(function () {
  'use strict';
  var G = FB.governments, S = FB.governmentSelection, Q = FB.political;
  FB.electiveCrown = function (s, rid) {
    var form = G.forRealm(s, rid);
    return !!(form && form.use.succession.publicCrown);
  };
  G.register('succession', 'crown_election', Object.assign({}, G.strategy('succession', 'kin_acclamation'), {
    publicCrown:true, repairEmpty:false
  }));
  function interim(s, rid) {
    var p = S.profile(s, rid), data = S.state(s, rid);
    return !!(p && p.procedure && data && data.vacancy && data.vacancy.status !== 'resolved');
  }
  function duty(s, rid, kind) {
    var data = S.state(s, rid), p = S.profile(s, rid);
    return data && data.recognition ? data.recognition.terms[kind] : p ? p.terms[kind] : 0;
  }
  function receiptsAllowed(s, rid) {
    var p = S.profile(s, rid);
    return S.recognized(s, rid) || interim(s, rid) && p.procedure.interimRevenue;
  }
  function defensive(s, rid) {
    return FB.realmWars(s, rid).some(function (war) {
      return war.defender === rid || (war.defenders || []).indexOf(rid) >= 0;
    });
  }
  var levy = Object.assign({}, G.strategy('levy', 'feudal_levy'));
  ['countyBase','settlementBase','fieldHost'].forEach(function (method) {
    var baseline = levy[method];
    levy[method] = function (s, rid, context) {
      var p = S.profile(s, rid);
      if (!S.recognized(s, rid) && !(interim(s, rid) && p.procedure.defensiveLevy && defensive(s, rid))) return 0;
      return Math.floor(baseline(s, rid, context) * duty(s, rid, 'levy'));
    };
  });
  levy.mayCall = function (s, rid) {
    var p = S.profile(s, rid);
    return Q.consent(s, { kind:'realm', id:rid }, 'levy', {}).allowed ||
      interim(s, rid) && p.procedure.defensiveLevy && defensive(s, rid);
  };
  G.register('levy', 'elective_service', levy);
  var revenue = Object.assign({}, G.strategy('revenue', 'demesne_revenue'));
  ['countyBase','settlementBase'].forEach(function (method) {
    var baseline = revenue[method];
    revenue[method] = function (s, rid, context) {
      var holder = context.settlement !== undefined && FB.settlementHolder(s, context.provinceId, context.settlement);
      if (holder && holder.kind === 'character') return baseline(s, rid, context);
      return receiptsAllowed(s, rid)
        ? baseline(s, rid, context) * duty(s, rid, 'revenue') : 0;
    };
  });
  revenue.buildingIncome = function (s, rid, context) {
    return context.amount * (context.holder && context.holder.kind === 'character' ? 1 :
      receiptsAllowed(s, rid) ? duty(s, rid, 'revenue') : 0);
  };
  G.register('revenue', 'elective_receipts', revenue);
  var ai = Object.assign({}, G.strategy('ai', 'realm_decisions'));
  ai.offices = function (s, rid) { return S.ai(s, rid); };
  var campaign = ai.campaign;
  ai.campaign = function (s, rid, context) { return S.recognized(s, rid) && campaign(s, rid, context); };
  G.register('ai', 'elective_selection', ai);
  /* Conversion is explicit and requires an existing living constituency.
     Old campaigns never gain delegates, candidates or funds while loading. */
  FB.electiveConversionTargets = function (s, rid) {
    var r = s.realms[rid], row = s.authority && s.authority.governments[rid];
    if (!r || !r.alive || row && row.selection) return [];
    var ruler = FB.realmRulerCharacterSnapshot(s, rid);
    return Object.keys(FBDATA.governmentForms).filter(function (id) {
      var ids = G.strategyIds(id), strategy = ids && G.strategy('succession', ids.succession);
      if (!strategy || !strategy.publicCrown || G.problems(id).length) return false;
      var pool = FBDATA.governmentForms[id].selectionProfile.candidatePool;
      return ruler && (!pool.cultures.length || pool.cultures.indexOf(ruler.culture) >= 0) &&
        (!pool.religions.length || pool.religions.indexOf(ruler.religion) >= 0);
    }).sort();
  };
  FB.electiveConversionQuote = function (s, actor, rid, formId) {
    var realm = s.realms[rid], saved = s.authority && s.authority.governments[rid];
    var def = FBDATA.governmentForms[formId], p = def && def.selectionProfile;
    var ruler = realm && FB.realmRulerCharacterSnapshot(s, rid);
    var institutionDefs = FB.localInstitutionDefinitions(s), chosen = [];
    var validProfile = p && p.candidatePool && p.procedure && !S.profileFaults(p).length;
    if (validProfile) p.members.forEach(function (member) {
      if (['capital_elite','capital_clergy'].indexOf(member.principal) < 0) return;
      var id = Object.keys(institutionDefs).sort().filter(function (id) {
        var d = institutionDefs[id];
        return realm && d.provinceId === realm.capital &&
          d.kind === (member.principal === 'capital_elite' ? 'council' : 'congregation');
      })[0];
      var row = id && s.localInstitutions && s.localInstitutions[id];
      var c = row && s.chars[row.representativeId];
      if (c && !c.dead && !c.captive && !c.imprisoned && !c.exiled && !FB.justiceCustodyOf(s, c.id)) chosen.push(id);
    });
    var validActor = actor && (actor.kind === 'realm' && actor.id === rid ||
      actor.kind === 'character' && ruler && actor.id === ruler.id);
    var q = { realmId:rid, formId:formId, actor:actor ? JSON.parse(JSON.stringify(actor)) : null, cost:0,
      allowed:false, reason:null, stamp:null };
    q.reason = !realm || !realm.alive || realm.liege || !saved || !realm.succession || !validActor
      ? FB.T('Only the current sovereign can review this conversion.') :
      saved.selection || FB.electiveConversionTargets(s, rid).indexOf(formId) < 0 || !validProfile
        ? FB.T('This court cannot adopt the selected elective profile.') :
      !ruler || ruler.dead || ruler.captive || ruler.imprisoned || ruler.exiled || FB.justiceCustodyOf(s, ruler.id) ||
        ruler.unfree || s.date.year - ruler.born < p.eligibility.minAge || p.eligibility.sex && p.eligibility.sex !== ruler.sex ||
        p.candidatePool.cultures.length && p.candidatePool.cultures.indexOf(ruler.culture) < 0 ||
        p.candidatePool.religions.length && p.candidatePool.religions.indexOf(ruler.religion) < 0 ||
        p.candidatePool.excludedRoles.indexOf(ruler.role) >= 0 || p.members.some(function (m) {
          return FB.skillSnapshot(s,ruler,'mar') < m.minimumMartial || p.terms.levy > m.maximumLevy || p.terms.revenue > m.maximumRevenue;
        }) || p.eligibility.officeId && !(s.authority.appointments || []).some(function (row) {
          return row.officeId === p.eligibility.officeId && row.institutionId === rid && row.status === 'active' &&
            row.holder.kind === 'character' && row.holder.id === ruler.id && (row.endTurn === null || row.endTurn > s.turn);
        })
        ? FB.T('The current ruler does not meet the target crown’s qualifications.') :
      chosen.length !== p.members.length || chosen.some(function (id) { return FB.countyPopularSupport(s, institutionDefs[id].provinceId) < 0; })
        ? FB.T('The target profile needs its existing living capital delegates and nonnegative local support.') :
      !realm.treasury || realm.treasury.retired
        ? FB.T('The public crown requires an existing active realm treasury.') : null;
    q.allowed = !q.reason;
    q.stamp = JSON.stringify([s.turn, actor, formId, def, realm, saved, ruler, s.localInstitutions,
      chosen.map(function (id) { return s.chars[s.localInstitutions[id].representativeId]; }),
      s.owner, s.holder, realm && FB.realmHeldCounties(s,rid).map(function (pid) { return [pid,FB.countyPopularSupport(s,pid)]; }),
      s.authority.rights, s.authority.contracts, s.authority.appointments,
      s.player.holdings, s.player.gold, s.settlementLordships]);
    return q;
  };
  FB.electiveConvert = function (s, reviewed) {
    if (!reviewed) return false;
    var q = FB.electiveConversionQuote(s, reviewed.actor, reviewed.realmId, reviewed.formId);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    if (!FB.authoritySetGovernment(s, q.realmId, q.formId, { selectionCommit:true })) return false;
    return S.initialize(s, q.realmId);
  };
  var power = Q.power;
  Q.power = function (s, actor, kind, context) {
    var result = power(s, actor, kind, context), rid = actor && actor.kind === 'realm' ? actor.id :
      actor && actor.kind === 'character' ? FB.realmIdForRulerCharacter(s, actor.id) : null;
    var pid = context && context.provinceId;
    if (!result.allowed && actor && actor.kind === 'realm' && rid && FB.electiveCrown(s, rid) && interim(s, rid) &&
        ['peace','revenue'].indexOf(kind) >= 0 && pid && s.owner[pid] === rid &&
        S.profile(s, rid).procedure.interimRevenue) {
      return { allowed:true, reason:null, basis:[{ kind:'interim_administration', id:rid }], consents:[] };
    }
    if (!result.allowed && actor && actor.kind === 'realm' && rid && FB.electiveCrown(s, rid) && interim(s, rid) &&
        kind === 'ban' && (!pid || s.owner[pid] === rid) && S.profile(s,rid).procedure.defensiveLevy && defensive(s,rid))
      return { allowed:true, reason:null, basis:[{ kind:'interim_defense', id:rid }], consents:[] };
    return result;
  };
  /* The normal seasonal household calculation explicitly routes its public
     portion here. No private holding or wage is credited to this account. */
  FB.electivePublicSeason = function (s, amount, taxParts) {
    if (!FB.electiveCrown(s, 'player')) return false;
    var account = s.realms.player.treasury;
    if (!account || account.retired) return false;
    var privateFiscal = FB.settlementActorFiscal(s, { kind:'character', id:s.player.charId });
    var privateOffices = taxParts ? taxParts.bishopric + taxParts.abbey : 0;
    s.player.gold += privateFiscal.tax + privateFiscal.tolls + privateFiscal.national -
      privateFiscal.upkeep - privateFiscal.duesOut + privateOffices;
    /* NPC costs accrued before accession stay payable once. Subsequent player
       military costs are paid daily and must never join this accrued balance. */
    account.gold += amount - privateOffices - Math.max(0, account.militaryAccrued || 0);
    account.militaryAccrued = 0;
    account.lastSettledSeason = Math.floor(s.turn / 90);
    return true;
  };
})();
