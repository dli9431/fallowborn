/* Optional construction variants. Bundled assets retain their default definitions. */
window.FBDATA = window.FBDATA || {};
FBDATA.buildingProfiles = {};
FBDATA.techImpactReviews.features.building_profile_selection = {
  mode:'none', tech:[], rationale:'Selecting a physical construction variant is authoring and accounting, not a discovery. Individual machinery retains its own technology review.'
};
FBDATA.techImpactReviews.features.building_profile_inheritance = {
  mode:'none', tech:[], rationale:'Retaining the identity of an inherited physical asset is property accounting. New construction keeps its machinery gates, while actual operation still needs current permission, inputs and payment.'
};
