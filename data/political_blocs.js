/* Fallowborn — political-bloc archetypes.
   Runtime mods may replace complete definitions through the top-level
   `politicalBlocs` key. Membership, influence, and motion forecasts are
   derived by js/politics.js. */
window.FBDATA = window.FBDATA || {};

FBDATA.politicalBlocs = {
  crown: {
    name:'Crown',
    icon:'♛',
    color:'#b88a3b',
    desc:'Houses bound to the ruler by office, faith, favor, or temperament.',
    order:0,
    affiliationThreshold:35,
    motions:{ redress:-20, emergency_subsidy:25, scutage:-10, levy_relief:-15,
      market_charter:-5, local_custom:-15, revocation_consent:-25,
      war_authorization:25, war_condemnation:-30 }
  },
  mercantile: {
    name:'Mercantile',
    icon:'⚖',
    color:'#4f9c8b',
    desc:'Guild, charter, enterprise, and trade interests acting together.',
    order:1,
    affiliationThreshold:30,
    motions:{ redress:25, emergency_subsidy:-10, scutage:30, levy_relief:0,
      market_charter:30, local_custom:10, revocation_consent:10,
      war_authorization:-15, war_condemnation:20 }
  },
  magnate: {
    name:'Magnates',
    icon:'🏰',
    color:'#9a6fb0',
    desc:'A landed affinity gathered around an influential house.',
    order:2,
    affiliationThreshold:30,
    motions:{ redress:15, emergency_subsidy:10, scutage:0, levy_relief:10,
      market_charter:0, local_custom:15, revocation_consent:20,
      war_authorization:10, war_condemnation:5 }
  },
  independent: {
    name:'Independent',
    icon:'◇',
    color:'#89929b',
    desc:'A house with no durable allegiance strong enough to bind it.',
    order:3,
    affiliationThreshold:0,
    motions:{ redress:0, emergency_subsidy:0, scutage:0, levy_relief:5,
      market_charter:5, local_custom:10, revocation_consent:10,
      war_authorization:0, war_condemnation:0 }
  }
};
