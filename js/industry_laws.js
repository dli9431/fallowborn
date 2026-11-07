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
          ['schema','motionId','bookmarkId','provinceId','enterpriseType','minYear','maxYear','mode','fee','permitDays','durationDays','transitionDays','exemptions','offense','voting']) ||
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
      if (own(d, 'voting') && (!fields(d.voting, ['town','estates']) || !d.voting.town || !d.voting.estates ||
          ['town','estates'].some(function (consumer) {
            const v = d.voting[consumer];
            return !fields(v, consumer === 'town' ? ['quorum','threshold','days','members'] : ['quorum','threshold','days']) ||
              typeof v.quorum !== 'number' || !(v.quorum > 0 && v.quorum <= 1) ||
              typeof v.threshold !== 'number' || !(v.threshold >= 0.5 && v.threshold < 1) ||
              !integer(v.days, 1, 90) || consumer === 'town' && (!Array.isArray(v.members) ||
                !v.members.length || v.members.length > 8 || v.members.some(function (m, i) {
                  return !fields(m, ['id','kind','weight']) || typeof m.id !== 'string' || own(Object.prototype, m.id) || !/^[a-z][a-z0-9_]{0,39}$/.test(m.id) ||
                    ['guild','notable'].indexOf(m.kind) < 0 || !integer(m.weight, 1, 10) ||
                    v.members.some(function (n, j) { return i !== j && (n.id === m.id || n.kind === m.kind); });
                }));
          }))) errors.push('Invalid industry-law voting rules: ' + id);
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
    const ready = !d.voting && council(s, d) && (repealId ? !!target && target.repealedTurn === null : !live && laws.length < 256 && affected <= 512);
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
    if (q && q.kind === 'industry_assembly') return q.definitionId === definitionId && q.consumer === 'town' ? L.commitAssembly(s, q) : false;
    if (FBDATA.industryLaws[definitionId] && FBDATA.industryLaws[definitionId].voting) return false;
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
  // Assembly adapters retain commitments, never a second store of enacted laws.
  function votes(s) { return ledger(s).votes || []; }
  function living(s, id) {
    const c = s.chars[id];
    return !!(c && !c.dead && !c.captive && !c.exiled && FB.ageOf(c, s.date.year) >= 16);
  }
  function home(s, id) { return id === s.player.charId ? s.player.provinceId : s.chars[id].homeProvinceId; }
  function privilege(d, pid) {
    const out = {fee:d.fee, permission:d.mode !== 'prohibition'};
    d.exemptions.forEach(function (x) {
      if (x.id === pid) { out.fee = Math.min(out.fee, x.fee); out.permission = out.permission || x.permission; }
    });
    return out;
  }
  function operatingInterest(d, pid) {
    const x = privilege(d, pid);
    // Prospective access to the declared trade, not invented NPC property.
    return !x.permission ? -3 : x.fee > 0 ? -1 : d.fee > 0 || d.mode === 'prohibition' ? 1 : 0;
  }
  function rowInterest(s, d, row, repealId) {
    let score = 0;
    if (row.kind === 'guild') score = operatingInterest(d, row.homeProvinceId);
    if (row.kind === 'notable') score = d.mode === 'license' && d.fee > 0 ? 1 : d.mode === 'prohibition' ? -1 : 0;
    if (row.kind === 'noble') {
      if (row.realmId === controller(s, d.provinceId)) score += d.fee > 0 ? 2 : d.mode === 'prohibition' ? -2 : 0;
      if (row.actorId === s.player.charId && (s.player.enterprises || []).some(function (e) {
        return e.type === d.enterpriseType && e.provinceId === d.provinceId;
      })) score += operatingInterest(d, s.player.provinceId) * 3;
    }
    return repealId ? -score : score;
  }
  L.assemblyMembers = function (s, definitionId, consumer, repealId) {
    const d = FBDATA.industryLaws[definitionId], out = [];
    if (['town','estates'].indexOf(consumer) < 0 || !d || !d.voting || !d.voting[consumer]) return out;
    if (consumer === 'town') {
      const used = {};
      d.voting.town.members.forEach(function (m) {
        const candidates = Object.keys(s.chars).filter(function (id) {
          if (used[id] || !living(s, id) || home(s, id) !== d.provinceId) return false;
          const c = s.chars[id], career = c.career;
          if (m.kind === 'guild') return !!(career && career.profession === FBDATA.enterprises[d.enterpriseType].profession &&
            ['member','master','officer','guildmaster'].indexOf(career.guildRank) >= 0);
          if (id === s.player.charId) return s.player.profession === 'administration' && !!FB.localCouncilOf(s);
          return Object.keys(FB.localInstitutionDefinitions(s)).some(function (iid) {
            const def = FB.localInstitutionDefinitions(s)[iid], r = s.localInstitutions && s.localInstitutions[iid];
            return def.provinceId === d.provinceId && !def.officeId && def.kind !== 'congregation' &&
              FB.localInstitutionEnabled(s, def) && r && r.representativeId === id;
          });
        }).sort(function (a, b) {
          return a === s.player.charId ? -1 : b === s.player.charId ? 1 : a < b ? -1 : 1;
        });
        // A saved town seat can speak for its own commercial bench even when
        // its guild rank is absent; that office supplies membership, not wealth.
        if (m.kind === 'guild' && living(s, s.player.charId) && home(s, s.player.charId) === d.provinceId &&
            FB.localCouncilOf(s) && s.player.profession === FBDATA.enterprises[d.enterpriseType].profession) {
          candidates.unshift(s.player.charId);
        }
        const actorId = candidates[0] || null;
        if (actorId) used[actorId] = true;
        out.push({id:m.id, kind:m.kind, weight:m.weight, actorId:actorId,
          principal:actorId ? 'character:' + actorId : 'county:' + d.provinceId + ':' + m.kind,
          represented:!actorId, homeProvinceId:d.provinceId, realmId:null});
      });
    } else {
      const court = FB.parliamentActive(s) && FB.politicalCourt(s);
      if (!court || court.polityId !== controller(s, d.provinceId) || court.houses.length > 128) return out;
      court.houses.forEach(function (h) {
        const r = s.realms[h.id], actorId = h.rulerCharacterId || null;
        if (actorId ? !living(s, actorId) : !(r && r.alive && r.ruler && !r.ruler.dead &&
            !r.ruler.captive && !r.ruler.exiled && h.rulerAge >= 16)) return;
        out.push({id:h.id, kind:'noble', weight:Math.min(10, h.influence), actorId:actorId,
          principal:(actorId ? 'character:' + actorId : 'realm:' + h.id) + ':' + FB.realmRulerGeneration(s, h.id), represented:false,
          homeProvinceId:h.isPlayer ? s.player.provinceId : r.capital, realmId:h.realmId});
      });
    }
    return out.map(function (m) {
      m.interest = rowInterest(s, d, m, repealId);
      m.posture = m.interest > 0 ? 'support' : m.interest < 0 ? 'oppose' : 'abstain';
      return m;
    });
  };
  function assemblyAuthority(s, d, consumer, proposerId, issuer) {
    const rid = controller(s, d.provinceId), r = realm(s, rid), seat = FB.localCouncilOf(s);
    if (!applicable(s, d) || !living(s, proposerId) || s.player.dead || proposerId !== s.player.charId ||
        !r || !r.alive || !account(s, rid) || issuer && issuer.realmId !== rid ||
        !FB.political.consent(s, {kind:'realm', id:rid}, 'industry_law', {provinceId:d.provinceId}).allowed) return false;
    if (consumer === 'town') return !!(seat && seat.holderCharId === proposerId && seat.provinceId === d.provinceId &&
      s.player.provinceId === d.provinceId && FB.station.isFreeUnlanded(s.player, s) &&
      (FB.professionHasRole(s.player.profession, ['trading','craft']) || s.player.profession === 'administration') &&
      FB.political.civicConsent(s, d.provinceId).allowed);
    return !!(FB.parliamentActive(s) && s.player.liege === rid &&
      L.assemblyMembers(s, L.forMotion(d.motionId), consumer).some(function (m) { return m.actorId === proposerId; }));
  }
  function availableLaw(s, definitionId, repealId) {
    const rows = ledger(s).laws;
    const d = FBDATA.industryLaws[definitionId];
    if ((s.player.enterprises || []).filter(function (e) { return e.type === d.enterpriseType && e.provinceId === d.provinceId; }).length > 512) return false;
    return repealId ? rows.some(function (r) { return r.id === repealId && r.definitionId === definitionId && r.repealedTurn === null; }) :
      rows.length < 256 && !rows.some(function (r) { return r.definitionId === definitionId && r.repealedTurn === null && s.turn < r.endTurn; });
  }
  L.assemblyList = function (s, consumer) {
    if (['town','estates'].indexOf(consumer) < 0) return [];
    return Object.keys(FBDATA.industryLaws).filter(function (id) {
      const d = FBDATA.industryLaws[id];
      return d.voting && applicable(s, d) && (consumer === 'town' ? !!FB.localCouncilOf(s) &&
        FB.localCouncilOf(s).provinceId === d.provinceId : FB.parliamentActive(s) && s.player.liege === controller(s, d.provinceId));
    });
  };
  L.quoteAssembly = function (s, definitionId, consumer, action, voteId, memberId, posture, repealId) {
    const d = FBDATA.industryLaws[definitionId];
    if (['town','estates'].indexOf(consumer) < 0 || !d || !d.voting || !d.voting[consumer]) return null;
    const v = votes(s).filter(function (r) { return r.id === voteId; })[0] || null;
    if (voteId && (!v || v.definitionId !== definitionId || v.consumer !== consumer)) return null;
    repealId = v ? v.repealId : repealId || null;
    const rules = d.voting[consumer], members = L.assemblyMembers(s, definitionId, consumer, repealId);
    if (v) members.forEach(function (m) {
      const b = v.ballots.filter(function (b) { return b.memberId === m.id && b.principal === m.principal; })[0];
      if (b) m.posture = b.posture;
    });
    const authorized = assemblyAuthority(s, d, consumer, v ? v.proposerId : s.player.charId, v && v.issuer);
    const member = members.filter(function (m) { return m.id === memberId && m.actorId === s.player.charId; })[0];
    const parliament = consumer === 'estates' && FB.parliamentSummary(s);
    const sessionReady = consumer === 'town' ? FB.localCouncilOf(s) && (FB.localCouncilOf(s).nextMotionTurn || 0) <= s.turn :
      !!parliament && FB.parliamentTerms(s).motionYears.industry !== s.date.year && !parliament.pendingMotion;
    const open = !!v && v.status === 'pending', expired = open && s.turn >= v.endTurn;
    const valid = authorized && members.length > 0 && members.length <= 128 && availableLaw(s, definitionId, repealId);
    let ready = false;
    if (action === 'begin') ready = valid && sessionReady && !votes(s).some(function (r) { return r.status === 'pending' &&
      (r.definitionId === definitionId || r.consumer === consumer && r.issuer.realmId === controller(s, d.provinceId)); }) && votes(s).length < 64;
    if (action === 'ballot') ready = open && valid && !expired && !!member && ['support','oppose','abstain'].indexOf(posture) >= 0;
    if (action === 'withdraw') ready = open && v.proposerId === s.player.charId && living(s, s.player.charId);
    if (action === 'resolve') ready = open && living(s, s.player.charId);
    // All postures are explicit: the shared ballot is a pure tally here.
    const ballot = FB.politicalBallot(members);
    const total = ballot.totalWeight;
    const cast = members.reduce(function (n, m) { return n + (m.posture !== 'abstain' ? m.weight : 0); }, 0);
    const support = ballot.supportWeight;
    const crown = members.filter(function (m) { return m.realmId === controller(s, d.provinceId); })[0];
    const tally = {totalWeight:total, castWeight:cast, supportWeight:support, quorum:rules.quorum, threshold:rules.threshold,
      consent:consumer === 'town' || !!crown && crown.posture === 'support'};
    const reason = !authorized ? FB.T('A living eligible proposer, the original county controller and current government consent are required.') :
      !availableLaw(s, definitionId, repealId) ? FB.T('This law is already in force, its repeal target is unavailable, or the law record limit has been reached.') :
      action === 'begin' && !sessionReady ? FB.T('The annual hearing is spent or another Estates campaign is pending.') :
      action === 'ballot' && !member ? FB.T('You may cast only the ballot of your current eligible seat.') :
      expired ? FB.T('This hearing has expired and can only be closed without enactment.') :
      !ready ? FB.T('Another hearing is pending, this action is settled, or the hearing record limit has been reached.') : '';
    return {kind:'industry_assembly', definitionId:definitionId, consumer:consumer, action:action,
      voteId:voteId || null, memberId:memberId || null, posture:posture || null, repealId:repealId,
      actorId:s.player.charId, turn:s.turn, terms:copy(d), members:members, tally:tally,
      issuer:{kind:consumer === 'town' ? 'local_council' : 'estates', provinceId:d.provinceId,
        realmId:controller(s, d.provinceId), holderCharId:s.player.charId},
      ready:!!ready, valid:!!valid, expired:!!expired, reason:reason,
      signature:FB.mods.fingerprint({vote:v, votes:votes(s), laws:ledger(s).laws, player:s.player,
        consent:FB.political.consent(s, {kind:'realm', id:controller(s, d.provinceId)}, 'industry_law', {provinceId:d.provinceId}),
        civic:FB.political.civicConsent(s, d.provinceId), date:s.date, account:account(s, controller(s, d.provinceId)),
        generation:FB.realmRulerGeneration(s, controller(s, d.provinceId)), sessionReady:!!sessionReady})};
  };
  L.commitAssembly = function (s, q) {
    if (!q || q.kind !== 'industry_assembly') return false;
    const fresh = L.quoteAssembly(s, q.definitionId, q.consumer, q.action, q.voteId, q.memberId, q.posture, q.repealId);
    if (!fresh || !fresh.ready || !same(q, fresh)) return false;
    const rows = writable(s);
    if (!rows.votes) rows.votes = [];
    if (q.action === 'begin') {
      const r = {id:'industry_vote_' + FB.uid(), definitionId:q.definitionId, consumer:q.consumer,
        proposerId:q.actorId, issuer:copy(q.issuer), repealId:q.repealId,
        startedTurn:s.turn, endTurn:s.turn + q.terms.voting[q.consumer].days,
        ballots:[], status:'pending', endedTurn:null, lawId:null, result:null};
      rows.votes.push(r);
      if (q.consumer === 'town') s.player.localCouncil.nextMotionTurn = s.turn + 360;
      else FB.parliamentEnsure(s).motionYears.industry = s.date.year;
      return r;
    }
    const v = rows.votes.filter(function (r) { return r.id === q.voteId; })[0];
    if (q.action === 'ballot') {
      const m = q.members.filter(function (r) { return r.id === q.memberId; })[0];
      v.ballots = v.ballots.filter(function (b) { return b.memberId !== m.id; });
      v.ballots.push({memberId:m.id, principal:m.principal, posture:q.posture});
      return v;
    }
    v.endedTurn = s.turn;
    if (q.action === 'withdraw') v.status = 'withdrawn';
    else if (!q.valid || q.expired) v.status = 'invalidated';
    else {
      const t = q.tally;
      // The fresh review binds the shared tally to these exact principals.
      const passed = t.totalWeight > 0 && t.castWeight >= t.totalWeight * t.quorum &&
        t.supportWeight > t.castWeight * t.threshold && t.consent;
      v.status = passed ? 'passed' : 'rejected';
      v.result = {members:copy(q.members), tally:copy(t)};
      if (passed) v.lawId = applyApproved(s, q).id;
    }
    FB.news(s, FB.msg('news.industry_law.assembly_result',
      'The operating-law hearing for {motion} is settled. Review the assembly record for its decision.',
      {motion:FB.dataParam('localCouncilMotion', q.terms.motionId)}));
    return v;
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
    if (!fields(rows, ['schema','laws','permits','choices','votes']) || rows.schema !== 1 ||
        !Array.isArray(rows.laws) || rows.laws.length > 256 || !Array.isArray(rows.permits) || rows.permits.length > 4096 ||
        !Array.isArray(rows.choices) || rows.choices.length > 512) bad();
    function issuer(i, d) {
      return fields(i, ['kind','provinceId','realmId','holderCharId']) &&
        (i.kind === 'local_council' || i.kind === 'estates' && !!d.voting) &&
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
    if (own(rows, 'votes')) {
      if (!Array.isArray(rows.votes) || rows.votes.length > 64) bad();
      rows.votes.forEach(function (v) {
        const d = v && FBDATA.industryLaws[v.definitionId], rules = d && d.voting && d.voting[v.consumer];
        const ended = v && v.status !== 'pending', decided = v && ['passed','rejected'].indexOf(v.status) >= 0;
        if (!rules || !fields(v, ['id','definitionId','consumer','proposerId','issuer','repealId','startedTurn','endTurn',
            'ballots','status','endedTurn','lawId','result']) || typeof v.id !== 'string' || !/^industry_vote_/.test(v.id) || ids[v.id] ||
            !issuer(v.issuer, d) || v.issuer.holderCharId !== v.proposerId ||
            v.issuer.kind !== (v.consumer === 'town' ? 'local_council' : 'estates') ||
            ['pending','withdrawn','invalidated','passed','rejected'].indexOf(v.status) < 0 ||
            !integer(v.startedTurn, 0, s.turn) || v.endTurn !== v.startedTurn + rules.days ||
            (ended ? !integer(v.endedTurn, v.startedTurn, s.turn) : v.endedTurn !== null) ||
            v.repealId !== null && !rows.laws.some(function (r) { return r.id === v.repealId && r.definitionId === v.definitionId; }) ||
            !Array.isArray(v.ballots) || v.ballots.length > 128 ||
            (!decided && v.result !== null) || (v.status !== 'passed' && v.lawId !== null)) bad();
        ids[v.id] = v;
        const seen = {};
        v.ballots.forEach(function (b) {
          if (!fields(b, ['memberId','principal','posture']) || typeof b.memberId !== 'string' || seen[b.memberId] ||
              typeof b.principal !== 'string' || b.principal.length > 200 ||
              (v.consumer === 'town' ? b.principal !== 'character:' + v.proposerId :
                b.principal.indexOf('character:' + v.proposerId + ':') !== 0 || !/:[0-9]+$/.test(b.principal)) ||
              ['support','oppose','abstain'].indexOf(b.posture) < 0 ||
              (v.consumer === 'town' ? !rules.members.some(function (m) { return m.id === b.memberId; }) : b.memberId !== 'player')) bad();
          seen[b.memberId] = true;
        });
        if (decided) {
          const result = v.result, members = result && result.members, t = result && result.tally, memberIds = {};
          if (!fields(result, ['members','tally']) || !Array.isArray(members) || !members.length || members.length > 128 ||
              !fields(t, ['totalWeight','castWeight','supportWeight','quorum','threshold','consent']) ||
              t.quorum !== rules.quorum || t.threshold !== rules.threshold || typeof t.consent !== 'boolean') bad();
          members.forEach(function (m) {
            const policy = v.consumer === 'town' && rules.members.filter(function (p) { return p.id === m.id; })[0];
            if (!fields(m, ['id','kind','weight','actorId','principal','represented','homeProvinceId','realmId','interest','posture']) ||
                typeof m.id !== 'string' || memberIds[m.id] || !integer(m.weight, 1, 10) ||
                !integer(m.interest, -20, 20) || ['support','oppose','abstain'].indexOf(m.posture) < 0 ||
                typeof m.principal !== 'string' || m.principal.length > 200 || typeof m.represented !== 'boolean' ||
                m.actorId !== null && typeof m.actorId !== 'string' ||
                !FB.world.byId[m.homeProvinceId] ||
                (v.consumer === 'town' ? !policy || policy.kind !== m.kind || policy.weight !== m.weight || m.realmId !== null :
                  m.kind !== 'noble' || (m.realmId === null ? m.id !== 'player' || m.actorId !== v.proposerId :
                    m.realmId !== m.id || !own(s.realms, m.realmId)) || m.represented)) bad();
            memberIds[m.id] = true;
          });
          if (t.totalWeight !== members.reduce(function (n, m) { return n + m.weight; }, 0) ||
              t.castWeight !== members.reduce(function (n, m) { return n + (m.posture !== 'abstain' ? m.weight : 0); }, 0) ||
              t.supportWeight !== members.reduce(function (n, m) { return n + (m.posture === 'support' ? m.weight : 0); }, 0) ||
              t.consent !== (v.consumer === 'town' || members.some(function (m) { return m.realmId === v.issuer.realmId && m.posture === 'support'; })) ||
              (v.status === 'passed') !== (t.totalWeight > 0 && t.castWeight >= t.totalWeight * t.quorum &&
                t.supportWeight > t.castWeight * t.threshold && t.consent)) bad();
          if (v.status === 'passed' && !rows.laws.some(function (r) {
            return r.id === v.lawId && r.definitionId === v.definitionId &&
              (v.repealId ? r.id === v.repealId && r.repealedTurn === v.endedTurn && same(r.repealer, v.issuer) :
                r.startTurn === v.endedTurn && same(r.issuer, v.issuer));
          })) bad();
        }
      });
    }
    rows.laws.forEach(function (law) {
      if (!law.terms.voting) return;
      if (votes(s).filter(function (v) { return v.status === 'passed' && !v.repealId && v.lawId === law.id; }).length !== 1 ||
          law.repealedTurn !== null && votes(s).filter(function (v) {
            return v.status === 'passed' && v.repealId === law.id && v.lawId === law.id;
          }).length !== 1) bad();
    });
    votes(s).forEach(function (v, i) {
      if (v.status === 'pending' && votes(s).some(function (other, j) { return i !== j && other.status === 'pending' &&
        (other.definitionId === v.definitionId || other.consumer === v.consumer && other.issuer.realmId === v.issuer.realmId); })) bad();
    });
  };
})();
