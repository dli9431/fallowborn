/* Fallowborn — elections, durable privileges, and collective demands.
   Definitions are replaced atomically by runtime mods. Saved records keep
   stable ids, parties, scopes, terms, and outcomes; display and forecasts are
   derived by js/institutions.js. */
window.FBDATA = window.FBDATA || {};

FBDATA.elections = {
  guild_officer: {
    name:'Guild Officer Election', icon:'🏅', kind:'guild', office:'officer',
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
    name:'Guildmaster Election', icon:'🏅', kind:'guild', office:'guildmaster',
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
    name:'Confirmation of the Treasurer', icon:'💰', kind:'council',
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
    name:'Confirmation of the Constable', icon:'🗡', kind:'council',
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
    effect:{ kind:'council_confirmation', seats:['treasurer','constable'] }
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
