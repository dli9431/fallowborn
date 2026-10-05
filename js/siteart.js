/* Fallowborn — procedural settlement emblems for the detailed map (no assets).
   Each marker is generated from the physical site slug, so one settlement keeps
   the same little skyline across sessions, bookmarks, and mods without touching
   saved state or gameplay RNG. A site gets ONE fixed-size cached emblem canvas
   per live kind and resolved style; the map scales the blit to the current
   zoom, so panning and zooming never regenerate art. */
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

  const own = Object.prototype.hasOwnProperty;
  // Snapshot the fallback so a replaced/malformed data entry cannot break art.
  const DEFAULT_STYLE = JSON.parse(JSON.stringify(FBDATA.architectureStyles.manuscript));
  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function color(value) {
    if (typeof value !== 'string') return false;
    if (/^(?:#[0-9a-f]{3}|#[0-9a-f]{6})$/i.test(value)) return true;
    const channels = /^rgb(a?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i.exec(value);
    return !!channels && +channels[2] <= 255 && +channels[3] <= 255 && +channels[4] <= 255 &&
      (channels[1] ? channels[5] !== undefined && +channels[5] <= 1 : channels[5] === undefined);
  }

  FB.architectureStyleFaults = function (style) {
    const errors = [];
    if (!record(style)) return ['must be an architecture style object.'];
    for (const key in style) if (own.call(style, key) && key !== 'palettes' && key !== 'shapes') {
      errors.push('unknown field ' + key + '.');
    }
    if (style.palettes !== undefined) {
      if (!record(style.palettes)) errors.push('palettes must be an object.');
      else for (const key in style.palettes) if (own.call(style.palettes, key)) {
        const value = style.palettes[key], fallback = DEFAULT_STYLE.palettes[key];
        if (!own.call(DEFAULT_STYLE.palettes, key)) errors.push('unknown palette ' + key + '.');
        else if (Array.isArray(fallback)) {
          if (!Array.isArray(value) || !value.length || value.length > 32 || !value.every(color)) {
            errors.push('palette ' + key + ' needs 1-32 colors.');
          }
        } else if (!color(value)) errors.push('palette ' + key + ' needs a color.');
      }
    }
    if (style.shapes !== undefined) {
      if (!record(style.shapes)) errors.push('shapes must be an object.');
      else for (const key in style.shapes) if (own.call(style.shapes, key)) {
        const library = own.call(SHAPES, key) && SHAPES[key];
        if (!library || typeof style.shapes[key] !== 'string' || !own.call(library, style.shapes[key])) {
          errors.push('unknown ' + key + ' shape ' + style.shapes[key] + '.');
        }
      }
    }
    return errors;
  };

  function usable(id) {
    const table = FBDATA.architectureStyles || {};
    return typeof id === 'string' && own.call(table, id) &&
      !FB.architectureStyleFaults(table[id]).length;
  }
  FB.architectureStyle = function (culture, state) {
    if (state === undefined) state = FB.state;
    const local = culture && FB.cultureValue ? FB.cultureValue(state, culture, 'architecture').value : null;
    if (usable(local)) return local;
    const eraId = FB.campaignEra ? FB.campaignEra(state) : null;
    const era = eraId && FBDATA.eras[eraId];
    return era && usable(era.architecture) ? era.architecture : 'manuscript';
  };
  function resolvedStyle(id) {
    const raw = usable(id) ? FBDATA.architectureStyles[id] : DEFAULT_STYLE;
    return {
      palettes:Object.assign({}, DEFAULT_STYLE.palettes, raw.palettes),
      shapes:Object.assign({}, DEFAULT_STYLE.shapes, raw.shapes)
    };
  }
  // The map prepares this once per visible county, rather than validating and
  // serializing a style for every marker in that county on every frame.
  FB.siteArtPresentation = function (culture, state) {
    const id = FB.architectureStyle(culture, state), style = resolvedStyle(id);
    return { style:style, key:id + '|' + JSON.stringify(style) };
  };

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

  function pitched(ctx, cx, base, w, h, roofH, wall, roof, style) {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = style.palettes.ink;
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
    ctx.fillStyle = style.palettes.ink;
    ctx.fillRect(cx - 1.6, base - 5, 3.2, 5);
  }

  function flat(ctx, cx, base, w, h, roofH, wall, roof, style) {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = style.palettes.ink;
    ctx.fillStyle = wall;
    ctx.fillRect(cx - w / 2, base - h, w, h);
    ctx.strokeRect(cx - w / 2, base - h, w, h);
    ctx.fillStyle = roof;
    ctx.fillRect(cx - w / 2 - 1, base - h - 3, w + 2, 3);
    ctx.strokeRect(cx - w / 2 - 1, base - h - 3, w + 2, 3);
    ctx.fillStyle = style.palettes.ink;
    ctx.fillRect(cx - 1.6, base - 5, 3.2, 5);
  }
  function cottage(ctx, cx, base, w, h, roofH, wall, roof, style) {
    SHAPES.dwellings[style.shapes.dwellings](ctx, cx, base, w, h, roofH, wall, roof, style);
  }

  function villa(ctx, cx, base, w, h, roofH, wall, roof, style) {
    /* A low tiled house with a shaded portico. */
    pitched(ctx, cx, base, w, h * .8, roofH * .55, wall, roof, style);
    ctx.fillStyle = style.palettes.ink;
    ctx.fillRect(cx - w * .4, base - h * .45, w * .8, h * .45);
    ctx.fillStyle = wall;
    for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * w * .32 - .7, base - h * .5, 1.4, h * .5);
  }

  function tree(ctx, cx, base, s, style) {
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = style.palettes.ink;
    ctx.fillStyle = style.palettes.trunk;
    ctx.fillRect(cx - 1.6 * s, base - 8 * s, 3.2 * s, 8 * s);
    ctx.strokeRect(cx - 1.6 * s, base - 8 * s, 3.2 * s, 8 * s);
    ctx.beginPath();
    ctx.arc(cx, base - 11 * s, 5.6 * s, 0, 6.2832);
    ctx.arc(cx - 3.4 * s, base - 7.5 * s, 3.6 * s, 0, 6.2832);
    ctx.arc(cx + 3.4 * s, base - 7.5 * s, 3.6 * s, 0, 6.2832);
    ctx.fillStyle = style.palettes.leaf;
    ctx.fill();
  }

  function tower(ctx, x, top, bottom, stone, style) {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = style.palettes.ink;
    ctx.fillStyle = stone;
    ctx.fillRect(x, top, 11, bottom - top);
    ctx.strokeRect(x, top, 11, bottom - top);
    SHAPES.fortification[style.shapes.fortification](ctx, x, x + 11, top - 4, 4, stone);
  }

  function spire(ctx, tx, roof) {
    ctx.beginPath();
    ctx.moveTo(tx - 2, 22);
    ctx.lineTo(tx + 5.5, 11);
    ctx.lineTo(tx + 13, 22);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.stroke();
  }
  function dome(ctx, tx, roof) {
    ctx.beginPath();
    ctx.arc(tx + 5.5, 22, 7.5, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.stroke();
  }
  function basilica(ctx, tx, roof) {
    ctx.fillStyle = roof;
    ctx.fillRect(tx - 3, 17, 17, 5);
    ctx.strokeRect(tx - 3, 17, 17, 5);
  }
  function castra(ctx, x0, x1, y, step, stone) {
    ctx.fillStyle = stone;
    ctx.fillRect(x0, y + 1, x1 - x0, 3);
  }
  function palisade(ctx, x0, x1, y, step, stone) {
    ctx.fillStyle = stone;
    for (let x = x0; x + step * 0.62 <= x1 + 0.01; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 1);
      ctx.lineTo(x + step * 0.31, y - 2);
      ctx.lineTo(x + step * 0.62, y + 1);
      ctx.lineTo(x + step * 0.62, y + 4); ctx.closePath();
      ctx.fill();
    }
  }
  /* Data chooses names, never executable functions. Preserve the original
     paths in the default entries to keep medieval pixels identical. */
  const SHAPES = {
    dwellings:{ pitched:pitched, flat:flat, villa:villa },
    worship:{ spire:spire, dome:dome, basilica:basilica },
    fortification:{ crenellated:battlement, palisade:palisade, castra:castra }
  };

  function basilicaHall(ctx, tx, roof, stone, style) {
    const cx = tx < 32 ? 18 : 46;
    pitched(ctx, cx, 55, 23, 23, 6, stone, roof, style);
    ctx.fillStyle = stone;
    ctx.fillRect(cx - 7, 25, 14, 9);
    ctx.strokeRect(cx - 7, 25, 14, 9);
    pitched(ctx, cx, 34, 14, 9, 5, stone, roof, style);
    ctx.fillStyle = style.palettes.ink;
    for (let x = cx - 5; x <= cx + 5; x += 5) ctx.fillRect(x, 28, 2, 3);
  }
  /* A registered worship silhouette may replace the whole hall. The
     existing spire/dome path below remains pixel-identical. */
  const WORSHIP_HALLS = { basilica:basilicaHall };
  const FORT_LAYOUTS = {
    castra:{ keepTop:24, keepHeight:16, parapet:20, flagBase:20, flagTop:12,
      flagMid:14.5, flagBottom:17, towerTop:29 }
  };
  const DEFAULT_FORT_LAYOUT = { keepTop:14, keepHeight:26, parapet:10,
    flagBase:10, flagTop:2, flagMid:4.5, flagBottom:7, towerTop:24 };

  /* village: two or three cottages, sometimes a tree */
  function villageEmblem(ctx, h, style) {
    const p = style.palettes;
    const wall = p.walls[byte(h, 3) % p.walls.length];
    const roof = p.roofs[byte(h, 2) % p.roofs.length];
    ground(ctx, 22);
    cottage(ctx, 20, 55, 15, 11 + byte(h, 5) % 4, 7, wall, roof, style);
    cottage(ctx, 38, 56, 17, 12 + byte(h, 6) % 4, 8, wall, roof, style);
    if (byte(h, 4) % 3) cottage(ctx, 51, 56, 11, 8 + byte(h, 7) % 3, 6, wall, roof, style);
    else tree(ctx, 52, 56, 1, style);
  }

  /* town: a stone hall tower with a spire, cottages gathered around it */
  function townEmblem(ctx, h, style) {
    const p = style.palettes;
    const wall = p.walls[byte(h, 3) % p.walls.length];
    const roof = p.roofs[byte(h, 2) % p.roofs.length];
    const stone = p.stones[byte(h, 8) % p.stones.length];
    const left = byte(h, 9) % 2 === 0;
    const tx = left ? 7 : 46;
    ground(ctx, 26);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = p.ink;
    const hall = WORSHIP_HALLS[style.shapes.worship];
    if (hall) hall(ctx, tx, roof, stone, style);
    else {
      ctx.fillStyle = stone;
      ctx.fillRect(tx, 22, 11, 34);
      ctx.strokeRect(tx, 22, 11, 34);
      SHAPES.worship[style.shapes.worship](ctx, tx, roof);
    }
    const houses = left ? [28, 43, 56] : [8, 21, 36];
    for (let i = 0; i < houses.length; i++) {
      cottage(ctx, houses[i], 55 + (i === 1 ? 1 : 0), 13 - i,
        9 + byte(h, 5 + i) % 4, 6, wall, roof, style);
    }
  }

  /* city: crenellated wall and gate before two towers and a bannered keep */
  function cityEmblem(ctx, h, style) {
    const p = style.palettes;
    const stone = p.stones[byte(h, 3) % p.stones.length];
    const roof = p.roofs[byte(h, 2) % p.roofs.length];
    const banner = p.banners[byte(h, 6) % p.banners.length];
    const fort = SHAPES.fortification[style.shapes.fortification];
    const layout = FORT_LAYOUTS[style.shapes.fortification] || DEFAULT_FORT_LAYOUT;
    ground(ctx, 28);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = p.ink;
    // keep, set back behind the wall
    const kx = 23 + byte(h, 5) % 5;
    ctx.fillStyle = stone;
    ctx.fillRect(kx, layout.keepTop, 14, layout.keepHeight);
    ctx.strokeRect(kx, layout.keepTop, 14, layout.keepHeight);
    fort(ctx, kx, kx + 14, layout.parapet, 4.5, stone);
    // banner on the keep
    ctx.beginPath();
    ctx.moveTo(kx + 7, layout.flagBase); ctx.lineTo(kx + 7, layout.flagTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(kx + 7, layout.flagTop); ctx.lineTo(kx + 16, layout.flagMid); ctx.lineTo(kx + 7, layout.flagBottom);
    ctx.closePath();
    ctx.fillStyle = banner;
    ctx.fill();
    // flanking towers
    tower(ctx, 8, layout.towerTop + byte(h, 7) % 3, 56, stone, style);
    tower(ctx, 45, layout.towerTop + byte(h, 8) % 3, 56, stone, style);
    // curtain wall with a gate arch
    ctx.fillStyle = stone;
    ctx.fillRect(14, 38, 36, 18);
    ctx.strokeRect(14, 38, 36, 18);
    fort(ctx, 14, 50, 34, 6, stone);
    ctx.fillStyle = p.ink;
    ctx.fillRect(28, 46, 8, 10);
    ctx.beginPath();
    ctx.arc(32, 46, 4, 3.1416, 0);
    ctx.fill();
    // a roof peeking out over the wall
    if (style.shapes.dwellings === 'flat') {
      ctx.fillStyle = roof;
      ctx.fillRect(36, 35, 12, 3);
      ctx.strokeRect(36, 35, 12, 3);
    } else {
      ctx.beginPath();
      ctx.moveTo(36, 38); ctx.lineTo(42, 31); ctx.lineTo(48, 38);
      ctx.closePath();
      ctx.fillStyle = roof;
      ctx.fill();
      ctx.stroke();
    }
  }

  const EMBLEM = 96; // one fixed canvas edge per site; the map scales the blit
  const cache = {};
  let cacheCount = 0;
  function wipe() {
    for (const key in cache) delete cache[key];
    cacheCount = 0;
  }

  /* FB.siteArt(rank, slug, culture?, state?) -> the site's emblem canvas, deterministic per
     live kind rank (0 village, 1 town, 2 city) and physical site slug. The
     cache holds one canvas per rank+site+resolved style and scales at draw time.
     Sizing must never key this cache, or every zoom tick would regenerate
     art for the whole viewport. The cap only bounds how much of the map has
     been seen up close in one session, never correctness. */
  FB.siteArt = function (rank, slug, culture, state, presentation) {
    presentation = presentation || FB.siteArtPresentation(culture, state);
    const style = presentation.style;
    const key = rank + '|' + slug + '|' + presentation.key;
    const hit = cache[key];
    if (hit) return hit;
    if (cacheCount >= 600) wipe();
    const cv = document.createElement('canvas');
    cv.width = EMBLEM; cv.height = EMBLEM;
    const ctx = cv.getContext('2d');
    ctx.scale(EMBLEM / 64, EMBLEM / 64);
    const h = hashOf(rank + ':' + slug);
    if (rank >= 2) cityEmblem(ctx, h, style);
    else if (rank === 1) townEmblem(ctx, h, style);
    else villageEmblem(ctx, h, style);
    cache[key] = cv;
    cacheCount++;
    return cv;
  };
})();
