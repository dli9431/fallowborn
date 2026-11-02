/* Personal reviews use the existing government, household and military owners. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_valencia_1096 = {
  valencia_agenda_1096:{ id:'valencia_agenda_1096', type:'ruler_agenda', subjectRealmId:'valencia_1096',
    title:'Valencia: Household and Lordship',
    intro:'Choose priorities for the court and the territory you actually hold. Ordinary decisions determine the costs and results.',
    stages:[
      { id:'city', name:'A city already held', year:1096, season:0,
        text:'Valencia has been in your hands since 1094. The county on the map approximates the city’s lordship, including Murviedro, which was still outside your historical control. Decide what needs attention first.',
        choices:[
          { id:'city_administration', label:'Put local administration first', detail:'Record a priority. Review actual government decisions through the ordinary controls.', operation:'agenda_priority' },
          { id:'city_defense', label:'Put defense preparation first', detail:'Record an intention. Raising forces still requires lawful authority, real funds and ordinary army controls.', operation:'agenda_priority' },
          { id:'city_retain', label:'Keep present priorities', detail:'Continue with the current government and resources.', operation:'agenda_priority' }
        ] },
      { id:'household', name:'The existing household', year:1096, season:0,
        text:'Jimena, Diego, Cristina and Maria form your named household. Their working ages and opening residence in Valencia are approximations. Use Kin to review their actual circumstances and ordinary family choices.',
        choices:[
          { id:'household_attention', label:'Give family affairs priority', detail:'Record an intention to attend to the existing family. This moves nobody and arranges no marriage.', operation:'agenda_priority' },
          { id:'household_retain', label:'Keep household arrangements', detail:'Retain the actual family relationships and residences.', operation:'agenda_priority' }
        ] },
      { id:'communities', name:'Residents and obligations', year:1096, season:0,
        text:'The Catholic court governs residents with different faiths and customs. Review current local obligations through ordinary government. A statement of priorities does not issue a charter or guarantee anyone’s safety.',
        choices:[
          { id:'communities_review', label:'Prioritize local administration', detail:'Record an intention to review lawful local obligations. Any actual change keeps its ordinary authority and cost checks.', operation:'agenda_priority' },
          { id:'communities_retain', label:'Retain current arrangements', detail:'Continue without issuing a new communal agreement or altering a place of worship.', operation:'agenda_priority' }
        ] },
      { id:'funds', name:'Paying for government and defense', year:1096, season:1,
        text:'Government and military preparation draw on real resources. Review available funds and ordinary paid forces, or preserve reserves. The optional goals distinguish actual military spending from a declared intention.',
        choices:[
          { id:'funds_prepare', label:'Prioritize paid preparation', detail:'Record a priority only. Use ordinary army controls to review and pay the actual cost of a force.', operation:'agenda_priority' },
          { id:'funds_reserve', label:'Prioritize reserves', detail:'Record a savings intention. The reserve goal still requires {money:120} in the private purse.', operation:'agenda_priority' },
          { id:'funds_retain', label:'Keep present spending priorities', detail:'Make no payment through this review.', operation:'agenda_priority' }
        ] },
      { id:'neighbors', name:'Neighboring courts', year:1096, season:1,
        text:'Earlier royal service and neighboring interests leave room for diplomacy. Review the courts that actually exist and the approaches available through ordinary diplomacy. No pardon, tribute or alliance follows from this review.',
        choices:[
          { id:'neighbors_approach', label:'Prioritize an ordinary diplomatic approach', detail:'Record an intention. Any later approach needs its real counterpart, access, consent and funds.', operation:'agenda_priority' },
          { id:'neighbors_retain', label:'Keep current relations', detail:'Leave existing relations and obligations in place.', operation:'agenda_priority' }
        ] },
      { id:'approaches', name:'The approaches to Valencia', year:1096, season:2,
        text:'Assess current wars, armies and access. Earlier fighting does not mean an army is approaching in this campaign. Actual military operations and supply determine whether the lordship faces a new threat.',
        choices:[
          { id:'approaches_defend', label:'Prioritize ordinary defense', detail:'Record a defensive intention. It creates no host, invasion, battlefield or victory.', operation:'agenda_priority' },
          { id:'approaches_diplomacy', label:'Prioritize a lawful diplomatic response', detail:'Record an intention to use ordinary diplomacy if a suitable current relationship permits it.', operation:'agenda_priority' },
          { id:'approaches_retain', label:'Keep watching under present arrangements', detail:'Retain current policy without asserting that an attack occurred.', operation:'agenda_priority' }
        ] },
      { id:'worship', name:'Household and worship', year:1096, season:3,
        text:'Review the family and institutions that actually remain. A new season does not move residents, establish a cathedral, appoint a bishop or arrange a child’s marriage.',
        choices:[
          { id:'worship_household', label:'Prioritize household and lawful institutional affairs', detail:'Record an intention. Use ordinary family and institutional decisions for any supported action.', operation:'agenda_priority' },
          { id:'worship_defense', label:'Continue to prioritize defense', detail:'Keep defense as a priority without spending or raising forces here.', operation:'agenda_priority' },
          { id:'worship_retain', label:'Retain present arrangements', detail:'Leave family, institutions and current obligations in their actual state.', operation:'agenda_priority' }
        ] },
      { id:'continuing', name:'A continuing lordship', year:1097, season:0,
        text:'Take stock of the jurisdiction and household that actually survive. Future battles, marriages and succession remain open. This personal program can close while ordinary government and any current war continue.',
        choices:[
          { id:'continuing_consolidate', label:'Conclude with consolidation as the priority', detail:'Complete the personal review without acquiring another place or resolving a war.', operation:'agenda_priority' },
          { id:'continuing_finish', label:'Close the opening program', detail:'End these reviews with all actual possessions, people and obligations intact.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_valencia_1096 = {
  valencia_opening_profile_1096:{ id:'valencia_opening_profile_1096', type:'opening_profile',
    title:'Valencia: Optional Opening Goals',
    intro:'These goals observe your actual decisions and resources. They pay no additional reward.',
    scenarioIds:['rodrigo_diaz_1096'], provinceIds:['valencia'], officeRealmId:'valencia_1096',
    requires:['valencia_agenda_1096'],
    goals:[
      { id:'reserve', name:'Keep a private reserve', text:'Hold {money:120} in the private purse. A priority alone cannot complete this goal.', criterion:{ kind:'reserve', amount:120 } },
      { id:'paid_defense', name:'Pay for a field force', text:'Make an actual ordinary host payment while governing this lordship. A defense intention spends nothing.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'valencia_1096' } },
      { id:'conclude', name:'Complete the court reviews', text:'Reach the final review and choose consolidation or close the program. Setting the agenda aside leaves this goal unfinished.', office:true,
        criterion:{ kind:'story_choice', storyId:'valencia_agenda_1096', choiceIds:['continuing_consolidate','continuing_finish'] } }
    ],
    contacts:[
      { id:'jimena', label:'Jimena Diaz', text:'Your existing spouse. Ordinary family interactions keep their current conditions.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'jimena_diaz' } },
      { id:'diego', label:'Diego Rodriguez', text:'Your son in the existing household. This link grants no military command.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'diego_rodriguez' } },
      { id:'cristina', label:'Cristina Rodriguez', text:'Your daughter in the existing household. Any marriage remains an ordinary family decision.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'cristina_rodriguez' } },
      { id:'maria', label:'Maria Rodriguez', text:'Your daughter in the existing household. No later marriage or residence is imposed.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'valencia_1096', memberId:'maria_rodriguez' } }
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
