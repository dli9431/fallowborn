/* Fallowborn — moddable overland travel purposes and authored destinations. */
window.FBDATA = window.FBDATA || {};

FBDATA.travelPurposes = {
  pilgrimage: {
    name:'Pilgrimage',
    icon:'🕯',
    desc:'Visit a holy place of your faith and return with a pilgrim’s standing.',
    cost:5,
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
    mode:'sites'
  },
  service: {
    name:'Paid service',
    icon:'🛡',
    desc:'Offer your hands and talents at the court of a living realm.',
    cost:0,
    mode:'capitals'
  }
};

/* A site may restrict a purpose to exact religions or broad religion groups.
   Province ids are stable save/mod ids from data/counties.js. */
FBDATA.travelSites = [
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
