FB.bookmarkSources.stage({source:'data/story_mobile_principal.js',bookmarks:['1204'],catalogs:[],shared:[]}, function (FBDATA) {
FBDATA.rulerAgendas_mobile_principal = {
  qipchaq_principal_agenda_1204:{id:'qipchaq_principal_agenda_1204',type:'ruler_agenda',subjectRealmId:'qipchaq_following_1204',
    title:'Leading the eastern following',intro:'Review the actual people, separate accounts and outside consent. These costless priorities grant no public action or historical outcome. You may set the agenda aside.',
    stages:[
      {id:'members',name:'The members’ voices',year:1204,season:0,
        text:'The river and steppe members retain their current weights and recruitment pledges. Open Mobile coalition in Deeds to review them. Leadership is a member selection, not an inheritable county or a claim over every Qipchaq group.',
        choices:[{id:'review_members',label:'Keep the members’ voices in view',detail:'Record this priority without a ballot, changed pledge or new principal.',operation:'agenda_priority'},
          {id:'keep_members',label:'Retain present arrangements',detail:'Leave every member and pledge unchanged.',operation:'agenda_priority'}]},
      {id:'stores',name:'Finite stores and separate accounts',year:1204,season:0,
        text:'The camp and field host hold their actual provisions. Public recruitment and purchases spend the coalition treasury through their ordinary reviews. Your private purse is a household account; it is not an allowance from those stores.',
        choices:[{id:'review_stores',label:'Prioritize the existing stores',detail:'Record attention to supplies without food, money, recruitment or a purchase.',operation:'agenda_priority'},
          {id:'keep_stores',label:'Make no new spending plan',detail:'Leave all stocks and accounts unchanged.',operation:'agenda_priority'}]},
      {id:'neighbors',name:'Outside consent and succession',year:1204,season:0,
        text:'The nearby Khwarazmian court controls its own land. Pasture, passage, tribute and service require actual member assent and outside acceptance. Your death opens the existing member selection. A private heir receives no automatic coalition leadership.',
        choices:[{id:'review_neighbors',label:'Leave negotiations to current reviews',detail:'Complete the agenda without an agreement, county, tribute obligation or promised successor.',operation:'agenda_priority'},
          {id:'keep_neighbors',label:'Conclude with present relations',detail:'Conclude without a political commitment.',operation:'agenda_priority'}]}
    ]}
};
FBDATA.openingProfiles_mobile_principal = {
  opening_qipchaq_principal_1204:{id:'opening_qipchaq_principal_1204',type:'opening_profile',
    title:'The following’s opening goals',intro:'Optional goals record personal reviews without rewards. Ordinary mobile decisions retain their own authority, cost and consent.',
    scenarioIds:['qipchaq_principal_1204'],provinceIds:['lower_syr_darya'],officeRealmId:'qipchaq_following_1204',requires:['qipchaq_principal_agenda_1204'],
    goals:[
      {id:'members',name:'Review the existing members',text:'Consider the member voices or retain their present arrangements.',office:true,criterion:{kind:'story_choice',storyId:'qipchaq_principal_agenda_1204',choiceIds:['review_members','keep_members']}},
      {id:'stores',name:'Distinguish public and private resources',text:'Review finite supplies or make no new spending plan.',office:true,criterion:{kind:'story_choice',storyId:'qipchaq_principal_agenda_1204',choiceIds:['review_stores','keep_stores']}},
      {id:'neighbors',name:'Consider consent and later leadership',text:'Conclude the review without requiring a treaty or hereditary command.',office:true,criterion:{kind:'story_choice',storyId:'qipchaq_principal_agenda_1204',choiceIds:['review_neighbors','keep_neighbors']}}
    ],contacts:[{id:'neighbor',label:'The neighboring Khwarazmian ruler',text:'A living outside court, not an automatic payer or grantor. Current access and consent remain necessary.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'khwarazm_1204'}}]}
};
Object.assign(FBDATA.storyInstances,FBDATA.rulerAgendas_mobile_principal,FBDATA.openingProfiles_mobile_principal);
});
