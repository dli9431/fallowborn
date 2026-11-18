/* Local household decisions; public outcomes remain with their ordinary systems. */
FB.bookmarkSources.eventPack('data/events_493.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_493 = { bookmarkIds:['493'], eras:['late_antique'], yearMin:493, yearMax:513 };
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.household_accounts_493 = {"base":0.45,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"ste","factor":0.025}]};
  Array.prototype.push.apply(FBDATA.events, [
  {
    "id": "ravenna_family_letters_493",
    "pack": "dated_493",
    "title": "A Copy at Home",
    "text": "In Ravenna, civil records outlast the men who first sealed them. Your household could spend {money:30} on learning and keeping its own papers in order. This is no grant of land or public office.",
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
    "id": "ticinum_tools_493",
    "pack": "dated_493",
    "title": "Steel for Small Repairs",
    "text": "At Ticinum, repair work still needs sound tools. A set for {money:25} would belong to your household, whatever orders pass between the courts.",
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
    "id": "rome_hearth_garden_493",
    "pack": "dated_493",
    "title": "The Ground by the Door",
    "text": "Rome has great households and great disputes; yours has a small patch beside the hearth. Spend {money:10} on a garden, or leave the patch as it is.",
    "trigger": {
      "countyIds": [
        "roma"
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
    "id": "ravenna_household_devotion_493",
    "pack": "dated_493",
    "title": "A Quiet Corner",
    "text": "Different congregations worship in Ravenna. You could spend {money:20} on a place for your own household devotion without making a claim over anyone else.",
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
    "id": "ravenna_neighbor_worship_493",
    "pack": "dated_493",
    "title": "Sharing a Street",
    "text": "{neighbor} lives nearby in Ravenna, where more than one congregation has a place. The conversation turns to how households can share the street without answering for a royal court.",
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
      "countyCommunityMixed": {
        "kind": "faith",
        "minCommunities": 2,
        "minorityShareMin": 0.1
      }
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
    "id": "ravenna_private_accounts_493",
    "pack": "dated_493",
    "title": "The Household Copy",
    "text": "Civil administration continues in Ravenna. Your own account of purchases and payments needs checking before you rely on it. No official has offered to settle it for you.",
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
        "chance": "household_accounts_493",
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
    "id": "soissons_neighbor_fields_493",
    "pack": "dated_493",
    "title": "Fields near Soissons",
    "text": "The court at Soissons and neighboring courts have their own ambitions. {neighbor} is concerned with the households that must keep fields and tools in order here.",
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
    "id": "italian_wartime_purse_493",
    "pack": "dated_493",
    "title": "Reports and the Private Purse",
    "text": "Uncertain orders and reports make your household cautious about its purse. The immediate question is how much to keep against interrupted work. A private precaution cannot command an army.",
    "trigger": {
      "countyIds": [
        "ravenna",
        "pavia",
        "roma"
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
        "label": "Spend a little on household necessities.",
        "effects": {
          "gold": -2,
          "health": 1
        },
        "text": "You replace a few necessities.",
        "require": {
          "goldMin": 2
        }
      },
      {
        "label": "Keep the reserve intact.",
        "effects": {},
        "text": "You make no purchase."
      }
    ]
  },
  {
    "id": "soissons_mixed_beliefs_493",
    "pack": "dated_493",
    "title": "Neighbors and Belief",
    "text": "Different religious communities live around Soissons. You can give time to your own devotions without claiming that the court or your neighbors have changed their faith.",
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
      "countyCommunityMixed": {
        "kind": "faith",
        "minCommunities": 2,
        "minorityShareMin": 0.1
      }
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Attend to your own devotions.",
        "effects": {
          "piety": 3
        },
        "text": "Your observance remains a personal act."
      },
      {
        "label": "Return to the household accounts.",
        "effects": {
          "skills": {
            "ste": 1
          }
        },
        "text": "You concentrate on the means of your own household."
      }
    ]
  },
  {
    "id": "rome_old_receipts_493",
    "pack": "dated_493",
    "title": "Receipts in a Bundle",
    "text": "In Rome, an old bundle of household receipts can still answer a present question. Sort what you actually possess rather than treating a change of rulers as a new property title.",
    "trigger": {
      "countyIds": [
        "roma"
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
        "chance": "household_accounts_493",
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
  }
]);
});
