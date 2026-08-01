/* Court Illustration v2 reference core.
   This file supplies the deterministic character generator, resolution
   rules, layout geometry, Canvas 2D painter primitives, and registries used
   by the reference style. One seed resolves to the same person at portrait
   and figure framing.

   Rules:
   - Native Canvas 2D only. No libraries, fonts, image files, or network.
   - Everything renders when opened directly from file://.
   - For a given seed, style, and size the output is deterministic.
   - Painters use only their seeded streams, never Math.random(), Date, or
     state retained between renders.

   The portrait design space is 256 x 288. The renderer scales that space
   for other resolutions and selects a taller registered frame for figures. */
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* ============================================================
     Small utilities
     ============================================================ */

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, value) {
    var t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function hashText(text) {
    var h1 = 0xdeadbeef ^ text.length;
    var h2 = 0x41c6ce57 ^ text.length;
    var i, code;
    for (i = 0; i < text.length; i += 1) {
      code = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return [(h2 >>> 0), (h1 >>> 0)];
  }
  function mulberry32(seed) {
    return function () {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* nth stable pseudo-byte of a hash; choice fields key off this so an
     override on one field never reshuffles another */
  function byteOf(h, n) {
    var x = (h ^ Math.imul(n + 1, 0x9E3779B9)) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x85EBCA6B) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35) >>> 0;
    return (x ^ (x >>> 16)) & 255;
  }
  /* A seeded slider lands inside the middle of its range rather than
     across the whole of it: the seed should read as a person, not as an
     extreme setting, and the slider still reaches both ends when asked.
     Keyed on byteOf, so adding a knob reshuffles nothing. */
  function knobOf(h, n, lo, hi) {
    return lo + byteOf(h, n) / 255 * (hi - lo);
  }
  function hex32(value) { return ("00000000" + (value >>> 0).toString(16)).slice(-8); }
  function rounded(value, digits) { return Number(value).toFixed(digits === undefined ? 2 : digits); }

  /* ---------- color helpers ---------- */

  function rgb2hsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var h = 0, s = 0, l = (mx + mn) / 2;
    var d = mx - mn;
    if (d > 0) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  function hsl2rgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < .5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  /* lightness/saturation/hue delta on an rgb triple */
  function shade(c, dl, ds, dh) {
    var h = rgb2hsl(c);
    return hsl2rgb(h[0] + (dh || 0), h[1] + (ds || 0), h[2] + dl);
  }
  function lerpC(a, b, t) {
    return [
      Math.round(mix(a[0], b[0], t)),
      Math.round(mix(a[1], b[1], t)),
      Math.round(mix(a[2], b[2], t))
    ];
  }
  function css(c, alpha) {
    return alpha === undefined
      ? "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"
      : "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
  }

  /* deterministic 2d value noise for shape transforms and textures */
  function hash2(x, y, seed) {
    var n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function noise2(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    return mix(
      mix(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), u),
      mix(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), u), w);
  }

  /* ---------- the resolution policy for synthesized texture ----------
     The design space is always 256 x 288; only the realization of a
     texture gets finer as the output grows. Multiply a mark's OWN size
     (a dot's radius, a stroke's width) by grain(dt) so it keeps a
     constant size in output pixels, then take its count from grainArea
     or grainLine so the total ink coverage is identical at every
     resolution. Area marks shrink in two dimensions, so their count
     rises as dt squared; line marks keep their design-space length and
     only thin, so theirs rises as dt.

     What this replaced: counts rose as dt while marks kept their design
     size, so coverage rose linearly with resolution and one portrait
     carried 8x more ink at the 1024 export than at the 128 thumbnail.
     dt of 1 is the 256 reference, where all three are the identity. */

  function grain(dt) { return 1 / clamp(dt, .5, 4); }
  function grainArea(dt, n) { var d = clamp(dt, .5, 4); return Math.round(n * d * d); }
  function grainLine(dt, n) { var d = clamp(dt, .5, 4); return Math.round(n * d); }

  var U = {
    TAU: TAU,
    clamp: clamp, mix: mix, smoothstep: smoothstep,
    hashText: hashText, mulberry32: mulberry32, byteOf: byteOf,
    hex32: hex32, rounded: rounded, noise2: noise2,
    rgb2hsl: rgb2hsl, hsl2rgb: hsl2rgb, shade: shade, lerpC: lerpC, css: css,
    grain: grain, grainArea: grainArea, grainLine: grainLine
  };

  /* ============================================================
     Constants (ported)
     ============================================================ */

  var PRESETS = {
    128: { width: 128, height: 144, label: "thumbnail" },
    256: { width: 256, height: 288, label: "game" },
    512: { width: 512, height: 576, label: "showcase" },
    1024: { width: 1024, height: 1152, label: "export" }
  };

  var TIER_NAMES = ["Serf", "Freeholder", "Gentry", "Baron", "Count", "Duke", "King", "Emperor"];
  var TIER_NOUN_M = ["serf", "freeholder", "gentleman", "baron", "count", "duke", "king", "emperor"];
  var TIER_NOUN_F = ["serf", "freeholder", "gentlewoman", "baroness", "countess", "duchess", "queen", "empress"];

  var CULTURES = {
    norse:    { adj: "Norse",    tone: 0.3, fair: .68, red: .18, faith: "pagan" },
    english:  { adj: "English",  tone: 0.5, fair: .48, red: .10, faith: "christian" },
    frankish: { adj: "Frankish", tone: 0.6, fair: .42, red: .07, faith: "christian" },
    german:   { adj: "German",   tone: 0.5, fair: .55, red: .07, faith: "christian" },
    slavic:   { adj: "Slavic",   tone: 0.7, fair: .46, red: .05, faith: "christian" },
    gaelic:   { adj: "Gaelic",   tone: 0.4, fair: .40, red: .34, faith: "christian" },
    iberian:  { adj: "Iberian",  tone: 1.3, fair: .08, red: .03, faith: "christian" },
    italian:  { adj: "Italian",  tone: 1.2, fair: .10, red: .03, faith: "christian" },
    greek:    { adj: "Greek",    tone: 1.3, fair: .07, red: .02, faith: "christian" },
    armenian: { adj: "Armenian", tone: 1.4, fair: .05, red: .02, faith: "christian" },
    turkic:   { adj: "Turkic",   tone: 1.5, fair: .05, red: .02, faith: "muslim" },
    andalusi: { adj: "Andalusi", tone: 1.9, fair: .04, red: .02, faith: "muslim" },
    arabic:   { adj: "Arabic",   tone: 2.2, fair: .02, red: .01, faith: "muslim" },
    berber:   { adj: "Berber",   tone: 2.3, fair: .02, red: .01, faith: "muslim" },
    persian:  { adj: "Persian",  tone: 2.0, fair: .03, red: .02, faith: "muslim" },
    nubian:   { adj: "Nubian",   tone: 3.7, fair: .01, red: .01, faith: "christian" }
  };
  var CULTURE_KEYS = Object.keys(CULTURES);

  var TONES = [
    [241, 205, 175],
    [219, 172, 128],
    [184, 132, 92],
    [136, 92, 62],
    [94, 63, 47]
  ];

  var HAIR_FAMILIES = {
    black:     [42, 34, 30],
    darkBrown: [66, 48, 34],
    brown:     [98, 70, 44],
    chestnut:  [124, 86, 50],
    auburn:    [138, 74, 40],
    blond:     [196, 158, 102],
    ash:       [148, 138, 120]
  };

  var EYE_COLORS = {
    brown: [96, 64, 40],
    dark:  [58, 42, 32],
    hazel: [116, 86, 48],
    green: [96, 110, 72],
    blue:  [92, 124, 148],
    gray:  [116, 128, 132]
  };

  var HAIR_M = ["crop", "sidePart", "curly", "longLoose", "receding"];
  var HAIR_F = ["longLoose", "braids", "bun", "sidePart", "curly"];
  var HAIR_STYLES = ["auto", "crop", "sidePart", "curly", "longLoose", "receding", "bald", "tonsure", "braids", "bun"];

  /* ---------- the wound and headdress tables ----------
     One entry per type, and the entry IS the registration: makeSpec seeds
     a type out of it, reference controls can build dropdowns and the variant
     picker off it, and the drawers switch on the ids in it. Four fields
     carry the weight.

     `variants` are the forms of a type that are a different DRAWING
     rather than the same drawing at another setting. A bandage round the
     brow, a bandage wrapped over the skull and an eye patch are one
     type and three constructions; a bandage pulled a little lower is
     not, that is the fit slider. A type with no variants has one form.

     `knobs` are which of the shared sliders the type actually reads, so
     controls can dim the rest rather than offer a drape length for a
     circlet, which has nothing that hangs.

     `base` names the nearest of the four wounds and eleven headdresses
     the original renderer shipped with. Only newer drawers know
     the new ids, so everything else draws `base` instead: adding a type
     here cannot make a character render bare-headed in eleven styles at
     once. An entry with no `base` is one of the originals and is its own.

     `place` pins a wound the anatomy places for you - a split lip is on
     the lip - and such a type leaves "place" out of its knobs. */

  var WOUND_TYPES = [
    { id: "none" },
    { id: "cut", variants: ["single", "crossed", "stitched"],
      knobs: ["severity", "healed", "place", "side"] },
    { id: "bruise", variants: ["blotch", "swollen"],
      knobs: ["severity", "healed", "place", "side"] },
    { id: "bandage", variants: ["brow", "wrap", "patch"],
      knobs: ["severity", "fit", "side"], place: "brow" },
    { id: "burn", base: "bruise", variants: ["splash", "streak"],
      knobs: ["severity", "healed", "place", "side"] },
    /* side is in here because the break has one: the bridge is pushed
       off true toward one cheek or the other */
    { id: "brokenNose", label: "Broken nose", base: "bruise",
      variants: ["set", "bloodied"], knobs: ["severity", "healed", "side"],
      place: "nose" },
    { id: "splitLip", label: "Split lip", base: "cut",
      variants: ["fresh", "scabbed"], knobs: ["severity", "healed", "side"],
      place: "lip" },
    { id: "notchedEar", label: "Notched ear", base: "cut",
      variants: ["notch", "cropped"], knobs: ["severity", "healed", "side"],
      place: "ear" },
    { id: "brand", base: "cut", variants: ["cross", "ring", "hook"],
      knobs: ["severity", "healed", "place", "side"] },
    { id: "pox", base: "bruise", variants: ["spots", "blistered"],
      knobs: ["severity", "healed"], place: "spread" }
  ];

  var HEADDRESS_TYPES = [
    { id: "none" },
    { id: "circlet", variants: ["plain", "gemmed"], knobs: ["fit", "trim"] },
    { id: "crown", variants: ["points", "fleurons"],
      knobs: ["fit", "volume", "trim"] },
    { id: "imperial", label: "Imperial crown", variants: ["arched", "mitred"],
      knobs: ["fit", "volume", "trim"] },
    { id: "helm", variants: ["nasal", "banded", "faceplate"],
      knobs: ["fit", "volume", "trim"], covers: true },
    { id: "coif", variants: ["linen", "mail"], knobs: ["fit", "volume"],
      covers: true },
    /* `uncovers` names the variants of a covering type that do not
       actually cover: a hood thrown back off the head shows the hair it
       was hiding, and without this the head came out neither hooded nor
       haired. */
    { id: "hood", variants: ["up", "back"], knobs: ["fit", "volume", "drape"],
      covers: true, uncovers: ["back"] },
    { id: "veil", variants: ["fall", "pinned"],
      knobs: ["fit", "volume", "drape", "trim"], covers: true },
    { id: "wimple", variants: ["plain", "banded"],
      knobs: ["fit", "drape", "trim"], covers: true },
    { id: "turban", variants: ["wrapped", "tailed"],
      knobs: ["fit", "volume", "drape", "trim"], covers: true },
    { id: "cap", label: "Merchant cap", variants: ["felt", "brimmed"],
      knobs: ["fit", "volume", "trim"] },
    /* added by the expansion - each names the original it stands in for */
    { id: "kerchief", base: "veil", variants: ["knotted", "chin"],
      knobs: ["fit", "drape"], covers: true },
    { id: "fillet", base: "circlet", variants: ["band", "barbette"],
      knobs: ["fit", "trim"] },
    /* a brim sits ON the head, so the hair still shows under it - the
       same reason the merchant's cap has never covered */
    { id: "strawHat", label: "Straw hat", base: "cap",
      variants: ["field", "pilgrim"], knobs: ["fit", "volume", "trim"] },
    { id: "chaperon", base: "hood", variants: ["liripipe", "rolled"],
      knobs: ["fit", "volume", "drape"], covers: true },
    { id: "furHat", label: "Fur hat", base: "cap", variants: ["round", "tall"],
      knobs: ["fit", "volume", "trim"], covers: true },
    { id: "mitre", base: "cap", variants: ["plain", "orphrey"],
      knobs: ["fit", "volume", "drape", "trim"] },
    { id: "garland", base: "circlet", variants: ["flowers", "laurel"],
      knobs: ["fit", "trim"] },
    { id: "crespine", base: "veil", variants: ["net", "filleted"],
      knobs: ["fit", "volume", "trim"], covers: true }
  ];

  /* An id is spelled once, in the table. Everything else - the dropdown
     order, the seeded pool, the fallback map, and control labels - is
     derived from it here, so a new type is one entry and no edits. */
  function indexTypes(list) {
    var by = Object.create(null);
    list.forEach(function (e) {
      e.variants = e.variants || [];
      e.knobs = e.knobs || [];
      e.base = e.base || e.id;
      by[e.id] = e;
    });
    return by;
  }
  var WOUND_BY_ID = indexTypes(WOUND_TYPES);
  var HEADDRESS_BY_ID = indexTypes(HEADDRESS_TYPES);
  function idsOf(list) {
    return list.map(function (e) { return e.id; });
  }
  var HEADWEAR = ["auto"].concat(idsOf(HEADDRESS_TYPES));
  var WOUNDS = idsOf(WOUND_TYPES);
  /* every real wound, for the seeded draw */
  var WOUND_POOL = WOUNDS.filter(function (id) { return id !== "none"; });
  /* where a wound can be put. The seeded set is the upper face, which is
     what a blade or a fist reaches; the rest are reachable by asking. */
  var WOUND_PLACES = ["auto", "brow", "eye", "cheek", "jaw", "nose", "lip", "ear"];
  var WOUND_AUTO_PLACES = ["brow", "eye", "cheek", "jaw"];
  var HW_KNOBS = ["fit", "volume", "drape", "trim"];
  var WOUND_KNOBS = ["severity", "healed", "place", "side", "fit"];

  /* "brokenNose" reads as "Broken nose" without a second copy of every
     name in the table or the HTML. An entry may still spell its own out
     where the plain reading is wrong ("cap" is a merchant's cap). */
  function humanLabel(id) {
    if (!id) return "";
    var spaced = String(id).replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  }
  function labelOf(entry, id) {
    if (entry && entry.label) return entry.label;
    return humanLabel(id);
  }

  /* Which form of a type to draw. An explicit pick wins where the type
     actually has that form; otherwise the seed chooses, off a byte of its
     own so asking for a variant on one type never reshuffles another. */
  function pickVariant(entry, choice, h, byteIx) {
    if (!entry || !entry.variants.length) return "";
    if (choice && choice !== "auto" &&
      entry.variants.indexOf(choice) >= 0) return choice;
    return entry.variants[byteOf(h, byteIx) % entry.variants.length];
  }

  var GOLD = [206, 170, 88], GOLD_L = [244, 222, 150], GOLD_D = [150, 116, 52];

  /* ============================================================
     Character spec - deterministic game-shaped inputs
     ============================================================ */

  function makeSpec(seedText, overrides) {
    var hashes = hashText(String(seedText));
    var h = hashes[0];
    var rng = mulberry32(hashes[0] ^ hashes[1]);
    /* fixed consumption order keeps continuous fields stable */
    var ageRoll = rng();
    var age = ageRoll < .13
      ? 4 + Math.floor(rng() * 11)
      : 16 + Math.floor(Math.pow(rng(), .85) * 60);
    var spec = {
      seed: String(seedText),
      hash: hashes,
      sex: byteOf(h, 0) < 128 ? "m" : "f",
      age: age,
      culture: CULTURE_KEYS[byteOf(h, 1) % CULTURE_KEYS.length],
      religion: "auto-filled-below",
      tier: Math.floor(Math.pow(rng(), 1.7) * 7.99),
      profession: "none",
      faceWidth: .86 + rng() * .28,
      jaw: .7 + rng() * .6,
      chin: .75 + rng() * .55,
      cheek: rng(),
      eyeSize: .8 + rng() * .45,
      eyeSpacing: .85 + rng() * .3,
      browWeight: .5 + rng() * 1,
      noseW: .7 + rng() * .7,
      noseLen: .8 + rng() * .45,
      mouthW: .8 + rng() * .4,
      lipFull: .6 + rng() * .8,
      yaw: (rng() * 2 - 1) * .1,
      asymmetry: rng() * .04,
      hairStyle: "auto",
      hairColor: "auto",
      beard: clamp(rng() * 1.25 - .12, 0, 1),
      expression: rng() * 1.2 - .6,
      freckles: Math.pow(rng(), 2.4),
      health: "hale",
      wound: "none",
      woundVariant: "auto",
      woundPlace: "auto",
      woundSide: "auto",
      woundSeverity: knobOf(h, 29, .3, .85),
      woundHealed: knobOf(h, 30, 0, 1),
      woundFit: knobOf(h, 36, .35, .65),
      scarred: byteOf(h, 2) > 236 ? "yes" : "no",
      oneEyed: byteOf(h, 3) > 249 ? "yes" : "no",
      headwear: "auto",
      headwearVariant: "auto",
      hwFit: knobOf(h, 25, .25, .75),
      hwVolume: knobOf(h, 26, .25, .75),
      hwDrape: knobOf(h, 27, .25, .75),
      hwTrim: knobOf(h, 28, .2, .8),
      neckItem: "auto",
      /* hidden seeded knobs */
      pigJitter: rng() * 1.0 - .5,
      fairRoll: rng(),
      redRoll: rng(),
      hairRoll: rng(),
      grayBias: rng() * 2 - 1,
      eyeRoll: rng(),
      earSize: .85 + rng() * .35,
      keySide: byteOf(h, 4) < 128 ? -1 : 1,
      bgHue: byteOf(h, 5) / 255 * 360,
      dressHue: (byteOf(h, 6) / 255 - .5) * 22,
      markSide: byteOf(h, 7) < 128 ? -1 : 1,
      moleRoll: byteOf(h, 8),
      recedeRoll: rng(),
      signature: hex32(hashes[0]) + hex32(hashes[1])
    };
    var prof = byteOf(h, 9);
    spec.profession = prof < 20 ? "monk" : prof < 40 ? "priest" :
      prof < 72 ? "soldier" : prof < 98 ? "merchant" : "none";
    spec.religion = CULTURES[spec.culture].faith;
    var healthRoll = byteOf(h, 10);
    if (healthRoll > 244) spec.health = "sick";
    /* Byte 11 still decides WHETHER a character carries a wound, at the
       same one-in-thirteen it always drew, so nobody gains or loses one
       by this expansion. WHICH wound comes off a byte of its own and
       reaches the whole table - a pool of three could never show the
       other six, and widening byte 11's own bands would have moved the
       wounded population instead. */
    if (byteOf(h, 11) > 236) spec.wound = WOUND_POOL[byteOf(h, 31) % WOUND_POOL.length];
    Object.keys(overrides || {}).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(spec, key)) spec[key] = overrides[key];
    });
    return spec;
  }

  /* ============================================================
     Resolution - derive every render-ready value from the spec
     (ported). Styles may re-tint the result in their restyle hook.
     ============================================================ */

  function skinRamp(pigment, health) {
    var t = clamp(pigment, 0, 4);
    var lowIdx = Math.min(3, Math.floor(t));
    var base = lerpC(TONES[lowIdx], TONES[lowIdx + 1], t - lowIdx);
    if (health === "sick") base = lerpC(base, [186, 190, 164], .34);
    else if (health === "dying") base = lerpC(base, [178, 182, 168], .52);
    var lipT = health === "hale" ? .5 : .22;
    return {
      base: base,
      lit: shade(base, .07, -.02, 4),
      shadow: shade(base, -.09, .05, -7),
      deep: shade(base, -.19, .08, -10),
      line: shade(base, -.33, .05, -8),
      blush: health === "hale" ? lerpC(base, [198, 96, 92], .34) : lerpC(base, [150, 130, 110], .2),
      lip: lerpC(shade(base, -.05, .12, -3), [168, 78, 78], lipT),
      lipLine: lerpC(shade(base, -.26, .1, -6), [110, 46, 46], .5)
    };
  }

  function clothFor(spec, prof) {
    var kinds = {
      monk:     { kind: "habit",    base: [96, 80, 58] },
      priest:   { kind: "cassock",  base: [60, 56, 62] },
      soldier:  { kind: "gambeson", base: [128, 110, 80] },
      merchant: { kind: "doublet",  base: [70, 108, 96] }
    };
    var byTier = [
      { kind: "tunic", base: [122, 102, 72] },
      { kind: "tunic", base: [104, 100, 66] },
      { kind: "tunic", base: [88, 104, 66] },
      { kind: "cote",  base: [72, 96, 130] },
      { kind: "court", base: [140, 64, 58] },
      { kind: "court", base: [126, 48, 56] },
      { kind: "royal", base: [106, 58, 126] },
      { kind: "royal", base: [88, 44, 116] }
    ];
    var pick = kinds[prof] || byTier[clamp(spec.tier, 0, 7)];
    var base = shade(pick.base, 0, 0, spec.dressHue);
    return {
      kind: pick.kind,
      base: base,
      dark: shade(base, -.11, .03, -4),
      deep: shade(base, -.2, .05, -6),
      light: shade(base, .09, -.02, 3),
      trim: spec.tier >= 3 ? [190, 152, 76] : [146, 126, 92],
      fur: spec.tier >= 6 ? [232, 226, 214] : [122, 104, 84]
    };
  }

  /* ============================================================
     Wardrobes - the vocabulary axis.
     The costume registry made the FORM of hair and headwear pluggable,
     but not the KINDS: whatever a costume table drew, the resolver only
     ever handed it one of nine hair styles and eleven headwear types,
     all of them medieval. That keeps this renderer to one setting. A
     wardrobe owns the vocabulary and the rules that pick from it, so a
     different world is a different wardrobe rather than a rewrite.

       hair(res, spec, u)       -> a hair id
       headwear(res, spec, u)   -> a headwear id
       adjust(hw, res, spec, u) -> optional, applied to explicit choices too
       covers(hw, res, spec)    -> does it hide the hair underneath

     A wardrobe pairs with a costume: the wardrobe says what a character
     wears, the costume knows how to build it. Changing wardrobe changes
     what the person is dressed in, so it is a statement about the world,
     not about paint. Everything that makes the person themselves - sex,
     age, culture, station, profession, the whole face - is untouched by
     it, so one seed is still one person. */

  var WU = { byteOf: byteOf, clamp: clamp, mix: mix, smoothstep: smoothstep };

  function resolveWardrobe(pick) {
    if (!pick) return getNamed("Wardrobe", wardrobeRegistry, "standard");
    if (typeof pick === "string") return getNamed("Wardrobe", wardrobeRegistry, pick);
    return pick;
  }

  function resolveSpec(spec, wardrobe) {
    var W = resolveWardrobe(wardrobe);
    var h = spec.hash[0];
    var c = CULTURES[spec.culture] || CULTURES.frankish;
    var res = Object.create(spec);
    res.sexF = spec.sex === "f";
    res.child = spec.age < 13;
    res.adult = spec.age >= 16;
    res.maturity = smoothstep(3, 19, spec.age);
    res.elder = smoothstep(48, 78, spec.age);
    res.grim = spec.expression < -.33;
    res.kind = spec.expression > .33;
    /* children carry no career: no tonsures, helms or merchant caps */
    var prof = res.child ? "none" : spec.profession;
    res.profession = prof;

    /* skin */
    res.pigment = clamp(c.tone + spec.pigJitter * .9, 0, 4);
    res.skin = skinRamp(res.pigment, spec.health);

    /* hair color */
    var family;
    if (spec.hairColor !== "auto") family = HAIR_FAMILIES[spec.hairColor] || HAIR_FAMILIES.brown;
    else if (spec.redRoll < c.red) family = HAIR_FAMILIES.auburn;
    else if (spec.fairRoll < c.fair) {
      family = spec.hairRoll < .6 ? HAIR_FAMILIES.blond :
        (spec.hairRoll < .8 ? HAIR_FAMILIES.ash : HAIR_FAMILIES.chestnut);
    } else {
      var darkPool = res.pigment > 1.6
        ? [HAIR_FAMILIES.black, HAIR_FAMILIES.black, HAIR_FAMILIES.darkBrown]
        : [HAIR_FAMILIES.black, HAIR_FAMILIES.darkBrown, HAIR_FAMILIES.brown, HAIR_FAMILIES.chestnut];
      family = darkPool[Math.floor(spec.hairRoll * darkPool.length) % darkPool.length];
    }
    res.grayT = smoothstep(44, 74, spec.age + spec.grayBias * 9);
    var hair = lerpC(family, [216, 212, 202], res.grayT);
    if (res.grayT > .9) hair = [229, 226, 218];
    res.hair = hair;
    res.hairD = shade(hair, -.12, .02, -3);
    res.hairDD = shade(hair, -.22, .03, -5);
    res.hairL = shade(hair, .13, -.02, 4);

    /* eyes */
    var eyeKey;
    if (res.pigment < 1.4) {
      eyeKey = spec.eyeRoll < .3 ? "blue" : spec.eyeRoll < .45 ? "green" :
        spec.eyeRoll < .57 ? "gray" : spec.eyeRoll < .7 ? "hazel" : "brown";
    } else if (res.pigment < 2.4) {
      eyeKey = spec.eyeRoll < .12 ? "green" : spec.eyeRoll < .3 ? "hazel" :
        spec.eyeRoll < .75 ? "brown" : "dark";
    } else {
      eyeKey = spec.eyeRoll < .1 ? "hazel" : spec.eyeRoll < .55 ? "brown" : "dark";
    }
    res.eyeKey = eyeKey;
    res.eye = EYE_COLORS[eyeKey];

    /* hair style, from the wardrobe's vocabulary */
    var style = spec.hairStyle;
    if (style === "auto") style = W.hair(res, spec, WU);
    res.hairStyleR = style;

    /* beard */
    res.beardV = (!res.sexF && res.adult) ? spec.beard : 0;
    if (spec.hairStyle === "auto" && !res.sexF && res.adult && spec.religion === "muslim") {
      res.beardV = Math.max(res.beardV, .45);
    }
    res.beardKind = res.beardV < .06 ? "none" : res.beardV < .2 ? "stubble" :
      res.beardV < .45 ? "short" : res.beardV < .75 ? "full" : "long";
    /* How much hair and how it is CUT are two different facts, and the
       slider only ever carried the first. Every man at .5 wore the same
       full beard and every man at .9 the same long one, so the whole axis
       really did run from a few wisps to a full beard with nothing else in
       it. A goatee, mutton chops, a forked or a spade beard are the same
       quantity of hair worn differently, and which one a man wears is
       identity, not paint, so it is resolved here beside the amount. The
       cut is taken from a hash byte rather than the rng stream, so adding
       it moves no existing render, and the choices are filtered by the
       amount: nobody wears mutton chops down to his chest. */
    var beardCuts = {
      stubble: ["full", "goatee", "chinstrap", "chops"],
      short: ["full", "square", "goatee", "chinstrap", "chops", "stache"],
      full: ["full", "square", "spade", "forked", "goatee", "chops"],
      long: ["full", "spade", "forked", "goatee"]
    }[res.beardKind];
    res.beardCut = beardCuts
      ? beardCuts[byteOf(h, 24) % beardCuts.length] : "none";

    /* headwear: an explicit choice wins, otherwise the wardrobe decides */
    var hw = spec.headwear;
    if (hw === "auto") hw = W.headwear(res, spec, WU);
    if (W.adjust) hw = W.adjust(hw, res, spec, WU);
    res.headwearR = hw;
    var hwEntry = HEADDRESS_BY_ID[hw];
    /* The id a style that predates the expansion should draw instead.
       Unknown ids (a wardrobe may invent its own) stand for themselves,
       which is what they did before there was a table. */
    res.headwearBase = hwEntry ? hwEntry.base : hw;
    res.headwearVariantR = pickVariant(hwEntry, spec.headwearVariant, h, 32);
    /* covers: the wardrobe hook still rules the eleven it has always
       known, so no existing render moves. A type the table added
       afterwards appears in no wardrobe's covers() list, so its own
       entry answers for it. */
    res.coversHair = !!W.covers(hw, res, spec) ||
      !!(hwEntry && hwEntry.base !== hw && hwEntry.covers);
    if (hwEntry && hwEntry.uncovers &&
      hwEntry.uncovers.indexOf(res.headwearVariantR) >= 0) {
      res.coversHair = false;
    }
    res.hwFit = clamp(spec.hwFit, 0, 1);
    res.hwVolume = clamp(spec.hwVolume, 0, 1);
    res.hwDrape = clamp(spec.hwDrape, 0, 1);
    res.hwTrim = clamp(spec.hwTrim, 0, 1);

    /* wound: the type, the form of it, where it sits and how far along it
       is. Resolved here rather than in each drawer so every style that
       reads a wound reads the same one. */
    var wd = WOUND_BY_ID[spec.wound] ? spec.wound : "none";
    var wdEntry = WOUND_BY_ID[wd];
    res.wound = wd;
    res.woundBase = wdEntry.base;
    res.woundVariantR = pickVariant(wdEntry, spec.woundVariant, h, 33);
    res.woundPlaceR = wdEntry.place ||
      (spec.woundPlace !== "auto" && WOUND_PLACES.indexOf(spec.woundPlace) > 0
        ? spec.woundPlace
        : WOUND_AUTO_PLACES[byteOf(h, 34) % WOUND_AUTO_PLACES.length]);
    res.woundSideR = spec.woundSide === "left" ? -1
      : spec.woundSide === "right" ? 1 : spec.markSide;
    res.woundSev = clamp(spec.woundSeverity, 0, 1);
    res.woundHealedR = clamp(spec.woundHealed, 0, 1);
    res.woundFitR = clamp(spec.woundFit, 0, 1);

    /* neck item */
    var nk = spec.neckItem;
    if (nk === "auto") {
      if (prof === "priest") nk = "cross";
      else if (prof === "monk") nk = byteOf(h, 16) > 170 ? "cross" : "none";
      else if (spec.tier >= 5 && byteOf(h, 16) > 110) nk = "amulet";
      else if (spec.tier >= 3 && byteOf(h, 16) > 190) nk = spec.religion === "christian" ? "cross" : "amulet";
      else nk = "none";
    }
    res.neckR = nk;

    /* dress, background, light */
    res.cloth = clothFor(spec, prof);
    res.linen = [226, 219, 204];
    res.bgTop = hsl2rgb(spec.bgHue, .25, .26);
    res.bgBot = hsl2rgb(spec.bgHue, .3, .11);
    res.accent = hsl2rgb(spec.bgHue + 28, .38, .58);
    res.lx = spec.keySide;   /* light arrives from this x sign */
    res.sx = -spec.keySide;  /* shadow side */
    res.earring = res.sexF && res.adult && byteOf(h, 17) > 96;
    /* Build, for anything that draws below the collar. Two people with
       the same face should not have the same legs. Taken from spare hash
       bytes rather than the rng stream, so adding it moves no existing
       render: byteOf is a pure function of the hash and consumes nothing.
       build 0 is spare, 1 is heavy; stature shifts leg against torso. */
    res.build = clamp(byteOf(h, 21) / 255 * 1.12 - .06, 0, 1);
    res.stature = clamp(byteOf(h, 22) / 255 * 1.12 - .06, 0, 1);
    /* age carries it too: children and the very old are lighter of limb */
    res.build = clamp(res.build * (1 - res.elder * .22) *
      (.72 + .28 * res.maturity), 0, 1);
    res.jewelTier = spec.tier;
    return res;
  }

  function describeSpec(res) {
    var ages = res.age < 13 ? "child" : res.age < 28 ? "young" : res.age < 48 ? "mature" : res.age < 66 ? "older" : "elder";
    var mood = res.grim ? "guarded" : res.kind ? "warm" : "composed";
    var noun = res.profession !== "none" ? res.profession :
      (res.sexF ? TIER_NOUN_F : TIER_NOUN_M)[clamp(res.tier, 0, 7)];
    var cond = res.health === "hale" ? "" :
      res.health === "sick" ? ", visibly unwell" : ", at death's door";
    var article = /^[aeiou]/i.test(ages) ? "An " : "A ";
    return article + ages + " " + CULTURES[res.culture].adj + " " + noun +
      ", " + mood + cond + ", in " + res.cloth.kind + " dress under " +
      (res.lx < 0 ? "left" : "right") + "-hand light.";
  }

  /* ============================================================
     Layout geometry - the proportional canon.
     A style may register canon: { ... } overriding any of these
     fields; the defaults reproduce the original portrait layout
     exactly. This is what lets a style change WHAT a face is
     (chibi, elongated, heroic) instead of just how it is painted,
     while every proportion still scales off the same seeded
     character, so one seed stays the same person.
     ============================================================ */

  var CANON_DEFAULTS = {
    eyeLineY: 116,     /* eye line before the child shift */
    matEyeShift: 7,    /* how far child eyes sit lower */
    skullH: 72,        /* eye line to skull top */
    browLift: 13,      /* eye line to brow */
    noseDrop: 25,      /* eye line to nose base (times seeded noseLen) */
    mouthDrop: 14,     /* nose base to mouth */
    chinDrop: 18,      /* mouth to chin (times seeded chin) */
    gonR: .74,         /* jaw-corner width as a share of headW */
    gonYd: 4,          /* mouth to jaw corner */
    headW: 38,         /* head half-width (times seeded faceWidth) */
    templeR: .8,       /* temple width as a share of headW */
    jawR: .5,          /* jaw width as a share of headW */
    chinWU: 8,         /* chin pad half-width */
    eyeSpread: .4,     /* eye offset from center as a share of headW */
    eyeScale: .21,     /* eye half-width as a share of headW */
    eyeAspect: .58,    /* eye height as a share of its width */
    noseScale: .155,   /* nose half-width as a share of headW */
    mouthScale: .3,    /* mouth half-width as a share of headW */
    earScale: 1,
    neckScale: 1,
    neckTopGap: 12,    /* chin to visible neck top */
    neckBase: 202,
    shoulderY: 228,
    shoulderScale: 1,
    hairlineDrop: 25,  /* skull top to hairline */
    yawScale: 1,       /* how strongly the head turn glides features */
    turn: 0,           /* fixed view turn added to the seeded yaw; past
                          |.12| the true three-quarter asymmetry engages:
                          far eye foreshortens, far cheek flattens */
    turnScale: 1       /* amplifier on the seeded yaw */
  };

  function layoutOf(res, canon) {
    var C = CANON_DEFAULTS;
    if (canon) {
      C = {};
      Object.keys(CANON_DEFAULTS).forEach(function (key) {
        C[key] = canon[key] === undefined ? CANON_DEFAULTS[key] : canon[key];
      });
    }
    var mt = res.maturity;
    var hf = .84 + .16 * mt;
    var yaw = res.yaw;
    var glide = 24 * C.yawScale;
    var turn = clamp(yaw * C.turnScale + C.turn, -.55, .55);
    var pos = Math.max(0, turn), neg = Math.max(0, -turn);
    /* the true three-quarter engages only past the stock yaw range, so
       the default canon stays bit-identical */
    var over = Math.max(0, Math.abs(turn) - .12);
    var farS = turn >= 0 ? 1 : -1;
    var L = {
      mt: mt, hf: hf, yaw: yaw,
      turn: turn, over: over, far: over > 0 ? farS : 0,
      lx: res.lx, sx: res.sx,
      cx: 128,
      eyeY: C.eyeLineY + (1 - mt) * C.matEyeShift
    };
    L.skullTop = L.eyeY - C.skullH * hf;
    L.browY = L.eyeY - C.browLift * hf;
    L.noseBase = L.eyeY + C.noseDrop * res.noseLen * hf * (.85 + .15 * mt);
    L.mouthY = L.noseBase + C.mouthDrop * hf;
    L.chinY = L.mouthY + C.chinDrop * res.chin * hf * (.78 + .22 * mt);
    L.headW = C.headW * res.faceWidth * (.9 + .1 * mt);
    L.templeW = L.headW * C.templeR;
    L.jawW = L.headW * C.jawR * (.85 + .15 * res.jaw) * (.9 + .1 * mt);
    L.chinW = C.chinWU * hf * (.65 + .4 * res.jaw);
    /* the gonial corner: where the jaw turns toward the chin */
    L.gonW = L.headW * C.gonR * (.85 + .15 * res.jaw);
    L.gonY = L.mouthY + C.gonYd * hf;
    L.cheekY = L.eyeY + 9;
    L.jawY = L.mouthY + 5;
    L.jowl = res.elder;
    L.wL = 1 + .26 * pos - .48 * neg;
    L.wR = 1 + .26 * neg - .48 * pos;
    L.shift = function (d) { return turn * glide * d; };
    L.ox = turn * glide * .45;
    L.nx = L.cx + L.shift(1);
    L.mx = L.cx + L.shift(.85);
    L.fx = L.cx + L.shift(.55); /* eye-plane center */
    L.ex = L.headW * C.eyeSpread * res.eyeSpacing;
    L.open = res.health === "dying" ? .34 :
      1 - .14 * res.elder - .12 * Math.max(0, res.expression);
    L.eyeW = L.headW * C.eyeScale * res.eyeSize;
    L.eyeH = L.eyeW * C.eyeAspect * L.open;
    /* per-side eye metrics: the far eye foreshortens in three-quarter */
    var eyeSide = function (sideSign) {
      return !over ? 1 : (sideSign === farS ? 1 - 1.5 * over : 1 + .25 * over);
    };
    var exSide = function (sideSign) {
      return !over ? 1 : (sideSign === farS ? 1 - 1.2 * over : 1 + .1 * over);
    };
    L.eyeWs = [L.eyeW * eyeSide(-1), L.eyeW * eyeSide(1)];
    L.exs = [L.ex * exSide(-1), L.ex * exSide(1)];
    L.nw = L.headW * C.noseScale * res.noseW;
    L.mw = L.headW * C.mouthScale * res.mouthW;
    L.earY = L.eyeY + 6;
    L.earH = 10.5 * res.earSize * hf * C.earScale;
    L.earW = 4.6 * res.earSize * hf * C.earScale;
    L.earLS = clamp(1 + .5 * pos - 2.3 * neg, .12, 1.5);
    L.earRS = clamp(1 + .5 * neg - 2.3 * pos, .12, 1.5);
    L.neckW = (res.sexF ? 15 : 18.5) * hf * (.8 + .2 * mt) * C.neckScale;
    L.neckTop = L.chinY - C.neckTopGap;
    L.neckBase = C.neckBase;
    L.shoulderY = C.shoulderY;
    L.shoulderW = (res.sexF ? 86 : 100) * (.62 + .38 * mt) * C.shoulderScale;
    L.hairline = L.skullTop + C.hairlineDrop * hf + (res.hairStyleR === "receding" ? 9 : 0);
    return L;
  }

  /* ---------- shared silhouette paths (ported) ---------- */

  function headPath(ctx, res, L) {
    var cx = L.cx + L.ox;
    var tx = L.cx + L.shift(.5);
    var a = res.asymmetry;
    var wl = L.wL * (1 + a), wr = L.wR * (1 - a);
    var tempL = cx - L.templeW * wl, tempR = cx + L.templeW * wr;
    var cheekL = cx - L.headW * wl, cheekR = cx + L.headW * wr;
    /* three-quarter: the far cheek plane flattens toward the camera */
    if (L.far) {
      var flat = L.over * L.headW;
      if (L.far === 1) {
        tempR -= flat * .3;
        cheekR -= flat * .45;
      } else {
        tempL += flat * .3;
        cheekL += flat * .45;
      }
    }
    var jowlOut = L.jowl * 2.2;
    var gonX = L.cx + L.shift(.6);
    var gonL = gonX - L.gonW * wl - jowlOut, gonR = gonX + L.gonW * wr + jowlOut;
    if (L.far) {
      var gflat = L.over * L.gonW;
      if (L.far === 1) gonR -= gflat * .35;
      else gonL += gflat * .35;
    }
    var chinX = L.cx + L.shift(.8);
    var cheekPush = res.cheek * 1.6 + (1 - L.mt) * 1.4;
    ctx.beginPath();
    ctx.moveTo(cheekL, L.cheekY);
    ctx.bezierCurveTo(cheekL - 1, L.eyeY - 10, tempL - 1.5, L.browY + 4, tempL, L.browY - 10);
    ctx.bezierCurveTo(tempL + 1, L.skullTop + 12, tx - L.templeW * .56, L.skullTop + 1.5, tx, L.skullTop);
    ctx.bezierCurveTo(tx + L.templeW * .56, L.skullTop + 1.5, tempR - 1, L.skullTop + 12, tempR, L.browY - 10);
    ctx.bezierCurveTo(tempR + 1.5, L.browY + 4, cheekR + 1, L.eyeY - 10, cheekR, L.cheekY);
    /* the lower face has bone: cheek drops to the jaw corner, the jaw
       turns, and only then does the line run in to a full chin */
    ctx.bezierCurveTo(cheekR + cheekPush, L.cheekY + 9, gonR + 1.5, L.gonY - 7, gonR, L.gonY);
    ctx.bezierCurveTo(gonR - 1, L.gonY + 6.5, chinX + L.chinW * 1.7, L.chinY - 5.5, chinX + L.chinW * .95, L.chinY - 1.8);
    ctx.quadraticCurveTo(chinX, L.chinY + 3.4, chinX - L.chinW * .95, L.chinY - 1.8);
    ctx.bezierCurveTo(chinX - L.chinW * 1.7, L.chinY - 5.5, gonL + 1, L.gonY + 6.5, gonL, L.gonY);
    ctx.bezierCurveTo(gonL - 1.5, L.gonY - 7, cheekL - cheekPush, L.cheekY + 9, cheekL, L.cheekY);
    ctx.closePath();
  }

  function torsoPath(ctx, L) {
    var cx = L.cx;
    /* the body follows the head turn a fraction: the neckline glides and
       the near shoulder reads a touch wider */
    var nx = cx + L.shift(.3);
    var t = L.turn || 0;
    var swL = L.shoulderW * (1 + .09 * Math.max(0, t) - .04 * Math.max(0, -t));
    var swR = L.shoulderW * (1 + .09 * Math.max(0, -t) - .04 * Math.max(0, t));
    ctx.beginPath();
    ctx.moveTo(cx - swL, 292);
    ctx.lineTo(cx - swL, L.shoulderY + 26);
    ctx.bezierCurveTo(cx - swL, L.shoulderY + 6, cx - swL * .86, L.shoulderY - 6, cx - swL * .62, L.shoulderY - 12);
    ctx.bezierCurveTo(cx - swL * .34, L.shoulderY - 18, nx - L.neckW - 14, L.neckBase - 14, nx - L.neckW - 4, L.neckBase - 22);
    ctx.lineTo(nx + L.neckW + 4, L.neckBase - 22);
    ctx.bezierCurveTo(nx + L.neckW + 14, L.neckBase - 14, cx + swR * .34, L.shoulderY - 18, cx + swR * .62, L.shoulderY - 12);
    ctx.bezierCurveTo(cx + swR * .86, L.shoulderY - 6, cx + swR, L.shoulderY + 6, cx + swR, L.shoulderY + 26);
    ctx.lineTo(cx + swR, 292);
    ctx.closePath();
  }

  function neckPath(ctx, L) {
    /* the neck slants with the turn: its top follows the chin, its base
       stays with the body */
    var tc = L.cx + L.shift(.62);
    var bc = L.cx + L.shift(.22);
    ctx.beginPath();
    ctx.moveTo(tc - L.neckW, L.neckTop - 8);
    ctx.bezierCurveTo(tc - L.neckW - 1, L.neckTop + 12, bc - L.neckW - 2.5, L.neckBase - 12, bc - L.neckW - 8, L.neckBase + 4);
    ctx.lineTo(bc + L.neckW + 8, L.neckBase + 4);
    ctx.bezierCurveTo(bc + L.neckW + 2.5, L.neckBase - 12, tc + L.neckW + 1, L.neckTop + 12, tc + L.neckW, L.neckTop - 8);
    ctx.closePath();
  }

  function collarArc(ctx, L, spread, drop) {
    var cx = L.cx;
    ctx.beginPath();
    ctx.moveTo(cx - L.neckW - spread, L.neckBase - 12);
    ctx.quadraticCurveTo(cx, L.neckBase + drop, cx + L.neckW + spread, L.neckBase - 12);
  }

  function capPath(ctx, res, L, ext, fyL, fyM, fyR) {
    var cx = L.cx + L.ox, tx = L.cx + L.shift(.5);
    var tempL = cx - L.templeW * L.wL - ext;
    var tempR = cx + L.templeW * L.wR + ext;
    var topY = L.skullTop - ext;
    ctx.beginPath();
    ctx.moveTo(tempL, L.earY - 3);
    ctx.bezierCurveTo(tempL - 1.5, L.browY - 2, tempL - 1, L.skullTop + 10, tx - L.templeW * .52, topY + 1.5);
    ctx.quadraticCurveTo(tx, topY - 2.5, tx + L.templeW * .52, topY + 1.5);
    ctx.bezierCurveTo(tempR + 1, L.skullTop + 10, tempR + 1.5, L.browY - 2, tempR, L.earY - 3);
    ctx.quadraticCurveTo(tempR - 3, fyR + 4, cx + L.templeW * .42, fyR);
    ctx.quadraticCurveTo(tx, fyM, cx - L.templeW * .42, fyL);
    ctx.quadraticCurveTo(tempL + 3, fyL + 4, tempL, L.earY - 3);
    ctx.closePath();
  }

  function curlyPath(ctx, res, L, extra) {
    var cx = L.cx, tx = cx + L.shift(.5);
    var cy0 = L.browY - 2;
    var rx = L.templeW + 5 + extra;
    var ry = cy0 - L.skullTop + 7 + extra;
    var i, a, px, py, midA, mx2, my2;
    ctx.beginPath();
    ctx.moveTo(tx - rx, cy0 + 6);
    for (i = 0; i < 9; i += 1) {
      a = Math.PI - (i + 1) * (Math.PI / 9);
      px = tx + Math.cos(a) * rx;
      py = cy0 - Math.sin(a) * ry;
      midA = Math.PI - (i + .5) * (Math.PI / 9);
      mx2 = tx + Math.cos(midA) * (rx + 4.5 + (i % 2) * 2.5);
      my2 = cy0 - Math.sin(midA) * (ry + 4.5 + (i % 2) * 2.5);
      ctx.quadraticCurveTo(mx2, my2, px, py);
    }
    ctx.lineTo(tx + rx, cy0 + 6);
    var fy = L.hairline + 6;
    ctx.quadraticCurveTo(tx + rx * .7, fy + 5, tx + rx * .5, fy);
    ctx.quadraticCurveTo(tx + rx * .25, fy - 3, tx + rx * .08, fy + 1);
    ctx.quadraticCurveTo(tx - rx * .2, fy + 4, tx - rx * .4, fy);
    ctx.quadraticCurveTo(tx - rx * .68, fy - 3, tx - rx, cy0 + 6);
    ctx.closePath();
  }

  function beardPath(ctx, res, L, len, forked) {
    var cx = L.cx;
    var wl = L.wL, wr = L.wR;
    var chinX = cx + L.shift(.8);
    var gonX = cx + L.shift(.6);
    var startL = cx - L.headW * wl * .98, startR = cx + L.headW * wr * .98;
    ctx.beginPath();
    ctx.moveTo(startL, L.cheekY + 1);
    ctx.bezierCurveTo(gonX - L.gonW * wl - 3, L.gonY, chinX - L.chinW - 7, L.chinY - 2, chinX - L.chinW * .9, L.chinY + len * .72);
    if (forked) {
      ctx.quadraticCurveTo(chinX - L.chinW * .55, L.chinY + len * 1.12, chinX - 3.4, L.chinY + len);
      ctx.quadraticCurveTo(chinX, L.chinY + len * .68, chinX + 3.4, L.chinY + len);
      ctx.quadraticCurveTo(chinX + L.chinW * .55, L.chinY + len * 1.12, chinX + L.chinW * .9, L.chinY + len * .72);
    } else {
      ctx.quadraticCurveTo(chinX, L.chinY + len * 1.14, chinX + L.chinW * .9, L.chinY + len * .72);
    }
    ctx.bezierCurveTo(chinX + L.chinW + 7, L.chinY - 2, gonX + L.gonW * wr + 3, L.gonY, startR, L.cheekY + 1);
    ctx.quadraticCurveTo(L.mx + L.mw * 1.35, L.noseBase + 2, L.mx, L.noseBase + 4);
    ctx.quadraticCurveTo(L.mx - L.mw * 1.35, L.noseBase + 2, startL, L.cheekY + 1);
    ctx.closePath();
    /* keep the lips clear */
    ctx.moveTo(L.mx + L.mw * 1.08, L.mouthY + 1);
    ctx.ellipse(L.mx, L.mouthY + 1, L.mw * 1.08, 5.6, 0, 0, TAU);
  }

  function crownBandPath(ctx, res, L, yBot, yTop) {
    var cx = L.cx, tx = cx + L.shift(.5);
    ctx.beginPath();
    ctx.moveTo(cx - L.templeW * L.wL - 2, yBot);
    ctx.quadraticCurveTo(tx, yBot - 7, cx + L.templeW * L.wR + 2, yBot);
    ctx.lineTo(cx + L.templeW * L.wR + 1, yTop);
    ctx.quadraticCurveTo(tx, yTop - 7, cx - L.templeW * L.wL - 1, yTop);
    ctx.closePath();
  }

  /* ============================================================
     Painter state and brush helpers.
     STATE holds the per-render style knobs so the ported painters
     stay close to their source. Renders are synchronous, so this
     never leaks across portraits.
     ============================================================ */

  var STATE = { ink: [44, 30, 23], inkW: 1, inkA: 1 };

  function ink(ctx, w, color, alpha) {
    ctx.strokeStyle = css(color || STATE.ink,
      Math.min(1, (alpha === undefined ? 1 : alpha) * STATE.inkA));
    ctx.lineWidth = w * STATE.inkW;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function fEll(ctx, cx, cy, rx, ry, color, alpha, rot) {
    if (rx <= 0 || ry <= 0 || alpha <= 0) return;
    ctx.fillStyle = css(color, alpha === undefined ? 1 : alpha);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU);
    ctx.fill();
  }

  function softEllipse(ctx, cx, cy, rx, ry, color, alpha, rot) {
    if (rx <= 0 || ry <= 0 || alpha <= 0) return;
    /* a gradient blob is not a shape: bypass the mark wrapper (and any
       shape transform) and paint directly - transforms still apply */
    ctx = ctx.raw || ctx;
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.scale(rx, ry);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, css(color, alpha));
    g.addColorStop(.62, css(color, alpha * .55));
    g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* a crescent of cast shadow hugging a cloth edge; call clipped to the head */
  function clothShadow(ctx, L, y0, depth, alpha) {
    var tx = L.cx + L.shift(.5);
    ctx.fillStyle = "rgba(20,14,10," + alpha + ")";
    ctx.beginPath();
    ctx.moveTo(L.cx - L.templeW * L.wL, y0);
    ctx.quadraticCurveTo(tx, y0 - 3, L.cx + L.templeW * L.wR, y0);
    ctx.lineTo(L.cx + L.templeW * L.wR - 3, y0 + depth);
    ctx.quadraticCurveTo(tx, y0 + depth - 3, L.cx - L.templeW * L.wL + 3, y0 + depth);
    ctx.closePath();
    ctx.fill();
  }

  function gemDot(ctx, x, y, r, color) {
    fEll(ctx, x, y, r, r, color);
    ink(ctx, Math.max(.7, r * .3), [60, 44, 18]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    fEll(ctx, x - r * .35, y - r * .38, Math.max(.5, r * .32), Math.max(.5, r * .32), [255, 248, 230], .95);
  }

  /* ============================================================
     Painters - the cel-and-ink steps, ported and viewified.
     Every painter takes v = { ctx, res, L, rng, dt, U, k }.
     ============================================================ */

  function pBackground(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var g = ctx.createLinearGradient(0, 0, 0, 288);
    g.addColorStop(0, css(res.bgTop));
    g.addColorStop(1, css(res.bgBot));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 288);

    /* the halo disc: the one big graphic gesture every portrait gets */
    var discR = 96 + res.tier * 2;
    fEll(ctx, L.cx, L.eyeY - 4, discR, discR, res.accent, .14);
    fEll(ctx, L.cx, L.eyeY - 4, discR - 14, discR - 14, shade(res.accent, .1, .05), .12);

    /* stone arch behind royalty */
    if (res.tier >= 6) {
      ink(ctx, 14, shade(res.bgTop, .12, -.06), .55);
      ctx.beginPath();
      ctx.arc(L.cx, L.eyeY + 36, 114, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }

    /* a flat drape panel with hard fold lines for the propertied */
    if (res.tier >= 3) {
      var dx = L.cx + res.sx * 64;
      var drape = hsl2rgb(res.bgHue + 14, .3, .18);
      ctx.fillStyle = css(drape, .85);
      ctx.fillRect(Math.min(dx, dx + res.sx * 96), 0, 96, 288);
      ink(ctx, 2, shade(drape, -.08, .02), .5);
      ctx.beginPath();
      ctx.moveTo(dx + res.sx * 22, 0);
      ctx.lineTo(dx + res.sx * 22, 288);
      ctx.moveTo(dx + res.sx * 58, 0);
      ctx.lineTo(dx + res.sx * 58, 288);
      ctx.stroke();
    }

    /* a hard light beam from the key corner */
    ctx.fillStyle = "rgba(255,240,210,.06)";
    ctx.beginPath();
    ctx.moveTo(L.cx + res.lx * 128, 0);
    ctx.lineTo(L.cx + res.lx * 30, 0);
    ctx.lineTo(L.cx + res.lx * 128, 200);
    ctx.closePath();
    ctx.fill();
  }

  function pTorso(v) {
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    var cl = res.cloth;
    torsoPath(ctx, L);
    ctx.fillStyle = css(cl.base);
    ctx.fill();
    ink(ctx, 2.4);
    ctx.stroke();

    ctx.save();
    torsoPath(ctx, L);
    ctx.clip();
    var R = L.shoulderW * 1.5;
    ctx.fillStyle = css(cl.deep, .78);
    ctx.beginPath();
    ctx.arc(L.cx + res.sx * (R - L.shoulderW * .1), L.shoulderY + 30, R, 0, TAU);
    ctx.fill();
    ink(ctx, 2.2, cl.deep, .8);
    var f, fx0;
    for (f = -1; f <= 1; f += 2) {
      fx0 = L.cx + f * L.shoulderW * .42 + (rng() - .5) * 6;
      ctx.beginPath();
      ctx.moveTo(fx0, L.shoulderY + 8);
      ctx.quadraticCurveTo(fx0 + f * 4, 262, fx0 + f * (6 + rng() * 6), 292);
      ctx.stroke();
    }
    fEll(ctx, L.cx + res.lx * L.shoulderW * .52, L.shoulderY + 2, L.shoulderW * .2, 7, cl.light, .8, res.lx * -.2);
    ctx.restore();
  }

  function pNeck(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var sk = res.skin;
    neckPath(ctx, L);
    ctx.fillStyle = css(sk.base);
    ctx.fill();
    ink(ctx, 1.6);
    ctx.stroke();

    ctx.save();
    neckPath(ctx, L);
    ctx.clip();
    ctx.fillStyle = css(sk.shadow, .9);
    ctx.beginPath();
    ctx.moveTo(L.cx - L.neckW - 8, L.neckTop + 2);
    ctx.quadraticCurveTo(L.cx + L.shift(.7), L.neckTop + 16, L.cx + L.neckW + 8, L.neckTop + 2);
    ctx.lineTo(L.cx + L.neckW + 8, L.neckTop - 10);
    ctx.lineTo(L.cx - L.neckW - 8, L.neckTop - 10);
    ctx.closePath();
    ctx.fill();
    if (res.elder > .45) {
      ink(ctx, 1.2, sk.line, .5);
      ctx.beginPath();
      ctx.moveTo(L.cx - L.neckW * .6, L.neckBase - 16);
      ctx.quadraticCurveTo(L.cx, L.neckBase - 12, L.cx + L.neckW * .6, L.neckBase - 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function pChainOfOffice(v, heavy) {
    var ctx = v.ctx, L = v.L;
    var cx = L.cx;
    var x0 = cx - L.shoulderW * .4, x1 = cx + L.shoulderW * .4;
    var yTop = L.shoulderY - 10, yMid = L.neckBase + 34;
    var n = heavy ? 13 : 10, i, t, x, y;
    for (i = 0; i <= n; i += 1) {
      t = i / n;
      x = mix(x0, x1, t);
      y = yTop + (yMid - yTop) * (1 - Math.pow(t * 2 - 1, 2));
      fEll(ctx, x, y, heavy ? 2.8 : 2.2, heavy ? 2.8 : 2.2, i % 2 ? [212, 178, 96] : [150, 118, 56]);
      ink(ctx, .7, [90, 66, 26], .9);
      ctx.stroke();
    }
    fEll(ctx, cx, yMid + 4, heavy ? 6.4 : 5, heavy ? 6.4 : 5, [206, 170, 88]);
    ink(ctx, 1.2, [90, 66, 26]);
    ctx.stroke();
    fEll(ctx, cx, yMid + 4, heavy ? 2.6 : 2, heavy ? 2.6 : 2, [120, 40, 44]);
    fEll(ctx, cx - 1.4, yMid + 2.6, .9, .9, [255, 244, 214], .9);
  }

  function pGarment(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cl = res.cloth;
    var cx = L.cx;
    var kind = cl.kind;

    if (kind === "tunic" || kind === "cote") {
      ink(ctx, 6, cl.dark);
      collarArc(ctx, L, 6, 4);
      ctx.stroke();
      ink(ctx, 2, cl.trim, kind === "cote" ? .95 : .7);
      collarArc(ctx, L, 6, 1);
      ctx.stroke();
      if (res.tier <= 1 && kind === "tunic") {
        ink(ctx, 2.4, cl.deep);
        ctx.beginPath();
        ctx.moveTo(cx, L.neckBase + 6);
        ctx.lineTo(cx, L.neckBase + 24);
        ctx.stroke();
        ink(ctx, 1.4, [212, 196, 164], .9);
        var lc;
        for (lc = 0; lc < 3; lc += 1) {
          ctx.beginPath();
          ctx.moveTo(cx - 4.5, L.neckBase + 8 + lc * 5.5);
          ctx.lineTo(cx + 4.5, L.neckBase + 12.5 + lc * 5.5);
          ctx.moveTo(cx + 4.5, L.neckBase + 8 + lc * 5.5);
          ctx.lineTo(cx - 4.5, L.neckBase + 12.5 + lc * 5.5);
          ctx.stroke();
        }
      }
      if (kind === "cote") {
        var bi;
        for (bi = 0; bi < 5; bi += 1) {
          fEll(ctx, cx, L.neckBase + 12 + bi * 9, 2, 2, cl.trim);
          ink(ctx, .8);
          ctx.stroke();
        }
      }
    } else if (kind === "court" || kind === "royal") {
      /* mantle panels over the shoulders */
      var mantle = shade(cl.base, -.09, .04, -14);
      var side, ms;
      for (ms = 0; ms < 2; ms += 1) {
        side = ms === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + side * L.shoulderW * .3, L.shoulderY - 15);
        ctx.bezierCurveTo(cx + side * L.shoulderW * .72, L.shoulderY - 16, cx + side * L.shoulderW * .98, L.shoulderY - 2, cx + side * L.shoulderW, L.shoulderY + 22);
        ctx.lineTo(cx + side * L.shoulderW, 292);
        ctx.lineTo(cx + side * L.shoulderW * .56, 292);
        ctx.bezierCurveTo(cx + side * L.shoulderW * .62, 272, cx + side * L.shoulderW * .44, L.shoulderY + 18, cx + side * L.shoulderW * .3, L.shoulderY - 15);
        ctx.closePath();
        ctx.fillStyle = css(mantle);
        ctx.fill();
        ink(ctx, 1.8, shade(mantle, -.16, 0));
        ctx.stroke();
        if (kind === "royal") {
          ink(ctx, 1.6, cl.trim, .7);
          ctx.beginPath();
          ctx.moveTo(cx + side * L.shoulderW * .32, L.shoulderY - 12);
          ctx.bezierCurveTo(cx + side * L.shoulderW * .46, L.shoulderY + 24, cx + side * L.shoulderW * .6, 274, cx + side * L.shoulderW * .58, 292);
          ctx.stroke();
        }
      }
      /* collar: one scalloped fur band, ermine for royalty */
      var furCol = kind === "royal" ? [234, 229, 218] : cl.fur;
      var bumps = 11, bi2, bx2, by2;
      ctx.beginPath();
      ctx.moveTo(cx - L.neckW - 12, L.neckBase - 12);
      for (bi2 = 0; bi2 <= bumps; bi2 += 1) {
        bx2 = mix(cx - L.neckW - 12, cx + L.neckW + 12, bi2 / bumps);
        by2 = L.neckBase + 8 - Math.abs(bi2 / bumps - .5) * 10 + (bi2 % 2 ? 2.6 : -1);
        ctx.lineTo(bx2, by2);
      }
      ctx.lineTo(cx + L.neckW + 12, L.neckBase - 12);
      ctx.quadraticCurveTo(cx, L.neckBase - 4, cx - L.neckW - 12, L.neckBase - 12);
      ctx.closePath();
      ctx.fillStyle = css(furCol);
      ctx.fill();
      ink(ctx, 1.6, shade(furCol, -.3, .02));
      ctx.stroke();
      if (kind === "royal") {
        var et, etx, ety;
        for (et = -2; et <= 2; et += 1) {
          etx = cx + et * (L.neckW * .55 + 3);
          ety = L.neckBase + 3 - Math.abs(et) * 1.2;
          ctx.fillStyle = css(STATE.ink, .85);
          ctx.beginPath();
          ctx.moveTo(etx, ety - 1.6);
          ctx.lineTo(etx - 1.4, ety + 2.2);
          ctx.lineTo(etx + 1.4, ety + 2.2);
          ctx.closePath();
          ctx.fill();
        }
      }
      pChainOfOffice(v, kind === "royal");
      var bxx = cx + res.lx * L.shoulderW * .44, byy = L.shoulderY - 4;
      fEll(ctx, bxx, byy, 5.6, 5.6, GOLD);
      ink(ctx, 1.2, [90, 66, 26]);
      ctx.stroke();
      fEll(ctx, bxx, byy, 2.4, 2.4, [96, 32, 40]);
      fEll(ctx, bxx - 1.4, byy - 1.6, .9, .9, [255, 246, 224], .95);
    } else if (kind === "gambeson") {
      ctx.save();
      torsoPath(ctx, L);
      ctx.clip();
      ink(ctx, 2.6, cl.deep, .8);
      var q, qx;
      for (q = -6; q <= 6; q += 1) {
        qx = cx + q * 13;
        ctx.beginPath();
        ctx.moveTo(qx, L.neckBase - 6);
        ctx.quadraticCurveTo(qx + q * 1.6, 264, qx + q * 2.6, 292);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(cx - L.neckW - 9, L.neckBase - 2);
      ctx.quadraticCurveTo(cx, L.neckBase + 8, cx + L.neckW + 9, L.neckBase - 2);
      ctx.lineTo(cx + L.neckW + 7, L.neckBase - 15);
      ctx.quadraticCurveTo(cx, L.neckBase - 7, cx - L.neckW - 7, L.neckBase - 15);
      ctx.closePath();
      ctx.fillStyle = css(cl.light);
      ctx.fill();
      ink(ctx, 1.6, cl.deep);
      ctx.stroke();
    } else if (kind === "habit") {
      ctx.beginPath();
      ctx.ellipse(cx, L.neckBase + 12, L.neckW + 26, 17, 0, Math.PI, 0);
      ctx.fillStyle = css(cl.dark);
      ctx.fill();
      ink(ctx, 1.8, cl.deep);
      ctx.stroke();
      fEll(ctx, cx, L.neckBase + 9, L.neckW + 12, 10, cl.deep);
      ink(ctx, 1.4, shade(cl.deep, -.1, 0), .8);
      ctx.beginPath();
      ctx.moveTo(cx - L.neckW - 18, L.neckBase + 11);
      ctx.quadraticCurveTo(cx, L.neckBase + 21, cx + L.neckW + 18, L.neckBase + 11);
      ctx.stroke();
    } else if (kind === "cassock") {
      ink(ctx, 2, shade(cl.base, -.16, 0));
      ctx.beginPath();
      ctx.moveTo(cx, L.neckBase + 4);
      ctx.lineTo(cx, 292);
      ctx.stroke();
      var cb;
      for (cb = 0; cb < 6; cb += 1) {
        fEll(ctx, cx, L.neckBase + 12 + cb * 12, 1.6, 1.6, shade(cl.base, .16, 0));
      }
      ink(ctx, 5, res.linen, .95);
      collarArc(ctx, L, 1, -4);
      ctx.stroke();
    } else if (kind === "doublet") {
      ctx.beginPath();
      ctx.moveTo(cx - L.neckW - 5, L.neckBase - 8);
      ctx.lineTo(cx, L.neckBase + 26);
      ctx.lineTo(cx + L.neckW + 5, L.neckBase - 8);
      ctx.quadraticCurveTo(cx, L.neckBase + 2, cx - L.neckW - 5, L.neckBase - 8);
      ctx.closePath();
      ctx.fillStyle = css([216, 204, 178]);
      ctx.fill();
      ink(ctx, 1.6, cl.trim);
      ctx.stroke();
      ink(ctx, 2.4, cl.trim, .9);
      ctx.beginPath();
      ctx.moveTo(cx - L.neckW - 5, L.neckBase - 8);
      ctx.lineTo(cx, L.neckBase + 26);
      ctx.lineTo(cx + L.neckW + 5, L.neckBase - 8);
      ctx.stroke();
      var db;
      for (db = 0; db < 4; db += 1) {
        fEll(ctx, cx, L.neckBase + 32 + db * 10, 1.8, 1.8, cl.trim);
      }
    }
  }

  function pEars(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var sk = res.skin;
    var sides = [[-1, L.earLS, L.wL], [1, L.earRS, L.wR]];
    var i, side, scale, w, earX;
    for (i = 0; i < 2; i += 1) {
      side = sides[i][0]; scale = sides[i][1]; w = sides[i][2];
      if (scale < .25) continue;
      earX = L.cx + L.ox + side * (L.headW * w + L.earW * .6 - 1.5);
      ctx.save();
      ctx.translate(earX, L.earY);
      ctx.rotate(side * .1);
      ctx.scale(Math.min(scale, 1.1), 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, L.earW, L.earH, 0, 0, TAU);
      ctx.fillStyle = css(sk.base);
      ctx.fill();
      ink(ctx, 1.5);
      ctx.stroke();
      ink(ctx, 1.2, sk.deep, .7);
      ctx.beginPath();
      ctx.arc(-side * L.earW * .1, -L.earH * .1, L.earW * .55, -.8, 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function pHead(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    headPath(ctx, res, L);
    ctx.fillStyle = css(res.skin.base);
    ctx.fill();
    ink(ctx, 2.6);
    ctx.stroke();
  }

  function pShade(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var sk = res.skin;
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();

    /* one hard terminator: a huge circle centered past the shadow side */
    var R = L.headW * 2.2;
    ctx.fillStyle = css(sk.shadow, .85);
    ctx.beginPath();
    ctx.arc(L.cx + res.sx * (R - L.headW * .12), L.eyeY + 10, R, 0, TAU);
    ctx.fill();

    /* forehead shade under the hairline */
    ctx.fillStyle = css(sk.shadow, .55);
    ctx.beginPath();
    ctx.moveTo(L.cx - L.templeW - 6, L.skullTop - 4);
    ctx.lineTo(L.cx + L.templeW + 6, L.skullTop - 4);
    ctx.lineTo(L.cx + L.templeW * .8, L.hairline + 3);
    ctx.quadraticCurveTo(L.cx + L.shift(.5), L.hairline + 8, L.cx - L.templeW * .8, L.hairline + 3);
    ctx.closePath();
    ctx.fill();

    /* under-nose and under-lip chips */
    fEll(ctx, L.nx, L.noseBase + 2.6, L.nw * 1.4, 1.8, sk.deep, .6);
    fEll(ctx, L.mx, L.mouthY + 8.5, L.mw * .5, 2, sk.deep, .6);

    /* gaunt hollows */
    var hollow = (res.health !== "hale" ? .3 : 0) + res.elder * .18;
    if (hollow > 0) {
      var hollowCol = shade(sk.base, -.14, -.09, -2);
      var sides = [-1, 1], si;
      for (si = 0; si < 2; si += 1) {
        fEll(ctx, L.cx + sides[si] * L.headW * .55, L.noseBase + 2, 7.5, 10, hollowCol, Math.min(.5, hollow), sides[si] * -.35);
      }
    }

    /* flat light: the lit cheek and brow planes */
    fEll(ctx, L.cx + res.lx * L.headW * .46, L.eyeY + 11, 9.5, 6.5, sk.lit, .75, res.lx * -.25);
    fEll(ctx, L.cx + res.lx * 9, L.browY - 13, L.templeW * .4, 7, sk.lit, .75, res.lx * .1);

    /* blush */
    var blushA = res.health !== "hale" ? 0 :
      (res.sexF ? .4 : .18) + (res.child ? .25 : 0);
    if (blushA > 0) {
      ctx.fillStyle = css(sk.blush, Math.min(.55, blushA));
      ctx.beginPath();
      ctx.ellipse(L.cx - L.headW * .54, L.noseBase - 2, L.headW * .16, 4.6, -.15, 0, TAU);
      ctx.ellipse(L.cx + L.headW * .54, L.noseBase - 2, L.headW * .16, 4.6, .15, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function pAgeDetail(v) {
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    if (res.child) return;
    var sk = res.skin;
    var wr = smoothstep(32, 76, res.age);
    var e = res.expression;
    if (wr <= 0 && !res.grim) return;
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();
    var i, n, y0, w;
    if (wr > 0) {
      n = Math.round(1 + wr * 2.5);
      ink(ctx, 1.4, sk.line, .3 + wr * .4);
      for (i = 0; i < n; i += 1) {
        y0 = L.hairline + 5 + i * 5;
        w = L.templeW * (.42 + rng() * .16);
        ctx.beginPath();
        ctx.moveTo(L.cx - w, y0);
        ctx.quadraticCurveTo(L.cx + L.shift(.4), y0 - 2.4, L.cx + w, y0);
        ctx.stroke();
      }
      if (res.elder > .3) {
        ink(ctx, 1.1, sk.line, .2 + res.elder * .35);
        var sides = [-1, 1], si, side, ex2;
        for (si = 0; si < 2; si += 1) {
          side = sides[si];
          ex2 = L.fx + side * (L.ex + L.eyeW * 1.3);
          ctx.beginPath();
          ctx.moveTo(ex2, L.eyeY - 1);
          ctx.lineTo(ex2 + side * 4.5, L.eyeY - 3);
          ctx.moveTo(ex2, L.eyeY + 1.5);
          ctx.lineTo(ex2 + side * 5, L.eyeY + 2.5);
          ctx.stroke();
        }
      }
    }
    var naso = wr * .6 + Math.max(0, e) * .35;
    if (naso > .1 && res.beardKind !== "full" && res.beardKind !== "long") {
      ink(ctx, 1.5, sk.line, Math.min(.7, naso * .8));
      ctx.beginPath();
      ctx.moveTo(L.nx - L.nw - 2.5, L.noseBase - 3);
      ctx.quadraticCurveTo(L.mx - L.mw - 5, L.noseBase + 6, L.mx - L.mw * 1.1, L.mouthY + 1);
      ctx.moveTo(L.nx + L.nw + 2.5, L.noseBase - 3);
      ctx.quadraticCurveTo(L.mx + L.mw + 5, L.noseBase + 6, L.mx + L.mw * 1.1, L.mouthY + 1);
      ctx.stroke();
    }
    if (res.grim || res.elder > .4) {
      ink(ctx, 1.3, sk.line, (res.grim ? .45 : 0) + res.elder * .3);
      ctx.beginPath();
      ctx.moveTo(L.fx - 2.8, L.browY - 6);
      ctx.lineTo(L.fx - 1.6, L.browY + 1);
      ctx.moveTo(L.fx + 2.8, L.browY - 6);
      ctx.lineTo(L.fx + 1.6, L.browY + 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ============================================================
     Feature intents and the construction registry.
     The identity-carrying features (eyes, brows, nose, mouth) are
     not fixed drawings: each is a named CONSTRUCTION in this
     registry, chosen per style via features: { eyes: "sparkle",
     mouth: "line", ... } (or a custom function). Constructions
     receive (v, intent) where the intent is the semantic data -
     where the feature sits, how large, how open, what mood - so a
     new construction never re-derives geometry. Styles may
     register their own: YOLO.features.eyes.myname = fn. The "cel"
     entries are the defaults and reproduce the stock pipeline
     exactly.
     ============================================================ */

  var FEATURES = { eyes: {}, brows: {}, nose: {}, mouth: {} };

  function featureIntents(res, L) {
    var e = res.expression;
    var browCol = res.child ? shade(res.hairDD, .1, 0) : res.hairDD;
    var grayBrow = lerpC(browCol, [200, 196, 186], res.grayT * .7);
    function eyeIt(side) {
      var si = side < 0 ? 0 : 1;
      return {
        side: side,
        x: L.fx + side * L.exs[si],
        y: L.eyeY + side * res.asymmetry * 12,
        w: L.eyeWs[si],
        h: L.eyeH,
        open: L.open,
        iris: res.eye,
        lit: res.lx,
        faint: res.health === "dying",
        lash: res.sexF && !res.child
      };
    }
    function browIt(side) {
      var si = side < 0 ? 0 : 1;
      return {
        side: side,
        x: L.fx + side * L.exs[si] * 1.04,
        y: L.browY - 2 + side * res.asymmetry * 15 - Math.max(0, e) * 1.8,
        len: L.eyeWs[si] * 1.5,
        weight: res.browWeight,
        innerDy: e < 0 ? -e * 3.4 : -e * .9,
        color: grayBrow
      };
    }
    return {
      eyes: [eyeIt(-1), eyeIt(1)],
      brows: [browIt(-1), browIt(1)],
      nose: {
        x: L.nx, y: L.noseBase, w: L.nw,
        lit: res.lx, shadow: res.sx,
        flare: res.health === "dying" ? 1.15 : 1
      },
      mouth: {
        x: L.mx, y: L.mouthY, w: L.mw,
        cornerDy: -e * 3 + (res.health === "dying" ? 2.4 : 0),
        loH: Math.max(1.8, 4 * res.lipFull * L.hf * (1 - res.elder * .3)),
        painted: (res.sexF || res.lipFull > 1.08) && !res.child
      }
    };
  }

  function intentsOf(v) {
    if (!v._intents) v._intents = featureIntents(v.res, v.L);
    return v._intents;
  }

  function featureFn(v, part) {
    var pick = (v.features && v.features[part]) || "cel";
    if (typeof pick === "function") return pick;
    return FEATURES[part][pick] || FEATURES[part].cel;
  }

  FEATURES.eyes.cel = function (v, it) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var asymY = res.asymmetry * 12;
    var sides = [-1, 1], si, side;
    for (si = 0; si < 2; si += 1) {
      side = sides[si];
      var ecx = L.fx + side * L.exs[si];
      var ecy = L.eyeY + side * asymY;
      var eyeW = L.eyeWs[si] * 1.18;
      var eyeH = Math.max(1.5, L.eyeH * 1.3);
      var noseX = ecx - side * eyeW;
      var tempX = ecx + side * eyeW;
      var outerLift = res.sexF ? -1.2 : .3;
      var faint = res.health === "dying";

      var lidPath = function () {
        ctx.beginPath();
        ctx.moveTo(noseX, ecy + .6);
        ctx.quadraticCurveTo(ecx, ecy - eyeH * 2, tempX, ecy + outerLift);
        ctx.quadraticCurveTo(ecx, ecy + eyeH * 1.5, noseX, ecy + .6);
        ctx.closePath();
      };

      lidPath();
      ctx.fillStyle = faint ? "rgb(226,220,208)" : "rgb(246,241,230)";
      ctx.fill();
      ink(ctx, 1.3);
      ctx.stroke();

      ctx.save();
      lidPath();
      ctx.clip();
      var irisR = Math.max(1.6, eyeW * .68);
      var irisY = ecy + (faint ? eyeH * .45 : 0);
      fEll(ctx, ecx, irisY, irisR, irisR, res.eye);
      ink(ctx, 1.1, shade(res.eye, -.3, .02));
      ctx.beginPath();
      ctx.arc(ecx, irisY, irisR, 0, TAU);
      ctx.stroke();
      fEll(ctx, ecx, irisY, irisR * .44, irisR * .44, [20, 14, 12]);
      fEll(ctx, ecx + res.lx * irisR * .34, irisY - irisR * .38, Math.max(.8, irisR * .3), Math.max(.8, irisR * .3), [255, 252, 242], .96);
      fEll(ctx, ecx - res.lx * irisR * .3, irisY + irisR * .42, Math.max(.5, irisR * .15), Math.max(.5, irisR * .15), [255, 252, 242], .5);
      fEll(ctx, ecx, ecy - eyeH * 1.5, eyeW * 1.2, eyeH * .8, STATE.ink, .28);
      ctx.restore();

      ink(ctx, (res.sexF ? 2.6 : 2.1) * L.hf);
      ctx.beginPath();
      ctx.moveTo(noseX, ecy + .6);
      ctx.quadraticCurveTo(ecx, ecy - eyeH * 2, tempX, ecy + outerLift);
      if (res.sexF && !res.child) ctx.lineTo(tempX + side * 2, ecy + outerLift - 1.4);
      ctx.stroke();
      ink(ctx, 1, STATE.ink, .35);
      ctx.beginPath();
      ctx.moveTo(ecx - side * eyeW * .3, ecy + eyeH * 1.2);
      ctx.quadraticCurveTo(ecx + side * eyeW * .3, ecy + eyeH * 1.25, tempX - side * .5, ecy + outerLift + .8);
      ctx.stroke();
    }
  };

  FEATURES.brows.cel = function (v, it) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var asymY = res.asymmetry * 15;
    var e = res.expression;
    var browCol = res.child ? shade(res.hairDD, .1, 0) : res.hairDD;
    var grayBrow = lerpC(browCol, [200, 196, 186], res.grayT * .7);
    var sides = [-1, 1], si, side;
    for (si = 0; si < 2; si += 1) {
      side = sides[si];
      var bx = L.fx + side * L.exs[si] * 1.04;
      var by = L.browY - 2 + side * asymY - Math.max(0, e) * 1.8;
      var len = L.eyeWs[si] * 1.5;
      var th = Math.max(1.1, (2.3 * res.browWeight + (res.sexF ? -.7 : .5)) * L.hf);
      var innerDy = e < 0 ? -e * 3.4 : -e * .9;
      var inX = bx - side * len, outX = bx + side * len;
      ctx.beginPath();
      ctx.moveTo(inX, by + innerDy + th * .5);
      ctx.quadraticCurveTo(bx - side * len * .2, by - th * 1.5, outX, by + .8);
      ctx.quadraticCurveTo(bx + side * len * .1, by + th * 1.1, inX, by + innerDy + th * 1.3);
      ctx.closePath();
      ctx.fillStyle = css(grayBrow, res.child ? .7 : 1);
      ctx.fill();
      ink(ctx, .9, STATE.ink, .35);
      ctx.stroke();
    }
  };

  FEATURES.nose.cel = function (v, it) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var sk = res.skin;
    ink(ctx, 1.8, sk.line, .85);
    ctx.beginPath();
    ctx.moveTo(L.nx + res.sx * 1.5, L.eyeY + 4);
    ctx.quadraticCurveTo(L.nx + res.sx * (L.nw * .4 + 1.5), L.eyeY + 12, L.nx + res.sx * (L.nw * .5 + 1), L.noseBase - 3.5);
    ctx.quadraticCurveTo(L.nx + res.sx * (L.nw * .5 + 1.5), L.noseBase - .5, L.nx + res.sx * L.nw * .15, L.noseBase + .5);
    ctx.stroke();
    var flare = res.health === "dying" ? 1.15 : 1;
    var sides = [-1, 1], si, side;
    for (si = 0; si < 2; si += 1) {
      side = sides[si];
      fEll(ctx, L.nx + side * L.nw * flare, L.noseBase - .5, 1.5 * L.hf, 1 * L.hf, shade(sk.deep, -.12, 0), .95, side * .5);
    }
    fEll(ctx, L.nx + res.lx * 1, L.noseBase - 4.5, 2.6, 1.7, sk.lit, .8);
  };

  FEATURES.mouth.cel = function (v, it) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var sk = res.skin;
    var mw = L.mw;
    var y0 = L.mouthY;
    var cornerDy = -res.expression * 3 + (res.health === "dying" ? 2.4 : 0);
    var lx0 = L.mx - mw, rx0 = L.mx + mw;
    var loH = Math.max(1.8, 4 * res.lipFull * L.hf * (1 - res.elder * .3));
    var painted = (res.sexF || res.lipFull > 1.08) && !res.child;

    if (painted) {
      var upH = Math.max(1.5, 2.6 * res.lipFull * L.hf * (1 - res.elder * .3));
      ctx.beginPath();
      ctx.moveTo(lx0, y0 + cornerDy);
      ctx.quadraticCurveTo(L.mx - mw * .4, y0 - upH * 1.6 + cornerDy * .3, L.mx, y0 - upH * .7);
      ctx.quadraticCurveTo(L.mx + mw * .4, y0 - upH * 1.6 + cornerDy * .3, rx0, y0 + cornerDy);
      ctx.quadraticCurveTo(L.mx + mw * .5, y0 + loH + 1.5, L.mx, y0 + loH + 1.5);
      ctx.quadraticCurveTo(L.mx - mw * .5, y0 + loH + 1.5, lx0, y0 + cornerDy);
      ctx.closePath();
      ctx.fillStyle = css(sk.lip, .92);
      ctx.fill();
    }

    ink(ctx, 2.2 * L.hf, sk.lipLine);
    ctx.beginPath();
    ctx.moveTo(lx0, y0 + cornerDy);
    ctx.quadraticCurveTo(L.mx - mw * .4, y0 + cornerDy * .3 + 1, L.mx, y0 + .8);
    ctx.quadraticCurveTo(L.mx + mw * .4, y0 + cornerDy * .3 + 1, rx0, y0 + cornerDy);
    ctx.stroke();

    ctx.fillStyle = css(sk.lip, painted ? .35 : .8);
    ctx.beginPath();
    ctx.moveTo(lx0 + mw * .18, y0 + cornerDy + 1);
    ctx.quadraticCurveTo(L.mx, y0 + loH + 2.2, rx0 - mw * .18, y0 + cornerDy + 1);
    ctx.quadraticCurveTo(L.mx, y0 + 1.6, lx0 + mw * .18, y0 + cornerDy + 1);
    ctx.closePath();
    ctx.fill();
    ink(ctx, 1.1, [255, 238, 224], .6);
    ctx.beginPath();
    ctx.moveTo(L.mx - mw * .3, y0 + loH * .62 + 1);
    ctx.quadraticCurveTo(L.mx, y0 + loH * .8 + 1.4, L.mx + mw * .3, y0 + loH * .62 + 1);
    ctx.stroke();
    ink(ctx, 1.4, sk.lipLine, .9);
    ctx.beginPath();
    ctx.moveTo(lx0 - .6, y0 + cornerDy + .4);
    ctx.lineTo(lx0 - 1.8, y0 + cornerDy + 1);
    ctx.moveTo(rx0 + .6, y0 + cornerDy + .4);
    ctx.lineTo(rx0 + 1.8, y0 + cornerDy + 1);
    ctx.stroke();
  };

  /* the pipeline steps dispatch through the registry */
  function pEyes(v) { featureFn(v, "eyes")(v, intentsOf(v).eyes); }
  function pBrows(v) { featureFn(v, "brows")(v, intentsOf(v).brows); }
  function pNose(v) { featureFn(v, "nose")(v, intentsOf(v).nose); }
  function pMouth(v) { featureFn(v, "mouth")(v, intentsOf(v).mouth); }

  function pSpots(v) {
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();
    /* freckles are the person, not the paper: a face has as many at the
       thumbnail as at the export, and each keeps its design-space size */
    var n = Math.round(res.freckles * 40);
    var i;
    ctx.fillStyle = css(res.skin.line, .5);
    for (i = 0; i < n; i += 1) {
      ctx.beginPath();
      ctx.arc(L.nx + (rng() * 2 - 1) * L.headW * .5, L.eyeY + 7 + (rng() * 2 - 1) * 10, .5 + rng() * .6, 0, TAU);
      ctx.fill();
    }
    if (res.moleRoll > 208) {
      fEll(ctx, L.cx + res.markSide * L.headW * .42, L.mouthY - 2 + (res.moleRoll % 7), 1.1, 1.1, shade(res.skin.base, -.32, .05), .9);
    }
    ctx.restore();
  }

  /* ---------- facial hair ---------- */

  function pMustache(v, color) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var th = 2 + res.beardV * 2;
    var sides = [-1, 1], si, side;
    for (si = 0; si < 2; si += 1) {
      side = sides[si];
      ctx.beginPath();
      ctx.moveTo(L.mx + side * 1, L.noseBase + 2.6);
      ctx.bezierCurveTo(L.mx + side * L.mw * .6, L.noseBase + 2.6 + th * .2, L.mx + side * L.mw * 1.05, L.mouthY - 5, L.mx + side * L.mw * 1.3, L.mouthY + 1.5);
      ctx.bezierCurveTo(L.mx + side * L.mw * .8, L.mouthY - 2 - th * .5, L.mx + side * L.mw * .4, L.noseBase + 3.2 + th, L.mx + side * 1, L.noseBase + 2.8 + th);
      ctx.closePath();
      ctx.fillStyle = css(color);
      ctx.fill();
      ink(ctx, 1.2, res.hairDD);
      ctx.stroke();
    }
  }

  function pFacialHair(v) {
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    if (res.beardKind === "none") return;
    var color = lerpC(res.hairD, res.hairDD, .4);
    var i, n;

    if (res.beardKind === "stubble") {
      ctx.save();
      beardPath(ctx, res, L, 3, false);
      ctx.clip("evenodd");
      n = grainArea(v.dt, 90);
      var gs = grain(v.dt);
      ctx.fillStyle = css(res.hairDD, .45);
      for (i = 0; i < n; i += 1) {
        ctx.beginPath();
        ctx.arc(L.cx + (rng() * 2 - 1) * L.jawW * 1.05, L.noseBase + 2 + rng() * (L.chinY - L.noseBase + 3), .5 * gs, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    var len = (res.beardKind === "short" ? 6 : res.beardKind === "full" ? 17 : 36) * L.hf;
    var forked = res.beardKind === "long" && byteOf(res.hash[0], 18) > 150;
    beardPath(ctx, res, L, len, forked);
    ctx.fillStyle = css(color);
    ctx.fill("evenodd");
    ink(ctx, 2);
    ctx.stroke();

    ctx.save();
    beardPath(ctx, res, L, len, forked);
    ctx.clip("evenodd");
    n = grainLine(v.dt, 14);
    var bg = grain(v.dt);
    for (i = 0; i < n; i += 1) {
      var bx2 = L.cx + (rng() * 2 - 1) * L.jawW;
      var by2 = L.mouthY - 3 + rng() * 8;
      var blen = 6 + rng() * (len + 4);
      ink(ctx, (1 + rng()) * bg, rng() < .3 ? res.hairL : res.hairDD, .5 + rng() * .3);
      ctx.beginPath();
      ctx.moveTo(bx2, by2);
      ctx.quadraticCurveTo(bx2 + (bx2 - L.cx) * .12, by2 + blen * .6, bx2 + (bx2 - L.cx) * .22 + (rng() - .5) * 4, by2 + blen);
      ctx.stroke();
    }
    if (res.age > 48 && res.grayT < .8) {
      fEll(ctx, L.cx + L.shift(.8), L.chinY + len * .42, 3.2, len * .45, [214, 208, 196], .5);
    }
    ctx.restore();

    pMustache(v, color);
  }

  /* ---------- hair ---------- */

  function pBackHair(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    if (res.coversHair) return;
    var style = res.hairStyleR;
    var cx = L.cx, tx = cx + L.shift(.5);
    if (style === "longLoose") {
      ctx.beginPath();
      ctx.moveTo(cx - L.headW * L.wL - 9, L.browY);
      ctx.bezierCurveTo(cx - L.templeW - 9, L.skullTop - 3, tx - L.templeW * .5, L.skullTop - 7, tx, L.skullTop - 7);
      ctx.bezierCurveTo(tx + L.templeW * .5, L.skullTop - 7, cx + L.templeW + 9, L.skullTop - 3, cx + L.headW * L.wR + 9, L.browY);
      ctx.bezierCurveTo(cx + L.headW * L.wR + 17, L.eyeY + 30, cx + L.headW * L.wR + 15, L.neckBase - 20, cx + L.headW * L.wR + 13, L.neckBase + 4);
      ctx.quadraticCurveTo(cx + L.headW * .5, L.shoulderY + 2, cx + L.headW * .28, L.shoulderY - 8);
      ctx.quadraticCurveTo(cx, L.shoulderY + 4, cx - L.headW * .28, L.shoulderY - 8);
      ctx.quadraticCurveTo(cx - L.headW * .5, L.shoulderY + 2, cx - L.headW * L.wL - 13, L.neckBase + 4);
      ctx.bezierCurveTo(cx - L.headW * L.wL - 15, L.neckBase - 20, cx - L.headW * L.wL - 17, L.eyeY + 30, cx - L.headW * L.wL - 9, L.browY);
      ctx.closePath();
      ctx.fillStyle = css(res.hairD);
      ctx.fill();
      ink(ctx, 2.4, res.hairDD);
      ctx.stroke();
      ink(ctx, 1.6, res.hairDD, .8);
      var i;
      for (i = 0; i < 4; i += 1) {
        var side3 = i % 2 ? 1 : -1;
        var hx3 = cx + side3 * (L.headW + 5 + i * 2.5);
        ctx.beginPath();
        ctx.moveTo(hx3, L.eyeY + 12 + i * 3);
        ctx.quadraticCurveTo(hx3 + side3 * 3, L.neckBase - 8, hx3 + side3 * 4, L.neckBase + 12);
        ctx.stroke();
      }
    } else if (style === "curly") {
      fEll(ctx, tx, L.eyeY - 8, L.headW + 9, (L.eyeY - L.skullTop) * .92, res.hairDD);
    } else if (style === "braids" || style === "bun") {
      fEll(ctx, tx, L.eyeY - 12, L.headW + 5, (L.eyeY - L.skullTop) * .82, res.hairDD);
    }
  }

  function pBraidRopes(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx;
    var sides = [-1, 1], si, side;
    for (si = 0; si < 2; si += 1) {
      side = sides[si];
      var p0x = cx + side * (L.jawW + 7), p0y = L.eyeY + 24;
      var p1x = cx + side * (L.neckW + 22), p1y = L.neckBase + 4;
      var p2x = cx + side * (L.neckW + 13), p2y = L.shoulderY + 36;
      var k, t, ix, iy, dxq, dyq, ang, r;
      for (k = 0; k <= 8; k += 1) {
        t = k / 8;
        ix = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
        iy = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;
        dxq = 2 * (1 - t) * (p1x - p0x) + 2 * t * (p2x - p1x);
        dyq = 2 * (1 - t) * (p1y - p0y) + 2 * t * (p2y - p1y);
        ang = Math.atan2(dyq, dxq);
        r = 6 * (1 - t * .38) * L.hf;
        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(ang + (k % 2 ? .5 : -.5));
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * .68, 0, 0, TAU);
        ctx.fillStyle = css(k % 2 ? res.hairD : res.hairDD);
        ctx.fill();
        ink(ctx, 1.1, res.hairDD);
        ctx.stroke();
        ctx.restore();
      }
      /* tie ribbon and tuft */
      ctx.beginPath();
      ctx.moveTo(p2x - 4.5, p2y);
      ctx.lineTo(p2x + 4.5, p2y + 2);
      ctx.lineTo(p2x + 3, p2y + 5);
      ctx.lineTo(p2x - 3.5, p2y + 3.4);
      ctx.closePath();
      ctx.fillStyle = css(res.accent);
      ctx.fill();
      ink(ctx, .9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p2x - 3, p2y + 4);
      ctx.lineTo(p2x, p2y + 12);
      ctx.lineTo(p2x + 3.4, p2y + 4.6);
      ctx.closePath();
      ctx.fillStyle = css(res.hairDD);
      ctx.fill();
    }
  }

  function pFrontHair(v) {
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    if (res.coversHair) return;
    var style = res.hairStyleR;
    var cx = L.cx, tx = cx + L.shift(.5);
    var sk = res.skin;
    var pathFn;

    if (style === "bald") {
      fEll(ctx, tx + res.lx * 8, L.skullTop + 13, 12, 7.5, sk.lit, .8, res.lx * .2);
      if (res.age > 45) {
        ctx.beginPath();
        ctx.ellipse(cx - L.templeW * L.wL - 1, L.earY - 6, 5, 10, .2, 0, TAU);
        ctx.ellipse(cx + L.templeW * L.wR + 1, L.earY - 6, 5, 10, -.2, 0, TAU);
        ctx.fillStyle = css(res.hairD);
        ctx.fill();
        ink(ctx, 1.4, res.hairDD);
        ctx.stroke();
      }
      return;
    }

    if (style === "tonsure") {
      var ts = hairCapShape(res, L);
      pathFn = function () { capPath(ctx, res, L, ts.ext, ts.fyL, ts.fyM, ts.fyR); };
      pathFn();
      ctx.fillStyle = css(res.hairD);
      ctx.fill();
      ink(ctx, 1.8, res.hairDD);
      ctx.stroke();
      fEll(ctx, tx, L.skullTop + 15, L.templeW * .6, 12.5, sk.base);
      ink(ctx, 1.2, res.hairDD, .7);
      ctx.beginPath();
      ctx.ellipse(tx, L.skullTop + 15, L.templeW * .6, 12.5, 0, 0, TAU);
      ctx.stroke();
      fEll(ctx, tx + res.lx * 4, L.skullTop + 12, 6, 3.4, sk.lit, .7);
      return;
    }

    if (style === "curly") {
      pathFn = function () { curlyPath(ctx, res, L, 0); };
      pathFn();
      ctx.fillStyle = css(res.hairD);
      ctx.fill();
      ink(ctx, 2.2, res.hairDD);
      ctx.stroke();
      ctx.save();
      pathFn();
      ctx.clip();
      var curls = grainLine(v.dt, 6);
      ink(ctx, 1.4 * grain(v.dt), res.hairDD, .8);
      var ci;
      for (ci = 0; ci < curls; ci += 1) {
        var ca = rng() * Math.PI;
        var cr2 = L.templeW * (.4 + rng() * .5);
        var ccx = tx + Math.cos(Math.PI - ca) * cr2 * .9;
        var ccy = (L.browY - 2) - Math.sin(ca) * (L.browY - L.skullTop) * (.4 + rng() * .5);
        ctx.beginPath();
        ctx.arc(ccx, ccy, 2.2 + rng() * 2, rng() * TAU, rng() * TAU + 3.6);
        ctx.stroke();
      }
      ink(ctx, 3.4, res.hairL, .85);
      ctx.beginPath();
      ctx.arc(tx + res.lx * 4, L.browY, L.templeW * .72, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (style === "bun") {
      ctx.beginPath();
      ctx.ellipse(tx, L.skullTop - 3, 11.5, 9, 0, 0, TAU);
      ctx.fillStyle = css(res.hairD);
      ctx.fill();
      ink(ctx, 1.8, res.hairDD);
      ctx.stroke();
      ink(ctx, 1.3, res.hairDD, .9);
      ctx.beginPath();
      ctx.ellipse(tx, L.skullTop - 3, 6.8, 5, .4, 0, TAU);
      ctx.stroke();
    }

    var shape = hairCapShape(res, L);
    var fyL = shape.fyL, fyM = shape.fyM, fyR = shape.fyR;
    pathFn = function () { capPath(ctx, res, L, shape.ext, fyL, fyM, fyR); };
    pathFn();
    ctx.fillStyle = css(res.hairD);
    ctx.fill();
    ink(ctx, 2.2, res.hairDD);
    ctx.stroke();

    /* interior: bold flow lines plus one hard sheen arc */
    ctx.save();
    pathFn();
    ctx.clip();
    /* evenly spaced flow lines are drawing, not grain: a fixed number of
       them describes the hair mass at every size (9 is the 256 value) */
    var n = 9;
    var i;
    for (i = 0; i < n; i += 1) {
      var t = (i + .5) / n * 2 - 1;
      var x0 = tx + t * L.templeW * .8;
      ink(ctx, 1.3 + (i % 2) * .5, i % 3 === 0 ? res.hairL : res.hairDD, .75);
      ctx.beginPath();
      ctx.moveTo(x0, L.skullTop + 2);
      ctx.quadraticCurveTo(x0 + t * 6, (L.skullTop + fyM) / 2 + 3, x0 + t * 11, fyM + 6);
      ctx.stroke();
    }
    ink(ctx, 3.6, res.hairL, .9);
    ctx.beginPath();
    ctx.arc(tx + res.lx * 4, L.browY + 2, L.templeW * .72, Math.PI * 1.22, Math.PI * 1.78);
    ctx.stroke();
    ink(ctx, 1.5, lerpC(res.hairL, [255, 244, 220], .5), .9);
    ctx.beginPath();
    ctx.arc(tx + res.lx * 5, L.browY + 2, L.templeW * .68, Math.PI * 1.32, Math.PI * 1.68);
    ctx.stroke();
    ctx.restore();

    if (style === "receding") {
      ctx.fillStyle = css(sk.base);
      ctx.beginPath();
      ctx.ellipse(cx - L.templeW * .6, L.hairline + 1, 8, 5.5, .25, 0, TAU);
      ctx.ellipse(cx + L.templeW * .6, L.hairline + 1, 8, 5.5, -.25, 0, TAU);
      ctx.fill();
    }
    if (style === "sidePart") {
      ink(ctx, 1.6, res.hairDD);
      ctx.beginPath();
      ctx.moveTo(tx + res.markSide * L.templeW * .3, L.skullTop + 1);
      ctx.lineTo(tx + res.markSide * L.templeW * .38, L.hairline + 2);
      ctx.stroke();
    }
    if (style === "braids" || style === "bun") {
      ink(ctx, 1.4, res.hairDD);
      ctx.beginPath();
      ctx.moveTo(tx, L.skullTop - 1);
      ctx.lineTo(tx, L.hairline + 3);
      ctx.stroke();
    }
    if (style === "crop") {
      ink(ctx, 1.6, res.hairDD, .9);
      var fi;
      for (fi = -2; fi <= 2; fi += 1) {
        ctx.beginPath();
        ctx.moveTo(tx + fi * L.templeW * .18 + 2, fyM - 1);
        ctx.lineTo(tx + fi * L.templeW * .18, fyM + 3);
        ctx.stroke();
      }
    }

    if (style === "longLoose") {
      var sides = [[-1, L.wL], [1, L.wR]], si2, side4, w4;
      for (si2 = 0; si2 < 2; si2 += 1) {
        side4 = sides[si2][0]; w4 = sides[si2][1];
        ctx.beginPath();
        ctx.moveTo(cx + side4 * (L.templeW * w4 - 7), L.browY - 15);
        ctx.bezierCurveTo(cx + side4 * (L.templeW * w4 + 10), L.browY - 6, cx + side4 * (L.headW * w4 + 9), L.eyeY + 4, cx + side4 * (L.headW * w4 + 10), L.eyeY + 16);
        ctx.bezierCurveTo(cx + side4 * (L.headW * w4 + 12), L.mouthY + 2, cx + side4 * (L.jawW * w4 + 15), L.mouthY + 14, cx + side4 * (L.jawW * w4 + 7), L.chinY + 22);
        ctx.quadraticCurveTo(cx + side4 * (L.jawW * w4 + 1), L.chinY + 10, cx + side4 * (L.jawW * w4 + 2), L.mouthY + 4);
        ctx.bezierCurveTo(cx + side4 * (L.headW * w4 - 2), L.eyeY + 12, cx + side4 * (L.headW * w4 - 3), L.eyeY + 2, cx + side4 * (L.templeW * w4 - 7), L.browY - 15);
        ctx.closePath();
        ctx.fillStyle = css(res.hairD);
        ctx.fill();
        ink(ctx, 2, res.hairDD);
        ctx.stroke();
        ink(ctx, 1.4, res.hairL, .7);
        ctx.beginPath();
        ctx.moveTo(cx + side4 * (L.templeW * w4 + 1), L.browY - 6);
        ctx.quadraticCurveTo(cx + side4 * (L.headW * w4 + 5), L.eyeY + 8, cx + side4 * (L.jawW * w4 + 8), L.mouthY + 10);
        ctx.stroke();
      }
    }

    if (style === "braids") pBraidRopes(v);
  }

  /* ---------- headwear ---------- */

  function pCirclet(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx, tx = cx + L.shift(.5);
    var y0 = L.browY - 15, yc = L.browY - 23;
    ctx.beginPath();
    ctx.moveTo(cx - L.templeW * L.wL - 1, y0 - 2.4);
    ctx.quadraticCurveTo(tx, yc - 2.4, cx + L.templeW * L.wR + 1, y0 - 2.4);
    ctx.lineTo(cx + L.templeW * L.wR + 1, y0 + 2.4);
    ctx.quadraticCurveTo(tx, yc + 2.4, cx - L.templeW * L.wL - 1, y0 + 2.4);
    ctx.closePath();
    ctx.fillStyle = css(GOLD);
    ctx.fill();
    ink(ctx, 1.3, GOLD_D);
    ctx.stroke();
    ink(ctx, 1.2, GOLD_L, .9);
    ctx.beginPath();
    ctx.moveTo(cx - L.templeW * L.wL + 2, y0 - 1);
    ctx.quadraticCurveTo(tx, yc - 1.4, cx + L.templeW * L.wR - 2, y0 - 1);
    ctx.stroke();
    gemDot(ctx, tx, yc + 3.6, 2.2, [96, 32, 40]);
  }

  function pCrown(v, imperial) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx, tx = cx + L.shift(.5);
    var yBot = L.hairline - 1, yTop = L.hairline - 11.5;

    if (imperial) {
      ctx.beginPath();
      ctx.moveTo(cx - L.templeW * L.wL * .84, yTop - 2);
      ctx.quadraticCurveTo(tx, yTop - 26, cx + L.templeW * L.wR * .84, yTop - 2);
      ctx.closePath();
      ctx.fillStyle = css([122, 32, 38]);
      ctx.fill();
      ink(ctx, 1.4, [70, 20, 24]);
      ctx.stroke();
    }

    var i, xi;
    if (!imperial) {
      for (i = -2; i <= 2; i += 1) {
        xi = tx + i * L.templeW * .42;
        var peak = yTop - 10 - (i === 0 ? 3.5 : 0);
        ctx.beginPath();
        ctx.moveTo(xi - 4.6, yTop + 2);
        ctx.lineTo(xi, peak);
        ctx.lineTo(xi + 4.6, yTop + 2);
        ctx.closePath();
        ctx.fillStyle = css(i % 2 ? GOLD : GOLD_L);
        ctx.fill();
        ink(ctx, 1.1, GOLD_D);
        ctx.stroke();
        fEll(ctx, xi, peak - 1, 1.5, 1.5, GOLD_L);
        ink(ctx, .8, GOLD_D);
        ctx.beginPath();
        ctx.arc(xi, peak - 1, 1.5, 0, TAU);
        ctx.stroke();
      }
    }

    crownBandPath(ctx, res, L, yBot, yTop);
    ctx.fillStyle = css(GOLD);
    ctx.fill();
    ink(ctx, 1.5, [96, 70, 26]);
    ctx.stroke();
    ctx.save();
    crownBandPath(ctx, res, L, yBot, yTop);
    ctx.clip();
    ctx.fillStyle = css(GOLD_L, .8);
    ctx.fillRect(Math.min(tx, tx + res.lx * L.templeW), yTop - 8, L.templeW, yBot - yTop + 10);
    ctx.restore();
    gemDot(ctx, tx - L.templeW * .5, (yBot + yTop) / 2 - 3, 2.2, [140, 40, 48]);
    gemDot(ctx, tx, (yBot + yTop) / 2 - 5, 2.5, [40, 60, 122]);
    gemDot(ctx, tx + L.templeW * .5, (yBot + yTop) / 2 - 3, 2.2, [140, 40, 48]);

    if (imperial) {
      var apex = yTop - 25;
      ink(ctx, 3.6, GOLD);
      ctx.beginPath();
      ctx.moveTo(cx - L.templeW * L.wL * .8, yTop - 1);
      ctx.quadraticCurveTo(tx - L.templeW * .3, apex - 2, tx, apex);
      ctx.moveTo(cx + L.templeW * L.wR * .8, yTop - 1);
      ctx.quadraticCurveTo(tx + L.templeW * .3, apex - 2, tx, apex);
      ctx.stroke();
      ink(ctx, 1.2, GOLD_D, .8);
      ctx.beginPath();
      ctx.moveTo(cx - L.templeW * L.wL * .8, yTop - 1);
      ctx.quadraticCurveTo(tx - L.templeW * .3, apex - 2, tx, apex);
      ctx.moveTo(cx + L.templeW * L.wR * .8, yTop - 1);
      ctx.quadraticCurveTo(tx + L.templeW * .3, apex - 2, tx, apex);
      ctx.stroke();
      ctx.fillStyle = "rgb(240,236,224)";
      for (i = 1; i < 5; i += 1) {
        var t3 = i / 5;
        ctx.beginPath();
        ctx.arc(mix(cx - L.templeW * L.wL * .8, tx, t3), mix(yTop - 1, apex, Math.sqrt(t3)) - 2.4, 1.1, 0, TAU);
        ctx.arc(mix(cx + L.templeW * L.wR * .8, tx, t3), mix(yTop - 1, apex, Math.sqrt(t3)) - 2.4, 1.1, 0, TAU);
        ctx.fill();
      }
      gemDot(ctx, tx, apex - 2, 2.7, GOLD);
      ink(ctx, 1.4, GOLD_L);
      ctx.beginPath();
      ctx.moveTo(tx, apex - 5);
      ctx.lineTo(tx, apex - 10);
      ctx.moveTo(tx - 2.2, apex - 7.6);
      ctx.lineTo(tx + 2.2, apex - 7.6);
      ctx.stroke();
    }
  }

  function pHelm(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx, tx = cx + L.shift(.5);
    var rimY = L.browY - 1;
    ctx.beginPath();
    ctx.moveTo(cx - L.templeW * L.wL - 3, rimY);
    ctx.bezierCurveTo(cx - L.templeW * L.wL - 4, L.skullTop + 2, tx - L.templeW * .5, L.skullTop - 9, tx, L.skullTop - 9);
    ctx.bezierCurveTo(tx + L.templeW * .5, L.skullTop - 9, cx + L.templeW * L.wR + 4, L.skullTop + 2, cx + L.templeW * L.wR + 3, rimY);
    ctx.closePath();
    ctx.fillStyle = "rgb(140,146,154)";
    ctx.fill();
    ink(ctx, 2, [48, 52, 60]);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    fEll(ctx, tx + res.lx * L.templeW * .38, L.skullTop + 5, 9, 13, [196, 202, 210], 1, res.lx * .3);
    ctx.restore();
    ink(ctx, 4.6, [96, 102, 110]);
    ctx.beginPath();
    ctx.moveTo(cx - L.templeW * L.wL - 2, rimY - 1);
    ctx.quadraticCurveTo(tx, rimY - 6, cx + L.templeW * L.wR + 2, rimY - 1);
    ctx.stroke();
    var i;
    for (i = -2; i <= 2; i += 1) {
      fEll(ctx, tx + i * L.templeW * .4, rimY - 3, 1.1, 1.1, [200, 206, 212]);
    }
    ctx.fillStyle = "rgb(118,124,132)";
    ctx.fillRect(L.nx - 2.8, rimY - 2, 5.6, (L.noseBase - 5) - (rimY - 2));
    ink(ctx, 1.2, [44, 48, 54]);
    ctx.strokeRect(L.nx - 2.8, rimY - 2, 5.6, (L.noseBase - 5) - (rimY - 2));
  }

  function pCoif(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx, tx = cx + L.shift(.5);
    var linen = res.linen;
    capPath(ctx, res, L, 5, L.browY - 4, L.browY - 6, L.browY - 4);
    ctx.fillStyle = css(linen);
    ctx.fill();
    ink(ctx, 1.8, shade(linen, -.34, .04));
    ctx.stroke();
    var sides = [[-1, L.wL], [1, L.wR]], si, side, w;
    for (si = 0; si < 2; si += 1) {
      side = sides[si][0]; w = sides[si][1];
      ctx.beginPath();
      ctx.moveTo(cx + side * (L.templeW * w + 4), L.browY - 6);
      ctx.bezierCurveTo(cx + side * (L.headW * w + 6), L.eyeY, cx + side * (L.jawW * w + 6), L.mouthY, cx + side * (L.jawW * w + 1), L.mouthY + 8);
      ctx.quadraticCurveTo(cx + side * (L.jawW * w - 3), L.eyeY + 10, cx + side * (L.templeW * w - 3), L.browY - 6);
      ctx.closePath();
      ctx.fillStyle = css(shade(linen, -.06, 0));
      ctx.fill();
      ink(ctx, 1.4, shade(linen, -.3, .04), .9);
      ctx.stroke();
    }
    ink(ctx, 3.6, shade(linen, -.08, 0));
    ctx.beginPath();
    ctx.moveTo(cx - L.jawW * .86, L.mouthY + 5);
    ctx.quadraticCurveTo(cx + L.shift(.8), L.chinY + 3.4, cx + L.jawW * .86, L.mouthY + 5);
    ctx.stroke();
    ink(ctx, 1.2, shade(linen, -.26, .02), .8);
    var f;
    for (f = 0; f < 3; f += 1) {
      ctx.beginPath();
      ctx.moveTo(tx - 14 + f * 12, L.skullTop - 2 + f);
      ctx.quadraticCurveTo(tx - 10 + f * 12, L.browY - 16, tx - 16 + f * 14, L.browY - 6);
      ctx.stroke();
    }
  }

  function pHood(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx, tx = cx + L.shift(.5);
    var cl = res.cloth;
    ctx.beginPath();
    ctx.moveTo(cx - L.shoulderW * .54, L.neckBase + 26);
    ctx.bezierCurveTo(cx - L.headW - 24, L.neckBase - 26, cx - L.headW - 15, L.eyeY - 14, tx - L.templeW * .6, L.skullTop - 12);
    ctx.quadraticCurveTo(tx, L.skullTop - 17, tx + L.templeW * .6, L.skullTop - 12);
    ctx.bezierCurveTo(cx + L.headW + 15, L.eyeY - 14, cx + L.headW + 24, L.neckBase - 26, cx + L.shoulderW * .54, L.neckBase + 26);
    ctx.quadraticCurveTo(cx, L.neckBase + 38, cx - L.shoulderW * .54, L.neckBase + 26);
    ctx.closePath();
    ctx.fillStyle = css(cl.dark);
    ctx.fill();
    ink(ctx, 2.2, shade(cl.deep, -.1, 0));
    ctx.stroke();
    ink(ctx, 5.5, shade(cl.deep, -.04, 0));
    ctx.beginPath();
    ctx.moveTo(cx - L.templeW * L.wL - 5, L.eyeY + 14);
    ctx.bezierCurveTo(cx - L.templeW * L.wL - 7, L.browY - 8, tx - L.templeW * .5, L.skullTop - 4, tx, L.skullTop - 4);
    ctx.bezierCurveTo(tx + L.templeW * .5, L.skullTop - 4, cx + L.templeW * L.wR + 7, L.browY - 8, cx + L.templeW * L.wR + 5, L.eyeY + 14);
    ctx.stroke();
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();
    clothShadow(ctx, L, L.skullTop - 3, (L.browY - L.skullTop) + 5, .4);
    ctx.restore();
    ink(ctx, 1.6, shade(cl.dark, .12, 0), .8);
    var f;
    for (f = -1; f <= 1; f += 2) {
      ctx.beginPath();
      ctx.moveTo(tx + f * L.templeW * .45, L.skullTop - 9);
      ctx.quadraticCurveTo(cx + f * (L.headW + 9), L.eyeY + 10, cx + f * (L.headW + 13), L.neckBase + 4);
      ctx.stroke();
    }
  }

  function pVeil(v, wimple) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx, tx = cx + L.shift(.5);
    var VEIL_DYES = [[150, 158, 176], [172, 158, 138], [166, 138, 132], [146, 152, 128]];
    var col = res.tier >= 3 ? VEIL_DYES[byteOf(res.hash[0], 20) % VEIL_DYES.length] : res.linen;
    var colD = shade(col, -.12, .02);
    var colDD = shade(col, -.24, .03);

    if (wimple) {
      ctx.beginPath();
      ctx.moveTo(cx - L.jawW * .95, L.mouthY + 3);
      ctx.quadraticCurveTo(cx + L.shift(.8), L.chinY + 7, cx + L.jawW * .95, L.mouthY + 3);
      ctx.lineTo(cx + L.neckW + 11, L.neckBase - 2);
      ctx.quadraticCurveTo(cx, L.neckBase + 10, cx - L.neckW - 11, L.neckBase - 2);
      ctx.closePath();
      ctx.fillStyle = css(shade(res.linen, -.03, 0));
      ctx.fill();
      ink(ctx, 1.4, shade(res.linen, -.3, .03), .9);
      ctx.stroke();
    }

    var hemY = L.shoulderY + 12;
    var sides = [[-1, L.wL], [1, L.wR]], si, side, w;
    for (si = 0; si < 2; si += 1) {
      side = sides[si][0]; w = sides[si][1];
      ctx.beginPath();
      ctx.moveTo(cx + side * L.templeW * w, L.browY - 14);
      ctx.bezierCurveTo(cx + side * (L.headW * w + 14), L.eyeY + 2,
        cx + side * (L.headW * w + 18), L.mouthY,
        cx + side * (L.neckW + 32), L.neckBase + 4);
      ctx.quadraticCurveTo(cx + side * (L.shoulderW * .58), L.shoulderY - 4,
        cx + side * (L.shoulderW * .56), hemY);
      ctx.quadraticCurveTo(cx + side * (L.shoulderW * .38), hemY + 8,
        cx + side * (L.neckW + 15), hemY + 3);
      ctx.quadraticCurveTo(cx + side * (L.neckW + 6), hemY, cx + side * (L.neckW + 4), hemY - 5);
      ctx.bezierCurveTo(cx + side * (L.neckW + 2), L.neckBase - 4,
        cx + side * (L.jawW * w + 9), L.mouthY + 9,
        cx + side * (L.templeW * w - 9), L.browY - 7);
      ctx.closePath();
      ctx.fillStyle = css(side === res.sx ? colD : col);
      ctx.fill();
      ink(ctx, 1.5, colDD, .9);
      ctx.stroke();
      ink(ctx, 1.4, colDD, .8);
      ctx.beginPath();
      ctx.moveTo(cx + side * (L.headW * w + 2), L.eyeY + 10);
      ctx.quadraticCurveTo(cx + side * (L.neckW + 20), L.neckBase - 4,
        cx + side * (L.neckW + 17), hemY - 6);
      ctx.stroke();
    }

    /* crown cloth: a generous rounded dome, standing off the skull */
    ctx.beginPath();
    ctx.moveTo(cx - L.headW * L.wL - 6, L.eyeY + 4);
    ctx.bezierCurveTo(cx - L.headW * L.wL - 10, L.browY - 12,
      tx - L.templeW * 1.06, L.skullTop + 10, tx - L.templeW * .66, L.skullTop - 3);
    ctx.quadraticCurveTo(tx, L.skullTop - 9, tx + L.templeW * .66, L.skullTop - 3);
    ctx.bezierCurveTo(tx + L.templeW * 1.06, L.skullTop + 10,
      cx + L.headW * L.wR + 10, L.browY - 12, cx + L.headW * L.wR + 6, L.eyeY + 4);
    ctx.lineTo(cx + L.templeW * L.wR + 1, L.eyeY + 2);
    ctx.quadraticCurveTo(cx + L.templeW * L.wR - 2, L.browY - 4, cx + L.templeW * .5, L.browY - 9);
    ctx.quadraticCurveTo(tx, L.browY - 12, cx - L.templeW * .5, L.browY - 9);
    ctx.quadraticCurveTo(cx - L.templeW * L.wL + 2, L.browY - 4, cx - L.templeW * L.wL - 1, L.eyeY + 2);
    ctx.closePath();
    ctx.fillStyle = css(col);
    ctx.fill();
    ink(ctx, 1.7, colDD);
    ctx.stroke();
    ink(ctx, 1.8, shade(col, .14, -.02), .95);
    ctx.beginPath();
    ctx.moveTo(cx - L.templeW * L.wL * .92, L.browY - 5);
    ctx.quadraticCurveTo(tx, L.browY - 12, cx + L.templeW * L.wR * .92, L.browY - 5);
    ctx.stroke();
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();
    clothShadow(ctx, L, L.browY - 9, 8, .25);
    ctx.restore();
  }

  function pTurban(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx, tx = cx + L.shift(.5);
    var DYES = [[74, 84, 112], [124, 66, 56], [108, 100, 64], [92, 78, 96]];
    var light = byteOf(res.hash[0], 5) > 118;
    var col = light ? [222, 214, 192] : DYES[byteOf(res.hash[0], 5) % DYES.length];
    var bandY3 = L.browY - 13 - 3 * 6.5;
    ctx.beginPath();
    ctx.ellipse(tx, (L.skullTop - 4 + bandY3) / 2, L.templeW * .86,
      (bandY3 - L.skullTop) / 2 + 7, 0, 0, TAU);
    ctx.fillStyle = css(shade(col, .03, 0));
    ctx.fill();
    ink(ctx, 1.5, shade(col, -.24, .04));
    ctx.stroke();
    var k;
    for (k = 3; k >= 0; k -= 1) {
      var cyk = L.browY - 13 - k * 6.5;
      var rxk = L.templeW * 1.1 - k * 4 + (k % 2) * 1.6;
      var ryk = 9.5 - k * .8;
      ctx.save();
      ctx.translate(tx, cyk);
      ctx.rotate((k % 2 ? -.09 : .09) * (1 + L.yaw));
      ctx.beginPath();
      ctx.ellipse(0, 0, rxk, ryk, 0, 0, TAU);
      ctx.fillStyle = css(shade(col, k % 2 ? .07 : -.1, .02));
      ctx.fill();
      ink(ctx, 1.4, shade(col, -.26, .04));
      ctx.stroke();
      ctx.restore();
    }
    ink(ctx, 2.2, shade(col, -.2, .03), .9);
    ctx.beginPath();
    ctx.moveTo(tx - L.templeW * .9, L.browY - 10);
    ctx.quadraticCurveTo(tx, L.browY - 20, tx + L.templeW * .92, L.browY - 8);
    ctx.stroke();
    if (res.tier >= 5) {
      ink(ctx, 1.8, [214, 208, 192], .9);
      ctx.beginPath();
      ctx.moveTo(tx + 2, L.browY - 26);
      ctx.quadraticCurveTo(tx + 7, L.skullTop - 10, tx + 13, L.skullTop - 15);
      ctx.stroke();
      gemDot(ctx, tx, L.browY - 23, 2.7, [46, 92, 78]);
    }
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();
    clothShadow(ctx, L, L.browY - 9, 8, .3);
    ctx.restore();
  }

  function pCap(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var tx = L.cx + L.shift(.5) + res.lx * 3;
    var FELTS = [[104, 58, 52], [78, 86, 56], [70, 80, 96], [96, 76, 50]];
    var felt = FELTS[byteOf(res.hash[0], 19) % FELTS.length];
    ctx.save();
    ctx.translate(tx, L.skullTop + 5);
    ctx.rotate(res.lx * .06);
    ctx.beginPath();
    ctx.ellipse(0, -2, L.templeW * 1.0, 14.5, 0, Math.PI, 0);
    ctx.quadraticCurveTo(0, 8, -L.templeW * 1.0, -2);
    ctx.fillStyle = css(felt);
    ctx.fill();
    ink(ctx, 1.8, shade(felt, -.2, .03));
    ctx.stroke();
    ink(ctx, 4.4, shade(felt, -.13, .03));
    ctx.beginPath();
    ctx.moveTo(-L.templeW * .98, 0);
    ctx.quadraticCurveTo(0, 6.5, L.templeW * .98, 0);
    ctx.stroke();
    ink(ctx, 1.5, shade(felt, .16, 0), .9);
    ctx.beginPath();
    ctx.arc(-4, -7, 12, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    fEll(ctx, 2, -14, 1.7, 1.7, shade(felt, .22, 0));
    ctx.restore();
  }

  function pHeadwear(v) {
    /* headwearBase, not headwearR: this painter knows the eleven the
       original renderer shipped with, so a type added later arrives here as the
       nearest of those rather than as nothing at all. */
    switch (v.res.headwearBase) {
      case "circlet": pCirclet(v); break;
      case "crown": pCrown(v, false); break;
      case "imperial": pCrown(v, true); break;
      case "helm": pHelm(v); break;
      case "coif": pCoif(v); break;
      case "hood": pHood(v); break;
      case "veil": pVeil(v, false); break;
      case "wimple": pVeil(v, true); break;
      case "turban": pTurban(v); break;
      case "cap": pCap(v); break;
    }
  }

  /* ---------- wounds, scars and sickness marks ---------- */

  function pFaceMarks(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var side = res.markSide;
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();
    if (res.scarred === "yes") {
      var scSide = res.woundBase === "cut" ? -side : side;
      var sx0 = L.cx + scSide * L.headW * .52;
      ink(ctx, 2.2, [232, 206, 190], .85);
      ctx.beginPath();
      ctx.moveTo(sx0 - scSide * 2, L.eyeY - 3);
      ctx.quadraticCurveTo(sx0 + scSide * 2, L.eyeY + 6, sx0 + scSide * 3.4, L.mouthY - 3);
      ctx.stroke();
      ink(ctx, 1, res.skin.line, .6);
      ctx.beginPath();
      ctx.moveTo(sx0 - scSide * 2 + 1, L.eyeY - 2);
      ctx.quadraticCurveTo(sx0 + scSide * 2 + 1, L.eyeY + 7, sx0 + scSide * 3.4 + 1, L.mouthY - 2);
      ctx.stroke();
    }
    if (res.woundBase === "bruise") {
      var bx0 = L.fx + side * L.ex;
      fEll(ctx, bx0, L.eyeY + 1, L.eyeW * 1.7, L.eyeW * 1.7, [140, 128, 62], .35);
      fEll(ctx, bx0 + side * 1, L.eyeY + 1.5, L.eyeW * 1.15, L.eyeW * 1.15, [88, 52, 104], .4);
      fEll(ctx, bx0 + side * 2, L.eyeY + 2.4, L.eyeW * .6, L.eyeW * .6, [56, 30, 66], .4);
    }
    if (res.woundBase === "cut") {
      var cx0 = L.cx + side * L.headW * .46;
      var cy1 = L.eyeY + 12;
      fEll(ctx, cx0, cy1 + 5, 5, 5, [150, 60, 52], .3);
      ink(ctx, 2.2, [122, 36, 32]);
      ctx.beginPath();
      ctx.moveTo(cx0 - side * 1.5, cy1);
      ctx.lineTo(cx0 + side * 3, cy1 + 10);
      ctx.stroke();
      ink(ctx, 1.1, [226, 214, 196], .95);
      var st;
      for (st = 0; st < 3; st += 1) {
        var sy3 = cy1 + 1.5 + st * 3.2;
        var sx3 = cx0 - side * 1.5 + side * (st * 1.5);
        ctx.beginPath();
        ctx.moveTo(sx3 - 1.5, sy3);
        ctx.lineTo(sx3 + 1.5, sy3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function pOverlayMarks(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var side = res.markSide;
    if (res.oneEyed === "yes") {
      var px0 = L.fx + side * L.ex;
      var pw = L.eyeW * 1.5, ph = L.eyeW * 1.2;
      ink(ctx, 2.6, [40, 30, 24], .95);
      ctx.beginPath();
      ctx.moveTo(px0 - side * pw, L.eyeY - 2);
      ctx.lineTo(L.cx - side * (L.templeW + 2), L.browY - 12);
      ctx.moveTo(px0 + side * pw * .9, L.eyeY - 1);
      ctx.lineTo(L.cx + side * (L.headW * (side < 0 ? L.wL : L.wR) + 2), L.eyeY + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px0 - pw, L.eyeY);
      ctx.quadraticCurveTo(px0, L.eyeY - ph * 1.4, px0 + pw, L.eyeY);
      ctx.quadraticCurveTo(px0, L.eyeY + ph * 1.5, px0 - pw, L.eyeY);
      ctx.closePath();
      ctx.fillStyle = "rgb(40,30,26)";
      ctx.fill();
      ink(ctx, 1.2, [20, 14, 10], .8);
      ctx.stroke();
      var d;
      for (d = -1; d <= 1; d += 1) {
        fEll(ctx, px0 + d * pw * .5, L.eyeY - ph * .55, .8, .8, [150, 124, 96], .7);
      }
    }
    if (res.woundBase === "bandage") {
      ctx.save();
      ctx.translate(L.cx + L.shift(.4), L.browY - 8);
      ctx.rotate(side * .05);
      var bw = L.templeW * Math.max(L.wL, L.wR) + 4;
      ctx.beginPath();
      ctx.moveTo(-bw, -2);
      ctx.quadraticCurveTo(0, -6.5, bw, -2);
      ctx.lineTo(bw, 3.4);
      ctx.quadraticCurveTo(0, -1, -bw, 3.4);
      ctx.closePath();
      ctx.fillStyle = css(res.linen);
      ctx.fill();
      ink(ctx, 1, shade(res.linen, -.3, .04), .7);
      ctx.stroke();
      fEll(ctx, side * (bw - 6), .5, 3.2, 2.4, shade(res.linen, -.16, .02), 1, side * .4);
      ink(ctx, 1.6, shade(res.linen, -.1, 0), .9);
      ctx.beginPath();
      ctx.moveTo(side * (bw - 5), 2);
      ctx.lineTo(side * (bw - 1), 8);
      ctx.moveTo(side * (bw - 7), 2.4);
      ctx.lineTo(side * (bw - 6), 9);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- jewelry ---------- */

  function pJewelry(v) {
    var ctx = v.ctx, res = v.res, L = v.L;
    var cx = L.cx;
    if (res.earring && !res.coversHair && res.hairStyleR !== "longLoose") {
      var sides = [[-1, L.earLS, L.wL], [1, L.earRS, L.wR]], si, side, sc, w;
      for (si = 0; si < 2; si += 1) {
        side = sides[si][0]; sc = sides[si][1]; w = sides[si][2];
        if (sc < .3) continue;
        var jx = cx + side * (L.headW * w + L.earW * .55 - 1.5);
        var jy = L.earY + L.earH * .82;
        ink(ctx, 1.4, GOLD);
        ctx.beginPath();
        ctx.arc(jx, jy + 2, 2.1, 0, TAU);
        ctx.stroke();
        fEll(ctx, jx - .7, jy + .9, .7, .7, GOLD_L, .9);
        if (res.jewelTier >= 4) gemDot(ctx, jx, jy + 5.6, 1.6, [96, 32, 40]);
      }
    }
    if (res.neckR !== "none") {
      var py = L.neckBase + 23;
      ink(ctx, 1.4, GOLD, .9);
      ctx.setLineDash([2.4, 2]);
      ctx.beginPath();
      ctx.moveTo(cx - L.neckW - 3, L.neckBase - 7);
      ctx.quadraticCurveTo(cx, py - 3, cx + L.neckW + 3, L.neckBase - 7);
      ctx.stroke();
      ctx.setLineDash([]);
      if (res.neckR === "cross") {
        ctx.beginPath();
        ctx.rect(cx - 1.5, py - 2, 3, 10.5);
        ctx.rect(cx - 4.4, py + .4, 8.8, 2.6);
        ctx.fillStyle = css(GOLD);
        ctx.fill();
        ink(ctx, 1, GOLD_D);
        ctx.stroke();
      } else if (res.neckR === "amulet") {
        gemDot(ctx, cx, py + 2, 4, hsl2rgb(res.bgHue + 180, .45, .34));
      }
    }
  }

  function pVignette(v) {
    var ctx = v.ctx, L = v.L;
    var g = ctx.createRadialGradient(L.cx, 134, 100, L.cx, 140, 220);
    g.addColorStop(0, "rgba(8,6,4,0)");
    g.addColorStop(1, "rgba(8,6,4,.3)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 288);
  }

  /* ---------- the canonical assembly, back to front ---------- */

  function standard(v) {
    paint.background(v);
    paint.backHair(v);
    paint.torso(v);
    paint.neck(v);
    paint.garment(v);
    paint.ears(v);
    paint.head(v);
    paint.shade(v);
    paint.ageDetail(v);
    paint.brows(v);
    paint.eyes(v);
    paint.nose(v);
    paint.mouth(v);
    paint.spots(v);
    paint.faceMarks(v);
    paint.facialHair(v);
    paint.frontHair(v);
    paint.overlayMarks(v);
    paint.headwear(v);
    paint.jewelry(v);
    paint.vignette(v);
  }

  /* ============================================================
     The camera, the light rig, and detail synthesis.
     Three opt-in systems a style composes from paint():
     - camera(v, {zoom, x, y, rot}) reframes the composition. Apply
       inside save/restore around the figure steps.
     - formLight(v, rig) relights the painted figure per pixel: an
       approximate depth field is built from the layout anchors,
       normals derive from it, and the existing pixels are re-shaded
       with a key / fill / rim / specular rig. This is what turns a
       flat drawing into a lit form.
     - detailHair / detailSkin / detailCloth synthesize micro-texture
       (strand clusters, grain, weave) clipped to the shared regions,
       with density as a knob.
     ============================================================ */

  function pCamera(v, opts) {
    opts = opts || {};
    var ctx = v.ctx;
    var zoom = opts.zoom || 1;
    var cx = opts.x === undefined ? 128 : opts.x;
    var cy = opts.y === undefined ? 144 : opts.y;
    ctx.translate(128, 144);
    if (opts.rot) ctx.rotate(opts.rot);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
  }

  /* approximate scene depth at a 256-space point: head ellipsoid with
     brow ridge, sockets, nose, cheekbones and chin, a neck cylinder and
     a shoulder slab. 0 = background. */
  function depthAt(v, x, y) {
    var L = v.L;
    var cx = L.cx + L.ox;
    var hcy = (L.skullTop + L.chinY) / 2;
    var rx = L.headW * 1.04, ry = (L.chinY - L.skullTop) / 2 * 1.06;
    var dx = (x - cx) / rx, dy = (y - hcy) / ry;
    var q = 1 - dx * dx - dy * dy;
    var d = 0;
    if (q > 0) {
      d = Math.sqrt(q) * .72;
      d += Math.exp(-Math.pow((y - L.browY) / 6, 2)) * (1 - Math.abs(dx)) * .09;
      d -= Math.exp(-(Math.pow((Math.abs(x - L.fx) - L.ex) / (L.eyeW * 1.5), 2) +
        Math.pow((y - L.eyeY) / 7, 2))) * .11;
      d += Math.exp(-(Math.pow((x - L.nx) / (L.nw * .9), 2) +
        Math.pow((y - (L.eyeY + L.noseBase) / 2) / ((L.noseBase - L.eyeY) * .64), 2))) * .17;
      d += Math.exp(-(Math.pow((Math.abs(x - cx) - L.headW * .5) / 9, 2) +
        Math.pow((y - L.cheekY - 2) / 9, 2))) * .07;
      d += Math.exp(-(Math.pow((x - L.mx) / (L.chinW * 1.5), 2) +
        Math.pow((y - L.chinY + 4) / 7, 2))) * .06;
    }
    /* the hair or headwear dome: a broad shell around the skull so
       relighting shapes hair and veils too. Generously oversized - the
       figure mask keeps it off the background - so its boundary never
       seams inside a large silhouette */
    var hdx = (x - cx) / (L.headW * 1.6), hdy = (y - (hcy - 6)) / (ry * 1.32);
    var hq = 1 - hdx * hdx - hdy * hdy;
    if (hq > 0) d = Math.max(d, Math.sqrt(hq) * .48);
    var ndx = (x - L.cx) / (L.neckW * 1.15);
    if (y > L.neckTop - 4 && y < L.neckBase + 10 && ndx > -1 && ndx < 1) {
      d = Math.max(d, Math.sqrt(1 - ndx * ndx) * .42);
    }
    if (y > L.shoulderY - 16) {
      var sdx = (x - L.cx) / L.shoulderW;
      if (sdx > -1 && sdx < 1) {
        var top = L.shoulderY - 14 + Math.pow(Math.abs(sdx), 1.7) * 26;
        if (y > top) {
          d = Math.max(d, Math.sqrt(Math.max(0, 1 - sdx * sdx)) * .34 *
            Math.min(1, (y - top) / 12));
        }
      }
    }
    return d;
  }

  function norm3(x, y, z) {
    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    return [x / len, y / len, z / len];
  }

  /* relight the pixels already painted. rig:
     { key: [x,y,z], keyColor: [r,g,b] multipliers, fill: 0..1,
       rim: { dir: [x,y,z], color: [r,g,b] 0..1, amount },
       spec: { power, amount }, strength: 0..1,
       map: { zoom, x, y } when pCamera reframed the figure } */
  function pFormLight(v, rig) {
    rig = rig || {};
    var res = v.res;
    var key = norm3.apply(null, rig.key || [.6 * res.lx, -.45, .72]);
    var keyColor = rig.keyColor || [1.05, 1, .93];
    var fill = rig.fill === undefined ? .6 : rig.fill;
    var rimCfg = rig.rim || {};
    var rimDir = norm3.apply(null, rimCfg.dir || [-.85 * res.lx, -.15, .3]);
    var rimColor = rimCfg.color || [.45, .8, .88];
    var rimAmt = rimCfg.amount === undefined ? .4 : rimCfg.amount;
    var specCfg = rig.spec || {};
    var specPower = specCfg.power || 14;
    var specAmt = specCfg.amount === undefined ? .18 : specCfg.amount;
    var strength = rig.strength === undefined ? .8 : rig.strength;
    var map = rig.map || null;
    var W = v.width, H = v.height;
    var ctx = v.ctx.raw;
    var img = ctx.getImageData(0, 0, W, H);
    var data = img.data;
    /* only the painted figure is relit */
    if (!v._mask) {
      /* Without the mask this would relight the background too: the hair
         dome in depthAt is deliberately oversized and relies on the mask
         to keep it off the ground. Fail here rather than ship a subtly
         wrong picture. */
      throw new Error(
        "formLight needs the figure mask: add mask: true to style '" +
        (v.style && v.style.id) + "'");
    }
    var maskData = v._maskCtx.getImageData(0, 0, W, H).data;
    /* depth grid first, normals from it */
    var depth = new Float32Array(W * H);
    var px, py, x, y, i;
    for (py = 0; py < H; py += 1) {
      for (px = 0; px < W; px += 1) {
        x = (px + .5) * 256 / W;
        y = (py + .5) * 288 / H;
        if (map) {
          x = map.x + (x - 128) / map.zoom;
          y = map.y + (y - 144) / map.zoom;
        }
        depth[py * W + px] = depthAt(v, x, y);
      }
    }
    var zScale = 30 * W / 256;
    for (py = 1; py < H - 1; py += 1) {
      for (px = 1; px < W - 1; px += 1) {
        i = py * W + px;
        var d = depth[i];
        if (d <= .004) continue;
        var mk = maskData ? maskData[i * 4 + 3] / 255 : 1;
        if (mk <= .02) continue;
        var n = norm3(
          -(depth[i + 1] - depth[i - 1]) * .5 * zScale,
          -(depth[i + W] - depth[i - W]) * .5 * zScale,
          1);
        var ndl = Math.max(0, n[0] * key[0] + n[1] * key[1] + n[2] * key[2]);
        var wrap = (ndl + .3) / 1.3;
        var inten = fill + (1 - fill) * wrap;
        var rimFace = Math.max(0, n[0] * rimDir[0] + n[1] * rimDir[1]) * (1 - n[2] * n[2]);
        var spec = Math.pow(Math.max(0, n[0] * key[0] + n[1] * key[1] + n[2] * (key[2] + 1) * .5), specPower) * specAmt;
        var fade = Math.min(1, d / .07) * mk;
        var s = strength * fade;
        var j = i * 4;
        var c;
        for (c = 0; c < 3; c += 1) {
          var lit = inten * keyColor[c];
          var value = data[j + c] * (1 + (lit - 1) * s) +
            (rimAmt * rimFace * rimColor[c] * 235 + spec * 235) * fade;
          data[j + c] = value < 0 ? 0 : value > 255 ? 255 : value;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* The hair region the current style would paint, as a clip path.
     Returns false when nothing shows (bald, covered).

     The cap and the skin put back over it are described here once, and
     both the painter and the detail pass read the description. They used
     to derive it separately and disagree twice: the tonsure cap was
     drawn at extent 3 but clipped at 3.5, and neither the tonsure's
     shaved crown nor the receded temples were subtracted at all, so
     detailHair scattered strands across bare scalp. */

  function hairCapShape(res, L) {
    var style = res.hairStyleR;
    var s = { ext: 3.5, fyL: 0, fyM: 0, fyR: 0 };
    if (style === "tonsure") {
      s.ext = 3;
      s.fyL = L.hairline + 6; s.fyM = L.hairline + 3; s.fyR = L.hairline + 6;
    } else if (style === "sidePart") {
      var ps = res.markSide;
      s.fyL = L.hairline + (ps < 0 ? 1 : 11);
      s.fyR = L.hairline + (ps < 0 ? 11 : 1);
      s.fyM = L.hairline + 5;
    } else if (style === "receding") {
      s.ext = 2;
      s.fyL = s.fyR = L.hairline + 3; s.fyM = L.hairline + 1;
    } else if (style === "braids" || style === "bun") {
      s.fyL = s.fyR = L.hairline + 3; s.fyM = L.hairline + 5;
    } else {
      s.fyL = s.fyR = L.hairline + 5;
      s.fyM = L.hairline + (style === "longLoose" ? 7 : 4);
    }
    return s;
  }

  /* the skin the painter paints back over the cap, appended as its own
     subpaths so an evenodd fill or clip removes it from the hair mass */
  function hairCutouts(ctx, res, L) {
    var style = res.hairStyleR;
    if (style === "tonsure") {
      var tx = L.cx + L.shift(.5);
      var rx = L.templeW * .6;
      ctx.moveTo(tx + rx, L.skullTop + 15);
      ctx.ellipse(tx, L.skullTop + 15, rx, 12.5, 0, 0, TAU);
    } else if (style === "receding") {
      var sides = [[-1, .25], [1, -.25]], i, side, rot, ex, ey;
      for (i = 0; i < 2; i += 1) {
        side = sides[i][0]; rot = sides[i][1];
        ex = L.cx + side * L.templeW * .6;
        ey = L.hairline + 1;
        ctx.moveTo(ex + Math.cos(rot) * 8, ey + Math.sin(rot) * 8);
        ctx.ellipse(ex, ey, 8, 5.5, rot, 0, TAU);
      }
    }
  }

  function hairRegionPath(ctx, res, L) {
    if (res.coversHair || res.hairStyleR === "bald") return false;
    if (res.hairStyleR === "curly") {
      curlyPath(ctx, res, L, 0);
      return true;
    }
    var s = hairCapShape(res, L);
    capPath(ctx, res, L, s.ext, s.fyL, s.fyM, s.fyR);
    hairCutouts(ctx, res, L);
    return true;
  }

  /* strand-cluster synthesis over the hair mass. opts: density, length,
     curl, alpha, width - all multipliers around 1. */
  function pDetailHair(v, opts) {
    opts = opts || {};
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    ctx.save();
    if (!hairRegionPath(ctx, res, L)) { ctx.restore(); return; }
    ctx.clip("evenodd");        /* the cut-outs are holes, not islands */
    ctx.lineCap = "round";
    var tx = L.cx + L.shift(.5);
    var gs = grain(v.dt);
    var n = grainLine(v.dt, 150 * (opts.density === undefined ? 1 : opts.density));
    var i;
    for (i = 0; i < n; i += 1) {
      var hx = tx + (rng() * 2 - 1) * L.templeW * 1.05;
      var hy = L.skullTop - 3 + rng() * (L.hairline - L.skullTop + 12);
      var away = (hx - tx) / Math.max(1, L.templeW);
      var vx = away * .55 + (rng() - .5) * .3;
      var vy = .6 + rng() * .5;
      var inv = 1 / Math.sqrt(vx * vx + vy * vy);
      vx *= inv; vy *= inv;
      var len = (5 + rng() * 12) * (opts.length === undefined ? 1 : opts.length);
      var curl = (rng() - .5) * 6 * (opts.curl === undefined ? 1 : opts.curl);
      var light = rng() < .4;
      ctx.strokeStyle = css(light ? res.hairL : res.hairDD,
        (.14 + rng() * .2) * (opts.alpha === undefined ? 1 : opts.alpha));
      ctx.lineWidth = Math.max(.4, (.5 + rng() * .8) * (opts.width === undefined ? 1 : opts.width)) * gs;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(hx + vx * len * .5 - vy * curl, hy + vy * len * .5 + vx * curl,
        hx + vx * len, hy + vy * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* skin grain: stipple and micro-arcs over the face. opts: density, alpha. */
  function pDetailSkin(v, opts) {
    opts = opts || {};
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    var sk = res.skin;
    ctx.save();
    headPath(ctx, res, L);
    ctx.clip();
    var amp = opts.alpha === undefined ? 1 : opts.alpha;
    var dens = opts.density === undefined ? 1 : opts.density;
    var gs = grain(v.dt);
    /* stipple is area, the micro-creases under it are line: they scale by
       different powers of dt to hold the same coverage */
    var n = grainArea(v.dt, 170 * dens);
    var arcs = grainLine(v.dt, 19 * dens);
    var i;
    for (i = 0; i < n; i += 1) {
      var x = L.cx + L.ox + (rng() * 2 - 1) * L.headW * .9;
      var y = L.skullTop + 6 + rng() * (L.chinY - L.skullTop - 8);
      var light = rng() < .5;
      ctx.fillStyle = css(light ? sk.lit : sk.deep, (.04 + rng() * .05) * amp);
      ctx.fillRect(x, y, (.7 + rng() * 1.1) * gs, (.7 + rng() * 1.1) * gs);
    }
    ctx.lineCap = "round";
    for (i = 0; i < arcs; i += 1) {
      var ax = L.cx + L.ox + (rng() * 2 - 1) * L.headW * .8;
      var ay = L.skullTop + 8 + rng() * (L.chinY - L.skullTop - 12);
      ctx.strokeStyle = css(rng() < .5 ? sk.shadow : sk.lit, (.05 + rng() * .05) * amp);
      ctx.lineWidth = .5 * gs;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(ax + 2 + rng() * 3, ay + (rng() - .5) * 2, ax + 4 + rng() * 5, ay + (rng() - .5) * 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* fabric nap and weave over the torso. opts: density, alpha. */
  function pDetailCloth(v, opts) {
    opts = opts || {};
    var ctx = v.ctx, res = v.res, L = v.L, rng = v.rng;
    var cl = res.cloth;
    ctx.save();
    torsoPath(ctx, L);
    ctx.clip();
    ctx.lineCap = "round";
    var amp = opts.alpha === undefined ? 1 : opts.alpha;
    var gs = grain(v.dt);
    var n = grainLine(v.dt, 130 * (opts.density === undefined ? 1 : opts.density));
    var i;
    for (i = 0; i < n; i += 1) {
      var x = L.cx + (rng() * 2 - 1) * L.shoulderW;
      var y = L.shoulderY - 14 + rng() * (292 - L.shoulderY + 14);
      var light = rng() < .45;
      ctx.strokeStyle = css(light ? cl.light : cl.deep, (.06 + rng() * .08) * amp);
      ctx.lineWidth = Math.max(.4, .5 + rng() * .7) * gs;
      var sag = Math.pow(Math.abs(x - L.cx) / L.shoulderW, 1.5) * 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 2 + rng() * 4, y + sag * .4 + (rng() - .5), x + 5 + rng() * 6, y + sag + (rng() - .5) * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ============================================================
     The mark layer.
     Every fill and stroke the painters issue is intercepted by a
     recording context wrapper and handed to the style's brush
     table, tagged with the painter step it came from. A style
     that registers brushes: { fill, stroke } re-decides how EVERY
     mark is made - hatch it, stitch it, repaint it, drop it -
     without the painters knowing. The default brushes reproduce
     the direct marks exactly. style-woodcut.js is the worked
     example.
     ============================================================ */

  var MARK = { role: "style" };

  function mergeInto(target, source) {
    Object.keys(source || {}).forEach(function (key) { target[key] = source[key]; });
    return target;
  }

  /* Every pipeline step runs under its own mark role and its own random
     stream. The stream matters as much as the role: while all the steps
     shared one rng, changing how many numbers any painter consumed
     silently reshuffled the texture of every painter after it, so tuning
     the beard moved the freckles. A step now draws from a stream scoped
     to its own name, which makes each one independently tunable.
     A view built without styleRng (a style's own offscreen sub-view, as
     in style-pixel) keeps whatever stream it was handed. */
  function roled(name, fn) {
    return function (v, a, b) {
      var prevRole = MARK.role;
      var prevRng = v.rng;
      MARK.role = name;
      if (v.styleRng) v.rng = v.styleRng("step:" + name);
      try { fn(v, a, b); } finally {
        MARK.role = prevRole;
        v.rng = prevRng;
      }
    };
  }

  var DEFAULT_BRUSHES = {
    /* m: { ctx (raw), v, role, path (Path2D), bbox, color ([r,g,b] or
       null for gradients), alpha, raw (the exact fill/stroke style),
       rule, width } */
    fill: function (m) {
      m.ctx.fillStyle = m.raw;
      if (m.rule === "evenodd") m.ctx.fill(m.path, "evenodd");
      else m.ctx.fill(m.path);
    },
    stroke: function (m) {
      m.ctx.strokeStyle = m.raw;
      m.ctx.stroke(m.path);
    }
  };

  function parseColor(s) {
    var m = /^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/.exec(s);
    if (!m) return null;
    return { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
  }

  /* wrap a raw 2d context so marks route through v.brush. Covers the
     drawing surface the painters and styles actually use. */
  function wrapCtx(ctx, v) {
    var w = { raw: ctx };
    var path, bbox;
    var fillP = null, fillRaw = "#000";
    var strokeP = null, strokeRaw = "#000";
    function newPath() {
      path = new Path2D();
      bbox = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    }
    function pt(x, y) {
      if (x < bbox.x0) bbox.x0 = x;
      if (y < bbox.y0) bbox.y0 = y;
      if (x > bbox.x1) bbox.x1 = x;
      if (y > bbox.y1) bbox.y1 = y;
    }
    newPath();
    /* the shape lever: a style's shape(x, y, v) remaps every path
       coordinate - wobble, angularize, swell - before it is recorded */
    function tx(x, y) { return v.shape ? v.shape(x, y, v) : null; }
    /* the figure mask: every pipeline mark is mirrored into an offscreen
       silhouette so formLight knows figure from background */
    var mctx = null;
    function maskCtx() {
      if (!mctx) {
        var mask = document.createElement("canvas");
        mask.width = v.width;
        mask.height = v.height;
        /* the hint only counts on the call that CREATES the context;
           passing it to a later getContext is silently ignored, and this
           canvas exists to be read back by formLight */
        mctx = mask.getContext("2d", { willReadFrequently: true });
        mctx.fillStyle = "#fff";
        mctx.strokeStyle = "#fff";
        mctx.lineCap = "round";
        mctx.lineJoin = "round";
        v._mask = mask;
        v._maskCtx = mctx;   /* hand formLight the context, not the canvas */
      }
      mctx.setTransform(ctx.getTransform());
      return mctx;
    }
    /* The figure mask exists for one reader, formLight, which needs to
       know figure from background before it relights pixels. Mirroring
       every mark into it is not free: it doubles the fill and stroke
       work of the whole pipeline, and it used to run for every style
       that pushed a mark role whether or not anything ever read it,
       which was 4 styles paying for the 2 that relight. Styles that call
       formLight declare mask: true; formLight says so plainly if one
       forgets, rather than quietly relighting the background. */
    function maskable() {
      return v.mask &&
        MARK.role !== "style" && MARK.role !== "background" && MARK.role !== "vignette";
    }
    function fillMark(p, b, rule) {
      v.brush.fill({
        ctx: ctx, v: v, role: MARK.role, path: p, bbox: b,
        color: fillP && fillP.c, alpha: fillP ? fillP.a : 1,
        raw: fillRaw, rule: rule || "nonzero", width: 0
      });
      if (maskable()) {
        var mc = maskCtx();
        if (rule === "evenodd") mc.fill(p, "evenodd");
        else mc.fill(p);
      }
    }
    function strokeMark(p, b) {
      v.brush.stroke({
        ctx: ctx, v: v, role: MARK.role, path: p, bbox: b,
        color: strokeP && strokeP.c, alpha: strokeP ? strokeP.a : 1,
        raw: strokeRaw, rule: "nonzero", width: ctx.lineWidth
      });
      if (maskable()) {
        var mc = maskCtx();
        mc.lineWidth = ctx.lineWidth;
        mc.stroke(p);
      }
    }
    Object.defineProperty(w, "fillStyle", {
      get: function () { return ctx.fillStyle; },
      set: function (s) {
        fillRaw = s;
        fillP = typeof s === "string" ? parseColor(s) : null;
        ctx.fillStyle = s;
      }
    });
    Object.defineProperty(w, "strokeStyle", {
      get: function () { return ctx.strokeStyle; },
      set: function (s) {
        strokeRaw = s;
        strokeP = typeof s === "string" ? parseColor(s) : null;
        ctx.strokeStyle = s;
      }
    });
    ["lineWidth", "lineCap", "lineJoin", "imageSmoothingEnabled",
      "globalCompositeOperation", "globalAlpha"].forEach(function (prop) {
      Object.defineProperty(w, prop, {
        get: function () { return ctx[prop]; },
        set: function (value) { ctx[prop] = value; }
      });
    });
    w.beginPath = function () { newPath(); };
    w.moveTo = function (x, y) {
      var q = tx(x, y);
      if (q) { x = q[0]; y = q[1]; }
      path.moveTo(x, y); pt(x, y);
    };
    w.lineTo = function (x, y) {
      var q = tx(x, y);
      if (q) { x = q[0]; y = q[1]; }
      path.lineTo(x, y); pt(x, y);
    };
    w.quadraticCurveTo = function (cx, cy, x, y) {
      var q1 = tx(cx, cy), q2 = tx(x, y);
      if (q1) { cx = q1[0]; cy = q1[1]; x = q2[0]; y = q2[1]; }
      path.quadraticCurveTo(cx, cy, x, y);
      pt(cx, cy); pt(x, y);
    };
    w.bezierCurveTo = function (c1x, c1y, c2x, c2y, x, y) {
      var q1 = tx(c1x, c1y), q2 = tx(c2x, c2y), q3 = tx(x, y);
      if (q1) { c1x = q1[0]; c1y = q1[1]; c2x = q2[0]; c2y = q2[1]; x = q3[0]; y = q3[1]; }
      path.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
      pt(c1x, c1y); pt(c2x, c2y); pt(x, y);
    };
    w.arc = function (x, y, r, a0, a1, ccw) {
      var q = tx(x, y);
      if (q) { x = q[0]; y = q[1]; }
      path.arc(x, y, r, a0, a1, ccw);
      pt(x - r, y - r); pt(x + r, y + r);
    };
    w.arcTo = function (x1, y1, x2, y2, r) {
      var q1 = tx(x1, y1), q2 = tx(x2, y2);
      if (q1) { x1 = q1[0]; y1 = q1[1]; x2 = q2[0]; y2 = q2[1]; }
      path.arcTo(x1, y1, x2, y2, r);
      pt(x1, y1); pt(x2, y2);
    };
    w.ellipse = function (x, y, rx, ry, rot, a0, a1, ccw) {
      var q = tx(x, y);
      if (q) { x = q[0]; y = q[1]; }
      path.ellipse(x, y, rx, ry, rot, a0, a1, ccw);
      var m = Math.max(rx, ry);
      pt(x - m, y - m); pt(x + m, y + m);
    };
    w.rect = function (x, y, rw, rh) {
      if (v.shape) {
        /* under a shape transform a rectangle is no longer a rectangle,
           so emit it as four remapped corners and let it wobble like any
           other path. pJewelry's cross is drawn with rect and used to
           stay rigid while everything around it moved. */
        w.moveTo(x, y);
        w.lineTo(x + rw, y);
        w.lineTo(x + rw, y + rh);
        w.lineTo(x, y + rh);
        path.closePath();
        return;
      }
      path.rect(x, y, rw, rh);
      pt(x, y); pt(x + rw, y + rh);
    };
    w.closePath = function () { path.closePath(); };
    w.fill = function (rule) { fillMark(path, bbox, rule); };
    w.stroke = function () { strokeMark(path, bbox); };
    w.clip = function (a, b) {
      if (a && typeof a === "object") {
        /* explicit Path2D clip */
        if (b) ctx.clip(a, b);
        else ctx.clip(a);
      } else if (a) {
        ctx.clip(path, a);
      } else {
        ctx.clip(path);
      }
    };
    w.fillRect = function (x, y, rw, rh) {
      var p = new Path2D();
      p.rect(x, y, rw, rh);
      fillMark(p, { x0: x, y0: y, x1: x + rw, y1: y + rh });
    };
    w.strokeRect = function (x, y, rw, rh) {
      var p = new Path2D();
      p.rect(x, y, rw, rh);
      strokeMark(p, { x0: x, y0: y, x1: x + rw, y1: y + rh });
    };
    /* save/restore have to stack the wrapper's own paint state too, not
       just the real context's. fillRaw and strokeRaw are what the brush
       table is handed, and the default brush assigns them back onto the
       context; if a restore rolled the context back while the wrapper
       kept the inner value, the next fill would be painted in the colour
       the save was supposed to have discarded. */
    var stateStack = [];
    w.save = function () {
      stateStack.push(fillRaw, fillP, strokeRaw, strokeP);
      ctx.save();
    };
    w.restore = function () {
      ctx.restore();
      if (stateStack.length) {
        strokeP = stateStack.pop();
        strokeRaw = stateStack.pop();
        fillP = stateStack.pop();
        fillRaw = stateStack.pop();
      }
    };
    ["translate", "rotate", "scale", "setLineDash",
      "drawImage", "createLinearGradient", "createRadialGradient"
    ].forEach(function (method) {
      w[method] = function () { return ctx[method].apply(ctx, arguments); };
    });
    return w;
  }

  var paint = {
    /* brush helpers */
    ink: ink, fEll: fEll, softEllipse: softEllipse,
    clothShadow: clothShadow, gemDot: gemDot,
    /* paths */
    headPath: headPath, torsoPath: torsoPath, neckPath: neckPath,
    collarArc: collarArc, capPath: capPath, curlyPath: curlyPath,
    beardPath: beardPath, crownBandPath: crownBandPath,
    /* steps - each sets the mark role handed to the style's brushes */
    background: roled("background", pBackground),
    backHair: roled("backHair", pBackHair),
    torso: roled("torso", pTorso),
    neck: roled("neck", pNeck),
    garment: roled("garment", pGarment),
    ears: roled("ears", pEars),
    head: roled("head", pHead),
    shade: roled("shade", pShade),
    ageDetail: roled("ageDetail", pAgeDetail),
    brows: roled("brows", pBrows),
    eyes: roled("eyes", pEyes),
    nose: roled("nose", pNose),
    mouth: roled("mouth", pMouth),
    spots: roled("spots", pSpots),
    faceMarks: roled("faceMarks", pFaceMarks),
    facialHair: roled("facialHair", pFacialHair),
    frontHair: roled("frontHair", pFrontHair),
    overlayMarks: roled("overlayMarks", pOverlayMarks),
    headwear: roled("headwear", pHeadwear),
    jewelry: roled("jewelry", pJewelry),
    vignette: roled("vignette", pVignette),
    standard: standard,
    /* opt-in systems: composition, light, micro-texture */
    camera: pCamera,
    depthAt: depthAt,
    formLight: pFormLight,
    hairRegionPath: hairRegionPath,
    detailHair: roled("detailHair", pDetailHair),
    detailSkin: roled("detailSkin", pDetailSkin),
    detailCloth: roled("detailCloth", pDetailCloth)
  };

  /* ============================================================
     Style registry and renderer
     ============================================================ */

  var registry = [];
  var modelRegistry = {};
  var modeRegistry = {};
  var materialRegistry = {};
  var featureSetRegistry = {};
  var lightRegistry = {};
  var costumeRegistry = {};
  var poseRegistry = {};
  var wardrobeRegistry = {};
  var frameRegistry = {};

  function registerNamed(kind, bag, id, value) {
    if (!id || value === undefined || value === null) {
      throw new Error("register" + kind + " needs an id and value");
    }
    if (bag[id] !== undefined) {
      throw new Error(kind + " id already registered: " + id);
    }
    bag[id] = value;
    return value;
  }

  function getNamed(kind, bag, id) {
    var value = bag[id];
    if (value === undefined) throw new Error("Unknown " + kind.toLowerCase() + ": " + id);
    return value;
  }

  function registerModel(id, value) {
    return registerNamed("Model", modelRegistry, id, value);
  }

  function getModel(id) {
    return getNamed("Model", modelRegistry, id);
  }

  function registerMode(id, value) {
    if (typeof value !== "function") throw new Error("Mode must be a function: " + id);
    return registerNamed("Mode", modeRegistry, id, value);
  }

  function getMode(id) {
    return getNamed("Mode", modeRegistry, id);
  }

  function registerMaterial(id, value) {
    return registerNamed("Material", materialRegistry, id, value);
  }

  function getMaterial(id) {
    return getNamed("Material", materialRegistry, id);
  }

  function registerFeatureSet(id, value) {
    return registerNamed("Feature set", featureSetRegistry, id, value);
  }

  function getFeatureSet(id) {
    return getNamed("Feature set", featureSetRegistry, id);
  }

  function registerLight(id, value) {
    return registerNamed("Light", lightRegistry, id, value);
  }

  function getLight(id) {
    return getNamed("Light", lightRegistry, id);
  }

  function registerCostume(id, value) {
    return registerNamed("Costume", costumeRegistry, id, value);
  }

  function getCostume(id) {
    return getNamed("Costume", costumeRegistry, id);
  }

  function registerFrame(id, value) {
    return registerNamed("Frame", frameRegistry, id, value);
  }

  function getFrame(id) {
    return getNamed("Frame", frameRegistry, id);
  }

  /* A frame is the design space a style draws in. The base painter assumes
     256 x 288, so that is what "portrait" is and what
     you get when nothing asks otherwise. */
  function resolveFrame(pick) {
    if (!pick) return getNamed("Frame", frameRegistry, "portrait");
    if (typeof pick === "string") return getNamed("Frame", frameRegistry, pick);
    return { w: pick.w || 256, h: pick.h || 288 };
  }

  function registerWardrobe(id, value) {
    return registerNamed("Wardrobe", wardrobeRegistry, id, value);
  }

  function getWardrobe(id) {
    return getNamed("Wardrobe", wardrobeRegistry, id);
  }

  function registerPose(id, value) {
    return registerNamed("Pose", poseRegistry, id, value);
  }

  function getPose(id) {
    return getNamed("Pose", poseRegistry, id);
  }

  /* ============================================================
     Pose rigs - the camera axis.
     Pose was the one stage of model / POSE / shade / render that never
     became a registry: it lived as loose numbers on each style's
     modeConfig, so "the three-quarter the dynasty card uses" could only
     be copied, never named. A rig is a named table like a light rig.

       turn      how far the head is turned, before the seeded yaw
       mirror    when true (default) the turn follows the character's own
                 lit side, so one rig reads on either
       seedTurn  how much of the character's own seeded yaw is added
       pitch     tilt      seedTilt
       cy        scale     persp     framing

     Explicit numbers on modeConfig still win over the rig, so every
     style that already sets turn keeps working untouched. */

  function preparePose(rig, res, over) {
    rig = rig || {};
    if (typeof rig === "string") rig = getPose(rig);
    over = over || {};
    function pick(key, fallback) {
      if (over[key] !== undefined) return over[key];
      if (rig[key] !== undefined) return rig[key];
      return fallback;
    }
    var turn = pick("turn", .3);
    var mirror = pick("mirror", true);
    var seedTurn = pick("seedTurn", .8);
    var seedTilt = pick("seedTilt", .25);
    return {
      yaw: (mirror ? res.lx : 1) * turn + res.yaw * seedTurn,
      pitch: pick("pitch", .03),
      tilt: pick("tilt", 0) + res.yaw * seedTilt,
      cy: pick("cy", 116),
      /* ground is a fraction of the frame height. When set, the camera is
         placed so the FEET land there rather than the centre landing at
         cy, which is what plants a figure instead of floating it, and
         lets a child be shorter in frame without leaving the floor. */
      ground: pick("ground", undefined),
      cx: pick("cx", 128),
      scale: pick("scale", 1.04),
      persp: pick("persp", 340)
    };
  }

  /* ============================================================
     Light rigs - the shading axis.
     The pipeline separates model, pose, shading, and render mode, but
     shading was the one stage that never got an axis: each mode had
     its key direction written into it, so changing the light meant
     writing a new mode. A rig is a named table, registered like a model
     or a feature set, that turns a surface normal into an intensity and
     says how that intensity becomes colour. Modes read it; they no
     longer decide it.

       key       direction the key arrives from, in posed space
       mirror    when true (default) the key follows the character's own
                 seeded lit side, so one rig works for either
       wrap      how far light bends past the terminator
       fill      optional second direction, at fillLevel, filling only
                 what the key left dark
       ambient   the floor a continuous mode starts from
       gain      the range it spans above that floor
       tint      per channel multiplier on the lit part
       bands     a quantizing mode's steps, high to low, as
                 [threshold, lightness delta, saturation delta]
       rim       optional { color, amount } along the lit outline

     A rig carries both bands and ambient/gain so the same rig reads
     correctly whether the mode quantizes or shades continuously. */

  function prepareLight(rig, res) {
    rig = rig || {};
    if (typeof rig === "string") rig = getLight(rig);
    var key = rig.key || [.5, -.48, .72];
    var side = rig.mirror === false ? 1 : res.lx;
    var k = norm3(key[0] * side, key[1], key[2]);
    var f = rig.fill ? norm3(rig.fill[0] * side, rig.fill[1], rig.fill[2]) : null;
    return {
      kx: k[0], ky: k[1], kz: k[2],
      fx: f ? f[0] : 0, fy: f ? f[1] : 0, fz: f ? f[2] : 0,
      fillLevel: f ? (rig.fillLevel === undefined ? .35 : rig.fillLevel) : 0,
      wrap: rig.wrap === undefined ? .3 : rig.wrap,
      ambient: rig.ambient === undefined ? .42 : rig.ambient,
      gain: rig.gain === undefined ? .62 : rig.gain,
      tint: rig.tint || null,
      bands: rig.bands || [[.74, .06, 0], [.48, -.04, 0], [-1, -.13, .04]],
      rim: rig.rim || null
    };
  }

  /* normal (already unit length) to 0..1 intensity */
  function lightIntensity(P, nx, ny, nz) {
    var d = nx * P.kx + ny * P.ky + nz * P.kz;
    if (d < 0) d = 0;
    var i = (d + P.wrap) / (1 + P.wrap);
    if (P.fillLevel) {
      var fd = nx * P.fx + ny * P.fy + nz * P.fz;
      if (fd < 0) fd = 0;
      i += P.fillLevel * fd * (1 - i);   /* fill lifts only what is dark */
    }
    return i > 1 ? 1 : i;
  }

  /* continuous shading: base colour times the lit level, per channel */
  function lightTone(P, base, intensity) {
    var lum = P.ambient + P.gain * intensity;
    var t = P.tint;
    var r = Math.round(base[0] * (t ? lum * t[0] : lum));
    var g = Math.round(base[1] * (t ? lum * t[1] : lum));
    var b = Math.round(base[2] * (t ? lum * t[2] : lum));
    return "rgb(" + (r > 255 ? 255 : r) + "," +
      (g > 255 ? 255 : g) + "," + (b > 255 ? 255 : b) + ")";
  }

  /* quantized shading: pick the band this intensity falls in */
  function lightBand(P, base, intensity) {
    var bands = P.bands;
    var i;
    for (i = 0; i < bands.length; i += 1) {
      if (intensity > bands[i][0] || i === bands.length - 1) {
        return shade(base, bands[i][1], bands[i][2]);
      }
    }
    return base;
  }

  function registerStyle(def) {
    if (!def || !def.id || !def.name ||
        (typeof def.paint !== "function" && typeof def.mode !== "string")) {
      throw new Error("registerStyle needs { id, name } and either paint() or a registered mode");
    }
    if (registry.some(function (s) { return s.id === def.id; })) {
      throw new Error("Style id already registered: " + def.id);
    }
    registry.push(def);
  }

  function getStyles() {
    return registry.slice().sort(function (a, b) {
      return (a.order === undefined ? 50 : a.order) - (b.order === undefined ? 50 : b.order);
    });
  }

  function getStyle(id) {
    for (var i = 0; i < registry.length; i += 1) {
      if (registry[i].id === id) return registry[i];
    }
    return null;
  }

  function seededStream(spec, scope) {
    var sh = hashText(scope);
    return mulberry32((spec.hash[0] ^ spec.hash[1] ^ sh[0] ^ sh[1]) >>> 0);
  }

  function renderComposedStyle(style, view) {
    if (style.background) style.background(view);
    var cfg = mergeInto({}, style.modeConfig);
    if (view.figure) {
      cfg.figure = true;
      /* A portrait style's framing numbers describe a bust: they are the
         scale and centre that fill an 8:9 crop with a head. Carried into
         a figure frame they put the camera inside the chest. Drop them so
         the figure's pose rig can frame the whole person, then let the
         figure config restate anything it actually wants. */
      ["turn", "pitch", "tilt", "cx", "cy", "scale", "persp"].forEach(function (key) {
        delete cfg[key];
      });
      cfg.pose = view.figureCfg.pose || "standing";
      Object.keys(view.figureCfg).forEach(function (key) {
        if (key !== "frame" && key !== "pose") cfg[key] = view.figureCfg[key];
      });
    }
    if (style.model !== undefined && cfg.model === undefined) cfg.model = style.model;
    if (style.featureSet !== undefined) cfg.featureSet = style.featureSet;
    if (style.materials !== undefined) cfg.materials = style.materials;
    if (style.light !== undefined) cfg.light = style.light;
    if (style.costume !== undefined) cfg.costume = style.costume;
    if (style.wardrobe !== undefined) cfg.wardrobe = style.wardrobe;
    if (style.pose !== undefined) cfg.pose = style.pose;
    getMode(style.mode)(view, cfg);
    if (style.finish) style.finish(view);
  }

  function renderPortrait(canvas, spec, styleId, options) {
    options = options || {};
    var style = getStyle(styleId);
    if (!style) throw new Error("Unknown style: " + styleId);
    /* The design space used to be the constant 256 x 288 and was written
       into painters, backgrounds and finishes about three hundred times.
       A full figure needs a taller frame than a bust, so the space is now
       a property of the render, defaulting to exactly what it was. A
       style written against the old literals is a portrait style and
       keeps working untouched; a style that declares a taller frame reads
       v.W and v.H instead. */
    /* A style declares figure support with figure: true or a table of
       overrides. A caller asks for it; a style that cannot do it
       simply renders the bust it always did. */
    var figCfg = (options.figure === true && style.figure)
      ? (style.figure === true ? {} : style.figure) : null;
    var frame = resolveFrame(options.frame || (figCfg && figCfg.frame) ||
      (figCfg ? "figure" : null) || style.frame);
    var width = options.width || canvas.width || frame.w;
    var height = options.height || Math.round(width * frame.h / frame.w);
    canvas.width = width;
    canvas.height = height;
    /* The readback hint follows the same flag that decides the figure
       mask, because both exist for one reason: this style relights.
       A relighting style reads this canvas back through formLight, and
       on a GPU-backed canvas that readback has to flush thousands of
       pending path fills. Measured on hardware: dynasty at 256 px goes
       55.5 ms to 23.6 ms, warhero at 1024 px 367.5 to 252.8, with the
       readback itself 4.7x cheaper. Setting it for every style instead
       would be worse, not better: a style that never reads is slower on
       a CPU-backed surface, measured at roughly two to five extra ms
       each at 1024 px across storybook, meshcel and both pixel styles.
       So it is asked for exactly where it is paid off.
       Note the attribute is fixed by the call that CREATES the context:
       re-rendering a different style into a canvas that already has one
       keeps the original setting. */
    var ctx = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: style.mask === true
    });
    if (!ctx) throw new Error("Canvas 2D context could not be created.");
    var started = performance.now();
    var res = resolveSpec(spec, style.wardrobe);
    if (style.restyle) res = style.restyle(res, U) || res;
    var L = layoutOf(res, style.canon);
    var rng = seededStream(spec, "style:" + style.id + ":paint");
    var s = width / frame.w;
    /* grain still references 256 so texture density is unchanged */
    var dt = clamp(width / 256, .4, 4);
    var k = style.knobs || {};
    STATE.ink = k.ink || [44, 30, 23];
    STATE.inkW = k.inkW || 1;
    STATE.inkA = k.inkA || 1;
    var view = {
      ctx: null, res: res, L: L, rng: rng, dt: dt, U: U, k: k,
      width: width, height: height, style: style,
      frame: frame, W: frame.w, H: frame.h,
      figure: !!figCfg, figureCfg: figCfg,
      /* only styles that relight opt into the figure mask; see maskable */
      mask: style.mask === true
    };
    /* Geometry and identity use a style-independent stream. Paint and
       texture use a style-scoped stream. Each request returns a fresh
       deterministic stream so a second render stage cannot consume state
       left by the first. */
    view.characterRng = function (scope) {
      return seededStream(spec, "character:" + (scope || "default"));
    };
    view.styleRng = function (scope) {
      return seededStream(spec, "style:" + style.id + ":" + (scope || "default"));
    };
    view.brush = mergeInto(mergeInto({}, DEFAULT_BRUSHES), style.brushes);
    view.features = style.features || null;
    view.shape = style.shape || null;
    view.ctx = wrapCtx(ctx, view);
    MARK.role = "style";
    ctx.save();
    ctx.scale(s, height / frame.h);
    if (typeof style.paint === "function") style.paint(view);
    else renderComposedStyle(style, view);
    ctx.restore();
    return { styleId: style.id, width: width, height: height, wallMs: performance.now() - started };
  }

  window.YOLO = {
    util: U,
    PRESETS: PRESETS,
    TIER_NAMES: TIER_NAMES,
    CULTURES: CULTURES,
    CULTURE_KEYS: CULTURE_KEYS,
    HAIR_STYLES: HAIR_STYLES,
    HEADWEAR: HEADWEAR,
    /* the type tables, so reference controls use the same
       source the drawers switch on */
    WOUNDS: WOUNDS,
    WOUND_TYPES: WOUND_TYPES,
    WOUND_PLACES: WOUND_PLACES,
    WOUND_KNOBS: WOUND_KNOBS,
    HEADDRESS_TYPES: HEADDRESS_TYPES,
    HW_KNOBS: HW_KNOBS,
    typeEntry: function (family, id) {
      return (family === "wound" ? WOUND_BY_ID : HEADDRESS_BY_ID)[id] || null;
    },
    labelOf: labelOf,
    humanLabel: humanLabel,
    GOLD: GOLD, GOLD_L: GOLD_L, GOLD_D: GOLD_D,
    makeSpec: makeSpec,
    resolveSpec: resolveSpec,
    describeSpec: describeSpec,
    skinRamp: skinRamp,
    CANON_DEFAULTS: CANON_DEFAULTS,
    BRUSH_DEFAULTS: DEFAULT_BRUSHES,
    features: FEATURES,
    /* push a mark role for custom pipelines (mesh modes); returns the pop */
    pushRole: function (name) {
      var prev = MARK.role;
      MARK.role = name;
      return function () { MARK.role = prev; };
    },
    wrapCtx: wrapCtx,
    layoutOf: layoutOf,
    paint: paint,
    registerStyle: registerStyle,
    getStyles: getStyles,
    getStyle: getStyle,
    registerModel: registerModel,
    getModel: getModel,
    registerMode: registerMode,
    getMode: getMode,
    registerMaterial: registerMaterial,
    getMaterial: getMaterial,
    registerFeatureSet: registerFeatureSet,
    getFeatureSet: getFeatureSet,
    registerLight: registerLight,
    getLight: getLight,
    light: {
      prepare: prepareLight,
      intensity: lightIntensity,
      tone: lightTone,
      band: lightBand
    },
    registerCostume: registerCostume,
    getCostume: getCostume,
    registerWardrobe: registerWardrobe,
    getWardrobe: getWardrobe,
    registerFrame: registerFrame,
    getFrame: getFrame,
    registerPose: registerPose,
    getPose: getPose,
    preparePose: preparePose,
    renderPortrait: renderPortrait
  };

  /* The two rigs the mesh modes were born with, kept as named tables so
     the defaults stay exactly what they were, plus a starter set that
     changes the look without touching a mode. */
  registerLight("mesh-cel", { key: [.45, -.5, .74] });
  registerLight("mesh-painted", { key: [.5, -.48, .72] });
  /* broad, nearly shadowless: everything legible, for thumbnails */
  registerLight("overcast", {
    key: [.18, -.62, .86], wrap: .75, ambient: .62, gain: .4,
    bands: [[.62, .04, 0], [.34, -.03, 0], [-1, -.08, .02]]
  });
  /* a hard low key across the face, deep shadow, small fill */
  registerLight("rembrandt", {
    key: [.86, -.34, .38], wrap: .06, ambient: .24, gain: .82,
    fill: [-.7, -.1, .5], fillLevel: .16,
    bands: [[.66, .09, -.02], [.42, -.06, .03], [-1, -.24, .08]]
  });
  /* cold ambient with a warm key: the tint axis in one line */
  registerLight("hearth", {
    key: [.62, .28, .6], wrap: .22, ambient: .3, gain: .78,
    tint: [1.12, .96, .78], fill: [-.5, -.6, .4], fillLevel: .3,
    bands: [[.7, .08, .04], [.44, -.05, .05], [-1, -.18, .1]]
  });
  /* keyed from behind, so the figure reads mostly as its own rim */
  /* 8:9 is the base bust frame. The figure frame is close to
     the game's own paperdoll proportion, tall enough for a standing
     figure without leaving the head unreadably small. */
  registerFrame("portrait", { w: 256, h: 288 });
  registerFrame("figure", { w: 256, h: 480 });

  /* The built-in medieval vocabulary keeps the same order, byte indices,
     and resolution rules. */
  registerWardrobe("standard", {
    hair: function (res, spec, u) {
      var h = spec.hash[0];
      var style;
      if (!res.sexF && res.profession === "monk" && spec.religion === "christian") {
        style = "tonsure";
      } else if (res.sexF) {
        style = HAIR_F[u.byteOf(h, 12) % HAIR_F.length];
      } else {
        style = HAIR_M[u.byteOf(h, 12) % HAIR_M.length];
        if (spec.age > 42 && spec.recedeRoll > .62) style = "receding";
        if (spec.age > 52 && spec.recedeRoll > .87) style = "bald";
        if (spec.culture === "norse" && u.byteOf(h, 13) > 120) style = "longLoose";
      }
      /* last, so it overrides every branch above, as it always did */
      if (res.child) style = res.sexF ? "braids" : "crop";
      return style;
    },
    headwear: function (res, spec, u) {
      var h = spec.hash[0];
      var prof = res.profession;
      if (spec.religion === "muslim" && !res.sexF && res.adult && prof !== "monk") return "turban";
      if (spec.religion === "muslim" && res.sexF && res.adult) return "veil";
      if (spec.tier >= 7) return "imperial";
      if (spec.tier >= 6) return "crown";
      if (spec.tier >= 4) return "circlet";
      if (res.sexF && res.adult && spec.age >= 46 && u.byteOf(h, 14) > 84) return "wimple";
      if (res.sexF && res.adult && u.byteOf(h, 14) > 168) return "veil";
      if (prof === "soldier" && u.byteOf(h, 15) > 96) return "helm";
      if (prof === "merchant" && u.byteOf(h, 15) > 96) return "cap";
      if (spec.tier <= 1 && !res.sexF && res.adult && u.byteOf(h, 15) > 208) return "coif";
      /* The types added by the expansion draw from what is left AFTER
         every rule above, and only off a byte of their own. Anyone who
         already had a headdress keeps exactly the one they had; these
         only reach the bare-headed, which is where a kerchief or a straw
         hat belongs anyway. Ordered rarest first.

         Mind the station ceiling: every tier 4 and up has already
         returned a coronet by this point, so a rule here that asks for
         tier 4 is dead code. The first draft asked exactly that for the
         mitre and the crespine and neither could ever be seeded. Read
         "tier >= 2" below as "of some standing", which is as high as
         anything in this block can see. */
      var g = u.byteOf(h, 35);
      if (prof === "priest" && spec.tier >= 2) return "mitre";
      if (res.sexF && res.adult && spec.tier >= 2 && g > 150) return "crespine";
      if (res.sexF && res.adult && spec.tier >= 2 && g > 96) return "fillet";
      if (res.sexF && !res.adult && g > 176) return "garland";
      if ((spec.culture === "norse" || spec.culture === "slavic") &&
        res.adult && g > 168) return "furHat";
      if (res.sexF && spec.tier <= 2 && res.adult && g > 88) return "kerchief";
      if (spec.tier <= 1 && res.adult && g > 200) return "strawHat";
      if (spec.tier <= 3 && !res.sexF && res.adult && g < 40) return "chaperon";
      return "none";
    },
    adjust: function (hw, res) {
      /* a child is crowned with a circlet, however the crown was chosen */
      if (res.child && (hw === "crown" || hw === "imperial")) return "circlet";
      return hw;
    },
    covers: function (hw) {
      return hw === "veil" || hw === "wimple" || hw === "turban" ||
        hw === "hood" || hw === "coif" || hw === "helm";
    }
  });

  /* The stock framings, named. "quarter" is the engine default, so a
     style that names nothing gets exactly what it got before. */
  registerPose("quarter", {});
  registerPose("front", { turn: .04, seedTurn: .35, pitch: .02 });
  registerPose("threeQuarter", { turn: .52, pitch: .04, seedTurn: .6 });
  /* looked up at, the way a hero card frames a ruler */
  registerPose("heroic", { turn: .34, pitch: -.13, cy: 122, scale: 1.12 });
  /* looked down on, chin dropped: penitent, or grieving */
  registerPose("downcast", { turn: .18, pitch: .22, tilt: .05, cy: 110 });
  /* close and flattened, for a seal or a coin */
  /* a standing figure needs the camera pulled back and lifted, and it
     wants less turn than a bust: a portrait can afford a strong three
     quarter, a full figure reads better nearly square on */
  registerPose("standing", {
    turn: .2, seedTurn: .5, pitch: .02, scale: .67, ground: .935, persp: 1400
  });
  registerPose("medallion", { turn: .62, pitch: .01, scale: 1.2, cy: 126, persp: 900 });

  registerLight("backlit", {
    key: [.4, -.72, -.5], wrap: .5, ambient: .3, gain: .58,
    fill: [.2, -.2, 1], fillLevel: .22,
    rim: { color: [214, 226, 236], amount: 1 },
    bands: [[.72, .1, -.02], [.5, -.06, .02], [-1, -.16, .05]]
  });
})();
