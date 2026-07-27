/* Fallowborn — field armies: mustered hosts that march the map and fight
   when they meet. One host per sovereign realm (levies with hired companies
   folded in), raised while an ordinary or great holy war lasts. The player's
   host musters the moment war begins (FB.warFooting) and is ordered by
   tapping the map — or by the automated stances (G.auto.hosts: defensive /
   offensive), which steer only an idle host and always yield to a
   hand-tapped route. AI hosts hunt enemy hosts and otherwise march on the
   enemy's seat. Hosts resting on their sovereign's own land slowly refill
   toward their mustered strength. See docs/designs/war.md. */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* ---------- state ----------
     state.armies: [{ id, realm ('player' or a sovereign realm id), men, size,
       units, at, from, moveLeft, path[], goal, broken, huntPrey, manual,
       holdManual }]
       `at` is the province the host stands in; `from` the one it left. While
       moveLeft > 0 the host is on the road toward path[0] and `at` advances
       only when the leg completes; the map marker stays on `at`. size is the
       mustered strength a resting host refills toward. huntPrey (player host
       only) is a realm id whose host is tracked and re-pathed onto each day.
       manual / holdManual (player host only) mark a hand-tapped route still
       playing out and a hand-given halt — the automated stances never touch
       either.
       units: { levy, arch, cav, ret, mercs } — the host's composition (men is
       always the total). Each class fights at its own quality
       (balance.qualityLevy/Archer/Cavalry/Retinue/Merc); battle casualties fall
       levy-first and men-at-arms last, and a resting host refills with fresh
       levy only — the slain professionals are not replaced mid-war.
     state.armyDown: { realmId: turn } — a destroyed host may muster again
       only after balance.armyRearmDays. */
  FB.armiesEnsure = function (state) {
    if (!state.armies) state.armies = [];
    if (!state.armyDown) state.armyDown = {};
  };

  /* a host's composition, migrating hosts from before levy tiers (their men
     were all levy but the hired companies) */
  FB.hostUnits = function (army) {
    if (!army.units) {
      const mercs = army.mercs || 0;
      army.units = {
        levy:Math.max(0, army.men - mercs), arch:0, cav:0, ret:0, mercs:mercs
      };
    }
    for (const key of ['levy', 'arch', 'cav', 'ret', 'mercs']) {
      if (!isFinite(Number(army.units[key])) || Number(army.units[key]) < 0) {
        army.units[key] = 0;
      }
    }
    return army.units;
  };

  /* weighted battle quality of a composition: the average punch of one man */
  FB.compQuality = function (units, men) {
    if (!units || !men) return 1;
    const bal = B();
    return (units.levy * (bal.qualityLevy || 1) + units.arch * (bal.qualityArcher || 1) +
      (units.cav || 0) * (bal.qualityCavalry || 1) +
      units.ret * (bal.qualityRetinue || 1) + (units.mercs || 0) * (bal.qualityMerc || 1)) / men;
  };

  /* AI realms keep no buildings: their baseline professional core is joined
     by nation-specific military technology. */
  function aiFracs(state, rid) {
    const bal = B();
    const tech = FB.techAIUnits ? FB.techAIUnits(state, rid) : {};
    let r = (bal.aiRetinueFrac || 0) + (tech.ret || 0);
    let a = (bal.aiArcherFrac || 0) + (tech.arch || 0);
    let c = tech.cav || 0;
    const professional = r + a + c;
    if (professional > 0.9) {
      const scale = 0.9 / professional;
      r *= scale; a *= scale; c *= scale;
    }
    return { ret:r, arch:a, cav:c };
  }
  FB.aiHostQuality = function (state, rid) {
    const bal = B(), f = aiFracs(state, rid);
    return (1 - f.ret - f.arch - f.cav) * (bal.qualityLevy || 1) +
      f.arch * (bal.qualityArcher || 1) + f.cav * (bal.qualityCavalry || 1) +
      f.ret * (bal.qualityRetinue || 1);
  };

  function B() { return FBDATA.balance; }
  function requestMap() { if (FB.map) FB.map.request(); }

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

  function hostUpkeepParts(units, mercenaryCompanies) {
    const bal = B();
    const base = bal.hostLogisticsBase === undefined ? 2 : bal.hostLogisticsBase;
    const levy = Math.max(0, Number(units.levy) || 0) / 100 *
      (bal.hostLogisticsLevyPer100 === undefined ? 0.5 : bal.hostLogisticsLevyPer100);
    const archers = Math.max(0, Number(units.arch) || 0) / 100 *
      (bal.hostLogisticsArcherPer100 === undefined ? 1 : bal.hostLogisticsArcherPer100);
    const cavalry = Math.max(0, Number(units.cav) || 0) / 100 *
      (bal.hostLogisticsCavalryPer100 === undefined ? 2 : bal.hostLogisticsCavalryPer100);
    const retinue = Math.max(0, Number(units.ret) || 0) / 100 *
      (bal.hostLogisticsRetinuePer100 === undefined ? 2 : bal.hostLogisticsRetinuePer100);
    const mercenaries = Math.max(0, Number(mercenaryCompanies) || 0) *
      (bal.hostLogisticsMercenaryCompany === undefined
        ? 4 : bal.hostLogisticsMercenaryCompany);
    return {
      base:base, levy:levy, archers:archers, cavalry:cavalry, retinue:retinue,
      mercenaries:mercenaries,
      total:base + levy + archers + cavalry + retinue + mercenaries
    };
  }

  /* Current seasonal cost of the live player host. A missing (disbanded or
     shattered) host has no base logistics and therefore costs nothing. */
  FB.playerHostUpkeepParts = function (state) {
    const host = FB.playerHost(state);
    if (!host) {
      return {
        base:0, levy:0, archers:0, cavalry:0, retinue:0,
        mercenaries:0, campaignModifier:0, total:0
      };
    }
    const units = FB.hostUnits(host);
    const companySize = B().mercCompanySize || 150;
    const contracted = state.player.war && state.player.war.mercCos;
    const companies = contracted || Math.ceil((units.mercs || 0) / companySize);
    const parts = hostUpkeepParts(units, companies);
    const rate = FB.campaignHostModBonus
      ? FB.campaignHostModBonus(state, 'supplyUse') : 0;
    parts.campaignModifier = parts.total * rate;
    parts.total = Math.max(0, parts.total + parts.campaignModifier);
    return parts;
  };

  /* Declaration preview: the present peacetime composition at an ordinary
     muster, before a great levy, mercenaries, or defensive allies join it. */
  FB.playerMusterUpkeepParts = function (state) {
    const comp = FB.playerComposition(state);
    const units = {
      levy:comp.levy, arch:comp.arch, cav:comp.cav || 0, ret:comp.ret, mercs:0
    };
    const men = units.levy + units.arch + units.cav + units.ret;
    const floor = B().armyMinMen || 40;
    if (men < floor) units.levy += floor - men;
    return hostUpkeepParts(units, 0);
  };

  FB.armiesAt = function (state, pid) {
    FB.armiesEnsure(state);
    return state.armies.filter(function (a) { return a.at === pid; });
  };

  /* are two armies from warring camps? (armies belong to sovereigns, so a
     plain realm-id comparison against the war objects is enough). Reads the
     live war objects, so it stays correct even mid-tick when a battle ends
     a war — the per-tick `warring` map below is only for the hot loops. */
  FB.armiesHostile = function (state, a, b) {
    if (a.realm === b.realm) return false;
    if (FB.greatHolyWarCamp) {
      const greatCampA = FB.greatHolyWarCamp(state, a.realm);
      const greatCampB = FB.greatHolyWarCamp(state, b.realm);
      if (greatCampA && greatCampB) return greatCampA !== greatCampB;
    }
    const w = state.player.war;
    if (a.realm === 'player') return !!(w && w.enemy === b.realm);
    if (b.realm === 'player') return !!(w && w.enemy === a.realm);
    const ra = state.realms[a.realm], rb = state.realms[b.realm];
    if (ra && ra.war && ra.war.enemy === b.realm) return true;
    if (rb && rb.war && rb.war.enemy === a.realm) return true;
    return false;
  };

  /* who fights whom, built once per tick: realmId → enemyId, both directions,
     plus the player's personal war ('player' ↔ its enemy). Keeps the daily
     raise/order loops O(realms + armies) instead of O(realms²). */
  function warringMap(state) {
    const m = {};
    const pw = state.player.war;
    if (pw && pw.enemy) { m['player'] = pw.enemy; m[pw.enemy] = 'player'; }
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || !r.war) continue;
      const e = state.realms[r.war.enemy];
      if (!e || !e.alive) continue;
      m[id] = r.war.enemy; // a realm's own declaration wins
      if (!m[r.war.enemy]) m[r.war.enemy] = id;
    }
    if (state.greatHolyWar && state.greatHolyWar.phase === 'active' &&
        FB.greatHolyWarEnemies) {
      for (const campName of ['attackers', 'defenders']) {
        const participants = state.greatHolyWar.participants[campName] || [];
        for (const participant of participants) {
          if (!participant.sovereign) continue;
          const enemies = FB.greatHolyWarEnemies(state, participant.realm);
          m[participant.realm] = enemies.length ? enemies[0] : '__great_holy_war__';
        }
      }
      if (FB.playerGreatHolyWarHostActive && FB.playerGreatHolyWarHostActive(state)) {
        const playerEnemies = FB.greatHolyWarEnemies(state, 'player');
        m.player = playerEnemies.length ? playerEnemies[0] : '__great_holy_war__';
      }
    }
    return m;
  }

  /* how far a shattered side has re-formed: 1 while unbloodied, ramping from
     a floor back to 1 across the rearm window. The war council's abstract
     battle reads this so a just-broken army fields only a remnant. */
  FB.rearmScale = function (state, rid) {
    FB.armiesEnsure(state);
    const down = state.armyDown[rid];
    if (down === undefined) return 1;
    return FB.clamp((state.turn - down) / B().armyRearmDays, 0.15, 1);
  };

  function playerHome(state) {
    const p = state.player;
    return (state.realms.player && state.realms.player.alive && state.realms.player.capital) ||
      (p.provs && p.provs[0]) || p.provinceId;
  }

  /* ---------- raising & disbanding ---------- */

  FB.raisePlayerHost = function (state) {
    FB.armiesEnsure(state);
    const p = state.player, w = p.war;
    const greatHost = FB.playerGreatHolyWarHostActive &&
      FB.playerGreatHolyWarHostActive(state);
    if (!w && !greatHost) return null;
    const existing = FB.playerHost(state);
    if (existing) return existing;
    const down = state.armyDown['player'];
    if (down !== undefined && state.turn - down < B().armyRearmDays) return null;
    const cs = B().mercCompanySize || 150;
    const comp = FB.playerComposition(state);
    const units = {
      levy:comp.levy, arch:comp.arch, cav:comp.cav || 0, ret:comp.ret,
      mercs: (w && w.mercCos || 0) * cs
    };
    if (w && w.mass) units.levy = Math.round(units.levy * (B().massLevyMult || 1.35)); // the great levy
    const allied = w && w.defending && FB.alliedReinforcement
      ? FB.alliedReinforcement(state, 'player') : { ally: null, men: 0 };
    if (allied.men) units.levy += allied.men;
    let men = units.levy + units.arch + units.cav + units.ret + units.mercs;
    const floor = B().armyMinMen || 40;
    if (men < floor) { units.levy += floor - men; men = floor; }
    const home = playerHome(state);
    const host = { id: FB.uid(), realm: 'player', men: men, size: men, units: units,
      at: home, from: home, moveLeft: 0, path: [], goal: null };
    if (allied.men) host.allied = allied;
    state.armies.push(host);
    FB.news(state, FB.msg('news.army.player_musters',
      '🚩 The host musters at {province} — {men} men take the field.',
      { province: provName(home), men: men }));
    if (!p.flags.hostHintShown) {
      p.flags.hostHintShown = 1; // once per save: the host waits for hand-tapped orders
      if (FB.ui) FB.ui.toast('🚩 Your host has mustered — tap it on the map, then tap a province to march.');
    }
    requestMap();
    return host;
  };

  function raiseAIHost(state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return null;
    let men = FB.aiBaseHost(state, rid);
    let defending = !!(state.player.war && !state.player.war.defending && state.player.war.enemy === rid);
    if (!defending) {
      for (const id in state.realms) {
        const attacker = state.realms[id];
        if (attacker && attacker.alive && attacker.war && attacker.war.enemy === rid) {
          defending = true; break;
        }
      }
    }
    const allied = !FB.greatHolyWarCamp(state, rid) && defending && FB.alliedReinforcement
      ? FB.alliedReinforcement(state, rid) : { ally: null, men: 0 };
    men += allied.men;
    const f = aiFracs(state, rid);
    const base = men - allied.men;
    const units = {
      ret:Math.round(base * f.ret), arch:Math.round(base * f.arch),
      cav:Math.round(base * f.cav), levy:0, mercs:0
    };
    units.levy = base - units.ret - units.arch - units.cav + allied.men;
    const host = { id: FB.uid(), realm: rid, men: men, size: men, units: units,
      at: r.capital, from: r.capital, moveLeft: 0, path: [], goal: null };
    if (allied.men) host.allied = allied;
    state.armies.push(host);
    if (state.player.war && state.player.war.enemy === rid) {
      FB.news(state, FB.msg('news.army.enemy_musters',
        '🚩 {realm} takes the field — some {men} spears against you.',
        { realm: r.name, men: men }));
    }
    requestMap();
    return host;
  }

  function disband(state, army) {
    const i = state.armies.indexOf(army);
    if (i >= 0) state.armies.splice(i, 1);
    if (selId === army.id) selId = null;
    requestMap();
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

  /* order a host toward a province; ordering its own province halts it
     (mid-road included). A failed order leaves no stale route behind, and a
     standing host starts its first leg at once — every leg, first included,
     costs balance.armyMarchDays. */
  FB.armyMarchDays = function (state, realmId) {
    const base = FB.techArmyMarchDays
      ? FB.techArmyMarchDays(state, realmId) : B().armyMarchDays;
    const speed = realmId === 'player' && FB.campaignHostModBonus
      ? FB.campaignHostModBonus(state, 'marchSpeed') : 0;
    return Math.max(1, Math.round(base / Math.max(0.05, 1 + speed)));
  };

  FB.orderArmy = function (state, army, destPid) {
    if (!destPid) return false;
    if (destPid === army.at) {
      army.path = []; army.goal = null; army.moveLeft = 0;
      requestMap();
      return true;
    }
    const path = FB.findPath(army.at, destPid);
    if (!path) {
      army.path = []; army.goal = null;
      requestMap();
      return false;
    }
    army.path = path;
    army.goal = destPid;
    if (army.moveLeft <= 0) {
      army.from = army.at;
      army.moveLeft = FB.armyMarchDays(state, army.realm);
    }
    requestMap();
    return true;
  };

  /* ---------- the daily tick (called from G.passDay) ---------- */

  function march(state, army) {
    if (army.moveLeft > 0) {
      army.moveLeft--;
      if (army.moveLeft <= 0 && army.path && army.path.length) {
        // the leg completes: the host steps into the next province
        army.from = army.at;
        army.at = army.path.shift();
        if (army.path.length) {
          army.moveLeft = FB.armyMarchDays(state, army.realm);
        }
        requestMap();
      }
      return;
    }
    // standing with a route but no clock (old save): begin the next leg
    if (army.path && army.path.length) {
      army.from = army.at;
      army.moveLeft = FB.armyMarchDays(state, army.realm);
    }
  }

  /* what an AI host wants: run home when broken, hunt the nearest enemy
     host, else march on the enemy's seat */
  function aiGoal(state, army, warring) {
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
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, army.realm) &&
        FB.greatHolyWarArmyGoal) {
      return FB.greatHolyWarArmyGoal(state, army.realm, army.at) || army.at;
    }
    const en = warring[army.realm];
    if (en === 'player') return playerHome(state);
    const er = en && state.realms[en];
    return er ? er.capital : army.at;
  }

  /* what an automated player host wants (G.auto.hosts, the ⚙ stances):
     limp home when broken; a defensive host stands at home unless an
     invader stands in the player's lands (the same ground the enemy-advance
     clock reads); an offensive host hunts the enemy host when it fancies
     the odds (the Prudent/Bold style sets how much of an edge it demands),
     marches on the war target when no host is fielded against it, and
     otherwise refits at home */
  function playerGoal(state, host, mode) {
    const p = state.player, w = p.war;
    const home = playerHome(state);
    if (host.broken !== undefined && state.turn - host.broken < 40) return home;
    if (!w && FB.playerGreatHolyWarHostActive &&
        FB.playerGreatHolyWarHostActive(state) && FB.greatHolyWarArmyGoal) {
      return FB.greatHolyWarArmyGoal(state, 'player', host.at) || home;
    }
    if (!w) return host.at;
    const prey = FB.hostOf(state, w.enemy);
    if (mode === 'def') {
      if (prey && (prey.at === p.provinceId || (p.provs && p.provs.indexOf(prey.at) >= 0) ||
        (state.holder && state.holder[prey.at] === 'player'))) return prey.at;
      return home;
    }
    /* standing on the prize? Stay — the enemy comes to the siege, and
       leaving to chase him would stall the works (war_can_siege reads the
       ground the host stands on when the council meets) */
    if (!w.defending && w.target && state.owner[w.target] === w.enemy && host.at === w.target) {
      return w.target;
    }
    if (prey) {
      const style = FB.game.auto && FB.game.auto.style;
      const edge = style === 'bold' ? 0.85 : (style === 'safe' ? 1.3 : 1.1);
      return battlePower(state, host) >= battlePower(state, prey) * edge ? prey.at : home;
    }
    if (!w.defending && w.target && state.owner[w.target] === w.enemy) return w.target;
    return home;
  }

  function battlePower(state, army) {
    let pw;
    const q = FB.compQuality(army.units, army.men); // 1 for hosts from before levy tiers
    if (army.realm === 'player') {
      const me = state.chars[state.player.charId];
      pw = army.men * q * (1 + (me ? FB.skillOf(me, 'mar') : 5) / (B().battleMarPlayer || 14));
      // the same edges the war council grants carry onto the field
      pw *= 1 + FB.techBonus(state, 'battle') + FB.holdingBonus(state, 'battle') +
        FB.itemBonus(state, 'battle') + (state.player.flags.blessed_war ? 0.06 : 0);
      if (FB.campaignHostModBonus) {
        pw *= Math.max(0, 1 + FB.campaignHostModBonus(state, 'battleOdds'));
      }
    } else {
      const r = state.realms[army.realm];
      pw = army.men * q * (1 + (r && r.ruler ? r.ruler.mar : 5) / (B().battleMarAI || 22));
      pw *= 1 + (FB.techBonus ? FB.techBonus(state, 'battle', army.realm) : 0);
    }
    return pw;
  }

  /* Battle losses fall through the ordered classes: levy, archers,
     mercenaries, cavalry, then men-at-arms. */
  function applyLosses(army, lost) {
    army.men = Math.max(0, army.men - lost);
    if (!army.units) return;
    let rem = lost;
    const order = ['levy', 'arch', 'mercs', 'cav', 'ret'];
    for (const k of order) {
      if (rem <= 0) break;
      const d = Math.min(army.units[k] || 0, rem);
      army.units[k] -= d; rem -= d;
    }
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
    const winnerLoss = Math.round(winner.men * (B().battleWinLoss || 0.28) * ratio);
    applyLosses(winner, winnerLoss);
    if (winner.men < 1) winner.men = 1;
    const loserLoss = Math.round(loser.men * (B().battleLoseLoss || 0.62));
    applyLosses(loser, loserLoss);
    const pInvolved = winner.realm === 'player' || loser.realm === 'player';
    // the beaten host routs for home — or disperses entirely
    if (loser.men < (B().armyMinMen || 40)) {
      disband(state, loser);
      state.armyDown[loser.realm] = state.turn;
    } else {
      loser.broken = state.turn;
      FB.orderArmy(state, loser, loser.realm === 'player' ? playerHome(state) : state.realms[loser.realm].capital);
      loser.moveLeft = Math.min(loser.moveLeft, 1); // it limps away at once
    }
    const greatBattle = FB.greatHolyWarBattle &&
      FB.greatHolyWarBattle(state, pid, winner, loser, winnerLoss, loserLoss);
    if (greatBattle) {
      /* Coalition resolve and contribution are owned by holywar.js. An
         ordinary bilateral war (if malformed legacy state supplied one)
         must not also resolve this battle. */
    } else if (pInvolved) {
      const won = winner.realm === 'player';
      const steel = FB.hostUnits(winner.realm === 'player' ? winner : loser).ret > 0;
      /* The outcome handler may end the war immediately. Freeze the opposing
         realm on the queued battlefield event before that state disappears. */
      const enemyId = state.player.war && state.player.war.enemy ||
        (won ? loser.realm : winner.realm);
      FB.queueEvent(state,
        (won ? 'field_battle_won' : 'field_battle_lost') + (steel ? '_steel' : ''),
        { pid:pid, enemyId:enemyId });
      if (won) FB.fns.war_win(state); else FB.fns.war_loss(state);
    } else {
      trackAIWar(state, winner.realm, loser.realm);
      const p = state.player;
      const wname = state.realms[winner.realm] ? state.realms[winner.realm].name : winner.realm;
      const lname = state.realms[loser.realm] ? state.realms[loser.realm].name : loser.realm;
      if (FB.game.observe || pid === p.provinceId || (FB.world.adj[p.provinceId] || {})[pid]) {
        FB.news(state, FB.msg('news.army.ai_battle',
          '⚔ Battle at {province} — {winner} breaks the host of {loser}.',
          { province: provName(pid), winner: wname, loser: lname }));
      }
    }
    requestMap();
  }

  FB.armyTick = function (state) {
    FB.armiesEnsure(state);
    const p = state.player;
    const warring = warringMap(state);
    const hostByRealm = {};
    for (const a of state.armies) {
      hostByRealm[a.realm] = a;
      if (a.allied && a.allied.men) {
        const current = FB.alliedReinforcement
          ? FB.alliedReinforcement(state, a.realm) : { ally: null, men: 0 };
        if (current.ally !== a.allied.ally || !current.men) {
          FB.hostUnits(a);
          const gone = Math.min(a.allied.men, a.units.levy || 0, a.men);
          a.units.levy -= gone;
          a.men -= gone;
          a.size = Math.max(a.men, (a.size || a.men) - gone);
          a.allied = null;
          requestMap();
        }
      }
    }

    // sovereigns at war raise their host (the player musters by deed/event)
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || r.liege || id === 'player') continue;
      if (!warring[id] || hostByRealm[id]) continue;
      const down = state.armyDown[id];
      if (down !== undefined && state.turn - down < B().armyRearmDays) continue;
      raiseAIHost(state, id);
    }

    // peace: hosts go home — this one rule covers every way a war can end
    for (let i = state.armies.length - 1; i >= 0; i--) {
      const a = state.armies[i];
      if (a.realm === 'player') {
        if (!p.war && !(FB.playerGreatHolyWarHostActive &&
            FB.playerGreatHolyWarHostActive(state))) {
          disband(state, a);
          FB.news(state, FB.msg('news.army.disbands',
            '🏳 The war is done — the host disbands to hearth and field.', {}));
        }
        continue;
      }
      const r = state.realms[a.realm];
      if (!r || !r.alive || !warring[a.realm]) disband(state, a);
    }

    // orders & marches
    const autoHosts = FB.game.auto && FB.game.auto.hosts;
    // automated command re-raises a destroyed host once the rearm window passes
    if (autoHosts && autoHosts !== 'manual' &&
        (p.war || (FB.playerGreatHolyWarHostActive &&
          FB.playerGreatHolyWarHostActive(state))) && !hostByRealm['player']) {
      FB.raisePlayerHost(state);
    }
    for (const a of state.armies) {
      if (a.realm !== 'player') {
        const goal = aiGoal(state, a, warring);
        if (goal !== a.goal || ((!a.path || !a.path.length) && goal !== a.at && a.moveLeft <= 0)) {
          FB.orderArmy(state, a, goal);
        }
      } else if (autoHosts && autoHosts !== 'manual') {
        /* automated command: the stance steers only an idle host — a route
           tapped by hand (a.manual) plays out untouched, a hand-halted host
           (a.holdManual) holds, and the council's hunt is superseded */
        a.huntPrey = null;
        if (a.manual && !(a.path && a.path.length) && a.moveLeft <= 0) a.manual = 0;
        if (!a.holdManual && !a.manual) {
          const pgoal = playerGoal(state, a, autoHosts);
          if (pgoal !== a.goal || ((!a.path || !a.path.length) && pgoal !== a.at && a.moveLeft <= 0)) {
            FB.orderArmy(state, a, pgoal);
          }
        }
      } else if (a.huntPrey) {
        // a hunting host tracks its prey day by day, not where it was —
        // looked up live, since the disband loop above may have removed it
        const prey = FB.hostOf(state, a.huntPrey);
        if (!prey || !FB.armiesHostile(state, a, prey)) a.huntPrey = null;
        else if (prey.at !== a.goal) FB.orderArmy(state, a, prey.at);
      }
      march(state, a);
    }

    /* Campaign desertion is expressed as a seasonal fraction but resolved
       daily. Fractional expected losses use the saved RNG stream. */
    const playerHost = FB.playerHost(state);
    const desertion = playerHost && FB.campaignHostModBonus
      ? Math.max(0, FB.campaignHostModBonus(state, 'desertion')) : 0;
    if (playerHost && playerHost.men > 0 && desertion) {
      const expected = playerHost.men * desertion / 90;
      let lost = Math.floor(expected);
      const fraction = expected - lost;
      if (fraction > 0 && FB.rng() < fraction) lost++;
      if (lost > 0) {
        applyLosses(playerHost, Math.min(playerHost.men, lost));
        requestMap();
      }
    }

    // levies trickle back while a host rests on its sovereign's own land —
    // fresh peasants from the fields; the slain men-at-arms are not replaced
    for (const a of state.armies) {
      if (a.size === undefined) a.size = a.men; // hosts from before ranks refilled
      FB.hostUnits(a); // hosts from before levy tiers
      if (a.men >= a.size || a.moveLeft > 0) continue;
      const own = a.realm === 'player'
        ? ((p.provs && p.provs.indexOf(a.at) >= 0) || (state.holder && state.holder[a.at] === 'player'))
        : state.owner[a.at] === a.realm;
      if (own) {
        const add = Math.min(a.size - a.men, Math.max(1, Math.round(a.size * (B().armyReinforceRate || 0.02))));
        a.units.levy += add;
        a.men += add;
        requestMap();
      }
    }

    // battles: hostile hosts sharing a province (one clash per province per day)
    const byProv = {};
    for (const a of state.armies) (byProv[a.at] = byProv[a.at] || []).push(a);
    for (const pid in byProv) {
      const here = byProv[pid];
      if (here.length < 2) continue;
      let pair = null;
      for (let i = 0; i < here.length && !pair; i++) {
        for (let j = i + 1; j < here.length; j++) {
          /* rout grace: a freshly broken host is left to limp home — without
             this, a host beaten on its own capital cannot flee (orderArmy
             treats home as a halt) and the same battle re-fought daily */
          if (here[i].broken !== undefined && state.turn - here[i].broken < B().armyRoutDays) continue;
          if (here[j].broken !== undefined && state.turn - here[j].broken < B().armyRoutDays) continue;
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

  /* world-space position: the province the host stands in. Not mid-road —
     an interpolated marker floated across straits and off the land the Land
     tab (and battle logic) says the host is in. */
  function worldPos(army) {
    const pa = FB.world.byId[army.at];
    if (!pa) return [0, 0];
    return [pa.cx, pa.cy];
  }

  FB.armyAtWorld = function (state, wx, wy, tol) {
    FB.armiesEnsure(state);
    let best = null, bd = tol * tol;
    for (const a of state.armies) {
      const pos = worldPos(a);
      const d = (pos[0] - wx) * (pos[0] - wx) + (pos[1] - wy) * (pos[1] - wy);
      if (d > bd) continue;
      // stacked hosts share a centroid: on a tie your own host wins the tap
      if (d < bd || !best || (a.realm === 'player' && best.realm !== 'player')) { bd = d; best = a; }
    }
    return best;
  };

  /* A map tap arrives here first (from FB.map.onTap in ui.js). Returns true
     when the tap was army business: select your host, tap a province to
     march it (which lets go again), tap the selected host to halt. */
  FB.armyTap = function (state, pr, wx, wy) {
    const sel = FB.selectedArmy(state);
    let hit = null;
    if (wx !== undefined && FB.map && FB.map.zoom) {
      hit = FB.armyAtWorld(state, wx, wy, 20 * (FB.map.dpr || 1) / FB.map.zoom);
    } else if (pr) {
      // keyboard taps carry no pointer position: your host standing in the
      // tapped province is the target (Enter/Shift+arrows work the map too)
      const here = FB.armiesAt(state, pr.id);
      for (const a of here) if (a.realm === 'player') { hit = a; break; }
    }
    if (hit && hit.realm === 'player') {
      if (sel && sel.id === hit.id) {
        hit.path = []; hit.goal = null; hit.moveLeft = 0; hit.huntPrey = null;
        hit.manual = 0; hit.holdManual = 1; // a hand-halted host holds, automation or no
        FB.selectArmy(null);
        if (FB.ui) FB.ui.toast('🚩 The host holds at {province}.',
          { province: provName(hit.at) });
        if (FB.map) FB.map.request(); // drop the ring and route while paused
        return true;
      }
      FB.selectArmy(hit.id);
      if (FB.ui) FB.ui.toast('🚩 Your host — {men} men at {province}. Tap a province to march; tap the host again to halt.',
        { men: hit.men, province: provName(hit.at) });
      return false; // let the tap through so the Land tab shows where it stands
    }
    if (sel) {
      if (pr && !pr.wasteland) {
        if (FB.orderArmy(state, sel, pr.id)) {
          sel.huntPrey = null; // a hand-given order ends any hunt
          sel.manual = 1; sel.holdManual = 0; // and plays out before automation resumes
          FB.selectArmy(null); // and lets go, so further taps browse the map
          if (FB.ui) FB.ui.toast('🚩 The host marches on {province}.',
            { province: pr.name });
          if (FB.map) FB.map.request();
        } else if (FB.ui) {
          FB.ui.toast('🚫 No road nor crossing leads the host to {province}.',
            { province: pr.name });
        }
        return true;
      }
      FB.selectArmy(null);
      if (FB.map) FB.map.request(); // drop the ring while paused
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

    /* provinces where hostile hosts stand together: a battle is joined there
       today (they clash in the daily tick) — marked below so the fray reads */
    const byProv = {};
    for (const a of s.armies) (byProv[a.at] = byProv[a.at] || []).push(a);
    const battles = {};
    for (const pid in byProv) {
      const here = byProv[pid];
      for (let i = 0; i < here.length && !battles[pid]; i++) {
        for (let j = i + 1; j < here.length; j++) {
          if (FB.armiesHostile(s, here[i], here[j])) { battles[pid] = true; break; }
        }
      }
    }

    const counts = {}; // hosts sharing a province fan out around the centroid
    for (const a of s.armies) {
      const idx = counts[a.at] || 0; counts[a.at] = idx + 1;
      const pos = worldPos(a);
      const sc = toScreen(pos[0], pos[1]);
      const u = Math.max(15, 14 + Math.min(8, z * 1.25)) * dpr;
      let x = sc[0], y = sc[1];
      if (idx) { const ang = idx * 2.4; x += Math.cos(ang) * u * 0.95; y += Math.sin(ang) * u * 0.95; }
      if (x < -40 || y < -40 || x > ctx.canvas.width + 40 || y > ctx.canvas.height + 40) continue;
      const mine = a.realm === 'player';
      const realm = mine ? null : s.realms[a.realm];
      const playerGreatCamp = FB.playerGreatHolyWarCamp
        ? FB.playerGreatHolyWarCamp(s) : null;
      const armyGreatCamp = FB.greatHolyWarCamp
        ? FB.greatHolyWarCamp(s, a.realm) : null;
      const hostileToMe = !mine &&
        ((playerGreatCamp && armyGreatCamp && playerGreatCamp !== armyGreatCamp) ||
         (s.player.war && s.player.war.enemy === a.realm));
      const friendlyToMe = !mine && playerGreatCamp &&
        armyGreatCamp === playerGreatCamp;
      // your side always marches in green, your war enemy in red; everyone
      // else keeps their realm's color
      const col = (mine || friendlyToMe ||
        (!playerGreatCamp && armyGreatCamp === 'attackers')) ? '#3fae4a'
        : ((hostileToMe || (!playerGreatCamp && armyGreatCamp === 'defenders'))
          ? '#c8352b' : (realm ? realm.color : '#888888'));

      // base disc in the host's color over a soft shadow: the side a host
      // fights for reads at a glance — two pennants alone did not
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(x, y + u * 0.34, u * 0.74, u * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x, y + u * 0.3, u * 0.68, u * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1, u * 0.05); ctx.stroke();
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
      // gold ring for your selected host
      if (sel && sel.id === a.id) {
        ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.arc(x, y - u * 0.15, u * 1.05, 0, Math.PI * 2); ctx.stroke();
      }
      // crossed swords over a host locked with an enemy in this province today
      if (battles[a.at]) {
        ctx.font = Math.round(u * 0.85) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(20,16,10,0.85)';
        ctx.strokeText('⚔', x, y - u * 1.0);
        ctx.fillStyle = '#ffd75e';
        ctx.fillText('⚔', x, y - u * 1.0);
      }
      // strength label
      if (z >= 1.3) {
        ctx.font = Math.round(10 * dpr) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(20,16,10,0.8)';
        const lbl = a.men >= 1000 ? (Math.round(a.men / 100) / 10) + 'k' : String(a.men);
        ctx.strokeText(lbl, x, y + u * 0.75);
        ctx.fillStyle = mine ? '#ffe9a8' : 'rgba(255,250,235,0.9)';
        ctx.fillText(lbl, x, y + u * 0.75);
      }
    }
  };
})();
