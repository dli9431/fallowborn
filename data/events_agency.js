/* Fallowborn — queued ruler-agency and managed-family events. */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(
{ id:'ruler_overture', title:'A Letter Between Courts',
  trigger:{ never:true }, contextValidator:'agency_ruler_context_valid',
  text:'A courier from {rulername} of {rname} brings compliments, small news, and a carefully worded invitation to warmer dealings. The letter is friendly; the purpose behind it is not hidden.',
  options:[
    { label:'Answer in the same spirit.',
      desc:'Open a warmer relationship with this ruler.',
      effects:{ custom:'agency_overture_welcome', prestige:2 } },
    { label:'Send a fitting gift. ({money:8})', require:{ goldMin:8 },
      desc:'Coin makes the answer harder to mistake.',
      effects:{ gold:-8, custom:'agency_overture_gift', prestige:3 } },
    { label:'Keep this court at a distance.',
      desc:'The refusal will be remembered.',
      effects:{ custom:'agency_overture_rebuff' } }
  ]},

{ id:'ruler_marriage_offer', title:'A Proposal From {rname}',
  trigger:{ never:true }, contextValidator:'agency_marriage_context_valid',
  text:{ forms:{ select:'value', param:'playerPays', cases:{
    yes:'{rulername} proposes a match between {student} and {partner}. The offer weighs your house’s rank, reputation, faith, and present Standing as carefully as affection. Your house would provide {money:dowry}.',
    no:'{rulername} proposes a match between {student} and {partner}. The offer weighs your house’s rank, reputation, faith, and present Standing as carefully as affection. Their house would provide {money:dowry}.',
    other:'{rulername} proposes a match between {student} and {partner}. The offer weighs your house’s rank, reputation, faith, and present Standing as carefully as affection.'
  }}},
  options:[
    { label:'Accept the match.', require:{ custom:'agency_marriage_affordable' },
      desc:'Seal the betrothal. If both are grown, the wedding follows now; any dowry is settled by the bride’s house.',
      effects:{ custom:'agency_marriage_accept' } },
    { label:'Decline with courtesy.',
      desc:'No match is made, and the proposing court cools toward you.',
      effects:{ custom:'agency_marriage_decline' } }
  ]},

{ id:'family_ambition_request', title:'A Place in the Story',
  trigger:{ never:true }, contextValidator:'agency_family_context_valid',
  text:'{student} speaks plainly about a private ambition: {ambition}. Family can open doors, offer counsel, or make clear that another road would serve the house better.',
  options:[
    { label:'Back the ambition. ({money:5})', require:{ goldMin:5 },
      desc:'Invest coin, instruction, and the family name in this goal.',
      effects:{ gold:-5, custom:'agency_family_support' } },
    { label:'Offer counsel, but no purse.',
      desc:'They remain free to pursue the ambition in their own way.',
      effects:{ custom:'agency_family_counsel' } },
    { label:'Tell them to choose another road.',
      desc:'The ambition changes, and the refusal costs goodwill.',
      effects:{ custom:'agency_family_refuse' } }
  ]},

{ id:'ruler_rebel_intrigue', title:'Foreign Coin in Your Halls',
  trigger:{ never:true }, contextValidator:'agency_rebel_context_valid',
  text:'Agents of {rulername} in {rname} are funding one of your discontented vassals. The money buys messengers, retainers, and the confidence to test an oath already worn thin.',
  options:[
    { label:'Expose the payments before the court.',
      desc:'End the funding and publicly shame its sponsor.',
      effects:{ custom:'agency_rebel_expose', prestige:6 } },
    { label:'Buy back the wavering oath. ({money:15})', require:{ goldMin:15 },
      desc:'End the foreign support by giving the vassal a better reason to stay.',
      effects:{ gold:-15, custom:'agency_rebel_buyoff' } },
    { label:'Watch, and learn who takes the coin.',
      desc:'The rebel funding remains active for now.',
      effects:{ skills:{int:1} } }
  ]}
);
