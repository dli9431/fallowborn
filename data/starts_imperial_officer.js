FB.bookmarkSources.stage({source:'data/starts_imperial_officer.js',bookmarks:['476'],catalogs:[],shared:[]}, function (FBDATA) {
  FBDATA.startScenarios_imperial_officer = [
    {id:'court_service_household_476',bookmarkIds:['476'],alwaysUnlocked:true,
      birthplaces:{realms:['croatia']},startCulture:'roman',startReligion:'nicene',startAge:26,
      name:'Court service household',desc:'Seek a real commission from the Dalmatian court. Command and public business depend on its declared mandate; your household keeps its own purse.',
      tier:1,sex:'m',profession:'soldier',gold:35,prestige:25,piety:0,
      startEffects:{skills:{mar:3}},familyPresets:{standard:{name:'Free household',diff:'age 26 · court service'}},tracks:[],
      intro:'You are {name}, a free soldier at {province}. Offices & Legitimacy in Deeds shows available commissions. Seek a court service mandate when a real host is available. Its powers, court favor, finite term and dismissal response are reviewed before you act. No office gives your household land or the public treasury.'}
  ];
  Array.prototype.push.apply(FBDATA.startScenarios,FBDATA.startScenarios_imperial_officer);
  var world = FBDATA.bookmarks['476'];
  [world].concat(Object.keys(world.revisions || {}).map(function (id) { return world.revisions[id]; })).forEach(function (def) {
    if (def.starts && def.starts.indexOf('court_service_household_476') < 0) def.starts.push('court_service_household_476');
  });
});
