window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_1066 = {
  thegn_track_1066:{ id:'thegn_track_1066', type:'household_track', title:'A Thegn’s Household',
    intro:'Keep the household working while the courts make their own decisions. Autumn brings a series of choices about stores, local work and a possible personal journey south.',
    homeProvinceId:'york', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['york','london','lewes'], realms:['england_1066'] },
    jobs:{ local_accounts:{ payerRealmId:'england_1066', provinceId:'york', days:2, fee:4,
      completionGold:4, settlementGold:0, expiresDays:14, yearMin:1066, yearMax:1066 } },
    stages:{
      household:{ name:'Land, stores and obligations', text:'A small plot does not feed a household by itself. Consider your stores and paid work before accepting a further commitment.',
        choices:[
          { id:'keep_house', label:'Manage the family’s property first', detail:'Select ordinary Manage the manor. Income comes from days actually worked.', operation:{ kind:'set_focus', focusId:'manage_manor' }, next:'offer' },
          { id:'ask_work', label:'Ask about local civilian work', detail:'Review an optional two-day account job. Asking creates no obligation.', operation:{ kind:'record_decision' }, next:'offer' }
        ], transitions:[] },
      offer:{ name:'Two days on local accounts', text:'A local intermediary needs help counting stores and checking accounts for the English court. The agreed work is civilian and voluntary.',
        choices:[
          { id:'accept', label:'Review the two-day job', detail:'Reserve four gold from the living English court. Work the first day now; one further shift completes payment. Each shift replaces Daily Focus.', operation:{ kind:'start_job', jobId:'local_accounts' }, next:'working' },
          { id:'decline', label:'Keep your time for the household', detail:'Decline without a fine or a new service obligation.', operation:{ kind:'record_decision' }, next:'summer' }
        ], transitions:[] },
      working:{ name:'Finishing the account work', text:'The agreed fee is reserved. One further day completes these accounts. Your family’s ordinary affairs continue while you work.',
        choices:[{ id:'shift', label:'Work the remaining shift', detail:'Spend one action day on the accepted job. The reserved four gold pay once when both shifts are complete.', operation:{ kind:'work_job', jobId:'local_accounts' }, next:'summer' }], transitions:[] },
      summer:{ name:'The household through summer', text:'Keep your usual work and family plans. There is time to finish this connection now or return to the household’s accounts in autumn.',
        choices:[{ id:'finish', label:'Keep ordinary household life as your priority', detail:'Finish the story without a reward or a further commitment.', operation:{ kind:'record_decision' }, next:'stayed' }], transitions:[] },
      autumn_accounts:{ name:'Autumn accounts', text:'As autumn begins, weigh your household’s available time and stores. Any later work needs its own agreement.',
        choices:[{ id:'review', label:'Keep the next decision local', detail:'Watch the household’s situation at York. This choice ends no public levy or private contract.', operation:{ kind:'record_decision' }, next:'await_north' }], transitions:[] },
      await_north:{ name:'Watching the northern roads', text:'Work and family needs continue at York while you watch the northern roads.', choices:[], transitions:[] },
      northern_pressure:{ name:'York’s ruler is at war', text:'The court governing York is fighting a war. Your household must decide how much of its own purse to keep available.',
        choices:[
          { id:'buy_stores', label:'Buy three gold of household supplies', detail:'Spend three private gold once. These supplies grant no holding, military contribution or income bonus.', operation:{ kind:'household_expense', amount:3 }, next:'await_bridge' },
          { id:'keep_reserve', label:'Keep the purse in reserve', detail:'Spend nothing and accept no service duty.', operation:{ kind:'record_decision' }, next:'await_bridge' }
        ], transitions:[] },
      northern_quiet:{ name:'The northern household', text:'York’s governing court is currently at peace. Your household can keep its work going without taking on another commitment.',
        choices:[{ id:'continue', label:'Keep work and stores in hand', detail:'Continue ordinary life without a war payment or summons.', operation:{ kind:'record_decision' }, next:'await_bridge' }], transitions:[] },
      await_bridge:{ name:'Keeping plans open', text:'Your household’s northern plans remain open for the next autumn review.', choices:[], transitions:[] },
      northern_review:{ name:'A second look north', text:'Autumn is moving on. Reconsider the household’s priorities before choosing whether to look for work farther south.',
        choices:[
          { id:'stay', label:'Keep the household at York', detail:'Keep ordinary work available and consider the southern road later.', operation:{ kind:'record_decision' }, next:'await_south' },
          { id:'finish', label:'Set further commitments aside', detail:'Conclude the story here, including if personal restrictions make new work or travel unsuitable.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      await_south:{ name:'Considering the southern road', text:'The household remains at its actual home. No distant court has reserved a job for you.', choices:[], transitions:[] },
      looking_south:{ name:'Work farther south', text:'London offers another place to seek a living. You can review a personal journey or keep your time at home.',
        choices:[
          { id:'go', label:'Review a personal journey to London', detail:'Go ahead alone at the ordinary route price and risk. Relatives and the private plot stay at home; arrival grants no enlistment or wages.', operation:{ kind:'travel_site', travelSiteId:'thegn_london_1066' }, next:'journey' },
          { id:'remain', label:'Remain with the household', detail:'Stay at home without losing property or promising military service.', operation:{ kind:'record_decision' }, next:'await_october' }
        ], transitions:[] },
      await_october:{ name:'Household work in autumn', text:'Ordinary work continues while you keep the next autumn decision open.', choices:[], transitions:[] },
      southern_review:{ name:'The later autumn decision', text:'Consider the household’s livelihood and any journey already under way. You may finish your plans without accepting a new obligation.',
        choices:[
          { id:'finish', label:'Put the household’s livelihood first', detail:'Finish the story with current property and family ties.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'wait', label:'Leave the final review until later in autumn', detail:'Keep ordinary work and travel controls available. No war outcome or payment follows from waiting.', operation:{ kind:'record_decision' }, next:'await_close' }
        ], transitions:[] },
      await_close:{ name:'Toward the end of autumn', text:'Your remaining work and travel follow their current terms. The household can close its plans when the next review comes.', choices:[], transitions:[] },
      changed_rule:{ name:'A new authority at York', text:'The authority governing your household’s home has changed. Consider your existing livelihood under the current lord.',
        incident:{ source:'control', provinceId:'york', milestone:'rule_changed' }, afterIncident:'changed_ruler',
        choices:[{ id:'acknowledge', label:'Keep the household’s livelihood in view', detail:'Acknowledge this actual change once. No new tax, tribute, confiscation, reward or allegiance is created.', operation:{ kind:'record_decision' }, next:'changed_ruler' }], transitions:[] },
      journey:{ name:'On the road to London', text:'The ordinary journey owns your route and its risks. Your relatives remain at their permanent home.',
        choices:[
          { id:'return', label:'Review the return home', detail:'Use ordinary turn-back or return rules, including any minimum stay.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'finish', label:'Leave this journey to ordinary travel', detail:'Finish the story without changing or completing the journey.', operation:{ kind:'record_decision' }, next:'independent_journey' }
        ], transitions:[] },
      london:{ name:'A visitor in London', text:'You have reached London. Your family’s home and plot remain at York. Local opportunities still require their ordinary work and access terms.',
        choices:[
          { id:'return', label:'Review the ordinary return to York', detail:'Pay no second story fee. The existing journey retains its return and minimum-stay rules.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'stay', label:'Leave further plans to ordinary travel', detail:'Finish the story as a visitor, with no household move, military credit or payment.', operation:{ kind:'record_decision' }, next:'independent_journey' }
        ], transitions:[] },
      returning:{ name:'Returning to the household', text:'Completion waits for your actual return to York. The journey does not move your relatives or transfer property.', choices:[], transitions:[] },
      stayed:{ name:'A livelihood at home', text:'You closed these household plans. Your existing family, work and private property continue under ordinary rules.', terminal:true, choices:[], transitions:[] },
      peaceful:{ name:'The autumn review is complete', text:'The court governing York is currently at peace. These household plans end without a new service commitment or payment.', terminal:true, choices:[], transitions:[] },
      continued_conflict:{ name:'Household life during war', text:'York’s governing court remains at war. Your household plans are closed; current war effects, work and travel continue.', terminal:true, choices:[], transitions:[] },
      changed_ruler:{ name:'Life under the current authority', text:'The change at home is recorded. Your household resumes ordinary choices under the current court.', terminal:true, choices:[], transitions:[] },
      returned:{ name:'Home at York', text:'You have actually returned to York after your personal journey. Your household receives no arrival payment or new property.', terminal:true, choices:[], transitions:[] },
      independent_journey:{ name:'Further plans are yours', text:'Your household story has ended. An existing personal journey and any later residence decision retain their ordinary terms.', terminal:true, choices:[], transitions:[] },
      deferred:{ name:'Further commitments set aside', text:'You set these plans aside. Existing restrictions, family ties, property and unfinished journeys remain in force.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The personal plan has ended', text:'Death or a change of protagonist has ended this person’s unfinished household plan. Existing work accounts retain their earned-pay and refund rules.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_1066.thegn_track_1066;
  function from(day) { return { kind:'calendar_window', firstDay:[1066,2,day], lastDay:[10000,3,90] }; }
  function route(when, next) { return { when:when, next:next }; }
  var war = { kind:'at_war', provinceId:'york' };
  var local = { all:[{ kind:'home', provinceId:'york' },{ kind:'present', provinceId:'york' }] };
  var changed = { not:{ kind:'sovereign', provinceId:'york', realmId:'england_1066' } };
  var finish = [route({ all:[from(61),war] }, 'continued_conflict'), route(from(61), 'peaceful')];
  ['household','offer','working','summer','autumn_accounts','await_north','northern_pressure','northern_quiet',
    'await_bridge','northern_review','await_south','looking_south','await_october','southern_review','await_close'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'independent_journey'),route(changed, 'changed_rule')].concat(finish);
  });
  ['household','offer','summer'].forEach(function (id) {
    def.stages[id].transitions = def.stages[id].transitions.concat([route(from(44), 'southern_review'),
      route(from(28), 'looking_south'),route(from(25), 'northern_review'),route(from(20), 'await_north'),route(from(8), 'autumn_accounts')]);
  });
  def.stages.working.transitions.push(route({ kind:'job_state', jobId:'local_accounts', states:['cancelled','expired','settled'] }, 'summer'));
  def.stages.autumn_accounts.transitions = def.stages.autumn_accounts.transitions.concat([
    route(from(44), 'southern_review'),route(from(28), 'looking_south'),route(from(25), 'northern_review'),route(from(20), 'await_north')]);
  def.stages.await_north.transitions = def.stages.await_north.transitions.concat([
    route(from(44), 'southern_review'),route(from(28), 'looking_south'),route(from(25), 'northern_review'),
    route({ all:[from(20),war] }, 'northern_pressure'),route(from(20), 'northern_quiet')]);
  def.stages.northern_pressure.transitions.push(route(from(44), 'southern_review'),route(from(28), 'looking_south'),
    route(from(25), 'northern_review'),route({ not:war }, 'northern_quiet'));
  def.stages.northern_quiet.transitions.push(route(from(44), 'southern_review'),route(from(28), 'looking_south'),
    route(from(25), 'northern_review'),route(war, 'northern_pressure'));
  def.stages.await_bridge.transitions.push(route(from(44), 'southern_review'),route(from(28), 'looking_south'),route(from(25), 'northern_review'));
  def.stages.northern_review.transitions.push(route(from(44), 'southern_review'),route(from(28), 'looking_south'));
  def.stages.await_south.transitions.push(route(from(44), 'southern_review'),route(from(28), 'looking_south'));
  def.stages.looking_south.transitions.push(route(from(44), 'southern_review'));
  def.stages.await_october.transitions.push(route(from(44), 'southern_review'));
  def.stages.changed_rule.transitions = [route({ kind:'calendar_window', firstDay:[1067,0,1], lastDay:[10000,3,90] }, 'changed_ruler')];
  def.stages.journey.transitions = [route({ kind:'arrived', provinceId:'london' }, 'london'),
    route({ not:{ kind:'journey', provinceId:'london' } }, 'independent_journey')];
  def.stages.london.transitions = [route({ not:{ kind:'arrived', provinceId:'london' } }, 'independent_journey')];
  def.stages.returning.transitions = [route({ all:[{ not:{ kind:'travelling' } },local] }, 'returned'),
    route({ not:{ kind:'travelling' } }, 'independent_journey')];
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_1066);
})();
