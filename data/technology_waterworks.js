/* Engineered water knowledge. Adoption schedules are simulation choices. */
window.FBDATA = window.FBDATA || {};
FBDATA.tech_waterworks = {
  aqueduct_maintenance:{
    name:'Aqueduct Maintenance', icon:'💧', domain:'commerce', cost:50,
    req:['lime_mortar','geometry'],
    history:{attested:[-100,600],adoption:{
      default:[400,1000],latin:[1,400],byzantine:[1,350],islamic:[200,800],
      persianate:[200,600],slavic:[700,1050],nordic:[800,1150],steppe:[700,1200],
      baltic_finnic:[900,1250],caucasian:[200,700],northeast_african:[100,700]
    }},
    desc:'Organized maintenance of engineered conduits supports optional maintained aqueducts with an actual lawful intake, route and funded delivery. Ordinary wells, water carriage and inherited repairs remain available.',
    confidence:'medium', sources:['VITRUVIUS_VIII_6','CASSIODORUS_VARIAE_VII_6'],
    unlocks:['building:aqueduct'], capabilities:[], fx:{}
  },
  qanat_construction:{
    name:'Qanat Construction', icon:'💧', domain:'agriculture', cost:50,
    req:['irrigation_channels','geometry'],
    history:{attested:[-300,650],adoption:{
      default:[600,1100],latin:[500,1000],byzantine:[200,850],islamic:[200,800],
      persianate:[-200,400],slavic:[850,1200],nordic:[900,1250],steppe:[500,1000],
      baltic_finnic:[950,1300],caucasian:[300,850],northeast_african:[200,850]
    }},
    desc:'Surveying and maintaining underground gravity routes supports optional qanat works with a real groundwater intake, gradient, lawful access and funded delivery. Ordinary wells and channels remain available.',
    confidence:'medium', sources:['SPOONER_ABYARI','GYSELEN_SASANIAN_ECONOMY','UNESCO_PERSIAN_QANAT'],
    unlocks:['building:qanat_waterworks'], capabilities:[], fx:{}
  },
  cistern_engineering:{
    name:'Engineered Cisterns', icon:'💧', domain:'commerce', cost:20,
    req:['lime_mortar'],
    history:{attested:[-100,600],adoption:{
      default:[400,850],latin:[1,400],byzantine:[1,350],islamic:[200,700],
      persianate:[200,700],slavic:[600,1000],nordic:[750,1100],steppe:[600,1050],
      baltic_finnic:[800,1200],caucasian:[200,800],northeast_african:[1,500]
    }},
    desc:'Engineered water storage supports optional maintained urban cisterns with actual finite storage and lawful inflow. Rain-fed storage needs no aqueduct; domestic collection and ordinary water remain available.',
    confidence:'medium', sources:['VITRUVIUS_VIII_6','PROCOPIUS_BUILDINGS_II'],
    unlocks:['building:urban_cisterns'], capabilities:[], fx:{}
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.tech_waterworks).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.tech,id))
      throw new Error('Duplicate waterworks technology: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.tech_waterworks[id]));
  });
  FBDATA.techImpactReviews.features.engineered_aqueduct = {
    mode:'hard', tech:['aqueduct_maintenance'], fallback:'Ordinary wells, water carriage and inherited repair',
    rationale:'Optional engineered conveyance needs organized conduit knowledge; ordinary water and existing property repair remain available. Completion creates no source, water or asset.'
  };
  FBDATA.techImpactReviews.features.engineered_qanat = {
    mode:'hard', tech:['qanat_construction'], fallback:'Ordinary wells and irrigation channels',
    rationale:'Optional groundwater works need organized surveying and maintenance knowledge; ordinary wells and channels remain available. Existing assets remain repairable without a new research gate.'
  };
  FBDATA.techImpactReviews.features.engineered_cistern = {
    mode:'hard', tech:['cistern_engineering'], fallback:'Domestic collection and ordinary water',
    rationale:'Optional engineered storage needs cistern knowledge, without an aqueduct prerequisite. Ordinary water collection and inherited repair remain available; no stored water is granted.'
  };
})();
