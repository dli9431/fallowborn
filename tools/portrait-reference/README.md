# Court Illustration v2 reference renderer

This developer-only reference preserves the approved Court Illustration v2 appearance
for both bust portraits and standing full figures. It is a visual and behavioral oracle
for the shipping portrait-engine rewrite. It is not a runtime game module.

Open `index.html` directly from `file://`, enter any seed, and render the same generated
character in both frames. The page has no dependencies, assets, storage, or network use.

## Public reference API

Scripts must load in the order shown in `index.html`. The final adapter exposes:

```js
var spec = FBCourtReference.makeSpec("example-seed");
FBCourtReference.renderPortrait(portraitCanvas, spec, { width: 256 });
FBCourtReference.renderFigure(figureCanvas, spec, { width: 256 });
```

Both calls are deterministic for the same specification and size. `renderPortrait`
defaults to the 256 x 288 portrait frame. `renderFigure` selects the standing 256 x 480
frame. Normal renderer options such as `width` and `height` may be passed through.

## Scope

- `js/core.js` supplies deterministic character resolution and Canvas 2D primitives.
- `js/mesh.js` supplies the hidden anatomy scaffold and projected landmarks.
- `js/costume.js` supplies deterministic hair, beard, headwear, and costume geometry.
- `js/court-stage.js` contains only staging and feature-intent work used by this painter.
- `js/court-illustration-v2.js` is the sole registered style.
- `js/reference.js` is the small stable adapter implementation agents should call.

The staging cut intentionally omits face culling, triangle sorting, contour extraction,
and all alternate render modes because Court Illustration v2 does not read those results.
The remaining hidden mesh is still reference scaffolding. The shipping game renderer must
replace it with the direct analytic landmark scaffold specified by the implementation plan.

Do not add these scripts to the game `index.html`, import them from shipped runtime code,
or turn this folder into a second production implementation. Compare output against it,
then port only the required behavior into `js/portrait.js` and its approved runtime helper.
