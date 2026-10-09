/* Civic institutions and dated office policies. Influence, qualification,
   salaries and the reduced collegiate size are explicit simulation choices. */
(function () {
  'use strict';
  FBDATA.civicConstituencies = {
    venetian_councils:{
      eligibility:{ minAge:25, minServiceYears:0, skills:{ dip:4 }, free:true },
      selection:{ threshold:0.6, tie:'id', termDays:null, nominationCost:0 },
      recall:{ threshold:0.75, reasons:['neglect','overreach','ineligible'] },
      obligations:{ revenueRate:1, levyRate:1, maxDues:50, maxLevy:10000, reserve:20 },
      reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'], powers:['ban','peace','revenue'],
      members:[
        { id:'ducal_counsellors', name:'Ducal counsellors', weight:3, basis:'service', continuity:'institution', support:70 },
        { id:'civic_council', name:'Civic council', weight:4, basis:'custom', continuity:'institution', support:65 },
        { id:'electoral_interests', name:'Ducal electors', weight:3, basis:'custom', continuity:'institution', support:60 }
      ]
    },
    consular_compagna:{
      eligibility:{ minAge:21, minServiceYears:0, skills:{ dip:3 }, free:true },
      selection:{ threshold:0.6, tie:'id', termDays:360, nominationCost:0 },
      recall:{ threshold:0.75, reasons:['neglect','overreach','ineligible'] },
      obligations:{ revenueRate:1, levyRate:0.8, maxDues:30, maxLevy:10000, reserve:15 },
      reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'], powers:['ban','peace','revenue'],
      members:[
        { id:'sworn_compagna', name:'Sworn compagna', weight:3, basis:'custom', continuity:'institution', support:65 },
        { id:'communal_counsellors', name:'Communal counsellors', weight:2, basis:'service', continuity:'institution', support:65 }
      ]
    },
    open_civic_service:{
      eligibility:{ minAge:18, minServiceYears:1, skills:{ dip:2 }, free:true },
      selection:{ threshold:0.6, tie:'id', termDays:180, nominationCost:2 },
      recall:{ threshold:0.6, reasons:['neglect','overreach','ineligible'] },
      obligations:{ revenueRate:0.8, levyRate:0.6, maxDues:15, maxLevy:10000, reserve:5 },
      reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'], powers:['ban','peace','revenue'],
      members:[
        { id:'residents', name:'Resident households', weight:2, basis:'custom', continuity:'institution', support:70 },
        { id:'service_council', name:'Public service council', weight:1, basis:'service', continuity:'institution', support:65 }
      ]
    }
  };
  Object.keys(FBDATA.civicConstituencies).forEach(function (id) {
    FBDATA.constituencyProfiles[id] = FBDATA.civicConstituencies[id];
  });
  FBDATA.civicProfiles = {
    venice_1204:{ name:'Venetian ducal commune (1204)', constituency:'venetian_councils',
      eligibility:{ sex:'m', membership:false }, executive:'chief', interim:'council',
      offices:[{ id:'ducal_office', name:'Doge', termDays:null, salary:2 }],
      consent:{ war:0.6, treaty:0.6, extraordinary_tax:0.75, pledge:0.75, grant:0.75, conversion:1 }
    },
    genoese_consular:{ name:'Genoese consular tradition (1143)', constituency:'consular_compagna',
      eligibility:{ sex:'m', membership:true }, executive:'unanimous', interim:'council',
      offices:[{ id:'first_consul', name:'First consul', termDays:360, salary:1 },
        { id:'second_consul', name:'Second consul', termDays:360, salary:1 }],
      consent:{ war:0.6, treaty:0.6, extraordinary_tax:0.75, pledge:0.75, grant:0.75, conversion:1 }
    },
    civic_service_city:{ name:'Public service city', constituency:'open_civic_service',
      eligibility:{ sex:'any', membership:false }, executive:'majority', interim:'council',
      offices:[{ id:'civil_magistrate', name:'Civil magistrate', termDays:180, salary:1 },
        { id:'market_magistrate', name:'Market magistrate', termDays:360, salary:1 },
        { id:'defence_magistrate', name:'Defence magistrate', termDays:720, salary:1 }],
      consent:{ war:0.6, treaty:0.6, extraordinary_tax:0.6, pledge:0.75, grant:1, conversion:1 }
    }
  };
  FBDATA.governmentForms.city_republic = {
    holders:'civic_holders', succession:'civic_magistracies', territory:'civic_territory',
    consent:'civic_consent', levy:'civic_service', revenue:'civic_receipts',
    council:'civic_council', diplomacy:'civic_diplomacy', ai:'civic_decisions', ladder:'civic_careers',
    civicProfileId:'civic_service_city', officeCatalogue:[],
    systems:{ disable:['roman_offices','public_offices','feudal_service','scutage','estates','royal_council','crown_bloc','manorial_tenure','colonate'] }
  };
  FBDATA.techImpactReviews.features.civic_magistracies = { mode:'none', rationale:'Civic qualification, selection, tenure, resignation and lawful removal depend on living institutions and consent.' };
  FBDATA.techImpactReviews.features.civic_public_dues = { mode:'none', rationale:'Temporary extraordinary receipts require current civic assent and declared fiscal limits.' };
  FBDATA.techImpactReviews.features.civic_public_debt = { mode:'none', rationale:'Bilateral public borrowing and repayment use actual treasury counterparties and negotiated resources.' };
  FBDATA.techImpactReviews.features.civic_public_campaigns = { mode:'none', rationale:'Civic war and peace require political assent; ordinary military technology, troops and upkeep retain their own rules.' };
  FBDATA.techImpactReviews.features.civic_public_grants = { mode:'none', rationale:'Public grants depend on current control, institutional consent and the recipient’s acceptance.' };
  FBDATA.techImpactReviews.features.civic_form_adoption = { mode:'none', rationale:'Founding consent, current rule and qualified residents establish a constitution without a discovery requirement.' };
  FBDATA.techImpactReviews.features.institutional_foreign_rights = { mode:'none', rationale:'Limited jurisdiction, quarters and assigned receipts are ordinary negotiated rights, without new trade or naval capabilities.' };
  FBDATA.techImpactReviews.features.civic_household_careers = { mode:'none', rationale:'Personal service and professional standing remain ordinary household progression, separate from civic office eligibility.' };
})();
