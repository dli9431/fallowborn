/* Court Illustration v2 reference painter.
   The generated mesh remains the hidden scaffold for anatomy, pose,
   projected landmarks, costume selection and material colors. No mesh
   face, edge or facet is drawn. The final portrait is constructed from
   smooth Canvas 2D silhouettes and deliberate illustration marks. */
(function () {
  "use strict";

  var YO = window.YOLO;
  var P = YO.paint;
  var U = YO.util;
  var TAU = Math.PI * 2;
  var INK = [48, 35, 31];
  var GOLD = [207, 165, 74];
  var GOLD_L = [246, 216, 132];
  var STEEL = [126, 142, 151];
  var STEEL_L = [206, 215, 216];
  var LINEN = [226, 218, 199];

  /* How small the head is landing, in output pixels, and how hard the
     drawing has to work to stay readable there. Both are set once per
     render from illustrated2d. Renders are synchronous, so this cannot
     leak between portraits - the same reasoning core.js states for
     STATE.

     BOLD is 1 for a portrait-sized head and rises toward 2 for a full
     figure on a small card, where the head lands around 37 px. FINE is
     its inverse gate: at that size the marks that carry a face are the
     eyes, brows, nose base and mouth, and everything else - freckles,
     crow's feet, brow grain, single-hair work - is noise competing with
     them for the same three pixels. */
  var DT = 1, BOLD = 1;
  function fine() { return BOLD < 1.35; }

  /* A stroke narrower than a pixel does not get thinner, it gets fainter,
     so design-unit line widths quietly dissolved into a tint wherever the
     drawing was scaled down. Every stroke keeps at least MINPX of real
     ink. */
  var MINPX = .85;
  function line(ctx, width, color, alpha) {
    P.ink(ctx, Math.max(width, MINPX / DT), color || INK,
      alpha === undefined ? .9 : alpha);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function fillStroke(ctx, fill, stroke, width, alpha) {
    ctx.fillStyle = U.css(fill);
    ctx.fill();
    line(ctx, width || 1.6, stroke || INK, alpha);
    ctx.stroke();
  }

  function frame(g, res) {
    var A = g.anchors;
    var eyeY = (A.eyeL[1] + A.eyeR[1]) * .5;
    var cx = (A.eyeL[0] + A.eyeR[0]) * .5;
    /* The face has a minimum half-width so a degenerate projection still
       gives something drawable. It used to be a flat 24 design units,
       which is only a sane number at portrait framing. Measured against
       the mesh's own crown-to-chin span: in a portrait 24 is .27 of the
       head and sits just under the ear span of .30 to .35, so it almost
       never bound. At figure framing the head halves and the same 24
       becomes .55 to .61 - far above the ear span - so it bound on every
       character and forced a face 1.7x too wide. That inflated upperFace
       and lowerFace with it, and the head came out 1.41x larger than the
       camera asked for, which is why the drawn head never shrank in step
       (bodyFrame's own comment noticed the symptom). Stated against the
       head, the floor is the same fraction at any framing. */
    var rawH = Math.max(12, A.chin[1] - A.crown[1]);
    var minHalf = rawH * .27;
    var left = Math.min(A.earL[0] + 1, cx - minHalf);
    var right = Math.max(A.earR[0] - 1, cx + minHalf);
    var widthT = U.clamp((res.faceWidth - .86) / .28, 0, 1);
    /* The mesh anchors already contain faceWidth. Only a light 2D accent
       belongs here or narrow and broad seeds are scaled twice. */
    var widthGain = .92 + widthT * .16;
    left = cx - (cx - left) * widthGain;
    right = cx + (right - cx) * widthGain;
    var halfL = cx - left;
    var halfR = right - cx;
    var faceW = right - left;
    /* The head unit: 1 at a portrait-sized head, about .48 at figure
       framing. Everything a costume or an ear states as a flat number is
       stated in these instead. A crown band that is 5% of a portrait
       head was coming out 8% of a figure head, and every hat ate the
       forehead it should have sat above. */
    var u = U.clamp(rawH / 90, .4, 1.2);
    var rawTop = A.crown[1] - 3 * u;
    var upperMin = faceW * (res.child ? .56 : .58);
    var upperMax = faceW * (res.child ? .68 : .72);
    var upperFace = U.clamp(eyeY - rawTop, upperMin, upperMax);
    var top = eyeY - upperFace;
    var hairY = U.clamp(A.hairline[1], top + upperFace * .47, eyeY - 9 * u);
    var chinX = U.clamp(A.chin[0], cx - faceW * .07, cx + faceW * .07);
    var chinT = U.clamp((res.chin - .75) / .55, 0, 1);
    var rawChinY = A.chin[1] + 2 * u + (chinT - .5) * 6 * u;
    if (res.child) rawChinY = eyeY + (rawChinY - eyeY) * (.82 + res.maturity * .18);
    /* Legal DNA fields are independent. Bound their combined silhouette so
       a narrow cranium, soft jaw and long chin cannot collapse into a
       pinched mask. The range still leaves visibly long and short faces. */
    var lowerMin = faceW * (res.child ? .56 : .64);
    var lowerMax = faceW * (res.child ? .72 : .84);
    var chinY = U.clamp(rawChinY, eyeY + lowerMin, eyeY + lowerMax);
    var jawT = U.clamp((res.jaw - .7) / .6 + res.elder * .12 - (res.sexF ? .06 : 0), 0, 1);
    var cheekT = U.clamp(res.cheek, 0, 1);
    var lowerFace = chinY - eyeY;
    var jawY = U.clamp(eyeY + lowerFace * (.62 + chinT * .08),
      eyeY + lowerFace * .58, chinY - 7 * u);
    var jawRatio = .54 + jawT * .3;
    var chinSpan = U.clamp(faceW * (.15 + jawT * .075), 7.5 * u, 14.5 * u);
    var chinBottom = U.clamp(chinY + (2 + chinT * 3) * u,
      eyeY + lowerMin + 2 * u, eyeY + lowerMax + 4 * u);
    var headH = chinBottom - top;
    var neckX = U.clamp(A.throat[0], chinX - faceW * .055, chinX + faceW * .055);
    /* The neck is stated against the head, the way the body widths are,
       and it carries the seeded build. Taking it from the mesh radius gave
       every character of one sex the same neck, because P.neckR knows only
       sex and maturity: Rurik at build .85 and Aldous at build 1.00 both
       came out 12.60, and the pixel floor under the top width then flattened
       most seeds to a constant 6.0, so a child and a grown soldier wore the
       same throat. A mesh radius is also in mesh pixels while the head is
       drawn at the camera's scale, so that one neck read 0.39 of the face
       in a bust and 0.51 in a figure. Canon in face widths: a small child
       about a third of the face across, a slight woman under a half, a
       heavy soldier a little under two thirds. */
    var neckGrow = .62 + .38 * res.maturity;   /* a child's neck is a slip */
    var neckBuild = .80 + res.build * .40;
    var neckBaseW = faceW * (res.sexF ? .215 : .245) * neckGrow * neckBuild *
      (1 - res.elder * .08);
    /* It narrows toward the jaw, but the taper is stated against the base,
       not against the chin. Capping it on the chin span was what kept the
       difference hidden: the base is under the collar in a bust and under
       the gown in a figure, so the only width a viewer ever sees is this
       one, and pinning it to the chin handed the child and the soldier the
       same throat again. The jaw is the honest ceiling, and a heavy neck
       is allowed to show past it. */
    var jawHalf = (halfL + halfR) * .5 * jawRatio;
    var neckTopW = U.clamp(Math.min(neckBaseW * .86, jawHalf * .84),
      neckBaseW * .66, neckBaseW);
    /* Length grows with the child too, and a thick neck reads shorter. The
       old form stepped at the age-13 child flag and then hit its pixel floor
       on every figure render, which left it a constant. */
    var neckVisible = U.clamp(headH * (.115 + .062 * res.maturity) *
      (res.sexF ? 1.06 : 1) * (1.06 - res.build * .12), 5.5 * u, 26);
    var collarY = chinBottom + neckVisible;
    return {
      A: A,
      P: g.bust.P,
      u: u,
      cx: cx,
      crownX: U.clamp(A.crown[0], cx - faceW * .04, cx + faceW * .04),
      top: top,
      left: left,
      right: right,
      halfL: halfL,
      halfR: halfR,
      eyeY: eyeY,
      upperFace: upperFace,
      lowerFace: lowerFace,
      hairY: hairY,
      mouthX: A.mouth[0],
      mouthY: A.mouth[1],
      chinX: chinX,
      chinY: chinY,
      chinBottom: chinBottom,
      chinSpan: chinSpan,
      jawT: jawT,
      chinT: chinT,
      cheekT: cheekT,
      widthT: widthT,
      jawY: jawY,
      jawL: chinX - halfL * jawRatio,
      jawR: chinX + halfR * jawRatio,
      cheekL: left - cheekT * 2.5 * u,
      cheekR: right + cheekT * 2.5 * u,
      throatX: neckX,
      throatY: collarY + 14 * u,
      neckTop: chinBottom - 4 * u,
      neckBottom: collarY + 5 * u,
      neckTopW: neckTopW,
      neckBaseW: neckBaseW,
      collarY: collarY,
      torsoY: collarY + 14,
      shoulderHalf: (res.child ? 31 : 36) + g.bust.P.shW * .5
    };
  }

  function headPath(ctx, f) {
    ctx.beginPath();
    ctx.moveTo(f.crownX, f.top);
    ctx.bezierCurveTo(f.crownX + f.halfR * .72, f.top - 1,
      f.right + 1, f.eyeY - f.upperFace * .55, f.right, f.eyeY - 5);
    ctx.bezierCurveTo(f.cheekR + 1, f.eyeY + f.lowerFace * .25,
      f.jawR + 3 - f.jawT * 2, f.jawY - 5, f.jawR, f.jawY + 2);
    ctx.bezierCurveTo(f.jawR - (1 + f.jawT * 2), f.chinY - 5,
      f.chinX + f.chinSpan, f.chinBottom, f.chinX, f.chinBottom);
    ctx.bezierCurveTo(f.chinX - f.chinSpan, f.chinBottom,
      f.jawL + (1 + f.jawT * 2), f.chinY - 5, f.jawL, f.jawY + 2);
    ctx.bezierCurveTo(f.jawL - 3 + f.jawT * 2, f.jawY - 5,
      f.cheekL - 1, f.eyeY + f.lowerFace * .25, f.left, f.eyeY - 5);
    ctx.bezierCurveTo(f.left - 1, f.eyeY - f.upperFace * .55,
      f.crownX - f.halfL * .72, f.top - 1, f.crownX, f.top);
    ctx.closePath();
  }

  /* The hair cap, also in head units. The temple line in particular: a
     flat "eyeY - 9" is a ninth of a portrait skull and a fifth of a
     figure's, so the hair swallowed the temples at figure framing. */
  function capPath(ctx, f, style) {
    var u = f.u;
    var temple = f.eyeY - 9 * u;
    var fringe = style === "crop" ? f.hairY - 2 * u : f.hairY + 3 * u;
    var part = style === "sidePart" ? f.cx + f.halfR * .28 : f.cx;
    ctx.beginPath();
    ctx.moveTo(f.left - 1 * u, temple);
    ctx.bezierCurveTo(f.left - 3 * u, f.top + 18 * u,
      f.crownX - f.halfL * .55, f.top - 5 * u, f.crownX, f.top - 5 * u);
    ctx.bezierCurveTo(f.crownX + f.halfR * .55, f.top - 5 * u,
      f.right + 3 * u, f.top + 18 * u, f.right + 1 * u, temple);
    if (style === "sidePart") {
      ctx.quadraticCurveTo(f.right - 5 * u, fringe + 1 * u, part + 3 * u, fringe - 5 * u);
      ctx.quadraticCurveTo(f.cx - 4 * u, fringe + 8 * u, f.left + 1 * u, temple);
    } else if (style === "braids") {
      ctx.quadraticCurveTo(f.right - 7 * u, f.hairY + 2 * u,
        f.cx + 2 * u, f.hairY - 4 * u);
      ctx.quadraticCurveTo(f.cx - 2 * u, f.hairY - 4 * u,
        f.left + 7 * u, f.hairY + 2 * u);
      ctx.quadraticCurveTo(f.left + 2 * u, f.hairY + 1 * u, f.left - 1 * u, temple);
    } else {
      ctx.quadraticCurveTo(f.right - 8 * u, fringe + 4 * u, f.cx + 11 * u, fringe - 1 * u);
      ctx.quadraticCurveTo(f.cx, fringe + 7 * u, f.cx - 13 * u, fringe - 1 * u);
      ctx.quadraticCurveTo(f.left + 7 * u, fringe + 4 * u, f.left - 1 * u, temple);
    }
    ctx.closePath();
  }

  function drawTorso(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var yTop = f.torsoY;
    var yBot = 270;
    var nx = f.throatX;
    var nw = f.neckBaseW + 4;
    var shoulderHalf = f.shoulderHalf;
    var outerL = nx - shoulderHalf;
    var outerR = nx + shoulderHalf;
    var bottomL = outerL - 8;
    var bottomR = outerR + 8;
    ctx.beginPath();
    ctx.moveTo(nx - nw, yTop - 14);
    ctx.bezierCurveTo(nx - 32, yTop - 5, outerL + 16, yTop + 3, outerL, yTop + 18);
    ctx.lineTo(bottomL, yBot);
    ctx.lineTo(bottomR, yBot);
    ctx.lineTo(outerR, yTop + 18);
    ctx.bezierCurveTo(outerR - 16, yTop + 3, nx + 32, yTop - 5, nx + nw, yTop - 14);
    ctx.closePath();
    fillStroke(ctx, res.cloth.base, res.cloth.deep, 2);

    ctx.save();
    ctx.globalAlpha = .55;
    ctx.fillStyle = U.css(res.cloth.dark);
    ctx.beginPath();
    if (res.lx > 0) {
      ctx.moveTo(bottomL, yBot);
      ctx.lineTo(outerL, yTop + 18);
      ctx.quadraticCurveTo(outerL + 28, yTop - 2, nx - 2, yTop - 8);
      ctx.lineTo(nx + 8, yBot);
    } else {
      ctx.moveTo(bottomR, yBot);
      ctx.lineTo(outerR, yTop + 18);
      ctx.quadraticCurveTo(outerR - 28, yTop - 2, nx + 2, yTop - 8);
      ctx.lineTo(nx - 8, yBot);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    line(ctx, 1.2, res.cloth.light, .5);
    ctx.beginPath();
    ctx.moveTo(nx - nw, yTop - 13);
    ctx.quadraticCurveTo(nx, yTop + 10, nx + nw, yTop - 13);
    ctx.stroke();

    /* Clothing carries station and profession instead of ending as a
       plain shoulder block. These are 2D construction marks, not mesh
       seams. */
    if (res.tier >= 6) {
      var fur = res.cloth.fur || [224, 216, 198];
      ctx.fillStyle = U.css(fur);
      ctx.beginPath();
      ctx.moveTo(nx - 31, yTop - 5);
      ctx.quadraticCurveTo(nx, yTop + 14, nx + 31, yTop - 5);
      ctx.lineTo(nx + 24, yTop + 10);
      ctx.quadraticCurveTo(nx, yTop + 25, nx - 24, yTop + 10);
      ctx.closePath();
      fillStroke(ctx, fur, U.shade(fur, -.28, 0), 1.2);
      line(ctx, .7, U.shade(fur, -.35, 0), .35);
      var fi;
      for (fi = -4; fi <= 4; fi += 1) {
        ctx.beginPath();
        ctx.arc(nx + fi * 5.5, yTop + 7 + Math.abs(fi) * .5, 2.6, .15, Math.PI * .9);
        ctx.stroke();
      }
    } else if (res.profession === "priest" || res.profession === "monk") {
      ctx.fillStyle = U.css(res.cloth.dark);
      ctx.beginPath();
      ctx.moveTo(nx - 22, yTop - 8);
      ctx.quadraticCurveTo(nx, yTop + 18, nx + 22, yTop - 8);
      ctx.lineTo(nx + 14, yTop + 12);
      ctx.quadraticCurveTo(nx, yTop + 24, nx - 14, yTop + 12);
      ctx.closePath();
      fillStroke(ctx, res.cloth.dark, res.cloth.deep, 1.3);
    } else {
      ctx.fillStyle = U.css(res.cloth.dark);
      ctx.beginPath();
      ctx.moveTo(nx - 13, yTop - 8);
      ctx.lineTo(nx, yTop + 13);
      ctx.lineTo(nx + 13, yTop - 8);
      ctx.quadraticCurveTo(nx, yTop, nx - 13, yTop - 8);
      ctx.closePath();
      fillStroke(ctx, res.cloth.dark, res.cloth.deep, 1.2);
    }

    if (res.profession === "soldier") {
      [-1, 1].forEach(function (side) {
        var sx = nx + side * shoulderHalf * .72;
        ctx.fillStyle = U.css(STEEL);
        ctx.beginPath();
        ctx.moveTo(sx - side * 17, yTop + 1);
        ctx.quadraticCurveTo(sx, yTop - 11, sx + side * 20, yTop + 5);
        ctx.lineTo(sx + side * 13, yTop + 18);
        ctx.quadraticCurveTo(sx, yTop + 10, sx - side * 17, yTop + 1);
        ctx.closePath();
        fillStroke(ctx, STEEL, [54, 61, 67], 1.3);
        P.gemDot(ctx, sx + side * 4, yTop + 5, 1.8, GOLD);
      });
    }

    if (res.tier >= 3) {
      line(ctx, 1.5, res.cloth.trim || GOLD, .75);
      ctx.beginPath();
      ctx.moveTo(nx, yTop + 15);
      ctx.lineTo(nx, yBot - 4);
      ctx.stroke();
      if (res.tier >= 5) {
        var ti;
        for (ti = yTop + 24; ti < yBot - 8; ti += 12) {
          P.gemDot(ctx, nx, ti, 1.25, ti % 24 ? GOLD : GOLD_L);
        }
      }
    }

    line(ctx, .75, res.cloth.light, .2);
    ctx.beginPath();
    ctx.moveTo(outerL + 7, yTop + 26);
    ctx.quadraticCurveTo(nx, yTop + 38, outerR - 7, yTop + 26);
    ctx.moveTo(outerL + 2, yTop + 42);
    ctx.quadraticCurveTo(nx, yTop + 54, outerR - 2, yTop + 42);
    ctx.stroke();
  }


  /* ---------- the standing figure ----------
     Built the way the head is: the mesh places things, then smooth 2D is
     drawn over it. Proportions come off the VISIBLE head height, skull
     top to under the chin, rather than off the mesh's eye-to-chin,
     because that is the head a viewer measures against. Using the other
     one is what made the first figure read top-heavy even while the
     numbers insisted it was 7.5 heads. */

  function bodyFrame(f, res, avail, tall) {
    var headH = f.chinBottom - f.top;
    /* Three things set how long the body is.
       `tall` is the style's declared adult height in HEADS. Life-drawing
       canon is 7.5, and that is still the default, but a figure card is
       a picture of a person's face as much as of their clothes: at 7.5
       the head is a seventh of the drawing and lands around 34 px on the
       reference figure card, which is not enough to carry a face. Shortening the
       figure in heads and letting the camera come in buys the head that
       size back without distorting anything - every width and length
       below the chin is already stated in head units, so the whole body
       stays proportional to itself and only its RATIO to the head moves.
       Childhood then shortens what hangs below the chin, because a head
       is nearly adult-sized long before the body is.
       Then the frame gets a veto, for a head too large to fit its own
       body into the card. */
    var headH2 = headH;
    /* The childhood factor, pulled out because growing up is not only a
       vertical fact. The length below the chin used it and the hands did
       not, so a ten-year-old stood on a body a fifth shorter with a grown
       adult's hands still hanging off the ends of it: the hand kept its
       .64 of a head while the arm it hangs from gave up a fifth of its
       own, which is exactly the mitten read. Hands and feet are the last
       measurements to catch up to the head anyway - against their own
       head a small child's hand is about three quarters of the hand it
       will be - so they take the factor whole. */
    var youth = .70 + .30 * res.maturity;
    var k = youth * ((tall || 7.5) - 1) / 6.5;
    if (avail) {
      /* leave room above the skull for hair, a crown or a veil */
      var room = avail - headH2 * .52;
      var limit = ((room / headH2) - 1) / 6.5;
      if (limit > 0 && limit < k) k = limit;
    }
    function at(heads) { return f.top + (1 + (heads - 1) * k) * headH; }
    var fem = res.sexF;
    /* the seeded build, as multipliers around 1 */
    var bw = .86 + res.build * .30;          /* limb and torso thickness */
    var tw = .92 + res.build * .17;          /* the torso carries less of it */
    var leg = .94 + res.stature * .12;       /* leg against torso length */
    var sh = headH * (fem ? .67 : .74) * (.97 + res.build * .06);
    var kind = res.cloth.kind;
    var floor = kind === "habit" || kind === "cassock" ||
      kind === "court" || kind === "royal";
    return {
      cx: f.throatX, headH: headH, floorLength: floor, kind: kind, fem: fem,
      shoulderY: at(1.30), chestY: at(2.00), waistY: at(2.82),
      hipY: at(3.75), kneeY: at(3.75 + (5.50 - 3.75) * leg),
      ankleY: at(7.24), soleY: at(7.50),
      /* Widths are stated against the HEAD, not against the shoulder.
         Deriving them all from shoulder width was the mistake: widening
         the torso to fill the frame dragged nothing else with it, so the
         body came out 1.76 heads across while the thigh sat at 0.55 and
         the calf at 0.37, which is exactly the wide-body, stick-legs
         read. Canon in head heights: shoulders 1.3 to 1.55 across, thigh
         0.62 to 0.78, calf 0.42 to 0.52, upper arm 0.40 to 0.48. */
      shoulderHalf: sh,
      chestHalf: headH * (fem ? .57 : .62) * tw,
      waistHalf: headH * (fem ? .46 : .52) * (.88 + res.build * .26),
      hipHalf: headH * (fem ? .60 : .56) * tw,
      armR: headH * (fem ? .20 : .225) * bw,
      /* The wrist takes half of youth, not all of it. It is where the
         cuff sits, and a sleeve narrowed the full amount stopped reading
         as cloth and started reading as a cord tied round the arm; half
         keeps the cuff a cuff while still letting the small hand come out
         of a sleeve that is close to its size. */
      wristR: headH * (fem ? .12 : .135) * (.92 + res.build * .16) *
        (.5 + youth * .5),
      legTop: headH * (fem ? .33 : .35) * bw,
      legKnee: headH * (fem ? .22 : .235) * bw,
      legAnkle: headH * (fem ? .145 : .155) * (.92 + res.build * .16),
      handLen: headH * (fem ? .60 : .64) * youth,
      handW: headH * (fem ? .135 : .15) * youth,
      shoeW: headH * (fem ? .17 : .185),
      shoeH: headH * (fem ? .26 : .29),
      stance: headH * (fem ? .32 : .34),
      hemY: floor ? at(7.15) : at(kind === "doublet" ? 3.15 : 4.45)
    };
  }

  function legPath(ctx, b, side) {
    var xh = b.cx + side * b.stance, xa = b.cx + side * b.stance * .92;
    var tk = b.hipY + (b.kneeY - b.hipY) * .5;
    var ta = b.kneeY + (b.ankleY - b.kneeY) * .5;
    ctx.beginPath();
    ctx.moveTo(xh - b.legTop, b.hipY - 4);
    ctx.bezierCurveTo(xh - b.legTop * .98, tk, xh - b.legKnee * 1.04, b.kneeY - 6,
      xh - b.legKnee, b.kneeY);
    ctx.bezierCurveTo(xh - b.legKnee * .92, ta, xa - b.legAnkle * 1.1,
      b.ankleY - 12, xa - b.legAnkle, b.ankleY);
    ctx.lineTo(xa + b.legAnkle, b.ankleY);
    ctx.bezierCurveTo(xa + b.legAnkle * 1.1, b.ankleY - 12,
      xh + b.legKnee * .92, ta, xh + b.legKnee, b.kneeY);
    ctx.bezierCurveTo(xh + b.legKnee * 1.04, b.kneeY - 6, xh + b.legTop * .98, tk,
      xh + b.legTop, b.hipY - 4);
    ctx.closePath();
  }

  function shoePath(ctx, b, side) {
    /* Nearly front on, a foot shows its breadth, not its length, and it
       splays outward. Drawing it as a small stub under the ankle was the
       other half of why the figure read unfinished. */
    var x = b.cx + side * b.stance * .95;
    var top = b.soleY - b.shoeH;
    var inner = x - side * b.shoeW * .78;
    var outer = x + side * b.shoeW * 1.16;
    ctx.beginPath();
    ctx.moveTo(inner, top + b.shoeH * .18);
    ctx.quadraticCurveTo(x, top - b.shoeH * .12, x + side * b.shoeW * .58, top + b.shoeH * .1);
    ctx.bezierCurveTo(outer, top + b.shoeH * .42, outer, b.soleY - b.shoeH * .12,
      outer - side * b.shoeW * .1, b.soleY);
    ctx.lineTo(inner - side * b.shoeW * .06, b.soleY);
    ctx.quadraticCurveTo(inner - side * b.shoeW * .16, b.soleY - b.shoeH * .45,
      inner, top + b.shoeH * .18);
    ctx.closePath();
  }

  function gownPath(ctx, b) {
    var hemHalf = b.hipHalf * (b.floorLength ? 1.62 : 1.18);
    ctx.beginPath();
    ctx.moveTo(b.cx - b.shoulderHalf * .34, b.shoulderY - 4);
    ctx.bezierCurveTo(b.cx - b.shoulderHalf * .86, b.shoulderY + 2,
      b.cx - b.chestHalf, b.chestY - 8, b.cx - b.chestHalf, b.chestY);
    ctx.bezierCurveTo(b.cx - b.chestHalf, b.waistY - 10,
      b.cx - b.waistHalf, b.waistY - 6, b.cx - b.waistHalf, b.waistY);
    ctx.bezierCurveTo(b.cx - b.waistHalf, b.hipY - 12,
      b.cx - b.hipHalf, b.hipY - 8, b.cx - b.hipHalf, b.hipY);
    ctx.bezierCurveTo(b.cx - b.hipHalf * 1.02, b.hipY + (b.hemY - b.hipY) * .55,
      b.cx - hemHalf * .96, b.hemY - 10, b.cx - hemHalf, b.hemY);
    ctx.quadraticCurveTo(b.cx, b.hemY + b.headH * (b.floorLength ? .07 : .05),
      b.cx + hemHalf, b.hemY);
    ctx.bezierCurveTo(b.cx + hemHalf * .96, b.hemY - 10,
      b.cx + b.hipHalf * 1.02, b.hipY + (b.hemY - b.hipY) * .55, b.cx + b.hipHalf, b.hipY);
    ctx.bezierCurveTo(b.cx + b.hipHalf, b.hipY - 8,
      b.cx + b.waistHalf, b.hipY - 12, b.cx + b.waistHalf, b.waistY);
    ctx.bezierCurveTo(b.cx + b.waistHalf, b.waistY - 6,
      b.cx + b.chestHalf, b.waistY - 10, b.cx + b.chestHalf, b.chestY);
    ctx.bezierCurveTo(b.cx + b.chestHalf, b.chestY - 8,
      b.cx + b.shoulderHalf * .86, b.shoulderY + 2,
      b.cx + b.shoulderHalf * .34, b.shoulderY - 4);
    ctx.closePath();
  }

  /* ---------- what the dress is MADE of ----------
     The resolver already names eight kinds of clothing - habit, cassock,
     gambeson, doublet, tunic, cote, court, royal - but the figure drew one
     gown for all of them and let only the hem length and the colour
     differ, so a soldier in a padded coat and a serf in a tunic were the
     same picture twice. Each kind gets the one feature that names it,
     drawn as flat marks inside the silhouette rather than as texture:
     quilting channels on a gambeson, a scapular on a habit, a button line
     on a cassock, banded trim on court dress, fur on royal. */

  function hemLine(ctx, b, rise) {
    var hemHalf = b.hipHalf * (b.floorLength ? 1.62 : 1.18);
    var sag = b.headH * (b.floorLength ? .07 : .05);
    ctx.beginPath();
    ctx.moveTo(b.cx - hemHalf * .97, b.hemY - rise);
    ctx.quadraticCurveTo(b.cx, b.hemY + sag - rise, b.cx + hemHalf * .97, b.hemY - rise);
  }

  function topDetail(ctx, b, res, cl) {
    var hh = b.headH;
    var nHalf = b.shoulderHalf * .34, nY = b.shoulderY - 4;
    var kind = b.kind;
    var trim = cl.trim || GOLD;
    var seam = U.shade(cl.deep, -.12, .03);
    var i, x, y, n, q;

    if (kind === "gambeson") {
      /* Quilting is what a gambeson IS: layers of linen stitched into
         vertical channels until it will turn a blow. The channels splay
         with the skirt of the coat, so they carry the flare as well, which
         is why the generic fold lines are dropped for this kind. */
      line(ctx, 1.15, seam, .6);
      for (x = -3; x <= 3; x += 1) {
        q = b.cx + x * hh * .155;
        ctx.beginPath();
        ctx.moveTo(q, b.shoulderY + hh * .18);
        ctx.bezierCurveTo(q + x * 1.5, b.waistY, q + x * 3, b.hipY,
          q + x * 5, b.hemY - 2);
        ctx.stroke();
      }
      /* a standing collar, and the seam where the skirt is set on */
      line(ctx, 1.4, U.shade(cl.deep, -.2, .04), .7);
      ctx.beginPath();
      ctx.moveTo(b.cx - nHalf * 1.15, nY + hh * .06);
      ctx.quadraticCurveTo(b.cx, nY + hh * .16, b.cx + nHalf * 1.15, nY + hh * .06);
      ctx.stroke();
    } else if (kind === "doublet") {
      /* a merchant's doublet fastens up the front, and the row of close
         buttons is the detail that dates it */
      line(ctx, 1.1, seam, .6);
      ctx.beginPath();
      ctx.moveTo(b.cx - hh * .055, nY + 2);
      ctx.lineTo(b.cx - hh * .055, b.hemY - hh * .03);
      ctx.stroke();
      n = 6;
      for (i = 0; i < n; i += 1) {
        y = nY + hh * .09 + (b.hemY - nY - hh * .16) * (i / (n - 1));
        P.gemDot(ctx, b.cx + hh * .012, y, hh * .016, trim);
      }
    } else if (kind === "cassock") {
      /* a cassock buttons the whole way down, throat to hem */
      n = b.floorLength ? 11 : 7;
      for (i = 0; i < n; i += 1) {
        y = nY + hh * .09 + (b.hemY - nY - hh * .18) * (i / (n - 1));
        P.gemDot(ctx, b.cx, y, hh * .015, U.shade(cl.base, .2, -.03));
      }
      line(ctx, 1.3, U.shade(cl.light, -.02, 0), .5);
      ctx.beginPath();
      ctx.moveTo(b.cx - nHalf, nY + hh * .04);
      ctx.quadraticCurveTo(b.cx, nY + hh * .13, b.cx + nHalf, nY + hh * .04);
      ctx.stroke();
    } else if (kind === "habit") {
      /* the scapular: a straight panel worn over the habit, front and
         back, which is what makes a monk read as a monk rather than as a
         man in a long coat */
      var sw = b.waistHalf * .58;
      ctx.beginPath();
      ctx.moveTo(b.cx - sw, nY + hh * .05);
      ctx.lineTo(b.cx - sw * 1.14, b.hemY - hh * .10);
      ctx.lineTo(b.cx + sw * 1.14, b.hemY - hh * .10);
      ctx.lineTo(b.cx + sw, nY + hh * .05);
      ctx.closePath();
      fillStroke(ctx, U.shade(cl.dark, -.07, .02), U.shade(cl.deep, -.16, .03), 1.3, .75);
    } else if (kind === "court" || kind === "royal") {
      /* rank shows as banded trim at this distance: round the neck, down
         the front, and at the hem, which the tier already draws */
      line(ctx, 2.6, trim, .85);
      ctx.beginPath();
      ctx.moveTo(b.cx - nHalf - hh * .06, nY + hh * .05);
      ctx.quadraticCurveTo(b.cx, nY + hh * .19, b.cx + nHalf + hh * .06, nY + hh * .05);
      ctx.stroke();
      line(ctx, 2.1, trim, .78);
      ctx.beginPath();
      ctx.moveTo(b.cx, nY + hh * .17);
      ctx.lineTo(b.cx, b.hemY - hh * .05);
      ctx.stroke();
      if (kind === "royal") {
        /* fur over the shoulders, ticked rather than drawn hair by hair */
        /* It hangs OVER the shoulders and dips at the breast. Drawn with a
           level lower edge it came out as a white bar laid across the
           chest, which is a bandage, not an ermine mantle. */
        var fur = cl.fur || LINEN;
        var sh2 = b.shoulderHalf;
        ctx.beginPath();
        ctx.moveTo(b.cx - sh2 * .88, b.shoulderY + hh * .13);
        ctx.bezierCurveTo(b.cx - sh2 * .58, b.shoulderY - hh * .02,
          b.cx - nHalf * 1.05, nY - 2, b.cx, nY);
        ctx.bezierCurveTo(b.cx + nHalf * 1.05, nY - 2,
          b.cx + sh2 * .58, b.shoulderY - hh * .02,
          b.cx + sh2 * .88, b.shoulderY + hh * .13);
        ctx.bezierCurveTo(b.cx + sh2 * .46, b.shoulderY + hh * .21,
          b.cx - sh2 * .46, b.shoulderY + hh * .21,
          b.cx - sh2 * .88, b.shoulderY + hh * .13);
        ctx.closePath();
        fillStroke(ctx, fur, U.shade(fur, -.3, .02), 1.3);
        line(ctx, .8, U.shade(fur, -.34, .02), .45);
        for (i = -4; i <= 4; i += 1) {
          x = b.cx + i * sh2 * .18;
          y = b.shoulderY + hh * (.075 + .05 * (1 - Math.abs(i) / 4));
          ctx.beginPath();
          ctx.arc(x, y, hh * .028, .3, Math.PI * .85);
          ctx.stroke();
        }
      }
    } else {
      /* A tunic still has to be got into: a short slit at the throat with
         a lace crossed through it. It is the cheapest mark in the set and
         it is the one that stops plain cloth reading as a sack. */
      line(ctx, 1.2, seam, .6);
      ctx.beginPath();
      ctx.moveTo(b.cx, nY + 1);
      ctx.lineTo(b.cx, nY + hh * .17);
      ctx.stroke();
      /* the lace zigzags across the slit. Crossed pairs were the first
         try and they stacked into a little asterisk sitting on the chest,
         which reads as an embroidered device rather than as a fastening. */
      line(ctx, 1, seam, .55);
      ctx.beginPath();
      for (i = 0; i < 4; i += 1) {
        x = b.cx + (i % 2 ? 1 : -1) * hh * .048;
        y = nY + hh * (.05 + i * .038);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (kind === "cote") {
        /* a cote is the same cut in better cloth, seamed down the front */
        line(ctx, 1.1, seam, .5);
        ctx.beginPath();
        ctx.moveTo(b.cx, nY + hh * .19);
        ctx.lineTo(b.cx, b.hemY - hh * .04);
        ctx.stroke();
      }
    }

    /* every garment is hemmed; court and royal get their trim on top */
    if (kind !== "habit") {
      line(ctx, 1.2, seam, .45);
      hemLine(ctx, b, b.headH * .05);
      ctx.stroke();
    }
  }

  /* An arm at rest is not a vertical tube pinned to the shoulder. It
     leaves the shoulder angled out, closes back toward the body at the
     elbow, and the forearm hangs just clear of the hip with a slight
     inward set. Drawing it straight down and held away from the torso is
     what made the first figure stand to attention. */
  /* The arm line is stated directly, not derived from the torso widths.
     Deriving it was the fault: the elbow tracked the chest and the wrist
     tracked the WAIST, and since a waist is narrower than a chest the
     forearm drifted 0.12 head heights inward, which is a bend nobody
     stands in. A relaxed arm hangs very slightly outward from elbow to
     wrist, and the hand then falls clear of the hem instead of being
     lost against it. */
  function armPoints(b, side) {
    var hh = b.headH, fem = b.fem;
    return {
      shoulderX: b.cx + side * hh * (fem ? .600 : .655),
      elbowX: b.cx + side * hh * (fem ? .645 : .705),
      wristX: b.cx + side * hh * (fem ? .690 : .750),
      shoulderY: b.shoulderY - hh * .02,
      elbowY: b.waistY + hh * .04,
      wristY: b.hipY + hh * .10
    };
  }

  function sleevePath(ctx, b, side) {
    var a = armPoints(b, side);
    var eR = b.armR * .84;      /* the sleeve narrows toward the elbow */
    ctx.beginPath();
    ctx.moveTo(a.shoulderX - side * b.armR, a.shoulderY);
    /* inner seam: down the side of the chest, tucked close */
    ctx.bezierCurveTo(a.shoulderX - side * b.armR * 1.05, b.chestY - 4,
      a.elbowX - side * eR * 1.15, b.chestY + 8, a.elbowX - side * eR, a.elbowY);
    ctx.bezierCurveTo(a.elbowX - side * eR * .95, a.elbowY + b.headH * .14,
      a.wristX - side * b.wristR, a.wristY - b.headH * .12,
      a.wristX - side * b.wristR, a.wristY);
    ctx.lineTo(a.wristX + side * b.wristR, a.wristY);
    /* outer edge back up over the elbow to the shoulder cap */
    ctx.bezierCurveTo(a.wristX + side * b.wristR * 1.15,
      a.wristY - b.headH * .14, a.elbowX + side * eR * 1.08,
      a.elbowY + b.headH * .04, a.elbowX + side * eR * 1.05, a.elbowY - b.headH * .04);
    ctx.bezierCurveTo(a.elbowX + side * eR * 1.08, b.chestY,
      b.cx + side * b.shoulderHalf * .99, b.shoulderY + b.headH * .09,
      b.cx + side * b.shoulderHalf * .95, a.shoulderY + b.headH * .05);
    ctx.quadraticCurveTo(b.cx + side * b.shoulderHalf * .70,
      a.shoulderY - b.headH * .045, a.shoulderX - side * b.armR, a.shoulderY);
    ctx.closePath();
  }

  /* A sleeve ends somewhere, and saying where is most of what stops an arm
     reading as a painted tube. The cuff follows the wrist; a gambeson
     carries its quilting the length of the sleeve, court dress its trim. */
  function sleeveDetail(ctx, b, side, cl) {
    var a = armPoints(b, side), hh = b.headH;
    var court = b.kind === "court" || b.kind === "royal";
    if (b.kind === "gambeson") {
      var eR = b.armR * .84, q;
      line(ctx, 1.05, U.shade(cl.deep, -.12, .03), .5);
      for (q = -1; q <= 1; q += 2) {
        ctx.beginPath();
        ctx.moveTo(a.shoulderX + side * q * b.armR * .42, a.shoulderY + hh * .09);
        ctx.bezierCurveTo(a.elbowX + side * q * eR * .46, b.chestY + hh * .06,
          a.elbowX + side * q * eR * .44, a.elbowY,
          a.wristX + side * q * b.wristR * .46, a.wristY - hh * .1);
        ctx.stroke();
      }
    }
    line(ctx, court ? 2.1 : 1.15, court ? (cl.trim || GOLD)
      : U.shade(cl.deep, -.14, .03), court ? .8 : .55);
    ctx.beginPath();
    ctx.moveTo(a.wristX - side * b.wristR * 1.04, a.wristY - hh * .085);
    ctx.quadraticCurveTo(a.wristX, a.wristY - hh * .045,
      a.wristX + side * b.wristR * 1.04, a.wristY - hh * .085);
    ctx.stroke();
  }

  /* Hose were two separate legs, seamed up the back and held by a strap or
     bound with a winding, not painted-on tights. Below a short hem that
     seam and the wound garters are all the leg has to say, and without
     them the legs read as two flat shapes with feet on the end. */
  function legDetail(ctx, b, res, hose, side) {
    var hh = b.headH;
    var xh = b.cx + side * b.stance, xa = b.cx + side * b.stance * .92;
    var mid = (b.hipY + b.kneeY) * .5;
    var g, gy, gx, gw, t;
    ctx.save();
    legPath(ctx, b, side);
    ctx.clip();
    line(ctx, 1.1, U.shade(hose, -.28, .03), .5);
    /* the seam, set to the outside of the leg so both read the same way */
    ctx.beginPath();
    ctx.moveTo(xh + side * b.legTop * .34, b.hipY);
    ctx.bezierCurveTo(xh + side * b.legKnee * .40, mid,
      xh + side * b.legKnee * .34, b.kneeY,
      xa + side * b.legAnkle * .30, b.ankleY);
    ctx.stroke();
    /* the knee, which is the only joint a straight leg shows */
    ctx.beginPath();
    ctx.moveTo(xh - b.legKnee * .82, b.kneeY - hh * .025);
    ctx.quadraticCurveTo(xh, b.kneeY + hh * .035, xh + b.legKnee * .82,
      b.kneeY - hh * .025);
    ctx.stroke();
    if (res.tier <= 2 || res.profession === "soldier") {
      /* Winding strips bound round the shin: what a man who walks or
         fights wore over his hose. They are drawn past the edge of the leg
         and left to the clip, so they always sit on it exactly. */
      line(ctx, hh * .038, U.shade(hose, -.36, .05), .85);
      for (g = 0; g < 3; g += 1) {
        t = .18 + g * .26;
        gy = b.kneeY + (b.ankleY - b.kneeY) * t;
        gx = U.mix(xh, xa, t);
        gw = U.mix(b.legKnee, b.legAnkle, t) * 1.5;
        ctx.beginPath();
        ctx.moveTo(gx - gw, gy - hh * .022);
        ctx.lineTo(gx + gw, gy + hh * .022);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* An arm hanging at rest is pronated: the forearm is rolled so the palm
     faces back and the thumb turns in toward the thigh, so the viewer sees
     the BACK of the hand, thumb on the inner edge. Supinating it, thumb
     outward and palm to the front, is a pose held on purpose rather than
     one a figure stands in, and it contradicts the knuckles drawn on top,
     which are dorsal marks: a palm shows creases, not knuckles.
     Moving the thumb was not enough on its own. Both long edges of the
     hand were smooth swells of about the same size, so the thumb read as
     one more finger mass and the hand looked mirrored whichever way it
     faced. What tells a viewer which side the thumb is on is not the bulge
     but the WEB: the deep notch cut between thumb and forefinger, which
     nothing else on a hand has. The finger ends need to disagree with each
     other too, short at the little finger and longest at the middle. Those
     two facts are the whole silhouette; the grooves and joint creases only
     confirm what it already says. */
  var HAND = {
    /* fingers, outer (little) to inner (index): the valley on the inner
       side of each and the control that carries its tip */
    tips: [
      { cx: .86, cy: 1.01, vx: .56, vy: .80 },
      { cx: .34, cy: 1.135, vx: .12, vy: .89 },
      { cx: -.10, cy: 1.18, vx: -.32, vy: .91 },
      { cx: -.59, cy: 1.085, vx: -.66, vy: .76 }
    ],
    /* the seam between each pair of fingers, knuckle end and valley end */
    seams: [[.56, .60, .56, .79], [.12, .65, .12, .88], [-.32, .63, -.32, .90]]
  };

  function handPath(ctx, b, side, hx, hy) {
    var w = b.handW, L = b.handLen;
    function X(u) { return hx + side * w * u; }
    function Y(t) { return hy + L * t; }
    ctx.beginPath();
    ctx.moveTo(X(.52), Y(0));
    /* outer edge: wrist, widest across the knuckles, then the little finger */
    ctx.bezierCurveTo(X(.80), Y(.14), X(.94), Y(.30), X(.95), Y(.52));
    ctx.bezierCurveTo(X(.95), Y(.62), X(.93), Y(.66), X(.92), Y(.70));
    /* four fingertips, each a scallop into the valley beside it */
    HAND.tips.forEach(function (t) {
      ctx.quadraticCurveTo(X(t.cx), Y(t.cy), X(t.vx), Y(t.vy));
    });
    /* Up the forefinger to the web, out along the thumb to its tip, then
       back over the ball of the thumb to the wrist. The thumb is drawn as
       a digit with a shaft, not as a corner of the palm: the web sits at
       .42 of the hand and the tip reaches .68, so a quarter of the hand's
       length hangs past the notch. The first version cut the web at .48
       and stopped the tip at .57, which left nine hundredths of protrusion
       and read as a stub - the notch was there, but there was nothing on
       the far side of it long enough to be a thumb. */
    ctx.bezierCurveTo(X(-.70), Y(.66), X(-.62), Y(.52), X(-.52), Y(.42));
    ctx.bezierCurveTo(X(-.78), Y(.48), X(-1.02), Y(.58), X(-1.16), Y(.68));
    ctx.bezierCurveTo(X(-1.30), Y(.68), X(-1.34), Y(.56), X(-1.26), Y(.46));
    ctx.bezierCurveTo(X(-1.16), Y(.30), X(-.88), Y(.12), X(-.52), Y(0));
    ctx.closePath();
  }

  function handDetail(ctx, b, side, hx, hy, res) {
    var w = b.handW, L = b.handLen;
    var ink = U.shade(res.skin.base, -.34, .06);
    function X(u) { return hx + side * w * u; }
    function Y(t) { return hy + L * t; }
    line(ctx, 1.05, ink, .7);
    /* the knuckles, hanging lowest at the middle finger */
    ctx.beginPath();
    ctx.moveTo(X(.88), Y(.54));
    ctx.quadraticCurveTo(X(.05), Y(.68), X(-.58), Y(.56));
    ctx.stroke();
    /* the seams run from the knuckles into the valleys the silhouette
       already cuts, so the fingers are the same four in line and in edge */
    HAND.seams.forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(X(s[0]), Y(s[1]));
      ctx.lineTo(X(s[2]), Y(s[3]));
      ctx.stroke();
    });
    /* the web, which is the mark that fixes which side the thumb is on,
       carried up the ball of the thumb as the tendon that raises it */
    ctx.beginPath();
    ctx.moveTo(X(-.56), Y(.40));
    ctx.quadraticCurveTo(X(-.70), Y(.26), X(-.72), Y(.08));
    ctx.stroke();
    /* joints: the middle knuckles of the fingers and the one in the thumb */
    line(ctx, .85, ink, .42);
    ctx.beginPath();
    ctx.moveTo(X(.82), Y(.71));
    ctx.quadraticCurveTo(X(.05), Y(.83), X(-.60), Y(.75));
    ctx.moveTo(X(-1.24), Y(.52));
    ctx.lineTo(X(-.98), Y(.56));
    ctx.stroke();
  }

  function drawFigure(v, f, colors, b) {
    var ctx = v.ctx, res = v.res, cl = res.cloth;
    var hose = colors.limb || U.shade(cl.deep, -.04, 0);
    var shoe = colors.foot || [52, 40, 32];
    var side;

    /* legs and shoes first; everything else overlaps them */
    if (!b.floorLength) {
      if (b.hemY < b.hipY) {
        /* A doublet stops above the hip, and the legs start at it, so
           between the two the background showed straight through the
           middle of the figure. Hose are joined at the seat; drawing that
           join closes the hole and is what is actually being worn. */
        var seatW = b.stance + b.legTop;
        var seatTop = b.hemY - b.headH * .12;
        ctx.beginPath();
        ctx.moveTo(b.cx - seatW * .86, seatTop);
        ctx.bezierCurveTo(b.cx - seatW * .96, b.hipY - b.headH * .14,
          b.cx - seatW, b.hipY - b.headH * .08, b.cx - seatW, b.hipY);
        ctx.lineTo(b.cx + seatW, b.hipY);
        ctx.bezierCurveTo(b.cx + seatW, b.hipY - b.headH * .08,
          b.cx + seatW * .96, b.hipY - b.headH * .14, b.cx + seatW * .86, seatTop);
        ctx.closePath();
        fillStroke(ctx, hose, U.shade(hose, -.22, .02), 1.8);
      }
      for (side = -1; side <= 1; side += 2) {
        legPath(ctx, b, side);
        fillStroke(ctx, hose, U.shade(hose, -.22, .02), 1.8);
        legDetail(ctx, b, res, hose, side);
      }
      /* the far leg reads back by a wash, which is most of what gives a
         flat drawing depth without shading it */
      ctx.save();
      ctx.globalAlpha = .3;
      legPath(ctx, b, -res.lx);
      ctx.fillStyle = U.css(U.shade(hose, -.3, 0));
      ctx.fill();
      ctx.restore();
    }
    for (side = -1; side <= 1; side += 2) {
      shoePath(ctx, b, side);
      fillStroke(ctx, side === res.lx ? shoe : U.shade(shoe, -.1, 0),
        U.shade(shoe, -.3, .02), 1.6);
    }

    gownPath(ctx, b);
    fillStroke(ctx, cl.base, cl.deep, 2);
    ctx.save();
    gownPath(ctx, b);
    ctx.clip();
    ctx.globalAlpha = .5;
    ctx.fillStyle = U.css(cl.dark);
    ctx.beginPath();
    ctx.moveTo(b.cx + res.sx * b.shoulderHalf * 1.2, b.shoulderY - 10);
    ctx.lineTo(b.cx + res.sx * b.hipHalf * 1.8, b.hemY + 20);
    ctx.lineTo(b.cx + res.sx * b.hipHalf * .1, b.hemY + 20);
    ctx.lineTo(b.cx + res.sx * b.chestHalf * .2, b.shoulderY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    /* A gambeson's channels and a habit's scapular already run the length
       of the skirt, so the generic folds would only argue with them. */
    if (b.kind !== "gambeson" && b.kind !== "habit") {
      line(ctx, 1.1, U.shade(cl.deep, -.05, 0), .45);
      var fold, fx;
      for (fold = -2; fold <= 2; fold += 1) {
        if (!fold) continue;
        fx = b.cx + fold * b.waistHalf * .42;
        ctx.beginPath();
        ctx.moveTo(fx, b.waistY + 4);
        ctx.quadraticCurveTo(fx + fold * 2.5, (b.waistY + b.hemY) / 2,
          fx + fold * (b.floorLength ? 9 : 5), b.hemY - 2);
        ctx.stroke();
      }
    }
    topDetail(ctx, b, res, cl);
    ctx.restore();

    for (side = -1; side <= 1; side += 2) {
      sleevePath(ctx, b, side);
      fillStroke(ctx, side === res.lx ? cl.base : U.shade(cl.base, -.06, .01),
        cl.deep, 1.8);
      ctx.save();
      sleevePath(ctx, b, side);
      ctx.clip();
      sleeveDetail(ctx, b, side, cl);
      ctx.restore();
    }
    for (side = -1; side <= 1; side += 2) {
      var a = armPoints(b, side);
      handPath(ctx, b, side, a.wristX, a.wristY - b.headH * .015);
      fillStroke(ctx, res.skin.base, U.shade(res.skin.base, -.3, .05), 1.4);
      handDetail(ctx, b, side, a.wristX, a.wristY - b.headH * .015, res);
    }

    if (b.kind === "habit" || b.kind === "cassock") {
      line(ctx, 2.2, [176, 158, 118], .9);
      ctx.beginPath();
      ctx.moveTo(b.cx - b.waistHalf, b.waistY + 2);
      ctx.quadraticCurveTo(b.cx, b.waistY + b.headH * .07,
        b.cx + b.waistHalf, b.waistY + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.cx + b.waistHalf * .55, b.waistY + b.headH * .05);
      ctx.lineTo(b.cx + b.waistHalf * .62, b.waistY + b.headH * .38);
      ctx.stroke();
    } else {
      var beltC = res.tier >= 4 ? (cl.trim || [180, 148, 84])
        : U.shade(cl.deep, -.1, .04);
      ctx.beginPath();
      ctx.moveTo(b.cx - b.waistHalf * 1.02, b.waistY);
      ctx.quadraticCurveTo(b.cx, b.waistY + b.headH * .05,
        b.cx + b.waistHalf * 1.02, b.waistY);
      ctx.lineTo(b.cx + b.waistHalf * 1.02, b.waistY + b.headH * .075);
      ctx.quadraticCurveTo(b.cx, b.waistY + b.headH * .125,
        b.cx - b.waistHalf * 1.02, b.waistY + b.headH * .075);
      ctx.closePath();
      fillStroke(ctx, beltC, U.shade(beltC, -.32, .03), 1.4);
      if (res.tier >= 3) {
        ctx.beginPath();
        ctx.arc(b.cx, b.waistY + b.headH * .062, b.headH * .036, 0, TAU);
        fillStroke(ctx, GOLD, U.shade(GOLD, -.3, 0), 1.2);
      }
    }

    if (res.tier >= 4) {
      line(ctx, 2.4, cl.trim || GOLD, .85);
      ctx.beginPath();
      var hemHalf = b.hipHalf * (b.floorLength ? 1.62 : 1.18);
      ctx.moveTo(b.cx - hemHalf * .96, b.hemY - 3);
      ctx.quadraticCurveTo(b.cx, b.hemY + b.headH * (b.floorLength ? .055 : .04),
        b.cx + hemHalf * .96, b.hemY - 3);
      ctx.stroke();
    }
    return b;
  }

  function drawNeck(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var top = f.neckTop;
    var bot = f.neckBottom;
    ctx.beginPath();
    ctx.moveTo(f.throatX - f.neckTopW, top);
    ctx.bezierCurveTo(f.throatX - f.neckTopW - 1, top + 5,
      f.throatX - f.neckBaseW, bot - 7, f.throatX - f.neckBaseW, bot);
    ctx.lineTo(f.throatX + f.neckBaseW, bot);
    ctx.bezierCurveTo(f.throatX + f.neckBaseW, bot - 7,
      f.throatX + f.neckTopW + 1, top + 5, f.throatX + f.neckTopW, top);
    ctx.closePath();
    fillStroke(ctx, U.shade(res.skin.base, -.03, 0), res.skin.line, 1.5, .65);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(f.throatX - f.neckTopW, top);
    ctx.bezierCurveTo(f.throatX - f.neckTopW - 1, top + 5,
      f.throatX - f.neckBaseW, bot - 7, f.throatX - f.neckBaseW, bot);
    ctx.lineTo(f.throatX + f.neckBaseW, bot);
    ctx.bezierCurveTo(f.throatX + f.neckBaseW, bot - 7,
      f.throatX + f.neckTopW + 1, top + 5, f.throatX + f.neckTopW, top);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = .3;
    ctx.fillStyle = U.css(res.skin.shadow);
    if (res.lx > 0) ctx.fillRect(f.throatX - f.neckBaseW, top,
      f.neckBaseW, bot - top);
    else ctx.fillRect(f.throatX, top, f.neckBaseW, bot - top);
    ctx.restore();
  }

  /* An ear is not an oval with a scratch in it. Three marks carry it at
     this size: the helix rolling over at the top and back down the rim,
     the antihelix answering it inside, and a lobe that hangs free. */
  function drawEars(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    [f.A.earL, f.A.earR].forEach(function (ear, i) {
      var side = i === 0 ? -1 : 1;              /* outward from the head */
      var far = i === (res.lx > 0 ? 0 : 1);
      var ex = ear[0], ey = ear[1] + 2 * f.u;
      var rw = 5.4 * f.u, rh = 9.6 * f.u;
      ctx.beginPath();
      ctx.moveTo(ex - side * rw * .5, ey - rh);
      ctx.bezierCurveTo(ex + side * rw * .9, ey - rh * 1.05,
        ex + side * rw * 1.25, ey - rh * .1,
        ex + side * rw * .62, ey + rh * .52);
      ctx.bezierCurveTo(ex + side * rw * .34, ey + rh * .95,
        ex - side * rw * .5, ey + rh * 1.02,
        ex - side * rw * .62, ey + rh * .5);
      ctx.bezierCurveTo(ex - side * rw * .72, ey,
        ex - side * rw * .8, ey - rh * .6,
        ex - side * rw * .5, ey - rh);
      ctx.closePath();
      fillStroke(ctx, far ? res.skin.shadow : res.skin.base,
        res.skin.line, 1.4, .72);
      /* the helix rim, thick where it rolls over the top */
      line(ctx, 1.05, res.skin.deep, .4);
      ctx.beginPath();
      ctx.moveTo(ex - side * rw * .18, ey - rh * .74);
      ctx.bezierCurveTo(ex + side * rw * .6, ey - rh * .74,
        ex + side * rw * .78, ey - rh * .1,
        ex + side * rw * .3, ey + rh * .4);
      ctx.stroke();
      /* the antihelix, a short answering fold */
      line(ctx, .85, res.skin.deep, .3);
      ctx.beginPath();
      ctx.moveTo(ex - side * rw * .1, ey - rh * .3);
      ctx.quadraticCurveTo(ex + side * rw * .3, ey - rh * .05,
        ex + side * rw * .1, ey + rh * .3);
      ctx.stroke();
      P.softEllipse(ctx, ex + side * rw * .1, ey - rh * .1, rw * .5, rh * .3,
        res.skin.shadow, .3);
      P.softEllipse(ctx, ex - side * rw * .32, ey + rh * .62, rw * .42,
        rh * .26, res.skin.lit, far ? .1 : .26);
    });
  }

  /* The terminator: where the head turns out of the key. Its SHAPE is
     anatomy - it runs off the brow ridge, in over the cheekbone and out
     again at the jaw - so it is one authored curve, pushed toward the
     lit side by `push` when a ramp needs room to fade in. */
  function shadowSidePath(ctx, f, res, push) {
    var s = res.lx > 0 ? -1 : 1;                   /* toward the shadow */
    var out = res.lx > 0 ? f.left - 18 : f.right + 18;
    ctx.beginPath();
    ctx.moveTo(f.cx - s * push + s * 1, f.top - 4);
    ctx.bezierCurveTo(f.cx - s * push + s * 8, f.eyeY - 12,
      f.cx - s * push + s * 6, f.jawY,
      f.chinX - s * push * .55 + s * 1, f.chinY + 7);
    ctx.lineTo(out, f.chinY + 10);
    ctx.lineTo(out, f.top - 12);
    ctx.closePath();
  }

  function drawHead(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    headPath(ctx, f);
    fillStroke(ctx, res.skin.base, res.skin.line, 1.8, .72);

    ctx.save();
    headPath(ctx, f);
    ctx.clip();
    /* A hard-edged fill put a razor down the middle of every face. A
       terminator on a curved surface is a band, not a line, and the one
       thing that firms it up is how fast the form turns - so the shape
       stays and the tone crosses it as a ramp. The far stop lifts again:
       the ground throws light back into the silhouette, and without that
       bounce a flat-lit head reads as a cut-out. */
    var push = 10;
    var start = f.cx + res.lx * push;
    var far = res.lx > 0 ? f.left - 6 : f.right + 6;
    var ramp = ctx.createLinearGradient(start, 0, U.mix(start, far, .62), 0);
    ramp.addColorStop(0, U.css(res.skin.shadow, 0));
    ramp.addColorStop(.78, U.css(res.skin.shadow, .4));
    ramp.addColorStop(1, U.css(res.skin.shadow, .34));
    ctx.fillStyle = ramp;
    shadowSidePath(ctx, f, res, push);
    ctx.fill();
    /* the bounce, restated as its own soft mass along the shadow edge */
    P.softEllipse(ctx, far + res.lx * 9, f.eyeY + f.lowerFace * .28,
      7, f.lowerFace * .42, res.skin.lit, .1);
    P.softEllipse(ctx, f.cx + res.lx * 12, f.eyeY - 16, 20, 12, res.skin.lit, .38);
    P.softEllipse(ctx, f.cx + res.lx * 15, f.eyeY + 18, 9, 7, res.skin.blush, .22);
    ctx.restore();
  }

  function drawFaceStructure(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var cheekY = f.eyeY + 17;
    var litEye = res.lx > 0 ? f.A.eyeR : f.A.eyeL;
    var shadeEye = res.lx > 0 ? f.A.eyeL : f.A.eyeR;
    var gaunt = U.clamp(.55 - f.cheekT * .5 + res.elder * .45, 0, 1);
    ctx.save();
    headPath(ctx, f);
    ctx.clip();
    P.softEllipse(ctx, shadeEye[0], f.eyeY + 4, 13 + f.cheekT * 3, 8,
      res.skin.deep, .2 + f.cheekT * .1);
    /* The cheek is three planes, not one blush blob: the bone lit from
       above and angled down toward the nose the way the zygomatic runs,
       the hollow beneath it, and the apple carrying the blush. Gaunt and
       elder faces deepen the hollow, round and young ones the apple. */
    [-1, 1].forEach(function (side) {
      var eye = side < 0 ? f.A.eyeL : f.A.eyeR;
      var litSide = (side < 0) === (res.lx < 0);
      P.softEllipse(ctx, eye[0] + side * 4, f.eyeY + 10,
        10 + f.cheekT * 4, 5, res.skin.lit,
        (litSide ? .3 : .14) * (res.child ? .55 : 1), -side * .42);
      P.softEllipse(ctx, eye[0] + side * 7.5, f.eyeY + 19,
        8.5, 5.5, res.skin.shadow, .08 + gaunt * .18, side * .3);
      var blushA = res.health === "hale"
        ? .1 + f.cheekT * .1 + (res.sexF ? .07 : 0) + (res.child ? .15 : 0) : 0;
      if (blushA > 0) {
        P.softEllipse(ctx, eye[0] + side * 1.5, cheekY + 1,
          6 + f.cheekT * 3.5, 4.2, res.skin.blush, Math.min(.4, blushA));
      }
    });
    P.softEllipse(ctx, f.cx + res.lx * 3, f.eyeY - 13, 14, 6,
      res.skin.lit, .18 + res.browWeight * .05);
    P.softEllipse(ctx, f.chinX, f.chinY - 2, f.chinSpan, 4,
      f.jawT > .55 ? res.skin.shadow : res.skin.lit, .2);
    ctx.restore();

    /* Nasolabial folds arrive with age, running from the nose wing
       past the mouth corner. */
    if (res.elder > .05 && !res.child && fine()) {
      line(ctx, .8, res.skin.deep, .08 + res.elder * .2);
      [-1, 1].forEach(function (side) {
        ctx.beginPath();
        ctx.moveTo(f.A.noseBase[0] + side * 5.5, f.A.noseBase[1] - 1);
        ctx.quadraticCurveTo(f.A.noseBase[0] + side * 10, f.mouthY - 4,
          f.mouthX + side * (f.right - f.left) * .14, f.mouthY + 4);
        ctx.stroke();
      });
    }

    /* The cheekbone. It was a full-length line from beside the eye down
       to the jaw, at one weight the whole way, which is a scratch on the
       face rather than a bone under it: a cheekbone shows where it turns
       hardest, under the outer eye, and is gone long before the jaw. */
    [-1, 1].forEach(function (side) {
      var eye = side < 0 ? f.A.eyeL : f.A.eyeR;
      var jaw = side < 0 ? f.jawL : f.jawR;
      var x0 = eye[0] + side * 7, y0 = f.eyeY + 7;
      var x1 = jaw - side * 3, y1 = f.jawY - 7;
      fadeLine(ctx, .8, res.skin.line, x0, y0, x1, y1,
        .04, .03, .16 + f.cheekT * .22);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(eye[0] + side * (12 + f.cheekT * 3), cheekY, x1, y1);
      ctx.stroke();
    });
    if (f.jawT > .56) {
      line(ctx, 1, res.skin.deep, .22 + f.jawT * .12);
      ctx.beginPath();
      ctx.moveTo(f.jawL, f.jawY - 1);
      ctx.quadraticCurveTo(f.chinX, f.chinY + 3, f.jawR, f.jawY - 1);
      ctx.stroke();
    }
  }

  /* ---------- what hangs behind the head ----------
     Drawn between the body and the head so it reads as cloth the head is
     in front of. The depths here used to be design-space literals - 210,
     238, 216, 226 - which are portrait coordinates: at figure framing
     they hung a veil's hem near the waist whatever head it fell from,
     the same mistake the long hair had. Everything is stated against the
     head now, and scaled by the drape knob, which is the one number that
     says how far cloth falls. */
  function backFall(ctx, f, wide, depth, color, edge, width, alpha) {
    var u = f.u, hh = f.chinBottom - f.top;
    var bot = f.chinBottom + hh * depth;
    ctx.beginPath();
    ctx.moveTo(f.cx, f.top - 9 * u);
    ctx.bezierCurveTo(f.right + wide * .58, f.top + 2 * u,
      f.right + wide * .78, f.eyeY + hh * .22, f.right + wide, bot - hh * .1);
    ctx.lineTo(f.cx + wide * .8, bot);
    ctx.lineTo(f.cx - wide * .8, bot);
    ctx.lineTo(f.left - wide, bot - hh * .1);
    ctx.bezierCurveTo(f.left - wide * .78, f.eyeY + hh * .22,
      f.left - wide * .58, f.top + 2 * u, f.cx, f.top - 9 * u);
    ctx.closePath();
    fillStroke(ctx, color, edge, width, alpha);
  }

  /* A rope of cloth hanging off the head: a liripipe, a kerchief tail, a
     mitre lappet, a turban tail. One construction for all of them - a
     tapering mass that leans out and then falls - so they read as the
     same cloth cut different lengths. */
  function clothTail(ctx, f, x, top, side, len, wide, color, edge) {
    var N = 9, pts = [], half = [], i, t;
    for (i = 0; i < N; i += 1) {
      t = i / (N - 1);
      pts.push([x + side * Math.sin(t * 1.9) * wide * 1.5, top + len * t]);
      half.push(wide * (1 - t * .42) * (1 + Math.sin(t * Math.PI) * .14));
    }
    fallPath(ctx, pts, half);
    fillStroke(ctx, color, edge, 1.4);
  }

  function drawBackCostume(v, f, colors) {
    var ctx = v.ctx;
    var res = v.res;
    var hw = res.headwearR;
    var base = res.headwearBase;
    var vr = res.headwearVariantR;
    var K = hwKnobs(f, res);
    var u = K.u, hh = K.hh;
    if (base === "hood") {
      var cloth = colors.hoodC || res.cloth.dark;
      if (hw === "hood" && vr === "back") {
        /* fallen back off the head: what is left behind the neck is a
           bolster of cloth, and nothing crosses the skull at all */
        ctx.beginPath();
        ctx.moveTo(f.left - 8 * u, f.jawY + 4 * u);
        ctx.bezierCurveTo(f.left - 20 * u, f.chinY + hh * .22,
          f.cx - 26 * u, f.chinY + hh * .42, f.cx, f.chinY + hh * .44);
        ctx.bezierCurveTo(f.cx + 26 * u, f.chinY + hh * .42,
          f.right + 20 * u, f.chinY + hh * .22, f.right + 8 * u, f.jawY + 4 * u);
        ctx.closePath();
        fillStroke(ctx, cloth, res.cloth.deep, 2);
      } else {
        backFall(ctx, f, 32 * u, 1.06 * K.fall, cloth, res.cloth.deep, 2);
      }
      if (hw === "chaperon") {
        /* the liripipe: worn as a hood it hangs down the back, and rolled
           into a hat it is draped forward over the shoulder instead */
        var rolled = vr === "rolled";
        clothTail(ctx, f, f.cx + res.sx * (f.halfR + 6 * u),
          rolled ? f.eyeY : f.top + 4 * u, res.sx,
          hh * (rolled ? .85 : 1.15) * K.fall, 5 * u,
          U.shade(cloth, -.06, .01), res.cloth.deep);
      }
      return;
    }
    if (base === "veil" || base === "wimple") {
      var veil = colors.veilC || LINEN;
      if (hw === "crespine") return;    /* a caul has nothing hanging */
      if (hw === "kerchief") {
        if (vr === "chin") return;      /* tied under the chin, all front */
        /* knotted at the nape: two short tails, side by side */
        var kx = f.cx + res.sx * (f.halfR + 2 * u);
        clothTail(ctx, f, kx, f.jawY, res.sx, hh * .34 * K.fall, 4.5 * u,
          U.shade(veil, -.08, .02), U.shade(veil, -.3, 0));
        clothTail(ctx, f, kx - res.sx * 4 * u, f.jawY + 2 * u, res.sx * .4,
          hh * .26 * K.fall, 3.6 * u, U.shade(veil, -.16, .02),
          U.shade(veil, -.3, 0));
        return;
      }
      backFall(ctx, f, 22 * u, (vr === "pinned" ? .58 : .83) * K.fall,
        veil, U.shade(veil, -.2, 0), 1.7, .65);
      return;
    }
    if (hw === "mitre") {
      /* the two lappets, hanging from under the band at the back */
      [-1, 1].forEach(function (side) {
        clothTail(ctx, f, f.cx + side * f.halfR * .62, f.hairY + 6 * u, side * .3,
          hh * .78 * K.fall, 3.4 * u, [232, 226, 214], [166, 158, 142]);
      });
      return;
    }
    if (base === "turban" && vr === "tailed") {
      var turban = colors.turbanC || [224, 214, 192];
      clothTail(ctx, f, f.cx + res.sx * (f.halfR + 3 * u), f.eyeY - 4 * u,
        res.sx, hh * .7 * K.fall, 5.5 * u, turban, U.shade(turban, -.26, 0));
    }
  }

  /* A near-black head of hair has no usable light in its own ramp:
     hairL on black is a fifty-fifth of a step off hairD, so every
     dark-haired character came out with a hole cut in the card where
     the mass should be - the beard worst of all, being the largest dark
     shape on a face, and the long fall of hair next.

     The lift has to be measured against how dark the hair already is.
     A flat mix gives black nothing and blows out white, so it is scaled
     by the hair's own luminance: black lifts most of a step to slate,
     chestnut a little, and grey and blond barely move because their
     ramps already carry a usable light. */
  function hairLit(res, k) {
    var h = res.hair;
    var lum = (h[0] * .3 + h[1] * .59 + h[2] * .11) / 255;
    return U.shade(h, U.clamp(k * (1.15 - lum) * 1.05, 0, .55), -.04 * k, 2);
  }

  /* ribbon() offsets its half-widths in y, which is right for a brow
     and useless for anything that hangs. This is the same construction
     across x, for the masses that fall: braids and locks. */
  function fallPath(ctx, pts, half) {
    var l = [], r = [], i;
    for (i = 0; i < pts.length; i += 1) {
      l.push([pts[i][0] - half[i], pts[i][1]]);
      r.push([pts[i][0] + half[i], pts[i][1]]);
    }
    r.reverse();
    ctx.beginPath();
    edgeThrough(ctx, l, true);
    edgeThrough(ctx, r, false);
    ctx.closePath();
  }

  /* The hairline is the one edge in this drawing that is not an edge:
     it is where hair stops being dense. Left as the cap's own vector
     curve it reads as the rim of a helmet, which is what the loose
     styles were doing. A handful of hairs crossing it is the whole
     difference and costs six strokes. */
  function fringeWisps(ctx, f, res, rng, y, n) {
    if (!fine()) return;
    var i, u = f.u;
    for (i = 0; i < n; i += 1) {
      var t = (i + .5) / n;
      var x = U.mix(f.left + 4 * u, f.right - 4 * u, t) + (rng() - .5) * 4 * u;
      var dy = (2.5 + rng() * 4) * u;
      line(ctx, .8 * u, i & 1 ? res.hairDD : res.hairD, .42 + rng() * .2);
      ctx.beginPath();
      ctx.moveTo(x, y - 5 * u);
      ctx.quadraticCurveTo(x + (rng() - .5) * 2.4 * u, y,
        x + (rng() - .5) * 4 * u, y + dy);
      ctx.stroke();
    }
  }

  /* A braid is a rope: a tapering mass with a herringbone of strands
     crossing it. The first version stamped one small outlined ellipse
     per crossing, so the ring outlines read as beads and the gaps
     between them read as air - a bracelet hanging off the temple. The
     mass is drawn once, the crossings are laid INSIDE it wide enough to
     span it so no gap survives, and the only outline is the
     silhouette's own. Sizes are in head units, so it is the same braid
     at any framing. */
  function braid(ctx, x, top, bottom, side, res, u) {
    var len = Math.max(14 * u, bottom - top);
    var wide = 4.4 * u;
    /* The crossings set the pitch, and the pitch has to reach the
       SILHOUETTE too: a braid is known by its scalloped edge before any
       of its shading is read. The first rebuild shaded a smooth-sided
       ribbon and it came out a ladder painted on a strap. */
    var pitch = wide * 1.75;
    var steps = Math.max(3, Math.round(len / pitch));
    var N = steps * 4 + 1, pts = [], half = [], i, t;
    for (i = 0; i < N; i += 1) {
      t = i / (N - 1);
      /* it swings out under the ear, tucks back at the jaw, then falls */
      pts.push([x + side * (Math.sin(t * 2.6) * 3.2 - t * t * 1.6) * u,
        top + len * t]);
      half.push(wide * (.8 + Math.sin(t * Math.PI) * .26) * (1 - t * .38) *
        (1 + Math.sin(t * steps * TAU - Math.PI * .5) * .2));
    }
    fallPath(ctx, pts, half);
    ctx.fillStyle = U.css(res.hairD);
    ctx.fill();

    ctx.save();
    ctx.clip();
    /* a rope is round: dark on the side away from the key, one sheen
       just off the crest */
    var g = ctx.createLinearGradient(x - res.lx * wide * 1.4, 0,
      x + res.lx * wide * 1.4, 0);
    g.addColorStop(0, U.css(res.hairDD, .6));
    g.addColorStop(.6, U.css(res.hairDD, 0));
    g.addColorStop(1, U.css(hairLit(res, .22), .34));
    ctx.fillStyle = g;
    ctx.fillRect(x - wide * 4, top - 4 * u, wide * 8, len + 14 * u);

    for (i = 0; i < steps; i += 1) {
      t = (i + .5) / steps;
      var ci = U.clamp(t * (N - 1), 0, N - 1);
      var j = Math.floor(ci), fr = ci - j, j2 = Math.min(j + 1, N - 1);
      var bx = U.mix(pts[j][0], pts[j2][0], fr);
      var by = U.mix(pts[j][1], pts[j2][1], fr);
      var h = wide * .9;
      var alt = i & 1 ? 1 : -1;
      /* wider than the rope on purpose: the clip cuts it back to the
         silhouette and the crossing runs edge to edge, so no gap is
         left to read as air between beads */
      P.fEll(ctx, bx, by, h * 1.7, h * .95,
        alt > 0 ? hairLit(res, .2) : U.lerpC(res.hairD, res.hairDD, .55),
        .6, alt * side * .5);
      line(ctx, .9 * u, res.hairDD, .6);
      ctx.beginPath();
      ctx.moveTo(bx - h * 2, by + h * .82 - alt * h * .5);
      ctx.quadraticCurveTo(bx, by + h * 1.02,
        bx + h * 2, by + h * .82 + alt * h * .5);
      ctx.stroke();
    }
    ctx.restore();

    fallPath(ctx, pts, half);
    line(ctx, 1.15 * u, res.hairDD, .85);
    ctx.stroke();

    /* bound off: the tie across the rope, then the tuft that escapes
       below it. The tie follows the rope's lean rather than sitting
       square on it, which a filled rectangle cannot do. */
    var tipX = pts[N - 1][0], tipY = pts[N - 1][1], th = half[N - 1];
    var lean = Math.atan2(tipY - pts[N - 5][1], tipX - pts[N - 5][0]);
    var nx = Math.cos(lean - Math.PI / 2), ny = Math.sin(lean - Math.PI / 2);
    /* the escaping tuft: three even strokes ending level read as a bird's
       foot, so the middle one runs longest and the outer two fall short */
    for (i = -1; i <= 1; i += 1) {
      var fall = 1 - Math.abs(i) * .42;
      line(ctx, (1.2 - Math.abs(i) * .25) * u, res.hairD, .95);
      ctx.beginPath();
      ctx.moveTo(tipX + i * th * .38, tipY - th * .3);
      ctx.quadraticCurveTo(tipX + i * th * .8, tipY + th * .6 * fall,
        tipX + i * th * 1.15 + side * th * .25, tipY + th * 1.5 * fall);
      ctx.stroke();
    }
    var tyY = tipY - th * .9;
    line(ctx, 3 * u, res.cloth.base, 1);
    ctx.beginPath();
    ctx.moveTo(tipX - nx * th * 1.25, tyY - ny * th * 1.25);
    ctx.lineTo(tipX + nx * th * 1.25, tyY + ny * th * 1.25);
    ctx.stroke();
    line(ctx, .9 * u, U.shade(res.cloth.base, .12, -.02), .8);
    ctx.beginPath();
    ctx.moveTo(tipX - nx * th * 1.15, tyY - ny * th * 1.15 - 1.1 * u);
    ctx.lineTo(tipX + nx * th * 1.15, tyY + ny * th * 1.15 - 1.1 * u);
    ctx.stroke();
    line(ctx, .9 * u, res.cloth.deep, .8);
    ctx.beginPath();
    ctx.moveTo(tipX - nx * th * 1.15, tyY - ny * th * 1.15 + 1.3 * u);
    ctx.lineTo(tipX + nx * th * 1.15, tyY + ny * th * 1.15 + 1.3 * u);
    ctx.stroke();
  }

  function drawBackHair(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var style = res.hairStyleR;
    if (res.coversHair || style === "bald" || style === "receding" || style === "tonsure") return;
    if (style === "longLoose") {
      /* The fall used to be one near-vertical bezier down to a FIXED y,
         which is a curtain: the same slab on every character, hemmed
         flat, and at figure framing a slab in the wrong place entirely
         because 211 is a portrait coordinate. It is stated against the
         head now (hH) and it waves - out past the temple, drawn in at
         the jaw, out again over the shoulder - and it ends in locks
         rather than a hem. */
      var hH = f.chinBottom - f.top;
      var u = f.u;
      var botY = f.chinBottom + hH * .56;
      var side = function (s) {
        var hw = s < 0 ? f.halfL : f.halfR;
        return [
          [f.cx + s * hH * .07, f.top - hH * .075],
          [f.cx + s * (hw + hH * .05), f.top + f.upperFace * .38],
          [f.cx + s * (hw + hH * .175), f.eyeY + hH * .04],
          [f.cx + s * (hw + hH * .105), f.jawY + hH * .04],
          [f.cx + s * (hw + hH * .235), f.chinBottom + hH * .2],
          [f.cx + s * (hw + hH * .175), botY]
        ];
      };
      var hem = [
        [f.cx + hH * .155, botY + hH * .075],
        [f.cx + hH * .06, botY - hH * .035],
        [f.cx, botY + hH * .07],
        [f.cx - hH * .06, botY - hH * .035],
        [f.cx - hH * .155, botY + hH * .075]
      ];
      var lefts = side(-1);
      lefts.reverse();
      ctx.beginPath();
      edgeThrough(ctx, side(1), true);
      edgeThrough(ctx, hem, false);
      edgeThrough(ctx, lefts, false);
      ctx.closePath();
      /* Filled at hairDD - the darkest value in the ramp - the mass
         could not carry a crease: every lock drawn into it was hairDD on
         hairDD, which is nothing at all, and on black hair the whole
         fall was one shape with no interior. It sits between hairD and
         hairDD so the dark marks have somewhere to go. */
      fillStroke(ctx, U.lerpC(res.hairD, res.hairDD, .55),
        U.shade(res.hairDD, -.08, 0), 1.8 * u);

      ctx.save();
      ctx.clip();
      /* Locks, not scratches. Each is a dark crease with its own lit
         ridge beside it, both fading in and out along their length, so
         the mass has a grain instead of six full-length lines ruled
         down it. */
      [-1, 1].forEach(function (s) {
        var hw = s < 0 ? f.halfL : f.halfR;
        var k;
        for (k = 0; k < 3; k += 1) {
          var o = hH * (.035 + k * .058);
          var x0 = f.cx + s * (hH * .1 + o * .4), y0 = f.top + hH * .03;
          var x1 = f.cx + s * (hw * .86 + o), y1 = f.eyeY + hH * .16;
          var x2 = f.cx + s * (hw * .78 + o * 1.3), y2 = botY - hH * .05;
          var d = hH * .022;
          fadeLine(ctx, 1.6 * u, res.hairDD, x0, y0, x2, y2, 0, .08, .6);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.bezierCurveTo(x1, y1, x1 + s * hH * .025, y1 + hH * .2, x2, y2);
          ctx.stroke();
          fadeLine(ctx, 1.6 * u, hairLit(res, .34),
            x0 + s * d, y0, x2 + s * d, y2, 0, .06, .5);
          ctx.beginPath();
          ctx.moveTo(x0 + s * d, y0);
          ctx.bezierCurveTo(x1 + s * d, y1,
            x1 + s * (d + hH * .025), y1 + hH * .2, x2 + s * d, y2);
          ctx.stroke();
        }
      });
      /* the crest of the mass carries one broad sheen, set to the key */
      P.softEllipse(ctx, f.cx + res.lx * f.halfR * .55, f.top + hH * .04,
        f.halfR * .8, hH * .1, hairLit(res, .28), .34);
      /* and the far side of the fall turns away from it */
      P.softEllipse(ctx, f.cx - res.lx * (f.halfR + hH * .1), f.eyeY + hH * .2,
        hH * .14, hH * .38, res.hairDD, .45);
      ctx.restore();
    }
    if (style === "bun") {
      P.fEll(ctx, f.crownX, f.top - 7, 12, 10, res.hairDD);
      line(ctx, 1.5, U.shade(res.hairDD, -.08, 0), .8);
      ctx.beginPath();
      ctx.ellipse(f.crownX, f.top - 7, 12, 10, 0, 0, TAU);
      ctx.stroke();
      /* wound hair: two wrap bands and the swirl where it gathers */
      line(ctx, 1, res.hairD, .8);
      ctx.beginPath();
      ctx.ellipse(f.crownX, f.top - 7, 9, 7.2, .45, TAU * .04, TAU * .48);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(f.crownX, f.top - 7, 9.5, 7, -.4, TAU * .52, TAU * .96);
      ctx.stroke();
      line(ctx, .9, res.hairL, .6);
      ctx.beginPath();
      ctx.arc(f.crownX - res.lx * 3, f.top - 9, 3.2, Math.PI * .8, Math.PI * 1.9);
      ctx.stroke();
    }
  }

  function drawHair(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var style = res.hairStyleR;
    var rng = v.styleRng("illustrated-hair");
    var i;
    if (res.coversHair || style === "bald") return;
    if (style === "receding" || style === "tonsure") {
      var high = style === "tonsure" ? f.top + 18 : f.hairY - 5;
      [-1, 1].forEach(function (side) {
        var edge = side < 0 ? f.left : f.right;
        ctx.beginPath();
        ctx.moveTo(edge, f.eyeY + 4);
        ctx.bezierCurveTo(edge + side * 3, high + 12,
          f.cx + side * (side < 0 ? f.halfL : f.halfR) * .62, high,
          f.cx + side * (side < 0 ? f.halfL : f.halfR) * .42, high + 3);
        ctx.lineTo(f.cx + side * (side < 0 ? f.halfL : f.halfR) * .63, high + 11);
        ctx.quadraticCurveTo(edge - side * 3, f.hairY + 10, edge, f.eyeY + 4);
        ctx.closePath();
        fillStroke(ctx, res.hairD, res.hairDD, 1.5, .85);
        /* what is left is close-cropped: short ticks inside the patch */
        ctx.save();
        ctx.clip();
        line(ctx, .7, res.hairDD, .5);
        for (i = 0; i < 9; i += 1) {
          var tx = edge + side * rng() * 9;
          var ty = U.mix(high + 4, f.eyeY + 2, rng());
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + side * (1 + rng()), ty + 1.5 + rng() * 2);
          ctx.stroke();
        }
        ctx.restore();
      });
      return;
    }

    capPath(ctx, f, style);
    fillStroke(ctx, res.hairD, res.hairDD, 1.8);

    /* curly hair is a silhouette of ringlets, not a cap with bumps:
       turned clusters along the edge and scallops off the fringe */
    if (style === "curly") {
      for (i = 0; i < 11; i += 1) {
        var tt = i / 10;
        var x = U.mix(f.left + 2, f.right - 2, tt);
        var arch = 1 - Math.pow(tt * 2 - 1, 2);
        var y = U.mix(f.hairY - 1, f.top - 5, arch) + (rng() - .5) * 3;
        P.fEll(ctx, x, y, 6 + rng() * 2, 5 + rng() * 2, i & 1 ? res.hairD : res.hairL);
        line(ctx, 1, res.hairDD, .55);
        ctx.beginPath();
        ctx.arc(x, y, 3 + rng() * 2, .1, TAU * .82);
        ctx.stroke();
        line(ctx, .8, res.hairL, .6);
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 1.6 + rng() * 1.4, Math.PI * .9, Math.PI * 1.9);
        ctx.stroke();
      }
      for (i = 0; i < 7; i += 1) {
        P.fEll(ctx, U.mix(f.left + 4, f.right - 4, i / 6) + (rng() - .5) * 2,
          f.hairY + 3 + rng() * 2, 2.6 + rng(), 2.2 + rng(),
          i & 1 ? res.hairD : res.hairDD);
      }
    }

    ctx.save();
    capPath(ctx, f, style);
    ctx.clip();
    /* the underside sits dark against the fringe, and the crown carries
       one broad sheen set toward the light */
    line(ctx, 2.6, res.hairDD, .3);
    ctx.beginPath();
    ctx.moveTo(f.left + 2, f.hairY + 3);
    ctx.quadraticCurveTo(f.cx, f.hairY + 8, f.right - 2, f.hairY + 3);
    ctx.stroke();
    P.softEllipse(ctx, f.cx + res.lx * 9, f.top + 8,
      (f.right - f.left) * .4, 5.5, res.hairL, .34);

    /* strand work is per style: every cut combs its own way */
    if (style === "crop") {
      /* short growth combed forward, the fringe broken into ticks */
      line(ctx, .8, res.hairDD, .55);
      for (i = 0; i < 13; i += 1) {
        var fx = U.mix(f.left + 3, f.right - 3, (i + .5) / 13);
        var fy = f.hairY + 1 + Math.sin(i * 2.7) * 1.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy - 3 - rng() * 2);
        ctx.lineTo(fx + (rng() - .5) * 1.5, fy + 1.5 + rng() * 1.5);
        ctx.stroke();
      }
      line(ctx, .75, res.hairL, .4);
      for (i = 0; i < 8; i += 1) {
        var cxx = U.mix(f.left + 5, f.right - 5, rng());
        ctx.beginPath();
        ctx.moveTo(cxx, f.top + 4 + rng() * 4);
        ctx.quadraticCurveTo(cxx + (f.cx - cxx) * .2, f.hairY - 6,
          cxx + (f.cx - cxx) * .12, f.hairY - 1);
        ctx.stroke();
      }
    } else if (style === "sidePart") {
      /* the mass swept off the part to both sides */
      var part = f.cx + f.halfR * .28;
      line(ctx, .85, res.hairL, .5);
      for (i = 0; i < 7; i += 1) {
        var t4 = (i + .5) / 7;
        ctx.beginPath();
        ctx.moveTo(part - 1, f.top + 3 + t4 * 10);
        ctx.quadraticCurveTo(U.mix(part, f.left, .45), f.top + 8 + t4 * 7,
          U.mix(part, f.left + 4, .82), f.hairY - 1 + t4 * 2.5);
        ctx.stroke();
      }
      line(ctx, .8, res.hairDD, .45);
      for (i = 0; i < 4; i += 1) {
        var t7 = (i + .5) / 4;
        ctx.beginPath();
        ctx.moveTo(part + 1, f.top + 3 + t7 * 9);
        ctx.quadraticCurveTo(U.mix(part, f.right, .4), f.top + 7 + t7 * 7,
          U.mix(part, f.right - 3, .8), f.hairY + t7 * 2);
        ctx.stroke();
      }
    } else if (style === "bun") {
      /* drawn back off the face, every strand gathered to the bun */
      line(ctx, .8, res.hairL, .45);
      for (i = 0; i < 9; i += 1) {
        var sx = U.mix(f.left + 3, f.right - 3, (i + .5) / 9);
        ctx.beginPath();
        ctx.moveTo(sx, f.hairY + 2);
        ctx.quadraticCurveTo(U.mix(sx, f.crownX, .5), f.top + 8,
          f.crownX + (sx - f.cx) * .1, f.top - 3);
        ctx.stroke();
      }
    } else if (style === "braids") {
      line(ctx, 1.1, res.hairDD, .72);
      ctx.beginPath();
      ctx.moveTo(f.crownX, f.top + 1);
      ctx.quadraticCurveTo(f.cx + 1, f.top + 15, f.cx, f.hairY - 3);
      ctx.stroke();
      line(ctx, .8, res.hairL, .44);
      [-1, 1].forEach(function (side) {
        ctx.beginPath();
        ctx.moveTo(f.crownX + side * 2, f.top + 5);
        ctx.quadraticCurveTo(f.cx + side * f.halfL * .38, f.top + 16,
          f.cx + side * f.halfL * .62, f.hairY + 1);
        ctx.stroke();
      });
    } else if (style === "longLoose") {
      line(ctx, .85, res.hairL, .42);
      for (i = 0; i < 8; i += 1) {
        var sx2 = U.mix(f.left + 4, f.right - 4, (i + .5) / 8);
        ctx.beginPath();
        ctx.moveTo(sx2, f.top + 4);
        ctx.quadraticCurveTo(sx2 + (f.cx - sx2) * .14, f.hairY - 5,
          sx2 + (f.cx - sx2) * .06 + (rng() - .5) * 2, f.hairY + 4);
        ctx.stroke();
      }
    } else if (style === "curly") {
      for (i = 0; i < 6; i += 1) {
        line(ctx, .8, i & 1 ? res.hairL : res.hairDD, .5);
        ctx.beginPath();
        ctx.arc(U.mix(f.left + 6, f.right - 6, rng()),
          U.mix(f.top + 6, f.hairY - 4, rng()),
          1.8 + rng() * 1.6, rng() * TAU, rng() * TAU + TAU * .55);
        ctx.stroke();
      }
    } else {
      line(ctx, .8, res.hairL, .5);
      for (i = 0; i < 18; i += 1) {
        var sx3 = U.mix(f.left, f.right, (i + .4) / 18);
        var sy = f.top + 5 + rng() * 17;
        ctx.beginPath();
        ctx.moveTo(sx3, sy);
        ctx.quadraticCurveTo(sx3 + (f.cx - sx3) * .16, f.hairY - 4,
          sx3 + (f.cx - sx3) * .08 + (rng() - .5) * 3, f.hairY + 6);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (style === "sidePart") {
      var partX = f.cx + f.halfR * .25;
      /* the part is a strip of scalp with the mass pressed off it */
      line(ctx, 1, U.shade(res.skin.base, -.02, 0), .75);
      ctx.beginPath();
      ctx.moveTo(partX, f.top + 2);
      ctx.quadraticCurveTo(partX - 2, f.top + 16, partX - 5, f.hairY - 1);
      ctx.stroke();
      line(ctx, 1.5, res.hairDD, .75);
      ctx.beginPath();
      ctx.moveTo(partX + 1.2, f.top + 2);
      ctx.quadraticCurveTo(partX - .8, f.top + 16, partX - 3.8, f.hairY - 1);
      ctx.stroke();
    }
    var hH = f.chinBottom - f.top;
    if (style === "longLoose") {
      /* Hair falling in FRONT of the shoulder used to be six bare
         strokes ruled over the robe, down to a fixed y again. Strokes on
         cloth read as scratches in the cloth, not as hair over it. It is
         a lock now: a mass with its own silhouette, one crease and one
         lit ridge inside it. */
      [-1, 1].forEach(function (s) {
        var hw = s < 0 ? f.halfL : f.halfR;
        var N = 11, ps = [], hs = [], le = [], re = [], k, t;
        for (k = 0; k < N; k += 1) {
          t = k / (N - 1);
          /* it hugs the temple, bellies out over the cheek and falls
             past the jaw - a straight strip of even width was a plank
             of hair leaning on the face */
          ps.push([f.cx + s * (hw * .84 + hH *
            (.012 + Math.sin(t * Math.PI * .9) * .075 + t * .055)),
            f.top + hH * .05 + t * hH * .95]);
          /* and it comes to a point, because a lock ends rather than
             stopping */
          hs.push(hH * .054 * Math.sin(Math.pow(t, .62) * Math.PI) + hH * .004);
        }
        for (k = 0; k < N; k += 1) {
          le.push([ps[k][0] - hs[k], ps[k][1]]);
          re.push([ps[k][0] + hs[k], ps[k][1]]);
        }
        fallPath(ctx, ps, hs);
        /* the lock nearest the viewer is the one nearest the light, and
           on black hair it is the only chance to tell it from the mass
           behind it - hairD and hairDD are the same colour there */
        ctx.fillStyle = U.css(hairLit(res, .07));
        ctx.fill();
        ctx.save();
        fallPath(ctx, ps, hs);
        ctx.clip();
        var a = ps[2], b = ps[N - 3];
        fadeLine(ctx, 1.4 * f.u, res.hairDD, a[0], a[1], b[0], b[1], 0, .06, .34);
        ctx.beginPath();
        ctx.moveTo(a[0] - s * hs[2] * .25, a[1]);
        ctx.quadraticCurveTo(ps[5][0] - s * hs[5] * .35, ps[5][1],
          b[0] - s * hs[N - 3] * .25, b[1]);
        ctx.stroke();
        ctx.restore();
        /* Bounded by its own light rather than by a wire. A closed
           outline in one weight all the way round is what made it read
           as a cut-out strip: hair has a dark turn-under where it meets
           the face and a rim where the key finds it, and neither runs
           to the tip. */
        var inner = s < 0 ? re : le;
        var outer = s < 0 ? le : re;
        fadeLine(ctx, 1.4 * f.u, res.hairDD, inner[1][0], inner[1][1],
          inner[N - 1][0], inner[N - 1][1], .12, .04, .7);
        ctx.beginPath();
        edgeThrough(ctx, inner, true);
        ctx.stroke();
        if (s * res.lx > 0) {
          fadeLine(ctx, 1.3 * f.u, hairLit(res, .34), outer[1][0], outer[1][1],
            outer[N - 1][0], outer[N - 1][1], .06, .04, .58);
        } else {
          fadeLine(ctx, 1.2 * f.u, res.hairDD, outer[1][0], outer[1][1],
            outer[N - 1][0], outer[N - 1][1], .08, .04, .45);
        }
        ctx.beginPath();
        edgeThrough(ctx, outer, true);
        ctx.stroke();
      });
      fringeWisps(ctx, f, res, rng, f.hairY + 3 * f.u, 7);
    }
    if (style === "bun" || style === "curly") {
      fringeWisps(ctx, f, res, rng, f.hairY + 3 * f.u, 6);
    }
    if (style === "braids") {
      /* loose wisps at the temple before the ropes begin */
      line(ctx, .7 * f.u, res.hairD, .6);
      [-1, 1].forEach(function (side) {
        var hw = side < 0 ? f.halfL : f.halfR;
        ctx.beginPath();
        ctx.moveTo(f.cx + side * (hw - 7 * f.u), f.hairY + 2 * f.u);
        ctx.quadraticCurveTo(f.cx + side * (hw - 3 * f.u), f.eyeY - 2 * f.u,
          f.cx + side * (hw - 10 * f.u), f.eyeY + 7 * f.u);
        ctx.stroke();
      });
      fringeWisps(ctx, f, res, rng, f.hairY + 1 * f.u, 5);
      braid(ctx, f.left + 2 * f.u, f.eyeY + 2 * f.u,
        f.torsoY + hH * .24, -1, res, f.u);
      braid(ctx, f.right - 2 * f.u, f.eyeY + 2 * f.u,
        f.torsoY + hH * .24, 1, res, f.u);
    }
  }

  /* The cut, which the resolver picks and the amount only scales.
       reach  how far round the jaw the hair carries, 1 being ear to ear
       cheek  how high it rides, 1 up the cheek and 0 under the lip
       chinW  the width of the mass at the chin
       drop   how far it hangs below the chin, against the amount
       tip    the shape of the bottom edge
       stache the moustache, as a size, 0 for a shaved lip
       droop  how far the moustache ends fall past the mouth line */
  var BEARD = {
    full:      { reach: 1,  cheek: 1,   chinW: 1,    drop: 1,   tip: "round",  stache: 1,    droop: .2 },
    square:    { reach: 1,  cheek: .88, chinW: 1.14, drop: .92, tip: "square", stache: 1,    droop: 0 },
    spade:     { reach: .96, cheek: .94, chinW: 1.06, drop: 1.18, tip: "point", stache: 1.05, droop: .3 },
    forked:    { reach: 1,  cheek: 1,   chinW: .98,  drop: 1.12, tip: "fork",  stache: 1,    droop: .35 },
    goatee:    { reach: .32, cheek: .04, chinW: .8,  drop: 1.2, tip: "point",  stache: .95,  droop: .25 },
    chinstrap: { reach: .92, cheek: .62, chinW: .84, drop: .52, tip: "round",  stache: 0,    droop: 0 },
    chops:     { reach: 1,  cheek: 1,   chinW: 0,    drop: 0,   tip: "chops",  stache: .92,  droop: .8 },
    stache:    { reach: 0,  cheek: 0,   chinW: 0,    drop: 0,   tip: "none",   stache: 1.28, droop: .55 }
  };

  function cutOf(res) {
    return BEARD[res.beardCut] || BEARD.full;
  }

  /* Sideburns carried down the jaw with the chin left bare. Its own path
     because it is the one cut that is two shapes rather than one.
     A chop is anchored at the temple where it meets the hair, widens as
     it comes down, and ENDS on the jaw. Drawn as a strip that tapered to
     a point below the jawline it read as a loose lock of hair hanging
     past the face, which is the opposite of what a chop is. */
  function addChops(ctx, f) {
    var side, ex, jx, top;
    for (side = -1; side <= 1; side += 2) {
      ex = side < 0 ? f.left + 1 : f.right - 1;
      jx = side < 0 ? f.jawL : f.jawR;
      top = f.eyeY + 4;
      ctx.moveTo(ex, top);
      /* the back edge, down the side of the face to the jaw corner */
      ctx.quadraticCurveTo(ex + side, f.jawY - 8, jx + side * 2, f.jawY + 3);
      /* along the jaw toward the chin, and it stops there */
      ctx.quadraticCurveTo(jx - side * 7, f.jawY + 6, jx - side * 13, f.jawY - 3);
      /* the front edge back up to the temple, bellied out at the cheek */
      ctx.quadraticCurveTo(ex - side * 13, f.mouthY - 12, ex - side * 4, top);
      ctx.closePath();
    }
  }

  /* Everything is stated against the chin and pulled out toward the jaw
     by reach, so a goatee is the same construction as a full beard with
     the sides brought in rather than a second path to keep in step.

     The numbers were flat design units, which is the same fault the
     headwear had: 13 units of chin width is a fifth of a portrait face
     and two fifths of a figure's, so a beard that fitted one framing
     was a bib in the other, and a broad face wore a narrow man's beard.
     They are fractions of the face and of the head now.

     The other correction is the taper. A mass that keeps the chin's
     full width all the way down is a rectangle hanging off the jaw,
     which is exactly how the long cuts read. Hair gathers as it falls,
     so the tip narrows against how far it has fallen. */
  /* The face edge at a height. A straight read of the silhouette is
     enough here and it is the piece that was missing: the beard's upper
     corner was pinned to f.left, the WIDEST point of the face, at mouth
     height, where the head has already drawn in to the jaw. The corner
     therefore sat a sixth of a face outside the head and every cut came
     out a wine glass - flared at the cheeks, pinched at the chin. */
  function faceEdgeAt(f, y, s) {
    var wide = s < 0 ? f.left : f.right;
    var jaw = s < 0 ? f.jawL : f.jawR;
    if (y <= f.eyeY) return wide;
    if (y <= f.jawY) {
      return U.mix(wide, jaw,
        U.clamp((y - f.eyeY) / Math.max(1, f.jawY - f.eyeY), 0, 1));
    }
    return U.mix(jaw, f.chinX + s * f.chinSpan,
      U.clamp((y - f.jawY) / Math.max(1, f.chinBottom - f.jawY), 0, 1));
  }

  function addBeard(ctx, f, len, c) {
    var fw = f.right - f.left;
    var hH = f.chinBottom - f.top;
    var top = f.mouthY - hH * .085 + (1 - c.cheek) * hH * .155;
    var lx = U.mix(f.chinX, faceEdgeAt(f, top, -1) - fw * .012, c.reach);
    var rx = U.mix(f.chinX, faceEdgeAt(f, top, 1) + fw * .012, c.reach);
    /* the jaw corner, which is where a beard is actually widest */
    var jlx = U.mix(f.chinX, f.jawL - fw * .025, c.reach);
    var jrx = U.mix(f.chinX, f.jawR + fw * .025, c.reach);
    var w = fw * .215 * c.chinW;
    var jw = fw * .25 * c.chinW;
    var d = len * c.drop;
    var bw = w * U.mix(1, .78, U.clamp(d / (hH * .3), 0, 1));
    var mw = U.mix(w, bw, .5);
    var lip = U.mix(w * .85, fw * .215, c.reach);
    ctx.moveTo(lx, top);
    /* down the side of the face in front of the ear, OUT over the jaw
       corner, and only then in toward the chin */
    ctx.bezierCurveTo(U.mix(lx, jlx, .5) - fw * .012, U.mix(top, f.jawY, .45),
      jlx - fw * .006, f.jawY - hH * .03, jlx, f.jawY + hH * .035);
    ctx.bezierCurveTo(jlx + fw * .012, U.mix(f.jawY, f.chinY, .75),
      f.chinX - jw, f.chinY + d * .22, f.chinX - mw, f.chinY + d * .7);
    if (c.tip === "fork") {
      ctx.quadraticCurveTo(f.chinX - bw * .7, f.chinY + d * 1.05, f.chinX - fw * .05, f.chinY + d);
      ctx.quadraticCurveTo(f.chinX, f.chinY + d * .7, f.chinX + fw * .05, f.chinY + d);
      ctx.quadraticCurveTo(f.chinX + bw * .7, f.chinY + d * 1.05, f.chinX + mw, f.chinY + d * .7);
    } else if (c.tip === "point") {
      ctx.quadraticCurveTo(f.chinX - bw * .55, f.chinY + d * .96, f.chinX, f.chinY + d * 1.3);
      ctx.quadraticCurveTo(f.chinX + bw * .55, f.chinY + d * .96, f.chinX + mw, f.chinY + d * .7);
    } else if (c.tip === "square") {
      ctx.quadraticCurveTo(f.chinX - bw * 1.02, f.chinY + d * .94, f.chinX - bw * .9, f.chinY + d);
      ctx.lineTo(f.chinX + bw * .9, f.chinY + d);
      ctx.quadraticCurveTo(f.chinX + bw * 1.02, f.chinY + d * .94, f.chinX + mw, f.chinY + d * .7);
    } else {
      ctx.quadraticCurveTo(f.chinX, f.chinY + d * 1.06, f.chinX + mw, f.chinY + d * .7);
    }
    ctx.bezierCurveTo(f.chinX + jw, f.chinY + d * .22,
      jrx - fw * .012, U.mix(f.jawY, f.chinY, .75), jrx, f.jawY + hH * .035);
    ctx.bezierCurveTo(jrx + fw * .006, f.jawY - hH * .03,
      U.mix(rx, jrx, .5) + fw * .012, U.mix(top, f.jawY, .45), rx, top);
    /* the upper edge, back under the mouth */
    ctx.quadraticCurveTo(f.mouthX + lip, f.mouthY - hH * .02, f.mouthX, f.mouthY + hH * .042);
    ctx.quadraticCurveTo(f.mouthX - lip, f.mouthY - hH * .02, lx, top);
    ctx.closePath();
  }

  function beardMask(ctx, f, len, c) {
    ctx.beginPath();
    if (c.tip === "chops") addChops(ctx, f);
    else if (c.tip !== "none") addBeard(ctx, f, len, c);
  }

  function drawBeard(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var kind = res.beardKind;
    var c = cutOf(res);
    var rng = v.styleRng("illustrated-beard");
    var u = f.u;
    var fw = f.right - f.left;
    var hH = f.chinBottom - f.top;
    var i, j, t;
    if (kind === "none" || c.tip === "none") return;
    if (kind === "stubble") {
      /* A day's growth is shaped too. Scattering it over the whole jaw
         made every stubbled man the same stubbled man; masking the
         scatter with the cut costs one clip and says which. */
      ctx.save();
      headPath(ctx, f);
      ctx.clip();
      beardMask(ctx, f, hH * .062, c);
      ctx.clip();
      line(ctx, .7 * u, res.hairDD, .34);
      for (i = 0; i < 64; i += 1) {
        var stx = U.mix(f.left + fw * .03, f.right - fw * .03, rng());
        var sty = U.mix(f.mouthY - hH * .125, f.chinY + hH * .06, rng());
        ctx.beginPath();
        ctx.moveTo(stx, sty);
        ctx.lineTo(stx + (rng() - .5) * 1.4 * u, sty + (1.3 + rng()) * u);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    var len = hH * (kind === "short" ? .052 : kind === "full" ? .177 : .354);

    /* A chinstrap is a band of hair hugging the jaw from sideburn to
       sideburn, not a small beard. Its own construction. Three strokes
       of one even weight read as the strap of a helmet, so it swells
       under the chin the way the hair actually does and carries its own
       growth rather than being a smooth ribbon. */
    if (res.beardCut === "chinstrap") {
      var strap = function (dy, w2) {
        ctx.beginPath();
        ctx.moveTo(f.left + 1 * u, f.eyeY + 2 * u + dy);
        ctx.quadraticCurveTo(f.jawL - 4 * u, f.jawY - 6 * u + dy,
          f.jawL + 1 * u, f.jawY + 2 * u + dy);
        ctx.quadraticCurveTo(f.chinX, f.chinY + 5 * u + dy,
          f.jawR - 1 * u, f.jawY + 2 * u + dy);
        ctx.quadraticCurveTo(f.jawR + 4 * u, f.jawY - 6 * u + dy,
          f.right - 1 * u, f.eyeY + 2 * u + dy);
        if (w2) ctx.stroke();
      };
      line(ctx, 4.4 * u, res.hairDD, .9);
      strap(0, 1);
      /* the swell under the jaw, where a chinstrap is heaviest */
      line(ctx, 5.4 * u, res.hairDD, .9);
      ctx.beginPath();
      ctx.moveTo(f.jawL + 1 * u, f.jawY + 1 * u);
      ctx.quadraticCurveTo(f.chinX, f.chinY + 5.5 * u, f.jawR - 1 * u, f.jawY + 1 * u);
      ctx.stroke();
      line(ctx, 3.4 * u, U.lerpC(res.hairD, res.hairDD, .3), 1);
      ctx.stroke();
      line(ctx, 2.8 * u, U.lerpC(res.hairD, res.hairDD, .3), 1);
      strap(0, 1);
      line(ctx, .8 * u, hairLit(res, .24), .5);
      strap(-1 * u, 1);
      if (fine()) {
        for (i = 0; i < 18; i += 1) {
          t = (i + .5) / 18;
          var cxb = U.mix(f.jawL, f.jawR, t);
          var cyb = U.mix(f.jawY + 2 * u, f.chinY + 4 * u,
            1 - Math.abs(t * 2 - 1)) + (rng() - .5) * 2 * u;
          line(ctx, .75 * u, i % 3 ? res.hairDD : hairLit(res, .2), .4);
          ctx.beginPath();
          ctx.moveTo(cxb, cyb - 2 * u);
          ctx.lineTo(cxb + (rng() - .5) * 1.4 * u, cyb + 1.6 * u);
          ctx.stroke();
        }
      }
      return;
    }

    /* The mass used to be one flat fill with a half-card rectangle of
       shadow over it and texture strokes in hairL. On a black beard,
       which is the commonest, hairL IS the fill, so nothing at all was
       visible: a hole in the shape of a beard. It gets what any large
       form gets - a lit plane turned to the key, a core shadow away
       from it, a rim along the lit silhouette, and an edge against skin
       that is hair rather than vector. */
    var base = U.lerpC(res.hairD, res.hairDD, .34);
    var lit = hairLit(res, .26);
    var topY = f.mouthY - hH * .085 + (1 - c.cheek) * hH * .145;
    var botY = f.chinY + len * c.drop;
    var jawMid = (f.jawY + f.chinY) * .5;
    beardMask(ctx, f, len, c);
    fillStroke(ctx, base, res.hairDD, 1.8 * u);

    ctx.save();
    beardMask(ctx, f, len, c);
    ctx.clip();
    /* the plane turned away from the key, and the deep under the chin
       where the mass turns under itself */
    var shX = f.chinX - res.lx * fw * .3;
    P.softEllipse(ctx, shX, jawMid, fw * .34, hH * .2, res.hairDD, .5);
    P.softEllipse(ctx, f.chinX, botY - hH * .01,
      fw * .2 * c.chinW, len * .5 + hH * .03, res.hairDD, .42);
    /* the lit plane, off the key-side jaw and gathering to the chin */
    if (c.tip !== "chops") {
      softRun(ctx,
        [[f.chinX + res.lx * fw * .42, topY + hH * .02],
        [f.chinX + res.lx * fw * .34, jawMid],
        [f.chinX + res.lx * fw * .2, f.chinY],
        [f.chinX + res.lx * fw * .08, botY - len * .5]],
        fw * .12, fw * .06, .34, .14, lit, 9);
    }

    /* Growth has a direction field: swept down and forward off the
       cheeks, gathering toward the chin, then falling straight off it.
       Two passes, dark texture then lit strands on the light side. */
    if (c.tip === "chops") {
      [-1, 1].forEach(function (side) {
        var jx = side < 0 ? f.jawL : f.jawR;
        var ex = side < 0 ? f.left + 3 * u : f.right - 3 * u;
        var pass2;
        for (pass2 = 0; pass2 < 2; pass2 += 1) {
          line(ctx, .9 * u, pass2 ? lit : res.hairDD, pass2 ? .42 : .35);
          for (j = 0; j < 12; j += 1) {
            t = rng();
            var bx = U.mix(ex, jx + side * 4 * u, t * .75) + (rng() - .5) * 4 * u;
            var by = U.mix(f.eyeY + 6 * u, f.jawY + 4 * u, t);
            if (pass2 && side * res.lx < 0) continue;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + side * (1 + rng() * 1.5) * u, by + (3 + rng() * 3) * u);
            ctx.stroke();
          }
        }
      });
    } else {
      var pass;
      for (pass = 0; pass < 2; pass += 1) {
        line(ctx, .95 * u, pass ? lit : res.hairDD, pass ? .42 : .34);
        for (j = 0; j < (pass ? 18 : 34); j += 1) {
          t = rng();
          var y = U.mix(topY, botY, t);
          var span = U.mix((fw - fw * .1) * c.reach, fw * .26 * c.chinW, t);
          var x = f.chinX + (rng() * 2 - 1) * span * .5;
          if (pass && (x - f.chinX) * res.lx < 0) continue;
          var toward = (f.chinX - x) * .16 * (1 - t * .5);
          var dl = (4 + t * 4) * u + t * len * .18 + rng() * 2 * u;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + toward * .4 + (rng() - .5) * 1.6 * u, y + dl * .5,
            x + toward + (rng() - .5) * 1.8 * u, y + dl);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    /* The rim: the outline again, but only where the key strikes it, so
       the silhouette is lit on one side and lost on the other instead of
       being wired all the way round in one weight. */
    ctx.save();
    ctx.beginPath();
    if (res.lx > 0) ctx.rect(f.cx, f.top, f.right - f.cx + fw * .3, hH * 2);
    else ctx.rect(f.left - fw * .3, f.top, f.cx - f.left + fw * .3, hH * 2);
    ctx.clip();
    beardMask(ctx, f, len, c);
    line(ctx, 1.1 * u, lit, .5);
    ctx.stroke();
    ctx.restore();

    /* Where the beard meets skin it is not an edge, it is hair thinning
       out. Softened along the cheek line, then crossed by a few hairs. */
    if (c.tip !== "chops" && c.reach > .5) {
      [-1, 1].forEach(function (side) {
        var ex = f.chinX + side * (f.right - f.chinX) * c.reach * .92;
        softRun(ctx,
          [[ex, topY + hH * .012],
          [U.mix(ex, f.chinX, .3), topY + hH * .04],
          [U.mix(ex, f.chinX, .62), f.mouthY + hH * .016],
          [f.chinX + side * fw * .1, f.mouthY + hH * .052]],
          fw * .035, fw * .025, .13, .06, base, 8);
      });
      if (fine()) {
        for (i = 0; i < 14; i += 1) {
          t = (i + .5) / 14;
          var side2 = i & 1 ? 1 : -1;
          var ex2 = f.chinX + side2 * U.mix(fw * .12, (f.right - f.chinX) * c.reach * .9, t);
          var ey2 = U.mix(f.mouthY + hH * .04, topY + hH * .015, t);
          line(ctx, .75 * u, i % 3 ? base : res.hairDD, .3 + rng() * .25);
          ctx.beginPath();
          ctx.moveTo(ex2, ey2);
          ctx.lineTo(ex2 + (rng() - .5) * 2 * u - side2 * u, ey2 - (1.5 + rng() * 2.5) * u);
          ctx.stroke();
        }
      }
    }

    /* the cut's signature marks sit on top of the texture */
    if (c.tip === "fork") {
      var df = len * c.drop;
      ctx.fillStyle = U.css(res.skin.base);
      ctx.beginPath();
      ctx.moveTo(f.chinX - fw * .04, f.chinY + df * .78);
      ctx.quadraticCurveTo(f.chinX, f.chinY + df * .68,
        f.chinX + fw * .04, f.chinY + df * .78);
      ctx.lineTo(f.chinX, f.chinY + df * 1.02);
      ctx.closePath();
      ctx.fill();
      line(ctx, .7 * u, res.skin.deep, .4);
      ctx.beginPath();
      ctx.moveTo(f.chinX, f.chinY + df * .72);
      ctx.lineTo(f.chinX, f.chinY + df * .96);
      ctx.stroke();
    }
    if (c.tip === "point" || c.tip === "fork") {
      /* a spade or a fork is parted down the middle and combed apart */
      line(ctx, .7 * u, res.hairDD, .4);
      ctx.beginPath();
      ctx.moveTo(f.chinX, f.mouthY + hH * .06);
      ctx.quadraticCurveTo(f.chinX + 1 * u, f.chinY,
        f.chinX, f.chinY + len * c.drop * .7);
      ctx.stroke();
    }
    if (c.tip === "square") {
      /* trimmed flat along the bottom edge */
      line(ctx, .9 * u, lit, .3);
      ctx.beginPath();
      ctx.moveTo(f.chinX - fw * .165 * c.chinW, f.chinY + len * c.drop * .9);
      ctx.quadraticCurveTo(f.chinX, f.chinY + len * c.drop * .96,
        f.chinX + fw * .165 * c.chinW, f.chinY + len * c.drop * .9);
      ctx.stroke();
    }
    /* A long beard does not end in a hem either: a few hairs carry past
       the silhouette. Kept SHORT and stated in head units - run out to
       a fraction of the beard's own length they hung off the tip like
       drips, which is worse than the clean edge they replaced. */
    if (len > hH * .1 && c.tip !== "chops" && c.tip !== "square" && fine()) {
      var tipW = fw * .215 * c.chinW *
        U.mix(1, .78, U.clamp(len * c.drop / (hH * .3), 0, 1));
      for (i = 0; i < 5; i += 1) {
        t = (i + .5) / 5;
        var lxp = f.chinX + (t * 2 - 1) * tipW * .72;
        /* the arch across the tip is in head units, not in a fraction of
           the beard's own length - tied to the length the outer hairs
           started a third of a beard higher and the whole edge frayed */
        var lyp = botY - Math.abs(t * 2 - 1) * hH * .022;
        line(ctx, 1.1 * u, i & 1 ? base : res.hairDD, .7);
        ctx.beginPath();
        ctx.moveTo(lxp, lyp - 3.5 * u);
        ctx.quadraticCurveTo(lxp + (rng() - .5) * 1.4 * u, lyp,
          lxp + (rng() - .5) * 2 * u, lyp + (1.2 + rng() * 1.6) * u);
        ctx.stroke();
      }
    }
  }

  function drawMustache(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var c = cutOf(res);
    if (res.beardKind === "none" || res.beardKind === "stubble" || !c.stache) return;
    var s = c.stache;
    var u = f.u;
    var fw = f.right - f.left;
    var hH = f.chinBottom - f.top;
    /* The same base the beard is filled with, not a value of its own.
       Drawn a shade apart it read as a separate black object laid over
       the lip, with a seam where the two met - which is most of why the
       big cuts looked pasted on. It is one mass now, told apart from
       the beard by its lit top edge and the dark under it. */
    var color = U.lerpC(res.hairD, res.hairDD, .34);
    var lit = hairLit(res, .28);
    /* A moustache worn alone is a styled thing: thicker, covering the
       lip line, its ends turned. Under a beard it stays a wing. */
    var solo = c.tip === "none";
    var thick = solo ? 1.55 : 1;
    /* Worn over a beard the wing has to stop INSIDE the beard's own
       upper edge. Reaching past it, the two made a T with a notch of
       bare skin under each tip, which is most of why the big cuts read
       as a black shape stuck on the lip. */
    var W = fw * (solo ? .23 : .185) * s;  /* how far the wing reaches */
    var T = hH * .054 * thick;             /* how deep it sits */
    var tipY = f.mouthY - hH * .01 + hH * .073 * c.droop;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.moveTo(f.mouthX + side * fw * .01, f.mouthY - T);
      ctx.bezierCurveTo(f.mouthX + side * W * .5, f.mouthY - T * 1.34,
        f.mouthX + side * W * .86, f.mouthY - T * .96, f.mouthX + side * W, tipY);
      ctx.bezierCurveTo(f.mouthX + side * W * .57,
        f.mouthY - (solo ? hH * .026 : hH * .006),
        f.mouthX + side * W * .29, f.mouthY - (solo ? hH * .005 : -hH * .006),
        f.mouthX + side * fw * .01, f.mouthY - T * .38);
      ctx.closePath();
      ctx.fillStyle = U.css(color);
      ctx.fill();
      /* the upper surface catches the key, the lip edge stays dark: two
         marks, and the wing has a form instead of a silhouette */
      fadeLine(ctx, 1.1 * u, lit, f.mouthX, 0, f.mouthX + side * W, 0,
        .1, .12, side * res.lx > 0 ? .6 : .28);
      ctx.beginPath();
      ctx.moveTo(f.mouthX + side * fw * .02, f.mouthY - T * .92);
      ctx.quadraticCurveTo(f.mouthX + side * W * .55, f.mouthY - T * 1.22,
        f.mouthX + side * W * .9, f.mouthY - T * .55);
      ctx.stroke();
      /* combed outward from the parting */
      line(ctx, .7 * u, lit, .4);
      var mi;
      for (mi = 0; mi < 3; mi += 1) {
        var mt = (mi + 1) / 3.5;
        ctx.beginPath();
        ctx.moveTo(f.mouthX + side * (fw * .033 + W * .64 * mt),
          f.mouthY - T * 1.04 + mt * hH * .015);
        ctx.quadraticCurveTo(f.mouthX + side * (fw * .066 + W * .71 * mt),
          f.mouthY - T * .77,
          f.mouthX + side * (fw * .082 + W * .71 * mt),
          f.mouthY - hH * .027 + mt * c.droop * hH * .031);
        ctx.stroke();
      }
      /* the turned end of a styled moustache, or the long fall of one
         worn with chops */
      if (solo) {
        line(ctx, 1.5 * u, color, 1);
        ctx.beginPath();
        ctx.moveTo(f.mouthX + side * W * .96, tipY - hH * .004);
        ctx.quadraticCurveTo(f.mouthX + side * W * 1.11, tipY + hH * .004,
          f.mouthX + side * W * 1.07, tipY - hH * .019);
        ctx.stroke();
      } else if (c.droop > .6) {
        line(ctx, 1.2 * u, color, .95);
        ctx.beginPath();
        ctx.moveTo(f.mouthX + side * W * .97, tipY - hH * .008);
        ctx.quadraticCurveTo(f.mouthX + side * W * 1.04, tipY + hH * .021,
          f.mouthX + side * W * .99, tipY + hH * .044);
        ctx.stroke();
      }
    });
    /* the parting under the nose */
    line(ctx, .7 * u, res.hairDD, .5);
    ctx.beginPath();
    ctx.moveTo(f.mouthX, f.mouthY - T * 1.04);
    ctx.lineTo(f.mouthX, f.mouthY - hH * .025);
    ctx.stroke();
  }

  /* Dome and band take their lift and height in head units, so a hat is
     the same fraction of the skull whatever the framing asks for. */
  function domePath(ctx, f, yBot, lift) {
    var u = f.u;
    lift *= u;
    ctx.beginPath();
    ctx.moveTo(f.left - 2 * u, yBot);
    ctx.bezierCurveTo(f.left - 2 * u, f.top + 12 * u,
      f.crownX - 18 * u, f.top - lift, f.crownX, f.top - lift);
    ctx.bezierCurveTo(f.crownX + 18 * u, f.top - lift,
      f.right + 2 * u, f.top + 12 * u, f.right + 2 * u, yBot);
    ctx.quadraticCurveTo(f.cx, yBot - 6 * u, f.left - 2 * u, yBot);
    ctx.closePath();
  }

  function band(ctx, f, y, height, color, edge) {
    var u = f.u;
    height *= u;
    ctx.beginPath();
    ctx.moveTo(f.left - 3 * u, y);
    ctx.quadraticCurveTo(f.cx, y - 6 * u, f.right + 3 * u, y);
    ctx.lineTo(f.right + 2 * u, y + height);
    ctx.quadraticCurveTo(f.cx, y + height - 5 * u, f.left - 2 * u, y + height);
    ctx.closePath();
    fillStroke(ctx, color, edge || U.shade(color, -.25, 0), 1.3, .76);
  }

  /* ---------- the headdress ----------
     Headwear sits on the skull, so every offset here is in head units
     (u). Written as flat design-space numbers a crown band, a turban
     stack and a cap brim all came out half again as deep on a figure's
     smaller head, which is what buried the forehead.

     One drawer per type, keyed by the id in the core table. The dispatch
     is what makes the table safe to grow: a type this style has not been
     written for is looked up a second time under its base id, which is
     one of the eleven this style started with, so a new entry in the
     table can never render a character bare-headed here.

     Each drawer is handed the four knobs, already turned into the numbers
     it builds from, and the variant to draw. A knob a type has no use for
     is simply not read - controls can dim those from the same table. */

  function k01(x) { return x === undefined ? .5 : U.clamp(x, 0, 1); }

  /* `fit` is the only knob with a sign: at .5 a piece sits exactly where
     it always sat, below that it rides back off the brow, above it is
     pulled down over it. The other three come out as plain multipliers so
     each drawer can state its own baseline and let the knob scale that,
     rather than every drawer having to agree on absolute numbers. */
  function hwKnobs(f, res) {
    var fit = k01(res.hwFit), vol = k01(res.hwVolume);
    var drape = k01(res.hwDrape), trim = k01(res.hwTrim);
    return {
      u: f.u,
      hh: f.chinBottom - f.top,
      fit: fit,
      drop: (fit - .5) * 11 * f.u,
      vol: vol,
      lift: U.mix(.5, 1.6, vol),
      drape: drape,
      fall: U.mix(.4, 1.5, drape),
      trim: trim,
      /* how much ornament a piece carries: none, a little, a lot */
      studs: trim < .22 ? 0 : trim < .62 ? 1 : 2
    };
  }

  /* A fur band is a band with the pile showing. The same sweep, but the
     lower edge is broken into lobes and a few hairs cross it: without
     those two it is felt, whatever colour it is painted. */
  function furBand(ctx, f, y, h, color) {
    var u = f.u, i, n = 10, t, x, yb;
    band(ctx, f, y, h, color, U.shade(color, -.32, 0));
    for (i = 0; i <= n; i += 1) {
      t = i / n;
      x = U.mix(f.left - 2 * u, f.right + 2 * u, t);
      yb = y + h * u - Math.sin(t * Math.PI) * 4 * u;
      P.fEll(ctx, x, yb, 3.6 * u, 2.7 * u,
        i & 1 ? color : U.shade(color, .12, -.02), .95);
    }
    if (!fine()) return;
    line(ctx, .8 * u, U.shade(color, -.34, .02), .45);
    for (i = 0; i < n; i += 1) {
      t = (i + .5) / n;
      x = U.mix(f.left - 1 * u, f.right + 1 * u, t);
      ctx.beginPath();
      ctx.moveTo(x, y + 2 * u);
      ctx.lineTo(x + (i & 1 ? 1.6 : -1.6) * u, y + h * u - 1 * u);
      ctx.stroke();
    }
  }

  /* A brim seen nearly front on is an ellipse the head sits in, wider
     than it is deep. `out` is how far it reaches past the face, `tilt`
     lifts the front edge (a pilgrim's hat is worn turned up). */
  function brimPath(ctx, f, y, out, tilt) {
    var u = f.u;
    var l = f.left - out * u, r = f.right + out * u;
    ctx.beginPath();
    ctx.moveTo(l, y);
    ctx.quadraticCurveTo(f.cx, y + (12 - tilt) * u, r, y);
    ctx.quadraticCurveTo(f.cx, y - (8 + tilt) * u, l, y);
    ctx.closePath();
  }

  /* Crossed diagonals, which is a net as soon as there are enough of
     them. The caller clips it to whatever it is stretched over. */
  function netFill(ctx, f, y0, y1, step, color) {
    var u = f.u, x, span = y1 - y0;
    line(ctx, .7 * u, color, .5);
    for (x = f.left - span - 8 * u; x < f.right + span + 8 * u; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + span, y1);
      ctx.moveTo(x, y1);
      ctx.lineTo(x + span, y0);
      ctx.stroke();
    }
  }

  function hwCirclet(ctx, f, res, colors, K, vr) {
    var u = K.u, y = f.hairY + 1 * u + K.drop;
    band(ctx, f, y - 1 * u, 5, GOLD, U.shade(GOLD, -.3, 0));
    if (vr === "gemmed" && K.studs) {
      [-1, 0, 1].forEach(function (i) {
        P.gemDot(ctx, f.cx + i * f.halfR * .52, y + (i ? 1.4 * u : 0),
          (i ? 1.7 : 2.6) * u, i ? [136, 62, 58] : [42, 104, 108]);
      });
    } else if (K.studs) {
      P.gemDot(ctx, f.cx, y, 2.6 * u, [42, 104, 108]);
    }
  }

  /* The rim both crowns wear: four points over three valleys. Stated as
     data so the volume knob can raise the points and a fleuron can round
     off the same tips a spiked crown leaves sharp. */
  function crownRim(ctx, f, y, rise, round) {
    var u = f.u;
    var pk = [[f.left, 13], [f.cx - 10 * u, 20], [f.cx + 11 * u, 20], [f.right, 13]];
    var vl = [[f.left + 10 * u, 4], [f.cx, 5], [f.right - 10 * u, 4]];
    var i, tx, ty;
    ctx.beginPath();
    ctx.moveTo(f.left - 3 * u, y + 5 * u);
    for (i = 0; i < pk.length; i += 1) {
      tx = pk[i][0];
      ty = y - pk[i][1] * u * rise;
      if (round) {
        /* a fleuron is a lily, so the tip is a lobe and not a spike */
        ctx.quadraticCurveTo(tx - 5 * u, ty - 3 * u, tx, ty);
        ctx.quadraticCurveTo(tx + 5 * u, ty - 3 * u, tx + 3.5 * u, y - 2 * u);
      } else {
        ctx.lineTo(tx, ty);
      }
      if (i < vl.length) ctx.lineTo(vl[i][0], y - vl[i][1] * u);
    }
    ctx.lineTo(f.right + 3 * u, y + 5 * u);
    ctx.closePath();
  }

  function hwCrown(ctx, f, res, colors, K, vr) {
    var u = K.u, y = f.hairY + 1 * u + K.drop;
    crownRim(ctx, f, y, K.lift, vr === "fleurons");
    fillStroke(ctx, GOLD, U.shade(GOLD, -.32, 0), 1.7);
    band(ctx, f, y + 1 * u, 6, GOLD, U.shade(GOLD, -.32, 0));
    if (K.studs) P.gemDot(ctx, f.cx, y + 3 * u, 2.7 * u, [62, 76, 148]);
    if (K.studs > 1) {
      P.gemDot(ctx, f.cx - f.halfL * .62, y + 4 * u, 1.8 * u, [136, 62, 58]);
      P.gemDot(ctx, f.cx + f.halfR * .62, y + 4 * u, 1.8 * u, [136, 62, 58]);
    }
  }

  function hwImperial(ctx, f, res, colors, K, vr) {
    var u = K.u, y = f.hairY + 1 * u + K.drop;
    var cap = colors.capRed || [124, 34, 42];
    domePath(ctx, f, y + 2 * u, 9 * K.lift);
    fillStroke(ctx, cap, [70, 24, 30], 1.5);
    /* what makes it imperial rather than royal: the cap is closed over,
       by an arch across it or by the two lobes of a mitred crown */
    if (vr === "mitred") {
      line(ctx, 2.2 * u, GOLD, 1);
      ctx.beginPath();
      ctx.moveTo(f.cx, y + 1 * u);
      ctx.lineTo(f.cx, y - 15 * u * K.lift);
      ctx.stroke();
    } else {
      line(ctx, 2.4 * u, GOLD, 1);
      ctx.beginPath();
      ctx.moveTo(f.left + 2 * u, y - 1 * u);
      ctx.quadraticCurveTo(f.cx, y - 26 * u * K.lift, f.right - 2 * u, y - 1 * u);
      ctx.stroke();
      P.fEll(ctx, f.cx, y - 20 * u * K.lift, 2.6 * u, 2.6 * u, GOLD_L, 1);
    }
    hwCrown(ctx, f, res, colors, K, vr === "mitred" ? "fleurons" : "points");
  }

  function hwHelm(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var yBot = f.eyeY - 7 * u + K.drop;
    domePath(ctx, f, yBot, 6 * K.lift);
    fillStroke(ctx, STEEL, [54, 62, 68], 1.8);
    ctx.save();
    domePath(ctx, f, yBot, 6 * K.lift);
    ctx.clip();
    ctx.fillStyle = U.css(STEEL_L, .35);
    ctx.fillRect(f.cx + res.lx * 6 * u, f.top - 12 * u, 16 * u * res.lx,
      f.eyeY - f.top + 14 * u);
    if (vr === "banded") {
      /* a spangenhelm is plates on a frame, and the frame is what a
         viewer reads: a ridge over the crown and a rib each side */
      line(ctx, 2.2 * u, U.shade(STEEL, -.22, 0), .9);
      [-1, 0, 1].forEach(function (i) {
        ctx.beginPath();
        ctx.moveTo(f.cx + i * f.halfR * .62, yBot + 2 * u);
        ctx.quadraticCurveTo(f.cx + i * f.halfR * .3, f.top - 2 * u,
          f.cx + i * 2 * u, f.top - 5 * u * K.lift);
        ctx.stroke();
      });
    }
    ctx.restore();
    band(ctx, f, f.eyeY - 10 * u + K.drop, 6,
      U.shade(STEEL, -.1, 0), [48, 54, 60]);
    if (vr === "faceplate") {
      /* the great helm: the face is steel to below the nose, with a slit
         at the eyes and breaths punched under it */
      var top = f.eyeY - 6 * u + K.drop;
      var bot = f.A.noseBase[1] + 6 * u;
      ctx.beginPath();
      ctx.moveTo(f.left + 1 * u, top);
      ctx.lineTo(f.right - 1 * u, top);
      ctx.quadraticCurveTo(f.right - 3 * u, bot, f.chinX, bot + 3 * u);
      ctx.quadraticCurveTo(f.left + 3 * u, bot, f.left + 1 * u, top);
      ctx.closePath();
      fillStroke(ctx, U.shade(STEEL, -.06, 0), [48, 54, 60], 1.6);
      ctx.fillStyle = U.css([28, 26, 28], .92);
      ctx.fillRect(f.left + 4 * u, f.eyeY - 2 * u, f.halfL * .78, 3.4 * u);
      ctx.fillRect(f.cx + f.halfR * .18, f.eyeY - 2 * u, f.halfR * .78, 3.4 * u);
      if (fine()) {
        var b;
        for (b = 0; b < 5; b += 1) {
          P.fEll(ctx, f.cx + (b - 2) * 4 * u, f.A.noseBase[1] - 1 * u,
            1.1 * u, 1.6 * u, [40, 40, 44], .8);
        }
      }
      return;
    }
    ctx.fillStyle = U.css(U.shade(STEEL, -.05, 0));
    ctx.fillRect(f.cx - 2.3 * u, f.eyeY - 8 * u + K.drop, 4.6 * u,
      f.A.noseBase[1] - f.eyeY + 13 * u);
  }

  function hwCoif(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var mail = vr === "mail";
    var cloth = mail ? U.shade(STEEL, -.08, 0) : LINEN;
    var yBot = f.hairY + 6 * u + K.drop;
    domePath(ctx, f, yBot, 2 * K.lift);
    fillStroke(ctx, cloth, mail ? [52, 58, 64] : [116, 108, 96], 1.6);
    if (mail) {
      /* mail is one texture and one silhouette: rings over the skull, and
         a hood of it round the jaw, which is the shape of a coif */
      ctx.save();
      domePath(ctx, f, yBot, 2 * K.lift);
      ctx.clip();
      netFill(ctx, f, f.top - 4 * u, yBot, 4.5 * u, U.shade(STEEL, -.3, 0));
      ctx.restore();
      /* stated once and issued twice, because a fill consumes the path
         and the clip needs it again - the same shape the gown uses */
      function jawHood() {
        ctx.beginPath();
        ctx.moveTo(f.left - 1 * u, f.eyeY - 4 * u);
        ctx.bezierCurveTo(f.left - 3 * u, f.jawY + 6 * u,
          f.chinX - 10 * u, f.chinY + 8 * u, f.chinX, f.chinY + 9 * u);
        ctx.bezierCurveTo(f.chinX + 10 * u, f.chinY + 8 * u,
          f.right + 3 * u, f.jawY + 6 * u, f.right + 1 * u, f.eyeY - 4 * u);
        ctx.lineTo(f.right + 6 * u, f.jawY);
        ctx.quadraticCurveTo(f.chinX, f.chinY + 20 * u, f.left - 6 * u, f.jawY);
        ctx.closePath();
      }
      jawHood();
      fillStroke(ctx, cloth, [52, 58, 64], 1.5);
      ctx.save();
      jawHood();
      ctx.clip();
      netFill(ctx, f, f.eyeY, f.chinY + 18 * u, 4.5 * u, U.shade(STEEL, -.3, 0));
      ctx.restore();
      return;
    }
    band(ctx, f, f.hairY + K.drop, 4, U.shade(LINEN, -.04, 0), [116, 108, 96]);
  }

  function hoodEdge(ctx, f, K, wide) {
    var u = K.u;
    ctx.beginPath();
    ctx.moveTo(f.left - 5 * u, f.jawY + 12 * u);
    ctx.bezierCurveTo(f.left - 18 * u * wide, f.eyeY - 18 * u,
      f.left - 8 * u, f.top - 8 * u * K.lift, f.cx, f.top - 13 * u * K.lift);
    ctx.bezierCurveTo(f.right + 8 * u, f.top - 8 * u * K.lift,
      f.right + 18 * u * wide, f.eyeY - 18 * u, f.right + 5 * u, f.jawY + 12 * u);
  }

  function hwHood(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var cloth = colors.hoodC || res.cloth.dark;
    if (vr === "back") {
      /* thrown back off the head: nothing crosses the brow, and what a
         viewer sees of it is the roll of cloth behind the neck, which
         drawBackCostume has already laid in. Only the near edge of the
         opening belongs in front. */
      line(ctx, 7 * u, U.shade(cloth, .04, 0), 1);
      ctx.beginPath();
      ctx.moveTo(f.left - 4 * u, f.jawY + 14 * u);
      ctx.quadraticCurveTo(f.chinX, f.chinY + 26 * u, f.right + 4 * u,
        f.jawY + 14 * u);
      ctx.stroke();
      line(ctx, 1.5, res.cloth.deep, .7);
      ctx.stroke();
      return;
    }
    line(ctx, 9 * u, U.shade(cloth, .08, 0), 1);
    hoodEdge(ctx, f, K, 1);
    ctx.stroke();
    line(ctx, 1.7, res.cloth.deep, .8);
    ctx.stroke();
  }

  function hwChaperon(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var cloth = colors.hoodC || res.cloth.base;
    if (vr === "rolled") {
      /* worn as a hat: the opening rolled into a doughnut round the
         skull, the cape bunched to one side and the tail hanging. The
         roll is a fat band with its own coil marks. */
      var y = f.hairY + 2 * u + K.drop;
      domePath(ctx, f, y + 6 * u, 3 * K.lift);
      fillStroke(ctx, U.shade(cloth, -.1, .02), res.cloth.deep, 1.5);
      line(ctx, 11 * u * K.lift, cloth, 1);
      ctx.beginPath();
      ctx.moveTo(f.left - 4 * u, y + 2 * u);
      ctx.quadraticCurveTo(f.cx, y - 11 * u * K.lift, f.right + 4 * u, y + 2 * u);
      ctx.stroke();
      line(ctx, 1.5, res.cloth.deep, .75);
      ctx.stroke();
      if (fine()) {
        line(ctx, 1 * u, U.shade(cloth, -.24, .02), .5);
        var i;
        for (i = -2; i <= 2; i += 1) {
          ctx.beginPath();
          ctx.moveTo(f.cx + i * f.halfR * .38, y - 8 * u * K.lift);
          ctx.lineTo(f.cx + i * f.halfR * .38 + 3 * u, y + 2 * u);
          ctx.stroke();
        }
      }
      return;
    }
    /* worn as a hood, and the liripipe is the point of it - the tail is
       drawn behind, so here it is the hood proper with the shoulder cape
       showing at the jaw */
    line(ctx, 9 * u, U.shade(cloth, .06, 0), 1);
    hoodEdge(ctx, f, K, 1.1);
    ctx.stroke();
    line(ctx, 1.7, res.cloth.deep, .8);
    ctx.stroke();
    line(ctx, 1.2, U.shade(cloth, -.2, .02), .55);
    ctx.beginPath();
    ctx.moveTo(f.left - 9 * u, f.eyeY + 2 * u);
    ctx.quadraticCurveTo(f.left - 4 * u, f.top + 4 * u, f.cx - 4 * u, f.top - 8 * u);
    ctx.stroke();
  }

  function hwVeil(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var veil = colors.veilC || LINEN;
    var yBot = f.hairY + 6 * u + K.drop;
    domePath(ctx, f, yBot, 5 * K.lift);
    fillStroke(ctx, veil, U.shade(veil, -.22, 0), 1.5);
    if (vr === "pinned") {
      /* pinned back at the temple: one fold crossing the crown and the
         pin that holds it, instead of the loose front edge */
      line(ctx, 1.3, U.shade(veil, -.26, .02), .7);
      ctx.beginPath();
      ctx.moveTo(f.left + 1 * u, f.hairY + 4 * u + K.drop);
      ctx.quadraticCurveTo(f.cx + 6 * u, f.top + 2 * u,
        f.right - 2 * u, f.hairY - 1 * u + K.drop);
      ctx.stroke();
      if (K.studs) {
        P.gemDot(ctx, f.right - 4 * u, f.hairY + 1 * u + K.drop, 1.8 * u,
          res.tier >= 4 ? GOLD_L : [136, 62, 58]);
      }
      return;
    }
    band(ctx, f, f.hairY + 1 * u + K.drop, 5,
      res.tier >= 4 && K.studs ? GOLD : U.shade(veil, -.08, 0));
  }

  function hwWimple(ctx, f, res, colors, K, vr) {
    var u = K.u;
    hwVeil(ctx, f, res, colors, K, "fall");
    /* the bib: up over the jaw and down the throat, and how far down is
       the drape knob - a wimple can be a collar or a chest of linen */
    var deep = K.fall;
    ctx.beginPath();
    ctx.moveTo(f.jawL - 3 * u, f.jawY);
    ctx.quadraticCurveTo(f.chinX, f.chinY + 13 * u, f.jawR + 3 * u, f.jawY);
    ctx.lineTo(f.throatX + 18 * u, f.throatY + 8 * u * deep);
    ctx.quadraticCurveTo(f.throatX, f.throatY + 17 * u * deep,
      f.throatX - 18 * u, f.throatY + 8 * u * deep);
    ctx.closePath();
    fillStroke(ctx, LINEN, [116, 108, 96], 1.4);
    if (vr === "banded") {
      /* a second turn of linen, clear of the veil's own band rather than
         a hair's breadth under it, which reads as one thick band */
      band(ctx, f, f.hairY + 6 * u + K.drop, 4, U.shade(LINEN, -.1, .01));
    }
  }

  function hwTurban(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var turban = colors.turbanC || [224, 214, 192];
    var top = f.top - (K.lift - 1) * 8 * u;
    domePath(ctx, f, f.hairY + 9 * u + K.drop, 12 * K.lift);
    fillStroke(ctx, turban, U.shade(turban, -.24, 0), 1.7);
    band(ctx, f, top + 9 * u, 8, U.shade(turban, -.08, .01));
    band(ctx, f, top + 20 * u, 8, turban);
    band(ctx, f, f.hairY + 1 * u + K.drop, 8, U.shade(turban, -.04, 0));
    line(ctx, 1.2, U.shade(turban, .22, 0), .65);
    ctx.beginPath();
    ctx.moveTo(f.cx - 3 * u, top - 8 * u);
    ctx.quadraticCurveTo(f.cx + 7 * u, top + 10 * u,
      f.cx + 2 * u, f.hairY + 8 * u + K.drop);
    ctx.stroke();
    if (res.tier >= 5 && K.studs) {
      P.gemDot(ctx, f.cx + 2 * u, f.hairY + 2 * u + K.drop, 2.6 * u, [42, 104, 82]);
    }
  }

  function hwCap(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var felt = colors.felt || [92, 70, 54];
    var y = f.hairY + K.drop;
    if (vr === "brimmed") {
      brimPath(ctx, f, y + 4 * u, 7, 0);
      fillStroke(ctx, U.shade(felt, -.14, 0), U.shade(felt, -.34, 0), 1.6);
    }
    domePath(ctx, f, y + 4 * u, 8 * K.lift);
    fillStroke(ctx, felt, U.shade(felt, -.26, 0), 1.7);
    band(ctx, f, y, 5, U.shade(felt, -.08, 0));
    if (K.studs > 1) {
      /* the badge a merchant pins on it, on the lit side */
      P.gemDot(ctx, f.cx + res.lx * f.halfR * .6, y - 1 * u, 1.9 * u, GOLD_L);
    }
  }

  function hwKerchief(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var cloth = colors.veilC || U.shade(LINEN, -.07, .03);
    var y = f.hairY + 3 * u + K.drop;
    domePath(ctx, f, y + 4 * u, 3);
    fillStroke(ctx, cloth, U.shade(cloth, -.28, 0), 1.5);
    line(ctx, 1.1, U.shade(cloth, -.22, 0), .6);
    ctx.beginPath();
    ctx.moveTo(f.left - 1 * u, y + 2 * u);
    ctx.quadraticCurveTo(f.cx, y - 5 * u, f.right + 1 * u, y + 2 * u);
    ctx.stroke();
    if (vr === "chin") {
      /* tied under the chin: the two edges run down past the cheeks and
         meet in a knot below the jaw, which frames the face */
      ctx.beginPath();
      ctx.moveTo(f.left - 1 * u, y + 1 * u);
      ctx.bezierCurveTo(f.left - 4 * u, f.jawY, f.chinX - 12 * u,
        f.chinY + 6 * u, f.chinX - 2 * u, f.chinY + 10 * u);
      ctx.lineTo(f.chinX + 2 * u, f.chinY + 10 * u);
      ctx.bezierCurveTo(f.chinX + 12 * u, f.chinY + 6 * u,
        f.right + 4 * u, f.jawY, f.right + 1 * u, y + 1 * u);
      ctx.lineTo(f.right + 5 * u, f.eyeY - 2 * u);
      ctx.bezierCurveTo(f.right + 4 * u, f.jawY + 8 * u, f.chinX + 8 * u,
        f.chinY + 16 * u, f.chinX, f.chinY + 17 * u);
      ctx.bezierCurveTo(f.chinX - 8 * u, f.chinY + 16 * u,
        f.left - 4 * u, f.jawY + 8 * u, f.left - 5 * u, f.eyeY - 2 * u);
      ctx.closePath();
      fillStroke(ctx, cloth, U.shade(cloth, -.28, 0), 1.4);
      P.fEll(ctx, f.chinX, f.chinY + 14 * u, 4.6 * u, 3.4 * u,
        U.shade(cloth, .06, -.01), 1);
      line(ctx, 1, U.shade(cloth, -.3, 0), .6);
      ctx.beginPath();
      ctx.moveTo(f.chinX - 3 * u, f.chinY + 12 * u);
      ctx.quadraticCurveTo(f.chinX, f.chinY + 16 * u, f.chinX + 3 * u,
        f.chinY + 12 * u);
      ctx.stroke();
      return;
    }
    /* knotted at the nape: the knot sits at the jaw on the shadow side
       and the tails fall behind, which drawBackCostume lays in */
    var kx = f.cx + res.sx * (f.halfR + 3 * u);
    P.fEll(ctx, kx, f.jawY + 2 * u, 4.2 * u, 3.2 * u,
      U.shade(cloth, .05, -.01), 1);
    line(ctx, 1, U.shade(cloth, -.3, 0), .55);
    ctx.beginPath();
    ctx.moveTo(kx - 3 * u, f.jawY);
    ctx.quadraticCurveTo(kx, f.jawY + 3 * u, kx + 3 * u, f.jawY);
    ctx.stroke();
  }

  function hwFillet(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var cloth = U.shade(LINEN, -.02, .01);
    var y = f.hairY + 2 * u + K.drop;
    if (vr === "barbette") {
      /* the barbette is the strap that passes under the chin, and it goes
         on before the band that covers its ends */
      line(ctx, 5 * u, cloth, 1);
      ctx.beginPath();
      ctx.moveTo(f.left + 1 * u, y + 2 * u);
      ctx.bezierCurveTo(f.left - 2 * u, f.jawY + 2 * u,
        f.chinX - 10 * u, f.chinY + 9 * u, f.chinX, f.chinY + 10 * u);
      ctx.bezierCurveTo(f.chinX + 10 * u, f.chinY + 9 * u,
        f.right + 2 * u, f.jawY + 2 * u, f.right - 1 * u, y + 2 * u);
      ctx.stroke();
      line(ctx, 1, [150, 142, 126], .55);
      ctx.stroke();
    }
    band(ctx, f, y, 5, cloth, [146, 138, 122]);
    if (K.studs) {
      /* a gold band over the linen, which is how a lady of station wears
         a fillet rather than a servant */
      band(ctx, f, y + 1 * u, 2, GOLD, U.shade(GOLD, -.3, 0));
    }
    if (K.studs > 1) {
      P.gemDot(ctx, f.cx, y + 2 * u, 1.8 * u, [136, 62, 58]);
    }
  }

  function hwStrawHat(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var straw = [206, 178, 112];
    var y = f.hairY + 2 * u + K.drop;
    var pilgrim = vr === "pilgrim";
    brimPath(ctx, f, y + 5 * u, pilgrim ? 12 : 16, pilgrim ? 7 : 0);
    fillStroke(ctx, straw, U.shade(straw, -.3, .04), 1.7);
    if (fine()) {
      /* plaited straw: rings round the brim, not a flat wash */
      ctx.save();
      brimPath(ctx, f, y + 5 * u, pilgrim ? 12 : 16, pilgrim ? 7 : 0);
      ctx.clip();
      line(ctx, .8 * u, U.shade(straw, -.24, .04), .45);
      var r;
      for (r = 4; r <= 16; r += 4) {
        ctx.beginPath();
        ctx.ellipse(f.cx, y + 5 * u, f.halfR + r * u, (3 + r * .5) * u, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    domePath(ctx, f, y + 4 * u, (pilgrim ? 9 : 5) * K.lift);
    fillStroke(ctx, U.shade(straw, .04, -.01), U.shade(straw, -.3, .04), 1.6);
    band(ctx, f, y + 1 * u, 4, U.shade(straw, -.16, .03));
    if (pilgrim) {
      /* the badge, and the cord under the chin that keeps it on the road */
      if (K.studs) {
        P.fEll(ctx, f.cx + res.lx * f.halfR * .55, y - 1 * u, 2.6 * u, 3 * u,
          [176, 178, 184], 1);
        line(ctx, .9, [96, 100, 106], .8);
        ctx.beginPath();
        ctx.moveTo(f.cx + res.lx * f.halfR * .55, y - 3.6 * u);
        ctx.lineTo(f.cx + res.lx * f.halfR * .55, y + 1.6 * u);
        ctx.stroke();
      }
      line(ctx, 1.1, [122, 104, 78], .8);
      ctx.beginPath();
      ctx.moveTo(f.left - 2 * u, y + 8 * u);
      ctx.quadraticCurveTo(f.chinX, f.chinY + 14 * u, f.right + 2 * u, y + 8 * u);
      ctx.stroke();
    }
  }

  function hwFurHat(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var felt = colors.felt || U.shade(res.cloth.base, -.06, .02);
    var fur = [96, 80, 66];
    var y = f.hairY + 1 * u + K.drop;
    var tall = vr === "tall" ? 1.6 : 1;
    domePath(ctx, f, y + 5 * u, 10 * K.lift * tall);
    fillStroke(ctx, felt, U.shade(felt, -.3, 0), 1.7);
    if (vr === "tall" && fine()) {
      /* a tall crown needs one crease or it reads as a bucket */
      line(ctx, 1.1, U.shade(felt, -.22, .02), .5);
      ctx.beginPath();
      ctx.moveTo(f.cx - 4 * u, f.top - 8 * u * K.lift * tall);
      ctx.quadraticCurveTo(f.cx + 3 * u, f.top + 6 * u, f.cx - 1 * u, y + 2 * u);
      ctx.stroke();
    }
    furBand(ctx, f, y, 7, fur);
    if (K.studs > 1) P.gemDot(ctx, f.cx, y - 2 * u, 2 * u, GOLD_L);
  }

  function hwMitre(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var cloth = [238, 233, 222];
    var y = f.hairY + 2 * u + K.drop;
    var h = 42 * u * K.lift;
    /* front on, a mitre is a pointed arch rising off its band */
    ctx.beginPath();
    ctx.moveTo(f.left - 1 * u, y + 3 * u);
    ctx.bezierCurveTo(f.left + 1 * u, y - h * .46,
      f.cx - 9 * u, y - h * .84, f.cx, y - h);
    ctx.bezierCurveTo(f.cx + 9 * u, y - h * .84,
      f.right - 1 * u, y - h * .46, f.right + 1 * u, y + 3 * u);
    ctx.closePath();
    fillStroke(ctx, cloth, [166, 158, 142], 1.7);
    if (vr === "orphrey") {
      /* the orphreys: the gold band up the middle and the one across the
         base, which is the whole difference between a plain linen mitre
         and a bishop in his second best */
      line(ctx, 4 * u, GOLD, 1);
      ctx.beginPath();
      ctx.moveTo(f.cx, y + 2 * u);
      ctx.lineTo(f.cx, y - h * .94);
      ctx.stroke();
      line(ctx, 1, U.shade(GOLD, -.34, 0), .7);
      ctx.stroke();
      if (K.studs) {
        P.gemDot(ctx, f.cx, y - h * .5, 2.1 * u, [62, 76, 148]);
        if (K.studs > 1) P.gemDot(ctx, f.cx, y - h * .76, 1.6 * u, [136, 62, 58]);
      }
    }
    band(ctx, f, y, 6, vr === "orphrey" ? GOLD : U.shade(cloth, -.1, .02));
  }

  function hwGarland(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var y = f.hairY + 1 * u + K.drop;
    var n = vr === "laurel" ? 9 : 8;
    var leaf = [92, 118, 74];
    var i, t, x, yy, side;
    /* the ring itself: a thin stem, then what is tied to it */
    line(ctx, 1.4 * u, U.shade(leaf, -.24, .04), .8);
    ctx.beginPath();
    ctx.moveTo(f.left - 2 * u, y + 1 * u);
    ctx.quadraticCurveTo(f.cx, y - 6 * u, f.right + 2 * u, y + 1 * u);
    ctx.stroke();
    for (i = 0; i <= n; i += 1) {
      t = i / n;
      x = U.mix(f.left - 2 * u, f.right + 2 * u, t);
      yy = y + 1 * u - Math.sin(t * Math.PI) * 7 * u;
      side = i & 1 ? 1 : -1;
      if (vr === "laurel") {
        P.fEll(ctx, x, yy - 1.5 * u, 3.4 * u, 1.5 * u,
          i & 1 ? leaf : U.shade(leaf, .12, -.03), .95, side * .5);
        P.fEll(ctx, x, yy + 1.5 * u, 3.2 * u, 1.4 * u,
          U.shade(leaf, -.14, .03), .95, -side * .5);
      } else {
        P.fEll(ctx, x, yy, 2 * u, 1.6 * u, U.shade(leaf, -.06, .02), .95);
        P.fEll(ctx, x, yy - 1.4 * u, 2.4 * u, 2.2 * u,
          i % 3 ? [232, 226, 208] : res.accent, .95);
        if (K.studs) {
          P.fEll(ctx, x, yy - 1.4 * u, .9 * u, .9 * u, [214, 186, 96], 1);
        }
      }
    }
  }

  function hwCrespine(ctx, f, res, colors, K, vr) {
    var u = K.u;
    var y = f.hairY + 5 * u + K.drop;
    /* the caul holds the hair, so what is inside it is hair and not
       linen: fill with the character's own dark and net over it */
    domePath(ctx, f, y, 4 * K.lift);
    fillStroke(ctx, res.hairD, U.shade(res.hairDD, -.1, 0), 1.4);
    ctx.save();
    domePath(ctx, f, y, 4 * K.lift);
    ctx.clip();
    netFill(ctx, f, f.top - 6 * u, y, 6 * u, GOLD);
    if (K.studs > 1 && fine()) {
      /* a pearl at the crossings, which is what a crespine is for */
      var gx, gy;
      for (gy = f.top - 2 * u; gy < y; gy += 6 * u) {
        for (gx = f.left; gx < f.right; gx += 6 * u) {
          P.fEll(ctx, gx, gy, 1.1 * u, 1.1 * u, [238, 232, 220], .9);
        }
      }
    }
    ctx.restore();
    band(ctx, f, f.hairY + 1 * u + K.drop, 4,
      vr === "filleted" ? GOLD : U.shade(LINEN, -.06, .01));
  }

  var HEADDRESS_DRAW = {
    circlet: hwCirclet,
    crown: hwCrown,
    imperial: hwImperial,
    helm: hwHelm,
    coif: hwCoif,
    hood: hwHood,
    veil: hwVeil,
    wimple: hwWimple,
    turban: hwTurban,
    cap: hwCap,
    kerchief: hwKerchief,
    fillet: hwFillet,
    strawHat: hwStrawHat,
    chaperon: hwChaperon,
    furHat: hwFurHat,
    mitre: hwMitre,
    garland: hwGarland,
    crespine: hwCrespine
  };

  function drawHeadwear(v, f, colors) {
    var res = v.res;
    var draw = HEADDRESS_DRAW[res.headwearR] ||
      HEADDRESS_DRAW[res.headwearBase];
    if (!draw) return;
    draw(v.ctx, f, res, colors, hwKnobs(f, res), res.headwearVariantR);
  }

  function beginIntent(ctx, it) {
    ctx.save();
    ctx.globalAlpha *= it.visibility === undefined ? 1 : it.visibility;
    if (it.angle) {
      ctx.translate(it.x, it.y);
      ctx.rotate(it.angle);
      ctx.translate(-it.x, -it.y);
    }
  }

  function illustratedIntents(v, g, f) {
    var it = YO.modes.meshIntents(v, g);
    var res = v.res;
    var faceW = f.right - f.left;
    var lowerFace = f.chinBottom - f.eyeY;
    /* Stylisation against apparent size. A face drawn at 37 px cannot
       carry the same proportions as one at 96: the features have to take
       more of the face to survive, the way any illustrator draws a small
       head. This is a deliberate exaggeration, not a correction - it is
       gated on BOLD so a portrait is untouched. */
    var grow = 1 + (f.bold - 1) * .26;
    var rawMid = (it.eyes[0].x + it.eyes[1].x) * .5;
    var eyeMid = U.clamp(rawMid, f.cx - faceW * .055, f.cx + faceW * .055);
    var spacingT = U.clamp((res.eyeSpacing - .85) / .3, 0, 1);
    var eyeHalfGap = faceW * (.17 + spacingT * .045);
    var eyeTilt = U.clamp((it.eyes[1].y - it.eyes[0].y) * .5, -2.2, 2.2);
    var eyeY = U.clamp((it.eyes[0].y + it.eyes[1].y) * .5,
      f.eyeY - 1.5, f.eyeY + 1.5);
    it.eyes[0].x = eyeMid - eyeHalfGap;
    it.eyes[1].x = eyeMid + eyeHalfGap;
    it.eyes[0].y = eyeY - eyeTilt;
    it.eyes[1].y = eyeY + eyeTilt;
    it.eyes.forEach(function (e) {
      e.w *= grow;
      e.h *= grow;
      e.faceW = faceW;
      e.bold = f.bold;
    });

    it.brows.forEach(function (b, i) {
      var eye = it.eyes[i];
      b.x = eye.x;
      /* stated against the eye's own height, so the brow keeps its
         distance when the eye grows for a small head */
      b.y = eye.y - U.clamp(eye.h * 1.55 + res.browWeight * 1.3,
        eye.h * 1.3, faceW * .125);
      b.len = U.clamp(eye.w * 1.28, 5.5, faceW * .145);
      b.bold = f.bold;
    });

    /* The base of the nose is bounded ONCE, here, and the bound travels
       with the intent. The painter used to take this clamped tip, call
       the distance down to it a "raw length", and scale that again by
       noseLen and by kind - which walks straight back out of the bound,
       so a long broad nose came to rest on the upper lip. */
    var noseMinY = eyeY + lowerFace * .32;
    var noseMaxY = eyeY + lowerFace * .50;
    it.nose.x = U.clamp(it.nose.x, eyeMid - faceW * .055, eyeMid + faceW * .055);
    it.nose.y = U.clamp(it.nose.y, noseMinY, noseMaxY);
    it.nose.bridgeY = eyeY + faceW * .016;
    it.nose.minY = noseMinY;
    it.nose.maxY = noseMaxY;
    it.nose.faceW = faceW;
    it.nose.w *= grow;
    it.nose.bold = f.bold;
    it.nose.tip = [
      U.clamp(it.nose.tip[0], it.nose.x - faceW * .03, it.nose.x + faceW * .03),
      U.clamp(it.nose.tip[1], noseMinY, noseMaxY)
    ];

    it.mouth.x = U.clamp(it.mouth.x, f.chinX - faceW * .045, f.chinX + faceW * .045);
    it.mouth.y = U.clamp(it.mouth.y,
      eyeY + lowerFace * .63, eyeY + lowerFace * .78);
    it.mouth.w = U.clamp(it.mouth.w * grow, faceW * .105, faceW * .175);
    it.mouth.faceW = faceW;
    it.mouth.bold = f.bold;
    return it;
  }

  /* Eyes carry the portrait, so the four shapes are four constructions
     rather than the same oval at four heights:
       0 round    a tall aperture, the iris nearly a full circle
       1 almond   wide, the corners pulled to points, the apex outward
       2 hooded   a heavy lid folds over and shades the top of the iris
       3 upturned the outer corner lifted, the lower lid rising to it */
  function illustratedEyes(v, intents) {
    var ctx = v.ctx;
    var res = v.res;
    var sizeT = U.clamp((res.eyeSize - .8) / .45, 0, 1);
    var shape = U.byteOf(res.hash[0], 21) % 4;
    intents.forEach(function (e) {
      beginIntent(ctx, e);
      /* The eye's own bounds are stated against the face, not in flat
         design units. Fixed 4.4-to-8 limits are portrait numbers: on a
         figure's smaller face the floor alone would have handed every
         character the same enormous eye. */
      var fw = e.faceW || 61;
      var w = U.clamp(e.w * (.76 + sizeT * .4), fw * .072, fw * .131);
      if (shape === 1) w *= 1.14;
      if (shape === 2) w *= .95;
      var h = U.clamp(e.h * (.62 + sizeT * .34), fw * .039, fw * .075);
      h *= shape === 0 ? 1.22 : shape === 1 ? .9 : shape === 2 ? .78 : .88;
      /* a hood narrows the aperture but never below the iris it holds */
      if (shape === 2) h = Math.max(h, 3.2);
      var asym = res.asymmetry * e.side * 18;
      /* the two corners of the eye in local space */
      var ix = e.x - e.side * w, ox = e.x + e.side * w;
      var iy = e.y + e.side * asym + h * (shape === 3 ? .3 : .12);
      var oy = e.y - e.side * asym +
        (shape === 3 ? -h * .55 : shape === 2 ? h * .34 : -h * .08);
      /* the apex of the upper lid sits outward on almond and upturned */
      var apexX = e.x + e.side * w * (shape === 1 || shape === 3 ? .22 : 0);
      var topC = shape === 2 ? h * .82 : shape === 0 ? h * 1.18 :
        shape === 3 ? h * 1.12 : h * 1.02;
      var botC = shape === 0 ? h * .95 : shape === 2 ? h * .62 : h * .62;
      var botX = e.x + e.side * w * (shape === 3 ? .4 : .05);

      /* the socket. skin.deep carries a saturation and a red hue shift,
         so a blob of it this size hung an orange ring round both eyes on
         every fair face. The socket is a shadow, so it takes the shadow. */
      P.softEllipse(ctx, e.x, e.y + .4, w * 1.15, h * 1.45,
        res.skin.shadow, shape === 2 ? .22 : .15);

      /* the aperture, kept as a path: everything wet is drawn inside it */
      function aperture() {
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.quadraticCurveTo(apexX, e.y - topC, ox, oy);
        ctx.quadraticCurveTo(botX, e.y + botC, ix, iy);
        ctx.closePath();
      }
      aperture();
      ctx.fillStyle = U.css([238, 231, 214]);
      ctx.fill();

      ctx.save();
      aperture();
      ctx.clip();
      /* the white is not white: it turns away at both corners and sits
         under the lid's shadow, and a flat one reads as a sticker */
      P.softEllipse(ctx, apexX, e.y - h * .62, w * .85, h * .55,
        res.skin.shadow, shape === 2 ? .22 : .13);
      P.softEllipse(ctx, ix + e.side * w * .16, e.y, w * .34, h * .8,
        res.skin.shadow, .16);
      P.softEllipse(ctx, ox - e.side * w * .2, e.y, w * .3, h * .8,
        res.skin.shadow, .12);

      /* The iris is sized off the eye's WIDTH, not its aperture height,
         because that is what an iris is: about a third of the eye
         across, with the lids cropping however much of it they cover.
         Taking it from the height gave a hooded or almond eye a tiny
         iris to match its narrow opening, so those two shapes read as
         squints with a bead in them rather than as eyes half covered.
         Drawn inside the aperture clip, the crop does that work. */
      var iris = U.clamp(w * (.36 + sizeT * .05), fw * .031, fw * .066);
      var icx = e.x + e.side * w * (shape === 3 ? .06 : 0);
      var icy = e.y + (shape === 2 ? h * .3 : h * .12);
      P.fEll(ctx, icx, icy, iris, iris, U.shade(res.eye, -.34, .04), .96);
      P.fEll(ctx, icx, icy, iris * .86, iris * .86, res.eye, .98);
      /* the iris lit from the far side of the pupil, as a lens is */
      P.fEll(ctx, icx - res.lx * iris * .2, icy + iris * .2,
        iris * .58, iris * .5, U.shade(res.eye, .13, .03), .75);
      P.fEll(ctx, icx, icy, iris * .38, iris * .38, [26, 20, 20]);
      /* the catchlight rides on the wet surface, so it is placed against
         the key and is allowed to break the limbal ring - but a lid over
         it hides it, which is what makes a hooded eye read as hooded */
      P.fEll(ctx, icx + res.lx * iris * .46, icy - iris * .44,
        iris * .26 + .2, iris * .24 + .2, [252, 247, 231], .96);
      ctx.restore();

      /* a hooded lid is a fold of skin drawn over the iris */
      if (shape === 2) {
        ctx.beginPath();
        ctx.moveTo(ix - .4, iy - .8);
        ctx.quadraticCurveTo(apexX, e.y - h * 1.5, ox + .6, oy - 1);
        ctx.quadraticCurveTo(apexX + e.side, e.y - h * .44, ix, iy + .2);
        ctx.closePath();
        ctx.fillStyle = U.css(U.shade(res.skin.base, -.045, 0), .97);
        ctx.fill();
        line(ctx, .8, res.skin.deep, .5);
        ctx.beginPath();
        ctx.moveTo(ix, iy - .4);
        ctx.quadraticCurveTo(apexX + e.side * .5, e.y - h * .5, ox + .4, oy - .8);
        ctx.stroke();
      }

      /* The lash line is a MASS, not a stroke: it starts as nothing at
         the tear duct, carries its weight over the outer half, and dies
         again at the corner or runs on as a wing. Stroked at one width
         it laid a bar of even ink across the eye, which is most of why
         the narrow builds read as squints. */
      var wing = shape === 1 || shape === 3 ? w * .22 : 0;
      var lashW = (e.lash ? .95 : .68) + w * .08;
      var LS = 12;
      var lp = [], lh = [], li, lt, hw;
      for (li = 0; li < LS; li += 1) {
        lt = li / (LS - 1);
        hw = lashW * (.16 + .84 * Math.sin(Math.PI * Math.pow(lt, .78)));
        lp.push([qPt(ix, apexX, ox, lt), qPt(iy, e.y - topC, oy, lt) - hw * .32]);
        lh.push(hw);
      }
      if (wing) {
        lp.push([ox + e.side * wing, oy - h * .3]);
        lh.push(lashW * .22);
      }
      ribbon(ctx, lp, lh);
      ctx.fillStyle = U.css(e.lash ? res.hairDD : res.skin.line, .88);
      ctx.fill();

      /* The lower lid is a LIT margin with its own shadow beneath it. A
         second dark line parallel to the lash turned every eye into two
         stacked dashes with a bead between them. */
      fadeLine(ctx, .58, res.skin.lit,
        ix, iy + .5, ox, oy + .6, .04, .06, .18);
      ctx.beginPath();
      ctx.moveTo(ix + e.side * w * .3, iy + .5);
      ctx.quadraticCurveTo(botX, e.y + botC + .8, ox - e.side * w * .2, oy + .6);
      ctx.stroke();
      line(ctx, .65, res.skin.deep, .3);
      ctx.beginPath();
      ctx.moveTo(ix + e.side * w * .36, iy + 1.6);
      ctx.quadraticCurveTo(botX, e.y + botC + 2.1, ox - e.side * w * .24, oy + 1.5);
      ctx.stroke();

      if (e.lash) {
        line(ctx, .62, res.hairDD, .7);
        for (li = 0; li < 3; li += 1) {
          lt = .56 + li * .17;
          var lx0 = qPt(ix, apexX, ox, lt);
          var ly0 = qPt(iy, e.y - topC, oy, lt) - lashW * .5;
          ctx.beginPath();
          ctx.moveTo(lx0, ly0);
          ctx.quadraticCurveTo(lx0 + e.side * (.7 + li * .2), ly0 - .9,
            lx0 + e.side * (1.4 + li * .35), ly0 - 1.5 - li * .25);
          ctx.stroke();
        }
      }

      /* the crease, which follows the lid rather than floating above it */
      if (shape !== 2 && w > fw * .072 && fine()) {
        fadeLine(ctx, .65, res.skin.deep,
          ix, iy - 2, ox, oy - 1.8, .06, .1, .34);
        ctx.beginPath();
        ctx.moveTo(ix + e.side * w * .18, iy - 1.9 - lashW);
        ctx.quadraticCurveTo(apexX, e.y - topC - 1.8 - lashW,
          ox - e.side * w * .1, oy - 1.6 - lashW * .6);
        ctx.stroke();
      }

      /* the tear duct, a warm point at the inner corner */
      ctx.fillStyle = U.css(res.skin.blush, .55);
      ctx.beginPath();
      ctx.arc(ix + e.side * .4, iy + .2, .72, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  }

  /* one axis of a quadratic bezier at t - used to walk a curve that has
     already been drawn, so a mark laid along it cannot drift off it */
  function qPt(a, c, b, t) {
    var mt = 1 - t;
    return mt * mt * a + 2 * mt * t * c + t * t * b;
  }

  /* An edge drawn through sampled points, smoothed by aiming each
     quadratic at the sample and landing on the midpoint to the next, so
     a dozen samples do not read as a polygon. */
  function edgeThrough(ctx, ps, start) {
    var i, n = ps.length;
    if (start) ctx.moveTo(ps[0][0], ps[0][1]);
    else ctx.lineTo(ps[0][0], ps[0][1]);
    for (i = 1; i < n - 1; i += 1) {
      ctx.quadraticCurveTo(ps[i][0], ps[i][1],
        (ps[i][0] + ps[i + 1][0]) * .5, (ps[i][1] + ps[i + 1][1]) * .5);
    }
    ctx.lineTo(ps[n - 1][0], ps[n - 1][1]);
  }

  /* A ribbon of varying thickness around a sampled centreline. Feature
     masses that TAPER - brows, lips, lashes - cannot be stated as one
     closed bezier without hand-tuning both edges against each other. */
  function ribbon(ctx, pts, half) {
    var top = [], bot = [], i;
    for (i = 0; i < pts.length; i += 1) {
      top.push([pts[i][0], pts[i][1] - half[i]]);
      bot.push([pts[i][0], pts[i][1] + half[i]]);
    }
    bot.reverse();
    ctx.beginPath();
    edgeThrough(ctx, top, true);
    edgeThrough(ctx, bot, false);
    ctx.closePath();
  }

  /* Brows are tapered ribbons, and the three kinds are three
     constructions:
       0 arched  a court arch, apex just past the middle, long fine tail
       1 swept   a straight rise off the head, broken at two thirds
       2 bar     heavy and nearly level, the soldier's bar

     A brow is thick at the head and dies to a point at the tail. Drawn
     with two hand-fitted beziers it came out an even slab with a blunt
     inner cut, which is why the heavy ones read as birds pasted over
     the eyes. The ribbon carries the taper, and the head is squared by
     its own hairs rather than by the outline. */
  function illustratedBrows(v, intents) {
    var ctx = v.ctx;
    var res = v.res;
    var kind = U.byteOf(res.hash[0], 22) % 3;
    var SAMPLES = 13;
    intents.forEach(function (b) {
      beginIntent(ctx, b);
      var th = .95 + b.weight * 1.5;
      /* A brow is not centred on the eye. It begins about level with the
         inner canthus and runs well past the outer one, so the head sits
         inboard by less than the tail runs out. Centred, two heavy brows
         on a narrow face met over the nose in one bar. */
      var hx = b.x - b.side * b.len * .82, hy = b.y + b.innerDy;
      var tx = b.x + b.side * b.len * (kind === 2 ? 1.08 : 1.18);
      var peakT = kind === 1 ? .66 : kind === 0 ? .56 : .44;
      var rise = kind === 2 ? 1.15 : U.clamp(1.7 + b.weight * 1.1, 1.7, 2.9);
      var drop = kind === 0 ? 1.3 : kind === 1 ? .9 : .45;
      var taper = kind === 2 ? .72 : .8;
      var pts = [], half = [], i, t;
      for (i = 0; i < SAMPLES; i += 1) {
        t = i / (SAMPLES - 1);
        var y;
        if (t <= peakT) {
          var u = t / peakT;
          /* the swept brow climbs straight, the others ease into the arch */
          y = hy - rise * (kind === 1 ? u : U.smoothstep(0, 1, u));
        } else {
          y = hy - rise + drop * U.smoothstep(0, 1, (t - peakT) / (1 - peakT));
        }
        pts.push([U.mix(hx, tx, t), y]);
        half.push(th * (1 - taper * Math.pow(t, 1.25)) *
          (kind === 2 ? 1.12 : 1) * U.clamp(.66 + t * 5, 0, 1));
      }
      /* the shadow the brow ridge throws onto the lid */
      P.softEllipse(ctx, U.mix(hx, tx, .5), hy + th + 1.4,
        b.len * .8, th * 1.2, res.skin.shadow, .12 + b.weight * .08);
      ribbon(ctx, pts, half);
      ctx.fillStyle = U.css(b.color, .93);
      ctx.fill();
      /* The head is roughened by its own hairs, which is what makes a
         brow read as hair rather than as a painted mark. They are kept
         short and mostly inside the mass: standing proud of it they
         turned every heavy brow into a comb. */
      line(ctx, .42, U.shade(b.color, b.weight > .6 ? -.1 : .1, 0),
        .2 + b.weight * .2);
      var hi;
      for (hi = 0; hi < 3; hi += 1) {
        var ht = hi / 2;
        var hgi = Math.round(ht * .18 * (SAMPLES - 1));
        var hpx = pts[hgi][0] - b.side * .4;
        var hpy = pts[hgi][1];
        ctx.beginPath();
        ctx.moveTo(hpx, hpy + half[hgi] * .7);
        ctx.quadraticCurveTo(hpx + b.side * .25, hpy,
          hpx + b.side * .8, hpy - half[hgi] * .8);
        ctx.stroke();
      }
      /* and a grain laid ALONG the arch, following it rather than
         crossing it - crossing strokes read as hatching, not as hair,
         and at portrait size two whispers do more than five marks */
      if (b.weight > .7 && fine()) {
        line(ctx, .38, U.shade(b.color, .2, -.02), .16);
        for (hi = 0; hi < 2; hi += 1) {
          var g0 = Math.round((.22 + hi * .1) * (SAMPLES - 1));
          var g1 = Math.round((.66 + hi * .14) * (SAMPLES - 1));
          var gm = Math.round((g0 + g1) * .5);
          var gy = hi ? .42 : -.42;
          ctx.beginPath();
          ctx.moveTo(pts[g0][0], pts[g0][1] + gy * half[g0]);
          ctx.quadraticCurveTo(pts[gm][0], pts[gm][1] + gy * half[gm],
            pts[g1][0], pts[g1][1] + gy * half[g1] * .6);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  /* A soft mass laid along a quadratic: gradient blobs stamped at even
     parameter steps with the radius and the alpha both ramped, so the
     mass can die away at one end. Nothing it draws has an edge, which is
     the point - a plane of the face cut out with a filled path reads as
     a shape pasted onto the skin, not as form. */
  function softRun(ctx, ps, r0, r1, a0, a1, color, steps) {
    var i, t, mt, x, y, r;
    for (i = 0; i <= steps; i += 1) {
      t = i / steps;
      mt = 1 - t;
      x = mt * mt * mt * ps[0][0] + 3 * mt * mt * t * ps[1][0] +
        3 * mt * t * t * ps[2][0] + t * t * t * ps[3][0];
      y = mt * mt * mt * ps[0][1] + 3 * mt * mt * t * ps[1][1] +
        3 * mt * t * t * ps[2][1] + t * t * t * ps[3][1];
      r = U.mix(r0, r1, t);
      P.softEllipse(ctx, x, y, r, r * 1.1, color, U.mix(a0, a1, t));
    }
  }

  /* A stroke that fades along its own length, and may carry its weight
     in the middle. Used wherever a line describes an edge that has no
     end: the side of the nose does not stop between the brows, it stops
     being visible, and the crease around a nostril is a mark at the
     wing that dies at both ends rather than a drawn moustache. */
  function fadeLine(ctx, w, color, x0, y0, x1, y1, a0, a1, aMid) {
    line(ctx, w, color, 1);
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, U.css(color, a0));
    if (aMid !== undefined) g.addColorStop(.55, U.css(color, aMid));
    g.addColorStop(1, U.css(color, a1));
    ctx.strokeStyle = g;
  }

  /* Noses. Four constructions off one placement:
       0 straight  an even dorsum and a defined ball
       1 aquiline  a narrow bridge, a dropped tip and a low septum
       2 snub      short and lifted, both nostrils open
       3 broad     a low wide dorsum and far-set wings

     The construction rule matters more than the four kinds. A nose seen
     head-on has no outline: it is a plane turned away from the key on
     one side, a lit ridge on the other, and a base that catches its own
     shadow. The first version stroked a closed contour down one side,
     around the tip and back up the other, which is why every face wore
     a boot in the middle of it, and it filled the dorsum with a hard
     edged polygon, which pasted a second nose-shaped object on top.
     Nothing below strokes across the midline, the shadow is stamped
     rather than cut, and the one edge that is drawn fades out before it
     reaches the brow. Every mark is placed on the same edge curve, so
     the tone and the line cannot disagree. */
  function illustratedNose(v, it) {
    var ctx = v.ctx;
    var res = v.res;
    beginIntent(ctx, it);
    var faceW = it.faceW || 96;
    var wideT = U.clamp((res.noseW - .7) / .7, 0, 1);
    var kind = U.byteOf(res.hash[0], 23) % 4;
    var lx = res.lx;                 /* the key side */
    var sx = -lx;                    /* the shadow side */
    var cx = it.x;
    var rootY = it.bridgeY + faceW * .04;
    /* the kind restates the length, but only inside the bound the
       intent already fixed against the mouth */
    var kindLen = kind === 2 ? .84 : kind === 1 ? 1.07 : 1;
    var baseY = U.clamp(it.bridgeY + (it.tip[1] - it.bridgeY) * kindLen,
      it.minY === undefined ? it.tip[1] : it.minY,
      it.maxY === undefined ? it.tip[1] : it.maxY);
    var len = Math.max(faceW * .19, baseY - rootY);

    /* Widths. it.w already carries noseW, so a kind may restate the
       shape but never multiply the DNA a second time. */
    var ala = U.clamp(it.w * 1.5, faceW * .068, faceW * .118);
    ala *= kind === 3 ? 1.15 : kind === 2 ? 1.06 : kind === 1 ? .92 : 1;
    var bridgeHalf = ala * (kind === 3 ? .54 : kind === 2 ? .40 : .45);
    var ballY = baseY - ala * .20;

    /* The shadow-side dorsal edge, as a cubic rather than an arc. A nose
       is not a widening wedge: it narrows below the root, then flares to
       the wing, and a curve with no inflection reads as a ruled line
       drawn down the face. bh is the bridge stated in wings so the pinch
       and the flare are comparable numbers. */
    var bh = bridgeHalf / ala;
    var pinch = kind === 1 ? .96 : kind === 3 ? .84 : kind === 2 ? .7 : .74;
    var bow = kind === 1 ? .58 : kind === 3 ? .82 : kind === 2 ? .78 : .7;
    var edge = [
      [cx + sx * ala * bh * .86, rootY],
      [cx + sx * ala * bh * pinch, rootY + len * .34],
      [cx + sx * ala * bow, baseY - len * .26],
      [cx + sx * ala * .86, baseY - ala * .32]
    ];

    /* the root: a small dark on the shadow side only, so the bridge
       stays open at the top instead of starting as a drawn line */
    P.softEllipse(ctx, cx + sx * bridgeHalf * .5, rootY - 2,
      bridgeHalf * 1.4, 3.4, res.skin.shadow, .15);

    /* the shadow plane, stamped just inside the same edge */
    softRun(ctx, [
      [edge[0][0] - sx * .4, edge[0][1] + len * .08],
      [edge[1][0] - sx * 1, edge[1][1]],
      [edge[2][0] - sx * 1.4, edge[2][1]],
      [edge[3][0] - sx * 1.5, edge[3][1] + ala * .12]
    ], bridgeHalf * .5, ala * .5, .028, .052 + wideT * .016,
      res.skin.shadow, 9);

    /* the lit ridge, dying at the root the same way */
    softRun(ctx, [
      [cx + lx * bridgeHalf * .2, rootY + len * .2],
      [cx + lx * bridgeHalf * .28, U.mix(rootY, ballY, .45)],
      [cx + lx * bridgeHalf * .34, U.mix(rootY, ballY, .78)],
      [cx + lx * ala * .2, ballY - ala * .06]
    ], 1.3, ala * .34, .05, .13, res.skin.lit, 7);

    /* the shadow the nose throws onto the lip */
    P.softEllipse(ctx, cx + sx * ala * .12, baseY + ala * .40,
      ala * 1.0, ala * .30, res.skin.shadow, .24);

    /* the ball: lit off centre toward the key, its underside turned */
    P.softEllipse(ctx, cx + sx * ala * .18, ballY + ala * .16,
      ala * .46, ala * .34, res.skin.shadow, .14);
    P.softEllipse(ctx, cx + lx * ala * .17, ballY - ala * .10,
      ala * .48, ala * .40, res.skin.lit, .30);

    /* The base. A wing is NOT drawn as a filled crescent: at this size a
       shape a shade off the cheek reads as a lump stuck to the nose, and
       a lump on the shadow side alone reads as a deformity rather than
       as light. What reads is the crease where the wing meets the face,
       a light on the wing's own turn, and the nostril inside it - the
       same three marks both sides, weighted by which side the key is
       on. */
    var wingY = baseY + ala * .06;
    var nSep = ala * (kind === 3 ? .55 : .49);
    var nRx = ala * (kind === 2 ? .2 : .17);
    var nRy = ala * (kind === 2 ? .17 : .11);
    [-1, 1].forEach(function (s) {
      var dark = s === sx;
      var flare = (kind === 3 ? 1.1 : kind === 2 ? 1.05 : 1) * it.flare;
      var ox = cx + s * ala * flare;
      var x0 = cx + s * ala * .4, y0 = baseY - ala * .44;
      var x1 = cx + s * ala * .4, y1 = wingY + ala * .24;
      P.softEllipse(ctx, cx + s * ala * .66, baseY - ala * .18,
        ala * .34, ala * .3, res.skin.lit, dark ? .1 : .26);
      fadeLine(ctx, .8, res.skin.line, x0, y0, x1, y1,
        .04, .07, dark ? .5 : .22);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(ox + s * ala * .05, baseY - ala * .26,
        ox, wingY + ala * .04);
      ctx.quadraticCurveTo(ox - s * ala * .18, y1, x1, y1);
      ctx.stroke();
      P.softEllipse(ctx, cx + s * ala * .84, wingY + ala * .2,
        ala * .3, ala * .22, res.skin.shadow, dark ? .2 : .11);
      P.fEll(ctx, cx + s * nSep, wingY, nRx, nRy,
        res.skin.deep, kind === 2 ? .64 : .56, s * (kind === 2 ? .18 : .5));
    });

    /* the septum, drawn only where it shows: dropped below the wings on
       an aquiline, level on a snub, otherwise a whisper */
    if (kind !== 2) {
      P.softEllipse(ctx, cx, baseY + ala * (kind === 1 ? .30 : .20),
        ala * .18, ala * (kind === 1 ? .26 : .16), res.skin.deep,
        kind === 1 ? .34 : .16);
    }

    /* the one drawn edge, fading in from nothing at the brow */
    fadeLine(ctx, .8 + wideT * .25, res.skin.line,
      edge[0][0], edge[0][1], edge[3][0], edge[3][1], 0, .44);
    ctx.beginPath();
    ctx.moveTo(edge[0][0], edge[0][1]);
    ctx.bezierCurveTo(edge[1][0], edge[1][1], edge[2][0], edge[2][1],
      edge[3][0], edge[3][1]);
    ctx.stroke();
    ctx.restore();
  }

  function illustratedMouth(v, it) {
    var ctx = v.ctx;
    var res = v.res;
    beginIntent(ctx, it);
    var widthT = U.clamp((res.mouthW - .8) / .4, 0, 1);
    var fullT = U.clamp((res.lipFull - .6) / .8, 0, 1);
    var w = U.clamp(it.w * (.84 + widthT * .26),
      it.faceW * .11, it.faceW * .17);
    /* Floors, because a thin mouth is still a mouth. At lipFull .6 the
       old numbers collapsed both lips to under a unit and the whole
       feature came out as a scratch across the chin. Stated against the
       mouth's own width so they hold at any framing. */
    var upper = w * (.115 + fullT * .275);
    var lower = Math.max(w * .16, it.loH * (.55 + fullT * .68));
    var cy = it.y + it.cornerDy;

    /* the silhouette: the upper lip rises in two peaks with the
       cupid's bow dipped between them, the lower lip one full lobe */
    ctx.beginPath();
    ctx.moveTo(it.x - w, cy);
    ctx.quadraticCurveTo(it.x - w * .62, it.y - upper * .62,
      it.x - w * .3, it.y - upper);
    ctx.quadraticCurveTo(it.x - w * .12, it.y - upper * 1.04,
      it.x, it.y - upper * .34);
    ctx.quadraticCurveTo(it.x + w * .12, it.y - upper * 1.04,
      it.x + w * .3, it.y - upper);
    ctx.quadraticCurveTo(it.x + w * .62, it.y - upper * .62, it.x + w, cy);
    ctx.quadraticCurveTo(it.x, it.y + lower, it.x - w, cy);
    ctx.closePath();
    ctx.fillStyle = U.css(res.skin.lip);
    ctx.fill();

    /* the upper lip sits in shadow; restate its band a tone down */
    ctx.beginPath();
    ctx.moveTo(it.x - w, cy);
    ctx.quadraticCurveTo(it.x - w * .62, it.y - upper * .62,
      it.x - w * .3, it.y - upper);
    ctx.quadraticCurveTo(it.x - w * .12, it.y - upper * 1.04,
      it.x, it.y - upper * .34);
    ctx.quadraticCurveTo(it.x + w * .12, it.y - upper * 1.04,
      it.x + w * .3, it.y - upper);
    ctx.quadraticCurveTo(it.x + w * .62, it.y - upper * .62, it.x + w, cy);
    ctx.quadraticCurveTo(it.x, it.y + .55 + fullT * .4, it.x - w, cy);
    ctx.closePath();
    ctx.fillStyle = U.css(U.shade(res.skin.lip, -.07, .03), .85);
    ctx.fill();
    if (it.painted) {
      ctx.fillStyle = U.css(U.shade(res.skin.lip, .03, .14), .4);
      ctx.fill();
    }

    /* The vermillion border, the one edge a mouth really has. Its top
       catches light where the lip rolls out of the philtrum, and that
       thin light is what separates a lip from a stain on the chin -
       especially a pale one, where the fill alone is nearly the skin. */
    line(ctx, .65, res.skin.lit, .3 + fullT * .16);
    ctx.beginPath();
    ctx.moveTo(it.x - w * .84, cy - upper * .2);
    ctx.quadraticCurveTo(it.x - w * .5, it.y - upper * 1.06,
      it.x - w * .3, it.y - upper - .5);
    ctx.quadraticCurveTo(it.x - w * .12, it.y - upper * 1.1,
      it.x, it.y - upper * .34 - .4);
    ctx.quadraticCurveTo(it.x + w * .12, it.y - upper * 1.1,
      it.x + w * .3, it.y - upper - .5);
    ctx.quadraticCurveTo(it.x + w * .5, it.y - upper * 1.06,
      it.x + w * .84, cy - upper * .2);
    ctx.stroke();

    /* the mouth line, weighted at the corners and dying at neither */
    fadeLine(ctx, 1.15, res.skin.lipLine,
      it.x - w, cy, it.x + w, cy, .5, .5, .88);
    ctx.beginPath();
    ctx.moveTo(it.x - w, cy);
    ctx.quadraticCurveTo(it.x, it.y + .55 + fullT * .4, it.x + w, cy);
    ctx.stroke();
    /* the corners are pits, so they go in rather than round off */
    [-1, 1].forEach(function (s) {
      P.softEllipse(ctx, it.x + s * w * .94, cy + .3, 1.5, 1.1,
        res.skin.deep, .42);
    });

    /* the lower lip catches the light along its band, and turns under
       into its own shadow before the chin starts */
    P.softEllipse(ctx, it.x, it.y + lower * .42, w * .5,
      Math.max(.8, lower * .34), res.skin.lit, .22 + fullT * .16);
    fadeLine(ctx, .7, res.skin.lit,
      it.x - w * .4, it.y, it.x + w * .4, it.y, .06, .06, .44);
    ctx.beginPath();
    ctx.moveTo(it.x - w * .4, it.y + lower * .42);
    ctx.quadraticCurveTo(it.x, it.y + lower * .72, it.x + w * .4, it.y + lower * .42);
    ctx.stroke();
    P.softEllipse(ctx, it.x, it.y + lower * 1.05, w * .46, lower * .38,
      res.skin.shadow, .2);

    /* the philtrum: a trough with two ridges, so it reads as form and
       not as a pair of ticks stamped over the lip */
    P.softEllipse(ctx, it.x, it.y - upper - 1.6, w * .17, 1.6,
      res.skin.shadow, .16);
    line(ctx, .5, res.skin.lit, .22);
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(it.x + s * w * .15, it.y - upper * .95);
      ctx.quadraticCurveTo(it.x + s * w * .18, it.y - upper - 1.4,
        it.x + s * w * .17, it.y - upper - 2.6);
      ctx.stroke();
    });
    P.softEllipse(ctx, it.x, it.y + lower + 2.2, w * .42, 1.5,
      res.skin.shadow, .18);
    ctx.restore();
  }

  /* ---------- wounds ----------
     A wound is a place on the face, a severity and a time. The place is
     resolved in core - an explicit choice, or the anatomy where the
     anatomy decides (a split lip is on the lip), or the seed - so every
     style that draws a character's wound puts it in the same spot.

     Severity scales the mark and how hard its ink bites. Freshness runs
     it along a ramp with two ENDS rather than fading one colour out:
     fresh is blood and inflammation, healed is scar tissue, and scar
     tissue is the character's own skin lifted and desaturated. A fixed
     pale pink for "healed" is a smear on a dark face, which is the one
     thing a single-colour-with-alpha version could not avoid.

     Linen is not in here. A bandage or a patch goes OVER the hair and the
     hat, so it draws in the overlay pass at the very end. */

  /* where each place sits, and how big a mark belongs there */
  function woundAt(f, res, place, side) {
    var u = f.u;
    var eye = side < 0 ? f.A.eyeL : f.A.eyeR;
    var ear = side < 0 ? f.A.earL : f.A.earR;
    var edge = side < 0 ? f.left : f.right;
    if (place === "brow") {
      return { x: eye[0] + side * 2 * u, y: eye[1] - 11 * u, r: 9 * u };
    }
    if (place === "eye") return { x: eye[0], y: eye[1] + 2 * u, r: 8 * u };
    if (place === "cheek") {
      return { x: U.mix(eye[0], edge, .32), y: U.mix(eye[1], f.jawY, .58),
        r: 9.5 * u };
    }
    if (place === "jaw") {
      return { x: U.mix(f.chinX, edge, .58), y: f.jawY + 2 * u, r: 8 * u };
    }
    if (place === "nose") {
      return { x: f.A.noseBase[0], y: U.mix(f.eyeY, f.A.noseBase[1], .55),
        r: 7.5 * u };
    }
    if (place === "lip") return { x: f.mouthX, y: f.mouthY, r: 7 * u };
    if (place === "ear") return { x: ear[0], y: ear[1], r: 6 * u };
    return { x: f.cx, y: U.mix(f.eyeY, f.jawY, .4), r: 11 * u };
  }

  /* the fresh colour of each family; healed is always the skin's own */
  var WOUND_FRESH = {
    cut: [148, 46, 40],
    bruise: [92, 54, 100],
    burn: [156, 76, 48],
    brand: [128, 50, 38],
    pox: [166, 74, 62]
  };

  function woundInk(res, family) {
    var fresh = WOUND_FRESH[family] || WOUND_FRESH.cut;
    return U.lerpC(fresh, U.shade(res.skin.base, .16, -.08), res.woundHealedR);
  }

  function markCut(ctx, f, res, at, W, vr) {
    var u = W.u, side = W.side;
    var len = at.r * 1.8 * W.sev;
    function slash(ox, oy, dx, dy, w) {
      line(ctx, w, W.ink, W.alpha);
      ctx.beginPath();
      ctx.moveTo(at.x + ox, at.y + oy);
      ctx.quadraticCurveTo(at.x + ox + dx * .5 + side * 1.6 * u,
        at.y + oy + dy * .5, at.x + ox + dx, at.y + oy + dy);
      ctx.stroke();
    }
    slash(-side * len * .18, -len * .5, side * len * .34, len, 1.8 * W.sev * u);
    if (vr === "crossed") {
      slash(side * len * .3, -len * .34, -side * len * .48, len * .72,
        1.4 * W.sev * u);
    }
    if (vr === "stitched" && fine()) {
      /* the ticks are what says a surgeon got to it: short, paired, and
         across the line rather than along it */
      var i, t, x, y;
      line(ctx, 1 * u, U.shade(W.ink, -.3, .04), W.alpha * .9);
      for (i = 0; i < 4; i += 1) {
        t = (i + .5) / 4;
        x = at.x - side * len * .18 + side * len * .34 * t;
        y = at.y - len * .5 + len * t;
        ctx.beginPath();
        ctx.moveTo(x - 2.4 * u, y - 1.2 * u);
        ctx.lineTo(x + 2.4 * u, y + 1.2 * u);
        ctx.stroke();
      }
    }
  }

  function markBruise(ctx, f, res, at, W, vr) {
    var u = W.u, r = at.r * W.sev;
    P.softEllipse(ctx, at.x, at.y, r, r * .74, W.ink, .34 * W.alpha + .1);
    if (vr === "swollen") {
      /* swelling is a shape, not a colour: a lit ridge over the mark and
         a shadow under it, which is what makes it stand off the face */
      P.softEllipse(ctx, at.x, at.y - r * .34, r * .8, r * .4,
        U.shade(res.skin.base, .1, -.03), .4);
      line(ctx, 1.2 * u, U.shade(res.skin.base, -.3, .06), .45);
      ctx.beginPath();
      ctx.moveTo(at.x - r * .8, at.y + r * .5);
      ctx.quadraticCurveTo(at.x, at.y + r * .78, at.x + r * .8, at.y + r * .5);
      ctx.stroke();
    }
  }

  function markBurn(ctx, f, res, at, W, vr) {
    var u = W.u, r = at.r * W.sev, i, ox, oy;
    /* a burn is an AREA with a ragged margin: three overlapping blooms
       read as one scald, one ellipse reads as a bruise */
    for (i = 0; i < 3; i += 1) {
      ox = (i - 1) * r * (vr === "streak" ? .62 : .34) * W.side;
      oy = (i - 1) * r * (vr === "streak" ? .2 : .36);
      P.softEllipse(ctx, at.x + ox, at.y + oy,
        r * (vr === "streak" ? .7 : .62), r * (vr === "streak" ? .34 : .5),
        W.ink, .3 * W.alpha + .08);
    }
    /* the middle of an old burn is tight and shiny, and paler than the
       margin round it */
    P.softEllipse(ctx, at.x, at.y, r * .38, r * .3,
      U.shade(res.skin.base, .14 + res.woundHealedR * .12, -.1), .42);
  }

  function markBrokenNose(ctx, f, res, at, W, vr) {
    var u = W.u, side = W.side;
    var top = f.eyeY - 2 * u, bot = f.A.noseBase[1];
    /* the bridge is pushed off true: one line down it that changes its
       mind, with the swelling packed either side of the kink */
    line(ctx, 1.6 * W.sev * u, W.ink, W.alpha * .8);
    ctx.beginPath();
    ctx.moveTo(f.cx, top);
    ctx.quadraticCurveTo(f.cx + side * 3.4 * u * W.sev, U.mix(top, bot, .45),
      f.cx + side * 1 * u, bot - 2 * u);
    ctx.stroke();
    P.softEllipse(ctx, f.cx + side * 3 * u, U.mix(top, bot, .4),
      5 * u * W.sev, 4 * u * W.sev, W.ink, .28 * W.alpha + .08);
    P.softEllipse(ctx, f.cx - side * 2.4 * u, U.mix(top, bot, .55),
      4 * u * W.sev, 3.4 * u * W.sev, W.ink, .2 * W.alpha + .06);
    if (vr === "bloodied") {
      /* still bleeding, so it runs from the nostril and not from the
         bridge - and it runs straight down, whatever the nose is doing */
      line(ctx, 1.3 * u, U.lerpC([132, 32, 28], W.ink, .3), .8);
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(f.A.noseBase[0] + s * 3 * u, bot + 1 * u);
        ctx.quadraticCurveTo(f.A.noseBase[0] + s * 3.4 * u,
          U.mix(bot, f.mouthY, .6), f.A.noseBase[0] + s * 2.6 * u,
          f.mouthY - 1 * u);
        ctx.stroke();
      });
    }
  }

  function markSplitLip(ctx, f, res, at, W, vr) {
    var u = W.u, side = W.side;
    var x = f.mouthX + side * 5 * u;
    var h = 5.5 * u * W.sev;
    line(ctx, 1.5 * W.sev * u, W.ink, W.alpha);
    ctx.beginPath();
    ctx.moveTo(x, f.mouthY - h);
    ctx.quadraticCurveTo(x + side * 1.4 * u, f.mouthY, x, f.mouthY + h * .7);
    ctx.stroke();
    P.softEllipse(ctx, x, f.mouthY, 4 * u * W.sev, 3.4 * u * W.sev,
      W.ink, .26 * W.alpha);
    if (vr === "scabbed" && fine()) {
      /* the crust: three dark beads along the split, which is what says
         days rather than minutes */
      var i;
      for (i = 0; i < 3; i += 1) {
        P.fEll(ctx, x + side * (i - 1) * .6 * u, f.mouthY + (i - 1) * h * .4,
          1.3 * u, 1.1 * u, U.shade(W.ink, -.28, .05), .85);
      }
    }
  }

  function markNotchedEar(ctx, f, res, at, W, vr) {
    var u = W.u, side = W.side;
    var gap = U.shade(res.skin.deep, -.36, .06);
    var w = 3.6 * u * (1 + W.sev), h = 4.4 * u * (1 + W.sev);
    /* Freshness has to mean something here or the slider is a lie: an old
       notch is just a gap in the rim, a new one still has blood along the
       cut and down behind the jaw. Drawn first, so the gap sits over it. */
    if (res.woundHealedR < .6) {
      line(ctx, 1.4 * u, U.lerpC([136, 36, 30], W.ink, res.woundHealedR / .6),
        (.6 - res.woundHealedR) / .6 * .85);
      ctx.beginPath();
      ctx.moveTo(at.x + side * w * .4, at.y);
      ctx.quadraticCurveTo(at.x + side * w * .2, at.y + h * 1.6,
        at.x - side * w * .1, at.y + h * 2.6);
      ctx.stroke();
    }
    if (vr === "cropped") {
      /* the whole top of the ear taken off: a straight slice, which is a
         judicial mark and reads as deliberate */
      ctx.beginPath();
      ctx.moveTo(at.x - w, at.y - h * .5);
      ctx.lineTo(at.x + w * 1.1, at.y - h * 1.1);
      ctx.lineTo(at.x + w * 1.1, at.y - h * .3);
      ctx.lineTo(at.x - w, at.y + h * .1);
      ctx.closePath();
      fillStroke(ctx, gap, U.shade(res.skin.line, -.1, 0), 1.1, .9);
      return;
    }
    /* a bite out of the rim */
    ctx.beginPath();
    ctx.moveTo(at.x + side * w * .3, at.y - h * .5);
    ctx.quadraticCurveTo(at.x - side * w * .4, at.y, at.x + side * w * .3,
      at.y + h * .5);
    ctx.lineTo(at.x + side * w * 1.2, at.y + h * .45);
    ctx.lineTo(at.x + side * w * 1.2, at.y - h * .45);
    ctx.closePath();
    fillStroke(ctx, gap, U.shade(res.skin.line, -.1, 0), 1.1, .9);
  }

  function markBrand(ctx, f, res, at, W, vr) {
    var u = W.u;
    var r = 4.2 * u * (.7 + W.sev * .6);
    /* a brand is a shape held long enough to leave the same shape: keep
       the geometry crisp and let the raised pale edge round it off */
    line(ctx, 2 * u, W.ink, W.alpha);
    ctx.beginPath();
    if (vr === "ring") {
      ctx.arc(at.x, at.y, r, 0, TAU);
    } else if (vr === "hook") {
      ctx.moveTo(at.x - r * .6, at.y - r);
      ctx.lineTo(at.x + r * .5, at.y - r);
      ctx.quadraticCurveTo(at.x + r * .5, at.y + r, at.x - r * .7, at.y + r * .6);
    } else {
      ctx.moveTo(at.x, at.y - r);
      ctx.lineTo(at.x, at.y + r);
      ctx.moveTo(at.x - r * .72, at.y - r * .2);
      ctx.lineTo(at.x + r * .72, at.y - r * .2);
    }
    ctx.stroke();
    if (fine()) {
      line(ctx, .9 * u, U.shade(res.skin.base, .18, -.08), .45);
      ctx.stroke();
    }
  }

  /* Pox is the one wound that is not a place but a spread, so it is the
     one that has to know the shape of what it is spreading over. Stated
     as a share of the width at the WIDEST point it walked off the head at
     every extreme: the face draws in toward the jaw and in again over the
     temples, so a spread that fits across the cheekbones hangs in the
     background at the chin - and severity scales the spots, which pushed
     them further out still. Exactly the fault the beard corner had.
     Each spot is placed against the face edge at its own height and inset
     by its own radius, so the spots sit whole rather than being sliced
     off by the clip drawWound puts round every face mark. */
  function markPox(ctx, f, res, at, W, vr) {
    var u = W.u, rng = W.rng;
    var n = Math.round(6 + W.sev * 16);
    var i, s, x, y, r, half, inset;
    for (i = 0; i < n; i += 1) {
      y = U.mix(f.top + 10 * u, f.jawY + 1 * u, rng());
      r = (1 + rng() * 1.4) * u * (.7 + W.sev * .6);
      s = rng() < .5 ? -1 : 1;
      half = Math.abs(faceEdgeAt(f, y, s) - f.cx);
      /* faceEdgeAt answers with the widest point for anything at or above
         the eyes, and the cranium is narrower than that all the way up */
      if (y < f.eyeY) {
        half *= U.mix(.70, 1,
          U.clamp((y - f.top) / Math.max(1, f.eyeY - f.top), 0, 1));
      }
      inset = r * (vr === "blistered" ? 1.5 : 1.15);
      /* biased outward, because a rash lands on the cheeks and the brow
         rather than evenly over the middle of a face */
      x = f.cx + s * Math.pow(rng(), .7) * Math.max(0, half - inset);
      if (vr === "blistered") {
        P.fEll(ctx, x, y, r * 1.3, r * 1.3, U.shade(W.ink, .2, -.14), .7);
        P.fEll(ctx, x, y - r * .3, r * .7, r * .6,
          U.shade(res.skin.base, .2, -.1), .8);
      } else {
        P.fEll(ctx, x, y, r, r, W.ink, .3 + W.alpha * .35);
      }
    }
  }

  var WOUND_DRAW = {
    cut: markCut,
    bruise: markBruise,
    burn: markBurn,
    brokenNose: markBrokenNose,
    splitLip: markSplitLip,
    notchedEar: markNotchedEar,
    brand: markBrand,
    pox: markPox
  };

  function drawWound(v, f) {
    var res = v.res;
    var draw = WOUND_DRAW[res.wound] || WOUND_DRAW[res.woundBase];
    if (!draw) return;
    var ctx = v.ctx;
    var side = res.woundSideR || res.markSide;
    var sev = k01(res.woundSev);
    /* Everything anchored ON the face is clipped to the face. Severity
       scales a mark, and at the top of the slider a bruise, a burn or a
       rash reaches past a silhouette that draws in toward the jaw and
       over the temples - a mark in the background beside the head reads
       as dirt on the card rather than as a wound. Ending a wash exactly
       on the outline is what the gown and the hose already do.
       The ear is the exception: it is drawn OUTSIDE the head path on
       purpose, so a notch cut in it would be clipped away entirely. */
    var onFace = res.woundPlaceR !== "ear";
    if (onFace) {
      ctx.save();
      headPath(ctx, f);
      ctx.clip();
    }
    draw(ctx, f, res, woundAt(f, res, res.woundPlaceR, side), {
      u: f.u,
      side: side,
      sev: .55 + sev * .9,
      alpha: .55 + sev * .42,
      /* its own family's colour where it has one, its base's otherwise */
      ink: woundInk(res, WOUND_FRESH[res.wound] ? res.wound : res.woundBase),
      rng: v.styleRng("illustrated-wound")
    }, res.woundVariantR);
    if (onFace) ctx.restore();
  }

  /* Linen goes over everything: over the hair, over the hat, over the
     mark it is dressing. It is the only wound family that does, which is
     why it draws in its own pass at the end of the stack instead of with
     the rest of them under the hair. */
  function drawMarkOverlay(v, f) {
    var res = v.res;
    if (res.woundBase !== "bandage") return;
    var ctx = v.ctx, u = f.u;
    var vr = res.woundVariantR;
    var side = res.woundSideR || res.markSide;
    var sev = k01(res.woundSev);
    /* fit slides the linen down the brow; severity is how much of it
       there is */
    var drop = (k01(res.woundFitR) - .5) * 12 * u;
    var edge = [128, 116, 98];
    var i;
    if (vr === "patch") {
      /* an eye patch: the strap first, then the leather over it */
      var eye = side < 0 ? f.A.eyeL : f.A.eyeR;
      line(ctx, 2.4 * u, [86, 72, 58], .95);
      ctx.beginPath();
      ctx.moveTo(f.left - 3 * u, eye[1] - 6 * u + drop * .4);
      ctx.quadraticCurveTo(f.cx, eye[1] - 9 * u + drop * .4,
        f.right + 3 * u, eye[1] - 4 * u + drop * .4);
      ctx.stroke();
      P.fEll(ctx, eye[0], eye[1] + 1 * u + drop * .4,
        (7 + sev * 2.5) * u, (5.5 + sev * 2) * u, [58, 46, 38], 1);
      line(ctx, 1.2, [32, 26, 22], .9);
      ctx.beginPath();
      ctx.ellipse(eye[0], eye[1] + 1 * u + drop * .4, (7 + sev * 2.5) * u,
        (5.5 + sev * 2) * u, 0, 0, TAU);
      ctx.stroke();
      if (fine()) {
        line(ctx, .8, [96, 80, 64], .5);
        ctx.beginPath();
        ctx.moveTo(eye[0] - 4 * u, eye[1] - 2 * u + drop * .4);
        ctx.quadraticCurveTo(eye[0], eye[1] - 4 * u + drop * .4,
          eye[0] + 4 * u, eye[1] - 2 * u + drop * .4);
        ctx.stroke();
      }
      return;
    }
    if (vr === "wrap") {
      /* wrapped over the skull: the cap of linen, then the turns of it,
         then the tuck where it is finished off */
      var yBot = f.eyeY - 6 * u + drop;
      domePath(ctx, f, yBot, 3);
      fillStroke(ctx, LINEN, edge, 1.5);
      line(ctx, 1 * u, [176, 164, 142], .7);
      for (i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(f.left - 1 * u, yBot - i * 7 * u - 2 * u);
        ctx.quadraticCurveTo(f.cx + side * 6 * u, yBot - i * 7 * u - 8 * u,
          f.right + 1 * u, yBot - i * 7 * u - 4 * u);
        ctx.stroke();
      }
      P.fEll(ctx, f.cx + side * (f.halfR * .72), yBot - 3 * u, 4 * u, 3 * u,
        U.shade(LINEN, -.05, .01), 1);
      return;
    }
    /* the brow strip, which is what a bandage was before it had variants.
       Stated in head units now: the old flat numbers put a figure's
       bandage across the middle of the forehead. */
    var y0 = f.eyeY - (21 + sev * 5) * u + drop;
    var h = (6 + sev * 3) * u;
    ctx.beginPath();
    ctx.moveTo(f.left - 1 * u, y0);
    ctx.quadraticCurveTo(f.cx, y0 - 4 * u, f.right + 1 * u, y0);
    ctx.lineTo(f.right, y0 + h);
    ctx.quadraticCurveTo(f.cx, y0 + h - 4 * u, f.left, y0 + h);
    ctx.closePath();
    fillStroke(ctx, LINEN, edge, 1);
    if (!fine()) return;
    line(ctx, .7, [154, 139, 114], .45);
    for (i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(f.cx + i * 8 * u, y0 - 1 * u);
      ctx.lineTo(f.cx + i * 9 * u, y0 + h - 1 * u);
      ctx.stroke();
    }
  }

  function drawMarks(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    var eye = res.markSide < 0 ? f.A.eyeL : f.A.eyeR;
    var rng = v.styleRng("illustrated-face-detail");
    var i;
    if (res.elder > .08) {
      line(ctx, .8, res.skin.line, .18 + res.elder * .2);
      for (i = 0; i < 3; i += 1) {
        [-1, 1].forEach(function (side) {
          var ex = side < 0 ? f.A.eyeL[0] : f.A.eyeR[0];
          ctx.beginPath();
          ctx.moveTo(ex + side * (6 + i * 1.5), f.eyeY + 4 + i * 2);
          ctx.quadraticCurveTo(ex + side * 10, f.eyeY + 5 + i * 2,
            ex + side * (12 + i), f.eyeY + 4 + i * 2);
          ctx.stroke();
        });
      }
      line(ctx, .7, res.skin.line, .14 + res.elder * .18);
      for (i = 0; i < 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(f.cx - 11, f.eyeY - 20 - i * 5);
        ctx.quadraticCurveTo(f.cx, f.eyeY - 23 - i * 5,
          f.cx + 11, f.eyeY - 20 - i * 5);
        ctx.stroke();
      }
    }
    var freckles = Math.round(res.freckles * 18);
    ctx.fillStyle = U.css(U.shade(res.skin.deep, -.02, .04), .28);
    for (i = 0; i < freckles; i += 1) {
      var sideF = rng() < .5 ? -1 : 1;
      var eyeF = sideF < 0 ? f.A.eyeL : f.A.eyeR;
      ctx.beginPath();
      ctx.arc(eyeF[0] + (rng() - .5) * 16, f.eyeY + 9 + rng() * 9, .45 + rng() * .45, 0, TAU);
      ctx.fill();
    }
    if (res.scarred === "yes") {
      line(ctx, 1.4, [154, 84, 72], .72);
      ctx.beginPath();
      ctx.moveTo(eye[0] + res.markSide * 7, eye[1] - 7);
      ctx.quadraticCurveTo(eye[0] + res.markSide * 10, eye[1] + 3,
        eye[0] + res.markSide * 8, eye[1] + 13);
      ctx.stroke();
    }
    drawWound(v, f);
    if (res.oneEyed === "yes") {
      ctx.fillStyle = U.css([45, 34, 29]);
      ctx.beginPath();
      ctx.ellipse(eye[0], eye[1], 8, 6, 0, 0, TAU);
      ctx.fill();
      line(ctx, 1.7, [35, 25, 22], .9);
      ctx.beginPath();
      ctx.moveTo(eye[0] - 10, eye[1] - 3);
      ctx.lineTo(eye[0] + 10, eye[1] + 3);
      ctx.stroke();
    }
  }

  function drawJewelry(v, f) {
    var ctx = v.ctx;
    var res = v.res;
    if (res.neckR !== "none") {
      line(ctx, 1.3, GOLD, .9);
      ctx.beginPath();
      ctx.moveTo(f.throatX - 14, f.throatY - 4);
      ctx.quadraticCurveTo(f.throatX, f.throatY + 6, f.throatX + 14, f.throatY - 4);
      ctx.stroke();
      if (res.neckR === "cross") {
        ctx.fillStyle = U.css(GOLD_L);
        ctx.fillRect(f.throatX - 1.2, f.throatY + 4, 2.4, 10);
        ctx.fillRect(f.throatX - 4, f.throatY + 7, 8, 2.2);
      } else {
        P.gemDot(ctx, f.throatX, f.throatY + 8, 3, U.hsl2rgb(res.bgHue + 180, .45, .34));
      }
    }
    if (res.earring) {
      [f.A.earL, f.A.earR].forEach(function (ear) {
        line(ctx, 1.1, GOLD, .9);
        ctx.beginPath();
        ctx.arc(ear[0], ear[1] + 10, 2.2, 0, TAU);
        ctx.stroke();
      });
    }
  }

  function illustrated2d(v, cfg) {
    cfg = cfg || {};
    var g = YO.modes.stage(v, cfg);
    var f = frame(g, v.res);
    /* A portrait head lands near 96 design units and is drawn at dt 1 on
       a 256 card, so that is the reference the marks were fitted at. A
       full figure puts the same head at 55 units, and a small card
       multiplies by dt again - 37 px on the reference figure card. Measure
       it and let the drawing answer. */
    DT = v.dt || 1;
    BOLD = U.clamp(96 / Math.max(8, (f.chinBottom - f.top) * DT), 1, 2);
    f.bold = BOLD;
    var colors = g.bust.tagColors || {};
    /* Attachment order is structural: back hair sits behind the body,
       the neck grows out of the head, and the robe covers the neck base.
       Draped headwear then wraps over that body stack. */
    /* A figure is planted by moving the whole drawing, head and all,
       so the drawn sole meets the ground line. Scaling the camera cannot
       do this: the mesh grounds its own sole, but the drawn head is a
       different size from the mesh's head unit, so seven and a half
       DRAWN heads land somewhere else entirely. Shifting keeps the head
       joined to the body and lets a child simply stand shorter, which is
       what happens when you translate rather than rescale. */
    var ctx = v.ctx;
    var body = null, shift = 0;
    if (cfg.figure) {
      var groundY = v.H * (cfg.ground === undefined ? .935 : cfg.ground);
      body = bodyFrame(f, v.res, groundY, cfg.heads);
      shift = groundY - body.soleY;
      ctx.save();
      ctx.translate(0, shift);
    }
    drawBackHair(v, f);
    drawNeck(v, f);
    if (cfg.figure) drawFigure(v, f, colors, body);
    else drawTorso(v, f);
    drawBackCostume(v, f, colors);
    drawEars(v, f);
    drawHead(v, f);
    drawFaceStructure(v, f);
    drawBeard(v, f);
    YO.modes.drawFeatureSet(v, illustratedIntents(v, g, f),
      cfg.featureSet || "mesh-illustrated");
    drawMustache(v, f);
    drawMarks(v, f);
    drawHair(v, f);
    drawHeadwear(v, f, colors);
    drawJewelry(v, f);
    /* last of all: linen dressing a wound is over the hair and over
       whatever is worn on top of it */
    drawMarkOverlay(v, f);
    if (cfg.figure) ctx.restore();
    return g;
  }

  YO.registerFeatureSet("mesh-illustrated", {
    eyes: illustratedEyes,
    brows: illustratedBrows,
    nose: illustratedNose,
    mouth: illustratedMouth
  });
  YO.registerMode("illustrated2d", illustrated2d);

  YO.registerStyle({
    id: "meshillustrated",
    name: "Court illustration (v2)",
    blurb: "The mesh is hidden scaffolding. Smooth 2D silhouettes, flat light, drawn hair and costume replace every visible polygon.",
    order: 1,
    knobs: { ink: INK, inkW: 1 },
    model: "realistic",
    mode: "illustrated2d",
    featureSet: "mesh-illustrated",
    modeConfig: { turn: .14, scale: 1.08, cy: 114 },
    /* the same drawing, at full length.
       `heads` is the adult height in head-heights and `scale` is fitted
       to it. Life-drawing canon is 7.5, but a figure card is a picture
       of a person's face as much as of their dress, and at 7.5 the head
       lands around 34 px on the reference figure card, which cannot carry a face.
       The figure is drawn a little shorter in heads and the camera comes
       in to match, which is a stylisation rather than a distortion:
       every width and length below the chin is stated in head units, so
       the body stays proportional to itself and only its ratio to the
       head moves. Measured across the range at 160 px, head height goes
       34 px at 7.5, 38 at 6.75, 41 at 6.2, 44 at 5.7, 49 at 5.2, and the
       figure starts reading squat below about 5.7. 6.2 is the knee: a
       fifth more face for a proportion that still reads adult.
       The two numbers are coupled. figureH is heads x headH and headH is
       about 88.7 x scale, so a span that fills the card without tripping
       bodyFrame's veto wants scale near 4.566 / heads. Change one and
       refit the other. */
    figure: { pose: "standing", scale: .736, heads: 6.2 },

    background: function (v) {
      var ctx = v.ctx;
      var res = v.res;
      /* The background runs BEFORE the mode and strokes the arch, so it
         is the first thing in a render to need DT - and without this it
         inherited the PREVIOUS render's value, which made the style
         non-deterministic across two different widths. The mode resets
         both properly once the head size is known. */
      DT = v.dt || 1;
      BOLD = 1;
      var top = U.hsl2rgb(res.bgHue, .23, .22);
      var bot = U.hsl2rgb(res.bgHue, .28, .09);
      var grad = ctx.createLinearGradient(0, 0, 0, v.H);
      grad.addColorStop(0, U.css(top));
      grad.addColorStop(1, U.css(bot));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, v.W, v.H);
      /* the court arch, stated against the frame so it grows with it */
      var ax = v.W * (27 / 256), aw = v.W - ax * 2, ay = v.H * (23 / 288);
      var spring = ay + aw * (89 / 202), foot = v.H * (264 / 288);
      ctx.fillStyle = U.css(U.shade(res.accent, -.05, 0), .13);
      ctx.beginPath();
      ctx.moveTo(ax, foot);
      ctx.lineTo(ax, spring);
      ctx.bezierCurveTo(ax, ay + aw * (31 / 202), ax + aw * (45 / 202), ay, v.W / 2, ay);
      ctx.bezierCurveTo(v.W - ax - aw * (45 / 202), ay, v.W - ax,
        ay + aw * (31 / 202), v.W - ax, spring);
      ctx.lineTo(v.W - ax, foot);
      ctx.closePath();
      ctx.fill();
      line(ctx, 1.2, U.shade(res.accent, .3, -.02), .24);
      ctx.stroke();
      ctx.fillStyle = U.css(U.shade(res.accent, .12, -.02), .18);
      ctx.beginPath();
      ctx.arc(v.W / 2, v.H * (v.figure ? .17 : 111 / 288), v.W * (82 / 256), 0, TAU);
      ctx.fill();
      line(ctx, 1.2, U.shade(res.accent, .28, -.05), .28);
      ctx.beginPath();
      ctx.arc(128, 111, 73, 0, TAU);
      ctx.stroke();
      var motif;
      for (motif = 0; motif < 4; motif += 1) {
        var mx = motif & 1 ? 218 : 38;
        var my = motif > 1 ? 248 : 58;
        line(ctx, .9, U.shade(res.accent, .36, 0), .32);
        ctx.beginPath();
        ctx.arc(mx - 2, my, 2.2, 0, TAU);
        ctx.arc(mx + 2, my, 2.2, 0, TAU);
        ctx.arc(mx, my - 2, 2.2, 0, TAU);
        ctx.arc(mx, my + 2, 2.2, 0, TAU);
        ctx.stroke();
      }
    },

    finish: function (v) {
      var ctx = v.ctx;
      var i;
      for (i = 0; i < 90; i += 1) {
        ctx.fillStyle = v.rng() < .55 ? "rgba(255,245,220,.025)" : "rgba(20,12,10,.035)";
        ctx.fillRect(v.rng() * v.W, v.rng() * v.H, 1 + v.rng() * 2, .7);
      }
      var vg = ctx.createRadialGradient(v.W / 2, v.H * (132 / 288), v.W * (105 / 256),
        v.W / 2, v.H * (142 / 288), v.W * (226 / 256));
      vg.addColorStop(0, "rgba(8,5,4,0)");
      vg.addColorStop(1, "rgba(8,5,4,.28)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, v.W, v.H);
    }
  });
})();
