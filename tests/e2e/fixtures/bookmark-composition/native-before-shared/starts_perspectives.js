/* Additional household livelihoods retain the ordinary resident-community picker. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_perspectives = [
  { id:'constantinople_merchant_household_1204', bookmarkIds:['1204'], alwaysUnlocked:true,
    fixedProvinceId:'constantinople', startCulture:'italian', startReligion:'catholic',
    name:'Harbor Merchant Household',
    desc:'Begin with a modest purse and a trading livelihood in Constantinople. Choose a resident community and find customers after the sack.',
    tier:1, profession:'merchant', gold:15, prestige:5, piety:0,
    familyPresets:{ established:{}, standard:{} },
    tracks:['constantinople_merchant_track_1204'],
    trackLocations:{ constantinople_merchant_track_1204:['constantinople'] },
    intro:'You are {name}, a merchant of {province}. Households need supplies and the harbor needs customers. Your family must decide where to trade, how much to keep in reserve and whether to remain in the city.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_perspectives);
