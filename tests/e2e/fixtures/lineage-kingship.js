/* Fictional consumer data, installed by this specification before creation.
   No historical claim and no engine override. */
window.FB_LINEAGE_FIXTURE = {
  formId:'fixture_river_lineage', realmId:'dumnonia_476',
  profile:{ eligibility:{ minAge:21, sex:'f', ancestry:true }, tieBreak:'identity',
    consensus:0.6, quorum:0.75, negotiationCost:11, terms:{ levy:0.3, revenue:0.4 },
    reserved:['levy','war','treaty','grant','extraordinary_tax'], members:[
      { id:'river_kin_interest', name:'River kin', principal:'senior_kin', scope:'capital',
        basis:'kin_recognition', weight:2, continuity:'senior_kin', minimumSupport:-10,
        minimumMartial:0, maximumLevy:0.4, maximumRevenue:0.5 },
      { id:'river_household_interest', name:'River households', principal:'capital_community', scope:'capital',
        basis:'community_assent', weight:5, continuity:'institution', minimumSupport:-5,
        minimumMartial:0, maximumLevy:0.35, maximumRevenue:0.45 }
    ] },
  ruler:{ name:'River Founder', sex:'f', culture:'brittonic', born:435, mar:7, trait:'patient' },
  royalCourt:{ founderId:'river_ancestor', rulerMotherId:'river_ancestor', members:[
    { id:'river_ancestor', name:'Old River', sex:'f', born:400, culture:'brittonic', religion:'nicene', alive:false, died:470 },
    { id:'river_a', name:'Aster', sex:'f', born:449, culture:'brittonic', religion:'nicene', motherId:'river_ancestor', mar:6 },
    { id:'river_b', name:'Briar', sex:'f', born:446, culture:'brittonic', religion:'nicene', motherId:'river_ancestor', mar:6 },
    { id:'river_minor', name:'Reed', sex:'f', born:464, culture:'brittonic', religion:'nicene', motherId:'ruler', mar:4 },
    { id:'river_excluded', name:'Willow', sex:'m', born:450, culture:'brittonic', religion:'nicene', motherId:'river_ancestor', mar:5 }
  ] }
};
