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
