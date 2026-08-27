/* =========================================================================
   Fallowborn — livelihoods: careers, apprenticeship, guilds, enterprises.
   Display fields are localized by id; simulation fields stay locale-neutral.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

/* Exact, deterministic terms offered when a serf asks the current lord for
   freedom. Display prose belongs to the UI; these records are simulation
   semantics and saved offers freeze their calculated values. */
FBDATA.freedomTerms = [
  { id:'cash_standard', minStanding:20, maxStanding:39,
    priceFactor:1, serviceDays:0 },
  { id:'cash_favored', minStanding:40, maxStanding:59,
    priceFactor:0.75, serviceDays:0 },
  { id:'cash_service', minStanding:60, maxStanding:100,
    priceFactor:0.50, serviceDays:90 }
];
FBDATA.freedomBargaining = {
  petitionMinStanding:20,
  offerDays:180,
  petitionCooldownDays:360,
  finalServiceDays:90
};

/* Religious progression is character state keyed by path id and a legacy
   numeric rank index. Baseline rank order is therefore a compatibility
   boundary even though every rank also has its own stable id. */
FBDATA.religiousPaths = {
  catholic_lay: {
    kind:'lay', faiths:['catholic'], systems:['papacy'],
    ranks:[
      { id:'parishioner', name:'Parishioner', pietyYield:0 },
      { id:'almsgiver', name:'Almsgiver', age:16, piety:10, gold:5,
        prestigeGain:2, pietyYield:0.25 },
      { id:'pilgrim', name:'Pilgrim', age:16, piety:30, gold:20,
        prestigeGain:5, pietyYield:0.5 },
      { id:'church_patron', name:'Church Patron', age:18, piety:80,
        prestige:25, gold:80, prestigeGain:10, pietyYield:1 }
    ]
  },
  catholic_monastic: {
    kind:'vocation', faiths:['catholic'], systems:['papacy'],
    professions:['monk'],
    ranks:[
      { id:'novice', name:'Novice', pietyYield:0.25 },
      { id:'professed', name:'Professed Brother', name_f:'Professed Sister',
        age:16, years:2, learning:4, piety:25,
        prestigeGain:3, pietyYield:0.5 },
      { id:'prior', name:'Prior', name_f:'Prioress', age:20, years:6,
        learning:7, piety:60, prestige:20, prestigeGain:8,
        pietyYield:1, station:1 },
      { id:'abbot', name:'Abbot', name_f:'Abbess', age:24, years:10,
        learning:9, piety:100, prestige:40, prestigeGain:15,
        pietyYield:1.5, station:2, tier:2, flag:'abbot' },
      { id:'bishop', name:'Bishop', age:30, years:14, learning:12,
        piety:160, prestige:80, prestigeGain:25, pietyYield:2.5,
        station:3, tier:3, flag:'bishop', maleOnly:true }
    ]
  },
  catholic_clerical: {
    kind:'vocation', faiths:['catholic'], systems:['papacy'],
    professions:['priest'],
    ranks:[
      { id:'clerk', name:'Clerk', pietyYield:0.25 },
      { id:'acolyte', name:'Acolyte', age:16, years:1, learning:3,
        piety:10, prestigeGain:2, pietyYield:0.5 },
      { id:'deacon', name:'Deacon', age:19, years:3, learning:5,
        piety:30, prestigeGain:4, pietyYield:0.75 },
      { id:'priest', name:'Priest', age:24, years:5, learning:7,
        piety:50, prestigeGain:7, pietyYield:1, station:1 },
      { id:'archpriest', name:'Archpriest', age:28, years:9,
        learning:9, piety:90, prestige:30, prestigeGain:12,
        pietyYield:1.5, station:2 },
      { id:'bishop', name:'Bishop', age:30, years:14, learning:12,
        piety:160, prestige:80, prestigeGain:25, pietyYield:2.5,
        station:3, tier:3, flag:'bishop' }
    ]
  },
  muslim_lay: {
    kind:'lay', faiths:['muslim'],
    ranks:[
      { id:'believer', name:'Believer', pietyYield:0 },
      { id:'almsgiver', name:'Almsgiver', age:16, piety:10, gold:5,
        prestigeGain:2, pietyYield:0.25 },
      { id:'hajji', name:'Hajji', name_f:'Hajja', age:18, piety:35,
        gold:35, prestigeGain:6, pietyYield:0.5 },
      { id:'waqf_patron', name:'Waqf Patron', age:18, piety:80,
        prestige:25, gold:100, prestigeGain:10, pietyYield:1 }
    ]
  },
  muslim_scholar: {
    kind:'vocation', faiths:['muslim'], professions:['monk'],
    ranks:[
      { id:'student', name:'Student of the Faith', pietyYield:0.25 },
      { id:'licensed_scholar', name:'Licensed Scholar', age:16, years:2,
        learning:5, piety:20, prestigeGain:4, pietyYield:0.5 },
      { id:'mudarris', name:'Mudarris', age:20, years:6, learning:8,
        piety:50, prestige:15, prestigeGain:8, pietyYield:1, station:1 },
      { id:'mufti', name:'Mufti', age:24, years:9, learning:10,
        piety:80, prestige:30, prestigeGain:12, pietyYield:1.5, station:2 },
      { id:'qadi', name:'Qadi', age:26, years:12, learning:11,
        piety:110, prestige:50, gold:25, prestigeGain:18, pietyYield:2,
        station:2, tier:2, flag:'qadi', maleOnly:true },
      { id:'chief_qadi', name:'Chief Qadi', age:30, years:16,
        learning:13, piety:170, prestige:90, gold:100,
        prestigeGain:28, pietyYield:3, station:3, tier:3,
        flag:'chief_qadi', maleOnly:true }
    ]
  },
  muslim_mosque: {
    kind:'vocation', faiths:['muslim'], professions:['priest'],
    ranks:[
      { id:'mosque_servant', name:'Mosque Servant', pietyYield:0.25 },
      { id:'muezzin', name:'Muezzin', age:16, years:1, learning:3,
        piety:15, prestigeGain:2, pietyYield:0.5 },
      { id:'imam', name:'Imam', age:20, years:4, learning:6,
        piety:40, prestigeGain:6, pietyYield:1, station:1 },
      { id:'khatib', name:'Khatib', age:24, years:8, learning:8,
        piety:75, prestige:25, prestigeGain:10, pietyYield:1.5, station:2 },
      { id:'chief_imam', name:'Chief Imam', age:28, years:12,
        learning:10, piety:120, prestige:50, gold:50,
        prestigeGain:18, pietyYield:2, station:2 }
    ]
  }
};

