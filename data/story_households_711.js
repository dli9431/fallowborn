/* Household decisions observe the sandbox's actual wars and ownership. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_711 = {
  toledo_household_track_711:{ id:'toledo_household_track_711', type:'household_track',
    title:'A Household in Toledo',
    intro:'Your workshop and relatives live through the fortunes of the city. Plans are yours to make; armies, courts and the road decide what can actually happen.',
    homeProvinceId:'toledo', continuity:'household', initialStage:'waiting',
    requires:['strait_crossing_711','toledo_campaign_711','asturias_foundation_711'],
    requirements:{ provinces:['toledo','oviedo'], realms:['visigoths_711','umayyad_711'] },
    stages:{
      waiting:{ name:'Waiting for news', text:'Work continues while the southern campaign remains an opportunity. No report has yet established a crossing.', choices:[], transitions:[] },
      roman_roots:{ name:'The family workshop', text:'Your Hispano-Roman household keeps its Catholic worship and its craft. Family ties and daily customers matter while the rival courts contend.',
        choices:[
          { id:'work', label:'Keep the craft work going', detail:'Select ordinary Work the bench. Income comes only from actual daily work.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'household_work' },
          { id:'wait', label:'Keep the household’s plans open', detail:'Continue watching the city without a payment or new obligation.', operation:{ kind:'record_decision' }, next:'after_identity' }
        ], transitions:[] },
      gothic_roots:{ name:'A Gothic household in the city', text:'Your Gothic family shares the city’s Catholic worship. The workshop needs customers and your relatives need a living as the kings contend.',
        choices:[
          { id:'work', label:'Put the family craft first', detail:'Select ordinary Work the bench, with no royal service or special wage attached.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'household_work' },
          { id:'wait', label:'Keep clear of court commitments', detail:'Record a household priority without changing rank, property or allegiance.', operation:{ kind:'record_decision' }, next:'after_identity' }
        ], transitions:[] },
      jewish_roots:{ name:'Keeping household continuity', text:'Your Jewish household looks to its worship, tools and family ties while the city waits for news. The family must make its own livelihood decisions amid uncertain authority.',
        choices:[
          { id:'work', label:'Keep the workshop and family practice', detail:'Select ordinary craft work. Worship and relatives’ identities remain unchanged; only actual work earns income.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'household_work' },
          { id:'wait', label:'Keep the family’s options open', detail:'Record preparations without a religious bargain, charge or departure.', operation:{ kind:'record_decision' }, next:'after_identity' }
        ], transitions:[] },
      household_work:{ name:'At the bench', text:'The household has chosen craft work. A day’s actual positive craft income, rather than savings or a promise, completes this work decision.',
        afterWork:{ focusId:'craft_work', provinceId:'toledo', next:'after_identity' },
        choices:[{ id:'defer', label:'Set work plans aside for now', detail:'Continue waiting without claiming completed work or earnings.', operation:{ kind:'record_decision' }, next:'after_identity' }], transitions:[] },
      after_identity:{ name:'Family life and uncertain news', text:'The household keeps its own priorities while watching the fortunes of Toledo.', choices:[], transitions:[] },
      news:{ name:'News from the south', text:'A crossing campaign has begun. News of an army is no guarantee that it will reach Toledo.',
        incident:{ source:'story', storyId:'strait_crossing_711', milestone:'started', provinceId:'toledo' }, afterIncident:'after_news',
        choices:[
          { id:'continue_work', label:'Continue ordinary craft work', detail:'Keep your livelihood. This decision grants no wages or exemption from ordinary risks.', operation:{ kind:'record_decision' }, next:'after_news' },
          { id:'prepare', label:'Review the household reserves', detail:'Record preparations without spending supplies or claiming that the family has left.', operation:{ kind:'record_decision' }, next:'after_news' }
        ], transitions:[] },
      after_news:{ name:'Life beside the court', text:'The household waits for current news of the city and its rulers.', choices:[], transitions:[] },
      court:{ name:'Wartime business', text:'The ruling court is at war. Rumour does not establish that the king, his officials or the clergy have left Toledo.',
        choices:[
          { id:'keep_working', label:'Keep the workshop going', detail:'Continue under the ordinary livelihood and fiscal rules.', operation:{ kind:'record_decision' }, next:'watch' },
          { id:'seek_news', label:'Follow current court news', detail:'Keep watching the actual campaign and the city’s controller. No historical messenger or private audience is promised.', operation:{ kind:'record_decision' }, next:'watch' },
          { id:'prepare_departure', label:'Consider going north', detail:'Review a personal journey ahead of the family. Routes, money and ordinary travel gates still apply.', operation:{ kind:'record_decision' }, next:'refuge' }
        ], transitions:[] },
      watch:{ name:'Watching the road to Toledo', text:'The household continues its ordinary work. A later campaign or another war may change the city’s rule.', choices:[], transitions:[] },
      approach:{ name:'A threat to Toledo', text:'The live campaign now contests Toledo. Its outcome remains unsettled.',
        choices:[
          { id:'remain', label:'Remain in Toledo', detail:'Keep the household at home, exposed to ordinary war and changes of rule.', operation:{ kind:'record_decision' }, next:'under_threat' },
          { id:'review_north', label:'Review the northern road', detail:'Consider going ahead alone. Your relatives stay home until an eligible ordinary household settlement.', operation:{ kind:'record_decision' }, next:'refuge' },
          { id:'defer', label:'Defer the decision', detail:'Continue watching the real outcome without a levy, payment or forced departure.', operation:{ kind:'record_decision' }, next:'under_threat' }
        ], transitions:[] },
      under_threat:{ name:'The household remains', text:'You chose to wait. No battle result or surrender term is guaranteed.', choices:[], transitions:[] },
      changed_rule:{ name:'Toledo under a new court', text:'The Umayyad court now controls Toledo. Your family keeps its worship, work and property subject to the current court’s authority. No local peace charter or tax exemption is promised.',
        incident:{ source:'control', milestone:'rule_changed', provinceId:'toledo' }, afterIncident:'stay',
        choices:[
          { id:'stay', label:'Stay with the present faith', detail:'Keep your household identity and continue under current obligations. No extra historical tax is charged.', operation:{ kind:'record_decision' }, next:'stay' },
          { id:'jewish_continuity', label:'Keep the family’s Jewish practice', detail:'Remain with your present worship and livelihood. This grants no agreement with the new court or exemption from current obligations.', when:{ kind:'identity', faithId:'jewish' }, operation:{ kind:'record_decision' }, next:'stay' },
          { id:'consider_conversion', label:'Consider Islam', detail:'Review the ordinary cost and consequences for yourself or your household. This records an intention only.', operation:{ kind:'record_decision' }, next:'conversion' },
          { id:'leave', label:'Consider leaving for the north', detail:'Review a personal journey first. Arrival and the later permanent household move are separate.', operation:{ kind:'record_decision' }, next:'refuge' }
        ], transitions:[] },
      stay:{ name:'Staying in Toledo', text:'The household continues under the current court. Existing property, work and fiscal obligations remain subject to ordinary play.',
        choices:[
          { id:'resume', label:'Resume ordinary craft work', detail:'Finish this household decision without a payment, title or immunity.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'obligations', label:'Keep account of current obligations', detail:'Use the ordinary household and authority reviews for actual dues. This adds no second narrative tax.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      conversion:{ name:'A personal religious decision', text:'Consider the encountered faith through the ordinary conversion transaction. Conversion guarantees neither safety nor a lower tax burden.',
        choices:[
          { id:'convert_self', label:'Adopt Islam yourself', detail:'Review personal conversion to the locally relevant faith. Your relatives keep their identities.', operation:{ kind:'convert_faith', faithId:'umayyad_sunni_711', scope:'self' }, next:'converted_self' },
          { id:'convert_household', label:'Review household conversion', detail:'Review the higher household cost, affected relatives and ordinary penalties. Culture and county communities do not change.', operation:{ kind:'convert_faith', faithId:'umayyad_sunni_711', scope:'household' }, next:'converted_household' },
          { id:'keep_faith', label:'Keep the present faith', detail:'Cancel this intention without spending piety or prestige.', operation:{ kind:'record_decision' }, next:'stay' },
          { id:'review_departure', label:'Consider departure instead', detail:'Leave identity unchanged and review the ordinary northern journey.', operation:{ kind:'record_decision' }, next:'refuge' }
        ], transitions:[] },
      refuge:{ name:'Review the northern road', text:'You may go ahead to the Asturian uplands to seek a foothold. Neither the road nor the current local court promises safety or a new home for your family.',
        choices:[
          { id:'go_ahead', label:'Go ahead alone', detail:'Pay the reviewed ordinary journey price. The protagonist travels; relatives remain at home. Route time, danger, interruption and later settlement requirements apply.', operation:{ kind:'travel_site', travelSiteId:'toledo_northern_refuge_711' }, next:'journey' },
          { id:'wait', label:'Wait and reconsider', detail:'Keep the plan open without spending money or moving anyone.', operation:{ kind:'record_decision' }, next:'refuge_wait' },
          { id:'abandon', label:'Abandon the departure plan', detail:'Resume household life where it actually is. No journey or family evacuation has taken place.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      refuge_wait:{ name:'Departure deferred', text:'The household has not left. Review the road again when you are ready.',
        choices:[{ id:'review_again', label:'Review the road again', detail:'Obtain fresh route, eligibility and price terms before travelling.', operation:{ kind:'record_decision' }, next:'refuge' }], transitions:[] },
      journey:{ name:'On the northern road', text:'The protagonist is travelling ahead. The household’s permanent home has not moved, and absent relatives have no guaranteed protection.', choices:[], transitions:[] },
      northern:{ name:'A temporary northern foothold', text:'You have actually arrived in the uplands. The family remains at its permanent home until ordinary work and residence permit a household move. The current court may never become Asturias.',
        choices:[
          { id:'settle', label:'Review permanent household settlement', detail:'Use the ordinary residence, local-work, free-status and lifetime-move rules. Arrival alone is insufficient.', operation:{ kind:'settle_household' }, next:'settled' },
          { id:'temporary', label:'Retain a temporary foothold', detail:'Finish this decision as a personal stay. The ordinary journey and settlement controls remain available; this grants no permanent home.', operation:{ kind:'record_decision' }, next:'temporary' }
        ], transitions:[] },
      northern_court:{ name:'A northern court has formed', text:'The Asturian foundation succeeded in the live world. That does not grant this household land, office or protection. Your actual residence and current local ruler remain authoritative.',
        choices:[
          { id:'settle', label:'Review permanent household settlement', detail:'Meet the same ordinary residence and work gates. A new court does not waive them.', operation:{ kind:'settle_household' }, next:'settled' },
          { id:'temporary', label:'Retain a temporary foothold', detail:'Keep the ordinary stay without a title, recruitment promise or guaranteed northern victory.', operation:{ kind:'record_decision' }, next:'temporary' }
        ], transitions:[] },
      stayed:{ name:'The household carries on', text:'Your decision to remain is recorded. Work, property, faith and later political changes continue through ordinary play.', terminal:true, choices:[], transitions:[] },
      converted_self:{ name:'Your own faith has changed', text:'The ordinary personal conversion completed. Your relatives, culture and county communities were not converted by that choice.', terminal:true, choices:[], transitions:[] },
      converted_household:{ name:'Household conversion completed', text:'The reviewed ordinary household conversion completed with its actual cost and penalties. It grants no tax exemption or protection.', terminal:true, choices:[], transitions:[] },
      settled:{ name:'A new household home', text:'The ordinary permanent-settlement transaction moved the household after its real requirements were met. It grants no title or promised historical outcome.', terminal:true, choices:[], transitions:[] },
      temporary:{ name:'Temporary refuge', text:'Only the protagonist reached this temporary foothold. Ordinary travel controls still govern the stay, return and any later eligible household settlement.', terminal:true, choices:[], transitions:[] },
      quiet:{ name:'The city’s story took another course', text:'The campaign opportunity closed without the expected conquest. Your household continues its life under the current court.', terminal:true, choices:[], transitions:[] },
      other_rule:{ name:'Another change of rule', text:'A different court controls Toledo. Its actual authority governs local life. No Umayyad surrender, religious demand or scripted loss is inferred.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'News from the old home', text:'The household decision has become remote. Current events can be followed through world news; no local cost, conversion, evacuation or claim of safety is applied.', terminal:true, choices:[], transitions:[] },
      interrupted_journey:{ name:'The refuge attempt ended', text:'The ordinary journey ended or was interrupted. No family arrival or permanent relocation is inferred.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_711.toledo_household_track_711;
  var local = { all:[{ kind:'home', provinceId:'toledo' }, { kind:'present', provinceId:'toledo' }] };
  var gothic = { kind:'sovereign', provinceId:'toledo', realmId:'visigoths_711' };
  var muslim = { kind:'sovereign', provinceId:'toledo', realmId:'umayyad_711' };
  var crossingStarted = { kind:'story_state', storyId:'strait_crossing_711', stateField:'phase', values:['started'] };
  var crossingWon = { kind:'story_state', storyId:'strait_crossing_711', stateField:'result', values:['won'] };
  var crossingFailed = { kind:'story_state', storyId:'strait_crossing_711', stateField:'result', values:['failed','diverted','interrupted'] };
  var campaign = { kind:'story_state', storyId:'toledo_campaign_711', stateField:'phase', values:['started'] };
  var campaignClosed = { kind:'story_state', storyId:'toledo_campaign_711', stateField:'phase', values:['resolved'] };
  var closed = { any:[{ kind:'year', min:724, max:10000 },
    { all:[crossingFailed, gothic, { not:{ kind:'sovereign', provinceId:'malaga', realmId:'umayyad_711' } }, { not:campaign }] },
    { all:[campaignClosed, gothic] }] };
  function route(when, next) { return { when:when, next:next }; }
  function common() {
    return [route({ not:local }, 'remote'), route(muslim, 'changed_rule'),
      route({ all:[{ not:gothic }, { not:muslim }] }, 'other_rule')];
  }
  ['waiting','roman_roots','gothic_roots','jewish_roots','household_work','after_identity','news','after_news','court','watch','approach','under_threat'].forEach(function (id) {
    def.stages[id].transitions = common();
    def.stages[id].transitions.push(route(closed, 'quiet'));
  });
  def.stages.waiting.transitions.push(route({ any:[crossingStarted,crossingWon] }, 'news'));
  def.stages.waiting.transitions.push(route(campaign, 'approach'));
  def.stages.roman_roots.transitions.push(route({ not:{ kind:'identity', cultureId:'hispano_roman', faithId:'catholic' } }, 'after_identity'));
  def.stages.gothic_roots.transitions.push(route({ not:{ kind:'identity', cultureId:'gothic', faithId:'catholic' } }, 'after_identity'));
  def.stages.jewish_roots.transitions.push(route({ not:{ kind:'identity', faithId:'jewish' } }, 'after_identity'));
  ['roman_roots','gothic_roots','jewish_roots','household_work','after_identity','after_news'].forEach(function (id) {
    def.stages[id].transitions.push(route(campaign, 'approach'));
  });
  def.stages.after_news.transitions.push(route({ kind:'identity', faithId:'jewish' }, 'jewish_roots'));
  def.stages.after_news.transitions.push(route({ kind:'identity', cultureId:'gothic', faithId:'catholic' }, 'gothic_roots'));
  def.stages.after_news.transitions.push(route({ kind:'identity', cultureId:'hispano_roman', faithId:'catholic' }, 'roman_roots'));
  def.stages.after_identity.transitions.push(route({ kind:'at_war', provinceId:'toledo' }, 'court'));
  def.stages.after_identity.transitions.push(route({ not:{ kind:'at_war', provinceId:'toledo' } }, 'watch'));
  def.stages.after_news.transitions.push(route({ kind:'at_war', provinceId:'toledo' }, 'court'));
  def.stages.after_news.transitions.push(route({ not:{ kind:'at_war', provinceId:'toledo' } }, 'watch'));
  def.stages.watch.transitions.push(route(campaign, 'approach'));
  ['changed_rule','conversion'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'remote'), route({ not:muslim }, 'other_rule')];
  });
  def.stages.stay.transitions = [route({ not:local }, 'remote')];
  ['refuge','refuge_wait'].forEach(function (id) { def.stages[id].transitions = [route({ not:local }, 'remote')]; });
  def.stages.journey.transitions = [
    route({ kind:'home', provinceId:'oviedo' }, 'settled'),
    route({ kind:'arrived', provinceId:'oviedo' }, 'northern'),
    route({ not:{ kind:'journey', provinceId:'oviedo' } }, 'interrupted_journey')
  ];
  ['northern','northern_court'].forEach(function (id) {
    def.stages[id].transitions = [route({ kind:'home', provinceId:'oviedo' }, 'settled'),
      route({ not:{ kind:'arrived', provinceId:'oviedo' } }, 'interrupted_journey')];
  });
  def.stages.northern.transitions.push(route({ all:[{ kind:'story_state', storyId:'asturias_foundation_711', stateField:'result', values:['founded'] },
    { kind:'sovereign', provinceId:'oviedo', realmId:'asturias_711' }] }, 'northern_court'));
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_711);
  FBDATA.startScenarios.forEach(function (scenario) {
    if (scenario.id !== 'toledo_household_711') return;
    scenario.tracks = (scenario.tracks || []).concat([def.id]);
    scenario.trackLocations = Object.assign({}, scenario.trackLocations);
    scenario.trackLocations[def.id] = ['toledo'];
  });
})();
