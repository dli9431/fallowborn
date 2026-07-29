/* Fallowborn — the Royal Council (tier 6+): the great officers of the crown.
   A king does not rule alone: his vassal magnates fill five household offices
   (Seneschal, Constable, Treasurer, Almoner, Chamberlain), each granting a
   bonus while its holder serves. But magnates have tempers — flatterers curry
   Standing, the ambitious scheme, and high-handed rule (extraordinary taxes,
   revocations) raises crown authority while souring Standing, until the
   council forces a charter of liberties on an over-mighty king. Authority
   below balance.councilConsentBelow means the great deeds (extraordinary
   taxes, revoking fiefs) are beyond the crown's reach. See docs/designs/council.md. */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* the five great offices. bonusKey/bonusAmt feed FB.councilBonus and hold
     while the seat is filled by a living vassal not in open disgrace */
  var SEATS = [
    { id: 'seneschal', icon: '⚖', bonusKey: 'tax', bonusAmt: 0.10 },
    { id: 'constable', icon: '🗡', bonusKey: 'levy', bonusAmt: 0.10 },
    { id: 'treasurer', icon: '💰', bonusKey: 'build', bonusAmt: 0.15 },
    { id: 'almoner', icon: '🕯', bonusKey: 'piety', bonusAmt: 1 },
    { id: 'chamberlain', icon: '🗝', bonusKey: 'plot', bonusAmt: 0.08 }
  ];
  FB.councilSeats = function () { return SEATS; };
  FB.councilSeat = function (id) {
    for (const s of SEATS) if (s.id === id) return s;
    return null;
  };

  function standing(state, rid) {
    return FB.standingOf(state, { kind:'realm', id:rid });
  }

  function adjustStanding(state, rid, amount, source) {
    return FB.adjustStanding(state, { kind:'realm', id:rid }, amount,
      'council:' + source);
  }

  /* traits that make a councillor dangerous when his love runs cold */
  var SCHEMER_TRAITS = ['ambitious', 'deceitful', 'proud', 'envious', 'cruel', 'wrathful'];

  FB.councilActive = function (state) { return state.player.tier >= 6; };

  /* create/heal the council: forms when the player is crowned (also heals
     old saves), drops seat-holders who died or turned, fills vacancies with
     the best available vassal, and repairs vassal rulers missing a trait */
  FB.councilEnsure = function (state) {
    if (!FB.councilActive(state)) return null;
    const fresh = !state.council;
    if (fresh) state.council = { authority: 60, seats: {} };
    const c = state.council;
    if (!c.seats) c.seats = {};
    if (c.authority === undefined) c.authority = 60;
    for (const vid of FB.playerVassals(state)) {
      const r = state.realms[vid];
      if (r && r.ruler && !r.ruler.trait) r.ruler.trait = FB.pick(FB.RULER_TRAITS);
    }
    // a seat whose holder no longer kneels falls vacant
    for (const s of SEATS) {
      const rid = c.seats[s.id];
      if (rid && (!state.realms[rid] || !state.realms[rid].alive || state.realms[rid].liege !== 'player')) {
        c.seats[s.id] = null;
      }
    }
    // fill vacancies: the greatest vassals first (rank, then Standing)
    const seated = {};
    for (const s of SEATS) if (c.seats[s.id]) seated[c.seats[s.id]] = 1;
    const cand = FB.playerVassals(state).filter(function (vid) { return !seated[vid]; });
    cand.sort(function (a, b) {
      const ra = state.realms[a], rb = state.realms[b];
      if ((rb.rank || 1) !== (ra.rank || 1)) return (rb.rank || 1) - (ra.rank || 1);
      return standing(state, b) - standing(state, a);
    });
    for (const s of SEATS) {
      if (!c.seats[s.id] && cand.length) c.seats[s.id] = cand.shift();
    }
    if (fresh) {
      FB.news(state, FB.msg('news.council.forms',
        '👑 The great officers of the crown gather — your royal council now sits. Magnates will serve you, flatter you, and weigh your every act.',
        {}));
    }
    return c;
  };

  FB.councilMembers = function (state) {
    const c = FB.councilEnsure(state);
    const out = [];
    if (!c) return out;
    for (const s of SEATS) {
      const rid = c.seats[s.id];
      if (rid && state.realms[rid]) out.push({ seat: s, rid: rid, realm: state.realms[rid] });
    }
    return out;
  };

  /* Locale-neutral, RNG-free projection for Governance and other overview
     surfaces. Unlike councilEnsure, reading this never forms the council,
     fills a vacancy, repairs a ruler trait, or writes a Chronicle notice. */
  FB.councilSummary = function (state) {
    if (!FB.councilActive(state)) return null;
    const council = state.council;
    const seats = [];
    const seated = {};
    const schemers = [];
    const sycophants = [];
    let memberStanding = 0;
    let memberCount = 0;
    for (const seat of SEATS) {
      const holderId = council && council.seats &&
        council.seats[seat.id] || null;
      const realm = holderId && state.realms[holderId];
      const valid = !!(realm && realm.alive && realm.liege === 'player');
      const value = valid ? standing(state, holderId) : 0;
      const effective = valid && value > -50;
      if (valid) {
        seated[holderId] = seat.id;
        memberStanding += value;
        memberCount++;
        if (SCHEMER_TRAITS.indexOf((realm.ruler || {}).trait) >= 0 &&
            value <= -1) schemers.push(holderId);
        if (value >= 20) sycophants.push(holderId);
      }
      seats.push({
        id:seat.id,
        holderId:valid ? holderId : null,
        staleHolderId:holderId && !valid ? holderId : null,
        standing:value,
        effective:effective,
        bonusKey:seat.bonusKey,
        bonusAmount:effective ? seat.bonusAmt : 0
      });
    }
    const vassalIds = FB.playerVassals(state).slice().sort();
    let vassalStanding = 0;
    for (const rid of vassalIds) vassalStanding += standing(state, rid);
    const authority = council && isFinite(Number(council.authority))
      ? FB.clamp(Number(council.authority), 0, 100) : 60;
    return {
      formed:!!council,
      authority:authority,
      consentBelow:FBDATA.balance.councilConsentBelow || 35,
      charterAbove:FBDATA.balance.councilCharterAbove || 70,
      needsConsent:!!council &&
        authority < (FBDATA.balance.councilConsentBelow || 35),
      seats:seats,
      seated:seated,
      vacancyIds:seats.filter(function (seat) {
        return !seat.holderId;
      }).map(function (seat) {
        return seat.id;
      }),
      averageMemberStanding:memberCount
        ? memberStanding / memberCount : 0,
      averageVassalStanding:vassalIds.length
        ? vassalStanding / vassalIds.length : 0,
      schemerIds:schemers,
      sycophantIds:sycophants
    };
  };

  /* sum of office bonuses of one key (tax/levy/build/piety/plot) */
  FB.councilBonus = function (state, key) {
    const summary = FB.councilSummary(state);
    if (!summary || !summary.formed) return 0;
    let sum = 0;
    for (const seat of summary.seats) {
      if (seat.bonusKey === key) sum += seat.bonusAmount;
    }
    return sum;
  };

  FB.councilAvgStanding = function (state) {
    const summary = FB.councilSummary(state);
    return summary ? summary.averageMemberStanding : 0;
  };
  FB.councilAvgOpinion = FB.councilAvgStanding;

  FB.councilAuthority = function (state, amt) {
    const c = FB.councilEnsure(state);
    if (!c) return;
    c.authority = FB.clamp(c.authority + amt, 0, 100);
  };

  /* below this the great deeds are beyond the crown: the council will not
     suffer extraordinary taxes or revoked fiefs */
  FB.councilNeedsConsent = function (state) {
    if (!FB.councilActive(state) || !state.council) return false;
    return state.council.authority < (FBDATA.balance.councilConsentBelow || 35);
  };

  /* the slow gravity of custom: over-mighty authority erodes, a cowed crown
     quietly reasserts itself — resting near the middle */
  FB.councilYearly = function (state) {
    const c = FB.councilEnsure(state);
    if (!c) return;
    if (c.authority > 50) c.authority = Math.max(50, c.authority - 2);
    else if (c.authority < 50) c.authority = Math.min(50, c.authority + 1);
  };

  FB.councilAppoint = function (state, seatId, rid) {
    const c = FB.councilEnsure(state);
    const seat = FB.councilSeat(seatId);
    const r = rid && state.realms[rid];
    if (!c || !seat || !r || !r.alive || r.liege !== 'player') return;
    // no man holds two offices; the displaced go back to the benches
    for (const s of SEATS) if (c.seats[s.id] === rid) c.seats[s.id] = null;
    const old = c.seats[seatId];
    c.seats[seatId] = rid;
    adjustStanding(state, rid, 10, 'appointment');
    if (old && old !== rid) adjustStanding(state, old, -8, 'replacement');
    FB.councilAuthority(state, -2); // every appointment embeds a magnate
    FB.news(state, FB.msg('news.council.appointed',
      '🏛 {ruler} of {realm} is raised to your council.', { ruler: r.ruler.name, realm: r.name }));
  };

  FB.councilDismiss = function (state, seatId) {
    const c = FB.councilEnsure(state);
    const seat = FB.councilSeat(seatId);
    if (!c || !seat) return;
    const rid = c.seats[seatId];
    if (!rid) return;
    c.seats[seatId] = null;
    const r = state.realms[rid];
    adjustStanding(state, rid, -15, 'dismissal');
    FB.councilAuthority(state, 4); // the crown asserts its prerogative
    FB.news(state, FB.msg('news.council.dismissed',
      '🏛 {ruler} of {realm} is dismissed from your council — and will not forget it.',
      { ruler: r ? r.ruler.name : '?', realm: r ? r.name : '?' }));
  };

  /* Compatibility entry point: Council callers use the same rank-priced,
     recipient-cooled ruler gift as every ruler sheet. */
  FB.councilGift = function (state, rid) {
    const r = rid && state.realms[rid];
    if (!r || !r.alive || r.liege !== 'player' || !FB.giveRulerCashGift) return false;
    return FB.giveRulerCashGift(state, rid);
  };

  /* ---------- event helpers (FB.fns.council_* — triggers & effects) ---------- */

  function memberByTemper(state, traits, minOp, maxOp) {
    const ms = FB.councilMembers(state);
    const pool = [];
    for (const m of ms) {
      const op = standing(state, m.rid);
      if (traits && traits.indexOf(m.realm.ruler.trait) < 0) continue;
      if (minOp !== undefined && op < minOp) continue;
      if (maxOp !== undefined && op > maxOp) continue;
      pool.push(m);
    }
    return pool.length ? FB.pick(pool) : null;
  }
  FB.councilSchemers = function (state) {
    const out = [];
    const summary = FB.councilSummary(state);
    if (!summary || !summary.formed) return out;
    for (const seat of summary.seats) {
      if (!seat.holderId ||
          summary.schemerIds.indexOf(seat.holderId) < 0) continue;
      const realm = state.realms[seat.holderId];
      if (!realm) continue;
      out.push({
        seat:FB.councilSeat(seat.id),
        rid:seat.holderId,
        realm:realm
      });
    }
    out.sort(function (a, b) {
      return a.rid < b.rid ? -1 : (a.rid > b.rid ? 1 : 0);
    });
    return out;
  };
  function schemer(state) {
    const pool = FB.councilSchemers(state);
    return pool.length ? FB.pick(pool) : null;
  }
  function sycophant(state) { return memberByTemper(state, null, 20); }

  FB.fns = FB.fns || {};
  /* triggers */
  FB.fns.council_has_members = function (state) { return FB.councilMembers(state).length > 0; };
  FB.fns.council_two_members = function (state) { return FB.councilMembers(state).length >= 2; };
  FB.fns.council_has_schemer = function (state) {
    return FB.councilSchemers(state).length > 0;
  };
  FB.fns.council_has_sycophant = function (state) { return !!sycophant(state); };
  FB.fns.council_scheme_ripe = function (state) {
    // the plot thickens while no Chamberlain watches the shadows
    if (!FB.fns.council_has_schemer(state)) return false;
    const c = state.council;
    return !(c && c.seats && c.seats.chamberlain);
  };
  FB.fns.council_scheme_watched = function (state) {
    if (!schemer(state)) return false;
    const c = state.council;
    return !!(c && c.seats && c.seats.chamberlain);
  };
  FB.fns.council_charter_due = function (state) {
    const c = FB.councilEnsure(state);
    if (!c || !FB.councilMembers(state).length) return false;
    return c.authority >= (FBDATA.balance.councilCharterAbove || 70) &&
      FB.councilAvgStanding(state) < -5;
  };
  FB.fns.council_has_unseated = function (state) {
    const c = FB.councilEnsure(state);
    if (!c) return false;
    const seated = {};
    for (const s of SEATS) if (c.seats[s.id]) seated[c.seats[s.id]] = 1;
    for (const vid of FB.playerVassals(state)) {
      if (!seated[vid] && SCHEMER_TRAITS.indexOf((state.realms[vid].ruler || {}).trait) >= 0) return true;
    }
    return false;
  };

  /* effects */
  FB.fns.council_flatter_kind = function (state) {
    const m = sycophant(state) || FB.pick(FB.councilMembers(state));
    if (m) adjustStanding(state, m.rid, 8, 'flatter_kind');
  };
  FB.fns.council_flatter_cold = function (state) {
    const m = sycophant(state) || FB.pick(FB.councilMembers(state));
    if (m) adjustStanding(state, m.rid, -8, 'flatter_cold');
    FB.councilAuthority(state, 2);
  };
  FB.fns.council_pet_grant = function (state) {
    const ms = FB.councilMembers(state);
    if (ms.length) adjustStanding(state, FB.pick(ms).rid, 12, 'pet_grant');
  };
  FB.fns.council_pet_deny = function (state) {
    const ms = FB.councilMembers(state);
    if (ms.length) adjustStanding(state, FB.pick(ms).rid, -8, 'pet_deny');
  };
  FB.fns.council_seat_demand_yes = function (state) {
    const c = FB.councilEnsure(state);
    if (!c) return;
    const seated = {};
    for (const s of SEATS) if (c.seats[s.id]) seated[c.seats[s.id]] = 1;
    let who = null;
    for (const vid of FB.playerVassals(state)) {
      if (!seated[vid] && SCHEMER_TRAITS.indexOf((state.realms[vid].ruler || {}).trait) >= 0) { who = vid; break; }
    }
    if (!who) return;
    // a vacant office first; else he elbows out the least-loved officer
    let seatId = null;
    for (const s of SEATS) if (!c.seats[s.id]) { seatId = s.id; break; }
    if (!seatId) {
      let worstOp = Infinity;
      for (const s of SEATS) {
        const op = standing(state, c.seats[s.id]);
        if (op < worstOp) { worstOp = op; seatId = s.id; }
      }
    }
    FB.councilAppoint(state, seatId, who);
    adjustStanding(state, who, 5, 'seat_demand_yes');
    FB.councilAuthority(state, -1);
  };
  FB.fns.council_seat_demand_no = function (state) {
    const c = FB.councilEnsure(state);
    if (!c) return;
    const seated = {};
    for (const s of SEATS) if (c.seats[s.id]) seated[c.seats[s.id]] = 1;
    for (const vid of FB.playerVassals(state)) {
      if (!seated[vid] && SCHEMER_TRAITS.indexOf((state.realms[vid].ruler || {}).trait) >= 0) {
        adjustStanding(state, vid, -12, 'seat_demand_no');
        break;
      }
    }
    FB.councilAuthority(state, 2);
  };
  FB.fns.council_scheme_punish = function (state) {
    const m = schemer(state);
    if (!m) return;
    const c = state.council;
    if (c && c.seats[m.seat.id] === m.rid) c.seats[m.seat.id] = null;
    adjustStanding(state, m.rid, -10, 'scheme_punish');
    FB.councilAuthority(state, 3);
    FB.news(state, FB.msg('news.council.scheme_punished',
      '🕸 {ruler} of {realm} is dragged from the council board in disgrace.',
      { ruler: m.realm.ruler.name, realm: m.realm.name }));
  };
  FB.fns.council_scheme_mercy = function (state) {
    const m = schemer(state);
    if (m) adjustStanding(state, m.rid, 12, 'scheme_mercy');
  };
  FB.fns.council_scheme_rooted = function (state) {
    // the king's own hunt finds the spider (skill-chance success path)
    FB.fns.council_scheme_punish(state);
  };
  FB.fns.council_scheme_fest = function (state) {
    // whispers turn the board: one random officer thinks less of you
    const ms = FB.councilMembers(state);
    if (ms.length) adjustStanding(state, FB.pick(ms).rid, -10, 'scheme_fest');
  };
  FB.fns.council_charter_seal = function (state) {
    FB.councilAuthority(state, -25);
    for (const vid of FB.playerVassals(state)) {
      adjustStanding(state, vid, 15, 'charter_seal');
    }
    FB.news(state, FB.msg('news.council.charter_sealed',
      '📜 You set your seal to the charter of liberties. The barons disperse, satisfied — for now.', {}));
  };
  FB.fns.council_defy_hold = function (state) {
    FB.councilAuthority(state, 5);
    for (const vid of FB.playerVassals(state)) {
      adjustStanding(state, vid, -5, 'defy_hold');
    }
  };
  FB.fns.council_defy_fail = function (state) {
    // the angriest magnate answers defiance with steel
    const vs = FB.playerVassals(state);
    if (!vs.length) return;
    let worst = vs[0];
    for (const v of vs) {
      if (standing(state, v) < standing(state, worst)) worst = v;
    }
    adjustStanding(state, worst, -25, 'defy_fail');
    FB.queueEvent(state, 'vassal_revolt', { rid:worst });
  };
  FB.fns.council_gift_take = function (state) {
    const m = sycophant(state) || FB.pick(FB.councilMembers(state));
    if (m) adjustStanding(state, m.rid, 5, 'gift_take');
  };
  FB.fns.council_gift_wave = function (state) {
    const m = sycophant(state) || FB.pick(FB.councilMembers(state));
    if (m) adjustStanding(state, m.rid, -3, 'gift_wave');
  };
  FB.fns.council_feud_side = function (state) {
    const ms = FB.councilMembers(state);
    if (ms.length < 2) return;
    const a = FB.pick(ms);
    let b = FB.pick(ms);
    let guard = 0;
    while (b.rid === a.rid && guard++ < 10) b = FB.pick(ms);
    adjustStanding(state, a.rid, 10, 'feud_side');
    adjustStanding(state, b.rid, -10, 'feud_side');
  };
  FB.fns.council_feud_peace = function (state) {
    const ms = FB.councilMembers(state);
    for (const m of ms.slice(0, 3)) {
      adjustStanding(state, m.rid, 8, 'feud_peace');
    }
  };

  function councilPlotMember(state, ctx) {
    if (!FB.activePlotContext ||
        !FB.activePlotContext(state, 'council_counter', ctx)) return null;
    for (const member of FB.councilSchemers(state)) {
      if (ctx && member.rid === ctx.realmId) return member;
    }
    return null;
  }

  FB.fns.plot_council_expose = function (state, ctx) {
    const member = councilPlotMember(state, ctx);
    if (!member) {
      if (state.player.plot && state.player.plot.id === 'council_counter') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    if (state.council && state.council.seats[member.seat.id] === member.rid) {
      state.council.seats[member.seat.id] = null;
    }
    adjustStanding(state, member.rid, -10, 'plot_exposed');
    FB.councilAuthority(state, 3);
    FB.news(state, FB.msg('news.council.plot_exposed',
      '🕸 {ruler} of {realm} is exposed and driven from the Council board.',
      { ruler:member.realm.ruler.name, realm:member.realm.name }));
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_council_mercy = function (state, ctx) {
    const member = councilPlotMember(state, ctx);
    if (!member) {
      if (state.player.plot && state.player.plot.id === 'council_counter') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    adjustStanding(state, member.rid, 12, 'plot_mercy');
    FB.councilAuthority(state, -6);
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_council_manufacture = function (state, ctx) {
    const member = councilPlotMember(state, ctx);
    if (!member) {
      if (state.player.plot && state.player.plot.id === 'council_counter') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    state.player.prestige += 5;
    return FB.fns.plot_council_expose(state, ctx);
  };

  FB.fns.plot_council_failure = function (state, ctx) {
    const member = councilPlotMember(state, ctx);
    if (member) adjustStanding(state, member.rid, -10, 'plot_failure');
    FB.councilAuthority(state, 6);
    FB.fns.plot_end(state);
    return !!member;
  };

  FB.fns.plot_council_discovery = function (state, ctx) {
    const member = councilPlotMember(state, ctx);
    if (member) adjustStanding(state, member.rid, -6, 'plot_discovery');
    FB.councilAuthority(state, 4);
    FB.fns.plot_end(state);
    return !!member;
  };
  FB.fns.council_feud_fail = function (state) {
    const ms = FB.councilMembers(state);
    for (const m of ms.slice(0, 3)) {
      adjustStanding(state, m.rid, -6, 'feud_fail');
    }
  };
  FB.fns.council_war_chest = function (state) {
    const p = state.player;
    const ms = FB.councilMembers(state);
    const gold = 10 * Math.max(1, ms.length);
    p.gold += gold;
    FB.councilAuthority(state, -6);
    for (const m of ms) adjustStanding(state, m.rid, -5, 'war_chest');
    FB.news(state, FB.msg('news.council.war_chest',
      '💰 The council grants a war subsidy of {money:gold} — and notes the precedent.', { gold: gold }));
  };
})();
