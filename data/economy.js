/* =========================================================================
   Fallowborn — livelihoods: careers, apprenticeship, guilds, enterprises.
   Display fields are localized by id; simulation fields stay locale-neutral.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

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
    desc:'Learn a skilled trade, earn a mark, and one day keep a bench of your own.'
  },
  merchant: {
    name:'Trade', icon:'⚖', skill:'ste', apprenticeAge:12, apprenticeCost:10, tierMin:1, requiresTech:'weights_measures',
    wage:2, masterWage:3.5, guild:true,
    ranks:{ apprentice:'Merchant’s clerk', journeyman:'Peddler', master:'Merchant' },
    desc:'Weights, ledgers, roads, and the trust that lets silver travel.'
  },
  administration: {
    name:'Administration', icon:'📜', skill:'ste', apprenticeAge:12, apprenticeCost:10,
    tierMin:1, requiresTech:'royal_chancery', wage:2, masterWage:3.5,
    ranks:{ apprentice:'Apprentice Clerk', journeyman:'Clerk', master:'Bailiff' },
    desc:'Charters, accounts, judgments, and the written machinery of rule.'
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
    name:'Orchard', icon:'🌳', cost:30, profession:'farmer', yield:2, requiresTech:'seed_selection',
    terrains:['farmland','forest','hills'],
    desc:'Fruit trees planted for sale as well as the household table.'
  },
  press_business: {
    name:{ default:'Press House', muslim:'Oil Press' }, icon:'🏺', cost:60,
    profession:'farmer', yield:3, devMin:2, requiresTech:'olive_press',
    desc:'A press worked for neighbors as well as the family’s own harvest.'
  },
  workshop_business: {
    name:'Workshop', icon:'⚒', cost:80, profession:'craftsman', yield:4, devMin:2,
    guildRank:'member', requiresTech:'horizontal_loom',
    desc:'A public bench and your mark above the door. A guild member must staff it.'
  },
  market_stall_business: {
    name:'Market Stall', icon:'⛺', cost:60, profession:'merchant', yield:3.5, devMin:2, requiresTech:'urban_markets',
    desc:'A fixed place in the market, profitable while a practiced seller tends it.'
  },
  trade_house_business: {
    name:'Trading House', icon:'🏛', cost:150, profession:'merchant', yield:6, devMin:5,
    guildRank:'member', requiresTech:'trade_houses',
    desc:'Stores, ledgers, and agents gathered beneath one family name.'
  },
  fishing_boat_business: {
    name:'Fishing Boat', icon:'🛶', cost:40, profession:'farmer', yield:2.5, coastal:true, requiresTech:'knarrs',
    desc:'A working boat whose catch is sold beyond the household.'
  }
};

/* Optional maintained living standards for commoner households. Costs on a
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
    }
  }
};
