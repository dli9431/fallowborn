/* Fallowborn — hostile intrigue definitions. The engine treats the optional
   fields here as extensions of the ordinary plot schema; old definitions and
   active legacy plots remain valid. */
window.FBDATA = window.FBDATA || {};
FBDATA.plots = FBDATA.plots || {};

FBDATA.intrigue = {
  maxAiSchemes:6,
  aiStartsPerYear:2,
  aiPlayerFacingPerYear:1,
  aiActorCooldownYears:4,
  leverageDays:720,
  captiveRansoms:[5, 10, 20, 40, 80],
  methodProfiles:{
    careful:{ progress:0.8, success:0.10, discovery:-4 },
    bought_access:{ progress:1.2, success:0.05, discovery:0,
      stationCost:true },
    forceful:{ progress:1.5, success:-0.05, discovery:10, martial:true }
  }
};

FBDATA.plots.assassination = {
  name:'Assassination', icon:'🗡', need:16,
  desc:'Arrange a death inside your sovereign realm.',
  hostile:true, scope:'character_same_sovereign', offense:'attempted_murder',
  target:'intrigue_character', accomplice:true, outcome:'death', baseChance:0.20,
  methods:[
    { id:'careful', name:'Poison', profile:'careful' },
    { id:'bought', name:'Staged Accident', profile:'bought_access' },
    { id:'forceful', name:'Ambush', profile:'forceful' }
  ]
};

FBDATA.plots.abduction = {
  name:'Abduction', icon:'⛓', need:14,
  desc:'Seize one person and hold them in secret captivity.',
  hostile:true, scope:'character_same_sovereign', offense:'abduction',
  target:'intrigue_character', accomplice:true, outcome:'captive', baseChance:0.25,
  methods:[
    { id:'careful', name:'False Summons', profile:'careful' },
    { id:'bought', name:'Bribed Guards', profile:'bought_access' },
    { id:'forceful', name:'Road Seizure', profile:'forceful' }
  ]
};

FBDATA.plots.blackmail = {
  name:'Blackmail', icon:'✉', need:12,
  desc:'Gather exact leverage over a person with something to lose.',
  hostile:true, scope:'character_same_sovereign', offense:'blackmail',
  target:'intrigue_character', accomplice:true, outcome:'leverage', baseChance:0.35,
  methods:[
    { id:'careful', name:'Stolen Letters', profile:'careful' },
    { id:'bought', name:'Bribed Servant', profile:'bought_access' },
    { id:'forceful', name:'Close Surveillance', profile:'forceful' }
  ]
};

FBDATA.plots.fabricated_charge = {
  name:'Fabricated Charge', icon:'📜', need:14,
  desc:'Manufacture a case against a political foothold.',
  hostile:true, scope:'character_same_sovereign', offense:'false_charge',
  target:'intrigue_character', accomplice:true, outcome:'foothold', baseChance:0.30,
  methods:[
    { id:'careful', name:'Forged Record', profile:'careful' },
    { id:'bought', name:'Suborned Witnesses', profile:'bought_access' },
    { id:'forceful', name:'Planted Evidence', profile:'forceful' }
  ]
};

FBDATA.plots.sabotage = {
  name:'Sabotage', icon:'🔥', need:10,
  desc:'Damage a county at home or immediately across a sovereign border.',
  hostile:true, scope:'county_or_adjacent_foreign_border', offense:'sabotage',
  target:'intrigue_county', accomplice:true, outcome:'covert_sabotage', baseChance:0.35,
  methods:[
    { id:'careful', name:'Corrupt Stores', profile:'careful' },
    { id:'bought', name:'Bribe Workers', profile:'bought_access' },
    { id:'forceful', name:'Night Arson', profile:'forceful' }
  ]
};

/* Old version-3 lives can finish this plot. New setup uses Assassination. */
if (FBDATA.plots.widow_veil) FBDATA.plots.widow_veil.hidden = true;
