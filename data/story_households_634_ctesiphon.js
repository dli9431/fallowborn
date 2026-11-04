FB.bookmarkSources.stage({"source":"data/story_households_634_ctesiphon.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Ordinary work and costless plans; no scripted conquest or public payment. */
FBDATA.householdTracks_634_ctesiphon = {
  ctesiphon_household_track_634:{ id:'ctesiphon_household_track_634', type:'household_track',
    title:'A Living near Ctesiphon',
    intro:'A farming household weighs its work, recorded obligations and future in the Ctesiphon district.',
    homeProvinceId:'baghdad', continuity:'protagonist', interruptedStage:'interrupted', initialStage:'household',
    requirements:{ provinces:['baghdad'] },
    stages:{
      household:{ name:'Household and stores',
        text:'Begin with the people and resources you actually have. Kin lists your family; Station & home records your plot and private purse. The Ctesiphon district is your home, without any claim that the royal household lives beside you.',
        choices:[{ id:'take_stock', label:'Take stock of the household', detail:'Continue after consulting the present household records. This decision buys no stores and grants no money.', operation:{kind:'record_decision'}, next:'farming' }], transitions:[] },
      farming:{ name:'Work in the district',
        text:'The household can earn its living through ordinary fieldwork. Selecting work begins no special contract and promises no payment from a court.',
        choices:[
          { id:'work_fields', label:'Work the fields', detail:'Select ordinary fieldwork. Only actual paid work advances the working stage.', operation:{kind:'set_focus',focusId:'work_land'}, next:'working' },
          { id:'defer_work', label:'Leave work for later', detail:'Keep your current focus and continue without claiming earnings.', operation:{kind:'record_decision'}, next:'obligations' }
        ], transitions:[] },
      working:{ name:'The daily work', text:'The ordinary work focus determines income. Choosing it alone has earned nothing.',
        afterWork:{focusId:'work_land',provinceId:'baghdad',next:'obligations'},
        choices:[{ id:'reconsider', label:'Consider other household matters', detail:'Continue without claiming that the work has paid.', operation:{kind:'record_decision'}, next:'obligations' }], transitions:[] },
      obligations:{ name:'What the records say',
        text:'Consult Station & home for your present status, property and any recorded obligations, and Land for current local authority. Your community identity alone establishes no exact tax, exemption or service owed. This review changes none of those records.',
        choices:[{ id:'review_records', label:'Continue from the current records', detail:'Record a costless review. Existing obligations remain in force; no payment or protection is created.', operation:{kind:'record_decision'}, next:'local_life' }], transitions:[] },
      local_life:{ name:'Life around the fields',
        text:'Local authority and household circumstances can change during play. Consult the current records for any actual change. A war elsewhere is no evidence of a local requisition, damage or payment. You can continue the ordinary livelihood here.',
        choices:[
          { id:'continue_work', label:'Continue ordinary fieldwork', detail:'Select the usual work focus, with income governed by ordinary play.', operation:{kind:'set_focus',focusId:'work_land'}, next:'horizon' },
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
        text:'Review the private purse, household and current work focus as they stand now. Plans alone have supplied no earnings, protection or new property. The household can continue farming here whatever course the courts take.',
        choices:[{ id:'continue_life', label:'Continue life here', detail:'Conclude the opening plan at home. Ordinary work, worship and household choices remain yours.', operation:{kind:'record_decision'}, next:'stayed' }], transitions:[] },
      stayed:{ name:'Life in the district continues', text:'You concluded this opening plan at home. The household continues through ordinary play, without requiring any conquest or conversion.', terminal:true, choices:[], transitions:[] },
      personal_journey:{ name:'A personal journey begun', text:'An ordinary personal journey took the protagonist away from this local plan. Journey controls govern travel and return. This conclusion records neither arrival nor a household move.', terminal:true, choices:[], transitions:[] },
      remote:{ name:'A different course', text:'The protagonist is no longer pursuing this plan at home. Ordinary play determines residence and livelihood; this story certifies no journey arrival or family relocation.', terminal:true, choices:[], transitions:[] },
      interrupted:{ name:'The personal plan ended', text:'Death or succession ended this protagonist’s unfinished plan. The next generation makes its own decisions.', terminal:true, choices:[], transitions:[] }
    }
  }
};
FBDATA.openingProfiles_634_ctesiphon = {
  opening_ctesiphon_634:{ id:'opening_ctesiphon_634', type:'opening_profile',
    title:'The Household’s First Goals', intro:'Optional goals observe ordinary earnings, savings and a decision to stay. They grant no reward.',
    scenarioIds:['ctesiphon_household_634'], provinceIds:['baghdad'], requires:['ctesiphon_household_track_634'],
    goals:[
      {id:'field_income',name:'Earn {money:5} through fieldwork',text:'Earn {money:5} through actual ordinary fieldwork after the opening.',criterion:{kind:'earnings',amount:5,focusIds:['work_land']}},
      {id:'household_reserve',name:'Keep a household reserve',text:'Hold {money:25} in the private purse as a free household.',criterion:{kind:'reserve',amount:25}},
      {id:'home_decision',name:'Continue life at home',text:'Conclude the opening livelihood plan in the Ctesiphon district.',criterion:{kind:'household_phase',storyId:'ctesiphon_household_track_634',phases:['stayed']}}
    ], contacts:[] }
};
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  var unit = source.input.starts.find(function (row) { return row.definition.id === 'ctesiphon_household_634'; });
  if (!unit) return;
  try {
    var def = FBDATA.householdTracks_634_ctesiphon.ctesiphon_household_track_634;
    var local = {all:[{kind:'home',provinceId:'baghdad'},{kind:'present',provinceId:'baghdad'}]};
    ['household','farming','working','obligations','local_life','horizon','roads','livelihood'].forEach(function (id) {
      def.stages[id].transitions = [
        {when:{kind:'travelling'},next:'personal_journey'},
        {when:{not:local},next:'remote'}
      ];
    });
    var declarations = Object.assign({},FBDATA.householdTracks_634_ctesiphon,FBDATA.openingProfiles_634_ctesiphon);
    unit.storyAfter = FB.bookmarkCompositions.captureStories('autumn_634','ctesiphon',declarations);
    unit.storyInstances = JSON.parse(JSON.stringify(declarations));
  } catch (error) { unit.faults = ['data/story_households_634_ctesiphon.js: ' + error.message]; }
})();
});
