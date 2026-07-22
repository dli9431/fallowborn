/* Fallowborn — canvas map: rendering, pan/zoom/pinch, hit-testing */
window.FB = window.FB || {};

(function () {
  'use strict';

  const TERRAIN_TINT = {
    farmland: [168, 192, 112], forest: [111, 159, 95], hills: [176, 160, 112],
    mountains: [159, 148, 140], desert: [221, 200, 143], steppe: [200, 192, 120],
    marsh: [127, 160, 143], tundra: [184, 191, 184]
  };
  const SEA_TOP = [58, 108, 158], SEA_BOT = [36, 76, 122];

  const M = {
    canvas: null, ctx: null,
    base: null, baseCtx: null,
    hilite: null, hiliteCtx: null,
    viewX: 0, viewY: 0, zoom: 1, minZoom: 0.5, maxZoom: 9,
    ownerOf: null, colorOf: null,
    selected: null, playerProv: null, capitals: [],
    onTap: null, dirty: true,
    pointers: {}, pinchD: 0, downX: 0, downY: 0, moved: false, dpr: 1
  };
  FB.map = M;

  M.init = function (canvas) {
    M.canvas = canvas;
    M.ctx = canvas.getContext('2d');
    M.base = document.createElement('canvas');
    M.base.width = FB.world.W; M.base.height = FB.world.H;
    M.baseCtx = M.base.getContext('2d');
    M.hilite = document.createElement('canvas');
    M.hilite.width = FB.world.W; M.hilite.height = FB.world.H;
    M.hiliteCtx = M.hilite.getContext('2d');

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', function () { M.resize(); M.request(); });
    M.resize();
    M.fitView();
  };

  M.resize = function () {
    const el = M.canvas;
    M.dpr = window.devicePixelRatio || 1;
    const w = el.clientWidth, h = el.clientHeight;
    if (w && h) { el.width = Math.round(w * M.dpr); el.height = Math.round(h * M.dpr); }
    M.minZoom = Math.min(el.width / FB.world.W, el.height / FB.world.H) * 0.85;
  };

  M.fitView = function () {
    const el = M.canvas;
    M.zoom = Math.min(el.width / FB.world.W, el.height / FB.world.H);
    M.viewX = (FB.world.W - el.width / M.zoom) / 2;
    M.viewY = (FB.world.H - el.height / M.zoom) / 2;
  };

  M.centerOn = function (provId, zoomTo) {
    const pr = FB.world.byId[provId];
    if (!pr) return;
    if (zoomTo) M.zoom = Math.max(M.zoom, zoomTo);
    M.viewX = pr.cx - M.canvas.width / M.zoom / 2;
    M.viewY = pr.cy - M.canvas.height / M.zoom / 2;
    clampView();
    M.request();
  };

  /* ---------- base image ---------- */
  M.setOwnerFns = function (ownerOf, colorOf, capitals, holderOf) {
    M.ownerOf = ownerOf; M.colorOf = colorOf; M.capitals = capitals || [];
    M.holderOf = holderOf || null;
  };

  M.buildBase = function () {
    const w = FB.world, W = w.W, H = w.H;
    const img = M.baseCtx.createImageData(W, H);
    const d = img.data;
    // precompute per-province color
    const colors = [], owners = [], holders = [];
    for (let i = 0; i < w.provs.length; i++) {
      const pr = w.provs[i];
      const tint = TERRAIN_TINT[pr.terrain] || TERRAIN_TINT.farmland;
      let col;
      if (pr.wasteland) {
        col = FB.mix(tint, [150, 142, 128], 0.35);
        owners.push('~waste');
        holders.push('~waste');
      } else {
        const own = M.ownerOf ? M.ownerOf(pr.id) : pr.realm0;
        owners.push(own || '~none');
        holders.push(M.holderOf ? (M.holderOf(pr.id) || own || '~none') : (own || '~none'));
        const rc = M.colorOf && own ? M.colorOf(own) : '#888888';
        col = FB.mix(FB.hexToRgb(rc), tint, 0.42);
      }
      colors.push(col);
    }
    for (let y = 0; y < H; y++) {
      const seaT = y / H;
      for (let x = 0; x < W; x++) {
        const k = (y * W + x), o = k * 4;
        const v = w.grid[k];
        let r, g, b;
        if (!v) {
          r = SEA_TOP[0] + (SEA_BOT[0] - SEA_TOP[0]) * seaT;
          g = SEA_TOP[1] + (SEA_BOT[1] - SEA_TOP[1]) * seaT;
          b = SEA_TOP[2] + (SEA_BOT[2] - SEA_TOP[2]) * seaT;
          const n = FB.noise2(x >> 2, y >> 2) * 10 - 5;
          r += n; g += n; b += n;
        } else {
          const c = colors[v - 1];
          const n = 0.92 + FB.noise2(x, y) * 0.16;
          r = c[0] * n; g = c[1] * n; b = c[2] * n;
          // borders
          const rv = x + 1 < W ? w.grid[k + 1] : v;
          const dv = y + 1 < H ? w.grid[k + W] : v;
          if ((rv && rv !== v) || (dv && dv !== v)) {
            const oth = (rv && rv !== v) ? rv : dv;
            // borders: faintest inside one lord's demesne, stronger between
            // holders of the same realm, strongest between sovereign realms
            const sameHolder = holders[v - 1] === holders[oth - 1];
            const sameRealm = owners[v - 1] === owners[oth - 1];
            const f = sameHolder ? 0.85 : sameRealm ? 0.62 : 0.45;
            r *= f; g *= f; b *= f;
          } else if (!rv || !dv) {
            r *= 0.72; g *= 0.72; b *= 0.72; // coastline
          }
        }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    M.baseCtx.putImageData(img, 0, 0);
    // rivers
    M.baseCtx.strokeStyle = 'rgba(60,110,160,0.75)';
    M.baseCtx.lineWidth = 1.2;
    M.baseCtx.lineJoin = 'round';
    for (const rv of (FBDATA.rivers || [])) {
      M.baseCtx.beginPath();
      for (let i = 0; i < rv.length; i += 2) {
        const x = FB.lonToX(rv[i]), y = FB.latToY(rv[i + 1]);
        if (i === 0) M.baseCtx.moveTo(x, y); else M.baseCtx.lineTo(x, y);
      }
      M.baseCtx.stroke();
    }
    M.dirty = true;
  };

  /* ---------- selection highlight ----------
     Selecting a province lights up its WHOLE realm: a strong tint on the
     province itself, a faint tint over the rest of the realm, and a golden
     outline along the realm's outer border, so its full extent reads at a
     glance. */
  /* groupOf: optional (pid) => groupKey|null deciding what counts as "the
     realm" for the highlight (map filters); defaults to sovereign ownership */
  M.select = function (provId, groupOf) {
    M.selected = provId;
    if (!groupOf) groupOf = M.ownerOf;
    const hc = M.hiliteCtx;
    hc.clearRect(0, 0, M.hilite.width, M.hilite.height);
    if (provId) {
      const w = FB.world, pr = w.byId[provId];
      if (pr) {
        // realm membership by province index (wastelands and unowned stay out)
        const own = groupOf ? groupOf(provId) : null;
        const inRealm = [];
        for (let i = 0; i < w.provs.length; i++) {
          const p2 = w.provs[i];
          inRealm.push(own != null && !p2.wasteland && groupOf(p2.id) === own);
        }
        const img = hc.createImageData(w.W, w.H);
        const d = img.data;
        for (let y = 0; y < w.H; y++) {
          for (let x = 0; x < w.W; x++) {
            const k = y * w.W + x, v = w.grid[k];
            if (!v) continue;
            const sel = v === pr.idx + 1;
            const realm = inRealm[v - 1];
            if (!sel && !realm) continue;
            const o = k * 4;
            if (realm) {
              // 2px border where a neighbour lies outside the realm (or at sea)
              let edge = false;
              for (let t = 1; t <= 2 && !edge; t++) {
                const l = x - t >= 0 ? w.grid[k - t] : 0;
                const r = x + t < w.W ? w.grid[k + t] : 0;
                const u = y - t >= 0 ? w.grid[k - t * w.W] : 0;
                const dn = y + t < w.H ? w.grid[k + t * w.W] : 0;
                if (!(l && inRealm[l - 1]) || !(r && inRealm[r - 1]) ||
                    !(u && inRealm[u - 1]) || !(dn && inRealm[dn - 1])) edge = true;
              }
              if (edge) {
                d[o] = 255; d[o + 1] = 236; d[o + 2] = 120; d[o + 3] = 220;
                continue;
              }
            }
            if (sel) { d[o] = 255; d[o + 1] = 255; d[o + 2] = 230; d[o + 3] = 60; }
            else { d[o] = 255; d[o + 1] = 246; d[o + 2] = 190; d[o + 3] = 22; }
          }
        }
        hc.putImageData(img, 0, 0);
      }
    }
    M.request();
  };

  /* ---------- render loop ---------- */
  M.request = function () {
    if (M._raf) return;
    M._raf = requestAnimationFrame(function () { M._raf = null; M.render(); });
  };

  function clampView() {
    const el = M.canvas;
    const vw = el.width / M.zoom, vh = el.height / M.zoom;
    const mar = 120 / M.zoom;
    M.viewX = FB.clamp(M.viewX, -mar - vw * 0.2, FB.world.W + mar - vw * 0.8);
    M.viewY = FB.clamp(M.viewY, -mar - vh * 0.2, FB.world.H + mar - vh * 0.8);
  }

  M.render = function () {
    const ctx = M.ctx, el = M.canvas;
    if (!el.width) return;
    ctx.fillStyle = '#1c3550';
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.imageSmoothingEnabled = M.zoom < 2;
    const sx = M.viewX, sy = M.viewY;
    ctx.save();
    ctx.scale(M.zoom, M.zoom);
    ctx.translate(-sx, -sy);
    ctx.drawImage(M.base, 0, 0);
    ctx.drawImage(M.hilite, 0, 0);
    ctx.restore();

    // labels & markers in screen space
    const z = M.zoom;
    function toScreen(wx, wy) { return [(wx - sx) * z, (wy - sy) * z]; }

    if (z >= 1.1 * M.dpr * 0.75) {
      ctx.textAlign = 'center';
      for (const pr of FB.world.provs) {
        if (pr.area * z * z < 3500 * M.dpr) continue;
        const s = toScreen(pr.cx, pr.cy);
        if (s[0] < -80 || s[1] < -20 || s[0] > el.width + 80 || s[1] > el.height + 20) continue;
        const fs = Math.round(10 * M.dpr + Math.min(4, z));
        ctx.font = (pr.wasteland ? 'italic ' : '') + fs + 'px Georgia';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,16,10,0.7)';
        ctx.fillStyle = pr.wasteland ? 'rgba(230,225,210,0.55)' : 'rgba(255,250,235,0.92)';
        ctx.strokeText(pr.name, s[0], s[1]);
        ctx.fillText(pr.name, s[0], s[1]);
      }
      // capital stars
      ctx.font = Math.round(9 * M.dpr) + 'px Georgia';
      for (const cap of M.capitals) {
        const pr = FB.world.byId[cap];
        if (!pr) continue;
        const s = toScreen(pr.cx, pr.cy - 8);
        ctx.fillStyle = '#ffe28a';
        ctx.fillText('★', s[0], s[1]);
      }
    }
    // field armies (hosts on the march, battle markers)
    if (FB.state && FB.renderArmies) FB.renderArmies(ctx, toScreen, z, M.dpr);

    // player home marker
    if (M.playerProv) {
      const pr = FB.world.byId[M.playerProv];
      if (pr) {
        const s = toScreen(pr.cx, pr.cy);
        ctx.font = Math.round(13 * M.dpr) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText('⚑', s[0], s[1] + 14 * M.dpr);
        ctx.fillStyle = '#ffd24a';
        ctx.fillText('⚑', s[0], s[1] + 14 * M.dpr);
      }
    }
  };

  /* ---------- input ---------- */
  function ptr(e) {
    const r = M.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * M.dpr, (e.clientY - r.top) * M.dpr];
  }
  function onDown(e) {
    M.canvas.setPointerCapture(e.pointerId);
    const p = ptr(e);
    M.pointers[e.pointerId] = p;
    const keys = Object.keys(M.pointers);
    if (keys.length === 1) { M.downX = p[0]; M.downY = p[1]; M.moved = false; }
    else if (keys.length === 2) {
      const a = M.pointers[keys[0]], b = M.pointers[keys[1]];
      M.pinchD = Math.hypot(a[0] - b[0], a[1] - b[1]);
    }
    e.preventDefault();
  }
  function onMove(e) {
    if (!(e.pointerId in M.pointers)) return;
    const p = ptr(e);
    const keys = Object.keys(M.pointers);
    if (keys.length === 1) {
      const old = M.pointers[e.pointerId];
      const dx = p[0] - old[0], dy = p[1] - old[1];
      if (Math.abs(p[0] - M.downX) + Math.abs(p[1] - M.downY) > 8 * M.dpr) M.moved = true;
      M.viewX -= dx / M.zoom; M.viewY -= dy / M.zoom;
      clampView(); M.request();
    } else if (keys.length === 2) {
      M.pointers[e.pointerId] = p;
      const a = M.pointers[keys[0]], b = M.pointers[keys[1]];
      const nd = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (M.pinchD > 0 && nd > 0) {
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        zoomAt(mid[0], mid[1], nd / M.pinchD);
      }
      M.pinchD = nd;
      M.moved = true;
    }
    M.pointers[e.pointerId] = p;
    e.preventDefault();
  }
  function onUp(e) {
    const wasSingle = Object.keys(M.pointers).length === 1;
    delete M.pointers[e.pointerId];
    M.pinchD = 0;
    if (wasSingle && !M.moved) {
      const p = ptr(e);
      const wx = M.viewX + p[0] / M.zoom, wy = M.viewY + p[1] / M.zoom;
      const pr = FB.provinceAtGrid(wx, wy);
      if (M.onTap) M.onTap(pr, wx, wy);
    }
  }
  function onWheel(e) {
    e.preventDefault();
    const p = ptr(e);
    zoomAt(p[0], p[1], e.deltaY < 0 ? 1.18 : 1 / 1.18);
  }
  function zoomAt(px, py, factor) {
    const wx = M.viewX + px / M.zoom, wy = M.viewY + py / M.zoom;
    M.zoom = FB.clamp(M.zoom * factor, M.minZoom, M.maxZoom);
    M.viewX = wx - px / M.zoom;
    M.viewY = wy - py / M.zoom;
    clampView(); M.request();
  }
  M.zoomIn = function () { zoomAt(M.canvas.width / 2, M.canvas.height / 2, 1.35); };
  M.zoomOut = function () { zoomAt(M.canvas.width / 2, M.canvas.height / 2, 1 / 1.35); };
  M.panBy = function (dx, dy) {
    M.viewX += dx / M.zoom; M.viewY += dy / M.zoom;
    clampView(); M.request();
  };
})();
