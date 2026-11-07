FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_634.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal priorities do not execute public decisions or replay accession. */
FBDATA.rulerAgendas_634 = {
  umar_agenda_634:{id:'umar_agenda_634',type:'ruler_agenda',subjectRealmId:'rashidun_634',
    title:'Umar: the Medinan mandate',
    intro:'Review your present authority, borders and resources from Medina. Each review is costless; ordinary public actions retain their own consent, costs and eligibility.',
    stages:[
      {id:'accession_review_634',name:'The existing mandate',year:634,season:2,
        text:'Accession is opening context. Examine the current political mandate and its recognition through the ordinary government records. This review neither repeats accession nor appoints a religious head or a living nominee.',choices:[
          {id:'umar_review_mandate_634',label:'Prioritize the present mandate',detail:'Record attention to the current political arrangements without a new designation, recognition or payment.',operation:'agenda_priority'},
          {id:'umar_retain_mandate_634',label:'Retain present arrangements',detail:'Continue with the existing mandate at no cost.',operation:'agenda_priority'}]},
      {id:'syrian_review_634',name:'The Syrian border and resources',year:634,season:2,
        text:'Consult the current map, neighboring courts, available funds and forces before choosing a course toward Syria. Present ownership determines the border. A campaign elsewhere supplies no Syrian outcome; any diplomacy or war uses its ordinary public review.',choices:[
          {id:'umar_review_syria_634',label:'Prioritize the current Syrian situation',detail:'Record a priority only. Spend no funds, raise no force and begin no campaign.',operation:'agenda_priority'},
          {id:'umar_retain_syria_634',label:'Retain present arrangements',detail:'Make no new Syrian commitment.',operation:'agenda_priority'}]},
      {id:'iraqi_review_634',name:'The Iraqi border and resources',year:634,season:2,
        text:'Review the actual Iraqi border, current neighboring authority and the resources still available. Assess this situation independently of Syria. Neither a victory nor a war declaration establishes harm to a community or a change in its faith.',choices:[
          {id:'umar_review_iraq_634',label:'Prioritize the current Iraqi situation',detail:'Record attention without a payment, military order, claim or promised conquest.',operation:'agenda_priority'},
          {id:'umar_retain_iraq_634',label:'Retain present arrangements',detail:'Make no new Iraqi commitment.',operation:'agenda_priority'}]},
      {id:'mandate_conclusion_634',name:'Continue from Medina',year:634,season:2,
        text:'Conclude these reviews with the arrangements and resources that now exist. Remaining at Medina is a complete course. Ordinary government and diplomacy continue; no city must fall and no battle or death is scheduled.',choices:[
          {id:'umar_conclude_634',label:'Conclude the reviews',detail:'Close the personal program at no cost or reward. Ordinary public actions remain available.',operation:'agenda_finish'},
          {id:'umar_retain_conclusion_634',label:'Retain present arrangements',detail:'Complete the reviews without a new public commitment or reward.',operation:'agenda_priority'}]}
    ]},
  heraclius_agenda_634:{id:'heraclius_agenda_634',type:'ruler_agenda',subjectRealmId:'byzantium_634',
    title:'Heraclius: the imperial court',
    intro:'Review your existing court, eastern holdings and available resources from Constantinople. Each review is costless; ordinary public actions retain their own authority, costs and eligibility.',
    stages:[
      {id:'imperial_court_review_634',name:'The present imperial court',year:634,season:2,
        text:'Examine the current court and ordinary government records. This opening uses a reduced model of direct administration and office succession. It supplies no reconstructed seventh-century office roster or thematic mobilization.',choices:[
          {id:'heraclius_review_court_634',label:'Prioritize the present court',detail:'Record attention to the existing court without appointing an official, changing succession or spending funds.',operation:'agenda_priority'},
          {id:'heraclius_retain_court_634',label:'Retain present arrangements',detail:'Continue with the existing court at no cost.',operation:'agenda_priority'}]},
      {id:'eastern_holdings_review_634',name:'Eastern holdings and resources',year:634,season:2,
        text:'Consult the current map, actual holders, public funds and available forces. Recovered provinces are opening context, not a new grant or payment. Present ownership determines what the court governs; no Syrian loss or recovery is required.',choices:[
          {id:'heraclius_review_east_634',label:'Prioritize current eastern holdings',detail:'Record attention to actual holdings and resources without changing a border, raising forces or granting funds.',operation:'agenda_priority'},
          {id:'heraclius_retain_east_634',label:'Retain present arrangements',detail:'Make no new territorial or financial commitment.',operation:'agenda_priority'}]},
      {id:'defense_diplomacy_review_634',name:'Lawful defense and diplomacy',year:634,season:2,
        text:'Assess defense and diplomacy against the authority, neighbors and resources that now exist. Any treaty, military order or war must pass its ordinary public review. A war or victory proves no sack, expulsion, universal welcome or change of communal faith.',choices:[
          {id:'heraclius_review_defense_634',label:'Prioritize lawful defense and diplomacy',detail:'Record a priority only. Begin no campaign, negotiate no treaty and spend no funds.',operation:'agenda_priority'},
          {id:'heraclius_retain_defense_634',label:'Retain present arrangements',detail:'Make no new diplomatic or military commitment.',operation:'agenda_priority'}]},
      {id:'imperial_conclusion_634',name:'Continue from Constantinople',year:634,season:2,
        text:'Conclude these reviews with the court, holdings and resources that now exist. Remaining at Constantinople is a complete course. Ordinary public decisions continue; no journey, named battle, territorial loss or death is scheduled.',choices:[
          {id:'heraclius_conclude_634',label:'Conclude the reviews',detail:'Close the personal program at no cost or reward. Ordinary public actions remain available.',operation:'agenda_finish'},
          {id:'heraclius_retain_conclusion_634',label:'Retain present arrangements',detail:'Complete the reviews without a new public commitment or reward.',operation:'agenda_priority'}]}
    ]}
};
/* Complete court reviews use the world revision that owns both opportunities.
   Earlier worlds retain their original personal declarations. */
