/* Local household decisions; public outcomes remain with their ordinary systems. */
FB.bookmarkSources.eventPack('data/events_568.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_568 = { bookmarkIds:['568'], eras:['late_antique'], yearMin:568, yearMax:588 };
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.household_accounts_568 = {"base":0.45,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"ste","factor":0.025}]};
  Array.prototype.push.apply(FBDATA.events, [
  {
    "id": "ravenna_replacement_tools_568",
    "pack": "dated_568",
    "title": "Work under an Imperial Roof",
    "text": "Ravenna remains an imperial city. Your household could replace worn craft tools for {money:25}; the purchase carries no public commission and promises no court customer.",
    "trigger": {
      "countyIds": [
        "ravenna"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "roman_civic"
          }
        }
      ],
      "notHoldings": [
        "fine_tools"
      ],
      "careerRoles": [
        "craft"
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Make the household purchase.",
        "effects": {
          "gold": -25,
          "holding": "fine_tools"
        },
        "text": "The purchase belongs to your household.",
        "require": {
          "goldMin": 25,
          "notHoldings": [
            "fine_tools"
          ]
        }
      },
      {
        "label": "Keep the money for now.",
        "effects": {},
        "text": "The household carries on with what it has."
      }
    ]
  },
  {
    "id": "bononia_garden_568",
    "pack": "dated_568",
    "title": "A Reason to Stay",
    "text": "In Bononia, the household has work close to home. Spend {money:10} on a hearth garden, or preserve the purse while other people weigh the roads.",
    "trigger": {
      "countyIds": [
        "bologna"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "roman_civic"
          }
        }
      ],
      "notHoldings": [
        "hearth_garden"
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Make the household purchase.",
        "effects": {
          "gold": -10,
          "holding": "hearth_garden"
        },
        "text": "The purchase belongs to your household.",
        "require": {
          "goldMin": 10,
          "notHoldings": [
            "hearth_garden"
          ]
        }
      },
      {
        "label": "Keep the money for now.",
        "effects": {},
        "text": "The household carries on with what it has."
      }
    ]
  },
  {
    "id": "metz_household_letters_568",
    "pack": "dated_568",
    "title": "Letters at Metz",
    "text": "The Austrasian court keeps its own affairs. For {money:30}, your household could cultivate reading and keep its private records more carefully. A royal marriage supplies no private entitlement.",
    "trigger": {
      "countyIds": [
        "metz"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "regnum"
          }
        }
      ],
      "notHoldings": [
        "letters"
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Make the household purchase.",
        "effects": {
          "gold": -30,
          "holding": "letters"
        },
        "text": "The purchase belongs to your household.",
        "require": {
          "goldMin": 30,
          "notHoldings": [
            "letters"
          ]
        }
      },
      {
        "label": "Keep the money for now.",
        "effects": {},
        "text": "The household carries on with what it has."
      }
    ]
  },
  {
    "id": "soissons_devotion_568",
    "pack": "dated_568",
    "title": "The Household Corner",
    "text": "The court at Soissons governs its lands; your family tends its own observances. A household place of devotion would cost {money:20} and change no public religious settlement.",
    "trigger": {
      "countyIds": [
        "laon"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "regnum"
          }
        }
      ],
      "notHoldings": [
        "house_shrine"
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Make the household purchase.",
        "effects": {
          "gold": -20,
          "holding": "house_shrine"
        },
        "text": "The purchase belongs to your household.",
        "require": {
          "goldMin": 20,
          "notHoldings": [
            "house_shrine"
          ]
        }
      },
      {
        "label": "Keep the money for now.",
        "effects": {},
        "text": "The household carries on with what it has."
      }
    ]
  },
  {
    "id": "ticinum_road_talk_568",
    "pack": "dated_568",
    "title": "The Road and the Bench",
    "text": "People talk of movement beyond northern Italy. Here at Ticinum, {neighbor} wants to discuss ordinary repairs and the work still close at hand. Neither of you has a confirmed military report.",
    "trigger": {
      "countyIds": [
        "pavia"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "roman_civic"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Hear {neighbor} out.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 4
          }
        },
        "text": "You part with a better understanding of one another."
      },
      {
        "label": "Attend to your own affairs.",
        "effects": {},
        "text": "You make no promise."
      }
    ],
    "participants": [
      {
        "slot": "neighbor",
        "source": "local_neighbor",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "neighbor"
    ]
  },
  {
    "id": "orleans_separate_accounts_568",
    "pack": "dated_568",
    "title": "Whose Account?",
    "text": "At Orleans, neighboring royal courts do not make every account a royal obligation. Check your household figures before lending your name to a reckoning.",
    "trigger": {
      "countyIds": [
        "orleans"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "regnum"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Compare the figures carefully.",
        "chance": "household_accounts_568",
        "success": {
          "text": "The reckoning agrees. You understand the account better.",
          "effects": {
            "skills": {
              "ste": 1
            }
          }
        },
        "failure": {
          "text": "The figures remain uncertain. You leave them unendorsed.",
          "effects": {}
        }
      },
      {
        "label": "Leave the account unendorsed.",
        "effects": {},
        "text": "You accept no new obligation."
      }
    ]
  },
  {
    "id": "ctesiphon_private_means_568",
    "pack": "dated_568",
    "title": "Private Means by the Tigris",
    "text": "The royal court at Ctesiphon has public accounts of its own. {neighbor} asks how local households keep track of purchases without confusing their purses with those of the court.",
    "trigger": {
      "countyIds": [
        "baghdad"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "aristocratic_monarchy"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Hear {neighbor} out.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 4
          }
        },
        "text": "You part with a better understanding of one another."
      },
      {
        "label": "Attend to your own affairs.",
        "effects": {},
        "text": "You make no promise."
      }
    ],
    "participants": [
      {
        "slot": "neighbor",
        "source": "local_neighbor",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "neighbor"
    ]
  },
  {
    "id": "constantinople_private_copy_568",
    "pack": "dated_568",
    "title": "A Copy in the Capital",
    "text": "Living in Constantinople does not make a household account an imperial order. Compare the figures in your own copy before making a private commitment.",
    "trigger": {
      "countyIds": [
        "constantinople"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "roman_civic"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Compare the figures carefully.",
        "chance": "household_accounts_568",
        "success": {
          "text": "The reckoning agrees. You understand the account better.",
          "effects": {
            "skills": {
              "ste": 1
            }
          }
        },
        "failure": {
          "text": "The figures remain uncertain. You leave them unendorsed.",
          "effects": {}
        }
      },
      {
        "label": "Leave the account unendorsed.",
        "effects": {},
        "text": "You accept no new obligation."
      }
    ]
  },
  {
    "id": "ravenna_customer_accounts_568",
    "pack": "dated_568",
    "title": "A Customer’s Figures",
    "text": "An ordinary repair order in Ravenna has left your household with figures to check. Work and its actual earnings remain available through the ordinary household plan; this reckoning promises no court payment.",
    "trigger": {
      "countyIds": [
        "ravenna"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "roman_civic"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Compare the figures carefully.",
        "chance": "household_accounts_568",
        "success": {
          "text": "The reckoning agrees. You understand the account better.",
          "effects": {
            "skills": {
              "ste": 1
            }
          }
        },
        "failure": {
          "text": "The figures remain uncertain. You leave them unendorsed.",
          "effects": {}
        }
      },
      {
        "label": "Leave the account unendorsed.",
        "effects": {},
        "text": "You accept no new obligation."
      }
    ]
  },
  {
    "id": "ravenna_stationary_repairs_568",
    "pack": "dated_568",
    "title": "Repairs before a Journey",
    "text": "While others discuss the northern roads, your Ravenna household has small repairs close to home. Attend to them or keep the purse for another day. Staying here requires no promise from a distant court.",
    "trigger": {
      "countyIds": [
        "ravenna"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "roman_civic"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Replace a few necessities.",
        "require": {
          "goldMin": 2
        },
        "text": "You spend from the private purse on small household repairs.",
        "effects": {
          "gold": -2,
          "health": 1
        }
      },
      {
        "label": "Keep the money for now.",
        "text": "The household continues with what it has.",
        "effects": {}
      },
      {
        "label": "Review the household supplies for {money:3}.",
        "require": {
          "state": [
            {
              "reader": "active_story_stage",
              "args": {
                "storyId": "ravenna_household_track_568",
                "stage": "supplies"
              }
            }
          ]
        },
        "review": {
          "type": "story_choice",
          "args": {
            "storyId": "ravenna_household_track_568",
            "choiceId": "buy_supplies"
          },
          "refusalOption": 1
        }
      }
    ]
  }
]);
});
