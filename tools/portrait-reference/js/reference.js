/* Small public adapter around the Court Illustration v2 reference painter. */
(function () {
  "use strict";

  var STYLE_ID = "meshillustrated";

  function copyOptions(options) {
    var out = {};
    Object.keys(options || {}).forEach(function (key) {
      out[key] = options[key];
    });
    return out;
  }

  function asSpec(seedOrSpec, overrides) {
    if (seedOrSpec && typeof seedOrSpec === "object" && seedOrSpec.hash) {
      return seedOrSpec;
    }
    return window.YOLO.makeSpec(String(seedOrSpec), overrides || null);
  }

  function renderPortrait(canvas, seedOrSpec, options, overrides) {
    return window.YOLO.renderPortrait(canvas, asSpec(seedOrSpec, overrides),
      STYLE_ID, copyOptions(options));
  }

  function renderFigure(canvas, seedOrSpec, options, overrides) {
    var figureOptions = copyOptions(options);
    figureOptions.figure = true;
    return window.YOLO.renderPortrait(canvas, asSpec(seedOrSpec, overrides),
      STYLE_ID, figureOptions);
  }

  window.FBCourtReference = {
    STYLE_ID: STYLE_ID,
    makeSpec: function (seed, overrides) {
      return window.YOLO.makeSpec(String(seed), overrides || null);
    },
    renderPortrait: renderPortrait,
    renderFigure: renderFigure
  };
})();
