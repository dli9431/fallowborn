/* Fallowborn — settlement ownership foundation. County politics and the live
   fiscal/construction systems retain their existing contracts until Phase 3. */
window.FB = window.FB || {};
(function () {
  'use strict';

  let revision = 0;
  let holderIndex = null;
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
    revision++;
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
  FB.settlementHolder = function (state, pid, slot) {
    if (!slotValid(pid, slot) || slot >= FB.settlementVisibleCount(state, pid)) return null;
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
    if (actor.kind === 'realm' && actor.id === 'player') {
      return holder.kind === 'character' && holder.id === state.player.charId;
    }
    if (actor.kind === 'character' && holder.kind === 'realm') {
      if (holder.id === 'player') return actor.id === state.player.charId;
      const c = FB.realmRulerCharacterSnapshot(state, holder.id);
      return !!c && c.id === actor.id;
    }
    return false;
  }
  FB.directSettlements = function (state, actor) {
    const out = [];
    if (!state || !state.owner) return out;
    Object.keys(state.owner).sort().forEach(function (pid) {
      const count = FB.settlementVisibleCount(state, pid);
      for (let slot = 0; slot < count; slot++) {
        if (actorHolds(state, actor, FB.settlementHolder(state, pid, slot))) {
          out.push({ provinceId:pid, settlement:slot });
        }
      }
    });
    return out;
  };
  FB.settlementConstructionAuthority = function (state, pid, slot, actor) {
    const holder = FB.settlementHolder(state, pid, slot);
    return { holder:holder, countyHolderId:FB.settlementCountyHolder(state, pid),
      direct:actorHolds(state, actor, holder),
      liveAccounting:'county', integrated:false };
  };
  /* Phase 2 exposes ownership inputs, not a second live tax or capacity formula.
     Phase 3 extends these records with amounts and enforces the same projection. */
  FB.settlementCapacityProjection = function (state, actor) {
    const sites = FB.directSettlements(state, actor);
    return { directCount:sites.length, settlements:sites, limit:null,
      enforced:false, stage:'ownership' };
  };
  FB.settlementFiscalProjection = function (state, pid, slot) {
    const holder = FB.settlementHolder(state, pid, slot);
    if (!holder) return null;
    const r = record(state, pid, slot);
    return { provinceId:pid, settlement:slot, holder:holder,
      countyHolderId:FB.settlementCountyHolder(state, pid),
      obligations:r ? copy(r.obligations) : null,
      amounts:null, integrated:false };
  };
  FB.settlementContributionProjection = function (state, pid, slot) {
    const fiscal = FB.settlementFiscalProjection(state, pid, slot);
    if (!fiscal) return null;
    return { from:fiscal.holder, toRealmId:fiscal.countyHolderId,
      obligations:fiscal.obligations, amounts:null, integrated:false };
  };
  FB.settlementFoundingEligibility = function (state, pid) {
    const sites = FB.world && FB.world.sitesByProv && FB.world.sitesByProv[pid];
    const count = sites ? FB.settlementVisibleCount(state, pid) : 0;
    return { provinceId:pid, countyHolderId:FB.settlementCountyHolder(state, pid),
      established:count, unusedSlots:sites ? Math.max(0, sites.list.length - count) : 0,
      ready:false, blocker:'founding_not_integrated' };
  };

  /* Trusted simulation API. Eligibility, payments, and result presentation
     belong to the later grant flow. This never changes county ownership. */
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
      const byHolder = Object.create(null), references = Object.create(null);
      Object.keys(root.counties).sort().forEach(function (pid) {
        const c = root.counties[pid];
        if (!object(c)) return;
        Object.keys(c.lordships || {}).forEach(function (slot) {
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
    entriesFor(state, characterId);
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
