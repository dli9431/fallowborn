/* Fallowborn — decision events for hostile intrigue. Resolution and exact
   identity validation live in js/intrigue.js; saved contexts contain ids and
   generation stamps, never rendered prose. */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(
{ id:'intrigue_warning', title:'A Thread in the Dark',
  trigger:{ never:true }, contextValidator:'intrigue_warning_valid',
  text:'A frightened servant brings one clue: someone is preparing a grave attack on {student}. There is time for one response before the attempt.',
  options:[
    { label:'Investigate the clue.', desc:'Try to identify the plotter and weaken the attempt.', effects:{ custom:'intrigue_warning_investigate' } },
    { label:'Hire guards and tasters. ({money:15})', require:{ goldMin:15 }, desc:'Pay for security that sharply reduces the attempt’s chance.', effects:{ gold:-15, custom:'intrigue_warning_security' } },
    { label:'Set a counter-trap.', desc:'Risk strengthening the attempt in order to cancel it and catch its author.', effects:{ custom:'intrigue_warning_countertrap' } },
    { label:'Ignore the warning.', desc:'Make no preparation. The attempt proceeds at its full strength.', effects:{ custom:'intrigue_warning_ignore' } }
  ] },
{ id:'intrigue_hearing', title:'Called to Answer',
  trigger:{ never:true }, contextValidator:'intrigue_hearing_valid',
  text:{ select:'value', param:'sentence', cases:{
    compensation:'Evidence links your house to a hostile scheme. The lawful court projects compensation of {money:fine}, but will hear your answer first.',
    penance:'Evidence links your house to a hostile scheme. The lawful court projects public religious penance, but will hear your answer first.',
    prison:'Evidence links your house to a hostile scheme. The lawful court projects a year of imprisonment, but will hear your answer first.',
    forfeiture:'Evidence links your house to a hostile scheme. The lawful court projects forfeiture of land and station, but will hear your answer first.',
    outlawry:'Evidence links your house to a hostile scheme. The lawful court projects outlawry and loss of land, but will hear your answer first.',
    monastic_exile:'Evidence links your house to a hostile scheme. The lawful court projects deposition and monastic exile, but will hear your answer first.',
    blinding_deposition:'Evidence links your house to a hostile scheme. The lawful court projects blinding and deposition, but will hear your answer first.',
    execution:'Evidence links your house to a hostile scheme. The lawful court projects execution, but will hear your answer first.',
    qisas:'Evidence links your house to a proven killing. The lawful court projects qisas, but diya or another answer may still be heard.',
    other:'Evidence links your house to a hostile scheme. The lawful court convenes to judge the proof and hear your answer.'
  } },
  options:[
    { label:'Challenge the proof.', desc:'Put your Intrigue against the strength of the evidence.', effects:{ custom:'intrigue_hearing_challenge' } },
    { label:'Offer compensation.', require:{ custom:'intrigue_hearing_can_pay' }, desc:'Pay the projected fine, diya, or wergild and accept public blame.', effects:{ custom:'intrigue_hearing_pay' } },
    { label:'Accept religious penance.', require:{ custom:'intrigue_hearing_can_penance' }, desc:'Submit to a public spiritual sentence where the court permits it.', effects:{ custom:'intrigue_hearing_penance' } },
    { label:'Submit to sentence.', desc:'Accept the court’s projected lawful punishment.', effects:{ custom:'intrigue_hearing_submit' } },
    { label:'Flee before judgment.', desc:'Abandon land and station to carry the household beyond the court’s reach.', effects:{ custom:'intrigue_hearing_flee' } },
    { label:'Resist with force.', require:{ custom:'intrigue_hearing_can_resist' }, desc:'Answer forfeiture through the existing attainder and independence-war path.', effects:{ custom:'intrigue_hearing_resist' } }
  ] },
{ id:'intrigue_captive_ransom', title:'A Ransom from the Shadows',
  trigger:{ never:true }, contextValidator:'intrigue_captive_ransom_valid',
  text:'Your captor offers release for {money:ransom}. Refuse, and the hidden confinement continues while your household waits.',
  options:[
    { label:'Pay the ransom. ({money:ransom})', require:{ custom:'intrigue_captive_ransom_can_pay' }, desc:'Pay the recorded demand and return home.', effects:{ custom:'intrigue_captive_ransom_pay' } },
    { label:'Refuse.', desc:'Remain captive and trust to escape or the captor’s death.', effects:{ custom:'intrigue_captive_ransom_refuse' } }
  ] }
);
