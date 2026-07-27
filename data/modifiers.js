/* Fallowborn — temporary county and great-holy-war modifiers.
   Numeric rates are fractions; flat values are ordinary game units. */
window.FBDATA = window.FBDATA || {};

FBDATA.modifiers = {
  granaries_opened: {
    name:'Granaries Opened', icon:'🌾',
    desc:'The lord’s stores stand open against the hunger.',
    scope:'county', days:1080,
    upkeep:{ gold:2 },
    fx:{ famine:-0.30, commonVoice:8 }
  },
  custom_confirmed: {
    name:'Custom Confirmed', icon:'📜',
    desc:'Old rights stand confirmed by charter.',
    scope:'county', days:3600,
    fx:{ commonVoice:8, levy:-0.05, unrest:-0.15 }
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
