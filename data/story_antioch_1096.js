FB.bookmarkSources.stage({"source":"data/story_antioch_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal priorities leave every political transaction with its ordinary owner. */
FBDATA.rulerAgendas_antioch_1096 = {
  antioch_agenda_1096:{ id:'antioch_agenda_1096', type:'ruler_agenda', subjectRealmId:'antioch_1096',
    title:'Antioch: governing a changing frontier',
    intro:'As Yaghi-Siyan, govern Antioch in 1096 between the rival courts of Aleppo and Damascus, far from the sultan at Isfahan. You can set the program aside at any time. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'as01_authority', name:'Governor of Antioch', year:1096, season:0,
        text:'You govern Antioch in the sultan’s name, but the city and its lands answer to you.',
        choices:[{ id:'as01_local_rule', label:'Put the government of Antioch first', detail:'Your court turns to the offices and lands around the city.', operation:'agenda_priority' }] },
      { id:'as02_working_city', name:'The working city', year:1096, season:0,
        text:'Antioch needs sound accounts and steady upkeep for its walls, markets and people.',
        choices:[{ id:'as02_upkeep', label:'Keep the city in good repair', detail:'Your court turns to the city’s walls, markets and buildings.', operation:'agenda_priority' }] },
      { id:'as03_aleppo', name:'Relations with Aleppo', year:1096, season:1,
        text:'Aleppo, east of Antioch, has its own Seljuk ruler and its own designs on your city. Decide whether to court it.',
        choices:[
          { id:'as03_relations', label:'Seek good relations with Aleppo', detail:'Your court turns to envoys and gifts for Aleppo.', operation:'agenda_priority' },
          { id:'as03_retain', label:'Keep Aleppo at a distance', detail:'Your court leaves relations with Aleppo as they stand.', operation:'agenda_priority' }
        ] },
      { id:'as04_damascus', name:'Damascus to the south', year:1096, season:2,
        text:'Damascus, Aleppo’s rival to the south, may welcome you as a friend if you turn to it.',
        choices:[
          { id:'as04_approach', label:'Turn to Damascus', detail:'Your court looks to Damascus for friendship and support.', operation:'agenda_priority' },
          { id:'as04_retain', label:'Keep your present ties', detail:'Your court stays as it is with Aleppo and Damascus and starts no quarrel.', operation:'agenda_priority' }
        ] },
      { id:'as05_provisions', name:'Provision within your means', year:1096, season:3,
        text:'Grain stores and sound walls carry Antioch through a hard season. Decide what the treasury can spare for them.',
        choices:[{ id:'as05_affordable', label:'Lay in what supplies you can afford', detail:'Your court turns to grain, repairs and the city’s defenders.', operation:'agenda_priority' }] },
      { id:'as06_jurisdiction', name:'Antioch’s lands in 1097', year:1097, season:0,
        text:'Look again at the lands around Antioch that still answer to you, from the coast to the road toward Edessa.',
        choices:[
          { id:'as06_review', label:'Take stock of Antioch’s lands', detail:'Your court turns to the towns and estates it still holds.', operation:'agenda_priority' },
          { id:'as06_conclude', label:'Conclude the governing program', detail:'Ends the program; your government and any war under way carry on.', operation:'agenda_finish' }
        ] },
      { id:'as07_preparedness', name:'Defense if needed', year:1097, season:2,
        text:'If hostile armies approach Antioch, your defenders and your neighbors’ help will decide the city’s fate. If not, its civil business goes on.',
        choices:[
          { id:'as07_defense', label:'Prepare Antioch for a siege', detail:'Your court turns to the walls, the stores and the garrison.', operation:'agenda_priority' },
          { id:'as07_civil', label:'Keep to the city’s civil business', detail:'Your court stays with trade, justice and upkeep.', operation:'agenda_priority' }
        ] },
      { id:'as08_continuation', name:'A continuing government', year:1097, season:3,
        text:'Winter 1097 closes the program. Your household, your city and any war you are fighting carry on.',
        choices:[
          { id:'as08_continue', label:'Govern on as you are', detail:'Your court closes its reviews and turns back to daily rule.', operation:'agenda_priority' },
          { id:'as08_finish', label:'Finish the opening program', detail:'Ends the program now; what happens next decides the city’s fate.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_antioch_1096 = {
  opening_antioch_1096:{ id:'opening_antioch_1096', type:'opening_profile',
    title:'Antioch goals and household',
    intro:'Three goals for your first years at Antioch: collect revenue, keep the city in repair and see your governing program through. They bring no reward of their own.',
    scenarioIds:['yaghi_siyan_1096'], provinceIds:['antioch'], officeRealmId:'antioch_1096',
    requires:['antioch_agenda_1096'],
    goals:[
      { id:'antioch_accounts', name:'Collect public revenue', text:'Done when your treasury receives public revenue from the lands of Antioch.', office:true,
        criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'antioch_1096' } },
      { id:'antioch_upkeep', name:'Put the city’s upkeep first', text:'Done when you choose Keep the city in good repair in your governing program.', office:true,
        criterion:{ kind:'story_choice', storyId:'antioch_agenda_1096', choiceIds:['as02_upkeep'] } },
      { id:'antioch_continuation', name:'Conclude the governing program', text:'Done when you conclude or finish your governing program, in spring 1097 or at its close in winter.',
        criterion:{ kind:'story_choice', storyId:'antioch_agenda_1096', choiceIds:['as06_conclude','as08_continue','as08_finish'] } }
    ],
    contacts:[
      { id:'seljuk_court', label:'The Seljuk sultan', text:'Berkyaruk, the Seljuk sultan at Isfahan, rules the wider empire in whose name you govern Antioch.', linkKind:'target', required:true,
        person:{ source:'realm_ruler', realmId:'seljuk_1096' } }
    ] }
};
Object.assign(FBDATA.storyInstances, FBDATA.rulerAgendas_antioch_1096, FBDATA.openingProfiles_antioch_1096);
});
