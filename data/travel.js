/* Fallowborn — moddable overland travel purposes and authored destinations. */
window.FBDATA = window.FBDATA || {};

FBDATA.travelPurposes = {
  alexander_visit_1241:{ name:'Visit Novgorod', icon:'🧭',
    desc:'Make a personal visit. Your household remains at home, and the city’s public offices remain with their present holders.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true, eras:['high_medieval'], yearMin:1241, yearMax:1241 },
  hungarian_visit_1241:{ name:'Visit another Hungarian county', icon:'🧭',
    desc:'Go ahead alone to look for local opportunities. Your household and property remain at home during the visit.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true, eras:['high_medieval'], yearMin:1241, yearMax:1241 },
  volhynian_visit_1241:{ name:'Visit Lutsk', icon:'🧭',
    desc:'Go ahead alone to look for local opportunities. The household keeps its home until a later eligible settlement.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true, eras:['high_medieval'], yearMin:1241, yearMax:1250 },
  ravenna_visit_568:{ name:'Visit Bononia', icon:'🧭',
    desc:'Go ahead alone to look for local opportunities. Your household keeps its home until a later eligible settlement.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true, eras:['late_antique'], yearMin:568, yearMax:580 },
  soldier_crossing_711:{ name:'Seek opportunities across the strait', icon:'🧭',
    desc:'Make a personal journey toward Malaga or Toledo. Your household stays at home, and work keeps its ordinary requirements.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true, eras:['early_medieval'], yearMin:711, yearMax:718 },
  thegn_south_1066:{ name:'Seek work in London', icon:'🧭', desc:'Go ahead alone to seek ordinary local opportunities. Your household remains at home.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true, eras:['high_medieval'], yearMin:1066, yearMax:1066 },
  constantinople_resettlement_1204: {
    name:'Seek a foothold at Nicaea', icon:'🧭', desc:'Go ahead alone and seek a later household move through ordinary residence and local work.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true, eras:['high_medieval'], yearMin:1204, yearMax:1225
  },
  toledo_refuge_711: {
    name:'Seek refuge in the northern uplands', icon:'🧭',
    desc:'Go ahead alone to seek a foothold for a later household move. The road and its destination promise no protection.',
    cost:5, minTier:1, maxTier:2, mode:'sites', repeatable:true,
    eras:['early_medieval'], yearMin:711, yearMax:730
  },
  tournament: {
    name:'Scheduled games', icon:'🏆', desc:'Travel to a funded gathering, with the return journey reserved.',
    cost:0, minTier:1, maxTier:7, targeted:true, repeatable:true
  },
  pilgrimage: {
    name:'Pilgrimage',
    icon:'🕯',
    desc:'Visit a holy place of your faith and return with a pilgrim’s standing.',
    cost:5,
    maxTier:7,
    mode:'sites'
  },
  trade: {
    name:'Trade venture',
    icon:'⚖',
    desc:'Choose a stake and developed market, then dispatch the venture or accompany it.',
    cost:10,
    stake:10,
    mode:'developed',
    minDev:4
  },
  study: {
    name:'Study or apprenticeship',
    icon:'📚',
    desc:'Seek instruction in one of the great learned or urban centers.',
    cost:8,
    maxTier:7,
    mode:'sites'
  },
  service: {
    name:'Paid service',
    icon:'🛡',
    desc:'Offer your hands and talents at the court of a living realm.',
    cost:0,
    mode:'capitals'
  },
  expedition: {
    name:'Adventuring expedition',
    icon:'🗺',
    desc:'Journey beyond your own people to see foreign lands and return with discoveries worth the road.',
    cost:12,
    minTier:1,
    maxTier:7,
    mode:'foreign'
  },
  frontier: {
    name:'Withdraw into the wastes',
    icon:'⛺',
    desc:'Leave settled life for an empty frontier beside a reachable county, endure a year of survival and work, and raise a permanent homestead — never a title.',
    cost:10,
    minTier:1,
    maxTier:2,
    mode:'frontier',
    repeatable:true
  },
  relationship: {
    name:'Relationship visit',
    icon:'🤝',
    desc:'Visit a named character and cultivate the relationship in person.',
    cost:0,
    maxTier:7,
    targeted:true,
    repeatable:true
  }
};

/* A site may restrict a purpose to exact religions or broad religion groups.
   Province ids are stable save/mod ids from data/counties.js. */
FBDATA.travelSites = [
  { id:'alexander_novgorod_1241', purpose:'alexander_visit_1241', provinceId:'novgorod' },
  { id:'hungarian_bratislava_1241', purpose:'hungarian_visit_1241', provinceId:'bratislava' },
  { id:'volodymyr_lutsk_1241', purpose:'volhynian_visit_1241', provinceId:'lutsk' },
  { id:'ravenna_bononia_568', purpose:'ravenna_visit_568', provinceId:'bologna' },
  { id:'soldier_malaga_711', purpose:'soldier_crossing_711', provinceId:'malaga' },
  { id:'soldier_toledo_711', purpose:'soldier_crossing_711', provinceId:'toledo' },
  { id:'thegn_london_1066', purpose:'thegn_south_1066', provinceId:'london' },
  { id:'constantinople_nicaea_1204', purpose:'constantinople_resettlement_1204', provinceId:'nicaea' },
  { id:'toledo_northern_refuge_711', purpose:'toledo_refuge_711', provinceId:'oviedo' },
  { id:'pilgrim_roma', purpose:'pilgrimage', provinceId:'roma',
    religions:['catholic'] },
  { id:'pilgrim_santiago', purpose:'pilgrimage', provinceId:'santiago',
    religions:['catholic'] },
  { id:'pilgrim_jerusalem_christian', purpose:'pilgrimage', provinceId:'jerusalem',
    religionGroups:['christian'] },
  { id:'pilgrim_constantinople', purpose:'pilgrimage', provinceId:'constantinople',
    religions:['orthodox','eastern'] },
  { id:'pilgrim_mecca', purpose:'pilgrimage', provinceId:'mecca',
    religionGroups:['muslim'] },
  { id:'pilgrim_medina', purpose:'pilgrimage', provinceId:'medina',
    religionGroups:['muslim'] },
  { id:'pilgrim_jerusalem_muslim', purpose:'pilgrimage', provinceId:'jerusalem',
    religionGroups:['muslim'] },
  { id:'pilgrim_jerusalem_jewish', purpose:'pilgrimage', provinceId:'jerusalem',
    religionGroups:['jewish'] },
  { id:'pilgrim_uppsala', purpose:'pilgrimage', provinceId:'uppsala',
    religions:['norse_pagan'] },
  { id:'pilgrim_kiev', purpose:'pilgrimage', provinceId:'kiev',
    religions:['slavic_pagan'] },
  { id:'pilgrim_novgorod', purpose:'pilgrimage', provinceId:'novgorod',
    religions:['slavic_pagan'] },
  { id:'pilgrim_plock', purpose:'pilgrimage', provinceId:'plock',
    religions:['slavic_pagan'] },
  { id:'pilgrim_vilnius', purpose:'pilgrimage', provinceId:'vilnius',
    religions:['baltic_pagan'] },
  { id:'pilgrim_sambia', purpose:'pilgrimage', provinceId:'sambia',
    religions:['baltic_pagan'] },
  { id:'pilgrim_bolghar', purpose:'pilgrimage', provinceId:'bolghar',
    religions:['tengri'] },
  { id:'pilgrim_etelkoz', purpose:'pilgrimage', provinceId:'etelkoz',
    religions:['tengri'] },
  { id:'pilgrim_sarkel', purpose:'pilgrimage', provinceId:'sarkel',
    religions:['tengri'] },

  { id:'study_constantinople', purpose:'study', provinceId:'constantinople' },
  { id:'study_baghdad', purpose:'study', provinceId:'baghdad' },
  { id:'study_cordoba', purpose:'study', provinceId:'cordoba' },
  { id:'study_roma', purpose:'study', provinceId:'roma' },
  { id:'study_paris', purpose:'study', provinceId:'paris' },
  { id:'study_aachen', purpose:'study', provinceId:'aachen' },
  { id:'study_pavia', purpose:'study', provinceId:'pavia' },
  { id:'study_fustat', purpose:'study', provinceId:'fustat' },
  { id:'study_kairouan', purpose:'study', provinceId:'kairouan' },
  { id:'study_bukhara', purpose:'study', provinceId:'bukhara' },
  { id:'study_samarkand', purpose:'study', provinceId:'samarkand' }
];

FBDATA.balance.travelLegDays = 3;
FBDATA.balance.travelCooldownDays = 360;
FBDATA.balance.travelCultureEventCap = 3;
FBDATA.balance.travelRoadEventCap = 4;
FBDATA.balance.travelMinStayDays = 90;
FBDATA.balance.travelWorkEventMinDays = 55;
FBDATA.balance.travelWorkEventMaxDays = 85;
FBDATA.balance.travelSettleOfferDays = 360;
FBDATA.balance.travelSettleWorkEvents = 4;
/* Mercenary contracts grow out of paid-service journeys: a soldier arriving
   at a warring realm's capital may sign on for a fixed term of seasons. */
FBDATA.balance.travelExpeditionMaxDestinations = 40;
FBDATA.balance.mercContractSeasons = 4;
FBDATA.balance.mercContractSeasonPay = 6;
FBDATA.balance.mercContractCompletionGold = 20;
FBDATA.balance.mercContractAbandonStanding = -8;
/* The frontier withdrawal (mode:'frontier'): the destination is a wasteland
   reached through one settled gateway county, and permanent settlement needs
   the ordinary one-year residence plus this many successful frontier-work
   milestones. A completed homestead grants this many starter land plots at the
   new county's head settlement. */
FBDATA.balance.frontierMilestonesRequired = 4;
FBDATA.balance.frontierSettlementPlots = 1;

/* Mechanical roles and event references are independent of authored purpose ids. */
FBDATA.travelRules = {
  alexander_visit_1241:{ kind:'expedition', encounters:'expedition', arrivalEvent:'alexander_visit_arrival_1241' },
  hungarian_visit_1241:{ kind:'expedition', encounters:'expedition', arrivalEvent:'hungarian_visit_arrival_1241' },
  volhynian_visit_1241:{ kind:'expedition', encounters:'volhynian_visit_1241', arrivalEvent:'volhynian_visit_arrival_1241' },
  ravenna_visit_568:{ kind:'expedition', encounters:'ravenna_visit_568', arrivalEvent:'ravenna_bononia_arrival_568' },
  soldier_crossing_711:{ kind:'expedition', encounters:'expedition', arrivalEvent:'soldier_arrival_711' },
  thegn_south_1066:{ kind:'service', encounters:'service', arrivalEvent:'thegn_london_arrival_1066' },
  constantinople_resettlement_1204: {
    kind:'service', encounters:'service', arrivalEvent:'household_nicaea_arrival_1204'
  },
  toledo_refuge_711: {
    kind:'service', encounters:'service', arrivalEvent:'toledo_refuge_arrival_711'
  },
  "tournament": {
    "kind": "tournament",
    "encounters": "tournament"
  },
  "pilgrimage": {
    "kind": "pilgrimage",
    "encounters": "pilgrimage",
    "arrivalEvent": "travel_capstone_pilgrimage"
  },
  "trade": {
    "kind": "trade",
    "encounters": "trade",
    "arrivalEvent": "travel_capstone_trade"
  },
  "study": {
    "kind": "study",
    "encounters": "study",
    "arrivalEvent": "travel_capstone_study"
  },
  "service": {
    "kind": "service",
    "encounters": "service",
    "arrivalEvent": "travel_capstone_service"
  },
  "expedition": {
    "kind": "expedition",
    "encounters": "expedition",
    "arrivalEvent": "travel_capstone_expedition"
  },
  "frontier": {
    "kind": "frontier",
    "encounters": "frontier",
    "arrivalEvent": "travel_capstone_frontier"
  },
  "relationship": {
    "kind": "relationship",
    "encounters": "relationship",
    "arrivalEvent": "travel_capstone_relationship"
  }
};
FBDATA.travelDefaults = { trade:"trade", relationship:"relationship", tournament:"tournament" };
