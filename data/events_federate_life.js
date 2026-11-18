/* Service bargains and neighboring households. */
(function () {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.federate_life = { eras:['late_antique','high_medieval'], yearMin:450, yearMax:1250 };
  FBDATA.eventChances.federate_neighbor_hearing = { base:0.55, min:0.1, max:0.9, steps:[{kind:'skill',id:'dip',factor:0.02}] };
  FBDATA.events.push(
{
  "id": "federate_pay_table",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 476,
  "yearMax": 493,
  "title": "The pay table",
  "text": "The soldiers ask about the next service bargain. {neighbor} wants to know whether buying provisions on credit will leave it waiting for the same treasury.",
  "trigger": {
    "countyIds": [
      "ravenna",
      "pavia"
    ],
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "federate_polity"
        }
      },
      {
        "reader": "federate_contract",
        "args": {
          "realmId": "player",
          "status": "offered"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 4,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Hear expectations of the offer",
      "desc": "Discuss the proposal without making a public commitment. Risk a personal disagreement.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor appreciates being heard without a promise of public action.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor hears a promise or an accusation you did not intend.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the proposal to its parties",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review this service offer",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_contract",
        "args": {
          "action": "consent"
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "federate_changed_terms",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 476,
  "yearMax": 493,
  "title": "A different promise",
  "text": "The treasury proposal and the soldiers’ recollection no longer agree. {neighbor} asks which promise should govern its own expectations.",
  "trigger": {
    "countyIds": [
      "ravenna",
      "pavia"
    ],
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "federate_polity"
        }
      },
      {
        "reader": "federate_contract",
        "args": {
          "realmId": "player",
          "status": "breached"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 4,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Hear the changed expectations",
      "desc": "Discuss the proposal without making a public commitment. Risk a personal disagreement.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor appreciates being heard without a promise of public action.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor hears a promise or an accusation you did not intend.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the proposal to its parties",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review new service terms",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_contract",
        "args": {
          "action": "renew",
          "extensionDays": 360
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "federate_allotment_neighbors",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 476,
  "yearMax": 493,
  "title": "Neighbors of an allotment",
  "text": "A proposed county assignment raises questions about the families already living there. The arriving court wants a secure home; {neighbor} wants existing households and their property recognized. Only an existing consented or won claim can reach settlement.",
  "trigger": {
    "countyIds": [
      "ravenna",
      "pavia"
    ],
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "federate_polity"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 4,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Listen to the neighboring household",
      "desc": "Discuss the proposal without making a public commitment. Risk a personal disagreement.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor appreciates being heard without a promise of public action.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor hears a promise or an accusation you did not intend.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the proposal to its parties",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review the existing county claim",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_settlement",
        "args": {},
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "federate_settlement_copy",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 476,
  "yearMax": 493,
  "title": "The settlement copy",
  "text": "The soldiers want a durable agreement, while the households beside them want the civic guarantees read aloud once more. {neighbor} asks what the proposed copy would actually bind.",
  "trigger": {
    "countyIds": [
      "ravenna",
      "pavia"
    ],
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "federate_polity"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 4,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Discuss the draft with the neighbor",
      "desc": "Discuss the proposal without making a public commitment. Risk a personal disagreement.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor appreciates being heard without a promise of public action.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor hears a promise or an accusation you did not intend.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the proposal to its parties",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review the settlement terms",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_settlement",
        "args": {},
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "federate_empty_purse",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "An empty purse",
  "text": "A soldier’s household asks {neighbor} for another extension on provisions. {neighbor} has a household to feed too, and asks you to hear the account before blaming either side.",
  "trigger": {
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "federate_polity"
        }
      },
      {
        "reader": "federate_contract",
        "args": {
          "realmId": "player",
          "status": "breached"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Hear both accounts",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The conversation separates a household debt from a court’s service obligation.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The conversation hardens into an argument about who should bear the delay.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review a fresh bargain",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_contract",
        "args": {
          "action": "renew",
          "extensionDays": 180
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "federate_pay_rumor",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "A rumor of pay",
  "text": "There is talk of money on the road, but no receipt has reached {neighbor}. A soldier asks for goods against that rumor; the local household asks why it should carry the risk.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "offered"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Counsel patience with the household",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The household appreciates being heard without a promise of public money.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "Your caution sounds like taking the other side.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "federate_boundary_stone",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "The boundary stone",
  "text": "A soldier points to a proposed field assignment. {neighbor} points to the boundary used by the neighboring households. Neither a camp banner nor an old stone settles the lawful grant.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Listen at the boundary",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "Both accounts can be heard without treating possession as a judgment.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The walk ends with each side more suspicious of the other.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "federate_shared_well",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "One well, two queues",
  "text": "{neighbor} describes households and soldiers waiting at the same well. Each believes the other arrives with too many vessels. You can offer an example of patience without claiming authority over the water.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Wait alongside the household",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The small courtesy makes another conversation possible.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "Your example is received as a rebuke.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "federate_season_call",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "Service and the household",
  "text": "A possible call to service worries a soldier who helps {neighbor} with seasonal work. The local household fears losing that help; the soldier fears being treated as unreliable.",
  "trigger": {
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "federate_polity"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Hear the household’s difficulty",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "Listening improves your personal understanding with the neighbor.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "Your questions are taken for an attempt to avoid service.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review ending this service",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_contract",
        "args": {
          "action": "release"
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "federate_term_calendar",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "Counting the term",
  "text": "A follower asks how many promises can safely be made against the remaining service term. {neighbor} wants to plan next season’s household expenses without assuming that a bargain lasts forever.",
  "trigger": {
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "federate_polity"
        }
      },
      {
        "reader": "federate_contract",
        "args": {
          "realmId": "player",
          "status": "active",
          "endsWithinDays": 30
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Compare their expectations",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The conversation distinguishes a hoped-for renewal from an existing commitment.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "Neither side welcomes uncertainty about next season.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review renewal",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_contract",
        "args": {
          "action": "renew",
          "extensionDays": 360
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "federate_lodging_door",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "The lodging door",
  "text": "{neighbor} fears that a soldier’s request for temporary lodging will become a permanent claim. The soldier’s household fears being turned out without time to prepare.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Hear the limits each household needs",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "Clearer expectations improve your personal standing with the neighbor.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The discussion makes the disagreement more personal.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "federate_departure_bundle",
  "pack": "federate_life",
  "eras": [
    "late_antique"
  ],
  "yearMin": 450,
  "yearMax": 650,
  "title": "The packed bundle",
  "text": "A household is considering the existing civilian evacuation route. {neighbor} asks who controls its receiving county and which community is eligible. A packed bundle alone authorizes no movement, and a field host cannot carry this civilian decision.",
  "trigger": {
    "state": [
      {
        "reader": "attached_story_type",
        "args": {
          "type": "civilian_migration"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "civil_ruler",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "civil_ruler"
  ],
  "options": [
    {
      "label": "Talk through the uncertainty",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor appreciates your attention to the households left beside the camp.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "Your questions sound like criticism of a family’s hopes.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review the civilian route",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "civilian_migration",
        "args": {
          "action": "authorize"
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "hosted_changed_price",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "A changed asking price",
  "text": "A follower reports that the host court now asks for different terms. {neighbor} worries that local households will be blamed for a decision they did not make.",
  "trigger": {
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "hosted_following"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Hear the local account",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "You distinguish the neighbor from the court making the offer.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor hears an accusation behind your questions.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review the proposed term",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_contract",
        "args": {
          "action": "renew",
          "extensionDays": 180
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "hosted_shared_oven",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "The shared oven",
  "text": "The following’s households and {neighbor} want the same oven time. Each has people waiting for food; neither wants an informal courtesy treated as a permanent entitlement.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Wait and hear the household",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "A modest courtesy improves your relationship with the neighbor.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "Waiting does little to cool the argument.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "hosted_guest_debt",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "A guest’s debt",
  "text": "A follower has bought food on credit from {neighbor}. The seller asks for payment; the buyer points to a promised allowance. Neither household can draw directly on the other court’s treasury.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "breached"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Hear the seller without promising payment",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor welcomes a hearing that does not invent a public guarantee.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor thinks you are offering words instead of an answer.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "hosted_bad_season",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "A call at a bad time",
  "text": "A possible service call conflicts with the work a follower has promised {neighbor}. The household needs help now, while the following’s leaders may need people elsewhere.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Listen to the household’s plans",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "Your attention improves the neighbor’s personal regard.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor suspects that you are excusing the interruption.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "hosted_expiry_question",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "After the term",
  "text": "A follower wonders whether the service bargain will be renewed. {neighbor} asks what the households should plan if either court refuses. Renewing service alone grants no new hosting access.",
  "trigger": {
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "hosted_following"
        }
      },
      {
        "reader": "federate_contract",
        "args": {
          "realmId": "player",
          "status": "active",
          "endsWithinDays": 30
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Discuss plans without making promises",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor appreciates the distinction between a plan and permission.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "Uncertainty makes the conversation sour.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review a renewal proposal",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_contract",
        "args": {
          "action": "renew",
          "extensionDays": 360
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "hosted_refuge_question",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "A request for shelter",
  "text": "A frightened household asks about refuge. {neighbor} wants to help but asks who can offer places, for how long, and with whose consent. Kind words alone cannot enroll people in protection.",
  "trigger": {
    "state": [
      {
        "reader": "attached_story_type",
        "args": {
          "type": "household_refuge"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "refuge_host",
      "source": "context",
      "required": true
    },
    {
      "slot": "refuge_ruler",
      "source": "context",
      "required": true
    },
    {
      "slot": "refuge_guest",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "refuge_host",
    "refuge_ruler",
    "refuge_guest"
  ],
  "options": [
    {
      "label": "Listen without promising a place",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor trusts your care with other people’s expectations.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The neighbor thinks your caution withholds sympathy.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review a request for places",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "household_refuge",
        "args": {
          "action": "request"
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "hosted_civilian_route",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "The civilian road",
  "text": "A follower’s relatives ask about moving together. {neighbor} asks who would receive them and whether everyone agrees. Moving a field force is no authorization to relocate civilian households.",
  "trigger": {
    "state": [
      {
        "reader": "federate_host_household",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    }
  ],
  "participantCards": [
    "neighbor"
  ],
  "options": [
    {
      "label": "Hear the relatives’ concerns",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "The neighbor appreciates that you have not mistaken people for baggage.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The discussion leaves the neighbor uneasy about your intentions.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "hosted_land_request",
  "pack": "federate_life",
  "eras": [
    "high_medieval"
  ],
  "yearMin": 1096,
  "yearMax": 1250,
  "title": "A field beside the camp",
  "text": "A follower asks whether a nearby field could become a home. {neighbor} describes the household that already uses it. Hosting, occupation and a lawful settlement remain separate questions.",
  "trigger": {
    "state": [
      {
        "reader": "sovereign_government",
        "args": {
          "formId": "hosted_following"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 8,
  "participants": [
    {
      "slot": "neighbor",
      "source": "local_neighbor",
      "required": true,
      "createFallback": true,
      "sameHome": true
    },
    {
      "slot": "patron",
      "source": "context",
      "required": true
    },
    {
      "slot": "captain",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "neighbor",
    "patron",
    "captain"
  ],
  "options": [
    {
      "label": "Walk the field with the neighbor",
      "desc": "Risk a disagreement while hearing the household. No payment, service permission or land changes.",
      "chance": "federate_neighbor_hearing",
      "success": {
        "text": "Listening improves your standing with the neighbor without awarding the field.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The visit is mistaken for taking sides in the dispute.",
        "effects": {
          "standingCharacter": {
            "participant": "neighbor",
            "amt": -1
          }
        }
      }
    },
    {
      "label": "Leave the matter with the households",
      "desc": "No personal or public commitment.",
      "effects": {}
    },
    {
      "label": "Review the existing settlement claim",
      "desc": "Inspect the exact parties, current permission and costs before confirming. Cancel returns here without a commitment.",
      "review": {
        "type": "federate_settlement",
        "args": {},
        "refusalOption": 1
      }
    }
  ]
}
  );
})();
