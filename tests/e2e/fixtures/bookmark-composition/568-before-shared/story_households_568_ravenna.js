/* Household decisions use ordinary craft work, private costs and travel. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_568_ravenna = {
  ravenna_household_track_568:{ id:'ravenna_household_track_568', type:'household_track',
    title:'A Living in Ravenna',
    intro:'Customers, household stores and the road to Bononia offer choices while the courts pursue their own affairs.',
    homeProvinceId:'ravenna', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['ravenna','bologna'] },
    stages:{
      household:{ name:'Around the household table', text:'Ravenna is an imperial city, but your household lives from its own work. You can look for customers, replace a few household supplies or consider a visit to Bononia.',
        choices:[
          { id:'take_stock', label:'Take stock of the household', detail:'Review a modest purchase or keep the money for later.', operation:{ kind:'record_decision' }, next:'supplies' },
          { id:'seek_customers', label:'Look for craft work', detail:'Consider ordinary work at the bench.', operation:{ kind:'record_decision' }, next:'customers' }
        ], transitions:[] },
      supplies:{ name:'Making the purse last', text:'A small bundle of replacement materials would cost three gold. You can leave the purchase until another day.',
        choices:[
          { id:'buy_supplies', label:'Buy replacement supplies', detail:'Spend {money:3} from the private purse on household materials.', operation:{ kind:'household_expense', amount:3 }, next:'customers' },
          { id:'keep_money', label:'Keep the money for now', detail:'Continue without buying anything.', operation:{ kind:'record_decision' }, next:'customers' }
        ], transitions:[] },
      customers:{ name:'Finding the next customer', text:'Repairs and small orders could keep the household going. Ordinary craft work determines what you earn.',
        choices:[
          { id:'work_bench', label:'Work the bench', detail:'Select ordinary craft work. Earnings follow when work actually pays.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'working' },
          { id:'defer_work', label:'Leave work for later', detail:'Keep the present focus and consider the household’s plans.', operation:{ kind:'record_decision' }, next:'outlook' }
        ], transitions:[] },
      working:{ name:'Hands at the bench', text:'You have chosen craft work. The household waits for its first actual earnings in Ravenna.',
        afterWork:{ focusId:'craft_work', provinceId:'ravenna', next:'earned' },
        choices:[{ id:'reconsider_work', label:'Reconsider before the work pays', detail:'Return to the household’s plans without claiming earnings.', operation:{ kind:'record_decision' }, next:'outlook' }], transitions:[] },
      earned:{ name:'A little money earned', text:'Ordinary craft work has paid in Ravenna. You can continue building a livelihood here or consider a journey.',
        choices:[
          { id:'review_outlook', label:'Consider the next step', detail:'Review staying and travelling without another payment.', operation:{ kind:'record_decision' }, next:'outlook' },
          { id:'keep_working', label:'Keep working in Ravenna', detail:'Close the opening plan and continue the household’s ordinary livelihood.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      outlook:{ name:'The household’s horizon', text:'The northern cities have their own fortunes. You have no confirmed campaign report to act on here. Today’s choice is whether to remain in Ravenna or inspect a personal journey to Bononia.',
        choices:[
          { id:'stay', label:'Keep the household in Ravenna', detail:'Continue local life with your present resources and ordinary work choices.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'inspect_road', label:'Inspect the road to Bononia', detail:'Review a personal journey while the rest of the household stays home.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'review_customers', label:'Look for customers again', detail:'Return to the ordinary craft-work choices.', operation:{ kind:'record_decision' }, next:'customers' }
        ], transitions:[] },
      departure:{ name:'A visit to Bononia', text:'You could go ahead to Bononia and look for local opportunities. Review the current route and price before leaving. Your relatives remain at home.',
        choices:[
          { id:'go_alone', label:'Go ahead alone to Bononia', detail:'Pay the reviewed journey price for the protagonist. Arrival is a temporary stay; any later household settlement needs its own review.', operation:{ kind:'travel_site', travelSiteId:'ravenna_bononia_568' }, next:'travelling' },
          { id:'postpone', label:'Postpone the visit', detail:'Keep the money and return to the household’s plans.', operation:{ kind:'record_decision' }, next:'outlook' },
          { id:'stay_instead', label:'Remain in Ravenna', detail:'Close the travel plan without leaving home.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      travelling:{ name:'On the road to Bononia', text:'The protagonist is on a personal journey. Ordinary journey controls govern progress, interruption and return; the household remains at home.', choices:[], transitions:[] },
      arrival:{ name:'A visitor in Bononia', text:'You have arrived in Bononia. You can remain a visitor, return home, or later review a permanent household move after meeting the ordinary residence and work requirements.',
        choices:[
          { id:'settle', label:'Review permanent household settlement', detail:'Apply the ordinary free-status, property, residence, local-work and once-per-life requirements.', operation:{ kind:'settle_household' }, next:'resettled' },
          { id:'visit_only', label:'Keep this a personal visit', detail:'Keep the ordinary journey work and return controls, with the family still at home.', operation:{ kind:'record_decision' }, next:'temporary' },
          { id:'return_home', label:'Return to Ravenna', detail:'Begin the ordinary return journey. The household has kept its permanent home.', operation:{ kind:'return_home' }, next:'returning' }
        ], transitions:[] },
      returning:{ name:'The road home', text:'The protagonist is returning to the household in Ravenna. Ordinary journey controls determine arrival.', choices:[], transitions:[] },
      stayed:{ name:'Life in Ravenna continues', text:'You chose to keep the household here. Its work, worship and future fortunes continue through ordinary play.', terminal:true, choices:[], transitions:[] },
      resettled:{ name:'A new household home', text:'The ordinary settlement transaction moved the household after its requirements were met. Your later livelihood remains yours to build.', terminal:true, choices:[], transitions:[] },
      temporary:{ name:'A personal stay', text:'Only the protagonist visited Bononia. The family remains at its permanent home, and the ordinary journey controls remain available.', terminal:true, choices:[], transitions:[] },
      returned:{ name:'Home in Ravenna', text:'The personal journey ended at home. The household kept its permanent residence throughout the visit.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'A different course', text:'The protagonist left this local plan. Completed purchases and earnings remain recorded; life continues wherever the household now makes its home.', terminal:true, choices:[], transitions:[] },
      interrupted_journey:{ name:'The visit ended early', text:'The ordinary journey ended before this plan reached its destination. No arrival or household move is recorded.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The personal plan ended', text:'Death or succession ended this protagonist’s unfinished plan. The household’s next generation makes its own decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};

FBDATA.openingProfiles_568_ravenna = {
  opening_ravenna_568:{ id:'opening_ravenna_568', type:'opening_profile',
    title:'The Household’s First Goals', intro:'Optional goals for this life, completed through ordinary work and decisions.',
    scenarioIds:['ravenna_household_568'], provinceIds:['ravenna'], requires:['ravenna_household_track_568'],
    goals:[
      { id:'craft_income', name:'Earn five gold at the bench', text:'Earn five gold through actual ordinary craft work after the opening.', criterion:{ kind:'earnings', amount:5, focusIds:['craft_work'] } },
      { id:'household_reserve', name:'Keep a household reserve', text:'Hold twenty-five gold in the private purse as a free household.', criterion:{ kind:'reserve', amount:25 } },
      { id:'home_decision', name:'Choose a household home', text:'Choose to remain in Ravenna or complete an eligible permanent household settlement.', criterion:{ kind:'household_phase', storyId:'ravenna_household_track_568', phases:['stayed','resettled'] } }
    ], contacts:[] }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_568_ravenna.ravenna_household_track_568;
  var local = { all:[{ kind:'home', provinceId:'ravenna' }, { kind:'present', provinceId:'ravenna' }] };
  function route(when, next) { return { when:when, next:next }; }
  ['household','supplies','customers','working','earned','outlook','departure'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'remote')];
  });
  def.stages.travelling.transitions = [
    route({ kind:'home', provinceId:'bologna' }, 'resettled'),
    route({ kind:'arrived', provinceId:'bologna' }, 'arrival'),
    route({ not:{ kind:'journey', provinceId:'bologna' } }, 'interrupted_journey')
  ];
  def.stages.arrival.transitions = [
    route({ kind:'home', provinceId:'bologna' }, 'resettled'),
    route({ not:{ kind:'arrived', provinceId:'bologna' } }, 'interrupted_journey')
  ];
  def.stages.returning.transitions = [
    route({ all:[local, { not:{ kind:'journey', provinceId:'bologna' } }] }, 'returned'),
    route({ not:{ kind:'journey', provinceId:'bologna' } }, 'interrupted_journey')
  ];
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_568_ravenna, FBDATA.openingProfiles_568_ravenna);
})();
