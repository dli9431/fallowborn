/* Spring 867 district declarations. Retained worlds are independent of this
   fresh revision. Sources and reconstruction limits: docs/research/867-districts.md.
   Physical seeds, unnamed people and simulation shares do not prove borders,
   a historical incumbent, a language census or an excavated constitution. */
/* Literal catalogues also give the static localization extractor an owner. */
FBDATA.bookmarkCultures867Expansion = {
  middle_niger_867:{ name:'Middle Niger communities', parent:'sahelian_476' },
  western_sahel_867:{ name:'Western Sahel communities', parent:'sahelian_476' }
};

FBDATA.bookmarkTitles867Expansion = {
  duchies:{
    d_867_middle_niger:{name:'Middle Niger districts',kingdom:'k_867_niger'},
    d_867_gao:{name:'Gao districts',kingdom:'k_867_niger'},
    d_867_wagadu:{name:'Wagadu districts',kingdom:'k_867_sahel'},
    d_867_khwarazm:{name:'Khwarazm districts',kingdom:'k_867_khwarazm'}
  },
  kingdoms:{
    k_867_niger:{name:'Middle Niger',empire:'e_867_sahel'},
    k_867_sahel:{name:'Western Sahel',empire:'e_867_sahel'},
    k_867_khwarazm:{name:'Khwarazm',empire:'persia'}
  },
  empires:{e_867_sahel:{name:'Sahel'}}
};

FBDATA.bookmarkRealms867Expansion = [
    { id:'jenne_867', name:'Jenne-jeno', color:'#9d865a',
      capital:'jenne_district', rank:1, aggression:0, government:'territorial',
      religion:'sahel_traditional_476',
      ruler:{ generated:true, sex:'m', culture:'middle_niger_867', born:832, mar:3, trait:'patient' } },
    { id:'gao_867', name:'Gao Court', color:'#b38c5f', capital:'gao_district',
      rank:1, aggression:0, government:'regnum', religion:'sahel_traditional_476',
      ruler:{ generated:true, sex:'m', culture:'middle_niger_867', born:830, mar:6, trait:'patient' } },
    { id:'wagadu_867', name:'Ghana / Wagadu', color:'#a47b53', capital:'kumbi_district',
      rank:1, aggression:0, government:'regnum', religion:'sahel_traditional_476',
      ruler:{ generated:true, sex:'m', culture:'western_sahel_867', born:830, mar:6, trait:'patient' } },
    { id:'afrighids_867', name:'Afrighid Khwarazm', color:'#7c9d9b', capital:'kath_district',
      rank:1, aggression:0, government:'regnum', religion:'sunni',
      ruler:{ generated:true, sex:'m', culture:'chorasmian', born:830, mar:6, trait:'patient' } }
];

FBDATA.bookmarkDistricts867 = [
  { id:'jenne_district', duchy:'d_867_middle_niger', name:'Jenne-jeno', realm:'jenne_867', dev:3, zone:'arid', kind:'town',
    communities:[['middle_niger_867','sahel_traditional_476',10000]] },
  { id:'gao_district', duchy:'d_867_gao', name:'Gao-Saney', realm:'gao_867', dev:2, zone:'arid', kind:'town',
    communities:[['middle_niger_867','sahel_traditional_476',10000]] },
  { id:'kumbi_district', duchy:'d_867_wagadu', name:'Kumbi district', realm:'wagadu_867', dev:2, zone:'arid', kind:'town',
    communities:[['western_sahel_867','sahel_traditional_476',10000]] },
  { id:'qasr_ibrim', duchy:'makuria', name:'Ibrim', realm:'makuria', dev:2, zone:'arid', kind:'town',
    communities:[['nubian','eastern',10000]] },
  { id:'kath_district', duchy:'d_867_khwarazm', name:'Kath', realm:'afrighids_867', dev:3, zone:'continental', kind:'town',
    communities:[['chorasmian','zoroastrian',6000],['chorasmian','sunni',3000],
      ['chorasmian','eastern',1000]] },
  { id:'palmyra_district', duchy:'damascus', name:'Tadmor', realm:'abbasid', dev:2, zone:'arid', kind:'town',
    communities:[['arabic','sunni',8000],['syriac','eastern',2000]] },
  { id:'tayma_oasis', duchy:'hejaz', name:'Tayma', realm:'abbasid', dev:1, zone:'arid', kind:'village',
    communities:[['arabic','sunni',10000]] },
  { id:'central_iran_oases', duchy:'isfahan', name:'Kashan oases', realm:'abbasid', dev:1, zone:'arid', kind:'village',
    communities:[['persian','shia',6000],['persian','zoroastrian',3000],['persian','sunni',1000]] }
];

