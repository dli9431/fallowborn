FB.bookmarkSources.stage({"source":"data/story_pilgrim_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
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

/* These source cards attach only in the fresh following revision. */
FBDATA.householdTracks_pilgrim_followings_1096 = {
  peter_preparation_1096:{id:'peter_preparation_1096',type:'expedition_preparation',
    title:'Peter: preparing an independent following',
    intro:'The simulated source contains 240 fighters and 360 civilians, including Peter. Working age forty-six and preparation in Cologne are disclosed abstractions. Local consent, a voluntary private gift and paid formation are separate. A gift buys no admission, command, friendship or refund. Formation must buy training and fourteen days of actual rations from finite stock; no money or food is supplied at opening.',
    realmId:'peter_following_1096',termDays:360,
    source:{kind:'external',cohorts:[{memberId:'peter_people',culture:'frankish',religion:'catholic',count:600}]},
    provisions:{targetDays:14,maxUnitPrice:1},
    provider:{kind:'home_authority',realmId:'c_cologne',jurisdiction:{kind:'direct_holder',sovereignRealmId:'hre_1096'}},
    householdContribution:{kind:'local_household',maximum:10},acceptance:'volunteers',ai:'form'},
  peter_program_1096:{id:'peter_program_1096',type:'expedition_program',
    title:'Peter: the conditional Danube road',
    intro:'The coarse Cologne, Danube and Constantinople road is a playable abstraction. Each county needs separate current permission and payment. Field and camp positions remain distinct. After formation, the local following sheet offers separately reviewed private contributions for passage and supplies. One finite supply purchase cannot sustain the entire road. Waiting, manual redirection and stopping remain possible; no arrival, imperial agreement or Anatolian encounter is promised.',
    requires:['peter_preparation_1096'],preparationId:'peter_preparation_1096',realmId:'peter_following_1096',
    commandId:'peter_command_1096',programId:'peter_route_1096',termDays:1440,ai:'advance'},
  walter_preparation_1096:{id:'walter_preparation_1096',type:'expedition_preparation',
    title:'Walter: preparing a separate following',
    intro:'The simulated source contains 160 fighters and 160 civilians, including Walter. Working age thirty-six and preparation in Cologne are disclosed abstractions, not a resolution of his departure chronology. This command has its own consent, account and finite source. A voluntary private gift buys no admission or refund. Formation requires paid training and fourteen days of actual rations. No household, patron, money or provisions are invented for Walter.',
    realmId:'walter_following_1096',termDays:270,
    source:{kind:'external',cohorts:[{memberId:'walter_people',culture:'frankish',religion:'catholic',count:320}]},
    provisions:{targetDays:14,maxUnitPrice:1},
    provider:{kind:'home_authority',realmId:'c_cologne',jurisdiction:{kind:'direct_holder',sovereignRealmId:'hre_1096'}},
    householdContribution:{kind:'local_household',maximum:8},acceptance:'volunteers',ai:'form'},
  walter_program_1096:{id:'walter_program_1096',type:'expedition_program',
    title:'Walter: an independently reviewed road',
    intro:'Walter seeks his own finite county permissions along the coarse Danube road. Peter’s consent, money and passage do not belong to this following. Field and camp travel use their actual routes and positions. Further funding and purchases remain separate voluntary reviews on the local following sheet. Refusal, exhausted stores, lost authority or expiry can halt the plan without moving the household home.',
    requires:['walter_preparation_1096'],preparationId:'walter_preparation_1096',realmId:'walter_following_1096',
    commandId:'walter_command_1096',programId:'walter_route_1096',termDays:1440,ai:'advance'},
  pilgrim_peter_admission_1096:{id:'pilgrim_peter_admission_1096',type:'expedition_participation',
    title:'A civilian place with Peter',
    intro:'Request one personal place only at Peter’s actual stationary camp after formation. The commander must accept separately. This creates no soldier, principal, wage, vow or family movement. Leaving retains your actual location; returning home needs its own priced road.',
    host:{kind:'realm_ruler',realmId:'peter_following_1096'},termDays:360,capacity:8,acceptance:'volunteers',roles:[{id:'civilian',kind:'civilian'}]},
  pilgrim_walter_admission_1096:{id:'pilgrim_walter_admission_1096',type:'expedition_participation',
    title:'A civilian place with Walter',
    intro:'Request a personal place at Walter’s actual stationary camp. You can hold only one admission. Acceptance grants civilian carriage, not command, recruitment, a wage or a religious vow. Refusal leaves ordinary household life and solo travel available.',
    host:{kind:'realm_ruler',realmId:'walter_following_1096'},termDays:270,capacity:4,acceptance:'volunteers',roles:[{id:'civilian',kind:'civilian'}]},
  pilgrim_peter_party_1096:{id:'pilgrim_peter_party_1096',type:'household_party',
    title:'Named family places with Peter',
    intro:'Each adult chooses and each child needs an actual consenting parent. After your civilian admission, request places for the exact accepted people. Host acceptance is separate. Refusal preserves your independent personal place. The actual camp carries accepted people; field movement alone never moves them. Permanent home remains Cologne.',
    requires:['pilgrim_peter_admission_1096'],maxMembers:8,allowDependents:true,invitationDays:30,adultPolicy:'volunteers',
    journey:{kind:'mobile_camp',participationId:'pilgrim_peter_admission_1096',capacity:7,termDays:360,acceptance:'volunteers'}},
  pilgrim_walter_party_1096:{id:'pilgrim_walter_party_1096',type:'household_party',
    title:'Named family places with Walter',
    intro:'Review exact family consent and a separate request for Walter’s finite civilian places. Uninvited and refusing relatives stay where they are. Accepted people follow the actual camp, not the field host. Loss or expiry preserves their last reached places; any return requires a separate review and real payment.',
    requires:['pilgrim_walter_admission_1096'],maxMembers:5,allowDependents:true,invitationDays:20,adultPolicy:'volunteers',
    journey:{kind:'mobile_camp',participationId:'pilgrim_walter_admission_1096',capacity:4,termDays:270,acceptance:'volunteers'}},
  pilgrim_following_track_1096:{id:'pilgrim_following_track_1096',type:'household_track',
    title:'The household and the followings',intro:'Six optional reviews keep livelihood, devotion, admission and named family travel separate. Every decision here is costless and grants no reward.',
    homeProvinceId:'cologne',continuity:'protagonist',initialStage:'household',interruptedStage:'interrupted',
    requirements:{provinces:['cologne']},stages:{
      household:{name:'The household first',text:'Your ordinary craft work, savings and home remain available. Peter and Walter have separate unfunded preparations; neither has recruited you.',choices:[
        {id:'review_livelihood',label:'Consider work and savings',detail:'Keep the existing household plan and ordinary craft income. This review pays nothing.',operation:{kind:'record_decision'},next:'livelihood'},
        {id:'stay',label:'Keep ordinary life at home',detail:'Close these reviews without a gift, vow or departure.',operation:{kind:'record_decision'},next:'stayed'}],transitions:[]},
      livelihood:{name:'Actual money and optional gifts',text:'Only ordinary paid work earns money. Preparation cards show exact capped private gifts and real formation costs. Gifts grant neither command nor admission and are not refunded when plans end.',choices:[
        {id:'review_devotion',label:'Keep devotion separate from funding',detail:'Record a priority without paying or promising service.',operation:{kind:'record_decision'},next:'devotion'},
        {id:'keep_savings',label:'Keep the savings for home',detail:'Close these reviews with your actual private purse.',operation:{kind:'record_decision'},next:'stayed'}],transitions:[]},
      devotion:{name:'A vow is a separate choice',text:'The ordinary religious campaign controls any optional vow and its real obligations. Donating, planning a pilgrimage or joining a civilian camp takes no vow. Your original household plan still offers ordinary solo pilgrimage.',choices:[
        {id:'review_admission',label:'Consider civilian admission separately',detail:'This decision requests no place and promises no protection.',operation:{kind:'record_decision'},next:'admission'}],transitions:[]},
      admission:{name:'A request is not acceptance',text:'The personal admission cards require a formed stationary camp and the actual commander’s acceptance. Peter and Walter remain independent alternatives. Rejection leaves work, staying and a separately priced solo journey available.',choices:[
        {id:'review_family',label:'Consider the named household',detail:'Review separate consent without inviting or moving anyone.',operation:{kind:'record_decision'},next:'family'},
        {id:'decline',label:'Leave admission undecided',detail:'End these reviews without cancelling any independent commitment.',operation:{kind:'record_decision'},next:'independent'}],transitions:[]},
      family:{name:'Every traveller is named',text:'Use the matching family card for adult consent, parent care, a request and separate host acceptance. Uninvited or refusing relatives remain at their actual places. Family refusal does not cancel your independent civilian admission.',choices:[
        {id:'review_presence',label:'Keep actual presence decisive',detail:'Record no departure, arrival or family safety.',operation:{kind:'record_decision'},next:'presence'}],transitions:[]},
      presence:{name:'The road remains real',text:'Only the actual civilian camp carries accepted relatives. A field host moving or falling does not itself move or destroy the camp. Host loss and expiry preserve reached places; return is separately reviewed and paid. Closing this opening leaves every real journey and obligation intact.',choices:[
        {id:'continue',label:'Continue with the household’s actual situation',detail:'Close the reviews without a reward, recruitment, relocation or cancellation.',operation:{kind:'record_decision'},next:'independent'}],transitions:[]},
      stayed:{name:'Ordinary household life',text:'Work, family, worship and later journeys remain available. These reviews created no commitment.',terminal:true,choices:[],transitions:[]},
      independent:{name:'Your continuing choices',text:'Actual consent, location, journeys and obligations retain their own owners. These reviews pay no reward.',terminal:true,choices:[],transitions:[]},
      deferred:{name:'The opening reviews have expired',text:'The opening year has passed. Existing journeys, vows, admission and family places retain their actual state.',terminal:true,choices:[],transitions:[]},
      interrupted:{name:'The original protagonist’s reviews end',text:'An heir receives no admission, consent or journey from these reviews.',terminal:true,choices:[],transitions:[]}
    }}
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
  var following=FBDATA.householdTracks_pilgrim_followings_1096.pilgrim_following_track_1096;
  ['household','livelihood','devotion','admission','family','presence'].forEach(function (id) {
    following.stages[id].transitions=[route(expiry,'deferred')];
  });
  Object.assign(FBDATA.storyInstances, FBDATA.householdTracks_pilgrim_1096, FBDATA.openingProfiles_pilgrim_1096,
    FBDATA.householdTracks_pilgrim_followings_1096);
})();
});
