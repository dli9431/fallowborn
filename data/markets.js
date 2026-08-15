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
  materials:{ name:'Materials', icon:'🪵', order:2,
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
    d_ile:['grain'],
    d_normandy:['grain','fisheries'],
    d_champagne:['grain','wine_oil'],
    d_flanders:['grain','wool_textiles'],
    d_brittany:['pastoral','fisheries'],
    d_aquitaine:['grain','wine_oil'],
    d_burgundy:['wine_oil','timber'],
    d_provence:['wine_oil','fisheries'],
    d_frisia:['pastoral','fisheries','wool_textiles'],
    d_saxony:['grain','timber','metalworking'],
    d_bavaria:['pastoral','timber','metalworking'],
    d_bohemia:['grain','timber','metalworking'],
    d_silesia:['grain','metalworking'],
    d_transylvania:['pastoral','metalworking','salt_trade'],
    d_lombardy:['grain','wool_textiles'],
    d_verona:['grain','wine_oil'],
    d_veneto:['grain','wine_oil'],
    d_emilia:['grain','pastoral'],
    d_tuscany:['wine_oil','wool_textiles'],
    d_apulia:['grain','wine_oil'],
    d_calabria:['wine_oil','pastoral'],
    d_sicily:['grain','wine_oil'],
    d_sardinia:['pastoral','metalworking','salt_trade'],
    d_wessex:['grain','wool_textiles'],
    d_east_anglia:['grain','wool_textiles'],
    d_york:['grain','pastoral','wool_textiles'],
    d_gwynedd:['pastoral','metalworking'],
    d_alba:['pastoral','fisheries'],
    d_munster:['pastoral','fisheries'],
    d_svealand:['timber','metalworking','fisheries'],
    d_gotaland:['timber','pastoral'],
    d_gotland:['pastoral','fisheries'],
    d_jylland:['grain','pastoral','fisheries'],
    d_scania:['grain','fisheries'],
    d_novgorod:['timber','fisheries'],
    d_kiev:['grain','pastoral'],
    d_etelkoz:['pastoral','horse_breeding'],
    d_itel:['pastoral','horse_breeding','fisheries'],
    d_bulgar:['pastoral','horse_breeding'],
    d_thrace:['grain','wine_oil'],
    d_hellas:['wine_oil','fisheries'],
    d_peloponnese:['wine_oil'],
    d_crete:['wine_oil','fisheries'],
    d_thrakesion:['grain','wine_oil'],
    d_cappadocia:['pastoral','horse_breeding'],
    d_cilicia:['grain','wine_oil'],
    d_sevilla:['grain','wine_oil','horse_breeding'],
    d_granada:['wine_oil','pastoral'],
    d_valencia:['grain','wine_oil'],
    d_tunis:['grain','wine_oil'],
    d_fes:['pastoral','wine_oil'],
    d_sijilmasa:['pastoral','horse_breeding','salt_trade'],
    d_delta:['grain','fisheries'],
    d_cairo:['grain'],
    d_fayyum:['grain'],
    d_upper_egypt:['grain'],
    d_damascus:['grain','wine_oil','wool_textiles'],
    d_aleppo:['grain','pastoral','wool_textiles'],
    d_antioch:['grain','wine_oil'],
    d_mosul:['grain','pastoral','wool_textiles'],
    d_baghdad:['grain','wool_textiles'],
    d_kufa:['grain','pastoral'],
    d_basra:['grain','fisheries'],
    d_hejaz:['pastoral','horse_breeding'],
    d_najd:['pastoral','horse_breeding'],
    d_sanaa:['grain','wine_oil'],
    d_aden:['pastoral','fisheries'],
    d_oman:['pastoral','fisheries','horse_breeding'],
    d_isfahan:['grain','wool_textiles'],
    d_fars:['grain','pastoral','wine_oil'],
    d_kerman:['pastoral','wool_textiles'],
    d_merv:['pastoral','horse_breeding','wool_textiles'],
    d_herat:['grain','pastoral','wool_textiles'],
    d_transoxiana:['grain','horse_breeding','wool_textiles'],
    d_tabaristan:['grain','timber'],
    d_sindh:['grain','wool_textiles'],
    d_axum:['grain','pastoral']
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
