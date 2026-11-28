FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_568_east.js","bookmarks":["568"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Eastern court reviews record intentions; the living world owns outcomes. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_568_east = {
  justin_agenda_568:{id:'justin_agenda_568',type:'ruler_agenda',subjectRealmId:'east_568',
    title:'Justin: the eastern court',intro:'You rule from Constantinople in 568, with Narses commanding in Italy and the fifty-year peace with Persia to uphold. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',stages:[
      {id:'ji_court',name:'The palace',year:568,season:0,text:'You have ruled from the Great Palace since 565, and its officials already compete for your favor.',choices:[
        {id:'ji_review_court',label:'Put the palace and its officials first',detail:'Appointments and favor at court take your attention this season.',operation:'agenda_priority'},
        {id:'ji_keep_court',label:'Leave the palace to its officials',detail:'You turn from court affairs to the provinces.',operation:'agenda_priority'}]},
      {id:'ji_italy',name:'Commands in Italy',year:568,season:0,text:'Narses still commands in Italy while voices at court press for his recall.',choices:[
        {id:'ji_review_italy',label:'Weigh the recall of Narses',detail:'The future of the Italian command takes your attention this season.',operation:'agenda_priority'},
        {id:'ji_keep_italy',label:'Keep Narses in his command',detail:'You stand by Narses and his officers in Italy.',operation:'agenda_priority'}]},
      {id:'ji_north',name:'Northern Italy',year:568,season:1,text:'Alboin’s Lombards in Pannonia are restless, and Verona and Pavia lie on their road into Italy.',choices:[
        {id:'ji_review_defense',label:'Strengthen the northern Italian garrisons',detail:'The defense of Verona and Pavia takes priority this season.',operation:'agenda_priority'},
        {id:'ji_review_diplomacy',label:'Seek terms with the Lombards',detail:'Your envoys turn to Alboin and his court in Pannonia.',operation:'agenda_priority'},
        {id:'ji_keep_north',label:'Trust the garrisons as they stand',detail:'You leave northern Italy to its commanders.',operation:'agenda_priority'}]},
      {id:'ji_east',name:'Eastern approaches',year:569,season:0,text:'Reports reach you of the Turks beyond Persia, eager to sell silk in Constantinople and to find an ally against Khosrow.',choices:[
        {id:'ji_review_east',label:'Court the Turks against Persia',detail:'An alliance in the east takes your attention this season.',operation:'agenda_priority'},
        {id:'ji_keep_east',label:'Keep the peace with Khosrow',detail:'You hold to the fifty-year peace and its terms.',operation:'agenda_priority'}]},
      {id:'ji_armenia',name:'The Armenian frontier',year:571,season:0,text:'Armenians under Persian rule chafe at Khosrow’s governors, and some look to Constantinople for help.',choices:[
        {id:'ji_review_armenia',label:'Support the Armenians against Persia',detail:'The Armenian cause takes your attention this season.',operation:'agenda_priority'},
        {id:'ji_keep_armenia',label:'Leave Persian Armenia to Khosrow',detail:'You stay out of Persian Armenia and its quarrels.',operation:'agenda_priority'}]},
      {id:'ji_future',name:'Peace or war with Persia',year:572,season:0,text:'The peace with Persia rests on yearly Roman payments, and voices at court say Rome should pay no longer.',choices:[
        {id:'ji_review_future',label:'Stop paying for the Persian peace',detail:'Your court turns toward a reckoning with Khosrow.',operation:'agenda_priority'},
        {id:'ji_keep_future',label:'Keep paying for peace',detail:'You close these reviews with the peace kept.',operation:'agenda_priority'}]}
    ]},
  khosrow_agenda_568:{id:'khosrow_agenda_568',type:'ruler_agenda',subjectRealmId:'sasanian_568',
    title:'Khosrow: the Sasanian court',intro:'You have ruled from Ctesiphon since 531, and in 568 your court looks to the great houses, the Armenian lords and the peace with Rome. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',stages:[
      {id:'kh_court',name:'The royal household',year:568,season:0,text:'You are in your fifties, and the great houses at Ctesiphon already wonder who will follow you.',choices:[
        {id:'kh_review_court',label:'Settle the question of your heir',detail:'Choosing a successor takes your attention this season.',operation:'agenda_priority'},
        {id:'kh_keep_court',label:'Keep the great houses guessing',detail:'You keep the succession to yourself for now.',operation:'agenda_priority'}]},
      {id:'kh_provinces',name:'Provincial obligations',year:568,season:0,text:'The great houses of Ray and Hamadan and the Armenian lords around Dvin each expect their due from your court.',choices:[
        {id:'kh_review_provinces',label:'Bind Ray, Hamadan and Dvin closer',detail:'The provincial lords take your attention this season.',operation:'agenda_priority'},
        {id:'kh_keep_provinces',label:'Let the provinces keep their terms',detail:'You leave the provincial lords to their own affairs.',operation:'agenda_priority'}]},
      {id:'kh_service',name:'Service and resources',year:568,season:1,text:'Your reforms gave the throne a paid cavalry and a fixed land tax, and both must be kept in order.',choices:[
        {id:'kh_review_service',label:'Keep the paid cavalry in order',detail:'Pay and muster of your horsemen come first this season.',operation:'agenda_priority'},
        {id:'kh_keep_service',label:'Let your commanders serve as before',detail:'You trust your generals and the tax rolls as they stand.',operation:'agenda_priority'}]},
      {id:'kh_routes',name:'Routes and approaches',year:569,season:0,text:'The Turks beyond the Oxus want to sell silk through your lands, and you mean to keep that trade in Persian hands.',choices:[
        {id:'kh_review_routes',label:'Guard the silk roads against the Turks',detail:'Your envoys and garrisons in the east take priority this season.',operation:'agenda_priority'},
        {id:'kh_keep_routes',label:'Keep the peace on every road',detail:'You keep the roads open and avoid new quarrels.',operation:'agenda_priority'}]},
      {id:'kh_armenia',name:'Armenian administration',year:571,season:0,text:'Your governor at Dvin presses the Armenian Christians hard, and their nobles grow restless.',choices:[
        {id:'kh_review_armenia',label:'Calm the Armenian nobles',detail:'Armenian grievances take your attention this season.',operation:'agenda_priority'},
        {id:'kh_keep_armenia',label:'Back your governor at Dvin',detail:'You leave Armenia to your governor’s firm hand.',operation:'agenda_priority'}]},
      {id:'kh_future',name:'Keep or reconsider the peace',year:572,season:0,text:'The fifty-year peace with Constantinople depends on Roman payments, and your court weighs whether it still serves you.',choices:[
        {id:'kh_review_future',label:'Prepare to break the peace with Rome',detail:'Your court turns toward war with Constantinople.',operation:'agenda_priority'},
        {id:'kh_keep_future',label:'Keep the peace with Rome',detail:'You close these reviews with the peace kept.',operation:'agenda_priority'}]}
    ]}
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var draft = FBDATA.bookmarkCompositionDrafts && FBDATA.bookmarkCompositionDrafts.spring_568;
  if (!draft) return;
  try {
    [['justin_568','justin_agenda_568'],['khosrow_568','khosrow_agenda_568']].forEach(function (pair) {
      var unit = draft.starts.find(function (unit) { return unit.definition.id === pair[0]; });
      if (!unit) throw new Error('Missing 568 eastern start unit: ' + pair[0]);
      try {
        unit.storyInstances = {}; unit.storyInstances[pair[1]] = copy(FBDATA.rulerAgendas_568_east[pair[1]]);
        unit.storyAfter = FB.bookmarkCompositions.captureStories('spring_568',pair[0],unit.storyInstances);
      } catch (error) { unit.faults = ['data/story_ruler_agendas_568_east.js: ' + error.message]; }
    });
    var b = draft.bookmark;
    var source = Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]);
    var ids = FBDATA.startScenarios_rulers_568_east.map(function (scenario) { return scenario.id; });
    if (!source.realms.some(function (realm) { return realm.id === 'east_568' && realm.government === 'roman_civic'; }) ||
        !source.realms.some(function (realm) { return realm.id === 'sasanian_568' && realm.government === 'aristocratic_monarchy'; }))
      throw new Error('Missing original eastern courts for 568 revision.');
    var previous = copy(source.starts || []);
    var locations = copy(source.startLocations);
    locations.justin_568 = ['constantinople'];
    locations.khosrow_568 = ['baghdad'];
    b.revisions.eastern_courts_v3 = {
      realms:copy(source.realms),startLocations:locations,settlementLayout:source.settlementLayout,
      starts:previous.concat(ids.filter(function (id) { return previous.indexOf(id) < 0; }))
    };
    b.revision = 'eastern_courts_v3';
  } catch (error) { draft.faults.push({source:'data/story_ruler_agendas_568_east.js',message:error.message}); }
})();
});
