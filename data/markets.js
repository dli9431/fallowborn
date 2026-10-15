/* =========================================================================
   Fallowborn — county commodity markets and historical endowments.

   The five goods are broad mechanical baskets, not literal inventories.
   Endowments name durable regional advantages. They are authored by stable
   county/duchy id and never rolled; temporary scarcity belongs in saved
   market shocks. Historical rationale and sources: docs/designs/markets.md.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.marketGoods = {
  provisions:{ name:'Provisions', icon:'🍞', order:0,
    desc:'Grain, fish, livestock products, oil, and ordinary drink.' },
  wares:{ name:'Wares', icon:'🧺', order:1,
    desc:'Cloth, pottery, leatherwork, vessels, and household furnishings.' },
  materials:{ name:'Materials', icon:'⚒', order:2,
    desc:'Timber, worked metal, stone, lime, and construction supplies.' },
  transport:{ name:'Transport', icon:'🐴', order:3,
    desc:'Draft animals, remounts, carts, barrels, rope, and carriage.' },
  luxuries:{ name:'Luxuries', icon:'✨', order:4,
    desc:'Fine cloth, wine, spices, plate, pigments, and prestigious imports.' }
};

FBDATA.marketEndowmentTypes = {
  grain:{
    name:'Grain country', icon:'🌾', production:{ provisions:0.25 },
    desc:'Deep arable soils and established grain husbandry raise local provisions.'
  },
  pastoral:{
    name:'Pastoral economy', icon:'🐑',
    production:{ provisions:0.15, transport:0.20 },
    desc:'Herding supplies meat, dairy, hides, draft animals, and pack stock.'
  },
  fisheries:{
    name:'Fisheries', icon:'🐟', production:{ provisions:0.20 },
    desc:'Durable coastal, river, or lake fisheries enlarge the food supply.'
  },
  wine_oil:{
    name:'Wine and oil country', icon:'🏺',
    production:{ provisions:0.10, luxuries:0.20 },
    desc:'Mediterranean vines and olives supply ordinary calories and valued exports.'
  },
  wool_textiles:{
    name:'Wool and textiles', icon:'🧶', production:{ wares:0.25 },
    desc:'Pasture, spinning, weaving, dyeing, and finishing sustain a textile advantage.'
  },
  timber:{
    name:'Timber country', icon:'🌲',
    production:{ materials:0.25, transport:0.10 },
    desc:'Managed woodland supplies construction timber, fuel, carts, ships, and barrels.'
  },
  metalworking:{
    name:'Metalworking resources', icon:'⛏', production:{ materials:0.25 },
    desc:'Accessible ores, fuel, and established smithing raise the supply of worked metal.'
  },
  horse_breeding:{
    name:'Horse-breeding country', icon:'🐎', production:{ transport:0.30 },
    desc:'Open grazing and established breeding supply remounts, pack animals, and draft power.'
  },
  salt_trade:{
    name:'Salt trade', icon:'◇', production:{ provisions:0.10 },
    flow:{ provisions:0.15 },
    desc:'Salterns or brine works preserve food and make provisions easier to move.'
  },
  luxury_entrepot:{
    name:'Luxury entrepôt', icon:'⚓', flow:{ luxuries:0.30 },
    desc:'A long-distance exchange center distributes valuable imports without creating them locally.'
  }
};

/* Duchies provide broad regional defaults. County records add exceptional
   local tags and may suppress a duchy tag where the physical county differs
   from its surrounding region. */
