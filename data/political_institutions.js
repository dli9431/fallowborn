/* Fallowborn — elections, durable privileges, and collective demands.
   Definitions are replaced atomically by runtime mods. Saved records keep
   stable ids, parties, scopes, terms, and outcomes; display and forecasts are
   derived by js/institutions.js. */
window.FBDATA = window.FBDATA || {};

/* Public profession changes the court's allegiance, not its inhabitants.
   These targets belong to the enabled institution, not engine faith switches. */
FBDATA.rulerFaithTargets = ['nicene','homoian','chalcedonian','miaphysite'];

/* Physical seats, not territorial realms. Unnamed officeholders are generated;
   Carthage's Nicene see is deliberately vacant in spring 476. */
FBDATA.localInstitutions = {
  rome_senate:FBDATA.bookmarkRegions476.italy.localInstitutions.rome_senate,
  ravenna_council:FBDATA.bookmarkRegions476.italy.localInstitutions.ravenna_council,
  milan_council:FBDATA.bookmarkRegions476.italy.localInstitutions.milan_council,
  carthage_council:FBDATA.bookmarkRegions476.africa.institutions.carthage_council,
  salona_council:FBDATA.bookmarkRegions476.dalmatia_east.institutions.salona_council,
  arles_council:FBDATA.bookmarkRegions476.gaul_iberia.localInstitutions.arles_council,
  constantinople_senate:FBDATA.bookmarkRegions476.dalmatia_east.institutions.constantinople_senate,
  rome_see:FBDATA.bookmarkRegions476.italy.localInstitutions.rome_see,
  ravenna_see:FBDATA.bookmarkRegions476.italy.localInstitutions.ravenna_see,
  ravenna_homoian_see:FBDATA.bookmarkRegions476.italy.localInstitutions.ravenna_homoian_see,
  milan_see:FBDATA.bookmarkRegions476.italy.localInstitutions.milan_see,
  carthage_see:FBDATA.bookmarkRegions476.africa.institutions.carthage_see,
  salona_see:FBDATA.bookmarkRegions476.dalmatia_east.institutions.salona_see,
  arles_see:FBDATA.bookmarkRegions476.gaul_iberia.localInstitutions.arles_see,
  constantinople_see:FBDATA.bookmarkRegions476.dalmatia_east.institutions.constantinople_see,
  alexandria_see:{ city:'Alexandria', kind:'patriarchate', provinceId:null, site:null, religion:'miaphysite', culture:'greek', officeId:'alexandria_patriarch', historicalName:'Timothy Aelurus' },
  antioch_see:{ city:'Antioch', kind:'patriarchate', provinceId:null, site:null, religion:'miaphysite', culture:'greek', officeId:'antioch_patriarch', historicalName:'Peter the Fuller' },
  jerusalem_see:{ city:'Jerusalem', kind:'see', provinceId:null, site:null, religion:'chalcedonian', culture:'greek', officeId:'jerusalem_bishop', historicalName:'Anastasius' }
};
/* Regional content owns its seats; the common catalogue keeps the same ids
   and order so existing institution, office and recognition records remain valid. */
Object.assign(FBDATA.localInstitutions, FBDATA.bookmarkRegions476.africa.institutions);
Object.assign(FBDATA.localInstitutions, FBDATA.bookmarkRegions476.dalmatia_east.institutions);
Object.assign(FBDATA.localInstitutions, FBDATA.bookmarkRegions476.italy.localInstitutions);
Object.assign(FBDATA.localInstitutions, FBDATA.bookmarkRegions476.gaul_iberia.localInstitutions);

/* Each campaign can own a complete table without replacing the legacy fallback.
   The 476 outer region places Antioch and Jerusalem on authored sites; their
   offices keep their ordinary ids, and other bookmarks keep the off-map seats. */
FBDATA.bookmarks['476'].localInstitutions = Object.assign({},
  FBDATA.localInstitutions, FBDATA.bookmarkRegions476.outer.institutions);

/* Phase 2 authority records name legal capacities rather than landed titles.
   The institution and scope on each appointment remain separate from owner
   and holder; these definitions never manufacture a territorial realm. */
