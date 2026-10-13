/* Winter 800 inhabited districts. Sources and deliberately uninhabited
   candidates: docs/research/800-inhabited-terrain.md. Coordinates bound a
   district, not a surveyed polity. Numerical shares are simulation weights. */
(function () {
  'use strict';
  var b = FBDATA.bookmarks['800'];
  var layout = JSON.parse(JSON.stringify(FBDATA.settlementLayouts[b.settlementLayout]));
  var seeds = FBDATA.geographies.europe_regional_2.provinceAdditions;
  var additions = [
    {id:'jenne_district',name:'Jenne-jeno',realm:'jenne_800',culture:'sahelian_476',
      religion:'sahel_traditional_476',dev:3,
      communities:[{culture:'sahelian_476',religion:'sahel_traditional_476',populationShare0:10000}]},
    {id:'gao_district',name:'Gao-Saney',realm:'gao_saney_800',culture:'sahelian_476',
      religion:'sahel_traditional_476',dev:2,
      communities:[{culture:'sahelian_476',religion:'sahel_traditional_476',populationShare0:10000}]},
    {id:'qasr_ibrim',name:'Ibrim',realm:'makuria',culture:'nubian',religion:'miaphysite',dev:2,
      communities:[{culture:'nubian',religion:'miaphysite',populationShare0:10000}]},
    {id:'kath_district',name:'Kath',realm:'khwarazm_800',culture:'chorasmian',religion:'zoroastrian',dev:3,
      communities:[{culture:'chorasmian',religion:'zoroastrian',populationShare0:8000},
        {culture:'chorasmian',religion:'east_syriac',populationShare0:2000}]},
    {id:'central_iran_oases',name:'Kashan district',realm:'abbasid',culture:'persian',religion:'zoroastrian',dev:1,
      communities:[{culture:'persian',religion:'zoroastrian',populationShare0:7000},
        {culture:'persian',religion:'sunni',populationShare0:3000}]},
    {id:'palmyra_district',name:'Tadmor',realm:'abbasid',culture:'syriac',religion:'miaphysite',dev:1,
      communities:[{culture:'syriac',religion:'miaphysite',populationShare0:6000},
        {culture:'arabic',religion:'sunni',populationShare0:4000}]}
  ];
  var realms = [
    /* Territorial is an explicit gameplay abstraction for local possession,
       not evidence of kings, hereditary office or a collective constitution. */
    {id:'jenne_800',name:'Jenne-jeno',capital:'jenne_district',government:'territorial',
      rank:1,aggression:0,color:'#a58b59',religion:'sahel_traditional_476',
      ruler:{generated:true,culture:'sahelian_476',sex:'m',born:760,mar:5,trait:'patient'}},
    {id:'gao_saney_800',name:'Gao-Saney',capital:'gao_district',government:'territorial',
      rank:1,aggression:0,color:'#918b64',religion:'sahel_traditional_476',
      ruler:{generated:true,culture:'sahelian_476',sex:'m',born:763,mar:5,trait:'patient'}},
    /* The local court survives conquest. Neither Samanid provincial rule nor
       the later Gurganj dynasty is projected back into this opening. */
    {id:'khwarazm_800',name:'Khwarazm',capital:'kath_district',government:'regnum',
      rank:2,aggression:0,color:'#819b85',religion:'zoroastrian',
      ruler:{generated:true,culture:'chorasmian',sex:'m',born:760,mar:7,trait:'patient'}}
  ];
  var sites = {
    jenne_district:{name:'Jenne-jeno',x:-4.55,y:13.89,kind:'town'},
    gao_district:{name:'Gao-Saney',x:0.04,y:16.28,kind:'town'},
    qasr_ibrim:{name:'Ibrim',x:31.99,y:22.65,kind:'town'},
    kath_district:{name:'Kath',x:60.75,y:41.69,kind:'town'},
    central_iran_oases:{name:'Kashan district',x:51.45,y:33.98,kind:'village'},
    palmyra_district:{name:'Tadmor',x:38.27,y:34.55,kind:'village'}
  };
  var byId = {};
  additions.forEach(function (p) {
    var site = sites[p.id], id = p.id + '_800';
    byId[p.id] = p;
    p.customaryRights = [{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}];
    FBDATA.settlementSites[id] = {x:site.x,y:site.y};
    layout[p.id] = [{site:id,name:site.name,kind:site.kind}];
  });
  FBDATA.settlementLayouts['800_inhabited_v2'] = layout;
  /* Whole-field replacements retain every old county and settlement slot.
     An unused physical addition is explicitly scenery, with no inhabitants. */
  b.revisions = Object.assign({baseline:{}},b.revisions || {});
  b.revisions.inhabited_v2 = {
    geography:'europe_regional_2',settlementLayout:'800_inhabited_v2',
    provinces:b.provinces.concat(seeds.map(function (seed) {
      return byId[seed.id] || Object.assign({},seed);
    })),
    realms:b.realms.concat(realms)
  };
  b.revision = 'inhabited_v2';
  /* government_rollout.js follows this source. It retains governments_v2
     and composes inhabited_v2_governments_v2 for fresh campaigns. */
  FBDATA.techImpactReviews.features.period_800_inhabited_terrain = {mode:'none',
    rationale:'Established households, local possession and ordinary royal or public authority need no technological discovery. Existing production, travel, provision and equipment requirements still apply.'};
})();

