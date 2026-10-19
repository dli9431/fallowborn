/* Existing people and costless personal reviews; ordinary government owns effects. */
window.FBDATA = window.FBDATA || {};

FBDATA.royalCourts_1241 = {
  hungary_1241:{ dynasty:'Arpad', spouseId:'maria', rulerSiblingIds:['coloman'], members:[
    { id:'maria', name:'Maria Laskarina', sex:'f', born:1206, culture:'greek', religion:'catholic', spouseId:'ruler' },
    { id:'stephen', name:'Stephen', sex:'m', born:1239, culture:'magyar', religion:'catholic', fatherId:'ruler', motherId:'maria' },
    { id:'coloman', name:'Coloman', sex:'m', born:1208, culture:'magyar', religion:'catholic', homeProvinceId:'zagreb', siblingIds:['ruler'], spouseId:null }
  ] },
  vladimir_1241:{ dynasty:'Rurikid', spouseId:'feodosia', members:[
    { id:'feodosia', name:'Feodosia', sex:'f', born:1200, culture:'rus', religion:'orthodox', spouseId:'ruler', homeProvinceId:'rostov' },
    { id:'alexander', name:'Alexander Yaroslavich', sex:'m', born:1221, culture:'rus', religion:'orthodox', fatherId:'ruler', motherId:'feodosia', spouseId:'alexander_wife', homeProvinceId:'rostov' },
    { id:'andrei', name:'Andrei Yaroslavich', sex:'m', born:1222, culture:'rus', religion:'orthodox', fatherId:'ruler', motherId:'feodosia', spouseId:null },
    { id:'alexander_wife', name:'Daughter of Bryachislav', sex:'f', born:1222, culture:'rus', religion:'orthodox', spouseId:'alexander', homeProvinceId:'rostov' }
  ] }
};

