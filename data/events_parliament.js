/* =========================================================================
   Fallowborn — PARLIAMENT EVENTS: the estates of the realm (vassal tiers 3-5).
   A sworn lord sits in the liege's assembly, where the terms of service are
   haggled over: the aid (the liege's cut of vassal revenue) and scutage
   (silver for banner service). All events are queued — sessions arrive via
   FB.parliamentYearly, the player's own motions via the 🏛 Estates deed.
   Triggers and effects named parliament_* live in js/parliament.js. See
   docs/designs/parliament.md.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ---- the ordinary sitting: mixed business and court gossip ---- */
{ id:'parliament_session', title:'The Estates Assemble',
  trigger:{ never:true }, /* queued by FB.parliamentYearly */
  text:'The lords of the realm gather at {liege}’s summons: petty business mostly — a boundary dispute, a widow’s dower, a reading of old charters — but every bench is a pair of ears, and every recess a market of favors.',
  options:[
    { label:'Work the benches.', desc:'A kind word here, a promised favor there — court craft in miniature.', chance:'skill_dip',
      success:{ text:'You leave the hall with three new friends and a standing invitation. Your name is warming in the realm.', effects:{ opinionLiege:6, prestige:3 } },
      failure:{ text:'You mistake a proud old lord for a petitioner and compound it with a joke. A few smiles, poorly hidden.', effects:{ prestige:-2 } } },
    { label:'Listen and take notes.', desc:'How the great ones argue, flatter, and threaten — a free education.', effects:{ skills:{dip:1}, research:3 } },
    { label:'Sit quiet and keep your head down.', desc:'The unremarked lord keeps what he has.', effects:{} }
  ]},

/* ---- the liege's demand: a greater aid ---- */
{ id:'parliament_aid_hike', title:'The Liege Demands an Aid',
  trigger:{ never:true }, /* queued by FB.parliamentYearly */
  text:'The hall is full and the mood is sour before the first word: {liege}’s steward reads the demand twice over — a greater aid from every vassal, a heavier cut of every rent and toll, “for the good of the realm.” The benches turn to look at the men who will answer first. One of them is you.',
  options:[
    { label:'Rise and consent at once.', desc:'First voice for the crown buys the crown’s notice.', effects:{ custom:'parliament_aid_up', opinionLiege:10, prestige:-2 } },
    { label:'Put it to the estates.', desc:'The lords vote — your voice carries as far as your rank and name.', chance:'parliament_vote',
      success:{ text:'Lord by lord, the benches shake their heads. The steward folds his tally. The demand dies in the hall — and the liege marks who led the “no.”', effects:{ custom:'parliament_aid_hike_rebuff', prestige:3, traitProgress:{id:'moot_speaker'} } },
      failure:{ text:'Too many lords owe the crown favors, or fear it. The aid is voted through, and the liege’s cut of your revenue grows.', effects:{ custom:'parliament_aid_up', opinionLiege:-5, removeTrait:'moot_speaker' } } },
    { label:'Refuse to your feet, alone if need be.', desc:'Defiance is remembered — in both directions.', effects:{ opinionLiege:-15, prestige:2 } }
  ]},

