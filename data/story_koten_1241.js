FB.bookmarkSources.stage({"source":"data/story_koten_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal records do not exercise the following's public mandate. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_koten_1241 = {
  koten_safety_1241:{ id:'koten_safety_1241', type:'household_track',
    title:'Koten: personal choices under guard',
    intro:'You are Koten, khan of the Cumans, held under guard at Obuda while your people are scattered across Hungary. These choices shape your own story; only King Bela’s court can release you.',
    homeProvinceId:'szekesfehervar', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'circumstances',
    requirements:{ provinces:['szekesfehervar'] },
    stages:{
      circumstances:{ name:'Under guard at Obuda', text:'You are held under guard at Obuda, close to King Bela’s court. Your people’s households and fighters are camped elsewhere in Hungary, beyond your reach.',
        choices:[
          { id:'review_position', label:'Take stock of your position', detail:'You turn to what you can still do from Obuda.', operation:{ kind:'record_decision' }, next:'private_needs' },
          { id:'postpone', label:'Put off your plans for now', detail:'You end this review and wait on events.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      private_needs:{ name:'Your own resources', text:'Your own purse is all you can spend here. The stores and fighters of your people belong to them, not to you.',
        choices:[
          { id:'keep_private_resources', label:'Guard your own purse', detail:'You keep your money ready for what may come, and turn next to King Bela’s terms.', operation:{ kind:'record_decision' }, next:'hosting' },
          { id:'leave_plans_open', label:'Leave your plans open', detail:'You end this review without deciding how to use your money.', operation:{ kind:'record_decision' }, next:'deferred' }
        ], transitions:[] },
      hosting:{ name:'King Bela’s terms', text:'King Bela’s court decides how long you stay under guard and how long your people may remain. You can only make your wishes known.',
        choices:[
          { id:'consider_hosting', label:'Keep King Bela’s terms in view', detail:'You weigh the court’s terms and turn next to your scattered people.', operation:{ kind:'record_decision' }, next:'following' },
          { id:'accept_present_position', label:'Accept your place under guard', detail:'You end this review and wait on the king’s decision.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      following:{ name:'Your scattered people', text:'Your people’s camps, herds and fighters are spread across Hungary, each with its own stores. Hungary’s nobles resent them, and you cannot lead them from Obuda.',
        choices:[
          { id:'consider_following', label:'Think of your people’s camps', detail:'You turn to the households that followed you into Hungary.', operation:{ kind:'record_decision' }, next:'onward' },
          { id:'finish_here', label:'Stay with your own affairs', detail:'You end this review and leave the camps to their leaders.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      onward:{ name:'Leaving Obuda', text:'You can leave only once King Bela’s court releases you, and then you must pay for the journey. To lead your people again, you must reach them.',
        choices:[
          { id:'keep_options_open', label:'Keep your way out in mind', detail:'You finish this review, ready to move if you are released.', operation:{ kind:'record_decision' }, next:'reviewed' },
          { id:'remain_here', label:'Stay at Obuda', detail:'You end this review with no plan to leave.', operation:{ kind:'record_decision' }, next:'stayed' }
        ], transitions:[] },
      stayed:{ name:'Staying under King Bela’s terms', text:'Your review is over. Your guard and your people’s camps stay as King Bela’s court arranges them.', terminal:true, choices:[], transitions:[] },
      deferred:{ name:'Plans left for later', text:'You put off your plans. Your guard and your people’s camps stay as they were.', terminal:true, choices:[], transitions:[] },
      reviewed:{ name:'Your wishes are set', text:'Your review is complete. Leaving Obuda or leading your people still needs King Bela’s release and a journey to reach them.', terminal:true, choices:[], transitions:[] },
      elsewhere:{ name:'Away from Obuda', text:'You have left Obuda, so this review has ended. Your people stay where they were camped.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'Koten’s review cut short', text:'Koten’s death or succession ended this review. The next head of the household inherits no release or command from it.', terminal:true, choices:[], transitions:[] }
    }
  }
};
(function () {
  'use strict';
  var d=FBDATA.householdTracks_koten_1241.koten_safety_1241;
  ['circumstances','private_needs','hosting','following','onward'].forEach(function (id) {
    d.stages[id].transitions=[{when:{not:{kind:'present',provinceId:'szekesfehervar'}},next:'elsewhere'}];
  });
  Object.assign(FBDATA.storyInstances,FBDATA.householdTracks_koten_1241);
})();
});
