FB.bookmarkSources.stage({"source":"data/story_alexander_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
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
          {id:'keep_home',label:'Put the present home first',detail:'You make the home at Pereslavl your first concern.',operation:{kind:'record_decision'},next:'family'}
        ], transitions:[] },
      family:{ name:'One family, separate homes', text:'Feodosia and your wife are here. Your father Yaroslav and brother Andrei retain their separate homes and responsibilities.',
        choices:[
          {id:'consider_kin',label:'Keep the family in view',detail:'You keep your mother, Yaroslav and Andrei in mind as you plan.',operation:{kind:'record_decision'},next:'winter'},
          {id:'leave_kin_plans',label:'Leave family plans open',detail:'Continue with present arrangements.',operation:{kind:'record_decision'},next:'winter'}
        ], transitions:[] },
      winter:{ name:'The quarrel and the road north', text:'The winter departure followed a quarrel with Novgorod. Earlier news from the western roads leaves the city with concerns of its own.',
        choices:[
          {id:'leave_door_open',label:'Leave room for a northern request',detail:'You wait to see whether Novgorod sends for you.',operation:{kind:'record_decision'},next:'waiting'},
          {id:'stay_after_quarrel',label:'Keep your plans at Pereslavl',detail:'You stay at Pereslavl and make your plans there.',operation:{kind:'record_decision'},next:'stay_plan'}
        ], transitions:[] },
      waiting:{ name:'No request has arrived', text:'Novgorod has sent no request yet. You can wait for word from the north or settle into life here.',
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
      terms:{ name:'A request to return', text:'Novgorod wants you back, but its request names no terms of service. You can look at the road north or stay where you are.',
        choices:[
          {id:'review_road',label:'Look at the road north',detail:'See the fare and the route to Novgorod before you commit.',operation:{kind:'record_decision'},next:'road'},
          {id:'decline_terms',label:'Keep your present arrangements',detail:'You decline the request and stay at Pereslavl.',operation:{kind:'record_decision'},next:'refused'}
        ], transitions:[] },
      road:{ name:'The price of going north', text:'You can travel to Novgorod for a private fare if the road is open. Your mother, wife and home stay at Pereslavl.',
        choices:[
          {id:'go_north',label:'Go ahead alone to Novgorod',detail:'Pay the fare and travel alone. Arriving does not make you Novgorod’s prince.',operation:{kind:'travel_site',travelSiteId:'alexander_novgorod_1241'},next:'travelling'},
          {id:'stay_instead',label:'Keep the household at Pereslavl',detail:'Continue here without paying a fare.',operation:{kind:'record_decision'},next:'stay_plan'}
        ], transitions:[] },
      travelling:{ name:'On the northern road', text:'You are on the road to Novgorod. Your relatives keep their home at Pereslavl.',
        choices:[{id:'leave_journey_open',label:'Let the journey run its course',detail:'Close this story here while you travel on.',operation:{kind:'record_decision'},next:'unresolved'}],
        transitions:[] },
      arrival:{ name:'A visitor in Novgorod', text:'You have reached Novgorod as a visitor, and your mother and wife keep their home at Pereslavl.',
        choices:[{id:'begin_visit',label:'Continue as a visitor',detail:'Close this story and stay in the city as a visitor.',operation:{kind:'record_decision'},next:'visited'}],
        transitions:[{when:{not:{kind:'arrived',provinceId:'novgorod'}},next:'remote'}] },
      stay_plan:{ name:'A household future here', text:'Your household can make its next plans at Pereslavl. The northern request need not determine your future.',
        choices:[
          {id:'plan_local_life',label:'Plan the months ahead at Pereslavl',detail:'Retain your present resources and home.',operation:{kind:'record_decision'},next:'future'},
          {id:'defer_local_plans',label:'Leave new commitments for later',detail:'Make no additional commitment.',operation:{kind:'record_decision'},next:'future'}
        ], transitions:[] },
      future:{ name:'Your own next chapter', text:'Your family and your home at Pereslavl remain. What you do next is your own choice.',
        choices:[{id:'finish_stay',label:'Continue life at Pereslavl',detail:'Close this story and keep your life at Pereslavl.',operation:{kind:'record_decision'},next:'stayed'}], transitions:[] },
      stayed:{name:'Life at Pereslavl continues',text:'You chose to stay at Pereslavl with your household. Life and family duties go on.',terminal:true,choices:[],transitions:[]},
      refused:{name:'The recall refused',text:'You declined this request. Your present home and resources remain, and the city’s affairs continue in other hands.',terminal:true,choices:[],transitions:[]},
      expired:{name:'The reply window closed',text:'Novgorod’s request lapsed without an answer. Life at Pereslavl goes on.',terminal:true,choices:[],transitions:[]},
      withdrawn:{name:'The northern situation changed',text:'The government that sent the request no longer holds Novgorod, so the request lapses. Your home and earlier choices remain.',terminal:true,choices:[],transitions:[]},
      visited:{name:'A personal return',text:'You are in Novgorod as a visitor. Staying on, taking service or going home is your own choice from here.',terminal:true,choices:[],transitions:[]},
      unresolved:{name:'The journey remains open',text:'You are still on the road north. Your household’s home stays at Pereslavl.',terminal:true,choices:[],transitions:[]},
      cancelled:{name:'The northern journey ended',text:'Your journey ended before you reached Novgorod. You carry on from where you are.',terminal:true,choices:[],transitions:[]},
      remote:{name:'Another course',text:'You left Pereslavl, so this story ends here. Your earlier choices remain.',terminal:true,choices:[],transitions:[]},
      interrupted:{name:'The personal opening ended',text:'Death or succession ended Alexander’s unfinished opening. The next generation makes its own decisions.',terminal:true,choices:[],transitions:[]}
    }
  }
};

