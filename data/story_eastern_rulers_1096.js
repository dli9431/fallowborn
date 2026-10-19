/* Personal priorities observe ordinary government without imposing outcomes. */
FBDATA.rulerAgendas_eastern_rulers_1096 = {
  alexios_agenda_1096:{ id:'alexios_agenda_1096', type:'ruler_agenda', subjectRealmId:'byzantium_1096',
    title:'Alexios: court, frontier and passage', intro:'Review provincial service, frontier defense and foreign passage. You may conclude after the first four reviews or continue through Winter 1097. Priorities direct no other ruler and grant no reward.',
    stages:[
      { id:'alexios_administration', name:'Imperial administration', year:1096, season:0,
        text:'Review the actual provincial appointments and the public account in Rank & Realm. Your family is not a roster of provincial officers.',
        choices:[
          { id:'alexios_record_service', label:'Record effective provincial service', detail:'Observe an effective appointment belonging to this court. This review does not appoint or pay another officer.', operation:'agenda_public_record', recordKind:'agenda_appointments' },
          { id:'alexios_retain_administration', label:'Retain the current administration', detail:'Record continued administration without changing an office or collecting money.', operation:'agenda_priority' }
        ] },
      { id:'alexios_frontier', name:'The present frontier', year:1096, season:1,
        text:'Inspect your current holdings and armies. Rum and the other eastern courts retain their own decisions; a historical threat does not establish a current invasion.',
        choices:[
          { id:'alexios_defensive_priority', label:'Prioritize imperial defense', detail:'Record a defensive priority. Raising or moving a host still requires the ordinary army controls.', operation:'agenda_priority' },
          { id:'alexios_retain_dispositions', label:'Retain current dispositions', detail:'Leave present arrangements in place without ordering a campaign.', operation:'agenda_priority' }
        ] },
      { id:'alexios_passage', name:'Approaches and passage', year:1096, season:2,
        text:'Travellers and independent contingents may approach imperial territory. Review actual parties and terms through their ordinary controls. This agenda supplies no passage agreement or imperial oath.',
        choices:[
          { id:'alexios_passage_priority', label:'Prioritize a negotiated passage', detail:'Record the intention to consider terms. No access, market concession, oath or command is granted.', operation:'agenda_priority' },
          { id:'alexios_keep_passage_terms', label:'Retain the present passage policy', detail:'Keep existing obligations without concluding a new bargain.', operation:'agenda_priority' }
        ] },
      { id:'alexios_continuation', name:'The continuing imperial court', year:1097, season:0,
        text:'Review the court and frontier that actually remain. Past intentions have not guaranteed recovery, victory or the arrival of any contingent.',
        choices:[
          { id:'alexios_continue_rule', label:'Conclude with present responsibilities', detail:'Conclude the review with ordinary government, family and military obligations still in force.', operation:'agenda_finish' },
          { id:'alexios_extend_review', label:'Continue the court reviews', detail:'Review effective service, public resources and foreign approaches through Winter 1097. This intention grants no office, money or agreement.', operation:'agenda_priority' },
          { id:'alexios_finish_review', label:'Conclude the court program', detail:'Finish this personal program without settling an ongoing war or treaty.', operation:'agenda_finish' }
        ] },
      { id:'alexios_service_continuity', name:'Service under the present court', year:1097, season:0,
        text:'Review the provincial offices that are actually effective under your current authority. A remembered appointment is not proof that its holder still serves, and a family relationship supplies no public commission.',
        choices:[
          { id:'alexios_record_current_service', label:'Record effective provincial service', detail:'Observe a currently effective appointment from this court since the program opened. No appointment, salary or renewal is made.', operation:'agenda_public_record', recordKind:'agenda_appointments' },
          { id:'alexios_keep_current_service', label:'Retain the current service arrangements', detail:'Continue without recording an appointment or changing any officer’s terms.', operation:'agenda_priority' }
        ] },
      { id:'alexios_public_account', name:'Resources for continuing rule', year:1097, season:1,
        text:'Compare the public account, current host expenses and continuing household obligations. Existing receipts and payments belong to their ordinary accounts; choosing a priority supplies no additional income.',
        choices:[
          { id:'alexios_fund_current_needs', label:'Prioritize affordable current needs', detail:'Record a spending priority. Actual appointments, recruitment and supplies retain their separate costs and consent.', operation:'agenda_priority' },
          { id:'alexios_keep_public_account', label:'Retain present spending commitments', detail:'Keep existing commitments without collecting a tax or moving money.', operation:'agenda_priority' }
        ] },
      { id:'alexios_current_approaches', name:'The parties actually present', year:1097, season:2,
        text:'Consider only living parties and the territory you actually control. A passage concession, a market purchase and a personal assurance have different parties and terms. This review establishes none of them and promises no restitution.',
        choices:[
          { id:'alexios_review_present_parties', label:'Prioritize current passage questions', detail:'Record an intention to inspect actual parties and lawful terms through ordinary diplomacy. No oath, access permit, payment or land transfer is made.', operation:'agenda_priority' },
          { id:'alexios_defer_new_terms', label:'Defer new passage terms', detail:'Leave existing agreements in force and make no new commitment.', operation:'agenda_priority' }
        ] },
      { id:'alexios_extended_conclusion', name:'The court at the program’s close', year:1097, season:3,
        text:'Review the living household, effective offices and actual frontier. Continuing wars, agreements and public duties outlast this personal program under their own rules.',
        choices:[
          { id:'alexios_retain_living_court', label:'Continue ordinary imperial rule', detail:'Complete the program with present responsibilities intact. No recovery, victory or foreign submission is awarded.', operation:'agenda_priority' },
          { id:'alexios_close_extended_review', label:'Close the remaining court reviews', detail:'Close this program without cancelling an existing duty or agreement.', operation:'agenda_finish' }
        ] }
    ] },
  rum_agenda_1096:{ id:'rum_agenda_1096', type:'ruler_agenda', subjectRealmId:'rum_1096',
    title:'Kilij Arslan: Nicaea and the frontier', intro:'Choose priorities as the frontier changes. You may conclude after the first four reviews or continue through Winter 1097. Ordinary diplomacy, resources and armies determine what follows.',
    stages:[
      { id:'rum_court', name:'The Nicaean court', year:1096, season:0,
        text:'Inspect the actual public account and jurisdiction. Your court classification does not describe every resident of the Nicaea county.',
        choices:[
          { id:'rum_review_resources', label:'Prioritize the court account', detail:'Record a resource priority without collecting an extra tax or receiving new stores.', operation:'agenda_priority' },
          { id:'rum_keep_resources', label:'Retain current arrangements', detail:'Keep the current court arrangements and ordinary obligations.', operation:'agenda_priority' }
        ] },
      { id:'rum_approaches', name:'Local approaches', year:1096, season:1,
        text:'Review actual movement and control near your frontier. Nicomedia and Nicaea share one map county; this review grants no new local authority or victory.',
        choices:[
          { id:'rum_defensive_priority', label:'Prioritize local defense', detail:'Record a defensive intention. Use ordinary diplomacy and army orders for actual action.', operation:'agenda_priority' },
          { id:'rum_keep_frontier', label:'Retain current dispositions', detail:'Make no additional commitment and leave existing orders in force.', operation:'agenda_priority' }
        ] },
      { id:'rum_eastern_policy', name:'Eastern interests', year:1096, season:2,
        text:'Eastern ambitions compete with local responsibilities. Choose a priority from the current situation rather than a required historical departure.',
        choices:[
          { id:'rum_eastern_priority', label:'Prioritize eastern diplomacy', detail:'Record the intention to review living eastern courts. No alliance, war or journey is created.', operation:'agenda_priority' },
          { id:'rum_remain_local', label:'Keep attention on the local court', detail:'Record continued local attention without cancelling existing commitments.', operation:'agenda_priority' }
        ] },
      { id:'rum_continuation', name:'Rule after a changing frontier', year:1097, season:0,
        text:'Your living court and actual holdings determine what comes next. No loss of Nicaea, captive family or replacement capital is imposed by this review.',
        choices:[
          { id:'rum_continue_rule', label:'Conclude with the surviving court', detail:'Complete the review at the actual court, leaving ordinary wars and obligations to their owners.', operation:'agenda_finish' },
          { id:'rum_extend_review', label:'Continue the frontier reviews', detail:'Review present responsibilities, affordable defense and living foreign courts through Winter 1097. No departure or campaign is ordered.', operation:'agenda_priority' },
          { id:'rum_finish_review', label:'Conclude the frontier program', detail:'Finish this personal program without moving the court or granting land.', operation:'agenda_finish' }
        ] },
      { id:'rum_present_jurisdiction', name:'Present jurisdiction and obligations', year:1097, season:0,
        text:'Inspect the holdings you actually retain. The Nicaea county is a map abstraction, not proof of every local right. Existing control, household and military obligations decide what you can do next.',
        choices:[
          { id:'rum_review_current_jurisdiction', label:'Prioritize present jurisdiction', detail:'Record a priority without claiming a new county, local office or settlement.', operation:'agenda_priority' },
          { id:'rum_keep_current_duties', label:'Retain current obligations', detail:'Continue with actual holdings and duties, without an imposed change of capital.', operation:'agenda_priority' }
        ] },
      { id:'rum_affordable_defense', name:'Defense within current means', year:1097, season:1,
        text:'Review the current account and the hosts actually available. Defense, recruitment and supplies require their ordinary funds and orders. Neither a dated review nor a foreign religious call proves a local attack.',
        choices:[
          { id:'rum_review_defense_costs', label:'Prioritize affordable defense', detail:'Record the priority. No troops, provisions, money or defensive victory are created.', operation:'agenda_priority' },
          { id:'rum_keep_current_orders', label:'Retain current military orders', detail:'Leave the ordinary military decisions and their existing costs in force.', operation:'agenda_priority' }
        ] },
      { id:'rum_living_relations', name:'Relations across the changed frontier', year:1097, season:2,
        text:'Review the living imperial and eastern courts from your actual position. Their current decisions may differ from earlier intentions. No common allegiance, automatic alliance or required historical battle follows from this program.',
        choices:[
          { id:'rum_review_living_courts', label:'Prioritize current diplomatic relations', detail:'Record an intention to use ordinary diplomatic controls. No treaty, homage or journey is made.', operation:'agenda_priority' },
          { id:'rum_defer_new_commitments', label:'Defer new foreign commitments', detail:'Keep existing relations without accepting an agreement or declaring a war.', operation:'agenda_priority' }
        ] },
      { id:'rum_extended_conclusion', name:'The frontier at the program’s close', year:1097, season:3,
        text:'Continue from the actual court and holdings. A siege, loss, survival, captive household or move to a different capital must be an actual campaign fact, never a conclusion supplied by this review.',
        choices:[
          { id:'rum_retain_living_court', label:'Continue ordinary rule', detail:'Complete the program without an award or a change to any existing war, family member or holding.', operation:'agenda_priority' },
          { id:'rum_close_extended_review', label:'Close the remaining frontier reviews', detail:'Close this program while ordinary obligations continue.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_eastern_rulers_1096 = {
  opening_alexios_1096:{ id:'opening_alexios_1096', type:'opening_profile',
    title:'The imperial court’s first goals', intro:'Optional goals distinguish a recorded priority from actual public receipts and host expenses. Completing them grants no extra reward.',
    scenarioIds:['alexios_1096'], provinceIds:['constantinople'], officeRealmId:'byzantium_1096', requires:['alexios_agenda_1096'],
    goals:[
      { id:'alexios_court_policy_1096', name:'Choose a court priority', text:'Commit a choice in the opening administration review.', office:true, criterion:{ kind:'story_choice', storyId:'alexios_agenda_1096', choiceIds:['alexios_record_service','alexios_retain_administration'] } },
      { id:'alexios_court_receipts_1096', name:'Receive ordinary public revenue', text:'Receive a positive ordinary public receipt after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'byzantium_1096' } },
      { id:'alexios_host_expense_1096', name:'Meet an actual host expense', text:'Pay an ordinary host expense through its canonical account after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'byzantium_1096' } }
    ], contacts:[
      { id:'rum_ruler_1096', label:'The Nicaean court', text:'The opening ruler at Nicaea remains a separate political party. A personal link grants no treaty or audience.', linkKind:'target', required:true, person:{ source:'realm_ruler', realmId:'rum_1096' } }
    ] },
  opening_rum_1096:{ id:'opening_rum_1096', type:'opening_profile',
    title:'The Nicaean court’s first goals', intro:'Optional goals distinguish a recorded priority from actual public receipts and host expenses. Completing them grants no extra reward.',
    scenarioIds:['kilij_arslan_1096'], provinceIds:['nicaea'], officeRealmId:'rum_1096', requires:['rum_agenda_1096'],
    goals:[
      { id:'rum_court_policy_1096', name:'Choose a court priority', text:'Commit a choice in the opening court review.', office:true, criterion:{ kind:'story_choice', storyId:'rum_agenda_1096', choiceIds:['rum_review_resources','rum_keep_resources'] } },
      { id:'rum_court_receipts_1096', name:'Receive ordinary public revenue', text:'Receive a positive ordinary public receipt after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'rum_1096' } },
      { id:'rum_host_expense_1096', name:'Meet an actual host expense', text:'Pay an ordinary host expense through its canonical account after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'rum_1096' } }
    ], contacts:[
      { id:'imperial_ruler_1096', label:'The imperial court', text:'Alexios is the opening emperor at Constantinople. Contact retains ordinary travel, social and diplomatic restrictions.', linkKind:'target', required:true, person:{ source:'realm_ruler', realmId:'byzantium_1096' } }
    ] }
};

(function () {
  'use strict';
  [FBDATA.rulerAgendas_eastern_rulers_1096, FBDATA.openingProfiles_eastern_rulers_1096].forEach(function (table) {
    Object.keys(table).forEach(function (id) {
      if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
      FBDATA.storyInstances[id] = table[id];
    });
  });
})();