/* ---- the player's own motions (the 🏛 Estates deed) ---- */
{ id:'parliament_redress', title:'A Motion for Redress',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'Your own parchment is read to the assembled lords: a motion for redress of grievances — that the aid exacted by {liege} is heavier than custom allows, and should be lowered. The benches murmur. The liege’s face gives nothing away, which says everything.',
  options:[
    { label:'Receive the carried vote.', desc:'It carries — first by voices, then by a show of hands the steward cannot ignore. The aid falls, and the liege’s courtesy promises nothing good.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_redress_won', addModifier:{id:'custom_confirmed'}, prestige:5, traitProgress:{id:'moot_speaker'}, log:'Won redress of grievances in the estates.' } },
    { label:'Accept the failed vote.', desc:'The hands stay down. Your motion dies in a long silence, and the liege’s smile finds you across the hall.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_redress_lost', prestige:-4, removeTrait:'moot_speaker' } }
  ]},
{ id:'parliament_scutage', title:'A Motion for Scutage',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'Your motion before the estates: that the lords of the realm may answer {liege}’s banner call with silver instead of service — scutage, the shield-tax, as the old charters name it. The young lords who love a campaign scoff; the old ones with roofs to mend lean forward.',
  options:[
    { label:'Receive the carried vote.', desc:'The motion carries. Henceforth the liege’s summons can be answered with a purse, and the aid creeps up to pay for the privilege.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_scutage_pass', prestige:4, traitProgress:{id:'moot_speaker'}, log:'Carried a scutage motion in the estates.' } },
    { label:'Accept the failed vote.', desc:'The war-hungry lords shout it down. The liege looks pleased, and looks at you.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_scutage_lost', opinionLiege:-6, prestige:-3, removeTrait:'moot_speaker' } }
  ]},

/* ---- policy catalog result events (data/policies.js) ---- */
{ id:'parliament_emergency_subsidy', title:'A Motion for an Emergency Subsidy',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'With the realm at war, your parchment asks the assembled lords to open their purses for {liege}: an emergency subsidy, voted here and now, to keep the campaign fed. The benches count the cost in their heads; every eye that turns to you is weighing your loyalty against your purse.',
  options:[
    { label:'Receive the carried vote.', desc:'The subsidy carries. You pay your share at the steward’s table before the ink is dry, and the liege’s gratitude is loud enough for the hall to hear.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_emergency_subsidy_won', prestige:4, traitProgress:{id:'moot_speaker'}, log:'Carried an emergency war subsidy in the estates.' } },
    { label:'Accept the failed vote.', desc:'The purses stay shut. Your loyalty is noted — and so is your failure to deliver the hall.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_motion_done', opinionLiege:-4, prestige:-3, removeTrait:'moot_speaker' } }
  ]},

{ id:'parliament_levy_relief', title:'A Motion for Levy Relief',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'Your motion before the estates: that your home county, thinned by years of musters, be spared the levy for a season of seasons — and that the aid rise in exchange, so {liege}’s chest loses nothing. The lords with villages of their own to strip listen closely.',
  options:[
    { label:'Receive the carried vote.', desc:'It carries. The tallymen will pass your county by, and the collectors will not — a bargain your people will bless and your rents will feel.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_levy_relief_won', prestige:3, traitProgress:{id:'moot_speaker'}, log:'Won levy relief for the home county in the estates.' } },
    { label:'Accept the failed vote.', desc:'The hall is not moved. The muster rolls will keep your county’s name where it is.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_motion_done', prestige:-2, removeTrait:'moot_speaker' } }
  ]},

{ id:'parliament_market_charter_grant', title:'A Motion for a Market Charter',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'Your motion asks {liege}’s grace for a chartered market in your home county: stalls by the church door, tolls honestly taken, building timber bought without a week’s bargaining. The guild men smile; the lords who farm their own tolls do not.',
  options:[
    { label:'Receive the carried vote.', desc:'The charter is granted under the assembly’s seal. Within the month the first stalls go up by the church door.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_motion_done', addModifier:{id:'market_charter'}, prestige:4, traitProgress:{id:'moot_speaker'}, log:'Won a market charter for the home county in the estates.' } },
    { label:'Accept the failed vote.', desc:'The toll-farmers have too many friends on the benches. The charter dies unsealed.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_motion_done', prestige:-2, removeTrait:'moot_speaker' } }
  ]},

{ id:'parliament_local_custom', title:'A Motion to Confirm Local Custom',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'Your motion is a quiet one: that the old customs of your home county — the gleaning rights, the mill tolls, the parish feasts — be written and confirmed, so no steward’s whim can tax them away. The commons will hear of whoever speaks for this, and of whoever does not.',
  options:[
    { label:'Receive the carried vote.', desc:'The customs are read, witnessed, and sealed. In your county the news travels faster than the parchment.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_motion_done', addModifier:{id:'custom_confirmed'}, prestige:4, traitProgress:{id:'moot_speaker'}, log:'Had the home county’s customs confirmed by the estates.' } },
    { label:'Accept the failed vote.', desc:'The lords will not bind their own stewards. Your county’s customs remain exactly as strong as your arm.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_motion_done', prestige:-2, removeTrait:'moot_speaker' } }
  ]},

