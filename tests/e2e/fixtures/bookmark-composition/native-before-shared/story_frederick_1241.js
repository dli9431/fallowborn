/* Agenda presentation uses the shared literal rulerAgendas catalogue. */
FBDATA.openingProfiles_frederick_1241 = {
  opening_frederick_1241:{ id:'opening_frederick_1241', type:'opening_profile',
    title:'The Emperor’s First Goals',
    intro:'Optional reviews for this life. Recording a priority grants no money, troops, treaty or religious judgment.',
    scenarioIds:['frederick_1241'], officeRealmId:'hre_1241', requires:['frederick_agenda_1241'],
    goals:[
      { id:'campaign_account', name:'Review the campaign account', text:'Choose a priority after reviewing what the campaign can afford.', office:true,
        criterion:{kind:'story_choice',storyId:'frederick_agenda_1241',choiceIds:['fi_affordable','fi_keep_accounts']} },
      { id:'italian_policy', name:'Choose an Italian policy', text:'Record a defensive or diplomatic priority without claiming a victory.', office:true,
        criterion:{kind:'story_choice',storyId:'frederick_agenda_1241',choiceIds:['fi_defence','fi_negotiation','fi_keep_rights']} },
      { id:'council_review', name:'Consider the announced council', text:'Review the earlier announcement without assuming attendance or a verdict.', office:true,
        criterion:{kind:'story_choice',storyId:'frederick_agenda_1241',choiceIds:['fi_council','fi_keep_council']} }
    ],
    contacts:[
      { id:'gregory', label:'The papal court', text:'Gregory IX begins as pope. This link uses ordinary contact access and supplies no friendship, audience or agreement.',
        linkKind:'target', required:true, person:{source:'realm_ruler',realmId:'papacy_1241'} }
    ] }
};
Object.assign(FBDATA.storyInstances,FBDATA.openingProfiles_frederick_1241);
