FB.bookmarkSources.stage({"source":"data/story_ruler_agendas.js","bookmarks":["476","1204"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal reviews follow living courts and their existing transactions.
   Dates below pace decisions; they impose no historical outcome. */
FBDATA.rulerAgendas = {
  frederick_agenda_1241:{ id:'frederick_agenda_1241', type:'ruler_agenda', subjectRealmId:'hre_1241',
    title:'Frederick II: campaign and crowns',
    intro:'Set your course as Frederick outside Faenza: your family, your funds, your Italian opponents, Pope Gregory IX and your crowns. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'fi_court', name:'The court outside Faenza', year:1241, season:0,
        text:'You are near Faenza, and your family lives apart from you. Decide whether your household or the campaign comes first.',
        choices:[
          { id:'fi_household', label:'Put your family and court first', detail:'You turn to your relatives and the people who serve your court.', operation:'agenda_priority' },
          { id:'fi_keep_court', label:'Stay with the campaign near Faenza', detail:'You leave the household as it is and attend to the campaign.', operation:'agenda_priority' }
        ] },
      { id:'fi_accounts', name:'What the campaign can afford', year:1241, season:0,
        text:'Check your funds and what you already owe. A longer campaign must be paid for with money you can raise.',
        choices:[
          { id:'fi_affordable', label:'Spend only what your treasury can bear', detail:'You plan recruits, provisions and loans around the money you can raise.', operation:'agenda_priority' },
          { id:'fi_keep_accounts', label:'Carry on with your present spending', detail:'You hold to the payments you already make.', operation:'agenda_priority' }
        ] },
      { id:'fi_rights', name:'Italian opponents and local rights', year:1241, season:0,
        text:'Several Italian courts rule their own lands. See who holds what and how they stand toward you before you choose arms or talks.',
        choices:[
          { id:'fi_defence', label:'Guard your Italian lands first', detail:'You turn to defending the places you hold against your Italian opponents.', operation:'agenda_priority' },
          { id:'fi_negotiation', label:'Seek terms with the Italian courts', detail:'You look toward talks, where the other court must agree and terms may cost money.', operation:'agenda_priority' },
          { id:'fi_keep_rights', label:'Hold your present line in Italy', detail:'You carry on with the Italian courts and their rights as before.', operation:'agenda_priority' }
        ] },
      { id:'fi_papacy', name:'The quarrel with the pope', year:1241, season:0,
        text:'Pope Gregory IX excommunicated you again in 1239. Decide how much of your attention the quarrel deserves.',
        choices:[
          { id:'fi_communication', label:'Look for a way to reach Rome', detail:'You turn to possible talks with the papal court, where absolution is the pope’s to give.', operation:'agenda_priority' },
          { id:'fi_keep_obligations', label:'Put your own lands before Rome', detail:'You turn to governing your lands while the papal quarrel stands.', operation:'agenda_priority' }
        ] },
      { id:'fi_announcement', name:'A council was announced', year:1241, season:0,
        text:'Gregory IX has called a church council to meet in Rome. Decide how closely your court should watch it.',
        choices:[
          { id:'fi_council', label:'Watch Gregory’s council in Rome', detail:'You turn your attention to who may travel to the council and what it may decide.', operation:'agenda_priority' },
          { id:'fi_keep_council', label:'Leave the council to Rome', detail:'You keep your attention on your own court and campaign.', operation:'agenda_priority' }
        ] },
      { id:'fi_crowns', name:'Claims and resources across the crowns', year:1241, season:1,
        text:'Look over the lands you still hold. Your imperial and Sicilian crowns share one treasury, and a claim alone pays you nothing.',
        choices:[
          { id:'fi_local_obligations', label:'Put the duties of your lands first', detail:'You turn to what each of your lands owes you and what you owe it.', operation:'agenda_priority' },
          { id:'fi_conserve', label:'Save money across both crowns', detail:'You make sparing the shared treasury your concern.', operation:'agenda_priority' }
        ] },
      { id:'fi_reconsider', name:'Reconsider the campaign', year:1241, season:1,
        text:'See where you stand, which wars you are fighting and which rival courts survive. Then choose between defense, talks and travel.',
        choices:[
          { id:'fi_reassess', label:'Rethink your campaign in Italy', detail:'Note the priority; armies and envoys still need your orders.', operation:'agenda_priority' },
          { id:'fi_keep_campaign', label:'Stay on your present course', detail:'You carry the campaign on as you have been running it.', operation:'agenda_priority' }
        ] },
      { id:'fi_continue', name:'Continue governing', year:1241, season:2,
        text:'This court agenda can close while your wars and duties go on. Your family, office and quarrels decide what comes next.',
        choices:[
          { id:'fi_finish', label:'Close your court agenda', detail:'You end this agenda and govern on from where you stand.', operation:'agenda_finish' },
          { id:'fi_keep_governing', label:'Govern on with your present priorities', detail:'You close the agenda holding to the course you have set.', operation:'agenda_priority' }
        ] }
    ] },
  peroz_agenda_476:{ id:'peroz_agenda_476', type:'ruler_agenda', subjectRealmId:'sasanian_476',
    title:'Peroz: court and frontier', intro:'As Peroz, King of Kings, weigh the great houses, your governors, the succession and the eastern frontier. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'peroz_provincial_bargain', name:'Provincial terms', year:476, season:0,
        text:'Your court depends on the great houses, the Mihran family among them. Offer the Mihran lighter burdens, paid for from public funds, or hold them to their present terms.',
        choices:[
          { id:'peroz_review_terms', label:'Offer the Mihran family lighter burdens', detail:'Offers the Mihran terms of 65% public revenue and 60% military service, at a cost to public funds. Their living head must still be able to accept.', operation:'agenda_provincial_terms', interestId:'mihran', revenue:0.65, levy:0.6 },
          { id:'peroz_keep_terms', label:'Hold the Mihran to their present terms', detail:'You leave the Mihran family’s burdens as they are and turn to other business.', operation:'agenda_priority' }
        ] },
      { id:'peroz_provincial_service', name:'Provincial service', year:476, season:1,
        text:'Governors are appointed and paid through Public administration in Deeds. Keep a capable officer or name a new one there, then record it here.',
        choices:[
          { id:'peroz_record_service', label:'Record the governors now serving', detail:'Notes your effective officers, whether serving since the start or appointed later.', operation:'agenda_public_record', recordKind:'agenda_appointments' },
          { id:'peroz_keep_officers', label:'Leave your governors as they are', detail:'You put off changes in the provinces and turn to other matters.', operation:'agenda_priority' }
        ] },
      { id:'peroz_royal_recognition', name:'Royal recognition', year:477, season:0,
        text:'A royal relative such as Balash is a candidate, not a certain heir. Public administration in Deeds shows the living candidates and who in the provinces backs them.',
        choices:[
          { id:'peroz_record_recognition', label:'Record the backing for a royal candidate', detail:'Marks this step done once a candidate has recognition in your reign.', operation:'agenda_public_record', recordKind:'agenda_recognition' },
          { id:'peroz_keep_recognition', label:'Leave the succession open', detail:'You hold back your own support and watch Balash and your other relatives.', operation:'agenda_priority' }
        ] },
      { id:'peroz_eastern_policy', name:'Eastern policy', year:481, season:0,
        text:'From 481, look again at your eastern frontier, where courts and borders may have changed. Diplomacy and your armies remain yours to direct.',
        choices:[
          { id:'peroz_defensive_priority', label:'Guard the eastern frontier', detail:'You close this agenda with the defense of your eastern lands first.', operation:'agenda_priority' },
          { id:'peroz_finish_program', label:'Close your court agenda', detail:'You end this agenda with the frontier and the succession as they stand.', operation:'agenda_finish' }
        ] }
    ] },
  odoacer_agenda_476:{ id:'odoacer_agenda_476', type:'ruler_agenda', subjectRealmId:'federates_476',
    requires:['western_court_476','western_office_476','theoderic_italy_476'],
    title:'Odoacer: host and government', intro:'Decide how the host is paid, whether it takes Ravenna, and how Constantinople sees you. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'odoacer_host_and_pay', name:'Host and pay', year:476, season:0,
        text:'Your host wants its pay. Take service with the western court, fight it for Ravenna or keep out of its quarrel.',
        choices:[
          { id:'odoacer_paid_service', label:'Take the western court’s pay', detail:'You settle the host’s grievance with the western court.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'accept_service' },
          { id:'odoacer_contest_city', label:'Fight the western court for Ravenna', detail:'You settle the host’s claim by war.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'contest_ravenna' },
          { id:'odoacer_keep_host', label:'Keep the host out of the quarrel', detail:'You leave the western court to its own troubles.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'keep_host' },
          { id:'odoacer_record_bargain', label:'Note your answer to the western court', detail:'Records the outcome once you have answered in the western court story.', operation:'agenda_story_fact', storyId:'western_court_476', stateField:'aiResolution', values:['negotiated','war','won','failed','declined'] },
          { id:'odoacer_defer_bargain', label:'Answer the western court later', detail:'You settle the host’s pay later, from the western court story in Deeds.', operation:'agenda_priority' }
        ] },
      { id:'odoacer_holding_the_city', name:'Holding the city', year:476, season:0,
        text:'Civic rule in Ravenna needs the city in your hands, its consent and a bishop’s mediation. A host that stays outside the city can close its agenda here.',
        choices:[
          { id:'odoacer_civic_rule', label:'Accept Ravenna’s civic settlement', detail:'You choose Roman civic rule for Ravenna.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'accept_civic_rule' },
          { id:'odoacer_host_rule', label:'Retain the host’s government', detail:'You choose to rule Ravenna through your own host.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'retain_host_rule' },
          { id:'odoacer_record_government', label:'Note how Ravenna is governed', detail:'Records the outcome once Ravenna’s government has been chosen.', operation:'agenda_story_fact', storyId:'western_court_476', stateField:'governanceResolved', values:['civic','federate'] },
          { id:'odoacer_keep_arrangements', label:'Decide Ravenna’s government later', detail:'You return to the question in the western court story once the city is yours.', operation:'agenda_priority' },
          { id:'odoacer_finish_host', label:'Close the agenda as host commander', detail:'You end this agenda, with or without Ravenna.', operation:'agenda_finish' }
        ] },
      { id:'odoacer_eastern_standing', name:'Eastern standing', year:476, season:2,
        text:'Holding Italian land, winning Ravenna’s citizens and gaining recognition from Constantinople are separate matters. Decide where you stand with the eastern court.',
        choices:[
          { id:'odoacer_keep_standing', label:'Rely on your own strength in Italy', detail:'You put your host and your Italian standing ahead of favor from Constantinople.', operation:'agenda_priority' },
          { id:'odoacer_finish_standing', label:'Close the agenda and await Constantinople', detail:'You end this agenda and leave eastern recognition for later dealings.', operation:'agenda_finish' }
        ] },
      { id:'odoacer_amal_opportunity', name:'The Amal opportunity', year:488, season:0,
        text:'From 488 Theoderic the Amal may march on Ravenna with a commission from Constantinople. Look to your defense, or note how that war ended.',
        retiredChoiceIds:['odoacer_face_campaign','odoacer_leave_campaign'],
        choices:[
          { id:'odoacer_record_campaign', label:'Note how the war for Ravenna ended', detail:'Records the outcome once Theoderic’s campaign is over.', operation:'agenda_story_fact', storyId:'theoderic_italy_476', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'odoacer_keep_defense', label:'Look to your defenses against Theoderic', detail:'You close this agenda with your host and strongholds as your concern.', operation:'agenda_priority' }
        ] }
    ] },
  syagrius_agenda_476:{ id:'syagrius_agenda_476', type:'ruler_agenda', subjectRealmId:'west_francia',
    requires:['western_court_476','clovis_syagrius_476'],
    title:'Syagrius: domain and neighboring courts', intro:'Hold your domain around Soissons and choose how to meet the Franks and the Goths. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'syagrius_gallic_receipts', name:'Gallic receipts', year:476, season:0,
        text:'Soissons lives on the revenue of the Gallic lands you hold. Look over your officers and receipts before you turn to your neighbors.',
        choices:[
          { id:'syagrius_keep_receipts', label:'Keep your Gallic revenues as they are', detail:'You turn to your officers and the revenue that already reaches Soissons.', operation:'agenda_priority' }
        ] },
      { id:'syagrius_neighboring_courts', name:'Neighboring courts', year:477, season:0,
        text:'The Franks and the Goths are your neighbors. Talks go through Diplomacy, where each court must consent and any payment comes from your funds.',
        choices:[
          { id:'syagrius_keep_independence', label:'Stand apart from Franks and Goths', detail:'You put the independence of Soissons ahead of ties with either neighbor.', operation:'agenda_priority' },
          { id:'syagrius_finish_relations', label:'Close your court agenda early', detail:'You end the agenda before its review of the Franks in 486.', operation:'agenda_finish' }
        ] },
      { id:'syagrius_frankish_challenge', name:'The Frankish challenge', year:486, season:0,
        text:'From 486 Clovis, once king of the Franks, may attack Soissons. The decision is his; prepare your defense.',
        retiredChoiceIds:['syagrius_face_challenge','syagrius_leave_challenge'],
        choices:[
          { id:'syagrius_record_challenge', label:'Note how the war for Soissons ended', detail:'Records the outcome once Clovis’s campaign is over.', operation:'agenda_story_fact', storyId:'clovis_syagrius_476', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'syagrius_keep_policy', label:'Ready Soissons against Clovis', detail:'You turn to your army and the defense of Soissons.', operation:'agenda_priority' }
        ] },
      { id:'syagrius_domain_after_challenge', name:'The surviving domain', year:486, season:0,
        text:'Look over the court and lands you still hold around Soissons. A war still being fought goes on after this agenda closes.',
        choices:[
          { id:'syagrius_record_result', label:'Note how the war for Soissons ended', detail:'Records the outcome once Clovis’s campaign is over and closes the agenda.', operation:'agenda_story_fact', storyId:'clovis_syagrius_476', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'syagrius_keep_domain', label:'Hold what remains of your domain', detail:'You close the agenda to govern the lands still in your hands.', operation:'agenda_priority' }
        ] }
    ] },
  muhammad_agenda_1204:{ id:'muhammad_agenda_1204', type:'ruler_agenda', subjectRealmId:'khwarazm_1204',
    title:'Muhammad II: superior and frontier', intro:'At Gurganj, weigh your Qara Khitai overlord, the Ghurid frontier and the Qipchaq following on the steppe. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'muhammad_superior_and_possession', name:'Superior and possession', year:1204, season:0,
        text:'You rule from Gurganj under the suzerainty of the Qara Khitai. Look over that tie and your own lands before the frontier calls.',
        choices:[
          { id:'muhammad_keep_relations', label:'Keep your tie to the Qara Khitai', detail:'You hold your place under the Qara Khitai and turn to your own lands.', operation:'agenda_priority' }
        ] },
      { id:'muhammad_frontier_preparation', name:'Frontier preparation', year:1204, season:1,
        text:'The Ghurids are your rivals to the south, though they may never invade. Ready your army and your diplomacy.',
        choices:[
          { id:'muhammad_keep_dispositions', label:'Watch the Ghurids from your present positions', detail:'You make readiness on the southern frontier your concern.', operation:'agenda_priority' }
        ] },
      { id:'muhammad_steppe_service', name:'Steppe service', year:1204, season:2,
        text:'The Eastern Qipchaq following bargains for itself. If it offers your court an agreement from its Mobile coalition sheet, you can answer here.',
        choices:[
          { id:'muhammad_accept_offer', label:'Accept the Qipchaq offer', detail:'Takes the following’s first open offer to your court after you review its price and terms.', operation:'agenda_mobile_offer', otherRealmId:'qipchaq_following_1204' },
          { id:'muhammad_record_service', label:'Record the agreement with the Qipchaq', detail:'Marks this step done if an agreement made with your court since the agenda opened is active.', operation:'agenda_public_record', recordKind:'agenda_mobile_agreement', otherRealmId:'qipchaq_following_1204' },
          { id:'muhammad_keep_following', label:'Leave the Qipchaq to themselves', detail:'You rely on your own army and leave the following to its own affairs.', operation:'agenda_priority' }
        ] },
      { id:'muhammad_frontier_result', name:'Frontier account', year:1205, season:0,
        text:'In 1205, look over your peace, your wars and the districts you still hold. Then close your court agenda.',
        choices:[
          { id:'muhammad_keep_frontier', label:'Hold the frontier as it stands', detail:'You close the agenda keeping watch over the districts you hold.', operation:'agenda_priority' },
          { id:'muhammad_finish_program', label:'Close your court agenda', detail:'You end this agenda and govern on from Gurganj.', operation:'agenda_finish' }
        ] }
    ] },
  siwa_agenda_1204:{ id:'siwa_agenda_1204', type:'ruler_agenda', subjectRealmId:'siwa_households_1204',
    title:'Siwa: mandate and public account', intro:'As Siwa’s delegate, answer to the oasis households and keep their public treasury apart from your own farm and purse. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'siwa_public_mandate', name:'The public mandate', year:1204, season:0,
        text:'The households of Siwa have given you a public mandate. Local government in Deeds shows it and the members’ proposals.',
        choices:[
          { id:'siwa_keep_mandate', label:'Serve the households under your mandate', detail:'You turn to the people who gave you the mandate and their present business.', operation:'agenda_priority' }
        ] },
      { id:'siwa_household_burden', name:'The household burden', year:1204, season:1,
        text:'Extra dues from the households need the members’ consent and must stay within the agreed limits. The money goes to the public treasury.',
        choices:[
          { id:'siwa_limited_dues', label:'Ask for limited extra dues', detail:'Asks the members for extra public dues of {money:1} for 90 days. The money goes to the public treasury, not your household.', operation:'agenda_dues', amount:1, duration:90 },
          { id:'siwa_record_dues', label:'Record the approved extra dues', detail:'Marks this step done if extra dues have been carried out under your mandate since the agenda opened.', operation:'agenda_public_record', recordKind:'agenda_collective_decision', recordOperation:'extraordinary_tax' },
          { id:'siwa_keep_dues', label:'Spare the households extra dues', detail:'You keep the oasis households to the dues they already pay.', operation:'agenda_priority' }
        ] },
      { id:'siwa_consent_and_defense', name:'Consent and defense', year:1204, season:2,
        text:'Treaties and defense go through Local government in Deeds, where the members can refuse. A quiet season is a sound choice too.',
        choices:[
          { id:'siwa_record_treaty', label:'Record the treaty the members approved', detail:'Marks this step done if a treaty has been carried out under your mandate since the agenda opened.', operation:'agenda_public_record', recordKind:'agenda_collective_decision', recordOperation:'treaty' },
          { id:'siwa_record_defense', label:'Record the war the members approved', detail:'Marks this step done if a war decision has been carried out under your mandate since the agenda opened.', operation:'agenda_public_record', recordKind:'agenda_collective_decision', recordOperation:'war' },
          { id:'siwa_keep_peace', label:'Keep the oasis at peace', detail:'You turn to the quiet of the oasis and its households.', operation:'agenda_priority' }
        ] },
      { id:'siwa_public_account', name:'The public account', year:1205, season:0,
        text:'In 1205, look over the public treasury in Local government. This agenda ends sooner if your mandate is recalled or lost.',
        choices:[
          { id:'siwa_close_account', label:'Settle the public account', detail:'You close the agenda with the members’ treasury kept apart from your own purse.', operation:'agenda_priority' },
          { id:'siwa_finish_program', label:'Close without another proposal', detail:'You end this agenda and put nothing new to the members.', operation:'agenda_finish' }
        ] }
    ] }
};
(function () {
  'use strict';
  Object.keys(FBDATA.rulerAgendas).forEach(function (id) {
    if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
    FBDATA.storyInstances[id] = FBDATA.rulerAgendas[id];
  });
  var bindings = { peroz_476:'peroz_agenda_476', peroz_sasanian_476:'peroz_agenda_476',
    odoacer_476:'odoacer_agenda_476', syagrius_476:'syagrius_agenda_476',
    muhammad_1204:'muhammad_agenda_1204', siwa_delegate_1204:'siwa_agenda_1204' };
  FBDATA.startScenarios.forEach(function (scenario) {
    if (!scenario || scenario.tracks !== undefined && !Array.isArray(scenario.tracks)) return;
    var id = bindings[scenario.id];
    if (!id) return;
    scenario.tracks = (scenario.tracks || []).slice();
    if (scenario.tracks.indexOf(id) < 0) scenario.tracks.push(id);
  });
})();
});
