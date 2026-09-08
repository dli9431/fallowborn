/* =========================================================================
   Fallowborn — TOURNAMENT EVENTS: bounded jousting invitations for the
   gentry (tier 2) and landed lords (tier 3+). Participation only — no
   hosting, brackets, entrant rosters, or tournament calendar (see
   docs/plans/archive/political-choice-war-depth-and-life-paths.md, step 4).
   Every mounted contest resolves through the existing 'battle' named
   chance: Martial, Brave/Craven, holdings, worn battle gear, blessings.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ================= GENTRY (tier 2) ================= */
{ id:'tournament_invitation', title:'An Invitation to the Lists',
  trigger:{ tierMin:2, tierMax:2, professions:['noble'], seasons:[0,1], chance:0.3 },
  weight:8, cooldown:12,
  text:{ default:'Word rides ahead of the heralds: {lord} proclaims a tourney for the dry roads — bright harness, blunted lances, a melee for the young swords, and a champion’s purse. Every ambitious blade in the province means to be there. Will you ride in the lists?',
    muslim:'Word rides ahead of the heralds: {lord} proclaims a furusiyya contest for the dry roads — fine horses, lance and sword from the saddle, and rich prizes for the finest rider. Every bold young blade in the province means to show his horsemanship. Will you ride?',
    pagan:'Word rides ahead of the heralds: {lord} proclaims great games for the dry roads — horse-combats, blunted spears, and an honor-price for the boldest rider. Every young spear in the province means to make a name. Will you ride?' },
  options:[
    { label:'Ride in the joust. ({money:10} for harness and heralds)',
      require:{ goldMin:10 },
      requiresTech:'cavalry_lances', showWhenTechLocked:true,
      desc:'The entry gift buys your place in the lists. The champion’s purse is {money:20}; the price of defeat is a hard fall.',
      effects:{ gold:-10 }, chance:'battle',
      success:{ text:'You win the joust and receive the champion’s purse from {lord}.',
        effects:{ gold:20, prestige:15, skills:{mar:1}, opinion:{role:'lord', amt:8}, log:'Won the joust at a tourney.' } },
      failure:{ text:'You are unhorsed and injured; your opponent wins the joust.',
        effects:{ health:-2, prestige:2 } } },
    { label:'Fight in the melee.',
      desc:'Blunted steel in the press — a smaller prize, and softer falls.',
      chance:'battle',
      success:{ text:'You win the melee and earn the captains’ respect.',
        effects:{ gold:8, prestige:8, skills:{mar:1}, opinion:{role:'lord', amt:4} } },
      failure:{ text:'An injury ends your melee; the surgeon tends your wounds.',
        effects:{ health:-1, prestige:1 } } },
    { label:'Wager {money:5} on the champion.',
      require:{ goldMin:5, religionGroups:['christian','pagan','jewish'] },
      desc:'Coin says another man bleeds for you.',
      chance:0.5,
      success:{ text:'Your chosen champion wins, and your wager pays out.',
        effects:{ gold:8 } },
      failure:{ text:'Your chosen champion loses, and so does your wager.',
        effects:{ gold:-5 } } },
    { label:'Make a gift to the host’s stable. ({money:5})',
      require:{ goldMin:5, religionGroups:['muslim'] },
      desc:'A gift in place of a wager — here, generosity is its own bet.',
      effects:{ gold:-5, prestige:3, opinion:{role:'lord', amt:6} } },
    { label:'Watch from the stands as {lord}’s guest.',
      desc:'No lance, no risk — good company and better talk.',
      effects:{ opinion:{role:'lord', amt:5}, skills:{dip:1} } },
    { label:'Send your regrets.',
      desc:'A quiet day at home, and a faintly cooler hall.',
      effects:{ opinion:{role:'lord', amt:-2} } }
  ]},

/* ================= LANDED (tier 3+) ================= */
{ id:'tournament_invitation_lord', title:'A Great Tourney',
  trigger:{ tierMin:3, seasons:[0,1], chance:0.25 },
  weight:6, cooldown:16,
  text:{ default:'{lord} proclaims a great tourney and begs the honor of your presence: two days of lances when the spring roads dry, a melee for the young swords, and a champion’s purse of {money:40}. Landless knights and lords’ heirs will ride from three provinces away. Will you enter the lists?',
    muslim:'{lord} proclaims a great furusiyya contest and begs the honor of your presence: two days of mounted lance and sword when the spring roads dry, and a champion’s prize of {money:40}. Riders of name will come from three provinces away. Will you enter the maydan?',
    pagan:'{lord} proclaims great games and begs the honor of your presence: two days of horse-combat when the spring roads dry, a spear-press for the young warriors, and an honor-price of {money:40}. Famous riders will come from three provinces away. Will you ride?' },
  options:[
    { label:'Enter the joust. ({money:25} in harness and herald’s fees)',
      require:{ goldMin:25 },
      requiresTech:'cavalry_lances', showWhenTechLocked:true,
      desc:'Your entry gift and fees stake {money:25} against the {money:40} purse — and against a very public fall.',
      effects:{ gold:-25 }, chance:'battle',
      success:{ text:'You win the great joust, and {lord} names you champion.',
        effects:{ gold:40, prestige:20, skills:{mar:1}, opinion:{role:'lord', amt:10}, log:'Carried the lists at a great tourney.' } },
      failure:{ text:'You lose the great joust and leave the lists injured.',
        effects:{ health:-2, prestige:3 } } },
    { label:'Ride in the melee.',
      desc:'Lead your sworn swords into the press — glory shared is glory still.',
      chance:'battle',
      success:{ text:'Your riders win the melee and earn the captains’ respect.',
        effects:{ gold:15, prestige:10, skills:{mar:1}, opinion:{role:'lord', amt:5} } },
      failure:{ text:'Your riders lose the melee; you recover your battered equipment.',
        effects:{ health:-1, prestige:2 } } },
    { label:'Wager {money:20} on the champion.',
      require:{ goldMin:20, religionGroups:['christian','pagan','jewish'] },
      desc:'A lord’s wager, loudly made — the stands will remember either way.',
      chance:0.5,
      success:{ text:'Your chosen champion wins, and your wager pays out.',
        effects:{ gold:30 } },
      failure:{ text:'Your chosen champion loses, and so does your wager.',
        effects:{ gold:-20, prestige:-2 } } },
    { label:'Patronize a promising rider. ({money:20})',
      require:{ goldMin:20, religionGroups:['muslim'] },
      desc:'Stake a young blade’s harness and entry — patronage outlasts any wager.',
      effects:{ gold:-20, prestige:5, opinion:{role:'lord', amt:10} } },
    { label:'Grace the stands and the feast.',
      desc:'Be seen, be gracious, and let younger backs take the blows.',
      effects:{ prestige:2, opinion:{role:'lord', amt:6}, skills:{dip:1} } },
    { label:'Send your regrets.',
      desc:'Duty keeps you home; the hall will understand.',
      effects:{ } }
  ]}
);
