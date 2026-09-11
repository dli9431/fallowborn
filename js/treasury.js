/* AI fiscal accounts and military provisioning payments. */
(function () {
  'use strict';
  function numeric(value) { return typeof value === 'number' && isFinite(value) ? value : 0; }
  function positive(value) { return Math.max(0, numeric(value)); }
  function season(state) { return Math.floor(state.turn / 90); }
  const retries = new WeakMap();
  function active(state, rid) {
    return state.treasuryAccounting && state.treasuryAccounting.mode === 'active' && account(state, rid);
  }
  function eligible(realm, rid) {
    return rid !== 'player' && realm && realm.alive && !realm.rebelFaction && realm.rank >= 1;
  }
  function count(key, amount) {
    const timing = FB.game && FB.game._fastForwardTiming;
    if (timing) timing.count('Treasury ' + key, amount === undefined ? 1 : amount);
  }
  function measured(label, fn) {
    const timing = FB.game && FB.game._fastForwardTiming;
    const entry = timing && timing.enter('Treasury: ' + label);
    try { return fn(); } finally { if (timing) timing.leave(entry); }
  }
  function account(state, rid) {
    const realm = state.realms && state.realms[rid];
    return eligible(realm, rid) && realm.treasury && realm.treasury.version === 1
      && !realm.treasury.retired ? realm.treasury : null;
  }
  function empty(state, gold) {
    return { version:1, gold:gold, militaryAccrued:0, lastSettledSeason:season(state),
      lastRevaluedYear:state.date.year, lastSummary:null, retired:false };
  }
  function sovereignIndex(realms, ids) {
    const out = Object.create(null);
    for (const id of ids) {
      if (out[id] !== undefined) continue;
      const path = [], seen = Object.create(null);
      let rid = id;
      while (out[rid] === undefined && !seen[rid]) {
        seen[rid] = true; path.push(rid); count('hierarchy visits');
        const realm = realms[rid];
        if (!realm || !realm.liege) { out[rid] = rid; break; }
        rid = realm.liege;
      }
      // A malformed cycle gets one deterministic representative, not recursion.
      const root = out[rid] === undefined ? path.slice(path.indexOf(rid)).sort()[0] : out[rid];
      for (const member of path) out[member] = root;
    }
    return out;
  }
  FB.treasuryAvailable = function (state, rid) {
    const row = account(state, rid);
    return row ? Math.max(0, numeric(row.gold) - positive(row.militaryAccrued)) : 0;
  };
  FB.treasurySummary = function (state, rid) {
    const row = account(state, rid);
    if (!row) return null;
    return { gold:numeric(row.gold), accrued:positive(row.militaryAccrued),
      available:FB.treasuryAvailable(state, rid), accountingOnly:state.treasuryAccounting.mode !== 'active',
      necessary:positive(row.necessary), recovering:FB.treasuryRetrenching(state, rid),
      last:row.lastSummary ? Object.assign({}, row.lastSummary) : null };
  };

  // One direct-holder pass. Liege receipts never get taxed recursively.
  FB.treasurySnapshot = function (state) {
    return measured('fiscal snapshot', function () {
      const rows = Object.create(null), counties = Object.create(null);
      const realms = state.realms || {}, ids = Object.keys(realms).sort();
      const sovereigns = sovereignIndex(realms, ids), tech = Object.create(null);
      for (const rid of ids) {
        count('realm reads');
        if (!eligible(realms[rid], rid)) continue;
        rows[rid] = { tax:0, buildings:0, income:0, duesIn:0, duesOut:0, upkeep:0, counties:0 };
      }
      for (const pid of Object.keys(state.owner || {})) {
        count('county reads');
        const rid = (state.holder || {})[pid] || state.owner[pid];
        const row = rows[rid];
        counties[pid] = rid;
        if (!row) continue;
        row.counties++;
        count('county tax quotes');
        const records = FB.countyModifierSnapshot(state, pid);
        count('modifier record reads', records.length);
        const popular = FB.countyPopularSupport(state, pid, records);
        row.tax += FB.countyTaxBase(state, pid, FBDATA.balance.taxPerDev,
          FB.modBonus(state, 'tax', pid, popular, records));
        let support = FB.clamp(1 + popular / 100, 0, 2);
        if (records.some(function (record) { return record.id === 'commons_uprising'; })) {
          support *= 1 - FB.commonsUprisingReduction(state, pid, popular);
        }
        const list = (state.buildings || {})[pid] || [];
        for (const raw of list) {
          count('building reads');
          const building = typeof raw === 'string' ? { id:raw } : raw;
          if (!building || building.ruined) continue;
          if (building.id === 'walls') {
            const def = FB.fortLevelDef(typeof raw === 'string' ? FBDATA.forts.legacyLevel : building.level || 0);
            if (def) row.upkeep += typeof raw === 'string' || (building.maintenanceGraceUntil !== undefined &&
              state.turn <= building.maintenanceGraceUntil) ? (FBDATA.forts.legacyUpkeep || 1) : positive(def.upkeep);
          } else {
            const def = FBDATA.buildings[building.id];
            if (!def) continue;
            row.buildings += positive(def.tax) * support;
            row.upkeep += positive(def.upkeep);
          }
        }
      }
      for (const rid of ids) {
        const row = rows[rid];
        if (!row) continue;
        const sovereign = sovereigns[rid];
        if (tech[sovereign] === undefined) {
          count('realm tax bonus quotes');
          tech[sovereign] = FB.techBonus(state, 'tax', sovereign);
        }
        row.income = (row.tax + row.buildings) * Math.max(0, 1 + tech[sovereign]);
        const liege = realms[rid].liege;
        if (!liege || liege === rid || (!rows[liege] && liege !== 'player')) continue;
        count('liege edges');
        const contract = FB.feudalContractOf(state, rid);
        const charter = FB.feudalCharterDef(contract.charterId);
        const dues = row.tax * Math.max(0, numeric(charter.taxShare));
        row.duesOut = dues;
        if (rows[liege]) rows[liege].duesIn += dues;
      }
      return { rows:rows, holders:counties };
    });
  };

  FB.treasuryInitialize = function (state) {
    return measured('account repair', function () {
      const snapshot = FB.treasurySnapshot(state);
      const initial = !state.treasuryAccounting || typeof state.treasuryAccounting !== 'object' ||
        Array.isArray(state.treasuryAccounting);
      if (initial) state.treasuryAccounting = { version:1, mode:'accounting',
        lastMilitaryTurn:state.turn, pendingPlayer:0 };
      state.treasuryAccounting.pendingPlayer = numeric(state.treasuryAccounting.pendingPlayer);
      if (typeof state.treasuryAccounting.lastMilitaryTurn !== 'number' ||
          !isFinite(state.treasuryAccounting.lastMilitaryTurn)) state.treasuryAccounting.lastMilitaryTurn = state.turn;
      for (const rid of Object.keys(snapshot.rows)) {
        const realm = state.realms[rid], fiscal = snapshot.rows[rid];
        const saved = realm.treasury;
        if (saved && saved.version === 1) {
          saved.gold = numeric(saved.gold);
          saved.militaryAccrued = positive(saved.militaryAccrued);
          if (typeof saved.lastSettledSeason !== 'number' || !isFinite(saved.lastSettledSeason)) saved.lastSettledSeason = season(state);
          if (typeof saved.lastRevaluedYear !== 'number' || !isFinite(saved.lastRevaluedYear)) saved.lastRevaluedYear = state.date.year;
          continue;
        }
        const net = fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep;
        // Only explicit initial/legacy initialization grants opening reserves.
        const floors = FBDATA.balance.aiTreasuryOpeningFloor || [0, 10, 20, 30, 40];
        const seasons = FBDATA.balance.aiTreasuryOpeningSeasons;
        const gold = initial ? Math.max(floors[Math.min(4, realm.rank)] || 0,
          Math.max(0, net) * (seasons === undefined ? 2 : positive(seasons))) : 0;
        realm.treasury = empty(state, gold);
        count('accounts initialized');
      }
      if (state.treasuryAccounting.mode !== 'active') {
        const purses = state.armyLogistics && state.armyLogistics.purses || {};
        const floors = FBDATA.balance.aiTreasuryOpeningFloor || [0, 10, 20, 30, 40];
        const periods = FBDATA.balance.aiTreasuryOpeningSeasons;
        for (const rid of Object.keys(snapshot.rows)) {
          const fiscal = snapshot.rows[rid], realm = state.realms[rid];
          const net = fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep;
          const opening = Math.max(floors[Math.min(4, realm.rank)] || 0,
            Math.max(0, net) * (periods === undefined ? 2 : positive(periods)));
          realm.treasury = empty(state, Math.max(opening, positive(purses[rid] && purses[rid].gold)));
        }
        state.treasuryAccounting.mode = 'active';
        state.treasuryAccounting.pendingPlayer = 0;
        state.treasuryAccounting.lastMilitaryTurn = state.turn;
        state.treasuryAccounting.lastSettledSeason = season(state);
      }
      for (const rid of Object.keys(snapshot.rows)) {
        const row = account(state, rid), fiscal = snapshot.rows[rid];
        if (row) row.necessary = fiscal.upkeep + fiscal.duesOut;
      }
      retries.delete(state);
      if (state.armyLogistics) delete state.armyLogistics.purses;
      if (FB.armyProducerSnapshot) FB.armyProducerSnapshot(state);
      return snapshot;
    });
  };

  FB.treasurySpend = function (state, rid, amount) {
    const row = account(state, rid);
    if (!row || state.treasuryAccounting.mode !== 'active' || !isFinite(amount) || amount < 0 ||
        amount > FB.treasuryAvailable(state, rid)) return false;
    row.gold -= amount;
    return true;
  };
  FB.treasuryRetrenching = function (state, rid) {
    const row = active(state, rid);
    return !!(row && row.recoverUntil > state.turn);
  };
  FB.treasuryRetryReady = function (state, rid, purpose) {
    if (!active(state, rid)) return true;
    const cache = retries.get(state), old = cache && cache[rid + ':' + purpose];
    if (!old || old.turn <= state.turn || old.revision !== FB.militaryInputRevision ||
        FB.treasuryAvailable(state, rid) >= old.required) return true;
    count('affordability retries skipped');
    return false;
  };
  function reject(state, rid, purpose, required) {
    let cache = retries.get(state);
    if (!cache) { cache = Object.create(null); retries.set(state, cache); }
    cache[rid + ':' + purpose] = { required:required, revision:FB.militaryInputRevision,
      turn:state.turn + (FBDATA.balance.aiTreasuryRetryDays || 7) };
    count('military commitments rejected');
    return false;
  }
  function hostCommitment(state, host, batch) {
    const before = batch.costs[host.realm] || 0;
    accrueHost(state, host, batch);
    return (batch.costs[host.realm] - before) * 180 + FB.armyProvisionCommitment(state, host, 2);
  }
  function policyRealm(state, policy, rid) {
    if (!policy.pending || !policy.pending[rid]) return;
    measured('military commitments', function () {
      for (const host of policy.pending[rid]) {
        const cost = hostCommitment(state, host, policy.batch);
        policy.hosts[host.id] = cost;
        policy.totals[rid] = (policy.totals[rid] || 0) + cost;
      }
      delete policy.pending[rid];
      count('commitment realms quoted');
    });
  }
  FB.treasuryMilitaryPolicy = function (state, lazy) {
    if (!state.treasuryAccounting || state.treasuryAccounting.mode !== 'active') return null;
    return measured('military commitments', function () {
      const policy = { totals:Object.create(null), hosts:Object.create(null), pending:Object.create(null),
        batch:{ costs:Object.create(null), prices:Object.create(null), baskets:Object.create(null) } };
      for (const host of state.armies || []) {
        if (host.rebellionId || !account(state, host.realm)) continue;
        (policy.pending[host.realm] || (policy.pending[host.realm] = [])).push(host);
      }
      if (!lazy) for (const rid of Object.keys(policy.pending)) policyRealm(state, policy, rid);
      return policy;
    });
  };
  // No levy purchase fee: reserve the projected commitment, then actual daily
  // food and non-food accrual spend it. Update the phase totals on acceptance.
  FB.treasuryApproveHost = function (state, host, policy, defending, purpose) {
    const row = active(state, host.realm);
    if (!row || !policy) return true;
    policyRealm(state, policy, host.realm);
    const cost = hostCommitment(state, host, policy.batch);
    const old = policy.hosts[host.id] || 0;
    const total = Math.max(0, (policy.totals[host.realm] || 0) - old) + cost;
    const required = total + (defending ? 0 : positive(row.necessary));
    if (!isFinite(required) || required < 0) return reject(state, host.realm, purpose, Infinity);
    if (required > FB.treasuryAvailable(state, host.realm)) return reject(state, host.realm, purpose, required);
    policy.totals[host.realm] = total; policy.hosts[host.id] = cost;
    count('military commitments accepted');
    return true;
  };
  FB.treasuryFundReplacement = function (state, rid, classId, men, policy) {
    const row = active(state, rid);
    if (!row) return true;
    if (policy) policyRealm(state, policy, rid);
    const def = FBDATA.unitClasses[classId], realm = state.realms[rid];
    if (!def || !def.professional || typeof men !== 'number' || !isFinite(men) || men <= 0) return false;
    const days = def.replaceDays || FBDATA.balance.cohortReplaceDays || 120;
    const base = men / 100 * positive(def.upkeepPer100) *
      (FBDATA.balance.reinforcementPremiumMult || 1) * days / 90;
    const cost = FB.marketCostQuote ? FB.marketCostQuote(state, base, def.basket, realm.capital) : base;
    const reserve = positive(row.necessary) + (policy && policy.totals[rid] || 0);
    if (!FB.treasurySpendOptional(state, rid, cost, reserve)) return reject(state, rid, 'replacement', cost + reserve);
    return true;
  };
  // Annual optional-spending policy: one fiscal pass and one host pass.
  // This projection never commits accrual or assumes future tax receipts.
  FB.treasuryConstructionReserves = function (state) {
    if (!state.treasuryAccounting || state.treasuryAccounting.mode !== 'active') return null;
    return measured('construction reserves', function () {
      const fiscal = FB.treasurySnapshot(state).rows, reserves = Object.create(null);
      const batch = { costs:Object.create(null), prices:Object.create(null), baskets:Object.create(null) };
      for (const rid of Object.keys(fiscal)) reserves[rid] = fiscal[rid].upkeep + fiscal[rid].duesOut;
      for (const host of state.armies || []) {
        if (host.rebellionId || !account(state, host.realm)) continue;
        accrueHost(state, host, batch);
        // Active hosts receive two seasons of food cover, plus initial refill.
        reserves[host.realm] += FB.armyProvisionCommitment(state, host, 2);
      }
      for (const rid of Object.keys(batch.costs)) reserves[rid] += batch.costs[rid] * 180;
      return reserves;
    });
  };
  FB.treasurySpendOptional = function (state, rid, amount, reserve) {
    if (typeof amount !== 'number' || !isFinite(amount) || amount < 0 ||
        typeof reserve !== 'number' || !isFinite(reserve) || reserve < 0 ||
        amount + reserve > FB.treasuryAvailable(state, rid)) {
      count('optional purchases rejected');
      return false;
    }
    const paid = FB.treasurySpend(state, rid, amount);
    if (paid) count('optional purchases paid');
    return paid;
  };
  FB.treasuryCredit = function (state, rid, amount) {
    const row = account(state, rid);
    if (!row || state.treasuryAccounting.mode !== 'active' || !isFinite(amount) || amount < 0) return false;
    row.gold += amount;
    return true;
  };

  FB.treasurySeason = function (state, playerTax) {
    if (!state.treasuryAccounting) { FB.treasuryInitialize(state); return false; }
    const period = season(state);
    if (state.treasuryAccounting.lastSettledSeason === period) return false;
    return measured('seasonal settlement', function () {
      const snapshot = FB.treasurySnapshot(state);
      // Mirror the existing player's liege deduction without changing player cash.
      const liege = state.player && state.player.liege;
      if (playerTax && snapshot.rows[liege]) snapshot.rows[liege].duesIn += positive(-playerTax.liege);
      for (const rid of Object.keys(snapshot.rows)) {
        const fiscal = snapshot.rows[rid], realm = state.realms[rid];
        if (!realm.treasury) realm.treasury = empty(state, 0);
        const row = account(state, rid);
        if (!row || row.lastSettledSeason >= period) continue;
        const opening = row.gold, military = positive(row.militaryAccrued);
        row.gold += fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep - military;
        row.militaryAccrued = 0;
        row.lastSettledSeason = period;
        row.lastSummary = { period:period, opening:opening, income:fiscal.income,
          duesIn:fiscal.duesIn, duesOut:fiscal.duesOut, upkeep:fiscal.upkeep,
          military:military, closing:row.gold };
        row.necessary = fiscal.upkeep + fiscal.duesOut;
        row.shortfallSeasons = row.gold <= 0 && military > 0 ? Math.min(2, positive(row.shortfallSeasons) + 1) : 0;
        if (row.shortfallSeasons >= 2) row.recoverUntil = state.turn + 90;
        count('accounts settled');
      }
      state.treasuryAccounting.lastSettledSeason = period;
      return true;
    });
  };

  // Called from the existing supply pass; payer totals commit after every host.
  FB.treasuryMilitaryBatch = function (state) {
    const data = state.treasuryAccounting;
    if (!data || data.lastMilitaryTurn === state.turn) return null;
    return { costs:Object.create(null), prices:Object.create(null), baskets:Object.create(null) };
  };
  FB.treasuryAccrueHost = function (state, host, batch) {
    if (!batch || host.rebellionId || !account(state, host.realm)) return;
    const timing = FB.game && FB.game._fastForwardTiming;
    const entry = timing && timing.enter('Treasury: military host quote');
    try { accrueHost(state, host, batch); }
    finally { if (timing) timing.leave(entry); }
  };
  function accrueHost(state, host, batch) {
    count('host reads');
    // Definitions stay fixed during the synchronous supply pass; troop counts do not.
    if (!batch.rates) {
      const sample = {};
      for (const id of FB.unitClassIds()) sample[id] = 100;
      batch.rates = FB.hostStandingUpkeepParts(sample, 0);
      batch.classes = Object.keys(batch.rates.byClass);
      count('military rate snapshots');
    }
    const parts = batch.rates, units = FB.hostUnits(host);
    const pid = host.at;
    let prices = batch.prices[pid];
    if (!prices) {
      prices = batch.prices[pid] = {};
      for (const good of ['materials', 'transport', 'wares', 'luxuries']) {
        prices[good] = FB.marketPrice(state, pid, good);
        count('military price reads');
      }
      const baskets = batch.baskets[pid] = { byClass:Object.create(null),
        base:basketQuote({ materials:0.25, transport:0.2 }, prices) };
      for (const id of batch.classes) {
        baskets.byClass[id] = basketQuote(FBDATA.unitClasses[id].basket || {}, prices);
      }
      count('military basket snapshots');
    }
    const baskets = batch.baskets[pid];
    let cost = quote(parts.base, baskets.base);
    for (const id of batch.classes) {
      const value = Math.max(0, Number(units[id]) || 0) / 100 * parts.byClass[id];
      cost += quote(value, baskets.byClass[id]);
    }
    cost += (positive(units.mercs) / (FBDATA.balance.mercCompanySize || 150)) *
      (FBDATA.balance.hostLogisticsMercenaryCompany === undefined ? 4 : FBDATA.balance.hostLogisticsMercenaryCompany);
    batch.costs[host.realm] = (batch.costs[host.realm] || 0) + cost / 90;
  }
  function basketQuote(basket, prices) {
    let total = 0, weight = 0;
    for (const good in basket) {
      if (good === 'provisions') continue;
      const share = positive(basket[good]);
      total += share * (prices[good] === undefined ? 1 : prices[good]);
      weight += share;
    }
    return { total:total, weight:weight };
  }
  function quote(value, basket) {
    // Keep multiplication before division to preserve the original rounding.
    return basket.weight ? value * basket.total / basket.weight : value;
  }
  FB.treasuryCommitMilitary = function (state, batch) {
    if (!batch || state.treasuryAccounting.lastMilitaryTurn === state.turn) return;
    measured('military accrual', function () {
      for (const rid of Object.keys(batch.costs)) {
        const row = account(state, rid);
        if (row) row.militaryAccrued += batch.costs[rid];
      }
      state.treasuryAccounting.lastMilitaryTurn = state.turn;
    });
  };
  FB.treasuryRevalue = function (state, ratio) {
    if (!state.treasuryAccounting || !(ratio > 0) || !isFinite(ratio)) return;
    measured('annual revaluation', function () {
      for (const rid of Object.keys(state.realms)) {
        const row = account(state, rid);
        if (!row || row.lastRevaluedYear >= state.date.year) continue;
        if (row.gold > 0) row.gold *= ratio;
        row.lastRevaluedYear = state.date.year;
      }
    });
  };
  FB.treasuryCreateRealm = function (state, rid, source, share) {
    if (!state.treasuryAccounting || !eligible(state.realms[rid], rid) || state.realms[rid].treasury) return;
    const from = account(state, source);
    const amount = from ? FB.treasuryAvailable(state, source) * Math.max(0, Math.min(1, numeric(share))) : 0;
    if (from) from.gold -= amount;
    state.realms[rid].treasury = empty(state, amount);
  };
  FB.treasuryCreateFromCounties = function (state, rid, provinces) {
    if (!state.treasuryAccounting || !eligible(state.realms[rid], rid) || state.realms[rid].treasury) return;
    const selected = Object.create(null), donors = Object.create(null);
    for (const pid of provinces) selected[pid] = true;
    // Creation is rare. One county pass handles multiple donors without one
    // full-world holdings query per donor, and ignores mere sovereign ownership.
    for (const pid of Object.keys(state.owner || {})) {
      count('creation county reads');
      const owner = (state.holder || {})[pid] || state.owner[pid];
      if (owner === rid || !account(state, owner)) continue;
      const row = donors[owner] || (donors[owner] = { held:0, granted:0 });
      row.held++;
      if (selected[pid]) row.granted++;
    }
    let gold = 0;
    for (const source of Object.keys(donors).sort()) {
      const row = donors[source];
      if (!row.granted) continue;
      const amount = FB.treasuryAvailable(state, source) * row.granted / row.held;
      account(state, source).gold -= amount;
      gold += amount;
    }
    state.realms[rid].treasury = empty(state, gold);
  };
  FB.treasuryRetireRealm = function (state, rid, recipient) {
    if (recipient === rid) return;
    const from = account(state, rid);
    if (!from) return;
    const to = account(state, recipient);
    if (to) { to.gold += from.gold; to.militaryAccrued += from.militaryAccrued; }
    else if (recipient === 'player') {
      if (state.treasuryAccounting.mode === 'active') state.player.gold += from.gold - from.militaryAccrued;
      else state.treasuryAccounting.pendingPlayer += from.gold - from.militaryAccrued;
    }
    from.retirement = { recipient:recipient || null, gold:from.gold, accrued:from.militaryAccrued };
    from.gold = 0; from.militaryAccrued = 0; from.retired = true;
  };
}());
