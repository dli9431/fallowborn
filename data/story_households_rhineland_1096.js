/* Attributed historical context never creates a live attack or a refuge entry. */
window.FBDATA = window.FBDATA || {};

FBDATA.householdTracks_rhineland_1096 = {
  mainz_household_track_1096:{id:'mainz_household_track_1096',type:'household_track',
    title:'A Household in Mainz',intro:'Work, community, warnings and choices about temporary refuge.',
    homeProvinceId:'mainz',continuity:'protagonist',interruptedStage:'interrupted',initialStage:'household',
    requirements:{provinces:['mainz']},
    stages:{
      household:{name:'Ordinary life',text:'Your craft, family and Jewish community belong to the ordinary life of Mainz. You hold no communal treasury and no special public office.',choices:[
        {id:'plans',label:'Consider work and family',detail:'Review household priorities without spending money or days.',operation:{kind:'record_decision'},next:'livelihood'},
        {id:'stay',label:'Keep ordinary life first',detail:'Close these opening plans. Ordinary work, community life and later choices remain available.',operation:{kind:'record_decision'},next:'continuing'}],transitions:[]},
      livelihood:{name:'Work at the bench',text:'Craft work can support the household. Choosing a focus earns nothing until the ordinary work actually pays.',choices:[
        {id:'work',label:'Choose craft work',detail:'Select the ordinary craft focus. No story wage or wealth bonus is awarded.',operation:{kind:'set_focus',focusId:'craft_work'},next:'working'},
        {id:'community',label:'Review community and family',detail:'Keep your current focus and review plans without claiming earnings.',operation:{kind:'record_decision'},next:'community'}],transitions:[]},
      working:{name:'The household’s livelihood',text:'Craft work is selected. You can wait for actual earnings or consider other matters now.',afterWork:{focusId:'craft_work',provinceId:'mainz',next:'community'},choices:[
        {id:'review',label:'Consider family plans now',detail:'Continue without claiming a payment.',operation:{kind:'record_decision'},next:'community'},
        {id:'keep_working',label:'Continue ordinary work',detail:'Close the opening plan and keep the selected focus.',operation:{kind:'record_decision'},next:'continuing'}],transitions:[]},
      community:{name:'Neighbours and family',text:'Homes, worship, assistance and local relationships shape communal life. Your generated household represents no named historical family. The household party card lets you invite exact relatives; each adult decides separately and dependents need a consenting parent.',choices:[
        {id:'present_war',label:'Review the present war context',detail:'Review the county’s sovereign being at war. This establishes no local attack.',when:{kind:'at_war',provinceId:'mainz'},operation:{kind:'record_decision'},next:'warnings'},
        {id:'review_context',label:'Consider the wider context',detail:'Read attributed historical context. This creates no current news, danger or hostile action.',operation:{kind:'record_decision'},next:'context'},
        {id:'remain',label:'Keep ordinary plans',detail:'Continue life without requesting refuge or moving relatives.',operation:{kind:'record_decision'},next:'continuing'}],transitions:[]},
      warnings:{name:'Current uncertainty',text:'The county’s sovereign is at war. This establishes neither hostile action in Mainz nor danger at your household’s site. You can inspect real shelter terms or continue ordinary life.',choices:[
        {id:'request_terms',label:'Consider actual shelter terms',detail:'Read the separate consent and entry requirements. No protection is created.',operation:{kind:'record_decision'},next:'protection'},
        {id:'continue_work',label:'Continue ordinary life',detail:'Close these plans without a penalty or a claim that an attack occurred.',operation:{kind:'record_decision'},next:'continuing'}],transitions:[]},
      context:{name:'Accounts and present facts',text:'Accounts of the May 1096 attacks describe attempted episcopal protection at Mainz and its failure. They do not establish that an attack has happened in this campaign. No faith, pilgrimage or disputed allegation establishes an individual hostile act.',choices:[
        {id:'protection',label:'Consider a protective request',detail:'Read how exact people can request a finite term. Reading creates no offer, entry or safety.',operation:{kind:'record_decision'},next:'protection'},
        {id:'wait',label:'Continue at home',detail:'Keep work and family life available without a penalty.',operation:{kind:'record_decision'},next:'continuing'}],transitions:[]},
      protection:{name:'An exact shelter request',text:'The temporary shelter card names Archbishop Ruthard, the current civil custodian and available places. First invite exact relatives in the household party card, then separately consent to shelter. Each request needs civil authorization and the living archbishop’s offer. Only an explicit local entry admits its selected people.',choices:[
        {id:'review_actual',label:'Keep the actual shelter terms under review',detail:'Continue to a reminder about present protection. Use the separate shelter card for real requests, consent, entry or leaving.',operation:{kind:'record_decision'},next:'protection_review'},
        {id:'decline_plans',label:'Set these refuge plans aside',detail:'Close this personal plan only. Any existing request or protection keeps its actual terms until separately ended.',operation:{kind:'record_decision'},next:'continuing'}],transitions:[]},
      protection_review:{name:'Protection has its own limits',text:'Use the temporary shelter card to inspect the actual named people and status. The disclosed simulation allows eight places for thirty days, with a fifteen-day reply window and no household fee. Capacity, refusal, changed authority, departure or expiry can end an offer or protection. An ended term does not move anyone or certify safety.',choices:[
        {id:'continue',label:'Continue household life',detail:'Finish this opening plan without ending protection, changing residence, moving relatives or paying a reward.',operation:{kind:'record_decision'},next:'continuing'},
        {id:'reconsider',label:'Reconsider the request process',detail:'Return to the explanation. No request, payment or renewed term is created.',operation:{kind:'record_decision'},next:'protection'}],transitions:[]},
      continuing:{name:'Life continues',text:'Ordinary work, worship, family and lawful travel remain your choices. Any real shelter agreement, temporary site presence and household residence retain their actual state.',terminal:true,choices:[],transitions:[]},
      elsewhere:{name:'The household’s circumstances changed',text:'These Mainz opening plans close. Actual residence, travel, relatives and any shelter agreement remain with their ordinary owners.',terminal:true,choices:[],transitions:[]},
      deferred:{name:'The opening is set aside',text:'The opening period passed quietly. This records no attack, loss, safe return or reward. Work and family life remain playable.',terminal:true,choices:[],transitions:[]},
      interrupted:{name:'This person’s opening has ended',text:'Death or succession ends this personal plan. It does not enrol an heir, move relatives or alter existing communal life.',terminal:true,choices:[],transitions:[]}
    }},
  mainz_party_1096:{id:'mainz_party_1096',type:'household_party',title:'The Mainz Household’s Named Party',
    intro:'Invite exact relatives. Adults decide for themselves; an actual consenting parent decides for each dependent. Association alone grants no shelter or movement.',
    maxMembers:8,allowDependents:true,invitationDays:90,adultPolicy:'volunteers'}
};