FBDATA.careers = {
  farmer: {
    name:'Farming', icon:'🌾', skill:'ste', apprenticeAge:10, apprenticeCost:0, requiresTech:'scratch_plough',
    wage:1.2, masterWage:2,
    ranks:{ apprentice:'Farm servant', journeyman:'Farmer', master:'Master farmer' },
    desc:'Fields, herds, orchards, and the patient arithmetic of the seasons.'
  },
  craftsman: {
    name:'Craft', icon:'🔨', skill:'ste', apprenticeAge:10, apprenticeCost:8, tierMin:1, requiresTech:'bloomery_iron',
    wage:1.8, masterWage:3, guild:true,
    ranks:{ apprentice:'Apprentice', journeyman:'Journeyman', master:'Master craftsman' },
    specializations:{
      smith:{
        name:'Smith', guildRankMin:'guildmaster',
        guildStandingMin:35, skills:{ ste:9 }, cost:20,
        fx:{ focusGold:1.5, enterprise:{ tags:['workshop'], bonus:0.15 } }
      },
      weaver:{
        name:'Weaver', requiresTech:'horizontal_loom', guildRankMin:'guildmaster',
        guildStandingMin:35, skills:{ ste:9 }, cost:20,
        fx:{ focusGold:1, enterprise:{ tags:['workshop'], bonus:0.18 } }
      },
      cooper:{
        name:'Cooper', requiresTech:'cooperage', guildRankMin:'guildmaster',
        guildStandingMin:35, skills:{ ste:9 }, cost:20,
        fx:{ focusGold:1, enterprise:{ tags:['workshop'], bonus:0.12 } }
      }
    },
    desc:'Learn a skilled trade, earn a mark, and one day keep a bench of your own.'
  },
  merchant: {
    name:'Trade', icon:'⚖', skill:'ste', apprenticeAge:12, apprenticeCost:10, tierMin:1, requiresTech:'weights_measures',
    wage:2, masterWage:3.5, guild:true,
    ranks:{ apprentice:'Merchant’s clerk', journeyman:'Peddler', master:'Merchant' },
    specializations:{
      broker:{
        name:'Broker', guildRankMin:'guildmaster',
        guildStandingMin:35, skills:{ ste:9 }, cost:20,
        fx:{ focusGold:1.5, enterprise:{ tags:['market'], bonus:0.18 } }
      },
      caravan_factor:{
        name:'Caravan Factor', requiresTech:'trade_houses', guildRankMin:'guildmaster',
        guildStandingMin:35, skills:{ ste:9 }, cost:20,
        fx:{ focusGold:2, enterprise:{ tags:['trade-house'], bonus:0.15 }, tradeVenture:0.04 }
      },
      maritime_factor:{
        name:'Maritime Factor', requiresTech:'coastal_piloting', guildRankMin:'guildmaster',
        guildStandingMin:35, skills:{ ste:9 }, cost:20,
        fx:{ focusGold:1, enterprise:{ tags:['trade-house'], bonus:0.12 }, tradeVenture:0.06 }
      }
    },
    desc:'Weights, ledgers, roads, and the trust that lets silver travel.'
  },
  administration: {
    name:'Administration', icon:'📜', skill:'ste', apprenticeAge:12, apprenticeCost:10,
    tierMin:1, requiresTech:'bureaucratic_offices', wage:2, masterWage:3.5,
    learned:true, literacyYears:2,
    ranks:{ apprentice:'Copyist', journeyman:'Clerk', master:'Learned administrator' },
    license:{
      id:'clerk', name:'Clerk’s examination', toRank:'journeyman', age:16,
      years:2, skills:{ lea:6, ste:5 }, cost:10
    },
    specializations:{
      notary:{
        name:'Notary', requiresTech:'notarial_contracts',
        years:8, skills:{ lea:10, ste:8 }, cost:30,
        fx:{ focusGold:1 }
      },
      bailiff:{
        name:'Bailiff', requiresTech:'professional_bailiffs',
        years:8, skills:{ lea:8, ste:10 }, cost:30,
        fx:{ focusStanding:2 }
      }
    },
    desc:'Charters, accounts, judgments, and the written machinery of rule.'
  },
  physician: {
    name:'Medicine', icon:'🌿', skill:'lea', apprenticeAge:12, apprenticeCost:8,
    tierMin:1, requiresTech:'herbals', wage:1.5, masterWage:2.5,
    learned:true, literacyYears:2,
    ranks:{ apprentice:'Healer’s pupil', journeyman:'Practitioner', master:'Medical master' },
    license:{
      id:'practitioner', name:'Practitioner’s examination', toRank:'journeyman', age:16,
      years:3, skills:{ lea:7 }, cost:15
    },
    specializations:{
      physician:{
        name:'Physician', requiresTech:'physicians',
        years:8, skills:{ lea:11 }, cost:35,
        fx:{ mortality:0.006 }
      },
      apothecary:{
        name:'Apothecary', requiresTech:'pharmacology',
        years:8, skills:{ lea:9, ste:7 }, cost:30,
        fx:{ focusGold:2, mortality:0.003 }
      }
    },
    desc:'Diagnosis, remedies, regimen, and the uncertain care of the sick.'
  },
  scholar: {
    name:'Scholarship', icon:'📚', skill:'lea', apprenticeAge:10, apprenticeCost:5,
    tierMin:1, requiresTech:'manuscript_codex', wage:1, masterWage:1.75,
    learned:true, literacyYears:2,
    ranks:{ apprentice:'Student', journeyman:'Scholar', master:'Learned master' },
    license:{
      id:'scholar', name:'Scholarly disputation', toRank:'journeyman', age:16,
      years:2, skills:{ lea:7 }, cost:10
    },
    specializations:{
      author:{
        name:'Author', requiresTech:'scriptoria',
        years:8, skills:{ lea:10 }, cost:25,
        fx:{ focusGold:2, focusPrestige:1 }, authoredWork:true
      },
      astronomer:{
        name:'Astronomer', requiresTech:'astrolabe',
        years:8, skills:{ lea:11 }, cost:30,
        fx:{ focusResearch:1 }
      }
    },
    desc:'Books, disputation, observation, and works meant to outlive their author.'
  },
  soldier: {
    name:'Soldiering', icon:'🛡', skill:'mar', apprenticeAge:14, apprenticeCost:0, tierMin:1, requiresTech:'spear_shield_drill',
    wage:1.5, masterWage:2.5, maleOnly:true,
    ranks:{ apprentice:'Garrison page', journeyman:'Man-at-arms', master:'Veteran retainer' },
    desc:'Drill, guard duty, and paid service beneath another person’s banner.'
  },
  monk: {
    name:'Letters & Faith', icon:'✒', skill:'lea', apprenticeAge:10, apprenticeCost:5, tierMin:1, requiresTech:'manuscript_codex',
    wage:0.5, masterWage:1, piety:1.5,
    ranks:{ apprentice:'Religious student', journeyman:'Scribe', master:'Learned scholar' },
    desc:'Letters, law, worship, and the learned work of a religious house.'
  },
  priest: {
    name:'Clerical Service', icon:'🕯', skill:'lea', apprenticeAge:16, apprenticeCost:0,
    wage:0.5, masterWage:1, piety:2, maleOnly:true,
    religionGroups:['christian','muslim'],
    ranks:{ apprentice:'Clerical student', journeyman:'Clerical servant', master:'Senior cleric' },
    desc:'Public worship, teaching, judgment, and the care of souls.'
  },
  noble: {
    name:'Estate service', icon:'🏡', skill:'dip', apprenticeAge:12, apprenticeCost:5, tierMin:2,
    wage:1.5, masterWage:2.5,
    ranks:{ apprentice:'Household page', journeyman:'Estate servant', master:'Steward' },
    desc:'Learn the conduct, accounts, and obligations of a great household.'
  }
};

