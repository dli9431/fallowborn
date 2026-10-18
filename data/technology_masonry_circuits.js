/* Organized circuit knowledge; regional adoption pairs are simulation choices. */
window.FBDATA = window.FBDATA || {};
FBDATA.tech_masonry_circuits = {
  masonry_circuits:{
    name:'Masonry Circuit Defenses', icon:'🧱', domain:'warfare', cost:50,
    req:['lime_mortar','fortified_camps'],
    history:{attested:[200,600],adoption:{
      default:[500,1050],latin:[200,450],byzantine:[200,400],islamic:[400,850],
      persianate:[200,600],slavic:[750,1100],nordic:[800,1150],steppe:[700,1100],
      baltic_finnic:[850,1250],caucasian:[300,750],northeast_african:[200,800]
    }},
    desc:'Organized masonry circuit works support an optional construction profile of the county fort. Ordinary fort progression, timber defenses and inherited repairs remain available. Knowledge supplies no fort, garrison or additional siege bonus.',
    confidence:'high', sources:['ENGLISH_HERITAGE_PORTCHESTER_HISTORY'],
    unlocks:[], capabilities:[], fx:{}
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.tech_masonry_circuits).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.tech,id))
      throw new Error('Duplicate masonry technology: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.tech_masonry_circuits[id]));
  });
  FBDATA.techImpactReviews.features.masonry_circuit_construction = {
    mode:'hard', tech:['masonry_circuits'],
    fallback:'Ordinary fort progression, timber defenses and inherited repairs remain available.',
    rationale:'Optional new masonry circuit construction requires organized circuit knowledge. It changes no default fort requirement and grants no physical asset, stock, people or additional defense. Existing property and funded work retain their canonical repair and completion paths.'
  };
})();
