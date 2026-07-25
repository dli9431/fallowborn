/* Fallowborn — the Estates (vassal tiers 3–5): the liege's assembly of lords.
   A sworn baron, count, or duke does not only pay and serve — he sits with the
   other lords of the realm when the liege summons the estates, and there the
   terms of service are haggled over: the aid (the liege's cut of noble
   revenue, balance.parliamentAidBase, moved one parliamentAidStep per vote
   between parliamentAidMin/Max) and scutage (silver in place of banner
   service). Terms live on the liege realm (`liege.obl`) so they bind the
   realm, survive saves with no migration, and reset only when you kneel to a
   different lord. A voice in the hall scales with rank — a duke's word weighs
   more than a baron's — plus diplomacy, prestige, and the liege's own favor
   (FB.parliamentVoteChance, the `parliament_vote` chance fn). Sessions arrive
   as queued events once a year (FB.parliamentYearly); between sittings the
   player can buy a motion of their own via the 🏛 Estates deed. The king-side
   mirror of all this is the royal council (js/council.js). See
   docs/designs/parliament.md. */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* the estates sit for sworn lords below the crown: baron, count, duke */
  FB.parliamentActive = function (state) {
    const p = state.player;
    if (p.tier < 3 || p.tier > 5 || !p.liege) return false;
    const liege = state.realms[p.liege];
    return !!(liege && liege.alive);
  };

  /* create/heal the terms of service on the liege realm — old saves and new
     lieges get the customary terms on first sight, no save-version bump */
  FB.parliamentEnsure = function (state) {
    if (!FB.parliamentActive(state)) return null;
    const liege = state.realms[state.player.liege];
    if (!liege.obl) liege.obl = { aid: FBDATA.balance.parliamentAidBase || 0.25, scutage: false };
    if (liege.obl.aid === undefined) liege.obl.aid = FBDATA.balance.parliamentAidBase || 0.25;
    return liege.obl;
  };

  /* the liege's current cut of the player's noble revenue (FB.playerTax) */
  FB.parliamentAid = function (state) {
    const obl = FB.parliamentEnsure(state);
    return obl ? obl.aid : (FBDATA.balance.parliamentAidBase || 0.25);
  };

  /* scutage in force: the estates voted silver for service (liege_summons) */
  FB.parliamentScutage = function (state) {
    const obl = FB.parliamentEnsure(state);
    return !!(obl && obl.scutage);
  };

  /* the player's voice in the hall, 0.1–0.85: rank carries weight (a duke
     out-speaks a baron), then diplomacy, a great name, and the liege's love */
  FB.parliamentVoteChance = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    let c = 0.30 + ([0, 0, 0, 0.05, 0.12, 0.20][p.tier] || 0);
    c += FB.skillOf(me, 'dip') * 0.02 + p.prestige / 1200 + (p.liegeOp || 0) / 400;
    return FB.clamp(c, 0.1, 0.85);
  };

  /* move the aid one step (dir +1/-1), clamped to custom; returns the new rate */
  FB.parliamentAidAdjust = function (state, dir) {
    const obl = FB.parliamentEnsure(state);
    if (!obl) return null;
    const B = FBDATA.balance;
    obl.aid = FB.clamp(
      Math.round((obl.aid + dir * (B.parliamentAidStep || 0.05)) * 100) / 100,
      B.parliamentAidMin || 0.10, B.parliamentAidMax || 0.40);
    return obl.aid;
  };

  /* once a year the liege may summon the estates: a war subsidy while he
     fights, a demand for a greater aid when his coffers thin, a fellow lord's
     grievance — or a quiet sitting of mixed business */
  FB.parliamentYearly = function (state) {
    if (!FB.parliamentActive(state)) return;
    const B = FBDATA.balance;
    if (!FB.chance(B.parliamentSessionChance || 0.5)) return;
    const obl = FB.parliamentEnsure(state);
    let id = 'parliament_session';
    if (FB.isRealmAtWar(state, state.player.liege) && FB.chance(0.6)) id = 'parliament_subsidy';
    else if (obl.aid < (B.parliamentAidMax || 0.40) - 0.001 && FB.chance(0.5)) id = 'parliament_aid_hike';
    else if (FB.chance(0.35)) id = 'parliament_grievance';
    state.eventQueue.push({ id: id });
  };

  /* ---------- event helpers (FB.fns.parliament_* — triggers & effects) ---------- */

  FB.fns = FB.fns || {};
  /* triggers (also usable as option `require` gates) */
  FB.fns.parliament_has_scutage = function (state) { return FB.parliamentScutage(state); };
  FB.fns.parliament_redress_possible = function (state) {
    return FB.parliamentAid(state) > (FBDATA.balance.parliamentAidMin || 0.10) + 0.001;
  };
  FB.fns.parliament_scutage_possible = function (state) { return !FB.parliamentScutage(state); };

  /* effects */
  FB.fns.parliament_aid_up = function (state) {
    const aid = FB.parliamentAidAdjust(state, 1);
    if (aid === null) return;
    FB.news(state, FB.msg('news.parliament.aid_up',
      '⚖ The estates grant the aid — {liege}’s cut of your revenue rises to {pct}%.',
      { liege: state.realms[state.player.liege].name, pct: Math.round(aid * 100) }));
  };
  FB.fns.parliament_aid_hike_rebuff = function (state) {
    // the hall refuses the crown's demand; the crown remembers the ringleader
    FB.adjustLiegeOp(state, state.player.liege, -12);
  };
  FB.fns.parliament_redress_won = function (state) {
    const aid = FB.parliamentAidAdjust(state, -1);
    if (aid === null) return;
    // the liege is bound by the vote — and displeased with its author
    FB.adjustLiegeOp(state, state.player.liege, -5);
    FB.news(state, FB.msg('news.parliament.aid_down',
      '⚖ The estates vote redress — {liege}’s cut of your revenue falls to {pct}%.',
      { liege: state.realms[state.player.liege].name, pct: Math.round(aid * 100) }));
  };
  FB.fns.parliament_redress_lost = function (state) {
    FB.adjustLiegeOp(state, state.player.liege, -8);
  };
  FB.fns.parliament_scutage_pass = function (state) {
    const obl = FB.parliamentEnsure(state);
    if (!obl) return;
    obl.scutage = true;
    // the crown takes its pound in coin instead: a small standing rise in the aid
    const B = FBDATA.balance;
    obl.aid = FB.clamp(Math.round((obl.aid + 0.02) * 100) / 100,
      B.parliamentAidMin || 0.10, B.parliamentAidMax || 0.40);
    FB.adjustLiegeOp(state, state.player.liege, 5);
    FB.news(state, FB.msg('news.parliament.scutage',
      '🛡 The estates vote scutage — silver, not spears, when {liege} calls the banners (the aid rises to {pct}%).',
      { liege: state.realms[state.player.liege].name, pct: Math.round(obl.aid * 100) }));
  };
  FB.fns.parliament_subsidy_pay = function (state) {
    const p = state.player;
    const gold = FBDATA.balance.parliamentSubsidyGold || 20;
    if (p.gold < gold) return;
    p.gold -= gold;
    FB.adjustLiegeOp(state, state.player.liege, 12);
    FB.news(state, FB.msg('news.parliament.subsidy',
      '🪙 The estates vote {liege} a war subsidy of {money:gold} — your name was spoken warmly in the hall.',
      { liege: state.realms[state.player.liege].name, gold: gold }));
  };
})();
