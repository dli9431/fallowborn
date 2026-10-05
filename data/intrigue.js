/* Fallowborn — hostile intrigue definitions. The engine treats the optional
   fields here as extensions of the ordinary plot schema; old definitions and
   active legacy plots remain valid. */
window.FBDATA = window.FBDATA || {};
FBDATA.plots = FBDATA.plots || {};

FBDATA.justiceSentences = {
    release:{ name:'Release', desc:'End custody without pardoning unresolved offenses.', kind:'pardon', closesCase:false, level:0, penalty:0 },
    pardon:{ name:'Pardon and release', desc:'Forgive all unresolved offenses before this court and end custody.', kind:'pardon', forgive:true, level:0, penalty:0 },
    ransom:{ name:'Accept ransom and release', desc:'Accept the available portion of the captive’s ransom and release them without pardoning unresolved offenses.', kind:'ransom', closesCase:false, level:0, penalty:0, money:true },
    fine:{ name:'Fine or compensation', desc:'Take the available portion of the assessed fine and release the prisoner.', kind:'fine', level:1, penalty:10, money:true },
    penance:{ name:'Public penance', desc:'Lose 40 piety and 20 prestige, then go free.', kind:'penance', pietyCost:40, prestigeCost:20, level:1, penalty:10 },
    imprisonment:{ name:'Imprisonment', desc:'Serve one year, with time already spent in custody credited. An extension requires a new justification.', kind:'custody', termDays:360, extensionWindow:90, level:2, penalty:20 },
    exile:{ name:'Exile', desc:'Lose local titles and offices and leave the domain for five years.', kind:'exile', level:2, penalty:30, exile:true },
    forfeiture:{ name:'Forfeiture', desc:'Surrender titles and lands within the sentencing ruler’s authority, then go free.', kind:'forfeiture', level:3, penalty:35, forfeit:true },
    monastic_exile:{ name:'Monastic exile', desc:'Lose local titles and offices, enter monastic life, and leave the domain for five years.', kind:'exile', careerRole:'cloister', level:2, penalty:30, exile:true },
    blinding_deposition:{ name:'Blinding and deposition', desc:'Suffer permanent injury and be removed from current rule, then go free.', kind:'corporal', level:3, penalty:45, maim:true },
    diya:{ name:'Diya', desc:'Accept the available blood compensation for a proven killing and release the prisoner.', kind:'fine', level:1, penalty:10, money:true },
    qisas:{ name:'Qisas', desc:'Execute a prisoner convicted of a killing.', kind:'death', level:3, penalty:60, kill:true },
    execution:{ name:'Execution', desc:'Put the prisoner to death. Their succession follows the ordinary inheritance rules.', kind:'death', level:3, penalty:60, kill:true }
};

/* Sentence entries may narrow the common severity rule to a particular cause.
   Ordered AI lists are preferences, always filtered through the live projection. */
FBDATA.legalTraditions = {
  latin:{ name:'Latin law',
    sentences:['release','pardon','ransom','fine','penance','imprisonment','exile','forfeiture','execution'],
    procedures:{ arrest:true, hearing:true, ransom:true, pardon:true, compensationMaxSeverity:2, penanceMaxSeverity:2 },
    justification:{ evidence:['testimony','material','redhanded'] },
    ai:{ minor:['fine'], serious:['imprisonment'], severe:['execution'], arbitrary:['imprisonment'], excessive:['execution'] } },
  byzantine:{ name:'Byzantine law',
    sentences:['release','pardon','ransom','fine','imprisonment','exile','forfeiture','monastic_exile','blinding_deposition','execution'],
    procedures:{ arrest:true, hearing:true, ransom:true, pardon:true, compensationMaxSeverity:2, penanceMaxSeverity:0 },
    justification:{ evidence:['testimony','material','redhanded'] },
    ai:{ minor:['fine'], serious:['imprisonment'], severe:['blinding_deposition'], arbitrary:['imprisonment'], excessive:['execution'] } },
  muslim:{ name:'Islamic law',
    sentences:['release','pardon','ransom','fine','imprisonment','exile','forfeiture','diya','qisas','execution'],
    procedures:{ arrest:true, hearing:true, ransom:true, pardon:true, compensationMaxSeverity:3, penanceMaxSeverity:0 },
    justification:{ evidence:['testimony','material','redhanded'],
      sentences:{ diya:{ offenseKinds:['assassination'], successful:true }, qisas:{ offenseKinds:['assassination'], successful:true } } },
    ai:{ minor:['fine'], serious:['imprisonment'], severe:['qisas','execution'], arbitrary:['imprisonment'], excessive:['execution'] } },
  customary:{ name:'Customary law',
    sentences:['release','pardon','ransom','fine','imprisonment','exile','forfeiture','execution'],
    procedures:{ arrest:true, hearing:true, ransom:true, pardon:true, compensationMaxSeverity:3, penanceMaxSeverity:0 },
    justification:{ evidence:['testimony','material','redhanded'] },
    ai:{ minor:['fine'], serious:['imprisonment'], severe:['execution'], arbitrary:['imprisonment'], excessive:['execution'] } }
};

/* Period legal practice, without later Byzantine deposition penalties.
   Personal jurisdiction is a bounded abstraction, not a later code backdated. */
FBDATA.legalTraditions.late_roman = Object.assign({}, FBDATA.legalTraditions.customary, {
  name:'Late Roman law',
  procedures:Object.assign({}, FBDATA.legalTraditions.customary.procedures, { compensationMaxSeverity:2 })
});
FBDATA.legalTraditions.gothic_custom = Object.assign({}, FBDATA.legalTraditions.customary, {
  name:'Gothic custom',
  jurisdiction:{ cultures:{ roman:'late_roman', iberian:'late_roman', greek:'late_roman',
    gothic:'gothic_custom' }, mixed:'gothic_custom', assessor:'late_roman' }
});

Object.assign(FBDATA.legalTraditions, FBDATA.bookmarkRegions476.africa.legalTraditions);

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
