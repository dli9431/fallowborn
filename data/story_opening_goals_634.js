FB.bookmarkSources.stage({source:'data/story_opening_goals_634.js',bookmarks:['634'],catalogs:[],shared:[]}, function (FBDATA) {
/* Literal presentation uses the existing openingProfile extraction owners. */
FBDATA.openingProfiles_634 = {
  opening_umar_634:{id:'opening_umar_634',type:'opening_profile',
    title:'Optional priorities at Medina',intro:'Three goals for your first reviews at Medina. They carry no reward, and either choice on each front completes them.',
    scenarioIds:['umar_634'],provinceIds:['medina'],officeRealmId:'rashidun_634',requires:['umar_agenda_634'],
    goals:[
      {id:'mandate',name:'Settle the allegiance of Medina',text:'Done when you choose either course in the Successor to Abu Bakr review.',office:true,criterion:{kind:'story_choice',storyId:'umar_agenda_634',choiceIds:['umar_review_mandate_634','umar_retain_mandate_634']}},
      {id:'syria',name:'Decide on Damascus',text:'Done when you look north to Damascus or leave it for later.',office:true,criterion:{kind:'story_choice',storyId:'umar_agenda_634',choiceIds:['umar_review_syria_634','umar_retain_syria_634']}},
      {id:'iraq',name:'Decide on Hira',text:'Done when you look east to Hira or leave it for later, whatever you chose for Damascus.',office:true,criterion:{kind:'story_choice',storyId:'umar_agenda_634',choiceIds:['umar_review_iraq_634','umar_retain_iraq_634']}}
    ],contacts:[{id:'imperial_ruler',label:'The Roman emperor',text:'Heraclius rules the Romans from Constantinople and holds Damascus.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'byzantium_634'}}]},
  opening_umar_court_634:{id:'opening_umar_court_634',type:'opening_profile',
    title:'Optional priorities at Medina',intro:'Three goals for your first year at Medina. They carry no reward, and both fronts may stay quiet.',
    scenarioIds:['umar_634'],provinceIds:['medina'],officeRealmId:'rashidun_634',requires:['umar_court_agenda_634'],
    goals:[
      {id:'mandate',name:'Settle allegiance and the treasury',text:'Done when you choose either course in the Allegiance and the treasury review.',office:true,criterion:{kind:'story_choice',storyId:'umar_court_agenda_634',choiceIds:['umar_prioritize_accounts','umar_keep_accounts']}},
      {id:'syria',name:'Decide on the war for Damascus',text:'Done when you approve the war for Damascus, drop the claim, note how the war ended or leave Damascus for later.',office:true,criterion:{kind:'story_choice',storyId:'umar_court_agenda_634',choiceIds:['umar_face_syria','umar_decline_syria','umar_record_syria','umar_keep_syria']}},
      {id:'iraq',name:'Decide on the war for Hira district',text:'Done when you approve the war for Hira district, drop the claim, note how the war ended or leave Hira district for later.',office:true,criterion:{kind:'story_choice',storyId:'umar_court_agenda_634',choiceIds:['umar_face_iraq','umar_decline_iraq','umar_record_iraq','umar_keep_iraq']}}
    ],contacts:[{id:'imperial_ruler',label:'The Roman emperor',text:'Heraclius rules the Romans from Constantinople and holds Damascus.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'byzantium_634'}}]},
  opening_heraclius_634:{id:'opening_heraclius_634',type:'opening_profile',
    title:'Optional imperial priorities',intro:'Three goals for your first reviews at Constantinople. They carry no reward, and peace on every frontier still completes them.',
    scenarioIds:['heraclius_634'],provinceIds:['constantinople'],officeRealmId:'byzantium_634',requires:['heraclius_agenda_634'],
    goals:[
      {id:'court',name:'Set the course of the court',text:'Done when you put the court at Constantinople first or leave it to your officials.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_agenda_634',choiceIds:['heraclius_review_court_634','heraclius_retain_court_634']}},
      {id:'east',name:'Decide on the eastern provinces',text:'Done when you look to Syria and Damascus or keep your eyes on the capital.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_agenda_634',choiceIds:['heraclius_review_east_634','heraclius_retain_east_634']}},
      {id:'continuation',name:'Conclude the imperial reviews',text:'Done when you conclude the reviews or keep the court’s course steady in the last review.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_agenda_634',choiceIds:['heraclius_conclude_634','heraclius_retain_conclusion_634']}}
    ],contacts:[{id:'medinan_ruler',label:'The ruler at Medina',text:'Umar rules from Medina, and his armies threaten Roman Syria.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'rashidun_634'}}]},
  opening_heraclius_court_634:{id:'opening_heraclius_court_634',type:'opening_profile',
    title:'Optional imperial priorities',intro:'Three goals for your first year at Constantinople. They carry no reward, and peace in Syria still completes them.',
    scenarioIds:['heraclius_634'],provinceIds:['constantinople'],officeRealmId:'byzantium_634',requires:['heraclius_court_agenda_634'],
    goals:[
      {id:'court',name:'Set the course of the imperial offices',text:'Done when you put the offices first, record the officials now serving or leave the offices as they stand.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_court_agenda_634',choiceIds:['heraclius_prioritize_administration','heraclius_observe_appointments','heraclius_keep_administration']}},
      {id:'syria',name:'Decide on the defense of Damascus',text:'Done when you note how the war for Damascus ended or hold Damascus with what you have.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_court_agenda_634',choiceIds:['heraclius_record_syria','heraclius_keep_syria']}},
      {id:'continuation',name:'Conclude the imperial reviews',text:'Done when you conclude the reviews or keep the court’s course steady in the last review.',office:true,criterion:{kind:'story_choice',storyId:'heraclius_court_agenda_634',choiceIds:['heraclius_finish_court','heraclius_keep_court']}}
    ],contacts:[{id:'medinan_ruler',label:'The ruler at Medina',text:'Umar rules from Medina, and his armies threaten Damascus.',linkKind:'target',required:true,person:{source:'realm_ruler',realmId:'rashidun_634'}}]},
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