FBDATA.authorityOffices = {
  magister_militum:{ name:'Magister militum', desc:'Commands one field army; no civil courts or taxes.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission','army_acclamation'],
    appointment:{ gold:20, prestige:60, skill:'mar', minimum:10, imperialOnly:true } },
  magister_praesentalis:{ name:'Magister militum praesentalis', desc:'Commands a court field army; no civil jurisdiction.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:20, prestige:60, skill:'mar', minimum:10, imperialOnly:true } },
  magister_gallias:{ name:'Magister militum per Gallias', desc:'A Gallic field command, limited to the commissioned host.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:20, prestige:60, skill:'mar', minimum:10, imperialOnly:true } },
  magister_illyricum:{ name:'Magister militum per Illyricum', desc:'An Illyrian field command, limited to the commissioned host.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:20, prestige:60, skill:'mar', minimum:10, imperialOnly:true } },
  magister_thracias:{ name:'Magister militum per Thracias', desc:'A Thracian field command, limited to the commissioned host.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:20, prestige:60, skill:'mar', minimum:10, imperialOnly:true } },
  magister_orientem:{ name:'Magister militum per Orientem', desc:'An eastern field command, limited to the commissioned host.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:20, prestige:60, skill:'mar', minimum:10, imperialOnly:true } },
  patricius:{ name:'Patrician', desc:'A personal honor supporting recognition; it grants no command, courts, taxes or civic consent.',
    powers:[], scopes:['realm'], succession:'continues', recognitionSources:['imperial_commission'],
    appointment:{ gold:30, prestige:100, skill:'dip', minimum:8, imperialOnly:true } },
  consul:{ name:'Consul', desc:'An annual ceremonial honor; it grants no governing powers.',
    powers:[], scopes:['realm'], succession:'continues', recognitionSources:['imperial_commission'],
    appointment:{ gold:30, prestige:80, skill:'dip', minimum:8, annual:true, imperialOnly:true } },
  praetorian_prefect:{ name:'Praetorian prefect', desc:'Civil courts and public receipts throughout the appointing court’s current territory; no army command.',
    powers:['peace','revenue'], scopes:['realm'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:25, prestige:80, skill:'ste', minimum:10 } },
  urban_prefect:{ name:'Urban prefect', desc:'City courts and civic consent in the named city, subject to local agreement; no tax or army command.',
    powers:['peace','consent'], scopes:['county'], succession:'reaffirm', recognitionSources:['imperial_commission','civic_acceptance'],
    appointment:{ gold:15, prestige:40, skill:'dip', minimum:8 } },
  vicarius:{ name:'Vicarius', desc:'Provincial justice and receipts in the named jurisdiction; no army command.',
    powers:['peace','revenue'], scopes:['county'], succession:'reaffirm', recognitionSources:['imperial_commission','civic_acceptance'],
    appointment:{ gold:15, prestige:40, skill:'ste', minimum:8 } },
  consularis:{ name:'Consularis', desc:'A provincial governor with local courts and receipts, without military command.',
    powers:['peace','revenue'], scopes:['county'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:15, prestige:40, skill:'ste', minimum:8 } },
  corrector:{ name:'Corrector', desc:'A provincial civil governor; authority stops at the named jurisdiction.',
    powers:['peace','revenue'], scopes:['county'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:12, prestige:30, skill:'ste', minimum:7 } },
  praeses:{ name:'Praeses', desc:'A local civil governor with courts and receipts, without military command.',
    powers:['peace','revenue'], scopes:['county'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:10, prestige:20, skill:'ste', minimum:6 } },
  comes_rei_militaris:{ name:'Comes rei militaris', desc:'A military command over the named host, separate from county rule.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission','army_acclamation'],
    appointment:{ gold:15, prestige:40, skill:'mar', minimum:8 } },
  dux:{ name:'Dux', desc:'Commands the named regional host; the title supplies no civil jurisdiction.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission','army_acclamation'],
    appointment:{ gold:15, prestige:40, skill:'mar', minimum:8 } },
  tribunus:{ name:'Tribune', desc:'Commands one commissioned unit, represented by its exact host.',
    powers:['ban'], scopes:['host'], succession:'reaffirm', recognitionSources:['imperial_commission','army_acclamation'],
    appointment:{ gold:10, prestige:20, skill:'mar', minimum:6 } },
  defensor_civitatis:{ name:'Defensor civitatis', desc:'Protects citizens through local courts; no public receipts or army command.',
    powers:['peace'], scopes:['county'], succession:'reaffirm', recognitionSources:['imperial_commission','civic_acceptance'],
    appointment:{ gold:10, prestige:20, skill:'dip', minimum:6 } },
  comes_largitionum:{ name:'Comes sacrarum largitionum', desc:'Administers the appointing court’s public receipts; no judicial or military authority.',
    powers:['revenue'], scopes:['realm'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:20, prestige:50, skill:'ste', minimum:9 } },
  comes_rei_privatae:{ name:'Comes rei privatae', desc:'Administers receipts in the commissioned estate jurisdiction; no judicial or military authority.',
    powers:['revenue'], scopes:['county'], succession:'reaffirm', recognitionSources:['imperial_commission'],
    appointment:{ gold:15, prestige:30, skill:'ste', minimum:8 } },
  imperial_office:{ name:'Imperial office', desc:'A recognized claim to the imperial office, separate from physical control and territorial powers.', powers:[], scopes:['realm'], succession:'reaffirm',
    recognitionSources:['dynastic_succession','army_acclamation','imperial_commission'] },
  field_command:{ name:'Field command', desc:'Commands the exact commissioned host; no civil jurisdiction.', powers:['ban'], scopes:['host'], succession:'reaffirm',
    recognitionSources:['army_acclamation','imperial_commission'] },
  judicial_vicar:{ name:'Judicial vicar', desc:'Exercises courts only in the appointed jurisdiction.', powers:['peace'], scopes:['county'], succession:'reaffirm',
    recognitionSources:['imperial_commission','civic_acceptance'] },
  fiscal_agent:{ name:'Fiscal agent', desc:'Administers public receipts only in the appointed jurisdiction.', powers:['revenue'], scopes:['county'], succession:'reaffirm',
    recognitionSources:['imperial_commission','civic_acceptance'] },
  civic_delegate:{ name:'Civic delegate', desc:'Supplies civic consent in the named city, subject to community agreement.', powers:['consent'], scopes:['county'], succession:'continues',
    recognitionSources:['civic_acceptance'] },
  public_governor:{ name:'Public governor', desc:'Appointed county courts and administration. Private estates and sovereign ownership remain separate.',
    powers:['peace','revenue'], scopes:['county'], succession:'continues', publicRole:'governor',
    appointment:{ gold:0, prestige:30, skill:'ste', minimum:6 } },
  public_fiscal_officer:{ name:'Public fiscal officer', desc:'Audits and remits the named county receipts. No private estate or army command is granted.',
    powers:['revenue'], scopes:['county'], succession:'continues', publicRole:'fiscal',
    appointment:{ gold:0, prestige:20, skill:'ste', minimum:6 } },
  public_commander:{ name:'Public commander', desc:'Commands an existing host, paid from an explicitly referenced productive county.',
    powers:['ban'], scopes:['host'], succession:'continues', publicRole:'commander',
    appointment:{ gold:0, prestige:30, skill:'mar', minimum:6 } },
  abbasid_wali:{ name:'Wali', desc:'A revocable provincial commission, represented by one county jurisdiction. It creates no hereditary county.',
    powers:['peace','revenue'], scopes:['county'], succession:'continues', publicRole:'governor',
    appointment:{ gold:0, prestige:40, skill:'ste', minimum:7 } },
  abbasid_amil:{ name:'Amil', desc:'Assesses and remits county public receipts. Provincial expenses precede remittance; private property remains separate.',
    powers:['revenue'], scopes:['county'], succession:'continues', publicRole:'fiscal',
    appointment:{ gold:0, prestige:30, skill:'ste', minimum:7 } },
  abbasid_commander:{ name:'Appointed army commander', desc:'A salaried command over one existing host, without an iqta or private land grant.',
    powers:['ban'], scopes:['host'], succession:'continues', publicRole:'commander',
    appointment:{ gold:0, prestige:40, skill:'mar', minimum:7 } },
  byzantine_strategos:{ name:'Strategos', desc:'An appointed provincial jurisdiction, abstracted at county scale. Commissioned military service uses existing hosts and equipment.',
    powers:['peace','revenue'], scopes:['county'], succession:'continues', publicRole:'governor',
    appointment:{ gold:0, prestige:40, skill:'mar', minimum:7 } },
  byzantine_logothete:{ name:'Logothetes of the genikon', desc:'An appointed fiscal commission over the referenced county receipts. No pronoia or private estate is created.',
    powers:['revenue'], scopes:['county'], succession:'continues', publicRole:'fiscal',
    appointment:{ gold:0, prestige:40, skill:'ste', minimum:7 } },
  byzantine_commander:{ name:'Commissioned host commander', desc:'Commands one existing host with public remuneration; military command and private property remain separate.',
    powers:['ban'], scopes:['host'], succession:'continues', publicRole:'commander',
    appointment:{ gold:0, prestige:40, skill:'mar', minimum:7 } }
};
FBDATA.legitimacySources = {
  army_acclamation:{ name:'Army acclamation', succession:'reaffirm', issuerKinds:['host','religious-institution'], mandate:'command', countyRights:false },
  imperial_commission:{ name:'Imperial commission', succession:'reaffirm', issuerKinds:['realm','religious-institution'], mandate:'court', countyRights:true },
  dynastic_succession:{ name:'Dynastic succession', succession:'continues', issuerKinds:['realm','religious-institution'], mandate:'succession', countyRights:true },
  civic_acceptance:{ name:'Civic acceptance', succession:'reaffirm', issuerKinds:['county','religious-institution'], mandate:'community', countyRights:true },
  church_support:{ name:'Church support', succession:'reaffirm', issuerKinds:['character','religious-office','religious-institution'], characterRoles:['priest','monk'], mandate:'religious_head', countyRights:false }
};
FBDATA.customaryBases = {
  tenure:{}, judgment:{}, recognition:{}, possession:{}
};
/* Realm-neutral terms. A host identifies service, county ids identify land,
   and an imperial commission identifies recognition. AI negotiates only
   explicitly template-backed offers; household/story bargains stay manual. */
FBDATA.federateContractTerms = {
  paid_service:{ payPerSeason:10, durationDays:360, renewWindowDays:90,
    service:'host', land:'optional', recognition:'optional', autoRenew:true },
  commissioned_migration:{ payPerSeason:0, initialPay:40, durationDays:2160, renewWindowDays:90,
    service:'host', land:'conquest', recognition:'required', autoRenew:false }
};
/* Opening service supplies landless hosts through ordinary paid commitments.
   The later campaign replaces service only after its new terms are affordable. */
FBDATA.federateServiceStarts = {
  western_court_476:FBDATA.bookmarkRegions476.dalmatia_east.serviceStarts
};
/* County anchors abstract the historical march. Courts travel with the
   ordinary host; no dated outcome replaces occupation or settlement. */
FBDATA.federateMigrations = FBDATA.bookmarkRegions476.dalmatia_east.migrations;
/* A government form names the registered strategy (js/governments.js) that
   answers each behavior slot for a realm of that form. A slot the form leaves
   out uses its engine default, today's shared code path. consent says whether
   local civic consent follows territorial rule or a delegated office.
   regnum is the late antique kingdom: territorial consent, but its counties
   are held directly by the realm rather than by generated vassals. A form
   may also name a costume (FBDATA.wardrobes id) that dresses characters of
   that government instead of its era's costume.
   An optional balance table overrides existing FBDATA.balance keys for
   realms of the form, read through FB.balanceFor at realm-scoped sites; it
   sits over the era layer and beneath the bookmark and mod layers. */
FBDATA.governmentForms = {
  elective_monarchy:{ holders:'direct', succession:'crown_election', territory:'fixed',
    consent:'local_reserved', levy:'elective_service', revenue:'elective_receipts',
    council:'local_interests', diplomacy:'territorial_diplomacy', ai:'elective_selection', ladder:'local_standing',
    officeCatalogue:[], systems:{ enable:['civic_institutions','episcopal_sees'],
      disable:['roman_offices','feudal_service','estates','royal_council','scutage','manorial_tenure','colonate'] },
    selectionProfile:{ eligibility:{ minAge:18, sex:'m', ancestry:false },
      candidatePool:{ gentle:true, cultures:['gothic'], religions:['catholic'], excludedRoles:['priest','monk'] },
      procedure:{ realmRecognition:true, designation:false, interimRevenue:true, defensiveLevy:true },
      tieBreak:'identity', consensus:1, quorum:1, negotiationCost:12,
      terms:{ levy:0.7, revenue:0.7 }, reserved:['levy','war','treaty','grant','extraordinary_tax'],
      members:[
        { id:'palace_interest', name:'Palace nobility', principal:'capital_elite', scope:'realm', basis:'public_office',
          weight:1, continuity:'institution', minimumSupport:-25, minimumMartial:6, maximumLevy:0.85, maximumRevenue:0.8 },
        { id:'clerical_interest', name:'Clerical delegates', principal:'capital_clergy', scope:'realm', basis:'public_office',
          weight:1, continuity:'institution', minimumSupport:-15, minimumMartial:0, maximumLevy:0.75, maximumRevenue:0.75 }
      ] } },
  lineage_kingship:{ holders:'direct', succession:'kin_acclamation', territory:'fixed',
    consent:'local_reserved', levy:'local_obligations', revenue:'local_obligations',
    council:'local_interests', diplomacy:'territorial_diplomacy', ai:'local_kingship', ladder:'local_standing',
    transformationOptions:[{ formId:'regnum', name:'Review settled dynastic government' }],
    officeCatalogue:[], systems:{ disable:['roman_offices','feudal_service','estates','royal_council','scutage','manorial_tenure','colonate'] },
    selectionProfile:{ eligibility:{ minAge:16 }, tieBreak:'seniority', consensus:0.6, quorum:0.6, negotiationCost:8,
      terms:{ levy:0.6, revenue:0.65 }, reserved:['levy','war','treaty','grant','extraordinary_tax'],
      members:[
        { id:'royal_kin_interest', name:'Recognized royal kin', principal:'senior_kin', scope:'realm', basis:'kin_recognition',
          weight:3, continuity:'senior_kin', minimumSupport:-15, minimumMartial:0, maximumLevy:0.8, maximumRevenue:0.8 },
        { id:'county_household_interest', name:'Local households', principal:'capital_community', scope:'capital', basis:'community_assent',
          weight:3, continuity:'institution', minimumSupport:-5, minimumMartial:0, maximumLevy:0.7, maximumRevenue:0.7 }
      ] } },
  administrative_monarchy:{ legalTradition:{ default:'faith', cultures:{ greek:'byzantine' } },
    holders:'public_offices', succession:'public_accession',
    territory:'fixed', consent:'delegated', levy:'public_service', revenue:'public_receipts',
    council:'appointed_council', diplomacy:'territorial_diplomacy', ai:'public_administration',
    ladder:'public_careers', administrationProfileId:'public_court',
    officeCatalogue:['public_governor','public_fiscal_officer','public_commander',
      'abbasid_wali','abbasid_amil','abbasid_commander','byzantine_strategos','byzantine_logothete','byzantine_commander'],
    systems:{ enable:['public_offices'], disable:['feudal_service','scutage','estates','crown_bloc','royal_council'] } },
  territorial:{ legalTradition:{ default:'faith', cultures:{ greek:'byzantine' },
    realms:{ byzantium:'byzantine', byzantium_1066:'byzantine' } }, levy:'feudal_levy', revenue:'demesne_revenue', council:'royal_council', diplomacy:'territorial_diplomacy', holders:'feudal_vassals', succession:'dynastic',
    territory:'fixed', consent:'territorial', ladder:'inherited_ladder', ai:'federate_contracts', systems:{ enable:['feudal_service'] } },
  regnum:{ legalTradition:{ default:'faith', cultures:{ greek:'byzantine' },
    realms:{ byzantium:'byzantine', byzantium_1066:'byzantine' } }, levy:'feudal_levy', revenue:'demesne_revenue', council:'royal_council', diplomacy:'territorial_diplomacy', holders:'direct', succession:'dynastic',
    territory:'fixed', consent:'territorial', ladder:'inherited_ladder', ai:'roman_offices',
    officeCatalogue:['defensor_civitatis','praeses','tribunus','consularis','corrector','comes_rei_privatae','dux','patricius','consul'], systems:{ disable:['feudal_service'] } },
  roman_civic:{ legalTradition:{ default:'faith', cultures:{ greek:'byzantine' },
    realms:{ byzantium:'byzantine', byzantium_1066:'byzantine' } }, levy:'feudal_levy', revenue:'demesne_revenue', council:'royal_council', diplomacy:'territorial_diplomacy', holders:'direct', succession:'office',
    territory:'fixed', consent:'delegated', ladder:'roman_civic', ai:'roman_offices',
    officeCatalogue:['defensor_civitatis','praeses','tribunus','vicarius','urban_prefect','praetorian_prefect','comes_largitionum','comes_rei_privatae','comes_rei_militaris','dux','magister_militum','magister_praesentalis','magister_gallias','magister_illyricum','magister_thracias','magister_orientem','patricius','consul'], systems:{ disable:['feudal_service'] } },
  federate_polity:{ legalTradition:{ default:'faith', cultures:{ greek:'byzantine' },
    realms:{ byzantium:'byzantine', byzantium_1066:'byzantine' } }, levy:'feudal_levy', revenue:'demesne_revenue', council:'royal_council', diplomacy:'territorial_diplomacy', holders:'direct', succession:'acclamation',
    territory:'non_territorial', consent:'delegated', ladder:'federate_polity', ai:'roman_offices',
    officeCatalogue:['tribunus','comes_rei_militaris','dux','patricius'], systems:{ disable:['feudal_service'] } }
};

/* Dated public-service profiles. Shares, fees and thresholds are gameplay
   abstractions; no religion, language or title selects one. */
FBDATA.administrationProfiles = {
  public_court:{ name:'Public court', offices:['public_governor','public_fiscal_officer','public_commander'],
    governor:'public_governor', fiscal:'public_fiscal_officer', commander:'public_commander',
    appointmentCost:5, termDays:720, confirmation:'continues',
    finance:{ kind:'revenue_service', share:0.20, salary:0, serviceShare:0.35, remittance:1 },
    accession:{ mode:'recognition', minimumAge:16, allowMinor:false, officeCandidates:true, threshold:0.5,
      interests:[{ id:'civil', role:'governor', weight:1 },{ id:'military', role:'commander', weight:1 }] } },
  abbasid_800:{ name:'Abbasid public administration (800)',
    offices:['abbasid_wali','abbasid_amil','abbasid_commander'],
    governor:'abbasid_wali', fiscal:'abbasid_amil', commander:'abbasid_commander',
    appointmentCost:5, termDays:1080, confirmation:'continues',
    finance:{ kind:'salary', share:0.15, salary:6, serviceShare:0, remittance:1 },
    accession:{ mode:'designation', minimumAge:16, allowMinor:true, officeCandidates:false, threshold:0.5,
      interests:[{ id:'civil', role:'governor', weight:1 },{ id:'military', role:'commander', weight:1 }] } },
  byzantine_800:{ name:'Byzantine public administration (800)',
    offices:['byzantine_strategos','byzantine_logothete','byzantine_commander'],
    governor:'byzantine_strategos', fiscal:'byzantine_logothete', commander:'byzantine_commander',
    appointmentCost:5, termDays:720, confirmation:'reaffirm',
    finance:{ kind:'salary', share:0.10, salary:4, serviceShare:0.5, remittance:1 },
    accession:{ mode:'recognition', minimumAge:16, allowMinor:false, officeCandidates:true, threshold:0.5,
      interests:[{ id:'civil', role:'fiscal', weight:1 },{ id:'military', role:'governor', weight:1 }] } }
};


/* Great offices are stable save ids. Added seats receive the Council's
   ordinary vacancy, appointment, Standing, and effectiveness behavior;
   councilSeatRoles supplies the supported special decision roles. */
FBDATA.councilSeats = {
  seneschal: {
    systems:['royal_council'],
    name:'Seneschal', icon:'⚖',
    desc:'+10% taxes while he serves',
    bonusKey:'tax', bonusAmount:0.10,
    station:'mayHoldCouncil', tierMin:6, holderEligibility:'direct_vassal'
  },
  constable: {
    systems:['royal_council'],
    name:'Constable', icon:'🗡',
    desc:'+10% levy while he serves',
    bonusKey:'levy', bonusAmount:0.10,
    station:'mayHoldCouncil', tierMin:6, holderEligibility:'direct_vassal'
  },
  treasurer: {
    systems:['royal_council'],
    name:'Treasurer', icon:'💰',
    desc:'Buildings cost 15% less while he serves',
    bonusKey:'build', bonusAmount:0.15,
    station:'mayHoldCouncil', tierMin:6, holderEligibility:'direct_vassal'
  },
  almoner: {
    systems:['royal_council'],
    name:'Almoner', icon:'🕯',
    desc:'+1 piety a season while he serves',
    bonusKey:'piety', bonusAmount:1,
    station:'mayHoldCouncil', tierMin:6, holderEligibility:'direct_vassal'
  },
  chamberlain: {
    systems:['royal_council'],
    name:'Chamberlain', icon:'🗝',
    desc:'Watches for schemes against you; your own plots weave faster',
    bonusKey:'plot', bonusAmount:0.08,
    station:'mayHoldCouncil', tierMin:6, holderEligibility:'direct_vassal'
  }
};

FBDATA.councilSeatRoles = { treasurer:['market'], constable:['muster'] };

FBDATA.councilRules = {
  schemerTraits:[
    'ambitious','deceitful','proud','envious','cruel','wrathful'
  ]
};

FBDATA.elections = {
  guild_officer: {
    name:'Guild Officer Election', icon:'🏅', systems:['guild_elections'], kind:'guild', office:'officer',
    desc:'The masters choose who will sit among the guild’s officers for a fixed term.',
    order:0, termDays:1440, campaignDays:90, nominationCost:25,
    defeatCooldownDays:720, requiredRank:'master', stewardship:10,
    prestige:60, guildStanding:45, merchantLearning:6,
    electorates:[
      { id:'masters', name:'Masters’ bench', weight:3, base:0.42,
        standingRate:0.004, stewardshipRate:0.025 },
      { id:'journeymen', name:'Journeymen and shopkeepers', weight:2, base:0.46,
        standingRate:0.005, diplomacyRate:0.018 },
      { id:'customers', name:'Patrons and market interests', weight:2, base:0.38,
        prestigeRate:0.0015, stewardshipRate:0.018 }
    ],
    rivals:[
      { id:'senior_master', name:'The senior master' },
      { id:'wealthy_master', name:'The wealthy master' }
    ],
    tactics:{
      canvass:{ name:'Canvass every bench', icon:'🗣',
        desc:'Diplomacy turns personal calls into visible support.',
        support:{ masters:0.04, journeymen:0.12, customers:0.05 } },
      favors:{ name:'Call in guild favors', icon:'🤝', guildStanding:20,
        desc:'Spend Guild Standing on promises already owed.',
        support:{ masters:0.13, journeymen:0.09, customers:0.03 } },
      expense:{ name:'Open the campaign purse', icon:'💰', gold:20,
        desc:'Pay for hospitality, copied notices, and a well-run canvass.',
        support:{ masters:0.07, journeymen:0.08, customers:0.14 } },
      reputation:{ name:'Stand on reputation', icon:'🏛',
        desc:'Make no private bargain; let Guild Standing and prestige speak.',
        support:{ masters:0.08, journeymen:0.03, customers:0.08 } }
    }
  },
  guildmaster: {
    name:'Guildmaster Election', icon:'🏅', systems:['guild_elections'], kind:'guild', office:'guildmaster',
    desc:'The guild’s constituencies elect a guildmaster from proven officers for a fixed term.',
    order:1, termDays:1800, campaignDays:120, nominationCost:50,
    defeatCooldownDays:1080, requiredRank:'officer', minimumOfficeDays:360,
    stewardship:12, prestige:120, guildStanding:65,
    merchantLearning:8,
    electorates:[
      { id:'masters', name:'Masters’ bench', weight:4, base:0.38,
        standingRate:0.005, stewardshipRate:0.026 },
      { id:'officers', name:'Guild officers', weight:3, base:0.40,
        standingRate:0.004, diplomacyRate:0.018 },
      { id:'market', name:'Market and charter interests', weight:3, base:0.34,
        prestigeRate:0.0015, stewardshipRate:0.020 }
    ],
    rivals:[
      { id:'senior_officer', name:'The senior officer' },
      { id:'chartered_candidate', name:'The chartered candidate' }
    ],
    tactics:{
      canvass:{ name:'Canvass the guild halls', icon:'🗣',
        desc:'Diplomacy seeks a majority one bench at a time.',
        support:{ masters:0.05, officers:0.12, market:0.05 } },
      favors:{ name:'Call every favor due', icon:'🤝', guildStanding:30,
        desc:'Spend Guild Standing to turn old obligations into votes.',
        support:{ masters:0.14, officers:0.12, market:0.04 } },
      expense:{ name:'Fund a great election feast', icon:'💰', gold:40,
        desc:'A broad campaign reaches officers, masters, and charter interests.',
        support:{ masters:0.08, officers:0.08, market:0.16 } },
      reputation:{ name:'Stand on service and reputation', icon:'🏛',
        desc:'Trust the record built as an officer and guild member.',
        support:{ masters:0.10, officers:0.08, market:0.07 } }
    }
  },
  council_treasurer_confirmation: {
    name:'Confirmation of the Treasurer', icon:'💰', systems:['royal_council'], kind:'council',
    office:'treasurer', desc:'A chartered council weighs the crown’s nominee before the treasury changes hands.',
    order:2, termDays:1440, campaignDays:60, nominationCost:0,
    defeatCooldownDays:360,
    electorates:[
      { id:'council', name:'Great officers', weight:3, base:0.45,
        standingRate:0.004, rankRate:0.04 },
      { id:'magnates', name:'Direct magnates', weight:3, base:0.40,
        standingRate:0.005, rankRate:0.05 },
      { id:'mercantile', name:'Mercantile interest', weight:2, base:0.43,
        standingRate:0.003, stewardshipRate:0.025 }
    ],
    rivals:[{ id:'vacancy', name:'Continue the vacancy' }],
    tactics:{
      canvass:{ name:'Present the nominee in council', icon:'🗣',
        desc:'The crown makes the public case for competence.',
        support:{ council:0.10, magnates:0.05, mercantile:0.06 } },
      favors:{ name:'Promise access to the accounts', icon:'🤝', authority:6,
        desc:'Concede Crown Authority so the officers can supervise the nominee.',
        support:{ council:0.15, magnates:0.08, mercantile:0.08 } },
      expense:{ name:'Fund an independent audit', icon:'💰', gold:30,
        desc:'A paid audit reassures the benches without buying the office itself.',
        support:{ council:0.08, magnates:0.07, mercantile:0.16 } },
      reputation:{ name:'Demand a vote on the record', icon:'🏛',
        desc:'Use the nominee’s Standing, rank, and Stewardship without concession.',
        support:{ council:0.05, magnates:0.05, mercantile:0.07 } }
    }
  },
  council_constable_confirmation: {
    name:'Confirmation of the Constable', icon:'🗡', systems:['royal_council'], kind:'council',
    office:'constable', desc:'A chartered council weighs the crown’s nominee before command of the host changes hands.',
    order:3, termDays:1440, campaignDays:60, nominationCost:0,
    defeatCooldownDays:360,
    electorates:[
      { id:'council', name:'Great officers', weight:3, base:0.44,
        standingRate:0.004, rankRate:0.04 },
      { id:'magnates', name:'Direct magnates', weight:4, base:0.42,
        standingRate:0.005, rankRate:0.05 },
      { id:'captains', name:'Military households', weight:3, base:0.40,
        standingRate:0.003, martialRate:0.025 }
    ],
    rivals:[{ id:'vacancy', name:'Continue the vacancy' }],
    tactics:{
      canvass:{ name:'Present the nominee in council', icon:'🗣',
        desc:'The crown makes the public case for command.',
        support:{ council:0.09, magnates:0.07, captains:0.10 } },
      favors:{ name:'Promise oversight of the host', icon:'🤝', authority:6,
        desc:'Concede Crown Authority so the board can restrain the office.',
        support:{ council:0.14, magnates:0.10, captains:0.08 } },
      expense:{ name:'Fund a muster review', icon:'💰', gold:30,
        desc:'Inspect horses, rolls, and stores before the vote.',
        support:{ council:0.07, magnates:0.08, captains:0.16 } },
      reputation:{ name:'Demand a vote on the record', icon:'🏛',
        desc:'Use the nominee’s Standing, rank, and Martial without concession.',
        support:{ council:0.05, magnates:0.06, captains:0.08 } }
    }
  }
};

FBDATA.privileges = {
  guild_monopoly: {
    name:'Guild Monopoly', icon:'📜', order:0,
    desc:'An exclusive guild charter with copied commercial and fiscal terms.',
    holderTypes:['house','guild'], scopeTypes:['county','realm'],
    rights:['Exclusive practice in the chartered profession.'],
    exemptions:['Competing ordinary toll privilege is suspended.'],
    obligations:['The holder keeps the profession and territorial scope named in the charter.'],
    duration:'contract', revocation:'term_only', effect:{ kind:'guild_monopoly' }
  },
  market_charter: {
    name:'Market Charter', icon:'⚖', order:1,
    desc:'A county holds measured tolls and protected stalls under public seal.',
    requiresTech:['urban_markets','authenticated_seals'],
    holderTypes:['county'], scopeTypes:['county'],
    rights:['Protected market and measured tolls.'],
    exemptions:[], obligations:['Pay any upkeep recorded by the county effect.'],
    duration:'modifier', revocation:'protected_term',
    effect:{ kind:'modifier', id:'market_charter' }
  },
  confirmed_custom: {
    name:'Confirmed Local Custom', icon:'📜', order:2,
    desc:'A county’s witnessed customs stand against unilateral alteration.',
    requiresTech:'customary_law',
    holderTypes:['county'], scopeTypes:['county'],
    rights:['Local custom is confirmed in writing.'],
    exemptions:['The full ordinary levy is limited while the confirmation lasts.'],
    obligations:[], duration:'modifier', revocation:'protected_term',
    effect:{ kind:'modifier', id:'custom_confirmed' }
  },
  levy_exemption: {
    name:'Levy Exemption', icon:'🕊', order:3,
    desc:'A county is sheltered from part of the ordinary muster for a fixed term.',
    holderTypes:['county'], scopeTypes:['county'],
    rights:['The named county renders a reduced levy.'],
    exemptions:['Part of the ordinary muster obligation.'],
    obligations:[], duration:'modifier', revocation:'protected_term',
    effect:{ kind:'modifier', id:'levy_exemption' }
  },
  sanctuary: {
    name:'Sanctuary', icon:'🕯', order:4,
    desc:'A faith community’s witnessed sanctuary limits levy and coercive entry.',
    holderTypes:['faith'], scopeTypes:['county'],
    rights:['Sanctuary is publicly protected in the named county.'],
    exemptions:['Part of the ordinary muster obligation.'],
    obligations:['The community keeps sanctuary within the named territorial scope.'],
    duration:'modifier', revocation:'protected_term',
    effect:{ kind:'modifier', id:'levy_exemption' },
    sourceEvents:['council_sanctuary_claim','parliament_sanctuary_relief']
  },
  tax_concession: {
    name:'Tax Concession', icon:'🌾', order:5,
    desc:'A county receives a bounded remission after coercive collection.',
    holderTypes:['county'], scopeTypes:['county'],
    rights:['A recorded remission limits extraordinary collection.'],
    exemptions:['Part of the ordinary local tax burden.'],
    obligations:[], duration:'modifier', revocation:'protected_term',
    effect:{ kind:'modifier', id:'tax_concession' }
  },
  consent_of_estates: {
    systems:['estates'],
    name:'Consent of the Estates', icon:'🗳', order:6,
    desc:'The liege is sworn to seek the assembly’s consent before new aids.',
    requiresTech:'representative_estates',
    holderTypes:['institution'], scopeTypes:['realm'],
    rights:['New aids require the assembled estates’ consent.'],
    exemptions:['Unilateral aid demands leave the ordinary agenda.'],
    obligations:['The estates must assemble to give or refuse consent.'],
    duration:'indefinite', revocation:'estates_vote',
    effect:{ kind:'obligation', id:'revocationConsent' }
  },
  office_confirmation: {
    name:'Confirmation of Great Offices', icon:'🏛', order:7,
    desc:'The Treasurer and Constable require a chartered council’s confirmation and hold protected fixed terms.',
    requiresTech:'representative_estates',
    holderTypes:['institution'], scopeTypes:['realm'],
    rights:['Treasurer and Constable nominees receive a recorded confirmation vote.'],
    exemptions:['Confirmed holders cannot be dismissed during the protected term.'],
    obligations:['The crown nominates one eligible direct vassal at a time.'],
    duration:'indefinite', revocation:'council_consent',
    systems:['royal_council'], effect:{ kind:'council_confirmation', seats:['treasurer','constable'] }
  },
  protected_worship: {
    name:'Protected Worship', icon:'📜', order:8,
    desc:'A minority faith community worships under the crown’s written protection while the royal tolerance policy stands.',
    holderTypes:['faith'], scopeTypes:['county'],
    rights:['Worship, persons, and market rights of the minority congregation are guaranteed by charter.'],
    exemptions:['The congregation is spared the fines and dispersals of persecution.'],
    obligations:['The community keeps the peace of the county that shelters it.'],
    duration:'policy', revocation:'policy_change',
    effect:{ kind:'modifier', id:'protected_worship' },
    sourceEvents:['realm_policy_protected_worship']
  }
};

FBDATA.collectiveDemands = {
  commons_custom: {
    name:'Petition of the Commons', constituency:'commons', privilege:'confirmed_custom',
    order:0, minTier:3, gate:'collective_demand_commons', cooldownYears:3
  },
  tax_remission: {
    name:'Demand for Remission', constituency:'commons', privilege:'tax_concession',
    order:1, minTier:3, gate:'collective_demand_tax', cooldownYears:3
  },
  guild_charter: {
    name:'Guild Demand', constituency:'guild', privilege:'market_charter',
    order:2, minTier:3, gate:'collective_demand_guild', cooldownYears:3
  },
  sanctuary_claim: {
    name:'Claim of Sanctuary', constituency:'faith', privilege:'sanctuary',
    order:3, minTier:3, gate:'collective_demand_sanctuary', cooldownYears:3
  },
  magnate_confirmation: {
    name:'Demand of the Magnates', constituency:'magnates', privilege:'office_confirmation',
    order:4, minTier:6, gate:'collective_demand_magnates', cooldownYears:4
  }
};

/* Annual estate business, selected after the shared seasonal eligibility gate. */
FBDATA.parliamentAgendas = {
  "session": {
    "event": "parliament_session",
    "order": 0
  },
  "grievance": {
    "event": "parliament_grievance",
    "order": 1
  },
  "subsidy": {
    "event": "parliament_subsidy",
    "war": true,
    "order": 2
  },
  "levy_concession": {
    "event": "parliament_levy_concession",
    "war": true,
    "order": 3
  },
  "market": {
    "event": "parliament_market_charter",
    "war": false,
    "capabilities": [
      "permanent_markets",
      "sealed_documents"
    ],
    "notModifiers": [
      "market_charter",
      "contested_tolls"
    ],
    "order": 4
  },
  "sanctuary": {
    "event": "parliament_sanctuary_relief",
    "war": false,
    "notModifiers": [
      "levy_exemption",
      "settlement_grudge"
    ],
    "order": 5
  },
  "aid": {
    "event": "parliament_aid_hike",
    "aidRoom": true,
    "revocationConsent": false,
    "order": 6
  },
  "redress": {
    "event": "parliament_local_redress",
    "anyModifiers": [
      "contested_tolls",
      "settlement_grudge"
    ],
    "order": 7
  }
};
