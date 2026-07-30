/* Fallowborn — political-bloc archetypes.
   Runtime mods may replace complete definitions through the top-level
   `politicalBlocs` key. Membership, influence, and motion forecasts are
   derived by js/politics.js. */
window.FBDATA = window.FBDATA || {};

FBDATA.politicalBlocs = {
  crown: {
    name:'Crown',
    icon:'♛',
    desc:'Houses bound to the ruler by office, faith, favor, or temperament.',
    order:0,
    affiliationThreshold:35,
    motions:{ redress:-20, scutage:-10 }
  },
  mercantile: {
    name:'Mercantile',
    icon:'⚖',
    desc:'Guild, charter, enterprise, and trade interests acting together.',
    order:1,
    affiliationThreshold:30,
    motions:{ redress:25, scutage:30 }
  },
  magnate: {
    name:'Magnates',
    icon:'🏰',
    desc:'A landed affinity gathered around an influential house.',
    order:2,
    affiliationThreshold:30,
    motions:{ redress:15, scutage:0 }
  },
  independent: {
    name:'Independent',
    icon:'◇',
    desc:'A house with no durable allegiance strong enough to bind it.',
    order:3,
    affiliationThreshold:0,
    motions:{ redress:0, scutage:0 }
  }
};
