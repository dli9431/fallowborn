/* Personal priorities observe ordinary government without imposing outcomes. */
FBDATA.rulerAgendas_eastern_rulers_1096 = {
  alexios_agenda_1096:{ id:'alexios_agenda_1096', type:'ruler_agenda', subjectRealmId:'byzantium_1096',
    title:'Alexios: court, frontier and passage', intro:'Keep provincial service, frontier defense and foreign passage under their own lawful decisions. These reviews record your priorities without directing another ruler.',
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
          { id:'alexios_continue_rule', label:'Continue with present responsibilities', detail:'Conclude the review with ordinary government, family and military obligations still in force.', operation:'agenda_priority' },
          { id:'alexios_finish_review', label:'Conclude the court program', detail:'Finish this personal program without settling an ongoing war or treaty.', operation:'agenda_finish' }
        ] }
    ] },
  rum_agenda_1096:{ id:'rum_agenda_1096', type:'ruler_agenda', subjectRealmId:'rum_1096',
    title:'Kilij Arslan: Nicaea and the frontier', intro:'Choose priorities for the Nicaean court as the frontier changes. Ordinary diplomacy, resources and armies determine what follows.',
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
          { id:'rum_continue_rule', label:'Continue with the surviving court', detail:'Complete the review at the actual court, leaving ordinary wars and obligations to their owners.', operation:'agenda_priority' },
          { id:'rum_finish_review', label:'Conclude the frontier program', detail:'Finish this personal program without moving the court or granting land.', operation:'agenda_finish' }
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
