/* These dated reviews record personal priorities. Ordinary government,
   diplomacy and war retain ownership of actual commitments. */
FBDATA.rulerAgendas_tuscany_1096 = {
  matilda_agenda_1096:{ id:'matilda_agenda_1096', type:'ruler_agenda', subjectRealmId:'canossa_1096',
    title:'Matilda: estates and allegiances', intro:'Review the household, local obligations and relations with the imperial and papal courts. Choose what your actual jurisdiction and resources can sustain.',
    stages:[
      { id:'matilda_household', name:'The Canossan household', year:1096, season:0,
        text:'Your household is already separated from Welf. Consider your present responsibilities without assuming a new marriage, reconciliation or legal annulment.',
        choices:[
          { id:'matilda_review_household', label:'Prioritize the household', detail:'Record a household priority. No relative, spouse, payment or marriage decision is created.', operation:'agenda_priority' },
          { id:'matilda_keep_household', label:'Keep the present arrangements', detail:'Continue with the existing household and ordinary family decisions.', operation:'agenda_priority' }
        ] },
      { id:'matilda_boundaries', name:'Boundaries and obligations', year:1096, season:0,
        text:'Estate rights, church property and urban government overlap. Review the counties and obligations you actually hold before choosing a policy.',
        choices:[
          { id:'matilda_review_rights', label:'Prioritize existing rights', detail:'Record a review priority. Actual grants, dues and disputes require their own ordinary decisions.', operation:'agenda_priority' },
          { id:'matilda_keep_obligations', label:'Retain existing obligations', detail:'Record continuity without transferring property or imposing a new payment.', operation:'agenda_priority' }
        ] },
      { id:'matilda_separated_alliance', name:'An alliance after separation', year:1096, season:0,
        text:'The former Welf alliance does not settle your current diplomatic options. Review the living courts and their actual relations before making a commitment.',
        choices:[
          { id:'matilda_review_alliances', label:'Prioritize available alliances', detail:'Record a diplomatic priority. No Welf encounter, reconciliation, pact or dowry transaction follows.', operation:'agenda_priority' },
          { id:'matilda_keep_alliances', label:'Retain current relations', detail:'Keep the current diplomatic arrangements without creating an obligation.', operation:'agenda_priority' }
        ] },
      { id:'matilda_imperial_pressure', name:'Imperial pressure', year:1096, season:1,
        text:'Imperial claims form part of the opening conflict, but a threat is not an army at your gates. Review actual wars and neighboring forces before choosing defense or negotiation.',
        choices:[
          { id:'matilda_prioritize_defense', label:'Prioritize local defense', detail:'Record a defensive priority. Ordinary army controls still require lawful authority, available forces and actual funds.', operation:'agenda_priority' },
          { id:'matilda_consider_negotiation', label:'Prioritize negotiation', detail:'Record a preference for ordinary diplomacy, subject to living parties and their consent.', operation:'agenda_priority' },
          { id:'matilda_keep_frontier', label:'Keep current dispositions', detail:'Create no war, army, treaty or automatic imperial withdrawal.', operation:'agenda_priority' }
        ] },
      { id:'matilda_papal_relationship', name:'The papal relationship', year:1096, season:1,
        text:'Consider cooperation with the current papal court alongside local responsibilities. A changed pope or lost access may call for a different policy; no letter or audience is presumed.',
        choices:[
          { id:'matilda_prioritize_cooperation', label:'Prioritize supported cooperation', detail:'Record this policy without granting church property, making a contribution or obtaining protection.', operation:'agenda_priority' },
          { id:'matilda_prioritize_local_duties', label:'Prioritize local obligations', detail:'Keep attention on the responsibilities you actually hold, without changing relations with the pope.', operation:'agenda_priority' }
        ] },
      { id:'matilda_sustainable_commitments', name:'What can be sustained', year:1096, season:2,
        text:'Review the actual treasury and obligations before taking on a new commitment. A defense plan cannot pay troops or supply a campaign by itself.',
        choices:[
          { id:'matilda_review_affordable_defense', label:'Prioritize affordable defense', detail:'Record intent only. Recruiting, paying and supplying troops retain their ordinary costs and gates.', operation:'agenda_priority' },
          { id:'matilda_retain_commitments', label:'Retain existing commitments', detail:'Record a preference without spending private or public funds.', operation:'agenda_priority' }
        ] },
      { id:'matilda_changing_jurisdiction', name:'A changing jurisdiction', year:1096, season:2,
        text:'Review the counties that remain under your authority. Present possession does not settle every estate claim, and this review promises no recovery of a lost city.',
        choices:[
          { id:'matilda_review_jurisdiction', label:'Prioritize current local arrangements', detail:'Record a priority for the jurisdiction you retain. No county is transferred or restored.', operation:'agenda_priority' },
          { id:'matilda_keep_jurisdiction', label:'Retain current arrangements', detail:'Continue without changing holders, rights or legal claims.', operation:'agenda_priority' }
        ] },
      { id:'matilda_continuation', name:'Continue governing', year:1096, season:3,
        text:'Conclude this opening review from your actual position. Ordinary government continues, and any live war or family obligation keeps its own terms.',
        choices:[
          { id:'matilda_finish_review', label:'Conclude the opening review', detail:'Finish this personal program without a reward, inheritance, marriage ruling or forced peace.', operation:'agenda_finish' },
          { id:'matilda_continue_governing', label:'Retain a governing priority', detail:'Complete the program with ordinary decisions still available and no new commitment.', operation:'agenda_priority' }
        ] }
    ] }
};

FBDATA.openingProfiles_tuscany_1096 = {
  opening_matilda_1096:{ id:'opening_matilda_1096', type:'opening_profile',
    title:'Matilda’s Opening Goals', intro:'Optional goals observe your recorded priorities. They grant no additional funds, authority or diplomatic agreement.',
    scenarioIds:['matilda_1096'], provinceIds:['modena'], officeRealmId:'canossa_1096', requires:['matilda_agenda_1096'],
    goals:[
      { id:'household_review', name:'Review the existing household', text:'Choose a household priority in the opening program.', office:true,
        criterion:{ kind:'story_choice', storyId:'matilda_agenda_1096', choiceIds:['matilda_review_household','matilda_keep_household'] } },
      { id:'local_obligations', name:'Review local obligations', text:'Record a policy toward the rights and obligations you actually hold.', office:true,
        criterion:{ kind:'story_choice', storyId:'matilda_agenda_1096', choiceIds:['matilda_review_rights','matilda_keep_obligations'] } },
      { id:'opening_conclusion', name:'Conclude the opening review', text:'Reach the final review while still governing, then conclude or retain a governing priority.', office:true,
        criterion:{ kind:'story_choice', storyId:'matilda_agenda_1096', choiceIds:['matilda_finish_review','matilda_continue_governing'] } }
    ],
    contacts:[
      { id:'imperial_court', label:'The opening imperial ruler', text:'A reference to the existing imperial ruler. Ordinary access, consent and current diplomacy still apply.', linkKind:'target', required:false,
        person:{ source:'realm_ruler', realmId:'hre_1096' } },
      { id:'papal_court', label:'The opening papal ruler', text:'A reference to the existing papal ruler. This link grants no audience, protection or church property.', linkKind:'target', required:false,
        person:{ source:'realm_ruler', realmId:'papacy_1096' } }
    ] }
};

Object.assign(FBDATA.storyInstances, FBDATA.rulerAgendas_tuscany_1096, FBDATA.openingProfiles_tuscany_1096);