(function () {
  'use strict';
  var base = FBDATA.bookmarks['867'];
  var geography = FBDATA.geographies.europe_regional_2;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  /* Existing neutral presentation and faith rules, without new doctrine. */
  Object.assign(FBDATA.cultures, FBDATA.bookmarkCultures867Expansion);
  var realms = copy(FBDATA.bookmarkRealms867Expansion);
  /* No invented historical genealogy or future king. Ordinary generated kin
     are private households and provide the existing dynastic succession path. */
  realms.filter(function (r) { return r.government === 'regnum'; }).forEach(function (realm) {
    realm.royalCourt = { members:[
      { id:'offspring', generated:true, sex:'m', born:849, fatherId:'ruler',
        culture:realm.ruler.culture, religion:realm.religion, homeProvinceId:realm.capital }
    ] };
  });

  var layout = copy(FBDATA.settlementLayouts['867']);
  var climates = Object.assign({}, geography.climate.provinces);
  var counties = {};
  function county(id, name, owner, dev, zone, identities, kind) {
    var seed = geography.provinceAdditions.filter(function (p) { return p.id === id; })[0];
    if (!seed || counties[id]) throw new Error('Invalid 867 district: ' + id);
    var site = id + '_inhabited_867';
    FBDATA.settlementSites[site] = { x:seed.x, y:seed.y };
    layout[id] = [{ site:site, name:name, kind:kind }];
    climates[id] = zone;
    counties[id] = {
      id:id, name:name, realm:owner, dev:dev, culture:identities[0][0], religion:identities[0][1],
      customaryRights:[{ power:'peace', basis:'possession' },{ power:'revenue', basis:'possession' }],
      communities:identities.map(function (row) {
        return { culture:row[0], religion:row[1], populationShare0:row[2], paired:true };
      })
    };
  }
  FBDATA.bookmarkDistricts867.forEach(function (p) {
    county(p.id, p.name, p.realm, p.dev, p.zone, p.communities, p.kind);
    counties[p.id].duchy = p.duchy;
  });

  /* Existing counties, including their complete curated and fill slots, keep
     their authored data. Unaccepted additions remain physically bounded scenery. */
  FBDATA.settlementLayouts['867_inhabited_v2'] = layout;
  base.revisions = Object.assign({ baseline:{} }, base.revisions || {});
  base.revisions.inhabited_v2 = {
    geography:'europe_regional_2',
    /* Geographic title groups do not assert excavated duchies or suzerainty. */
    duchies:Object.assign({},base.duchies,FBDATA.bookmarkTitles867Expansion.duchies),
    kingdoms:Object.assign({},base.kingdoms,FBDATA.bookmarkTitles867Expansion.kingdoms),
    empires:Object.assign({},base.empires,FBDATA.bookmarkTitles867Expansion.empires),
    provinces:base.provinces.slice().concat(geography.provinceAdditions.map(function (seed) {
      return counties[seed.id] || Object.assign({}, seed);
    })),
    realms:base.realms.slice().concat(realms),
    settlementLayout:'867_inhabited_v2',
    climate:{ zone:geography.climate.zone, provinces:climates }
  };
  /* Expansion remains opt-in until its opening is explicitly accepted.
     The government composer also authors the combined review revision. */
  FBDATA.techImpactReviews.features.period_867_district_habitation = { mode:'none',
    rationale:'Established households, irrigated settlements and ordinary local government require no technological discovery. Existing travel, production and equipment requirements continue to apply.' };
})();

/* Household activity uses retained Jewish identities only. Sura's site,
   Karaite/Samaritan localities and Khazar reclassification remain held.
   This opt-in activity scope adds no county, community, institution or site. */
(function () {
  'use strict';
  var b = FBDATA.bookmarks['867'];
  b.revisions.jewish_samaritan_v3 = Object.assign({},b.revisions.inhabited_v2);
})();
