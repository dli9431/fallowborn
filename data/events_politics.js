/* =========================================================================
   Fallowborn — POLITICAL INSTITUTION EVENTS.
   Collective privilege demands are queued by js/institutions.js after their
   pressure gates are evaluated. Saved context carries only stable ids.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

{ id:'commons_uprising_warning', title:'A Final Petition from {county}',
  trigger:{ never:true }, contextValidator:'commons_uprising_valid',
  text:'Affected counties: {county}. Their commons have not accepted your refusal of {privilege}. Their delegates warn that collection and muster will stop if you leave the grievance unanswered. Grant the concession now, or take {warningDays} days to grant it or restore Popular support above {recoverySupport}. Continued neglect will reduce tax and levy output in every listed county by 25% to 100% for up to {uprisingDays} days, depending on Popular support. At -100 support, collection and muster stop completely.',
  options:[
    { label:'Grant {privilege} in every affected county.',
      effects:{ custom:'commons_uprising_concede', popularOpinion:6, prestige:-2 } },
    { label:'Take time to address the grievance.',
      effects:{ custom:'commons_uprising_defer' } }
  ]},

{ id:'commons_uprising_spread', title:'Unrest Reaches {spreadCounty}',
  trigger:{ never:true }, contextValidator:'commons_uprising_valid',
  text:'The commons of {spreadCounty} join the demand for {privilege}. They have not stopped collection or muster yet. Answer this warning to begin their {warningDays}-day grace period, or settle every affected county now. Restoring Popular support above {recoverySupport} clears outstanding warnings. Existing uprisings keep their own deadlines. Concessions bind your own and subordinate counties; prestige and Popular support change once.',
  options:[
    { label:'Grant {privilege} in every affected county.',
      effects:{ custom:'commons_uprising_concede', popularOpinion:6, prestige:-2 } },
    { label:'Take time to address this county’s grievance.',
      effects:{ custom:'commons_uprising_spread_defer' } }
  ]},

{ id:'commons_uprising_local_negotiation', title:'Local Talks in {localCounty}',
  trigger:{ never:true }, contextValidator:'commons_uprising_local_valid',
  text:'Negotiate {privilege} in your affected directly held counties: {localCounty}. Success ends their resistance and grants the demanded privilege there. Other holders remain responsible for their counties. Failure leaves your existing warning and disruption deadlines unchanged. This is your one local negotiation attempt for this uprising.',
  options:[
    { label:'Negotiate in my directly held counties. ({money:20})', require:{ goldMin:20 },
      effects:{ gold:-20 }, chance:'skill_dip',
      success:{ text:'The delegates accept local terms and end resistance in your directly held counties.',
        effects:{ custom:'commons_uprising_local_settle' } },
      failure:{ text:'Local talks fail. The county deadlines remain unchanged.',
        effects:{ custom:'commons_uprising_local_failed' } } }
  ]},

{ id:'commons_uprising_begins', title:'The Commons Rise in {county}',
  trigger:{ never:true }, contextValidator:'commons_uprising_valid',
  text:'Affected counties: {county}. The refused petition for {privilege} has become open resistance across these holdings. Tax carts stand empty and the muster rolls go unanswered. The latest report puts the county tax and levy reduction at {reduction}%. The penalty follows current Popular support, from 25% at -20 support to 100% at -100, for up to {uprisingDays} days. At sustained low Popular support, resistance can spread to one neighboring county every {spreadDays} days, including subordinate lands. Each new county receives its own warning and deadline. A successful response settles all listed counties. Concessions apply in each county; money, prestige, and Popular support changes are charged once.',
  options:[
    { label:'Grant {privilege} in every affected county.',
      effects:{ custom:'commons_uprising_concede', popularOpinion:6, prestige:-2 } },
    { label:'Negotiate a settlement. ({money:20})', require:{ goldMin:20 },
      desc:'Diplomacy may secure the demanded concession. Failure leaves the county disruption until its original end date.',
      effects:{ gold:-20 }, chance:'skill_dip',
      success:{ text:'The delegates accept the concession and call their neighbors home.',
        effects:{ custom:'commons_uprising_concede', popularOpinion:6 } },
      failure:{ text:'The delegates reject the talks. Collection and muster remain disrupted until the rising disperses.',
        effects:{ custom:'commons_uprising_endure' } } },
    { label:'Send the county officers. ({money:20})', require:{ goldMin:20 },
      desc:'Suppression has a 65% chance of ending the uprising. Popular support falls by 8 on success or 12 on failure; failure leaves the original disruption in every affected county.',
      effects:{ gold:-20 }, chance:0.65,
      success:{ text:'The officers reopen the roads and scatter the gatherings. The commons remember the force used.',
        effects:{ custom:'commons_uprising_suppress', popularOpinion:-8 } },
      failure:{ text:'The officers withdraw before the crowds. The failed suppression deepens resentment.',
        effects:{ custom:'commons_uprising_endure', popularOpinion:-12 } } },
    { label:'Endure the disruption.',
      effects:{ custom:'commons_uprising_endure' } }
  ]},


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
      success:{ text:'Both sides accept a settlement granting the demanded privilege.',
        effects:{ custom:'collective_demand_compromise' } },
      failure:{ text:'Negotiations fail, leaving the delegates divided and angry.',
        effects:{ custom:'collective_demand_negotiation_failed' } } },
    { label:'Refuse the demand.',
      desc:'The constituency organizes around the refusal. At low Popular support, a refused commons demand in a directly held county may lead to a final uprising warning.',
      effects:{ custom:'collective_demand_refuse', prestige:3,
        log:'Refused a collective demand for {privilege}.' } }
  ]},

/* ---- royal policy stories (step 7: religious tolerance & settlement) ----
   Slot-day events gated by the standing crown policy levels maintained in
   js/institutions.js. They add narrative and ledger pressure on top of the
   policy's standing county modifiers; none of them rewrites a county's
   faith, moves a population record, or erases a local identity. */

