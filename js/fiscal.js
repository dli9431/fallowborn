/* Player fiscal crises. Daily reads are scalar; projections are seasonal or explicit. */
(function () {
  'use strict';
  FB.msg('news.fiscal.landless', 'The lost government’s unpaid obligations are settled. Your household’s signed loans remain.');
  FB.msg('news.fiscal.warning', 'Your treasury shortfall exceeds two seasons of ordinary receipts. Resolve it within a season to avert a fiscal crisis.');
  FB.msg('news.fiscal.recovery', 'Financial recovery begins. Fiscal resentment will ease each season; existing rebellions still need a settlement or military resolution.');
  FB.msg('news.fiscal.settled', 'The financial settlement ends. Its remaining obligations are discharged and its temporary governing restrictions expire.');
  FB.msg('news.fiscal.crisis', 'Unpaid obligations have become a fiscal crisis. Popular support and political cooperation are falling. Review land sales or a financial settlement in Coin & Credit.');
  FB.msg('news.fiscal.composition', 'You accept five years of constrained government and an assignment of civilian surplus. The treasury shortfall is restructured; signed loans remain payable.');
  FB.msg('news.fiscal.easing', 'Fiscal resentment eases as recovery continues.');
  FB.msg('news.fiscal.pressure', 'The unresolved fiscal crisis deepens popular resentment and political distrust.');

  function rules() { return FBDATA.balance.fiscalCrisis; }
  function count(key) {
    const timing = FB.game && FB.game._fastForwardTiming;
    if (timing) timing.count('Fiscal ' + key);
  }
  function record(state) { return state && state.fiscalCrisis; }
  function ensure(state) {
    if (!state.fiscalCrisis) state.fiscalCrisis = {
      basis:Math.max(rules().minimumIncome, FB.playerCivilianBudget(state, null, true).receipts), stage:0, since:null, lowSince:null,
      active:false, recovering:false, lastSeason:Math.floor(state.turn / 90), nextChange:null,
      settlement:null, nextSettlement:0
    };
    return state.fiscalCrisis;
  }
  function changed() {
    if (FB.invalidateFiscalSupport) FB.invalidateFiscalSupport();
  }
  function news(state, key) { FB.news(state, FB.message(key, {})); }
  FB.fiscalSettlementActive = function (state) {
    const r = record(state), s = r && r.settlement;
    return !!(s && !s.closed && state.turn < s.endTurn && state.player.tier >= 3);
  };
  FB.fiscalRestriction = function (state) {
    return FB.fiscalSettlementActive(state) ? FB.T(
      'Financial settlement: no new offensive wars, extraordinary taxes, voluntary revocations, or expanded paid forces until the five-year term ends.') : null;
  };
  FB.fiscalSupport = function (state, pid) {
    const r = record(state);
    return r && state.player.tier >= 3 && state.holder && state.holder[pid] === 'player'
      ? -r.stage * rules().supportStep : 0;
  };
  FB.fiscalStanding = function (state, rid) {
    const r = record(state), realm = state.realms && state.realms[rid];
    return r && state.player.tier >= 3 && rid !== 'player' &&
      (rid === state.player.liege || realm && realm.liege === 'player')
      ? -r.stage * rules().standingStep : 0;
  };
  FB.fiscalAuthority = function (state) {
    const r = record(state);
    return r && state.player.tier >= 6 ? -r.stage * rules().authorityStep : 0;
  };
  FB.fiscalCrisisQuote = function (state) {
    const r = record(state), b = rules(), debt = Math.max(0, -state.player.gold);
    const basis = r ? r.basis : b.minimumIncome;
    return { debt:debt, basis:basis, stage:r ? r.stage : 0,
      active:!!(r && r.active), recovering:!!(r && r.recovering),
      warning:!!(r && r.since !== null && !r.active),
      nextChange:r && r.active ? r.nextChange : r && r.since !== null ? r.since + b.graceDays : null,
      settlement:FB.fiscalSettlementActive(state),
      remaining:r && r.settlement ? r.settlement.remaining : 0,
      endTurn:r && r.settlement ? r.settlement.endTurn : null,
      nextSettlement:r ? r.nextSettlement : 0,
      canSettle:!!(state.player.tier >= 3 && r && r.active && debt > 0 &&
        !FB.fiscalSettlementActive(state) && state.turn >= r.nextSettlement) };
  };
  FB.fiscalDay = function (state) {
    let r = record(state);
    if (state.player.tier < 3) {
      if (r && (r.active || r.settlement && !r.settlement.closed)) {
        state.player.gold = Math.max(0, state.player.gold);
        if (r.settlement) { r.settlement.remaining = 0; r.settlement.closed = true; }
        r.active = false; r.stage = 0; r.since = null; r.recovering = false;
        changed();
        news(state, 'news.fiscal.landless');
      }
      return;
    }
    r = r || ensure(state);
    const b = rules(), debt = Math.max(0, -state.player.gold);
    if (!r.active) {
      if (debt > r.basis * b.entrySeasons) {
        if (r.since === null) {
          r.since = state.turn;
          news(state, 'news.fiscal.warning');
        }
      } else r.since = null;
    } else {
      if (debt < r.basis * b.recoverySeasons) {
        if (r.lowSince === null) r.lowSince = state.turn;
      } else r.lowSince = null;
      const recovering = debt === 0 || r.lowSince !== null && state.turn - r.lowSince >= b.graceDays ||
        FB.fiscalSettlementActive(state) && debt <= r.settlement.recoveryLimit;
      if (recovering && !r.recovering) {
        r.recovering = true; r.nextChange = state.turn + b.graceDays;
        news(state, 'news.fiscal.recovery');
      } else if (!recovering && r.recovering) {
        r.recovering = false; r.nextChange = state.turn + b.graceDays;
      }
    }
  };
  FB.fiscalSeason = function (state, economy) {
    if (state.player.tier < 3) { FB.fiscalDay(state); return; }
    const r = ensure(state), b = rules();
    const season = Math.floor(state.turn / 90);
    if (r.lastSeason === season) return;
    r.lastSeason = season;
    // One shared civilian budget, never a presentation breakdown or world scan.
    if (!r.active && r.since === null || r.settlement && !r.settlement.closed) {
      count('seasonal budget projections');
      const budget = FB.playerCivilianBudget(state, economy);
      if (!r.active && r.since === null) r.basis = Math.max(b.minimumIncome, budget.receipts);
      const s = r.settlement;
      if (s && !s.closed) {
        const payment = state.turn > s.endTurn ? 0 : Math.min(s.remaining, Math.max(0, budget.surplus) * b.assignmentShare,
          Math.max(0, state.player.gold));
        state.player.gold -= payment; s.remaining -= payment; s.lastPayment = payment;
        if (state.turn >= s.endTurn) {
          s.remaining = 0; s.closed = true;
          news(state, 'news.fiscal.settled');
        }
      }
    }
    FB.fiscalDay(state);
    if (!r.active && r.since !== null && state.turn - r.since >= b.graceDays) {
      r.active = true; r.stage = 1; r.nextChange = state.turn + b.graceDays;
      changed();
      news(state, 'news.fiscal.crisis');
    } else if (r.active && state.turn >= r.nextChange) {
      const before = r.stage;
      r.stage = FB.clamp(r.stage + (r.recovering ? -1 : 1), 0, b.maxSteps);
      r.nextChange = state.turn + b.graceDays;
      if (r.stage !== before) {
        changed();
        news(state, r.recovering ? 'news.fiscal.easing' : 'news.fiscal.pressure');
      }
      if (!r.stage && r.recovering) {
        r.active = false; r.since = null; r.lowSince = null; r.recovering = false;
      }
    }
  };
  FB.fiscalSettlementQuote = function (state) {
    const q = FB.fiscalCrisisQuote(state), b = rules();
    return { ready:q.canSettle, amount:q.debt, turn:state.turn,
      endTurn:state.turn + b.settlementSeasons * 90,
      nextSettlement:state.turn + b.cooldownSeasons * 90,
      share:b.assignmentShare, tier:state.player.tier };
  };
  FB.acceptFiscalSettlement = function (state, reviewed) {
    const q = FB.fiscalSettlementQuote(state);
    if (!q.ready || !reviewed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    const r = ensure(state);
    const paidLimits = FB.playerComposition(state);
    r.settlement = { paidLimits:paidLimits, remaining:q.amount, original:q.amount, endTurn:q.endTurn,
      acceptedTurn:state.turn, recoveryLimit:r.basis * rules().recoverySeasons,
      lastPayment:0, closed:false };
    r.nextSettlement = q.nextSettlement;
    state.player.gold = 0;
    if (state.player.tier >= 6 && FB.grantPrivilege) FB.grantPrivilege(state, 'office_confirmation', {
      sourceType:'charter', sourceId:'fiscal_settlement', grantorType:'realm', grantorId:'player'
    });
    FB.fiscalDay(state);
    news(state, 'news.fiscal.composition');
    return true;
  };
  FB.fiscalAssignedIncome = function (state, surplus) {
    const r = record(state);
    return FB.fiscalSettlementActive(state)
      ? Math.min(r.settlement.remaining, Math.max(0, surplus) * rules().assignmentShare) : 0;
  };
  function normalTax(state, pid) {
    return FB.countyTaxBase(state, pid, FBDATA.balance.taxPerDev || 1.5, 0);
  }
  function saleCountyEligible(state, pid) {
    const p = state.player;
    const capital = state.realms.player && state.realms.player.capital || p.provinceId;
    const protection = state.fiscalLandSales && state.fiscalLandSales[pid];
    const revolt = FB.countyInOpenRevolt && FB.countyInOpenRevolt(state, pid);
    const occupied = revolt && revolt.counties[pid] && revolt.counties[pid].occupied;
    return p.tier >= 4 && p.provs.length > 1 && p.provs.indexOf(pid) >= 0 &&
      state.holder[pid] === 'player' && pid !== capital &&
      !FB.isProtected(state, 'grantCounty', pid) &&
      !(protection && state.turn < protection.resaleAfter) &&
      !occupied && !FB.countyOccupiedOrBesieged(state, pid) &&
      !FB.realmWars(state, 'player').some(function (war) {
        const occupation = war.occupations && war.occupations[pid];
        return occupation && (occupation.occupied || occupation.progress > 0);
      });
  }
  function saleBuyerEligible(state, rid) {
    const realm = state.realms[rid];
    return realm && realm.alive && realm.liege === 'player' &&
      FB.feudalContractOf(state, rid).tenure === 'hereditary';
  }
  function saleEligible(state, pid, rid) {
    return saleBuyerEligible(state, rid) && saleCountyEligible(state, pid);
  }
  FB.fiscalLandSaleCandidates = function (state) {
    count('buyer searches');
    const out = [];
    if (state.player.tier < 4 || state.player.provs.length < 2 ||
        !state.treasuryAccounting || state.treasuryAccounting.mode !== 'active') return out;
    const reserves = FB.treasuryConstructionReserves(state);
    const taxes = {};
    for (const pid of state.player.provs) if (saleCountyEligible(state, pid)) taxes[pid] = Math.ceil(normalTax(state, pid) * rules().saleSeasons);
    for (const rid of FB.playerVassals(state)) {
      if (!saleBuyerEligible(state, rid)) continue;
      count('buyer budget projections');
      const available = Math.max(0, FB.treasuryAvailable(state, rid) - (reserves[rid] || 0));
      for (const pid of Object.keys(taxes)) {
        if (taxes[pid] > 0 && taxes[pid] <= available)
          out.push({ pid:pid, rid:rid, price:taxes[pid] });
      }
    }
    return out;
  };
  FB.fiscalLandSaleQuote = function (state, pid, rid) {
    if (!saleEligible(state, pid, rid) || !state.treasuryAccounting ||
        state.treasuryAccounting.mode !== 'active') return null;
    const base = normalTax(state, pid), price = Math.ceil(base * rules().saleSeasons);
    const reserves = FB.treasuryConstructionReserves(state);
    if (price <= 0 || FB.treasuryAvailable(state, rid) - (reserves[rid] || 0) < price) return null;
    const contract = FB.feudalContractOf(state, rid), charter = FB.feudalCharterDef(contract.charterId);
    return { pid:pid, rid:rid, buyer:JSON.stringify(state.realms[rid].ruler), price:price, gold:state.player.gold,
      normalTax:base, normalDues:base * charter.taxShare,
      projection:FB.landGrantFiscalProjection(state, [pid], contract.charterId),
      levyShare:charter.levyShare, charter:contract.charterId, turn:state.turn };
  };
  FB.sellFiscalLand = function (state, reviewed) {
    if (!reviewed) return false;
    const q = FB.fiscalLandSaleQuote(state, reviewed.pid, reviewed.rid);
    if (!q || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    // All validations precede these synchronous, non-yielding mutations.
    if (!FB.grantCountiesToVassal(state, q.rid, [q.pid])) return false;
    FB.treasuryTransfer(state, q.rid, 'player', q.price, false);
    if (!state.fiscalLandSales) state.fiscalLandSales = {};
    state.fiscalLandSales[q.pid] = { rid:q.rid, price:q.price,
      resaleAfter:state.turn + rules().cooldownSeasons * 90, refunded:false };
    FB.fiscalDay(state);
    FB.news(state, FB.msg('news.fiscal.land_sale',
      'You receive {money:price} for a hereditary grant of {province}. Its lord remains your vassal.',
      { price:q.price, province:FB.world.byId[q.pid].name }));
    return true;
  };
  FB.fiscalRevocationRefund = function (state, pid) {
    const sale = state.fiscalLandSales && state.fiscalLandSales[pid];
    return sale && !sale.refunded ? sale.price : 0;
  };
  FB.fiscalRefundLand = function (state, pid) {
    const price = FB.fiscalRevocationRefund(state, pid);
    if (!price) return true;
    const rid = state.holder[pid];
    if (!FB.treasuryTransfer(state, 'player', rid, price, false)) return false;
    state.fiscalLandSales[pid].refunded = true;
    return true;
  };
  FB.fiscalRevocationReason = function (state, rid) {
    const restriction = FB.fiscalRestriction(state);
    if (restriction) return restriction;
    if (!rid || !state.realms[rid] || !state.realms[rid].alive) return FB.T('This ruler no longer holds the fief.');
    let refund = 0;
    for (const pid of FB.realmHeldCounties(state, rid)) refund += FB.fiscalRevocationRefund(state, pid);
    return refund > Math.max(0, state.player.gold)
      ? FB.T('Revocation requires refunding {money:amount} for purchased land.', { amount:refund }) : null;
  };
  FB.fiscalEventRestriction = function (state, option, ctx) {
    if (!FB.fiscalSettlementActive(state) && !state.fiscalLandSales) return null;
    const effects = [option.effects, option.success && option.success.effects, option.failure && option.failure.effects];
    for (const fx of effects) {
      if (!fx) continue;
      const customs = Array.isArray(fx.custom) ? fx.custom : [fx.custom];
      for (const id of customs) {
        if (id === 'vassal_reclaim' || id === 'vassal_refuse') {
          const reason = FB.fiscalRevocationReason(state, state.player.revokeRid || ctx.rid);
          if (reason) return reason;
        }
        if (['war_mercs', 'ghw_recruit_mercenaries', 'ghw_recruit_knights', 'ghw_recruit_adventurers'].indexOf(id) >= 0 && FB.fiscalRestriction(state))
          return FB.fiscalRestriction(state);
      }
    }
    return null;
  };
  FB.fiscalLimitComposition = function (state, units) {
    if (!FB.fiscalSettlementActive(state)) return units;
    const limits = record(state).settlement.paidLimits || {};
    for (const key of Object.keys(units)) {
      if (key !== 'levy' && key !== 'total' && typeof units[key] === 'number')
        units[key] = Math.min(units[key], limits[key] || 0);
    }
    return units;
  };
}());
