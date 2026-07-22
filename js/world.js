/* Fallowborn — world generation (province raster) + realm simulation */
window.FB = window.FB || {};

(function () {
  'use strict';

  FB.world = null;

  /* ================= MAP GENERATION ================= */

  function fillPolyScanline(mask, W, H, pts, value) {
    // pts: projected [[x,y],...]; even-odd scanline fill
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0, n = pts.length; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort(function (p, q) { return p - q; });
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(W - 1, Math.round(xs[k + 1]) - 1);
        for (let x = xa; x <= xb; x++) mask[y * W + x] = value;
      }
    }
  }

  function projectPoly(flat) {
    const out = [];
    for (let i = 0; i < flat.length; i += 2) out.push([FB.lonToX(flat[i]), FB.latToY(flat[i + 1])]);
    return out;
  }

  /* Async world build. progress(frac, msg), done() */
  FB.generateWorld = function (progress, done) {
    const gridW = 1100;
    FB.initProjection(gridW);
    const W = FB.proj.W, H = FB.proj.H;
    const land = new Uint8Array(W * H);
    const grid = new Uint16Array(W * H); // 0 = sea, else provinceIndex+1

    const provs = FBDATA.provinces.map(function (p, i) {
      return {
        idx: i, id: p.id, name: p.name, wasteland: !!p.wasteland,
        terrain: p.terrain || 'farmland', culture: p.culture, religion: p.religion,
        realm0: p.realm || null, dev0: p.dev || 1, duchy: p.duchy || null,
        sx: Math.round(FB.lonToX(p.x)), sy: Math.round(FB.latToY(p.y)),
        cx: 0, cy: 0, area: 0, coastal: false
      };
    });

    const steps = [];

    steps.push(function () {
      progress(0.1, 'Raising the continents…');
      for (const poly of FBDATA.land) fillPolyScanline(land, W, H, projectPoly(poly), 1);
    });
    steps.push(function () {
      progress(0.25, 'Filling the seas…');
      for (const poly of FBDATA.seas) fillPolyScanline(land, W, H, projectPoly(poly), 0);
      // snap seeds that fell in water to nearest land pixel
      for (const pr of provs) {
        pr.sx = FB.clamp(pr.sx, 0, W - 1); pr.sy = FB.clamp(pr.sy, 0, H - 1);
        if (land[pr.sy * W + pr.sx]) continue;
        let found = false;
        for (let r = 1; r < 50 && !found; r++) {
          for (let dy = -r; dy <= r && !found; dy++) {
            for (let dx = -r; dx <= r && !found; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              const nx = pr.sx + dx, ny = pr.sy + dy;
              if (nx >= 0 && ny >= 0 && nx < W && ny < H && land[ny * W + nx]) {
                pr.sx = nx; pr.sy = ny; found = true;
              }
            }
          }
        }
      }
    });

    // nearest-seed assignment in row bands. Seeds are sorted by x so each
    // pixel only scans the x-window that can beat its current best —
    // the result is identical to the naive all-seeds scan (ties still go
    // to the lowest province index), just ~an order cheaper.
    const BAND = 80;
    let bandStart = 0;
    let sorted = null, sxArr = null;
    function assignBand() {
      if (!sorted) {
        sorted = provs.slice().sort(function (a, b) { return a.sx - b.sx; });
        sxArr = sorted.map(function (p) { return p.sx; });
      }
      const n = sorted.length;
      const yEnd = Math.min(H, bandStart + BAND);
      for (let y = bandStart; y < yEnd; y++) {
        for (let x = 0; x < W; x++) {
          if (!land[y * W + x]) continue;
          // binary search: first seed with sx >= x
          let lo = 0, hi = n;
          while (lo < hi) { const mid = (lo + hi) >> 1; if (sxArr[mid] < x) lo = mid + 1; else hi = mid; }
          let best = -1, bd = Infinity, bIdx = Infinity;
          for (let i = lo; i < n; i++) { // walk right
            const dx = sxArr[i] - x; if (dx * dx > bd) break;
            const dy = sorted[i].sy - y, d = dx * dx + dy * dy;
            if (d < bd || (d === bd && sorted[i].idx < bIdx)) { bd = d; best = i; bIdx = sorted[i].idx; }
          }
          for (let i = lo - 1; i >= 0; i--) { // walk left
            const dx = x - sxArr[i]; if (dx * dx > bd) break;
            const dy = sorted[i].sy - y, d = dx * dx + dy * dy;
            if (d < bd || (d === bd && sorted[i].idx < bIdx)) { bd = d; best = i; bIdx = sorted[i].idx; }
          }
          const pr = sorted[best];
          grid[y * W + x] = pr.idx + 1;
          pr.cx += x; pr.cy += y; pr.area++;
        }
      }
      bandStart = yEnd;
      return bandStart >= H;
    }
    // queue bands as steps
    const nBands = Math.ceil(1000 / BAND) + 20; // upper bound; loop breaks when done
    for (let b = 0; b < nBands; b++) {
      steps.push(function () {
        progress(0.3 + 0.55 * Math.min(1, bandStart / H), 'Carving provinces…');
        let finished = false;
        for (let k = 0; k < 1 && !finished; k++) finished = assignBand();
        return finished ? 'skiprest' : null;
      });
    }

    steps.push(function () {
      progress(0.9, 'Drawing borders…');
      // centroids
      for (const pr of provs) {
        if (pr.area > 0) { pr.cx = Math.round(pr.cx / pr.area); pr.cy = Math.round(pr.cy / pr.area); }
        else { pr.cx = pr.sx; pr.cy = pr.sy; }
        // centroid may fall outside the province (concave); snap to seed if mismatched
        const at = grid[pr.cy * W + pr.cx];
        if (at !== pr.idx + 1) { pr.cx = pr.sx; pr.cy = pr.sy; }
      }
      // adjacency + coastal
      const adj = {};
      for (const pr of provs) adj[pr.id] = {};
      for (let y = 0; y < H - 1; y++) {
        for (let x = 0; x < W - 1; x++) {
          const a = grid[y * W + x];
          const r = grid[y * W + x + 1], d = grid[(y + 1) * W + x];
          if (!a) continue;
          const pa = provs[a - 1];
          if (!r || !d) pa.coastal = true;
          if (r && r !== a) { adj[pa.id][provs[r - 1].id] = 1; adj[provs[r - 1].id][pa.id] = 1; }
          if (d && d !== a) { adj[pa.id][provs[d - 1].id] = 1; adj[provs[d - 1].id][pa.id] = 1; }
        }
      }
      for (const s of (FBDATA.straits || [])) {
        if (adj[s[0]] && adj[s[1]]) { adj[s[0]][s[1]] = 1; adj[s[1]][s[0]] = 1; }
      }
      const byId = {};
      for (const pr of provs) byId[pr.id] = pr;
      FB.world = { W: W, H: H, grid: grid, land: land, provs: provs, byId: byId, adj: adj };
    });

    let si = 0;
    function step() {
      while (si < steps.length) {
        const res = steps[si](); si++;
        if (res === 'skiprest') {
          // skip remaining band steps (they're all band fns until the final step)
          while (si < steps.length - 1) si++;
        }
        if (si < steps.length) { setTimeout(step, 0); return; }
      }
      progress(1, 'The world is made.');
      done();
    }
    setTimeout(step, 0);
  };

  FB.provinceAtGrid = function (gx, gy) {
    const w = FB.world;
    if (!w || gx < 0 || gy < 0 || gx >= w.W || gy >= w.H) return null;
    const v = w.grid[Math.floor(gy) * w.W + Math.floor(gx)];
    return v ? w.provs[v - 1] : null;
  };

  /* ================= POLITICAL STATE ================= */

  /* Realm hierarchy: every realm has a rank (1 count, 2 duke, 3 king,
     4 emperor) and a liege (realm id or null for sovereigns).
     state.owner[pid] = SOVEREIGN realm id (map color, war targeting);
     state.holder[pid] = the realm holding the county directly. */

  /* owner/holder-derived lists, rebuilt lazily once per turn or after
     any transfer (the AI loop consults them per realm per year) */
  let rc = { turn: -1, dirty: true, provs: null, strength: null, held: null };
  function rcEnsure(state) {
    if (rc.turn === state.turn && !rc.dirty) return;
    rc.turn = state.turn; rc.dirty = false;
    rc.provs = {}; rc.strength = {}; rc.held = {};
    for (const pid in state.owner) {
      const o = state.owner[pid];
      (rc.provs[o] = rc.provs[o] || []).push(pid);
      rc.strength[o] = (rc.strength[o] || 0) + (state.dev[pid] || 1);
      const h = (state.holder && state.holder[pid]) || o;
      (rc.held[h] = rc.held[h] || []).push(pid);
    }
  }
  FB.invalidateRealmCache = function () { rc.dirty = true; };

  FB.topRealm = function (state, rid) {
    let cur = rid, guard = 0;
    while (cur && state.realms[cur] && state.realms[cur].liege && guard++ < 20) cur = state.realms[cur].liege;
    return cur || rid;
  };

  /* [rid, its liege, ..., the sovereign] */
  FB.liegeChain = function (state, rid) {
    const out = [];
    let cur = rid, guard = 0;
    while (cur && state.realms[cur] && guard++ < 20) { out.push(cur); cur = state.realms[cur].liege; }
    return out;
  };

  /* de jure ids of a county: {duchy, kingdom, empire} */
  FB.dejureOf = function (pid) {
    const pr = FB.world && FB.world.byId[pid];
    if (!pr || !pr.duchy) return {};
    const d = FBDATA.duchies[pr.duchy];
    const k = d && FBDATA.kingdoms[d.kingdom];
    return { duchy: pr.duchy, kingdom: d ? d.kingdom : null, empire: k ? k.empire : null };
  };

  /* static de jure county lists, built once */
  let dejureCounties = null;
  FB.duchyCounties = function (did) {
    if (!dejureCounties) {
      dejureCounties = {};
      for (const p of FBDATA.provinces) {
        if (p.wasteland || !p.duchy) continue;
        (dejureCounties[p.duchy] = dejureCounties[p.duchy] || []).push(p.id);
      }
    }
    return dejureCounties[did] || [];
  };
  FB.kingdomCounties = function (kid) {
    const out = [];
    for (const did in FBDATA.duchies) {
      if (FBDATA.duchies[did].kingdom === kid) out.push.apply(out, FB.duchyCounties(did));
    }
    return out;
  };
  FB.empireKingdoms = function (eid) {
    const out = [];
    for (const kid in FBDATA.kingdoms) if (FBDATA.kingdoms[kid].empire === eid) out.push(kid);
    return out;
  };

  FB.initPolitics = function (state) {
    state.owner = {}; state.dev = {}; state.realms = {}; state.holder = {};
    // authored realms (kings, emperors, independent dukes, authored vassals)
    for (const r of FBDATA.realms) {
      const cap = FB.world.byId[r.capital];
      state.realms[r.id] = {
        id: r.id, name: r.name, color: r.color, capital: r.capital,
        aggression: r.aggression || 1, rank: r.rank || 3, liege: r.liege || null,
        alive: true, ruler: makeRuler(cap ? cap.culture : 'frankish'),
        war: null, op: 0
      };
    }
    // sovereignty (map color) = the top of each county's realm chain
    for (const pr of FB.world.provs) {
      if (pr.wasteland) continue;
      state.dev[pr.id] = pr.dev0;
      state.owner[pr.id] = FB.topRealm(state, pr.realm0);
    }
    // generate the dukes and counts inside each authored realm
    for (const r of FBDATA.realms) buildVassals(state, r.id);
    FB.invalidateRealmCache();
  };

  /* Group a realm's counties by duchy and hand out titles:
     - the capital duchy is the ruler's own demesne (held directly)
     - each other duchy with 2+ counties gets a duke; the duke holds the
       richest county directly, the rest go to counts under him
     - single-county duchies go to counts directly under the realm */
  function buildVassals(state, rid) {
    const realm = state.realms[rid];
    const byDuchy = {};
    for (const pr of FB.world.provs) {
      if (pr.wasteland || pr.realm0 !== rid) continue;
      (byDuchy[pr.duchy] = byDuchy[pr.duchy] || []).push(pr);
    }
    const capDuchy = (FB.world.byId[realm.capital] || {}).duchy;
    for (const did in byDuchy) {
      const counties = byDuchy[did];
      counties.sort(function (a, b) { return b.dev0 - a.dev0; }); // richest first = ducal seat
      if (did === capDuchy) {
        for (const pr of counties) state.holder[pr.id] = rid;
      } else if (counties.length >= 2) {
        const dname = (FBDATA.duchies[did] || {}).name || did;
        const dr = FB.makeVassalRealm(state, {
          id: did, name: 'Duchy of ' + dname, capital: counties[0].id,
          rank: 2, liege: rid, culture: counties[0].culture
        });
        state.holder[counties[0].id] = dr.id;
        for (let i = 1; i < counties.length; i++) {
          const cr = FB.makeVassalRealm(state, {
            id: 'c_' + counties[i].id, name: 'County of ' + counties[i].name,
            capital: counties[i].id, rank: 1, liege: dr.id, culture: counties[i].culture
          });
          state.holder[counties[i].id] = cr.id;
        }
      } else {
        const cr = FB.makeVassalRealm(state, {
          id: 'c_' + counties[0].id, name: 'County of ' + counties[0].name,
          capital: counties[0].id, rank: 1, liege: rid, culture: counties[0].culture
        });
        state.holder[counties[0].id] = cr.id;
      }
    }
  }

  /* spawn a sub-realm (generated duke/count, or a player-granted county) */
  FB.makeVassalRealm = function (state, opts) {
    const top = FB.topRealm(state, opts.liege);
    const r = {
      id: opts.id, name: opts.name,
      color: shade(state.realms[top] ? state.realms[top].color : '#888888', opts.id),
      capital: opts.capital, aggression: 0, rank: opts.rank || 1, liege: opts.liege,
      alive: true, ruler: makeRuler(opts.culture || 'frankish'), war: null,
      op: 0, generated: true
    };
    state.realms[r.id] = r;
    return r;
  };

  /* small deterministic color variation for generated vassals */
  function shade(hex, key) {
    const n = parseInt(hex.slice(1), 16);
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffff;
    const f = 0.86 + (h % 5) * 0.07;
    const c = function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); };
    return '#' + ((1 << 24) + (c((n >> 16) & 255) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1);
  }

  function makeRuler(culture) {
    return {
      name: FB.randomName(culture, 'm'),
      culture: culture,
      age: FB.ri(20, 55),
      mar: FB.ri(2, 14)
    };
  }

  /* ================= settlements =================
     Each province holds 2-4 named settlements, generated deterministically
     from the province id (a plain hash — never the seeded RNG, so saves stay
     stable). Size follows CURRENT development: the head settlement grows
     village → town → city as the province flourishes. */
  function strHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h;
  }

  FB.settlementName = function (cultureId, h) {
    const sets = FBDATA.settlementNames || {};
    const s = sets[cultureId] || sets.default || { pre: ['New'], suf: ['town'] };
    // unsigned shift: a signed >> on large hashes goes negative and indexes nothing
    return s.pre[h % s.pre.length] + s.suf[(h >>> 4) % s.suf.length];
  };

  FB.settlementsOf = function (state, pid) {
    const pr = FB.world.byId[pid];
    if (!pr || pr.wasteland) return [];
    const dev = (state && state.dev && state.dev[pid]) || pr.dev || 1;
    const n = 2 + (strHash(pid) % 2) + (dev >= 5 ? 1 : 0); // 2-4 places
    const out = [];
    const seen = {};
    for (let i = 0; i < n; i++) {
      let h = strHash(pid + ':' + i);
      let name = FB.settlementName(pr.culture, h);
      while (seen[name]) { h = (h * 31 + 7) >>> 0; name = FB.settlementName(pr.culture, h); }
      seen[name] = 1;
      let kind = 'village';
      if (i === 0 && dev >= 7) kind = 'city';
      else if (i === 0 && dev >= 4) kind = 'town';
      else if (i === 1 && dev >= 6) kind = 'town';
      out.push({ name: name, kind: kind });
    }
    return out;
  };

  FB.realmProvinces = function (state, realmId) {
    rcEnsure(state);
    return rc.provs[realmId] || [];
  };

  FB.realmStrength = function (state, realmId) {
    rcEnsure(state);
    return rc.strength[realmId] || 0;
  };

  /* counties a realm holds DIRECTLY (holder === realm id) */
  FB.realmHeldCounties = function (state, rid) {
    rcEnsure(state);
    return rc.held[rid] || [];
  };

  /* counties of a realm's whole vassal subtree: for sovereign realms this
     is exactly the owner bloc; for vassals, their own counties plus their
     vassals' (used for realm death and breakaways) */
  FB.realmTerritory = function (state, rid) {
    rcEnsure(state);
    const realm = state.realms[rid];
    if (!realm || !realm.liege) return rc.provs[rid] || [];
    const out = [];
    const stack = [rid];
    const seen = {};
    while (stack.length) {
      const cur = stack.pop();
      if (seen[cur]) continue;
      seen[cur] = 1;
      const held = rc.held[cur] || [];
      for (const pid of held) out.push(pid);
      for (const id in state.realms) if (state.realms[id].liege === cur) stack.push(id);
    }
    return out;
  };

  FB.realmsAdjacent = function (state, r1, r2) {
    rcEnsure(state);
    for (const pid of (rc.provs[r1] || [])) {
      const adj = FB.world.adj[pid] || {};
      for (const nb in adj) if (state.owner[nb] === r2) return true;
    }
    return false;
  };

  FB.borderProvince = function (state, loserRealm, winnerRealm) {
    rcEnsure(state);
    const opts = [];
    for (const pid of (rc.provs[loserRealm] || [])) {
      const adj = FB.world.adj[pid] || {};
      for (const nb in adj) {
        if (state.owner[nb] === winnerRealm) { opts.push(pid); break; }
      }
    }
    if (!opts.length) return null;
    return FB.pick(opts);
  };

  FB.transferProvince = function (state, pid, toRealm) {
    const from = state.owner[pid];
    const oldHolder = (state.holder && state.holder[pid]) || from;
    state.owner[pid] = toRealm;
    if (state.holder) state.holder[pid] = toRealm; // conquerors hold their prizes directly
    FB.invalidateRealmCache();
    // relocate capitals; realms whose whole subtree is gone die — their
    // orphaned vassals (and a vassal player) reattach to the dead liege's liege
    for (const rid of [from, oldHolder]) {
      const fr = state.realms[rid];
      if (!fr || !fr.alive) continue;
      const terr = FB.realmTerritory(state, rid);
      if (!terr.length) {
        fr.alive = false; fr.war = null;
        for (const vid in state.realms) if (state.realms[vid].liege === rid) state.realms[vid].liege = fr.liege || null;
        if (state.player && state.player.liege === rid) {
          // a baron is bound to his county, not to the dead lord's house:
          // he answers to whoever holds his home now; landed vassals
          // reattach upward to the dead liege's own liege
          let nl = fr.liege || null;
          if (state.player.tier === 3) {
            const h = (state.holder && state.holder[state.player.provinceId]) || state.owner[state.player.provinceId];
            if (h && h !== 'player' && state.realms[h] && state.realms[h].alive) nl = h;
          }
          state.player.liege = nl;
        }
      } else if (fr.capital === pid) {
        fr.capital = terr[0];
      }
    }
    // player consequences
    if (state.player && state.player.provs && state.player.provs.indexOf(pid) >= 0 && toRealm !== 'player') {
      state.player.provs.splice(state.player.provs.indexOf(pid), 1);
    }
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };

  FB.playerRealmId = function (state) {
    // the SOVEREIGN realm the player answers to (liege's top, own realm, or home)
    if (state.player.liege) return FB.topRealm(state, state.player.liege);
    if (state.realms.player && state.realms.player.alive) return 'player';
    return state.owner[state.player.provinceId] || null;
  };

  FB.isRealmAtWar = function (state, realmId) {
    realmId = FB.topRealm(state, realmId);
    const r = state.realms[realmId];
    if (r && r.war) return true;
    // player wars count for the player's realm
    if (state.player.war && (realmId === 'player' || realmId === FB.playerRealmId(state))) return true;
    for (const id in state.realms) {
      const rr = state.realms[id];
      if (rr.alive && rr.war && rr.war.enemy === realmId) return true;
    }
    return false;
  };

  /* ================= YEARLY WORLD TICK ================= */

  FB.worldTick = function (state) {
    const B = FBDATA.balance;
    // scripted history
    for (const ev of (FBDATA.scripted || [])) {
      if (ev.year !== state.date.year || state.flags['scripted_' + ev.year + '_' + (ev.newRealm ? ev.newRealm.id : ev.realm)]) continue;
      state.flags['scripted_' + ev.year + '_' + (ev.newRealm ? ev.newRealm.id : ev.realm)] = 1;
      let rid = ev.realm;
      if (ev.newRealm) {
        rid = ev.newRealm.id;
        const cap = FB.world.byId[ev.newRealm.capital];
        state.realms[rid] = {
          id: rid, name: ev.newRealm.name, color: ev.newRealm.color,
          capital: ev.newRealm.capital, aggression: ev.newRealm.aggression || 1,
          rank: ev.newRealm.rank || 3, liege: ev.newRealm.liege || null,
          alive: true, ruler: makeRuler(cap ? cap.culture : 'arabic'), war: null, op: 0
        };
      }
      if (state.realms[rid] && state.realms[rid].alive) {
        for (const pid of ev.targets) {
          if (state.owner[pid] !== undefined && state.owner[pid] !== 'player') FB.transferProvince(state, pid, rid);
        }
      }
      FB.news(state, '📜 ' + ev.news);
    }

    // realm AI
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || id === 'player') continue;
      // ruler ages & dies
      r.ruler.age++;
      const q = r.ruler.age > 70 ? 0.18 : r.ruler.age > 55 ? 0.07 : 0.02;
      if (FB.chance(q)) {
        const cap = FB.world.byId[r.capital];
        r.ruler = makeRuler(cap ? cap.culture : r.ruler.culture);
        if (FB.game.observe || id === FB.playerRealmId(state) || id === state.player.liege) {
          FB.news(state, '👑 The ruler of ' + r.name + ' is dead. ' + r.ruler.name + ' rises in their place.');
        }
      }
      if (r.liege) continue; // vassals make no foreign policy of their own
      // war resolution
      if (r.war) {
        const enemy = state.realms[r.war.enemy];
        if (!enemy || !enemy.alive) { r.war = null; continue; }
        const sa = FB.realmStrength(state, id) * (1 + r.ruler.mar / 30) * FB.rf(0.7, 1.3) *
          (1 + 0.12 * ((r.war.fw || 0) - (r.war.fl || 0))); // field wins tilt the war
        const sd = FB.realmStrength(state, r.war.enemy) * (1 + enemy.ruler.mar / 30) * FB.rf(0.7, 1.3) *
          (1 + 0.12 * ((r.war.fl || 0) - (r.war.fw || 0)));
        const winner = sa > sd ? id : r.war.enemy;
        const loser = winner === id ? r.war.enemy : id;
        const taken = FB.borderProvince(state, loser, winner);
        if (taken) {
          FB.transferProvince(state, taken, winner);
          r.war.captures = (r.war.captures || 0) + 1;
          const pv = FB.world.byId[taken];
          if (FB.game.observe) { // the watcher hears of every fall, far or near
            FB.news(state, '⚔ ' + pv.name + ' has fallen to ' + (state.realms[winner] ? state.realms[winner].name : winner) + '.');
          } else if (taken === state.player.provinceId) {
            FB.news(state, '⚔ ' + (state.realms[winner] ? state.realms[winner].name : winner) + ' has conquered ' + pv.name + ' — your home! New masters rule here now.');
          } else if (FB.world.adj[state.player.provinceId] && FB.world.adj[state.player.provinceId][taken]) {
            FB.news(state, '⚔ ' + pv.name + ' has fallen to ' + (state.realms[winner] ? state.realms[winner].name : winner) + '.');
          }
        }
        r.war.years++;
        if (!state.realms[loser].alive) { r.war = null; }
        else if (r.war.years >= 3 || FB.chance(0.35) || (r.war.captures || 0) >= 2) {
          r.war = null; // peace
        }
      } else if (FB.chance(B.aiWarChance * (0.5 + 0.5 * r.aggression))) {
        // pick a neighboring realm to attack
        const targets = [];
        for (const id2 in state.realms) {
          if (id2 === id) continue;
          const r2 = state.realms[id2];
          if (!r2.alive || r2.liege) continue; // sovereigns only
          if (id2 === 'player') continue; // wars vs player handled below
          if (FB.realmsAdjacent(state, id, id2)) targets.push(id2);
        }
        if (targets.length) {
          // prefer weaker targets
          targets.sort(function (a, b) { return FB.realmStrength(state, a) - FB.realmStrength(state, b); });
          const t = targets[FB.chance(0.6) ? 0 : Math.floor(FB.rng() * targets.length)];
          r.war = { enemy: t, years: 0, captures: 0 };
          const homeRealm = state.owner[state.player.provinceId];
          if (FB.game.observe || id === homeRealm || t === homeRealm) {
            FB.news(state, '🔥 War! ' + r.name + ' marches against ' + state.realms[t].name + '.');
          }
        }
      }
      // AI may attack an independent player realm
      if (!r.war && state.realms.player && state.realms.player.alive && !state.player.war &&
        !(state.pacts && state.pacts[id] > state.turn) &&
        FB.chance(0.04 * r.aggression) && FB.realmsAdjacent(state, id, 'player')) {
        state.player.war = { enemy: id, target: null, wins: 0, losses: 0, seasons: 0, defending: true };
        FB.news(state, '🔥 ' + r.name + ' declares war upon YOU!');
        FB.warFooting(state);
        state.eventQueue.push({ id: 'war_defense_muster', ctx: {} });
      }
    }

    // vassal breakaways: a strong duke or subject king may renounce his
    // liege and stand alone; the old sovereign marches to take him back
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || !r.liege || id === 'player') continue;
      const terr = FB.realmTerritory(state, id);
      if (terr.length < 3) continue;
      const top = FB.topRealm(state, id);
      if (top === id || FB.realmStrength(state, top) < 8) continue;
      if (!FB.chance(B.breakawayChance)) continue;
      r.liege = null;
      for (const pid of terr) state.owner[pid] = id;
      FB.invalidateRealmCache();
      const tr = state.realms[top];
      if (tr && tr.alive && !tr.war) tr.war = { enemy: id, years: 0, captures: 0 };
      if (top === FB.playerRealmId(state) || id === state.player.liege || FB.game.observe) {
        FB.news(state, '🔥 ' + r.name + ' renounces the suzerainty of ' + (tr ? tr.name : 'the crown') + '!');
      }
    }

    // development drift (tech can lift the ceiling for the player's lands)
    for (const pid in state.dev) {
      if (FB.chance(0.04)) state.dev[pid] = FB.clamp(state.dev[pid] + (FB.chance(0.7) ? 1 : -1), 1, FB.devCap(state, pid));
    }
  };

  /* ================= PLAYER WAR (seasonal) ================= */

  FB.playerLevy = function (state) {
    const B = FBDATA.balance;
    const p = state.player;
    let men = 0;
    if (p.provs && p.provs.length) {
      for (const pid of p.provs) men += (state.dev[pid] || 1) * B.levyPerDev;
    } else if (p.tier >= 3) {
      men = 120; // barony retinue
    }
    if (p.tier >= 3) {
      men += FB.buildingBonus(state, 'levy');
      // the lord raises the host in person: martial skill sways how many
      // answer the call — traits and carried items count through skillOf
      const me = state.chars[p.charId];
      men *= (1 + FB.techBonus(state, 'levy')) *
        (1 + (me ? FB.skillOf(me, 'mar') : 0) * (B.levyPerMartial || 0));
      men = Math.round(men);
    }
    return men;
  };

  /* Is the player personally caught up in a war? While true, only events
     marked wartime:true fire on slot days — ordinary life is postponed. */
  FB.atWarPersonally = function (state) {
    const p = state.player;
    if (p.war) return true;
    if (p.flags.on_campaign) return true;
    if (p.flags.with_liege_host && p.liege && FB.isRealmAtWar(state, p.liege)) return true;
    if (p.profession === 'soldier' && FB.isRealmAtWar(state, state.owner[p.provinceId])) return true;
    return false;
  };

  /* Move the player onto a war footing: remember the peacetime focus and
     take command of the host. validateFocus restores the old focus at peace. */
  FB.warFooting = function (state) {
    const p = state.player;
    if (p.focus !== 'lead_host') { p.focusBack = p.focus; p.focus = 'lead_host'; }
  };

  FB.endPlayerWar = function (state) {
    state.player.war = null;
    FB.validateFocus(state);
  };

  /* Each war season asks for orders instead of rolling a hidden battle:
     upkeep (including mercenary pay) and exhaustion are charged here, the
     ENEMY makes its move — in a defensive war their columns advance unless
     beaten back — then a war-council event is queued. Its options act
     through the FB.fns.war_* handlers below. */
  FB.playerWarTick = function (state) {
    const p = state.player;
    const w = p.war;
    if (!w) return;
    const enemy = state.realms[w.enemy];
    if (!enemy || !enemy.alive) {
      FB.news(state, '🕊 The war ends — our enemy has ceased to exist.');
      FB.endPlayerWar(state); return;
    }
    w.seasons++;
    p.gold = Math.max(0, p.gold - (2 + (p.provs ? p.provs.length : 0) + (w.mercCos || 0) * 4));
    if (w.seasons > 8) {
      FB.news(state, '🕊 Exhaustion ends the war with nothing gained.');
      FB.endPlayerWar(state); return;
    }
    if (w.defending) {
      // the enemy's advance is now literal: their host must stand in your
      // lands to tighten the noose — keep it out and nothing falls
      if (FB.enemyHostInPlayerLands(state)) {
        w.enemySiege = (w.enemySiege || 0) + 1;
        if (w.enemySiege >= 3) { FB.warLoseProvince(state); return; }
        if (w.enemySiege === 2) {
          FB.news(state, '⚠ ' + enemy.name + ' presses deep into your lands — another season unchecked, and something falls.');
        }
      }
    }
    state.eventQueue.push({ id: 'war_council', ctx: {} });
  };

  /* Is a hostile field host standing in the player's own lands? Drives the
     defensive siege clock: an invader kept out of the demesne takes nothing. */
  FB.enemyHostInPlayerLands = function (state) {
    const p = state.player, w = p.war;
    if (!w) return false;
    if (!state.armies) return true; // no field data (old save): the old behavior
    for (const a of state.armies) {
      if (a.realm !== w.enemy) continue;
      if (a.at === p.provinceId || (p.provs && p.provs.indexOf(a.at) >= 0)) return true;
      if (state.holder && state.holder[a.at] === 'player') return true;
    }
    return false;
  };

  /* Attacking victory: the besieged target falls to you. */
  FB.warCapture = function (state) {
    const p = state.player;
    const w = p.war;
    const pid = w && w.target;
    if (pid && state.owner[pid] === w.enemy) {
      const myRealm = state.realms.player && state.realms.player.alive ? 'player'
        : (p.liege ? FB.topRealm(state, p.liege) : 'player');
      if (myRealm === 'player' && !(state.realms.player && state.realms.player.alive)) FB.foundPlayerRealm(state);
      FB.transferProvince(state, pid, myRealm);
      if (state.holder) state.holder[pid] = 'player'; // the player's own demesne
      p.provs = p.provs || [];
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
      FB.news(state, '🏰 ' + FB.world.byId[pid].name + ' is yours by conquest!');
      p.prestige += 50;
      FB.endPlayerWar(state);
      FB.checkTierPromotions(state);
    } else {
      p.prestige += 20;
      p.gold += 25;
      FB.news(state, '🕊 The prize has slipped away, but tribute is paid. The war ends in your favor.');
      FB.endPlayerWar(state);
    }
  };

  /* Defensive defeat: the enemy advance takes a border province. */
  FB.warLoseProvince = function (state) {
    const p = state.player;
    const w = p.war;
    const lost = FB.borderProvince(state, state.realms.player && state.realms.player.alive ? 'player' : FB.playerRealmId(state), w.enemy);
    if (lost && p.provs && p.provs.indexOf(lost) >= 0) {
      FB.transferProvince(state, lost, w.enemy);
      FB.news(state, '🏚 ' + FB.world.byId[lost].name + ' is torn from your grasp.');
      if (!p.provs.length) {
        p.tier = 2; p.liege = null;
        if (state.realms.player) state.realms.player.alive = false;
        FB.news(state, '⬇ Landless once more. The banners are folded away.');
      }
    } else {
      p.gold = Math.max(0, p.gold - 30);
      FB.news(state, '🕊 A humiliating peace. Reparations drain your coffers.');
    }
    p.prestige = Math.max(0, p.prestige - 20);
    FB.endPlayerWar(state);
  };

  /* The house falls: every acre lost, the family back to landless gentry.
     A sovereign's realm passes whole to a generated usurper (the realm
     stands — the house falls; its vassals kneel to the new master); a
     vassal's fiefs escheat to his liege; a baron simply loses his place.
     Reached only at the end of the downfall event chains (df_* in
     data/events_noble.js), each several unlucky or neglected stages deep. */
  FB.loseAllLand = function (state, opts) {
    opts = opts || {};
    const p = state.player;
    if (p.war) FB.endPlayerWar(state);
    // the slide is over, one way or another — none of it follows the heir
    for (const df of ['df_unrest', 'df_league', 'df_claim', 'df_claim2', 'df_marked', 'df_doom']) delete p.flags[df];
    if (p.provs && p.provs.length) {
      if ((state.realms.player && state.realms.player.alive) || !p.liege) {
        const old = (state.realms.player && state.realms.player.alive) ? state.realms.player : null;
        const cap = (old && old.capital) || p.provs[0];
        const pr = FB.world.byId[cap];
        const uid = 'usurper_' + state.turn;
        const u = FB.makeVassalRealm(state, {
          id: uid, name: old ? old.name : 'Realm of ' + (pr ? pr.name : 'the Usurper'),
          capital: cap, rank: old ? old.rank : Math.max(1, p.tier - 3), liege: null,
          culture: pr ? pr.culture : 'frankish'
        });
        u.color = old ? old.color : '#f0c840'; // the map barely ripples
        if (old) { old.alive = false; old.war = null; }
        for (const pid of p.provs) { state.owner[pid] = uid; state.holder[pid] = uid; }
        for (const vid in state.realms) {
          if (state.realms[vid].liege === 'player') state.realms[vid].liege = uid;
        }
        FB.news(state, '🏴 ' + u.ruler.name + ' seizes the seat — the realm endures; your house does not.');
      } else {
        // a vassal's fiefs escheat to his liege
        for (const pid of p.provs) {
          state.owner[pid] = FB.topRealm(state, p.liege);
          state.holder[pid] = p.liege;
        }
        FB.news(state, '📜 Your fiefs escheat to ' + (state.realms[p.liege] ? state.realms[p.liege].name : 'your liege') + '.');
      }
      p.provs = [];
    }
    p.tier = 2;
    p.liege = null; p.liegeOp = 0; p.liegeOps = {};
    p.pop = 0;
    p.prestige = Math.round(p.prestige * (opts.flee ? 0.6 : 0.4));
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    if (opts.flee) FB.movePlayerRandom(state);
    FB.news(state, '⬇ Cast down. The family keeps its coffers and its name — but not an acre.');
  };

  /* Check whether accumulated victories or defeats settle the war.
     Attackers take the target only by SIEGE (war_siege below); enough field
     wins force tribute, enough defeats break the campaign. */
  FB.warOutcome = function (state) {
    const p = state.player;
    const w = p.war;
    if (!w) return;
    const enemy = state.realms[w.enemy];
    const NEED = FBDATA.balance.warWinsToTakeProvince;
    if (w.wins >= NEED) {
      if (w.defending) {
        FB.news(state, '🕊 ' + (enemy ? enemy.name : 'The enemy') + ' sues for peace. Your lands are safe.');
        p.prestige += 25;
      } else {
        p.prestige += 20;
        p.gold += 25;
        FB.news(state, '🕊 Bled white in the field, the enemy buys peace with tribute.');
      }
      FB.endPlayerWar(state);
    } else if (w.losses >= NEED) {
      if (w.defending) {
        FB.warLoseProvince(state);
      } else {
        p.prestige = Math.max(0, p.prestige - 15);
        FB.news(state, '🕊 The campaign has failed. The host limps home.');
        FB.endPlayerWar(state);
      }
    }
  };

  /* ---- war-council handlers (called by event effects {custom:'war_*'}).
     Battle bonuses (led days, harrying, rest, mercenaries, mass levy) are
     read by the 'war_battle' named chance and spent when a battle is fought. */
  FB.fns = FB.fns || {};
  function afterBattle(w) { w.led = 0; w.harried = 0; w.rested = 0; }
  FB.fns.war_win = function (state) {
    const w = state.player.war; if (!w) return;
    w.wins++; afterBattle(w);
    w.strength = Math.max(0.5, (w.strength || 1) - 0.05); // victory also bleeds
    if (w.defending && w.enemySiege) w.enemySiege = Math.max(0, w.enemySiege - 1);
    FB.news(state, '⚔ Victory in the field! (' + w.wins + '/' + FBDATA.balance.warWinsToTakeProvince + ')');
    if (FB.chance(0.3)) FB.lootItem(state, null, '⚔ Among the spoils');
    FB.warOutcome(state);
  };
  FB.fns.war_loss = function (state) {
    const w = state.player.war; if (!w) return;
    w.losses++; afterBattle(w);
    w.strength = Math.max(0.5, (w.strength || 1) - 0.2);
    FB.news(state, '⚔ The host is bested… (' + w.losses + ' defeats)');
    FB.warOutcome(state);
  };
  FB.fns.war_harry = function (state) {
    const w = state.player.war; if (!w) return;
    w.harried = Math.min(2, (w.harried || 0) + 1);
    if (FB.chance(0.15)) FB.lootItem(state, null, '⚔ Taken in the raid');
  };
  FB.fns.war_hold = function (state) {
    const w = state.player.war; if (!w) return;
    w.rested = 1;
    w.strength = Math.min(1.1, (w.strength || 1) + 0.15); // the host mends
    if (w.enemySiege) w.enemySiege = Math.max(0, w.enemySiege - 1); // borders relieved
  };
  /* press the siege of the war's target (attacking wars only): your host
     must stand in the target province to keep the works going */
  FB.fns.war_can_siege = function (state) {
    const w = state.player.war;
    if (!(w && !w.defending && w.target && state.owner[w.target] === w.enemy)) return false;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    return !!host && host.at === w.target;
  };
  FB.fns.war_siege = function (state) {
    const w = state.player.war; if (!w || !FB.fns.war_can_siege(state)) return;
    const tname = FB.world.byId[w.target].name;
    w.siege = (w.siege || 0) + 1;
    if (FB.chance(0.4)) { // a sortie from the walls
      if (FB.chance(FB.namedChance(state, 'war_battle'))) {
        FB.news(state, '⚔ A sortie from ' + tname + ' is thrown back. The siege holds.');
      } else {
        w.siege = Math.max(0, w.siege - 1);
        w.strength = Math.max(0.5, (w.strength || 1) - 0.1);
        state.player.gold = Math.max(0, state.player.gold - 2);
        FB.news(state, '⚔ A night sortie burns your siege-works — the ring is set back.');
        return;
      }
    }
    if (w.siege >= 3) {
      FB.news(state, '🏰 The walls of ' + tname + ' are breached!');
      FB.warCapture(state);
    } else {
      FB.news(state, '⚔ The siege of ' + tname + ' tightens. (' + w.siege + '/3)');
    }
  };
  FB.fns.war_mercs = function (state) {
    const w = state.player.war; if (!w) return;
    w.mercCos = (w.mercCos || 0) + 1;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (host) {
      host.men += 150; host.mercs = (host.mercs || 0) + 150;
      host.size = (host.size === undefined ? host.men : host.size + 150); // the company swells the muster
    }
    FB.news(state, '⚔ A mercenary company takes your coin — ~150 spears join the host.');
  };
  /* mustering: the host takes the field at your seat (js/armies.js) */
  FB.fns.war_raise = function (state) {
    if (FB.raisePlayerHost) FB.raisePlayerHost(state);
  };
  FB.fns.war_mass = function (state) {
    const w = state.player.war; if (!w) return;
    w.mass = 1;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (host) { // already mustered: swell it now
      host.men = Math.round(host.men * 1.35);
      host.size = host.size === undefined ? host.men : Math.round(host.size * 1.35);
    } else if (FB.raisePlayerHost) FB.raisePlayerHost(state); // applies the great levy itself
  };
  /* the council's abstract pitched battle exists only while the enemy has
     no host in the field — a fielded enemy is fought on the map instead */
  FB.fns.war_no_enemy_host = function (state) {
    const w = state.player.war;
    if (!w) return false;
    return !(FB.hostOf && FB.hostOf(state, w.enemy));
  };
  FB.fns.war_can_hunt = function (state) {
    const w = state.player.war;
    return !!(w && FB.playerHost && FB.playerHost(state) && FB.hostOf && FB.hostOf(state, w.enemy));
  };
  FB.fns.war_hunt = function (state) {
    const w = state.player.war; if (!w) return;
    const host = FB.playerHost && FB.playerHost(state);
    const prey = FB.hostOf && FB.hostOf(state, w.enemy);
    if (!host || !prey) return;
    const ename = state.realms[w.enemy] ? state.realms[w.enemy].name : 'the enemy';
    if (FB.orderArmy(state, host, prey.at)) {
      host.huntPrey = w.enemy; // track the prey: re-path onto it each day
      FB.news(state, '🚩 The host marches to bring ' + ename + ' to battle.');
    } else {
      FB.news(state, '🚩 There is no road from here to the host of ' + ename + '.');
    }
  };
  /* small condition shifts for wartime flavor events */
  FB.fns.war_supply = function (state) {
    const w = state.player.war; if (!w) return;
    w.strength = Math.min(1.1, (w.strength || 1) + 0.1);
  };
  FB.fns.war_thin = function (state) {
    const w = state.player.war; if (!w) return;
    w.strength = Math.max(0.5, (w.strength || 1) - 0.1);
  };
  FB.fns.war_terms = function (state) {
    const p = state.player;
    const w = p.war; if (!w) return;
    const enemy = state.realms[w.enemy];
    if (w.defending) {
      const cost = 15 + 5 * (w.losses || 0);
      p.gold = Math.max(0, p.gold - cost);
      p.prestige = Math.max(0, p.prestige - 10);
      FB.news(state, '🕊 Peace is bought from ' + (enemy ? enemy.name : 'the enemy') + ' for ' + cost + ' gold.');
    } else {
      p.prestige = Math.max(0, p.prestige - 8);
      FB.news(state, '🕊 The campaign is abandoned. The banners come home.');
    }
    FB.endPlayerWar(state);
  };

  /* downfall resolutions: the df_* event chains end here */
  FB.fns.df_fall = function (state) { FB.loseAllLand(state, {}); };
  FB.fns.df_fall_flee = function (state) { FB.loseAllLand(state, { flee: true }); };

  FB.foundPlayerRealm = function (state) {
    const me = state.chars[state.player.charId];
    const p = state.player;
    const k = FB.playerKingdom(state), e = FB.playerEmpire(state);
    const nm = e ? 'Empire of ' + FBDATA.empires[e].name
             : k ? 'Kingdom of ' + FBDATA.kingdoms[k].name
             : 'Realm of ' + (me.dyn || me.name);
    state.realms.player = {
      id: 'player', name: nm, color: '#f0c840',
      capital: (p.provs && p.provs[0]) || p.provinceId,
      aggression: 0, alive: true, rank: Math.max(1, p.tier - 3), liege: null,
      ruler: { name: me.name, culture: me.culture, age: FB.ageOf(me, state.date.year), mar: FB.skillOf(me, 'mar') },
      war: null, op: 0
    };
    for (const pid of (p.provs || [])) { state.owner[pid] = 'player'; state.holder[pid] = 'player'; }
    p.liege = null;
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };

  /* how many of the given counties the player personally holds */
  function playerShare(state, countyIds) {
    const p = state.player;
    if (!p.provs || !p.provs.length) return 0;
    let n = 0;
    for (const pid of countyIds) if (p.provs.indexOf(pid) >= 0) n++;
    return n;
  }
  /* all de jure duchies the player controls the majority of (min 2 counties) */
  FB.playerDuchies = function (state) {
    const out = [];
    for (const did in FBDATA.duchies) {
      const cs = FB.duchyCounties(did);
      if (cs.length >= 2 && playerShare(state, cs) >= Math.max(2, Math.ceil(cs.length / 2))) out.push(did);
    }
    return out;
  };
  /* all de jure kingdoms the player controls the majority of */
  FB.playerKingdoms = function (state) {
    const out = [];
    for (const kid in FBDATA.kingdoms) {
      const cs = FB.kingdomCounties(kid);
      if (cs.length && playerShare(state, cs) >= Math.ceil(cs.length / 2)) out.push(kid);
    }
    return out;
  };
  /* all de jure empires where the player controls the majority of two kingdoms */
  FB.playerEmpires = function (state) {
    const out = [];
    for (const eid in FBDATA.empires) {
      let n = 0;
      for (const kid of FB.empireKingdoms(eid)) {
        const cs = FB.kingdomCounties(kid);
        if (cs.length && playerShare(state, cs) >= Math.ceil(cs.length / 2)) n++;
      }
      if (n >= 2) out.push(eid);
    }
    return out;
  };
  FB.playerDuchy = function (state) { return FB.playerDuchies(state)[0] || null; };
  FB.playerKingdom = function (state) { return FB.playerKingdoms(state)[0] || null; };
  FB.playerEmpire = function (state) { return FB.playerEmpires(state)[0] || null; };

  /* every title the player holds, highest dignity first — for the Self tab.
     High titles come as {d:'Empire'|'Kingdom'|'Duchy'|'Barony', t:'Emir of X'};
     counties are returned as bare ids so the caller can render them compactly. */
  FB.playerTitles = function (state) {
    const p = state.player, out = [];
    if (p.tier === 3) {
      const pr = FB.world && FB.world.byId[p.provinceId];
      out.push({ d: 'Barony', t: FB.titleWordFor(state, 3) + ' of ' + (pr ? pr.name : '?') });
      return { high: out, counties: [] };
    }
    if (p.tier < 4) return { high: [], counties: [] };
    for (const eid of FB.playerEmpires(state)) out.push({ d: 'Empire', t: FB.titleWordFor(state, 7) + ' of ' + FBDATA.empires[eid].name });
    for (const kid of FB.playerKingdoms(state)) out.push({ d: 'Kingdom', t: FB.titleWordFor(state, 6) + ' of ' + FBDATA.kingdoms[kid].name });
    for (const did of FB.playerDuchies(state)) out.push({ d: 'Duchy', t: FB.titleWordFor(state, 5) + ' of ' + FBDATA.duchies[did].name });
    return { high: out, counties: (p.provs || []).slice() };
  };

  FB.checkTierPromotions = function (state) {
    const p = state.player;
    // no one is his own vassal — repair saves where a flight into the
    // player's own demesne left p.liege pointing at the player's realm
    if (p.liege === 'player') p.liege = null;
    // a baron is a status inside a county: if the liege bond was lost (his
    // lord's house died, or an older save), he answers to whoever holds his
    // home county now — a baron is never "independent"
    if (p.tier === 3 && !(p.liege && state.realms[p.liege] && state.realms[p.liege].alive)) {
      const bh = (state.holder && state.holder[p.provinceId]) || state.owner[p.provinceId];
      if (bh && bh !== 'player' && state.realms[bh] && state.realms[bh].alive) p.liege = bh;
    }
    const n = p.provs ? p.provs.length : 0;
    const indep = state.realms.player && state.realms.player.alive;
    // a liege must outrank his man (a count answers to a duke, a duke to a
    // king): older grants could leave the player kneeling to a mere peer —
    // walk up the chain to the first lord of truly higher rank
    if (p.tier >= 4) {
      const pRank = Math.max(1, p.tier - 3);
      let guard = 0;
      while (p.liege && state.realms[p.liege] && state.realms[p.liege].rank <= pRank &&
             state.realms[p.liege].liege && guard++ < 10) {
        p.liege = state.realms[p.liege].liege;
      }
    }
    let newTier = p.tier;
    if (n >= 1 && p.tier < 4) newTier = 4;
    if (FB.playerDuchy(state) && p.tier < 5) newTier = 5;
    if (indep && FB.playerKingdom(state) && p.tier < 6) newTier = 6;
    if (indep && FB.playerEmpire(state) && p.tier < 7) newTier = 7;
    if (newTier > p.tier) {
      p.tier = newTier;
      FB.news(state, '👑 You are raised to ' + FB.titleFor(state) + '!');
      p.prestige += 30 * newTier;
      if (indep) FB.foundPlayerRealm(state); // restyle the realm at its new dignity
    }
  };

  FB.news = function (state, text) {
    state.log.push({ y: state.date.year, s: state.date.season, d: state.date.day, t: text });
    // the chronicle shows the last 80 entries; unbounded growth would make
    // every seasonal autosave serialize an ever-longer history
    if (state.log.length > 300) state.log.splice(0, state.log.length - 300);
    // an observer who asked for quiet still gets the chronicle, not the popups
    if (FB.ui && FB.ui.toast && !(FB.game.observe && FB.game.obsQuiet)) FB.ui.toast(text);
  };
})();
