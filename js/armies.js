/* Fallowborn — field armies: mustered hosts that march the map and fight
   when they meet. One host per sovereign realm (levies with hired companies
   folded in), raised while a war lasts and disbanded at peace. The player
   musters by deed or muster event and orders marches by tapping the map;
   AI hosts hunt enemy hosts and otherwise march on the enemy's seat.
   See docs/designs/war.md. */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* ---------- state ----------
     state.armies: [{ id, realm ('player' or a sovereign realm id), men,
       mercs, at, from, moveLeft, path[], goal, broken }]
       at/from are province ids; while moveLeft > 0 the host is on the road
       between them (rendered mid-way). path[0] is the next province.
     state.armyDown: { realmId: turn } — a destroyed host may muster again
       only after balance.armyRearmDays. */
  FB.armiesEnsure = function (state) {
    if (!state.armies) state.armies = [];
    if (!state.armyDown) state.armyDown = {};
  };

  function B() { return FBDATA.balance; }

  function provName(pid) {
    const pr = FB.world.byId[pid];
    return pr ? pr.name : '?';
  }

  FB.hostOf = function (state, rid) {
    FB.armiesEnsure(state);
    for (const a of state.armies) if (a.realm === rid) return a;
    return null;
  };
  FB.playerHost = function (state) { return FB.hostOf(state, 'player'); };

  FB.armiesAt = function (state, pid) {
    FB.armiesEnsure(state);
    return state.armies.filter(function (a) { return a.at === pid; });
  };

  /* are two armies from warring camps? (armies belong to sovereigns, so a
     plain realm-id comparison against the war objects is enough) */
  FB.armiesHostile = function (state, a, b) {
    if (a.realm === b.realm) return false;
    const w = state.player.war;
    if (a.realm === 'player') return !!(w && w.enemy === b.realm);
    if (b.realm === 'player') return !!(w && w.enemy === a.realm);
    const ra = state.realms[a.realm], rb = state.realms[b.realm];
    if (ra && ra.war && ra.war.enemy === b.realm) return true;
    if (rb && rb.war && rb.war.enemy === a.realm) return true;
    return false;
  };

  /* the sovereign rid is currently fighting — its own war, a war declared
     on it, or the player's war against it (dead enemies don't count) */
  function warEnemyOf(state, rid) {
    const r = state.realms[rid];
    if (r && r.war) {
      const e = state.realms[r.war.enemy];
      if (e && e.alive) return r.war.enemy;
    }
    const pw = state.player.war;
    if (pw && pw.enemy === rid) return 'player';
    for (const id in state.realms) {
      const o = state.realms[id];
      if (o.alive && o.war && o.war.enemy === rid) return id;
    }
    return null;
  }

  function playerHome(state) {
    const p = state.player;
    return (state.realms.player && state.realms.player.alive && state.realms.player.capital) ||
      (p.provs && p.provs[0]) || p.provinceId;
  }

  /* ---------- raising & disbanding ---------- */

  FB.raisePlayerHost = function (state) {
    FB.armiesEnsure(state);
    const p = state.player, w = p.war;
    if (!w) return null;
    const existing = FB.playerHost(state);
    if (existing) return existing;
    const down = state.armyDown['player'];
    if (down !== undefined && state.turn - down < B().armyRearmDays) return null;
    let men = FB.playerLevy(state) + (w.mercCos || 0) * 150;
    if (w.mass) men = Math.round(men * 1.35); // the great levy
    men = Math.max(40, Math.round(men));
    const home = playerHome(state);
    const host = { id: FB.uid(), realm: 'player', men: men, mercs: (w.mercCos || 0) * 150,
      at: home, from: home, moveLeft: 0, path: [], goal: null };
    state.armies.push(host);
    FB.news(state, '🚩 The host musters at ' + provName(home) + ' — ' + men + ' men take the field.');
    if (FB.map) FB.map.request();
    return host;
  };

  function raiseAIHost(state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return null;
    const men = Math.max(60, Math.round(FB.realmStrength(state, rid) * B().levyPerDev * (B().aiHostPerDev || 0.3)));
    const host = { id: FB.uid(), realm: rid, men: men, mercs: 0,
      at: r.capital, from: r.capital, moveLeft: 0, path: [], goal: null };
    state.armies.push(host);
    if (state.player.war && state.player.war.enemy === rid) {
      FB.news(state, '🚩 ' + r.name + ' takes the field — some ' + men + ' spears against you.');
    }
    return host;
  }

  function disband(state, army) {
    const i = state.armies.indexOf(army);
    if (i >= 0) state.armies.splice(i, 1);
    if (selId === army.id) selId = null;
  }

  /* ---------- pathing (BFS over province adjacency) ----------
     Returns the route excluding the start, including the goal; null when
     unreachable. */
  FB.findPath = function (fromPid, toPid) {
    if (fromPid === toPid) return [];
    const adj = FB.world.adj;
    const prev = {}; prev[fromPid] = fromPid;
    const q = [fromPid];
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi];
      for (const nb in (adj[cur] || {})) {
        if (prev[nb] !== undefined) continue;
        prev[nb] = cur;
        if (nb === toPid) {
          const path = [toPid];
          let c = toPid;
          while (c !== fromPid) { c = prev[c]; if (c !== fromPid) path.unshift(c); }
          return path;
        }
        q.push(nb);
      }
    }
    return null;
  };

  /* order a host toward a province; ordering its own province halts it */
  FB.orderArmy = function (state, army, destPid) {
    if (!destPid) return false;
    if (destPid === army.at && army.moveLeft <= 0) { army.path = []; army.goal = null; return true; }
    const path = FB.findPath(army.at, destPid);
    if (!path) return false;
    army.path = path;
    army.goal = destPid;
    return true;
  };

  /* ---------- the daily tick (called from G.passDay) ---------- */

  function march(state, army) {
    if (army.moveLeft > 0) army.moveLeft--;
    if (army.moveLeft > 0) return;
    if (!army.path || !army.path.length) return;
    army.from = army.at;
    army.at = army.path.shift();
    army.moveLeft = B().armyMarchDays; // every hop costs the march, last included
  }

  /* what an AI host wants: run home when broken, hunt the nearest enemy
     host, else march on the enemy's seat */
  function aiGoal(state, army) {
    const r = state.realms[army.realm];
    if (!r) return army.at;
    if (army.broken !== undefined && state.turn - army.broken < 40) return r.capital;
    let best = null, bd = Infinity;
    const pa = FB.world.byId[army.at];
    for (const o of state.armies) {
      if (o === army || !FB.armiesHostile(state, army, o)) continue;
      const pb = FB.world.byId[o.at];
      if (!pa || !pb) continue;
      const d = (pa.cx - pb.cx) * (pa.cx - pb.cx) + (pa.cy - pb.cy) * (pa.cy - pb.cy);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) return best.at;
    const en = warEnemyOf(state, army.realm);
    if (en === 'player') return playerHome(state);
    const er = en && state.realms[en];
    return er ? er.capital : army.at;
  }

  function battlePower(state, army) {
    let pw;
    if (army.realm === 'player') {
      const me = state.chars[state.player.charId];
      pw = army.men * (1 + (me ? FB.skillOf(me, 'mar') : 5) / 14);
      // the same edges the war council grants carry onto the field
      pw *= 1 + FB.techBonus(state, 'battle') + FB.holdingBonus(state, 'battle') +
        FB.itemBonus(state, 'battle') + (state.player.flags.blessed_war ? 0.06 : 0);
    } else {
      const r = state.realms[army.realm];
      pw = army.men * (1 + (r && r.ruler ? r.ruler.mar : 5) / 22);
    }
    return pw;
  }

  /* a field win/loss in an AI-vs-AI war tilts that war's yearly resolution */
  function trackAIWar(state, winnerSov, loserSov) {
    const rw = state.realms[winnerSov];
    if (rw && rw.war && rw.war.enemy === loserSov) { rw.war.fw = (rw.war.fw || 0) + 1; return; }
    const rl = state.realms[loserSov];
    if (rl && rl.war && rl.war.enemy === winnerSov) rl.war.fl = (rl.war.fl || 0) + 1;
  }

  function resolveBattle(state, pid, a, b) {
    const sa = battlePower(state, a) * FB.rf(0.75, 1.25);
    const sb = battlePower(state, b) * FB.rf(0.75, 1.25);
    const winner = sa >= sb ? a : b, loser = sa >= sb ? b : a;
    const sw = Math.max(sa, sb), sl = Math.min(sa, sb);
    const ratio = FB.clamp(sl / sw, 0.3, 1); // a close fight costs the winner too
    winner.men = Math.max(1, winner.men - Math.round(winner.men * (B().battleWinLoss || 0.28) * ratio));
    loser.men -= Math.round(loser.men * (B().battleLoseLoss || 0.62));
    const pInvolved = winner.realm === 'player' || loser.realm === 'player';
    // the beaten host routs for home — or disperses entirely
    if (loser.men < 40) {
      disband(state, loser);
      state.armyDown[loser.realm] = state.turn;
    } else {
      loser.broken = state.turn;
      FB.orderArmy(state, loser, loser.realm === 'player' ? playerHome(state) : state.realms[loser.realm].capital);
      loser.moveLeft = Math.min(loser.moveLeft, 1); // it limps away at once
    }
    if (pInvolved) {
      const won = winner.realm === 'player';
      state.eventQueue.push({ id: won ? 'field_battle_won' : 'field_battle_lost', ctx: { pid: pid } });
      if (won) FB.fns.war_win(state); else FB.fns.war_loss(state);
    } else {
      trackAIWar(state, winner.realm, loser.realm);
      const p = state.player;
      const wname = state.realms[winner.realm] ? state.realms[winner.realm].name : winner.realm;
      const lname = state.realms[loser.realm] ? state.realms[loser.realm].name : loser.realm;
      if (FB.game.observe || pid === p.provinceId || (FB.world.adj[p.provinceId] || {})[pid]) {
        FB.news(state, '⚔ Battle at ' + provName(pid) + ' — ' + wname + ' breaks the host of ' + lname + '.');
      }
    }
    if (FB.map) FB.map.request();
  }

  FB.armyTick = function (state) {
    FB.armiesEnsure(state);
    const p = state.player;

    // sovereigns at war raise their host (the player musters by deed/event)
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || r.liege || id === 'player') continue;
      if (!warEnemyOf(state, id)) continue;
      if (FB.hostOf(state, id)) continue;
      const down = state.armyDown[id];
      if (down !== undefined && state.turn - down < B().armyRearmDays) continue;
      raiseAIHost(state, id);
    }

    // peace: hosts go home — this one rule covers every way a war can end
    for (let i = state.armies.length - 1; i >= 0; i--) {
      const a = state.armies[i];
      if (a.realm === 'player') {
        if (!p.war) {
          disband(state, a);
          FB.news(state, '🏳 The war is done — the host disbands to hearth and field.');
        }
        continue;
      }
      const r = state.realms[a.realm];
      if (!r || !r.alive || !warEnemyOf(state, a.realm)) disband(state, a);
    }

    // orders & marches
    for (const a of state.armies) {
      if (a.realm !== 'player') {
        const goal = aiGoal(state, a);
        if (goal !== a.goal || ((!a.path || !a.path.length) && goal !== a.at && a.moveLeft <= 0)) {
          FB.orderArmy(state, a, goal);
        }
      }
      march(state, a);
    }
    if (state.armies.length && FB.map) FB.map.request(); // hosts on the road redraw daily

    // battles: hostile hosts sharing a province (one clash per province per day)
    const byProv = {};
    for (const a of state.armies) (byProv[a.at] = byProv[a.at] || []).push(a);
    for (const pid in byProv) {
      const here = byProv[pid];
      if (here.length < 2) continue;
      let pair = null;
      for (let i = 0; i < here.length && !pair; i++) {
        for (let j = i + 1; j < here.length; j++) {
          if (FB.armiesHostile(state, here[i], here[j])) { pair = [here[i], here[j]]; break; }
        }
      }
      if (pair) resolveBattle(state, pid, pair[0], pair[1]);
    }
  };

  /* ---------- selection & tap handling ---------- */

  let selId = null;
  FB.selectedArmy = function (state) {
    if (!selId) return null;
    FB.armiesEnsure(state);
    for (const a of state.armies) if (a.id === selId && a.realm === 'player') return a;
    selId = null;
    return null;
  };
  FB.selectArmy = function (id) { selId = id || null; };

  /* world-space position: mid-road while between provinces */
  function worldPos(army) {
    const pa = FB.world.byId[army.at];
    if (!pa) return [0, 0];
    if (army.moveLeft > 0 && army.from && army.from !== army.at) {
      const pf = FB.world.byId[army.from];
      if (pf) {
        const f = 1 - army.moveLeft / B().armyMarchDays;
        return [pf.cx + (pa.cx - pf.cx) * f, pf.cy + (pa.cy - pf.cy) * f];
      }
    }
    return [pa.cx, pa.cy];
  }

  FB.armyAtWorld = function (state, wx, wy, tol) {
    FB.armiesEnsure(state);
    let best = null, bd = tol * tol;
    for (const a of state.armies) {
      const pos = worldPos(a);
      const d = (pos[0] - wx) * (pos[0] - wx) + (pos[1] - wy) * (pos[1] - wy);
      if (d <= bd) { bd = d; best = a; }
    }
    return best;
  };

  /* A map tap arrives here first (from FB.map.onTap in ui.js). Returns true
     when the tap was army business: select your host, tap a province to
     march it, tap the selected host to halt, tap elsewhere to let go. */
  FB.armyTap = function (state, pr, wx, wy) {
    const sel = FB.selectedArmy(state);
    let hit = null;
    if (wx !== undefined && FB.map && FB.map.zoom) {
      hit = FB.armyAtWorld(state, wx, wy, 16 / FB.map.zoom);
    } else if (pr) {
      // keyboard taps carry no pointer position: your host standing in the
      // tapped province is the target (Enter/Shift+arrows work the map too)
      const here = FB.armiesAt(state, pr.id);
      for (const a of here) if (a.realm === 'player') { hit = a; break; }
    }
    if (hit && hit.realm === 'player') {
      if (sel && sel.id === hit.id) {
        hit.path = []; hit.goal = null;
        FB.selectArmy(null);
        if (FB.ui) FB.ui.toast('🚩 The host holds at ' + provName(hit.at) + '.');
        return true;
      }
      FB.selectArmy(hit.id);
      if (FB.ui) FB.ui.toast('🚩 Your host — ' + hit.men + ' men at ' + provName(hit.at) +
        '. Tap a province to march; tap the host again to halt.');
      return false; // let the tap through so the Land tab shows where it stands
    }
    if (sel) {
      if (pr && !pr.wasteland) {
        if (FB.orderArmy(state, sel, pr.id)) {
          if (FB.ui) FB.ui.toast('🚩 The host marches on ' + pr.name + '.');
          if (FB.map) FB.map.request();
        }
        return true;
      }
      FB.selectArmy(null);
      return true;
    }
    return false;
  };

  /* ---------- rendering (called from mapview's render pass) ---------- */

  FB.renderArmies = function (ctx, toScreen, z, dpr) {
    const s = FB.state;
    if (!s || !s.armies || !s.armies.length) return;
    const sel = FB.selectedArmy(s);

    // the selected host's planned route
    if (sel && sel.path && sel.path.length) {
      ctx.strokeStyle = 'rgba(255,240,190,0.85)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.beginPath();
      const p0 = toScreen(worldPos(sel)[0], worldPos(sel)[1]);
      ctx.moveTo(p0[0], p0[1]);
      for (const pid of sel.path) {
        const pr = FB.world.byId[pid];
        if (!pr) continue;
        const sp = toScreen(pr.cx, pr.cy);
        ctx.lineTo(sp[0], sp[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const counts = {}; // hosts sharing a province fan out around the centroid
    for (const a of s.armies) {
      const idx = counts[a.at] || 0; counts[a.at] = idx + 1;
      const pos = worldPos(a);
      const sc = toScreen(pos[0], pos[1]);
      const u = Math.max(8, 9 + Math.min(5, z)) * dpr;
      let x = sc[0], y = sc[1];
      if (idx) { const ang = idx * 2.4; x += Math.cos(ang) * u * 0.95; y += Math.sin(ang) * u * 0.95; }
      if (x < -40 || y < -40 || x > ctx.canvas.width + 40 || y > ctx.canvas.height + 40) continue;
      const mine = a.realm === 'player';
      const realm = mine ? null : s.realms[a.realm];
      const col = mine ? '#f0c840' : (realm ? realm.color : '#888888');
      const hostileToMe = !mine && s.player.war && s.player.war.enemy === a.realm;

      // ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y + u * 0.32, u * 0.62, u * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      // three spearmen: dark bodies, round heads, sloped spears
      ctx.strokeStyle = '#221d16'; ctx.lineWidth = Math.max(1, u * 0.09);
      ctx.fillStyle = '#2c2620';
      for (let k = -1; k <= 1; k++) {
        const sx = x + k * u * 0.34, sy = y + (k === 0 ? 0 : u * 0.1);
        ctx.beginPath(); ctx.arc(sx, sy - u * 0.34, u * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx, sy - u * 0.22); ctx.lineTo(sx, sy + u * 0.26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + u * 0.12, sy + u * 0.1); ctx.lineTo(sx + u * 0.3, sy - u * 0.5); ctx.stroke();
      }
      // banner: pole + pennant in the host's color
      ctx.strokeStyle = '#1c1712'; ctx.lineWidth = Math.max(1, u * 0.08);
      ctx.beginPath(); ctx.moveTo(x + u * 0.52, y + u * 0.3); ctx.lineTo(x + u * 0.52, y - u * 0.95); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + u * 0.52, y - u * 0.95);
      ctx.lineTo(x + u * 1.05, y - u * 0.78);
      ctx.lineTo(x + u * 0.52, y - u * 0.58);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      // rings: red for your enemy, gold for your selected host
      if (hostileToMe) {
        ctx.strokeStyle = 'rgba(200,40,30,0.9)'; ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); ctx.arc(x, y - u * 0.15, u * 0.95, 0, Math.PI * 2); ctx.stroke();
      }
      if (sel && sel.id === a.id) {
        ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.arc(x, y - u * 0.15, u * 1.05, 0, Math.PI * 2); ctx.stroke();
      }
      // strength label
      if (z >= 1.3) {
        ctx.font = Math.round(9 * dpr) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(20,16,10,0.8)';
        const lbl = a.men >= 1000 ? (Math.round(a.men / 100) / 10) + 'k' : String(a.men);
        ctx.strokeText(lbl, x, y + u * 0.75);
        ctx.fillStyle = mine ? '#ffe9a8' : 'rgba(255,250,235,0.9)';
        ctx.fillText(lbl, x, y + u * 0.75);
      }
    }
  };
})();
