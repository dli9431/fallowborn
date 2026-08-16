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
  const DEFAULT_FOCUS_COLOR = '#e8dec4';
  const POLITICAL_COLOR_STRENGTH = 0.58;
  const FOCUS_SHADE = [18, 28, 38];

  const M = {
    canvas: null, ctx: null,
    base: null, baseCtx: null,
    baseFlat: null, baseFlatCtx: null,
    hilite: null, hiliteCtx: null,
    viewX: 0, viewY: 0, zoom: 1, minZoom: 0.5, maxZoom: 80,
    ownerOf: null, colorOf: null, colorOpacityOf: null,
    selected: null, playerProv: null, capitals: [], capitalSet: {},
    focusMembers: null, focusGroupActive: false,
    groupOutline: null, selectedOutline: null,
    groupOutlineSmooth: null, selectedOutlineSmooth: null,
    onTap: null, dirty: true,
    marketGood: null,
    visibleSites: [], _sitePool: [], _labelRects: [], _rectCount: 0,
    pointers: {}, pinchD: 0, downX: 0, downY: 0, moved: false, dpr: 1
  };
  FB.map = M;

  /* Settlement marker detail thresholds (screen zoom) and tap hit radii in
     screen pixels (scaled by dpr at use). Below SITE_Z_MID the map draws no
     settlement layer at all — the layer is reserved for close inspection so
     ordinary pan/zoom never pays for it; between the two, county heads and
     authored cities show as bare shape-coded markers, and at SITE_Z_DETAIL
     every currently visible settlement appears as its procedural emblem
     (js/siteart.js) with its name label — labels live only in the emblem
     band, so intermediate zoom stays uncluttered. The named hit radii are a
     floor: a drawn emblem widens its own target to its half-size. */
  const SITE_Z_MID = 6;
  const SITE_Z_DETAIL = 12;
  const SITE_HIT_MOUSE = 7;
  const SITE_HIT_TOUCH = 15;

  M.init = function (canvas) {
    if (M.canvas) {
      M.useWorld();
      return;
    }
    M.canvas = canvas;
    M.ctx = canvas.getContext('2d');
    M.base = document.createElement('canvas');
    M.baseCtx = M.base.getContext('2d');
    M.baseFlat = document.createElement('canvas');
    M.baseFlatCtx = M.baseFlat.getContext('2d');
    M.hilite = document.createElement('canvas');
    M.hiliteCtx = M.hilite.getContext('2d');

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', function () { M.resize(); M.request(); });
    M.useWorld();
  };

  /* Rebind the off-screen paint surfaces after a bookmark switch. The visible
     canvas and its input listeners survive, so moving between start dates or
     loading another date in one session cannot stack pointer handlers. */
  M.useWorld = function () {
    if (!M.canvas || !FB.world) return;
    M.base.width = FB.world.W; M.base.height = FB.world.H;
    /* flat close-zoom backdrop, same 1:1 raster geometry as the base */
    M.baseFlat.width = FB.world.W; M.baseFlat.height = FB.world.H;
    M.hilite.width = FB.world.W; M.hilite.height = FB.world.H;
    M.selected = null;
    M.playerProv = null;
    M.capitals = [];
    M.ownerOf = null;
    M.colorOf = null;
    M.colorOpacityOf = null;
    M.holderOf = null;
    M.focusMembers = null;
    M.focusGroupActive = false;
    M.groupOutline = null;
    M.selectedOutline = null;
    M.groupOutlineSmooth = null;
    M.selectedOutlineSmooth = null;
    M.visibleSites.length = 0; // no stale settlement hit targets from the old world
    M._sitePool.length = 0;
    M._rectCount = 0;
    M.dirty = true;
    M.resize();
    M.fitView();
    M.request();
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

  M.centerOn = function (provId, zoomTo, forceZoom) {
    const pr = FB.world.byId[provId];
    if (!pr) return;
    if (zoomTo) {
      M.zoom = forceZoom ? zoomTo : Math.max(M.zoom, zoomTo);
      M.zoom = Math.max(M.minZoom, Math.min(M.maxZoom, M.zoom));
    }
    M.viewX = pr.cx - M.canvas.width / M.zoom / 2;
    M.viewY = pr.cy - M.canvas.height / M.zoom / 2;
    clampView();
    M.request();
  };

  M.centerOnXY = function (x, y, zoomTo, forceZoom) {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    if (zoomTo) {
      M.zoom = forceZoom ? zoomTo : Math.max(M.zoom, zoomTo);
      M.zoom = Math.max(M.minZoom, Math.min(M.maxZoom, M.zoom));
    }
    M.viewX = x - M.canvas.width / M.zoom / 2;
    M.viewY = y - M.canvas.height / M.zoom / 2;
    clampView();
    M.request();
  };

  /* ---------- base image ---------- */
  M.setOwnerFns = function (ownerOf, colorOf, capitals, holderOf, colorOpacityOf) {
    M.ownerOf = ownerOf; M.colorOf = colorOf; M.capitals = capitals || [];
    /* lookup for the per-label capital star; rebuilt with the capitals list */
    M.capitalSet = {};
    for (const cap of M.capitals) M.capitalSet[cap] = 1;
    M.holderOf = holderOf || null;
    M.colorOpacityOf = colorOpacityOf || null;
  };

  /* Owner/holder keys per province, shared by the baked base borders and the
     close-zoom vector border pass so both graduate border strength the same
     way. */
  function ownerHolderKeys() {
    const owners = [], holders = [];
    for (let i = 0; i < FB.world.provs.length; i++) {
      const pr = FB.world.provs[i];
      if (pr.wasteland) {
        owners.push('~waste');
        holders.push('~waste');
      } else {
        const own = M.ownerOf ? M.ownerOf(pr.id) : pr.realm0;
        owners.push(own || '~none');
        holders.push(M.holderOf ? (M.holderOf(pr.id) || own || '~none') : (own || '~none'));
      }
    }
    return [owners, holders];
  }

  M.buildBase = function () {
    const w = FB.world, W = w.W, H = w.H;
    const img = M.baseCtx.createImageData(W, H);
    const d = img.data;
    /* flat sibling blitted in the close-zoom band instead: identical county
       and sea colors with no per-pixel noise and no baked borders, so the
       magnified backdrop reads as a clean flat wash under the crisp vector
       border pass (drawCloseBorders), never as blurred raster blocks */
    const flatImg = M.baseFlatCtx.createImageData(W, H);
    const fd = flatImg.data;
    // precompute per-province color
    const colors = [], keys = ownerHolderKeys(), owners = keys[0], holders = keys[1];
    for (let i = 0; i < w.provs.length; i++) {
      const pr = w.provs[i];
      const tint = TERRAIN_TINT[pr.terrain] || TERRAIN_TINT.farmland;
      let col;
      if (pr.wasteland) {
        col = FB.mix(tint, [150, 142, 128], 0.35);
      } else {
        const own = owners[i] !== '~none' ? owners[i] : null;
        const rc = M.colorOf && own ? M.colorOf(own) : '#888888';
        const opacity = M.colorOpacityOf && own
          ? FB.clamp(M.colorOpacityOf(own), 0, 1) : 1;
        col = FB.mix(FB.hexToRgb(rc), tint,
          1 - POLITICAL_COLOR_STRENGTH * opacity);
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
          fd[o] = r; fd[o + 1] = g; fd[o + 2] = b; fd[o + 3] = 255;
          const n = FB.noise2(x >> 2, y >> 2) * 10 - 5;
          r += n; g += n; b += n;
        } else {
          const c = colors[v - 1];
          fd[o] = c[0]; fd[o + 1] = c[1]; fd[o + 2] = c[2]; fd[o + 3] = 255;
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
    M.baseFlatCtx.putImageData(flatImg, 0, 0);
    // rivers on both copies
    for (const target of [M.baseCtx, M.baseFlatCtx]) {
      target.strokeStyle = 'rgba(60,110,160,0.75)';
      target.lineWidth = 1.2;
      target.lineJoin = 'round';
      for (const rv of (FBDATA.rivers || [])) {
        target.beginPath();
        for (let i = 0; i < rv.length; i += 2) {
          const x = FB.lonToX(rv[i]), y = FB.latToY(rv[i + 1]);
          if (i === 0) target.moveTo(x, y); else target.lineTo(x, y);
        }
        target.stroke();
      }
    }
    M.dirty = true;
  };

  /* Close-zoom borders (zoom >= SITE_Z_MID): the flat backdrop bakes no
     border pixels, so county boundaries are stroked as anti-aliased vectors
     instead. Each 2x2 block of raster cells contributes straight segments
     between the midpoints of its crossed edges, which cuts the raster
     staircase into smooth diagonals; strength follows the same
     demesne / realm / sovereign graduation as the baked borders, and alpha
     ramps the pass in with the flat backdrop cross-fade. */
  const BORDER_STYLE = [
    'rgba(20,16,10,0.30)', 'rgba(20,16,10,0.55)', 'rgba(20,16,10,0.85)'
  ];
  const borderCross = new Float32Array(8);

  function drawCloseBorders(ctx, sx, sy, z, alpha) {
    const el = M.canvas, w = FB.world, W = w.W, H = w.H, grid = w.grid;
    const x0 = Math.max(1, Math.floor(sx) - 1);
    const y0 = Math.max(1, Math.floor(sy) - 1);
    const x1 = Math.min(W - 1, Math.ceil(sx + el.width / z) + 1);
    const y1 = Math.min(H - 1, Math.ceil(sy + el.height / z) + 1);
    if (x1 <= x0 || y1 <= y0) return;
    const keys = ownerHolderKeys(), owners = keys[0], holders = keys[1];
    function strength(u, v) {
      if (!u || !v) return 2; // coastline
      if (holders[u - 1] === holders[v - 1]) return 0;
      if (owners[u - 1] === owners[v - 1]) return 1;
      return 2;
    }
    ctx.save();
    ctx.scale(z, z);
    ctx.translate(-sx, -sy);
    ctx.lineWidth = 1.2 / z;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let cls = 0; cls <= 2; cls++) {
      ctx.beginPath();
      let any = false;
      for (let gy = y0; gy <= y1; gy++) {
        const rowUp = (gy - 1) * W, rowDn = gy * W;
        for (let gx = x0; gx <= x1; gx++) {
          const a = grid[rowUp + gx - 1], b = grid[rowUp + gx];
          const c = grid[rowDn + gx - 1], d = grid[rowDn + gx];
          if (a === b && b === c && c === d) continue;
          let n = 0, blockCls = -1;
          if (a !== b) {
            borderCross[0] = gx; borderCross[1] = gy - 0.5; n = 1;
            blockCls = strength(a, b);
          }
          if (c !== d) {
            borderCross[n * 2] = gx; borderCross[n * 2 + 1] = gy + 0.5; n++;
            const s = strength(c, d); if (s > blockCls) blockCls = s;
          }
          if (a !== c) {
            borderCross[n * 2] = gx - 0.5; borderCross[n * 2 + 1] = gy; n++;
            const s = strength(a, c); if (s > blockCls) blockCls = s;
          }
          if (b !== d) {
            borderCross[n * 2] = gx + 0.5; borderCross[n * 2 + 1] = gy; n++;
            const s = strength(b, d); if (s > blockCls) blockCls = s;
          }
          if (blockCls !== cls || n < 2) continue;
          if (n === 2) {
            ctx.moveTo(borderCross[0], borderCross[1]);
            ctx.lineTo(borderCross[2], borderCross[3]);
          } else {
            for (let i = 0; i < n; i++) {
              ctx.moveTo(gx, gy);
              ctx.lineTo(borderCross[i * 2], borderCross[i * 2 + 1]);
            }
          }
          any = true;
        }
      }
      if (any) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = BORDER_STYLE[cls];
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    if (M.marketGood && FB.state && FB.renderMarketOverlay) {
      FB.renderMarketOverlay(ctx, M.marketGood, sx, sy, z);
    }
  }

  /* ---------- selection highlight ----------
     Selection preserves the political and terrain colors which already carry
     map meaning. Land outside the active group receives a cool focus shade;
     the group's perimeter and the exact selected county are drawn later as
     zoom-independent, two-tone lines. */
  /* groupOf: optional (pid) => groupKey|null deciding what counts as "the
     realm" for the highlight (map filters); defaults to sovereign ownership */
  M.focusColor = function () {
    const prefs = FB.game && FB.game.uiPrefs;
    const color = prefs && prefs.realmHighlightColor;
    return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
      ? color.toLowerCase() : DEFAULT_FOCUS_COLOR;
  };

  M.focusOpacity = function () {
    const prefs = FB.game && FB.game.uiPrefs;
    const opacity = prefs && prefs.realmHighlightOpacity;
    return typeof opacity === 'number' && isFinite(opacity)
      ? FB.clamp(opacity, 0, 1) : 1;
  };

  function outlineUnderColor(color) {
    const rgb = FB.hexToRgb(color);
    const light = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    return light < 125 ? 'rgba(248,242,224,0.82)' : 'rgba(10,15,20,0.78)';
  }

  function lighterFocusColor(color) {
    const rgb = FB.mix(FB.hexToRgb(color), [255, 252, 240], 0.32);
    function channel(value) {
      const hex = Math.round(value).toString(16);
      return hex.length < 2 ? '0' + hex : hex;
    }
    return '#' + channel(rgb[0]) + channel(rgb[1]) + channel(rgb[2]);
  }

  function strokeFocusPath(ctx, path, color, width, z) {
    if (!path) return;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outlineUnderColor(color);
    ctx.lineWidth = (width + 2.2) * M.dpr / z;
    ctx.stroke(path);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * M.dpr / z;
    ctx.stroke(path);
  }

  /* Smooth variant of the selection outlines for the close-zoom band: the
     same marching-squares midpoint contour the vector border pass draws
     (drawCloseBorders), so the two-tone highlight lies exactly on the crisp
     border line instead of clashing with it as a raster staircase. inside
     maps a grid cell value to membership; out-of-grid cells count as
     outside, so world-edge coastlines still close. Built once per selection,
     not per frame. */
  function traceSmoothOutline(inside, bx0, by0, bx1, by1) {
    const w = FB.world, W = w.W, H = w.H, grid = w.grid;
    const cross = [0, 0, 0, 0, 0, 0, 0, 0];
    function cellIn(x, y) {
      return x >= 0 && y >= 0 && x < W && y < H && !!inside(grid[y * W + x]);
    }
    /* boundary segments only occur in blocks around the member cells, so the
       scan confines itself to their bounding box (a county's box is tiny) */
    const gx0 = Math.max(0, bx0), gx1 = Math.min(W, bx1 + 1);
    const gy0 = Math.max(0, by0), gy1 = Math.min(H, by1 + 1);
    const path = new Path2D();
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const a = cellIn(gx - 1, gy - 1), b = cellIn(gx, gy - 1);
        const c = cellIn(gx - 1, gy), d = cellIn(gx, gy);
        if (a === b && b === c && c === d) continue;
        let n = 0;
        if (a !== b) { cross[0] = gx; cross[1] = gy - 0.5; n = 1; }
        if (c !== d) { cross[n * 2] = gx; cross[n * 2 + 1] = gy + 0.5; n++; }
        if (a !== c) { cross[n * 2] = gx - 0.5; cross[n * 2 + 1] = gy; n++; }
        if (b !== d) { cross[n * 2] = gx + 0.5; cross[n * 2 + 1] = gy; n++; }
        if (n === 2) {
          path.moveTo(cross[0], cross[1]);
          path.lineTo(cross[2], cross[3]);
        } else if (n >= 3) {
          for (let i = 0; i < n; i++) {
            path.moveTo(gx, gy);
            path.lineTo(cross[i * 2], cross[i * 2 + 1]);
          }
        }
      }
    }
    return path;
  }

  M.select = function (provId, groupOf) {
    M.selected = provId;
    if (!groupOf) groupOf = M.ownerOf;
    const hc = M.hiliteCtx;
    hc.clearRect(0, 0, M.hilite.width, M.hilite.height);
    M.focusMembers = null;
    M.focusGroupActive = false;
    M.groupOutline = null;
    M.selectedOutline = null;
    M.groupOutlineSmooth = null;
    M.selectedOutlineSmooth = null;
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
        M.focusMembers = inRealm;
        M.focusGroupActive = own != null;
        const groupOutline = new Path2D();
        const selectedOutline = new Path2D();
        /* bounding boxes confine the smoothed-contour scans below */
        let selMinX = w.W, selMinY = w.H, selMaxX = -1, selMaxY = -1;
        let grpMinX = w.W, grpMinY = w.H, grpMaxX = -1, grpMaxY = -1;
        const img = hc.createImageData(w.W, w.H);
        const d = img.data;
        for (let y = 0; y < w.H; y++) {
          for (let x = 0; x < w.W; x++) {
            const k = y * w.W + x, v = w.grid[k];
            if (!v) continue;
            const sel = v === pr.idx + 1;
            const realm = inRealm[v - 1];
            const o = k * 4;
            if (M.focusGroupActive && !realm) {
              d[o] = FOCUS_SHADE[0]; d[o + 1] = FOCUS_SHADE[1];
              d[o + 2] = FOCUS_SHADE[2]; d[o + 3] = 56;
            }
            const l = x > 0 ? w.grid[k - 1] : 0;
            const r = x + 1 < w.W ? w.grid[k + 1] : 0;
            const u = y > 0 ? w.grid[k - w.W] : 0;
            const dn = y + 1 < w.H ? w.grid[k + w.W] : 0;
            if (realm) {
              if (x < grpMinX) grpMinX = x;
              if (x > grpMaxX) grpMaxX = x;
              if (y < grpMinY) grpMinY = y;
              if (y > grpMaxY) grpMaxY = y;
              if (!(l && inRealm[l - 1])) {
                groupOutline.moveTo(x, y); groupOutline.lineTo(x, y + 1);
              }
              if (!(r && inRealm[r - 1])) {
                groupOutline.moveTo(x + 1, y); groupOutline.lineTo(x + 1, y + 1);
              }
              if (!(u && inRealm[u - 1])) {
                groupOutline.moveTo(x, y); groupOutline.lineTo(x + 1, y);
              }
              if (!(dn && inRealm[dn - 1])) {
                groupOutline.moveTo(x, y + 1); groupOutline.lineTo(x + 1, y + 1);
              }
            }
            if (sel) {
              if (x < selMinX) selMinX = x;
              if (x > selMaxX) selMaxX = x;
              if (y < selMinY) selMinY = y;
              if (y > selMaxY) selMaxY = y;
              const selectedIndex = pr.idx + 1;
              if (l !== selectedIndex) {
                selectedOutline.moveTo(x, y); selectedOutline.lineTo(x, y + 1);
              }
              if (r !== selectedIndex) {
                selectedOutline.moveTo(x + 1, y);
                selectedOutline.lineTo(x + 1, y + 1);
              }
              if (u !== selectedIndex) {
                selectedOutline.moveTo(x, y); selectedOutline.lineTo(x + 1, y);
              }
              if (dn !== selectedIndex) {
                selectedOutline.moveTo(x, y + 1);
                selectedOutline.lineTo(x + 1, y + 1);
              }
            }
          }
        }
        hc.putImageData(img, 0, 0);
        M.groupOutline = M.focusGroupActive ? groupOutline : null;
        M.selectedOutline = selectedOutline;
        // the close-zoom band strokes these smoothed contours instead
        const selectedIndex = pr.idx + 1;
        M.selectedOutlineSmooth = traceSmoothOutline(function (v) {
          return v === selectedIndex;
        }, selMinX, selMinY, selMaxX, selMaxY);
        M.groupOutlineSmooth = M.focusGroupActive
          ? traceSmoothOutline(function (v) { return !!(v && inRealm[v - 1]); },
              grpMinX, grpMinY, grpMaxX, grpMaxY)
          : null;
      }
    }
    M.request();
  };

  /* ---------- settlement markers (screen space) ----------
     Runs after the base raster and selection overlay, before county labels,
     armies, campaign objectives, and travelers. Iterates the compiled
     world.sitesRender list (head/authored/province/index order) once per
     kind rank so label priority is city > town > village without any
     per-frame allocation; a rejected label keeps its marker and hit target.
     Name labels draw only in the emblem band (zoom >= SITE_Z_DETAIL) — the
     intermediate band shows bare shape markers. Only markers actually drawn
     land in the reused M.visibleSites list. */
  function settlementHitRecord(n) {
    if (M._sitePool.length <= n) M._sitePool.push({ pid:'', index:0, x:0, y:0, hs:0 });
    return M._sitePool[n];
  }

  function drawSettlements(ctx, z) {
    const el = M.canvas, dpr = M.dpr, sites = FB.world.sitesRender;
    const detail = z >= SITE_Z_DETAIL;
    const m = -40 * dpr, mw = el.width + 80 * dpr, mh = el.height + 48 * dpr;
    /* the frame-level smoothing rule already applies at these zooms,
       including to the scaled emblem blits */
    ctx.textAlign = 'center';
    for (let sweep = 2; sweep >= 0; sweep--) {
      for (const site of sites) {
        const scrX = (site.x - M.viewX) * z, scrY = (site.y - M.viewY) * z;
        if (scrX < m || scrY < m || scrX > mw || scrY > mh) continue;
        if (!FB.siteVisible(FB.state, site)) continue;
        const rank = FB.siteKindRank(FB.state, site);
        if (rank !== sweep) continue;
        // intermediate zoom: county heads and authored cities only
        if (!detail && !(site.index === 0 || (site.authored && rank === 2))) continue;
        const focused = !M.focusGroupActive ||
          (M.focusMembers && M.focusMembers[site.pidx]);
        const u = dpr;
        /* detailed zoom: the site's cached emblem, scaled from its one fixed
           canvas to the current css-pixel size — zooming changes only the
           blit, never the art; below that a shape marker. */
        let half = 0;
        if (detail && FB.siteArt) {
          const scale = rank === 2 ? 1 : (rank === 1 ? 0.9 : 0.8);
          half = Math.round(FB.clamp(z * 1.1, 12, 24) * scale * u);
          const img = FB.siteArt(rank, site.site);
          ctx.globalAlpha = focused ? 1 : 0.45;
          ctx.drawImage(img, scrX - half, scrY - half, half * 2, half * 2);
          ctx.globalAlpha = 1;
        }
        if (!half) {
          // shape distinguishes the kind (never color alone)
          ctx.beginPath();
          if (rank === 2) {
            ctx.moveTo(scrX, scrY - 3.8 * u); ctx.lineTo(scrX + 3.8 * u, scrY);
            ctx.lineTo(scrX, scrY + 3.8 * u); ctx.lineTo(scrX - 3.8 * u, scrY);
            ctx.closePath();
          } else if (rank === 1) {
            ctx.rect(scrX - 2.7 * u, scrY - 2.7 * u, 5.4 * u, 5.4 * u);
          } else {
            ctx.arc(scrX, scrY, 2.3 * u, 0, 6.2832);
          }
          ctx.fillStyle = focused ? '#f2e8cf' : 'rgba(242,232,207,0.45)';
          ctx.fill();
          ctx.lineWidth = 1.1 * u;
          ctx.strokeStyle = focused ? 'rgba(24,18,10,0.9)' : 'rgba(24,18,10,0.45)';
          ctx.stroke();
        }
        // a ring marks the county head (the county seat): spaced clear of the
        // emblem and drawn heavier so it reads as a frame, not a constraint
        if (site.index === 0) {
          ctx.beginPath();
          ctx.arc(scrX, scrY, half ? half + 4.5 * u : (rank === 2 ? 6.5 : 5.5) * u,
            0, 6.2832);
          ctx.lineWidth = (half ? 1.8 : 1.3) * u;
          ctx.strokeStyle = focused ? 'rgba(24,18,10,0.9)' : 'rgba(24,18,10,0.45)';
          ctx.stroke();
        }
        if (FB.renderFortBadge) {
          FB.renderFortBadge(ctx, FB.state, site, scrX, scrY, half, dpr);
        }
        const pad = 3.5 * dpr;
        // label, emblem band only: deterministic rectangle rejection in
        // priority order, below the emblem first, above only under pressure
        if (detail) {
          const fs = Math.round((rank === 2 ? 10.5 : 9.5) * dpr);
          ctx.font = fs + 'px Georgia';
          const tw = ctx.measureText(site.name).width;
          const lx = scrX;
          const gap = half ? half + 5 * u : (rank === 2 ? 9.5 : 8.5) * dpr;
          for (let pos = 0; pos < 2; pos++) {
            const above = pos === 1;
            const ly = above ? scrY - gap - fs * 0.28 : scrY + gap + fs * 0.72;
            const rx0 = lx - tw / 2 - pad, ry0 = ly - fs - pad;
            const rx1 = lx + tw / 2 + pad, ry1 = ly + pad;
            let blocked = false;
            for (let ri = 0; ri < M._rectCount; ri++) {
              const r = M._labelRects[ri];
              if (!(rx1 < r[0] || rx0 > r[2] || ry1 < r[1] || ry0 > r[3])) {
                blocked = true; break;
              }
            }
            if (blocked) continue;
            if (M._labelRects.length <= M._rectCount) M._labelRects.push([0, 0, 0, 0]);
            const rr = M._labelRects[M._rectCount++];
            rr[0] = rx0; rr[1] = ry0; rr[2] = rx1; rr[3] = ry1;
            ctx.lineWidth = 2.5 * dpr;
            ctx.strokeStyle = focused ? 'rgba(20,16,10,0.72)' : 'rgba(20,16,10,0.4)';
            ctx.fillStyle = focused ? 'rgba(255,250,235,0.95)' : 'rgba(255,250,235,0.5)';
            ctx.strokeText(site.name, lx, ly);
            ctx.fillText(site.name, lx, ly);
            break;
          }
        }
        /* a drawn emblem itself blocks later settlement and county labels, so
           a dense cluster stays legible instead of stacking text over art */
        if (half) {
          if (M._labelRects.length <= M._rectCount) M._labelRects.push([0, 0, 0, 0]);
          const ir = M._labelRects[M._rectCount++];
          ir[0] = scrX - half - pad; ir[1] = scrY - half - pad;
          ir[2] = scrX + half + pad; ir[3] = scrY + half + pad;
        }
        const hit = settlementHitRecord(M.visibleSites.length);
        hit.pid = site.pid; hit.index = site.index; hit.x = scrX; hit.y = scrY;
        hit.hs = half;
        M.visibleSites.push(hit);
      }
    }
  }

  /* ---------- render loop ---------- */
  M.request = function () {
    if (M._raf) return;
    M._raf = requestAnimationFrame(function () { M._raf = null; M.render(); });
  };

  function clampView() {
    const el = M.canvas;
    const vw = el.width / M.zoom, vh = el.height / M.zoom;
    const mar = 120 / M.zoom;
    function axis(value, viewport, worldSize) {
      const min = -mar - viewport * 0.2;
      const max = worldSize + mar - viewport * 0.8;
      /* At minimum zoom a tall or narrow mobile viewport can see more than
         the permitted map span on one axis. Reversed clamp bounds make small
         drags flip between their two distant endpoints; pin that surplus
         axis to the centered midpoint instead. */
      return min <= max ? FB.clamp(value, min, max) : (min + max) / 2;
    }
    M.viewX = axis(M.viewX, vw, FB.world.W);
    M.viewY = axis(M.viewY, vh, FB.world.H);
  }

  M.render = function () {
    const ctx = M.ctx, el = M.canvas;
    if (!el.width) return;
    ctx.fillStyle = '#1c3550';
    ctx.fillRect(0, 0, el.width, el.height);
    /* close zoom cross-fades the noisy base raster into its flat sibling —
       one solid tone per county with no baked borders — so emblems and
       labels sit on a clean wash, and the crisp county structure comes from
       the anti-aliased vector border pass rather than blurred raster
       blocks; ordinary zooms keep the crisp pixel raster */
    const z = M.zoom;
    const sx = M.viewX, sy = M.viewY;
    const flatA = z >= SITE_Z_MID ? FB.clamp((z - SITE_Z_MID) / 2, 0, 1) : 0;
    ctx.imageSmoothingEnabled = flatA > 0 ? true : z < 2;
    ctx.save();
    ctx.scale(z, z);
    ctx.translate(-sx, -sy);
    if (flatA >= 1) {
      ctx.drawImage(M.baseFlat, 0, 0);
    } else {
      ctx.drawImage(M.base, 0, 0);
      if (flatA > 0) {
        ctx.globalAlpha = flatA;
        ctx.drawImage(M.baseFlat, 0, 0);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    if (flatA > 0) drawCloseBorders(ctx, sx, sy, z, flatA);
    // the hilite canvas is fully transparent with nothing selected — skip
    // the world-sized blit on the common (pan/march) frames
    if (M.selected) {
      ctx.save();
      ctx.scale(M.zoom, M.zoom);
      ctx.translate(-sx, -sy);
      ctx.drawImage(M.hilite, 0, 0);
      const focusColor = M.focusColor();
      /* close zoom strokes the smoothed contours so the highlight lies
         exactly on the vector border lines; lower zooms keep the crisp
         pixel-edge outlines that match the unsmoothed raster */
      const smooth = flatA > 0;
      strokeFocusPath(ctx,
        smooth ? (M.groupOutlineSmooth || M.groupOutline) : M.groupOutline,
        focusColor, 1.35, M.zoom);
      strokeFocusPath(ctx,
        smooth ? (M.selectedOutlineSmooth || M.selectedOutline) : M.selectedOutline,
        lighterFocusColor(focusColor), 2, M.zoom);
      ctx.restore();
    }

    // labels & markers in screen space
    function toScreen(wx, wy) { return [(wx - sx) * z, (wy - sy) * z]; }

    // settlement markers & labels run ahead of county labels so a
    // detailed-zoom county label yields to a placed settlement label
    M.visibleSites.length = 0;
    M._rectCount = 0;
    if (FB.world.sitesRender && z >= SITE_Z_MID) drawSettlements(ctx, z);

    if (z >= 1.1 * 0.75) {
      ctx.textAlign = 'center';
      for (const pr of FB.world.provs) {
        if (pr.area * z * z < 1200 * M.dpr) continue;
        const s = toScreen(pr.cx, pr.cy);
        if (s[0] < -80 || s[1] < -20 || s[0] > el.width + 80 || s[1] > el.height + 20) continue;
        const fs = Math.round(10 * M.dpr + Math.min(4, z));
        ctx.font = (pr.wasteland ? 'italic ' : '') + fs + 'px Georgia';
        const focused = !M.focusGroupActive ||
          (M.focusMembers && M.focusMembers[pr.idx]);
        ctx.lineWidth = 3 * M.dpr;
        ctx.strokeStyle = focused ? 'rgba(20,16,10,0.7)' : 'rgba(20,16,10,0.38)';
        ctx.fillStyle = pr.wasteland
          ? (focused ? 'rgba(230,225,210,0.55)' : 'rgba(230,225,210,0.30)')
          : (focused ? 'rgba(255,250,235,0.92)' : 'rgba(255,250,235,0.48)');
        const provinceName = FB.L(pr.name);
        if (z >= SITE_Z_DETAIL && M._rectCount) {
          // a county label covered by a placed settlement label steps aside
          const cw = ctx.measureText(provinceName).width, pad = 2 * M.dpr;
          let covered = false;
          for (let ri = 0; ri < M._rectCount; ri++) {
            const r = M._labelRects[ri];
            if (!(s[0] + cw / 2 + pad < r[0] || s[0] - cw / 2 - pad > r[2] ||
                  s[1] + pad < r[1] || s[1] - fs - pad > r[3])) {
              covered = true; break;
            }
          }
          if (covered) continue;
        }
        ctx.strokeText(provinceName, s[0], s[1]);
        ctx.fillText(provinceName, s[0], s[1]);
        /* a sovereign capital's ★ rides just left of its county label, so
           the marker always sits exactly where the name is, at any zoom */
        if (M.capitalSet[pr.id]) {
          const starX = s[0] - ctx.measureText(provinceName).width / 2 - 7 * M.dpr;
          ctx.lineWidth = 2.5 * M.dpr;
          ctx.strokeStyle = focused ? 'rgba(20,16,10,0.8)' : 'rgba(20,16,10,0.4)';
          ctx.fillStyle = focused ? '#ffe28a' : 'rgba(255,226,138,0.55)';
          ctx.strokeText('★', starX, s[1]);
          ctx.fillText('★', starX, s[1]);
        }
      }
    }
    // great holy-war objectives and temporary occupations sit beneath hosts
    if (FB.state && FB.renderGreatHolyWar) {
      FB.renderGreatHolyWar(ctx, toScreen, z, M.dpr);
    }
    // field armies (hosts on the march, battle markers)
    if (FB.state && FB.renderArmies) FB.renderArmies(ctx, toScreen, z, M.dpr);
    // overland journeys: valid destination rings, route, and traveler
    if (FB.state && FB.renderTravel) FB.renderTravel(ctx, toScreen, z, M.dpr);
    if (M.marketGood && FB.state && FB.renderMarketRoutes) {
      FB.renderMarketRoutes(ctx, M.marketGood, toScreen, z, M.dpr);
    }

    // player home marker
    if (M.playerProv) {
      const pr = FB.world.byId[M.playerProv];
      if (pr) {
        const s = toScreen(pr.cx, pr.cy);
        ctx.font = Math.round(13 * M.dpr) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3 * M.dpr; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
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
  /* Settlement hit-testing scans only the markers drawn on the last frame,
     in screen space, on pointer release. Overlaps resolve by nearest center,
     then render priority (list order: kind, head, authored, province/index).
     The named radii are a floor: a detailed-zoom emblem covers its own
     half-size, so tapping the visible art always hits. */
  function hitSite(px, py, pointerType) {
    const base = (pointerType === 'mouse' ? SITE_HIT_MOUSE : SITE_HIT_TOUCH) * M.dpr;
    let best = null, bd = Infinity;
    for (const s of M.visibleSites) {
      const r = Math.max(base, (s.hs || 0) + 2 * M.dpr);
      const dx = s.x - px, dy = s.y - py;
      const d = dx * dx + dy * dy;
      if (d <= r * r && d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function onUp(e) {
    const wasSingle = Object.keys(M.pointers).length === 1;
    delete M.pointers[e.pointerId];
    M.pinchD = 0;
    // an aborted gesture (notification shade, incoming call) is not a tap
    if (e.type === 'pointercancel') return;
    if (wasSingle && !M.moved) {
      const p = ptr(e);
      const wx = M.viewX + p[0] / M.zoom, wy = M.viewY + p[1] / M.zoom;
      const pr = FB.provinceAtGrid(wx, wy);
      const site = hitSite(p[0], p[1], e.pointerType);
      if (M.onTap) M.onTap(pr, wx, wy, site);
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
