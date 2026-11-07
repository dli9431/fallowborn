FB.bookmarkSources.stage({source:'data/story_opening_goals_634.js',bookmarks:['634'],catalogs:[],shared:[]}, function (FBDATA) {
/* Literal presentation uses the existing openingProfile extraction owners. */
FBDATA.openingProfiles_634 = {
  opening_umar_634:{id:'opening_umar_634',type:'opening_profile',
    title:'Optional priorities at Medina',intro:'These goals observe committed personal reviews. They pay no reward and grant no public powers. Retaining present arrangements is a complete course.',
    scenarioIds:['umar_634'],provinceIds:['medina'],officeRealmId:'rashidun_634',requires:['umar_agenda_634'],
    goals:[
      {id:'mandate',name:'Review the existing mandate',text:'Commit a mandate priority or retain the present arrangements.',office:true,criterion:{kind:'story_choice',storyId:'umar_agenda_634',choiceIds:['umar_review_mandate_634','umar_retain_mandate_634']}},
      {id:'syria',name:'Consider the Syrian situation',text:'Commit a Syrian priority or retain the present arrangements. No campaign is required.',office:true,criterion:{kind:'story_choice',storyId:'umar_agenda_634',choiceIds:['umar_review_syria_634','umar_retain_syria_634']}},
      {id:'iraq',name:'Consider the Iraqi situation',text:'Commit an Iraqi priority or retain the present arrangements independently of Syria.',office:true,criterion:{kind:'story_choice',storyId:'umar_agenda_634',choiceIds:['umar_review_iraq_634','umar_retain_iraq_634']}}
    ],contacts:[{id:'imperial_ruler',label:'The opening imperial ruler',text:'Heraclius is an existing distant court target. This link promises no audience, friendship, treaty or access.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'byzantium_634'}}]},
  opening_umar_court_634:{id:'opening_umar_court_634',type:'opening_profile',
    title:'Optional priorities at Medina',intro:'These goals observe committed court reviews and actual frontier decisions. They pay no reward. Both fronts may remain quiet.',
    scenarioIds:['umar_634'],provinceIds:['medina'],officeRealmId:'rashidun_634',requires:['umar_court_agenda_634'],
    goals:[
      {id:'mandate',name:'Review the mandate and accounts',text:'Commit a priority for the current mandate and accounts, or retain present arrangements.',office:true,criterion:{kind:'story_choice',storyId:'umar_court_agenda_634',choiceIds:['umar_prioritize_accounts','umar_keep_accounts']}},
      {id:'syria',name:'Choose a Syrian course',text:'Commit an eligible campaign decision, acknowledge its actual conclusion, choose ordinary diplomacy or retain present arrangements. No conquest is required.',office:true,criterion:{kind:'story_choice',storyId:'umar_court_agenda_634',choiceIds:['umar_face_syria','umar_decline_syria','umar_record_syria','umar_keep_syria']}},
      {id:'iraq',name:'Choose an independent Iraqi course',text:'Commit an eligible Iraqi decision, acknowledge its actual conclusion, choose ordinary diplomacy or retain present arrangements. Syria supplies no Iraqi outcome.',office:true,criterion:{kind:'story_choice',storyId:'umar_court_agenda_634',choiceIds:['umar_face_iraq','umar_decline_iraq','umar_record_iraq','umar_keep_iraq']}}
    ],contacts:[{id:'imperial_ruler',label:'The opening imperial ruler',text:'Heraclius is an existing distant court target. This link promises no audience, friendship, treaty or access.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'byzantium_634'}}]},
  opening_heraclius_634:{id:'opening_heraclius_634',type:'opening_profile',
    title:'Optional imperial priorities',intro:'These goals observe committed personal reviews without rewards. Ordinary government and diplomacy keep their own rules.',
    scenarioIds:['heraclius_634'],provinceIds:['constantinople'],officeRealmId:'byzantium_634',requires:['heraclius_agenda_634'],
    goals:[
      {id:'court',name:'Review the present court',text:'Commit a court priority or retain present arrangements.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_agenda_634',choiceIds:['heraclius_review_court_634','heraclius_retain_court_634']}},
      {id:'east',name:'Review actual eastern holdings',text:'Commit an eastern priority or retain present arrangements. No territorial change is required.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_agenda_634',choiceIds:['heraclius_review_east_634','heraclius_retain_east_634']}},
      {id:'continuation',name:'Conclude the imperial reviews',text:'Conclude the personal program or complete its final review while retaining present arrangements.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_agenda_634',choiceIds:['heraclius_conclude_634','heraclius_retain_conclusion_634']}}
    ],contacts:[{id:'medinan_ruler',label:'The opening Medinan ruler',text:'Umar is the existing political incumbent at Medina. This directory link supplies no audience, allegiance, friendship or public authority.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'rashidun_634'}}]},
  opening_heraclius_court_634:{id:'opening_heraclius_court_634',type:'opening_profile',
    title:'Optional imperial priorities',intro:'These goals observe committed administration and frontier reviews without rewards. Peaceful continuation remains a complete course.',
    scenarioIds:['heraclius_634'],provinceIds:['constantinople'],officeRealmId:'byzantium_634',requires:['heraclius_court_agenda_634'],
    goals:[
      {id:'court',name:'Review current administration',text:'Commit an administration priority, acknowledge effective ordinary appointments or retain present arrangements. No appointment is required.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_court_agenda_634',choiceIds:['heraclius_prioritize_administration','heraclius_observe_appointments','heraclius_keep_administration']}},
      {id:'syria',name:'Choose a Syrian course',text:'Commit an eligible source decision, acknowledge its actual conclusion, choose ordinary diplomacy or retain present arrangements. No war or recovery is required.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_court_agenda_634',choiceIds:['heraclius_face_syria','heraclius_decline_syria','heraclius_record_syria','heraclius_keep_syria']}},
      {id:'continuation',name:'Conclude the imperial reviews',text:'Conclude the personal program or complete its final review while retaining present arrangements.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_court_agenda_634',choiceIds:['heraclius_finish_court','heraclius_keep_court']}}
    ],contacts:[{id:'medinan_ruler',label:'The opening Medinan ruler',text:'Umar is the existing political incumbent at Medina. This directory link supplies no audience, allegiance, friendship or public authority.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'rashidun_634'}}]},
  opening_medina_634:{id:'opening_medina_634',type:'opening_profile',
    title:'Optional household goals',intro:'Ordinary work, private savings and a conclusion at home are separate optional goals. None grants an extra payment or public powers.',
    scenarioIds:['medina_household_634'],provinceIds:['medina'],requires:['medina_household_track_634'],
    goals:[
      {id:'field_income',name:'Earn {money:5} through fieldwork',text:'Receive {money:5} from actual ordinary farming after the opening. Starting funds, gifts and loans do not count.',criterion:{kind:'earnings',amount:5,focusIds:['work_land']}},
      {id:'household_reserve',name:'Keep a household reserve',text:'Hold {money:25} in the private purse as a free household.',criterion:{kind:'reserve',amount:25}},
      {id:'home_decision',name:'Conclude the household outlook',text:'Conclude at home with farming in mind or with the future livelihood left open. No public service or distant campaign is required.',criterion:{kind:'household_phase',storyId:'medina_household_track_634',phases:['farming','open_future']}}
    ],contacts:[{id:'medinan_ruler',label:'The opening Medinan ruler',text:'Umar is the existing political incumbent. Naming him grants this household no friendship, audience, appointment, stipend or military command.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'rashidun_634'}}]},
  opening_frontier_634:{id:'opening_frontier_634',type:'opening_profile',
    title:'Optional civilian household goals',intro:'These optional goals observe independent civilian work and plans at home. They create no paid service, enlistment or additional rewards.',
    scenarioIds:['frontier_household_634'],provinceIds:['damascus'],requires:['frontier_household_track_634'],
    goals:[
      {id:'craft_income',name:'Earn {money:5} through craft work',text:'Receive {money:5} from actual ordinary craft work after the opening. Selecting work or receiving a gift is insufficient.',criterion:{kind:'earnings',amount:5,focusIds:['craft_work']}},
      {id:'household_reserve',name:'Keep a household reserve',text:'Hold {money:25} in the private purse as a free household.',criterion:{kind:'reserve',amount:25}},
      {id:'home_decision',name:'Conclude the civilian household plan',text:'Complete the independent local-life conclusion in Damascus. No change of rule, war or paid service is required.',criterion:{kind:'household_phase',storyId:'frontier_household_track_634',phases:['close']}}
    ],contacts:[]}
};
});