FBDATA.householdRefuges_rhineland_1096 = {
  mainz_refuge_1096:{id:'mainz_refuge_1096',type:'household_refuge',title:'Temporary Refuge at Mainz',
    intro:'Archbishop Ruthard’s residence is a disclosed locality abstraction. Eight places, thirty days of protection and a fifteen-day reply window are simulation terms, with no fee or promise of historical safety. Civil and episcopal permission remain separate.',
    locality:{provinceId:'mainz',siteId:'mainz_refuge_1096'},
    provider:{institutionId:'mainz_see_1096',officeId:'mainz_archbishop_1096',realmId:'mainz_custody_1096'},
    capacity:8,acceptanceDays:15,termDays:30,funding:{perPersonDay:0},
    partyIds:['mainz_party_1096'],threatIds:[],providerPolicy:'volunteers',adultPolicy:'volunteers'}
};

FBDATA.openingProfiles_rhineland_1096 = {
  opening_mainz_1096:{id:'opening_mainz_1096',type:'opening_profile',title:'The Household’s Opening Goals',
    intro:'Optional goals observe ordinary work, savings and personal decisions. They pay no additional reward.',
    scenarioIds:['mainz_jewish_household_1096'],provinceIds:['mainz'],requires:['mainz_household_track_1096'],
    goals:[
      {id:'craft_income',name:'Earn ten gold through craft work',text:'Earn ten gold through actual ordinary craft work after the opening.',criterion:{kind:'earnings',amount:10,focusIds:['craft_work']}},
      {id:'reserve',name:'Keep thirty gold for household needs',text:'Retain thirty gold in the private purse. This is neither a communal fund nor a refuge fee.',criterion:{kind:'reserve',amount:30}},
      {id:'continue',name:'Choose how household life continues',text:'Conclude the local opening without a required journey or refuge decision.',criterion:{kind:'household_phase',storyId:'mainz_household_track_1096',phases:['continuing']}}
    ],contacts:[]}
};

(function () {
  'use strict';
  var def=FBDATA.householdTracks_rhineland_1096.mainz_household_track_1096;
  Object.keys(def.stages).forEach(function(id) {
    if (def.stages[id].terminal) return;
    def.stages[id].transitions=[
      {when:{not:{all:[{kind:'home',provinceId:'mainz'},{kind:'present',provinceId:'mainz'}]}},next:'elsewhere'},
      {when:{kind:'year',min:1097,max:10000},next:'deferred'}
    ];
  });
  Object.assign(FBDATA.storyInstances,FBDATA.householdTracks_rhineland_1096,
    FBDATA.householdRefuges_rhineland_1096,FBDATA.openingProfiles_rhineland_1096);
})();
