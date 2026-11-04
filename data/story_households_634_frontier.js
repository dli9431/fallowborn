FB.bookmarkSources.stage({"source":"data/story_households_634_frontier.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Civilian livelihood and local observation use only ordinary saved facts. */
FBDATA.householdTracks_634_frontier = {
  frontier_household_track_634:{ id:'frontier_household_track_634', type:'household_track',
    title:'Independent Work in Damascus',
    intro:'A settled Christian Arab household considers its livelihood and regional connections. Local authority follows actual play; independent work remains a complete choice.',
    homeProvinceId:'damascus', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'opening',
    requirements:{ provinces:['damascus'] },
    stages:{
      opening:{ name:'A household at the frontier',
        text:'Your fictional household lives in Damascus, with connections to communities south of the city. This selected Christian Arab perspective represents neither every local family nor a royal following. Kin and Station & home show the family and means you actually have.',
        choices:[
          {id:'connections_first',label:'Review the household connections',detail:'Consider ordinary local work and regional ties without a summons or payment.',operation:{kind:'record_decision'},next:'livelihood'},
          {id:'work_first',label:'Put local work first',detail:'Consider your civilian livelihood without changing your focus yet.',operation:{kind:'record_decision'},next:'livelihood'}
        ], transitions:[] },
      livelihood:{ name:'Independent civilian work',
        text:'Ordinary craft work can support the household. You have no military appointment or public-service entitlement. Selecting a focus promises no special customer or payment.',
        choices:[
          {id:'craft',label:'Take up ordinary craft work',detail:'Select craft work. Only actual positive work income advances the working stage.',operation:{kind:'set_focus',focusId:'craft_work'},next:'earned'},
          {id:'decline',label:'Keep the present livelihood',detail:'Continue without changing focus, earning money or owing a debt.',operation:{kind:'record_decision'},next:'connections'}
        ], transitions:[] },
      earned:{ name:'Work and its earnings',
        text:'The ordinary economy determines craft income. Selecting work alone has paid nothing. You may reconsider before any work pays.',
        afterWork:{focusId:'craft_work',provinceId:'damascus',next:'connections'},
        choices:[{id:'reconsider',label:'Consider the household connections',detail:'Continue without claiming paid work or changing your resources.',operation:{kind:'record_decision'},next:'connections'}], transitions:[] },
      connections:{ name:'Connections and current authority',
        text:'Regional connections create no enlistment or funded service agreement. Land shows current local authority; Station & home shows existing obligations. Review only what the present records establish.',
        choices:[
          {id:'local_pressure',label:'Review the current war context',detail:'A war involving the current local sovereign establishes no personal loss or service.',when:{kind:'at_war',provinceId:'damascus'},operation:{kind:'record_decision'},next:'pressure'},
          {id:'changed_control',label:'Review the change of authority',detail:'Consider an actual change since this household began observing local rule. This costs nothing.',when:{kind:'control_changed',stageId:'control'},operation:{kind:'record_decision'},next:'control'},
          {id:'independent',label:'Keep independent household work',detail:'Continue to your household outlook without an employment promise or payment.',operation:{kind:'record_decision'},next:'outlook'}
        ], transitions:[] },
      pressure:{ name:'The present war context',
        text:'The current local sovereign is involved in a war. This fact alone establishes no siege, requisition, damage, personal combat or communal response. Ordinary work remains a household choice.',
        choices:[
          {id:'review_control',label:'Review changed local authority',detail:'Consider an actual unreviewed change of rule without changing obligations.',when:{kind:'control_changed',stageId:'control'},operation:{kind:'record_decision'},next:'control'},
          {id:'continue_work',label:'Continue the household plans',detail:'Record this costless review and consider independent work.',operation:{kind:'record_decision'},next:'outlook'}
        ], transitions:[{when:{not:{kind:'at_war',provinceId:'damascus'}},next:'outlook'}] },
      control:{ name:'A change of local rule',
        text:'Local sovereignty has changed since your household began observing it. Consult Land for current authority and Station & home for recorded obligations. This observation establishes no exact tax, reward, protection, conversion or family move.',
        incident:{source:'control',provinceId:'damascus',milestone:'rule_changed'},afterIncident:'outlook',
        choices:[
          {id:'acknowledge',label:'Review the present authority',detail:'Acknowledge this occurrence once, without payment or a change of identity.',operation:{kind:'record_decision'},next:'outlook'},
          {id:'keep_work',label:'Continue the livelihood',detail:'Close this observation at no cost. Existing obligations remain in force.',operation:{kind:'record_decision'},next:'outlook'}
        ], transitions:[] },
      outlook:{ name:'A livelihood here',
        text:'You can continue independent civilian work in Damascus whatever course the courts take. Declining work or seeing no change of rule still permits a complete household plan.',
        choices:[
          {id:'stay',label:'Conclude the opening plan here',detail:'Finish at home now, at no cost and without waiting for earnings or conquest.',operation:{kind:'record_decision'},next:'close'},
          {id:'choose_work',label:'Reconsider ordinary craft work',detail:'Select the ordinary craft focus and keep this outlook open. Selection pays nothing.',operation:{kind:'set_focus',focusId:'craft_work'},next:'outlook'}
        ], transitions:[] },
      close:{ name:'Independent life continues',text:'The opening household plan has concluded at home. Ordinary livelihood and family decisions continue. This conclusion requires neither conquest nor paid service.',terminal:true,choices:[],transitions:[] },
      left:{ name:'The local plan ended',text:'The protagonist left this local plan through ordinary play. This records no arrival, reward or family relocation.',terminal:true,choices:[],transitions:[] },
      interrupted:{ name:'The personal plan ended',text:'Death or succession ended this protagonist’s unfinished plan. No successor inherits a service commitment or unearned wage.',terminal:true,choices:[],transitions:[] }
    }
  }
};
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  var unit = source.input.starts.find(function (row) { return row.definition.id === 'frontier_household_634'; });
  if (!unit) return;
  try {
    var def = FBDATA.householdTracks_634_frontier.frontier_household_track_634;
    var local = {all:[{kind:'home',provinceId:'damascus'},{kind:'present',provinceId:'damascus'}]};
    var unchangedSeason = {all:[{kind:'elapsed',minDays:90,sinceCampaign:true},{not:{kind:'control_changed',stageId:'control'}}]};
    ['opening','livelihood','earned','connections','pressure','control','outlook'].forEach(function (id) {
      var stage = def.stages[id];
      stage.transitions = [
        {when:{kind:'travelling'},next:'left'},
        {when:{not:local},next:'left'},
        {when:unchangedSeason,next:id === 'outlook' ? 'close' : 'outlook'}
      ].concat(stage.transitions);
    });
    unit.storyAfter = FB.bookmarkCompositions.captureStories('autumn_634','frontier',FBDATA.householdTracks_634_frontier);
    unit.storyInstances = JSON.parse(JSON.stringify(FBDATA.householdTracks_634_frontier));
  } catch (error) { unit.faults = ['data/story_households_634_frontier.js: ' + error.message]; }
})();
});