FBDATA.rulerAgendas_1241 = {
  bela_agenda_1241:{ id:'bela_agenda_1241', type:'ruler_agenda', subjectRealmId:'hungary_1241',
    title:'Bela: court and preparation', intro:'Review real resources and public obligations. These priorities create no troops, protection agreement or historical outcome.',
    stages:[
      { id:'bela_accounts', name:'The present crown', year:1241, season:0,
        text:'Your lands and treasury are the existing crown’s. Review them in Rank & Realm before choosing a priority.', choices:[
          { id:'bela_review_accounts', label:'Prioritize the current accounts', detail:'Record a costless priority. The current treasury and all public obligations remain unchanged.', operation:'agenda_priority' },
          { id:'bela_keep_accounts', label:'Retain present arrangements', detail:'Continue ordinary government without an additional commitment.', operation:'agenda_priority' }
        ] },
      { id:'bela_family', name:'The royal household', year:1241, season:0,
        text:'Maria and Stephen are existing family members. Coloman is your brother in Slavonia. Kinship alone provides no command, relocation or promise of safety.', choices:[
          { id:'bela_family_priority', label:'Keep the household in view', detail:'Record attention to the family. Any journey or political action retains its ordinary requirements.', operation:'agenda_priority' },
          { id:'bela_defer_family', label:'Leave household plans open', detail:'Make no journey, appointment or protection pledge.', operation:'agenda_priority' }
        ] },
      { id:'bela_defense', name:'Preparation and resources', year:1241, season:0,
        text:'Use ordinary military and treasury controls for actual preparations. A priority here does not muster or provision a host.', choices:[
          { id:'bela_defensive_priority', label:'Favor defensive preparation', detail:'Record a preference without spending public or private funds or raising soldiers.', operation:'agenda_priority' },
          { id:'bela_defer_defense', label:'Defer a new commitment', detail:'Keep current forces and obligations.', operation:'agenda_priority' }
        ] },
      { id:'bela_hosted_people', name:'People under royal protection', year:1241, season:0,
        text:'Historical accounts describe already hosted Cumans and a guarded personal party near the court. This opening agenda supplies context only; it initializes no following, custody or access contract.', choices:[
          { id:'bela_review_protection', label:'Consider lawful protection', detail:'Record a priority only. Actual protection and access require their own living parties, authority and resources.', operation:'agenda_priority' },
          { id:'bela_keep_protection', label:'Leave present arrangements unchanged', detail:'Create no agreement, accusation, expulsion or private reward.', operation:'agenda_priority' }
        ] },
      { id:'bela_contacts', name:'Neighbors and obligations', year:1241, season:1,
        text:'Review living courts through ordinary diplomacy. No report here proves an approaching army or a local attack.', choices:[
          { id:'bela_diplomatic_priority', label:'Prioritize current diplomacy', detail:'Record a preference without a treaty, payment or declaration of war.', operation:'agenda_priority' },
          { id:'bela_keep_diplomacy', label:'Keep existing relations', detail:'Retain the ordinary diplomacy and access rules.', operation:'agenda_priority' }
        ] },
      { id:'bela_war_review', name:'The actual military situation', year:1241, season:1,
        text:'Inspect current wars and host positions. Historical battle dates do not determine this campaign’s outcome.', choices:[
          { id:'bela_review_war', label:'Review the current defense', detail:'Record a priority without reporting a battle, casualty, victory or defeat.', operation:'agenda_priority' },
          { id:'bela_defer_war', label:'Make no additional commitment', detail:'Keep existing orders and forces.', operation:'agenda_priority' }
        ] },
      { id:'bela_response', name:'A sustainable response', year:1241, season:2,
        text:'A funded response belongs to the ordinary treasury and military controls. The family and crown retain their actual resources.', choices:[
          { id:'bela_resource_priority', label:'Prioritize sustainable obligations', detail:'Record a policy without collecting revenue or paying an expense.', operation:'agenda_priority' },
          { id:'bela_defer_response', label:'Postpone a new response', detail:'Create no order or payment.', operation:'agenda_priority' }
        ] },
      { id:'bela_continuation', name:'The court continues', year:1241, season:3,
        text:'Conclude this personal review from the campaign as it stands. The conclusion neither restores lands nor guarantees household survival.', choices:[
          { id:'bela_continue', label:'Continue ordinary government', detail:'Close the opening program with the actual court and obligations.', operation:'agenda_priority' },
          { id:'bela_finish', label:'Conclude without another priority', detail:'End this personal program without an additional effect.', operation:'agenda_finish' }
        ] }
    ] },
  yaroslav_agenda_1241:{ id:'yaroslav_agenda_1241', type:'ruler_agenda', subjectRealmId:'vladimir_1241',
    title:'Yaroslav: recovery and northern relations', intro:'Govern the existing principality and consider its living neighbors. No future confirmation, journey or tribute agreement is supplied.',
    stages:[
      { id:'yaroslav_accounts', name:'The present principality', year:1241, season:0,
        text:'Review the actual lands, treasury and obligations in Rank & Realm. Earlier destruction supplies context, not an automatic new loss or recovery award.', choices:[
          { id:'yaroslav_review_accounts', label:'Prioritize the current accounts', detail:'Record a costless priority without changing money, population or holdings.', operation:'agenda_priority' },
          { id:'yaroslav_keep_accounts', label:'Retain present arrangements', detail:'Continue the existing government.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_family', name:'One princely family', year:1241, season:0,
        text:'Feodosia, Alexander and Andrei are your existing kin. Alexander and his wife have a separate northern home; kinship does not install either son at Novgorod.', choices:[
          { id:'yaroslav_family_priority', label:'Consider the family’s positions', detail:'Record attention to actual people without creating an office, marriage or move.', operation:'agenda_priority' },
          { id:'yaroslav_defer_family', label:'Leave family plans open', detail:'Keep the existing relationships and homes.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_north', name:'Novgorod and its choices', year:1241, season:0,
        text:'Novgorod has its own court. The historical recall involved requests and negotiation; this agenda neither grants its office nor schedules a return.', choices:[
          { id:'yaroslav_northern_priority', label:'Prioritize northern relations', detail:'Record a preference. No Novgorod authority or hereditary claim is awarded.', operation:'agenda_priority' },
          { id:'yaroslav_keep_north', label:'Retain current relations', detail:'Create no appointment or treaty.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_reports', name:'Reports and present limits', year:1241, season:0,
        text:'Current wars and living courts are available through the ordinary controls. This review reports no unseen local battle or compulsory foreign demand.', choices:[
          { id:'yaroslav_review_reports', label:'Keep decisions tied to current affairs', detail:'Record a costless priority without asserting a new event.', operation:'agenda_priority' },
          { id:'yaroslav_defer_reports', label:'Wait before another commitment', detail:'Retain the present obligations.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_recovery', name:'Recovery and expenditure', year:1241, season:1,
        text:'Actual development, work and military expenditure retain their ordinary costs. The calendar grants no replacement population or rebuilt holding.', choices:[
          { id:'yaroslav_recovery_priority', label:'Favor sustainable recovery', detail:'Record a priority without spending funds or creating resources.', operation:'agenda_priority' },
          { id:'yaroslav_defer_recovery', label:'Defer new expenditure', detail:'Leave existing resources unchanged.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_diplomacy', name:'Lawful diplomacy', year:1241, season:1,
        text:'Consider actual neighboring courts through ordinary diplomacy. Later confirmation by Batu is historical context, not an opening treaty or tribute contract.', choices:[
          { id:'yaroslav_diplomatic_priority', label:'Prioritize present diplomacy', detail:'Record a preference without a foreign journey, recognition or submission.', operation:'agenda_priority' },
          { id:'yaroslav_keep_diplomacy', label:'Keep current relations', detail:'Create no additional obligation.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_obligations', name:'Present obligations', year:1241, season:2,
        text:'Review what your actual government and wars require. This principality does not automatically govern every Rus court.', choices:[
          { id:'yaroslav_review_obligations', label:'Prioritize the existing domain', detail:'Record a priority without extending jurisdiction or collecting a payment.', operation:'agenda_priority' },
          { id:'yaroslav_defer_obligations', label:'Avoid a new commitment', detail:'Retain current authority and resources.', operation:'agenda_priority' }
        ] },
      { id:'yaroslav_continuation', name:'The principality continues', year:1241, season:3,
        text:'Conclude the opening review from the living court’s actual position. Ordinary succession, diplomacy and recovery continue.', choices:[
          { id:'yaroslav_continue', label:'Continue ordinary government', detail:'Close this personal program without a reward or promised recognition.', operation:'agenda_priority' },
          { id:'yaroslav_finish', label:'Conclude without another priority', detail:'End the program without creating a new obligation.', operation:'agenda_finish' }
        ] }
    ] }
};

FBDATA.openingProfiles_rulers_1241 = {
  opening_bela_1241:{ id:'opening_bela_1241', type:'opening_profile', title:'The crown’s opening goals',
    intro:'Optional personal decisions and actual funded service. Completion grants no extra reward.',
    scenarioIds:['bela_1241'], officeRealmId:'hungary_1241', requires:['bela_agenda_1241'],
    goals:[
      { id:'bela_accounts_goal', name:'Choose an administrative priority', text:'Commit an opening accounts decision.', office:true, criterion:{ kind:'story_choice', storyId:'bela_agenda_1241', choiceIds:['bela_review_accounts','bela_keep_accounts'] } },
      { id:'bela_defense_goal', name:'Review preparation', text:'Commit a defensive priority or a deliberate deferral.', office:true, criterion:{ kind:'story_choice', storyId:'bela_agenda_1241', choiceIds:['bela_defensive_priority','bela_defer_defense'] } },
      { id:'bela_host_payment', name:'Meet an actual host expense', text:'Pay a positive ordinary military expense. A priority alone cannot complete this goal.', office:true, criterion:{ kind:'event', eventKind:'profile_host_payment', realmId:'hungary_1241' } }
    ], contacts:[
      { id:'bela_maria', label:'The queen', text:'Maria is the existing spouse. Ordinary kin and household access remains authoritative.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'hungary_1241', memberId:'maria' } },
      { id:'bela_coloman', label:'A brother in Slavonia', text:'Coloman is external kin. This contact grants no commission or command.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'hungary_1241', memberId:'coloman' } }
    ] },
  opening_yaroslav_1241:{ id:'opening_yaroslav_1241', type:'opening_profile', title:'The principality’s opening goals',
    intro:'Optional priorities and actual public receipts. These goals create no new authority or reward.',
    scenarioIds:['yaroslav_1241'], officeRealmId:'vladimir_1241', requires:['yaroslav_agenda_1241'],
    goals:[
      { id:'yaroslav_accounts_goal', name:'Choose an administrative priority', text:'Commit an opening accounts decision.', office:true, criterion:{ kind:'story_choice', storyId:'yaroslav_agenda_1241', choiceIds:['yaroslav_review_accounts','yaroslav_keep_accounts'] } },
      { id:'yaroslav_north_goal', name:'Consider northern relations', text:'Commit a northern priority or retain the current relations.', office:true, criterion:{ kind:'story_choice', storyId:'yaroslav_agenda_1241', choiceIds:['yaroslav_northern_priority','yaroslav_keep_north'] } },
      { id:'yaroslav_receipt', name:'Receive an ordinary public receipt', text:'Receive a positive payment through the existing public account.', office:true, criterion:{ kind:'event', eventKind:'profile_receipt', realmId:'vladimir_1241' } }
    ], contacts:[
      { id:'yaroslav_feodosia', label:'The prince’s wife', text:'Feodosia is one existing person, also Alexander’s mother. This contact creates no relocation.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'vladimir_1241', memberId:'feodosia' } },
      { id:'yaroslav_alexander', label:'Alexander', text:'The existing son retains his northern home and ordinary access. No Novgorod office is implied.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'vladimir_1241', memberId:'alexander' } },
      { id:'yaroslav_andrei', label:'Andrei', text:'The existing son is not installed as Novgorod’s ruler by this contact.', linkKind:'kin', required:true, person:{ source:'royal_member', realmId:'vladimir_1241', memberId:'andrei' } }
    ] }
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var b = FBDATA.bookmarks['1241'], realms = copy(b.realms);
  realms.forEach(function (realm) {
    if (FBDATA.royalCourts_1241[realm.id]) realm.royalCourt = copy(FBDATA.royalCourts_1241[realm.id]);
  });
  var layout = copy(FBDATA.settlementLayouts['1241']);
  function courtHead(county, site) {
    var index = layout[county].map(function (row) { return row.site; }).indexOf(site);
    if (index < 0) throw new Error('Missing opening court site: ' + site);
    var row = layout[county].splice(index,1)[0];
    delete row.fill;
    row.kind = 'town';
    layout[county].unshift(row);
  }
  courtHead('szekesfehervar','geo_obuda_3054643');
  courtHead('suzdal','geo_vladimir_473247');
  FBDATA.settlementLayouts['1241_royal_households_v2'] = layout;
  /* Retained campaigns keep their original people and settlement indexes. */
  var starts = FBDATA.startScenarios.filter(function (sc) {
    return (!sc.bookmarkIds || sc.bookmarkIds.indexOf('1241') >= 0) &&
      (!sc.eras || sc.eras.indexOf(b.era) >= 0);
  }).map(function (sc) { return sc.id; });
  b.revisions.baseline.starts = starts.filter(function (id) { return id !== 'bela_1241' && id !== 'yaroslav_1241' && id !== 'alexander_1241'; });
  b.revisions.royal_households_v2 = { realms:realms, settlementLayout:'1241_royal_households_v2', starts:starts.filter(function (id) { return id !== 'alexander_1241'; }) };
  b.revision = 'royal_households_v2';
  Object.assign(FBDATA.storyInstances,FBDATA.rulerAgendas_1241,FBDATA.openingProfiles_rulers_1241);
})();
