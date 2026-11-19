/* Local households in the spring 451 world; public decisions keep their ordinary owners. */
FB.bookmarkSources.eventPack('data/events_451.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_451 = {bookmarkIds:['451'],eras:['late_antique'],yearMin:451,yearMax:453};
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.gate_explanation_451 = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"dip","factor":0.02},{"kind":"flag","id":"gate_list_451","add":0.15}]};
  FBDATA.eventChances.road_inquiry_451 = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"dip","factor":0.02},{"kind":"flag","id":"road_notes_451","add":0.15}]};
  FBDATA.eventChances.reserve_accounts_451 = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"ste","factor":0.02},{"kind":"flag","id":"reserve_list_451","add":0.15}]};
  FBDATA.eventChances.household_accounts_451 = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"ste","factor":0.02}]};
  FBDATA.eventChances.church_reading_451 = {"base":0.5,"min":0.1,"max":0.85,"steps":[{"kind":"skill","id":"lea","factor":0.02}]};
  Array.prototype.push.apply(FBDATA.events, [
  {
    "id": "ravenna_requisition_copy_451",
    "pack": "dated_451",
    "title": "Before the wagons leave",
    "text": "Requests for stores arrive while the western court is at war. Your household could learn to keep its own copies, instead of trusting every demand repeated at the door.",
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
      "realmAtWar": true,
      "notHoldings": [
        "letters"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Teach the household its letters for {money:30}",
        "require": {
          "goldMin": 30,
          "notHoldings": [
            "letters"
          ]
        },
        "effects": {
          "gold": -30,
          "holding": "letters"
        },
        "text": "The purchase stays with your household."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "arles_wagon_repairs_451",
    "pack": "dated_451",
    "title": "The axle before the army",
    "text": "Military traffic means more broken wheels at Arelate. Sound tools would let your workshop tackle the repairs; buying them promises neither an army contract nor wages.",
    "trigger": {
      "countyIds": [
        "arles"
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
      "realmAtWar": true,
      "careerRoles": [
        "craft"
      ],
      "notHoldings": [
        "fine_tools"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Buy a set of fine tools for {money:25}",
        "require": {
          "goldMin": 25,
          "notHoldings": [
            "fine_tools"
          ]
        },
        "effects": {
          "gold": -25,
          "holding": "fine_tools"
        },
        "text": "The purchase stays with your household."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "orleans_door_list_451",
    "pack": "dated_451",
    "title": "Who is outside the gate?",
    "text": "War makes every arrival at Aureliani a subject of argument. Before others decide whether to close the gates, your household can write down the people and goods it is expecting.",
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
            "formId": "roman_civic"
          }
        }
      ],
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Prepare your household list for {money:1}",
        "desc": "Later questions at the gate gain 15 percentage points of success chance, capped at 85%. This list grants no right of entry.",
        "require": {
          "goldMin": 1,
          "notFlags": [
            "gate_list_451"
          ]
        },
        "effects": {
          "gold": -1,
          "setFlag": "gate_list_451"
        },
        "text": "Your household keeps the preparations for later questions."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "orleans_gate_hearing_451",
    "pack": "dated_451",
    "title": "A city weighs its gates",
    "text": "With war still current, residents debate a closed gate against the needs of people on the road. You can explain your household’s concerns. The gate decision belongs to the city’s authorities.",
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
            "formId": "roman_civic"
          }
        }
      ],
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Explain whom you are waiting for",
        "chance": "gate_explanation_451",
        "success": {
          "text": "Your explanation is understood; no order to the gate follows.",
          "effects": {
            "prestige": 2
          }
        },
        "failure": {
          "text": "Too many voices speak at once. You leave without an answer.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "orleans_bishop_petition_451",
    "pack": "dated_451",
    "title": "A proposal for mediation",
    "text": "A proposal asks the local bishop to negotiate passage while the district’s court is at war. {cleric} listens to your household’s concerns about those waiting outside. No envoy has been commissioned by this conversation.",
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
            "formId": "roman_civic"
          }
        }
      ],
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Help the priest put the concerns in order",
        "effects": {
          "standingCharacter": {
            "participant": "cleric",
            "amt": 3
          }
        },
        "text": "The priest values your care. Whether mediation proceeds remains undecided."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "cleric",
        "source": "role",
        "role": "priest",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "cleric"
    ]
  },
  {
    "id": "paris_road_notes_451",
    "pack": "dated_451",
    "title": "Names along the road",
    "text": "With the local court at war, travelers seek news of safe lodging around Lutetia. Your household can keep a careful list of reports and distinguish a recent sighting from a rumor.",
    "trigger": {
      "countyIds": [
        "paris"
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
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Keep the road notes for {money:1}",
        "desc": "Later road inquiries gain 15 percentage points of success chance, capped at 85%. Notes do not secure passage or move anyone.",
        "require": {
          "goldMin": 1,
          "notFlags": [
            "road_notes_451"
          ]
        },
        "effects": {
          "gold": -1,
          "setFlag": "road_notes_451"
        },
        "text": "Your household keeps the preparations for later questions."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "paris_road_inquiry_451",
    "pack": "dated_451",
    "title": "Which report is recent?",
    "text": "War has brought worried travelers to Lutetia. Several accounts of the same road disagree. Ask when each person actually passed that way before repeating the news.",
    "trigger": {
      "countyIds": [
        "paris"
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
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Compare the reports",
        "chance": "road_inquiry_451",
        "success": {
          "text": "You separate an old warning from a recent report.",
          "effects": {
            "skills": {
              "dip": 1
            }
          }
        },
        "failure": {
          "text": "You cannot establish which account is newer.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "reims_displaced_meal_451",
    "pack": "dated_451",
    "title": "A meal at the roadside",
    "text": "Under the present local ruler, war has brought displaced travelers asking for food near Durocortorum. You can pay for a meal without promising transport, settlement or protection.",
    "trigger": {
      "countyIds": [
        "reims"
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
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Pay for a meal for {money:1}",
        "require": {
          "goldMin": 1
        },
        "effects": {
          "gold": -1,
          "piety": 2
        },
        "text": "You meet the cost of a meal. The travelers’ next destination remains their own."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "lyon_household_plot_451",
    "pack": "dated_451",
    "title": "Something near the hearth",
    "text": "War interrupts road traffic through Lugdunum. A small garden would give your household another ordinary source of sustenance while distant deliveries remain uncertain.",
    "trigger": {
      "countyIds": [
        "lyon"
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
      "realmAtWar": true,
      "notHoldings": [
        "hearth_garden"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Plant a hearth garden for {money:10}",
        "require": {
          "goldMin": 10,
          "notHoldings": [
            "hearth_garden"
          ]
        },
        "effects": {
          "gold": -10,
          "holding": "hearth_garden"
        },
        "text": "The purchase stays with your household."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "aquileia_lodging_451",
    "pack": "dated_451",
    "title": "One evening under cover",
    "text": "War brings anxious travelers through Aquileia. A modest contribution would help with tonight’s lodging; it does not enroll anyone in your household or settle a displaced community.",
    "trigger": {
      "countyIds": [
        "aquileia"
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
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Contribute to tonight’s lodging for {money:1}",
        "require": {
          "goldMin": 1
        },
        "effects": {
          "gold": -1,
          "piety": 2
        },
        "text": "You contribute to the evening’s shelter, without undertaking a continuing obligation."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "sirmium_workbench_451",
    "pack": "dated_451",
    "title": "Repairs beside the staging ground",
    "text": "Village workshops around the Sirmium staging district still have straps, handles and fittings to mend. Your own bench could use sound tools, whether the campaigning court stays nearby or moves on. The tools remain household property.",
    "trigger": {
      "countyIds": [
        "sirmium"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "lineage_kingship"
          }
        }
      ],
      "careerRoles": [
        "craft"
      ],
      "notHoldings": [
        "fine_tools"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Buy workshop tools for {money:25}",
        "require": {
          "goldMin": 25,
          "notHoldings": [
            "fine_tools"
          ]
        },
        "effects": {
          "gold": -25,
          "holding": "fine_tools"
        },
        "text": "The purchase stays with your household."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "sirmium_collection_accounts_451",
    "pack": "dated_451",
    "title": "The collection baskets",
    "text": "At Sirmium, talk of tribute mingles with demands for supplies. {friend} is trying to distinguish a household tally from a claim made in the following’s name. You can compare the accounts without paying a public demand.",
    "trigger": {
      "countyIds": [
        "sirmium"
      ],
      "minAge": 16,
      "tierMax": 2,
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "lineage_kingship"
          }
        }
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Compare the household tallies",
        "chance": "household_accounts_451",
        "success": {
          "text": "The separate sums become easier to understand.",
          "effects": {
            "skills": {
              "ste": 1
            },
            "standingCharacter": {
              "participant": "friend",
              "amt": 2
            }
          }
        },
        "failure": {
          "text": "The accounts remain incomplete; you promise no payment.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "friend",
        "source": "role",
        "role": "friend",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "friend"
    ]
  },
  {
    "id": "thessalonica_reserve_list_451",
    "pack": "dated_451",
    "title": "Set aside the household account",
    "text": "At Thessalonica, discussion of frontier demands raises fears of another collection. A written household reserve list could prevent the same money being promised twice. It pays no tribute and binds no treasury.",
    "trigger": {
      "countyIds": [
        "thessaloniki"
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
    "once": true,
    "options": [
      {
        "label": "Prepare a reserve list for {money:1}",
        "desc": "Later household collection questions gain 15 percentage points of success chance, capped at 85%. Public liabilities remain unchanged.",
        "require": {
          "goldMin": 1,
          "notFlags": [
            "reserve_list_451"
          ]
        },
        "effects": {
          "gold": -1,
          "setFlag": "reserve_list_451"
        },
        "text": "Your household keeps the preparations for later questions."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "thessalonica_collection_query_451",
    "pack": "dated_451",
    "title": "Whose sum is this?",
    "text": "A collection is being discussed at Thessalonica. {friend} asks whether the household’s figures include provisions already promised elsewhere. You may check private arithmetic without accepting a public tribute demand.",
    "trigger": {
      "countyIds": [
        "thessaloniki"
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
    "once": true,
    "options": [
      {
        "label": "Check the separate sums",
        "chance": "reserve_accounts_451",
        "success": {
          "text": "Your household’s figures are clearer. No public receipt is issued.",
          "effects": {
            "skills": {
              "ste": 1
            }
          }
        },
        "failure": {
          "text": "You cannot reconcile the figures and leave them unendorsed.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "friend",
        "source": "role",
        "role": "friend",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "friend"
    ]
  },
  {
    "id": "ravenna_double_demand_451",
    "pack": "dated_451",
    "title": "Two requests for one cart",
    "text": "While the western court is at war, {friend} brings two reports about the same requisition. Neither of you can authorize an army’s purchase. Careful questions may at least keep a private promise from being counted twice.",
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
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Compare the reports with your friend",
        "chance": "household_accounts_451",
        "success": {
          "text": "You find the repeated entry before making any private promise.",
          "effects": {
            "standingCharacter": {
              "participant": "friend",
              "amt": 3
            }
          }
        },
        "failure": {
          "text": "The reports cannot yet be reconciled.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "friend",
        "source": "role",
        "role": "friend",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "friend"
    ]
  },
  {
    "id": "arles_river_news_451",
    "pack": "dated_451",
    "title": "News unloaded with the cargo",
    "text": "War makes river traffic at Arelate uncertain. {friend} has heard that a road ahead is closed, but cannot tell whether the report is current. Ask questions before treating it as a command to flee.",
    "trigger": {
      "countyIds": [
        "arles"
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
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Ask where the news came from",
        "chance": "road_inquiry_451",
        "success": {
          "text": "You trace the report to an older journey, rather than a fresh order.",
          "effects": {
            "skills": {
              "dip": 1
            }
          }
        },
        "failure": {
          "text": "The report remains unconfirmed.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "friend",
        "source": "role",
        "role": "friend",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "friend"
    ]
  },
  {
    "id": "troyes_mediation_cost_451",
    "pack": "dated_451",
    "title": "Bread for the waiting room",
    "text": "During war, households at Augustobona discuss asking a bishop to mediate with armed travelers. Bread for those waiting is a smaller, immediate matter. Your contribution neither appoints an envoy nor purchases safety.",
    "trigger": {
      "countyIds": [
        "troyes"
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
      "realmAtWar": true
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Contribute bread for {money:1}",
        "require": {
          "goldMin": 1
        },
        "effects": {
          "gold": -1,
          "piety": 2
        },
        "text": "Your contribution feeds those waiting. No agreement is made in your name."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ]
  },
  {
    "id": "constantinople_church_copy_451",
    "pack": "dated_451",
    "title": "A letter across the strait",
    "text": "Winter travelers carry competing reports of proposals debated at Chalcedon. Before repeating a formula, your household could learn to read the letters for itself. No reported council decision changes anyone’s faith here.",
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
      ],
      "notHoldings": [
        "letters"
      ],
      "seasonKinds": [
        "winter"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Teach the household its letters for {money:30}",
        "require": {
          "goldMin": 30,
          "notHoldings": [
            "letters"
          ]
        },
        "effects": {
          "gold": -30,
          "holding": "letters"
        },
        "text": "The purchase stays with your household."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "yearMin": 451,
    "yearMax": 452
  },
  {
    "id": "constantinople_church_questions_451",
    "pack": "dated_451",
    "title": "Words carefully repeated",
    "text": "In the winter discussion of eastern church proposals, {cleric} warns that a shouted phrase and a complete letter need not say the same thing. You can listen without pledging assent to an alleged decision.",
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
      ],
      "seasonKinds": [
        "winter"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Ask about the complete argument",
        "chance": "church_reading_451",
        "success": {
          "text": "You understand the disputed wording more clearly.",
          "effects": {
            "skills": {
              "lea": 1
            },
            "standingCharacter": {
              "participant": "cleric",
              "amt": 2
            }
          }
        },
        "failure": {
          "text": "The wording remains difficult; you reserve judgment.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "cleric",
        "source": "role",
        "role": "priest",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "cleric"
    ],
    "yearMin": 451,
    "yearMax": 452
  },
  {
    "id": "antioch_church_messenger_451",
    "pack": "dated_451",
    "title": "A messenger’s version",
    "text": "A winter report from the discussions near Constantinople reaches Antioch. {cleric} asks which words belong to a letter and which were added on the road. Hearing a report commits you to no doctrinal position.",
    "trigger": {
      "countyIds": [
        "antioch"
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
      "seasonKinds": [
        "winter"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Compare the messenger’s account",
        "chance": "church_reading_451",
        "success": {
          "text": "You distinguish the quoted passage from the traveler’s gloss.",
          "effects": {
            "skills": {
              "lea": 1
            }
          }
        },
        "failure": {
          "text": "You cannot settle the wording and leave the disagreement open.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "cleric",
        "source": "role",
        "role": "priest",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "cleric"
    ],
    "yearMin": 451,
    "yearMax": 452
  },
  {
    "id": "alexandria_church_waiting_451",
    "pack": "dated_451",
    "title": "People waiting for letters",
    "text": "Winter brings disputed accounts of eastern church deliberations to Alexandria. People waiting for reliable letters still need an evening meal. You may contribute without endorsing an accusation or a deposition.",
    "trigger": {
      "countyIds": [
        "alexandria"
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
      "seasonKinds": [
        "winter"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Help with the evening meal for {money:1}",
        "require": {
          "goldMin": 1
        },
        "effects": {
          "gold": -1,
          "piety": 2
        },
        "text": "You give toward the meal. The disputed reports remain disputed."
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "yearMin": 451,
    "yearMax": 452
  },
  {
    "id": "rome_church_correspondence_451",
    "pack": "dated_451",
    "title": "A letter and its retelling",
    "text": "Winter correspondence brings arguments from the eastern church to Rome. {cleric} asks you to hear the whole account rather than repeat a verdict from the street. No council outcome is imposed by listening.",
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
      "seasonKinds": [
        "winter"
      ]
    },
    "weight": 3,
    "once": true,
    "options": [
      {
        "label": "Listen to the argument in full",
        "chance": "church_reading_451",
        "success": {
          "text": "You follow more of the reasoning without claiming a final verdict.",
          "effects": {
            "skills": {
              "lea": 1
            }
          }
        },
        "failure": {
          "text": "You leave with questions still unanswered.",
          "effects": {}
        }
      },
      {
        "label": "Leave this for now",
        "effects": {},
        "text": "You make no new commitment."
      }
    ],
    "participants": [
      {
        "slot": "cleric",
        "source": "role",
        "role": "priest",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "cleric"
    ],
    "yearMin": 451,
    "yearMax": 452
  }
]);
});
