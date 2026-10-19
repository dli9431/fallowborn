/* Personal reviews record intentions. Ordinary government and travel own acts. */
FBDATA.rulerAgendas_western_1096 = {
  godfrey_agenda_1096:{ id:'godfrey_agenda_1096', type:'ruler_agenda', subjectRealmId:'lower_lotharingia_1096',
    title:'Godfrey: Bouillon and the road ahead', intro:'Keep home government, family and a possible journey distinct. Each review records a priority without selling property, appointing a deputy or creating an expedition.',
    stages:[
      { id:'godfrey_home', name:'The Bouillon holding', year:1096, season:0,
        text:'Bouillon is the chosen home within the Verdun map cell. The ducal description grants no authority over every church or town of Lower Lotharingia. Review actual possessions through ordinary government.',
        choices:[{ id:'godfrey_review_home', label:'Keep home obligations in view', detail:'Record this priority without changing holdings or church rights.', operation:'agenda_priority' }] },
      { id:'godfrey_kin', name:'Kin and current officers', year:1096, season:0,
        text:'Ida, Eustace III and Baldwin remain separate people. Review living relatives and current officers before considering departure. Kinship does not make a brother your deputy.',
        choices:[{ id:'godfrey_keep_household', label:'Retain the present household arrangements', detail:'Move nobody and appoint no officer. Ordinary appointments retain their own authority and costs.', operation:'agenda_priority' }] },
      { id:'godfrey_funding', name:'Lawful resources', year:1096, season:0,
        text:'Review current funds and ordinary obligations before any journey. No property sale, mortgage, extraordinary collection or payment by a community is part of this review.',
        choices:[{ id:'godfrey_keep_funds', label:'Preserve the current resources', detail:'Record a funding priority without collecting or spending money.', operation:'agenda_priority' }] },
      { id:'godfrey_plans', name:'Home or a journey', year:1096, season:1,
        text:'You may remain at home or inspect ordinary personal travel. A plan is no vow, departure order or command over a following. A journey moves only its actual traveller.',
        choices:[{ id:'godfrey_stay', label:'Prioritize home government', detail:'Continue the review without starting a journey.', operation:'agenda_priority' },
          { id:'godfrey_consider_road', label:'Consider ordinary travel separately', detail:'Record interest only. Use the ordinary journey review for its current destination, price and restrictions.', operation:'agenda_priority' }] },
      { id:'godfrey_position', name:'The actual position', year:1096, season:2,
        text:'Check your present location and any real journey. This date does not put you at Constantinople or make a route safe. Being away does not move the household or settle home obligations.',
        choices:[{ id:'godfrey_keep_position', label:'Review the present position', detail:'Record a priority without arrival, family movement or a route agreement.', operation:'agenda_priority' }] },
      { id:'godfrey_obligations', name:'Changing home obligations', year:1096, season:3,
        text:'Current office, possession and living officers determine what can be administered. A departure gives no extra remote powers, and this review cannot install a replacement ruler.',
        choices:[{ id:'godfrey_keep_obligations', label:'Retain ordinary administration', detail:'Leave all actual authority and costs with ordinary government.', operation:'agenda_priority' }] },
      { id:'godfrey_relations', name:'Foreign approaches', year:1097, season:0,
        text:'Review living courts through ordinary diplomacy if access permits. A religious undertaking, passage agreement and personal assurance are separate commitments; none is accepted here.',
        choices:[{ id:'godfrey_keep_relations', label:'Leave negotiations to ordinary diplomacy', detail:'Create no audience, homage, passage, protection or treaty.', operation:'agenda_priority' }] },
      { id:'godfrey_continuation', name:'Government continues', year:1097, season:1,
        text:'Conclude at your actual location with current holdings and obligations. Home life, an existing journey or an ordinary war continues under its own rules. No Jerusalem crown or historical result is awarded.',
        choices:[{ id:'godfrey_continue', label:'Continue with the present affairs', detail:'Complete these personal reviews without rewards or changes to any live obligation.', operation:'agenda_priority' },
          { id:'godfrey_finish', label:'Conclude the opening program', detail:'Close only this personal program.', operation:'agenda_finish' }] }
    ] },
  raymond_agenda_1096:{ id:'raymond_agenda_1096', type:'ruler_agenda', subjectRealmId:'toulouse_1096',
    title:'Raymond: Toulouse and future commitments', intro:'Review present government, household and the choice to stay or consider a personal journey. No following, eastern possession or imperial promise is supplied by a priority.',
    stages:[
      { id:'raymond_home', name:'The Toulouse court', year:1096, season:0,
        text:'Toulouse is the chosen home anchor. Review the holdings actually represented by the court, keeping county-scale government distinct from every local estate, church and viscounty.',
        choices:[{ id:'raymond_review_home', label:'Prioritize present home government', detail:'Record a priority without extending the court’s possessions.', operation:'agenda_priority' }] },
      { id:'raymond_resources', name:'Public resources and local rights', year:1096, season:0,
        text:'Ordinary government owns current receipts, spending and public duties. No regional title authorizes taking church property or charging a new contribution through this program.',
        choices:[{ id:'raymond_keep_resources', label:'Keep the ordinary resource arrangements', detail:'Collect and spend nothing through this review.', operation:'agenda_priority' }] },
      { id:'raymond_family', name:'Household and succession', year:1096, season:0,
        text:'Elvira is Raymond’s spouse; Bertrand is his son from an earlier marriage. Review their actual availability. No infant is seeded and no deputy mandate is created by naming an heir.',
        choices:[{ id:'raymond_keep_family', label:'Retain the household’s present arrangements', detail:'Move nobody, appoint no deputy and impose no later succession.', operation:'agenda_priority' }] },
      { id:'raymond_plans', name:'Stay or consider the road', year:1096, season:1,
        text:'Remaining at home is a complete choice. Any personal journey must use ordinary route and affordability reviews. Considering the road neither recruits a following nor moves Elvira or Bertrand.',
        choices:[{ id:'raymond_stay', label:'Keep home government first', detail:'Continue without travel or a vow.', operation:'agenda_priority' },
          { id:'raymond_consider_road', label:'Consider a personal journey separately', detail:'Record interest only; ordinary travel owns departure, costs and arrival.', operation:'agenda_priority' }] },
      { id:'raymond_position', name:'Current location and funds', year:1096, season:2,
        text:'Review the actual traveller, current resources and lawful access. The calendar guarantees no Alpine crossing, host arrival or safe destination.',
        choices:[{ id:'raymond_keep_position', label:'Review the real position', detail:'Supply no funds, route or family movement.', operation:'agenda_priority' }] },
      { id:'raymond_obligations', name:'Home duties while plans change', year:1096, season:3,
        text:'The living incumbent and current possessions govern home administration. A journey does not automatically surrender Toulouse or appoint Bertrand to rule it.',
        choices:[{ id:'raymond_keep_obligations', label:'Continue ordinary administration', detail:'Record the priority without changing office or possession.', operation:'agenda_priority' }] },
      { id:'raymond_relations', name:'Distinct foreign commitments', year:1097, season:0,
        text:'Any foreign approach requires actual living parties and the ordinary diplomatic owner. This review accepts neither homage nor a limited personal assurance on Raymond’s behalf.',
        choices:[{ id:'raymond_keep_relations', label:'Leave foreign terms for a real negotiation', detail:'Create no oath, passage arrangement, treaty or eastern claim.', operation:'agenda_priority' }] },
      { id:'raymond_continuation', name:'Present affairs continue', year:1097, season:1,
        text:'Close the opening at the real location with the household and holdings that actually remain. No Tripoli possession, forced home succession or return journey follows from this conclusion.',
        choices:[{ id:'raymond_continue', label:'Continue present affairs', detail:'Complete the reviews without a reward, relocation or settlement of a live war.', operation:'agenda_priority' },
          { id:'raymond_finish', label:'Conclude the opening program', detail:'Close only this personal program.', operation:'agenda_finish' }] }
    ] }
};

