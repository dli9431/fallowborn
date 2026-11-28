FB.bookmarkSources.stage({"source":"data/story_valencia_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal reviews use the existing government, household and military owners. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_valencia_1096 = {
  valencia_agenda_1096:{ id:'valencia_agenda_1096', type:'ruler_agenda', subjectRealmId:'valencia_1096',
    title:'Valencia: Household and Lordship',
    intro:'You have held Valencia since June 1094, a Christian lord over a mostly Muslim city, with the Almoravids of Yusuf ibn Tashfin to the south. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'city', name:'A city already held', year:1096, season:0,
        text:'You took Valencia in June 1094 and beat the Almoravid army that came to retake it at Cuarte that October. Murviedro, inside your county on the map, still holds out against you.',
        choices:[
          { id:'city_administration', label:'Put the city’s government first', detail:'You turn to Valencia’s officials, markets and courts.', operation:'agenda_priority' },
          { id:'city_defense', label:'Ready Valencia against the Almoravids', detail:'You turn to Valencia’s walls and the men who guard them.', operation:'agenda_priority' },
          { id:'city_retain', label:'Leave the city’s business as it stands', detail:'You keep Valencia’s government and purse as they are.', operation:'agenda_priority' }
        ] },
      { id:'household', name:'Jimena and the children', year:1096, season:0,
        text:'Jimena, your son Diego and your daughters Cristina and Maria live with you in Valencia.',
        choices:[
          { id:'household_attention', label:'Give Jimena and the children your time', detail:'You turn to Jimena, Diego, Cristina and Maria.', operation:'agenda_priority' },
          { id:'household_retain', label:'Leave family matters to Jimena', detail:'Jimena runs the household while you see to other business.', operation:'agenda_priority' }
        ] },
      { id:'communities', name:'Residents and obligations', year:1096, season:0,
        text:'Most of Valencia’s people are Muslims who stayed after you took the city in 1094.',
        choices:[
          { id:'communities_review', label:'Settle what Valencia’s Muslims owe you', detail:'You turn to the taxes and rights of the city’s Muslim residents.', operation:'agenda_priority' },
          { id:'communities_retain', label:'Keep the terms of the 1094 surrender', detail:'You leave the Muslims’ judges, mosques and dues as they are.', operation:'agenda_priority' }
        ] },
      { id:'funds', name:'Paying for government and defense', year:1096, season:1,
        text:'Your knights, the walls and the city’s officials are all paid from your private purse.',
        choices:[
          { id:'funds_prepare', label:'Spend on soldiers before savings', detail:'You turn to hiring and paying troops to hold Valencia.', operation:'agenda_priority' },
          { id:'funds_reserve', label:'Build up a reserve in your purse', detail:'You turn to saving; the reserve goal needs {money:120} in your private purse.', operation:'agenda_priority' },
          { id:'funds_retain', label:'Keep spending as it is', detail:'You leave your purse and payments as they stand.', operation:'agenda_priority' }
        ] },
      { id:'neighbors', name:'Neighboring courts', year:1096, season:1,
        text:'You once served Alfonso VI of Leon and Castile, and Peter I of Aragon is a Christian neighbor worth courting.',
        choices:[
          { id:'neighbors_approach', label:'Court Alfonso VI and Peter I', detail:'You turn to sending envoys and gifts to the Christian kings.', operation:'agenda_priority' },
          { id:'neighbors_retain', label:'Leave relations with the kings as they are', detail:'You turn to Valencia and leave the Christian courts alone for now.', operation:'agenda_priority' }
        ] },
      { id:'approaches', name:'The approaches to Valencia', year:1096, season:2,
        text:'The Almoravids hold Denia and Murcia to the south and mean to take Valencia back.',
        choices:[
          { id:'approaches_defend', label:'Guard the roads from the south', detail:'You turn to the walls and the southern approaches.', operation:'agenda_priority' },
          { id:'approaches_diplomacy', label:'Seek allies against the Almoravids', detail:'You turn to Peter I of Aragon and the other Christian courts for help.', operation:'agenda_priority' },
          { id:'approaches_retain', label:'Keep watch and wait', detail:'You hold to your plans and watch the south.', operation:'agenda_priority' }
        ] },
      { id:'worship', name:'Household and worship', year:1096, season:3,
        text:'Valencia’s Christians want a cathedral and a bishop of their own, and your children are of an age to marry.',
        choices:[
          { id:'worship_household', label:'Attend to family and church', detail:'You turn to Jimena and the children and to Valencia’s Christian clergy.', operation:'agenda_priority' },
          { id:'worship_defense', label:'Keep the walls first', detail:'You keep your mind on Valencia’s defense this winter.', operation:'agenda_priority' },
          { id:'worship_retain', label:'Leave family and church as they are', detail:'You turn to other business this winter.', operation:'agenda_priority' }
        ] },
      { id:'continuing', name:'A continuing lordship', year:1097, season:0,
        text:'Spring 1097: you have held Valencia for nearly three years, and the Almoravids still threaten it from the south.',
        choices:[
          { id:'continuing_consolidate', label:'Make Valencia secure for your heirs', detail:'You close the reviews with Valencia’s defense and government as your aim.', operation:'agenda_priority' },
          { id:'continuing_finish', label:'Close the opening program', detail:'The reviews end here, with your lands and family as they stand.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_valencia_1096 = {
  valencia_opening_profile_1096:{ id:'valencia_opening_profile_1096', type:'opening_profile',
    title:'Valencia: Optional Opening Goals',
    intro:'Three goals for your first year as lord of Valencia.',
    scenarioIds:['rodrigo_diaz_1096'], provinceIds:['valencia'], officeRealmId:'valencia_1096',
    requires:['valencia_agenda_1096'],
    goals:[
      { id:'reserve', name:'Keep {money:120} in reserve', text:'Completed when your private purse holds {money:120}.', criterion:{ kind:'reserve', amount:120 } },
      { id:'paid_defense', name:'Pay for a field force', text:'Completed when your treasury pays for soldiers while you rule Valencia.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'valencia_1096' } },
      { id:'conclude', name:'Complete the court reviews', text:'Completed when you answer the last review, A continuing lordship; setting the program aside leaves it unfinished.', office:true,
        criterion:{ kind:'story_choice', storyId:'valencia_agenda_1096', choiceIds:['continuing_consolidate','continuing_finish'] } }
    ],
    contacts:[
      { id:'jimena', label:'Your wife Jimena', text:'She keeps your household in Valencia.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'jimena_diaz' } },
      { id:'diego', label:'Your son Diego', text:'Your only son, a young man of fighting age at home in Valencia.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'diego_rodriguez' } },
      { id:'cristina', label:'Your daughter Cristina', text:'She is unmarried and lives with you in Valencia.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'cristina_rodriguez' } },
      { id:'maria', label:'Your daughter Maria', text:'She is unmarried and lives with you in Valencia.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'maria_rodriguez' } }
    ] }
};

(function () {
  'use strict';
  [FBDATA.rulerAgendas_valencia_1096,FBDATA.openingProfiles_valencia_1096].forEach(function (table) {
    Object.keys(table).forEach(function (id) {
      if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
      FBDATA.storyInstances[id] = table[id];
    });
  });
})();
});
