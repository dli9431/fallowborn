/* Conversations read current constitutions and retain canonical political decisions. */
(function () {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.kingship_succession = {eras:['late_antique','early_medieval'],yearMin:450,yearMax:850};
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.kingship_household_heard = {base:0.4,min:0.1,max:0.85,
    steps:[{kind:'skill',id:'dip',factor:0.025}]};
  FBDATA.events.push(
{
  "id": "kingship_kin_unspoken_assent",
  "pack": "kingship_succession",
  "title": "The unspoken assent",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "lineage_kingship"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "withheld"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate"
  ],
  "text": "A living interest has withheld recognition in the current selection. {candidate} remains a candidate; your own voice, if authorized, remains yours to give or withhold.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "constituent_decision",
        "args": {
          "participant": "candidate",
          "action": "support"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_kin_two_branches",
  "pack": "kingship_succession",
  "title": "Two branches at one hearth",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "lineage_kingship"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "competing"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "principal",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "principal"
  ],
  "text": "More than one eligible relative stands in the current vacancy. {candidate} can seek recognition, but descent alone cannot speak for the other interests.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_succession",
        "args": {
          "participant": "candidate",
          "action": "negotiate"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_kin_obligations_first",
  "pack": "kingship_succession",
  "title": "Before the acclamation",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "lineage_kingship"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "vacancy"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "principal",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "principal"
  ],
  "text": "The vacant court has obligations to settle before it can agree on {candidate}. Review an offer of military service and public revenue; each interest keeps its own limits.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_succession",
        "args": {
          "participant": "candidate",
          "action": "negotiate",
          "terms": {
            "levy": 0.6,
            "revenue": 0.6
          }
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_kin_young_claimant",
  "pack": "kingship_succession",
  "title": "A young name in the telling",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "lineage_kingship"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "minority"
        }
      }
    ],
    "hasRole": "friend"
  },
  "weight": 1,
  "cooldown": 12,
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
  ],
  "text": "{friend} asks what the household should do while the political selection has only underage possibilities. Waiting does not create an adult candidate or a steward.",
  "options": [
    {
      "label": "Hear the household’s concern",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": 2
        }
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_kin_lord_risk",
  "pack": "kingship_succession",
  "title": "The household behind the lord",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "lineage_kingship"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "active"
        }
      }
    ],
    "hasRole": "friend"
  },
  "weight": 1,
  "cooldown": 12,
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
  ],
  "text": "{friend} weighs the household’s dependence on kin recognition. A private conversation cannot promise the public court’s assent or its receipts.",
  "options": [
    {
      "label": "Hear the household’s concern",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": 2
        }
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_crown_canvassed_names",
  "pack": "kingship_succession",
  "title": "Names around the table",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "elective_monarchy"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "nomination"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate"
  ],
  "text": "A qualified local name is being canvassed: {candidate}. Your current interest may review admission to the slate. Admission supplies neither votes nor a crown.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_nomination",
        "args": {
          "participant": "candidate"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_crown_outside_house",
  "pack": "kingship_succession",
  "title": "A name from another house",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "elective_monarchy"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "nomination"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate"
  ],
  "text": "{candidate} stands outside the present royal tree. Review the actual qualifications and your own mandate before proposing admission.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_nomination",
        "args": {
          "participant": "candidate"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_crown_quiet_refusal",
  "pack": "kingship_succession",
  "title": "A refusal without a quarrel",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "elective_monarchy"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "vacancy"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate"
  ],
  "text": "The selection remains open. An invitation to back {candidate} need not become assent: your authorized interest may explicitly withhold its own support.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "constituent_decision",
        "args": {
          "participant": "candidate",
          "action": "withhold"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    },
    {
      "label": "Review withdrawal of your existing assent",
      "review": {
        "type": "constituent_decision",
        "args": {
          "participant": "candidate",
          "action": "withdraw"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Review giving your own recognition",
      "review": {
        "type": "constituent_decision",
        "args": {
          "participant": "candidate",
          "action": "support"
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "kingship_crown_losing_household",
  "pack": "kingship_succession",
  "title": "When a patron’s choice fails",
  "trigger": {
    "state": [
      {
        "reader": "political_selection",
        "args": {
          "status": "losing_lord"
        }
      }
    ],
    "hasRole": "friend"
  },
  "weight": 1,
  "cooldown": 12,
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
  ],
  "text": "{friend}, who holds your household’s home, backed a different candidate in the resolved selection. Your household must live with the uncertainty, but that recorded choice grants neither punishment nor compensation.",
  "options": [
    {
      "label": "Hear the household’s concern",
      "desc": "A sympathetic hearing may improve personal goodwill. It supplies no vote, payment or public commitment.",
      "chance": "kingship_household_heard",
      "success": {
        "text": "{friend} values being heard. The household’s conversation changes neither the recorded vote nor the court’s decision.",
        "effects": {
          "standingCharacter": {
            "participant": "friend",
            "amt": 2
          }
        }
      },
      "failure": {
        "text": "The words offer little comfort to {friend}. No payment, punishment or political promise follows.",
        "effects": {}
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_crown_promise_and_vote",
  "pack": "kingship_succession",
  "title": "A promise is carried twice",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "elective_monarchy"
        }
      },
      {
        "reader": "political_selection",
        "args": {
          "status": "competing"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "principal",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "principal"
  ],
  "text": "Canvassing has brought several eligible names into the open vacancy. {candidate} asks for recognition under the court’s declared obligations. Your interest cannot cast another principal’s vote.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_succession",
        "args": {
          "participant": "candidate",
          "action": "negotiate"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_magnate_minor_terms",
  "pack": "kingship_succession",
  "title": "Terms around a cradle",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "aristocratic_monarchy"
        }
      },
      {
        "reader": "royal_recognition",
        "args": {
          "status": "minor_candidate"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "principal",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "principal"
  ],
  "text": "The eligible royal pool includes a minor. A bargain over {candidate} must satisfy the living provincial interest, its burdens and the public treasury. Recognition cannot dispense with the succession rules for stewardship.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_succession",
        "args": {
          "participant": "candidate",
          "action": "negotiate",
          "selection": "minor",
          "terms": {
            "levy": 0.6,
            "revenue": 0.65
          }
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_magnate_royal_cousins",
  "pack": "kingship_succession",
  "title": "Royal relatives, different hopes",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "aristocratic_monarchy"
        }
      },
      {
        "reader": "royal_recognition",
        "args": {
          "status": "competing"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "principal",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "principal"
  ],
  "text": "Several living royal relatives remain eligible. The court may review its preference for {candidate}; the magnates retain their independent recognition.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_succession",
        "args": {
          "participant": "candidate",
          "action": "designate"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    },
    {
      "label": "Review your own recognition",
      "review": {
        "type": "constituent_decision",
        "args": {
          "participant": "candidate",
          "action": "support"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Review withholding your own recognition",
      "review": {
        "type": "constituent_decision",
        "args": {
          "participant": "candidate",
          "action": "withhold"
        },
        "refusalOption": 1
      }
    }
  ]
},
{
  "id": "kingship_magnate_provincial_share",
  "pack": "kingship_succession",
  "title": "The provincial share",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "aristocratic_monarchy"
        }
      },
      {
        "reader": "royal_recognition",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "principal",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "principal"
  ],
  "text": "{candidate} needs recognition from living provincial interests. Review one interest’s existing jurisdiction, acceptable burdens and the real cost of negotiation.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_succession",
        "args": {
          "participant": "candidate",
          "action": "negotiate",
          "terms": {
            "levy": 0.6,
            "revenue": 0.65
          }
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_magnate_steward_limits",
  "pack": "kingship_succession",
  "title": "Who speaks for the child?",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "aristocratic_monarchy"
        }
      },
      {
        "reader": "royal_recognition",
        "args": {
          "status": "stewardship"
        }
      }
    ],
    "hasRole": "friend"
  },
  "weight": 1,
  "cooldown": 12,
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
  ],
  "text": "{friend} asks who may speak for the public court during its recorded stewardship. A steward’s service does not turn the household into the royal family or transfer its estates.",
  "options": [
    {
      "label": "Hear the household’s concern",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": 2
        }
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_magnate_agenda_objection",
  "pack": "kingship_succession",
  "title": "An objection to the program",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "aristocratic_monarchy"
        }
      },
      {
        "reader": "political_story",
        "args": {
          "status": "blocked_agenda",
          "storyType": "ruler_agenda",
          "choiceKind": "agenda_provincial_terms"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate"
  ],
  "text": "Your provincial proposal cannot presently pass its canonical review. The court program remains open. {candidate} may retain the present terms instead of pretending that payment, jurisdiction or assent is available.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_story",
        "args": {
          "participant": "candidate",
          "storyType": "ruler_agenda",
          "choiceKind": "agenda_priority"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_regnum_partition_paper",
  "pack": "kingship_succession",
  "title": "A partition on paper",
  "trigger": {
    "state": [
      {
        "reader": "political_story",
        "args": {
          "status": "pending_partition",
          "storyType": "succession_partition",
          "choiceKind": "approve"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "heir",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "heir"
  ],
  "text": "The existing inheritance settlement awaits a decision. {candidate} can review the living parties and proposed shares. Authorization records only this court’s consent; the event makes no territorial grant.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_partition",
        "args": {
          "participant": "candidate",
          "storyType": "succession_partition",
          "choiceKind": "approve"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_regnum_relatives_expect",
  "pack": "kingship_succession",
  "title": "What the relatives expect",
  "trigger": {
    "state": [
      {
        "reader": "political_story",
        "args": {
          "status": "pending_partition",
          "storyType": "succession_partition",
          "choiceKind": "approve"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "heir",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "heir"
  ],
  "text": "The pending inheritance plan gives the royal relatives different expectations. {candidate} must review the actual surviving regional courts, rather than promise every relative an equal crown.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_partition",
        "args": {
          "participant": "candidate",
          "storyType": "succession_partition",
          "choiceKind": "approve"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_regnum_agenda_resisted",
  "pack": "kingship_succession",
  "title": "The program meets an objection",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "regnum"
        }
      },
      {
        "reader": "political_story",
        "args": {
          "status": "blocked_agenda",
          "storyType": "ruler_agenda",
          "choiceKind": "agenda_provincial_terms"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate"
  ],
  "text": "The retained court program meets a real blocker after the change of constitution. {candidate} may record a preference for the present obligations. The earlier program cannot create missing provincial authority.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_story",
        "args": {
          "participant": "candidate",
          "storyType": "ruler_agenda",
          "choiceKind": "agenda_priority"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_regnum_heir_household",
  "pack": "kingship_succession",
  "title": "The household and the court program",
  "trigger": {
    "state": [
      {
        "reader": "political_story",
        "args": {
          "status": "active_agenda",
          "storyType": "ruler_agenda",
          "choiceKind": "agenda_priority"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate"
  ],
  "text": "{candidate} has an open personal program. You may retain its present arrangements. A personal priority neither chooses a political successor nor divides property.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_story",
        "args": {
          "participant": "candidate",
          "storyType": "ruler_agenda",
          "choiceKind": "agenda_priority"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
},
{
  "id": "kingship_regnum_partition_road",
  "pack": "kingship_succession",
  "title": "The road between shares",
  "trigger": {
    "state": [
      {
        "reader": "political_story",
        "args": {
          "status": "pending_partition",
          "storyType": "succession_partition",
          "choiceKind": "decline"
        }
      }
    ]
  },
  "weight": 1,
  "cooldown": 12,
  "participants": [
    {
      "slot": "candidate",
      "source": "context",
      "required": true
    },
    {
      "slot": "heir",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "candidate",
    "heir"
  ],
  "text": "A pending partition is a proposal, not a road the realm must follow. {candidate} may review refusal of this agreement without a payment or territorial transfer.",
  "options": [
    {
      "label": "Review the current decision",
      "desc": "See the current authority, obligations and payment before confirming. Cancel keeps this conversation open.",
      "review": {
        "type": "political_partition",
        "args": {
          "participant": "candidate",
          "storyType": "succession_partition",
          "choiceKind": "decline"
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the present arrangements alone",
      "desc": "Make no payment or political commitment.",
      "effects": {}
    }
  ]
}
  );
})();
