FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_634.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal priorities do not execute public decisions or replay accession. */
FBDATA.rulerAgendas_634 = {
  umar_agenda_634:{id:'umar_agenda_634',type:'ruler_agenda',subjectRealmId:'rashidun_634',
    title:'Umar: the Medinan mandate',
    intro:'Abu Bakr named you his successor this summer, and you now lead the Medinan court while Heraclius holds Damascus to the north and the Persians hold the Hira district to the northeast. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      {id:'accession_review_634',name:'Successor to Abu Bakr',year:634,season:2,
        text:'Abu Bakr named you his successor before he died this summer, and Medina’s leading men have sworn allegiance to you.',choices:[
          {id:'umar_review_mandate_634',label:'Secure the allegiance of Medina',detail:'The men who swore to you take your attention this season.',operation:'agenda_priority'},
          {id:'umar_retain_mandate_634',label:'Trust the oath already sworn',detail:'You turn from Medina’s politics to the frontiers.',operation:'agenda_priority'}]},
      {id:'syrian_review_634',name:'Damascus and Roman Syria',year:634,season:2,
        text:'North of Medina, Heraclius holds Damascus and the towns of Roman Syria. Whether to fight for them is your decision, and Iraq is a separate one.',choices:[
          {id:'umar_review_syria_634',label:'Look north to Damascus',detail:'Syria and the Roman frontier take your attention this season.',operation:'agenda_priority'},
          {id:'umar_retain_syria_634',label:'Leave Damascus for later',detail:'Syria waits while Medina sees to other matters.',operation:'agenda_priority'}]},
      {id:'iraqi_review_634',name:'Hira and the Persian border',year:634,season:2,
        text:'To the northeast, the Persian court at Ctesiphon holds the Hira district on the Euphrates. Iraq is a separate front from Syria.',choices:[
          {id:'umar_review_iraq_634',label:'Look east to Hira',detail:'The Persian frontier on the Euphrates takes your attention this season.',operation:'agenda_priority'},
          {id:'umar_retain_iraq_634',label:'Leave Hira for later',detail:'Iraq waits while Medina sees to other matters.',operation:'agenda_priority'}]},
      {id:'mandate_conclusion_634',name:'Continue from Medina',year:634,season:2,
        text:'With your first reviews done, you govern on from Medina. Neither Damascus nor Hira has to fall for your reign to go on.',choices:[
          {id:'umar_conclude_634',label:'Conclude the reviews',detail:'You close these reviews and govern on from Medina.',operation:'agenda_finish'},
          {id:'umar_retain_conclusion_634',label:'Keep Medina’s course steady',detail:'You finish these reviews and keep the court on its present course.',operation:'agenda_priority'}]}
    ]},
  heraclius_agenda_634:{id:'heraclius_agenda_634',type:'ruler_agenda',subjectRealmId:'byzantium_634',
    title:'Heraclius: the imperial court',
    intro:'You have ruled the Romans from Constantinople since 610 and won Syria, Palestine and Egypt back from Persia only a few years ago. Now Medina’s armies threaten Syria. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      {id:'imperial_court_review_634',name:'The court at Constantinople',year:634,season:2,
        text:'Your officials at Constantinople keep the government running while your attention is drawn east.',choices:[
          {id:'heraclius_review_court_634',label:'Put the court at Constantinople first',detail:'Your officials and the capital take your attention this season.',operation:'agenda_priority'},
          {id:'heraclius_retain_court_634',label:'Leave the court to your officials',detail:'You trust the capital to run itself and look to the provinces.',operation:'agenda_priority'}]},
      {id:'eastern_holdings_review_634',name:'The eastern provinces',year:634,season:2,
        text:'Syria, Palestine and Egypt are yours again after the long war with Persia, and Damascus is the city Medina’s armies would strike first.',choices:[
          {id:'heraclius_review_east_634',label:'Look to Syria and Damascus',detail:'The eastern provinces take your attention this season.',operation:'agenda_priority'},
          {id:'heraclius_retain_east_634',label:'Keep your eyes on the capital',detail:'The eastern provinces must manage with what they have.',operation:'agenda_priority'}]},
      {id:'defense_diplomacy_review_634',name:'Defense and diplomacy',year:634,season:2,
        text:'Medina’s armies threaten Syria, and Persia, your old enemy, faces them in Iraq. You can meet the danger with soldiers or with envoys.',choices:[
          {id:'heraclius_review_defense_634',label:'Prepare to defend Syria',detail:'Garrisons and envoys for the east take your attention this season.',operation:'agenda_priority'},
          {id:'heraclius_retain_defense_634',label:'Trust envoys before soldiers',detail:'You look for peace on the eastern frontier before any fighting.',operation:'agenda_priority'}]},
      {id:'imperial_conclusion_634',name:'Continue from Constantinople',year:634,season:2,
        text:'With your reviews done, you govern on from Constantinople, whatever becomes of Syria.',choices:[
          {id:'heraclius_conclude_634',label:'Conclude the reviews',detail:'You close these reviews and govern on from Constantinople.',operation:'agenda_finish'},
          {id:'heraclius_retain_conclusion_634',label:'Keep the court’s course steady',detail:'You finish these reviews and keep the court on its present course.',operation:'agenda_priority'}]}
    ]},
  yazdegerd_agenda_634:{id:'yazdegerd_agenda_634',type:'ruler_agenda',subjectRealmId:'sasanian_634',requires:['iraqi_front_634'],
    title:'Yazdegerd: the child ruler and the court',
    intro:'You are ten years old and king of kings at Ctesiphon, crowned two years ago after a long civil war. An adult steward governs in your name, the great provincial houses must agree to public decisions, and Medina may march on the Hira district. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      {id:'minority_court',name:'The boy king and his steward',year:634,season:2,
        text:'You are ten, so an adult steward from the great provincial houses governs in your name until you come of age. Rank & Realm shows who the steward is and who recognizes you as king.',choices:[
          {id:'yazdegerd_review_court',label:'Put the court and steward first',detail:'The steward and your household take your attention this season.',operation:'agenda_priority'},
          {id:'yazdegerd_observe_recognition',label:'Record the recognition you hold',detail:'Records the recognition you hold as king this reign.',operation:'agenda_public_record',recordKind:'agenda_recognition'},
          {id:'yazdegerd_keep_court',label:'Leave the court to the steward',detail:'You let the steward run the court while you look further afield.',operation:'agenda_priority'}]},
      {id:'provincial_obligations',name:'The great houses and their dues',year:634,season:2,
        text:'The great provincial houses hold their lands by hereditary right and owe the crown revenue and soldiers. Rank & Realm shows each house that remains and what it owes, and new terms are negotiated there at a public cost.',choices:[
          {id:'yazdegerd_review_provinces',label:'Look to what the great houses owe',detail:'The provincial houses and their dues take your attention this season.',operation:'agenda_priority'},
          {id:'yazdegerd_keep_provinces',label:'Leave the houses’ terms as they are',detail:'You keep the great houses content by asking nothing new of them.',operation:'agenda_priority'}]},
      {id:'iraqi_frontier',name:'Hira and the Euphrates',year:634,season:2,
        text:'Medina may go to war for the Hira district, south of Ctesiphon on the Euphrates. Defending it needs a steward able to act and the assent of the great houses.',choices:[
          {id:'yazdegerd_review_iraq',label:'Look to the defense of Hira',detail:'The Euphrates frontier takes your attention this season.',operation:'agenda_priority'},
          {id:'yazdegerd_observe_iraq',label:'Note how the war for Hira district ended',detail:'Records the outcome once the Iraqi frontier campaign is over.',operation:'agenda_story_fact',storyId:'iraqi_front_634',stateField:'result',values:['won','failed','diverted','interrupted']},
          {id:'yazdegerd_keep_iraq',label:'Leave the frontier as it stands',detail:'You turn to other matters and make no new plans for the Euphrates.',operation:'agenda_priority'}]},
      {id:'sasanian_continuation',name:'Ruling from Ctesiphon',year:634,season:2,
        text:'With your reviews done, you rule on from Ctesiphon. The steward’s role ends when you come of age, and you remain king of kings.',choices:[
          {id:'yazdegerd_finish',label:'Conclude the reviews',detail:'You close these reviews and rule on from Ctesiphon.',operation:'agenda_finish'},
          {id:'yazdegerd_keep',label:'Keep the court’s course steady',detail:'You finish these reviews and keep the court on its present course.',operation:'agenda_priority'}]}
    ]
  }
};
/* Complete court reviews use the world revision that owns both opportunities.
   Earlier worlds retain their original personal declarations. */
