/* =========================================================================
   Fallowborn — POLITICAL INSTITUTION EVENTS.
   Collective privilege demands are queued by js/institutions.js after their
   pressure gates are evaluated. Saved context carries only stable ids.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

{ id:'collective_privilege_demand', title:'A Demand for {privilege}',
  trigger:{ never:true }, contextValidator:'collective_demand_valid',
  text:{ forms:{ select:'value', param:'constituency', cases:{
    commons:'Delegates from town and countryside arrive together, carrying seals, witness lists, and a demand for {privilege}. They say that custom has been pressed too far and ask for a written protection that will outlast this audience.',
    guild:'The guild benches speak with one voice. Their wardens lay accounts and petitions before you and demand {privilege}: not a private favor, but public terms for the market and everyone who works in it.',
    faith:'Clergy and lay wardens process to your hall behind a relic and demand {privilege}. They speak of coercion against their community and insist that sacred protection be witnessed in law.',
    magnates:'The leading magnates arrive as a body, each careful to let the others speak first. Their common demand is {privilege}, binding the crown to nomination, confirmation, and protected terms.',
    other:'An organized constituency appears before you with witnesses and a written demand for {privilege}. Refusal will not dissolve them; it will give their opposition a common cause.'
  } } },
  options:[
    { label:'Grant {privilege}.',
      desc:'Record the holder, scope, obligations, protected term, and lawful route of revocation.',
      effects:{ custom:'collective_demand_accept', prestige:-2,
        log:'Granted a collective demand for {privilege}.' } },
    { label:'Negotiate the terms. ({money:20})', require:{ goldMin:20 },
      desc:'Spend on envoys, clerks, and concessions; Diplomacy may secure the same settlement without a public capitulation.',
      effects:{ gold:-20 }, chance:'skill_dip',
      success:{ text:'After days over drafts and precedents, both sides accept a settlement. The demanded privilege is copied into the roll with obligations each side can name.',
        effects:{ custom:'collective_demand_compromise' } },
      failure:{ text:'The talks fail, but the attempt divides the delegates. They leave organized and angry, though not yet united enough to force a realm-wide crisis.',
        effects:{ custom:'collective_demand_negotiation_failed' } } },
    { label:'Refuse the demand.',
      desc:'Keep your immediate freedom of action; the constituency organizes around the refusal.',
      effects:{ custom:'collective_demand_refuse', prestige:3,
        log:'Refused a collective demand for {privilege}.' } }
  ]}

);