/* Personal positions and household offices sit beside a character's career
   and the player's station. Earned positions come from events; retainer
   offices are filled by paid named characters in the household network. */
FBDATA.positions = {
  councilman: {
    name:'Town Councilman', icon:'⚖', kind:'earned',
    desc:'A place on the town bench brings commissions, introductions, and a voice in local affairs.',
    fx:{ gold:0.5, enterprise:0.05 }
  },
  sergeant: {
    name:'Sergeant', icon:'🛡', kind:'earned',
    desc:'Drill pay and authority over a small professional core continue while the post is held.',
    fx:{ gold:0.5, retinue:10 }
  },
  steward: {
    name:'Household Steward', icon:'🗝', kind:'retainer', profession:'noble',
    minTier:2, pay:2, quality:2,
    desc:'Keeps accounts, directs servants, and makes the household’s work run more cleanly.',
    fx:{ gold:1, enterprise:0.05 }
  },
  factor: {
    name:'Household Factor', icon:'📒', kind:'retainer', profession:'merchant',
    minTier:1, pay:2, quality:2,
    desc:'Carries the household’s credit and bargains through market and guild connections.',
    fx:{ enterprise:0.08 }
  },
  captain: {
    name:'Household Captain', icon:'⚔', kind:'retainer', profession:'soldier',
    minTier:2, pay:2.5, quality:3, maleOnly:true,
    desc:'Commands sworn armsmen and adds a hard professional edge to the household host.',
    fx:{ retinue:20 }
  },
  tutor: {
    name:'Household Tutor', icon:'📚', kind:'retainer', profession:'monk',
    minTier:1, pay:3, quality:3,
    desc:'A resident learned servant who may be assigned to a child’s lessons without a second fee.',
    fx:{}
  }
};

/* A town councillor may carry one local ordinance at a time. These are
   separate from the royal Council: the saved seat names one county and the
   motion definition supplies only the successful, time-bounded effect. */
FBDATA.localCouncilMotions = {
  fair_measures: {
    name:'Fair Measures', icon:'⚖',
    desc:'Enforced weights and measures increase enterprise income by 10%.',
    fx:{ enterprise:0.10 }
  },
  civic_works: {
    name:'Civic Works', icon:'🧱',
    desc:'Maintained streets, bridges, and stalls bring 1 gold each season.',
    fx:{ gold:1 }
  },
  watch_and_ward: {
    name:'Watch and Ward', icon:'🛡',
    desc:'An organized town watch adds 30 men to the household retinue.',
    fx:{ retinue:30 }
  }
};

/* Service and tenure are deliberately independent. Tax is a true share of
   balance.taxPerDev; levy is a share of balance.levyPerDev. Missing records
   on legacy vassals resolve to customary_service + hereditary in the engine. */
FBDATA.feudalServiceCharters = {
  customary_service: {
    name:'Customary Service', icon:'📜',
    desc:'A balanced settlement of ordinary rents and military service.',
    taxShare:0.20, levyShare:0.15, standingBonus:0,
    breakawayMultiplier:1, extraordinaryTaxExempt:false
  },
  scutage_compact: {
    name:'Scutage Compact', icon:'💰',
    desc:'Cash replaces all ordinary military service.',
    requiresTech:'scutage',
    taxShare:0.30, levyShare:0, standingBonus:0,
    breakawayMultiplier:1, extraordinaryTaxExempt:false
  },
  host_duty: {
    name:'Host Duty', icon:'⚔',
    desc:'Maximum military service brings greater yearly breakaway pressure.',
    taxShare:0.05, levyShare:0.30, standingBonus:0,
    breakawayMultiplier:1.25, extraordinaryTaxExempt:false
  },
  charter_of_liberties: {
    name:'Charter of Liberties', icon:'🕊',
    desc:'Lower dues and legal exemptions buy lasting political security.',
    requiresTech:['customary_law','authenticated_seals'],
    taxShare:0.10, levyShare:0.05, standingBonus:15,
    breakawayMultiplier:0.5, extraordinaryTaxExempt:true
  }
};

/* Childhood instruction. A child's education focus names the subject; one of
   these arrangements names the school and its seasonal fee. Personal masters
   remain actual characters, so their skill and traits matter. */
FBDATA.schooling = {
  charity: {
    name:{
      default:'Parish or charity school',
      muslim:'Maktab or charity school',
      jewish:'Synagogue or charity school'
    },
    icon:'🕯', cost:0.25, chance:0.35, requiresTech:'manuscript_codex',
    desc:'Basic lessons kept within reach of a poor household.'
  },
  merchant: {
    name:'Town merchant’s school', icon:'⚖', cost:1.25, chance:0.6, devMin:2, requiresTech:'arithmetic',
    focuses:['dip','ste','int','lea'],
    desc:'Paid lessons in letters, figures, persuasion, and practical affairs.'
  },
  noble_academy: {
    name:'Noble Academy', icon:'🏛', cost:4, chance:0.75, tierMin:2,
    requiresTech:'scholarly_networks',
    focuses:['dip','mar','ste','int','lea'],
    annualMortality:0.02,
    annualEvents:[
      'academy_patron_notice', 'academy_purse',
      'academy_disputation', 'academy_houses_compete'
    ],
    desc:'A costly education among noble houses, rich in opportunity and harsh in its demands.'
  },
  master: {
    name:'Personal learned master', icon:'🎓', cost:3, requiresTech:'scholarly_networks',
    desc:'A private teacher whose own skill sets the pace of study.'
  }
};

