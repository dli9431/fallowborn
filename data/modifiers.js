/* Fallowborn — temporary county and great-holy-war modifiers.
   Numeric rates are fractions; flat values are ordinary game units. */
window.FBDATA = window.FBDATA || {};

FBDATA.modifiers = {
  granaries_opened: {
    name:'Granaries Opened', icon:'🌾',
    desc:'The lord’s stores stand open against the hunger.',
    scope:'county', days:1080,
    upkeep:{ gold:2 },
    fx:{ famine:-0.30, commonVoice:8, marketProvisions:0.15 }
  },
  custom_confirmed: {
    name:'Custom Confirmed', icon:'📜',
    desc:'Old rights stand confirmed by charter.',
    scope:'county', days:3600,
    fx:{ commonVoice:8, levy:-0.05, unrest:-0.15 }
  },
  market_charter: {
    name:'Market Charter', icon:'⚖',
    desc:'Measured tolls and protected stalls draw trade under a public charter.',
    scope:'county', days:1440,
    upkeep:{ gold:1 },
    fx:{ tax:0.08, buildingCost:-0.08, marketFlow:0.15 }
  },
  contested_tolls: {
    name:'Contested Tolls', icon:'🪙',
    desc:'Rival claims at bridge and market turn trade into grievance.',
    scope:'county', days:720,
    fx:{ tax:-0.10, unrest:0.25, marketFlow:-0.20 }
  },
  covert_sabotage: {
    name:'Covert Sabotage', icon:'🔥',
    desc:'Spoiled stores, damaged works, and whispered threats hinder collection and muster.',
    scope:'county', days:720,
    fx:{ tax:-0.12, levy:-0.12, unrest:0.25,
      marketProduction:-0.15, marketFlow:-0.10 }
  },
  levy_exemption: {
    name:'Levy Exemption', icon:'🕊',
    desc:'A witnessed concession shelters this county from the full muster.',
    scope:'county', days:1080,
    fx:{ levy:-0.12, commonVoice:6 }
  },
  tax_concession: {
    name:'Tax Concession', icon:'🌾',
    desc:'A witnessed remission eases collection after an extraordinary burden.',
    scope:'county', days:1080,
    fx:{ tax:-0.08, commonVoice:6, unrest:-0.10 }
  },
  muster_burden: {
    name:'Muster Burden', icon:'🛡',
    desc:'An extraordinary call brings more spears at the cost of local patience.',
    scope:'county', days:540,
    fx:{ levy:0.15, commonVoice:-6, unrest:0.15 }
  },
  roads_patrolled: {
    name:'Roads Patrolled', icon:'🏇',
    desc:'Paid riders keep the markets open and trouble away from the roads.',
    scope:'county', days:720,
    upkeep:{ gold:1 },
    fx:{ tax:0.04, unrest:-0.20, marketFlow:0.12 }
  },
  settlement_grudge: {
    name:'Settlement Grudge', icon:'✊',
    desc:'A coerced settlement is obeyed in public and resented in every village.',
    scope:'county', days:900,
    fx:{ commonVoice:-7, unrest:0.25 }
  },
  zealot_unrest: {
    name:'Zealot Unrest', icon:'🔥',
    desc:'The old faith’s faithful preach defiance against the convert’s house.',
    scope:'county', days:1440,
    fx:{ unrest:0.35, commonVoice:-12, tax:-0.08, levy:-0.05 }
  },
  cultural_unrest: {
    name:'Cultural Unrest', icon:'✊',
    desc:'Local traditionalists and the commons reject foreign customs and resist the convert’s house.',
    scope:'county', days:1440,
    fx:{ unrest:0.35, commonVoice:-12, tax:-0.08, levy:-0.05 }
  },
  conquered_without_right: {
    name:'Conquered Without Right', icon:'⚔',
    desc:'The county was taken without claim or de jure right. Its people resist the new rule and its obligations.',
    scope:'county', days:2160,
    fx:{ tax:-0.15, levy:-0.20, commonVoice:-8, unrest:0.40 }
  },
  /* Royal-policy modifiers (data/policies.js, institution 'crown') carry no
     `days`: they stand while the proclaimed level stands, and the policy sync
     in js/institutions.js is the only writer and remover. */
  persecuted_minorities: {
    name:'Persecuted Minorities', icon:'🔥',
    desc:'The crown’s agents harry those who keep another faith: fines, closed houses of prayer, and informers in every parish.',
    scope:'county',
    fx:{ tax:0.05, levy:-0.10, commonVoice:-10, unrest:0.30, marketFlow:-0.15 }
  },
  tolerated_minorities: {
    name:'Tolerated Minorities', icon:'🕊',
    desc:'Other faiths keep their houses of prayer and their market stalls under the king’s peace.',
    scope:'county',
    fx:{ unrest:-0.10, commonVoice:4, marketFlow:0.05 }
  },
  protected_worship: {
    name:'Protected Worship', icon:'📜',
    desc:'Minority congregations stand under the crown’s written protection; their worship, persons, and market rights are guaranteed.',
    scope:'county',
    fx:{ unrest:-0.15, commonVoice:6, tax:0.02, marketFlow:0.10 }
  },
  closed_settlement: {
    name:'Closed Settlement', icon:'🚪',
    desc:'Newcomers are turned back at the boundary stones; the villages approve, and the markets thin.',
    scope:'county',
    fx:{ commonVoice:4, marketFlow:-0.10, tax:-0.04 }
  },
  encouraged_settlement: {
    name:'Encouraged Settlement', icon:'🏕',
    desc:'Posted protections, seed grain, and remitted dues draw newcomers onto waste and street.',
    scope:'county',
    upkeep:{ gold:1 },
    fx:{ tax:-0.03, marketFlow:0.10 }
  },
  oathbound_host: {
    name:'Oathbound Host', icon:'🕊',
    desc:'The host marches under a public vow.',
    scope:'campaign',
    fx:{ supplyUse:-0.10, contribution:0.10, withdrawalPenalty:1.0 }
  },
  fractured_command: {
    name:'Fractured Command', icon:'⚔',
    desc:'The leaders dispute precedence.',
    scope:'campaign',
    fx:{ marchSpeed:-0.10, battleOdds:-0.05, desertion:0.10 }
  }
};
