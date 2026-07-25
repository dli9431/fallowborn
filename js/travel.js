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
    state.eventQueue.push({
      id:id,
      ctx:{
        locationId:loc ? loc.id : travel.currentId,
        destinationId:dest ? dest.id : travel.destinationId
      },
      travel:true
    });
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
    return t;
  };

  FB.travelLocation = function (state) {
    const t = FB.travelEnsure(state);
    return FB.world.byId[t ? t.currentId : state.player.provinceId] || null;
  };

  /* Settled-only BFS. Authored straits are already part of FB.world.adj, so
     they remain legal without admitting decorative wasteland counties. */
  FB.travelRoute = function (fromPid, toPid) {
    if (fromPid === toPid) return [];
    if (!settled(fromPid) || !settled(toPid)) return null;
    const prev = {};
    const q = [fromPid];
    prev[fromPid] = fromPid;
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi];
      const adj = FB.world.adj[cur] || {};
      for (const nb in adj) {
        if (prev[nb] !== undefined || !settled(nb)) continue;
        prev[nb] = cur;
        if (nb === toPid) {
          const route = [toPid];
          let step = toPid;
          while (step !== fromPid) {
            step = prev[step];
            if (step !== fromPid) route.unshift(step);
          }
          return route;
        }
        q.push(nb);
      }
    }
    return null;
  };

  FB.travelCost = function (purposeId, routeOrLegs) {
    const def = purpose(purposeId);
    const legs = typeof routeOrLegs === 'number'
      ? routeOrLegs : ((routeOrLegs && routeOrLegs.length) || 0);
    return Math.ceil(2 + legs * 2 * 0.25) + ((def && def.cost) || 0);
  };

  FB.travelEligible = function (state) {
    const p = state.player;
    const c = me(state);
    FB.travelEnsure(state);
    if (p.travel) return FB.T('Already on the road.');
    if (!c || FB.ageOf(c, state.date.year) < 16) {
      return FB.T('Only an adult can take to the road.');
    }
    if (p.tier < 1 || p.tier > 2) {
      return FB.T('The road is open to freeholders and gentry.');
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

  function siteAllowed(state, site) {
    const c = me(state);
    const rel = FB.religionOf(c.religion);
    if (site.religions && site.religions.indexOf(c.religion) < 0) return false;
    if (site.religionGroups && site.religionGroups.indexOf(rel.group) < 0) return false;
    return true;
  }

  function addDestination(state, out, seen, purposeId, pid, realmId) {
    const p = state.player;
    if (!pid || pid === p.provinceId || seen[pid] || !settled(pid)) return;
    if (purposeId === 'pilgrimage' &&
      (historyHas(state, 'pilgrimage') || me(state).traits.indexOf('pilgrim') >= 0)) return;
    if (purposeId !== 'pilgrimage' && historyHas(state, purposeId, pid)) return;
    const route = FB.travelRoute(p.provinceId, pid);
    if (!route || !route.length) return;
    seen[pid] = 1;
    out.push({
      purpose:purposeId,
      destinationId:pid,
      destinationRealm:realmId || null,
      route:route,
      legs:route.length,
      days:route.length * balance('travelLegDays', 3),
      cost:FB.travelCost(purposeId, route)
    });
  }

  FB.travelDestinations = function (state, purposeId) {
    const def = purpose(purposeId);
    const out = [];
    const seen = {};
    if (!def || FB.travelEligible(state) !== true) return out;

    if (def.mode === 'sites') {
      const sites = FBDATA.travelSites || [];
      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        if (site.purpose === purposeId && siteAllowed(state, site)) {
          addDestination(state, out, seen, purposeId, site.provinceId, null);
        }
      }
    } else if (def.mode === 'developed') {
      const minDev = def.minDev || 4;
      for (let i = 0; i < FB.world.provs.length; i++) {
        const pr = FB.world.provs[i];
        if (!pr.wasteland && (state.dev[pr.id] || pr.dev0 || 1) >= minDev) {
          addDestination(state, out, seen, purposeId, pr.id, null);
        }
      }
    } else if (def.mode === 'capitals') {
      for (const rid in state.realms) {
        const realm = state.realms[rid];
        if (realm && realm.alive && realm.capital) {
          addDestination(state, out, seen, purposeId, realm.capital, rid);
        }
      }
    }
    out.sort(function (a, b) {
      if (a.legs !== b.legs) return a.legs - b.legs;
      const ap = FB.world.byId[a.destinationId];
      const bp = FB.world.byId[b.destinationId];
      return (ap ? ap.name : '').localeCompare(bp ? bp.name : '');
    });
    return out;
  };

  FB.travelStart = function (state, purposeId, destinationId, destinationRealm) {
    if (FB.travelEligible(state) !== true) return false;
    const def = purpose(purposeId);
    if (!def) return false;
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

    const p = state.player;
    const legDays = balance('travelLegDays', 3);
    p.gold -= choice.cost;
    p.cooldowns.take_road = state.turn;
    p.travel = {
      purpose:purposeId,
      homeId:p.provinceId,
      destinationId:choice.destinationId,
      destinationRealm:choice.destinationRealm,
      currentId:p.provinceId,
      phase:'outbound',
      remainingRoute:choice.route.slice(),
      outboundRoute:choice.route.slice(),
      visited:[p.provinceId],
      legDaysLeft:legDays,
      legDays:legDays,
      startTurn:state.turn,
      cost:choice.cost,
      encounters:{culture:0,road:0},
      seenCultures:{},
      seenEvents:{},
      completed:false
    };
    p.travel.seenCultures[me(state).culture] = 1;
    clearQueued(state);
    FB.news(state, FB.msg('news.travel.departed',
      '🧭 Set out from {home} for {destination}.', {
        home:FB.world.byId[p.travel.homeId].name,
        destination:FB.world.byId[p.travel.destinationId].name
      }));
    if (FB.map) {
      FB.map.travelPreview = null;
      FB.map.travelTargets = null;
      FB.map.request();
    }
    if (FB.ui && FB.ui.refresh) FB.ui.refresh();
    return true;
  };

  function eventPool(kind, travel) {
    const out = [];
    const events = FBDATA.events || [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev.travel || ev.travel.kind !== kind) continue;
      if (kind !== 'work' && travel.seenEvents[ev.id]) continue;
      if (ev.travel.purpose && ev.travel.purpose !== travel.purpose) continue;
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
    const pool = eventPool(kind, t);
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
    let pool = eventPool('work', t);
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

  FB.travelTick = function (state) {
    const p = state.player;
    const t = FB.travelEnsure(state);
    if (!t) return;
    if (p.dead || p.tier < 1 || p.tier > 2 || (p.flags && p.flags.in_prison) ||
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
    return remaining <= 0 ? true : FB.T(
      'Stay and work here for {days} more days before returning home.', {
        days:remaining
      });
  };

  FB.travelSettlementEligible = function (state) {
    const p = state.player;
    const t = FB.travelEnsure(state);
    if (!t || t.phase !== 'arrived') return FB.T('Reach the destination first.');
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
      FB.news(state, FB.msg('news.travel.cancelled',
        '🧭 The journey ends as your station or obligations change. The household remains at {home}.', {
          home:FB.world.byId[t.homeId].name
        }));
      if (FB.validateFocus) FB.validateFocus(state);
    }
    if (FB.map) FB.map.request();
    return true;
  };

  FB.travelValidate = function (state) {
    const t = FB.travelEnsure(state);
    if (!t) return true;
    const p = state.player;
    if (p.dead || p.tier < 1 || p.tier > 2 || (p.flags && p.flags.in_prison) ||
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
    queueItem(state, 'travel_arrival_choice', t);
  };

  FB.fns = FB.fns || {};
  FB.fns.travel_capstone_done = function (state) {
    FB.travelCapstoneDone(state);
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
