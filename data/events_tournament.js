/* =========================================================================
   Legacy invitations remain for queued saves. Scheduled editions use exact
   event, protagonist, track and round contexts validated by tournaments.js.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ================= GENTRY (tier 2) ================= */
{ id:'tournament_invitation', title:'An Invitation to the Lists',
  trigger:{ never:true },
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
  trigger:{ never:true },
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

FBDATA.events.push(
  { id:'scheduled_games_invitation', title:'Games on the Calendar', trigger:{never:true},
    contextValidator:'scheduled_games_valid',
    text:'{tournamentHost} has funded games at {venue}. The calendar gives the dates, admission terms and funded purses.',
    options:[
      {label:'Review the gathering.', effects:{custom:'scheduled_games_open'}},
      {label:'Leave it on the calendar.', effects:{}}
    ] },
  { id:'scheduled_games_round', title:'The Next Round', trigger:{never:true},
    contextValidator:'scheduled_games_valid',
    text:'Round {roundNumber} at {venue}. Your preparation, individual skill, health and fatigue face a named field. Balanced tactics carry a {injuryRisk}% injury risk, including a {severeRisk}% chance of a severe wound. Severe wounds can be fatal.',
    desc:'Conservative tactics reduce fatigue and injury risk. Aggressive tactics increase performance, fatigue and risk. Assisting a teammate is useful in the team melee. There is no land or army-size bonus. Unanswered rounds use conservative tactics the following day.',
    options:[
      { label:'Keep a conservative pace.', effects:{custom:'scheduled_games_conservative'} },
      { label:'Use balanced tactics.', effects:{custom:'scheduled_games_balanced'} },
      { label:'Press aggressively.', effects:{custom:'scheduled_games_aggressive'} },
      { label:'Assist a teammate.', require:{custom:'scheduled_games_team'}, effects:{custom:'scheduled_games_assist'} },
      { label:'Withdraw from this edition.', effects:{custom:'scheduled_games_withdraw'} }
    ] }
);

/* Individually authored, stable incident ids. */
FBDATA.events.push(
{
  "id": "scheduled_games_rival",
  "title": "A Familiar Challenger",
  "text": "At {venue}, a competitor remembers your last meeting. There is time for a civil exchange before the next activity.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Take time and hear them out.",
      "desc": "Recover 2 fatigue and remember the host as a circuit contact.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_equipment",
  "title": "A Fraying Strap",
  "text": "A fastening needs attention before the next activity at {venue}. Hurrying saves practice time but leaves you tired.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Check the fastening and take a rest.",
      "desc": "Recover 2 fatigue and remember the host as a circuit contact.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_result",
  "title": "A Contested Result",
  "text": "Voices rise around the judges at {venue}. You can hear the other side or press your own account before returning to the games.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Take time and hear them out.",
      "desc": "Recover 2 fatigue and remember the host as a circuit contact.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_injury",
  "title": "At the Treatment Tent",
  "text": "A hard fall brings you to the treatment tent at {venue}. A pause may spare you further fatigue.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Rest in the treatment tent.",
      "desc": "Recover 2 fatigue. Lost health still requires ordinary recovery.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_commission",
  "title": "A Prestigious Commission",
  "text": "The stewards at {venue} ask for careful work. Your signed contract remains fixed; reputation depends on how you complete it.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Complete the commission with care.",
      "desc": "Recover 2 fatigue and gain 2 circuit reputation. The signed payment remains fixed.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_recruitment",
  "title": "An Offer of Service",
  "text": "A visiting household at {venue} asks about your experience. A patient introduction may lead to future service, without binding you to a new profession.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Discuss future service with the household.",
      "desc": "Recover 2 fatigue and gain 3 Standing with the host. No profession changes.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_patron",
  "title": "An Introduction to a Patron",
  "text": "A guest offers an introduction to {tournamentHost}. You can make time for the meeting or remain intent on preparation.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Accept the personal introduction.",
      "desc": "Recover 2 fatigue and gain 3 Standing with the host.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_celebration",
  "title": "The Closing Celebration",
  "text": "The last evening at {venue} brings competitors and workers together. There is time to recover and remember the people met here.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Join the company and exchange good wishes.",
      "desc": "Recover 2 fatigue and gain 1 Standing with the host.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Press on with preparation.",
      "desc": "Gain 1 preparation and 1 fatigue.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Let the moment pass.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_preparation",
  "title": "A Dispute over Preparations",
  "text": "At {venue}, the stewards disagree about access to the field. Your instructions can protect local goodwill.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Hear the villagers and settle it carefully.",
      "desc": "Local Popular support +2; improve the eventual hosting reward.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Insist on the original arrangements.",
      "desc": "Local Popular support -2; reduce the eventual hosting reward.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Leave the decision to the stewards.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_field",
  "title": "Damage to the Field",
  "text": "Rain and traffic have damaged the field at {venue}. The workforce awaits instructions about the remaining preparations.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Hear the villagers and settle it carefully.",
      "desc": "Local Popular support +2; improve the eventual hosting reward.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Insist on the original arrangements.",
      "desc": "Local Popular support -2; reduce the eventual hosting reward.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Leave the decision to the stewards.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
},
{
  "id": "scheduled_games_security",
  "title": "Security at the Games",
  "text": "The guards at {venue} report a quarrel among arriving guests. The manner of your response will be remembered.",
  "trigger": {
    "never": true
  },
  "contextValidator": "scheduled_games_valid",
  "options": [
    {
      "label": "Hear the villagers and settle it carefully.",
      "desc": "Local Popular support +2; improve the eventual hosting reward.",
      "effects": {
        "custom": "scheduled_games_care"
      }
    },
    {
      "label": "Insist on the original arrangements.",
      "desc": "Local Popular support -2; reduce the eventual hosting reward.",
      "effects": {
        "custom": "scheduled_games_firm"
      }
    },
    {
      "label": "Leave the decision to the stewards.",
      "effects": {
        "custom": "scheduled_games_leave"
      }
    }
  ]
}
);
