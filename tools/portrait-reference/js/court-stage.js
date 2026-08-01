/* Court Illustration v2 geometry bridge.
   This is the smallest generic staging surface the reference painter needs.
   The painter reads projected anchors and landmarks, never triangle order,
   mesh contours, or visible facets. */
(function () {
  "use strict";

  var YO = window.YOLO;
  var U = YO.util;

  function dist(a, b) {
    return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) +
      (a[1] - b[1]) * (a[1] - b[1]));
  }

  function stage(v, cfg) {
    cfg = cfg || {};
    var res = v.res;
    var bust = YO.mesh.buildBust(res,
      cfg.model === undefined ? "realistic" : cfg.model,
      { figure: !!cfg.figure });
    var geometryRng = v.characterRng
      ? v.characterRng("mesh-costume") : v.rng;
    if (YO.costume && cfg.costume !== false) {
      YO.costume.attach(bust, res, geometryRng, cfg.costume);
    }
    var pose = YO.preparePose(cfg.pose, res, {
      turn: cfg.turn,
      pitch: cfg.pitch,
      tilt: cfg.tilt,
      cy: cfg.cy,
      cx: cfg.cx,
      scale: cfg.scale,
      persp: cfg.persp
    });
    if (pose.ground !== undefined && bust.body) {
      pose.cy = pose.ground * (v.H || 288) - bust.body.soleY * pose.scale;
    }
    var projected = YO.mesh.poseProject(bust, pose);
    return {
      bust: bust,
      anchors: projected.anchors,
      landmarks: projected.landmarks
    };
  }

  function meshIntents(v, geometry) {
    var res = v.res;
    var anchors = geometry.anchors;
    var open = res.health === "dying" ? .34 :
      1 - .14 * res.elder - .12 * Math.max(0, res.expression);
    var expression = res.expression;
    var browColor = res.child ? U.shade(res.hairDD, .1, 0) : res.hairDD;
    browColor = U.lerpC(browColor, [200, 196, 186], res.grayT * .7);

    function eyeIntent(side, point, outer) {
      var frame = side < 0 ? geometry.landmarks.eyeL : geometry.landmarks.eyeR;
      var width = Math.max(2, dist(point, outer) * 1.06);
      return {
        side: side,
        x: point[0],
        y: point[1],
        w: width,
        h: width * .58 * open,
        open: open,
        iris: res.eye,
        lit: res.lx,
        faint: res.health === "dying",
        lash: res.sexF && !res.child,
        angle: frame ? frame.angle : 0,
        tangent: frame ? frame.tangent : [1, 0],
        normal: frame ? frame.normal : [0, 0, 1],
        visibility: frame ? frame.visibility : 1,
        foreshortening: frame ? frame.foreshortening : 1
      };
    }

    var eyes = [
      eyeIntent(-1, anchors.eyeL, anchors.eyeLout),
      eyeIntent(1, anchors.eyeR, anchors.eyeRout)
    ];

    function browIntent(side, point, eye) {
      var frame = side < 0
        ? geometry.landmarks.browL : geometry.landmarks.browR;
      return {
        side: side,
        x: point[0],
        y: point[1] - Math.max(0, expression) * 1.8,
        len: eye.w * 1.4,
        weight: res.browWeight,
        innerDy: expression < 0 ? -expression * 3.4 : -expression * .9,
        color: browColor,
        angle: frame ? frame.angle : 0,
        visibility: frame ? frame.visibility : 1
      };
    }

    var mouthWidth = Math.max(3, dist(anchors.mouthL, anchors.mouthR) * .56);
    return {
      eyes: eyes,
      brows: [
        browIntent(-1, anchors.browL, eyes[0]),
        browIntent(1, anchors.browR, eyes[1])
      ],
      nose: {
        x: anchors.noseBase[0],
        y: anchors.noseBase[1],
        w: Math.max(2, (eyes[0].w + eyes[1].w) * .5 * .72 * res.noseW),
        lit: res.lx,
        shadow: res.sx,
        flare: res.health === "dying" ? 1.15 : 1,
        tip: anchors.noseTip,
        bridgeY: (anchors.eyeL[1] + anchors.eyeR[1]) / 2,
        angle: geometry.landmarks.nose ? geometry.landmarks.nose.angle : 0,
        visibility: geometry.landmarks.nose
          ? geometry.landmarks.nose.visibility : 1
      },
      mouth: {
        x: anchors.mouth[0],
        y: anchors.mouth[1],
        w: mouthWidth,
        cornerDy: -expression * 3 + (res.health === "dying" ? 2.4 : 0),
        loH: Math.max(1.8, mouthWidth * .32 * res.lipFull *
          (1 - res.elder * .3)),
        painted: (res.sexF || res.lipFull > 1.08) && !res.child,
        angle: geometry.landmarks.mouth ? geometry.landmarks.mouth.angle : 0,
        visibility: geometry.landmarks.mouth
          ? geometry.landmarks.mouth.visibility : 1
      }
    };
  }

  function drawFeatureSet(v, intents, pick) {
    var set = typeof pick === "string" ? YO.getFeatureSet(pick) : pick;
    ["brows", "eyes", "nose", "mouth"].forEach(function (name) {
      var draw = set && set[name];
      if (typeof draw === "string") draw = YO.features[name][draw];
      if (typeof draw !== "function") {
        throw new Error("Court feature set is missing " + name);
      }
      draw(v, intents[name]);
    });
  }

  YO.modes = {
    stage: stage,
    meshIntents: meshIntents,
    drawFeatureSet: drawFeatureSet
  };
})();