FBDATA.marketEndowments = {
  duchies:{
    ile:['grain'],
    normandy:['grain','fisheries'],
    champagne:['grain','wine_oil'],
    flanders:['grain','wool_textiles'],
    brittany:['pastoral','fisheries'],
    aquitaine:['grain','wine_oil'],
    burgundy:['wine_oil','timber'],
    provence:['wine_oil','fisheries'],
    frisia:['pastoral','fisheries','wool_textiles'],
    saxony:['grain','timber','metalworking'],
    bavaria:['pastoral','timber','metalworking'],
    bohemia:['grain','timber','metalworking'],
    silesia:['grain','metalworking'],
    transylvania:['pastoral','metalworking','salt_trade'],
    lombardy:['grain','wool_textiles'],
    verona:['grain','wine_oil'],
    veneto:['grain','wine_oil'],
    emilia:['grain','pastoral'],
    tuscany:['wine_oil','wool_textiles'],
    apulia:['grain','wine_oil'],
    calabria:['wine_oil','pastoral'],
    sicily:['grain','wine_oil'],
    sardinia:['pastoral','metalworking','salt_trade'],
    wessex:['grain','wool_textiles'],
    east_anglia:['grain','wool_textiles'],
    york:['grain','pastoral','wool_textiles'],
    gwynedd:['pastoral','metalworking'],
    alba:['pastoral','fisheries'],
    munster:['pastoral','fisheries'],
    svealand:['timber','metalworking','fisheries'],
    gotaland:['timber','pastoral'],
    gotland:['pastoral','fisheries'],
    jylland:['grain','pastoral','fisheries'],
    scania:['grain','fisheries'],
    novgorod:['timber','fisheries'],
    kiev:['grain','pastoral'],
    etelkoz:['pastoral','horse_breeding'],
    itel:['pastoral','horse_breeding','fisheries'],
    bulgar:['pastoral','horse_breeding'],
    thrace:['grain','wine_oil'],
    hellas:['wine_oil','fisheries'],
    peloponnese:['wine_oil'],
    crete:['wine_oil','fisheries'],
    thrakesion:['grain','wine_oil'],
    cappadocia:['pastoral','horse_breeding'],
    cilicia:['grain','wine_oil'],
    sevilla:['grain','wine_oil','horse_breeding'],
    granada:['wine_oil','pastoral'],
    valencia:['grain','wine_oil'],
    tunis:['grain','wine_oil'],
    fes:['pastoral','wine_oil'],
    sijilmasa:['pastoral','horse_breeding','salt_trade'],
    delta:['grain','fisheries'],
    cairo:['grain'],
    fayyum:['grain'],
    upper_egypt:['grain'],
    damascus:['grain','wine_oil','wool_textiles'],
    aleppo:['grain','pastoral','wool_textiles'],
    antioch:['grain','wine_oil'],
    mosul:['grain','pastoral','wool_textiles'],
    baghdad:['grain','wool_textiles'],
    kufa:['grain','pastoral'],
    basra:['grain','fisheries'],
    hejaz:['pastoral','horse_breeding'],
    najd:['pastoral','horse_breeding'],
    sanaa:['grain','wine_oil'],
    aden:['pastoral','fisheries'],
    oman:['pastoral','fisheries','horse_breeding'],
    isfahan:['grain','wool_textiles'],
    fars:['grain','pastoral','wine_oil'],
    kerman:['pastoral','wool_textiles'],
    merv:['pastoral','horse_breeding','wool_textiles'],
    herat:['grain','pastoral','wool_textiles'],
    transoxiana:['grain','horse_breeding','wool_textiles'],
    tabaristan:['grain','timber'],
    sindh:['grain','wool_textiles'],
    axum:['grain','pastoral']
  },
  counties:{
    bruges:{ add:['fisheries','luxury_entrepot'] },
    ghent:{ add:['luxury_entrepot'] },
    london:{ add:['luxury_entrepot'] },
    york:{ add:['luxury_entrepot'] },
    genoa:{ add:['fisheries','luxury_entrepot'] },
    venezia:{ suppress:['grain'], add:['salt_trade','luxury_entrepot'] },
    palermo:{ add:['luxury_entrepot'] },
    constantinople:{ add:['wool_textiles','luxury_entrepot'] },
    thessaloniki:{ add:['luxury_entrepot'] },
    tunis:{ add:['luxury_entrepot'] },
    tangier:{ add:['luxury_entrepot'] },
    sijilmasa:{ add:['luxury_entrepot'] },
    alexandria:{ add:['luxury_entrepot'] },
    fustat:{ add:['wool_textiles','luxury_entrepot'] },
    damascus:{ add:['luxury_entrepot'] },
    aleppo:{ add:['luxury_entrepot'] },
    antioch:{ add:['luxury_entrepot'] },
    baghdad:{ add:['luxury_entrepot'] },
    basra:{ add:['luxury_entrepot'] },
    mecca:{ add:['luxury_entrepot'] },
    aden:{ add:['luxury_entrepot'] },
    hormuz:{ add:['luxury_entrepot'] },
    novgorod:{ add:['luxury_entrepot'] },
    visby:{ add:['luxury_entrepot'] },
    bremen:{ add:['luxury_entrepot'] },
    salzburg:{ add:['salt_trade'] },
    krakow:{ add:['salt_trade'] },
    cordoba:{ add:['wool_textiles','luxury_entrepot'] },
    toledo:{ add:['wool_textiles','metalworking'] },
    samarkand:{ add:['luxury_entrepot'] },
    bukhara:{ add:['luxury_entrepot'] },
    merv:{ add:['luxury_entrepot'] }
  }
};

/* Market simulation tunables. Units are deliberately broad: one stock unit
   is a season-sized share of a county basket, not a literal bushel or horse. */
