/* Optional heated bathing and engineered river diversion. Schedules are simulation choices. */
window.FBDATA = window.FBDATA || {};
FBDATA.tech_baths_headworks = {
  hypocaust_heating:{
    name:'Hypocaust Heating', icon:'?', domain:'crafts', cost:20, req:['lime_mortar'],
    history:{attested:[-100,600],adoption:{
      default:[600,1100],latin:[1,400],byzantine:[1,500],islamic:[500,850],
      persianate:[300,850],slavic:[800,1150],nordic:[850,1200],steppe:[850,1250],
      baltic_finnic:[950,1300],caucasian:[300,900],northeast_african:[100,700]
    }},
    desc:'Engineered underfloor heating supports an optional heated public bath with real local fuel, lawful water and funded service. Unheated public baths, domestic bathing and ordinary hearths remain available. Heating grants no health effect.',
    confidence:'medium', sources:['VITRUVIUS_V_10','UNESCO_QUSEIR_AMRA'],
    unlocks:[], capabilities:[], fx:{}
  },
  diversion_dams:{
    name:'Diversion Headworks', icon:'??', domain:'agriculture', cost:50,
    req:['irrigation_channels','lime_mortar'],
    history:{attested:[-500,600],adoption:{
      default:[400,1050],latin:[1,650],byzantine:[1,600],islamic:[-500,400],
      persianate:[200,450],slavic:[700,1100],nordic:[850,1200],steppe:[800,1150],
      baltic_finnic:[900,1250],caucasian:[200,800],northeast_african:[1,600]
    }},
    desc:'Engineered river diversion supports optional headworks delivering an actual lawful allocation through a connected route to downstream demand. Ordinary earth banks and irrigation remain available. Knowledge creates no source, right or installation.',
    confidence:'medium', sources:['UNESCO_MARIB','UNESCO_SHUSHTAR'],
    unlocks:['building:diversion_headworks'], capabilities:[], fx:{}
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.tech_baths_headworks).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.tech,id)) throw new Error('Duplicate bathing or headworks technology: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.tech_baths_headworks[id]));
  });
  FBDATA.techImpactReviews.features.public_bathing_facility = {
    mode:'hard',tech:['lime_mortar'],fallback:'Ordinary domestic bathing and modest unengineered premises',
    rationale:'Optional maintained masonry bathing premises need mortar knowledge. Ordinary bathing remains available; the facility creates no institution, health effect or water.'
  };
  FBDATA.techImpactReviews.features.heated_bathing = {
    mode:'hard',tech:['hypocaust_heating'],fallback:'Unheated public baths, domestic bathing and ordinary hearths',
    rationale:'Only the optional heated profile needs hypocaust knowledge. Unheated investment and inherited repairs remain available; real finite fuel and water are still required.'
  };
  FBDATA.techImpactReviews.features.engineered_headworks = {
    mode:'hard',tech:['diversion_dams'],fallback:'Ordinary earth banks and irrigation channels',
    rationale:'Optional engineered river diversion needs organized headworks knowledge. Basic irrigation and inherited repairs remain available; rights and actual downstream service remain independent.'
  };
})();
