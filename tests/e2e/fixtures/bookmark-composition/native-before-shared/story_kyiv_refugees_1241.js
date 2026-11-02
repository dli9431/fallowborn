/* Personal decisions, ordinary craft income and an optional visit to Lutsk. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_kyiv_refugees_1241 = {
  kyiv_refugee_track_1241:{ id:'kyiv_refugee_track_1241', type:'household_track',
    title:'A Home after Kyiv',
    intro:'The earlier journey is behind you. Find a livelihood in Volodymyr or consider going ahead alone to Lutsk.',
    homeProvinceId:'volodymyr', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'inventory',
    requirements:{ provinces:['volodymyr','lutsk'] },
    stages:{
      inventory:{ name:'A place for now', text:'Your household is already in Volodymyr, with a modest purse and craft skills to offer. Take stock and decide what to do next.',
        choices:[
          { id:'take_stock', label:'Take stock before deciding', detail:'Review work and household plans without spending anything.', operation:{ kind:'record_decision' }, next:'livelihood' },
          { id:'work_first', label:'Put a livelihood first', detail:'Consider ordinary craft work and the needs of the household.', operation:{ kind:'record_decision' }, next:'livelihood' }
        ], transitions:[] },
      livelihood:{ name:'Make a living', text:'Repairs and small orders could support a life here. Choosing craft work begins a plan; the ordinary work itself determines any earnings.',
        choices:[
          { id:'work_bench', label:'Look for craft work', detail:'Select Work the bench. Earnings follow only when ordinary work actually pays.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'working' },
          { id:'keep_looking', label:'Keep looking for customers', detail:'Continue without claiming completed work or a wage.', operation:{ kind:'record_decision' }, next:'contacts' },
          { id:'postpone_work', label:'Leave work for later', detail:'Keep the present focus and review the household’s surroundings.', operation:{ kind:'record_decision' }, next:'contacts' }
        ], transitions:[] },
      working:{ name:'At the bench', text:'You have chosen ordinary craft work. Its first actual income in Volodymyr will establish that the work has begun.',
        afterWork:{ focusId:'craft_work', provinceId:'volodymyr', next:'earned' },
        choices:[{ id:'reconsider_work', label:'Reconsider before work pays', detail:'Continue without claiming earnings.', operation:{ kind:'record_decision' }, next:'contacts' }], transitions:[] },
      earned:{ name:'The first earnings', text:'Ordinary craft work has paid in Volodymyr. The household can keep building on that beginning.',
        choices:[{ id:'review_neighbours', label:'Consider the people nearby', detail:'Continue without another payment.', operation:{ kind:'record_decision' }, next:'contacts' }], transitions:[] },
      contacts:{ name:'People nearby', text:'Neighbours, customers and people at worship have their own concerns. Ordinary meetings and religious participation remain available through their usual reviews.',
        choices:[
          { id:'household_first', label:'Concentrate on the household', detail:'Continue without seeking a contact or changing a relationship.', operation:{ kind:'record_decision' }, next:'reports' },
          { id:'meet_later', label:'Leave introductions for later', detail:'You can inspect available people and religious dealings through the ordinary controls. This decision promises no appointment, shelter or friendship.', operation:{ kind:'record_decision' }, next:'reports' }
        ], transitions:[] },
      reports:{ name:'What the reports establish', text:'Accounts of Kyiv’s fall explain why you left the region. Here in Volodymyr, you must decide from the people and circumstances around you.',
        choices:[
          { id:'remember_departure', label:'Consider the earlier departure', detail:'Acknowledge the fictional backstory without replaying a loss or a journey.', operation:{ kind:'record_decision' }, next:'roads' },
          { id:'set_reports_aside', label:'Set the reports aside', detail:'Make the next decision from your present circumstances.', operation:{ kind:'record_decision' }, next:'roads' }
        ], transitions:[] },
      roads:{ name:'Stay or consider a road', text:'You can continue in Volodymyr or inspect a personal visit to nearby Lutsk. Neither place promises safety, employment or a new household home.',
        choices:[
          { id:'stay', label:'Keep the present home', detail:'Continue the household’s local life without a journey.', operation:{ kind:'record_decision' }, next:'follow_stay' },
          { id:'inspect_road', label:'Inspect a visit to Lutsk', detail:'Review a real route and price before going ahead alone.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'postpone_road', label:'Postpone another journey', detail:'Continue here without spending money or reserving a route.', operation:{ kind:'record_decision' }, next:'follow_stay' }
        ], transitions:[] },
      follow_stay:{ name:'Follow the present choice', text:'No journey has begun through this plan. Your purse, work and permanent home keep their ordinary rules.',
        choices:[{ id:'review_home', label:'Review where to live', detail:'Continue without claiming work, travel or arrival.', operation:{ kind:'record_decision' }, next:'residence_home' }], transitions:[] },
      departure:{ name:'A personal visit to Lutsk', text:'Review the current route and price. Only you would travel. The household would keep its permanent home in Volodymyr until a later eligible settlement.',
        choices:[
          { id:'go_alone', label:'Go ahead alone to Lutsk', detail:'Pay the ordinary journey price. Arrival is a personal stay, with no promised lodging, wages or protection.', operation:{ kind:'travel_site', travelSiteId:'volodymyr_lutsk_1241' }, next:'travelling' },
          { id:'cancel_plan', label:'Keep the present home instead', detail:'Leave without starting or paying for a journey.', operation:{ kind:'record_decision' }, next:'follow_stay' },
          { id:'work_instead', label:'Review work instead', detail:'Return to the craft-work choices without a travel charge.', operation:{ kind:'record_decision' }, next:'livelihood' }
        ], transitions:[] },
      travelling:{ name:'On the road to Lutsk', text:'Your personal journey follows the ordinary travel controls. The rest of the household remains at home.',
        choices:[{ id:'leave_journey_open', label:'Leave this journey outside the household plan', detail:'Close the opening story with the journey unresolved. Ordinary travel continues; this choice neither cancels it nor claims arrival.', operation:{ kind:'record_decision' }, next:'unresolved' }], transitions:[] },
      residence_home:{ name:'The home you have', text:'Volodymyr remains the household’s permanent home. Any later journey or settlement needs its own ordinary review.',
        choices:[{ id:'continue_here', label:'Continue life here', detail:'Close the opening without a grant, payment or promise of safety.', operation:{ kind:'record_decision' }, next:'future' }], transitions:[] },
      arrival:{ name:'A visitor in Lutsk', text:'You have actually reached Lutsk. Your household’s permanent home is still Volodymyr. Local work and residence may allow a later household move.',
        choices:[
          { id:'settle', label:'Review permanent household settlement', detail:'Meet the ordinary free-status, property, residence, local-work and once-per-life requirements. Arrival alone does not move the household.', operation:{ kind:'settle_household' }, next:'resettled' },
          { id:'visit_only', label:'Keep this a personal stay', detail:'Keep the current home and ordinary journey controls. This decision claims no job or household move.', operation:{ kind:'record_decision' }, next:'temporary' },
          { id:'return_home', label:'Review returning to Volodymyr', detail:'Use the ordinary return journey and its minimum-stay requirements.', operation:{ kind:'return_home' }, next:'returning' }
        ], transitions:[] },
      returning:{ name:'The road to the household', text:'The protagonist is on the ordinary return journey. Arrival is still governed by travel.',
        choices:[{ id:'leave_return_open', label:'Leave the return outside this plan', detail:'Close this story without stopping the journey or claiming arrival.', operation:{ kind:'record_decision' }, next:'unresolved' }], transitions:[] },
      future:{ name:'An ordinary future', text:'You chose to keep the present home. Work, household decisions and the wider world continue through ordinary play.', terminal:true, choices:[], transitions:[] },
      temporary:{ name:'A personal stay', text:'Only the protagonist visited Lutsk. The household kept its home, and ordinary travel, work and settlement reviews remain available.', terminal:true, choices:[], transitions:[] },
      resettled:{ name:'A new permanent home', text:'The ordinary settlement transaction moved the household after its requirements were met. The household received no free land or protection.', terminal:true, choices:[], transitions:[] },
      returned:{ name:'Back at the present home', text:'The personal journey ended in Volodymyr. The household kept its permanent home during the visit.', terminal:true, choices:[], transitions:[] },
      unresolved:{ name:'A journey remains open', text:'This personal opening ended without resolving the journey. Ordinary travel controls govern what happens next.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'A different course', text:'You left this local plan through other decisions. Completed work remains recorded, and ordinary life continues at the real current location.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The personal opening ended', text:'Death or succession ended this protagonist’s unfinished opening. The next generation makes its own decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};

FBDATA.openingProfiles_kyiv_refugees_1241 = {
  opening_kyiv_refugees_1241:{ id:'opening_kyiv_refugees_1241', type:'opening_profile',
    title:'The Household’s First Goals', intro:'Optional aims for the present life, fulfilled through ordinary work and home decisions.',
    scenarioIds:['kyiv_refugee_household_1241'], provinceIds:['volodymyr'], requires:['kyiv_refugee_track_1241'],
    goals:[
      { id:'craft_income', name:'Earn five gold through craft work', text:'Earn five gold from actual ordinary craft work after the opening.', criterion:{ kind:'earnings', amount:5, focusIds:['craft_work'] } },
      { id:'household_reserve', name:'Keep a household reserve', text:'Hold twenty-five gold in the private purse as a free household.', criterion:{ kind:'reserve', amount:25 } },
      { id:'home_decision', name:'Choose a household home', text:'Choose to keep the present home or complete an eligible permanent household settlement.', criterion:{ kind:'household_phase', storyId:'kyiv_refugee_track_1241', phases:['future','resettled','returned'] } }
    ], contacts:[] }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_kyiv_refugees_1241.kyiv_refugee_track_1241;
  var local = { all:[{ kind:'home', provinceId:'volodymyr' }, { kind:'present', provinceId:'volodymyr' }, { not:{ kind:'travelling' } }] };
  function route(when, next) { return { when:when, next:next }; }
  ['inventory','livelihood','working','earned','contacts','reports','roads','follow_stay','departure','residence_home'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'remote')];
  });
  def.stages.travelling.transitions = [
    route({ kind:'home', provinceId:'lutsk' }, 'resettled'),
    route({ kind:'arrived', provinceId:'lutsk' }, 'arrival'),
    route({ all:[{ kind:'home', provinceId:'volodymyr' }, { kind:'present', provinceId:'volodymyr' }, { not:{ kind:'travelling' } }] }, 'residence_home'),
    route({ not:{ kind:'journey', provinceId:'lutsk' } }, 'remote')
  ];
  def.stages.arrival.transitions = [
    route({ kind:'home', provinceId:'lutsk' }, 'resettled'),
    route({ not:{ kind:'arrived', provinceId:'lutsk' } }, 'remote')
  ];
  def.stages.returning.transitions = [
    route({ all:[local, { not:{ kind:'journey', provinceId:'lutsk' } }] }, 'returned'),
    route({ not:{ kind:'journey', provinceId:'lutsk' } }, 'remote')
  ];
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_kyiv_refugees_1241, FBDATA.openingProfiles_kyiv_refugees_1241);
})();