FBDATA.balance.marketReserveSeasons = 2;
FBDATA.balance.marketFoodPeoplePerUnit = 40;
FBDATA.balance.marketFoodSpoilage = 0.05;
FBDATA.balance.marketFoodExcessSpoilage = 0.20;
FBDATA.balance.marketArmyPressureMinMen = 2500;
FBDATA.balance.marketArmyPressureRegionalMen = 10000;
FBDATA.balance.marketArmyPressureDecay = 0.80;
FBDATA.balance.marketFlowPasses = 2;
FBDATA.balance.marketEdgeCapacity = 12;
FBDATA.balance.marketStockScale = 12;
FBDATA.balance.marketProductionBonusCap = 0.40;
FBDATA.balance.marketPriceSeasonMove = 0.20;
FBDATA.balance.marketPriceNormalMin = 0.75;
FBDATA.balance.marketPriceNormalMax = 1.50;
FBDATA.balance.marketPriceCrisisMin = 0.50;
FBDATA.balance.marketPriceCrisisMax = 2.50;
FBDATA.balance.marketHardshipMortalityStep = 0.005;
FBDATA.balance.marketHardshipMortalityCap = 0.02;
FBDATA.balance.marketCorridorCapacityBonus = 0.25;
FBDATA.balance.marketCorridorReturnBonus = 0.10;

/* Core tangible definitions carry their baskets. Mods loaded later remain
   untagged unless their author opts in, and therefore keep multiplier 1. */
(function () {
  var enterpriseBaskets = {
    field_strip:{ materials:0.45, transport:0.35, provisions:0.20 },
    orchard_business:{ materials:0.55, transport:0.25, provisions:0.20 },
    press_business:{ materials:0.65, transport:0.25, wares:0.10 },
    workshop_business:{ materials:0.70, wares:0.20, transport:0.10 },
    market_stall_business:{ materials:0.35, wares:0.55, transport:0.10 },
    trade_house_business:{ materials:0.50, wares:0.25, transport:0.25 },
    fishing_boat_business:{ materials:0.55, transport:0.35, wares:0.10 }
  };
  for (var enterpriseId in enterpriseBaskets) {
    if (FBDATA.enterprises[enterpriseId]) {
      FBDATA.enterprises[enterpriseId].marketBasket = enterpriseBaskets[enterpriseId];
    }
  }
  var standardBaskets = {
    board:{ provisions:0.85, luxuries:0.15 },
    wares:{ wares:0.80, materials:0.20 },
    quarters:{ materials:0.80, wares:0.10, transport:0.10 },
    luxuries:{ luxuries:0.75, wares:0.25 },
    transport:{ transport:0.80, materials:0.20 },
    outfit_farmer:{ materials:0.55, transport:0.30, wares:0.15 },
    outfit_craftsman:{ materials:0.75, wares:0.25 },
    outfit_merchant:{ wares:0.45, transport:0.35, materials:0.20 },
    outfit_soldier:{ materials:0.65, wares:0.20, transport:0.15 },
    outfit_monk:{ wares:0.55, luxuries:0.25, materials:0.20 },
    outfit_priest:{ wares:0.45, luxuries:0.35, materials:0.20 },
    outfit_noble:{ wares:0.50, luxuries:0.25, materials:0.25 }
  };
  for (var standardId in standardBaskets) {
    if (FBDATA.householdStandards[standardId]) {
      FBDATA.householdStandards[standardId].marketBasket = standardBaskets[standardId];
    }
  }
  for (var buildingId in (FBDATA.buildings || {})) {
    var building = FBDATA.buildings[buildingId];
    if (!building.fort) building.marketBasket = {
      materials:0.72, transport:0.18, wares:0.10
    };
  }
  for (var holdingId in (FBDATA.holdings || {})) {
    FBDATA.holdings[holdingId].marketBasket = {
      materials:0.55, transport:0.25, wares:0.20
    };
  }
  for (var itemId in (FBDATA.items || {})) {
    FBDATA.items[itemId].marketBasket = {
      materials:0.50, wares:0.35, luxuries:0.15
    };
  }
})();

/* Raid bonuses take the strongest local endowment in each basket. */
FBDATA.marketRaidYields = {
  grain:{ provisions:12 }, pastoral:{ provisions:12, transport:6 }, fisheries:{ provisions:12 },
  wine_oil:{ gold:20, luxuries:1 }, wool_textiles:{ wares:8 }, timber:{ materials:10 },
  metalworking:{ materials:10 }, horse_breeding:{ transport:6 }, luxury_entrepot:{ gold:20, luxuries:1 }
};
