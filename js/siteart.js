/* Fallowborn — procedural settlement emblems for the detailed map (no assets).
   Each marker is generated from the physical site slug, so one settlement keeps
   the same little skyline across sessions, bookmarks, and mods without touching
   saved state or gameplay RNG. A site gets ONE fixed-size cached emblem canvas
   per live kind; the map scales the blit to the current zoom, so panning and
   zooming never regenerate art. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function hashOf(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }
  function byte(h, n) { // nth pseudo-byte of the hash, 0..255
    let x = (h ^ (n * 0x9E3779B9)) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x85EBCA6B) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35) >>> 0;
    return (x ^ (x >>> 16)) & 255;
  }

  /* Flat manuscript-illumination palettes that stay legible at favicon sizes. */
  const WALLS = ['#ddc99e', '#c9b184', '#b08a58', '#cfc8b8'];
  const ROOFS = ['#a8512f', '#c09a44', '#66717a', '#7d5a33'];
  const STONES = ['#b7b1a2', '#a39d8e', '#8f8a7d'];
  const BANNERS = ['#a83232', '#325fa8', '#3d7a3d', '#c9a227'];
  const LEAF = '#4d7a3f', TRUNK = '#6b4a2c';
  const INK = 'rgba(24,18,10,0.85)';

  /* Everything draws in a 64x64 logical box centered on the site point;
     FB.siteArt scales the box once into the site's cached emblem canvas. */

  function ground(ctx, rx) {
    ctx.save();
    ctx.translate(32, 57);
    ctx.scale(1, 0.26);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, 6.2832);
    ctx.fillStyle = 'rgba(20,16,10,0.28)';
    ctx.fill();
    ctx.restore();
  }

  /* A row of merlons along y..y+4 between x0 and x1. */
  function battlement(ctx, x0, x1, y, step, stone) {
    ctx.fillStyle = stone;
    for (let x = x0; x + step * 0.62 <= x1 + 0.01; x += step) {
      ctx.fillRect(x, y, step * 0.62, 4);
    }
  }

  function cottage(ctx, cx, base, w, h, roofH, wall, roof) {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.fillStyle = wall;
    ctx.fillRect(cx - w / 2, base - h, w, h);
    ctx.strokeRect(cx - w / 2, base - h, w, h);
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 - 2.5, base - h);
    ctx.lineTo(cx, base - h - roofH);
    ctx.lineTo(cx + w / 2 + 2.5, base - h);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(cx - 1.6, base - 5, 3.2, 5);
  }

  function tree(ctx, cx, base, s) {
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = INK;
    ctx.fillStyle = TRUNK;
    ctx.fillRect(cx - 1.6 * s, base - 8 * s, 3.2 * s, 8 * s);
    ctx.strokeRect(cx - 1.6 * s, base - 8 * s, 3.2 * s, 8 * s);
    ctx.beginPath();
    ctx.arc(cx, base - 11 * s, 5.6 * s, 0, 6.2832);
    ctx.arc(cx - 3.4 * s, base - 7.5 * s, 3.6 * s, 0, 6.2832);
    ctx.arc(cx + 3.4 * s, base - 7.5 * s, 3.6 * s, 0, 6.2832);
    ctx.fillStyle = LEAF;
    ctx.fill();
  }

  function tower(ctx, x, top, bottom, stone) {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.fillStyle = stone;
    ctx.fillRect(x, top, 11, bottom - top);
    ctx.strokeRect(x, top, 11, bottom - top);
    battlement(ctx, x, x + 11, top - 4, 4, stone);
  }

  /* village: two or three cottages, sometimes a tree */
  function villageEmblem(ctx, h) {
    const wall = WALLS[byte(h, 3) % WALLS.length];
    const roof = ROOFS[byte(h, 2) % ROOFS.length];
    ground(ctx, 22);
    cottage(ctx, 20, 55, 15, 11 + byte(h, 5) % 4, 7, wall, roof);
    cottage(ctx, 38, 56, 17, 12 + byte(h, 6) % 4, 8, wall, roof);
    if (byte(h, 4) % 3) cottage(ctx, 51, 56, 11, 8 + byte(h, 7) % 3, 6, wall, roof);
    else tree(ctx, 52, 56, 1);
  }

  /* town: a stone hall tower with a spire, cottages gathered around it */
  function townEmblem(ctx, h) {
    const wall = WALLS[byte(h, 3) % WALLS.length];
    const roof = ROOFS[byte(h, 2) % ROOFS.length];
    const stone = STONES[byte(h, 8) % STONES.length];
    const left = byte(h, 9) % 2 === 0;
    const tx = left ? 7 : 46;
    ground(ctx, 26);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.fillStyle = stone;
    ctx.fillRect(tx, 22, 11, 34);
    ctx.strokeRect(tx, 22, 11, 34);
    ctx.beginPath();
    ctx.moveTo(tx - 2, 22);
    ctx.lineTo(tx + 5.5, 11);
    ctx.lineTo(tx + 13, 22);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.stroke();
    const houses = left ? [28, 43, 56] : [8, 21, 36];
    for (let i = 0; i < houses.length; i++) {
      cottage(ctx, houses[i], 55 + (i === 1 ? 1 : 0), 13 - i,
        9 + byte(h, 5 + i) % 4, 6, wall, roof);
    }
  }

  /* city: crenellated wall and gate before two towers and a bannered keep */
  function cityEmblem(ctx, h) {
    const stone = STONES[byte(h, 3) % STONES.length];
    const roof = ROOFS[byte(h, 2) % ROOFS.length];
    const banner = BANNERS[byte(h, 6) % BANNERS.length];
    ground(ctx, 28);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    // keep, set back behind the wall
    const kx = 23 + byte(h, 5) % 5;
    ctx.fillStyle = stone;
    ctx.fillRect(kx, 14, 14, 26);
    ctx.strokeRect(kx, 14, 14, 26);
    battlement(ctx, kx, kx + 14, 10, 4.5, stone);
    // banner on the keep
    ctx.beginPath();
    ctx.moveTo(kx + 7, 10); ctx.lineTo(kx + 7, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(kx + 7, 2); ctx.lineTo(kx + 16, 4.5); ctx.lineTo(kx + 7, 7);
    ctx.closePath();
    ctx.fillStyle = banner;
    ctx.fill();
    // flanking towers
    tower(ctx, 8, 24 + byte(h, 7) % 3, 56, stone);
    tower(ctx, 45, 24 + byte(h, 8) % 3, 56, stone);
    // curtain wall with a gate arch
    ctx.fillStyle = stone;
    ctx.fillRect(14, 38, 36, 18);
    ctx.strokeRect(14, 38, 36, 18);
    battlement(ctx, 14, 50, 34, 6, stone);
    ctx.fillStyle = INK;
    ctx.fillRect(28, 46, 8, 10);
    ctx.beginPath();
    ctx.arc(32, 46, 4, 3.1416, 0);
    ctx.fill();
    // a roof peeking out over the wall
    ctx.beginPath();
    ctx.moveTo(36, 38); ctx.lineTo(42, 31); ctx.lineTo(48, 38);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.stroke();
  }

  const EMBLEM = 96; // one fixed canvas edge per site; the map scales the blit
  const cache = {};
  let cacheCount = 0;
  function wipe() {
    for (const key in cache) delete cache[key];
    cacheCount = 0;
  }

  /* FB.siteArt(rank, slug) -> the site's emblem canvas, deterministic per
     live kind rank (0 village, 1 town, 2 city) and physical site slug. The
     cache holds one canvas per rank+site and the map scales it at draw time
     — sizing must never key this cache, or every zoom tick would regenerate
     art for the whole viewport. The cap only bounds how much of the map has
     been seen up close in one session, never correctness. */
  FB.siteArt = function (rank, slug) {
    const key = rank + '|' + slug;
    const hit = cache[key];
    if (hit) return hit;
    if (cacheCount >= 600) wipe();
    const cv = document.createElement('canvas');
    cv.width = EMBLEM; cv.height = EMBLEM;
    const ctx = cv.getContext('2d');
    ctx.scale(EMBLEM / 64, EMBLEM / 64);
    const h = hashOf(rank + ':' + slug);
    if (rank >= 2) cityEmblem(ctx, h);
    else if (rank === 1) townEmblem(ctx, h);
    else villageEmblem(ctx, h);
    cache[key] = cv;
    cacheCount++;
    return cv;
  };
})();
