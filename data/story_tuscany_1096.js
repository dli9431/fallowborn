FB.bookmarkSources.stage({"source":"data/story_tuscany_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* These dated reviews record personal priorities. Ordinary government,
   diplomacy and war retain ownership of actual commitments. */
FBDATA.rulerAgendas_tuscany_1096 = {
  matilda_agenda_1096:{ id:'matilda_agenda_1096', type:'ruler_agenda', subjectRealmId:'canossa_1096',
    title:'Matilda: estates and allegiances', intro:'You hold Tuscany from Modena to Pisa and Siena. Emperor Henry IV is still in Italy with his army, and Pope Urban II is in France calling knights to Jerusalem. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'matilda_household', name:'The Canossan household', year:1096, season:0,
        text:'Welf V left you in 1095, and his family is making its peace with Emperor Henry IV.',
        choices:[
          { id:'matilda_review_household', label:'Put your household at Canossa first', detail:'Your attention turns to your household at Canossa.', operation:'agenda_priority' },
          { id:'matilda_keep_household', label:'Let the break with Welf stand', detail:'You leave the separation as it is and turn to governing.', operation:'agenda_priority' }
        ] },
      { id:'matilda_boundaries', name:'Boundaries and obligations', year:1096, season:0,
        text:'In Modena, Lucca, Pisa, Firenze and Siena your estates overlap with church lands and the rights of the towns.',
        choices:[
          { id:'matilda_review_rights', label:'Defend your rights in the Tuscan towns', detail:'You turn to the dues and services the towns and bishops owe you.', operation:'agenda_priority' },
          { id:'matilda_keep_obligations', label:'Honor your gifts to the churches', detail:'You turn to keeping the grants and promises you have made to the Tuscan churches.', operation:'agenda_priority' }
        ] },
      { id:'matilda_separated_alliance', name:'An alliance after separation', year:1096, season:0,
        text:'Without Welf, your allies against Henry IV are his rebel son Conrad and the Lombard towns of Milan, Cremona, Lodi and Piacenza.',
        choices:[
          { id:'matilda_review_alliances', label:'Seek new allies against Henry IV', detail:'You turn to the courts that might stand with you against the emperor.', operation:'agenda_priority' },
          { id:'matilda_keep_alliances', label:'Keep faith with Conrad and the Lombard towns', detail:'You stay with the allies you already have.', operation:'agenda_priority' }
        ] },
      { id:'matilda_imperial_pressure', name:'Imperial pressure', year:1096, season:1,
        text:'Henry IV still keeps his army around Verona and has not given up his war on you.',
        choices:[
          { id:'matilda_prioritize_defense', label:'Hold the castles of the Apennines', detail:'You turn to the castles and garrisons that guard Canossa.', operation:'agenda_priority' },
          { id:'matilda_consider_negotiation', label:'Open talks with Henry IV', detail:'You turn to seeking terms with the emperor, if he will listen.', operation:'agenda_priority' },
          { id:'matilda_keep_frontier', label:'Keep your forces where they stand', detail:'You leave your garrisons as they are and watch the emperor.', operation:'agenda_priority' }
        ] },
      { id:'matilda_papal_relationship', name:'The papal relationship', year:1096, season:1,
        text:'Pope Urban II is coming back to Italy from France and counts on you as his firmest ally against Henry IV.',
        choices:[
          { id:'matilda_prioritize_cooperation', label:'Stand with Pope Urban II', detail:'You turn to the pope’s cause and his reform of the church in Italy.', operation:'agenda_priority' },
          { id:'matilda_prioritize_local_duties', label:'Put Tuscany ahead of Rome', detail:'You turn to your own lands before the pope’s affairs.', operation:'agenda_priority' }
        ] },
      { id:'matilda_sustainable_commitments', name:'What can be sustained', year:1096, season:2,
        text:'Years of war with Henry IV have drained your treasury, and soldiers, castles and gifts to the church all draw on it.',
        choices:[
          { id:'matilda_review_affordable_defense', label:'Pay only for the defense you can afford', detail:'You turn to keeping only the garrisons your treasury can pay.', operation:'agenda_priority' },
          { id:'matilda_retain_commitments', label:'Keep your promises and gifts as they are', detail:'You turn to the payments and gifts you have already promised.', operation:'agenda_priority' }
        ] },
      { id:'matilda_changing_jurisdiction', name:'A changing jurisdiction', year:1096, season:2,
        text:'Pisa, Lucca and the other towns are taking more of their own government, and not every old Canossan claim still holds.',
        choices:[
          { id:'matilda_review_jurisdiction', label:'Work with the towns you still rule', detail:'You turn to the counties and towns that still answer to you.', operation:'agenda_priority' },
          { id:'matilda_keep_jurisdiction', label:'Leave the towns and bishops their rights', detail:'You turn to other business and leave the towns’ rights as they are.', operation:'agenda_priority' }
        ] },
      { id:'matilda_continuation', name:'Continue governing', year:1096, season:3,
        text:'Winter 1096: Henry IV is still in Italy, and the armies bound for Jerusalem have marched east. Close your opening program here.',
        choices:[
          { id:'matilda_finish_review', label:'Conclude the opening review', detail:'Your opening program ends here; your wars and alliances go on as they stand.', operation:'agenda_finish' },
          { id:'matilda_continue_governing', label:'Keep governing Tuscany as before', detail:'You close the review with your attention on governing Tuscany.', operation:'agenda_priority' }
        ] }
    ] }
};

FBDATA.openingProfiles_tuscany_1096 = {
  opening_matilda_1096:{ id:'opening_matilda_1096', type:'opening_profile',
    title:'Matilda’s Opening Goals', intro:'Three goals for your first year as ruler of Tuscany.',
    scenarioIds:['matilda_1096'], provinceIds:['modena'], officeRealmId:'canossa_1096', requires:['matilda_agenda_1096'],
    goals:[
      { id:'household_review', name:'Decide on your household at Canossa', text:'Completed when you choose a course at The Canossan household in your court agenda.', office:true,
        criterion:{ kind:'story_choice', storyId:'matilda_agenda_1096', choiceIds:['matilda_review_household','matilda_keep_household'] } },
      { id:'local_obligations', name:'Decide on your rights in the towns', text:'Completed when you choose a course at Boundaries and obligations in your court agenda.', office:true,
        criterion:{ kind:'story_choice', storyId:'matilda_agenda_1096', choiceIds:['matilda_review_rights','matilda_keep_obligations'] } },
      { id:'opening_conclusion', name:'Conclude the opening review', text:'Completed when you answer the last review, Continue governing, while you still rule Tuscany.', office:true,
        criterion:{ kind:'story_choice', storyId:'matilda_agenda_1096', choiceIds:['matilda_finish_review','matilda_continue_governing'] } }
    ],
    contacts:[
      { id:'imperial_court', label:'The emperor', text:'Henry IV has fought you since 1090 and is now with his army in northern Italy.', linkKind:'target', required:false,
        person:{ source:'realm_ruler', realmId:'hre_1096' } },
      { id:'papal_court', label:'The pope', text:'Urban II is your closest ally against Henry IV and leads the reform party in the church.', linkKind:'target', required:false,
        person:{ source:'realm_ruler', realmId:'papacy_1096' } }
    ] }
};

Object.assign(FBDATA.storyInstances, FBDATA.rulerAgendas_tuscany_1096, FBDATA.openingProfiles_tuscany_1096);
});