FBDATA.openingProfiles_alexander_1241 = {
  opening_alexander_1241:{id:'opening_alexander_1241',type:'opening_profile',
    title:'Alexander’s first goals',intro:'Three aims for your first months at Pereslavl, while Novgorod decides whether to send for you.',
    scenarioIds:['alexander_1241'],provinceIds:['rostov'],requires:['alexander_household_1241'],
    goals:[
      {id:'household_review',name:'Consider the household',text:'Done when you take stock of the household or put the present home first.',criterion:{kind:'story_choice',storyId:'alexander_household_1241',choiceIds:['take_stock','keep_home']}},
      {id:'family_review',name:'Keep your family in view',text:'Done when you decide how to treat your kin in their separate homes.',criterion:{kind:'story_choice',storyId:'alexander_household_1241',choiceIds:['consider_kin','leave_kin_plans']}},
      {id:'own_course',name:'Settle your answer to Novgorod',text:'Done when you stay at Pereslavl, refuse the request, let it lapse or reach Novgorod as a visitor.',criterion:{kind:'household_phase',storyId:'alexander_household_1241',phases:['stayed','refused','expired','visited']}}
    ],contacts:[
      {id:'mother',label:'Feodosia',text:'Your mother, who lives with you at Pereslavl.',linkKind:'kin',required:true,person:{source:'royal_member',realmId:'vladimir_1241',memberId:'feodosia'}},
      {id:'wife',label:'Your wife',text:'Your wife, the daughter of Bryachislav, who lives with you at Pereslavl.',linkKind:'kin',required:true,person:{source:'royal_member',realmId:'vladimir_1241',memberId:'alexander_wife'}},
      {id:'father',label:'Yaroslav',text:'Your father, who rules as grand prince from Vladimir.',linkKind:'kin',required:true,person:{source:'realm_ruler',realmId:'vladimir_1241'}},
      {id:'brother',label:'Andrei',text:'Your younger brother, who keeps his own home.',linkKind:'kin',required:true,person:{source:'royal_member',realmId:'vladimir_1241',memberId:'andrei'}}
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
});