FBDATA.openingProfiles_western_1096 = {
  opening_godfrey_1096:{ id:'opening_godfrey_1096', type:'opening_profile', title:'Godfrey’s Opening Goals',
    intro:'Optional reviews and savings grant no reward or additional authority.', scenarioIds:['godfrey_1096'], provinceIds:['verdun'],
    officeRealmId:'lower_lotharingia_1096', requires:['godfrey_agenda_1096'],
    goals:[
      { id:'home_review', name:'Review home obligations', text:'Record the home-government priority.', office:true, criterion:{ kind:'story_choice', storyId:'godfrey_agenda_1096', choiceIds:['godfrey_review_home'] } },
      { id:'reserve', name:'Retain one hundred gold', text:'Keep one hundred gold available. This observes present funds and pays nothing.', office:true, criterion:{ kind:'reserve', amount:100 } },
      { id:'continuation', name:'Conclude at the real position', text:'Complete the final review without requiring a journey or conquest.', office:true, criterion:{ kind:'story_choice', storyId:'godfrey_agenda_1096', choiceIds:['godfrey_continue','godfrey_finish'] } }
    ],
    contacts:[
      { id:'imperial_ruler', label:'The opening imperial ruler', text:'This reference grants no audience, friendship or new office.', linkKind:'target', required:true, person:{ source:'realm_ruler', realmId:'hre_1096' } }
    ] },
  opening_raymond_1096:{ id:'opening_raymond_1096', type:'opening_profile', title:'Raymond’s Opening Goals',
    intro:'Optional home reviews observe your decisions without paying a reward.', scenarioIds:['raymond_1096'], provinceIds:['toulouse'],
    officeRealmId:'toulouse_1096', requires:['raymond_agenda_1096'],
    goals:[
      { id:'home_review', name:'Review the Toulouse court', text:'Record the present home-government priority.', office:true, criterion:{ kind:'story_choice', storyId:'raymond_agenda_1096', choiceIds:['raymond_review_home'] } },
      { id:'household_review', name:'Review household obligations', text:'Review Elvira and Bertrand without moving them or appointing a deputy.', office:true, criterion:{ kind:'story_choice', storyId:'raymond_agenda_1096', choiceIds:['raymond_keep_family'] } },
      { id:'continuation', name:'Conclude with present affairs', text:'Complete the final review without a required expedition or eastern possession.', office:true, criterion:{ kind:'story_choice', storyId:'raymond_agenda_1096', choiceIds:['raymond_continue','raymond_finish'] } }
    ],
    contacts:[
      { id:'french_ruler', label:'The opening French ruler', text:'This directory link supplies no audience, friendship or change of obligations.', linkKind:'target', required:true, person:{ source:'realm_ruler', realmId:'france_1096' } }
    ] }
};
Object.assign(FBDATA.storyInstances, FBDATA.rulerAgendas_western_1096, FBDATA.openingProfiles_western_1096);
