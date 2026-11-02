/* Personal priorities do not execute public or family transactions. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_800 = {
  charlemagne_agenda_800:{ id:'charlemagne_agenda_800', type:'ruler_agenda', subjectRealmId:'carolingian_800',
    title:'Charlemagne: court and empire',
    intro:'Review current people, government and commitments. Ordinary source decisions control every grant, agreement and succession.',
    stages:[
      { id:'ca_household', name:'The living household', year:800, season:3,
        text:'Review the family and your present residence. The opening court roster is incomplete and no relative moves because of this review.', choices:[
          { id:'ca_review_household', label:'Prioritize the living family', detail:'Record attention without creating kin, moving court or appointing an adviser.', operation:'agenda_priority' },
          { id:'ca_keep_household', label:'Retain present arrangements', detail:'Leave the current household and residence to ordinary choices.', operation:'agenda_priority' }] },
      { id:'ca_government', name:'Provincial obligations', year:801, season:0,
        text:'Consider present obligations across the counties you actually govern. No general oath or tax follows from a priority.', choices:[
          { id:'ca_review_government', label:'Prioritize current obligations', detail:'Review ordinary government without imposing a new levy or policy.', operation:'agenda_priority' },
          { id:'ca_keep_government', label:'Retain present policy', detail:'Leave provincial decisions open.', operation:'agenda_priority' }] },
      { id:'ca_learning', name:'Learning and church support', year:802, season:0,
        text:'Review available learning and church activity at the living court. No institution or research completes here.', choices:[
          { id:'ca_review_learning', label:'Consider ordinary learning', detail:'Record attention without a building, appointment or conversion.', operation:'agenda_priority' },
          { id:'ca_keep_learning', label:'Retain commitments', detail:'Keep actual study and church decisions separate.', operation:'agenda_priority' }] },
      { id:'ca_frontiers', name:'The living frontiers', year:802, season:1,
        text:'Consult current defense and diplomacy before any new undertaking. A campaign may expire or change with the world.', choices:[
          { id:'ca_review_frontiers', label:'Prioritize available defenses', detail:'Raise no host, spend no money and promise no victory.', operation:'agenda_priority' },
          { id:'ca_keep_frontiers', label:'Retain commitments', detail:'Leave armies and treaties to their current source decisions.', operation:'agenda_priority' }] },
      { id:'ca_inheritance', name:'Family prospects', year:806, season:0,
        text:'Review the living family and any current settlement opportunity. This review signs no agreement and designates no heir.', choices:[
          { id:'ca_review_inheritance', label:'Prioritize a current settlement review', detail:'Use the separate source decision for any actual designation, grant or agreement.', operation:'agenda_priority' },
          { id:'ca_keep_inheritance', label:'Retain present arrangements', detail:'Keep succession and existing property under ordinary rules.', operation:'agenda_priority' },
          { id:'ca_finish', label:'Conclude these reviews', detail:'End the personal program without a settlement.', operation:'agenda_finish' }] }
    ] },
  louis_agenda_800:{ id:'louis_agenda_800', type:'ruler_agenda', subjectRealmId:'aquitaine',
    title:'Louis: the Aquitanian court',
    intro:'Review the current subordinate court and household. These priorities grant no imperial authority or automatic inheritance.',
    stages:[
      { id:'la_household', name:'The Aquitanian household', year:800, season:3,
        text:'Review your living family and actual residence under the imperial court. The campaign consort is not a named historical spouse.', choices:[
          { id:'la_review_household', label:'Prioritize the existing household', detail:'Create no spouse, child or independent crown.', operation:'agenda_priority' },
          { id:'la_keep_household', label:'Retain present arrangements', detail:'Leave the household and allegiance as they stand.', operation:'agenda_priority' }] },
      { id:'la_resources', name:'Current resources', year:801, season:0,
        text:'Consider the Aquitanian holdings and obligations that actually remain. Public and private accounts keep their own rules.', choices:[
          { id:'la_review_resources', label:'Prioritize an account of current means', detail:'Collect no extra tax and confiscate no estate.', operation:'agenda_priority' },
          { id:'la_keep_resources', label:'Retain commitments', detail:'Leave funds and holdings to ordinary decisions.', operation:'agenda_priority' }] },
      { id:'la_frontier', name:'Frontier obligations', year:801, season:1,
        text:'Review present defense and diplomacy. The imperial court owns its own campaign opportunities.', choices:[
          { id:'la_review_frontier', label:'Consider available defenses', detail:'Order no travel, host or imperial campaign.', operation:'agenda_priority' },
          { id:'la_keep_frontier', label:'Retain arrangements', detail:'Leave war and diplomacy to their actual parties.', operation:'agenda_priority' }] },
      { id:'la_father', name:'The surviving overlord', year:802, season:0,
        text:'Review current relations and duties to the living overlord. A family tie gives no command of his treasury or armies.', choices:[
          { id:'la_review_father', label:'Prioritize current obligations', detail:'Record attention without an audience or imperial order.', operation:'agenda_priority' },
          { id:'la_keep_father', label:'Retain arrangements', detail:'Keep actual allegiance and authority unchanged.', operation:'agenda_priority' }] },
      { id:'la_inheritance', name:'Family prospects', year:806, season:0,
        text:'Review the living family and any available source agreement. No death, accession or release from allegiance is scheduled.', choices:[
          { id:'la_review_inheritance', label:'Prioritize a current family review', detail:'Any real settlement needs its own current source approval.', operation:'agenda_priority' },
          { id:'la_keep_inheritance', label:'Retain present arrangements', detail:'Leave succession to the living court and ordinary rules.', operation:'agenda_priority' },
          { id:'la_finish', label:'Conclude these reviews', detail:'End the personal program without changing the dynasty.', operation:'agenda_finish' }] }
    ] }
};

(function () {
  'use strict';
  Object.keys(FBDATA.rulerAgendas_800).forEach(function (id) {
    if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
    FBDATA.storyInstances[id] = FBDATA.rulerAgendas_800[id];
  });
})();
