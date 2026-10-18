/* Optional facilities and one replacement profile. No source, fuel or historical asset is seeded. */
window.FBDATA = window.FBDATA || {};
FBDATA.buildings_baths_headworks = {
  public_bath:{
    name:'Public Bath', icon:'?', role:'care',cost:65,upkeep:2,devMin:4,maxCounty:1,settlementDraw:false,
    dev:0,pop:0,prestige:0,migrationAttraction:0.5,requiresTech:'lime_mortar',aiBuildOrder:26,
    applicability:{yearMin:476,yearMax:1300},operationProfile:'public_bath_service',
    desc:'Optional maintained bathing premises with lawful finite water, paid work and upkeep. Funded unheated service supplies +0.5 migration attraction without a health effect. Domestic bathing remains available; this is no charitable foundation or institutional office.'
  },
  diversion_headworks:{
    name:'Diversion Headworks', icon:'??',role:'civic',cost:75,upkeep:2,devMin:2,maxCounty:1,settlementDraw:false,
    dev:0,pop:0,prestige:0,populationCapacity:0.02,requiresTech:'diversion_dams',aiBuildOrder:29,
    applicability:{yearMin:476,yearMax:1300,traditions:['islamic','persianate','byzantine']},operationProfile:'downstream_diversion',
    desc:'A maintained river diversion serving an actual connected downstream receiver. Paid finite delivery supplies +2% population capacity only for independently serviced demand. Passing the same allocation through more works grants no second benefit. Ordinary banks and irrigation remain available.'
  }
};
FBDATA.buildingOperationProfiles_baths_headworks = {
  public_bath_service:{mode:'use',amount:2,periodDays:30,workCost:2,effect:'migrationAttraction'},
  hypocaust_bath_service:{mode:'use',amount:2,periodDays:30,workCost:2,effect:'migrationAttraction',
    inputs:[{goodId:'heating_fuel',quantity:1}]},
  downstream_diversion:{mode:'use',amount:2,periodDays:30,workCost:2,effect:'populationCapacity',
    sourceRequirements:{originKind:'flow',originSuitability:['source','river','gradient'],minStores:1}}
};
FBDATA.buildingProfiles_baths_headworks = {
  hypocaust_bath:{
    buildingId:'public_bath',name:'Heated Public Bath',
    desc:'A hypocaust heats one maintained public bath. Each funded service consumes actual prepared heating fuel and water and supplies +1 migration attraction in place of +0.5. There is no health effect or second bath bonus. Unheated baths and domestic bathing remain available.',
    replace:{cost:80,upkeep:2,devMin:4,migrationAttraction:1},requiresTech:['hypocaust_heating'],
    applicability:{yearMin:476,yearMax:1300},operationProfile:'hypocaust_bath_service',
    techImpactReview:'heated_bathing',inheritance:'retain'
  }
};
(function () {
  'use strict';
  [['buildings_baths_headworks','buildings'],['buildingOperationProfiles_baths_headworks','buildingOperationProfiles'],
    ['buildingProfiles_baths_headworks','buildingProfiles']].forEach(function (pair) {
    Object.keys(FBDATA[pair[0]]).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(FBDATA[pair[1]],id)) throw new Error('Duplicate bathing or headworks declaration: ' + id);
      FBDATA[pair[1]][id] = JSON.parse(JSON.stringify(FBDATA[pair[0]][id]));
    });
  });
})();
