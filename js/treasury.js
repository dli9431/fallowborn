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
  // null denotes an existing non-realm source/sink or prepaid courier escrow.
  // Callers own once-only lifecycle guards; no growing transaction log is kept.
  FB.treasuryTransfer = function (state, payer, recipient, amount, compulsory) {
    if (typeof amount !== 'number' || !isFinite(amount) || amount < 0 || (payer && payer === recipient)) return false;
    const enabled = state.treasuryAccounting && state.treasuryAccounting.mode === 'active';
    const from = payer === 'player' ? state.player : enabled && account(state, payer);
    const to = recipient === 'player' ? state.player : enabled && account(state, recipient);
    if (enabled && ((payer && payer !== 'player' && !from) ||
        (recipient && recipient !== 'player' && !to))) return false;
    const available = payer === 'player' ? Math.max(0, numeric(state.player.gold)) :
      from ? FB.treasuryAvailable(state, payer) : Infinity;
    if (!compulsory && amount > available) return false;
    if (from) from.gold -= amount;
    if (to) to.gold += amount;
    count('counterparty transfers');
    return true;
  };
  FB.treasuryCounterparty = function (state, rid) {
    return rid === 'player' || active(state, rid) ? rid : null;
  };
  FB.treasuryCharacterRealm = function (state, cid) {
    if (cid === state.player.charId) return 'player';
    const c = state.chars && state.chars[cid];
    const rid = c && FB.realmIdForRulerCharacter && FB.realmIdForRulerCharacter(state, c);
    return FB.treasuryCounterparty(state, rid);
  };
  FB.treasuryOffer = function (state, rid, amount) {
    return active(state, rid) ? Math.min(positive(amount), FB.treasuryAvailable(state, rid)) : positive(amount);
  };
  FB.treasurySummary = function (state, rid) {
    const row = account(state, rid);
    if (!row) return null;
    return { gold:numeric(row.gold), accrued:positive(row.militaryAccrued),
      available:FB.treasuryAvailable(state, rid), accountingOnly:state.treasuryAccounting.mode !== 'active',
      necessary:positive(row.necessary), reserveTarget:positive(row.reserveTarget),
      distribution:row.lastDistribution ? Object.assign({}, row.lastDistribution) : null, recovering:FB.treasuryRetrenching(state, rid),
      last:row.lastSummary ? Object.assign({}, row.lastSummary) : null };
  };

  // Shared public-government expenses; household and military costs stay separate.
  FB.governmentCostParts = function (revenue, counties, vassals, tier) {
    const b = FBDATA.balance, r = positive(revenue);
    if (tier < 3) return { revenue:0, administration:0, court:0, total:0 };
    const allowances = b.governmentCourtAllowance;
    const administration = r * b.governmentAdministrationRate + Math.min(
      r * b.governmentScaleRate, (positive(counties) + positive(vassals)) * b.governmentSeatCost);
    const court = r * b.governmentCourtRate + Math.min(r * b.governmentScaleRate,
      allowances[Math.max(0, Math.min(4, tier - 3))]);
    return { revenue:r, administration:administration, court:court, total:administration + court };
  };
  FB.playerGovernmentCosts = function (state, tax) {
    const p = state.player;
    if (p.tier < 3) return FB.governmentCostParts(0, 0, 0, p.tier);
    return FB.governmentCostParts(FB.playerTax(state, tax),
      (p.provs || []).length, FB.playerVassals(state).length, p.tier);
  };
  function governmentCosts(state, rid, fiscal) {
    return FB.governmentCostParts(numeric(fiscal.income) + numeric(fiscal.duesIn) - numeric(fiscal.duesOut),
      fiscal.counties, fiscal.vassals, ((state.realms[rid] || {}).rank || 0) + 3);
  }
  function necessary(fiscal) {
    return positive(fiscal.upkeep) + positive(fiscal.duesOut) + positive(fiscal.government);
  }
  function civilianReserve(fiscal) {
    return FBDATA.balance.realmReserveSeasons * Math.max(necessary(fiscal),
      positive(fiscal.income + (fiscal.duesIn || 0)) * FBDATA.balance.realmReserveRevenueFloor);
  }
  function distributionAccount(state, rid) {
    return rid === 'player' ? state.player : active(state, rid);
  }
  FB.publicDistributionQuote = function (state, rid, fiscal) {
    const payer = distributionAccount(state, rid);
    const counties = !payer ? [] : rid === 'player' ? (state.player.provs || []).slice() :
      fiscal && fiscal.countyIds ? fiscal.countyIds.slice() : FB.realmHeldCounties(state, rid).slice();
    const government = !payer ? { total:0 } : rid === 'player' ? FB.playerGovernmentCosts(state) :
      fiscal ? governmentCosts(state, rid, fiscal) :
        governmentCosts(state, rid, FB.treasurySnapshot(state).rows[rid] || {});
    const next = payer && positive(payer.distributionNextTurn);
    const eligible = !!(payer && counties.length && (rid !== 'player' || state.player.tier >= 3));
    return { eligible:eligible, counties:counties,
      minimum:Math.max(FBDATA.balance.distributionMinimum, government.total),
      nextTurn:next || 0, ready:eligible && !(next > state.turn),
      available:rid === 'player' ? positive(state.player.gold) : FB.treasuryAvailable(state, rid) };
  };
  FB.publicDistribution = function (state, rid, amount, fiscal) {
    const q = FB.publicDistributionQuote(state, rid, fiscal);
    if (!q.ready || typeof amount !== 'number' || !isFinite(amount) || amount < q.minimum || amount > q.available) return false;
    if (!FB.treasuryTransfer(state, rid, null, amount)) return false;
    const payer = distributionAccount(state, rid);
    payer.distributionNextTurn = state.turn + FBDATA.balance.distributionCooldownDays;
    payer.lastDistribution = { turn:state.turn, amount:amount, counties:q.counties.length };
    for (const pid of q.counties) FB.addModifier(state, 'public_distribution', pid, { silent:true });
    if (rid === 'player') FB.news(state, FB.msg('news.finance.public_distribution',
      'Public distributions cost {money:amount}; Popular support rises temporarily in {count} counties.',
      { amount:amount, count:q.counties.length }));
    return true;
  };
  FB.treasurySurplusYear = function (state) {
    if (!state.treasuryAccounting || state.treasuryAccounting.mode !== 'active') return;
    const snapshot = FB.treasurySnapshot(state), reserves = FB.treasuryConstructionReserves(state, snapshot);
    for (const rid of Object.keys(snapshot.rows)) {
      const row = account(state, rid);
      if (!row) continue;
      row.reserveTarget = reserves[rid];
      if (FB.treasuryRetrenching(state, rid)) continue;
      const excess = Math.max(0, FB.treasuryAvailable(state, rid) - reserves[rid]);
      const amount = excess * Math.min(1, Math.max(0, FBDATA.balance.distributionSurplusRate));
      FB.publicDistribution(state, rid, amount, snapshot.rows[rid]);
    }
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
        rows[rid] = { tax:0, buildings:0, income:0, duesIn:0, duesOut:0, upkeep:0, counties:0, countyIds:[], vassals:0 };
      }
      for (const pid of Object.keys(state.owner || {})) {
        count('county reads');
        const rid = (state.holder || {})[pid] || state.owner[pid];
        const row = rows[rid];
        counties[pid] = rid;
        if (!row) continue;
        row.counties++; row.countyIds.push(pid);
        count('county tax quotes');
        const records = FB.countyModifierSnapshot(state, pid);
        count('modifier record reads', records.length);
        for (const record of records) {
          const def = FBDATA.modifiers[record.id];
          row.upkeep += positive(def && def.upkeep && def.upkeep.gold);
        }
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
      for (const rid of ids) {
        const realm = realms[rid];
        if (realm && realm.alive && rows[realm.liege]) rows[realm.liege].vassals++;
      }
      for (const rid of Object.keys(rows)) {
        const costs = governmentCosts(state, rid, rows[rid]);
        rows[rid].administration = costs.administration;
        rows[rid].court = costs.court;
        rows[rid].government = costs.total;
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
      if (state.treasuryAccounting.playerFieldVersion !== 1) {
        state.treasuryAccounting.playerFieldVersion = 1;
        state.treasuryAccounting.playerMilitary = 0;
        state.treasuryAccounting.playerMilitaryLast = 0;
        state.treasuryAccounting.lastMilitaryTurn = state.turn;
      }
      state.treasuryAccounting.playerMilitary = positive(state.treasuryAccounting.playerMilitary);
      state.treasuryAccounting.playerMilitaryLast = positive(state.treasuryAccounting.playerMilitaryLast);
      state.player.distributionNextTurn = positive(state.player.distributionNextTurn);
      if (typeof state.treasuryAccounting.lastMilitaryTurn !== 'number' ||
          !isFinite(state.treasuryAccounting.lastMilitaryTurn)) state.treasuryAccounting.lastMilitaryTurn = state.turn;
      for (const rid of Object.keys(snapshot.rows)) {
        const realm = state.realms[rid], fiscal = snapshot.rows[rid];
        const saved = realm.treasury;
        if (saved && saved.version === 1) {
          saved.gold = numeric(saved.gold);
          saved.militaryAccrued = positive(saved.militaryAccrued);
          saved.distributionNextTurn = positive(saved.distributionNextTurn);
          if (typeof saved.lastSettledSeason !== 'number' || !isFinite(saved.lastSettledSeason)) saved.lastSettledSeason = season(state);
          if (typeof saved.lastRevaluedYear !== 'number' || !isFinite(saved.lastRevaluedYear)) saved.lastRevaluedYear = state.date.year;
          continue;
        }
        const net = fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep - positive(fiscal.government);
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
          const net = fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep - positive(fiscal.government);
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
        if (row) row.necessary = necessary(fiscal);
      }
      const reserves = FB.treasuryConstructionReserves(state, snapshot);
      for (const rid of Object.keys(snapshot.rows)) {
        const row = account(state, rid);
        if (row) row.reserveTarget = reserves ? reserves[rid] : civilianReserve(snapshot.rows[rid]);
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
  FB.treasuryConstructionReserves = function (state, snapshot) {
    if (!state.treasuryAccounting || state.treasuryAccounting.mode !== 'active') return null;
    return measured('construction reserves', function () {
      const fiscal = (snapshot || FB.treasurySnapshot(state)).rows, reserves = Object.create(null);
      const batch = { costs:Object.create(null), prices:Object.create(null), baskets:Object.create(null) };
      for (const rid of Object.keys(fiscal)) reserves[rid] = civilianReserve(fiscal[rid]);
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
      if (playerTax && snapshot.rows[liege]) {
        const fiscal = snapshot.rows[liege];
        fiscal.duesIn += positive(-playerTax.liege);
        const costs = governmentCosts(state, liege, fiscal);
        fiscal.administration = costs.administration; fiscal.court = costs.court;
        fiscal.government = costs.total;
      }
      const reserves = FB.treasuryConstructionReserves(state, snapshot);
      if (state.treasuryAccounting.playerMilitary) {
        state.treasuryAccounting.playerMilitaryLast = state.treasuryAccounting.playerMilitary;
        state.treasuryAccounting.playerMilitary = 0;
      } else state.treasuryAccounting.playerMilitaryLast = 0;
      for (const rid of Object.keys(snapshot.rows)) {
        const fiscal = snapshot.rows[rid], realm = state.realms[rid];
        if (!realm.treasury) realm.treasury = empty(state, 0);
        const row = account(state, rid);
        if (!row || row.lastSettledSeason >= period) continue;
        const opening = row.gold, military = positive(row.militaryAccrued);
        row.gold += fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep - positive(fiscal.government) - military;
        row.militaryAccrued = 0;
        row.lastSettledSeason = period;
        row.lastSummary = { period:period, opening:opening, income:fiscal.income,
          duesIn:fiscal.duesIn, duesOut:fiscal.duesOut, upkeep:fiscal.upkeep,
          administration:fiscal.administration, court:fiscal.court,
          government:fiscal.government, military:military, closing:row.gold };
        row.necessary = necessary(fiscal);
        row.reserveTarget = reserves ? reserves[rid] : civilianReserve(fiscal);
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
    if (!batch || host.rebellionId || (host.realm !== 'player' && !account(state, host.realm))) return;
    const timing = FB.game && FB.game._fastForwardTiming;
    const entry = timing && timing.enter('Treasury: military host quote');
    try { accrueHost(state, host, batch); }
    finally { if (timing) timing.leave(entry); }
  };
  function accrueHost(state, host, batch) {
    const parts = FB.hostFieldUpkeepParts(state, host, batch);
    batch.costs[host.realm] = (batch.costs[host.realm] || 0) + parts.total / 90;
    if (host.realm === 'player') batch.playerMercs = (batch.playerMercs || 0) + positive(FB.hostUnits(host).mercs);
  }
  FB.hostFieldUpkeepParts = function (state, host, batch) {
    batch = batch || { prices:Object.create(null), baskets:Object.create(null) };
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
    const out = { base:quote(parts.base, baskets.base), byClass:{}, mercenaries:0, campaignModifier:0 };
    let cost = out.base;
    for (const id of batch.classes) {
      const value = Math.max(0, Number(units[id]) || 0) / 100 * parts.byClass[id];
      out.byClass[id] = quote(value, baskets.byClass[id]);
      cost += out.byClass[id];
    }
    if (host.realm === 'player' && host.warId === 'holy' && FB.campaignHostModBonus) {
      out.campaignModifier = cost * Math.max(-1, FB.campaignHostModBonus(state, 'supplyUse'));
    }
    out.mercenaries = (positive(units.mercs) / (FBDATA.balance.mercCompanySize || 150)) *
      (FBDATA.balance.hostLogisticsMercenaryCompany === undefined ? 4 : FBDATA.balance.hostLogisticsMercenaryCompany);
    out.total = cost + out.campaignModifier + out.mercenaries;
    return out;
  };
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
        if (rid === 'player') {
          // Contracted companies are charged once across all player banners.
          const men = batch.playerMercs || 0;
          const size = FBDATA.balance.mercCompanySize || 150;
          const contracted = state.military && state.military.player && state.military.player.mercCos;
          const rate = FBDATA.balance.hostLogisticsMercenaryCompany;
          const adjustment = ((contracted || Math.ceil(men / size)) - men / size) * rate / 90;
          const cost = batch.costs[rid] + adjustment;
          state.player.gold -= cost;
          state.treasuryAccounting.playerMilitary = positive(state.treasuryAccounting.playerMilitary) + cost;
        } else {
          const row = account(state, rid);
          if (row) row.militaryAccrued += batch.costs[rid];
        }
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
