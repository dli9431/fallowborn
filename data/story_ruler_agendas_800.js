FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_800.js","bookmarks":["800"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal priorities do not execute public or family transactions. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_800 = {
  charlemagne_agenda_800:{ id:'charlemagne_agenda_800', type:'ruler_agenda', subjectRealmId:'carolingian_800',
    title:'Charlemagne: court and empire',
    intro:'As Charlemagne, decide where your court turns between your coronation and the sharing of your inheritance. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'ca_household', name:'Your sons and household', year:800, season:3,
        text:'You are at Rome after your coronation. Your son Charles is with you; Louis rules Aquitaine and Pippin rules Italy.', choices:[
          { id:'ca_review_household', label:'Keep Charles at your side', detail:'You turn to Charles and your own household.', operation:'agenda_priority' },
          { id:'ca_keep_household', label:'Trust Louis and Pippin with their courts', detail:'You turn to Aquitaine and Italy, where Louis and Pippin rule.', operation:'agenda_priority' }] },
      { id:'ca_government', name:'Governing your lands', year:801, season:0,
        text:'In 801 your court turns to the government of the lands you rule from Aachen.', choices:[
          { id:'ca_review_government', label:'Put justice in your lands first', detail:'You turn to how your lands are governed and what your people owe.', operation:'agenda_priority' },
          { id:'ca_keep_government', label:'Leave local business to your counts', detail:'You turn elsewhere and trust your counts with business in their lands.', operation:'agenda_priority' }] },
      { id:'ca_learning', name:'Learning and the church', year:802, season:0,
        text:'In 802 your court weighs how strongly to back scholars and churches.', choices:[
          { id:'ca_review_learning', label:'Champion learning at your court', detail:'You turn to scholars, schools and the copying of books.', operation:'agenda_priority' },
          { id:'ca_keep_learning', label:'Put the churches before the scholars', detail:'You turn to the clergy and the churches under your protection.', operation:'agenda_priority' }] },
      { id:'ca_frontiers', name:'Spain and the north', year:802, season:1,
        text:'In 802 your frontiers face the Emirate of Córdoba in Spain and the Danes in the north.', choices:[
          { id:'ca_review_frontiers', label:'Watch the Spanish and Danish frontiers', detail:'You turn to the defense of your lands against Córdoba and the Danes.', operation:'agenda_priority' },
          { id:'ca_keep_frontiers', label:'Seek quiet on both frontiers', detail:'You turn to envoys and peaceful dealings with Córdoba and the Danes.', operation:'agenda_priority' }] },
      { id:'ca_inheritance', name:'Your sons’ inheritance', year:806, season:0,
        text:'In 806 your court asks how Charles, Louis and Pippin will share your inheritance.', choices:[
          { id:'ca_review_inheritance', label:'Make your sons’ shares the priority', detail:'You turn to the inheritance of Charles, Louis and Pippin.', operation:'agenda_priority' },
          { id:'ca_keep_inheritance', label:'Leave the succession to custom', detail:'You turn to your own rule and leave your sons’ shares open.', operation:'agenda_priority' },
          { id:'ca_finish', label:'Close your court agenda', detail:'Ends your court agenda after this last review.', operation:'agenda_finish' }] }
    ] },
  louis_agenda_800:{ id:'louis_agenda_800', type:'ruler_agenda', subjectRealmId:'aquitaine',
    title:'Louis: the Aquitanian court',
    intro:'As Louis, decide where your court at Bordeaux turns while you rule Aquitaine under your father Charlemagne. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'la_household', name:'Your household at Bordeaux', year:800, season:3,
        text:'Your sons Lothair and Pippin live with you at Bordeaux under your father’s rule.', choices:[
          { id:'la_review_household', label:'Put Lothair and Pippin first', detail:'You turn to the upbringing of your young sons.', operation:'agenda_priority' },
          { id:'la_keep_household', label:'Put the Aquitanian court first', detail:'You turn to your court at Bordeaux and the people who serve it.', operation:'agenda_priority' }] },
      { id:'la_resources', name:'Your means in Aquitaine', year:801, season:0,
        text:'In 801 you weigh what Aquitaine can spare for your court and its duties.', choices:[
          { id:'la_review_resources', label:'Put Aquitaine’s revenue first', detail:'You turn to the income and stores of your lands.', operation:'agenda_priority' },
          { id:'la_keep_resources', label:'Put your father’s demands first', detail:'You turn to meeting what you owe Charlemagne.', operation:'agenda_priority' }] },
      { id:'la_frontier', name:'The Spanish frontier', year:801, season:1,
        text:'In 801 your southern frontier faces the Emirate of Córdoba at Barcelona, where your father’s court decides on war.', choices:[
          { id:'la_review_frontier', label:'Watch the road to Barcelona', detail:'You turn to the defense of your lands facing Córdoba.', operation:'agenda_priority' },
          { id:'la_keep_frontier', label:'Seek quiet beyond the Pyrenees', detail:'You turn to calm on the Spanish frontier and business at home.', operation:'agenda_priority' }] },
      { id:'la_father', name:'Your father’s authority', year:802, season:0,
        text:'In 802 you weigh your duty to your father Charlemagne against Aquitaine’s own needs.', choices:[
          { id:'la_review_father', label:'Put your duty to Charlemagne first', detail:'You turn to your obligations to your father’s court.', operation:'agenda_priority' },
          { id:'la_keep_father', label:'Put Aquitaine’s own affairs first', detail:'You turn to the needs of your own people.', operation:'agenda_priority' }] },
      { id:'la_inheritance', name:'Your family’s future', year:806, season:0,
        text:'In 806 your family looks to the sharing of Charlemagne’s inheritance and to your own sons.', choices:[
          { id:'la_review_inheritance', label:'Put your share of the inheritance first', detail:'You turn to Aquitaine’s place in your father’s settlement.', operation:'agenda_priority' },
          { id:'la_keep_inheritance', label:'Put your own sons’ future first', detail:'You turn to what Lothair and Pippin will hold after you.', operation:'agenda_priority' },
          { id:'la_finish', label:'Close your court agenda', detail:'Ends your court agenda after this last review.', operation:'agenda_finish' }] }
    ] }
};

(function () {
  'use strict';
  Object.keys(FBDATA.rulerAgendas_800).forEach(function (id) {
    if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
    FBDATA.storyInstances[id] = FBDATA.rulerAgendas_800[id];
  });
})();
});