{ id:'realm_policy_persecution_unrest', title:'The Burned Prayer-House',
  trigger:{ tierMin:6, custom:'realm_policy_persecution_due', chance:0.35 },
  weight:6, cooldown:6,
  text:'Word comes from a minority parish: your informers named a gathering, the sheriff’s men broke the doors, and the prayer-house burned with its scrolls inside. The survivors stand silent in the market square, and every hand in the crowd is watching yours.',
  options:[
    { label:'Let the sheriffs loose.',
      desc:'Fines and examples fill the treasury and empty the streets. The persecuted will remember.',
      effects:{ gold:12, piety:3, popularOpinion:-6,
        custom:'realm_policy_persecution_noted',
        log:'Fined and harried a minority congregation.' } },
    { label:'Quietly restrain the zealots.',
      desc:'Protection costs clerical goodwill, but the square goes home unbloodied.',
      effects:{ piety:-4, popularOpinion:4,
        log:'Restrained the persecution’s zealots.' } }
  ]},
{ id:'realm_policy_settlers_arrive', title:'Newcomers at the Boundary Stones',
  trigger:{ tierMin:6, custom:'realm_policy_encouraged_settlement_due', chance:0.35 },
  weight:6, cooldown:6,
  text:'Drawn by your posted protections, a train of newcomers asks leave to settle: ditchers and thatchers, a lettered physician, and a merchant family with their weights and bales. Their ways are not wholly your ways, and the older villagers are counting heads.',
  options:[
    { label:'Grant them the waste plots.', desc:'Coin for seed and timber; new fields answer within the year.',
      effects:{ gold:-10, prestige:3, popularOpinion:3,
        custom:'realm_policy_settlers_welcome',
        log:'Settled newcomers on the waste plots.' } },
    { label:'Take their surety and put the specialists to work.', desc:'A fee for the license, and the learned among them copy and teach.',
      effects:{ gold:8, custom:'realm_policy_settlers_employ',
        log:'Licensed invited specialists and merchants.' } },
    { label:'Turn them away.', desc:'The villages approve; the roads learn to pass you by.',
      effects:{ popularOpinion:2, prestige:-2,
        log:'Turned newcomers away at the boundary stones.' } }
  ]},
{ id:'realm_policy_refugees_shelter', title:'Refugees Beg the Crown’s Peace',
  trigger:{ tierMin:6, custom:'realm_policy_protected_worship_due', chance:0.3 },
  weight:5, cooldown:8,
  text:'A ragged column reaches your seat: families of another faith, burned out by a harder lord across the border, who have heard that your written protection holds. Their priests carry what books they saved. The foreign court that expelled them is watching what your charter is worth.',
  options:[
    { label:'Shelter them under the charter.', desc:'Feed and settle them; the letter of your protection becomes fact.',
      effects:{ gold:-5, popularOpinion:4, piety:2,
        custom:'realm_policy_refugees_welcome',
        log:'Sheltered faith refugees under the charter.' } },
    { label:'Turn them back at the border.', desc:'Their own lord’s problem remains his own; your neighbors note the charter’s worth.',
      effects:{ piety:-3, popularOpinion:-2,
        custom:'realm_policy_refugees_refused',
        log:'Turned faith refugees back at the border.' } }
  ]}

);
