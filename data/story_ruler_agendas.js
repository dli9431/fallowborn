/* Personal reviews follow living courts and their existing transactions.
   Dates below pace decisions; they impose no historical outcome. */
FBDATA.rulerAgendas = {
  peroz_agenda_476:{ id:'peroz_agenda_476', type:'ruler_agenda', subjectRealmId:'sasanian_476',
    title:'Peroz: court and frontier', intro:'Balance provincial terms, appointed service and royal recognition. Eastern policy follows the actual frontier; this program promises no victory or succession.',
    stages:[
      { id:'peroz_provincial_bargain', name:'Provincial terms', year:476, season:0,
        text:'The royal court depends on provincial households and their existing rights. Review a lighter bargain with the Mihran interest, or retain its terms. Any negotiation uses public funds.',
        choices:[
          { id:'peroz_review_terms', label:'Offer lighter provincial burdens', detail:'Offer the Mihran interest 65% public revenue and 60% military service through the ordinary funded negotiation. Its living principal and jurisdiction must still permit these terms.', operation:'agenda_provincial_terms', interestId:'mihran', revenue:0.65, levy:0.6 },
          { id:'peroz_keep_terms', label:'Retain the provincial terms', detail:'Record a preference for the existing obligations. No payment, pledge or public appointment is created.', operation:'agenda_priority' }
        ] },
      { id:'peroz_provincial_service', name:'Provincial service', year:476, season:1,
        text:'Public administration in Deeds owns appointments and their costs. Review a retained effective officer or appoint a lawful replacement there before recording that service here.',
        choices:[
          { id:'peroz_record_service', label:'Record effective provincial service', detail:'Observe an effective public appointment belonging to this court since the program opened. Retaining an opening officer is sufficient; no dismissal or private estate grant is required.', operation:'agenda_public_record', recordKind:'agenda_appointments' },
          { id:'peroz_keep_officers', label:'Defer provincial changes', detail:'Keep present arrangements without making or renewing an appointment.', operation:'agenda_priority' }
        ] },
      { id:'peroz_royal_recognition', name:'Royal recognition', year:477, season:0,
        text:'A royal relative is a candidate, not an automatic successor. Public administration reviews living candidates and provincial support. Record actual recognition or keep the present arrangements.',
        choices:[
          { id:'peroz_record_recognition', label:'Record current royal support', detail:'Observe actual positive recognition in the current ruler generation. This program neither supplies consent nor installs a successor.', operation:'agenda_public_record', recordKind:'agenda_recognition' },
          { id:'peroz_keep_recognition', label:'Keep present succession arrangements', detail:'Record that priority without appointing Balash or any other relative.', operation:'agenda_priority' }
        ] },
      { id:'peroz_eastern_policy', name:'Eastern policy', year:481, season:0,
        text:'Review the living frontier through ordinary diplomacy and army controls. Its courts and borders may differ from the opening. This planning window does not announce a captivity, battle or royal death.',
        choices:[
          { id:'peroz_defensive_priority', label:'Retain a defensive priority', detail:'Complete this program with the present frontier arrangements. Ordinary diplomacy and campaigns retain their actual gates; no troops, war, ransom or treaty are created.', operation:'agenda_priority' },
          { id:'peroz_finish_program', label:'Conclude the court program', detail:'Finish without a new frontier commitment or a guaranteed succession.', operation:'agenda_finish' }
        ] }
    ] },
  odoacer_agenda_476:{ id:'odoacer_agenda_476', type:'ruler_agenda', subjectRealmId:'federates_476',
    requires:['western_court_476','western_office_476','theoderic_italy_476'],
    title:'Odoacer: host and government', intro:'The host, Ravenna and recognition remain separate questions. Each political choice belongs to the western court or its existing campaign; this program adds no second pay or army.',
    stages:[
      { id:'odoacer_host_and_pay', name:'Host and pay', year:476, season:0,
        text:'Review the western court’s current service or contest decision. A decision already made can be recorded without paying or declaring war again.',
        choices:[
          { id:'odoacer_paid_service', label:'Review paid service', detail:'Use the western court’s actual reviewed service terms.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'accept_service' },
          { id:'odoacer_contest_city', label:'Contest Ravenna', detail:'Use the existing court decision. Actual armies must secure the city.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'contest_ravenna' },
          { id:'odoacer_keep_host', label:'Keep the host outside the bargain', detail:'Close the court’s opening choice without pay or a campaign.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'keep_host' },
          { id:'odoacer_record_bargain', label:'Record the existing host decision', detail:'Observe the court’s saved resolution without repeating its transaction.', operation:'agenda_story_fact', storyId:'western_court_476', stateField:'aiResolution', values:['negotiated','war','won','failed','declined'] },
          { id:'odoacer_defer_bargain', label:'Leave the court decision for later', detail:'Record a priority only. The original western court decision remains available on its own story card.', operation:'agenda_priority' }
        ] },
      { id:'odoacer_holding_the_city', name:'Holding the city', year:476, season:0,
        text:'Civic government requires real Ravenna control, local consent and mediation. A host outside the city may conclude its opening program without conquest.',
        choices:[
          { id:'odoacer_civic_rule', label:'Review Ravenna’s civic government', detail:'Use the existing civic settlement decision and its actual institutional agreement.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'accept_civic_rule' },
          { id:'odoacer_host_rule', label:'Retain the host government after victory', detail:'Use the existing government choice without gaining another mandate.', operation:'agenda_story_choice', storyId:'western_court_476', choiceId:'retain_host_rule' },
          { id:'odoacer_record_government', label:'Record the existing government decision', detail:'Observe a saved civic or federate decision without making it again.', operation:'agenda_story_fact', storyId:'western_court_476', stateField:'governanceResolved', values:['civic','federate'] },
          { id:'odoacer_keep_arrangements', label:'Keep the present arrangements', detail:'Record no government change. You can return to the western court’s own decision after actual conquest.', operation:'agenda_priority' },
          { id:'odoacer_finish_host', label:'Conclude with service or independent command', detail:'End this program without requiring possession of Ravenna.', operation:'agenda_finish' }
        ] },
      { id:'odoacer_eastern_standing', name:'Eastern standing', year:476, season:2,
        text:'An Italian holding, civic acceptance and imperial recognition are distinct. Review actual appointments and claims through Offices & Legitimacy. This program cannot award a new imperial commission.',
        choices:[
          { id:'odoacer_keep_standing', label:'Continue without a new mandate', detail:'Record the present standing. No eastern recognition, Italian title or removal of another living claim follows.', operation:'agenda_priority' },
          { id:'odoacer_finish_standing', label:'Conclude the opening program', detail:'Finish without seeking an unsupported commission.', operation:'agenda_finish' }
        ] },
      { id:'odoacer_amal_opportunity', name:'The Amal opportunity', year:488, season:0,
        text:'The existing Italian campaign depends on its living parties, commission and actual target. Review its current decision or record the source’s divergent conclusion.',
        choices:[
          { id:'odoacer_face_campaign', label:'Face the existing campaign', detail:'Authorize only the source campaign. The program grants no victory or second host.', operation:'agenda_story_choice', storyId:'theoderic_italy_476', choiceId:'face_campaign' },
          { id:'odoacer_leave_campaign', label:'Close this opportunity for ordinary diplomacy', detail:'Use the source campaign’s decline. Ordinary relations and independent wars remain available.', operation:'agenda_story_choice', storyId:'theoderic_italy_476', choiceId:'leave_campaign' },
          { id:'odoacer_record_campaign', label:'Record the actual campaign conclusion', detail:'Observe its won, failed, diverted or interrupted result without recreating the opportunity.', operation:'agenda_story_fact', storyId:'theoderic_italy_476', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'odoacer_keep_defense', label:'Retain present defensive arrangements', detail:'Conclude the personal program without forcing the campaign or a historical death. Its own card and ordinary armies keep their current rules.', operation:'agenda_priority' }
        ] }
    ] },
  syagrius_agenda_476:{ id:'syagrius_agenda_476', type:'ruler_agenda', subjectRealmId:'west_francia',
    requires:['western_court_476','clovis_syagrius_476'],
    title:'Syagrius: domain and neighboring courts', intro:'Maintain the surviving domain and choose how to meet neighboring courts. The Frankish challenge remains conditional on its existing campaign.',
    stages:[
      { id:'syagrius_gallic_receipts', name:'Gallic receipts', year:476, season:0,
        text:'Review lawful receipts and offices through ordinary government decisions. No new imperial mandate or reconstructed census belongs to this program.',
        choices:[
          { id:'syagrius_keep_receipts', label:'Retain fiscal arrangements', detail:'Record the current priority without collecting an additional tax or making an appointment.', operation:'agenda_priority' }
        ] },
      { id:'syagrius_neighboring_courts', name:'Neighboring courts', year:477, season:0,
        text:'Use ordinary diplomacy to review the living Frankish and Gothic courts. Their relationships, consent and funds remain real conditions; no treaty is promised here.',
        choices:[
          { id:'syagrius_keep_independence', label:'Retain independent arrangements', detail:'Record this policy without creating a treaty, obligation or recognition.', operation:'agenda_priority' },
          { id:'syagrius_finish_relations', label:'Conclude the diplomatic program', detail:'Finish the agenda while keeping ordinary diplomacy available.', operation:'agenda_finish' }
        ] },
      { id:'syagrius_frankish_challenge', name:'The Frankish challenge', year:486, season:0,
        text:'The challenge needs the correct living rulers, inheritance and possession of Soissons. Its date alone causes no invasion or defeat.',
        choices:[
          { id:'syagrius_face_challenge', label:'Face the existing challenge', detail:'Use the campaign’s current authorization. Real war determines its outcome.', operation:'agenda_story_choice', storyId:'clovis_syagrius_476', choiceId:'face_campaign' },
          { id:'syagrius_leave_challenge', label:'Use ordinary diplomacy instead', detail:'Close only the authored campaign opportunity through its own decline.', operation:'agenda_story_choice', storyId:'clovis_syagrius_476', choiceId:'leave_campaign' },
          { id:'syagrius_record_challenge', label:'Record the actual challenge conclusion', detail:'Observe the world story’s own result, including changed inheritance or ownership.', operation:'agenda_story_fact', storyId:'clovis_syagrius_476', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'syagrius_keep_policy', label:'Retain ordinary policy', detail:'Make no campaign decision here. The source card and ordinary diplomacy remain available.', operation:'agenda_priority' }
        ] },
      { id:'syagrius_domain_after_challenge', name:'The surviving domain', year:486, season:0,
        text:'Review the court and counties that actually survive through ordinary government. An ongoing war remains ongoing; this personal conclusion cannot arrange refuge, surrender or execution.',
        choices:[
          { id:'syagrius_record_result', label:'Record the concluded challenge', detail:'Observe its actual conclusion without a second award or forced loss.', operation:'agenda_story_fact', storyId:'clovis_syagrius_476', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'syagrius_keep_domain', label:'Conclude with the present domain', detail:'Complete this personal review without changing possession or resolving any ongoing ordinary war.', operation:'agenda_priority' }
        ] }
    ] },
  muhammad_agenda_1204:{ id:'muhammad_agenda_1204', type:'ruler_agenda', subjectRealmId:'khwarazm_1204',
    title:'Muhammad II: superior and frontier', intro:'Review actual superior relations, frontier preparations and independent steppe service. Public obligations do not transfer the residents’ fields or the following’s people.',
    stages:[
      { id:'muhammad_superior_and_possession', name:'Superior and possession', year:1204, season:0,
        text:'Review the current superior relationship and possessions through ordinary diplomacy. The opening distinction between suzerainty and local holdings grants no new dues or land.',
        choices:[
          { id:'muhammad_keep_relations', label:'Retain the current relations', detail:'Record the present policy without a tribute installment, annexation or change of local communities.', operation:'agenda_priority' }
        ] },
      { id:'muhammad_frontier_preparation', name:'Frontier preparation', year:1204, season:1,
        text:'Use ordinary army and diplomacy controls to prepare the actual frontier. Historical danger does not mean that a Ghurid invasion is occurring in this campaign.',
        choices:[
          { id:'muhammad_keep_dispositions', label:'Keep present dispositions', detail:'Record preparation as a priority. No host, inundation, relief army or invasion is created.', operation:'agenda_priority' }
        ] },
      { id:'muhammad_steppe_service', name:'Steppe service', year:1204, season:2,
        text:'The existing Qipchaq following bargains independently. Its Mobile coalition sheet owns proposals; an actual offer to your court can be reviewed here with the ordinary outside-party acceptance checks.',
        choices:[
          { id:'muhammad_accept_offer', label:'Review the following’s current offer', detail:'Accept the first offered agreement to this court only after its exact price, parties, consent and terms pass the canonical review.', operation:'agenda_mobile_offer', otherRealmId:'qipchaq_following_1204' },
          { id:'muhammad_record_service', label:'Record an active agreement', detail:'Observe a real, unexpired agreement with this court since the program opened. No extra fighters, payment, land or kin are created.', operation:'agenda_public_record', recordKind:'agenda_mobile_agreement', otherRealmId:'qipchaq_following_1204' },
          { id:'muhammad_keep_following', label:'Leave the following independent', detail:'Record no agreement. Ordinary proposals remain subject to living parties and consent.', operation:'agenda_priority' }
        ] },
      { id:'muhammad_frontier_result', name:'Frontier account', year:1205, season:0,
        text:'Review present peace, wars and retained districts through ordinary diplomacy. A historical battle elsewhere supplies no automatic victory or collapse here.',
        choices:[
          { id:'muhammad_keep_frontier', label:'Conclude with the current frontier', detail:'Complete this program without an annexation, forced peace or scripted ruler death.', operation:'agenda_priority' },
          { id:'muhammad_finish_program', label:'Finish the opening program', detail:'End the personal program; ordinary decisions retain their current terms.', operation:'agenda_finish' }
        ] }
    ] },
  siwa_agenda_1204:{ id:'siwa_agenda_1204', type:'ruler_agenda', subjectRealmId:'siwa_households_1204',
    title:'Siwa: mandate and public account', intro:'Represent the oasis through the existing public mandate and constituent consent. Your farming household, its property and the public treasury remain distinct.',
    stages:[
      { id:'siwa_public_mandate', name:'The public mandate', year:1204, season:0,
        text:'Local government in Deeds shows the actual mandate and proposals. Keeping it creates no new acclamation or private jurisdiction.',
        choices:[
          { id:'siwa_keep_mandate', label:'Retain the current mandate', detail:'Record a priority without renewing the mandate, taking land or changing ordinary obligations.', operation:'agenda_priority' }
        ] },
      { id:'siwa_household_burden', name:'The household burden', year:1204, season:1,
        text:'An extraordinary levy requires the living constituency’s exact assent. Existing dues and declared caps still apply; receipts belong to the public institution.',
        choices:[
          { id:'siwa_limited_dues', label:'Review limited extraordinary dues', detail:'Seek consent for an additional public receipt of {money:1} for 90 days. This creates a temporary dues record, not an immediate payment to your household.', operation:'agenda_dues', amount:1, duration:90 },
          { id:'siwa_record_dues', label:'Record an existing approved levy', detail:'Observe an actually executed extraordinary-tax decision under this same mandate since the program opened, without collecting or imposing it again.', operation:'agenda_public_record', recordKind:'agenda_collective_decision', recordOperation:'extraordinary_tax' },
          { id:'siwa_keep_dues', label:'Keep ordinary dues', detail:'Decline a new levy. Neither public nor private money changes.', operation:'agenda_priority' }
        ] },
      { id:'siwa_consent_and_defense', name:'Consent and defense', year:1204, season:2,
        text:'Use Local government to review a real treaty or defensive decision. A peaceful review needs no invented raiders or outside offer, and this program cannot override constituent refusal.',
        choices:[
          { id:'siwa_record_treaty', label:'Record an executed treaty decision', detail:'Observe an actual treaty executed through the current mandate and consent. No new treaty, expense or private pledge follows.', operation:'agenda_public_record', recordKind:'agenda_collective_decision', recordOperation:'treaty' },
          { id:'siwa_record_defense', label:'Record an executed defense decision', detail:'Observe an actual war decision executed through this mandate. The program adds no levy or army.', operation:'agenda_public_record', recordKind:'agenda_collective_decision', recordOperation:'war' },
          { id:'siwa_keep_peace', label:'Retain current peaceful arrangements', detail:'Record the current policy without asserting that a raid or protection offer occurred.', operation:'agenda_priority' }
        ] },
      { id:'siwa_public_account', name:'The public account', year:1205, season:0,
        text:'Review the current public account in Local government. Completion adds no revenue or renewed mandate. Recall or loss of the original mandate ends this program separately.',
        choices:[
          { id:'siwa_close_account', label:'Conclude the public review', detail:'Finish with actual public obligations and private property unchanged by this conclusion.', operation:'agenda_priority' },
          { id:'siwa_finish_program', label:'Finish without another proposal', detail:'End this personal program without a new ballot or receipt.', operation:'agenda_finish' }
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
    var id = bindings[scenario.id];
    if (!id) return;
    scenario.tracks = (scenario.tracks || []).slice();
    if (scenario.tracks.indexOf(id) < 0) scenario.tracks.push(id);
  });
})();
