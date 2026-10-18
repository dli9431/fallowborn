/* Material-independent manuscript learning. Dates and regional adoption are
   retained simulation envelopes; see docs/research/learning-and-care.md. */
window.FBDATA = window.FBDATA || {};
FBDATA.techCorrections_learning = {
  scriptoria:{
    name:{default:'Scriptoria',muslim:'Organized Copying'}, icon:'📜',
    domain:'learning', cost:50, req:['manuscript_codex'],
    history:{attested:[500,850],adoption:{
      default:[570,850],latin:[520,800],byzantine:[500,780],islamic:[500,780],
      persianate:[580,860],slavic:[605,885],nordic:[610,890],steppe:[600,880],
      baltic_finnic:[625,905],caucasian:[595,875],northeast_african:[605,885]
    }},
    desc:'Organized manuscript copying preserves and shares texts on parchment, papyrus or paper; ordinary learning does not begin with these workshops.',
    confidence:'high', sources:['GRANT','LINDBERG'],
    unlocks:['rule:scriptoria','building:library'], capabilities:[], fx:{research:0.25}
  },
  translation_schools:{
    name:'Translation Networks', icon:'🌐', domain:'learning', cost:50,
    req:['classical_grammar','scriptoria'],
    history:{attested:[650,1050],adoption:{
      default:[760,1070],latin:[780,1090],byzantine:[690,1000],islamic:[690,1000],
      persianate:[700,1010],slavic:[795,1105],nordic:[800,1110],steppe:[790,1100],
      baltic_finnic:[815,1125],caucasian:[785,1095],northeast_african:[795,1105]
    }},
    desc:'Translators, patrons and circulating manuscripts connect learned traditions without requiring a single academy.',
    confidence:'high', sources:['GRANT','LINDBERG'],
    unlocks:['rule:translations'], capabilities:[], fx:{research:0.25}
  },
  paper_scholarship:{
    name:'Paper Scholarship', icon:'📄', domain:'learning', cost:50,
    req:['paper_making','scriptoria'],
    history:{attested:[750,1050],adoption:{
      default:[830,1080],latin:[850,1100],byzantine:[830,1080],islamic:[760,1010],
      persianate:[770,1020],slavic:[865,1115],nordic:[870,1120],steppe:[860,1110],
      baltic_finnic:[885,1135],caucasian:[855,1105],northeast_african:[865,1115]
    }},
    desc:'Abundant paper makes correspondence and drafts cheaper, extending manuscript scholarship without founding a library or academy.',
    confidence:'high', sources:['GRANT','LINDBERG'],
    unlocks:[], capabilities:[], fx:{research:0.25}
  },
  universities:{
    name:{default:'Universities',muslim:'Madrasas and Colleges'}, icon:'🎓',
    domain:'learning', cost:150, req:['scholarly_networks','scriptoria'],
    history:{attested:[1000,1250],adoption:{
      default:[1100,1270],latin:[1050,1220],byzantine:[1100,1270],islamic:[1030,1200],
      persianate:[1110,1280],slavic:[1135,1305],nordic:[1140,1310],steppe:[1130,1300],
      baltic_finnic:[1155,1325],caucasian:[1125,1295],northeast_african:[1135,1305]
    }},
    desc:'Sustained advanced colleges and corporate schools organize teachers and curricula; manuscript teaching needs no paper prerequisite.',
    confidence:'high', sources:['RASHDALL','MAKDISI'],
    unlocks:['research_slot:3','building:university'],
    capabilities:['parallel_research'], fx:{research:0.35,education:0.03}
  },
  scholastic_method:{
    name:'Scholastic Method', icon:'❓', domain:'learning', cost:150,
    req:['scholarly_networks','translation_schools'],
    history:{attested:[1050,1250],adoption:{
      default:[1150,1280],latin:[1100,1230],byzantine:[1150,1280],islamic:[1080,1210],
      persianate:[1160,1290],slavic:[1185,1315],nordic:[1190,1320],steppe:[1180,1310],
      baltic_finnic:[1205,1335],caucasian:[1175,1305],northeast_african:[1185,1315]
    }},
    desc:'A formal program of questions and disputation sharpens learned argument; ordinary reasoning needs no corporate university.',
    confidence:'high', sources:['GRANT','LINDBERG'],
    unlocks:['rule:scholastic_method'], capabilities:[], fx:{research:0.2,education:0.02}
  },
  legal_studies:{
    name:'Advanced Legal Studies', icon:'⚖', domain:'learning', cost:150,
    req:['scholarly_networks','written_law'],
    history:{attested:[1000,1250],adoption:{
      default:[1120,1280],latin:[1070,1230],byzantine:[1050,1210],islamic:[1050,1210],
      persianate:[1130,1290],slavic:[1155,1315],nordic:[1160,1320],steppe:[1150,1310],
      baltic_finnic:[1175,1335],caucasian:[1145,1305],northeast_african:[1155,1315]
    }},
    desc:'Specialized teachers develop systematic study of large legal traditions; ordinary law and legal practice remain independent.',
    confidence:'high', sources:['GRANT','LINDBERG'],
    unlocks:['rule:legal_studies'], capabilities:[], fx:{education:0.015}
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.techCorrections_learning).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(FBDATA.tech,id))
      throw new Error('Missing learning technology correction target: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.techCorrections_learning[id]));
  });
  FBDATA.techImpactReviews.features.manuscript_library_access = {
    mode:'soft', tech:['scriptoria'],
    rationale:'Organized copying supports a paid physical library and its national research capacity; ordinary personal learning and copying remain available.'
  };
})();
