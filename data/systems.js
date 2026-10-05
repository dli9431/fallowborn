/* Optional institutions. Defaults preserve the shared medieval engine;
   papal institutions additionally require an enabling faith. */
window.FBDATA = window.FBDATA || {};
FBDATA.systems = {
  church_councils:{ id:'church_councils', desc:'Provincial gatherings of living bishops and protected congregations.', defaultEnabled:false, modules:['religion'] },
  ruler_conversion:{ id:'ruler_conversion', desc:'Public ruler conversion with court, church and community consequences.', defaultEnabled:false, modules:['religion','actions'] },
  civic_institutions:{ id:'civic_institutions', desc:'Site councils and senates with local bargains and consent.', defaultEnabled:false, modules:['institutions'] },
  episcopal_sees:{ id:'episcopal_sees', desc:'Local bishoprics and patriarchates with mediation and institutional standing.', defaultEnabled:false, modules:['institutions','model'] },
  manorial_tenure:{ id:'manorial_tenure', desc:'Customary dependent tenure and scheduled household duties.', defaultEnabled:true, modules:['events','actions','economy'] },
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
