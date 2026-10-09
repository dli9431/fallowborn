/* Independent policy: adult women from any culture or faith, including
   clerical service, and a court preference that still needs recognition. */
window.FB_ELECTIVE_FIXTURE = {
  formId:'river_elective_fixture', realmId:'visigoths_711',
  profile:{ eligibility:{ minAge:21, sex:'f', ancestry:false },
    candidatePool:{ gentle:false, cultures:[], religions:[], excludedRoles:[] },
    procedure:{ realmRecognition:true, designation:true, interimRevenue:false, defensiveLevy:false },
    tieBreak:'seniority', consensus:0.67, quorum:1, negotiationCost:3,
    terms:{ levy:0.3, revenue:0.4 }, reserved:['war','grant'],
    members:[
      { id:'civic_interest', name:'River council', principal:'capital_elite', scope:'realm', basis:'public_office',
        weight:2, continuity:'institution', minimumSupport:-30, minimumMartial:0, maximumLevy:0.5, maximumRevenue:0.5 },
      { id:'religious_interest', name:'River congregation', principal:'capital_clergy', scope:'realm', basis:'public_office',
        weight:1, continuity:'institution', minimumSupport:-20, minimumMartial:0, maximumLevy:0.4, maximumRevenue:0.5 }
    ] }
};
