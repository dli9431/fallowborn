/* Costless local reports read only the canonical undertaking's actual result. */
window.FBDATA = window.FBDATA || {};
FBDATA.householdEffects_1096 = {
  eastern_undertaking_households_1096:{
    id:'eastern_undertaking_households_1096', type:'household_observer',
    title:'The Undertaking and Local Life',
    intro:'Local reports follow the actual religious campaign. Your livelihood, property and personal commitments continue under their ordinary rules.',
    sourceStoryId:'eastern_undertaking_1096', requires:['eastern_undertaking_1096'],
    provinceIds:['jerusalem'], requirements:{provinces:['jerusalem']}, expiryTurns:30,
    beats:[
      {id:'call', trigger:'called', reach:'local', name:'A religious campaign is called',
        text:'The current campaign names this county among its objectives. A call alone establishes no local arrival, fighting or change of rule.',
        choices:[{id:'records', label:'Review the report', detail:'Record this local report without payment or action days.', operation:'review_records'}]},
      {id:'settled', trigger:'won', reach:'local', name:'The religious campaign is settled',
        text:'The campaign has reached its recorded settlement. Current control and ordinary institutions govern life here. This report grants no property or reward.',
        choices:[{id:'livelihood', label:'Continue the household’s livelihood', detail:'Acknowledge the report without changing work, property or commitments.', operation:'continue_livelihood'}]},
      {id:'ended', trigger:'failed', reach:'local', name:'The religious campaign has ended',
        text:'The campaign ended without its intended victory. Local life continues under the current authorities.',
        choices:[{id:'livelihood', label:'Continue the household’s livelihood', detail:'Acknowledge the report without changing work, property or commitments.', operation:'continue_livelihood'}]},
      {id:'closed', trigger:'diverted', reach:'previous', name:'The campaign report closes',
        text:'The undertaking’s opening opportunity or linked campaign is no longer available. This closes the report without ending any separate personal obligation.',
        choices:[{id:'records', label:'Review the closure', detail:'Record the closure without payment or action days.', operation:'review_records'}]}
    ]
  }
};
