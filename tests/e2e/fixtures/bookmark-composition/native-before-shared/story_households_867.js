window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_867 = {
  york_household_track_867:{ id:'york_household_track_867', type:'household_track', title:'A Household in York',
    intro:'Keep a livelihood, weigh a voluntary repair order and consider the household’s future under the current authority.',
    homeProvinceId:'york', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['york'], realms:['york'] },
    jobs:{ repairs:{ payerRealmId:'york', provinceId:'york', days:1, fee:2,
      completionGold:2, settlementGold:0, expiresDays:7, yearMin:867, yearMax:867 } },
    stages:{
      household:{ name:'A livelihood in occupied York', text:'The city’s workshops and households still need repairs and everyday goods. Decide how to keep your own household going.',
        choices:[
          { id:'ask_repairs', label:'Ask about a repair order', detail:'Consider voluntary civilian work for the governing court. Asking spends no money or time.', operation:{ kind:'record_decision' }, next:'offer' },
          { id:'ordinary_work', label:'Keep working at the bench', detail:'Select ordinary craft work. Income comes from days actually worked.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'ordinary_work' },
          { id:'consider_road', label:'Consider leaving York', detail:'Plan your next step before using ordinary travel controls. This decision moves nobody.', operation:{ kind:'record_decision' }, next:'life' }
        ], transitions:[] },
      offer:{ name:'One day of repairs', text:'A local intermediary offers a day repairing everyday equipment for York’s governing court. The offer is available while that court is at peace.',
        choices:[
          { id:'accept_repairs', label:'Review the one-day repair order', detail:'Reserve two gold from the original living York ruler’s treasury. Complete one action day in place of Daily Focus and receive the two gold once. This is civilian work.',
            when:{ not:{ kind:'at_war', provinceId:'york' } }, operation:{ kind:'start_job', jobId:'repairs' }, next:'preparations' },
          { id:'ordinary_work', label:'Keep your ordinary customers', detail:'Select craft work instead. No court wage is paid by this choice.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'ordinary_work' },
          { id:'decline_repairs', label:'Decline the repair order', detail:'Keep your time without a fine or service duty.', operation:{ kind:'record_decision' }, next:'preparations' }
        ], transitions:[] },
      ordinary_work:{ name:'Work for ordinary customers', text:'Your household’s craft provides another way to make a living. A day that actually earns craft income completes this work decision.',
        afterWork:{ focusId:'craft_work', provinceId:'york', next:'preparations' },
        choices:[{ id:'set_aside_work', label:'Set further work aside for now', detail:'Continue the household’s plans without claiming a completed order or wages.', operation:{ kind:'record_decision' }, next:'preparations' }], transitions:[] },
      preparations:{ name:'Keeping the household supplied', text:'Consider the household’s available purse and the ordinary goods it can afford. You can keep money in reserve or buy a few supplies.',
        choices:[
          { id:'buy_supplies', label:'Buy two gold of household supplies', detail:'Spend two private gold once on everyday household supplies. This grants no holding, income bonus or army contribution.', operation:{ kind:'household_expense', amount:2 }, next:'life' },
          { id:'keep_reserve', label:'Keep your money in reserve', detail:'Spend nothing and continue with ordinary household plans.', operation:{ kind:'record_decision' }, next:'life' }
        ], transitions:[] },
      life:{ name:'Stay or plan a departure', text:'Your family’s home is still at York. Decide whether to keep your livelihood here or leave further plans to the ordinary travel controls.',
        choices:[
          { id:'stay', label:'Keep the household at York', detail:'Conclude these plans with current property and family ties.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'plan_departure', label:'Leave further plans to ordinary travel', detail:'Finish this story, then review any journey through ordinary travel controls. Relatives and possessions remain where they are.', operation:{ kind:'record_decision' }, next:'planned_departure' },
          { id:'defer', label:'Set these commitments aside', detail:'Finish here if work or travel is unsuitable. Existing personal restrictions continue.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      changed_rule:{ name:'A new authority at York', text:'The authority governing your household’s home has actually changed. Consider your livelihood under the current lord.',
        incident:{ source:'control', provinceId:'york', milestone:'rule_changed' }, afterIncident:'current_life',
        choices:[{ id:'acknowledge_rule', label:'Review the household’s position', detail:'Record this change once, without a tax, confiscation, allegiance pledge or reward.', operation:{ kind:'record_decision' }, next:'current_life' }], transitions:[] },
      current_life:{ name:'Life under the current lord', text:'The change of authority is recorded. Keep your existing livelihood or consider the road through ordinary travel.',
        choices:[
          { id:'stay', label:'Keep your livelihood at York', detail:'Finish these plans with existing family ties and property.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'plan_departure', label:'Leave further plans to ordinary travel', detail:'Finish this story with no move or journey payment. Later travel and household settlement retain their ordinary terms.', operation:{ kind:'record_decision' }, next:'planned_departure' }
        ], transitions:[] },
      stayed:{ name:'A livelihood at York', text:'Your opening household plans are complete. Work, family and the city’s future continue through ordinary play.', terminal:true, choices:[], transitions:[] },
      planned_departure:{ name:'Further plans are yours', text:'You have set aside these opening plans to consider the road. Your actual home, family, property and any existing journey retain their ordinary arrangements.', terminal:true, choices:[], transitions:[] },
      deferred:{ name:'Commitments set aside', text:'These opening plans are closed. Your household continues with its existing circumstances and obligations.', terminal:true, choices:[], transitions:[] },
      window_closed:{ name:'Ordinary life continues', text:'The short opening opportunity has passed. Your household’s current work, resources and arrangements continue.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'This personal plan has ended', text:'Death or a change of protagonist has ended this person’s unfinished household plan. Any earned-pay and refund accounts retain their ordinary terms.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_867.york_household_track_867;
  var local = { all:[{ kind:'home', provinceId:'york' },{ kind:'present', provinceId:'york' }] };
  var expired = { kind:'elapsed', minDays:30, sinceCampaign:true };
  var changed = { not:{ kind:'sovereign', provinceId:'york', realmId:'york' } };
  Object.keys(def.stages).forEach(function (id) {
    if (def.stages[id].terminal) return;
    def.stages[id].transitions = [
      { when:{ not:local }, next:'planned_departure' },
      { when:expired, next:'window_closed' }
    ];
    if (id !== 'changed_rule' && id !== 'current_life') {
      def.stages[id].transitions.splice(1, 0, { when:changed, next:'changed_rule' });
    }
  });
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_867);
})();
