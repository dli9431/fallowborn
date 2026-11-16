/* Optional institutions. Defaults preserve the shared medieval engine;
   papal institutions additionally require an enabling faith. */
window.FBDATA = window.FBDATA || {};
FBDATA.systems = {
  event_governments:{ id:'event_governments', eventReaderOwner:'governments', desc:'Government state conditions in events.', defaultEnabled:true, modules:['governments'] },
  event_authority:{ id:'event_authority', eventReaderOwner:'authority', desc:'Office and recognition state conditions in events.', defaultEnabled:true, modules:['authority'] },
  event_federates:{ id:'event_federates', eventReaderOwner:'federates', desc:'Federate contract state conditions in events.', defaultEnabled:true, modules:['federates'] },
  event_mobile_confederations:{ id:'event_mobile_confederations', eventReaderOwner:'mobile_confederations', desc:'Mobile coalition state conditions in events.', defaultEnabled:true, modules:['mobile_confederations'] },
  event_religious_institutions:{ id:'event_religious_institutions', eventReaderOwner:'religious_institutions', desc:'Institution membership state conditions in events.', defaultEnabled:true, modules:['religious_institutions'] },
  event_industry_laws:{ id:'event_industry_laws', eventReaderOwner:'industry_laws', desc:'Enterprise operating-law state conditions in events.', defaultEnabled:true, modules:['industry_laws'] },
  event_episcopal_claims:{ id:'event_episcopal_claims', eventReaderOwner:'episcopal_claims', desc:'Civil rent claim state conditions in events.', defaultEnabled:true, modules:['episcopal_claims'] },
  event_religious_cases:{ id:'event_religious_cases', eventReaderOwner:'religious_cases', desc:'Named religious case state conditions in events.', defaultEnabled:true, modules:['religious_cases'] },
  event_story_tracks:{ id:'event_story_tracks', eventReaderOwner:'story_tracks', desc:'Active story stage conditions in events.', defaultEnabled:true, modules:['stories'] },
  public_offices:{ id:'public_offices', desc:'Appointed public jurisdiction, audited receipts, service and sovereign recognition.', defaultEnabled:false, modules:['authority','treasury'] },
  roman_offices:{ id:'roman_offices', desc:'Scoped Roman offices, personal honors and contested imperial recognition.', defaultEnabled:false, modules:['authority'] },
  church_councils:{ id:'church_councils', desc:'Provincial gatherings of living bishops and protected congregations.', defaultEnabled:false, modules:['religion'] },
  ruler_conversion:{ id:'ruler_conversion', desc:'Public ruler conversion with court, church and community consequences.', defaultEnabled:false, modules:['religion','actions'] },
  civic_institutions:{ id:'civic_institutions', desc:'Site councils and senates with local bargains and consent.', defaultEnabled:false, modules:['institutions'] },
  episcopal_sees:{ id:'episcopal_sees', desc:'Local bishoprics and patriarchates with mediation and institutional standing.', defaultEnabled:false, modules:['institutions','model'], providesOrdination:true },
  manorial_tenure:{ id:'manorial_tenure', desc:'Customary dependent tenure and scheduled household duties.', defaultEnabled:true, modules:['events','actions','economy'], tenure:{} },
  colonate:{ id:'colonate', desc:'Roman land-bound tenancy, estate dues and release from registered dependency.', defaultEnabled:false, modules:['events','actions','economy'],
    tenure:{ estatePossessor:true, reviewDeedId:'review_colonate', blockedCareerRoles:['arms','clergy','cloister'],
      releaseRoutes:[
        { id:'military_service', careerId:'soldier', careerRank:'journeyman' },
        { id:'ordination', careerId:'priest', careerRank:'journeyman' },
        { id:'flight', eventId:'colonus_flight' }
      ] } },
  feudal_service:{ id:'feudal_service', desc:'Service charters and hereditary, life or fixed-term grants.', defaultEnabled:true, modules:['actions','lordships'] },
  scutage:{ id:'scutage', desc:'Silver in place of military service.', defaultEnabled:true, modules:['parliament','actions'] },
  crown_bloc:{ id:'crown_bloc', desc:'Political allegiance to the ruling house.', defaultEnabled:true, modules:['politics'] },
  papacy:{ id:'papacy', desc:'Papal obediences, investiture and the College of Cardinals.', defaultEnabled:false, modules:['papacy'] },
  excommunication:{ id:'excommunication', desc:'Religious sanctions and absolution.', defaultEnabled:true, modules:['papacy'] },
  abbeys:{ id:'abbeys', desc:'Endowed religious houses, their offices and residents.', defaultEnabled:true, modules:['abbeys'] },
  tournaments:{ id:'tournaments', desc:'Scheduled games and tournament invitations.', defaultEnabled:true, modules:['tournaments'] },
  great_holy_wars:{ id:'great_holy_wars', desc:'Religious-head calls and global holy-war campaigns.', defaultEnabled:true, modules:['holywar'] },
  guild_elections:{ id:'guild_elections', desc:'Fixed-term elections for guild leadership.', defaultEnabled:true, modules:['institutions'] },
  royal_council:{ id:'royal_council', desc:'Great officers and royal council decisions.', defaultEnabled:true, modules:['council','institutions'] },
  estates:{ id:'estates', desc:'The assembly of sworn lords and its motions.', defaultEnabled:true, modules:['parliament'] }
};
