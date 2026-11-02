/* Private household plans use ordinary work, supplies and personal travel. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_perspectives = {
  constantinople_merchant_track_1204:{ id:'constantinople_merchant_track_1204', type:'household_track',
    title:'A Living by the Harbor',
    intro:'Find ordinary customers, weigh the needs of neighbours against the family purse and consider the road. The quarter’s public arrangements promise no private privilege.',
    homeProvinceId:'constantinople', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'opening',
    requirements:{ provinces:['constantinople','nicaea'], realms:['latin_1204','nicaea_1204','venice_1204'] },
    stages:{
      opening:{ name:'Customers by the harbor', text:'Households need supplies after the sack. You can trade in the ordinary market, seek customers beside the Venetian quarter or pass over a deal whose terms you distrust.',
        choices:[
          { id:'local_trade', label:'Trade with local households', detail:'Select ordinary Haggle at market. Choosing work pays nothing; only actual daily market income completes this work decision.', operation:{ kind:'set_focus', focusId:'market' }, next:'local_work' },
          { id:'quarter_trade', label:'Seek customers beside the Venetian quarter', detail:'The quarter’s public right must still be effective. Select the same ordinary market work, without citizenship, office, a tax exemption or a special wage.', operation:{ kind:'set_focus', focusId:'market' }, next:'quarter_work' },
          { id:'decline_deal', label:'Pass over the uncertain deal', detail:'Keep the purse intact. No profit, loss or completed trade is claimed.', operation:{ kind:'record_decision' }, next:'relationship' }
        ], transitions:[] },
      local_work:{ name:'Ordinary market work', text:'The household waits for actual positive market income here. Savings, gifts and merely choosing work do not complete a trade.',
        afterWork:{ focusId:'market', provinceId:'constantinople', next:'relationship' },
        choices:[{ id:'defer', label:'Reconsider before working', detail:'Keep the household decision open without claiming earnings.', operation:{ kind:'record_decision' }, next:'relationship' }], transitions:[] },
      quarter_work:{ name:'Customers beside the quarter', text:'You are seeking ordinary market custom while the quarter right remains effective. Your household keeps its selected community and receives no personal civic privilege.',
        afterWork:{ focusId:'market', provinceId:'constantinople', next:'relationship' },
        choices:[{ id:'defer', label:'Reconsider before working', detail:'No wage, trade completion or civic membership is claimed.', operation:{ kind:'record_decision' }, next:'relationship' }], transitions:[] },
      changed_market:{ name:'The quarter’s terms have changed', text:'The earlier quarter arrangement no longer supports this opportunity. Ordinary customers and your household’s own reserves remain yours to consider.',
        choices:[
          { id:'ordinary_trade', label:'Seek ordinary market customers', detail:'Select ordinary market work under the present court, with its current eligibility and no quarter privilege.', operation:{ kind:'set_focus', focusId:'market' }, next:'local_work' },
          { id:'keep_reserves', label:'Keep the purse and review family needs', detail:'Spend nothing and claim no completed work.', operation:{ kind:'record_decision' }, next:'relationship' }
        ], transitions:[] },
      relationship:{ name:'Neighbours and the family purse', text:'A neighbouring household is also trying to rebuild. Your family could buy a small bundle of supplies to share, keep the reserves or continue ordinary paid dealings.',
        choices:[
          { id:'share_supplies', label:'Buy supplies to share', detail:'Spend {money:2} once from the private purse on household supplies to share. This grants no property, relationship bonus or protection.', operation:{ kind:'household_expense', amount:2 }, next:'plans' },
          { id:'paid_dealings', label:'Keep dealings on an ordinary paid basis', detail:'Select ordinary Haggle at market. This decision promises no special contract or guaranteed payment from a neighbour.', operation:{ kind:'set_focus', focusId:'market' }, next:'further_work' },
          { id:'keep_reserves', label:'Keep the money for your dependants', detail:'Spend nothing and receive no penalty for keeping household reserves.', operation:{ kind:'record_decision' }, next:'plans' }
        ], transitions:[] },
      further_work:{ name:'Continuing ordinary trade', text:'Only actual positive market income in the city completes this work plan. There is no separate story wage.',
        afterWork:{ focusId:'market', provinceId:'constantinople', next:'plans' },
        choices:[{ id:'defer', label:'Leave this work for later', detail:'Consider the household’s future without claiming earnings.', operation:{ kind:'record_decision' }, next:'plans' }], transitions:[] },
      plans:{ name:'A place for the household', text:'You can keep trading in the city, put these plans aside or inspect a personal journey toward Nicaea. The family’s permanent home remains here until ordinary settlement requirements are met.',
        choices:[
          { id:'stay', label:'Keep the household in Constantinople', detail:'Record the decision without a reward, property grant or promise of safety. Ordinary work remains available.', operation:{ kind:'record_decision' }, next:'stayed' },
          { id:'leave', label:'Inspect the journey to Nicaea', detail:'Review a journey for the protagonist alone. This decision spends nothing and moves no relatives.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'defer', label:'Put these plans aside', detail:'Close the story without claiming a completed trade or a new home.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      departure:{ name:'Review the road to Nicaea', text:'The Nicaean court is a possible destination while it still holds Nicaea. A journey promises no recruitment, ready home or protected reception.',
        choices:[
          { id:'go_ahead', label:'Go ahead alone to Nicaea', detail:'Pay the ordinary reviewed journey price. Routes, risks and interruption remain in force; your relatives stay at home.', operation:{ kind:'travel_site', travelSiteId:'constantinople_nicaea_1204' }, next:'crossing' },
          { id:'work_instead', label:'Seek ordinary work here instead', detail:'Return to local market work without a travel charge.', operation:{ kind:'set_focus', focusId:'market' }, next:'local_work' },
          { id:'defer', label:'Set departure aside', detail:'End this plan without travelling or moving the household.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      crossing:{ name:'On the road to Nicaea', text:'The protagonist is travelling ahead. The ordinary journey owns progress, danger, interruption and return. Named relatives and permanent holdings have not moved.', choices:[], transitions:[] },
      arrival:{ name:'A temporary stay at Nicaea', text:'You have actually arrived where the Nicaean court still holds the city. Ordinary local work and residence may permit a later household move.',
        choices:[
          { id:'settle', label:'Review permanent household settlement', detail:'Meet the ordinary free-status, unlanded-household, residence, local-work and lifetime-move rules. Arrival alone is insufficient.', operation:{ kind:'settle_household' }, next:'resettled' },
          { id:'temporary', label:'Keep a temporary personal foothold', detail:'Retain the ordinary journey work and return controls. No household move, job or protected reception is granted.', operation:{ kind:'record_decision' }, next:'temporary' }
        ], transitions:[] },
      stayed:{ name:'The household remains by the harbor', text:'You chose to keep the household here. Recorded purchases and any actual earnings remain facts; later work and changes of rule follow ordinary play.', terminal:true, choices:[], transitions:[] },
      deferred:{ name:'Plans set aside', text:'The household keeps its actual home, identity and remaining purse. No uncompleted work or journey is counted as completed.', terminal:true, choices:[], transitions:[] },
      resettled:{ name:'A new household home', text:'The ordinary settlement transaction moved the household after its actual requirements were met. No title or protection was granted.', terminal:true, choices:[], transitions:[] },
      temporary:{ name:'A personal foothold', text:'Only the protagonist reached this temporary stay. Ordinary work, return and later eligible settlement remain available.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'The local opportunity ended', text:'The protagonist left this local opportunity outside the plan. No further local purchase, earnings or household move is inferred.', terminal:true, choices:[], transitions:[] },
      destination_changed:{ name:'A changed destination', text:'The expected court no longer holds Nicaea. The real journey continues under ordinary controls without a promised reception.', terminal:true, choices:[], transitions:[] },
      interrupted_journey:{ name:'The journey ended', text:'The ordinary journey ended or was interrupted before this plan completed. No arrival or permanent relocation is inferred.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The protagonist’s plan ended', text:'Death or succession ended the unfinished personal plan. The next generation makes its own decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_perspectives.constantinople_merchant_track_1204;
  var local = { all:[{ kind:'home', provinceId:'constantinople' }, { kind:'present', provinceId:'constantinople' }] };
  var latin = { kind:'sovereign', provinceId:'constantinople', realmId:'latin_1204' };
  var nicaean = { kind:'sovereign', provinceId:'nicaea', realmId:'nicaea_1204' };
  var quarter = { kind:'civic_right', realmId:'venice_1204', provinceId:'constantinople', evidenceId:'venetian_quarter_1204' };
  function route(when, next) { return { when:when, next:next }; }
  ['opening','local_work','quarter_work','changed_market','relationship','further_work','plans','departure'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'remote')];
  });
  def.stages.opening.choices[1].when = { all:[latin,quarter] };
  def.stages.quarter_work.transitions.push(route({ not:{ all:[latin,quarter] } }, 'changed_market'));
  def.stages.departure.choices[0].when = nicaean;
  def.stages.crossing.transitions = [
    route({ kind:'home', provinceId:'nicaea' }, 'resettled'),
    route({ all:[{ kind:'arrived', provinceId:'nicaea' }, nicaean] }, 'arrival'),
    route({ all:[{ kind:'arrived', provinceId:'nicaea' }, { not:nicaean }] }, 'destination_changed'),
    route({ not:{ kind:'journey', provinceId:'nicaea' } }, 'interrupted_journey')
  ];
  def.stages.arrival.transitions = [route({ kind:'home', provinceId:'nicaea' }, 'resettled'),
    route({ not:{ kind:'arrived', provinceId:'nicaea' } }, 'interrupted_journey'), route({ not:nicaean }, 'destination_changed')];
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_perspectives);
})();
