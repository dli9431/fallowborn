FB.bookmarkSources.stage({source:'data/story_household_effects_634.js',bookmarks:['634'],catalogs:[],shared:[]}, function (FBDATA) {
/* Reports observe ordinary wars and sovereignty; they own no public transaction. */
FBDATA.householdEffects_634 = {
  syrian_households_634:{
    id:'syrian_households_634',type:'household_observer',
    title:'Syrian campaign reports',
    intro:'Local reports help the household review its plans while ordinary work and obligations continue.',
    sourceStoryId:'syrian_front_634',requires:['syrian_front_634'],
    provinceIds:['damascus','homs','hama','aleppo','antioch','jerusalem'],
    requirements:{provinces:['damascus','homs','hama','aleppo','antioch','jerusalem']},expiryTurns:30,
    beats:[
      {id:'started',trigger:'started',reach:'local',name:'A campaign with Damascus as its objective',
        text:'An ordinary war now pursues the Damascus objective. This report concerns the objective district or a force of that war currently in your district. Neither establishes a siege, an attack on your home or a new household obligation.',
        choices:[{id:'records',label:'Review household records',detail:'Compare the report with present authority and recorded obligations. No payment or action days.',operation:'review_records'},
          {id:'continue',label:'Continue the household livelihood',detail:'Acknowledge the report at no cost. Keep the current work focus and household plans.',operation:'continue_livelihood'}]},
      {id:'won',trigger:'won',reach:'previous',name:'The Damascus objective is held',
        text:'The campaign records its objective under the campaigning court. Consult Land for current local rule: this result alone establishes no change elsewhere, household loss, conversion or payment.',
        choices:[{id:'records',label:'Review the current records',detail:'Acknowledge the result once at no cost. Existing rights and obligations retain their ordinary rules.',operation:'review_records'},
          {id:'continue',label:'Continue the household livelihood',detail:'Close this report without changing work, funds or community identity.',operation:'continue_livelihood'}]},
      {id:'failed',trigger:'failed',reach:'previous',name:'The Syrian campaign ended without its objective',
        text:'The campaign ended without securing its objective. This closes the earlier local report; it establishes no casualty, damage or household debt. Ordinary work can continue under the present authority.',
        choices:[{id:'continue',label:'Continue the household livelihood',detail:'Close the report without payment, action days or a change of focus.',operation:'continue_livelihood'}]},
      {id:'diverted',trigger:'diverted',reach:'previous',name:'The Syrian opportunity no longer applies',
        text:'The campaign opportunity no longer matches the current situation. Review present authority rather than relying on the earlier report. Separate household plans and any ordinary war retain their own course.',
        choices:[{id:'records',label:'Review the closure',detail:'Record this closure at no cost. End no separate work, debt or personal commitment.',operation:'review_records'}]},
      {id:'interrupted',trigger:'interrupted',reach:'previous',name:'The Syrian campaign report is interrupted',
        text:'The original campaign can no longer continue under its recorded authority. This ends its report, not necessarily an ordinary war. The household has received no protection, grant or payment from this notice.',
        choices:[{id:'continue',label:'Continue from the present situation',detail:'Close the report at no cost and keep ordinary household choices available.',operation:'continue_livelihood'}]}
    ]
  },
  iraqi_households_634:{
    id:'iraqi_households_634',type:'household_observer',
    title:'Iraqi campaign reports',
    intro:'Local reports follow the independent Iraqi opportunity. The household keeps its own purse, work and plans.',
    sourceStoryId:'iraqi_front_634',requires:['iraqi_front_634'],
    provinceIds:['kufa','basra','baghdad','mosul'],
    requirements:{provinces:['kufa','basra','baghdad','mosul']},expiryTurns:20,
    beats:[
      {id:'started',trigger:'started',reach:'local',name:'A campaign with the lower Iraqi district as its objective',
        text:'An ordinary war now pursues its lower Iraqi objective. This report concerns the objective district or a force of that war currently in your district. It proves no attack on Ctesiphon, requisition, paid work or movement of your family.',
        choices:[{id:'records',label:'Review household records',detail:'Compare the report with present authority and recorded obligations. No payment or action days.',operation:'review_records'},
          {id:'continue',label:'Continue the household livelihood',detail:'Acknowledge the report at no cost. Keep the current work focus and household plans.',operation:'continue_livelihood'}]},
      {id:'won',trigger:'won',reach:'previous',name:'The lower Iraqi objective is held',
        text:'The campaign records its objective under the campaigning court. That district result says nothing by itself about control of Ctesiphon or another town. Consult current local records; no household loss, tax or grant follows from this report.',
        choices:[{id:'records',label:'Review the current records',detail:'Acknowledge the result once at no cost. Existing rights and obligations retain their ordinary rules.',operation:'review_records'},
          {id:'continue',label:'Continue the household livelihood',detail:'Close this report without changing work, funds or community identity.',operation:'continue_livelihood'}]},
      {id:'failed',trigger:'failed',reach:'previous',name:'The Iraqi campaign ended without its objective',
        text:'The campaign ended without securing its objective. This closes the earlier local report and records no victims, refugees, household damage or compensation. The household can continue its ordinary livelihood.',
        choices:[{id:'continue',label:'Continue the household livelihood',detail:'Close the report without payment, action days or a change of focus.',operation:'continue_livelihood'}]},
      {id:'diverted',trigger:'diverted',reach:'previous',name:'The Iraqi opportunity no longer applies',
        text:'The campaign opportunity no longer matches the current situation. Review present local authority. The Syrian opportunity has its own outcome, and separate household obligations remain with their existing records.',
        choices:[{id:'records',label:'Review the closure',detail:'Record this closure at no cost. End no separate work, debt or personal commitment.',operation:'review_records'}]},
      {id:'interrupted',trigger:'interrupted',reach:'previous',name:'The Iraqi campaign report is interrupted',
        text:'The original campaign can no longer continue under its recorded authority. This ends its report without certifying peace, damage, a new {term:levy} or a public payment. Ordinary work remains a household choice.',
        choices:[{id:'continue',label:'Continue from the present situation',detail:'Close the report at no cost and keep ordinary household choices available.',operation:'continue_livelihood'}]}
    ]
  },
  district_authority_households_634:{
    id:'district_authority_households_634',type:'household_observer',
    title:'Local authority reports',
    intro:'Review an observed change of sovereignty in the household’s own district, independently of either campaign.',
    source:{type:'local_control'},
    provinceIds:['homs','hama','aleppo','antioch','jerusalem','kufa','basra','mosul'],
    requirements:{provinces:['homs','hama','aleppo','antioch','jerusalem','kufa','basra','mosul']},expiryTurns:30,
    beats:[{id:'authority_changed',trigger:'rule_changed',reach:'local',name:'Local sovereignty has changed',
      text:'A different sovereign now controls this district. Consult Land for current authority and Station & home for recorded obligations. This change alone establishes no siege, loss, tax, {term:levy}, paid work, protection or conversion.',
      choices:[{id:'records',label:'Review the present authority',detail:'Acknowledge this actual change once. No payment or action days; existing obligations keep their own rules.',operation:'review_records'},
        {id:'continue',label:'Continue the household livelihood',detail:'Close the report at no cost without changing work, property or faith.',operation:'continue_livelihood'}]}]
  }
};
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  var world = source.input.bookmark.revisions.core_courts_v4;
  // This revision owns an explicit list captured before the household sources.
  // Carry their available ordinary observers forward without attaching tracks.
  ['ctesiphon_household_observer_634','damascus_household_observer_634','medina_household_observer_634'].forEach(function (id) {
    if (source.input.catalogs.storyInstances[id] && world.stories.indexOf(id) < 0) world.stories.push(id);
  });
  Object.keys(FBDATA.householdEffects_634).forEach(function (id) {
    source.input.catalogs.storyInstances[id] = JSON.parse(JSON.stringify(FBDATA.householdEffects_634[id]));
    world.stories.push(id);
  });
})();
});
