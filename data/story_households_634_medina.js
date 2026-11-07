FB.bookmarkSources.stage({"source":"data/story_households_634_medina.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* A stationary household graph on the ordinary work and action-day owners. */
FBDATA.householdTracks_634_medina = {
  medina_household_track_634:{id:'medina_household_track_634',type:'household_track',
    title:'A Living in Medina',
    intro:'Ordinary farming, household accounts and devotion leave room for choices at home.',
    homeProvinceId:'medina',continuity:'protagonist',interruptedStage:'interrupted',initialStage:'household',
    requirements:{provinces:['medina'],realms:['rashidun_634']},
    stages:{
      household:{name:'A household after the accession',
        text:'At the opening of this story, Umar had succeeded Abu Bakr. That completed succession is background to your household, not a vote or appointment for you. Your family has its own livelihood to consider.',
        choices:[
          {id:'consider_home',label:'Consider the household’s place',detail:'Continue with ordinary livelihood choices, without entering public service.',operation:{kind:'record_decision'},next:'livelihood'},
          {id:'review_court',label:'Review court and community',detail:'Consider the current public records before returning to the household livelihood. No cost or public appointment.',operation:{kind:'record_decision'},next:'court_context'},
          {id:'close_opening',label:'Carry on independently',detail:'Review how to close this opening and continue ordinary play.',operation:{kind:'record_decision'},next:'continuation'}
        ],transitions:[]},
      court_context:{name:'The court and the household',
        text:'The accession at the opening is past context. Consult the current court and Land records for the living ruler and present authority; this review does not reenact a succession. Your private purse and holding are separate from the court treasury, public revenue and military command. Sharing the court’s faith gives this household no public powers.',
        choices:[{id:'review_current_authority',label:'Continue from the public records',detail:'Record a costless review without voting, making an oath, joining service or receiving a stipend.',operation:{kind:'record_decision'},next:'community'}],transitions:[]},
      community:{name:'Neighbours and local life',
        text:'Your household belongs to the Arabic-speaking early Islamic community represented here. The district also includes other resident communities; its game shares are simulation settings, not a census or proof of common obligations. Use Kin for your own family and the current local records for authority. An observed change of sovereign can appear separately as a local notice in Deeds.',
        choices:[{id:'consider_notice',label:'Consider the local authority notice',detail:'Review how local authority is reported, without a payment or action day.',operation:{kind:'record_decision'},next:'local_authority'},
          {id:'continue_local_life',label:'Return to the household livelihood',detail:'Keep the household at home, without converting neighbours, claiming protection or acquiring a religious office.',operation:{kind:'record_decision'},next:'livelihood'}],transitions:[]},
      local_authority:{name:'Local authority in Medina',
        text:'The local authority notice in Deeds reports an observed change of sovereign in the Medina district, if one has occurred since the opening. Consult Land and the current court records for authority. The report establishes no battle, household loss, new tax, protection or service obligation. Without a notice, ordinary household life continues.',
        choices:[{id:'review_local_records',label:'Review the local records',detail:'Acknowledge the report without spending money or an action day. Continue the ordinary household livelihood.',operation:{kind:'record_decision'},next:'livelihood'}],transitions:[]},
      livelihood:{name:'Choosing the day’s livelihood',
        text:'Farming is an ordinary way to support this fictional household. Review work on the land, or retain your present activity. Selecting work brings no immediate payment.',
        choices:[
          {id:'work_land',label:'Work the land',detail:'Select ordinary farming. Only actual paid work can complete the optional wait that follows.',operation:{kind:'set_focus',focusId:'work_land'},next:'working'},
          {id:'decline_work',label:'Keep the present activity',detail:'Continue to household accounts without claiming any farming income.',operation:{kind:'record_decision'},next:'accounts'}
        ],transitions:[]},
      working:{name:'Work before returns',
        text:'You have selected farming. Ordinary work must actually pay here before this optional wait can count it. You can also continue without claiming earnings.',
        afterWork:{focusId:'work_land',provinceId:'medina',next:'accounts'},
        choices:[{id:'skip_wait',label:'Leave the optional wait',detail:'Review household accounts without claiming that work paid.',operation:{kind:'record_decision'},next:'accounts'}],transitions:[]},
      accounts:{name:'The household account',
        text:'Review the private purse, upkeep and property in Station & home. You may spend {money:2} on provisions consumed by the household, or keep the purse unchanged. This buys no property or income bonus; an intention alone reserves nothing.',
        choices:[
          {id:'preserve_savings',label:'Intend to preserve savings',detail:'Record an intention without setting money aside.',operation:{kind:'record_decision'},next:'holding'},
          {id:'buy_provisions',label:'Buy household provisions',detail:'Spend {money:2} once on provisions for present needs. No action day, property or income bonus.',operation:{kind:'household_expense',amount:2},next:'holding'},
          {id:'household_needs',label:'Consider household needs',detail:'Record attention to family needs without spending anything.',operation:{kind:'record_decision'},next:'holding'}
        ],transitions:[]},
      holding:{name:'Time for the holding',
        text:'You could devote an action day to attending to the small holding. This general attention promises no harvest, pollination, water rights or extra land.',
        choices:[
          {id:'attend_holding',label:'Spend a day at the holding',detail:'Use one free action day. This unpaid attention replaces Daily Focus income for that day and grants no property or yield.',operation:{kind:'spend_day'},next:'devotion'},
          {id:'keep_day',label:'Keep the day for ordinary play',detail:'Continue without consuming a day or claiming work.',operation:{kind:'record_decision'},next:'devotion'}
        ],transitions:[]},
      devotion:{name:'Livelihood and devotion',
        text:'For this household, work and devotion can sit alongside family affairs. This reflection speaks only for your own intention; it appoints no officiant and assumes nothing about other residents.',
        choices:[
          {id:'reflect',label:'Reflect on work and devotion',detail:'Record a personal intention without a piety award or religious rank.',operation:{kind:'record_decision'},next:'limits'},
          {id:'family_affairs',label:'Attend to family affairs',detail:'Continue without an obligation to attend a service.',operation:{kind:'record_decision'},next:'limits'}
        ],transitions:[]},
      limits:{name:'What belongs to this household',
        text:'Your household pursues its own livelihood. You may review ordinary obligations in the game screens before continuing here. This story grants no public office, army, exemption, oath or stipend.',
        choices:[
          {id:'independent_livelihood',label:'Continue the independent livelihood',detail:'Proceed to the closing household decision.',operation:{kind:'record_decision'},next:'continuation'},
          {id:'review_obligations',label:'Record an intention to review obligations',detail:'Continue here after any manual review of ordinary obligations. Record an intention without changing those obligations.',operation:{kind:'record_decision'},next:'continuation'}
        ],transitions:[]},
      continuation:{name:'A home that carries on',
        text:'Life at home can continue whatever distant courts do. Decide whether farming remains your intention or leave the future livelihood open. Neither choice locks your profession or promises a conquest.',
        choices:[
          {id:'continue_farming',label:'Keep farming as an intention',detail:'Close the opening at home; ordinary work and future choices remain yours.',operation:{kind:'record_decision'},next:'farming'},
          {id:'leave_future_open',label:'Leave the future livelihood open',detail:'Close the opening at home without committing to a profession.',operation:{kind:'record_decision'},next:'open_future'}
        ],transitions:[]},
      farming:{name:'Farming as an intention',text:'You closed the opening at home with farming in mind. Ordinary play determines the household’s livelihood from here.',terminal:true,choices:[],transitions:[]},
      open_future:{name:'The future left open',text:'You closed the opening at home without settling the household’s future livelihood. Its next choices remain yours.',terminal:true,choices:[],transitions:[]},
      remote:{name:'Beyond this local opening',text:'The protagonist departed from this local household opening. No relative’s relocation or safety is implied. Ordinary travel and residence still govern your whereabouts.',terminal:true,choices:[],transitions:[]},
      changed_identity:{name:'A different personal course',text:'Your personal identity has changed. This opening’s reflection ends without assigning you its former commitments. Household life continues through ordinary play.',terminal:true,choices:[],transitions:[]},
      changed_rule:{name:'Changed local rule',text:'The local sovereign has changed since the opening setting. The household’s local opening ends without claiming a battle, harm, welcome or a new entitlement.',terminal:true,choices:[],transitions:[]},
      interrupted:{name:'The personal opening ended',text:'Death or succession ended this protagonist’s unfinished opening. The next generation makes its own decisions.',terminal:true,choices:[],transitions:[]}
    }
  }
};
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  // The notice observes later county sovereignty, independently of the personal graph.
  var scene = FBDATA.householdTracks_634_medina.medina_household_track_634.stages.local_authority;
  source.input.catalogs.storyInstances = source.input.catalogs.storyInstances || {};
  source.input.catalogs.storyInstances.medina_household_observer_634 = {
    id:'medina_household_observer_634',type:'household_observer',
    title:scene.name,intro:scene.text,
    source:{type:'local_control'},provinceIds:['medina'],expiryTurns:30,
    requirements:{provinces:['medina']},
    beats:[{id:'authority_changed',trigger:'rule_changed',reach:'local',
      name:scene.name,text:scene.text,
      choices:[{id:'review_records',label:scene.choices[0].label,
        detail:scene.choices[0].detail,
        operation:'continue_livelihood'}]}]
  };
  source.input.bookmark.stories.push('medina_household_observer_634');
  var unit = source.input.starts.find(function (row) { return row.definition.id === 'medina_household_634'; });
  if (!unit) return;
  try {
    var def = FBDATA.householdTracks_634_medina.medina_household_track_634;
    var local = {all:[{kind:'home',provinceId:'medina'},{kind:'present',provinceId:'medina'},{not:{kind:'travelling'}}]};
    ['household','court_context','community','local_authority','livelihood','working','accounts','holding','devotion','limits','continuation'].forEach(function (id) {
      def.stages[id].transitions = [
        {when:{not:local},next:'remote'},
        {when:{not:{kind:'sovereign',provinceId:'medina',realmId:'rashidun_634'}},next:'changed_rule'},
        {when:{not:{kind:'identity',cultureId:'arabic',faithId:'early_islam_634'}},next:'changed_identity'}
      ];
    });
    unit.storyAfter = FB.bookmarkCompositions.captureStories('autumn_634','medina',FBDATA.householdTracks_634_medina);
    unit.storyInstances = JSON.parse(JSON.stringify(FBDATA.householdTracks_634_medina));
  } catch (error) { unit.faults = ['data/story_households_634_medina.js: ' + error.message]; }
})();
});
