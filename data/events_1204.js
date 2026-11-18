/* Local decisions in the 1204 campaign. */
FB.bookmarkSources.eventPack('data/events_1204.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_1204 = { bookmarkIds:['1204'], eras:['high_medieval'], yearMin:1204, yearMax:1224 };
  FBDATA.events.push(
{
  "id": "stall_payment_1204",
  "pack": "dated_1204",
  "title": "The stall permission account",
  "trigger": {
    "countyIds": [
      "london"
    ],
    "state": [
      {
        "reader": "owned_enterprise_law",
        "args": {
          "definitionId": "london_stall_license"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "An operating law currently applies to one of your London businesses. Review its actual permission, exemptions and current terms before deciding what to do.",
  "options": [
    {
      "label": "Review permission payment",
      "desc": "Inspect the actual private charge and public payee.",
      "review": {
        "type": "industry_operation",
        "args": {
          "definitionId": "london_stall_license",
          "action": "pay"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the business as it is",
      "desc": "Make no payment or operating change.",
      "effects": {}
    }
  ],
  "yearMax": 1215
},
{
  "id": "stall_pause_1204",
  "pack": "dated_1204",
  "title": "A pause at the stall",
  "trigger": {
    "countyIds": [
      "london"
    ],
    "state": [
      {
        "reader": "owned_enterprise_law",
        "args": {
          "definitionId": "london_stall_license"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "An operating law currently applies to one of your London businesses. Review its actual permission, exemptions and current terms before deciding what to do.",
  "options": [
    {
      "label": "Review pausing production",
      "desc": "Review a pause while retaining ownership and existing worker obligations.",
      "review": {
        "type": "industry_operation",
        "args": {
          "definitionId": "london_stall_license",
          "action": "pause"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the business as it is",
      "desc": "Make no payment or operating change.",
      "effects": {}
    }
  ],
  "yearMax": 1215
},
{
  "id": "workshop_payment_1204",
  "pack": "dated_1204",
  "title": "Workshop operating terms",
  "trigger": {
    "countyIds": [
      "london"
    ],
    "state": [
      {
        "reader": "owned_enterprise_law",
        "args": {
          "definitionId": "london_guild_license"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "An operating law currently applies to one of your London businesses. Review its actual permission, exemptions and current terms before deciding what to do.",
  "options": [
    {
      "label": "Review permission payment",
      "desc": "Inspect the actual private charge and public payee.",
      "review": {
        "type": "industry_operation",
        "args": {
          "definitionId": "london_guild_license",
          "action": "pay"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the business as it is",
      "desc": "Make no payment or operating change.",
      "effects": {}
    }
  ],
  "yearMax": 1215
},
{
  "id": "workshop_pause_1204",
  "pack": "dated_1204",
  "title": "A quiet workshop",
  "trigger": {
    "countyIds": [
      "london"
    ],
    "state": [
      {
        "reader": "owned_enterprise_law",
        "args": {
          "definitionId": "london_guild_license"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "An operating law currently applies to one of your London businesses. Review its actual permission, exemptions and current terms before deciding what to do.",
  "options": [
    {
      "label": "Review pausing production",
      "desc": "Review a pause while retaining ownership and existing worker obligations.",
      "review": {
        "type": "industry_operation",
        "args": {
          "definitionId": "london_guild_license",
          "action": "pause"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the business as it is",
      "desc": "Make no payment or operating change.",
      "effects": {}
    }
  ],
  "yearMax": 1215
},
{
  "id": "roman_charter_1204",
  "pack": "dated_1204",
  "title": "Read the charter first",
  "trigger": {
    "countyIds": [
      "roma"
    ],
    "state": [
      {
        "reader": "open_episcopal_claim",
        "args": {
          "profileId": "roman_temporal_rent"
        },
        "not": true
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "You have no current open civil rent claim in the Roman episcopal review. A church connection alone establishes no debt. Any future review must begin with an actual delegated settlement and its charter.",
  "options": [
    {
      "label": "Study the distinction",
      "effects": {
        "skills": {
          "lea": 1
        }
      }
    },
    {
      "label": "Return to ordinary affairs",
      "effects": {}
    }
  ],
  "yearMax": 1215
},
{
  "id": "roman_accounts_1204",
  "pack": "dated_1204",
  "title": "Institution and household",
  "trigger": {
    "countyIds": [
      "roma"
    ],
    "state": [
      {
        "reader": "open_episcopal_claim",
        "args": {
          "profileId": "roman_temporal_rent"
        },
        "not": true
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "No current open Roman rent claim involves you. It is worth distinguishing the see’s public receipts from a bishop’s private purse before considering any future proposal.",
  "options": [
    {
      "label": "Study the distinction",
      "effects": {
        "skills": {
          "lea": 1
        }
      }
    },
    {
      "label": "Return to ordinary affairs",
      "effects": {}
    }
  ],
  "yearMax": 1215
},
{
  "id": "roman_evidence_1204",
  "pack": "dated_1204",
  "title": "A court needs a recorded cause",
  "trigger": {
    "countyIds": [
      "roma"
    ],
    "state": [
      {
        "reader": "open_religious_case",
        "args": {
          "profileId": "roman_clerical_violence"
        },
        "not": true
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "No current open clerical-violence case involves you. A religious difference or private suspicion supplies no recorded attack. The ecclesiastical court must inspect actual evidence before a proceeding can begin.",
  "options": [
    {
      "label": "Study the distinction",
      "effects": {
        "skills": {
          "lea": 1
        }
      }
    },
    {
      "label": "Return to ordinary affairs",
      "effects": {}
    }
  ],
  "yearMax": 1215
},
{
  "id": "occitan_oversight_1204",
  "pack": "dated_1204",
  "title": "Oversight and local life",
  "trigger": {
    "countyIds": [
      "toulouse",
      "albi",
      "cahors",
      "rodez",
      "beziers",
      "carcassonne"
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
  "text": "In {province}, the {term:county} holder still governs through territorial institutions. Religious oversight and submission are questions for the actual courts; no demand alone proves a neighbour guilty.",
  "options": [
    {
      "label": "Reflect on local obligations",
      "effects": {
        "skills": {
          "dip": 1
        }
      }
    },
    {
      "label": "Keep to household business",
      "effects": {}
    }
  ],
  "yearMin": 1209
},
{
  "id": "occitan_trade_1204",
  "pack": "dated_1204",
  "title": "A market amid disputes",
  "trigger": {
    "countyIds": [
      "toulouse",
      "albi",
      "cahors",
      "rodez",
      "beziers",
      "carcassonne"
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
  "text": "{friend} wonders whether disputes over religious protection must decide every market bargain in {province}. You can discuss ordinary dealings without undertaking a campaign or accusing a household.",
  "options": [
    {
      "label": "Argue for ordinary dealings",
      "chance": "rights_dip",
      "success": {
        "text": "Your friend accepts the distinction.",
        "effects": {
          "opinion": {
            "role": "friend",
            "amt": 5
          }
        }
      },
      "failure": {
        "text": "The question remains unsettled.",
        "effects": {}
      }
    },
    {
      "label": "Keep to household business",
      "effects": {}
    }
  ],
  "yearMin": 1209,
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
  "id": "occitan_petitions_1204",
  "pack": "dated_1204",
  "title": "What a petition can say",
  "trigger": {
    "countyIds": [
      "toulouse",
      "albi",
      "cahors",
      "rodez",
      "beziers",
      "carcassonne"
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
  "text": "The territorial {term:county} government in {province} remains the place for local petitions. A request about ordinary obligations need not claim that a campaign has begun or that a community has changed its faith.",
  "options": [
    {
      "label": "Reflect on local obligations",
      "effects": {
        "skills": {
          "dip": 1
        }
      }
    },
    {
      "label": "Keep to household business",
      "effects": {}
    }
  ],
  "yearMin": 1209
}
  );
});
