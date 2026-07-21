/* Fallowborn — utilities, RNG, projection */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* ---------- seeded RNG (mulberry32) ---------- */
  let _rngState = 12345;
  FB.seedRng = function (seed) { _rngState = seed >>> 0; };
  FB.getRngState = function () { return _rngState; };
  FB.setRngState = function (s) { _rngState = s >>> 0; };
  FB.rng = function () {
    _rngState |= 0; _rngState = (_rngState + 0x6D2B79F5) | 0;
    let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  FB.ri = function (a, b) { return a + Math.floor(FB.rng() * (b - a + 1)); }; // inclusive
  FB.rf = function (a, b) { return a + FB.rng() * (b - a); };
  FB.pick = function (arr) { return arr[Math.floor(FB.rng() * arr.length)]; };
  FB.chance = function (p) { return FB.rng() < p; };

  FB.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  /* deterministic 2D hash noise in [0,1), independent of the RNG stream */
  FB.noise2 = function (x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  /* ---------- Mercator projection: lon/lat -> grid px ---------- */
  const DEG = Math.PI / 180;
  function mercY(lat) { return Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2)) / DEG; }

  FB.proj = { W: 0, H: 0, scale: 0, lonMin: 0, mercTop: 0 };

  FB.initProjection = function (gridW) {
    const b = FBDATA.bounds;
    const spanLon = b.lonMax - b.lonMin;
    const top = mercY(b.latMax), bot = mercY(b.latMin);
    FB.proj.W = gridW;
    FB.proj.scale = gridW / spanLon;
    FB.proj.H = Math.round((top - bot) * FB.proj.scale);
    FB.proj.lonMin = b.lonMin;
    FB.proj.mercTop = top;
  };
  FB.lonToX = function (lon) { return (lon - FB.proj.lonMin) * FB.proj.scale; };
  FB.latToY = function (lat) { return (FB.proj.mercTop - mercY(lat)) * FB.proj.scale; };

  /* ---------- misc ---------- */
  let _uid = 1;
  FB.uid = function () { return 'c' + (_uid++); };
  FB.setUidCounter = function (n) { _uid = n; };
  FB.getUidCounter = function () { return _uid; };

  FB.SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

  /* coarse-pointer (touch) devices hide keyboard hint badges */
  FB.isTouch = typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  FB.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* color helpers for map tinting */
  FB.hexToRgb = function (hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  FB.mix = function (c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  };

  /* procedural coat of arms drawn onto a canvas ctx */
  FB.drawCrest = function (canvas, seedStr) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    let hsh = 0;
    for (let i = 0; i < seedStr.length; i++) hsh = (Math.imul(hsh, 31) + seedStr.charCodeAt(i)) | 0;
    const hue1 = ((hsh >>> 3) % 360), hue2 = (hue1 + 120 + ((hsh >>> 9) % 120)) % 360;
    const c1 = 'hsl(' + hue1 + ',55%,38%)', c2 = 'hsl(' + hue2 + ',60%,62%)';
    ctx.clearRect(0, 0, w, h);
    // shield path
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.08);
    ctx.lineTo(w * 0.9, h * 0.08);
    ctx.lineTo(w * 0.9, h * 0.55);
    ctx.quadraticCurveTo(w * 0.9, h * 0.85, w * 0.5, h * 0.97);
    ctx.quadraticCurveTo(w * 0.1, h * 0.85, w * 0.1, h * 0.55);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = c1; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c2;
    const pat = (hsh >>> 5) % 5;
    if (pat === 0) ctx.fillRect(w * 0.38, 0, w * 0.24, h);                    // pale
    else if (pat === 1) ctx.fillRect(0, h * 0.36, w, h * 0.24);               // fess
    else if (pat === 2) {                                                     // bend
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.3, 0);
      ctx.lineTo(w, h * 0.7); ctx.lineTo(w, h); ctx.lineTo(w * 0.7, h);
      ctx.lineTo(0, h * 0.3); ctx.closePath(); ctx.fill();
    } else if (pat === 3) {                                                   // chevron
      ctx.beginPath(); ctx.moveTo(0, h * 0.6); ctx.lineTo(w * 0.5, h * 0.25);
      ctx.lineTo(w, h * 0.6); ctx.lineTo(w, h * 0.8); ctx.lineTo(w * 0.5, h * 0.45);
      ctx.lineTo(0, h * 0.8); ctx.closePath(); ctx.fill();
    } else {                                                                  // cross
      ctx.fillRect(w * 0.4, 0, w * 0.2, h); ctx.fillRect(0, h * 0.3, w, h * 0.2);
    }
    ctx.restore();
    // border
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.08);
    ctx.lineTo(w * 0.9, h * 0.08);
    ctx.lineTo(w * 0.9, h * 0.55);
    ctx.quadraticCurveTo(w * 0.9, h * 0.85, w * 0.5, h * 0.97);
    ctx.quadraticCurveTo(w * 0.1, h * 0.85, w * 0.1, h * 0.55);
    ctx.closePath();
    ctx.strokeStyle = '#d8b24a'; ctx.lineWidth = Math.max(1.5, w * 0.05); ctx.stroke();
  };

  /* crest markup for cards: painted by FB.paintCrests once the html lands */
  FB.crestTag = function (seed, w, h) {
    return '<canvas class="crest" data-seed="' + FB.esc(seed) + '" width="' + w + '" height="' + h + '"></canvas>';
  };
  FB.paintCrests = function (root) {
    if (!root) return;
    const list = root.querySelectorAll('canvas.crest[data-seed]');
    for (let i = 0; i < list.length; i++) FB.drawCrest(list[i], list[i].getAttribute('data-seed'));
  };
})();
