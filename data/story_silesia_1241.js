FB.bookmarkSources.stage({"source":"data/story_silesia_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal court reviews compose existing decisions without public effects. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_silesia_1241 = {
  silesia_agenda_1241:{ id:'silesia_agenda_1241', type:'ruler_agenda', subjectRealmId:'silesia_1241',
    title:'Henry: a continuing ducal court',
    intro:'Mongol columns have crossed into Little Poland, and your court at Wrocław answers for Silesia and Kraków alike. Set your course for your family, your treasury, Bohemia and the defense. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'ducal_responsibilities', name:'Silesia and Kraków together', year:1241, season:0,
        text:'You rule Silesia from Wrocław and hold Kraków as high duke of Poland. Decide which of the two needs you first.',
        choices:[
          { id:'henry_review_holdings', label:'Put the government of Silesia first', detail:'You turn to the towns, castles and revenues around Wrocław.', operation:'agenda_priority' },
          { id:'henry_keep_responsibilities', label:'Keep Kraków as close as Silesia', detail:'You divide your attention between Wrocław and Kraków.', operation:'agenda_priority' }
        ] },
      { id:'ducal_household', name:'Anna and the children', year:1241, season:0,
        text:'Anna of Bohemia and your six children live at Wrocław, and your sons Boleslaw and Mieszko are nearly grown. Decide how much the household should weigh on you while the east is unsettled.',
        choices:[
          { id:'henry_attend_family', label:'Put Anna and the children first', detail:'You turn to your wife, your heirs and their safety.', operation:'agenda_priority' },
          { id:'henry_keep_household', label:'Leave the household to Anna', detail:'You trust Anna with the household and keep to the duties of rule.', operation:'agenda_priority' }
        ] },
      { id:'ducal_resources', name:'Paying for the year ahead', year:1241, season:0,
        text:'Your treasury at Wrocław pays for the court, the castles and any men you call up. Decide whether to spare it or keep spending as before.',
        choices:[
          { id:'henry_conserve_resources', label:'Spare the treasury at Wrocław', detail:'You make saving money for harder months your concern.', operation:'agenda_priority' },
          { id:'henry_keep_resources', label:'Keep paying as before', detail:'You hold to the payments the court already makes.', operation:'agenda_priority' }
        ] },
      { id:'bohemian_connection', name:'The Bohemian connection', year:1241, season:0,
        text:'Anna is the sister of Wenceslas I of Bohemia, whose lands border yours to the south. Decide whether that tie deserves your attention now.',
        choices:[
          { id:'henry_consider_diplomacy', label:'Look to Wenceslas in Prague', detail:'You turn to your brother-in-law in Prague; an alliance still needs his agreement.', operation:'agenda_priority' },
          { id:'henry_keep_domestic_priority', label:'Keep to your own lands', detail:'You leave Bohemia to Wenceslas and attend to Silesia and Kraków.', operation:'agenda_priority' }
        ] },
      { id:'ducal_preparations', name:'Preparing for the Mongols', year:1241, season:0,
        text:'Castles, stores and fighting men cost money you must find. Decide whether defense comes first while news of the Mongols comes from the east.',
        choices:[
          { id:'henry_prioritize_defense', label:'Put the defense of Silesia first', detail:'You turn to walls, supplies and the men you can afford.', operation:'agenda_priority' },
          { id:'henry_keep_preparations', label:'Keep your present preparations', detail:'You leave the castles and garrisons as they stand.', operation:'agenda_priority' }
        ] },
      { id:'ducal_information', name:'News from the east', year:1241, season:0,
        text:'News from the east speaks of Mongol columns in Little Poland. Decide how much to trust it.',
        choices:[
          { id:'henry_review_information', label:'Take the news from Kraków seriously', detail:'You turn to the reports from Little Poland and the war on the map.', operation:'agenda_priority' },
          { id:'henry_keep_information', label:'Wait for surer word', detail:'You set the rumors aside until clearer news comes.', operation:'agenda_priority' }
        ] },
      { id:'ducal_response', name:'Meeting the Mongols', year:1241, season:0,
        text:'You can gather your men to face the Mongols, or hold your castles and wait for them to show their road. Decide where your answer begins.',
        choices:[
          { id:'henry_review_response', label:'Make the war your first concern', detail:'You turn to your armies and the road toward the Mongols.', operation:'agenda_priority' },
          { id:'henry_keep_response', label:'Hold your castles and wait', detail:'You keep your men where they are and watch the Mongols’ next move.', operation:'agenda_priority' }
        ] },
      { id:'continuing_court', name:'A continuing court', year:1241, season:1,
        text:'By summer the court’s first questions are answered. Your family, your lands and any war still running go on from here.',
        choices:[
          { id:'henry_continue_court', label:'Carry your priorities forward', detail:'You keep the course you have set for Silesia and Kraków.', operation:'agenda_priority' },
          { id:'henry_finish_reviews', label:'Close the court agenda', detail:'You finish this agenda, and any war still running goes on.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_silesia_1241 = {
  opening_silesia_1241:{ id:'opening_silesia_1241', type:'opening_profile',
    title:'The duke’s first goals and people',
    intro:'Three aims for your first months at Wrocław, with the Mongols to the east.',
    scenarioIds:['henry_pious_1241'], provinceIds:['wroclaw'], officeRealmId:'silesia_1241',
    requires:['silesia_agenda_1241'],
    goals:[
      { id:'attend_household', name:'Decide on Anna and the children', text:'Done when you answer the step Anna and the children in your court agenda.', office:true,
        criterion:{ kind:'story_choice', storyId:'silesia_agenda_1241', choiceIds:['henry_attend_family','henry_keep_household'] } },
      { id:'weigh_preparations', name:'Choose how to prepare for the Mongols', text:'Done when you answer the step Preparing for the Mongols in your court agenda.', office:true,
        criterion:{ kind:'story_choice', storyId:'silesia_agenda_1241', choiceIds:['henry_prioritize_defense','henry_keep_preparations'] } },
      { id:'continuing_court', name:'Set the court’s course for summer', text:'Done when you answer the last step of your court agenda, A continuing court.', office:true,
        criterion:{ kind:'story_choice', storyId:'silesia_agenda_1241', choiceIds:['henry_continue_court','henry_finish_reviews'] } }
    ],
    contacts:[
      { id:'wenceslas', label:'Wenceslas I of Bohemia', text:'Your brother-in-law, Anna’s brother, rules Bohemia from Prague.', linkKind:'kin', required:false,
        person:{ source:'realm_ruler', realmId:'bohemia_1241' } }
    ] }
};

(function () {
  'use strict';
  [FBDATA.rulerAgendas_silesia_1241,FBDATA.openingProfiles_silesia_1241].forEach(function (table) {
    Object.keys(table).forEach(function (id) {
      if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
      FBDATA.storyInstances[id] = table[id];
    });
  });
})();
});
