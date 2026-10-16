/* Explicit political declarations. Locations, identities and starting stock
   are data; the engine never infers mobility from culture or date. */
(function () {
  'use strict';
  FBDATA.governmentForms.mobile_confederation = {
    holders:'coalition_holders', succession:'coalition_leadership', territory:'coalition_court',
    consent:'coalition_consent', levy:'following_levy', revenue:'coalition_receipts',
    council:'member_council', diplomacy:'coalition_diplomacy', ai:'coalition_decisions',
    ladder:'local_service', officeCatalogue:[],
    systems:{ disable:['feudal_service','roman_offices','public_offices','royal_council','estates','manorial_tenure'] }
  };
  FBDATA.mobileProfiles = {
    pontic_following:{ minAge:18, threshold:0.6, maxMembers:12, maxAgreements:12,
      recruitShare:0.2, recruitCost:0.02, foodPerPerson:0.01,
      pasturePerPerson:1.8, accessDays:360, accessPrice:4,
      starvationShare:0.001, defeatShare:0.02, settlementForm:'regnum',
      regions:['cherson','tomis','constantinople'], members:[
        { id:'elder_following', weight:3, pledge:0.2, population:1600 },
        { id:'younger_following', weight:2, pledge:0.15, population:1200 },
        { id:'route_following', weight:1, pledge:0.1, population:800 }
      ] },
    river_following:{ minAge:20, threshold:0.75, maxMembers:8, maxAgreements:8,
      recruitShare:0.15, recruitCost:0.03, foodPerPerson:0.01,
      pasturePerPerson:1.5, accessDays:270, accessPrice:6,
      starvationShare:0.001, defeatShare:0.03, settlementForm:'regnum',
      regions:[], members:[
        { id:'first_following', weight:2, pledge:0.15, population:900 },
        { id:'second_following', weight:2, pledge:0.1, population:700 }
      ] }
  };
  ['mobile_membership','mobile_leadership','mobile_following_recruitment',
    'mobile_seasonal_access','mobile_provisioning','mobile_recovery',
    'mobile_settlement','mobile_household_service'].forEach(function (id) {
    FBDATA.techImpactReviews.features[id] = { mode:'none',
      rationale:'Living consent, conserved people and available food or money govern this baseline capability. Existing unit and travel technology still applies.' };
  });
  FBDATA.techImpactReviews.features.mobile_seasonal_access.rationale =
    'Seasonal access depends on living consent, finite local capacity and conserved payments. A lawful subordinate holder may grant local access while its superior retains sovereignty; foreign occupation grants no such authority. Existing travel technology still applies.';
  /* The fresh 476 opening inhabits Cherson and adds the Pontic following.
     Priscus attests displaced followings and Roman diplomacy, not a precise
     476 boundary or an identifiable incumbent at this simulated camp. */
  FBDATA.mobileScenarioPresentation = {mobile_household_476:{
    name:'Pontic Household',desc:'Begin as a free household near the mobile following at Cherson.',
    intro:'You are {name}, a free farmer of {province}. Nearby mobile households bargain for access and supplies. Open Mobile coalition in Deeds to review their following or seek local paid service.'
  }};
  var b = FBDATA.bookmarks['476'];
  /* A map grouping for the Roman-facing port, not a reconstructed province. */
  b.duchies.d_476_cherson = { name:'Cherson', kingdom:'k_476_thrace' };
  b.provinces = b.provinces.map(function (p) {
    return p.id === 'cherson' ? { id:p.id, name:'Cherson', realm:'byzantium', duchy:'d_476_cherson',
      culture:'greek', religion:'chalcedonian', dev:3,
      communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] } : p;
  });
  b.realms = b.realms.concat([{ id:'pontic_following_476', name:'Pontic Followings', color:'#ac8959',
    capital:'cherson', nonTerritorial:true, government:'mobile_confederation',
    culture:'turkic', religion:'tengri', rank:3,
    mobile:{ profileId:'pontic_following', patronRealmId:'byzantium', origin:'cherson',
      target:'cherson', food:7200, fighters:120, treasury:60 } }]);
  FBDATA.settlementSites.cherson_mobile_476 = { x:33.49, y:44.61 };
  FBDATA.settlementLayouts['476'].cherson = [{ site:'cherson_mobile_476', name:'Cherson', kind:'city' }];
  FBDATA.startScenarios.push(Object.assign({
    id:'mobile_household_476', fixedProvinceId:'cherson', startCulture:'greek', startReligion:'chalcedonian',
    bookmarkIds:['476'], alwaysUnlocked:true, tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
    startEffects:{landPlots:1}
  },FBDATA.mobileScenarioPresentation.mobile_household_476));
})();
