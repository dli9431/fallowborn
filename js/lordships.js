/* Fallowborn: hereditary settlement ownership and local fiscal projections. */
window.FB = window.FB || {};
(function () {
  'use strict';

  let revision = 0;
  let holderIndex = null;
  function profileCount(label, amount) {
    const timing = FB.game && FB.game._fastForwardTiming;
    if (timing) timing.count('Settlement: ' + label, amount);
  }
  function own(object, key) {
    return !!object && Object.prototype.hasOwnProperty.call(object, key);
  }
  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }
  function table(state) {
    const value = state && state.settlementLordships;
    return value && value.version === 1 && object(value.counties) ? value : null;
  }
  function county(state, pid) {
    const root = table(state);
    return root && own(root.counties, pid) ? root.counties[pid] : null;
  }
  function slotValid(pid, slot) {
    const sites = FB.world && FB.world.sitesByProv && FB.world.sitesByProv[pid];
    return typeof slot === 'number' && isFinite(slot) && Math.floor(slot) === slot &&
      slot >= 0 && !!(sites && sites.list && sites.list[slot]);
  }
  function living(state, id) {
    const c = id && own(state.chars, id) && state.chars[id];
    return c && !c.dead ? c : null;
  }
  function record(state, pid, slot) {
    const c = county(state, pid);
    return c && c.lordships && own(c.lordships, slot) ? c.lordships[slot] : null;
  }
  function copy(value) { return value ? JSON.parse(JSON.stringify(value)) : null; }

  FB.settlementCountyHolder = function (state, pid) {
    const id = state && ((state.holder && state.holder[pid]) ||
      (state.owner && state.owner[pid]));
    const realm = id && state.realms && state.realms[id];
    return realm && realm.alive ? id : null;
  };
  FB.homeCountyAuthority = function (state) {
    const pid = state && state.player && state.player.provinceId;
    const rid = pid && FB.settlementCountyHolder(state, pid);
    const c = rid === 'player' ? living(state, state.player.charId) :
      (rid && FB.realmRulerCharacterSnapshot(state, rid));
    return { provinceId:pid || null, realmId:rid || null, characterId:c && c.id || null };
  };
  /* Mutation boundary, not a projection. Old story lords remain contacts, but
     never replace the reigning holder merely because their role cache exists. */
  FB.syncHomeCountyLord = function (state) {
    if (!state || !state.player || !state.roles) return null;
    const authority = FB.homeCountyAuthority(state);
    let c = authority.characterId && state.chars[authority.characterId];
    if (!c && authority.realmId && authority.realmId !== 'player') {
      c = FB.materializeRealmRuler(state, authority.realmId, { displayOnly:true });
    }
    const old = state.roles.lord && state.chars[state.roles.lord];
    if (old && (!c || old.id !== c.id) && old.role === 'lord') old.role = 'notable';
    if (c && c.id !== state.player.charId) state.roles.lord = c.id;
    else delete state.roles.lord;
    return c && c.id !== state.player.charId ? c : null;
  };

  FB.invalidateSettlementLordships = function (state, pid) {
    profileCount('holding index invalidations');
    revision++;
    FB.militaryInputRevision = (FB.militaryInputRevision || 0) + 1;
    holderIndex = null;
    if (FB.invalidateRealmCache) FB.invalidateRealmCache();
    if (pid && FB.invalidateBuildingIndex) FB.invalidateBuildingIndex(state, pid);
  };
  FB.settlementLordshipRevision = function () { return revision; };
  FB.settlementEstablishedCount = function (state, pid) {
    const c = county(state, pid);
    return c ? Math.max(0, Number(c.established) || 0) : 0;
  };
  FB.rememberSettlementSites = function (state, pid) {
    const root = table(state);
    if (!root || !FB.world.sitesByProv[pid]) return;
    const count = FB.settlementVisibleCount(state, pid);
    let c = county(state, pid);
    if (!c) c = root.counties[pid] = { established:count, lordships:{} };
    else if (count > c.established) c.established = count;
  };
  FB.settlementLordship = function (state, pid, slot) {
    return slotValid(pid, slot) ? copy(record(state, pid, slot)) : null;
  };
  // knownCount is internal to a synchronous read; never retain it across mutations.
  FB.settlementHolder = function (state, pid, slot, knownCount) {
    if (!slotValid(pid, slot) || slot >= (knownCount === undefined ?
        FB.settlementVisibleCount(state, pid) : knownCount)) return null;
    const r = record(state, pid, slot);
    if (r && (living(state, r.holderId) ||
        (r.playerHouse && state.player && r.holderId === state.player.charId))) {
      return { kind:'character', id:r.holderId };
    }
    const rid = FB.settlementCountyHolder(state, pid);
    return rid ? { kind:'realm', id:rid } : null;
  };
  function actorHolds(state, actor, holder) {
    if (!holder) return false;
    if (typeof actor === 'string') actor = { kind:'realm', id:actor };
    if (!actor) actor = { kind:'realm', id:'player' };
    if (actor.kind === holder.kind && actor.id === holder.id) return true;
    if (actor.kind === 'realm' && holder.kind === 'character') {
      if (actor.id === 'player') return holder.id === state.player.charId;
      const c = FB.realmRulerCharacterSnapshot(state, actor.id);
      return !!c && c.id === holder.id;
    }
    if (actor.kind === 'character' && holder.kind === 'realm') {
      if (holder.id === 'player') return actor.id === state.player.charId;
      const c = FB.realmRulerCharacterSnapshot(state, holder.id);
      return !!c && c.id === actor.id;
    }
    return false;
  }
  function actorRef(state, actor) {
    if (!actor) return { kind:'realm', id:'player' };
    if (typeof actor === 'string') return { kind:'realm', id:actor };
    if (actor.kind === 'character' && actor.id === state.player.charId) return { kind:'realm', id:'player' };
    if (actor.kind === 'character' && state.chars[actor.id] && FB.realmIdForRulerCharacter) {
      const rid = FB.realmIdForRulerCharacter(state, state.chars[actor.id]);
      if (rid && state.realms[rid] && state.realms[rid].alive) return { kind:'realm', id:rid };
    }
    return actor;
  }
  FB.settlementActor = actorRef;
  FB.directSettlements = function (state, actor) {
    actor = actorRef(state, actor);
    const out = [], candidates = Object.create(null);
    let cid = actor.kind === 'character' ? actor.id : null;
    let rid = actor.kind === 'realm' ? actor.id : null;
    if (rid === 'player') cid = state.player.charId;
    else if (rid) {
      const c = FB.realmRulerCharacterSnapshot(state, rid);
      cid = c && c.id;
    } else if (cid && FB.realmIdForRulerCharacter) {
      rid = FB.realmIdForRulerCharacter(state, state.chars[cid]);
    }
    if (rid) for (const pid of FB.realmHeldCounties(state, rid)) candidates[pid] = true;
    if (cid) for (const site of entriesFor(state, cid)) candidates[site.provinceId] = true;
    Object.keys(candidates).sort().forEach(function (pid) {
      profileCount('direct holding counties scanned');
      const count = FB.settlementVisibleCount(state, pid);
      for (let slot = 0; slot < count; slot++) {
        profileCount('direct holding sites scanned');
        const holder = FB.settlementHolder(state, pid, slot, count);
        const held = actor.kind === 'realm' ? holder &&
          (holder.kind === 'realm' ? holder.id === actor.id : holder.id === cid) :
          actorHolds(state, actor, holder);
        if (held) {
          out.push({ provinceId:pid, settlement:slot });
        }
      }
    });
    return out;
  };
  // County-local eligibility must not enumerate the actor's entire domain.
  FB.holdsSettlementInCounty = function (state, actor, pid) {
    actor = actorRef(state, actor);
    const count = FB.settlementVisibleCount(state, pid);
    const ruler = actor.kind === 'realm' && actor.id !== 'player' ?
      FB.realmRulerCharacterSnapshot(state, actor.id) : null;
    const cid = actor.id === 'player' && actor.kind === 'realm' ? state.player.charId : ruler && ruler.id;
    profileCount('local holding counties checked');
    for (let slot = 0; slot < count; slot++) {
      profileCount('local holding sites checked');
      const holder = FB.settlementHolder(state, pid, slot, count);
      if (actor.kind === 'realm' ? holder &&
          (holder.kind === 'realm' ? holder.id === actor.id : holder.id === cid) :
          actorHolds(state, actor, holder)) return true;
    }
    return false;
  };
  FB.settlementConstructionAuthority = function (state, pid, slot, actor) {
    actor = actorRef(state, actor);
    const holder = FB.settlementHolder(state, pid, slot);
    return { holder:holder, countyHolderId:FB.settlementCountyHolder(state, pid),
      direct:!(actor.kind === 'realm' && actor.id === 'player' && state.player.tier < 3) &&
        actorHolds(state, actor, holder), liveAccounting:'settlement', integrated:true };
  };
  function actorRealm(state, actor, pid) {
    actor = actorRef(state, actor);
    if (actor.kind === 'realm') {
      if (actor.id === 'player' && !(state.realms.player && state.realms.player.alive)) {
        return FB.playerRealmId(state) || FB.settlementCountyHolder(state, pid);
      }
      return actor.id;
    }
    const c = state.chars[actor.id];
    return (c && FB.realmIdForRulerCharacter(state, c)) || FB.settlementCountyHolder(state, pid);
  }
  FB.settlementCapacityProjection = function (state, actor) {
    actor = actorRef(state, actor);
    const sites = FB.directSettlements(state, actor);
    const home = actor.kind === 'character' && state.chars[actor.id] ?
      FB.characterResidence(state, state.chars[actor.id]) : state.player.provinceId;
    const rid = actorRealm(state, actor, sites.length ? sites[0].provinceId : home);
    const c = actor.kind === 'character' ? state.chars[actor.id] : actor.id === 'player'
      ? state.chars[state.player.charId] : FB.realmRulerCharacterSnapshot(state, actor.id);
    const ste = c ? FB.skillOf(c, 'ste') : 0;
    const bonus = FB.techBonus ? FB.techBonus(state, 'domain', rid) : 0;
    const limit = (FBDATA.balance.settlementDomainBase || 2) +
      Math.floor(ste / (FBDATA.balance.domainStewPer || 5)) + bonus;
    const over = Math.max(0, sites.length - limit);
    return { directCount:sites.length, settlements:sites, limit:limit, over:over,
      technology:bonus, multiplier:Math.pow(1 - (FBDATA.balance.overDomainPenalty || 0.15), over),
      enforced:true, stage:'integrated' };
  };
  FB.settlementCountyPenalty = function (state, actor) {
    actor = actorRef(state, actor);
    if (actor.kind !== 'realm') return 1;
    if (actor.id === 'player') return FB.domainPenalty(state);
    const c = FB.realmRulerCharacterSnapshot(state, actor.id);
    const cap = (FBDATA.balance.domainBase || 4) + Math.floor((c ? FB.skillOf(c, 'ste') : 0) /
      (FBDATA.balance.domainStewPer || 5)) + FB.techBonus(state, 'domain', actor.id);
    return Math.pow(1 - (FBDATA.balance.overDomainPenalty || 0.15),
      Math.max(0, FB.realmHeldCounties(state, actor.id).length - cap));
  };
  FB.settlementPopulationShares = function (state, pid) {
    const n = FB.settlementVisibleCount(state, pid);
    const population = FB.settlementPopulations ? FB.settlementPopulations(state, pid) : [];
    let total = 0;
    for (let i = 0; i < n; i++) total += Math.max(0, population[i] || 0);
    const out = [];
    for (let i = 0; i < n; i++) out.push(total ? Math.max(0, population[i] || 0) / total : 1 / n);
    return out;
  };
  FB.settlementTaxBase = function (state, pid, slot, rate, shares) {
    shares = shares || FB.settlementPopulationShares(state, pid);
    if (shares[slot] === undefined) return 0;
    const B = FBDATA.balance, sites = FB.world.sitesByProv[pid];
    const rank = FB.siteKindRank(state, sites.list[slot]);
    const kind = rank >= 2 ? B.settlementCityTax : rank === 1 ? B.settlementTownTax : B.settlementVillageTax;
    const baseRate = B.taxPerDev || 1.5;
    rate = rate === undefined ? baseRate : rate;
    return ((state.dev[pid] || 1) * rate * shares[slot] + kind * rate / baseRate) *
      (FB.countyPopulationFactor ? FB.countyPopulationFactor(state, pid) : 1) *
      Math.max(0, 1 + (FB.modBonus ? FB.modBonus(state, 'tax', pid) : 0));
  };
  FB.settlementFiscalProjection = function (state, pid, slot, context) {
    context = context || {};
    const visible = context.visible || (context.visible = {});
    if (visible[pid] === undefined) {
      profileCount('fiscal visibility builds');
      visible[pid] = FB.settlementVisibleCount(state, pid);
    } else profileCount('fiscal visibility cache hits');
    const holder = context.holder || FB.settlementHolder(state, pid, slot, visible[pid]);
    if (!holder) return null;
    const actor = actorRef(state, holder), key = actor.kind + ':' + actor.id;
    const capacities = context.capacities || (context.capacities = {});
    profileCount(capacities[key] ? 'fiscal capacity cache hits' : 'fiscal capacity builds');
    const capacity = capacities[key] || (capacities[key] = FB.settlementCapacityProjection(state, actor));
    const penalties = context.penalties || (context.penalties = {});
    if (penalties[key] === undefined) {
      profileCount('fiscal county penalty builds');
      penalties[key] = FB.settlementCountyPenalty(state, actor);
    } else profileCount('fiscal county penalty cache hits');
    const countyPenalty = penalties[key];
    const populations = context.populations || (context.populations = {});
    profileCount(populations[pid] ? 'fiscal population cache hits' : 'fiscal population builds');
    const shares = populations[pid] || (populations[pid] = FB.settlementPopulationShares(state, pid));
    const militaryOnly = !!context.militaryOnly;
    const base = militaryOnly ? 0 : FB.settlementTaxBase(state, pid, slot, undefined, shares);
    const countyInputs = context.countyInputs || (context.countyInputs = {});
    let input = countyInputs[pid];
    if (!input) {
      let support = FB.countySupportFactor(state, pid);
      if (FB.hasModifier(state, 'commons_uprising', pid)) support *= 1 - FB.commonsUprisingReduction(state, pid);
      input = countyInputs[pid] = { support:support,
        population:!context.baseline && FB.countyPopulationFactor ? FB.countyPopulationFactor(state, pid) : 1,
        levy:Math.max(0, 1 + FB.modBonus(state, 'levy', pid)) };
      profileCount('fiscal county input builds');
    } else profileCount('fiscal county input cache hits');
    const support = input.support;
    const bonus = function (name) { return FB.buildingBonusAt ? FB.buildingBonusAt(state, pid, slot, name) : 0; };
    const building = militaryOnly ? 0 : bonus('tax') * support;
    const factor = capacity.multiplier * countyPenalty;
    const tax = base * factor, tolls = building * factor;
    const gross = tax + tolls;
    const national = militaryOnly ? 0 : gross * FB.techBonus(state, 'tax', actorRealm(state, actor, pid));
    const r = record(state, pid, slot);
    const delegated = holder.kind === 'character' &&
      !actorHolds(state, { kind:'realm', id:FB.settlementCountyHolder(state, pid) }, holder);
    const charter = FB.feudalCharterDef(r && r.obligations && r.obligations.charterId || 'customary_service');
    const dues = delegated ? gross * charter.taxShare : 0;
    const rawLevy = (state.dev[pid] || 1) * shares[slot] * FBDATA.balance.levyPerDev *
      input.population * input.levy + bonus('levy') * support;
    const levy = rawLevy * factor;
    const levyDues = delegated ? levy * charter.levyShare : 0;
    const specialists = (bonus('retinue') + bonus('archers')) * factor;
    const specialistDues = delegated ? specialists * charter.levyShare : 0;
    const upkeep = militaryOnly ? 0 : bonus('upkeep');
    return { provinceId:pid, settlement:slot, holder:holder,
      countyHolderId:FB.settlementCountyHolder(state, pid),
      obligations:!militaryOnly && r ? copy(r.obligations) : null, integrated:true,
      amounts:{ base:base, tax:tax, tolls:tolls, gross:gross, upkeep:upkeep,
        dues:dues, national:national, net:gross + national - upkeep - dues, levy:levy, levyDues:levyDues,
        availableLevy:levy - levyDues, specialists:specialists, specialistDues:specialistDues,
        serviceRate:delegated ? charter.levyShare : 0, countyPenalty:countyPenalty,
        settlementPenalty:capacity.multiplier } };
  };
  FB.settlementContributionProjection = function (state, pid, slot) {
    const fiscal = FB.settlementFiscalProjection(state, pid, slot);
    if (!fiscal) return null;
    return { from:fiscal.holder, toRealmId:fiscal.countyHolderId,
      obligations:fiscal.obligations, amounts:{ tax:fiscal.amounts.dues,
        levy:fiscal.amounts.levyDues + fiscal.amounts.specialistDues }, integrated:true };
  };
  FB.settlementActorFiscal = function (state, actor, context) {
    actor = actorRef(state, actor);
    const result = { tax:0, tolls:0, upkeep:0, duesIn:0, duesOut:0, levy:0, levyIn:0,
      countyLoss:0, settlementLoss:0, national:0 };
    context = context || {};
    const quotes = context.quotes || (context.quotes = {});
    function quote(pid, slot) {
      const key = pid + ':' + slot;
      if (own(quotes, key)) { profileCount('fiscal quote cache hits'); return quotes[key]; }
      profileCount('fiscal quote builds');
      return (quotes[key] = FB.settlementFiscalProjection(state, pid, slot, context));
    }
    for (const site of FB.directSettlements(state, actor)) {
      const a = quote(site.provinceId, site.settlement).amounts;
      result.tax += a.tax; result.tolls += a.tolls; result.upkeep += a.upkeep; result.national += a.national;
      result.countyLoss += (a.base + (a.countyPenalty * a.settlementPenalty ? a.tolls / (a.countyPenalty * a.settlementPenalty) : 0)) * (a.countyPenalty - 1);
      result.settlementLoss += (a.base * a.countyPenalty + (a.settlementPenalty ? a.tolls / a.settlementPenalty : 0)) * (a.settlementPenalty - 1);
      result.duesOut += a.dues; result.levy += a.availableLevy + a.specialists - a.specialistDues;
    }
    if (actor.kind === 'realm') for (const pid of FB.realmHeldCounties(state, actor.id)) {
      const c = county(state, pid);
      for (const key of Object.keys(c && c.lordships || {})) {
        const f = quote(pid, Number(key));
        if (!f || actorHolds(state, actor, f.holder)) continue;
        result.duesIn += f.amounts.dues; result.levyIn += f.amounts.levyDues + f.amounts.specialistDues;
      }
    }
    return result;
  };
  FB.baronyAccount = function (state, cid) {
    const root = table(state);
    const account = root && root.accounts && root.accounts[cid];
    return account ? copy(account) : { gold:0, lastSeason:null };
  };
  FB.settleBaronyAccounts = function (state, season, context) {
    context = context || {};
    const root = table(state);
    if (!root) return;
    root.accounts = root.accounts || {};
    const holders = {};
    for (const pid of Object.keys(root.counties)) {
      for (const slot of Object.keys(root.counties[pid].lordships || {})) {
        const cid = root.counties[pid].lordships[slot].holderId;
        if (cid !== state.player.charId && living(state, cid) &&
            actorRef(state, { kind:'character', id:cid }).kind === 'character') holders[cid] = true;
      }
    }
    for (const cid of Object.keys(holders).sort()) {
      const actor = { kind:'character', id:cid };
      const fiscal = FB.settlementActorFiscal(state, actor, context);
      const account = root.accounts[cid] || (root.accounts[cid] = { gold:0, lastSeason:season - 1 });
      if (account.lastSeason >= season) continue;
      account.gold += fiscal.tax + fiscal.tolls + fiscal.national - fiscal.upkeep - fiscal.duesOut;
      account.lastSeason = season;
      account.lastNet = fiscal.tax + fiscal.tolls + fiscal.national - fiscal.upkeep - fiscal.duesOut;
    }
  };
  FB.baronyConstructionFunds = function (state, cid) {
    const fiscal = FB.settlementActorFiscal(state, { kind:'character', id:cid });
    const reserve = (fiscal.upkeep + fiscal.duesOut) * (FBDATA.balance.realmReserveSeasons || 2);
    return Math.max(0, FB.baronyAccount(state, cid).gold - reserve);
  };
  FB.spendBaronyConstruction = function (state, cid, amount, upkeep) {
    const root = table(state), account = root && root.accounts && root.accounts[cid];
    if (!account || !isFinite(amount) || amount < 0 || amount + (upkeep || 0) *
        (FBDATA.balance.realmReserveSeasons || 2) > FB.baronyConstructionFunds(state, cid)) return false;
    account.gold -= amount;
    return true;
  };
  /* County progression uses the existing realm hierarchy and county campaigns. */
  FB.landedBaron = function (state) {
    return state.player.tier === 3 && FB.directSettlements(state).length > 0;
  };
  FB.countyGrantCandidates = function (state) {
    if (!FB.landedBaron(state)) return [];
    const home = FB.settlementCountyHolder(state, state.player.provinceId);
    const count = state.realms[home], out = [], seen = {};
    let rid = count && count.rank >= 2 ? home : count && count.liege;
    while (rid && !seen[rid]) {
      seen[rid] = true;
      const r = state.realms[rid];
      if (!r || !r.alive) break;
      const held = FB.realmHeldCounties(state, rid);
      if (r.rank >= 2 && held.length > 1) held.slice().sort().forEach(function (pid) {
        if (pid !== r.capital && !FB.countyOccupiedOrBesieged(state, pid)) out.push({ provinceId:pid, grantorId:rid });
      });
      rid = r.liege;
    }
    return out;
  };
  FB.countyPetitionChance = function (state, rid) {
    return FB.clamp(0.25 + FB.standingOf(state, { kind:'realm', id:rid }) / 200, 0.1, 0.85);
  };
  FB.countyInvestiture = function (state, pid, oldId, liege, options) {
    if (FB.settlementCountyHolder(state, pid) !== oldId || oldId === 'player') return false;
    const p = state.player, old = state.realms[oldId];
    const oldRuler = FB.realmRulerCharacterSnapshot(state, oldId);
    const sites = county(state, pid);
    if (sites && oldRuler) Object.keys(sites.lordships).forEach(function (slot) {
      if (sites.lordships[slot].holderId === oldRuler.id) delete sites.lordships[slot];
    });
    const root = table(state);
    if (root.disputedCounties) delete root.disputedCounties[pid];
    p.provs = p.provs || [];
    if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
    state.holder[pid] = 'player';
    if (p.tier < 4) FB.setPlayerTier(state, 4, { attachLiege:false });
    FB.changePlayerLiege(state, liege || null, 'county:investiture');
    FB.foundPlayerRealm(state);
    if (state.peakTier === undefined || p.tier > state.peakTier) {
      state.peakTier = p.tier; state.peakTitleData = FB.titleSnapshot(state);
    }
    // Unassigned settlements follow the county title. Delegated records and
    // the family's seat/property remain attached to their existing places.
    if (old.capital === pid) old.capital = FB.realmHeldCounties(state, oldId)[0] || old.capital;
    if (!(options && options.deferRetirement)) FB.realmBuryIfEmpty(state, oldId);
    FB.invalidateSettlementLordships(state, pid);
    return true;
  };
  FB.countyClaim = function (state, pid) {
    const p = state.player, c = state.chars[p.charId];
    const claims = table(state) && table(state).countyClaims || {};
    const restored = (claims[pid] || []).some(function (r) {
      return r.characterId === p.charId || r.dynasty && c && r.dynasty === c.dyn;
    });
    if (restored) return 'restoration';
    // Read stored claims directly: the ordinary foreign-war filter excludes a
    // baron's own count, but that exclusion must not erase the underlying right.
    const claim = p.fabricatedClaims && p.fabricatedClaims[pid];
    const old = p.fabricatedClaim;
    if (claim || old && (old.pid || old) === pid) return 'fabricated';
    return null;
  };
  FB.countyChallengeQuote = function (state, pid) {
    const p = state.player, root = table(state), countId = FB.settlementCountyHolder(state, pid);
    const count = state.realms[countId];
    const superior = count && count.liege && state.realms[count.liege] && state.realms[count.liege].alive ? count.liege : null;
    const ruler = countId && FB.realmRulerCharacterSnapshot(state, countId);
    const superiorRuler = superior && FB.realmRulerCharacterSnapshot(state, superior);
    const claim = FB.countyClaim(state, pid);
    const consent = root && root.countyConsent && root.countyConsent[pid];
    const authorized = !!(superior && consent && consent.countId === countId &&
      consent.rulerId === (ruler && ruler.id) && consent.superior === superior &&
      consent.superiorRulerId === (superiorRuler && superiorRuler.id) && consent.sponsorId === p.charId);
    const enemy = superior && !authorized ? superior : countId;
    const cause = { type:'aggression', target:pid, enemy:enemy };
    const me = state.chars[p.charId];
    const sacrilege = !!(me && enemy && FB.sameFaithHeadWarPolicy(state, me.religion, enemy, pid) === 'sacrilege');
    const aggression = !claim && !authorized && enemy ? FB.warCausePreview(state, cause).aggression : null;
    let reason = '';
    if (!FB.landedBaron(state)) reason = FB.T('You must hold a settlement as Baron to challenge its count.');
    else if (!FB.directSettlements(state).some(function (site) { return site.provinceId === pid; })) reason = FB.T('You must hold a barony in the target county.');
    else if (!count || !count.alive || countId === 'player') reason = FB.T('There is no count to challenge here.');
    else if (p.travel || p.flags.in_prison || p.dead) reason = FB.T('Return home and be free to command.');
    else if (FB.realmWars(state, 'player').length) reason = FB.T('Finish your current campaign before challenging a count.');
    else if (FB.countyOccupiedOrBesieged(state, pid)) reason = FB.T('The target county is already occupied or besieged.');
    else if (FB.greatHolyWarCamp(state, 'player') && FB.greatHolyWarCamp(state, 'player') === FB.greatHolyWarCamp(state, enemy)) reason = FB.T('You share a holy-war camp with the defender.');
    else {
      for (const rid of [countId, enemy]) {
        if (FB.truceExpiry(state, 'player', rid)) { reason = FB.truceText(state, 'player', rid); break; }
        if (FB.areAlliedSnapshot(state, 'player', rid) || state.pacts && state.pacts[rid] > state.turn) {
          reason = FB.T('An alliance or peace pact protects a participant.'); break;
        }
      }
    }
    return { provinceId:pid, sponsorId:p.charId, countId:countId,
      rulerId:ruler && ruler.id || null, dynasty:ruler && ruler.dyn || '',
      superior:superior, superiorRulerId:superiorRuler && superiorRuler.id || null,
      enemy:enemy, claim:claim, authorized:authorized,
      justification:authorized ? 'sanctioned' : claim ? 'claim' : 'usurpation',
      aggression:aggression, sacrilege:sacrilege, standingCost:superior && !authorized ? -20 : 0,
      ready:!reason, reason:reason };
  };
  FB.requestCountyChallenge = function (state, reviewed) {
    const q = reviewed && FB.countyChallengeQuote(state, reviewed.provinceId);
    if (!q || !q.ready || !q.superior || q.authorized || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    const root = table(state), last = root.countyConsentTurn;
    if (last !== undefined && state.turn - last < FB.countyPetitionDays()) return false;
    root.countyConsentTurn = state.turn;
    const accepted = !!q.claim && FB.standingOf(state, { kind:'realm', id:q.superior }) >= 65;
    if (accepted) {
      root.countyConsent = root.countyConsent || {};
      root.countyConsent[q.provinceId] = { countId:q.countId, rulerId:q.rulerId,
        superior:q.superior, superiorRulerId:q.superiorRulerId, sponsorId:q.sponsorId };
    }
    FB.news(state, accepted ? FB.msg('news.county.challenge_authorized',
      'The superior authorizes your challenge for {county}. Victory will bring recognized countship.', { county:FB.world.byId[q.provinceId].name }) :
      FB.msg('news.county.challenge_refused', 'The superior refuses your challenge for {county} and will defend the incumbent.', { county:FB.world.byId[q.provinceId].name }));
    return { accepted:accepted };
  };
  FB.beginCountyChallenge = function (state, reviewed) {
    const q = reviewed && FB.countyChallengeQuote(state, reviewed.provinceId);
    if (!q || !q.ready || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    const p = state.player, oldLiege = p.liege;
    if (q.sacrilege) FB.applySacrilegiousWarConsequences(state, state.chars[p.charId].religion);
    if (q.justification === 'usurpation') FB.applyWarOfAggressionConsequences(state, { type:'aggression', target:q.provinceId, enemy:q.enemy });
    // A temporary campaign participant lets a landed baron use ordinary hosts,
    // county occupations and peace. It conveys no county or higher rank.
    FB.changePlayerLiege(state, q.authorized ? q.superior : null, 'county:challenge');
    FB.foundPlayerRealm(state);
    const w = FB.registerOrdinaryWar(state, 'player', { enemy:q.enemy, target:q.provinceId,
      legacy:false, casus:{ type:'county_replacement', target:q.provinceId },
      objectives:[{ type:'county_replacement', target:q.provinceId }],
      countyChallenge:{ provinceId:q.provinceId, countId:q.countId, rulerId:q.rulerId,
        dynasty:q.dynasty, superior:q.superior, justification:q.justification,
        claim:q.claim, oldLiege:oldLiege || null } });
    FB.recordWarDeclaration(state, w, { unlawful:false });
    if (q.standingCost) FB.adjustStanding(state, { kind:'realm', id:q.superior }, q.standingCost, 'county:rebellion');
    FB.withOrdinaryWar(state, w.id, function () {
      FB.warFooting(state); FB.queueWarEvent(state, 'war_muster', {});
    });
    return true;
  };
  FB.completeCountyChallenge = function (state, w) {
    const q = w && w.countyChallenge;
    if (!q || q.awarded || w.status !== 'active' || !w.occupations[q.provinceId] ||
        !w.occupations[q.provinceId].occupied || FB.settlementCountyHolder(state, q.provinceId) !== q.countId) return false;
    const superior = q.superior && state.realms[q.superior] && state.realms[q.superior].alive ? q.superior : null;
    if (!FB.countyInvestiture(state, q.provinceId, q.countId, superior, { deferRetirement:true })) return false;
    const root = table(state);
    if (q.justification === 'usurpation') {
      root.countyClaims = root.countyClaims || {};
      const claims = root.countyClaims[q.provinceId] || (root.countyClaims[q.provinceId] = []);
      claims.push({ characterId:q.rulerId, dynasty:q.dynasty, createdTurn:state.turn });
      FB.applyAggressionConquest(state, w, q.provinceId);
    }
    if (superior && q.justification !== 'sanctioned') {
      root.disputedCounties = root.disputedCounties || {};
      root.disputedCounties[q.provinceId] = { superior:superior, acquiredTurn:state.turn };
    }
    if (q.claim === 'fabricated') FB.consumeFabricatedClaim(state, q.provinceId);
    FB.news(state, FB.msg('news.county.challenge_won',
      'You take the county of {county}. Existing baronies and private property retain their owners.', { county:FB.world.byId[q.provinceId].name }));
    w.countyChallenge.awarded = true;
    return true;
  };
  FB.finishCountyChallenge = function (state, w) {
    const q = w && w.countyChallenge, p = state.player;
    if (!q || q.awarded || q.finished) return;
    q.finished = true;
    if (!(p.provs && p.provs.length)) {
      const count = FB.settlementCountyHolder(state, p.provinceId);
      FB.changePlayerLiege(state, count, 'county:challenge_ended');
      if (state.realms.player) FB.markRealmDead(state, 'player');
      FB.invalidateSettlementLordships(state);
    }
  };
  FB.countyRecognitionQuote = function (state, pid) {
    const root = table(state), p = state.player, r = root && root.disputedCounties && root.disputedCounties[pid];
    const superior = p.liege && state.realms[p.liege] && state.realms[p.liege].alive ? p.liege : null;
    const cost = FB.rankElevationCost(state, 3, 4);
    const last = p.cooldowns && p.cooldowns.petition_liege;
    let reason = '';
    if (!r || FB.settlementCountyHolder(state, pid) !== 'player') reason = FB.T('You hold no disputed title here.');
    else if (!superior) reason = FB.T('An independent count needs no superior recognition.');
    else if (p.travel || p.flags.in_prison || FB.realmWars(state, 'player').length) reason = FB.T('Return home at peace and free to petition.');
    else if (last !== undefined && state.turn - last < FB.countyPetitionDays()) reason = FB.T('You may petition again in {days} days.', { days:FB.countyPetitionDays() - state.turn + last });
    else if (p.gold < cost.gold || p.prestige < cost.prestige || p.piety < cost.piety) reason = FB.T('You cannot yet afford the investiture cost.');
    return { provinceId:pid, sponsorId:p.charId, acquiredTurn:r && r.acquiredTurn, superior:superior, cost:cost,
      chance:superior ? FB.countyPetitionChance(state, superior) : 0, ready:!reason, reason:reason };
  };
  FB.petitionCountyRecognition = function (state, reviewed) {
    const q = reviewed && FB.countyRecognitionQuote(state, reviewed.provinceId);
    if (!q || !q.ready || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    const p = state.player;
    p.cooldowns = p.cooldowns || {}; p.cooldowns.petition_liege = state.turn;
    const accepted = FB.chance(q.chance);
    if (accepted) {
      p.gold -= q.cost.gold; p.prestige -= q.cost.prestige; p.piety -= q.cost.piety;
      delete table(state).disputedCounties[q.provinceId];
    }
    FB.news(state, accepted ? FB.msg('news.county.recognized',
      'Your superior recognizes your rule of {county}. Rival claims survive.', { county:FB.world.byId[q.provinceId].name }) :
      FB.msg('news.county.recognition_refused', 'Recognition of {county} is refused. You retain control.', { county:FB.world.byId[q.provinceId].name }));
    return { accepted:accepted };
  };

  FB.activeSettlementFounding = function (state) {
    const root = table(state), projects = root && root.founding || {};
    for (const pid of Object.keys(projects).sort()) {
      const project = projects[pid];
      if (project && project.status === 'building' && project.playerHouse) return copy(project);
    }
    return null;
  };
  FB.settlementFoundingEligibility = function (state, pid) {
    const root = table(state), p = state.player;
    const info = FB.world && FB.world.sitesByProv && FB.world.sitesByProv[pid];
    const count = info ? FB.settlementVisibleCount(state, pid) : 0;
    const capacity = info ? FB.settlementCapacity(state, pid) : 0;
    const rid = FB.settlementCountyHolder(state, pid);
    const active = FB.activeSettlementFounding(state);
    const reserved = root && root.founding && root.founding[pid];
    const cost = FB.rankElevationCost(state, 2, 3);
    let reason = '';
    if (!root || root.foundingVersion !== 1) reason = FB.T('Settlement founding is unavailable in this save.');
    else if (active) reason = FB.T('Your household already has a funded settlement project.');
    else if (reserved && reserved.status === 'building') reason = FB.T('A charter already reserves this county for founding.');
    else if (p.tier !== 2 && !(p.tier >= 4 && rid === 'player')) reason = FB.T('Found as Gentry in your home county, or in a county you directly rule.');
    else if (p.tier === 2 && !FB.gentryEstablished(state)) reason = FB.T('An heir of a later generation must inherit your Gentry standing before the household can fund a barony charter.');
    else if (p.tier === 2 && (p.travel || p.provinceId !== pid)) reason = FB.T('Return to your home county to charter a settlement.');
    else if (!living(state, p.charId) || p.dead) reason = FB.T('Choose the next household head before founding.');
    else if (!rid || !info || !count) reason = FB.T('A settled county and its current ruler are required.');
    else if (count >= Math.min(8, info.list.length)) reason = FB.T('All settlement sites in this county are already founded.');
    else if (count >= capacity) reason = FB.T('This county has {established} settlements; current development allows {capacity}. Raise county development to unlock the next site (maximum 8).', { established:count, capacity:capacity });
    else if (FB.countyOccupiedOrBesieged(state, pid)) reason = FB.T('Wait until the county is free of occupation and siege.');
    else if (p.prestige < cost.prestige) reason = FB.T('You need {prestige} prestige to fund this charter.', { prestige:cost.prestige });
    else if (p.piety < cost.piety) reason = FB.T('You need {piety} piety to fund this charter.', { piety:cost.piety });
    else if (p.gold < cost.gold) reason = FB.T('You need {money:amount} to fund construction.', { amount:cost.gold });
    const grantor = rid === 'player' ? state.chars[p.charId] : FB.realmRulerCharacterSnapshot(state, rid);
    return { provinceId:pid, countyHolderId:rid, grantorId:grantor && grantor.id || null,
      rulerFounded:p.tier >= 4 && rid === 'player',
      sponsorId:p.charId, settlement:count, site:info && info.list[count] && info.list[count].site || null,
      established:count, capacity:capacity, unusedSlots:Math.max(0, capacity - count),
      gold:cost.gold, prestige:cost.prestige, piety:cost.piety,
      days:Math.max(1, FBDATA.balance.settlementFoundingSeasons || 4) * 90,
      ready:!reason, reason:reason };
  };
  FB.beginSettlementFounding = function (state, reviewed) {
    if (!reviewed) return false;
    const current = FB.settlementFoundingEligibility(state, reviewed.provinceId);
    if (!current.ready || JSON.stringify(current) !== JSON.stringify(reviewed)) return false;
    const root = table(state), c = state.chars[state.player.charId];
    if (!object(root.founding)) root.founding = {};
    state.player.gold -= current.gold;
    state.player.prestige -= current.prestige; state.player.piety -= current.piety;
    root.foundingSerial = (root.foundingSerial || 0) + 1;
    root.founding[current.provinceId] = {
      id:root.foundingSerial,
      status:'building', playerHouse:true, provinceId:current.provinceId, rulerFounded:current.rulerFounded,
      sponsorId:c.id, founderId:c.id, dynasty:c.dyn || '',
      grantorId:current.grantorId, grantorRealmId:current.countyHolderId,
      settlement:current.settlement, site:current.site, funded:current.gold,
      prestige:current.prestige, piety:current.piety, costsPaid:true, startedTurn:state.turn,
      dueTurn:state.turn + current.days, lastTurn:state.turn, pausedDays:0
    };
    FB.invalidateSettlementLordships(state);
    FB.news(state, FB.msg('news.lordship.founding_funded',
      'Your household commits {money:gold} to found {settlement}. The charter preserves its future lordship for your heirs.', {
        gold:current.gold, settlement:FB.world.sitesByProv[current.provinceId].list[current.settlement].name
      }));
    return true;
  };
  FB.settlementFoundingStatus = function (state) {
    const project = FB.activeSettlementFounding(state);
    if (!project) return null;
    const p = state.player, pid = project.provinceId;
    const info = FB.world.sitesByProv[pid];
    let reason = '';
    const occupied = FB.countyOccupiedOrBesieged(state, pid);
    const days = Math.max(0, project.dueTurn - state.turn);
    if (occupied) reason = FB.T('Paused during occupation or siege. Construction resumes when the county is clear.');
    else if (!living(state, project.sponsorId) || project.sponsorId !== p.charId || p.dead) reason = FB.T('Awaiting the next household head. The funded charter is protected.');
    else if (!info || !info.list[project.settlement] || info.list[project.settlement].site !== project.site ||
        project.settlement !== FB.settlementVisibleCount(state, pid)) reason = FB.T('The reserved site is unavailable. The funded charter is retained.');
    else if (!FB.settlementCountyHolder(state, pid)) reason = FB.T('Awaiting a recognized county ruler.');
    else if (project.settlement >= FB.settlementCapacity(state, pid)) reason = FB.T('County development must recover before the site can be established.');
    else if (p.tier < 2) reason = FB.T('Recover Gentry standing to complete this charter.');
    else if (project.rulerFounded && FB.settlementCountyHolder(state, pid) !== 'player') reason = FB.T('Recover direct rule of the charter county to complete construction.');
    else if (!project.rulerFounded && (p.travel || p.provinceId !== pid)) reason = FB.T('Return your household to the charter county to establish its new seat.');
    else if (days) reason = FB.T('Construction: {days} days remaining.', { days:days });
    else if (!project.costsPaid && p.prestige < project.prestige) reason = FB.T('Ready for investiture: {prestige} prestige required.', { prestige:project.prestige });
    else if (!project.costsPaid && p.piety < project.piety) reason = FB.T('Ready for investiture: {piety} piety required.', { piety:project.piety });
    else if (!FB.settlementFoundingPopulationPlan(state, pid, project.settlement)) reason = FB.T('The county cannot yet supply residents for this settlement.');
    return { project:project, days:days, occupied:occupied, ready:!reason, reason:reason };
  };
  FB.cancelSettlementFounding = function (state, reviewed) {
    const project = FB.activeSettlementFounding(state);
    if (!project || !reviewed || project.sponsorId !== state.player.charId ||
        project.id !== reviewed.id || project.provinceId !== reviewed.provinceId || project.startedTurn !== reviewed.startedTurn ||
        project.founderId !== reviewed.founderId || project.site !== reviewed.site) return false;
    table(state).founding[project.provinceId].status = 'cancelled';
    FB.invalidateSettlementLordships(state);
    FB.news(state, FB.msg('news.lordship.founding_cancelled',
      'The charter for {settlement} is relinquished. Construction expenditure is not refunded.', {
        settlement:FB.world.sitesByProv[project.provinceId].list[project.settlement].name
      }));
    return true;
  };
  FB.completeSettlementFounding = function (state, reviewed) {
    const status = FB.settlementFoundingStatus(state);
    if (!status || !status.ready) return false;
    if (reviewed && (status.project.id !== reviewed.id ||
        status.project.sponsorId !== reviewed.sponsorId || status.project.site !== reviewed.site ||
        status.project.prestige !== reviewed.prestige || status.project.piety !== reviewed.piety)) return false;
    const q = status.project, root = table(state), pid = q.provinceId, p = state.player;
    const population = FB.settlementFoundingPopulationPlan(state, pid, q.settlement);
    if (!population) return false;
    // All blockers are checked before the synchronous ownership/population transaction.
    const c = county(state, pid);
    if (!c) return false;
    const oldCount = c.established;
    c.established = q.settlement + 1;
    if (!q.rulerFounded && !FB.assignSettlementLordship(state, pid, q.settlement, p.charId)) {
      c.established = oldCount;
      return false;
    }
    state.population.counties[pid].communities = population.communities;
    if (!q.costsPaid) { p.prestige -= q.prestige; p.piety -= q.piety; }
    if (!q.rulerFounded) {
      p.homeSettlement = q.settlement;
      const lordship = record(state, pid, q.settlement);
      lordship.founderId = q.founderId; lordship.dynasty = q.dynasty; lordship.source = 'founding';
    }
    root.founding[pid].status = 'complete';
    root.founding[pid].completedTurn = state.turn;
    if (p.tier < 3) FB.setPlayerTier(state, 3);
    if (!(p.provs && p.provs.length)) FB.changePlayerLiege(state, FB.settlementCountyHolder(state, pid), 'settlement:founding');
    if (state.peakTier === undefined || p.tier > state.peakTier) {
      state.peakTier = p.tier; state.peakTitleData = FB.titleSnapshot(state);
    }
    FB.invalidateSettlementLordships(state, pid);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    if (q.rulerFounded) FB.news(state, FB.msg('news.lordship.county_founded',
      '{settlement} is established as your direct holding in {county}. Its {people} residents relocated within the county.', {
        settlement:FB.world.sitesByProv[pid].list[q.settlement].name,
        people:population.settlers, county:FB.world.byId[pid].name
      }));
    else FB.news(state, FB.msg('news.lordship.founded',
      '{settlement} is established as your hereditary lordship and household seat. Its {people} residents moved from other settlements in {county}.', {
        settlement:FB.world.sitesByProv[pid].list[q.settlement].name,
        people:population.settlers, county:FB.world.byId[pid].name
      }));
    return true;
  };
  FB.settlementFoundingDay = function (state) {
    const q = FB.activeSettlementFounding(state);
    if (!q) return false;
    const project = table(state).founding[q.provinceId];
    const elapsed = Math.max(0, state.turn - project.lastTurn);
    if (!elapsed) return false;
    if (FB.countyOccupiedOrBesieged(state, q.provinceId)) {
      project.dueTurn += elapsed; project.pausedDays += elapsed;
    }
    project.lastTurn = state.turn;
    return FB.completeSettlementFounding(state);
  };

  /* Detached terms shared by petitions, military rewards and voluntary grants. */
  FB.settlementGrantSites = function (state, pid, rid) {
    if (FB.settlementCountyHolder(state, pid) !== rid) return [];
    const out = [];
    for (let slot = 1; slot < FB.settlementVisibleCount(state, pid); slot++) {
      const holder = FB.settlementHolder(state, pid, slot);
      if (actorHolds(state, { kind:'realm', id:rid }, holder)) {
        out.push({ provinceId:pid, settlement:slot });
      }
    }
    return out;
  };
  FB.baronyPetitionSite = function (state) {
    const pid = state.player.provinceId, rid = FB.settlementCountyHolder(state, pid);
    const sites = FB.settlementGrantSites(state, pid, rid), manor = state.player.manor;
    if (manor && manor.provinceId === pid) {
      for (const site of sites) if (site.settlement === manor.settlement) return site;
    }
    return sites[0] || null;
  };
  FB.initializeBaronyStart = function (state) {
    if (state.player.tier !== 3) return true;
    const site = FB.baronyPetitionSite(state);
    return !!site && FB.assignSettlementLordship(state, site.provinceId,
      site.settlement, state.player.charId);
  };
  FB.baronyGrantChance = function (state, grantorId) {
    const rid = FB.settlementCountyHolder(state, state.player.provinceId);
    return FB.liegeGrantChance(state, 0.15 + FB.standingOf(state, {
      kind:'character', id:grantorId
    }) / 400 + state.player.prestige / 1200 +
      (FB.settlementCapacityProjection(state, rid).over ? 0.15 : 0));
  };
  FB.settlementGrantRecipient = function (state, cid, rid) {
    const c = living(state, cid);
    const family = rid === 'player' && c && !!FB.kinOf(state).byId[cid];
    if (!c || cid === state.player.charId || FB.ageOf(c, state.date.year) < 16 ||
        FB.stationOf(c) < (family ? 1 : 2) || c.unfree ||
        (FB.realmIdForRulerCharacter && FB.realmIdForRulerCharacter(state, c))) return false;
    const home = FB.characterResidence(state, c);
    return FB.settlementCountyHolder(state, home) === rid ||
      family || (rid === 'player' && FB.isHouseholdCharacter(state, cid));
  };
  FB.settlementGrantQuote = function (state, pid, slot, cid, rid) {
    const c = living(state, cid);
    if (!c || !FB.settlementGrantSites(state, pid, rid).some(function (site) {
      return site.settlement === slot;
    })) return null;
    if (cid === state.player.charId ? (state.player.tier !== 2 || rid === 'player') :
        !FB.settlementGrantRecipient(state, cid, rid)) return null;
    const actor = actorRef(state, { kind:'character', id:cid });
    const capacity = FB.settlementCapacityProjection(state, actor);
    capacity.directCount++;
    capacity.over = Math.max(0, capacity.directCount - capacity.limit);
    capacity.multiplier = Math.pow(1 - (FBDATA.balance.overDomainPenalty || 0.15), capacity.over);
    const capacities = {};
    capacities[actor.kind + ':' + actor.id] = capacity;
    const after = FB.settlementFiscalProjection(state, pid, slot, {
      holder:{ kind:'character', id:cid }, capacities:capacities
    }).amounts;
    const before = FB.settlementFiscalProjection(state, pid, slot).amounts;
    const countCapacity = FB.settlementCapacityProjection(state, rid);
    const ruler = rid === 'player' ? state.chars[state.player.charId] :
      FB.realmRulerCharacterSnapshot(state, rid);
    const buildings = (state.buildings[pid] || []).filter(function (b) {
      return b.s === slot && !(FBDATA.buildings[b.id] || {}).fort;
    }).map(function (b) { return copy(b); });
    return { provinceId:pid, settlement:slot, recipientId:cid, realmId:rid,
      grantorId:ruler && ruler.id || null, previousLordship:copy(record(state, pid, slot)), buildings:buildings,
      revenue:after.gross + after.national, upkeep:after.upkeep, dues:after.dues,
      net:after.net, service:after.levyDues + after.specialistDues,
      taxShare:FB.feudalCharterDef('customary_service').taxShare,
      levyShare:FB.feudalCharterDef('customary_service').levyShare,
      lostRevenue:before.gross + before.national,
      directBefore:countCapacity.directCount, directAfter:countCapacity.directCount - 1,
      limit:countCapacity.limit,
      recipientCount:capacity.directCount, recipientLimit:capacity.limit, recipientPenalty:capacity.multiplier };
  };
  FB.confirmSettlementGrant = function (state, quote) {
    if (!quote) return false;
    const current = FB.settlementGrantQuote(state, quote.provinceId, quote.settlement,
      quote.recipientId, quote.realmId);
    if (!current || JSON.stringify(current) !== JSON.stringify(quote)) return false;
    if (!FB.assignSettlementLordship(state, quote.provinceId, quote.settlement, quote.recipientId)) return false;
    const c = state.chars[quote.recipientId];
    c.station = Math.max(3, FB.stationOf(c));
    if (quote.recipientId === state.player.charId) {
      FB.setPlayerTier(state, 3);
      FB.changePlayerLiege(state, quote.realmId, 'settlement:grant');
      FB.recordLiegeGrant(state);
    }
    return true;
  };

  /* A fixed seasonal budget prevents large realms from monopolizing a tick.
     Cursors are saved so every realm and baron eventually gets a turn. */
  FB.settlementLordshipSeason = function (state, period) {
    const root = table(state);
    if (!root || root.lastDevelopmentSeason === period) return false;
    root.lastDevelopmentSeason = period;
    const realms = Object.keys(state.realms).filter(function (rid) {
      return rid !== 'player' && state.realms[rid].alive;
    }).sort();
    let visited = 0;
    for (; visited < Math.min(12, realms.length); visited++) {
      const rid = realms[((root.grantCursor || 0) + visited) % realms.length];
      const capacity = FB.settlementCapacityProjection(state, rid);
      if (!capacity.over) continue;
      const sites = capacity.settlements.filter(function (site) {
        return FB.settlementGrantSites(state, site.provinceId, rid).some(function (s) {
          return s.settlement === site.settlement;
        });
      });
      if (!sites.length) continue;
      const site = sites[sites.length - 1];
      const candidates = Object.keys(state.chars).sort().filter(function (cid) {
        return FB.settlementGrantRecipient(state, cid, rid) &&
          !FB.isHouseholdCharacter(state, cid) && !entriesFor(state, cid).length;
      });
      let cid = candidates.length ? FB.pick(candidates) : null;
      if (!cid) {
        const pr = FB.world.byId[site.provinceId], ruler = state.realms[rid].ruler;
        const c = FB.makeCharacter(state, { culture:ruler.culture || pr.culture,
          religion:ruler.religion || pr.religion, born:state.date.year - FB.ri(22, 45),
          station:2, role:'notable', dyn:pr.name, quality:2 });
        c.homeProvinceId = site.provinceId;
        cid = c.id;
      }
      const quote = FB.settlementGrantQuote(state, site.provinceId, site.settlement, cid, rid);
      if (quote) FB.confirmSettlementGrant(state, quote);
    }
    if (realms.length) root.grantCursor = ((root.grantCursor || 0) + visited) % realms.length;
    const barons = Object.keys(root.accounts || {}).filter(function (cid) {
      return cid !== state.player.charId && living(state, cid) && entriesFor(state, cid).length;
    }).sort();
    visited = 0;
    for (; visited < Math.min(24, barons.length); visited++) {
      const cid = barons[((root.developmentCursor || 0) + visited) % barons.length];
      if (actorRef(state, { kind:'character', id:cid }).kind !== 'character') continue;
      const holdings = entriesFor(state, cid), sites = [], choices = [];
      for (let i = 0; i < Math.min(4, holdings.length); i++) {
        sites.push(holdings[(period + i) % holdings.length]);
      }
      const funds = FB.baronyConstructionFunds(state, cid);
      if (funds <= 0) continue;
      for (const site of sites) for (const id of Object.keys(FBDATA.buildings).sort()) {
        const def = FBDATA.buildings[id];
        if (def.fort || !FB.aiCanBuildAt(state, { kind:'character', id:cid },
          site.provinceId, site.settlement, id)) continue;
        const cost = FB.buildCost(state, site.provinceId, id, FB.settlementCountyHolder(state, site.provinceId));
        if (cost + (def.upkeep || 0) * (FBDATA.balance.realmReserveSeasons || 2) <= funds) {
          choices.push({ site:site, id:id });
        }
      }
      if (choices.length) {
        const chosen = FB.pick(choices);
        FB.buildBarony(state, cid, chosen.site.provinceId, chosen.site.settlement, chosen.id);
      }
    }
    if (barons.length) root.developmentCursor = ((root.developmentCursor || 0) + visited) % barons.length;
    return true;
  };

  /* Trusted simulation API. Eligibility, payments, and result presentation
     belong to the grant flow above. This never changes county ownership. */
  FB.assignSettlementLordship = function (state, pid, slot, holderId, options) {
    options = options || {};
    const root = table(state);
    const pendingPlayer = options.source === 'legacy' && state.player.dead &&
      holderId === state.player.charId ? state.chars[holderId] : null;
    const holder = living(state, holderId) || pendingPlayer;
    if (!root || !holder || !slotValid(pid, slot) || slot === 0 ||
        slot >= FB.settlementVisibleCount(state, pid) ||
        !FB.settlementCountyHolder(state, pid)) return false;
    const old = record(state, pid, slot);
    if (old && old.holderId === holderId) return false;
    FB.rememberSettlementSites(state, pid);
    county(state, pid).lordships[slot] = {
      holderId:holderId, founderId:holderId, dynasty:holder.dyn || '',
      playerHouse:holderId === state.player.charId,
      successorId:null,
      obligations:{ charterId:'customary_service' },
      grantedTurn:Number(state.turn) || 0,
      source:options.source === 'legacy' ? 'legacy' : 'grant'
    };
    FB.invalidateSettlementLordships(state, pid);
    return true;
  };
  FB.settlementRestorationHolder = function (state, pid, slot) {
    const root = table(state), r = root && root.revokedLordships && root.revokedLordships[pid + ':' + slot];
    if (!r) return null;
    const next = living(state, r.holderId) || heirFor(state, r);
    return next ? next.id : null;
  };
  FB.revokeSettlementLordship = function (state, pid, slot, expectedHolder) {
    const r = record(state, pid, slot);
    if (FB.settlementCountyHolder(state, pid) !== 'player' || !r || r.holderId !== expectedHolder || r.playerHouse) return false;
    const root = table(state);
    root.revokedLordships = root.revokedLordships || {};
    root.revokedLordships[pid + ':' + slot] = copy(r);
    FB.adjustStanding(state, { kind:'character', id:r.holderId }, -40, 'settlement:revocation');
    if (FB.notePoliticalMistreatment) FB.notePoliticalMistreatment(state, 'revocation', { characterId:r.holderId });
    return FB.revertSettlementLordship(state, pid, slot);
  };
  FB.restoreSettlementLordship = function (state, pid, slot, expectedHolder) {
    const root = table(state), key = pid + ':' + slot;
    const r = root && root.revokedLordships && root.revokedLordships[key];
    const holder = FB.settlementRestorationHolder(state, pid, slot);
    if (!r || !holder || holder !== expectedHolder || record(state, pid, slot) ||
        FB.settlementCountyHolder(state, pid) !== 'player') return false;
    if (!FB.assignSettlementLordship(state, pid, slot, holder)) return false;
    const granted = record(state, pid, slot);
    granted.founderId = r.founderId; granted.dynasty = r.dynasty;
    granted.obligations = copy(r.obligations); granted.source = 'restoration';
    delete root.revokedLordships[key];
    return true;
  };
  FB.revertSettlementLordship = function (state, pid, slot) {
    const c = county(state, pid);
    if (!c || !own(c.lordships, slot)) return false;
    delete c.lordships[slot];
    FB.invalidateSettlementLordships(state, pid);
    return true;
  };
  function entriesFor(state, holderId) {
    const root = table(state);
    if (!root) return [];
    if (!holderIndex || holderIndex.state !== state || holderIndex.root !== root) {
      profileCount('holding index builds');
      const byHolder = Object.create(null), references = Object.create(null);
      Object.keys(root.counties).sort().forEach(function (pid) {
        const c = root.counties[pid];
        if (!object(c)) return;
        Object.keys(c.lordships || {}).forEach(function (slot) {
          profileCount('holding index records scanned');
          const r = c.lordships[slot];
          if (!r || !r.holderId) return;
          references[r.holderId] = true;
          if (r.founderId) references[r.founderId] = true;
          if (r.successorId) references[r.successorId] = true;
          if (!byHolder[r.holderId]) byHolder[r.holderId] = [];
          byHolder[r.holderId].push({ provinceId:pid, settlement:Number(slot) });
        });
      });
      holderIndex = { state:state, root:root, byHolder:byHolder, references:references };
    }
    return holderIndex.byHolder[holderId] || [];
  }
  FB.settlementLordshipReferencesCharacter = function (state, characterId) {
    if (!table(state)) return false;
    const saved = table(state);
    if (Object.keys(saved.revokedLordships || {}).some(function (key) {
      const r = saved.revokedLordships[key];
      return r.holderId === characterId || r.founderId === characterId || r.successorId === characterId;
    })) return true;
    if (Object.keys(saved.countyClaims || {}).some(function (pid) {
      return saved.countyClaims[pid].some(function (r) { return r.characterId === characterId; });
    })) return true;
    entriesFor(state, characterId);
    const projects = table(state).founding || {};
    for (const pid of Object.keys(projects)) {
      const q = projects[pid];
      if (q.status === 'building' && (q.sponsorId === characterId || q.founderId === characterId)) return true;
    }
    return !!holderIndex.references[characterId];
  };
  function heirFor(state, r) {
    function eligible(c) {
      return c && !c.dead && c.id !== r.holderId &&
        !(FB.isUnfreeCharacter ? FB.isUnfreeCharacter(state, c) : c.unfree);
    }
    const nominated = living(state, r.successorId);
    if (eligible(nominated)) return nominated;
    const holder = state.chars && state.chars[r.holderId];
    const seen = {}, queue = holder ? [holder] : [];
    for (let i = 0; i < queue.length; i++) {
      const parent = queue[i];
      if (seen[parent.id]) continue;
      seen[parent.id] = true;
      const children = FB.childrenOf(state, parent).slice().sort(function (a, b) {
        return (a.born - b.born) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      });
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        if (eligible(child)) return child;
        queue.push(child);
      }
    }
    return null;
  }
  function succeedRecord(state, site, next) {
    const r = record(state, site.provinceId, site.settlement);
    if (!next) return FB.revertSettlementLordship(state, site.provinceId, site.settlement);
    const root = table(state), purse = root.accounts && root.accounts[r.holderId];
    if (purse && r.holderId !== next.id) {
      if (next.id === state.player.charId) state.player.gold += purse.gold;
      else {
        const inherited = root.accounts[next.id] || (root.accounts[next.id] = { gold:0, lastSeason:purse.lastSeason });
        inherited.gold += purse.gold;
      }
      delete root.accounts[r.holderId];
    }
    r.holderId = next.id;
    r.successorId = null;
    r.playerHouse = next.id === state.player.charId;
    FB.invalidateSettlementLordships(state, site.provinceId);
    return true;
  }
  FB.settlementLordshipsCharacterDied = function (state, characterId) {
    const sites = entriesFor(state, characterId).slice();
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i], r = record(state, site.provinceId, site.settlement);
      /* The player chooses their successor through the existing succession UI. */
      if (r.playerHouse && characterId === state.player.charId) continue;
      succeedRecord(state, site, heirFor(state, r));
    }
  };
  FB.settlementLordshipsPlayerSuccession = function (state, oldId, heirId) {
    const next = living(state, heirId);
    const root = table(state), projects = root && root.founding || {};
    for (const pid of Object.keys(projects)) {
      const q = projects[pid];
      if (q.status === 'building' && q.playerHouse && q.sponsorId === oldId) {
        if (next) q.sponsorId = next.id;
        else q.status = 'cancelled';
      }
    }
    entriesFor(state, oldId).slice().forEach(function (site) {
      const r = record(state, site.provinceId, site.settlement);
      if (r.playerHouse) succeedRecord(state, site, next);
    });
  };
  function territorialBaron(state) {
    const p = state.player, c = p && state.chars && state.chars[p.charId];
    if (!p || p.tier !== 3 || !c || p.castellany || (p.provs && p.provs.length)) return false;
    const flags = p.flags || {}, ranks = c.religiousRanks || {};
    return !c.bishopric && !c.papalOffice && !flags.bishop && !flags.pope &&
      !flags.chief_qadi && (ranks.catholic_monastic || 0) < 4 &&
      (ranks.catholic_clerical || 0) < 5 && (ranks.muslim_scholar || 0) < 5;
  }
  FB.ensureSettlementLordships = function (state, options) {
    if (!state || !state.player || !state.owner || !FB.world || !FB.world.sitesByProv) return false;
    options = options || {};
    /* Unknown future versions are preserved rather than destructively downgraded. */
    if (state.settlementLordships && state.settlementLordships.version !== 1) return false;
    const first = !state.settlementLordships;
    if (first) state.settlementLordships = { version:1, counties:{}, legacyBarony:'none' };
    if (!object(state.settlementLordships.counties)) state.settlementLordships.counties = {};
    const root = table(state);
    if (!root) return false;
    Object.keys(root.counties).forEach(function (pid) {
      let c = root.counties[pid];
      if (!object(c)) c = root.counties[pid] = { established:0, lordships:{} };
      const sites = FB.world.sitesByProv[pid];
      c.established = Math.max(0, Math.min(sites ? sites.list.length : 8,
        Math.floor(Number(c.established) || 0)));
      if (!object(c.lordships)) c.lordships = {};
      Object.keys(c.lordships).forEach(function (key) {
        const slot = Number(key), r = c.lordships[key];
        if (!object(r) || typeof r.holderId !== 'string' || !r.holderId ||
            !Number.isInteger(slot) || slot <= 0 || slot >= (sites ? sites.list.length : 8)) {
          delete c.lordships[key];
          return;
        }
        c.established = Math.max(c.established, slot + 1);
        if (String(slot) !== key) {
          if (!own(c.lordships, slot)) c.lordships[slot] = r;
          delete c.lordships[key];
        }
        if (!r.founderId) r.founderId = r.holderId;
        if (typeof r.dynasty !== 'string') r.dynasty = '';
        if (typeof r.playerHouse !== 'boolean') r.playerHouse = r.holderId === state.player.charId;
        if (typeof r.successorId !== 'string') r.successorId = null;
        if (!object(r.obligations)) r.obligations = { charterId:'customary_service' };
      });
    });
    Object.keys(state.owner).sort().forEach(function (pid) {
      FB.rememberSettlementSites(state, pid);
    });
    // Capture legacy automatic reveals once, then let development unlock capacity only.
    root.foundingVersion = 1;
    if (first && !options.fresh && territorialBaron(state)) {
      const p = state.player, pid = p.provinceId;
      const n = FB.settlementVisibleCount(state, pid);
      const candidates = [];
      if (p.manor && p.manor.provinceId === pid) candidates.push(p.manor.settlement);
      candidates.push(p.homeSettlement);
      for (let slot = 1; slot < n; slot++) candidates.push(slot);
      root.legacyBarony = 'unavailable';
      for (let i = 0; i < candidates.length; i++) {
        if (FB.assignSettlementLordship(state, pid, candidates[i], p.charId, { source:'legacy' })) {
          root.legacyBarony = 'granted';
          break;
        }
      }
    }
    holderIndex = null;
    const holders = {};
    Object.keys(root.counties).forEach(function (pid) {
      const c = root.counties[pid];
      Object.keys(c.lordships || {}).forEach(function (slot) {
        const r = c.lordships[slot];
        if (r && r.holderId && !living(state, r.holderId)) holders[r.holderId] = true;
      });
    });
    Object.keys(holders).sort().forEach(function (id) {
      FB.settlementLordshipsCharacterDied(state, id);
    });
    FB.syncHomeCountyLord(state);
    FB.invalidateSettlementLordships(state);
    return true;
  };
})();