/* Jerusalem prayer and Nablus community continuity are independently
   reconstructed. No academy address, Khazar conversion or sanctuary right follows.
   New minority weights are simulation quantities, never historical percentages.
   Retained revisions and the fresh default remain unchanged. */
(function () {
  'use strict';
  var b = FBDATA.bookmarks['800'], source = b.revisions.inhabited_v2;
  var world = Object.assign({},b,b.revisions.baseline,source);
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var provinces = copy(world.provinces), institutions = copy(world.localInstitutions || {});
  var layout = world.settlementLayout ? copy(FBDATA.settlementLayouts[world.settlementLayout]) : null;
  function county(pid) { return provinces.filter(function (p) { return p.id === pid; })[0]; }
  function minority(pid,faith,culture) {
    var p = county(pid);
    if (!p || p.wasteland) throw new Error('Missing communal county: ' + pid);
    var rows = p.communities || [{culture:p.culture,religion:p.religion,populationShare0:10000}];
    if (rows.some(function (row) { return row.religion === faith; })) return;
    var largest = rows.reduce(function (a,row) { return row.populationShare0 > a.populationShare0 ? row : a; },rows[0]);
    if (!(largest.populationShare0 >= 100)) throw new Error('Missing communal population weight: ' + pid);
    largest.populationShare0 -= 100;
    rows.push({culture:culture,religion:faith,populationShare0:100,paired:true});
    p.communities = rows;
  }
  function nablus(name) {
    var p = county('jerusalem'), rows = layout ? layout.jerusalem : p.settlements;
    FBDATA.settlementSites.samaria_neapolis_w15 = {x:35.26,y:32.22,
      names:[{from:400,to:649,name:'Neapolis'},{from:650,name:'Nablus'}]};
    rows.push({site:'samaria_neapolis_w15',name:name,kind:'town'});
    if (p.settlements) p.settlements = copy(rows);
  }
  function place(iid,pid,site,city,kind,faith,culture,profile,property) {
    var p = county(pid), rows = layout ? layout[pid] : p.settlements;
    if (!rows || !rows.length || site && !rows.some(function (row) { return row.site === site; }))
      throw new Error('Missing communal settlement: ' + iid);
    institutions[iid] = {city:city,kind:kind,provinceId:pid,site:site || rows[0].site,
      religion:faith,culture:culture,profileId:profile,jurisdictionIds:[pid],
      vacant:true,freshOnly:true};
    if (property) institutions[iid].abbeyId = property;
  }
  minority('jerusalem','jewish','syriac');
  minority('jerusalem','samaritan','syriac');
  /* The inhabited layout leaves Jerusalem's presentation generated. Name the
     existing city first, so the town is appended after it and the Jewish
     congregation binds the city rather than Nablus. */
  if (layout && !layout.jerusalem) layout.jerusalem = [{site:'jerusalem',name:'Jerusalem',kind:'city'}];
  nablus('Nablus');
  place('jerusalem_jewish_congregation_800','jerusalem',null,'Jerusalem','congregation','jewish','syriac','jewish_local_congregation_later');
  place('nablus_samaritan_congregation_800','jerusalem','samaria_neapolis_w15','Nablus','congregation','samaritan','syriac','samaritan_lay_congregation');
  var changes = {provinces:provinces,localInstitutions:institutions};
  if (layout) {
    FBDATA.settlementLayouts['800_jewish_samaritan_v3'] = layout;
    changes.settlementLayout = '800_jewish_samaritan_v3';
  }
  b.revisions.jewish_samaritan_v3 = Object.assign({},source,changes);
})();
