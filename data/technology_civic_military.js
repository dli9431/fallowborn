/* Commercial, administrative and castle catalogue corrections.
   Complete literal replacements preserve inherited costs, adoption and effects. */
window.FBDATA = window.FBDATA || {};

FBDATA.techCorrections_civic_military = {
  annual_fairs:{
    name:'Chartered Annual Fairs', icon:'🎪', domain:'commerce', cost:100,
    req:['urban_markets'],
    history:{ attested:[850,1150], adoption:{
      default:[980,1170], latin:[930,1120], byzantine:[980,1170], islamic:[910,1100],
      persianate:[990,1180], slavic:[1015,1205], nordic:[1020,1210], steppe:[1010,1200],
      baltic_finnic:[1035,1225], caucasian:[1005,1195], northeast_african:[1015,1205]
    } },
    desc:'Protected scheduled fairs coordinate distant trade. Their public protection need not originate in a merchant guild.',
    confidence:'high', sources:['LOPEZ','SPUFFORD'],
    unlocks:['rule:annual_fairs'], capabilities:[], fx:{trade:0.015}
  },
  siege_engineering:{
    name:'Siege Engineering', icon:'🎯', domain:'warfare', cost:50,
    req:['geometry'],
    history:{ attested:[650,1100], adoption:{
      default:[850,1120], latin:[800,1070], byzantine:[780,1050], islamic:[780,1050],
      persianate:[790,1060], slavic:[885,1155], nordic:[890,1160], steppe:[880,1150],
      baltic_finnic:[905,1175], caucasian:[875,1145], northeast_african:[885,1155]
    } },
    desc:'Specialists organize earthworks, approaches and siege calculations. Specific engines require their own knowledge and equipment.',
    confidence:'high', sources:['DEVRIES','BACHRACH'],
    unlocks:['rule:siege_engineers'], capabilities:[], fx:{siege:0.04}
  },
  ringworks:{
    name:'Ringworks', icon:'🛡', domain:'warfare', cost:50,
    req:['fortified_camps'],
    history:{ attested:[500,950], adoption:{
      default:[700,960], latin:[650,910], byzantine:[700,960], islamic:[700,960],
      persianate:[710,970], slavic:[665,925], nordic:[670,930], steppe:[730,990],
      baltic_finnic:[755,1015], caucasian:[725,985], northeast_african:[735,995]
    } },
    desc:'Organized earth-and-timber strongpoints support maintained local defenses. Basic refuge enclosures predate this refinement.',
    confidence:'high', sources:['DEVRIES','BACHRACH'],
    unlocks:['rule:ringworks'], capabilities:[], fx:{levy:0.015}
  },
  castle_towers:{
    name:'Flanking Castle Towers', icon:'🏰', domain:'warfare', cost:50,
    req:['ringworks','lime_mortar'],
    history:{ attested:[750,1100], adoption:{
      default:[900,1120], latin:[850,1070], byzantine:[830,1050], islamic:[830,1050],
      persianate:[910,1130], slavic:[935,1155], nordic:[940,1160], steppe:[930,1150],
      baltic_finnic:[955,1175], caucasian:[855,1075], northeast_african:[935,1155]
    } },
    desc:'Projecting towers integrated into castle walls and gates coordinate defensive fire. This models a castle arrangement, not the first flanking tower.',
    confidence:'high', sources:['DEVRIES','BACHRACH'],
    unlocks:['rule:flanking_towers'], capabilities:[], fx:{battle:0.005}
  },
  stone_castles:{
    name:'Stone Castles', icon:'🏰', domain:'warfare', cost:100,
    req:['castle_towers','lime_mortar'],
    history:{ attested:[850,1150], adoption:{
      default:[980,1170], latin:[930,1120], byzantine:[910,1100], islamic:[910,1100],
      persianate:[990,1180], slavic:[1015,1205], nordic:[1020,1210], steppe:[1010,1200],
      baltic_finnic:[1035,1225], caucasian:[935,1125], northeast_african:[1015,1205]
    } },
    desc:'Maintained masonry keeps and curtains organize an elite residence as a fortress. Ordinary masonry walls and inherited circuits are older and distinct.',
    confidence:'high', sources:['DEVRIES','BACHRACH'],
    unlocks:['building:keep'], capabilities:[], fx:{siege:0.03}
  },
  concentric_defenses:{
    name:'Concentric Defenses', icon:'🏰', domain:'warfare', cost:150,
    req:['stone_castles','castle_towers'],
    history:{ attested:[1050,1300], adoption:{
      default:[1180,1320], latin:[1130,1270], byzantine:[1110,1250], islamic:[1110,1250],
      persianate:[1190,1330], slavic:[1215,1355], nordic:[1220,1360], steppe:[1210,1350],
      baltic_finnic:[1235,1375], caucasian:[1205,1345], northeast_african:[1215,1355]
    } },
    desc:'Coordinated castle curtains and controlled approaches provide successive defensive positions. Multiple defensive circuits existed before this castle refinement.',
    confidence:'high', sources:['DEVRIES','BACHRACH'],
    unlocks:['rule:concentric_castles'], capabilities:[], fx:{siege:0.04}
  },
  fortified_gates:{
    name:'Advanced Gate Defenses', icon:'🚪', domain:'warfare', cost:100,
    req:['castle_towers'],
    history:{ attested:[850,1200], adoption:{
      default:[1010,1230], latin:[960,1180], byzantine:[940,1160], islamic:[940,1160],
      persianate:[1020,1240], slavic:[1045,1265], nordic:[1050,1270], steppe:[1040,1260],
      baltic_finnic:[1065,1285], caucasian:[1035,1255], northeast_african:[1045,1265]
    } },
    desc:'Integrated gate towers, controlled entries and barriers reinforce an organized castle defense. Basic fortified entrances are not a new invention.',
    confidence:'high', sources:['DEVRIES','BACHRACH'],
    unlocks:['rule:fortified_gates'], capabilities:[], fx:{}
  },
  postal_relays:{
    name:'Mounted Relay Posts', icon:'📯', domain:'commerce', cost:50,
    req:['pack_saddles','road_surveys'],
    history:{ attested:[700,1150], adoption:{
      default:[900,1170], latin:[920,1190], byzantine:[830,1100], islamic:[830,1100],
      persianate:[840,1110], slavic:[935,1205], nordic:[940,1210], steppe:[860,1130],
      baltic_finnic:[955,1225], caucasian:[925,1195], northeast_african:[935,1205]
    } },
    desc:'Knowledge of provisioned mounts and relay stations improves official communication. Research alone establishes no operating postal network.',
    confidence:'high', sources:['LOPEZ','SPUFFORD'],
    unlocks:['rule:relay_posts'], capabilities:[], fx:{movement:0.02}
  },
  capitularies:{
    name:'Royal Capitularies', icon:'📜', domain:'governance', cost:50,
    req:['written_law','diplomatic_correspondence'],
    history:{ attested:[650,900], adoption:{
      default:[760,920], latin:[710,870], byzantine:[760,920], islamic:[760,920],
      persianate:[770,930], slavic:[795,955], nordic:[800,960], steppe:[790,950],
      baltic_finnic:[815,975], caucasian:[785,945], northeast_african:[795,955]
    } },
    desc:'Chaptered royal orders organize the communication of policy. Documentary knowledge grants no office, jurisdiction or public revenue entitlement.',
    confidence:'high', sources:['BLOCH','BERMAN'],
    unlocks:['rule:capitularies'], capabilities:[], fx:{levy:0.01}
  },
  mint_assay:{
    name:'Mint Assaying', icon:'💰', domain:'commerce', cost:100,
    req:['standardized_coinage','weights_measures'],
    history:{ attested:[800,1150], adoption:{
      default:[940,1170], latin:[890,1120], byzantine:[870,1100], islamic:[870,1100],
      persianate:[950,1180], slavic:[975,1205], nordic:[980,1210], steppe:[970,1200],
      baltic_finnic:[995,1225], caucasian:[965,1195], northeast_african:[975,1205]
    } },
    desc:'Touchstones, balances and cupellation test coin fineness. Knowing these methods creates neither an operating mint nor the right to issue coin.',
    confidence:'high', sources:['LOPEZ','SPUFFORD'],
    unlocks:['rule:mint_assay'], capabilities:['assayed_coinage'], fx:{finance:0.015}
  },
  physicians:{
    name:'Court Physicians', icon:'🌿', domain:'learning', cost:50,
    req:['herbals','scriptoria'],
    history:{ attested:[700,1100], adoption:{
      default:[850,1130], latin:[870,1150], byzantine:[780,1060], islamic:[780,1060],
      persianate:[790,1070], slavic:[885,1165], nordic:[890,1170], steppe:[880,1160],
      baltic_finnic:[905,1185], caucasian:[875,1155], northeast_african:[885,1165]
    } },
    desc:'Organized court services retain learned practitioners alongside ordinary care. Research grants neither a personal appointment nor a medical qualification.',
    confidence:'high', sources:['GRANT','LINDBERG'],
    unlocks:['rule:court_physicians'], capabilities:[], fx:{health:0.003}
  },
  hospitals:{
    name:'Endowed Hospitals', icon:'🏥', domain:'learning', cost:50,
    req:['herbals'],
    history:{ attested:[650,1100], adoption:{
      default:[800,1120], latin:[820,1140], byzantine:[730,1050], islamic:[730,1050],
      persianate:[740,1060], slavic:[835,1155], nordic:[840,1160], steppe:[830,1150],
      baltic_finnic:[855,1175], caucasian:[825,1145], northeast_african:[835,1155]
    } },
    desc:'Maintained endowed wards organize practitioners and medicines at an optional larger scale. Earlier charitable guesthouses and ordinary care remain distinct.',
    confidence:'high', sources:['GRANT','LINDBERG'],
    unlocks:['rule:hospitals','building:hospital'], capabilities:[], fx:{health:0.002, populationCrisisProtection:0.03}
  }
};

(function () {
  'use strict';
  var rows = FBDATA.techCorrections_civic_military;
  for (var id in rows) if (Object.prototype.hasOwnProperty.call(rows, id)) {
    FBDATA.tech[id] = rows[id];
  }
})();
