FB.bookmarkSources.stage({source:'data/story_mobile_principal.js',bookmarks:['1204'],catalogs:[],shared:[]}, function (FBDATA) {
FBDATA.rulerAgendas_mobile_principal = {
  qipchaq_principal_agenda_1204:{id:'qipchaq_principal_agenda_1204',type:'ruler_agenda',subjectRealmId:'qipchaq_following_1204',
    title:'Guiding the eastern Qipchaq',intro:'You lead the eastern Qipchaq following, and its members, food stores and Khwarazmian neighbors all need your attention. These priorities shape your following’s story; votes, payments, agreements and wars go through Mobile coalition in Deeds.',
    stages:[
      {id:'members',name:'The river and steppe members',year:1204,season:0,
        text:'The river and steppe members each carry their own weight in votes and pledge their own fighters. Mobile coalition in Deeds shows where each stands.',
        choices:[{id:'review_members',label:'Put the members’ voices first',detail:'You turn to what the river and steppe members want from you.',operation:'agenda_priority'},
          {id:'keep_members',label:'Hold the river and steppe balance',detail:'You turn to keeping each member’s place in the following as it stands.',operation:'agenda_priority'}]},
      {id:'stores',name:'Camp stores and your purse',year:1204,season:0,
        text:'The camp and the host carry their own food, and recruiting and buying spend the following’s treasury. Your private purse is your household’s money, kept apart from both.',
        choices:[{id:'review_stores',label:'Put the camp’s food first',detail:'You turn to keeping the camp and the host fed.',operation:'agenda_priority'},
          {id:'keep_stores',label:'Plan no new spending',detail:'You turn to holding the treasury ready for later needs.',operation:'agenda_priority'}]},
      {id:'neighbors',name:'Khwarazm and your successor',year:1204,season:0,
        text:'Khwarazm holds the land around you, so pasture, passage, tribute or service need both your members’ assent and its acceptance. When you die the members choose the next leader; your heir does not inherit command.',
        choices:[{id:'review_neighbors',label:'Seek terms with Khwarazm',detail:'You turn to the talks your following will need with the Khwarazmian court.',operation:'agenda_priority'},
          {id:'keep_neighbors',label:'Keep relations with Khwarazm steady',detail:'You turn to your own camp and leave dealings with Khwarazm as they stand.',operation:'agenda_priority'}]}
    ]}
};
FBDATA.openingProfiles_mobile_principal = {
  opening_qipchaq_principal_1204:{id:'opening_qipchaq_principal_1204',type:'opening_profile',
    title:'First goals for the eastern Qipchaq',intro:'Three optional goals ask what you put first for your members, your stores and your dealings with Khwarazm.',
    scenarioIds:['qipchaq_principal_1204'],provinceIds:['lower_syr_darya'],officeRealmId:'qipchaq_following_1204',requires:['qipchaq_principal_agenda_1204'],
    goals:[
      {id:'members',name:'Decide how to treat your members',text:'In Deeds, open Guiding the eastern Qipchaq and choose your stance toward the river and steppe members to complete this goal.',office:true,criterion:{kind:'story_choice',storyId:'qipchaq_principal_agenda_1204',choiceIds:['review_members','keep_members']}},
      {id:'stores',name:'Set a course for the stores',text:'In Deeds, open Guiding the eastern Qipchaq and choose a course for the camp’s food and treasury to complete this goal.',office:true,criterion:{kind:'story_choice',storyId:'qipchaq_principal_agenda_1204',choiceIds:['review_stores','keep_stores']}},
      {id:'neighbors',name:'Choose your stance toward Khwarazm',text:'In Deeds, open Guiding the eastern Qipchaq and choose how to deal with Khwarazm to complete this goal.',office:true,criterion:{kind:'story_choice',storyId:'qipchaq_principal_agenda_1204',choiceIds:['review_neighbors','keep_neighbors']}}
    ],contacts:[{id:'neighbor',label:'Your neighbor, the ruler of Khwarazm',text:'The Khwarazmian ruler holds the land around your camp and decides what terms your following gets there.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'khwarazm_1204'}}]}
};
Object.assign(FBDATA.storyInstances,FBDATA.rulerAgendas_mobile_principal,FBDATA.openingProfiles_mobile_principal);
});
