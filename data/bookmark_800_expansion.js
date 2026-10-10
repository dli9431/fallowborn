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
    {id:'kath_district',name:'Kath',realm:'khwarazm_800',culture:'persian',religion:'zoroastrian',dev:3,
      communities:[{culture:'persian',religion:'zoroastrian',populationShare0:8000},
        {culture:'persian',religion:'east_syriac',populationShare0:2000}]},
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
      ruler:{generated:true,culture:'persian',sex:'m',born:760,mar:7,trait:'patient'}}
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
