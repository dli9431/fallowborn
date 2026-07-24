/* =========================================================================
   Fallowborn — livelihoods: careers, apprenticeship, guilds, enterprises.
   Display fields are localized by id; simulation fields stay locale-neutral.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.careers = {
  farmer: {
    name:'Farming', icon:'🌾', skill:'ste', apprenticeAge:10, apprenticeCost:0,
    wage:1.2, masterWage:2,
    ranks:{ apprentice:'Farm servant', journeyman:'Farmer', master:'Master farmer' },
    desc:'Fields, herds, orchards, and the patient arithmetic of the seasons.'
  },
  craftsman: {
    name:'Craft', icon:'🔨', skill:'ste', apprenticeAge:10, apprenticeCost:8, tierMin:1,
    wage:1.8, masterWage:3, guild:true,
    ranks:{ apprentice:'Apprentice', journeyman:'Journeyman', master:'Master craftsman' },
    desc:'Learn a skilled trade, earn a mark, and one day keep a bench of your own.'
  },
  merchant: {
    name:'Trade', icon:'⚖', skill:'ste', apprenticeAge:12, apprenticeCost:10, tierMin:1,
    wage:2, masterWage:3.5, guild:true,
    ranks:{ apprentice:'Merchant’s clerk', journeyman:'Peddler', master:'Merchant' },
    desc:'Weights, ledgers, roads, and the trust that lets silver travel.'
  },
  soldier: {
    name:'Soldiering', icon:'🛡', skill:'mar', apprenticeAge:14, apprenticeCost:0, tierMin:1,
    wage:1.5, masterWage:2.5, maleOnly:true,
    ranks:{ apprentice:'Garrison page', journeyman:'Man-at-arms', master:'Veteran retainer' },
    desc:'Drill, guard duty, and paid service beneath another person’s banner.'
  },
  monk: {
    name:'Letters & Faith', icon:'✒', skill:'lea', apprenticeAge:10, apprenticeCost:5, tierMin:1,
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
    icon:'🕯', cost:0.25, chance:0.35,
    desc:'Basic lessons kept within reach of a poor household.'
  },
  merchant: {
    name:'Town merchant’s school', icon:'⚖', cost:1.25, chance:0.6, devMin:2,
    focuses:['dip','ste','int','lea'],
    desc:'Paid lessons in letters, figures, persuasion, and practical affairs.'
  },
  master: {
    name:'Personal learned master', icon:'🎓', cost:3,
    desc:'A private teacher whose own skill sets the pace of study.'
  }
};

FBDATA.enterprises = {
  field_strip: {
    name:'Leased Field', icon:'🌾', cost:20, profession:'farmer', yield:1.5,
    terrains:['farmland','steppe'],
    desc:'Another strip under the plough. It pays only while someone works it.'
  },
  orchard_business: {
    name:'Orchard', icon:'🌳', cost:30, profession:'farmer', yield:2,
    terrains:['farmland','forest','hills'],
    desc:'Fruit trees planted for sale as well as the household table.'
  },
  press_business: {
    name:{ default:'Press House', muslim:'Oil Press' }, icon:'🏺', cost:60,
    profession:'farmer', yield:3, devMin:2,
    desc:'A press worked for neighbors as well as the family’s own harvest.'
  },
  workshop_business: {
    name:'Workshop', icon:'⚒', cost:80, profession:'craftsman', yield:4, devMin:2,
    guildRank:'member',
    desc:'A public bench and your mark above the door. A guild member must staff it.'
  },
  market_stall_business: {
    name:'Market Stall', icon:'⛺', cost:60, profession:'merchant', yield:3.5, devMin:2,
    desc:'A fixed place in the market, profitable while a practiced seller tends it.'
  },
  trade_house_business: {
    name:'Trading House', icon:'🏛', cost:150, profession:'merchant', yield:6, devMin:5,
    guildRank:'member',
    desc:'Stores, ledgers, and agents gathered beneath one family name.'
  },
  fishing_boat_business: {
    name:'Fishing Boat', icon:'🛶', cost:40, profession:'farmer', yield:2.5, coastal:true,
    desc:'A working boat whose catch is sold beyond the household.'
  }
};

/* Coin & Credit contracts. These are deliberately exact-term contracts, not
   annual percentage rates: markup is fixed when the agreement is signed and
   term is measured in 90-day seasons. Display names live in the UI so faith-
   appropriate complete phrases can be selected without putting grammar here. */
FBDATA.finance = {
  pledge: {
    maxPrincipal:40, markup:0.25, termSeasons:4, collateralRatio:0.60,
    lender:'moneychanger', defaultKind:'collateral'
  },
  merchant: {
    maxPrincipal:100, markup:0.18, termSeasons:6,
    lender:'merchant_house', defaultKind:'revenue'
  },
  revenue: {
    maxPrincipal:500, markup:0.15, termSeasons:8,
    lender:'lombard_house', defaultKind:'revenue'
  },
  tradePartnership: {
    termSeasons:4, risk:0.25, profitShare:0.45
  }
};
