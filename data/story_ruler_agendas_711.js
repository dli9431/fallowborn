FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_711.js","bookmarks":["711"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal reviews record priorities and source choices without forcing a historical outcome. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_711 = {
  roderic_agenda_711:{ id:'roderic_agenda_711', type:'ruler_agenda', subjectRealmId:'visigoths_711',
    requires:['strait_crossing_711','toledo_campaign_711'],
    title:'Roderic: crown and southern coast',
    intro:'Review the living court and conditional campaign opportunities. The separate northeastern crown and ordinary recognition keep their own rules.',
    stages:[
      { id:'roderic_recognition_review_711', name:'Recognition at Toledo', year:711, season:0,
        text:'Review the Toledo court’s current assent through ordinary government. This priority neither records a ballot nor settles the separate northeastern crown.', choices:[
          { id:'roderic_review_assent', label:'Prioritize court assent', detail:'Record attention to the current Toledo recognition without buying support or nominating a candidate.', operation:'agenda_priority' },
          { id:'roderic_keep_recognition', label:'Retain present arrangements', detail:'Leave recognition and the other Gothic court to their ordinary decisions.', operation:'agenda_priority' }
        ] },
      { id:'roderic_coast_review_711', name:'The southern coast', year:711, season:1,
        text:'The crossing is an Umayyad opportunity against the southern Gothic coast. Its current source card decides what remains possible; no battle or victory follows from this review.', choices:[
          { id:'roderic_face_crossing', label:'Face the existing campaign', detail:'Authorize this opportunity only if the source currently permits it. Ordinary war decides the result.', operation:'agenda_story_choice', storyId:'strait_crossing_711', choiceId:'face_campaign' },
          { id:'roderic_leave_crossing', label:'Use ordinary diplomacy', detail:'Close only this authored opportunity if the source permits. Independent wars and diplomacy remain available.', operation:'agenda_story_choice', storyId:'strait_crossing_711', choiceId:'leave_campaign' },
          { id:'roderic_record_crossing', label:'Record the actual conclusion', detail:'Acknowledge a completed source result without creating a new campaign or reward.', operation:'agenda_story_fact', storyId:'strait_crossing_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'roderic_keep_coast', label:'Retain present arrangements', detail:'Make no campaign decision here. The source card and ordinary government remain available.', operation:'agenda_priority' }
        ] },
      { id:'roderic_toledo_review_714', name:'The road to Toledo', year:714, season:0,
        text:'A coastal foothold may open a campaign toward Toledo. Review the actual owner, armies and source decision. Other Gothic possessions do not vanish if the capital changes hands.', choices:[
          { id:'roderic_face_toledo', label:'Face the existing campaign', detail:'Authorize only the current source opportunity if you still hold the required authority.', operation:'agenda_story_choice', storyId:'toledo_campaign_711', choiceId:'face_campaign' },
          { id:'roderic_leave_toledo', label:'Use ordinary diplomacy', detail:'Close only this source opportunity if its live review permits it.', operation:'agenda_story_choice', storyId:'toledo_campaign_711', choiceId:'leave_campaign' },
          { id:'roderic_record_toledo', label:'Record the actual conclusion', detail:'Acknowledge the source result without changing possession, people or household choices.', operation:'agenda_story_fact', storyId:'toledo_campaign_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'roderic_keep_toledo', label:'Retain present arrangements', detail:'Continue ordinary government without deciding the source campaign here.', operation:'agenda_priority' }
        ] },
      { id:'roderic_arrangements_review_718', name:'The surviving court', year:718, season:0,
        text:'Conclude this personal review from the court and counties that actually remain. No date imposes a death, refuge or surrender.', choices:[
          { id:'roderic_record_final_toledo', label:'Record the Toledo outcome', detail:'Acknowledge a completed source result without an additional effect.', operation:'agenda_story_fact', storyId:'toledo_campaign_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'roderic_keep_court', label:'Retain present arrangements', detail:'Finish this personal review with the current court and ordinary obligations.', operation:'agenda_priority' },
          { id:'roderic_finish', label:'Conclude without another priority', detail:'End the program without changing a campaign or public office.', operation:'agenda_finish' }
        ] }
    ] },
  tariq_agenda_711:{ id:'tariq_agenda_711', type:'ruler_agenda', subjectRealmId:'tangier_711',
    requires:['strait_crossing_711','toledo_campaign_711'],
    title:'Tariq: Tangier and the sovereign campaign',
    intro:'Review the Tangier court under Musa. These personal priorities grant no command of the sovereign’s armies or captured land.',
    stages:[
      { id:'tariq_command_review_711', name:'The Tangier court', year:711, season:0,
        text:'Tangier remains subordinate to Musa’s Ifriqiyan court. Review actual local holdings and household obligations through their ordinary controls.', choices:[
          { id:'tariq_review_command', label:'Prioritize local command', detail:'Record attention to the existing court without a new office, army or appointment.', operation:'agenda_priority' },
          { id:'tariq_keep_command', label:'Retain present arrangements', detail:'Keep the current hierarchy and ordinary local choices.', operation:'agenda_priority' }
        ] },
      { id:'tariq_crossing_review_711', name:'The crossing opportunity', year:711, season:1,
        text:'The Umayyad sovereign owns the crossing opportunity. This court may observe its actual result, but cannot authorize or command it through this review.', choices:[
          { id:'tariq_record_crossing', label:'Record the actual conclusion', detail:'Acknowledge a completed source result without a grant, payment or personal journey.', operation:'agenda_story_fact', storyId:'strait_crossing_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'tariq_watch_crossing', label:'Keep the opportunity in view', detail:'Record a priority without directing sovereign armies.', operation:'agenda_priority' },
          { id:'tariq_keep_crossing', label:'Retain present arrangements', detail:'Leave the sovereign campaign to its own parties and current rules.', operation:'agenda_priority' }
        ] },
      { id:'tariq_inland_review_714', name:'News from inland', year:714, season:0,
        text:'Any road toward Toledo depends on an actual foothold and the living sovereign campaign. Reports do not move your household or grant captured counties.', choices:[
          { id:'tariq_record_toledo', label:'Record the actual conclusion', detail:'Acknowledge a completed source result without a territory or command award.', operation:'agenda_story_fact', storyId:'toledo_campaign_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'tariq_review_local', label:'Prioritize the existing command', detail:'Keep ordinary local government in view without declaring a victory.', operation:'agenda_priority' },
          { id:'tariq_keep_inland', label:'Retain present arrangements', detail:'Make no additional commitment through this personal review.', operation:'agenda_priority' }
        ] },
      { id:'tariq_arrangements_review_718', name:'The court continues', year:718, season:0,
        text:'Conclude from the living court’s actual position. This review schedules no recall, disappearance or succession.', choices:[
          { id:'tariq_record_final_crossing', label:'Record the crossing outcome', detail:'Acknowledge a completed result without creating a new source decision.', operation:'agenda_story_fact', storyId:'strait_crossing_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'tariq_keep_court', label:'Retain present arrangements', detail:'Finish with ordinary local duties and the current hierarchy.', operation:'agenda_priority' },
          { id:'tariq_finish', label:'Conclude without another priority', detail:'End this personal review without a new obligation.', operation:'agenda_finish' }
        ] }
    ] }
};

(function () {
  'use strict';
  Object.keys(FBDATA.rulerAgendas_711).forEach(function (id) {
    if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
    FBDATA.storyInstances[id] = FBDATA.rulerAgendas_711[id];
  });
})();
});
