/* Personal decisions beside a mobile following; public transactions remain in Deeds. */
(function () {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.mobile_life = {eras:['high_medieval'],yearMin:1204,yearMax:1240};
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.mobile_life_accounts = {
  "base": 0.35,
  "min": 0.1,
  "max": 0.85,
  "steps": [
    {
      "kind": "skill",
      "id": "dip",
      "factor": 0.02
    },
    {
      "kind": "flag",
      "id": "mobile_life_accounts_ready",
      "add": 0.15
    }
  ]
};
  FBDATA.eventChances.mobile_life_terms = {
  "base": 0.35,
  "min": 0.1,
  "max": 0.85,
  "steps": [
    {
      "kind": "skill",
      "id": "dip",
      "factor": 0.02
    },
    {
      "kind": "flag",
      "id": "mobile_life_terms_ready",
      "add": 0.15
    },
    {
      "kind": "flag",
      "id": "mobile_life_voices_ready",
      "add": 0.05
    },
    {
      "kind": "flag",
      "id": "mobile_life_access_ready",
      "add": 0.05
    },
    {
      "kind": "flag",
      "id": "mobile_life_settlement_ready",
      "add": 0.05
    }
  ]
};
  FBDATA.eventSubscriptions = FBDATA.eventSubscriptions || {};
  FBDATA.eventSubscriptions.mobile_life_new_leader = [
  {
    "hook": "coalition_leader_selected",
    "require": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ]
    }
  }
];
  FBDATA.eventSubscriptions.mobile_life_new_member = [
  {
    "hook": "coalition_member_joined",
    "require": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ]
    }
  }
];
  FBDATA.eventSubscriptions.mobile_life_departed_member = [
  {
    "hook": "coalition_member_departed",
    "require": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ]
    }
  }
];
  FBDATA.eventSubscriptions.mobile_life_camp_checkpoint = [
  {
    "hook": "camp_arrived",
    "require": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ]
    }
  }
];
  FBDATA.eventSubscriptions.mobile_life_lost_host = [
  {
    "hook": "field_host_lost",
    "require": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ]
    }
  }
];
  FBDATA.eventSubscriptions.mobile_life_ended_access = [
  {
    "hook": "access_expired",
    "require": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ]
    }
  }
];
  Array.prototype.push.apply(FBDATA.events, [
  {
    "id": "mobile_life_larger_share",
    "pack": "mobile_life",
    "title": "A larger share",
    "text": "A member asks whether a larger pledge should bring a larger share. You can prepare your own account before any coalition proposal.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "List the claims",
        "desc": "Prepare an account of the claims without changing shares. Prepared accounts help a later share argument.",
        "text": "The claims are written down for a later discussion.",
        "effects": {
          "setFlag": "mobile_life_accounts_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_accounts_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_court_hire",
    "pack": "mobile_life",
    "title": "An offer of service",
    "text": "Word comes that an outside court may want to hire the following. Pay, duration and the members’ consent would still need a real agreement.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare questions for the court",
        "desc": "Prepare questions without promising service. Prepared notes help a later service explanation.",
        "text": "You prepare questions about pay, duration and obligations.",
        "effects": {
          "setFlag": "mobile_life_terms_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_terms_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_court_gift",
    "pack": "mobile_life",
    "title": "A gift with a purpose",
    "text": "An intermediary hints that a private gift might quiet the following. You have received no money and made no public promise.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Write down the distinction",
        "desc": "Keep private gifts separate from public commitments. Prepared notes help a later service explanation.",
        "text": "You record what was suggested without accepting it.",
        "effects": {
          "setFlag": "mobile_life_terms_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_terms_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_held_ground",
    "pack": "mobile_life",
    "title": "Ground already claimed",
    "text": "Before seeking another ground, you consider the people who already hold it. A route on your map would not be their permission.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare a request",
        "desc": "List questions for the lawful holder; no access is granted. Prepared notes help a later service explanation.",
        "text": "Your notes distinguish a request from a right.",
        "effects": {
          "setFlag": "mobile_life_access_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_access_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_subject_test",
    "pack": "mobile_life",
    "title": "Who speaks for the camp?",
    "text": "Some households ask whether your word alone can bind their principals. You can prepare to explain the difference between leadership and assent.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare a patient answer",
        "desc": "Record the question without claiming another person’s voice. Prepared notes help a later service explanation.",
        "text": "You make room in your argument for separate assent.",
        "effects": {
          "setFlag": "mobile_life_voices_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_voices_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_town_trade",
    "pack": "mobile_life",
    "title": "Trade beyond the camp",
    "text": "You weigh approaching a settled town about trade. Prices, market stock and lawful access must be checked before any purchase.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare an account of needs",
        "desc": "Make a list; buy nothing and draw no public money. Prepared accounts help a later share argument.",
        "text": "The list is ready for a real supply review.",
        "effects": {
          "setFlag": "mobile_life_accounts_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_accounts_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_town_gate",
    "pack": "mobile_life",
    "title": "A gate may stay closed",
    "text": "A town may refuse your approach. You consider what to say if its holder will not admit the following.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare an alternative",
        "desc": "Keep a refused request separate from permission to enter. Prepared notes help a later service explanation.",
        "text": "You prepare to return without treating refusal as a grant.",
        "effects": {
          "setFlag": "mobile_life_access_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_access_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_settlement_question",
    "pack": "mobile_life",
    "title": "The question of settling",
    "text": "You wonder what settling would mean for the people still moving with the camp. Land, exact numbers and separate assent cannot be settled by a speech.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "List what must be decided",
        "desc": "Prepare questions only; move no people and claim no land. Prepared notes help a later service explanation.",
        "text": "Your notes distinguish partial settlement from ending the following.",
        "effects": {
          "setFlag": "mobile_life_settlement_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_settlement_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "leader"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_member_share",
    "pack": "mobile_life",
    "title": "Your own pledge",
    "text": "Before asking for a different share, you consider what you actually pledge and what you want in return.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "member"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Write down your position",
        "desc": "Prepare your own argument; existing pledges remain binding. Prepared accounts help a later share argument.",
        "text": "You have a clearer account to bring to the principals.",
        "effects": {
          "setFlag": "mobile_life_accounts_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_accounts_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "member"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_member_voice",
    "pack": "mobile_life",
    "title": "A principal’s answer",
    "text": "The leader’s confidence need not be your assent. You consider how to state your own position without speaking for another member.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "member"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare your answer",
        "desc": "Keep a personal position ready for a real proposal. Prepared notes help a later service explanation.",
        "text": "You record your own position, leaving other voices open.",
        "effects": {
          "setFlag": "mobile_life_voices_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_voices_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "member"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_member_envoy",
    "pack": "mobile_life",
    "title": "A court approaches you",
    "text": "Someone sounding out the following asks what would persuade you to serve an outside court. You cannot promise the whole coalition.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "member"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare questions about service",
        "desc": "Ask about terms before any binding review. Prepared notes help a later service explanation.",
        "text": "Your questions promise neither fighters nor obedience.",
        "effects": {
          "setFlag": "mobile_life_terms_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_terms_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "member"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_member_settlement",
    "pack": "mobile_life",
    "title": "A home that stays",
    "text": "The thought of a permanent home returns. You would need an exact place and proposal before deciding how many of your people might settle.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "member"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Record your questions",
        "desc": "Prepare for a review; no household moves. Prepared notes help a later service explanation.",
        "text": "You keep the distinction between a wish and an approved settlement.",
        "effects": {
          "setFlag": "mobile_life_settlement_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_settlement_ready"
          ],
          "state": [
            {
              "reader": "mobile_role",
              "args": {
                "following": "current",
                "role": "member"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_ration_account",
    "pack": "mobile_life",
    "title": "A short store",
    "text": "The following has less than thirty days of its ordinary food allowance. A household account cannot refill the public store, but it can make your own needs clearer.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_camp_household",
          "args": {
            "following": "current"
          }
        },
        {
          "reader": "mobile_scarcity",
          "args": {
            "following": "current"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Check your household needs",
        "desc": "Prepare a private list; add no food to the camp. Prepared accounts help a later share argument.",
        "text": "You separate your household needs from the public supply account.",
        "effects": {
          "setFlag": "mobile_life_accounts_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_accounts_ready"
          ],
          "state": [
            {
              "reader": "mobile_camp_household",
              "args": {
                "following": "current"
              }
            },
            {
              "reader": "mobile_scarcity",
              "args": {
                "following": "current"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_scarcity_witness",
    "pack": "mobile_life",
    "title": "Counting at the hearth",
    "text": "{witness} helps you think through the household’s next meals while the public food store is low.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_camp_household",
          "args": {
            "following": "current"
          }
        },
        {
          "reader": "mobile_scarcity",
          "args": {
            "following": "current"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Keep a careful list",
        "desc": "Prepare a household account with this neighbor. Prepared accounts help a later share argument.",
        "text": "You finish the list together; the camp still needs real supplies.",
        "effects": {
          "setFlag": "mobile_life_accounts_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_accounts_ready"
          ],
          "state": [
            {
              "reader": "mobile_camp_household",
              "args": {
                "following": "current"
              }
            },
            {
              "reader": "mobile_scarcity",
              "args": {
                "following": "current"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ],
    "participants": [
      {
        "slot": "witness",
        "source": "local_witness",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "witness"
    ]
  },
  {
    "id": "mobile_life_scarcity_rumor",
    "pack": "mobile_life",
    "title": "Rumors over supper",
    "text": "{witness} has heard conflicting accounts of supplies. The store remains low; a reassuring rumor would not feed anyone.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_camp_household",
          "args": {
            "following": "current"
          }
        },
        {
          "reader": "mobile_scarcity",
          "args": {
            "following": "current"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Compare the accounts",
        "desc": "Prepare questions rather than promise a ration. Prepared notes help a later service explanation.",
        "text": "You separate the unanswered questions from what you know.",
        "effects": {
          "setFlag": "mobile_life_voices_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_voices_ready"
          ],
          "state": [
            {
              "reader": "mobile_camp_household",
              "args": {
                "following": "current"
              }
            },
            {
              "reader": "mobile_scarcity",
              "args": {
                "following": "current"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ],
    "participants": [
      {
        "slot": "witness",
        "source": "local_witness",
        "required": true,
        "sameHome": true
      }
    ],
    "participantCards": [
      "witness"
    ]
  },
  {
    "id": "mobile_life_scarcity_rest",
    "pack": "mobile_life",
    "title": "A weary evening",
    "text": "The low food store weighs on your household. You can pause your private work tonight without claiming the camp has been supplied.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_camp_household",
          "args": {
            "following": "current"
          }
        },
        {
          "reader": "mobile_scarcity",
          "args": {
            "following": "current"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Rest for the evening",
        "desc": "Recover a little health; the public shortage remains.",
        "text": "You rest while the supply question remains open.",
        "effects": {
          "health": 1
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_share_argument",
    "pack": "mobile_life",
    "title": "Making your case",
    "text": "You consider how to explain your own claim to a larger share. The discussion can improve your argument, but changes no pledge.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "member"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Rehearse the account",
        "desc": "Practice a personal argument; prepared accounts help.",
        "chance": "mobile_life_accounts",
        "success": {
          "text": "You find a clearer way to state your position.",
          "effects": {
            "skills": {
              "dip": 1
            }
          }
        },
        "failure": {
          "text": "You leave the argument unfinished. No agreement or pledge changes.",
          "effects": {}
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_service_argument",
    "pack": "mobile_life",
    "title": "Before a court’s answer",
    "text": "Before discussing paid service, you rehearse how to explain obligations to an outside court. Only a later agreement could bind anyone.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_role",
          "args": {
            "following": "current",
            "role": "leader"
          }
        }
      ]
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Rehearse the terms",
        "desc": "Practice your explanation; prepared questions help.",
        "chance": "mobile_life_terms",
        "success": {
          "text": "Your explanation becomes clearer without a service commitment.",
          "effects": {
            "skills": {
              "dip": 1
            }
          }
        },
        "failure": {
          "text": "You leave the argument unfinished. No agreement or pledge changes.",
          "effects": {}
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_new_leader",
    "pack": "mobile_life",
    "title": "After a selection",
    "text": "News of a coalition leadership selection prompts you to think about how a leader should listen. Your own following’s current voices still matter.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ],
      "never": true
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Record what to ask",
        "desc": "Prepare questions about consent; change no leadership. Prepared notes help a later service explanation.",
        "text": "You write down the questions you would bring to a leader.",
        "effects": {
          "setFlag": "mobile_life_voices_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_voices_ready"
          ],
          "state": [
            {
              "reader": "mobile_coalition_member",
              "args": {
                "following": "moment"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_new_member",
    "pack": "mobile_life",
    "title": "Another voice at council",
    "text": "A principal has joined your following. How should each voice be heard when the council next considers a proposal?",
    "trigger": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ],
      "never": true
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Prepare to listen",
        "desc": "Record a personal intention; admit no member. Prepared notes help a later service explanation.",
        "text": "You prepare to hear each position separately.",
        "effects": {
          "setFlag": "mobile_life_voices_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_voices_ready"
          ],
          "state": [
            {
              "reader": "mobile_coalition_member",
              "args": {
                "following": "moment"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_departed_member",
    "pack": "mobile_life",
    "title": "A principal departs",
    "text": "News of a member’s departure makes you consider the difference between leaving a council and abandoning those who still need care.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ],
      "never": true
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Review your household account",
        "desc": "Prepare privately; move no people or stores. Prepared accounts help a later share argument.",
        "text": "You review your own responsibilities without changing the following.",
        "effects": {
          "setFlag": "mobile_life_accounts_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_accounts_ready"
          ],
          "state": [
            {
              "reader": "mobile_coalition_member",
              "args": {
                "following": "moment"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_camp_checkpoint",
    "pack": "mobile_life",
    "title": "The camp arrives",
    "text": "News of a civilian camp’s arrival reminds you that reaching a place and obtaining rights there are separate matters.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ],
      "never": true
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Review your questions about access",
        "desc": "Prepare for the next request; gain no passage. Prepared notes help a later service explanation.",
        "text": "You keep arrival and permission separate in your notes.",
        "effects": {
          "setFlag": "mobile_life_access_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_access_ready"
          ],
          "state": [
            {
              "reader": "mobile_coalition_member",
              "args": {
                "following": "moment"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_lost_host",
    "pack": "mobile_life",
    "title": "A host is lost",
    "text": "News of a field host’s loss brings the surviving camp to mind. People outside the fighting ranks still need food and a future.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ],
      "never": true
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Think through the household needs",
        "desc": "Prepare a private account; restore no fighters or food. Prepared accounts help a later share argument.",
        "text": "You consider the living rather than inventing replacements.",
        "effects": {
          "setFlag": "mobile_life_accounts_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_accounts_ready"
          ],
          "state": [
            {
              "reader": "mobile_coalition_member",
              "args": {
                "following": "moment"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  },
  {
    "id": "mobile_life_ended_access",
    "pack": "mobile_life",
    "title": "An access agreement ends",
    "text": "An access agreement for your following has ended. You need to check current rights before planning movement or purchases; the old promise no longer supplies permission.",
    "trigger": {
      "state": [
        {
          "reader": "mobile_coalition_member",
          "args": {
            "following": "moment"
          }
        }
      ],
      "never": true
    },
    "weight": 3,
    "cooldown": 4,
    "options": [
      {
        "label": "Review the questions to ask",
        "desc": "Prepare for a fresh review; renew no agreement. Prepared notes help a later service explanation.",
        "text": "You prepare to ask about current authority and terms.",
        "effects": {
          "setFlag": "mobile_life_access_ready"
        },
        "require": {
          "notFlags": [
            "mobile_life_access_ready"
          ],
          "state": [
            {
              "reader": "mobile_coalition_member",
              "args": {
                "following": "moment"
              }
            }
          ]
        }
      },
      {
        "label": "Leave the question open",
        "desc": "Make no preparation or commitment.",
        "text": "You leave your present arrangements unchanged.",
        "effects": {}
      }
    ]
  }
]);
})();
