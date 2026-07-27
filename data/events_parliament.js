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
      success:{ text:'Lord by lord, the benches shake their heads. The steward folds his tally. The demand dies in the hall — and the liege marks who led the “no.”', effects:{ custom:'parliament_aid_hike_rebuff', prestige:3 } },
      failure:{ text:'Too many lords owe the crown favors, or fear it. The aid is voted through, and the liege’s cut of your revenue grows.', effects:{ custom:'parliament_aid_up', opinionLiege:-5 } } },
    { label:'Refuse to your feet, alone if need be.', desc:'Defiance is remembered — in both directions.', effects:{ opinionLiege:-15, prestige:2 } }
  ]},

/* ---- the player's own motions (the 🏛 Estates deed) ---- */
{ id:'parliament_redress', title:'A Motion for Redress',
  trigger:{ never:true }, /* queued from the Estates deed */
  text:'Your own parchment is read to the assembled lords: a motion for redress of grievances — that the aid exacted by {liege} is heavier than custom allows, and should be lowered. The benches murmur. The liege’s face gives nothing away, which says everything.',
  options:[
    { label:'Press the motion to a vote.', desc:'The estates decide — rank, name, and the liege’s favor all count now.', require:{ custom:'parliament_redress_possible' }, chance:'parliament_vote',
      success:{ text:'It carries — first by voices, then by a show of hands the steward cannot ignore. The aid falls. The liege inclines his head to you with great courtesy, which costs him nothing and promises nothing good.', effects:{ custom:'parliament_redress_won', addModifier:{id:'custom_confirmed'}, prestige:5, log:'Won redress of grievances in the estates.' } },
      failure:{ text:'The hands stay down. Your motion dies in a long silence, and the liege’s smile finds you across the hall.', effects:{ custom:'parliament_redress_lost', prestige:-4 } } },
    { label:'Let it be talked out, and withdraw.', desc:'Some motions serve better as threats than as votes.', effects:{ prestige:-2 } }
  ]},
{ id:'parliament_scutage', title:'A Motion for Scutage',
  trigger:{ never:true }, /* queued from the Estates deed */
  text:'Your motion before the estates: that the lords of the realm may answer {liege}’s banner call with silver instead of service — scutage, the shield-tax, as the old charters name it. The young lords who love a campaign scoff; the old ones with roofs to mend lean forward.',
  options:[
    { label:'Press the motion to a vote.', desc:'The crown will want its pound in coin — a small standing rise in the aid.', require:{ custom:'parliament_scutage_possible' }, chance:'parliament_vote',
      success:{ text:'The motion carries, to the relief of every manor with a leaking hall. Henceforth the liege’s summons can be answered with a purse — and the aid creeps up to pay for the privilege.', effects:{ custom:'parliament_scutage_pass', prestige:4, log:'Carried a scutage motion in the estates.' } },
      failure:{ text:'The war-hungry lords shout it down: what is a vassal without his spear? The liege looks pleased, and looks at you.', effects:{ opinionLiege:-6, prestige:-3 } } },
    { label:'Let it be talked out, and withdraw.', desc:'A poor season for it. Another year, perhaps.', effects:{ prestige:-2 } }
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
      success:{ text:'Your seconding carries the hall; the old lord wins his judgment and grips your hand till it hurts. The liege’s clerks write something down.', effects:{ prestige:5, opinionLiege:-4 } },
      failure:{ text:'The hall is not with you today. The old lord’s suit fails, and you have spent favor on a losing cause.', effects:{ opinionLiege:-8, prestige:-2 } } },
    { label:'Murmur sympathy, and drift away.', desc:'Another man’s quarrel, another man’s risk.', effects:{} }
  ]}
);
