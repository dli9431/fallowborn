/* Modest material and writing refinements. Regional adoption windows and
   effect sizes are simulation choices; see docs/research/early-refinements.md. */
window.FBDATA = window.FBDATA || {};
FBDATA.tech_early_refinements = {
  feltmaking:{
    name:'Feltmaking', icon:'🧶', domain:'crafts', cost:20, req:[],
    history:{attested:[-500,600],adoption:{
      default:[-200,850],latin:[-200,850],byzantine:[-200,850],islamic:[-200,850],
      persianate:[-300,600],slavic:[-200,800],nordic:[-200,850],steppe:[-500,300],
      baltic_finnic:[-100,1000],caucasian:[-300,700],northeast_african:[200,1000]
    }},
    desc:'Refined felting practices modestly reduce enterprise setup costs. Ordinary crafts, shelter and enterprise setup remain available without this refinement.',
    confidence:'medium', sources:['HERODOTUS_IV_73_75'],
    unlocks:[], capabilities:[], fx:{costs:{enterprise:-0.005}}
  },
  bookhand_standardization:{
    name:'Regularized Bookhands', icon:'📜', domain:'learning', cost:50,
    req:['scriptoria','classical_grammar'],
    history:{attested:[650,850],adoption:{
      default:[950,1200],latin:[750,900],byzantine:[800,950],islamic:[650,900],
      persianate:[700,950],slavic:[850,1100],nordic:[950,1150],steppe:[1000,1250],
      baltic_finnic:[1000,1250],caucasian:[750,1000],northeast_african:[750,1050]
    }},
    desc:'Consistent specialist letterforms, layout and correction modestly improve education within each writing tradition. Ordinary literacy, copying and education remain available without this refinement.',
    confidence:'medium', sources:['HMML_ST_GALL_116','CAMBRIDGE_MOORE_BEDE','MET_BOOKHANDS'],
    unlocks:[], capabilities:[], fx:{education:0.005}
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.tech_early_refinements).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.tech,id))
      throw new Error('Duplicate early refinement technology: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.tech_early_refinements[id]));
  });
  FBDATA.techImpactReviews.features.feltmaking = {
    mode:'soft', tech:['feltmaking'],
    rationale:'Refined felting supplies a small additive enterprise setup cost reduction within the existing floor. Ordinary crafts, shelter and enterprise setup require no feltmaking discovery; no stock, facility or military supply is created.'
  };
  FBDATA.techImpactReviews.features.bookhand_standardization = {
    mode:'soft', tech:['bookhand_standardization'],
    rationale:'Regularized specialist bookhands slightly improve education within the existing cap. Ordinary literacy, copying, education and Scriptoria remain available without this refinement; no universal script, office or additional copying institution is imposed.'
  };
})();
