/* Map-chosen ordinary roles for the Spring 568 world. */
FBDATA.startScenarios_568 = [
  {id:'farmer_568',bookmarkIds:['568'],alwaysUnlocked:true,
    name:'Free Farming Household',
    desc:'A free household with a small plot in the late antique world.',
    tier:1,profession:'farmer',gold:20,prestige:5,piety:0,
    startEffects:{landPlots:1},
    intro:'You are {name}, a free farmer of {province}. Fields, neighbors and family shape your days while distant courts bargain and fight.'},
  {id:'craftsman_568',bookmarkIds:['568'],alwaysUnlocked:true,
    name:'Artisan’s Apprentice',
    desc:'Learn a skilled trade among the households of a late antique settlement.',
    tier:1,profession:'craftsman',gold:15,prestige:5,piety:0,
    intro:'You are {name}, learning a craft in {province}. Work, household ties and the local market offer a place to begin your family’s story.'}
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_568);
