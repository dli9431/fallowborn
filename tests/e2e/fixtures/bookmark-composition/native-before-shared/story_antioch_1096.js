/* Personal priorities leave every political transaction with its ordinary owner. */
FBDATA.rulerAgendas_antioch_1096 = {
  antioch_agenda_1096:{ id:'antioch_agenda_1096', type:'ruler_agenda', subjectRealmId:'antioch_1096',
    title:'Antioch: governing a changing frontier',
    intro:'Review the city, household and neighboring courts. These optional priorities create no army, treaty, payment or historical outcome. You can set the program aside at any time.',
    stages:[
      { id:'as01_authority', name:'Your current authority', year:1096, season:0,
        text:'Begin with the counties and obligations you actually hold. The title of governor describes the historical role; ordinary territorial rules govern this campaign.',
        choices:[{ id:'as01_local_rule', label:'Prioritize local government', detail:'Record a priority. Review real offices and jurisdiction through the ordinary government controls.', operation:'agenda_priority' }] },
      { id:'as02_working_city', name:'The working city', year:1096, season:0,
        text:'Antioch needs solvent accounts and everyday upkeep. Review the residents and funds actually present. Their culture or faith does not determine political loyalty.',
        choices:[{ id:'as02_upkeep', label:'Prioritize city upkeep', detail:'Record intent only. Ordinary purchases and building decisions retain their actual prices and eligibility.', operation:'agenda_priority' }] },
      { id:'as03_aleppo', name:'Relations with Aleppo', year:1096, season:1,
        text:'Aleppo is a separate court. Review its current ruler and the relations shown by ordinary diplomacy before deciding whether to approach it.',
        choices:[
          { id:'as03_relations', label:'Prioritize relations with Aleppo', detail:'Record a diplomatic priority without granting an audience, homage, claim or treaty.', operation:'agenda_priority' },
          { id:'as03_retain', label:'Retain present arrangements', detail:'Leave current relations in place. Ordinary diplomacy remains available on its own terms.', operation:'agenda_priority' }
        ] },
      { id:'as04_damascus', name:'Another neighboring court', year:1096, season:2,
        text:'Damascus offers a different possible counterpart. Consider its actual government and current relations; a historical rivalry does not compel you to change allegiance.',
        choices:[
          { id:'as04_approach', label:'Consider a Damascus approach', detail:'Record a priority. Any actual approach uses the ordinary consent, access and diplomacy rules.', operation:'agenda_priority' },
          { id:'as04_retain', label:'Keep existing commitments', detail:'Record your present policy without a quarrel, raid or alliance.', operation:'agenda_priority' }
        ] },
      { id:'as05_provisions', name:'Provision within your means', year:1096, season:3,
        text:'Review affordable supplies and existing defensive works. Only the ordinary market, army and construction controls can pay for them.',
        choices:[{ id:'as05_affordable', label:'Prioritize affordable preparation', detail:'Record intent without adding grain, troops, fortifications or money.', operation:'agenda_priority' }] },
      { id:'as06_jurisdiction', name:'Jurisdiction after change', year:1097, season:0,
        text:'Look again at the territory and obligations that remain yours. Claims and reports about the hinterland do not confer possession of Edessa or another court.',
        choices:[
          { id:'as06_review', label:'Review current holdings', detail:'Record a priority without a grant, recapture or appointment.', operation:'agenda_priority' },
          { id:'as06_conclude', label:'Conclude the governing program', detail:'Finish these personal reviews while ordinary government and any live commitments continue.', operation:'agenda_finish' }
        ] },
      { id:'as07_preparedness', name:'Defense if needed', year:1097, season:2,
        text:'Review the actual map. If hostile forces threaten Antioch, ordinary defense and diplomacy determine the response. Otherwise you can continue civilian priorities.',
        choices:[
          { id:'as07_defense', label:'Prioritize preparedness', detail:'Record intent. No hostile force, siege or relief army is created.', operation:'agenda_priority' },
          { id:'as07_civil', label:'Continue civilian priorities', detail:'Keep ordinary government available without requiring a war.', operation:'agenda_priority' }
        ] },
      { id:'as08_continuation', name:'A continuing government', year:1097, season:3,
        text:'The opening program ends at your real position. Your household, city, obligations and any live wars continue through ordinary play.',
        choices:[
          { id:'as08_continue', label:'Continue with current arrangements', detail:'Complete the program without a reward or a change of ruler, residence, faith or ownership.', operation:'agenda_priority' },
          { id:'as08_finish', label:'Finish the opening program', detail:'Close the personal reviews without settling a war or deciding the fate of the city.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_antioch_1096 = {
  opening_antioch_1096:{ id:'opening_antioch_1096', type:'opening_profile',
    title:'Antioch goals and household',
    intro:'Optional aims record real decisions without extra rewards. The court reference grants no audience, friendship or political obligation.',
    scenarioIds:['yaghi_siyan_1096'], provinceIds:['antioch'], officeRealmId:'antioch_1096',
    requires:['antioch_agenda_1096'],
    goals:[
      { id:'antioch_accounts', name:'Receive ordinary court revenue', text:'Receive a positive ordinary public receipt from the domain actually held.', office:true,
        criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'antioch_1096' } },
      { id:'antioch_upkeep', name:'Review city upkeep', text:'Record a city upkeep priority in your personal program. It spends no funds and grants no buildings.', office:true,
        criterion:{ kind:'story_choice', storyId:'antioch_agenda_1096', choiceIds:['as02_upkeep'] } },
      { id:'antioch_continuation', name:'Conclude the governing program', text:'Complete your governing program while ordinary play continues. You can also set this aim aside freely.',
        criterion:{ kind:'story_choice', storyId:'antioch_agenda_1096', choiceIds:['as06_conclude','as08_continue','as08_finish'] } }
    ],
    contacts:[
      { id:'seljuk_court', label:'The opening Seljuk ruler', text:'The wider Seljuk court is a separate political reference. This link supplies no allegiance, claim, friendship or audience. Your own family remains in Kin.', linkKind:'target', required:true,
        person:{ source:'realm_ruler', realmId:'seljuk_1096' } }
    ] }
};
Object.assign(FBDATA.storyInstances, FBDATA.rulerAgendas_antioch_1096, FBDATA.openingProfiles_antioch_1096);
