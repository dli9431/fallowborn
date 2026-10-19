/* A personal recall opportunity. Public appointment remains with its owner. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_alexander_1241 = {
  alexander_household_1241:{ id:'alexander_household_1241', type:'household_track',
    title:'Alexander: a northern request',
    intro:'The household at Pereslavl has its own future. A later northern request leaves room for refusal, delay or a personal journey.',
    homeProvinceId:'rostov', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['rostov','novgorod'], realms:['vladimir_1241','novgorod_1241'] },
    stages:{
      household:{ name:'A home at Pereslavl', text:'You have left Novgorod. Your mother and wife share the present household at northern Pereslavl, while your father retains his own court.',
        choices:[
          {id:'take_stock',label:'Take stock of the household',detail:'Consider the people and private resources already here.',operation:{kind:'record_decision'},next:'family'},
          {id:'keep_home',label:'Put the present home first',detail:'Record a household priority.',operation:{kind:'record_decision'},next:'family'}
        ], transitions:[] },
      family:{ name:'One family, separate homes', text:'Feodosia and your wife are here. Your father Yaroslav and brother Andrei retain their separate homes and responsibilities.',
        choices:[
          {id:'consider_kin',label:'Keep the family in view',detail:'Consider your existing kin without making a journey or promise for them.',operation:{kind:'record_decision'},next:'winter'},
          {id:'leave_kin_plans',label:'Leave family plans open',detail:'Continue with present arrangements.',operation:{kind:'record_decision'},next:'winter'}
        ], transitions:[] },
      winter:{ name:'The quarrel and the road north', text:'The winter departure followed a quarrel with Novgorod. Earlier news from the western roads leaves the city with concerns of its own.',
        choices:[
          {id:'leave_door_open',label:'Leave room for a northern request',detail:'Wait for an actual request to reach this opening.',operation:{kind:'record_decision'},next:'waiting'},
          {id:'stay_after_quarrel',label:'Keep your plans at Pereslavl',detail:'Continue the household opening here.',operation:{kind:'record_decision'},next:'stay_plan'}
        ], transitions:[] },
      waiting:{ name:'No request has arrived', text:'There is no new request to answer yet. You can wait as ordinary days pass or choose to continue life here.',
        choices:[{id:'stop_waiting',label:'Continue life at Pereslavl',detail:'Set aside a northern return without a penalty.',operation:{kind:'record_decision'},next:'stay_plan'}],
        transitions:[] },
      request:{ name:'Novgorod asks for Alexander', text:'A request from Novgorod has reached you. The city asks for your return. You can consider the road, refuse, or leave the answer open for a while.',
        choices:[
          {id:'consider_recall',label:'Consider the request',detail:'Review what a personal return would mean before paying for a journey.',operation:{kind:'record_decision'},next:'terms'},
          {id:'refuse_recall',label:'Refuse the recall',detail:'Close this request and keep your present home without a penalty.',operation:{kind:'record_decision'},next:'refused'},
          {id:'delay_answer',label:'Leave the answer for later',detail:'Keep the request open until the end of its reply window.',operation:{kind:'record_decision'},next:'delayed'}
        ], transitions:[] },
      delayed:{ name:'An unanswered request', text:'Novgorod’s request remains unanswered. You can reconsider while it is still open or keep your household here.',
        choices:[
          {id:'reconsider_recall',label:'Reconsider the northern road',detail:'Review the request while its reply window remains open.',operation:{kind:'record_decision'},next:'terms'},
          {id:'decline_after_delay',label:'Decline after reflection',detail:'Close this request without a journey or penalty.',operation:{kind:'record_decision'},next:'refused'}
        ], transitions:[] },
      terms:{ name:'A request to return', text:'The request does not settle the terms of princely service. Going north is a personal visit; the city’s officeholders retain their authority.',
        choices:[
          {id:'review_road',label:'Review the ordinary journey',detail:'See the current private price and route before committing.',operation:{kind:'record_decision'},next:'road'},
          {id:'decline_terms',label:'Keep your present arrangements',detail:'Decline this request without receiving an office or payment.',operation:{kind:'record_decision'},next:'refused'}
        ], transitions:[] },
      road:{ name:'The price of going north', text:'You can travel to Novgorod at the ordinary private price if the route is available. Your mother, wife and household home remain at Pereslavl.',
        choices:[
          {id:'go_north',label:'Go ahead alone to Novgorod',detail:'Pay the reviewed journey price. Arrival grants no princely office, command or household move.',operation:{kind:'travel_site',travelSiteId:'alexander_novgorod_1241'},next:'travelling'},
          {id:'stay_instead',label:'Keep the household at Pereslavl',detail:'Continue here without paying a fare.',operation:{kind:'record_decision'},next:'stay_plan'}
        ], transitions:[] },
      travelling:{ name:'On the northern road', text:'Your personal journey is underway. Its actual route determines arrival; your relatives retain their permanent home.',
        choices:[{id:'leave_journey_open',label:'Continue through ordinary travel',detail:'Close this personal opening while the real journey remains under ordinary travel controls.',operation:{kind:'record_decision'},next:'unresolved'}],
        transitions:[] },
      arrival:{ name:'A visitor in Novgorod', text:'You reached Novgorod through the ordinary journey. The city’s present officeholders remain in place, and your mother and wife retain their home at Pereslavl.',
        choices:[{id:'begin_visit',label:'Continue as a visitor',detail:'Close the opening without an office, troops, payment or household move.',operation:{kind:'record_decision'},next:'visited'}],
        transitions:[{when:{not:{kind:'arrived',provinceId:'novgorod'}},next:'remote'}] },
      stay_plan:{ name:'A household future here', text:'Your household can make its next plans at Pereslavl. The northern request need not determine your future.',
        choices:[
          {id:'plan_local_life',label:'Plan the next ordinary days',detail:'Retain your present resources and home.',operation:{kind:'record_decision'},next:'future'},
          {id:'defer_local_plans',label:'Leave new commitments for later',detail:'Make no additional commitment.',operation:{kind:'record_decision'},next:'future'}
        ], transitions:[] },
      future:{ name:'Your own next chapter', text:'Your family ties and present home remain. Your next decisions follow ordinary life rather than a promised battle or future title.',
        choices:[{id:'finish_stay',label:'Continue life at Pereslavl',detail:'Close this opening with your decisions retained and no additional reward.',operation:{kind:'record_decision'},next:'stayed'}], transitions:[] },
      stayed:{name:'Life at Pereslavl continues',text:'You chose the household’s present home. Ordinary life and family obligations continue.',terminal:true,choices:[],transitions:[]},
      refused:{name:'The recall refused',text:'You declined this request. Your present home and resources remain, and the city’s affairs continue in other hands.',terminal:true,choices:[],transitions:[]},
      expired:{name:'The reply window closed',text:'This request is no longer open. No answer, journey or appointment was made for you. Ordinary life continues.',terminal:true,choices:[],transitions:[]},
      withdrawn:{name:'The northern situation changed',text:'Novgorod’s earlier authorities no longer control the city. This opening request is set aside; your home and completed decisions remain.',terminal:true,choices:[],transitions:[]},
      visited:{name:'A personal return',text:'You began a visit to Novgorod. Later residence, public service and the return road retain their ordinary requirements.',terminal:true,choices:[],transitions:[]},
      unresolved:{name:'The journey remains open',text:'Ordinary travel controls govern the unfinished personal journey. Your permanent household home remains unchanged.',terminal:true,choices:[],transitions:[]},
      cancelled:{name:'The northern journey ended',text:'The journey ended before this opening recorded an arrival. Ordinary play continues at your actual location.',terminal:true,choices:[],transitions:[]},
      remote:{name:'Another course',text:'You left the setting of this plan. Completed decisions remain and ordinary life follows your actual location.',terminal:true,choices:[],transitions:[]},
      interrupted:{name:'The personal opening ended',text:'Death or succession ended Alexander’s unfinished opening. The next generation makes its own decisions.',terminal:true,choices:[],transitions:[]}
    }
  }
};

FBDATA.openingProfiles_alexander_1241 = {
  opening_alexander_1241:{id:'opening_alexander_1241',type:'opening_profile',
    title:'Alexander’s first goals',intro:'Optional personal decisions with no completion reward.',
    scenarioIds:['alexander_1241'],provinceIds:['rostov'],requires:['alexander_household_1241'],
    goals:[
      {id:'household_review',name:'Consider the household',text:'Choose a priority for the people already here.',criterion:{kind:'story_choice',storyId:'alexander_household_1241',choiceIds:['take_stock','keep_home']}},
      {id:'family_review',name:'Consider the existing family',text:'Review your kin and their separate homes.',criterion:{kind:'story_choice',storyId:'alexander_household_1241',choiceIds:['consider_kin','leave_kin_plans']}},
      {id:'own_course',name:'Let the opening take its course',text:'Conclude a stay, refusal, unanswered request or actual personal visit.',criterion:{kind:'household_phase',storyId:'alexander_household_1241',phases:['stayed','refused','expired','visited']}}
    ],contacts:[
      {id:'mother',label:'Feodosia',text:'Your existing mother shares the present household.',linkKind:'kin',required:true,person:{source:'royal_member',realmId:'vladimir_1241',memberId:'feodosia'}},
      {id:'wife',label:'Your wife',text:'The daughter of Bryachislav is your existing spouse.',linkKind:'kin',required:true,person:{source:'royal_member',realmId:'vladimir_1241',memberId:'alexander_wife'}},
      {id:'father',label:'Yaroslav',text:'Your father retains his own court and responsibilities.',linkKind:'kin',required:true,person:{source:'realm_ruler',realmId:'vladimir_1241'}},
      {id:'brother',label:'Andrei',text:'Your existing brother retains his separate home.',linkKind:'kin',required:true,person:{source:'royal_member',realmId:'vladimir_1241',memberId:'andrei'}}
    ]}
};

(function () {
  'use strict';
  var def=FBDATA.householdTracks_alexander_1241.alexander_household_1241;
  var local={all:[{kind:'home',provinceId:'rostov'},{kind:'present',provinceId:'rostov'},{not:{kind:'travelling'}}]};
  var expiry={kind:'elapsed',minDays:180,sinceCampaign:true};
  ['household','family','winter','waiting','request','delayed','terms','road','stay_plan','future'].forEach(function (id) {
    def.stages[id].transitions=[{when:{not:local},next:'remote'},{when:expiry,next:'expired'}];
  });
  ['waiting','request','delayed','terms','road'].forEach(function (id) {
    def.stages[id].transitions.push({when:{not:{kind:'sovereign',provinceId:'novgorod',realmId:'novgorod_1241'}},next:'withdrawn'});
  });
  /* Finite delivery/reply windows are simulation scheduling, not annal dates. */
  def.stages.waiting.transitions.push({when:{kind:'elapsed',minDays:30,sinceCampaign:true},next:'request'});
  def.stages.travelling.transitions=[
    {when:{kind:'arrived',provinceId:'novgorod'},next:'arrival'},
    {when:{not:{kind:'journey',provinceId:'novgorod'}},next:'cancelled'}
  ];
  Object.assign(FBDATA.storyInstances,FBDATA.householdTracks_alexander_1241,FBDATA.openingProfiles_alexander_1241);
})();
