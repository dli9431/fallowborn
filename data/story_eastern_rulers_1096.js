FB.bookmarkSources.stage({"source":"data/story_eastern_rulers_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal priorities observe ordinary government without imposing outcomes. */
FBDATA.rulerAgendas_eastern_rulers_1096 = {
  alexios_agenda_1096:{ id:'alexios_agenda_1096', type:'ruler_agenda', subjectRealmId:'byzantium_1096',
    title:'Alexios: court, frontier and passage', intro:'As Alexios, steer the empire from Constantinople in 1096: your governors, the frontier with Kilij Arslan’s Nicaea and the western armies seeking passage to Asia. You may close the program after four reviews or continue through Winter 1097. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'alexios_administration', name:'Governors and the treasury', year:1096, season:0,
        text:'Appointed governors run your provinces, not your family. Name and pay them under Public administration in Rank & Realm.',
        choices:[
          { id:'alexios_record_service', label:'Record a governor you have appointed', detail:'Notes a provincial appointment your court made since this program began.', operation:'agenda_public_record', recordKind:'agenda_appointments' },
          { id:'alexios_retain_administration', label:'Keep the present governors in place', detail:'Your court turns to other matters and leaves the provincial offices as they stand.', operation:'agenda_priority' }
        ] },
      { id:'alexios_frontier', name:'The frontier with Nicaea', year:1096, season:1,
        text:'Kilij Arslan rules from Nicaea, a short march from the Bosporus. Look over your armies and decide whether the Anatolian frontier needs them.',
        choices:[
          { id:'alexios_defensive_priority', label:'Put the defense of the frontier first', detail:'Your court turns to the armies and forts facing Nicaea.', operation:'agenda_priority' },
          { id:'alexios_retain_dispositions', label:'Leave the armies where they stand', detail:'Your court keeps its attention on the capital and leaves the frontier as it is.', operation:'agenda_priority' }
        ] },
      { id:'alexios_passage', name:'Western armies at the borders', year:1096, season:2,
        text:'Western armies answering the pope’s call may reach your borders this autumn, wanting markets and passage across the Bosporus to Asia.',
        choices:[
          { id:'alexios_passage_priority', label:'Seek terms for the western armies’ passage', detail:'Your court turns to markets, guides and oaths for the western leaders.', operation:'agenda_priority' },
          { id:'alexios_keep_passage_terms', label:'Keep the westerners at arm’s length', detail:'Your court offers the western leaders no new bargain and watches the roads.', operation:'agenda_priority' }
        ] },
      { id:'alexios_continuation', name:'The court after a year', year:1097, season:0,
        text:'A year on, the western armies, Nicaea and your frontier may stand very differently. Close the program here or keep reviewing through Winter 1097.',
        choices:[
          { id:'alexios_continue_rule', label:'Rule on with the court as it stands', detail:'Ends the program; your wars, treaties and family duties carry on.', operation:'agenda_finish' },
          { id:'alexios_extend_review', label:'Keep reviewing the court through 1097', detail:'Four more reviews follow through Winter 1097: your governors, the treasury, the westerners and the court at the close.', operation:'agenda_priority' },
          { id:'alexios_finish_review', label:'End the court reviews here', detail:'Ends the program now; any war or treaty under way continues.', operation:'agenda_finish' }
        ] },
      { id:'alexios_service_continuity', name:'Governors serving in 1097', year:1097, season:0,
        text:'Some governors you named may have died, lost their posts or never taken them up. Your relatives hold no provincial post by birth.',
        choices:[
          { id:'alexios_record_current_service', label:'Record a governor appointed since the program began', detail:'Notes a provincial appointment your court made since the program opened.', operation:'agenda_public_record', recordKind:'agenda_appointments' },
          { id:'alexios_keep_current_service', label:'Leave the governors’ terms as they are', detail:'Your court turns elsewhere and changes no officer’s terms.', operation:'agenda_priority' }
        ] },
      { id:'alexios_public_account', name:'Paying for the empire', year:1097, season:1,
        text:'The treasury must carry your armies, your governors and the household through 1097. Decide which bills come first.',
        choices:[
          { id:'alexios_fund_current_needs', label:'Pay the most pressing needs first', detail:'Your court turns to the troops, supplies and offices it can afford.', operation:'agenda_priority' },
          { id:'alexios_keep_public_account', label:'Hold spending where it stands', detail:'Your court keeps its present spending and raises no new tax.', operation:'agenda_priority' }
        ] },
      { id:'alexios_current_approaches', name:'The western leaders in Asia', year:1097, season:2,
        text:'The western leaders may now hold towns your empire claims in Asia, or may have moved on. Passage, markets and their oaths to you are separate bargains with each of them.',
        choices:[
          { id:'alexios_review_present_parties', label:'Press the western leaders on their oaths', detail:'Your court turns to the westerners still in your lands and what they promised you.', operation:'agenda_priority' },
          { id:'alexios_defer_new_terms', label:'Make no new bargains with the westerners', detail:'Your court lets its standing agreements run and offers nothing new.', operation:'agenda_priority' }
        ] },
      { id:'alexios_extended_conclusion', name:'The court at the program’s close', year:1097, season:3,
        text:'Winter 1097 closes the program. Look over your family, your governors and the frontier; wars and treaties carry on after it.',
        choices:[
          { id:'alexios_retain_living_court', label:'Rule on as emperor', detail:'Your court closes its reviews and turns back to the empire’s daily business.', operation:'agenda_priority' },
          { id:'alexios_close_extended_review', label:'Close the remaining court reviews', detail:'Ends the program; every duty and agreement stays in force.', operation:'agenda_finish' }
        ] }
    ] },
  rum_agenda_1096:{ id:'rum_agenda_1096', type:'ruler_agenda', subjectRealmId:'rum_1096',
    title:'Kilij Arslan: Nicaea and the frontier', intro:'As Kilij Arslan, rule the Sultanate of Rum from Nicaea in 1096, between Alexios’s empire across the Bosporus and the Danishmendid court to the east. You may close the program after four reviews or continue through Winter 1097. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'rum_court', name:'The Nicaean court', year:1096, season:0,
        text:'From Nicaea you rule Greek townspeople and Turkish warriors alike. Look over what your court takes in and what it owes.',
        choices:[
          { id:'rum_review_resources', label:'Put the court’s accounts in order', detail:'Your court turns to its revenue and its stores.', operation:'agenda_priority' },
          { id:'rum_keep_resources', label:'Leave the court’s affairs as they are', detail:'Your court keeps its present arrangements and looks elsewhere.', operation:'agenda_priority' }
        ] },
      { id:'rum_approaches', name:'The roads to Nicaea', year:1096, season:1,
        text:'Bands of western pilgrims and soldiers may cross from Constantinople toward Nicomedia and Nicaea. Watch who moves near your frontier.',
        choices:[
          { id:'rum_defensive_priority', label:'Guard Nicaea and its approaches', detail:'Your court turns to the walls and the roads from the Bosporus.', operation:'agenda_priority' },
          { id:'rum_keep_frontier', label:'Keep your warriors where they are', detail:'Your court leaves its forces as they stand and watches the roads.', operation:'agenda_priority' }
        ] },
      { id:'rum_eastern_policy', name:'Rivals to the east', year:1096, season:2,
        text:'The Danishmendid court at Sebasteia and other Turkish lords contest the lands east of Nicaea. Decide whether your attention turns east or stays at home.',
        choices:[
          { id:'rum_eastern_priority', label:'Turn toward the Danishmendids in the east', detail:'Your court looks to the eastern courts and what they want from you.', operation:'agenda_priority' },
          { id:'rum_remain_local', label:'Keep your attention on Nicaea', detail:'Your court stays with the city and the western frontier.', operation:'agenda_priority' }
        ] },
      { id:'rum_continuation', name:'Rule after a changing frontier', year:1097, season:0,
        text:'By spring 1097 the western armies, the emperor and your eastern rivals may have changed the frontier. Close the program here or keep reviewing through Winter 1097.',
        choices:[
          { id:'rum_continue_rule', label:'Rule on with the court that remains', detail:'Ends the program; your wars and duties carry on.', operation:'agenda_finish' },
          { id:'rum_extend_review', label:'Keep reviewing the frontier through 1097', detail:'Four more reviews follow through Winter 1097: your lands, your defense, your neighbors and the frontier at the close.', operation:'agenda_priority' },
          { id:'rum_finish_review', label:'End the frontier reviews here', detail:'Ends the program now; your court stays where it is.', operation:'agenda_finish' }
        ] },
      { id:'rum_present_jurisdiction', name:'What you still hold', year:1097, season:0,
        text:'Look over the towns and lands still under your rule, and the warriors and household who depend on you.',
        choices:[
          { id:'rum_review_current_jurisdiction', label:'Secure the lands still under your rule', detail:'Your court turns to the towns and roads it holds.', operation:'agenda_priority' },
          { id:'rum_keep_current_duties', label:'Keep to your present duties', detail:'Your court carries on with the lands and duties it has.', operation:'agenda_priority' }
        ] },
      { id:'rum_affordable_defense', name:'Defense within your means', year:1097, season:1,
        text:'Troops, supplies and repairs all cost money. Weigh what your treasury can pay for against the threats you can see.',
        choices:[
          { id:'rum_review_defense_costs', label:'Pay for the defense you can afford', detail:'Your court turns to the troops and supplies within its means.', operation:'agenda_priority' },
          { id:'rum_keep_current_orders', label:'Keep your army’s present orders', detail:'Your court leaves its commanders’ orders and costs as they are.', operation:'agenda_priority' }
        ] },
      { id:'rum_living_relations', name:'Relations across the changed frontier', year:1097, season:2,
        text:'The emperor at Constantinople and the Turkish courts to the east may stand differently toward you now. Weigh each court as you find it.',
        choices:[
          { id:'rum_review_living_courts', label:'Seek terms with your neighbors', detail:'Your court turns to envoys for the emperor and the eastern courts.', operation:'agenda_priority' },
          { id:'rum_defer_new_commitments', label:'Make no new foreign commitments', detail:'Your court keeps its present relations and seeks no new treaty.', operation:'agenda_priority' }
        ] },
      { id:'rum_extended_conclusion', name:'The frontier at the program’s close', year:1097, season:3,
        text:'A year on, the frontier around Nicaea may look very different. Take stock of what your court still holds.',
        choices:[
          { id:'rum_retain_living_court', label:'Rule on from where you stand', detail:'Your court closes its reviews and turns back to daily rule.', operation:'agenda_priority' },
          { id:'rum_close_extended_review', label:'Close the remaining frontier reviews', detail:'Ends the program; your wars and duties carry on.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_eastern_rulers_1096 = {
  opening_alexios_1096:{ id:'opening_alexios_1096', type:'opening_profile',
    title:'The imperial court’s first goals', intro:'Three goals for your first year at Constantinople: choose how your governors serve, collect revenue and pay your armies. They bring no reward of their own.',
    scenarioIds:['alexios_1096'], provinceIds:['constantinople'], officeRealmId:'byzantium_1096', requires:['alexios_agenda_1096'],
    goals:[
      { id:'alexios_court_policy_1096', name:'Choose how your governors serve', text:'Done when you make a choice in Governors and the treasury, the first review of your court agenda.', office:true, criterion:{ kind:'story_choice', storyId:'alexios_agenda_1096', choiceIds:['alexios_record_service','alexios_retain_administration'] } },
      { id:'alexios_court_receipts_1096', name:'Collect public revenue', text:'Done when the imperial treasury receives public revenue after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'byzantium_1096' } },
      { id:'alexios_host_expense_1096', name:'Pay your army’s upkeep', text:'Done when the treasury pays your army’s upkeep in full after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'byzantium_1096' } }
    ], contacts:[
      { id:'rum_ruler_1096', label:'The sultan at Nicaea', text:'Kilij Arslan, the young Seljuk ruler at Nicaea, holds the lands just across the Bosporus from your capital.', linkKind:'target', required:true, person:{ source:'realm_ruler', realmId:'rum_1096' } }
    ] },
  opening_rum_1096:{ id:'opening_rum_1096', type:'opening_profile',
    title:'The Nicaean court’s first goals', intro:'Three goals for your first year at Nicaea: settle the court’s accounts, collect revenue and pay your warriors. They bring no reward of their own.',
    scenarioIds:['kilij_arslan_1096'], provinceIds:['nicaea'], officeRealmId:'rum_1096', requires:['rum_agenda_1096'],
    goals:[
      { id:'rum_court_policy_1096', name:'Decide on the Nicaean court’s accounts', text:'Done when you make a choice in The Nicaean court, the first review of your court agenda.', office:true, criterion:{ kind:'story_choice', storyId:'rum_agenda_1096', choiceIds:['rum_review_resources','rum_keep_resources'] } },
      { id:'rum_court_receipts_1096', name:'Collect public revenue', text:'Done when your treasury at Nicaea receives public revenue after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'rum_1096' } },
      { id:'rum_host_expense_1096', name:'Pay your army’s upkeep', text:'Done when the treasury pays your army’s upkeep in full after the opening.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'rum_1096' } }
    ], contacts:[
      { id:'imperial_ruler_1096', label:'The emperor at Constantinople', text:'Alexios Komnenos, the emperor at Constantinople, rules the empire across the Bosporus from your lands.', linkKind:'target', required:true, person:{ source:'realm_ruler', realmId:'byzantium_1096' } }
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
});
