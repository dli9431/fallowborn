/* Historical foundations and the scope of optional agricultural machinery.
   Complete replacements retain authored costs and regional adoption windows. */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  FBDATA.techCorrections_foundations = {
    seed_selection:{
      name:'Seed Selection', icon:'🌱', domain:'agriculture', cost:50,
      req:['crop_rotation'],
      history:{ attested:[1,900], adoption:{
        default:[600,850],
        latin:[620,870],
        byzantine:[530,780],
        islamic:[530,780],
        persianate:[540,790],
        slavic:[635,885],
        nordic:[640,890],
        steppe:[630,880],
        baltic_finnic:[655,905],
        caucasian:[625,875],
        northeast_african:[635,885]
      } },
      desc:'Households save grain from selected plants for the next sowing, a practice already described in ancient agronomy.',
      confidence:'high', sources:['ASTILL','WHITE','COLUMELLA'],
      unlocks:['practice:seed_selection'], capabilities:[], fx:{ tax:0.01, populationCapacity:0.02 }
    },
    haymaking:{
      name:'Stored Hay', icon:'🌿', domain:'agriculture', cost:50,
      req:['iron_sickles'],
      history:{ attested:[1,900], adoption:{
        default:[650,900],
        latin:[600,850],
        byzantine:[650,900],
        islamic:[650,900],
        persianate:[660,910],
        slavic:[615,865],
        nordic:[620,870],
        steppe:[680,930],
        baltic_finnic:[705,955],
        caucasian:[675,925],
        northeast_african:[685,935]
      } },
      desc:'Cutting, drying and storing grass supports animals through winter; ancient writers already described this work.',
      confidence:'high', sources:['ASTILL','WHITE','COLUMELLA'],
      unlocks:['practice:haymaking'], capabilities:[], fx:{ levy:0.01 }
    },
    stone_sawing:{
      name:'Water-Powered Stone Sawing', icon:'⚒', domain:'crafts', cost:50,
      req:['water_power','lime_mortar'],
      history:{ attested:[200,1100], adoption:{
        default:[820,1120],
        latin:[840,1140],
        byzantine:[750,1050],
        islamic:[750,1050],
        persianate:[830,1130],
        slavic:[855,1155],
        nordic:[860,1160],
        steppe:[850,1150],
        baltic_finnic:[875,1175],
        caucasian:[845,1145],
        northeast_african:[855,1155]
      } },
      desc:'Water-driven reciprocating saws cut stone for major works. A third-century relief records the technique without proving a working mill at every later site.',
      confidence:'high', sources:['GIES','SINGER','RITTI_GREWE_KESSENER'],
      unlocks:['rule:powered_stonework'], capabilities:[], fx:{ costs:{ build:-0.025 } }
    },
    water_power:{
      name:'Water Power', icon:'⚙', domain:'crafts', cost:20,
      req:['quern_stones'],
      history:{ attested:[100,700], adoption:{
        default:[400,760],
        latin:[350,710],
        byzantine:[330,690],
        islamic:[330,690],
        persianate:[410,770],
        slavic:[435,795],
        nordic:[440,800],
        steppe:[430,790],
        baltic_finnic:[455,815],
        caucasian:[425,785],
        northeast_african:[435,795]
      } },
      desc:'Flowing water provides useful rotary drive, either directly or through shafts and gearing suited to the work.',
      confidence:'high', sources:['GIES','SINGER'],
      unlocks:['rule:water_power'], capabilities:[], fx:{ costs:{ enterprise:-0.01 } }
    },
    powered_mills:{
      name:'Expanded Powered Milling', icon:'⚙', domain:'crafts', cost:50,
      req:['overshot_waterwheel'], reqAny:['trip_hammer','windmill'],
      history:{ attested:[700,1200], adoption:{
        default:[980,1240],
        latin:[930,1190],
        byzantine:[910,1170],
        islamic:[910,1170],
        persianate:[990,1250],
        slavic:[1015,1275],
        nordic:[1020,1280],
        steppe:[1010,1270],
        baltic_finnic:[1035,1295],
        caucasian:[1005,1265],
        northeast_african:[1015,1275]
      } },
      desc:'Specialized gearing and coordinated workshops extend powered milling to additional tasks. This refinement does not represent the first mechanical grain grinding.',
      confidence:'high', sources:['GIES','SINGER'],
      unlocks:['rule:powered_industry'], capabilities:[], fx:{ costs:{ build:-0.04, enterprise:-0.04 }, devCap:1 }
    },
    legume_rotation:{
      name:'Organized Legume Rotation', icon:'🌿', domain:'agriculture', cost:100,
      req:['three_field'],
      history:{ attested:[950,1250], adoption:{
        default:[1080,1300],
        latin:[1030,1250],
        byzantine:[1010,1230],
        islamic:[1010,1230],
        persianate:[1090,1310],
        slavic:[1115,1335],
        nordic:[1120,1340],
        steppe:[1110,1330],
        baltic_finnic:[1135,1355],
        caucasian:[1105,1325],
        northeast_african:[1115,1335]
      } },
      desc:'A coordinated rotation program integrates beans and peas with other crops and fallow. Growing legumes and using them to restore soil remain older practices.',
      confidence:'high', sources:['ASTILL','WHITE'],
      unlocks:['practice:legume_rotation'], capabilities:[], fx:{ tax:0.015, populationCapacity:0.02 }
    },
    heavy_plough:{
      name:'Heavy Plough', icon:'🌾', domain:'agriculture', cost:50,
      req:['ard_plough','iron_sickles'],
      history:{ attested:[650,900], adoption:{
        default:[760,1030],
        latin:[710,980],
        byzantine:[760,1030],
        islamic:[760,1030],
        persianate:[770,1040],
        slavic:[725,995],
        nordic:[730,1000],
        steppe:[790,1060],
        baltic_finnic:[815,1085],
        caucasian:[785,1055],
        northeast_african:[795,1065]
      } },
      desc:'Organized use of iron shares and mouldboards improves work on suitable heavy soils. Ordinary ploughing remains possible with simpler tools.',
      confidence:'high', sources:['ASTILL','WHITE'],
      unlocks:['practice:heavy_tillage'], capabilities:[], fx:{ tax:0.025, populationCapacity:0.02 }
    },
    improved_husbandry:{
      name:'Improved Husbandry', icon:'🐂', domain:'agriculture', cost:100,
      req:['haymaking','seed_selection'],
      history:{ attested:[900,1250], adoption:{
        default:[1040,1280],
        latin:[990,1230],
        byzantine:[970,1210],
        islamic:[970,1210],
        persianate:[1050,1290],
        slavic:[1075,1315],
        nordic:[1080,1320],
        steppe:[1070,1310],
        baltic_finnic:[1095,1335],
        caucasian:[1065,1305],
        northeast_african:[1075,1315]
      } },
      desc:'A systematic program of feeding, culling and breeding makes herds more dependable. Keeping animals and using pasture remain ordinary livelihoods.',
      confidence:'high', sources:['ASTILL','WHITE'],
      unlocks:['practice:husbandry'], capabilities:[], fx:{ tax:0.015, populationCapacity:0.02 }
    },
    selective_stockbreeding:{
      name:'Selective Stockbreeding', icon:'🐑', domain:'agriculture', cost:150,
      req:['improved_husbandry'],
      history:{ attested:[1050,1300], adoption:{
        default:[1160,1340],
        latin:[1110,1290],
        byzantine:[1160,1340],
        islamic:[1090,1270],
        persianate:[1170,1350],
        slavic:[1195,1375],
        nordic:[1200,1380],
        steppe:[1190,1370],
        baltic_finnic:[1215,1395],
        caucasian:[1185,1365],
        northeast_african:[1195,1375]
      } },
      desc:'Sustained selection develops herd lines for wool, milk, traction or hardiness. This organized refinement does not begin ordinary animal breeding.',
      confidence:'high', sources:['ASTILL','WHITE'],
      unlocks:['practice:selective_breeding'], capabilities:[], fx:{ tax:0.015 }
    }
  };

  Object.keys(FBDATA.techCorrections_foundations).forEach(function (id) {
    if (!FBDATA.tech || !Object.prototype.hasOwnProperty.call(FBDATA.tech, id)) {
      throw new Error('Technology correction requires an existing definition: ' + id);
    }
    FBDATA.tech[id] = FBDATA.techCorrections_foundations[id];
  });
}());
