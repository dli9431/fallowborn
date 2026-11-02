/* Optional spring 867 North Atlantic world. Evidence, local authority and
   demographic reconstruction limits: docs/research/867-north-atlantic.md.
   This declaration neither selects the fresh world nor settles Iceland. */
FBDATA.bookmarkRevisionContent_north_atlantic_867 = {
  bookmarkId:'867', revision:'north_atlantic_v1',
  cultures:{
    northern_british_867:{name:'Northern British',parent:'brezhon'}
  },
  duchies:{
    d_faroes_867:{name:'Faroes',kingdom:'k_north_atlantic_867'},
    d_orkney_867:{name:'Orkney',kingdom:'k_north_atlantic_867'},
    d_shetland_867:{name:'Shetland',kingdom:'k_north_atlantic_867'},
    d_caithness_867:{name:'Caithness',kingdom:'k_north_atlantic_867'}
  },
  kingdoms:{k_north_atlantic_867:{name:'North Atlantic',empire:'e_north_atlantic_867'}},
  empires:{e_north_atlantic_867:{name:'North Atlantic'}},
  /* Geographic title groups confer no Norwegian, Scottish or island union.
     Each single-county court uses ordinary territorial/dynastic mechanics.
     Generated custodians, their ages and powers are simulation inputs. */
  realms:[
    {id:'faroes_local_867',name:'Faroese households',color:'#71958a',capital:'faroes',
      rank:1,aggression:0,government:'territorial',religion:'norse_pagan',
      ruler:{generated:true,sex:'m',culture:'norse',born:832,mar:3,trait:'patient'}},
    {id:'orkney_local_867',name:'Orcadian households',color:'#8e9b68',capital:'orkney',
      rank:1,aggression:0,government:'territorial',religion:'norse_pagan',
      ruler:{generated:true,sex:'m',culture:'norse',born:830,mar:3,trait:'patient'}},
    {id:'shetland_local_867',name:'Shetland households',color:'#7898a1',capital:'shetland',
      rank:1,aggression:0,government:'territorial',religion:'norse_pagan',
      ruler:{generated:true,sex:'m',culture:'norse',born:833,mar:3,trait:'patient'}},
    {id:'caithness_local_867',name:'Caithness households',color:'#9a916c',capital:'caithness',
      rank:1,aggression:0,government:'territorial',religion:'catholic',
      ruler:{generated:true,sex:'m',culture:'northern_british_867',born:831,mar:3,trait:'patient'}}
  ],
  /* Paired cohorts retain room for native continuity without claiming a
     measured majority, ethnic replacement or an exact historical census.
     Equal weights are gameplay values, not archaeological estimates. */
  provinces:[
    {id:'faroes',name:'Faroes',realm:'faroes_local_867',duchy:'d_faroes_867',dev:1,
      culture:'norse',religion:'norse_pagan',
      communities:[{culture:'norse',religion:'norse_pagan',populationShare0:10000,paired:true}],
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}]},
    {id:'orkney',name:'Orkney',realm:'orkney_local_867',duchy:'d_orkney_867',dev:1,
      culture:'norse',religion:'norse_pagan',
      communities:[{culture:'norse',religion:'norse_pagan',populationShare0:5000,paired:true},
        {culture:'northern_british_867',religion:'catholic',populationShare0:5000,paired:true}],
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}]},
    {id:'shetland',name:'Shetland',realm:'shetland_local_867',duchy:'d_shetland_867',dev:1,
      culture:'norse',religion:'norse_pagan',
      communities:[{culture:'norse',religion:'norse_pagan',populationShare0:5000,paired:true},
        {culture:'northern_british_867',religion:'catholic',populationShare0:5000,paired:true}],
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}]},
    {id:'caithness',name:'Caithness',realm:'caithness_local_867',duchy:'d_caithness_867',dev:1,
      culture:'northern_british_867',religion:'catholic',
      communities:[{culture:'northern_british_867',religion:'catholic',populationShare0:10000,paired:true}],
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}]}
  ],
  /* Regional farm presentations near evidenced localities. Neither Birsay
     nor Caithness is presented as a precisely excavated spring 867 estate. */
  layouts:{
    faroes:[{site:'kvivik_farm_site',name:'Kvivik',kind:'village'}],
    orkney:[{site:'birsay_locality_site',name:'Birsay',kind:'village'}],
    shetland:[{site:'sumburgh_farm_site',name:'Sumburgh',kind:'village'}],
    caithness:[{site:'caithness_farms_867_site',name:'Caithness',kind:'village'}]
  }
};

