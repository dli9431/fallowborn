FB.bookmarkSources.stage({"source":"data/story_frederick_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Agenda presentation uses the shared literal rulerAgendas catalogue. */
FBDATA.openingProfiles_frederick_1241 = {
  opening_frederick_1241:{ id:'opening_frederick_1241', type:'opening_profile',
    title:'The Emperor’s First Goals',
    intro:'Three aims for your first months before Faenza.',
    scenarioIds:['frederick_1241'], officeRealmId:'hre_1241', requires:['frederick_agenda_1241'],
    goals:[
      { id:'campaign_account', name:'Decide what the campaign can afford', text:'Done when you answer the step What the campaign can afford in your court agenda.', office:true,
        criterion:{kind:'story_choice',storyId:'frederick_agenda_1241',choiceIds:['fi_affordable','fi_keep_accounts']} },
      { id:'italian_policy', name:'Choose your line toward the Italian courts', text:'Done when you choose arms, talks or your present line in the step Italian opponents and local rights.', office:true,
        criterion:{kind:'story_choice',storyId:'frederick_agenda_1241',choiceIds:['fi_defence','fi_negotiation','fi_keep_rights']} },
      { id:'council_review', name:'Decide how to watch Gregory’s council', text:'Done when you answer the step A council was announced in your court agenda.', office:true,
        criterion:{kind:'story_choice',storyId:'frederick_agenda_1241',choiceIds:['fi_council','fi_keep_council']} }
    ],
    contacts:[
      { id:'gregory', label:'The papal court', text:'The pope in Rome, at first Gregory IX, who excommunicated you in 1239.',
        linkKind:'target', required:true, person:{source:'realm_ruler',realmId:'papacy_1241'} }
    ] }
};
Object.assign(FBDATA.storyInstances,FBDATA.openingProfiles_frederick_1241);
});
