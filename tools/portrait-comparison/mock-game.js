/* Minimal read-only game facade for the development comparison page. */
(function () {
  'use strict';
  var cultures=['norse','english','german','frankish','slavic','baltic','gaelic',
    'brezhon','magyar','iberian','italian','greek','armenian','georgian','turkic',
    'andalusi','arabic','berber','persian','nubian'];
  window.FBDATA={cultures:{},religions:{
    catholic:{group:'christian',name:'Catholic'},sunni:{group:'muslim',name:'Sunni'},
    rabbinic:{group:'jewish',name:'Rabbinic'},norse_pagan:{group:'pagan',name:'Norse'}
  },ailments:{
    gash:{kind:'wound',mark:'cut',sev:1},bruises:{kind:'wound',mark:'bruise',sev:1},
    head_wound:{kind:'wound',mark:'bandage',sev:2},fever:{kind:'sickness',sev:1}
  },items:{
    fixture_crown:{slot:'head',unique:true,art:{kind:'crown',metals:['#d2af4e'],gems:['#8c3345']}},
    fixture_helm:{slot:'head',unique:false,art:{kind:'helm',metals:['#899496'],trims:['#6a4730']}},
    fixture_jack:{slot:'body',unique:false,art:{kind:'jack',cloths:['#5c6d55'],threads:['#c1a66c']}},
    fixture_boots:{slot:'feet',unique:false,art:{kind:'boots',leathers:['#4b3022']}},
    fixture_belt:{slot:'waist',unique:false,art:{kind:'belt',leathers:['#563520'],metals:['#b09a64']}},
    fixture_relic:{slot:'neck',unique:true,art:{kind:'relic',metals:['#c9bd90'],gems:['#704d87']}},
    fixture_ring:{slot:'ring',unique:false,art:{kind:'ring',metals:['#d6dadd'],gems:['#416c8d']}},
    fixture_sword:{slot:'hand',unique:false,art:{kind:'sword',metals:['#c4cccd'],grips:['#4d2d1e']}},
    fixture_spear:{slot:'hand',grip:2,unique:false,art:{kind:'spear',metals:['#b8c1c1'],woods:['#6a4328']}}
  }};
  cultures.forEach(function(id){FBDATA.cultures[id]={name:id};});
  window.FB=window.FB||{};
  FB.cultureOf=function(id){return FBDATA.cultures[id]||FBDATA.cultures.frankish;};
  FB.religionOf=function(id){return FBDATA.religions[id]||FBDATA.religions.catholic;};
  FB.stationOf=function(c){return c.station||0;};
  FB.ailmentsOf=function(c){return (c.ails||[]).map(function(id){
    return {id:id,def:FBDATA.ailments[id]};
  }).filter(function(entry){return !!entry.def;});};
  FB.loadoutReadOnly=function(state,id){return state.loadouts[id]||{};};
  FB.resolveItemReadOnly=function(state,ref){return state.items[ref]||null;};
  FB.resolveItemSnapshot=function(snapshot){
    var def=FBDATA.items[snapshot.defId];if(!def)return null;
    return {ref:snapshot.ref||snapshot.defId,defId:snapshot.defId,slot:def.slot,
      grip:def.grip||1,quality:snapshot.quality||'plain',visualSeed:snapshot.visualSeed||1,
      motif:snapshot.motif||'',unique:def.unique!==false,art:def.art};
  };
})();
