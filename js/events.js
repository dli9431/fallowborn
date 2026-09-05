/* Fallowborn — event engine: triggers, weights, effects, templating */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* ---------- supporting cast (roles) ---------- */
  FB.relationshipOpinionThreshold = function () {
    const b = FBDATA.balance;
    if (b.relationshipOpinionThreshold !== undefined) {
      return b.relationshipOpinionThreshold;
    }
    /* Deprecated compatibility key for older data sets and mods. */
    return b.friendOpinionThreshold === undefined ? 40 : b.friendOpinionThreshold;
  };

  FB.courtshipStandingThreshold = function (state, target) {
    const me = state && state.player && state.chars[state.player.charId];
    if (me && target && FB.kinshipDegreeSnapshot &&
        FB.siblingCourtshipRecord) {
      const degree = FB.kinshipDegreeSnapshot(state, me, target);
      const record = (degree === 'full_sibling' || degree === 'half_sibling')
        ? FB.siblingCourtshipRecord(state, me, target) : null;
      if (record && record.status === 'accepted') return 80;
    }
    const base = FB.relationshipOpinionThreshold();
    const premium = FB.courtshipIdentityStandingPremium(state, target);
    return Math.min(100, base + premium.total);
  };

  /* A different culture or faith is possible, but the prospective spouse's
     family expects a warmer personal relationship before it will entertain a
     proposal. Exact identity, rather than broad culture group or faith fold,
     keeps this gate legible and consistent with the character sheet. */
  FB.courtshipIdentityStandingPremium = function (state, target) {
    const me = state && state.player && state.chars[state.player.charId];
    const culture = me && target && me.culture !== target.culture
      ? Math.max(0, Number(FBDATA.balance.marriageCultureStandingPremium) || 0)
      : 0;
    const religion = me && target && me.religion !== target.religion
      ? Math.max(0, Number(FBDATA.balance.marriageFaithStandingPremium) || 0)
      : 0;
    return { culture:culture, religion:religion, total:culture + religion };
  };

  function characterStanding(state, c) {
    return c ? FB.standingOf(state, { kind:'character', id:c.id }) : 0;
  }

  function adjustCharacterStanding(state, c, amount, source) {
    return c ? FB.adjustStanding(state, { kind:'character', id:c.id },
      amount, source) : 0;
  }

  function realmStanding(state, rid) {
    return rid ? FB.standingOf(state, { kind:'realm', id:rid }) : 0;
  }

  function adjustRealmStanding(state, rid, amount, source) {
    return rid ? FB.adjustStanding(state, { kind:'realm', id:rid },
      amount, source) : 0;
  }

  FB.friendContacts = function (state) {
    const p = state.player;
    if (!p.friendContacts || typeof p.friendContacts !== 'object' ||
      Array.isArray(p.friendContacts)) p.friendContacts = {};
    for (const id in p.friendContacts) {
      const c = state.chars[id];
      if (!c || c.dead || id === p.charId) delete p.friendContacts[id];
    }
    return p.friendContacts;
  };

  /* ---------- social access across station ----------
     A household can normally reach only one station upward. Warm cultivated
     contacts form a derived chain of introducers, one station at a time; no
     extra access state is serialized. Close personal ties bypass the chain,
     while wartime access to the current local lord opens an extraordinary
     audience without erasing the underlying class penalty. */
  function rankAccessTarget(state, target) {
    target = target || {};
    const kind = target.kind === 'ruler' ? 'realm' : target.kind;
    if (kind === 'realm') {
      const realm = state.realms && state.realms[target.id];
      if (!realm || !realm.alive || target.id === 'player') return null;
      const ruler = FB.realmRulerCharacterSnapshot
        ? FB.realmRulerCharacterSnapshot(state, target.id) : null;
      return {
        kind:'realm', id:target.id, realmId:target.id,
        character:ruler,
        station:realm.rank <= 2 ? 3 : 4
      };
    }
    if (kind !== 'character') return null;
    const c = state.chars && state.chars[target.id];
    if (!c || c.dead || c.id === state.player.charId) return null;
    const realmId = FB.realmIdForRulerCharacter
      ? FB.realmIdForRulerCharacter(state, c) : null;
    return {
      kind:'character', id:c.id, realmId:realmId,
      character:c, station:FB.clamp(FB.stationOf(c), 0, 4)
    };
  }

  function rankAccessStanding(state, c) {
    if (!c) return 0;
    return FB.standingOf
      ? FB.standingOf(state, { kind:'character', id:c.id })
      : (Number(c.opinion) || 0);
  }

  function rankAccessPersonal(state, info, threshold) {
    const c = info.character;
    const p = state.player;
    const me = state.chars[p.charId];
    if (info.realmId && p.royalCompact &&
        p.royalCompact.realmId === info.realmId) return true;
    if (!c) return false;
    if (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id)) {
      return true;
    }
    if (me && (me.spouseId === c.id || c.spouseId === me.id ||
        me.fatherId === c.id || me.motherId === c.id ||
        (me.childrenIds || []).indexOf(c.id) >= 0)) return true;
    const kin = FB.kinOf ? FB.kinOf(state).byId : null;
    if (kin && kin[c.id]) return true;
    if (state.roles && (state.roles.friend === c.id ||
        state.roles.rival === c.id)) return true;
    const contacts = p.friendContacts;
    return !!(contacts && typeof contacts === 'object' &&
      !Array.isArray(contacts) && contacts[c.id] &&
      rankAccessStanding(state, c) >= threshold);
  }

  function rankAccessAssigned(state, info) {
    const c = info.character;
    const attention = state.player.socialAttention;
    return !!(c && attention && typeof attention === 'object' &&
      !Array.isArray(attention) && attention[c.id]);
  }

  function rankAccessExtraordinary(state, info) {
    const c = info.character;
    if (!c || !state.roles || state.roles.lord !== c.id) return false;
    if (state.player.flags && state.player.flags.lords_favor) return true;
    return !!(FB.atWarPersonally && FB.atWarPersonally(state));
  }

  FB.rankAccessStatus = function (state, target) {
    const info = state && state.player && state.chars
      ? rankAccessTarget(state, target) : null;
    const status = {
      ready:false,
      mode:'blocked',
      playerStation:state && state.player ? FB.playerStation(state) : 0,
      targetStation:info ? info.station : null,
      ceiling:0,
      threshold:FB.relationshipOpinionThreshold(),
      neededStation:null,
      intermediaries:[],
      standingMultiplier:1,
      cashMultiplier:1,
      description:'',
      reason:''
    };
    if (!info) {
      status.reason = FB.T('No social access can be established to this target.');
      status.description = status.reason;
      return status;
    }

    const B = FBDATA.balance;
    const standingStep = B.rankAccessInfluenceMult === undefined
      ? 0.5 : FB.clamp(Number(B.rankAccessInfluenceMult) || 0, 0.01, 1);
    const cashStep = B.rankAccessCashCostMult === undefined
      ? 2 : Math.max(1, Number(B.rankAccessCashCostMult) || 1);
    const rawSteps = Math.max(0,
      info.station - status.playerStation - 1);
    const personal = rankAccessPersonal(state, info, status.threshold);
    const assigned = rankAccessAssigned(state, info);
    const extraordinary = rankAccessExtraordinary(state, info);
    let ceiling = Math.min(4, status.playerStation + 1);
    const contacts = state.player.friendContacts;
    const warmByStation = {};
    if (contacts && typeof contacts === 'object' &&
        !Array.isArray(contacts)) {
      for (const cid in contacts) {
        const c = state.chars[cid];
        if (!c || c.dead || (info.character && c.id === info.character.id) ||
            rankAccessStanding(state, c) < status.threshold) continue;
        const station = FB.clamp(FB.stationOf(c), 0, 4);
        const existing = warmByStation[station];
        if (!existing || rankAccessStanding(state, c) >
            rankAccessStanding(state, existing) ||
            (rankAccessStanding(state, c) ===
              rankAccessStanding(state, existing) &&
              String(c.id) < String(existing.id))) {
          warmByStation[station] = c;
        }
      }
    }
    while (ceiling < info.station && warmByStation[ceiling]) {
      status.intermediaries.push(warmByStation[ceiling].id);
      ceiling++;
    }
    status.ceiling = ceiling;

    if (personal) {
      status.ready = true;
      status.mode = 'personal';
      status.description = FB.T(
        'An established personal relationship grants direct access.');
      return status;
    }

    status.standingMultiplier = Math.pow(standingStep, rawSteps);
    status.cashMultiplier = Math.pow(cashStep, rawSteps);
    const percent = Math.round(status.standingMultiplier * 100);
    if (extraordinary) {
      status.ready = true;
      status.mode = 'wartime';
      status.description = FB.T(
        'Wartime service opens an extraordinary audience; class distance leaves influence at {percent}% of its usual strength.', {
          percent:percent
        });
      return status;
    }
    if (assigned) {
      status.ready = true;
      status.mode = 'introduced';
      status.description = rawSteps
        ? FB.T(
          'An existing introduction grants access; class distance leaves influence at {percent}% of its usual strength.', {
            percent:percent
          })
        : FB.T('Within ordinary social reach.');
      return status;
    }
    if (info.station <= ceiling) {
      status.ready = true;
      status.mode = rawSteps ? 'brokered' : 'direct';
      status.description = rawSteps
        ? FB.T(
          'Warm intermediaries grant an audience; class distance leaves influence at {percent}% of its usual strength.', {
            percent:percent
          })
        : FB.T('Within ordinary social reach.');
      return status;
    }

    status.neededStation = ceiling;
    status.reason = FB.T(
      'No personal audience. Cultivate a {station} intermediary to +{standing} Standing; each warm intermediary opens the next station.', {
        station:FB.stationName(ceiling),
        standing:status.threshold
      });
    status.description = status.reason;
    return status;
  };

  FB.rankAccessStandingEffect = function (state, target, amount) {
    const access = FB.rankAccessStatus(state, target);
    return Math.round((Number(amount) || 0) *
      access.standingMultiplier * 10) / 10;
  };

  FB.rankAccessCashCost = function (state, target, amount) {
    const access = FB.rankAccessStatus(state, target);
    return Math.ceil(Math.max(0, Number(amount) || 0) *
      access.cashMultiplier);
  };

  function friendEligible(state, c) {
    if (!c || c.dead || c.id === state.player.charId ||
        state.roles.rival === c.id || FB.ageOf(c, state.date.year) < 16) return false;
    const me = state.chars[state.player.charId];
    if (!me) return false;
    if (me.spouseId === c.id || c.spouseId === me.id ||
        me.fatherId === c.id || me.motherId === c.id ||
        (me.childrenIds || []).indexOf(c.id) >= 0) return false;
    const kin = FB.kinOf ? FB.kinOf(state).byId : {};
    return !kin[c.id];
  }
  FB.friendContactEligible = friendEligible;

  FB.noteFriendContact = function (state, c, opts) {
    if (!friendEligible(state, c)) return false;
    opts = opts || {};
    const contacts = FB.friendContacts(state);
    const old = contacts[c.id];
    const record = old && typeof old === 'object'
      ? old : { startedTurn:state.turn };
    record.lastTurn = state.turn;
    if (opts.cultivated === true) record.cultivated = true;
    else if (!Object.prototype.hasOwnProperty.call(record, 'cultivated')) {
      record.cultivated = opts.cultivated === false ? false : true;
    }
    if (opts.source && (!record.source || !old)) record.source = opts.source;
    contacts[c.id] = record;
    return true;
  };

  /* ---------- personal social attention ----------
     Standing is the only relationship score. This life-local assignment
     merely says whose Standing receives the fixed daily cultivation rate. */
  FB.socialAttentionCapacity = function () {
    const value = FBDATA.balance.socialAttentionCapacity;
    return Math.max(0, value === undefined ? 1 : Math.floor(value));
  };

  FB.socialAttentionEnsure = function (state) {
    const p = state.player;
    if (!p.socialAttention || typeof p.socialAttention !== 'object' ||
      Array.isArray(p.socialAttention)) p.socialAttention = {};

    /* Old saves may still be spending their whole day on the removed
       courtship focus. Convert that intent once, then choose ordinary work. */
    if (p.focus === 'court_suitor') {
      const suitor = p.courtingId && state.chars[p.courtingId];
      p.socialAttention = {};
      if (suitor && !suitor.dead && suitor.id !== p.charId &&
        FB.socialAttentionCapacity() > 0) {
        p.socialAttention[suitor.id] = {
          startedTurn:state.turn,
          lastTurn:state.turn
        };
        FB.noteFriendContact(state, suitor);
      }
      p.focus = null;
      if (FB.defaultFocus) p.focus = FB.defaultFocus(state);
    }

    const activeSuitor = p.courtingId && state.chars[p.courtingId];
    if (p.courtingId && (!activeSuitor || activeSuitor.dead)) {
      p.courtingId = null;
      delete p.flags.courting;
    }

    const valid = [];
    const courtId = p.courtingId;
    if (courtId && p.socialAttention[courtId]) valid.push(courtId);
    for (const id in p.socialAttention) {
      if (id !== courtId) valid.push(id);
    }
    const capacity = FB.socialAttentionCapacity();
    let kept = 0;
    for (let i = 0; i < valid.length; i++) {
      const id = valid[i];
      const c = state.chars[id];
      if (!c || c.dead || id === p.charId || kept >= capacity) {
        delete p.socialAttention[id];
        continue;
      }
      const record = p.socialAttention[id];
      if (!record || typeof record !== 'object') {
        p.socialAttention[id] = { startedTurn:state.turn, lastTurn:state.turn };
      }
      kept++;
    }
    return p.socialAttention;
  };

  FB.socialAttentionIds = function (state) {
    const attention = FB.socialAttentionEnsure(state);
    return Object.keys(attention);
  };

  FB.socialAttentionTarget = function (state) {
    const ids = FB.socialAttentionIds(state);
    return ids.length ? state.chars[ids[0]] : null;
  };

  FB.socialAttentionPresence = function (state, c) {
    const residenceId = FB.characterResidence ?
      FB.characterResidence(state, c) : FB.homeOf(state, c);
    const travel = state.player.travel;
    if (travel) {
      if (travel.phase !== 'arrived') {
        return {
          status:'on-road',
          residenceId:residenceId,
          locationId:travel.currentId
        };
      }
      return {
        status:travel.currentId === residenceId ? 'active' : 'remote',
        residenceId:residenceId,
        locationId:travel.currentId
      };
    }
    return {
      status:state.player.provinceId === residenceId ? 'active' : 'remote',
      residenceId:residenceId,
      locationId:state.player.provinceId
    };
  };

  FB.socialAttentionStatus = function (state, c, opts) {
    opts = opts || {};
    const attention = state.player.socialAttention;
    const assigned = !!(attention && typeof attention === 'object' &&
      !Array.isArray(attention) && c && attention[c.id]);
    const access = FB.rankAccessStatus(state, {
      kind:'character', id:c && c.id
    });
    const status = {
      ready:false,
      assigned:assigned,
      characterId:c && c.id || null,
      capacity:FB.socialAttentionCapacity(),
      rate:access.ready
        ? FB.socialAttentionDailyOpinion() * access.standingMultiplier : 0,
      access:access,
      reason:''
    };
    if (!c || c.dead || c.id === state.player.charId) {
      status.reason = FB.T('That person cannot receive personal attention.');
    } else if (!status.capacity) {
      status.reason = FB.T('No personal-attention assignment is available.');
    } else if (!access.ready) {
      status.reason = access.reason;
    } else if (state.player.courtingId &&
        state.player.courtingId !== c.id && !opts.courtship) {
      status.reason = FB.T(
        'End your current courtship before cultivating someone else.');
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.socialAttentionAssign = function (state, c, opts) {
    opts = opts || {};
    const p = state.player;
    if (!FB.socialAttentionStatus(state, c, opts).ready) return false;
    const attention = FB.socialAttentionEnsure(state);
    if (p.courtingId && p.courtingId !== c.id && !opts.courtship) return false;
    if (attention[c.id]) {
      attention[c.id].lastTurn = state.turn;
      FB.noteFriendContact(state, c, { cultivated:true });
      return true;
    }
    /* The shipped capacity is one: choosing a new person redirects the
       assignment immediately and costs no day. */
    for (const id in attention) delete attention[id];
    attention[c.id] = { startedTurn:state.turn, lastTurn:state.turn };
    FB.noteFriendContact(state, c, { cultivated:true });
    return true;
  };

  FB.socialAttentionWithdraw = function (state, cid, force) {
    const p = state.player;
    const attention = FB.socialAttentionEnsure(state);
    if (p.courtingId === cid && !force) return false;
    if (!attention[cid]) return false;
    delete attention[cid];
    return true;
  };

  FB.socialAttentionClear = function (state) {
    state.player.socialAttention = {};
  };

  FB.socialAttentionDailyOpinion = function () {
    const value = FBDATA.balance.socialAttentionDailyOpinion;
    return value === undefined ? 0.2 : value;
  };

  FB.socialAttentionStandingThreshold = function (state, c, courtship) {
    const courting = !!(courtship || state && state.player && c &&
      state.player.courtingId === c.id);
    return courting
      ? FB.courtshipStandingThreshold(state, c)
      : FB.relationshipOpinionThreshold();
  };

  FB.socialAttentionDaysToThreshold = function (state, c, courtship) {
    const rate = FB.socialAttentionStatus(state, c).rate;
    const need = FB.socialAttentionStandingThreshold(state, c, courtship) -
      characterStanding(state, c);
    if (need <= 0) return 0;
    if (rate <= 0) return null;
    return Math.max(0, Math.ceil(need / rate - 0.000000001));
  };

  FB.tickSocialAttention = function (state) {
    if (FB.socialAttentionDailyOpinion() !== 0) {
      const ids = FB.socialAttentionIds(state);
      for (let i = 0; i < ids.length; i++) {
        const c = state.chars[ids[i]];
        if (!c || c.dead) continue;
        if (FB.socialAttentionPresence(state, c).status !== 'active') continue;
        const status = FB.socialAttentionStatus(state, c);
        const rate = status.ready ? status.rate : 0;
        if (!rate) continue;
        adjustCharacterStanding(state, c, rate, 'social_attention');
        state.player.socialAttention[c.id].lastTurn = state.turn;
      }
    }
    if (FB.tickSiblingCourtshipExposure) {
      FB.tickSiblingCourtshipExposure(state);
    }
  };

  /* Cash and item gifts share one per-recipient, current-life clock. Authored
     event and wedding gifts do not call this API. */
  FB.socialGiftTurns = function (state) {
    const p = state.player;
    if (!p.socialGiftTurns || typeof p.socialGiftTurns !== 'object' ||
      Array.isArray(p.socialGiftTurns)) p.socialGiftTurns = {};
    for (const id in p.socialGiftTurns) {
      const c = state.chars[id];
      if (!c || c.dead || id === p.charId) delete p.socialGiftTurns[id];
    }
    return p.socialGiftTurns;
  };

  FB.socialGiftCooldownDays = function () {
    const value = FBDATA.balance.socialGiftCooldownDays;
    return value === undefined ? 90 : Math.max(0, value);
  };

  FB.socialGiftDaysRemaining = function (state, cid) {
    const turns = FB.socialGiftTurns(state);
    if (turns[cid] === undefined) return 0;
    return Math.max(0, FB.socialGiftCooldownDays() - (state.turn - turns[cid]));
  };

  FB.socialGiftDaysRemainingSnapshot = function (state, cid) {
    const turns = state && state.player && state.player.socialGiftTurns;
    const turn = turns && typeof turns === 'object' &&
      !Array.isArray(turns) ? turns[cid] : undefined;
    if (!isFinite(turn)) return 0;
    return Math.max(0, FB.socialGiftCooldownDays() - (state.turn - turn));
  };

  FB.socialGiftReady = function (state, cid) {
    return FB.socialGiftDaysRemaining(state, cid) <= 0;
  };

  FB.noteSocialGift = function (state, cid) {
    FB.socialGiftTurns(state)[cid] = state.turn;
  };

  /* Lightweight rulers need a recipient identity beyond the realm id: a
     successor is a new person and may receive a gift immediately. */
  FB.realmGiftTurns = function (state) {
    const p = state.player;
    if (!p.realmGiftTurns || typeof p.realmGiftTurns !== 'object' ||
      Array.isArray(p.realmGiftTurns)) p.realmGiftTurns = {};
    for (const rid in p.realmGiftTurns) {
      const r = state.realms && state.realms[rid];
      const entry = p.realmGiftTurns[rid];
      const generation = r && r.ruler &&
        (r.ruler.generation === undefined ? 1 : r.ruler.generation);
      if (!r || !r.alive || !r.ruler || rid === 'player' || !entry ||
        typeof entry !== 'object' || !isFinite(entry.turn) ||
        entry.generation !== generation) delete p.realmGiftTurns[rid];
    }
    return p.realmGiftTurns;
  };

  FB.rulerGiftDaysRemaining = function (state, rid) {
    const turns = FB.realmGiftTurns(state);
    const entry = turns[rid];
    if (!entry) return 0;
    return Math.max(0, FB.socialGiftCooldownDays() - (state.turn - entry.turn));
  };

  FB.rulerGiftDaysRemainingSnapshot = function (state, rid) {
    const turns = state && state.player && state.player.realmGiftTurns;
    const entry = turns && typeof turns === 'object' &&
      !Array.isArray(turns) ? turns[rid] : null;
    const realm = state && state.realms && state.realms[rid];
    const generation = realm && realm.ruler &&
      (realm.ruler.generation === undefined ? 1 : realm.ruler.generation);
    if (!realm || !realm.alive || !realm.ruler || rid === 'player' ||
        !entry || typeof entry !== 'object' || !isFinite(entry.turn) ||
        entry.generation !== generation) return 0;
    return Math.max(0,
      FB.socialGiftCooldownDays() - (state.turn - entry.turn));
  };

  FB.rulerGiftReady = function (state, rid) {
    return FB.rulerGiftDaysRemaining(state, rid) <= 0;
  };

  FB.characterGiftStatus = function (state, cid) {
    const c = state.chars && state.chars[cid];
    const access = FB.rankAccessStatus(state, {
      kind:'character', id:cid
    });
    const cost = FB.rankAccessCashCost(state,
      { kind:'character', id:cid }, 5);
    const baseBoost = FBDATA.balance.socialCashGiftOpinion === undefined
      ? 4 : FBDATA.balance.socialCashGiftOpinion;
    const boost = FB.rankAccessStandingEffect(state,
      { kind:'character', id:cid }, baseBoost);
    const days = c ? FB.socialGiftDaysRemainingSnapshot(state, cid) : 0;
    const delivery = c && FB.giftDeliveryPreview
      ? FB.giftDeliveryPreview(state, 'character', cid, {
        readOnly:true
      }) : null;
    const pending = delivery && delivery.pending;
    const status = {
      ready:false,
      characterId:cid,
      cost:cost,
      standing:boost,
      cooldownDays:FB.socialGiftCooldownDays(),
      daysRemaining:days,
      delivery:delivery,
      access:access,
      reason:''
    };
    if (!c || c.dead || c.id === state.player.charId) {
      status.reason = FB.T('That person cannot receive a gift.');
    } else if (!access.ready) {
      status.reason = access.reason;
    } else if (pending) {
      status.reason = FB.T(
        'A gift courier is already traveling for this recipient.');
    } else if (days) {
      status.reason = FB.T('Ready in {days} days.', { days:days });
    } else if (delivery && delivery.foreign && !delivery.eligible) {
      status.reason = delivery.reason;
    } else if ((Number(state.player.gold) || 0) < cost) {
      status.reason = FB.T(
        'Requires {money:cost}; you have {money:current}.', {
          cost:cost,
          current:Math.floor(state.player.gold)
        });
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.noteRulerGift = function (state, rid) {
    const r = state.realms && state.realms[rid];
    if (!r || !r.ruler || rid === 'player') return false;
    FB.realmGiftTurns(state)[rid] = {
      turn:state.turn,
      generation:r.ruler.generation === undefined ? 1 : r.ruler.generation
    };
    return true;
  };

  FB.giveSocialCashGift = function (state, cid) {
    const p = state.player;
    const c = state.chars[cid];
    const rulerId = c && FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, c);
    if (rulerId && FB.giveRulerCashGift) {
      return FB.giveRulerCashGift(state, rulerId);
    }
    const status = FB.characterGiftStatus(state, cid);
    const cost = status.cost;
    if (!c || !status.ready) return false;
    const boost = status.standing;
    const delivery = FB.giftDeliveryPreview &&
      FB.giftDeliveryPreview(state, 'character', cid);
    if (delivery && delivery.foreign) {
      return FB.dispatchGiftDelivery(state, {
        recipientKind:'character',
        recipientId:cid,
        giftKind:'cash',
        amount:cost,
        effect:boost
      });
    }
    p.gold -= cost;
    const standing = adjustCharacterStanding(state, c, boost, 'gift:cash');
    FB.noteSocialGift(state, cid);
    FB.news(state, FB.msg('news.social.gift',
      'Your gift pleases {name}. (Standing {regard})',
      { name:c.name, regard:Math.round(standing) }));
    return true;
  };

  FB.friendCandidate = function (state, anyWarmContact) {
    const threshold = anyWarmContact ? 0 :
      FB.relationshipOpinionThreshold();
    const contacts = FB.friendContacts(state);
    const out = [];
    for (const id in contacts) {
      const c = state.chars[id];
      if (friendEligible(state, c) &&
          characterStanding(state, c) >= threshold) out.push(c);
    }
    out.sort(function (a, b) {
      const ad = contacts[a.id], bd = contacts[b.id];
      return characterStanding(state, b) - characterStanding(state, a) ||
        (bd.lastTurn || 0) - (ad.lastTurn || 0) ||
        String(a.id).localeCompare(String(b.id));
    });
    return out[0] || null;
  };

  FB.canNameFriend = function (state, c) {
    return FB.friendshipStatus(state, c).ready;
  };

  FB.friendshipStatus = function (state, c) {
    const threshold = FB.relationshipOpinionThreshold();
    const contacts = state.player.friendContacts;
    const known = !!(contacts && typeof contacts === 'object' &&
      !Array.isArray(contacts) && c && contacts[c.id]);
    const standing = c ? characterStanding(state, c) : 0;
    const currentId = state.roles.friend || null;
    const status = {
      relevant:friendEligible(state, c),
      ready:false,
      characterId:c && c.id || null,
      currentId:currentId,
      known:known,
      standing:standing,
      threshold:threshold,
      reason:''
    };
    if (!status.relevant) {
      status.reason = FB.T('This relationship cannot become a formal friendship.');
    } else if (currentId === c.id) {
      status.reason = FB.T('This person is already your named friend.');
    } else if (!known) {
      status.reason = FB.T(
        'Cultivate this relationship, then reach +{threshold} Standing.', {
          threshold:threshold
        });
    } else if (standing < threshold) {
      status.reason = FB.T(
        'Requires +{threshold} Standing; currently {standing}.', {
          threshold:threshold,
          standing:Math.round(standing * 10) / 10
        });
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.nameFriend = function (state, c) {
    if (!FB.canNameFriend(state, c)) return false;
    const formerId = state.roles.friend;
    if (formerId && formerId !== c.id) delete state.player.flags.sworn_friend;
    state.roles.friend = c.id;
    FB.socialAttentionWithdraw(state, c.id, true);
    FB.news(state, FB.msg('news.social.friend_named',
      '🤝 You and {name} now call one another friend.', { name:c.name }));
    return true;
  };

  FB.clearFriendship = function (state, clearContacts) {
    delete state.roles.friend;
    delete state.player.flags.sworn_friend;
    if (clearContacts) state.player.friendContacts = {};
  };

  FB.friendConnections = function (state) {
    const contacts = FB.friendContacts(state);
    const out = [];
    for (const id in contacts) {
      const c = state.chars[id];
      if (friendEligible(state, c)) out.push(c);
    }
    out.sort(function (a, b) {
      return characterStanding(state, b) - characterStanding(state, a);
    });
    return out;
  };

  FB.attentionFriendCandidate = function (state) {
    const known = FB.socialAttentionTarget(state);
    if (!known || !friendEligible(state, known) ||
      characterStanding(state, known) < FB.relationshipOpinionThreshold()) return null;
    return known;
  };

  FB.formalizeAttentionFriend = function (state) {
    const current = state.roles.friend && state.chars[state.roles.friend];
    if (current && !current.dead) return current;
    if (state.roles.friend) delete state.player.flags.sworn_friend;
    const known = FB.attentionFriendCandidate(state);
    if (!known) return null;
    state.roles.friend = known.id;
    FB.socialAttentionWithdraw(state, known.id, true);
    return known;
  };

  FB.getRole = function (state, role, create) {
    if (role === 'spouse') {
      return FB.spouseOf(state, state.chars[state.player.charId]);
    }
    if (role === 'suitor') {
      return state.player.courtingId ? state.chars[state.player.courtingId] : null;
    }
    const id = state.roles[role];
    if (id && state.chars[id] && !state.chars[id].dead) {
      /* Old saves could turn this authoritative story role into a retainer.
         The role index is canonical, so restore its character metadata as it
         is resolved even if the obsolete contract has already been removed. */
      if (role === 'lord' && state.chars[id].role !== 'lord') {
        state.chars[id].role = 'lord';
      }
      if (role === 'lord' && create) {
        const stewardId = state.roles.steward;
        if (!stewardId || !state.chars[stewardId] ||
            state.chars[stewardId].dead) {
          FB.getRole(state, 'steward', true);
        }
      }
      return state.chars[id];
    }
    if (!create) return null;
    if (role === 'friend') {
      if (id) delete state.player.flags.sworn_friend;
      /* Lazy story resolution may see only the exact person currently
         receiving attention at the shared threshold, never a stranger. */
      return FB.attentionFriendCandidate(state);
    }
    if (['lord','steward','priest','rival','notable'].indexOf(role) < 0) {
      return null;
    }
    const authorityBefore = role === 'lord' && FB.serfHomeAuthority
      ? FB.serfHomeAuthority(state) : null;
    const pr = FB.world.byId[state.player.provinceId];
    const me = state.chars[state.player.charId];
    let opts = { culture: pr.culture, religion: pr.religion, born: state.date.year - FB.ri(25, 55), role: role };
    if (role === 'lord') { opts.quality = 4; opts.sex = 'm'; opts.dyn = 'of ' + pr.name; opts.station = 3; }
    else if (role === 'steward') { opts.quality = 3; opts.born = state.date.year - FB.ri(30, 60); opts.station = 2; }
    else if (role === 'priest') { opts.quality = 2; opts.sex = 'm'; opts.born = state.date.year - FB.ri(30, 60); opts.station = 1; }
    else if (role === 'notable') {
      opts.quality = 1;
      opts.born = state.date.year - FB.ri(25, 55);
      opts.station = state.player.tier === 0 ? 0 :
        Math.min(1, FB.playerStation(state));
    }
    else if (role === 'rival') {
      opts.born = state.date.year - FB.clamp(FB.ageOf(me, state.date.year) + FB.ri(-8, 8), 16, 70);
      opts.opinion = -25;
      opts.station = Math.min(FB.playerStation(state), 3); // friends and rivals are peers
    }
    const c = FB.makeCharacter(state, opts);
    state.roles[role] = c.id;
    if (role === 'lord' && create) FB.getRole(state, 'steward', true);
    if (role === 'lord' && FB.activeSerfTenure &&
        FB.activeSerfTenure(state) && FB.serfHomeAuthority) {
      const tenure = FB.activeSerfTenure(state);
      const authorityAfter = FB.serfHomeAuthority(state);
      if (tenure.authorityCheckpoint &&
          tenure.authorityCheckpoint.localLordId === null) {
        normalizeSerfTenure(state, tenure);
        const transition = state.player.tenureTransition;
        if (transition && transition.oldAuthority &&
            transition.newAuthority) {
          transition.oldAuthority.localLordId = c.id;
          transition.newAuthority.localLordId = c.id;
          if (transition.queued) {
            transition.revision++;
            transition.status = 'pending';
            transition.queued = false;
            removeQueuedTenureReviews(state);
          }
        }
      } else if (authorityBefore && authorityAfter &&
          FB.noteSerfHomeTransition) {
        FB.noteSerfHomeTransition(state, 'local_lord_succession',
          authorityBefore, authorityAfter);
      }
    }
    return c;
  };

  /* Event participants are exact, saved character ids. Candidate scans are
     pure; only this resolver may materialize the one bounded local fallback. */
  const EVENT_PARTICIPANT_SOURCES = {
    role:1, local_neighbor:1, local_witness:1,
    flight_contact:1, story:1, context:1
  };
  const EVENT_PARTICIPANT_ROLES = {
    lord:1, steward:1, priest:1, friend:1, rival:1, notable:1
  };
  const EVENT_PARTICIPANT_CREATE_ROLES = {
    lord:1, steward:1, priest:1, notable:1
  };
  const EVENT_PARTICIPANT_FIELDS = {
    slot:1, source:1, role:1, storyId:1, storySlot:1,
    required:1, create:1, createFallback:1, authorityRole:1,
    sameHome:1, allowDead:1, kindParam:1
  };
  const EVENT_PARTICIPANT_IDENTIFIER = /^[a-z][A-Za-z0-9_]*$/;

  function participantDefinitionError(ev) {
    if (!ev) return '';
    if (ev.participants === undefined) {
      let usesParticipants = ev.participantCards !== undefined ||
        !!(ev.trigger && (ev.trigger.participantStandingAbove ||
          ev.trigger.participantStandingBelow || ev.trigger.participantKind));
      for (let optionIndex = 0; !usesParticipants &&
           optionIndex < (ev.options || []).length; optionIndex++) {
        const option = ev.options[optionIndex] || {};
        const records = [option.require, option.effects,
          option.success && option.success.effects,
          option.failure && option.failure.effects];
        for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
          const record = records[recordIndex];
          if (record && (record.participantStandingAbove ||
              record.participantStandingBelow || record.participantKind ||
              record.standingCharacter ||
              (record.rivalContact && record.rivalContact.participant))) {
            usesParticipants = true;
          }
        }
      }
      return usesParticipants
        ? 'participant features require a participants declaration.' : '';
    }
    if (!Array.isArray(ev.participants) || ev.participants.length > 4) {
      return 'participants must be an array of at most four slots.';
    }
    const seen = {};
    const requiredSlots = {};
    for (let i = 0; i < ev.participants.length; i++) {
      const spec = ev.participants[i];
      if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
        return 'participants[' + i + '] must be an object.';
      }
      for (const key in spec) {
        if (!EVENT_PARTICIPANT_FIELDS[key]) {
          return 'participants[' + i + '] contains unknown field ' + key + '.';
        }
      }
      if (typeof spec.slot !== 'string' ||
          !EVENT_PARTICIPANT_IDENTIFIER.test(spec.slot) || seen[spec.slot]) {
        return 'participant slots must be unique ASCII identifiers starting ' +
          'with a lowercase letter.';
      }
      seen[spec.slot] = 1;
      if (spec.required) requiredSlots[spec.slot] = 1;
      if (!EVENT_PARTICIPANT_SOURCES[spec.source]) {
        return 'participant ' + spec.slot + ' has an unknown source.';
      }
      for (const booleanField of ['required','create','createFallback',
          'sameHome','allowDead']) {
        if (spec[booleanField] !== undefined &&
            typeof spec[booleanField] !== 'boolean') {
          return 'participant ' + spec.slot + ' has a non-boolean ' +
            booleanField + '.';
        }
      }
      if (spec.source === 'role') {
        if (!EVENT_PARTICIPANT_ROLES[spec.role]) {
          return 'participant ' + spec.slot + ' has an unsupported role.';
        }
      } else if (spec.role !== undefined) {
        return 'participant ' + spec.slot + ' may not declare role.';
      }
      if (spec.create && (spec.source !== 'role' ||
          !EVENT_PARTICIPANT_CREATE_ROLES[spec.role])) {
        return 'participant ' + spec.slot + ' may not create that role.';
      }
      if (spec.createFallback && spec.source !== 'local_neighbor' &&
          spec.source !== 'local_witness') {
        return 'participant ' + spec.slot + ' may not create a fallback.';
      }
      if (spec.createFallback && !spec.required) {
        return 'participant ' + spec.slot +
          ' may create a fallback only when required.';
      }
      if (spec.source === 'story' && (typeof spec.storyId !== 'string' ||
          !/^[a-z][a-z0-9_]*$/.test(spec.storyId))) {
        return 'participant ' + spec.slot + ' requires a storyId.';
      }
      if (spec.source !== 'story' &&
          (spec.storyId !== undefined || spec.storySlot !== undefined)) {
        return 'participant ' + spec.slot +
          ' may declare story fields only for a story source.';
      }
      if (spec.storySlot !== undefined && (spec.source !== 'story' ||
          typeof spec.storySlot !== 'string' ||
          !EVENT_PARTICIPANT_IDENTIFIER.test(spec.storySlot))) {
        return 'participant ' + spec.slot + ' has an invalid storySlot.';
      }
      if (spec.authorityRole !== undefined &&
          !EVENT_PARTICIPANT_ROLES[spec.authorityRole]) {
        return 'participant ' + spec.slot + ' has an invalid authorityRole.';
      }
      if (spec.allowDead && spec.source !== 'context') {
        return 'allowDead is valid only for context participants.';
      }
      if (spec.kindParam !== undefined && (typeof spec.kindParam !== 'string' ||
          !EVENT_PARTICIPANT_IDENTIFIER.test(spec.kindParam))) {
        return 'participant ' + spec.slot + ' has an invalid kindParam.';
      }
    }
    if (ev.participantCards !== undefined) {
      if (!Array.isArray(ev.participantCards) || ev.participantCards.length > 4) {
        return 'participantCards must contain at most four slots.';
      }
      for (let c = 0; c < ev.participantCards.length; c++) {
        if (typeof ev.participantCards[c] !== 'string' ||
            !seen[ev.participantCards[c]]) {
          return 'participantCards must reference declared participant slots.';
        }
        if (ev.participantCards.indexOf(ev.participantCards[c]) !== c) {
          return 'participantCards may not repeat a participant slot.';
        }
      }
    }
    if (ev.trigger && (ev.trigger.participantStandingAbove ||
        ev.trigger.participantStandingBelow || ev.trigger.participantKind)) {
      return 'random event triggers may not depend on bound participants.';
    }
    function requirementError(requirement) {
      if (!requirement) return '';
      for (const field of ['participantStandingAbove','participantStandingBelow']) {
        const value = requirement[field];
        if (value && (!seen[value.participant] ||
            typeof value.value !== 'number' || !isFinite(value.value))) {
          return field + ' must name a participant and finite value.';
        }
      }
      const kind = requirement.participantKind;
      if (kind && (!seen[kind.participant] || !Array.isArray(kind.values) ||
          !kind.values.length)) {
        return 'participantKind must name a participant and non-empty values.';
      }
      if (kind) {
        const allowedKinds = {
          lord:1, steward:1, priest:1, friend:1, rival:1,
          notable:1, kin:1, contact:1
        };
        for (let valueIndex = 0; valueIndex < kind.values.length; valueIndex++) {
          if (!allowedKinds[kind.values[valueIndex]]) {
            return 'participantKind contains an unknown participant kind.';
          }
        }
      }
      return '';
    }
    function effectsError(effects) {
      if (!effects) return '';
      const standing = effects.standingCharacter;
      const standingList = Array.isArray(standing) ? standing : [standing];
      if (standingList.length > 4) {
        return 'standingCharacter supports at most four exact changes.';
      }
      const exactStandingSlots = {};
      for (let s = 0; s < standingList.length; s++) {
        const exact = standingList[s];
        if (exact && (!seen[exact.participant] ||
            !requiredSlots[exact.participant] ||
            typeof exact.amt !== 'number' || !isFinite(exact.amt) ||
            !exact.amt || exactStandingSlots[exact.participant])) {
          return 'standingCharacter must name a participant and non-zero finite amt.';
        }
        if (exact) exactStandingSlots[exact.participant] = 1;
      }
      const rival = effects.rivalContact;
      if (rival && rival.participant !== undefined &&
          (!seen[rival.participant] || !requiredSlots[rival.participant] ||
            rival.role !== undefined)) {
        return 'rivalContact participant must name one exact participant.';
      }
      return '';
    }
    for (let o = 0; o < (ev.options || []).length; o++) {
      const option = ev.options[o] || {};
      const reqError = requirementError(option.require);
      if (reqError) return 'options[' + o + '].require ' + reqError;
      for (const branch of [option.effects,
          option.success && option.success.effects,
          option.failure && option.failure.effects]) {
        const effectError = effectsError(branch);
        if (effectError) return 'options[' + o + '] ' + effectError;
      }
    }
    return '';
  }

  FB.validateEventParticipants = function (ev) {
    const error = participantDefinitionError(ev);
    if (error) throw new Error(error);
    return true;
  };

  function educationStudentEffectError(value, traits) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return 'student must be an object.';
    }
    const allowed = { skills:1, addTrait:1 };
    let count = 0;
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      if (!allowed[key]) return 'student contains unknown field ' + key + '.';
      count++;
    }
    if (!count) return 'student must contain skills or addTrait.';
    if (value.skills !== undefined) {
      if (!value.skills || typeof value.skills !== 'object' ||
          Array.isArray(value.skills)) return 'student.skills must be an object.';
      let skillCount = 0;
      for (const skill in value.skills) {
        if (!Object.prototype.hasOwnProperty.call(value.skills, skill)) continue;
        if (FB.SKILLS.indexOf(skill) < 0) {
          return 'student.skills contains unknown skill ' + skill + '.';
        }
        const amount = value.skills[skill];
        if (typeof amount !== 'number' || !isFinite(amount) || !amount ||
            Math.floor(amount) !== amount || amount < -20 || amount > 20) {
          return 'student.skills.' + skill +
            ' must be a non-zero integer from -20 to 20.';
        }
        skillCount++;
      }
      if (!skillCount) return 'student.skills must not be empty.';
    }
    if (value.addTrait !== undefined &&
        (typeof value.addTrait !== 'string' || !traits ||
          !Object.prototype.hasOwnProperty.call(traits, value.addTrait))) {
      return 'student.addTrait references an unknown trait.';
    }
    return '';
  }

  FB.validateEducationEvent = function (ev, traits) {
    if (!ev) return true;
    if (ev.educationStory !== undefined && ev.educationStory !== true) {
      throw new Error('educationStory must be true when present.');
    }
    if (ev.educationFocuses !== undefined) {
      if (ev.educationStory !== true) {
        throw new Error('educationFocuses requires educationStory:true.');
      }
      if (!Array.isArray(ev.educationFocuses) || !ev.educationFocuses.length) {
        throw new Error('educationFocuses must be a non-empty array.');
      }
      const seen = {};
      for (let i = 0; i < ev.educationFocuses.length; i++) {
        const focus = ev.educationFocuses[i];
        if (FB.SKILLS.indexOf(focus) < 0 || seen[focus]) {
          throw new Error('educationFocuses must contain unique recognized skills.');
        }
        seen[focus] = 1;
      }
    }
    for (let i = 0; i < (ev.options || []).length; i++) {
      const option = ev.options[i] || {};
      const branches = [option.effects,
        option.success && option.success.effects,
        option.failure && option.failure.effects];
      for (let j = 0; j < branches.length; j++) {
        const effects = branches[j];
        if (!effects || effects.student === undefined) continue;
        const error = educationStudentEffectError(
          effects.student, traits || FBDATA.traits);
        if (error) throw new Error('options[' + i + '] ' + error);
      }
    }
    return true;
  };

  function participantHome(state, ctx) {
    const tenure = FB.activeSerfTenure && FB.activeSerfTenure(state);
    return tenure ? tenure.provinceId :
      (ctx && ctx.locationId || state.player.provinceId);
  }

  function participantResident(state, c, homeId) {
    return !!(c && FB.characterResidence &&
      FB.characterResidence(state, c) === homeId);
  }

  function participantSelectorEligible(state, c, source, homeId) {
    if (!c || c.dead || c.id === state.player.charId ||
        FB.ageOf(c, state.date.year) < 16 ||
        !participantResident(state, c, homeId)) return false;
    const roles = state.roles || {};
    if (roles.lord === c.id || roles.steward === c.id ||
        roles.priest === c.id) return false;
    if (source === 'local_neighbor' && FB.kinOf &&
        FB.kinOf(state).byId[c.id]) return false;
    if (source === 'local_witness' && FB.kinOf && FB.kinOf(state).byId[c.id] &&
        (!FB.manageableKinKind || !FB.manageableKinKind(state, c.id))) {
      return false;
    }
    return true;
  }

  function pushParticipantCandidate(out, seen, state, c, source, homeId) {
    if (!participantSelectorEligible(state, c, source, homeId) || seen[c.id]) return;
    seen[c.id] = 1;
    out.push(c);
  }

  function existingParticipantRole(state, role) {
    const id = state && state.roles && state.roles[role];
    const c = id && state.chars && state.chars[id];
    return c && !c.dead ? c : null;
  }

  FB.eventParticipantCandidates = function (state, spec, ctx) {
    const out = [], seen = {};
    if (!state || !state.player || !spec) return out;
    ctx = ctx || {};
    const source = spec.source;
    if (source === 'role') {
      const c = existingParticipantRole(state, spec.role);
      return c ? [c] : [];
    }
    if (source === 'story') {
      const story = state.player.serfStory;
      const storySlot = spec.storySlot || spec.slot;
      const id = story && story.id === spec.storyId && story.participants &&
        story.participants[storySlot];
      const c = id && state.chars[id];
      return c ? [c] : [];
    }
    if (source === 'context') {
      const exactId = ctx.participants && ctx.participants[spec.slot];
      const exact = exactId && state.chars[exactId];
      return exact ? [exact] : [];
    }
    if (source === 'flight_contact') {
      const friend = existingParticipantRole(state, 'friend');
      if (friend && participantResident(state, friend, participantHome(state, ctx))) {
        return [friend];
      }
      const rival = existingParticipantRole(state, 'rival');
      if (rival && participantResident(state, rival, participantHome(state, ctx))) {
        return [rival];
      }
      return [];
    }
    const homeId = participantHome(state, ctx);
    const exactId = ctx.participants && ctx.participants[spec.slot];
    if (exactId) {
      pushParticipantCandidate(out, seen, state, state.chars[exactId], source, homeId);
    }
    pushParticipantCandidate(out, seen, state,
      existingParticipantRole(state, 'friend'), source, homeId);
    pushParticipantCandidate(out, seen, state,
      existingParticipantRole(state, 'rival'), source, homeId);
    /* Do not call socialAttentionEnsure here: candidate enumeration is a pure
       query and must not normalize unrelated relationship state. Capacity is
       currently one, but scan the saved insertion order defensively. */
    const attention = state.player.socialAttention;
    if (attention && typeof attention === 'object' && !Array.isArray(attention)) {
      const attentionIds = Object.keys(attention);
      for (let attentionIndex = 0; attentionIndex < attentionIds.length;
           attentionIndex++) {
        pushParticipantCandidate(out, seen, state,
          state.chars[attentionIds[attentionIndex]], source, homeId);
      }
    }
    const contacts = state.player.friendContacts || {};
    const contactIds = Object.keys(contacts).sort(function (a, b) {
      const aTurn = contacts[a] && isFinite(contacts[a].startedTurn)
        ? contacts[a].startedTurn : 0;
      const bTurn = contacts[b] && isFinite(contacts[b].startedTurn)
        ? contacts[b].startedTurn : 0;
      return aTurn - bTurn || (String(a) < String(b) ? -1 :
        (String(a) > String(b) ? 1 : 0));
    });
    for (let i = 0; i < contactIds.length; i++) {
      pushParticipantCandidate(out, seen, state,
        state.chars[contactIds[i]], source, homeId);
    }
    if (source === 'local_witness' && FB.kinOf) {
      const kinGroups = FB.kinOf(state);
      const kin = [];
      for (const group of ['parents','grandparents','siblings','children',
          'stepchildren','grandchildren','niecesNephews','unclesAunts','cousins']) {
        for (let g = 0; g < (kinGroups[group] || []).length; g++) {
          kin.push(kinGroups[group][g].c);
        }
      }
      kin.sort(function (a, b) {
        return String(a.id) < String(b.id) ? -1 :
          (String(a.id) > String(b.id) ? 1 : 0);
      });
      for (let k = 0; k < kin.length; k++) {
        pushParticipantCandidate(out, seen, state, kin[k], source, homeId);
      }
    }
    if ((source === 'local_neighbor' || source === 'local_witness') &&
        FB.localFolkAt) {
      const local = FB.localFolkAt(state, homeId).filter(function (c) {
        return FB.ageOf(c, state.date.year) >= 16;
      }).sort(function (a, b) {
        return String(a.id).localeCompare(String(b.id));
      });
      for (let localIndex = 0; localIndex < local.length; localIndex++) {
        pushParticipantCandidate(out, seen, state, local[localIndex],
          source, homeId);
      }
    }
    pushParticipantCandidate(out, seen, state,
      existingParticipantRole(state, 'notable'), source, homeId);
    return out;
  };

  function participantKindFor(state, spec, c) {
    if (!c) return null;
    if (spec.source === 'role') return spec.role;
    if (spec.source === 'flight_contact') {
      if (state.roles.friend === c.id) return 'friend';
      if (state.roles.rival === c.id) return 'rival';
    }
    if (spec.source === 'story') {
      const story = state.player.serfStory;
      const slot = spec.storySlot || spec.slot;
      return story && story.participantKinds && story.participantKinds[slot] ||
        (story && story.participants && story.participants[slot] === c.id
          ? slot : null);
    }
    if (state.roles.friend === c.id) return 'friend';
    if (state.roles.rival === c.id) return 'rival';
    if (state.roles.notable === c.id) return 'notable';
    if (FB.kinOf && FB.kinOf(state).byId[c.id]) return 'kin';
    return 'contact';
  }

  FB.resolveEventParticipant = function (state, spec, ctx) {
    const candidates = FB.eventParticipantCandidates(state, spec, ctx);
    if (candidates.length) return candidates[0];
    if (spec.source === 'role' && spec.create) {
      return FB.getRole(state, spec.role, true);
    }
    if ((spec.source === 'local_neighbor' || spec.source === 'local_witness') &&
        spec.required && spec.createFallback) {
      const notable = FB.getRole(state, 'notable', true);
      return participantSelectorEligible(state, notable, spec.source,
        participantHome(state, ctx)) ? notable : null;
    }
    return null;
  };

  FB.bindEventParticipants = function (state, ev, ctx) {
    ctx = ctx || {};
    if (!ev || !ev.participants || !ev.participants.length) return ctx;
    ctx.participants = ctx.participants && typeof ctx.participants === 'object'
      ? ctx.participants : {};
    ctx.participantKinds = ctx.participantKinds &&
      typeof ctx.participantKinds === 'object' ? ctx.participantKinds : {};
    for (let i = 0; i < ev.participants.length; i++) {
      const spec = ev.participants[i];
      if (Object.prototype.hasOwnProperty.call(ctx.participants, spec.slot)) {
        const exact = state.chars && state.chars[ctx.participants[spec.slot]];
        const exactKind = participantKindFor(state, spec, exact);
        if (!ctx.participantKinds[spec.slot] && exactKind) {
          ctx.participantKinds[spec.slot] = exactKind;
        }
        if (spec.kindParam && ctx[spec.kindParam] === undefined) {
          ctx[spec.kindParam] = ctx.participantKinds[spec.slot] || '';
        }
        continue;
      }
      const c = FB.resolveEventParticipant(state, spec, ctx);
      if (!c) {
        if (spec.required) return false;
        if (spec.kindParam) ctx[spec.kindParam] = '';
        continue;
      }
      const kind = participantKindFor(state, spec, c);
      ctx.participants[spec.slot] = c.id;
      if (kind) ctx.participantKinds[spec.slot] = kind;
      if (spec.kindParam) ctx[spec.kindParam] = kind || '';
    }
    return ctx;
  };

  FB.eventParticipant = function (state, ctx, slot) {
    const id = ctx && ctx.participants && ctx.participants[slot];
    const c = id && state && state.chars && state.chars[id];
    return c && !c.dead ? c : null;
  };

  FB.eventParticipantKind = function (ctx, slot) {
    return ctx && ctx.participantKinds && ctx.participantKinds[slot] || null;
  };

  function participantSpecValid(state, spec, ctx) {
    const id = ctx && ctx.participants && ctx.participants[spec.slot];
    if (!id) return !spec.required;
    const c = state.chars && state.chars[id];
    if (!c) return !spec.required && spec.source === 'context';
    if (c.dead && !spec.allowDead) return false;
    if (spec.authorityRole && state.roles[spec.authorityRole] !== id) return false;
    if (spec.sameHome && !participantResident(state, c,
        participantHome(state, ctx))) return false;
    if (spec.source === 'role' && state.roles[spec.role] !== id) return false;
    if (spec.source === 'story') {
      const story = state.player.serfStory;
      const storySlot = spec.storySlot || spec.slot;
      if (!story || story.id !== spec.storyId || !story.participants ||
          story.participants[storySlot] !== id) return false;
    }
    if (spec.source === 'flight_contact') {
      const kind = FB.eventParticipantKind(ctx, spec.slot);
      if ((kind !== 'friend' || state.roles.friend !== id) &&
          (kind !== 'rival' || state.roles.rival !== id)) return false;
    }
    if ((spec.source === 'local_neighbor' || spec.source === 'local_witness') &&
        !participantSelectorEligible(state, c, spec.source,
          participantHome(state, ctx))) return false;
    const savedKind = FB.eventParticipantKind(ctx, spec.slot);
    if (savedKind && (spec.source === 'role' || spec.source === 'story' ||
        spec.source === 'flight_contact') &&
        savedKind !== participantKindFor(state, spec, c)) return false;
    if (spec.kindParam && ctx[spec.kindParam] !== (savedKind || '')) return false;
    return true;
  }

  FB.eventParticipantsStillValid = function (state, ev, ctx) {
    if (!ev || !ev.participants) return true;
    if (!ctx || ctx.protagonistId !== state.player.charId) return false;
    const declared = {};
    for (let declaredIndex = 0; declaredIndex < ev.participants.length;
         declaredIndex++) declared[ev.participants[declaredIndex].slot] = 1;
    const participants = ctx && ctx.participants;
    const kinds = ctx && ctx.participantKinds;
    if (participants !== undefined && (!participants ||
        typeof participants !== 'object' || Array.isArray(participants) ||
        Object.keys(participants).length > 4)) return false;
    if (kinds !== undefined && (!kinds || typeof kinds !== 'object' ||
        Array.isArray(kinds))) return false;
    const allowedKinds = {
      lord:1, steward:1, priest:1, friend:1, rival:1,
      notable:1, kin:1, contact:1
    };
    for (const participantSlot in (participants || {})) {
      if (!declared[participantSlot] ||
          typeof participants[participantSlot] !== 'string' ||
          !participants[participantSlot]) return false;
    }
    for (const kindSlot in (kinds || {})) {
      if (!declared[kindSlot] || !participants ||
          !participants[kindSlot] || !allowedKinds[kinds[kindSlot]]) return false;
    }
    for (let i = 0; i < ev.participants.length; i++) {
      if (!participantSpecValid(state, ev.participants[i], ctx || {})) return false;
    }
    return true;
  };

  /* ---------- rivalry ----------
     `state.roles.rival` remains the canonical seat for old saves, events, and
     mods. The life-local records below remember which EXISTING characters have
     actually crossed the player, so an AI rivalry can never materialize a
     stranger merely because an event mentions {rival}. */
  function rivalBalance(key, fallback) {
    return FBDATA.balance[key] !== undefined ? FBDATA.balance[key] : fallback;
  }
  FB.rivalryState = function (state, create) {
    const p = state.player;
    const rival = FB.getRole(state, 'rival', false);
    if (!rival) {
      if (p.rivalry) p.rivalry = null;
      return null;
    }
    if (!p.rivalry && create !== false) {
      p.rivalry = {
        heat: rivalBalance('rivalHeatOldSave', 35),
        startedTurn: state.turn,
        lastMoveTurn: state.turn,
        initiator: 'legacy',
        cause: 'old_feud'
      };
    }
    return p.rivalry || null;
  };

  FB.rivalHeat = function (state) {
    const feud = FB.rivalryState(state, true);
    return feud ? feud.heat : 0;
  };

  FB.changeRivalHeat = function (state, amount) {
    const feud = FB.rivalryState(state, true);
    if (!feud) return 0;
    feud.heat = FB.clamp((feud.heat || 0) + amount, 0, 100);
    if (amount) feud.lastMoveTurn = state.turn;
    return feud.heat;
  };

  FB.noteRivalContact = function (state, c, score, cause) {
    if (!state || !c || c.dead || c.id === state.player.charId) return;
    const p = state.player;
    p.rivalContacts = p.rivalContacts || {};
    const old = p.rivalContacts[c.id] || { score: 0, lastTurn: state.turn, cause: cause || 'conflict' };
    old.score = FB.clamp((old.score || 0) + (score || 1), 1, 5);
    old.lastTurn = state.turn;
    old.cause = cause || old.cause || 'conflict';
    p.rivalContacts[c.id] = old;
    if (state.roles.rival === c.id) {
      FB.changeRivalHeat(state, (score || 1) * rivalBalance('rivalContactHeat', 8));
    }
  };

  function canBecomeRival(state, c, contact) {
    if (!c || c.dead || c.id === state.player.charId || !contact || !contact.score) return false;
    if (FB.ageOf(c, state.date.year) < 16) return false;
    if (FB.kinOf(state).byId[c.id]) return false;
    const me = state.chars[state.player.charId];
    if (FB.spousesOf(state, me).some(function (sp) { return sp.id === c.id; })) return false;
    const peace = state.player.rivalPeace || {};
    if (peace[c.id] && peace[c.id] > state.turn) return false;
    return characterStanding(state, c) <=
      rivalBalance('rivalOpinionThreshold', -40);
  }

  FB.startRivalry = function (state, c, initiator, cause, queueEvent) {
    if (!state || !c || c.dead) return false;
    const current = FB.getRole(state, 'rival', false);
    if (current && current.id !== c.id) return false;
    FB.noteRivalContact(state, c, 1, cause || 'declared');
    state.roles.rival = c.id;
    state.player.rivalry = {
      heat: initiator === 'npc'
        ? rivalBalance('rivalHeatNpcStart', 30)
        : rivalBalance('rivalHeatPlayerStart', 20),
      startedTurn: state.turn,
      lastMoveTurn: state.turn,
      initiator: initiator || 'player',
      cause: cause || 'declared'
    };
    if (queueEvent) FB.queueEvent(state, queueEvent, {});
    return true;
  };

  FB.endRivalry = function (state, cid, noPeace) {
    const p = state.player;
    const rival = FB.getRole(state, 'rival', false);
    const id = cid || (rival && rival.id);
    if (id && state.roles.rival === id) delete state.roles.rival;
    p.rivalry = null;
    p.rivalContacts = p.rivalContacts || {};
    if (id) delete p.rivalContacts[id];
    if (id && !noPeace) {
      p.rivalPeace = p.rivalPeace || {};
      p.rivalPeace[id] = state.turn + rivalBalance('rivalPeaceDays', 1440);
    }
    if (p.plot && (p.plot.id === 'ruin_rival' ||
        p.plot.id === 'rival_claimant')) {
      if (FB.fns && FB.fns.plot_end) FB.fns.plot_end(state);
      else p.plot = null;
    }
    const rivalQueues = {
      make_rival: 1, rival_mediation: 1, rival_legacy: 1,
      plot_ruin_rival: 1, plot_rival_claimant: 1, assassin_caught: 1
    };
    state.eventQueue = state.eventQueue.filter(function (ev) { return !rivalQueues[ev.id]; });
    for (const fl of ['df_claim', 'df_claim2', 'df_marked', 'df_doom']) delete p.flags[fl];
  };

  FB.tickRivalry = function (state) {
    const p = state.player;
    p.rivalContacts = p.rivalContacts || {};
    p.rivalPeace = p.rivalPeace || {};
    for (const id in p.rivalPeace) if (p.rivalPeace[id] <= state.turn) delete p.rivalPeace[id];

    const rival = FB.getRole(state, 'rival', false);
    if (rival) {
      const feud = FB.rivalryState(state, true);
      const delay = rivalBalance('rivalHeatDecayDelay', 720);
      if (state.turn - (feud.lastMoveTurn || 0) >= delay && feud.heat > 5) {
        feud.heat = Math.max(5, feud.heat - rivalBalance('rivalHeatDecay', 3));
      }
      return;
    }

    const maxAge = rivalBalance('rivalContactMaxAge', 1440);
    const candidates = [];
    for (const id in p.rivalContacts) {
      const contact = p.rivalContacts[id];
      if (!contact || state.turn - contact.lastTurn > maxAge) {
        delete p.rivalContacts[id];
        continue;
      }
      const c = state.chars[id];
      if (canBecomeRival(state, c, contact)) candidates.push({ c: c, contact: contact });
    }
    if (!candidates.length) return;
    candidates.sort(function (a, b) {
      return b.contact.score - a.contact.score ||
        characterStanding(state, a.c) - characterStanding(state, b.c) ||
        b.contact.lastTurn - a.contact.lastTurn ||
        (a.c.id < b.c.id ? -1 : 1);
    });
    const pick = candidates[0];
    let mult = 1;
    const traits = pick.c.traits || [];
    for (const t of ['wrathful', 'proud', 'cruel', 'ambitious']) if (traits.indexOf(t) >= 0) mult += 0.2;
    for (const t of ['patient', 'humble', 'kind', 'content']) if (traits.indexOf(t) >= 0) mult -= 0.15;
    const hostility = 1 +
      Math.max(0, -characterStanding(state, pick.c) - 40) / 60;
    const baseChance = rivalBalance('rivalClaimChance', 0.05);
    if (baseChance <= 0) return;
    const chance = FB.clamp(baseChance *
      pick.contact.score * hostility * Math.max(0.25, mult), 0.01, 0.45);
    if (FB.chance(chance)) {
      FB.startRivalry(state, pick.c, 'npc', pick.contact.cause, 'make_rival');
    }
  };

  /* Living spouse of a character — self-healing: a link to a dead or missing
     character is stale (older bugs could leave one) and gets cleared here.
     Under polygamy this is the FIRST wife; FB.spousesOf lists them all. */
  FB.spouseOf = function (state, c) {
    if (!c || !c.spouseId) return null;
    const sp = state.chars[c.spouseId];
    if (!sp || sp.dead) { c.spouseId = null; return null; }
    return sp;
  };

  /* All living spouses. Every wife's spouseId points at the husband; his own
     spouseId holds only the first, so the rest are found by scanning. */
  FB.spousesOf = function (state, c) {
    const out = [];
    if (!c) return out;
    const first = FB.spouseOf(state, c);
    if (first) out.push(first);
    for (const id of FB.spouseLinksTo(state, c.id)) {
      const o = state.chars[id];
      if (o && !o.dead && o.spouseId === c.id &&
          (!first || o.id !== first.id)) out.push(o);
    }
    return out;
  };

  FB.spouseSnapshot = function (state, c) {
    if (!c || !c.spouseId) return null;
    const spouse = state.chars[c.spouseId];
    return spouse && !spouse.dead ? spouse : null;
  };

  FB.spousesSnapshot = function (state, c) {
    const out = [];
    if (!c) return out;
    const first = FB.spouseSnapshot(state, c);
    if (first) out.push(first);
    for (const id of FB.spouseLinksTo(state, c.id)) {
      const other = state.chars[id];
      if (other && !other.dead && other.spouseId === c.id &&
          (!first || other.id !== first.id)) out.push(other);
    }
    return out;
  };

  FB.canWedSnapshot = function (state) {
    const player = state.chars[state.player.charId];
    if (!player) return false;
    if (FB.papacyCelibateSnapshot &&
        FB.papacyCelibateSnapshot(state, player)) return false;
    const spouses = FB.spousesSnapshot(state, player).length;
    if (spouses === 0) return true;
    const doctrine = FB.marriageDoctrine(player.religion, state);
    return spouses < doctrine.spouseLimit[player.sex === 'f' ? 'f' : 'm'];
  };

  /* May the player take a(nother) spouse? Capacity is an inherited doctrine
     for the protagonist's sex; the first spouse remains the addressed role. */
  FB.canWed = function (state) {
    const me = state.chars[state.player.charId];
    if (FB.papacyCelibate && FB.papacyCelibate(state, me)) return false;
    const n = FB.spousesOf(state, me).length;
    if (n === 0) return true;
    const doctrine = FB.marriageDoctrine(me.religion, state);
    return n < doctrine.spouseLimit[me.sex === 'f' ? 'f' : 'm'];
  };

  /* The addressed spouse has died or been set aside — promote the next link. */
  FB.promoteSpouse = function (state) {
    const me = state.chars[state.player.charId];
    if (me.spouseId && state.chars[me.spouseId] && !state.chars[me.spouseId].dead) return;
    me.spouseId = null;
    for (const id in state.chars) {
      const o = state.chars[id];
      if (!o.dead && o.spouseId === me.id) {
        me.spouseId = o.id;
        state.roles.spouse = o.id;
        if (FB.touchFamily) FB.touchFamily();
        return;
      }
    }
    delete state.roles.spouse;
    if (FB.touchFamily) FB.touchFamily();
  };

  FB.endRoyalCompact = function (state, sp) {
    const compact = state.player.royalCompact;
    if (!compact) return;
    if (sp && compact.charId && compact.charId !== sp.id) return;
    const alliance = FB.allianceOf ? FB.allianceOf(state, 'player') : null;
    if (alliance && alliance.source === 'royal_marriage' &&
        (alliance.a === compact.realmId || alliance.b === compact.realmId)) {
      FB.breakAlliance(state, 'player', compact.realmId);
    }
    state.player.royalCompact = null;
  };

  FB.royalCompactOf = function (state) {
    const compact = state.player.royalCompact;
    if (!compact) return null;
    const me = state.chars[state.player.charId];
    const sp = state.chars[compact.charId];
    if (!me || !sp || sp.dead || !((me.spouseId === sp.id) || (sp.spouseId === me.id))) {
      FB.endRoyalCompact(state);
      return null;
    }
    return compact;
  };

  /* Dissolve a marriage (divorce or annulment — the caller pays the costs
     and tells the story). Children and their claims are untouched. */
  FB.doDivorce = function (state, spId) {
    const me = state.chars[state.player.charId];
    const sp = state.chars[spId];
    if (!sp) return;
    if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(state, sp.id);
    if (FB.clearLoadout) FB.clearLoadout(state, sp.id);
    FB.endRoyalCompact(state, sp);
    if (me.spouseId === sp.id) me.spouseId = null;
    if (sp.spouseId === me.id) sp.spouseId = null;
    if (state.roles.spouse === sp.id) delete state.roles.spouse;
    if (sp.role === 'spouse') sp.role = null;
    adjustCharacterStanding(state, sp, -50, 'relationship:divorce');
    FB.noteRivalContact(state, sp, 2, 'divorce');
    FB.promoteSpouse(state);
    if (FB.invalidateSocialVisit) FB.invalidateSocialVisit(state, sp.id);
    if (FB.touchFamily) FB.touchFamily();
  };

  function siblingPairKey(a, b) {
    if (!a || !b) return null;
    return String(a.id) < String(b.id)
      ? String(a.id) + '|' + String(b.id)
      : String(b.id) + '|' + String(a.id);
  }

  FB.ensureSiblingCourtships = function (state) {
    if (!state) return {};
    if (!state.siblingCourtships ||
        typeof state.siblingCourtships !== 'object' ||
        Array.isArray(state.siblingCourtships)) state.siblingCourtships = {};
    const allowed = ['accepted','refused','cooldown','married'];
    for (const key in state.siblingCourtships) {
      const record = state.siblingCourtships[key];
      if (!record || typeof record !== 'object' ||
          !state.chars[record.initiatorId] || !state.chars[record.targetId] ||
          siblingPairKey(state.chars[record.initiatorId],
            state.chars[record.targetId]) !== key ||
          allowed.indexOf(record.status) < 0) {
        delete state.siblingCourtships[key];
        continue;
      }
      record.route = record.route === 'xwedodah' ? 'xwedodah' : 'illicit';
      record.exposed = !!record.exposed;
      const currentId = state.player && state.player.charId;
      const activeTargetId = state.player && state.player.courtingId;
      if (record.status === 'accepted' && currentId &&
          (record.initiatorId === currentId || record.targetId === currentId)) {
        const otherId = record.initiatorId === currentId
          ? record.targetId : record.initiatorId;
        if (activeTargetId !== otherId) {
          record.status = 'cooldown';
          record.cooldownUntil = state.turn + 1800;
        }
      }
      if (record.status === 'cooldown' &&
          (!isFinite(record.cooldownUntil) || record.cooldownUntil <= state.turn)) {
        delete state.siblingCourtships[key];
      }
    }
    return state.siblingCourtships;
  };

  FB.siblingCourtshipRecord = function (state, a, b) {
    const key = siblingPairKey(a, b);
    const table = state && state.siblingCourtships;
    const record = key && table && typeof table === 'object' &&
      !Array.isArray(table) ? table[key] : null;
    if (record && record.status === 'cooldown' &&
        isFinite(record.cooldownUntil) && record.cooldownUntil <= state.turn) {
      return null;
    }
    return record || null;
  };

  function siblingCourtshipRoute(state, a, b) {
    if (!a || !b || a.religion !== b.religion) return 'illicit';
    const first = FB.marriageDoctrine(a.religion, state).kinship || {};
    const second = FB.marriageDoctrine(b.religion, state).kinship || {};
    return first.siblingRite === 'xwedodah' &&
      second.siblingRite === 'xwedodah' ? 'xwedodah' : 'illicit';
  }
  FB.siblingCourtshipRoute = siblingCourtshipRoute;

  function siblingDynasticRelevance(state, a, b) {
    if (!state || !a || !b) return false;
    if (a.royalLine || b.royalLine ||
        (FB.isReigningRealmRuler &&
          (FB.isReigningRealmRuler(state, a) ||
            FB.isReigningRealmRuler(state, b)))) return true;
    if (state.player.tier < 3 || !FB.kinOf) return false;
    const children = FB.kinOf(state).children || [];
    for (let i = 0; i < children.length; i++) {
      if (!children[i].c.dead && children[i].c.dyn === a.dyn) return false;
    }
    return !!(a.dyn && b.dyn === a.dyn);
  }

  function siblingTraitScore(c, route, dynastic) {
    let score = FB.traitBonus(c, 'courtship', 'siblingInitiate');
    if (dynastic) {
      score += FB.traitBonus(c, 'courtship', 'siblingDynasticInitiate');
    }
    score += FB.traitBonus(c, 'courtship', route === 'xwedodah'
      ? 'siblingRiteInitiate' : 'siblingTabooInitiate');
    return score;
  }

  function siblingTraitBreakdown(c, keys) {
    const out = [];
    if (!c || !Array.isArray(c.traits)) return out;
    for (let i = 0; i < c.traits.length; i++) {
      const id = c.traits[i];
      const group = FBDATA.traits[id] && FBDATA.traits[id].courtship;
      if (!group) continue;
      let value = 0;
      for (let j = 0; j < keys.length; j++) {
        const number = Number(group[keys[j]]);
        if (isFinite(number)) value += number;
      }
      if (value) out.push({ id:id, value:value });
    }
    return out;
  }

  function siblingAcceptance(state, initiator, target, route, dynastic) {
    const standing = characterStanding(state, target);
    const standingBonus = FB.clamp((standing - 40) / 200, 0, 0.30);
    let trait = FB.traitBonus(target, 'courtship', 'siblingAccept');
    let receptive = trait > 0;
    if (route === 'xwedodah') {
      const rite = FB.traitBonus(target, 'courtship', 'siblingRiteAccept');
      trait += rite;
      if (rite > 0) receptive = true;
    } else {
      const illicit = FB.traitBonus(target, 'courtship', 'siblingIllicitAccept') +
        FB.traitBonus(target, 'courtship', 'siblingTabooAccept');
      trait += illicit;
      if (illicit > 0) receptive = true;
    }
    if (dynastic) {
      const ambition = FB.traitBonus(target, 'courtship',
        'siblingDynasticAccept');
      trait += ambition;
      if (ambition > 0) receptive = true;
    }
    let chance = FB.clamp(0.05 + standingBonus + trait, 0.02,
      route === 'xwedodah' ? 0.85 : 0.70);
    if (!receptive && route !== 'xwedodah') chance = Math.min(chance, 0.10);
    return {
      chance:chance,
      standingBonus:standingBonus,
      traitBonus:trait,
      receptive:receptive
    };
  }

  function siblingVowed(state, c, player) {
    if (!c) return true;
    const doctrine = FB.religionOf(c.religion, state);
    const profession = player ? state.player.profession :
      (c.career && c.career.profession);
    return (profession === 'monk' || profession === 'priest') &&
      !doctrine.clergyMarriage;
  }

  FB.siblingCourtshipStatus = function (state, target) {
    const player = state && state.player;
    const me = player && state.chars[player.charId];
    const degree = me && target
      ? FB.kinshipDegreeSnapshot(state, me, target) : 'unrelated';
    const route = siblingCourtshipRoute(state, me, target);
    const dynastic = siblingDynasticRelevance(state, me, target);
    const record = me && target
      ? FB.siblingCourtshipRecord(state, me, target) : null;
    const score = siblingTraitScore(me, route, dynastic);
    const acceptance = me && target
      ? siblingAcceptance(state, me, target, route, dynastic)
      : { chance:0, standingBonus:0, traitBonus:0, receptive:false };
    const playerKeys = ['siblingInitiate', route === 'xwedodah'
      ? 'siblingRiteInitiate' : 'siblingTabooInitiate'];
    const targetKeys = ['siblingAccept', route === 'xwedodah'
      ? 'siblingRiteAccept' : 'siblingIllicitAccept'];
    if (route !== 'xwedodah') targetKeys.push('siblingTabooAccept');
    if (dynastic) {
      playerKeys.push('siblingDynasticInitiate');
      targetKeys.push('siblingDynasticAccept');
    }
    const status = {
      relevant:degree === 'full_sibling' || degree === 'half_sibling',
      ready:false,
      code:'unavailable',
      reason:'',
      characterId:target && target.id || null,
      degree:degree,
      route:route,
      dynastic:dynastic,
      traitScore:score,
      requiredTraitScore:1,
      acceptance:acceptance,
      playerModifiers:siblingTraitBreakdown(me, playerKeys),
      targetModifiers:siblingTraitBreakdown(target, targetKeys),
      record:record
    };
    function blocked(code, reason) {
      status.code = code;
      status.reason = reason;
      return status;
    }
    if (!status.relevant) return blocked('not_sibling',
      FB.T('Only a brother or sister can receive this exceptional approach.'));
    if (!me || !target || me.dead || target.dead) return blocked('invalid',
      FB.T('That person is not available.'));
    if (record && record.status === 'married') return blocked('married',
      FB.T('This union has already been made.'));
    if (record && record.status === 'refused') return blocked('refused',
      FB.T('They have already refused this approach, and will not hear it again.'));
    if (record && record.status === 'cooldown') return blocked('cooldown',
      FB.T('You broke off this suit. It cannot be renewed for {days} days.', {
        days:Math.max(0, record.cooldownUntil - state.turn)
      }));
    if (record && record.status === 'accepted') return blocked('accepted',
      FB.T('They have already accepted the courtship.'));
    if (FB.ageOf(me, state.date.year) < 16 ||
        FB.ageOf(target, state.date.year) < 16) return blocked('minor',
      FB.T('Both siblings must be at least sixteen.'));
    if (me.sex === target.sex) return blocked('same_sex',
      FB.T('The marriage doctrine of this era does not recognize this match.'));
    if (!FB.canWedSnapshot(state)) return blocked('player_married',
      FB.T('Your current marriages leave no spouse place available.'));
    if (FB.spousesSnapshot(state, target).length) return blocked('target_married',
      FB.T('They are wed to another.'));
    if (me.betrothedId || target.betrothedId) return blocked('betrothed',
      FB.T('Neither sibling may be pledged to another.'));
    if (FB.papacyCelibateSnapshot &&
        (FB.papacyCelibateSnapshot(state, me) ||
          FB.papacyCelibateSnapshot(state, target))) return blocked('celibate',
      FB.T('A sacred office forbids this marriage.'));
    if (siblingVowed(state, me, true) || siblingVowed(state, target, false)) {
      return blocked('vocation_vow', FB.T('Religious vows forbid this marriage.'));
    }
    if (player.courtingId) return blocked('other_courtship',
      FB.T('End your current courtship before making this approach.'));
    if (!FB.socialAttentionCapacity()) return blocked('attention',
      FB.T('No personal-attention assignment is available.'));
    if (FB.socialAttentionPresence(state, target).status !== 'active') {
      return blocked('remote',
        FB.T('You must be in the same county to make so dangerous an approach.'));
    }
    const standing = characterStanding(state, target);
    if (standing < 40) return blocked('standing',
      FB.T('Requires +40 Standing; currently {standing}.', {
        standing:Math.round(standing * 10) / 10
      }));
    if (score < 1) return blocked('traits',
      FB.T('Your traits do not overcome the restraint needed to keep silent. Net score {score}; requires +1.', {
        score:score
      }));
    status.ready = true;
    status.code = 'ready';
    return status;
  };

  FB.siblingProposalStatus = function (state, target) {
    const ordinary = FB.proposalStatus(state, target);
    const me = state.chars[state.player.charId];
    const degree = FB.kinshipDegreeSnapshot(state, me, target);
    const record = FB.siblingCourtshipRecord(state, me, target);
    const route = siblingCourtshipRoute(state, me, target);
    const status = {
      ready:false,
      reason:ordinary.reason,
      characterId:target && target.id || null,
      threshold:ordinary.threshold,
      standing:ordinary.standing,
      terms:{ amount:0, subjectPays:false, playerPays:false, playerDelta:0 },
      route:route,
      gold:route === 'xwedodah' ? 25 : 0,
      piety:75,
      prestige:route === 'xwedodah' ? 0 : 25,
      commonVoice:route === 'xwedodah' ? 0 : 15,
      liegeStanding:route === 'xwedodah' ? 0 : 20
    };
    if ((degree !== 'full_sibling' && degree !== 'half_sibling') ||
        !record || record.status !== 'accepted') {
      status.reason = FB.T('This exceptional courtship has not been accepted.');
      return status;
    }
    if (!ordinary.ready) return status;
    if (state.player.piety < status.piety) {
      status.reason = FB.T('Requires {piety} piety; you have {current}.', {
        piety:status.piety, current:Math.floor(state.player.piety)
      });
    } else if (status.gold > 0 && state.player.gold < status.gold) {
      status.reason = FB.T('Requires {money:cost}; you have {money:current}.', {
        cost:status.gold, current:Math.floor(state.player.gold)
      });
    } else if (state.player.prestige < status.prestige) {
      status.reason = FB.T('Requires {prestige} prestige; you have {current}.', {
        prestige:status.prestige, current:Math.floor(state.player.prestige)
      });
    } else {
      status.ready = true;
      status.reason = '';
    }
    return status;
  };

  FB.siblingExposureChance = function (state, target) {
    const me = state.chars[state.player.charId];
    let chance = 0.12 + FB.traitBonus(me, 'courtship', 'siblingExposure') +
      FB.traitBonus(target, 'courtship', 'siblingExposure');
    const intrigue = Math.max(FB.skillOf(me, 'int'), FB.skillOf(target, 'int'));
    chance -= Math.min(0.04, intrigue / 500);
    return FB.clamp(chance, 0.04, 0.18);
  };

  FB.siblingProposalChance = function (state, target) {
    const me = state.chars[state.player.charId];
    if (!me || !target) return 0.05;
    const route = siblingCourtshipRoute(state, me, target);
    const dynastic = siblingDynasticRelevance(state, me, target);
    let traits = FB.traitBonus(target, 'courtship', 'siblingProposal');
    traits += FB.traitBonus(target, 'courtship', route === 'xwedodah'
      ? 'siblingRiteProposal' : 'siblingTabooProposal');
    if (dynastic) {
      traits += FB.traitBonus(target, 'courtship',
        'siblingDynasticProposal');
    }
    const chance = 0.15 + characterStanding(state, target) / 200 +
      state.player.prestige / 1200 + traits;
    return FB.clamp(chance, 0.05, 0.60);
  };

  FB.tickSiblingCourtshipExposure = function (state) {
    const me = state.chars[state.player.charId];
    const target = state.player.courtingId &&
      state.chars[state.player.courtingId];
    if (!me || !target || target.dead ||
        siblingCourtshipRoute(state, me, target) !== 'illicit') return false;
    const record = FB.siblingCourtshipRecord(state, me, target);
    if (!record || record.status !== 'accepted' || record.exposed) return false;
    const season = state.date.year * 4 + state.date.season;
    if (record.lastExposureSeason === season) return false;
    record.lastExposureSeason = season;
    if (!FB.chance(FB.siblingExposureChance(state, target))) return false;
    record.exposed = true;
    FB.queueEvent(state, 'sibling_courtship_exposed', {
      siblingTargetId:target.id
    });
    return true;
  };

  FB.applyCloseKinBirthRisk = function (state, baby, father, mother) {
    if (!state || !baby || !father || !mother) return null;
    let degree = FB.kinshipDegreeSnapshot(state, father, mother);
    const record = FB.siblingCourtshipRecord(state, father, mother);
    if (degree === 'unrelated' && record && record.status === 'married') {
      degree = 'full_sibling';
    }
    if (degree !== 'full_sibling' && degree !== 'half_sibling') return null;
    let risk = degree === 'full_sibling' ? 0.20 : 0.10;
    if (father.closeKinParentage) risk += 0.05;
    if (mother.closeKinParentage) risk += 0.05;
    risk = Math.min(0.35, risk);
    baby.closeKinParentage = {
      degree:degree,
      fatherId:father.id,
      motherId:mother.id,
      risk:risk,
      outcome:'none'
    };
    if (!FB.chance(risk)) return baby.closeKinParentage;
    const outcome = FB.ri(0, 2);
    if (outcome === 0) FB.addTrait(baby, 'frail');
    else if (outcome === 1) FB.addTrait(baby, 'sickly');
    else baby.health = Math.max(1, (Number(baby.health) || 7) - 1);
    baby.closeKinParentage.outcome = outcome === 0 ? 'frail' :
      (outcome === 1 ? 'sickly' : 'health');
    return baby.closeKinParentage;
  };

  /* A marriage transfer is defined from the managed house's point of view.
     The bride's house pays; caller-supplied amounts preserve negotiated
     descendant matches while protagonist courtships use the stable base. */
  FB.marriageTerms = function (state, subject, partner, amount) {
    if (subject && partner && FB.kinshipDegreeSnapshot) {
      const degree = FB.kinshipDegreeSnapshot(state, subject, partner);
      if (degree === 'full_sibling' || degree === 'half_sibling') {
        return { amount:0, subjectPays:false, playerPays:false, playerDelta:0 };
      }
    }
    const bride = subject && subject.sex === 'f' ? subject :
      (partner && partner.sex === 'f' ? partner : null);
    const value = amount === undefined
      ? Math.round((FBDATA.balance.dowryByStation[
        partner ? FB.stationOf(partner) : 0] || 0))
      : Math.max(0, Math.round(Number(amount) || 0));
    const subjectPays = !!(bride && subject && bride.id === subject.id);
    return {
      amount:bride ? value : 0,
      subjectPays:subjectPays,
      playerPays:subjectPays,
      playerDelta:subjectPays ? -value : value
    };
  };

  FB.courtshipTerms = function (state, c, persist) {
    const p = state.player;
    const me = state.chars[p.charId];
    const saved = p.courtshipTerms;
    if (saved && c && saved.suitorId === c.id) {
      return {
        amount:Math.max(0, Math.round(Number(saved.amount) || 0)),
        subjectPays:!!saved.playerPays,
        playerPays:!!saved.playerPays,
        playerDelta:saved.playerPays
          ? -Math.max(0, Math.round(Number(saved.amount) || 0))
          : Math.max(0, Math.round(Number(saved.amount) || 0))
      };
    }
    const terms = FB.marriageTerms(state, me, c);
    if (persist && c) {
      p.courtshipTerms = {
        suitorId:c.id,
        amount:terms.amount,
        playerPays:terms.playerPays
      };
    }
    return terms;
  };

  FB.ensureCourtshipTerms = function (state) {
    const p = state && state.player;
    const c = p && p.flags && p.flags.courting && p.courtingId &&
      state.chars[p.courtingId];
    if (!c) {
      if (p) p.courtshipTerms = null;
      return null;
    }
    return FB.courtshipTerms(state, c, true);
  };

  FB.clearCourtship = function (state, opts) {
    opts = opts || {};
    const p = state.player;
    const c = p.courtingId ? state.chars[p.courtingId] : null;
    const me = state.chars[p.charId];
    const siblingRecord = c && me
      ? FB.siblingCourtshipRecord(state, me, c) : null;
    if (c) FB.socialAttentionWithdraw(state, c.id, true);
    p.courtingId = null;
    p.courtshipTerms = null;
    delete p.flags.courting;
    if (c && !c.dead && opts.penalty) {
      adjustCharacterStanding(state, c, -20, 'relationship:broken_courtship');
      FB.noteRivalContact(state, c, 1, 'broken_courtship');
    }
    if (c && !c.dead && siblingRecord &&
        siblingRecord.status === 'accepted' && opts.siblingFinal !== true) {
      siblingRecord.status = 'cooldown';
      siblingRecord.cooldownUntil = state.turn + 1800;
    }
    if (c && opts.news) {
      FB.news(state, FB.msg('news.social.courtship_ended',
        '💔 The courtship of {name} is ended.', { name:c.name }));
    }
    return c;
  };

  FB.beginCourtship = function (state, c, opts) {
    opts = opts || {};
    const p = state.player;
    const player = state.chars[p.charId];
    /* Rendering uses the non-mutating compact snapshot in courtshipStatus.
       An explicit courtship action may perform the legacy stale-compact
       repair before the authoritative gate is checked. */
    FB.spousesOf(state, player);
    if (c) FB.spouseOf(state, c);
    if (FB.bishopricOf) {
      FB.bishopricOf(state, player);
      if (c) FB.bishopricOf(state, c);
    }
    if (FB.royalCompactOf) FB.royalCompactOf(state);
    if (FB.royalCloseKin && player && c) {
      FB.royalCloseKin(state, player, c);
    }
    if (!FB.canCourt(state, c, true) || !FB.socialAttentionCapacity()) return false;
    if (!opts.visitDeparture && FB.socialAttentionPresence &&
        FB.socialAttentionPresence(state, c).status !== 'active') return false;
    if (p.courtingId && p.courtingId !== c.id) {
      /* Redirecting a suit carries the same slight as a deliberate breakoff. */
      FB.clearCourtship(state, { penalty:true, news:true });
    }
    p.courtingId = c.id;
    p.flags.courting = 1;
    if (!FB.socialAttentionAssign(state, c, { courtship:true })) {
      p.courtingId = null;
      delete p.flags.courting;
      return false;
    }
    delete p.flags.match_refused;
    FB.courtshipTerms(state, c, true);
    return true;
  };

  FB.proposalStatus = function (state, c) {
    const p = state.player;
    const threshold = FB.courtshipStandingThreshold(state, c);
    const standing = c ? characterStanding(state, c) : 0;
    const status = {
      ready:false,
      characterId:c && c.id || null,
      threshold:threshold,
      standing:standing,
      terms:c ? FB.courtshipTerms(state, c, false) : null,
      reason:''
    };
    if (!c || !p.flags.courting || p.courtingId !== c.id) {
      status.reason = FB.T('Begin a courtship before making a proposal.');
      return status;
    }
    const courtship = FB.courtshipStatus(state, c, true);
    if (!courtship.ready) {
      status.reason = courtship.reason;
      return status;
    }
    if (standing < threshold) {
      status.reason = FB.T(
        'Requires +{threshold} Standing; currently {standing}.', {
          threshold:threshold,
          standing:Math.round(standing * 10) / 10
        });
      return status;
    }
    if (status.terms.playerPays &&
        state.player.gold + 0.0001 < status.terms.amount) {
      status.reason = FB.T(
        'Your house must provide {money:cost}; you have {money:current}.', {
          cost:status.terms.amount,
          current:Math.floor(state.player.gold)
        });
      return status;
    }
    status.ready = true;
    return status;
  };

  FB.canPropose = function (state) {
    const p = state.player;
    const c = p.flags.courting && p.courtingId && state.chars[p.courtingId];
    return !!(c && FB.proposalStatus(state, c).ready);
  };

  FB.marriageEndStatus = function (state, c) {
    const me = state.chars[state.player.charId];
    const spouse = c && me &&
      (c.spouseId === me.id || me.spouseId === c.id);
    const doctrine = me ? FB.marriageDoctrine(me.religion, state) : null;
    const ending = doctrine && doctrine.end || {
      kind:'annulment', gold:15, piety:20, prestige:0, cooldownDays:360
    };
    const kind = ending.kind || 'annulment';
    const cost = spouse && ending.gold === 'dowry'
      ? (FBDATA.balance.dowryByStation[FB.stationOf(c)] || 0)
      : Math.max(0, Number(ending.gold) || 0);
    const piety = Math.max(0, Number(ending.piety) || 0);
    const prestige = Math.max(0, Number(ending.prestige) || 0);
    const cooldowns = state.player.cooldowns || {};
    const last = cooldowns.annul;
    const cooldown = Math.max(0, Number(ending.cooldownDays) || 0);
    const cooldownDays = cooldown && last !== undefined
      ? Math.max(0, cooldown - (state.turn - last)) : 0;
    const status = {
      ready:false,
      characterId:c && c.id || null,
      kind:kind,
      direct:!!ending.direct,
      cost:cost,
      piety:piety,
      prestige:prestige,
      cooldown:cooldown,
      cooldownDays:cooldownDays,
      reason:''
    };
    if (!spouse) {
      status.reason = FB.T('This person is not your spouse.');
    } else if (cooldownDays) {
      status.reason = FB.T('Ready in {days} days.', {
        days:cooldownDays
      });
    } else if (cost > 0 && (Number(state.player.gold) || 0) < cost) {
      status.reason = FB.T(
        'Requires {money:cost}; you have {money:current}.', {
          cost:cost,
          current:Math.floor(state.player.gold)
        });
    } else if ((Number(state.player.piety) || 0) < piety) {
      status.reason = FB.T(
        'Requires {piety} piety; you have {current}.', {
          piety:piety,
          current:Math.floor(state.player.piety)
        });
    } else if ((Number(state.player.prestige) || 0) < prestige) {
      status.reason = FB.T(
        'Requires {prestige} prestige; you have {current}.', {
          prestige:prestige,
          current:Math.floor(state.player.prestige)
        });
    } else {
      status.ready = true;
    }
    return status;
  };

  /* The one true way to kill a character: severs marriage links and roles.
     A death also unmakes any betrothal, and a dowry settled at the pledge
     but not yet wed for returns to the player's coffers. */
  FB.killChar = function (state, c, opts) {
    if (!c || c.dead) return;
    opts = opts || {};
    const serfLordDied = !!(state && state.roles &&
      state.roles.lord === c.id && FB.activeSerfTenure &&
      FB.activeSerfTenure(state));
    const serfAuthorityBefore = serfLordDied && FB.serfHomeAuthority
      ? FB.serfHomeAuthority(state) : null;
    const familyLinks = opts.familyLinks ||
      (FB.familyLinksSnapshot ? FB.familyLinksSnapshot(state) : null);
    const reverseSpouses = familyLinks && familyLinks.spouses[c.id] || [];
    const reverseBetrotheds = familyLinks && familyLinks.betrotheds[c.id] || [];
    const reigningRealmId = FB.realmIdForRulerCharacter
      ? FB.realmIdForRulerCharacter(state, c) : null;
    const me = state.chars[state.player.charId];
    const papalClaimant = FB.isPapalClaimant && FB.isPapalClaimant(state, c);
    FB.socialAttentionWithdraw(state, c.id, true);
    if (state.roles.friend === c.id) FB.clearFriendship(state, false);
    if (FB.removeRetainer && FB.retainerRecord && FB.retainerRecord(state, c.id)) {
      FB.removeRetainer(state, c.id, 'death');
    }
    if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(state, c.id);
    if (c.id !== state.player.charId && FB.clearLoadout) FB.clearLoadout(state, c.id);
    if (me && (me.spouseId === c.id || c.spouseId === me.id)) FB.endRoyalCompact(state, c);
    if (state.roles.rival === c.id) FB.endRivalry(state, c.id, true);
    if (FB.intrigueCharacterDied) FB.intrigueCharacterDied(state, c);
    c.dead = true;
    c.died = state.date.year; // remembered on their sheet: born–died
    /* A dead character no longer reigns, and no longer belongs to any
       family walk: close the derived indexes here, in the one true death
       path, rather than waiting for a verify-on-hit to notice. */
    if (FB.dropRulerIndexEntry) FB.dropRulerIndexEntry(c.id);
    if (FB.touchFamily) FB.touchFamily();
    if (FB.invalidateSocialVisit) FB.invalidateSocialVisit(state, c.id);
    if (!papalClaimant && FB.royalCharDied) {
      FB.royalCharDied(state, c, reigningRealmId);
    }
    if (c.betrothedId && c.dowryAsk) {
      state.player.gold += c.dowryAsk;
      delete c.dowryAsk;
    }
    c.betrothedId = null;
    for (const id of reverseSpouses) {
      const o = state.chars[id];
      if (o && o.spouseId === c.id) o.spouseId = null;
    }
    for (const id of reverseBetrotheds) {
      const o = state.chars[id];
      if (o && o.betrothedId === c.id) {
        o.betrothedId = null;
        if (o.dowryAsk) { state.player.gold += o.dowryAsk; delete o.dowryAsk; }
      }
    }
    FB.discardMatches(state, c, null);
    for (const r in state.roles) {
      if (state.roles[r] === c.id) delete state.roles[r];
    }
    if (state.player.courtingId === c.id) FB.clearCourtship(state);
    if (FB.papacyCharacterDied) FB.papacyCharacterDied(state, c);
    /* Again at the end: the spouse and betrothal links above were severed
       after the first bump, and the family index reads exactly those. */
    if (FB.touchFamily) FB.touchFamily();
    if (serfLordDied && serfAuthorityBefore && FB.serfHomeAuthority &&
        FB.noteSerfHomeTransition) {
      FB.noteSerfHomeTransition(state, 'local_lord_succession',
        serfAuthorityBefore, FB.serfHomeAuthority(state));
    }
  };

  /* Can the player begin courting this character? */
  FB.canCourt = function (state, c, allowCurrent) {
    return FB.courtshipStatus(state, c, allowCurrent).ready;
  };

  /* Notable folk of a province — the local cast for the player's home,
     lazily-generated worthies elsewhere (persisted in state.provChars). */
  function lordWord(state, pr) {
    return FB.faithValue(state, pr.religion, 'words.landed').value || 'Lord';
  }

  /* Reusable explanation adapter over the authoritative FB.canCourt gate.
     Sheets and travel reviews consume this instead of reconstructing gates. */
  FB.courtshipStatus = function (state, c, allowCurrent) {
    const me = state.chars[state.player.charId];
    const status = {
      relevant:true,
      ready:false,
      characterId:c && c.id || null,
      reason:'',
      code:'unavailable'
    };
    function blocked(code, reason, relevant) {
      status.code = code;
      status.reason = reason;
      if (relevant === false) status.relevant = false;
      return status;
    }
    if (!c || c.dead || !me || c.id === me.id) {
      return blocked('invalid',
        FB.T('That person is not available for courtship.'), false);
    }
    if (FB.intrigueCaptivityOf &&
        (FB.intrigueCaptivityOf(state, me.id) ||
          FB.intrigueCaptivityOf(state, c.id))) {
      return blocked('captive',
        FB.T('A captive cannot enter or arrange a marriage.'));
    }
    if (FB.papacyCelibateSnapshot &&
        (FB.papacyCelibateSnapshot(state, me) ||
          FB.papacyCelibateSnapshot(state, c))) {
      return blocked('celibate',
        FB.T('The vows of a Bishop, Cardinal, or Pope forbid marriage.'),
        false);
    }
    const compact = state.player.royalCompact;
    const compactSpouse = compact && state.chars[compact.charId];
    const compactValid = compact && compactSpouse && !compactSpouse.dead &&
      (me.spouseId === compactSpouse.id || compactSpouse.spouseId === me.id);
    if (c.royalLine && compactValid) {
      return blocked('royal_compact',
        FB.T('Your house already has an active royal marriage compact.'));
    }
    const kinship = FB.kinshipDegreeSnapshot
      ? FB.kinshipDegreeSnapshot(state, me, c) : 'unrelated';
    const siblings = kinship === 'full_sibling' || kinship === 'half_sibling';
    const siblingRecord = siblings
      ? FB.siblingCourtshipRecord(state, me, c) : null;
    if (siblings && (!siblingRecord || siblingRecord.status !== 'accepted')) {
      return blocked('sibling_consent',
        FB.T('A sibling must first accept the exceptional approach.'), false);
    }
    if (!siblings && FB.closeMarriageKinSnapshot &&
        FB.closeMarriageKinSnapshot(state, me, c)) {
      return blocked('close_kin', FB.T('You are too close in blood.'), false);
    }
    if ((Array.isArray(c.stepParentIds) &&
        c.stepParentIds.indexOf(me.id) >= 0) ||
        (Array.isArray(me.stepParentIds) &&
          me.stepParentIds.indexOf(c.id) >= 0)) {
      return blocked('affinity',
        FB.T('Your family tie by marriage forbids this match.'), false);
    }
    const y = state.date.year;
    if (FB.ageOf(me, y) < 16) {
      return blocked('player_minor', FB.T('You are not yet of age.'));
    }
    if (FB.ageOf(c, y) < 16) {
      return blocked('target_minor', FB.T('They are not yet of age.'));
    }
    if (c.sex === me.sex) {
      return blocked('same_sex',
        FB.T('The marriage doctrine of this era does not recognize this match.'),
        false);
    }
    if (!FB.canWedSnapshot(state)) {
      return blocked('player_married',
        FB.T('Your current marriages leave no spouse place available.'));
    }
    if (FB.spouseSnapshot(state, c)) {
      return blocked('target_married', FB.T('They are wed to another.'));
    }
    if (c.betrothedId) {
      return blocked('target_betrothed',
        FB.T('They are pledged to another.'));
    }
    if (siblings && me.betrothedId) {
      return blocked('player_betrothed',
        FB.T('You are pledged to another.'));
    }
    if (siblings &&
        (siblingVowed(state, me, true) || siblingVowed(state, c, false))) {
      return blocked('vocation_vow',
        FB.T('Religious vows forbid this marriage.'));
    }
    if (state.player.profession === 'monk' &&
        !FB.religionOf(me.religion, state).clergyMarriage) {
      return blocked('vocation_vow', FB.T('Your vows forbid marriage.'));
    }
    if (!allowCurrent && state.player.courtingId === c.id) {
      return blocked('current',
        FB.T('This courtship is already active.'));
    }
    const access = FB.rankAccessStatus(state, {
      kind:'character', id:c.id
    });
    if (!access.ready) {
      return blocked('access', access.reason);
    }
    status.ready = true;
    status.code = 'ready';
    return status;
  };

  FB.provNotables = function (state, pid) {
    const pr = FB.world.byId[pid];
    if (!pr || pr.wasteland) return [];
    if (pid === state.player.provinceId) {
      FB.getRole(state, 'lord', true);
      FB.getRole(state, 'steward', true);
      FB.getRole(state, 'priest', true);
      const out = [];
      for (const r of ['lord', 'steward', 'priest', 'friend', 'rival']) {
        const c = FB.getRole(state, r, false);
        if (c && !c.dead) out.push(c);
      }
      return out;
    }
    state.provChars = state.provChars || {};
    let alive = (state.provChars[pid] || []).map(function (id) { return state.chars[id]; })
      .filter(function (c) { return c && !c.dead; });
    if (!alive.length) {
      const y = state.date.year;
      const ids = [];
      function mk(opts, epithetMsg) {
        const c = FB.makeCharacter(state, opts);
        c.epithetMsg = epithetMsg;
        ids.push(c.id);
        return c;
      }
      const lw = lordWord(state, pr);
      const lord = mk({ culture: pr.culture, religion: pr.religion, sex: 'm', born: y - FB.ri(28, 55), quality: 4, role: 'notable', station: 3 },
        FB.msg('fx.epithet.province_lord', {
          forms: {
            select: 'value', param: 'kind', cases: {
              emir: 'Emir of {province}',
              chief: 'Chief of {province}',
              custom: '{landed} of {province}',
              other: 'Lord of {province}'
            }
          }
        }, {
          kind: lw === 'Emir' ? 'emir' : (lw === 'Chief' ? 'chief' :
            (lw === 'Lord' ? 'other' : 'custom')),
          landed:FB.dataParam('religion', pr.religion, 'words.landed'),
          province: pr.name
        }));
      lord.dyn = 'of ' + pr.name;
      mk({ culture: pr.culture, religion: pr.religion, sex: 'm', born: y - FB.ri(30, 60), quality: 2, role: 'notable', station: 1 },
        FB.msg('fx.epithet.cleric', {
          forms: {
            select: 'value', param: 'faith', cases: {
              muslim: 'Imam',
              pagan: 'Godi',
              jewish: 'Rabbi',
              custom: '{cleric}',
              other: 'Priest'
            }
          }
        }, {
          faith:(function () {
            const word = String(FB.faithValue(
              state, pr.religion, 'words.cleric').value || '').toLowerCase();
            return word === 'imam' ? 'muslim' : (word === 'godi' ? 'pagan' :
              (word === 'rabbi' ? 'jewish' : (word === 'priest' ? 'other' : 'custom')));
          })(),
          cleric:FB.dataParam('religion', pr.religion, 'words.cleric')
        }));
      const mkt = (state.dev[pid] || 1) >= 5;
      mk({ culture: pr.culture, religion: pr.religion, born: y - FB.ri(38, 62), quality: 2, role: 'notable', station: mkt ? 2 : 1 },
        mkt
          ? FB.msg('fx.epithet.market_master', 'Master of the market', {})
          : FB.msg('fx.epithet.village_elder', 'Village elder', {}));
      for (let i = 0; i < 2; i++) {
        const kin = mk({ culture: pr.culture, religion: pr.religion, born: y - FB.ri(16, 26), quality: FB.ri(0, 2), role: 'notable', station: 3 }, null);
        kin.dyn = lord.dyn;
        kin.epithetMsg = FB.msg('fx.epithet.lord_child', {
          forms: {
            select: 'value', param: 'case', cases: {
              daughter_emir: 'Daughter of the emir’s house',
              son_emir: 'Son of the emir’s house',
              daughter_chief: 'Daughter of the chief’s house',
              son_chief: 'Son of the chief’s house',
              daughter_lord: 'Daughter of the lord’s house',
              son_lord: 'Son of the lord’s house',
              other: 'Child of the lord’s house'
            }
          }
        }, {
          case: (kin.sex === 'f' ? 'daughter_' : 'son_') +
            (lw === 'Emir' ? 'emir' : (lw === 'Chief' ? 'chief' : 'lord'))
        });
      }
      state.provChars[pid] = ids;
      alive = ids.map(function (id) { return state.chars[id]; });
    }
    return alive;
  };

  /* Matchmaking finds folk from the player's own walk of life. Whom the
     player pursues on their own (character sheets) is gated separately in
     FB.canCourt. */
  const SUITOR_EPITHETS = [
    { m: [
      FB.msg('fx.epithet.suitor.0.m.0', 'Plowman’s son', {}),
      FB.msg('fx.epithet.suitor.0.m.1', 'Shepherd', {}),
      FB.msg('fx.epithet.suitor.0.m.2', 'Woodcutter’s son', {}),
      FB.msg('fx.epithet.suitor.0.m.3', 'Hired hand at the manor', {})
    ], f: [
      FB.msg('fx.epithet.suitor.0.f.0', 'Plowman’s daughter', {}),
      FB.msg('fx.epithet.suitor.0.f.1', 'Goose girl', {}),
      FB.msg('fx.epithet.suitor.0.f.2', 'Woodcutter’s daughter', {}),
      FB.msg('fx.epithet.suitor.0.f.3', 'Dairymaid', {})
    ] },
    { m: [
      FB.msg('fx.epithet.suitor.1.m.0', 'Free farmer’s son', {}),
      FB.msg('fx.epithet.suitor.1.m.1', 'Miller’s son', {}),
      FB.msg('fx.epithet.suitor.1.m.2', 'Smith’s son', {}),
      FB.msg('fx.epithet.suitor.1.m.3', 'Fisherman with his own boat', {})
    ], f: [
      FB.msg('fx.epithet.suitor.1.f.0', 'Free farmer’s daughter', {}),
      FB.msg('fx.epithet.suitor.1.f.1', 'Miller’s daughter', {}),
      FB.msg('fx.epithet.suitor.1.f.2', 'Weaver', {}),
      FB.msg('fx.epithet.suitor.1.f.3', 'Alewife’s daughter', {})
    ] },
    { m: [
      FB.msg('fx.epithet.suitor.2.m.0', 'Merchant’s son', {}),
      FB.msg('fx.epithet.suitor.2.m.1', 'Guildmaster’s son', {}),
      FB.msg('fx.epithet.suitor.2.m.2', 'Steward of a manor', {}),
      FB.msg('fx.epithet.suitor.2.m.3', 'Rich yeoman’s son', {})
    ], f: [
      FB.msg('fx.epithet.suitor.2.f.0', 'Merchant’s daughter', {}),
      FB.msg('fx.epithet.suitor.2.f.1', 'Guildmaster’s daughter', {}),
      FB.msg('fx.epithet.suitor.2.f.2', 'Goldsmith’s daughter', {}),
      FB.msg('fx.epithet.suitor.2.f.3', 'Rich yeoman’s daughter', {})
    ] },
    { m: [
      FB.msg('fx.epithet.suitor.3.m.0', 'Knight’s son', {}),
      FB.msg('fx.epithet.suitor.3.m.1', 'Castellan’s son', {}),
      FB.msg('fx.epithet.suitor.3.m.2', 'Of an old noble house', {})
    ], f: [
      FB.msg('fx.epithet.suitor.3.f.0', 'Knight’s daughter', {}),
      FB.msg('fx.epithet.suitor.3.f.1', 'Castellan’s daughter', {}),
      FB.msg('fx.epithet.suitor.3.f.2', 'Of an old noble house', {})
    ] }
  ];
  /* Seeking a match sounds out three core families at once, so age never
     decides the match by itself: an established house (older, a step up —
     fatter dowry and more prestige, a harder suit, fewer childbearing years),
     a peer (same years, same station), and a young one (a step down, but more
     fertile years ahead). All three ages stay relative to the protagonist
     instead of collapsing against upper caps. From age forty, a fourth family
     offers a very young adult match aged sixteen to twenty-four. The available
     candidates persist on the player as suitorIds until one is chosen
     (FB.pickSuitor); the picker lives in ui_modals.js. */
  const SUITOR_PROFILES = [
    { dSt: 1, age: function (a) { // established: the protagonist's age to eight years older
      const low = Math.max(18, a);
      return FB.ri(low, Math.max(low, a + 8));
    } },
    { dSt: 0, age: function (a) { // peer: within five years
      const low = Math.max(16, a - 5);
      return FB.ri(low, Math.max(low, a + 5));
    } },
    { dSt: -1, age: function (a) { // young: eight to eighteen years younger
      const low = Math.max(16, a - 18);
      return FB.ri(low, Math.max(low, a - 8));
    } },
    { dSt: -1, minPlayerAge: 40, age: function () { // very young adult
      return FB.ri(16, 24);
    } }
  ];

  /* Matchmakers draw from the county where the search is made. Authored
     community pairs come first so every represented people is heard from;
     then their distinct culture and faith dimensions recombine into plausible
     mixed local identities. A paired community remains one indivisible identity
     and does not contribute either half to recombination. Single-community
     counties naturally retain their one identity. */
  FB.marriageProspectIdentities = function (state, pid) {
    const provinceId = pid || state && state.player && state.player.provinceId;
    const pr = FB.world && FB.world.byId && FB.world.byId[provinceId];
    const me = state && state.player && state.chars[state.player.charId];
    const source = pr && FB.provinceCommunities
      ? FB.provinceCommunities(pr)
      : (pr ? [{ culture:pr.culture, religion:pr.religion }] :
        (me ? [{ culture:me.culture, religion:me.religion }] : []));
    const out = [], cultures = [], religions = [], seen = {};
    function add(culture, religion, paired) {
      const key = culture + '|' + religion;
      if (!culture || !religion || seen[key]) return;
      seen[key] = 1;
      out.push({ culture:culture, religion:religion });
      if (paired) return;
      if (cultures.indexOf(culture) < 0) cultures.push(culture);
      if (religions.indexOf(religion) < 0) religions.push(religion);
    }
    for (let i = 0; i < source.length; i++) {
      add(source[i].culture, source[i].religion, source[i].paired);
    }
    for (let ci = 0; ci < cultures.length; ci++) {
      for (let ri = 0; ri < religions.length; ri++) {
        add(cultures[ci], religions[ri]);
      }
    }
    return out;
  };

  FB.spawnSuitor = function (state) {
    const me = state.chars[state.player.charId];
    let existingOrigin = null;
    if (Array.isArray(state.player.suitorIds)) {
      for (let oi = 0; oi < state.player.suitorIds.length; oi++) {
        const existing = state.chars[state.player.suitorIds[oi]];
        if (existing && existing.suitorProvinceId) {
          existingOrigin = existing.suitorProvinceId;
          break;
        }
      }
    }
    const searchPid = existingOrigin || state.player.provinceId;
    const pr = FB.world.byId[searchPid];
    const myAge = FB.ageOf(me, state.date.year);
    const ps = FB.playerStation(state);
    const y = state.date.year;
    const out = [];
    const identities = FB.marriageProspectIdentities(state, pr && pr.id);
    const authoredIdentityCount = FB.provinceCommunities
      ? FB.provinceCommunities(pr).length : 1;
    if (state.player.suitorIds) {
      for (const id of state.player.suitorIds) {
        const m = state.chars[id];
        if (m && !m.dead && !m.spouseId) out.push(m);
        // a candidate lost to death or another match thins the list: forget
        // them like any passed-over family, and sound out a replacement below
        else if (m && m.role === 'suitor' && state.player.courtingId !== id) delete state.chars[id];
      }
    }
    state.player.suitorIds = [];
    for (const m of out) {
      if (!m.career && FB.applyMarriageBackground) {
        FB.applyMarriageBackground(m, FB.stationOf(m), m.epithetMsg);
      }
      state.player.suitorIds.push(m.id);
    }
    for (let i = 0; i < SUITOR_PROFILES.length; i++) {
      const prof = SUITOR_PROFILES[i];
      if (prof.minPlayerAge !== undefined && myAge < prof.minPlayerAge) continue;
      if (out.some(function (m) { return m.suitorProfile === i; })) continue;
      const st = FB.clamp(ps + prof.dSt, 0, 3);
      let identity = identities[i];
      if (i >= authoredIdentityCount) {
        const mixed = identities.slice(authoredIdentityCount);
        const unused = mixed.filter(function (candidateIdentity) {
          return !out.some(function (candidate) {
            return candidate.culture === candidateIdentity.culture &&
              candidate.religion === candidateIdentity.religion;
          });
        });
        if (unused.length) identity = FB.pick(unused);
      }
      if (!identity) {
        identity = identities.length
          ? identities[i % identities.length]
          : { culture:pr.culture, religion:pr.religion };
      }
      const c = FB.makeCharacter(state, {
        sex: me.sex === 'm' ? 'f' : 'm',
        culture: identity.culture, religion: identity.religion,
        born: y - prof.age(myAge),
        role: 'suitor', opinion: FB.ri(-10, 25),
        station: st, quality: st + FB.ri(0, 1)
      });
      c.suitorProfile = i;
      c.suitorProvinceId = pr.id;
      c.epithetMsg = FB.pick(SUITOR_EPITHETS[st][c.sex]);
      if (FB.applyMarriageBackground) FB.applyMarriageBackground(c, st, c.epithetMsg);
      out.push(c);
      state.player.suitorIds.push(c.id);
    }
    return out;
  };

  /* A new search replaces the unchosen families. Ordinary picker rendering
     continues to call spawnSuitor, which reuses the stored pool. */
  FB.refreshSuitors = function (state) {
    if (state.player.suitorIds) {
      for (const id of state.player.suitorIds) {
        const m = state.chars[id];
        if (m && m.role === 'suitor' && state.player.courtingId !== id) {
          delete state.chars[id];
        }
      }
    }
    state.player.suitorIds = null;
    return FB.spawnSuitor(state);
  };

  /* the families not chosen are told no and forgotten */
  FB.pickSuitor = function (state, id) {
    state.player.courtingId = id;
    if (state.player.suitorIds) {
      for (const sid of state.player.suitorIds) {
        const m = state.chars[sid];
        if (m && sid !== id && m.role === 'suitor') delete state.chars[sid];
      }
    }
    state.player.suitorIds = null;
  };

  /* ---------- arranged matches for managed descendants ----------
     The head sounds out three families for a resident child or grandchild,
     stored on the descendant as matchIds so the same three wait until a
     pledge is sealed or the descendant weds elsewhere. The optional household
     assistant ranks those same families; it never creates a pledge itself. */
  function matchLimit(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return isFinite(n) ? Math.max(0, n) : null;
  }

  function matchPolicyDefaults(value) {
    value = value && typeof value === 'object' ? value : {};
    const station = Number(value.minStation);
    return {
      enabled:!!value.enabled,
      minStation:FB.clamp(isFinite(station) ? Math.floor(station) : 0, 0, 3),
      maxDowry:matchLimit(value.maxDowry),
      maxGold:matchLimit(value.maxGold),
      maxPrestige:matchLimit(value.maxPrestige)
    };
  }

  function matchPolicyKey(value) {
    const policy = matchPolicyDefaults(value);
    function keyPart(v) { return v === null ? '*' : String(v); }
    return [
      policy.enabled ? '1' : '0',
      policy.minStation,
      keyPart(policy.maxDowry),
      keyPart(policy.maxGold),
      keyPart(policy.maxPrestige)
    ].join('|');
  }

  FB.ensureMatchPolicy = function (state, scanCharacters) {
    if (!state || !state.player) return matchPolicyDefaults(null);
    state.player.matchPolicy = matchPolicyDefaults(state.player.matchPolicy);
    if (scanCharacters) {
      for (const id in state.chars) {
        const c = state.chars[id];
        if (!c) continue;
        const record = c.matchRecommendation;
        if (!record || typeof record !== 'object' ||
            typeof record.policyKey !== 'string' ||
            (record.candidateId !== null &&
              typeof record.candidateId !== 'string')) {
          delete c.matchRecommendation;
        }
      }
    }
    return state.player.matchPolicy;
  };

  function managedMatchKind(state, descendant, options) {
    const replacingId = options && options.replacingBetrothedId;
    const replacing = replacingId && state && state.chars &&
      state.chars[replacingId];
    const replacingExact = !!(replacing && !replacing.dead && descendant &&
      descendant.betrothedId === replacing.id &&
      replacing.betrothedId === descendant.id);
    if (!descendant || descendant.dead ||
        FB.ageOf(descendant, state.date.year) < 12 ||
        (FB.intrigueCaptivityOf &&
          FB.intrigueCaptivityOf(state, descendant.id)) ||
        FB.spousesOf(state, descendant).length ||
        (descendant.betrothedId && !replacingExact) ||
        (replacingId && !replacingExact) ||
        (FB.isHouseholdCharacter &&
          !FB.isHouseholdCharacter(state, descendant.id))) return null;
    return FB.playerDescendantKind(state, descendant.id);
  }

  FB.marriageProspectRefreshDays = function () {
    const days = Number(FBDATA.balance.marriageProspectRefreshDays);
    return isFinite(days) ? Math.max(0, Math.floor(days)) : 30;
  };

  FB.matchCandidateRefreshStatus = function (state, child, options) {
    const eligible = !!(state && child && managedMatchKind(state, child, options));
    const value = child && child.matchSearchTurn;
    const hasTurn = !!state && value !== undefined && value !== null &&
      isFinite(Number(value));
    const elapsed = hasTurn ? Math.max(0, state.turn - Number(value)) : 0;
    const daysRemaining = hasTurn
      ? Math.max(0, FB.marriageProspectRefreshDays() - elapsed) : 0;
    return {
      eligible:eligible,
      ready:eligible && daysRemaining === 0,
      daysRemaining:daysRemaining
    };
  };

  /* Ordinary full characters use recorded parentage. Parent/child,
     grandparent/grandchild, siblings, and aunt-or-uncle/niece-or-nephew are
     barred; cousins remain eligible, matching FB.canCourt. Compact royal
     characters layer their lightweight-tree check on top. */
  function closeMatchKin(state, a, b) {
    return !a || !b || !FB.closeMarriageKinSnapshot ||
      FB.closeMarriageKinSnapshot(state, a, b);
  }

  /* Shared authoritative terms for the picker, assistant, and final pledge.
     Policy limits are deliberately absent: they guide recommendations but
     never disable a manual choice. */
  FB.kinMatchPrestigeNeed = function (state, cand) {
    const station = cand ? FB.stationOf(cand) : 0;
    return Math.max(0, station - FB.playerStation(state)) * 20;
  };

  FB.kinMatchTerms = function (state, child, cand, options) {
    const station = cand ? FB.stationOf(cand) : 0;
    const savedAmount = cand
      ? (cand.dowryAsk !== undefined ? cand.dowryAsk : cand.dowryDue)
      : 0;
    const marriage = FB.marriageTerms(state, child, cand, savedAmount);
    const dowry = marriage.subjectPays ? marriage.amount : 0;
    const prestigeNeed = cand ? FB.kinMatchPrestigeNeed(state, cand) : 0;
    let reason = null;
    if (!managedMatchKind(state, child, options)) reason = 'descendant';
    else if (!cand || cand.dead || cand.role !== 'match') reason = 'candidate';
    else if (FB.intrigueCaptivityOf &&
        FB.intrigueCaptivityOf(state, cand.id)) reason = 'captive';
    else if (FB.ageOf(cand, state.date.year) < 12) reason = 'age';
    else if (FB.spousesOf(state, cand).length || cand.betrothedId) reason = 'pledged';
    else if (cand.sex === child.sex) reason = 'doctrine';
    else if (!FB.faithAllowsMarriage(state, child.religion, cand.religion) ||
        !FB.faithAllowsMarriage(state, cand.religion, child.religion)) reason = 'faith';
    else if (closeMatchKin(state, child, cand)) reason = 'kinship';
    else if (FB.papacyCelibate &&
        (FB.papacyCelibate(state, child) ||
          FB.papacyCelibate(state, cand))) reason = 'doctrine';
    else if (cand.royalLine) reason = 'compact';
    else if (state.player.courtingId === cand.id) reason = 'courtship';
    else if (dowry > 0 && state.player.gold + 0.0001 < dowry) reason = 'gold';
    else if (state.player.prestige + 0.0001 < prestigeNeed) reason = 'prestige';
    return {
      ok:!reason,
      reason:reason,
      station:station,
      dowry:dowry,
      goldCost:dowry,
      prestigeNeed:prestigeNeed,
      marriage:marriage
    };
  };

  function policyReason(policy, terms) {
    if (!terms.ok) return terms.reason;
    if (terms.station < policy.minStation) return 'minimum-station';
    if (policy.maxDowry !== null &&
        terms.dowry > policy.maxDowry + 0.0001) return 'maximum-dowry';
    if (policy.maxGold !== null &&
        terms.goldCost > policy.maxGold + 0.0001) return 'maximum-gold';
    if (policy.maxPrestige !== null &&
        terms.prestigeNeed > policy.maxPrestige + 0.0001) {
      return 'maximum-prestige';
    }
    return null;
  }

  FB.matchPolicyRecommendation = function (state, child, value, candidates) {
    const policy = matchPolicyDefaults(value);
    if (!policy.enabled) {
      return { child:child, candidate:null, terms:null, reason:'disabled' };
    }
    if (!managedMatchKind(state, child)) {
      return { child:child, candidate:null, terms:null, reason:'descendant' };
    }
    const evaluated = (candidates || FB.spawnMatchCandidates(state, child))
      .map(function (candidate, order) {
        const terms = FB.kinMatchTerms(state, child, candidate);
        return {
          candidate:candidate,
          terms:terms,
          reason:policyReason(policy, terms),
          order:order
        };
      });
    const choices = evaluated.filter(function (entry) { return !entry.reason; });
    choices.sort(function (a, b) {
      if (a.terms.station !== b.terms.station) {
        return b.terms.station - a.terms.station;
      }
      if (a.terms.goldCost !== b.terms.goldCost) {
        return a.terms.goldCost - b.terms.goldCost;
      }
      if (a.terms.prestigeNeed !== b.terms.prestigeNeed) {
        return a.terms.prestigeNeed - b.terms.prestigeNeed;
      }
      const aAge = Math.abs(FB.ageOf(a.candidate, state.date.year) -
        FB.ageOf(child, state.date.year));
      const bAge = Math.abs(FB.ageOf(b.candidate, state.date.year) -
        FB.ageOf(child, state.date.year));
      return aAge !== bAge ? aAge - bAge : a.order - b.order;
    });
    if (!choices.length) {
      return {
        child:child,
        candidate:null,
        terms:null,
        reason:'limits',
        rejections:evaluated
      };
    }
    return {
      child:child,
      candidate:choices[0].candidate,
      terms:choices[0].terms,
      reason:null
    };
  };

  function matchPolicyChildren(state) {
    const out = [];
    const members = FB.householdMembers ? FB.householdMembers(state) : [];
    for (const c of members) {
      if (managedMatchKind(state, c) &&
          !FB.isProtected(state, 'matchCharacter', c.id)) out.push(c);
    }
    return out;
  }

  FB.matchPolicyPreview = function (state, value) {
    const policy = matchPolicyDefaults(value);
    const out = [];
    for (const child of matchPolicyChildren(state)) {
      out.push(FB.matchPolicyRecommendation(state, child, policy));
    }
    return out;
  };

  function matchRecommendationNotice(state, entry) {
    if (entry.candidate) {
      FB.news(state, FB.msg('news.match.policy_recommendation',
        '💍 The match assistant recommends {match} for {child}. Review the match in Household Plan.',
        { match:entry.candidate.name, child:entry.child.name }));
    } else {
      FB.news(state, FB.msg('news.match.policy_no_recommendation',
        '💍 The match assistant finds no sounded-out family within your limits for {child}.',
        { child:entry.child.name }));
    }
  }

  function storeMatchRecommendation(state, entry, policy, options) {
    const child = entry.child;
    if (FB.isProtected(state, 'matchCharacter', child.id)) {
      delete child.matchRecommendation;
      return entry;
    }
    const opts = options || {};
    const key = matchPolicyKey(policy);
    const previous = child.matchRecommendation;
    const candidateId = entry.candidate ? entry.candidate.id : null;
    const changed = !previous || previous.policyKey !== key ||
      previous.candidateId !== candidateId;
    child.matchRecommendation = {
      candidateId:candidateId,
      policyKey:key
    };
    if (changed && opts.notify !== false) matchRecommendationNotice(state, entry);
    return entry;
  }

  FB.recommendDescendantMatches = function (state, options) {
    const policy = FB.ensureMatchPolicy(state);
    const opts = options || {};
    if (!policy.enabled) return [];
    for (const id in state.chars) {
      const c = state.chars[id];
      if (c && FB.isProtected(state, 'matchCharacter', id)) {
        delete c.matchRecommendation;
      }
    }
    const out = FB.matchPolicyPreview(state, policy);
    for (const entry of out) {
      storeMatchRecommendation(state, entry, policy, opts);
    }
    return out;
  };

  FB.setMatchPolicy = function (state, value) {
    state.player.matchPolicy = matchPolicyDefaults(value);
    const policy = FB.ensureMatchPolicy(state);
    if (!policy.enabled) {
      for (const id in state.chars) {
        if (state.chars[id]) delete state.chars[id].matchRecommendation;
      }
      return policy;
    }
    FB.recommendDescendantMatches(state);
    return policy;
  };

  FB.matchRecommendationOf = function (state, child) {
    const policy = FB.ensureMatchPolicy(state);
    const record = child && child.matchRecommendation;
    if (!policy.enabled || !record ||
        FB.isProtected(state, 'matchCharacter', child.id) ||
        record.policyKey !== matchPolicyKey(policy) ||
        !record.candidateId ||
        !child.matchIds ||
        child.matchIds.indexOf(record.candidateId) < 0) return null;
    const candidate = state.chars[record.candidateId];
    const terms = FB.kinMatchTerms(state, child, candidate);
    if (policyReason(policy, terms)) return null;
    return { candidate:candidate, terms:terms };
  };

  FB.spawnMatchCandidates = function (state, child, options) {
    const out = [];
    if (!managedMatchKind(state, child, options)) {
      if (child && FB.discardMatches) FB.discardMatches(state, child, null);
      return out;
    }
    const initialSearch = (!child.matchIds || !child.matchIds.length) &&
      child.matchSearchTurn === undefined;
    if (child.matchIds) {
      for (const id of child.matchIds) {
        const m = state.chars[id];
        if (m && !m.dead && !m.spouseId && !m.betrothedId) out.push(m);
        // a candidate death thins the list: forget the departed like any
        // passed-over family, and sound out a replacement below
        else if (m && m.role === 'match' && state.player.courtingId !== id) delete state.chars[id];
      }
      if (out.length >= 3) return out;
    }
    const ps = FB.playerStation(state);
    const y = state.date.year;
    const cAge = FB.ageOf(child, y);
    const steps = [-1, 0, 1];
    child.matchIds = [];
    for (const m of out) {
      if (!m.career && FB.applyMarriageBackground) {
        FB.applyMarriageBackground(m, FB.stationOf(m), m.epithetMsg);
      }
      child.matchIds.push(m.id);
    }
    for (let i = out.length; i < 3; i++) {
      const st = FB.clamp(ps + steps[i], 0, 3);
      const m = FB.makeCharacter(state, {
        sex: child.sex === 'm' ? 'f' : 'm',
        culture: child.culture, religion: child.religion,
        born: y - FB.clamp(cAge + FB.ri(-2, 5), 12, 40),
        role: 'match', station: st, quality: st + FB.ri(0, 1)
      });
      m.epithetMsg = FB.pick(SUITOR_EPITHETS[st][m.sex]);
      if (FB.applyMarriageBackground) FB.applyMarriageBackground(m, st, m.epithetMsg);
      const sum = Math.round((FBDATA.balance.dowryByStation[st] || 0) * FB.rf(0.7, 1.3));
      const marriage = FB.marriageTerms(state, child, m, sum);
      if (marriage.subjectPays) m.dowryAsk = sum; else m.dowryDue = sum;
      out.push(m);
      child.matchIds.push(m.id);
    }
    if (initialSearch) child.matchSearchTurn = state.turn;
    return out;
  };

  FB.refreshMatchCandidates = function (state, child, options) {
    const status = FB.matchCandidateRefreshStatus(state, child, options);
    if (!status.ready) return null;
    FB.discardMatches(state, child, null);
    const candidates = FB.spawnMatchCandidates(state, child, options);
    child.matchSearchTurn = state.turn;
    delete child.matchRecommendation;
    const policy = FB.ensureMatchPolicy(state);
    if (!options && policy.enabled &&
        !FB.isProtected(state, 'matchCharacter', child.id)) {
      const entry = FB.matchPolicyRecommendation(
        state, child, policy, candidates);
      storeMatchRecommendation(state, entry, policy, { notify:false });
    }
    return candidates;
  };

  /* the families not chosen are told no and forgotten */
  FB.discardMatches = function (state, child, keptId) {
    if (!child) return;
    delete child.matchRecommendation;
    if (!child.matchIds) return;
    for (const id of child.matchIds) {
      const m = state.chars[id];
      if (m && id !== keptId && m.role === 'match' && state.player.courtingId !== id) {
        delete state.chars[id];
      }
    }
    child.matchIds = null;
  };

  FB.cleanupManagedMatches = function (state) {
    for (const id in state.chars) {
      const c = state.chars[id];
      if (c && c.matchIds && !managedMatchKind(state, c)) {
        FB.discardMatches(state, c, null);
      } else if (c && c.matchRecommendation && !managedMatchKind(state, c)) {
        delete c.matchRecommendation;
      }
    }
  };

  FB.sealKinMatch = function (state, child, cand, options) {
    const replacingId = options && options.replacingBetrothedId;
    const former = replacingId && state.chars[replacingId];
    const kind = managedMatchKind(state, child, options);
    const listed = child && child.matchIds &&
      child.matchIds.indexOf(cand && cand.id) >= 0;
    const terms = FB.kinMatchTerms(state, child, cand, options);
    if (!kind || !listed || !terms.ok) return false;
    const p = state.player;
    FB.discardMatches(state, child, cand.id);
    if (former) {
      const formerName = former.name;
      const forfeited = Math.max(0, Number(former.dowryAsk) || 0);
      child.betrothedId = null;
      if (former.betrothedId === child.id) former.betrothedId = null;
      delete former.dowryAsk;
      delete former.dowryDue;
      if (former.role === 'kinspouse') former.role = null;
      if (!former.royalLine && state.player.courtingId !== former.id) {
        delete state.chars[former.id];
      }
      FB.news(state, forfeited
        ? FB.msg('news.event.kin_pledge_replaced_forfeit',
          '💔 The pledge between {child} and {former} is set aside; the paid dowry of {money:gold} is not recovered.', {
            child:child.name, former:formerName, gold:forfeited
          })
        : FB.msg('news.event.kin_pledge_replaced',
          '💔 The pledge between {child} and {former} is set aside.', {
            child:child.name, former:formerName
          }));
    }
    child.betrothedId = cand.id;
    cand.betrothedId = child.id;
    cand.role = 'kinspouse';
    FB.touchFamily();
    if (terms.marriage.subjectPays && terms.marriage.amount) {
      p.gold -= terms.marriage.amount;
      FB.news(state, FB.msg('news.event.match_dowry_paid',
        '💰 You settle a dowry of {money:gold} on the match.', {
          gold:terms.marriage.amount
        }));
    }
    FB.news(state, FB.msg('news.event.child_betrothed',
      '🤝 {child} is betrothed to {match}.', { child: child.name, match: cand.name }));
    const y = state.date.year;
    if (FB.ageOf(child, y) >= 16 && FB.ageOf(cand, y) >= 16) {
      FB.doKinWedding(state, child, cand);
    }
    return true;
  };

  /* A pledged descendant's wedding, fired from sealKinMatch or the yearly
     kin tick; settles the bride's dowry and the standing of the match. */
  FB.doKinWedding = function (state, k, sp) {
    if (!k || !sp || k.dead || sp.dead || FB.spousesOf(state, k).length ||
        FB.spousesOf(state, sp).length ||
        (FB.intrigueCaptivityOf &&
          (FB.intrigueCaptivityOf(state, k.id) ||
            FB.intrigueCaptivityOf(state, sp.id)))) return false;
    const B = FBDATA.balance, p = state.player;
    const descendantKind = FB.playerDescendantKind(state, k.id);
    /* A managed kinsman (descendant or resident unwed sibling) establishing
       another household leaves work and equipment assignments behind. The
       current head's own pledged wedding is exempt. */
    if (k.id !== p.charId && FB.unassignEnterpriseWorker) {
      FB.unassignEnterpriseWorker(state, k.id);
    }
    if (k.id !== p.charId && FB.removeFamilyOffice) {
      FB.removeFamilyOffice(state, k.id);
    }
    if (k.id !== p.charId && FB.clearLoadout) FB.clearLoadout(state, k.id);
    k.betrothedId = null; sp.betrothedId = null;
    k.spouseId = sp.id; sp.spouseId = k.id;
    sp.role = 'kinspouse';
    FB.touchFamily();
    if (k.id === state.player.charId && FB.receiveMarriageLivelihood) {
      FB.receiveMarriageLivelihood(state, sp);
    }
    if (descendantKind === 'grandchild') {
      FB.news(state, FB.msg('news.event.grandchild_wedding', {
        forms: {
          select: 'value', param: 'sex', cases: {
            f: '💒 Your granddaughter {child} weds {spouse}, as was pledged.',
            m: '💒 Your grandson {child} weds {spouse}, as was pledged.',
            other: '💒 Your grandchild {child} weds {spouse}, as was pledged.'
          }
        }
      }, { sex:k.sex, child:k.name, spouse:sp.name }));
    } else {
      FB.news(state, FB.msg('news.event.kin_wedding', {
        forms: {
          select: 'value', param: 'sex', cases: {
            f: '💒 Your daughter {child} weds {spouse}, as was pledged.',
            m: '💒 Your son {child} weds {spouse}, as was pledged.',
            other: '💒 Your child {child} weds {spouse}, as was pledged.'
          }
        }
      }, { sex:k.sex, child:k.name, spouse:sp.name }));
    }
    const marriage = FB.marriageTerms(state, k, sp,
      sp.dowryAsk !== undefined ? sp.dowryAsk : sp.dowryDue);
    if (!marriage.subjectPays && marriage.amount) {
      p.gold += marriage.amount;
      FB.news(state, FB.msg('news.event.bride_dowry',
        '💰 The bride brings a dowry of {money:gold} to the house.', {
          gold:marriage.amount
        }));
      delete sp.dowryDue;
    }
    delete sp.dowryAsk; // settled at the pledge; nothing owed back once wed
    if (sp.station != null) {
      const gap = sp.station - FB.playerStation(state);
      if (gap > 0) {
        p.prestige += Math.round(gap * B.marryUpPrestige / 2);
        FB.news(state, FB.msg('news.event.match_above',
          '👑 The match ties your house to a greater one — your name rises.', {}));
      } else if (gap < 0) {
        p.prestige = Math.max(0, p.prestige + Math.round(gap * B.marryDownPrestigeLoss / 2));
        FB.news(state, FB.msg('news.event.match_below',
          '🗣 The child of your house weds beneath it, and folk mark it.', {}));
      }
    }
    return true;
  };

  /* ---------- pure text parameter materialization ----------
     Display-time calls only read state. Role creation happens in prepareEvent,
     before rendering, and is independent of the selected locale. */
  function viewCharacter(state, viewer) {
    if (viewer && typeof viewer === 'object') return viewer;
    return state.chars[viewer] || null;
  }
  function pureRole(state, role) {
    const me = state.chars[state.player.charId];
    let id;
    if (role === 'spouse') id = me && me.spouseId;
    else if (role === 'suitor') id = state.player.courtingId;
    else id = state.roles[role];
    const c = id ? state.chars[id] : null;
    return c && !c.dead ? c : null;
  }
  function neutralParam(key) {
    return FB.messageParam(FB.message(key, {}));
  }
  function faithParam(kind, religionId) {
    const path = kind === 'holy' ? 'words.cleric' :
      (kind === 'god' ? 'words.deity' : 'words.temple');
    return FB.dataParam('religion', religionId, path);
  }
  function authorityPersonName(state, person) {
    if (!person) return '';
    const exact = (person.id && state.chars && state.chars[person.id]) ||
      (person.charId && state.chars && state.chars[person.charId]);
    if (exact) return FB.fullName(exact);
    if (person.name) return person.name + (person.dyn ? ' ' + person.dyn : '');
    return '';
  }
  function transitionAuthorityName(state, ctx, former) {
    if (!ctx) return FB.T('the local authority');
    const prefix = former ? 'old' : 'new';
    const localId = ctx[prefix + 'LocalLordId'];
    const local = localId && state.chars && state.chars[localId];
    const causes = ctx.transitionCauses || [];
    const holderChanged = causes.indexOf('county_transfer') >= 0 ||
      causes.indexOf('holder_succession') >= 0;
    const sovereignChanged = causes.indexOf('sovereign_change') >= 0;
    let realmId = null;
    let generation = null;
    if (holderChanged) {
      realmId = ctx[prefix + 'HolderRealmId'];
      generation = ctx[prefix + 'HolderGeneration'];
    } else if (sovereignChanged) {
      realmId = ctx[prefix + 'SovereignRealmId'];
      generation = ctx[prefix + 'SovereignGeneration'];
    }
    if (realmId) {
      const ruler = FB.realmRulerAtGeneration
        ? FB.realmRulerAtGeneration(state, realmId, generation) : null;
      const rulerName = authorityPersonName(state, ruler);
      if (rulerName) return rulerName;
      const realm = state.realms && state.realms[realmId];
      if (realm && realm.name) return realm.name;
    }
    if (local) return FB.fullName(local);
    const fallbackRealmId = ctx[prefix + 'HolderRealmId'];
    const fallbackRealm = fallbackRealmId && state.realms &&
      state.realms[fallbackRealmId];
    return fallbackRealm && fallbackRealm.name || FB.T('the local authority');
  }
  function transitionCauseText(cause) {
    if (cause === 'local_lord_succession') {
      return FB.T('local-lord succession');
    }
    if (cause === 'county_transfer') return FB.T('county transfer');
    if (cause === 'holder_succession') {
      return FB.T('direct-holder succession');
    }
    if (cause === 'sovereign_change') return FB.T('sovereign change');
    if (cause === 'custom_confirmed') {
      return FB.T('written custom confirmed');
    }
    if (cause === 'custom_unconfirmed') {
      return FB.T('written custom lost');
    }
    if (cause === 'war_pressure') return FB.T('wartime pressure');
    return FB.T('authority change');
  }
  function transitionAuthorityChangeText(state, ctx) {
    const former = transitionAuthorityName(state, ctx, true);
    const current = transitionAuthorityName(state, ctx, false);
    const causes = ctx && ctx.transitionCauses || [];
    const holderChanged = causes.indexOf('county_transfer') >= 0 ||
      causes.indexOf('holder_succession') >= 0;
    const sovereignChanged = causes.indexOf('sovereign_change') >= 0;
    if (holderChanged) {
      return FB.T(
        'The county’s direct authority has passed from {former} to {current}.',
        { former:former, current:current });
    }
    if (sovereignChanged) {
      return FB.T(
        'Sovereign authority above the county has changed from {former} to {current}.',
        { former:former, current:current });
    }
    if (ctx && ctx.oldLocalLordId !== ctx.newLocalLordId) {
      return FB.T(
        'The household’s local lordship has passed from {former} to {current}.',
        { former:former, current:current });
    }
    if (causes.indexOf('custom_confirmed') >= 0) {
      return FB.T('Written custom has been confirmed under {current}.', {
        current:current
      });
    }
    if (causes.indexOf('custom_unconfirmed') >= 0) {
      return FB.T('Written custom is no longer confirmed under {current}.', {
        current:current
      });
    }
    return FB.T('The household custom is reviewed under {current}.', {
      current:current
    });
  }
  FB.textParams = function (state, viewer, source, ctx, semantic) {
    /* No running game (title-screen label lookups): only caller context is
       available, and there is no state to materialize roles from. */
    if (!state) return ctx || {};
    const me = viewCharacter(state, viewer) || state.chars[state.player.charId];
    const pr = FB.world.byId[state.player.provinceId];
    const realmId = state.owner[state.player.provinceId];
    const realm = state.realms[realmId];
    const out = {};
    const textParts = [];
    const selectorParams = {};
    function scan(value, key) {
      if (typeof value === 'string') {
        if (key !== 'select' && key !== 'param' && key !== 'hash') textParts.push(value);
        return;
      }
      if (!value || typeof value !== 'object') return;
      if ((value.select === 'plural' || value.select === 'value') &&
        typeof value.param === 'string') selectorParams[value.param] = 1;
      for (const child in value) {
        if (Object.prototype.hasOwnProperty.call(value, child)) scan(value[child], child);
      }
    }
    scan(source, '');
    for (const selectorParam in selectorParams) {
      if (ctx && ctx[selectorParam] !== undefined) out[selectorParam] = ctx[selectorParam];
    }
    const text = textParts.join(' ');
    let match;
    const rx = /\{(?:(money):)?([A-Za-z_][A-Za-z0-9_]*|[-+]?(?:\d+(?:\.\d+)?|\.\d+))\}/g;
    while ((match = rx.exec(text))) {
      const k = match[2];
      if (match[1] && /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(k)) continue;
      if (ctx && ctx.participants &&
          Object.prototype.hasOwnProperty.call(ctx.participants, k)) {
        const participant = state.chars[ctx.participants[k]];
        out[k] = participant
          ? FB.fullName(participant)
          : (semantic ? neutralParam('fx.param.someone') : FB.T('someone'));
        continue;
      }
      switch (k) {
        case 'name': out[k] = me.name; break;
        case 'dyn': out[k] = me.dyn || ''; break;
        case 'title':
          out[k] = semantic ? { $title: FB.titleSnapshot(state) } : FB.titleFor(state);
          break;
        case 'newtitle':
          out[k] = ctx && ctx.titleData
            ? (semantic ? { $title:ctx.titleData } :
              FB.renderTitleSnapshot(ctx.titleData))
            : (semantic ? { $title:FB.titleSnapshot(state) } :
              FB.titleFor(state));
          break;
        case 'province':
          out[k] = pr ? pr.name :
            (semantic ? neutralParam('fx.param.this_land') : FB.T('this land'));
          break;
        case 'location': {
          const locationId = ctx && ctx.locationId;
          const location = locationId ? FB.world.byId[locationId] :
            (FB.travelLocation ? FB.travelLocation(state) : pr);
          out[k] = location ? location.name :
            (semantic ? neutralParam('fx.param.this_land') : FB.T('this land'));
          break;
        }
        case 'destination': {
          const travel = state.player.travel;
          const destinationId = (ctx && ctx.destinationId) ||
            (travel && travel.destinationId);
          const destination = destinationId ? FB.world.byId[destinationId] : null;
          out[k] = destination ? destination.name :
            (semantic ? neutralParam('fx.param.the_county') : FB.T('the county'));
          break;
        }
        case 'realm':
          out[k] = realm ? realm.name :
            (semantic ? neutralParam('fx.param.the_realm') : FB.T('the realm'));
          break;
        case 'year': out[k] = String(state.date.year); break;
        case 'settlement': {
          const settlement = ctx && ctx.settlement ? ctx.settlement : null;
          out[k] = settlement
            ? settlement
            : (semantic ? neutralParam('fx.param.the_town') : FB.T('the town'));
          break;
        }
        case 'item': {
          const offer = state.player.itemOffer;
          const ref = offer && (offer.ref || offer.id);
          const item = ref && FB.resolveItem ? FB.resolveItem(state, ref) : null;
          const def = item ? item.def : (offer && FBDATA.items[offer.id]);
          out[k] = def
            ? (semantic && FB.itemParam ? FB.itemParam(state, ref, true) :
              def.icon + ' ' + (FB.itemName
                ? FB.itemName(state, ref, viewer)
                : FB.dataText(state, viewer, 'item', offer.id, def, 'name', {})))
            : (semantic ? neutralParam('fx.param.a_curiosity') : FB.T('a curiosity'));
          break;
        }
        case 'itemprice': {
          const offer2 = state.player.itemOffer;
          out[k] = offer2 ? offer2.price : null;
          break;
        }
        case 'enemy': {
          const war = state.player.war;
          const enemy = war ? state.realms[war.enemy] : null;
          out[k] = enemy ? enemy.name :
            (semantic ? neutralParam('fx.param.the_enemy') : FB.T('the enemy'));
          break;
        }
        case 'target': {
          const war2 = state.player.war;
          const target = war2 && war2.target ? FB.world.byId[war2.target] : null;
          out[k] = target ? target.name :
            (semantic ? neutralParam('fx.param.their_lands') : FB.T('their lands'));
          break;
        }
        case 'deserterPay':
          out[k] = FB.warDeserterPayment ? FB.warDeserterPayment(state) : 0;
          break;
        case 'hostMen': {
          const host = FB.playerHost ? FB.playerHost(state) : null;
          out[k] = host ? host.men : 0;
          break;
        }
        case 'warLosses': {
          const feedback = FB.warFeedback ? FB.warFeedback(state) : null;
          out[k] = feedback ? feedback.lossTotal : 0;
          break;
        }
        case 'deserterMinPercent':
          out[k] = Math.round((FBDATA.balance.warDeserterLossMin === undefined
            ? 0.10 : FBDATA.balance.warDeserterLossMin) * 100);
          break;
        case 'deserterMaxPercent':
          out[k] = Math.round((FBDATA.balance.warDeserterLossMax === undefined
            ? 0.18 : FBDATA.balance.warDeserterLossMax) * 100);
          break;
        case 'alliedMen': {
          const alliedHost = FB.playerHost ? FB.playerHost(state) : null;
          out[k] = alliedHost && alliedHost.allied ? alliedHost.allied.men : 0;
          break;
        }
        case 'liege': {
          const liege = state.player.liege ? state.realms[state.player.liege] : null;
          out[k] = liege ? liege.name :
            (semantic ? neutralParam('fx.param.your_liege') : FB.T('your liege'));
          break;
        }
        case 'rname': {
          const namedRealmId = ctx && (ctx.realmId || ctx.rid);
          const namedRealm = namedRealmId ? state.realms[namedRealmId] : null;
          out[k] = namedRealm ? namedRealm.name :
            (semantic ? neutralParam('fx.param.the_realm') : FB.T('the realm'));
          break;
        }
        case 'rulername': {
          const ruledId = ctx && (ctx.realmId || ctx.rid);
          const ruled = ruledId ? state.realms[ruledId] : null;
          out[k] = ruled && ruled.ruler ? ruled.ruler.name :
            (semantic ? neutralParam('fx.param.the_lord') : FB.T('the lord'));
          break;
        }
        case 'cname': {
          const countyId = ctx && (ctx.provinceId || ctx.pid);
          const county = countyId ? FB.world.byId[countyId] : null;
          out[k] = county ? county.name :
            (semantic ? neutralParam('fx.param.the_county') : FB.T('the county'));
          break;
        }
        case 'formerAuthority':
          out[k] = transitionAuthorityName(state, ctx, true);
          break;
        case 'currentAuthority':
          out[k] = transitionAuthorityName(state, ctx, false);
          break;
        case 'authorityChange':
          out[k] = transitionAuthorityChangeText(state, ctx);
          break;
        case 'transitionCauses': {
          const causes = ctx && ctx.transitionCauses || [];
          const causeLabels = causes.map(function (cause) {
            return transitionCauseText(cause);
          });
          out[k] = causeLabels.length
            ? causeLabels.join(FB.T('; ')) : FB.T('authority change');
          break;
        }
        case 'god': out[k] = semantic ? faithParam('god', me.religion) : FB.godWord(me.religion); break;
        case 'holy': out[k] = semantic ? faithParam('holy', me.religion) : FB.holyWord(me.religion); break;
        case 'temple': out[k] = semantic ? faithParam('temple', me.religion) : FB.templeWord(me.religion); break;
        case 'spouse': {
          const spouse = pureRole(state, 'spouse');
          out[k] = spouse ? spouse.name :
            (semantic ? neutralParam('fx.param.your_spouse') : FB.T('your spouse'));
          break;
        }
        case 'suitor': {
          const suitor = pureRole(state, 'suitor');
          out[k] = suitor ? suitor.name + (suitor.dyn ? ' ' + suitor.dyn : '') :
            (semantic ? neutralParam('fx.param.a_stranger') : FB.T('a stranger'));
          break;
        }
        case 'childname': {
          const child = ctx && ctx.childId ? state.chars[ctx.childId] : null;
          out[k] = child ? child.name :
            (semantic ? neutralParam('fx.param.your_child') : FB.T('your child'));
          break;
        }
        case 'student': {
          const student = ctx && ctx.studentId ? state.chars[ctx.studentId] : null;
          out[k] = student ? student.name :
            (semantic ? neutralParam('fx.param.your_child') : FB.T('your child'));
          break;
        }
        case 'partner': {
          const partner = ctx && ctx.partnerId ? state.chars[ctx.partnerId] : null;
          out[k] = partner ? partner.name :
            (semantic ? neutralParam('fx.param.a_stranger') : FB.T('a stranger'));
          break;
        }
        case 'ambition': {
          out[k] = ctx && ctx.studentId && FB.familyAmbitionLabel
            ? FB.familyAmbitionLabel(state, ctx.studentId)
            : (semantic ? neutralParam('fx.param.an_ambition') : FB.T('an ambition'));
          break;
        }
        case 'late':
          out[k] = (ctx && ctx.lateName) ||
            (semantic ? neutralParam('fx.param.your_late_spouse') : FB.T('your late spouse'));
          break;
        case 'lord': case 'priest': case 'friend': case 'rival': {
          const role = pureRole(state, k);
          out[k] = role ? role.name :
            (semantic ? neutralParam('fx.param.someone') : FB.T('someone'));
          break;
        }
        default:
          if (ctx && ctx[k] !== undefined) out[k] = ctx[k];
      }
    }
    return out;
  };

  function selectedEventSource(state, value) {
    if (!value || typeof value !== 'object' || value.text !== undefined || value.forms) {
      return value;
    }
    const me = state.chars[state.player.charId];
    return FB.faithBranch(state, me.religion, value).value;
  }
  function selectedEventText(state, value, ctx, depth) {
    depth = depth || 0;
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || depth > 3) return '';
    if (typeof value.text === 'string') return value.text;
    if (value.forms) return selectedEventText(state, value.forms, ctx, depth + 1);
    if ((value.select === 'plural' || value.select === 'value') &&
      value.cases && typeof value.param === 'string') {
      const raw = ctx && ctx[value.param] !== undefined ? ctx[value.param] : 'other';
      const choice = value.select === 'plural'
        ? (Math.abs(Number(raw)) === 1 ? 'one' : 'other')
        : String(raw);
      const next = Object.prototype.hasOwnProperty.call(value.cases, choice)
        ? value.cases[choice]
        : value.cases.other;
      return selectedEventText(state, next, ctx, depth + 1);
    }
    return selectedEventText(state, selectedEventSource(state, value), ctx, depth + 1);
  }
  function materializeTextRoles(state, value, ctx) {
    const source = selectedEventText(state, value, ctx, 0);
    if (typeof source !== 'string') return;
    source.replace(/\{(lord|priest|friend|rival|spouse|suitor)\}/g,
      function (whole, role) {
        FB.getRole(state, role, role !== 'rival');
        return whole;
      });
  }
  function eventPathValue(ev, path) {
    const parts = String(path || '').split('.');
    let value = ev;
    for (let i = 0; i < parts.length && value != null; i++) value = value[parts[i]];
    return value;
  }
  FB.prepareEventPath = function (state, ev, path, ctx) {
    materializeTextRoles(state, eventPathValue(ev, path), ctx);
  };
  FB.prepareEvent = function (state, ev, ctx) {
    /* Preserve the pre-i18n RNG/materialization order: title, body, explicit
       card, then every role mentioned anywhere in visible event prose. */
    if (ev.id === 'make_friend') FB.formalizeAttentionFriend(state);
    materializeTextRoles(state, ev.title, ctx);
    materializeTextRoles(state, ev.text, ctx);
    if (ev.charCard) FB.getRole(state, ev.charCard, ev.charCard !== 'rival');
    let raw = ' ';
    function add(value) {
      if (!value) return;
      if (typeof value === 'string') {
        raw += value + ' ';
      } else if (typeof value === 'object') {
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) add(value[key]);
        }
      }
    }
    add(ev.title);
    add(ev.text);
    for (let i = 0; i < (ev.options || []).length; i++) {
      const option = ev.options[i];
      add(option.label);
      add(option.desc);
      if (option.success) add(option.success.text);
      if (option.failure) add(option.failure.text);
    }
    const order = ['lord', 'priest', 'friend', 'rival', 'spouse', 'suitor'];
    for (let i = 0; i < order.length; i++) {
      if (raw.indexOf('{' + order[i] + '}') >= 0) FB.getRole(state, order[i], order[i] !== 'rival');
    }
  };

  function warUnitParts(state, units) {
    return FB.unitClassParts ? FB.unitClassParts(state, units) : [];
  }

  FB.warBattleRecordText = function (state, feedback) {
    feedback = feedback || (FB.warFeedback && FB.warFeedback(state));
    if (!feedback || !feedback.battles.length) {
      return FB.renderKey('fx.warstate.no_battles',
        { text:'Battle record: no battles recorded' }, {});
    }
    const rows = [];
    const start = Math.max(0, feedback.battles.length - 5);
    for (let i = start; i < feedback.battles.length; i++) {
      const battle = feedback.battles[i];
      const place = battle.mode === 'field' && battle.pid && FB.world.byId[battle.pid]
        ? FB.world.byId[battle.pid].name : '';
      if (battle.outcome === 'win') {
        rows.push(place
          ? FB.renderKey('fx.warstate.battle_win_place',
            { text:'Victory at {place}' }, { place:place })
          : FB.renderKey('fx.warstate.battle_win',
            { text:'Victory at the war council' }, {}));
      } else {
        rows.push(place
          ? FB.renderKey('fx.warstate.battle_loss_place',
            { text:'Defeat at {place}' }, { place:place })
          : FB.renderKey('fx.warstate.battle_loss',
            { text:'Defeat at the war council' }, {}));
      }
    }
    let streak = '';
    if (feedback.streak && feedback.streak.count) {
      streak = feedback.streak.outcome === 'win'
        ? FB.renderKey('fx.warstate.win_streak', {
          forms:{ select:'plural', param:'count', cases:{
            one:'{count}-victory streak', other:'{count}-victory streak'
          }}
        }, { count:feedback.streak.count })
        : FB.renderKey('fx.warstate.loss_streak', {
          forms:{ select:'plural', param:'count', cases:{
            one:'{count}-defeat streak', other:'{count}-defeat streak'
          }}
        }, { count:feedback.streak.count });
    }
    return FB.renderKey('fx.warstate.battle_record',
      { text:'Battle record: {record} · current: {streak}' }, {
        record:rows.join(' → '), streak:streak
      });
  };

  FB.warLossesText = function (state, feedback) {
    feedback = feedback || (FB.warFeedback && FB.warFeedback(state));
    const parts = feedback ? warUnitParts(state, feedback.losses) : [];
    return parts.length
      ? FB.renderKey('fx.warstate.losses',
        { text:'Campaign losses from the live host: {losses}' }, {
          losses:parts.join(', ')
        })
      : FB.renderKey('fx.warstate.no_losses',
        { text:'Campaign losses from the live host: none recorded' }, {});
  };

  function warConditionText(condition) {
    if (condition === 'supply') return FB.T('Supply');
    if (condition === 'thin_ranks') return FB.T('Thin ranks');
    if (condition === 'discipline') return FB.T('Discipline');
    if (condition === 'disorder') return FB.T('Disorder');
    if (condition === 'desertion') return FB.T('Desertion');
    if (condition === 'battle') return FB.T('Battle losses');
    return FB.T('Campaign pressure');
  }

  function warEffectTargetText(target) {
    if (target === 'both') {
      return FB.renderKey('fx.warstate.target_both',
        { text:'abstract strength and live troops' }, {});
    }
    if (target === 'troops') {
      return FB.renderKey('fx.warstate.target_troops',
        { text:'live troops only' }, {});
    }
    return FB.renderKey('fx.warstate.target_strength',
      { text:'abstract strength only' }, {});
  }

  FB.warEffectsText = function (state, feedback) {
    feedback = feedback || (FB.warFeedback && FB.warFeedback(state));
    const effects = feedback ? feedback.effects : [];
    const chosen = [], seen = {};
    for (let i = effects.length - 1; i >= 0 && chosen.length < 4; i--) {
      const effect = effects[i];
      if (effect.condition === 'battle' || seen[effect.condition]) continue;
      seen[effect.condition] = 1;
      chosen.unshift(effect);
    }
    if (!chosen.length) return '';
    const rows = [];
    for (const effect of chosen) {
      const deltas = [];
      const strength = Math.round((effect.strengthDelta || 0) * 100);
      if (strength) {
        deltas.push(FB.renderKey('fx.warstate.condition_delta',
          { text:'{amount} condition' }, {
            amount:(strength > 0 ? '+' : '') + strength
          }));
      }
      if (effect.troopTotal) {
        deltas.push(FB.renderKey('fx.warstate.troop_delta',
          { text:'−{men} men' }, { men:effect.troopTotal }));
      }
      rows.push(FB.renderKey('fx.warstate.effect_row',
        { text:'{condition}: {change} ({target})' }, {
          condition:warConditionText(effect.condition),
          change:deltas.join(', '),
          target:warEffectTargetText(effect.target)
        }));
    }
    return FB.renderKey('fx.warstate.effects',
      { text:'Campaign effects: {effects}' }, { effects:rows.join('; ') });
  };

  FB.warUpkeepText = function (state, feedback) {
    feedback = feedback || (FB.warFeedback && FB.warFeedback(state));
    if (!feedback || !feedback.host) {
      return FB.renderKey('fx.warstate.no_logistics',
        { text:'Seasonal host logistics: none while no host is raised' }, {});
    }
    const upkeep = feedback.upkeep;
    const rows = [];
    const parts = [
      ['base', 'fx.warstate.upkeep_camp', FB.T('camp')],
      ['levy', 'fx.warstate.upkeep_levy', FB.T('levy')],
      ['archers', 'fx.warstate.upkeep_archers', FB.T('archers')],
      ['cavalry', 'fx.warstate.upkeep_cavalry', FB.T('cavalry')],
      ['retinue', 'fx.warstate.upkeep_retinue', FB.T('men-at-arms')],
      ['mercenaries', 'fx.warstate.upkeep_mercenaries', FB.T('mercenaries')],
      ['reinforcement', 'fx.warstate.upkeep_reinforcement', FB.T('replacement drilling')],
      ['campaignModifier', 'fx.warstate.upkeep_campaign', FB.T('campaign adjustment')]
    ];
    for (const item of parts) {
      if (!upkeep[item[0]]) continue;
      rows.push(FB.renderKey(item[1], { text:'{label} {money:amount}' }, {
        label:item[2],
        amount:Math.round(upkeep[item[0]] * 10) / 10
      }));
    }
    /* unlocked classes beyond the baseline four bill from byClass */
    const namedClasses = { levy:1, arch:1, cav:1, ret:1, mercs:1 };
    const byClass = upkeep.byClass || {};
    for (const classId in byClass) {
      if (namedClasses[classId] || !byClass[classId]) continue;
      const classDef = FBDATA.unitClasses && FBDATA.unitClasses[classId];
      rows.push(FB.renderKey('fx.warstate.upkeep_class',
        { text:'{label} {money:amount}' }, {
          label:classDef
            ? FB.dataText(state, state.player.charId, 'unitClass', classId,
              classDef, 'name', {})
            : classId,
          amount:Math.round(byClass[classId] * 10) / 10
        }));
    }
    return FB.renderKey('fx.warstate.logistics_ledger',
      { text:'Seasonal host logistics: {money:total} ({parts})' }, {
        total:Math.round(upkeep.total * 10) / 10,
        parts:rows.join('; ')
      });
  };

  /* Compact war status injected under wartime event text. One line of short
     clauses; the full battle record, campaign losses, effects, and the upkeep
     ledger stay in the war panels (ui_panels.js), which render the
     warBattleRecordText/warLossesText/warEffectsText/warUpkeepText detail. */
  FB.warStateText = function (state) {
    const war = state.player.war;
    if (!war) return '';
    const feedback = FB.warFeedback ? FB.warFeedback(state) : null;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    const men = host ? host.men :
      Math.round(Math.max(FBDATA.balance.armyMinMen || 40, FB.playerLevy(state)) * (war.strength || 1) +
        (war.mercCos || 0) * (FBDATA.balance.mercCompanySize || 150));
    const condition = Math.round((war.strength || 1) * 100);
    const clauses = [
      host
        ? FB.renderKey('fx.warstate.host_at', {
          text: 'Your host: ~{men} men at {condition}% condition, at {place}'
        }, { men: men, condition: condition,
          place: FB.world.byId[host.at] ? FB.world.byId[host.at].name : '?' })
        : FB.renderKey('fx.warstate.host_unmustered', {
          text: 'Your host: ~{men} men at {condition}% condition, not yet mustered'
        }, { men: men, condition: condition })
    ];
    // urgent warnings only; the panel carries the full supply detail
    if (host && FB.hostSupplyStatus) {
      const supplyInfo = FB.hostSupplyStatus(state, host);
      if (supplyInfo && supplyInfo.status === 'starving') {
        clauses.push(FB.renderKey('fx.warstate.supply_starving', {
          text: 'the host is starving'
        }, {}));
      } else if (supplyInfo && supplyInfo.status === 'low') {
        clauses.push(FB.renderKey('fx.warstate.supply_low', {
          text: 'the host is low on supplies'
        }, {}));
      }
    }
    if (feedback) {
      if (feedback.streak && feedback.streak.count) {
        clauses.push(feedback.streak.outcome === 'win'
          ? FB.renderKey('fx.warstate.win_streak', {
            forms:{ select:'plural', param:'count', cases:{
              one:'{count}-victory streak', other:'{count}-victory streak'
            }}
          }, { count:feedback.streak.count })
          : FB.renderKey('fx.warstate.loss_streak', {
            forms:{ select:'plural', param:'count', cases:{
              one:'{count}-defeat streak', other:'{count}-defeat streak'
            }}
          }, { count:feedback.streak.count }));
      }
      if (feedback.host) {
        clauses.push(FB.renderKey('fx.warstate.logistics_total', {
          text: 'Logistics: {money:total}/season'
        }, { total: Math.round(feedback.upkeep.total * 10) / 10 }));
      }
    }
    const pinned = host && FB.fortPinnedStatus
      ? FB.fortPinnedStatus(state, host) : null;
    if (pinned) {
      clauses.push(FB.renderKey('fx.warstate.fort_pinned', {
        text:'Pinned by {fort} at {place}'
      }, { fort:pinned.name, place:FB.world.byId[pinned.pid].name }));
    }
    const enemyHost = FB.hostOf ? FB.hostOf(state, war.enemy) : null;
    if (enemyHost) {
      clauses.push(FB.renderKey('fx.warstate.enemy_host',
        { text: 'Their host: ~{men} men at {place}' }, {
          men: enemyHost.men,
          place: FB.world.byId[enemyHost.at] ? FB.world.byId[enemyHost.at].name : '?'
        }));
    }
    if (!war.defending && war.target && FB.world.byId[war.target]) {
      const siegeStatus = (FB.playerSiegeStatus
        ? FB.playerSiegeStatus(state) : null) ||
        (FB.fortSiegeStatus ? FB.fortSiegeStatus(state, war.target, {
          fortLevel:war.siegeFortLevel, progress:war.siege || 0
        }, host ? [host] : []) : { required:3 });
      clauses.push(FB.renderKey('fx.warstate.siege',
        { text: 'Siege of {place}: {progress}/{required}' },
        { place: FB.world.byId[war.target].name, progress: war.siege || 0,
          required:siegeStatus ? siegeStatus.required : 3 }));
      if (siegeStatus && siegeStatus.level) {
        clauses.push(FB.renderKey('fx.warstate.fort_siege_terms', {
          text:'{fort}: {minimum} besiegers needed, {attrition} lost each season'
        }, {
          fort:siegeStatus.name, minimum:siegeStatus.minimum,
          attrition:siegeStatus.attrition
        }));
        if (siegeStatus.shortage) {
          clauses.push(FB.renderKey('fx.warstate.fort_shortage', {
            text:'Siege stalled: {shortage} more men required'
          }, { shortage:siegeStatus.shortage }));
        }
      }
    }
    if (war.defending) {
      let enemyStatus = war.enemyTarget && FB.enemySiegeStatus
        ? FB.enemySiegeStatus(state)
        : null;
      if (!enemyStatus && war.enemyTarget && FB.fortSiegeStatus) {
        enemyStatus = FB.fortSiegeStatus(state, war.enemyTarget, {
          fortLevel:war.enemySiegeFortLevel, progress:war.enemySiege || 0
        }, 0);
      }
      if (!enemyStatus) enemyStatus = { required:3 };
      clauses.push(FB.renderKey('fx.warstate.advance',
        { text: 'Enemy advance: {progress}/{required}' }, {
          progress: war.enemySiege || 0,
          required:enemyStatus ? enemyStatus.required : 3
        }));
      if (enemyStatus && enemyStatus.level) {
        clauses.push(FB.renderKey('fx.warstate.enemy_fort_siege', {
          text:'Your {fort}: {minimum} besiegers needed, {attrition} lost each season'
        }, { fort:enemyStatus.name, minimum:enemyStatus.minimum,
          attrition:enemyStatus.attrition }));
        if (enemyStatus.shortage) {
          clauses.push(FB.renderKey('fx.warstate.enemy_fort_shortage', {
            text:'Their siege is stalled: {shortage} more men required'
          }, { shortage:enemyStatus.shortage }));
        }
      }
    }
    return clauses.join(' · ');
  };

  FB.fmt = function (state, source, ctx) {
    return FB.formatSource(state, state.player.charId, source, ctx);
  };

  /* ---------- named chance formulas ---------- */
  FB.namedChance = function (state, key, ctx) {
    const p = state.player;
    const me = state.chars[p.charId];
    const f = p.flags;
    switch (key) {
      case 'serf_flight': {
        const kind = FB.eventParticipantKind &&
          FB.eventParticipantKind(ctx, 'confidant');
        const balance = FBDATA.balance;
        const base = kind === 'friend' ? balance.serfFlightFriendChance
          : (kind === 'rival' ? balance.serfFlightRivalChance
            : balance.serfFlightUnaccompaniedChance);
        const covered = FB.freedomCoveredCharacterIds
          ? FB.freedomCoveredCharacterIds(state, []) : [me.id];
        const familyMembers = Math.max(0, covered.length - 1);
        const configuredPenalty = Number(balance.serfFlightFamilyMemberPenalty);
        const penalty = isFinite(configuredPenalty) && configuredPenalty >= 0
          ? configuredPenalty : 0.05;
        const configuredMinimum = Number(balance.serfFlightMinimumChance);
        const minimum = isFinite(configuredMinimum)
          ? FB.clamp(configuredMinimum, 0, 0.95) : 0.10;
        return FB.clamp(base - familyMembers * penalty, minimum, 0.95);
      }
      case 'harvest': {
        let c = 0.55 + FB.skillOf(me, 'ste') * 0.018;
        if (f.crop_safe) c += 0.15;
        if (f.crop_risky) c -= 0.08;
        if (f.blessed_crops) c += 0.12;
        if (f.crop_ruined) c = 0.05;
        const pr = FB.world.byId[p.provinceId];
        if (pr && pr.terrain === 'farmland') c += 0.08;
        return FB.clamp(c, 0.05, 0.95);
      }
      case 'battle': {
        let c = 0.40 + FB.skillOf(me, 'mar') * 0.028;
        if (me.traits.indexOf('brave') >= 0) c += 0.05;
        if (me.traits.indexOf('craven') >= 0) c -= 0.1;
        c += FB.holdingBonus(state, 'battle') + FB.itemBonus(state, 'battle');
        if (f.blessed_war) c += 0.06;
        return FB.clamp(c, 0.1, 0.92);
      }
      case 'proposal': {
        const s = FB.getRole(state, 'suitor', false);
        let c = 0.3 + characterStanding(state, s) / 180 +
          p.prestige / 600 + p.tier * 0.05;
        const gap = s ? FB.stationOf(s) - FB.playerStation(state) : 0;
        if (gap > 0) c -= gap * FBDATA.balance.proposalStationPenalty; // marrying up is hard
        else c += Math.min(0.1, -gap * 0.05); // marrying down is easy
        if (me.traits.indexOf('comely') >= 0) c += 0.08;
        if (me.traits.indexOf('homely') >= 0) c -= 0.08;
        if (s && FB.faithHasSystem(s.religion, 'papacy', state) &&
            FB.playerExcommunicated && FB.playerExcommunicated(state)) {
          c -= 0.2;
        }
        if (s && s.royalLine &&
            !(FB.isReigningRealmRuler &&
              FB.isReigningRealmRuler(state, s))) {
          c += realmStanding(state, s.royalLine.realmId) / 400;
          const aim = FB.rulerAimSnapshot &&
            FB.rulerAimSnapshot(state, s.royalLine.realmId);
          if (aim && aim.id === 'secure_dynasty') c += 0.12;
          else if (aim && aim.id === 'keep_peace') c += 0.04;
          else if (aim && aim.id === 'strengthen_crown') c -= 0.05;
          return FB.clamp(c, 0.05, 0.9);
        }
        return FB.clamp(c, 0.05, 0.95);
      }
      case 'sibling_proposal': {
        const sibling = p.courtingId && state.chars[p.courtingId];
        return sibling ? FB.siblingProposalChance(state, sibling) : 0.05;
      }
      case 'sibling_exposure_denial': {
        const sibling = p.courtingId && state.chars[p.courtingId];
        let c = 0.25 + FB.skillOf(me, 'int') * 0.025;
        c += FB.traitBonus(me, 'courtship', 'siblingIllicitAccept') || 0;
        if (sibling) c += FB.skillOf(sibling, 'int') * 0.005;
        return FB.clamp(c, 0.10, 0.80);
      }
      case 'fabricate_claim': {
        const c = 0.30 + FB.skillOf(me, 'int') * 0.03 +
          FB.skillOf(me, 'lea') * 0.01 + p.prestige / 1000;
        return FB.clamp(c, 0.10, 0.90);
      }
      case 'plot_discovery':
        return p.plot && p.plot.id === 'fabricate_claim'
          ? FB.namedChance(state, 'fabricate_claim') : 0.35;
      case 'rival_peace': {
        const rival = FB.getRole(state, 'rival', false);
        let c = 0.45 + FB.skillOf(me, 'dip') * 0.02;
        if (rival) c += characterStanding(state, rival) / 200;
        c -= FB.rivalHeat(state) / 250;
        if (me.traits.indexOf('kind') >= 0) c += 0.08;
        if (me.traits.indexOf('proud') >= 0) c -= 0.05;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'house_claim': {
        // pressing a child's claim on the late spouse's house: standing and
        // cunning against their lawyers and pride
        let c = 0.3 + p.prestige / 400 + FB.skillOf(me, 'dip') * 0.02 + FB.skillOf(me, 'int') * 0.02;
        return FB.clamp(c, 0.1, 0.85);
      }
      case 'annulment': {
        // the church weighs a plea to unmake a marriage: piety, learning,
        // and high office speak loudest
        let c = 0.35 + p.piety / 300 + FB.skillOf(me, 'lea') * 0.018;
        if (f.bishop) c += 0.2;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'skill_dip': return FB.clamp(0.30 + FB.skillOf(me, 'dip') * 0.04, 0.1, 0.9);
      case 'skill_ste': {
        let c = 0.30 + FB.skillOf(me, 'ste') * 0.04;
        if (FB.hasHouseholdAsset(state, 'fine_tools') ||
          FB.hasHouseholdAsset(state, 'workshop')) c += 0.06;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'travel_trade':
        return FB.clamp(0.28 + FB.skillOf(me, 'ste') * 0.045, 0.1, 0.92);
      case 'skill_int': return FB.clamp(0.30 + FB.skillOf(me, 'int') * 0.04, 0.1, 0.9);
      case 'skill_lea': {
        let c = 0.30 + FB.skillOf(me, 'lea') * 0.04;
        if (FB.holdingList(state).indexOf('letters') >= 0) c += 0.08;
        if (p.profession === 'monk' || p.profession === 'priest') c += 0.05;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'rights_dip': {
        const lord = FB.getRole(state, 'lord', false);
        let c = 0.22 + FB.skillOf(me, 'dip') * 0.04 + p.prestige / 900;
        if (f.rights_evidence) c += 0.18;
        if (lord) c += characterStanding(state, lord) / 500;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'rights_ste': {
        let c = 0.25 + FB.skillOf(me, 'ste') * 0.04;
        if (f.rights_evidence) c += 0.18;
        if (p.profession === 'farmer' || p.profession === 'craftsman' || p.profession === 'merchant') c += 0.05;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'rights_int': {
        let c = 0.24 + FB.skillOf(me, 'int') * 0.04;
        if (f.rights_evidence) c += 0.18;
        if (f.rights_collaborator) c += 0.05;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'rights_lea': {
        let c = 0.24 + FB.skillOf(me, 'lea') * 0.04;
        const hs = FB.holdingList(state);
        if (f.rights_evidence) c += 0.18;
        if (hs.indexOf('letters') >= 0) c += 0.08;
        if (p.profession === 'monk' || p.profession === 'priest') c += 0.05;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'swarm': {
        let c = 0.35 + FB.skillOf(me, 'ste') * 0.035;
        if (FB.hasHouseholdAsset(state, 'hearth_garden')) c += 0.1;
        if (FB.hasHouseholdAsset(state, 'orchard')) c += 0.12;
        return FB.clamp(c, 0.15, 0.9);
      }
      case 'war_battle': {
        const w = p.war;
        if (!w) return 0.5;
        const enemy = state.realms[w.enemy];
        const bal = FBDATA.balance;
        const cs = bal.mercCompanySize || 150;
        // real men: the fielded host if there is one, else the levy the
        // muster would raise (worn by the host's condition either way); a
        // side still re-forming a shattered host fields only a remnant.
        // Composition counts: men-at-arms and archers punch above levy weight
        const host = FB.playerHost ? FB.playerHost(state) : null;
        let myMen, myQ;
        if (host) {
          myMen = host.men * (w.strength || 1);
          myQ = FB.compQuality ? FB.compQuality(host.units, host.men) : 1;
        } else {
          const comp = FB.playerComposition ? FB.playerComposition(state)
            : { levy: FB.playerLevy(state), arch: 0, cav:0, ret: 0 };
          const units = {};
          for (const key in comp) units[key] = comp[key];
          units.mercs = (w.mercCos || 0) * cs;
          let men = 0;
          for (const key in units) men += Math.max(0, Number(units[key]) || 0);
          const fl = bal.armyMinMen || 40;
          if (men < fl) { units.levy = (units.levy || 0) + fl - men; men = fl; }
          myQ = FB.compQuality ? FB.compQuality(units, men) : 1;
          myMen = men * (FB.rearmScale ? FB.rearmScale(state, 'player') : 1) * (w.strength || 1);
        }
        const myStr = myMen * myQ * (1 + FB.skillOf(me, 'mar') / (bal.battleMarPlayer || 14));
        const ehost = FB.hostOf ? FB.hostOf(state, w.enemy) : null;
        const enMen = ehost ? ehost.men
          : FB.aiBaseHost(state, w.enemy) *
            (FB.rearmScale ? FB.rearmScale(state, w.enemy) : 1);
        const enQ = ehost
          ? (FB.compQuality ? FB.compQuality(ehost.units, ehost.men) : 1)
          : (FB.aiHostQuality ? FB.aiHostQuality(state, w.enemy) : 1);
        const enStr = enMen * enQ * (1 + (enemy ? enemy.ruler.mar : 5) /
          (bal.battleMarAI || 22)) * (1 + FB.techBonus(state, 'battle', w.enemy));
        let c = myStr / (myStr + enStr);
        c += Math.min(90, w.led || 0) / 90 * 0.1;              // a season spent leading the host
        c += w.rested ? 0.05 : 0;                              // a refit
        c += (w.mass ? 0.05 : 0);                              // the great levy
        /* field-battle estimate (the war card, the siege sortie roll): when
           defending, read the fort bonus of the invaded county when a live
           host supplies one; otherwise fall back to the defended seat. The
           same terms multiply real battle power in battlePower (js/armies.js). */
        if (w.defending && FB.fortBattleBonus) {
          const invader = FB.enemyHostInPlayerLandsArmy
            ? FB.enemyHostInPlayerLandsArmy(state) : null;
          c += FB.fortBattleBonus(state,
            (invader && invader.at) || w.enemyTarget || FB.homeProv(state),
            { realm:'player' });
        }
        c += FB.techBonus(state, 'battle') + FB.holdingBonus(state, 'battle') +
          FB.itemBonus(state, 'battle') + (FB.householdStandardEffect
            ? FB.householdStandardEffect(state, 'battle') : 0);
        if (f.blessed_war) c += 0.06;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'liege_grant': {
        // no land adjoining the player's to give → the suit fails outright
        if (p.tier === 3 && !FB.liegeHomeCountyGrantAuthority(state)) return 0;
        if (p.tier >= 4 && !FB.liegeGrantCandidates(state).length) return 0;
        const aim = p.liege && FB.rulerAimSnapshot &&
          FB.rulerAimSnapshot(state, p.liege);
        const aimValue = aim && aim.id === 'expand_realm' ? 0.04 :
          (aim && aim.id === 'strengthen_crown' ? -0.04 : 0);
        return FB.liegeGrantChance(state,
          FB.clamp(0.05 + realmStanding(state, p.liege) / 450 +
            p.prestige / 1800 + aimValue, 0.02, 0.35));
      }
      case 'county_petition': {
        // stripping a disgraced vassal for the player's sake: the liege's love
        // for the player, his name, and his war service against the victim's
        // own (poor) standing (p.petitionPid set by the picker)
        const hp = p.petitionPid ? state.holder[p.petitionPid] : null;
        const hr = hp ? state.realms[hp] : null;
        if (!hr || !hr.alive) return 0;
        const fav = hr.favor || 0;
        const aim = p.liege && FB.rulerAimSnapshot &&
          FB.rulerAimSnapshot(state, p.liege);
        const aimValue = aim && aim.id === 'expand_realm' ? 0.05 :
          (aim && aim.id === 'strengthen_crown' ? -0.05 : 0);
        return FB.liegeGrantChance(state,
          FB.clamp(0.35 + realmStanding(state, p.liege) / 300 +
            p.prestige / 1500 +
            (p.warService || 0) / 80 - fav / 150 + aimValue,
          0.1, 0.85));
      }
      case 'appeal_outcome': {
        // a suit carried over the liege's head: charm, cunning, and how the
        // high lord already feels about you (p.appealRid set by the picker)
        const rid = p.appealRid;
        let c = FBDATA.balance.appealBase + FB.skillOf(me, 'dip') * 0.025 + FB.skillOf(me, 'int') * 0.025;
        if (rid) c += realmStanding(state, rid) / 200;
        return FB.clamp(c, 0.05, 0.9);
      }
      case 'vassal_comply': {
        // a vassal asked to surrender his fief (p.revokeRid set by the picker)
        const rid2 = p.revokeRid;
        let c2 = 0.35 + FB.skillOf(me, 'dip') * 0.025 + p.prestige / 800;
        if (rid2) c2 += realmStanding(state, rid2) / 150;
        return FB.clamp(c2, 0.05, 0.95);
      }
      case 'parliament_vote': {
        // a motion before the estates: rank, diplomacy, name, and the liege's love
        return FB.parliamentVoteChance ? FB.parliamentVoteChance(state) : 0.5;
      }
      case 'parliament_redress_vote': {
        return FB.parliamentVoteChance
          ? FB.parliamentVoteChance(state, true) : 0.5;
      }
      case 'plot': {
        let c = 0.30 + FB.skillOf(me, 'int') * 0.04;
        c += FB.councilBonus ? FB.councilBonus(state, 'plot') : 0; // the Chamberlain's quiet machinery
        // a trusting victim is easier to ensnare — when the plot in motion has
        // a personal target's Standing with the player counts too
        const trole = p.plot && (p.plot.id === 'ruin_rival' ? 'rival' : p.plot.id === 'widow_veil' ? 'spouse' : null);
        const targetId = p.plot && p.plot.context && p.plot.context.characterId;
        const tgt = targetId ? state.chars[targetId] :
          (trole ? FB.getRole(state, trole, false) : null);
        if (tgt) c += characterStanding(state, tgt) / 500;
        return FB.clamp(c, 0.15, 0.9);
      }
      default: return 0.5;
    }
  };

  /* ---------- trigger evaluation ---------- */
  function triggerSnapshotValue(snapshot, key, build) {
    if (!snapshot) return build();
    if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
      snapshot[key] = build();
    }
    return snapshot[key];
  }

  function triggerSnapshotLookup(snapshot, bucket, key, build) {
    if (!snapshot) return build();
    let values = snapshot[bucket];
    if (!values) values = snapshot[bucket] = Object.create(null);
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      values[key] = build();
    }
    return values[key];
  }

  /* Random-event selection evaluates hundreds of immutable definitions in
     one synchronous pass. The optional snapshot retains shared, pure reads
     for that pass only; standalone trigger checks keep their old behavior. */
  FB.checkTrigger = function (state, tg, ctx, snapshot) {
    if (!tg) return true;
    if (tg.never) return false;
    const p = state.player;
    const me = state.chars[p.charId];
    const age = triggerSnapshotValue(snapshot, 'age', function () {
      return FB.ageOf(me, state.date.year);
    });
    const pr = FB.world.byId[p.provinceId];

    if (tg.tierMin !== undefined && p.tier < tg.tierMin) return false;
    if (tg.tierMax !== undefined && p.tier > tg.tierMax) return false;
    if (tg.societalRoles && tg.societalRoles.indexOf(
      triggerSnapshotValue(snapshot, 'societalRole', function () {
        return FB.societalRole(state);
      })) < 0) return false;
    /* Profession requirements describe personally practicing a vocation.
       Landed careers survive as biography, but no longer satisfy work gates. */
    if (tg.professions && (p.tier >= 3 ||
      tg.professions.indexOf(p.profession) < 0)) return false;
    /* A specialty path is an active vocation requirement, deliberately
       separate from broad profession gates. It is evaluated only by events
       which declare it, and a landed former calling never qualifies. */
    if (tg.career) {
      const requirement = tg.career;
      const career = triggerSnapshotValue(snapshot, 'career', function () {
        return FB.careerOf ? FB.careerOf(state, me) : null;
      });
      const guildOrder = { none:0, member:1, master:2, officer:3, guildmaster:4 };
      if (p.tier >= 3 || !career || !career.chosen ||
          career.rank === 'unassigned' || career.rank === 'apprentice') return false;
      if (requirement.profession && career.profession !== requirement.profession) return false;
      if (requirement.specialization &&
          career.specialization !== requirement.specialization) return false;
      if (requirement.guildRankMin &&
          (guildOrder[career.guildRank] || 0) <
            (guildOrder[requirement.guildRankMin] || 0)) return false;
      if (requirement.guildStandingMin !== undefined &&
          (Number(career.guildStanding) || 0) <
            Math.max(0, Number(requirement.guildStandingMin) || 0)) return false;
    }
    if (tg.minAge !== undefined && age < tg.minAge) return false;
    if (tg.maxAge !== undefined && age > tg.maxAge) return false;
    if (tg.sex && me.sex !== tg.sex) return false;
    if (tg.seasons && tg.seasons.indexOf(state.date.season) < 0) return false;
    if (tg.yearMin !== undefined && state.date.year < tg.yearMin) return false;
    if (tg.yearMax !== undefined && state.date.year > tg.yearMax) return false;
    if (tg.married !== undefined) {
      const married = !!triggerSnapshotValue(snapshot, 'spouse', function () {
        return FB.spouseOf(state, me);
      });
      if (married !== tg.married) return false;
    }
    if (tg.maxSeasonsSinceMarriage !== undefined) {
      // state.turn counts days; data values are in seasons of 90 days
      if (p.marriedAt === undefined || state.turn - p.marriedAt > tg.maxSeasonsSinceMarriage * 90) return false;
    }
    if (tg.hasChildren !== undefined) {
      if ((me.childrenIds.length > 0) !== tg.hasChildren) return false;
    }
    if (tg.hasYoungChild) {
      let ok = false;
      for (const cid of me.childrenIds) {
        const c = state.chars[cid];
        if (c && !c.dead && FB.ageOf(c, state.date.year) < 13) { ok = true; break; }
      }
      if (!ok) return false;
    }
    if (tg.goldMin !== undefined && p.gold < tg.goldMin) return false;
    if (tg.goldMax !== undefined && p.gold > tg.goldMax) return false;
    if (tg.healthMax !== undefined && (me.health === undefined || me.health > tg.healthMax)) return false;
    if (tg.prestigeMin !== undefined && p.prestige < tg.prestigeMin) return false;
    if (tg.pietyMin !== undefined && p.piety < tg.pietyMin) return false;
    if (tg.marriageEndReady) {
      const marriageSpouse = triggerSnapshotValue(snapshot, 'spouse', function () {
        return FB.spouseOf(state, me);
      });
      if (!marriageSpouse) return false;
      if (!(ctx && ctx.marriageEndInitiated)) {
        if (!FB.marriageEndStatus(state, marriageSpouse).ready) return false;
      } else {
        const marriageEnding = FB.marriageDoctrine(me.religion, state).end || {};
        const marriageGold = ctx.marriageGold !== undefined
          ? Number(ctx.marriageGold) || 0 : Number(marriageEnding.gold) || 0;
        const marriagePiety = ctx.marriagePiety !== undefined
          ? Number(ctx.marriagePiety) || 0 : Number(marriageEnding.piety) || 0;
        const marriagePrestige = ctx.marriagePrestige !== undefined
          ? Number(ctx.marriagePrestige) || 0 : Number(marriageEnding.prestige) || 0;
        if (marriageEnding.direct || p.gold < marriageGold ||
            p.piety < marriagePiety || p.prestige < marriagePrestige) return false;
      }
    }
    if (tg.leaMin !== undefined && FB.skillOf(me, 'lea') < tg.leaMin) return false;
    if (tg.flags) for (const fl of tg.flags) if (!p.flags[fl]) return false;
    if (tg.notFlags) for (const fl of tg.notFlags) if (p.flags[fl]) return false;
    if (tg.buildings) for (const b of tg.buildings) if (!triggerSnapshotLookup(
      snapshot, 'buildings', b, function () { return FB.hasBuilding(state, b); })) return false;
    if (tg.notBuildings) for (const b of tg.notBuildings) if (triggerSnapshotLookup(
      snapshot, 'buildings', b, function () { return FB.hasBuilding(state, b); })) return false;
    if (tg.hasModifier !== undefined) {
      const spec = typeof tg.hasModifier === 'string'
        ? { id:tg.hasModifier } : tg.hasModifier;
      if (!spec || typeof spec.id !== 'string') return false;
      const def = FBDATA.modifiers && FBDATA.modifiers[spec.id];
      const pid = spec.pid || (ctx && ctx.locationId) || p.provinceId;
      if (!def || !FB.hasModifier ||
          !FB.hasModifier(state, spec.id, def.scope === 'county' ? pid : null)) return false;
    }
    if (tg.techs || tg.notTechs) {
      const technologies = triggerSnapshotValue(snapshot, 'technologies', function () {
        return FB.techList(state);
      });
      if (tg.techs) for (const t of tg.techs) if (technologies.indexOf(t) < 0) return false;
      if (tg.notTechs) for (const t of tg.notTechs) if (technologies.indexOf(t) >= 0) return false;
    }
    if (tg.holdings) for (const hd of tg.holdings) if (!triggerSnapshotLookup(
      snapshot, 'holdings', hd, function () {
        return FB.hasHouseholdAsset(state, hd);
      })) return false;
    if (tg.notHoldings) for (const hd of tg.notHoldings) if (triggerSnapshotLookup(
      snapshot, 'holdings', hd, function () {
        return FB.hasHouseholdAsset(state, hd);
      })) return false;
    if (tg.religionGroup && !FB.faithIsA(me.religion, tg.religionGroup, state)) return false;
    if (tg.religionGroups && !tg.religionGroups.some(function (id) {
      return FB.faithIsA(me.religion, id, state);
    })) return false;
    if (tg.provinceReligionGroup &&
        (!pr || !FB.faithIsA(pr.religion, tg.provinceReligionGroup, state))) return false;
    if (tg.cultures && tg.cultures.indexOf(me.culture) < 0) return false;
    if (tg.provinceCultures && (!pr || tg.provinceCultures.indexOf(pr.culture) < 0)) return false;
    if (tg.terrains && (!pr || tg.terrains.indexOf(pr.terrain) < 0)) return false;
    if (tg.coastal && (!pr || !pr.coastal)) return false;
    if (tg.atWar !== undefined && (!!p.war) !== tg.atWar) return false;
    if (tg.realmAtWar !== undefined) {
      const at = triggerSnapshotValue(snapshot, 'realmAtWar', function () {
        const rid = state.owner[p.provinceId];
        return rid ? FB.isRealmAtWar(state, rid) : false;
      });
      if (at !== tg.realmAtWar) return false;
    }
    if (tg.isVassal !== undefined && (!!p.liege) !== tg.isVassal) return false;
    if (tg.isLiege !== undefined && (triggerSnapshotValue(
      snapshot, 'hasPlayerVassals', function () {
        return FB.playerVassals(state).length > 0;
      })) !== tg.isLiege) return false;
    if (tg.liegeAtWar !== undefined) {
      const at = triggerSnapshotValue(snapshot, 'liegeAtWar', function () {
        return p.liege ? FB.isRealmAtWar(state, p.liege) : false;
      });
      if (at !== tg.liegeAtWar) return false;
    }
    if (tg.hasRole && !triggerSnapshotLookup(snapshot, 'roles', tg.hasRole,
      function () { return FB.getRole(state, tg.hasRole, false); })) return false;
    if (tg.noRole && triggerSnapshotLookup(snapshot, 'roles', tg.noRole,
      function () { return FB.getRole(state, tg.noRole, false); })) return false;
    if (tg.roleOpinionAbove) {
      const c = FB.getRole(state, tg.roleOpinionAbove.role, false);
      if (!c || characterStanding(state, c) < tg.roleOpinionAbove.value) {
        return false;
      }
    }
    if (tg.roleOpinionBelow) {
      const c = FB.getRole(state, tg.roleOpinionBelow.role, false);
      if (!c || characterStanding(state, c) > tg.roleOpinionBelow.value) {
        return false;
      }
    }
    if (tg.participantStandingAbove) {
      const spec = tg.participantStandingAbove;
      const c = FB.eventParticipant(state, ctx, spec.participant);
      if (!c || characterStanding(state, c) < spec.value) return false;
    }
    if (tg.participantStandingBelow) {
      const spec = tg.participantStandingBelow;
      const c = FB.eventParticipant(state, ctx, spec.participant);
      if (!c || characterStanding(state, c) > spec.value) return false;
    }
    if (tg.participantKind) {
      const spec = tg.participantKind;
      const kind = FB.eventParticipantKind(ctx, spec.participant);
      if (!kind || !Array.isArray(spec.values) ||
          spec.values.indexOf(kind) < 0) return false;
    }
    if (tg.rivalHeatMin !== undefined && FB.rivalHeat(state) < tg.rivalHeatMin) return false;
    if (tg.rivalHeatMax !== undefined && FB.rivalHeat(state) > tg.rivalHeatMax) return false;
    /* computed only when a def actually asks for it: popEffective walks the
       county modifier records, and nearly every def lacks this trigger */
    if (tg.popularOpinionBelow !== undefined) {
      const popularOpinion = FB.popEffective ? FB.popEffective(state) : p.pop;
      if (popularOpinion > tg.popularOpinionBelow) return false;
    }
    if (tg.custom && FB.fns[tg.custom] &&
        !FB.fns[tg.custom](state, ctx || {})) return false;
    return true;
  };
  FB.fns = FB.fns || {}; // registry for custom trigger/effect functions (world.js war handlers register earlier; mods may add)

  FB.fns.bishop_simony_accept = function (state, ctx) {
    const c = state.chars[ctx && ctx.candidateId || state.player.charId];
    const legacyQueuedOffer = !(ctx && ctx.candidateId);
    if (!c || c.dead ||
        (!legacyQueuedOffer && c.bishopSimonyOfferTurn === undefined) ||
        !FB.installBishopric) return false;
    const status = FB.bishopAppointmentStatus
      ? FB.bishopAppointmentStatus(state, c) : {};
    delete c.bishopSimonyOfferTurn;
    delete c.bishopPetitionRefusedTurn;
    FB.addTrait(c, 'simoniac');
    FB.installBishopric(state, c, status);
    return true;
  };

  FB.fns.bishop_simony_clear = function (state, ctx) {
    const c = state.chars[ctx && ctx.candidateId || state.player.charId];
    if (!c) return false;
    delete c.bishopSimonyOfferTurn;
    return true;
  };

  /* Ordinary feudal elevation rests on a house, not one remarkable career.
     New games record the line depth that first reaches gentry; an heir of a
     genuinely later generation must inherit that standing before the house
     may petition for a barony — a sibling or cousin of the founder's own
     generation does not count. Saves from before these fields existed are
     treated as already established, and saves holding only a saga-generation
     number keep the original counter comparison. */
  FB.gentryEstablished = function (state) {
    const p = state.player;
    if (!p || p.tier < 2) return false;
    if (p.gentryGeneration === undefined) return true;
    if (p.gentryGeneration === null) return false;
    if (p.lineDepth !== undefined) return p.gentryGeneration < p.lineDepth;
    return p.gentryGeneration < state.generation;
  };
  FB.markGentryRise = function (state) {
    const p = state.player;
    if (p.gentryGeneration === undefined || p.gentryGeneration === null) {
      p.gentryGeneration = p.lineDepth !== undefined ? p.lineDepth : state.generation;
    }
  };

  /* Queue context is a snapshot, not a view of whichever title or location
     the player has when the modal is finally opened. That keeps selectors,
     county effects, autoresolve, and durable event logs faithful across
     promotion and travel. */
  FB.eventContext = function (state, ctx) {
    const out = {};
    ctx = ctx || {};
    for (const key in ctx) {
      if (Object.prototype.hasOwnProperty.call(ctx, key)) out[key] = ctx[key];
    }
    if (out.societalRole === undefined) out.societalRole = FB.societalRole(state);
    if (out.profession === undefined) out.profession = state.player.profession;
    if (out.formerProfession === undefined) {
      out.formerProfession = state.player.professionBack || state.player.profession;
    }
    if (out.protagonistId === undefined) {
      out.protagonistId = state.player.charId;
    }
    if (out.locationId === undefined) {
      const location = FB.travelLocation ? FB.travelLocation(state) : null;
      out.locationId = location && location.id ? location.id : state.player.provinceId;
    }
    return out;
  };

  function snapshotTenureAwareContext(state, ev, ctx) {
    if (!ev || !ev.tenureAware) return ctx;
    const tenure = FB.activeSerfTenure && FB.activeSerfTenure(state);
    if (!tenure) return ctx;
    if (ctx.tenureFormedTurn === undefined) {
      ctx.tenureFormedTurn = tenure.formedTurn;
    }
    if (ctx.tenureRevision === undefined) {
      ctx.tenureRevision = Number.isInteger(tenure.revision)
        ? tenure.revision : 0;
    }
    if (ctx.tenureArchetypeId === undefined) {
      ctx.tenureArchetypeId = tenure.archetypeId;
    }
    if (ctx.archetypeId === undefined) ctx.archetypeId = tenure.archetypeId;
    if (ctx.tenureProvinceId === undefined) {
      ctx.tenureProvinceId = tenure.provinceId;
    }
    if (ctx.tenureSettlement === undefined) {
      ctx.tenureSettlement = tenure.settlement;
    }
    if (ctx.dutyId && ctx.tenureVariantId === undefined) {
      ctx.tenureVariantId = tenure.archetypeId + ':' + ctx.dutyId;
    }
    return ctx;
  }

  function tenureAwareContextStillValid(state, ev, ctx) {
    if (!ev || !ev.tenureAware || !ctx ||
        ctx.tenureFormedTurn === undefined) return true;
    const tenure = FB.activeSerfTenure && FB.activeSerfTenure(state);
    if (!tenure || ctx.protagonistId !== state.player.charId) return false;
    if (ctx.tenureFormedTurn !== tenure.formedTurn ||
        (ctx.tenureRevision === undefined ? 0 : ctx.tenureRevision) !==
          (Number.isInteger(tenure.revision) ? tenure.revision : 0) ||
        ctx.tenureArchetypeId !== tenure.archetypeId ||
        ctx.tenureProvinceId !== tenure.provinceId ||
        ctx.tenureSettlement !== tenure.settlement) return false;
    return true;
  }

  FB.eventContextFor = function (state, ev, ctx) {
    const out = FB.eventContext(state, ctx);
    snapshotTenureAwareContext(state, ev, out);
    const bound = FB.bindEventParticipants(state, ev, out);
    if (!bound || !FB.eventParticipantsStillValid(state, ev, bound)) return false;
    return bound;
  };

  FB.ensureEventParticipants = function (state, ev, ctx) {
    ctx = ctx || {};
    /* Direct UI callers and old queue records can predate the event-context
       defaults as well as participant binding. Repair only missing defaults
       in place so the caller keeps the same saved object and any exact slot
       already present can never be recast. */
    const normalized = FB.eventContext(state, ctx);
    for (const key of ['societalRole','profession','formerProfession',
        'protagonistId','locationId']) {
      if (ctx[key] === undefined) ctx[key] = normalized[key];
    }
    snapshotTenureAwareContext(state, ev, ctx);
    if (!ev || !ev.participants || !ev.participants.length) return ctx;
    return FB.bindEventParticipants(state, ev, ctx);
  };

  FB.queueEvent = function (state, id, ctx, extra) {
    const ev = FB.eventById(id);
    const eventCtx = FB.eventContextFor(state, ev, ctx);
    if (!eventCtx) return null;
    const item = { id:id, ctx:eventCtx };
    extra = extra || {};
    for (const key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) item[key] = extra[key];
    }
    state.eventQueue = state.eventQueue || [];
    state.eventQueue.push(item);
    return item;
  };

  function eventContextContains(expected, actual) {
    if (!expected || !actual) return false;
    for (const key in expected) {
      if (expected[key] !== actual[key]) return false;
    }
    return true;
  }

  FB.eventContextStillValid = function (state, ev, ctx) {
    if (!ev) return false;
    if (!FB.eventParticipantsStillValid(state, ev, ctx || {})) return false;
    if (!tenureAwareContextStillValid(state, ev, ctx || {})) return false;
    if (ev.educationStory) {
      const educationValidator = FB.fns &&
        FB.fns.education_story_context_valid;
      if (!educationValidator || !educationValidator(state, ctx || {})) return false;
    }
    if (ev.contextValidator) {
      const validator = FB.fns && FB.fns[ev.contextValidator];
      if (!validator || !validator(state, ctx || {})) return false;
    }
    if (ev.contextSelector) {
      if (!FB.eventContextOptions) return false;
      const options = FB.eventContextOptions(state, ev.contextSelector);
      for (const option of options) {
        if (eventContextContains(option, ctx || {})) return true;
      }
      return false;
    }
    return true;
  };

  function lowerStationStoryActive(state) {
    const f = state.player.flags || {};
    const active = [
      'old_custom_1', 'old_custom_2', 'old_custom_3', 'old_custom_resolve',
      'polly_1', 'polly_2', 'polly_3', 'polly_4', 'polly_reunion',
      'on_campaign'
    ];
    for (let i = 0; i < active.length; i++) if (f[active[i]]) return true;
    for (const key in f) {
      if (key.indexOf('mill_path_') === 0 || key.indexOf('bench_path_') === 0 ||
        key === 'testament_memory' || key === 'testament_witnesses' ||
        key === 'testament_seal' || key === 'testament_crooked') return true;
    }
    return false;
  }

  FB.queueStationFarewellIfReady = function (state) {
    const record = state.player.stationFarewell;
    if (!record || record.queued || record.charId !== state.player.charId ||
      (state.player.fired && state.player.fired.station_farewell) ||
      state.player.tier < 3 || lowerStationStoryActive(state)) return false;
    FB.queueEvent(state, 'station_farewell', {
      societalRole:record.fromRole,
      formerProfession:record.formerProfession
    });
    record.queued = true;
    return true;
  };

  /* Exceptional elevation can take a serf straight into the gentry or an
     office without passing through a priced freedom route. The household's
     living spouses and descendants still leave bondage with its head, but
     only the elevated protagonist receives the higher personal station. */
  function releaseSerfFamilyOnPromotion(state, protagonist) {
    if (!state || !state.chars || !protagonist) return;
    const seen = {}, queue = [protagonist];
    seen[protagonist.id] = 1;
    function release(c) {
      if (!c || c.dead) return;
      if (FB.stationOf(c) < 1) c.station = 1;
      delete c.unfree;
    }
    release(protagonist);
    const spouses = FB.spousesSnapshot
      ? FB.spousesSnapshot(state, protagonist) : [];
    for (let i = 0; i < spouses.length; i++) release(spouses[i]);
    for (let i = 0; i < queue.length; i++) {
      const children = FB.childrenOf ? FB.childrenOf(state, queue[i]) : [];
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        if (!child || seen[child.id]) continue;
        seen[child.id] = 1;
        queue.push(child);
        release(child);
      }
    }
  }

  /* All runtime title changes pass here so role-gated work and travel cannot
     linger for a day after promotion or demotion. Callers still own realm
     transfers, announcements, and title-specific rewards. */
  FB.setPlayerTier = function (state, tier, opts) {
    opts = opts || {};
    const p = state.player;
    const oldTier = p.tier;
    tier = FB.clamp(Math.floor(tier), 0, 7);
    /* Preserve the outgoing dignity before a demotion can make it
       unrecoverable from current state. Reasserting the same tier also repairs
       additive status history in an older save. */
    if (!opts.skipOutgoingStatus && FB.notePlayerStatus) {
      FB.notePlayerStatus(state);
    }
    const current = state.chars && state.chars[p.charId];
    if (current) {
      current.station = FB.clamp(tier, 0, 4);
      if (tier === 0) current.unfree = true;
      else delete current.unfree;
    }
    if (tier === 0 && current) {
      const seen = {};
      const queue = [current];
      for (let i = 0; i < queue.length; i++) {
        const member = queue[i];
        if (!member || seen[member.id]) continue;
        seen[member.id] = 1;
        member.station = 0;
        member.unfree = true;
        const spouses = FB.spousesSnapshot
          ? FB.spousesSnapshot(state, member) : [];
        for (let j = 0; j < spouses.length; j++) {
          if (!seen[spouses[j].id]) queue.push(spouses[j]);
        }
        const children = FB.childrenOf ? FB.childrenOf(state, member) : [];
        for (let j = 0; j < children.length; j++) {
          if (!seen[children[j].id]) queue.push(children[j]);
        }
      }
    }
    if (oldTier === 0 && tier > 0) {
      releaseSerfFamilyOnPromotion(state, current);
    }
    if (tier === oldTier) return false;
    const oldRole = FB.societalRole(oldTier);
    const newRole = FB.societalRole(tier);
    p.tier = tier;
    if (tier > oldTier && FB.startProgression) {
      const unlocked = FB.startProgression.noteTier(tier);
      if (unlocked.startsChanged && FB.ui) {
        const names = ['Serf', 'Freeholder', 'Gentry', 'Baron'];
        const unlockedTier = Math.min(3, tier);
        FB.ui.toast('🔓 New beginnings unlocked through {station}.', {
          station:FB.T(names[unlockedTier])
        });
      }
    }
    if (oldTier === 2 && tier !== 2 && p.militaryCommand) {
      delete p.militaryCommand;
    }
    if (oldTier < 2 && tier >= 2) FB.markGentryRise(state);

    if (oldTier < 3 && tier >= 3 && opts.stationFarewell !== false) {
      p.stationFarewell = p.fired && p.fired.station_farewell ? null : {
          charId:p.charId,
          fromRole:oldRole,
          toRole:newRole,
          formerProfession:p.professionBack || p.profession,
          promotedTurn:state.turn,
          queued:false
        };
      if (FB.unassignEnterpriseWorker) {
        FB.unassignEnterpriseWorker(state, p.charId);
      }
    } else if (oldTier >= 3 && tier < 3) {
      p.stationFarewell = null;
      state.eventQueue = (state.eventQueue || []).filter(function (item) {
        return item.id !== 'station_farewell';
      });
    }

    if (tier >= 3 && !p.liege && opts.attachLiege !== false) {
      const rid = (state.holder && state.holder[p.provinceId]) || state.owner[p.provinceId];
      if (rid && rid !== 'player') {
        FB.changePlayerLiege(state, rid, 'tier:attach_liege');
      }
    }
    if (oldTier === 0 && tier > 0) {
      if (FB.closeSerfTenure) FB.closeSerfTenure(state, opts.tenureEndReason || 'rank_change');
      if (FB.serfParticipantRankChanged) {
        FB.serfParticipantRankChanged(state, !!opts.freedomResolution);
      }
      const freedomOffer = p.freedomOffer;
      if (freedomOffer && !opts.freedomResolution &&
          (freedomOffer.status === 'offered' ||
            freedomOffer.status === 'service')) {
        freedomOffer.status = 'invalid';
      }
    } else if (oldTier > 0 && tier === 0) {
      if (opts.formTenure !== false && FB.ensureSerfTenure) {
        FB.ensureSerfTenure(state, opts.tenureFormationReason || 'rank_change');
      }
    }
    if (FB.syncPlayerCareer) FB.syncPlayerCareer(state);
    if (FB.travelValidate) FB.travelValidate(state);
    if (FB.validateFocus) FB.validateFocus(state);
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    if (FB.repairPolitics) FB.repairPolitics(state);
    if (FB.localGovernmentTierChanged) FB.localGovernmentTierChanged(state);
    if (FB.notePlayerStatus) FB.notePlayerStatus(state);
    return true;
  };
  FB.fns.barony_offer_eligible = function (state) {
    const B = FBDATA.balance;
    const lord = FB.getRole(state, 'lord', true);
    return FB.gentryEstablished(state) &&
      state.player.prestige >= B.baronyPrestige &&
      !!lord && characterStanding(state, lord) >= B.baronyOpinion;
  };

  /* ---------- daily event selection ----------
     Queued events fire at once. Random events land on 1-2 pre-rolled "slot
     days" per season (scheduled in main.js), keeping the old seasonal pacing
     while days tick by. Event cooldowns in data are in seasons (90 days). */
  let randomEventPools = null;
  function randomEventPool(wartime, child) {
    if (!randomEventPools) {
      randomEventPools = { ordinary:[], wartime:[], childhood:[], wartimeChildhood:[] };
      for (const ev of FBDATA.events) {
        validateEventSerfFreedomEffects(ev);
        FB.validateEventParticipants(ev);
        FB.validateEducationEvent(ev);
        if (!ev.trigger || ev.trigger.never) continue;
        randomEventPools.ordinary.push(ev);
        if (ev.wartime) randomEventPools.wartime.push(ev);
        if (ev.childhood) randomEventPools.childhood.push(ev);
        if (ev.wartime && ev.childhood) randomEventPools.wartimeChildhood.push(ev);
      }
    }
    if (wartime) {
      return child ? randomEventPools.wartimeChildhood : randomEventPools.wartime;
    }
    return child ? randomEventPools.childhood : randomEventPools.ordinary;
  }

  FB.pickDailyEvents = function (state) {
    const out = [];
    FB.queueStationFarewellIfReady(state);
    /* One blocking decision per simulated day. Invalid entries may be skipped
       in the same pass, but later valid entries remain queued for later days
       so pausing after a choice really stops the event stream. */
    while (state.eventQueue.length && !out.length) {
      const qev = state.eventQueue.shift();
      /* queueEvent already stamps all five context defaults — only a queued
         item from a legacy save needs the repair copy */
      const qctx = qev.ctx || {};
      if (qctx.societalRole === undefined || qctx.profession === undefined ||
          qctx.formerProfession === undefined || qctx.protagonistId === undefined ||
          qctx.locationId === undefined) {
        qev.ctx = FB.eventContext(state, qev.ctx);
      }
      const queuedDef = FB.eventById(qev.id);
      if (queuedDef && !FB.ensureEventParticipants(state, queuedDef, qev.ctx)) {
        continue;
      }
      if (queuedDef &&
          queuedDef.contextValidator === 'plot_event_context_valid' &&
          !qev.ctx.plotId && state.player.plot) {
        const activePlotDef = FBDATA.plots[state.player.plot.id];
        if (activePlotDef && activePlotDef.event === qev.id) {
          qev.ctx.plotId = state.player.plot.id;
        }
      }
      if (!FB.eventContextStillValid(state, queuedDef, qev.ctx)) continue;
      // a tribute offer dies with its war: siege taken, terms sought, or the
      // campaign broken before the envoys were received
      if (qev.id === 'war_tribute_offer') {
        const qw = state.player.war;
        if (qw && !qw.defending &&
          qw.wins >= FBDATA.balance.warWinsToTakeProvince &&
          qw.losses < FBDATA.balance.warWinsToTakeProvince) out.push(qev);
        continue;
      }
      out.push(qev);
    }

    const slots = state.slotDays || [];
    const slotAt = slots.indexOf(state.date.day);
    const isSlot = slotAt >= 0;
    if (isSlot) {
      // consume ONE slot: two rolls landing on the same day stay two happenings
      slots.splice(slotAt, 1);
    }
    if (!isSlot || out.length) return out;
    /* The road supplies its own paced encounters. Queued home events that
       already existed still resolve above, but no new home slot event is
       selected while the traveler is away. */
    if (state.player.travel) return out;

    // personally at war: only wartime-tagged events fire; the rest of life waits
    const wartime = FB.atWarPersonally(state);
    // a child leads a child's life: only childhood-tagged events fire before 16
    const protagonistAge = FB.ageOf(
      state.chars[state.player.charId], state.date.year);
    const child = protagonistAge < 16;
    const eligible = [];
    const triggerSnapshot = { age:protagonistAge };
    const contextOptions = Object.create(null);
    function selectorOptions(selector) {
      if (!Object.prototype.hasOwnProperty.call(contextOptions, selector)) {
        contextOptions[selector] = FB.eventContextOptions
          ? FB.eventContextOptions(state, selector) : [];
      }
      return contextOptions[selector];
    }
    for (const ev of randomEventPool(wartime, child)) {
      if (ev.once && state.player.fired[ev.id]) continue;
      if (ev.cooldown && state.player.cooldowns[ev.id] !== undefined &&
        state.turn - state.player.cooldowns[ev.id] < ev.cooldown * 90) continue;
      if (!FB.checkTrigger(state, ev.trigger, undefined, triggerSnapshot)) continue;
      if (ev.contextSelector && !selectorOptions(ev.contextSelector).length) continue;
      if (ev.trigger.chance !== undefined && !FB.chance(ev.trigger.chance)) continue;
      eligible.push(ev);
    }
    if (eligible.length) {
      let total = 0;
      for (const ev of eligible) total += (ev.weight || 5);
      let roll = FB.rng() * total;
      let chosen = eligible[0];
      for (let i = 0; i < eligible.length; i++) {
        roll -= (eligible[i].weight || 5);
        if (roll <= 0) { chosen = eligible[i]; break; }
      }
      let selectedContext = {};
      if (chosen.contextSelector) {
        const contexts = selectorOptions(chosen.contextSelector);
        if (!contexts.length) return out;
        selectedContext = FB.pick(contexts);
      }
      const ctx = FB.eventContextFor(state, chosen, selectedContext);
      if (!ctx) return out;
      // events about "a young child" name (and afflict) one actual child, so
      // the text and any killChild effect speak of the same person
      if (chosen.trigger.hasYoungChild) {
        const me = state.chars[state.player.charId];
        const young = [];
        for (const cid of me.childrenIds) {
          const c = state.chars[cid];
          if (c && !c.dead && FB.ageOf(c, state.date.year) < 13) young.push(c);
        }
        if (young.length) ctx.childId = FB.pick(young).id;
      }
      out.push({ id: chosen.id, ctx: ctx, rnd: true }); // rnd marks an everyday (slot-day) event for autoresolve
    }
    return out;
  };

  /* id → event index, built on first use. Mod merges explicitly invalidate it
     so same-page validation/tools and ordinary boot share one lookup contract. */
  let eventIndex = null;
  FB.eventById = function (id) {
    if (!eventIndex) {
      eventIndex = {};
      for (const ev of FBDATA.events) {
        validateEventSerfFreedomEffects(ev);
        FB.validateEventParticipants(ev);
        FB.validateEducationEvent(ev);
        eventIndex[ev.id] = ev;
      }
    }
    return eventIndex[id] || null;
  };
  FB.invalidateEventIndex = function () {
    eventIndex = null;
    randomEventPools = null;
    _validatedTenureCatalogue = null;
  };

  /* =========================================================================
     Persistent serf tenure (tier 0 households).
     Customary obligations, rights, pure selection, and daily scheduler.
     ========================================================================= */

  let _validatedTenureCatalogue = null;

  function currentRealmWarId(state, provId) {
    if (!state || !provId) return null;
    const rid = state.owner && state.owner[provId];
    if (!rid) return null;
    const sovereign = FB.topRealm ? FB.topRealm(state, rid) : rid;
    if (!sovereign) return null;

    if (state.player && state.player.war) {
      const pw = state.player.war;
      const pTop = FB.playerRealmId ? FB.playerRealmId(state) : 'player';
      const eTop = FB.topRealm ? FB.topRealm(state, pw.enemy) : pw.enemy;
      if (sovereign === 'player' || sovereign === pTop || sovereign === eTop) {
        return ['player', eTop || 'enemy'].sort().join(':');
      }
    }

    const r = state.realms && state.realms[sovereign];
    if (r && r.war && r.alive) {
      const eTop = FB.topRealm ? FB.topRealm(state, r.war.enemy) : r.war.enemy;
      return [sovereign, eTop].sort().join(':');
    }

    if (state.realms) {
      for (const id in state.realms) {
        const rr = state.realms[id];
        if (rr.alive && rr.war) {
          const target = FB.topRealm ? FB.topRealm(state, rr.war.enemy) : rr.war.enemy;
          if (target === sovereign) {
            return [id, sovereign].sort().join(':');
          }
        }
      }
    }

    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, sovereign)) {
      return 'ghw:' + sovereign;
    }
    return null;
  }

  FB.validateTenureData = function (catalogue, dutiesCatalogue, rightsCatalogue) {
    catalogue = catalogue || (FBDATA && FBDATA.tenureArchetypes);
    dutiesCatalogue = dutiesCatalogue || (FBDATA && FBDATA.tenureDuties);
    rightsCatalogue = rightsCatalogue || (FBDATA && FBDATA.tenureRights);

    if (!catalogue || typeof catalogue !== 'object') {
      throw new Error('Tenure catalogue must be an object.');
    }
    if (!dutiesCatalogue || typeof dutiesCatalogue !== 'object') {
      throw new Error('Tenure duties catalogue must be an object.');
    }
    if (!rightsCatalogue || typeof rightsCatalogue !== 'object') {
      throw new Error('Tenure rights catalogue must be an object.');
    }

    const knownTerrains = ['farmland', 'forest', 'hills', 'mountains', 'desert', 'steppe', 'marsh', 'tundra', 'plains', 'oasis', 'coast', 'floodplain'];
    const knownSettlementKinds = ['village', 'town', 'castle', 'monastery', 'city', 'camp'];
    const knownTraditions = FBDATA.cultureTraditions ? Object.keys(FBDATA.cultureTraditions) : [];
    const knownFaithAncestors = ['catholic', 'orthodox', 'muslim', 'pagan', 'sunni', 'shia', 'jewish', 'tengri', 'christian'];
    const knownBookmarks = FBDATA.bookmarks ? Object.keys(FBDATA.bookmarks) : [];
    const knownCultures = FBDATA.cultures ? Object.keys(FBDATA.cultures) : [];
    const knownProvinceIds = [];
    for (let b = 0; b < knownBookmarks.length; b++) {
      const bookmark = FBDATA.bookmarks[knownBookmarks[b]];
      const provinces = (bookmark && bookmark.provinces) || {};
      for (const provinceKey in provinces) {
        if (!Object.prototype.hasOwnProperty.call(provinces, provinceKey)) continue;
        const province = provinces[provinceKey];
        const provinceId = province && province.id || provinceKey;
        if (provinceId && knownProvinceIds.indexOf(provinceId) < 0) {
          knownProvinceIds.push(provinceId);
        }
      }
    }
    const selectorFields = {
      bookmarksAny:1, culturesAny:1, faithAncestor:1,
      traditionsAny:1, provinceIdsAny:1, terrainAny:1,
      coastal:1, settlementKindsAny:1, dev0Min:1, dev0Max:1,
      minDev0:1
    };

    for (const dutyKey in dutiesCatalogue) {
      if (!Object.prototype.hasOwnProperty.call(dutiesCatalogue, dutyKey)) continue;
      const dDef = dutiesCatalogue[dutyKey];
      if (!dDef || typeof dDef !== 'object') throw new Error('Tenure duty ' + dutyKey + ' must be an object.');
      if (!dDef.name && !dDef.nameKey) throw new Error('Tenure duty ' + dutyKey + ' missing name/nameKey.');
      if (!dDef.desc && !dDef.descKey) throw new Error('Tenure duty ' + dutyKey + ' missing desc/descKey.');
    }

    for (const rightKey in rightsCatalogue) {
      if (!Object.prototype.hasOwnProperty.call(rightsCatalogue, rightKey)) continue;
      const rDef = rightsCatalogue[rightKey];
      if (!rDef || typeof rDef !== 'object') throw new Error('Tenure right ' + rightKey + ' must be an object.');
      if (!rDef.name && !rDef.nameKey) throw new Error('Tenure right ' + rightKey + ' missing name/nameKey.');
      if (!rDef.desc && !rDef.descKey) throw new Error('Tenure right ' + rightKey + ' missing desc/descKey.');
    }

    let unconditionalFallbackCount = 0;
    const seenArchetypeKeys = {};
    const seenArchetypeIds = {};

    for (const archKey in catalogue) {
      if (!Object.prototype.hasOwnProperty.call(catalogue, archKey)) continue;
      if (seenArchetypeKeys[archKey]) throw new Error('Duplicate archetype key: ' + archKey);
      seenArchetypeKeys[archKey] = true;

      const arch = catalogue[archKey];
      if (!arch || typeof arch !== 'object') throw new Error('Archetype ' + archKey + ' must be an object.');
      const archId = arch.id || archKey;
      if (seenArchetypeIds[archId]) throw new Error('Duplicate archetype ID: ' + archId);
      seenArchetypeIds[archId] = true;

      if (typeof arch.priority !== 'number' || arch.priority < 0) {
        throw new Error('Archetype ' + archKey + ' priority must be a non-negative number.');
      }
      if ((!arch.name && !arch.nameKey) || (!arch.desc && !arch.summaryKey && !arch.descKey)) {
        throw new Error('Archetype ' + archKey + ' must have name/desc localization fields.');
      }

      const sel = arch.selector;
      if (!sel || typeof sel !== 'object') throw new Error('Archetype ' + archKey + ' selector must be an object.');

      for (const selectorField in sel) {
        if (!selectorFields[selectorField]) {
          throw new Error('Archetype ' + archKey + ' selector has unknown field ' + selectorField + '.');
        }
      }

      const hasConstraints = Object.keys(sel).length > 0;
      if (arch.priority === 0 && !hasConstraints) unconditionalFallbackCount++;

      const arraySelectors = [
        { field:'bookmarksAny', known:knownBookmarks, noun:'bookmark' },
        { field:'culturesAny', known:knownCultures, noun:'culture' },
        { field:'traditionsAny', known:knownTraditions, noun:'culture tradition' },
        { field:'provinceIdsAny', known:knownProvinceIds, noun:'province' },
        { field:'terrainAny', known:knownTerrains, noun:'terrain' },
        { field:'settlementKindsAny', known:knownSettlementKinds, noun:'settlement kind' }
      ];
      for (let a = 0; a < arraySelectors.length; a++) {
        const rule = arraySelectors[a];
        if (sel[rule.field] === undefined) continue;
        if (!Array.isArray(sel[rule.field]) || !sel[rule.field].length) {
          throw new Error('Archetype ' + archKey + ' selector ' + rule.field +
            ' must be a non-empty array.');
        }
        for (let v = 0; v < sel[rule.field].length; v++) {
          const value = sel[rule.field][v];
          if (sel[rule.field].indexOf(value) !== v) {
            throw new Error('Archetype ' + archKey + ' selector ' + rule.field +
              ' contains duplicate value ' + value + '.');
          }
          if (rule.known.length && rule.known.indexOf(value) < 0) {
            throw new Error('Archetype ' + archKey + ' selector ' + rule.field +
              ' names unknown ' + rule.noun + ': ' + value);
          }
        }
      }

      if (sel.provinceIdsAny && !sel.bookmarksAny) {
        throw new Error('Archetype ' + archKey +
          ' selector provinceIdsAny requires bookmarksAny.');
      }
      if (sel.coastal !== undefined && typeof sel.coastal !== 'boolean') {
        throw new Error('Archetype ' + archKey + ' selector coastal must be boolean.');
      }
      if (sel.dev0Min !== undefined && sel.minDev0 !== undefined) {
        throw new Error('Archetype ' + archKey +
          ' selector may not declare both dev0Min and legacy minDev0.');
      }
      const minimumDev = sel.dev0Min !== undefined ? sel.dev0Min : sel.minDev0;
      for (const devField of ['dev0Min','dev0Max','minDev0']) {
        if (sel[devField] !== undefined &&
            (!Number.isInteger(sel[devField]) || sel[devField] < 1 || sel[devField] > 10)) {
          throw new Error('Archetype ' + archKey + ' selector ' + devField +
            ' must be an integer within development 1–10.');
        }
      }
      if (minimumDev !== undefined && sel.dev0Max !== undefined &&
          minimumDev > sel.dev0Max) {
        throw new Error('Archetype ' + archKey +
          ' selector dev0Min may not exceed dev0Max.');
      }

      const expectedWorkLabelKey = 'tenure_work_' + archId + '_label';
      const expectedWorkDescriptionKey = 'tenure_work_' + archId + '_desc';
      if (arch.workLabelKey !== expectedWorkLabelKey ||
          typeof arch.workLabel !== 'string' || !arch.workLabel) {
        throw new Error('Archetype ' + archKey +
          ' has unknown workLabelKey or missing workLabel.');
      }
      if (arch.workDescriptionKey !== expectedWorkDescriptionKey ||
          typeof arch.workDescription !== 'string' || !arch.workDescription) {
        throw new Error('Archetype ' + archKey +
          ' has unknown workDescriptionKey or missing workDescription.');
      }

      if (sel.faithAncestor && knownFaithAncestors.indexOf(sel.faithAncestor) < 0 &&
          !(FBDATA.religions && FBDATA.religions[sel.faithAncestor])) {
        throw new Error('Archetype ' + archKey + ' names unknown faith ancestor: ' + sel.faithAncestor);
      }
      const slots = arch.contextSlots || [];
      const seenSlotIds = {};
      for (let s = 0; s < slots.length; s++) {
        const slot = slots[s];
        if (!slot || !slot.id) throw new Error('Archetype ' + archKey + ' context slot missing id.');
        if (seenSlotIds[slot.id]) throw new Error('Archetype ' + archKey + ' duplicate context slot ID: ' + slot.id);
        seenSlotIds[slot.id] = true;
        if (!slot.fallback || !FB.eventById(slot.fallback)) {
          throw new Error('Archetype ' + archKey + ' context slot ' + slot.id + ' missing valid fallback event.');
        }
        const cases = slot.cases || [];
        for (let c = 0; c < cases.length; c++) {
          const cs = cases[c];
          if (!cs.eventId || !FB.eventById(cs.eventId)) {
            throw new Error('Archetype ' + archKey + ' slot ' + slot.id + ' case missing valid eventId.');
          }
          if (cs.terrainAny) {
            for (let t = 0; t < cs.terrainAny.length; t++) {
              if (knownTerrains.indexOf(cs.terrainAny[t]) < 0) {
                throw new Error('Archetype ' + archKey + ' slot ' + slot.id + ' case names unknown terrain: ' + cs.terrainAny[t]);
              }
            }
          }
          if (cs.settlementKindsAny) {
            for (let k = 0; k < cs.settlementKindsAny.length; k++) {
              if (knownSettlementKinds.indexOf(cs.settlementKindsAny[k]) < 0) {
                throw new Error('Archetype ' + archKey + ' slot ' + slot.id + ' case names unknown settlement kind: ' + cs.settlementKindsAny[k]);
              }
            }
          }
        }
      }

      const duties = arch.duties || [];
      if (!Array.isArray(duties) || duties.length < 2 || duties.length > 4) {
        throw new Error('Archetype ' + archKey + ' duties must be an array of 2 to 4 items.');
      }
      const archDutyIds = {};
      for (let i = 0; i < duties.length; i++) {
        const d = duties[i];
        if (!d || !d.id) throw new Error('Archetype ' + archKey + ' duty missing id.');
        if (archDutyIds[d.id]) throw new Error('Archetype ' + archKey + ' duplicate duty ID: ' + d.id);
        archDutyIds[d.id] = true;

        if (!dutiesCatalogue[d.id]) {
          throw new Error('Archetype ' + archKey + ' duty ' + d.id + ' missing from duties catalogue.');
        }
        if (typeof d.intervalTurns !== 'number' || d.intervalTurns <= 0) {
          throw new Error('Archetype ' + archKey + ' duty ' + d.id + ' intervalTurns must be positive.');
        }
        const hasEvent = d.eventId && FB.eventById(d.eventId);
        const hasSlot = seenSlotIds[d.id];
        if (!hasEvent && !hasSlot) {
          throw new Error('Archetype ' + archKey + ' duty ' + d.id + ' must have either a valid eventId or contextSlot mapping.');
        }
      }

      const conditional = arch.conditionalDuties || [];
      for (let cd = 0; cd < conditional.length; cd++) {
        const cDuty = conditional[cd];
        if (!cDuty || !cDuty.id) throw new Error('Archetype ' + archKey + ' conditional duty missing id.');
        if (archDutyIds[cDuty.id]) throw new Error('Archetype ' + archKey + ' duplicate duty ID: ' + cDuty.id);
        archDutyIds[cDuty.id] = true;
        if (!dutiesCatalogue[cDuty.id]) {
          throw new Error('Archetype ' + archKey + ' conditional duty ' + cDuty.id + ' missing from duties catalogue.');
        }
        if (!cDuty.eventId || !FB.eventById(cDuty.eventId)) {
          throw new Error('Archetype ' + archKey + ' conditional duty ' + cDuty.id + ' names unknown eventId.');
        }
      }

      const rights = arch.rights || [];
      if (!Array.isArray(rights) || rights.length > 2) {
        throw new Error('Archetype ' + archKey + ' rights must be an array of at most 2 items.');
      }
      const archRightIds = {};
      for (let r = 0; r < rights.length; r++) {
        const rItem = rights[r];
        const rId = typeof rItem === 'string' ? rItem : (rItem && rItem.rightId);
        if (!rId) throw new Error('Archetype ' + archKey + ' right missing ID.');
        if (archRightIds[rId]) throw new Error('Archetype ' + archKey + ' duplicate right ID: ' + rId);
        archRightIds[rId] = true;
        if (!rightsCatalogue[rId]) {
          throw new Error('Archetype ' + archKey + ' right ' + rId + ' missing from rights catalogue.');
        }
        if (typeof rItem === 'object' && rItem.terrainAny) {
          for (let t = 0; t < rItem.terrainAny.length; t++) {
            if (knownTerrains.indexOf(rItem.terrainAny[t]) < 0) {
              throw new Error('Archetype ' + archKey + ' right ' + rId + ' names unknown terrain: ' + rItem.terrainAny[t]);
            }
          }
        }
      }

      const transitionTerms = arch.transitionTerms || {};
      const transitionTermKeys = Object.keys(transitionTerms);
      for (let tt = 0; tt < transitionTermKeys.length; tt++) {
        if (['commutableDuties','additionalDuty'].indexOf(
            transitionTermKeys[tt]) < 0) {
          throw new Error('Archetype ' + archKey +
            ' transitionTerms has unknown field ' + transitionTermKeys[tt] + '.');
        }
      }
      const commutable = transitionTerms.commutableDuties || [];
      if (!Array.isArray(commutable)) {
        throw new Error('Archetype ' + archKey +
          ' transitionTerms.commutableDuties must be an array.');
      }
      for (let ct = 0; ct < commutable.length; ct++) {
        if (!archDutyIds[commutable[ct]] ||
            commutable.indexOf(commutable[ct]) !== ct) {
          throw new Error('Archetype ' + archKey +
            ' names a duplicate or non-customary commutable duty ' +
            commutable[ct] + '.');
        }
      }
      const additional = transitionTerms.additionalDuty;
      if (additional) {
        if (!additional.id || archDutyIds[additional.id] ||
            Object.keys(additional).sort().join(',') !==
              'eventId,firstDueSeason,id,intervalTurns' ||
            !dutiesCatalogue[additional.id] ||
            !additional.eventId || !FB.eventById(additional.eventId) ||
            ['spring','summer','autumn','winter'].indexOf(
              additional.firstDueSeason) < 0 ||
            additional.intervalTurns !== 1440) {
          throw new Error('Archetype ' + archKey +
            ' has invalid additional transition duty terms.');
        }
      }
    }

    if (!catalogue.dependent_farming || unconditionalFallbackCount !== 1) {
      throw new Error('Tenure catalogue must contain exactly one unconditional fallback archetype (found ' + unconditionalFallbackCount + ').');
    }

    if (catalogue === FBDATA.tenureArchetypes) {
      _validatedTenureCatalogue = catalogue;
    }
    return catalogue;
  };

  function sortedTenureArchetypes(catalogue) {
    const archetypes = [];
    let declIndex = 0;
    for (const key in catalogue) {
      if (Object.prototype.hasOwnProperty.call(catalogue, key)) {
        archetypes.push({ arch: catalogue[key], declIndex: declIndex++ });
      }
    }
    archetypes.sort(function (a, b) {
      const pDiff = (b.arch.priority || 0) - (a.arch.priority || 0);
      if (pDiff !== 0) return pDiff;
      return a.declIndex - b.declIndex;
    });
    return archetypes;
  }

  function tenureSelectorFailures(state, context, arch) {
    const sel = arch.selector || {};
    const failed = [];
    const bookmarkId = context.bookmarkId || context.bookmark;
    if (sel.bookmarksAny && sel.bookmarksAny.indexOf(bookmarkId) < 0) {
      failed.push('bookmarksAny');
    }
    if (sel.culturesAny && sel.culturesAny.indexOf(context.culture) < 0) {
      failed.push('culturesAny');
    }
    if (sel.faithAncestor) {
      const matchesFaith = context.faith && state && FB.faithIsA
        ? FB.faithIsA(context.faith, sel.faithAncestor, state)
        : (context.faith === sel.faithAncestor ||
          (FBDATA.religions && FBDATA.religions[context.faith] &&
            (FBDATA.religions[context.faith].parent === sel.faithAncestor ||
             FBDATA.religions[context.faith].group === sel.faithAncestor)));
      if (!matchesFaith) failed.push('faithAncestor');
    }
    if (sel.traditionsAny) {
      const cul = FBDATA.cultures && FBDATA.cultures[context.culture];
      const tradition = cul ? cul.tradition : null;
      if (!tradition || sel.traditionsAny.indexOf(tradition) < 0) {
        failed.push('traditionsAny');
      }
    }
    if (sel.provinceIdsAny && sel.provinceIdsAny.indexOf(context.provinceId) < 0) {
      failed.push('provinceIdsAny');
    }
    if (sel.terrainAny && sel.terrainAny.indexOf(context.terrain) < 0) {
      failed.push('terrainAny');
    }
    if (sel.coastal !== undefined &&
        (typeof context.coastal !== 'boolean' || context.coastal !== sel.coastal)) {
      failed.push('coastal');
    }
    if (sel.settlementKindsAny &&
        sel.settlementKindsAny.indexOf(context.settlementKind) < 0) {
      failed.push('settlementKindsAny');
    }
    const minimumDev = sel.dev0Min !== undefined ? sel.dev0Min : sel.minDev0;
    const development = Number(context.dev0);
    if (minimumDev !== undefined &&
        (!isFinite(development) || development < minimumDev)) {
      failed.push('dev0Min');
    }
    if (sel.dev0Max !== undefined &&
        (!isFinite(development) || development > sel.dev0Max)) {
      failed.push('dev0Max');
    }
    return failed;
  }

  function tenureSelectionReport(state, context, catalogue) {
    const archetypes = sortedTenureArchetypes(catalogue);
    const matched = [];
    const rejected = [];
    let selected = null;
    for (let i = 0; i < archetypes.length; i++) {
      const arch = archetypes[i].arch;
      const failed = tenureSelectorFailures(state, context, arch);
      if (failed.length) {
        rejected.push({ archetypeId:arch.id, fields:failed });
      } else {
        matched.push(arch.id);
        if (!selected) selected = arch;
      }
    }
    if (!selected) {
      selected = catalogue.dependent_farming || archetypes[archetypes.length - 1].arch;
    }
    return {
      selected:selected,
      archetypeId:selected && selected.id,
      matched:matched,
      rejected:rejected
    };
  }

  FB.serfTenureSelection = function (state, formationInput) {
    const catalogue = _validatedTenureCatalogue || FB.validateTenureData();
    return tenureSelectionReport(state, formationInput || {}, catalogue).selected;
  };

  FB.serfTenureSelectionReason = function (state, formationInput) {
    const catalogue = _validatedTenureCatalogue || FB.validateTenureData();
    const report = tenureSelectionReport(state, formationInput || {}, catalogue);
    return {
      archetypeId:report.archetypeId,
      matched:report.matched.slice(),
      rejected:report.rejected.map(function (entry) {
        return { archetypeId:entry.archetypeId, fields:entry.fields.slice() };
      })
    };
  };

  FB.selectSerfTenureArchetype = function (context, catalogue) {
    catalogue = catalogue || _validatedTenureCatalogue || FB.validateTenureData();
    context = context || {};
    const selected = tenureSelectionReport(context.state, context, catalogue).selected;

    const resolvedDuties = [];
    const slotsMap = {};
    for (let s = 0; s < (selected.contextSlots || []).length; s++) {
      const slot = selected.contextSlots[s];
      let matchedEventId = slot.fallback;
      let matchedFirstDue = slot.fallbackFirstDue || null;
      for (let c = 0; c < (slot.cases || []).length; c++) {
        const slotCase = slot.cases[c];
        let matches = true;
        if (slotCase.terrainAny && slotCase.terrainAny.indexOf(context.terrain) < 0) {
          matches = false;
        }
        if (matches && slotCase.settlementKindsAny && slotCase.settlementKindsAny.indexOf(context.settlementKind) < 0) {
          matches = false;
        }
        if (matches) {
          matchedEventId = slotCase.eventId;
          if (slotCase.firstDue) matchedFirstDue = slotCase.firstDue;
          break;
        }
      }
      slotsMap[slot.id] = { eventId: matchedEventId, firstDue: matchedFirstDue };
    }

    for (let d = 0; d < (selected.duties || []).length; d++) {
      const duty = selected.duties[d];
      const slotKey = duty.contextSlotId || duty.id;
      const slotResolution = slotsMap[slotKey];
      let eventId = duty.eventId;
      let firstDue = duty.firstDue;
      if (slotResolution) {
        if (slotResolution.eventId) eventId = slotResolution.eventId;
        if (slotResolution.firstDue) firstDue = slotResolution.firstDue;
      }
      resolvedDuties.push({
        id: duty.id,
        eventId: eventId,
        firstDue: firstDue,
        intervalTurns: duty.intervalTurns
      });
    }

    const resolvedRights = [];
    for (let r = 0; r < (selected.rights || []).length; r++) {
      const right = selected.rights[r];
      if (typeof right === 'string') {
        resolvedRights.push(right);
      } else if (right && typeof right === 'object') {
        let eligible = true;
        if (right.terrainAny && right.terrainAny.indexOf(context.terrain) < 0) {
          eligible = false;
        }
        if (eligible) {
          const rId = right.rightId || right.id;
          if (rId) resolvedRights.push(rId);
        }
      }
    }

    return {
      archetype: selected,
      resolvedDuties: resolvedDuties,
      resolvedRights: resolvedRights
    };
  };

  function serfTenureDueCandidate(tenure, id, conditional, index) {
    const list = conditional ? tenure.conditional : tenure.duties;
    const duty = list && list[index];
    const turn = duty && conditional ? duty.pendingTurn :
      (duty ? duty.nextDueTurn : null);
    if (!duty || duty.id !== id || !Number.isInteger(turn) || turn < 0) {
      return null;
    }
    return { duty:duty, turn:turn, conditional:!!conditional, index:index };
  }

  /* The saved pointer is semantic scheduling state, not presentation. Daily
     tenure work reads it in constant time; only formation, normalization,
     resolution, and explicit tenure mutations scan the household's bounded
     duty lists to replace it. */
  FB.refreshSerfTenureDueCache = function (state, tenure) {
    tenure = tenure || FB.activeSerfTenure(state);
    if (!tenure || tenure.status !== 'active') return null;
    let nearest = null;
    function consider(duty, conditional, index) {
      if (!duty || !FBDATA.tenureDuties ||
          !FBDATA.tenureDuties[duty.id] || !FB.eventById(duty.eventId)) return;
      const turn = conditional ? duty.pendingTurn : duty.nextDueTurn;
      if (!Number.isInteger(turn) || turn < 0) return;
      if (!nearest || turn < nearest.turn) {
        nearest = {
          duty:duty, turn:turn, conditional:conditional, index:index
        };
      }
    }
    for (let i = 0; i < (tenure.duties || []).length; i++) {
      consider(tenure.duties[i], false, i);
    }
    for (let i = 0; i < (tenure.conditional || []).length; i++) {
      consider(tenure.conditional[i], true, i);
    }
    tenure.nextDutyId = nearest ? nearest.duty.id : null;
    tenure.nextDutyTurn = nearest ? nearest.turn : null;
    tenure.nextDutyConditional = nearest ? nearest.conditional : false;
    tenure.nextDutyIndex = nearest ? nearest.index : null;
    return nearest;
  };

  FB.wakeSerfTenureWarCheck = function (state) {
    const tenure = FB.activeSerfTenure(state);
    if (!tenure) return false;
    tenure.nextWarCheckTurn = state.turn || 0;
    return true;
  };

  function cachedSerfTenureDue(state, tenure) {
    if (tenure.nextDutyId === null && tenure.nextDutyTurn === null) return null;
    if (typeof tenure.nextDutyId !== 'string' ||
        !Number.isInteger(tenure.nextDutyTurn) ||
        !Number.isInteger(tenure.nextDutyIndex) ||
        typeof tenure.nextDutyConditional !== 'boolean') {
      return FB.refreshSerfTenureDueCache(state, tenure);
    }
    const cached = serfTenureDueCandidate(tenure, tenure.nextDutyId,
      tenure.nextDutyConditional, tenure.nextDutyIndex);
    if (!cached || cached.turn !== tenure.nextDutyTurn) {
      return FB.refreshSerfTenureDueCache(state, tenure);
    }
    return cached;
  }

  FB.ensureSerfTenure = function (state, formedBy) {
    if (!state || !state.player || state.player.tier !== 0) return null;
    const p = state.player;
    if (p.tenure && p.tenure.status === 'active') {
      normalizeSerfTenure(state, p.tenure);
      return p.tenure;
    }

    FB.validateTenureData();
    const homeProvId = p.provinceId || p.home;
    if (!homeProvId) return null;

    const char = state.chars && p.charId && state.chars[p.charId];
    if (!char) return null;

    const settIdx = (p.homeSettlement !== undefined ? p.homeSettlement : (p.settlement !== undefined ? p.settlement : 0)) | 0;
    const prov = (FB.world && FB.world.byId && FB.world.byId[homeProvId]) ||
      (state.provinces && state.provinces[homeProvId]) || {};
    const terrain = prov.terrain || 'farmland';
    const dev0 = prov.dev0 !== undefined ? prov.dev0 : 0;

    let settlementKind = 'village';
    const sitesInfo = FB.world && FB.world.sitesByProv && FB.world.sitesByProv[homeProvId];
    if (sitesInfo && sitesInfo.list && sitesInfo.list[settIdx] && sitesInfo.list[settIdx].kind) {
      settlementKind = sitesInfo.list[settIdx].kind;
    }

    const culture = char.culture || p.culture;
    const faith = char.religion || p.religion;
    const bookmarkId = (state.start && state.start.id) || '867';
    const houseId = p.houseFounderId || p.charId || 'household';

    const selected = FB.selectSerfTenureArchetype({
      provinceId: homeProvId,
      settlementIndex: settIdx,
      culture: culture,
      faith: faith,
      terrain: terrain,
      coastal: !!prov.coastal,
      dev0: dev0,
      settlementKind: settlementKind,
      bookmarkId: bookmarkId,
      houseId: houseId,
      state: state
    });

    const seasonMap = { spring: 0, summer: 1, autumn: 2, winter: 3 };
    function calculateFirstDue(firstDue, intervalTurns) {
      firstDue = firstDue || { season: 0, day: 30, cycle: 0 };
      const sIdx = typeof firstDue.season === 'string'
        ? (seasonMap[firstDue.season.toLowerCase()] !== undefined ? seasonMap[firstDue.season.toLowerCase()] : 0)
        : (firstDue.season || 0);
      const targetYear = state.date.year + (firstDue.cycle || 0);
      const targetDay = firstDue.day || 30;
      const targetOrdinal = targetYear * 360 + sIdx * 90 + (targetDay - 1);
      const currentOrdinal = FB.dateOrdinal(state.date);
      let diff = targetOrdinal - currentOrdinal;
      while (diff < 0) {
        diff += (intervalTurns || 720);
      }
      return (state.turn || 0) + diff;
    }

    const duties = [];
    for (let d = 0; d < selected.resolvedDuties.length; d++) {
      const duty = selected.resolvedDuties[d];
      const nextDueTurn = calculateFirstDue(duty.firstDue, duty.intervalTurns);
      duties.push({
        id: duty.id,
        eventId: duty.eventId,
        nextDueTurn: nextDueTurn,
        lastResolvedTurn: null
      });
    }

    const conditional = [];
    const archDef = selected.archetype;
    for (let c = 0; c < (archDef.conditionalDuties || []).length; c++) {
      const cd = archDef.conditionalDuties[c];
      conditional.push({
        id: cd.id,
        eventId: cd.eventId,
        pendingTurn: null,
        lastResolvedTurn: null,
        nextEligibleTurn: state.turn || 0,
        currentWarId: null
      });
    }

    const allowedFormedBy = {
      new_game: 1, legacy_repair: 1, debt_bondage: 1,
      commendation: 1, forced_settlement: 1, rank_change: 1
    };
    const validFormedBy = (formedBy && allowedFormedBy[formedBy]) ? formedBy : 'new_game';

    const tenure = {
      version: 1,
      archetypeId: archDef.id,
      formedTurn: state.turn || 0,
      formedBy: validFormedBy,
      status: 'active',
      provinceId: homeProvId,
      settlement: settIdx,
      rights: selected.resolvedRights.slice(),
      duties: duties,
      conditional: conditional,
      lastPresentedSeasonKey: null,
      nextDutyId:null,
      nextDutyTurn:null,
      nextDutyConditional:false,
      nextDutyIndex:null,
      nextWarCheckTurn:state.turn || 0,
      revision:0,
      transitionHistory:[],
      transitionEligibleTurn:state.turn || 0
    };

    p.tenure = tenure;
    FB.refreshSerfTenureDueCache(state, tenure);
    normalizeSerfTenure(state, tenure);
    return tenure;
  };

  FB.activeSerfTenure = function (state) {
    return (state && state.player && state.player.tier === 0 &&
      state.player.tenure && state.player.tenure.status === 'active')
      ? state.player.tenure : null;
  };

  const SERF_TRANSITION_CAUSES = [
    'local_lord_succession','county_transfer','holder_succession',
    'sovereign_change','custom_confirmed','custom_unconfirmed','war_pressure'
  ];
  const SERF_TRANSITION_PROPOSALS = [
    'confirm','add_duty','commute_duty','challenge_right','restore_right'
  ];
  const SERF_FAITH_SEVERITY = {
    same:0, in_fold:1, schismatic:2, foreign:3, hostile:4
  };
  const SERF_AUTHORITY_FIELDS = [
    'provinceId','settlement','localLordId','holderRealmId','holderGeneration',
    'sovereignRealmId','sovereignGeneration','rulerCultureId',
    'rulerCultureTraditionId','rulerFaithId','householdFaithRelation'
  ];

  function authorityValue(value) {
    return value === undefined ? null : value;
  }

  function copySerfAuthority(source) {
    if (!source || typeof source !== 'object') return null;
    const out = {};
    for (let i = 0; i < SERF_AUTHORITY_FIELDS.length; i++) {
      const field = SERF_AUTHORITY_FIELDS[i];
      out[field] = authorityValue(source[field]);
    }
    return out;
  }

  function serfAuthorityEqual(a, b) {
    if (!a || !b) return a === b;
    for (let i = 0; i < SERF_AUTHORITY_FIELDS.length; i++) {
      const field = SERF_AUTHORITY_FIELDS[i];
      if (authorityValue(a[field]) !== authorityValue(b[field])) return false;
    }
    return true;
  }

  function serfAuthorityValid(state, authority, tenure) {
    if (!authority || typeof authority !== 'object' || Array.isArray(authority)) {
      return false;
    }
    if (authority.provinceId !== tenure.provinceId ||
        authority.settlement !== tenure.settlement) return false;
    for (let i = 0; i < SERF_AUTHORITY_FIELDS.length; i++) {
      const field = SERF_AUTHORITY_FIELDS[i];
      if (!Object.prototype.hasOwnProperty.call(authority, field)) return false;
    }
    if (Object.keys(authority).length !== SERF_AUTHORITY_FIELDS.length) {
      return false;
    }
    if (authority.localLordId !== null &&
        !(state.chars && state.chars[authority.localLordId])) return false;
    for (const realmField of ['holderRealmId','sovereignRealmId']) {
      const rid = authority[realmField];
      if (rid !== null && rid !== 'player' &&
          !(state.realms && state.realms[rid])) return false;
    }
    for (const generationField of ['holderGeneration','sovereignGeneration']) {
      const generation = authority[generationField];
      if (generation !== null &&
          (!Number.isInteger(generation) || generation < 0)) return false;
    }
    if (authority.rulerCultureId !== null &&
        !(FBDATA.cultures && FBDATA.cultures[authority.rulerCultureId])) {
      return false;
    }
    if (authority.rulerCultureTraditionId !== null &&
        !(FBDATA.cultureTraditions &&
          FBDATA.cultureTraditions[authority.rulerCultureTraditionId])) {
      return false;
    }
    if (authority.rulerCultureId !== null &&
        (FBDATA.cultures[authority.rulerCultureId].tradition || null) !==
          authority.rulerCultureTraditionId) return false;
    if (authority.rulerFaithId !== null && FB.faithExists &&
        !FB.faithExists(authority.rulerFaithId, state)) return false;
    if (authority.householdFaithRelation !== null &&
        SERF_FAITH_SEVERITY[authority.householdFaithRelation] === undefined) {
      return false;
    }
    return true;
  }

  function serfHomeSettlementKind(state, tenure) {
    const sites = FB.world && FB.world.sitesByProv &&
      FB.world.sitesByProv[tenure.provinceId];
    const site = sites && sites.list &&
      (sites.list[tenure.settlement] || sites.list[0]);
    return site && site.kind || 'village';
  }

  function serfRealmPoliticalIdentity(state, rid) {
    const realm = rid && state.realms && state.realms[rid];
    if (!realm || !realm.alive || rid === 'player') {
      return { generation:null, culture:null, faith:null };
    }
    const ruler = realm.ruler || {};
    const snapshot = FB.realmRulerCharacterSnapshot &&
      FB.realmRulerCharacterSnapshot(state, rid);
    return {
      generation:FB.realmRulerGeneration
        ? FB.realmRulerGeneration(state, rid)
        : (ruler.generation !== undefined ? ruler.generation : 1),
      culture:snapshot && snapshot.culture || ruler.culture || realm.culture || null,
      faith:snapshot && snapshot.religion || ruler.religion || realm.religion || null
    };
  }

  FB.serfHomeAuthority = function (state) {
    const tenure = FB.activeSerfTenure(state);
    if (!tenure) return null;
    const p = state.player;
    const localLordId = state.roles && state.roles.lord;
    const localLord = localLordId && state.chars && state.chars[localLordId];
    const localLordHome = localLord && FB.characterResidence
      ? FB.characterResidence(state, localLord) : null;
    const holderRealmId = state.holder && state.holder[tenure.provinceId] ||
      state.owner && state.owner[tenure.provinceId] || null;
    const sovereignRealmId = holderRealmId && FB.topRealm
      ? FB.topRealm(state, holderRealmId) : holderRealmId;
    const holder = serfRealmPoliticalIdentity(state, holderRealmId);
    const sovereign = serfRealmPoliticalIdentity(state, sovereignRealmId);
    const political = holder.culture || holder.faith ? holder : sovereign;
    const protagonist = state.chars && state.chars[p.charId];
    const tradition = political.culture && FBDATA.cultures &&
      FBDATA.cultures[political.culture]
      ? FBDATA.cultures[political.culture].tradition || null : null;
    return {
      provinceId:tenure.provinceId,
      settlement:tenure.settlement,
      localLordId:localLord && !localLord.dead &&
        localLordHome === tenure.provinceId ? localLord.id : null,
      holderRealmId:holderRealmId,
      holderGeneration:holder.generation,
      sovereignRealmId:sovereignRealmId,
      sovereignGeneration:sovereign.generation,
      rulerCultureId:political.culture,
      rulerCultureTraditionId:tradition,
      rulerFaithId:political.faith,
      householdFaithRelation:protagonist && protagonist.religion && political.faith &&
        FB.faithRelation
        ? FB.faithRelation(state, protagonist.religion, political.faith) : null
    };
  };

  FB.localLordAt = function (state, characterId, allowDead) {
    const c = characterId && state && state.chars && state.chars[characterId];
    return c && (allowDead || !c.dead) ? c : null;
  };

  FB.realmRulerAtGeneration = function (state, realmId, generation) {
    const realm = state && state.realms && state.realms[realmId];
    if (!realm || !Number.isInteger(generation)) return null;
    const currentGeneration = FB.realmRulerGeneration
      ? FB.realmRulerGeneration(state, realmId)
      : (realm.ruler && realm.ruler.generation || 1);
    if (currentGeneration === generation) {
      return FB.realmRulerCharacterSnapshot &&
        FB.realmRulerCharacterSnapshot(state, realmId) || realm.ruler || null;
    }
    const succession = realm.succession;
    const members = succession && succession.members || {};
    for (const memberId in members) {
      const member = members[memberId];
      if (!member || member.reignGeneration !== generation) continue;
      const c = member.charId && state.chars && state.chars[member.charId];
      return c || member;
    }
    return null;
  };

  function normalizeSerfTenure(state, tenure) {
    if (!tenure || tenure.status !== 'active') return tenure;
    if (!Number.isInteger(tenure.revision) || tenure.revision < 0) {
      tenure.revision = 0;
    }
    if (!Array.isArray(tenure.transitionHistory)) tenure.transitionHistory = [];
    if (tenure.transitionHistory.length > 8) {
      tenure.transitionHistory = tenure.transitionHistory.slice(-8);
    }
    if (!Number.isInteger(tenure.transitionEligibleTurn) ||
        tenure.transitionEligibleTurn < 0) {
      tenure.transitionEligibleTurn = state.turn || 0;
    }
    if (!tenure.authorityCheckpoint) {
      const current = FB.serfHomeAuthority(state);
      if (current) {
        tenure.authorityCheckpoint = copySerfAuthority(current);
        tenure.authorityCheckpoint.acknowledgedTurn = state.turn || 0;
      }
    } else if (tenure.authorityCheckpoint.localLordId === null) {
      const current = FB.serfHomeAuthority(state);
      if (current && current.localLordId) {
        tenure.authorityCheckpoint.localLordId = current.localLordId;
      }
    }
    if (!Number.isInteger(tenure.nextWarCheckTurn) ||
        tenure.nextWarCheckTurn < 0) {
      tenure.nextWarCheckTurn = state.turn || 0;
    }
    const cacheFields = [
      'nextDutyId','nextDutyTurn','nextDutyConditional','nextDutyIndex'
    ];
    let cacheMissing = false;
    for (let i = 0; i < cacheFields.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(tenure, cacheFields[i])) {
        cacheMissing = true;
        break;
      }
    }
    if (cacheMissing) FB.refreshSerfTenureDueCache(state, tenure);
    else cachedSerfTenureDue(state, tenure);
    return tenure;
  }

  function tenureTransitionTerms(tenure) {
    const arch = tenure && FBDATA.tenureArchetypes &&
      FBDATA.tenureArchetypes[tenure.archetypeId];
    return arch && arch.transitionTerms || {};
  }

  function archetypeRightIds(tenure) {
    const arch = tenure && FBDATA.tenureArchetypes &&
      FBDATA.tenureArchetypes[tenure.archetypeId];
    const out = [];
    for (let i = 0; i < (arch && arch.rights || []).length; i++) {
      const right = arch.rights[i];
      const id = typeof right === 'string' ? right :
        (right && (right.rightId || right.id));
      if (id && out.indexOf(id) < 0) out.push(id);
    }
    return out;
  }

  function transitionHistoryRight(tenure, outcome, provenance) {
    const permitted = archetypeRightIds(tenure);
    for (let i = tenure.transitionHistory.length - 1; i >= 0; i--) {
      const entry = tenure.transitionHistory[i];
      if (!entry || entry.outcome !== outcome || !entry.rightId ||
          permitted.indexOf(entry.rightId) < 0) continue;
      if (provenance && entry.provenanceDetail !== provenance) continue;
      return entry.rightId;
    }
    return null;
  }

  function tenureDutyById(tenure, dutyId) {
    for (let i = 0; i < (tenure.duties || []).length; i++) {
      if (tenure.duties[i].id === dutyId) return tenure.duties[i];
    }
    return null;
  }

  function tenureDutyIsTargeted(state, dutyId) {
    return (state.eventQueue || []).some(function (item) {
      return item && item.ctx && item.ctx.dutyId === dutyId;
    });
  }

  function safeCommutableDuty(state, tenure) {
    const terms = tenureTransitionTerms(tenure);
    const commutable = terms.commutableDuties || [];
    for (let i = 0; i < (tenure.duties || []).length; i++) {
      const duty = tenure.duties[i];
      if (commutable.indexOf(duty.id) < 0 || duty.mode === 'coin' ||
          duty.nextDueTurn <= (state.turn || 0) + 90 ||
          tenureDutyIsTargeted(state, duty.id)) continue;
      return duty;
    }
    return null;
  }

  function faithSeverity(value) {
    return SERF_FAITH_SEVERITY[value] === undefined
      ? SERF_FAITH_SEVERITY.foreign : SERF_FAITH_SEVERITY[value];
  }

  FB.serfTenureTransitionProposal = function (state, transition) {
    const tenure = FB.activeSerfTenure(state);
    const confirm = {
      kind:'confirm', dutyId:null, rightId:null,
      additionalDutyId:null, commutationGold:null
    };
    if (!tenure || !transition) return confirm;
    const causes = transition.causes || [];
    let rightId = null;
    if (causes.indexOf('custom_confirmed') >= 0) {
      rightId = transitionHistoryRight(tenure, 'challenged_right');
      if (rightId && tenure.rights.indexOf(rightId) < 0 &&
          tenure.rights.length < 2) {
        return { kind:'restore_right', dutyId:null, rightId:rightId,
          additionalDutyId:null, commutationGold:null };
      }
    }
    if (causes.indexOf('custom_unconfirmed') >= 0) {
      rightId = transitionHistoryRight(tenure, 'restored_right',
        'custom_confirmed');
      if (rightId && tenure.rights.indexOf(rightId) >= 0) {
        return { kind:'challenge_right', dutyId:null, rightId:rightId,
          additionalDutyId:null, commutationGold:null };
      }
    }
    const politicalChange = causes.indexOf('county_transfer') >= 0 ||
      causes.indexOf('sovereign_change') >= 0;
    if (politicalChange && transition.oldAuthority && transition.newAuthority &&
        faithSeverity(transition.newAuthority.householdFaithRelation) >
          faithSeverity(transition.oldAuthority.householdFaithRelation) &&
        faithSeverity(transition.newAuthority.householdFaithRelation) >=
          SERF_FAITH_SEVERITY.foreign && tenure.rights.length) {
      return { kind:'challenge_right', dutyId:null, rightId:tenure.rights[0],
        additionalDutyId:null, commutationGold:null };
    }
    if (causes.indexOf('county_transfer') >= 0 &&
        ['town','city'].indexOf(serfHomeSettlementKind(state, tenure)) >= 0) {
      const duty = safeCommutableDuty(state, tenure);
      const commutationGold = FBDATA.balance.serfCommutedDutyGold;
      if (duty && Number.isInteger(commutationGold) &&
          commutationGold >= 0) {
        return { kind:'commute_duty', dutyId:duty.id, rightId:null,
          additionalDutyId:null,
          commutationGold:commutationGold };
      }
    }
    const additional = tenureTransitionTerms(tenure).additionalDuty;
    if (causes.indexOf('county_transfer') >= 0 && additional &&
        FBDATA.tenureDuties && FBDATA.tenureDuties[additional.id] &&
        FB.eventById(additional.eventId) &&
        tenure.duties.length < 4 && !tenureDutyById(tenure, additional.id) &&
        !tenureDutyIsTargeted(state, additional.id)) {
      return { kind:'add_duty', dutyId:null, rightId:null,
        additionalDutyId:additional.id, commutationGold:null };
    }
    return confirm;
  };

  function transitionCauseRelevant(cause, before, after) {
    if (cause === 'local_lord_succession') {
      return authorityValue(before.localLordId) !==
        authorityValue(after.localLordId);
    }
    if (cause === 'county_transfer') {
      return authorityValue(before.holderRealmId) !==
        authorityValue(after.holderRealmId);
    }
    if (cause === 'holder_succession') {
      return before.holderRealmId === after.holderRealmId &&
        authorityValue(before.holderGeneration) !==
          authorityValue(after.holderGeneration);
    }
    if (cause === 'sovereign_change') {
      return before.sovereignRealmId !== after.sovereignRealmId ||
        before.rulerCultureTraditionId !== after.rulerCultureTraditionId ||
        faithSeverity(before.householdFaithRelation) !==
          faithSeverity(after.householdFaithRelation);
    }
    return cause === 'custom_confirmed' || cause === 'custom_unconfirmed';
  }

  function removeQueuedTenureReviews(state) {
    if (!state.eventQueue) return;
    state.eventQueue = state.eventQueue.filter(function (item) {
      return item.id !== 'serf_tenure_review';
    });
  }

  function transitionWitness(state, tenure) {
    const story = state.player.serfStory;
    const storyId = story && story.participants && story.participants.witness;
    const storyWitness = storyId && state.chars && state.chars[storyId];
    if (storyWitness && !storyWitness.dead && FB.characterResidence &&
        FB.characterResidence(state, storyWitness) === tenure.provinceId) {
      return storyWitness.id;
    }
    const candidates = FB.eventParticipantCandidates
      ? FB.eventParticipantCandidates(state, {
        slot:'witness', source:'local_witness', sameHome:true
      }, { locationId:tenure.provinceId }) : [];
    return candidates.length ? candidates[0].id : null;
  }

  FB.noteSerfHomeTransition = function (state, cause, before, after, details) {
    const tenure = FB.activeSerfTenure(state);
    if (!tenure || SERF_TRANSITION_CAUSES.indexOf(cause) < 0) return false;
    normalizeSerfTenure(state, tenure);
    const p = state.player;
    const homeId = p.provinceId || p.home;
    const settlement = (p.homeSettlement !== undefined
      ? p.homeSettlement : (p.settlement !== undefined ? p.settlement : 0)) | 0;
    if (homeId !== tenure.provinceId || settlement !== tenure.settlement) {
      return false;
    }
    let record = p.tenureTransition;
    if (record && !transitionRecordShapeValid(state, record)) {
      removeQueuedTenureReviews(state);
      delete p.tenureTransition;
      record = null;
    }
    if (cause === 'war_pressure') {
      if (!record || ['pending','queued'].indexOf(record.status) < 0 ||
          record.causes.indexOf(cause) >= 0) return false;
      record.causes.push(cause);
      record.causes.sort(function (a, b) {
        return SERF_TRANSITION_CAUSES.indexOf(a) -
          SERF_TRANSITION_CAUSES.indexOf(b);
      });
      record.lastTriggerTurn = state.turn || 0;
      record.revision++;
      record.queued = false;
      record.status = 'pending';
      removeQueuedTenureReviews(state);
      for (let i = (state.eventQueue || []).length - 1; i >= 0; i--) {
        const item = state.eventQueue[i];
        if (item.id !== 'devastation_raiders' || !item.ctx) continue;
        item.ctx.tenureFormedTurn = tenure.formedTurn;
        item.ctx.tenureRevision = tenure.revision;
        item.ctx.homeProvinceId = tenure.provinceId;
        item.ctx.settlement = tenure.settlement;
        item.ctx.transitionRevision = record.revision;
        break;
      }
      return true;
    }
    before = copySerfAuthority(before || tenure.authorityCheckpoint);
    after = copySerfAuthority(after || FB.serfHomeAuthority(state));
    if (!before || !after || !serfAuthorityValid(state, before, tenure) ||
        !serfAuthorityValid(state, after, tenure) ||
        !transitionCauseRelevant(cause, before, after)) return false;
    if (record && (record.protagonistId !== p.charId ||
        record.tenureFormedTurn !== tenure.formedTurn ||
        record.tenureRevision !== tenure.revision ||
        record.provinceId !== tenure.provinceId ||
        record.settlement !== tenure.settlement)) {
      removeQueuedTenureReviews(state);
      delete p.tenureTransition;
      record = null;
    }
    const checkpoint = copySerfAuthority(tenure.authorityCheckpoint || before);
    if (checkpoint && serfAuthorityEqual(after, checkpoint) &&
        cause !== 'custom_confirmed' && cause !== 'custom_unconfirmed') {
      removeQueuedTenureReviews(state);
      delete p.tenureTransition;
      tenure.authorityCheckpoint = checkpoint;
      tenure.authorityCheckpoint.acknowledgedTurn = state.turn || 0;
      return true;
    }
    if (!record) {
      record = {
        version:1, status:'pending', revision:1,
        protagonistId:p.charId,
        tenureFormedTurn:tenure.formedTurn,
        tenureRevision:tenure.revision,
        provinceId:tenure.provinceId, settlement:tenure.settlement,
        firstTriggerTurn:state.turn || 0,
        lastTriggerTurn:state.turn || 0,
        eligibleTurn:Math.max(state.turn || 0,
          tenure.transitionEligibleTurn || 0),
        causes:[cause], oldAuthority:checkpoint || before,
        newAuthority:after,
        transferCount:cause === 'county_transfer' ? 1 : 0,
        proposal:null, witnessId:transitionWitness(state, tenure), queued:false
      };
      p.tenureTransition = record;
    } else {
      record.newAuthority = after;
      if (record.causes.indexOf(cause) < 0) record.causes.push(cause);
      record.causes.sort(function (a, b) {
        return SERF_TRANSITION_CAUSES.indexOf(a) -
          SERF_TRANSITION_CAUSES.indexOf(b);
      });
      record.lastTriggerTurn = state.turn || 0;
      if (cause === 'county_transfer') record.transferCount++;
      record.revision++;
      record.status = 'pending';
      record.queued = false;
      if (!record.witnessId) record.witnessId = transitionWitness(state, tenure);
      removeQueuedTenureReviews(state);
    }
    record.proposal = FB.serfTenureTransitionProposal(state, record);
    return true;
  };

  function transitionRecordShapeValid(state, record) {
    const tenure = FB.activeSerfTenure(state);
    const transitionKeys = [
      'causes','eligibleTurn','firstTriggerTurn','lastTriggerTurn',
      'newAuthority','oldAuthority','proposal','protagonistId','provinceId',
      'queued','revision','settlement','status','tenureFormedTurn',
      'tenureRevision','transferCount','version','witnessId'
    ];
    if (!tenure || !record || record.version !== 1 ||
        Object.keys(record).sort().join(',') !== transitionKeys.join(',') ||
        ['pending','queued'].indexOf(record.status) < 0 ||
        !Number.isInteger(record.revision) || record.revision < 1 ||
        record.protagonistId !== state.player.charId ||
        record.tenureFormedTurn !== tenure.formedTurn ||
        record.tenureRevision !== tenure.revision ||
        record.provinceId !== tenure.provinceId ||
        record.settlement !== tenure.settlement ||
        !Number.isInteger(record.firstTriggerTurn) ||
        !Number.isInteger(record.lastTriggerTurn) ||
        !Number.isInteger(record.eligibleTurn) ||
        record.firstTriggerTurn < 0 ||
        record.lastTriggerTurn < record.firstTriggerTurn ||
        record.eligibleTurn < 0 ||
        !Number.isInteger(record.transferCount) || record.transferCount < 0 ||
        typeof record.queued !== 'boolean' ||
        (record.status === 'queued') !== record.queued ||
        (record.witnessId !== null &&
          !(state.chars && state.chars[record.witnessId])) ||
        !Array.isArray(record.causes) || !record.causes.length ||
        !serfAuthorityValid(state, record.oldAuthority, tenure) ||
        !serfAuthorityValid(state, record.newAuthority, tenure) ||
        !record.proposal ||
        SERF_TRANSITION_PROPOSALS.indexOf(record.proposal.kind) < 0) {
      return false;
    }
    if (Object.keys(record.proposal).sort().join(',') !==
        'additionalDutyId,commutationGold,dutyId,kind,rightId') return false;
    for (let i = 0; i < record.causes.length; i++) {
      if (SERF_TRANSITION_CAUSES.indexOf(record.causes[i]) < 0 ||
          record.causes.indexOf(record.causes[i]) !== i ||
          (i && SERF_TRANSITION_CAUSES.indexOf(record.causes[i - 1]) >
            SERF_TRANSITION_CAUSES.indexOf(record.causes[i]))) return false;
    }
    return true;
  }

  function transitionRecordValid(state, record) {
    if (!transitionRecordShapeValid(state, record) ||
        !serfAuthorityEqual(record.newAuthority,
          FB.serfHomeAuthority(state))) return false;
    const expected = FB.serfTenureTransitionProposal(state, record);
    const fields = ['kind','dutyId','rightId','additionalDutyId','commutationGold'];
    for (let i = 0; i < fields.length; i++) {
      if (authorityValue(expected[fields[i]]) !==
          authorityValue(record.proposal[fields[i]])) return false;
    }
    return true;
  }

  function transitionContext(state, record) {
    const participants = {};
    const participantKinds = {};
    if (record.oldAuthority.localLordId) {
      participants.formerLord = record.oldAuthority.localLordId;
      participantKinds.formerLord = 'lord';
    }
    if (record.newAuthority.localLordId) {
      participants.currentLord = record.newAuthority.localLordId;
      participantKinds.currentLord = 'lord';
    }
    if (record.witnessId) {
      participants.witness = record.witnessId;
      participantKinds.witness = 'contact';
    }
    const targetId = record.proposal.dutyId ||
      record.proposal.additionalDutyId || record.proposal.rightId;
    const targetKind = record.proposal.rightId ? 'tenureRight' : 'tenureDuty';
    return {
      transitionRevision:record.revision,
      tenureFormedTurn:record.tenureFormedTurn,
      tenureRevision:record.tenureRevision,
      protagonistId:record.protagonistId,
      locationId:record.provinceId,
      homeProvinceId:record.provinceId,
      settlement:record.settlement,
      oldLocalLordId:record.oldAuthority.localLordId,
      newLocalLordId:record.newAuthority.localLordId,
      oldHolderRealmId:record.oldAuthority.holderRealmId,
      oldHolderGeneration:record.oldAuthority.holderGeneration,
      newHolderRealmId:record.newAuthority.holderRealmId,
      newHolderGeneration:record.newAuthority.holderGeneration,
      oldSovereignRealmId:record.oldAuthority.sovereignRealmId,
      oldSovereignGeneration:record.oldAuthority.sovereignGeneration,
      newSovereignRealmId:record.newAuthority.sovereignRealmId,
      newSovereignGeneration:record.newAuthority.sovereignGeneration,
      oldRulerCultureTraditionId:
        record.oldAuthority.rulerCultureTraditionId,
      newRulerCultureTraditionId:
        record.newAuthority.rulerCultureTraditionId,
      oldHouseholdFaithRelation:
        record.oldAuthority.householdFaithRelation,
      newHouseholdFaithRelation:
        record.newAuthority.householdFaithRelation,
      realmId:record.newAuthority.holderRealmId,
      transitionCauses:record.causes.slice(),
      proposalKind:record.proposal.kind,
      targetDutyId:record.proposal.dutyId,
      targetRightId:record.proposal.rightId,
      additionalDutyId:record.proposal.additionalDutyId,
      commutationGold:record.proposal.commutationGold,
      term:targetId ? { $data:targetKind, id:targetId } : null,
      witnessId:record.witnessId,
      participants:participants,
      participantKinds:participantKinds
    };
  }

  function transitionContextMatches(record, ctx) {
    if (!ctx) return false;
    const expected = transitionContext(null, record);
    const fields = [
      'transitionRevision','tenureFormedTurn','tenureRevision','protagonistId',
      'locationId','homeProvinceId','settlement','oldLocalLordId',
      'newLocalLordId','oldHolderRealmId','oldHolderGeneration',
      'newHolderRealmId','newHolderGeneration','oldSovereignRealmId',
      'oldSovereignGeneration','newSovereignRealmId',
      'newSovereignGeneration','oldRulerCultureTraditionId',
      'newRulerCultureTraditionId','oldHouseholdFaithRelation',
      'newHouseholdFaithRelation','realmId','proposalKind','targetDutyId',
      'targetRightId','additionalDutyId','commutationGold','witnessId'
    ];
    for (let i = 0; i < fields.length; i++) {
      if (authorityValue(ctx[fields[i]]) !==
          authorityValue(expected[fields[i]])) return false;
    }
    if (!Array.isArray(ctx.transitionCauses) ||
        ctx.transitionCauses.length !== expected.transitionCauses.length) {
      return false;
    }
    for (let i = 0; i < expected.transitionCauses.length; i++) {
      if (ctx.transitionCauses[i] !== expected.transitionCauses[i]) return false;
    }
    const expectedParticipants = expected.participants || {};
    const actualParticipants = ctx.participants || {};
    const expectedKinds = expected.participantKinds || {};
    const actualKinds = ctx.participantKinds || {};
    const participantSlots = ['formerLord','currentLord','witness'];
    for (let i = 0; i < participantSlots.length; i++) {
      const slot = participantSlots[i];
      if (authorityValue(actualParticipants[slot]) !==
          authorityValue(expectedParticipants[slot]) ||
          authorityValue(actualKinds[slot]) !==
          authorityValue(expectedKinds[slot])) return false;
    }
    if (Object.keys(actualParticipants).length !==
        Object.keys(expectedParticipants).length ||
        Object.keys(actualKinds).length !== Object.keys(expectedKinds).length) {
      return false;
    }
    if (expected.term === null) {
      if (ctx.term !== null) return false;
    } else if (!ctx.term || ctx.term.$data !== expected.term.$data ||
        ctx.term.id !== expected.term.id) return false;
    return true;
  }

  function nextTransitionDutyTurn(state, firstDueSeason) {
    const seasons = { spring:0, summer:1, autumn:2, winter:3 };
    const targetSeason = seasons[firstDueSeason];
    const earliest = FB.dateAtTurn(state, (state.turn || 0) + 180);
    let year = earliest.year;
    let ordinal = year * 360 + targetSeason * 90 + 29;
    const earliestOrdinal = FB.dateOrdinal(earliest);
    if (ordinal < earliestOrdinal) ordinal += 360;
    return (state.turn || 0) + ordinal - FB.dateOrdinal(state.date);
  }

  FB.serfTenureDutyInterval = function (tenure, duty) {
    if (duty && Number(duty.originalIntervalTurns) > 0) {
      return duty.originalIntervalTurns;
    }
    const terms = tenureTransitionTerms(tenure);
    if (terms.additionalDuty && duty && duty.id === terms.additionalDuty.id) {
      return terms.additionalDuty.intervalTurns;
    }
    const arch = tenure && FBDATA.tenureArchetypes &&
      FBDATA.tenureArchetypes[tenure.archetypeId];
    for (let i = 0; i < (arch && arch.duties || []).length; i++) {
      if (duty && arch.duties[i].id === duty.id) {
        return arch.duties[i].intervalTurns || 720;
      }
    }
    return 720;
  };

  function transitionHistoryEntry(state, record, outcome, changedId) {
    return {
      id:'tt:' + record.firstTriggerTurn + ':' + record.revision,
      turn:state.turn || 0,
      causes:record.causes.slice(),
      outcome:outcome,
      dutyId:changedId && changedId.dutyId || null,
      rightId:changedId && changedId.rightId || null,
      oldHolderRealmId:record.oldAuthority.holderRealmId,
      oldHolderGeneration:record.oldAuthority.holderGeneration,
      newHolderRealmId:record.newAuthority.holderRealmId,
      newHolderGeneration:record.newAuthority.holderGeneration,
      provenance:'authority_review',
      provenanceDetail:record.causes.indexOf('custom_confirmed') >= 0
        ? 'custom_confirmed' : null
    };
  }

  FB.resolveSerfTenureTransition = function (state, transitionRevision, outcome) {
    if (['preserve','accept','restore','decline_restore'].indexOf(outcome) < 0) {
      return false;
    }
    const p = state && state.player;
    const tenure = FB.activeSerfTenure(state);
    const record = p && p.tenureTransition;
    if (!tenure || !record || record.status !== 'queued' || !record.queued ||
        record.revision !== transitionRevision ||
        !transitionRecordValid(state, record)) return false;
    const proposal = record.proposal;
    if (outcome === 'accept' &&
        ['add_duty','commute_duty','challenge_right'].indexOf(
          proposal.kind) < 0) return false;
    if (outcome === 'restore' &&
        ['restore_right','confirm'].indexOf(proposal.kind) < 0) return false;
    if (outcome === 'decline_restore' &&
        proposal.kind !== 'restore_right') return false;
    let mechanicsChanged = false;
    let historyOutcome = 'confirmed';
    const changedId = { dutyId:null, rightId:null };
    if (outcome === 'accept') {
      if (proposal.kind === 'add_duty') {
        const terms = tenureTransitionTerms(tenure).additionalDuty;
        if (!terms || terms.id !== proposal.additionalDutyId ||
            !FBDATA.tenureDuties || !FBDATA.tenureDuties[terms.id] ||
            !FB.eventById(terms.eventId) ||
            tenure.duties.length >= 4 || tenureDutyById(tenure, terms.id)) {
          return false;
        }
        tenure.duties.push({
          id:terms.id, eventId:terms.eventId,
          nextDueTurn:nextTransitionDutyTurn(state, terms.firstDueSeason),
          lastResolvedTurn:null,
          addedByTransition:'tt:' + record.firstTriggerTurn + ':' + record.revision
        });
        mechanicsChanged = true;
        historyOutcome = 'added_duty';
        changedId.dutyId = terms.id;
      } else if (proposal.kind === 'commute_duty') {
        const duty = tenureDutyById(tenure, proposal.dutyId);
        if (!duty || duty.mode === 'coin' ||
            safeCommutableDuty(state, tenure) !== duty) return false;
        duty.sourceEventId = duty.eventId;
        duty.originalIntervalTurns = FB.serfTenureDutyInterval(tenure, duty);
        duty.eventId = 'serf_commuted_due';
        duty.mode = 'coin';
        duty.commutationGold = proposal.commutationGold;
        duty.changedByTransition = 'tt:' + record.firstTriggerTurn + ':' +
          record.revision;
        mechanicsChanged = true;
        historyOutcome = 'commuted_duty';
        changedId.dutyId = duty.id;
      } else if (proposal.kind === 'challenge_right') {
        const index = tenure.rights.indexOf(proposal.rightId);
        if (index < 0) return false;
        tenure.rights.splice(index, 1);
        mechanicsChanged = true;
        historyOutcome = 'challenged_right';
        changedId.rightId = proposal.rightId;
      }
    } else if (outcome === 'restore') {
      const rightId = proposal.rightId ||
        transitionHistoryRight(tenure, 'challenged_right');
      if (!rightId || archetypeRightIds(tenure).indexOf(rightId) < 0 ||
          tenure.rights.indexOf(rightId) >= 0 || tenure.rights.length >= 2) {
        return false;
      }
      tenure.rights.push(rightId);
      mechanicsChanged = true;
      historyOutcome = 'restored_right';
      changedId.rightId = rightId;
    } else if (outcome === 'decline_restore') {
      historyOutcome = 'declined_restoration';
    } else if (proposal.kind !== 'confirm') {
      historyOutcome = 'preserved_terms';
    }
    if (mechanicsChanged) {
      tenure.revision++;
      FB.refreshSerfTenureDueCache(state, tenure);
    }
    tenure.transitionHistory.push(transitionHistoryEntry(
      state, record, historyOutcome, changedId));
    if (tenure.transitionHistory.length > 8) tenure.transitionHistory.shift();
    const current = FB.serfHomeAuthority(state);
    tenure.authorityCheckpoint = copySerfAuthority(current || record.newAuthority);
    tenure.authorityCheckpoint.acknowledgedTurn = state.turn || 0;
    tenure.transitionEligibleTurn = (state.turn || 0) +
      (FBDATA.balance.serfTenureTransitionCooldown || 360);
    delete p.tenureTransition;
    removeQueuedTenureReviews(state);
    if (mechanicsChanged && state.eventQueue) {
      state.eventQueue = state.eventQueue.filter(function (item) {
        const ev = FB.eventById(item.id);
        return !(ev && ev.contextValidator === 'serf_tenure_context_valid' &&
          item.ctx && item.ctx.tenureFormedTurn === tenure.formedTurn &&
          (item.ctx.tenureRevision === undefined ? 0 :
            item.ctx.tenureRevision) !== tenure.revision);
      });
    }
    if (mechanicsChanged && p.freedomOffer &&
        p.freedomOffer.status === 'offered') {
      p.freedomOffer.status = 'superseded';
    }
    FB.news(state, mechanicsChanged
      ? FB.msg('news.serf.tenure_review_amended',
        'The household custom at {province} is amended under the current authority.',
        { province:FB.world.byId[tenure.provinceId].name })
      : FB.msg('news.serf.tenure_review_confirmed',
        'The household custom at {province} is confirmed without changing its terms.',
        { province:FB.world.byId[tenure.provinceId].name }));
    return true;
  };

  FB.closeSerfTenure = function (state, reason) {
    if (!state || !state.player || !state.player.tenure) return null;
    const tenure = state.player.tenure;
    delete state.player.tenureTransition;
    removeQueuedTenureReviews(state);
    if (tenure.status === 'closed') return tenure;
    tenure.status = 'closed';
    tenure.endedTurn = state.turn || 0;
    tenure.endReason = reason || 'rank_change';
    tenure.nextDutyId = null;
    tenure.nextDutyTurn = null;
    tenure.nextDutyConditional = false;
    tenure.nextDutyIndex = null;
    return tenure;
  };

  FB.replaceSerfTenure = function (state, formedBy, priorReason) {
    if (!state || !state.player || state.player.tier !== 0) return null;
    const old = state.player.tenure;
    let priorClosure = null;
    if (old && old.status === 'active') {
      FB.closeSerfTenure(state, priorReason || 'forced_relocation');
      priorClosure = {
        archetypeId: old.archetypeId,
        provinceId: old.provinceId,
        settlement: old.settlement,
        endedTurn: old.endedTurn,
        endReason: old.endReason
      };
    }
    if (FB.serfParticipantTenureChanged) {
      FB.serfParticipantTenureChanged(state);
    }
    delete state.player.tenure;
    const newTenure = FB.ensureSerfTenure(state, formedBy || 'forced_settlement');
    if (newTenure && priorClosure) {
      newTenure.priorClosure = priorClosure;
    }
    return newTenure;
  };

  FB.tenureText = function (state, charId, kind, id, def, field, keyFields) {
    if (!def) return '';
    if (keyFields) {
      const keys = Array.isArray(keyFields) ? keyFields : [keyFields];
      for (let k = 0; k < keys.length; k++) {
        const explicitKey = def[keys[k]];
        if (explicitKey && typeof explicitKey === 'string') {
          if (FB.renderKey) {
            const fallbackStr = def[field] !== undefined ? def[field] : explicitKey;
            const rendered = FB.renderKey(explicitKey, fallbackStr);
            if (rendered) return rendered;
          }
        }
      }
    }
    if (def[field] !== undefined) {
      return FB.dataText(state, charId, kind, id, def, field);
    }
    return '';
  };

  FB.tenureView = function (state) {
    const tenure = FB.activeSerfTenure(state);
    if (!tenure) return null;
    const p = state.player;
    const charId = p.charId;
    const archDef = (FBDATA.tenureArchetypes && FBDATA.tenureArchetypes[tenure.archetypeId]) || null;
    const archetypeName = (archDef
      ? FB.tenureText(state, charId, 'tenureArchetype', tenure.archetypeId, archDef, 'name', 'nameKey')
      : '') || FB.T('Customary tenure');
    const archetypeSummary = (archDef
      ? FB.tenureText(state, charId, 'tenureArchetype', tenure.archetypeId, archDef, 'desc', ['summaryKey', 'descKey'])
      : '') || FB.T('A household holding used by local custom in return for labor and seasonal service.');
    let toilFocus = null;
    for (let f = 0; f < (FB.focuses || []).length; f++) {
      if (FB.focuses[f].id === 'toil') { toilFocus = FB.focuses[f]; break; }
    }
    const workLabel = FB.focusLabel && toilFocus
      ? FB.focusLabel(state, toilFocus)
      : (archDef ? FB.tenureText(state, charId, 'tenureArchetype',
        tenure.archetypeId, archDef, 'workLabel', 'workLabelKey') : '');
    const workDescription = FB.focusDescription && toilFocus
      ? FB.focusDescription(state, toilFocus)
      : (archDef ? FB.tenureText(state, charId, 'tenureArchetype',
        tenure.archetypeId, archDef, 'workDescription',
        'workDescriptionKey') : '');

    const settlements = FB.settlementsOf(state, tenure.provinceId);
    const homeSett = settlements[tenure.settlement] || settlements[0] || {};
    const settlementName = homeSett.name || FB.T('Unknown');
    const prov = FB.world && FB.world.byId ? FB.world.byId[tenure.provinceId] : null;
    const countyName = prov ? FB.L(prov.name) : tenure.provinceId;

    const holderRealmId = (state.holder && state.holder[tenure.provinceId]) ||
      (state.owner && state.owner[tenure.provinceId]);
    const holderRealm = holderRealmId && state.realms && state.realms[holderRealmId];
    const controllerName = holderRealm ? holderRealm.name : FB.T('Local custom');

    const rulerChar = holderRealm && holderRealm.ruler && state.chars ? state.chars[holderRealm.ruler] : null;
    const existingLordId = state.roles && state.roles.lord;
    const lord = existingLordId && state.chars ? state.chars[existingLordId] : null;
    const lordName = lord && !lord.dead
      ? FB.fullName(lord)
      : (rulerChar
          ? FB.fullName(rulerChar)
          : (holderRealm ? holderRealm.name : FB.T('Local authority')));
    const stewardId = state.roles && state.roles.steward;
    const steward = stewardId && state.chars ? state.chars[stewardId] : null;
    const story = p.serfStory && p.serfStory.id === 'old_custom'
      ? p.serfStory : null;
    const storyWitness = story && story.participants && state.chars
      ? state.chars[story.participants.witness] : null;
    const storyOfficer = story && story.participants && state.chars
      ? state.chars[story.participants.officer] : null;

    const duties = [];
    let nearestDue = null;
    let nearestDueTurn = Infinity;

    for (let i = 0; i < (tenure.duties || []).length; i++) {
      const d = tenure.duties[i];
      const dDef = (FBDATA.tenureDuties && FBDATA.tenureDuties[d.id]) || null;
      if (!dDef) continue;
      let dName = FB.tenureText(state, charId, 'tenureDuty', d.id, dDef, 'name', 'nameKey')
        || FB.T('Customary obligation');
      let dDesc = FB.tenureText(state, charId, 'tenureDuty', d.id, dDef, 'desc', 'descKey');
      if (d.mode === 'coin' && Number.isInteger(d.commutationGold)) {
        dName = FB.T('{duty} (commuted)', { duty:dName });
        dDesc = FB.T('Commuted to {money:amount} at each due date. {description}', {
          amount:d.commutationGold, description:dDesc
        });
      }
      const dueDate = FB.dateAtTurn(state, d.nextDueTurn);
      const daysRemain = Math.max(0, d.nextDueTurn - (state.turn || 0));
      const dateLabel = FB.seasonName(dueDate.season) + ' ' + dueDate.year;
      const dutyView = {
        id: d.id,
        name: dName,
        desc: dDesc,
        mode:d.mode || 'labor',
        commutationGold:d.mode === 'coin' ? d.commutationGold : null,
        nextDueTurn: d.nextDueTurn,
        dateLabel: dateLabel,
        daysRemaining: daysRemain,
        dateFull: FB.T('{season} {year}, day {day} ({days} days)', {
          season: FB.seasonName(dueDate.season),
          year: dueDate.year,
          day:dueDate.day,
          days: daysRemain
        })
      };
      duties.push(dutyView);
      if (d.nextDueTurn < nearestDueTurn) {
        nearestDueTurn = d.nextDueTurn;
        nearestDue = dutyView;
      }
    }

    const rights = [];
    for (let r = 0; r < (tenure.rights || []).length; r++) {
      const rId = tenure.rights[r];
      const rDef = (FBDATA.tenureRights && FBDATA.tenureRights[rId]) || null;
      if (!rDef) continue;
      const rName = FB.tenureText(state, charId, 'tenureRight', rId, rDef, 'name', 'nameKey')
        || FB.T('Customary right');
      const rDesc = FB.tenureText(state, charId, 'tenureRight', rId, rDef, 'desc', 'descKey');
      rights.push({ id: rId, name: rName, desc: rDesc });
    }

    let pendingConditional = null;
    for (let c = 0; c < (tenure.conditional || []).length; c++) {
      const cd = tenure.conditional[c];
      if (cd.pendingTurn !== null && cd.pendingTurn !== undefined) {
        const cdDef = (FBDATA.tenureDuties && FBDATA.tenureDuties[cd.id]) || null;
        if (!cdDef) continue;
        const cdName = FB.tenureText(state, charId,
          'tenureDuty', cd.id, cdDef, 'name', 'nameKey') || FB.T('Customary obligation');
        const cdDesc = FB.tenureText(state, charId,
          'tenureDuty', cd.id, cdDef, 'desc', 'descKey');
        const dueDate = FB.dateAtTurn(state, cd.pendingTurn);
        const daysRemain = Math.max(0, cd.pendingTurn - (state.turn || 0));
        const conditionalView = {
          id: cd.id,
          name: cdName,
          desc: cdDesc,
          pendingTurn: cd.pendingTurn,
          nextDueTurn:cd.pendingTurn,
          dateLabel: FB.seasonName(dueDate.season) + ' ' + dueDate.year,
          daysRemaining: daysRemain,
          dateFull:FB.T('{season} {year}, day {day} ({days} days)', {
            season:FB.seasonName(dueDate.season), year:dueDate.year,
            day:dueDate.day, days:daysRemain
          })
        };
        if (!pendingConditional ||
            cd.pendingTurn < pendingConditional.nextDueTurn) {
          pendingConditional = conditionalView;
        }
        if (!nearestDue || cd.pendingTurn < nearestDue.nextDueTurn) {
          nearestDue = conditionalView;
        }
      }
    }

    const purchase = FB.freedomPurchaseStatus
      ? FB.freedomPurchaseStatus(state) : null;
    const petition = FB.freedomPetitionStatus
      ? FB.freedomPetitionStatus(state) : null;
    const offer = FB.freedomOfferView ? FB.freedomOfferView(state) : null;
    const transition = p.tenureTransition || null;
    const recentTransition = tenure.transitionHistory &&
      tenure.transitionHistory.length
      ? tenure.transitionHistory[tenure.transitionHistory.length - 1] : null;

    return {
      status: 'active',
      archetypeId: tenure.archetypeId,
      archetypeName: archetypeName,
      archetypeSummary: archetypeSummary,
      workLabel: workLabel || FB.T('Work the household holding'),
      workDescription: workDescription || FB.T(
        'Work the customary holding and meet its seasonal service.'),
      provinceId: tenure.provinceId,
      settlement: tenure.settlement,
      settlementName: settlementName,
      countyName: countyName,
      controllerName: controllerName,
      lordId:lord && !lord.dead ? lord.id : null,
      lordName: lordName,
      stewardId:steward && !steward.dead ? steward.id : null,
      stewardName:steward && !steward.dead
        ? FB.fullName(steward) : FB.T('No steward is known'),
      oldCustom:story && storyWitness && storyOfficer ? {
        witnessId:storyWitness.id,
        witnessName:FB.fullName(storyWitness),
        officerId:storyOfficer.id,
        officerName:FB.fullName(storyOfficer)
      } : null,
      duties: duties,
      rights: rights,
      hasRights: rights.length > 0,
      emptyRightsText: FB.T('No recognized customary rights recorded.'),
      nearestDue: nearestDue,
      nearestDueId:tenure.nextDutyId,
      nearestDueTurn:tenure.nextDutyTurn,
      pendingConditional: pendingConditional,
      freedom:{
        purchase:purchase,
        petition:petition,
        offer:offer && ['offered','service'].indexOf(offer.status) >= 0
          ? offer : null
      },
      pendingTransition:transition ? {
        revision:transition.revision,
        status:transition.status,
        causes:(transition.causes || []).slice(),
        eligibleTurn:transition.eligibleTurn,
        proposalKind:transition.proposal && transition.proposal.kind || 'confirm'
      } : null,
      recentTransition:recentTransition ? {
        turn:recentTransition.turn,
        outcome:recentTransition.outcome,
        dutyId:recentTransition.dutyId || null,
        rightId:recentTransition.rightId || null
      } : null,
      customaryUseStatement: FB.T('Customary tenure grants household use by local custom, not owned property.'),
      lawfulFreedomStatement: FB.T('Lawful freedom ends personal service obligations.')
    };
  };

  FB.serfTenurePresentationSignature = function (state) {
    const tenure = FB.activeSerfTenure(state);
    if (!tenure) return 'closed';
    const purchase = FB.freedomPurchaseStatus
      ? FB.freedomPurchaseStatus(state) : null;
    const petition = FB.freedomPetitionStatus
      ? FB.freedomPetitionStatus(state) : null;
    const offer = state.player.freedomOffer;
    const offerView = FB.freedomOfferView
      ? FB.freedomOfferView(state) : null;
    const transition = state.player.tenureTransition;
    const family = state.player.familyFreedom;
    return [
      tenure.status, tenure.revision || 0,
      tenure.nextDutyId || '', tenure.nextDutyTurn === null ? '' : tenure.nextDutyTurn,
      offer && offer.createdTurn || '', offerView && offerView.status || '',
      offer && offer.expiryTurn || '',
      petition ? petition.standing : '', petition && petition.ready ? 1 : 0,
      purchase && purchase.quote ? purchase.quote.price : '',
      purchase && purchase.affordable ? 1 : 0,
      transition && transition.revision || '',
      family && family.first && family.first.turn || '',
      family && family.firstLawful && family.firstLawful.turn || ''
    ].join('|');
  };

  FB.reconcileSerfHomeAuthority = function (state) {
    const tenure = FB.activeSerfTenure(state);
    if (!tenure) return false;
    normalizeSerfTenure(state, tenure);
    const current = FB.serfHomeAuthority(state);
    const record = state.player.tenureTransition;
    const observed = record && transitionRecordShapeValid(state, record)
      ? record.newAuthority : tenure.authorityCheckpoint;
    if (!current || !observed || serfAuthorityEqual(current, observed)) {
      return false;
    }
    let cause = null;
    if (observed.localLordId !== current.localLordId) {
      cause = 'local_lord_succession';
    } else if (observed.holderRealmId !== current.holderRealmId) {
      cause = 'county_transfer';
    } else if (observed.holderGeneration !== current.holderGeneration) {
      cause = 'holder_succession';
    } else if (transitionCauseRelevant('sovereign_change', observed, current)) {
      cause = 'sovereign_change';
    }
    return cause
      ? FB.noteSerfHomeTransition(state, cause, observed, current) : false;
  };

  function queueSerfTenureReview(state, tenure) {
    const record = state.player.tenureTransition;
    if (record && record.witnessId) {
      const witness = state.chars && state.chars[record.witnessId];
      if (!witness || witness.dead || !FB.characterResidence ||
          FB.characterResidence(state, witness) !== record.provinceId) {
        record.witnessId = null;
        record.revision++;
        record.status = 'pending';
        record.queued = false;
        removeQueuedTenureReviews(state);
      }
    }
    if (!record || record.status !== 'pending' || record.queued ||
        (state.turn || 0) < record.eligibleTurn ||
        !transitionRecordShapeValid(state, record) ||
        !serfAuthorityEqual(record.newAuthority,
          FB.serfHomeAuthority(state))) return false;
    const latestProposal = FB.serfTenureTransitionProposal(state, record);
    const proposalFields = [
      'kind','dutyId','rightId','additionalDutyId','commutationGold'
    ];
    let proposalChanged = false;
    for (let i = 0; i < proposalFields.length; i++) {
      if (authorityValue(latestProposal[proposalFields[i]]) !==
          authorityValue(record.proposal[proposalFields[i]])) {
        proposalChanged = true;
        break;
      }
    }
    if (proposalChanged) {
      record.proposal = latestProposal;
      record.revision++;
      removeQueuedTenureReviews(state);
    }
    if (!transitionRecordValid(state, record)) return false;
    record.status = 'queued';
    record.queued = true;
    const queued = FB.queueEvent(state, 'serf_tenure_review',
      transitionContext(state, record));
    if (!queued) {
      record.status = 'pending';
      record.queued = false;
      return false;
    }
    return true;
  }

  FB.tenureDay = function (state) {
    if (!state || !state.player || state.player.tier !== 0) return;
    if (state.player.travel) return;

    if (!state.player.tenure || state.player.tenure.status !== 'active') {
      FB.ensureSerfTenure(state, 'legacy_repair');
    }
    const tenure = FB.activeSerfTenure(state);
    if (!tenure || typeof tenure !== 'object' || !tenure.archetypeId || !Array.isArray(tenure.duties) || !tenure.provinceId) return;

    if (state.player.tenureTransition &&
        !transitionRecordShapeValid(state, state.player.tenureTransition)) {
      delete state.player.tenureTransition;
      removeQueuedTenureReviews(state);
    }

    const curLocation = state.player.travel ? state.player.travel.currentId : (state.player.provinceId || state.player.home);
    if (curLocation !== tenure.provinceId) return;

    const pending = state.player.tenureTransition;
    const indexedLordId = state.roles && state.roles.lord;
    if (pending && !FB.localLordAt(state, indexedLordId, false)) {
      FB.getRole(state, 'lord', true);
    }
    FB.reconcileSerfHomeAuthority(state);
    if (queueSerfTenureReview(state, tenure)) return;

    let conditionalChanged = false;
    if ((state.turn || 0) >= tenure.nextWarCheckTurn) {
      const activeWarId = currentRealmWarId(state, tenure.provinceId);
      tenure.nextWarCheckTurn = (state.turn || 0) + 7;
      for (let c = 0; c < (tenure.conditional || []).length; c++) {
        const cd = tenure.conditional[c];
        if (cd.id !== 'officers_quartered' ||
            activeWarId === cd.currentWarId) continue;
        cd.currentWarId = activeWarId;
        if (activeWarId !== null) {
          const eligible = (cd.lastResolvedTurn === null ||
            cd.lastResolvedTurn === undefined) ||
            ((state.turn || 0) >= (cd.nextEligibleTurn || 0));
          if (eligible && cd.pendingTurn === null) {
            cd.pendingTurn = (state.turn || 0) + 7;
            conditionalChanged = true;
          }
        } else if (cd.pendingTurn !== null) {
          cd.pendingTurn = null;
          conditionalChanged = true;
          if (state.eventQueue) {
            state.eventQueue = state.eventQueue.filter(function (item) {
              return item.id !== 'serf_officers_quartered';
            });
          }
        }
      }
    }

    const cachedDue = conditionalChanged
      ? FB.refreshSerfTenureDueCache(state, tenure)
      : cachedSerfTenureDue(state, tenure);
    if (!cachedDue || cachedDue.turn > (state.turn || 0)) return;

    const hasValidQueued = (state.eventQueue || []).some(function (item) {
      const ev = FB.eventById(item.id);
      return ev && ev.contextValidator === 'serf_tenure_context_valid' &&
        FB.eventContextStillValid(state, ev, item.ctx);
    });
    if (hasValidQueued) return;

    const currentSeasonKey = state.date.year + '_' + state.date.season;
    if (tenure.lastPresentedSeasonKey === currentSeasonKey) return;

    const candidate = {
      duty:cachedDue.duty,
      isConditional:cachedDue.conditional
    };

    const dueTurn = candidate.isConditional ? candidate.duty.pendingTurn : candidate.duty.nextDueTurn;

    FB.queueEvent(state, candidate.duty.eventId, {
      tenureFormedTurn: tenure.formedTurn,
      tenureRevision: tenure.revision,
      archetypeId: tenure.archetypeId,
      tenureArchetypeId: tenure.archetypeId,
      tenureProvinceId: tenure.provinceId,
      tenureSettlement: tenure.settlement,
      tenureVariantId: tenure.archetypeId + ':' + candidate.duty.id,
      dutyId: candidate.duty.id,
      duty: { $data: 'tenureDuty', id: candidate.duty.id },
      dutyName: { $data: 'tenureDuty', id: candidate.duty.id },
      dueTurn: dueTurn,
      commutationGold:candidate.duty.commutationGold,
      protagonistId: state.player.charId,
      locationId: curLocation
    });

    tenure.lastPresentedSeasonKey = currentSeasonKey;
  };

  /* =========================================================================
     Deliberate serf freedom. All real tier-0-to-tier-1 freedom routes pass
     through this boundary; generic rank changes deliberately do not infer a
     route or create family history.
     ========================================================================= */

  const SERF_FREEDOM_ROUTES = {
    purchase:{ lawful:true, tenureEndReason:'purchase' },
    manumission:{ lawful:true, tenureEndReason:'manumission' },
    old_custom:{ lawful:true, tenureEndReason:'old_custom' },
    flight:{ lawful:false, tenureEndReason:'flight' }
  };
  const EVENT_SERF_FREEDOM_ROUTES = { old_custom:true, flight:true };
  FB.serfFreedomRoutes = SERF_FREEDOM_ROUTES;

  function serfFreedomEffectError(fx) {
    if (!fx || !Object.prototype.hasOwnProperty.call(fx, 'serfFreedom')) return '';
    if (typeof fx.serfFreedom !== 'object' ||
        Array.isArray(fx.serfFreedom) ||
        Object.keys(fx.serfFreedom).length !== 1 ||
        !EVENT_SERF_FREEDOM_ROUTES[fx.serfFreedom.route]) {
      return 'serfFreedom must contain the authored route old_custom or flight.';
    }
    if (fx.tierSet !== undefined || fx.tierUp !== undefined) {
      return 'serfFreedom cannot be combined with tierSet or tierUp.';
    }
    return '';
  }

  FB.validateSerfFreedomEffect = function (fx) {
    const error = serfFreedomEffectError(fx);
    if (error) throw new Error(error);
    return true;
  };

  function validateEventSerfFreedomEffects(ev) {
    if (!ev || !Array.isArray(ev.options)) return true;
    for (let i = 0; i < ev.options.length; i++) {
      const option = ev.options[i] || {};
      FB.validateSerfFreedomEffect(option.effects);
      FB.validateSerfFreedomEffect(option.success && option.success.effects);
      FB.validateSerfFreedomEffect(option.failure && option.failure.effects);
    }
    return true;
  }

  function freedomRecordEntry(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !SERF_FREEDOM_ROUTES[value.route] ||
        typeof value.protagonistId !== 'string' || !value.protagonistId ||
        typeof value.provinceId !== 'string' || !value.provinceId ||
        !Number.isInteger(value.settlementIndex) || value.settlementIndex < 0 ||
        !Number.isInteger(value.turn) || value.turn < 0 ||
        !Number.isInteger(value.year) || value.year < 0 ||
        !Number.isInteger(value.price) || value.price < 0 ||
        !Number.isInteger(value.serviceDays) || value.serviceDays < 0 ||
        value.serviceDays > 360) return null;
    const lawful = SERF_FREEDOM_ROUTES[value.route].lawful;
    if (!!value.lawful !== lawful) return null;
    if (lawful && value.lordId !== null &&
        typeof value.lordId !== 'string') return null;
    const out = {
      route:value.route, lawful:lawful,
      protagonistId:value.protagonistId,
      lordId:lawful ? (value.lordId || null) : null,
      provinceId:value.provinceId,
      settlementIndex:value.settlementIndex,
      turn:value.turn, year:value.year,
      price:lawful ? value.price : 0,
      serviceDays:lawful ? value.serviceDays : 0
    };
    if (lawful && typeof value.termId === 'string' && value.termId) {
      out.termId = value.termId;
    }
    if (Array.isArray(value.memberIds) && value.memberIds.length <= 128) {
      const seen = {}, members = [];
      for (let i = 0; i < value.memberIds.length; i++) {
        const id = value.memberIds[i];
        if (typeof id !== 'string' || !id || seen[id]) return null;
        seen[id] = 1;
        members.push(id);
      }
      if (!seen[value.protagonistId]) return null;
      out.memberIds = members;
    }
    return out;
  }

  FB.ensureFamilyFreedom = function (state) {
    if (!state || !state.player) return null;
    const raw = state.player.familyFreedom;
    if (raw === undefined || raw === null) return null;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      delete state.player.familyFreedom;
      return null;
    }
    const first = raw.version === 1 ? freedomRecordEntry(raw.first) : null;
    if (!first) {
      delete state.player.familyFreedom;
      return null;
    }
    const normalized = { version:1, first:first };
    if (!first.lawful) {
      const lawful = freedomRecordEntry(raw.firstLawful);
      if (lawful && lawful.lawful) normalized.firstLawful = lawful;
    }
    const entries = [normalized.first, normalized.firstLawful];
    let repairedLegacyMembership = false;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      if (!entry.memberIds) {
        repairedLegacyMembership = true;
        entry.memberIds = frozenFreedomMembers(
          state, entry.protagonistId, null);
      }
      for (let j = 0; j < entry.memberIds.length; j++) {
        const member = state.chars && state.chars[entry.memberIds[j]];
        if (member && FB.stationOf(member) < 1) member.station = 1;
        if (member) delete member.unfree;
      }
    }
    if (repairedLegacyMembership && state.chars) {
      for (const id in state.chars) {
        const relative = state.chars[id];
        if (!relative || relative.dead || FB.stationOf(relative) !== 0) continue;
        if (relative.role === 'parent' || relative.role === 'grandparent' ||
            relative.role === 'sibling') relative.unfree = true;
      }
    }
    state.player.familyFreedom = normalized;
    return normalized;
  };

  function familyFreedomName(state, id, fallback) {
    const c = id && state.chars && state.chars[id];
    return c ? FB.fullName(c) : fallback;
  }

  function familyFreedomPlace(state, entry) {
    const province = FB.world && FB.world.byId &&
      FB.world.byId[entry.provinceId];
    const settlements = FB.settlementsOf
      ? FB.settlementsOf(state, entry.provinceId) : [];
    const settlement = settlements[entry.settlementIndex];
    if (settlement && province) {
      return FB.T('{settlement}, {county}', {
        settlement:settlement.name, county:FB.L(province.name)
      });
    }
    if (province) return FB.L(province.name);
    return FB.T('an unrecorded home');
  }

  function familyFreedomLine(state, entry) {
    const protagonist = familyFreedomName(state, entry.protagonistId,
      FB.T('An earlier head of the household'));
    const home = familyFreedomPlace(state, entry);
    const lord = familyFreedomName(state, entry.lordId,
      FB.T('the local lord'));
    if (entry.route === 'flight') {
      return FB.T(
        '{protagonist} fled serfdom from {home} in {year}; no lawful charter was granted.', {
          protagonist:protagonist, home:home, year:entry.year
        });
    }
    if (entry.route === 'old_custom') {
      return FB.T(
        '{protagonist} won lawful freedom from {lord} at {home} under the Old Custom in {year}.', {
          protagonist:protagonist, lord:lord, home:home, year:entry.year
        });
    }
    if (entry.route === 'purchase') {
      return FB.T(
        '{protagonist} bought lawful freedom from {lord} at {home} for {money:price} in {year}.', {
          protagonist:protagonist, lord:lord, home:home,
          price:entry.price, year:entry.year
        });
    }
    if (entry.serviceDays) {
      return FB.T(
        '{protagonist} secured lawful freedom from {lord} at {home} for {money:price} and {days} days of final service in {year}.', {
          protagonist:protagonist, lord:lord, home:home,
          price:entry.price, days:entry.serviceDays, year:entry.year
        });
    }
    return FB.T(
      '{protagonist} secured lawful freedom from {lord} at {home} for {money:price} in {year}.', {
        protagonist:protagonist, lord:lord, home:home,
        price:entry.price, year:entry.year
      });
  }

  FB.familyFreedomView = function (state) {
    const record = state && state.player && state.player.familyFreedom;
    if (!record || !freedomRecordEntry(record.first)) return null;
    return {
      first:{ entry:record.first, text:familyFreedomLine(state, record.first) },
      firstLawful:record.firstLawful && freedomRecordEntry(record.firstLawful)
        ? { entry:record.firstLawful,
          text:familyFreedomLine(state, record.firstLawful) } : null
    };
  };

  function serfFreedomLord(state) {
    const id = state && state.roles && state.roles.lord;
    const lord = id && state.chars && state.chars[id];
    return lord && !lord.dead ? lord : null;
  }

  function serfFreedomHome(state) {
    const p = state.player;
    return {
      provinceId:p.provinceId || p.home || null,
      settlementIndex:(p.homeSettlement !== undefined
        ? p.homeSettlement : (p.settlement !== undefined ? p.settlement : 0)) | 0
    };
  }

  function frozenFreedomMembers(state, protagonistId, savedIds) {
    if (Array.isArray(savedIds) && savedIds.length) return savedIds.slice();
    const protagonist = state.chars && state.chars[protagonistId];
    if (!protagonist) return [];
    const out = [], seen = {}, queue = [protagonist];
    function add(c) {
      if (!c || seen[c.id]) return;
      seen[c.id] = 1;
      out.push(c.id);
    }
    add(protagonist);
    const spouses = FB.spousesSnapshot
      ? FB.spousesSnapshot(state, protagonist) : [];
    for (let i = 0; i < spouses.length; i++) add(spouses[i]);
    for (let i = 0; i < queue.length; i++) {
      const children = FB.childrenOf ? FB.childrenOf(state, queue[i]) : [];
      for (let j = 0; j < children.length; j++) {
        if (!children[j] || seen[children[j].id]) continue;
        queue.push(children[j]);
        add(children[j]);
      }
    }
    return out;
  }

  FB.serfFreedomStatus = function (state, spec, ctx) {
    spec = spec || {};
    ctx = ctx || {};
    const route = spec.route;
    const routeDef = SERF_FREEDOM_ROUTES[route];
    const out = { ready:false, reason:'invalid_route', route:route || null };
    if (!routeDef || !state || !state.player || !state.chars) return out;
    const p = state.player;
    const protagonist = state.chars[p.charId];
    if (!protagonist || protagonist.dead) {
      out.reason = 'invalid_protagonist'; return out;
    }
    if (p.tier !== 0) { out.reason = 'not_serf'; return out; }
    const tenure = FB.activeSerfTenure && FB.activeSerfTenure(state);
    const home = serfFreedomHome(state);
    if (!tenure || tenure.provinceId !== home.provinceId ||
        tenure.settlement !== home.settlementIndex) {
      out.reason = 'invalid_tenure'; return out;
    }
    let lord = serfFreedomLord(state);
    let price = 0;
    let serviceDays = 0;
    let termId = null;
    let offer = null;
    let recordProtagonistId = protagonist.id;
    let memberIds = null;

    if (route === 'purchase') {
      if (p.travel || FB.ageOf(protagonist, state.date.year) < 16) {
        out.reason = 'adult_at_home_required'; return out;
      }
      if (p.freedomOffer && p.freedomOffer.status === 'service') {
        out.reason = 'service_active'; return out;
      }
      if (!lord) { out.reason = 'missing_lord'; return out; }
      if (FB.standingOf(state, { kind:'character', id:lord.id }) < -20) {
        out.reason = 'hostile_lord'; return out;
      }
      price = FB.freedomPurchaseQuote
        ? FB.freedomPurchaseQuote(state, spec.additionalIds).price : 0;
      if (!price || p.gold < price) {
        out.reason = 'unaffordable'; return out;
      }
      memberIds = FB.freedomCoveredCharacterIds
        ? FB.freedomCoveredCharacterIds(state, spec.additionalIds)
        : [protagonist.id];
    } else if (route === 'manumission') {
      offer = p.freedomOffer;
      if (!offer || spec.offerCreatedTurn !== offer.createdTurn) {
        out.reason = 'offer_identity'; return out;
      }
      if (offer.status === 'offered') {
        const acceptance = FB.freedomOfferAcceptanceStatus &&
          FB.freedomOfferAcceptanceStatus(state, offer);
        if (!acceptance || !acceptance.ready || offer.serviceDays !== 0) {
          out.reason = acceptance && acceptance.reason || 'offer_not_ready';
          return out;
        }
        price = offer.price;
      } else if (offer.status === 'service') {
        const term = FB.freedomTermDefinition &&
          FB.freedomTermDefinition(offer.termId);
        if (offer.serviceDays <= 0 || offer.paidPrice !== offer.price ||
            !FB.freedomOfferSemanticsValid ||
            !FB.freedomOfferSemanticsValid(offer) ||
            !term || term.serviceDays !== offer.serviceDays ||
            !Number.isInteger(offer.acceptedTurn) ||
            !Number.isInteger(offer.serviceEndTurn) ||
            offer.serviceEndTurn !== offer.acceptedTurn + offer.serviceDays ||
            (state.turn || 0) < offer.serviceEndTurn ||
            offer.tenureFormedTurn !== tenure.formedTurn ||
            offer.provinceId !== home.provinceId ||
            offer.settlementIndex !== home.settlementIndex) {
          out.reason = 'service_not_due'; return out;
        }
        price = 0;
      } else {
        out.reason = 'offer_not_active'; return out;
      }
      serviceDays = offer.serviceDays;
      termId = offer.termId;
      lord = state.chars[offer.lordId] || null;
      if (offer.status === 'service') {
        recordProtagonistId = offer.protagonistId;
      }
      memberIds = frozenFreedomMembers(state, recordProtagonistId,
        offer.memberIds);
    } else if (route === 'old_custom') {
      if (!ctx.event || ctx.event.id !== 'old_custom_end' ||
          !p.flags.old_custom_resolve || !p.flags.old_custom_won) {
        out.reason = 'old_custom_context'; return out;
      }
      if (!lord) { out.reason = 'missing_lord'; return out; }
    } else if (route === 'flight') {
      if (!ctx.event || ctx.event.id !== 'flee_serfdom') {
        out.reason = 'flight_context'; return out;
      }
      lord = null;
    }
    if (!memberIds) {
      memberIds = FB.freedomCoveredCharacterIds
        ? FB.freedomCoveredCharacterIds(state, []) : [protagonist.id];
    }

    out.ready = true;
    out.reason = '';
    out.lawful = routeDef.lawful;
    out.tenureEndReason = routeDef.tenureEndReason;
    out.protagonistId = recordProtagonistId;
    out.lordId = route === 'flight' ? null
      : (offer ? offer.lordId : (lord ? lord.id : null));
    out.provinceId = home.provinceId;
    out.settlementIndex = home.settlementIndex;
    out.tenureFormedTurn = tenure.formedTurn;
    out.turn = state.turn || 0;
    out.year = state.date.year;
    out.price = price;
    out.serviceDays = serviceDays;
    out.termId = termId;
    out.offer = offer;
    out.memberIds = memberIds;
    return out;
  };

  function writeFamilyFreedom(state, frozen) {
    let history = FB.ensureFamilyFreedom(state);
    if (!history || typeof history !== 'object' ||
        !freedomRecordEntry(history.first)) {
      history = { version:1 };
      state.player.familyFreedom = history;
    }
    const entry = {
      route:frozen.route, lawful:frozen.lawful,
      protagonistId:frozen.protagonistId,
      lordId:frozen.lawful ? frozen.lordId : null,
      provinceId:frozen.provinceId,
      settlementIndex:frozen.settlementIndex,
      turn:frozen.turn, year:frozen.year,
      price:frozen.lawful ? frozen.totalPrice : 0,
      serviceDays:frozen.lawful ? frozen.serviceDays : 0
    };
    if (frozen.termId) entry.termId = frozen.termId;
    if (frozen.memberIds.length) entry.memberIds = frozen.memberIds.slice();
    if (!history.first) history.first = entry;
    else if (!history.first.lawful && frozen.lawful &&
        !history.firstLawful) history.firstLawful = entry;
  }

  function freedomChronicle(state, frozen) {
    const protagonist = familyFreedomName(state, frozen.protagonistId,
      FB.T('The household head'));
    const lord = familyFreedomName(state, frozen.lordId,
      FB.T('the local lord'));
    const home = familyFreedomPlace(state, {
      provinceId:frozen.provinceId,
      settlementIndex:frozen.settlementIndex
    });
    let message;
    if (frozen.route === 'purchase') {
      message = FB.msg('news.freedom.purchase',
        '📜 {protagonist} bought lawful freedom from {lord} at {home} for {money:price}.', {
          protagonist:protagonist, lord:lord, home:home, price:frozen.totalPrice
        });
    } else if (frozen.route === 'manumission' && frozen.serviceDays) {
      message = FB.msg('news.freedom.manumission_service',
        '📜 {protagonist} completed {days} days of final service and received lawful freedom from {lord} at {home} for {money:price}.', {
          protagonist:protagonist, lord:lord, home:home,
          days:frozen.serviceDays, price:frozen.totalPrice
        });
    } else if (frozen.route === 'manumission') {
      message = FB.msg('news.freedom.manumission',
        '📜 {protagonist} accepted lawful freedom from {lord} at {home} for {money:price}.', {
          protagonist:protagonist, lord:lord, home:home, price:frozen.totalPrice
        });
    } else if (frozen.route === 'old_custom') {
      message = FB.msg('news.freedom.old_custom',
        '📜 {protagonist} won lawful freedom from {lord} at {home} under the Old Custom.', {
          protagonist:protagonist, lord:lord, home:home
        });
    } else {
      message = FB.msg('news.freedom.flight',
        '🏃 {protagonist} fled serfdom from {home}; no lawful charter was granted.', {
          protagonist:protagonist, home:home
        });
    }
    FB.news(state, message);
  }

  function lawfulFreedomNotice(state, frozen) {
    if (!frozen.lawful) return;
    state.player.flags = state.player.flags || {};
    if (state.player.flags.hint_serf_freed) return;
    state.player.flags.hint_serf_freed = 1;
    if (FB.fx && FB.fx.push) {
      FB.fx.push({
        kind:'toast', bypassSuppression:true,
        message:FB.msg('fx.freedom.first_lawful',
          'Lawful freedom ends the household’s serf tenure: scheduled serf duties and serf-only restrictions no longer apply. As Freeholders, the family may pursue free livelihoods and acquire land; the first lawful freedom is recorded in Family landmarks.', {}),
        legacyText:null
      });
    }
  }

  FB.resolveSerfFreedom = function (state, spec, ctx) {
    const status = FB.serfFreedomStatus(state, spec, ctx);
    if (!status.ready) return false;
    const offer = status.offer;
    const totalPrice = offer ? offer.price : status.price;
    const frozen = {
      route:status.route, lawful:status.lawful,
      protagonistId:status.protagonistId, lordId:status.lordId,
      provinceId:status.provinceId,
      settlementIndex:status.settlementIndex,
      tenureFormedTurn:status.tenureFormedTurn,
      turn:status.turn, year:status.year,
      chargedPrice:status.price, totalPrice:totalPrice,
      serviceDays:status.serviceDays, termId:status.termId,
      memberIds:status.memberIds.slice()
    };
    if (Object.freeze) Object.freeze(frozen.memberIds);
    if (Object.freeze) Object.freeze(frozen);

    if (status.price) state.player.gold -= status.price;
    const activeOffer = state.player.freedomOffer;
    if (status.route === 'manumission' && activeOffer === offer) {
      activeOffer.status = 'resolved';
      activeOffer.resolvedTurn = status.turn;
    } else if (activeOffer && (activeOffer.status === 'offered' ||
        activeOffer.status === 'service')) {
      activeOffer.status = 'superseded';
      activeOffer.supersededTurn = status.turn;
    }
    /* Freeze inferred bondage from a legacy tier-0 life before promotion
       removes the household context used to recognize it. The covered
       charter members are cleared immediately below. */
    if (FB.isUnfreeCharacter && state.chars) {
      for (const id in state.chars) {
        const relative = state.chars[id];
        if (FB.isUnfreeCharacter(state, relative)) relative.unfree = true;
      }
    }
    FB.setPlayerTier(state, 1, {
      tenureEndReason:status.tenureEndReason,
      freedomResolution:true
    });
    for (let i = 0; i < frozen.memberIds.length; i++) {
      const member = state.chars[frozen.memberIds[i]];
      if (member && !member.dead && FB.stationOf(member) < 1) {
        member.station = 1;
      }
      if (member) delete member.unfree;
    }
    if (status.route === 'purchase' || status.route === 'manumission') {
      state.player.prestige += 15;
      state.player.piety += 5;
    }
    writeFamilyFreedom(state, frozen);
    freedomChronicle(state, frozen);
    lawfulFreedomNotice(state, frozen);
    return frozen;
  };

  FB.freedomDay = function (state) {
    if (!state || !state.player) return;
    if (FB.ensureFreedomOffer) FB.ensureFreedomOffer(state);
    const offer = state.player.freedomOffer;
    if (!offer || (offer.status !== 'offered' && offer.status !== 'service')) return;
    const p = state.player;
    const tenure = FB.activeSerfTenure && FB.activeSerfTenure(state);
    const home = serfFreedomHome(state);
    const term = FB.freedomTermDefinition &&
      FB.freedomTermDefinition(offer.termId);
    if (offer.status === 'offered') {
      if ((state.turn || 0) > offer.expiryTurn) {
        offer.status = 'expired';
        return;
      }
      const lord = serfFreedomLord(state);
      if (p.tier !== 0 || offer.protagonistId !== p.charId ||
          !tenure || tenure.formedTurn !== offer.tenureFormedTurn ||
          home.provinceId !== offer.provinceId ||
          home.settlementIndex !== offer.settlementIndex ||
          !lord || lord.id !== offer.lordId || !term ||
          term.serviceDays !== offer.serviceDays) offer.status = 'invalid';
      return;
    }
    if (p.tier !== 0 || !tenure ||
        tenure.formedTurn !== offer.tenureFormedTurn ||
        home.provinceId !== offer.provinceId ||
        home.settlementIndex !== offer.settlementIndex ||
        !term || term.serviceDays !== offer.serviceDays ||
        !Number.isInteger(offer.serviceEndTurn)) {
      offer.status = 'invalid';
      return;
    }
    if ((state.turn || 0) >= offer.serviceEndTurn) {
      FB.resolveSerfFreedom(state, {
        route:'manumission', offerCreatedTurn:offer.createdTurn
      }, { daily:true });
    }
  };

  const OLD_CUSTOM_STAGE_FLAGS = [
    'old_custom_1', 'old_custom_2', 'old_custom_3', 'old_custom_resolve'
  ];
  const OLD_CUSTOM_OUTCOME_FLAGS = [
    'old_custom_won', 'old_custom_lost', 'old_custom_compromise',
    'old_custom_betrayed', 'rights_evidence', 'rights_collaborator'
  ];
  const OLD_CUSTOM_ALL_FLAGS = OLD_CUSTOM_STAGE_FLAGS.concat(
    OLD_CUSTOM_OUTCOME_FLAGS);

  function oldCustomStage(state) {
    const flags = state.player.flags || {};
    const active = [];
    for (let i = 0; i < OLD_CUSTOM_STAGE_FLAGS.length; i++) {
      if (flags[OLD_CUSTOM_STAGE_FLAGS[i]]) active.push(i);
    }
    if (active.length !== 1) return null;
    return ['memory','officer','hearing','resolution'][active[0]];
  }

  function clearOldCustom(state, reason, quiet) {
    const p = state.player;
    delete p.serfStory;
    for (const flag of OLD_CUSTOM_ALL_FLAGS) {
      delete p.flags[flag];
    }
    state.eventQueue = (state.eventQueue || []).filter(function (item) {
      return item.id !== 'old_custom_officer_changed' &&
        item.id.indexOf('old_custom_') !== 0;
    });
    if (!quiet && reason) {
      const fallbacks = {
        succession:'📜 The Old Custom case closes with the succession.',
        tenure:'📜 The Old Custom case closes because the customary tenure ended.',
        home:'📜 The Old Custom case closes because the household left its old home.',
        authority:'📜 The Old Custom case closes because the lordship changed hands.',
        witness:'📜 The Old Custom case closes because the witness could no longer testify.',
        rank:'📜 The Old Custom case closes because the household’s station changed.'
      };
      const reasonId = fallbacks[reason] ? reason : 'tenure';
      FB.news(state, FB.msg('news.serf.old_custom_ended.' + reasonId,
        fallbacks[reasonId], { reason:reasonId }));
    }
  }

  function oldCustomRecordValid(state, story) {
    const expectedKeys = [
      'homeProvinceId','id','lordId','participantKinds','participants',
      'pendingReplacement','protagonistId','schema','stage','startedTurn',
      'tenureFormedTurn'
    ].join(',');
    const participantKeys = story && story.participants &&
      typeof story.participants === 'object' && !Array.isArray(story.participants)
      ? Object.keys(story.participants).sort().join(',') : '';
    const kinds = story && story.participantKinds;
    const kindKeys = kinds && typeof kinds === 'object' && !Array.isArray(kinds)
      ? Object.keys(kinds).sort().join(',') : '';
    const pending = story && story.pendingReplacement;
    const pendingKeys = pending && typeof pending === 'object' &&
      !Array.isArray(pending) ? Object.keys(pending).sort().join(',') : '';
    if (!story || typeof story !== 'object' || story.schema !== 1 ||
        Array.isArray(story) || Object.keys(story).sort().join(',') !== expectedKeys ||
        story.id !== 'old_custom' || story.protagonistId !== state.player.charId ||
        typeof story.homeProvinceId !== 'string' ||
        !Number.isInteger(story.tenureFormedTurn) || story.tenureFormedTurn < 0 ||
        typeof story.lordId !== 'string' ||
        !Number.isInteger(story.startedTurn) || story.startedTurn < 0 ||
        ['memory','officer','hearing','resolution'].indexOf(story.stage) < 0 ||
        participantKeys !== 'lord,officer,witness' ||
        story.participants.lord !== story.lordId ||
        typeof story.participants.officer !== 'string' ||
        typeof story.participants.witness !== 'string' ||
        kindKeys !== 'lord,officer,witness' ||
        kinds.lord !== 'lord' || kinds.officer !== 'steward' ||
        ['friend','rival','notable','kin','contact'].indexOf(kinds.witness) < 0 ||
        (pending !== null && (pendingKeys !== 'newOfficerId,oldOfficerId' ||
          typeof pending.oldOfficerId !== 'string' ||
          typeof pending.newOfficerId !== 'string' ||
          pending.oldOfficerId !== story.participants.officer ||
          pending.oldOfficerId === pending.newOfficerId))) return false;
    return true;
  }

  function makeOldCustomStory(state, ctx, stage) {
    const tenure = FB.activeSerfTenure(state);
    if (!tenure || !ctx || !ctx.participants) return null;
    const participants = ctx.participants;
    if (!participants.lord || !participants.officer || !participants.witness) {
      return null;
    }
    return {
      schema:1, id:'old_custom', protagonistId:state.player.charId,
      homeProvinceId:tenure.provinceId,
      tenureFormedTurn:tenure.formedTurn,
      lordId:participants.lord,
      startedTurn:state.turn || 0,
      stage:stage,
      participants:{
        lord:participants.lord,
        officer:participants.officer,
        witness:participants.witness
      },
      participantKinds:{
        lord:FB.eventParticipantKind(ctx, 'lord') || 'lord',
        officer:FB.eventParticipantKind(ctx, 'officer') || 'steward',
        witness:FB.eventParticipantKind(ctx, 'witness') || 'notable'
      },
      pendingReplacement:null
    };
  }

  FB.syncSerfStoryAfterEvent = function (state, ev, ctx) {
    if (!ev || ev.id.indexOf('old_custom_') !== 0 ||
        ev.id === 'old_custom_officer_changed') return false;
    const stage = oldCustomStage(state);
    if (!stage) {
      if (state.player.serfStory) clearOldCustom(state, null, true);
      return true;
    }
    let story = state.player.serfStory;
    if (!story && ev.id === 'old_custom_stakes') {
      story = makeOldCustomStory(state, ctx, stage);
      if (!story) return false;
      state.player.serfStory = story;
    }
    if (!oldCustomRecordValid(state, story)) return false;
    story.stage = stage;
    return true;
  };

  FB.fns.serf_old_custom_sync = function (state, ctx, ev) {
    return FB.syncSerfStoryAfterEvent(state, ev, ctx);
  };

  FB.fns.serf_old_custom_ready = function (state) {
    const story = state.player.serfStory;
    return !!(oldCustomRecordValid(state, story) && !story.pendingReplacement);
  };

  FB.fns.serf_old_custom_replace_officer = function (state, ctx) {
    const story = state.player.serfStory;
    const pending = story && story.pendingReplacement;
    if (!FB.fns.serf_old_custom_replacement_valid(state, ctx) ||
        !oldCustomRecordValid(state, story) || !pending || !ctx.participants ||
        ctx.participants.formerOfficer !== pending.oldOfficerId ||
        ctx.participants.newOfficer !== pending.newOfficerId ||
        state.roles.steward !== pending.newOfficerId) return false;
    story.participants.officer = pending.newOfficerId;
    story.participantKinds.officer = 'steward';
    story.pendingReplacement = null;
    return true;
  };

  FB.fns.serf_old_custom_replacement_valid = function (state, ctx) {
    const story = state.player.serfStory;
    const pending = story && story.pendingReplacement;
    const tenure = FB.activeSerfTenure(state);
    const witness = story && story.participants &&
      state.chars[story.participants.witness];
    return !!(oldCustomRecordValid(state, story) && pending && tenure &&
      state.player.tier === 0 &&
      tenure.formedTurn === story.tenureFormedTurn &&
      tenure.provinceId === story.homeProvinceId &&
      state.player.provinceId === story.homeProvinceId &&
      state.roles.lord === story.lordId && state.roles.steward === pending.newOfficerId &&
      witness && !witness.dead &&
      participantResident(state, witness, story.homeProvinceId) &&
      ctx && ctx.participants &&
      ctx.participants.formerOfficer === pending.oldOfficerId &&
      ctx.participants.newOfficer === pending.newOfficerId &&
      ctx.participants.witness === story.participants.witness);
  };

  function queueOldCustomReplacement(state, story, oldOfficerId, newOfficerId) {
    state.eventQueue = (state.eventQueue || []).filter(function (item) {
      return item.id !== 'old_custom_officer_changed';
    });
    story.pendingReplacement = {
      oldOfficerId:oldOfficerId, newOfficerId:newOfficerId
    };
    const bridge = FB.queueEvent(state, 'old_custom_officer_changed', {
      participants:{
        formerOfficer:oldOfficerId, newOfficer:newOfficerId,
        witness:story.participants.witness
      },
      participantKinds:{
        formerOfficer:'steward', newOfficer:'steward',
        witness:story.participantKinds.witness || 'notable'
      }
    });
    if (bridge) {
      const bridgeIndex = state.eventQueue.indexOf(bridge);
      if (bridgeIndex > 0) {
        state.eventQueue.splice(bridgeIndex, 1);
        state.eventQueue.unshift(bridge);
      }
    }
  }

  FB.reconcileSerfStory = function (state) {
    const p = state.player;
    const stage = oldCustomStage(state);
    let story = p.serfStory;
    if (!stage) {
      let staleFlags = false;
      for (const flag of OLD_CUSTOM_ALL_FLAGS) {
        if (p.flags && p.flags[flag]) { staleFlags = true; break; }
      }
      if (story || staleFlags) clearOldCustom(state, 'tenure');
      return;
    }
    if (!story) {
      const opener = FB.eventById('old_custom_stakes');
      const ctx = FB.eventContextFor(state, opener, {});
      story = ctx && makeOldCustomStory(state, ctx, stage);
      if (!story) {
        clearOldCustom(state, 'tenure');
        return;
      }
      p.serfStory = story;
    }
    if (story.protagonistId !== p.charId) {
      clearOldCustom(state, 'succession');
      return;
    }
    if (!oldCustomRecordValid(state, story)) {
      clearOldCustom(state, 'tenure');
      return;
    }
    story.stage = stage;
    const tenure = FB.activeSerfTenure(state);
    if (!tenure || tenure.formedTurn !== story.tenureFormedTurn) {
      clearOldCustom(state, 'tenure'); return;
    }
    if (p.provinceId !== story.homeProvinceId) {
      clearOldCustom(state, 'home'); return;
    }
    if (!state.roles || state.roles.lord !== story.lordId ||
        !state.chars[story.lordId] || state.chars[story.lordId].dead) {
      clearOldCustom(state, 'authority'); return;
    }
    if (p.tier !== 0) {
      clearOldCustom(state, 'rank'); return;
    }
    const witness = state.chars[story.participants.witness];
    if (!witness || witness.dead ||
        !participantResident(state, witness, story.homeProvinceId)) {
      clearOldCustom(state, 'witness'); return;
    }
    const currentOfficer = FB.getRole(state, 'steward', true);
    if (!currentOfficer) {
      clearOldCustom(state, 'authority'); return;
    }
    if (story.participants.officer !== currentOfficer.id) {
      const pending = story.pendingReplacement;
      if (!pending || pending.newOfficerId !== currentOfficer.id ||
          pending.oldOfficerId !== story.participants.officer) {
        queueOldCustomReplacement(state, story,
          story.participants.officer, currentOfficer.id);
      }
    }
  };

  function neighborConsequenceValid(state, record) {
    const expectedKeys = [
      'characterId','createdTurn','dueTurn','homeProvinceId','kind',
      'officerId','protagonistId','queued','schema','tenureFormedTurn'
    ].join(',');
    return !!(record && typeof record === 'object' && !Array.isArray(record) &&
      Object.keys(record).sort().join(',') === expectedKeys && record.schema === 1 &&
      record.kind === 'shifted_quartering' &&
      record.protagonistId === state.player.charId &&
      typeof record.homeProvinceId === 'string' &&
      Number.isInteger(record.tenureFormedTurn) && record.tenureFormedTurn >= 0 &&
      typeof record.characterId === 'string' && record.characterId &&
      typeof record.officerId === 'string' && record.officerId &&
      record.characterId !== record.officerId &&
      Number.isInteger(record.createdTurn) && record.createdTurn >= 0 &&
      Number.isInteger(record.dueTurn) &&
      record.dueTurn === record.createdTurn +
        FBDATA.balance.serfNeighborConsequenceDays &&
      typeof record.queued === 'boolean');
  }

  function clearNeighborConsequence(state, reason) {
    const record = state.player.serfNeighborConsequence;
    delete state.player.serfNeighborConsequence;
    state.eventQueue = (state.eventQueue || []).filter(function (item) {
      return item.id !== 'serf_neighbor_reckoning';
    });
    if (record && reason) {
      const reasonId = reason === 'neighbor' ? 'neighbor' : 'tenure';
      const fallback = reasonId === 'neighbor'
        ? '🏘 The old quartering quarrel ends because the neighboring household can no longer answer it.'
        : '🏘 The old quartering quarrel ends with the household’s old customary bond.';
      FB.news(state, FB.msg(
        'news.serf.neighbor_consequence_ended.' + reasonId,
        fallback, { reason:reasonId }));
    }
  }

  FB.fns.serf_neighbor_shifted = function (state, ctx) {
    const existing = state.player.serfNeighborConsequence;
    if (existing && neighborConsequenceValid(state, existing)) return false;
    const tenure = FB.activeSerfTenure(state);
    const neighbor = FB.eventParticipant(state, ctx, 'neighbor');
    const officer = FB.eventParticipant(state, ctx, 'officer');
    if (!tenure || !neighbor || !officer) return false;
    const createdTurn = state.turn || 0;
    state.player.serfNeighborConsequence = {
      schema:1, kind:'shifted_quartering',
      protagonistId:state.player.charId,
      homeProvinceId:tenure.provinceId,
      tenureFormedTurn:tenure.formedTurn,
      characterId:neighbor.id, officerId:officer.id,
      createdTurn:createdTurn,
      dueTurn:createdTurn + FBDATA.balance.serfNeighborConsequenceDays,
      queued:false
    };
    return true;
  };

  FB.fns.serf_neighbor_clear = function (state) {
    clearNeighborConsequence(state, null);
    return true;
  };

  FB.fns.serf_neighbor_context_valid = function (state, ctx) {
    const record = state.player.serfNeighborConsequence;
    return !!(neighborConsequenceValid(state, record) && record.queued &&
      ctx && ctx.participants &&
      ctx.participants.neighbor === record.characterId &&
      ctx.participants.officer === record.officerId);
  };

  FB.fns.serf_neighbor_officer_current = function (state, ctx) {
    return !!(ctx && ctx.participants &&
      state.roles.steward === ctx.participants.officer &&
      FB.eventParticipant(state, ctx, 'officer'));
  };

  FB.fns.serf_flight_failure = function (state, ctx) {
    if (FB.eventParticipantKind(ctx, 'confidant') === 'rival' &&
        FB.eventParticipant(state, ctx, 'confidant')) {
      FB.changeRivalHeat(state, 5);
    }
    return true;
  };

  FB.reconcileSerfNeighborConsequence = function (state) {
    const record = state.player.serfNeighborConsequence;
    if (!record) return;
    if (!neighborConsequenceValid(state, record)) {
      clearNeighborConsequence(state, null); return;
    }
    const tenure = FB.activeSerfTenure(state);
    if (state.player.tier !== 0 || !tenure ||
        tenure.formedTurn !== record.tenureFormedTurn ||
        state.player.provinceId !== record.homeProvinceId) {
      clearNeighborConsequence(state, 'tenure'); return;
    }
    const neighbor = state.chars[record.characterId];
    if (!neighbor || neighbor.dead ||
        !participantResident(state, neighbor, record.homeProvinceId)) {
      clearNeighborConsequence(state, 'neighbor'); return;
    }
    if (!record.queued && (state.turn || 0) >= record.dueTurn) {
      const queued = FB.queueEvent(state, 'serf_neighbor_reckoning', {
        participants:{
          neighbor:record.characterId, officer:record.officerId
        },
        participantKinds:{
          neighbor:participantKindFor(state,
            { source:'local_neighbor', slot:'neighbor' }, neighbor) || 'contact',
          officer:'steward'
        }
      });
      if (queued) record.queued = true;
    }
  };

  FB.serfParticipantSuccession = function (state) {
    if (state.player.serfStory) clearOldCustom(state, null, true);
    clearNeighborConsequence(state, null);
    delete state.player.tenureTransition;
    removeQueuedTenureReviews(state);
    const tenure = FB.activeSerfTenure(state);
    if (tenure) {
      const current = FB.serfHomeAuthority(state);
      if (current) {
        tenure.authorityCheckpoint = copySerfAuthority(current);
        tenure.authorityCheckpoint.acknowledgedTurn = state.turn || 0;
      }
    }
  };

  FB.serfParticipantRankChanged = function (state, quietStory) {
    if (state.player.serfStory) {
      clearOldCustom(state, 'rank', !!quietStory);
    }
    if (state.player.serfNeighborConsequence) {
      clearNeighborConsequence(state, 'tenure');
    }
  };

  FB.serfParticipantTenureChanged = function (state) {
    if (state.player.serfStory) clearOldCustom(state, 'tenure');
    if (state.player.serfNeighborConsequence) {
      clearNeighborConsequence(state, 'tenure');
    }
    delete state.player.tenureTransition;
    removeQueuedTenureReviews(state);
  };

  FB.fns = FB.fns || {};
  FB.fns.serf_tenure_context_valid = function (state, ctx, ev) {
    if (!state || !state.player || state.player.tier !== 0) return false;
    if (state.player.travel) return false;
    const tenure = state.player.tenure;
    if (!tenure || typeof tenure !== 'object' || tenure.status !== 'active') return false;
    if (!ctx || typeof ctx !== 'object') return false;
    if (ctx.tenureFormedTurn !== tenure.formedTurn) return false;
    const contextRevision = ctx.tenureRevision === undefined
      ? 0 : ctx.tenureRevision;
    const activeRevision = Number.isInteger(tenure.revision)
      ? tenure.revision : 0;
    if (contextRevision !== activeRevision) return false;
    if (ctx.archetypeId && ctx.archetypeId !== tenure.archetypeId) return false;
    if (ctx.tenureArchetypeId !== undefined &&
        ctx.tenureArchetypeId !== tenure.archetypeId) return false;
    if (ctx.tenureProvinceId !== undefined &&
        ctx.tenureProvinceId !== tenure.provinceId) return false;
    if (ctx.tenureSettlement !== undefined &&
        ctx.tenureSettlement !== tenure.settlement) return false;
    if (ctx.tenureVariantId !== undefined &&
        ctx.tenureVariantId !== tenure.archetypeId + ':' + ctx.dutyId) return false;

    const homeProvId = state.player.provinceId || state.player.home;
    const settIdx = (state.player.homeSettlement !== undefined ? state.player.homeSettlement : (state.player.settlement !== undefined ? state.player.settlement : 0)) | 0;
    if (tenure.provinceId !== homeProvId || tenure.settlement !== settIdx) return false;
    if (ctx.protagonistId !== state.player.charId) return false;

    const curLocation = state.player.travel ? state.player.travel.currentId : (state.player.provinceId || state.player.home);
    if (ctx.locationId !== curLocation || curLocation !== tenure.provinceId) return false;

    const dutyId = ctx.dutyId;
    if (!dutyId) return false;
    let matchingDuty = null;
    let isConditional = false;
    for (let i = 0; i < (tenure.duties || []).length; i++) {
      if (tenure.duties[i].id === dutyId) {
        matchingDuty = tenure.duties[i];
        break;
      }
    }
    if (!matchingDuty) {
      for (let c = 0; c < (tenure.conditional || []).length; c++) {
        if (tenure.conditional[c].id === dutyId) {
          matchingDuty = tenure.conditional[c];
          isConditional = true;
          break;
        }
      }
    }
    if (!matchingDuty) return false;
    if (ev && matchingDuty.eventId !== ev.id) return false;
    if (matchingDuty.mode === 'coin') {
      if (!Number.isInteger(matchingDuty.commutationGold) ||
          ctx.commutationGold !== matchingDuty.commutationGold) return false;
    } else if (ctx.commutationGold !== undefined &&
        ctx.commutationGold !== null) return false;

    const expectedDueTurn = isConditional ? matchingDuty.pendingTurn : matchingDuty.nextDueTurn;
    if (ctx.dueTurn !== expectedDueTurn) return false;
    if (expectedDueTurn === null || expectedDueTurn === undefined || expectedDueTurn > (state.turn || 0)) return false;

    return true;
  };

  FB.fns.serf_tenure_transition_valid = function (state, ctx) {
    const record = state && state.player && state.player.tenureTransition;
    if (!record || record.status !== 'queued' || !record.queued ||
        !transitionRecordValid(state, record) ||
        !transitionContextMatches(record, ctx)) return false;
    const proposal = FB.serfTenureTransitionProposal(state, record);
    const fields = ['kind','dutyId','rightId','additionalDutyId','commutationGold'];
    for (let i = 0; i < fields.length; i++) {
      if (authorityValue(proposal[fields[i]]) !==
          authorityValue(record.proposal[fields[i]])) return false;
    }
    if (record.witnessId) {
      const witness = state.chars && state.chars[record.witnessId];
      if (!witness || witness.dead || !FB.characterResidence ||
          FB.characterResidence(state, witness) !== record.provinceId) {
        return false;
      }
    }
    return true;
  };

  function transitionIsAdverse(state, ctx) {
    return FB.fns.serf_tenure_transition_valid(state, ctx) &&
      ['add_duty','commute_duty','challenge_right'].indexOf(
        state.player.tenureTransition.proposal.kind) >= 0;
  }

  function transitionStanding(state, characterId, amount) {
    const c = characterId && state.chars && state.chars[characterId];
    if (!c || c.dead || state.roles.lord !== c.id) return;
    FB.adjustStanding(state, { kind:'character', id:c.id }, amount,
      'event:serf_tenure_review');
  }

  FB.fns.serf_transition_adverse = function (state, ctx) {
    return transitionIsAdverse(state, ctx);
  };
  FB.fns.serf_transition_restore = function (state, ctx) {
    return FB.fns.serf_tenure_transition_valid(state, ctx) &&
      state.player.tenureTransition.proposal.kind === 'restore_right';
  };
  FB.fns.serf_transition_witness = function (state, ctx) {
    if (!FB.fns.serf_tenure_transition_valid(state, ctx)) return false;
    const record = state.player.tenureTransition;
    const tenure = FB.activeSerfTenure(state);
    const confirmRestore = record.proposal.kind === 'confirm' &&
      tenure.rights.length < 2 &&
      !!transitionHistoryRight(tenure, 'challenged_right');
    return (transitionIsAdverse(state, ctx) || confirmRestore) &&
      !!(record.witnessId && state.chars[record.witnessId] &&
        !state.chars[record.witnessId].dead);
  };
  FB.fns.serf_transition_pay_ready = function (state, ctx) {
    return FB.fns.serf_tenure_transition_valid(state, ctx) &&
      state.player.tenureTransition.proposal.kind !== 'restore_right' &&
      state.player.gold >= 4;
  };
  FB.fns.serf_transition_primary = function (state, ctx) {
    if (!FB.fns.serf_tenure_transition_valid(state, ctx)) return false;
    const record = state.player.tenureTransition;
    const revision = record.revision;
    const lordId = record.newAuthority.localLordId;
    const kind = record.proposal.kind;
    const resolved = FB.resolveSerfTenureTransition(state, revision,
      kind === 'restore_right' ? 'restore' : 'preserve');
    if (resolved && kind !== 'confirm' && kind !== 'restore_right') {
      transitionStanding(state, lordId, -5);
    }
    return resolved;
  };
  FB.fns.serf_transition_accept = function (state, ctx) {
    if (!transitionIsAdverse(state, ctx)) return false;
    const record = state.player.tenureTransition;
    const revision = record.revision;
    const lordId = record.newAuthority.localLordId;
    const resolved = FB.resolveSerfTenureTransition(state, revision, 'accept');
    if (resolved) transitionStanding(state, lordId, 8);
    return resolved;
  };
  FB.fns.serf_transition_pay = function (state, ctx) {
    if (!FB.fns.serf_transition_pay_ready(state, ctx)) return false;
    const record = state.player.tenureTransition;
    const revision = record.revision;
    const lordId = record.newAuthority.localLordId;
    const confirmation = record.proposal.kind === 'confirm';
    const resolved = FB.resolveSerfTenureTransition(state, revision, 'preserve');
    if (!resolved) return false;
    state.player.gold -= 4;
    transitionStanding(state, lordId, confirmation ? 5 : 3);
    return true;
  };
  FB.fns.serf_transition_witness_success = function (state, ctx) {
    if (!FB.fns.serf_transition_witness(state, ctx)) return false;
    const record = state.player.tenureTransition;
    const revision = record.revision;
    const confirmation = record.proposal.kind === 'confirm';
    const resolved = FB.resolveSerfTenureTransition(state, revision,
      confirmation ? 'restore' : 'preserve');
    if (resolved && !confirmation) state.player.prestige += 3;
    return resolved;
  };
  FB.fns.serf_transition_witness_failure = function (state, ctx) {
    if (!FB.fns.serf_transition_witness(state, ctx)) return false;
    const record = state.player.tenureTransition;
    const revision = record.revision;
    const confirmation = record.proposal.kind === 'confirm';
    const resolved = FB.resolveSerfTenureTransition(state, revision,
      confirmation ? 'preserve' : 'accept');
    if (resolved && !confirmation) state.player.prestige -= 3;
    return resolved;
  };
  FB.fns.serf_transition_decline_restore = function (state, ctx) {
    if (!FB.fns.serf_transition_restore(state, ctx)) return false;
    return FB.resolveSerfTenureTransition(state,
      state.player.tenureTransition.revision, 'decline_restore');
  };
  FB.fns.serf_commuted_pay_ready = function (state, ctx) {
    return FB.fns.serf_tenure_context_valid(state, ctx,
      FB.eventById('serf_commuted_due')) &&
      Number.isInteger(ctx.commutationGold) && ctx.commutationGold >= 0 &&
      state.player.gold >= ctx.commutationGold;
  };
  FB.fns.serf_commuted_pay = function (state, ctx) {
    if (!FB.fns.serf_commuted_pay_ready(state, ctx)) return false;
    state.player.gold -= ctx.commutationGold;
    return true;
  };
  /* Shadow index from an effects object to its durable event-log key. It is
     rebuilt after mods apply, without writing metadata into moddable data.
     Register every effective event/scripted-history source at the same time:
     a descriptor restored from a save must retain its mod-authored English
     fallback even when that event does not fire again in this browser run. */
  let eventLogIndex = [];
  function scriptedPart(value) {
    return String(value === undefined || value === null ? 'world' : value)
      .replace(/[^A-Za-z0-9_-]/g, '_');
  }
  FB.scriptedMessageKey = function (item) {
    if (item && item.id) {
      return 'news.world.scripted.' + scriptedPart(FB.activeBookmarkId || '867') + '.' +
        scriptedPart(item.id);
    }
    const subject = item && item.newRealm && item.newRealm.id
      ? item.newRealm.id
      : (item && item.realm);
    return 'news.world.scripted.' + scriptedPart(item && item.year) + '.' +
      scriptedPart(subject);
  };
  FB.indexEventMessages = function () {
    eventLogIndex = [];
    function registerSource(key, source) {
      if (typeof source === 'string') {
        FB.registerMessage(key + '.default', { text: source });
      } else if (source && (typeof source.text === 'string' || source.forms)) {
        FB.registerMessage(key + '.default', source);
      } else if (source && typeof source === 'object') {
        for (const branch in source) {
          if (typeof source[branch] === 'string') {
            FB.registerMessage(key + '.' + branch, { text: source[branch] });
          }
        }
      }
    }
    function add(fx, key) {
      if (!fx || fx.log === undefined) return;
      eventLogIndex.push({ fx: fx, key: key, source: fx.log });
      registerSource(key, fx.log);
    }
    for (const ev of FBDATA.events) {
      const eventBase = 'event.' + ev.id;
      registerSource(eventBase + '.title', ev.title);
      registerSource(eventBase + '.text', ev.text);
      for (let i = 0; i < (ev.options || []).length; i++) {
        const option = ev.options[i];
        const base = eventBase + '.options.' + i;
        registerSource(base + '.label', option.label);
        registerSource(base + '.desc', option.desc);
        registerSource(base + '.success.text', option.success && option.success.text);
        registerSource(base + '.failure.text', option.failure && option.failure.text);
        add(option.effects, base + '.effects.log');
        add(option.success && option.success.effects, base + '.success.effects.log');
        add(option.failure && option.failure.effects, base + '.failure.effects.log');
      }
    }
    for (let i = 0; i < (FBDATA.scripted || []).length; i++) {
      const scripted = FBDATA.scripted[i];
      if (scripted && typeof scripted.news === 'string') {
        FB.registerMessage(FB.scriptedMessageKey(scripted), {
          text: '📜 ' + scripted.news
        });
      }
    }
  };
  FB.eventLogMessage = function (state, fx, ctx) {
    let info = null;
    for (let i = 0; i < eventLogIndex.length; i++) {
      if (eventLogIndex[i].fx === fx) { info = eventLogIndex[i]; break; }
    }
    if (!info) {
      const raw = typeof fx.log === 'string' ? fx.log : (fx.log.default || '');
      const key = 'event.log.' + FB.i18nSourceKey(raw).slice(4);
      materializeTextRoles(state, raw, ctx);
      FB.registerMessage(key, { text: raw });
      return FB.message(key, FB.textParams(state, state.player.charId, raw, ctx, true));
    }
    const me = state.chars[state.player.charId];
    const selected = typeof info.source === 'string'
      ? { branch:'default', value:info.source }
      : FB.faithBranch(state, me.religion, info.source);
    const source = selected.value;
    const branch = selected.branch;
    materializeTextRoles(state, source, ctx);
    return FB.message(info.key + '.' + branch,
      FB.textParams(state, state.player.charId, source, ctx, true));
  };

  FB.markFired = function (state, ev) {
    if (ev.once) state.player.fired[ev.id] = 1;
    if (ev.cooldown) state.player.cooldowns[ev.id] = state.turn;
  };

  /* ---------- event consequence previews and impact receipts ----------
     Preview records are semantic rather than prose. They are safe to build
     repeatedly for hover, focus, and touch disclosure: no writer or RNG API
     is called. Resolution ledgers use the same record vocabulary, but their
     deltas come from before/after state so clamps and soft caps are reported
     as they actually landed. */
  const EVENT_EFFECT_KEYS = [
    'marriageEnd','gold','pricePressure','pricePressureYears','pricePressureSource','marketShock',
    'prestige','piety','guildStanding','warService','health','ailment','skills','addTrait',
    'addTraitOnce','removeTrait','traitProgress','setFlag','setFlag2','clearFlag',
    'clearFlag2','clearHarvestFlags','opinion','standingCharacter','rivalContact','rivalHeat',
    'endRivalry','opinionLiege','standingRealm','papalOpinion','popularOpinion',
    'profession','focusSet','restoreProfession','tierSet','tierUp','devUp',
    'research','addModifier','removeModifier','holding','loseHolding','giveItem',
    'marry','clearSuitor','adoptChild','killChild','killRole','kinslayer',
    'educateChild','moveRandom','travelReturn','travelSettle','foundFaith',
    'faithRelation','convertToProvince','declareIndependence','pickHeir','queue',
    'worldNews','log','custom','deathProvenance','populationLoss','populationLossRate','tenureEnd',
    'serfFreedom','student'
  ];
  FB.eventPreviewEffectKeys = {};
  for (let effectKeyIndex = 0; effectKeyIndex < EVENT_EFFECT_KEYS.length;
       effectKeyIndex++) {
    FB.eventPreviewEffectKeys[EVENT_EFFECT_KEYS[effectKeyIndex]] = true;
  }

  function impact(type, fields) {
    const out = { type:type };
    fields = fields || {};
    for (const key in fields) if (Object.prototype.hasOwnProperty.call(fields, key)) {
      out[key] = fields[key];
    }
    return out;
  }

  function customSystem(id) {
    if (/^(?:war_|ghw_)/.test(id)) return 'war';
    if (/^(?:rank_elevation|liege_land_grant)/.test(id)) return 'politics';
    if (/^(?:diplomacy_|vassal_|appeal_|county_petition)/.test(id)) return 'diplomacy';
    if (/^(?:plot_|fabricate_claim)/.test(id)) return 'plot';
    if (/^(?:council_|parliament_|collective_demand|realm_policy_)/.test(id)) return 'politics';
    if (/^(?:finance_|guild_|distraint_|bondage_|prison_|raid_)/.test(id)) return 'property';
    if (/^(?:agency_|sibling_|local_folk_|begin_courtship|formalize_attention|dower_|claim_)/.test(id)) {
      return 'relationship';
    }
    if (/^(?:academy_|travel_|frontier_)/.test(id)) return 'development';
    if (/^(?:papal_|bishop_|annul_)/.test(id)) return 'faith';
    if (/^(?:intrigue_)/.test(id)) return 'intrigue';
    if (/^(?:df_|attainder_|hc_|devastation_)/.test(id)) return 'property';
    if (/^(?:offer_|buy_item|clear_item|find_artifact|loot_item|artifact_|open_item_shop)/.test(id)) return 'item';
    return 'story';
  }

  function customPermanent(id) {
    return /^(?:df_fall|df_fall_flee|bondage_submit|bondage_flee|raid_plunder|raid_enslave|county_petition_grant|rank_elevation_claim|vassal_release|vassal_crush|intrigue_hearing_flee|sibling_marriage_success|sibling_proposal_refused|annul_granted|serf_transition_accept|serf_transition_decline_restore|serf_transition_pay|serf_transition_primary|serf_transition_witness_failure|serf_transition_witness_success)$/.test(id);
  }

  /* Core ids are explicit so a newly authored custom option cannot silently
     inherit the mod fallback. A coverage test compares event data with this
     registry. Adapters may be replaced by an owning system with a more exact
     pure preview/report pair before an event is shown. */
  const CORE_CUSTOM_EFFECT_IDS = (
    'academy_introduction academy_student_dip academy_student_focus academy_student_int academy_student_lea academy_student_ste academy_withdraw auction_invitation_available auction_invitation_open ' +
    'agency_family_counsel agency_family_refuse agency_family_support agency_marriage_accept agency_marriage_decline agency_overture_gift agency_overture_rebuff agency_overture_welcome agency_rebel_buyoff agency_rebel_expose ' +
    'annul_granted appeal_lose appeal_win artifact_grant artifact_offering artifact_rumor_pursue artifact_seize attainder_pay attainder_resist attainder_yield begin_courtship bishop_simony_clear bondage_flee bondage_submit buy_item claim_lost claim_sold claim_won clear_item_offer ' +
    'collective_demand_accept collective_demand_compromise collective_demand_negotiation_failed collective_demand_refuse council_charter_seal council_defy_fail council_defy_hold council_domain_custom council_domain_prepare council_domain_refuse council_feud_fail council_feud_peace council_feud_side council_flatter_cold council_flatter_kind council_gift_take council_gift_wave council_muster_concede council_muster_impose council_muster_supply council_pet_deny council_pet_grant council_scheme_fest council_scheme_mercy council_scheme_punish council_scheme_rooted council_seat_demand_no council_seat_demand_yes council_toll_refusal council_war_chest ' +
    'county_petition_grant devastation_commend devastation_lose_holding df_fall df_fall_flee diplomacy_break_alliance diplomacy_end_pact diplomacy_extend_pact diplomacy_form_alliance diplomacy_make_pact diplomacy_succession_pact distraint_seize distraint_settle distraint_yield_one dower_take dower_take_full fabricate_claim_failure fabricate_claim_success feudal_renewal_accept feudal_renewal_decline feudal_renewal_valid finance_trade_20 finance_trade_50 find_artifact formalize_attention_friend freedom_accept_offer freedom_lords_notice freedom_offer_accept_ready frontier_go_home frontier_milestone ' +
    'ghw_recruit_adventurers ghw_recruit_knights ghw_recruit_mercenaries ghw_recruit_volunteers ghw_service_danger ghw_service_safe guild_monopoly_paid guild_monopoly_persuade_failure guild_monopoly_persuade_success hc_defy intrigue_captive_ransom_pay intrigue_captive_ransom_refuse intrigue_hearing_challenge intrigue_hearing_flee intrigue_hearing_pay intrigue_hearing_penance intrigue_hearing_resist intrigue_hearing_submit intrigue_warning_countertrap intrigue_warning_ignore intrigue_warning_investigate intrigue_warning_security local_council_elected local_folk_activity_resolve local_folk_activity_valid ' +
    'loot_item lifepath_author_work merc_contract_accept merc_contract_collect merc_contract_release merc_contract_renew offer_gear offer_item open_item_shop papal_grant_absolution papal_refuse_absolution parliament_aid_hike_rebuff parliament_aid_up parliament_emergency_subsidy_won parliament_levy_relief_won parliament_motion_done parliament_redress_lost parliament_redress_won parliament_revocation_consent_pass parliament_scutage_lost parliament_scutage_pass parliament_subsidy_pay parliament_trade_redress ' +
    'plot_correspondence_failure plot_correspondence_preserve plot_correspondence_provoke plot_correspondence_steal plot_council_expose plot_council_failure plot_council_manufacture plot_council_mercy plot_discovery_abandon plot_discovery_contain plot_discovery_failure plot_discovery_success plot_end plot_guild_compensation plot_guild_defend plot_guild_expose plot_guild_failure plot_loot plot_obligation_evidence plot_obligation_failure plot_obligation_relief plot_rival_discredit plot_rival_dossier plot_rival_failure plot_rival_settlement polly_court polly_rout prison_cede_land prison_pay record_liege_grant ' +
    'raid_enslave raid_plunder rank_elevation_claim rank_elevation_offer realm_policy_persecution_noted realm_policy_refugees_refused realm_policy_refugees_welcome realm_policy_settlers_employ realm_policy_settlers_welcome serf_commuted_pay serf_flight_failure serf_neighbor_clear serf_neighbor_context_valid serf_neighbor_officer_current serf_neighbor_shifted serf_old_custom_ready serf_old_custom_replace_officer serf_old_custom_replacement_valid serf_old_custom_sync serf_transition_accept serf_transition_decline_restore serf_transition_pay serf_transition_primary serf_transition_witness_failure serf_transition_witness_success sibling_courtship_approach sibling_exposure_end sibling_marriage_success sibling_proposal_refused travel_capstone_done travel_expedition_record travel_study_career travel_trade_bold_failure travel_trade_bold_success travel_trade_cautious travel_work_career vassal_crush vassal_favor vassal_insist vassal_reclaim vassal_refuse vassal_release vassal_snub ' +
    'war_accept_tribute war_allied_withdrawal war_desert war_discipline war_discipline_deserters war_disorder war_hold war_hunt war_loss war_mass war_mercs war_negotiated_withdrawal war_pay_deserters war_press_on war_raise war_siege war_submission_tribute war_submit war_supply war_terms war_thin war_win ' +
    'agency_marriage_affordable attainder_can_pay attainder_risk barony_offer_eligible bishop_simony_accept can_afford_item council_charter_due council_domain_pressure_due council_has_members council_has_sycophant council_has_unseated council_market_charter_due council_market_concession council_market_prerogative council_muster_due council_sanctuary_confirm council_sanctuary_due council_sanctuary_relief council_sanctuary_tax council_scheme_ripe council_scheme_watched council_two_members diplomacy_alliance_active diplomacy_can_offer_alliance diplomacy_can_offer_pact diplomacy_pact_active distraint_can_settle distraint_can_yield finance_can_invest finance_in_default friendship_kindled_ready ghw_has_field_host intrigue_captive_ransom_can_pay intrigue_hearing_can_pay intrigue_hearing_can_penance intrigue_hearing_can_resist liege_land_grant lifepath_realm_at_peace merc_contract_ongoing parliament_aid_can_rise parliament_has_scutage parliament_motion_failed parliament_motion_passed parliament_redress_possible prison_can_cede prison_can_pay rank_elevation_context_valid serf_commuted_pay_ready serf_transition_adverse serf_transition_pay_ready serf_transition_restore serf_transition_witness suitor_above_station war_active_occupation war_campaign_deep war_campaign_exhausted war_can_hunt war_can_pay_deserters war_can_siege war_deserters_due war_enemy_offer_possible war_has_allied_host war_host_abroad war_host_under_pressure war_live_host war_negotiation_possible war_objective_under_debate war_submission_tribute_affordable wed_above_station wed_below_station'
  ).split(' ');
  FB.coreEventImpactCustomIds = CORE_CUSTOM_EFFECT_IDS.slice();
  FB.eventImpactAdapters = FB.eventImpactAdapters || {};

  function coreCustomPreview(id, state, ctx) {
    const p = state.player;
    if (id === 'rank_elevation_claim') {
      const status = FB.rankElevationContextStatus &&
        FB.rankElevationContextStatus(state, ctx);
      const cost = status ? status.cost : {
        gold:Math.max(0, Number(ctx && ctx.goldCost) || 0),
        prestige:Math.max(0, Number(ctx && ctx.prestigeCost) || 0),
        piety:Math.max(0, Number(ctx && ctx.pietyCost) || 0)
      };
      const out = [impact('gold', { amount:-cost.gold }),
        impact('prestige', { amount:-cost.prestige }),
        impact('rank', {
          action:'claim', tier:ctx && ctx.targetTier,
          reward:true, permanent:true
        })];
      if (cost.piety) out.splice(2, 0,
        impact('piety', { amount:-cost.piety }));
      return out;
    }
    if (id === 'rank_elevation_offer') {
      return [impact('queue', { eventId:'rank_elevation_offer' }),
        impact('rank', { action:'offer', reward:true })];
    }
    if (id === 'liege_land_grant') {
      return [impact('system', {
        system:'politics', action:'liege_land_grant', reward:true,
        permanent:true
      })];
    }
    if (id === 'serf_commuted_pay') {
      return [impact('gold', {
        amount:-Math.max(0, Number(ctx && ctx.commutationGold) || 0)
      })];
    }
    if (id === 'freedom_lords_notice') {
      return [impact('queue', { eventId:'manumission', possible:true }),
        impact('system', { system:'property', action:'freedom_offer',
          reward:true })];
    }
    if (id === 'freedom_accept_offer') {
      const offer = p.freedomOffer;
      if (!offer) return [impact('system', { system:'property' })];
      const out = [impact('gold', { amount:-offer.price })];
      if (offer.serviceDays) {
        out.push(impact('system', { system:'property',
          action:'final_service', permanent:true }));
      } else {
        out.push(impact('rank', { action:'serf_freedom', route:'manumission',
          tier:1, reward:true, permanent:true }));
      }
      return out;
    }
    if (id === 'finance_trade_20' || id === 'finance_trade_50') {
      return [impact('gold', {
        amount:id === 'finance_trade_20' ? -20 : -50
      })];
    }
    if (id === 'buy_item' && p.itemOffer) {
      const price = Math.max(0, Number(p.itemOffer.price) || 0);
      if (price) return [impact('gold', { amount:-price })];
    }
    if (id === 'attainder_pay') {
      const fines = FBDATA.balance.attainderFineByTier || [];
      return [impact('gold', { amount:-(fines[p.tier] || 20) })];
    }
    if (id === 'prison_pay') {
      const ransoms = FBDATA.balance.ransomByTier || [];
      return [impact('gold', { amount:-(ransoms[p.tier] || 30) })];
    }
    if (id === 'intrigue_captive_ransom_pay' && FB.intrigueCaptivityOf) {
      const captive = FB.intrigueCaptivityOf(state, p.charId);
      const demand = captive && captive.demand
        ? Math.max(0, Number(captive.demand.amount) || 0) : 0;
      if (demand) return [impact('gold', { amount:-demand })];
    }
    if (id === 'distraint_settle' && FB.financeDefaultDue) {
      const due = Math.max(0, Number(FB.financeDefaultDue(state)) || 0);
      if (due) return [impact('gold', { amount:-due })];
    }
    if ((id === 'parliament_subsidy_pay' ||
        id === 'parliament_emergency_subsidy_won')) {
      return [impact('gold', {
        amount:-(FBDATA.balance.parliamentSubsidyGold || 20)
      })];
    }
    if (id === 'parliament_redress_won') {
      const redress = [impact('system', {
        system:'politics', customId:id, preview:true
      })];
      const pending = state.politics && state.politics.pendingMotion;
      if (pending && pending.customaryLawAtStart !== false) {
        redress.push(impact('modifier', {
          action:'add', id:'custom_confirmed',
          pid:ctx.locationId || p.provinceId,
          reward:true
        }));
      }
      return redress;
    }
    if (id === 'intrigue_hearing_pay' && FB.intrigueSentenceProjection) {
      const hearing = state.intrigue && state.intrigue.hearing;
      if (hearing && (!ctx.hearingId || hearing.id === ctx.hearingId)) {
        const sentence = FB.intrigueSentenceProjection(state, hearing);
        if (sentence && sentence.fine) {
          return [impact('gold', { amount:-sentence.fine })];
        }
      }
    }
    if (id === 'intrigue_hearing_penance') {
      const hearing = state.intrigue && state.intrigue.hearing;
      const sentence = hearing && FB.intrigueSentenceProjection
        ? FB.intrigueSentenceProjection(state, hearing) : null;
      return [
        impact('piety', { amount:sentence && sentence.sacred ? -40 : -20 }),
        impact('prestige', { amount:-15 })
      ];
    }
    if (id === 'war_pay_deserters' && FB.warDeserterPayment) {
      return [impact('gold', { amount:-FB.warDeserterPayment(state) })];
    }
    if (id === 'war_terms' && p.war) {
      if (p.war.defending) {
        return [
          impact('gold', { amount:-(15 + 5 * (p.war.losses || 0)) }),
          impact('prestige', { amount:-10 }),
          impact('system', { system:'war', permanent:true })
        ];
      }
      return [
        impact('prestige', { amount:-8 }),
        impact('system', { system:'war', permanent:true })
      ];
    }
    if (id === 'war_submission_tribute' && p.war) {
      const enemy = state.realms && state.realms[p.war.enemy];
      const price = (FBDATA.balance.submissionTributePerRank || 25) *
        ((enemy && enemy.rank) || 1);
      return [
        impact('gold', { amount:-price }),
        impact('system', { system:'war', permanent:true })
      ];
    }
    if (id === 'war_submit') {
      return [
        impact('prestige', { amount:-15 }),
        impact('rank', { action:'submission', permanent:true })
      ];
    }
    if (id === 'distraint_yield_one') {
      const holdings = p.holdings || [];
      if (holdings.length) {
        let cheapest = holdings[0];
        let cheapestCost = Infinity;
        for (let holdingIndex = 0; holdingIndex < holdings.length; holdingIndex++) {
          const holdingId = holdings[holdingIndex];
          const def = FBDATA.holdings && FBDATA.holdings[holdingId];
          const cost = def && def.cost ? def.cost : 20;
          if (cost < cheapestCost) {
            cheapest = holdingId;
            cheapestCost = cost;
          }
        }
        return [impact('holding', { action:'remove', id:cheapest })];
      }
      if ((p.landPlots || []).length) {
        return [impact('landPlot', { amount:-1 })];
      }
    }
    if (id === 'distraint_seize') {
      return [impact('system', {
        system:'property', permanent:true, variable:true
      }), impact('queue', { possible:true })];
    }
    if (id === 'devastation_lose_holding') {
      if ((p.holdings || []).length) {
        return [impact('holding', { action:'remove', variable:true })];
      }
      return [impact('gold', { amount:-5 })];
    }
    if (id === 'raid_plunder') return [impact('system', {
      system:'property', action:'plunder', permanent:true, variable:true
    })];
    if (id === 'raid_enslave') return [
      impact('rank', { action:'serfdom', permanent:true }),
      impact('home', { action:'changed', permanent:true }),
      impact('system', {
        system:'property', action:'enslavement', permanent:true, variable:true
      })
    ];
    if (id === 'dower_take' || id === 'dower_take_full' ||
        id === 'claim_won' || id === 'claim_sold') {
      return [impact('gold', { reward:true, variable:true })];
    }
    if (id === 'artifact_rumor_pursue') {
      return [impact('queue', { eventId:'artifact_trial' })];
    }
    if (id === 'artifact_offering') {
      const artifactCost = FB.artifactOfferingCost
        ? FB.artifactOfferingCost(state, ctx && ctx.artifact) : 0;
      return [
        impact('gold', { amount:-artifactCost }),
        impact('item', {
          action:'add', defId:ctx && ctx.artifact,
          reward:true, permanent:true
        })
      ];
    }
    if (id === 'artifact_grant') {
      return [impact('item', {
        action:'add', defId:ctx && ctx.artifact,
        reward:true, permanent:true
      })];
    }
    if (id === 'artifact_seize') {
      return [impact('item', {
        action:'remove', defId:ctx && ctx.artifact,
        cost:true, permanent:true
      })];
    }
    if (id === 'open_item_shop') {
      return [impact('system', {
        system:'item', action:'shop', preview:true
      })];
    }
    if (id === 'frontier_milestone') {
      return [impact('system', {
        system:'development', action:'frontier_progress', reward:true
      })];
    }
    if (id === 'frontier_go_home') {
      return [impact('travel', { action:'return' })];
    }
    if (id === 'realm_policy_persecution_noted') {
      return [impact('system', {
        system:'politics', action:'mistreatment', cost:true, permanent:true
      })];
    }
    if (id === 'realm_policy_settlers_welcome') {
      return [impact('development', {
        amount:1, reward:true, variable:true
      })];
    }
    if (id === 'realm_policy_settlers_employ') {
      return [impact('research', { amount:8, reward:true })];
    }
    if (id === 'realm_policy_refugees_welcome' ||
        id === 'realm_policy_refugees_refused') {
      return [impact('standing', {
        amount:id === 'realm_policy_refugees_welcome' ? 3 : -2,
        targetKind:'foreign_realms', variable:true
      })];
    }
    if (id === 'find_artifact' || id === 'loot_item' || id === 'plot_loot' ||
        id === 'lifepath_author_work' || id === 'travel_expedition_record') {
      return [impact('item', { action:'add', reward:true, variable:true })];
    }
    if (id === 'merc_contract_collect') {
      return [
        impact('gold', { reward:true, variable:true }),
        impact('item', { action:'add', reward:true, variable:true })
      ];
    }
    if (id === 'polly_rout') return [impact('death', {
      targetKind:'player', lethal:true, variable:true, customId:id
    })];
    if (id === 'prison_cede_land' || id === 'attainder_yield' ||
        id === 'df_fall' || id === 'df_fall_flee' ||
        id === 'intrigue_hearing_flee') {
      return [impact('land', {
        action:'lose', variable:true, permanent:true, customId:id
      })];
    }
    return null;
  }

  function coreCustomAdapter(id) {
    return {
      preview:function (state, ctx) {
        const specific = coreCustomPreview(id, state, ctx);
        return specific || [impact('system', {
          system:customSystem(id), customId:id,
          permanent:customPermanent(id), preview:true
        })];
      },
      report:function () {
        if (id === 'war_terms' || id === 'war_submission_tribute' ||
            id === 'war_submit' || id === 'war_accept_tribute') {
          return [impact('system', {
            system:'war', action:'ended', customId:id, resolved:true
          })];
        }
        return [impact('system', {
          system:customSystem(id), customId:id,
          permanent:customPermanent(id), resolved:true
        })];
      }
    };
  }
  for (let customIndex = 0; customIndex < CORE_CUSTOM_EFFECT_IDS.length;
       customIndex++) {
    const customId = CORE_CUSTOM_EFFECT_IDS[customIndex];
    if (!FB.eventImpactAdapters[customId]) {
      FB.eventImpactAdapters[customId] = coreCustomAdapter(customId);
    }
  }

  function chanceBand(value) {
    value = FB.clamp(Number(value) || 0, 0, 1);
    if (value >= 0.8) return 'very_likely';
    if (value >= 0.6) return 'likely';
    if (value >= 0.4) return 'even';
    if (value >= 0.2) return 'risky';
    return 'long_shot';
  }
  FB.eventChanceBand = chanceBand;

  function modifierSpec(raw) {
    return typeof raw === 'string' ? { id:raw } : raw;
  }

  function previewNumeric(out, type, amount, extra) {
    if (typeof amount !== 'number' || !amount) return;
    extra = extra || {};
    extra.amount = amount;
    extra.reward = amount > 0;
    out.push(impact(type, extra));
  }

  function exactStandingEffects(raw) {
    return Array.isArray(raw) ? raw : (raw ? [raw] : []);
  }

  function previewEffects(state, source, ctx, ev) {
    const out = [];
    if (!source) return out;
    const fx = FB.scaleEventEffects
      ? FB.scaleEventEffects(state, source, ctx, ev) : source;
    const p = state.player;
    const me = state.chars[p.charId];

    if (fx.marriageEnd) {
      const doctrine = FB.marriageDoctrine(me.religion, state);
      const ending = doctrine.end || {};
      const failed = fx.marriageEnd === 'failure';
      previewNumeric(out, 'gold', -Math.max(0, Number(
        ctx.marriageGold !== undefined ? ctx.marriageGold : ending.gold) || 0));
      previewNumeric(out, 'piety', -Math.max(0, Number(
        failed && ctx.marriageFailurePiety !== undefined
          ? ctx.marriageFailurePiety
          : (ctx.marriagePiety !== undefined ? ctx.marriagePiety : ending.piety)) || 0));
      previewNumeric(out, 'prestige', -Math.max(0, Number(
        ctx.marriagePrestige !== undefined ? ctx.marriagePrestige : ending.prestige) || 0));
      out.push(impact('relationship', { action:'marriage_end', permanent:true }));
    }
    if (typeof fx.gold === 'number') previewNumeric(out, 'gold', fx.gold);
    else if (fx.gold === 'harvest_good') out.push(impact('gold', { reward:true, variable:true }));
    previewNumeric(out, 'guildStanding', fx.guildStanding);
    previewNumeric(out, 'prestige', fx.prestige);
    previewNumeric(out, 'piety', fx.piety);
    previewNumeric(out, 'health', fx.health, {
      lethal:typeof fx.health === 'number' &&
        (me.health === undefined ? 8 : me.health) + fx.health <= 0
    });
    previewNumeric(out, 'warService', fx.warService);
    previewNumeric(out, 'research', fx.research);
    previewNumeric(out, 'commonVoice', fx.popularOpinion);
    previewNumeric(out, 'standing', fx.opinionLiege, { targetKind:'liege' });
    previewNumeric(out, 'standing', fx.standingRealm, {
      targetKind:'realm', targetId:ctx.realmId || ctx.rid || null
    });
    previewNumeric(out, 'standing', fx.papalOpinion, {
      targetKind:'papal', targetId:ctx.candidateId || p.charId
    });
    if (fx.opinion) previewNumeric(out, 'standing', fx.opinion.amt, {
      targetKind:'role', role:fx.opinion.role
    });
    if (fx.standingCharacter) {
      const exactStanding = exactStandingEffects(fx.standingCharacter);
      for (let standingIndex = 0; standingIndex < exactStanding.length;
           standingIndex++) {
        const standingSpec = exactStanding[standingIndex];
        const participantId = ctx.participants &&
          ctx.participants[standingSpec.participant];
        previewNumeric(out, 'standing', standingSpec.amt, {
          targetKind:'character', targetId:participantId || null
        });
      }
    }
    if (fx.skills) for (const skill in fx.skills) {
      previewNumeric(out, 'skill', fx.skills[skill], { id:skill });
    }
    if (fx.student && ctx.studentId) {
      const student = state.chars[ctx.studentId];
      if (student && fx.student.skills) {
        for (const studentSkill in fx.student.skills) {
          previewNumeric(out, 'skill', fx.student.skills[studentSkill], {
            id:studentSkill, targetKind:'student', targetId:student.id
          });
        }
      }
      if (student && fx.student.addTrait) {
        const traitDef = FBDATA.traits[fx.student.addTrait];
        const opposite = traitDef && traitDef.opposite &&
          (student.traits || []).indexOf(traitDef.opposite) >= 0
          ? traitDef.opposite : null;
        out.push(impact('trait', {
          action:'add', id:fx.student.addTrait, reward:true,
          targetKind:'student', targetId:student.id, replaces:opposite
        }));
      }
    }
    if (fx.pricePressure) out.push(impact('price', {
      amount:fx.pricePressure, years:fx.pricePressureYears || 1,
      reward:fx.pricePressure < 0
    }));
    if (fx.marketShock && typeof fx.marketShock === 'object') {
      let shockProvince = fx.marketShock.provinceId || null;
      if (shockProvince === 'home') shockProvince = p.provinceId;
      else if (shockProvince === 'context') {
        shockProvince = ctx.locationId || ctx.provinceId || p.provinceId;
      }
      out.push(impact('market', {
        seasons:fx.marketShock.remaining || fx.marketShock.seasons || 1,
        provinceId:shockProvince,
        goodId:fx.marketShock.goodId || null,
        production:Number(fx.marketShock.production) || 0,
        demand:Number(fx.marketShock.demand) || 0,
        flow:Number(fx.marketShock.flow) || 0,
        severe:fx.marketShock.severe === true,
        reward:(Number(fx.marketShock.production) || 0) +
          (Number(fx.marketShock.flow) || 0) -
          (Number(fx.marketShock.demand) || 0) > 0
      }));
    }
    if (fx.addTrait || fx.addTraitOnce) out.push(impact('trait', {
      action:'add', id:fx.addTrait || fx.addTraitOnce,
      reward:true
    }));
    if (fx.removeTrait) out.push(impact('trait', {
      action:'remove', id:fx.removeTrait, reward:false
    }));
    if (fx.traitProgress) out.push(impact('traitProgress', {
      id:fx.traitProgress.id,
      amount:fx.traitProgress.amount === undefined ? 1 : fx.traitProgress.amount,
      reward:true
    }));
    if (fx.ailment) out.push(impact('ailment', { action:'add', id:fx.ailment }));
    if (fx.rivalContact || fx.rivalHeat || fx.endRivalry) {
      out.push(impact('relationship', { action:'rivalry' }));
    }
    if (fx.profession) out.push(impact('profession', {
      action:'set', id:fx.profession, permanent:true
    }));
    if (fx.restoreProfession) out.push(impact('profession', {
      action:'restore', permanent:true
    }));
    if (fx.focusSet) out.push(impact('focus', { id:fx.focusSet }));
    if (fx.tierSet !== undefined || fx.tierUp) out.push(impact('rank', {
      action:fx.tierSet !== undefined ? 'set' : 'up',
      tier:fx.tierSet, reward:true, permanent:true
    }));
    if (fx.serfFreedom) out.push(impact('rank', {
      action:'serf_freedom', route:fx.serfFreedom.route,
      tier:1, reward:true, permanent:true
    }));
    if (fx.devUp) out.push(impact('development', {
      amount:fx.devUp, reward:fx.devUp > 0
    }));
    if (fx.populationLoss !== undefined || fx.populationLossRate !== undefined) {
      out.push(impact('population', {
        action:'loss',
        loss:fx.populationLoss,
        rate:fx.populationLossRate,
        cause:fx.cause || 'event',
        cost:true
      }));
    }
    if (fx.addModifier) {
      const addSpec = modifierSpec(fx.addModifier);
      const modifierDef = addSpec && FBDATA.modifiers && FBDATA.modifiers[addSpec.id];
      out.push(impact('modifier', {
        action:'add', id:addSpec && addSpec.id,
        pid:addSpec && addSpec.pid || ctx.locationId || p.provinceId,
        reward:true,
        cost:!!(modifierDef && modifierDef.upkeep && modifierDef.upkeep.gold)
      }));
    }
    if (fx.removeModifier) {
      const removeSpec = modifierSpec(fx.removeModifier);
      out.push(impact('modifier', {
        action:'remove', id:removeSpec && removeSpec.id,
        pid:removeSpec && removeSpec.pid || ctx.locationId || p.provinceId
      }));
    }
    if (fx.holding) out.push(impact('holding', {
      action:'add', id:fx.holding, reward:true
    }));
    if (fx.loseHolding) out.push(impact('holding', {
      action:'remove', id:fx.loseHolding
    }));
    if (fx.giveItem) out.push(impact('item', {
      action:'add', defId:fx.giveItem, reward:true
    }));
    if (fx.marry) out.push(impact('relationship', {
      action:'marry', reward:true, permanent:true
    }));
    if (fx.clearSuitor) out.push(impact('relationship', {
      action:'courtship_end', permanent:true
    }));
    if (fx.adoptChild) out.push(impact('relationship', {
      action:'adopt', reward:true, permanent:true
    }));
    if (fx.killChild) out.push(impact('death', {
      targetKind:'child', lethal:true, permanent:true
    }));
    if (fx.killRole) out.push(impact('death', {
      targetKind:'role', role:fx.killRole, lethal:true, permanent:true
    }));
    if (fx.educateChild) out.push(impact('skill', {
      id:fx.educateChild, reward:true, variable:true, targetKind:'child'
    }));
    if (fx.moveRandom) out.push(impact('home', {
      action:'forced_move', permanent:true
    }));
    if (fx.travelReturn) out.push(impact('travel', { action:'return' }));
    if (fx.travelSettle) out.push(impact('home', {
      action:'settle', reward:true, permanent:true
    }));
    if (fx.foundFaith) out.push(impact('faith', {
      action:'found', permanent:true
    }));
    if (fx.faithRelation) out.push(impact('faith', {
      action:'relation', status:fx.faithRelation.status, permanent:true
    }));
    if (fx.convertToProvince) out.push(impact('faith', {
      action:'convert', permanent:true
    }));
    if (fx.declareIndependence) out.push(impact('rank', {
      action:'independence', permanent:true
    }));
    if (fx.pickHeir) out.push(impact('relationship', {
      action:'heir', permanent:true
    }));
    if (fx.queue) out.push(impact('queue', { eventId:fx.queue }));
    if (fx.worldNews) out.push(impact('worldNews', {}));
    if (fx.clearHarvestFlags) out.push(impact('system', { system:'harvest' }));
    if (fx.tenureEnd) out.push(impact('tenureEnd', { reason: fx.tenureEnd, permanent: true }));
    if (fx.custom) {
      const adapter = FB.eventImpactAdapters[fx.custom];
      const customImpacts = adapter && typeof adapter.preview === 'function'
        ? adapter.preview(state, ctx, ev, fx) : [impact('system', {
          system:'story', customId:fx.custom, unknown:true
        })];
      for (let customPreviewIndex = 0; customPreviewIndex < customImpacts.length;
           customPreviewIndex++) out.push(customImpacts[customPreviewIndex]);
    }
    return out;
  }

  function previewImportance(record) {
    if (record.type === 'chance') return 100;
    if (record.lethal) return 95;
    if (record.permanent) return 90;
    if (record.amount < 0 || record.action === 'remove') return 80;
    if (record.type === 'modifier') return 70;
    if (record.type === 'system' && record.internal) return 5;
    return 40;
  }

  FB.previewEventOption = function (state, ev, option, ctx) {
    ctx = ctx || {};
    option = option || {};
    let chance = null;
    if (option.chance !== undefined) {
      const probability = typeof option.chance === 'string'
        ? FB.namedChance(state, option.chance, ctx) : Number(option.chance);
      chance = { band:chanceBand(probability) };
    }
    const sections = [];
    function visible(records) {
      return records.filter(function (record) {
        return FB.eventImpactVisible(record);
      });
    }
    const guaranteed = visible(previewEffects(state, option.effects, ctx, ev));
    const success = visible(previewEffects(state,
      option.success && option.success.effects, ctx, ev));
    const failure = visible(previewEffects(state,
      option.failure && option.failure.effects, ctx, ev));
    if (guaranteed.length) {
      sections.push({ id:'guaranteed', impacts:guaranteed });
    }
    if (option.chance !== undefined || success.length) {
      sections.push({ id:'success', impacts:success.length ? success : [impact('system', {
        system:'story', narrative:true
      })] });
    }
    if (option.chance !== undefined || failure.length) {
      sections.push({ id:'failure', impacts:failure.length ? failure : [impact('system', {
        system:'story', narrative:true
      })] });
    }
    const candidates = [];
    if (chance) candidates.push(impact('chance', { band:chance.band }));
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const records = sections[sectionIndex].impacts;
      for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
        candidates.push(records[recordIndex]);
      }
    }
    candidates.sort(function (a, b) {
      return previewImportance(b) - previewImportance(a);
    });
    const compact = [];
    const seen = {};
    for (let candidateIndex = 0; candidateIndex < candidates.length && compact.length < 4;
         candidateIndex++) {
      const record = candidates[candidateIndex];
      if (record.internal) continue;
      const key = record.type + '|' + (record.id || record.system || record.band || '') +
        '|' + (record.action || '') + '|' + (record.amount || '') +
        '|' + (record.targetKind || '') + '|' + (record.targetId || record.role || '');
      if (seen[key]) continue;
      seen[key] = true;
      compact.push(record);
    }
    if (!compact.length) compact.push(impact('system', { system:'story' }));
    return { chance:chance, compact:compact, sections:sections };
  };

  function copyNumberMap(source) {
    const out = {};
    source = source || {};
    for (const key in source) if (typeof source[key] === 'number') out[key] = source[key];
    return out;
  }

  function modifierImpactSnapshot(state) {
    const out = [];
    const county = state.modifiers && state.modifiers.county || {};
    for (const pid in county) for (let i = 0; i < county[pid].length; i++) {
      out.push('county|' + pid + '|' + county[pid][i].id + '|' +
        (county[pid][i].endTurn === undefined ? '' : county[pid][i].endTurn));
    }
    const campaign = state.greatHolyWar && state.greatHolyWar.modifiers || [];
    for (let j = 0; j < campaign.length; j++) {
      out.push('campaign||' + campaign[j].id + '|' +
        (campaign[j].endTurn === undefined ? '' : campaign[j].endTurn));
    }
    out.sort();
    return out;
  }

  function impactSnapshot(state, ctx) {
    const p = state.player;
    const me = state.chars[p.charId];
    const opinions = {};
    const relevant = {};
    relevant[p.charId] = true;
    const stateRoles = state.roles || {};
    for (const role in stateRoles) if (stateRoles[role]) relevant[stateRoles[role]] = true;
    ctx = ctx || {};
    for (const contextKey in ctx) {
      const contextValue = ctx[contextKey];
      if (typeof contextValue === 'string' && state.chars[contextValue]) {
        relevant[contextValue] = true;
      }
    }
    const participants = ctx.participants || {};
    for (const participantSlot in participants) {
      if (state.chars[participants[participantSlot]]) {
        relevant[participants[participantSlot]] = true;
      }
    }
    if (p.courtingId) relevant[p.courtingId] = true;
    if (me.spouseId) relevant[me.spouseId] = true;
    for (const charId in relevant) {
      const c = state.chars[charId];
      if (c) opinions[charId] = Number(c.opinion) || 0;
    }
    let host = FB.playerHost ? FB.playerHost(state) : null;
    const deadCharacters = {};
    for (const snapshotCharId in state.chars) {
      deadCharacters[snapshotCharId] = !!state.chars[snapshotCharId].dead;
    }
    const itemDefs = {};
    const playerItems = p.items || [];
    for (let snapshotItemIndex = 0; snapshotItemIndex < playerItems.length;
         snapshotItemIndex++) {
      const snapshotItem = FB.resolveItem
        ? FB.resolveItem(state, playerItems[snapshotItemIndex]) : null;
      itemDefs[playerItems[snapshotItemIndex]] = snapshotItem
        ? snapshotItem.defId : playerItems[snapshotItemIndex];
    }
    return {
      gold:Number(p.gold) || 0,
      prestige:Number(p.prestige) || 0,
      piety:Number(p.piety) || 0,
      commonVoice:Number(p.pop) || 0,
      warService:Number(p.warService) || 0,
      health:me.health === undefined ? 8 : Number(me.health),
      tier:p.tier,
      profession:p.profession || null,
      focus:p.focus || null,
      provinceId:p.provinceId || null,
      liege:p.liege || null,
      religion:me.religion || null,
      spouseId:me.spouseId || null,
      courtingId:p.courtingId || null,
      namedHeirId:p.namedHeirId || null,
      rivalId:p.rivalry && p.rivalry.id || null,
      rivalHeat:p.rivalry ? Number(p.rivalry.heat) || 0 : null,
      skills:copyNumberMap(me.skills),
      traits:(me.traits || []).slice(),
      student:ctx.studentId && state.chars[ctx.studentId] ? {
        id:ctx.studentId,
        skills:copyNumberMap(state.chars[ctx.studentId].skills),
        traits:(state.chars[ctx.studentId].traits || []).slice()
      } : null,
      ailments:(me.ails || []).slice(),
      traitProgress:copyNumberMap(p.traitProgress),
      holdings:(p.holdings || []).slice(),
      items:(p.items || []).slice(),
      itemDefs:itemDefs,
      provinces:(p.provs || []).slice(),
      landPlots:(p.landPlots || []).length,
      characters:Object.keys(state.chars),
      deadCharacters:deadCharacters,
      opinions:opinions,
      realmStanding:copyNumberMap(p.liegeOps),
      liegeStanding:Number(p.liegeOp) || 0,
      modifiers:modifierImpactSnapshot(state),
      queue:(state.eventQueue || []).map(function (queued) { return queued.id; }),
      flags:Object.keys(p.flags || {}).sort(),
      dev:copyNumberMap(state.dev),
      pacts:JSON.stringify(state.pacts || {}),
      alliances:JSON.stringify(state.alliances || []),
      warStrength:p.war ? Number(p.war.strength) || 0 : null,
      warSiege:p.war ? Number(p.war.siege) || 0 : null,
      hostMen:host ? Number(host.men) || 0 : null,
      hostSize:host ? Number(host.size) || 0 : null,
      investments:state.economy && state.economy.investments
        ? state.economy.investments.length : 0,
      privileges:state.privileges ? state.privileges.length : 0
    };
  }

  function listDifference(after, before) {
    const counts = {};
    for (let i = 0; i < before.length; i++) counts[before[i]] = (counts[before[i]] || 0) + 1;
    const out = [];
    for (let j = 0; j < after.length; j++) {
      if (counts[after[j]]) counts[after[j]]--;
      else out.push(after[j]);
    }
    return out;
  }

  function diffNumeric(out, type, before, after, fields) {
    if (before === after || !isFinite(before) || !isFinite(after)) return;
    fields = fields || {};
    fields.before = before;
    fields.after = after;
    fields.amount = after - before;
    out.push(impact(type, fields));
  }

  function diffImpactSnapshots(state, before, after) {
    const out = [];
    const protagonistStudentId = before.student && after.student &&
      before.student.id === after.student.id &&
      before.student.id === state.player.charId ? before.student.id : null;
    diffNumeric(out, 'gold', before.gold, after.gold);
    diffNumeric(out, 'prestige', before.prestige, after.prestige);
    diffNumeric(out, 'piety', before.piety, after.piety);
    diffNumeric(out, 'commonVoice', before.commonVoice, after.commonVoice);
    diffNumeric(out, 'warService', before.warService, after.warService);
    diffNumeric(out, 'health', before.health, after.health, {
      lethal:after.health <= 0
    });
    const skillIds = {};
    for (const beforeSkill in before.skills) skillIds[beforeSkill] = true;
    for (const afterSkill in after.skills) skillIds[afterSkill] = true;
    for (const skillId in skillIds) {
      const skillFields = { id:skillId };
      if (protagonistStudentId) {
        skillFields.targetKind = 'student';
        skillFields.targetId = protagonistStudentId;
      }
      diffNumeric(out, 'skill', Number(before.skills[skillId]) || 0,
        Number(after.skills[skillId]) || 0, skillFields);
    }
    const addedTraits = listDifference(after.traits, before.traits);
    const removedTraits = listDifference(before.traits, after.traits);
    for (let traitIndex = 0; traitIndex < addedTraits.length; traitIndex++) {
      const addedFields = { action:'add', id:addedTraits[traitIndex] };
      if (protagonistStudentId) {
        addedFields.targetKind = 'student';
        addedFields.targetId = protagonistStudentId;
      }
      out.push(impact('trait', addedFields));
    }
    for (let removedTraitIndex = 0; removedTraitIndex < removedTraits.length;
         removedTraitIndex++) {
      const removedFields = {
        action:'remove', id:removedTraits[removedTraitIndex]
      };
      if (protagonistStudentId) {
        removedFields.targetKind = 'student';
        removedFields.targetId = protagonistStudentId;
      }
      out.push(impact('trait', removedFields));
    }
    if (before.student && after.student &&
        before.student.id === after.student.id &&
        !protagonistStudentId) {
      const studentSkillIds = {};
      for (const beforeStudentSkill in before.student.skills) {
        studentSkillIds[beforeStudentSkill] = true;
      }
      for (const afterStudentSkill in after.student.skills) {
        studentSkillIds[afterStudentSkill] = true;
      }
      for (const studentSkillId in studentSkillIds) {
        diffNumeric(out, 'skill',
          Number(before.student.skills[studentSkillId]) || 0,
          Number(after.student.skills[studentSkillId]) || 0, {
            id:studentSkillId, targetKind:'student',
            targetId:before.student.id
          });
      }
      const studentAddedTraits = listDifference(
        after.student.traits, before.student.traits);
      const studentRemovedTraits = listDifference(
        before.student.traits, after.student.traits);
      for (let i = 0; i < studentAddedTraits.length; i++) {
        out.push(impact('trait', {
          action:'add', id:studentAddedTraits[i],
          targetKind:'student', targetId:before.student.id
        }));
      }
      for (let i = 0; i < studentRemovedTraits.length; i++) {
        out.push(impact('trait', {
          action:'remove', id:studentRemovedTraits[i],
          targetKind:'student', targetId:before.student.id
        }));
      }
    }
    const progressTraits = {};
    for (const beforeProgressTrait in before.traitProgress) {
      progressTraits[beforeProgressTrait] = true;
    }
    for (const afterProgressTrait in after.traitProgress) {
      progressTraits[afterProgressTrait] = true;
    }
    for (const progressTrait in progressTraits) diffNumeric(out, 'traitProgress',
      Number(before.traitProgress[progressTrait]) || 0,
      Number(after.traitProgress[progressTrait]) || 0,
      { id:progressTrait });
    const addedAilments = listDifference(after.ailments, before.ailments);
    const removedAilments = listDifference(before.ailments, after.ailments);
    for (let ailmentIndex = 0; ailmentIndex < addedAilments.length; ailmentIndex++) {
      out.push(impact('ailment', { action:'add', id:addedAilments[ailmentIndex] }));
    }
    for (let removedAilmentIndex = 0; removedAilmentIndex < removedAilments.length;
         removedAilmentIndex++) {
      out.push(impact('ailment', { action:'remove', id:removedAilments[removedAilmentIndex] }));
    }
    const addedHoldings = listDifference(after.holdings, before.holdings);
    const removedHoldings = listDifference(before.holdings, after.holdings);
    for (let holdingIndex = 0; holdingIndex < addedHoldings.length; holdingIndex++) {
      out.push(impact('holding', { action:'add', id:addedHoldings[holdingIndex] }));
    }
    for (let lostHoldingIndex = 0; lostHoldingIndex < removedHoldings.length;
         lostHoldingIndex++) {
      out.push(impact('holding', { action:'remove', id:removedHoldings[lostHoldingIndex] }));
    }
    const addedItems = listDifference(after.items, before.items);
    const removedItems = listDifference(before.items, after.items);
    for (let itemIndex = 0; itemIndex < addedItems.length; itemIndex++) {
      const resolved = FB.resolveItem ? FB.resolveItem(state, addedItems[itemIndex]) : null;
      out.push(impact('item', {
        action:'add', ref:addedItems[itemIndex],
        defId:resolved ? resolved.defId : addedItems[itemIndex]
      }));
    }
    for (let lostItemIndex = 0; lostItemIndex < removedItems.length; lostItemIndex++) {
      out.push(impact('item', {
        action:'remove', ref:removedItems[lostItemIndex],
        defId:before.itemDefs[removedItems[lostItemIndex]]
      }));
    }
    const addedProvinces = listDifference(after.provinces, before.provinces);
    const removedProvinces = listDifference(before.provinces, after.provinces);
    for (let provinceIndex = 0; provinceIndex < addedProvinces.length; provinceIndex++) {
      out.push(impact('land', { action:'gain', pid:addedProvinces[provinceIndex] }));
    }
    for (let lostProvinceIndex = 0; lostProvinceIndex < removedProvinces.length;
         lostProvinceIndex++) {
      out.push(impact('land', { action:'lose', pid:removedProvinces[lostProvinceIndex] }));
    }
    diffNumeric(out, 'landPlot', before.landPlots, after.landPlots);
    if (before.tier !== after.tier) out.push(impact('rank', {
      action:'changed', before:before.tier, after:after.tier, permanent:true
    }));
    if (before.liege !== after.liege) out.push(impact('rank', {
      action:'liege_changed', before:before.liege, after:after.liege,
      permanent:true
    }));
    if (before.profession !== after.profession) out.push(impact('profession', {
      action:'changed', before:before.profession, after:after.profession
    }));
    if (before.focus !== after.focus) out.push(impact('focus', {
      before:before.focus, after:after.focus
    }));
    if (before.provinceId !== after.provinceId) out.push(impact('home', {
      action:'changed', before:before.provinceId, after:after.provinceId,
      permanent:true
    }));
    if (before.religion !== after.religion) out.push(impact('faith', {
      action:'changed', before:before.religion, after:after.religion,
      permanent:true
    }));
    if (before.spouseId !== after.spouseId) out.push(impact('relationship', {
      action:'spouse_changed', before:before.spouseId, after:after.spouseId,
      permanent:true
    }));
    if (before.courtingId !== after.courtingId) out.push(impact('relationship', {
      action:'courtship_changed', before:before.courtingId, after:after.courtingId
    }));
    if (before.namedHeirId !== after.namedHeirId) out.push(impact('relationship', {
      action:'heir', before:before.namedHeirId, after:after.namedHeirId,
      permanent:true
    }));
    if (before.rivalId !== after.rivalId) out.push(impact('relationship', {
      action:'rivalry', before:before.rivalId, after:after.rivalId
    }));
    if (before.rivalHeat !== null && after.rivalHeat !== null) {
      diffNumeric(out, 'rivalHeat', before.rivalHeat, after.rivalHeat);
    }
    const opinionIds = {};
    for (const beforeOpinionId in before.opinions) opinionIds[beforeOpinionId] = true;
    for (const afterOpinionId in after.opinions) opinionIds[afterOpinionId] = true;
    for (const opinionId in opinionIds) diffNumeric(out, 'standing',
      Number(before.opinions[opinionId]) || 0,
      Number(after.opinions[opinionId]) || 0,
      { targetKind:'character', targetId:opinionId });
    diffNumeric(out, 'standing', before.liegeStanding, after.liegeStanding,
      { targetKind:'liege' });
    const realmIds = {};
    for (const beforeRealmId in before.realmStanding) realmIds[beforeRealmId] = true;
    for (const afterRealmId in after.realmStanding) realmIds[afterRealmId] = true;
    for (const realmId in realmIds) diffNumeric(out, 'standing',
      Number(before.realmStanding[realmId]) || 0,
      Number(after.realmStanding[realmId]) || 0,
      { targetKind:'realm', targetId:realmId });
    const addedModifiers = listDifference(after.modifiers, before.modifiers);
    const removedModifiers = listDifference(before.modifiers, after.modifiers);
    function modifierFromKey(value, action) {
      const fields = value.split('|');
      return impact('modifier', {
        action:action, scope:fields[0], pid:fields[1] || null,
        id:fields[2], endTurn:fields[3] === '' ? null : Number(fields[3])
      });
    }
    for (let modifierIndex = 0; modifierIndex < addedModifiers.length; modifierIndex++) {
      out.push(modifierFromKey(addedModifiers[modifierIndex], 'add'));
    }
    for (let removedModifierIndex = 0; removedModifierIndex < removedModifiers.length;
         removedModifierIndex++) {
      out.push(modifierFromKey(removedModifiers[removedModifierIndex], 'remove'));
    }
    const queued = after.queue.slice(before.queue.length);
    for (let queueIndex = 0; queueIndex < queued.length; queueIndex++) {
      out.push(impact('queue', { eventId:queued[queueIndex] }));
    }
    const newCharacters = listDifference(after.characters, before.characters);
    for (let charIndex = 0; charIndex < newCharacters.length; charIndex++) {
      out.push(impact('relationship', {
        action:'character_added', targetId:newCharacters[charIndex]
      }));
    }
    for (const deathCharId in after.deadCharacters) {
      if (!before.deadCharacters[deathCharId] && after.deadCharacters[deathCharId]) {
        out.push(impact('death', {
          targetKind:'character', targetId:deathCharId,
          lethal:true, permanent:true, resolved:true
        }));
      }
    }
    for (const devPid in after.dev) {
      if (before.dev[devPid] !== after.dev[devPid]) diffNumeric(out, 'development',
        Number(before.dev[devPid]) || 0, Number(after.dev[devPid]) || 0,
        { pid:devPid });
    }
    if (before.pacts !== after.pacts || before.alliances !== after.alliances) {
      out.push(impact('system', { system:'diplomacy', resolved:true }));
    }
    if (before.flags.join('|') !== after.flags.join('|')) {
      out.push(impact('system', {
        system:'decision', permanent:true, resolved:true
      }));
    }
    if (before.warStrength !== after.warStrength) diffNumeric(out, 'warCondition',
      Number(before.warStrength) || 0, Number(after.warStrength) || 0);
    if (before.warSiege !== after.warSiege) diffNumeric(out, 'warSiege',
      Number(before.warSiege) || 0, Number(after.warSiege) || 0);
    if (before.hostMen !== after.hostMen && before.hostMen !== null && after.hostMen !== null) {
      diffNumeric(out, 'hostMen', before.hostMen, after.hostMen);
    }
    if (before.hostSize !== after.hostSize && before.hostSize !== null && after.hostSize !== null) {
      diffNumeric(out, 'hostSize', before.hostSize, after.hostSize);
    }
    diffNumeric(out, 'investment', before.investments, after.investments);
    diffNumeric(out, 'privilege', before.privileges, after.privileges);
    return out;
  }

  function impactIdentity(record) {
    if (typeof record.amount !== 'number') return null;
    return record.type + '|' + (record.id || '') + '|' +
      (record.targetKind || '') + '|' + (record.targetId || '') + '|' +
      (record.pid || '');
  }

  FB.mergeEventImpacts = function (ledgers) {
    const out = [];
    const positions = {};
    ledgers = ledgers || [];
    for (let ledgerIndex = 0; ledgerIndex < ledgers.length; ledgerIndex++) {
      const ledger = ledgers[ledgerIndex] || [];
      for (let recordIndex = 0; recordIndex < ledger.length; recordIndex++) {
        const record = ledger[recordIndex];
        if (record.internal) continue;
        const identity = impactIdentity(record);
        if (identity && positions[identity] !== undefined) {
          const existing = out[positions[identity]];
          existing.amount += record.amount;
          existing.after = record.after;
        } else {
          const copy = {};
          for (const key in record) copy[key] = record[key];
          if (identity) positions[identity] = out.length;
          out.push(copy);
        }
      }
    }
    return out.filter(function (record) {
      return FB.eventImpactVisible(record) &&
        (typeof record.amount !== 'number' || !!record.amount);
    });
  };

  FB.eventImpactVisible = function (record) {
    return !(record && (record.internal ||
      (record.type === 'system' && record.system === 'decision')));
  };

  function numberText(value) {
    const rounded = Math.round(Number(value) * 10) / 10;
    return (rounded > 0 ? '+' : '') + String(rounded);
  }

  function impactTargetName(state, record) {
    if (record.targetKind === 'liege') {
      const liege = state.realms && state.realms[state.player.liege];
      return liege ? liege.name : FB.T('your liege');
    }
    if (record.targetKind === 'realm') {
      const realm = state.realms && state.realms[record.targetId];
      return realm ? realm.name : FB.T('that realm');
    }
    if (record.targetKind === 'papal') return FB.T('the religious head');
    if (record.targetKind === 'role') {
      const c = FB.getRole(state, record.role, false);
      return c ? c.name : FB.T('that person');
    }
    if (record.targetId && state.chars && state.chars[record.targetId]) {
      return state.chars[record.targetId].name;
    }
    return FB.T('that person');
  }

  function dataName(state, kind, id, table) {
    const def = table && table[id];
    return def ? FB.dataText(state, state.player.charId, kind, id, def, 'name', {}) : id;
  }

  function eventSignedPercent(value) {
    const rounded = Math.round(Number(value) * 100);
    return (rounded > 0 ? '+' : '') + rounded;
  }

  /* Modifier sheets elsewhere show exact net bonuses. Before an event choice,
     only adverse terms are numeric; favorable terms are named without giving
     away their magnitude. Direction differs by field (lower construction cost
     is good, for example), so sign alone is not sufficient. */
  function eventModifierPreviewText(def) {
    const fx = def && def.fx || {};
    const benefits = [], costs = [];
    function note(value, positiveIsCost, benefit, cost) {
      if (!value) return;
      const adverse = positiveIsCost ? value > 0 : value < 0;
      if (adverse) costs.push(cost(value));
      else benefits.push(benefit);
    }
    note(fx.tax, false, FB.T('county tax'), function (value) {
      return FB.T('{amount}% county tax', { amount:eventSignedPercent(value) });
    });
    note(fx.levy, false, FB.T('county levy'), function (value) {
      return FB.T('{amount}% county levy', { amount:eventSignedPercent(value) });
    });
    note(fx.buildingCost, true, FB.T('construction costs'), function (value) {
      return FB.T('{amount}% construction cost', { amount:eventSignedPercent(value) });
    });
    note(fx.commonVoice, false, FB.T('Common Voice'), function (value) {
      return FB.T('{amount} Common Voice', {
        amount:(value > 0 ? '+' : '') + value
      });
    });
    note(fx.famine, true, FB.T('famine resilience'), function (value) {
      return FB.T('{amount}% famine harm', { amount:eventSignedPercent(value) });
    });
    note(fx.unrest, true, FB.T('unrest resilience'), function (value) {
      return FB.T('{amount}% unrest harm', { amount:eventSignedPercent(value) });
    });
    note(fx.supplyUse, true, FB.T('campaign supply use'), function (value) {
      return FB.T('{amount}% campaign supply use', { amount:eventSignedPercent(value) });
    });
    note(fx.contribution, false, FB.T('campaign contribution'), function (value) {
      return FB.T('{amount}% campaign contribution', { amount:eventSignedPercent(value) });
    });
    note(fx.withdrawalPenalty, true, FB.T('withdrawal terms'), function (value) {
      return FB.T('{amount}% withdrawal penalties', { amount:eventSignedPercent(value) });
    });
    note(fx.marchSpeed, false, FB.T('march speed'), function (value) {
      return FB.T('{amount}% march speed', { amount:eventSignedPercent(value) });
    });
    note(fx.battleOdds, false, FB.T('battle power'), function (value) {
      return FB.T('{amount}% battle power', { amount:eventSignedPercent(value) });
    });
    note(fx.desertion, true, FB.T('desertion control'), function (value) {
      return FB.T('{amount}% desertion per season', {
        amount:Math.round(value * 100)
      });
    });
    const parts = [];
    if (benefits.length) parts.push(FB.T('Benefits: {effects}', {
      effects:benefits.join(', ')
    }));
    for (let i = 0; i < costs.length; i++) parts.push(costs[i]);
    return parts.join(' · ');
  }

  FB.eventImpactText = function (state, record, mode) {
    mode = mode || 'preview';
    const resolved = mode === 'resolved';
    const amount = Number(record.amount) || 0;
    const concealedGain = !resolved && (record.reward || amount > 0);
    if (record.type === 'chance') {
      if (record.band === 'very_likely') return FB.T('Very likely');
      if (record.band === 'likely') return FB.T('Likely');
      if (record.band === 'even') return FB.T('Even');
      if (record.band === 'risky') return FB.T('Risky');
      return FB.T('Long shot');
    }
    if (record.type === 'none') return FB.T('No direct mechanical change');
    if (record.type === 'queue') {
      const queued = FB.eventById(record.eventId);
      const queuedTitle = queued
        ? FB.eventText(state, state.player.charId, queued, 'title', {})
        : record.eventId;
      return FB.T('Queues event: {event}', { event:queuedTitle });
    }
    if (record.type === 'gold') {
      if (concealedGain) return FB.T('Money may increase');
      const moneyChange = (amount > 0 ? '+' : '−') + FB.money(Math.abs(amount));
      return FB.T('Money {change}', { change:moneyChange });
    }
    if (record.type === 'prestige') {
      if (concealedGain) return FB.T('Prestige may increase');
      return FB.T('Prestige {change}', { change:numberText(amount) });
    }
    if (record.type === 'piety') {
      if (concealedGain) return FB.T('Piety may increase');
      return FB.T('Piety {change}', { change:numberText(amount) });
    }
    if (record.type === 'health') {
      if (record.lethal) return resolved
        ? FB.T('Health {change} (lethal)', { change:numberText(amount) })
        : FB.T('Lethal risk: Health {change}', { change:numberText(amount) });
      if (concealedGain) return FB.T('Health may improve');
      return FB.T('Health {change}', { change:numberText(amount) });
    }
    if (record.type === 'commonVoice') {
      if (concealedGain) return FB.T('Common Voice may improve');
      return FB.T('Common Voice {change}', { change:numberText(amount) });
    }
    if (record.type === 'warService') {
      if (concealedGain) return FB.T('War service may increase');
      return FB.T('War service {change}', { change:numberText(amount) });
    }
    if (record.type === 'research') {
      if (concealedGain) return FB.T('Research may advance');
      return FB.T('Research {change}', { change:numberText(amount) });
    }
    if (record.type === 'standing') {
      const target = impactTargetName(state, record);
      if (concealedGain) return FB.T('Standing with {target} may improve', { target:target });
      return FB.T('Standing with {target} {change}', {
        target:target, change:numberText(amount)
      });
    }
    if (record.type === 'guildStanding') {
      if (concealedGain) return FB.T('Guild Standing may improve');
      return FB.T('Guild Standing {change}', { change:numberText(amount) });
    }
    if (record.type === 'skill') {
      const skill = FB.skillName(record.id);
      if (record.targetKind === 'student') {
        const student = impactTargetName(state, record);
        if (concealedGain) return FB.T('{student}: {skill} may improve', {
          student:student, skill:skill
        });
        return FB.T('{student}: {skill} {change}', {
          student:student, skill:skill, change:numberText(amount)
        });
      }
      if (record.targetKind === 'child' && !resolved) {
        return FB.T('A child may improve {skill}', { skill:skill });
      }
      if (concealedGain) return FB.T('{skill} may improve', { skill:skill });
      return FB.T('{skill} {change}', { skill:skill, change:numberText(amount) });
    }
    if (record.type === 'trait') {
      const trait = dataName(state, 'trait', record.id, FBDATA.traits);
      if (record.targetKind === 'student') {
        const student = impactTargetName(state, record);
        if (!resolved && record.action === 'add' && record.replaces) {
          return FB.T('{student} may gain {trait}, replacing {opposite}', {
            student:student, trait:trait,
            opposite:dataName(state, 'trait', record.replaces, FBDATA.traits)
          });
        }
        if (!resolved && record.action === 'add') {
          return FB.T('{student} may gain trait: {trait}', {
            student:student, trait:trait
          });
        }
        return record.action === 'remove'
          ? FB.T('{student} loses trait: {trait}', {
            student:student, trait:trait
          })
          : FB.T('{student} gains trait: {trait}', {
            student:student, trait:trait
          });
      }
      if (!resolved && record.action === 'add' && record.reward) return FB.T('May gain a trait');
      return record.action === 'remove'
        ? FB.T('Lose trait: {trait}', { trait:trait })
        : FB.T('Gain trait: {trait}', { trait:trait });
    }
    if (record.type === 'traitProgress') {
      if (resolved) return FB.T('{trait} progress {change}', {
        trait:dataName(state, 'trait', record.id, FBDATA.traits),
        change:numberText(amount)
      });
      return FB.T('Progress toward a trait');
    }
    if (record.type === 'ailment') {
      const ailment = dataName(state, 'ailment', record.id, FBDATA.ailments);
      return record.action === 'remove'
        ? FB.T('Recover from {ailment}', { ailment:ailment })
        : FB.T('Suffer {ailment}', { ailment:ailment });
    }
    if (record.type === 'holding') {
      if (!resolved && record.variable && record.action === 'remove') {
        return FB.T('Lose a household holding');
      }
      const holding = dataName(state, 'holding', record.id, FBDATA.holdings);
      if (!resolved && record.action === 'add') return FB.T('May gain household property');
      return record.action === 'remove'
        ? FB.T('Lose holding: {holding}', { holding:holding })
        : FB.T('Gain holding: {holding}', { holding:holding });
    }
    if (record.type === 'item') {
      const item = dataName(state, 'item', record.defId || record.ref, FBDATA.items);
      if (!resolved && record.action === 'add') return FB.T('May gain an item');
      return record.action === 'remove'
        ? FB.T('Lose item: {item}', { item:item })
        : FB.T('Gain item: {item}', { item:item });
    }
    if (record.type === 'modifier') {
      const def = FBDATA.modifiers && FBDATA.modifiers[record.id];
      const name = def ? FB.dataText(state, state.player.charId,
        'modifier', record.id, def, 'name', {}) : record.id;
      const modifierProvince = record.pid && FB.world && FB.world.byId[record.pid];
      if (record.action === 'remove') {
        if (def && def.scope === 'county' && record.pid) {
          return FB.T('End modifier: {modifier} in {province}', {
            modifier:name,
            province:modifierProvince ? modifierProvince.name : record.pid
          });
        }
        return FB.T('End modifier: {modifier}', { modifier:name });
      }
      const duration = def && def.days !== undefined
        ? FB.T('{days} days', { days:def.days }) : FB.T('No fixed end');
      const upkeep = def && def.upkeep && def.upkeep.gold
        ? FB.T('{money:amount} each season', { amount:def.upkeep.gold })
        : FB.T('No seasonal upkeep');
      const effectText = !resolved ? eventModifierPreviewText(def) :
        (FB.ui && FB.ui._shared && FB.ui._shared.modifierEffectText
          ? FB.ui._shared.modifierEffectText(state, record.id) : '');
      const transfer = def && def.scope === 'county'
        ? FB.T('stays with the county after transfer') : '';
      const modifierParams = {
        modifier:name, duration:duration, upkeep:upkeep,
        effects:effectText ? ' · ' + effectText : '',
        transfer:transfer ? '; ' + transfer : '',
        province:modifierProvince ? modifierProvince.name : record.pid
      };
      return def && def.scope === 'county' && record.pid
        ? FB.T('{modifier} in {province} — {duration}; {upkeep}{effects}{transfer}',
          modifierParams)
        : FB.T('{modifier} — {duration}; {upkeep}{effects}{transfer}', modifierParams);
    }
    if (record.type === 'rank') {
      if (record.action === 'independence') return FB.T('Permanent: become independent');
      if (record.action === 'submission') return FB.T('Permanent: submit to a new liege');
      if (resolved && record.action === 'liege_changed') {
        const liege = record.after && state.realms && state.realms[record.after];
        return record.after
          ? FB.T('Liege becomes {realm}', {
            realm:liege ? liege.name : record.after
          })
          : FB.T('Become independent');
      }
      if (resolved && record.after !== undefined) return FB.T('Rank becomes {rank}', {
        rank:FB.titleWordFor(state, record.after)
      });
      return FB.T('Permanent rank change');
    }
    if (record.type === 'profession') {
      const professionId = resolved ? record.after : record.id;
      const professionDef = professionId && FBDATA.careers &&
        FBDATA.careers[professionId];
      const profession = professionDef
        ? FB.dataText(state, state.player.charId, 'career', professionId,
          professionDef, 'name', {})
        : professionId;
      if (profession) return FB.T('Profession becomes {profession}', {
        profession:profession
      });
      return FB.T('Permanent profession change');
    }
    if (record.type === 'focus') {
      const focusId = resolved ? record.after : record.id;
      let focus = null;
      for (let focusIndex = 0; focusIndex < (FB.focuses || []).length; focusIndex++) {
        if (FB.focuses[focusIndex].id === focusId) {
          const focusDef = FB.focuses[focusIndex];
          focus = FB.focusLabel ? FB.focusLabel(state, focusDef) :
            FB.dataText(state, state.player.charId, 'focus', focusId,
              focusDef, 'label', {});
          break;
        }
      }
      return focus ? FB.T('Daily focus becomes {focus}', { focus:focus })
        : FB.T('Daily focus changes');
    }
    if (record.type === 'development') {
      if (concealedGain) return FB.T('County development may rise');
      return FB.T('County development {change}', { change:numberText(amount) });
    }
    if (record.type === 'population') {
      if (record.rate !== undefined) {
        return FB.T('Population loss ({rate}%)', {
          rate: Math.round(Math.abs(Number(record.rate) || 0) * 100)
        });
      }
      return FB.T('Population loss (−{amount})', {
        amount: Math.abs(Number(record.loss) || 0)
      });
    }
    if (record.type === 'landPlot') {
      return FB.T('Land plots {change}', { change:numberText(amount) });
    }
    if (record.type === 'land') {
      if (!resolved && record.variable) return FB.T('Permanent: lose land');
      const province = FB.world.byId[record.pid];
      return record.action === 'lose'
        ? FB.T('Lose county: {province}', { province:province ? province.name : record.pid })
        : FB.T('Gain county: {province}', { province:province ? province.name : record.pid });
    }
    if (record.type === 'home') return record.action === 'settle'
      ? FB.T('Permanent: settle the household here')
      : FB.T('Permanent household move');
    if (record.type === 'relationship') {
      if (record.action === 'marry' || record.action === 'spouse_changed') {
        return FB.T('Permanent: marriage');
      }
      if (record.action === 'adopt' || record.action === 'character_added') {
        return FB.T('A child joins the family');
      }
      if (record.action === 'heir') return FB.T('Permanent: choose an heir');
      if (record.action === 'marriage_end') return FB.T('Permanent: marriage ends');
      if (record.action === 'courtship_end' || record.action === 'courtship_changed') {
        return FB.T('Courtship changes');
      }
      if (record.action === 'rivalry') return FB.T('Rivalry changes');
      return FB.T('Relationship changes');
    }
    if (record.type === 'death') {
      if (!resolved && record.targetKind === 'child') return FB.T('Lethal risk to a child');
      if (!resolved && record.targetKind === 'player') return FB.T('Lethal risk to you');
      const target = impactTargetName(state, record);
      if (resolved) return FB.T('{target} died', { target:target });
      return FB.T('Lethal risk to {target}', { target:target });
    }
    if (record.type === 'queue') return record.possible
      ? FB.T('A further consequence may follow')
      : FB.T('A further consequence will follow');
    if (record.type === 'travel') return FB.T('The journey home begins');
    if (record.type === 'faith') {
      if (record.action === 'found') return FB.T('Permanent: found a new faith');
      if (record.action === 'convert' || record.action === 'changed') {
        return FB.T('Permanent faith change');
      }
      return FB.T('Faith relations change');
    }
    if (record.type === 'price') {
      if (!resolved && record.reward) return FB.T('Prices may ease');
      return FB.T('Price pressure {change} for {years} years', {
        change:numberText(amount), years:record.years
      });
    }
    if (record.type === 'market') {
      const marketGood = record.goodId && FBDATA.marketGoods &&
        FBDATA.marketGoods[record.goodId];
      const goodName = marketGood ? FB.dataText(state, state.player.charId,
        'marketGood', record.goodId, marketGood, 'name', {}) : FB.T('All market baskets');
      const marketProvince = record.provinceId && FB.world.byId[record.provinceId];
      const countyName = marketProvince ? marketProvince.name : FB.T('all counties');
      return record.reward
        ? FB.T('{good} supply in {county} improves for {seasons} seasons', {
          good:goodName, county:countyName, seasons:record.seasons
        })
        : FB.T('{good} market disruption in {county} for {seasons} seasons', {
          good:goodName, county:countyName, seasons:record.seasons
        });
    }
    if (record.type === 'rivalHeat') return FB.T('Rivalry heat {change}', {
      change:numberText(amount)
    });
    if (record.type === 'warCondition') return FB.T('Campaign condition {change}', {
      change:numberText(amount)
    });
    if (record.type === 'warSiege') return FB.T('Siege progress {change}', {
      change:numberText(amount)
    });
    if (record.type === 'hostMen') return FB.T('Live host {change} troops', {
      change:numberText(amount)
    });
    if (record.type === 'hostSize') return FB.T('Reinforcement ceiling {change}', {
      change:numberText(amount)
    });
    if (record.type === 'investment') return FB.T('Trade commitments {change}', {
      change:numberText(amount)
    });
    if (record.type === 'privilege') return FB.T('Privileges {change}', {
      change:numberText(amount)
    });
    if (record.type === 'worldNews') return FB.T('World news follows');
    if (record.type === 'system') {
      if (record.system === 'war') return record.action === 'ended'
        ? FB.T('The current war ends')
        : FB.T('Campaign or host conditions change');
      if (record.system === 'diplomacy') return FB.T('A diplomatic relationship changes');
      if (record.system === 'plot') return FB.T('The active plot changes');
      if (record.system === 'politics') return FB.T('Political terms change');
      if (record.system === 'property' && record.action === 'plunder') {
        return FB.T('Lose money, an item, or household property');
      }
      if (record.system === 'property' && record.action === 'enslavement') {
        return FB.T('Permanent: property lost and station falls to {rank}', {
          rank:FB.titleWordFor(state, 0)
        });
      }
      if (record.system === 'property') return record.permanent
        ? FB.T('Permanent land, property, or station change')
        : FB.T('Property or contract terms change');
      if (record.system === 'relationship') return record.permanent
        ? FB.T('Permanent family or relationship change')
        : FB.T('A relationship changes');
      if (record.system === 'development') return FB.T('Training or travel progress changes');
      if (record.system === 'faith') return FB.T('Religious standing or office changes');
      if (record.system === 'intrigue') return FB.T('The scheme or sentence changes');
      if (record.system === 'item') return FB.T('An item or market offer changes');
      if (record.system === 'harvest') return FB.T('Harvest preparations end');
      if (record.system === 'decision') return record.permanent
        ? FB.T('Permanent story decision') : FB.T('Story state changes');
      return record.unknown
        ? FB.T('Story-specific consequence')
        : FB.T('The story advances');
    }
    return FB.T('Story-specific consequence');
  };

  /* ---------- effects ---------- */
  function realmWarEnemy(state, rid) {
    if (!rid || !state.realms) return null;
    const top = FB.topRealm ? FB.topRealm(state, rid) : rid;
    const realm = state.realms[top];
    if (realm && realm.war) return realm.war.enemy;
    for (const id in state.realms) {
      const other = state.realms[id];
      if (other && other.alive && other.war &&
        (!FB.topRealm || FB.topRealm(state, other.war.enemy) === top)) return id;
    }
    return null;
  }

  function deathProvenance(state, spec, ctx, ev) {
    spec = spec || {};
    ctx = ctx || {};
    const p = state.player;
    const loc = FB.travelLocation ? FB.travelLocation(state) : null;
    let provinceId = spec.provinceId || null;
    if (spec.province === 'context') {
      provinceId = ctx.pid || ctx.provinceId || ctx.locationId || null;
    }
    if (!provinceId) provinceId = loc ? loc.id : p.provinceId;
    let enemyId = spec.enemyId || null;
    if (spec.enemy === 'war') enemyId = p.war && p.war.enemy;
    else if (spec.enemy === 'liegeWar') enemyId = realmWarEnemy(state, p.liege);
    else if (spec.enemy === 'realmWar') {
      enemyId = realmWarEnemy(state, state.owner[provinceId] || state.owner[p.provinceId]);
    }
    if (!enemyId) enemyId = ctx.enemyId || ctx.enemyRealmId || null;
    return {
      kind:spec.kind || 'event',
      eventId:spec.eventId || (ev && ev.id) || null,
      provinceId:provinceId || null,
      enemyId:enemyId || null
    };
  }

  FB.applyEffects = function (state, fx, ctx, ev) {
    if (!fx) return [];
    ctx = ctx || {};
    const sourceFx = fx;
    if (FB.scaleEventEffects) fx = FB.scaleEventEffects(state, fx, ctx, ev);
    let freedomStatus = null;
    if (fx && Object.prototype.hasOwnProperty.call(fx, 'serfFreedom')) {
      if (serfFreedomEffectError(fx)) return [];
      freedomStatus = FB.serfFreedomStatus(state, fx.serfFreedom, {
        event:ev, effectContext:ctx
      });
      if (!freedomStatus.ready) return [];
    }
    const beforeImpact = impactSnapshot(state, ctx);
    const customAdapter = fx.custom && FB.eventImpactAdapters[fx.custom];
    const customBefore = customAdapter && typeof customAdapter.capture === 'function'
      ? customAdapter.capture(state, ctx, ev, fx) : null;
    let appliedResearch = 0;
    let appliedGuildStanding = 0;
    let appliedPricePressure = false;
    let appliedMarketShock = false;
    const p = state.player;
    const me = state.chars[p.charId];
    /* Freeze semantic context before a custom outcome can end a war, move
       the household, or otherwise erase the identifiers behind the blow.
       It is committed below only when this resolution actually kills. */
    const lethalProvenance = fx.deathProvenance
      ? deathProvenance(state, fx.deathProvenance, ctx, ev) : null;
    if (freedomStatus && !FB.resolveSerfFreedom(state, fx.serfFreedom, {
      event:ev, effectContext:ctx
    })) return [];
    if (fx.tenureEnd && FB.closeSerfTenure) {
      FB.closeSerfTenure(state, fx.tenureEnd);
    }
    if (fx.marriageEnd) {
      const doctrine = FB.marriageDoctrine(me.religion, state);
      const ending = doctrine.end || {};
      const failed = fx.marriageEnd === 'failure';
      const marriageGold = ctx.marriageGold !== undefined
        ? ctx.marriageGold : ending.gold;
      const marriagePiety = failed && ctx.marriageFailurePiety !== undefined
        ? ctx.marriageFailurePiety
        : (ctx.marriagePiety !== undefined ? ctx.marriagePiety : ending.piety);
      const marriagePrestige = ctx.marriagePrestige !== undefined
        ? ctx.marriagePrestige : ending.prestige;
      p.gold -= Math.max(0, Number(marriageGold) || 0);
      p.piety = Math.max(0, p.piety - Math.max(0, Number(marriagePiety) || 0));
      p.prestige = Math.max(0,
        p.prestige - Math.max(0, Number(marriagePrestige) || 0));
    }

    if (fx.gold !== undefined) {
      let g = fx.gold;
      if (g === 'harvest_good') {
        g = FB.ri(4, 8) + Math.floor(FB.skillOf(me, 'ste') / 3);
        if (p.flags.crop_risky) g += 6;
        if (p.flags.own_ox) g += 2;
        if (FB.landPlots) {
          const plots = FB.landPlots(state).length;
          if (plots) g = Math.round(g * (1 + Math.min(5, plots) * 0.12));
        } else if (p.flags.has_farm) {
          g = Math.round(g * 1.6);
        }
      }
      if (fx.clearHarvestFlags && p.tier === 0 && FB.serfHarvestQuote) {
        g = FB.serfHarvestQuote(state, g).gold;
      }
      p.gold += g;
    }
    if (fx.pricePressure && FB.addPricePressure) {
      appliedPricePressure = FB.addPricePressure(state, fx.pricePressure,
        fx.pricePressureYears || 1,
        fx.pricePressureSource || 'event');
    }
    if (fx.marketShock && typeof fx.marketShock === 'object' &&
        FB.addMarketShock) {
      const marketShock = {};
      for (const key in fx.marketShock) {
        if (Object.prototype.hasOwnProperty.call(fx.marketShock, key)) {
          marketShock[key] = fx.marketShock[key];
        }
      }
      if (marketShock.provinceId === 'context') {
        marketShock.provinceId = ctx.locationId || ctx.provinceId || p.provinceId;
      } else if (marketShock.provinceId === 'home') {
        marketShock.provinceId = p.provinceId;
      }
      appliedMarketShock = FB.addMarketShock(state, marketShock);
    }
    if (fx.prestige) p.prestige = Math.max(0, p.prestige + fx.prestige);
    if (fx.piety) p.piety = Math.max(0, p.piety + fx.piety);
    if (fx.guildStanding && FB.careerOf) {
      const career = FB.careerOf(state, me);
      const standingChange = Number(fx.guildStanding);
      if (career && career.guildRank && career.guildRank !== 'none' &&
          isFinite(standingChange)) {
        const before = Math.max(0, Number(career.guildStanding) || 0);
        const configuredMax = Number(FBDATA.balance.guildStandingMax);
        const maximum = isFinite(configuredMax) ? Math.max(0, configuredMax) : 100;
        career.guildStanding = FB.clamp(before + standingChange, 0,
          maximum);
        appliedGuildStanding = career.guildStanding - before;
      }
    }
    if (fx.warService) {
      p.warService = Math.max(0, (p.warService || 0) + fx.warService);
      if (fx.warService > 0 && FB.noteTraitProgress) {
        FB.noteTraitProgress(state, 'muster_bred', fx.warService);
      }
    }
    if (fx.health) me.health = FB.clamp((me.health === undefined ? 8 : me.health) + fx.health, 0, 10);
    // a hard blow leaves a named wound; an explicit ailment names it precisely
    // (an illness effect speaks for itself — no gash for a fever)
    if (fx.ailment) FB.addAilment(me, fx.ailment);
    else if (fx.health <= -2 && fx.setFlag !== 'ill' && fx.setFlag2 !== 'ill') {
      const w = FB.randomWound(-fx.health >= 4 ? 2 : 1);
      if (w) FB.addAilment(me, w);
    }
    if (fx.skills) {
      for (const k in fx.skills) {
        if (fx.skills[k] > 0) FB.gainSkill(me, k, fx.skills[k]);
        else me.skills[k] = Math.max(0, (me.skills[k] || 0) + fx.skills[k]);
      }
    }
    if (fx.student && ctx.studentId) {
      const student = state.chars[ctx.studentId];
      if (student && !student.dead) {
        student.skills = student.skills || {};
        if (fx.student.skills) for (const k in fx.student.skills) {
          if (fx.student.skills[k] > 0) {
            FB.gainSkill(student, k, fx.student.skills[k]);
          } else {
            student.skills[k] = Math.max(0,
              (student.skills[k] || 0) + fx.student.skills[k]);
          }
        }
        if (fx.student.addTrait) FB.addTrait(student, fx.student.addTrait);
      }
    }
    if (fx.addTrait) FB.addTrait(me, fx.addTrait);
    if (fx.addTraitOnce) FB.addTrait(me, fx.addTraitOnce);
    if (fx.removeTrait && FB.removeTrait(me, fx.removeTrait)) {
      const removed = FBDATA.traits[fx.removeTrait];
      if (removed && removed.earn && FB.ensureTraitProgress) {
        FB.ensureTraitProgress(state)[fx.removeTrait] = 0;
      }
    }
    if (fx.traitProgress && FB.noteTraitProgress) {
      FB.noteTraitProgress(state, fx.traitProgress.id,
        fx.traitProgress.amount === undefined ? 1 : fx.traitProgress.amount);
    }
    if (fx.setFlag) p.flags[fx.setFlag] = 1;
    if (fx.setFlag2) p.flags[fx.setFlag2] = 1;
    if (fx.clearFlag) delete p.flags[fx.clearFlag];
    if (fx.clearFlag2) delete p.flags[fx.clearFlag2];
    if ((fx.setFlag === 'guild_member' || fx.setFlag2 === 'guild_member') && FB.careerOf) {
      const guildCareer = FB.careerOf(state, me);
      guildCareer.guildRank = guildCareer.guildRank === 'none' ? 'member' : guildCareer.guildRank;
      guildCareer.guildStanding = Math.max(20, guildCareer.guildStanding || 0);
    }
    // falling ill names the sickness; recovering casts it off
    if (fx.setFlag === 'ill' || fx.setFlag2 === 'ill') {
      const sick = FB.randomSickness();
      if (sick) FB.addAilment(me, sick);
    }
    if (fx.clearFlag === 'ill' || fx.clearFlag2 === 'ill') FB.cureAilments(me, 'sickness');
    if (fx.clearHarvestFlags) {
      delete p.flags.crop_safe; delete p.flags.crop_risky; delete p.flags.crop_ruined;
      delete p.flags.blessed_crops; // the blessing is spent with the harvest
    }
    if (fx.opinion) {
      const c = FB.getRole(state, fx.opinion.role, fx.opinion.role !== 'rival');
      /* A likeable name speeds every warming. Hearth effects join that same
         multiplier only for a spouse or blood relative, then round once. */
      let amt = fx.opinion.amt;
      if (amt > 0) {
        let multiplier = 1 + FB.traitAgg(me).opinion / 200;
        const spouse = c && FB.spousesOf(state, me).some(function (other) {
          return other.id === c.id;
        });
        const blood = c && !!FB.kinOf(state).byId[c.id];
        if ((spouse || blood) && FB.traitBonus) {
          multiplier += FB.traitBonus(me, 'household', 'regard');
        }
        amt = Math.max(1, Math.round(amt * multiplier));
      }
      if (c) adjustCharacterStanding(state, c, amt,
        'event:opinion_compatibility_effect');
    }
    if (fx.standingCharacter) {
      const exactStanding = exactStandingEffects(fx.standingCharacter);
      for (let standingIndex = 0; standingIndex < exactStanding.length;
           standingIndex++) {
        const standingSpec = exactStanding[standingIndex];
        const c = FB.eventParticipant(state, ctx, standingSpec.participant);
        let amt = Number(standingSpec.amt) || 0;
        if (c && amt > 0) {
          let multiplier = 1 + FB.traitAgg(me).opinion / 200;
          const spouse = FB.spousesOf(state, me).some(function (other) {
            return other.id === c.id;
          });
          const blood = !!FB.kinOf(state).byId[c.id];
          if ((spouse || blood) && FB.traitBonus) {
            multiplier += FB.traitBonus(me, 'household', 'regard');
          }
          amt = Math.max(1, Math.round(amt * multiplier));
        }
        if (c && amt) adjustCharacterStanding(state, c, amt,
          'event:standingCharacter_effect');
      }
    }
    if (fx.rivalContact) {
      const rc = fx.rivalContact;
      const c = rc.participant
        ? FB.eventParticipant(state, ctx, rc.participant)
        : FB.getRole(state, rc.role, false);
      if (c) FB.noteRivalContact(state, c, rc.score || 1, rc.cause || 'conflict');
    }
    if (fx.rivalHeat) FB.changeRivalHeat(state, fx.rivalHeat);
    if (fx.endRivalry) FB.endRivalry(state);
    if (fx.opinionLiege) {
      adjustRealmStanding(state, p.liege, fx.opinionLiege,
        'event:opinionLiege_compatibility_effect');
    }
    if (fx.standingRealm) {
      const realmId = ctx && (ctx.realmId || ctx.rid);
      const realm = realmId && state.realms && state.realms[realmId];
      if (realm && realm.alive && realmId !== 'player') {
        adjustRealmStanding(state, realmId, fx.standingRealm,
          'event:standingRealm_effect');
      }
    }
    if (fx.papalOpinion && FB.adjustPapalOpinionOfCandidate) {
      const papalTarget = ctx && ctx.candidateId &&
        state.chars[ctx.candidateId] || me;
      FB.adjustPapalOpinionOfCandidate(state, papalTarget, fx.papalOpinion);
    }
    if (fx.popularOpinion) {
      var amount = fx.popularOpinion;
      if (amount > 0 && FB.traitBonus) {
        amount = amount * (1 + FB.traitBonus(me, 'assembly', 'popularOpinion'));
      }
      p.pop = FB.clamp(p.pop + amount, -100, 100);
    }
    if (fx.profession) {
      if (!p.professionBack && p.profession !== 'soldier') p.professionBack = p.profession;
      p.profession = fx.profession;
      if (fx.setFlag !== 'on_campaign' && fx.setFlag2 !== 'on_campaign' && FB.setCareer) {
        p.professionBack = null;
        FB.setCareer(state, me, fx.profession, 'journeyman');
      }
    }
    if (fx.focusSet) p.focus = fx.focusSet;
    if (fx.restoreProfession) {
      p.profession = p.professionBack || 'farmer';
      p.professionBack = null;
      if (FB.syncPlayerCareer) FB.syncPlayerCareer(state);
    }
    if (fx.tierSet !== undefined && fx.tierSet > p.tier) {
      FB.setPlayerTier(state, fx.tierSet);
    }
    if (fx.tierUp) {
      FB.grantByLiege(state);
    }
    if (fx.devUp) {
      const pid = (p.provs && p.provs[0]) || p.provinceId;
      FB.changeCountyDevelopment(state, pid, fx.devUp, 'event');
    }
    if (fx.populationLoss !== undefined || fx.populationLossRate !== undefined) {
      const targetPid = fx.provinceId || ctx.locationId || ctx.provinceId || p.provinceId;
      if (targetPid && FB.changeCountyPopulation) {
        let crisisProt = 0;
        let famineProt = 0;
        if (FB.countyBuildingCrisisProtection) crisisProt += FB.countyBuildingCrisisProtection(state, targetPid);
        if (FB.countyBuildingFamineProtection) famineProt += FB.countyBuildingFamineProtection(state, targetPid);
        const owner = (state.owner && state.owner[targetPid]) || null;
        let techCrisisProt = FB.techBonus ? FB.techBonus(state, 'populationCrisisProtection', owner) : 0;
        techCrisisProt = FB.clamp(techCrisisProt, 0, 0.10);
        crisisProt += techCrisisProt;

        let protection = 0;
        if (fx.cause === 'famine') {
          protection = Math.min(0.60, crisisProt + famineProt);
        } else {
          protection = Math.min(0.30, crisisProt);
        }

        if (fx.populationLossRate !== undefined) {
          const baseLossRate = Number(fx.populationLossRate);
          const effectiveRate = -Math.abs(baseLossRate) * (1 - protection);
          FB.changeCountyPopulationRate(state, targetPid, effectiveRate, fx.cause || 'event');
        } else if (fx.populationLoss !== undefined) {
          const baseLoss = Number(fx.populationLoss);
          const effectiveLoss = -Math.round(Math.abs(baseLoss) * (1 - protection));
          FB.changeCountyPopulation(state, targetPid, effectiveLoss, fx.cause || 'event');
        }
      }
    }
    if (fx.research) appliedResearch = FB.addResearch(state, fx.research) || 0;
    if (fx.addModifier && FB.addModifier) {
      const spec = typeof fx.addModifier === 'string'
        ? { id:fx.addModifier } : fx.addModifier;
      if (spec && typeof spec.id === 'string') {
        const def = FBDATA.modifiers && FBDATA.modifiers[spec.id];
        const pid = spec.pid || ctx.locationId || p.provinceId;
        FB.addModifier(state, spec.id,
          def && def.scope === 'county' ? pid : null, {
            sourceEventId:ev && ev.id
          });
      }
    }
    if (fx.removeModifier && FB.removeModifier) {
      const spec = typeof fx.removeModifier === 'string'
        ? { id:fx.removeModifier } : fx.removeModifier;
      if (spec && typeof spec.id === 'string') {
        const def = FBDATA.modifiers && FBDATA.modifiers[spec.id];
        const pid = spec.pid || ctx.locationId || p.provinceId;
        FB.removeModifier(state, spec.id,
          def && def.scope === 'county' ? pid : null, { notice:true });
      }
    }
    if (fx.holding) {
      const hl = FB.holdingList(state);
      if (hl.indexOf(fx.holding) < 0) hl.push(fx.holding);
    }
    if (fx.loseHolding) {
      const hl = FB.holdingList(state);
      const hi = hl.indexOf(fx.loseHolding);
      if (hi >= 0) hl.splice(hi, 1);
    }
    if (fx.giveItem && FBDATA.items[fx.giveItem]) {
      /* One specific definition: a repeatable template creates a fresh
         instance, while an authored unique remains a single heirloom. */
      if (FB.issueItem) FB.issueItem(state, fx.giveItem);
    }
    if (fx.marry) {
      FB.doMarry(state, { settleDowry:fx.marry !== 'informal' });
    }
    if (fx.clearSuitor) FB.clearCourtship(state);
    if (fx.adoptChild) {
      const baby = FB.makeCharacter(state, {
        culture: me.culture, religion: me.religion, born: state.date.year,
        traitsN: 0, fatherId: null, motherId: null, dyn: me.dyn
      });
      me.childrenIds.push(baby.id);
      FB.touchFamily();
    }
    if (fx.killChild) {
      let victim = ctx.childId ? state.chars[ctx.childId] : null;
      if (!victim) {
        const young = me.childrenIds.map(function (id) { return state.chars[id]; })
          .filter(function (c) { return c && !c.dead && FB.ageOf(c, state.date.year) < 13; });
        victim = young.length ? FB.pick(young) : null;
      }
      if (victim) {
        FB.killChar(state, victim);
        FB.news(state, FB.msg('news.event.child_killed',
          '🕯 {name} has died, aged {age}.',
          { name: victim.name, age: FB.ageOf(victim, state.date.year) }));
      }
    }
    if (fx.killRole) {
      const c = FB.getRole(state, fx.killRole, false);
      if (c) {
        const spouse = fx.kinslayer && FB.spousesOf(state, me).some(function (other) {
          return other.id === c.id;
        });
        const blood = fx.kinslayer && !!FB.kinOf(state).byId[c.id];
        FB.killChar(state, c);
        if ((spouse || blood) && FB.addTrait) FB.addTrait(me, 'kinslayer');
        if (fx.killRole === 'spouse') { FB.spouseDied(state, c); FB.promoteSpouse(state); }
      }
    }
    if (fx.educateChild && ctx.childId) {
      const c = state.chars[ctx.childId];
      if (c) {
        FB.gainSkill(c, fx.educateChild, 3);
        FB.gainSkill(c, FB.pick(FB.SKILLS), 1);
      }
    }
    if (fx.moveRandom) FB.movePlayerRandom(state);
    if (fx.travelReturn && FB.travelReturn) FB.travelReturn(state);
    if (fx.travelSettle && FB.travelSettle) FB.travelSettle(state);
    if (fx.foundFaith && FB.foundFaith) {
      const founding = fx.foundFaith;
      let definition = founding.definition;
      if (!definition) {
        definition = {};
        for (const faithKey in founding) {
          if (faithKey !== 'convertFounder' && faithKey !== 'convertHousehold' &&
              faithKey !== 'convertRealm') definition[faithKey] = founding[faithKey];
        }
      }
      const faithId = FB.foundFaith(state, definition, {
        convertFounder:founding.convertFounder !== false,
        convertHousehold:!!founding.convertHousehold,
        convertRealm:!!founding.convertRealm
      });
      if (faithId) ctx.faithId = faithId;
    }
    if (fx.faithRelation && FB.setFaithRelation) {
      const relation = fx.faithRelation;
      const faithRef = function (value) {
        if (value === '$founded') return ctx.faithId;
        if (value === '$current' || value === undefined) return me.religion;
        return value;
      };
      const observerId = faithRef(relation.observer);
      const targetId = faithRef(relation.target);
      if (FB.setFaithRelation(state, observerId, targetId, relation.status) &&
          relation.reciprocal) {
        FB.setFaithRelation(state, targetId, observerId,
          typeof relation.reciprocal === 'string'
            ? relation.reciprocal : relation.status);
      }
    }
    if (fx.convertToProvince) {
      const pr = FB.world.byId[p.provinceId];
      if (pr) {
        me.religion = pr.religion;
        if (state.realms.player && state.realms.player.alive) {
          state.realms.player.religion = pr.religion;
        }
      }
    }
    if (fx.declareIndependence) FB.doIndependence(state);
    if (fx.pickHeir) {
      if (FB.ui && FB.ui.autoResolving) {
        /* automation settles the succession on the first in line — the same
           outcome as opening the heir modal and naming the eldest, without
           interrupting the days */
        const namedHeirs = FB.heirsOf ? FB.heirsOf(state) : [];
        if (namedHeirs.length) {
          p.namedHeirId = namedHeirs[0].id;
          p.prestige += 8;
          FB.news(state, FB.msg('news.life.heir_named',
            '📜 {name} is named heir before witnesses.', { name: FB.fullName(namedHeirs[0]) }));
        }
      } else if (FB.ui && FB.ui.showHeirPick) FB.ui.showHeirPick();
    }
    if (fx.queue) FB.queueEvent(state, fx.queue, ctx);
    if (fx.worldNews) FB.randomWorldNews(state);
    if (fx.log) FB.news(state, FB.eventLogMessage(state, sourceFx, ctx));
    const customApplied = !!(fx.custom && FB.fns[fx.custom]);
    if (customApplied) FB.fns[fx.custom](state, ctx, ev);
    if (FB.travelValidate) FB.travelValidate(state);
    /* Lethal effects may freeze where and against whom the blow fell. The
       marker is short-lived unless this exact resolution proves mortal. */
    if (me.health <= 0 && lethalProvenance) {
      p.pendingDeathProvenance = lethalProvenance;
    } else if (me.health > 0) {
      delete p.pendingDeathProvenance;
    }

    const afterImpact = impactSnapshot(state, ctx);
    const ledger = diffImpactSnapshots(state, beforeImpact, afterImpact);
    if (appliedResearch) ledger.push(impact('research', {
      amount:appliedResearch, resolved:true
    }));
    if (appliedGuildStanding) ledger.push(impact('guildStanding', {
      amount:appliedGuildStanding, resolved:true
    }));
    if (appliedPricePressure) ledger.push(impact('price', {
      amount:fx.pricePressure,
      years:fx.pricePressureYears || 1,
      resolved:true
    }));
    if (appliedMarketShock) ledger.push(impact('market', {
      seasons:appliedMarketShock.remaining,
      provinceId:appliedMarketShock.provinceId,
      goodId:appliedMarketShock.goodId,
      production:appliedMarketShock.production,
      demand:appliedMarketShock.demand,
      flow:appliedMarketShock.flow,
      severe:appliedMarketShock.severe,
      reward:appliedMarketShock.production + appliedMarketShock.flow -
        appliedMarketShock.demand > 0,
      resolved:true
    }));
    if (fx.worldNews) ledger.push(impact('worldNews', { resolved:true }));
    if (fx.travelReturn) ledger.push(impact('travel', {
      action:'return', resolved:true
    }));
    if (fx.faithRelation) ledger.push(impact('faith', {
      action:'relation', status:fx.faithRelation.status, resolved:true
    }));
    if (fx.foundFaith && ctx.faithId) ledger.push(impact('faith', {
      action:'found', id:ctx.faithId, permanent:true, resolved:true
    }));
    if (customApplied) {
      const semantic = customAdapter && typeof customAdapter.report === 'function'
        ? customAdapter.report(state, customBefore, ctx, ev, fx)
        : [impact('system', {
          system:'story', customId:fx.custom, unknown:true, resolved:true
        })];
      for (let semanticIndex = 0; semanticIndex < semantic.length; semanticIndex++) {
        ledger.push(semantic[semanticIndex]);
      }
    }
    if (FB.ui && FB.ui.refresh) FB.ui.refresh();
    return ledger;
  };

  FB.eventOptionStatus = function (state, ev, option, ctx) {
    ctx = ctx || {};
    if (!option) {
      return { visible:false, ready:false, techLocked:false, missingTech:[] };
    }
    if (option.effects && option.effects.custom === 'rank_elevation_claim') {
      const status = FB.rankElevationContextStatus &&
        FB.rankElevationContextStatus(state, ctx);
      return {
        visible:true,
        ready:!!(status && status.ready),
        techLocked:false,
        requiredTech:[], missingTech:[],
        reason:status ? status.reason :
          FB.T('The basis for this elevation has changed.')
      };
    }
    if (option.effects && option.effects.custom === 'freedom_accept_offer') {
      const contextReady = FB.fns && FB.fns.freedom_offer_context_valid &&
        FB.fns.freedom_offer_context_valid(state, ctx);
      const acceptance = FB.freedomOfferAcceptanceStatus
        ? FB.freedomOfferAcceptanceStatus(state) : {
          ready:false, reason:FB.T('The saved offer cannot be verified.')
        };
      return {
        visible:true,
        ready:!!contextReady && acceptance.ready,
        techLocked:false,
        requiredTech:[], missingTech:[],
        reason:!contextReady
          ? FB.T('These terms no longer match the offer that was presented.')
          : (acceptance.reason || '')
      };
    }
    const triggerReady = !option.require ||
      FB.checkTrigger(state, option.require, ctx);
    const technology = FB.techRequirementStatus
      ? FB.techRequirementStatus(state, option.requiresTech) : {
          ready:!option.requiresTech ||
            FB.techRequirementMet(state, option.requiresTech),
          requirements:[], missing:[]
        };
    if (!technology.ready) {
      return {
        visible:triggerReady && !!option.showWhenTechLocked,
        ready:false,
        techLocked:true,
        requiredTech:technology.requirements,
        missingTech:technology.missing,
        reason:FB.techRequirementReason
          ? FB.techRequirementReason(state, option.requiresTech) : ''
      };
    }
    return {
      visible:triggerReady,
      ready:triggerReady,
      techLocked:false,
      requiredTech:technology.requirements,
      missingTech:[]
    };
  };

  const RECEIPT_ROLE_PARAMS = [
    'lord', 'priest', 'friend', 'rival', 'spouse', 'suitor', 'partner'
  ];

  /* Relationship effects can clear or replace a role before the durable
     outcome descriptor is built. Keep only concrete pre-effect names; nested
     fallback descriptors still come from the post-effect message. */
  function preserveReceiptRoleParams(message, beforeEffects, ctx) {
    if (!message || !beforeEffects || !beforeEffects.params) return message;
    const params = FB.messageParams(message.params);
    let changed = false;
    const keys = RECEIPT_ROLE_PARAMS.slice();
    const participants = ctx && ctx.participants || {};
    for (const slot in participants) if (keys.indexOf(slot) < 0) keys.push(slot);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = beforeEffects.params[key];
      if (typeof value === 'string' && value) {
        params[key] = value;
        changed = true;
      }
    }
    return changed ? FB.message(message.key, params) : message;
  }

  /* One roll, one effect order, one durable receipt. Manual event buttons and
     autoresolve both call this function; callers only decide how to present
     the returned receipt and when to advance to the next queued dialog. */
  FB.resolveEventOption = function (state, ev, option, ctx, meta) {
    option = option || { label:'So it goes.', effects:{} };
    ctx = ctx || {};
    meta = meta || {};
    if (meta.automated && option.manualOnly) return false;
    if (FB.eventOptionStatus) {
      const optionStatus = FB.eventOptionStatus(state, ev, option, ctx);
      if (optionStatus.techLocked ||
          (option.effects &&
            (option.effects.custom === 'freedom_accept_offer' ||
             option.effects.custom === 'rank_elevation_claim') &&
            !optionStatus.ready)) return false;
    }

    if (ev && !FB.eventContextStillValid(state, ev, ctx)) return false;

    if (ctx && ctx._tenureResolved) return false;

    const optionIndex = ev.options ? ev.options.indexOf(option) : -1;
    const ledgers = [];
    let succeeded = null;
    let branch = null;
    let branchName = null;
    let outcomeBeforeEffects = null;
    const titleBeforeEffects = FB.eventMessage(state, state.player.charId,
      ev, 'title', ctx);
    const optionBeforeEffects = optionIndex >= 0
      ? FB.eventMessage(state, state.player.charId, ev,
        'options.' + optionIndex + '.label', ctx)
      : FB.msg('fx.event.autoresolve.default_choice', 'So it goes.', {});
    if (FB.suppressNewsToasts) FB.suppressNewsToasts(true);
    const oldUiSuppression = FB.ui && FB.ui.suppressEventEffectToasts;
    if (FB.ui) FB.ui.suppressEventEffectToasts = true;
    try {
      if (option.chance !== undefined) {
        const probability = typeof option.chance === 'string'
          ? FB.namedChance(state, option.chance, ctx) : Number(option.chance);
        succeeded = FB.chance(probability);
        branchName = succeeded ? 'success' : 'failure';
        branch = succeeded ? option.success : option.failure;
        if (option.chance === 'battle' || option.chance === 'war_battle') {
          delete state.player.flags.blessed_war;
        }
      }
      if (branch && branch.text && optionIndex >= 0) {
        const outcomePath = 'options.' + optionIndex + '.' + branchName + '.text';
        outcomeBeforeEffects = FB.eventMessage(state, state.player.charId,
          ev, outcomePath, ctx);
      }
      if (option.effects) ledgers.push(FB.applyEffects(state, option.effects, ctx, ev));
      if (branch && branch.effects) {
        ledgers.push(FB.applyEffects(state, branch.effects, ctx, ev));
      }
    } finally {
      if (FB.ui) FB.ui.suppressEventEffectToasts = oldUiSuppression;
      if (FB.suppressNewsToasts) FB.suppressNewsToasts(false);
    }

    /* Advance tenure duties after accepted effects, with tenure-closing effects winning over advancement. */
    if (ctx && ctx.dutyId) {
      ctx._tenureResolved = true;
      const tenure = state.player && state.player.tenure;
      if (tenure && tenure.status === 'active' && state.player.tier === 0) {
        let regularDuty = null;
        for (let i = 0; i < (tenure.duties || []).length; i++) {
          if (tenure.duties[i].id === ctx.dutyId) {
            regularDuty = tenure.duties[i];
            break;
          }
        }
        if (regularDuty && regularDuty.nextDueTurn === ctx.dueTurn) {
          const interval = FB.serfTenureDutyInterval
            ? FB.serfTenureDutyInterval(tenure, regularDuty) : 720;
          while (regularDuty.nextDueTurn <= (state.turn || 0)) {
            regularDuty.nextDueTurn += interval;
          }
          regularDuty.lastResolvedTurn = state.turn || 0;
        } else {
          let condDuty = null;
          for (let c = 0; c < (tenure.conditional || []).length; c++) {
            if (tenure.conditional[c].id === ctx.dutyId) {
              condDuty = tenure.conditional[c];
              break;
            }
          }
          if (condDuty && condDuty.pendingTurn === ctx.dueTurn) {
            condDuty.pendingTurn = null;
            condDuty.lastResolvedTurn = state.turn || 0;
            condDuty.nextEligibleTurn = (state.turn || 0) + 1080;
          }
        }
        FB.refreshSerfTenureDueCache(state, tenure);
      }
    }

    let outcomeMessage = null;
    if (branch) {
      if (branch.text && optionIndex >= 0) {
        const outcomePath = 'options.' + optionIndex + '.' + branchName + '.text';
        FB.prepareEventPath(state, ev, outcomePath, ctx);
        outcomeMessage = FB.eventMessage(state, state.player.charId,
          ev, outcomePath, ctx);
        outcomeMessage = preserveReceiptRoleParams(
          outcomeMessage, outcomeBeforeEffects, ctx);
      } else if (branch.text) {
        outcomeMessage = FB.msg(
          succeeded ? 'fx.event.autoresolve.success' : 'fx.event.autoresolve.failure',
          succeeded ? 'It goes well.' : 'It goes poorly.', {});
      } else {
        outcomeMessage = FB.msg(
          succeeded ? 'fx.event.autoresolve.success' : 'fx.event.autoresolve.failure',
          succeeded ? 'It goes well.' : 'It goes poorly.', {});
      }
    }
    const titleMessage = titleBeforeEffects;
    const optionMessage = optionBeforeEffects;
    const receipt = {
      schema:1,
      eventId:ev.id,
      optionIndex:optionIndex,
      result:succeeded === null ? 'none' : (succeeded ? 'success' : 'failure'),
      automated:!!meta.automated,
      title:titleMessage,
      option:optionMessage,
      outcome:outcomeMessage,
      impacts:FB.mergeEventImpacts(ledgers)
    };
    /* Reuse the established autoresolve descriptor as the ordinary-message
       fallback. Older builds know this key and ignore the additive metadata. */
    const fallback = FB.msg('news.event.autoresolved', {
      forms: {
        select:'value', param:'result', cases: {
          outcome:'⚙ {title}: {choice} — {outcome}',
          other:'⚙ {title}: {choice}'
        }
      }
    }, {
      result:outcomeMessage ? 'outcome' : 'other',
      title:FB.messageParam(titleMessage),
      choice:FB.messageParam(optionMessage),
      outcome:outcomeMessage ? FB.messageParam(outcomeMessage) : ''
    });
    FB.news(state, fallback, { kind:'choice', receipt:receipt, toast:false });
    if (FB.game && FB.game.noteFirstEventResolved) {
      FB.game.noteFirstEventResolved(!!meta.automated);
    }
    return receipt;
  };

  FB.doMarry = function (state, options) {
    options = options || {};
    const p = state.player;
    const me = state.chars[p.charId];
    const s = state.chars[p.courtingId];
    if (!s) return;
    if (FB.intrigueCaptivityOf &&
        (FB.intrigueCaptivityOf(state, me.id) ||
          FB.intrigueCaptivityOf(state, s.id))) return false;
    const settleDowry = options.settleDowry !== false;
    const marriageTerms = settleDowry
      ? FB.courtshipTerms(state, s, false)
      : { amount:0, playerPays:false, playerDelta:0 };
    if (marriageTerms.playerPays &&
        p.gold + 0.0001 < marriageTerms.amount) return false;
    if (FB.papacyCelibate &&
        (FB.papacyCelibate(state, me) || FB.papacyCelibate(state, s))) {
      FB.clearCourtship(state, { news:true });
      return false;
    }
    const weddingTravel = p.travel && p.tier >= 3 &&
      p.travel.purpose === 'relationship' &&
      p.travel.phase === 'arrived' &&
      p.travel.currentId === p.travel.destinationId &&
      p.travel.targetCharId === s.id
      ? p.travel : null;
    FB.socialAttentionWithdraw(state, s.id, true);
    /* Marriage makes a retainer resident family: end the paid office before
       the ordinary spouse livelihood and household rules take over. */
    if (FB.retainerRecord && FB.retainerRecord(state, s.id) && FB.removeRetainer) {
      FB.removeRetainer(state, s.id, 'marriage');
    }
    if (FB.detachLocalFolk) FB.detachLocalFolk(state, s.id);
    const others = FB.spousesOf(state, me); // wives already in the household
    // wedding another sets aside any pledge made for the player in childhood
    if (me.betrothedId) {
      const jb = state.chars[me.betrothedId];
      if (jb && jb.id !== s.id) {
        jb.betrothedId = null;
        delete jb.dowryAsk; delete jb.dowryDue;
        FB.news(state, FB.msg('news.event.pledge_set_aside',
          '💔 The old pledge to {name} is quietly set aside.', { name: jb.name }));
      } else if (jb) jb.betrothedId = null;
      me.betrothedId = null;
    }
    /* Marriage links an external political household head to the player, but
       does not dissolve the office or bring that separate establishment under
       household management. Capture this before any relationship-role edits. */
    const authoritySpouse = FB.isExternalHouseholdAuthority &&
      FB.isExternalHouseholdAuthority(state, s);
    const localLordSpouse = s.role === 'lord' || state.roles.lord === s.id;
    s.spouseId = me.id;
    FB.touchFamily();
    if (!others.length) { me.spouseId = s.id; state.roles.spouse = s.id; }
    else {
      const order = ['second', 'third', 'fourth', 'fifth'][others.length - 1] || 'newest';
      FB.news(state, FB.msg('news.event.additional_wife', {
        forms: {
          select: 'value', param: 'order', cases: {
            second: '💍 {name} enters your household as your second wife.',
            third: '💍 {name} enters your household as your third wife.',
            fourth: '💍 {name} enters your household as your fourth wife.',
            fifth: '💍 {name} enters your household as your fifth wife.',
            other: '💍 {name} enters your household as your newest wife.'
          }
        }
      }, { order: order, name: s.name }));
    }
    if (FB.recordStepfamily) {
      FB.recordStepfamily(state, me, s);
      FB.recordStepfamily(state, s, me);
    }
    /* An object given during courtship was external character property. When
       an ordinary spouse enters the household, move that exact object into the
       shared armory; an authority spouse keeps a separate establishment. */
    if (!authoritySpouse && FB.reclaimCharacterItems) {
      FB.reclaimCharacterItems(state, s.id);
    }
    if (!authoritySpouse && FB.receiveMarriageLivelihood) {
      FB.receiveMarriageLivelihood(state, s);
    }
    if (localLordSpouse) s.role = 'lord';
    else s.role = 'spouse';
    // Ordinary relationship seats empty and are lazily refilled. A local lord
    // remains the same political authority after marrying the player.
    if (state.roles.friend === s.id && FB.clearFriendship) {
      FB.clearFriendship(state, false);
    }
    if (state.player.friendContacts) delete state.player.friendContacts[s.id];
    for (const r in state.roles) {
      if (r !== 'spouse' && state.roles[r] === s.id &&
          !(r === 'lord' && authoritySpouse)) delete state.roles[r];
    }
    adjustCharacterStanding(state, s, 30, 'relationship:marriage');
    p.courtingId = null;
    p.courtshipTerms = null;
    delete p.flags.courting;
    delete p.flags.match_refused;
    if (FB.tutorialActive && FB.tutorialActive(state) &&
        p.flags.tut_family_guidance_started &&
        !p.flags.tut_track_family_legacy &&
        p.flags.tut_family_marriage_char_id !== me.id) {
      /* The first wedding in this protagonist's active family lesson owns
         its fertility grace period. Further doctrine-permitted weddings must
         not restart that wait. */
      p.flags.tut_family_marriage_char_id = me.id;
      p.flags.tut_family_married_at = state.turn;
    }
    p.marriedAt = state.turn;
    if (s.royalLine && !options.suppressRoyalCompact) {
      const rs = FB.ensureRealmSuccession(state, s.royalLine.realmId);
      const reigningRoyal = FB.isReigningRealmRuler &&
        FB.isReigningRealmRuler(state, s);
      p.royalCompact = {
        realmId: s.royalLine.realmId,
        memberId: s.royalLine.memberId,
        charId: s.id,
        transmitsCrown: !!(reigningRoyal ||
          (rs && rs.heirId === s.royalLine.memberId)),
        madeTurn: state.turn
      };
      if (FB.maybeRoyalMarriageAlliance) FB.maybeRoyalMarriageAlliance(state, s.royalLine.realmId);
      const royalParams = {
        name:s.name,
        realm:state.realms[s.royalLine.realmId]
          ? state.realms[s.royalLine.realmId].name : ''
      };
      FB.news(state, reigningRoyal
        ? FB.msg('news.event.reigning_royal_marriage',
          '👑 Your marriage to {name}, ruler of {realm}, binds the two dynasties; your shared children enter the royal succession.',
          royalParams)
        : FB.msg('news.event.royal_marriage',
          '👑 Your marriage to {name} binds your dynasty to {realm}; only the designated heir’s branch can transmit its crown.',
          royalParams));
    }
    // the match settles a dowry, and rank rubs off both ways
    const B = FBDATA.balance;
    const gap = FB.stationOf(s) - FB.playerStation(state);
    if (marriageTerms.amount > 0) {
      p.gold += marriageTerms.playerDelta;
      FB.news(state, marriageTerms.playerPays
        ? FB.msg('news.event.marriage_dowry_paid',
          '💰 Your house settles a dowry of {money:gold} with the kin of {name}.',
          { name:s.name, gold:marriageTerms.amount })
        : FB.msg('news.event.marriage_dowry',
          '💰 The kin of {name} settle a dowry of {money:gold} on the match.',
          { name:s.name, gold:marriageTerms.amount }));
    }
    if (gap > 0 && !options.suppressStationPrestige) {
      p.prestige += gap * B.marryUpPrestige;
      FB.news(state, FB.msg('news.event.married_above',
        '👑 You have wed above your station — your name rises with the match.', {}));
    } else if (gap < 0 && !options.suppressStationPrestige) {
      p.prestige = Math.max(0, p.prestige + gap * B.marryDownPrestigeLoss);
      FB.news(state, FB.msg('news.event.married_below',
        '🗣 You have wed beneath your station, and folk mark it.', {}));
    }
    // a spouse leaves their province's roster of notables
    if (state.provChars) {
      for (const pid in state.provChars) {
        const i = state.provChars[pid].indexOf(s.id);
        if (i >= 0) state.provChars[pid].splice(i, 1);
      }
    }
    /* A ruler who marries the exact relationship-visit target may decide
       whether the wedding county becomes a permanent residence. This saved
       child keeps the arrived stay valid after courtship itself is cleared. */
    if (weddingTravel) {
      weddingTravel.marriageResidence = {
        spouseId:s.id,
        destinationId:weddingTravel.destinationId,
        promptPending:true
      };
    }
    if (p.tier === 0 && p.tenure && p.tenure.status === 'active' && p.tenure.conditional) {
      for (let c = 0; c < p.tenure.conditional.length; c++) {
        const cd = p.tenure.conditional[c];
        if (cd.id === 'marriage_leave') {
          if ((state.turn || 0) >= (cd.nextEligibleTurn || 0)) {
            cd.pendingTurn = (state.turn || 0) + 1;
            cd.marriageTurn = state.turn || 0;
            FB.refreshSerfTenureDueCache(state, p.tenure);
          }
          break;
        }
      }
    }
    return true;
  };

  /* custom trigger fns for the station-marriage events (events_common.js).
     The wed_* pair only fires for spouses that carry an explicit station —
     spouses from older saves stay silent rather than guessing. */
  FB.fns = FB.fns || {};
  FB.fns.local_folk_activity_valid = function (state, ctx) {
    return !!(FB.localFolkActivityContextValid &&
      FB.localFolkActivityContextValid(state, ctx));
  };
  FB.fns.local_folk_activity_resolve = function (state, ctx) {
    return !!(FB.resolveLocalFolkActivity &&
      FB.resolveLocalFolkActivity(state, ctx));
  };
  FB.fns.sibling_courtship_approach_valid = function (state, ctx) {
    const target = ctx && ctx.siblingTargetId &&
      state.chars[ctx.siblingTargetId];
    const status = target && FB.siblingCourtshipStatus(state, target);
    if (!status || !status.ready) return false;
    if (ctx.siblingRoute && ctx.siblingRoute !== status.route) return false;
    if (ctx.siblingResponseChance !== undefined &&
        !isFinite(Number(ctx.siblingResponseChance))) return false;
    return true;
  };
  FB.fns.sibling_courtship_approach = function (state, ctx) {
    const target = ctx && ctx.siblingTargetId &&
      state.chars[ctx.siblingTargetId];
    const status = target && FB.siblingCourtshipStatus(state, target);
    if (!status || !status.ready) return false;
    const me = state.chars[state.player.charId];
    const key = siblingPairKey(me, target);
    const reviewedChance = ctx.siblingResponseChance === undefined
      ? status.acceptance.chance
      : FB.clamp(Number(ctx.siblingResponseChance), 0.02,
        status.route === 'xwedodah' ? 0.85 : 0.70);
    const accepted = FB.chance(reviewedChance);
    const record = {
      initiatorId:me.id,
      targetId:target.id,
      status:accepted ? 'accepted' : 'refused',
      route:status.route,
      approachedTurn:state.turn,
      acceptedTurn:accepted ? state.turn : null,
      cooldownUntil:null,
      exposed:false
    };
    FB.ensureSiblingCourtships(state)[key] = record;
    if (accepted && FB.beginCourtship(state, target)) {
      FB.news(state, FB.msg('news.social.sibling_courtship_accepted',
        '🕯 {name} answers yes. The dangerous courtship begins.', {
          name:FB.fullName(target)
        }));
      return true;
    }
    if (accepted) record.status = 'refused';
    FB.news(state, FB.msg('news.social.sibling_courtship_refused',
      '🚪 {name} refuses the forbidden approach, once and for all.', {
        name:FB.fullName(target)
      }));
    return false;
  };
  FB.fns.sibling_exposure_context_valid = function (state, ctx) {
    const me = state.chars[state.player.charId];
    const target = ctx && ctx.siblingTargetId &&
      state.chars[ctx.siblingTargetId];
    const record = me && target
      ? FB.siblingCourtshipRecord(state, me, target) : null;
    return !!(target && state.player.courtingId === target.id &&
      record && record.status === 'accepted' && record.exposed);
  };
  FB.fns.sibling_proposal_context_valid = function (state, ctx) {
    const target = state.player.courtingId &&
      state.chars[state.player.courtingId];
    return !!(target && (!ctx || !ctx.siblingTargetId ||
      ctx.siblingTargetId === target.id) &&
      FB.siblingProposalStatus(state, target).ready);
  };
  FB.fns.sibling_exposure_end = function (state) {
    const target = state.player.courtingId &&
      state.chars[state.player.courtingId];
    if (!target) return false;
    FB.clearCourtship(state, { penalty:true, news:true });
    return true;
  };
  FB.fns.sibling_marriage_success = function (state) {
    const me = state.chars[state.player.charId];
    const target = state.player.courtingId &&
      state.chars[state.player.courtingId];
    const status = target && FB.siblingProposalStatus(state, target);
    if (!status || !status.ready) return false;
    const record = FB.siblingCourtshipRecord(state, me, target);
    if (!FB.doMarry(state, {
      settleDowry:false,
      suppressRoyalCompact:true,
      suppressStationPrestige:true
    })) return false;
    state.player.piety = Math.max(0, state.player.piety - status.piety);
    state.player.gold -= status.gold;
    state.player.prestige = Math.max(0,
      state.player.prestige - status.prestige);
    if (status.route === 'xwedodah') {
      FB.news(state, FB.msg('news.social.xwedodah_marriage',
        '🔥 Before the sacred fire, you and {name} enter xwēdōdah. No dowry or alliance follows.', {
          name:FB.fullName(target)
        }));
    } else {
      state.player.pop = FB.clamp(state.player.pop - status.commonVoice,
        -100, 100);
      if (state.player.liege) {
        adjustRealmStanding(state, state.player.liege,
          -status.liegeStanding, 'marriage:scandalous_union');
      }
      FB.addTrait(me, 'scandalous_union');
      FB.addTrait(target, 'scandalous_union');
      if (FB.faithHasSystem(me.religion, 'papacy', state)) {
        const obedience = FB.papalObedienceForCharacter &&
          FB.papalObedienceForCharacter(state, me);
        if (FB.adjustPapalOpinionOfCandidate) {
          FB.adjustPapalOpinionOfCandidate(state, me, -20, obedience);
        }
        if (FB.addPapalGround) {
          FB.addPapalGround(state, me, 'scandalous_union', obedience);
        }
        if (obedience && FB.adjustPapalAuthority) {
          FB.adjustPapalAuthority(state, obedience, -8,
            'scandalous sibling union');
        }
      } else if (FB.adjustReligionRealmOpinions) {
        FB.adjustReligionRealmOpinions(state, me.religion, -8);
      }
      FB.news(state, FB.msg('news.social.scandalous_sibling_marriage',
        '🕯 You and {name} persist in an irregular union. Kin, neighbors, and rulers recoil; no dowry or alliance follows.', {
          name:FB.fullName(target)
        }));
    }
    record.status = 'married';
    record.route = status.route;
    record.marriedTurn = state.turn;
    return true;
  };
  FB.fns.sibling_proposal_refused = function (state) {
    const me = state.chars[state.player.charId];
    const target = state.player.courtingId &&
      state.chars[state.player.courtingId];
    const record = target && FB.siblingCourtshipRecord(state, me, target);
    if (!target || !record) return false;
    record.status = 'refused';
    FB.clearCourtship(state, { siblingFinal:true });
    FB.news(state, FB.msg('news.social.sibling_proposal_refused',
      '💔 {name} refuses to make the dangerous courtship a marriage.', {
        name:FB.fullName(target)
      }));
    return true;
  };
  FB.fns.begin_courtship = function (state) {
    const su = FB.getRole(state, 'suitor', false);
    return !!su && FB.beginCourtship(state, su);
  };
  FB.fns.formalize_attention_friend = function (state) {
    return !!FB.formalizeAttentionFriend(state);
  };
  FB.fns.friendship_kindled_ready = function (state) {
    const c = FB.attentionFriendCandidate(state);
    return !!(c && state.roles.friend !== c.id);
  };
  FB.fns.suitor_above_station = function (state) {
    const su = FB.getRole(state, 'suitor');
    return !!su && FB.stationOf(su) > FB.playerStation(state);
  };
  FB.fns.wed_above_station = function (state) {
    const sp = FB.spouseOf(state, state.chars[state.player.charId]);
    return !!sp && sp.station != null && sp.station > FB.playerStation(state);
  };
  FB.fns.wed_below_station = function (state) {
    const sp = FB.spouseOf(state, state.chars[state.player.charId]);
    return !!sp && sp.station != null && sp.station < FB.playerStation(state);
  };

  /* ---------- student education decisions (events_common.js) ---------- */
  FB.fns.education_story_context_valid = function (state, ctx) {
    const c = ctx && ctx.studentId ? state.chars[ctx.studentId] : null;
    return !!(c && !c.dead && ctx.protagonistId === state.player.charId);
  };

  /* ---------- Noble Academy decisions (events_common.js) ---------- */
  function academyStudent(state, ctx) {
    const c = ctx && ctx.studentId ? state.chars[ctx.studentId] : null;
    return c && !c.dead ? c : null;
  }

  function academyTrain(state, ctx, skill) {
    const c = academyStudent(state, ctx);
    if (!c) return false;
    if (!skill) skill = (ctx && ctx.studentFocus) || (c.edu && c.edu.focus);
    if (FB.SKILLS.indexOf(skill) < 0) return false;
    FB.gainSkill(c, skill, 1);
    return true;
  }

  function academyNoble(state, pids, contacts) {
    const existing = [];
    const ungenerated = [];
    state.provChars = state.provChars || {};
    for (let i = 0; i < pids.length; i++) {
      const ids = state.provChars[pids[i]];
      if (!ids || !ids.length) {
        ungenerated.push(pids[i]);
        continue;
      }
      let hasLivingNoble = false;
      for (let j = 0; j < ids.length; j++) {
        const c = state.chars[ids[j]];
        if (!c || c.dead || c.role !== 'notable' || FB.stationOf(c) < 3) continue;
        hasLivingNoble = true;
        if (!contacts[c.id] && c.id !== state.player.charId) existing.push(c);
      }
      if (!hasLivingNoble) ungenerated.push(pids[i]);
    }
    if (existing.length) return FB.pick(existing);
    if (!ungenerated.length) return null;
    const generated = FB.provNotables(state, FB.pick(ungenerated)).filter(function (c) {
      return c && !c.dead && c.role === 'notable' && FB.stationOf(c) >= 3 &&
        !contacts[c.id] && c.id !== state.player.charId;
    });
    return generated.length ? FB.pick(generated) : null;
  }

  function academyIntroductionCandidate(state, contacts) {
    const home = state.player.provinceId;
    const realmId = state.owner[home];
    const other = FB.world.provs.filter(function (pr) {
      return pr && !pr.wasteland && pr.id !== home;
    });
    const sameRealm = other.filter(function (pr) {
      return state.owner[pr.id] === realmId;
    }).map(function (pr) { return pr.id; });
    let c = academyNoble(state, sameRealm, contacts);
    if (c) return c;
    const elsewhere = other.filter(function (pr) {
      return state.owner[pr.id] !== realmId;
    }).map(function (pr) { return pr.id; });
    return academyNoble(state, elsewhere, contacts);
  }

  FB.fns.academy_introduction = function (state, ctx) {
    const student = academyStudent(state, ctx);
    if (!student) return false;
    const contacts = FB.friendContacts(state);
    let c = academyIntroductionCandidate(state, contacts);
    let result = 'new';
    if (!c) {
      const warm = FB.friendConnections(state).filter(function (candidate) {
        return FB.stationOf(candidate) >= 3;
      });
      c = warm.length ? warm[0] : null;
      result = c ? 'existing' : 'none';
    }
    if (c) {
      FB.noteFriendContact(state, c);
      const standing = adjustCharacterStanding(state, c, 15,
        'education:academy_introduction');
      ctx.contact = FB.fullName(c);
      ctx.regard = Math.round(standing);
    }
    FB.news(state, FB.msg('news.education.academy_introduction', {
      forms: {
        select:'value', param:'result', cases:{
          new:'🤝 Through {student}’s academy patron, you meet {contact}. The new connection begins at {regard} Standing.',
          existing:'🤝 {student}’s academy patron renews your connection with {contact}, now at {regard} Standing.',
          other:'🤝 The promised academy introduction finds no noble contact still able to receive it.'
        }
      }
    }, {
      result:result, student:student.name,
      contact:c ? FB.fullName(c) : '',
      regard:c ? Math.round(characterStanding(state, c)) : 0
    }));
    return !!c;
  };

  FB.fns.academy_student_focus = function (state, ctx) {
    return academyTrain(state, ctx, null);
  };
  FB.fns.academy_student_dip = function (state, ctx) {
    return academyTrain(state, ctx, 'dip');
  };
  FB.fns.academy_student_ste = function (state, ctx) {
    return academyTrain(state, ctx, 'ste');
  };
  FB.fns.academy_student_int = function (state, ctx) {
    return academyTrain(state, ctx, 'int');
  };
  FB.fns.academy_student_lea = function (state, ctx) {
    return academyTrain(state, ctx, 'lea');
  };
  FB.fns.academy_withdraw = function (state, ctx) {
    const c = academyStudent(state, ctx);
    if (!c || !c.edu || c.edu.school !== 'noble_academy') return false;
    c.edu.school = null;
    c.edu.tutorId = null;
    delete c.edu.schoolUnpaid;
    if (FB.markEducationManual) {
      FB.markEducationManual(state, c, 'instruction', 'home');
    }
    return true;
  };

  /* the church grants the annulment plea (annulment_plea event) */
  FB.fns.annul_granted = function (state) {
    const me = state.chars[state.player.charId];
    const sp = FB.spouseOf(state, me);
    if (!sp) return;
    const deity = String(FB.faithValue(
      state, me.religion, 'words.deity').value || 'God');
    const knownDeity = deity === 'Allah' ? 'muslim' :
      (deity === 'the gods' ? 'pagan' :
        (deity === 'the Lord' ? 'jewish' : (deity === 'God' ? 'other' : 'custom')));
    FB.doDivorce(state, sp.id);
    FB.news(state, FB.msg('news.event.annulment', {
      forms: {
        select: 'value', param: 'faith', cases: {
          muslim: '⛪ The marriage to {name} is declared void — before Allah, it never was.',
          pagan: '⛪ The marriage to {name} is declared void — before the gods, it never was.',
          jewish: '⛪ The marriage to {name} is declared void — before the Lord, it never was.',
          custom: '⛪ The marriage to {name} is declared void — before {deity}, it never was.',
          other: '⛪ The marriage to {name} is declared void — before God, it never was.'
        }
      }
    }, {
      faith:knownDeity,
      deity:FB.dataParam('religion', me.religion, 'words.deity'),
      name:sp.name
    }));
  };

  /* ---------- Sweet Polly Oliver (disguise-at-war chain, events_peasant.js) ----------
     polly_court spawns the young soldier the heroine follows to war and seats
     him in the {suitor} role (courtingId) so his card and name carry through
     every chapter and the reunion can wed him with a plain marry:true. We
     deliberately never set the `courting` flag, so none of the ordinary
     courtship/proposal events fire over the top of the story. */
  FB.fns.polly_court = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    const pr = FB.world.byId[p.provinceId];
    const y = state.date.year;
    const st = FB.clamp(FB.playerStation(state), 0, 3); // a peer — a common soldier
    const c = FB.makeCharacter(state, {
      sex: 'm', culture: pr.culture, religion: me.religion,
      born: y - FB.clamp(FB.ageOf(me, y) + FB.ri(-2, 5), 16, 40),
      role: 'suitor', opinion: FB.ri(10, 30), station: st, quality: st + FB.ri(0, 1)
    });
    if (SUITOR_EPITHETS[st] && SUITOR_EPITHETS[st].m) c.epithetMsg = FB.pick(SUITOR_EPITHETS[st].m);
    if (FB.applyMarriageBackground) FB.applyMarriageBackground(c, st, c.epithetMsg);
    p.courtingId = c.id;
  };
  /* the losing side of the shield-wall: the grave wound itself is the data
     health hit (so the automation "never a silent killing blow" guard can see
     it), and this only adds the small, martial-tempered chance the rout proves
     mortal — most who lose still crawl away. Zeroing health lets G.afterEvents
     record the death after the modal closes. */
  FB.fns.polly_rout = function (state) {
    const me = state.chars[state.player.charId];
    const mortal = FB.clamp(0.12 - FB.skillOf(me, 'mar') * 0.004, 0.04, 0.12);
    if (FB.chance(mortal)) me.health = 0;
  };

  /* ---------- widowhood & the house claim ----------
     Called (after FB.killChar) when the player's spouse dies. A spouse who
     stood above the player's station leaves a reckoning with their house:
     a settlement for the widow(er) — or, if the marriage left a living
     child of that blood, a claim to press (events in events_common.js).
     Spouses without an explicit station (older saves) pass in silence. */
  FB.spouseDied = function (state, sp) {
    FB.endRoyalCompact(state, sp);
    if (sp.station === undefined || sp.station === null) return;
    if (sp.station - FB.playerStation(state) <= 0) return;
    const me = state.chars[state.player.charId];
    let heir = null;
    for (const id of me.childrenIds) {
      const k = state.chars[id];
      if (k && !k.dead && (k.fatherId === sp.id || k.motherId === sp.id)) { heir = k; break; }
    }
    const ctx = { lateName: sp.name + (sp.dyn ? ' ' + sp.dyn : ''), lateStation: sp.station };
    if (heir) ctx.childId = heir.id;
    FB.queueEvent(state, heir ? 'house_claim' : 'widow_settlement', ctx);
  };

  /* payout fns for the widowhood events — all scale off the dowry the late
     spouse's station commands, so one balance knob tunes the whole chain */
  function lateDowry(ctx, mult) {
    const st = ctx && ctx.lateStation !== undefined ? ctx.lateStation : 1;
    return Math.max(1, Math.round((FBDATA.balance.dowryByStation[st] || 0) * mult * FB.rf(0.85, 1.15)));
  }
  function lateName(ctx) { return (ctx && ctx.lateName) || 'your late spouse'; }
  FB.fns.dower_take = function (state, ctx) {
    const g = lateDowry(ctx, 0.6);
    state.player.gold += g;
    FB.news(state, FB.msg('news.event.widow_settlement',
      '💰 The house of {house} settles {money:gold} on you.',
      { house: lateName(ctx), gold: g }));
  };
  FB.fns.dower_take_full = function (state, ctx) {
    const g = lateDowry(ctx, 1.1);
    state.player.gold += g;
    FB.news(state, FB.msg('news.event.widow_full_settlement',
      '💰 The house of {house} pays the full portion: {money:gold}.',
      { house: lateName(ctx), gold: g }));
  };
  FB.fns.claim_won = function (state, ctx) {
    const p = state.player;
    const g = lateDowry(ctx, 1.5);
    p.gold += g;
    FB.news(state, FB.msg('news.event.inheritance_settled',
      '💰 The inheritance settles {money:gold} under your stewardship.', { gold: g }));
    // a noble house's estate lifts a common steward into the gentry
    if (p.tier < 2 && ctx && ctx.lateStation >= 3) {
      FB.setPlayerTier(state, 2);
      FB.news(state, FB.msg('news.event.inheritance_raises_station',
        '🏛 Stewarding a noble inheritance raises you into the gentry.', {}));
    }
  };
  FB.fns.claim_lost = function (state, ctx) {
    const g = lateDowry(ctx, 0.3);
    state.player.gold += g;
    FB.news(state, FB.msg('news.event.grudging_inheritance',
      '💰 A grudging purse of {money:gold} — and nothing more.', { gold: g }));
  };
  FB.fns.claim_sold = function (state, ctx) {
    const g = lateDowry(ctx, 1.0);
    state.player.gold += g;
    FB.news(state, FB.msg('news.event.claim_sold',
      '💰 The house of {house} buys back the claim for {money:gold}.',
      { house: lateName(ctx), gold: g }));
  };
  FB.fns.record_liege_grant = function (state) {
    FB.recordLiegeGrant(state);
  };

  const HISTORIC_RAID_PROFILES = {
    northmen:1, cross_banners:1, saxon_host:1,
    steppe_riders:1, rus_raiders:1, rival_raiders:1
  };

  FB.fns.historic_raid_context_valid = function (state, ctx) {
    const p = state.player;
    const target = ctx && ctx.destinationId && FB.world.byId[ctx.destinationId];
    return !!(p && p.tier <= 2 && ctx &&
      ctx.protagonistId === p.charId && HISTORIC_RAID_PROFILES[ctx.raidProfile] &&
      target && !target.wasteland && target.id !== p.provinceId);
  };

  /* A neutral escape costs one represented piece of portable or household
     wealth. The seeded draw chooses only among categories the family actually
     owns, so an heirloom cannot be named when the armory is empty and a
     penniless household is never charged imaginary coin. */
  FB.fns.raid_plunder = function (state) {
    const p = state.player;
    const items = FB.itemList ? FB.itemList(state) : (p.items || []);
    const holdings = FB.holdingList ? FB.holdingList(state) : (p.holdings || []);
    const plots = p.landPlots || [];
    const standards = FB.ensureHouseholdStandards
      ? FB.ensureHouseholdStandards(state) : (p.householdStandards || {});
    const standardIds = Object.keys(standards).filter(function (id) {
      return Number(standards[id]) > 0;
    }).sort();
    const categories = [];
    if (items.length) categories.push('item');
    if (holdings.length) categories.push('holding');
    if (standardIds.length) categories.push('standard');
    if (plots.length) categories.push('plot');
    if (p.gold > 0) categories.push('gold');
    if (!categories.length) {
      FB.news(state, FB.msg('news.event.raid_empty_handed',
        'The raiders find no purse or property worth slowing for.', {}));
      return true;
    }
    const category = FB.pick(categories);
    if (category === 'item') {
      const ref = FB.pick(items);
      const item = FB.itemParam ? FB.itemParam(state, ref) : ref;
      if (FB.destroyItem) FB.destroyItem(state, ref, { force:true });
      FB.news(state, FB.msg('news.event.raid_item_lost',
        'The raiders carry off {item}.', { item:item }));
    } else if (category === 'holding') {
      const id = FB.pick(holdings);
      holdings.splice(holdings.indexOf(id), 1);
      FB.news(state, FB.msg('news.event.raid_holding_lost',
        'The raiders strip the household of {holding}.', {
          holding:FB.dataParam('holding', id)
        }));
    } else if (category === 'standard') {
      const id = FB.pick(standardIds);
      const level = Number(standards[id]) || 1;
      if (level > 1) standards[id] = level - 1;
      else delete standards[id];
      FB.news(state, FB.msg('news.event.raid_standard_lost',
        'The raiders ruin or carry off {goods}.', {
          goods:FB.dataParam('householdStandard', id,
            'levels.' + (level - 1) + '.name')
        }));
    } else if (category === 'plot') {
      plots.splice(FB.ri(0, plots.length - 1), 1);
      FB.news(state, FB.msg('news.event.raid_plot_lost',
        'The abandoned family plot is seized before you can return.', {}));
    } else {
      const amount = Math.min(p.gold,
        Math.max(2, Math.min(20, Math.ceil(p.gold * 0.35))));
      p.gold -= amount;
      FB.news(state, FB.msg('news.event.raid_gold_lost',
        'The raiders take a purse worth {money:amount}.', { amount:amount }));
    }
    return true;
  };

  /* Capture is not ordinary imprisonment. The raiders transport the whole
     playable household to their snapshotted county, erase immovable commoner
     property, and bind the protagonist at the tier floor. Culture and faith
     remain the captive family's own. */
  FB.fns.raid_enslave = function (state, ctx) {
    if (!FB.fns.historic_raid_context_valid(state, ctx)) return false;
    const p = state.player;
    const destination = ctx.destinationId;
    p.gold = Math.min(0, Number(p.gold) || 0);
    p.provs = [];
    p.holdings = [];
    p.enterprises = [];
    for (const record of (p.enterpriseLabor || [])) {
      const worker = record && state.chars[record.charId];
      if (worker && worker.role === 'laborer') worker.role = null;
    }
    p.enterpriseLabor = [];
    p.householdStandards = {};
    p.landPlots = [];
    p.manor = null;
    p.professionBack = null;
    delete p.flags.on_campaign;
    delete p.flags.was_civilian;
    delete p.flags.guild_member;
    delete p.flags.has_farm;
    delete p.flags.abbot;
    delete p.flags.qadi;
    delete p.flags.home_burned;
    delete p.flags.home_burned2;
    delete p.flags.lord_protection;
    FB.setPlayerTier(state, 0, { attachLiege:false, formTenure:false });
    p.provinceId = destination;
    p.home = destination;
    p.homeSettlement = 0;
    p.settlement = 0;
    if (FB.replaceSerfTenure) {
      FB.replaceSerfTenure(state, 'forced_settlement', 'forced_relocation');
    }
    FB.changePlayerLiege(state, null, 'raid:enslavement');
    if (FB.clearCourtship) FB.clearCourtship(state);
    if (FB.socialAttentionClear) FB.socialAttentionClear(state);
    if (FB.clearFriendship) FB.clearFriendship(state, true);
    for (const role of ['lord', 'steward', 'priest', 'friend', 'rival', 'notable']) {
      delete state.roles[role];
    }
    if (FB.setCareer) {
      const me = state.chars[p.charId];
      const rank = FB.ageOf(me, state.date.year) < 16 ? 'apprentice' : 'journeyman';
      FB.setCareer(state, me, 'farmer', rank);
    } else {
      p.profession = 'farmer';
    }
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    if (FB.reconcileHouseholdLoadouts) FB.reconcileHouseholdLoadouts(state);
    if (FB.enterpriseList) FB.enterpriseList(state);
    if (FB.validateFocus) FB.validateFocus(state);
    if (FB.localFolkArrive) FB.localFolkArrive(state, destination);
    FB.news(state, FB.msg('news.event.raid_enslaved',
      'Carried to {county}, the household is stripped of property and bound to the land.', {
        county:FB.world.byId[destination].name
      }));
    if (FB.map) {
      FB.map.playerProv = destination;
      FB.map.request();
    }
    return true;
  };

  FB.movePlayerRandom = function (state) {
    const p = state.player;
    // flight must go somewhere foreign: never the player's own demesne
    // (holder 'player' would make him his own vassal) nor a vassal's fief
    const adj = Object.keys(FB.world.adj[p.provinceId] || {})
      .filter(function (id) {
        if (FB.world.byId[id].wasteland) return false;
        const h = (state.holder && state.holder[id]) || state.owner[id];
        if (h === 'player') return false;
        if (state.realms[h] && state.realms[h].liege === 'player') return false;
        return true;
      });
    const dest = adj.length ? FB.pick(adj) : null;
    if (dest) {
      p.provinceId = dest;
      if (FB.localCouncilValidate) FB.localCouncilValidate(state, false);
      // local cast stays behind
      for (const r of ['lord', 'steward', 'priest', 'friend', 'rival']) {
        delete state.roles[r];
      }
      const rid = (state.holder && state.holder[dest]) || state.owner[dest];
      FB.changePlayerLiege(state,
        p.tier >= 3 && rid && rid !== 'player' ? rid : null,
        'travel:permanent_move');
      if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
      if (FB.enterpriseList) FB.enterpriseList(state);
      if (FB.localFolkArrive) FB.localFolkArrive(state, dest);
      FB.news(state, FB.msg('news.event.moved',
        '🧭 You now dwell in {province}.', { province: FB.world.byId[dest].name }));
      if (FB.map) { FB.map.playerProv = dest; FB.map.request(); }
    }
  };

  FB.doIndependence = function (state) {
    const p = state.player;
    if (FB.playerBishopricOnly && FB.playerBishopricOnly(state)) return false;
    const oldLiege = p.liege ? FB.topRealm(state, p.liege) : state.owner[p.provinceId];
    if (oldLiege && FB.isRealmAtWar(state, oldLiege)) return false;
    if (!p.provs || !p.provs.length) {
      // a baron who renounces his lord seizes the home county he was
      // enfeoffed in — transferProvince buries the old holder if landless
      p.provs = [p.provinceId];
      if (p.tier < 4) FB.setPlayerTier(state, 4, { attachLiege:false });
      FB.transferProvince(state, p.provinceId, 'player');
    }
    FB.changePlayerLiege(state, null, 'realm:independence');
    if (state.realms.player) state.realms.player.liege = null;
    FB.foundPlayerRealm(state);
    if (oldLiege && FB.mergeRealmTech) FB.mergeRealmTech(state, 'player', oldLiege);
    if (oldLiege && state.realms[oldLiege] && state.realms[oldLiege].alive) {
      p.war = { enemy: oldLiege, target: null, wins: 0, losses: 0, seasons: 0,
        defending: true, casus: { type: 'independence' } };
      FB.news(state, FB.msg('news.event.independence_war',
        '⚔ {realm} will not let you go without a fight!',
        { realm: state.realms[oldLiege].name }));
      FB.warFooting(state);
      FB.queueWarEvent(state, 'war_defense_muster', {});
    }
    FB.checkTierPromotions(state);
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    return true;
  };

  /* counties the liege could hand the player: adjacent to the player's lands,
     held directly by the liege, not already the player's. A lord rewards from
     his own hand, but never his seat, and never his last directly held
     county — he would be giving his power base away. */
  FB.liegeGrantCandidates = function (state) {
    const p = state.player, cands = [];
    if (!p.liege || !p.provs) return cands;
    const liege = state.realms[p.liege];
    if (!liege || !liege.alive) return cands;
    if (FB.realmHeldCounties(state, p.liege).length < 2) return cands;
    for (const pid of p.provs) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (state.holder[nb] === p.liege && nb !== liege.capital &&
            p.provs.indexOf(nb) < 0 && !FB.world.byId[nb].wasteland) cands.push(nb);
      }
    }
    return cands;
  };

  /* A baron may receive the home county only from its real territorial
     holder. Generated local "lords" are story characters rather than realm
     rulers and have no title to convey. */
  FB.liegeHomeCountyGrantAuthority = function (state) {
    const p = state.player;
    if (!p.liege || !p.provinceId || !state.realms || !state.holder) return null;
    const liege = state.realms[p.liege];
    if (!liege || !liege.alive || !liege.ruler || liege.rank < 1) return null;
    if (state.holder[p.provinceId] !== p.liege) return null;
    return FB.realmHeldCounties(state, p.liege).indexOf(p.provinceId) >= 0
      ? liege : null;
  };

  FB.grantByLiege = function (state) {
    const p = state.player;
    let granted = false;
    if (p.tier === 3) {
      // raised to count of the home county. A count cannot make a peer of
      // himself: the granter yields the county and the player answers from
      // now on to the granter's OWN liege (the duke), never to a fellow count.
      const old = FB.liegeHomeCountyGrantAuthority(state);
      if (!old) return false;
      p.provs = p.provs || [];
      if (p.provs.indexOf(p.provinceId) < 0) p.provs.push(p.provinceId);
      if (state.holder) state.holder[p.provinceId] = 'player';
      FB.setPlayerTier(state, 4);
      FB.recordLiegeGrant(state);
      granted = true;
      // Standing earned with the old lord stays on his name; the new liege
      // keeps whatever Standing the player had already built with him.
      const nextLiege = old.liege || null;
      FB.changePlayerLiege(state, nextLiege, 'realm:liege_grant');
      FB.foundPlayerRealm(state);
      FB.invalidateRealmCache();
      // a granter left holding no county at all dissolves — any vassals of
      // his reattach upward, exactly as in FB.transferProvince
      const terr = FB.realmTerritory(state, old.id);
      if (!terr.length) {
        if (FB.mergeRealmTech) {
          FB.mergeRealmTech(state, FB.topRealm(state, p.liege || 'player'), old.id);
        }
        FB.markRealmDead(state, old.id);
        for (const vid in state.realms) if (state.realms[vid].liege === old.id) state.realms[vid].liege = old.liege || null;
      } else if (old.capital === p.provinceId) {
        old.capital = terr[0];
      }
      if (p.liege && state.realms[p.liege]) {
        FB.news(state, FB.msg('news.event.invested_under_liege',
          '👑 Invested, you answer now to {realm}.', { realm: state.realms[p.liege].name }));
      }
      if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    } else if (p.tier >= 4 && p.liege) {
      const cands = FB.liegeGrantCandidates(state);
      if (cands.length) {
        const got = FB.pick(cands);
        const liegeId = p.liege;
        p.provs.push(got);
        state.holder[got] = 'player';
        FB.recordLiegeGrant(state);
        FB.invalidateRealmCache();
        // insurance only: the candidate filter never takes his last county
        FB.realmBuryIfEmpty(state, liegeId);
        FB.news(state, FB.msg('news.event.liege_grants_county',
          '🏰 The liege grants you {province}.', { province: FB.world.byId[got].name }));
        if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
        granted = true;
      }
      FB.checkTierPromotions(state);
    }
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    return granted;
  };

  /* the liege strips a disgraced vassal and hands the county to the player
     (fired from the county_petition event; p.petitionPid set by the picker) */
  FB.fns.county_petition_grant = function (state) {
    const p = state.player;
    const pid = p.petitionPid;
    delete p.petitionPid;
    const pr = pid ? FB.world.byId[pid] : null;
    if (!pr) return;
    const old = state.holder[pid];
    if (!old || old === 'player') return;
    p.provs = p.provs || [];
    if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
    state.holder[pid] = 'player';
    FB.recordLiegeGrant(state);
    FB.invalidateRealmCache();
    FB.realmBuryIfEmpty(state, old);
    FB.news(state, FB.msg('news.event.petition_granted', {
      forms: {
        select: 'value', param: 'named', cases: {
          yes: '🤝 Your liege strips {lord} of {province} and invests you with it.',
          other: '🤝 Your liege strips the old lord of {province} and invests you with it.'
        }
      }
    }, {
      named: state.realms[old] ? 'yes' : 'other',
      lord: state.realms[old] ? state.realms[old].name : '',
      province: pr.name
    }));
    FB.checkTierPromotions(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };

  /* ---- liege-chain & vassalage handlers (fired from events_noble.js) ---- */

  /* an appeal over the direct liege's head succeeds: the appealed lord
     takes the player as his own direct man; the old liege seethes */
  FB.fns.appeal_win = function (state, ctx) {
    const p = state.player;
    const rid = p.appealRid || (ctx && ctx.rid);
    p.appealRid = null;
    const r = state.realms[rid];
    if (!r || !r.alive || !p.liege || rid === p.liege) return;
    const old = p.liege;
    FB.changePlayerLiege(state, rid, 'event:appeal_win');
    if (state.realms.player && state.realms.player.alive) state.realms.player.liege = rid;
    adjustRealmStanding(state, rid, 15, 'event:appeal_win');
    adjustRealmStanding(state, old, -25, 'event:appeal_win');
    p.prestige += 8;
    FB.news(state, FB.msg('news.event.appeal_won', {
      forms: {
        select: 'value', param: 'named', cases: {
          yes: '⚖ {new_liege} takes you as his direct man — {old_liege} is passed over.',
          other: '⚖ {new_liege} takes you as his direct man — your old lord is passed over.'
        }
      }
    }, {
      named: state.realms[old] ? 'yes' : 'other',
      new_liege: r.name,
      old_liege: state.realms[old] ? state.realms[old].name : ''
    }));
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
  };
  FB.fns.appeal_lose = function (state, ctx) {
    const p = state.player;
    const rid = p.appealRid || (ctx && ctx.rid);
    p.appealRid = null;
    if (rid) adjustRealmStanding(state, rid, -5, 'event:appeal_lose');
    if (p.liege) {
      adjustRealmStanding(state, p.liege, -15, 'event:appeal_lose');
    }
  };

  /* vassal breaks free unopposed */
  FB.fns.vassal_release = function (state, ctx) {
    const rid = ctx && ctx.rid;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    // capture the territory BEFORE cutting the liege: once liege is null,
    // realmTerritory early-returns owner-keyed provs and a vassal owns none
    const terr = FB.realmTerritory(state, rid);
    const formerSovereign = FB.topRealm(state, rid);
    r.liege = null;
    for (const pid of terr) state.owner[pid] = rid;
    FB.invalidateRealmCache();
    if (FB.mergeRealmTech) FB.mergeRealmTech(state, rid, formerSovereign);
    FB.news(state, FB.msg('news.event.vassal_released',
      '🕊 {realm} goes its own way, released from your fealty.', { realm: r.name }));
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };
  /* answer a revolt (or a refused revocation) with war — the rebel stands
     alone as a tiny sovereign realm until crushed */
  FB.fns.vassal_crush = function (state, ctx) {
    const p = state.player;
    const rid = ctx && ctx.rid;
    const r = state.realms[rid];
    if (!r || !r.alive || p.war) return;
    // capture the territory BEFORE cutting the liege: once liege is null,
    // realmTerritory early-returns owner-keyed provs and a vassal owns none —
    // without this the rebel's counties keep the old sovereign as owner and
    // war_can_siege (owner[target] === enemy) can never come true
    const terr = FB.realmTerritory(state, rid);
    const formerSovereign = FB.topRealm(state, rid);
    r.liege = null;
    for (const pid of terr) state.owner[pid] = rid;
    FB.invalidateRealmCache();
    if (FB.mergeRealmTech) FB.mergeRealmTech(state, rid, formerSovereign);
    const held = FB.realmHeldCounties(state, rid);
    p.war = { enemy: rid, target: held[0] || null, wins: 0, losses: 0, seasons: 0, defending: false };
    FB.warFooting(state);
    FB.queueWarEvent(state, 'war_muster', {});
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };
  /* a vassal yields his fief peacefully */
  FB.fns.vassal_reclaim = function (state, ctx) {
    const p = state.player;
    const rid = p.revokeRid || (ctx && ctx.rid);
    p.revokeRid = null;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    if (FB.notePoliticalMistreatment) {
      FB.notePoliticalMistreatment(state, 'revocation', { realmId:rid });
    }
    for (const pid of FB.realmHeldCounties(state, rid)) {
      state.holder[pid] = 'player';
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
    }
    if (FB.mergeRealmTech) FB.mergeRealmTech(state, 'player', rid);
    FB.markRealmDead(state, rid);
    /* the revoked house's own vassals pass to its liege, mirroring the
       dissolution blocks of realmBuryIfEmpty and transferProvince — otherwise
       they stay sworn to a dead realm and vanish from every vassal list */
    for (const vid in state.realms) {
      if (state.realms[vid].liege === rid) state.realms[vid].liege = r.liege || null;
    }
    FB.invalidateRealmCache();
    if (FB.councilAuthority) FB.councilAuthority(state, 6); // a fief taken back: the crown reaches, the council notes
    FB.news(state, FB.msg('news.event.fief_reclaimed',
      '📜 The fief returns to your demesne. {realm} is no more.', { realm: r.name }));
    FB.checkTierPromotions(state);
  };
  FB.fns.vassal_refuse = function (state, ctx) {
    const p = state.player;
    const rid = p.revokeRid || (ctx && ctx.rid);
    p.revokeRid = null;
    if (FB.notePoliticalMistreatment) {
      FB.notePoliticalMistreatment(state, 'revocation', { realmId:rid });
    }
    adjustRealmStanding(state, rid, -20, 'event:vassal_refuse');
    FB.fns.vassal_crush(state, { rid: rid });
  };
  /* Small vassal-Standing nudges for the flavor events. */
  FB.fns.vassal_favor = function (state) {
    const vs = FB.playerVassals(state);
    if (vs.length) {
      adjustRealmStanding(state, FB.pick(vs), 20, 'event:vassal_favor');
    }
  };
  FB.fns.vassal_snub = function (state) {
    const vs = FB.playerVassals(state);
    if (vs.length) {
      adjustRealmStanding(state, FB.pick(vs), -10, 'event:vassal_snub');
    }
  };
  /* insist on the refused taxes: the surliest vassal pays up and hates it */
  FB.fns.vassal_insist = function (state) {
    const vs = FB.playerVassals(state);
    if (!vs.length) return;
    let worst = vs[0];
    for (const v of vs) {
      if (realmStanding(state, v) < realmStanding(state, worst)) worst = v;
    }
    const ordinary = FB.vassalTaxContribution
      ? FB.vassalTaxContribution(state, worst) : 0;
    const g = Math.ceil(ordinary * 2);
    state.player.gold += g;
    adjustRealmStanding(state, worst, -20, 'event:vassal_insist');
    FB.news(state, FB.msg('news.event.vassal_tax_paid',
      '💰 {realm} pays {money:gold} under protest.',
      { realm: state.realms[worst].name, gold: g }));
    if (realmStanding(state, worst) <= -50) {
      FB.queueEvent(state, 'vassal_revolt', { rid:worst });
    }
  };

  FB.randomWorldNews = function (state) {    // report a random ongoing war or strong realm
    const wars = [];
    for (const id in state.realms) {
      const r = state.realms[id];
      if (r.alive && r.war && state.realms[r.war.enemy] && state.realms[r.war.enemy].alive) {
        wars.push(FB.msg('news.world.random_war',
          '⚔ {attacker} wars against {defender}.',
          { attacker: r.name, defender: state.realms[r.war.enemy].name }));
      }
    }
    if (wars.length) FB.news(state, FB.pick(wars));
    else {
      let big = null, bs = 0;
      for (const id in state.realms) {
        if (!state.realms[id].alive) continue;
        const s = FB.realmStrength(state, id);
        if (s > bs) { bs = s; big = state.realms[id]; }
      }
      if (big) FB.news(state, FB.msg('news.world.mightiest_realm',
        '👑 They say {realm} is the mightiest power of the age.', { realm: big.name }));
    }
  };
})();
