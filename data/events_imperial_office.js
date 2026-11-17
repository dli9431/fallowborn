/* Household choices beside civic and administrative courts. */
(function () {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.imperial_office = { eras:['late_antique'], yearMin:476, yearMax:650 };
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.imperial_office_papers = {base:0.35,min:0.1,max:0.9,steps:[{kind:'skill',id:'ste',factor:0.04}]};
  FBDATA.events = FBDATA.events || [];
  FBDATA.events.push(
{
  "id": "imperial_office_petition_copy",
  "pack": "imperial_office",
  "title": "A petition in two hands",
  "text": "Your friend {friend} offers to copy a request for civic service. A neat page may win attention, but it cannot supply freedom, qualifications or a vacant seat.",
  "trigger": {
    "minAge": 16,
    "tierMin": 1,
    "tierMax": 1,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Copy the evidence together.",
      "desc": "Win goodwill through careful preparation; no petition is filed. Keep the prepared papers for a later conversation.",
      "chance": "imperial_office_papers",
      "success": {
        "text": "The account is clearer, and your friend values the work. The appointment remains for its lawful review.",
        "effects": {
          "skills": {
            "lea": 1
          },
          "standingCharacter": {
            "participant": "friend",
            "amt": 5
          },
          "setFlag": "imperial_office_civic_draft"
        }
      },
      "failure": {
        "text": "The copies still disagree. Your friend thanks you for trying; the commission remains undecided.",
        "effects": {
          "skills": {
            "lea": 1
          }
        }
      }
    },
    {
      "label": "Leave the request unwritten.",
      "desc": "Keep your time and accept the disappointment.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review a civil appointment.",
      "desc": "Check the real local office, qualifications, scope, fee and current court before accepting or cancelling.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_seal_and_bread",
  "pack": "imperial_office",
  "title": "The seal and the bread",
  "text": "The clerk wants the household names before the estate account can be copied. {witness} knows which mouths the old list forgot. You have no office to speak for them.",
  "trigger": {
    "minAge": 16,
    "tierMin": 0,
    "tierMax": 0,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "none"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "witness",
      "source": "local_witness",
      "required": true
    }
  ],
  "participantCards": [
    "witness"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Include the missing names.",
      "desc": "Help your witness make the household visible.",
      "effects": {
        "skills": {
          "ste": 1
        },
        "standingCharacter": {
          "participant": "witness",
          "amt": 5
        }
      }
    },
    {
      "label": "Keep to your own entry.",
      "desc": "Avoid the dispute and disappoint your witness.",
      "effects": {
        "standingCharacter": {
          "participant": "witness",
          "amt": -4
        }
      }
    }
  ]
},
{
  "id": "imperial_office_curial_shortfall",
  "pack": "imperial_office",
  "title": "A purse too small",
  "text": "Your friend {friend} lays a curial assessment beside the household purse. The figures outrun what this house can afford. You can help with the arithmetic, but cannot cancel a public obligation.",
  "trigger": {
    "minAge": 16,
    "tierMin": 2,
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
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    }
  ],
  "participantCards": [
    "friend"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Sort the receipts together.",
      "desc": "Spend effort helping your friend present the shortfall. Keep the prepared papers for a later conversation.",
      "effects": {
        "health": -1,
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        },
        "setFlag": "imperial_office_civic_receipts"
      }
    },
    {
      "label": "Leave the papers with them.",
      "desc": "Save your strength and withhold your help.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    }
  ]
},
{
  "id": "imperial_office_rival_petition",
  "pack": "imperial_office",
  "title": "Another name on the petition",
  "text": "Your rival {rival} brings a carefully written request for civic service. The petition competes with your hopes, but neither applicant has received an appointment here.",
  "trigger": {
    "minAge": 16,
    "tierMin": 1,
    "tierMax": 1,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ],
    "flags": [
      "imperial_office_civic_draft"
    ]
  },
  "participants": [
    {
      "slot": "rival",
      "source": "role",
      "required": true,
      "role": "rival"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "rival",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Concede the strong parts.",
      "desc": "Ease the personal quarrel without endorsing the appointment. Put these papers behind you.",
      "effects": {
        "skills": {
          "dip": 1
        },
        "standingCharacter": {
          "participant": "rival",
          "amt": 5
        },
        "clearFlag": "imperial_office_civic_draft"
      }
    },
    {
      "label": "Dismiss the request aloud.",
      "desc": "Gain a little prestige while worsening the quarrel.",
      "effects": {
        "standingCharacter": {
          "participant": "rival",
          "amt": -4
        },
        "prestige": 1
      }
    },
    {
      "label": "Review a civil appointment.",
      "desc": "Check the real local office, qualifications, scope, fee and current court before accepting or cancelling.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_honor_bench",
  "pack": "imperial_office",
  "title": "The working seal",
  "text": "Your civil commission is effective in this jurisdiction. Your friend {friend} asks how far its seal reaches. Its courts and public receipts follow the appointment, while the household estate remains private.",
  "trigger": {
    "minAge": 16,
    "tierMin": 2,
    "tierMax": 2,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    }
  ],
  "participantCards": [
    "friend"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Listen before offering advice.",
      "desc": "Explain the limits of your current commission and strengthen the friendship.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Decline the conversation.",
      "desc": "Keep your distance and disappoint your friend.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    }
  ]
},
{
  "id": "imperial_office_empty_bench",
  "pack": "imperial_office",
  "title": "The empty place",
  "text": "Your civil commission has ended. Your friend {friend} still speaks as though its old seal opened the court. A surviving private household cannot exercise the former office’s powers.",
  "trigger": {
    "minAge": 16,
    "tierMin": 2,
    "tierMax": 2,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "ended"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Explain the changed position.",
      "desc": "Preserve trust by making the loss plain.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Let the old impression stand.",
      "desc": "Keep a little prestige at the cost of trust.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        },
        "prestige": 1
      }
    },
    {
      "label": "Review a fresh application.",
      "desc": "A new application must meet the current court’s qualifications, vacancy and payment terms. The ended commission is not revived.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_patron_silence",
  "pack": "imperial_office",
  "title": "The patron goes silent",
  "text": "The authority behind your civil commission has changed, and its seal is contested. Your friend {friend} brings the old papers. Personal loyalty cannot restore powers that require the current court’s confirmation.",
  "trigger": {
    "minAge": 16,
    "tierMin": 1,
    "tierMax": 5,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "contested"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Carry the papers as a friend.",
      "desc": "Spend strength on the person who once helped you.",
      "effects": {
        "health": -1,
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Leave them to find another carrier.",
      "desc": "Keep your strength and lose goodwill.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review reaffirmation.",
      "desc": "Ask the canonical office review whether the same holder, scope, proof and current authority can be confirmed. No private estate changes hands.",
      "review": {
        "type": "office_appointment",
        "args": {
          "action": "confirm"
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_civic_money",
  "pack": "imperial_office",
  "title": "Money for the court",
  "text": "The court asks for money. Your friend {friend} urges you to compare the demand with the existing account before promising anything. A private conversation cannot settle the public due.",
  "trigger": {
    "minAge": 16,
    "tierMin": 3,
    "tierMax": 5,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ],
    "flags": [
      "imperial_office_civic_receipts"
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    }
  ],
  "participantCards": [
    "friend"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Compare the copies together.",
      "desc": "Learn from the account and value the warning. Put these papers behind you.",
      "effects": {
        "skills": {
          "ste": 1
        },
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        },
        "clearFlag": "imperial_office_civic_receipts"
      }
    },
    {
      "label": "Dismiss the warning.",
      "desc": "Keep your attention elsewhere and sour the friendship.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    }
  ]
},
{
  "id": "imperial_office_civic_men",
  "pack": "imperial_office",
  "title": "Names for a muster",
  "text": "A request for men reaches the civic households. {witness} fears that the same absent worker appears on two lists. These papers are not a host, and your answer here recruits nobody.",
  "trigger": {
    "minAge": 16,
    "tierMin": 3,
    "tierMax": 5,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "witness",
      "source": "local_witness",
      "required": true
    }
  ],
  "participantCards": [
    "witness"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Help mark the duplicate.",
      "desc": "Spend effort supporting an accurate household account.",
      "effects": {
        "health": -1,
        "standingCharacter": {
          "participant": "witness",
          "amt": 5
        }
      }
    },
    {
      "label": "Leave the lists untouched.",
      "desc": "Save your strength and disappoint your witness.",
      "effects": {
        "standingCharacter": {
          "participant": "witness",
          "amt": -4
        }
      }
    }
  ]
},
{
  "id": "imperial_office_civic_no_support",
  "pack": "imperial_office",
  "title": "A title without voices",
  "text": "No effective personal recognition source stands behind your claim today. Your friend {friend} advises you to distinguish the title you use from the support you can actually show.",
  "trigger": {
    "minAge": 16,
    "tierMin": 6,
    "tierMax": 7,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      },
      {
        "reader": "legitimacy_band",
        "args": {
          "band": "none"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Hear the warning.",
      "desc": "Improve the friendship without manufacturing recognition.",
      "effects": {
        "skills": {
          "dip": 1
        },
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Insist that the title is enough.",
      "desc": "Keep your pride and strain the friendship.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        },
        "prestige": 1
      }
    },
    {
      "label": "Review your own recognition.",
      "desc": "Review support for the person named here through your own live mandate. Other interests keep their independent consent; no crown is granted.",
      "review": {
        "type": "office_recognition",
        "args": {
          "action": "recognize",
          "participant": "official"
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_court_application",
  "pack": "imperial_office",
  "title": "Outside the appointment room",
  "text": "Your friend {friend} has brought a draft request for court service. The commission must still pass its own review; a household recommendation supplies neither qualifications nor public pay.",
  "trigger": {
    "minAge": 16,
    "tierMin": 1,
    "tierMax": 1,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "none"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Put the service record in order.",
      "desc": "Practice careful administration with a friend. Keep the prepared papers for a later conversation.",
      "chance": "imperial_office_papers",
      "success": {
        "text": "The account is clearer, and your friend values the work. The appointment remains for its lawful review.",
        "effects": {
          "skills": {
            "ste": 1
          },
          "standingCharacter": {
            "participant": "friend",
            "amt": 5
          },
          "setFlag": "imperial_office_court_draft"
        }
      },
      "failure": {
        "text": "The copies still disagree. Your friend thanks you for trying; the commission remains undecided.",
        "effects": {
          "skills": {
            "lea": 1
          }
        }
      }
    },
    {
      "label": "Leave the draft on the table.",
      "desc": "Withhold your help and disappoint your friend.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review a civil appointment.",
      "desc": "Check the real local office, qualifications, scope, fee and current court before accepting or cancelling.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_bound_household",
  "pack": "imperial_office",
  "title": "The household behind the official",
  "text": "{witness} asks you to check the names on an official household list. Your own dependence is unchanged: work beside an office does not make its power yours.",
  "trigger": {
    "minAge": 16,
    "tierMin": 0,
    "tierMax": 0,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "witness",
      "source": "local_witness",
      "required": true
    }
  ],
  "participantCards": [
    "witness"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Read the list together.",
      "desc": "Help your witness find the omissions.",
      "effects": {
        "skills": {
          "lea": 1
        },
        "standingCharacter": {
          "participant": "witness",
          "amt": 5
        }
      }
    },
    {
      "label": "Attend only to your own work.",
      "desc": "Save your attention and disappoint your witness.",
      "effects": {
        "standingCharacter": {
          "participant": "witness",
          "amt": -4
        }
      }
    }
  ]
},
{
  "id": "imperial_office_court_rival",
  "pack": "imperial_office",
  "title": "The rival at the door",
  "text": "Your rival {rival} waits with a petition of their own. Their papers recall a service you would rather forget. Neither a sharp word nor a friendly one will decide the commission.",
  "trigger": {
    "minAge": 16,
    "tierMin": 2,
    "tierMax": 2,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      }
    ],
    "flags": [
      "imperial_office_court_draft"
    ]
  },
  "participants": [
    {
      "slot": "rival",
      "source": "role",
      "required": true,
      "role": "rival"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "rival",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Acknowledge the service fairly.",
      "desc": "Ease the quarrel without promising office. Put these papers behind you.",
      "effects": {
        "skills": {
          "dip": 1
        },
        "standingCharacter": {
          "participant": "rival",
          "amt": 5
        },
        "clearFlag": "imperial_office_court_draft"
      }
    },
    {
      "label": "Call the service worthless.",
      "desc": "Take a little prestige and deepen the quarrel.",
      "effects": {
        "standingCharacter": {
          "participant": "rival",
          "amt": -4
        },
        "prestige": 1
      }
    },
    {
      "label": "Review a civil appointment.",
      "desc": "Check the real local office, qualifications, scope, fee and current court before accepting or cancelling.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_honor_demand",
  "pack": "imperial_office",
  "title": "Receipts behind the seal",
  "text": "Your civil commission is effective in this jurisdiction. Your friend {friend} asks how far its seal reaches. Its courts and public receipts follow the appointment, while the household estate remains private.",
  "trigger": {
    "minAge": 16,
    "tierMin": 2,
    "tierMax": 2,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "active"
        }
      },
      {
        "reader": "public_office_arrears",
        "args": {
          "shortfall": false
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Show the household figures.",
      "desc": "Explain the separate public account and household purse.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Let the expectation grow.",
      "desc": "Keep the appearance of wealth and strain trust.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review the outstanding payment.",
      "desc": "See the exact arrears and original public recipient. Repayment uses available money once; cancellation and refusal spend nothing.",
      "review": {
        "type": "office_dues",
        "args": {
          "action": "repay"
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_old_seal",
  "pack": "imperial_office",
  "title": "The seal in the chest",
  "text": "Your civil commission has ended. Your friend {friend} still speaks as though its old seal opened the court. A surviving private household cannot exercise the former office’s powers.",
  "trigger": {
    "minAge": 16,
    "tierMin": 2,
    "tierMax": 2,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "ended"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Explain why it cannot speak for you.",
      "desc": "Clear the remembered claim and preserve trust.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Let the petitioner hope.",
      "desc": "Keep a little prestige at the cost of trust.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        },
        "prestige": 1
      }
    },
    {
      "label": "Review a fresh application.",
      "desc": "A new application must meet the current court’s qualifications, vacancy and payment terms. The ended commission is not revived.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_court_patron",
  "pack": "imperial_office",
  "title": "The recommendation returned",
  "text": "The authority behind your civil commission has changed, and its seal is contested. Your friend {friend} brings the old papers. Personal loyalty cannot restore powers that require the current court’s confirmation.",
  "trigger": {
    "minAge": 16,
    "tierMin": 1,
    "tierMax": 5,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "contested"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Greet the person you know.",
      "desc": "Keep faith with the friend despite the lost influence.",
      "effects": {
        "prestige": -1,
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Pass without greeting.",
      "desc": "Protect your appearance and wound the friendship.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review reaffirmation.",
      "desc": "Ask the canonical office review whether the same holder, scope, proof and current authority can be confirmed. No private estate changes hands.",
      "review": {
        "type": "office_appointment",
        "args": {
          "action": "confirm"
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_court_shortfall",
  "pack": "imperial_office",
  "title": "The assessment and the hearth",
  "text": "The public account shows arrears larger than your available purse. Your friend {friend} helps compare the household’s means with the court’s claim. A review can show the exact shortfall; it cannot erase the debt.",
  "trigger": {
    "minAge": 16,
    "tierMin": 2,
    "tierMax": 2,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "public_office_arrears",
        "args": {
          "shortfall": true
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Work through the receipts.",
      "desc": "Spend effort helping the household state its means. Keep the prepared papers for a later conversation.",
      "effects": {
        "health": -1,
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        },
        "setFlag": "imperial_office_court_receipts"
      }
    },
    {
      "label": "Leave the account unfinished.",
      "desc": "Save your strength and disappoint your friend.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review the outstanding payment.",
      "desc": "See the exact arrears and original public recipient. Repayment uses available money once; cancellation and refusal spend nothing.",
      "review": {
        "type": "office_dues",
        "args": {
          "action": "repay"
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_court_levy",
  "pack": "imperial_office",
  "title": "A demand for men",
  "text": "The court asks for men while your friend {friend} counts hands needed at home. A roster must distinguish an absent worker from an available recruit. This conversation transfers no soldiers.",
  "trigger": {
    "minAge": 16,
    "tierMin": 3,
    "tierMax": 5,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "civil_office",
        "args": {
          "status": "active"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Check the names before promising.",
      "desc": "Learn from the household roster and value the warning. Put these papers behind you.",
      "effects": {
        "skills": {
          "ste": 1
        },
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        },
        "clearFlag": "imperial_office_court_receipts"
      }
    },
    {
      "label": "Wave the difficulty away.",
      "desc": "Keep your attention elsewhere and sour the friendship.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review full remittance.",
      "desc": "Keep the remaining public receipts with their court. This sets the commission’s account terms; actual men, equipment and musters retain their own reviews.",
      "review": {
        "type": "office_dues",
        "args": {
          "action": "remit",
          "remittance": 1
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_one_voice",
  "pack": "imperial_office",
  "title": "One voice behind the title",
  "text": "One effective source of personal recognition supports your claim. Your friend {friend} warns that a single voice is still a single voice, however impressive its language.",
  "trigger": {
    "minAge": 16,
    "tierMin": 6,
    "tierMax": 7,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "legitimacy_band",
        "args": {
          "band": "single_source"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Ask what that support really covers.",
      "desc": "Learn without changing the recognition record.",
      "effects": {
        "skills": {
          "dip": 1
        },
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Treat the support as universal.",
      "desc": "Keep your pride and strain the friendship.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        },
        "prestige": 1
      }
    },
    {
      "label": "Review your own recognition.",
      "desc": "Review support for the person named here through your own live mandate. Other interests keep their independent consent; no crown is granted.",
      "review": {
        "type": "office_recognition",
        "args": {
          "action": "recognize",
          "participant": "official"
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_many_voices",
  "pack": "imperial_office",
  "title": "Several voices, several promises",
  "text": "Several distinct sources now support your personal claim. Your friend {friend} asks which promises belong to which mandate. Agreement on a name need not mean agreement on every demand.",
  "trigger": {
    "minAge": 16,
    "tierMin": 6,
    "tierMax": 7,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      },
      {
        "reader": "legitimacy_band",
        "args": {
          "band": "multiple_sources"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "required": true,
      "role": "friend"
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 3,
  "cooldown": 8,
  "options": [
    {
      "label": "Distinguish the commitments.",
      "desc": "Study the support without issuing or withdrawing recognition.",
      "effects": {
        "skills": {
          "ste": 1
        },
        "standingCharacter": {
          "participant": "friend",
          "amt": 5
        }
      }
    },
    {
      "label": "Treat every voice as the same.",
      "desc": "Keep the simpler story and strain the friendship.",
      "effects": {
        "standingCharacter": {
          "participant": "friend",
          "amt": -4
        }
      }
    },
    {
      "label": "Review your own recognition.",
      "desc": "Review support for the person named here through your own live mandate. Other interests keep their independent consent; no crown is granted.",
      "review": {
        "type": "office_recognition",
        "args": {
          "action": "recognize",
          "participant": "official",
          "selection": "officer"
        },
        "refusalOption": 3
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    },
    {
      "label": "Review dismissal from civil service.",
      "desc": "Only the appointing authority can end this person’s current commission. Private property and recoverable arrears remain separate.",
      "review": {
        "type": "office_appointment",
        "args": {
          "action": "remove",
          "participant": "official"
        },
        "refusalOption": 5
      }
    },
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and make no appointment, payment or declaration.",
      "effects": {}
    }
  ]
},
{
  "id": "imperial_office_court_decision",
  "pack": "imperial_office",
  "title": "The officer’s next term",
  "text": "The civil officer {official} brings the commission’s papers. The current appointing court may confirm or dismiss that exact commission, or admit a qualified officer to its recognition slate. A household recommendation supplies no other interest’s assent.",
  "trigger": {
    "minAge": 16,
    "tierMin": 3,
    "tierMax": 7,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "administrative_monarchy"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ],
  "weight": 2,
  "cooldown": 8,
  "options": [
    {
      "label": "Leave the decision open.",
      "desc": "Spend nothing and leave the commission and recognition unchanged.",
      "effects": {}
    },
    {
      "label": "Review confirmation.",
      "desc": "Review the same person, current authority and original terms before confirmation. Cancel spends nothing.",
      "review": {
        "type": "office_appointment",
        "args": {
          "action": "confirm",
          "participant": "official"
        },
        "refusalOption": 0
      }
    },
    {
      "label": "Review dismissal.",
      "desc": "Review the same person, current authority and original terms before confirmation. Cancel spends nothing.",
      "review": {
        "type": "office_appointment",
        "args": {
          "action": "remove",
          "participant": "official"
        },
        "refusalOption": 0
      }
    },
    {
      "label": "Review admission to the slate.",
      "desc": "Review the same person, current authority and original terms before confirmation. Cancel spends nothing.",
      "review": {
        "type": "office_recognition",
        "args": {
          "action": "nominate",
          "participant": "official"
        },
        "refusalOption": 0
      }
    },
    {
      "label": "Review your own recognition.",
      "desc": "Review the same person, current authority and original terms before confirmation. Cancel spends nothing.",
      "review": {
        "type": "office_recognition",
        "args": {
          "action": "recognize",
          "participant": "official",
          "selection": "officer"
        },
        "refusalOption": 0
      }
    }
  ]
},
{
  "id": "imperial_office_changed_voices",
  "pack": "imperial_office",
  "title": "The count has changed",
  "text": "A change in your effective sources of recognition brings your friend {friend} back to the papers. One source now remains. A title does not supply the missing voices, and another interest must still decide for itself. The declaration concerns the living claimant {official}, whose support keeps its own terms.",
  "trigger": {
    "minAge": 16,
    "tierMin": 6,
    "tierMax": 7,
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      },
      {
        "reader": "legitimacy_band",
        "args": {
          "band": "single_source",
          "subject": "moment"
        }
      }
    ]
  },
  "participants": [
    {
      "slot": "friend",
      "source": "role",
      "role": "friend",
      "required": true
    },
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "friend",
    "official"
  ],
  "weight": 0,
  "cooldown": 1,
  "options": [
    {
      "label": "Leave recognition undecided.",
      "desc": "Spend nothing and retain the existing sources.",
      "effects": {}
    },
    {
      "label": "Review your own declaration.",
      "desc": "Only your current mandate may support the named person. Other claims remain independent.",
      "review": {
        "type": "office_recognition",
        "args": {
          "action": "recognize",
          "participant": "official"
        },
        "refusalOption": 0
      }
    },
    {
      "label": "Review withdrawal of your own support.",
      "desc": "Withdraw only your current mandate’s recognition. Independent sources remain.",
      "review": {
        "type": "office_recognition",
        "args": {
          "action": "contest",
          "participant": "official"
        },
        "refusalOption": 0
      }
    }
  ]
}
  );
  FBDATA.eventSubscriptions = FBDATA.eventSubscriptions || {};
  FBDATA.eventSubscriptions.imperial_office_changed_voices = [{hook:'legitimacy_band_changed',require:{minAge:16}}];
})();
