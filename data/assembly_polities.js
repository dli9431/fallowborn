/* Local institutions are declared explicitly, never inferred from ethnicity,
   ruler-name gaps or development. Numbers below are simulation policy. */
(function () {
  'use strict';
  FBDATA.governmentForms.assembly_polity = {
    holders:'community_holders', succession:'delegated_leadership', territory:'community_territory',
    consent:'reserved_consent', levy:'community_levy', revenue:'community_dues',
    council:'represented_interests', diplomacy:'community_relations', ai:'community_decisions',
    ladder:'local_service', officeCatalogue:[],
    systems:{ disable:['feudal_service','roman_offices','royal_council','estates'] }
  };
  FBDATA.constituencyProfiles = {
    coastal_households:{
      eligibility:{ minAge:18, minServiceYears:0, skills:{ dip:3 }, free:true },
      selection:{ threshold:0.6, tie:'id', termDays:null, nominationCost:0 },
      recall:{ threshold:0.6, reasons:['neglect','overreach','ineligible'] },
      obligations:{ revenueRate:0.12, levyRate:0.5, maxDues:20, maxLevy:120, reserve:10 },
      reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'],
      powers:['ban','peace','revenue'],
      members:[
        { id:'cultivators', name:'Cultivating households', weight:3, basis:'custom', continuity:'institution', support:60 },
        { id:'shore', name:'Shore households', weight:2, basis:'custom', continuity:'institution', support:55 },
        { id:'guard', name:'Local defenders', weight:1, basis:'service', continuity:'institution', support:50 }
      ]
    },
    settlement_federation:{
      eligibility:{ minAge:20, minServiceYears:2, skills:{ ste:4 }, free:true },
      selection:{ threshold:0.75, tie:'id', termDays:720, nominationCost:3 },
      recall:{ threshold:0.75, reasons:['neglect','overreach','ineligible'] },
      obligations:{ revenueRate:0.08, levyRate:0.3, maxDues:12, maxLevy:80, reserve:15 },
      reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'],
      powers:['ban','peace','revenue'],
      members:[
        { id:'fields', name:'Field settlements', weight:2, basis:'custom', continuity:'institution', support:65 },
        { id:'crafts', name:'Craft households', weight:2, basis:'custom', continuity:'institution', support:60 },
        { id:'routes', name:'Route keepers', weight:1, basis:'service', continuity:'institution', support:45 }
      ]
    }
  };
  FBDATA.assemblyOpenings = { north_coast_476:{
    id:'north_coast_476', name:'Northern coastal households', color:'#77988b', capital:'tallinn',
    rank:1, government:'assembly_polity', constituency:'coastal_households',
    religion:'baltic_pagan', aggression:0,
    representative:{ name:'Vaino', sex:'m', born:442, skills:{ dip:5, ste:4, mar:4 } }
  }, federation_example:{
    id:'federation_example', name:'Settlement federation example', color:'#a59c77', capital:'shrewsbury',
    rank:1, government:'assembly_polity', constituency:'settlement_federation', religion:'nicene', aggression:0,
    representative:{ name:'Edan', sex:'m', born:440, skills:{ dip:5, ste:5, mar:3 } }
  } };
  FBDATA.assemblyCounties = { north_coast_476:{
    id:'tallinn', name:'Northern Estonian coast', realm:'north_coast_476', culture:'finnic',
    religion:'baltic_pagan', dev:1,
    communities:[{ culture:'finnic', religion:'baltic_pagan', populationShare0:10000 }],
    settlements:[{ name:'Coastal households', kind:'village', share:1 }],
    customaryRights:[{ power:'peace', basis:'possession' }, { power:'revenue', basis:'possession' }]
  } };
  var coastal = FBDATA.assemblyOpenings.north_coast_476;
  var opening = FBDATA.bookmarks['476_outer'];
  opening.realms = opening.realms.concat([coastal]);
  opening.provinces = opening.provinces.map(function (p) {
    if (p.id !== 'tallinn') return p;
    return FBDATA.assemblyCounties.north_coast_476;
  });
  FBDATA.techImpactReviews.features.assembly_delegation = { mode:'none', rationale:'Local representation, selection and justified recall are ordinary political relationships.' };
  FBDATA.techImpactReviews.features.assembly_reserved_consent = { mode:'none', rationale:'Collective consent and refusal depend on local rights, costs and commitments rather than research.' };
  FBDATA.techImpactReviews.features.assembly_local_obligations = { mode:'none', rationale:'Bounded local dues, arbitration and defensive service are baseline community life.' };
})();
