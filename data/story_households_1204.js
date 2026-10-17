/* An artisan household chooses its future under the city's actual rulers. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_1204 = {
  constantinople_household_track_1204:{ id:'constantinople_household_track_1204', type:'household_track',
    title:'A Household in Constantinople',
    intro:'The sack is past. Your family must find work, keep its worship and decide whether to remain. Customers, courts and the road offer uncertain possibilities.',
    homeProvinceId:'constantinople', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'inventory',
    requires:['latin_bithynia_1204','nicaean_return_1204'],
    requirements:{ provinces:['constantinople','nicaea'], realms:['latin_1204','nicaea_1204'] },
    stages:{
      inventory:{ name:'What remains', text:'The fires and plunder are past, but the loss of customers is still felt at home. Your family takes stock of its workroom and the roads out of the city.',
        choices:[
          { id:'recover', label:'Try to recover local work', detail:'Review basic supplies and the household’s ordinary livelihood.', operation:{ kind:'record_decision' }, next:'workroom' },
          { id:'customers', label:'Look for new customers', detail:'Consider work without promising a wage, appointment or change of faith.', operation:{ kind:'record_decision' }, next:'workroom' },
          { id:'consider_leaving', label:'Consider leaving the city', detail:'Review the road after taking stock. This records an intention without moving anyone.', operation:{ kind:'record_decision' }, next:'workroom' }
        ], transitions:[] },
      workroom:{ name:'Replacing the basics', text:'Basic materials could help the family begin again. They do not buy a workshop holding or guarantee that customers will return.',
        choices:[
          { id:'buy_supplies', label:'Buy basic household supplies', detail:'Pay {money:3} once from the private purse for replacement materials and shelter supplies. No property or production bonus is granted.', operation:{ kind:'household_expense', amount:3 }, next:'church' },
          { id:'earn_first', label:'Seek ordinary work first', detail:'Keep the purse intact and consider available customers. Actual craft income comes from ordinary daily work.', operation:{ kind:'record_decision' }, next:'church' },
          { id:'postpone', label:'Postpone the purchase', detail:'Spend nothing and leave the household’s work options open.', operation:{ kind:'record_decision' }, next:'church' }
        ], transitions:[] },
      church:{ name:'Worship under new authority', text:'Greek worship continues amid Latin claims to church authority. Taking a customer’s work changes neither your faith nor your relatives’ faith. Religious dealings list the congregations available locally and their participation requirements.',
        choices:[
          { id:'greek_worship', label:'Keep Greek worship and review local participation', detail:'Use religious dealings for any available Greek congregation. If no group is available, keep worship unchanged. Participation requires its own review.', operation:{ kind:'record_decision' }, next:'patron' },
          { id:'latin_information', label:'Consider the Latin community’s position', detail:'Record an information choice. It appoints no patriarch, joins no congregation and changes no household identity.', operation:{ kind:'record_decision' }, next:'patron' },
          { id:'unchanged', label:'Leave religious participation unchanged', detail:'Continue without a religious transaction or extra charge.', operation:{ kind:'record_decision' }, next:'patron' }
        ], transitions:[] },
      patron:{ name:'Finding customers', text:'Local residents, Latin customers and Venetian agents may need repairs. You can seek customers while continuing your craft. Earnings come from your daily work, and a customer’s custom brings no court appointment or citizenship.',
        choices:[
          { id:'local_work', label:'Seek work among local residents', detail:'Select ordinary Work the bench. Choosing work pays nothing; this story waits for actual craft income in the city.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'local_work' },
          { id:'latin_work', label:'Offer repairs to Latin customers', detail:'Select the same ordinary craft work under the current Latin court. Your family’s faith stays unchanged.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'customer_work' },
          { id:'venetian_work', label:'Seek customers in the Venetian quarter', detail:'The quarter must still have its effective right. This selects ordinary craft work, without an office, citizenship or special wage.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'quarter_work' },
          { id:'decline_work', label:'Defer work and review the road', detail:'No work has been completed and no wage is claimed.', operation:{ kind:'record_decision' }, next:'roads_unprepared' }
        ], transitions:[] },
      local_work:{ name:'Working for local residents', text:'Work the bench must actually earn income here before the household calls this a recovery. Savings, gifts and merely selecting the focus do not count.',
        afterWork:{ focusId:'craft_work', provinceId:'constantinople', next:'roads' },
        choices:[{ id:'defer_work', label:'Reconsider before working', detail:'Keep the plan open without claiming earnings.', operation:{ kind:'record_decision' }, next:'roads_unprepared' }], transitions:[] },
      customer_work:{ name:'Ordinary work for new customers', text:'The household has chosen a Latin customer context. Any earnings still come only from the ordinary craft focus; there is no separate salaried court post.',
        afterWork:{ focusId:'craft_work', provinceId:'constantinople', next:'roads' },
        choices:[{ id:'defer_work', label:'Reconsider before working', detail:'No wage or service completion is claimed.', operation:{ kind:'record_decision' }, next:'roads_unprepared' }], transitions:[] },
      quarter_work:{ name:'Work beside the quarter', text:'A Venetian customer is a possibility while the quarter right remains effective. No permanent bureaucracy, citizenship or protected workshop is promised.',
        afterWork:{ focusId:'craft_work', provinceId:'constantinople', next:'roads' },
        choices:[{ id:'defer_work', label:'Reconsider before working', detail:'Keep the household free of an invented contract.', operation:{ kind:'record_decision' }, next:'roads_unprepared' }], transitions:[] },
      roads:{ name:'Stay, work or leave', text:'Ordinary craft work has actually paid in Constantinople. You can build on that foothold, keep working for now or consider a personal journey toward Nicaea. Campaigns and later changes of rule remain independent.',
        choices:[
          { id:'stay', label:'Commit to rebuilding here', detail:'Record a local recovery after actual paid work. It promises no safety, title or restored workshop holding.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'serve', label:'Continue ordinary paid work for now', detail:'Record that ordinary work has begun. No second wage, court appointment or conversion is applied.', operation:{ kind:'record_decision' }, next:'served' },
          { id:'leave', label:'Inspect the journey to Nicaea', detail:'Review an ordinary personal journey. The family remains home until a later eligible permanent settlement.', operation:{ kind:'record_decision' }, next:'departure' }
        ], transitions:[] },
      roads_unprepared:{ name:'Plans remain uncertain', text:'The household has not completed the proposed craft work. You can return to its customers, inspect departure or set this plan aside.',
        choices:[
          { id:'seek_work', label:'Review local customers again', detail:'Obtain current work eligibility without a promised wage.', operation:{ kind:'record_decision' }, next:'patron' },
          { id:'leave', label:'Inspect the journey to Nicaea', detail:'Review real routes, price and eligibility before going ahead alone.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'close', label:'Set the plan aside', detail:'Close without claiming work, recovery or a family move.', operation:{ kind:'record_decision' }, next:'planned' }
        ], transitions:[] },
      departure:{ name:'Review the road to Nicaea', text:'Theodore Laskaris’s court is a possible destination only while it actually holds Nicaea. This journey promises no recruitment, protection or ready home. If funds or a route are missing, work and deferral remain available.',
        choices:[
          { id:'go_ahead', label:'Go ahead alone to Nicaea', detail:'Pay the ordinary journey price. Only the protagonist travels; relatives remain home. Arrival and permanent settlement are separate.', operation:{ kind:'travel_site', travelSiteId:'constantinople_nicaea_1204' }, next:'crossing' },
          { id:'work_instead', label:'Review work instead', detail:'Return to current local customers without paying for travel.', operation:{ kind:'record_decision' }, next:'patron' },
          { id:'defer', label:'Defer departure', detail:'Keep the plan open and spend nothing.', operation:{ kind:'record_decision' }, next:'departure_wait' }
        ], transitions:[] },
      departure_wait:{ name:'Departure deferred', text:'The household has not left. Routes, courts and household funds must be reviewed again before departure.',
        choices:[
          { id:'review_road', label:'Review the road again', detail:'Get current travel terms.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'close', label:'Set the plan aside', detail:'Record no journey or relocation.', operation:{ kind:'record_decision' }, next:'planned' }
        ], transitions:[] },
      crossing:{ name:'On the road to Nicaea', text:'The protagonist is travelling ahead. Ordinary journey controls govern progress, interruption and return. The family’s permanent home has not moved.', choices:[], transitions:[] },
      arrival:{ name:'A temporary foothold at Nicaea', text:'You have actually arrived where the Nicaean court still holds the city. Local work and residence may permit a later household move. Arrival grants no appointment, house or automatic military service.',
        choices:[
          { id:'settle', label:'Review permanent household settlement', detail:'Meet the ordinary free-status, unlanded-household, residence, local-work and once-per-life requirements. Arrival alone is insufficient.', operation:{ kind:'settle_household' }, next:'resettled' },
          { id:'temporary', label:'Seek ordinary local work during the stay', detail:'Keep the ordinary journey work and return controls. This closes as a temporary personal stay, without claiming a job or household relocation.', operation:{ kind:'record_decision' }, next:'temporary' }
        ], transitions:[] },
      changed_world:{ name:'The local situation has changed', text:'A court or quarter arrangement no longer supports the earlier customer context. Completed supplies and wages remain facts. Ordinary local work and a free decision to set the plan aside remain available.',
        choices:[
          { id:'ordinary_work', label:'Review ordinary craft work here', detail:'Select currently eligible craft work without a Latin or Venetian promise.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'changed_work' },
          { id:'defer', label:'Defer the decision', detail:'Keep the plan open without a new charge.', operation:{ kind:'record_decision' }, next:'changed_wait' },
          { id:'close', label:'Close this opportunity', detail:'Keep completed purchases and wages, and continue life under the present court.', operation:{ kind:'record_decision' }, next:'planned' }
        ], transitions:[] },
      changed_wait:{ name:'A changed opportunity deferred', text:'Review ordinary local work when ready. No obsolete patron promise is retained.',
        choices:[{ id:'review', label:'Review the present situation', detail:'Use current eligibility.', operation:{ kind:'record_decision' }, next:'changed_world' }], transitions:[] },
      changed_work:{ name:'Working under the present court', text:'The ordinary craft focus must pay here before this story acknowledges work under the changed arrangements.',
        afterWork:{ focusId:'craft_work', provinceId:'constantinople', next:'ordinary_roads' },
        choices:[{ id:'close', label:'Set this work plan aside', detail:'Claim no earnings.', operation:{ kind:'record_decision' }, next:'planned' }], transitions:[] },
      ordinary_roads:{ name:'A livelihood under the present court', text:'Ordinary craft work has actually paid under current arrangements. The earlier customer context supplied no special rights.',
        choices:[
          { id:'stay', label:'Continue rebuilding here', detail:'Record the local foothold without a reward or protection.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'serve', label:'Keep ordinary paid work', detail:'Record actual work without a second payment.', operation:{ kind:'record_decision' }, next:'served' }
        ], transitions:[] },
      stayed:{ name:'Rebuilding in Constantinople', text:'Actual ordinary work began before you chose to remain. The household’s later fortunes follow ordinary play.', terminal:true, choices:[], transitions:[] },
      served:{ name:'A livelihood has begun', text:'Ordinary craft work actually paid. The story granted no additional wages, public office, citizenship or change of faith.', terminal:true, choices:[], transitions:[] },
      resettled:{ name:'A new permanent household home', text:'The ordinary settlement transaction moved the household after its actual requirements were met. No title or guarantee of safety was granted.', terminal:true, choices:[], transitions:[] },
      temporary:{ name:'A personal stay at Nicaea', text:'Only the protagonist arrived. Ordinary travel work, return and later settlement rules remain available. The household has not yet moved.', terminal:true, choices:[], transitions:[] },
      planned:{ name:'The plan was set aside', text:'Completed decisions, purchases and earnings remain recorded. No further work, journey or recovery is claimed.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'The decision became remote', text:'The protagonist left the local opportunity outside this plan. No local purchase, customer promise or household relocation is inferred.', terminal:true, choices:[], transitions:[] },
      destination_changed:{ name:'The destination has changed', text:'The expected court no longer holds Nicaea. The real journey continues under ordinary rules, without a promised reception or family move.', terminal:true, choices:[], transitions:[] },
      interrupted_journey:{ name:'The journey ended', text:'The ordinary journey ended or was interrupted before this household plan completed. No arrival or permanent move is inferred.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The protagonist’s plan ended', text:'Death or succession ended this unfinished personal plan. The household’s next generation must make its own way.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_1204.constantinople_household_track_1204;
  var local = { all:[{ kind:'home', provinceId:'constantinople' }, { kind:'present', provinceId:'constantinople' }] };
  var latin = { kind:'sovereign', provinceId:'constantinople', realmId:'latin_1204' };
  var nicaean = { kind:'sovereign', provinceId:'nicaea', realmId:'nicaea_1204' };
  var quarter = { kind:'civic_right', realmId:'venice_1204', provinceId:'constantinople', evidenceId:'venetian_quarter_1204' };
  function route(when, next) { return { when:when, next:next }; }
  ['inventory','workroom','church','patron','local_work','customer_work','quarter_work','roads','roads_unprepared','departure','departure_wait'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'remote'), route({ not:latin }, 'changed_world')];
  });
  def.stages.patron.choices[1].when = latin;
  def.stages.patron.choices[2].when = { all:[latin,quarter] };
  def.stages.quarter_work.transitions.push(route({ not:quarter }, 'changed_world'));
  def.stages.departure.choices[0].when = nicaean;
  ['changed_world','changed_wait','changed_work','ordinary_roads'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'remote')];
  });
  def.stages.crossing.transitions = [
    route({ kind:'home', provinceId:'nicaea' }, 'resettled'),
    route({ all:[{ kind:'arrived', provinceId:'nicaea' }, nicaean] }, 'arrival'),
    route({ all:[{ kind:'arrived', provinceId:'nicaea' }, { not:nicaean }] }, 'destination_changed'),
    route({ not:{ kind:'journey', provinceId:'nicaea' } }, 'interrupted_journey')
  ];
  def.stages.arrival.transitions = [route({ kind:'home', provinceId:'nicaea' }, 'resettled'),
    route({ not:{ kind:'arrived', provinceId:'nicaea' } }, 'interrupted_journey'), route({ not:nicaean }, 'destination_changed')];

  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_1204);
  FBDATA.startScenarios.forEach(function (scenario) {
    if (scenario.id !== 'constantinople_household_1204') return;
    scenario.tracks = (scenario.tracks || []).concat([def.id]);
    scenario.trackLocations = Object.assign({}, scenario.trackLocations);
    scenario.trackLocations[def.id] = ['constantinople'];
  });
})();
