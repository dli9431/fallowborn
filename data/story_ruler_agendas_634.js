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
      unit.storyAfter = FB.bookmarkCompositions.captureStories('autumn_634',definition.id,unit.storyInstances);
    } catch (error) { unit.faults = ['data/story_ruler_agendas_634.js: ' + error.message]; }
  });
})();
});
