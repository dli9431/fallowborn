/* Religious notices observe existing offices, property and proceedings. */
(function () {
  'use strict';
  FBDATA.eventPacks = FBDATA.eventPacks || {};
  FBDATA.eventPacks.religious_life = {eras:['late_antique','high_medieval'],yearMin:493,yearMax:1229};
  FBDATA.eventChances = FBDATA.eventChances || {};
  FBDATA.eventChances.religious_life_accounts = {base:0.45,min:0.1,max:0.85,steps:[{kind:'skill',id:'ste',factor:0.02},{kind:'flag',id:'religious_life_accounts_ready',add:0.1}]};
  Array.prototype.push.apply(FBDATA.events, [
  {
    "id": "religious_life_charter",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "A Charter Before a Demand",
    "text": "The existing rent charter names {possessor} and may be reviewed by {bishop}. The charter is evidence of a civil right, not proof of unpaid arrears.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "episcopal_claim_present",
          "args": {
            "profileId": "roman_temporal_rent"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "possessor",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "possessor",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Open the rent claim review",
        "desc": "Review the exact grant and current parties. Opening a claim transfers no money.",
        "review": {
          "type": "episcopal_claim",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "demand"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_dues",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "A Disputed Due",
    "text": "{possessor} and {bishop} have an existing rent right to examine. A contested assertion needs evidence and, if enforcement is sought, a competent temporal court.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "episcopal_claim_review",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "contest"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "possessor",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "possessor",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review contesting the assertion",
        "desc": "Available for the actual possessor of an open claim. Contesting pays nothing and preserves the charter.",
        "review": {
          "type": "episcopal_claim",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "contest"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_household_claim",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "A Claim at the Household Door",
    "text": "The records identify {possessor}\u2019s grant and {bishop}\u2019s institutional claim. A proposed composition need not surrender household property.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "episcopal_claim_review",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "compensation"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "possessor",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "possessor",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review a compensation proposal",
        "desc": "The proposal discloses the finite private payment. The other party must accept before anything is paid.",
        "review": {
          "type": "episcopal_claim",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "compensation"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_other_party",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "The Other Party Must Answer",
    "text": "A composition affecting {possessor} and {bishop} binds neither party merely because it appears on paper. Only the party who did not offer can accept current terms.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "episcopal_claim_review",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "accept"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "possessor",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "possessor",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review accepting the current offer",
        "desc": "Recheck the exact parties, deadline, private funds and institutional recipient before payment.",
        "review": {
          "type": "episcopal_claim",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "accept"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_temporal_hearing",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "Beyond Spiritual Authority",
    "text": "{possessor}\u2019s rent question can reach {court} only through the competent temporal jurisdiction. Spiritual office alone cannot order a civil remedy.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "episcopal_claim_review",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "request_enforcement"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "possessor",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "possessor",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review requesting enforcement",
        "desc": "This requests a hearing on the actual charter. It grants no custody, land or private income.",
        "review": {
          "type": "episcopal_claim",
          "args": {
            "profileId": "roman_temporal_rent",
            "action": "request_enforcement"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_public_accounts",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "The See and the Household",
    "text": "The current {term:county} holder governs through an ecclesiastical principality. Its public obligations and the office holder\u2019s private household expenses still belong to distinct accounts.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "county_holder_government",
          "args": {
            "formId": "ecclesiastical_principality"
          }
        }
      ],
      "countyIds": [
        "roma"
      ]
    },
    "options": [
      {
        "label": "Set the accounts in order",
        "chance": "religious_life_accounts",
        "success": {
          "text": "You distinguish the household account from the institution and its lawful dues.",
          "effects": {
            "setFlag": "religious_life_accounts_ready",
            "prestige": 1
          }
        },
        "failure": {
          "text": "The records remain incomplete. No payment or entitlement follows.",
          "effects": {}
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_see_vacancy",
    "pack": "religious_life",
    "eras": [
      "late_antique"
    ],
    "yearMin": 493,
    "yearMax": 493,
    "title": "The Vacant See",
    "text": "The local see is recorded as vacant. Keeping its institutional goods distinct from a former holder\u2019s private household protects both accounts while the existing appointment process remains unresolved.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_office_vacancy",
          "args": {
            "officeId": "carthage_bishop"
          }
        }
      ],
      "countyIds": [
        "tunis"
      ]
    },
    "options": [
      {
        "label": "Set the accounts in order",
        "chance": "religious_life_accounts",
        "success": {
          "text": "You distinguish the household account from the institution and its lawful dues.",
          "effects": {
            "setFlag": "religious_life_accounts_ready",
            "prestige": 1
          }
        },
        "failure": {
          "text": "The records remain incomplete. No payment or entitlement follows.",
          "effects": {}
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_neighbor_accused",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "A Named Accusation",
    "text": "The docket records an attack involving {defendant} and {victim}. It identifies evidence, not a verdict. {bishop} must still have a lawful cause before opening a proceeding.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_case_review",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "charge"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "defendant",
        "source": "context",
        "required": true
      },
      {
        "slot": "victim",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "defendant",
      "victim",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review the recorded accusation",
        "desc": "Only a competent bishop can charge the named matter. No accusation is invented and this review charges no fee.",
        "review": {
          "type": "religious_case",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "charge"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_answer_case",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "An Answer to the Docket",
    "text": "{defendant} can inspect the recorded evidence concerning {victim}. A personal defense belongs to that defendant, not to whoever has the largest purse.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_case_review",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "defend"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "defendant",
        "source": "context",
        "required": true
      },
      {
        "slot": "victim",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "defendant",
      "victim",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review a personal defense",
        "desc": "A defendant can spend one defense attempt. The canonical chance is disclosed before confirmation.",
        "review": {
          "type": "religious_case",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "defend"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_case_terms",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "A Composition Without a Verdict",
    "text": "A financial offer concerning {defendant} and {victim} is voluntary. {bishop}\u2019s institutional fee and the identified settlement recipient remain separate.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_case_review",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "settlement"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "defendant",
        "source": "context",
        "required": true
      },
      {
        "slot": "victim",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "defendant",
      "victim",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review offering settlement",
        "desc": "An offer pays nothing. Only the other party may accept before the deadline.",
        "review": {
          "type": "religious_case",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "settlement"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_case_consent",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "An Offer Needs an Answer",
    "text": "The named matter involving {defendant} and {victim} can settle only on a current offer accepted by the other party. Wealth alone supplies no cause and no consent.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_case_review",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "accept"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "defendant",
        "source": "context",
        "required": true
      },
      {
        "slot": "victim",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "defendant",
      "victim",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review accepting settlement",
        "desc": "Disclose the actual private payment and recipients. No public account substitutes for private wealth.",
        "review": {
          "type": "religious_case",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "accept"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_case_referral",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "Two Kinds of Jurisdiction",
    "text": "{bishop} and {court} may be the same person, but spiritual discipline and temporal enforcement remain separate decisions concerning {defendant}.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_case_review",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "refer"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "defendant",
        "source": "context",
        "required": true
      },
      {
        "slot": "victim",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "defendant",
      "victim",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review referral to temporal authority",
        "desc": "Referral grants no automatic custody or confiscation. The competent temporal court must answer separately.",
        "review": {
          "type": "religious_case",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "refer"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_case_refusal",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "Silence and Lawful Process",
    "text": "{defendant} has a choice about answering the recorded matter involving {victim}. Explicit refusal of process can have consequences; postponing this notice makes no such declaration.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_case_review",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "refuse"
          }
        }
      ]
    },
    "participants": [
      {
        "slot": "defendant",
        "source": "context",
        "required": true
      },
      {
        "slot": "victim",
        "source": "context",
        "required": true
      },
      {
        "slot": "bishop",
        "source": "context",
        "required": true
      },
      {
        "slot": "court",
        "source": "context",
        "required": true
      }
    ],
    "participantCards": [
      "defendant",
      "victim",
      "bishop",
      "court"
    ],
    "options": [
      {
        "label": "Review explicit refusal of process",
        "desc": "The review discloses support and standing consequences. Leave the decision for now makes no refusal of process.",
        "review": {
          "type": "religious_case",
          "args": {
            "profileId": "roman_clerical_violence",
            "action": "refuse"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_latin_household",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "A Place in Local Service",
    "text": "The declared Latin church group admits qualified household participants. Admission does not appoint a priest, change your work or grant an office.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "institution_role_opening",
          "args": {
            "institutionId": "constantinople_latin_service_1204",
            "roleId": "household"
          }
        }
      ],
      "countyIds": [
        "constantinople"
      ]
    },
    "options": [
      {
        "label": "Review entering this service role",
        "desc": "Review qualifications and household commitments before admission. No office or career is granted.",
        "review": {
          "type": "religious_institution",
          "args": {
            "institutionId": "constantinople_latin_service_1204",
            "roleId": "household",
            "action": "admit"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_latin_priest",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "Qualified Service, Separate Office",
    "text": "The local Latin service role is open to a person who meets its actual age, work, skill and household requirements. A service role carries no temporal jurisdiction.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "institution_role_opening",
          "args": {
            "institutionId": "constantinople_latin_service_1204",
            "roleId": "priest"
          }
        }
      ],
      "countyIds": [
        "constantinople"
      ]
    },
    "options": [
      {
        "label": "Review entering this service role",
        "desc": "Review qualifications and household commitments before admission. No office or career is granted.",
        "review": {
          "type": "religious_institution",
          "args": {
            "institutionId": "constantinople_latin_service_1204",
            "roleId": "priest",
            "action": "admit"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_greek_household",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "The Greek Church Group",
    "text": "The declared Greek church group offers ordinary household service under its own admission rules. Membership does not alter your primary faith or the local community.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "institution_role_opening",
          "args": {
            "institutionId": "constantinople_greek_service_1204",
            "roleId": "household"
          }
        }
      ],
      "countyIds": [
        "constantinople"
      ]
    },
    "options": [
      {
        "label": "Review entering this service role",
        "desc": "Review qualifications and household commitments before admission. No office or career is granted.",
        "review": {
          "type": "religious_institution",
          "args": {
            "institutionId": "constantinople_greek_service_1204",
            "roleId": "household",
            "action": "admit"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_membership",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "A Continuing Commitment",
    "text": "Your recorded membership in the Latin service group remains a personal commitment. Withdrawal does not transfer institutional goods or change your private household property.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "institution_membership",
          "args": {
            "institutionId": "constantinople_latin_service_1204"
          }
        }
      ],
      "countyIds": [
        "constantinople"
      ]
    },
    "options": [
      {
        "label": "Review withdrawing from membership",
        "desc": "End this membership explicitly. Institutional property and separate offices retain their owners.",
        "review": {
          "type": "religious_institution",
          "args": {
            "institutionId": "constantinople_latin_service_1204",
            "action": "withdraw"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_latin_activity",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "Time for Latin Church Service",
    "text": "The current Latin service declaration offers a small household commitment. Its real cost, duration and interruption rule matter more than a promise of standing.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_activity_available",
          "args": {
            "activityId": "constantinople_latin_service_1204"
          }
        }
      ],
      "countyIds": [
        "constantinople"
      ]
    },
    "options": [
      {
        "label": "Review the service commitment",
        "desc": "Review current qualifications, consent, funds and consequences before confirmation.",
        "review": {
          "type": "religious_activity",
          "args": {
            "activityId": "constantinople_latin_service_1204"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_greek_activity",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1216,
    "title": "Time for Greek Church Service",
    "text": "The current Greek service declaration offers a small household commitment. Its real cost, duration and interruption rule matter more than a promise of standing.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_activity_available",
          "args": {
            "activityId": "constantinople_greek_service_1204"
          }
        }
      ],
      "countyIds": [
        "constantinople"
      ]
    },
    "options": [
      {
        "label": "Review the service commitment",
        "desc": "Review current qualifications, consent, funds and consequences before confirmation.",
        "review": {
          "type": "religious_activity",
          "args": {
            "activityId": "constantinople_greek_service_1204"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_fund_exhausted",
    "pack": "religious_life",
    "eras": [
      "late_antique"
    ],
    "yearMin": 493,
    "yearMax": 493,
    "title": "The Care Fund Runs Dry",
    "text": "The existing Sardis care fund cannot promise unlimited work. Household gifts remain in its restricted institutional account, and an unperformed service cannot consume them.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_service_funding",
          "args": {
            "profileId": "jewish_sardis_giving_493",
            "fund": "building_care",
            "state": "exhausted"
          }
        }
      ],
      "countyIds": [
        "sardis"
      ]
    },
    "options": [
      {
        "label": "Review funding care supplies",
        "desc": "Give only to the existing restricted fund, within its declared capacity. The gift creates no office or household entitlement.",
        "review": {
          "type": "religious_patronage",
          "args": {
            "profileId": "jewish_sardis_giving_493",
            "fund": "building_care",
            "units": 2
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_fund_low",
    "pack": "religious_life",
    "eras": [
      "late_antique"
    ],
    "yearMin": 493,
    "yearMax": 493,
    "title": "Only One Care Service Remains",
    "text": "The existing Sardis care fund cannot promise unlimited work. Household gifts remain in its restricted institutional account, and an unperformed service cannot consume them.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_service_funding",
          "args": {
            "profileId": "jewish_sardis_giving_493",
            "fund": "building_care",
            "state": "low"
          }
        }
      ],
      "countyIds": [
        "sardis"
      ]
    },
    "options": [
      {
        "label": "Review funding care supplies",
        "desc": "Give only to the existing restricted fund, within its declared capacity. The gift creates no office or household entitlement.",
        "review": {
          "type": "religious_patronage",
          "args": {
            "profileId": "jewish_sardis_giving_493",
            "fund": "building_care",
            "units": 1
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_funded_care",
    "pack": "religious_life",
    "eras": [
      "late_antique"
    ],
    "yearMin": 493,
    "yearMax": 493,
    "title": "Supplies for Congregational Care",
    "text": "The Sardis congregation has a funded care service your current membership permits you to undertake. The restricted unit is spent only when the work is completed.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "religious_activity_available",
          "args": {
            "activityId": "jewish_sardis_congregation_493_care"
          }
        }
      ],
      "countyIds": [
        "sardis"
      ]
    },
    "options": [
      {
        "label": "Review the care commitment",
        "desc": "Two days of local care can earn the declared benefit once. Interruption preserves unused service funding.",
        "review": {
          "type": "religious_activity",
          "args": {
            "activityId": "jewish_sardis_congregation_493_care"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_call",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1204,
    "yearMax": 1229,
    "title": "A Call the Household May Answer",
    "text": "An existing religious campaign is preparing. Your household can review a personal vow, with its duration and obligations, without receiving troops or a promised territorial reward.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "answerable_holy_war_call",
          "args": {
            "seasons": 4,
            "desire": "honor"
          }
        }
      ]
    },
    "options": [
      {
        "label": "Review a personal vow",
        "desc": "Review the current call, doctrine and household eligibility. Declining this notice creates no military obligation.",
        "review": {
          "type": "holy_war_vow",
          "args": {
            "seasons": 4,
            "desire": "honor"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  },
  {
    "id": "religious_life_regional_call",
    "pack": "religious_life",
    "eras": [
      "high_medieval"
    ],
    "yearMin": 1209,
    "yearMax": 1229,
    "title": "An Accusation and a Campaign",
    "text": "The current regional call rests on the declared accusation against a protecting court. It is separate from a local religious case and supplies no judgment against a local community.",
    "weight": 2,
    "cooldown": 16,
    "trigger": {
      "state": [
        {
          "reader": "answerable_holy_war_call",
          "args": {
            "seasons": 8,
            "desire": "neutral",
            "causeId": "albigensian_protection"
          }
        }
      ]
    },
    "options": [
      {
        "label": "Review a personal vow",
        "desc": "Review the current call, doctrine and household eligibility. Declining this notice creates no military obligation.",
        "review": {
          "type": "holy_war_vow",
          "args": {
            "seasons": 8,
            "desire": "neutral",
            "causeId": "albigensian_protection"
          },
          "refusalOption": 1
        }
      },
      {
        "label": "Leave the decision for now",
        "text": "You make no new commitment.",
        "effects": {}
      }
    ]
  }
]);
})();
