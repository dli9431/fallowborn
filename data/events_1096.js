/* Local decisions in the 1096 campaign. */
FB.bookmarkSources.eventPack('data/events_1096.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_1096 = { bookmarkIds:['1096'], eras:['high_medieval'], yearMin:1096, yearMax:1116 };
  FBDATA.events.push(
{
  "id": "mainz_accounts_1096",
  "pack": "dated_1096",
  "title": "Consider the evidence",
  "trigger": {
    "countyIds": [
      "mainz"
    ],
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "territorial"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "Accounts of the past and present household circumstances answer different questions. You can keep that distinction in mind while considering temporary refuge.",
  "options": [
    {
      "label": "Remember the distinction",
      "desc": "Continue these optional planning questions. This creates no current attack.",
      "effects": {
        "setFlag": "mainz_accounts_considered_1096"
      }
    },
    {
      "label": "Set these planning questions aside",
      "desc": "End this sequence of reminders. Any actual shelter, guard or access arrangement keeps its separate terms.",
      "effects": {}
    }
  ]
},
{
  "id": "mainz_shelter_request_1096",
  "pack": "dated_1096",
  "title": "Before a shelter request",
  "trigger": {
    "countyIds": [
      "mainz"
    ],
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "territorial"
        }
      }
    ],
    "flags": [
      "mainz_accounts_considered_1096"
    ]
  },
  "weight": 2,
  "once": true,
  "text": "You have chosen to consider the evidence separately from current circumstances. Any real shelter request still names exact people, with separate adult consent and dependent care.",
  "options": [
    {
      "label": "Consider who would need to consent",
      "desc": "Remember this planning step. Use the separate refuge card for an actual request.",
      "effects": {
        "setFlag": "mainz_request_considered_1096"
      }
    },
    {
      "label": "Set these planning questions aside",
      "desc": "End this sequence of reminders. Any actual shelter, guard or access arrangement keeps its separate terms.",
      "effects": {}
    }
  ]
},
{
  "id": "mainz_finite_places_1096",
  "pack": "dated_1096",
  "title": "Finite places and separate permissions",
  "trigger": {
    "countyIds": [
      "mainz"
    ],
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "territorial"
        }
      }
    ],
    "flags": [
      "mainz_request_considered_1096"
    ]
  },
  "weight": 2,
  "once": true,
  "text": "You are considering consent before seeking refuge. Civil authorization, an episcopal offer and available places are separate requirements. Reading about them reserves nothing.",
  "options": [
    {
      "label": "Keep the separate permissions in view",
      "desc": "Continue these planning questions without reserving a place or paying a fee.",
      "effects": {
        "setFlag": "mainz_places_considered_1096"
      }
    },
    {
      "label": "Set these planning questions aside",
      "desc": "End this sequence of reminders. Any actual shelter, guard or access arrangement keeps its separate terms.",
      "effects": {}
    }
  ]
},
{
  "id": "mainz_renewed_consent_1096",
  "pack": "dated_1096",
  "title": "A term has an end",
  "trigger": {
    "countyIds": [
      "mainz"
    ],
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "territorial"
        }
      }
    ],
    "flags": [
      "mainz_places_considered_1096"
    ]
  },
  "weight": 2,
  "once": true,
  "text": "Your planning has distinguished people, permission and places. An actual protective term can end; any further term needs its own current review.",
  "options": [
    {
      "label": "Keep later consent under review",
      "desc": "Complete these planning questions. This renews no term, admits nobody and certifies no safety.",
      "effects": {
        "setFlag": "mainz_consent_remembered_1096"
      }
    },
    {
      "label": "Set these planning questions aside",
      "desc": "End this sequence of reminders. Any actual shelter, guard or access arrangement keeps its separate terms.",
      "effects": {}
    }
  ]
},
{
  "id": "godfrey_ration_account_1096",
  "pack": "dated_1096",
  "title": "Provisions around Verdun",
  "trigger": {
    "countyIds": [
      "verdun",
      "luxembourg",
      "metz",
      "trier"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "godfrey_host_1096"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "The expedition’s camp stock is below the thirty-day planning line for its whole following. Its public stores, the host’s carried food and your household purse are separate accounts.",
  "options": [
    {
      "label": "Study the provisioning account",
      "desc": "Consider the distinction between camp stock and food carried by the field host.",
      "effects": {
        "skills": {
          "ste": 1
        }
      }
    },
    {
      "label": "Leave procurement to its ordinary review",
      "desc": "Make no purchase or promise of supplies.",
      "effects": {}
    }
  ]
},
{
  "id": "godfrey_passage_terms_1096",
  "pack": "dated_1096",
  "title": "A market beyond the first road",
  "trigger": {
    "countyIds": [
      "verdun",
      "luxembourg",
      "metz",
      "trier"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "godfrey_host_1096"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "With the expedition’s camp stock below its planning line, {friend} asks whether another market could help. A possible road still needs actual permission; a conversation cannot buy food or move the camp.",
  "options": [
    {
      "label": "Explain the need for separate terms",
      "desc": "Try to make the distinction clear without negotiating an agreement.",
      "chance": "rights_dip",
      "success": {
        "text": "Your explanation helps keep food, passage and payment distinct.",
        "effects": {
          "opinion": {
            "role": "friend",
            "amt": 5
          }
        }
      },
      "failure": {
        "text": "The discussion ends without agreement or a purchase.",
        "effects": {}
      }
    },
    {
      "label": "Leave the question open",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "role": "friend",
      "required": true
    }
  ],
  "participantCards": [
    "friend"
  ]
},
{
  "id": "raymond_ration_account_1096",
  "pack": "dated_1096",
  "title": "Stores for the Toulouse following",
  "trigger": {
    "countyIds": [
      "toulouse",
      "narbonne"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "raymond_host_1096"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "The expedition’s camp stock is below the thirty-day planning line for its whole following. Its public stores, the host’s carried food and your household purse are separate accounts.",
  "options": [
    {
      "label": "Study the provisioning account",
      "desc": "Consider the distinction between camp stock and food carried by the field host.",
      "effects": {
        "skills": {
          "ste": 1
        }
      }
    },
    {
      "label": "Leave procurement to its ordinary review",
      "desc": "Make no purchase or promise of supplies.",
      "effects": {}
    }
  ]
},
{
  "id": "raymond_passage_terms_1096",
  "pack": "dated_1096",
  "title": "Terms on the Narbonne approach",
  "trigger": {
    "countyIds": [
      "toulouse",
      "narbonne"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "raymond_host_1096"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "With the expedition’s camp stock below its planning line, {friend} asks whether another market could help. A possible road still needs actual permission; a conversation cannot buy food or move the camp.",
  "options": [
    {
      "label": "Explain the need for separate terms",
      "desc": "Try to make the distinction clear without negotiating an agreement.",
      "chance": "rights_dip",
      "success": {
        "text": "Your explanation helps keep food, passage and payment distinct.",
        "effects": {
          "opinion": {
            "role": "friend",
            "amt": 5
          }
        }
      },
      "failure": {
        "text": "The discussion ends without agreement or a purchase.",
        "effects": {}
      }
    },
    {
      "label": "Leave the question open",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "role": "friend",
      "required": true
    }
  ],
  "participantCards": [
    "friend"
  ]
},
{
  "id": "bohemond_ration_account_1096",
  "pack": "dated_1096",
  "title": "The Taranto provisioning account",
  "trigger": {
    "countyIds": [
      "taranto",
      "bari"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "bohemond_host_1096"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "The expedition’s camp stock is below the thirty-day planning line for its whole following. Its public stores, the host’s carried food and your household purse are separate accounts.",
  "options": [
    {
      "label": "Study the provisioning account",
      "desc": "Consider the distinction between camp stock and food carried by the field host.",
      "effects": {
        "skills": {
          "ste": 1
        }
      }
    },
    {
      "label": "Leave procurement to its ordinary review",
      "desc": "Make no purchase or promise of supplies.",
      "effects": {}
    }
  ]
},
{
  "id": "bohemond_passage_terms_1096",
  "pack": "dated_1096",
  "title": "A road toward Bari",
  "trigger": {
    "countyIds": [
      "taranto",
      "bari"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "bohemond_host_1096"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "With the expedition’s camp stock below its planning line, {friend} asks whether another market could help. A possible road still needs actual permission; a conversation cannot buy food or move the camp.",
  "options": [
    {
      "label": "Explain the need for separate terms",
      "desc": "Try to make the distinction clear without negotiating an agreement.",
      "chance": "rights_dip",
      "success": {
        "text": "Your explanation helps keep food, passage and payment distinct.",
        "effects": {
          "opinion": {
            "role": "friend",
            "amt": 5
          }
        }
      },
      "failure": {
        "text": "The discussion ends without agreement or a purchase.",
        "effects": {}
      }
    },
    {
      "label": "Leave the question open",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "role": "friend",
      "required": true
    }
  ],
  "participantCards": [
    "friend"
  ]
}
  );
});