{ id:'parliament_revocation_consent', title:'A Motion for the Consent of the Estates',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'This is no small parchment. Your motion would bind {liege} by oath: no aid raised, no new exaction laid, without the consent of the assembled estates. The hall has gone very quiet. Every lord here has dreamed of such a law; few have dared to move it.',
  options:[
    { label:'Receive the carried vote.', desc:'Against every expectation, it carries. The liege’s steward writes the oath into the roll with a hand that does not shake. Much.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_revocation_consent_pass', prestige:6, traitProgress:{id:'moot_speaker'}, log:'Bound the liege to seek the estates’ consent for new aids.' } },
    { label:'Accept the failed vote.', desc:'Too many benches are owed, bought, or frightened. The motion fails — and the crown now knows exactly who reached for its purse.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_motion_done', opinionLiege:-8, prestige:-3, removeTrait:'moot_speaker' } }
  ]},

{ id:'parliament_war_authorization', title:'A Motion to Authorize the War',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'Your motion asks the estates to say aloud what the crown wants heard: that {liege}’s war is just, necessary, and backed by the assembled lords of the realm. The hawks are already nodding. The older lords are counting their sons.',
  options:[
    { label:'Receive the carried vote.', desc:'The authorization carries, and your name leads it. The liege’s gratitude is real, and publicly given.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_motion_done', opinionLiege:10, prestige:6, traitProgress:{id:'moot_speaker'}, log:'Carried the authorization of the liege’s war in the estates.' } },
    { label:'Accept the failed vote.', desc:'The hall will not bless the war. You stood for the crown and the crown watched you fall.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_motion_done', opinionLiege:-4, prestige:-3, removeTrait:'moot_speaker' } }
  ]},

{ id:'parliament_war_condemnation', title:'A Motion to Condemn the War',
  trigger:{ never:true }, /* queued from the Estates deed */
  contextValidator:'parliament_motion_context_valid',
  text:'Your motion is the dangerous one: that the estates declare {liege}’s war a waste of the realm’s blood and silver, and call for its end. Some lords meet your eye and nod. Others are already composing their report to the crown.',
  options:[
    { label:'Receive the carried vote.', desc:'The condemnation carries. In the county lanes your name is spoken with something like hope; in the liege’s hall, with something else.', require:{ custom:'parliament_motion_passed' },
      effects:{ custom:'parliament_motion_done', opinionLiege:-10, prestige:8, popularOpinion:6, traitProgress:{id:'moot_speaker'}, log:'Carried a condemnation of the liege’s war in the estates.' } },
    { label:'Accept the failed vote.', desc:'The motion dies, and every lord who feared it now knows exactly who moved it.', require:{ custom:'parliament_motion_failed' },
      effects:{ custom:'parliament_motion_done', opinionLiege:-6, prestige:-2, removeTrait:'moot_speaker' } }
  ]},

/* ---- wartime: the subsidy vote ---- */
{ id:'parliament_subsidy', title:'A Subsidy for the Liege’s War',
  trigger:{ never:true }, /* queued by FB.parliamentYearly while the liege fights */
  text:'War has emptied {liege}’s coffers, and the estates are summoned to refill them: a subsidy, voted lord by lord, “for the defense of the realm.” The steward’s clerk has already written your name on the roll, with a space beside it for a number.',
  options:[
    { label:'Vote the subsidy, and give generously. ({money:20})', require:{ goldMin:20 }, desc:'The crown’s gratitude, on the record.', effects:{ custom:'parliament_subsidy_pay', prestige:2 } },
    { label:'Speak against it.', desc:'Wars are the lord’s affair — let the lord’s treasure pay for them.', effects:{ opinionLiege:-8, prestige:2 } }
  ]},

