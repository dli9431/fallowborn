FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_711.js","bookmarks":["711"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Personal reviews record priorities and source choices without forcing a historical outcome. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_711 = {
  roderic_agenda_711:{ id:'roderic_agenda_711', type:'ruler_agenda', subjectRealmId:'visigoths_711',
    requires:['strait_crossing_711','toledo_campaign_711'],
    title:'Roderic: crown and southern coast',
    intro:'Set your course as the Gothic king at Toledo, with Achila’s party in the northeast and the Umayyads across the strait. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'roderic_recognition_review_711', name:'Recognition at Toledo', year:711, season:0,
        text:'Your crown rests on the nobles and bishops at Toledo, while Achila’s party in the northeast refuses you.', choices:[
          { id:'roderic_review_assent', label:'Court the nobles and bishops of Toledo', detail:'You turn your attention to the lords and clergy who back your crown.', operation:'agenda_priority' },
          { id:'roderic_keep_recognition', label:'Watch Achila’s party in the northeast', detail:'You turn your eyes to the rival Gothic court at Narbonne.', operation:'agenda_priority' }
        ] },
      { id:'roderic_coast_review_711', name:'The southern coast', year:711, season:1,
        text:'The Umayyads can cross the strait from Tangier and strike your southern coast at Malaga. Whether they come is theirs to decide.', retiredChoiceIds:['roderic_face_crossing','roderic_leave_crossing'], choices:[
          { id:'roderic_record_crossing', label:'Note how the war for Malaga ended', detail:'Records the outcome once the campaign is over.', operation:'agenda_story_fact', storyId:'strait_crossing_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'roderic_keep_coast', label:'Guard the southern coast', detail:'You turn your attention to Malaga and the shore facing Tangier.', operation:'agenda_priority' }
        ] },
      { id:'roderic_toledo_review_714', name:'The road to Toledo', year:714, season:0,
        text:'If the Umayyads hold Malaga, their armies can march inland against Toledo, your capital.', retiredChoiceIds:['roderic_face_toledo','roderic_leave_toledo'], choices:[
          { id:'roderic_record_toledo', label:'Note how the war for Toledo ended', detail:'Records the outcome once the campaign is over.', operation:'agenda_story_fact', storyId:'toledo_campaign_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'roderic_keep_toledo', label:'Hold Toledo against the invaders', detail:'You turn your attention to the defense of your capital.', operation:'agenda_priority' }
        ] },
      { id:'roderic_arrangements_review_718', name:'The surviving court', year:718, season:0,
        text:'Take stock of the lands your court still holds and the people who still follow you.', choices:[
          { id:'roderic_record_final_toledo', label:'Note how the war for Toledo ended', detail:'Records the outcome once the campaign is over.', operation:'agenda_story_fact', storyId:'toledo_campaign_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'roderic_keep_court', label:'Hold the Gothic court together', detail:'You turn to the followers and lands still loyal to you.', operation:'agenda_priority' },
          { id:'roderic_finish', label:'Close your court agenda', detail:'You end this agenda and govern on from where you stand.', operation:'agenda_finish' }
        ] }
    ] },
  tariq_agenda_711:{ id:'tariq_agenda_711', type:'ruler_agenda', subjectRealmId:'tangier_711',
    requires:['strait_crossing_711','toledo_campaign_711'],
    title:'Tariq: Tangier and the sovereign campaign',
    intro:'Set your course at Tangier, between your own people and your service under Musa at Qayrawan. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.',
    stages:[
      { id:'tariq_command_review_711', name:'The Tangier court', year:711, season:0,
        text:'You hold Tangier under Musa ibn Nusayr, across the strait from Gothic Spain.', choices:[
          { id:'tariq_review_command', label:'Strengthen your command at Tangier', detail:'You turn your attention to the people and lands you hold at Tangier.', operation:'agenda_priority' },
          { id:'tariq_keep_command', label:'Stay close to Musa’s orders', detail:'You turn to serving Musa and learning what Qayrawan wants.', operation:'agenda_priority' }
        ] },
      { id:'tariq_crossing_review_711', name:'The crossing opportunity', year:711, season:1,
        text:'The crossing to Iberia is the caliph’s war to order through Musa at Qayrawan. From Tangier you watch the strait.', choices:[
          { id:'tariq_record_crossing', label:'Note how the war for Malaga ended', detail:'Records the outcome once the campaign is over.', operation:'agenda_story_fact', storyId:'strait_crossing_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'tariq_watch_crossing', label:'Watch the strait for the crossing', detail:'You turn your attention to Malaga and the shore facing Tangier.', operation:'agenda_priority' },
          { id:'tariq_keep_crossing', label:'Keep to your duties at Tangier', detail:'You turn to your own court while the caliph’s war is ordered through Musa.', operation:'agenda_priority' }
        ] },
      { id:'tariq_inland_review_714', name:'News from inland', year:714, season:0,
        text:'If the Umayyads hold Malaga, their armies can march inland toward Toledo. You follow the news from Tangier.', choices:[
          { id:'tariq_record_toledo', label:'Note how the war for Toledo ended', detail:'Records the outcome once the campaign is over.', operation:'agenda_story_fact', storyId:'toledo_campaign_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'tariq_review_local', label:'Put your Tangier command first', detail:'You turn your attention to the lands and followers in your charge.', operation:'agenda_priority' },
          { id:'tariq_keep_inland', label:'Follow the news from Toledo', detail:'You turn your attention to what the armies do inland.', operation:'agenda_priority' }
        ] },
      { id:'tariq_arrangements_review_718', name:'The court continues', year:718, season:0,
        text:'Take stock of your court at Tangier and decide what it puts first.', choices:[
          { id:'tariq_record_final_crossing', label:'Note how the war for Malaga ended', detail:'Records the outcome once the campaign is over.', operation:'agenda_story_fact', storyId:'strait_crossing_711', stateField:'result', values:['won','failed','diverted','interrupted'] },
          { id:'tariq_keep_court', label:'Hold your court at Tangier together', detail:'You turn to your household and the people who serve you at Tangier.', operation:'agenda_priority' },
          { id:'tariq_finish', label:'Close your court agenda', detail:'You end this agenda and govern on from where you stand.', operation:'agenda_finish' }
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
