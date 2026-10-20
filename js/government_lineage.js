/* Settled local kingship: genealogy supplies eligibility, living interests
   supply recognition, and ordinary engine stores retain property and money. */
(function () {
  'use strict';
  var G = FB.governments, S = FB.governmentSelection, Q = FB.political;
  function managed(s, rid) { var form = G.forRealm(s, rid); return !!form && form.use.succession.selectionManaged === true && !form.use.succession.recognitionPolicy; }
  function accepted(s, rid, kind, pid) {
    var data = S.state(s, rid);
    return S.recognized(s, rid, pid) && data.recognition ? data.recognition.terms[kind] : 0;
  }
  function copyStrategy(slot, id) { return Object.assign({}, G.strategy(slot, id)); }
  var succession = G.register('succession', 'kin_acclamation', {
    selectionManaged:true,
    eligible:function (m, t, year) { return !!m && m.alive !== false && m.role !== 'consort' && year - m.born >= 16; },
    order:function (t, year, frontier) { return frontier; },
    candidates:function (s, rid) { return S.candidates(s, rid); },
    vacancy:function (s, rid, c) { return { allowed:!!S.state(s, rid), cause:c.cause, rulerGeneration:FB.realmRulerGeneration(s, rid) }; },
    accession:function (s, rid) { return { realmId:rid, memberId:S.winner(s, rid), rulerGeneration:FB.realmRulerGeneration(s, rid) }; },
    refresh:function () { return true; }
  });
  G.register('consent', 'local_reserved', {
    local:function (s, rid, c) { return S.recognized(s, rid, c.provinceId); },
    decision:function (s, rid, c) {
      var p = S.profile(s, rid), okay = S.recognized(s, rid, c.scope && c.scope.provinceId);
      var base = G.strategy('consent', 'delegated').decision(s, rid, c);
      if (!p || !okay) return { allowed:false, reason:'local_recognition_required', required:[], approvals:{} };
      if (p.reserved.indexOf(c.operation) < 0) return base;
      var rows = S.constituency(s, rid).filter(function (m) { return m.active; }), approvals = {};
      var data = S.state(s, rid);
      rows.forEach(function (m) { approvals[m.id] = data.recognition.consents.indexOf(m.id) >= 0; });
      var actor = c.actor, valid = actor && (actor.kind === 'realm' ? actor.id === rid :
        actor.kind === 'character' && (rid === 'player' && actor.id === s.player.charId || FB.realmIdForRulerCharacter(s, actor.id) === rid));
      return { allowed:!!valid && rows.every(function (m) { return approvals[m.id]; }),
        reason:valid && rows.every(function (m) { return approvals[m.id]; }) ? null : 'local_consent_withheld',
        required:rows.map(function (m) { return m.id; }), approvals:approvals };
    },
    constituency:function (s, rid, c) {
      var result = c.decision || this.decision(s, rid, c);
      return { kind:'local_interests', realmId:rid, operation:c.operation, members:result.required.slice() };
    }
  });
  var levy = copyStrategy('levy', 'feudal_levy');
  var baseHost = levy.fieldHost;
  levy.fieldHost = function (s, rid, c) {
    var territory = c.recruitment || FB.recruitmentTerritory(s, rid);
    if (!territory || !S.recognized(s, rid)) return 0;
    territory = Object.assign({}, territory, { eligible:territory.eligible.filter(function (pid) { return S.recognized(s, rid, pid); }) });
    if (!territory.eligible.length) return 0;
    return Math.floor(baseHost(s, rid, Object.assign({}, c, { recruitment:territory })) * accepted(s, rid, 'levy'));
  };
  var baseLevy = levy.countyBase, baseSettlementLevy = levy.settlementBase;
  levy.countyBase = function (s, rid, c) { return baseLevy(s, rid, c) * accepted(s, rid, 'levy', c.provinceId); };
  levy.settlementBase = function (s, rid, c) { return baseSettlementLevy(s, rid, c) * accepted(s, rid, 'levy', c.provinceId); };
  levy.subjectRate = function () { return 0; };
  levy.subjectContribution = function () { return 0; };
  levy.service = function () { return 0; };
  levy.mayCall = function (s, rid) { return Q.consent(s, { kind:'realm', id:rid }, 'levy', {}).allowed; };
  G.register('levy', 'local_obligations', levy);
  var revenue = copyStrategy('revenue', 'demesne_revenue');
  var baseIncome = revenue.realmIncome;
  revenue.realmIncome = function (s, rid, c) { return S.recognized(s, rid) ? baseIncome(s, rid, c) : 0; };
  revenue.buildingIncome = function (s, rid, c) {
    return c.amount * (c.holder && c.holder.kind === 'character' ? 1 : accepted(s, rid, 'revenue', c.provinceId));
  };
  var baseTax = revenue.countyBase, baseSettlementTax = revenue.settlementBase;
  revenue.countyBase = function (s, rid, c) { return baseTax(s, rid, c) * accepted(s, rid, 'revenue', c.provinceId); };
  revenue.settlementBase = function (s, rid, c) {
    var holder = FB.settlementHolder(s, c.provinceId, c.settlement);
    /* Household estate production survives a leadership vacancy. */
    return baseSettlementTax(s, rid, c) * (holder && holder.kind === 'character' ? 1 : accepted(s, rid, 'revenue', c.provinceId));
  };
  revenue.subjectContribution = function () { return 0; };
  revenue.remittance = function (s, rid, c) { return c.kind === 'realm' ? 0 : c.amount * accepted(s, rid, 'revenue', c.provinceId); };
  G.register('revenue', 'local_obligations', revenue);
  G.register('council', 'local_interests', {
    seats:function () { return []; }, eligible:function () { return false; }, vacancy:function () { return null; }
  });
  var ai = copyStrategy('ai', 'realm_decisions');
  ai.offices = function (s, rid) { return S.ai(s, rid); };
  ai.canNegotiate = function () { return false; };
  var campaign = ai.campaign;
  ai.campaign = function (s, rid, c) { if (S.recognized(s, rid)) return campaign(s, rid, c); return false; };
  G.register('ai', 'local_kingship', ai);
  G.register('ladder', 'local_standing', { bands:{
    1:{ promotion:{ route:'standing', next:2, cost:{ gold:20, prestige:10, piety:0 },
      paths:[{ wealth:120, prestige:40 }, { roles:['labor','craft','arms','clergy','cloister','learned'], years:3, prestige:25 }] } },
    2:{ succession:'personal', promotion:{ route:'standing', next:3, cost:{ gold:30, prestige:20, piety:0 },
      paths:[{ roles:['labor','craft','arms','clergy','cloister','learned'], years:6, prestige:60 }, { wealth:250, prestige:80 }] } },
    3:{ succession:'personal', promotion:null, maySeekCounty:false },
    4:{ succession:'personal', promotion:null, sitsInEstates:false },
    5:{ succession:'personal', promotion:null, sitsInEstates:false },
    6:{ succession:'personal', promotion:null, mayHoldCouncil:false },
    7:{ succession:'personal', promotion:null, mayHoldCouncil:false }
  } });

  var advance = FB.advanceRealmSuccession;
  FB.advanceRealmSuccession = function (s, rid, opts) {
    if (!managed(s, rid) || opts && opts.selectionCommit) return advance(s, rid, opts);
    /* Household succession releases this court before political accession. */
    if (rid === 'player') return null;
    var actor = { kind:'realm', id:rid }, data = S.state(s, rid);
    if (!data) return null;
    var q = S.quote(s, rid, { action:'open', actor:actor, cause:opts && opts.cause || 'death' });
    if (q.allowed) S.apply(s, q);
    if (!data.vacancy || data.vacancy.status === 'resolved') return null;
    /* Death opens one round. Seasonal retries are bounded by lastPeriod. */
    S.ai(s, rid);
    var target = S.state(s, 'player') === data ? 'player' : rid;
    return data.vacancy.status === 'resolved' ? s.realms[target].succession.members[data.vacancy.accessionId] : null;
  };
  var setGovernment = FB.authoritySetGovernment;
  FB.authoritySetGovernment = function (s, rid, id, options) {
    if (managed(s, rid) && !(options && options.selectionCommit)) return false;
    return setGovernment(s, rid, id);
  };
  /* Realm identity follows the political institution; compact kin identities
     survive a protagonist adopting and later leaving its public leadership. */
  function remap(value, from, to) {
    if (!value || typeof value !== 'object') return;
    if ((value.kind === 'realm' || value.type === 'realm') && value.id === from) value.id = to;
    ['realmId','patronRealmId','federateRealmId','institutionId','liege','realm','owner','holderId','beneficiaryRealmId','payerRealmId'].forEach(function (key) {
      if (value[key] === from) value[key] = to;
    });
    Object.keys(value).forEach(function (key) { remap(value[key], from, to); });
  }
  var absorb = FB.absorbRealm;
  FB.absorbRealm = function (s, rid, c) {
    if (!managed(s, rid)) return absorb(s, rid, c);
    var row = s.authority.governments[rid], t = s.realms[rid].succession, gen = t.rulerGeneration;
    if (!absorb(s, rid, c)) return false;
    s.realms.player.succession = t;
    s.realms.player.ruler.generation = gen;
    t.playerDynasty = true;
    s.authority.governments.player = row;
    delete s.authority.governments[rid];
    delete s.realms[rid].succession;
    [s.authority, s.chars, s.settlementLordships, s.localInstitutions, s.stories].forEach(function (table) { remap(table, rid, 'player'); });
    FB.rebuildRulerIndex(s); G.invalidate();
    if (FB.invalidateSettlementLordships) FB.invalidateSettlementLordships(s);
    return true;
  };
  S.releasePlayerCourt = function (s, outgoing, livingAbdication) {
    if (!managed(s, 'player') || !S.state(s, 'player')) return null;
    var row = s.authority.governments.player, data = row.selection, r = s.realms.player;
    var rid = data.originRealmId;
    if (rid === 'player' || s.realms[rid] && s.realms[rid].alive) return null;
    /* Household money remains personal. A new public account starts empty;
       principals can acclaim without a paid round of negotiations. */
    s.realms[rid] = r; r.id = rid; delete s.realms.player;
    var publicTreasury = s.start && s.start.publicTreasury;
    if (publicTreasury && publicTreasury.realmId === 'player' && publicTreasury.retirement === null)
      publicTreasury.realmId = rid;
    s.authority.governments[rid] = row; delete s.authority.governments.player;
    Object.keys(s.owner).forEach(function (pid) {
      if (s.owner[pid] === 'player') s.owner[pid] = rid;
      if (s.holder[pid] === 'player') s.holder[pid] = rid;
    });
    Object.keys(s.realms).forEach(function (id) { if (s.realms[id].liege === 'player') s.realms[id].liege = rid; });
    [s.authority, s.chars, s.settlementLordships, s.localInstitutions, s.armies, s.stories].forEach(function (table) { remap(table, 'player', rid); });
    if (FB.remapWarRealm) FB.remapWarRealm(s, 'player', rid);
    if (s.realmTech && s.realmTech.player) { s.realmTech[rid] = s.realmTech.player; delete s.realmTech.player; }
    if (FB.treasuryCreateRealm) FB.treasuryCreateRealm(s, rid, null, 0);
    if (r.treasury && s.treasuryAccounting) {
      if (!FB.treasurySeparated(s,rid)) r.treasury.militaryAccrued += s.treasuryAccounting.playerMilitary || 0;
      s.treasuryAccounting.playerMilitary = 0;
    }
    ['armyDown','armyDownSurvival','armyDetachmentDown','armyCohorts'].forEach(function (key) {
      if (s[key] && Object.prototype.hasOwnProperty.call(s[key], 'player')) {
        s[key][rid] = s[key].player; delete s[key].player;
      }
    });
    if (s.armyLogistics && s.armyLogistics.purses && s.armyLogistics.purses.player) {
      s.armyLogistics.purses[rid] = s.armyLogistics.purses.player; delete s.armyLogistics.purses.player;
    }
    s.player.provs = []; s.player.liege = null;
    if (livingAbdication) FB.setPlayerTier(s, 2, { attachLiege:false });
    var m = r.succession.members[r.succession.rulerMemberId];
    if (m && !livingAbdication) { m.alive = false; m.died = s.date.year; }
    delete r.succession.playerDynasty;
    FB.rebuildRulerIndex(s); FB.invalidateRealmCache(); G.invalidate();
    if (FB.invalidateSettlementLordships) FB.invalidateSettlementLordships(s);
    FB.advanceRealmSuccession(s, rid, { cause:livingAbdication ? 'abdication' : 'death' });
    return rid;
  };
  var power = Q.power;
  Q.power = function (s, actor, kind, context) {
    var result = power(s, actor, kind, context), rid = actor && actor.kind === 'realm' ? actor.id :
      actor && actor.kind === 'character' ? actor.id === s.player.charId && FB.station.rulesRealm(s.player, s) ? 'player' :
        FB.realmIdForRulerCharacter(s, actor.id) : null;
    if (!rid || !managed(s, rid)) return result;
    /* Independent warrants/customary rights keep their own legal basis. */
    if (result.allowed && result.basis.some(function (basis) {
      if (basis.kind === 'custom') {
        var right = (s.authority.rights || []).filter(function (row) { return row.id === basis.id; })[0];
        return right && right.basis !== 'possession';
      }
      return ['appointment','federate_service','legacy_command','federate_pay'].indexOf(basis.kind) >= 0;
    })) return result;
    if (!S.recognized(s, rid, kind === 'ban' ? null : context && context.provinceId))
      return { allowed:false, reason:'local_recognition_required', basis:[], consents:[] };
    return result.allowed ? Object.assign({}, result, { basis:[{ kind:'local_acclamation', id:rid }] }) : result;
  };
})();
