/* Historical foundations are opportunities, not calendar deadlines. */
window.FBDATA = window.FBDATA || {};
FBDATA.historicalAmbitions = [
  { id:'normandy', name:'Establish Normandy',
    desc:'Give a Norse foothold around Rouen a lasting place among the duchies.',
    region:'d_normandy', tier:5, culture:'norse', capital:'rouen', share:0.5,
    prestige:150, bonus:'tax', amount:0.1, days:1800, established:['1066'] },
  { id:'norway', name:'Unify Norway',
    desc:'Bring the Norwegian lands together beneath one recognized crown.',
    region:'k_norway', tier:6, share:0.75,
    prestige:250, bonus:'levy', amount:0.1, days:1800, established:['1066'] },
  { id:'england', name:'Unite England',
    desc:'Bind the English kingdoms into a lasting royal settlement.',
    region:'k_england', tier:6, share:0.75,
    prestige:250, bonus:'tax', amount:0.1, days:1800, established:['1066'] },
  { id:'sicily', name:'Establish the Sicilian crown',
    desc:'Unite the island and southern mainland under the Sicilian crown.',
    region:'k_sicily', tier:6, share:0.5, island:'d_sicily',
    mainland:['d_apulia','d_calabria'],
    prestige:200, bonus:'tax', amount:0.1, days:1800, established:[] }
];
