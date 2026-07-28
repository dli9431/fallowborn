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

  FB.noteFriendContact = function (state, c) {
    if (!friendEligible(state, c)) return false;
    const contacts = FB.friendContacts(state);
    const old = contacts[c.id];
    const record = old && typeof old === 'object'
      ? old : { startedTurn:state.turn };
    record.lastTurn = state.turn;
    contacts[c.id] = record;
    return true;
  };

  /* ---------- personal social attention ----------
     Regard remains the only relationship score. This life-local assignment
     merely says whose regard receives the fixed daily cultivation rate. */
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

  FB.socialAttentionAssign = function (state, c, opts) {
    opts = opts || {};
    const p = state.player;
    if (!c || c.dead || c.id === p.charId || !FB.socialAttentionCapacity()) return false;
    const attention = FB.socialAttentionEnsure(state);
    if (p.courtingId && p.courtingId !== c.id && !opts.courtship) return false;
    if (attention[c.id]) {
      attention[c.id].lastTurn = state.turn;
      FB.noteFriendContact(state, c);
      return true;
    }
    /* The shipped capacity is one: choosing a new person redirects the
       assignment immediately and costs no day. */
    for (const id in attention) delete attention[id];
    attention[c.id] = { startedTurn:state.turn, lastTurn:state.turn };
    FB.noteFriendContact(state, c);
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

  FB.socialAttentionDaysToThreshold = function (state, c) {
    const rate = FB.socialAttentionDailyOpinion();
    const need = FB.relationshipOpinionThreshold() - (c ? c.opinion : 0);
    if (need <= 0) return 0;
    if (rate <= 0) return null;
    return Math.max(0, Math.ceil(need / rate - 0.000000001));
  };

  FB.tickSocialAttention = function (state) {
    const rate = FB.socialAttentionDailyOpinion();
    if (rate === 0) return;
    const ids = FB.socialAttentionIds(state);
    for (let i = 0; i < ids.length; i++) {
      const c = state.chars[ids[i]];
      if (!c || c.dead) continue;
      if (FB.socialAttentionPresence(state, c).status !== 'active') continue;
      c.opinion = FB.clamp(c.opinion + rate, -100, 100);
      state.player.socialAttention[c.id].lastTurn = state.turn;
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

  FB.rulerGiftReady = function (state, rid) {
    return FB.rulerGiftDaysRemaining(state, rid) <= 0;
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
    const cost = 5;
    if (!c || c.dead || c.id === p.charId || p.gold < cost ||
      !FB.socialGiftReady(state, cid) ||
      (FB.giftDeliveryPending &&
        FB.giftDeliveryPending(state, 'character', cid))) return false;
    const value = FBDATA.balance.socialCashGiftOpinion;
    const boost = value === undefined ? 4 : value;
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
    c.opinion = FB.clamp(c.opinion + boost, -100, 100);
    FB.noteSocialGift(state, cid);
    FB.news(state, FB.msg('news.social.gift',
      'Your gift pleases {name}. (regard {regard})',
      { name:c.name, regard:Math.round(c.opinion) }));
    return true;
  };

  FB.friendCandidate = function (state, anyWarmContact) {
    const threshold = anyWarmContact ? 0 :
      FB.relationshipOpinionThreshold();
    const contacts = FB.friendContacts(state);
    const out = [];
    for (const id in contacts) {
      const c = state.chars[id];
      if (friendEligible(state, c) && c.opinion >= threshold) out.push(c);
    }
    out.sort(function (a, b) {
      const ad = contacts[a.id], bd = contacts[b.id];
      return b.opinion - a.opinion ||
        (bd.lastTurn || 0) - (ad.lastTurn || 0) ||
        String(a.id).localeCompare(String(b.id));
    });
    return out[0] || null;
  };

  FB.canNameFriend = function (state, c) {
    const contacts = FB.friendContacts(state);
    const threshold = FB.relationshipOpinionThreshold();
    return !!(friendEligible(state, c) && contacts[c.id] && c.opinion >= threshold &&
      state.roles.friend !== c.id);
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
    out.sort(function (a, b) { return b.opinion - a.opinion; });
    return out;
  };

  FB.attentionFriendCandidate = function (state) {
    const known = FB.socialAttentionTarget(state);
    if (!known || !friendEligible(state, known) ||
      known.opinion < FB.relationshipOpinionThreshold()) return null;
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
    if (id && state.chars[id] && !state.chars[id].dead) return state.chars[id];
    if (!create) return null;
    if (role === 'friend') {
      if (id) delete state.player.flags.sworn_friend;
      /* Lazy story resolution may see only the exact person currently
         receiving attention at the shared threshold, never a stranger. */
      return FB.attentionFriendCandidate(state);
    }
    const pr = FB.world.byId[state.player.provinceId];
    const me = state.chars[state.player.charId];
    let opts = { culture: pr.culture, religion: pr.religion, born: state.date.year - FB.ri(25, 55), role: role };
    if (role === 'lord') { opts.quality = 4; opts.sex = 'm'; opts.dyn = 'of ' + pr.name; opts.station = 3; }
    else if (role === 'priest') { opts.quality = 2; opts.sex = 'm'; opts.born = state.date.year - FB.ri(30, 60); opts.station = 1; }
    else if (role === 'rival') {
      opts.born = state.date.year - FB.clamp(FB.ageOf(me, state.date.year) + FB.ri(-8, 8), 16, 70);
      opts.opinion = -25;
      opts.station = Math.min(FB.playerStation(state), 3); // friends and rivals are peers
    }
    const c = FB.makeCharacter(state, opts);
    state.roles[role] = c.id;
    return c;
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
    return c.opinion <= rivalBalance('rivalOpinionThreshold', -40);
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
    if (p.plot && p.plot.id === 'ruin_rival') p.plot = null;
    const rivalQueues = {
      make_rival: 1, rival_mediation: 1, rival_legacy: 1,
      plot_ruin_rival: 1, assassin_caught: 1
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
        a.c.opinion - b.c.opinion ||
        b.contact.lastTurn - a.contact.lastTurn ||
        (a.c.id < b.c.id ? -1 : 1);
    });
    const pick = candidates[0];
    let mult = 1;
    const traits = pick.c.traits || [];
    for (const t of ['wrathful', 'proud', 'cruel', 'ambitious']) if (traits.indexOf(t) >= 0) mult += 0.2;
    for (const t of ['patient', 'humble', 'kind', 'content']) if (traits.indexOf(t) >= 0) mult -= 0.15;
    const hostility = 1 + Math.max(0, -pick.c.opinion - 40) / 60;
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
    for (const id in state.chars) {
      const o = state.chars[id];
      if (!o.dead && o.spouseId === c.id && (!first || o.id !== first.id)) out.push(o);
    }
    return out;
  };

  /* May the player take a(nother) spouse? Polygyny only — a man of a faith
     that permits it may hold several wives; everyone else weds one at a time. */
  FB.canWed = function (state) {
    const me = state.chars[state.player.charId];
    if (FB.papacyCelibate && FB.papacyCelibate(state, me)) return false;
    const n = FB.spousesOf(state, me).length;
    if (n === 0) return true;
    if (me.sex !== 'm') return false;
    return n < FB.marriageDoctrine(me.religion).wives;
  };

  /* The first wife has died or been set aside — the next steps up. */
  FB.promoteSpouse = function (state) {
    const me = state.chars[state.player.charId];
    if (me.spouseId && state.chars[me.spouseId] && !state.chars[me.spouseId].dead) return;
    me.spouseId = null;
    for (const id in state.chars) {
      const o = state.chars[id];
      if (!o.dead && o.spouseId === me.id) { me.spouseId = o.id; state.roles.spouse = o.id; return; }
    }
    delete state.roles.spouse;
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
    sp.opinion = FB.clamp(sp.opinion - 50, -100, 100);
    FB.noteRivalContact(state, sp, 2, 'divorce');
    FB.promoteSpouse(state);
    if (FB.invalidateSocialVisit) FB.invalidateSocialVisit(state, sp.id);
  };

  FB.clearCourtship = function (state, opts) {
    opts = opts || {};
    const p = state.player;
    const c = p.courtingId ? state.chars[p.courtingId] : null;
    if (c) FB.socialAttentionWithdraw(state, c.id, true);
    p.courtingId = null;
    delete p.flags.courting;
    if (c && !c.dead && opts.penalty) {
      c.opinion = FB.clamp(c.opinion - 20, -100, 100);
      FB.noteRivalContact(state, c, 1, 'broken_courtship');
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
    if (!FB.canCourt(state, c, true) || !FB.socialAttentionCapacity()) return false;
    if (!opts.visitDeparture && FB.socialAttentionPresence &&
        FB.socialAttentionPresence(state, c).status !== 'active') return false;
    if (p.courtingId && p.courtingId !== c.id) {
      /* Redirecting a suit carries the same slight as a deliberate breakoff. */
      FB.clearCourtship(state, { penalty:true, news:true });
    }
    p.courtingId = c.id;
    p.flags.courting = 1;
    return FB.socialAttentionAssign(state, c, { courtship:true });
  };

  FB.canPropose = function (state) {
    const p = state.player;
    const c = p.flags.courting && p.courtingId && state.chars[p.courtingId];
    return !!(c && FB.canCourt(state, c, true) &&
      c.opinion >= FB.relationshipOpinionThreshold());
  };

  /* The one true way to kill a character: severs marriage links and roles.
     A death also unmakes any betrothal, and a dowry settled at the pledge
     but not yet wed for returns to the player's coffers. */
  FB.killChar = function (state, c) {
    if (!c || c.dead) return;
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
    c.dead = true;
    c.died = state.date.year; // remembered on their sheet: born–died
    if (FB.invalidateSocialVisit) FB.invalidateSocialVisit(state, c.id);
    if (!papalClaimant && FB.royalCharDied) FB.royalCharDied(state, c);
    if (c.betrothedId && c.dowryAsk) {
      state.player.gold += c.dowryAsk;
      delete c.dowryAsk;
    }
    c.betrothedId = null;
    for (const id in state.chars) {
      if (state.chars[id].spouseId === c.id) state.chars[id].spouseId = null;
      if (state.chars[id].betrothedId === c.id) {
        const o = state.chars[id];
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
  };

  /* Can the player begin courting this character? */
  FB.canCourt = function (state, c, allowCurrent) {
    const me = state.chars[state.player.charId];
    if (!c || c.dead || c.id === me.id) return false;
    if (FB.papacyCelibate &&
        (FB.papacyCelibate(state, me) || FB.papacyCelibate(state, c))) return false;
    if (c.royalLine && FB.royalCompactOf(state)) return false;
    if (FB.royalCloseKin && FB.royalCloseKin(state, me, c)) return false;
    const y = state.date.year;
    if (FB.ageOf(me, y) < 16 || FB.ageOf(c, y) < 16) return false;
    if (c.sex === me.sex) return false;
    if (!FB.canWed(state) || FB.spouseOf(state, c)) return false;
    if (c.betrothedId) return false; // pledged to another
    // actual kin only (dynasty names like "of Ribe" are shared by strangers)
    if (FB.playerDescendantKind(state, c.id)) return false;
    if (c.childrenIds && c.childrenIds.indexOf(me.id) >= 0) return false;
    if (me.fatherId && me.fatherId === c.fatherId) return false;
    if (me.motherId && me.motherId === c.motherId) return false;
    if (c.role === 'sibling' && c.dyn === me.dyn) return false;
    // close blood — grandparents, aunts/uncles, nieces/nephews — is out; cousins are fair game
    const krel = FB.kinOf(state).byId[c.id];
    if (krel && krel !== 'Cousin') return false;
    if (state.player.profession === 'monk' && FB.religionOf(me.religion).group !== 'muslim') return false;
    if (!allowCurrent && state.player.courtingId === c.id) return false;
    // the great families do not entertain suits from far beneath them
    if (FB.stationOf(c) - FB.playerStation(state) >= 3) return false;
    return true;
  };

  /* Notable folk of a province — the local cast for the player's home,
     lazily-generated worthies elsewhere (persisted in state.provChars). */
  function lordWord(pr) {
    const g = FB.religionOf(pr.religion).group;
    return g === 'muslim' ? 'Emir' : g === 'pagan' ? 'Chief' : 'Lord';
  }
  FB.provNotables = function (state, pid) {
    const pr = FB.world.byId[pid];
    if (!pr || pr.wasteland) return [];
    if (pid === state.player.provinceId) {
      FB.getRole(state, 'lord', true);
      FB.getRole(state, 'priest', true);
      const out = [];
      for (const r of ['lord', 'priest', 'friend', 'rival']) {
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
      const lw = lordWord(pr);
      const lord = mk({ culture: pr.culture, religion: pr.religion, sex: 'm', born: y - FB.ri(28, 55), quality: 4, role: 'notable', station: 3 },
        FB.msg('fx.epithet.province_lord', {
          forms: {
            select: 'value', param: 'kind', cases: {
              emir: 'Emir of {province}',
              chief: 'Chief of {province}',
              other: 'Lord of {province}'
            }
          }
        }, {
          kind: lw === 'Emir' ? 'emir' : (lw === 'Chief' ? 'chief' : 'other'),
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
              other: 'Priest'
            }
          }
        }, { faith: FB.religionOf(pr.religion).group }));
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
  /* Seeking a match sounds out three families at once, so age never decides
     the match by itself: an established house (older, a step up — fatter
     dowry and more prestige, a harder suit, fewer childbearing years), a peer
     (same years, same station), and a young one (a step down, but fertile
     years ahead). The three persist on the player as suitorIds until one is
     chosen (FB.pickSuitor); the picker lives in ui.js. */
  const SUITOR_PROFILES = [
    { dSt: 1, age: function (a) { return a + FB.ri(0, 8); }, min: 18, max: 45 },  // established
    { dSt: 0, age: function (a) { return a + FB.ri(-5, 5); }, min: 16, max: 40 }, // peer
    { dSt: -1, age: function (a) { return a - FB.ri(8, 18); }, min: 16, max: 30 } // young
  ];
  FB.spawnSuitor = function (state) {
    const me = state.chars[state.player.charId];
    const pr = FB.world.byId[state.player.provinceId];
    const myAge = FB.ageOf(me, state.date.year);
    const ps = FB.playerStation(state);
    const y = state.date.year;
    const out = [];
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
      if (out.some(function (m) { return m.suitorProfile === i; })) continue;
      const prof = SUITOR_PROFILES[i];
      const st = FB.clamp(ps + prof.dSt, 0, 3);
      const c = FB.makeCharacter(state, {
        sex: me.sex === 'm' ? 'f' : 'm',
        culture: pr.culture, religion: me.religion,
        born: y - FB.clamp(prof.age(myAge), prof.min, prof.max),
        role: 'suitor', opinion: FB.ri(-10, 25),
        station: st, quality: st + FB.ri(0, 1)
      });
      c.suitorProfile = i;
      c.epithetMsg = FB.pick(SUITOR_EPITHETS[st][c.sex]);
      if (FB.applyMarriageBackground) FB.applyMarriageBackground(c, st, c.epithetMsg);
      out.push(c);
      state.player.suitorIds.push(c.id);
    }
    return out;
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
     pledge is sealed or the descendant weds elsewhere. */
  function managedMatchKind(state, descendant) {
    if (!descendant || descendant.dead ||
        FB.ageOf(descendant, state.date.year) < 12 ||
        FB.spousesOf(state, descendant).length || descendant.betrothedId) return null;
    return FB.playerDescendantKind(state, descendant.id);
  }

  FB.spawnMatchCandidates = function (state, child) {
    const out = [];
    if (!managedMatchKind(state, child)) {
      if (child && FB.discardMatches) FB.discardMatches(state, child, null);
      return out;
    }
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
      if (child.sex === 'f') m.dowryAsk = sum; else m.dowryDue = sum;
      out.push(m);
      child.matchIds.push(m.id);
    }
    return out;
  };

  /* the families not chosen are told no and forgotten */
  FB.discardMatches = function (state, child, keptId) {
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
      }
    }
  };

  FB.sealKinMatch = function (state, child, cand) {
    const kind = managedMatchKind(state, child);
    const listed = child && child.matchIds &&
      child.matchIds.indexOf(cand && cand.id) >= 0;
    const prestigeNeed = cand ?
      Math.max(0, FB.stationOf(cand) - FB.playerStation(state)) * 20 : 0;
    if (!kind || !listed || !cand || cand.dead || cand.role !== 'match' ||
        FB.spousesOf(state, cand).length || cand.betrothedId ||
        cand.sex === child.sex || state.player.courtingId === cand.id ||
        state.player.gold < (cand.dowryAsk || 0) ||
        state.player.prestige < prestigeNeed) return false;
    const p = state.player;
    FB.discardMatches(state, child, cand.id);
    child.betrothedId = cand.id;
    cand.betrothedId = child.id;
    cand.role = 'kinspouse';
    if (cand.dowryAsk) {
      p.gold = Math.max(0, p.gold - cand.dowryAsk);
      FB.news(state, FB.msg('news.event.match_dowry_paid',
        '💰 You settle a dowry of {money:gold} on the match.', { gold: cand.dowryAsk }));
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
        FB.spousesOf(state, sp).length) return false;
    const B = FBDATA.balance, p = state.player;
    const descendantKind = FB.playerDescendantKind(state, k.id);
    /* A descendant establishing another household leaves work and equipment
       assignments behind. The current head's own pledged wedding is exempt. */
    if (k.id !== p.charId && FB.unassignEnterpriseWorker) {
      FB.unassignEnterpriseWorker(state, k.id);
    }
    if (k.id !== p.charId && FB.clearLoadout) FB.clearLoadout(state, k.id);
    k.betrothedId = null; sp.betrothedId = null;
    k.spouseId = sp.id; sp.spouseId = k.id;
    sp.role = 'kinspouse';
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
    if (sp.dowryDue) {
      p.gold += sp.dowryDue;
      FB.news(state, FB.msg('news.event.bride_dowry',
        '💰 The bride brings a dowry of {money:gold} to the house.', { gold: sp.dowryDue }));
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
    const group = FB.religionOf(religionId).group;
    if (kind === 'holy') {
      return neutralParam('fx.param.holy.' +
        (group === 'muslim' ? 'imam' : group === 'pagan' ? 'godi' :
          group === 'jewish' ? 'rabbi' : 'priest'));
    }
    if (kind === 'god') {
      return neutralParam('fx.param.god.' +
        (group === 'muslim' ? 'allah' : group === 'pagan' ? 'gods' :
          group === 'jewish' ? 'lord' : 'god'));
    }
    return neutralParam('fx.param.temple.' +
      (group === 'muslim' ? 'mosque' : group === 'pagan' ? 'grove' :
        group === 'jewish' ? 'synagogue' : 'church'));
  }
  FB.textParams = function (state, viewer, source, ctx, semantic) {
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
      switch (k) {
        case 'name': out[k] = me.name; break;
        case 'dyn': out[k] = me.dyn || ''; break;
        case 'title':
          out[k] = semantic ? { $title: FB.titleSnapshot(state) } : FB.titleFor(state);
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
        case 'liege': {
          const liege = state.player.liege ? state.realms[state.player.liege] : null;
          out[k] = liege ? liege.name :
            (semantic ? neutralParam('fx.param.your_liege') : FB.T('your liege'));
          break;
        }
        case 'rname': {
          const namedRealm = ctx && ctx.rid ? state.realms[ctx.rid] : null;
          out[k] = namedRealm ? namedRealm.name :
            (semantic ? neutralParam('fx.param.the_realm') : FB.T('the realm'));
          break;
        }
        case 'rulername': {
          const ruled = ctx && ctx.rid ? state.realms[ctx.rid] : null;
          out[k] = ruled && ruled.ruler ? ruled.ruler.name :
            (semantic ? neutralParam('fx.param.the_lord') : FB.T('the lord'));
          break;
        }
        case 'cname': {
          const county = ctx && ctx.pid ? FB.world.byId[ctx.pid] : null;
          out[k] = county ? county.name :
            (semantic ? neutralParam('fx.param.the_county') : FB.T('the county'));
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
    const group = FB.religionOf(me.religion).group;
    return value[group] !== undefined ? value[group] : value.default;
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

  FB.warStateText = function (state) {
    const war = state.player.war;
    if (!war) return '';
    const host = FB.playerHost ? FB.playerHost(state) : null;
    const men = host ? host.men :
      Math.round(Math.max(FBDATA.balance.armyMinMen || 40, FB.playerLevy(state)) * (war.strength || 1) +
        (war.mercCos || 0) * (FBDATA.balance.mercCompanySize || 150));
    const clauses = [
      FB.renderKey('fx.warstate.host',
        { text: 'Your host: ~{men} men at {condition}% condition' },
        { men: men, condition: Math.round((war.strength || 1) * 100) })
    ];
    // what the host is made of: the levy mass, the bowmen, the hard core
    if (host && host.units) {
      const u = host.units;
      const compKeys = [
        ['levy', 'fx.warstate.comp_levy', { one: '{count} levyman', other: '{count} levy' }],
        ['arch', 'fx.warstate.comp_archers', { one: '{count} archer', other: '{count} archers' }],
        ['cav', 'fx.warstate.comp_cavalry', { one: '{count} cavalryman', other: '{count} cavalry' }],
        ['ret', 'fx.warstate.comp_retinue', { one: '{count} man-at-arms', other: '{count} men-at-arms' }]
      ];
      const parts = [];
      for (const ck of compKeys) {
        if (!u[ck[0]]) continue;
        parts.push(FB.renderKey(ck[1], {
          forms: { select: 'plural', param: 'count', cases: ck[2] }
        }, { count: u[ck[0]] }));
      }
      if (parts.length) clauses.push(parts.join(', '));
    }
    if (war.mercCos) {
      clauses.push(FB.renderKey('fx.warstate.mercenaries', {
        forms: {
          select: 'plural', param: 'count', cases: {
            one: '{count} mercenary company',
            other: '{count} mercenary companies'
          }
        }
      }, { count: war.mercCos }));
    }
    if (host && FB.playerHostUpkeepParts) {
      clauses.push(FB.renderKey('fx.warstate.logistics',
        { text: 'Seasonal host logistics: {money:amount}' },
        { amount: Math.round(FB.playerHostUpkeepParts(state).total * 10) / 10 }));
    }
    clauses.push(host
      ? FB.renderKey('fx.warstate.in_field', { text: 'In the field at {place}' },
        { place: FB.world.byId[host.at] ? FB.world.byId[host.at].name : '?' })
      : FB.renderKey('fx.warstate.not_mustered', { text: 'Not yet mustered' }, {}));
    const enemyHost = FB.hostOf ? FB.hostOf(state, war.enemy) : null;
    if (enemyHost) {
      clauses.push(FB.renderKey('fx.warstate.enemy_host',
        { text: 'Their host: ~{men} men at {place}' }, {
          men: enemyHost.men,
          place: FB.world.byId[enemyHost.at] ? FB.world.byId[enemyHost.at].name : '?'
        }));
    }
    if (!war.defending && war.target && FB.world.byId[war.target]) {
      clauses.push(FB.renderKey('fx.warstate.siege',
        { text: 'Siege of {place}: {progress}/3' },
        { place: FB.world.byId[war.target].name, progress: war.siege || 0 }));
    }
    if (war.defending) {
      clauses.push(FB.renderKey('fx.warstate.advance',
        { text: 'Enemy advance: {progress}/3' }, { progress: war.enemySiege || 0 }));
    }
    return clauses.join(' · ');
  };

  FB.fmt = function (state, source, ctx) {
    return FB.formatSource(state, state.player.charId, source, ctx);
  };

  /* ---------- named chance formulas ---------- */
  FB.namedChance = function (state, key) {
    const p = state.player;
    const me = state.chars[p.charId];
    const f = p.flags;
    switch (key) {
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
        const s = FB.getRole(state, 'suitor');
        let c = 0.3 + (s ? s.opinion : 0) / 180 + p.prestige / 600 + p.tier * 0.05;
        const gap = s ? FB.stationOf(s) - FB.playerStation(state) : 0;
        if (gap > 0) c -= gap * FBDATA.balance.proposalStationPenalty; // marrying up is hard
        else c += Math.min(0.1, -gap * 0.05); // marrying down is easy
        if (me.traits.indexOf('comely') >= 0) c += 0.08;
        if (me.traits.indexOf('homely') >= 0) c -= 0.08;
        if (s && s.religion === 'catholic' &&
            FB.playerExcommunicated && FB.playerExcommunicated(state)) {
          c -= 0.2;
        }
        if (s && s.royalLine) {
          c += FB.realmOpinionOf(state, s.royalLine.realmId) / 400;
          return FB.clamp(c, 0.05, 0.9);
        }
        return FB.clamp(c, 0.05, 0.95);
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
        if (rival) c += rival.opinion / 200;
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
        if (lord) c += lord.opinion / 500;
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
          const units = {
            levy:comp.levy, arch:comp.arch, cav:comp.cav || 0, ret:comp.ret,
            mercs:(w.mercCos || 0) * cs
          };
          let men = units.levy + units.arch + units.cav + units.ret + units.mercs;
          const fl = bal.armyMinMen || 40;
          if (men < fl) { units.levy += fl - men; men = fl; }
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
        c += 0.08 * (w.harried || 0) + (w.rested ? 0.05 : 0);  // council preparations
        c += (w.mass ? 0.05 : 0);                              // the great levy
        /* walls guard where they stand: the defensive war record has no target
           county and the council's pitched battle no field province, so the
           bonus reads the walls of the HOME county — the seat the host musters
           at and the defense rallies around */
        if (w.defending && FB.hasBuildingIn(state, FB.homeProv(state), 'walls')) c += 0.08;
        c += FB.techBonus(state, 'battle') + FB.holdingBonus(state, 'battle') + FB.itemBonus(state, 'battle');
        if (f.blessed_war) c += 0.06;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'liege_grant': {
        // no land adjoining the player's to give → the suit fails outright
        if (p.tier >= 4 && !FB.liegeGrantCandidates(state).length) return 0;
        return FB.liegeGrantChance(state,
          FB.clamp(0.05 + (p.liegeOp || 0) / 450 + p.prestige / 1800, 0.02, 0.35));
      }
      case 'county_petition': {
        // stripping a disgraced vassal for the player's sake: the liege's love
        // for the player, his name, and his war service against the victim's
        // own (poor) standing (p.petitionPid set by the picker)
        const hp = p.petitionPid ? state.holder[p.petitionPid] : null;
        const hr = hp ? state.realms[hp] : null;
        if (!hr || !hr.alive) return 0;
        const fav = hr.favor || 0;
        return FB.liegeGrantChance(state,
          FB.clamp(0.35 + FB.liegeOpOf(state, p.liege) / 300 + p.prestige / 1500 +
            (p.warService || 0) / 80 - fav / 150, 0.1, 0.85));
      }
      case 'appeal_outcome': {
        // a suit carried over the liege's head: charm, cunning, and how the
        // high lord already feels about you (p.appealRid set by the picker)
        const rid = p.appealRid;
        let c = FBDATA.balance.appealBase + FB.skillOf(me, 'dip') * 0.025 + FB.skillOf(me, 'int') * 0.025;
        if (rid) c += FB.liegeOpOf(state, rid) / 200;
        return FB.clamp(c, 0.05, 0.9);
      }
      case 'vassal_comply': {
        // a vassal asked to surrender his fief (p.revokeRid set by the picker)
        const rid2 = p.revokeRid;
        let c2 = 0.35 + FB.skillOf(me, 'dip') * 0.025 + p.prestige / 800;
        if (rid2) c2 += FB.liegeOpOf(state, rid2) / 150;
        return FB.clamp(c2, 0.05, 0.95);
      }
      case 'parliament_vote': {
        // a motion before the estates: rank, diplomacy, name, and the liege's love
        return FB.parliamentVoteChance ? FB.parliamentVoteChance(state) : 0.5;
      }
      case 'plot': {
        let c = 0.30 + FB.skillOf(me, 'int') * 0.04;
        c += FB.councilBonus ? FB.councilBonus(state, 'plot') : 0; // the Chamberlain's quiet machinery
        // a trusting victim is easier to ensnare — when the plot in motion has
        // a personal target, their opinion of the player counts too
        const trole = p.plot && (p.plot.id === 'ruin_rival' ? 'rival' : p.plot.id === 'widow_veil' ? 'spouse' : null);
        const tgt = trole ? FB.getRole(state, trole) : null;
        if (tgt) c += tgt.opinion / 500;
        return FB.clamp(c, 0.15, 0.9);
      }
      default: return 0.5;
    }
  };

  /* ---------- trigger evaluation ---------- */
  FB.checkTrigger = function (state, tg, ctx) {
    if (!tg) return true;
    if (tg.never) return false;
    const p = state.player;
    const me = state.chars[p.charId];
    const age = FB.ageOf(me, state.date.year);
    const pr = FB.world.byId[p.provinceId];

    if (tg.tierMin !== undefined && p.tier < tg.tierMin) return false;
    if (tg.tierMax !== undefined && p.tier > tg.tierMax) return false;
    if (tg.societalRoles && tg.societalRoles.indexOf(FB.societalRole(state)) < 0) return false;
    /* Profession requirements describe personally practicing a vocation.
       Landed careers survive as biography, but no longer satisfy work gates. */
    if (tg.professions && (p.tier >= 3 ||
      tg.professions.indexOf(p.profession) < 0)) return false;
    if (tg.minAge !== undefined && age < tg.minAge) return false;
    if (tg.maxAge !== undefined && age > tg.maxAge) return false;
    if (tg.sex && me.sex !== tg.sex) return false;
    if (tg.seasons && tg.seasons.indexOf(state.date.season) < 0) return false;
    if (tg.yearMin !== undefined && state.date.year < tg.yearMin) return false;
    if (tg.yearMax !== undefined && state.date.year > tg.yearMax) return false;
    if (tg.married !== undefined) {
      const married = !!FB.spouseOf(state, me);
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
    if (tg.leaMin !== undefined && FB.skillOf(me, 'lea') < tg.leaMin) return false;
    if (tg.flags) for (const fl of tg.flags) if (!p.flags[fl]) return false;
    if (tg.notFlags) for (const fl of tg.notFlags) if (p.flags[fl]) return false;
    if (tg.buildings) for (const b of tg.buildings) if (!FB.hasBuilding(state, b)) return false;
    if (tg.notBuildings) for (const b of tg.notBuildings) if (FB.hasBuilding(state, b)) return false;
    if (tg.hasModifier !== undefined) {
      const spec = typeof tg.hasModifier === 'string'
        ? { id:tg.hasModifier } : tg.hasModifier;
      if (!spec || typeof spec.id !== 'string') return false;
      const def = FBDATA.modifiers && FBDATA.modifiers[spec.id];
      const pid = spec.pid || (ctx && ctx.locationId) || p.provinceId;
      if (!def || !FB.hasModifier ||
          !FB.hasModifier(state, spec.id, def.scope === 'county' ? pid : null)) return false;
    }
    if (tg.techs) for (const t of tg.techs) if (FB.techList(state).indexOf(t) < 0) return false;
    if (tg.notTechs) for (const t of tg.notTechs) if (FB.techList(state).indexOf(t) >= 0) return false;
    if (tg.holdings) for (const hd of tg.holdings) if (!FB.hasHouseholdAsset(state, hd)) return false;
    if (tg.notHoldings) for (const hd of tg.notHoldings) if (FB.hasHouseholdAsset(state, hd)) return false;
    if (tg.religionGroup && FB.religionOf(me.religion).group !== tg.religionGroup) return false;
    if (tg.religionGroups && tg.religionGroups.indexOf(FB.religionOf(me.religion).group) < 0) return false;
    if (tg.provinceReligionGroup && (!pr || FB.religionOf(pr.religion).group !== tg.provinceReligionGroup)) return false;
    if (tg.cultures && tg.cultures.indexOf(me.culture) < 0) return false;
    if (tg.provinceCultures && (!pr || tg.provinceCultures.indexOf(pr.culture) < 0)) return false;
    if (tg.terrains && (!pr || tg.terrains.indexOf(pr.terrain) < 0)) return false;
    if (tg.coastal && (!pr || !pr.coastal)) return false;
    if (tg.atWar !== undefined && (!!p.war) !== tg.atWar) return false;
    if (tg.realmAtWar !== undefined) {
      const rid = state.owner[p.provinceId];
      const at = rid ? FB.isRealmAtWar(state, rid) : false;
      if (at !== tg.realmAtWar) return false;
    }
    if (tg.isVassal !== undefined && (!!p.liege) !== tg.isVassal) return false;
    if (tg.isLiege !== undefined && (FB.playerVassals(state).length > 0) !== tg.isLiege) return false;
    if (tg.liegeAtWar !== undefined) {
      const at = p.liege ? FB.isRealmAtWar(state, p.liege) : false;
      if (at !== tg.liegeAtWar) return false;
    }
    if (tg.hasRole && !FB.getRole(state, tg.hasRole, false)) return false;
    if (tg.noRole && FB.getRole(state, tg.noRole, false)) return false;
    if (tg.roleOpinionAbove) {
      const c = FB.getRole(state, tg.roleOpinionAbove.role, false);
      if (!c || c.opinion < tg.roleOpinionAbove.value) return false;
    }
    if (tg.roleOpinionBelow) {
      const c = FB.getRole(state, tg.roleOpinionBelow.role, false);
      if (!c || c.opinion > tg.roleOpinionBelow.value) return false;
    }
    if (tg.rivalHeatMin !== undefined && FB.rivalHeat(state) < tg.rivalHeatMin) return false;
    if (tg.rivalHeatMax !== undefined && FB.rivalHeat(state) > tg.rivalHeatMax) return false;
    const popularOpinion = FB.popEffective ? FB.popEffective(state) : p.pop;
    if (tg.popularOpinionBelow !== undefined && popularOpinion > tg.popularOpinionBelow) return false;
    if (tg.custom && FB.fns[tg.custom] && !FB.fns[tg.custom](state)) return false;
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
     New games record the generation that first reaches gentry; an heir must
     inherit that standing before the house may petition for a barony. Saves
     from before this field existed are treated as already established. */
  FB.gentryEstablished = function (state) {
    const p = state.player;
    if (!p || p.tier < 2) return false;
    if (p.gentryGeneration === undefined) return true;
    return p.gentryGeneration !== null && p.gentryGeneration < state.generation;
  };
  FB.markGentryRise = function (state) {
    const p = state.player;
    if (p.gentryGeneration === undefined || p.gentryGeneration === null) {
      p.gentryGeneration = state.generation;
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
    if (out.locationId === undefined) {
      const location = FB.travelLocation ? FB.travelLocation(state) : null;
      out.locationId = location && location.id ? location.id : state.player.provinceId;
    }
    return out;
  };

  FB.queueEvent = function (state, id, ctx, extra) {
    const item = { id:id, ctx:FB.eventContext(state, ctx) };
    extra = extra || {};
    for (const key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) item[key] = extra[key];
    }
    state.eventQueue = state.eventQueue || [];
    state.eventQueue.push(item);
    return item;
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

  /* All runtime title changes pass here so role-gated work and travel cannot
     linger for a day after promotion or demotion. Callers still own realm
     transfers, announcements, and title-specific rewards. */
  FB.setPlayerTier = function (state, tier, opts) {
    opts = opts || {};
    const p = state.player;
    const oldTier = p.tier;
    tier = FB.clamp(Math.floor(tier), 0, 7);
    if (tier === oldTier) return false;
    const oldRole = FB.societalRole(oldTier);
    const newRole = FB.societalRole(tier);
    p.tier = tier;
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
      for (const enterprise of (p.enterprises || [])) {
        if (enterprise.workerId !== p.charId) continue;
        enterprise.workerId = null;
        if (enterprise.workerLocked !== undefined) delete enterprise.workerLocked;
      }
    } else if (oldTier >= 3 && tier < 3) {
      p.stationFarewell = null;
      state.eventQueue = (state.eventQueue || []).filter(function (item) {
        return item.id !== 'station_farewell';
      });
    }

    if (tier >= 3 && !p.liege && opts.attachLiege !== false) {
      const rid = (state.holder && state.holder[p.provinceId]) || state.owner[p.provinceId];
      if (rid && rid !== 'player') p.liege = rid;
    }
    if (FB.syncPlayerCareer) FB.syncPlayerCareer(state);
    if (FB.travelValidate) FB.travelValidate(state);
    if (FB.validateFocus) FB.validateFocus(state);
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    return true;
  };
  FB.fns.barony_offer_eligible = function (state) {
    const B = FBDATA.balance;
    const lord = FB.getRole(state, 'lord', true);
    return FB.gentryEstablished(state) &&
      state.player.prestige >= B.baronyPrestige &&
      !!lord && lord.opinion >= B.baronyOpinion;
  };

  /* ---------- daily event selection ----------
     Queued events fire at once. Random events land on 1-2 pre-rolled "slot
     days" per season (scheduled in main.js), keeping the old seasonal pacing
     while days tick by. Event cooldowns in data are in seasons (90 days). */
  FB.pickDailyEvents = function (state) {
    const out = [];
    FB.queueStationFarewellIfReady(state);
    while (state.eventQueue.length && out.length < 3) {
      const qev = state.eventQueue.shift();
      qev.ctx = FB.eventContext(state, qev.ctx);
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
    if (!isSlot || out.length >= 2) return out;
    /* The road supplies its own paced encounters. Queued home events that
       already existed still resolve above, but no new home slot event is
       selected while the traveler is away. */
    if (state.player.travel) return out;

    // personally at war: only wartime-tagged events fire; the rest of life waits
    const wartime = FB.atWarPersonally(state);
    // a child leads a child's life: only childhood-tagged events fire before 16
    const child = FB.ageOf(state.chars[state.player.charId], state.date.year) < 16;
    const eligible = [];
    for (const ev of FBDATA.events) {
      if (!ev.trigger || ev.trigger.never) continue;
      if (wartime && !ev.wartime) continue;
      if (child && !ev.childhood) continue;
      if (ev.once && state.player.fired[ev.id]) continue;
      if (ev.cooldown && state.player.cooldowns[ev.id] !== undefined &&
        state.turn - state.player.cooldowns[ev.id] < ev.cooldown * 90) continue;
      if (!FB.checkTrigger(state, ev.trigger)) continue;
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
      const ctx = FB.eventContext(state, {});
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

  /* id → event index, built on first use — mods merge into FBDATA.events at
     boot (storing one reloads the page), before any event resolves */
  let eventIndex = null;
  FB.eventById = function (id) {
    if (!eventIndex) {
      eventIndex = {};
      for (const ev of FBDATA.events) eventIndex[ev.id] = ev;
    }
    return eventIndex[id] || null;
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
    const group = FB.religionOf(me.religion).group;
    const source = typeof info.source === 'string' ? info.source :
      (info.source[group] !== undefined ? info.source[group] : info.source.default);
    const branch = typeof info.source === 'string' ? 'default' :
      (info.source[group] !== undefined ? group : 'default');
    materializeTextRoles(state, source, ctx);
    return FB.message(info.key + '.' + branch,
      FB.textParams(state, state.player.charId, source, ctx, true));
  };

  FB.markFired = function (state, ev) {
    if (ev.once) state.player.fired[ev.id] = 1;
    if (ev.cooldown) state.player.cooldowns[ev.id] = state.turn;
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
    if (!fx) return;
    const sourceFx = fx;
    if (FB.scaleEventEffects) fx = FB.scaleEventEffects(state, fx, ctx, ev);
    const p = state.player;
    const me = state.chars[p.charId];
    /* Freeze semantic context before a custom outcome can end a war, move
       the household, or otherwise erase the identifiers behind the blow.
       It is committed below only when this resolution actually kills. */
    const lethalProvenance = fx.deathProvenance
      ? deathProvenance(state, fx.deathProvenance, ctx, ev) : null;
    ctx = ctx || {};

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
      p.gold = Math.max(0, p.gold + g);
    }
    if (fx.pricePressure && FB.addPricePressure) {
      FB.addPricePressure(state, fx.pricePressure, fx.pricePressureYears || 1,
        fx.pricePressureSource || 'event');
    }
    if (fx.prestige) p.prestige = Math.max(0, p.prestige + fx.prestige);
    if (fx.piety) p.piety = Math.max(0, p.piety + fx.piety);
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
      if (c) c.opinion = FB.clamp(c.opinion + amt, -100, 100);
    }
    if (fx.rivalContact) {
      const rc = fx.rivalContact;
      const c = FB.getRole(state, rc.role, false);
      if (c) FB.noteRivalContact(state, c, rc.score || 1, rc.cause || 'conflict');
    }
    if (fx.rivalHeat) FB.changeRivalHeat(state, fx.rivalHeat);
    if (fx.endRivalry) FB.endRivalry(state);
    if (fx.opinionLiege) p.liegeOp = FB.clamp((p.liegeOp || 0) + fx.opinionLiege, -100, 100);
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
      state.dev[pid] = FB.clamp((state.dev[pid] || 1) + fx.devUp, 1, FB.devCap(state, pid));
    }
    if (fx.research) FB.addResearch(state, fx.research);
    if (fx.addModifier && FB.addModifier) {
      const spec = typeof fx.addModifier === 'string'
        ? { id:fx.addModifier } : fx.addModifier;
      if (spec && typeof spec.id === 'string') {
        const def = FBDATA.modifiers && FBDATA.modifiers[spec.id];
        const pid = spec.pid || ctx.locationId || p.provinceId;
        FB.addModifier(state, spec.id, def && def.scope === 'county' ? pid : null);
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
    if (fx.marry) FB.doMarry(state);
    if (fx.clearSuitor) FB.clearCourtship(state);
    if (fx.adoptChild) {
      const baby = FB.makeCharacter(state, {
        culture: me.culture, religion: me.religion, born: state.date.year,
        traitsN: 0, fatherId: null, motherId: null, dyn: me.dyn
      });
      me.childrenIds.push(baby.id);
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
    if (fx.custom && FB.fns[fx.custom]) FB.fns[fx.custom](state, ctx);
    if (FB.travelValidate) FB.travelValidate(state);
    /* Lethal effects may freeze where and against whom the blow fell. The
       marker is short-lived unless this exact resolution proves mortal. */
    if (me.health <= 0 && lethalProvenance) {
      p.pendingDeathProvenance = lethalProvenance;
    } else if (me.health > 0) {
      delete p.pendingDeathProvenance;
    }

    if (FB.ui && FB.ui.refresh) FB.ui.refresh();
  };

  FB.doMarry = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    const s = state.chars[p.courtingId];
    if (!s) return;
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
    s.spouseId = me.id;
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
    /* An object given during courtship was external character property.
       Once its owner enters the household, move that exact object into the
       shared armory so the household ownership invariant continues to hold. */
    const reigningSpouse = FB.isReigningRealmRuler &&
      FB.isReigningRealmRuler(state, s);
    if (!reigningSpouse && FB.reclaimCharacterItems) {
      FB.reclaimCharacterItems(state, s.id);
    }
    if (!reigningSpouse && FB.receiveMarriageLivelihood) {
      FB.receiveMarriageLivelihood(state, s);
    }
    s.role = 'spouse';
    // a spouse cannot stay your lord, priest, friend, or rival — those seats
    // empty and are lazily refilled where the game next needs them
    if (state.roles.friend === s.id && FB.clearFriendship) {
      FB.clearFriendship(state, false);
    }
    if (state.player.friendContacts) delete state.player.friendContacts[s.id];
    for (const r in state.roles) {
      if (r !== 'spouse' && state.roles[r] === s.id) delete state.roles[r];
    }
    s.opinion = FB.clamp(s.opinion + 30, -100, 100);
    p.courtingId = null;
    delete p.flags.courting;
    p.marriedAt = state.turn;
    if (s.royalLine) {
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
    const dowry = Math.round((B.dowryByStation[FB.stationOf(s)] || 0) * FB.rf(0.7, 1.3));
    if (dowry > 0) {
      p.gold += dowry;
      FB.news(state, FB.msg('news.event.marriage_dowry',
        '💰 The kin of {name} settle a dowry of {money:gold} on the match.',
        { name: s.name, gold: dowry }));
    }
    if (gap > 0) {
      p.prestige += gap * B.marryUpPrestige;
      FB.news(state, FB.msg('news.event.married_above',
        '👑 You have wed above your station — your name rises with the match.', {}));
    } else if (gap < 0) {
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
  };

  /* custom trigger fns for the station-marriage events (events_common.js).
     The wed_* pair only fires for spouses that carry an explicit station —
     spouses from older saves stay silent rather than guessing. */
  FB.fns = FB.fns || {};
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
      c.opinion = FB.clamp(c.opinion + 15, -100, 100);
      ctx.contact = FB.fullName(c);
      ctx.regard = Math.round(c.opinion);
    }
    FB.news(state, FB.msg('news.education.academy_introduction', {
      forms: {
        select:'value', param:'result', cases:{
          new:'🤝 Through {student}’s academy patron, you meet {contact}. The new connection begins at {regard} regard.',
          existing:'🤝 {student}’s academy patron renews your connection with {contact}, now at {regard} regard.',
          other:'🤝 The promised academy introduction finds no noble contact still able to receive it.'
        }
      }
    }, {
      result:result, student:student.name,
      contact:c ? FB.fullName(c) : '', regard:c ? Math.round(c.opinion) : 0
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
    return true;
  };

  /* the church grants the annulment plea (annulment_plea event) */
  FB.fns.annul_granted = function (state) {
    const me = state.chars[state.player.charId];
    const sp = FB.spouseOf(state, me);
    if (!sp) return;
    FB.doDivorce(state, sp.id);
    FB.news(state, FB.msg('news.event.annulment', {
      forms: {
        select: 'value', param: 'faith', cases: {
          muslim: '⛪ The marriage to {name} is declared void — before Allah, it never was.',
          pagan: '⛪ The marriage to {name} is declared void — before the gods, it never was.',
          jewish: '⛪ The marriage to {name} is declared void — before the Lord, it never was.',
          other: '⛪ The marriage to {name} is declared void — before God, it never was.'
        }
      }
    }, { faith: FB.religionOf(me.religion).group, name: sp.name }));
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
      // local cast stays behind
      for (const r of ['lord', 'priest', 'friend', 'rival']) delete state.roles[r];
      const rid = (state.holder && state.holder[dest]) || state.owner[dest];
      p.liege = p.tier >= 3 && rid && rid !== 'player' ? rid : null;
      if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
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
    p.liege = null;
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
      FB.queueEvent(state, 'war_defense_muster', {});
    }
    FB.checkTierPromotions(state);
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    return true;
  };

  /* counties the liege could hand the player: adjacent to the player's lands,
     held directly by the liege, not already the player's */
  FB.liegeGrantCandidates = function (state) {
    const p = state.player, cands = [];
    if (!p.liege || !p.provs) return cands;
    for (const pid of p.provs) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (state.holder[nb] === p.liege && p.provs.indexOf(nb) < 0 && !FB.world.byId[nb].wasteland) cands.push(nb);
      }
    }
    return cands;
  };

  FB.grantByLiege = function (state) {
    const p = state.player;
    if (p.tier === 3) {
      // raised to count of the home county. A count cannot make a peer of
      // himself: the granter yields the county and the player answers from
      // now on to the granter's OWN liege (the duke), never to a fellow count.
      p.provs = p.provs || [];
      if (p.provs.indexOf(p.provinceId) < 0) p.provs.push(p.provinceId);
      if (state.holder) state.holder[p.provinceId] = 'player';
      FB.setPlayerTier(state, 4);
      FB.recordLiegeGrant(state);
      const old = p.liege && state.realms[p.liege];
      if (old) {
        // favor earned with the old lord stays on his name; the new liege
        // keeps whatever opinion the player had already built with him
        if (p.liegeOp) {
          p.liegeOps = p.liegeOps || {};
          p.liegeOps[old.id] = FB.clamp((p.liegeOps[old.id] || 0) + p.liegeOp, -100, 100);
        }
        p.liege = old.liege || null;
        p.liegeOp = (p.liege && p.liegeOps && p.liegeOps[p.liege]) || 0;
        if (p.liege && p.liegeOps) delete p.liegeOps[p.liege];
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
      }
    } else if (p.tier >= 4 && p.liege) {
      const cands = FB.liegeGrantCandidates(state);
      if (cands.length) {
        const got = FB.pick(cands);
        p.provs.push(got);
        state.holder[got] = 'player';
        FB.recordLiegeGrant(state);
        FB.invalidateRealmCache();
        FB.news(state, FB.msg('news.event.liege_grants_county',
          '🏰 The liege grants you {province}.', { province: FB.world.byId[got].name }));
      }
      FB.checkTierPromotions(state);
    }
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
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
    p.liege = rid;
    if (state.realms.player && state.realms.player.alive) state.realms.player.liege = rid;
    FB.adjustLiegeOp(state, rid, 15);
    FB.adjustLiegeOp(state, old, -25);
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
    if (rid) FB.adjustLiegeOp(state, rid, -5);
    if (p.liege) FB.adjustLiegeOp(state, p.liege, -15);
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
    FB.queueEvent(state, 'war_muster', {});
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };
  /* a vassal yields his fief peacefully */
  FB.fns.vassal_reclaim = function (state, ctx) {
    const p = state.player;
    const rid = p.revokeRid || (ctx && ctx.rid);
    p.revokeRid = null;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    for (const pid of FB.realmHeldCounties(state, rid)) {
      state.holder[pid] = 'player';
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
    }
    if (FB.mergeRealmTech) FB.mergeRealmTech(state, 'player', rid);
    FB.markRealmDead(state, rid);
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
    FB.adjustLiegeOp(state, rid, -20);
    FB.fns.vassal_crush(state, { rid: rid });
  };
  /* small vassal-opinion nudges for the flavor events */
  FB.fns.vassal_favor = function (state) {
    const vs = FB.playerVassals(state);
    if (vs.length) FB.adjustLiegeOp(state, FB.pick(vs), 20);
  };
  FB.fns.vassal_snub = function (state) {
    const vs = FB.playerVassals(state);
    if (vs.length) FB.adjustLiegeOp(state, FB.pick(vs), -10);
  };
  /* insist on the refused taxes: the surliest vassal pays up and hates it */
  FB.fns.vassal_insist = function (state) {
    const vs = FB.playerVassals(state);
    if (!vs.length) return;
    let worst = vs[0];
    for (const v of vs) if (FB.liegeOpOf(state, v) < FB.liegeOpOf(state, worst)) worst = v;
    let g = 0;
    for (const pid of FB.realmHeldCounties(state, worst)) g += Math.ceil((state.dev[pid] || 1) * FBDATA.balance.vassalTaxRate * 2);
    state.player.gold += g;
    FB.adjustLiegeOp(state, worst, -20);
    FB.news(state, FB.msg('news.event.vassal_tax_paid',
      '💰 {realm} pays {money:gold} under protest.',
      { realm: state.realms[worst].name, gold: g }));
    if (FB.liegeOpOf(state, worst) <= -50) {
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