FBDATA.rulerAgendas_634_full = {
  umar_court_agenda_634:{id:'umar_court_agenda_634',type:'ruler_agenda',subjectRealmId:'rashidun_634',
    requires:['syrian_front_634','iraqi_front_634'],
    title:'Umar: mandate and frontiers',
    intro:'Govern the existing Medinan court from Medina. Priorities cost nothing. Campaign decisions use current public authority, consent and ordinary war costs; either frontier may remain quiet.',
    stages:[
      {id:'mandate_accounts',name:'The mandate and available accounts',year:634,season:2,
        text:'Review Rank & Realm for the present selection mandate and recognition, and the treasury for available public funds and existing commitments. The political incumbent and the resident communities have distinct identities. A personal priority neither repeats accession nor nominates a successor, buys assent or converts residents.',choices:[
          {id:'umar_prioritize_accounts',label:'Prioritize the mandate and accounts',detail:'Record attention at no cost. Use ordinary government and treasury controls for actual decisions.',operation:'agenda_priority'},
          {id:'umar_keep_accounts',label:'Retain present arrangements',detail:'Continue with the actual incumbent and existing accounts without a payment or new public commitment.',operation:'agenda_priority'}]},
      {id:'syrian_frontier',name:'The Syrian frontier',year:634,season:2,
        text:'The Syrian opportunity concerns the Damascus district, not an assured urban surrender. Consult its current controller and source status below, and Land for actual forces and holdings. Frontier access, recognition and ordinary permission may prevent a declaration. Iraq is a separate decision.',choices:[
          {id:'umar_face_syria',label:'Consider the Syrian campaign',detail:'Commit only if the current ordinary aggression review permits it. Political costs apply immediately; the attempt lasts at most 360 days, with no guaranteed conquest.',operation:'agenda_story_choice',storyId:'syrian_front_634',choiceId:'face_campaign'},
          {id:'umar_decline_syria',label:'Use ordinary diplomacy in Syria',detail:'Close only this authored opportunity without payment or declaration. Ordinary diplomacy and independent wars remain available.',operation:'agenda_story_choice',storyId:'syrian_front_634',choiceId:'leave_campaign'},
          {id:'umar_record_syria',label:'Acknowledge the actual Syrian conclusion',detail:'Record only the source outcome already reached. This supplies no victory, territorial award or reward.',operation:'agenda_story_fact',storyId:'syrian_front_634',stateField:'result',values:['won','failed','diverted','interrupted']},
          {id:'umar_keep_syria',label:'Retain present arrangements',detail:'Record no campaign commitment. The separate frontier card keeps its own current choices.',operation:'agenda_priority'}]},
      {id:'iraqi_frontier',name:'The Iraqi frontier',year:634,season:2,
        text:'The Iraqi opportunity concerns the Hira district on the existing coarse map. Its opening Sasanian controller is a simulation choice, not proof of precise urban possession. Review the actual controller, source status and remaining resources independently of Syria. No Ctesiphon conquest or named battle is promised.',choices:[
          {id:'umar_face_iraq',label:'Consider the Iraqi campaign',detail:'Commit only through current ordinary aggression permission and political costs. The attempt lasts at most 180 days; funds and territory are not granted.',operation:'agenda_story_choice',storyId:'iraqi_front_634',choiceId:'face_campaign'},
          {id:'umar_decline_iraq',label:'Use ordinary diplomacy in Iraq',detail:'Close only this authored opportunity without payment or declaration. This does not decide the Syrian opportunity.',operation:'agenda_story_choice',storyId:'iraqi_front_634',choiceId:'leave_campaign'},
          {id:'umar_record_iraq',label:'Acknowledge the actual Iraqi conclusion',detail:'Record only an existing source conclusion without a new campaign, payment or reward.',operation:'agenda_story_fact',storyId:'iraqi_front_634',stateField:'result',values:['won','failed','diverted','interrupted']},
          {id:'umar_keep_iraq',label:'Retain present arrangements',detail:'Continue without deciding this opportunity here. Ordinary public actions remain available.',operation:'agenda_priority'}]},
      {id:'medinan_continuation',name:'Continue governing from Medina',year:634,season:2,
        text:'Conclude from the mandate, holdings and resources that actually remain. Staying at Medina and leaving both fronts quiet is a complete course. Ordinary public actions continue after this personal program; no conquest, death or religious change is scheduled.',choices:[
          {id:'umar_finish_court',label:'Conclude the reviews',detail:'End this personal program at no cost or reward. Existing wars, agreements and ordinary government keep their own rules.',operation:'agenda_finish'},
          {id:'umar_keep_court',label:'Retain present arrangements',detail:'Complete the reviews without another public commitment or reward.',operation:'agenda_priority'}]}
    ]},
  heraclius_court_agenda_634:{id:'heraclius_court_agenda_634',type:'ruler_agenda',subjectRealmId:'byzantium_634',
    requires:['syrian_front_634'],
    title:'Heraclius: administration and the east',
    intro:'Govern the existing imperial court from Constantinople. Priorities are costless; actual commissions, diplomacy and defense retain their current authority, consent and resource requirements.',
    stages:[
      {id:'imperial_administration',name:'The court and public administration',year:634,season:2,
        text:'Review Rank & Realm for the current administrative government, effective public commissions and recognition. Use its ordinary appointment and reaffirmation controls for actual changes, with their displayed terms and funding. This opening supplies no mature thematic system or invented historical officeholder.',choices:[
          {id:'heraclius_prioritize_administration',label:'Prioritize current administration',detail:'Record attention without appointing an officer, changing succession or spending public funds.',operation:'agenda_priority'},
          {id:'heraclius_observe_appointments',label:'Acknowledge effective public service',detail:'Record existing effective public appointments only if the ordinary office records support them. Create no office, salary or additional reward.',operation:'agenda_public_record',recordKind:'agenda_appointments'},
          {id:'heraclius_keep_administration',label:'Retain present arrangements',detail:'Continue with the present court and officers at no cost.',operation:'agenda_priority'}]},
      {id:'eastern_accounts',name:'Eastern holdings and available resources',year:634,season:2,
        text:'Consult Land for current owners and forces, and the treasury for public funds and commitments. Earlier recoveries are opening context, not a fresh grant. Public accounts and the private purse remain distinct. Neither the calendar nor this priority removes an eastern holding or creates an army.',choices:[
          {id:'heraclius_prioritize_accounts',label:'Prioritize actual holdings and accounts',detail:'Record attention at no cost. Any public spending, appointment or military order uses its ordinary controls.',operation:'agenda_priority'},
          {id:'heraclius_keep_accounts',label:'Retain present arrangements',detail:'Make no new territorial, financial or military commitment.',operation:'agenda_priority'}]},
      {id:'syrian_defense',name:'Syrian defense and diplomacy',year:634,season:2,
        text:'Review the current Damascus district controller and source status below. While this court is the actual target, it may face the existing opportunity or close that opportunity in favor of ordinary diplomacy. A changed owner may end your participation. A declaration proves no local sack, expulsion, universal welcome or conversion.',choices:[
          {id:'heraclius_face_syria',label:'Face the current Syrian opportunity',detail:'Permit this opportunity to proceed only through its live ordinary war review. It may create a defensive war; no allied army, payment or recovery is guaranteed.',operation:'agenda_story_choice',storyId:'syrian_front_634',choiceId:'face_campaign'},
          {id:'heraclius_decline_syria',label:'Use ordinary diplomacy instead',detail:'Close only this authored opportunity without payment or declaration. Independent attacks and ordinary defense remain possible.',operation:'agenda_story_choice',storyId:'syrian_front_634',choiceId:'leave_campaign'},
          {id:'heraclius_record_syria',label:'Acknowledge the actual Syrian conclusion',detail:'Record the source conclusion already reached. An attacker securing its objective is not an imperial victory or proof of harm to residents.',operation:'agenda_story_fact',storyId:'syrian_front_634',stateField:'result',values:['won','failed','diverted','interrupted']},
          {id:'heraclius_keep_syria',label:'Retain present arrangements',detail:'Make no campaign decision here. The ordinary frontier card and public controls remain available.',operation:'agenda_priority'}]},
      {id:'imperial_continuation',name:'Continue from Constantinople',year:634,season:2,
        text:'Conclude with the living court, holdings and accounts that now exist. This capital-based opening is a reconstruction, not an exact itinerary. Remaining here is a complete course, whether the Syrian opportunity starts, ends or never proceeds.',choices:[
          {id:'heraclius_finish_court',label:'Conclude the reviews',detail:'End the personal program without payment or reward. Ordinary administration, diplomacy and existing wars continue.',operation:'agenda_finish'},
          {id:'heraclius_keep_court',label:'Retain present arrangements',detail:'Complete the reviews without a journey or new public commitment.',operation:'agenda_priority'}]}
    ]}
};
/* The unavailable Yazdegerd program reserves yazdegerd_agenda_634 only as a
   future identity; it is deliberately absent from the registered graph. */
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
