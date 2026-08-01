/* Court Illustration v2 reference - parametric anatomy scaffold.
   A lofted low-poly head (cross-section rings from crown
   to chin) plus nose wedge, ears, neck and shoulders, deformed by the
   seeded character fields. Real pose (yaw/pitch/tilt), orthographic-ish
   projection, painter-sorted flat shading, and projected feature anchors.
   No v1 geometry is used; only the generator/resolver are shared.
   Deterministic, canvas-only, file:// safe. */
(function () {
  "use strict";

  var YO = window.YOLO;
  var U = YO.util;
  var TAU = Math.PI * 2;
  var AZ = 22;             /* default azimuth steps per ring */
  var SUB = 1;             /* default midpoints inserted between sections */

  function resolveModel(res, model) {
    if (typeof model === "string") model = YO.getModel(model);
    if (typeof model === "function") model = model(res, U) || {};
    return model || {};
  }

  /* Topology is part of the model, not a constant of the file. A model
     used to be a table of multipliers over the same fixed tessellation,
     which meant it could restate proportions but never its own
     resolution, and the low poly and voxel categories the rebuild is
     aimed at were unreachable by construction. tess.az sets the azimuth
     steps per ring and tess.sub how many midpoints are inserted between
     the authored cross sections; the defaults reproduce the original
     bust exactly. */
  function tessOf(model) {
    var t = model.tess || {};
    return {
      az: Math.max(4, Math.round(t.az === undefined ? AZ : t.az)),
      sub: Math.max(0, Math.round(t.sub === undefined ? SUB : t.sub))
    };
  }

  /* ---------- model parameters from the resolved character ----------
     Local head space: origin at the eye line center, +x right, +y down,
     +z toward the viewer. Units are 256-canvas pixels. */
  function headParams(res, over) {
    var mt = res.maturity;
    var P = {
      W: 29 * res.faceWidth * (.9 + .1 * mt),        /* cranium half width */
      D: 33 * (.92 + .08 * mt),                      /* skull half depth */
      HT: 38 * (.88 + .12 * mt),                     /* eye line to crown */
      FL: 40 * (.82 + .25 * res.chin) * (.86 + .14 * mt), /* eye line to chin */
      cheekW: 1,                                     /* filled below */
      gonR: .68 + .13 * res.jaw,                     /* jaw corner / W */
      chinW: 9.5 + 5 * res.jaw,
      browZ: .70 + .04 * res.browWeight,             /* brow shelf / D */
      noseLen: 9.5 * res.noseLen,                    /* tip protrusion */
      noseW: 5.5 * res.noseW,
      earS: res.earSize,
      neckR: (res.sexF ? 14.5 : 17.5) * (.8 + .2 * mt),
      shW: (res.sexF ? 50 : 58) * (.62 + .38 * mt),
      jowl: res.elder
    };
    P.cheekW = P.W * (.9 + .1 * res.cheek);
    /* a MODEL is a table of multipliers over these fields (brute, chibi,
       realistic...) - same topology, different proportional world */
    if (over) {
      Object.keys(over).forEach(function (k) {
        if (P[k] !== undefined) P[k] = P[k] * over[k];
      });
      P.cheekW = P.W * (.9 + .1 * res.cheek) * (over.cheekW || 1);
    }
    return P;
  }

  /* ---------- the loft ---------- */
  function sections(P) {
    var W = P.W, D = P.D, HT = P.HT, FL = P.FL;
    var gonW = P.W * P.gonR * (1 + P.jowl * .06);
    return [
      { y: -HT,        w: W * .32, zf: D * .36, zb: D * .40, zo: -D * .02 },
      { y: -HT * .80,  w: W * .72, zf: D * .52, zb: D * .78, zo: -D * .03 },
      { y: -HT * .52,  w: W * .92, zf: D * .62, zb: D * .96, zo: -D * .05 },
      { y: -HT * .24,  w: W,       zf: D * .70, zb: D,       zo: -D * .06 },
      { y: -9,         w: W * .98, zf: D * P.browZ, zb: D * .96, zo: -D * .05 },
      { y: 0,          w: P.cheekW, zf: D * .66, zb: D * .90, zo: -D * .04 },
      { y: 10,         w: P.cheekW * .97, zf: D * .71, zb: D * .76, zo: -D * .02 },
      { y: FL * .42,   w: U.mix(P.cheekW * .97, gonW, .55), zf: D * .60, zb: D * .48, zo: D * .01 },
      { y: FL * .66,   w: gonW, zf: D * .52, zb: D * .20, zo: D * .05 },
      { y: FL * .88,   w: U.mix(gonW, P.chinW, .62), zf: D * .48, zb: D * .05, zo: D * .10 },
      { y: FL,         w: P.chinW, zf: D * .40, zb: 0, zo: D * .145 }
    ];
  }

  function push(verts, x, y, z) {
    verts.push([x, y, z]);
    return verts.length - 1;
  }

  function quad(faces, a, b, c, d, tag) {
    faces.push([a, b, c, tag]);
    faces.push([a, c, d, tag]);
  }

  /* ---------- the geometry kit ----------
     Lofting used to be local to costume.js, which was fine while
     costume was the only thing building attached geometry. Now a model
     can contribute parts of its own and costume tables are pluggable, so
     both need the same tools and they belong with the mesh. Ring counts
     go through kOf so anything built here follows the model's own
     tessellation. */

  function addVert(bust, x, y, z) {
    bust.verts.push([x, y, z]);
    return bust.verts.length - 1;
  }
  function addFace(bust, a, b, c, tag) { bust.faces.push([a, b, c, tag]); }
  function addQuad(bust, a, b, c, d, tag) {
    addFace(bust, a, b, c, tag);
    addFace(bust, a, c, d, tag);
  }

  function kOf(bust, base) {
    var az = (bust.tess && bust.tess.az) || AZ;
    return Math.max(4, Math.round(base * az / AZ));
  }

  /* one ring of K points over [angFrom, angTo] (radians, 0 = front).
     wrap true = a full circle where the last quad joins back to the first. */
  function ring(bust, spec, K, angFrom, angTo, wrap) {
    var start = bust.verts.length;
    var k, ang, sa, ca;
    var span = angTo - angFrom;
    for (k = 0; k < K; k += 1) {
      ang = angFrom + span * (wrap ? k / K : k / (K - 1));
      sa = Math.sin(ang);
      ca = Math.cos(ang);
      bust.verts.push([
        spec.w * sa + (spec.xo || 0),
        spec.y,
        (spec.zo || 0) + (ca >= 0 ? spec.zf : (spec.zb === undefined ? spec.zf : spec.zb)) * ca
      ]);
    }
    return start;
  }

  function strip(bust, rA, rB, K, wrap, tag) {
    var a, a2;
    var last = wrap ? K : K - 1;
    for (a = 0; a < last; a += 1) {
      a2 = (a + 1) % K;
      bust.faces.push([rA + a, rA + a2, rB + a2, tag]);
      bust.faces.push([rA + a, rB + a2, rB + a, tag]);
    }
  }

  function loft(bust, specs, K, angFrom, angTo, wrap, tag) {
    var starts = [];
    var i;
    for (i = 0; i < specs.length; i += 1) {
      starts.push(ring(bust, specs[i], K, angFrom, angTo, wrap));
    }
    for (i = 0; i < specs.length - 1; i += 1) {
      strip(bust, starts[i], starts[i + 1], K, wrap, tag);
    }
    return starts;
  }

  /* A face-following open patch. Rows run top to bottom and each row
     runs left to right. Unlike a partial cylinder, this keeps facial
     hair attached to the jaw without spanning the face as a solid slab. */
  function frontPatch(bust, rows, K, tag) {
    var starts = [];
    var r, k, u, row, y, z;
    for (r = 0; r < rows.length; r += 1) {
      row = rows[r];
      starts.push(bust.verts.length);
      for (k = 0; k < K; k += 1) {
        u = K === 1 ? 0 : k / (K - 1) * 2 - 1;
        y = typeof row.y === "function" ? row.y(u) : row.y;
        z = (row.zo || 0) + row.zf * Math.sqrt(Math.max(0, 1 - u * u));
        bust.verts.push([row.x + u * row.w, y, z]);
      }
    }
    for (r = 0; r < starts.length - 1; r += 1) {
      strip(bust, starts[r], starts[r + 1], K, false, tag);
    }
    return starts;
  }

  /* a small faceted stud (gem, rivet, boss) at a head-space point */
  function stud(bust, x, y, z, r, tag) {
    var top = bust.verts.length;
    bust.verts.push([x, y - r, z + r * .4]);
    var mid = [];
    var k;
    for (k = 0; k < 4; k += 1) {
      var a = k / 4 * TAU;
      mid.push(bust.verts.length);
      bust.verts.push([x + Math.sin(a) * r, y, z + r * (.5 + Math.cos(a) * .5)]);
    }
    var bot = bust.verts.length;
    bust.verts.push([x, y + r, z + r * .4]);
    for (k = 0; k < 4; k += 1) {
      var k2 = (k + 1) % 4;
      bust.faces.push([top, mid[k2], mid[k], tag]);
      bust.faces.push([bot, mid[k], mid[k2], tag]);
    }
  }

  var KIT = {
    addVert: addVert, addFace: addFace, addQuad: addQuad,
    ring: ring, strip: strip, loft: loft,
    frontPatch: frontPatch, stud: stud, kOf: kOf
  };

  /* ---------- the standing figure ----------
     The bust ends at a shoulder slab because nothing below it was ever
     drawn. A figure replaces that slab with a real trunk, arms and legs.
     It is meshed rather than drawn flat for one reason: everything the
     engine does downstream - render modes, light rigs, contour
     classification, costume, wardrobe - consumes geometry, so a meshed
     body inherits all of it, while a 2D body would need re-drawing once
     per style. Measured, it is also cheaper than it sounds: at az 14 a
     whole figure carries fewer faces than today's bust at az 22, because
     a head that is sixty pixels tall does not need twenty-two rings. */

  /* Proportions are stated in HEAD HEIGHTS from the crown, which is how
     figure canon is actually written, rather than in multiples of the
     eye-to-chin distance. Stating them the other way is what made the
     first attempt read squashed: the shoulders landed correctly at 1.3
     heads but everything below drifted short, the knee arriving at 3.65
     where the canon puts it at 5.5, so the whole figure came out 4.6
     heads tall instead of 7.5.

     A child is not a small adult. The head is nearly adult-sized long
     before the body is, so childhood shortens the distance BELOW the
     chin and leaves the head alone, which is what takes an eight year
     old to roughly six heads rather than seven and a half. */

  var CANON = {          /* heads from the crown, adult */
    shoulder: 1.30, chest: 2.00, waist: 2.80,
    hip: 3.75, knee: 5.50, ankle: 7.30, sole: 7.50
  };

  function bodyParams(res, P, over) {
    var mt = res.maturity;
    var f = res.sexF;
    var HH = P.HT + P.FL;              /* crown to chin */
    var crown = -P.HT * 1.07;
    var k = .70 + .30 * mt;            /* how grown the body is */
    function at(heads) {
      /* the chin is one head down; only what hangs below it is childlike */
      return crown + (1 + (heads - 1) * k) * HH;
    }
    var B = {
      shoulderY: at(CANON.shoulder),
      chestY: at(CANON.chest),
      waistY: at(CANON.waist),
      hipY: at(CANON.hip),
      kneeY: at(CANON.knee),
      ankleY: at(CANON.ankle),
      soleY: at(CANON.sole),
      headHeight: HH,
      shoulder: P.shW,
      chest: P.shW * (f ? .82 : .88),
      waist: P.shW * (f ? .62 : .72),
      hip: P.shW * (f ? .86 : .76),
      depth: P.D * (f ? .52 : .58),
      armR: P.shW * (f ? .16 : .19),
      wristR: P.shW * (f ? .10 : .12),
      legR: P.shW * (f ? .28 : .30),
      ankleR: P.shW * (f ? .13 : .14),
      stance: P.shW * .32
    };
    if (over) {
      Object.keys(over).forEach(function (n) {
        if (B[n] !== undefined) B[n] = B[n] * over[n];
      });
    }
    return B;
  }

  function attachFigure(bust, res, model) {
    var P = bust.P;
    var B = bodyParams(res, P, model && model.body);
    var az = (bust.tess && bust.tess.az) || AZ;
    var kt = Math.max(6, Math.round(az * .62));    /* trunk */
    var kl = Math.max(5, Math.round(az * .42));    /* limbs read at less */
    var D = B.depth;

    /* trunk: shoulder to hip, one continuous loft so the silhouette is
       a single closed shell and the contour pass gets a clean outline */
    loft(bust, [
      { y: B.shoulderY - B.headHeight * .16, w: B.shoulder * .74, zf: D * .86, zb: D * .78, zo: 0 },
      { y: B.shoulderY, w: B.shoulder, zf: D * .94, zb: D * .86, zo: 0 },
      { y: B.chestY, w: B.chest, zf: D, zb: D * .88, zo: 0 },
      { y: B.waistY, w: B.waist, zf: D * .86, zb: D * .78, zo: 0 },
      { y: B.hipY, w: B.hip, zf: D * .92, zb: D * .84, zo: 0 }
    ], kt, 0, TAU, true, "torso");

    [-1, 1].forEach(function (s) {
      /* arm: shoulder, elbow, wrist. Hanging, slightly out from the body */
      loft(bust, [
        { y: B.shoulderY - B.headHeight * .07, w: B.armR * 1.15, zf: B.armR * 1.15,
          xo: s * (B.shoulder - B.armR * .3), zo: 0 },
        { y: B.chestY, w: B.armR, zf: B.armR, xo: s * (B.shoulder + B.armR * .1), zo: 0 },
        { y: B.waistY, w: B.armR * .88, zf: B.armR * .88,
          xo: s * (B.shoulder + B.armR * .25), zo: 0 },
        { y: B.hipY, w: B.wristR, zf: B.wristR, xo: s * (B.shoulder + B.armR * .35), zo: 0 }
      ], kl, 0, TAU, true, "limb");
      /* hand */
      loft(bust, [
        { y: B.hipY, w: B.wristR * 1.05, zf: B.wristR * 1.05,
          xo: s * (B.shoulder + B.armR * .35), zo: 0 },
        { y: B.hipY + B.headHeight * .30, w: B.wristR * .8, zf: B.wristR * 1.2,
          xo: s * (B.shoulder + B.armR * .4), zo: 0 }
      ], Math.max(4, Math.round(kl * .8)), 0, TAU, true, "skin");
      /* leg: hip, knee, ankle */
      loft(bust, [
        { y: B.hipY - B.headHeight * .10, w: B.legR * 1.1, zf: B.legR * 1.1,
          xo: s * B.stance, zo: 0 },
        { y: B.kneeY, w: B.legR * .8, zf: B.legR * .82, xo: s * B.stance, zo: 0 },
        { y: B.ankleY, w: B.ankleR, zf: B.ankleR, xo: s * B.stance * .95, zo: 0 }
      ], kl, 0, TAU, true, "limb");
      /* foot, carried forward from the ankle */
      loft(bust, [
        { y: B.ankleY, w: B.ankleR * 1.1, zf: B.ankleR * 1.2,
          xo: s * B.stance * .95, zo: D * .1 },
        { y: B.soleY, w: B.ankleR * .95, zf: B.ankleR * 2.1,
          xo: s * B.stance * .95, zo: D * .3 }
      ], Math.max(4, Math.round(kl * .8)), 0, TAU, true, "foot");
    });

    bust.body = B;
    /* anchors the costume and any equipment slot can hang from */
    bust.anchors.chest = [0, B.chestY, D];
    bust.anchors.waist = [0, B.waistY, D * .86];
    bust.anchors.hip = [0, B.hipY, D * .9];
    bust.anchors.handL = [-(B.shoulder + B.armR * .4), B.hipY + B.headHeight * .2, 0];
    bust.anchors.handR = [B.shoulder + B.armR * .4, B.hipY + B.headHeight * .2, 0];
    bust.anchors.footL = [-B.stance, B.soleY, D * .2];
    bust.anchors.footR = [B.stance, B.soleY, D * .2];
    return B;
  }

  /* build the whole bust: returns { verts, faces, anchors } */
  function buildBust(res, over, opts) {
    var figure = !!(opts && opts.figure);
    var model = resolveModel(res, over);
    var P = headParams(res, model.params || model);
    var T = tessOf(model);
    var AZn = T.az;
    /* A model may author its own cross-section profile rather than
       multiply the stock one. Scaling the same rings can only ever give
       a wider or longer version of this skull; a section table is how a
       different skull gets built at all. */
    var S0 = typeof model.sections === "function"
      ? model.sections(P, res, U) : sections(P);
    /* subdivide the key sections so the loft is smooth enough for
       per-vertex shading; tess.sub of 0 leaves the authored sections
       alone, which is what a faceted model wants */
    var S = [];
    var si, d;
    for (si = 0; si < S0.length; si += 1) {
      S.push(S0[si]);
      if (si < S0.length - 1) {
        var A0 = S0[si], B0 = S0[si + 1];
        for (d = 1; d <= T.sub; d += 1) {
          var ts = d / (T.sub + 1);
          S.push({
            y: U.mix(A0.y, B0.y, ts), w: U.mix(A0.w, B0.w, ts),
            zf: U.mix(A0.zf, B0.zf, ts), zb: U.mix(A0.zb, B0.zb, ts),
            zo: U.mix(A0.zo, B0.zo, ts)
          });
        }
      }
    }
    var verts = [], faces = [];
    var a, s, i, j;
    var asym = res.asymmetry * 6;

    /* head rings */
    var ringStart = [];
    for (s = 0; s < S.length; s += 1) {
      ringStart.push(verts.length);
      for (a = 0; a < AZn; a += 1) {
        var ang = a / AZn * TAU;             /* 0 = front center */
        var sa = Math.sin(ang), ca = Math.cos(ang);
        var x = S[s].w * sa + asym * (s / S.length);
        var z = S[s].zo + (ca >= 0 ? S[s].zf : S[s].zb) * ca;
        push(verts, x, S[s].y, z);
      }
    }
    var crown = push(verts, 0, S[0].y - P.HT * .07, S[0].zo);
    var chinTip = push(verts, asym, S[S.length - 1].y + 3.4, S[S.length - 1].zo + P.D * .3);
    for (s = 0; s < S.length - 1; s += 1) {
      for (a = 0; a < AZn; a += 1) {
        var a2 = (a + 1) % AZn;
        quad(faces, ringStart[s] + a, ringStart[s] + a2,
          ringStart[s + 1] + a2, ringStart[s + 1] + a, "skin");
      }
    }
    for (a = 0; a < AZn; a += 1) {
      faces.push([crown, ringStart[0] + (a + 1) % AZn, ringStart[0] + a, "skin"]);
      faces.push([chinTip, ringStart[S.length - 1] + a, ringStart[S.length - 1] + (a + 1) % AZn, "skin"]);
    }

    /* nose wedge: bridge to tip, wings to the cheeks */
    var faceZ = P.D * .62;
    var nRootY = -3, nTipY = P.FL * .40;
    var nb = push(verts, asym * .3, nRootY, faceZ + 1.5);
    var nt = push(verts, asym * .5, nTipY, faceZ + P.noseLen);
    var nwl = push(verts, -P.noseW + asym * .5, nTipY + 2.2, faceZ + 2);
    var nwr = push(verts, P.noseW + asym * .5, nTipY + 2.2, faceZ + 2);
    var nunder = push(verts, asym * .5, nTipY + 3.6, faceZ + P.noseLen * .55);
    faces.push([nb, nt, nwl, "nose"]);
    faces.push([nb, nwr, nt, "nose"]);
    faces.push([nt, nunder, nwl, "nose"]);
    faces.push([nt, nwr, nunder, "nose"]);

    /* ears: small fans at the sides, just behind the eye line */
    var earY = 4, earZ = -P.D * .22;
    [-1, 1].forEach(function (side) {
      var ex = side * (P.cheekW * .99);
      var e0 = push(verts, ex, earY - 7 * P.earS, earZ + 2);
      var e1 = push(verts, ex + side * 3.4 * P.earS, earY - 3 * P.earS, earZ - 2.5);
      var e2 = push(verts, ex + side * 3.8 * P.earS, earY + 4 * P.earS, earZ - 2);
      var e3 = push(verts, ex, earY + 8.5 * P.earS, earZ + 2.5);
      if (side > 0) {
        faces.push([e0, e1, e2, "ear"]);
        faces.push([e0, e2, e3, "ear"]);
      } else {
        faces.push([e0, e2, e1, "ear"]);
        faces.push([e0, e3, e2, "ear"]);
      }
    });

    /* neck: elliptical cylinder from under the jaw into the torso */
    var nTop = P.FL * .68, nBot = P.FL * 1.5;
    var nz = -P.D * .15;
    var neckRings = [];
    [nTop, P.FL * 1.05, nBot].forEach(function (yy, ri) {
      neckRings.push(verts.length);
      var r = P.neckR * (ri === 0 ? .92 : 1);
      for (a = 0; a < AZn; a += 1) {
        var ang2 = a / AZn * TAU;
        push(verts, r * Math.sin(ang2) * 1.05, yy, nz + r * Math.cos(ang2) * .9);
      }
    });
    for (s = 0; s < neckRings.length - 1; s += 1) {
      for (a = 0; a < AZn; a += 1) {
        var b2 = (a + 1) % AZn;
        quad(faces, neckRings[s] + a, neckRings[s] + b2,
          neckRings[s + 1] + b2, neckRings[s + 1] + a, "neck");
      }
    }

    /* shoulders: a soft slab, front and top faces only. A figure
       replaces this outright, so it is only built for a bust. */
    if (!figure) {
      var shTopY = P.FL * 1.22, shTipY = P.FL * 1.5, shBotY = P.FL * 2.6;
      var shZ = -P.D * .1, shD = P.D * .55;
      var sTL = push(verts, -P.neckR * 1.5, shTopY, shZ + shD * .5);
      var sTR = push(verts, P.neckR * 1.5, shTopY, shZ + shD * .5);
      var sL = push(verts, -P.shW, shTipY, shZ + shD * .2);
      var sR = push(verts, P.shW, shTipY, shZ + shD * .2);
      var sBL = push(verts, -P.shW, shBotY, shZ + shD * .6);
      var sBR = push(verts, P.shW, shBotY, shZ + shD * .6);
      var sBTL = push(verts, -P.neckR * 1.6, shBotY, shZ + shD);
      var sBTR = push(verts, P.neckR * 1.6, shBotY, shZ + shD);
      var sTLb = push(verts, -P.neckR * 1.5, shTopY, shZ - shD * .5);
      var sTRb = push(verts, P.neckR * 1.5, shTopY, shZ - shD * .5);
      var sLb = push(verts, -P.shW, shTipY, shZ - shD * .4);
      var sRb = push(verts, P.shW, shTipY, shZ - shD * .4);
      /* front slopes */
      faces.push([sTL, sBL, sL, "torso"]);
      faces.push([sTL, sBTL, sBL, "torso"]);
      faces.push([sTR, sR, sBR, "torso"]);
      faces.push([sTR, sBR, sBTR, "torso"]);
      faces.push([sTL, sTR, sBTR, "torso"]);
      faces.push([sTL, sBTR, sBTL, "torso"]);
      /* top planes */
      faces.push([sTLb, sTL, sL, "torsoTop"]);
      faces.push([sTLb, sL, sLb, "torsoTop"]);
      faces.push([sTRb, sR, sTR, "torsoTop"]);
      faces.push([sTRb, sRb, sR, "torsoTop"]);

    }

    /* feature anchors in head space */
    var eyeSpan = P.cheekW * .52 * res.eyeSpacing;
    var anchors = {
      eyeL: [-eyeSpan, 0, P.D * .56],
      eyeR: [eyeSpan, 0, P.D * .56],
      eyeLout: [-eyeSpan - 7, 0, P.D * .48],
      eyeRout: [eyeSpan + 7, 0, P.D * .48],
      mouthL: [asym * .4 - (6.5 + 3.5 * res.mouthW), P.FL * .64, P.D * .5],
      mouthR: [asym * .4 + (6.5 + 3.5 * res.mouthW), P.FL * .64, P.D * .5],
      browL: [-eyeSpan * 1.02, -8.5, P.D * P.browZ * .98],
      browR: [eyeSpan * 1.02, -8.5, P.D * P.browZ * .98],
      noseTip: [asym * .5, nTipY, faceZ + P.noseLen],
      noseBase: [asym * .5, nTipY + 4, faceZ + 2.5],
      mouth: [asym * .4, P.FL * .64, P.D * .56],
      chin: [asym, P.FL, P.D * .54],
      earL: [-P.cheekW * 1.02, earY, earZ],
      earR: [P.cheekW * 1.02, earY, earZ],
      throat: [0, P.FL * 1.28, -P.D * .15 + P.neckR * .95],
      crown: [0, -P.HT, 0],
      hairline: [0, -P.HT * .5, P.D * .68]
    };
    /* A landmark is more than a projected point. Its local tangent, up
       direction and surface normal let a 2D construction rotate,
       foreshorten and disappear with the generated head. */
    function landmark(position, normal) {
      return {
        position: position,
        tangent: [1, 0, 0],
        up: [0, -1, 0],
        normal: norm(normal || [0, 0, 1])
      };
    }
    var landmarks = {
      eyeL: landmark(anchors.eyeL, [-.28, -.04, 1]),
      eyeR: landmark(anchors.eyeR, [.28, -.04, 1]),
      browL: landmark(anchors.browL, [-.24, -.12, 1]),
      browR: landmark(anchors.browR, [.24, -.12, 1]),
      nose: landmark(anchors.noseBase, [0, 0, 1]),
      noseTip: landmark(anchors.noseTip, [0, .08, 1]),
      mouth: landmark(anchors.mouth, [0, .08, 1]),
      chin: landmark(anchors.chin, [0, .2, 1])
    };
    var bust = {
      verts: verts, faces: faces, anchors: anchors, landmarks: landmarks,
      P: P, tess: T
    };
    /* parts() adds structure the stock bust has no notion of - a brow
       ridge, a muzzle, horns - using the same kit costume builds with.
       deform() then moves what exists. Between the two, a model is no
       longer limited to restating the template's proportions. */
    if (figure) attachFigure(bust, res, model);
    if (typeof model.parts === "function") model.parts(bust, P, res, U, KIT);
    if (typeof model.deform === "function") model.deform(bust, res, U);
    return bust;
  }

  /* ---------- pose and projection ----------
     pose: { yaw, pitch, tilt, cx, cy, scale, persp } - yaw/pitch/tilt in
     radians. Projects into 256 x 288 canvas space. */
  function poseProject(bust, pose) {
    pose = pose || {};
    var yaw = pose.yaw || 0, pitch = pose.pitch || 0, tilt = pose.tilt || 0;
    var cx = pose.cx === undefined ? 128 : pose.cx;
    var cy = pose.cy === undefined ? 118 : pose.cy;
    var sc = pose.scale === undefined ? 1 : pose.scale;
    var persp = pose.persp === undefined ? 340 : pose.persp;
    var cy1 = Math.cos(yaw), sy1 = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    var out = new Array(bust.verts.length);
    var i, vx, vy, vz, x1, z1, y2, z2, x3, y3, k;
    for (i = 0; i < bust.verts.length; i += 1) {
      vx = bust.verts[i][0]; vy = bust.verts[i][1]; vz = bust.verts[i][2];
      x1 = vx * cy1 + vz * sy1;
      z1 = -vx * sy1 + vz * cy1;
      y2 = vy * cp - z1 * sp;
      z2 = vy * sp + z1 * cp;
      x3 = x1 * ct - y2 * st;
      y3 = x1 * st + y2 * ct;
      k = sc * persp / (persp - z2);
      out[i] = [cx + x3 * k, cy + y3 * k, z2];
    }
    function pt3(p) {
      var x1b = p[0] * cy1 + p[2] * sy1;
      var z1b = -p[0] * sy1 + p[2] * cy1;
      var y2b = p[1] * cp - z1b * sp;
      var z2b = p[1] * sp + z1b * cp;
      var x3b = x1b * ct - y2b * st;
      var y3b = x1b * st + y2b * ct;
      var kb = sc * persp / (persp - z2b);
      return [cx + x3b * kb, cy + y3b * kb, z2b];
    }
    function rot3(p) {
      var x1b = p[0] * cy1 + p[2] * sy1;
      var z1b = -p[0] * sy1 + p[2] * cy1;
      var y2b = p[1] * cp - z1b * sp;
      var z2b = p[1] * sp + z1b * cp;
      return [
        x1b * ct - y2b * st,
        x1b * st + y2b * ct,
        z2b
      ];
    }
    var anchors = {};
    Object.keys(bust.anchors).forEach(function (key) {
      anchors[key] = pt3(bust.anchors[key]);
    });
    var landmarks = {};
    Object.keys(bust.landmarks || {}).forEach(function (key) {
      var source = bust.landmarks[key];
      var point = pt3(source.position);
      var tangentEnd = pt3([
        source.position[0] + source.tangent[0],
        source.position[1] + source.tangent[1],
        source.position[2] + source.tangent[2]
      ]);
      var upEnd = pt3([
        source.position[0] + source.up[0],
        source.position[1] + source.up[1],
        source.position[2] + source.up[2]
      ]);
      var tx = tangentEnd[0] - point[0], ty = tangentEnd[1] - point[1];
      var ux = upEnd[0] - point[0], uy = upEnd[1] - point[1];
      var tl = Math.sqrt(tx * tx + ty * ty) || 1;
      var ul = Math.sqrt(ux * ux + uy * uy) || 1;
      var normal = norm(rot3(source.normal));
      landmarks[key] = {
        x: point[0], y: point[1], depth: point[2],
        tangent: [tx / tl, ty / tl],
        up: [ux / ul, uy / ul],
        normal: normal,
        angle: Math.atan2(ty, tx),
        scaleX: tl,
        scaleY: ul,
        visibility: U.clamp((normal[2] + .08) / .32, 0, 1),
        foreshortening: U.clamp(tl / Math.max(.0001, sc), 0, 1.2)
      };
    });
    return { pts: out, anchors: anchors, landmarks: landmarks };
  }

  /* ---------- debug flat-shade renderer ---------- */
  var TAG_COLOR = {
    skin: null, nose: null, ear: null,
    neck: null, torso: null, torsoTop: null
  };

  function renderDebug(canvas, spec, opts) {
    opts = opts || {};
    var width = opts.width || 256;
    var height = Math.round(width * 9 / 8);
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d", { alpha: false });
    var res = YO.resolveSpec(spec);
    var bust = buildBust(res, opts.params);
    var proj = poseProject(bust, {
      yaw: opts.yaw || 0, pitch: opts.pitch || 0, tilt: opts.tilt || 0
    });
    var s = width / 256;
    ctx.save();
    ctx.scale(s, height / 288);
    ctx.fillStyle = "#23262a";
    ctx.fillRect(0, 0, 256, 288);
    var colors = {
      skin: res.skin.base, nose: U.shade(res.skin.base, .02, 0),
      ear: U.shade(res.skin.base, -.02, 0),
      neck: U.shade(res.skin.base, -.01, 0),
      torso: res.cloth.base, torsoTop: U.shade(res.cloth.base, .06, 0)
    };
    var L = norm(opts.light || [-.5 * res.sx, -.5, .78]);
    var pts = proj.pts;
    /* cull, light, sort, draw */
    var order = [];
    var f, i;
    for (i = 0; i < bust.faces.length; i += 1) {
      f = bust.faces[i];
      var A = pts[f[0]], B = pts[f[1]], C = pts[f[2]];
      var ux = B[0] - A[0], uy = B[1] - A[1];
      var wx = C[0] - A[0], wy = C[1] - A[1];
      if (ux * wy - uy * wx <= 0) continue;      /* backface */
      order.push([i, (A[2] + B[2] + C[2]) / 3]);
    }
    order.sort(function (p, q) { return p[1] - q[1]; });
    for (i = 0; i < order.length; i += 1) {
      f = bust.faces[order[i][0]];
      /* normals in posed space so the light stays in the world */
      var n = faceNormal(pts[f[0]], pts[f[1]], pts[f[2]]);
      var ndl = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      var lum = .42 + .58 * ndl;
      var base = colors[f[3]] || [200, 60, 200];
      var col = [base[0] * lum, base[1] * lum, base[2] * lum].map(function (cv) {
        return Math.max(0, Math.min(255, Math.round(cv)));
      });
      var A2 = pts[f[0]], B2 = pts[f[1]], C2 = pts[f[2]];
      ctx.fillStyle = "rgb(" + col[0] + "," + col[1] + "," + col[2] + ")";
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = opts.wire ? .3 : .8;
      ctx.beginPath();
      ctx.moveTo(A2[0], A2[1]);
      ctx.lineTo(B2[0], B2[1]);
      ctx.lineTo(C2[0], C2[1]);
      ctx.closePath();
      ctx.fill();
      if (opts.wire) {
        ctx.strokeStyle = "rgba(0,0,0,.25)";
      }
      ctx.stroke();
    }
    if (opts.anchors) {
      Object.keys(proj.anchors).forEach(function (key) {
        var p = proj.anchors[key];
        ctx.fillStyle = "rgba(80,220,120,.95)";
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.6, 0, TAU);
        ctx.fill();
      });
    }
    ctx.restore();
    return bust;
  }

  function faceNormal(a, b, c) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    return norm([uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]);
  }
  function norm(v3) {
    var l = Math.sqrt(v3[0] * v3[0] + v3[1] * v3[1] + v3[2] * v3[2]) || 1;
    return [v3[0] / l, v3[1] / l, v3[2] / l];
  }

  YO.mesh = {
    headParams: headParams,
    buildBust: buildBust,
    poseProject: poseProject,
    bodyParams: bodyParams,
    attachFigure: attachFigure,
    renderDebug: renderDebug,
    sections: sections,        /* the stock profile, for models that vary it */
    kit: KIT
  };
  YO.registerMaterial("torso", { layer: 10, family: "cloth", outline: true });
  YO.registerMaterial("torsoTop", { layer: 12, family: "cloth", outline: true });
  YO.registerMaterial("neck", { layer: 20, family: "skin", outline: false });
  YO.registerMaterial("ear", { layer: 30, family: "skin", outline: true });
  YO.registerMaterial("skin", { layer: 40, family: "skin", outline: true });
  YO.registerMaterial("nose", { layer: 45, family: "skin", outline: true });
  YO.registerMaterial("limb", { layer: 11, family: "cloth", outline: true });
  YO.registerMaterial("foot", { layer: 13, family: "cloth", outline: true });
  YO.registerModel("realistic", {});
  YO.registerModel("brute", {
    params: {
      W: 1.14, FL: 1.12, gonR: 1.2, chinW: 1.3,
      neckR: 1.55, shW: 1.28, noseW: 1.3, browZ: 1.06
    }
  });
  YO.registerModel("graphic", {
    params: {
      W: 1.04, D: .94, HT: 1.03, FL: .96, cheekW: 1.03,
      gonR: .96, chinW: .92, noseLen: .9, neckR: .94
    }
  });
  /* Topology as a model choice, which is what tess is for: the same
     seeded anatomy on a deliberately coarse hull. The authored cross
     sections are left unsubdivided and the rings drop to 8 steps, so
     the facets are the look rather than an artifact to be smoothed
     away. Costume geometry follows automatically. */
  YO.registerModel("lowpoly", {
    params: { D: .96, chinW: 1.06, noseLen: 1.08, noseW: 1.05 },
    tess: { az: 8, sub: 0 }
  });
})();
