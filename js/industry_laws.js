/* Targeted operating laws: pure reviews, council approval and paid permissions. */
(function () {
  'use strict';
  const L = FB.industryLaws = {};
  const own = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  const plain = function (o) { return !!o && typeof o === 'object' && !Array.isArray(o); };
  const copy = function (o) { return JSON.parse(JSON.stringify(o)); };
  const same = function (a, b) { return FB.mods.fingerprint(a) === FB.mods.fingerprint(b); };
  function fields(o, keys) {
    return plain(o) && Object.keys(o).every(function (k) { return keys.indexOf(k) >= 0; });
  }
  function integer(n, min, max) { return Number.isSafeInteger(n) && n >= min && n <= max; }
  function money(n) { return typeof n === 'number' && isFinite(n) && n >= 0 && n <= 10000; }
  function ledger(s) { return s.industryLaws || {schema:1, laws:[], permits:[], choices:[]}; }
  function writable(s) {
    if (!s.industryLaws) s.industryLaws = {schema:1, laws:[], permits:[], choices:[]};
    return s.industryLaws;
  }
  function controller(s, pid) { return s.holder && s.holder[pid] || s.owner && s.owner[pid] || null; }
  function realm(s, rid) { return s.realms && s.realms[rid]; }
  function account(s, rid) {
    return FB.treasuryPublicAccountSnapshot(s, rid);
  }
  L.definitionFaults = function (table, data) {
    const errors = [];
    data = data || FBDATA;
    if (!plain(table) || Object.keys(table).length > 64) return ['industryLaws must be a table of at most 64 definitions.'];
    Object.keys(table).forEach(function (id) {
      const d = table[id];
      if (!/^[a-z][a-z0-9_]{0,79}$/.test(id) || !fields(d,
          ['schema','motionId','bookmarkId','provinceId','enterpriseType','minYear','maxYear','mode','fee','permitDays','durationDays','transitionDays','exemptions','offense']) ||
          d.schema !== 1 || !own(data.localCouncilMotions, d.motionId) ||
          !own(data.bookmarks, d.bookmarkId) || d.enterpriseType !== 'market_stall_business' ||
          !own(data.enterprises, d.enterpriseType) ||
          !integer(d.minYear, 1, 3000) || !integer(d.maxYear, d.minYear, 3000) ||
          ['license','prohibition'].indexOf(d.mode) < 0 || !money(d.fee) ||
          d.mode === 'prohibition' && d.fee !== 0 ||
          !integer(d.durationDays, 1, 3600) || !integer(d.permitDays, 1, d.durationDays) ||
          !integer(d.transitionDays, 0, d.durationDays) ||
          !Array.isArray(d.exemptions) || d.exemptions.length > 16) {
        errors.push('Invalid industryLaws.' + id); return;
      }
      const raw = data.bookmarks[d.bookmarkId];
      if (!FB.bookmarkRevisions(d.bookmarkId, raw).some(function (world) {
        return (world.provinces || []).some(function (p) { return p.id === d.provinceId && !p.wasteland; });
      })) errors.push('Unknown industry-law jurisdiction: ' + id);
      if (Object.keys(table).some(function (other) { return other !== id && table[other] && table[other].motionId === d.motionId; }))
        errors.push('Duplicate industry-law motion: ' + id);
      d.exemptions.forEach(function (e) {
        if (!fields(e, ['kind','id','fee','permission']) ||
            e.kind !== 'home_province' || typeof e.id !== 'string' || !e.id ||
            !money(e.fee) || e.fee > d.fee || typeof e.permission !== 'boolean' ||
            e.kind === 'home_province' && !FB.bookmarkRevisions(d.bookmarkId, raw).some(function (world) {
              return (world.provinces || []).some(function (p) { return p.id === e.id && !p.wasteland; });
            })) errors.push('Invalid industry-law exemption: ' + id);
      });
      if (own(d, 'offense') && (!fields(d.offense, ['id','penalty','amount']) ||
          typeof d.offense.id !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/.test(d.offense.id) ||
          d.offense.penalty !== 'fine' || !money(d.offense.amount))) errors.push('Invalid industry-law offense: ' + id);
      const motion = data.localCouncilMotions[d.motionId];
      if (Object.keys(motion.fx || {}).length) errors.push('Industry-law motions cannot also grant ordinance effects: ' + id);
    });
    return errors;
  };
  L.forMotion = function (motionId) {
    const table = FBDATA.industryLaws || {};
    for (const id in table) if (table[id].motionId === motionId) return id;
    return null;
  };
  L.lifecycle = function (s, law) {
    if (law.repealedTurn !== null) return 'repealed';
    if (s.turn >= law.endTurn) return 'expired';
    const r = realm(s, law.issuer.realmId);
    if (!r || !r.alive || controller(s, law.terms.provinceId) !== law.issuer.realmId) return 'suspended';
    return 'active';
  };
  function applicable(s, d) {
    return s.start && s.start.id === d.bookmarkId && s.date.year >= d.minYear &&
      s.date.year <= d.maxYear && !!FB.world.byId[d.provinceId];
  }
  L.relevant = function (s, e) {
    return Object.keys(FBDATA.industryLaws || {}).some(function (id) {
      const d = FBDATA.industryLaws[id];
      return e.type === d.enterpriseType && e.provinceId === d.provinceId && applicable(s, d);
    }) || ledger(s).laws.some(function (r) {
      return e.type === r.terms.enterpriseType && e.provinceId === r.terms.provinceId;
    });
  };
  function council(s, d) {
    const seat = FB.localCouncilOf(s), p = s.player, c = s.chars[p.charId];
    const rid = controller(s, d.provinceId), r = realm(s, rid);
    return !!(seat && applicable(s, d) && seat.provinceId === d.provinceId &&
      seat.holderCharId === p.charId && !p.dead && c && !c.dead &&
      p.provinceId === seat.provinceId && FB.station.isFreeUnlanded(p, s) &&
      (FB.professionHasRole(p.profession, ['trading','craft']) || p.profession === 'administration') &&
      (seat.nextMotionTurn || 0) <= s.turn && r && r.alive && account(s, rid));
  }
  L.quoteMotion = function (s, definitionId, repealId) {
    const d = FBDATA.industryLaws && FBDATA.industryLaws[definitionId];
    if (!d) return null;
    const laws = ledger(s).laws;
    const target = repealId && laws.filter(function (r) { return r.id === repealId && r.definitionId === definitionId; })[0];
    const live = laws.some(function (r) { return r.definitionId === definitionId && r.repealedTurn === null && s.turn < r.endTurn; });
    const affected = (s.player.enterprises || []).filter(function (e) {
      return e.type === d.enterpriseType && e.provinceId === d.provinceId;
    }).length;
    const ready = council(s, d) && (repealId ? !!target && target.repealedTurn === null : !live && laws.length < 256 && affected <= 512);
    return {schema:1, kind:'industry_motion', definitionId:definitionId, repealId:repealId || null,
      ready:!!ready, actorId:s.player.charId, turn:s.turn, terms:copy(d),
      issuer:{kind:'local_council', provinceId:d.provinceId, realmId:controller(s, d.provinceId),
        holderCharId:s.player.charId},
      signature:FB.mods.fingerprint({turn:s.turn, date:s.date, player:s.player.charId,
        seat:s.player.localCouncil || null, controller:controller(s, d.provinceId),
        laws:laws, definition:d, enterprises:s.player.enterprises || [],
        payee:account(s, controller(s, d.provinceId)), chance:FB.localCouncilMotionChance(s)})};
  };
  L.validMotion = function (s, q) {
    const fresh = q && q.kind === 'industry_motion' && L.quoteMotion(s, q.definitionId, q.repealId);
    return !!(fresh && fresh.ready && same(q, fresh));
  };
  // The council owner calls this only after its successful seeded approval.
  function applyApproved(s, q) {
    const rows = writable(s);
    if (q.repealId) {
      const law = rows.laws.filter(function (r) { return r.id === q.repealId; })[0];
      law.repealedTurn = s.turn;
      law.repealer = copy(q.issuer);
      return law;
    }
    const row = {id:'industry_law_' + FB.uid(), definitionId:q.definitionId,
      terms:copy(q.terms), issuer:copy(q.issuer), payeeRealmId:q.issuer.realmId,
      startTurn:s.turn, endTurn:s.turn + q.terms.durationDays,
      transitionEndTurn:s.turn + q.terms.transitionDays, repealedTurn:null,
      existingEnterpriseUids:(s.player.enterprises || []).filter(function (e) {
        return e.provinceId === q.terms.provinceId && e.type === q.terms.enterpriseType;
      }).map(function (e) { return e.uid; })};
    rows.laws.push(row);
    return row;
  }
  L.propose = function (s, motionId, q) {
    const definitionId = L.forMotion(motionId);
    if (!q || q.definitionId !== definitionId || !L.validMotion(s, q)) return false;
    const result = FB.resolveLocalCouncilVote(s, function () { applyApproved(s, q); });
    if (!result) return false;
    if (!result.passed) FB.news(s, FB.msg('news.industry_law.rejected',
      '⚖ The local council rejects the operating-law proposal for {motion}.', {motion:FB.dataParam('localCouncilMotion', motionId)}));
    else if (q.repealId) FB.news(s, FB.msg('news.industry_law.repealed',
      '⚖ The local council repeals {motion}. Existing property and paid permissions are retained.', {motion:FB.dataParam('localCouncilMotion', motionId)}));
    else FB.news(s, FB.msg('news.industry_law.enacted',
      '⚖ The local council adopts {motion}. Existing businesses retain ownership and a lawful transition.', {motion:FB.dataParam('localCouncilMotion', motionId)}));
    return {passed:result.passed, chance:result.chance, motionId:motionId,
      repealId:q.repealId, definitionId:definitionId};
  };
  function exemption(s, d) {
    let result = {fee:d.fee, permission:d.mode !== 'prohibition', exempt:false};
    d.exemptions.forEach(function (e) {
      if (s.player.provinceId === e.id) {
        result.fee = Math.min(result.fee, e.fee);
        result.permission = result.permission || e.permission;
        result.exempt = true;
      }
    });
    return result;
  }
  L.operation = function (s, e) {
    const rows = ledger(s), charges = [], matches = [];
    let permitted = true, covered = true;
    rows.laws.forEach(function (law) {
      const d = law.terms;
      if (L.lifecycle(s, law) !== 'active' || d.provinceId !== e.provinceId || d.enterpriseType !== e.type) return;
      const x = exemption(s, d);
      const grace = law.existingEnterpriseUids.indexOf(e.uid) >= 0 && s.turn < law.transitionEndTurn;
      const permit = rows.permits.filter(function (p) {
        return p.lawId === law.id && p.enterpriseUid === e.uid && p.endTurn > s.turn;
      })[0];
      const lawful = grace || x.permission && (x.fee === 0 || !!permit);
      if (!x.permission && !grace) permitted = false;
      if (!lawful) covered = false;
      if (x.permission && x.fee > 0 && !permit) charges.push({lawId:law.id,
        amount:x.fee, payeeRealmId:law.payeeRealmId, endTurn:Math.min(law.endTurn, s.turn + d.permitDays)});
      matches.push({lawId:law.id, definitionId:law.definitionId, mode:d.mode,
        fee:x.fee, exempt:x.exempt, grace:grace, covered:lawful,
        endTurn:law.endTurn, transitionEndTurn:law.transitionEndTurn,
        permitEndTurn:permit ? permit.endTurn : null, payeeRealmId:law.payeeRealmId});
    });
    const choice = rows.choices.filter(function (c) { return c.enterpriseUid === e.uid; })[0];
    const paused = !!choice && choice.status !== 'open';
    return {permitted:permitted, covered:covered, operational:permitted && covered && !paused,
      paused:paused, choice:choice ? choice.status : 'open', charges:charges, laws:matches,
      amount:charges.reduce(function (n, c) { return n + c.amount; }, 0)};
  };
  L.reason = function (status) {
    if (!status.permitted) return FB.T('Operation is prohibited. Ownership is retained; pause or close this business.');
    if (status.paused) return FB.T('This business is voluntarily paused or closed. Ownership and paid obligations are retained.');
    if (!status.covered) return FB.T('An operating permission is due: {money:amount}. The business earns nothing until it is paid.', {amount:status.amount});
    if (status.laws.some(function (r) { return r.grace; })) return FB.T('Existing business transition: operation remains lawful until the disclosed deadline. Pay for permission, pause or close.');
    return FB.T('Operation is lawful under the current terms.');
  };
  L.quoteOperation = function (s, e, action, baseCost) {
    const status = L.operation(s, e), amount = action === 'pay' || action === 'acquire' ? status.amount : 0;
    const accounts = status.charges.map(function (c) { return account(s, c.payeeRealmId); });
    const enough = Number.isFinite(s.player.gold) && s.player.gold >= amount + (baseCost || 0);
    const canPay = status.permitted && accounts.every(function (a) { return !!a && Number.isFinite(a.gold + amount) && a.gold + amount <= Number.MAX_SAFE_INTEGER; });
    const capacity = ledger(s).permits.length + status.charges.length <= 4096;
    const canChoose = ledger(s).choices.length < 512 || ledger(s).choices.some(function (c) { return c.enterpriseUid === e.uid; });
    const actor = s.chars[s.player.charId];
    const authorized = actor && !actor.dead && !s.player.dead;
    const ready = authorized && (['pay','acquire'].indexOf(action) >= 0
      ? canPay && enough && capacity && (action === 'acquire' || status.charges.length > 0)
      : canChoose && L.relevant(s, e) && (['pause','close'].indexOf(action) >= 0 || action === 'resume' && status.covered && status.permitted));
    let reason = '';
    if (!authorized) reason = FB.T('A living household head must authorize this transaction.');
    else if (!status.permitted) reason = L.reason(status);
    else if (!canPay) reason = FB.T('The original law payee has no available public account.');
    else if (!enough) reason = FB.T('You need {money:amount} more for this payment.', {amount:amount + (baseCost || 0) - s.player.gold});
    else if (!capacity || !canChoose) reason = FB.T('The operating-law record limit has been reached.');
    else if (!ready) reason = L.reason(status);
    return {schema:1, kind:'industry_operation', action:action, actorId:s.player.charId,
      enterprise:copy(e), turn:s.turn, amount:amount, baseCost:baseCost || 0, status:status,
      ready:!!ready, reason:reason, signature:FB.mods.fingerprint({ledger:ledger(s), controller:controller(s, e.provinceId),
        gold:s.player.gold, actor:s.player.charId, home:s.player.provinceId, accounts:accounts,
        enterprises:s.player.enterprises || [], turn:s.turn})};
  };
  function currentEnterprise(s, uid) {
    return (s.player.enterprises || []).filter(function (e) { return e.uid === uid; })[0];
  }
  L.commitOperation = function (s, q) {
    if (!q || q.kind !== 'industry_operation' || q.action === 'acquire') return false;
    const e = currentEnterprise(s, q.enterprise.uid);
    if (!e) return false;
    const fresh = L.quoteOperation(s, e, q.action, 0);
    if (!fresh.ready || !same(q, fresh)) return false;
    if (q.action === 'pay') {
      if (!FB.treasuryHouseholdPurchase(s, fresh.status.charges.map(function (c) {
        return {realmId:c.payeeRealmId, amount:c.amount};
      }), 0)) return false;
      L.chargeAcquisition(s, e, fresh);
    }
    else {
      const rows = writable(s), old = rows.choices.filter(function (r) { return r.enterpriseUid === e.uid; })[0];
      if (old) { old.status = q.action === 'resume' ? 'open' : q.action; old.turn = s.turn; }
      else rows.choices.push({enterpriseUid:e.uid, status:q.action === 'resume' ? 'open' : q.action, turn:s.turn});
    }
    return true;
  };
  // Acquisition preflights the full price and all payees before allocating a UID.
  L.chargeAcquisition = function (s, e, q) {
    if (!q.status.charges.length) return;
    const rows = writable(s);
    q.status.charges.forEach(function (c) {
      rows.permits.push({id:'industry_permit_' + FB.uid(), lawId:c.lawId,
        enterpriseUid:e.uid, payer:'player', payeeRealmId:c.payeeRealmId,
        amount:c.amount, paidTurn:s.turn, endTurn:c.endTurn});
    });
  };
  L.validate = function (s) {
    if (!own(s, 'industryLaws')) return;
    const rows = s.industryLaws, ids = {}, permitKeys = {};
    function bad() { throw new Error(FB.T('Invalid industry-law record.')); }
    if (!fields(rows, ['schema','laws','permits','choices']) || rows.schema !== 1 ||
        !Array.isArray(rows.laws) || rows.laws.length > 256 || !Array.isArray(rows.permits) || rows.permits.length > 4096 ||
        !Array.isArray(rows.choices) || rows.choices.length > 512) bad();
    function issuer(i, d) {
      return fields(i, ['kind','provinceId','realmId','holderCharId']) && i.kind === 'local_council' &&
        i.provinceId === d.provinceId && own(s.realms, i.realmId) && own(s.chars, i.holderCharId);
    }
    rows.laws.forEach(function (r) {
      const d = r && FBDATA.industryLaws[r.definitionId];
      if (!d || !fields(r, ['id','definitionId','terms','issuer','payeeRealmId','startTurn','endTurn','transitionEndTurn','repealedTurn','repealer','existingEnterpriseUids']) ||
          typeof r.id !== 'string' || !/^industry_law_/.test(r.id) || ids[r.id] || !same(r.terms, d) ||
          !issuer(r.issuer, d) || r.payeeRealmId !== r.issuer.realmId || !s.start || s.start.id !== d.bookmarkId ||
          !integer(r.startTurn, 0, s.turn) || r.endTurn !== r.startTurn + d.durationDays ||
          r.transitionEndTurn !== r.startTurn + d.transitionDays ||
          !Array.isArray(r.existingEnterpriseUids) || r.existingEnterpriseUids.length > 512 ||
          r.existingEnterpriseUids.some(function (uid, i) { return typeof uid !== 'string' || r.existingEnterpriseUids.indexOf(uid) !== i; }) ||
          r.repealedTurn !== null && (!integer(r.repealedTurn, r.startTurn, s.turn) || !issuer(r.repealer, d)) ||
          r.repealedTurn === null && own(r, 'repealer') ||
          rows.laws.some(function (other) { return other !== r && other.definitionId === r.definitionId &&
            other.startTurn <= r.startTurn && Math.min(other.endTurn, other.repealedTurn === null ? other.endTurn : other.repealedTurn) > r.startTurn; })) bad();
      ids[r.id] = r;
    });
    rows.permits.forEach(function (p) {
      const law = p && ids[p.lawId], d = law && law.terms;
      const key = p && p.lawId + ':' + p.enterpriseUid + ':' + p.paidTurn;
      if (!fields(p, ['id','lawId','enterpriseUid','payer','payeeRealmId','amount','paidTurn','endTurn']) || !law ||
          typeof p.id !== 'string' || !/^industry_permit_/.test(p.id) || ids[p.id] || permitKeys[key] ||
          typeof p.enterpriseUid !== 'string' || !p.enterpriseUid || p.payer !== 'player' ||
          p.payeeRealmId !== law.payeeRealmId || !money(p.amount) || p.amount <= 0 ||
          [d.fee].concat(d.exemptions.map(function (x) { return x.fee; })).indexOf(p.amount) < 0 ||
          !integer(p.paidTurn, law.startTurn, Math.min(s.turn, law.endTurn - 1)) ||
          p.endTurn !== Math.min(law.endTurn, p.paidTurn + d.permitDays) ||
          law.repealedTurn !== null && p.paidTurn > law.repealedTurn ||
          rows.permits.some(function (other) { return other !== p && other.lawId === p.lawId &&
            other.enterpriseUid === p.enterpriseUid && other.paidTurn < p.paidTurn && other.endTurn > p.paidTurn; })) bad();
      ids[p.id] = p; permitKeys[key] = true;
    });
    const choices = {};
    rows.choices.forEach(function (c) {
      if (!fields(c, ['enterpriseUid','status','turn']) || typeof c.enterpriseUid !== 'string' || !c.enterpriseUid ||
          choices[c.enterpriseUid] || ['open','pause','close'].indexOf(c.status) < 0 || !integer(c.turn, 0, s.turn)) bad();
      choices[c.enterpriseUid] = true;
    });
  };
})();
