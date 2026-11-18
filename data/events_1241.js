/* Local decisions in the 1241 campaign. */
FB.bookmarkSources.eventPack('data/events_1241.js',function (FBDATA) {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.dated_1241 = { bookmarkIds:['1241'], eras:['high_medieval'], yearMin:1241, yearMax:1261 };
  FBDATA.events.push(
{
  "id": "guarded_position_1241",
  "pack": "dated_1241",
  "title": "People in different places",
  "trigger": {
    "countyIds": [
      "szekesfehervar"
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
  "text": "Personal protective guard, civilian camps and a field host have separate location records. A household considering the hosted following must distinguish those places before making plans.",
  "options": [
    {
      "label": "Consider the separate positions",
      "desc": "Continue these optional planning questions. This releases nobody or establishes arrival.",
      "effects": {
        "setFlag": "guard_position_considered_1241"
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
  "id": "guarded_purse_1241",
  "pack": "dated_1241",
  "title": "A household purse",
  "trigger": {
    "countyIds": [
      "szekesfehervar"
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
      "guard_position_considered_1241"
    ]
  },
  "weight": 2,
  "once": true,
  "text": "You have chosen to distinguish personal and camp positions. A household purse also differs from the following’s public account and camp food.",
  "options": [
    {
      "label": "Keep the accounts separate",
      "desc": "Remember this priority and continue the planning questions. Transfer no money or supplies.",
      "effects": {
        "setFlag": "private_purse_considered_1241"
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
  "id": "host_terms_1241",
  "pack": "dated_1241",
  "title": "The host’s actual terms",
  "trigger": {
    "countyIds": [
      "szekesfehervar"
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
      "private_purse_considered_1241"
    ]
  },
  "weight": 2,
  "once": true,
  "text": "Your planning keeps private and public resources distinct. Hosting, access and protective guard have their own terms; remembering a preference cannot extend any of them.",
  "options": [
    {
      "label": "Keep actual terms in view",
      "desc": "Continue these planning questions. No agreement is renewed and no release is requested.",
      "effects": {
        "setFlag": "host_terms_considered_1241"
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
  "id": "separate_camps_1241",
  "pack": "dated_1241",
  "title": "Separate civilian camps",
  "trigger": {
    "countyIds": [
      "szekesfehervar"
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
      "host_terms_considered_1241"
    ]
  },
  "weight": 2,
  "once": true,
  "text": "Your planning now distinguishes hosting from personal guard. Separate civilian camps keep their own people, stores and actual positions. A personal journey cannot carry those camps.",
  "options": [
    {
      "label": "Consider the camps separately",
      "desc": "Continue the planning questions without moving people, spending food or claiming command.",
      "effects": {
        "setFlag": "camp_positions_considered_1241"
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
  "id": "later_departure_1241",
  "pack": "dated_1241",
  "title": "Before considering another road",
  "trigger": {
    "countyIds": [
      "szekesfehervar"
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
      "camp_positions_considered_1241"
    ]
  },
  "weight": 2,
  "once": true,
  "text": "You have distinguished camp movement from a personal journey. Later travel still needs an actual eligible route, current permission and its ordinary price.",
  "options": [
    {
      "label": "Keep later movement a separate decision",
      "desc": "Complete these planning questions. No journey, release, refuge or camp move is created.",
      "effects": {
        "setFlag": "later_departure_considered_1241"
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
  "id": "column_stores_1241",
  "pack": "dated_1241",
  "title": "Camp stock and carried rations",
  "trigger": {
    "countyIds": [
      "volodymyr",
      "krakow",
      "cluj",
      "gyula"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "mongol_western_command_1241"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "The western command’s camp stock is below thirty days for the whole following. The columns carry separate food; this planning threshold alone does not say which field host can buy or load provisions.",
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
  "id": "column_reunion_1241",
  "pack": "dated_1241",
  "title": "Loading needs reunion",
  "trigger": {
    "countyIds": [
      "volodymyr",
      "krakow",
      "cluj",
      "gyula"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "mongol_western_command_1241"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "The western command’s camp reserve is below its planning line. Moving food from camp to a column requires an actual halted reunion. A remote column’s market purchase has its own stock, access and payment review.",
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
  "id": "column_scope_1241",
  "pack": "dated_1241",
  "title": "One command, several positions",
  "trigger": {
    "countyIds": [
      "volodymyr",
      "krakow",
      "cluj",
      "gyula"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "mongol_western_command_1241"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "With camp stock below the western command’s planning line, a neat list of orders is tempting. Each column still has its own commander, real position and carried rations; a field order cannot carry every civilian camp.",
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
  "id": "hosted_stores_1241",
  "pack": "dated_1241",
  "title": "A hosted following’s stores",
  "trigger": {
    "countyIds": [
      "szekesfehervar"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "koten_following_1241"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "The hosted following’s camp food is below thirty days for its whole population. Hosting supplies no automatic purchase, recruitment right or new stock. The civilian camps retain their separate stores and ordinary provisioning controls.",
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
  "id": "hosted_presence_1241",
  "pack": "dated_1241",
  "title": "Permission is not presence",
  "trigger": {
    "countyIds": [
      "szekesfehervar"
    ],
    "state": [
      {
        "reader": "mobile_scarcity",
        "args": {
          "realmId": "koten_following_1241"
        }
      }
    ]
  },
  "weight": 2,
  "once": true,
  "text": "The hosted following’s camp reserve is below its planning line. An access agreement does not place its leader beside those stores. Personal guard, actual camp presence and effective command remain separate questions.",
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
}
  );
});
