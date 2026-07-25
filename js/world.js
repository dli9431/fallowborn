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

  /* A lord may raise one servant far; repeatedly enriching the same man in
     one lifetime is another matter. Every successful feudal grant compounds
     the odds of the next by balance.liegeGrantRepeatMult. Purchases, conquest,
     settlement, inheritance, and de jure promotions never call this helper. */
  FB.liegeGrantMultiplier = function (state) {
    const B = FBDATA.balance;
    const mult = B.liegeGrantRepeatMult !== undefined ? B.liegeGrantRepeatMult : 0.2;
    return Math.pow(mult, (state.player && state.player.liegeGrants) || 0);
  };
  FB.liegeGrantChance = function (state, chance) {
    return FB.clamp(chance, 0, 1) * FB.liegeGrantMultiplier(state);
  };
  FB.recordLiegeGrant = function (state) {
    state.player.liegeGrants = (state.player.liegeGrants || 0) + 1;
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
  let kingdomCountyLists = {}; // static like dejureCounties; rebuilt per kid on demand
  FB.kingdomCounties = function (kid) {
    if (!kingdomCountyLists[kid]) {
      const out = [];
      for (const did in FBDATA.duchies) {
        if (FBDATA.duchies[did].kingdom === kid) out.push.apply(out, FB.duchyCounties(did));
      }
      kingdomCountyLists[kid] = out;
    }
    return kingdomCountyLists[kid];
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
        aggression: r.aggression !== undefined ? r.aggression : 1,
        rank: r.rank || 3, liege: r.liege || null,
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
    FB.ensureDynasticState(state);
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
      op: 0, generated: true, favor: FB.ri(-15, 15) // the house's standing at its liege's court
    };
    state.realms[r.id] = r;
    if (state.date) FB.ensureRealmSuccession(state, r.id);
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

  /* the tempers of generated rulers — a house's personality, read by the
     royal council (schemers, flatterers, loyal men) at king tier and up */
  FB.RULER_TRAITS = ['ambitious', 'content', 'greedy', 'generous', 'cruel', 'kind',
    'deceitful', 'honest', 'proud', 'humble', 'zealous', 'cynical', 'wrathful', 'patient'];

  function makeRuler(culture) {
    return {
      name: FB.randomName(culture, 'm'),
      sex: 'm',
      culture: culture,
      age: FB.ri(20, 55),
      mar: FB.ri(2, 14),
      trait: FB.pick(FB.RULER_TRAITS),
      generation: 1
    };
  }

  /* ================= DYNASTIC REALMS & ALLIANCES =================
     AI courts keep a compact family tree rather than full characters. A royal
     child becomes a real character only when play needs one (courtship), while
     the lightweight member id remains the durable succession identity. */

  function royalMemberSort(a, b) {
    if (a.sex !== b.sex) return a.sex === 'm' ? -1 : 1;
    return a.born - b.born;
  }

  function realmFaithGroup(state, rid) {
    const r = state.realms[rid];
    const pr = r && FB.world.byId[r.capital];
    return pr ? FB.religionOf(pr.religion).group : null;
  }
  FB.realmFaithGroup = realmFaithGroup;

  function newRoyalMember(state, realm, parentId, ageMax) {
    const sex = FB.chance(0.55) ? 'm' : 'f';
    const max = Math.max(0, ageMax === undefined ? 28 : ageMax);
    return {
      id: 'royal_' + realm.id + '_' + FB.uid(),
      name: FB.randomName(realm.ruler.culture, sex),
      sex: sex,
      born: state.date.year - FB.ri(0, max),
      alive: true,
      parentId: parentId || null,
      childIds: [],
      charId: null
    };
  }

  function orderedMemberIds(succession, parentId) {
    const list = [];
    for (const id in succession.members) {
      const m = succession.members[id];
      if ((m.parentId || null) === (parentId || null)) list.push(m);
    }
    list.sort(royalMemberSort);
    return list.map(function (m) { return m.id; });
  }

  function expandDeadBranch(succession, id, out, seen) {
    if (seen[id]) return;
    seen[id] = 1;
    const m = succession.members[id];
    if (!m) return;
    if (m.alive !== false) { out.push(id); return; }
    const kids = orderedMemberIds(succession, id);
    for (const kid of kids) expandDeadBranch(succession, kid, out, seen);
  }

  FB.refreshRealmSuccession = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return null;
    const s = r.succession;
    if (!s || !s.members) return FB.ensureRealmSuccession(state, rid);
    const source = s.order && s.order.length ? s.order.slice() :
      orderedMemberIds(s, s.rulerMemberId || null);
    const out = [], seen = {};
    for (const id of source) {
      const m = s.members[id];
      if (m && m.charId) {
        const c = state.chars && state.chars[m.charId];
        if (!c || c.dead) m.alive = false;
      }
      expandDeadBranch(s, id, out, seen);
    }
    s.order = out;
    s.heirId = out.length ? out[0] : null;
    // Every compact royal house exposes one designated successor. If an
    // entire lightweight line dies out, repair it with a young collateral
    // branch instead of leaving the UI and ruler transition heirless.
    if (!s.heirId) makeHeirIfEmpty(state, r, s);
    return s;
  };

  FB.ensureRealmSuccession = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive || rid === 'player') return null;
    if (!r.ruler) {
      const cap = FB.world.byId[r.capital];
      r.ruler = makeRuler(cap ? cap.culture : 'frankish');
    }
    if (r.ruler.generation === undefined) r.ruler.generation = 1;
    if (!r.succession || !r.succession.members) {
      const s = {
        rulerGeneration: r.ruler.generation,
        rulerMemberId: null,
        members: {},
        order: [],
        heirId: null
      };
      const possibleAge = Math.max(0, Math.min(28, r.ruler.age - 16));
      const count = FB.ri(2, 4);
      const made = [];
      for (let i = 0; i < count; i++) {
        const m = newRoyalMember(state, r, null, possibleAge);
        s.members[m.id] = m;
        made.push(m);
      }
      made.sort(royalMemberSort);
      s.order = made.map(function (m) { return m.id; });
      s.heirId = s.order[0];
      r.succession = s;
    }
    return FB.refreshRealmSuccession(state, rid);
  };

  FB.ensureDynasticState = function (state) {
    state.alliances = state.alliances || [];
    for (const rid in state.realms) {
      const r = state.realms[rid];
      if (!r || !r.alive) continue;
      if (rid === 'player') {
        if (r.ruler && r.ruler.generation === undefined) r.ruler.generation = 1;
        r.succession = r.succession || {
          playerDynasty: true,
          rulerGeneration: r.ruler ? r.ruler.generation : 1,
          heirCharId: null
        };
      } else {
        FB.ensureRealmSuccession(state, rid);
      }
    }
    FB.repairAlliances(state);
  };

  FB.realmFamily = function (state, rid) {
    const r = state.realms[rid];
    const s = FB.ensureRealmSuccession(state, rid);
    if (!r || !s) return [];
    const parent = s.rulerMemberId || null;
    const ids = orderedMemberIds(s, parent).filter(function (id) {
      return s.members[id] && s.members[id].alive !== false;
    });
    for (const id of s.order) if (ids.indexOf(id) < 0) ids.push(id);
    return ids.slice(0, 6).map(function (id) { return s.members[id]; });
  };

  function tickRoyalFamily(state, rid) {
    const s = FB.ensureRealmSuccession(state, rid);
    if (!s) return;
    for (const id in s.members) {
      const m = s.members[id];
      if (m.alive === false || id === s.rulerMemberId || m.charId) continue;
      const age = Math.max(0, state.date.year - m.born);
      const q = age < 5 ? 0.03 : age < 16 ? 0.006 : age < 50 ? 0.008 :
        age < 65 ? 0.03 : age < 80 ? 0.1 : 0.25;
      if (FB.chance(q)) m.alive = false;
    }
    FB.refreshRealmSuccession(state, rid);
  }

  FB.materializeRoyalChild = function (state, rid, memberId) {
    const r = state.realms[rid];
    const s = FB.ensureRealmSuccession(state, rid);
    const m = s && s.members[memberId];
    if (!r || !m || m.alive === false) return null;
    if (m.charId && state.chars[m.charId] && !state.chars[m.charId].dead) return state.chars[m.charId];
    const cap = FB.world.byId[r.capital];
    const c = FB.makeCharacter(state, {
      name: m.name,
      sex: m.sex,
      culture: r.ruler.culture,
      religion: cap ? cap.religion : state.chars[state.player.charId].religion,
      born: m.born,
      dyn: 'of ' + r.name,
      station: r.rank <= 2 ? 3 : 4,
      quality: Math.max(2, r.rank + 1),
      opinion: FB.ri(-5, 20)
    });
    c.health = 8;
    c.royalLine = { realmId: rid, memberId: memberId };
    m.charId = c.id;
    return c;
  };

  /* The compact tree still enforces the ordinary close-blood marriage bar.
     Root members share the unmaterialized founding ruler (parentId null);
     cousins remain eligible, matching the full-character kin rules. */
  FB.royalCloseKin = function (state, a, b) {
    if (!a || !b || !a.royalLine || !b.royalLine ||
        a.royalLine.realmId !== b.royalLine.realmId) return false;
    const r = state.realms[a.royalLine.realmId];
    const s = r && FB.ensureRealmSuccession(state, r.id);
    const ma = s && s.members[a.royalLine.memberId];
    const mb = s && s.members[b.royalLine.memberId];
    if (!ma || !mb) return false;
    if (ma.id === mb.id || ma.parentId === mb.id || mb.parentId === ma.id) return true;
    function siblings(x, y) {
      return !!x && !!y && x.id !== y.id &&
        (x.parentId || null) === (y.parentId || null);
    }
    if (siblings(ma, mb)) return true;
    const pa = ma.parentId && s.members[ma.parentId];
    const pb = mb.parentId && s.members[mb.parentId];
    if ((pa && siblings(pa, mb)) || (pb && siblings(pb, ma))) return true;
    if ((pa && pa.parentId === mb.id) || (pb && pb.parentId === ma.id)) return true;
    return false;
  };

  FB.registerRoyalBirth = function (state, child, father, mother) {
    const candidates = [];
    if (father && father.royalLine) candidates.push(father);
    if (mother && mother.royalLine) candidates.push(mother);
    const compact = state.player && state.player.royalCompact;
    let royal = null;
    if (compact) {
      for (const candidate of candidates) {
        if (candidate.royalLine.realmId === compact.realmId) {
          royal = candidate;
          break;
        }
      }
    }
    if (!royal) {
      for (const candidate of candidates) {
        const candidateRealm = state.realms[candidate.royalLine.realmId];
        if (candidateRealm && candidateRealm.alive) {
          royal = candidate;
          break;
        }
      }
    }
    if (!royal || !child) return;
    const line = royal.royalLine;
    const r = state.realms[line.realmId];
    const s = r && FB.ensureRealmSuccession(state, line.realmId);
    const parent = s && s.members[line.memberId];
    if (!r || !s || !parent) return;
    const m = {
      id: 'royal_' + r.id + '_' + FB.uid(),
      name: child.name,
      sex: child.sex,
      born: child.born,
      alive: !child.dead,
      parentId: parent.id,
      childIds: [],
      charId: child.id
    };
    s.members[m.id] = m;
    parent.childIds = parent.childIds || [];
    parent.childIds.push(m.id);
    child.royalLine = { realmId: r.id, memberId: m.id };
    if (s.rulerMemberId === parent.id) {
      const children = orderedMemberIds(s, parent.id);
      const rest = s.order.filter(function (id) { return children.indexOf(id) < 0; });
      s.order = children.concat(rest);
    }
    FB.refreshRealmSuccession(state, r.id);
  };

  FB.royalCharDied = function (state, c) {
    if (!c || !c.royalLine) return;
    const line = c.royalLine;
    const r = state.realms[line.realmId];
    const s = r && FB.ensureRealmSuccession(state, line.realmId);
    const m = s && s.members[line.memberId];
    if (!m) return;
    m.alive = false;
    if (s.rulerMemberId === m.id && r.alive) FB.advanceRealmSuccession(state, r.id);
    else FB.refreshRealmSuccession(state, r.id);
  };

  function makeHeirIfEmpty(state, r, s) {
    if (s.order.length) return;
    const parentId = s.rulerMemberId || null;
    const m = newRoyalMember(state, r, parentId, Math.max(0, Math.min(8, r.ruler.age - 16)));
    s.members[m.id] = m;
    if (parentId && s.members[parentId]) {
      s.members[parentId].childIds = s.members[parentId].childIds || [];
      s.members[parentId].childIds.push(m.id);
    }
    s.order = [m.id];
    s.heirId = m.id;
  }

  FB.advanceRealmSuccession = function (state, rid) {
    const r = state.realms[rid];
    const s = FB.ensureRealmSuccession(state, rid);
    if (!r || !s) return null;
    FB.refreshRealmSuccession(state, rid);
    makeHeirIfEmpty(state, r, s);
    const heirId = s.order.shift();
    const heir = s.members[heirId];
    if (!heir) return null;
    s.rulerMemberId = heirId;
    const children = orderedMemberIds(s, heirId);
    s.order = children.concat(s.order.filter(function (id) { return children.indexOf(id) < 0; }));
    const c = heir.charId && state.chars[heir.charId];
    r.ruler = {
      name: c ? c.name : heir.name,
      sex: c ? c.sex : heir.sex,
      culture: c ? c.culture : r.ruler.culture,
      age: c ? FB.ageOf(c, state.date.year) : Math.max(0, state.date.year - heir.born),
      mar: c ? FB.skillOf(c, 'mar') : FB.ri(2, 14),
      trait: c && c.traits && c.traits.length ? c.traits[0] : FB.pick(FB.RULER_TRAITS),
      generation: (s.rulerGeneration || 1) + 1
    };
    s.rulerGeneration = r.ruler.generation;
    makeHeirIfEmpty(state, r, s);
    FB.refreshRealmSuccession(state, rid);
    FB.repairAlliances(state);
    if (c && c.id === state.player.charId && FB.absorbRealm) FB.absorbRealm(state, rid, c);
    return heir;
  };

  function pairIds(a, b) { return a < b ? [a, b] : [b, a]; }

  FB.realmRulerGeneration = function (state, rid) {
    const r = state.realms[rid];
    return r && r.ruler && r.ruler.generation !== undefined ? r.ruler.generation : 1;
  };

  FB.repairAlliances = function (state) {
    state.alliances = state.alliances || [];
    const out = [], occupied = {};
    for (const a of state.alliances) {
      if (!a || !a.a || !a.b || a.a === a.b || occupied[a.a] || occupied[a.b]) continue;
      const ra = state.realms[a.a], rb = state.realms[a.b];
      if (!ra || !rb || !ra.alive || !rb.alive) continue;
      if (a.aGen !== FB.realmRulerGeneration(state, a.a) ||
          a.bGen !== FB.realmRulerGeneration(state, a.b)) continue;
      occupied[a.a] = occupied[a.b] = 1;
      out.push(a);
    }
    state.alliances = out;
    return out;
  };

  FB.allianceOf = function (state, rid) {
    FB.repairAlliances(state);
    for (const a of state.alliances) if (a.a === rid || a.b === rid) return a;
    return null;
  };

  FB.alliedRealm = function (state, rid) {
    const a = FB.allianceOf(state, rid);
    return a ? (a.a === rid ? a.b : a.a) : null;
  };

  FB.areAllied = function (state, a, b) {
    const p = pairIds(a, b), al = FB.allianceOf(state, p[0]);
    return !!al && al.a === p[0] && al.b === p[1];
  };

  FB.formAlliance = function (state, a, b, source) {
    const p = pairIds(a, b);
    if (p[0] === p[1] || FB.allianceOf(state, p[0]) || FB.allianceOf(state, p[1])) return false;
    const ra = state.realms[p[0]], rb = state.realms[p[1]];
    if (!ra || !rb || !ra.alive || !rb.alive) return false;
    if (FB.isRealmAtWar && (FB.isRealmAtWar(state, p[0]) || FB.isRealmAtWar(state, p[1]))) {
      return false;
    }
    state.alliances.push({
      a: p[0], b: p[1], source: source || 'diplomacy',
      aGen: FB.realmRulerGeneration(state, p[0]),
      bGen: FB.realmRulerGeneration(state, p[1])
    });
    return true;
  };

  FB.breakAlliance = function (state, rid, partner) {
    state.alliances = (state.alliances || []).filter(function (a) {
      return !((a.a === rid && (!partner || a.b === partner)) ||
        (a.b === rid && (!partner || a.a === partner)));
    });
  };

  FB.aiBaseHost = function (state, rid) {
    return Math.max(60, Math.round(FB.realmStrength(state, rid) *
      FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3)));
  };

  FB.alliedReinforcement = function (state, defenderId) {
    const allyId = FB.alliedRealm(state, defenderId);
    if (!allyId || FB.isRealmAtWar(state, allyId)) return { ally: null, men: 0 };
    const defenderBase = defenderId === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, defenderId);
    const allyBase = allyId === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, allyId);
    return { ally: allyId, men: Math.max(0, Math.round(Math.min(allyBase * 0.25, defenderBase * 0.5))) };
  };

  FB.realmDefensiveStrength = function (state, rid) {
    const base = rid === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, rid);
    return base + FB.alliedReinforcement(state, rid).men;
  };

  FB.isPlayerSovereign = function (state) {
    const r = state.realms.player;
    return !!(r && r.alive && !r.liege);
  };

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
    const realm = state.realms[realmId];
    if (realm && realm.liege) return FB.realmTerritory(state, realmId);
    return rc.provs[realmId] || [];
  };

  FB.realmStrength = function (state, realmId) {
    rcEnsure(state);
    const realm = state.realms[realmId];
    if (realm && realm.liege) {
      let strength = 0;
      for (const pid of FB.realmTerritory(state, realmId)) strength += state.dev[pid] || 1;
      return strength;
    }
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

  /* a realm left holding nothing at all dies; its orphaned vassals pass to
     its liege (mirrors the dissolution block of FB.transferProvince). Call
     AFTER invalidateRealmCache so realmTerritory reads fresh holdings */
  FB.realmBuryIfEmpty = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    if (FB.realmTerritory(state, rid).length) return;
    r.alive = false; r.war = null;
    for (const vid in state.realms) if (state.realms[vid].liege === rid) state.realms[vid].liege = r.liege || null;
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
    // a baron is bound to his county: if his home itself changed hands he
    // answers to its new holder — even when his old lord's house survives
    // elsewhere, he kneels to the land's master, not to a memory
    if (state.player && state.player.tier === 3 && state.player.provinceId === pid &&
        state.player.liege !== toRealm && toRealm !== 'player' &&
        state.realms[toRealm] && state.realms[toRealm].alive) {
      state.player.liege = toRealm;
    }
    // player consequences
    if (state.player && state.player.provs && state.player.provs.indexOf(pid) >= 0 && toRealm !== 'player') {
      state.player.provs.splice(state.player.provs.indexOf(pid), 1);
    }
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };

  /* a petty count dies without an heir: the fief escheats to his liege —
     unless the player borders it, shares its sovereign, and has the standing
     to win the scramble at court. Returns true when the house was buried */
  FB.escheatRealm = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return false;
    const held = FB.realmHeldCounties(state, rid);
    if (!held.length) return false;
    const p = state.player;
    const liege = (r.liege && state.realms[r.liege] && state.realms[r.liege].alive) ? r.liege : FB.topRealm(state, rid);
    // orphaned vassals pass to the dead house's liege
    for (const vid in state.realms) if (state.realms[vid].liege === rid) state.realms[vid].liege = liege || null;
    for (const pid of held) {
      const pr = FB.world.byId[pid];
      let toPlayer = false;
      if (liege === 'player') {
        // your own man dies heirless: the fief returns to your hand
        toPlayer = true;
        FB.news(state, FB.msg('news.world.escheat_to_player',
          '🕯 The lord of {province} dies without an heir — the fief returns to your hand.',
          { province: pr.name }));
      } else if (p.tier >= 4 && p.provs && liege && state.realms[liege] &&
                 FB.topRealm(state, rid) === FB.playerRealmId(state)) {
        // the scramble: you must border the empty fief and share its sovereign
        let borders = false;
        for (const my of p.provs) { if (FB.world.adj[my] && FB.world.adj[my][pid]) { borders = true; break; } }
        if (borders) {
          const c = FB.liegeGrantChance(state,
            FB.clamp(0.10 + FB.liegeOpOf(state, liege) / 250 + p.prestige / 2000 +
              (p.warService || 0) / 100, 0.05, 0.6));
          if (FB.chance(c)) {
            toPlayer = true;
            FB.recordLiegeGrant(state);
            FB.news(state, FB.msg('news.world.escheat_granted',
              '🕯 The lord of {province} dies without an heir — {liege} passes over every other suit and invests you with {province}.',
              { province: pr.name, liege: state.realms[liege].name }));
          }
        }
      }
      if (toPlayer) {
        p.provs = p.provs || [];
        if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
        state.holder[pid] = 'player';
      } else {
        state.holder[pid] = liege;
        if (FB.game.observe || (FB.world.adj[p.provinceId] && FB.world.adj[p.provinceId][pid])) {
          FB.news(state, FB.msg('news.world.escheat_observed', {
            forms: {
              select: 'value', param: 'holder', cases: {
                realm: '🕯 {province} escheats to {liege} — its lord died without an heir.',
                other: '🕯 {province} escheats to the crown — its lord died without an heir.'
              }
            }
          }, {
            holder: state.realms[liege] ? 'realm' : 'other',
            province: pr.name,
            liege: state.realms[liege] ? state.realms[liege].name : ''
          }));
        }
      }
    }
    r.alive = false; r.war = null;
    FB.invalidateRealmCache();
    FB.checkTierPromotions(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  };

  FB.playerRealmId = function (state) {
    // the SOVEREIGN realm the player answers to (liege's top, own realm, or home)
    if (state.realms.player && state.realms.player.alive) return FB.topRealm(state, 'player');
    if (state.player.liege) return FB.topRealm(state, state.player.liege);
    return state.owner[state.player.provinceId] || null;
  };

  /* found a new holding on empty land: a bordering wasteland becomes a true
     county of the player's demesne — the settlers' own culture and faith,
     outside every de jure duchy (a colony, not a duchy-maker) */
  FB.settleWaste = function (state, pid) {
    const p = state.player, pr = FB.world.byId[pid];
    if (!pr || !pr.wasteland) return;
    const me = state.chars[p.charId];
    pr.wasteland = false;
    pr.culture = me.culture;
    pr.religion = me.religion;
    state.dev[pid] = 1;
    state.holder[pid] = 'player';
    state.owner[pid] = FB.playerRealmId(state) || 'player';
    p.provs = p.provs || [];
    if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
    FB.applyEffects(state, {
      gold: -FBDATA.balance.settleGold, prestige: -FBDATA.balance.settlePrestige
    });
    FB.news(state, FB.msg('news.world.wasteland_settlement_record',
      'Settled the empty land of {province}.', { province: pr.name }));
    FB.invalidateRealmCache();
    FB.checkTierPromotions(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    FB.news(state, FB.msg('news.world.wasteland_settled',
      '🌱 You settle the empty land of {province} — smoke rises where only the wind went before.',
      { province: pr.name }));
  };

  FB.isRealmAtWar = function (state, realmId) {
    realmId = FB.topRealm(state, realmId);
    const r = state.realms[realmId];
    if (r && r.war) return true;
    // player wars occupy both the sovereign the player answers for and the
    // enemy sovereign; neither may enter a second conflict
    const pw = state.player.war;
    if (pw) {
      const playerRealm = FB.playerRealmId(state);
      const enemyRealm = FB.topRealm(state, pw.enemy);
      if (realmId === 'player' || realmId === playerRealm || realmId === enemyRealm) return true;
    }
    for (const id in state.realms) {
      const rr = state.realms[id];
      if (rr.alive && rr.war && FB.topRealm(state, rr.war.enemy) === realmId) return true;
    }
    return false;
  };

  /* Old saves may contain wars created before the one-war-per-sovereign
     invariant. Keep the player's valid war first, then accept valid AI wars
     in stable realm-id order while no endpoint is already occupied. */
  FB.repairWars = function (state) {
    if (!state || !state.player || !state.realms) return;
    const used = {}, activeHosts = {};
    const pw = state.player.war;
    if (pw) {
      const enemy = state.realms[pw.enemy];
      const enemyRealm = enemy && FB.topRealm(state, pw.enemy);
      const playerRealm = FB.playerRealmId(state);
      if (!enemy || !enemy.alive || enemyRealm !== pw.enemy || pw.enemy === 'player') {
        state.player.war = null;
        if (FB.validateFocus) FB.validateFocus(state);
      } else {
        used.player = activeHosts.player = 1;
        used[enemyRealm] = activeHosts[enemyRealm] = 1;
        if (playerRealm) used[playerRealm] = 1;
      }
    }

    const ids = Object.keys(state.realms).sort();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], r = state.realms[id];
      if (id === 'player' || !r || !r.war) continue;
      const enemyId = r.war.enemy;
      const enemy = state.realms[enemyId];
      const valid = r.alive && !r.liege && enemy && enemy.alive && !enemy.liege &&
        enemyId !== 'player' && enemyId !== id;
      if (!valid || used[id] || used[enemyId]) {
        r.war = null;
        continue;
      }
      used[id] = used[enemyId] = 1;
      activeHosts[id] = activeHosts[enemyId] = 1;
    }

    const armies = Array.isArray(state.armies) ? state.armies : [];
    const seenHosts = {};
    state.armies = armies.filter(function (army) {
      if (!army || !activeHosts[army.realm] || seenHosts[army.realm]) return false;
      seenHosts[army.realm] = 1;
      return true;
    });
  };

  /* ================= YEARLY WORLD TICK ================= */

  FB.worldTick = function (state) {
    const B = FBDATA.balance;
    FB.ensureDynasticState(state);
    // scripted history
    const scripted = FBDATA.scripted || [];
    for (let scriptedIndex = 0; scriptedIndex < scripted.length; scriptedIndex++) {
      const ev = scripted[scriptedIndex];
      if (ev.year !== state.date.year || state.flags['scripted_' + ev.year + '_' + (ev.newRealm ? ev.newRealm.id : ev.realm)]) continue;
      state.flags['scripted_' + ev.year + '_' + (ev.newRealm ? ev.newRealm.id : ev.realm)] = 1;
      let rid = ev.realm;
      if (ev.newRealm) {
        rid = ev.newRealm.id;
        const cap = FB.world.byId[ev.newRealm.capital];
        state.realms[rid] = {
          id: rid, name: ev.newRealm.name, color: ev.newRealm.color,
          capital: ev.newRealm.capital,
          aggression: ev.newRealm.aggression !== undefined ? ev.newRealm.aggression : 1,
          rank: ev.newRealm.rank || 3, liege: ev.newRealm.liege || null,
          alive: true, ruler: makeRuler(cap ? cap.culture : 'arabic'), war: null, op: 0
        };
        FB.ensureRealmSuccession(state, rid);
      }
      if (state.realms[rid] && state.realms[rid].alive) {
        for (const pid of ev.targets) {
          if (state.owner[pid] !== undefined && state.owner[pid] !== 'player') FB.transferProvince(state, pid, rid);
        }
      }
      const scriptedKey = FB.scriptedMessageKey(ev);
      FB.registerMessage(scriptedKey, { text: '📜 ' + ev.news });
      FB.news(state, FB.message(scriptedKey, {}));
    }

    // realm AI
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || id === 'player') continue;
      FB.ensureRealmSuccession(state, id);
      tickRoyalFamily(state, id);
      // a vassal house's standing at its liege's court drifts with the years
      if (r.liege) r.favor = FB.clamp((r.favor || 0) + FB.ri(-9, 9), -100, 100);
      // ruler ages & dies
      r.ruler.age++;
      const q = r.ruler.age > 70 ? 0.18 : r.ruler.age > 55 ? 0.07 : 0.02;
      if (FB.chance(q)) {
        const succession = FB.refreshRealmSuccession(state, id);
        // Escheat is now the last resort for a genuinely exhausted count line.
        if (r.liege && r.rank === 1 && (!succession || !succession.heirId) &&
            FB.chance(B.escheatChance || 0) && FB.escheatRealm(state, id)) continue;
        const oldGeneration = r.ruler.generation;
        const rulerMember = succession && succession.members[succession.rulerMemberId];
        const rulerChar = rulerMember && rulerMember.charId &&
          state.chars[rulerMember.charId];
        if (rulerChar && !rulerChar.dead && FB.killChar) {
          // A courted royal remains a full character after taking the throne.
          // Use the normal death path so marriage and role links also close;
          // royalCharDied advances the realm exactly once.
          FB.killChar(state, rulerChar);
        } else {
          if (rulerMember) rulerMember.alive = false;
          FB.advanceRealmSuccession(state, id);
        }
        // Defensive repair for malformed saves whose materialized ruler was
        // already dead but had not advanced the compact succession record.
        if (r.alive && r.ruler.generation === oldGeneration) {
          FB.advanceRealmSuccession(state, id);
        }
        if (FB.game.observe || id === FB.playerRealmId(state) || id === state.player.liege) {
          FB.news(state, FB.msg('news.world.ruler_succeeds',
            '👑 The ruler of {realm} is dead. {ruler} rises in their place.',
            { realm: r.name, ruler: r.ruler.name }));
        }
        if (!r.alive) continue; // the new ruler was the protagonist and joined the realms
      }
      if (r.liege) continue; // vassals make no foreign policy of their own
      // war resolution
      if (r.war) {
        const enemy = state.realms[r.war.enemy];
        if (!enemy || !enemy.alive) { r.war = null; continue; }
        const sa = FB.realmStrength(state, id) * (1 + r.ruler.mar / 30) * FB.rf(0.7, 1.3) *
          (1 + 0.12 * ((r.war.fw || 0) - (r.war.fl || 0))); // field wins tilt the war
        const defenseRatio = FB.realmDefensiveStrength(state, r.war.enemy) /
          Math.max(1, FB.aiBaseHost(state, r.war.enemy));
        const sd = FB.realmStrength(state, r.war.enemy) * defenseRatio *
          (1 + enemy.ruler.mar / 30) * FB.rf(0.7, 1.3) *
          (1 + 0.12 * ((r.war.fl || 0) - (r.war.fw || 0)));
        const winner = sa > sd ? id : r.war.enemy;
        const loser = winner === id ? r.war.enemy : id;
        const taken = FB.borderProvince(state, loser, winner);
        if (taken) {
          FB.transferProvince(state, taken, winner);
          r.war.captures = (r.war.captures || 0) + 1;
          const pv = FB.world.byId[taken];
          if (FB.game.observe) { // the watcher hears of every fall, far or near
            FB.news(state, FB.msg('news.world.province_falls',
              '⚔ {province} has fallen to {winner}.', {
                province: pv.name,
                winner: state.realms[winner] ? state.realms[winner].name : winner
              }));
          } else if (taken === state.player.provinceId) {
            FB.news(state, FB.msg('news.world.home_conquered',
              '⚔ {winner} has conquered {province} — your home! New masters rule here now.', {
                winner: state.realms[winner] ? state.realms[winner].name : winner,
                province: pv.name
              }));
          } else if (FB.world.adj[state.player.provinceId] && FB.world.adj[state.player.provinceId][taken]) {
            FB.news(state, FB.msg('news.world.province_falls',
              '⚔ {province} has fallen to {winner}.', {
                province: pv.name,
                winner: state.realms[winner] ? state.realms[winner].name : winner
              }));
          }
        }
        r.war.years++;
        if (!state.realms[loser].alive) { r.war = null; }
        else if (r.war.years >= 3 || FB.chance(0.35) || (r.war.captures || 0) >= 2) {
          r.war = null; // peace
        }
      } else if (!FB.isRealmAtWar(state, id) &&
                 FB.chance(B.aiWarChance * (0.5 + 0.5 * r.aggression))) {
        // pick a neighboring realm to attack
        const targets = [];
        for (const id2 in state.realms) {
          if (id2 === id) continue;
          const r2 = state.realms[id2];
          if (!r2.alive || r2.liege || FB.isRealmAtWar(state, id2) ||
              FB.areAllied(state, id, id2)) continue; // peaceful sovereigns only
          if (id2 === 'player') continue; // wars vs player handled below
          if (FB.realmsAdjacent(state, id, id2)) targets.push(id2);
        }
        if (targets.length) {
          // prefer weaker targets
          targets.sort(function (a, b) {
            return FB.realmDefensiveStrength(state, a) - FB.realmDefensiveStrength(state, b);
          });
          const t = targets[FB.chance(0.6) ? 0 : Math.floor(FB.rng() * targets.length)];
          r.war = { enemy: t, years: 0, captures: 0,
            casus: { type: 'border', label: 'Border war' } };
          const homeRealm = state.owner[state.player.provinceId];
          if (FB.game.observe || id === homeRealm || t === homeRealm) {
            FB.news(state, FB.msg('news.world.ai_war',
              '🔥 War! {attacker} marches against {defender}.',
              { attacker: r.name, defender: state.realms[t].name }));
          }
        }
      }
      // AI may attack an independent player realm
      const relationMult = FB.clamp(
        1 - FB.realmOpinionOf(state, id) / 100,
        B.foreignOpinionAttackMin,
        B.foreignOpinionAttackMax
      );
      const deterrence = FB.clamp(FB.aiBaseHost(state, id) /
        Math.max(1, FB.realmDefensiveStrength(state, 'player')), 0.25, 1.25);
      if (!FB.isRealmAtWar(state, id) && FB.isPlayerSovereign(state) && !state.player.war &&
        !(state.pacts && state.pacts[id] > state.turn) &&
        !FB.areAllied(state, id, 'player') &&
        FB.chance(0.04 * r.aggression * relationMult * deterrence) &&
        FB.realmsAdjacent(state, id, 'player')) {
        state.player.war = { enemy: id, target: null, wins: 0, losses: 0, seasons: 0,
          defending: true, casus: { type: 'border', label: 'Border war' } };
        FB.news(state, FB.msg('news.world.war_declared_on_player',
          '🔥 {realm} declares war upon YOU!', { realm: r.name }));
        FB.warFooting(state);
        state.eventQueue.push({ id: 'war_defense_muster', ctx: {} });
      }
    }

    // vassal breakaways: a strong duke or subject king may renounce his
    // liege and stand alone; the old sovereign marches to take him back
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || !r.liege || id === 'player') continue;
      const top = FB.topRealm(state, id);
      if (top === id || FB.isRealmAtWar(state, top)) continue;
      // the 1.5% gate first: realmTerritory walks the whole realm table, and
      // ~98.5% of that work was thrown away when the roll failed
      if (!FB.chance(B.breakawayChance)) continue;
      const terr = FB.realmTerritory(state, id);
      if (terr.length < 3) continue;
      if (FB.realmStrength(state, top) < 8) continue;
      r.liege = null;
      for (const pid of terr) state.owner[pid] = id;
      FB.invalidateRealmCache();
      const tr = state.realms[top];
      if (top === 'player') {
        // the player's own vassal rises: fought as a defensive war of the
        // player's, never as realms.player.war — the AI loop skips the
        // player, so a war parked there could neither resolve nor be fought
        if (tr && tr.alive && !state.player.war) {
          state.player.war = { enemy: id, target: null, wins: 0, losses: 0, seasons: 0,
            defending: true, casus: { type: 'independence' } };
          FB.warFooting(state);
          state.eventQueue.push({ id: 'war_defense_muster', ctx: {} });
        }
      } else if (tr && tr.alive && !tr.war) {
        tr.war = { enemy: id, years: 0, captures: 0,
          casus: { type: 'border', label: 'Breakaway war' } };
      }
      if (top === FB.playerRealmId(state) || id === state.player.liege || FB.game.observe) {
        FB.news(state, FB.msg('news.world.breakaway', {
          forms: {
            select: 'value', param: 'overlord', cases: {
              realm: '🔥 {realm} renounces the suzerainty of {liege}!',
              other: '🔥 {realm} renounces the suzerainty of the crown!'
            }
          }
        }, { overlord: tr ? 'realm' : 'other', realm: r.name, liege: tr ? tr.name : '' }));
      }
    }

    /* A rare yearly opening between neighboring, peaceful sovereign crowns.
       The compact is bilateral and defensive; no allied war is created. */
    const courted = {};
    for (const id in state.realms) {
      const r = state.realms[id];
      if (id === 'player' || !r.alive || r.liege || r.rank < 3 || FB.isRealmAtWar(state, id) ||
          courted[id] || FB.allianceOf(state, id) || !FB.chance(0.08)) continue;
      const choices = [];
      for (const id2 in state.realms) {
        const r2 = state.realms[id2];
        if (id2 === id || id2 === 'player' || !r2.alive || r2.liege || r2.rank < 3 ||
            FB.isRealmAtWar(state, id2) || courted[id2] || FB.allianceOf(state, id2)) continue;
        if (!FB.realmsAdjacent(state, id, id2)) continue;
        if (realmFaithGroup(state, id) !== realmFaithGroup(state, id2)) continue;
        choices.push(id2);
      }
      if (choices.length) {
        const partner = FB.pick(choices);
        if (FB.formAlliance(state, id, partner, 'dynastic')) {
          courted[id] = courted[partner] = 1;
          if (FB.game.observe || id === FB.playerRealmId(state) || partner === FB.playerRealmId(state)) {
            FB.news(state, FB.msg('news.world.alliance_formed',
              '🤝 {realm} and {ally} bind themselves in a defensive alliance.',
              { realm: r.name, ally: state.realms[partner].name }));
          }
        }
      }
    }

    // development drift (tech can lift the ceiling for the player's lands)
    for (const pid in state.dev) {
      if (FB.chance(0.04)) state.dev[pid] = FB.clamp(state.dev[pid] + (FB.chance(0.7) ? 1 : -1), 1, FB.devCap(state, pid));
    }
  };

  /* ================= PLAYER WAR (seasonal) ================= */

  /* The player's host composition: the dev-driven muster is the levy (massed,
     untrained foot); war buildings, the arms techs, and a landed baron's
     standing household contribute a hard core of men-at-arms (ret) and
     bowmen (arch). FB.playerLevy stays the total headcount for every caller
     that only wants a number. */
  FB.playerCompositionBreakdown = function (state) {
    const B = FBDATA.balance;
    const p = state.player;
    const comp = { levy:0, arch:0, ret:0 };
    const entries = [];
    function add(unit, kind, amount, data) {
      if (!amount) return;
      comp[unit] += amount;
      const entry = { unit:unit, kind:kind, amount:amount };
      if (data) for (const key in data) entry[key] = data[key];
      entries.push(entry);
    }
    function buildingEntries(key, unit) {
      const count = {};
      for (const pid of FB.demesne(state)) {
        for (const built of FB.builtIn(state, pid)) {
          const def = FBDATA.buildings[built.id];
          if (!built.ruined && def && def[key]) {
            count[built.id] = (count[built.id] || 0) + 1;
          }
        }
      }
      for (const id in count) {
        add(unit, 'building', FBDATA.buildings[id][key] * count[id], {
          buildingId:id, count:count[id]
        });
      }
    }

    if (p.provs && p.provs.length) {
      for (const pid of p.provs) {
        add('levy', 'county', (state.dev[pid] || 1) * B.levyPerDev, { pid:pid });
      }
    } else if (p.tier >= 3) {
      add('ret', 'barony_retinue', B.baronyRetinue || 120);
    }

    if (p.tier >= 3) {
      buildingEntries('levy', 'levy');
      buildingEntries('retinue', 'ret');
      buildingEntries('archers', 'arch');
      const techRet = FB.techBonus(state, 'retinue');
      const techArch = FB.techBonus(state, 'archers');
      if (techRet) add('ret', 'technology_flat', techRet, { key:'retinue' });
      if (techArch) add('arch', 'technology_flat', techArch, { key:'archers' });

      /* Technology and Council percentages share one multiplier in the
         historical calculation. Itemizing both against the same base keeps
         that arithmetic exact. */
      const ownBase = comp.levy;
      const techRate = FB.techBonus(state, 'levy');
      const councilRate = FB.councilBonus ? FB.councilBonus(state, 'levy') : 0;
      if (techRate) add('levy', 'technology_rate', ownBase * techRate, { rate:techRate });
      if (councilRate) add('levy', 'council_rate', ownBase * councilRate, {
        rate:councilRate, seatId:'constable'
      });

      const me = state.chars[p.charId];
      const martialRate = (me ? FB.skillOf(me, 'mar') : 0) * (B.levyPerMartial || 0);
      if (martialRate) {
        const beforeMartial = comp.levy;
        add('levy', 'martial_rate', beforeMartial * martialRate, { rate:martialRate });
      }

      const domain = FB.domainPenalty(state);
      if (domain !== 1) {
        const beforeDomain = comp.levy;
        add('levy', 'domain_penalty', beforeDomain * (domain - 1), { rate:domain - 1 });
      }

      /* Vassal men arrive after own-domain modifiers. A called favor raises
         only that named vassal's contribution and stays visible here. */
      for (const vid of FB.playerVassals(state)) {
        const rate = FB.vassalLevyRate
          ? FB.vassalLevyRate(state, vid) : (B.vassalLevyRate || 0);
        let amount = 0;
        for (const pid of FB.realmHeldCounties(state, vid)) {
          amount += (state.dev[pid] || 1) * B.levyPerDev * rate;
        }
        add('levy', 'vassal', amount, {
          rid:vid, rate:rate,
          favored:!!(FB.vassalLevyFavor && FB.vassalLevyFavor(state, vid))
        });
      }
    }

    /* Earned posts and paid household offices add named professionals. They
       are outside the levy percentages because they are already sworn. */
    if (FB.positionContributions) {
      for (const source of FB.positionContributions(state, 'retinue')) {
        add('ret', source.kind, source.amount, {
          positionId:source.id, charId:source.charId || null
        });
      }
    }

    for (const unit of ['levy', 'arch', 'ret']) {
      const rounded = Math.round(comp[unit]);
      const adjustment = rounded - comp[unit];
      if (Math.abs(adjustment) > 0.0001) {
        entries.push({ unit:unit, kind:'rounding', amount:adjustment });
      }
      comp[unit] = rounded;
    }
    return {
      units:comp,
      entries:entries,
      total:comp.levy + comp.arch + comp.ret
    };
  };

  FB.playerComposition = function (state) {
    const c = FB.playerCompositionBreakdown(state).units;
    return { levy:c.levy, arch:c.arch, ret:c.ret };
  };

  FB.playerLevy = function (state) {
    const c = FB.playerComposition(state);
    return c.levy + c.arch + c.ret;
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
     take command of the host. validateFocus restores the old focus at peace.
     The host musters the moment war begins (every war-start path comes
     through here) — the muster events that follow only decide whether it
     takes the field with hired companies or a great levy behind it. A host
     still inside its rearm window (armyDown) cannot rise yet; the muster
     event's war_raise retries once the window has passed. */
  FB.warFooting = function (state) {
    const p = state.player;
    if (p.focus !== 'lead_host') { p.focusBack = p.focus; p.focus = 'lead_host'; }
    if (FB.raisePlayerHost) FB.raisePlayerHost(state);
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
      FB.news(state, FB.msg('news.war.enemy_gone',
        '🕊 The war ends — our enemy has ceased to exist.', {}));
      FB.endPlayerWar(state); return;
    }
    w.seasons++;
    p.gold = Math.max(0, p.gold - (2 + (p.provs ? p.provs.length : 0) + (w.mercCos || 0) * 4));
    if (!w.defending && w.casus && w.casus.type === 'restoration' && enemy.capital) {
      w.target = enemy.capital; // the right follows the living seat of the usurped crown
      w.casus.target = enemy.capital;
    }
    /* attacking a target that has slipped out of the enemy's hands (revolt
       settled elsewhere, province lost to a third party): the war has no
       object left — end it gracefully rather than dragging to exhaustion */
    if (!w.defending && w.target && state.owner[w.target] !== w.enemy) {
      FB.news(state, FB.msg('news.war.target_lost',
        '🕊 {province} is no longer the enemy’s to lose — the war ends with nothing gained.',
        { province: FB.world.byId[w.target] ? FB.world.byId[w.target].name : '' }));
      FB.endPlayerWar(state); return;
    }
    if (w.seasons > 8) {
      FB.news(state, FB.msg('news.war.exhausted',
        '🕊 Exhaustion ends the war with nothing gained.', {}));
      FB.endPlayerWar(state); return;
    }
    if (w.defending) {
      // the enemy's advance is now literal: their host must stand in your
      // lands to tighten the noose — keep it out and nothing falls
      if (FB.enemyHostInPlayerLands(state)) {
        w.enemySiege = (w.enemySiege || 0) + 1;
        if (w.enemySiege >= 3) { FB.warLoseProvince(state); return; }
        if (w.enemySiege === 2) {
          FB.news(state, FB.msg('news.war.enemy_advance',
            '⚠ {enemy} presses deep into your lands — another season unchecked, and something falls.',
            { enemy: enemy.name }));
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
    if (w && w.casus && w.casus.type === 'restoration') {
      const enemy = state.realms[w.enemy];
      const me = state.chars[p.charId];
      if (enemy && enemy.alive && FB.absorbRealm(state, w.enemy, me)) {
        if (me && me.restorationRight && me.restorationRight.realmId === w.enemy) {
          delete me.restorationRight;
        }
        p.prestige += 100;
        FB.news(state, FB.msg('news.war.crown_restored',
          '👑 The usurper’s crown and vassals return intact to your rightful rule.', {}));
        FB.endPlayerWar(state);
        return;
      }
    }
    if (pid && state.owner[pid] === w.enemy) {
      if (!(state.realms.player && state.realms.player.alive)) FB.foundPlayerRealm(state);
      FB.transferProvince(state, pid, FB.playerRealmId(state) || 'player');
      if (state.holder) state.holder[pid] = 'player'; // the player's own demesne
      FB.invalidateRealmCache(); // transferProvince rebuilt before the holder rewrite
      p.provs = p.provs || [];
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
      if (w.casus && w.casus.type === 'fabricated') {
        const claim = p.fabricatedClaim;
        if (claim && (claim.pid || claim) === pid) p.fabricatedClaim = null;
      }
      FB.news(state, FB.msg('news.war.conquest',
        '🏰 {province} is yours by conquest!', { province: FB.world.byId[pid].name }));
      p.prestige += 50;
      FB.endPlayerWar(state);
      FB.checkTierPromotions(state);
    } else {
      p.prestige += 20;
      p.gold += 25;
      FB.news(state, FB.msg('news.war.tribute_without_prize',
        '🕊 The prize has slipped away, but tribute is paid. The war ends in your favor.', {}));
      FB.endPlayerWar(state);
    }
  };

  /* Defensive defeat: the enemy advance takes a border province — one of the
     player's OWN counties bordering the invader, as the siege warning
     promises. (Picking across the whole sovereign bloc made the loss land on
     a vassal's county and quietly degrade to the reparations branch.) */
  FB.warLoseProvince = function (state) {
    const p = state.player;
    const w = p.war;
    let lost = null;
    if (p.provs && p.provs.length) {
      const opts = [];
      for (const pid of p.provs) {
        const adj = FB.world.adj[pid] || {};
        for (const nb in adj) {
          if (state.owner[nb] === w.enemy) { opts.push(pid); break; }
        }
      }
      if (opts.length) lost = FB.pick(opts);
    }
    if (!lost) lost = FB.borderProvince(state, FB.playerRealmId(state), w.enemy);
    if (lost && p.provs && p.provs.indexOf(lost) >= 0) {
      FB.transferProvince(state, lost, w.enemy);
      FB.news(state, FB.msg('news.war.province_lost',
        '🏚 {province} is torn from your grasp.', { province: FB.world.byId[lost].name }));
      if (!p.provs.length) {
        p.tier = 2; p.liege = null;
        if (state.realms.player) state.realms.player.alive = false;
        FB.news(state, FB.msg('news.war.landless',
          '⬇ Landless once more. The banners are folded away.', {}));
      }
    } else {
      p.gold = Math.max(0, p.gold - 30);
      FB.news(state, FB.msg('news.war.reparations',
        '🕊 A humiliating peace. Reparations drain your coffers.', {}));
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
      if (FB.isPlayerSovereign(state) || !p.liege) {
        const old = FB.isPlayerSovereign(state) ? state.realms.player : null;
        const cap = (old && old.capital) || p.provs[0];
        const pr = FB.world.byId[cap];
        const uid = 'usurper_' + state.turn;
        const u = FB.makeVassalRealm(state, {
          id: uid, name: old ? old.name : 'Realm of ' + (pr ? pr.name : 'the Usurper'),
          capital: cap, rank: old ? old.rank : Math.max(1, p.tier - 3), liege: null,
          culture: pr ? pr.culture : 'frankish'
        });
        u.color = old ? old.color : '#f0c840'; // the map barely ripples
        if (old) {
          old.alive = false; old.war = null;
          FB.breakAlliance(state, 'player');
          if (old.rank >= 3) {
            const rightful = state.chars[p.charId];
            rightful.restorationRight = {
              realmId: uid,
              titleName: old.name,
              rank: old.rank,
              createdTurn: state.turn
            };
          }
        }
        for (const pid of p.provs) { state.owner[pid] = uid; state.holder[pid] = uid; }
        for (const vid in state.realms) {
          if (state.realms[vid].liege === 'player') state.realms[vid].liege = uid;
        }
        FB.news(state, FB.msg('news.world.usurped',
          '🏴 {ruler} seizes the seat — the realm endures; your house does not.',
          { ruler: u.ruler.name }));
      } else {
        // a vassal's fiefs escheat to his liege
        for (const pid of p.provs) {
          state.owner[pid] = FB.topRealm(state, p.liege);
          state.holder[pid] = p.liege;
        }
        FB.news(state, FB.msg('news.world.player_fiefs_escheat', {
          forms: {
            select: 'value', param: 'holder', cases: {
              realm: '📜 Your fiefs escheat to {liege}.',
              other: '📜 Your fiefs escheat to your liege.'
            }
          }
        }, {
          holder: state.realms[p.liege] ? 'realm' : 'other',
          liege: state.realms[p.liege] ? state.realms[p.liege].name : ''
        }));
      }
      p.provs = [];
    }
    if (state.realms.player && state.realms.player.alive) {
      state.realms.player.alive = false;
      state.realms.player.war = null;
      for (const vid in state.realms) {
        if (state.realms[vid].liege === 'player') state.realms[vid].liege = p.liege || null;
      }
    }
    p.tier = 2;
    p.liege = null; p.liegeOp = 0; p.liegeOps = {};
    p.pop = 0;
    p.prestige = Math.round(p.prestige * (opts.flee ? 0.6 : 0.4));
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    if (opts.flee) FB.movePlayerRandom(state);
    FB.news(state, FB.msg('news.world.cast_down',
      '⬇ Cast down. The family keeps its coffers and its name — but not an acre.', {}));
  };

  /* Check whether accumulated victories or defeats settle the war.
     Attackers take the target only by SIEGE (war_siege below); enough field
     wins make the enemy sue for peace — the war_tribute_offer event then lets
     the player choose tribute now or pressing on for the prize. Enough
     defeats break the campaign. */
  FB.warOutcome = function (state) {
    const p = state.player;
    const w = p.war;
    if (!w) return;
    const enemy = state.realms[w.enemy];
    const NEED = FBDATA.balance.warWinsToTakeProvince;
    // defeats first: once the tribute offer can be declined, wins and losses
    // can BOTH pass the threshold — a broken campaign ends even so
    if (w.losses >= NEED) {
      if (w.defending) {
        FB.warLoseProvince(state);
      } else {
        p.prestige = Math.max(0, p.prestige - 15);
        FB.news(state, FB.msg('news.war.campaign_failed',
          '🕊 The campaign has failed. The host limps home.', {}));
        FB.endPlayerWar(state);
      }
    } else if (w.wins >= NEED) {
      if (w.defending) {
        FB.news(state, FB.msg('news.war.defensive_victory', {
          forms: {
            select: 'value', param: 'named', cases: {
              yes: '🕊 {enemy} sues for peace. Your lands are safe.',
              other: '🕊 The enemy sues for peace. Your lands are safe.'
            }
          }
        }, { named: enemy ? 'yes' : 'other', enemy: enemy ? enemy.name : '' }));
        p.prestige += 25;
        FB.endPlayerWar(state);
      } else {
        // the beaten defender sues for peace — but the choice is the
        // player's: tribute now, or press on for the prize. One offer waits
        // at a time; a stale one is dropped when the queue is drawn
        // (pickDailyEvents). Once declined (war_press_on), the envoys do
        // not return for the rest of this war.
        let queued = false;
        for (const q of state.eventQueue) {
          if (q.id === 'war_tribute_offer') { queued = true; break; }
        }
        if (!queued && !w.tributeDeclined) state.eventQueue.push({ id: 'war_tribute_offer', ctx: {} });
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
    FB.news(state, FB.msg('news.war.field_victory',
      '⚔ Victory in the field! ({wins}/{needed})',
      { wins: w.wins, needed: FBDATA.balance.warWinsToTakeProvince }));
    if (FB.chance(0.3)) FB.lootItem(state, null, 'spoils');
    FB.warOutcome(state);
  };
  FB.fns.war_loss = function (state) {
    const w = state.player.war; if (!w) return;
    w.losses++; afterBattle(w);
    w.strength = Math.max(0.5, (w.strength || 1) - 0.2);
    FB.news(state, FB.msg('news.war.field_defeat', {
      forms: {
        select: 'plural', param: 'losses', cases: {
          one: '⚔ The host is bested… ({losses} defeat)',
          other: '⚔ The host is bested… ({losses} defeats)'
        }
      }
    }, { losses: w.losses }));
    FB.warOutcome(state);
  };
  FB.fns.war_harry = function (state) {
    const w = state.player.war; if (!w) return;
    w.harried = Math.min(2, (w.harried || 0) + 1);
    if (FB.chance(0.15)) FB.lootItem(state, null, 'raid');
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
        FB.news(state, FB.msg('news.war.sortie_repelled',
          '⚔ A sortie from {target} is thrown back. The siege holds.', { target: tname }));
      } else {
        w.siege = Math.max(0, w.siege - 1);
        w.strength = Math.max(0.5, (w.strength || 1) - 0.1);
        state.player.gold = Math.max(0, state.player.gold - 2);
        FB.news(state, FB.msg('news.war.sortie_succeeds',
          '⚔ A night sortie burns your siege-works — the ring is set back.', {}));
        return;
      }
    }
    if (w.siege >= 3) {
      FB.news(state, FB.msg('news.war.walls_breached',
        '🏰 The walls of {target} are breached!', { target: tname }));
      FB.warCapture(state);
    } else {
      FB.news(state, FB.msg('news.war.siege_tightens',
        '⚔ The siege of {target} tightens. ({progress}/3)',
        { target: tname, progress: w.siege }));
    }
  };
  FB.fns.war_mercs = function (state) {
    const w = state.player.war; if (!w) return;
    const cs = FBDATA.balance.mercCompanySize || 150;
    w.mercCos = (w.mercCos || 0) + 1;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (host) {
      FB.hostUnits(host); // migrates hosts from before composition
      host.units.mercs += cs;
      host.men += cs;
      host.size = (host.size === undefined ? host.men : host.size + cs); // the company swells the muster
      if (FB.map) FB.map.request();
    }
    FB.news(state, FB.msg('news.war.mercenaries_join',
      '⚔ A mercenary company takes your coin — ~{men} spears join the host.', { men: cs }));
  };
  /* mustering: the host takes the field at your seat (js/armies.js) */
  FB.fns.war_raise = function (state) {
    if (FB.raisePlayerHost) FB.raisePlayerHost(state);
  };
  FB.fns.war_mass = function (state) {
    const w = state.player.war; if (!w) return;
    w.mass = 1;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (host) { // already mustered: swell the levy now (the professionals stay as they are)
      const mult = FBDATA.balance.massLevyMult || 1.35;
      FB.hostUnits(host);
      const add = Math.round(host.units.levy * (mult - 1));
      host.units.levy += add;
      host.men += add;
      host.size = host.size === undefined ? host.men : host.size + add;
      if (FB.map) FB.map.request();
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
    const ename = state.realms[w.enemy] ? state.realms[w.enemy].name : '';
    if (FB.orderArmy(state, host, prey.at)) {
      host.huntPrey = w.enemy; // track the prey: re-path onto it each day
      FB.news(state, FB.msg('news.war.hunt_enemy', {
        forms: {
          select: 'value', param: 'named', cases: {
            yes: '🚩 The host marches to bring {enemy} to battle.',
            other: '🚩 The host marches to bring the enemy to battle.'
          }
        }
      }, { named: ename ? 'yes' : 'other', enemy: ename }));
    } else {
      FB.news(state, FB.msg('news.war.no_road_to_enemy', {
        forms: {
          select: 'value', param: 'named', cases: {
            yes: '🚩 There is no road from here to the host of {enemy}.',
            other: '🚩 There is no road from here to the enemy host.'
          }
        }
      }, { named: ename ? 'yes' : 'other', enemy: ename }));
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
  /* the beaten defender's gold, taken: ends the war with tribute instead of
     pressing on to the siege (the war_tribute_offer event's other choice) */
  FB.fns.war_accept_tribute = function (state) {
    const p = state.player;
    const w = p.war; if (!w) return;
    p.prestige += 20;
    p.gold += 25;
    FB.news(state, FB.msg('news.war.tribute',
      '🕊 Bled white in the field, the enemy buys peace with tribute.', {}));
    FB.endPlayerWar(state);
  };
  /* tribute refused: remember it for the rest of THIS war, so the envoys
     do not ride back under their white flag after every further battle
     (warOutcome checks w.tributeDeclined). Prestige and the log line stay
     declarative on the war_tribute_offer option itself. */
  FB.fns.war_press_on = function (state) {
    const w = state.player.war; if (!w) return;
    w.tributeDeclined = 1;
  };
  FB.fns.war_terms = function (state) {
    const p = state.player;
    const w = p.war; if (!w) return;
    const enemy = state.realms[w.enemy];
    if (w.defending) {
      const cost = 15 + 5 * (w.losses || 0);
      p.gold = Math.max(0, p.gold - cost);
      p.prestige = Math.max(0, p.prestige - 10);
      FB.news(state, FB.msg('news.war.peace_bought', {
        forms: {
          select: 'value', param: 'named', cases: {
            yes: '🕊 Peace is bought from {enemy} for {money:cost}.',
            other: '🕊 Peace is bought from the enemy for {money:cost}.'
          }
        }
      }, { named: enemy ? 'yes' : 'other', enemy: enemy ? enemy.name : '', cost: cost }));
    } else {
      p.prestige = Math.max(0, p.prestige - 8);
      FB.news(state, FB.msg('news.war.abandoned',
        '🕊 The campaign is abandoned. The banners come home.', {}));
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
    const old = state.realms.player;
    const generation = old && old.ruler && old.ruler.generation !== undefined
      ? old.ruler.generation : 1;
    const r = old || { id: 'player', color: '#f0c840', aggression: 0, war: null, op: 0 };
    r.name = nm;
    r.capital = (p.provs && p.provs[0]) || p.provinceId;
    r.alive = true;
    r.rank = Math.max(1, p.tier - 3);
    r.liege = p.liege || null;
    r.ruler = {
      name: me.name, sex: me.sex, culture: me.culture,
      age: FB.ageOf(me, state.date.year), mar: FB.skillOf(me, 'mar'),
      generation: generation
    };
    const playerHeirs = FB.heirsOf ? FB.heirsOf(state) : [];
    r.succession = r.succession || { playerDynasty: true };
    r.succession.playerDynasty = true;
    r.succession.rulerGeneration = generation;
    r.succession.heirCharId = playerHeirs.length ? playerHeirs[0].id : null;
    state.realms.player = r;
    const sovereign = r.liege ? FB.topRealm(state, r.liege) : 'player';
    for (const pid of (p.provs || [])) {
      state.owner[pid] = sovereign;
      state.holder[pid] = 'player';
    }
    FB.invalidateRealmCache();
    for (const pid of FB.realmTerritory(state, 'player')) state.owner[pid] = sovereign;
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };

  /* Join an inherited realm to the protagonist's landed realm. The inherited
     title's demesne comes into hand, its vassals reattach intact, and outgoing
     wars end in white peace. Sovereign inheritance makes the joined realm
     sovereign; a vassal inheritance preserves the inherited liege. */
  FB.absorbRealm = function (state, rid, rulerChar) {
    const inherited = state.realms[rid];
    if (!inherited || !inherited.alive || rid === 'player') return false;
    const p = state.player;
    const sovereignTitle = !inherited.liege;
    const inheritedLiege = inherited.liege || null;
    if (!state.realms.player || !state.realms.player.alive) FB.foundPlayerRealm(state);
    const mine = state.realms.player;
    if (sovereignTitle) {
      p.liege = null;
      mine.liege = null;
    } else if (mine.rank < inherited.rank || !mine.liege) {
      p.liege = inheritedLiege;
      mine.liege = inheritedLiege;
    }
    const demesne = FB.realmHeldCounties(state, rid).slice();
    p.provs = p.provs || [];
    for (const pid of demesne) {
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
      state.holder[pid] = 'player';
    }
    for (const vid in state.realms) {
      if (vid !== 'player' && state.realms[vid].liege === rid) state.realms[vid].liege = 'player';
    }
    inherited.war = null;
    for (const otherId in state.realms) {
      const other = state.realms[otherId];
      if (other && other.war && other.war.enemy === rid) other.war = null;
    }
    inherited.alive = false;
    FB.breakAlliance(state, rid);
    const oldRank = mine.rank || Math.max(1, p.tier - 3);
    mine.rank = Math.max(oldRank, inherited.rank || 1);
    p.tier = Math.max(p.tier, mine.rank + 3);
    if ((inherited.rank || 0) >= oldRank) {
      mine.name = inherited.name;
      mine.color = inherited.color || mine.color;
      mine.capital = inherited.capital || mine.capital;
    }
    mine.ruler = {
      name: rulerChar ? rulerChar.name : state.chars[p.charId].name,
      sex: rulerChar ? rulerChar.sex : state.chars[p.charId].sex,
      culture: rulerChar ? rulerChar.culture : state.chars[p.charId].culture,
      age: FB.ageOf(rulerChar || state.chars[p.charId], state.date.year),
      mar: FB.skillOf(rulerChar || state.chars[p.charId], 'mar'),
      generation: (mine.ruler && mine.ruler.generation !== undefined ? mine.ruler.generation : 1)
    };
    const top = mine.liege ? FB.topRealm(state, mine.liege) : 'player';
    for (const pid in state.owner) {
      const h = state.holder && state.holder[pid];
      if (h === 'player' || (h && underPlayer(state, h))) state.owner[pid] = top;
      else if (sovereignTitle && state.owner[pid] === rid) state.owner[pid] = 'player';
    }
    FB.invalidateRealmCache();
    FB.checkTierPromotions(state);
    if (FB.councilEnsure && p.tier >= 6) FB.councilEnsure(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    FB.news(state, FB.msg('news.world.realm_inherited',
      '👑 {realm} joins your rule by rightful succession.', { realm: inherited.name }));
    return true;
  };

  /* how many of the given counties the player personally holds */
  /* is a realm the player, or a vassal (at any depth) beneath the player? */
  function underPlayer(state, rid) {
    let cur = rid, guard = 0;
    while (cur && guard++ < 20) {
      if (cur === 'player') return true;
      const r = state.realms[cur];
      cur = r ? r.liege : null;
    }
    return false;
  }
  /* counties of a de jure title the player's REALM controls — held in his own
     hand OR by a vassal beneath him. Tier dignity reflects the whole bloc, so
     delegating land to vassals never costs progress toward a duchy/kingdom. */
  function playerShare(state, countyIds) {
    const prov = state.player.provs || [];
    let n = 0;
    for (const pid of countyIds) {
      if (prov.indexOf(pid) >= 0) { n++; continue; } // held directly
      const h = state.holder && state.holder[pid];
      if (h && h !== 'player' && underPlayer(state, h)) n++; // held by a vassal of the player
    }
    return n;
  }
  /* progress toward a de jure dignity: how many of its counties the player
     holds vs. what the title demands. One home for the promotion rules —
     checkTierPromotions and the map/panel readouts both speak these.
     A duchy must span 2+ counties and always demands at least 2 held; a
     kingdom the bare majority; an empire the majority of two of its kingdoms.
     Wastelands and colonies settled on them have no duchy, so they never
     appear in any of these counts. */
  FB.duchyProgress = function (state, did) {
    const cs = FB.duchyCounties(did);
    return { have: playerShare(state, cs), total: cs.length,
      need: Math.max(2, Math.ceil(cs.length / 2)), titled: cs.length >= 2 };
  };
  FB.kingdomProgress = function (state, kid) {
    const cs = FB.kingdomCounties(kid);
    return { have: playerShare(state, cs), total: cs.length, need: Math.ceil(cs.length / 2) };
  };
  FB.empireProgress = function (state, eid) {
    let have = 0, total = 0;
    for (const kid of FB.empireKingdoms(eid)) {
      const kp = FB.kingdomProgress(state, kid);
      if (!kp.total) continue;
      total++;
      if (kp.have >= kp.need) have++;
    }
    return { have: have, total: total, need: 2 };
  };
  /* all de jure duchies the player controls the majority of (min 2 counties) */
  FB.playerDuchies = function (state) {
    const out = [];
    for (const did in FBDATA.duchies) {
      const pr = FB.duchyProgress(state, did);
      if (pr.titled && pr.have >= pr.need) out.push(did);
    }
    return out;
  };
  /* all de jure kingdoms the player controls the majority of */
  FB.playerKingdoms = function (state) {
    const out = [];
    for (const kid in FBDATA.kingdoms) {
      const pr = FB.kingdomProgress(state, kid);
      if (pr.total && pr.have >= pr.need) out.push(kid);
    }
    return out;
  };
  /* all de jure empires where the player controls the majority of two kingdoms */
  FB.playerEmpires = function (state) {
    const out = [];
    for (const eid in FBDATA.empires) {
      if (FB.empireProgress(state, eid).have >= 2) out.push(eid);
    }
    return out;
  };
  FB.playerDuchy = function (state) { return FB.playerDuchies(state)[0] || null; };
  FB.playerKingdom = function (state) { return FB.playerKingdoms(state)[0] || null; };
  FB.playerEmpire = function (state) { return FB.playerEmpires(state)[0] || null; };

  /* every title the player holds, highest dignity first — for the Self tab.
     High titles carry a translatable dignity label plus locale-neutral title
     data; counties remain bare ids so the caller can render them compactly. */
  FB.playerTitles = function (state) {
    const p = state.player, out = [];
    if (p.tier === 3) {
      const pr = FB.world && FB.world.byId[p.provinceId];
      out.push({
        d: 'Barony',
        titleData: FB.rankTitleSnapshot(state, 3, pr ? pr.name : '?')
      });
      return { high: out, counties: [] };
    }
    if (p.tier < 4) return { high: [], counties: [] };
    for (const eid of FB.playerEmpires(state)) {
      out.push({
        d: 'Empire',
        titleData: FB.rankTitleSnapshot(state, 7, FBDATA.empires[eid].name)
      });
    }
    for (const kid of FB.playerKingdoms(state)) {
      out.push({
        d: 'Kingdom',
        titleData: FB.rankTitleSnapshot(state, 6, FBDATA.kingdoms[kid].name)
      });
    }
    for (const did of FB.playerDuchies(state)) {
      out.push({
        d: 'Duchy',
        titleData: FB.rankTitleSnapshot(state, 5, FBDATA.duchies[did].name)
      });
    }
    return { high: out, counties: (p.provs || []).slice() };
  };

  FB.checkTierPromotions = function (state) {
    const p = state.player;
    // no one is his own vassal — repair saves where a flight into the
    // player's own demesne left p.liege pointing at the player's realm
    if (p.liege === 'player') p.liege = null;
    // a baron is a status inside a county: he answers to whoever holds his
    // home county. Reattach if the bond was lost (his lord's house died, or
    // an older save) or went stale — the county changed hands under a living
    // lord, leaving him sworn to a lord who no longer holds his home. A
    // baron is never "independent", nor a foreign lord's man
    if (p.tier === 3) {
      const bh = (state.holder && state.holder[p.provinceId]) || state.owner[p.provinceId];
      if (bh && bh !== 'player' && state.realms[bh] && state.realms[bh].alive && p.liege !== bh) p.liege = bh;
    }
    const n = p.provs ? p.provs.length : 0;
    if (n && p.tier >= 4 && (!state.realms.player || !state.realms.player.alive)) FB.foundPlayerRealm(state);
    if (state.realms.player && state.realms.player.alive) {
      state.realms.player.liege = p.liege || null;
    }
    const indep = FB.isPlayerSovereign(state);
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
    if (!n) return; // landless: playerShare is 0 everywhere, nothing can promote
    let newTier = p.tier;
    if (p.tier < 4) newTier = 4;
    if (FB.playerDuchy(state) && p.tier < 5) newTier = 5;
    if (indep && FB.playerKingdom(state) && p.tier < 6) newTier = 6;
    if (indep && FB.playerEmpire(state) && p.tier < 7) newTier = 7;
    if (newTier > p.tier) {
      p.tier = newTier;
      const titleData = FB.titleSnapshot(state);
      FB.news(state, FB.msg('news.world.promoted',
        '👑 You are raised to {title}!', { title: { $title: titleData } }));
      if (state.peakTier === undefined || newTier > state.peakTier) {
        state.peakTier = newTier;
        state.peakTitleData = titleData;
      }
      p.prestige += 30 * newTier;
      FB.foundPlayerRealm(state); // restyle the landed realm at its new dignity
      if (newTier >= 6 && FB.councilEnsure) FB.councilEnsure(state); // the great officers gather
    }
    if (FB.syncPlayerCareer) FB.syncPlayerCareer(state);
  };

})();
