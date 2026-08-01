/* Fallowborn — the Estates policy catalog: laws and reforms a sworn lord
   (tiers 3–5) can campaign for before the liege’s assembly. Each def declares
   the proposal flow contract; the campaign, lobbying, and recorded bloc vote
   are resolved generically by js/politics.js and js/parliament.js. Outcome
   text and effects stay in the policy’s result event (data/events_parliament.js),
   so visible and autoresolved votes remain equivalent. Bloc-interest weights
   per policy live in the `motions` maps of data/political_blocs.js; the
   aid-response and per-trait posture adjustments live in each def’s `posture`.
   A `gate` names an FB.fns fn that returns true when the policy may be
   proposed, or a localized reason string when it may not. Runtime mods may
   replace complete definitions through the top-level `policies` key. */
window.FBDATA = window.FBDATA || {};

FBDATA.policies = {
  redress: {
    name:'Redress of the Aid',
    icon:'⚖',
    desc:'If carried, the liege’s aid falls one step, and your home county’s custom is confirmed.',
    family:'aid',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'level',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:0,
    gate:'parliament_gate_redress',
    posture:{ aidSlope:100, traits:{
      ambitious:5, greedy:8, proud:5, content:-5, generous:-5 } },
    redressEvidence:true
  },
  emergency_subsidy: {
    name:'Emergency Subsidy',
    icon:'💰',
    desc:'Wartime only, and never blocked by the year’s other business. If carried, you pay the liege’s war subsidy, and the hall remembers who moved it.',
    family:'aid',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'one-shot',
    cooldown:'year',
    repeal:'none',
    emergency:true,
    order:1,
    gate:'parliament_gate_emergency_subsidy',
    posture:{ traits:{ generous:8, greedy:-8, brave:4 } }
  },
  scutage: {
    name:'Scutage',
    icon:'🛡',
    desc:'If carried, the banner call can be answered with silver instead of service — and the aid creeps up to pay for the privilege.',
    family:'service',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'on',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:2,
    gate:'parliament_gate_scutage',
    posture:{ aidSlope:-60, martialSlope:2, traits:{
      brave:-10, craven:12, greedy:5, patient:4, wrathful:-6 } }
  },
  levy_relief: {
    name:'Levy Relief',
    icon:'🌾',
    desc:'If carried, your home county is freed from the levy for a time — and the aid rises one step to pay for it.',
    family:'service',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'one-shot',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:3,
    gate:'parliament_gate_levy_relief',
    posture:{ traits:{ brave:-4, craven:6 } }
  },
  market_charter: {
    name:'Market Charter',
    icon:'⚖',
    desc:'If carried, your home county gains a chartered market: richer tolls and cheaper building, for a small seasonal upkeep.',
    family:'commerce',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'one-shot',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:4,
    gate:'parliament_gate_market_charter',
    resultEvent:'parliament_market_charter_grant',
    posture:{ traits:{ greedy:6, generous:-4 } }
  },
  local_custom: {
    name:'Confirmation of Custom',
    icon:'📜',
    desc:'If carried, your home county’s old customs are confirmed in writing — the commons stand steadier, and the levy rests easier.',
    family:'custom',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'one-shot',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:5,
    gate:'parliament_gate_local_custom',
    posture:{ traits:{ content:6, ambitious:-6, proud:4 } }
  },
  revocation_consent: {
    name:'Consent of the Estates',
    icon:'🗳',
    desc:'If carried, the liege swears to raise no aid without the estates’ consent — the crown’s unilateral demands leave the yearly agenda for good.',
    family:'custom',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'on',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:6,
    gate:'parliament_gate_revocation_consent',
    posture:{ traits:{ ambitious:-8, proud:6, deceitful:4 } }
  },
  war_authorization: {
    name:'War Authorization',
    icon:'⚔',
    desc:'Wartime only. If carried, the estates formally back the liege’s war, and your name is attached to the authorization.',
    family:'war',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'one-shot',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:7,
    gate:'parliament_gate_war_authorization',
    posture:{ traits:{ brave:8, craven:-8, zealous:4, wrathful:6 } }
  },
  war_condemnation: {
    name:'War Condemnation',
    icon:'🕊',
    desc:'Wartime only. If carried, the estates formally condemn the liege’s war — a dangerous fame, and the liege will not forget its author.',
    family:'war',
    institution:'estates',
    proposer:'vassal',
    minTier:3, maxTier:5,
    states:'one-shot',
    cooldown:'year',
    repeal:'none',
    emergency:false,
    order:8,
    gate:'parliament_gate_war_condemnation',
    posture:{ traits:{ brave:-8, craven:8, patient:4, kind:4 } }
  }
};
