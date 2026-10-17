/* Personal choices follow ordinary work, current war status and travel. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_1241 = {
  hungarian_village_track_1241:{ id:'hungarian_village_track_1241', type:'household_track',
    title:'Fields and Uncertain Roads',
    intro:'A household makes its own living while the courts pursue their affairs. Consider the farm, current obligations and a possible visit to another county.',
    homeProvinceId:'szekesfehervar', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['szekesfehervar','bratislava'] },
    stages:{
      household:{ name:'A farm in the royal heartland', text:'Your household tends a small plot in Székesfehérvár county. Take stock of the purse and consider what work to do next.',
        choices:[
          { id:'take_stock', label:'Consider the household’s needs', detail:'Review supplies without spending money.', operation:{ kind:'record_decision' }, next:'stores' },
          { id:'seek_work', label:'Turn to the fields', detail:'Consider ordinary work on your own land.', operation:{ kind:'record_decision' }, next:'work' }
        ], transitions:[] },
      stores:{ name:'Keeping the household supplied', text:'A modest bundle of household supplies costs three gold. Keeping the money is also a choice.',
        choices:[
          { id:'buy_supplies', label:'Buy household supplies', detail:'Spend {money:3} from the private purse on household supplies.', operation:{ kind:'household_expense', amount:3 }, next:'work' },
          { id:'keep_money', label:'Keep the money', detail:'Make no purchase and consider ordinary work.', operation:{ kind:'record_decision' }, next:'work' }
        ], transitions:[] },
      work:{ name:'Work that is yours to do', text:'Your plot offers ordinary farm work. Any paid order from someone else would need its own offer and terms; this decision accepts none.',
        choices:[
          { id:'work_fields', label:'Work your land', detail:'Select ordinary farm work. Income follows only when work actually pays.', operation:{ kind:'set_focus', focusId:'work_land' }, next:'working' },
          { id:'defer_work', label:'Leave work for later', detail:'Keep the current focus and consider the household’s outlook.', operation:{ kind:'record_decision' }, next:'outlook' }
        ], transitions:[] },
      working:{ name:'A living from the fields', text:'You have chosen to work your land. The household waits for actual earnings at home.',
        afterWork:{ focusId:'work_land', provinceId:'szekesfehervar', next:'earned' },
        choices:[{ id:'reconsider_work', label:'Reconsider your plans', detail:'Review the outlook without claiming earnings.', operation:{ kind:'record_decision' }, next:'outlook' }], transitions:[] },
      earned:{ name:'The work has paid', text:'Ordinary farm work has brought money into the household purse. Consider whether to keep building a livelihood here or review a personal journey.',
        choices:[
          { id:'review_outlook', label:'Consider the next step', detail:'Review current affairs without another payment.', operation:{ kind:'record_decision' }, next:'outlook' },
          { id:'keep_working', label:'Keep working at home', detail:'Conclude this opening plan and continue ordinary farming.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      outlook:{ name:'News and neighbours', text:'News of distant fighting does not tell you what has happened on your own doorstep. Other households have their own lives and obligations. You can keep to the farm or consider a visit to Bratislava.',
        choices:[
          { id:'stay', label:'Keep the household here', detail:'Continue local life with your current property and resources.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'inspect_road', label:'Consider the road to Bratislava', detail:'Review a personal visit while your relatives remain at home.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'return_to_work', label:'Return to the fields', detail:'Review ordinary farm work again.', operation:{ kind:'record_decision' }, next:'work' }
        ], transitions:[] },
      war_review:{ name:'The crown is at war', text:'The court governing your home county is at war. That fact alone says nothing about a local attack or the safety of a road. Review your own plans with the information available.',
        choices:[
          { id:'stay_during_war', label:'Continue life at home', detail:'Keep the household here without a promise of protection.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'review_journey', label:'Review a personal journey', detail:'Consider the current route and its ordinary risks.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'wait_for_news', label:'Reconsider after the fighting ends', detail:'Leave the plan open while ordinary life continues.', operation:{ kind:'record_decision' }, next:'waiting' }
        ], transitions:[] },
      waiting:{ name:'Life during the war', text:'Your household continues ordinary life. There is no confirmed local incident in this personal record.',
        choices:[{ id:'stop_waiting', label:'Keep to the farm', detail:'Conclude the opening plan without claiming the war has ended.', operation:{ kind:'record_decision' }, next:'stayed' }], transitions:[] },
      obligations:{ name:'Reviewing present obligations', text:'The court governing your home county is no longer at war. Your household’s actual property and obligations still apply. This change promises neither a safe road nor compensation.',
        choices:[
          { id:'resume_livelihood', label:'Continue farming here', detail:'Conclude the opening plan with your present resources.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'inspect_after_war', label:'Consider the current road', detail:'Review an ordinary personal journey.', operation:{ kind:'record_decision' }, next:'departure' }
        ], transitions:[] },
      departure:{ name:'Going ahead alone', text:'You could visit Bratislava to look for local opportunities. Review the current price and route. Your relatives and property remain at home during this personal journey.',
        choices:[
          { id:'go_alone', label:'Go ahead alone to Bratislava', detail:'Pay the reviewed personal journey price. Arrival grants no land, employment or protection.', operation:{ kind:'travel_site', travelSiteId:'hungarian_bratislava_1241' }, next:'travelling' },
          { id:'postpone', label:'Postpone the journey', detail:'Keep the money and return to your household’s plans.', operation:{ kind:'record_decision' }, next:'outlook' },
          { id:'stay_instead', label:'Remain at home', detail:'Conclude the travel plan without departing.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      travelling:{ name:'On the road', text:'Only the protagonist is travelling. Ordinary journey controls govern progress, interruption and return; the household remains at home.', choices:[], transitions:[] },
      arrival:{ name:'A visitor in Bratislava', text:'You have arrived as a visitor. Your household remains at home. Local work and residence may later permit an ordinary permanent move, without a new farm or relief payment.',
        choices:[
          { id:'settle', label:'Review household settlement', detail:'Use the ordinary status, residence, local-work and once-per-life requirements. Existing property keeps its ordinary rules.', operation:{ kind:'settle_household' }, next:'resettled' },
          { id:'visit_only', label:'Keep this a personal visit', detail:'Conclude this plan with the household at home. Ordinary journey controls remain available.', operation:{ kind:'record_decision' }, next:'temporary' },
          { id:'return_home', label:'Return to the farm', detail:'Begin the ordinary return journey when its requirements permit.', operation:{ kind:'return_home' }, next:'returning' }
        ], transitions:[] },
      returning:{ name:'Returning home', text:'The protagonist is on the ordinary return journey. The household has kept its home.', choices:[], transitions:[] },
      stayed:{ name:'Life at the farm continues', text:'The household remains here. Its work and future fortunes continue through ordinary play.', terminal:true, choices:[], transitions:[] },
      resettled:{ name:'A different household home', text:'The ordinary settlement transaction moved the household after its requirements were met. It granted no new farm, title or protection.', terminal:true, choices:[], transitions:[] },
      temporary:{ name:'A personal stay', text:'The protagonist is a visitor. Relatives remain at their permanent home, and ordinary journey controls remain available.', terminal:true, choices:[], transitions:[] },
      returned:{ name:'Back at the farm', text:'The personal journey ended at home. The household kept its permanent residence throughout the visit.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'A different course', text:'The protagonist left this local plan. Completed work and purchases stay recorded; life continues through ordinary play.', terminal:true, choices:[], transitions:[] },
      interrupted_journey:{ name:'The journey ended early', text:'The ordinary journey ended before this plan reached its destination. This record claims no arrival or household move.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The personal plan ended', text:'Death or succession ended this protagonist’s unfinished plan. The next generation makes its own decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};

FBDATA.openingProfiles_1241 = {
  opening_hungarian_village_1241:{ id:'opening_hungarian_village_1241', type:'opening_profile',
    title:'The Farming Household’s First Goals', intro:'Optional personal goals completed through ordinary earnings, savings and decisions.',
    scenarioIds:['hungarian_village_household_1241'], provinceIds:['szekesfehervar'], requires:['hungarian_village_track_1241'],
    goals:[
      { id:'farm_income', name:'Earn five gold from farming', text:'Earn five gold through actual ordinary work on your land after the opening.', criterion:{ kind:'earnings', amount:5, focusIds:['work_land'] } },
      { id:'household_reserve', name:'Keep a household reserve', text:'Hold thirty gold in the private purse as a free household.', criterion:{ kind:'reserve', amount:30 } },
      { id:'home_decision', name:'Choose a household home', text:'Choose to remain here or complete an eligible permanent household settlement.', criterion:{ kind:'household_phase', storyId:'hungarian_village_track_1241', phases:['stayed','resettled'] } }
    ], contacts:[] }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_1241.hungarian_village_track_1241;
  var local = { all:[{ kind:'home', provinceId:'szekesfehervar' }, { kind:'present', provinceId:'szekesfehervar' }] };
  var war = { kind:'at_war', provinceId:'szekesfehervar' };
  function route(when, next) { return { when:when, next:next }; }
  ['household','stores','work','working','earned','outlook','war_review','waiting','obligations','departure'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'remote')];
  });
  def.stages.outlook.transitions.push(route(war, 'war_review'));
  def.stages.war_review.transitions.push(route({ not:war }, 'obligations'));
  def.stages.waiting.transitions.push(route({ not:war }, 'obligations'));
  def.stages.travelling.transitions = [
    route({ kind:'home', provinceId:'bratislava' }, 'resettled'),
    route({ kind:'arrived', provinceId:'bratislava' }, 'arrival'),
    route({ not:{ kind:'journey', provinceId:'bratislava' } }, 'interrupted_journey')
  ];
  def.stages.arrival.transitions = [
    route({ kind:'home', provinceId:'bratislava' }, 'resettled'),
    route({ not:{ kind:'arrived', provinceId:'bratislava' } }, 'interrupted_journey')
  ];
  def.stages.returning.transitions = [
    route({ all:[local, { not:{ kind:'journey', provinceId:'bratislava' } }] }, 'returned'),
    route({ not:{ kind:'journey', provinceId:'bratislava' } }, 'interrupted_journey')
  ];
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_1241, FBDATA.openingProfiles_1241);
})();
