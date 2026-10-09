/* Royal houses, hereditary interests and delegated provincial service.
   Incumbents without a dated attestation are generated opening households. */
window.FBDATA = window.FBDATA || {};
FBDATA.aristocraticProfiles = {
  chartered_court:{ name:'Chartered royal court', administrationProfileId:'chartered_provinces',
    minimumAge:16, allowMinor:true, threshold:0.6, negotiationCost:6,
    defaultTerms:{ revenue:0.75, levy:0.7 }, minimumRevenue:0.55, minimumLevy:0.4,
    refusalSupport:-20, enforcementSupportCost:8,
    interests:[
      { id:'alder', name:'Alder household', dynasty:'Alder', actorId:'alder_elder',
        provinceId:'london', officeId:'hereditary_interest', weight:3, minimumMartial:0,
        maximumRevenue:0.8, maximumLevy:0.8 },
      { id:'reed', name:'Reed household', dynasty:'Reed', actorId:'reed_elder',
        provinceId:'winchester', officeId:'hereditary_interest', weight:2, minimumMartial:0,
        maximumRevenue:0.75, maximumLevy:0.7 }
    ] },
  sasanian_476:{ name:'Sasanian royal and magnate court (476)', administrationProfileId:'sasanian_provinces_476',
    openingGovernor:{actorId:'ctesiphon_governor',provinceId:'baghdad'},
    minimumAge:16, allowMinor:true, threshold:0.6, negotiationCost:8,
    defaultTerms:{ revenue:0.75, levy:0.7 }, minimumRevenue:0.55, minimumLevy:0.4,
    refusalSupport:-20, enforcementSupportCost:8,
    interests:[
      { id:'mihran', name:'Mihran family interest', dynasty:'Mihran', actorId:'mihran_elder',
        provinceId:'rayy', officeId:'sasanian_wuzurg', weight:3, minimumMartial:0,
        maximumRevenue:0.8, maximumLevy:0.8 },
      { id:'karen', name:'Karen family interest', dynasty:'Karen', actorId:'karen_elder',
        provinceId:'hamadan', officeId:'sasanian_wuzurg', weight:3, minimumMartial:0,
        maximumRevenue:0.75, maximumLevy:0.7 }
    ] }
};
FBDATA.aristocraticOffices = {
  hereditary_interest:{ name:'Hereditary provincial interest',
    desc:'Local customary jurisdiction and a defined share of public receipts. Private estates remain separate.',
    powers:['consent'], scopes:['county'], succession:'continues', publicRole:'fiscal',
    appointment:{ gold:0, prestige:0, skill:'ste', minimum:0 } },
  sasanian_wuzurg:{ name:'Wuzurg family commission',
    desc:'A hereditary magnate interest with local assent and a defined public assignment, independent of private estates.',
    powers:['consent'], scopes:['county'], succession:'continues', publicRole:'fiscal',
    appointment:{ gold:0, prestige:0, skill:'ste', minimum:0 } },
  provincial_governor:{ name:'Provincial governor', desc:'A personal, revocable commission over local jurisdiction and public receipts.',
    powers:['peace','revenue'], scopes:['county'], succession:'continues', publicRole:'governor',
    appointment:{ gold:0, prestige:30, skill:'ste', minimum:6 } },
  provincial_receiver:{ name:'Provincial receiver', desc:'A personal public revenue commission, with no private estate grant.',
    powers:['revenue'], scopes:['county'], succession:'continues', publicRole:'fiscal',
    appointment:{ gold:0, prestige:20, skill:'ste', minimum:5 } },
  provincial_commander:{ name:'Royal host commander', desc:'Command of one existing host, independent of private land.',
    powers:['ban'], scopes:['host'], succession:'continues', publicRole:'commander',
    appointment:{ gold:0, prestige:30, skill:'mar', minimum:6 } },
  sasanian_shahrab:{ name:'Shahrab', desc:'Provincial public administration. This county scope is a map abstraction, not a reconstructed provincial boundary.',
    powers:['peace','revenue'], scopes:['county'], succession:'continues', publicRole:'governor',
    appointment:{ gold:0, prestige:30, skill:'ste', minimum:6 } },
  sasanian_receiver:{ name:'Royal revenue officer', desc:'Public receipts under a personal commission, with no later fiscal reform presumed.',
    powers:['revenue'], scopes:['county'], succession:'continues', publicRole:'fiscal',
    appointment:{ gold:0, prestige:20, skill:'ste', minimum:5 } },
  sasanian_host_commander:{ name:'Royal army commander', desc:'Command of one existing royal host. No four-quarter military division is implied.',
    powers:['ban'], scopes:['host'], succession:'continues', publicRole:'commander',
    appointment:{ gold:0, prestige:30, skill:'mar', minimum:6 } }
};
Object.assign(FBDATA.authorityOffices,FBDATA.aristocraticOffices);
FBDATA.aristocraticAdministrationProfiles = {
  chartered_provinces:{ name:'Chartered provincial service',
    offices:['provincial_governor','provincial_receiver','provincial_commander'],
    governor:'provincial_governor', fiscal:'provincial_receiver', commander:'provincial_commander',
    appointmentCost:4, termDays:720, confirmation:'continues',
    finance:{ kind:'revenue_service', share:0.1, salary:0, serviceShare:0, remittance:1 },
    accession:{ mode:'recognition', minimumAge:16, allowMinor:true, officeCandidates:false, threshold:0.6, interests:[] } },
  sasanian_provinces_476:{ name:'Sasanian provincial service (476)',
    offices:['sasanian_shahrab','sasanian_receiver','sasanian_host_commander'],
    governor:'sasanian_shahrab', fiscal:'sasanian_receiver', commander:'sasanian_host_commander',
    appointmentCost:5, termDays:720, confirmation:'continues',
    finance:{ kind:'revenue_service', share:0.1, salary:0, serviceShare:0, remittance:1 },
    accession:{ mode:'recognition', minimumAge:16, allowMinor:true, officeCandidates:false, threshold:0.6, interests:[] } }
};
Object.assign(FBDATA.administrationProfiles,FBDATA.aristocraticAdministrationProfiles);
FBDATA.governmentForms.aristocratic_monarchy = {
  holders:'mixed_provincial', succession:'royal_recognition', territory:'fixed',
  consent:'provincial_assent', levy:'provincial_obligations', revenue:'provincial_receipts',
  council:'magnate_council', diplomacy:'territorial_diplomacy', ai:'aristocratic_court', ladder:'aristocratic_careers',
  aristocraticProfileId:'chartered_court', administrationProfileId:'chartered_provinces',
  officeCatalogue:['provincial_governor','provincial_receiver','provincial_commander',
    'sasanian_shahrab','sasanian_receiver','sasanian_host_commander'],
  systems:{ enable:['public_offices'], disable:['roman_offices','feudal_service','scutage','estates','crown_bloc','royal_council'] }
};
FBDATA.stationLadders.aristocratic_careers = JSON.parse(JSON.stringify(FBDATA.stationLadders.administrative_monarchy));
FBDATA.stationLadders.aristocratic_careers.bands[2].succession = 'personal';
Object.assign(FBDATA.techImpactReviews.features, {
  aristocratic_royal_recognition:{ mode:'none', rationale:'Royal descent, live recognition and minority stewardship are political relationships, not discoveries.' },
  aristocratic_hereditary_jurisdiction:{ mode:'none', rationale:'A surviving family may inherit declared local customary jurisdiction without acquiring a throne or a governor commission.' },
  aristocratic_provincial_bargains:{ mode:'none', rationale:'Baseline revenue and military obligations, concessions, refusal and enforcement depend on legitimate scope, consent and actual funds.' },
  aristocratic_government_conversion:{ mode:'none', rationale:'An explicit change of political rules requires a current adult court and assent from surviving hereditary interests, not a discovery.' }
});
/* Change only the fresh 476 opening. Earlier revisions stay in the catalogue
   as immutable compatibility declarations; never amend them in place. */
