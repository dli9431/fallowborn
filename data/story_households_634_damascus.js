FB.bookmarkSources.stage({"source":"data/story_households_634_damascus.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Ordinary work and costless plans; no scripted conquest or public payment. */
FBDATA.householdTracks_634_damascus = {
  damascus_household_track_634:{ id:'damascus_household_track_634', type:'household_track',
    title:'A living in Damascus',
    intro:'A craft household weighs its work, recorded obligations and future in Damascus.',
    homeProvinceId:'damascus', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['damascus'] },
    stages:{
      household:{ name:'Household and stores',
        text:'Begin with the people and resources you actually have. Kin lists your family; Station & home records your private purse and property. Damascus is your home. Your lay household makes no claim to speak for every local community.',
        choices:[{ id:'take_stock', label:'Take stock of the household', detail:'Continue after consulting the present household records. This decision buys no stores and grants no money.', operation:{kind:'record_decision'}, next:'crafting' }], transitions:[] },
      crafting:{ name:'Work in the district',
        text:'The household can earn its living through ordinary craft work. Selecting work begins no special contract and promises no payment from a court.',
        choices:[
          { id:'work_bench', label:'Work the bench', detail:'Select ordinary craft work. Only actual paid work advances the working stage.', operation:{kind:'set_focus',focusId:'craft_work'}, next:'working' },
          { id:'defer_work', label:'Leave work for later', detail:'Keep your current focus and continue without claiming earnings.', operation:{kind:'record_decision'}, next:'obligations' }
        ], transitions:[] },
      working:{ name:'The daily work', text:'The ordinary work focus determines income. Choosing it alone has earned nothing.',
        afterWork:{focusId:'craft_work',provinceId:'damascus',next:'obligations'},
        choices:[{ id:'reconsider', label:'Consider other household matters', detail:'Continue without claiming that the work has paid.', operation:{kind:'record_decision'}, next:'obligations' }], transitions:[] },
      obligations:{ name:'What the records say',
        text:'Consult Station & home for your present status, property and any recorded obligations, and Land for current local authority. Your community identity alone establishes no exact tax, exemption or service owed. This review changes none of those records.',
        choices:[{ id:'review_records', label:'Continue from the current records', detail:'Record a costless review. Existing obligations remain in force; no payment or protection is created.', operation:{kind:'record_decision'}, next:'local_life' }], transitions:[] },
      local_life:{ name:'Local authority and work',
        text:'The local authority notice in Deeds reports an actual change of rule here, if one has been observed. A war alone establishes no local damage, requisition or payment. If there is no notice, continue ordinary craft work.',
        choices:[
          { id:'continue_work', label:'Continue ordinary craft work', detail:'Select the usual work focus, with income governed by ordinary play.', operation:{kind:'set_focus',focusId:'craft_work'}, next:'horizon' },
          { id:'review_notice', label:'Review the local authority notice', detail:'Acknowledge the local report without payment or action days. Keep the current work focus and existing obligations.', operation:{kind:'record_decision'}, next:'horizon' },
          { id:'keep_plans', label:'Keep the present plans', detail:'Continue without changing your focus or resources.', operation:{kind:'record_decision'}, next:'horizon' }
        ], transitions:[] },
      horizon:{ name:'Stay or consider the road',
        text:'Remaining here needs no journey payment. If you want a personal journey, use the ordinary journey controls to inspect currently eligible destinations, routes and prices. Only the protagonist travels; the family remains at home. No destination or passage is promised by this plan.',
        choices:[
          { id:'stay', label:'Keep the household here', detail:'Review the present livelihood at home without spending money.', operation:{kind:'record_decision'}, next:'livelihood' },
          { id:'consider_journey', label:'Leave a personal journey open', detail:'Keep the plan open while inspecting ordinary journey controls separately. This choice starts no journey and charges nothing.', operation:{kind:'record_decision'}, next:'roads' }
        ], transitions:[] },
      roads:{ name:'A personal decision',
        text:'The ordinary journey controls decide whether a personal trip is available and affordable. You can remain here instead. Choosing to consider travel has moved nobody.',
        choices:[{ id:'remain', label:'Remain in the district', detail:'Continue to the household livelihood review without leaving.', operation:{kind:'record_decision'}, next:'livelihood' }], transitions:[] },
      livelihood:{ name:'A livelihood at home',
        text:'Review the private purse, household and current work focus as they stand now. Plans alone have supplied no earnings, protection or new property. The household can continue crafting here whatever course the courts take.',
        choices:[{ id:'continue_life', label:'Continue life here', detail:'Conclude the opening plan at home. Ordinary work, worship and household choices remain yours.', operation:{kind:'record_decision'}, next:'stayed' }], transitions:[] },
      stayed:{ name:'Life in the district continues', text:'You concluded this opening plan at home. The household continues through ordinary play, without requiring any conquest or conversion.', terminal:true, choices:[], transitions:[] },
      personal_journey:{ name:'A personal journey begun', text:'An ordinary personal journey took the protagonist away from this local plan. Journey controls govern travel and return. This conclusion records neither arrival nor a household move.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'A different course', text:'The protagonist is no longer pursuing this plan at home. Ordinary play determines residence and livelihood; this story certifies no journey arrival or family relocation.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The personal plan ended', text:'Death or succession ended this protagonist’s unfinished plan. The next generation makes its own decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};
FBDATA.openingProfiles_634_damascus = {
  opening_damascus_634:{ id:'opening_damascus_634', type:'opening_profile',
    title:'The Household’s First Goals', intro:'Optional goals observe ordinary earnings, savings and a decision to stay. They grant no reward.',
    scenarioIds:['damascus_household_634'], provinceIds:['damascus'], requires:['damascus_household_track_634'],
    goals:[
      {id:'craft_income',name:'Earn {money:5} through craft work',text:'Earn {money:5} through actual ordinary craft work after the opening.',criterion:{kind:'earnings',amount:5,focusIds:['craft_work']}},
      {id:'household_reserve',name:'Keep a household reserve',text:'Hold {money:25} in the private purse as a free household.',criterion:{kind:'reserve',amount:25}},
      {id:'home_decision',name:'Continue life at home',text:'Conclude the opening livelihood plan in Damascus.',criterion:{kind:'household_phase',storyId:'damascus_household_track_634',phases:['stayed']}}
    ], contacts:[] }
};
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  // World notices remain independent of the optional personal start. Reuse the
  // graph's extracted display sources so both surfaces share English aliases.
  var graph = FBDATA.householdTracks_634_damascus.damascus_household_track_634;
  var scene = graph.stages.local_life;
  source.input.catalogs.storyInstances = source.input.catalogs.storyInstances || {};
  source.input.catalogs.storyInstances.damascus_household_observer_634 = {
    id:'damascus_household_observer_634', type:'household_observer',
    title:scene.name, intro:scene.text, source:{type:'local_control'},
    provinceIds:['damascus'], expiryTurns:30, requirements:{provinces:['damascus']},
    beats:[{id:'authority_changed',trigger:'rule_changed',reach:'local',
      name:scene.name,text:scene.text,
      choices:[{id:'review_records',label:scene.choices[1].label,
        detail:scene.choices[1].detail,
        operation:'continue_livelihood'}]}]
  };
  source.input.bookmark.stories.push('damascus_household_observer_634');
  var unit = source.input.starts.find(function (row) { return row.definition.id === 'damascus_household_634'; });
  if (!unit) return;
  try {
    var def = FBDATA.householdTracks_634_damascus.damascus_household_track_634;
    var local = {all:[{kind:'home',provinceId:'damascus'},{kind:'present',provinceId:'damascus'}]};
    ['household','crafting','working','obligations','local_life','horizon','roads','livelihood'].forEach(function (id) {
      def.stages[id].transitions = [
        {when:{kind:'travelling'},next:'personal_journey'},
        {when:{not:local},next:'remote'}
      ];
    });
    var declarations = Object.assign({},FBDATA.householdTracks_634_damascus,FBDATA.openingProfiles_634_damascus);
    unit.storyAfter = FB.bookmarkCompositions.captureStories('autumn_634','damascus',declarations);
    unit.storyInstances = JSON.parse(JSON.stringify(declarations));
  } catch (error) { unit.faults = ['data/story_households_634_damascus.js: ' + error.message]; }
})();
});
