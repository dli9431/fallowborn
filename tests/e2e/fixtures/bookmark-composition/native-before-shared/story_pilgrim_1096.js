/* Personal decisions delegate work and pilgrimage to their ordinary owners. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_pilgrim_1096 = {
  pilgrim_household_track_1096:{ id:'pilgrim_household_track_1096', type:'household_track',
    title:'A Household and a Pilgrimage',
    intro:'Keep a living in Cologne or consider a personal pilgrimage, with the household at home.',
    homeProvinceId:'cologne', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['cologne','jerusalem'] },
    stages:{
      household:{ name:'The household in Cologne', text:'Work and family shape your days at home. You have joined no expedition and taken no vow. A pilgrimage would be a personal journey under ordinary travel rules.',
        choices:[
          { id:'take_stock', label:'Consider the household’s plans', detail:'Review staying, earning and saving. This decision costs no money or days.', operation:{ kind:'record_decision' }, next:'plans' },
          { id:'stay_home', label:'Put ordinary life at home first', detail:'Close the opening plans with your present family and resources.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      plans:{ name:'A journey or a living at home', text:'Jerusalem is a possible pilgrimage destination for your faith. The current road, personal restrictions and price decide whether you can go. Your relatives would remain at their actual home.',
        choices:[
          { id:'prepare', label:'Prepare through work and savings', detail:'Consider ordinary craft earnings before reviewing the journey.', operation:{ kind:'record_decision' }, next:'preparation' },
          { id:'review_journey', label:'Review the pilgrimage now', detail:'Inspect the ordinary solo journey without reserving money or enrolling in a host.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'remain', label:'Keep the household in Cologne', detail:'Finish these plans without leaving or taking on a new obligation.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      preparation:{ name:'Saving for the road', text:'A decision to travel earns nothing. Ordinary work can add to the private purse; retaining those earnings remains your choice. No court has promised a wage or paid your fare.',
        choices:[
          { id:'work_bench', label:'Work at the craft bench', detail:'Select ordinary craft work. Only actual paid work counts as earnings.', operation:{ kind:'set_focus', focusId:'craft_work' }, next:'working' },
          { id:'use_savings', label:'Review the journey with current savings', detail:'Keep your present focus and inspect the current price and route.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'keep_livelihood', label:'Keep these plans at home', detail:'Continue ordinary household life with no departure or story reward.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      working:{ name:'Earning before deciding', text:'Craft work is selected. The household has not yet recorded a payment from this work at home.',
        afterWork:{ focusId:'craft_work', provinceId:'cologne', next:'earned' },
        choices:[
          { id:'review_without_earnings', label:'Review travel before the work pays', detail:'Review current savings without claiming a wage.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'remain_working', label:'Keep working at home', detail:'Close the travel plan and leave ordinary craft work selected.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      earned:{ name:'Actual earnings in hand', text:'Ordinary craft work has paid in Cologne. This money is yours to save, spend or retain for life at home; it does not guarantee an affordable or safe journey.',
        choices:[
          { id:'review_price', label:'Review the pilgrimage price', detail:'Inspect the ordinary route and full current fare.', operation:{ kind:'record_decision' }, next:'departure' },
          { id:'save_more', label:'Keep saving through ordinary work', detail:'Return to preparation without an extra wage or payment.', operation:{ kind:'record_decision' }, next:'preparation' },
          { id:'stay_with_earnings', label:'Keep the earnings for home life', detail:'Finish the opening plan with your actual private purse.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      departure:{ name:'Reviewing the pilgrimage', text:'The ordinary journey review decides whether Jerusalem is currently reachable and affordable for you. Travelling ahead does not move your spouse or children, supply protection or place you in an expedition.',
        choices:[
          { id:'go_alone', label:'Review a solo pilgrimage to Jerusalem', detail:'Pay the full reviewed journey price only on confirmation. The protagonist travels alone; the household stays home.', operation:{ kind:'travel_site', travelSiteId:'pilgrim_jerusalem_christian' }, next:'travelling' },
          { id:'postpone', label:'Postpone and keep saving', detail:'Spend nothing and return to ordinary work and savings.', operation:{ kind:'record_decision' }, next:'preparation' },
          { id:'stay_instead', label:'Remain with the household', detail:'Close these plans without leaving home.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      travelling:{ name:'A personal journey', text:'You are on an ordinary personal pilgrimage. Its actual route, encounters and return rules determine what happens. Your family remains at its permanent home.',
        choices:[
          { id:'turn_back', label:'Review turning back home', detail:'Use ordinary return rules. The household story waits for an actual return.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'leave_to_travel', label:'Leave further plans to ordinary travel', detail:'Close the household plan while the existing personal journey continues.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      arrival:{ name:'A visitor in Jerusalem', text:'The protagonist has actually arrived in Jerusalem. The ordinary pilgrimage and its arrival choices keep their own effects. Your household still has its home in Cologne.',
        choices:[
          { id:'return_home', label:'Review returning to Cologne', detail:'Use the ordinary minimum-stay and return rules. Arrival home must still occur.', operation:{ kind:'return_home' }, next:'returning' },
          { id:'visit_only', label:'Continue as a personal visitor', detail:'Close the household plan. Existing travel, local work and any later lawful settlement retain their ordinary rules.', operation:{ kind:'record_decision' }, next:'independent' }
        ], transitions:[] },
      returning:{ name:'The journey home', text:'The protagonist is returning through ordinary travel. Completion waits for actual arrival at home; no household member or property is moved by this review.',
        choices:[{ id:'leave_return', label:'Leave the return to ordinary travel', detail:'Close these personal plans without completing or cancelling the existing return journey.', operation:{ kind:'record_decision' }, next:'independent' }], transitions:[] },
      stayed:{ name:'A living in Cologne', text:'You chose ordinary household life at home. Work, worship, family and any future journey remain your decisions.', terminal:true, choices:[], transitions:[] },
      returned:{ name:'Actually home again', text:'The protagonist has returned to Cologne. Existing pilgrimage effects and obligations retain their ordinary owners; this conclusion pays no reward.', terminal:true, choices:[], transitions:[] },
      independent:{ name:'Further plans remain yours', text:'This local plan has closed. Any personal journey, later household move and ordinary obligations continue at their actual state.', terminal:true, choices:[], transitions:[] },
      journey_ended:{ name:'The journey changed or ended', text:'The reviewed outward journey is no longer active. This plan records no arrival in Jerusalem or return home; present residence and travel remain authoritative.', terminal:true, choices:[], transitions:[] },
      deferred:{ name:'The opening plans are set aside', text:'The opening year has passed. These plans close without moving anyone, cancelling a journey, changing obligations or paying a reward.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'This protagonist’s plans have ended', text:'Death or succession ended this person’s unfinished plan. The next generation keeps its own ordinary choices and the household’s actual history.', terminal:true, choices:[], transitions:[] }
    }
  }
};

FBDATA.openingProfiles_pilgrim_1096 = {
  opening_pilgrim_1096:{ id:'opening_pilgrim_1096', type:'opening_profile',
    title:'The Household’s Opening Goals', intro:'Optional goals observe actual work, savings and home decisions. They grant no extra reward or travel rights.',
    scenarioIds:['pilgrim_household_1096'], provinceIds:['cologne'], requires:['pilgrim_household_track_1096'],
    goals:[
      { id:'craft_income', name:'Earn ten gold at the bench', text:'Earn ten gold through ordinary craft work after this opening.', criterion:{ kind:'earnings', amount:10, focusIds:['craft_work'] } },
      { id:'private_reserve', name:'Keep fifty gold in reserve', text:'Hold fifty gold in the private purse as a free household. This is a savings goal, not a guaranteed pilgrimage fare.', criterion:{ kind:'reserve', amount:50 } },
      { id:'home_decision', name:'Stay home or actually return', text:'Choose to stay in Cologne or complete an actual personal return home through this plan.', criterion:{ kind:'household_phase', storyId:'pilgrim_household_track_1096', phases:['stayed','returned'] } }
    ],
    contacts:[
      { id:'imperial_ruler', label:'The opening imperial ruler', text:'The existing imperial ruler is a named reference. This link provides no audience, protection, friendship or expedition command.', linkKind:'target', required:true, person:{ source:'realm_ruler', realmId:'hre_1096' } }
    ] }
};

(function () {
  'use strict';
  var def = FBDATA.householdTracks_pilgrim_1096.pilgrim_household_track_1096;
  var local = { all:[{ kind:'home', provinceId:'cologne' }, { kind:'present', provinceId:'cologne' }] };
  var expiry = { kind:'year', min:1097, max:10000 };
  function route(when, next) { return { when:when, next:next }; }
  ['household','plans','preparation','working','earned','departure'].forEach(function (id) {
    def.stages[id].transitions = [route({ not:local }, 'independent'), route(expiry, 'deferred')];
  });
  def.stages.travelling.transitions = [
    route({ kind:'arrived', provinceId:'jerusalem' }, 'arrival'),
    route({ not:{ kind:'journey', provinceId:'jerusalem' } }, 'journey_ended'),
    route(expiry, 'deferred')
  ];
  def.stages.arrival.transitions = [
    route({ not:{ kind:'arrived', provinceId:'jerusalem' } }, 'independent'), route(expiry, 'deferred')
  ];
  def.stages.returning.transitions = [
    route({ all:[local, { not:{ kind:'travelling' } }] }, 'returned'),
    route({ not:{ kind:'journey', provinceId:'jerusalem' } }, 'journey_ended'), route(expiry, 'deferred')
  ];
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_pilgrim_1096, FBDATA.openingProfiles_pilgrim_1096);
})();
