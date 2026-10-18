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
  ['hosted_following','expedition_command'].forEach(function (id) {
    FBDATA.governmentForms[id]=Object.assign({},FBDATA.governmentForms.mobile_confederation,{
      succession:id==='hosted_following' ? 'retained_principal' : 'superior_commission',
      consent:'command_consent',revenue:'command_receipts'
    });
  });
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
  FBDATA.techImpactReviews.features.mobile_provisioning.rationale =
    'Baseline provisioning includes optional stock-aware ration targets and affordable replacement recruitment. Actual camp and field inventories, finite pasture, market stock, pledged people and public cash reserves remain binding; normal unit, equipment and transport technology still applies.';
  FBDATA.techImpactReviews.features.mobile_opening_identity = {mode:'none',
    rationale:'Binding an existing living opening person creates no new office or military technology. Custody, age, location and incumbent generation remain authoritative.'};
  FBDATA.techImpactReviews.features.mobile_opening_composition = {mode:'none',
    rationale:'An opening muster withdraws existing member people under their recruitment shares. Every authored unit retains its normal era, culture and technology eligibility.'};
  FBDATA.techImpactReviews.features.mobile_command_continuity = {mode:'none',
    rationale:'A retained personal mandate or a living superior commissioning an eligible member is a political relationship. Death, custody, recall and issuer succession suspend authority without changing private station or bypassing ordinary military technology.'};
  FBDATA.techImpactReviews.features.mobile_command_scope = {mode:'none',
    rationale:'Explicit public operation permissions depend on a valid commission and canonical resources, local rights and outside consent. The commission provides no county revenue or technological exception.'};
  FBDATA.techImpactReviews.features.mobile_independent_sponsorship = {mode:'none',
    rationale:'An explicit independent following has no patron entitlement. Actual access, resources and separately consenting counterparts remain necessary, with ordinary unit and travel technology retained.'};
  FBDATA.techImpactReviews.features.mobile_external_commission = {mode:'none',
    rationale:'A finite generation-bound external warrant records political authority without creating a local person, income, land or passage rights. Expiry and ordinary command eligibility govern its scope, not an invented discovery.'};
  FBDATA.techImpactReviews.features.mobile_hosted_opening = {mode:'none',
    rationale:'An already accepted opening concession records a political relationship under living parties, direct local possession and finite capacity. It grants no equipment, transport, personal safety or technological exception.'};
  FBDATA.techImpactReviews.features.personal_expedition_admission = {mode:'none',
    rationale:'Individual unpaid admission depends on current host consent, actual presence and finite named-person or existing combat-position capacity. It grants no troops, equipment, vow or family carriage. Ordinary road and military technology remain authoritative.'};
  FBDATA.techImpactReviews.features.mobile_column_ownership = {mode:'none',
    rationale:'A bounded column set partitions existing opening fighters and provisions under scoped commanders. Normal unit eligibility, conserved people, finite stores and current command authority remain binding; the single-host fallback remains available.'};
  FBDATA.techImpactReviews.features.home_decision_presence = {mode:'none',
    rationale:'Local public decisions depend on actual presence and a living incumbent, without a credible discovery prerequisite. Existing commitments and ordinary private actions remain available.'};
  FBDATA.techImpactReviews.features.home_decision_delegation = {mode:'none',
    rationale:'Exact delegation depends on an existing effective civil appointment, its scope, term and current issuer generation. Military command alone supplies no civil authority.'};
  FBDATA.techImpactReviews.features.expedition_public_funding = {mode:'none',
    rationale:'A public grant transfers available money between distinct existing public accounts under current lawful authority. It creates no income, credit or technological exception.'};
  FBDATA.techImpactReviews.features.expedition_private_contributions = {mode:'none',
    rationale:'A consenting household may contribute its actual private money to a distinct command account. No discovery gates this baseline voluntary transfer.'};
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
