/* Fallowborn — exact item instances, the family armory, and household equipment.
   Bare definition ids remain valid implicit unique instances for old saves and
   mods. Repeatable gear receives a saved ref, quality, and visual seed. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const SLOT_ORDER = [
    'head', 'neck', 'body', 'waist', 'feet', 'leftHand', 'rightHand', 'ring'
  ];
  const HAND_SLOTS = ['leftHand', 'rightHand'];
  const QUALITY_STEP = { plain:0, well:1, masterwork:2 };
  const QUALITY_VALUE = { plain:1, well:2, masterwork:4 };
  const RARITY_WEIGHT = { common:6, fine:3, famed:1 };
  const RARITY_RANK = { common:0, fine:1, famed:2 };
  const PEDDLER_ROLES = ['serf', 'commoner', 'gentry', 'lord', 'crowned'];
  let ensuredState = null;
  let ensuringState = null;

  FB.ITEM_SLOTS = SLOT_ORDER.slice();
  FB.ITEM_HAND_SLOTS = HAND_SLOTS.slice();

  function own(o, k) {
    return !!o && Object.prototype.hasOwnProperty.call(o, k);
  }

  function normalizedSlot(slot) {
    if (slot === 'left' || slot === 'right' || slot === 'eitherHand' ||
      slot === 'either_hand' || slot === 'leftHand' || slot === 'rightHand') return 'hand';
    return SLOT_ORDER.indexOf(slot) >= 0 ? slot : 'hand';
  }

  function qualityOf(value) {
    return own(QUALITY_STEP, value) ? value : 'plain';
  }

  function definitionOf(id) {
    const def = FBDATA.items && FBDATA.items[id];
    if (!def) return null;
    const slot = normalizedSlot(def.slot);
    return {
      id:id,
      def:def,
      slot:slot,
      grip:slot === 'hand' && def.grip === 2 ? 2 : 1,
      unique:def.unique !== false,
      ordinary:def.unique === false,
      eventOnly:!!def.eventOnly,
      ageMin:def.ageMin === undefined ? 0 : Math.max(0, def.ageMin),
      art:def.art || { kind:'generic' }
    };
  }

  FB.itemDefinition = definitionOf;

  function directHouseholdIds(state) {
    const out = [], seen = {};
    if (!state || !state.player || !state.chars) return out;
    const me = state.chars[state.player.charId];
    function add(c, allowDead) {
      if (!c || (!allowDead && c.dead) || seen[c.id]) return;
      seen[c.id] = 1;
      out.push(c.id);
    }
    /* A just-dead protagonist remains part of the household until succession,
       so their final loadout can be shown and snapshotted. */
    add(me, true);
    if (!me) return out;
    for (const c of FB.householdMembers(state)) add(c, false);
    /* Paid retainers belong to the managed household for equipment and
       career dealings, but remain distinct from resident family upkeep. */
    for (let i = 0; i < ((state.player && state.player.retainers) || []).length; i++) {
      const record = state.player.retainers[i];
      const retainer = record && state.chars[record.charId];
      if (retainer && (!FB.isExternalHouseholdAuthority ||
          !FB.isExternalHouseholdAuthority(state, retainer))) add(retainer, false);
    }
    return out;
  }

  FB.householdCharacterIds = function (state) {
    return directHouseholdIds(state).slice();
  };

  FB.isHouseholdCharacter = function (state, cid) {
    if (!state || !state.player || !state.chars) return false;
    const c = state.chars[cid];
    const me = state.chars[state.player.charId];
    if (!c || !me) return false;
    /* The protagonist remains inspectable through the death/succession
       boundary; every other household member must still be living. */
    if (c.id === me.id) return true;
    if (c.dead) return false;
    if (FB.isExternalHouseholdAuthority &&
        FB.isExternalHouseholdAuthority(state, c)) {
      return false;
    }
    if (c.spouseId === me.id || me.spouseId === c.id) return true;
    const retainers = state.player.retainers || [];
    for (let i = 0; i < retainers.length; i++) {
      if (retainers[i] && retainers[i].charId === c.id) return true;
    }
    if (!FB.playerDescendantKind ||
        !FB.playerDescendantKind(state, c.id)) return false;
    /* Unmarried children and grandchildren live in the managed household.
       Check both link directions because polygynous wives point to the
       husband while only his first wife is stored on him. */
    const spouse = c.spouseId && state.chars[c.spouseId];
    if (spouse && !spouse.dead) return false;
    for (const id in state.chars) {
      const other = state.chars[id];
      if (other && !other.dead && other.spouseId === c.id) return false;
    }
    return true;
  };

  function loanPledgesRef(state, ref) {
    const loans = state && state.economy && state.economy.loans;
    if (!loans) return false;
    for (let i = 0; i < loans.length; i++) {
      const loan = loans[i];
      if (!loan || loan.status === 'repaid' || loan.status === 'defaulted') continue;
      if (loan.collateral && loan.collateral.kind === 'item' &&
        loan.collateral.id === ref) return true;
    }
    return false;
  }

  function nextItemRef(state) {
    let n = Math.max(1, state.itemNextId || 1);
    let ref = 'i' + n;
    while (own(state.itemInstances, ref) || own(FBDATA.items, ref)) {
      n++;
      ref = 'i' + n;
    }
    state.itemNextId = n + 1;
    return ref;
  }

  function createLegacyOrdinary(state, ref, defId) {
    if (own(state.itemInstances, ref)) return;
    const info = definitionOf(defId);
    if (!info || !info.ordinary) return;
    state.itemInstances[ref] = {
      defId:defId,
      quality:'plain',
      visualSeed:FB.hashSeed('legacy-item|' + ref)
    };
  }

  function normalizeOwnershipList(list) {
    const out = [], seen = {};
    for (let i = 0; i < (list || []).length; i++) {
      const ref = list[i];
      if (typeof ref !== 'string' || !ref || seen[ref]) continue;
      seen[ref] = 1;
      out.push(ref);
    }
    return out;
  }

  function rawResolved(state, ref) {
    if (!state || typeof ref !== 'string') return null;
    const inst = state.itemInstances && state.itemInstances[ref];
    const defId = inst && inst.defId ? inst.defId : ref;
    const info = definitionOf(defId);
    if (!info) return null;
    const quality = info.ordinary ? qualityOf(inst && inst.quality) : null;
    const steps = quality === null ? 0 : QUALITY_STEP[quality];
    const fx = {};
    const base = info.def.fx || {};
    const step = info.def.qualityFx || {};
    for (const k in base) if (typeof base[k] === 'number') fx[k] = base[k];
    if (steps) {
      for (const k in step) {
        if (typeof step[k] === 'number') fx[k] = (fx[k] || 0) + step[k] * steps;
      }
    }
    return {
      ref:ref,
      defId:defId,
      def:info.def,
      slot:info.slot,
      grip:info.grip,
      unique:info.unique,
      ordinary:info.ordinary,
      eventOnly:info.eventOnly,
      ageMin:info.ageMin,
      art:info.art,
      quality:quality,
      visualSeed:inst && inst.visualSeed !== undefined
        ? inst.visualSeed >>> 0 : FB.hashSeed('item|' + ref),
      motif:inst && inst.motif ? inst.motif : null,
      fx:fx,
      value:Math.round((info.def.value || 0) *
        (quality === null ? 1 : QUALITY_VALUE[quality]))
    };
  }

  function fitsSlot(item, slot) {
    if (!item || SLOT_ORDER.indexOf(slot) < 0) return false;
    if (item.slot === 'hand') return HAND_SLOTS.indexOf(slot) >= 0;
    return item.slot === slot;
  }

  function basicEquipCheck(state, cid, slot, ref, ignoreBlock) {
    const p = state.player;
    const c = state.chars[cid];
    const item = rawResolved(state, ref);
    if (!item) return { ok:false, code:'missing' };
    if (!c || c.dead || directHouseholdIds(state).indexOf(cid) < 0) {
      return { ok:false, code:'household' };
    }
    if (p.items.indexOf(ref) < 0) return { ok:false, code:'owned' };
    if (!fitsSlot(item, slot)) return { ok:false, code:'slot' };
    if (FB.ageOf(c, state.date.year) < item.ageMin) {
      return { ok:false, code:'age', ageMin:item.ageMin };
    }
    if (loanPledgesRef(state, ref)) return { ok:false, code:'pledged' };
    if (!ignoreBlock) {
      const blocked = FB.equipmentBlockedReason(state);
      if (blocked) return { ok:false, code:blocked };
    }
    return { ok:true, item:item };
  }

  function assignmentForRaw(state, ref) {
    const loadouts = state.player.loadouts || {};
    for (const cid in loadouts) {
      const slots = [];
      const loadout = loadouts[cid] || {};
      for (let i = 0; i < SLOT_ORDER.length; i++) {
        if (loadout[SLOT_ORDER[i]] === ref) slots.push(SLOT_ORDER[i]);
      }
      if (slots.length) return { cid:cid, slots:slots };
    }
    return null;
  }

  function clearAssignmentRaw(state, ref, cidOnly) {
    const loadouts = state.player.loadouts || {};
    for (const cid in loadouts) {
      if (cidOnly && cid !== cidOnly) continue;
      const loadout = loadouts[cid];
      for (let i = 0; i < SLOT_ORDER.length; i++) {
        const slot = SLOT_ORDER[i];
        if (loadout[slot] === ref) delete loadout[slot];
      }
      let any = false;
      for (let i = 0; i < SLOT_ORDER.length; i++) {
        if (loadout[SLOT_ORDER[i]]) { any = true; break; }
      }
      if (!any) delete loadouts[cid];
    }
  }

  function autoEquipLegacy(state) {
    const cid = state.player.charId;
    const loadout = state.player.loadouts[cid] =
      state.player.loadouts[cid] || {};
    for (let i = 0; i < state.player.items.length; i++) {
      const ref = state.player.items[i];
      const item = rawResolved(state, ref);
      if (!item || loanPledgesRef(state, ref)) continue;
      if (FB.ageOf(state.chars[cid], state.date.year) < item.ageMin) continue;
      if (item.slot === 'hand') {
        if (item.grip === 2) {
          if (!loadout.rightHand && !loadout.leftHand) {
            loadout.rightHand = ref;
            loadout.leftHand = ref;
          }
        } else if (!loadout.rightHand) {
          loadout.rightHand = ref;
        } else if (!loadout.leftHand) {
          loadout.leftHand = ref;
        }
      } else if (!loadout[item.slot]) {
        loadout[item.slot] = ref;
      }
    }
  }

  function repairLoadouts(state, oldLoadouts) {
    const p = state.player;
    const household = directHouseholdIds(state);
    const rebuilt = {};
    const assigned = {};
    for (let hi = 0; hi < household.length; hi++) {
      const cid = household[hi];
      const old = oldLoadouts[cid] || {};
      const next = {};
      for (let si = 0; si < SLOT_ORDER.length; si++) {
        const slot = SLOT_ORDER[si];
        const ref = old[slot];
        if (!ref || assigned[ref] || p.items.indexOf(ref) < 0 ||
          loanPledgesRef(state, ref)) continue;
        const check = basicEquipCheck(state, cid, slot, ref, true);
        if (!check.ok) continue;
        const item = check.item;
        if (item.grip === 2) {
          if (HAND_SLOTS.indexOf(slot) < 0 || next.leftHand || next.rightHand) continue;
          next.leftHand = ref;
          next.rightHand = ref;
        } else {
          if (next[slot]) continue;
          next[slot] = ref;
        }
        assigned[ref] = 1;
      }
      for (let si = 0; si < SLOT_ORDER.length; si++) {
        if (next[SLOT_ORDER[si]]) {
          rebuilt[cid] = next;
          break;
        }
      }
    }
    p.loadouts = rebuilt;
  }

  /* Additive, deterministic save repair. It never touches FB.rng: old
     ordinary ids become Plain instances whose visual seed is a stable hash,
     current household gifts return to the armory, and the head fills slots
     in inventory order (right hand before left). */
  FB.ensureItems = function (state) {
    if (!state || !state.player || !state.chars) return null;
    if (ensuredState === state || ensuringState === state) return state.player.items || [];
    ensuringState = state;
    state.itemInstances = state.itemInstances || {};
    state.player.items = normalizeOwnershipList(state.player.items || []);
    state.player.loadouts = state.player.loadouts || {};

    let maxRef = 0;
    for (const ref in state.itemInstances) {
      const m = /^i(\d+)$/.exec(ref);
      if (m) maxRef = Math.max(maxRef, +m[1]);
    }
    state.itemNextId = Math.max(state.itemNextId || 1, maxRef + 1);

    const migrating = state.player.itemMigration !== 1;
    if (migrating) {
      const household = directHouseholdIds(state);
      for (let i = 0; i < household.length; i++) {
        const c = state.chars[household[i]];
        const carried = normalizeOwnershipList(c && c.items || []);
        for (let j = 0; j < carried.length; j++) {
          if (state.player.items.indexOf(carried[j]) < 0) state.player.items.push(carried[j]);
        }
        if (c && c.items) delete c.items;
      }
    }

    for (let i = 0; i < state.player.items.length; i++) {
      const ref = state.player.items[i];
      if (own(FBDATA.items, ref)) createLegacyOrdinary(state, ref, ref);
    }
    for (const cid in state.chars) {
      const c = state.chars[cid];
      c.items = normalizeOwnershipList(c.items || []);
      for (let i = 0; i < c.items.length; i++) {
        const ref = c.items[i];
        if (own(FBDATA.items, ref)) createLegacyOrdinary(state, ref, ref);
      }
      if (!c.items.length) delete c.items;
    }

    const oldLoadouts = state.player.loadouts;
    repairLoadouts(state, oldLoadouts);
    if (migrating) {
      state.player.itemMigration = 1;
      autoEquipLegacy(state);
    }

    ensuringState = null;
    ensuredState = state;
    return state.player.items;
  };

  FB.itemList = function (state) {
    FB.ensureItems(state);
    return state.player.items;
  };

  FB.resolveItem = function (state, ref) {
    FB.ensureItems(state);
    return rawResolved(state, ref);
  };

  FB.resolveItemReadOnly = function (state, ref) {
    return rawResolved(state, ref);
  };

  FB.itemFitsSlot = function (state, ref, slot) {
    return fitsSlot(FB.resolveItem(state, ref), slot);
  };

  FB.rollItemQuality = function () {
    const roll = FB.rng();
    return roll < 0.70 ? 'plain' : (roll < 0.95 ? 'well' : 'masterwork');
  };

  FB.createItemInstance = function (state, defId, opts) {
    FB.ensureItems(state);
    const info = definitionOf(defId);
    if (!info) return null;
    if (info.unique) return defId;
    opts = opts || {};
    const ref = nextItemRef(state);
    const inst = {
      defId:defId,
      quality:qualityOf(opts.quality || FB.rollItemQuality()),
      visualSeed:opts.visualSeed === undefined
        ? FB.ri(0, 2147483647) : opts.visualSeed >>> 0
    };
    if (opts.motif) inst.motif = String(opts.motif);
    state.itemInstances[ref] = inst;
    return ref;
  };

  FB.itemOwner = function (state, ref) {
    FB.ensureItems(state);
    if (state.player.items.indexOf(ref) >= 0) return { kind:'armory' };
    for (const cid in state.chars) {
      const list = state.chars[cid].items || [];
      if (list.indexOf(ref) >= 0) return { kind:'character', id:cid };
    }
    const deliveries = state.player.giftDeliveries || [];
    for (let i = 0; i < deliveries.length; i++) {
      const delivery = deliveries[i];
      if (delivery && delivery.giftKind === 'item' &&
          delivery.itemRef === ref) {
        return { kind:'delivery', id:delivery.id };
      }
    }
    return null;
  };

  FB.itemInArmory = function (state, ref) {
    return FB.itemList(state).indexOf(ref) >= 0;
  };

  function removeOwnershipRaw(state, ref) {
    let at;
    while ((at = state.player.items.indexOf(ref)) >= 0) state.player.items.splice(at, 1);
    for (const cid in state.chars) {
      const list = state.chars[cid].items;
      if (!list) continue;
      while ((at = list.indexOf(ref)) >= 0) list.splice(at, 1);
      if (!list.length) delete state.chars[cid].items;
    }
  }

  /* The only ownership mutation door. target is 'armory', a character id,
     or null (sold/destroyed). Instance records deliberately remain behind so
     old Chronicle descriptors can still localize the exact generated name. */
  FB.transferItem = function (state, ref, target, opts) {
    FB.ensureItems(state);
    opts = opts || {};
    if (!rawResolved(state, ref)) return false;
    if (loanPledgesRef(state, ref) && target !== 'armory' && !opts.force) return false;
    if (target && target !== 'armory' && (!state.chars[target] || state.chars[target].dead)) {
      return false;
    }
    if (target !== 'armory') clearAssignmentRaw(state, ref);
    removeOwnershipRaw(state, ref);
    if (target === 'armory') {
      state.player.items.push(ref);
    } else if (target) {
      const c = state.chars[target];
      c.items = c.items || [];
      c.items.push(ref);
    }
    if (target !== 'armory') {
      FB.setProtected(state, 'equipmentItem', ref, false);
    }
    return true;
  };

  FB.destroyItem = function (state, ref, opts) {
    return FB.transferItem(state, ref, null, opts || {});
  };

  FB.reclaimCharacterItems = function (state, cid) {
    FB.ensureItems(state);
    const c = state.chars[cid];
    const list = c && c.items ? c.items.slice() : [];
    for (let i = 0; i < list.length; i++) FB.transferItem(state, list[i], 'armory', { force:true });
    return list;
  };

  FB.grantItem = function (state, defId, opts) {
    FB.ensureItems(state);
    const info = definitionOf(defId);
    if (!info) return null;
    let ref;
    if (info.unique) {
      ref = defId;
      if (FB.itemOwner(state, ref)) return null;
    } else {
      ref = FB.createItemInstance(state, defId, opts || {});
    }
    return FB.transferItem(state, ref, 'armory', { force:true }) ? ref : null;
  };

  FB.itemSnapshot = function (state, ref) {
    const item = FB.resolveItem(state, ref);
    if (!item) return null;
    const snap = {
      ref:item.ref,
      defId:item.defId,
      visualSeed:item.visualSeed
    };
    if (item.quality) snap.quality = item.quality;
    if (item.motif) snap.motif = item.motif;
    return snap;
  };

  FB.resolveItemSnapshot = function (snapshot) {
    if (!snapshot || !snapshot.defId) return null;
    const info = definitionOf(snapshot.defId);
    if (!info) return null;
    const quality = info.ordinary ? qualityOf(snapshot.quality) : null;
    const steps = quality === null ? 0 : QUALITY_STEP[quality];
    const fx = {};
    const base = info.def.fx || {}, step = info.def.qualityFx || {};
    for (const k in base) if (typeof base[k] === 'number') fx[k] = base[k];
    if (steps) {
      for (const k in step) {
        if (typeof step[k] === 'number') fx[k] = (fx[k] || 0) + step[k] * steps;
      }
    }
    return {
      ref:snapshot.ref || snapshot.defId,
      defId:snapshot.defId,
      def:info.def,
      slot:info.slot,
      grip:info.grip,
      unique:info.unique,
      ordinary:info.ordinary,
      eventOnly:info.eventOnly,
      ageMin:info.ageMin,
      art:info.art,
      quality:quality,
      visualSeed:snapshot.visualSeed === undefined
        ? FB.hashSeed('item|' + (snapshot.ref || snapshot.defId))
        : snapshot.visualSeed >>> 0,
      motif:snapshot.motif || null,
      fx:fx,
      value:Math.round((info.def.value || 0) *
        (quality === null ? 1 : QUALITY_VALUE[quality]))
    };
  };

  FB.itemQualityName = function (quality) {
    if (quality === 'masterwork') return FB.T('Masterwork');
    if (quality === 'well') return FB.T('Well-made');
    return FB.T('Plain');
  };

  function localizedBaseName(state, viewer, item) {
    if (!item) return '';
    if (FB.dataText && state) {
      return FB.dataText(state, viewer || state.player.charId, 'item',
        item.defId, item.def, 'name', {});
    }
    const source = item.def.name;
    return typeof source === 'string' ? source : (source.default || item.defId);
  }

  FB.itemNameFromSnapshot = function (state, viewer, snapshot) {
    const item = FB.resolveItemSnapshot(snapshot);
    if (!item) return snapshot && snapshot.defId ? snapshot.defId : '';
    const base = localizedBaseName(state, viewer, item);
    if (!item.ordinary) return base;
    if (item.quality === 'masterwork') return FB.T('Masterwork {item}', { item:base });
    if (item.quality === 'well') return FB.T('Well-made {item}', { item:base });
    return FB.T('Plain {item}', { item:base });
  };

  FB.itemName = function (state, ref, viewer) {
    return FB.itemNameFromSnapshot(state, viewer, FB.itemSnapshot(state, ref));
  };

  FB.itemNameReadOnly = function (state, ref, viewer) {
    const item = rawResolved(state, ref);
    if (!item) return '';
    const snapshot = {
      ref:item.ref,
      defId:item.defId,
      visualSeed:item.visualSeed
    };
    if (item.quality) snapshot.quality = item.quality;
    if (item.motif) snapshot.motif = item.motif;
    return FB.itemNameFromSnapshot(state, viewer, snapshot);
  };

  /* Durable semantic parameter: generated quality and visual identity are
     frozen into the descriptor while the localized base definition name is
     still looked up when the Chronicle is rendered. */
  FB.itemParam = function (state, ref, icon) {
    const value = { $item:FB.itemSnapshot(state, ref) };
    if (icon) value.icon = true;
    return value;
  };

  FB.itemAssignment = function (state, ref) {
    FB.ensureItems(state);
    return assignmentForRaw(state, ref);
  };

  FB.loadoutOf = function (state, cid) {
    FB.ensureItems(state);
    return state.player.loadouts[cid] || {};
  };

  FB.loadoutReadOnly = function (state, cid) {
    const loadouts = state && state.player && state.player.loadouts;
    return loadouts && loadouts[cid] || {};
  };

  FB.equippedItemRefs = function (state, cid) {
    const loadout = FB.loadoutOf(state, cid);
    const out = [], seen = {};
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const ref = loadout[SLOT_ORDER[i]];
      if (ref && !seen[ref]) {
        seen[ref] = 1;
        out.push(ref);
      }
    }
    return out;
  };

  FB.equippedItemRefsReadOnly = function (state, cid) {
    const loadout = FB.loadoutReadOnly(state, cid);
    const out = [], seen = {};
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const ref = loadout[SLOT_ORDER[i]];
      if (ref && !seen[ref]) {
        seen[ref] = 1;
        out.push(ref);
      }
    }
    return out;
  };

  FB.snapshotLoadout = function (state, cid) {
    const loadout = FB.loadoutOf(state, cid);
    const out = {};
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const slot = SLOT_ORDER[i];
      if (loadout[slot]) out[slot] = FB.itemSnapshot(state, loadout[slot]);
    }
    return out;
  };

  FB.equipmentBlockedReason = function (state) {
    if (!state || !state.player) return 'missing';
    if (state.player.travel) return 'travel';
    if (FB.ui && FB.ui.eventsBusy && FB.ui.eventsBusy()) return 'event';
    return null;
  };

  /* ---------- protagonist appearance and barbering ---------- */
  const BARBER_HAIR = [
    { id:'crop' }, { id:'sidePart' }, { id:'curly' }, { id:'longLoose' },
    { id:'braids' }, { id:'bun' }, { id:'bowl' }, { id:'sweptBack' },
    { id:'shoulderWaves' }, { id:'tiedBack' }, { id:'crownBraid' }
  ];
  const BARBER_BEARD_KINDS = [
    { id:'none' }, { id:'stubble' }, { id:'short' }, { id:'full' }, { id:'long' }
  ];
  const BARBER_BEARD_CUTS = [
    { id:'natural' }, { id:'square' }, { id:'spade' }, { id:'forked' },
    { id:'goatee' }, { id:'sideburn' }, { id:'moustache' },
    { id:'chinstrap' }, { id:'beardNatural' }, { id:'beardSquare' },
    { id:'beardSpade' }, { id:'beardForked' }, { id:'beardGoatee' },
    { id:'sideburns' }, { id:'moustachePencil' }, { id:'moustacheChevron' },
    { id:'moustacheHandlebar' }, { id:'moustacheWalrus' },
    { id:'moustacheHorseshoe' }
  ];
  const BARBER_BEARD_FAMILIES = [
    { id:'none' }, { id:'stubble' }, { id:'moustache' }, { id:'beard' },
    { id:'beardMoustache' }, { id:'goatee' }, { id:'sideburns' }
  ];
  const BARBER_BEARD_STYLES = [
    { id:'clean', family:'none', kind:'none', cut:'natural' },

    { id:'stubbleEven', family:'stubble', kind:'stubble', cut:'natural' },
    { id:'stubbleSquare', family:'stubble', kind:'stubble', cut:'square' },
    { id:'stubblePointed', family:'stubble', kind:'stubble', cut:'spade' },
    { id:'stubbleForked', family:'stubble', kind:'stubble', cut:'forked' },
    { id:'stubbleGoatee', family:'stubble', kind:'stubble', cut:'goatee' },
    { id:'stubbleChops', family:'stubble', kind:'stubble', cut:'sideburn' },

    { id:'moustacheNatural', family:'moustache', kind:'short', cut:'moustache' },
    { id:'moustachePencil', family:'moustache', kind:'short', cut:'moustachePencil' },
    { id:'moustacheChevron', family:'moustache', kind:'short', cut:'moustacheChevron' },
    { id:'moustacheHandlebar', family:'moustache', kind:'short', cut:'moustacheHandlebar' },
    { id:'moustacheWalrus', family:'moustache', kind:'short', cut:'moustacheWalrus' },
    { id:'moustacheHorseshoe', family:'moustache', kind:'short', cut:'moustacheHorseshoe' },

    { id:'beardShort', family:'beard', kind:'short', cut:'beardNatural' },
    { id:'beardFull', family:'beard', kind:'full', cut:'beardNatural' },
    { id:'beardLong', family:'beard', kind:'long', cut:'beardNatural' },
    { id:'beardSquare', family:'beard', kind:'full', cut:'beardSquare' },
    { id:'beardSpade', family:'beard', kind:'full', cut:'beardSpade' },
    { id:'beardForked', family:'beard', kind:'long', cut:'beardForked' },
    { id:'beardChinstrap', family:'beard', kind:'short', cut:'chinstrap' },

    { id:'comboShortNatural', family:'beardMoustache', kind:'short', cut:'natural' },
    { id:'comboFullNatural', family:'beardMoustache', kind:'full', cut:'natural' },
    { id:'comboLongNatural', family:'beardMoustache', kind:'long', cut:'natural' },
    { id:'comboShortSquare', family:'beardMoustache', kind:'short', cut:'square' },
    { id:'comboFullSquare', family:'beardMoustache', kind:'full', cut:'square' },
    { id:'comboLongSquare', family:'beardMoustache', kind:'long', cut:'square' },
    { id:'comboShortSpade', family:'beardMoustache', kind:'short', cut:'spade' },
    { id:'comboFullSpade', family:'beardMoustache', kind:'full', cut:'spade' },
    { id:'comboLongSpade', family:'beardMoustache', kind:'long', cut:'spade' },
    { id:'comboShortForked', family:'beardMoustache', kind:'short', cut:'forked' },
    { id:'comboFullForked', family:'beardMoustache', kind:'full', cut:'forked' },
    { id:'comboLongForked', family:'beardMoustache', kind:'long', cut:'forked' },

    { id:'goateeShort', family:'goatee', kind:'short', cut:'beardGoatee' },
    { id:'goateeFull', family:'goatee', kind:'full', cut:'beardGoatee' },
    { id:'goateeLong', family:'goatee', kind:'long', cut:'beardGoatee' },
    { id:'goateeShortMoustache', family:'goatee', kind:'short', cut:'goatee' },
    { id:'goateeFullMoustache', family:'goatee', kind:'full', cut:'goatee' },
    { id:'goateeLongMoustache', family:'goatee', kind:'long', cut:'goatee' },

    { id:'sideburnsChops', family:'sideburns', kind:'short', cut:'sideburns' },
    { id:'sideburnsImperial', family:'sideburns', kind:'short', cut:'sideburn' }
  ];
  const BARBER_PUBLIC_CUT = {
    full:'natural', square:'square', spade:'spade', forked:'forked',
    goatee:'goatee', chops:'sideburn', stache:'moustache',
    chinstrap:'chinstrap',bareFull:'beardNatural',bareSquare:'beardSquare',
    bareSpade:'beardSpade',bareForked:'beardForked',bareGoatee:'beardGoatee',
    bareChops:'sideburns',stachePencil:'moustachePencil',
    stacheChevron:'moustacheChevron',stacheHandlebar:'moustacheHandlebar',
    stacheWalrus:'moustacheWalrus',stacheHorseshoe:'moustacheHorseshoe'
  };

  function barberHas(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return true;
    return false;
  }

  function barberAdultMan(state, c) {
    const year = state && state.date ? Number(state.date.year) || 0 : 0;
    const born = c && isFinite(c.born) ? Number(c.born) : year;
    return !!c && c.sex === 'm' && year - born >= 16;
  }

  function barberMoustacheCut(cut) {
    return typeof cut === 'string' && cut.indexOf('moustache') === 0;
  }

  function canonicalBeard(kind, cut) {
    if (!barberHas(BARBER_BEARD_KINDS, kind) ||
        !barberHas(BARBER_BEARD_CUTS, cut)) return null;
    if (kind === 'none') cut = 'natural';
    else if (kind === 'stubble' && barberMoustacheCut(cut)) {
      kind = 'none'; cut = 'natural';
    }
    else if ((cut === 'sideburn' || cut === 'sideburns' ||
        cut === 'chinstrap' || barberMoustacheCut(cut)) &&
        (kind === 'full' || kind === 'long')) kind = 'short';
    return { beardKind:kind, beardCut:cut };
  }

  function barberStyleById(id) {
    for (let i = 0; i < BARBER_BEARD_STYLES.length; i++) {
      if (BARBER_BEARD_STYLES[i].id === id) return BARBER_BEARD_STYLES[i];
    }
    return null;
  }

  function barberStylesForFamily(family) {
    return BARBER_BEARD_STYLES.filter(function (style) {
      return style.family === family;
    });
  }

  function barberBeardSelection(kind, cut) {
    const beard = canonicalBeard(kind, cut) ||
      { beardKind:'none', beardCut:'natural' };
    for (let i = 0; i < BARBER_BEARD_STYLES.length; i++) {
      const style = BARBER_BEARD_STYLES[i];
      if (style.kind === beard.beardKind && style.cut === beard.beardCut) {
        return {
          beardFamily:style.family, beardStyle:style.id,
          beardKind:beard.beardKind, beardCut:beard.beardCut
        };
      }
    }
    let family = 'beardMoustache';
    if (beard.beardKind === 'none') family = 'none';
    else if (beard.beardKind === 'stubble') family = 'stubble';
    else if (barberMoustacheCut(beard.beardCut)) family = 'moustache';
    else if (beard.beardCut.indexOf('beard') === 0 ||
        beard.beardCut === 'chinstrap') family = 'beard';
    else if (beard.beardCut === 'goatee') family = 'goatee';
    else if (beard.beardCut === 'sideburn' ||
        beard.beardCut === 'sideburns') family = 'sideburns';
    const styles = barberStylesForFamily(family);
    return {
      beardFamily:family, beardStyle:styles[0].id,
      beardKind:beard.beardKind, beardCut:beard.beardCut
    };
  }

  function storedBeardAppearance(state, c) {
    if (!barberAdultMan(state, c) || !c.appearance) return null;
    return canonicalBeard(c.appearance.beardKind, c.appearance.beardCut);
  }

  function publicLook(c, state, appearance) {
    const opts = appearance === undefined ? {} : { appearance:appearance };
    const look = FB.characterLook(c, state.date.year, state, opts);
    const beard = canonicalBeard(look.beardKind,
      BARBER_PUBLIC_CUT[look.beardCut] || 'natural') ||
      { beardKind:'none', beardCut:'natural' };
    return {
      hairStyle:look.hairStyle,
      beardKind:beard.beardKind,
      beardCut:beard.beardCut
    };
  }

  function barberHairLabel(id) {
    if (id === 'crop') return FB.T('Close crop');
    if (id === 'sidePart') return FB.T('Side part');
    if (id === 'curly') return FB.T('Curls');
    if (id === 'longLoose') return FB.T('Long and loose');
    if (id === 'braids') return FB.T('Braids');
    if (id === 'bun') return FB.T('Bun');
    if (id === 'bowl') return FB.T('Bowl cut');
    if (id === 'sweptBack') return FB.T('Swept back');
    if (id === 'shoulderWaves') return FB.T('Shoulder waves');
    if (id === 'tiedBack') return FB.T('Tied back');
    if (id === 'crownBraid') return FB.T('Crown braid');
    return id;
  }

  function barberBeardKindLabel(id) {
    if (id === 'none') return FB.T('Clean-shaven');
    if (id === 'stubble') return FB.T('Stubble');
    if (id === 'short') return FB.T('Short');
    if (id === 'full') return FB.T('Full');
    if (id === 'long') return FB.T('Long');
    return id;
  }

  function barberBeardCutLabel(id) {
    if (id === 'natural') return FB.T('Natural');
    if (id === 'square') return FB.T('Square');
    if (id === 'spade') return FB.T('Spade');
    if (id === 'forked') return FB.T('Forked');
    if (id === 'goatee') return FB.T('Goatee');
    if (id === 'sideburn') return FB.T('Sideburns');
    if (id === 'moustache') return FB.T('Moustache');
    if (id === 'chinstrap') return FB.T('Chinstrap');
    if (id === 'beardNatural') return FB.T('Natural beard');
    if (id === 'beardSquare') return FB.T('Square beard');
    if (id === 'beardSpade') return FB.T('Spade beard');
    if (id === 'beardForked') return FB.T('Forked beard');
    if (id === 'beardGoatee') return FB.T('Plain goatee');
    if (id === 'sideburns') return FB.T('Mutton chops');
    if (id === 'moustachePencil') return FB.T('Pencil moustache');
    if (id === 'moustacheChevron') return FB.T('Chevron moustache');
    if (id === 'moustacheHandlebar') return FB.T('Handlebar moustache');
    if (id === 'moustacheWalrus') return FB.T('Walrus moustache');
    if (id === 'moustacheHorseshoe') return FB.T('Horseshoe moustache');
    return id;
  }

  function barberBeardFamilyLabel(id) {
    if (id === 'none') return FB.T('Clean-shaven');
    if (id === 'stubble') return FB.T('Stubble');
    if (id === 'moustache') return FB.T('Moustache');
    if (id === 'beard') return FB.T('Beard');
    if (id === 'beardMoustache') return FB.T('Beard + moustache');
    if (id === 'goatee') return FB.T('Goatee');
    if (id === 'sideburns') return FB.T('Sideburns');
    return id;
  }

  function barberBeardStyleLabel(id) {
    if (id === 'clean') return FB.T('Clean-shaven');
    if (id === 'stubbleEven') return FB.T('Even');
    if (id === 'stubbleSquare') return FB.T('Square');
    if (id === 'stubblePointed') return FB.T('Pointed');
    if (id === 'stubbleForked') return FB.T('Forked');
    if (id === 'stubbleGoatee') return FB.T('Goatee');
    if (id === 'stubbleChops') return FB.T('Mutton chops');
    if (id === 'moustacheNatural') return FB.T('Natural');
    if (id === 'moustachePencil') return FB.T('Pencil');
    if (id === 'moustacheChevron') return FB.T('Chevron');
    if (id === 'moustacheHandlebar') return FB.T('Handlebar');
    if (id === 'moustacheWalrus') return FB.T('Walrus');
    if (id === 'moustacheHorseshoe') return FB.T('Horseshoe');
    if (id === 'beardShort') return FB.T('Short');
    if (id === 'beardFull') return FB.T('Full');
    if (id === 'beardLong') return FB.T('Long');
    if (id === 'beardSquare') return FB.T('Square');
    if (id === 'beardSpade') return FB.T('Spade');
    if (id === 'beardForked') return FB.T('Forked');
    if (id === 'beardChinstrap') return FB.T('Chinstrap');
    if (id === 'comboShortNatural') return FB.T('Short natural');
    if (id === 'comboFullNatural') return FB.T('Full natural');
    if (id === 'comboLongNatural') return FB.T('Long natural');
    if (id === 'comboShortSquare') return FB.T('Short square');
    if (id === 'comboFullSquare') return FB.T('Full square');
    if (id === 'comboLongSquare') return FB.T('Long square');
    if (id === 'comboShortSpade') return FB.T('Short spade');
    if (id === 'comboFullSpade') return FB.T('Full spade');
    if (id === 'comboLongSpade') return FB.T('Long spade');
    if (id === 'comboShortForked') return FB.T('Short forked');
    if (id === 'comboFullForked') return FB.T('Full forked');
    if (id === 'comboLongForked') return FB.T('Long forked');
    if (id === 'goateeShort') return FB.T('Short');
    if (id === 'goateeFull') return FB.T('Full');
    if (id === 'goateeLong') return FB.T('Long');
    if (id === 'goateeShortMoustache') return FB.T('Short + moustache');
    if (id === 'goateeFullMoustache') return FB.T('Full + moustache');
    if (id === 'goateeLongMoustache') return FB.T('Long + moustache');
    if (id === 'sideburnsChops') return FB.T('Mutton chops');
    if (id === 'sideburnsImperial') return FB.T('Mutton chops + moustache');
    return id;
  }

  function barberChoiceList(entries, labelOf) {
    return entries.map(function (entry) {
      return { id:entry.id, label:labelOf(entry.id) };
    });
  }

  function barberBeardStyleChoices() {
    return BARBER_BEARD_STYLES.map(function (style) {
      return {
        id:style.id,
        family:style.family,
        label:barberBeardStyleLabel(style.id)
      };
    });
  }

  FB.barberCost = function (state) {
    const defaults = [1, 2, 4, 8, 12, 18, 28, 40];
    const costs = FBDATA.balance.barberCostByTier || defaults;
    const tier = state && state.player
      ? Math.max(0, Math.min(7, Math.round(Number(state.player.tier) || 0))) : 0;
    const value = Number(costs[tier]);
    return isFinite(value) && value >= 0 ? value : defaults[tier];
  };

  FB.barberOptions = function (state, cid) {
    if (!state || !state.player || cid !== state.player.charId) {
      return { ok:false, code:'not_protagonist' };
    }
    const c = state.chars && state.chars[cid];
    if (!c || c.dead) return { ok:false, code:'dead' };
    const facialHair = barberAdultMan(state, c);
    const effective = publicLook(c, state);
    const choiceHair = barberHas(BARBER_HAIR, effective.hairStyle)
      ? effective.hairStyle : 'crop';
    const choiceBeard = facialHair
      ? barberBeardSelection(effective.beardKind, effective.beardCut) : null;
    return {
      ok:true,
      cid:cid,
      cost:FB.barberCost(state),
      gold:Number(state.player.gold) || 0,
      facialHair:facialHair,
      beardOverridden:!!storedBeardAppearance(state, c),
      hair:barberChoiceList(BARBER_HAIR, barberHairLabel),
      beardKinds:facialHair
        ? barberChoiceList(BARBER_BEARD_KINDS, barberBeardKindLabel) : [],
      beardCuts:facialHair
        ? barberChoiceList(BARBER_BEARD_CUTS, barberBeardCutLabel) : [],
      beardFamilies:facialHair
        ? barberChoiceList(BARBER_BEARD_FAMILIES, barberBeardFamilyLabel) : [],
      beardStyles:facialHair ? barberBeardStyleChoices() : [],
      current:{
        hairStyle:choiceHair,
        beardKind:choiceBeard ? choiceBeard.beardKind : null,
        beardCut:choiceBeard ? choiceBeard.beardCut : null,
        beardFamily:choiceBeard ? choiceBeard.beardFamily : null,
        beardStyle:choiceBeard ? choiceBeard.beardStyle : null
      }
    };
  };

  function barberResultBase(state, cid) {
    return {
      ok:false,
      cid:cid,
      cost:FB.barberCost(state),
      gold:state && state.player ? Number(state.player.gold) || 0 : 0
    };
  }

  FB.barberStatus = function (state, cid, selection) {
    const result = barberResultBase(state, cid);
    if (!state || !state.player || !state.chars) {
      result.code = 'missing';
      return result;
    }
    if (cid !== state.player.charId) {
      result.code = 'not_protagonist';
      return result;
    }
    const c = state.chars[cid];
    if (!c || c.dead) {
      result.code = 'dead';
      return result;
    }
    if (!selection || typeof selection !== 'object' ||
        !barberHas(BARBER_HAIR, selection.hairStyle)) {
      result.code = 'invalid_selection';
      return result;
    }
    const adultMan = barberAdultMan(state, c);
    const hasKind = own(selection, 'beardKind');
    const hasCut = own(selection, 'beardCut');
    const hasFamily = own(selection, 'beardFamily');
    const hasStyle = own(selection, 'beardStyle');
    if (!adultMan && (hasKind || hasCut || hasFamily || hasStyle)) {
      result.code = 'invalid_selection';
      return result;
    }
    if (adultMan && (hasKind !== hasCut || hasFamily !== hasStyle ||
        ((hasKind || hasCut) && (hasFamily || hasStyle)))) {
      result.code = 'invalid_selection';
      return result;
    }
    let beard = null;
    let explicitBeard = false;
    if (adultMan && hasFamily) {
      const style = barberStyleById(selection.beardStyle);
      if (!style || style.family !== selection.beardFamily) {
        result.code = 'invalid_selection';
        return result;
      }
      beard = canonicalBeard(style.kind, style.cut);
      explicitBeard = true;
    } else if (adultMan && hasKind) {
      beard = canonicalBeard(selection.beardKind, selection.beardCut);
      explicitBeard = true;
    } else if (adultMan) {
      beard = storedBeardAppearance(state, c);
    }
    if (explicitBeard && !beard) {
      result.code = 'invalid_selection';
      return result;
    }
    const appearance = { hairStyle:selection.hairStyle };
    if (beard) {
      appearance.beardKind = beard.beardKind;
      appearance.beardCut = beard.beardCut;
    }
    const current = publicLook(c, state);
    const proposed = publicLook(c, state, appearance);
    const proposedBeard = adultMan
      ? barberBeardSelection(proposed.beardKind, proposed.beardCut) : null;
    result.selection = {
      hairStyle:proposed.hairStyle,
      beardKind:proposedBeard ? proposedBeard.beardKind : null,
      beardCut:proposedBeard ? proposedBeard.beardCut : null,
      beardFamily:proposedBeard ? proposedBeard.beardFamily : null,
      beardStyle:proposedBeard ? proposedBeard.beardStyle : null
    };
    result.appearance = appearance;
    result.explicitBeard = explicitBeard;
    const blocked = FB.equipmentBlockedReason(state);
    if (blocked) {
      result.code = blocked;
      return result;
    }
    if (result.gold < result.cost) {
      result.code = 'insufficient_funds';
      return result;
    }
    const changed = current.hairStyle !== proposed.hairStyle ||
      (adultMan && (current.beardKind !== proposed.beardKind ||
        current.beardCut !== proposed.beardCut));
    if (!changed) {
      result.code = 'unchanged';
      return result;
    }
    result.ok = true;
    result.code = 'ready';
    return result;
  };

  FB.visitBarber = function (state, cid, selection) {
    const status = FB.barberStatus(state, cid, selection);
    if (!status.ok) return status;
    /* Quote and gates above are recomputed on every call. This mutation does
       not advance the calendar and does not draw from the saved RNG. */
    state.player.gold -= status.cost;
    state.chars[cid].appearance = {
      hairStyle:status.appearance.hairStyle
    };
    if (status.appearance.beardKind) {
      state.chars[cid].appearance.beardKind = status.appearance.beardKind;
      state.chars[cid].appearance.beardCut = status.appearance.beardCut;
    }
    status.ok = true;
    status.code = 'applied';
    status.gold = state.player.gold;
    status.appearance = {
      hairStyle:state.chars[cid].appearance.hairStyle
    };
    if (state.chars[cid].appearance.beardKind) {
      status.appearance.beardKind = state.chars[cid].appearance.beardKind;
      status.appearance.beardCut = state.chars[cid].appearance.beardCut;
    }
    return status;
  };

  FB.canEquipItem = function (state, cid, slot, ref) {
    FB.ensureItems(state);
    return basicEquipCheck(state, cid, slot, ref, false);
  };

  FB.equipPreview = function (state, cid, slot, ref) {
    const check = FB.canEquipItem(state, cid, slot, ref);
    if (!check.ok) return check;
    const item = check.item;
    const targetSlots = item.grip === 2 ? HAND_SLOTS.slice() : [slot];
    const removed = [], seen = {};
    function addRemoval(otherRef, moved) {
      if (!otherRef || seen[otherRef]) return;
      seen[otherRef] = 1;
      const where = assignmentForRaw(state, otherRef);
      if (!where) return;
      removed.push({
        ref:otherRef,
        cid:where.cid,
        slots:where.slots.slice(),
        moved:!!moved
      });
    }
    addRemoval(ref, true);
    const target = state.player.loadouts[cid] || {};
    for (let i = 0; i < targetSlots.length; i++) {
      const occupied = target[targetSlots[i]];
      if (occupied && occupied !== ref) addRemoval(occupied, false);
    }
    return {
      ok:true,
      item:item,
      cid:cid,
      slot:slot,
      targetSlots:targetSlots,
      removed:removed
    };
  };

  FB.equipItem = function (state, cid, slot, ref) {
    const preview = FB.equipPreview(state, cid, slot, ref);
    if (!preview.ok) return preview;
    clearAssignmentRaw(state, ref);
    for (let i = 0; i < preview.removed.length; i++) {
      if (preview.removed[i].ref !== ref) clearAssignmentRaw(state, preview.removed[i].ref);
    }
    const loadout = state.player.loadouts[cid] =
      state.player.loadouts[cid] || {};
    if (preview.item.grip === 2) {
      loadout.leftHand = ref;
      loadout.rightHand = ref;
    } else {
      loadout[slot] = ref;
    }
    return preview;
  };

  FB.unequipItem = function (state, cid, slot) {
    FB.ensureItems(state);
    if (FB.equipmentBlockedReason(state)) return null;
    const loadout = state.player.loadouts[cid];
    const ref = loadout && loadout[slot];
    if (!ref) return null;
    clearAssignmentRaw(state, ref, cid);
    return ref;
  };

  FB.clearLoadout = function (state, cid) {
    FB.ensureItems(state);
    const old = FB.equippedItemRefs(state, cid);
    delete state.player.loadouts[cid];
    return old;
  };

  /* Household membership can change wholesale at succession. Keep only the
     new head, their spouses, retainers, resident unmarried descendants, and
     manageable kin assigned; every removed reference already remains in the
     shared armory. A manageable sibling's own wedding path clears their
     loadout explicitly, so keeping them here only preserves gear while they
     remain manageable. */
  FB.reconcileHouseholdLoadouts = function (state) {
    FB.ensureItems(state);
    const household = directHouseholdIds(state);
    const cleared = [];
    for (let i = 0; i < household.length; i++) {
      FB.reclaimCharacterItems(state, household[i]);
    }
    for (const cid in state.player.loadouts) {
      if (household.indexOf(cid) >= 0) continue;
      if (FB.manageableKinKind && FB.manageableKinKind(state, cid)) continue;
      const refs = FB.equippedItemRefs(state, cid);
      for (let i = 0; i < refs.length; i++) {
        if (cleared.indexOf(refs[i]) < 0) cleared.push(refs[i]);
      }
      delete state.player.loadouts[cid];
    }
    return cleared;
  };

  function itemPowerScore(item, headEffects) {
    const fx = item.fx || {};
    let score = 0;
    for (let i = 0; i < FB.SKILLS.length; i++) score += fx[FB.SKILLS[i]] || 0;
    score += (fx.health || 0) * 100;
    if (headEffects) {
      score += (fx.battle || 0) * 100;
      score += fx.gold || 0;
      score += fx.prestige || 0;
      score += fx.piety || 0;
    }
    return score;
  }

  function compareEquipmentCandidates(a, b) {
    if (a.score !== b.score) return b.score - a.score;
    if (a.value !== b.value) return b.value - a.value;
    return a.ref < b.ref ? -1 : (a.ref > b.ref ? 1 : 0);
  }

  function equipmentCombination(items) {
    const refs = items.map(function (item) { return item.ref; }).sort();
    let score = 0, value = 0;
    for (let i = 0; i < items.length; i++) {
      score += items[i].score;
      value += items[i].value;
    }
    return { items:items, score:score, value:value, key:refs.join('|') };
  }

  function compareEquipmentCombinations(a, b) {
    if (a.score !== b.score) return b.score - a.score;
    if (a.value !== b.value) return b.value - a.value;
    return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0);
  }

  function slotsHolding(loadout, ref) {
    const out = [];
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      if (loadout && loadout[SLOT_ORDER[i]] === ref) out.push(SLOT_ORDER[i]);
    }
    return out;
  }

  function sameSlots(a, b) {
    if (a.length !== b.length) return false;
    const left = a.slice().sort();
    const right = b.slice().sort();
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) return false;
    }
    return true;
  }

  function equipmentPlanKey(state, cid, next, proposed) {
    const parts = [cid];
    const current = state.player.loadouts[cid] || {};
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const slot = SLOT_ORDER[i];
      parts.push('old:' + slot + '=' + (current[slot] || ''));
      parts.push('new:' + slot + '=' + (next[slot] || ''));
    }
    const refs = proposed.map(function (entry) { return entry.ref; }).sort();
    for (let i = 0; i < refs.length; i++) {
      const at = assignmentForRaw(state, refs[i]);
      parts.push('at:' + refs[i] + '=' + (at
        ? at.cid + ':' + at.slots.slice().sort().join(',')
        : 'armory'));
    }
    parts.push('protected:' +
      FB.protectionIds(state, 'equipmentItem').slice().sort().join(','));
    return parts.join('|');
  }

  /* The shared optimizer returns a complete, non-mutating proposal. Mechanical
     power wins before value; the two hand slots are optimized as one choice
     so a strong two-handed object is compared with the best valid pair. */
  function equipBestPlan(state, cid, ignoreBlock) {
    FB.ensureItems(state);
    const c = state.chars[cid];
    if (!c || c.dead || directHouseholdIds(state).indexOf(cid) < 0) {
      return { ok:false, code:'household', cid:cid };
    }
    if (!ignoreBlock) {
      const blocked = FB.equipmentBlockedReason(state);
      if (blocked) return { ok:false, code:blocked, cid:cid };
    }
    const fixedSlots = ['head', 'neck', 'body', 'waist', 'feet', 'ring'];
    const candidates = {};
    const hands = [];
    for (let i = 0; i < fixedSlots.length; i++) candidates[fixedSlots[i]] = [];
    const currentLoadout = state.player.loadouts[cid] || {};
    const next = {};
    let protectedHands = false;
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const slot = SLOT_ORDER[i], currentRef = currentLoadout[slot];
      if (!currentRef || !FB.isProtected(state, 'equipmentItem', currentRef)) {
        continue;
      }
      next[slot] = currentRef;
      if (slot === 'leftHand' || slot === 'rightHand') protectedHands = true;
    }
    /* Hand combinations interact through grip. If either currently held
       object is protected, preserve the whole hand arrangement rather than
       moving its unprotected companion as a side effect. */
    if (protectedHands) {
      if (currentLoadout.leftHand) next.leftHand = currentLoadout.leftHand;
      if (currentLoadout.rightHand) next.rightHand = currentLoadout.rightHand;
    }
    const refs = state.player.items.slice();
    for (let i = 0; i < refs.length; i++) {
      const item = rawResolved(state, refs[i]);
      if (!item) continue;
      if (FB.isProtected(state, 'equipmentItem', refs[i])) continue;
      const checkSlot = item.slot === 'hand' ? 'rightHand' : item.slot;
      if (!basicEquipCheck(state, cid, checkSlot, refs[i], true).ok) continue;
      const candidate = {
        ref:refs[i],
        item:item,
        score:itemPowerScore(item, cid === state.player.charId),
        value:item.value || 0
      };
      if (item.slot === 'hand') hands.push(candidate);
      else if (candidates[item.slot]) candidates[item.slot].push(candidate);
    }

    for (let i = 0; i < fixedSlots.length; i++) {
      const slot = fixedSlots[i];
      if (next[slot]) continue;
      candidates[slot].sort(compareEquipmentCandidates);
      if (candidates[slot].length &&
        (candidates[slot][0].score > 0 ||
          (candidates[slot][0].score === 0 && candidates[slot][0].value > 0))) {
        next[slot] = candidates[slot][0].ref;
      }
    }

    if (!protectedHands) {
      const combinations = [equipmentCombination([])];
      for (let i = 0; i < hands.length; i++) {
        combinations.push(equipmentCombination([hands[i]]));
        if (hands[i].item.grip === 2) continue;
        for (let j = i + 1; j < hands.length; j++) {
          if (hands[j].item.grip !== 2) {
            combinations.push(equipmentCombination([hands[i], hands[j]]));
          }
        }
      }
      combinations.sort(compareEquipmentCombinations);
      const handChoice = combinations[0].items.slice().sort(compareEquipmentCandidates);
      if (handChoice.length === 1 && handChoice[0].item.grip === 2) {
        next.leftHand = handChoice[0].ref;
        next.rightHand = handChoice[0].ref;
      } else {
        if (handChoice[0]) {
          next.rightHand = handChoice[0].ref;
        }
        if (handChoice[1]) {
          next.leftHand = handChoice[1].ref;
        }
      }
    }

    const proposed = [];
    const proposedRefs = {};
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const ref = next[SLOT_ORDER[i]];
      if (!ref || proposedRefs[ref]) continue;
      proposedRefs[ref] = 1;
      const at = assignmentForRaw(state, ref);
      proposed.push({
        ref:ref,
        slots:slotsHolding(next, ref),
        fromCid:at ? at.cid : null,
        fromSlots:at ? at.slots.slice() : []
      });
    }

    const movements = [];
    for (let i = 0; i < proposed.length; i++) {
      const entry = proposed[i];
      if (entry.fromCid === cid && sameSlots(entry.fromSlots, entry.slots)) continue;
      movements.push({
        ref:entry.ref,
        fromCid:entry.fromCid,
        fromSlots:entry.fromSlots.slice(),
        toCid:cid,
        toSlots:entry.slots.slice()
      });
    }
    const currentRefs = FB.equippedItemRefs(state, cid);
    for (let i = 0; i < currentRefs.length; i++) {
      const ref = currentRefs[i];
      if (proposedRefs[ref]) continue;
      movements.push({
        ref:ref,
        fromCid:cid,
        fromSlots:slotsHolding(state.player.loadouts[cid], ref),
        toCid:null,
        toSlots:[]
      });
    }

    return {
      ok:true,
      cid:cid,
      refs:proposed.map(function (entry) { return entry.ref; }),
      loadout:next,
      proposed:proposed,
      movements:movements,
      changed:movements.length > 0,
      key:equipmentPlanKey(state, cid, next, proposed)
    };
  }

  function applyEquipBestPlan(state, plan) {
    delete state.player.loadouts[plan.cid];
    for (let i = 0; i < plan.refs.length; i++) clearAssignmentRaw(state, plan.refs[i]);
    if (plan.refs.length) {
      const next = {};
      for (let i = 0; i < SLOT_ORDER.length; i++) {
        const slot = SLOT_ORDER[i];
        if (plan.loadout[slot]) next[slot] = plan.loadout[slot];
      }
      state.player.loadouts[plan.cid] = next;
    }
    return plan.refs.slice();
  }

  FB.equipBestPreview = function (state, cid) {
    return equipBestPlan(state, cid, false);
  };

  FB.applyEquipBest = function (state, reviewedPlan) {
    if (!reviewedPlan || !reviewedPlan.cid) {
      return { ok:false, code:'missing' };
    }
    const current = equipBestPlan(state, reviewedPlan.cid, false);
    if (!current.ok) return current;
    if (current.key !== reviewedPlan.key) {
      return { ok:false, code:'stale', preview:current };
    }
    const refs = applyEquipBestPlan(state, current);
    return {
      ok:true,
      changed:current.changed,
      refs:refs,
      preview:current
    };
  };

  /* Succession gives the new protagonist first choice of the shared armory.
     It applies the same deterministic plan without a player confirmation and
     ignores the temporary UI equipment block at that transition boundary. */
  FB.autoEquipBest = function (state, cid) {
    const plan = equipBestPlan(state, cid, true);
    if (!plan.ok) return [];
    return applyEquipBestPlan(state, plan);
  };

  FB.pledgeItem = function (state, ref) {
    FB.ensureItems(state);
    if (state.player.items.indexOf(ref) < 0 || loanPledgesRef(state, ref) ||
      assignmentForRaw(state, ref)) return false;
    return true;
  };

  FB.itemBonus = function (state, key, cid) {
    FB.ensureItems(state);
    cid = cid || state.player.charId;
    if (['battle', 'gold', 'prestige', 'piety'].indexOf(key) >= 0 &&
      cid !== state.player.charId) return 0;
    let total = 0;
    const refs = FB.equippedItemRefs(state, cid);
    for (let i = 0; i < refs.length; i++) {
      const item = rawResolved(state, refs[i]);
      if (item && item.fx[key]) total += item.fx[key];
    }
    return total;
  };

  FB.itemBonusReadOnly = function (state, key, cid) {
    if (!state || !state.player) return 0;
    cid = cid || state.player.charId;
    if (['battle', 'gold', 'prestige', 'piety'].indexOf(key) >= 0 &&
        cid !== state.player.charId) return 0;
    let total = 0;
    const refs = FB.equippedItemRefsReadOnly(state, cid);
    for (let i = 0; i < refs.length; i++) {
      const item = rawResolved(state, refs[i]);
      if (item && item.fx[key]) total += item.fx[key];
    }
    return total;
  };

  FB.loadoutVisualKey = function (state, cid) {
    const loadout = FB.loadoutOf(state, cid);
    const parts = [];
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const slot = SLOT_ORDER[i];
      if (loadout[slot]) {
        const item = rawResolved(state, loadout[slot]);
        parts.push(slot + ':' + loadout[slot] + ':' + (item ? item.visualSeed : 0));
      }
    }
    return parts.join('|');
  };

  FB.giftOpinion = function (value) {
    const item = value && value.def ? value : null;
    const def = item ? item.def : value;
    const values = FBDATA.balance.socialItemGiftOpinion || [4, 8, 12];
    let tier = 0;
    if (item && item.ordinary) {
      tier = { plain:0, well:1, masterwork:2 }[item.quality] || 0;
    } else {
      tier = { common:0, fine:1, famed:2 }[def && def.rarity] || 0;
    }
    return values[tier] === undefined ? [4, 8, 12][tier] : values[tier];
  };

  FB.sellItem = function (state, ref) {
    const item = FB.resolveItem(state, ref);
    if (!item || state.player.items.indexOf(ref) < 0 || loanPledgesRef(state, ref) ||
      assignmentForRaw(state, ref)) return false;
    const gold = Math.round(item.value * (FBDATA.balance.itemSellRatio || 0.5));
    if (!FB.destroyItem(state, ref, { force:true })) return false;
    state.player.gold += gold;
    FB.news(state, FB.msg('news.item.sold',
      '💰 Sold: {item} for {money:gold}.',
      { item:FB.itemParam(state, ref, true), gold:gold }));
    return true;
  };

  FB.itemGiftStatus = function (state, ref, kind, id) {
    const item = rawResolved(state, ref);
    const ruler = kind === 'ruler' && state.realms && state.realms[id];
    const character = kind === 'character' && state.chars && state.chars[id];
    const accessTarget = {
      kind:kind === 'ruler' ? 'realm' : 'character', id:id
    };
    const access = FB.rankAccessStatus(state, accessTarget);
    const days = kind === 'ruler' && FB.rulerGiftDaysRemainingSnapshot
      ? FB.rulerGiftDaysRemainingSnapshot(state, id)
      : (kind === 'character' && FB.socialGiftDaysRemainingSnapshot
        ? FB.socialGiftDaysRemainingSnapshot(state, id) : 0);
    const delivery = FB.giftDeliveryPreview
      ? FB.giftDeliveryPreview(state, kind, id, { readOnly:true }) : null;
    const status = {
      ready:false,
      ref:ref,
      recipientKind:kind,
      recipientId:id,
      standing:item
        ? FB.rankAccessStandingEffect(state, accessTarget,
          FB.giftOpinion(item)) : 0,
      cooldownDays:FB.socialGiftCooldownDays
        ? FB.socialGiftCooldownDays() : 90,
      daysRemaining:days,
      delivery:delivery,
      access:access,
      reason:''
    };
    if (!item || !Array.isArray(state.player.items) ||
        state.player.items.indexOf(ref) < 0) {
      status.reason = FB.T('That object is not in the family armory.');
    } else if (kind === 'ruler' &&
        (!ruler || !ruler.alive || !ruler.ruler || id === 'player')) {
      status.reason = FB.T('That ruler cannot receive a gift.');
    } else if (kind === 'character' &&
        (!character || character.dead || id === state.player.charId)) {
      status.reason = FB.T('That person cannot receive a gift.');
    } else if (loanPledgesRef(state, ref)) {
      status.reason = FB.T(
        'Pledged to a lender; clear the loan before gifting it.');
    } else if (assignmentForRaw(state, ref)) {
      status.reason = FB.T(
        'Return this object to the armory before gifting it.');
    } else if (kind === 'character' &&
        FB.isHouseholdCharacter(state, id)) {
      status.reason = FB.T(
        'Household equipment remains in the shared family armory.');
    } else if (!access.ready) {
      status.reason = access.reason;
    } else if (delivery && delivery.pending) {
      status.reason = FB.T(
        'A gift courier is already traveling for this recipient.');
    } else if (days) {
      status.reason = FB.T(
        'Cash and item gifts share this recipient’s cooldown. Ready in {days} days.', {
          days:days
        });
    } else if (delivery && delivery.foreign && !delivery.eligible) {
      status.reason = delivery.reason;
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.giveItem = function (state, ref, cid) {
    FB.ensureItems(state);
    const c = state.chars[cid];
    const rulerId = c && FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, c);
    if (rulerId) return FB.giveRulerItemGift(state, ref, rulerId);
    const status = FB.itemGiftStatus(state, ref, 'character', cid);
    if (!status.ready) return false;
    const boost = status.standing;
    const delivery = FB.giftDeliveryPreview &&
      FB.giftDeliveryPreview(state, 'character', cid);
    if (delivery && delivery.foreign) {
      return FB.dispatchGiftDelivery(state, {
        recipientKind:'character',
        recipientId:cid,
        giftKind:'item',
        itemRef:ref,
        effect:boost
      });
    }
    if (!FB.transferItem(state, ref, cid)) return false;
    const standing = FB.adjustStanding(state,
      { kind:'character', id:c.id }, boost, 'gift:item');
    if (FB.noteSocialGift) FB.noteSocialGift(state, cid);
    FB.news(state, FB.msg('news.item.given',
      '🎁 You give {item} to {name}. (Standing {regard})', {
        item:FB.itemParam(state, ref, true),
        name:c.name,
        regard:Math.round(standing)
      }));
    return true;
  };

  FB.giveRulerItemGift = function (state, ref, rid) {
    FB.ensureItems(state);
    const status = FB.itemGiftStatus(state, ref, 'ruler', rid);
    if (!status.ready) return false;
    const r = state.realms[rid];
    const boost = status.standing;
    const delivery = FB.giftDeliveryPreview &&
      FB.giftDeliveryPreview(state, 'ruler', rid);
    if (delivery && delivery.foreign) {
      return FB.dispatchGiftDelivery(state, {
        recipientKind:'ruler',
        recipientId:rid,
        giftKind:'item',
        itemRef:ref,
        effect:boost
      });
    }
    const itemParam = FB.itemParam(state, ref, true);
    if (!FB.destroyItem(state, ref, { force:true })) return false;
    const standing = FB.adjustStanding(state, { kind:'realm', id:rid },
      boost, 'gift:item');
    if (FB.noteRulerGift) FB.noteRulerGift(state, rid);
    if (FB.rulerGiftUsesFavor(state, rid)) {
      FB.news(state, FB.msg('news.realm.item_gift_favor',
        '🎁 You give {item} to {ruler} of {realm}. (Standing {favor})', {
          item:itemParam,
          ruler:r.ruler.name,
          realm:r.name,
          favor:Math.round(standing)
        }));
    } else {
      FB.news(state, FB.msg('news.realm.item_gift_opinion',
        '🎁 You give {item} to {ruler} of {realm}. (Standing {opinion})', {
          item:itemParam,
          ruler:r.ruler.name,
          realm:r.name,
          opinion:Math.round(standing)
        }));
    }
    return true;
  };

  function weightedItemPool(state, opts) {
    opts = opts || {};
    const pool = [];
    for (const id in FBDATA.items) {
      const info = definitionOf(id);
      if (!info) continue;
      if (info.eventOnly) continue;
      if (opts.ordinary && !info.ordinary) continue;
      if (opts.rarity && info.def.rarity !== opts.rarity) continue;
      if (!opts.includeOwned && info.unique && FB.itemOwner(state, id)) continue;
      const weight = RARITY_WEIGHT[info.def.rarity] || 1;
      for (let i = 0; i < weight; i++) pool.push(id);
    }
    return pool;
  }

  function acquisitionMessage(state, ref, source) {
    FB.news(state, FB.msg('news.item.acquired', {
      forms: {
        select:'value', param:'source', cases: {
          plunder:'🎒 Plunder: {item}.',
          spoils:'⚔ Among the spoils: {item}.',
          raid:'⚔ Taken in the raid: {item}.',
          earth:'✨ Out of the earth: {item}.',
          chest:'🎒 From the chest: {item}.',
          other:'🎒 Yours now: {item}.'
        }
      }
    }, {
      source:source || 'other',
      item:FB.itemParam(state, ref, true)
    }));
  }

  FB.lootItem = function (state, rarity, source) {
    FB.ensureItems(state);
    const pool = weightedItemPool(state, { rarity:rarity, includeOwned:false });
    if (!pool.length) return null;
    const defId = FB.pick(pool);
    const info = definitionOf(defId);
    if (info.unique && FB.itemOwner(state, defId)) {
      FB.news(state, FB.msg('news.item.duplicate',
        '🎒 The find is no addition to your family’s treasures.', {}));
      return null;
    }
    const ref = FB.grantItem(state, defId);
    if (!ref) return null;
    acquisitionMessage(state, ref, source);
    return ref;
  };

  /* Peddler stock bands: the full-table offer is conditioned on the customer.
     The band comes from the player's station; each peddlerWealthShift purse
     threshold crossed shops one band higher, so a rich house is shown richer
     stock. The offer first rolls a rarity class from the band, then picks
     uniformly inside the class — class odds do not shrink as unique
     definitions are collected, so depletion of owned uniques no longer leaves
     a wealthy house seeing mostly ordinary stock until a class is truly
     exhausted. An offer above the band's home class is the rare aspirational
     piece and is labeled so the mismatch reads in the offer text. */
  function peddlerBandRole(state) {
    let idx = PEDDLER_ROLES.indexOf(FB.societalRole(state));
    if (idx < 0) idx = 0;
    const shifts = (FBDATA.balance && FBDATA.balance.peddlerWealthShift) || [];
    const gold = state.player.gold || 0;
    for (let i = 0; i < shifts.length; i++) {
      if (gold >= shifts[i]) idx++;
    }
    return PEDDLER_ROLES[Math.min(idx, PEDDLER_ROLES.length - 1)];
  }

  function peddlerOfferPick(state) {
    const bands = FBDATA.balance && FBDATA.balance.peddlerStockBands;
    const band = (bands && bands[peddlerBandRole(state)]) ||
      { common:24, fine:5, famed:1 };
    const order = ['common', 'fine', 'famed'];
    const byClass = { common:[], fine:[], famed:[] };
    for (const id in FBDATA.items) {
      const info = definitionOf(id);
      if (!info) continue;
      if (info.eventOnly) continue;
      if (info.unique && FB.itemOwner(state, id)) continue;
      const rarity = own(RARITY_RANK, info.def.rarity) ? info.def.rarity : 'common';
      byClass[rarity].push(id);
    }
    let home = 'common';
    for (let i = 0; i < order.length; i++) {
      if ((band[order[i]] || 0) > (band[home] || 0)) home = order[i];
    }
    let total = 0;
    for (let i = 0; i < order.length; i++) {
      if (byClass[order[i]].length) total += Math.max(0, band[order[i]] || 0);
    }
    if (!total) return null;
    let roll = FB.rng() * total;
    for (let i = 0; i < order.length; i++) {
      const rarity = order[i];
      const w = byClass[rarity].length ? Math.max(0, band[rarity] || 0) : 0;
      if (roll < w) return { id:FB.pick(byClass[rarity]), rarity:rarity, home:home };
      roll -= w;
    }
    return null;
  }

  FB.offerItem = function (state, ordinary) {
    FB.ensureItems(state);
    let defId = null;
    let offerClass = null;
    if (ordinary) {
      const pool = weightedItemPool(state, {
        ordinary:true,
        includeOwned:false
      });
      if (pool.length) defId = FB.pick(pool);
    } else {
      const pick = peddlerOfferPick(state);
      if (pick) {
        defId = pick.id;
        offerClass = RARITY_RANK[pick.rarity] > RARITY_RANK[pick.home]
          ? 'aspirational' : 'other';
      }
    }
    if (!defId) {
      FB.news(state, FB.msg('news.item.nothing_new',
        '🎒 Nothing is offered that you do not already own.', {}));
      return null;
    }
    const info = definitionOf(defId);
    const ref = info.ordinary ? FB.createItemInstance(state, defId) : defId;
    const item = rawResolved(state, ref);
    state.player.itemOffer = {
      ref:ref,
      id:defId,
      price:item.value
    };
    FB.queueEvent(state, 'item_offer', offerClass ? { offerClass:offerClass } : {});
    return ref;
  };

  FB.buyItemOffer = function (state) {
    const offer = state.player.itemOffer;
    if (!offer || state.player.gold < offer.price) return null;
    const ref = offer.ref || offer.id;
    const item = rawResolved(state, ref);
    if (!item || (item.unique && FB.itemOwner(state, ref))) return null;
    state.player.gold -= offer.price;
    state.player.itemOffer = null;
    FB.transferItem(state, ref, 'armory', { force:true });
    FB.news(state, FB.msg('news.item.bought', '🎒 Bought: {item}.',
      { item:FB.itemParam(state, ref, true) }));
    return ref;
  };

  FB.clearItemOffer = function (state) {
    FB.ensureItems(state);
    const offer = state.player.itemOffer;
    state.player.itemOffer = null;
    if (!offer) return null;
    const ref = offer.ref || offer.id;
    /* An ordinary offer is instantiated so its quality and picture survive
       save/load while the seller waits. If it was never acquired or named in
       a Chronicle record, discard only that orphaned registry entry. */
    if (own(state.itemInstances, ref) && !FB.itemOwner(state, ref)) {
      delete state.itemInstances[ref];
    }
    return ref;
  };

  FB.issueItem = function (state, defId) {
    const ref = FB.grantItem(state, defId);
    if (!ref) {
      FB.news(state, FB.msg('news.item.duplicate',
        '🎒 The find is no addition to your family’s treasures.', {}));
      return null;
    }
    FB.news(state, FB.msg('news.item.issued', '🎒 {item} is yours now.',
      { item:FB.itemParam(state, ref, true) }));
    return ref;
  };

  FB.fns = FB.fns || {};
  FB.fns.offer_item = function (state) { FB.offerItem(state, false); };
  FB.fns.offer_gear = function (state) { FB.offerItem(state, true); };
  FB.fns.can_afford_item = function (state) {
    const offer = state.player.itemOffer;
    return !!offer && state.player.gold >= offer.price;
  };
  FB.fns.buy_item = function (state) { FB.buyItemOffer(state); };
  FB.fns.clear_item_offer = function (state) { FB.clearItemOffer(state); };
  FB.fns.loot_item = function (state) { FB.lootItem(state, null, 'plunder'); };
  FB.fns.find_artifact = function (state) { FB.lootItem(state, 'famed', 'earth'); };
  FB.fns.plot_loot = function (state) {
    FB.lootItem(state, null, 'chest');
    FB.fns.plot_end(state);
  };
})();
