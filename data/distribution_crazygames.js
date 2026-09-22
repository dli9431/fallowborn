/* Distribution-specific authored alternatives. Standard editions leave all data untouched.
   Apply to cloned definitions before the engine indexes or localizes them. */
(function () {
  'use strict';
  if (window.FB_DISTRIBUTION !== 'crazygames') return;
  var changes = {
  "first_muster": {
    "set": [
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Trade stories with the veterans.",
          "desc": "Listen to the lessons behind their tales.",
          "effects": {
            "skills": {
              "int": 1
            }
          }
        }
      },
      {
        "path": [
          "text"
        ],
        "value": "Drill follows drill. The sergeant calls every careless step, and the company learns to keep its shields together."
      }
    ],
    "text": []
  },
  "camp_fires": {
    "set": [
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Trade stories with the veterans.",
          "desc": "Listen to the lessons behind their tales.",
          "effects": {
            "skills": {
              "int": 1
            }
          }
        }
      },
      {
        "path": [
          "text"
        ],
        "value": "Armies spend much of their time waiting. Around the fires, veterans wrestle and retell battles that grow with every telling."
      }
    ],
    "text": []
  },
  "travel_work_merc_camp": {
    "set": [
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Trade stories with the veterans.",
          "desc": "Listen to the lessons behind their tales.",
          "effects": {
            "skills": {
              "int": 1
            }
          }
        }
      },
      {
        "path": [
          "title"
        ],
        "value": "An Evening with the Company"
      },
      {
        "path": [
          "text"
        ],
        "value": "Between musters the company rests, mends its equipment, and shares news. A peddler offers to carry a letter home."
      }
    ],
    "text": []
  },
  "drink_trouble": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "A Quarrel at the Feast"
      },
      {
        "path": [
          "text"
        ],
        "value": "A dispute over places at the table interrupts the feast. Voices rise as the guests take sides."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Separate the guests.",
          "desc": "A firm intervention restores order.",
          "effects": {
            "prestige": 2,
            "skills": {
              "dip": 1
            }
          }
        }
      },
      {
        "path": [
          "options",
          "2"
        ],
        "value": {
          "label": "Find a compromise.",
          "desc": "Hear each side and settle the seating fairly.",
          "effects": {
            "prestige": 3,
            "skills": {
              "dip": 1
            }
          }
        }
      }
    ],
    "text": []
  },
  "wardeath_friend": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "{friend} is among those who did not return from the battle. Your companions gather to remember them."
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Share a meal and remember your friend.",
          "desc": "Make room at the table for their old companions.",
          "effects": {
            "killRole": "friend",
            "gold": -2
          }
        }
      }
    ],
    "text": []
  },
  "polly_drill": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "Training is tiring, but each day your shield feels steadier. You keep your secret as the company grows familiar. Across the cook-fire, {suitor} passes you the bread, and your heart leaps."
      }
    ],
    "text": [
      {
        "from": "Win the men with a wineskin and a song.",
        "to": "Win the company with bread and a song."
      },
      {
        "from": "You stand a round with your last coppers and bawl the filthy marching songs louder than any. They call you a good lad and mean it — and a good lad is never questioned.",
        "to": "You share a meal and lead a marching song. The company welcomes you as one of its own."
      }
    ]
  },
  "old_age_reflection": {
    "set": [],
    "text": [
      {
        "from": "Nothing. So enjoy the wine.",
        "to": "Enjoy a quiet meal with good company."
      },
      {
        "from": "Eat, drink; the rest is smoke.",
        "to": "Rest and company make the day worthwhile."
      }
    ]
  },
  "court_feast": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "Your hall glows with candles. Neighbors, vassals, and rivals share your food and measure your hospitality."
      }
    ],
    "text": [
      {
        "from": "Water the wine.",
        "to": "Serve a simpler supper."
      },
      {
        "from": "A cheap trick — if no tongue catches it.",
        "to": "Save on ingredients without neglecting your guests."
      },
      {
        "from": "Everyone notices. “The Watered Cup,” they toast, snickering.",
        "to": "Everyone notices the meagre portions and leaves unimpressed."
      }
    ]
  },
  "visit_city": {
    "set": [],
    "text": [
      {
        "from": "Wander the pleasure quarter.",
        "to": "Visit the musicians in the square."
      },
      {
        "from": "Wine, music, and thinner pockets by morning.",
        "to": "Music and a warm meal ease the road’s fatigue."
      }
    ]
  },
  "host_discipline": {
    "set": [
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Dismiss them from your service.",
          "desc": "The offenders lose their place in the company.",
          "effects": {
            "opinionLiege": 8,
            "prestige": 2,
            "popularOpinion": -2
          }
        }
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Reprimand them and repay the woman.",
          "desc": "Return what was taken and make restitution.",
          "effects": {
            "gold": -2,
            "opinionLiege": 4,
            "piety": 3
          }
        }
      }
    ],
    "text": []
  },
  "war_deserters": {
    "set": [],
    "text": [
      {
        "from": "Hunt them down and hang one.",
        "to": "Reorganize watches and enforce attendance."
      }
    ]
  },
  "plot_spouse_end": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "A Design Abandoned"
      },
      {
        "path": [
          "text"
        ],
        "value": "You put aside the scheme against your spouse. Any household dispute must be settled openly."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Close the matter.",
          "desc": "End the scheme without harming anyone.",
          "effects": {
            "custom": "plot_end"
          }
        }
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Seek reconciliation.",
          "desc": "Leave the scheme behind.",
          "effects": {
            "custom": "plot_end",
            "piety": 5
          }
        }
      }
    ],
    "text": []
  },
  "assassin_caught": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "An Intruder Questioned"
      },
      {
        "path": [
          "text"
        ],
        "value": "An intruder has been detained. A search of their belongings reveals letters linking them to {rival}."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Present the evidence publicly.",
          "desc": "Let the court examine the letters.",
          "effects": {
            "prestige": 8,
            "opinion": {
              "role": "rival",
              "amt": -30
            },
            "rivalHeat": 15
          }
        }
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Expose the rival’s scheme.",
          "desc": "Use the evidence to challenge their reputation.",
          "effects": {
            "skills": {
              "int": 2
            },
            "opinion": {
              "role": "rival",
              "amt": -30
            },
            "prestige": -5,
            "log": "Exposed a rival’s hired agent."
          }
        }
      },
      {
        "path": [
          "options",
          "2"
        ],
        "value": {
          "label": "Release the intruder with a warning.",
          "desc": "Let restraint speak for your household.",
          "effects": {
            "piety": 8,
            "prestige": 4,
            "rivalHeat": -10
          }
        }
      }
    ],
    "text": []
  },
  "peasant_revolt": {
    "set": [],
    "text": [
      {
        "from": "The revolt breaks against your armed men. The Ploughman King hangs at the crossroads.",
        "to": "The revolt disperses before your armed men. Its leader is detained for a hearing."
      }
    ]
  },
  "justice_hearing": {
    "set": [
      {
        "path": [
          "text",
          "cases",
          "execution"
        ],
        "value": "You are held in {student}’s custody. The proposed sentence is a year of imprisonment."
      },
      {
        "path": [
          "text",
          "cases",
          "blinding_deposition"
        ],
        "value": "You are held in {student}’s custody. The proposed sentence is a year of imprisonment."
      },
      {
        "path": [
          "text",
          "cases",
          "qisas"
        ],
        "value": "You are held in {student}’s custody. The proposed sentence is a year of imprisonment."
      }
    ],
    "text": []
  },
  "intrigue_hearing": {
    "set": [
      {
        "path": [
          "text",
          "cases",
          "execution"
        ],
        "value": "The court proposes a year of imprisonment and will hear your answer first."
      },
      {
        "path": [
          "text",
          "cases",
          "blinding_deposition"
        ],
        "value": "The court proposes a year of imprisonment and will hear your answer first."
      },
      {
        "path": [
          "text",
          "cases",
          "qisas"
        ],
        "value": "The court proposes a year of imprisonment and will hear your answer first."
      }
    ],
    "text": []
  },
  "melee_games": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "{lord} holds a gathering of arms: mock battle with blunted steel and every ambitious rider in the province watching."
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Study the champion’s technique.",
          "desc": "Watch the contest from the practice rail.",
          "effects": {
            "skills": {
              "mar": 1
            }
          }
        }
      }
    ],
    "text": []
  },
  "tournament_invitation": {
    "set": [
      {
        "path": [
          "options",
          "2"
        ],
        "value": {
          "label": "Help prepare the practice ground.",
          "desc": "Work alongside the host’s household.",
          "effects": {
            "prestige": 3,
            "opinion": {
              "role": "lord",
              "amt": 4
            }
          }
        }
      }
    ],
    "text": [
      {
        "from": "A gift in place of a wager — here, generosity is its own bet.",
        "to": "Support the host’s horses and riders."
      }
    ]
  },
  "tournament_invitation_lord": {
    "set": [
      {
        "path": [
          "options",
          "2"
        ],
        "value": {
          "label": "Help prepare the practice ground.",
          "desc": "Work alongside the host’s household.",
          "effects": {
            "prestige": 3,
            "opinion": {
              "role": "lord",
              "amt": 4
            }
          }
        }
      }
    ],
    "text": [
      {
        "from": "Stake a young blade’s harness and entry — patronage outlasts any wager.",
        "to": "Support the host’s horses and riders."
      },
      {
        "from": "Your entry gift and fees stake {money:25} against the {money:40} purse — and against a very public fall.",
        "to": "Equipment and heralds cost {money:25}. The champion earns a prize of {money:40}."
      }
    ]
  },
  "sparring_challenge": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "The Old Sergeant’s Lesson"
      },
      {
        "path": [
          "text"
        ],
        "value": "A veteran invites you to practice with a blunted blade. Timing and footwork, he says, matter more than strength."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Accept the practice bout.",
          "desc": "Test your technique against experience.",
          "chance": "battle",
          "success": {
            "text": "Your footwork wins the bout and the veteran’s approval.",
            "effects": {
              "prestige": 2,
              "skills": {
                "mar": 1
              }
            }
          },
          "failure": {
            "text": "The veteran demonstrates the opening in your guard. You learn from it.",
            "effects": {
              "skills": {
                "mar": 1
              }
            }
          }
        }
      }
    ],
    "text": []
  },
  "df_omen": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "A Warning at the Door"
      },
      {
        "path": [
          "text"
        ],
        "value": "A threatening note appears at your threshold. A servant has left without warning. Your adviser believes {rival} is trying to force you from power."
      }
    ],
    "text": [
      {
        "from": "Catch the poisoner — or teach him your defenses.",
        "to": "Identify the messenger without revealing your defenses."
      },
      {
        "from": "The poisoner walks into it, and under questioning gives up a name. The knives stop — and {rival} knows that you know.",
        "to": "The messenger is identified through intercepted letters. {rival} knows that you have uncovered the plan."
      },
      {
        "from": "Omens are for old women.",
        "to": "Dismiss the warning."
      },
      {
        "from": "Dead dogs do not cut their own throats.",
        "to": "A note alone proves little."
      }
    ]
  },
  "df_conspiracy": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "Your oldest armsman resigns without explanation. Conflicting orders circulate inside the household. Someone is working to undermine your authority."
      }
    ],
    "text": [
      {
        "from": "Purge the household.",
        "to": "Investigate the household accounts."
      },
      {
        "from": "Terror may find the knife — or blind your friends.",
        "to": "Evidence may uncover the scheme, but suspicion can cost trust."
      },
      {
        "from": "Three servants taken in the night; one talks. The paid knife flees your hall ahead of the rope, and the silence lifts.",
        "to": "Three servants answer questions. Their accounts expose an agent, who leaves the household before the hearing."
      },
      {
        "from": "Purged a murderous conspiracy.",
        "to": "Uncovered a household conspiracy."
      },
      {
        "from": "You seize the wrong people, and the true conspirators use the fear — half your servants flee, and the rest dare not warn you now.",
        "to": "You accuse the wrong people. Several servants resign, and the remaining witnesses no longer trust you."
      }
    ]
  },
  "apprentice_trouble": {
    "set": [
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Suspend his workshop duties.",
          "desc": "He loses your trust and a chance to learn.",
          "effects": {
            "popularOpinion": -2,
            "prestige": -1
          }
        }
      }
    ],
    "text": []
  },
  "historic_raid": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "Raiders reach the settlement at dawn. Families gather their belongings and seek shelter while the watch calls for help."
      }
    ],
    "text": [
      {
        "from": "Escaped a slave raid without loss.",
        "to": "Escaped a raid without loss."
      },
      {
        "from": "Escaped a slave raid after abandoning household wealth.",
        "to": "Escaped a raid after abandoning household wealth."
      }
    ]
  },
  "historic_raid_pursuit": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "Scouts follow your tracks away from the settlement. You search for a path beyond their patrols."
      }
    ],
    "text": [
      {
        "from": "The blow is caught. A club drops you to your knees, and when sight returns your wrists are bound with the rest.",
        "to": "The patrol blocks your way. You are escorted to the other captives."
      }
    ]
  },
  "historic_raid_captive": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "Your household is held with others bound for {destination}. The captors intend to put you to work there. You search for a chance to leave together."
      },
      {
        "path": [
          "options",
          "1",
          "failure"
        ],
        "value": {
          "text": "The patrol catches up and escorts you back to the column. Your household is carried to {destination}.",
          "effects": {
            "custom": "raid_enslave",
            "log": "Was recaptured and bound to the land after a raid."
          }
        }
      }
    ],
    "text": [
      {
        "from": "Submit to the rope and keep the household alive.",
        "to": "Stay with the household."
      },
      {
        "from": "Captivity, dispossession, and bondage in {destination} — but survival.",
        "to": "Lose your property and become bound to the land in {destination}."
      },
      {
        "from": "One last chance at freedom. Failure is a killing blow.",
        "to": "Try to escape. If caught, your household is taken to {destination}."
      }
    ]
  },
  "artifact_rumor": {
    "set": [],
    "text": [
      {
        "from": "A skald drinks too much and talks too freely: a barrow in {province} holds a blade forged by dwarves, cursed to kill whenever it is drawn. He says he never went in. He says it twice.",
        "to": "A skald speaks of a barrow in {province}, where a legendary blade lies guarded by old warnings. He admits he never entered it."
      },
      {
        "from": "An exile from the old Persian courts speaks of the smith’s apron-banner that rose against the tyrant Zahhak — the Derafsh Kaviani — lost, hidden, or waiting, depending on which cup of wine he is on.",
        "to": "An exile from the old Persian courts speaks of the smith’s apron-banner, the Derafsh Kaviani. Each retelling puts its resting place somewhere new."
      }
    ]
  },
  "artifact_coveted": {
    "set": [],
    "text": [
      {
        "from": "A war-band of the old faith feasts in your hall and counts the spears on your wall. Their chief names the Allfather’s weapon over the mead, and asks what ransom would buy it.",
        "to": "A war-band feasts in your hall. Its chief asks whether you would part with the Allfather’s weapon for a generous payment."
      }
    ]
  },
  "council_scheme_strikes": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "A tax convoy fails to arrive, your orders are delayed, and a mocking song spreads through the capital. Someone on your council is undermining your rule."
      }
    ],
    "text": [
      {
        "from": "Your agents find only dead ends and dead witnesses. The whispers grow bolder, and the treasury lighter.",
        "to": "Your agents find no reliable witnesses. The whispers grow bolder and the treasury lighter."
      }
    ]
  },
  "council_wise_counsel": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "The council earns its keep: tidy ledgers, thoughtful advice, and an evening of useful governance. You thank those who made it possible."
      }
    ],
    "text": []
  },
  "parliament_grievance": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "During the recess, an old lord asks for your support. He believes {liege}’s court reduced his grandson’s inheritance unfairly and intends to appeal before the assembly. The clerks watch who agrees to stand with him."
      }
    ],
    "text": []
  },
  "guild_entry": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "The masters share meals, set prices, and support one another’s households. A seat at their bench costs silver and opens a future."
      }
    ],
    "text": []
  },
  "cooper_vintage_casks": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "Casks for the Harvest"
      },
      {
        "path": [
          "text"
        ],
        "value": "Harvest merchants need sound casks for their produce. Your hoops and staves are in demand before the stores fill."
      }
    ],
    "text": []
  },
  "village_festival": {
    "set": [],
    "text": [
      {
        "from": "Sell ale to the merrymakers.",
        "to": "Sell bread to the merrymakers."
      },
      {
        "from": "Merry throats make heavy purses.",
        "to": "Fresh bread finds eager customers."
      }
    ]
  },
  "wolves": {
    "set": [],
    "text": [
      {
        "from": "You come home dragging a grey carcass. The village drinks your health.",
        "to": "You return after driving off the wolves. The village welcomes you with thanks."
      },
      {
        "from": "You come home dragging a grey carcass. The village feasts you as a hero.",
        "to": "You return after driving off the wolves. The village welcomes you with thanks."
      }
    ]
  },
  "wandering_skald": {
    "set": [],
    "text": [
      {
        "from": "Buy him ale for the news.",
        "to": "Buy the singer a meal for the news."
      }
    ]
  },
  "strange_bounty": {
    "set": [],
    "text": [
      {
        "from": "Casks of wine and a purse of foreign silver, safely hidden.",
        "to": "Casks of preserved fruit and a purse of foreign silver, safely hidden."
      },
      {
        "from": "Honesty is cheaper than a whipping, and sometimes rewarded.",
        "to": "Honesty avoids a fine and may earn a reward."
      },
      {
        "from": "The dead deserve better than gulls.",
        "to": "Give the lost traveler a respectful burial."
      }
    ]
  },
  "visit_village": {
    "set": [],
    "text": [
      {
        "from": "Rest at the ale-house. ({money:2})",
        "to": "Rest at the inn. ({money:2})"
      },
      {
        "from": "A bench, a cup, an hour’s peace.",
        "to": "A bench, a warm meal, and an hour’s peace."
      }
    ]
  },
  "visit_town": {
    "set": [],
    "text": [
      {
        "from": "Useful names are learned over wine.",
        "to": "Useful acquaintances are made over supper."
      }
    ]
  },
  "caught_poaching": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "The forester brings you before {lord}. Taking protected game can mean a fine or extra labor."
      }
    ],
    "text": [
      {
        "from": "The lord orders you flogged in the yard as a lesson.",
        "to": "The lord assigns extra labor. Exhausted, you return home in disgrace."
      },
      {
        "from": "A bold lie, and a thin one to hang your hand on.",
        "to": "A bold claim, if anyone will believe it."
      },
      {
        "from": "No one believes it. The flogging is worse for the insult.",
        "to": "No one believes it. Extra labor and a public reprimand follow."
      }
    ]
  },
  "corvee": {
    "set": [],
    "text": [
      {
        "from": "Save your strength — if {officer}’s stick stays elsewhere.",
        "to": "Save your strength if {officer} does not notice."
      },
      {
        "from": "{officer} notices, and his stick argues the point.",
        "to": "{officer} notices and assigns a longer shift. You return home exhausted."
      }
    ]
  },
  "old_custom_reeve": {
    "set": [],
    "text": [
      {
        "from": "Make him use the stick in public.",
        "to": "Challenge his demands before witnesses."
      },
      {
        "from": "Bruises seen by all accuse louder than words.",
        "to": "Let the whole village hear the demand."
      },
      {
        "from": "You do not give ground. By morning every bruise in the village belongs to your cause.",
        "to": "You stand firm. By morning the village knows exactly what was demanded."
      },
      {
        "from": "{officer}’s men put you down hard, but they must do it where everyone can see.",
        "to": "{officer} keeps you waiting in the cold for hours, but everyone sees his conduct."
      }
    ]
  },
  "old_custom_end": {
    "set": [],
    "text": [
      {
        "from": "One back bent so the village stands straight.",
        "to": "Extra labor for you spares the rest of the village."
      },
      {
        "from": "Take the punishment for everyone.",
        "to": "Take the extra work for everyone."
      },
      {
        "from": "{officer}’s men are waiting among the trees.",
        "to": "{officer}’s men catch you and assign exhausting extra duties as well as a fine."
      }
    ]
  },
  "child_page": {
    "set": [],
    "text": [
      {
        "from": "Caught lingering behind the arras. The steward’s cuff rings your ear.",
        "to": "Caught listening behind the curtain, you spend a tiring evening on extra chores."
      }
    ]
  },
  "polly_battle": {
    "set": [],
    "text": [
      {
        "from": "The world shrinks to the man in front of you — and then he is down, and their wall breaks and runs, and you are alive, shaking, splashed to the elbow, and alive. The field and its dead lie open for the looting.",
        "to": "Your company holds its line until the opposing force withdraws. You return tired but proud of the part you played."
      }
    ]
  },
  "polly_reunion": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "The fighting is over. You find {suitor} safe among the returning company, remove your helm, and reveal who you are. Surprise leaves him speechless as you wait for his answer."
      }
    ],
    "text": []
  },
  "field_battle_won": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "At {cname}, the opposing force withdraws. Your host holds the field."
      }
    ],
    "text": [
      {
        "from": "Savor it; the crows already do.",
        "to": "Help the wounded and account for recovered supplies."
      }
    ]
  },
  "field_battle_won_steel": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "At {cname}, the opposing force withdraws. Your host holds the field."
      }
    ],
    "text": [
      {
        "from": "Savor it; the crows already do.",
        "to": "Help the wounded and account for recovered supplies."
      }
    ]
  },
  "child_fever": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "Your child {childname} has a serious fever. The household gathers to decide how best to help."
      }
    ],
    "text": [
      {
        "from": "By dawn the little body is still. You dig a small grave.",
        "to": "Despite your vigil, the child does not recover. The household mourns."
      },
      {
        "from": "The great physician doses, bleeds, and waits — and the fever breaks. The child will live.",
        "to": "The physician tends the child through the night. By morning the fever has broken."
      }
    ]
  },
  "pestilence_arrives": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "A serious illness has reached {province}. Households prepare to care for the sick."
      }
    ],
    "text": []
  },
  "pestilence_rages": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "The Illness Continues"
      },
      {
        "path": [
          "text"
        ],
        "value": "Many households need help as the illness continues. Supplies are scarce and ordinary work has slowed."
      }
    ],
    "text": [
      {
        "from": "Help bury the dead.",
        "to": "Deliver supplies to the sick."
      },
      {
        "from": "The village will remember — if the fever does not claim you too.",
        "to": "Help your neighbors despite the risk of illness."
      },
      {
        "from": "Grim work, holy work. The village will not forget.",
        "to": "Your help reaches the households that need it. The village will remember."
      },
      {
        "from": "The dead share their sickness with the living.",
        "to": "You fall ill while helping your neighbors."
      },
      {
        "from": "Organize burial crews. ({money:10})",
        "to": "Organize relief crews. ({money:10})"
      },
      {
        "from": "Pay, protection, and firm orders can keep the dead from the lanes.",
        "to": "Fund deliveries and care for households affected by the illness."
      }
    ]
  },
  "pestilence_ends": {
    "set": [
      {
        "path": [
          "text"
        ],
        "value": "A season passes with no new cases. The households of {province} cautiously return to their ordinary work."
      }
    ],
    "text": []
  },
  "realm_policy_persecution_unrest": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "A Disputed Gathering"
      },
      {
        "path": [
          "text"
        ],
        "value": "Officials have interrupted a minority congregation’s meeting. Its members ask you to hear their complaint and protect their right to gather."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Open an inquiry into the officials.",
          "desc": "Hear witnesses and suspend further penalties.",
          "effects": {
            "gold": -4,
            "popularOpinion": 4,
            "custom": "realm_policy_persecution_noted",
            "log": "Opened an inquiry into mistreatment of a congregation."
          }
        }
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Guarantee the gathering’s protection.",
          "desc": "Restrain the officials and restore public trust.",
          "effects": {
            "piety": -4,
            "popularOpinion": 4,
            "log": "Protected a minority congregation."
          }
        }
      }
    ],
    "text": []
  },
  "community_coercive_backlash": {
    "set": [
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Provide aid and end enforcement.",
          "desc": "Support affected households and stop the faith project.",
          "effects": {
            "stopCountyCommunityProject": "faith",
            "gold": -4,
            "popularOpinion": 3
          }
        }
      }
    ],
    "text": []
  },
  "sibling_courtship_approach": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "A Family Matter"
      },
      {
        "path": [
          "text"
        ],
        "value": "The household puts the matter aside."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Leave the matter closed.",
          "desc": "No household relationship changes.",
          "effects": {}
        }
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Leave the matter closed.",
          "desc": "No household relationship changes.",
          "effects": {}
        }
      }
    ],
    "text": []
  },
  "sibling_courtship_exposed": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "A Family Matter"
      },
      {
        "path": [
          "text"
        ],
        "value": "The household puts the matter aside."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Leave the matter closed.",
          "desc": "No household relationship changes.",
          "effects": {}
        }
      },
      {
        "path": [
          "options",
          "1"
        ],
        "value": {
          "label": "Leave the matter closed.",
          "desc": "No household relationship changes.",
          "effects": {}
        }
      },
      {
        "path": [
          "options",
          "2"
        ],
        "value": {
          "label": "Leave the matter closed.",
          "desc": "No household relationship changes.",
          "effects": {}
        }
      }
    ],
    "text": []
  },
  "sibling_proposal_made": {
    "set": [
      {
        "path": [
          "title"
        ],
        "value": "A Family Matter"
      },
      {
        "path": [
          "text"
        ],
        "value": "The household puts the matter aside."
      },
      {
        "path": [
          "options",
          "0"
        ],
        "value": {
          "label": "Leave the matter closed.",
          "desc": "No household relationship changes.",
          "effects": {}
        }
      }
    ],
    "text": []
  }
};
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function replaceText(value, edit, count) {
    if (typeof value === 'string') {
      if (value === edit.from) { count.value++; return edit.to; }
      return value;
    }
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { value[key] = replaceText(value[key], edit, count); });
    }
    return value;
  }
  var seen = {};
  var events = FBDATA.events.map(function (source) {
    var change = changes[source.id];
    if (!change) return source;
    if (seen[source.id]) throw new Error('Duplicate distribution event: ' + source.id);
    seen[source.id] = true;
    var event = clone(source);
    change.text.forEach(function (edit) {
      var count = { value:0 };
      event = replaceText(event, edit, count);
      if (!count.value) throw new Error('Distribution text changed: ' + source.id);
    });
    change.set.forEach(function (edit) {
      var owner = event;
      for (var i = 0; i < edit.path.length - 1; i++) {
        owner = owner[edit.path[i]];
        if (!owner || typeof owner !== 'object') throw new Error('Distribution path changed: ' + source.id);
      }
      var key = edit.path[edit.path.length - 1];
      if (!Object.prototype.hasOwnProperty.call(owner, key)) throw new Error('Distribution field changed: ' + source.id);
      owner[key] = clone(edit.value);
    });
    if (event.id !== source.id || event.options.length !== source.options.length) {
      throw new Error('Distribution event identity changed: ' + source.id);
    }
    return event;
  });
  Object.keys(changes).forEach(function (id) {
    if (!seen[id]) throw new Error('Missing distribution event: ' + id);
  });
  FBDATA.events = events;
  var traits = Object.assign({}, FBDATA.traits);
  traits.drunkard = Object.assign({}, traits.drunkard, {
    name:'Overindulgent', icon:'🍰', desc:'Comfort and rich food too often come before duty.'
  });
  FBDATA.traits = traits;
  var plots = Object.assign({}, FBDATA.plots);
  delete plots.assassination;
  delete plots.widow_veil;
  FBDATA.plots = plots;
})();