FBDATA.enterprises = {
  field_strip: {
    name:'Leased Field', icon:'🌾', cost:20, profession:'farmer', yield:1.5, requiresTech:'scratch_plough',
    terrains:['farmland','steppe'],
    desc:'Another strip under the plough. It pays only while someone works it.'
  },
  orchard_business: {
    name:'Orchard', icon:'🌳', cost:30, profession:'farmer', yield:2,
    terrains:['farmland','forest','hills'],
    desc:'Fruit trees planted for sale as well as the household table. A household press pays more when it works this harvest.'
  },
  press_business: {
    name:{ default:'Press House', muslim:'Oil Press' }, icon:'🏺', cost:60,
    profession:'farmer', yield:3, devMin:2, requiresTech:'olive_press',
    chainFrom:'orchard_business',
    desc:'Lever-press work for the neighbors’ harvests needs no trees of your own; a producing household orchard in the same county fattens the take.'
  },
  workshop_business: {
    name:'Workshop', icon:'⚒', cost:80, profession:'craftsman', yield:4, devMin:2,
    guildRank:'member', requiresTech:'horizontal_loom', tags:['workshop'],
    desc:'A public bench and your mark above the door. A guild member must staff it.'
  },
  market_stall_business: {
    name:'Market Stall', icon:'⛺', cost:60, profession:'merchant', yield:3.5, devMin:2, requiresTech:'urban_markets', tags:['market'],
    desc:'A fixed place in the market, profitable while a practiced seller tends it.'
  },
  trade_house_business: {
    name:'Trading House', icon:'🏛', cost:150, profession:'merchant', yield:6, devMin:5,
    guildRank:'member', requiresTech:'trade_houses', tags:['trade-house'],
    desc:'Stores, ledgers, and agents gathered beneath one family name.'
  },
  fishing_boat_business: {
    name:'Fishing Boat', icon:'🛶', cost:40, profession:'farmer', yield:2.5, coastal:true, requiresTech:'knarrs',
    desc:'A working boat whose catch is sold beyond the household.'
  }
};

/* Maintained living standards for households at every rank. Costs on a
   level are paid when advancing from the previous level; upkeep is the full
   seasonal cost of the current level, not a sum of earlier levels. */
