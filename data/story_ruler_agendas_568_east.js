FB.bookmarkSources.stage({"source":"data/story_ruler_agendas_568_east.js","bookmarks":["568"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Eastern court reviews record intentions; the living world owns outcomes. */
window.FBDATA = window.FBDATA || {};

FBDATA.rulerAgendas_568_east = {
  justin_agenda_568:{id:'justin_agenda_568',type:'ruler_agenda',subjectRealmId:'east_568',
    title:'Justin: the eastern court',intro:'Review the actual court, commands and frontiers. Each priority leaves ordinary government and diplomacy in charge.',stages:[
      {id:'ji_court',name:'The living court',year:568,season:0,text:'Review the household and offices now present. The opening roster does not represent every historical relative.',choices:[
        {id:'ji_review_court',label:'Prioritize the living court',detail:'Create no relative or appointment.',operation:'agenda_priority'},
        {id:'ji_keep_court',label:'Retain present arrangements',detail:'Leave the court as it is.',operation:'agenda_priority'}]},
      {id:'ji_italy',name:'Commands in Italy',year:568,season:0,text:'Consider present lawful commands in Italy. Accounts disagree on the timing of Narses’s removal; no recall has occurred through this review.',choices:[
        {id:'ji_review_italy',label:'Prioritize a command review',detail:'Issue no summons or appointment.',operation:'agenda_priority'},
        {id:'ji_keep_italy',label:'Retain current commands',detail:'Keep actual office holders in place.',operation:'agenda_priority'}]},
      {id:'ji_north',name:'Northern Italy',year:568,season:1,text:'Review current holdings and resources in case pressure develops in northern Italy. This review presumes no Lombard advance.',choices:[
        {id:'ji_review_defense',label:'Prioritize affordable defense',detail:'Raise no levy and spend no funds.',operation:'agenda_priority'},
        {id:'ji_review_diplomacy',label:'Consider ordinary diplomacy',detail:'Create no treaty or access.',operation:'agenda_priority'},
        {id:'ji_keep_north',label:'Retain present arrangements',detail:'Make no new commitment.',operation:'agenda_priority'}]},
      {id:'ji_east',name:'Eastern approaches',year:569,season:0,text:'Consider present eastern relations. Historical embassy dates do not establish an arrival in this campaign.',choices:[
        {id:'ji_review_east',label:'Prioritize diplomatic review',detail:'Receive no envoy or delivery.',operation:'agenda_priority'},
        {id:'ji_keep_east',label:'Retain current relations',detail:'Make no agreement.',operation:'agenda_priority'}]},
      {id:'ji_armenia',name:'The Armenian frontier',year:571,season:0,text:'Review the authority and communities now present near the Armenian frontier. No petition or revolt is presumed.',choices:[
        {id:'ji_review_armenia',label:'Prioritize local review',detail:'Create no asylum, rebellion or county transfer.',operation:'agenda_priority'},
        {id:'ji_keep_armenia',label:'Retain current administration',detail:'Leave existing authority in place.',operation:'agenda_priority'}]},
      {id:'ji_future',name:'Reconsider commitments',year:572,season:0,text:'Review current obligations before deciding how to continue. War and succession remain ordinary campaign outcomes.',choices:[
        {id:'ji_review_future',label:'Prioritize a new review',detail:'Conclude without ordering war or succession.',operation:'agenda_priority'},
        {id:'ji_keep_future',label:'Retain current priorities',detail:'Conclude with present arrangements.',operation:'agenda_priority'}]}
    ]},
  khosrow_agenda_568:{id:'khosrow_agenda_568',type:'ruler_agenda',subjectRealmId:'sasanian_568',
    title:'Khosrow: the Sasanian court',intro:'Review the living household, provincial service and frontier obligations without presuming later outcomes.',stages:[
      {id:'kh_court',name:'The royal household',year:568,season:0,text:'Review the household and recognition state as they stand. The opening roster supplies no named historical heir.',choices:[
        {id:'kh_review_court',label:'Prioritize the living household',detail:'Create no heir or marriage.',operation:'agenda_priority'},
        {id:'kh_keep_court',label:'Retain present arrangements',detail:'Leave current people and recognition unchanged.',operation:'agenda_priority'}]},
      {id:'kh_provinces',name:'Provincial obligations',year:568,season:0,text:'Review the actual Ray, Hamadan and Dvin interests through ordinary administration.',choices:[
        {id:'kh_review_provinces',label:'Prioritize provincial review',detail:'Make no bargain, payment or tax change.',operation:'agenda_priority'},
        {id:'kh_keep_provinces',label:'Retain existing terms',detail:'Leave current obligations in place.',operation:'agenda_priority'}]},
      {id:'kh_service',name:'Service and resources',year:568,season:1,text:'Consult current appointments, forces and resources before new commitments.',choices:[
        {id:'kh_review_service',label:'Prioritize available service',detail:'Create no commander, troop or reform.',operation:'agenda_priority'},
        {id:'kh_keep_service',label:'Retain current service',detail:'Keep actual appointments and resources.',operation:'agenda_priority'}]},
      {id:'kh_routes',name:'Routes and approaches',year:569,season:0,text:'Consider current relations along eastern and western routes. No embassy, alliance or trade delivery is presumed.',choices:[
        {id:'kh_review_routes',label:'Prioritize diplomatic review',detail:'Create no alliance or contract.',operation:'agenda_priority'},
        {id:'kh_keep_routes',label:'Retain current relations',detail:'Make no new commitment.',operation:'agenda_priority'}]},
      {id:'kh_armenia',name:'Armenian administration',year:571,season:0,text:'Review the present Dvin interests, local authority and communities. No rebellion or governor’s death is scheduled.',choices:[
        {id:'kh_review_armenia',label:'Prioritize local review',detail:'Create no revolt, conversion or county transfer.',operation:'agenda_priority'},
        {id:'kh_keep_armenia',label:'Retain present administration',detail:'Leave current holders in office.',operation:'agenda_priority'}]},
      {id:'kh_future',name:'Keep or reconsider the peace',year:572,season:0,text:'Review present relations and means before deciding what follows. War and succession remain open.',choices:[
        {id:'kh_review_future',label:'Prioritize a new review',detail:'Conclude without an attack or accession.',operation:'agenda_priority'},
        {id:'kh_keep_future',label:'Retain current priorities',detail:'Conclude with actual relations unchanged.',operation:'agenda_priority'}]}
    ]}
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var draft = FBDATA.bookmarkCompositionDrafts && FBDATA.bookmarkCompositionDrafts.spring_568;
  if (!draft) return;
  try {
    [['justin_568','justin_agenda_568'],['khosrow_568','khosrow_agenda_568']].forEach(function (pair) {
      var unit = draft.starts.find(function (unit) { return unit.definition.id === pair[0]; });
      if (!unit) throw new Error('Missing 568 eastern start unit: ' + pair[0]);
      try {
        unit.storyInstances = {}; unit.storyInstances[pair[1]] = copy(FBDATA.rulerAgendas_568_east[pair[1]]);
        unit.storyAfter = FB.bookmarkCompositions.captureStories('spring_568',pair[0],unit.storyInstances);
      } catch (error) { unit.faults = ['data/story_ruler_agendas_568_east.js: ' + error.message]; }
    });
    var b = draft.bookmark;
    var source = Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]);
    var ids = FBDATA.startScenarios_rulers_568_east.map(function (scenario) { return scenario.id; });
    if (!source.realms.some(function (realm) { return realm.id === 'east_568' && realm.government === 'roman_civic'; }) ||
        !source.realms.some(function (realm) { return realm.id === 'sasanian_568' && realm.government === 'aristocratic_monarchy'; }))
      throw new Error('Missing original eastern courts for 568 revision.');
    var previous = copy(source.starts || []);
    var locations = copy(source.startLocations);
    locations.justin_568 = ['constantinople'];
    locations.khosrow_568 = ['baghdad'];
    b.revisions.eastern_courts_v3 = {
      realms:copy(source.realms),startLocations:locations,settlementLayout:source.settlementLayout,
      starts:previous.concat(ids.filter(function (id) { return previous.indexOf(id) < 0; }))
    };
    b.revision = 'eastern_courts_v3';
  } catch (error) { draft.faults.push({source:'data/story_ruler_agendas_568_east.js',message:error.message}); }
})();
});