/* ---- a fellow lord's grievance ---- */
{ id:'parliament_grievance', title:'A Fellow Lord’s Grievance',
  trigger:{ never:true }, /* queued by FB.parliamentYearly */
  text:'In the recess, a hoarse old lord corners you by the wine: his grandson’s inheritance was shaved by {liege}’s courts, and he means to stand up in the hall and say so. He wants voices beside his — yours, loudly. The liege’s clerks are watching who nods.',
  options:[
    { label:'Stand with him when he rises.', desc:'The estates remember who shows courage — and so does the crown.', chance:'parliament_vote',
      success:{ text:'Your seconding carries the hall; the old lord wins his judgment and grips your hand till it hurts. The liege’s clerks write something down.', effects:{ prestige:5, opinionLiege:-4, traitProgress:{id:'moot_speaker'} } },
      failure:{ text:'The hall is not with you today. The old lord’s suit fails, and you have damaged your Standing on a losing cause.', effects:{ opinionLiege:-8, prestige:-2, removeTrait:'moot_speaker' } } },
    { label:'Murmur sympathy, and drift away.', desc:'Another man’s quarrel, another man’s risk.', effects:{} }
  ]},

/* ---- intrigue around the obligation record ---- */
{ id:'plot_feudal_obligation', title:'The Sealed Tally',
  trigger:{ never:true }, contextValidator:'plot_event_context_valid',
  text:'Your agents have copied the rolls behind {liege}’s aid: double-counted rents, convenient omissions, and one seal impressed on a night its keeper was elsewhere. The evidence could strengthen a later motion, or the rolls could simply change.',
  options:[
    { label:'Keep the evidence for a motion of redress.', chance:'plot',
      desc:'Success strengthens the next redress vote; failure strengthens the liege’s hand and raises the aid.',
      success:{ text:'The copies, witnesses, and seals agree. Hidden safely, they will carry weight when the estates next vote.',
        effects:{ custom:'plot_obligation_evidence', skills:{int:1} } },
      failure:{ text:'A clerk recognizes the copied hand. The rolls are corrected against you, and the liege answers suspicion with a heavier aid.',
        effects:{ custom:'plot_obligation_failure', prestige:-8 } } },
    { label:'Alter the service roll now. ({money:20})',
      require:{ goldMin:20 },
      desc:'Reduce the existing aid one step without bypassing the estates permanently; lose coin, prestige, and Standing.',
      effects:{ gold:-20, prestige:-5, custom:'plot_obligation_relief' } },
    { label:'Return every copy to the fire.',
      desc:'Leave the existing obligation untouched.',
      effects:{ custom:'plot_end' } }
  ]},

