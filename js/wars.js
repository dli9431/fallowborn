/* Fallowborn — independent ordinary campaigns and the sovereign peace. */
(function () {
  'use strict';
  const contexts = [];
  const launches = new WeakMap();
  const initialized = new WeakSet();
  const bindingRevisions = new WeakMap();
  // Derived only: registry mutations invalidate immediately, even within a tick.
  // Raw save/mod repairs enter through repairWars; replacing the table also heals.
  const warIndexes = new WeakMap();
  function invalidateWars(state) { warIndexes.delete(state); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function context(state) {
    for (let i = contexts.length - 1; i >= 0; i--) {
      if (contexts[i].state === state) return contexts[i];
    }
    return null;
  }
  function warIndex(state) {
    let index = warIndexes.get(state);
    if (index && index.table === state.wars) return index;
    const active = Object.keys(state.wars || {}).map(function (id) {
      return state.wars[id];
    }).filter(function (w) { return w && w.status === 'active'; }).sort(function (a, b) {
      return (a.startedTurn || 0) - (b.startedTurn || 0) ||
        (Number(String(a.id).slice(4)) || 0) - (Number(String(b.id).slice(4)) || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    index = { table:state.wars, active:active, realms:Object.create(null),
      owners:Object.create(null), order:Object.create(null), revision:-1 };
    active.forEach(function (w, i) {
      index.order[w.id] = i;
      for (const rid of [w.attacker, w.defender]) {
        (index.realms[rid] || (index.realms[rid] = [])).push(w);
      }
      if (!index.owners[w.legacyOwner]) index.owners[w.legacyOwner] = w;
    });
    warIndexes.set(state, index);
    return index;
  }
  function rows(state) { return warIndex(state).active; }
  // Return fresh arrays so query callers cannot mutate the retained indexes.
  FB.ordinaryWars = function (state) { return rows(state).slice(); };
  function endpoint(w, rid) { return w.attacker === rid || w.defender === rid; }
  function current(state, rid) {
    const c = context(state);
    if (c) {
      const w = state.wars && state.wars[c.id];
      return w && w.status === 'active' && endpoint(w, rid) ? w : null;
    }
    const index = warIndex(state);
    return rid === 'player' ? (index.realms.player || [])[0] || null : index.owners[rid] || null;
  }
  function bind(state, record, rid) {
    if (!record) return;
    const descriptor = Object.getOwnPropertyDescriptor(record, 'war');
    if (descriptor && descriptor.get) return;
    const legacy = record.war;
    Object.defineProperty(record, 'war', {
      configurable:true, enumerable:false,
      get:function () { return current(state, rid); },
      set:function (value) {
        if (value) {
          const previous = current(state, rid);
          if (previous && previous.enemy === value.enemy && previous !== value &&
              (context(state) || FB.realmWars(state, rid).length === 1)) {
            previous.status = 'ended'; previous.endedTurn = state.turn; previous.occupations = {};
            invalidateWars(state);
          }
          const created = FB.registerOrdinaryWar(state, rid, value);
          if (created && endpoint(created, 'player')) launches.set(state, created.id);
          return;
        }
        const candidates = FB.realmWars(state, rid);
        const w = current(state, rid);
        // Legacy mutations cannot silently select one of several campaigns.
        if (w && (context(state) || candidates.length === 1)) {
          w.status = 'ended';
          w.endedTurn = state.turn;
          invalidateWars(state);
        }
      }
    });
    if (legacy) FB.registerOrdinaryWar(state, rid, legacy);
  }
  FB.ensureWars = function (state) {
    if (!state || !state.player || !state.realms) return;
    if (initialized.has(state)) {
      bind(state, state.player, 'player');
      const revision = FB.realmStateRevision ? FB.realmStateRevision() : Object.keys(state.realms).length;
      if (bindingRevisions.get(state) !== revision) {
        bindingRevisions.set(state, revision);
        Object.keys(state.realms).sort().forEach(function (rid) { if (rid !== 'player') bind(state, state.realms[rid], rid); });
      }
      return;
    }
    if (!state.wars || typeof state.wars !== 'object' || Array.isArray(state.wars)) state.wars = {};
    state.warSerial = Math.max(0, Number(state.warSerial) || 0);
    initialized.add(state);
    bind(state, state.player, 'player');
    Object.keys(state.realms).sort().forEach(function (rid) {
      if (rid !== 'player') bind(state, state.realms[rid], rid);
    });
    if (state.player.flags && state.player.flags.in_prison && !state.player.captiveWarId) {
      const captiveWar = current(state, 'player');
      if (captiveWar) state.player.captiveWarId = captiveWar.id;
    }
    bindingRevisions.set(state, FB.realmStateRevision ? FB.realmStateRevision() : Object.keys(state.realms).length);
  };
  FB.realmWars = function (state, rid) {
    return (warIndex(state).realms[rid] || []).slice();
  };
  FB.ordinaryWarById = function (state, id) {
    const w = state.wars && state.wars[id];
    return w && w.status === 'active' ? w : null;
  };
  FB.ordinaryWarBetween = function (state, a, b) {
    const list = warIndex(state).realms[a] || [];
    for (const w of list) if (endpoint(w, b)) return w;
    return null;
  };
  FB.withOrdinaryWar = function (state, id, fn) {
    FB.ensureWars(state);
    if (id && !FB.ordinaryWarById(state, id)) return false;
    contexts.push({ state:state, id:id });
    try { return fn(); } finally { contexts.pop(); }
  };
  FB.registerOrdinaryWar = function (state, owner, war) {
    FB.ensureWars(state);
    if (!war || !war.enemy || owner === war.enemy) return null;
    if (war.id && state.wars[war.id] === war) return war;
    const attacker = owner === 'player' && war.defending ? war.enemy : owner;
    const defender = attacker === owner ? war.enemy : owner;
    const existing = FB.ordinaryWarBetween(state, attacker, defender);
    if (existing) return existing;
    let id = war.id;
    if (!id || own(state.wars, id)) {
      do { id = 'war_' + (++state.warSerial); } while (own(state.wars, id));
    }
    war.id = id;
    war.attacker = attacker;
    war.defender = defender;
    war.legacyOwner = owner;
    war.enemy = endpoint(war, 'player') ? (attacker === 'player' ? defender : attacker) : defender;
    war.defending = defender === 'player';
    war.status = 'active';
    war.startedTurn = war.startedTurn === undefined ? state.turn : war.startedTurn;
    war.seasons = Number(war.seasons) || (Number(war.years) || 0) * 4;
    war.years = Number(war.years) || 0;
    war.wins = Number(war.wins) || 0;
    war.losses = Number(war.losses) || 0;
    war.occupations = war.occupations || {};
    if (!war.target && !endpoint(war, 'player') && FB.aiExpansionProvince) {
      war.target = FB.aiExpansionProvince(state, attacker, defender);
    }
    war.objectives = war.objectives || (war.target ? [{ target:war.target,
      type:war.casus && war.casus.type || 'border' }] : []);
    war.legacy = war.legacy === undefined ? endpoint(war, 'player') : war.legacy;
    if (war.fortSieges) Object.keys(war.fortSieges).forEach(function (pid) {
      if (!war.occupations[pid]) war.occupations[pid] = Object.assign({ occupied:false }, war.fortSieges[pid]);
    });
    state.wars[id] = war;
    invalidateWars(state);
    return war;
  };
  FB.ordinaryWarParticipants = function (state, owner, war) {
    return war && war.attacker ? [war.attacker, war.defender] : war && war.enemy ? [owner, war.enemy] : [];
  };
  FB.warOpponents = function (state, rid) {
    const found = {};
    FB.realmWars(state, rid).forEach(function (w) { found[w.attacker === rid ? w.defender : w.attacker] = 1; });
    if (FB.greatHolyWarEnemies) (FB.greatHolyWarEnemies(state, rid) || []).forEach(function (id) { found[id] = 1; });
    return Object.keys(found).sort();
  };
  FB.isRealmAtWar = function (state, rid) {
    if (!state || !rid) return false;
    FB.ensureWars(state);
    return FB.realmWars(state, rid).length > 0 || !!(FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, rid));
  };
  FB.playerRealmAtWar = function (state) {
    return FB.isRealmAtWar(state, 'player') || FB.isRealmAtWar(state, FB.playerRealmId(state));
  };
  FB.warRealmContains = function (state, rid, holder) {
    const seen = {};
    while (holder && !seen[holder]) {
      if (holder === rid) return true;
      seen[holder] = 1;
      holder = holder === 'player' ? state.player.liege : state.realms[holder] && state.realms[holder].liege;
    }
    return false;
  };
  FB.warCountyHeldBy = function (state, pid, rid) {
    return FB.warRealmContains(state, rid, state.holder && state.holder[pid] || state.owner[pid]);
  };
  FB.warTargetDefender = function (state, attacker, pid) {
    const holder = state.holder && state.holder[pid] || state.owner[pid];
    if (!holder || FB.warRealmContains(state, attacker, holder) || FB.warRealmContains(state, holder, attacker)) return null;
    return FB.topRealm(state, attacker) === state.owner[pid] ? holder : state.owner[pid];
  };
  FB.repairWars = function (state) {
    invalidateWars(state);
    FB.ensureWars(state);
    if (!state || !state.player) return;
    state.truces = state.truces || {};
    Object.keys(state.realms).sort().forEach(function (rid) {
      if (rid !== 'player') bind(state, state.realms[rid], rid);
    });
    rows(state).forEach(function (w) {
      const a = state.realms[w.attacker], b = state.realms[w.defender];
      if (!a || !a.alive || !b || !b.alive || w.attacker === w.defender) {
        w.status = 'ended'; w.endedTurn = state.turn; invalidateWars(state); return;
      }
      w.occupations = w.occupations || {};
      if (endpoint(w, 'player')) FB.withOrdinaryWar(state, w.id, function () {
        if (FB.applyPlayerWarEnemyStanding) FB.applyPlayerWarEnemyStanding(state, w, 'war:repair');
        if (FB.ensurePlayerWarHistory) FB.ensurePlayerWarHistory(state);
        if (FB.ensurePlayerWarFeedback) FB.ensurePlayerWarFeedback(state);
      });
    });
    state.armies = (state.armies || []).filter(function (a) { return a && FB.isRealmAtWar(state, a.realm); });
    FB.assignCampaignHosts(state);
  };
  FB.assignCampaignHosts = function (state) {
    (state.armies || []).forEach(function (a) {
      const w = FB.ordinaryWarById(state, a.warId);
      if (w && endpoint(w, a.realm)) return;
      if (a.warId === 'holy' && FB.greatHolyWarCamp(state, a.realm)) return;
      const list = FB.realmWars(state, a.realm);
      a.warId = list.length ? list[0].id : FB.greatHolyWarCamp(state, a.realm) ? 'holy' : null;
    });
  };
  FB.assignHostCampaign = function (state, hostId, warId) {
    const host = (state.armies || []).filter(function (a) { return a.id === hostId; })[0];
    const w = FB.ordinaryWarById(state, warId);
    if (!host || (warId === 'holy' ? !FB.greatHolyWarCamp(state, host.realm) : !w || !endpoint(w, host.realm))) return false;
    host.warId = warId;
    host.path = []; host.goal = null; host.huntPrey = null; host.moveLeft = 0;
    if (warId === 'holy' && FB.greatHolyWarMarkMuster) FB.greatHolyWarMarkMuster(state, host.realm);
    return true;
  };
  FB.campaignArmyGoal = function (state, army) {
    const w = FB.ordinaryWarById(state, army.warId);
    if (!w) return null;
    const attacking = army.realm === w.attacker;
    const objectives = w.objectives || [];
    for (const o of objectives) {
      const occupied = w.occupations[o.target] && w.occupations[o.target].occupied;
      if (attacking ? !occupied : occupied) return o.target;
    }
    const enemy = state.realms[attacking ? w.defender : w.attacker];
    return enemy && enemy.capital;
  };
  FB.battleOrdinaryWar = function (state, a, b) {
    const index = warIndex(state);
    const revision = FB.realmStateRevision ? FB.realmStateRevision() : state.turn;
    if (index.revision !== revision || index.hierarchy !== state.realms ||
        index.playerLiege !== state.player.liege) {
      index.revision = revision;
      index.hierarchy = state.realms;
      index.playerLiege = state.player.liege;
      index.ancestors = Object.create(null);
      index.pairs = Object.create(null);
    }
    function ancestors(rid) {
      if (index.ancestors[rid]) return index.ancestors[rid];
      const found = Object.create(null), original = rid;
      while (rid && !found[rid]) {
        found[rid] = true;
        rid = rid === 'player' ? state.player.liege : state.realms[rid] && state.realms[rid].liege;
      }
      index.ancestors[original] = found;
      return found;
    }
    const pairs = index.pairs[a.realm] || (index.pairs[a.realm] = Object.create(null));
    let list = pairs[b.realm];
    if (!list) {
      const left = ancestors(a.realm), right = ancestors(b.realm), seen = Object.create(null);
      list = [];
      for (const rid in left) {
        for (const w of (index.realms[rid] || [])) {
          if (!seen[w.id] && ((left[w.attacker] && right[w.defender]) ||
              (left[w.defender] && right[w.attacker]))) {
            seen[w.id] = true;
            list.push(w);
          }
        }
      }
      list.sort(function (x, y) { return index.order[x.id] - index.order[y.id]; });
      pairs[b.realm] = list;
      (index.pairs[b.realm] || (index.pairs[b.realm] = Object.create(null)))[a.realm] = list;
    }
    for (const w of list) if (w.id === a.warId || w.id === b.warId) return w;
    return list[0] || null;
  };
  FB.armiesHostile = function (state, a, b) {
    if (a.realm === b.realm) return false;
    if (FB.battleOrdinaryWar(state, a, b)) return true;
    const ca = FB.greatHolyWarCamp(state, a.realm), cb = FB.greatHolyWarCamp(state, b.realm);
    return !!(ca && cb && ca !== cb);
  };
  const oldContext = FB.warEventContext;
  FB.warEventContext = function (state, ctx) {
    const out = oldContext(state, ctx);
    const w = current(state, 'player');
    if (w) out.warId = w.id;
    return out;
  };
  FB.fns.war_event_context_valid = function (state, ctx) {
    ctx = ctx || {};
    const list = FB.realmWars(state, 'player');
    return list.some(function (w) {
      if (ctx.warId !== undefined) return w.id === ctx.warId && (!ctx.warEnemyId || ctx.warEnemyId === w.enemy);
      return (ctx.warEventId === undefined ? list.length === 1 : ctx.warEventId === w.eventId) &&
        (ctx.warEnemyId === undefined || ctx.warEnemyId === w.enemy);
    });
  };
  function contextual(name, ctxIndex) {
    const original = FB[name];
    if (!original) return;
    FB[name] = function () {
      const args = arguments, state = args[0], ctx = args[ctxIndex];
      if (!ctx || (ctx.warId === undefined && ctx.warEventId === undefined)) return original.apply(FB, args);
      const w = FB.realmWars(state, 'player').filter(function (entry) {
        return ctx.warId !== undefined ? entry.id === ctx.warId : entry.eventId === ctx.warEventId;
      })[0];
      if (!w) return false;
      return FB.withOrdinaryWar(state, w.id, function () { return original.apply(FB, args); });
    };
  }
  contextual('checkTrigger', 2);
  contextual('applyEffects', 2);
  contextual('resolveEventOption', 3);
  const footing = FB.warFooting;
  FB.warFooting = function (state) {
    FB.ensureWars(state);
    const id = launches.get(state);
    if (!context(state) && id && FB.ordinaryWarById(state, id)) {
      return FB.withOrdinaryWar(state, id, function () { const result = footing(state); FB.assignCampaignHosts(state); return result; });
    }
    const result = footing(state);
    FB.assignCampaignHosts(state);
    return result;
  };
  const queue = FB.queueWarEvent;
  FB.queueWarEvent = function (state, id, ctx, extra) {
    const launched = launches.get(state);
    if (!context(state) && launched && FB.ordinaryWarById(state, launched)) {
      launches.delete(state);
      return FB.withOrdinaryWar(state, launched, function () { return queue(state, id, ctx, extra); });
    }
    return queue(state, id, ctx, extra);
  };
  const oldEnd = FB.endPlayerWar;
  FB.endPlayerWar = function (state, invalid, warId) {
    FB.ensureWars(state);
    const c = context(state), list = FB.realmWars(state, 'player');
    const w = warId ? FB.ordinaryWarById(state, warId) : c ? current(state, 'player') : list.length === 1 ? list[0] : null;
    if (!w) return false;
    const retainedFocus = state.player.focus, retainedBack = state.player.focusBack;
    const result = FB.withOrdinaryWar(state, w.id, function () {
      const flags = state.player.flags || {};
      const otherCaptive = flags.in_prison && state.player.captiveWarId && state.player.captiveWarId !== w.id;
      const captive = flags.in_prison;
      if (otherCaptive) delete flags.in_prison;
      try { return oldEnd(state, invalid); }
      finally {
        if (otherCaptive) flags.in_prison = captive;
        else if (!flags.in_prison) delete state.player.captiveWarId;
        FB.assignCampaignHosts(state);
      }
    });
    w.occupations = {};
    if (FB.realmWars(state, 'player').length || FB.greatHolyWarCamp(state, 'player')) {
      state.player.focus = retainedFocus; state.player.focusBack = retainedBack;
    } else delete (state.military || {}).player;
    FB.validateFocus(state);
    return result;
  };
  FB.settleOrdinaryWar = function (state, id, result, completingEnforcement) {
    const w = FB.ordinaryWarById(state, id);
    if (!w || ['victory', 'white_peace', 'defeat', 'invalid'].indexOf(result) < 0) return false;
    w.result = result;
    if (endpoint(w, 'player')) FB.endPlayerWar(state, result === 'invalid', id);
    else {
      FB.concludeOrdinaryWar(state, w.attacker, w, result === 'invalid');
      w.status = 'ended'; w.endedTurn = state.turn;
      invalidateWars(state);
    }
    w.occupations = {};
    (state.armies || []).forEach(function (a) {
      if (a.warId === id) { a.warId = null; a.path = []; a.goal = null; a.huntPrey = null; }
    });
    FB.assignCampaignHosts(state);
    rows(state).filter(function (other) { return other.enforcementOf === id && other.id !== completingEnforcement; }).forEach(function (other) {
      FB.settleOrdinaryWar(state, other.id, 'invalid');
    });
    return true;
  };

  FB.fabricatedClaimsOf = function (state) {
    const p = state.player, stored = p.fabricatedClaims || {};
    const all = Object.keys(stored).sort().map(function (pid) { return stored[pid]; });
    const old = typeof p.fabricatedClaim === 'string' ? { pid:p.fabricatedClaim } : p.fabricatedClaim;
    if (old && !stored[old.pid]) all.push(old);
    return all.filter(function (c) {
      return c && FB.world.byId[c.pid] && !FB.world.byId[c.pid].wasteland &&
        !!FB.warTargetDefender(state, 'player', c.pid);
    });
  };
  FB.saveFabricatedClaim = function (state, pid) {
    const p = state.player, claims = FB.fabricatedClaimsOf(state);
    p.fabricatedClaims = {};
    claims.forEach(function (c) { p.fabricatedClaims[c.pid] = c; });
    if (pid) p.fabricatedClaims[pid] = { pid:pid, madeTurn:state.turn };
    delete p.fabricatedClaim;
  };
  FB.consumeFabricatedClaim = function (state, pid) {
    FB.saveFabricatedClaim(state);
    delete state.player.fabricatedClaims[pid];
  };
  FB.territorialWarRights = function (state, rid, pid) {
    const out = [], dj = FB.dejureOf(pid), r = state.realms[rid];
    if (!r || !r.alive) return out;
    if (rid === 'player') {
      const p = state.player;
      const titles = { duchy:p.tier >= 5 ? FB.playerDuchies(state) : [],
        kingdom:p.tier >= 6 ? FB.playerKingdoms(state) : [],
        empire:p.tier >= 7 ? FB.playerEmpires(state) : [] };
      ['duchy', 'kingdom', 'empire'].forEach(function (kind) {
        if (dj[kind] && titles[kind].indexOf(dj[kind]) >= 0) out.push({
          type:'dejure', target:pid, titleKind:kind, titleId:dj[kind] });
      });
      if (FB.fabricatedClaimsOf(state).some(function (c) { return c.pid === pid; })) out.push({ type:'fabricated', target:pid });
    } else {
      // AI houses press the region of their recognized principal dignity.
      const capital = FB.dejureOf(r.capital);
      const kind = r.rank >= 4 ? 'empire' : r.rank >= 3 ? 'kingdom' : r.rank >= 2 ? 'duchy' : null;
      if (kind && capital[kind] && capital[kind] === dj[kind]) out.push({
        type:'dejure', target:pid, titleKind:kind, titleId:dj[kind] });
    }
    return out;
  };
  FB.claimPackageCandidates = function (state, rid, enemy) {
    return Object.keys(FB.world.byId).sort().filter(function (pid) {
      return FB.warTargetDefender(state, rid, pid) === enemy && FB.territorialWarRights(state, rid, pid).length;
    }).map(function (pid) {
      return { target:pid, enemy:enemy, justifications:FB.territorialWarRights(state, rid, pid) };
    });
  };
  function packageKey(attacker, causes) {
    return JSON.stringify([attacker, causes[0] && causes[0].enemy,
      causes.map(function (c) { return [c.target, c.type, c.titleKind || '', c.titleId || '']; }).sort()]);
  }
  function liegeOf(state, rid) {
    return rid === 'player' ? state.player.liege : state.realms[rid] && state.realms[rid].liege;
  }
  FB.vassalWarLaw = function (state, rid, enemy) {
    const sovereign = FB.topRealm(state, rid);
    const family = sovereign === FB.topRealm(state, enemy) ? 'internal_peace' : 'external_campaigns';
    const record = state.warLaws && state.warLaws[sovereign] && state.warLaws[sovereign][family];
    return { sovereign:sovereign, liege:liegeOf(state, rid) || null,
      family:family, level:record && record.level || 'customary' };
  };
  FB.warDeclarationPreview = function (state, rid, causes) {
    const out = { valid:false, reason:'', unlawful:false, law:null, key:null };
    function fail(text) { out.reason = text; return out; }
    const realm = state.realms[rid];
    if (!realm || !realm.alive || !causes || !causes.length) return fail(FB.T('A landed ruler and a war objective are required.'));
    if (rid === 'player' && (state.player.tier < 4 || state.player.flags.in_prison) &&
        causes[0].type !== 'restoration') return fail(FB.T('You must rule a county and be free to command.'));
    const enemy = causes[0].enemy;
    if (!enemy || !state.realms[enemy] || !state.realms[enemy].alive || enemy === rid) return fail(FB.T('That opponent is no longer available.'));
    if (FB.ordinaryWarBetween(state, rid, enemy)) return fail(FB.T('You already have a campaign against this opponent.'));
    if (FB.truceExpiry(state, rid, enemy)) return fail(FB.truceText(state, rid, enemy));
    if (FB.areAlliedSnapshot && FB.areAlliedSnapshot(state, rid, enemy)) return fail(FB.T('Your alliance protects this opponent.'));
    if (rid === 'player' && state.pacts && state.pacts[enemy] > state.turn) return fail(FB.T('Your peace pact protects this opponent.'));
    const camp = FB.greatHolyWarCamp(state, rid);
    if (camp && camp === FB.greatHolyWarCamp(state, enemy)) return fail(FB.T('You share a holy-war camp with this ruler.'));
    const special = ['restoration', 'caliphate', 'independence', 'defection', 'enforcement'].indexOf(causes[0].type) >= 0;
    if (special && rid === 'player') {
      const me = state.chars[state.player.charId];
      if (causes[0].type === 'restoration' && (!me || !me.restorationRight || me.restorationRight.realmId !== enemy)) return fail(FB.T('You have no restoration right against this ruler.'));
      if (causes[0].type === 'caliphate' && !FB.caliphateWarClaimantEligible(state)) return fail(FB.T('You are not eligible to claim this office.'));
      if (['independence', 'defection', 'enforcement'].indexOf(causes[0].type) >= 0) return fail(FB.T('Use the dedicated political action for this campaign.'));
    }
    const selected = {}, frontier = FB.realmTerritory(state, rid), starts = [];
    for (const cause of causes) {
      if (cause.enemy !== enemy || selected[cause.target]) return fail(FB.T('Choose distinct objectives against one defender.'));
      if (causes.length > 1 && ['dejure', 'fabricated'].indexOf(cause.type) < 0) return fail(FB.T('Only lawful territorial claims can be combined.'));
      if (special && causes.length > 1) return fail(FB.T('This campaign has one distinct outcome.'));
      if (!special) {
        if (FB.warTargetDefender(state, rid, cause.target) !== enemy) return fail(FB.T('An objective is no longer held by that defender.'));
        if (cause.type !== 'aggression' && !FB.territorialWarRights(state, rid, cause.target).some(function (right) {
          return right.type === cause.type && (right.titleKind || '') === (cause.titleKind || '') && (right.titleId || '') === (cause.titleId || '');
        })) return fail(FB.T('You no longer hold that territorial right.'));
      }
      selected[cause.target] = 1;
      if (frontier.some(function (pid) { return !!(FB.world.adj[pid] || {})[cause.target]; })) starts.push(cause.target);
    }
    if (!special) {
      const visited = {}, queue = starts.length ? [starts[0]] : [];
      while (queue.length) {
        const pid = queue.shift();
        if (visited[pid]) continue;
        visited[pid] = 1;
        Object.keys(FB.world.adj[pid] || {}).forEach(function (nb) { if (selected[nb] && !visited[nb]) queue.push(nb); });
      }
      if (Object.keys(visited).length !== causes.length) return fail(FB.T('Claims must form one connected package touching your frontier.'));
    }
    out.key = packageKey(rid, causes);
    out.law = FB.vassalWarLaw(state, rid, enemy);
    if (!special && out.law.liege && out.law.level !== 'customary') {
      const permission = state.warPermissions && state.warPermissions[out.key];
      out.unlawful = out.law.level === 'prohibited' || !permission || permission.liege !== out.law.liege;
    }
    out.valid = true;
    return out;
  };
  FB.requestWarPermission = function (state, rid, causes) {
    const preview = FB.warDeclarationPreview(state, rid, causes);
    if (!preview.valid || preview.law.level !== 'permission' || !preview.law.liege ||
        FB.ordinaryWarBetween(state, rid, preview.law.liege)) return false;
    state.warPermissionRequests = state.warPermissionRequests || {};
    state.warPermissionRequests[preview.key] = { attacker:rid, liege:preview.law.liege,
      causes:causes.map(function (c) { return Object.assign({}, c); }), turn:state.turn };
    if (preview.law.liege !== 'player') {
      const lawful = causes.every(function (c) { return c.type !== 'aggression'; });
      const standing = rid === 'player' ? FB.standingOf(state, { kind:'realm', id:preview.law.liege }) : Number(state.realms[rid].favor) || 0;
      return FB.answerWarPermission(state, preview.key, lawful && standing >= 0);
    }
    return true;
  };
  FB.answerWarPermission = function (state, key, grant) {
    const request = state.warPermissionRequests && state.warPermissionRequests[key];
    if (!request || request.liege !== liegeOf(state, request.attacker)) return false;
    delete state.warPermissionRequests[key];
    if (!grant) return false;
    state.warPermissions = state.warPermissions || {};
    state.warPermissions[key] = { liege:request.liege, turn:state.turn };
    return true;
  };
  FB.recordWarDeclaration = function (state, war, preview) {
    war.unlawful = !!preview.unlawful;
    if (state.warPermissions && preview.key) delete state.warPermissions[preview.key];
    if (!war.unlawful) return;
    war.peaceDemand = { liege:preview.law.liege, deadline:state.turn + 90, status:'pending' };
    if (war.attacker === 'player') FB.adjustStanding(state, { kind:'realm', id:preview.law.liege }, -20, 'war:unlawful');
    else if (preview.law.liege === 'player') FB.adjustStanding(state, { kind:'realm', id:war.attacker }, -20, 'war:unlawful');
    else state.realms[war.attacker].favor = FB.clamp((Number(state.realms[war.attacker].favor) || 0) - 20, -100, 100);
    FB.news(state, FB.msg('news.war.unlawful', '{realm} breaks the sovereign peace. The liege demands an end to the campaign within 90 days.', {
      realm:state.realms[war.attacker].name }));
  };
  FB.answerPeaceDemand = function (state, id, comply) {
    const w = FB.ordinaryWarById(state, id);
    if (!w || !w.peaceDemand || w.peaceDemand.status !== 'pending') return false;
    w.peaceDemand.status = comply ? 'complied' : 'refused';
    if (comply) FB.settleOrdinaryWar(state, id, 'white_peace');
    return true;
  };
  FB.startPeaceEnforcement = function (state, id) {
    const unlawful = FB.ordinaryWarById(state, id), demand = unlawful && unlawful.peaceDemand;
    if (!demand || demand.status !== 'refused' || demand.liege !== liegeOf(state, unlawful.attacker)) return false;
    if (FB.ordinaryWarBetween(state, demand.liege, unlawful.attacker) ||
        FB.truceExpiry(state, demand.liege, unlawful.attacker)) return false;
    const target = state.realms[unlawful.attacker].capital;
    const w = FB.registerOrdinaryWar(state, demand.liege, { enemy:unlawful.attacker,
      target:target, legacy:false, casus:{ type:'enforcement', target:target },
      objectives:[{ target:target, type:'enforcement' }], enforcementOf:id });
    if (endpoint(w, 'player')) FB.withOrdinaryWar(state, w.id, function () { FB.warFooting(state); });
    return !!w;
  };
  FB.startClaimPackageWar = function (state, causes, options) {
    FB.ensureWars(state);
    const preview = FB.warDeclarationPreview(state, 'player', causes);
    options = options || {};
    if (!preview.valid || (preview.unlawful && !options.confirmUnlawful)) return false;
    if (causes.length === 1) return FB.startPlayerWar(state, causes[0], options);
    const c = state.chars[state.player.charId];
    const sacrilege = causes.some(function (cause) {
      return FB.sameFaithHeadWarPolicy(state, c.religion, cause.enemy, cause.target) === 'sacrilege';
    });
    if (sacrilege && !options.confirmSacrilege) return false;
    const w = FB.registerOrdinaryWar(state, 'player', { enemy:causes[0].enemy,
      target:causes[0].target, legacy:false, casus:{ type:'claims', target:causes[0].target },
      objectives:causes.map(function (cause) { return Object.assign({}, cause); }) });
    FB.recordWarDeclaration(state, w, preview);
    state.player.prestige += 5;
    if (sacrilege) FB.applySacrilegiousWarConsequences(state, c.religion);
    FB.withOrdinaryWar(state, w.id, function () { FB.warFooting(state); FB.queueWarEvent(state, 'war_muster', {}); });
    return true;
  };

  function territorial(w) { return ['claims', 'dejure', 'fabricated', 'aggression', 'border', 'consolidation', 'enforcement'].indexOf(w.casus && w.casus.type || 'border') >= 0; }
  function finishObjectives(state, w) {
    if (!w.objectives.length || !w.objectives.every(function (o) { return w.occupations[o.target] && w.occupations[o.target].occupied; })) return false;
    if (w.enforcementOf) {
      FB.settleOrdinaryWar(state, w.enforcementOf, 'white_peace', w.id);
      if (w.defender === 'player') state.player.prestige = Math.max(0, state.player.prestige - 50);
      else state.realms[w.defender].prestige = Math.max(0, (Number(state.realms[w.defender].prestige) || 0) - 50);
    } else {
      const gains = w.objectives.slice();
      gains.forEach(function (o) {
        const sovereign = FB.topRealm(state, w.attacker);
        FB.transferProvince(state, o.target, sovereign);
        state.holder[o.target] = w.attacker;
        if (w.attacker === 'player') {
          if (state.player.provs.indexOf(o.target) < 0) state.player.provs.push(o.target);
          state.player.prestige += o.type === 'aggression' ? 0 : 50;
          if (o.type === 'fabricated') FB.consumeFabricatedClaim(state, o.target);
        } else if ((state.player.provs || []).indexOf(o.target) >= 0) {
          state.player.provs = state.player.provs.filter(function (pid) { return pid !== o.target; });
        }
        if (o.type === 'aggression' && FB.addModifier) FB.addModifier(state, 'conquered_without_right', o.target);
        FB.damageCountyDevelopment(state, o.target);
        if (FB.damageCountyPopulation) FB.damageCountyPopulation(state, o.target, 'conquest');
        FB.news(state, FB.msg('news.war.objective_awarded', '{realm} gains {province} in the peace settlement.', {
          realm:state.realms[w.attacker].name, province:FB.world.byId[o.target].name }));
      });
      FB.invalidateRealmCache();
      if (w.defender === 'player' && !state.player.provs.length) {
        FB.setPlayerTier(state, 2);
        FB.changePlayerLiege(state, null, 'war:landless');
        if (state.realms.player) FB.markRealmDead(state, 'player');
      }
    }
    FB.settleOrdinaryWar(state, w.id, 'victory');
    FB.checkTierPromotions(state);
    return true;
  }
  FB.advanceOrdinaryObjectives = function (state, id) {
    const w = FB.ordinaryWarById(state, id);
    if (!w || !territorial(w)) return false;
    if (w.objectivePulseTurn === state.turn) return false;
    w.objectivePulseTurn = state.turn;
    if (w.enforcementOf && !FB.ordinaryWarById(state, w.enforcementOf)) return FB.settleOrdinaryWar(state, id, 'invalid');
    w.objectives = w.objectives.filter(function (o) {
      return w.enforcementOf || FB.warCountyHeldBy(state, o.target, w.defender);
    });
    if (!w.objectives.length) return FB.settleOrdinaryWar(state, id, 'invalid');
    for (const o of w.objectives) {
      const siege = w.occupations[o.target] = w.occupations[o.target] || { progress:0, occupied:false };
      const besieger = siege.occupied ? w.defender : w.attacker;
      const hosts = (state.armies || []).filter(function (a) {
        return a.realm === besieger && a.warId === id && a.at === o.target && !a.moveLeft && !(a.path || []).length;
      });
      const contested = (state.armies || []).some(function (a) {
        return a.at === o.target && hosts.some(function (h) { return FB.armiesHostile(state, h, a); });
      });
      if (!hosts.length) { siege.progress = Math.max(0, (siege.progress || 0) - 1); continue; }
      const pulse = FB.advanceFortSiegePulse(state, o.target, siege, {
        progressKey:'progress', levelKey:'fortLevel', hosts:hosts, contested:contested,
        progressAmount:1 + FB.techBonus(state, 'siege', besieger) * 3 });
      if (pulse && pulse.breached) {
        siege.occupied = !siege.occupied; siege.progress = 0; delete siege.fortLevel;
        FB.news(state, FB.msg('news.war.occupation_changed', '{realm} takes military control of {province}; legal ownership awaits peace.', {
          realm:state.realms[besieger].name, province:FB.world.byId[o.target].name }));
      }
    }
    w.target = (w.objectives.filter(function (o) { return !w.occupations[o.target].occupied; })[0] || w.objectives[0]).target;
    return finishObjectives(state, w);
  };
  const oldPlayerTick = FB.playerWarTick;
  FB.playerWarTick = function (state) {
    FB.ensureWars(state);
    FB.assignCampaignHosts(state);
    if (state.player.flags.in_prison && state.player.captiveWarId) {
      FB.withOrdinaryWar(state, state.player.captiveWarId, function () { FB.warCaptivityTick(state); });
    }
    rows(state).forEach(function (w) {
      if (w.lastSeasonTurn === state.turn) return;
      w.lastSeasonTurn = state.turn;
      if (!state.realms[w.attacker] || !state.realms[w.attacker].alive || !state.realms[w.defender] || !state.realms[w.defender].alive) {
        FB.settleOrdinaryWar(state, w.id, 'invalid'); return;
      }
      if (!w.legacy && territorial(w)) {
        w.seasons++;
        FB.withOrdinaryWar(state, w.id, function () { FB.advanceOrdinaryObjectives(state, w.id); });
        if (w.status === 'active' && w.seasons >= 32) FB.settleOrdinaryWar(state, w.id, 'white_peace');
        if (w.status === 'active' && endpoint(w, 'player') && !state.player.flags.in_prison) {
          FB.withOrdinaryWar(state, w.id, function () { FB.queueWarEvent(state, 'war_council', {}); });
        }
      } else if (endpoint(w, 'player')) FB.withOrdinaryWar(state, w.id, function () { oldPlayerTick(state); });
      if (w.status === 'active' && w.peaceDemand) {
        if (w.peaceDemand.status === 'pending' && state.turn >= w.peaceDemand.deadline) w.peaceDemand.status = 'refused';
        if (w.peaceDemand.status === 'refused' && w.peaceDemand.liege !== 'player' &&
            FB.realmStrength(state, w.peaceDemand.liege) >= FB.realmStrength(state, w.attacker) * 1.2) FB.startPeaceEnforcement(state, w.id);
      }
    });
    FB.generateVassalCampaigns(state);
    const ended = Object.keys(state.wars).filter(function (id) { return state.wars[id] && state.wars[id].status === 'ended'; });
    ended.sort(function (a, b) { return (state.wars[b].endedTurn || 0) - (state.wars[a].endedTurn || 0) || (a < b ? -1 : 1); });
    ended.slice(64).forEach(function (id) { delete state.wars[id]; });
  };
  FB.generateVassalCampaigns = function (state) {
    if (state.warAISeason === state.turn) return;
    state.warAISeason = state.turn;
    Object.keys(state.realms).sort().forEach(function (rid) {
      const r = state.realms[rid];
      if (rid === 'player' || !r || !r.alive || !r.ruler || r.rank < 1) return;
      const holy = state.greatHolyWar;
      const holyCommitment = holy && holy.phase === 'active' && ['attackers', 'defenders'].some(function (camp) {
        return (holy.participants[camp] || []).some(function (p) { return p.realm === rid; });
      });
      const commitments = FB.realmWars(state, rid).filter(function (w) { return w.attacker === rid; }).length + (holyCommitment ? 1 : 0);
      if (commitments >= 2 || !FB.chance(r.ruler.personality === 'bellicose' ? 0.08 : 0.025)) return;
      const seen = {}, candidates = [];
      FB.realmTerritory(state, rid).forEach(function (pid) {
        Object.keys(FB.world.adj[pid] || {}).sort().forEach(function (nb) {
          if (seen[nb]) return;
          seen[nb] = 1;
          const enemy = FB.warTargetDefender(state, rid, nb);
          if (!enemy || FB.realmStrength(state, rid) < FB.realmStrength(state, enemy) * 1.2) return;
          const rights = FB.territorialWarRights(state, rid, nb);
          const cause = Object.assign({ enemy:enemy }, rights[0] || { type:'aggression', target:nb });
          if (FB.sameFaithHeadWarPolicy(state, FB.realmReligionId(state, rid), enemy, nb)) return;
          const preview = FB.warDeclarationPreview(state, rid, [cause]);
          if (preview.valid) candidates.push({ cause:cause, preview:preview });
        });
      });
      candidates.sort(function (a, b) { return (a.cause.type === 'aggression') - (b.cause.type === 'aggression') || (a.cause.target < b.cause.target ? -1 : a.cause.target > b.cause.target ? 1 : 0); });
      if (!candidates.length) return;
      const picked = candidates[0], cause = picked.cause;
      const causes = [cause];
      if (cause.type !== 'aggression') {
        const rights = FB.claimPackageCandidates(state, rid, cause.enemy), reached = {};
        reached[cause.target] = 1;
        let changed = true;
        while (changed) {
          changed = false;
          rights.forEach(function (entry) {
            if (reached[entry.target] || !Object.keys(FB.world.adj[entry.target] || {}).some(function (nb) { return reached[nb]; })) return;
            reached[entry.target] = 1; changed = true;
            causes.push(Object.assign({ enemy:cause.enemy }, entry.justifications[0]));
          });
        }
        picked.preview = FB.warDeclarationPreview(state, rid, causes);
        if (!picked.preview.valid) return;
      }
      if (picked.preview.unlawful && picked.preview.law.level === 'permission') {
        FB.requestWarPermission(state, rid, causes);
        picked.preview = FB.warDeclarationPreview(state, rid, causes);
        if (picked.preview.law.liege === 'player' && picked.preview.unlawful) return;
      }
      if (picked.preview.unlawful && (Number(r.favor) || 0) >= -20) return;
      const owner = cause.enemy === 'player' ? 'player' : rid;
      const w = FB.registerOrdinaryWar(state, owner, { enemy:owner === 'player' ? rid : cause.enemy,
        defending:owner === 'player', target:cause.target, casus:causes.length > 1 ? { type:'claims', target:cause.target } : cause, legacy:false,
        objectives:causes });
      FB.recordWarDeclaration(state, w, picked.preview);
      if (owner === 'player') FB.withOrdinaryWar(state, w.id, function () { FB.warFooting(state); FB.queueWarEvent(state, 'war_defense_muster', {}); });
    });
  };

  function warPolicy(id) { return id === 'internal_peace' || id === 'external_campaigns'; }
  const oldPolicyRecord = FB.realmPolicyRecord;
  const oldPolicyStatus = FB.realmPolicyStatus;
  const oldPolicyProclaim = FB.realmPolicyProclaim;
  FB.realmPolicyRecord = function (state, id) {
    if (!warPolicy(id)) return oldPolicyRecord(state, id);
    const top = FB.playerRealmId(state) || 'player';
    const record = state.warLaws && state.warLaws[top] && state.warLaws[top][id];
    return record ? { level:record.level, setYear:record.setYear, setTurn:record.setTurn } : null;
  };
  const oldPolicyLevel = FB.realmPolicyLevelId;
  FB.realmPolicyLevelId = function (state, id) {
    if (!warPolicy(id)) return oldPolicyLevel(state, id);
    const record = FB.realmPolicyRecord(state, id);
    return record ? record.level : 'customary';
  };
  FB.realmPolicyStatus = function (state, id, level) {
    if (!warPolicy(id)) return oldPolicyStatus(state, id, level);
    const r = state.realms.player;
    const record = FB.realmPolicyRecord(state, id);
    const cost = Number(FBDATA.balance.realmPolicyChangeCost) || 20;
    const currentLevel = FB.realmPolicyLevelId(state, id);
    let reason = '';
    if (['customary', 'permission', 'prohibited'].indexOf(level) < 0) reason = FB.T('Unknown law level.');
    else if (currentLevel === level) reason = FB.T('This is already the standing policy.');
    else if (!r || !r.alive || r.liege || state.player.liege || state.player.tier < 5) reason = FB.T('Only an independent duke or crowned sovereign may proclaim war laws.');
    else if (record && record.setYear === state.date.year) reason = FB.T('This law has already changed this year.');
    else if (state.player.gold < cost) reason = FB.T('Requires {money:cost}.', { cost:cost });
    return { ready:!reason, current:level === currentLevel, reason:reason, cost:cost };
  };
  FB.realmPolicyProclaim = function (state, id, level) {
    if (!warPolicy(id)) return oldPolicyProclaim(state, id, level);
    const status = FB.realmPolicyStatus(state, id, level);
    if (!status.ready) return false;
    const levels = ['customary', 'permission', 'prohibited'];
    const reaction = levels.indexOf(level) > levels.indexOf(FB.realmPolicyLevelId(state, id)) ? -10 : 10;
    state.warLaws = state.warLaws || {};
    state.warLaws.player = state.warLaws.player || {};
    state.warLaws.player[id] = { level:level, setYear:state.date.year, setTurn:state.turn };
    state.player.gold -= status.cost;
    FB.playerVassals(state).forEach(function (rid) { FB.adjustStanding(state, { kind:'realm', id:rid }, reaction, 'war:law'); });
    FB.news(state, FB.msg('news.war.law_proclaimed', 'The sovereign proclaims {law}: {level}. Existing campaigns keep their terms.', {
      law:FB.dataParam('policy', id, 'name'), level:FB.dataParam('policy', id, 'levels.' + levels.indexOf(level) + '.name') }));
    return true;
  };

  // Muster state belongs to the realm, never to whichever war is being viewed.
  function bindMilitary(state, w) {
    if (!endpoint(w, 'player')) return;
    state.military = state.military || {};
    const pool = state.military.player = state.military.player || {};
    ['musterPool', 'mercCos', 'mass'].forEach(function (key) {
      const d = Object.getOwnPropertyDescriptor(w, key);
      if (d && d.get) return;
      if (w[key] !== undefined && pool[key] === undefined) pool[key] = w[key];
      Object.defineProperty(w, key, { configurable:true, enumerable:false,
        get:function () { return pool[key]; }, set:function (value) { pool[key] = value; } });
    });
  }
  const register = FB.registerOrdinaryWar;
  FB.registerOrdinaryWar = function (state, owner, war) {
    const reserved = [];
    if (initialized.has(state) && war && war.legacy === false) {
      const declaring = owner === 'player' && war.defending ? war.enemy : owner;
      let liege = liegeOf(state, declaring);
      const seen = {};
      while (liege && !seen[liege]) {
        seen[liege] = 1;
        if (FB.realmWars(state, liege).length) reserved.push({ rid:liege,
          capacity:liege === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, liege) });
        liege = liegeOf(state, liege);
      }
    }
    const w = register(state, owner, war);
    if (w) bindMilitary(state, w);
    reserved.forEach(function (entry) {
      const capacity = entry.rid === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, entry.rid);
      let recalled = Math.max(0, entry.capacity - capacity);
      (state.armies || []).filter(function (a) { return a.realm === entry.rid; }).forEach(function (a) {
        const units = FB.hostUnits(a), total = a.men;
        const count = Math.min(total, recalled);
        if (!count) return;
        let remaining = count;
        Object.keys(units).sort().forEach(function (key) {
          const removed = Math.min(units[key], Math.floor(count * units[key] / Math.max(1, total)));
          units[key] -= removed; remaining -= removed;
        });
        Object.keys(units).sort().forEach(function (key) { const removed = Math.min(units[key], remaining); units[key] -= removed; remaining -= removed; });
        a.men -= count; a.size = Math.max(a.men, (a.size || total) - count); recalled -= count;
        if (!a.men) FB.disbandArmy(state, a);
      });
    });
    return w;
  };
  const ensure = FB.ensureWars;
  FB.ensureWars = function (state) {
    const first = state && !initialized.has(state);
    ensure(state);
    if (first && state && state.wars) rows(state).forEach(function (w) { bindMilitary(state, w); });
  };
  const siege = FB.fns.war_siege;
  FB.fns.war_siege = function (state, ctx) {
    const w = current(state, 'player');
    if (w && !w.legacy && territorial(w)) return false; // seasonal occupation pulses own progress
    return siege(state, ctx);
  };
  const capture = FB.warCapture;
  FB.warCapture = function (state) {
    if (!context(state) && FB.realmWars(state, 'player').length > 1) return false;
    const w = current(state, 'player');
    if (w && !w.legacy && territorial(w)) return finishObjectives(state, w);
    return capture(state);
  };
  const capturePlayer = FB.maybeCapturePlayer;
  if (capturePlayer) FB.maybeCapturePlayer = function (state) {
    const result = capturePlayer.apply(FB, arguments);
    const w = current(state, 'player');
    if (w && state.player.flags.in_prison) state.player.captiveWarId = w.id;
    return result;
  };
  const friendly = FB.armyFriendlyProvince;
  FB.armyFriendlyProvince = function (state, army, pid) {
    const holder = (state.holder || {})[pid] || (state.owner || {})[pid];
    const occupation = FB.ordinaryOccupationControl(state, army, pid);
    if (occupation !== null) return occupation;
    if (holder && FB.armiesHostile(state, army, { realm:holder })) return false;
    return friendly(state, army, pid);
  };
  FB.ordinaryOccupationControl = function (state, army, pid) {
    const w = FB.ordinaryWarById(state, army.warId);
    if (!w || !w.occupations[pid] || !endpoint(w, army.realm)) return null;
    return w.occupations[pid].occupied ? army.realm === w.attacker : army.realm === w.defender;
  };
  const fortBlocks = FB.fortBlocksArmy;
  FB.fortBlocksArmy = function (state, pid, army) {
    const control = army && FB.ordinaryOccupationControl(state, army, pid);
    if (control !== null && control !== undefined) {
      const fort = FB.fortAt(state, pid);
      return !!(fort && fort.level && !fort.ruined && !control);
    }
    return fortBlocks(state, pid, army);
  };
  const recruitmentBlocked = FB.recruitmentCountyBlocked;
  FB.recruitmentCountyBlocked = function (state, rid, pid, hosts) {
    if (rows(state).some(function (w) {
      return w.occupations[pid] && w.occupations[pid].occupied && FB.warRealmContains(state, rid, w.defender);
    })) return true;
    let holder = (state.holder || {})[pid];
    const seen = {};
    while (holder && holder !== rid && !seen[holder]) {
      seen[holder] = 1;
      if (FB.realmWars(state, holder).length) return true;
      holder = liegeOf(state, holder);
    }
    return recruitmentBlocked(state, rid, pid, hosts);
  };
  const vassalLevy = FB.vassalLevyContribution;
  if (vassalLevy) FB.vassalLevyContribution = function (state, rid) {
    if (FB.realmWars(state, rid).length) return 0;
    return vassalLevy.apply(FB, arguments);
  };
  const joinHoly = FB.joinGreatHolyWar;
  FB.joinGreatHolyWar = function (state, camp, rid, vows) {
    rid = rid || 'player';
    const holy = state.greatHolyWar;
    if (holy && camp && (holy.participants[camp] || []).some(function (p) {
      return !!FB.ordinaryWarBetween(state, rid, p.realm);
    })) return false;
    return joinHoly(state, camp, rid, vows);
  };
  const outcome = FB.warOutcome;
  FB.warOutcome = function (state) {
    const w = current(state, 'player');
    if (!w || w.legacy || !territorial(w)) return outcome(state);
    const need = FBDATA.balance.warWinsToTakeProvince;
    if ((!w.defending && w.losses >= need) || (w.defending && w.wins >= need)) {
      return FB.settleOrdinaryWar(state, w.id, 'defeat');
    }
    // Attacking battlefield success can earn tribute, never unoccupied claims.
    if (!w.defending) return outcome(state);
    FB.maybeOfferSubmission(state);
  };
  Object.keys(FB.fns).filter(function (key) { return key.indexOf('war_') === 0 || key.indexOf('prison_') === 0; }).forEach(function (key) {
    const original = FB.fns[key];
    FB.fns[key] = function (state, ctx) {
      const args = arguments;
      if (!ctx || (ctx.warId === undefined && ctx.warEventId === undefined)) {
        if (!context(state) && FB.realmWars(state, 'player').length > 1 &&
            ['war_terms', 'war_accept_tribute', 'war_negotiated_withdrawal', 'war_submit', 'war_submission_tribute', 'war_press_on'].indexOf(key) >= 0) return false;
        return original.apply(FB.fns, args);
      }
      const w = FB.realmWars(state, 'player').filter(function (entry) {
        return ctx.warId !== undefined ? entry.id === ctx.warId : entry.eventId === ctx.warEventId;
      })[0];
      if (!w) return false;
      return FB.withOrdinaryWar(state, w.id, function () { return original.apply(FB.fns, args); });
    };
  });
  FB.remapWarRealm = function (state, from, to) {
    rows(state).forEach(function (w) {
      if (w.attacker === from) w.attacker = to;
      if (w.defender === from) w.defender = to;
      if (w.legacyOwner === from) w.legacyOwner = to;
      w.defending = w.defender === 'player';
      w.enemy = endpoint(w, 'player') ? (w.attacker === 'player' ? w.defender : w.attacker) : w.defender;
      bindMilitary(state, w);
      if (w.attacker === w.defender) { w.status = 'ended'; w.occupations = {}; }
      invalidateWars(state);
    });
    (state.armies || []).forEach(function (a) { if (a.realm === from) a.realm = to; });
    if (state.warLaws && state.warLaws[from]) { state.warLaws[to] = state.warLaws[to] || state.warLaws[from]; delete state.warLaws[from]; }
  };
  FB.campaignDaily = function (state) {
    rows(state).forEach(function (w) {
      if (w.enforcementOf) {
        const original = FB.ordinaryWarById(state, w.enforcementOf);
        if (!original || !original.peaceDemand || original.peaceDemand.liege !== liegeOf(state, original.attacker)) {
          FB.settleOrdinaryWar(state, w.id, 'invalid'); return;
        }
      }
      const d = w.peaceDemand;
      if (!d) return;
      if (d.liege !== liegeOf(state, w.attacker)) { delete w.peaceDemand; return; }
      if (d.status === 'pending' && state.turn >= d.deadline) d.status = 'refused';
      if (d.status === 'refused' && d.liege !== 'player' &&
          !FB.ordinaryWarBetween(state, d.liege, w.attacker) &&
          FB.realmStrength(state, d.liege) >= FB.realmStrength(state, w.attacker) * 1.2) FB.startPeaceEnforcement(state, w.id);
    });
  };
})();
