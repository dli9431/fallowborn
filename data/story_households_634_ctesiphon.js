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
        text:'Begin with the people and resources you actually have. Kin lists your family; Station & home records your plot and private purse. The map district represents the countryside around ancient Ctesiphon on the Tigris, south of the later city of Baghdad. Your plot is private household property; living in this district gives you no share of the royal treasury.',
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
        text:'Consult Station & home for your present status, property and any recorded obligations, and Land for current local authority. Private property, obligations to a magnate and public demands are separate matters. Consult the actual records for any obligation and its recipient; this plan invents no landlord, assessment or provincial demand. East Syriac identity alone establishes no tax exemption, service owed or Latin monastic vocation. This review changes none of those records.',
        choices:[{ id:'review_records', label:'Continue from the current records', detail:'Record a costless review. Existing obligations remain in force; no payment or protection is created.', operation:{kind:'record_decision'}, next:'local_life' }], transitions:[] },
      local_life:{ name:'Life around the fields',
        text:'The local authority notice in Deeds reports an observed change of sovereign in this district. County control does not establish an army entering ancient Ctesiphon or damage to your fields. A war alone proves no requisition or payment. Existing property and obligations keep their ordinary rules; fieldwork remains a choice.',
        choices:[
          { id:'war_context', label:'Consider the current war context', detail:'Review only an actual war involving the current local sovereign. This spends nothing and establishes no household loss or demand.', when:{kind:'at_war',provinceId:'baghdad'}, operation:{kind:'record_decision'}, next:'pressure' },
          { id:'review_notice', label:'Consult the local authority notice', detail:'Review an observed district transfer through its separate notice confirmation in Deeds. No payment, new obligation or public right is created.', operation:{kind:'record_decision'}, next:'horizon' },
          { id:'continue_work', label:'Continue ordinary fieldwork', detail:'Select the usual work focus, with income governed by ordinary play.', operation:{kind:'set_focus',focusId:'work_land'}, next:'horizon' },
          { id:'keep_plans', label:'Keep the present plans', detail:'Continue without changing your focus or resources.', operation:{kind:'record_decision'}, next:'horizon' }
        ], transitions:[] },
      pressure:{ name:'The courts at war',
        text:'The current local sovereign is involved in a war. This says nothing about a siege of Ctesiphon, a levy on your household, lost crops or a change of faith. Court receipts belong to their public account, not your private purse. Review actual local notices separately and continue the household plans.',
        choices:[{id:'resume_plans',label:'Continue the household plans',detail:'Return to the decision to stay or consider a personal journey, without payment or a service commitment.',operation:{kind:'record_decision'},next:'horizon'}], transitions:[] },
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
  // County authority is observed independently of any campaign or personal plan.
  var scene = FBDATA.householdTracks_634_ctesiphon.ctesiphon_household_track_634.stages.local_life;
  source.input.catalogs.storyInstances = source.input.catalogs.storyInstances || {};
  source.input.catalogs.storyInstances.ctesiphon_household_observer_634 = {
    id:'ctesiphon_household_observer_634', type:'household_observer',
    title:scene.name, intro:scene.text, source:{type:'local_control'},
    provinceIds:['baghdad'], expiryTurns:30, requirements:{provinces:['baghdad']},
    beats:[{id:'authority_changed',trigger:'rule_changed',reach:'local',
      name:scene.name,text:scene.text,
      choices:[{id:'review_records',label:scene.choices[1].label,
        detail:scene.choices[1].detail,
        operation:'review_records'}]}]
  };
  source.input.bookmark.stories.push('ctesiphon_household_observer_634');
  var unit = source.input.starts.find(function (row) { return row.definition.id === 'ctesiphon_household_634'; });
  if (!unit) return;
  try {
    var def = FBDATA.householdTracks_634_ctesiphon.ctesiphon_household_track_634;
    var local = {all:[{kind:'home',provinceId:'baghdad'},{kind:'present',provinceId:'baghdad'}]};
    ['household','farming','working','obligations','local_life','pressure','horizon','roads','livelihood'].forEach(function (id) {
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
