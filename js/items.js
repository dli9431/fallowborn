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
    for (const id in state.chars) {
      const c = state.chars[id];
      if (!c || c.dead || c.id === me.id) continue;
      if (me.spouseId === c.id || c.spouseId === me.id) add(c, false);
    }
    for (let i = 0; i < (me.childrenIds || []).length; i++) {
      const c = state.chars[me.childrenIds[i]];
      if (!c || c.dead) continue;
      let married = false;
      if (c.spouseId && state.chars[c.spouseId] && !state.chars[c.spouseId].dead) {
        married = true;
      } else {
        for (const id in state.chars) {
          const other = state.chars[id];
          if (other && !other.dead && other.spouseId === c.id) {
            married = true;
            break;
          }
        }
      }
      if (!married || c.id === state.player.charId) add(c, false);
    }
    return out;
  }

  FB.householdCharacterIds = function (state) {
    return directHouseholdIds(state).slice();
  };

  FB.isHouseholdCharacter = function (state, cid) {
    return directHouseholdIds(state).indexOf(cid) >= 0;
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
     new head, their spouses, and their resident unmarried children assigned;
     every removed reference already remains in the shared armory. */
  FB.reconcileHouseholdLoadouts = function (state) {
    FB.ensureItems(state);
    const household = directHouseholdIds(state);
    const cleared = [];
    for (let i = 0; i < household.length; i++) {
      FB.reclaimCharacterItems(state, household[i]);
    }
    for (const cid in state.player.loadouts) {
      if (household.indexOf(cid) >= 0) continue;
      const refs = FB.equippedItemRefs(state, cid);
      for (let i = 0; i < refs.length; i++) {
        if (cleared.indexOf(refs[i]) < 0) cleared.push(refs[i]);
      }
      delete state.player.loadouts[cid];
    }
    return cleared;
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
    if (item && item.ordinary) {
      return { plain:8, well:15, masterwork:25 }[item.quality] || 8;
    }
    return { common:15, fine:25, famed:40 }[def && def.rarity] || 15;
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

  FB.giveItem = function (state, ref, cid) {
    const item = FB.resolveItem(state, ref);
    const c = state.chars[cid];
    if (!item || !c || c.dead || state.player.items.indexOf(ref) < 0 ||
      loanPledgesRef(state, ref) || assignmentForRaw(state, ref) ||
      FB.isHouseholdCharacter(state, cid)) return false;
    const boost = FB.giftOpinion(item);
    if (!FB.transferItem(state, ref, cid)) return false;
    c.opinion = FB.clamp(c.opinion + boost, -100, 100);
    if (state.roles.lord === cid) {
      state.player.liegeOp = FB.clamp((state.player.liegeOp || 0) + boost, -100, 100);
    }
    FB.news(state, FB.msg('news.item.given',
      '🎁 You give {item} to {name}. (regard {regard})', {
        item:FB.itemParam(state, ref, true),
        name:c.name,
        regard:Math.round(c.opinion)
      }));
    return true;
  };

  function weightedItemPool(state, opts) {
    opts = opts || {};
    const pool = [];
    for (const id in FBDATA.items) {
      const info = definitionOf(id);
      if (!info) continue;
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

  FB.offerItem = function (state, ordinary) {
    FB.ensureItems(state);
    const pool = weightedItemPool(state, {
      ordinary:!!ordinary,
      includeOwned:false
    });
    if (!pool.length) {
      FB.news(state, FB.msg('news.item.nothing_new',
        '🎒 Nothing is offered that you do not already own.', {}));
      return null;
    }
    const defId = FB.pick(pool);
    const info = definitionOf(defId);
    const ref = info.ordinary ? FB.createItemInstance(state, defId) : defId;
    const item = rawResolved(state, ref);
    state.player.itemOffer = {
      ref:ref,
      id:defId,
      price:item.value
    };
    state.eventQueue.push({ id:'item_offer', ctx:{} });
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
