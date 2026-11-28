FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_1241.js","bookmarks":["1241"],"catalogs":["settlementLayouts"],"shared":[]}, function (FBDATA) {
/* Existing people and costless personal reviews; ordinary government owns effects. */
window.FBDATA = window.FBDATA || {};

FBDATA.royalCourts_1241 = {
  hungary_1241:{ dynasty:'Arpad', spouseId:'maria', rulerSiblingIds:['coloman'], members:[
    { id:'maria', name:'Maria Laskarina', sex:'f', born:1206, culture:'greek', religion:'catholic', spouseId:'ruler' },
    { id:'stephen', name:'Stephen', sex:'m', born:1239, culture:'magyar', religion:'catholic', fatherId:'ruler', motherId:'maria' },
    { id:'coloman', name:'Coloman', sex:'m', born:1208, culture:'magyar', religion:'catholic', homeProvinceId:'zagreb', siblingIds:['ruler'], spouseId:null }
  ] },
  vladimir_1241:{ dynasty:'Rurikid', spouseId:'feodosia', members:[
    { id:'feodosia', name:'Feodosia', sex:'f', born:1200, culture:'rus', religion:'orthodox', spouseId:'ruler', homeProvinceId:'rostov' },
    { id:'alexander', name:'Alexander Yaroslavich', sex:'m', born:1221, culture:'rus', religion:'orthodox', fatherId:'ruler', motherId:'feodosia', spouseId:'alexander_wife', homeProvinceId:'rostov' },
    { id:'andrei', name:'Andrei Yaroslavich', sex:'m', born:1222, culture:'rus', religion:'orthodox', fatherId:'ruler', motherId:'feodosia', spouseId:null },
    { id:'alexander_wife', name:'Daughter of Bryachislav', sex:'f', born:1222, culture:'rus', religion:'orthodox', spouseId:'alexander', homeProvinceId:'rostov' }
  ] }
};

