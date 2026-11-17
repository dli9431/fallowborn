/* Fictional court situations observe current institutions and preserve public authority. */
(function () {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.imperial_service = {eras:['late_antique'],yearMin:476,yearMax:550};
  FBDATA.eventChances.imperial_service_answer = {base:0.4,min:0.1,max:0.9,steps:[{kind:'skill',id:'dip',factor:0.02}]};
  FBDATA.events.push(
{
  "id": "service_court_petition",
  "pack": "imperial_service",
  "title": "A commission, not an estate",
  "text": "A rising officer needs a living court and a real host. In Deeds, Offices & Legitimacy reviews the court service commission. The petition requires military skill 6, retained prestige 20 and a private registration payment of {money:15}. You may remain a private soldier.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Review the service petition",
      "desc": "Review the actual people, authority, fee and consequences before confirmation. Refusal and cancellation leave this transaction unspent.",
      "review": {
        "type": "mandate_service",
        "args": {
          "officeId": "court_service_command",
          "action": "petition",
          "input": {}
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_scope",
  "pack": "imperial_service",
  "title": "The limits of command",
  "text": "A commissioned host remains the court’s force. Officers command only the hosts covered by an effective mandate. Ordinary army controls and the court mandate review retain their current route, availability and authority checks.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Review the exact host’s order",
      "desc": "Review the actual people, authority, fee and consequences before confirmation. Refusal and cancellation leave this transaction unspent.",
      "review": {
        "type": "mandate_service",
        "args": {
          "officeId": "court_service_command",
          "action": "command",
          "input": {}
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_gates",
  "pack": "imperial_service",
  "title": "An unpaid group at the gates",
  "text": "A group seeking federate service brings a list of mouths and a demand for pay. Review actual offered contracts before treating anyone as a serving contingent. Initial support and continuing seasonal obligations belong to the court account.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Review the offered service payment",
      "desc": "Only an actual offer already accepted by the outside court can be completed. Review its public payment and seasonal obligation; your household purse supplies nothing.",
      "review": {
        "type": "mandate_service",
        "args": {"officeId":"court_service_command","action":"consent","input":{"templateId":"court_paid_service"}},
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_accounts",
  "pack": "imperial_service",
  "title": "The emperor tests the accounts",
  "text": "A request to explain command expenses tests whether you distinguish a public obligation from your own purse. Mandate reviews disclose the actual payer, available funds, initial support and seasonal reserve.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Review accountable civil service",
      "desc": "Review the actual people, authority, fee and consequences before confirmation. Refusal and cancellation leave this transaction unspent.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_interests",
  "pack": "imperial_service",
  "title": "Senators and bishops have interests",
  "text": "Senatorial property and episcopal influence are interests to consider, not signatures you can supply. Actual appointments, local institutions and recognition retain their separate lawful principals.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Review a civic petition",
      "desc": "Review the actual people, authority, fee and consequences before confirmation. Refusal and cancellation leave this transaction unspent.",
      "review": {
        "type": "office_petition",
        "args": {},
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_favor",
  "pack": "imperial_service",
  "title": "The army’s mood and court favor",
  "text": "Praise among soldiers does not make a suspended warrant effective. The service mandate requires court Standing of at least -20 and lasts at most 720 days. Lost favor suspends acts; expiry and lawful removal retain their own rules.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Review reaffirmation",
      "desc": "Review the actual people, authority, fee and consequences before confirmation. Refusal and cancellation leave this transaction unspent.",
      "review": {
        "type": "mandate_service",
        "args": {
          "officeId": "court_service_command",
          "action": "confirm",
          "input": {}
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_loss",
  "pack": "imperial_service",
  "title": "Life after a commission",
  "text": "The court may dismiss its officer. A removed mandate supplies no command or lawful spending. Offices & Legitimacy reviews eligible responses within 90 days. Accepted court obligations remain public; private household property remains separate.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Accept actual loss of service",
      "desc": "Review the actual people, authority, fee and consequences before confirmation. Refusal and cancellation leave this transaction unspent.",
      "review": {
        "type": "mandate_service",
        "args": {
          "officeId": "court_service_command",
          "action": "accept_loss",
          "input": {}
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_purple",
  "pack": "imperial_service",
  "title": "An offer of the purple",
  "text": "An approach from soldiers may tempt an officer toward the purple. A declaration requires the actual mandate’s eligibility and independent recognition. A living emperor is not removed by an invitation. Any lawful accession or disputed campaign retains its canonical review and may fail.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "once": true,
  "weight": 8,
  "options": [
    {
      "label": "Review the actual host’s acclamation",
      "desc": "Review the actual people, authority, fee and consequences before confirmation. Refusal and cancellation leave this transaction unspent.",
      "review": {
        "type": "mandate_service",
        "args": {
          "officeId": "court_service_command",
          "action": "acclaim",
          "input": {}
        },
        "refusalOption": 1
      }
    },
    {
      "label": "Leave the arrangements unchanged",
      "desc": "Refuse freely without a payment, commission, consent or command.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "official",
      "source": "context",
      "required": true
    }
  ],
  "participantCards": [
    "official"
  ]
},
{
  "id": "service_court_pay_list",
  "pack": "imperial_service",
  "title": "A list at the gate",
  "text": "A clerk at {province} copies a petition from soldiers seeking paid service. A name on a list is not an effective contract.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Help make the petition legible",
      "desc": "Gain 1 Stewardship. No service terms or public funds change.",
      "effects": {
        "skills": {
          "ste": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_rival",
  "pack": "imperial_service",
  "title": "A courtier’s insinuation",
  "text": "{rival} suggests that your interest in service conceals a desire for another person’s command.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Answer without making a claim",
      "desc": "Standing with the bound rival improves by 2. No office changes.",
      "effects": {
        "opinion": {
          "role": "rival",
          "amt": 2
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "rival",
      "source": "role",
      "role": "rival",
      "required": true
    }
  ],
  "participantCards": [
    "rival"
  ]
},
{
  "id": "service_court_senators",
  "pack": "imperial_service",
  "title": "The senatorial account",
  "text": "A copied memorandum distinguishes private senatorial estates from the court’s receipts. Its author asks you to check the arithmetic.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Check the distinction",
      "desc": "Gain 1 Stewardship. No property or revenue right changes.",
      "effects": {
        "skills": {
          "ste": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_bishop",
  "pack": "imperial_service",
  "title": "A bishop’s intercession",
  "text": "{priest} asks you to hear a petition before lending your name to it. An intercession is not a civil sentence or a public commission.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Hear the petition respectfully",
      "desc": "Standing with the bound priest improves by 2. No judgment or appointment follows.",
      "effects": {
        "opinion": {
          "role": "priest",
          "amt": 2
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ],
  "participants": [
    {
      "slot": "priest",
      "source": "role",
      "role": "priest",
      "required": true
    }
  ],
  "participantCards": [
    "priest"
  ]
},
{
  "id": "service_court_watch",
  "pack": "imperial_service",
  "title": "The watch at dusk",
  "text": "The watch near {province} is tired of rumors about wages. You can discuss orderly guard duty without promising the court’s silver.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Discuss the watch routine",
      "desc": "Gain 1 Martial. This changes no host, supply or pay record.",
      "effects": {
        "skills": {
          "mar": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_seal",
  "pack": "imperial_service",
  "title": "A seal without a signature",
  "text": "A clerk shows you an unsigned copy of an impressive warrant. A seal on a draft cannot replace a living appointment.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Study the draft carefully",
      "desc": "Gain 1 Intrigue. No commission is authenticated.",
      "effects": {
        "skills": {
          "int": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_purser",
  "pack": "imperial_service",
  "title": "The purser’s distinction",
  "text": "A purser explains why a private gift and an accepted public obligation must appear in different accounts.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Learn the accounting rule",
      "desc": "Gain 1 Stewardship. Neither purse is debited.",
      "effects": {
        "skills": {
          "ste": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_purple_rumor",
  "pack": "imperial_service",
  "title": "Purple cloth in a rumor",
  "text": "A story reaches {province} about soldiers offering purple cloth to a favorite. Rumor provides neither independent support nor a vacancy.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Discuss the danger of a premature claim",
      "desc": "Gain 1 Diplomacy. No claimant or recognition is created.",
      "effects": {
        "skills": {
          "dip": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_muster",
  "pack": "imperial_service",
  "title": "Names missing from the muster",
  "text": "Two copies of a muster disagree. The discrepancy calls for an actual count, not a promise of new soldiers.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Compare the surviving copies",
      "desc": "Gain 1 Martial. No soldiers are created, moved or dismissed.",
      "effects": {
        "skills": {
          "mar": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_audience",
  "pack": "imperial_service",
  "title": "A rehearsal for an audience",
  "text": "A clerk offers to rehearse the questions a court may ask about a proposed service bargain.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Practice a careful answer",
      "desc": "Diplomacy may earn 2 Prestige; failure changes nothing. No audience or agreement is granted.",
      "chance": "imperial_service_answer",
      "success": {
        "effects": {
          "prestige": 2
        }
      },
      "failure": {
        "effects": {}
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_succession",
  "pack": "imperial_service",
  "title": "The warrant after succession",
  "text": "A discussion at {province} turns to warrants that require reaffirmation when an appointing ruler changes. A remembered signature may no longer suffice.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Read the continuity clause",
      "desc": "Gain 1 Intrigue. No office is confirmed or renewed.",
      "effects": {
        "skills": {
          "int": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
},
{
  "id": "service_court_dismissed",
  "pack": "imperial_service",
  "title": "An officer’s private inventory",
  "text": "A copied inventory lists a former officer’s household goods separately from the host’s equipment. Dismissal and private property are different questions.",
  "trigger": {
    "state": [
      {
        "reader": "county_holder_government",
        "args": {
          "formId": "roman_civic"
        }
      }
    ]
  },
  "weight": 5,
  "cooldown": 12,
  "options": [
    {
      "label": "Learn from the inventory",
      "desc": "Gain 1 Stewardship. No dismissal, confiscation or transfer occurs.",
      "effects": {
        "skills": {
          "ste": 1
        }
      }
    },
    {
      "label": "Return to your own concerns",
      "desc": "Continue without spending or accepting a public obligation.",
      "effects": {}
    }
  ]
}
  );
})();
