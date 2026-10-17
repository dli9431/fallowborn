window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_crossing_711 = {
  crossing_soldier_track_711:{ id:'crossing_soldier_track_711', type:'household_track',
    title:'A Soldier at the Strait',
    intro:'Choose a livelihood and decide whether to cross. The courts command their campaigns; your personal journey follows the ordinary road and its risks.',
    homeProvinceId:'tangier', continuity:'protagonist', interruptedStage:'personal_ended', initialStage:'opening',
    requires:['strait_crossing_711','toledo_campaign_711'],
    requirements:{ provinces:['tangier','malaga','toledo'], realms:['umayyad_711'] },
    stages:{
      opening:{ name:'Household and expedition', text:'There is talk of a crossing from North Africa. Your household at Tangier still needs its ordinary livelihood. Decide whether to follow the opportunity or keep your plans local.',
        choices:[
          { id:'pursue', label:'Keep the expedition in view', detail:'Record an interest in crossing. You retain ordinary work and travel choices; this intention grants no enlistment or pay.', operation:{ kind:'record_decision' }, next:'waiting' },
          { id:'local', label:'Put the local livelihood first', detail:'Select ordinary garrison duty. Only actual paid work completes the work plan.', operation:{ kind:'set_focus', focusId:'stand_guard' }, next:'local_work' },
          { id:'decline', label:'Set the expedition aside', detail:'Finish these personal plans without a charge or service obligation.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      local_work:{ name:'A local living', text:'You have chosen garrison duty through the ordinary livelihood system. The household waits for actual earnings from that work.',
        afterWork:{ focusId:'stand_guard', provinceId:'tangier', next:'stayed' },
        choices:[{ id:'finish', label:'Leave work to the ordinary livelihood rules', detail:'Finish the story without claiming a completed shift or a special wage.', operation:{ kind:'record_decision' }, next:'stayed' }], transitions:[] },
      waiting:{ name:'Watching the strait', text:'Your interest remains a personal plan while the crossing campaign is still an opportunity. Keep working, wait for a real campaign or withdraw.',
        choices:[{ id:'withdraw', label:'Keep your plans at home', detail:'Close the expedition plan. Ordinary work remains available.', operation:{ kind:'record_decision' }, next:'stayed' }], transitions:[] },
      departure:{ name:'The crossing campaign begins', text:'The Umayyad court has begun its crossing campaign. You can review a personal journey toward Malaga, keep watching or withdraw from the plan.',
        choices:[
          { id:'cross', label:'Review a personal journey to Malaga', detail:'Travel alone at the current route price and risk. Your relatives stay at home. Arrival grants no command, military membership or wages.', operation:{ kind:'travel_site', travelSiteId:'soldier_malaga_711' }, next:'crossing_journey' },
          { id:'wait', label:'Wait before travelling', detail:'Keep ordinary work available while watching the campaign. Waiting spends no gold or action day.', operation:{ kind:'record_decision' }, next:'watching' },
          { id:'withdraw', label:'Withdraw from the personal plan', detail:'Finish your plan while the court’s campaign continues on its own terms.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      watching:{ name:'Keeping the decision open', text:'The campaign continues. You can reconsider the personal journey or keep your livelihood separate from it.',
        choices:[
          { id:'cross', label:'Review the journey to Malaga', detail:'Pay the ordinary journey price if travel is currently possible. The traveller goes ahead alone.', operation:{ kind:'travel_site', travelSiteId:'soldier_malaga_711' }, next:'crossing_journey' },
          { id:'withdraw', label:'Set further expedition plans aside', detail:'Conclude your plan without changing the public campaign.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      crossing_journey:{ name:'A personal crossing', text:'Your ordinary journey owns the route, cost and risks. Your household remains at its permanent home while you travel.',
        choices:[
          { id:'return', label:'Review the ordinary return home', detail:'Use the current journey’s turn-back or return rules, including any minimum stay.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Leave further plans to ordinary travel', detail:'Finish the story while leaving the journey and its commitments in force.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      arrival:{ name:'At Malaga during the campaign', text:'You have actually reached Malaga while the campaign is live. People here have homes and livelihoods of their own. Work and personal safety still depend on local conditions.',
        choices:[
          { id:'work', label:'Select ordinary garrison duty at your permanent home', detail:'This focus requires an actual permanent home here and no active journey. Earnings and access keep their ordinary rules.', when:{ all:[{ kind:'home', provinceId:'malaga' },{ not:{ kind:'travelling' } }] }, operation:{ kind:'set_focus', focusId:'stand_guard' }, next:'campaign_work' },
          { id:'destination_work', label:'Seek opportunities through ordinary travel', detail:'Keep the existing destination encounters and their own terms. This decision creates no work contract or payment.', operation:{ kind:'record_decision' }, next:'aftermath_wait' },
          { id:'watch', label:'Watch the campaign without a work commitment', detail:'Keep other ordinary livelihood choices available without claiming military service.', operation:{ kind:'record_decision' }, next:'aftermath_wait' },
          { id:'return', label:'Review returning home', detail:'The ordinary journey controls return eligibility and any minimum stay.', operation:{ kind:'return_home' }, next:'returning' }
        ], transitions:[] },
      campaign_work:{ name:'Work beside the campaign', text:'Your selected garrison focus follows the ordinary work rules. A day of actual positive income completes this livelihood decision.',
        afterWork:{ focusId:'stand_guard', provinceId:'malaga', next:'aftermath_wait' },
        choices:[{ id:'defer', label:'Set the work plan aside', detail:'Keep watching without claiming earnings or completed service.', operation:{ kind:'record_decision' }, next:'aftermath_wait' }], transitions:[] },
      aftermath_wait:{ name:'Waiting for the campaign’s result', text:'You retain your actual residence and livelihood while the public campaign continues.',
        choices:[
          { id:'return', label:'Review the current return journey', detail:'Use ordinary return rules if you have an active personal journey.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Close the personal expedition plan', detail:'Leave work, travel and the campaign to their ordinary rules.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      foothold:{ name:'A foothold across the strait', text:'The crossing campaign recorded success, and the Umayyad court currently holds Malaga. Your own location and work remain separate from that public result.',
        choices:[
          { id:'watch_inland', label:'Keep an inland opportunity in view', detail:'Wait for an actual Toledo campaign. This decision moves nobody and grants no reward.', operation:{ kind:'record_decision' }, next:'inland_wait' },
          { id:'seek_work', label:'Review travelling to the foothold', detail:'Seek ordinary opportunities at Malaga while it remains under the campaign court. Finish any existing journey before starting another.', when:{ not:{ kind:'present', provinceId:'malaga' } }, operation:{ kind:'travel_site', travelSiteId:'soldier_malaga_711' }, next:'foothold_journey' },
          { id:'return', label:'Review returning home', detail:'The current journey retains its ordinary return terms.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Resume ordinary life', detail:'Conclude without pay, land, spoils or a new duty.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      foothold_journey:{ name:'Toward the existing foothold', text:'Your journey proceeds under ordinary travel rules. Control at Malaga may change again before arrival.',
        choices:[
          { id:'return', label:'Review turning back', detail:'The ordinary journey owns the return route and costs.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Leave the journey to ordinary travel', detail:'Close the story while keeping the current journey in force.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      foothold_arrival:{ name:'A visitor at the foothold', text:'You have reached Malaga under its current ruler. Your household still lives at its permanent home; local opportunities retain their normal requirements.',
        choices:[
          { id:'inland', label:'Watch for the inland campaign', detail:'Record interest without a march, enlistment or payment.', operation:{ kind:'record_decision' }, next:'inland_wait' },
          { id:'return', label:'Review the ordinary return home', detail:'The journey’s minimum stay and return rules apply.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Leave local work to ordinary choices', detail:'Finish the story as a visitor, without a household move or service award.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      failed:{ name:'The crossing ends without its objective', text:'The campaign recorded failure. Your household and any personal journey retain their actual situation.',
        choices:[
          { id:'finish', label:'Resume ordinary life', detail:'Close the personal plan without changing the campaign or granting a reward.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'return', label:'Review the ordinary return home', detail:'If abroad on a personal journey, its current return rules still apply.', operation:{ kind:'return_home' }, next:'returning' }
        ], transitions:[] },
      diverted:{ name:'The opportunity takes another course', text:'Changed courts or possession diverted the crossing campaign. Your personal plan can end or turn toward home.',
        choices:[
          { id:'finish', label:'Resume ordinary life', detail:'Close the personal plan without changing the campaign or granting a reward.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'return', label:'Review the ordinary return home', detail:'If abroad on a personal journey, its current return rules still apply.', operation:{ kind:'return_home' }, next:'returning' }
        ], transitions:[] },
      campaign_interrupted:{ name:'The campaign is interrupted', text:'A change of ruling court interrupted the public campaign. Your own work and travel commitments remain governed by their existing terms.',
        choices:[
          { id:'finish', label:'Resume ordinary life', detail:'Close the personal plan without changing the campaign or granting a reward.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'return', label:'Review the ordinary return home', detail:'If abroad on a personal journey, its current return rules still apply.', operation:{ kind:'return_home' }, next:'returning' }
        ], transitions:[] },
      inland_wait:{ name:'Watching the inland opportunity', text:'The road to Toledo becomes a personal choice only if its campaign actually starts and the coastal foothold remains. You can close your plans now.',
        choices:[
          { id:'return', label:'Review returning home', detail:'Use the existing journey’s ordinary return rules.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Set the inland plan aside', detail:'Resume ordinary life without a new campaign or reward.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      inland_offer:{ name:'An actual campaign toward Toledo', text:'The Toledo campaign has begun from the surviving coastal foothold. You may review a separate personal journey; the courts and armies retain their own decisions.',
        choices:[
          { id:'go', label:'Review an ordinary journey toward Toledo', detail:'Pay the current route price if eligible. Complete an existing visit through ordinary return or settlement before beginning another journey. This grants no battle attendance or capture reward.', operation:{ kind:'travel_site', travelSiteId:'soldier_toledo_711' }, next:'inland_journey' },
          { id:'finish', label:'End the expedition plan here', detail:'Continue your actual livelihood and travel without an inland commitment.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      inland_journey:{ name:'On the road inland', text:'Your personal journey follows the current route and its risks while the campaign proceeds independently.',
        choices:[
          { id:'return', label:'Review returning home', detail:'Use ordinary turn-back or return rules.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Leave further plans to ordinary travel', detail:'Finish the personal story without completing or cancelling the journey.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      returning:{ name:'Returning to Tangier', text:'The personal plan waits for your actual return. Your journey retains its ordinary commitments and risks.',
        choices:[{ id:'finish', label:'Leave the return to ordinary travel', detail:'Close the story while the existing journey continues.', operation:{ kind:'record_decision' }, next:'independent' }], transitions:[] },
      stayed:{ name:'Your ordinary livelihood', text:'These personal expedition plans are closed. Your household, work and property continue under ordinary rules.', terminal:true, choices:[], transitions:[] },
      independent:{ name:'Further choices are yours', text:'The personal plan is closed. Existing journeys, local work and later household residence retain their ordinary terms.', terminal:true, choices:[], transitions:[] },
      returned:{ name:'Home at Tangier', text:'You have actually returned to Tangier. The completed personal journey grants no additional payment, land or rank.', terminal:true, choices:[], transitions:[] },
      lost_foothold:{ name:'A changed coastal situation', text:'The Umayyad court no longer holds Malaga. Your personal expedition plan ends; any existing journey continues under ordinary rules.', terminal:true, choices:[], transitions:[] },
      inland_closed:{ name:'The inland opportunity has ended', text:'The Toledo campaign has already resolved. Your plan ends with your actual livelihood and location, without an inferred march or battle.', terminal:true, choices:[], transitions:[] },
      arrived_inland:{ name:'A personal arrival inland', text:'You have reached Toledo. Its residents, ruler and work opportunities retain their actual situation. Your arrival grants no share of a conquest or automatic household move.', terminal:true, choices:[], transitions:[] },
      window_closed:{ name:'The personal opportunity has passed', text:'These expedition plans have run their course. Existing work, family ties and journeys remain in force.', terminal:true, choices:[], transitions:[] },
      personal_ended:{ name:'The protagonist’s plan has ended', text:'Death or succession has ended this person’s unfinished expedition plan. An heir receives no expedition membership or promised reward.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_crossing_711.crossing_soldier_track_711;
  function route(when, next) { return { when:when, next:next }; }
  function source(id, field, values) { return { kind:'story_state', storyId:id, stateField:field, values:values }; }
  var live = source('strait_crossing_711', 'phase', ['started']);
  var coast = { kind:'sovereign', provinceId:'malaga', realmId:'umayyad_711' };
  var late = { kind:'year', min:719, max:10000 };
  var arrived = { all:[{ kind:'present', provinceId:'malaga' },{ any:[{ kind:'arrived', provinceId:'malaga' },{ kind:'home', provinceId:'malaga' }] }] };
  var outcomes = [
    route({ all:[source('strait_crossing_711','result',['won']),coast] }, 'foothold'),
    route(source('strait_crossing_711','result',['won']), 'lost_foothold'),
    route(source('strait_crossing_711','result',['failed']), 'failed'),
    route(source('strait_crossing_711','result',['diverted']), 'diverted'),
    route(source('strait_crossing_711','result',['interrupted']), 'campaign_interrupted')
  ];
  ['opening','waiting','departure','watching','crossing_journey','arrival','campaign_work','aftermath_wait'].forEach(function (id) {
    def.stages[id].transitions = [route(late,'window_closed')].concat(outcomes);
  });
  ['waiting','departure','watching','crossing_journey'].forEach(function (id) {
    def.stages[id].transitions.push(route({ all:[live,arrived] },'arrival'));
  });
  def.stages.waiting.transitions.push(route(live,'departure'));
  ['crossing_journey','foothold_journey','inland_journey'].forEach(function (id) {
    var province = id === 'inland_journey' ? 'toledo' : 'malaga';
    def.stages[id].transitions.push(route({ all:[{ not:{ kind:'journey', provinceId:province } },{ not:{ kind:'present', provinceId:province } }] },'independent'));
  });
  ['arrival','campaign_work','aftermath_wait'].forEach(function (id) {
    def.stages[id].transitions.push(route({ not:{ kind:'present', provinceId:'malaga' } },'independent'));
  });
  ['local_work','failed','diverted','campaign_interrupted','foothold','foothold_journey','foothold_arrival','inland_wait','inland_offer','inland_journey','returning'].forEach(function (id) {
    def.stages[id].transitions.unshift(route(late,'window_closed'));
  });
  ['foothold','foothold_journey','foothold_arrival','inland_wait','inland_offer','inland_journey'].forEach(function (id) {
    def.stages[id].transitions.push(route({ not:coast },'lost_foothold'));
  });
  def.stages.foothold_journey.transitions.push(route(arrived,'foothold_arrival'));
  def.stages.foothold_arrival.transitions.push(route({ not:{ kind:'present', provinceId:'malaga' } },'independent'));
  ['inland_wait','inland_offer','inland_journey'].forEach(function (id) {
    def.stages[id].transitions.push(route(source('toledo_campaign_711','phase',['resolved']),'inland_closed'));
  });
  def.stages.inland_wait.transitions.push(route(source('toledo_campaign_711','phase',['started']),'inland_offer'));
  def.stages.inland_journey.transitions.push(route({ kind:'arrived', provinceId:'toledo' },'arrived_inland'));
  def.stages.returning.transitions.push(route({ all:[{ not:{ kind:'travelling' } },{ kind:'home', provinceId:'tangier' },{ kind:'present', provinceId:'tangier' }] },'returned'),
    route({ not:{ kind:'travelling' } },'independent'));
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_crossing_711);
})();