FBDATA.householdStandards = {
  board: {
    name:'Board', icon:'🍲', kind:'general',
    desc:'Food kept above bare subsistence: fuller stores, broader fare, and rarer seasonings.',
    levels:[
      {
        name:'Full Larder', cost:10, upkeep:0.5, tierMin:0, requiresTech:'warehouses',
        desc:'Reduces yearly household mortality by 0.1 percentage points.',
        fx:{ mortality:0.001 }
      },
      {
        name:'Varied Board', cost:40, upkeep:1.5, tierMin:1, requiresTech:'improved_husbandry',
        desc:'Reduces yearly household mortality by 0.2 percentage points.',
        fx:{ mortality:0.002 }
      },
      {
        name:'Spiced and Imported Table', cost:120, upkeep:4, tierMin:2, requiresTech:'trade_houses',
        desc:'Reduces yearly household mortality by 0.3 percentage points.',
        fx:{ mortality:0.003 }
      }
    ]
  },
  wares: {
    name:'Household wares', icon:'🧺', kind:'general',
    desc:'Bedding, vessels, linens, and furnishings maintained for a more capable home.',
    levels:[
      {
        name:'Good Bedding and Vessels', cost:15, upkeep:0.25, tierMin:0, requiresTech:'wheel_thrown_pottery',
        desc:'Adds 1 percentage point to yearly education chances.',
        fx:{ education:0.01 }
      },
      {
        name:'Chests, Linens and Copperware', cost:50, upkeep:1, tierMin:1, requiresTech:'cooperage',
        desc:'Adds 2.5 percentage points to yearly education chances.',
        fx:{ education:0.025 }
      },
      {
        name:'Painted Furniture and Fine Hangings', cost:150, upkeep:3, tierMin:2, requiresTech:'glazed_pottery',
        desc:'Adds 4 percentage points to yearly education chances.',
        fx:{ education:0.04 }
      }
    ]
  },
  quarters: {
    name:'Quarters', icon:'🏠', kind:'general',
    desc:'Sounder, roomier buildings that shelter the family and make space for service.',
    levels:[
      {
        name:'Sound Roof and Raised Bed', cost:20, upkeep:0.5, tierMin:0, requiresTech:'lime_mortar',
        desc:'Reduces yearly household mortality by 0.05 percentage points.',
        fx:{ mortality:0.0005, retainers:0 }
      },
      {
        name:'Chambered House', cost:75, upkeep:1.5, tierMin:1, requiresTech:'stone_bridgebuilding',
        desc:'Reduces yearly household mortality by 0.1 percentage points and adds room for one retainer.',
        fx:{ mortality:0.001, retainers:1 }
      },
      {
        name:'Hall, Chambers and Outbuildings', cost:250, upkeep:5, tierMin:2, requiresTech:'stone_castles',
        desc:'Reduces yearly household mortality by 0.2 percentage points and adds room for two retainers.',
        fx:{ mortality:0.002, retainers:2 }
      }
    ]
  },
  luxuries: {
    name:'Luxuries', icon:'✨', kind:'general',
    desc:'Visible comfort and display that turn household prosperity into social standing.',
    levels:[
      {
        name:'Sunday Woollens', cost:20, upkeep:0.5, tierMin:0, requiresTech:'warp_weighted_loom',
        desc:'Adds 0.25 prestige each season.',
        fx:{ prestige:0.25 }
      },
      {
        name:'Dyed Cloth and Fur', cost:80, upkeep:2, tierMin:1, requiresTech:'horizontal_loom',
        desc:'Adds 0.75 prestige each season.',
        fx:{ prestige:0.75 }
      },
      {
        name:'Imported Cloth and Silver Plate', cost:250, upkeep:6, tierMin:2, requiresTech:'annual_fairs',
        desc:'Adds 1.5 prestige each season.',
        fx:{ prestige:1.5 }
      }
    ]
  },
  transport: {
    name:'Transport', icon:'🐴', kind:'general',
    desc:'Maintained beasts and vehicles for journeys, distinct from permanent productive livestock.',
    levels:[
      {
        name:'Pack Ass', cost:25, upkeep:0.25, tierMin:1, requiresTech:'pack_saddles',
        desc:'Journey costs are multiplied by 0.85; each county leg takes 3 days.',
        fx:{ travelCost:0.85, travelLegDays:3 }
      },
      {
        name:'Mule and Cart', cost:90, upkeep:1, tierMin:1, requiresTech:'wheeled_carts',
        desc:'Journey costs are multiplied by 0.75; each county leg takes 2 days.',
        fx:{ travelCost:0.75, travelLegDays:2 }
      },
      {
        name:'Riding Horses and Covered Wagon', cost:300, upkeep:4, tierMin:2, requiresTech:'horse_collar',
        desc:'Journey costs are multiplied by 0.60; each county leg takes 1 day.',
        fx:{ travelCost:0.60, travelLegDays:1 }
      }
    ]
  },
  outfit_farmer: {
    name:'Farming outfit', icon:'🌾', kind:'work', profession:'farmer',
    desc:'Maintained husbandry equipment that improves paid farming and family enterprises, but is not saleable property.',
    levels:[
      { name:'Iron-Edged Husbandry Tools', cost:25, upkeep:0.5, tierMin:0, requiresTech:'iron_sickles',
        desc:'Raises farming output by 5%.', fx:{ work:0.05 } },
      { name:'Ox Tackle and Mouldboard Plough', cost:100, upkeep:1.5, tierMin:1, requiresTech:'heavy_plough',
        desc:'Raises farming output by 10%.', fx:{ work:0.10 } },
      { name:'Full Plough Team and Harvest Gear', cost:300, upkeep:4, tierMin:2, requiresTech:'improved_husbandry',
        desc:'Raises farming output by 15%.', fx:{ work:0.15 } }
    ]
  },
  outfit_craftsman: {
    name:'Craft outfit', icon:'🔨', kind:'work', profession:'craftsman',
    desc:'Maintained trade tools that improve paid craft work and workshops, but are not saleable property.',
    levels:[
      { name:'Journeyman’s Tool Chest', cost:25, upkeep:0.5, tierMin:0, requiresTech:'bloomery_iron',
        desc:'Raises craft output by 5%.', fx:{ work:0.05 } },
      { name:'Tempered Guild Tools', cost:100, upkeep:1.5, tierMin:1, requiresTech:'improved_furnaces',
        desc:'Raises craft output by 10%.', fx:{ work:0.10 } },
      { name:'Master’s Instruments and Patterns', cost:300, upkeep:4, tierMin:2, requiresTech:'powered_mills',
        desc:'Raises craft output by 15%.', fx:{ work:0.15 } }
    ]
  },
  outfit_merchant: {
    name:'Merchant outfit', icon:'⚖', kind:'work', profession:'merchant',
    desc:'Maintained commercial equipment that improves paid trade and merchant enterprises, but is not saleable property.',
    levels:[
      { name:'Sealed Weights and Locking Chest', cost:25, upkeep:0.5, tierMin:0, requiresTech:'weights_measures',
        desc:'Raises merchant output by 5%.', fx:{ work:0.05 } },
      { name:'Fine Scales and Merchant’s Ledgers', cost:100, upkeep:1.5, tierMin:1, requiresTech:'commercial_arithmetic',
        desc:'Raises merchant output by 10%.', fx:{ work:0.10 } },
      { name:'Coffers, Bills and Caravan Tackle', cost:300, upkeep:4, tierMin:2, requiresTech:'letters_of_credit',
        desc:'Raises merchant output by 15%.', fx:{ work:0.15 } }
    ]
  },
  outfit_soldier: {
    name:'Soldier’s work outfit', icon:'🛡', kind:'work', profession:'soldier',
    desc:'Maintained service equipment that improves paid military work only; combat still depends on armory equipment and holdings.',
    levels:[
      { name:'Fitted Arms and Field Kit', cost:25, upkeep:0.5, tierMin:0, requiresTech:'iron_weaponry',
        desc:'Raises paid soldiering output by 5%.', fx:{ work:0.05 } },
      { name:'Campaign Harness and Remount', cost:100, upkeep:1.5, tierMin:1, requiresTech:'stirrups',
        desc:'Raises paid soldiering output by 10%.', fx:{ work:0.10 } },
      { name:'Retainer’s Full Harness', cost:300, upkeep:4, tierMin:2, requiresTech:'mail_hauberks',
        desc:'Raises paid soldiering output by 15%.', fx:{ work:0.15 } }
    ]
  },
  outfit_monk: {
    name:'Monastic work outfit', icon:'✒', kind:'work', profession:'monk',
    desc:'Maintained writing equipment that improves a monk’s paid and religious work, but is not saleable property.',
    levels:[
      { name:'Scribe’s Writing Chest', cost:25, upkeep:0.5, tierMin:0, requiresTech:'manuscript_codex',
        desc:'Raises monastic output by 5%.', fx:{ work:0.05 } },
      { name:'Illuminator’s Desk and Pigments', cost:100, upkeep:1.5, tierMin:1, requiresTech:'scriptoria',
        desc:'Raises monastic output by 10%.', fx:{ work:0.10 } },
      { name:'Working Library and Copyist’s Instruments', cost:300, upkeep:4, tierMin:2, requiresTech:'paper_scholarship',
        desc:'Raises monastic output by 15%.', fx:{ work:0.15 } }
    ]
  },
  outfit_priest: {
    name:'Clerical work outfit', icon:'🕯', kind:'work', profession:'priest',
    desc:'Maintained service furnishings that improve a priest’s paid and religious work, but are not saleable property.',
    levels:[
      { name:'Portable Service Chest', cost:25, upkeep:0.5, tierMin:0,
        desc:'Raises clerical output by 5%.', fx:{ work:0.05 } },
      { name:'Vestments, Vessels and Service Books', cost:100, upkeep:1.5, tierMin:1,
        desc:'Raises clerical output by 10%.', fx:{ work:0.10 } },
      { name:'Complete Liturgical Treasury', cost:300, upkeep:4, tierMin:2,
        desc:'Raises clerical output by 15%.', fx:{ work:0.15 } }
    ]
  },
  outfit_noble: {
    name:'Estate-service outfit', icon:'🏡', kind:'work', profession:'noble',
    desc:'Maintained estate records and instruments that improve paid household administration, but are not saleable property.',
    levels:[
      { name:'Steward’s Account Chest', cost:25, upkeep:0.5, tierMin:0,
        desc:'Raises estate-service output by 5%.', fx:{ work:0.05 } },
      { name:'Survey Rolls and Seal Press', cost:100, upkeep:1.5, tierMin:1,
        desc:'Raises estate-service output by 10%.', fx:{ work:0.10 } },
      { name:'Estate Office and Muniments Chest', cost:300, upkeep:4, tierMin:2,
        desc:'Raises estate-service output by 15%.', fx:{ work:0.15 } }
    ]
  }
};

/* Persistent serf tenure archetypes (tier 0 households).
   Core game data: deterministic selectors match bookmark, household identity,
   permanent-home environment, settlement, and starting development. */