FBDATA.rulerAgendas_1241 = {
  bela_agenda_1241:{ id:'bela_agenda_1241', type:'ruler_agenda', subjectRealmId:'hungary_1241',
    title:'Bela: court and preparation', intro:'You are king of Hungary in spring 1241. Batu’s Mongols are already through the Carpathian passes, and your lords blame the Cumans you took in. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'bela_accounts', name:'The royal treasury', year:1241, season:0,
        text:'For years you have taken back crown lands your father gave away, and many lords resent it. Your treasury must now carry the defense of Hungary.', choices:[
          { id:'bela_review_accounts', label:'Put the royal treasury first', detail:'You turn to the crown’s revenues and what they can pay for this year.', operation:'agenda_priority' },
          { id:'bela_keep_accounts', label:'Leave the accounts to your officials', detail:'You trust your officials with the treasury and look elsewhere.', operation:'agenda_priority' }
        ] },
      { id:'bela_family', name:'The royal household', year:1241, season:0,
        text:'Queen Maria Laskarina and your infant son Stephen are with you at Obuda. Your younger brother Coloman rules Slavonia in the south.', choices:[
          { id:'bela_family_priority', label:'Keep Maria and Stephen close', detail:'You turn to the safety of the queen and your heir.', operation:'agenda_priority' },
          { id:'bela_defer_family', label:'Rely on Coloman in Slavonia', detail:'You turn to your brother and the south of Hungary.', operation:'agenda_priority' }
        ] },
      { id:'bela_defense', name:'Preparation and resources', year:1241, season:0,
        text:'Batu’s columns stand at Cluj and Gyula, and more are riding through Poland. Raising and feeding a royal host will cost the treasury dearly.', choices:[
          { id:'bela_defensive_priority', label:'Prepare Hungary’s defense', detail:'You turn to the passes, the fortresses and the royal host.', operation:'agenda_priority' },
          { id:'bela_defer_defense', label:'Wait for clearer news of the Mongols', detail:'You hold back from new spending until the danger is plain.', operation:'agenda_priority' }
        ] },
      { id:'bela_hosted_people', name:'People under royal protection', year:1241, season:0,
        text:'Khan Koten and his Cumans have sheltered in Hungary under your protection. Your nobles distrust them, and Koten is kept under guard near Obuda.', choices:[
          { id:'bela_review_protection', label:'Stand by Koten and the Cumans', detail:'You turn to keeping your promise of shelter to Koten’s people.', operation:'agenda_priority' },
          { id:'bela_keep_protection', label:'Heed the lords who distrust the Cumans', detail:'You turn to the nobles who want Koten’s people watched.', operation:'agenda_priority' }
        ] },
      { id:'bela_contacts', name:'Neighbors and obligations', year:1241, season:1,
        text:'Austria, Poland, the Pope and Frederick II all watch the Mongols too. None of them has promised you help.', choices:[
          { id:'bela_diplomatic_priority', label:'Seek help from your neighbors', detail:'You turn to envoys and letters to Austria, the Pope and Frederick II.', operation:'agenda_priority' },
          { id:'bela_keep_diplomacy', label:'Rely on Hungary’s own strength', detail:'You turn away from foreign courts and look to your own lords.', operation:'agenda_priority' }
        ] },
      { id:'bela_war_review', name:'The Mongols in Hungary', year:1241, season:1,
        text:'Batu’s columns entered Hungary this spring. Where the fighting goes from here, and who wins, is decided on the map.', choices:[
          { id:'bela_review_war', label:'Lead the defense of Hungary yourself', detail:'You turn your attention to the royal host and the fight ahead.', operation:'agenda_priority' },
          { id:'bela_defer_war', label:'Hold back and guard the court', detail:'You turn to keeping the royal family and Obuda safe.', operation:'agenda_priority' }
        ] },
      { id:'bela_response', name:'Paying for the war', year:1241, season:2,
        text:'Whatever the fighting has brought, the crown must pay its soldiers and rebuild from its own treasury and lands.', choices:[
          { id:'bela_resource_priority', label:'Keep the crown’s spending within its means', detail:'You turn to what the treasury can afford through the coming winter.', operation:'agenda_priority' },
          { id:'bela_defer_response', label:'Wait before spending more', detail:'You hold the treasury back until Hungary’s state is clear.', operation:'agenda_priority' }
        ] },
      { id:'bela_continuation', name:'The court continues', year:1241, season:3,
        text:'The winter of 1241 closes the year of the Mongol invasion. Take stock of the lands and family you still have.', choices:[
          { id:'bela_continue', label:'Carry the crown into the new year', detail:'You turn to ruling Hungary through the winter ahead.', operation:'agenda_priority' },
          { id:'bela_finish', label:'Close your court agenda', detail:'You end this agenda and govern on from where you stand.', operation:'agenda_finish' }
        ] }
    ] },
  yaroslav_agenda_1241:{ id:'yaroslav_agenda_1241', type:'ruler_agenda', subjectRealmId:'vladimir_1241',
    title:'Yaroslav: recovery and northern relations', intro:'You rule Vladimir three years after the Mongols burned it and killed your brother Yuri, and last winter Batu’s armies took Kyiv. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'yaroslav_accounts', name:'The present principality', year:1241, season:0,
        text:'The sack of 1238 left Vladimir and its towns poor and half rebuilt. Your treasury must pay for whatever you mend.', choices:[
          { id:'yaroslav_review_accounts', label:'Put Vladimir’s treasury first', detail:'You turn to your revenues and what they can rebuild.', operation:'agenda_priority' },
          { id:'yaroslav_keep_accounts', label:'Leave the accounts to your officials', detail:'You trust your officials with the treasury and look elsewhere.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_family', name:'One princely family', year:1241, season:0,
        text:'Your wife Feodosia and your sons Alexander and Andrei are your family. Alexander, back from Novgorod after a quarrel with the city, keeps his own household with his wife, a daughter of Bryachislav of Polotsk.', choices:[
          { id:'yaroslav_family_priority', label:'Settle your sons’ places', detail:'You turn to what Alexander and Andrei should hold.', operation:'agenda_priority' },
          { id:'yaroslav_defer_family', label:'Let your sons find their own way', detail:'You leave Alexander and Andrei to their own households for now.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_north', name:'Novgorod and its choices', year:1241, season:0,
        text:'Novgorod chooses its own prince. After quarrelling with your son Alexander, the city may yet ask for him back.', choices:[
          { id:'yaroslav_northern_priority', label:'Court Novgorod for your house', detail:'You turn to winning back Novgorod’s goodwill for Alexander or Andrei.', operation:'agenda_priority' },
          { id:'yaroslav_keep_north', label:'Leave Novgorod to its own quarrels', detail:'You wait for Novgorod to send its envoys to you.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_reports', name:'News from the south and west', year:1241, season:0,
        text:'Batu’s armies took Kyiv last winter and now ride west into Poland and Hungary. For now they make no new demand on Vladimir.', choices:[
          { id:'yaroslav_review_reports', label:'Watch Batu’s armies in the west', detail:'You turn to the news from Kyiv and beyond.', operation:'agenda_priority' },
          { id:'yaroslav_defer_reports', label:'Keep your mind on Vladimir', detail:'You turn back to your own lands and leave distant wars aside.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_recovery', name:'Recovery and expenditure', year:1241, season:1,
        text:'Burned towns and empty villages need money and labor to rebuild. Every coin you spend comes from your own treasury.', choices:[
          { id:'yaroslav_recovery_priority', label:'Rebuild Vladimir and its towns', detail:'You turn to the slow work of restoring what was burned.', operation:'agenda_priority' },
          { id:'yaroslav_defer_recovery', label:'Save the treasury for harder times', detail:'You hold back spending until the land is safer.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_diplomacy', name:'Neighbors and rivals', year:1241, season:1,
        text:'Other Rus princes, the Swedes and the Livonian Order all press on Novgorod and your borders. Batu has not yet summoned the Rus princes to his camp.', choices:[
          { id:'yaroslav_diplomatic_priority', label:'Seek allies among the Rus princes', detail:'You turn to envoys and marriages with neighboring courts.', operation:'agenda_priority' },
          { id:'yaroslav_keep_diplomacy', label:'Keep to your own borders', detail:'You avoid new ties and watch your neighbors.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_obligations', name:'First among the Rus princes', year:1241, season:2,
        text:'As grand prince you rank first among the Rus princes, but you rule only your own lands. The others follow you only as far as they choose.', choices:[
          { id:'yaroslav_review_obligations', label:'Strengthen your hold on Vladimir', detail:'You turn to the lands and towns you rule yourself.', operation:'agenda_priority' },
          { id:'yaroslav_defer_obligations', label:'Leave the other princes to themselves', detail:'You make no new claims on the other Rus courts.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_continuation', name:'The principality continues', year:1241, season:3,
        text:'By the winter of 1241 your year of rebuilding is ending. Take stock of Vladimir, your sons and Novgorod.', choices:[
          { id:'yaroslav_continue', label:'Carry Vladimir into the new year', detail:'You turn to ruling the principality through the winter ahead.', operation:'agenda_priority' },
          { id:'yaroslav_finish', label:'Close your court agenda', detail:'You end this agenda and govern on from where you stand.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_rulers_1241 = {
  opening_bela_1241:{ id:'opening_bela_1241', type:'opening_profile', title:'The crown’s opening goals',
    intro:'Three goals for your first year at Obuda. They carry no reward.',
    scenarioIds:['bela_1241'], officeRealmId:'hungary_1241', requires:['bela_agenda_1241'],
    goals:[
      { id:'bela_accounts_goal', name:'Set the course of the treasury', text:'Done when you put the royal treasury first or leave it to your officials.', office:true, criterion:{ kind:'story_choice', storyId:'bela_agenda_1241', choiceIds:['bela_review_accounts','bela_keep_accounts'] } },
      { id:'bela_defense_goal', name:'Decide on the defense of Hungary', text:'Done when you prepare Hungary’s defense or wait for clearer news of the Mongols.', office:true, criterion:{ kind:'story_choice', storyId:'bela_agenda_1241', choiceIds:['bela_defensive_priority','bela_defer_defense'] } },
      { id:'bela_host_payment', name:'Pay your soldiers from the treasury', text:'Done when the royal treasury pays your soldiers’ upkeep in full.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'hungary_1241' } }
    ], contacts:[
      { id:'bela_maria', label:'The queen', text:'Maria Laskarina, daughter of Theodore Laskaris of Nicaea, is your wife and the mother of your heir Stephen.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'hungary_1241', memberId:'maria' } },
      { id:'bela_coloman', label:'A brother in Slavonia', text:'Coloman is your younger brother and rules Slavonia in the south of Hungary.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'hungary_1241', memberId:'coloman' } }
    ] },
  opening_yaroslav_1241:{ id:'opening_yaroslav_1241', type:'opening_profile', title:'The principality’s opening goals',
    intro:'Three goals for your first year at Vladimir. They carry no reward.',
    scenarioIds:['yaroslav_1241'], officeRealmId:'vladimir_1241', requires:['yaroslav_agenda_1241'],
    goals:[
      { id:'yaroslav_accounts_goal', name:'Set the course of the treasury', text:'Done when you put Vladimir’s treasury first or leave it to your officials.', office:true, criterion:{ kind:'story_choice', storyId:'yaroslav_agenda_1241', choiceIds:['yaroslav_review_accounts','yaroslav_keep_accounts'] } },
      { id:'yaroslav_north_goal', name:'Decide on Novgorod', text:'Done when you court Novgorod for your house or leave it to its own quarrels.', office:true, criterion:{ kind:'story_choice', storyId:'yaroslav_agenda_1241', choiceIds:['yaroslav_northern_priority','yaroslav_keep_north'] } },
      { id:'yaroslav_receipt', name:'Collect revenue for Vladimir', text:'Done when taxes or other income reach Vladimir’s treasury.', office:true, criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'vladimir_1241' } }
    ], contacts:[
      { id:'yaroslav_feodosia', label:'The prince’s wife', text:'Feodosia is your wife and the mother of Alexander and Andrei.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'vladimir_1241', memberId:'feodosia' } },
      { id:'yaroslav_alexander', label:'Alexander', text:'Alexander is your elder son, who left Novgorod after quarrelling with the city.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'vladimir_1241', memberId:'alexander' } },
      { id:'yaroslav_andrei', label:'Andrei', text:'Andrei is your younger son, a prince Novgorod may also ask for.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'vladimir_1241', memberId:'andrei' } }
    ] }
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var b = FBDATA.bookmarks['1241'], realms = copy(b.realms);
  realms.forEach(function (realm) {
    if (FBDATA.royalCourts_1241[realm.id]) realm.royalCourt = copy(FBDATA.royalCourts_1241[realm.id]);
  });
  var layout = copy(FBDATA.settlementLayouts['1241']);
  function courtHead(county, site) {
    var index = layout[county].map(function (row) { return row.site; }).indexOf(site);
    if (index < 0) throw new Error('Missing opening court site: ' + site);
    var row = layout[county].splice(index,1)[0];
    delete row.fill;
    row.kind = 'town';
    layout[county].unshift(row);
  }
  courtHead('szekesfehervar','geo_obuda_3054643');
  courtHead('suzdal','geo_vladimir_473247');
  FBDATA.settlementLayouts['1241_royal_households_v2'] = layout;
  /* Retained campaigns keep their original people and settlement indexes.
     Koten and Batu need the later operational world and join only its list. */
  var starts = FBDATA.startScenarios.filter(function (sc) {
    return sc && sc.id !== 'koten_1241' && sc.id !== 'batu_1241' && FB.bookmarkSources.matches(sc,'1241',b.era);
  }).map(function (sc) { return sc.id; });
  b.revisions.baseline.starts = starts.filter(function (id) { return id !== 'bela_1241' && id !== 'yaroslav_1241' && id !== 'alexander_1241'; });
  b.revisions.royal_households_v2 = { realms:realms, settlementLayout:'1241_royal_households_v2', starts:starts.filter(function (id) { return id !== 'alexander_1241'; }) };
  b.revision = 'royal_households_v2';
  Object.assign(FBDATA.storyInstances,FBDATA.rulerAgendas_1241,FBDATA.openingProfiles_rulers_1241);
})();
});
