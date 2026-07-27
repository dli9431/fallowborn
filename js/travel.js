/* Fallowborn — temporary player travel, routes, encounters, and settlement. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function balance(key, fallback) {
    return FBDATA.balance[key] !== undefined ? FBDATA.balance[key] : fallback;
  }
  function me(state) { return state.chars[state.player.charId]; }
  function purpose(id) { return FBDATA.travelPurposes && FBDATA.travelPurposes[id]; }
  function settled(pid) {
    const pr = FB.world && FB.world.byId[pid];
    return !!(pr && !pr.wasteland && pr.culture && pr.religion);
  }
  function queueItem(state, id, travel) {
    const loc = FB.world.byId[travel.currentId];
    const dest = FB.world.byId[travel.destinationId];
    const ctx = {
      locationId:loc ? loc.id : travel.currentId,
      destinationId:dest ? dest.id : travel.destinationId
    };
    const target = travel.targetCharId && state.chars[travel.targetCharId];
    if (target) ctx.visitname = FB.fullName(target);
    FB.queueEvent(state, id, ctx, { travel:true });
  }
  function clearQueued(state) {
    state.eventQueue = (state.eventQueue || []).filter(function (item) {
      return !item.travel;
    });
    if (FB.ui && FB.ui.cancelTravelEvents) FB.ui.cancelTravelEvents();
  }
  function history(state) {
    const p = state.player;
    if (!Array.isArray(p.travelHistory)) p.travelHistory = [];
    return p.travelHistory;
  }
  function historyHas(state, purposeId, destinationId) {
    const list = history(state);
    for (let i = 0; i < list.length; i++) {
      if (list[i].purpose === purposeId &&
        (!destinationId || list[i].destinationId === destinationId)) return true;
    }
    return false;
  }
  function recordCompletion(state) {
    const t = state.player.travel;
    if (!t || t.completed) return;
    t.completed = true;
    if (purpose(t.purpose) && purpose(t.purpose).targeted) return;
    if (!historyHas(state, t.purpose, t.destinationId)) {
      history(state).push({
        purpose:t.purpose,
        destinationId:t.destinationId,
        turn:state.turn
      });
    }
  }
  function stayDays(state, travel) {
    if (!travel || travel.stayStartTurn === undefined) return 0;
    return Math.max(0, state.turn - travel.stayStartTurn);
  }
  function nextWorkDelay() {
    const min = Math.max(1, balance('travelWorkEventMinDays', 55));
    const max = Math.max(min, balance('travelWorkEventMaxDays', 85));
    return FB.ri(min, max);
  }

  FB.travelEnsure = function (state) {
    const p = state.player;
    if (!p.cooldowns) p.cooldowns = {};
    if (p.travel === undefined) p.travel = null;
    if (p.travelSettlement === undefined) p.travelSettlement = null;
    history(state);
    const t = p.travel;
    /* Old saves may be waiting on the former immediate return-or-settle
       decision. Its event id now introduces the mandatory stay, while these
       additive fields let destination time begin without a save migration. */
    if (t && t.phase === 'arrived' && t.completed) {
      if (t.stayStartTurn === undefined) t.stayStartTurn = state.turn;
      if (t.workEvents === undefined) t.workEvents = 0;
      if (t.stayStarted === undefined) t.stayStarted = true;
    }
    /* Journeys have always snapshotted their leg clock. Repair an older or
       mod-damaged record to the unmodified base value, never to a household
       standard that may have changed since departure. */
    if (t && (!isFinite(Number(t.legDays)) || Number(t.legDays) < 1)) {
      t.legDays = Math.max(1, balance('travelLegDays', 3));
    }
    if (t && (!isFinite(Number(t.legDaysLeft)) || Number(t.legDaysLeft) < 0)) {
      t.legDaysLeft = t.remainingRoute && t.remainingRoute.length ? t.legDays : 0;
    }
    if (t && t.targetCharId !== undefined &&
        typeof t.targetCharId !== 'string') delete t.targetCharId;
    if (t && t.targetCourtship !== undefined) {
      t.targetCourtship = !!t.targetCourtship;
    }
    return t;
  };

  FB.travelLocation = function (state) {
    const t = FB.travelEnsure(state);
    return FB.world.byId[t ? t.currentId : state.player.provinceId] || null;
  };

  /* Settled-only BFS. Authored straits are already part of FB.world.adj, so
     they remain legal without admitting decorative wasteland counties. */
  function routeSearch(fromPid, toPid) {
    const targeted = toPid !== undefined && toPid !== null;
    if (!settled(fromPid) || (targeted && !settled(toPid))) return null;
    const prev = {};
    const q = [fromPid];
    prev[fromPid] = fromPid;
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi];
      const adj = FB.world.adj[cur] || {};
      for (const nb in adj) {
        if (prev[nb] !== undefined || !settled(nb)) continue;
        prev[nb] = cur;
        if (targeted && nb === toPid) return { from:fromPid, prev:prev };
        q.push(nb);
      }
    }
    return targeted ? null : { from:fromPid, prev:prev };
  }

  function routeFromSearch(search, toPid) {
    if (!search) return null;
    if (search.from === toPid) return [];
    if (search.prev[toPid] === undefined) return null;
    const route = [toPid];
    let step = toPid;
    while (step !== search.from) {
      step = search.prev[step];
      if (step !== search.from) route.unshift(step);
    }
    return route;
  }

  FB.travelRoute = function (fromPid, toPid) {
    if (fromPid === toPid) return [];
    return routeFromSearch(routeSearch(fromPid, toPid), toPid);
  };

  FB.travelLegDays = function (state) {
    if (state && FB.householdStandardEffects) {
      const modified = FB.householdStandardEffects(state).travelLegDays;
      if (modified !== null && modified !== undefined) return Math.max(1, modified);
    }
    return Math.max(1, balance('travelLegDays', 3));
  };

  FB.travelRouteOverhead = function (routeOrLegs, state) {
    const legs = typeof routeOrLegs === 'number'
      ? routeOrLegs : ((routeOrLegs && routeOrLegs.length) || 0);
    const base = Math.ceil(2 + legs * 2 * 0.25);
    const mult = state && FB.householdStandardEffects
      ? FB.householdStandardEffects(state).travelCost : 1;
    return Math.ceil(base * mult);
  };

  FB.travelCost = function (purposeId, routeOrLegs, state) {
    const def = purpose(purposeId);
    const legs = typeof routeOrLegs === 'number'
      ? routeOrLegs : ((routeOrLegs && routeOrLegs.length) || 0);
    const base = Math.ceil(2 + legs * 2 * 0.25) + ((def && def.cost) || 0);
    const mult = state && FB.householdStandardEffects
      ? FB.householdStandardEffects(state).travelCost : 1;
    return Math.ceil(base * mult);
  };

  /* ================= GIFT COURIERS =================
     Gifts crossing the sovereign border travel from the permanent household
     home. Their route, effect, exact object/cash, and leg duration are frozen
     at dispatch; only a failed courier's return destination follows a later
     permanent move of the household. */

  function deliveryRecipientKind(state, kind, id) {
    if (kind === 'character' && FB.realmIdForRulerCharacter) {
      const rid = FB.realmIdForRulerCharacter(state, id);
      if (rid) return { kind:'ruler', id:rid };
    }
    return { kind:kind, id:id };
  }

  function giftRecipientData(state, kind, id) {
    const normalized = deliveryRecipientKind(state, kind, id);
    kind = normalized.kind;
    id = normalized.id;
    if (kind === 'ruler') {
      const r = state.realms && state.realms[id];
      if (!r || !r.alive || !r.ruler || id === 'player' ||
          !r.capital || !settled(r.capital)) return null;
      return {
        kind:kind,
        id:id,
        name:r.ruler.name,
        destinationId:r.capital,
        generation:r.ruler.generation === undefined ? 1 : r.ruler.generation
      };
    }
    if (kind === 'character') {
      const c = state.chars && state.chars[id];
      if (!c || c.dead || id === state.player.charId) return null;
      const destinationId = FB.characterResidence
        ? FB.characterResidence(state, c) : FB.homeOf(state, c);
      if (!destinationId || !settled(destinationId)) return null;
      return {
        kind:kind,
        id:id,
        name:FB.fullName(c),
        destinationId:destinationId,
        generation:null
      };
    }
    return null;
  }

  function provinceSovereign(state, pid) {
    if (!pid) return null;
    if (state.owner && state.owner[pid]) return state.owner[pid];
    const holder = state.holder && state.holder[pid];
    return holder && FB.topRealm ? FB.topRealm(state, holder) : holder || null;
  }

  function deliveryEta(delivery) {
    const route = delivery.remainingRoute || [];
    if (!route.length) return 0;
    const legDays = Math.max(1, Number(delivery.legDays) || 1);
    const left = Math.max(0, Number(delivery.legDaysLeft) || 0);
    return left + Math.max(0, route.length - 1) * legDays;
  }

  FB.giftDeliveryEnsure = function (state) {
    const p = state.player;
    if (!Array.isArray(p.giftDeliveries)) p.giftDeliveries = [];
    const kept = [];
    for (let i = 0; i < p.giftDeliveries.length; i++) {
      const d = p.giftDeliveries[i];
      if (!d || (d.recipientKind !== 'ruler' &&
          d.recipientKind !== 'character') ||
          (d.giftKind !== 'cash' && d.giftKind !== 'item') ||
          (d.phase !== 'outbound' && d.phase !== 'return') ||
          typeof d.recipientId !== 'string' ||
          typeof d.currentId !== 'string' ||
          !Array.isArray(d.remainingRoute)) continue;
      d.legDays = Math.max(1, Number(d.legDays) || balance('travelLegDays', 3));
      d.legDaysLeft = Math.max(0, Number(d.legDaysLeft) || 0);
      d.effect = Number(d.effect) || 0;
      if (d.giftKind === 'cash') d.amount = Math.max(0, Number(d.amount) || 0);
      kept.push(d);
    }
    p.giftDeliveries = kept;
    return kept;
  };

  FB.giftDeliveryPending = function (state, kind, id) {
    const normalized = deliveryRecipientKind(state, kind, id);
    const deliveries = FB.giftDeliveryEnsure(state);
    const currentRuler = normalized.kind === 'ruler' &&
      FB.realmRulerCharacter
      ? FB.realmRulerCharacter(state, normalized.id) : null;
    const realm = normalized.kind === 'ruler' &&
      state.realms && state.realms[normalized.id];
    const generation = realm && realm.ruler &&
      (realm.ruler.generation === undefined ? 1 : realm.ruler.generation);
    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (d.recipientKind === 'ruler' && normalized.kind === 'ruler' &&
          d.recipientId === normalized.id &&
          d.recipientGeneration === generation) return d;
      if (d.recipientKind === 'character' && currentRuler &&
          d.recipientId === currentRuler.id) return d;
      if (d.recipientKind === normalized.kind &&
          d.recipientKind !== 'ruler' &&
          d.recipientId === normalized.id) return d;
    }
    return null;
  };

  FB.giftDeliveryPreview = function (state, kind, id) {
    const recipient = giftRecipientData(state, kind, id);
    const pending = FB.giftDeliveryPending(state, kind, id);
    const out = {
      eligible:false,
      pending:pending,
      phase:pending ? pending.phase : null,
      eta:pending ? deliveryEta(pending) : 0
    };
    if (pending) {
      out.eligible = false;
      out.recipientKind = pending.recipientKind;
      out.recipientId = pending.recipientId;
      out.destinationId = pending.phase === 'return'
        ? pending.returnHomeId : pending.destinationId;
      out.foreign = true;
      return out;
    }
    if (!recipient) {
      out.reason = FB.T('That recipient cannot receive a gift.');
      return out;
    }
    const homeId = state.player.provinceId;
    const homeSovereign = provinceSovereign(state, homeId);
    const destinationSovereign = provinceSovereign(state,
      recipient.destinationId);
    const foreign = !!(homeSovereign && destinationSovereign &&
      homeSovereign !== destinationSovereign);
    out.recipientKind = recipient.kind;
    out.recipientId = recipient.id;
    out.recipientName = recipient.name;
    out.recipientGeneration = recipient.generation;
    out.homeId = homeId;
    out.homeSovereign = homeSovereign;
    out.destinationId = recipient.destinationId;
    out.destinationSovereign = destinationSovereign;
    out.foreign = foreign;
    const route = foreign
      ? FB.travelRoute(homeId, recipient.destinationId) : [];
    if (foreign && (!route || !route.length)) {
      out.reason = FB.T('No settled overland courier route reaches the recipient.');
      return out;
    }
    const legDays = FB.travelLegDays(state);
    out.eligible = true;
    out.route = route || [];
    out.legs = out.route.length;
    out.legDays = legDays;
    out.days = out.legs * legDays;
    out.eta = out.days;
    return out;
  };

  FB.dispatchGiftDelivery = function (state, spec) {
    spec = spec || {};
    const preview = FB.giftDeliveryPreview(state,
      spec.recipientKind, spec.recipientId);
    if (!preview.eligible || !preview.foreign || preview.pending) return false;
    const p = state.player;
    const giftKind = spec.giftKind;
    const effect = Number(spec.effect) || 0;
    let itemSnapshot = null;
    if (giftKind === 'cash') {
      const amount = Math.max(0, Number(spec.amount) || 0);
      if (p.gold < amount) return false;
    } else if (giftKind === 'item') {
      if (!spec.itemRef || !FB.resolveItem ||
          !FB.resolveItem(state, spec.itemRef) ||
          p.items.indexOf(spec.itemRef) < 0 ||
          (FB.itemAssignment && FB.itemAssignment(state, spec.itemRef)) ||
          (FB.financeCollateralPledged &&
            FB.financeCollateralPledged(state, 'item', spec.itemRef))) {
        return false;
      }
      itemSnapshot = FB.itemParam(state, spec.itemRef, true);
    } else {
      return false;
    }
    if (preview.recipientKind === 'ruler') {
      if (FB.rulerGiftReady && !FB.rulerGiftReady(
          state, preview.recipientId)) return false;
    } else if (FB.socialGiftReady &&
        !FB.socialGiftReady(state, preview.recipientId)) {
      return false;
    }

    const delivery = {
      id:'gift_delivery_' + FB.uid(),
      senderCharId:p.charId,
      recipientKind:preview.recipientKind,
      recipientId:preview.recipientId,
      recipientGeneration:preview.recipientGeneration,
      recipientName:preview.recipientName,
      giftKind:giftKind,
      amount:giftKind === 'cash' ? Math.max(0, Number(spec.amount) || 0) : 0,
      itemRef:giftKind === 'item' ? spec.itemRef : null,
      item:itemSnapshot,
      effect:effect,
      dispatchHomeId:preview.homeId,
      destinationId:preview.destinationId,
      destinationSovereign:preview.destinationSovereign,
      currentId:preview.homeId,
      phase:'outbound',
      remainingRoute:preview.route.slice(),
      outboundRoute:preview.route.slice(),
      legDays:preview.legDays,
      legDaysLeft:preview.legDays,
      startedTurn:state.turn,
      outboundArrivalTurn:state.turn + preview.days,
      failedReason:null
    };
    if (giftKind === 'cash') p.gold -= delivery.amount;
    else if (!FB.transferItem(state, delivery.itemRef, null)) return false;
    FB.giftDeliveryEnsure(state).push(delivery);

    const destination = FB.world.byId[delivery.destinationId];
    if (giftKind === 'cash') {
      FB.news(state, FB.msg('news.gift.courier_dispatched_cash',
        '📯 A courier leaves {home} carrying {money:amount} for {recipient} in {destination}; the road should take {days} days.', {
          home:FB.world.byId[delivery.dispatchHomeId].name,
          amount:delivery.amount,
          recipient:delivery.recipientName,
          destination:destination ? destination.name : '',
          days:preview.days
        }));
    } else {
      FB.news(state, FB.msg('news.gift.courier_dispatched_item',
        '📯 A courier leaves {home} carrying {item} for {recipient} in {destination}; the road should take {days} days.', {
          home:FB.world.byId[delivery.dispatchHomeId].name,
          item:delivery.item,
          recipient:delivery.recipientName,
          destination:destination ? destination.name : '',
          days:preview.days
        }));
    }
    return true;
  };

  function deliveryFailureReason(state, d) {
    if (state.player.charId !== d.senderCharId) return 'sender';
    if (d.recipientKind === 'ruler') {
      const r = state.realms && state.realms[d.recipientId];
      if (!r || !r.alive || !r.ruler ||
          (r.ruler.generation === undefined ? 1 : r.ruler.generation) !==
            d.recipientGeneration) return 'recipient';
      if (r.capital !== d.destinationId) return 'moved';
      return null;
    }
    const c = state.chars && state.chars[d.recipientId];
    if (!c || c.dead) return 'recipient';
    if (FB.isReigningRealmRuler && FB.isReigningRealmRuler(state, c)) {
      return 'succeeded';
    }
    const residence = FB.characterResidence
      ? FB.characterResidence(state, c) : FB.homeOf(state, c);
    return residence === d.destinationId ? null : 'moved';
  }

  function removeDelivery(state, delivery) {
    const deliveries = FB.giftDeliveryEnsure(state);
    const at = deliveries.indexOf(delivery);
    if (at >= 0) deliveries.splice(at, 1);
  }

  function deliveryReturnRoute(delivery, homeId) {
    if (delivery.currentId === homeId) return [];
    return FB.travelRoute(delivery.currentId, homeId);
  }

  function finishGiftReturn(state, delivery) {
    if (delivery.giftKind === 'cash') {
      state.player.gold += delivery.amount;
      FB.news(state, FB.msg('news.gift.courier_returned_cash',
        '📯 The courier reaches your home and restores the undelivered {money:amount} to the household purse.', {
          amount:delivery.amount
        }));
    } else {
      FB.transferItem(state, delivery.itemRef, 'armory', { force:true });
      FB.news(state, FB.msg('news.gift.courier_returned_item',
        '📯 The courier reaches your home and returns {item} to the family armory.', {
          item:delivery.item
        }));
    }
    removeDelivery(state, delivery);
  }

  function beginGiftReturn(state, delivery) {
    delivery.phase = 'return';
    delivery.returnHomeId = state.player.provinceId;
    delivery.remainingRoute =
      deliveryReturnRoute(delivery, delivery.returnHomeId) || [];
    delivery.legDaysLeft = delivery.remainingRoute.length
      ? delivery.legDays : 0;
    delivery.returnStartedTurn = state.turn;
    delivery.returnArrivalTurn = state.turn + deliveryEta(delivery);
    const destination = FB.world.byId[delivery.destinationId];
    FB.news(state, FB.msg('news.gift.courier_return_begins', {
      forms:{
        select:'value', param:'reason', cases:{
          sender:'📯 The courier reaches {destination}, but the sender is dead; the undelivered gift begins its return journey.',
          recipient:'📯 The courier reaches {destination}, but the recipient is gone; the undelivered gift begins its return journey.',
          succeeded:'📯 The courier reaches {destination}, but the recipient now wears a crown and the old personal offer cannot be delivered; the gift begins its return journey.',
          moved:'📯 The courier reaches {destination}, but the recipient has moved; the undelivered gift begins its return journey.',
          other:'📯 The gift cannot be delivered at {destination}; the courier begins the return journey.'
        }
      }
    }, {
      reason:delivery.failedReason || 'other',
      destination:destination ? destination.name : ''
    }));
    if (!delivery.remainingRoute.length &&
        delivery.currentId === delivery.returnHomeId) {
      finishGiftReturn(state, delivery);
    }
  }

  function finishGiftDelivery(state, delivery) {
    if (delivery.recipientKind === 'ruler') {
      const r = state.realms[delivery.recipientId];
      FB.adjustRealmOpinion(state, delivery.recipientId, delivery.effect);
      if (FB.noteRulerGift) FB.noteRulerGift(state, delivery.recipientId);
      const usesFavor = FB.rulerGiftUsesFavor(state, delivery.recipientId);
      const rulerParams = {
        amount:delivery.amount,
        item:delivery.item,
        recipient:r.ruler.name,
        realm:r.name,
        value:Math.round(FB.realmOpinionOf(state, delivery.recipientId))
      };
      if (delivery.giftKind === 'cash') {
        FB.news(state, FB.msg(usesFavor
          ? 'news.gift.courier_delivered_ruler_cash_favor'
          : 'news.gift.courier_delivered_ruler_cash_opinion',
        usesFavor
          ? '🎁 Your courier delivers {money:amount} to {recipient} of {realm}. (favor {value})'
          : '🎁 Your courier delivers {money:amount} to {recipient} of {realm}. (opinion {value})',
        rulerParams));
      } else {
        FB.news(state, FB.msg(usesFavor
          ? 'news.gift.courier_delivered_ruler_item_favor'
          : 'news.gift.courier_delivered_ruler_item_opinion',
        usesFavor
          ? '🎁 Your courier delivers {item} to {recipient} of {realm}. (favor {value})'
          : '🎁 Your courier delivers {item} to {recipient} of {realm}. (opinion {value})',
        rulerParams));
      }
    } else {
      const c = state.chars[delivery.recipientId];
      if (delivery.giftKind === 'item') {
        FB.transferItem(state, delivery.itemRef, c.id, { force:true });
      }
      c.opinion = FB.clamp(c.opinion + delivery.effect, -100, 100);
      if (FB.noteSocialGift) FB.noteSocialGift(state, c.id);
      const characterParams = {
        amount:delivery.amount,
        item:delivery.item,
        recipient:FB.fullName(c),
        regard:Math.round(c.opinion)
      };
      FB.news(state, delivery.giftKind === 'cash'
        ? FB.msg('news.gift.courier_delivered_character_cash',
          '🎁 Your courier delivers {money:amount} to {recipient}. (regard {regard})',
          characterParams)
        : FB.msg('news.gift.courier_delivered_character_item',
          '🎁 Your courier delivers {item} to {recipient}. (regard {regard})',
          characterParams));
    }
    removeDelivery(state, delivery);
  }

  function giftDeliveryArrive(state, delivery) {
    if (!delivery.failedReason) {
      delivery.failedReason = deliveryFailureReason(state, delivery);
    }
    if (delivery.failedReason) beginGiftReturn(state, delivery);
    else finishGiftDelivery(state, delivery);
  }

  function rerouteGiftReturn(state, delivery) {
    const homeId = state.player.provinceId;
    if (delivery.returnHomeId === homeId && delivery.remainingRoute.length) return;
    if (delivery.currentId === homeId) {
      delivery.returnHomeId = homeId;
      delivery.remainingRoute = [];
      delivery.legDaysLeft = 0;
      finishGiftReturn(state, delivery);
      return;
    }
    const route = deliveryReturnRoute(delivery, homeId);
    if (!route || !route.length) return;
    delivery.returnHomeId = homeId;
    delivery.remainingRoute = route;
    delivery.legDaysLeft = delivery.legDays;
    delivery.returnArrivalTurn = state.turn + deliveryEta(delivery);
  }

  FB.giftDeliveryTick = function (state) {
    const deliveries = FB.giftDeliveryEnsure(state).slice();
    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (FB.giftDeliveryEnsure(state).indexOf(d) < 0) continue;
      if (d.phase === 'outbound' && !d.failedReason) {
        d.failedReason = deliveryFailureReason(state, d);
      } else if (d.phase === 'return') {
        rerouteGiftReturn(state, d);
        if (FB.giftDeliveryEnsure(state).indexOf(d) < 0) continue;
      }
      if (!d.remainingRoute.length) {
        if (d.phase === 'outbound') giftDeliveryArrive(state, d);
        else if (d.currentId === state.player.provinceId) {
          finishGiftReturn(state, d);
        }
        continue;
      }
      d.legDaysLeft--;
      if (d.legDaysLeft > 0) continue;
      d.currentId = d.remainingRoute.shift();
      d.legDaysLeft = d.remainingRoute.length ? d.legDays : 0;
      if (!d.remainingRoute.length) {
        if (d.phase === 'outbound') giftDeliveryArrive(state, d);
        else if (d.currentId === state.player.provinceId) {
          finishGiftReturn(state, d);
        }
      }
    }
  };

  function purposeTierRange(def) {
    const explicit = !!(def &&
      (def.minTier !== undefined || def.maxTier !== undefined));
    let min = explicit && def.minTier !== undefined ? Math.floor(def.minTier) : 1;
    let max = explicit && def.maxTier !== undefined ? Math.floor(def.maxTier) :
      (explicit ? 7 : 2);
    if (!isFinite(min)) min = 1;
    if (!isFinite(max)) max = explicit ? 7 : 2;
    return {
      min:FB.clamp(min, 1, 7),
      max:FB.clamp(max, 1, 7)
    };
  }

  function purposeTierAllowed(state, def) {
    const range = purposeTierRange(def);
    return state.player.tier >= range.min && state.player.tier <= range.max;
  }

  FB.travelEligible = function (state, purposeId) {
    const p = state.player;
    const c = me(state);
    const def = purposeId === undefined ? null :
      (typeof purposeId === 'string' ? purpose(purposeId) : purposeId);
    FB.travelEnsure(state);
    if (p.travel) return FB.T('Already on the road.');
    if (!c || FB.ageOf(c, state.date.year) < 16) {
      return FB.T('Only an adult can take to the road.');
    }
    if (purposeId !== undefined && !def) {
      return FB.T('That travel purpose is unavailable.');
    }
    if (purposeId === undefined && (p.tier < 1 || p.tier > 2)) {
      return FB.T('The road is open to freeholders and gentry.');
    }
    if (purposeId !== undefined && !purposeTierAllowed(state, def)) {
      if (p.tier < 1) return FB.T('Serfs cannot take to the road.');
      const range = purposeTierRange(def);
      if (range.min === 1 && range.max === 2) {
        return FB.T('This journey is open to freeholders and gentry.');
      }
      return FB.T('This travel purpose is not open at your rank.');
    }
    if (p.flags && p.flags.in_prison) return FB.T('A prisoner cannot leave.');
    if (FB.atWarPersonally(state)) return FB.T('You cannot leave while personally at war.');
    const last = p.cooldowns && p.cooldowns.take_road;
    const cd = balance('travelCooldownDays', 360);
    if (last !== undefined && state.turn - last < cd) {
      return FB.T('Ready in {days} days.', {days:cd - (state.turn - last)});
    }
    return true;
  };

  FB.travelAnyPurposeEligible = function (state) {
    let reason = null;
    for (const id in (FBDATA.travelPurposes || {})) {
      const def = purpose(id);
      if (!def || def.targeted) continue;
      const eligible = FB.travelEligible(state, id);
      if (eligible === true) return true;
      if (!reason) reason = eligible;
    }
    return reason || FB.T('No travel purpose is available.');
  };

  function siteAllowed(state, site) {
    const c = me(state);
    const rel = FB.religionOf(c.religion);
    if (site.religions && site.religions.indexOf(c.religion) < 0) return false;
    if (site.religionGroups && site.religionGroups.indexOf(rel.group) < 0) return false;
    return true;
  }

  function addDestination(state, out, seen, purposeId, pid, realmId, opts,
      search) {
    const p = state.player;
    opts = opts || {};
    const def = purpose(purposeId);
    if (!pid || pid === p.provinceId || seen[pid] || !settled(pid)) return;
    if (!opts.ignoreHistory) {
      if (purposeId === 'pilgrimage' &&
        (historyHas(state, 'pilgrimage') || me(state).traits.indexOf('pilgrim') >= 0)) return;
      if (purposeId !== 'pilgrimage' && !(def && def.repeatable) &&
          historyHas(state, purposeId, pid)) return;
    }
    const route = search === undefined
      ? FB.travelRoute(p.provinceId, pid)
      : routeFromSearch(search, pid);
    if (!route || !route.length) return;
    const legDays = FB.travelLegDays(state);
    const pr = FB.world.byId[pid];
    seen[pid] = 1;
    out.push({
      purpose:purposeId,
      destinationId:pid,
      destinationRealm:realmId || null,
      route:route,
      legs:route.length,
      days:route.length * legDays,
      legDays:legDays,
      development:(state.dev && state.dev[pid]) || (pr && pr.dev0) || 1,
      cost:opts.overheadOnly
        ? FB.travelRouteOverhead(route, state)
        : FB.travelCost(purposeId, route, state)
    });
  }

  function sortDestinations(out) {
    out.sort(function (a, b) {
      if (a.legs !== b.legs) return a.legs - b.legs;
      const ap = FB.world.byId[a.destinationId];
      const bp = FB.world.byId[b.destinationId];
      return (ap ? ap.name : '').localeCompare(bp ? bp.name : '');
    });
    return out;
  }

  FB.developedMarketDestinations = function (state, minDev, opts) {
    const out = [];
    const seen = {};
    opts = opts || {};
    minDev = Math.max(1, Number(minDev) || 4);
    if (!state || !state.player || !FB.world) return out;
    const target = opts.destinationId && FB.world.byId[opts.destinationId];
    const candidates = target ? [target] :
      (opts.destinationId ? [] : FB.world.provs);
    const search = routeSearch(state.player.provinceId,
      opts.destinationId || undefined);
    for (let i = 0; i < candidates.length; i++) {
      const pr = candidates[i];
      if (!pr.wasteland && (state.dev[pr.id] || pr.dev0 || 1) >= minDev) {
        addDestination(state, out, seen, opts.purpose || 'trade',
          pr.id, null, opts, search);
      }
    }
    return sortDestinations(out);
  };

  FB.travelDestinations = function (state, purposeId) {
    const def = purpose(purposeId);
    const out = [];
    const seen = {};
    if (!def || def.targeted || FB.travelEligible(state, purposeId) !== true) return out;
    const search = def.mode === 'developed'
      ? null : routeSearch(state.player.provinceId);

    if (def.mode === 'sites') {
      const sites = FBDATA.travelSites || [];
      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        if (site.purpose === purposeId && siteAllowed(state, site)) {
          addDestination(state, out, seen, purposeId, site.provinceId, null,
            null, search);
        }
      }
    } else if (def.mode === 'developed') {
      const minDev = def.minDev || 4;
      const markets = FB.developedMarketDestinations(state, minDev, {
        purpose:purposeId
      });
      for (let i = 0; i < markets.length; i++) {
        out.push(markets[i]);
      }
    } else if (def.mode === 'capitals') {
      for (const rid in state.realms) {
        const realm = state.realms[rid];
        if (realm && realm.alive && realm.capital) {
          addDestination(state, out, seen, purposeId, realm.capital, rid,
            null, search);
        }
      }
    }
    return sortDestinations(out);
  };

  function beginJourney(state, purposeId, choice, opts) {
    opts = opts || {};
    const p = state.player;
    const legDays = choice.legDays || FB.travelLegDays(state);
    const venturePayload = opts.venturePayload;
    let venture = null;
    let upfront = choice.cost;
    let overhead = choice.cost;
    if (venturePayload && venturePayload.kind === 'trade_venture' &&
        purposeId === 'trade' && FB.tradeVenturePreview &&
        FB.tradeVentureCanStart) {
      const stake = Math.floor(Number(venturePayload.stake) || 0);
      if (FB.tradeVentureCanStart(
          state, 'accompany', stake, choice.destinationId) !== true) {
        return false;
      }
      const preview = FB.tradeVenturePreview(state, stake, choice.destinationId);
      if (!preview) return false;
      overhead = preview.overhead;
      upfront = preview.totalCost;
      venture = {
        kind:'trade_venture',
        stake:preview.stake,
        overhead:preview.overhead,
        destinationId:preview.destinationId,
        route:preview.route.slice(),
        startedTurn:state.turn,
        status:'active'
      };
    }
    if (state.player.gold < upfront) return false;
    p.gold -= upfront;
    p.cooldowns.take_road = state.turn;
    p.travel = {
      purpose:purposeId,
      homeId:p.provinceId,
      destinationId:choice.destinationId,
      destinationRealm:choice.destinationRealm || null,
      currentId:p.provinceId,
      phase:'outbound',
      remainingRoute:choice.route.slice(),
      outboundRoute:choice.route.slice(),
      visited:[p.provinceId],
      legDaysLeft:legDays,
      legDays:legDays,
      startTurn:state.turn,
      cost:upfront,
      overhead:overhead,
      encounters:{culture:0,road:0},
      seenCultures:{},
      seenEvents:{},
      completed:false
    };
    if (venture) p.travel.venture = venture;
    if (opts.targetCharId) p.travel.targetCharId = opts.targetCharId;
    if (opts.targetCourtship) p.travel.targetCourtship = true;
    if (opts.targetRulerRealm) {
      p.travel.targetRulerRealm = opts.targetRulerRealm;
      p.travel.targetRulerGeneration = opts.targetRulerGeneration;
    }
    p.travel.seenCultures[me(state).culture] = 1;
    clearQueued(state);
    if (venture) {
      FB.news(state, FB.msg('news.travel.trade_venture_departed',
        '🧭 Set out for {destination} with {money:stake} invested and {money:overhead} paid for the road.', {
          destination:FB.world.byId[p.travel.destinationId].name,
          stake:venture.stake,
          overhead:venture.overhead
        }));
    } else {
      FB.news(state, FB.msg('news.travel.departed',
        '🧭 Set out from {home} for {destination}.', {
          home:FB.world.byId[p.travel.homeId].name,
          destination:FB.world.byId[p.travel.destinationId].name
        }));
    }
    if (FB.map) {
      FB.map.travelPreview = null;
      FB.map.travelTargets = null;
      FB.map.request();
    }
    if (FB.ui && FB.ui.refresh) FB.ui.refresh();
    return true;
  }

  FB.travelStart = function (state, purposeId, destinationId, destinationRealm,
      venturePayload) {
    if (FB.travelEligible(state, purposeId) !== true) return false;
    const def = purpose(purposeId);
    if (!def || def.targeted) return false;
    const choices = FB.travelDestinations(state, purposeId);
    let choice = null;
    for (let i = 0; i < choices.length; i++) {
      if (choices[i].destinationId === destinationId &&
        (!destinationRealm || choices[i].destinationRealm === destinationRealm)) {
        choice = choices[i];
        break;
      }
    }
    if (!choice || state.player.gold < choice.cost) return false;
    return beginJourney(state, purposeId, choice, {
      venturePayload:venturePayload
    });
  };

  FB.socialVisitPreview = function (state, c) {
    const out = {
      eligible:false,
      characterId:c && c.id || null,
      purpose:'relationship'
    };
    if (!c || c.dead || c.id === state.player.charId) {
      out.reason = FB.T('That character cannot receive a visit.');
      return out;
    }
    const eligible = FB.travelEligible(state, 'relationship');
    if (eligible !== true) {
      out.reason = eligible;
      return out;
    }
    const destinationId = FB.characterResidence ?
      FB.characterResidence(state, c) : FB.homeOf(state, c);
    if (!destinationId || !settled(destinationId)) {
      out.reason = FB.T('Their residence cannot be reached by road.');
      return out;
    }
    if (destinationId === state.player.provinceId) {
      out.reason = FB.T('{name} is already resident in your county.', {
        name:FB.fullName(c)
      });
      return out;
    }
    const route = FB.travelRoute(state.player.provinceId, destinationId);
    if (!route || !route.length) {
      out.reason = FB.T('No settled overland route reaches their county.');
      return out;
    }
    const legDays = FB.travelLegDays(state);
    const activeDays = FB.socialAttentionDaysToThreshold ?
      FB.socialAttentionDaysToThreshold(state, c) : null;
    out.eligible = true;
    out.destinationId = destinationId;
    out.route = route;
    out.legs = route.length;
    out.legDays = legDays;
    out.days = route.length * legDays;
    out.cost = FB.travelCost('relationship', route, state);
    out.minimumStay = balance('travelMinStayDays', 90);
    out.dailyRate = FB.socialAttentionDailyOpinion ?
      FB.socialAttentionDailyOpinion() : 0;
    out.daysToThreshold = activeDays;
    out.daysFromDeparture = activeDays === null ? null : out.days + activeDays;
    return out;
  };

  FB.socialVisitStart = function (state, c, options) {
    options = options || {};
    const preview = FB.socialVisitPreview(state, c);
    if (!preview.eligible || state.player.gold < preview.cost) return false;

    if (options.courtship) {
      const alreadyCourting = state.player.courtingId === c.id;
      if (!alreadyCourting && (!FB.canCourt || !FB.canCourt(state, c))) return false;
      if (!FB.beginCourtship ||
          !FB.beginCourtship(state, c, { visitDeparture:true })) return false;
    } else if (!FB.socialAttentionAssign ||
        !FB.socialAttentionAssign(state, c)) {
      return false;
    }

    const targetRulerRealm = FB.realmIdForRulerCharacter
      ? FB.realmIdForRulerCharacter(state, c) : null;
    const started = beginJourney(state, 'relationship', {
      destinationId:preview.destinationId,
      destinationRealm:c.royalLine ? c.royalLine.realmId : null,
      route:preview.route,
      legDays:preview.legDays,
      cost:preview.cost
    }, {
      targetCharId:c.id,
      targetCourtship:!!options.courtship,
      targetRulerRealm:targetRulerRealm,
      targetRulerGeneration:targetRulerRealm && state.realms[targetRulerRealm].ruler
        .generation
    });
    if (started && options.courtship) {
      FB.news(state, FB.msg('news.social.courting_visit_begins',
        '🌷 You set out to court {name} in person.', {
          name:FB.fullName(c)
        }));
    }
    return started;
  };

  function eventPool(state, kind, travel) {
    const out = [];
    const events = FBDATA.events || [];
    const def = purpose(travel.purpose);
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev.travel || ev.travel.kind !== kind) continue;
      if (kind !== 'work' && travel.seenEvents[ev.id]) continue;
      if (ev.travel.purpose && ev.travel.purpose !== travel.purpose) continue;
      if (kind === 'work' && def && def.targeted &&
          ev.travel.purpose !== travel.purpose) continue;
      if (ev.travel.minTier !== undefined &&
          state.player.tier < ev.travel.minTier) continue;
      if (ev.travel.maxTier !== undefined &&
          state.player.tier > ev.travel.maxTier) continue;
      out.push(ev);
    }
    return out;
  }

  function queueEncounter(state, kind) {
    const t = state.player.travel;
    if (!t) return false;
    const cap = kind === 'culture'
      ? balance('travelCultureEventCap', 3)
      : balance('travelRoadEventCap', 4);
    if ((t.encounters[kind] || 0) >= cap) return false;
    const pool = eventPool(state, kind, t);
    if (!pool.length) return false;
    const ev = FB.pick(pool);
    t.seenEvents[ev.id] = 1;
    t.encounters[kind] = (t.encounters[kind] || 0) + 1;
    queueItem(state, ev.id, t);
    return true;
  }
  function queueWork(state) {
    const t = state.player.travel;
    if (!t) return false;
    let pool = eventPool(state, 'work', t);
    if (pool.length > 1 && t.lastWorkEventId) {
      pool = pool.filter(function (ev) { return ev.id !== t.lastWorkEventId; });
    }
    if (!pool.length) return false;
    const ev = FB.pick(pool);
    t.lastWorkEventId = ev.id;
    t.workEvents = (t.workEvents || 0) + 1;
    queueItem(state, ev.id, t);
    return true;
  }
  function tickDestinationStay(state) {
    const t = state.player.travel;
    if (!t || !t.completed || t.stayStartTurn === undefined) return;
    if (t.nextWorkTurn === undefined) t.nextWorkTurn = state.turn + nextWorkDelay();
    if (state.turn < t.nextWorkTurn) return;
    queueWork(state);
    t.nextWorkTurn = state.turn + nextWorkDelay();
  }

  function servicePatronAlive(state, t) {
    if (t.purpose !== 'service') return true;
    const realm = t.destinationRealm && state.realms[t.destinationRealm];
    return !!(realm && realm.alive && realm.capital === t.destinationId);
  }

  function arriveDestination(state) {
    const t = state.player.travel;
    if (!t) return;
    t.phase = 'arrived';
    t.legDaysLeft = 0;
    const pr = FB.world.byId[t.destinationId];
    const c = me(state);
    /* A genuinely foreign destination guarantees one mismatch story when the
       road has not already supplied one. */
    if (pr && pr.culture !== c.culture && !t.encounters.culture) {
      queueEncounter(state, 'culture');
    }
    if (t.purpose === 'service' && !servicePatronAlive(state, t)) {
      queueItem(state, 'travel_patron_gone', t);
    } else {
      queueItem(state, 'travel_capstone_' + t.purpose, t);
    }
  }

  function arriveCounty(state) {
    const t = state.player.travel;
    if (!t) return;
    const pr = FB.world.byId[t.currentId];
    const c = me(state);
    const destination = t.currentId === t.destinationId && t.phase === 'outbound';
    if (pr && pr.culture !== c.culture && !t.seenCultures[pr.culture] &&
      t.encounters.culture < balance('travelCultureEventCap', 3) &&
      (destination || FB.chance(0.65))) {
      queueEncounter(state, 'culture');
    }
    if (pr && pr.culture) t.seenCultures[pr.culture] = 1;
    if (!destination && t.encounters.road < balance('travelRoadEventCap', 4) &&
      FB.chance(0.38)) {
      queueEncounter(state, 'road');
    }
    if (destination) arriveDestination(state);
  }

  function finishAtHome(state) {
    const p = state.player;
    const t = p.travel;
    if (!t) return;
    clearQueued(state);
    p.travel = null;
    FB.news(state, FB.msg('news.travel.returned',
      '🧭 Returned home to {home}.', {home:FB.world.byId[t.homeId].name}));
    if (FB.validateFocus) FB.validateFocus(state);
    if (FB.map) FB.map.request();
  }

  function targetStillValid(state, t) {
    if (!t || !t.targetCharId) return true;
    const c = state.chars[t.targetCharId];
    if (!c || c.dead) return false;
    if (t.targetRulerRealm) {
      const r = state.realms[t.targetRulerRealm];
      if (!r || !r.alive || !r.ruler ||
          r.ruler.generation !== t.targetRulerGeneration ||
          !FB.isReigningRealmRuler ||
          !FB.isReigningRealmRuler(state, c)) return false;
    }
    const residence = FB.characterResidence ?
      FB.characterResidence(state, c) : FB.homeOf(state, c);
    if (residence !== t.destinationId) return false;
    if (!t.targetCourtship) return true;
    const p = state.player;
    if (p.courtingId !== c.id || !p.flags || !p.flags.courting) return false;
    return !!(FB.canCourt && FB.canCourt(state, c, true));
  }

  function endInvalidTargetVisit(state, t) {
    const targetId = t.targetCharId;
    const c = targetId && state.chars[targetId];
    if (state.player.courtingId === targetId) {
      if (c && FB.clearCourtship) FB.clearCourtship(state);
      else {
        state.player.courtingId = null;
        if (state.player.flags) delete state.player.flags.courting;
      }
    }
    if (FB.socialAttentionWithdraw) {
      FB.socialAttentionWithdraw(state, targetId, true);
    }
    clearQueued(state);
    delete t.targetCharId;
    delete t.targetCourtship;
    FB.news(state, FB.msg('news.travel.relationship_visit_ended', {
      forms: {
        select:'value', param:'known', cases:{
          yes:'🧭 The visit to {name} can no longer continue; you turn toward home.',
          no:'🧭 The planned visit can no longer continue; you turn toward home.',
          other:'🧭 The relationship visit ends; you turn toward home.'
        }
      }
    }, {
      known:c ? 'yes' : 'no',
      name:c ? FB.fullName(c) : ''
    }));
    if (t.currentId === t.homeId) {
      finishAtHome(state);
      return;
    }
    const route = FB.travelRoute(t.currentId, t.homeId);
    t.phase = 'return';
    t.remainingRoute = route || [];
    t.legDaysLeft = t.remainingRoute.length ? t.legDays : 0;
    if (!t.remainingRoute.length) finishAtHome(state);
    if (FB.map) FB.map.request();
  }

  FB.invalidateSocialVisit = function (state, cid) {
    const t = FB.travelEnsure(state);
    if (!t || !cid || t.targetCharId !== cid) return false;
    endInvalidTargetVisit(state, t);
    return true;
  };

  FB.travelTick = function (state) {
    const p = state.player;
    const t = FB.travelEnsure(state);
    if (!t) return;
    if (!targetStillValid(state, t)) {
      endInvalidTargetVisit(state, t);
      return;
    }
    if (p.dead || !purpose(t.purpose) ||
      !purposeTierAllowed(state, purpose(t.purpose)) ||
      (p.flags && p.flags.in_prison) ||
      FB.atWarPersonally(state)) {
      FB.travelCancel(state);
      return;
    }
    if (t.phase === 'arrived') {
      tickDestinationStay(state);
      return;
    }
    if (!t.remainingRoute.length) {
      if (t.phase === 'return') finishAtHome(state);
      else arriveDestination(state);
      return;
    }
    t.legDaysLeft--;
    if (t.legDaysLeft > 0) return;
    t.currentId = t.remainingRoute.shift();
    if (t.phase === 'outbound') t.visited.push(t.currentId);
    if (t.remainingRoute.length) t.legDaysLeft = t.legDays;
    arriveCounty(state);
    if (!t.remainingRoute.length && t.phase === 'return') finishAtHome(state);
    if (FB.map) FB.map.request();
  };

  FB.travelStayDays = function (state) {
    return stayDays(state, FB.travelEnsure(state));
  };

  FB.travelReturnEligible = function (state) {
    const t = FB.travelEnsure(state);
    if (!t) return FB.T('No journey is in progress.');
    if (t.phase === 'return') return FB.T('Already returning home.');
    if (t.phase !== 'arrived') return true;
    const remaining = balance('travelMinStayDays', 90) - stayDays(state, t);
    if (remaining <= 0) return true;
    if (t.purpose === 'relationship') {
      return FB.T('Remain on the visit for {days} more days before returning home.', {
        days:remaining
      });
    }
    if (state.player.tier >= 3) {
      return FB.T('Remain in guest residence for {days} more days before returning home.', {
        days:remaining
      });
    }
    return FB.T('Stay and work here for {days} more days before returning home.', {
      days:remaining
    });
  };

  FB.travelSettlementEligible = function (state) {
    const p = state.player;
    const t = FB.travelEnsure(state);
    if (!t || t.phase !== 'arrived') return FB.T('Reach the destination first.');
    if (p.tier < 1 || p.tier > 2) {
      return FB.T('Only freeholders and gentry may relocate the household this way.');
    }
    if (p.travelSettlement) {
      return FB.T('{name} has already made the one permanent move allowed in this lifetime.', {
        name:FB.fullName(me(state))
      });
    }
    const remaining = balance('travelSettleOfferDays', 360) - stayDays(state, t);
    if (remaining > 0) {
      return FB.T('A permanent home can be considered after {days} more days here.', {
        days:remaining
      });
    }
    if ((t.workEvents || 0) < balance('travelSettleWorkEvents', 4)) {
      return FB.T('Build more of a life here through local work before settling permanently.');
    }
    return true;
  };

  FB.travelTurnBack = function (state) {
    const t = FB.travelEnsure(state);
    if (!t || FB.travelReturnEligible(state) !== true) return false;
    clearQueued(state);
    if (t.phase === 'outbound' && t.venture && t.venture.status === 'active') {
      t.venture.status = 'cancelled';
      t.venture.cancelledTurn = state.turn;
    }
    const route = (t.visited || [t.homeId]).slice(0, -1).reverse();
    if (t.currentId !== t.homeId && (!route.length || route[route.length - 1] !== t.homeId)) {
      route.push(t.homeId);
    }
    t.phase = 'return';
    t.remainingRoute = route;
    t.legDaysLeft = route.length ? t.legDays : 0;
    if (!route.length) finishAtHome(state);
    else FB.news(state, FB.msg('news.travel.turned_back',
      '🧭 Turned back toward {home}.', {home:FB.world.byId[t.homeId].name}));
    if (FB.map) FB.map.request();
    return true;
  };

  FB.travelReturn = function (state) {
    const t = FB.travelEnsure(state);
    if (!t || t.phase !== 'arrived' || FB.travelReturnEligible(state) !== true) return false;
    clearQueued(state);
    t.phase = 'return';
    t.remainingRoute = [t.homeId].concat(t.outboundRoute.slice(0, -1)).reverse();
    t.legDaysLeft = t.remainingRoute.length ? t.legDays : 0;
    if (!t.remainingRoute.length) finishAtHome(state);
    if (FB.map) FB.map.request();
    return true;
  };

  FB.travelSettle = function (state) {
    const p = state.player;
    const t = FB.travelEnsure(state);
    if (!t || t.phase !== 'arrived' || FB.travelSettlementEligible(state) !== true) return false;
    const destination = t.destinationId;
    const rival = FB.getRole ? FB.getRole(state, 'rival', false) : null;
    if (rival) rival.homeProvinceId = t.homeId;
    clearQueued(state);
    p.provinceId = destination;
    p.liege = null;
    delete state.roles.lord;
    delete state.roles.priest;
    if (FB.clearCourtship) FB.clearCourtship(state);
    if (FB.socialAttentionClear) FB.socialAttentionClear(state);
    if (FB.clearFriendship) FB.clearFriendship(state, true);
    else delete state.roles.friend;
    delete state.roles.notable;
    /* The active rival and all household/property/finance records are
       deliberately untouched. Local authority is regenerated at the new home. */
    if (FB.getRole) {
      FB.getRole(state, 'lord', true);
      FB.getRole(state, 'priest', true);
    }
    p.travelSettlement = { turn:state.turn, destinationId:destination };
    p.travel = null;
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    if (FB.map) {
      FB.map.playerProv = destination;
      FB.map.travelPreview = null;
      FB.map.travelTargets = null;
      FB.map.request();
    }
    FB.news(state, FB.msg('news.travel.settled',
      '🧭 The household settles in {destination}.', {
        destination:FB.world.byId[destination].name
      }));
    if (FB.validateFocus) FB.validateFocus(state);
    if (FB.ui && FB.ui.refresh) FB.ui.refresh();
    return true;
  };

  FB.travelCancel = function (state, reason, silent) {
    const p = state && state.player;
    if (!p || !p.travel) return false;
    clearQueued(state);
    const t = p.travel;
    p.travel = null;
    if (!silent) {
      if (t.venture && t.venture.status === 'active') {
        FB.news(state, FB.msg('news.travel.trade_venture_cancelled',
          '🧭 The accompanied venture ends without a payout. The household remains at {home}.', {
            home:FB.world.byId[t.homeId].name
          }));
      } else {
        FB.news(state, FB.msg('news.travel.cancelled',
          '🧭 The journey ends as your station or obligations change. The household remains at {home}.', {
            home:FB.world.byId[t.homeId].name
          }));
      }
      if (FB.validateFocus) FB.validateFocus(state);
    }
    if (FB.map) FB.map.request();
    return true;
  };

  FB.travelValidate = function (state) {
    const t = FB.travelEnsure(state);
    if (!t) return true;
    const p = state.player;
    if (!targetStillValid(state, t)) {
      endInvalidTargetVisit(state, t);
      return false;
    }
    if (p.dead || !purpose(t.purpose) ||
      !purposeTierAllowed(state, purpose(t.purpose)) ||
      (p.flags && p.flags.in_prison) ||
      FB.atWarPersonally(state)) {
      FB.travelCancel(state);
      return false;
    }
    return true;
  };

  FB.travelCapstoneDone = function (state) {
    const t = FB.travelEnsure(state);
    if (!t || t.phase !== 'arrived') return;
    recordCompletion(state);
    if (t.stayStarted) return;
    t.stayStarted = true;
    t.stayStartTurn = state.turn;
    t.workEvents = 0;
    t.nextWorkTurn = state.turn + nextWorkDelay();
    clearQueued(state);
    queueItem(state, t.purpose === 'relationship'
      ? 'travel_arrival_choice_relationship'
      : (state.player.tier >= 3
        ? 'travel_arrival_choice_ruler' : 'travel_arrival_choice'), t);
  };

  FB.travelTradeSettle = function (state, outcome, multiplier) {
    const t = FB.travelEnsure(state);
    if (!t || t.purpose !== 'trade') return false;
    const venture = t.venture;
    if (venture) {
      if (venture.status !== 'active') {
        FB.travelCapstoneDone(state);
        return false;
      }
      const payout = Math.round(venture.stake * multiplier * 100) / 100;
      venture.outcome = outcome;
      venture.multiplier = multiplier;
      venture.payout = payout;
      venture.status = 'resolved';
      venture.resolvedTurn = state.turn;
      state.player.gold += payout;
    } else {
      /* Compatibility for direct/mod calls to the original fixed-stake trade
         journey, whose ten-gold stake was embedded in purpose.cost. */
      state.player.gold += Math.round(10 * multiplier * 100) / 100;
    }
    FB.travelCapstoneDone(state);
    return true;
  };

  FB.fns = FB.fns || {};
  FB.fns.travel_capstone_done = function (state) {
    FB.travelCapstoneDone(state);
  };
  FB.fns.travel_trade_cautious = function (state) {
    FB.travelTradeSettle(state, 'cautious', 1.2);
  };
  FB.fns.travel_trade_bold_success = function (state) {
    FB.travelTradeSettle(state, 'bold_success', 2.5);
  };
  FB.fns.travel_trade_bold_failure = function (state) {
    FB.travelTradeSettle(state, 'bold_failure', 0.3);
  };
  FB.fns.travel_study_career = function (state) {
    const c = me(state);
    const career = FB.careerOf ? FB.careerOf(state, c) : null;
    const def = career && FBDATA.careers[career.profession];
    if (career) career.experience = (career.experience || 0) + 2;
    if (def && def.skill) FB.gainSkill(c, def.skill, 2);
    else FB.gainSkill(c, 'lea', 1);
    FB.travelCapstoneDone(state);
  };
  FB.fns.travel_work_career = function (state) {
    const c = me(state);
    const career = FB.careerOf ? FB.careerOf(state, c) : null;
    const def = career && FBDATA.careers[career.profession];
    if (career) career.experience = (career.experience || 0) + 1;
    FB.gainSkill(c, def && def.skill ? def.skill : 'ste', 1);
  };

  /* Map overlay: destination rings while picking, the selected/active route,
     and a traveler marker separate from the household’s gold home flag. */
  FB.renderTravel = function (ctx, toScreen, z, dpr) {
    const map = FB.map;
    const state = FB.state;
    if (!map || !state) return;
    const targets = map.travelTargets || [];
    if (targets.length) {
      ctx.lineWidth = 2 * dpr;
      for (let i = 0; i < targets.length; i++) {
        const pr = FB.world.byId[targets[i]];
        if (!pr) continue;
        const point = toScreen(pr.cx, pr.cy);
        ctx.beginPath();
        ctx.arc(point[0], point[1], (8 + Math.min(5, z)) * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = map.travelSelected === pr.id
          ? 'rgba(255,238,120,0.98)' : 'rgba(120,225,205,0.85)';
        ctx.stroke();
      }
    }

    let route = map.travelPreview;
    const t = state.player.travel;
    if (!route && t) route = [t.currentId].concat(t.remainingRoute || []);
    if (route && route.length > 1) {
      ctx.strokeStyle = 'rgba(120,225,205,0.92)';
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      for (let i = 0; i < route.length; i++) {
        const pr = FB.world.byId[route[i]];
        if (!pr) continue;
        const point = toScreen(pr.cx, pr.cy);
        if (i === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (t) {
      const here = FB.world.byId[t.currentId];
      if (here) {
        const point = toScreen(here.cx, here.cy);
        ctx.font = Math.round(16 * dpr) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText('🧭', point[0], point[1] - 10 * dpr);
        ctx.fillStyle = '#7fe1d2';
        ctx.fillText('🧭', point[0], point[1] - 10 * dpr);
      }
    }
  };
})();
