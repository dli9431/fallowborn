/* Personal court reviews compose existing decisions without public effects. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_silesia_1241 = {
  silesia_agenda_1241:{ id:'silesia_agenda_1241', type:'ruler_agenda', subjectRealmId:'silesia_1241',
    title:'Henry: a continuing ducal court',
    intro:'Family, resources and neighboring courts place different demands on your attention. Choose priorities while ordinary government and war determine what happens.',
    stages:[
      { id:'ducal_responsibilities', name:'One duke, several responsibilities', year:1241, season:0,
        text:'Silesian and Krakow holdings bring several responsibilities to your court. Review the lands you actually govern before choosing what needs attention.',
        choices:[
          { id:'henry_review_holdings', label:'Put government first', detail:'Record a priority for your present holdings. Any public order uses ordinary authority and resources.', operation:'agenda_priority' },
          { id:'henry_keep_responsibilities', label:'Keep present arrangements', detail:'Continue without a new public commitment.', operation:'agenda_priority' }
        ] },
      { id:'ducal_household', name:'The people behind the court', year:1241, season:0,
        text:'Anna and your children have lives alongside the court. Consider their present circumstances without assuming that a political decision can guarantee their safety.',
        choices:[
          { id:'henry_attend_family', label:'Give the household attention', detail:'Record attention to existing kin. No marriage, journey or succession decree follows.', operation:'agenda_priority' },
          { id:'henry_keep_household', label:'Retain household arrangements', detail:'Leave the existing family and its obligations as they are.', operation:'agenda_priority' }
        ] },
      { id:'ducal_resources', name:'Sustaining lawful resources', year:1241, season:0,
        text:'Public obligations and private property have separate accounts. Ordinary government controls what can be collected, recruited or spent.',
        choices:[
          { id:'henry_conserve_resources', label:'Prioritize conserving resources', detail:'Record a fiscal priority without collecting another payment or raising troops.', operation:'agenda_priority' },
          { id:'henry_keep_resources', label:'Retain present obligations', detail:'Create no additional levy, expense or receipt.', operation:'agenda_priority' }
        ] },
      { id:'bohemian_connection', name:'The Bohemian connection', year:1241, season:0,
        text:'Anna is Wenceslas of Bohemia’s sister. Kinship can matter to diplomacy, but a request still needs living parties, access and consent.',
        choices:[
          { id:'henry_consider_diplomacy', label:'Give diplomacy attention', detail:'Record an intention to review ordinary diplomacy. No alliance, contact or reinforcement is granted.', operation:'agenda_priority' },
          { id:'henry_keep_domestic_priority', label:'Attend to domestic obligations', detail:'Leave foreign commitments unchanged.', operation:'agenda_priority' }
        ] },
      { id:'ducal_preparations', name:'Preparing without a promised battle', year:1241, season:0,
        text:'Review what your present resources and holdings can support. Construction, supply and military orders require their ordinary decisions and costs.',
        choices:[
          { id:'henry_prioritize_defense', label:'Prioritize affordable defense', detail:'Record a defensive priority without a free host, fortress or forced evacuation.', operation:'agenda_priority' },
          { id:'henry_keep_preparations', label:'Keep present preparations', detail:'Continue without a new expense or a promised battle.', operation:'agenda_priority' }
        ] },
      { id:'ducal_information', name:'Deciding what to investigate', year:1241, season:0,
        text:'Consider the current map and actual wars before responding to uncertain news. This review supplies no report of an army approaching your court.',
        choices:[
          { id:'henry_review_information', label:'Examine current affairs', detail:'Record a priority for reviewing actual map and war information.', operation:'agenda_priority' },
          { id:'henry_keep_information', label:'Attend to another court matter', detail:'Make no claim that a hostile movement or local battle has occurred.', operation:'agenda_priority' }
        ] },
      { id:'ducal_response', name:'Approach, postponement or another path', year:1241, season:0,
        text:'Your response depends on present circumstances. Existing armies and ordinary diplomacy remain available under their own conditions.',
        choices:[
          { id:'henry_review_response', label:'Keep defense under review', detail:'Record a priority without ordering movement, starting a war or deciding its outcome.', operation:'agenda_priority' },
          { id:'henry_keep_response', label:'Maintain current arrangements', detail:'Leave actual armies and diplomatic commitments unchanged.', operation:'agenda_priority' }
        ] },
      { id:'continuing_court', name:'A continuing court', year:1241, season:1,
        text:'The court continues with the family, holdings and obligations that remain. Closing these reviews leaves ordinary life and any ongoing wars to their existing course.',
        choices:[
          { id:'henry_continue_court', label:'Continue with present priorities', detail:'Complete the reviews without a reward, partition or scheduled death.', operation:'agenda_priority' },
          { id:'henry_finish_reviews', label:'Conclude the court reviews', detail:'Finish the personal program without settling an ongoing war or guaranteeing withdrawal.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_silesia_1241 = {
  opening_silesia_1241:{ id:'opening_silesia_1241', type:'opening_profile',
    title:'The duke’s first goals and people',
    intro:'Optional goals record your priorities. Family links retain their ordinary access rules.',
    scenarioIds:['henry_pious_1241'], provinceIds:['wroclaw'], officeRealmId:'silesia_1241',
    requires:['silesia_agenda_1241'],
    goals:[
      { id:'attend_household', name:'Review household responsibilities', text:'Choose how to attend to the existing household in your court reviews.', office:true,
        criterion:{ kind:'story_choice', storyId:'silesia_agenda_1241', choiceIds:['henry_attend_family','henry_keep_household'] } },
      { id:'weigh_preparations', name:'Weigh affordable preparations', text:'Record a priority for defense or retain present preparations.', office:true,
        criterion:{ kind:'story_choice', storyId:'silesia_agenda_1241', choiceIds:['henry_prioritize_defense','henry_keep_preparations'] } },
      { id:'continuing_court', name:'Choose the court’s next chapter', text:'Conclude the personal court reviews with the arrangements that actually remain.', office:true,
        criterion:{ kind:'story_choice', storyId:'silesia_agenda_1241', choiceIds:['henry_continue_court','henry_finish_reviews'] } }
    ],
    contacts:[
      { id:'wenceslas', label:'Wenceslas I of Bohemia', text:'Anna’s brother rules the neighboring Bohemian court. His personal link grants no alliance, audience or military access.', linkKind:'kin', required:false,
        person:{ source:'realm_ruler', realmId:'bohemia_1241' } }
    ] }
};

(function () {
  'use strict';
  [FBDATA.rulerAgendas_silesia_1241,FBDATA.openingProfiles_silesia_1241].forEach(function (table) {
    Object.keys(table).forEach(function (id) {
      if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
      FBDATA.storyInstances[id] = table[id];
    });
  });
})();
