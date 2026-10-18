/* Maritime knowledge and paid facilities retain their existing numeric contracts. */
window.FBDATA = window.FBDATA || {};

FBDATA.techCorrections_maritime = {
  clinker_shipbuilding:{
    name:"Clinker Shipbuilding", icon:"🛶", domain:'seafaring', cost:20,
    req:["mortise_tenon_shipbuilding"],
    history:{attested:[300,850], adoption:{
      default:[500,850],
      latin:[450,800],
      byzantine:[500,850],
      islamic:[500,850],
      persianate:[510,860],
      slavic:[465,815],
      nordic:[470,820],
      steppe:[530,880],
      baltic_finnic:[485,835],
      caucasian:[525,875],
      northeast_african:[535,885]
    }},
    desc:"Overlapping planks form light, flexible hulls suited to northern seas. This specialized construction is distinct from ordinary fishing boats.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["rule:clinker_hulls"], capabilities:[], fx:{"trade":0.005,"seaTransport":1000}
  },
  knarrs:{
    name:"Ocean-Going Knarrs", icon:"⛵", domain:'seafaring', cost:50,
    req:["clinker_shipbuilding","square_sail"],
    history:{attested:[750,1050], adoption:{
      default:[830,1040],
      latin:[780,990],
      byzantine:[830,1040],
      islamic:[830,1040],
      persianate:[840,1050],
      slavic:[865,1075],
      nordic:[800,1010],
      steppe:[860,1070],
      baltic_finnic:[885,1095],
      caucasian:[855,1065],
      northeast_african:[865,1075]
    }},
    desc:"Deep-bellied sailing ships carry cargo and livestock across northern oceans. Local commercial fishing does not require this cargo-vessel tradition.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["rule:knarr_trade"], capabilities:[], fx:{"trade":0.015,"seaTransport":1500}
  },
  longships:{
    name:"Longships", icon:"🛶", domain:'seafaring', cost:50,
    req:["clinker_shipbuilding","square_sail"],
    history:{attested:[650,1000], adoption:{
      default:[730,990],
      latin:[750,1010],
      byzantine:[730,990],
      islamic:[730,990],
      persianate:[740,1000],
      slavic:[765,1025],
      nordic:[700,960],
      steppe:[760,1020],
      baltic_finnic:[715,975],
      caucasian:[755,1015],
      northeast_african:[765,1025]
    }},
    desc:"Shallow, double-ended clinker hulls combine oars, sail, speed, and beach landings for specialized long-range operations. Ordinary coastal boat work remains separate.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["rule:longships"], capabilities:["seafaring_raids"], fx:{"seaMovement":0.02,"seaTransport":1500}
  },
  coastal_piloting:{
    name:"Coastal Piloting", icon:"🗺", domain:'seafaring', cost:20,
    req:[],
    history:{attested:[-1000,700], adoption:{
      default:[480,650],
      latin:[430,600],
      byzantine:[410,580],
      islamic:[410,580],
      persianate:[420,590],
      slavic:[445,615],
      nordic:[450,620],
      steppe:[440,610],
      baltic_finnic:[465,635],
      caucasian:[435,605],
      northeast_african:[445,615]
    }},
    desc:"Remembered landmarks, winds, currents, and anchorages support coastal voyages and a paid commercial fishing boat. This practical knowledge requires neither written routes nor navigational instruments.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["practice:coastal_piloting","enterprise:fishing_boat_business"], capabilities:[], fx:{"seaMovement":0.005,"seaTransport":500}
  },
  celestial_navigation:{
    name:"Celestial Navigation", icon:"🌟", domain:'seafaring', cost:50,
    req:["astronomical_observation","coastal_piloting"],
    history:{attested:[700,1100], adoption:{
      default:[850,1120],
      latin:[870,1140],
      byzantine:[780,1050],
      islamic:[780,1050],
      persianate:[860,1130],
      slavic:[885,1155],
      nordic:[820,1090],
      steppe:[880,1150],
      baltic_finnic:[905,1175],
      caucasian:[875,1145],
      northeast_african:[885,1155]
    }},
    desc:"Observed stars and solar height refine direction finding beyond sight of land. This optional refinement does not make instruments compulsory for ordinary voyages.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["rule:celestial_navigation"], capabilities:["oceanic_navigation"], fx:{"seaMovement":0.015}
  },
  naval_logbooks:{
    name:"Sailing Directions", icon:"📖", domain:'seafaring', cost:100,
    req:["scriptoria","coastal_piloting"],
    history:{attested:[850,1200], adoption:{
      default:[1000,1230],
      latin:[950,1180],
      byzantine:[930,1160],
      islamic:[930,1160],
      persianate:[1010,1240],
      slavic:[1035,1265],
      nordic:[1040,1270],
      steppe:[1030,1260],
      baltic_finnic:[1055,1285],
      caucasian:[1025,1255],
      northeast_african:[1035,1265]
    }},
    desc:"Written sailing directions preserve distances, hazards, winds, and harbor approaches as an optional refinement. Remembered coastal routes remain available without a written logbook.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["rule:sailing_directions"], capabilities:["oceanic_navigation"], fx:{"seaMovement":0.01}
  },
  harbor_works:{
    name:"Harbor Works", icon:"⚓", domain:'seafaring', cost:20,
    req:["lime_mortar"],
    history:{attested:[-500,700], adoption:{
      default:[500,720],
      latin:[450,670],
      byzantine:[430,650],
      islamic:[430,650],
      persianate:[440,660],
      slavic:[465,685],
      nordic:[470,690],
      steppe:[460,680],
      baltic_finnic:[485,705],
      caucasian:[455,675],
      northeast_african:[465,685]
    }},
    desc:"Quays, moles, slips, and beacons shelter vessels and speed their loading.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["building:harbor","building:arsenal"], capabilities:[], fx:{"seaTransport":750}
  },
  dry_docks:{
    name:"Graving Docks", icon:"⚓", domain:'seafaring', cost:100,
    req:["harbor_works","stone_bridgebuilding"],
    history:{attested:[900,1250], adoption:{
      default:[1070,1280],
      latin:[1020,1230],
      byzantine:[1000,1210],
      islamic:[1000,1210],
      persianate:[1080,1290],
      slavic:[1105,1315],
      nordic:[1110,1320],
      steppe:[1100,1310],
      baltic_finnic:[1125,1335],
      caucasian:[1095,1305],
      northeast_african:[1105,1315]
    }},
    desc:"Drainable basins expose hulls for inspection and major repair.",
    confidence:'high', sources:['UNGER','PRYOR'],
    unlocks:["rule:dry_docks"], capabilities:[], fx:{"seaMovement":0.01}
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.techCorrections_maritime).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(FBDATA.tech,id))
      throw new Error('Missing maritime technology correction target: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.techCorrections_maritime[id]));
  });
})();
