/* Optional spring 1066 island world. Representation and evidence limits:
   docs/research/north-atlantic-1066.md. Retained worlds remain independent. */
(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var b = FBDATA.bookmarks['1066'];
  var sourceId = 'inhabited_v2_governments_v2_islamic_v1_institutions_v1';
  if (!b.revisions[sourceId]) throw new Error('Missing expanded 1066 institution source');
  var source = Object.assign({}, b, b.revisions.baseline, b.revisions[sourceId]);
  var geography = FBDATA.geographies.europe_north_atlantic_2;
  var REVISION_CONTENT = {
    bookmarkId:'1066', revisionId:'north_atlantic_v1',
    constituencyProfiles:{
      iceland_commonwealth_1066:{
        eligibility:{minAge:20,minServiceYears:0,skills:{dip:3},free:true},
        selection:{threshold:0.75,tie:'id',termDays:1080,nominationCost:0},
        recall:{threshold:0.75,reasons:['neglect','overreach','ineligible']},
        obligations:{revenueRate:0,levyRate:0,maxDues:0,maxLevy:0,reserve:0},
        reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'],
        powers:['peace'],
        members:[
          {id:'chieftains',name:'Chieftains and thingmen',weight:3,basis:'custom',continuity:'institution',support:60},
          {id:'households',name:'Free farming households',weight:2,basis:'custom',continuity:'institution',support:55}
        ]
      }
    },
    realms:[
      {id:'iceland_commonwealth_1066',name:'Icelandic Commonwealth',color:'#739997',
        capital:'iceland_southwest',government:'assembly_polity',rank:2,aggression:0,
        religion:'catholic',constituency:'iceland_commonwealth_1066',
        representative:{sex:'m',born:1030,skills:{dip:5,ste:4,mar:3}}},
      {id:'faroes_households_1066',name:'Faroese households',color:'#819875',
        capital:'faroes',government:'assembly_polity',rank:1,aggression:0,
        religion:'catholic',constituency:'coastal_households',
        representative:{sex:'m',born:1030,skills:{dip:5,ste:4,mar:3}}},
      /* Paul is the sole executable court incumbent. Erlend is a living
         authored brother, without a second command, veto or revenue power. */
      {id:'orkney_earldom_1066',name:'Orkney',color:'#a38765',capital:'orkney',
        government:'territorial',rank:2,aggression:0,religion:'catholic',
        ruler:{name:'Paul Thorfinnsson',sex:'m',culture:'norse',born:1030,mar:7,trait:'patient'},
        royalCourt:{dynasty:'Thorfinnsson',founderId:'thorfinn',rulerFatherId:'thorfinn',
          spouseId:null,rulerSiblingIds:['erlend'],members:[
          {id:'thorfinn',name:'Thorfinn Sigurdsson',sex:'m',culture:'norse',religion:'catholic',
            born:1009,alive:false},
          {id:'erlend',name:'Erlend Thorfinnsson',sex:'m',culture:'norse',religion:'catholic',
            born:1032,fatherId:'thorfinn',spouseId:null,siblingIds:['ruler'],homeProvinceId:'orkney',mar:6,trait:'patient'}
        ]}}
    ],
    provinces:[
      {id:'iceland_southwest',name:'Southwestern Iceland',realm:'iceland_commonwealth_1066',
        duchy:'iceland_coast_1066',culture:'norse',religion:'catholic',dev:2},
      {id:'iceland_west',name:'Breidafjordur district',realm:'iceland_commonwealth_1066',
        duchy:'iceland_coast_1066',culture:'norse',religion:'catholic',dev:1},
      {id:'iceland_northwest',name:'Westfjords',realm:'iceland_commonwealth_1066',
        duchy:'iceland_coast_1066',culture:'norse',religion:'catholic',dev:1},
      {id:'iceland_north',name:'Eyjafjordur district',realm:'iceland_commonwealth_1066',
        duchy:'iceland_coast_1066',culture:'norse',religion:'catholic',dev:2},
      {id:'iceland_east',name:'Eastern fjords',realm:'iceland_commonwealth_1066',
        duchy:'iceland_coast_1066',culture:'norse',religion:'catholic',dev:1},
      {id:'iceland_south',name:'Southern coastal settlements',realm:'iceland_commonwealth_1066',
        duchy:'iceland_coast_1066',culture:'norse',religion:'catholic',dev:2},
      {id:'faroes',name:'Faroes',realm:'faroes_households_1066',
        duchy:'faroes_district_1066',culture:'norse',religion:'catholic',dev:2},
      {id:'orkney',name:'Orkney',realm:'orkney_earldom_1066',
        duchy:'northern_isles_1066',culture:'norse',religion:'catholic',dev:3},
      {id:'shetland',name:'Shetland',realm:'orkney_earldom_1066',
        duchy:'northern_isles_1066',culture:'norse',religion:'catholic',dev:2},
      {id:'caithness',name:'Caithness',realm:'orkney_earldom_1066',
        duchy:'caithness_district_1066',culture:'norse',religion:'catholic',dev:2}
    ],
    duchies:{
      iceland_coast_1066:{name:'Icelandic coast',kingdom:'iceland_1066'},
      faroes_district_1066:{name:'Faroes',kingdom:'norway'},
      northern_isles_1066:{name:'Northern Isles',kingdom:'norway'},
      caithness_district_1066:{name:'Caithness',kingdom:'alba'}
    },
    kingdoms:{iceland_1066:{name:'Iceland',empire:null}},
    settlementLayout:{
      iceland_southwest:[{site:'iceland_southwest_farms_1066',name:'Southwestern farms',kind:'village'}],
      iceland_west:[{site:'breidafjordur_farms_site',name:'Breidafjordur farms',kind:'village'}],
      iceland_northwest:[{site:'westfjords_farms_site',name:'Westfjords farms',kind:'village'}],
      iceland_north:[{site:'eyjafjordur_farms_site',name:'Eyjafjordur farms',kind:'village'}],
      iceland_east:[{site:'iceland_east_farms_1066',name:'Eastern fjord farms',kind:'village'}],
      iceland_south:[{site:'southern_iceland_farms_site',name:'Southern farms',kind:'village'}],
      faroes:[{site:'faroes_farms_1066',name:'Faroese farms',kind:'village'}],
      orkney:[{site:'birsay_locality_site',name:'Birsay',kind:'village'}],
      shetland:[{site:'shetland_farms_1066',name:'Shetland farms',kind:'village'}],
      caithness:[{site:'caithness_farms_1066',name:'Caithness farms',kind:'village'}]
    }
  };
  Object.assign(FBDATA.constituencyProfiles, copy(REVISION_CONTENT.constituencyProfiles));
  var inhabited = {};
  REVISION_CONTENT.provinces.forEach(function (row) {
    var p = copy(row);
    /* The paired weights are simulation identity defaults, not census shares. */
    p.communities = [{culture:p.culture,religion:p.religion,populationShare0:10000,paired:true}];
    if (p.id === 'caithness') p.communities = [
      {culture:'norse',religion:'catholic',populationShare0:6000,paired:true},
      {culture:'gaelic',religion:'catholic',populationShare0:4000,paired:true}
    ];
    p.customaryRights = [{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}];
    inhabited[p.id] = p;
  });
  var revision = {};
  /* Whole-field copies of the explicit resolved source, including late
     source story attachments. Undefined fields keep normal baseline fallback. */
  ['geography','opening','openingRevision','provinces','realms','duchies','kingdoms','empires',
    'straits','crossingClasses','localInstitutions','settlementLayout','climate','religiousHeads',
    'starts','stories','storyRegions','scripted','openingRevisions','openingLegacyRevision',
    'startLocations'].forEach(function (key) {
    if (source[key] !== undefined) revision[key] = copy(source[key]);
  });
  revision.geography = 'europe_north_atlantic_2';
  revision.provinces = copy(source.provinces).concat(geography.provinceAdditions.map(function (seed) {
    return inhabited[seed.id] || copy(seed);
  }));
  revision.realms = copy(source.realms).concat(copy(REVISION_CONTENT.realms));
  revision.duchies = Object.assign({}, copy(source.duchies), copy(REVISION_CONTENT.duchies));
  revision.kingdoms = Object.assign({}, copy(source.kingdoms), copy(REVISION_CONTENT.kingdoms));
  revision.straits = copy(source.straits);
  revision.crossingClasses = copy(source.crossingClasses || {});
  geography.straits.forEach(function (pair) {
    if (!pair.some(function (id) {
      return geography.provinceAdditions.some(function (p) { return p.id === id; });
    })) return;
    var key = pair.slice().sort().join('|');
    if (!revision.straits.some(function (old) { return old.slice().sort().join('|') === key; })) {
      revision.straits.push(copy(pair));
      revision.crossingClasses[key] = geography.crossingClasses[key];
    }
  });
  revision.climate = Object.assign({}, copy(geography.climate), copy(source.climate || {}));
  revision.climate.provinces = Object.assign({}, copy(geography.climate.provinces),
    copy(source.climate && source.climate.provinces || {}));
  var layoutId = '1066_north_atlantic_v1';
  var layout = copy(FBDATA.settlementLayouts[source.settlementLayout || '1066']);
  /* Physical sites shared with the 867 revision keep one location; the
     others sit at their province seed. */
  var sharedSites = {birsay_locality_site:{x:-3.32,y:59.13}};
  Object.keys(REVISION_CONTENT.settlementLayout).forEach(function (pid) {
    var rows = REVISION_CONTENT.settlementLayout[pid];
    var seed = geography.provinceAdditions.filter(function (p) { return p.id === pid; })[0];
    rows.forEach(function (row) {
      var site = copy(sharedSites[row.site] || {x:seed.x,y:seed.y}), retained = FBDATA.settlementSites[row.site];
      if (retained && (retained.x !== site.x || retained.y !== site.y))
        throw new Error('Conflicting island site: ' + row.site);
      FBDATA.settlementSites[row.site] = site;
    });
    layout[pid] = copy(rows);
  });
  FBDATA.settlementLayouts[layoutId] = layout;
  revision.settlementLayout = layoutId;
  var opening = copy(typeof source.opening === 'string'
    ? source.openingRevisions[source.opening] : source.opening ||
      {actors:{},appointments:{},estates:[],claims:[],migrations:[]});
  /* These are bounded outside demands only. They levy nothing, establish no
     liege and grant neither crown the islands' household property. */
  opening.claims = opening.claims.concat([
    {id:'norwegian_island_demand_1066',realmId:'norway_1066',
      countyIds:['faroes','orkney','shetland'],share0:1000,evidence:'north_atlantic_crown_relationships_1066'},
    {id:'scottish_caithness_demand_1066',realmId:'scotland_1066',
      countyIds:['caithness'],share0:1000,evidence:'caithness_earldom_reconstruction_1066'}
  ]);
  revision.opening = opening;
  revision.openingRevision = 'north_atlantic_v1';
  revision.openingRevisions = Object.assign({}, revision.openingRevisions || {}, {north_atlantic_v1:copy(opening)});
  b.revisions.north_atlantic_v1 = revision;
  /* Exact source scopes accompany its institutions, without changing the
     offering rules or adding offers from unrelated review siblings. */
  [FBDATA.religiousActivities,FBDATA.religiousPatronage].forEach(function (table) {
    Object.keys(table || {}).forEach(function (key) {
      var openings = table[key].openings;
      if (Array.isArray(openings) && openings.some(function (o) {
        return o.id === '1066' && o.revision === sourceId;
      }) && !openings.some(function (o) { return o.id === '1066' && o.revision === 'north_atlantic_v1'; }))
        openings.push({id:'1066',revision:'north_atlantic_v1'});
    });
  });
})();