(function () {
  'use strict';
  var raw = FBDATA.bookmarks['867'];
  var sourceId = 'inhabited_v2_governments_v2_islamic_v1';
  var revisionId = 'north_atlantic_v1';
  var content = FBDATA.bookmarkRevisionContent_north_atlantic_867;
  var geography = FBDATA.geographies.europe_north_atlantic_2;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  if (!raw.revisions[sourceId] || raw.revisions[revisionId])
    throw new Error('Missing source or duplicate North Atlantic world revision.');
  var source = Object.assign({},raw,raw.revisions.baseline,raw.revisions[sourceId]);
  var revision = {};
  /* The public revision contract replaces whole fields. Preserve every
     supported effective source field, including later story attachments. */
  ['geography','opening','openingRevision','provinces','realms','duchies','kingdoms',
    'empires','straits','crossingClasses','localInstitutions','settlementLayout',
    'climate','religiousHeads','starts','stories','storyRegions','scripted',
    'openingRevisions','openingLegacyRevision','startLocations'].forEach(function (field) {
    if (source[field] !== undefined) revision[field] = copy(source[field]);
  });
  Object.assign(FBDATA.cultures,copy(content.cultures));
  ['duchies','kingdoms','empires'].forEach(function (field) {
    revision[field] = Object.assign({},revision[field],copy(content[field]));
  });
  revision.geography = 'europe_north_atlantic_2';
  revision.realms = revision.realms.concat(copy(content.realms));
  revision.provinces = revision.provinces.concat(geography.provinceAdditions.map(function (seed) {
    var inhabited = content.provinces.filter(function (p) { return p.id === seed.id; })[0];
    return copy(inhabited || seed);
  }));
  var layout = copy(FBDATA.settlementLayouts[source.settlementLayout]);
  Object.keys(content.layouts).forEach(function (id) { layout[id] = copy(content.layouts[id]); });
  var sites = {
    kvivik_farm_site:{x:-7.07,y:62.12},
    birsay_locality_site:{x:-3.32,y:59.13},
    sumburgh_farm_site:{x:-1.30,y:59.87},
    caithness_farms_867_site:{x:-3.40,y:58.45}
  };
  Object.keys(sites).forEach(function (id) {
    var existing = FBDATA.settlementSites[id];
    if (existing && (existing.x !== sites[id].x || existing.y !== sites[id].y))
      throw new Error('Conflicting North Atlantic physical site: ' + id);
    if (!existing) FBDATA.settlementSites[id] = copy(sites[id]);
  });
  revision.settlementLayout = '867_north_atlantic_v1';
  FBDATA.settlementLayouts[revision.settlementLayout] = layout;
  revision.climate = Object.assign({},copy(geography.climate),copy(source.climate || {}));
  revision.climate.provinces = Object.assign({},copy(geography.climate.provinces),
    copy((source.climate || {}).provinces || {}));
  /* Source crossings are authoritative. Adopt only six inhabited-endpoint
     pairs; the physical Iceland gateway stays absent in this opening. */
  [['bergen','shetland'],['orkney','shetland'],['caithness','orkney'],
    ['caithness','lewis'],['faroes','lewis'],['faroes','shetland']].forEach(function (pair) {
    if (!pair.every(function (id) {
      return revision.provinces.some(function (p) { return p.id === id && !p.wasteland && !!p.realm; });
    })) throw new Error('Uninhabited North Atlantic crossing endpoint.');
    var key = pair.slice().sort().join('|');
    if (!revision.straits.some(function (p) { return p.slice().sort().join('|') === key; }))
      revision.straits.push(pair.slice());
    revision.crossingClasses[key] = geography.crossingClasses[key];
  });
  /* Nonempty religious-offer scopes match exact revision ids. Carry only
     this source's offers, leaving every retained scope and record intact. */
  [FBDATA.religiousActivities,FBDATA.religiousPatronage].forEach(function (table) {
    Object.keys(table || {}).forEach(function (id) {
      var definition = table[id], openings = definition.openings;
      if (!openings || !openings.some(function (o) { return o.id === '867' && o.revision === sourceId; })) return;
      if (openings.some(function (o) { return o.id === '867' && o.revision === revisionId; })) return;
      table[id] = Object.assign({},definition,{openings:copy(openings).concat([{id:'867',revision:revisionId}])});
    });
  });
  raw.revisions[revisionId] = revision;
  FBDATA.techImpactReviews.features.period_867_north_atlantic_habitation = {mode:'none',
    rationale:'Established island and northern mainland households and ordinary local authority require no new discovery. Existing work, equipment, settlement and travel requirements remain active.'};
})();