/* ---- authored institution consequences: trade, service, redress, faith ---- */
{ id:'parliament_market_charter', title:'The Market Charter',
  trigger:{ never:true }, /* selected by FB.parliamentSessionCandidates */
  text:'Merchants and guild masters crowd the lower end of the hall while {liege}’s officers argue over tolls. A fixed charter would make trade predictable; a failed settlement would leave every bridge and market claiming a different due.',
  options:[
    { label:'Accept a fair charter and help enforce it. ({money:10})',
      require:{ goldMin:10 },
      desc:'Spend locally, gain the liege’s notice, and put the bargain in writing.',
      effects:{ gold:-10, opinionLiege:5, popularOpinion:3,
        addModifier:{id:'market_charter'} } },
    { label:'Demand lower aid in return for your support.',
      require:{ custom:'parliament_redress_possible' },
      desc:'Put the trade bargain to the benches as a service concession.',
      chance:'parliament_vote',
      success:{ text:'The benches join trade and redress in one settlement. The charter passes, and the liege’s aid falls a step.',
        effects:{ custom:'parliament_trade_redress',
          addModifier:{id:'market_charter'}, prestige:4,
          traitProgress:{id:'moot_speaker'} } },
      failure:{ text:'The bargain collapses in accusation. Toll collectors return to the roads with rival instructions.',
        effects:{ opinionLiege:-8, prestige:-3,
          addModifier:{id:'contested_tolls'},
          removeTrait:'moot_speaker' } } },
    { label:'Reject the charter and keep every old claim alive.',
      desc:'No one yields a right; no trader knows which right will be demanded next.',
      effects:{ opinionLiege:-4, addModifier:{id:'contested_tolls'} } }
  ]},
{ id:'parliament_levy_concession', title:'Service Beyond Custom',
  trigger:{ never:true }, /* selected while the liege realm is at war */
  wartime:true,
  text:'The liege’s captains ask the estates for service beyond custom. The benches answer with three prices: men now, silver every season, or guarded roads that keep the host supplied without stripping another field.',
  options:[
    { label:'Send the extraordinary muster.',
      desc:'The county yields more spears and bears the resentment openly.',
      effects:{ opinionLiege:10, prestige:2,
        addModifier:{id:'muster_burden'} } },
    { label:'Trade a higher aid for temporary exemption.',
      require:{ custom:'parliament_aid_can_rise' },
      desc:'The liege’s revenue rises one step; this county’s levy concession remains bounded.',
      effects:{ custom:'parliament_aid_up', opinionLiege:-2,
        addModifier:{id:'levy_exemption'} } },
    { label:'Pay for patrols and supply officers. ({money:18})',
      require:{ goldMin:18 },
      desc:'Keep the roads open for the host without expanding the local muster.',
      effects:{ gold:-18, opinionLiege:6, prestige:3,
        addModifier:{id:'roads_patrolled'} } }
  ]},
{ id:'parliament_local_redress', title:'Redress for the County',
  trigger:{ never:true }, /* selected when a local dispute is active */
  text:'A delegation from {province} waits while the estates read the petitions. The quarrel is no abstraction now: toll receipts, sworn grievances, and names of households that still remember the last settlement.',
  options:[
    { label:'Settle the disputed tolls. ({money:15})',
      require:{ goldMin:15, hasModifier:'contested_tolls' },
      desc:'Compensate the rival claimants, end the toll dispute, and replace it with a measured charter.',
      effects:{ gold:-15, popularOpinion:5,
        removeModifier:{id:'contested_tolls'},
        addModifier:{id:'market_charter'},
        log:'Settled the county’s disputed tolls before the estates.' } },
    { label:'Hear the grievance and confirm the old custom. ({money:10})',
      require:{ goldMin:10, hasModifier:'settlement_grudge' },
      desc:'Pay for redress, end the grudge, and bind the judgment by charter.',
      effects:{ gold:-10, popularOpinion:6,
        removeModifier:{id:'settlement_grudge'},
        addModifier:{id:'custom_confirmed'},
        log:'Won local redress through the estates.' } },
    { label:'Let the petitions stand over.',
      desc:'The active local consequence remains until another settlement or its natural expiry.',
      effects:{ prestige:-2 } }
  ]},
{ id:'parliament_sanctuary_relief', title:'Sanctuary, Aid, and the Poor',
  trigger:{ never:true }, /* selected in a peacetime sitting */
  text:'The clergy ask the estates to protect sanctuary and relief in {province}; the liege’s officers answer that every exemption leaves another household to serve. The hall must decide whether legitimacy is bought with spears, silver, or mercy.',
  options:[
    { label:'Confirm sanctuary from the levy.',
      desc:'A bounded exemption answers the clergy and the county together.',
      effects:{ piety:8, popularOpinion:5, opinionLiege:-4,
        addModifier:{id:'levy_exemption'} } },
    { label:'Fund relief and patrol the roads. ({money:16})',
      require:{ goldMin:16 },
      desc:'Pay for public relief and the riders who keep it moving.',
      effects:{ gold:-16, piety:4, opinionLiege:3,
        addModifier:{id:'roads_patrolled'} } },
    { label:'Give the liege the service demanded.',
      desc:'The crown is pleased; the county remembers that its petition was refused.',
      effects:{ opinionLiege:6, piety:-4,
        addModifier:{id:'settlement_grudge'} } }
  ]}
);
