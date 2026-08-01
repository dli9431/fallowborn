(function () {
  "use strict";

  var seedInput = document.getElementById("seed");
  var renderButton = document.getElementById("render");
  var portraitCanvas = document.getElementById("portrait");
  var figureCanvas = document.getElementById("figure");
  var summary = document.getElementById("summary");

  function renderPair() {
    var seed = seedInput.value || "fallowborn-reference";
    var spec = window.FBCourtReference.makeSpec(seed);
    window.FBCourtReference.renderPortrait(portraitCanvas, spec, { width: 256 });
    window.FBCourtReference.renderFigure(figureCanvas, spec, { width: 256 });
    summary.textContent = spec.signature + " | " + spec.sex + " | age " +
      spec.age + " | " + spec.culture + " | tier " + spec.tier;
  }

  renderButton.addEventListener("click", renderPair);
  seedInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") renderPair();
  });
  renderPair();
})();