(function () {
  var bm = FBDATA.bookmarks['476'], old = bm.opening;
  var opening = JSON.parse(JSON.stringify(old));
  Object.assign(opening.actors, {
    mihran_elder:{ sex:'m', culture:'persian', religion:'zoroastrian', born:437, station:3,
      role:'notable', dyn:'Mihran', home:'rayy', skills:{ste:8,mar:8} },
    mihran_heir:{ sex:'m', culture:'persian', religion:'zoroastrian', born:455, station:2,
      role:'notable', dyn:'Mihran', father:'mihran_elder', home:'rayy', skills:{ste:7,mar:7} },
    karen_elder:{ sex:'m', culture:'persian', religion:'zoroastrian', born:433, station:3,
      role:'notable', dyn:'Karen', home:'hamadan', skills:{ste:8,mar:9} },
    karen_heir:{ sex:'m', culture:'persian', religion:'zoroastrian', born:453, station:2,
      role:'notable', dyn:'Karen', father:'karen_elder', home:'hamadan', skills:{ste:7,mar:7} },
    ctesiphon_governor:{ sex:'m', culture:'persian', religion:'zoroastrian', born:441, station:2,
      role:'notable', home:'baghdad', skills:{ste:9,mar:5} }
  });
  opening.estates = opening.estates.concat([
    { id:'mihran_estate_476', actorId:'mihran_elder', provinceId:'rayy', share0:1000,
      basis:'tenure', evidence:'generated_mihran_estate_476' },
    { id:'karen_estate_476', actorId:'karen_elder', provinceId:'hamadan', share0:1000,
      basis:'tenure', evidence:'generated_karen_estate_476' }
  ]);
  bm.openingRevision = 'wider_v1';
  bm.openingRevisions.wider_v1 = opening;
  bm.opening = opening;
  bm.realms = bm.realms.map(function (realm) {
    return realm.id === 'sasanian_476' ? Object.assign({}, realm, {
      government:'aristocratic_monarchy', aristocraticProfileId:'sasanian_476',
      administrationProfileId:'sasanian_provinces_476'
    }) : realm;
  });
})();
