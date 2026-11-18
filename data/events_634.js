/* Local household decisions; public outcomes remain with their ordinary systems. */
FB.bookmarkSources.eventPack('data/events_634.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_634 = { bookmarkIds:['634'], eras:['late_antique'], yearMin:634, yearMax:654 };
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.household_accounts_634 = {"base":0.45,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"ste","factor":0.025}]};
  Array.prototype.push.apply(FBDATA.events, [
  {
    "id": "damascus_bench_tools_634",
    "pack": "dated_634",
    "title": "The Tools Still at Home",
    "text": "In Damascus, your craft household must work with the tools it actually owns. A replacement set costs {money:25}. It supplies no military contract or promise of protection.",
    "trigger": {
      "countyIds": [
        "damascus"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "administrative_monarchy"
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
    "id": "ctesiphon_hearth_garden_634",
    "pack": "dated_634",
    "title": "A Patch near Ctesiphon",
    "text": "Your household lives in the countryside around Ctesiphon. Spend {money:10} on a hearth garden, or keep the private purse for other needs. The royal treasury is a separate account.",
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
    "id": "medina_household_letters_634",
    "pack": "dated_634",
    "title": "Reading at Home",
    "text": "Medina has a political court and households with their own concerns. Spend {money:30} on reading within your family; this creates no public role or court connection.",
    "trigger": {
      "countyIds": [
        "medina"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "administrative_monarchy"
          },
          "not": true
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
    "id": "damascus_household_prayer_634",
    "pack": "dated_634",
    "title": "Devotion behind Your Door",
    "text": "Your household in Damascus can keep a place for its own prayers. The {money:20} purchase neither converts the street nor speaks for another community.",
    "trigger": {
      "countyIds": [
        "damascus"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "administrative_monarchy"
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
    "id": "damascus_neighbor_accounts_634",
    "pack": "dated_634",
    "title": "The Neighbor’s Reckoning",
    "text": "{neighbor} wants to compare household concerns in Damascus. Local families need work and reliable accounts whatever decisions distant courts make. You have no new terms of surrender to announce.",
    "trigger": {
      "countyIds": [
        "damascus"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "administrative_monarchy"
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
    "id": "hira_receipt_bundle_634",
    "pack": "dated_634",
    "title": "Papers in the Hira District",
    "text": "The Hira district has its own households and recorded obligations. Check the papers you hold rather than treating every report from the frontier as a settled demand on your purse.",
    "trigger": {
      "countyIds": [
        "kufa"
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
        "label": "Compare the figures carefully.",
        "chance": "household_accounts_634",
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
    "id": "ctesiphon_private_receipts_634",
    "pack": "dated_634",
    "title": "Beside the Public Accounts",
    "text": "The court at Ctesiphon manages public obligations. Your household can check its own receipts without asserting a claim on those funds.",
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
        "label": "Compare the figures carefully.",
        "chance": "household_accounts_634",
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
    "id": "medina_neighbor_livelihood_634",
    "pack": "dated_634",
    "title": "A Living in Medina",
    "text": "{neighbor} talks of the work and expenses of a household in Medina. The political court has its own decisions to make; this conversation is about the means of living here.",
    "trigger": {
      "countyIds": [
        "medina"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "administrative_monarchy"
          },
          "not": true
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
    "id": "damascus_material_accounts_634",
    "pack": "dated_634",
    "title": "Counting the Repair Materials",
    "text": "Your Damascus household can count the materials already at hand before deciding on ordinary work. No customer, official or army has promised a special payment.",
    "trigger": {
      "countyIds": [
        "damascus"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "administrative_monarchy"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Compare the figures carefully.",
        "chance": "household_accounts_634",
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
    "id": "medina_independent_accounts_634",
    "pack": "dated_634",
    "title": "The Household’s Own Reckoning",
    "text": "Your Medinan household has purchases and expenses to consider. Put your own figures in order without enrolling in service or committing the household to a campaign.",
    "trigger": {
      "countyIds": [
        "medina"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "administrative_monarchy"
          },
          "not": true
        }
      ]
    },
    "weight": 3,
    "cooldown": 8,
    "options": [
      {
        "label": "Compare the figures carefully.",
        "chance": "household_accounts_634",
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
      },
      {
        "label": "Review the household supplies for {money:2}.",
        "require": {
          "state": [
            {
              "reader": "active_story_stage",
              "args": {
                "storyId": "medina_household_track_634",
                "stage": "accounts"
              }
            }
          ]
        },
        "review": {
          "type": "story_choice",
          "args": {
            "storyId": "medina_household_track_634",
            "choiceId": "buy_provisions"
          },
          "refusalOption": 1
        }
      }
    ]
  }
]);
});
