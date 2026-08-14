/* Fallowborn — the Estates (vassal tiers 3–5): the liege's assembly of lords.
   A sworn baron, count, or duke does not only pay and serve — he sits with the
   other lords of the realm when the liege summons the estates, and there the
   terms of service are haggled over: the aid (the liege's cut of noble
   revenue, balance.parliamentAidBase, moved one parliamentAidStep per vote
   between parliamentAidMin/Max) and scutage (silver in place of banner
   service). Terms live on the liege realm (`liege.obl`) so they bind the
   realm, survive saves with no migration, and reset only when you kneel to a
   different lord. A voice in the hall scales with rank — a duke's word weighs
   more than a baron's — plus diplomacy, prestige, and Standing with the liege
   (FB.parliamentVoteChance, the `parliament_vote` chance fn). Sessions arrive
   as queued events once a year (FB.parliamentYearly); between sittings the
   player can begin a 90-day bloc campaign of their own via the 🏛 Estates
   deed, lobby one undecided bloc, and call or withdraw the vote. The motions
   themselves are not hard-coded here: they are entries in the policy catalog
   (`data/policies.js`), each declaring its family (which sets the per-year
   cooldown), cost, gate, bloc posture, and result event. The king-side
   mirror of all this is the royal council (js/council.js). See
   docs/designs/parliament.md. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function liegeStanding(state) {
    return FB.standingOf(state, {
      kind:'realm', id:state.player.liege
    });
  }

  function adjustLiegeStanding(state, amount, source) {
    return FB.adjustStanding(state, {
      kind:'realm', id:state.player.liege
    }, amount, 'parliament:' + source);
  }

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
    /* Per-family motion cooldowns (data/policies.js families). A legacy save
       with only the single yearly `lastMotion` stamp is treated as having used
       every family for the remainder of that year. */
    if (!liege.obl.motionYears || typeof liege.obl.motionYears !== 'object' ||
        Array.isArray(liege.obl.motionYears)) {
      const used = liege.obl.lastMotion === state.date.year;
      liege.obl.motionYears = {};
      if (used) {
        for (const entry of FB.policyList ? FB.policyList() : []) {
          if (entry.def && entry.def.family) {
            liege.obl.motionYears[entry.def.family] = state.date.year;
          }
        }
      }
    }
    return liege.obl;
  };

  /* Read the current terms without creating them. Simulation boundaries and
     successful motions still use parliamentEnsure; overview sheets do not.
     The per-family cooldown map is projected read-only for legacy saves that
     carry only the single yearly `lastMotion` stamp: every family reads as
     used for the remainder of that year. */
  FB.parliamentTerms = function (state) {
    const liege = state.player.liege && state.realms[state.player.liege];
    const stored = liege && liege.obl;
    let motionYears = null;
    if (stored && stored.motionYears &&
        typeof stored.motionYears === 'object' &&
        !Array.isArray(stored.motionYears)) {
      motionYears = Object.assign({}, stored.motionYears);
    } else {
      motionYears = {};
      if (stored && stored.lastMotion === state.date.year) {
        for (const entry of FB.policyList ? FB.policyList() : []) {
          if (entry.def && entry.def.family) {
            motionYears[entry.def.family] = state.date.year;
          }
        }
      }
    }
    return {
      aid:stored && stored.aid !== undefined
        ? stored.aid : (FBDATA.balance.parliamentAidBase || 0.25),
      scutage:!!(stored && stored.scutage),
      lastMotion:stored && stored.lastMotion !== undefined
        ? stored.lastMotion : null,
      motionYears:motionYears,
      revocationConsent:!!(stored && stored.revocationConsent),
      formed:!!stored
    };
  };

  /* the liege's current cut of the player's noble revenue (FB.playerTax) */
  FB.parliamentAid = function (state) {
    return FB.parliamentTerms(state).aid;
  };

  /* scutage in force: the estates voted silver for service (liege_summons) */
  FB.parliamentScutage = function (state) {
    return FB.parliamentTerms(state).scutage;
  };

  /* the player's voice in the hall, 0.1–0.85: rank carries weight (a duke
     out-speaks a baron), then diplomacy, a great name, and the liege's love */
  FB.parliamentVoteBreakdown = function (state, redress) {
    const p = state.player;
    const me = state.chars[p.charId];
    const evidence = p.flags && p.flags.plot_obligation_evidence;
    const out = {
      base:0.30,
      rank:([0, 0, 0, 0.05, 0.12, 0.20][p.tier] || 0),
      diplomacy:(FB.skillSnapshot
        ? FB.skillSnapshot(state, me, 'dip')
        : FB.skillOf(me, 'dip')) * 0.02,
      prestige:p.prestige / 1200,
      standing:liegeStanding(state) / 400,
      traits:FB.traitBonus
        ? FB.traitBonus(me, 'assembly', 'voteChance') : 0,
      evidence:redress && evidence && evidence.realmId === p.liege &&
        evidence.institution === 'estates' && evidence.contractId === 'obl'
        ? 0.15 : 0
    };
    out.raw = out.base + out.rank + out.diplomacy + out.prestige +
      out.standing + out.traits + out.evidence;
    out.total = FB.clamp(out.raw, 0.1, 0.85);
    return out;
  };

  FB.parliamentVoteChance = function (state, redress) {
    return FB.parliamentVoteBreakdown(state, redress).total;
  };

  /* The locale-neutral Estates projection used by Governance and the
     focused management sheet. It deliberately does not heal liege.obl. */
  FB.parliamentSummary = function (state) {
    if (!FB.parliamentActive(state)) return null;
    const terms = FB.parliamentTerms(state);
    const politics = FB.politicalSummary
      ? FB.politicalSummary(state) : null;
    const pending = [];
    for (const item of (state.eventQueue || [])) {
      if (item && typeof item.id === 'string' &&
          item.id.indexOf('parliament_') === 0) pending.push(item.id);
    }
    return {
      formed:terms.formed,
      aid:terms.aid,
      scutage:terms.scutage,
      lastMotion:terms.lastMotion,
      motionUsed:terms.lastMotion === state.date.year,
      motionCost:FBDATA.balance.parliamentMotionCost || 15,
      sessionChance:FBDATA.balance.parliamentSessionChance || 0.5,
      pendingEventIds:pending,
      vote:FB.parliamentVoteBreakdown(state),
      redressVote:FB.parliamentVoteBreakdown(state, true),
      pendingMotion:politics ? politics.pendingMotion : null,
      motionForecast:politics ? politics.motion : null
    };
  };

  function policyFamilyName(family) {
    switch (family) {
      case 'aid': return FB.T('aid');
      case 'service': return FB.T('service');
      case 'commerce': return FB.T('commerce');
      case 'custom': return FB.T('custom');
      case 'war': return FB.T('war');
      default: return FB.T('policy');
    }
  }

  FB.parliamentMotionStatus = function (state, motionId) {
    if (!FB.parliamentActive(state)) {
      return {
        ready:false,
        reason:FB.T('The Estates do not apply to your current political position.')
      };
    }
    const def = FB.policyDef ? FB.policyDef(motionId) : null;
    if (!def) {
      return {
        ready:false,
        reason:FB.T('That motion is not recognized by the Estates.')
      };
    }
    if (def.requiresTech && FB.techRequirementStatus) {
      const technology = FB.techRequirementStatus(state, def.requiresTech);
      if (!technology.ready) {
        return {
          ready:false,
          techLocked:true,
          requiredTech:technology.requirements,
          missingTech:technology.missing,
          reason:FB.techRequirementReason(state, def.requiresTech)
        };
      }
    }
    const politics = FB.politicalSummary
      ? FB.politicalSummary(state) : null;
    if (!politics) {
      return {
        ready:false,
        reason:FB.T('No valid political court is available for this motion.')
      };
    }
    const pending = politics && politics.pendingMotion;
    if (pending) {
      return {
        ready:false,
        pending:true,
        reason:FB.T('A motion is already being campaigned before the Estates.')
      };
    }
    const terms = FB.parliamentTerms(state);
    const cost = isFinite(Number(def.cost))
      ? Number(def.cost) : (FBDATA.balance.parliamentMotionCost || 15);
    /* A policy's own gate returns true, or the exact localized block reason.
       Boolean gates from older data get a generic reason. The gate answers
       before the cooldown: 'your county already holds the charter' is more
       useful than 'the estates have heard commerce business'. */
    if (def.gate) {
      const fn = FB.fns[def.gate];
      const verdict = fn ? fn(state) : false;
      if (verdict !== true) {
        return {
          ready:false,
          reason:typeof verdict === 'string' ? verdict :
            FB.T('That policy cannot be brought before the Estates now.')
        };
      }
    }
    if (!def.emergency && def.family &&
        terms.motionYears[def.family] === state.date.year) {
      return {
        ready:false,
        reason:FB.T('The Estates have already heard {family} business this year.', {
          family:policyFamilyName(def.family)
        })
      };
    }
    if (state.player.gold < cost) {
      return {
        ready:false,
        reason:FB.T('Requires {money:cost}; you have {money:current}.', {
          cost:cost, current:Math.floor(state.player.gold)
        })
      };
    }
    return { ready:true, reason:'' };
  };

  FB.parliamentBeginMotion = function (state, motionId) {
    const status = FB.parliamentMotionStatus(state, motionId);
    if (!status.ready) return false;
    const def = FB.policyDef ? FB.policyDef(motionId) : null;
    if (!def) return false;
    const politics = FB.ensurePolitics ? FB.ensurePolitics(state) : null;
    if (!politics || politics.polityId !== state.player.liege ||
        politics.pendingMotion) return false;
    const terms = FB.parliamentEnsure(state);
    if (!terms) return false;
    const cost = isFinite(Number(def.cost))
      ? Number(def.cost) : (FBDATA.balance.parliamentMotionCost || 15);
    state.player.gold -= cost;
    terms.lastMotion = state.date.year;
    if (def.family) terms.motionYears[def.family] = state.date.year;
    politics.pendingMotion = {
      id:'motion:' + politics.polityId + ':' + state.date.year + ':' +
        state.turn + ':' + motionId,
      motionId:motionId,
      family:def.family || null,
      polityId:politics.polityId,
      proposerHouseId:'player',
      startedTurn:state.turn,
      expiresTurn:state.turn + 90,
      locationId:state.player.provinceId,
      pledges:{},
      lobby:{ used:false, blocId:null, success:null },
      technologyApproved:true,
      customaryLawAtStart:FB.techRequirementMet
        ? FB.techRequirementMet(state, 'customary_law') : false,
      result:null
    };
    return true;
  };
  /* Compatibility entry point retained for older UI mods. */
  FB.parliamentMove = FB.parliamentBeginMotion;

  FB.parliamentLobbyStatus = function (state, blocId) {
    const politics = FB.politicalSummary
      ? FB.politicalSummary(state) : null;
    const pending = politics && politics.pendingMotion;
    if (!FB.parliamentActive(state) || !pending ||
        pending.polityId !== state.player.liege) {
      return {
        ready:false,
        reason:FB.T('No Estates motion is currently being campaigned.')
      };
    }
    if (pending.result) {
      return {
        ready:false,
        reason:FB.T('The motion has already been called to a vote.')
      };
    }
    if (pending.lobby && pending.lobby.used) {
      return {
        ready:false,
        reason:FB.T('Your one lobbying attempt has already been used.')
      };
    }
    const forecast = politics.motion;
    let target = null;
    for (const bloc of forecast ? forecast.blocs : []) {
      if (bloc.id === blocId) {
        target = bloc;
        break;
      }
    }
    if (!target || target.posture !== 'undecided') {
      return {
        ready:false,
        reason:FB.T('Only an undecided bloc can be targeted for lobbying.')
      };
    }
    return {
      ready:true,
      reason:'',
      blocId:target.id,
      chance:(target.naturalSupportChance + forecast.playerVoteChance) / 2
    };
  };

  FB.parliamentLobbyMotion = function (state, blocId) {
    const politics = FB.ensurePolitics ? FB.ensurePolitics(state) : null;
    const pending = politics && politics.pendingMotion;
    const status = FB.parliamentLobbyStatus(state, blocId);
    if (!pending || !status.ready) return false;
    const success = FB.chance(status.chance);
    pending.lobby = {
      used:true,
      blocId:blocId,
      success:success
    };
    if (success) pending.pledges[blocId] = 'support';
    return {
      ok:true,
      success:success,
      chance:status.chance,
      blocId:blocId
    };
  };

  FB.parliamentCallVote = function (state) {
    const politics = FB.ensurePolitics ? FB.ensurePolitics(state) : null;
    const pending = politics && politics.pendingMotion;
    if (!FB.parliamentActive(state) || !pending || pending.result ||
        pending.polityId !== state.player.liege) return false;
    const forecast = FB.politicalMotionForecast &&
      FB.politicalMotionForecast(state, pending.motionId);
    if (!forecast) return false;
    const outcomes = {};
    const ordered = forecast.blocs.slice().sort(function (a, b) {
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    for (const bloc of ordered) {
      if (bloc.posture === 'undecided') {
        outcomes[bloc.id] = FB.chance(bloc.naturalSupportChance)
          ? 'support' : 'oppose';
      } else {
        outcomes[bloc.id] = bloc.posture;
      }
    }
    pending.result = {
      passed:false,
      outcomes:outcomes,
      talliedTurn:state.turn
    };
    const resultForecast = FB.politicalMotionForecast(
      state, pending.motionId);
    pending.result.passed =
      resultForecast.supportInfluence >= resultForecast.majority;
    const def = FB.policyDef ? FB.policyDef(pending.motionId) : null;
    const resultEvent = def && typeof def.resultEvent === 'string'
      ? def.resultEvent : 'parliament_' + pending.motionId;
    FB.queueEvent(state, resultEvent, {
      locationId:pending.locationId || state.player.provinceId,
      politicsPolityId:pending.polityId,
      politicsPendingId:pending.id,
      politicsMotionId:pending.motionId,
      politicsResult:pending.result.passed ? 'pass' : 'fail'
    });
    return resultForecast;
  };

  FB.parliamentWithdrawMotion = function (state) {
    const politics = state.politics;
    const pending = politics && politics.pendingMotion;
    if (!pending || pending.result) return false;
    politics.pendingMotion = null;
    return true;
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

  /* The locale-neutral agenda pool keeps annual cadence separate from story
     eligibility. Local disputes stay attached to the snapshotted home county;
     wartime service business replaces the peacetime charter/relief briefs. */
  FB.parliamentSessionCandidates = function (state) {
    if (!FB.parliamentActive(state)) return [];
    const B = FBDATA.balance;
    const terms = FB.parliamentTerms(state);
    const pid = state.player.provinceId;
    const has = function (id) {
      return !!(pid && FB.hasModifier && FB.hasModifier(state, id, pid));
    };
    const out = ['parliament_session', 'parliament_grievance'];
    if (FB.isRealmAtWar(state, state.player.liege)) {
      out.push('parliament_subsidy', 'parliament_levy_concession');
    } else {
      if ((!FB.techRequirementMet || FB.techRequirementMet(state,
          ['urban_markets','authenticated_seals'])) &&
          !has('market_charter') && !has('contested_tolls')) {
        out.push('parliament_market_charter');
      }
      if (!has('levy_exemption') && !has('settlement_grudge')) {
        out.push('parliament_sanctuary_relief');
      }
    }
    if (terms.aid < (B.parliamentAidMax || 0.40) - 0.001 &&
        !terms.revocationConsent) {
      out.push('parliament_aid_hike');
    }
    if (has('contested_tolls') || has('settlement_grudge')) {
      out.push('parliament_local_redress');
    }
    return out;
  };

  /* Once a year the liege may summon the estates. The session chance remains
     unchanged; the expanded candidate pool supplies the authored agenda. */
  FB.parliamentYearly = function (state) {
    if (!FB.parliamentActive(state)) return;
    const B = FBDATA.balance;
    if (!FB.chance(B.parliamentSessionChance || 0.5)) return;
    FB.parliamentEnsure(state);
    const candidates = FB.parliamentSessionCandidates(state);
    /* Name the county explicitly. The agenda above is chosen by reading the
       modifiers on the player's home seat, but an unstamped context takes its
       locationId from FB.travelLocation, which is the visited county while a
       journey is under way. A New Year session begun on the road would then
       check, add, or remove home-county modifiers somewhere else entirely.
       The motion and pending-motion paths already stamp this. */
    if (candidates.length) {
      FB.queueEvent(state, FB.pick(candidates), {
        locationId:state.player.provinceId
      });
    }
  };

  /* ---------- event helpers (FB.fns.parliament_* — triggers & effects) ---------- */

  FB.fns = FB.fns || {};
  function pendingMotionMatches(state, ctx, result) {
    const politics = state.politics;
    const pending = politics && politics.pendingMotion;
    const court = FB.politicalCourt
      ? FB.politicalCourt(state) : null;
    return !!(FB.parliamentActive(state) && court &&
      pending && pending.result &&
      court.polityId === pending.polityId &&
      pending.polityId === state.player.liege &&
      pending.polityId === ctx.politicsPolityId &&
      pending.id === ctx.politicsPendingId &&
      pending.motionId === ctx.politicsMotionId &&
      pending.result.passed === result &&
      ctx.politicsResult === (result ? 'pass' : 'fail'));
  }
  function finishPendingMotion(state, ctx) {
    const pending = state.politics && state.politics.pendingMotion;
    if (!pending || !pending.result) return false;
    if (pendingMotionMatches(state, ctx, !!pending.result.passed)) {
      state.politics.pendingMotion = null;
      return true;
    }
    return false;
  }
  FB.fns.parliament_motion_context_valid = function (state, ctx) {
    return pendingMotionMatches(state, ctx, true) ||
      pendingMotionMatches(state, ctx, false);
  };
  FB.fns.parliament_motion_passed = function (state, ctx) {
    return pendingMotionMatches(state, ctx, true);
  };
  FB.fns.parliament_motion_failed = function (state, ctx) {
    return pendingMotionMatches(state, ctx, false);
  };
  /* triggers (also usable as option `require` gates) */
  FB.fns.parliament_has_scutage = function (state) { return FB.parliamentScutage(state); };
  FB.fns.parliament_redress_possible = function (state) {
    return FB.parliamentAid(state) > (FBDATA.balance.parliamentAidMin || 0.10) + 0.001;
  };
  FB.fns.parliament_aid_can_rise = function (state) {
    return FB.parliamentAid(state) <
      (FBDATA.balance.parliamentAidMax || 0.40) - 0.001;
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
    adjustLiegeStanding(state, -12, 'aid_hike_rebuff');
  };
  FB.fns.parliament_redress_won = function (state, ctx, ev) {
    const pending = state.politics && state.politics.pendingMotion;
    const aid = FB.parliamentAidAdjust(state, -1);
    if (aid === null) {
      finishPendingMotion(state, ctx || {});
      return;
    }
    delete state.player.flags.plot_obligation_evidence;
    /* Redress itself is foundational and remains available. Written local
       confirmation is the optional advanced result. Old pending campaigns
       predate the snapshot and are grandfathered. */
    if (pending && pending.customaryLawAtStart !== false &&
        ctx && ctx.locationId && FB.addModifier) {
      FB.addModifier(state, 'custom_confirmed', ctx.locationId, {
        sourceEventId:ev && ev.id
      });
    }
    // the liege is bound by the vote — and displeased with its author
    adjustLiegeStanding(state, -5, 'redress_won');
    FB.news(state, FB.msg('news.parliament.aid_down',
      '⚖ The estates vote redress — {liege}’s cut of your revenue falls to {pct}%.',
      { liege: state.realms[state.player.liege].name, pct: Math.round(aid * 100) }));
    finishPendingMotion(state, ctx || {});
  };
  FB.fns.parliament_redress_lost = function (state, ctx) {
    delete state.player.flags.plot_obligation_evidence;
    adjustLiegeStanding(state, -8, 'redress_lost');
    finishPendingMotion(state, ctx || {});
  };
  FB.fns.parliament_trade_redress = function (state) {
    const aid = FB.parliamentAidAdjust(state, -1);
    if (aid === null) return;
    adjustLiegeStanding(state, -5, 'trade_redress');
    FB.news(state, FB.msg('news.parliament.trade_redress',
      '⚖ The estates bind market charter and redress together — {liege}’s aid falls to {pct}%.',
      {
        liege:state.realms[state.player.liege].name,
        pct:Math.round(aid * 100)
      }));
  };
  FB.fns.parliament_scutage_pass = function (state, ctx) {
    const obl = FB.parliamentEnsure(state);
    if (!obl) {
      finishPendingMotion(state, ctx || {});
      return;
    }
    obl.scutage = true;
    // the crown takes its pound in coin instead: a small standing rise in the aid
    const B = FBDATA.balance;
    obl.aid = FB.clamp(Math.round((obl.aid + 0.02) * 100) / 100,
      B.parliamentAidMin || 0.10, B.parliamentAidMax || 0.40);
    adjustLiegeStanding(state, 5, 'scutage_pass');
    FB.news(state, FB.msg('news.parliament.scutage',
      '🛡 The estates vote scutage — silver, not spears, when {liege} calls the banners (the aid rises to {pct}%).',
      { liege: state.realms[state.player.liege].name, pct: Math.round(obl.aid * 100) }));
    finishPendingMotion(state, ctx || {});
  };
  FB.fns.parliament_scutage_lost = function (state, ctx) {
    finishPendingMotion(state, ctx || {});
  };
  FB.fns.parliament_subsidy_pay = function (state) {
    const p = state.player;
    const gold = FBDATA.balance.parliamentSubsidyGold || 20;
    if (p.gold < gold) return;
    p.gold -= gold;
    adjustLiegeStanding(state, 12, 'subsidy_pay');
    FB.news(state, FB.msg('news.parliament.subsidy',
      '💰 The estates vote {liege} a war subsidy of {money:gold} — your name was spoken warmly in the hall.',
      { liege: state.realms[state.player.liege].name, gold: gold }));
  };

  /* ---------- policy catalog gates ----------
     A `gate` fn returns true when the policy may be proposed, or the exact
     localized reason it cannot. Home-county checks use the player's seat
     (state.player.provinceId), the same convention as the session agenda. */
  FB.fns.parliament_gate_redress = function (state) {
    return FB.fns.parliament_redress_possible(state) ? true :
      FB.T('The liege’s aid is already at its customary minimum.');
  };
  FB.fns.parliament_gate_scutage = function (state) {
    return FB.fns.parliament_scutage_possible(state) ? true :
      FB.T('Scutage is already part of the terms of service.');
  };
  FB.fns.parliament_gate_emergency_subsidy = function (state) {
    if (!FB.isRealmAtWar(state, state.player.liege)) {
      return FB.T('An emergency subsidy can only be moved while the liege is at war.');
    }
    const gold = (FBDATA.balance.parliamentMotionCost || 15) +
      (FBDATA.balance.parliamentSubsidyGold || 20);
    if (state.player.gold < gold) {
      return FB.T('Requires {money:cost} for the motion and the subsidy; you have {money:current}.', {
        cost:gold, current:Math.floor(state.player.gold)
      });
    }
    return true;
  };
  FB.fns.parliament_gate_levy_relief = function (state) {
    const pid = state.player.provinceId;
    if (pid && FB.hasModifier(state, 'levy_exemption', pid)) {
      return FB.T('Your home county is already free of the levy.');
    }
    if (pid && FB.hasModifier(state, 'muster_burden', pid)) {
      return FB.T('Your home county is under an extraordinary muster; relief cannot be moved now.');
    }
    if (!FB.fns.parliament_aid_can_rise(state)) {
      return FB.T('The aid is already at its customary maximum; the estates will not trade relief for a rise that cannot be taken.');
    }
    return true;
  };
  FB.fns.parliament_gate_market_charter = function (state) {
    const pid = state.player.provinceId;
    if (pid && FB.hasModifier(state, 'market_charter', pid)) {
      return FB.T('Your home county already holds a market charter.');
    }
    if (pid && FB.hasModifier(state, 'contested_tolls', pid)) {
      return FB.T('The tolls of your home county are contested; settle that dispute first.');
    }
    return true;
  };
  FB.fns.parliament_gate_local_custom = function (state) {
    const pid = state.player.provinceId;
    if (pid && FB.hasModifier(state, 'custom_confirmed', pid)) {
      return FB.T('Your home county’s custom is already confirmed.');
    }
    return true;
  };
  FB.fns.parliament_gate_revocation_consent = function (state) {
    return FB.parliamentTerms(state).revocationConsent ?
      FB.T('The liege is already sworn to seek the estates’ consent.') : true;
  };
  FB.fns.parliament_gate_war_authorization = function (state) {
    return FB.isRealmAtWar(state, state.player.liege) ? true :
      FB.T('There is no war for the estates to authorize.');
  };
  FB.fns.parliament_gate_war_condemnation = function (state) {
    return FB.isRealmAtWar(state, state.player.liege) ? true :
      FB.T('There is no war for the estates to condemn.');
  };

  /* ---------- policy catalog effects ----------
     Every result-event option ends the pending campaign; declarative-only
     options use the generic parliament_motion_done. */
  FB.fns.parliament_motion_done = function (state, ctx) {
    finishPendingMotion(state, ctx || {});
  };
  FB.fns.parliament_emergency_subsidy_won = function (state, ctx) {
    FB.fns.parliament_subsidy_pay(state);
    finishPendingMotion(state, ctx || {});
  };
  FB.fns.parliament_levy_relief_won = function (state, ctx, ev) {
    const pid = ctx && ctx.locationId || state.player.provinceId;
    if (pid) {
      FB.addModifier(state, 'levy_exemption', pid,
        { sourceEventId:ev && ev.id });
    }
    const aid = FB.parliamentAidAdjust(state, 1);
    if (aid !== null) {
      FB.news(state, FB.msg('news.parliament.levy_relief',
        '🌾 The estates free your county from the levy — the aid rises to {pct}% in exchange.',
        { pct:Math.round(aid * 100) }));
    }
    finishPendingMotion(state, ctx || {});
  };
  FB.fns.parliament_revocation_consent_pass = function (state, ctx) {
    const obl = FB.parliamentEnsure(state);
    if (obl) obl.revocationConsent = true;
    FB.news(state, FB.msg('news.parliament.revocation_consent',
      '🗳 The estates bind {liege} to seek their consent before any new aid.',
      { liege:state.realms[state.player.liege].name }));
    finishPendingMotion(state, ctx || {});
  };

  function obligationPlotValid(state, ctx) {
    return !!(FB.activePlotContext &&
      FB.activePlotContext(state, 'feudal_obligation', ctx) &&
      ctx && ctx.realmId === state.player.liege &&
      ctx.institution === 'estates' && ctx.contractId === 'obl' &&
      FB.parliamentEnsure(state));
  }

  FB.fns.plot_obligation_evidence = function (state, ctx) {
    if (!obligationPlotValid(state, ctx)) {
      if (state.player.plot && state.player.plot.id === 'feudal_obligation') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    state.player.flags.plot_obligation_evidence = {
      realmId:ctx.realmId,
      institution:ctx.institution,
      contractId:ctx.contractId
    };
    state.player.prestige += 5;
    FB.news(state, FB.msg('news.parliament.plot_evidence',
      '⚖ Sealed tallies give your next motion for redress greater weight in the estates.',
      {}));
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_obligation_relief = function (state, ctx) {
    if (!obligationPlotValid(state, ctx)) {
      if (state.player.plot && state.player.plot.id === 'feudal_obligation') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    const aid = FB.parliamentAidAdjust(state, -1);
    adjustLiegeStanding(state, -12, 'plot_relief');
    FB.news(state, FB.msg('news.parliament.plot_relief',
      '⚖ Altered service rolls reduce the aid to {pct}%, but the liege knows whose seal is missing.',
      { pct:Math.round(aid * 100) }));
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_obligation_failure = function (state, ctx) {
    const valid = obligationPlotValid(state, ctx);
    if (valid) {
      FB.parliamentAidAdjust(state, 1);
      adjustLiegeStanding(state, -12, 'plot_failure');
    }
    FB.fns.plot_end(state);
    return valid;
  };
})();