FBDATA.rulerAgendas_634_full = {
  umar_court_agenda_634:{id:'umar_court_agenda_634',type:'ruler_agenda',subjectRealmId:'rashidun_634',
    requires:['syrian_front_634','iraqi_front_634'],
    title:'Umar: mandate and frontiers',
    intro:'Abu Bakr named you his successor this summer, and you now lead the Medinan court as its armies look north to Damascus and east to the Hira district. These priorities shape your court’s story; orders and payments go through Rank & Realm and Land, and the wars for Damascus and Hira district start only when you approve them.',
    stages:[
      {id:'mandate_accounts',name:'Allegiance and the treasury',year:634,season:2,
        text:'Abu Bakr named you his successor before he died this summer, and Medina’s leading men have sworn allegiance to you. Rank & Realm shows who recognizes you, and the treasury shows what you can spend.',choices:[
          {id:'umar_prioritize_accounts',label:'Put allegiance and the treasury first',detail:'Medina’s leading men and its accounts take your attention this season.',operation:'agenda_priority'},
          {id:'umar_keep_accounts',label:'Leave Medina’s accounts as they are',detail:'You turn from Medina to the frontiers.',operation:'agenda_priority'}]},
      {id:'syrian_frontier',name:'Damascus and Roman Syria',year:634,season:2,
        text:'Heraclius holds Damascus and the towns of Roman Syria north of Medina. You can approve a war for Damascus or drop the claim; Iraq is a separate decision.',choices:[
          {id:'umar_face_syria',label:'Approve the war for Damascus',detail:'Your armies march once Medina may declare war.',operation:'agenda_story_choice',storyId:'syrian_front_634',choiceId:'face_campaign'},
          {id:'umar_decline_syria',label:'Drop the claim to Damascus',detail:'Iraq stays a separate decision.',operation:'agenda_story_choice',storyId:'syrian_front_634',choiceId:'leave_campaign'},
          {id:'umar_record_syria',label:'Note how the war for Damascus ended',detail:'Records the outcome once the Syrian frontier campaign is over.',operation:'agenda_story_fact',storyId:'syrian_front_634',stateField:'result',values:['won','failed','diverted','interrupted']},
          {id:'umar_keep_syria',label:'Leave Damascus for later',detail:'You turn to other matters and leave the war for Damascus undecided.',operation:'agenda_priority'}]},
      {id:'iraqi_frontier',name:'Hira and the Persian border',year:634,season:2,
        text:'The Persian court at Ctesiphon holds the Hira district on the Euphrates. You can approve a war for it or drop the claim, whatever you decide about Syria.',choices:[
          {id:'umar_face_iraq',label:'Approve the war for Hira district',detail:'Your armies march once Medina may declare war.',operation:'agenda_story_choice',storyId:'iraqi_front_634',choiceId:'face_campaign'},
          {id:'umar_decline_iraq',label:'Drop the claim to Hira district',detail:'Syria stays a separate decision.',operation:'agenda_story_choice',storyId:'iraqi_front_634',choiceId:'leave_campaign'},
          {id:'umar_record_iraq',label:'Note how the war for Hira district ended',detail:'Records the outcome once the Iraqi frontier campaign is over.',operation:'agenda_story_fact',storyId:'iraqi_front_634',stateField:'result',values:['won','failed','diverted','interrupted']},
          {id:'umar_keep_iraq',label:'Leave Hira district for later',detail:'You turn to other matters and leave the war for Hira district undecided.',operation:'agenda_priority'}]},
      {id:'medinan_continuation',name:'Continue governing from Medina',year:634,season:2,
        text:'With your reviews done, you govern on from Medina. Your reign goes on whether both fronts stay quiet or Medina wins new lands.',choices:[
          {id:'umar_finish_court',label:'Conclude the reviews',detail:'You close these reviews and govern on from Medina. Wars already under way continue.',operation:'agenda_finish'},
          {id:'umar_keep_court',label:'Keep Medina’s course steady',detail:'You finish these reviews and keep the court on its present course.',operation:'agenda_priority'}]}
    ]},
  heraclius_court_agenda_634:{id:'heraclius_court_agenda_634',type:'ruler_agenda',subjectRealmId:'byzantium_634',
    requires:['syrian_front_634'],
    title:'Heraclius: administration and the east',
    intro:'You have ruled the Romans from Constantinople since 610 and won the east back from Persia, and now Medina’s armies look to Damascus. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      {id:'imperial_administration',name:'The court and its officials',year:634,season:2,
        text:'Your officials govern the provinces in your name from Constantinople. Rank & Realm shows who holds each office, and appointments and reaffirmations are made there at their listed cost.',choices:[
          {id:'heraclius_prioritize_administration',label:'Put the imperial offices first',detail:'Your officials and their work take your attention this season.',operation:'agenda_priority'},
          {id:'heraclius_observe_appointments',label:'Record the officials now serving',detail:'Records the officials who hold public office now.',operation:'agenda_public_record',recordKind:'agenda_appointments'},
          {id:'heraclius_keep_administration',label:'Leave the offices as they stand',detail:'You trust your officials and turn to the provinces.',operation:'agenda_priority'}]},
      {id:'eastern_accounts',name:'The east and the treasury',year:634,season:2,
        text:'Syria, Palestine and Egypt are yours again after the long war with Persia. Land shows who holds each province and where your forces stand, and the treasury shows what the state can spend apart from your private purse.',choices:[
          {id:'heraclius_prioritize_accounts',label:'Look to the eastern provinces and treasury',detail:'The eastern provinces and their revenues take your attention this season.',operation:'agenda_priority'},
          {id:'heraclius_keep_accounts',label:'Leave the east to its officials',detail:'You turn from the eastern accounts to the defense of Damascus.',operation:'agenda_priority'}]},
      {id:'syrian_defense',name:'The defense of Damascus',year:634,season:2,
        text:'Medina may go to war for Damascus. That decision is Medina’s; if its armies attack, you defend the city with your own forces.',retiredChoiceIds:['heraclius_face_syria','heraclius_decline_syria'],choices:[
          {id:'heraclius_record_syria',label:'Note how the war for Damascus ended',detail:'Records the outcome once the Syrian frontier campaign is over.',operation:'agenda_story_fact',storyId:'syrian_front_634',stateField:'result',values:['won','failed','diverted','interrupted']},
          {id:'heraclius_keep_syria',label:'Hold Damascus with what you have',detail:'You trust Damascus to hold and turn to other matters.',operation:'agenda_priority'}]},
      {id:'imperial_continuation',name:'Continue from Constantinople',year:634,season:2,
        text:'With your reviews done, you govern on from Constantinople, whether or not Medina attacks Damascus.',choices:[
          {id:'heraclius_finish_court',label:'Conclude the reviews',detail:'You close these reviews and govern on from Constantinople. Wars already under way continue.',operation:'agenda_finish'},
          {id:'heraclius_keep_court',label:'Keep the court’s course steady',detail:'You finish these reviews and keep the court on its present course.',operation:'agenda_priority'}]}
    ]}
};
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  FBDATA.startScenarios_634_rulers.forEach(function (definition) {
    var unit = source.input.starts.find(function (entry) { return entry.definition.id === definition.id; });
    if (!unit) return;
    try {
      unit.storyInstances = {};
      definition.tracks.forEach(function (id) {
        if (!FBDATA.rulerAgendas_634[id]) throw new Error('Missing 634 ruler agenda: ' + id);
        unit.storyInstances[id] = JSON.parse(JSON.stringify(FBDATA.rulerAgendas_634[id]));
      });
      if (definition.id === 'yazdegerd_634') {
        delete unit.locations;
        unit.bindings = {root:{offered:false,locations:[definition.fixedProvinceId]},revisions:{}};
        Object.keys(source.input.bookmark.revisions).forEach(function (id) {
          unit.bindings.revisions[id] = {};
        });
        unit.bindings.revisions.core_courts_v4 = {offered:true};
        unit.storyAfter = FB.bookmarkCompositions.captureStories('autumn_634',definition.id,unit.storyInstances);
        return;
      }
      var fullId = definition.id === 'umar_634' ? 'umar_court_agenda_634' : 'heraclius_court_agenda_634';
      unit.storyInstances[fullId] = JSON.parse(JSON.stringify(FBDATA.rulerAgendas_634_full[fullId]));
      delete unit.locations;
      unit.bindings = {root:{locations:[definition.fixedProvinceId]},revisions:{}};
      if (Array.isArray(source.input.bookmark.starts)) unit.bindings.root.offered = true;
      Object.keys(source.input.bookmark.revisions).forEach(function (id) {
        unit.bindings.revisions[id] = Array.isArray(source.input.bookmark.revisions[id].starts) ? {offered:true} : {};
      });
      var locations = {};
      locations[fullId] = [definition.fixedProvinceId];
      unit.bindings.revisions.core_courts_v4.trackOverride = {tracks:[fullId],trackLocations:locations};
      unit.storyAfter = FB.bookmarkCompositions.captureStories('autumn_634',definition.id,unit.storyInstances);
    } catch (error) { unit.faults = ['data/story_ruler_agendas_634.js: ' + error.message]; }
  });
})();
});