FBDATA.tenureArchetypes = {
  latin_manorial: {
    id: 'latin_manorial',
    priority: 300,
    name: 'Manorial customary tenure',
    desc: 'A cottage and household strips held by custom in return for work and local dues.',
    nameKey: 'tenure_archetype_latin_manorial_name',
    summaryKey: 'tenure_archetype_latin_manorial_summary',
    workLabel: 'Tend strips and serve the demesne',
    workDescription: 'Work the household strips and meet the labor owed on the lord’s demesne.',
    workLabelKey: 'tenure_work_latin_manorial_label',
    workDescriptionKey: 'tenure_work_latin_manorial_desc',
    selector: {
      faithAncestor: 'catholic',
      traditionsAny: ['west_european', 'celtic', 'romance'],
      terrainAny: ['farmland', 'forest', 'hills', 'mountains'],
      settlementKindsAny: ['village', 'town']
    },
    duties: [
      { id: 'week_work', eventId: 'serf_weekwork_tally', firstDue: { season: 'spring', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'demesne_harvest', eventId: 'serf_boon_harvest', firstDue: { season: 'autumn', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'tithe_sheaf', eventId: 'serf_tithe_sheaf', firstDue: { season: 'winter', day: 30, cycle: 1 }, intervalTurns: 720 },
      { id: 'local_facility_due', firstDue: { season: 'summer', day: 30, cycle: 1 }, intervalTurns: 720 }
    ],
    contextSlots: [
      {
        id: 'local_facility_due',
        cases: [
          { terrainAny: ['forest', 'hills'], eventId: 'serf_pannage_due' },
          { settlementKindsAny: ['village'], eventId: 'serf_common_oven' }
        ],
        fallback: 'serf_mill_multure'
      }
    ],
    conditionalDuties: [
      { id: 'marriage_leave', eventId: 'serf_marriage_leave' },
      { id: 'officers_quartered', eventId: 'serf_officers_quartered' }
    ],
    rights: [
      { terrainAny: ['forest', 'hills', 'mountains'], rightId: 'deadwood_after_frost' },
      { terrainAny: ['farmland'], rightId: 'gleaning_after_harvest' }
    ],
    transitionTerms: { commutableDuties: ['week_work'] }
  },
  irrigated_fellah: {
    id: 'irrigated_fellah',
    priority: 300,
    name: 'Irrigated fellah tenure',
    desc: 'Household fields held through village custom, with shared waterwork and crop obligations.',
    nameKey: 'tenure_archetype_irrigated_fellah_name',
    summaryKey: 'tenure_archetype_irrigated_fellah_summary',
    workLabel: 'Tend fields and waterworks',
    workDescription: 'Work the household fields and maintain the shared water on which they depend.',
    workLabelKey: 'tenure_work_irrigated_fellah_label',
    workDescriptionKey: 'tenure_work_irrigated_fellah_desc',
    selector: {
      faithAncestor: 'muslim',
      traditionsAny: ['middle_eastern', 'african', 'romance'],
      terrainAny: ['farmland', 'marsh'],
      minDev0: 4
    },
    duties: [
      { id: 'irrigation_labor', eventId: 'serf_weekwork_tally', firstDue: { season: 'spring', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'crop_share', eventId: 'serf_boon_harvest', firstDue: { season: 'autumn', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'waterworks_cartage', eventId: 'serf_bridge_cartage', firstDue: { season: 'summer', day: 30, cycle: 1 }, intervalTurns: 720 },
      { id: 'mill_share', eventId: 'serf_mill_multure', firstDue: { season: 'winter', day: 30, cycle: 1 }, intervalTurns: 720 }
    ],
    contextSlots: [],
    conditionalDuties: [
      { id: 'officers_quartered', eventId: 'serf_officers_quartered' }
    ],
    rights: ['irrigation_turn'],
    transitionTerms: { commutableDuties: ['irrigation_labor'] }
  },
  norse_coastal_service: {
    id: 'norse_coastal_service',
    priority: 550,
    name: 'Coastal household-service tenure',
    desc: 'A dependent household place held through shore work, boat service, and seasonal dues.',
    nameKey: 'tenure_archetype_norse_coastal_service_name',
    summaryKey: 'tenure_archetype_norse_coastal_service_summary',
    workLabel: 'Work shore, boats, and transport',
    workDescription: 'Labor for the household through boats, shore work, and local transport.',
    workLabelKey: 'tenure_work_norse_coastal_service_label',
    workDescriptionKey: 'tenure_work_norse_coastal_service_desc',
    selector: {
      bookmarksAny: ['867', '1066'],
      culturesAny: ['norse'],
      faithAncestor: 'pagan',
      coastal: true,
      terrainAny: ['farmland', 'forest', 'hills', 'marsh'],
      settlementKindsAny: ['village', 'town']
    },
    duties: [
      { id: 'boat_service', eventId: 'serf_weekwork_tally', firstDue: { season: 'spring', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'seasonal_catch_share', eventId: 'serf_boon_harvest', firstDue: { season: 'autumn', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'shore_transport', eventId: 'serf_bridge_cartage', firstDue: { season: 'summer', day: 30, cycle: 1 }, intervalTurns: 720 }
    ],
    contextSlots: [],
    conditionalDuties: [
      { id: 'officers_quartered', eventId: 'serf_officers_quartered' }
    ],
    rights: ['customary_shore_landing'],
    transitionTerms: {
      commutableDuties: ['boat_service'],
      additionalDuty: {
        id:'authority_boat_service', eventId:'serf_weekwork_tally',
        firstDueSeason:'spring', intervalTurns:1440
      }
    }
  },
  pastoral_steppe: {
    id: 'pastoral_steppe',
    priority: 500,
    name: 'Pastoral dependent tenure',
    desc: 'A household place among the herds, held through pasture custom and seasonal service.',
    nameKey: 'tenure_archetype_pastoral_steppe_name',
    summaryKey: 'tenure_archetype_pastoral_steppe_summary',
    workLabel: 'Tend the household herds',
    workDescription: 'Keep the herds, pasture, and seasonal service that sustain the household.',
    workLabelKey: 'tenure_work_pastoral_steppe_label',
    workDescriptionKey: 'tenure_work_pastoral_steppe_desc',
    selector: {
      bookmarksAny: ['867', '1066'],
      faithAncestor: 'pagan',
      traditionsAny: ['steppe'],
      terrainAny: ['steppe'],
      settlementKindsAny: ['village'],
      dev0Max: 3
    },
    duties: [
      { id: 'herd_service', eventId: 'serf_weekwork_tally', firstDue: { season: 'spring', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'pasture_due', eventId: 'serf_pannage_due', firstDue: { season: 'autumn', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'seasonal_drove', eventId: 'serf_bridge_cartage', firstDue: { season: 'summer', day: 30, cycle: 1 }, intervalTurns: 720 }
    ],
    contextSlots: [],
    conditionalDuties: [
      { id: 'officers_quartered', eventId: 'serf_officers_quartered' }
    ],
    rights: ['customary_grazing_turn'],
    transitionTerms: {
      commutableDuties: ['herd_service'],
      additionalDuty: {
        id:'authority_herd_due', eventId:'serf_pannage_due',
        firstDueSeason:'autumn', intervalTurns:1440
      }
    }
  },
  woodland_dependence: {
    id: 'woodland_dependence',
    priority: 450,
    name: 'Woodland customary tenure',
    desc: 'A household clearing held through woodland labor, seasonal dues, and limited customary use.',
    nameKey: 'tenure_archetype_woodland_dependence_name',
    summaryKey: 'tenure_archetype_woodland_dependence_summary',
    workLabel: 'Work woodland and clearings',
    workDescription: 'Tend the clearing and meet the woodland labor owed by the household.',
    workLabelKey: 'tenure_work_woodland_dependence_label',
    workDescriptionKey: 'tenure_work_woodland_dependence_desc',
    selector: {
      bookmarksAny: ['867', '1066'],
      faithAncestor: 'pagan',
      traditionsAny: ['slavic_baltic', 'uralic'],
      terrainAny: ['forest'],
      settlementKindsAny: ['village'],
      dev0Max: 3
    },
    duties: [
      { id: 'woodland_service', eventId: 'serf_weekwork_tally', firstDue: { season: 'spring', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'mast_due', eventId: 'serf_pannage_due', firstDue: { season: 'autumn', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'timber_cartage', eventId: 'serf_bridge_cartage', firstDue: { season: 'summer', day: 30, cycle: 1 }, intervalTurns: 720 },
      { id: 'deadwood_due', eventId: 'serf_deadwood_amerced', firstDue: { season: 'winter', day: 30, cycle: 1 }, intervalTurns: 720 }
    ],
    contextSlots: [],
    conditionalDuties: [
      { id: 'officers_quartered', eventId: 'serf_officers_quartered' }
    ],
    rights: ['storm_fallen_wood', 'seasonal_common_grazing'],
    transitionTerms: { commutableDuties: ['woodland_service'] }
  },
  pagan_household_service: {
    id: 'pagan_household_service',
    priority: 300,
    name: 'Household-service tenure',
    desc: 'A dwelling and subsistence use held under the authority of a master’s household.',
    nameKey: 'tenure_archetype_pagan_household_service_name',
    summaryKey: 'tenure_archetype_pagan_household_service_summary',
    workLabel: 'Serve the master’s household',
    workDescription: 'Labor within the master’s household and its dependent fields.',
    workLabelKey: 'tenure_work_pagan_household_service_label',
    workDescriptionKey: 'tenure_work_pagan_household_service_desc',
    selector: {
      faithAncestor: 'pagan',
      traditionsAny: ['west_european', 'slavic_baltic', 'uralic'],
      terrainAny: ['farmland', 'forest', 'hills', 'mountains']
    },
    duties: [
      { id: 'household_service', eventId: 'serf_weekwork_tally', firstDue: { season: 'spring', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'masters_harvest', eventId: 'serf_boon_harvest', firstDue: { season: 'autumn', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'local_heavy_service', intervalTurns: 720 }
    ],
    contextSlots: [
      {
        id: 'local_heavy_service',
        cases: [
          { terrainAny: ['forest', 'hills', 'mountains'], eventId: 'serf_deadwood_amerced', firstDue: { season: 'winter', day: 30, cycle: 1 } },
          { terrainAny: ['farmland'], eventId: 'serf_bridge_cartage', firstDue: { season: 'summer', day: 30, cycle: 1 } }
        ],
        fallback: 'serf_deadwood_amerced',
        fallbackFirstDue: { season: 'winter', day: 30, cycle: 1 }
      }
    ],
    conditionalDuties: [
      { id: 'officers_quartered', eventId: 'serf_officers_quartered' }
    ],
    rights: [],
    transitionTerms: {
      commutableDuties: ['household_service'],
      additionalDuty: {
        id:'authority_cartage', eventId:'serf_bridge_cartage',
        firstDueSeason:'summer', intervalTurns:1440
      }
    }
  },
  dependent_farming: {
    id: 'dependent_farming',
    priority: 0,
    name: 'Dependent farming tenure',
    desc: 'A household holding used by local custom in return for labor and seasonal service.',
    nameKey: 'tenure_archetype_dependent_farming_name',
    summaryKey: 'tenure_archetype_dependent_farming_summary',
    workLabel: 'Work the household holding',
    workDescription: 'Work the customary holding and meet its seasonal service.',
    workLabelKey: 'tenure_work_dependent_farming_label',
    workDescriptionKey: 'tenure_work_dependent_farming_desc',
    selector: {},
    duties: [
      { id: 'customary_labor', eventId: 'serf_weekwork_tally', firstDue: { season: 'spring', day: 30, cycle: 0 }, intervalTurns: 720 },
      { id: 'seasonal_harvest', eventId: 'serf_boon_harvest', firstDue: { season: 'autumn', day: 30, cycle: 1 }, intervalTurns: 720 }
    ],
    contextSlots: [],
    conditionalDuties: [
      { id: 'officers_quartered', eventId: 'serf_officers_quartered' }
    ],
    rights: [],
    transitionTerms: {
      commutableDuties: ['customary_labor'],
      additionalDuty: {
        id:'authority_cartage', eventId:'serf_bridge_cartage',
        firstDueSeason:'summer', intervalTurns:1440
      }
    }
  }
};

FBDATA.tenureDuties = {
  week_work: { name: 'Week-work tally', desc: 'Customary unfree labor owed on demesne land each week.' },
  demesne_harvest: { name: 'Boon harvest', desc: 'Additional seasonal harvest service on the lord’s demesne.' },
  tithe_sheaf: { name: 'Tithe sheaf', desc: 'A tenth part of grain and livestock owed to the parish church.' },
  local_facility_due: { name: 'Local facility due', desc: 'Customary toll or service owed for using estate facilities such as the mill, oven, or woods.' },
  irrigation_labor: { name: 'Irrigation maintenance', desc: 'Labor owed to clean canals and maintain shared water channels.' },
  crop_share: { name: 'Crop-share delivery', desc: 'Customary seasonal share of field harvest delivered to the estate.' },
  waterworks_cartage: { name: 'Waterworks cartage', desc: 'Carting timber, stone, and silt for communal irrigation channels and bridges.' },
  mill_share: { name: 'Mill multure', desc: 'Customary share of ground grain owed for using the estate mill.' },
  household_service: { name: 'Household service', desc: 'Subsistence labor and household tasks owed under the authority of the master.' },
  masters_harvest: { name: 'Master’s harvest', desc: 'Mandatory harvest labor on the master’s fields before household harvesting.' },
  local_heavy_service: { name: 'Heavy service due', desc: 'Mandatory heavy labor and cartage obligations owed to the master.' },
  customary_labor: { name: 'Customary labor', desc: 'Seasonal manual service owed to the local authority under customary tenure.' },
  seasonal_harvest: { name: 'Seasonal harvest', desc: 'Mandatory field harvest assistance rendered under local custom.' },
  marriage_leave: { name: 'Marriage leave', desc: 'Customary dues and leave owed to the lord upon household marriage.' },
  officers_quartered: { name: 'Billeting and quartering', desc: 'Customary obligation to shelter and supply armed retainers during wartime.' },
  pannage_due: { name: 'Pannage due', desc: 'Customary toll paid for foraging swine in estate woodlands.' },
  common_oven: { name: 'Common oven due', desc: 'Customary toll owed for baking household loaves at the communal oven.' },
  deadwood_amerced: { name: 'Wood gathering due', desc: 'Amercement or service owed for taking gathered timber from woodland.' },
  bridge_cartage: { name: 'Bridge cartage', desc: 'Customary transport service for hauling bridge and roadway materials.' },
  herd_service: { name: 'Herd service', desc: 'A customary work turn tending animals under local authority.' },
  pasture_due: { name: 'Pasture due', desc: 'A customary share or service owed for the household’s assigned pasture use.' },
  seasonal_drove: { name: 'Seasonal drove', desc: 'Seasonal labor moving animals or supplies under local authority.' },
  woodland_service: { name: 'Woodland service', desc: 'Customary labor maintaining clearings and working woodland resources.' },
  mast_due: { name: 'Woodland mast due', desc: 'A customary share or service owed for seasonal woodland grazing.' },
  timber_cartage: { name: 'Timber cartage', desc: 'Customary transport labor hauling timber or woodland supplies.' },
  deadwood_due: { name: 'Deadwood boundary due', desc: 'A customary dispute or service concerning limited collection of fallen wood.' },
  boat_service: { name: 'Boat service', desc: 'A customary work turn repairing, loading, or rowing boats under local authority.' },
  seasonal_catch_share: { name: 'Seasonal catch share', desc: 'A customary share or labor demand tied to the season’s shore catch.' },
  shore_transport: { name: 'Shore transport', desc: 'Customary boat, landing, or shore carriage labor.' },
  authority_cartage: { name: 'Authority cartage', desc: 'Additional cartage imposed when a new authority reviews the household custom.' },
  authority_herd_due: { name: 'Authority herd due', desc: 'Additional herd service imposed when a new authority reviews the household custom.' },
  authority_boat_service: { name: 'Authority boat service', desc: 'Additional boat service imposed when a new authority reviews the household custom.' }
};

FBDATA.tenureRights = {
  deadwood_after_frost: { name: 'Deadwood gathering', desc: 'Customary right to collect fallen branches and deadwood for household fuel after frost.' },
  gleaning_after_harvest: { name: 'Post-harvest gleaning', desc: 'Customary right to glean remaining grain heads from harvested fields.' },
  irrigation_turn: { name: 'Irrigation turn', desc: 'Recognized customary rotational turn to draw water from shared irrigation channels.' },
  customary_grazing_turn: { name: 'Assigned grazing turn', desc: 'Limited customary access to an assigned grazing turn or area under local authority.' },
  storm_fallen_wood: { name: 'Storm-fallen wood', desc: 'Limited customary collection of wood brought down by storms.' },
  seasonal_common_grazing: { name: 'Seasonal common grazing', desc: 'Limited seasonal use of an assigned common grazing area.' },
  customary_shore_landing: { name: 'Customary shore landing', desc: 'Limited customary use of an assigned landing place for household work.' }
};

/* Bounded auctions remain generally available at a suitable market. Each lot
   family owns its selection weight and any extra national prerequisite, so a
   mod can change one family without gating the auction deed itself. */
FBDATA.auctionLotTypes = {
  item:{ weight:6 },
  enterprise:{ weight:3 },
  claim:{ weight:1, requiresTech:'notarial_contracts' }
};

/* Coin & Credit contracts. These are deliberately exact-term contracts, not
   annual percentage rates: markup is fixed when the agreement is signed and
   term is measured in 90-day seasons. Display names live in the UI so faith-
   appropriate complete phrases can be selected without putting grammar here. */
FBDATA.finance = {
  pledge: {
    maxPrincipal:40, markup:0.25, termSeasons:4, collateralRatio:0.60,
    lender:'moneychanger', defaultKind:'collateral', requiresTech:'standardized_coinage'
  },
  merchant: {
    maxPrincipal:100, markup:0.18, termSeasons:6,
    lender:'merchant_house', defaultKind:'revenue', requiresTech:'notarial_contracts'
  },
  revenue: {
    maxPrincipal:500, markup:0.15, termSeasons:8,
    lender:'lombard_house', defaultKind:'revenue', requiresTech:'exchequer_accounts'
  },
  tradePartnership: {
    termSeasons:4, risk:0.25, profitShare:0.45, requiresTech:'sea_loans'
  },
  tradeVenture: {
    stakes:[10,20,50],
    activeLimit:1,
    minDevelopment:4,
    timing:{ minimumDays:90, preparationDays:30 },
    outcomes:{
      cautious:[
        { below:0.10, outcome:'loss', multiplier:0 },
        { below:0.30, outcome:'partial', multiplier:0.75 },
        { below:0.95, outcome:'profit', multiplier:1.25 },
        { outcome:'exceptional', multiplier:1.60 }
      ],
      bold:[
        { below:0.25, outcome:'loss', multiplier:0 },
        { below:0.40, outcome:'partial', multiplier:0.50 },
        { below:0.93, outcome:'profit', multiplier:1.70 },
        { outcome:'exceptional', multiplier:2.75 }
      ]
    },
    modifiers:{
      stewardshipDivisor:200,
      guildDivisor:2,
      tradeHouse:0.03,
      householdBonusCap:0.20,
      destinationDevelopmentDivisor:100,
      destinationDevelopmentCap:0.08,
      routeRiskPerLeg:0.006,
      routeRiskCap:0.12
    },
    returnCargo:{
      ladingFeeRate:0.10,
      cautiousMultiplier:1.20,
      boldSuccessMultiplier:2.25,
      boldFailureMultiplier:0.35
    }
  }
};
