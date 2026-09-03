/* Fallowborn — the Estates policy catalog: laws and reforms a sworn lord
   (tiers 3–5) can campaign for before the liege’s assembly. Each def declares
   the proposal flow contract; the campaign, lobbying, and recorded bloc vote
   are resolved generically by js/politics.js and js/parliament.js. Outcome
   text and effects stay in the policy’s result event (data/events_parliament.js),
   so visible and autoresolved votes remain equivalent. Bloc-interest weights
   per policy live in the `motions` maps of data/political_blocs.js; the
   aid, ruler-age, territorial economic-power, Martial, and per-trait posture
   adjustments live in each def’s `posture`.
   A `gate` names an FB.fns fn that returns true when the policy may be
   proposed, or a localized reason string when it may not. Runtime mods may
   replace complete definitions through the top-level `policies` key.

   The catalog also carries crown-side royal policy (`institution:'crown'`):
   standing laws the sovereign player (tier 6+) proclaims directly, with no
   Estates campaign or bloc vote. Such a def declares ordered mutually
   exclusive `levels`; each level may carry a county `modifier` (applied to
   every county the player holds directly, or only minority-faith ones when
   `modifierScope:'minority'`), a `seasonPiety` trickle, a `researchFactor`
   on the player realm’s research rate, a `migrationAttraction` shift for
   player-owned counties, `developmentGrowth` (a seasonal chance to raise one
   held county’s development), and one-proclamation `onEnact` reactions
   (piety, prestige, authority, Common Voice, religious-head and foreign
   Standing, vassal Standing by faith, and a mistreatment note). The engine
   is js/institutions.js; the Estates machinery below ignores these defs. */
window.FBDATA = window.FBDATA || {};

FBDATA.policies = {
  redress: {
    name:'Redress of the Aid',
    icon:'⚖',
    desc:'If carried, the liege’s aid falls one step. Recorded Customary Law also confirms your home county’s custom in writing.',
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
    posture:{ aidSlope:100, ageSlope:2, economicPowerSlope:6, traits:{
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
    posture:{ economicPowerSlope:6,
      traits:{ generous:8, greedy:-8, brave:4 } }
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
    requiresTech:'scutage',
    gate:'parliament_gate_scutage',
    posture:{ aidSlope:-60, martialSlope:2, ageSlope:4,
      economicPowerSlope:6, traits:{
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
    posture:{ ageSlope:2, traits:{ brave:-4, craven:6 } }
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
    requiresTech:['urban_markets','authenticated_seals'],
    gate:'parliament_gate_market_charter',
    resultEvent:'parliament_market_charter_grant',
    posture:{ economicPowerSlope:6, traits:{ greedy:6, generous:-4 } }
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
    requiresTech:'customary_law',
    gate:'parliament_gate_local_custom',
    posture:{ ageSlope:2, traits:{ content:6, ambitious:-6, proud:4 } }
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
    requiresTech:'representative_estates',
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
    posture:{ ageSlope:-4, economicPowerSlope:4,
      traits:{ brave:8, craven:-8, zealous:4, wrathful:6 } }
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
    posture:{ ageSlope:4, economicPowerSlope:-4,
      traits:{ brave:-8, craven:8, patient:4, kind:4 } }
  },
  religious_tolerance: {
    name:'Religious Tolerance',
    icon:'🕯',
    desc:'The crown’s standing law for subjects who keep another faith. No proclamation rewrites a county’s faith; the law decides only how the realm treats the difference.',
    family:'faith',
    institution:'crown',
    proposer:'ruler',
    minTier:6, maxTier:7,
    states:'levels',
    defaultLevel:'confessional_preference',
    cooldown:'year',
    repeal:'proclamation',
    emergency:false,
    order:9,
    levels:[
      { id:'persecution', name:'Persecution', icon:'🔥',
        desc:'The minority faith is harried: gatherings dispersed, houses of prayer closed, informers paid. The clergy approve and the treasury takes its fines; the persecuted nurse a grievance that outlives the reign.',
        modifier:'persecuted_minorities', modifierScope:'minority',
        seasonPiety:2, researchFactor:-0.15,
        onEnact:{ piety:10, authority:4, pop:-6, headFaith:8,
          sameFold:3, otherFold:-8, vassalSameFaith:2, vassalOtherFaith:-15,
          mistreatment:'religious_persecution' } },
      { id:'confessional_preference', name:'Confessional Preference', icon:'⛪',
        desc:'The customary peace: the realm’s faith holds first place in law and custom, and other faiths keep their parishes without the crown’s protection or its particular attention.' },
      { id:'tolerated_minorities', name:'Tolerated Minorities', icon:'🕊',
        desc:'Other faiths worship openly under the king’s peace. Their markets and workshops prosper; the stricter clergy grumble.',
        modifier:'tolerated_minorities', modifierScope:'minority',
        researchFactor:0.05,
        onEnact:{ prestige:4, authority:-2, pop:3, headFaith:-4,
          sameFold:-2, otherFold:4, vassalOtherFaith:8 } },
      { id:'protected_worship', name:'Protected Worship', icon:'📜',
        desc:'Minority congregations receive the crown’s written protection: worship, persons, and market rights guaranteed by charter. Withdrawing the charter before its protected term is an unlawful revocation.',
        modifier:'protected_worship', modifierScope:'minority',
        privilege:'protected_worship', protectedTerm:true,
        seasonPiety:-1, researchFactor:0.10,
        onEnact:{ piety:-5, prestige:6, authority:-3, pop:5, headFaith:-10,
          sameFold:-4, otherFold:8, vassalSameFaith:-2, vassalOtherFaith:12 } }
    ]
  },
  settlement_policy: {
    name:'Settlement Policy',
    icon:'🏕',
    desc:'The crown’s standing law for newcomers: who may cross the boundary stones to settle, work, and trade in your counties.',
    family:'settlement',
    institution:'crown',
    proposer:'ruler',
    minTier:6, maxTier:7,
    states:'levels',
    defaultLevel:'licensed_newcomers',
    cooldown:'year',
    repeal:'proclamation',
    emergency:false,
    order:10,
    levels:[
      { id:'closed_settlement', name:'Closed Settlement', icon:'🚪',
        desc:'Strangers are turned back at the boundary stones. The villages approve of work and land kept for their own sons; the markets thin and the roads empty.',
        modifier:'closed_settlement', modifierScope:'all',
        migrationAttraction:-2,
        onEnact:{ pop:6, prestige:-2, authority:1, otherFold:-2 } },
      { id:'licensed_newcomers', name:'Licensed Newcomers', icon:'📜',
        desc:'The customary rule: a newcomer with a lord’s license, a craft, or a merchant’s surety may settle; the shiftless are moved along. Neither gate nor bounty.' },
      { id:'encouraged_settlement', name:'Encouraged Settlement', icon:'🏕',
        desc:'The crown pays to plant newcomers on waste and street: posted protections, seed grain, and remitted dues draw settlers, specialists, and refugees — at a standing seasonal cost in every county you hold.',
        modifier:'encouraged_settlement', modifierScope:'all',
        migrationAttraction:2, developmentGrowth:true, researchFactor:0.05,
        onEnact:{ pop:2, prestige:4, authority:-1, otherFold:2 } }
    ]
  }
};
