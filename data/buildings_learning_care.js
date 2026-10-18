/* Paid learning and care facilities use the ordinary building ledger. */
window.FBDATA = window.FBDATA || {};
FBDATA.buildingCorrections_learning_care = {
  library:{
    role:'scholarship', aiBuildOrder:15, name:'Library', icon:'📚',
    cost:80, upkeep:1, devMin:4, research:1, requiresTech:'scriptoria',
    desc:'A maintained manuscript collection and workspace. Each standing library contributes one national research per season, without requiring paper or founding an academy.'
  },
  hospital:{
    role:'care', aiBuildOrder:7, name:{default:'Endowed Hospital',muslim:'Bimaristan'}, icon:'🏥',
    cost:90, upkeep:2, devMin:5, maxCounty:1, piety:1, pop:5,
    populationCrisisProtection:0.10, populationFamineProtection:0.05, requiresTech:'hospitals',
    constructionGroup:{id:'care_foundation',maxCounty:1},
    desc:'Maintained wards and dispensaries expand care capacity. Shares one county foundation with a Charitable Guesthouse, including ruins; neither guarantees personal survival.'
  },
  cathedral:{
    role:'worship', aiBuildOrder:1,
    name:{default:'Monumental Vaulted Sanctuary',muslim:'Monumental Vaulted Mosque',pagan:'Monumental Vaulted Sanctuary'},
    icon:'⛪', cost:240, upkeep:3, devMin:7, maxCounty:1, piety:4, prestige:15, pop:10,
    dev:1, populationCrisisProtection:0.15, communityFaithPressure:0.20, requiresTech:'ribbed_vaulting',
    desc:'An optional monumental vaulted worship complex. Ordinary churches, mosques and sanctuaries need no such construction, and this building grants no religious office.'
  }
};
FBDATA.buildings_learning_care = {
  hospice:{
    role:'care', aiBuildOrder:22, name:'Charitable Guesthouse', icon:'🏠',
    cost:55, upkeep:1, devMin:2, maxCounty:1,
    populationCrisisProtection:0.03, dev:0, pop:0, tax:0, research:0, piety:0,
    levy:0, retinue:0, archers:0,
    constructionGroup:{id:'care_foundation',maxCounty:1},
    desc:'A modest maintained house for hospitality and basic care, paid for by its lawful holder. Shares one county foundation with an Endowed Hospital, including ruins; creates no endowed institution or medical qualification.'
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.buildingCorrections_learning_care).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(FBDATA.buildings,id))
      throw new Error('Missing learning or care building correction target: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildingCorrections_learning_care[id]));
  });
  Object.keys(FBDATA.buildings_learning_care).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildings,id))
      throw new Error('Duplicate learning or care building: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildings_learning_care[id]));
  });
  FBDATA.techImpactReviews.features.charitable_guesthouse = {
    mode:'none',
    rationale:'Modest hospitality and baseline care need no discovery; ordinary construction authority, funding, upkeep and shared county capacity govern the guesthouse.'
  };
  FBDATA.techImpactReviews.features.building_hospital = {
    mode:'soft', tech:['hospitals'],
    rationale:'Endowed hospitals expand care capacity beyond ordinary care and the modest paid guesthouse; both physical alternatives share county capacity.'
  };
  FBDATA.techImpactReviews.features.building_cathedral = {
    mode:'hard', tech:['ribbed_vaulting'], fallback:'temple',
    rationale:'An optional monumental vaulted worship complex requires ribbed vaulting; ordinary worship and the existing great temple remain available without this gate.'
  };
})();
