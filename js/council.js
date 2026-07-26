/* Fallowborn — the Royal Council (tier 6+): the great officers of the crown.
   A king does not rule alone: his vassal magnates fill five household offices
   (Seneschal, Constable, Treasurer, Almoner, Chamberlain), each granting a
   bonus while its holder serves. But magnates have tempers — flatterers curry
   favor, the ambitious scheme, and high-handed rule (extraordinary taxes,
   revocations) raises crown authority while souring opinion, until the
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
    // fill vacancies: the greatest vassals first (rank, then favor)
    const seated = {};
    for (const s of SEATS) if (c.seats[s.id]) seated[c.seats[s.id]] = 1;
    const cand = FB.playerVassals(state).filter(function (vid) { return !seated[vid]; });
    cand.sort(function (a, b) {
      const ra = state.realms[a], rb = state.realms[b];
      if ((rb.rank || 1) !== (ra.rank || 1)) return (rb.rank || 1) - (ra.rank || 1);
      return FB.liegeOpOf(state, b) - FB.liegeOpOf(state, a);
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

  /* sum of office bonuses of one key (tax/levy/build/piety/plot) */
  FB.councilBonus = function (state, key) {
    if (!FB.councilActive(state) || !state.council || !state.council.seats) return 0;
    let sum = 0;
    for (const s of SEATS) {
      if (s.bonusKey !== key) continue;
      const rid = state.council.seats[s.id];
      if (!rid) continue;
      const r = state.realms[rid];
      if (!r || !r.alive || r.liege !== 'player') continue;
      if (FB.liegeOpOf(state, rid) <= -50) continue; // a vassal in disgrace serves no longer
      sum += s.bonusAmt;
    }
    return sum;
  };

  FB.councilAvgOpinion = function (state) {
    const ms = FB.councilMembers(state);
    if (!ms.length) return 0;
    let sum = 0;
    for (const m of ms) sum += FB.liegeOpOf(state, m.rid);
    return sum / ms.length;
  };

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
    FB.adjustLiegeOp(state, rid, 10);
    if (old && old !== rid) FB.adjustLiegeOp(state, old, -8);
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
    FB.adjustLiegeOp(state, rid, -15);
    FB.councilAuthority(state, 4); // the crown asserts its prerogative
    FB.news(state, FB.msg('news.council.dismissed',
      '🏛 {ruler} of {realm} is dismissed from your council — and will not forget it.',
      { ruler: r ? r.ruler.name : '?', realm: r ? r.name : '?' }));
  };

  /* a gold gift to a sworn man — the universal solvent of court politics */
  FB.councilGift = function (state, rid) {
    const p = state.player;
    const B = FBDATA.balance;
    const cost = B.councilGiftCost || 25;
    const r = rid && state.realms[rid];
    if (!r || !r.alive || r.liege !== 'player' || p.gold < cost) return false;
    p.gold -= cost;
    FB.adjustLiegeOp(state, rid, B.councilGiftOpinion || 15);
    FB.news(state, FB.msg('news.council.gift',
      '🎁 {ruler} of {realm} receives your gift with many thanks.',
      { ruler: r.ruler.name, realm: r.name }));
    return true;
  };

  /* ---------- event helpers (FB.fns.council_* — triggers & effects) ---------- */

  function memberByTemper(state, traits, minOp, maxOp) {
    const ms = FB.councilMembers(state);
    const pool = [];
    for (const m of ms) {
      const op = FB.liegeOpOf(state, m.rid);
      if (traits && traits.indexOf(m.realm.ruler.trait) < 0) continue;
      if (minOp !== undefined && op < minOp) continue;
      if (maxOp !== undefined && op > maxOp) continue;
      pool.push(m);
    }
    return pool.length ? FB.pick(pool) : null;
  }
  function schemer(state) { return memberByTemper(state, SCHEMER_TRAITS, undefined, -1); }
  function sycophant(state) { return memberByTemper(state, null, 20); }

  FB.fns = FB.fns || {};
  /* triggers */
  FB.fns.council_has_members = function (state) { return FB.councilMembers(state).length > 0; };
  FB.fns.council_two_members = function (state) { return FB.councilMembers(state).length >= 2; };
  FB.fns.council_has_schemer = function (state) { return !!schemer(state); };
  FB.fns.council_has_sycophant = function (state) { return !!sycophant(state); };
  FB.fns.council_scheme_ripe = function (state) {
    // the plot thickens while no Chamberlain watches the shadows
    if (!schemer(state)) return false;
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
    return c.authority >= (FBDATA.balance.councilCharterAbove || 70) && FB.councilAvgOpinion(state) < -5;
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
    if (m) FB.adjustLiegeOp(state, m.rid, 8);
  };
  FB.fns.council_flatter_cold = function (state) {
    const m = sycophant(state) || FB.pick(FB.councilMembers(state));
    if (m) FB.adjustLiegeOp(state, m.rid, -8);
    FB.councilAuthority(state, 2);
  };
  FB.fns.council_pet_grant = function (state) {
    const ms = FB.councilMembers(state);
    if (ms.length) FB.adjustLiegeOp(state, FB.pick(ms).rid, 12);
  };
  FB.fns.council_pet_deny = function (state) {
    const ms = FB.councilMembers(state);
    if (ms.length) FB.adjustLiegeOp(state, FB.pick(ms).rid, -8);
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
        const op = FB.liegeOpOf(state, c.seats[s.id]);
        if (op < worstOp) { worstOp = op; seatId = s.id; }
      }
    }
    FB.councilAppoint(state, seatId, who);
    FB.adjustLiegeOp(state, who, 5);
    FB.councilAuthority(state, -1);
  };
  FB.fns.council_seat_demand_no = function (state) {
    const c = FB.councilEnsure(state);
    if (!c) return;
    const seated = {};
    for (const s of SEATS) if (c.seats[s.id]) seated[c.seats[s.id]] = 1;
    for (const vid of FB.playerVassals(state)) {
      if (!seated[vid] && SCHEMER_TRAITS.indexOf((state.realms[vid].ruler || {}).trait) >= 0) {
        FB.adjustLiegeOp(state, vid, -12);
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
    FB.adjustLiegeOp(state, m.rid, -10);
    FB.councilAuthority(state, 3);
    FB.news(state, FB.msg('news.council.scheme_punished',
      '🕸 {ruler} of {realm} is dragged from the council board in disgrace.',
      { ruler: m.realm.ruler.name, realm: m.realm.name }));
  };
  FB.fns.council_scheme_mercy = function (state) {
    const m = schemer(state);
    if (m) FB.adjustLiegeOp(state, m.rid, 12);
  };
  FB.fns.council_scheme_rooted = function (state) {
    // the king's own hunt finds the spider (skill-chance success path)
    FB.fns.council_scheme_punish(state);
  };
  FB.fns.council_scheme_fest = function (state) {
    // whispers turn the board: one random officer thinks less of you
    const ms = FB.councilMembers(state);
    if (ms.length) FB.adjustLiegeOp(state, FB.pick(ms).rid, -10);
  };
  FB.fns.council_charter_seal = function (state) {
    FB.councilAuthority(state, -25);
    for (const vid of FB.playerVassals(state)) FB.adjustLiegeOp(state, vid, 15);
    FB.news(state, FB.msg('news.council.charter_sealed',
      '📜 You set your seal to the charter of liberties. The barons disperse, satisfied — for now.', {}));
  };
  FB.fns.council_defy_hold = function (state) {
    FB.councilAuthority(state, 5);
    for (const vid of FB.playerVassals(state)) FB.adjustLiegeOp(state, vid, -5);
  };
  FB.fns.council_defy_fail = function (state) {
    // the angriest magnate answers defiance with steel
    const vs = FB.playerVassals(state);
    if (!vs.length) return;
    let worst = vs[0];
    for (const v of vs) if (FB.liegeOpOf(state, v) < FB.liegeOpOf(state, worst)) worst = v;
    FB.adjustLiegeOp(state, worst, -25);
    FB.queueEvent(state, 'vassal_revolt', { rid:worst });
  };
  FB.fns.council_gift_take = function (state) {
    const m = sycophant(state) || FB.pick(FB.councilMembers(state));
    if (m) FB.adjustLiegeOp(state, m.rid, 5);
  };
  FB.fns.council_gift_wave = function (state) {
    const m = sycophant(state) || FB.pick(FB.councilMembers(state));
    if (m) FB.adjustLiegeOp(state, m.rid, -3);
  };
  FB.fns.council_feud_side = function (state) {
    const ms = FB.councilMembers(state);
    if (ms.length < 2) return;
    const a = FB.pick(ms);
    let b = FB.pick(ms);
    let guard = 0;
    while (b.rid === a.rid && guard++ < 10) b = FB.pick(ms);
    FB.adjustLiegeOp(state, a.rid, 10);
    FB.adjustLiegeOp(state, b.rid, -10);
  };
  FB.fns.council_feud_peace = function (state) {
    const ms = FB.councilMembers(state);
    for (const m of ms.slice(0, 3)) FB.adjustLiegeOp(state, m.rid, 8);
  };
  FB.fns.council_feud_fail = function (state) {
    const ms = FB.councilMembers(state);
    for (const m of ms.slice(0, 3)) FB.adjustLiegeOp(state, m.rid, -6);
  };
  FB.fns.council_war_chest = function (state) {
    const p = state.player;
    const ms = FB.councilMembers(state);
    const gold = 10 * Math.max(1, ms.length);
    p.gold += gold;
    FB.councilAuthority(state, -6);
    for (const m of ms) FB.adjustLiegeOp(state, m.rid, -5);
    FB.news(state, FB.msg('news.council.war_chest',
      '💰 The council grants a war subsidy of {money:gold} — and notes the precedent.', { gold: gold }));
  };
})();
