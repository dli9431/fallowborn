/* Fallowborn — deterministic Court Illustration character art (no assets). */
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

  /* Item art resolves only saved visual fields and never consumes gameplay RNG. */
  function pickArt(item, keys, fallback, salt) {
    const art = item && item.art || {};
    let list = null;
    for (let i = 0; i < keys.length; i++) {
      if (art[keys[i]]) { list = art[keys[i]]; break; }
    }
    if (!Array.isArray(list)) list = list ? [list] : [fallback];
    return list[byte(item ? item.visualSeed : 0, salt || 0) % list.length];
  }

  function itemFromLoadout(state, loadout, slot) {
    const value = loadout && loadout[slot];
    if (!value) return null;
    if (typeof value === 'object' && value.defId && FB.resolveItemSnapshot) {
      return FB.resolveItemSnapshot(value);
    }
    return state && FB.resolveItemReadOnly
      ? FB.resolveItemReadOnly(state, value)
      : null;
  }

  /* Every item picture goes through this saved-seed renderer. Its local
     design space is roughly -50..50 and it never consumes gameplay RNG. */
  function drawItemArt(ctx, item, x, y, scale, angle, mirror) {
    if (!ctx || !item) return;
    const kind = item.art && item.art.kind || 'generic';
    const metal = pickArt(item, ['metals'], '#afb5b3', 1);
    const base = pickArt(item,
      ['cloths', 'leathers', 'woods', 'covers', 'grips', 'cords', 'wraps'],
      '#5b402b', 2);
    const accent = pickArt(item,
      ['gems', 'threads', 'trims', 'pages'], '#c5a454', 3);
    const polish = item.quality === 'masterwork' ? '#f5e4a4' :
      (item.quality === 'well' ? '#ddd8bd' : '#928878');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.scale((mirror ? -1 : 1) * scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#241d18';
    ctx.lineWidth = 2.2;

    if (kind === 'sword' || kind === 'seax') {
      const short = kind === 'seax';
      const top = short ? -31 : -45;
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(short ? 6 : 7, 14);
      ctx.lineTo(0, 19);
      ctx.lineTo(short ? -3 : -7, 14);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = polish; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, top + 5); ctx.lineTo(1, 12); ctx.stroke();
      ctx.strokeStyle = '#241d18'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-11, 18); ctx.lineTo(11, 18); ctx.stroke();
      ctx.strokeStyle = base; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 37); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(0, 40, item.art && item.art.gems ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      if (item.art && (item.art.runes || item.art.pattern)) {
        ctx.strokeStyle = accent; ctx.lineWidth = 1.2;
        for (let r = -20; r < 9; r += 8) {
          ctx.beginPath(); ctx.moveTo(-2, r); ctx.lineTo(3, r + 4); ctx.stroke();
        }
      }
    } else if (kind === 'spear') {
      ctx.strokeStyle = base; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 49); ctx.stroke();
      ctx.fillStyle = metal; ctx.strokeStyle = '#292521'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -55); ctx.lineTo(8, -35); ctx.lineTo(0, -30);
      ctx.lineTo(-8, -35); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = polish; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -51); ctx.lineTo(1, -36); ctx.stroke();
    } else if (kind === 'shield') {
      ctx.fillStyle = base; ctx.strokeStyle = metal; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 31, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-27, 0); ctx.lineTo(27, 0);
      ctx.moveTo(0, -27); ctx.lineTo(0, 27); ctx.stroke();
      ctx.fillStyle = metal; ctx.strokeStyle = '#2b2925'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (kind === 'book') {
      ctx.fillStyle = base;
      ctx.fillRect(-26, -32, 52, 64); ctx.strokeRect(-26, -32, 52, 64);
      ctx.fillStyle = accent; ctx.fillRect(-20, -27, 40, 54);
      ctx.fillStyle = base; ctx.fillRect(-17, -26, 3, 52);
      ctx.strokeStyle = polish; ctx.lineWidth = 1.5;
      ctx.strokeRect(-20, -27, 40, 54);
    } else if (kind === 'jack') {
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(-31, -25); ctx.lineTo(-18, -38); ctx.lineTo(-8, -31);
      ctx.lineTo(8, -31); ctx.lineTo(18, -38); ctx.lineTo(31, -25);
      ctx.lineTo(23, 35); ctx.lineTo(-23, 35); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 1.4;
      for (let q = -14; q <= 28; q += 10) {
        ctx.beginPath(); ctx.moveTo(-21, q); ctx.lineTo(21, q); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 34); ctx.stroke();
    } else if (kind === 'helm') {
      ctx.fillStyle = metal;
      ctx.beginPath(); ctx.arc(0, 0, 25, Math.PI, 0); ctx.lineTo(23, 12);
      ctx.lineTo(-23, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(-4, -1, 8, 29);
      ctx.strokeStyle = polish; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, 0); ctx.stroke();
    } else if (kind === 'crown') {
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(-28, 12); ctx.lineTo(-28, -8); ctx.lineTo(-16, 2);
      ctx.lineTo(-8, -17); ctx.lineTo(0, 0); ctx.lineTo(9, -19);
      ctx.lineTo(17, 2); ctx.lineTo(28, -10); ctx.lineTo(28, 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent;
      for (let g = -16; g <= 16; g += 16) {
        ctx.beginPath(); ctx.arc(g, 7, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'ring') {
      ctx.strokeStyle = metal; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 4, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = accent; ctx.strokeStyle = '#30271f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(0, -23);
      ctx.lineTo(8, -14); ctx.lineTo(5, -6); ctx.lineTo(-5, -6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'pendant' || kind === 'relic') {
      ctx.strokeStyle = base; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -9, 25, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      ctx.fillStyle = metal; ctx.strokeStyle = '#30271f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 16, kind === 'relic' ? 12 : 9, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 24);
      ctx.moveTo(-6, 15); ctx.lineTo(6, 15); ctx.stroke();
    } else if (kind === 'belt') {
      ctx.fillStyle = base; ctx.strokeStyle = '#2d211a'; ctx.lineWidth = 2;
      ctx.fillRect(-43, -8, 86, 16); ctx.strokeRect(-43, -8, 86, 16);
      ctx.strokeStyle = metal; ctx.lineWidth = 4; ctx.strokeRect(-10, -11, 20, 22);
      if (item.art && item.art.gems) {
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(-28, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(28, 0, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'boots') {
      ctx.fillStyle = base;
      for (let b = -1; b <= 1; b += 2) {
        ctx.beginPath();
        ctx.moveTo(b * 14, -31); ctx.lineTo(b * 35, -31);
        ctx.quadraticCurveTo(b * 36, -3, b * 33, 17);
        ctx.quadraticCurveTo(b * 34, 21, b * 40, 25);
        ctx.quadraticCurveTo(b * 39, 32, b * 31, 34);
        ctx.lineTo(b * 14, 33);
        ctx.quadraticCurveTo(b * 11, 29, b * 14, 22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(205,163,119,0.42)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(b * 16, -25); ctx.lineTo(b * 33, -25);
        ctx.moveTo(b * 15, 18); ctx.quadraticCurveTo(b * 24, 14, b * 33, 18);
        ctx.stroke();
        ctx.strokeStyle = '#241d18';
        ctx.lineWidth = 2.2;
      }
    } else if (kind === 'chest') {
      ctx.fillStyle = base; ctx.fillRect(-30, -24, 60, 48); ctx.strokeRect(-30, -24, 60, 48);
      ctx.strokeStyle = metal; ctx.lineWidth = 4; ctx.strokeRect(-25, -19, 50, 38);
      ctx.fillStyle = metal; ctx.fillRect(-5, -3, 10, 13);
      if (item.art && item.art.mark) {
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 12);
        ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.stroke();
      }
    } else if (kind === 'picks') {
      ctx.strokeStyle = metal; ctx.lineWidth = 3;
      for (let p = -9; p <= 9; p += 9) {
        ctx.beginPath(); ctx.moveTo(p, 35); ctx.lineTo(p, -30); ctx.lineTo(p + 10, -36); ctx.stroke();
      }
      ctx.strokeStyle = base; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(-16, 25); ctx.lineTo(17, 25); ctx.stroke();
    } else {
      ctx.fillStyle = base; ctx.strokeStyle = metal; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent; ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', 0, 1);
    }
    ctx.restore();
  }

  /* PORTRAIT V2 START
     Court Illustration v2 shipping engine. The development oracle under
     tools/portrait-reference uses hidden mesh geometry; this renderer
     intentionally resolves only the named anchors the illustration reads. */
  var TAU = Math.PI * 2;
  /* Portrait backing stores render at device resolution so HiDPI screens
     never upscale them; layout keeps using CSS-pixel sizes (faceTag and
     sizeFaceCanvas pin them inline, the paperdoll via its CSS rule). The
     ratio is capped at 2 (memory grows with its square; past 2x nothing is
     distinguishable at these sizes), floored at 1 (zoomed-out windows must
     not drop below the tuned 96x108 cell), and read once at boot: canvases
     and the atlas must share one scale, so a mid-monitor-move keeps the
     boot resolution until reload. */
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  if (!(DPR >= 1)) DPR = 1;
  var CELL_W = Math.round(96 * DPR), CELL_H = Math.round(108 * DPR), ATLAS_SLOTS = 64;
  var ATLAS_W = CELL_W * 8, ATLAS_H = CELL_H * 8;
  var ATLAS_BYTES = ATLAS_W * ATLAS_H * 4;
  var FIGURE_W = Math.round(192 * DPR), FIGURE_H = Math.round(360 * DPR);
  /* Worn slots integrate into the drawing; hand objects show as inset
     panels beside the body inside the figure card, because a weapon
     glued to a hand never posed convincingly. */
  var VISIBLE_SLOTS = ['head','neck','body','waist','feet','leftHand','rightHand','ring'];
  var BUST_SLOTS = ['head','body'];
  var ORDINARY_HAIR_STYLES = ['crop','sidePart','curly','longLoose','braids','bun',
    'bowl','sweptBack','shoulderWaves','tiedBack','crownBraid'];
  var NEW_HAIR_STYLES = ['bowl','sweptBack','shoulderWaves','tiedBack','crownBraid'];
  var APPEARANCE_BEARD_KINDS = ['none','stubble','short','full','long'];
  var APPEARANCE_BEARD_CUTS = ['natural','square','spade','forked','goatee',
    'sideburn','moustache'];
  var APPEARANCE_BEARD_RENDER = {
    natural:'full',square:'square',spade:'spade',forked:'forked',goatee:'goatee',
    sideburn:'chops',moustache:'stache'
  };
  FB.PORTRAIT_HAIR_STYLES = ORDINARY_HAIR_STYLES.slice();
  FB.PORTRAIT_BEARD_KINDS = APPEARANCE_BEARD_KINDS.slice();
  FB.PORTRAIT_BEARD_CUTS = APPEARANCE_BEARD_CUTS.slice();
  var CULTURE_TONE = {
    norse:.3,english:.5,german:.5,frankish:.6,slavic:.7,baltic:.65,
    gaelic:.4,brezhon:.5,magyar:.8,iberian:1.3,italian:1.2,greek:1.3,
    armenian:1.4,georgian:1.35,turkic:1.5,andalusi:1.9,arabic:2.2,
    berber:2.3,persian:2,nubian:3.7
  };
  var CULTURE_FAIR = {
    norse:.68,english:.48,german:.55,frankish:.42,slavic:.46,baltic:.5,
    gaelic:.4,brezhon:.42,magyar:.32,iberian:.08,italian:.1,greek:.07,
    armenian:.05,georgian:.06,turkic:.05,andalusi:.04,arabic:.02,
    berber:.02,persian:.03,nubian:.01
  };
  var CULTURE_RED = {
    norse:.18,english:.1,german:.07,frankish:.07,slavic:.05,baltic:.06,
    gaelic:.34,brezhon:.2,magyar:.05
  };
  var TONE_RGB = [[241,205,175],[219,172,128],[184,132,92],
    [136,92,62],[94,63,47]];
  var HAIR_RGB = {
    black:[42,34,30],darkBrown:[66,48,34],brown:[98,70,44],
    chestnut:[124,86,50],auburn:[138,74,40],blond:[196,158,102],
    ash:[148,138,120]
  };
  var EYE_RGB = {
    brown:[96,64,40],dark:[58,42,32],hazel:[116,86,48],
    green:[96,110,72],blue:[92,124,148],gray:[116,128,132]
  };
  /* Reference palette constants and the headwear tables the descriptor
     and painter share. Variants and covers mirror the reference
     HEADDRESS_TYPES table for every kind the game generates. */
  var INK=[48,35,31],GOLD=[207,165,74],GOLD_L=[246,216,132];
  var STEEL=[126,142,151],STEEL_L=[206,215,216],LINEN=[226,218,199];
  var HEADWEAR_VARIANTS = {
    circlet:['plain','gemmed'],crown:['points','fleurons'],
    imperial:['arched','mitred'],helm:['nasal','banded'],coif:['linen'],
    veil:['fall','pinned'],wimple:['plain','banded'],
    turban:['wrapped','tailed'],cap:['felt','brimmed'],
    kerchief:['knotted','chin'],fillet:['band','barbette'],
    strawHat:['field','pilgrim'],chaperon:['liripipe','rolled'],
    furHat:['round','tall'],mitre:['plain','orphrey'],
    garland:['flowers','laurel'],crespine:['plain','filleted']
  };
  var HEADWEAR_COVERS = {helm:1,coif:1,veil:1,wimple:1,turban:1,
    kerchief:1,chaperon:1,furHat:1};
  /* How much rises above the skull, in head units: the bust framing
     reserves exactly this much headroom, so a bare head fills the card
     while a mitre still gets its height. */
  var HEADWEAR_RISE = {crown:12,imperial:19,turban:14,mitre:22,strawHat:14,
    furHat:16,cap:11,helm:9,chaperon:9,veil:8,wimple:8,crespine:7,
    garland:7,kerchief:6,coif:6,fillet:6,circlet:6,none:6};

  function clampV2(value, low, high) {
    return value < low ? low : (value > high ? high : value);
  }
  function mixV2(a, b, t) { return a + (b - a) * t; }
  function smoothV2(a, b, value) {
    var t = clampV2((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function rgbMixV2(a, b, t) {
    return [Math.round(mixV2(a[0], b[0], t)),
      Math.round(mixV2(a[1], b[1], t)),
      Math.round(mixV2(a[2], b[2], t))];
  }
  function shadeV2(color, amount) {
    return rgbMixV2(color, amount >= 0 ? [255,255,255] : [0,0,0],
      Math.abs(amount));
  }
  function cssV2(color, alpha) {
    if (typeof color === 'string') return color;
    return alpha === undefined
      ? 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')'
      : 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha + ')';
  }
  function saltedByte(seed, salt, index) {
    return byte(hashOf(String(seed) + '|' + salt), index || 0);
  }
  function saltedUnit(seed, salt, index) {
    return saltedByte(seed, salt, index) / 255;
  }
  function keyToken(value) {
    return encodeURIComponent(value === undefined || value === null ? '' : String(value));
  }
  function hasTrait(c, id) {
    return !!(c.traits && c.traits.indexOf(id) >= 0);
  }
  function cultureProfile(id) {
    if (Object.prototype.hasOwnProperty.call(CULTURE_TONE, id)) {
      return {tone:CULTURE_TONE[id],fair:CULTURE_FAIR[id] || 0,
        red:CULTURE_RED[id] || .02};
    }
    /* Resolve the mod culture through the public fallback, then choose a
       deterministic nearby palette rather than throwing or consuming RNG. */
    var fallback = FB.cultureOf ? FB.cultureOf(id) : null;
    var seed = hashOf(id + '|' + (fallback && fallback.name || 'Frankish'));
    var nearest = ['frankish','iberian','persian','nubian'][seed % 4];
    return {tone:CULTURE_TONE[nearest],fair:CULTURE_FAIR[nearest] || 0,
      red:CULTURE_RED[nearest] || .02};
  }
  /* The full reference skin ramp, kept as RGB arrays because the painter
     stamps them at many alphas. */
  function skinColors(profile, health) {
    var tone = clampV2(profile.tone, 0, 4);
    var low = Math.min(3, Math.floor(tone));
    var base = rgbMixV2(TONE_RGB[low], TONE_RGB[low + 1], tone - low);
    if (health === 'sick') base = rgbMixV2(base, [186,190,164], .34);
    else if (health === 'dying') base = rgbMixV2(base, [178,182,168], .52);
    return {
      base:base,lit:shadeV2(base,.07),
      shadow:shadeV2(base,-.09),deep:shadeV2(base,-.19),
      line:shadeV2(base,-.33),
      blush:health === 'hale' ? rgbMixV2(base,[198,96,92],.34)
        : rgbMixV2(base,[150,130,110],.2),
      lip:rgbMixV2(shadeV2(base,-.05),[168,78,78],
        health === 'hale' ? .5 : .22),
      lipLine:rgbMixV2(shadeV2(base,-.26),[110,46,46],.5)
    };
  }
  function clothColors(tier, profession, variation) {
    var byProfession = {
      monk:{kind:'habit',base:[96,80,58]},priest:{kind:'cassock',base:[60,56,62]},
      soldier:{kind:'gambeson',base:[128,110,80]},
      merchant:{kind:'doublet',base:[70,108,96]},farmer:{kind:'tunic',base:[112,92,61]},
      craftsman:{kind:'tunic',base:[91,89,72]},noble:{kind:'cote',base:[76,91,119]}
    };
    var byTier = [
      {kind:'tunic',base:[122,102,72]},{kind:'tunic',base:[104,100,66]},
      {kind:'tunic',base:[88,104,66]},{kind:'cote',base:[72,96,130]},
      {kind:'court',base:[140,64,58]},{kind:'court',base:[126,48,56]},
      {kind:'royal',base:[106,58,126]},{kind:'royal',base:[88,44,116]}
    ];
    var pick = byProfession[profession] || byTier[tier];
    var shift = clampV2(variation, -1, 1) * 12;
    var base = [clampV2(Math.round(pick.base[0] + shift),0,255),
      clampV2(Math.round(pick.base[1] - shift*.25),0,255),
      clampV2(Math.round(pick.base[2] - shift*.4),0,255)];
    return {kind:pick.kind,base:cssV2(base),dark:cssV2(shadeV2(base,-.12)),
      deep:cssV2(shadeV2(base,-.22)),light:cssV2(shadeV2(base,.11)),
      trim:tier >= 3 ? '#bea04e' : '#927e5c',
      fur:tier >= 6 ? '#e8e2d6' : '#7a6854',raw:base};
  }
  function normalizedArt(item) {
    var source = item && item.art || {};
    var out = {kind:source.kind || 'generic'};
    var keys = ['metals','gems','cloths','leathers','woods','covers','grips',
      'cords','wraps','threads','trims','pages'];
    var i;
    for (i = 0; i < keys.length; i++) {
      if (Array.isArray(source[keys[i]])) out[keys[i]] = source[keys[i]].slice();
    }
    ['runes','pattern','seal','mark','glow'].forEach(function (key) {
      if (source[key] !== undefined) out[key] = source[key];
    });
    return out;
  }
  function normalizedItem(state, loadout, slot) {
    var item = itemFromLoadout(state, loadout, slot);
    if (!item) return null;
    var art = normalizedArt(item);
    var result = {
      ref:item.ref || item.defId || slot,defId:item.defId || item.ref || slot,
      slot:slot,grip:item.grip === 2 ? 2 : 1,
      quality:item.quality || (item.unique ? 'unique' : 'plain'),
      visualSeed:item.visualSeed === undefined
        ? hashOf(item.ref || item.defId || slot) : item.visualSeed >>> 0,
      motif:item.motif || '',art:art
    };
    result.key = [slot,result.ref,result.defId,art.kind,result.quality,
      result.visualSeed,result.motif,result.grip,JSON.stringify(art)].map(keyToken).join(':');
    return result;
  }
  function visibleAilments(c) {
    var all = FB.ailmentsOf ? FB.ailmentsOf(c) : [];
    var marks = [], sickness = false, i, entry, def;
    for (i = 0; i < all.length; i++) {
      entry = all[i] || {}; def = entry.def || {};
      if (def.kind === 'sickness') sickness = true;
      if (def.mark) marks.push({id:entry.id || '',mark:def.mark,severity:def.sev || 1});
    }
    marks.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    return {sickness:sickness,marks:marks};
  }
  function generatedHair(spec, profile, identity) {
    var family, fair = saltedUnit(identity,'identity-hair',1);
    var red = saltedUnit(identity,'identity-hair',2);
    var roll = saltedUnit(identity,'identity-hair',3);
    if (red < profile.red) family = HAIR_RGB.auburn;
    else if (fair < profile.fair) family = roll < .6 ? HAIR_RGB.blond
      : (roll < .8 ? HAIR_RGB.ash : HAIR_RGB.chestnut);
    /* ash on a child reads as an old woman's gray, not as fair hair */
    if (spec.child && family === HAIR_RGB.ash) {
      family = roll < .5 ? HAIR_RGB.blond : HAIR_RGB.chestnut;
    }
    else family = spec.pigment > 1.6
      ? (roll < .67 ? HAIR_RGB.black : HAIR_RGB.darkBrown)
      : (roll < .25 ? HAIR_RGB.black : roll < .55 ? HAIR_RGB.darkBrown
        : roll < .82 ? HAIR_RGB.brown : HAIR_RGB.chestnut);
    var gray = smoothV2(44,74,spec.age +
      (saltedUnit(identity,'identity-gray',0)*2-1)*9);
    var hair = rgbMixV2(family,[216,212,202],gray);
    if (gray > .9) hair = [229,226,218];
    return {base:hair,dark:shadeV2(hair,-.14),
      deep:shadeV2(hair,-.22),light:shadeV2(hair,.13),gray:gray};
  }
  function generatedHairStyle(spec, identity) {
    var male = ['crop','sidePart','curly','longLoose','receding'];
    var female = ['longLoose','braids','bun','sidePart','curly'];
    var style;
    if (!spec.female && spec.profession === 'monk' && spec.faith === 'christian') {
      style = 'tonsure';
    } else {
      style = (spec.female ? female : male)[saltedByte(identity,'wardrobe-hair',0)%5];
    }
    /* New cuts use their own salt and only replace a bounded minority of
       ordinary adult results. Existing wardrobe identities therefore mostly
       keep their old silhouette, while the contextual rules below remain the
       final authority. */
    if (spec.adult && style !== 'tonsure' && style !== 'receding' &&
        style !== 'bald' &&
        saltedByte(identity,'wardrobe-hair-new',0) > 207) {
      style = NEW_HAIR_STYLES[
        saltedByte(identity,'wardrobe-hair-new',1)%NEW_HAIR_STYLES.length];
    }
    if (!spec.female && spec.age > 42 &&
        saltedUnit(identity,'wardrobe-recede',0) > .62) style = 'receding';
    if (!spec.female && spec.age > 52 &&
        saltedUnit(identity,'wardrobe-recede',0) > .87) style = 'bald';
    if (!spec.female && spec.culture === 'norse' &&
        saltedByte(identity,'wardrobe-hair',1) > 120) style = 'longLoose';
    if (spec.child) style = spec.female ? 'braids' : 'crop';
    return style;
  }
  function hasAppearanceValue(list, value) {
    return typeof value === 'string' && list.indexOf(value) >= 0;
  }
  function normalizedAppearance(spec, appearance) {
    var out = {};
    if (!appearance || typeof appearance !== 'object') return out;
    if (hasAppearanceValue(ORDINARY_HAIR_STYLES,appearance.hairStyle)) {
      out.hairStyle = appearance.hairStyle;
    }
    if (spec.adult && !spec.female &&
        hasAppearanceValue(APPEARANCE_BEARD_KINDS,appearance.beardKind) &&
        hasAppearanceValue(APPEARANCE_BEARD_CUTS,appearance.beardCut)) {
      out.beardKind = appearance.beardKind;
      out.beardCut = appearance.beardCut;
      /* These pairs paint identically. Canonicalizing them keeps cache keys,
         saved overrides, and the picker selection honest about the result. */
      if (out.beardKind === 'none') {
        out.beardCut = 'natural';
      } else if (out.beardKind === 'stubble' && out.beardCut === 'moustache') {
        out.beardKind = 'none';
        out.beardCut = 'natural';
      } else if ((out.beardCut === 'sideburn' || out.beardCut === 'moustache') &&
          (out.beardKind === 'full' || out.beardKind === 'long')) {
        out.beardKind = 'short';
      }
    }
    return out;
  }
  function generatedHeadwear(spec, identity) {
    if (spec.child && spec.tier >= 6) return 'circlet';
    if (spec.faith === 'muslim' && !spec.female && !spec.child &&
        spec.profession !== 'monk') return 'turban';
    if (spec.faith === 'muslim' && spec.female && !spec.child) return 'veil';
    if (spec.tier >= 7) return 'imperial';
    if (spec.tier >= 6) return 'crown';
    if (spec.tier >= 4) return 'circlet';
    if (spec.female && spec.age >= 46 &&
        saltedByte(identity,'wardrobe-head',1) > 84) return 'wimple';
    if (spec.female && !spec.child &&
        saltedByte(identity,'wardrobe-head',1) > 168) return 'veil';
    if (spec.profession === 'soldier' &&
        saltedByte(identity,'wardrobe-head',2) > 96) return 'helm';
    if ((spec.profession === 'merchant' || spec.faith === 'jewish') &&
        !spec.child && saltedByte(identity,'wardrobe-head',2) > 96) return 'cap';
    if (spec.tier <= 1 && !spec.female && !spec.child &&
        saltedByte(identity,'wardrobe-head',2) > 208) return 'coif';
    var roll = saltedByte(identity,'wardrobe-extra',0);
    if (spec.profession === 'priest' && spec.tier >= 2) return 'mitre';
    if (spec.female && !spec.child && spec.tier >= 2 && roll > 150) return 'crespine';
    if (spec.female && !spec.child && spec.tier >= 2 && roll > 96) return 'fillet';
    if (spec.female && spec.child && roll > 176) return 'garland';
    if ((spec.culture === 'norse' || spec.culture === 'slavic' ||
        spec.culture === 'baltic') && !spec.child && roll > 168) return 'furHat';
    if (spec.female && spec.tier <= 2 && !spec.child && roll > 88) return 'kerchief';
    if (spec.tier <= 1 && !spec.child && roll > 200) return 'strawHat';
    if (spec.tier <= 3 && !spec.female && !spec.child && roll < 40) return 'chaperon';
    return 'none';
  }
  function portraitDescriptor(state, c, year, opts) {
    opts = opts || {};
    year = year === undefined ? (state && state.date ? state.date.year : 0) : year;
    var frame = opts.frame === 'figure' || opts.figure ? 'figure' : 'bust';
    var age = Math.max(0,year - (isFinite(c.born) ? c.born : year));
    var child = age < 13, female = c.sex === 'f';
    var isPlayer = !!(state && state.player && c.id === state.player.charId);
    var tier = opts.tier !== undefined ? opts.tier : (isPlayer
      ? state.player.tier : (FB.stationOf ? FB.stationOf(c) : c.station || 0));
    tier = clampV2(Math.round(Number(tier) || 0),0,7);
    var profession = opts.profession !== undefined && opts.profession !== null ? opts.profession
      : (c.career && c.career.profession) ||
        (isPlayer && state.player.profession) || c.role || 'none';
    if (child) profession = 'none';
    profession = profession || 'none';
    var culture = c.culture || 'frankish';
    var profile = cultureProfile(culture);
    var religion = FB.religionOf ? FB.religionOf(c.religion) : {group:'christian'};
    var faith = religion && religion.group || 'christian';
    var ailments = visibleAilments(c);
    var legacyIll = opts.ill !== undefined ? !!opts.ill
      : !!(isPlayer && state.player.flags && state.player.flags.ill);
    var hp = c.health === undefined ? 8 : Number(c.health);
    var health = hp <= 2 ? 'dying'
      : (hp <= 4 || ailments.sickness || legacyIll ? 'sick' : 'hale');
    var expressionClass = hasTrait(c,'cruel') || hasTrait(c,'wrathful')
      ? 'guarded' : (hasTrait(c,'kind') || hasTrait(c,'generous') ? 'warm' : 'neutral');
    var identity = hashOf((c.id || '') + '|' + (c.name || ''));
    var source = opts.loadout !== undefined ? opts.loadout
      : (state && FB.loadoutReadOnly ? FB.loadoutReadOnly(state,c.id) : {});
    var loadout = {}, slots = frame === 'figure' ? VISIBLE_SLOTS : BUST_SLOTS;
    var equipmentKeys = [], i, item;
    if (!opts.suppressEquipment) {
      for (i = 0; i < slots.length; i++) {
        item = normalizedItem(state,source,slots[i]);
        if (item) { loadout[slots[i]] = item; equipmentKeys.push(item.key); }
      }
    }
    var pigment = clampV2(profile.tone +
      (saltedUnit(identity,'identity-skin',0)-.5)*.9,0,4);
    var eyeRoll = saltedUnit(identity,'identity-eye',0);
    var eyeKey = pigment < 1.4
      ? (eyeRoll < .3 ? 'blue' : eyeRoll < .45 ? 'green'
        : eyeRoll < .57 ? 'gray' : eyeRoll < .7 ? 'hazel' : 'brown')
      : pigment < 2.4
        ? (eyeRoll < .12 ? 'green' : eyeRoll < .3 ? 'hazel'
          : eyeRoll < .75 ? 'brown' : 'dark')
        : (eyeRoll < .1 ? 'hazel' : eyeRoll < .55 ? 'brown' : 'dark');
    var neutralExpression = saltedUnit(identity,'identity-expression',0)*.36-.18;
    var spec = {
      identity:identity,age:age,child:child,adult:age>=16,
      maturity:smoothV2(3,19,age),elder:smoothV2(48,78,age),
      female:female,sex:c.sex||'m',culture:culture,faith:faith,tier:tier,
      profession:profession,health:health,expressionClass:expressionClass,
      expression:expressionClass === 'guarded' ? -.52
        : expressionClass === 'warm' ? .45 : neutralExpression,
      scarred:hasTrait(c,'scarred'),oneEyed:hasTrait(c,'one_eyed'),marks:ailments.marks,
      faceWidth:.86+saltedUnit(identity,'identity-face',0)*.28,
      jaw:.7+saltedUnit(identity,'identity-face',1)*.6,
      chin:.75+saltedUnit(identity,'identity-face',2)*.55,
      cheek:saltedUnit(identity,'identity-face',3),
      eyeSize:.8+saltedUnit(identity,'identity-eyes',0)*.45,
      eyeSpacing:.85+saltedUnit(identity,'identity-eyes',1)*.3,
      browWeight:.5+saltedUnit(identity,'identity-eyes',2),
      noseW:.7+saltedUnit(identity,'identity-nose',0)*.7,
      noseLen:.8+saltedUnit(identity,'identity-nose',1)*.45,
      mouthW:.8+saltedUnit(identity,'identity-mouth',0)*.4,
      lipFull:.6+saltedUnit(identity,'identity-mouth',1)*.8,
      earSize:.85+saltedUnit(identity,'identity-ear',0)*.35,
      yaw:(saltedUnit(identity,'identity-pose',0)*2-1)*.1,
      asymmetry:saltedUnit(identity,'identity-asymmetry',0)*.04,
      build:clampV2(saltedUnit(identity,'identity-build',0)*1.12-.06,0,1),
      stature:clampV2(saltedUnit(identity,'identity-build',1)*1.12-.06,0,1),
      lightSide:saltedByte(identity,'identity-light',0)<128?-1:1,
      woundSide:saltedByte(identity,'decal-side',0)<128?-1:1,
      pigment:pigment,eye:EYE_RGB[eyeKey],eyeKey:eyeKey,
      eyeShape:saltedByte(identity,'identity-eye-shape',0)%4,
      browKind:saltedByte(identity,'identity-brow-kind',0)%3,
      noseKind:saltedByte(identity,'identity-nose-kind',0)%4,
      freckles:0,
      hwFit:.38+saltedUnit(identity,'wardrobe-hw-fit',0)*.24,
      hwVolume:.25+saltedUnit(identity,'wardrobe-hw-vol',0)*.5,
      hwDrape:.25+saltedUnit(identity,'wardrobe-hw-drape',0)*.5,
      hwTrim:0,
      bgHue:hashOf(c.dyn||c.name||'fallow')%360,
      cultureHue:hashOf(culture)%360,skin:skinColors({tone:pigment},health),
      cloth:clothColors(tier,profession,saltedUnit(identity,'wardrobe-cloth',0)*2-1)
    };
    spec.hair = generatedHair(spec,profile,identity);
    spec.background={top:'hsl('+spec.bgHue+',24%,29%)',
      bottom:'hsl('+((spec.bgHue+22)%360)+',27%,12%)'};
    spec.cloth.culture='hsl('+spec.cultureHue+',28%,54%)';
    if(faith==='muslim'&&spec.cloth.kind==='tunic')spec.cloth.kind='robe';
    spec.hairStyle = generatedHairStyle(spec,identity);
    spec.beardAmount = !female && spec.adult
      ? clampV2(saltedUnit(identity,'identity-beard',0)*1.25-.12,0,1) : 0;
    if (faith === 'muslim' && !female && spec.adult) {
      spec.beardAmount = Math.max(.45,spec.beardAmount);
    }
    spec.beardKind = spec.beardAmount < .06 ? 'none'
      : spec.beardAmount < .2 ? 'stubble' : spec.beardAmount < .45 ? 'short'
        : spec.beardAmount < .75 ? 'full' : 'long';
    /* chinstrap is out of the generated roster: at portrait zoom every
       rendering of it read as a strap, not a beard */
    spec.beardCut = ['full','square','spade','forked','goatee','square','chops','stache'][
      saltedByte(identity,'identity-beard-cut',0)%8];
    if (faith === 'muslim' && !female && spec.adult &&
        (spec.beardCut === 'stache' || spec.beardCut === 'goatee' ||
         spec.beardCut === 'chinstrap' || spec.beardCut === 'chops')) {
      spec.beardCut = ['full','square','spade','forked'][
        saltedByte(identity,'identity-beard-cut',1)%4];
    }
    var appearanceSource = Object.prototype.hasOwnProperty.call(opts,'appearance')
      ? opts.appearance : c.appearance;
    var appearance = normalizedAppearance(spec,appearanceSource);
    if (appearance.hairStyle) spec.hairStyle = appearance.hairStyle;
    if (appearance.beardKind) {
      spec.beardKind = appearance.beardKind;
      spec.beardCut = APPEARANCE_BEARD_RENDER[appearance.beardCut] || 'full';
    }
    spec.freckles = spec.pigment < 1.2
      ? Math.max(0,saltedUnit(identity,'incidental-freckle',0)*1.4-.7)*
        (spec.child ? 1.6 : 1) : 0;
    spec.hwTrim = clampV2(.2+saltedUnit(identity,'wardrobe-hw-trim',0)*.6+
      (tier >= 4 ? .2 : 0),0,1);
    spec.headwear = generatedHeadwear(spec,identity);
    if (opts.suppressHeadwear) spec.headwear = 'none';
    var hwVariants = HEADWEAR_VARIANTS[spec.headwear];
    spec.headwearVariant = hwVariants
      ? hwVariants[saltedByte(identity,'wardrobe-hw-variant',0)%hwVariants.length] : '';
    spec.coversHair = !!HEADWEAR_COVERS[spec.headwear];
    spec.earring = female && spec.adult && saltedByte(identity,'incidental-jewel',0)>96;
    var markKey = ailments.marks.map(function (mark) {
      return keyToken(mark.id)+':'+keyToken(mark.mark)+':'+mark.severity;
    }).join(',');
    var parts = ['portrait-v2',frame,keyToken(c.id),keyToken(c.name),
      keyToken(c.dyn||''),keyToken(c.sex||''),age,keyToken(culture),keyToken(faith),
      tier,keyToken(profession),health,expressionClass,spec.scarred?1:0,
      spec.oneEyed?1:0,ailments.sickness||legacyIll?1:0,markKey,
      keyToken(spec.hairStyle),keyToken(spec.beardKind),keyToken(spec.beardCut),
      equipmentKeys.join(','),opts.transparent?'transparent':'opaque',
      opts.suppressEquipment?'no-equipment':'equipment',
      opts.suppressHeadwear?'no-headwear':'headwear'];
    return {key:parts.join('|'),frame:frame,spec:spec,loadout:loadout,
      transparent:!!opts.transparent,suppressEquipment:!!opts.suppressEquipment};
  }

  FB.characterLook = function (c, year, state, opts) {
    return portraitDescriptor(state,c,year,opts || {}).spec;
  };
  FB.characterVisualKey = function (state, c, opts) {
    if (!c) return '';
    opts = opts || {};
    var year = opts.year !== undefined ? opts.year
      : (state && state.date ? state.date.year : 0);
    return portraitDescriptor(state,c,year,opts).key;
  };

  /* Direct analytic landmark scaffold. It projects named points and local
     tangents only; no vertex, face, cull, contour, or painter-order data is
     constructed or retained. */
  function projectPoint(point, pose) {
    var cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw);
    var cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
    var ct = Math.cos(pose.tilt), st = Math.sin(pose.tilt);
    var x1 = point[0]*cy + point[2]*sy;
    var z1 = -point[0]*sy + point[2]*cy;
    var y2 = point[1]*cp - z1*sp;
    var z2 = point[1]*sp + z1*cp;
    var x3 = x1*ct - y2*st;
    var y3 = x1*st + y2*ct;
    var k = pose.scale*pose.persp/(pose.persp-z2);
    return [pose.cx+x3*k,pose.cy+y3*k,z2];
  }
  function projectedLandmark(point, pose) {
    var p = projectPoint(point,pose);
    var q = projectPoint([point[0]+1,point[1],point[2]],pose);
    var r = projectPoint([point[0],point[1],point[2]+1],pose);
    var dx = q[0]-p[0], dy = q[1]-p[1];
    var length = Math.sqrt(dx*dx+dy*dy)||1;
    var nx=r[0]-p[0],ny=r[1]-p[1],nz=r[2]-p[2];
    var normalLength=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    return {x:p[0],y:p[1],depth:p[2],tangent:[dx/length,dy/length],
      normal:[nx/normalLength,ny/normalLength,nz/normalLength],
      angle:Math.atan2(dy,dx),visibility:clampV2(.5+nz/normalLength*.5,0,1),
      foreshortening:clampV2(length/pose.scale,0,1.2)};
  }
  function headParameters(spec) {
    var mt = spec.maturity;
    var p = {
      W:29*spec.faceWidth*(.9+.1*mt),D:33*(.92+.08*mt),
      HT:38*(.88+.12*mt),FL:40*(.82+.25*spec.chin)*(.86+.14*mt),
      gonR:.68+.13*spec.jaw,chinW:9.5+5*spec.jaw,
      browZ:.70+.04*spec.browWeight,noseLen:9.5*spec.noseLen,
      noseW:5.5*spec.noseW,earS:spec.earSize,
      neckR:(spec.female?14.5:17.5)*(.8+.2*mt),
      shW:(spec.female?50:58)*(.62+.38*mt)
    };
    p.cheekW = p.W*(.9+.1*spec.cheek);
    return p;
  }
  function bodyParameters(spec, p) {
    var k=.70+.30*spec.maturity, hh=p.HT+p.FL, crown=-p.HT*1.07;
    function at(heads){return crown+(1+(heads-1)*k)*hh;}
    return {headHeight:hh,shoulderY:at(1.3),chestY:at(2),waistY:at(2.8),
      hipY:at(3.75),kneeY:at(5.5),ankleY:at(7.3),soleY:at(7.5),
      shoulder:p.shW,armR:p.shW*(spec.female ? .16 : .19),
      stance:p.shW*.32,depth:p.D*(spec.female ? .52 : .58)};
  }
  function faceFrame(anchors, p, spec) {
    var eyeY=(anchors.eyeL[1]+anchors.eyeR[1])*.5;
    var cx=(anchors.eyeL[0]+anchors.eyeR[0])*.5;
    var rawH=Math.max(12,anchors.chin[1]-anchors.crown[1]);
    var minHalf=rawH*.27;
    var left=Math.min(anchors.earL[0]+1,cx-minHalf);
    var right=Math.max(anchors.earR[0]-1,cx+minHalf);
    var widthT=clampV2((spec.faceWidth-.86)/.28,0,1);
    var gain=.92+widthT*.16;
    left=cx-(cx-left)*gain; right=cx+(right-cx)*gain;
    /* The head unit. The reference clamps at 1.2 because its bust camera
       lands rawH near 90; the game bust fills the card, rawH near 250,
       so the honest ratio must flow through or every u-stated feature
       paints at a fraction of its size. */
    var faceW=right-left,u=clampV2(rawH/90,.4,3.2);
    var upper=clampV2(eyeY-(anchors.crown[1]-3*u),
      faceW*(spec.child ? .56 : .58),faceW*(spec.child ? .68 : .72));
    var top=eyeY-upper,chinT=clampV2((spec.chin-.75)/.55,0,1);
    var rawChin=anchors.chin[1]+2*u+(chinT-.5)*6*u;
    if(spec.child)rawChin=eyeY+(rawChin-eyeY)*(.82+spec.maturity*.18);
    var lowerMin=faceW*(spec.child ? .56 : .64);
    var lowerMax=faceW*(spec.child ? .72 : .84);
    var chinY=clampV2(rawChin,eyeY+lowerMin,eyeY+lowerMax);
    var jawT=clampV2((spec.jaw-.7)/.6+spec.elder*.12-(spec.female ? .06 : 0),0,1);
    var jawY=clampV2(eyeY+(chinY-eyeY)*(.62+chinT*.08),
      eyeY+(chinY-eyeY)*.58,chinY-7*u);
    var jawRatio=.54+jawT*.3;
    var chinX=clampV2(anchors.chin[0],cx-faceW*.07,cx+faceW*.07);
    var chinSpan=clampV2(faceW*(.15+jawT*.075),7.5*u,14.5*u);
    var chinBottom=clampV2(chinY+(2+chinT*3)*u,
      eyeY+lowerMin+2*u,eyeY+lowerMax+4*u);
    var neckGrow=.62+.38*spec.maturity,neckBuild=.8+spec.build*.4;
    var neckBaseW=faceW*(spec.female ? .215 : .245)*neckGrow*neckBuild*
      (1-spec.elder*.08);
    var neckTopW=clampV2(Math.min(neckBaseW*.86,faceW*.5*jawRatio*.84),
      neckBaseW*.66,neckBaseW);
    var neckVisible=clampV2((chinBottom-top)*(.115+.062*spec.maturity)*
      (spec.female?1.06:1)*(1.06-spec.build*.12),5.5*u,26);
    var collarY=chinBottom+neckVisible;
    return {A:anchors,P:p,u:u,cx:cx,
      crownX:clampV2(anchors.crown[0],cx-faceW*.04,cx+faceW*.04),top:top,
      left:left,right:right,halfL:cx-left,halfR:right-cx,eyeY:eyeY,
      upperFace:upper,lowerFace:chinY-eyeY,
      hairY:clampV2(anchors.hairline[1],top+upper*.47,eyeY-9*u),
      mouthX:anchors.mouth[0],mouthY:anchors.mouth[1],chinX:chinX,
      chinY:chinY,chinBottom:chinBottom,chinSpan:chinSpan,jawT:jawT,
      chinT:chinT,cheekT:spec.cheek,jawY:jawY,
      jawL:chinX-(cx-left)*jawRatio,jawR:chinX+(right-cx)*jawRatio,
      cheekL:left-spec.cheek*2.5*u,cheekR:right+spec.cheek*2.5*u,
      throatX:clampV2(anchors.throat[0],chinX-faceW*.055,chinX+faceW*.055),
      throatY:collarY+14*u,
      neckTop:chinBottom-4*u,neckBottom:collarY+5*u,
      neckTopW:neckTopW,neckBaseW:neckBaseW,collarY:collarY,
      torsoY:collarY+14,shoulderHalf:(spec.child?31:36)+p.shW*.5};
  }
  function fullBodyFrame(f, spec, ground) {
    var headH=f.chinBottom-f.top,youth=.70+.30*spec.maturity;
    /* 6.2 heads, the reference's own figure height: its knee between
       canon 7.5 (whose head is too small to carry a face) and the squat
       floor near 5.7. The port first sat at 5.7 and read stocky beside
       the reference - every width below is stated in head units, so
       height in heads IS the build. */
    var k=youth*(6.2-1)/6.5;
    var limit=(((ground-headH*.52)/headH)-1)/6.5;
    if(limit>0&&limit<k)k=limit;
    function at(heads){return f.top+(1+(heads-1)*k)*headH;}
    var bw=.86+spec.build*.3,tw=.92+spec.build*.17;
    var leg=.94+spec.stature*.12,kind=spec.cloth.kind;
    var floor=kind==='habit'||kind==='cassock'||kind==='court'||kind==='royal'||kind==='robe';
    return {cx:f.throatX,headH:headH,floorLength:floor,kind:kind,fem:spec.female,
      shoulderY:at(1.3),chestY:at(2),waistY:at(2.82),hipY:at(3.75),
      kneeY:at(3.75+(5.5-3.75)*leg),ankleY:at(7.24),soleY:at(7.5),
      shoulderHalf:headH*(spec.female ? .67 : .74)*(.97+spec.build*.06),
      chestHalf:headH*(spec.female ? .57 : .62)*tw,
      waistHalf:headH*(spec.female ? .46 : .52)*(.88+spec.build*.26),
      hipHalf:headH*(spec.female ? .60 : .56)*tw,
      armR:headH*(spec.female ? .20 : .225)*bw,
      wristR:headH*(spec.female ? .12 : .135)*(.92+spec.build*.16)*(.5+youth*.5),
      legTop:headH*(spec.female ? .33 : .35)*bw,
      legKnee:headH*(spec.female ? .22 : .235)*bw,
      legAnkle:headH*(spec.female ? .145 : .155)*(.92+spec.build*.16),
      handLen:headH*(spec.female ? .60 : .64)*youth,
      handW:headH*(spec.female ? .135 : .15)*youth,
      shoeW:headH*(spec.female ? .17 : .185),shoeH:headH*(spec.female ? .26 : .29),
      stance:headH*(spec.female ? .32 : .34),
      hemY:floor?at(7.15):at(kind==='doublet'?3.15:4.45)};
  }
  function shiftScaffold(scaffold, dy) {
    var key;
    for(key in scaffold.anchors)scaffold.anchors[key][1]+=dy;
    for(key in scaffold.landmarks)scaffold.landmarks[key].y+=dy;
    ['top','eyeY','hairY','mouthY','chinY','chinBottom','jawY','collarY',
      'neckTop','neckBottom','torsoY','throatY'].forEach(function(name){
      scaffold.face[name]+=dy;
    });
  }
  function buildScaffold(descriptor, scaleMul) {
    var spec=descriptor.spec,p=headParameters(spec);
    var figure=descriptor.frame==='figure';
    var bodyP=figure?bodyParameters(spec,p):null;
    var pose=figure
      /* centred, standing slightly high: the hand-slot insets flank the
         head in the card's top corners */
      /* base .90 at 6.2 heads against the .975 ground; the fit pass in
         analyticScaffold retunes per figure, capped where the
         body-height veto would start squashing widths */
      ? {yaw:spec.lightSide*.12+spec.yaw*.4,pitch:.02,tilt:spec.yaw*.15,
        cx:128,cy:114,scale:.9*(scaleMul||1),persp:1400}
      /* near-frontal: the reference's court turn suited a small head in
         an arch, but at frame-filling zoom the same yaw pushes the
         features off the silhouette's centre and the head reads as
         deformed against the frontal body */
      : {yaw:spec.lightSide*.06+spec.yaw*.35,pitch:.03,tilt:spec.yaw*.15,
        cx:128,cy:156,scale:3.1*(scaleMul||1),persp:340};
    if(figure)pose.cy=480*.975-bodyP.soleY*pose.scale;
    var asym=spec.asymmetry*6,faceZ=p.D*.62,nTipY=p.FL*.4;
    var eyeSpan=p.cheekW*.52*spec.eyeSpacing;
    var raw={
      eyeL:[-eyeSpan,0,p.D*.56],eyeR:[eyeSpan,0,p.D*.56],
      eyeLout:[-eyeSpan-7,0,p.D*.48],eyeRout:[eyeSpan+7,0,p.D*.48],
      mouthL:[asym*.4-(6.5+3.5*spec.mouthW),p.FL*.64,p.D*.5],
      mouthR:[asym*.4+(6.5+3.5*spec.mouthW),p.FL*.64,p.D*.5],
      browL:[-eyeSpan*1.02,-8.5,p.D*p.browZ*.98],
      browR:[eyeSpan*1.02,-8.5,p.D*p.browZ*.98],
      noseTip:[asym*.5,nTipY,faceZ+p.noseLen],
      noseBase:[asym*.5,nTipY+4,faceZ+2.5],
      mouth:[asym*.4,p.FL*.64,p.D*.56],chin:[asym,p.FL,p.D*.54],
      earL:[-p.cheekW*1.02,4,-p.D*.22],earR:[p.cheekW*1.02,4,-p.D*.22],
      throat:[0,p.FL*1.28,-p.D*.15+p.neckR*.95],
      crown:[0,-p.HT,0],hairline:[0,-p.HT*.5,p.D*.68]
    };
    if(figure){
      raw.shoulderL=[-bodyP.shoulder,bodyP.shoulderY,0];
      raw.shoulderR=[bodyP.shoulder,bodyP.shoulderY,0];
      raw.chest=[0,bodyP.chestY,bodyP.depth];
      raw.waist=[0,bodyP.waistY,bodyP.depth*.86];
      raw.hip=[0,bodyP.hipY,bodyP.depth*.9];
      raw.handL=[-(bodyP.shoulder+bodyP.armR*.4),bodyP.hipY+bodyP.headHeight*.2,0];
      raw.handR=[bodyP.shoulder+bodyP.armR*.4,bodyP.hipY+bodyP.headHeight*.2,0];
      raw.kneeL=[-bodyP.stance,bodyP.kneeY,0];raw.kneeR=[bodyP.stance,bodyP.kneeY,0];
      raw.ankleL=[-bodyP.stance*.95,bodyP.ankleY,0];
      raw.ankleR=[bodyP.stance*.95,bodyP.ankleY,0];
      raw.footL=[-bodyP.stance,bodyP.soleY,bodyP.depth*.2];
      raw.footR=[bodyP.stance,bodyP.soleY,bodyP.depth*.2];
      raw.sole=[0,bodyP.soleY,0];
    }
    var anchors={},landmarks={},key;
    for(key in raw)anchors[key]=projectPoint(raw[key],pose);
    ['eyeL','eyeR','browL','browR','noseBase','noseTip','mouth','chin'].forEach(
      function(name){landmarks[name]=projectedLandmark(raw[name],pose);});
    var scaffold={params:p,colors:{skin:spec.skin,hair:spec.hair,
      cloth:spec.cloth,linen:'#e2dbc8',metal:'#8e999e'},
      anchors:anchors,landmarks:landmarks,body:null};
    scaffold.face=faceFrame(anchors,p,spec);
    if(figure){
      /* the sole plants low at .975: the bottom corners carry the
         hand-slot insets as overlays, so the figure claims the frame */
      scaffold.body=fullBodyFrame(scaffold.face,spec,480*.975);
      shiftScaffold(scaffold,480*.975-scaffold.body.soleY);
      scaffold.body=fullBodyFrame(scaffold.face,spec,480*.975);
    }
    return scaffold;
  }
  function analyticScaffold(descriptor) {
    var scaffold=buildScaffold(descriptor,1);
    if(descriptor.frame==='figure'){
      /* Fit the standing figure to the card the way the bust fits its
         frame: measure, refit once, and let the replant ground it. The
         cap keeps the head under the size where the body-height veto
         starts squashing widths. */
      var fb=scaffold.body;
      var figTop=scaffold.face.top-10*scaffold.face.u;
      /* the span target leaves a staged margin above the head - the
         reference sits its figure inside an arch at ~84% of the card;
         claiming the whole frame is what made the port read oversized
         beside it. ~92% keeps gear readable on the equipment sheet. */
      var fitF=(468-26)/Math.max(120,fb.soleY-figTop);
      /* children are never fit-zoomed: their widths are stated at
         adult ratios per head, so growing the head barrels the body -
         and standing small IS the child cue */
      fitF=Math.min(fitF,75/Math.max(40,fb.headH),
        descriptor.spec.child?1:1.15);
      fitF=Math.max(fitF,.86);
      if(fitF<.99||fitF>1.01)scaffold=buildScaffold(descriptor,fitF);
      return scaffold;
    }
    if(descriptor.frame!=='figure'){
      /* Composition-aware bust framing. The first pass measures the
         head; the refit scales it so headwear top to chin exactly fills
         the frame, and a shift pins the visual top just under the card
         edge. Headroom is reserved per headwear kind, so a bare head
         fills the card while a mitre keeps its height. Projection is
         linear around cy, so the refit lands exactly. */
      var spec=descriptor.spec;
      var head=descriptor.loadout.head;
      var kind=head
        ? (head.art.kind==='crown'?'crown'
          : head.art.kind==='helm'?'helm':'none')
        : spec.headwear;
      var riseU=HEADWEAR_RISE[kind]||6;
      if(!head&&!spec.coversHair){
        if(spec.hairStyle==='bun')riseU=Math.max(riseU,18);
        else if(spec.hairStyle==='curly')riseU=Math.max(riseU,12);
      }
      var f=scaffold.face;
      var visTop=f.top-riseU*f.u;
      /* a beard hangs below the chin the way a mitre rises above the
         crown: reserve for it, or a long beard clips into a slab */
      var beardDrop=spec.beardKind==='long'?.2
        :spec.beardKind==='full'?.11:0;
      var visBottom=f.chinBottom+beardDrop*(f.chinBottom-f.top);
      var fit=(256-12)/Math.max(60,visBottom-visTop);
      var maxHalf=Math.max(f.cx-f.left,f.right-f.cx)+7*f.u;
      /* a child's head stays smaller in frame: zoomed to the adult cap
         its round proportions read as a deformed balloon */
      fit=Math.min(fit,122/maxHalf,spec.child?1.02:1.18);
      scaffold=buildScaffold(descriptor,fit);
      f=scaffold.face;
      var u=f.u;
      shiftScaffold(scaffold,12-(f.top-riseU*u));
      if(f.collarY>272){
        f.collarY=Math.max(f.chinBottom+2*u,272);
        f.neckBottom=f.collarY+5*u;
        f.throatY=f.collarY+14*u;
        f.torsoY=f.collarY+14;
      }
    }
    return scaffold;
  }

  /* The reference head silhouette: cranium, cheek, a jaw corner that
     firms with jawT, and the chin lobe. */
  function headPath(ctx, f) {
    var u=f.u;
    ctx.beginPath();
    ctx.moveTo(f.crownX,f.top);
    ctx.bezierCurveTo(f.crownX+f.halfR*.72,f.top-1*u,
      f.right+1*u,f.eyeY-f.upperFace*.55,f.right,f.eyeY-5*u);
    ctx.bezierCurveTo(f.cheekR+1*u,f.eyeY+f.lowerFace*.25,
      f.jawR+(1.5-f.jawT*1.5)*u,f.jawY-3*u,f.jawR,f.jawY+2*u);
    ctx.bezierCurveTo(f.jawR-(1+f.jawT*2)*u,f.chinY-5*u,
      f.chinX+f.chinSpan,f.chinBottom,f.chinX,f.chinBottom);
    ctx.bezierCurveTo(f.chinX-f.chinSpan,f.chinBottom,
      f.jawL+(1+f.jawT*2)*u,f.chinY-5*u,f.jawL,f.jawY+2*u);
    ctx.bezierCurveTo(f.jawL-(1.5-f.jawT*1.5)*u,f.jawY-3*u,
      f.cheekL-1*u,f.eyeY+f.lowerFace*.25,f.left,f.eyeY-5*u);
    ctx.bezierCurveTo(f.left-1*u,f.eyeY-f.upperFace*.55,
      f.crownX-f.halfL*.72,f.top-1*u,f.crownX,f.top);
    ctx.closePath();
  }
  /* The hair cap in head units; the fringe construction is per style. */
  function capPath(ctx, f, style) {
    var u=f.u;
    var temple=f.eyeY-9*u;
    var fringe=style==='crop'||style==='sweptBack'||style==='tiedBack'
      ? f.hairY-2*u : (style==='bowl' ? f.hairY+8*u : f.hairY+3*u);
    var part=style==='sidePart'?f.cx+f.halfR*.28:f.cx;
    ctx.beginPath();
    ctx.moveTo(f.left-1*u,temple);
    ctx.bezierCurveTo(f.left-3*u,f.top+18*u,
      f.crownX-f.halfL*.55,f.top-5*u,f.crownX,f.top-5*u);
    ctx.bezierCurveTo(f.crownX+f.halfR*.55,f.top-5*u,
      f.right+3*u,f.top+18*u,f.right+1*u,temple);
    if(style==='bowl'){
      ctx.quadraticCurveTo(f.right-5*u,fringe+1*u,f.cx+8*u,fringe);
      ctx.quadraticCurveTo(f.cx,fringe+2*u,f.cx-8*u,fringe);
      ctx.quadraticCurveTo(f.left+5*u,fringe+1*u,f.left-1*u,temple);
    }else if(style==='sweptBack'||style==='tiedBack'){
      ctx.quadraticCurveTo(f.right-3*u,f.hairY-1*u,f.cx+10*u,f.hairY-7*u);
      ctx.quadraticCurveTo(f.cx-1*u,f.hairY-10*u,f.left+3*u,f.hairY-2*u);
      ctx.quadraticCurveTo(f.left+1*u,f.hairY-1*u,f.left-1*u,temple);
    }else if(style==='sidePart'){
      ctx.quadraticCurveTo(f.right-5*u,fringe+1*u,part+3*u,fringe-5*u);
      ctx.quadraticCurveTo(f.cx-4*u,fringe+8*u,f.left+1*u,temple);
    }else if(style==='braids'){
      ctx.quadraticCurveTo(f.right-7*u,f.hairY+2*u,f.cx+2*u,f.hairY-4*u);
      ctx.quadraticCurveTo(f.cx-2*u,f.hairY-4*u,f.left+7*u,f.hairY+2*u);
      ctx.quadraticCurveTo(f.left+2*u,f.hairY+1*u,f.left-1*u,temple);
    }else{
      ctx.quadraticCurveTo(f.right-8*u,fringe+4*u,f.cx+11*u,fringe-1*u);
      ctx.quadraticCurveTo(f.cx,fringe+7*u,f.cx-13*u,fringe-1*u);
      ctx.quadraticCurveTo(f.left+7*u,fringe+4*u,f.left-1*u,temple);
    }
    ctx.closePath();
  }
  function traceShoulders(ctx, f, bottom) {
    ctx.beginPath();
    ctx.moveTo(f.throatX-f.neckTopW,f.neckTop);
    ctx.lineTo(f.throatX-f.neckBaseW,f.collarY);
    ctx.bezierCurveTo(f.throatX-f.shoulderHalf,f.collarY+3,
      f.throatX-f.shoulderHalf-18,bottom-16,f.throatX-f.shoulderHalf-22,bottom);
    ctx.lineTo(f.throatX+f.shoulderHalf+22,bottom);
    ctx.bezierCurveTo(f.throatX+f.shoulderHalf+18,bottom-16,
      f.throatX+f.shoulderHalf,f.collarY+3,f.throatX+f.neckBaseW,f.collarY);
    ctx.lineTo(f.throatX+f.neckTopW,f.neckTop);
    ctx.closePath();
  }
  function fillStroke(ctx, fill, stroke, width) {
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function strokeWidth(width, quality) {
    return Math.max(width,quality&&quality.strokeFloor||0);
  }
  /* Deterministic per-identity detail stream (mulberry32). Texture
     strokes need many rolls; this never touches the gameplay RNG. */
  function streamV2(seed, salt) {
    var s=hashOf(String(seed)+'|'+salt)>>>0;
    return function () {
      s=(s+0x6D2B79F5)|0;
      var t=Math.imul(s^(s>>>15),1|s);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  /* A sheen lift measured against how dark the hair already is, so black
     hair still gets a usable light and blond barely moves. */
  function hairLit(spec, k) {
    var h=spec.hair.base;
    var lum=(h[0]*.3+h[1]*.59+h[2]*.11)/255;
    return shadeV2(h,clampV2(k*(1.15-lum)*1.05,0,.55));
  }
  function ink(ctx, width, color, alpha, q) {
    /* A small head cannot afford whisper-weight ink: strokes thicken
       and darken with bold so features stay readable as the apparent
       size drops. */
    if(alpha===undefined)alpha=.9;
    if(q&&q.bold>1){
      width*=1+(q.bold-1)*.7;
      alpha=Math.min(1,alpha*(1+(q.bold-1)*.3));
    }
    ctx.strokeStyle=cssV2(color,alpha);
    ctx.lineWidth=strokeWidth(width,q);
    ctx.lineCap='round';ctx.lineJoin='round';
  }
  /* A stroke that fades along its own length; aMid lets it carry its
     weight in the middle and die at both ends. */
  function fade(ctx, w, color, x0, y0, x1, y1, a0, a1, aMid, q) {
    ink(ctx,w,color,1,q);
    var boost=q&&q.bold>1?1+(q.bold-1)*.3:1;
    var g=ctx.createLinearGradient(x0,y0,x1,y1);
    g.addColorStop(0,cssV2(color,Math.min(1,a0*boost)));
    if(aMid!==undefined)g.addColorStop(.55,cssV2(color,Math.min(1,aMid*boost)));
    g.addColorStop(1,cssV2(color,Math.min(1,a1*boost)));
    ctx.strokeStyle=g;
  }
  function fillStrokeA(ctx, fill, stroke, width, alpha, q) {
    ctx.fillStyle=cssV2(fill);
    ctx.fill();
    ink(ctx,width||1.6,stroke||INK,alpha,q);
    ctx.stroke();
  }
  /* A gradient blob with no edge: the one mark that reads as form
     rather than as a shape pasted on the skin. */
  function softE(ctx, cx, cy, rx, ry, color, alpha, rot) {
    if(rx<=0||ry<=0||alpha<=0)return;
    ctx.save();ctx.translate(cx,cy);
    if(rot)ctx.rotate(rot);
    ctx.scale(rx,ry);
    var g=ctx.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,cssV2(color,alpha));
    g.addColorStop(.62,cssV2(color,alpha*.55));
    g.addColorStop(1,cssV2(color,0));
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();
    ctx.restore();
  }
  function fEll(ctx, cx, cy, rx, ry, color, alpha, rot) {
    if(rx<=0||ry<=0)return;
    ctx.fillStyle=cssV2(color,alpha===undefined?1:alpha);
    ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,rot||0,0,TAU);ctx.fill();
  }
  function gemDot(ctx, x, y, r, color, q) {
    fEll(ctx,x,y,r,r,color);
    ink(ctx,Math.max(.7,r*.3),[60,44,18],.9,q);
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
    fEll(ctx,x-r*.35,y-r*.38,Math.max(.5,r*.32),Math.max(.5,r*.32),
      [255,248,230],.95);
  }
  /* one axis of a quadratic bezier at t */
  function qPt(a, c, b, t) {
    var mt=1-t;
    return mt*mt*a+2*mt*t*c+t*t*b;
  }
  /* An edge drawn through sampled points, smoothed so a dozen samples do
     not read as a polygon. */
  function edgeThrough(ctx, ps, start) {
    var i,n=ps.length;
    if(start)ctx.moveTo(ps[0][0],ps[0][1]);
    else ctx.lineTo(ps[0][0],ps[0][1]);
    for(i=1;i<n-1;i++){
      ctx.quadraticCurveTo(ps[i][0],ps[i][1],
        (ps[i][0]+ps[i+1][0])*.5,(ps[i][1]+ps[i+1][1])*.5);
    }
    ctx.lineTo(ps[n-1][0],ps[n-1][1]);
  }
  /* A ribbon of varying thickness around a sampled centreline, for the
     feature masses that taper: brows, lips, lashes. */
  function ribbonPath(ctx, pts, half) {
    var top=[],bot=[],i;
    for(i=0;i<pts.length;i++){
      top.push([pts[i][0],pts[i][1]-half[i]]);
      bot.push([pts[i][0],pts[i][1]+half[i]]);
    }
    bot.reverse();
    ctx.beginPath();
    edgeThrough(ctx,top,true);
    edgeThrough(ctx,bot,false);
    ctx.closePath();
  }
  /* the same construction across x, for masses that hang: braids, locks,
     cloth tails */
  function fallPath(ctx, pts, half) {
    var l=[],r=[],i;
    for(i=0;i<pts.length;i++){
      l.push([pts[i][0]-half[i],pts[i][1]]);
      r.push([pts[i][0]+half[i],pts[i][1]]);
    }
    r.reverse();
    ctx.beginPath();
    edgeThrough(ctx,l,true);
    edgeThrough(ctx,r,false);
    ctx.closePath();
  }
  /* soft blobs stamped along a cubic with radius and alpha both ramped */
  function softRun(ctx, ps, r0, r1, a0, a1, color, steps) {
    var i,t,mt,x,y,r;
    for(i=0;i<=steps;i++){
      t=i/steps;mt=1-t;
      x=mt*mt*mt*ps[0][0]+3*mt*mt*t*ps[1][0]+3*mt*t*t*ps[2][0]+t*t*t*ps[3][0];
      y=mt*mt*mt*ps[0][1]+3*mt*mt*t*ps[1][1]+3*mt*t*t*ps[2][1]+t*t*t*ps[3][1];
      r=mixV2(r0,r1,t);
      softE(ctx,x,y,r,r*1.1,color,mixV2(a0,a1,t));
    }
  }
  /* The backdrop is only a gradient and a soft light behind the head.
     No arch, panel, or ruled lines: every drawn boundary inside the
     card read as a frame and took space from the face. */
  function paintCourtBackdrop(ctx, descriptor, width, height) {
    if(descriptor.transparent)return;
    var spec=descriptor.spec,figure=descriptor.frame==='figure';
    var gradient=ctx.createLinearGradient(0,0,0,height);
    /* the figure card stages darker (the reference's 22%/9% lightness
       against the bust's 29%/12%): most wardrobes are dark cloth, and
       on a midtone ground they read washed instead of rich */
    gradient.addColorStop(0,figure?'hsl('+spec.bgHue+',24%,22%)':spec.background.top);
    gradient.addColorStop(1,figure
      ?'hsl('+((spec.bgHue+22)%360)+',27%,9%)':spec.background.bottom);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    /* the halo hangs behind the head: mid-card on a bust, near the top
       on a standing figure - on the torso it reads as fog, not light */
    var glow=ctx.createRadialGradient(width/2,height*(figure?.17:.42),20,
      width/2,height*(figure?.19:.46),width*.72);
    glow.addColorStop(0,'rgba(238,220,174,'+(figure?.14:.10)+')');
    glow.addColorStop(1,'rgba(238,220,174,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  }
  /* A braid is a rope: a tapering mass with crossings laid inside it,
     bound off with a tie and an escaping tuft. Its centreline TRACKS the
     face silhouette - temple, cheek, jaw corner - then drops straight
     beside the neck, so it can neither stripe the cheek nor leave
     daylight where the face narrows. */
  function paintBraid(ctx, f, top, bottom, side, spec, u, q) {
    var len=Math.max(14*u,bottom-top);
    var wide=4.4*u;
    var pitch=wide*1.75;
    var steps=Math.max(3,Math.round(len/pitch));
    var N=steps*4+1,pts=[],half=[],i,t,yy,edge;
    for(i=0;i<N;i++){
      t=i/(N-1);
      yy=top+len*t;
      edge=faceEdgeAt(f,Math.min(yy,f.jawY+2*u),side);
      pts.push([edge+side*(1.6+Math.sin(t*2.6)*1.2)*u,yy]);
      half.push(wide*(.8+Math.sin(t*Math.PI)*.26)*(1-t*.38)*
        (1+Math.sin(t*steps*TAU-Math.PI*.5)*.2));
    }
    var x=pts[Math.floor(N/2)][0];
    fallPath(ctx,pts,half);
    ctx.fillStyle=cssV2(spec.hair.base);
    ctx.fill();
    ctx.save();
    ctx.clip();
    var g=ctx.createLinearGradient(x-spec.lightSide*wide*1.4,0,
      x+spec.lightSide*wide*1.4,0);
    g.addColorStop(0,cssV2(spec.hair.deep,.6));
    g.addColorStop(.6,cssV2(spec.hair.deep,0));
    g.addColorStop(1,cssV2(hairLit(spec,.22),.34));
    ctx.fillStyle=g;
    ctx.fillRect(x-wide*4,top-4*u,wide*8,len+14*u);
    for(i=0;i<steps;i++){
      t=(i+.5)/steps;
      var ci=clampV2(t*(N-1),0,N-1);
      var j=Math.floor(ci),fr=ci-j,j2=Math.min(j+1,N-1);
      var bx=mixV2(pts[j][0],pts[j2][0],fr);
      var by=mixV2(pts[j][1],pts[j2][1],fr);
      var h=wide*.9,alt=i&1?1:-1;
      fEll(ctx,bx,by,h*1.7,h*.95,
        alt>0?hairLit(spec,.2):rgbMixV2(spec.hair.base,spec.hair.deep,.55),
        .6,alt*side*.5);
      ink(ctx,.9*u,spec.hair.deep,.6,q);
      ctx.beginPath();
      ctx.moveTo(bx-h*2,by+h*.82-alt*h*.5);
      ctx.quadraticCurveTo(bx,by+h*1.02,bx+h*2,by+h*.82+alt*h*.5);
      ctx.stroke();
    }
    ctx.restore();
    fallPath(ctx,pts,half);
    ink(ctx,1.15*u,spec.hair.deep,.85,q);
    ctx.stroke();
    var tipX=pts[N-1][0],tipY=pts[N-1][1],th=half[N-1];
    for(i=-1;i<=1;i++){
      var drop=1-Math.abs(i)*.42;
      ink(ctx,(1.2-Math.abs(i)*.25)*u,spec.hair.base,.95,q);
      ctx.beginPath();
      ctx.moveTo(tipX+i*th*.38,tipY-th*.3);
      ctx.quadraticCurveTo(tipX+i*th*.8,tipY+th*.6*drop,
        tipX+i*th*1.15+side*th*.25,tipY+th*1.5*drop);
      ctx.stroke();
    }
    var tyY=tipY-th*.9;
    ink(ctx,3*u,spec.cloth.raw,1,q);
    ctx.beginPath();
    ctx.moveTo(tipX-th*1.25,tyY);ctx.lineTo(tipX+th*1.25,tyY);
    ctx.stroke();
    ink(ctx,.9*u,shadeV2(spec.cloth.raw,-.22),.8,q);
    ctx.beginPath();
    ctx.moveTo(tipX-th*1.15,tyY+1.3*u);ctx.lineTo(tipX+th*1.15,tyY+1.3*u);
    ctx.stroke();
  }
  function paintBackHair(ctx, scaffold, spec, q) {
    var f=scaffold.face,u=f.u,style=spec.hairStyle;
    if(style==='bald'||style==='receding'||style==='tonsure')return;
    if(style==='shoulderWaves'){
      var waveH=f.chinBottom-f.top;
      var waveBottom=Math.min(f.chinBottom+waveH*.38,
        q.bottom ? q.bottom-3*u : f.chinBottom+waveH*.38);
      ctx.beginPath();
      ctx.moveTo(f.crownX,f.top-5*u);
      ctx.bezierCurveTo(f.left-waveH*.12,f.top+waveH*.08,
        f.left-waveH*.15,f.jawY,f.left-waveH*.18,waveBottom);
      ctx.quadraticCurveTo(f.left+waveH*.02,waveBottom-waveH*.1,
        f.cx,waveBottom+waveH*.03);
      ctx.quadraticCurveTo(f.right-waveH*.02,waveBottom-waveH*.1,
        f.right+waveH*.18,waveBottom);
      ctx.bezierCurveTo(f.right+waveH*.15,f.jawY,
        f.right+waveH*.12,f.top+waveH*.08,f.crownX,f.top-5*u);
      ctx.closePath();
      fillStrokeA(ctx,rgbMixV2(spec.hair.base,spec.hair.deep,.46),
        spec.hair.deep,1.7*u,.9,q);
      var waveSide;
      for(waveSide=-1;waveSide<=1;waveSide+=2){
        ink(ctx,1.1*u,waveSide===spec.lightSide?hairLit(spec,.3):spec.hair.deep,
          .48,q);
        var waveIndex;
        for(waveIndex=0;waveIndex<3;waveIndex++){
          var waveX=f.cx+waveSide*(f.halfR*.65+waveIndex*4*u);
          ctx.beginPath();
          ctx.moveTo(waveX,f.top+8*u);
          ctx.bezierCurveTo(waveX+waveSide*8*u,f.eyeY,
            waveX-waveSide*5*u,f.jawY,
            waveX+waveSide*8*u,waveBottom-4*u);
          ctx.stroke();
        }
      }
    }
    if(style==='tiedBack'){
      var tailH=f.chinBottom-f.top;
      var tailTop=f.neckTop-7*u;
      var tailBottom=Math.min(f.collarY+tailH*.48,
        q.bottom ? q.bottom-3*u : f.collarY+tailH*.48);
      ctx.beginPath();
      ctx.moveTo(f.throatX-7*u,tailTop);
      ctx.bezierCurveTo(f.throatX-13*u,tailTop+tailH*.18,
        f.throatX-10*u,tailBottom-tailH*.12,f.throatX-3*u,tailBottom);
      ctx.quadraticCurveTo(f.throatX,tailBottom+5*u,
        f.throatX+3*u,tailBottom);
      ctx.bezierCurveTo(f.throatX+11*u,tailBottom-tailH*.12,
        f.throatX+14*u,tailTop+tailH*.18,f.throatX+7*u,tailTop);
      ctx.closePath();
      fillStrokeA(ctx,rgbMixV2(spec.hair.base,spec.hair.deep,.4),
        spec.hair.deep,1.5*u,.9,q);
      ink(ctx,1*u,hairLit(spec,.28),.5,q);
      ctx.beginPath();
      ctx.moveTo(f.throatX+spec.lightSide*2*u,tailTop+5*u);
      ctx.bezierCurveTo(f.throatX+spec.lightSide*5*u,tailTop+tailH*.2,
        f.throatX-spec.lightSide*3*u,tailBottom-tailH*.1,
        f.throatX,tailBottom-3*u);
      ctx.stroke();
      ink(ctx,4*u,spec.cloth.raw,1,q);
      ctx.beginPath();ctx.moveTo(f.throatX-8*u,tailTop+2*u);
      ctx.lineTo(f.throatX+8*u,tailTop+2*u);ctx.stroke();
    }
    if(style==='longLoose'){
      /* the fall waves: out past the temple, in at the jaw, out again
         over the shoulder, ending in locks rather than a hem */
      var hH=f.chinBottom-f.top;
      var botY=f.chinBottom+hH*.56;
      var sideOf=function (s) {
        var hw=s<0?f.halfL:f.halfR;
        return [
          [f.cx+s*hH*.07,f.top-hH*.075],
          [f.cx+s*(hw+hH*.05),f.top+f.upperFace*.38],
          [f.cx+s*(hw+hH*.175),f.eyeY+hH*.04],
          [f.cx+s*(hw+hH*.105),f.jawY+hH*.04],
          [f.cx+s*(hw+hH*.235),f.chinBottom+hH*.2],
          [f.cx+s*(hw+hH*.175),botY]
        ];
      };
      var hem=[
        [f.cx+hH*.155,botY+hH*.075],
        [f.cx+hH*.06,botY-hH*.035],
        [f.cx,botY+hH*.07],
        [f.cx-hH*.06,botY-hH*.035],
        [f.cx-hH*.155,botY+hH*.075]
      ];
      var lefts=sideOf(-1);
      lefts.reverse();
      ctx.beginPath();
      edgeThrough(ctx,sideOf(1),true);
      edgeThrough(ctx,hem,false);
      edgeThrough(ctx,lefts,false);
      ctx.closePath();
      fillStrokeA(ctx,rgbMixV2(spec.hair.base,spec.hair.deep,.55),
        shadeV2(spec.hair.deep,-.08),1.8*u,.9,q);
      ctx.save();
      ctx.clip();
      /* locks: a dark crease with its own lit ridge beside it */
      var s,k;
      for(s=-1;s<=1;s+=2){
        var hw2=s<0?f.halfL:f.halfR;
        for(k=0;k<3;k++){
          var o=hH*(.035+k*.058);
          var x0=f.cx+s*(hH*.1+o*.4),y0=f.top+hH*.03;
          var x1=f.cx+s*(hw2*.86+o),y1=f.eyeY+hH*.16;
          var x2=f.cx+s*(hw2*.78+o*1.3),y2=botY-hH*.05;
          var d=hH*.022;
          fade(ctx,1.6*u,spec.hair.deep,x0,y0,x2,y2,0,.08,.6,q);
          ctx.beginPath();
          ctx.moveTo(x0,y0);
          ctx.bezierCurveTo(x1,y1,x1+s*hH*.025,y1+hH*.2,x2,y2);
          ctx.stroke();
          fade(ctx,1.6*u,hairLit(spec,.34),x0+s*d,y0,x2+s*d,y2,0,.06,.5,q);
          ctx.beginPath();
          ctx.moveTo(x0+s*d,y0);
          ctx.bezierCurveTo(x1+s*d,y1,x1+s*(d+hH*.025),y1+hH*.2,x2+s*d,y2);
          ctx.stroke();
        }
      }
      softE(ctx,f.cx+spec.lightSide*f.halfR*.55,f.top+hH*.04,
        f.halfR*.8,hH*.1,hairLit(spec,.28),.34);
      softE(ctx,f.cx-spec.lightSide*(f.halfR+hH*.1),f.eyeY+hH*.2,
        hH*.14,hH*.38,spec.hair.deep,.45);
      ctx.restore();
    }
    if(style==='braids'){
      /* The ropes hang from BEHIND the head: drawn in the back pass and
         overlapping the silhouette, the head itself crops them, so they
         can neither detach from the face nor lie on it. Their lower
         fall tucks behind the shoulders like gathered hair does. */
      var hHb=f.chinBottom-f.top;
      paintBraid(ctx,f,f.eyeY-12*u,Math.min(f.torsoY+hHb*.24,282),-1,spec,u,q);
      paintBraid(ctx,f,f.eyeY-12*u,Math.min(f.torsoY+hHb*.24,282),1,spec,u,q);
    }
    if(style==='bun'){
      fEll(ctx,f.crownX,f.top-7*u,12*u,10*u,spec.hair.deep);
      ink(ctx,1.5*u,shadeV2(spec.hair.deep,-.08),.8,q);
      ctx.beginPath();
      ctx.ellipse(f.crownX,f.top-7*u,12*u,10*u,0,0,TAU);
      ctx.stroke();
      ink(ctx,1*u,spec.hair.base,.8,q);
      ctx.beginPath();
      ctx.ellipse(f.crownX,f.top-7*u,9*u,7.2*u,.45,TAU*.04,TAU*.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(f.crownX,f.top-7*u,9.5*u,7*u,-.4,TAU*.52,TAU*.96);
      ctx.stroke();
      ink(ctx,.9*u,spec.hair.light,.6,q);
      ctx.beginPath();
      ctx.arc(f.crownX-spec.lightSide*3*u,f.top-9*u,3.2*u,Math.PI*.8,Math.PI*1.9);
      ctx.stroke();
    }
  }
  function paintBustBody(ctx, f, spec, descriptor) {
    var bottom=294;
    var base=spec.cloth.base,deep=spec.cloth.deep;
    var bodyItem=descriptor.loadout.body;
    if(bodyItem){
      /* worn armor recolors the visible shoulder band; nothing is
         pasted over it */
      var bc=hexToRgbV2(pickArt(bodyItem,['cloths','leathers'],'#5b402b',2));
      if(bc){base=cssV2(bc);deep=cssV2(shadeV2(bc,-.22));}
    }
    traceShoulders(ctx,f,bottom);
    fillStroke(ctx,base,deep,2);
    ctx.strokeStyle=spec.cloth.light;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(f.throatX-f.neckBaseW,f.collarY);
    ctx.quadraticCurveTo(f.throatX,f.collarY+18,f.throatX+f.neckBaseW,f.collarY);ctx.stroke();
    if(spec.tier>=3){
      ctx.strokeStyle=spec.cloth.trim;ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(f.throatX-f.neckBaseW-2,f.collarY+3);
      ctx.quadraticCurveTo(f.throatX,f.collarY+22,f.throatX+f.neckBaseW+2,f.collarY+3);ctx.stroke();
    }else{
      ctx.strokeStyle=spec.cloth.culture;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(f.throatX-f.neckBaseW-4,f.collarY+12);
      ctx.lineTo(f.throatX+f.neckBaseW+4,f.collarY+12);ctx.stroke();
    }
  }
  function paintNeck(ctx, f, spec, q) {
    var u=f.u,top=f.neckTop,bot=f.neckBottom;
    function neckPath() {
      ctx.beginPath();
      ctx.moveTo(f.throatX-f.neckTopW,top);
      ctx.bezierCurveTo(f.throatX-f.neckTopW-1*u,top+5*u,
        f.throatX-f.neckBaseW,bot-7*u,f.throatX-f.neckBaseW,bot);
      ctx.lineTo(f.throatX+f.neckBaseW,bot);
      ctx.bezierCurveTo(f.throatX+f.neckBaseW,bot-7*u,
        f.throatX+f.neckTopW+1*u,top+5*u,f.throatX+f.neckTopW,top);
      ctx.closePath();
    }
    neckPath();
    fillStrokeA(ctx,shadeV2(spec.skin.base,-.03),spec.skin.line,1.5*u,.65,q);
    ctx.save();
    neckPath();
    ctx.clip();
    ctx.globalAlpha=.3;
    ctx.fillStyle=cssV2(spec.skin.shadow);
    if(spec.lightSide>0)ctx.fillRect(f.throatX-f.neckBaseW,top,f.neckBaseW,bot-top);
    else ctx.fillRect(f.throatX,top,f.neckBaseW,bot-top);
    ctx.globalAlpha=1;
    /* the chin casts onto the throat, which is what seats the head ON
       the neck instead of in front of it */
    softE(ctx,f.throatX,f.chinBottom+3*u,f.chinSpan*1.5,4.5*u,
      spec.skin.deep,.26);
    ctx.restore();
  }
  /* Three marks carry an ear at this size: the helix rolling over the
     top, the antihelix answering inside, and the lobe. */
  function paintEars(ctx, scaffold, spec, q) {
    var f=scaffold.face,a=scaffold.anchors,u=f.u,i;
    var ears=[a.earL,a.earR];
    for(i=0;i<2;i++){
      var ear=ears[i];
      var side=i===0?-1:1;
      var far=i===(spec.lightSide>0?0:1);
      var ex=ear[0],ey=ear[1]+2*u;
      var rw=5.4*u*spec.earSize,rh=9.6*u*spec.earSize;
      ctx.beginPath();
      ctx.moveTo(ex-side*rw*.5,ey-rh);
      ctx.bezierCurveTo(ex+side*rw*.9,ey-rh*1.05,
        ex+side*rw*1.25,ey-rh*.1,ex+side*rw*.62,ey+rh*.52);
      ctx.bezierCurveTo(ex+side*rw*.34,ey+rh*.95,
        ex-side*rw*.5,ey+rh*1.02,ex-side*rw*.62,ey+rh*.5);
      ctx.bezierCurveTo(ex-side*rw*.72,ey,
        ex-side*rw*.8,ey-rh*.6,ex-side*rw*.5,ey-rh);
      ctx.closePath();
      fillStrokeA(ctx,far?spec.skin.shadow:spec.skin.base,
        spec.skin.line,1.4*u,.72,q);
      ink(ctx,1.05*u,spec.skin.deep,.4,q);
      ctx.beginPath();
      ctx.moveTo(ex-side*rw*.18,ey-rh*.74);
      ctx.bezierCurveTo(ex+side*rw*.6,ey-rh*.74,
        ex+side*rw*.78,ey-rh*.1,ex+side*rw*.3,ey+rh*.4);
      ctx.stroke();
      ink(ctx,.85*u,spec.skin.deep,.3,q);
      ctx.beginPath();
      ctx.moveTo(ex-side*rw*.1,ey-rh*.3);
      ctx.quadraticCurveTo(ex+side*rw*.3,ey-rh*.05,
        ex+side*rw*.1,ey+rh*.3);
      ctx.stroke();
      softE(ctx,ex+side*rw*.1,ey-rh*.1,rw*.5,rh*.3,spec.skin.shadow,.3);
      softE(ctx,ex-side*rw*.32,ey+rh*.62,rw*.42,rh*.26,
        spec.skin.lit,far?.1:.26);
    }
  }
  /* The terminator where the head turns out of the key: it runs off the
     brow ridge, in over the cheekbone and out again at the jaw. */
  function shadowSidePath(ctx, f, spec) {
    var u=f.u,s=spec.lightSide>0?-1:1;
    var out=spec.lightSide>0?f.left-18*u:f.right+18*u;
    var push=10*u;
    ctx.beginPath();
    ctx.moveTo(f.cx-s*push+s*1*u,f.top-4*u);
    ctx.bezierCurveTo(f.cx-s*push+s*8*u,f.eyeY-12*u,
      f.cx-s*push+s*6*u,f.jawY,
      f.chinX-s*push*.55+s*1*u,f.chinY+7*u);
    ctx.lineTo(out,f.chinY+10*u);
    ctx.lineTo(out,f.top-12*u);
    ctx.closePath();
  }
  function paintHead(ctx, scaffold, spec, q) {
    var f=scaffold.face,u=f.u,lx=spec.lightSide;
    headPath(ctx,f);
    fillStrokeA(ctx,spec.skin.base,spec.skin.line,1.8*u,.72,q);
    ctx.save();
    headPath(ctx,f);
    ctx.clip();
    /* the terminator is a band, not a line: the tone crosses it as a
       ramp, and the ground bounces light back into the far silhouette */
    var push=10*u,start=f.cx+lx*push;
    var far=lx>0?f.left-6*u:f.right+6*u;
    var ramp=ctx.createLinearGradient(start,0,mixV2(start,far,.62),0);
    ramp.addColorStop(0,cssV2(spec.skin.shadow,0));
    ramp.addColorStop(.78,cssV2(spec.skin.shadow,.4));
    ramp.addColorStop(1,cssV2(spec.skin.shadow,.34));
    ctx.fillStyle=ramp;
    shadowSidePath(ctx,f,spec);
    ctx.fill();
    softE(ctx,far+lx*9*u,f.eyeY+f.lowerFace*.28,7*u,f.lowerFace*.42,
      spec.skin.lit,.1);
    softE(ctx,f.cx+lx*12*u,f.eyeY-16*u,20*u,12*u,spec.skin.lit,.38);
    softE(ctx,f.cx+lx*15*u,f.eyeY+18*u,9*u,7*u,spec.skin.blush,.22);
    ctx.restore();
  }
  /* The cheek is three planes, not one blush blob: the bone lit from
     above, the hollow beneath it, and the apple carrying the blush. */
  function paintFaceStructure(ctx, scaffold, spec, q) {
    var f=scaffold.face,a=scaffold.anchors,u=f.u;
    var lx=spec.lightSide,cheekY=f.eyeY+17*u;
    var shadeEye=lx>0?a.eyeL:a.eyeR;
    var gaunt=clampV2(.55-f.cheekT*.5+spec.elder*.45,0,1);
    var side,eye,litSide,blushA;
    ctx.save();
    headPath(ctx,f);
    ctx.clip();
    softE(ctx,shadeEye[0],f.eyeY+4*u,(13+f.cheekT*3)*u,8*u,
      spec.skin.deep,.2+f.cheekT*.1);
    for(side=-1;side<=1;side+=2){
      eye=side<0?a.eyeL:a.eyeR;
      litSide=(side<0)===(lx<0);
      softE(ctx,eye[0]+side*4*u,f.eyeY+10*u,(10+f.cheekT*4)*u,5*u,
        spec.skin.lit,(litSide?.3:.14)*(spec.child?.55:1),-side*.42);
      softE(ctx,eye[0]+side*7.5*u,f.eyeY+19*u,8.5*u,5.5*u,
        spec.skin.shadow,.08+gaunt*.18,side*.3);
      blushA=spec.health==='hale'
        ? .1+f.cheekT*.1+(spec.female?.07:0)+(spec.child?.15:0) : 0;
      if(blushA>0){
        softE(ctx,eye[0]+side*1.5*u,cheekY+1*u,(6+f.cheekT*3.5)*u,4.2*u,
          spec.skin.blush,Math.min(.4,blushA));
      }
    }
    softE(ctx,f.cx+lx*3*u,f.eyeY-13*u,14*u,6*u,
      spec.skin.lit,.18+spec.browWeight*.05);
    softE(ctx,f.chinX,f.chinY-2*u,f.chinSpan,4*u,
      f.jawT>.55?spec.skin.shadow:spec.skin.lit,.2);
    /* the temples turn back at the hairline; a child's face carries
       half the structure or the marks read as bruising */
    var soft=spec.child?.5:1;
    softE(ctx,f.left+7*u,f.eyeY-15*u,7*u,10*u,spec.skin.shadow,.1*soft);
    softE(ctx,f.right-7*u,f.eyeY-15*u,7*u,10*u,spec.skin.shadow,.1*soft);
    if(q.fine&&!spec.child){
      /* skin grain: a sparse scatter of pores over cheek and brow */
      var gr=streamV2(spec.identity,'grain'),gi,gx,gy;
      ctx.fillStyle=cssV2(spec.skin.deep,.07);
      for(gi=0;gi<16;gi++){
        gx=f.cx+(gr()-.5)*(f.right-f.left)*.72;
        gy=f.eyeY+(gr()*1.4-.5)*f.lowerFace*.55;
        if(gr()<.3)gy=f.eyeY-f.upperFace*(.2+gr()*.3);
        ctx.beginPath();
        ctx.arc(gx,gy,(.45+gr()*.4)*u,0,TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    /* nasolabial folds arrive with age, faintly from thirty on */
    if((spec.elder>.05||spec.age>=30)&&!spec.child&&q.fine){
      ink(ctx,.8*u,spec.skin.deep,.08+spec.elder*.2,q);
      for(side=-1;side<=1;side+=2){
        ctx.beginPath();
        ctx.moveTo(a.noseBase[0]+side*5.5*u,a.noseBase[1]-1*u);
        ctx.quadraticCurveTo(a.noseBase[0]+side*10*u,f.mouthY-4*u,
          f.mouthX+side*(f.right-f.left)*.14,f.mouthY+4*u);
        ctx.stroke();
      }
    }
    /* the cheekbone shows where it turns hardest, under the outer eye,
       and is gone long before the jaw */
    for(side=-1;side<=1;side+=2){
      eye=side<0?a.eyeL:a.eyeR;
      var jaw=side<0?f.jawL:f.jawR;
      var x0=eye[0]+side*7*u,y0=f.eyeY+7*u;
      var x1=jaw-side*3*u,y1=f.jawY-7*u;
      fade(ctx,.8*u,spec.skin.line,x0,y0,x1,y1,.04,.03,
        (.16+f.cheekT*.22)*(spec.child?.45:1),q);
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.quadraticCurveTo(eye[0]+side*(12+f.cheekT*3)*u,cheekY,x1,y1);
      ctx.stroke();
    }
    if(f.jawT>.56){
      /* the crease dies at both ends and stays low on the chin: run
         jaw-corner to jaw-corner at even weight it read as a wire
         strung under the mouth */
      fade(ctx,1*u,spec.skin.deep,f.jawL,f.jawY,f.jawR,f.jawY,
        0,0,.18+f.jawT*.1,q);
      ctx.beginPath();
      ctx.moveTo(mixV2(f.jawL,f.chinX,.3),f.jawY+2*u);
      ctx.quadraticCurveTo(f.chinX,f.chinY+2*u,
        mixV2(f.jawR,f.chinX,.3),f.jawY+2*u);
      ctx.stroke();
    }
  }
  function beginIntent(ctx, it) {
    ctx.save();
    ctx.globalAlpha*=it.visibility===undefined?1:it.visibility;
    if(it.angle){
      ctx.translate(it.x,it.y);
      ctx.rotate(it.angle);
      ctx.translate(-it.x,-it.y);
    }
  }
  function dist2(a, b) {
    var dx=a[0]-b[0],dy=a[1]-b[1];
    return Math.sqrt(dx*dx+dy*dy);
  }
  /* Feature intents: placement from the projected anchors, sizes stated
     against the face, and the small-head stylisation (q.grow) applied
     once here so every feature agrees. */
  function featureIntents(scaffold, spec, q) {
    var f=scaffold.face,a=scaffold.anchors,lm=scaffold.landmarks,u=f.u;
    var faceW=f.right-f.left,lowerFace=f.chinBottom-f.eyeY;
    var open=spec.health==='dying'?.34
      :1-.14*spec.elder-.12*Math.max(0,spec.expression);
    var expression=spec.expression,grow=q.grow;
    /* Graying is capped: a white-haired elder still needs brows the
       viewer can find, and a child's brows are down, not grown. */
    var browColor=rgbMixV2(
      spec.child?shadeV2(spec.hair.deep,.1):spec.hair.deep,
      [200,196,186],Math.min(.5,spec.hair.gray*.6));
    var browW=spec.browWeight*(spec.child?.55:1);
    function eyeIntent(side, point, outer, frame) {
      var width=Math.max(2*u,dist2(point,outer)*1.06);
      return {side:side,x:point[0],y:point[1],w:width,h:width*.58*open,
        lash:spec.female&&!spec.child,angle:frame?frame.angle:0,
        visibility:frame?frame.visibility:1};
    }
    var eyes=[eyeIntent(-1,a.eyeL,a.eyeLout,lm.eyeL),
      eyeIntent(1,a.eyeR,a.eyeRout,lm.eyeR)];
    var eyeMid=clampV2((eyes[0].x+eyes[1].x)*.5,
      f.cx-faceW*.055,f.cx+faceW*.055);
    var spacingT=clampV2((spec.eyeSpacing-.85)/.3,0,1);
    var eyeHalfGap=faceW*(.17+spacingT*.045);
    var eyeTilt=clampV2((eyes[1].y-eyes[0].y)*.5,-2.2*u,2.2*u);
    var eyeY=clampV2((eyes[0].y+eyes[1].y)*.5,f.eyeY-1.5*u,f.eyeY+1.5*u);
    eyes[0].x=eyeMid-eyeHalfGap;eyes[1].x=eyeMid+eyeHalfGap;
    eyes[0].y=eyeY-eyeTilt;eyes[1].y=eyeY+eyeTilt;
    var i;
    for(i=0;i<2;i++){eyes[i].w*=grow;eyes[i].h*=grow;eyes[i].faceW=faceW;}
    var brows=[];
    for(i=0;i<2;i++){
      var eye=eyes[i],browFrame=i?lm.browR:lm.browL;
      brows.push({side:i?1:-1,x:eye.x,
        y:eye.y-clampV2(eye.h*1.55+browW*1.3*u,
          eye.h*1.3,faceW*.125)-Math.max(0,expression)*1.8*u,
        len:clampV2(eye.w*1.28,5.5*u,faceW*.145),
        weight:browW,
        innerDy:(expression<0?-expression*3.4:-expression*.9)*u,
        color:browColor,angle:browFrame?browFrame.angle:0,
        visibility:browFrame?browFrame.visibility:1});
    }
    var noseMinY=eyeY+lowerFace*.32,noseMaxY=eyeY+lowerFace*.50;
    var nose={
      x:clampV2(a.noseBase[0],eyeMid-faceW*.055,eyeMid+faceW*.055),
      y:clampV2(a.noseBase[1],noseMinY,noseMaxY),
      w:Math.max(2*u,(eyes[0].w+eyes[1].w)*.5*.72*spec.noseW)*
        (spec.child?.82:1),
      flare:spec.health==='dying'?1.15:1,
      bridgeY:eyeY+faceW*.016,minY:noseMinY,maxY:noseMaxY,faceW:faceW,
      angle:lm.noseBase?lm.noseBase.angle:0,
      visibility:1};
    nose.tip=[clampV2(a.noseTip[0],nose.x-faceW*.03,nose.x+faceW*.03),
      clampV2(a.noseTip[1],noseMinY,noseMaxY)];
    var mouthWidth=Math.max(3*u,dist2(a.mouthL,a.mouthR)*.56);
    var mouth={
      x:clampV2(a.mouth[0],f.chinX-faceW*.045,f.chinX+faceW*.045),
      y:clampV2(a.mouth[1],eyeY+lowerFace*.63,eyeY+lowerFace*.78),
      w:clampV2(mouthWidth*grow,faceW*.105,faceW*.175),
      cornerDy:(-expression*3+(spec.health==='dying'?2.4:0))*u,
      loH:Math.max(1.8*u,mouthWidth*.32*spec.lipFull*(1-spec.elder*.3)),
      painted:(spec.female||spec.lipFull>1.08)&&!spec.child,
      faceW:faceW,angle:lm.mouth?lm.mouth.angle:0,
      visibility:lm.mouth?lm.mouth.visibility:1};
    return {eyes:eyes,brows:brows,nose:nose,mouth:mouth,u:u};
  }
  /* Eyes carry the portrait; the four shapes are four constructions:
     round, almond, hooded, upturned. The iris is a third of the eye
     across, drawn inside the aperture clip so the lids crop it. */
  function illusEyes(ctx, spec, eyes, u, q) {
    var sizeT=clampV2((spec.eyeSize-.8)/.45,0,1);
    var shape=spec.eyeShape,i;
    for(i=0;i<eyes.length;i++){
      var e=eyes[i];
      beginIntent(ctx,e);
      var fw=e.faceW||61;
      var w=clampV2(e.w*(.76+sizeT*.4),fw*.072,fw*.131);
      if(shape===1)w*=1.14;
      if(shape===2)w*=.95;
      var h=clampV2(e.h*(.62+sizeT*.34),fw*.039,fw*.075);
      h*=shape===0?1.22:shape===1?.9:shape===2?.78:.88;
      if(shape===2)h=Math.max(h,3.2*u);
      var asym=spec.asymmetry*e.side*18*u;
      var ix=e.x-e.side*w,ox=e.x+e.side*w;
      var iy=e.y+e.side*asym+h*(shape===3?.3:.12);
      var oy=e.y-e.side*asym+
        (shape===3?-h*.55:shape===2?h*.34:-h*.08);
      var apexX=e.x+e.side*w*(shape===1||shape===3?.22:0);
      var topC=shape===2?h*.82:shape===0?h*1.18:
        shape===3?h*1.12:h*1.02;
      var botC=shape===0?h*.95:h*.62;
      var botX=e.x+e.side*w*(shape===3?.4:.05);
      /* on a coarse head the socket wash muddies the eye it frames */
      softE(ctx,e.x,e.y+.4*u,w*1.15,h*1.45,
        spec.skin.shadow,(shape===2?.22:.15)*(q.fine?1:.55));
      var aperture=function () {
        ctx.beginPath();
        ctx.moveTo(ix,iy);
        ctx.quadraticCurveTo(apexX,e.y-topC,ox,oy);
        ctx.quadraticCurveTo(botX,e.y+botC,ix,iy);
        ctx.closePath();
      };
      aperture();
      ctx.fillStyle=cssV2([238,231,214]);
      ctx.fill();
      ctx.save();
      aperture();
      ctx.clip();
      /* the white is not white: it turns away at both corners */
      softE(ctx,apexX,e.y-h*.62,w*.85,h*.55,
        spec.skin.shadow,shape===2?.22:.13);
      softE(ctx,ix+e.side*w*.16,e.y,w*.34,h*.8,spec.skin.shadow,.16);
      softE(ctx,ox-e.side*w*.2,e.y,w*.3,h*.8,spec.skin.shadow,.12);
      var iris=clampV2(w*(.36+sizeT*.05),fw*.031,fw*.066);
      var icx=e.x+e.side*w*(shape===3?.06:0);
      var icy=e.y+(shape===2?h*.3:h*.12);
      fEll(ctx,icx,icy,iris,iris,shadeV2(spec.eye,-.34),.96);
      fEll(ctx,icx,icy,iris*.86,iris*.86,spec.eye,.98);
      fEll(ctx,icx-spec.lightSide*iris*.2,icy+iris*.2,
        iris*.58,iris*.5,shadeV2(spec.eye,.13),.75);
      fEll(ctx,icx,icy,iris*.38,iris*.38,[26,20,20]);
      /* the catchlight rides the wet surface, set against the key */
      fEll(ctx,icx+spec.lightSide*iris*.46,icy-iris*.44,
        iris*.26+.2*u,iris*.24+.2*u,[252,247,231],.96);
      ctx.restore();
      if(shape===2){
        /* a hooded lid is a fold of skin drawn over the iris */
        ctx.beginPath();
        ctx.moveTo(ix-.4*u,iy-.8*u);
        ctx.quadraticCurveTo(apexX,e.y-h*1.5,ox+.6*u,oy-1*u);
        ctx.quadraticCurveTo(apexX+e.side*u,e.y-h*.44,ix,iy+.2*u);
        ctx.closePath();
        ctx.fillStyle=cssV2(shadeV2(spec.skin.base,-.045),.97);
        ctx.fill();
        ink(ctx,.8*u,spec.skin.deep,.5,q);
        ctx.beginPath();
        ctx.moveTo(ix,iy-.4*u);
        ctx.quadraticCurveTo(apexX+e.side*.5*u,e.y-h*.5,ox+.4*u,oy-.8*u);
        ctx.stroke();
      }
      /* the lash line is a mass: nothing at the tear duct, weight over
         the outer half, dying at the corner or running on as a wing */
      var wing=shape===1||shape===3?w*.22:0;
      var lashW=(e.lash?.95:.68)*u+w*.08;
      var LS=12,lp=[],lh=[],li,lt,hw;
      for(li=0;li<LS;li++){
        lt=li/(LS-1);
        hw=lashW*(.16+.84*Math.sin(Math.PI*Math.pow(lt,.78)));
        lp.push([qPt(ix,apexX,ox,lt),qPt(iy,e.y-topC,oy,lt)-hw*.32]);
        lh.push(hw);
      }
      if(wing){
        lp.push([ox+e.side*wing,oy-h*.3]);
        lh.push(lashW*.22);
      }
      ribbonPath(ctx,lp,lh);
      ctx.fillStyle=cssV2(e.lash?spec.hair.deep:spec.skin.line,.88);
      ctx.fill();
      /* the lower lid is a lit margin with its own shadow beneath */
      fade(ctx,.58*u,spec.skin.lit,ix,iy+.5*u,ox,oy+.6*u,.04,.06,.18,q);
      ctx.beginPath();
      ctx.moveTo(ix+e.side*w*.3,iy+.5*u);
      ctx.quadraticCurveTo(botX,e.y+botC+.8*u,ox-e.side*w*.2,oy+.6*u);
      ctx.stroke();
      if(q.fine){
        /* the under-shadow is one mark too many on a coarse head */
        ink(ctx,.65*u,spec.skin.deep,.42,q);
        ctx.beginPath();
        ctx.moveTo(ix+e.side*w*.36,iy+1.6*u);
        ctx.quadraticCurveTo(botX,e.y+botC+2.1*u,ox-e.side*w*.24,oy+1.5*u);
        ctx.stroke();
      }
      if(e.lash&&q.fine){
        ink(ctx,.62*u,spec.hair.deep,.7,q);
        for(li=0;li<3;li++){
          lt=.56+li*.17;
          var lx0=qPt(ix,apexX,ox,lt);
          var ly0=qPt(iy,e.y-topC,oy,lt)-lashW*.5;
          ctx.beginPath();
          ctx.moveTo(lx0,ly0);
          ctx.quadraticCurveTo(lx0+e.side*(.7+li*.2)*u,ly0-.9*u,
            lx0+e.side*(1.4+li*.35)*u,ly0-(1.5+li*.25)*u);
          ctx.stroke();
        }
      }
      /* the crease follows the lid rather than floating above it */
      if(shape!==2&&w>fw*.072&&q.fine){
        fade(ctx,.65*u,spec.skin.deep,ix,iy-2*u,ox,oy-1.8*u,.06,.1,.34,q);
        ctx.beginPath();
        ctx.moveTo(ix+e.side*w*.18,iy-1.9*u-lashW);
        ctx.quadraticCurveTo(apexX,e.y-topC-1.8*u-lashW,
          ox-e.side*w*.1,oy-1.6*u-lashW*.6);
        ctx.stroke();
      }
      ctx.fillStyle=cssV2(spec.skin.blush,.55);
      ctx.beginPath();
      ctx.arc(ix+e.side*.4*u,iy+.2*u,.72*u,0,TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  /* Brows are tapered ribbons; the three kinds are arched, swept, and
     the soldier's bar. The head sits inboard, the tail runs out. */
  function illusBrows(ctx, spec, brows, u, q) {
    var kind=spec.browKind,SAMPLES=13,i;
    for(i=0;i<brows.length;i++){
      var b=brows[i];
      beginIntent(ctx,b);
      var th=(.95+b.weight*1.5)*u;
      var hx=b.x-b.side*b.len*.82,hy=b.y+b.innerDy;
      var tx=b.x+b.side*b.len*(kind===2?1.08:1.18);
      var peakT=kind===1?.66:kind===0?.56:.44;
      var rise=(kind===2?1.15:clampV2(1.7+b.weight*1.1,1.7,2.9))*u;
      var drop=(kind===0?1.3:kind===1?.9:.45)*u;
      var taper=kind===2?.72:.8;
      var pts=[],half=[],s,t,y;
      for(s=0;s<SAMPLES;s++){
        t=s/(SAMPLES-1);
        if(t<=peakT){
          var tt=t/peakT;
          y=hy-rise*(kind===1?tt:smoothV2(0,1,tt));
        }else{
          y=hy-rise+drop*smoothV2(0,1,(t-peakT)/(1-peakT));
        }
        pts.push([mixV2(hx,tx,t),y]);
        half.push(th*(1-taper*Math.pow(t,1.25))*
          (kind===2?1.12:1)*clampV2(.66+t*5,0,1));
      }
      softE(ctx,mixV2(hx,tx,.5),hy+th+1.4*u,
        b.len*.8,th*1.2,spec.skin.shadow,.12+b.weight*.08);
      ribbonPath(ctx,pts,half);
      ctx.fillStyle=cssV2(b.color,.93);
      ctx.fill();
      /* the head is roughened by its own hairs */
      ink(ctx,.42*u,shadeV2(b.color,b.weight>.6?-.1:.1),.2+b.weight*.2,q);
      var hi;
      for(hi=0;hi<3;hi++){
        var hgi=Math.round((hi/2)*.18*(SAMPLES-1));
        var hpx=pts[hgi][0]-b.side*.4*u;
        var hpy=pts[hgi][1];
        ctx.beginPath();
        ctx.moveTo(hpx,hpy+half[hgi]*.7);
        ctx.quadraticCurveTo(hpx+b.side*.25*u,hpy,
          hpx+b.side*.8*u,hpy-half[hgi]*.8);
        ctx.stroke();
      }
      if(b.weight>.55&&q.fine){
        ink(ctx,.38*u,shadeV2(b.color,.2),.16,q);
        for(hi=0;hi<2;hi++){
          var g0=Math.round((.22+hi*.1)*(SAMPLES-1));
          var g1=Math.round((.66+hi*.14)*(SAMPLES-1));
          var gm=Math.round((g0+g1)*.5);
          var gy=hi?.42:-.42;
          ctx.beginPath();
          ctx.moveTo(pts[g0][0],pts[g0][1]+gy*half[g0]);
          ctx.quadraticCurveTo(pts[gm][0],pts[gm][1]+gy*half[gm],
            pts[g1][0],pts[g1][1]+gy*half[g1]*.6);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  /* A nose seen head-on has no outline: a plane turned away from the
     key, a lit ridge, a base that catches its own shadow, and one drawn
     edge that fades out before the brow. Four kinds: straight, aquiline,
     snub, broad. */
  function illusNose(ctx, spec, it, u, q) {
    beginIntent(ctx,it);
    var faceW=it.faceW||96;
    var wideT=clampV2((spec.noseW-.7)/.7,0,1);
    var kind=spec.noseKind;
    /* a child's nose is a suggestion, not a construction site; on a
       small head the marks push harder so the nose survives at all */
    var mk=spec.child?.6:1;
    var ab=clampV2(1+(q.bold-1)*.5,1,1.6);
    var lx=spec.lightSide,sx=-lx;
    var cx=it.x;
    var rootY=it.bridgeY+faceW*.04;
    var kindLen=kind===2?.84:kind===1?1.07:1;
    var baseY=clampV2(it.bridgeY+(it.tip[1]-it.bridgeY)*kindLen,
      it.minY,it.maxY);
    var len=Math.max(faceW*.19,baseY-rootY);
    var ala=clampV2(it.w*1.5,faceW*.068,faceW*.118);
    ala*=kind===3?1.15:kind===2?1.06:kind===1?.92:1;
    var bridgeHalf=ala*(kind===3?.54:kind===2?.40:.45);
    var ballY=baseY-ala*.20;
    var bh=bridgeHalf/ala;
    var pinch=kind===1?.96:kind===3?.84:kind===2?.7:.74;
    var bow=kind===1?.58:kind===3?.82:kind===2?.78:.7;
    var edge=[
      [cx+sx*ala*bh*.86,rootY],
      [cx+sx*ala*bh*pinch,rootY+len*.34],
      [cx+sx*ala*bow,baseY-len*.26],
      [cx+sx*ala*.86,baseY-ala*.32]
    ];
    softE(ctx,cx+sx*bridgeHalf*.5,rootY-2*u,
      bridgeHalf*1.4,3.4*u,spec.skin.shadow,.15);
    softRun(ctx,[
      [edge[0][0]-sx*.4*u,edge[0][1]+len*.08],
      [edge[1][0]-sx*1*u,edge[1][1]],
      [edge[2][0]-sx*1.4*u,edge[2][1]],
      [edge[3][0]-sx*1.5*u,edge[3][1]+ala*.12]
    ],bridgeHalf*.5,ala*.5,.05*mk,(.09+wideT*.02)*mk,spec.skin.shadow,9);
    softRun(ctx,[
      [cx+lx*bridgeHalf*.2,rootY+len*.2],
      [cx+lx*bridgeHalf*.28,mixV2(rootY,ballY,.45)],
      [cx+lx*bridgeHalf*.34,mixV2(rootY,ballY,.78)],
      [cx+lx*ala*.2,ballY-ala*.06]
    ],1.3*u,ala*.34,.07,.2,spec.skin.lit,7);
    softE(ctx,cx+sx*ala*.12,baseY+ala*.40,ala*1.0,ala*.30,
      spec.skin.shadow,.24*mk);
    softE(ctx,cx+sx*ala*.18,ballY+ala*.16,ala*.46,ala*.34,
      spec.skin.shadow,.14*mk);
    softE(ctx,cx+lx*ala*.17,ballY-ala*.10,ala*.48,ala*.40,
      spec.skin.lit,.30);
    var wingY=baseY+ala*.06;
    var nSep=ala*(kind===3?.55:.49);
    var nRx=ala*(kind===2?.24:.2);
    var nRy=ala*(kind===2?.2:.13);
    var s;
    for(s=-1;s<=1;s+=2){
      var dark=s===sx;
      var flare=(kind===3?1.1:kind===2?1.05:1)*it.flare;
      var ox=cx+s*ala*flare;
      var x0=cx+s*ala*.4,y0=baseY-ala*.44;
      var x1=cx+s*ala*.4,y1=wingY+ala*.24;
      softE(ctx,cx+s*ala*.66,baseY-ala*.18,ala*.34,ala*.3,
        spec.skin.lit,dark?.1:.26);
      fade(ctx,1*u,spec.skin.line,x0,y0,x1,y1,.08,.12,
        Math.min(.92,(dark?.72:.4)*ab),q);
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.quadraticCurveTo(ox+s*ala*.05,baseY-ala*.26,ox,wingY+ala*.04);
      ctx.quadraticCurveTo(ox-s*ala*.18,y1,x1,y1);
      ctx.stroke();
      softE(ctx,cx+s*ala*.84,wingY+ala*.2,ala*.3,ala*.22,
        spec.skin.shadow,dark?.2:.11);
      fEll(ctx,cx+s*nSep,wingY,nRx,nRy,
        spec.skin.deep,Math.min(.9,(kind===2?.82:.76)*ab)*mk,
        s*(kind===2?.18:.5));
    }
    if(kind!==2){
      softE(ctx,cx,baseY+ala*(kind===1?.30:.20),
        ala*.18,ala*(kind===1?.26:.16),spec.skin.deep,
        (kind===1?.42:.22)*mk);
    }
    /* the one drawn edge is the mark that carries the nose: it fades in
       from the brow but arrives at real ink by the wing */
    fade(ctx,(1.05+wideT*.3)*u,spec.skin.line,
      edge[0][0],edge[0][1],edge[3][0],edge[3][1],.06,
      Math.min(.9,.72*ab)*mk,undefined,q);
    ctx.beginPath();
    ctx.moveTo(edge[0][0],edge[0][1]);
    ctx.bezierCurveTo(edge[1][0],edge[1][1],edge[2][0],edge[2][1],
      edge[3][0],edge[3][1]);
    ctx.stroke();
    ctx.restore();
  }
  /* The mouth: the upper lip rises in two peaks with the cupid's bow
     dipped between them, the lower lip one full lobe with its own light
     band, and the vermillion border is the one drawn edge. */
  function illusMouth(ctx, spec, it, u, q) {
    beginIntent(ctx,it);
    var widthT=clampV2((spec.mouthW-.8)/.4,0,1);
    var fullT=clampV2((spec.lipFull-.6)/.8,0,1);
    var w=clampV2(it.w*(.84+widthT*.26),it.faceW*.11,it.faceW*.17);
    var upper=w*(.115+fullT*.275);
    var lower=Math.max(w*.16,it.loH*(.55+fullT*.68));
    var cy=it.y+it.cornerDy;
    function lipOutline(innerBottom) {
      ctx.beginPath();
      ctx.moveTo(it.x-w,cy);
      ctx.quadraticCurveTo(it.x-w*.62,it.y-upper*.62,
        it.x-w*.3,it.y-upper);
      ctx.quadraticCurveTo(it.x-w*.12,it.y-upper*1.04,
        it.x,it.y-upper*.34);
      ctx.quadraticCurveTo(it.x+w*.12,it.y-upper*1.04,
        it.x+w*.3,it.y-upper);
      ctx.quadraticCurveTo(it.x+w*.62,it.y-upper*.62,it.x+w,cy);
      ctx.quadraticCurveTo(it.x,innerBottom,it.x-w,cy);
      ctx.closePath();
    }
    lipOutline(it.y+lower);
    ctx.fillStyle=cssV2(spec.skin.lip);
    ctx.fill();
    /* the upper lip sits in shadow; restate its band a tone down */
    lipOutline(it.y+(.55+fullT*.4)*u);
    ctx.fillStyle=cssV2(shadeV2(spec.skin.lip,-.07),.85);
    ctx.fill();
    if(it.painted){
      ctx.fillStyle=cssV2(shadeV2(spec.skin.lip,.03),.4);
      ctx.fill();
    }
    /* the vermillion border catches light out of the philtrum */
    ink(ctx,.65*u,spec.skin.lit,.3+fullT*.16,q);
    ctx.beginPath();
    ctx.moveTo(it.x-w*.84,cy-upper*.2);
    ctx.quadraticCurveTo(it.x-w*.5,it.y-upper*1.06,
      it.x-w*.3,it.y-upper-.5*u);
    ctx.quadraticCurveTo(it.x-w*.12,it.y-upper*1.1,
      it.x,it.y-upper*.34-.4*u);
    ctx.quadraticCurveTo(it.x+w*.12,it.y-upper*1.1,
      it.x+w*.3,it.y-upper-.5*u);
    ctx.quadraticCurveTo(it.x+w*.5,it.y-upper*1.06,
      it.x+w*.84,cy-upper*.2);
    ctx.stroke();
    /* the mouth line, weighted at the corners and dying at neither */
    fade(ctx,1.15*u,spec.skin.lipLine,it.x-w,cy,it.x+w,cy,.5,.5,.88,q);
    ctx.beginPath();
    ctx.moveTo(it.x-w,cy);
    ctx.quadraticCurveTo(it.x,it.y+(.55+fullT*.4)*u,it.x+w,cy);
    ctx.stroke();
    /* the corners are pits, so they go in rather than round off */
    softE(ctx,it.x-w*.94,cy+.3*u,1.5*u,1.1*u,spec.skin.deep,.42);
    softE(ctx,it.x+w*.94,cy+.3*u,1.5*u,1.1*u,spec.skin.deep,.42);
    softE(ctx,it.x,it.y+lower*.42,w*.5,Math.max(.8*u,lower*.34),
      spec.skin.lit,.22+fullT*.16);
    fade(ctx,.7*u,spec.skin.lit,it.x-w*.4,it.y,it.x+w*.4,it.y,
      .06,.06,.44,q);
    ctx.beginPath();
    ctx.moveTo(it.x-w*.4,it.y+lower*.42);
    ctx.quadraticCurveTo(it.x,it.y+lower*.72,it.x+w*.4,it.y+lower*.42);
    ctx.stroke();
    softE(ctx,it.x,it.y+lower*1.05,w*.46,lower*.38,spec.skin.shadow,.2);
    /* the philtrum: a trough with two ridges */
    softE(ctx,it.x,it.y-upper-1.6*u,w*.17,1.6*u,spec.skin.shadow,.16);
    if(q.fine){
      ink(ctx,.5*u,spec.skin.lit,.22,q);
      var s;
      for(s=-1;s<=1;s+=2){
        ctx.beginPath();
        ctx.moveTo(it.x+s*w*.15,it.y-upper*.95);
        ctx.quadraticCurveTo(it.x+s*w*.18,it.y-upper-1.4*u,
          it.x+s*w*.17,it.y-upper-2.6*u);
        ctx.stroke();
      }
    }
    softE(ctx,it.x,it.y+lower+2.2*u,w*.42,1.5*u,spec.skin.shadow,.18);
    ctx.restore();
  }
  function paintFeatures(ctx, scaffold, spec, q) {
    var it=featureIntents(scaffold,spec,q);
    illusBrows(ctx,spec,it.brows,it.u,q);
    illusEyes(ctx,spec,it.eyes,it.u,q);
    illusNose(ctx,spec,it.nose,it.u,q);
    illusMouth(ctx,spec,it.mouth,it.u,q);
  }
  /* The cut, which the descriptor picks and the amount only scales.
     reach: how far round the jaw; cheek: how high it rides; chinW: the
     mass at the chin; drop: hang below the chin; tip: the bottom edge;
     stache/droop: the moustache it carries. */
  var BEARD = {
    full:      {reach:1,cheek:1,chinW:1,drop:1,tip:'round',stache:1,droop:.2},
    square:    {reach:1,cheek:.88,chinW:1.14,drop:.92,tip:'square',stache:1,droop:0},
    spade:     {reach:.96,cheek:.94,chinW:1.06,drop:1.18,tip:'point',stache:1.05,droop:.3},
    forked:    {reach:1,cheek:1,chinW:.98,drop:1.12,tip:'fork',stache:1,droop:.35},
    goatee:    {reach:.32,cheek:.04,chinW:.8,drop:1.2,tip:'point',stache:.95,droop:.25},
    chinstrap: {reach:.92,cheek:.62,chinW:.84,drop:.52,tip:'round',stache:0,droop:0},
    chops:     {reach:1,cheek:1,chinW:0,drop:0,tip:'chops',stache:.92,droop:.8},
    stache:    {reach:0,cheek:0,chinW:0,drop:0,tip:'none',stache:1.28,droop:.55}
  };
  function cutOf(spec) {
    return BEARD[spec.beardCut]||BEARD.full;
  }
  /* The face silhouette edge at a height, so attachments sit on the
     head instead of beside it. The cheek span is not a chord: headPath
     bulges outward between eye and jaw, and anything placed against
     the straight interpolation lands ON the face. */
  function faceEdgeAt(f, y, s) {
    var wide=s<0?f.left:f.right;
    var jaw=s<0?f.jawL:f.jawR;
    if(y<=f.eyeY)return wide;
    if(y<=f.jawY){
      var t=clampV2((y-f.eyeY)/Math.max(1,f.jawY-f.eyeY),0,1);
      var bulge=((s<0?f.left-f.cheekL:f.cheekR-f.right)+3*f.u)*.4;
      return mixV2(wide,jaw,t)+s*Math.sin(t*Math.PI)*bulge;
    }
    return mixV2(jaw,f.chinX+s*f.chinSpan,
      clampV2((y-f.jawY)/Math.max(1,f.chinBottom-f.jawY),0,1));
  }
  /* sideburns carried down the jaw with the chin left bare */
  function addChops(ctx, f) {
    var u=f.u,side,ex,jx,top;
    for(side=-1;side<=1;side+=2){
      ex=side<0?f.left+1*u:f.right-1*u;
      jx=side<0?f.jawL:f.jawR;
      top=f.eyeY+4*u;
      ctx.moveTo(ex,top);
      ctx.quadraticCurveTo(ex+side*u,f.jawY-8*u,jx+side*2*u,f.jawY+3*u);
      ctx.quadraticCurveTo(jx-side*7*u,f.jawY+6*u,jx-side*13*u,f.jawY-3*u);
      ctx.quadraticCurveTo(ex-side*13*u,f.mouthY-12*u,ex-side*4*u,top);
      ctx.closePath();
    }
  }
  function addBeard(ctx, f, len, c) {
    var fw=f.right-f.left;
    var hH=f.chinBottom-f.top;
    var top=f.mouthY-hH*.085+(1-c.cheek)*hH*.155;
    var lx=mixV2(f.chinX,faceEdgeAt(f,top,-1)-fw*.012,c.reach);
    var rx=mixV2(f.chinX,faceEdgeAt(f,top,1)+fw*.012,c.reach);
    var jlx=mixV2(f.chinX,f.jawL-fw*.025,c.reach);
    var jrx=mixV2(f.chinX,f.jawR+fw*.025,c.reach);
    var w=fw*.215*c.chinW;
    var jw=fw*.25*c.chinW;
    var d=len*c.drop;
    var bw=w*mixV2(1,.78,clampV2(d/(hH*.3),0,1));
    var mw=mixV2(w,bw,.5);
    var lip=mixV2(w*.85,fw*.215,c.reach);
    ctx.moveTo(lx,top);
    ctx.bezierCurveTo(mixV2(lx,jlx,.5)-fw*.012,mixV2(top,f.jawY,.45),
      jlx-fw*.006,f.jawY-hH*.03,jlx,f.jawY+hH*.035);
    ctx.bezierCurveTo(jlx+fw*.012,mixV2(f.jawY,f.chinY,.75),
      f.chinX-jw,f.chinY+d*.22,f.chinX-mw,f.chinY+d*.7);
    if(c.tip==='fork'){
      ctx.quadraticCurveTo(f.chinX-bw*.7,f.chinY+d*1.05,f.chinX-fw*.05,f.chinY+d);
      ctx.quadraticCurveTo(f.chinX,f.chinY+d*.7,f.chinX+fw*.05,f.chinY+d);
      ctx.quadraticCurveTo(f.chinX+bw*.7,f.chinY+d*1.05,f.chinX+mw,f.chinY+d*.7);
    }else if(c.tip==='point'){
      ctx.quadraticCurveTo(f.chinX-bw*.55,f.chinY+d*.96,f.chinX,f.chinY+d*1.3);
      ctx.quadraticCurveTo(f.chinX+bw*.55,f.chinY+d*.96,f.chinX+mw,f.chinY+d*.7);
    }else if(c.tip==='square'){
      ctx.quadraticCurveTo(f.chinX-bw*1.02,f.chinY+d*.94,f.chinX-bw*.9,f.chinY+d);
      ctx.lineTo(f.chinX+bw*.9,f.chinY+d);
      ctx.quadraticCurveTo(f.chinX+bw*1.02,f.chinY+d*.94,f.chinX+mw,f.chinY+d*.7);
    }else{
      ctx.quadraticCurveTo(f.chinX,f.chinY+d*1.06,f.chinX+mw,f.chinY+d*.7);
    }
    ctx.bezierCurveTo(f.chinX+jw,f.chinY+d*.22,
      jrx-fw*.012,mixV2(f.jawY,f.chinY,.75),jrx,f.jawY+hH*.035);
    ctx.bezierCurveTo(jrx+fw*.006,f.jawY-hH*.03,
      mixV2(rx,jrx,.5)+fw*.012,mixV2(top,f.jawY,.45),rx,top);
    ctx.quadraticCurveTo(f.mouthX+lip,f.mouthY-hH*.02,f.mouthX,f.mouthY+hH*.042);
    ctx.quadraticCurveTo(f.mouthX-lip,f.mouthY-hH*.02,lx,top);
    ctx.closePath();
  }
  function beardMask(ctx, f, len, c) {
    ctx.beginPath();
    if(c.tip==='chops')addChops(ctx,f);
    else if(c.tip!=='none')addBeard(ctx,f,len,c);
  }
  function paintBeard(ctx, scaffold, spec, q) {
    var f=scaffold.face,u=f.u,kind=spec.beardKind;
    var c=cutOf(spec);
    if(kind==='none'||c.tip==='none')return;
    var rng=streamV2(spec.identity,'beard');
    var fw=f.right-f.left;
    var hH=f.chinBottom-f.top;
    var i,j,t;
    if(kind==='stubble'){
      /* a day's growth is shaped by the cut too */
      ctx.save();
      headPath(ctx,f);
      ctx.clip();
      beardMask(ctx,f,hH*.062,c);
      ctx.clip();
      /* a wash under the ticks, so the growth reads as a shaded jaw
         rather than scattered dirt */
      ctx.fillStyle=cssV2(spec.hair.deep,.14);
      ctx.fillRect(f.left-4*u,f.mouthY-hH*.2,fw+8*u,hH*.6);
      ink(ctx,.7*u,spec.hair.deep,.34,q);
      var ticks=q.fine?64:36;
      for(i=0;i<ticks;i++){
        var stx=mixV2(f.left+fw*.03,f.right-fw*.03,rng());
        var sty=mixV2(f.mouthY-hH*.125,f.chinY+hH*.06,rng());
        ctx.beginPath();
        ctx.moveTo(stx,sty);
        ctx.lineTo(stx+(rng()-.5)*1.4*u,sty+(1.3+rng())*u);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    var len=hH*(kind==='short'?.052:kind==='full'?.177:.354);
    /* a long beard tapers inside the card: run past the frame edge it
       clips into a slab with no tip */
    if(q.bottom){
      len=Math.min(len,(q.bottom-f.chinY-6*u)/Math.max(.5,c.drop*1.3));
    }
    var base=rgbMixV2(spec.hair.base,spec.hair.deep,.34);
    var lit=hairLit(spec,.26);
    if(spec.beardCut==='chinstrap'){
      /* A chinstrap is a narrow BAND of beard hugging the jaw: a filled
         mass between the silhouette and an inset line. Drawn as strokes
         it read as a leather harness, not hair. */
      var ys=[f.eyeY+2*u,mixV2(f.eyeY,f.jawY,.5),f.jawY+1*u];
      var outerL=[],innerL=[],outerR=[],innerR=[],k,ey,w2;
      for(k=0;k<ys.length;k++){
        ey=ys[k];
        w2=(4+k*1.4)*u;
        outerL.push([faceEdgeAt(f,ey,-1)-1*u,ey]);
        innerL.push([faceEdgeAt(f,ey,-1)+w2,ey]);
        outerR.push([faceEdgeAt(f,ey,1)+1*u,ey]);
        innerR.push([faceEdgeAt(f,ey,1)-w2,ey]);
      }
      var band2=function () {
        ctx.beginPath();
        edgeThrough(ctx,[outerL[0],outerL[1],outerL[2],
          [f.chinX,f.chinBottom+2.5*u],outerR[2],outerR[1],outerR[0]],true);
        edgeThrough(ctx,[innerR[0],innerR[1],innerR[2],
          [f.chinX,f.chinBottom-4.5*u],innerL[2],innerL[1],innerL[0]],false);
        ctx.closePath();
      };
      band2();
      fillStrokeA(ctx,base,spec.hair.deep,1.2*u,.85,q);
      ctx.save();
      band2();
      ctx.clip();
      if(q.fine){
        for(i=0;i<22;i++){
          t=(i+.5)/22;
          var cxb=mixV2(f.jawL-6*u,f.jawR+6*u,t);
          var cyb=mixV2(f.jawY,f.chinBottom+1*u,
            1-Math.abs(t*2-1))+(rng()-.5)*3*u;
          ink(ctx,.75*u,i%3?spec.hair.deep:hairLit(spec,.2),.45,q);
          ctx.beginPath();
          ctx.moveTo(cxb,cyb-2*u);
          ctx.lineTo(cxb+(rng()-.5)*1.4*u,cyb+1.8*u);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }
    /* the mass gets what any large form gets: a lit plane toward the
       key, a core shadow away from it, a rim on the lit silhouette, and
       an edge against skin that is hair rather than vector */
    var topY=f.mouthY-hH*.085+(1-c.cheek)*hH*.145;
    var botY=f.chinY+len*c.drop;
    var jawMid=(f.jawY+f.chinY)*.5;
    beardMask(ctx,f,len,c);
    fillStrokeA(ctx,base,spec.hair.deep,1.8*u,.9,q);
    ctx.save();
    beardMask(ctx,f,len,c);
    ctx.clip();
    var shX=f.chinX-spec.lightSide*fw*.3;
    softE(ctx,shX,jawMid,fw*.34,hH*.2,spec.hair.deep,.5);
    softE(ctx,f.chinX,botY-hH*.01,
      fw*.2*c.chinW,len*.5+hH*.03,spec.hair.deep,.42);
    if(c.tip!=='chops'){
      softRun(ctx,
        [[f.chinX+spec.lightSide*fw*.42,topY+hH*.02],
        [f.chinX+spec.lightSide*fw*.34,jawMid],
        [f.chinX+spec.lightSide*fw*.2,f.chinY],
        [f.chinX+spec.lightSide*fw*.08,botY-len*.5]],
        fw*.12,fw*.06,.34,.14,lit,9);
    }
    /* growth has a direction field: dark texture, then lit strands on
       the key side */
    if(c.tip==='chops'){
      var side2;
      for(side2=-1;side2<=1;side2+=2){
        var jx=side2<0?f.jawL:f.jawR;
        var ex=side2<0?f.left+3*u:f.right-3*u;
        var pass2;
        for(pass2=0;pass2<2;pass2++){
          ink(ctx,.9*u,pass2?lit:spec.hair.deep,pass2?.42:.35,q);
          for(j=0;j<12;j++){
            t=rng();
            var bx=mixV2(ex,jx+side2*4*u,t*.75)+(rng()-.5)*4*u;
            var by=mixV2(f.eyeY+6*u,f.jawY+4*u,t);
            if(pass2&&side2*spec.lightSide<0)continue;
            ctx.beginPath();
            ctx.moveTo(bx,by);
            ctx.lineTo(bx+side2*(1+rng()*1.5)*u,by+(3+rng()*3)*u);
            ctx.stroke();
          }
        }
      }
    }else{
      var pass;
      for(pass=0;pass<2;pass++){
        ink(ctx,.95*u,pass?lit:spec.hair.deep,pass?.42:.34,q);
        for(j=0;j<(pass?22:(q.fine?44:34));j++){
          t=rng();
          var y=mixV2(topY,botY,t);
          var span=mixV2((fw-fw*.1)*c.reach,fw*.26*c.chinW,t);
          var x=f.chinX+(rng()*2-1)*span*.5;
          if(pass&&(x-f.chinX)*spec.lightSide<0)continue;
          var toward=(f.chinX-x)*.16*(1-t*.5);
          var dl=(4+t*4)*u+t*len*.18+rng()*2*u;
          ctx.beginPath();
          ctx.moveTo(x,y);
          ctx.quadraticCurveTo(x+toward*.4+(rng()-.5)*1.6*u,y+dl*.5,
            x+toward+(rng()-.5)*1.8*u,y+dl);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    /* the rim: the outline again, only where the key strikes it */
    ctx.save();
    ctx.beginPath();
    if(spec.lightSide>0)ctx.rect(f.cx,f.top,f.right-f.cx+fw*.3,hH*2);
    else ctx.rect(f.left-fw*.3,f.top,f.cx-f.left+fw*.3,hH*2);
    ctx.clip();
    beardMask(ctx,f,len,c);
    ink(ctx,1.1*u,lit,.5,q);
    ctx.stroke();
    ctx.restore();
    /* where the beard meets skin it is hair thinning out, not an edge */
    if(c.tip!=='chops'&&c.reach>.5){
      var side3;
      for(side3=-1;side3<=1;side3+=2){
        var ex2=f.chinX+side3*(f.right-f.chinX)*c.reach*.92;
        softRun(ctx,
          [[ex2,topY+hH*.012],
          [mixV2(ex2,f.chinX,.3),topY+hH*.04],
          [mixV2(ex2,f.chinX,.62),f.mouthY+hH*.016],
          [f.chinX+side3*fw*.1,f.mouthY+hH*.052]],
          fw*.035,fw*.025,.13,.06,base,8);
      }
      if(q.fine){
        for(i=0;i<14;i++){
          t=(i+.5)/14;
          var sideT=i&1?1:-1;
          var tx=f.chinX+sideT*mixV2(fw*.12,(f.right-f.chinX)*c.reach*.9,t);
          var ty=mixV2(f.mouthY+hH*.04,topY+hH*.015,t);
          ink(ctx,.75*u,i%3?base:spec.hair.deep,.3+rng()*.25,q);
          ctx.beginPath();
          ctx.moveTo(tx,ty);
          ctx.lineTo(tx+(rng()-.5)*2*u-sideT*u,ty-(1.5+rng()*2.5)*u);
          ctx.stroke();
        }
      }
    }
    /* the cut's signature marks sit on top of the texture */
    if(c.tip==='fork'){
      var df=len*c.drop;
      ctx.fillStyle=cssV2(spec.skin.base);
      ctx.beginPath();
      ctx.moveTo(f.chinX-fw*.04,f.chinY+df*.78);
      ctx.quadraticCurveTo(f.chinX,f.chinY+df*.68,
        f.chinX+fw*.04,f.chinY+df*.78);
      ctx.lineTo(f.chinX,f.chinY+df*1.02);
      ctx.closePath();
      ctx.fill();
      ink(ctx,.7*u,spec.skin.deep,.4,q);
      ctx.beginPath();
      ctx.moveTo(f.chinX,f.chinY+df*.72);
      ctx.lineTo(f.chinX,f.chinY+df*.96);
      ctx.stroke();
    }
    if(c.tip==='point'||c.tip==='fork'){
      ink(ctx,.7*u,spec.hair.deep,.4,q);
      ctx.beginPath();
      ctx.moveTo(f.chinX,f.mouthY+hH*.06);
      ctx.quadraticCurveTo(f.chinX+1*u,f.chinY,
        f.chinX,f.chinY+len*c.drop*.7);
      ctx.stroke();
    }
    if(c.tip==='square'){
      ink(ctx,.9*u,lit,.3,q);
      ctx.beginPath();
      ctx.moveTo(f.chinX-fw*.165*c.chinW,f.chinY+len*c.drop*.9);
      ctx.quadraticCurveTo(f.chinX,f.chinY+len*c.drop*.96,
        f.chinX+fw*.165*c.chinW,f.chinY+len*c.drop*.9);
      ctx.stroke();
    }
    /* a long beard does not end in a hem: a few hairs carry past */
    if(len>hH*.1&&c.tip!=='chops'&&c.tip!=='square'&&q.fine){
      var tipW=fw*.215*c.chinW*
        mixV2(1,.78,clampV2(len*c.drop/(hH*.3),0,1));
      for(i=0;i<5;i++){
        t=(i+.5)/5;
        var lxp=f.chinX+(t*2-1)*tipW*.72;
        var lyp=botY-Math.abs(t*2-1)*hH*.022;
        ink(ctx,1.1*u,i&1?base:spec.hair.deep,.7,q);
        ctx.beginPath();
        ctx.moveTo(lxp,lyp-3.5*u);
        ctx.quadraticCurveTo(lxp+(rng()-.5)*1.4*u,lyp,
          lxp+(rng()-.5)*2*u,lyp+(1.2+rng()*1.6)*u);
        ctx.stroke();
      }
    }
  }
  function paintMustache(ctx, scaffold, spec, q) {
    var f=scaffold.face,u=f.u;
    var c=cutOf(spec);
    if(spec.beardKind==='none'||spec.beardKind==='stubble'||!c.stache)return;
    var s=c.stache;
    var fw=f.right-f.left;
    var hH=f.chinBottom-f.top;
    var color=rgbMixV2(spec.hair.base,spec.hair.deep,.34);
    var lit=hairLit(spec,.28);
    var solo=c.tip==='none';
    var thick=solo?1.55:1;
    var W=fw*(solo?.23:.185)*s;
    var T=hH*.054*thick;
    var tipY=f.mouthY-hH*.01+hH*.073*c.droop;
    var side;
    for(side=-1;side<=1;side+=2){
      ctx.beginPath();
      ctx.moveTo(f.mouthX+side*fw*.01,f.mouthY-T);
      ctx.bezierCurveTo(f.mouthX+side*W*.5,f.mouthY-T*1.34,
        f.mouthX+side*W*.86,f.mouthY-T*.96,f.mouthX+side*W,tipY);
      ctx.bezierCurveTo(f.mouthX+side*W*.57,
        f.mouthY-(solo?hH*.026:hH*.006),
        f.mouthX+side*W*.29,f.mouthY-(solo?hH*.005:-hH*.006),
        f.mouthX+side*fw*.01,f.mouthY-T*.38);
      ctx.closePath();
      ctx.fillStyle=cssV2(color);
      ctx.fill();
      fade(ctx,1.1*u,lit,f.mouthX,0,f.mouthX+side*W,0,
        .1,.12,side*spec.lightSide>0?.6:.28,q);
      ctx.beginPath();
      ctx.moveTo(f.mouthX+side*fw*.02,f.mouthY-T*.92);
      ctx.quadraticCurveTo(f.mouthX+side*W*.55,f.mouthY-T*1.22,
        f.mouthX+side*W*.9,f.mouthY-T*.55);
      ctx.stroke();
      if(q.fine){
        ink(ctx,.7*u,lit,.4,q);
        var mi;
        for(mi=0;mi<3;mi++){
          var mt=(mi+1)/3.5;
          ctx.beginPath();
          ctx.moveTo(f.mouthX+side*(fw*.033+W*.64*mt),
            f.mouthY-T*1.04+mt*hH*.015);
          ctx.quadraticCurveTo(f.mouthX+side*(fw*.066+W*.71*mt),
            f.mouthY-T*.77,
            f.mouthX+side*(fw*.082+W*.71*mt),
            f.mouthY-hH*.027+mt*c.droop*hH*.031);
          ctx.stroke();
        }
      }
      if(solo){
        ink(ctx,1.5*u,color,1,q);
        ctx.beginPath();
        ctx.moveTo(f.mouthX+side*W*.96,tipY-hH*.004);
        ctx.quadraticCurveTo(f.mouthX+side*W*1.11,tipY+hH*.004,
          f.mouthX+side*W*1.07,tipY-hH*.019);
        ctx.stroke();
      }else if(c.droop>.6){
        ink(ctx,1.2*u,color,.95,q);
        ctx.beginPath();
        ctx.moveTo(f.mouthX+side*W*.97,tipY-hH*.008);
        ctx.quadraticCurveTo(f.mouthX+side*W*1.04,tipY+hH*.021,
          f.mouthX+side*W*.99,tipY+hH*.044);
        ctx.stroke();
      }
    }
    ink(ctx,.7*u,spec.hair.deep,.5,q);
    ctx.beginPath();
    ctx.moveTo(f.mouthX,f.mouthY-T*1.04);
    ctx.lineTo(f.mouthX,f.mouthY-hH*.025);
    ctx.stroke();
  }
  /* a handful of hairs crossing the hairline is the whole difference
     between hair and a helmet rim */
  function fringeWisps(ctx, f, spec, rng, y, n, q) {
    if(!q.fine)return;
    var i,u=f.u;
    for(i=0;i<n;i++){
      var t=(i+.5)/n;
      var x=mixV2(f.left+4*u,f.right-4*u,t)+(rng()-.5)*4*u;
      var dy=(2.5+rng()*4)*u;
      ink(ctx,.8*u,i&1?spec.hair.deep:spec.hair.base,.42+rng()*.2,q);
      ctx.beginPath();
      ctx.moveTo(x,y-5*u);
      ctx.quadraticCurveTo(x+(rng()-.5)*2.4*u,y,
        x+(rng()-.5)*4*u,y+dy);
      ctx.stroke();
    }
  }
  function paintFrontHair(ctx, scaffold, spec, q) {
    var f=scaffold.face,u=f.u,style=spec.hairStyle;
    var rng=streamV2(spec.identity,'hair');
    var i;
    if(style==='bald')return;
    if(style==='receding'||style==='tonsure'){
      /* what is left is close-cropped side patches */
      var high=style==='tonsure'?f.top+18*u:f.hairY-5*u;
      var side;
      for(side=-1;side<=1;side+=2){
        var edge=side<0?f.left:f.right;
        var hw=side<0?f.halfL:f.halfR;
        ctx.beginPath();
        ctx.moveTo(edge,f.eyeY+4*u);
        ctx.bezierCurveTo(edge+side*3*u,high+12*u,
          f.cx+side*hw*.62,high,f.cx+side*hw*.42,high+3*u);
        ctx.lineTo(f.cx+side*hw*.63,high+11*u);
        ctx.quadraticCurveTo(edge-side*3*u,f.hairY+10*u,edge,f.eyeY+4*u);
        ctx.closePath();
        fillStrokeA(ctx,spec.hair.base,spec.hair.deep,1.5*u,.85,q);
        if(q.fine){
          ctx.save();
          ctx.clip();
          ink(ctx,.7*u,spec.hair.deep,.5,q);
          for(i=0;i<9;i++){
            var tx=edge+side*rng()*9*u;
            var ty=mixV2(high+4*u,f.eyeY+2*u,rng());
            ctx.beginPath();
            ctx.moveTo(tx,ty);
            ctx.lineTo(tx+side*(1+rng())*u,ty+(1.5+rng()*2)*u);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      return;
    }
    capPath(ctx,f,style);
    fillStrokeA(ctx,spec.hair.base,spec.hair.deep,1.8*u,.9,q);
    /* curly hair is a silhouette of ringlets, not a cap with bumps */
    if(style==='curly'){
      for(i=0;i<11;i++){
        var ct=i/10;
        var cx2=mixV2(f.left+2*u,f.right-2*u,ct);
        var arch=1-Math.pow(ct*2-1,2);
        var cy2=mixV2(f.hairY-1*u,f.top-5*u,arch)+(rng()-.5)*3*u;
        fEll(ctx,cx2,cy2,(6+rng()*2)*u,(5+rng()*2)*u,
          i&1?spec.hair.base:spec.hair.light);
        ink(ctx,1*u,spec.hair.deep,.55,q);
        ctx.beginPath();
        ctx.arc(cx2,cy2,(3+rng()*2)*u,.1,TAU*.82);
        ctx.stroke();
        ink(ctx,.8*u,spec.hair.light,.6,q);
        ctx.beginPath();
        ctx.arc(cx2-1*u,cy2-1*u,(1.6+rng()*1.4)*u,Math.PI*.9,Math.PI*1.9);
        ctx.stroke();
      }
      for(i=0;i<7;i++){
        fEll(ctx,mixV2(f.left+4*u,f.right-4*u,i/6)+(rng()-.5)*2*u,
          f.hairY+3*u+rng()*2*u,(2.6+rng())*u,(2.2+rng())*u,
          i&1?spec.hair.base:spec.hair.deep);
      }
    }
    ctx.save();
    capPath(ctx,f,style);
    ctx.clip();
    /* the underside sits dark against the fringe, the crown carries one
       broad sheen set toward the light */
    ink(ctx,2.6*u,spec.hair.deep,.3,q);
    ctx.beginPath();
    ctx.moveTo(f.left+2*u,f.hairY+3*u);
    ctx.quadraticCurveTo(f.cx,f.hairY+8*u,f.right-2*u,f.hairY+3*u);
    ctx.stroke();
    softE(ctx,f.cx+spec.lightSide*9*u,f.top+8*u,
      (f.right-f.left)*.4,5.5*u,spec.hair.light,.34);
    softE(ctx,f.cx+spec.lightSide*f.halfR*.45,f.top+16*u,
      f.halfR*.5,4*u,hairLit(spec,.42),.3);
    /* strand work is per style: every cut combs its own way */
    if(style==='crop'){
      if(q.fine){
        ink(ctx,.8*u,spec.hair.deep,.55,q);
        for(i=0;i<13;i++){
          var fx=mixV2(f.left+3*u,f.right-3*u,(i+.5)/13);
          var fy=f.hairY+1*u+Math.sin(i*2.7)*1.5*u;
          ctx.beginPath();
          ctx.moveTo(fx,fy-(3+rng()*2)*u);
          ctx.lineTo(fx+(rng()-.5)*1.5*u,fy+(1.5+rng()*1.5)*u);
          ctx.stroke();
        }
      }
      ink(ctx,.75*u,spec.hair.light,.4,q);
      for(i=0;i<8;i++){
        var cxx=mixV2(f.left+5*u,f.right-5*u,rng());
        ctx.beginPath();
        ctx.moveTo(cxx,f.top+(4+rng()*4)*u);
        ctx.quadraticCurveTo(cxx+(f.cx-cxx)*.2,f.hairY-6*u,
          cxx+(f.cx-cxx)*.12,f.hairY-1*u);
        ctx.stroke();
      }
    }else if(style==='bowl'){
      ink(ctx,.9*u,spec.hair.deep,.58,q);
      for(i=0;i<12;i++){
        var bowlT=(i+.5)/12;
        var bowlX=mixV2(f.left+3*u,f.right-3*u,bowlT);
        ctx.beginPath();
        ctx.moveTo(bowlX,f.top+(4+Math.abs(bowlT-.5)*8)*u);
        ctx.quadraticCurveTo(bowlX+(rng()-.5)*2*u,f.hairY+1*u,
          bowlX+(rng()-.5)*1.2*u,f.hairY+7*u);
        ctx.stroke();
      }
    }else if(style==='sweptBack'){
      ink(ctx,1*u,spec.hair.light,.5,q);
      for(i=0;i<10;i++){
        var sweptT=(i+.5)/10;
        var sweptX=mixV2(f.left+4*u,f.right-4*u,sweptT);
        ctx.beginPath();
        ctx.moveTo(sweptX,f.hairY-1*u);
        ctx.bezierCurveTo(sweptX+(sweptX-f.cx)*.15,f.top+13*u,
          f.crownX+(sweptX-f.cx)*.38,f.top+5*u,
          f.crownX+(sweptX-f.cx)*.52,f.top-2*u);
        ctx.stroke();
      }
    }else if(style==='shoulderWaves'){
      ink(ctx,.9*u,spec.hair.light,.46,q);
      for(i=0;i<9;i++){
        var shoulderX=mixV2(f.left+4*u,f.right-4*u,(i+.5)/9);
        ctx.beginPath();
        ctx.moveTo(shoulderX,f.top+4*u);
        ctx.quadraticCurveTo(shoulderX+(f.cx-shoulderX)*.1,
          f.hairY-5*u,shoulderX+(rng()-.5)*2*u,f.hairY+4*u);
        ctx.stroke();
      }
    }else if(style==='tiedBack'){
      ink(ctx,.9*u,spec.hair.light,.5,q);
      for(i=0;i<10;i++){
        var tiedX=mixV2(f.left+3*u,f.right-3*u,(i+.5)/10);
        ctx.beginPath();
        ctx.moveTo(tiedX,f.hairY-1*u);
        ctx.quadraticCurveTo(mixV2(tiedX,f.crownX,.65),f.top+4*u,
          f.crownX+(tiedX-f.cx)*.12,f.top-3*u);
        ctx.stroke();
      }
    }else if(style==='crownBraid'){
      ink(ctx,.9*u,spec.hair.deep,.45,q);
      for(i=0;i<8;i++){
        var crownX=mixV2(f.left+5*u,f.right-5*u,(i+.5)/8);
        ctx.beginPath();
        ctx.moveTo(crownX,f.hairY+1*u);
        ctx.quadraticCurveTo(crownX+(f.cx-crownX)*.25,f.top+7*u,
          f.crownX+(crownX-f.cx)*.18,f.top+1*u);
        ctx.stroke();
      }
    }else if(style==='sidePart'){
      var part=f.cx+f.halfR*.28;
      ink(ctx,.85*u,spec.hair.light,.5,q);
      for(i=0;i<7;i++){
        var t4=(i+.5)/7;
        ctx.beginPath();
        ctx.moveTo(part-1*u,f.top+(3+t4*10)*u);
        ctx.quadraticCurveTo(mixV2(part,f.left,.45),f.top+(8+t4*7)*u,
          mixV2(part,f.left+4*u,.82),f.hairY+(-1+t4*2.5)*u);
        ctx.stroke();
      }
      ink(ctx,.8*u,spec.hair.deep,.45,q);
      for(i=0;i<4;i++){
        var t7=(i+.5)/4;
        ctx.beginPath();
        ctx.moveTo(part+1*u,f.top+(3+t7*9)*u);
        ctx.quadraticCurveTo(mixV2(part,f.right,.4),f.top+(7+t7*7)*u,
          mixV2(part,f.right-3*u,.8),f.hairY+t7*2*u);
        ctx.stroke();
      }
    }else if(style==='bun'){
      ink(ctx,.8*u,spec.hair.light,.45,q);
      for(i=0;i<9;i++){
        var sx=mixV2(f.left+3*u,f.right-3*u,(i+.5)/9);
        ctx.beginPath();
        ctx.moveTo(sx,f.hairY+2*u);
        ctx.quadraticCurveTo(mixV2(sx,f.crownX,.5),f.top+8*u,
          f.crownX+(sx-f.cx)*.1,f.top-3*u);
        ctx.stroke();
      }
    }else if(style==='braids'){
      ink(ctx,1.1*u,spec.hair.deep,.72,q);
      ctx.beginPath();
      ctx.moveTo(f.crownX,f.top+1*u);
      ctx.quadraticCurveTo(f.cx+1*u,f.top+15*u,f.cx,f.hairY-3*u);
      ctx.stroke();
      ink(ctx,.8*u,spec.hair.light,.44,q);
      var bs;
      for(bs=-1;bs<=1;bs+=2){
        ctx.beginPath();
        ctx.moveTo(f.crownX+bs*2*u,f.top+5*u);
        ctx.quadraticCurveTo(f.cx+bs*f.halfL*.38,f.top+16*u,
          f.cx+bs*f.halfL*.62,f.hairY+1*u);
        ctx.stroke();
      }
    }else if(style==='longLoose'){
      ink(ctx,.85*u,spec.hair.light,.42,q);
      for(i=0;i<8;i++){
        var sx2=mixV2(f.left+4*u,f.right-4*u,(i+.5)/8);
        ctx.beginPath();
        ctx.moveTo(sx2,f.top+4*u);
        ctx.quadraticCurveTo(sx2+(f.cx-sx2)*.14,f.hairY-5*u,
          sx2+(f.cx-sx2)*.06+(rng()-.5)*2*u,f.hairY+4*u);
        ctx.stroke();
      }
    }else if(style==='curly'){
      for(i=0;i<6;i++){
        ink(ctx,.8*u,i&1?spec.hair.light:spec.hair.deep,.5,q);
        ctx.beginPath();
        ctx.arc(mixV2(f.left+6*u,f.right-6*u,rng()),
          mixV2(f.top+6*u,f.hairY-4*u,rng()),
          (1.8+rng()*1.6)*u,rng()*TAU,rng()*TAU+TAU*.55);
        ctx.stroke();
      }
    }
    ctx.restore();
    if(style==='sidePart'){
      /* the part is a strip of scalp with the mass pressed off it */
      var partX=f.cx+f.halfR*.25;
      ink(ctx,1*u,shadeV2(spec.skin.base,-.02),.75,q);
      ctx.beginPath();
      ctx.moveTo(partX,f.top+2*u);
      ctx.quadraticCurveTo(partX-2*u,f.top+16*u,partX-5*u,f.hairY-1*u);
      ctx.stroke();
      ink(ctx,1.5*u,spec.hair.deep,.75,q);
      ctx.beginPath();
      ctx.moveTo(partX+1.2*u,f.top+2*u);
      ctx.quadraticCurveTo(partX-.8*u,f.top+16*u,partX-3.8*u,f.hairY-1*u);
      ctx.stroke();
    }
    if(style==='bowl'){
      ink(ctx,1.2*u,spec.hair.deep,.75,q);
      ctx.beginPath();
      ctx.moveTo(f.left+4*u,f.hairY+7*u);
      for(i=1;i<=8;i++){
        var bowlEdge=mixV2(f.left+4*u,f.right-4*u,i/8);
        ctx.quadraticCurveTo(bowlEdge-3*u,
          f.hairY+(i%2?9:6)*u,bowlEdge,f.hairY+7*u);
      }
      ctx.stroke();
    }
    if(style==='crownBraid'){
      var braidCount=11;
      for(i=0;i<braidCount;i++){
        var braidT=i/(braidCount-1);
        var braidX=mixV2(f.left+5*u,f.right-5*u,braidT);
        var braidArch=1-Math.pow(braidT*2-1,2);
        var braidY=mixV2(f.hairY-1*u,f.top+3*u,braidArch);
        fEll(ctx,braidX,braidY,4.6*u,3.4*u,
          i&1?spec.hair.base:hairLit(spec,.18));
        ink(ctx,.8*u,spec.hair.deep,.62,q);
        ctx.beginPath();
        ctx.ellipse(braidX,braidY,4.6*u,3.4*u,
          (i&1?.45:-.45),0,TAU);
        ctx.stroke();
      }
    }
    var hH=f.chinBottom-f.top;
    if(style==='longLoose'){
      /* the lock in front of the shoulder is a mass with its own
         silhouette, one crease and one lit ridge, ending in a point */
      var s;
      for(s=-1;s<=1;s+=2){
        var hw2=s<0?f.halfL:f.halfR;
        var N=11,ps=[],hs=[],le=[],re=[],k,t;
        for(k=0;k<N;k++){
          t=k/(N-1);
          ps.push([f.cx+s*(hw2*.84+hH*
            (.012+Math.sin(t*Math.PI*.9)*.075+t*.055)),
            f.top+hH*.05+t*hH*.95]);
          hs.push(hH*.054*Math.sin(Math.pow(t,.62)*Math.PI)+hH*.004);
        }
        for(k=0;k<N;k++){
          le.push([ps[k][0]-hs[k],ps[k][1]]);
          re.push([ps[k][0]+hs[k],ps[k][1]]);
        }
        fallPath(ctx,ps,hs);
        ctx.fillStyle=cssV2(hairLit(spec,.07));
        ctx.fill();
        ctx.save();
        fallPath(ctx,ps,hs);
        ctx.clip();
        var pa=ps[2],pb=ps[N-3];
        fade(ctx,1.4*u,spec.hair.deep,pa[0],pa[1],pb[0],pb[1],0,.06,.34,q);
        ctx.beginPath();
        ctx.moveTo(pa[0]-s*hs[2]*.25,pa[1]);
        ctx.quadraticCurveTo(ps[5][0]-s*hs[5]*.35,ps[5][1],
          pb[0]-s*hs[N-3]*.25,pb[1]);
        ctx.stroke();
        ctx.restore();
        var inner=s<0?re:le;
        var outer=s<0?le:re;
        fade(ctx,1.4*u,spec.hair.deep,inner[1][0],inner[1][1],
          inner[N-1][0],inner[N-1][1],.12,.04,.7,q);
        ctx.beginPath();
        edgeThrough(ctx,inner,true);
        ctx.stroke();
        if(s*spec.lightSide>0){
          fade(ctx,1.3*u,hairLit(spec,.34),outer[1][0],outer[1][1],
            outer[N-1][0],outer[N-1][1],.06,.04,.58,q);
        }else{
          fade(ctx,1.2*u,spec.hair.deep,outer[1][0],outer[1][1],
            outer[N-1][0],outer[N-1][1],.08,.04,.45,q);
        }
        ctx.beginPath();
        edgeThrough(ctx,outer,true);
        ctx.stroke();
      }
      fringeWisps(ctx,f,spec,rng,f.hairY+3*u,7,q);
    }
    if(style==='bun'||style==='curly'||style==='shoulderWaves'){
      fringeWisps(ctx,f,spec,rng,f.hairY+3*u,6,q);
    }
    if(style==='braids'){
      /* loose wisps at the temple before the ropes begin */
      ink(ctx,.7*u,spec.hair.base,.6,q);
      var ws;
      for(ws=-1;ws<=1;ws+=2){
        var hw3=ws<0?f.halfL:f.halfR;
        ctx.beginPath();
        ctx.moveTo(f.cx+ws*(hw3-7*u),f.hairY+2*u);
        ctx.quadraticCurveTo(f.cx+ws*(hw3-3*u),f.eyeY-2*u,
          f.cx+ws*(hw3-10*u),f.eyeY+7*u);
        ctx.stroke();
      }
      fringeWisps(ctx,f,spec,rng,f.hairY+1*u,5,q);
      /* the ropes themselves hang from the back pass, behind the head */
    }
  }
  /* ---------- headwear ----------
     Every offset is in head units so a piece sits on the skull at any
     framing. Veils and hoods FRAME the face: the dome ends at the
     hairline and what hangs falls behind the head in the back-costume
     pass, never over the features. */
  function hwKnobs(f, spec) {
    return {u:f.u,hh:f.chinBottom-f.top,fit:spec.hwFit,
      drop:(spec.hwFit-.5)*11*f.u,vol:spec.hwVolume,
      lift:mixV2(.5,1.6,spec.hwVolume),drape:spec.hwDrape,
      fall:mixV2(.4,1.5,spec.hwDrape),trim:spec.hwTrim,
      studs:spec.hwTrim<.22?0:spec.hwTrim<.62?1:2};
  }
  function domePath(ctx, f, yBot, lift) {
    var u=f.u;
    lift*=u;
    ctx.beginPath();
    ctx.moveTo(f.left-2*u,yBot);
    ctx.bezierCurveTo(f.left-2*u,f.top+12*u,
      f.crownX-18*u,f.top-lift,f.crownX,f.top-lift);
    ctx.bezierCurveTo(f.crownX+18*u,f.top-lift,
      f.right+2*u,f.top+12*u,f.right+2*u,yBot);
    ctx.quadraticCurveTo(f.cx,yBot-6*u,f.left-2*u,yBot);
    ctx.closePath();
  }
  function band(ctx, f, y, height, color, edge, q) {
    var u=f.u;
    height*=u;
    ctx.beginPath();
    ctx.moveTo(f.left-3*u,y);
    ctx.quadraticCurveTo(f.cx,y-6*u,f.right+3*u,y);
    ctx.lineTo(f.right+2*u,y+height);
    ctx.quadraticCurveTo(f.cx,y+height-5*u,f.left-2*u,y+height);
    ctx.closePath();
    fillStrokeA(ctx,color,edge||shadeV2(color,-.25),1.3*u,.76,q);
  }
  /* a brim is an ellipse the head sits in; tilt lifts the front edge */
  function brimPath(ctx, f, y, out, tilt) {
    var u=f.u;
    var l=f.left-out*u,r=f.right+out*u;
    ctx.beginPath();
    ctx.moveTo(l,y);
    ctx.quadraticCurveTo(f.cx,y+(12-tilt)*u,r,y);
    ctx.quadraticCurveTo(f.cx,y-(8+tilt)*u,l,y);
    ctx.closePath();
  }
  /* a fur band is a band with the pile showing */
  function furBand(ctx, f, y, h, color, q) {
    var u=f.u,i,n=10,t,x,yb;
    band(ctx,f,y,h,color,shadeV2(color,-.32),q);
    for(i=0;i<=n;i++){
      t=i/n;
      x=mixV2(f.left-2*u,f.right+2*u,t);
      yb=y+h*u-Math.sin(t*Math.PI)*4*u;
      fEll(ctx,x,yb,3.6*u,2.7*u,
        i&1?color:shadeV2(color,.12),.95);
    }
    if(!q.fine)return;
    ink(ctx,.8*u,shadeV2(color,-.34),.45,q);
    for(i=0;i<n;i++){
      t=(i+.5)/n;
      x=mixV2(f.left-1*u,f.right+1*u,t);
      ctx.beginPath();
      ctx.moveTo(x,y+2*u);
      ctx.lineTo(x+(i&1?1.6:-1.6)*u,y+h*u-1*u);
      ctx.stroke();
    }
  }
  /* crossed diagonals, which is a net as soon as there are enough */
  function netFill(ctx, f, y0, y1, step, color, q) {
    var u=f.u,x,span=y1-y0;
    ink(ctx,.7*u,color,.5,q);
    for(x=f.left-span-8*u;x<f.right+span+8*u;x+=step){
      ctx.beginPath();
      ctx.moveTo(x,y0);ctx.lineTo(x+span,y1);
      ctx.moveTo(x,y1);ctx.lineTo(x+span,y0);
      ctx.stroke();
    }
  }
  /* Five graduated points over four valleys, the centre standing
     tallest; a fleuron rounds the same tips. The reference's four fat
     points were dainty on its small head, but ornament scales by
     DENSITY, not magnification: blown up with the face they read as
     mitten fingers. */
  function crownRim(ctx, f, y, rise, round) {
    var u=f.u,n=5;
    var i,t,tx,ty,vx;
    ctx.beginPath();
    ctx.moveTo(f.left-3*u,y+5*u);
    for(i=0;i<n;i++){
      t=i/(n-1);
      tx=mixV2(f.left,f.right,t);
      ty=y-(11+8*Math.sin(t*Math.PI))*u*rise;
      if(round){
        ctx.quadraticCurveTo(tx-3*u,ty-2*u,tx,ty);
        ctx.quadraticCurveTo(tx+3*u,ty-2*u,tx+2.2*u,y-2*u);
      }else{
        ctx.lineTo(tx,ty);
      }
      if(i<n-1){
        vx=mixV2(f.left,f.right,(i+.5)/(n-1));
        ctx.lineTo(vx,y-4*u);
      }
    }
    ctx.lineTo(f.right+3*u,y+5*u);
    ctx.closePath();
  }
  function hoodEdge(ctx, f, K, wide) {
    var u=K.u;
    ctx.beginPath();
    ctx.moveTo(f.left-5*u,f.jawY+12*u);
    ctx.bezierCurveTo(f.left-18*u*wide,f.eyeY-18*u,
      f.left-8*u,f.top-8*u*K.lift,f.cx,f.top-13*u*K.lift);
    ctx.bezierCurveTo(f.right+8*u,f.top-8*u*K.lift,
      f.right+18*u*wide,f.eyeY-18*u,f.right+5*u,f.jawY+12*u);
  }
  function hwCirclet(ctx, f, spec, K, vr, q) {
    var u=K.u,y=f.hairY+1*u+K.drop;
    band(ctx,f,y-1*u,5,GOLD,shadeV2(GOLD,-.3),q);
    if(vr==='gemmed'&&K.studs){
      gemDot(ctx,f.cx-f.halfR*.52,y+1.4*u,1.7*u,[136,62,58],q);
      gemDot(ctx,f.cx+f.halfR*.52,y+1.4*u,1.7*u,[136,62,58],q);
      gemDot(ctx,f.cx,y,2.6*u,[42,104,108],q);
    }else if(K.studs){
      gemDot(ctx,f.cx,y,2.6*u,[42,104,108],q);
    }
  }
  function hwCrown(ctx, f, spec, K, vr, q, pal) {
    var u=K.u,y=f.hairY+1*u+K.drop;
    var gold=pal&&pal.metal?pal.metal:GOLD;
    var gem1=pal&&pal.gem?pal.gem:[62,76,148];
    var gem2=pal&&pal.gem?shadeV2(pal.gem,-.18):[136,62,58];
    crownRim(ctx,f,y,K.lift,vr==='fleurons');
    fillStrokeA(ctx,gold,shadeV2(gold,-.32),1.7*u,.9,q);
    band(ctx,f,y+1*u,6,gold,shadeV2(gold,-.32),q);
    if(K.studs)gemDot(ctx,f.cx,y+3*u,2.7*u,gem1,q);
    if(K.studs>1){
      gemDot(ctx,f.cx-f.halfL*.62,y+4*u,1.8*u,gem2,q);
      gemDot(ctx,f.cx+f.halfR*.62,y+4*u,1.8*u,gem2,q);
    }
  }
  function hwImperial(ctx, f, spec, K, vr, q) {
    var u=K.u,y=f.hairY+1*u+K.drop;
    var cap=[124,34,42];
    domePath(ctx,f,y+2*u,9*K.lift);
    fillStrokeA(ctx,cap,[70,24,30],1.5*u,.9,q);
    if(vr==='mitred'){
      ink(ctx,2.2*u,GOLD,1,q);
      ctx.beginPath();
      ctx.moveTo(f.cx,y+1*u);
      ctx.lineTo(f.cx,y-15*u*K.lift);
      ctx.stroke();
    }else{
      ink(ctx,2.4*u,GOLD,1,q);
      ctx.beginPath();
      ctx.moveTo(f.left+2*u,y-1*u);
      ctx.quadraticCurveTo(f.cx,y-26*u*K.lift,f.right-2*u,y-1*u);
      ctx.stroke();
      fEll(ctx,f.cx,y-20*u*K.lift,2.6*u,2.6*u,GOLD_L,1);
    }
    hwCrown(ctx,f,spec,K,vr==='mitred'?'fleurons':'points',q);
  }
  function hwHelm(ctx, f, spec, K, vr, q, pal) {
    var u=K.u;
    var steel=pal&&pal.metal?pal.metal:STEEL;
    var steelL=pal&&pal.metal?shadeV2(steel,.42):STEEL_L;
    var yBot=f.eyeY-7*u+K.drop;
    domePath(ctx,f,yBot,6*K.lift);
    fillStrokeA(ctx,steel,shadeV2(steel,-.5),1.8*u,.9,q);
    ctx.save();
    domePath(ctx,f,yBot,6*K.lift);
    ctx.clip();
    ctx.fillStyle=cssV2(steelL,.35);
    ctx.fillRect(f.cx+spec.lightSide*6*u,f.top-12*u,
      16*u*spec.lightSide,f.eyeY-f.top+14*u);
    if(vr==='banded'){
      /* a spangenhelm is plates on a frame, and the frame is what a
         viewer reads */
      ink(ctx,2.2*u,shadeV2(steel,-.22),.9,q);
      var i;
      for(i=-1;i<=1;i++){
        ctx.beginPath();
        ctx.moveTo(f.cx+i*f.halfR*.62,yBot+2*u);
        ctx.quadraticCurveTo(f.cx+i*f.halfR*.3,f.top-2*u,
          f.cx+i*2*u,f.top-5*u*K.lift);
        ctx.stroke();
      }
    }
    ctx.restore();
    band(ctx,f,f.eyeY-10*u+K.drop,6,shadeV2(steel,-.1),
      shadeV2(steel,-.55),q);
    ctx.fillStyle=cssV2(shadeV2(steel,-.05));
    ctx.fillRect(f.cx-2.3*u,f.eyeY-8*u+K.drop,4.6*u,
      f.A.noseBase[1]-f.eyeY+13*u);
  }
  function hwCoif(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var yBot=f.hairY+6*u+K.drop;
    domePath(ctx,f,yBot,2*K.lift);
    fillStrokeA(ctx,LINEN,[116,108,96],1.6*u,.9,q);
    band(ctx,f,f.hairY+K.drop,4,shadeV2(LINEN,-.04),[116,108,96],q);
  }
  function hwChaperon(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var cloth=shadeV2(spec.cloth.raw,-.12);
    if(vr==='rolled'){
      /* worn as a hat: the opening rolled into a doughnut, the tail
         hanging behind */
      var y=f.hairY+2*u+K.drop;
      domePath(ctx,f,y+6*u,3*K.lift);
      fillStrokeA(ctx,shadeV2(cloth,-.1),shadeV2(spec.cloth.raw,-.22),1.5*u,.9,q);
      ink(ctx,11*u*K.lift,cloth,1,q);
      ctx.beginPath();
      ctx.moveTo(f.left-4*u,y+2*u);
      ctx.quadraticCurveTo(f.cx,y-11*u*K.lift,f.right+4*u,y+2*u);
      ctx.stroke();
      return;
    }
    /* worn up as a hood: the near edge of the opening frames the face */
    ink(ctx,9*u,shadeV2(cloth,.08),1,q);
    hoodEdge(ctx,f,K,1);
    ctx.stroke();
    ink(ctx,1.7*u,shadeV2(spec.cloth.raw,-.22),.8,q);
    hoodEdge(ctx,f,K,1);
    ctx.stroke();
  }
  function hwVeil(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var yBot=f.hairY+6*u+K.drop;
    domePath(ctx,f,yBot,5*K.lift);
    fillStrokeA(ctx,LINEN,shadeV2(LINEN,-.22),1.5*u,.9,q);
    if(vr==='pinned'){
      ink(ctx,1.3*u,shadeV2(LINEN,-.26),.7,q);
      ctx.beginPath();
      ctx.moveTo(f.left+1*u,f.hairY+4*u+K.drop);
      ctx.quadraticCurveTo(f.cx+6*u,f.top+2*u,
        f.right-2*u,f.hairY-1*u+K.drop);
      ctx.stroke();
      if(K.studs){
        gemDot(ctx,f.right-4*u,f.hairY+1*u+K.drop,1.8*u,
          spec.tier>=4?GOLD_L:[136,62,58],q);
      }
      return;
    }
    band(ctx,f,f.hairY+1*u+K.drop,5,
      spec.tier>=4&&K.studs?GOLD:shadeV2(LINEN,-.08),undefined,q);
  }
  function hwWimple(ctx, f, spec, K, vr, q) {
    var u=K.u;
    hwVeil(ctx,f,spec,K,'fall',q);
    /* the bib: up over the jaw and down the throat */
    var deep=K.fall;
    ctx.beginPath();
    ctx.moveTo(f.jawL-3*u,f.jawY);
    ctx.quadraticCurveTo(f.chinX,f.chinY+13*u,f.jawR+3*u,f.jawY);
    ctx.lineTo(f.throatX+18*u,f.throatY+8*u*deep);
    ctx.quadraticCurveTo(f.throatX,f.throatY+17*u*deep,
      f.throatX-18*u,f.throatY+8*u*deep);
    ctx.closePath();
    fillStrokeA(ctx,LINEN,[116,108,96],1.4*u,.9,q);
    if(vr==='banded'){
      band(ctx,f,f.hairY+6*u+K.drop,4,shadeV2(LINEN,-.1),undefined,q);
    }
  }
  function hwTurban(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var turban=[224,214,192];
    /* the volume knob is capped: a turban is a wrap, not a beehive */
    var lift=Math.min(K.lift,1.05);
    var top=f.top-(lift-1)*8*u;
    domePath(ctx,f,f.hairY+9*u+K.drop,12*lift);
    fillStrokeA(ctx,turban,shadeV2(turban,-.24),1.7*u,.9,q);
    band(ctx,f,top+9*u,8,shadeV2(turban,-.08),undefined,q);
    band(ctx,f,top+20*u,8,turban,undefined,q);
    band(ctx,f,f.hairY+1*u+K.drop,8,shadeV2(turban,-.04),undefined,q);
    ink(ctx,1.2*u,shadeV2(turban,.22),.65,q);
    ctx.beginPath();
    ctx.moveTo(f.cx-3*u,top-8*u);
    ctx.quadraticCurveTo(f.cx+7*u,top+10*u,
      f.cx+2*u,f.hairY+8*u+K.drop);
    ctx.stroke();
    if(spec.tier>=5&&K.studs){
      gemDot(ctx,f.cx+2*u,f.hairY+2*u+K.drop,2.6*u,[42,104,82],q);
    }
  }
  function hwCap(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var felt=[92,70,54];
    var y=f.hairY+K.drop;
    if(vr==='brimmed'){
      brimPath(ctx,f,y+4*u,7,0);
      fillStrokeA(ctx,shadeV2(felt,-.14),shadeV2(felt,-.34),1.6*u,.9,q);
    }
    domePath(ctx,f,y+4*u,8*K.lift);
    fillStrokeA(ctx,felt,shadeV2(felt,-.26),1.7*u,.9,q);
    band(ctx,f,y,5,shadeV2(felt,-.08),undefined,q);
    if(K.studs>1){
      gemDot(ctx,f.cx+spec.lightSide*f.halfR*.6,y-1*u,1.9*u,GOLD_L,q);
    }
  }
  function hwKerchief(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var cloth=shadeV2(LINEN,-.07);
    /* wrapped low: ending at the hairline left a tall bare brow */
    var y=f.hairY+6*u+K.drop;
    domePath(ctx,f,y+4*u,3);
    fillStrokeA(ctx,cloth,shadeV2(cloth,-.28),1.5*u,.9,q);
    ink(ctx,1.1*u,shadeV2(cloth,-.22),.6,q);
    ctx.beginPath();
    ctx.moveTo(f.left-1*u,y+2*u);
    ctx.quadraticCurveTo(f.cx,y-5*u,f.right+1*u,y+2*u);
    ctx.stroke();
    if(vr==='chin'){
      /* tied under the chin: the edges frame the face and meet in a
         knot below the jaw */
      ctx.beginPath();
      ctx.moveTo(f.left-1*u,y+1*u);
      ctx.bezierCurveTo(f.left-4*u,f.jawY,f.chinX-12*u,
        f.chinY+6*u,f.chinX-2*u,f.chinY+10*u);
      ctx.lineTo(f.chinX+2*u,f.chinY+10*u);
      ctx.bezierCurveTo(f.chinX+12*u,f.chinY+6*u,
        f.right+4*u,f.jawY,f.right+1*u,y+1*u);
      ctx.lineTo(f.right+5*u,f.eyeY-2*u);
      ctx.bezierCurveTo(f.right+4*u,f.jawY+8*u,f.chinX+8*u,
        f.chinY+16*u,f.chinX,f.chinY+17*u);
      ctx.bezierCurveTo(f.chinX-8*u,f.chinY+16*u,
        f.left-4*u,f.jawY+8*u,f.left-5*u,f.eyeY-2*u);
      ctx.closePath();
      fillStrokeA(ctx,cloth,shadeV2(cloth,-.28),1.4*u,.9,q);
      fEll(ctx,f.chinX,f.chinY+14*u,4.6*u,3.4*u,shadeV2(cloth,.06),1);
      ink(ctx,1*u,shadeV2(cloth,-.3),.6,q);
      ctx.beginPath();
      ctx.moveTo(f.chinX-3*u,f.chinY+12*u);
      ctx.quadraticCurveTo(f.chinX,f.chinY+16*u,f.chinX+3*u,
        f.chinY+12*u);
      ctx.stroke();
      return;
    }
    /* the nape knot is laid in by the back pass, behind the head */
  }
  function hwFillet(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var cloth=shadeV2(LINEN,-.02);
    var y=f.hairY+2*u+K.drop;
    if(vr==='barbette'){
      /* the strap that passes under the chin goes on first */
      ink(ctx,5*u,cloth,1,q);
      ctx.beginPath();
      ctx.moveTo(f.left+1*u,y+2*u);
      ctx.bezierCurveTo(f.left-2*u,f.jawY+2*u,
        f.chinX-10*u,f.chinY+9*u,f.chinX,f.chinY+10*u);
      ctx.bezierCurveTo(f.chinX+10*u,f.chinY+9*u,
        f.right+2*u,f.jawY+2*u,f.right-1*u,y+2*u);
      ctx.stroke();
      ink(ctx,1*u,[150,142,126],.55,q);
      ctx.stroke();
    }
    band(ctx,f,y,5,cloth,[146,138,122],q);
    if(K.studs){
      band(ctx,f,y+1*u,2,GOLD,shadeV2(GOLD,-.3),q);
    }
    if(K.studs>1){
      gemDot(ctx,f.cx,y+2*u,1.8*u,[136,62,58],q);
    }
  }
  function hwStrawHat(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var straw=[206,178,112];
    var y=f.hairY+2*u+K.drop;
    var pilgrim=vr==='pilgrim';
    brimPath(ctx,f,y+5*u,pilgrim?12:16,pilgrim?7:0);
    fillStrokeA(ctx,straw,shadeV2(straw,-.3),1.7*u,.9,q);
    if(q.fine){
      /* plaited straw: rings round the brim, not a flat wash */
      ctx.save();
      brimPath(ctx,f,y+5*u,pilgrim?12:16,pilgrim?7:0);
      ctx.clip();
      ink(ctx,.8*u,shadeV2(straw,-.24),.45,q);
      var r;
      for(r=4;r<=16;r+=4){
        ctx.beginPath();
        ctx.ellipse(f.cx,y+5*u,f.halfR+r*u,(3+r*.5)*u,0,0,TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    domePath(ctx,f,y+4*u,(pilgrim?9:5)*K.lift);
    fillStrokeA(ctx,shadeV2(straw,.04),shadeV2(straw,-.3),1.6*u,.9,q);
    band(ctx,f,y+1*u,4,shadeV2(straw,-.16),undefined,q);
    /* no chin cord: at this framing a strap from brim to chin lies
       across the face and reads as a scratch on the drawing */
  }
  function hwFurHat(ctx, f, spec, K, vr, q) {
    var u=K.u;
    /* felt stays a hat brown; taking it from the garment handed a green
       tunic a green hat */
    var felt=[104,82,62];
    var fur=[96,80,66];
    var y=f.hairY+1*u+K.drop;
    var tall=vr==='tall'?1.6:1;
    domePath(ctx,f,y+5*u,10*K.lift*tall);
    fillStrokeA(ctx,felt,shadeV2(felt,-.3),1.7*u,.9,q);
    if(vr==='tall'&&q.fine){
      ink(ctx,1.1*u,shadeV2(felt,-.22),.5,q);
      ctx.beginPath();
      ctx.moveTo(f.cx-4*u,f.top-8*u*K.lift*tall);
      ctx.quadraticCurveTo(f.cx+3*u,f.top+6*u,f.cx-1*u,y+2*u);
      ctx.stroke();
    }
    furBand(ctx,f,y,7,fur,q);
    if(K.studs>1)gemDot(ctx,f.cx,y-2*u,2*u,GOLD_L,q);
  }
  function hwMitre(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var cloth=[238,233,222];
    var y=f.hairY+2*u+K.drop;
    var h=42*u*K.lift;
    ctx.beginPath();
    ctx.moveTo(f.left-1*u,y+3*u);
    ctx.bezierCurveTo(f.left+1*u,y-h*.46,
      f.cx-9*u,y-h*.84,f.cx,y-h);
    ctx.bezierCurveTo(f.cx+9*u,y-h*.84,
      f.right-1*u,y-h*.46,f.right+1*u,y+3*u);
    ctx.closePath();
    fillStrokeA(ctx,cloth,[166,158,142],1.7*u,.9,q);
    if(vr==='orphrey'){
      ink(ctx,4*u,GOLD,1,q);
      ctx.beginPath();
      ctx.moveTo(f.cx,y+2*u);
      ctx.lineTo(f.cx,y-h*.94);
      ctx.stroke();
      if(K.studs){
        gemDot(ctx,f.cx,y-h*.5,2.1*u,[62,76,148],q);
        if(K.studs>1)gemDot(ctx,f.cx,y-h*.76,1.6*u,[136,62,58],q);
      }
    }
    band(ctx,f,y,6,vr==='orphrey'?GOLD:shadeV2(cloth,-.1),undefined,q);
  }
  function hwGarland(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var y=f.hairY+1*u+K.drop;
    var n=vr==='laurel'?9:8;
    var leaf=[92,118,74];
    var accent=[196,110,100];
    var i,t,x,yy,side;
    ink(ctx,1.4*u,shadeV2(leaf,-.24),.8,q);
    ctx.beginPath();
    ctx.moveTo(f.left-2*u,y+1*u);
    ctx.quadraticCurveTo(f.cx,y-6*u,f.right+2*u,y+1*u);
    ctx.stroke();
    for(i=0;i<=n;i++){
      t=i/n;
      x=mixV2(f.left-2*u,f.right+2*u,t);
      yy=y+1*u-Math.sin(t*Math.PI)*7*u;
      side=i&1?1:-1;
      if(vr==='laurel'){
        fEll(ctx,x,yy-1.5*u,3.4*u,1.5*u,
          i&1?leaf:shadeV2(leaf,.12),.95,side*.5);
        fEll(ctx,x,yy+1.5*u,3.2*u,1.4*u,
          shadeV2(leaf,-.14),.95,-side*.5);
      }else{
        fEll(ctx,x,yy,2*u,1.6*u,shadeV2(leaf,-.06),.95);
        fEll(ctx,x,yy-1.4*u,2.4*u,2.2*u,
          i%3?[232,226,208]:accent,.95);
        if(K.studs){
          fEll(ctx,x,yy-1.4*u,.9*u,.9*u,[214,186,96],1);
        }
      }
    }
  }
  function hwCrespine(ctx, f, spec, K, vr, q) {
    var u=K.u;
    var y=f.hairY+5*u+K.drop;
    /* the caul holds the hair, so what is inside it is hair */
    domePath(ctx,f,y,4*K.lift);
    fillStrokeA(ctx,spec.hair.base,shadeV2(spec.hair.deep,-.1),1.4*u,.9,q);
    ctx.save();
    domePath(ctx,f,y,4*K.lift);
    ctx.clip();
    netFill(ctx,f,f.top-6*u,y,6*u,GOLD,q);
    if(K.studs>1&&q.fine){
      var gx,gy;
      for(gy=f.top-2*u;gy<y;gy+=6*u){
        for(gx=f.left;gx<f.right;gx+=6*u){
          fEll(ctx,gx,gy,1.1*u,1.1*u,[238,232,220],.9);
        }
      }
    }
    ctx.restore();
    band(ctx,f,f.hairY+1*u+K.drop,4,
      vr==='filleted'?GOLD:shadeV2(LINEN,-.06),undefined,q);
  }
  var HEADWEAR_DRAW = {
    circlet:hwCirclet,crown:hwCrown,imperial:hwImperial,helm:hwHelm,
    coif:hwCoif,chaperon:hwChaperon,veil:hwVeil,wimple:hwWimple,
    turban:hwTurban,cap:hwCap,kerchief:hwKerchief,fillet:hwFillet,
    strawHat:hwStrawHat,furHat:hwFurHat,mitre:hwMitre,
    garland:hwGarland,crespine:hwCrespine
  };
  function paintGeneratedHeadwear(ctx, scaffold, spec, quality) {
    var kind=spec.headwear;
    if(kind==='none')return;
    var draw=HEADWEAR_DRAW[kind];
    if(!draw)return;
    draw(ctx,scaffold.face,spec,hwKnobs(scaffold.face,spec),
      spec.headwearVariant,quality);
  }
  function hexToRgbV2(value) {
    if(Array.isArray(value))return value;
    if(typeof value!=='string')return null;
    var m=/^#([0-9a-f]{6})$/i.exec(value);
    if(!m)return null;
    var n=parseInt(m[1],16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  /* An equipped crown or helm uses the same construction the generated
     wardrobe does; the item's metal, gem, quality, and visual seed
     choose its colors and details. Other head art kinds fall back to
     the procedural item art scaled to the head. */
  function paintHeadItem(ctx, scaffold, spec, item, q) {
    var f=scaffold.face,kind=item.art.kind;
    if(kind!=='helm'&&kind!=='crown'){
      drawItemArt(ctx,item,f.cx,f.top+2,(f.right-f.left)/52,0,false);
      return;
    }
    var K=hwKnobs(f,spec);
    K.studs=item.quality==='masterwork'||item.quality==='unique'?2:1;
    K.lift=mixV2(.9,1.5,byte(item.visualSeed,5)/255);
    var pal={
      metal:hexToRgbV2(item.art.metals&&item.art.metals[0])||
        (kind==='crown'?GOLD:STEEL),
      gem:hexToRgbV2(item.art.gems&&item.art.gems[0])
    };
    if(kind==='helm'){
      hwHelm(ctx,f,spec,K,byte(item.visualSeed,4)&1?'banded':'nasal',q,pal);
    }else{
      hwCrown(ctx,f,spec,K,
        K.studs>1||(byte(item.visualSeed,4)&1)?'fleurons':'points',q,pal);
    }
  }
  /* ---------- what hangs behind the head ----------
     Drawn between the body and the head so it reads as cloth the head
     is in front of. */
  function backFall(ctx, f, wide, depth, color, edge, width, alpha, q) {
    var u=f.u,hh=f.chinBottom-f.top;
    var bot=f.chinBottom+hh*depth;
    ctx.beginPath();
    ctx.moveTo(f.cx,f.top-9*u);
    ctx.bezierCurveTo(f.right+wide*.58,f.top+2*u,
      f.right+wide*.78,f.eyeY+hh*.22,f.right+wide,bot-hh*.1);
    ctx.lineTo(f.cx+wide*.8,bot);
    ctx.lineTo(f.cx-wide*.8,bot);
    ctx.lineTo(f.left-wide,bot-hh*.1);
    ctx.bezierCurveTo(f.left-wide*.78,f.eyeY+hh*.22,
      f.left-wide*.58,f.top+2*u,f.cx,f.top-9*u);
    ctx.closePath();
    fillStrokeA(ctx,color,edge,width,alpha,q);
  }
  /* a rope of cloth hanging off the head: a liripipe, a kerchief tail,
     a mitre lappet, a turban tail */
  function clothTail(ctx, f, x, top, side, len, wide, color, edge, q) {
    var N=9,pts=[],half=[],i,t;
    for(i=0;i<N;i++){
      t=i/(N-1);
      pts.push([x+side*Math.sin(t*1.9)*wide*1.5,top+len*t]);
      half.push(wide*(1-t*.42)*(1+Math.sin(t*Math.PI)*.14));
    }
    fallPath(ctx,pts,half);
    fillStrokeA(ctx,color,edge,1.4*f.u,.9,q);
  }
  function paintBackCostume(ctx, scaffold, spec, q) {
    var f=scaffold.face,hw=spec.headwear,vr=spec.headwearVariant;
    if(hw==='none')return;
    var K=hwKnobs(f,spec),u=K.u,hh=K.hh;
    var sx=-spec.lightSide;
    if(hw==='chaperon'){
      var cloth=shadeV2(spec.cloth.raw,-.12);
      backFall(ctx,f,32*u,1.06*K.fall,cloth,
        shadeV2(spec.cloth.raw,-.22),2*u,.9,q);
      var rolled=vr==='rolled';
      clothTail(ctx,f,f.cx+sx*(f.halfR+6*u),
        rolled?f.eyeY:f.top+4*u,sx,
        hh*(rolled?.85:1.15)*K.fall,5*u,
        shadeV2(cloth,-.06),shadeV2(spec.cloth.raw,-.22),q);
      return;
    }
    if(hw==='veil'||hw==='wimple'||hw==='kerchief'){
      if(hw==='kerchief'){
        if(vr==='chin')return;
        /* the nape knot peeks from behind the jaw: drawn in the back
           pass and overlapping the silhouette, the head crops it, so it
           cannot float beside the face */
        var ks=sx<0?-1:1;
        var kx=faceEdgeAt(f,f.jawY-1*u,ks)+ks*2.5*u;
        fEll(ctx,kx,f.jawY-1*u,4.6*u,3.6*u,shadeV2(LINEN,-.04),1);
        ink(ctx,1*u,shadeV2(LINEN,-.3),.55,q);
        ctx.beginPath();
        ctx.ellipse(kx,f.jawY-1*u,4.6*u,3.6*u,0,0,TAU);
        ctx.stroke();
        return;
      }
      backFall(ctx,f,22*u,(vr==='pinned'?.58:.83)*K.fall,LINEN,
        shadeV2(LINEN,-.2),1.7*u,.65,q);
      return;
    }
    if(hw==='mitre'){
      clothTail(ctx,f,f.cx-f.halfR*.62,f.hairY+6*u,-.3,
        hh*.78*K.fall,3.4*u,[232,226,214],[166,158,142],q);
      clothTail(ctx,f,f.cx+f.halfR*.62,f.hairY+6*u,.3,
        hh*.78*K.fall,3.4*u,[232,226,214],[166,158,142],q);
      return;
    }
    if(hw==='turban'&&vr==='tailed'){
      /* the tail starts tucked inside the silhouette so only its lower
         fall shows past the jaw; a full-length slab beside the face
         read as a plank, not cloth */
      clothTail(ctx,f,f.cx+sx*(f.halfR-1*u),f.eyeY-10*u,sx,
        hh*.42*K.fall,4*u,[224,214,192],
        shadeV2([224,214,192],-.26),q);
    }
  }
  /* where each wound place sits on the face */
  function woundSpot(f, place, side) {
    var u=f.u;
    var eye=side<0?f.A.eyeL:f.A.eyeR;
    var edge=side<0?f.left:f.right;
    if(place==='brow')return {x:eye[0]+side*2*u,y:eye[1]-11*u,r:9*u};
    if(place==='jaw'){
      return {x:mixV2(f.chinX,edge,.58),y:f.jawY+2*u,r:8*u};
    }
    return {x:mixV2(eye[0],edge,.32),y:mixV2(eye[1],f.jawY,.58),r:9.5*u};
  }
  function paintMarks(ctx, scaffold, spec, q) {
    var f=scaffold.face,a=scaffold.anchors,u=f.u,i,side;
    var rng=streamV2(spec.identity,'detail');
    ctx.save();
    headPath(ctx,f);
    ctx.clip();
    if(spec.elder>.08&&q.fine){
      /* crow's feet and the forehead's own lines */
      ink(ctx,.8*u,spec.skin.line,.18+spec.elder*.2,q);
      for(i=0;i<3;i++){
        for(side=-1;side<=1;side+=2){
          var ex=side<0?a.eyeL[0]:a.eyeR[0];
          ctx.beginPath();
          ctx.moveTo(ex+side*(6+i*1.5)*u,f.eyeY+(4+i*2)*u);
          ctx.quadraticCurveTo(ex+side*10*u,f.eyeY+(5+i*2)*u,
            ex+side*(12+i)*u,f.eyeY+(4+i*2)*u);
          ctx.stroke();
        }
      }
      ink(ctx,.7*u,spec.skin.line,.14+spec.elder*.18,q);
      for(i=0;i<2;i++){
        ctx.beginPath();
        ctx.moveTo(f.cx-11*u,f.eyeY-(20+i*5)*u);
        ctx.quadraticCurveTo(f.cx,f.eyeY-(23+i*5)*u,
          f.cx+11*u,f.eyeY-(20+i*5)*u);
        ctx.stroke();
      }
    }
    if(spec.freckles>0&&q.fine){
      var count=Math.round(spec.freckles*18);
      ctx.fillStyle=cssV2(shadeV2(spec.skin.deep,-.02),.28);
      for(i=0;i<count;i++){
        var fs=rng()<.5?-1:1;
        var fe=fs<0?a.eyeL:a.eyeR;
        ctx.beginPath();
        ctx.arc(fe[0]+(rng()-.5)*16*u,f.eyeY+(9+rng()*9)*u,
          (.45+rng()*.45)*u,0,TAU);
        ctx.fill();
      }
    }
    if(spec.scarred){
      var sEye=spec.woundSide<0?a.eyeL:a.eyeR;
      ink(ctx,1.4*u,[154,84,72],.72,q);
      ctx.beginPath();
      ctx.moveTo(sEye[0]+spec.woundSide*7*u,sEye[1]-7*u);
      ctx.quadraticCurveTo(sEye[0]+spec.woundSide*10*u,sEye[1]+3*u,
        sEye[0]+spec.woundSide*8*u,sEye[1]+13*u);
      ctx.stroke();
    }
    /* wound decals rotate places so several never stack blindly;
       bandages wait for the overlay pass */
    var places=['cheek','brow','jaw'];
    for(i=0;i<spec.marks.length;i++){
      var mark=spec.marks[i];
      if(mark.mark==='bandage')continue;
      side=i%2?-spec.woundSide:spec.woundSide;
      var spot=woundSpot(f,places[i%3],side);
      var sev=.55+clampV2(mark.severity,0,2)*.45;
      if(mark.mark==='cut'){
        ink(ctx,1.3*u,[148,46,40],.72,q);
        ctx.beginPath();
        ctx.moveTo(spot.x-side*spot.r*.4,spot.y-spot.r*.55*sev);
        ctx.quadraticCurveTo(spot.x+side*spot.r*.15,spot.y,
          spot.x+side*spot.r*.35,spot.y+spot.r*.6*sev);
        ctx.stroke();
        if(q.fine){
          ink(ctx,.7*u,[104,32,28],.6,q);
          var ci;
          for(ci=0;ci<2;ci++){
            var cy2=mixV2(spot.y-spot.r*.3,spot.y+spot.r*.3,(ci+.5)/2);
            ctx.beginPath();
            ctx.moveTo(spot.x-side*spot.r*.14-spot.r*.16,cy2);
            ctx.lineTo(spot.x-side*spot.r*.14+spot.r*.16,cy2+1*u);
            ctx.stroke();
          }
        }
      }else{
        softE(ctx,spot.x,spot.y,spot.r*.85*sev,spot.r*.65*sev,
          [92,54,100],.34);
        softE(ctx,spot.x+side*spot.r*.15,spot.y,spot.r*.4*sev,
          spot.r*.3*sev,[64,40,80],.3);
      }
    }
    ctx.restore();
    if(spec.oneEyed){
      /* the socket goes dark and the lids close over it */
      var eye=spec.woundSide<0?a.eyeL:a.eyeR;
      fEll(ctx,eye[0],eye[1],8*u,6*u,[45,34,29]);
      ink(ctx,1.7*u,[35,25,22],.9,q);
      ctx.beginPath();
      ctx.moveTo(eye[0]-10*u,eye[1]-3*u);
      ctx.lineTo(eye[0]+10*u,eye[1]+3*u);
      ctx.stroke();
    }
  }
  /* Linen goes over everything: over the hair, over the hat, over the
     mark it is dressing, so it draws in its own pass at the end. */
  function paintMarkOverlay(ctx, scaffold, spec, q) {
    var f=scaffold.face,u=f.u,i,n=0;
    for(i=0;i<spec.marks.length;i++){
      if(spec.marks[i].mark!=='bandage')continue;
      var sev=clampV2(spec.marks[i].severity*.5,.3,1);
      var wrap=spec.marks[i].severity>=2&&
        saltedByte(spec.identity,'decal-wrap',i)>128;
      var drop=n*4*u;
      n++;
      if(wrap){
        /* wrapped over the skull: the cap of linen and the turns of it */
        var yBot=f.eyeY-6*u+drop;
        domePath(ctx,f,yBot,3);
        fillStrokeA(ctx,LINEN,[128,116,98],1.5*u,.9,q);
        ink(ctx,1*u,[176,164,142],.7,q);
        var w;
        for(w=0;w<3;w++){
          ctx.beginPath();
          ctx.moveTo(f.left-1*u,yBot-w*7*u-2*u);
          ctx.quadraticCurveTo(f.cx+spec.woundSide*6*u,yBot-w*7*u-8*u,
            f.right+1*u,yBot-w*7*u-4*u);
          ctx.stroke();
        }
        fEll(ctx,f.cx+spec.woundSide*(f.halfR*.72),yBot-3*u,4*u,3*u,
          shadeV2(LINEN,-.05),1);
      }else{
        /* the brow strip */
        var y0=f.eyeY-(21+sev*5)*u+drop;
        var h=(6+sev*3)*u;
        ctx.beginPath();
        ctx.moveTo(f.left-1*u,y0);
        ctx.quadraticCurveTo(f.cx,y0-4*u,f.right+1*u,y0);
        ctx.lineTo(f.right,y0+h);
        ctx.quadraticCurveTo(f.cx,y0+h-4*u,f.left,y0+h);
        ctx.closePath();
        fillStrokeA(ctx,LINEN,[128,116,98],1*u,.9,q);
        if(q.fine){
          ink(ctx,.7*u,[154,139,114],.45,q);
          var s;
          for(s=-1;s<=1;s+=2){
            ctx.beginPath();
            ctx.moveTo(f.cx+s*8*u,y0-1*u);
            ctx.lineTo(f.cx+s*9*u,y0+h-1*u);
            ctx.stroke();
          }
        }
      }
    }
  }
  function paintJewelry(ctx, scaffold, spec, descriptor, q) {
    var f=scaffold.face,a=scaffold.anchors,u=f.u;
    /* Nothing hangs at the neck in a bust: the crop leaves no chest to
       hang it on. The full figure has one, so it carries equipped neck
       items and the generated neckwear of rank and clergy. */
    if(descriptor.frame==='figure'&&descriptor.loadout.neck){
      drawItemArt(ctx,descriptor.loadout.neck,f.throatX,f.collarY+14,
        .68,0,false);
    }else if(descriptor.frame==='figure'&&
      (spec.tier>=4||((spec.profession==='priest'||spec.profession==='monk')&&
        spec.faith==='christian'))){
      var chainY=f.collarY+8*u;
      ink(ctx,1.2*u,GOLD,.9,q);
      ctx.beginPath();
      ctx.moveTo(f.throatX-11*u,chainY-3*u);
      ctx.quadraticCurveTo(f.throatX,chainY+5*u,f.throatX+11*u,chainY-3*u);
      ctx.stroke();
      if(spec.faith==='christian'){
        ctx.fillStyle=cssV2(GOLD_L);
        ctx.fillRect(f.throatX-1*u,chainY+3*u,2*u,7*u);
        ctx.fillRect(f.throatX-3*u,chainY+5*u,6*u,1.8*u);
      }else{
        gemDot(ctx,f.throatX,chainY+5*u,2.2*u,[42,104,108],q);
      }
    }
    if(spec.earring){
      var ears=[a.earL,a.earR],i;
      for(i=0;i<2;i++){
        ink(ctx,1.1*u,GOLD,.9,q);
        ctx.beginPath();
        ctx.arc(ears[i][0],ears[i][1]+11*u*spec.earSize,2.2*u,0,TAU);
        ctx.stroke();
      }
    }
  }
  /* ---------- the standing figure ----------
     Ported from the reference: hose with garters, splayed shoes, a
     gown with the one detail that names its cloth kind, sleeves with
     cuffs, and hands with fingers and a thumb web. */
  function figureCloth(spec) {
    var raw=spec.cloth.raw;
    return {base:raw,dark:shadeV2(raw,-.12),deep:shadeV2(raw,-.22),
      light:shadeV2(raw,.11),
      trim:spec.tier>=3?[190,160,78]:[146,126,92],
      fur:spec.tier>=6?[232,226,214]:[122,104,84]};
  }
  function legPath(ctx, b, side) {
    var xh=b.cx+side*b.stance,xa=b.cx+side*b.stance*.92;
    var tk=b.hipY+(b.kneeY-b.hipY)*.5;
    var ta=b.kneeY+(b.ankleY-b.kneeY)*.5;
    ctx.beginPath();
    ctx.moveTo(xh-b.legTop,b.hipY-4);
    ctx.bezierCurveTo(xh-b.legTop*.98,tk,xh-b.legKnee*1.04,b.kneeY-6,
      xh-b.legKnee,b.kneeY);
    ctx.bezierCurveTo(xh-b.legKnee*.92,ta,xa-b.legAnkle*1.1,
      b.ankleY-12,xa-b.legAnkle,b.ankleY);
    ctx.lineTo(xa+b.legAnkle,b.ankleY);
    ctx.bezierCurveTo(xa+b.legAnkle*1.1,b.ankleY-12,
      xh+b.legKnee*.92,ta,xh+b.legKnee,b.kneeY);
    ctx.bezierCurveTo(xh+b.legKnee*1.04,b.kneeY-6,xh+b.legTop*.98,tk,
      xh+b.legTop,b.hipY-4);
    ctx.closePath();
  }
  /* hose were two legs seamed up the back, bound with windings below a
     working hem */
  function legDetail(ctx, b, spec, hose, side, q) {
    var hh=b.headH;
    var xh=b.cx+side*b.stance,xa=b.cx+side*b.stance*.92;
    var mid=(b.hipY+b.kneeY)*.5;
    var g,gy,gx,gw,t;
    ctx.save();
    legPath(ctx,b,side);
    ctx.clip();
    ink(ctx,1.1,shadeV2(hose,-.28),.5,q);
    ctx.beginPath();
    ctx.moveTo(xh+side*b.legTop*.34,b.hipY);
    ctx.bezierCurveTo(xh+side*b.legKnee*.40,mid,
      xh+side*b.legKnee*.34,b.kneeY,
      xa+side*b.legAnkle*.30,b.ankleY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xh-b.legKnee*.82,b.kneeY-hh*.025);
    ctx.quadraticCurveTo(xh,b.kneeY+hh*.035,xh+b.legKnee*.82,
      b.kneeY-hh*.025);
    ctx.stroke();
    if(spec.tier<=2||spec.profession==='soldier'){
      ink(ctx,hh*.038,shadeV2(hose,-.36),.85,q);
      for(g=0;g<3;g++){
        t=.18+g*.26;
        gy=b.kneeY+(b.ankleY-b.kneeY)*t;
        gx=mixV2(xh,xa,t);
        gw=mixV2(b.legKnee,b.legAnkle,t)*1.5;
        ctx.beginPath();
        ctx.moveTo(gx-gw,gy-hh*.022);
        ctx.lineTo(gx+gw,gy+hh*.022);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  /* nearly front on, a foot shows its breadth and splays outward */
  function shoePath(ctx, b, side) {
    var x=b.cx+side*b.stance*.95;
    var top=b.soleY-b.shoeH;
    var inner=x-side*b.shoeW*.78;
    var outer=x+side*b.shoeW*1.16;
    ctx.beginPath();
    ctx.moveTo(inner,top+b.shoeH*.18);
    ctx.quadraticCurveTo(x,top-b.shoeH*.12,x+side*b.shoeW*.58,top+b.shoeH*.1);
    ctx.bezierCurveTo(outer,top+b.shoeH*.42,outer,b.soleY-b.shoeH*.12,
      outer-side*b.shoeW*.1,b.soleY);
    ctx.lineTo(inner-side*b.shoeW*.06,b.soleY);
    ctx.quadraticCurveTo(inner-side*b.shoeW*.16,b.soleY-b.shoeH*.45,
      inner,top+b.shoeH*.18);
    ctx.closePath();
  }
  function gownPath(ctx, b) {
    var hemHalf=b.hipHalf*(b.floorLength?1.62:1.18);
    ctx.beginPath();
    ctx.moveTo(b.cx-b.shoulderHalf*.34,b.shoulderY-4);
    ctx.bezierCurveTo(b.cx-b.shoulderHalf*.86,b.shoulderY+2,
      b.cx-b.chestHalf,b.chestY-8,b.cx-b.chestHalf,b.chestY);
    ctx.bezierCurveTo(b.cx-b.chestHalf,b.waistY-10,
      b.cx-b.waistHalf,b.waistY-6,b.cx-b.waistHalf,b.waistY);
    ctx.bezierCurveTo(b.cx-b.waistHalf,b.hipY-12,
      b.cx-b.hipHalf,b.hipY-8,b.cx-b.hipHalf,b.hipY);
    ctx.bezierCurveTo(b.cx-b.hipHalf*1.02,b.hipY+(b.hemY-b.hipY)*.55,
      b.cx-hemHalf*.96,b.hemY-10,b.cx-hemHalf,b.hemY);
    ctx.quadraticCurveTo(b.cx,b.hemY+b.headH*(b.floorLength?.07:.05),
      b.cx+hemHalf,b.hemY);
    ctx.bezierCurveTo(b.cx+hemHalf*.96,b.hemY-10,
      b.cx+b.hipHalf*1.02,b.hipY+(b.hemY-b.hipY)*.55,b.cx+b.hipHalf,b.hipY);
    ctx.bezierCurveTo(b.cx+b.hipHalf,b.hipY-8,
      b.cx+b.waistHalf,b.hipY-12,b.cx+b.waistHalf,b.waistY);
    ctx.bezierCurveTo(b.cx+b.waistHalf,b.waistY-6,
      b.cx+b.chestHalf,b.waistY-10,b.cx+b.chestHalf,b.chestY);
    ctx.bezierCurveTo(b.cx+b.chestHalf,b.chestY-8,
      b.cx+b.shoulderHalf*.86,b.shoulderY+2,
      b.cx+b.shoulderHalf*.34,b.shoulderY-4);
    ctx.closePath();
  }
  function hemLine(ctx, b, rise) {
    var hemHalf=b.hipHalf*(b.floorLength?1.62:1.18);
    var sag=b.headH*(b.floorLength?.07:.05);
    ctx.beginPath();
    ctx.moveTo(b.cx-hemHalf*.97,b.hemY-rise);
    ctx.quadraticCurveTo(b.cx,b.hemY+sag-rise,b.cx+hemHalf*.97,b.hemY-rise);
  }
  /* each cloth kind gets the one feature that names it: quilting on a
     gambeson, buttons on a doublet and cassock, a scapular on a habit,
     banded trim on court dress, fur on royal, a laced slit on a tunic */
  function topDetail(ctx, b, spec, cl, q) {
    var hh=b.headH;
    var nHalf=b.shoulderHalf*.34,nY=b.shoulderY-4;
    var kind=b.kind;
    var seam=shadeV2(cl.deep,-.12);
    var i,x,y,n,qx;
    if(kind==='gambeson'){
      ink(ctx,1.15,seam,.6,q);
      for(x=-3;x<=3;x++){
        qx=b.cx+x*hh*.155;
        ctx.beginPath();
        ctx.moveTo(qx,b.shoulderY+hh*.18);
        ctx.bezierCurveTo(qx+x*1.5,b.waistY,qx+x*3,b.hipY,
          qx+x*5,b.hemY-2);
        ctx.stroke();
      }
      ink(ctx,1.4,shadeV2(cl.deep,-.2),.7,q);
      ctx.beginPath();
      ctx.moveTo(b.cx-nHalf*1.15,nY+hh*.06);
      ctx.quadraticCurveTo(b.cx,nY+hh*.16,b.cx+nHalf*1.15,nY+hh*.06);
      ctx.stroke();
    }else if(kind==='doublet'){
      ink(ctx,1.1,seam,.6,q);
      ctx.beginPath();
      ctx.moveTo(b.cx-hh*.055,nY+2);
      ctx.lineTo(b.cx-hh*.055,b.hemY-hh*.03);
      ctx.stroke();
      for(i=0;i<6;i++){
        y=nY+hh*.09+(b.hemY-nY-hh*.16)*(i/5);
        gemDot(ctx,b.cx+hh*.012,y,hh*.016,cl.trim,q);
      }
    }else if(kind==='cassock'){
      n=b.floorLength?11:7;
      for(i=0;i<n;i++){
        y=nY+hh*.09+(b.hemY-nY-hh*.18)*(i/(n-1));
        fEll(ctx,b.cx,y,hh*.015,hh*.015,shadeV2(cl.base,.2));
      }
      ink(ctx,1.3,shadeV2(cl.light,-.02),.5,q);
      ctx.beginPath();
      ctx.moveTo(b.cx-nHalf,nY+hh*.04);
      ctx.quadraticCurveTo(b.cx,nY+hh*.13,b.cx+nHalf,nY+hh*.04);
      ctx.stroke();
    }else if(kind==='habit'){
      var sw=b.waistHalf*.58;
      ctx.beginPath();
      ctx.moveTo(b.cx-sw,nY+hh*.05);
      ctx.lineTo(b.cx-sw*1.14,b.hemY-hh*.10);
      ctx.lineTo(b.cx+sw*1.14,b.hemY-hh*.10);
      ctx.lineTo(b.cx+sw,nY+hh*.05);
      ctx.closePath();
      fillStrokeA(ctx,shadeV2(cl.dark,-.07),shadeV2(cl.deep,-.16),1.3,.75,q);
    }else if(kind==='court'||kind==='royal'){
      ink(ctx,2.6,cl.trim,.85,q);
      ctx.beginPath();
      ctx.moveTo(b.cx-nHalf-hh*.06,nY+hh*.05);
      ctx.quadraticCurveTo(b.cx,nY+hh*.19,b.cx+nHalf+hh*.06,nY+hh*.05);
      ctx.stroke();
      ink(ctx,2.1,cl.trim,.78,q);
      ctx.beginPath();
      ctx.moveTo(b.cx,nY+hh*.17);
      ctx.lineTo(b.cx,b.hemY-hh*.05);
      ctx.stroke();
      if(kind==='royal'){
        /* the ermine mantle hangs over the shoulders and dips at the
           breast, ticked rather than drawn hair by hair */
        var sh2=b.shoulderHalf;
        ctx.beginPath();
        ctx.moveTo(b.cx-sh2*.88,b.shoulderY+hh*.13);
        ctx.bezierCurveTo(b.cx-sh2*.58,b.shoulderY-hh*.02,
          b.cx-nHalf*1.05,nY-2,b.cx,nY);
        ctx.bezierCurveTo(b.cx+nHalf*1.05,nY-2,
          b.cx+sh2*.58,b.shoulderY-hh*.02,
          b.cx+sh2*.88,b.shoulderY+hh*.13);
        ctx.bezierCurveTo(b.cx+sh2*.46,b.shoulderY+hh*.21,
          b.cx-sh2*.46,b.shoulderY+hh*.21,
          b.cx-sh2*.88,b.shoulderY+hh*.13);
        ctx.closePath();
        fillStrokeA(ctx,cl.fur,shadeV2(cl.fur,-.3),1.3,.9,q);
        ink(ctx,.8,shadeV2(cl.fur,-.34),.45,q);
        for(i=-4;i<=4;i++){
          x=b.cx+i*sh2*.18;
          y=b.shoulderY+hh*(.075+.05*(1-Math.abs(i)/4));
          ctx.beginPath();
          ctx.arc(x,y,hh*.028,.3,Math.PI*.85);
          ctx.stroke();
        }
      }
    }else{
      /* a tunic is got into through a laced slit at the throat */
      ink(ctx,1.2,seam,.6,q);
      ctx.beginPath();
      ctx.moveTo(b.cx,nY+1);
      ctx.lineTo(b.cx,nY+hh*.17);
      ctx.stroke();
      ink(ctx,1,seam,.55,q);
      ctx.beginPath();
      for(i=0;i<4;i++){
        x=b.cx+(i%2?1:-1)*hh*.048;
        y=nY+hh*(.05+i*.038);
        if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.stroke();
      if(kind==='cote'){
        ink(ctx,1.1,seam,.5,q);
        ctx.beginPath();
        ctx.moveTo(b.cx,nY+hh*.19);
        ctx.lineTo(b.cx,b.hemY-hh*.04);
        ctx.stroke();
      }
    }
    if(kind!=='habit'){
      ink(ctx,1.2,seam,.45,q);
      hemLine(ctx,b,b.headH*.05);
      ctx.stroke();
    }
  }
  /* an arm at rest leaves the shoulder angled out and hangs the hand
     just clear of the hem */
  function armPoints(b, side) {
    var hh=b.headH,fem=b.fem;
    return {
      shoulderX:b.cx+side*hh*(fem?.600:.655),
      elbowX:b.cx+side*hh*(fem?.645:.705),
      wristX:b.cx+side*hh*(fem?.690:.750),
      shoulderY:b.shoulderY-hh*.02,
      elbowY:b.waistY+hh*.04,
      wristY:b.hipY+hh*.10
    };
  }
  function sleevePath(ctx, b, side) {
    var a=armPoints(b,side);
    var eR=b.armR*.84;
    ctx.beginPath();
    ctx.moveTo(a.shoulderX-side*b.armR,a.shoulderY);
    ctx.bezierCurveTo(a.shoulderX-side*b.armR*1.05,b.chestY-4,
      a.elbowX-side*eR*1.15,b.chestY+8,a.elbowX-side*eR,a.elbowY);
    ctx.bezierCurveTo(a.elbowX-side*eR*.95,a.elbowY+b.headH*.14,
      a.wristX-side*b.wristR,a.wristY-b.headH*.12,
      a.wristX-side*b.wristR,a.wristY);
    ctx.lineTo(a.wristX+side*b.wristR,a.wristY);
    ctx.bezierCurveTo(a.wristX+side*b.wristR*1.15,
      a.wristY-b.headH*.14,a.elbowX+side*eR*1.08,
      a.elbowY+b.headH*.04,a.elbowX+side*eR*1.05,a.elbowY-b.headH*.04);
    ctx.bezierCurveTo(a.elbowX+side*eR*1.08,b.chestY,
      b.cx+side*b.shoulderHalf*.99,b.shoulderY+b.headH*.09,
      b.cx+side*b.shoulderHalf*.95,a.shoulderY+b.headH*.05);
    ctx.quadraticCurveTo(b.cx+side*b.shoulderHalf*.70,
      a.shoulderY-b.headH*.045,a.shoulderX-side*b.armR,a.shoulderY);
    ctx.closePath();
  }
  function sleeveDetail(ctx, b, side, cl, q) {
    var a=armPoints(b,side),hh=b.headH;
    var court=b.kind==='court'||b.kind==='royal';
    if(b.kind==='gambeson'){
      var eR=b.armR*.84,g;
      ink(ctx,1.05,shadeV2(cl.deep,-.12),.5,q);
      for(g=-1;g<=1;g+=2){
        ctx.beginPath();
        ctx.moveTo(a.shoulderX+side*g*b.armR*.42,a.shoulderY+hh*.09);
        ctx.bezierCurveTo(a.elbowX+side*g*eR*.46,b.chestY+hh*.06,
          a.elbowX+side*g*eR*.44,a.elbowY,
          a.wristX+side*g*b.wristR*.46,a.wristY-hh*.1);
        ctx.stroke();
      }
    }
    ink(ctx,court?2.1:1.15,court?cl.trim:shadeV2(cl.deep,-.14),
      court?.8:.55,q);
    ctx.beginPath();
    ctx.moveTo(a.wristX-side*b.wristR*1.04,a.wristY-hh*.085);
    ctx.quadraticCurveTo(a.wristX,a.wristY-hh*.045,
      a.wristX+side*b.wristR*1.04,a.wristY-hh*.085);
    ctx.stroke();
  }
  /* The hand is read from its web: the deep notch between thumb and
     forefinger that nothing else on a hand has. Fingers end at
     different heights and the thumb hangs a quarter past the notch. */
  var HAND = {
    tips:[
      {cx:.86,cy:1.01,vx:.56,vy:.80},
      {cx:.34,cy:1.135,vx:.12,vy:.89},
      {cx:-.10,cy:1.18,vx:-.32,vy:.91},
      {cx:-.59,cy:1.085,vx:-.66,vy:.76}
    ],
    seams:[[.56,.60,.56,.79],[.12,.65,.12,.88],[-.32,.63,-.32,.90]]
  };
  function handPath(ctx, b, side, hx, hy) {
    var w=b.handW,L=b.handLen,i;
    function X(v) { return hx+side*w*v; }
    function Y(t) { return hy+L*t; }
    ctx.beginPath();
    ctx.moveTo(X(.52),Y(0));
    ctx.bezierCurveTo(X(.80),Y(.14),X(.94),Y(.30),X(.95),Y(.52));
    ctx.bezierCurveTo(X(.95),Y(.62),X(.93),Y(.66),X(.92),Y(.70));
    for(i=0;i<HAND.tips.length;i++){
      var tip=HAND.tips[i];
      ctx.quadraticCurveTo(X(tip.cx),Y(tip.cy),X(tip.vx),Y(tip.vy));
    }
    ctx.bezierCurveTo(X(-.70),Y(.66),X(-.62),Y(.52),X(-.52),Y(.42));
    ctx.bezierCurveTo(X(-.78),Y(.48),X(-1.02),Y(.58),X(-1.16),Y(.68));
    ctx.bezierCurveTo(X(-1.30),Y(.68),X(-1.34),Y(.56),X(-1.26),Y(.46));
    ctx.bezierCurveTo(X(-1.16),Y(.30),X(-.88),Y(.12),X(-.52),Y(0));
    ctx.closePath();
  }
  function handDetail(ctx, b, side, hx, hy, spec, q) {
    var w=b.handW,L=b.handLen,i;
    var inkC=shadeV2(spec.skin.base,-.34);
    function X(v) { return hx+side*w*v; }
    function Y(t) { return hy+L*t; }
    ink(ctx,1.05,inkC,.7,q);
    ctx.beginPath();
    ctx.moveTo(X(.88),Y(.54));
    ctx.quadraticCurveTo(X(.05),Y(.68),X(-.58),Y(.56));
    ctx.stroke();
    for(i=0;i<HAND.seams.length;i++){
      var s=HAND.seams[i];
      ctx.beginPath();
      ctx.moveTo(X(s[0]),Y(s[1]));
      ctx.lineTo(X(s[2]),Y(s[3]));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(X(-.56),Y(.40));
    ctx.quadraticCurveTo(X(-.70),Y(.26),X(-.72),Y(.08));
    ctx.stroke();
    ink(ctx,.85,inkC,.42,q);
    ctx.beginPath();
    ctx.moveTo(X(.82),Y(.71));
    ctx.quadraticCurveTo(X(.05),Y(.83),X(-.60),Y(.75));
    ctx.moveTo(X(-1.24),Y(.52));
    ctx.lineTo(X(-.98),Y(.56));
    ctx.stroke();
  }
  function paintFigureBody(ctx, scaffold, descriptor, q) {
    var spec=descriptor.spec,b=scaffold.body,cx=b.cx;
    var cl=figureCloth(spec);
    /* Worn gear is integrated, never pasted: a jack recolors the
       garment it replaces and quilts it, a belt recolors the belt
       construction, boots recolor the shoes and rise over the ankle.
       Carried gear (hands, ring) is not composited onto the body at
       all; the equipment grid names it. */
    var bodyItem=descriptor.loadout.body;
    if(bodyItem){
      var bc=hexToRgbV2(pickArt(bodyItem,['cloths','leathers'],'#5b402b',2));
      var bt=hexToRgbV2(pickArt(bodyItem,['threads','trims','gems'],'#c5a454',3));
      if(bc){
        cl.base=bc;cl.dark=shadeV2(bc,-.12);
        cl.deep=shadeV2(bc,-.22);cl.light=shadeV2(bc,.11);
      }
      if(bt)cl.trim=bt;
      if(bodyItem.art.kind==='jack'||bodyItem.art.kind==='chest')b.kind='gambeson';
    }
    var hose=shadeV2(cl.deep,-.04);
    var feetItem=descriptor.loadout.feet;
    var shoe=[52,40,32];
    if(feetItem){
      var fc=hexToRgbV2(pickArt(feetItem,['leathers','cloths'],'#5b402b',2));
      if(fc)shoe=fc;
    }
    var sx=-spec.lightSide;
    var side,a;
    /* legs and shoes first; everything else overlaps them */
    if(!b.floorLength){
      if(b.hemY<b.hipY){
        /* hose are joined at the seat under a short doublet */
        var seatW=b.stance+b.legTop;
        var seatTop=b.hemY-b.headH*.12;
        ctx.beginPath();
        ctx.moveTo(cx-seatW*.86,seatTop);
        ctx.bezierCurveTo(cx-seatW*.96,b.hipY-b.headH*.14,
          cx-seatW,b.hipY-b.headH*.08,cx-seatW,b.hipY);
        ctx.lineTo(cx+seatW,b.hipY);
        ctx.bezierCurveTo(cx+seatW,b.hipY-b.headH*.08,
          cx+seatW*.96,b.hipY-b.headH*.14,cx+seatW*.86,seatTop);
        ctx.closePath();
        fillStrokeA(ctx,hose,shadeV2(hose,-.22),1.8,.9,q);
      }
      for(side=-1;side<=1;side+=2){
        legPath(ctx,b,side);
        fillStrokeA(ctx,hose,shadeV2(hose,-.22),1.8,.9,q);
        legDetail(ctx,b,spec,hose,side,q);
      }
      /* the far leg reads back by a wash */
      ctx.save();
      ctx.globalAlpha=.3;
      legPath(ctx,b,-spec.lightSide);
      ctx.fillStyle=cssV2(shadeV2(hose,-.3));
      ctx.fill();
      ctx.restore();
    }
    for(side=-1;side<=1;side+=2){
      if(feetItem&&!b.floorLength){
        /* the boot shaft rises over the ankle before the shoe */
        ctx.fillStyle=cssV2(shadeV2(shoe,-.06));
        ctx.fillRect(cx+side*b.stance*.95-b.legAnkle*1.05,
          b.soleY-b.shoeH*2.1,b.legAnkle*2.1,b.shoeH*1.5);
      }
      shoePath(ctx,b,side);
      fillStrokeA(ctx,side===spec.lightSide?shoe:shadeV2(shoe,-.1),
        shadeV2(shoe,-.3),1.6,.9,q);
    }
    gownPath(ctx,b);
    fillStrokeA(ctx,cl.base,cl.deep,2,.9,q);
    ctx.save();
    gownPath(ctx,b);
    ctx.clip();
    ctx.globalAlpha=.5;
    /* deep, not dark: at half alpha a -12% shade vanishes on the dark
       wardrobes, and the gown reads flat beside the reference */
    ctx.fillStyle=cssV2(cl.deep);
    ctx.beginPath();
    ctx.moveTo(cx+sx*b.shoulderHalf*1.2,b.shoulderY-10);
    ctx.lineTo(cx+sx*b.hipHalf*1.8,b.hemY+20);
    ctx.lineTo(cx+sx*b.hipHalf*.1,b.hemY+20);
    ctx.lineTo(cx+sx*b.chestHalf*.2,b.shoulderY-10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha=1;
    if(b.kind!=='gambeson'&&b.kind!=='habit'){
      ink(ctx,1.1,shadeV2(cl.deep,-.05),.45,q);
      var fold,fx;
      for(fold=-2;fold<=2;fold++){
        if(!fold)continue;
        fx=cx+fold*b.waistHalf*.42;
        ctx.beginPath();
        ctx.moveTo(fx,b.waistY+4);
        ctx.quadraticCurveTo(fx+fold*2.5,(b.waistY+b.hemY)/2,
          fx+fold*(b.floorLength?9:5),b.hemY-2);
        ctx.stroke();
      }
    }
    topDetail(ctx,b,spec,cl,q);
    ctx.restore();
    for(side=-1;side<=1;side+=2){
      sleevePath(ctx,b,side);
      fillStrokeA(ctx,side===spec.lightSide?cl.base:shadeV2(cl.base,-.06),
        cl.deep,1.8,.9,q);
      ctx.save();
      sleevePath(ctx,b,side);
      ctx.clip();
      sleeveDetail(ctx,b,side,cl,q);
      ctx.restore();
    }
    for(side=-1;side<=1;side+=2){
      a=armPoints(b,side);
      handPath(ctx,b,side,a.wristX,a.wristY-b.headH*.015);
      fillStrokeA(ctx,spec.skin.base,shadeV2(spec.skin.base,-.3),1.4,.9,q);
      handDetail(ctx,b,side,a.wristX,a.wristY-b.headH*.015,spec,q);
    }
    if(descriptor.loadout.ring){
      /* a ring is worn, not carried: a band across the ring finger in
         the item's metal, with its stone if it has one */
      var ringItem=descriptor.loadout.ring;
      var rm=hexToRgbV2(pickArt(ringItem,['metals'],'#c5a454',1))||GOLD;
      a=armPoints(b,1);
      var rx=a.wristX+b.handW*.12;
      var ry=a.wristY-b.headH*.015+b.handLen*.66;
      ink(ctx,b.handW*.16,rm,1,q);
      ctx.beginPath();
      ctx.moveTo(rx-b.handW*.22,ry);
      ctx.lineTo(rx+b.handW*.22,ry);
      ctx.stroke();
      var ringGem=hexToRgbV2(pickArt(ringItem,['gems'],'#c5a454',3));
      if(ringGem)gemDot(ctx,rx,ry-b.handW*.06,b.handW*.12,ringGem,q);
    }
    var waistItem=descriptor.loadout.waist;
    if(!waistItem&&(b.kind==='habit'||b.kind==='cassock')){
      /* the cord, knotted and hanging at the hip */
      ink(ctx,2.2,[176,158,118],.9,q);
      ctx.beginPath();
      ctx.moveTo(cx-b.waistHalf,b.waistY+2);
      ctx.quadraticCurveTo(cx,b.waistY+b.headH*.07,cx+b.waistHalf,b.waistY+2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx+b.waistHalf*.55,b.waistY+b.headH*.05);
      ctx.lineTo(cx+b.waistHalf*.62,b.waistY+b.headH*.38);
      ctx.stroke();
    }else{
      var beltC=spec.tier>=4?cl.trim:shadeV2(cl.deep,-.1);
      var buckle=spec.tier>=3?GOLD:null;
      if(waistItem){
        var wc=hexToRgbV2(pickArt(waistItem,['leathers','cloths'],'#5b402b',2));
        if(wc)beltC=wc;
        buckle=hexToRgbV2(pickArt(waistItem,['metals'],'#c5a454',1))||GOLD;
      }
      ctx.beginPath();
      ctx.moveTo(cx-b.waistHalf*1.02,b.waistY);
      ctx.quadraticCurveTo(cx,b.waistY+b.headH*.05,
        cx+b.waistHalf*1.02,b.waistY);
      ctx.lineTo(cx+b.waistHalf*1.02,b.waistY+b.headH*.075);
      ctx.quadraticCurveTo(cx,b.waistY+b.headH*.125,
        cx-b.waistHalf*1.02,b.waistY+b.headH*.075);
      ctx.closePath();
      fillStrokeA(ctx,beltC,shadeV2(beltC,-.32),1.4,.9,q);
      if(buckle){
        ctx.beginPath();
        ctx.arc(cx,b.waistY+b.headH*.062,b.headH*.036,0,TAU);
        fillStrokeA(ctx,buckle,shadeV2(buckle,-.3),1.2,.9,q);
      }
    }
    if(spec.tier>=4){
      ink(ctx,2.4,cl.trim,.85,q);
      hemLine(ctx,b,3);
      ctx.stroke();
    }
  }
  function insetPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
  /* Hand objects cannot be worn convincingly, so the figure card shows
     them as framed inset panels in the bottom corners, below the
     figure: the right hand's object in the viewer-left box, the left
     hand's in the viewer-right box, and a shared two-handed object in
     the viewer-left box alone. Drawn last, they overlay a wide hem
     rather than fighting it for space. */
  function paintFigureInsets(ctx, descriptor, q) {
    var left=descriptor.loadout.leftHand;
    var right=descriptor.loadout.rightHand;
    if(!left&&!right)return;
    var two=right&&left&&right.grip===2&&left.grip===2&&
      right.ref===left.ref?right:null;
    var slots=two
      ? [{item:two,x:8}]
      : [right?{item:right,x:8}:null,left?{item:left,x:182}:null];
    var size=66,y=406,i,entry;
    for(i=0;i<slots.length;i++){
      entry=slots[i];
      if(!entry)continue;
      insetPath(ctx,entry.x,y,size,size,7);
      ctx.fillStyle='rgba(24,19,13,.88)';
      ctx.fill();
      insetPath(ctx,entry.x,y,size,size,7);
      ctx.strokeStyle=entry.item.quality==='masterwork'
        ? 'rgba(235,201,102,.85)' : 'rgba(122,99,58,.9)';
      ctx.lineWidth=2;
      ctx.stroke();
      drawItemArt(ctx,entry.item,entry.x+size/2,y+size/2,.5,0,false);
    }
  }
  function paintIllustration(ctx, descriptor, targetWidth, targetHeight, viewportX, viewportY,
      qualityProfile) {
    var designW=256,designH=descriptor.frame==='figure'?480:288;
    var scale=Math.min(targetWidth/designW,targetHeight/designH);
    var quality={scale:scale,strokeFloor:1/scale,bold:1,fine:true,grow:1,
      bottom:designH-10};
    if(qualityProfile&&qualityProfile.strokeFloor){
      quality.strokeFloor=Math.max(quality.strokeFloor,qualityProfile.strokeFloor);
    }
    var ox=(targetWidth-designW*scale)/2,oy=(targetHeight-designH*scale)/2;
    viewportX=viewportX||0;viewportY=viewportY||0;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(viewportX,viewportY,targetWidth,targetHeight);
    ctx.beginPath();ctx.rect(viewportX,viewportY,targetWidth,targetHeight);ctx.clip();
    ctx.translate(viewportX+ox,viewportY+oy);ctx.scale(scale,scale);
    paintCourtBackdrop(ctx,descriptor,designW,designH);
    var scaffold=analyticScaffold(descriptor);
    var spec=descriptor.spec,f=scaffold.face;
    /* Stylisation against apparent size: on a small head the features
       take more of the face to survive, and micro-detail is dropped so
       it cannot compete with the marks that carry identity. An atlas
       master supplies targets far smaller than the cell it renders at,
       so its caller floors the boldness for the sizes it will serve. */
    quality.bold=clampV2(96/Math.max(8,(f.chinBottom-f.top)*scale),1,2);
    if(qualityProfile&&qualityProfile.boldFloor){
      quality.bold=Math.max(quality.bold,qualityProfile.boldFloor);
    }
    /* the frame-filling head has the pixels to carry fine marks well
       into the bold range, so the gate sits higher than the reference's */
    quality.fine=quality.bold<1.6;
    quality.grow=1+(quality.bold-1)*.38;
    var headItem=descriptor.loadout.head;
    var coversHair=(headItem&&headItem.art.kind==='helm')||
      (!headItem&&spec.coversHair);
    /* Attachment order is structural: back hair behind the body, the
       neck under the robe, draped cloth behind the head, then the face
       stack, hair, headwear, jewelry, and linen dressings last. */
    if(!coversHair)paintBackHair(ctx,scaffold,spec,quality);
    if(descriptor.frame==='figure'){
      /* the gown has a neckline, so the neck goes under it; the bust
         torso covers its own neck base, so there the neck goes on top */
      paintNeck(ctx,f,spec,quality);
      paintFigureBody(ctx,scaffold,descriptor,quality);
    }else{
      paintBustBody(ctx,f,spec,descriptor);
      paintNeck(ctx,f,spec,quality);
    }
    if(!headItem)paintBackCostume(ctx,scaffold,spec,quality);
    paintEars(ctx,scaffold,spec,quality);
    paintHead(ctx,scaffold,spec,quality);
    paintFaceStructure(ctx,scaffold,spec,quality);
    paintBeard(ctx,scaffold,spec,quality);
    paintFeatures(ctx,scaffold,spec,quality);
    paintMustache(ctx,scaffold,spec,quality);
    paintMarks(ctx,scaffold,spec,quality);
    if(!coversHair)paintFrontHair(ctx,scaffold,spec,quality);
    if(headItem)paintHeadItem(ctx,scaffold,spec,headItem,quality);
    else paintGeneratedHeadwear(ctx,scaffold,spec,quality);
    paintJewelry(ctx,scaffold,spec,descriptor,quality);
    paintMarkOverlay(ctx,scaffold,spec,quality);
    if(descriptor.frame==='figure')paintFigureInsets(ctx,descriptor,quality);
    ctx.restore();
  }

  var atlasCanvas=null,atlasContext=null,atlasEntries=Object.create(null);
  var atlasUsed=0,portraitState=null,portraitGeneration=0,figureMru=null;
  var pendingKeys=Object.create(null),pendingOrder=[],queueFrame=0;
  var cacheCounts={targetHits:0,atlasHits:0,coldRenders:0};

  function clearDerivedPortraits(keepState) {
    portraitGeneration++;
    atlasEntries=Object.create(null);atlasUsed=0;figureMru=null;
    pendingKeys=Object.create(null);pendingOrder=[];
    if(queueFrame&&window.cancelAnimationFrame)window.cancelAnimationFrame(queueFrame);
    queueFrame=0;cacheCounts={targetHits:0,atlasHits:0,coldRenders:0};
    if(!keepState)portraitState=null;
  }
  function ensurePortraitState(state) {
    if(portraitState!==state){clearDerivedPortraits(true);portraitState=state;}
  }
  function ensureAtlas() {
    if(atlasCanvas)return;
    atlasCanvas=document.createElement('canvas');atlasCanvas.width=ATLAS_W;atlasCanvas.height=ATLAS_H;
    atlasContext=atlasCanvas.getContext('2d',{alpha:false});
  }
  function desiredStamp(canvas,key) {
    return portraitGeneration+'|'+key+'@'+canvas.width+'x'+canvas.height;
  }
  function hasTargetStamp(canvas,key) {
    if(canvas._fbPortraitStamp===desiredStamp(canvas,key)){
      cacheCounts.targetHits++;return true;
    }
    return false;
  }
  function setTargetStamp(canvas,key) {
    canvas._fbPortraitStamp=desiredStamp(canvas,key);
  }
  function atlasEntry(key) {
    var entry=atlasEntries[key];
    if(entry)entry.used=++atlasUsed;
    return entry;
  }
  function atlasSlot() {
    var occupied=[],key,entry,oldest=null;
    for(key in atlasEntries){entry=atlasEntries[key];occupied[entry.slot]=true;
      if(!oldest||entry.used<oldest.used)oldest=entry;}
    for(var i=0;i<ATLAS_SLOTS;i++)if(!occupied[i])return i;
    if(oldest){delete atlasEntries[oldest.key];return oldest.slot;}
    return 0;
  }
  function renderAtlasEntry(descriptor) {
    ensureAtlas();var slot=atlasSlot(),x=(slot%8)*CELL_W,y=Math.floor(slot/8)*CELL_H;
    /* the cell serves 30x34 through 88x100 CSS-pixel targets (cell and
       targets scale by the same DPR, so shrink ratios are unchanged):
       draw it bold enough for the faces it will be shrunk into, but with
       fine marks kept now that the head fills the cell */
    paintIllustration(atlasContext,descriptor,CELL_W,CELL_H,x,y,{boldFloor:1.55});
    var entry={key:descriptor.key,slot:slot,used:++atlasUsed};
    atlasEntries[descriptor.key]=entry;cacheCounts.coldRenders++;return entry;
  }
  function blitAtlas(canvas,entry,key) {
    var ctx=canvas.getContext('2d'),x=(entry.slot%8)*CELL_W,y=Math.floor(entry.slot/8)*CELL_H;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=true;
    if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';
    ctx.drawImage(atlasCanvas,x,y,CELL_W,CELL_H,0,0,canvas.width,canvas.height);ctx.restore();
    setTargetStamp(canvas,key);
  }
  function compactEligible(canvas,descriptor) {
    return descriptor.frame==='bust'&&!descriptor.transparent&&
      canvas.width>0&&canvas.height>0&&canvas.width<=CELL_W&&canvas.height<=CELL_H;
  }
  function compactStatus(canvas,descriptor) {
    if(hasTargetStamp(canvas,descriptor.key))return 'target';
    var entry=atlasEntry(descriptor.key);
    if(entry){cacheCounts.atlasHits++;blitAtlas(canvas,entry,descriptor.key);return 'atlas';}
    return 'cold';
  }
  function paintDirect(canvas,descriptor) {
    var ctx=canvas.getContext('2d');
    paintIllustration(ctx,descriptor,canvas.width,canvas.height);
    cacheCounts.coldRenders++;setTargetStamp(canvas,descriptor.key);
  }

  FB.clearPortraitCache=function(){clearDerivedPortraits(false);};
  FB.portraitCacheStats=function(){
    var entries=0,key;for(key in atlasEntries)entries++;
    return {entries:entries,bytes:atlasCanvas?ATLAS_BYTES:0,
      targetHits:cacheCounts.targetHits,atlasHits:cacheCounts.atlasHits,
      coldRenders:cacheCounts.coldRenders,queued:pendingOrder.length};
  };
  FB.paintPortrait=function(canvas,c,year,opts){
    if(!canvas||!c)return;opts=opts||{};
    var state=opts.state||FB.state;ensurePortraitState(state);
    var descriptor=portraitDescriptor(state,c,year,opts);
    if(hasTargetStamp(canvas,descriptor.key))return;
    if(compactEligible(canvas,descriptor)){
      var entry=atlasEntry(descriptor.key);
      if(entry){cacheCounts.atlasHits++;blitAtlas(canvas,entry,descriptor.key);return;}
      entry=renderAtlasEntry(descriptor);blitAtlas(canvas,entry,descriptor.key);return;
    }
    paintDirect(canvas,descriptor);
  };

  FB.paintItem = function (canvas, state, value) {
    if (!canvas || !value) return;
    const item = typeof value === 'object' && value.defId
      ? (FB.resolveItemSnapshot ? FB.resolveItemSnapshot(value) : null)
      : (state && FB.resolveItemReadOnly
        ? FB.resolveItemReadOnly(state, value)
        : null);
    if (!item) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const hue = byte(item.visualSeed, 8) % 360;
    const grad = ctx.createRadialGradient(W * 0.5, H * 0.42, 2, W * 0.5, H * 0.5, W * 0.7);
    grad.addColorStop(0, 'hsl(' + hue + ',18%,27%)');
    grad.addColorStop(1, '#171612');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    let artScale = Math.min(W, H) / 125;
    if (item.art && (item.art.kind === 'shield' || item.art.kind === 'book' ||
      item.art.kind === 'chest' || item.art.kind === 'jack')) artScale *= 0.9;
    drawItemArt(ctx, item, W / 2, H / 2, artScale, 0, false);
    ctx.strokeStyle = item.quality === 'masterwork' ? 'rgba(235,201,102,0.85)' :
      'rgba(200,170,90,0.35)';
    ctx.lineWidth = Math.max(1, W / 90);
    ctx.strokeRect(1, 1, W - 2, H - 2);
  };

  function copyPortraitOptions(opts) {
    var out={},key;opts=opts||{};for(key in opts)out[key]=opts[key];return out;
  }
  FB.paintPaperDoll=function(canvas,c,state,opts){
    if(!canvas||!c||!state)return;opts=copyPortraitOptions(opts);opts.frame='figure';opts.state=state;
    ensurePortraitState(state);
    var descriptor=portraitDescriptor(state,c,state.date.year,opts);
    if(hasTargetStamp(canvas,descriptor.key))return;
    if(descriptor.transparent){paintDirect(canvas,descriptor);return;}
    if(!figureMru){
      var master=document.createElement('canvas');master.width=FIGURE_W;master.height=FIGURE_H;
      figureMru={key:'',canvas:master};
    }
    if(figureMru.key!==descriptor.key){
      paintIllustration(figureMru.canvas.getContext('2d'),descriptor,FIGURE_W,FIGURE_H);
      cacheCounts.coldRenders++;figureMru.key=descriptor.key;
    }
    var ctx=canvas.getContext('2d');ctx.save();ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;
    if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';
    ctx.drawImage(figureMru.canvas,0,0,canvas.width,canvas.height);ctx.restore();
    setTargetStamp(canvas,descriptor.key);
  };

  function queueOptions(state,c) {
    return {};
  }
  function waiterDescriptor(waiter) {
    if(waiter.state!==portraitState||!waiter.state.chars)return null;
    var c=waiter.state.chars[waiter.charId];if(!c)return null;
    var opts=queueOptions(waiter.state,c);
    return portraitDescriptor(waiter.state,c,waiter.state.date.year,opts);
  }
  function validWaiter(waiter,key) {
    if(!waiter.canvas||waiter.canvas.isConnected===false||
      !waiter.canvas.width||!waiter.canvas.height)return null;
    var descriptor=waiterDescriptor(waiter);
    return descriptor&&descriptor.key===key?descriptor:null;
  }
  function prunePending() {
    var next=[],i,key,group,j,kept;
    for(i=0;i<pendingOrder.length;i++){key=pendingOrder[i];group=pendingKeys[key];
      if(!group)continue;kept=[];
      for(j=0;j<group.waiters.length;j++)if(validWaiter(group.waiters[j],key))kept.push(group.waiters[j]);
      if(kept.length){group.waiters=kept;next.push(key);}else delete pendingKeys[key];
    }
    pendingOrder=next;
  }
  function queueCompact(canvas,c,state,year,descriptor) {
    var group=pendingKeys[descriptor.key],i;
    if(!group){
      if(pendingOrder.length>=128)prunePending();
      if(pendingOrder.length>=128)return false;
      group={key:descriptor.key,descriptor:descriptor,waiters:[]};
      pendingKeys[descriptor.key]=group;pendingOrder.push(descriptor.key);
    }
    for(i=0;i<group.waiters.length;i++)if(group.waiters[i].canvas===canvas)return true;
    group.waiters.push({canvas:canvas,charId:c.id,state:state,year:year});return true;
  }
  function paintPendingGroup(group) {
    var live=[],i,descriptor;
    for(i=0;i<group.waiters.length;i++){
      descriptor=validWaiter(group.waiters[i],group.key);
      if(descriptor)live.push({waiter:group.waiters[i],descriptor:descriptor});
    }
    if(!live.length)return false;
    var entry=atlasEntry(group.key);
    if(!entry)entry=renderAtlasEntry(live[0].descriptor);
    else cacheCounts.atlasHits++;
    for(i=0;i<live.length;i++)blitAtlas(live[i].waiter.canvas,entry,group.key);
    return true;
  }
  function flushPortraitQueue(all) {
    queueFrame=0;var start=window.performance&&performance.now?performance.now():Date.now();
    var painted=0,key,group,now;
    while(pendingOrder.length){
      key=pendingOrder.shift();group=pendingKeys[key];delete pendingKeys[key];
      if(group&&paintPendingGroup(group))painted++;
      now=window.performance&&performance.now?performance.now():Date.now();
      if(!all&&painted>=1&&now-start>=6)break;
    }
    if(pendingOrder.length&&!all)queueFrame=requestAnimationFrame(function(){flushPortraitQueue(false);});
  }
  function schedulePortraitQueue() {
    if(!queueFrame&&pendingOrder.length)queueFrame=requestAnimationFrame(function(){flushPortraitQueue(false);});
  }

  /* Paint retained portrait canvases after a DOM render. The first cold
     compact face is synchronous; later keys share a bounded frame queue. */
  FB.paintFaces=function(root,state,options){
    if(!root||!state)return;options=options||{};ensurePortraitState(state);
    var list=root.querySelectorAll('canvas.pface[data-cid]'),coldPainted=false;
    var i,canvas,c,opts,descriptor,status,entry;
    for(i=0;i<list.length;i++){
      canvas=list[i];c=state.chars[canvas.getAttribute('data-cid')];if(!c)continue;
      opts=queueOptions(state,c);descriptor=portraitDescriptor(state,c,state.date.year,opts);
      if(!compactEligible(canvas,descriptor)){FB.paintPortrait(canvas,c,state.date.year,opts);continue;}
      status=compactStatus(canvas,descriptor);if(status!=='cold')continue;
      if(options.immediate||!coldPainted){
        entry=renderAtlasEntry(descriptor);blitAtlas(canvas,entry,descriptor.key);coldPainted=true;
      }else if(!queueCompact(canvas,c,state,state.date.year,descriptor)){
        entry=renderAtlasEntry(descriptor);blitAtlas(canvas,entry,descriptor.key);
      }
    }
    if(options.immediate)flushPortraitQueue(true);else schedulePortraitQueue();
    var dolls=root.querySelectorAll('canvas.paperdoll[data-cid]');
    for(i=0;i<dolls.length;i++){c=state.chars[dolls[i].getAttribute('data-cid')];
      if(c)FB.paintPaperDoll(dolls[i],c,state);}
    var items=root.querySelectorAll('canvas.itemart[data-item]');
    for(i=0;i<items.length;i++)FB.paintItem(items[i],state,items[i].getAttribute('data-item'));
    FB.paintCrests(root);
  };
  FB.portraitDpr = DPR;
  /* w/h are CSS pixels; the backing store scales by the shared portrait DPR. */
  FB.sizeFaceCanvas = function (canvas, w, h) {
    if (!canvas) return;
    canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  };
  FB.faceTag = function (c, w, h) {
    return '<canvas class="pface" data-cid="' + c.id + '" width="' + Math.round(w * DPR) +
      '" height="' + Math.round(h * DPR) + '" style="width:' + w + 'px;height:' + h +
      'px"></canvas>';
  };
})();
