/* Court Illustration v2 reference - costume geometry.
   Hair, beards and the supported headwear types are built as mesh
   layers (lofted shells, bands, tubes) attached to the bust, so every
   render mode gets every costume for free. All geometry derives from the
   bust's own parameters; colors land in bust.tagColors for the modes.
   Wounds and jewelry decals are still to come. */
(function () {
  "use strict";

  var YO = window.YOLO;
  var U = YO.util;
  var TAU = Math.PI * 2;

  var GOLD = [206, 170, 88];
  var STEEL = [142, 148, 156];
  var VEIL_DYES = [[150, 158, 176], [172, 158, 138], [166, 138, 132], [146, 152, 128]];
  var TURBAN_DYES = [[74, 84, 112], [124, 66, 56], [108, 100, 64], [92, 78, 96]];
  var FELTS = [[104, 58, 52], [78, 86, 56], [70, 80, 96], [96, 76, 50]];

  /* ---------- loft helpers ----------
     These now live with the mesh (YO.mesh.kit) so a model's own parts and
     an alternative costume table can build with exactly the same tools.
     kOf keeps every ring count on the model's tessellation. */

  var K = YO.mesh.kit;
  var kOf = K.kOf, ring = K.ring, strip = K.strip, loft = K.loft;
  var frontPatch = K.frontPatch, stud = K.stud;

  function hairCapShell(bust, P, style, rng) {
    var curly = style === "curly";
    var crop = style === "crop";
    var t = curly ? 4.5 : crop ? 1.8 : 2.7;
    var botY = crop ? -P.HT * .28 : -P.HT * .14;
    var fz = crop ? .66 : .72;
    var starts = capShell(bust, P, t, curly ? 3 : .8, botY, fz,
      "hair", curly ? 2.4 : style === "longLoose" ? .8 : 0, rng);
    var fringe = starts[starts.length - 1];
    var K = kOf(bust, 14);        /* must match capShell's ring count */
    var k;
    /* Break the helmet-straight lower rim into a seeded hairline. Only
       the front half moves, so the cap stays connected at the temples. */
    for (k = 0; k < K; k += 1) {
      var ang = k / K * TAU;
      var front = Math.max(0, Math.cos(ang));
      var side = Math.sin(ang);
      var sweep = style === "sidePart" ? side * 4.2 : 0;
      var tooth = (rng() - .5) * (curly ? 4 : 2.2);
      bust.verts[fringe + k][1] += front * (sweep + tooth);
    }
    return starts;
  }

  /* a closed cap shell from above the crown down to botY; the fringe is
     the bottom edge. t = thickness, fz = how far the fringe leans over
     the forehead (as a share of D). */
  function capShell(bust, P, t, topLift, botY, fz, tag, bump, rng) {
    var W = P.W, D = P.D, HT = P.HT;
    var specs = [
      { y: -HT - topLift, w: W * .34 + t, zf: D * .40 + t, zb: D * .44 + t, zo: -D * .02 },
      { y: -HT * .70, w: W * .86 + t, zf: D * .58 + t, zb: D * .92 + t, zo: -D * .04 },
      { y: -HT * .34, w: W + t, zf: D * .68 + t, zb: D + t, zo: -D * .05 },
      { y: U.mix(-HT * .34, botY, .6), w: W * 1.01 + t, zf: D * fz + t * .6, zb: D * .97 + t, zo: -D * .04 },
      { y: botY, w: P.cheekW * 1.01 + t * .5, zf: D * (fz - .04) + t * .4, zb: D * .9 + t * .7, zo: -D * .03 }
    ];
    if (bump && rng) {
      specs.forEach(function (s, si) {
        if (si > 0) s.w += rng() * bump;
        s.zf += rng() * bump * .7;
        s.zb += rng() * bump * .7;
      });
    }
    var K = kOf(bust, 14);
    var starts = loft(bust, specs, K, 0, TAU, true, tag);
    var apex = bust.verts.length;
    bust.verts.push([0, -P.HT - topLift - 2.5, -P.D * .02]);
    var a;
    for (a = 0; a < K; a += 1) {
      bust.faces.push([apex, starts[0] + (a + 1) % K, starts[0] + a, tag]);
    }
    return starts;
  }

  /* side and back falls from brow level down, leaving the face open */
  function falls(bust, P, t, botY, wIn, tag) {
    var D = P.D;
    var a0 = TAU * .16, a1 = TAU * .84;   /* excludes the face */
    var specs = [
      { y: -6, w: P.cheekW + t, zf: D * .55, zb: D * .95 + t, zo: -D * .04 },
      { y: P.FL * .5, w: P.cheekW + t + 1, zf: D * .5, zb: D * .8 + t, zo: -D * .05 },
      { y: P.FL * 1.05, w: P.cheekW + t, zf: D * .42, zb: D * .55 + t, zo: -D * .08 },
      { y: botY, w: P.cheekW + t + wIn, zf: D * .4, zb: D * .4 + t, zo: -D * .1 }
    ];
    loft(bust, specs, kOf(bust, 10), a0, a1, false, tag);
  }

  /* ---------- hair ---------- */
  function attachHair(bust, res, rng) {
    var P = bust.P;
    var style = res.hairStyleR;
    if (style === "bald") return;
    if (style === "receding") {
      /* A connected horseshoe around the sides and back. The open front
         and crown are intentional scalp, not missing cap triangles. */
      loft(bust, [
        { y: -P.HT * .60, w: P.W * .91 + 1.5, zf: P.D * .57 + 1.5, zb: P.D * .94 + 1.5, zo: -P.D * .05 },
        { y: -P.HT * .30, w: P.W * 1.01 + 2, zf: P.D * .66 + 2, zb: P.D + 2, zo: -P.D * .05 },
        { y: -P.HT * .06, w: P.cheekW + 1.5, zf: P.D * .56 + 1.5, zb: P.D * .91 + 2, zo: -P.D * .03 },
        { y: 7, w: P.cheekW * .98 + 1, zf: P.D * .48 + 1, zb: P.D * .82 + 1.5, zo: -P.D * .02 }
      ], kOf(bust, 12), TAU * .16, TAU * .84, false, "hair");
      return;
    }
    if (style === "tonsure") {
      /* a band of hair with the crown left bare */
      loft(bust, [
        { y: -P.HT * .42, w: P.W * .99 + 2, zf: P.D * .62 + 2, zb: P.D * .96 + 2, zo: -P.D * .05 },
        { y: -P.HT * .12, w: P.W * 1.02 + 2, zf: P.D * .66 + 2, zb: P.D + 2, zo: -P.D * .05 },
        { y: 6, w: P.cheekW + 1.5, zf: P.D * .6, zb: P.D * .9 + 2, zo: -P.D * .03 }
      ], kOf(bust, 14), 0, TAU, true, "hair");
      return;
    }
    hairCapShell(bust, P, style, rng);
    if (style === "longLoose") falls(bust, P, 3, P.FL * 1.45, 4, "hair");
    if (style === "bun") {
      loft(bust, [
        { y: -P.HT * 1.02, w: 1.5, zf: 1.5, zo: -P.D * .55 },
        { y: -P.HT * .92, w: 7.5, zf: 7, zo: -P.D * .6 },
        { y: -P.HT * .74, w: 6, zf: 5.5, zo: -P.D * .62 },
        { y: -P.HT * .64, w: 1.5, zf: 1.5, zo: -P.D * .58 }
      ], kOf(bust, 8), 0, TAU, true, "hair");
    }
    if (style === "braids") {
      [-1, 1].forEach(function (side) {
        var specs = [];
        var i;
        for (i = 0; i < 5; i += 1) {
          var tt = i / 4;
          specs.push({
            y: P.FL * (.3 + tt * 1.1),
            w: (i % 2 ? 3 : 3.9) * (1 - tt * .25),
            zf: (i % 2 ? 3 : 3.9) * (1 - tt * .25),
            xo: side * (P.cheekW * .88 - tt * 6),
            zo: P.D * (.1 + tt * .28)
          });
        }
        loft(bust, specs, kOf(bust, 7), 0, TAU, true, "hair");
      });
    }
  }

  /* ---------- beard ---------- */
  function attachBeard(bust, res) {
    if (res.beardKind === "none" || res.beardKind === "stubble") return;
    var P = bust.P;
    var len = res.beardKind === "short" ? 4 : res.beardKind === "full" ? 11 : 24;
    var forked = res.beardKind === "long" && U.byteOf(res.hash[0], 18) > 150;
    var gonW = P.W * P.gonR;
    frontPatch(bust, [
      {
        y: function (u) {
          return P.FL * (.34 + .31 * Math.pow(1 - Math.abs(u), 1.25));
        },
        x: 0, w: P.cheekW * .94 + 1.2,
        zf: P.D * .63 + 2.2, zo: P.D * .01
      },
      {
        y: P.FL * .72, x: 0, w: gonW + 2,
        zf: P.D * .56 + 2.4, zo: P.D * .04
      },
      {
        y: P.FL * .96 + len * .22, x: 0, w: P.chinW * 1.42,
        zf: P.D * .48 + 2, zo: P.D * .10
      },
      {
        y: function (u) {
          if (!forked) return P.FL * 1.02 + len;
          return P.FL * 1.02 + len * (.72 + .34 * Math.sin(Math.PI * Math.abs(u)));
        },
        x: 0, w: P.chinW * .72,
        zf: P.D * .34 + 1.2, zo: P.D * .14
      }
    ], kOf(bust, 9), "beard");

    /* Two tapered lobes leave a visible philtrum and avoid a rigid shelf. */
    [-1, 1].forEach(function (side) {
      frontPatch(bust, [
        {
          y: function (u) { return P.FL * (.475 + .012 * u); },
          x: side * P.noseW * 1.45, w: P.noseW * .9,
          zf: P.D * .63 + 3, zo: P.D * .03
        },
        {
          y: function (u) { return P.FL * (.555 + .018 * u); },
          x: side * P.noseW * 1.5, w: P.noseW * .82,
          zf: P.D * .60 + 2.5, zo: P.D * .03
        }
      ], kOf(bust, 4), "beard");
    });
  }

  /* ---------- headwear ---------- */
  function attachHeadwear(bust, res, rng) {
    var P = bust.P;
    var h = res.hash[0];
    /* the base id: this geometry knows the eleven stock types, so a
       type added later builds the nearest of those instead of
       leaving the head bare */
    var hw = res.headwearBase;
    if (hw === "none") return;

    if (hw === "circlet") {
      loft(bust, [
        { y: -P.HT * .50, w: P.W * 1.02 + 2, zf: P.D * .68 + 2, zb: P.D + 2, zo: -P.D * .05 },
        { y: -P.HT * .40, w: P.W * 1.03 + 2, zf: P.D * .70 + 2, zb: P.D + 2, zo: -P.D * .05 }
      ], kOf(bust, 14), 0, TAU, true, "gold");
      stud(bust, 0, -P.HT * .45, -P.D * .05 + P.D * .70 + 3, 2.2, "gem");
      return;
    }
    if (hw === "crown" || hw === "imperial") {
      var bandStarts = loft(bust, [
        { y: -P.HT * .62, w: P.W * 1.0 + 2, zf: P.D * .66 + 2, zb: P.D * .98 + 2, zo: -P.D * .05 },
        { y: -P.HT * .38, w: P.W * 1.04 + 2, zf: P.D * .70 + 2, zb: P.D + 2, zo: -P.D * .05 }
      ], kOf(bust, 14), 0, TAU, true, "gold");
      /* points rise from the band top, indexed into the band's own ring */
      var KB = kOf(bust, 14);
      var i;
      for (i = -2; i <= 2; i += 1) {
        var ang = i * .42;
        var bw = P.W * 1.0 + 2, bzf = P.D * .66 + 2;
        var bx = bw * Math.sin(ang) * .98;
        var bz = (-P.D * .05) + bzf * Math.cos(ang);
        var apex = bust.verts.length;
        bust.verts.push([bx, -P.HT * (i === 0 ? .95 : .84), bz]);
        var base = bandStarts[0];
        var kA = ((Math.round(ang / TAU * KB) % KB) + KB) % KB;
        bust.faces.push([apex, base + (kA + 1) % KB, base + kA, "gold"]);
      }
      /* band gems: ruby, sapphire, ruby */
      var gy = -P.HT * .5;
      stud(bust, -P.W * .5, gy, -P.D * .05 + P.D * .60 + 3, 2, "gem");
      stud(bust, 0, gy - 1, -P.D * .05 + P.D * .68 + 3, 2.3, "gemB");
      stud(bust, P.W * .5, gy, -P.D * .05 + P.D * .60 + 3, 2, "gem");
      if (hw === "imperial") {
        capShell(bust, P, 1.2, 4, -P.HT * .55, .66, "capRed", 0, null);
        stud(bust, 0, -P.HT * 1.12, 0, 2.4, "gold");
      }
      return;
    }
    if (hw === "helm") {
      capShell(bust, P, 2, 2.5, -8, .70, "metal", 0, null);
      /* nasal bar */
      var nb = bust.verts.length;
      bust.verts.push([-2.6, -9, P.D * .72 + 2]);
      bust.verts.push([2.6, -9, P.D * .72 + 2]);
      bust.verts.push([2.4, P.FL * .38, P.D * .62 + P.noseLen + 1.5]);
      bust.verts.push([-2.4, P.FL * .38, P.D * .62 + P.noseLen + 1.5]);
      bust.faces.push([nb, nb + 1, nb + 2, "metal"]);
      bust.faces.push([nb, nb + 2, nb + 3, "metal"]);
      /* rim band and rivets */
      loft(bust, [
        { y: -10, w: P.W * 1.0 + 2.4, zf: P.D * .70 + 2.4, zb: P.D * .97 + 2.4, zo: -P.D * .05 },
        { y: -5, w: P.cheekW * 1.01 + 1.6, zf: P.D * .68 + 1.6, zb: P.D * .92 + 1.6, zo: -P.D * .04 }
      ], kOf(bust, 14), 0, TAU, true, "metalDark");
      stud(bust, -P.W * .55, -7.5, -P.D * .05 + P.D * .56 + 3, 1.4, "metal");
      stud(bust, 0, -8.5, -P.D * .05 + P.D * .70 + 3, 1.4, "metal");
      stud(bust, P.W * .55, -7.5, -P.D * .05 + P.D * .56 + 3, 1.4, "metal");
      return;
    }
    if (hw === "coif") {
      capShell(bust, P, 1.6, 1, 6, .70, "linen", 0, null);
      return;
    }
    if (hw === "hood") {
      capShell(bust, P, 3.4, 4, 2, .74, "hoodC", 0, null);
      falls(bust, P, 5, P.FL * 1.5, 10, "hoodC");
      return;
    }
    if (hw === "veil" || hw === "wimple") {
      capShell(bust, P, 2.2, 2.5, 0, .72, "veilC", 0, null);
      falls(bust, P, 4, P.FL * 1.55, 8, "veilC");
      if (res.tier >= 4) {
        /* a fillet band holds the veil for the well-born */
        loft(bust, [
          { y: -P.HT * .46, w: P.W * 1.02 + 3.4, zf: P.D * .68 + 3.4, zb: P.D + 3.4, zo: -P.D * .05 },
          { y: -P.HT * .38, w: P.W * 1.03 + 3.4, zf: P.D * .70 + 3.4, zb: P.D + 3.4, zo: -P.D * .05 }
        ], kOf(bust, 14), 0, TAU, true, "gold");
      }
      if (hw === "wimple") {
        /* the throat wrap */
        loft(bust, [
          { y: P.FL * .92, w: P.chinW * 2.2, zf: P.D * .5, zb: P.D * .2, zo: P.D * .04 },
          { y: P.FL * 1.3, w: P.neckR * 1.5, zf: P.neckR * 1.4, zb: P.neckR * .8, zo: -P.D * .1 }
        ], kOf(bust, 9), -TAU * .24, TAU * .24, false, "linen");
      }
      return;
    }
    if (hw === "turban") {
      /* The wraps sit over a closed cloth cap. Without this base the gaps
         between wrap bands reveal a bald scalp and read as loose tufts. */
      capShell(bust, P, 1.5, 4, -P.HT * .12, .71, "turbanC", 0, null);
      var k;
      for (k = 0; k < 3; k += 1) {
        var cy = -P.HT * (.30 + k * .26);
        var fat = 6.5 - k * 1.1;
        loft(bust, [
          { y: cy + fat * .8, w: P.W * (1.06 - k * .1) + 2, zf: P.D * (.72 - k * .06) + 2, zb: P.D * (.96 - k * .1) + 2, zo: -P.D * .04 },
          { y: cy, w: P.W * (1.12 - k * .1) + 3, zf: P.D * (.78 - k * .06) + 3, zb: P.D * (1.0 - k * .1) + 3, zo: -P.D * .04 },
          { y: cy - fat * .8, w: P.W * (1.02 - k * .12) + 2, zf: P.D * (.68 - k * .07) + 2, zb: P.D * (.9 - k * .1) + 2, zo: -P.D * .04 }
        ], kOf(bust, 12), 0, TAU, true, "turbanC");
        /* the wrap seam between stacks */
        if (k < 2) {
          loft(bust, [
            { y: cy - fat * .78, w: P.W * (1.03 - k * .11) + 2.6, zf: P.D * (.69 - k * .065) + 2.6, zb: P.D * (.92 - k * .1) + 2.6, zo: -P.D * .04 },
            { y: cy - fat * .95, w: P.W * (1.0 - k * .11) + 2.2, zf: P.D * (.67 - k * .065) + 2.2, zb: P.D * (.9 - k * .1) + 2.2, zo: -P.D * .04 }
          ], kOf(bust, 12), 0, TAU, true, "turbanSeam");
        }
      }
      if (res.tier >= 5) {
        stud(bust, 2, -P.HT * .44, -P.D * .04 + P.D * .74 + 4, 2.4, "gemG");
      }
      return;
    }
    if (hw === "cap") {
      capShell(bust, P, 2, 3, -P.HT * .42, .68, "felt", 0, null);
      loft(bust, [
        { y: -P.HT * .44, w: P.W * 1.02 + 2, zf: P.D * .70 + 2, zb: P.D + 2, zo: -P.D * .05 },
        { y: -P.HT * .40, w: P.W * 1.02 + 6, zf: P.D * .70 + 6, zb: P.D + 6, zo: -P.D * .05 }
      ], kOf(bust, 14), 0, TAU, true, "felt");
    }
  }

  /* ---------- costume as an axis ----------
     Hair, beards and headwear used to be one implementation with no way
     in: a style could retint them and retessellate them, but their form
     language was fixed, which put "a different kind of hair" out of reach
     of every style at once. They are now a table, registered and picked
     like a model or a light rig, and a table may override only the parts
     it cares about. A costume that wants its own hair inherits the ten
     headwear types rather than reimplementing them. */

  function standardColors(res) {
    var h = res.hash[0];
    var tc = {
      hair: res.hairD,
      beard: U.lerpC(res.hairD, res.hairDD, .5),
      gold: GOLD,
      metal: STEEL,
      linen: res.linen,
      hoodC: res.cloth.dark,
      veilC: res.tier >= 3 ? VEIL_DYES[U.byteOf(h, 20) % VEIL_DYES.length] : res.linen,
      turbanC: U.byteOf(h, 5) > 118 ? [222, 214, 192] : TURBAN_DYES[U.byteOf(h, 5) % TURBAN_DYES.length],
      felt: FELTS[U.byteOf(h, 19) % FELTS.length],
      capRed: [122, 32, 38],
      gem: [150, 42, 50],
      gemB: [46, 66, 132],
      gemG: [46, 98, 82],
      metalDark: [98, 104, 112],
      turbanSeam: null,
      /* the figure's sleeves, hose and shoes. They are dress, so they
         belong to the costume rather than to the mesh that carries them,
         and a wardrobe for another world will want its own. */
      limb: res.tier >= 3 ? U.shade(res.cloth.dark, -.04, -.04, -6)
        : U.lerpC(res.cloth.deep, [74, 64, 52], .5),
      foot: [52, 40, 32]
    };
    tc.turbanSeam = U.shade(tc.turbanC, -.13, .03);
    return tc;
  }

  var STANDARD = {
    hair: function (bust, res, rng) {
      if (!res.coversHair) attachHair(bust, res, rng);
    },
    beard: function (bust, res) { attachBeard(bust, res); },
    headwear: function (bust, res, rng) { attachHeadwear(bust, res, rng); },
    colors: standardColors
  };

  function attach(bust, res, rng, pick) {
    var t = STANDARD;
    if (pick) {
      var chosen = typeof pick === "string" ? YO.getCostume(pick) : pick;
      /* partial override: whatever a table leaves out stays standard */
      t = {
        hair: chosen.hair || STANDARD.hair,
        beard: chosen.beard || STANDARD.beard,
        headwear: chosen.headwear || STANDARD.headwear,
        colors: chosen.colors || STANDARD.colors
      };
    }
    /* order matters: it fixes what each builder draws from the stream */
    t.hair(bust, res, rng, K, STANDARD);
    t.beard(bust, res, rng, K, STANDARD);
    t.headwear(bust, res, rng, K, STANDARD);
    bust.tagColors = t.colors(res, U, STANDARD);
  }

  YO.registerCostume("standard", STANDARD);

  YO.registerMaterial("beard", { layer: 55, family: "beard", outline: true });
  YO.registerMaterial("hair", { layer: 58, family: "hair", outline: true });
  YO.registerMaterial("hoodC", { layer: 70, family: "drape", outline: true });
  YO.registerMaterial("veilC", { layer: 71, family: "drape", outline: true });
  YO.registerMaterial("linen", { layer: 72, family: "drape", outline: true });
  YO.registerMaterial("turbanC", { layer: 73, family: "drape", outline: true });
  YO.registerMaterial("turbanSeam", { layer: 74, family: "drape", outline: false });
  YO.registerMaterial("felt", { layer: 75, family: "drape", outline: true });
  YO.registerMaterial("capRed", { layer: 76, family: "drape", outline: true });
  YO.registerMaterial("metalDark", { layer: 80, family: "metal", outline: true });
  YO.registerMaterial("metal", { layer: 81, family: "metal", outline: true });
  YO.registerMaterial("gold", { layer: 82, family: "metal", outline: true });
  YO.registerMaterial("gem", { layer: 90, family: "gem", outline: true });
  YO.registerMaterial("gemB", { layer: 91, family: "gem", outline: true });
  YO.registerMaterial("gemG", { layer: 92, family: "gem", outline: true });

  YO.costume = { attach: attach };
})();
