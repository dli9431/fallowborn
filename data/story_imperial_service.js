FB.bookmarkSources.stage({source:'data/story_imperial_service.js',bookmarks:['476','493'],catalogs:[],shared:[]}, function (FBDATA) {
  'use strict';
  FBDATA.householdTracks_imperial_service = {
  "salona_service_household": {
    "id": "salona_service_household",
    "type": "household_track",
    "title": "A household in imperial service",
    "intro": "Seek a real commission, review an order for its exact host and accept actual dismissal or expiry. Your household and the court keep separate resources. You may stop at every review.",
    "homeProvinceId": "split",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "petition",
    "requirements": {
      "provinces": [
        "split",
        "constantinople"
      ],
      "realms": [
        "croatia",
        "byzantium"
      ]
    },
    "stages": {
      "petition": {
        "name": "A commission, not an estate",
        "text": "A rising officer needs a living court and a real host. In Deeds, Offices & Legitimacy reviews the court service commission. The petition requires military skill 6, retained prestige 20 and a private registration payment of {money:15}. You may remain a private soldier.",
        "choices": [
          {
            "id": "service_petition",
            "label": "Petition for the service commission",
            "detail": "Review the actual available host, qualification, retained prestige and private registration fee. Confirmation alone obtains the commission.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "croatia",
                "officeId": "court_service_command",
                "action": "petition",
                "input": {}
              }
            },
            "next": "scope"
          },
          {
            "id": "service_stop_petition",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "service_seek_eastern_court",
            "label": "Seek service at the eastern court",
            "detail": "Review the ordinary paid-service journey. No commission, host or appointment is promised; permanent residence requires the normal stay and settlement review.",
            "operation": {
              "kind": "travel_realm",
              "realmId": "byzantium",
              "purposeId": "service"
            },
            "next": "eastern_road"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "scope": {
        "name": "The limits of command",
        "text": "A commissioned host remains the court’s force. Officers command only the hosts covered by an effective mandate. Ordinary army controls and the court mandate review retain their current route, availability and authority checks.",
        "choices": [
          {
            "id": "service_scope",
            "label": "Review the commissioned host’s order",
            "detail": "Commit an ordinary march for the exact commissioned host to the disclosed destination. The mandate, route and host must remain current.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "croatia",
                "officeId": "court_service_command",
                "action": "command",
                "input": {
                  "destination": "zadar"
                }
              }
            },
            "next": "gates"
          },
          {
            "id": "service_stop_scope",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "gates": {
        "name": "An unpaid group at the gates",
        "text": "A group seeking federate service brings a list of mouths and a demand for pay. Review actual offered contracts before treating anyone as a serving contingent. Initial support and continuing seasonal obligations belong to the court account.",
        "choices": [
          {
            "id": "service_gates",
            "label": "Consider the proposed service",
            "detail": "Record an intention to inspect actual contract terms. No contract, payment, land or recognition is created.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "accounts"
          },
          {
            "id": "service_stop_gates",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "salona_service_household_gates_consent",
            "label": "Review an actual service offer",
            "detail": "Wait for the outside court’s real consent. Review the exact initial public payment and seasonal obligation before completing the contract; refusal supplies no consent.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "croatia",
                "officeId": "court_service_command",
                "action": "consent",
                "input": {
                  "templateId": "court_paid_service"
                }
              }
            },
            "next": "accounts"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "accounts": {
        "name": "The emperor tests the accounts",
        "text": "A request to explain command expenses tests whether you distinguish a public obligation from your own purse. Mandate reviews disclose the actual payer, available funds, initial support and seasonal reserve.",
        "choices": [
          {
            "id": "service_accounts",
            "label": "Keep the accounts separate",
            "detail": "Record the distinction. Use the court mandate review for actual negotiations and payments; this choice spends nothing.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "interests"
          },
          {
            "id": "service_stop_accounts",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "interests": {
        "name": "Senators and bishops have interests",
        "text": "Senatorial property and episcopal influence are interests to consider, not signatures you can supply. Actual appointments, local institutions and recognition retain their separate lawful principals.",
        "choices": [
          {
            "id": "service_interests",
            "label": "Consider independent interests",
            "detail": "Record attention without promising a senator’s vote, a bishop’s support or any appointment.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "favor"
          },
          {
            "id": "service_stop_interests",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "favor": {
        "name": "The army’s mood and court favor",
        "text": "Praise among soldiers does not make a suspended warrant effective. The service mandate requires court Standing of at least -20 and lasts at most 720 days. Lost favor suspends acts; expiry and lawful removal retain their own rules.",
        "choices": [
          {
            "id": "service_favor",
            "label": "Consider the limits of favor",
            "detail": "Record the warning. Inspect current Standing and the live mandate; no favor or authority is added.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "loss"
          },
          {
            "id": "service_stop_favor",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "loss": {
        "name": "Life after a commission",
        "text": "Wait here or continue ordinary household play until the court actually dismisses you or the finite term expires. Suspended favor alone is not expiry. Acceptance records the real loss; it does not restore command or spend public funds.",
        "choices": [
          {
            "id": "service_loss",
            "label": "Accept the ended mandate",
            "detail": "This becomes available only after actual dismissal or expiry. Accept that loss without restoring any powers, spending public money or erasing court obligations.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "croatia",
                "officeId": "court_service_command",
                "action": "accept_loss",
                "input": {}
              }
            },
            "next": "purple"
          },
          {
            "id": "service_stop_loss",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "purple": {
        "name": "An offer of the purple",
        "text": "An approach from soldiers may tempt an officer toward the purple. A declaration requires the actual mandate’s eligibility and independent recognition. A living emperor is not removed by an invitation. Any lawful accession or disputed campaign retains its canonical review and may fail.",
        "choices": [
          {
            "id": "service_purple",
            "label": "Decline to treat an invitation as authority",
            "detail": "Conclude the personal review. No claim, support, war or accession is created.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "complete"
          },
          {
            "id": "service_stop_purple",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "split"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "complete": {
        "name": "The service review is complete",
        "text": "Your committed acts remain recorded. Actual commissions, hosts, obligations and claims keep their canonical terms.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "deferred": {
        "name": "Private life continues",
        "text": "You set the service plan aside. Your household may continue ordinary work without seeking an office.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "elsewhere": {
        "name": "Away from the opening court",
        "text": "Leaving Salona ends this local review. No office, family relocation or renewed mandate follows.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original officer’s review ended",
        "text": "Death or protagonist succession ended this personal program. Its intentions grant the next protagonist no office.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "eastern_road": {
        "name": "The road to the court",
        "text": "Follow the ordinary journey. On arrival, remain for the normal residence period before reviewing a household move. Travel can fail or be interrupted.",
        "choices": [
          {
            "id": "service_road_stop",
            "label": "Set this program aside",
            "detail": "Continue the ordinary journey without a story obligation.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "kind": "arrived",
              "provinceId": "constantinople"
            },
            "next": "eastern_residence"
          }
        ]
      },
      "eastern_residence": {
        "name": "A household at the eastern court",
        "text": "After the ordinary year of residence, review one permanent household move. Until then you may wait or conclude this program; no public commission follows from living here.",
        "choices": [
          {
            "id": "service_eastern_settle",
            "label": "Review permanent residence",
            "detail": "Use the ordinary settlement review after its full residence period. This uses your one household relocation; no office or land is awarded.",
            "operation": {
              "kind": "settle_household"
            },
            "next": "east_petition"
          },
          {
            "id": "service_residence_stop",
            "label": "Set this program aside",
            "detail": "Keep the present home and ordinary journey.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": []
      },
      "east_petition": {
        "name": "A commission, not an estate",
        "text": "The eastern court has existing commissioned forces. Review a genuinely available host, Military skill 6, retained prestige 20, private fee {money:15} and current court Standing. An occupied or lost host remains unavailable.",
        "choices": [
          {
            "id": "east_service_petition",
            "label": "Petition for the service commission",
            "detail": "Review the actual available host, qualification, retained prestige and private registration fee. Confirmation alone obtains the commission.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "byzantium",
                "officeId": "court_service_command",
                "action": "petition",
                "input": {}
              }
            },
            "next": "east_scope"
          },
          {
            "id": "east_service_stop_petition",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "east_scope": {
        "name": "The limits of command",
        "text": "A commissioned host remains the court’s force. Officers command only the hosts covered by an effective mandate. Ordinary army controls and the court mandate review retain their current route, availability and authority checks.",
        "choices": [
          {
            "id": "east_service_scope",
            "label": "Review the commissioned host’s order",
            "detail": "Commit an ordinary march for the exact commissioned host to the disclosed destination. The mandate, route and host must remain current.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "byzantium",
                "officeId": "court_service_command",
                "action": "command",
                "input": {
                  "destination": "adrianople"
                }
              }
            },
            "next": "east_gates"
          },
          {
            "id": "east_service_stop_scope",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "east_gates": {
        "name": "An unpaid group at the gates",
        "text": "A group seeking federate service brings a list of mouths and a demand for pay. Review actual offered contracts before treating anyone as a serving contingent. Initial support and continuing seasonal obligations belong to the court account.",
        "choices": [
          {
            "id": "east_service_gates",
            "label": "Consider the proposed service",
            "detail": "Record an intention to inspect actual contract terms. No contract, payment, land or recognition is created.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_accounts"
          },
          {
            "id": "east_service_stop_gates",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "salona_service_household_east_gates_consent",
            "label": "Review an actual service offer",
            "detail": "Wait for the outside court’s real consent. Review the exact initial public payment and seasonal obligation before completing the contract; refusal supplies no consent.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "byzantium",
                "officeId": "court_service_command",
                "action": "consent",
                "input": {
                  "templateId": "court_paid_service"
                }
              }
            },
            "next": "east_accounts"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "east_accounts": {
        "name": "The emperor tests the accounts",
        "text": "A request to explain command expenses tests whether you distinguish a public obligation from your own purse. Mandate reviews disclose the actual payer, available funds, initial support and seasonal reserve.",
        "choices": [
          {
            "id": "east_service_accounts",
            "label": "Keep the accounts separate",
            "detail": "Record the distinction. Use the court mandate review for actual negotiations and payments; this choice spends nothing.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_interests"
          },
          {
            "id": "east_service_stop_accounts",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "east_interests": {
        "name": "Senators and bishops have interests",
        "text": "Senatorial property and episcopal influence are interests to consider, not signatures you can supply. Actual appointments, local institutions and recognition retain their separate lawful principals.",
        "choices": [
          {
            "id": "east_service_interests",
            "label": "Consider independent interests",
            "detail": "Record attention without promising a senator’s vote, a bishop’s support or any appointment.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_favor"
          },
          {
            "id": "east_service_stop_interests",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "east_favor": {
        "name": "The army’s mood and court favor",
        "text": "Praise among soldiers does not make a suspended warrant effective. The service mandate requires court Standing of at least -20 and lasts at most 720 days. Lost favor suspends acts; expiry and lawful removal retain their own rules.",
        "choices": [
          {
            "id": "east_service_favor",
            "label": "Consider the limits of favor",
            "detail": "Record the warning. Inspect current Standing and the live mandate; no favor or authority is added.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_loss"
          },
          {
            "id": "east_service_stop_favor",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "east_loss": {
        "name": "Life after a commission",
        "text": "Wait here or continue ordinary household play until the court actually dismisses you or the finite term expires. Suspended favor alone is not expiry. Acceptance records the real loss; it does not restore command or spend public funds.",
        "choices": [
          {
            "id": "east_service_loss",
            "label": "Accept the ended mandate",
            "detail": "This becomes available only after actual dismissal or expiry. Accept that loss without restoring any powers, spending public money or erasing court obligations.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "byzantium",
                "officeId": "court_service_command",
                "action": "accept_loss",
                "input": {}
              }
            },
            "next": "east_purple"
          },
          {
            "id": "east_service_stop_loss",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "east_purple": {
        "name": "An offer of the purple",
        "text": "An approach from soldiers may tempt an officer toward the purple. A declaration requires the actual mandate’s eligibility and independent recognition. A living emperor is not removed by an invitation. Any lawful accession or disputed campaign retains its canonical review and may fail.",
        "choices": [
          {
            "id": "east_service_purple",
            "label": "Decline to treat an invitation as authority",
            "detail": "Conclude the personal review. No claim, support, war or accession is created.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "complete"
          },
          {
            "id": "east_service_stop_purple",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      }
    }
  },
  "eastern_service_household_493": {
    "id": "eastern_service_household_493",
    "type": "household_track",
    "title": "A household in imperial service",
    "intro": "Seek a real commission, review an order for its exact host and accept actual dismissal or expiry. Your household and the court keep separate resources. You may stop at every review.",
    "homeProvinceId": "constantinople",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "petition",
    "requirements": {
      "provinces": [
        "constantinople"
      ],
      "realms": [
        "east_493"
      ]
    },
    "stages": {
      "petition": {
        "name": "A commission, not an estate",
        "text": "A rising officer may seek a real eastern commission when a court host is available. Work and training remain ordinary household actions. The review requires Military skill 6, retained prestige 20, private fee {money:15} and sufficient court Standing. No host is created for this petition.",
        "choices": [
          {
            "id": "eastern_service_petition",
            "label": "Petition for the service commission",
            "detail": "Review the actual available host, qualification, retained prestige and private registration fee. Confirmation alone obtains the commission.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "east_493",
                "officeId": "court_service_command",
                "action": "petition",
                "input": {}
              }
            },
            "next": "scope"
          },
          {
            "id": "eastern_service_stop_petition",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "scope": {
        "name": "The limits of command",
        "text": "A commissioned host remains the court’s force. Officers command only the hosts covered by an effective mandate. Ordinary army controls and the court mandate review retain their current route, availability and authority checks.",
        "choices": [
          {
            "id": "eastern_service_scope",
            "label": "Review the commissioned host’s order",
            "detail": "Commit an ordinary march for the exact commissioned host to the disclosed destination. The mandate, route and host must remain current.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "east_493",
                "officeId": "court_service_command",
                "action": "command",
                "input": {
                  "destination": "adrianople"
                }
              }
            },
            "next": "gates"
          },
          {
            "id": "eastern_service_stop_scope",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "gates": {
        "name": "An unpaid group at the gates",
        "text": "A group seeking federate service brings a list of mouths and a demand for pay. Review actual offered contracts before treating anyone as a serving contingent. Initial support and continuing seasonal obligations belong to the court account.",
        "choices": [
          {
            "id": "eastern_service_gates",
            "label": "Consider the proposed service",
            "detail": "Record an intention to inspect actual contract terms. No contract, payment, land or recognition is created.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "accounts"
          },
          {
            "id": "eastern_service_stop_gates",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "eastern_service_household_493_gates_consent",
            "label": "Review an actual service offer",
            "detail": "Wait for the outside court’s real consent. Review the exact initial public payment and seasonal obligation before completing the contract; refusal supplies no consent.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "east_493",
                "officeId": "court_service_command",
                "action": "consent",
                "input": {
                  "templateId": "court_paid_service"
                }
              }
            },
            "next": "accounts"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "accounts": {
        "name": "The emperor tests the accounts",
        "text": "A request to explain command expenses tests whether you distinguish a public obligation from your own purse. Mandate reviews disclose the actual payer, available funds, initial support and seasonal reserve.",
        "choices": [
          {
            "id": "eastern_service_accounts",
            "label": "Keep the accounts separate",
            "detail": "Record the distinction. Use the court mandate review for actual negotiations and payments; this choice spends nothing.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "interests"
          },
          {
            "id": "eastern_service_stop_accounts",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "interests": {
        "name": "Senators and bishops have interests",
        "text": "Senatorial property and episcopal influence are interests to consider, not signatures you can supply. Actual appointments, local institutions and recognition retain their separate lawful principals.",
        "choices": [
          {
            "id": "eastern_service_interests",
            "label": "Consider independent interests",
            "detail": "Record attention without promising a senator’s vote, a bishop’s support or any appointment.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "favor"
          },
          {
            "id": "eastern_service_stop_interests",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "favor": {
        "name": "The army’s mood and court favor",
        "text": "Praise among soldiers does not make a suspended warrant effective. The service mandate requires court Standing of at least -20 and lasts at most 720 days. Lost favor suspends acts; expiry and lawful removal retain their own rules.",
        "choices": [
          {
            "id": "eastern_service_favor",
            "label": "Consider the limits of favor",
            "detail": "Record the warning. Inspect current Standing and the live mandate; no favor or authority is added.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "loss"
          },
          {
            "id": "eastern_service_stop_favor",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "loss": {
        "name": "Life after a commission",
        "text": "Wait here or continue ordinary household play until the court actually dismisses you or the finite term expires. Suspended favor alone is not expiry. Acceptance records the real loss; it does not restore command or spend public funds.",
        "choices": [
          {
            "id": "eastern_service_loss",
            "label": "Accept the ended mandate",
            "detail": "This becomes available only after actual dismissal or expiry. Accept that loss without restoring any powers, spending public money or erasing court obligations.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "east_493",
                "officeId": "court_service_command",
                "action": "accept_loss",
                "input": {}
              }
            },
            "next": "purple"
          },
          {
            "id": "eastern_service_stop_loss",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "purple": {
        "name": "An offer of the purple",
        "text": "An approach from soldiers may tempt an officer toward the purple. A declaration requires the actual mandate’s eligibility and independent recognition. A living emperor is not removed by an invitation. Any lawful accession or disputed campaign retains its canonical review and may fail.",
        "choices": [
          {
            "id": "eastern_service_purple",
            "label": "Decline to treat an invitation as authority",
            "detail": "Conclude the personal review. No claim, support, war or accession is created.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "complete"
          },
          {
            "id": "eastern_service_stop_purple",
            "label": "Set the service plan aside",
            "detail": "Conclude this personal program without a petition, payment or public action.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          }
        ],
        "transitions": [
          {
            "when": {
              "not": {
                "kind": "present",
                "provinceId": "constantinople"
              }
            },
            "next": "elsewhere"
          }
        ]
      },
      "complete": {
        "name": "The service review is complete",
        "text": "Your committed acts remain recorded. Actual commissions, hosts, obligations and claims keep their canonical terms.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "deferred": {
        "name": "Private life continues",
        "text": "You set the service plan aside. Your household may continue ordinary work without seeking an office.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "elsewhere": {
        "name": "Away from the opening court",
        "text": "Leaving this court closes the local program. Existing obligations and household property remain with their ordinary owners.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original officer’s review ended",
        "text": "Death or protagonist succession ended this personal program. Its intentions grant the next protagonist no office.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  }
};
  FBDATA.rulerAgendas_imperial_service = {
  "imperial_service_emperor": {
    "id": "imperial_service_emperor",
    "type": "ruler_agenda",
    "subjectRealmId": "croatia",
    "title": "The emperor and his commanders",
    "intro": "Govern through an actual subordinate commander. This program follows the original court and generation; it cannot borrow the commander’s personal consent or the household purse.",
    "stages": [
      {
        "id": "imperial_service_emperor_service",
        "name": "Command and public obligations",
        "text": "Inspect actual commissions, hosts and available public funds. Another commander’s soldiers and a household purse are not interchangeable public resources.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_service_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_service_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_interests",
        "name": "Civil and religious interests",
        "text": "Consider senators, bishops and independent commanders through their actual institutions. A declared priority supplies none of their consent or recognition.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_interests_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_interests_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_continuity",
        "name": "Service, loss and continuation",
        "text": "A real commander remains accountable to this court. Review dismissal only for the currently bound service warrant. Public obligations survive; the former holder loses delegated powers.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "service_emperor_dismiss",
            "label": "Review dismissal of the commander",
            "detail": "The lawful court removes the actual service warrant. This ends command, negotiation and spending powers without erasing accepted obligations or taking private property.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "croatia",
              "officeId": "court_service_command",
              "action": "dismiss",
              "input": {}
            }
          },
          {
            "id": "imperial_service_emperor_continuity_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_continuity_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      }
    ],
    "binding": {
      "kind": "mandate_court",
      "officeId": "court_service_command"
    }
  },
  "imperial_service_commander": {
    "id": "imperial_service_commander",
    "type": "ruler_agenda",
    "subjectRealmId": "croatia",
    "title": "The commander and the court",
    "intro": "This program waits for your actual non-sovereign service appointment. Its original holder and court generation remain bound after acquisition. It grants no commission or independent rule.",
    "stages": [
      {
        "id": "imperial_service_commander_service",
        "name": "Command and public obligations",
        "text": "Inspect actual commissions, hosts and available public funds. Another commander’s soldiers and a household purse are not interchangeable public resources.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_command",
            "label": "Review the host’s order",
            "detail": "Use the exact living mandate and canonical review. No personal acknowledgment substitutes for the transaction.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "croatia",
              "officeId": "court_service_command",
              "action": "command",
              "input": {
                "destination": "zadar"
              }
            }
          },
          {
            "id": "imperial_service_commander_service_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_service_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_interests",
        "name": "Civil and religious interests",
        "text": "Consider senators, bishops and independent commanders through their actual institutions. A declared priority supplies none of their consent or recognition.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_commander_interests_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_interests_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_continuity",
        "name": "Service, loss and continuation",
        "text": "Read the current office and recognition records. Favor, finite tenure, changed rulers and dismissal can end effective service. Neither past acclaim nor this program restores a warrant.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_accept_loss",
            "label": "Accept actual loss of service",
            "detail": "Use the exact living mandate and canonical review. No personal acknowledgment substitutes for the transaction.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "croatia",
              "officeId": "court_service_command",
              "action": "accept_loss",
              "input": {}
            }
          },
          {
            "id": "imperial_service_commander_continuity_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_continuity_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      }
    ],
    "binding": {
      "kind": "mandate_holder",
      "officeId": "court_service_command"
    }
  },
  "imperial_service_emperor_493": {
    "id": "imperial_service_emperor_493",
    "type": "ruler_agenda",
    "subjectRealmId": "east_493",
    "title": "The emperor and his commanders",
    "intro": "This program waits until you actually become the eastern court’s ruler through ordinary political procedures. It then follows that incumbent and court generation, with an actual subordinate commander. No office or other person’s consent is granted.",
    "stages": [
      {
        "id": "imperial_service_emperor_service_493",
        "name": "Command and public obligations",
        "text": "Inspect actual commissions, hosts and available public funds. Another commander’s soldiers and a household purse are not interchangeable public resources.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_service_priority_493",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_service_finish_493",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_interests_493",
        "name": "Civil and religious interests",
        "text": "Consider senators, bishops and independent commanders through their actual institutions. A declared priority supplies none of their consent or recognition.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_interests_priority_493",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_interests_finish_493",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_continuity_493",
        "name": "Service, loss and continuation",
        "text": "A real commander remains accountable to this court. Review dismissal only for the currently bound service warrant. Public obligations survive; the former holder loses delegated powers.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "service_emperor_dismiss_493",
            "label": "Review dismissal of the commander",
            "detail": "The lawful court removes the actual service warrant. This ends command, negotiation and spending powers without erasing accepted obligations or taking private property.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "east_493",
              "officeId": "court_service_command",
              "action": "dismiss",
              "input": {}
            }
          },
          {
            "id": "imperial_service_emperor_continuity_priority_493",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_continuity_finish_493",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      }
    ],
    "binding": {
      "kind": "mandate_court",
      "waitForOffice": true,
      "officeId": "court_service_command"
    }
  },
  "imperial_service_commander_493": {
    "id": "imperial_service_commander_493",
    "type": "ruler_agenda",
    "subjectRealmId": "east_493",
    "title": "The commander and the court",
    "intro": "This program waits for your actual non-sovereign service appointment. Its original holder and court generation remain bound after acquisition. It grants no commission or independent rule.",
    "stages": [
      {
        "id": "imperial_service_commander_service_493",
        "name": "Command and public obligations",
        "text": "Inspect actual commissions, hosts and available public funds. Another commander’s soldiers and a household purse are not interchangeable public resources.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_command_493",
            "label": "Review the host’s order",
            "detail": "Use the exact living mandate and canonical review. No personal acknowledgment substitutes for the transaction.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "east_493",
              "officeId": "court_service_command",
              "action": "command",
              "input": {
                "destination": "adrianople"
              }
            }
          },
          {
            "id": "imperial_service_commander_service_priority_493",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_service_finish_493",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_interests_493",
        "name": "Civil and religious interests",
        "text": "Consider senators, bishops and independent commanders through their actual institutions. A declared priority supplies none of their consent or recognition.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_commander_interests_priority_493",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_interests_finish_493",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_continuity_493",
        "name": "Service, loss and continuation",
        "text": "Read the current office and recognition records. Favor, finite tenure, changed rulers and dismissal can end effective service. Neither past acclaim nor this program restores a warrant.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_accept_loss_493",
            "label": "Accept actual loss of service",
            "detail": "Use the exact living mandate and canonical review. No personal acknowledgment substitutes for the transaction.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "east_493",
              "officeId": "court_service_command",
              "action": "accept_loss",
              "input": {}
            }
          },
          {
            "id": "imperial_service_commander_continuity_priority_493",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_continuity_finish_493",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      }
    ],
    "binding": {
      "kind": "mandate_holder",
      "officeId": "court_service_command"
    }
  },
  "imperial_service_eastern_commander_476": {
    "id": "imperial_service_eastern_commander_476",
    "type": "ruler_agenda",
    "subjectRealmId": "byzantium",
    "title": "Service at the eastern court",
    "intro": "This program waits for your actual non-sovereign service appointment. Its original holder and court generation remain bound after acquisition. It grants no commission or independent rule.",
    "stages": [
      {
        "id": "eastern_imperial_service_commander_service",
        "name": "Command and public obligations",
        "text": "Inspect actual commissions, hosts and available public funds. Another commander’s soldiers and a household purse are not interchangeable public resources.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "eastern_service_commander_command",
            "label": "Review the host’s order",
            "detail": "Use the exact living mandate and canonical review. No personal acknowledgment substitutes for the transaction.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "byzantium",
              "officeId": "court_service_command",
              "action": "command",
              "input": {
                "destination": "adrianople"
              }
            }
          },
          {
            "id": "eastern_imperial_service_commander_service_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "eastern_imperial_service_commander_service_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "eastern_imperial_service_commander_interests",
        "name": "Civil and religious interests",
        "text": "Consider senators, bishops and independent commanders through their actual institutions. A declared priority supplies none of their consent or recognition.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "eastern_imperial_service_commander_interests_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "eastern_imperial_service_commander_interests_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "eastern_imperial_service_commander_continuity",
        "name": "Service, loss and continuation",
        "text": "Read the current office and recognition records. Favor, finite tenure, changed rulers and dismissal can end effective service. Neither past acclaim nor this program restores a warrant.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "eastern_service_commander_accept_loss",
            "label": "Accept actual loss of service",
            "detail": "Use the exact living mandate and canonical review. No personal acknowledgment substitutes for the transaction.",
            "operation": "agenda_mandate",
            "service": {
              "realmId": "byzantium",
              "officeId": "court_service_command",
              "action": "accept_loss",
              "input": {}
            }
          },
          {
            "id": "eastern_imperial_service_commander_continuity_priority",
            "label": "Keep this responsibility in view",
            "detail": "Record a costless priority without appointing, paying, moving or recognizing anyone.",
            "operation": "agenda_priority"
          },
          {
            "id": "eastern_imperial_service_commander_continuity_finish",
            "label": "Conclude the program",
            "detail": "Finish without changing actual service, claims or obligations.",
            "operation": "agenda_finish"
          }
        ]
      }
    ],
    "binding": {
      "kind": "mandate_holder",
      "officeId": "court_service_command"
    }
  }
};
  FBDATA.openingProfiles_imperial_service = {
  "opening_imperial_service": {
    "id": "opening_imperial_service",
    "type": "opening_profile",
    "title": "Learning the service warrant",
    "intro": "Optional goals observe actual acquisition, delegated command and acceptance of an ended warrant. No reward or acknowledgment can substitute for these transactions.",
    "scenarioIds": [
      "court_service_household_476"
    ],
    "provinceIds": [
      "split"
    ],
    "requires": [
      "salona_service_household"
    ],
    "goals": [
      {
        "id": "service_petition_review",
        "name": "Obtain a real mandate",
        "text": "Confirm an available commission. The original appointment and its fee must actually commit.",
        "criterion": {
          "kind": "any",
          "conditions": [
            {
              "kind": "mandate_transaction",
              "storyId": "salona_service_household",
              "choiceId": "service_petition"
            },
            {
              "kind": "mandate_transaction",
              "storyId": "salona_service_household",
              "choiceId": "east_service_petition"
            }
          ]
        }
      },
      {
        "id": "service_accounts_review",
        "name": "Use the commissioned command",
        "text": "Confirm an ordinary order for the exact commissioned host while authority remains effective.",
        "criterion": {
          "kind": "any",
          "conditions": [
            {
              "kind": "mandate_transaction",
              "storyId": "salona_service_household",
              "choiceId": "service_scope"
            },
            {
              "kind": "mandate_transaction",
              "storyId": "salona_service_household",
              "choiceId": "east_service_scope"
            }
          ]
        }
      },
      {
        "id": "service_loss_review",
        "name": "Accept actual loss",
        "text": "Wait for actual dismissal or expiry, then accept the loss through its canonical review. A suspension or personal acknowledgment does not complete this goal.",
        "criterion": {
          "kind": "any",
          "conditions": [
            {
              "kind": "mandate_transaction",
              "storyId": "salona_service_household",
              "choiceId": "service_loss"
            },
            {
              "kind": "mandate_transaction",
              "storyId": "salona_service_household",
              "choiceId": "east_service_loss"
            }
          ]
        }
      }
    ],
    "contacts": []
  },
  "opening_imperial_service_493": {
    "id": "opening_imperial_service_493",
    "type": "opening_profile",
    "title": "Learning the service warrant",
    "intro": "Optional goals observe actual acquisition, delegated command and acceptance of an ended warrant. No reward or acknowledgment can substitute for these transactions.",
    "scenarioIds": [
      "farmer_493"
    ],
    "provinceIds": [
      "constantinople"
    ],
    "requires": [
      "eastern_service_household_493"
    ],
    "goals": [
      {
        "id": "service_petition_review",
        "name": "Obtain a real mandate",
        "text": "Confirm an available commission. The original appointment and its fee must actually commit.",
        "criterion": {
          "kind": "mandate_transaction",
          "storyId": "eastern_service_household_493",
          "choiceId": "eastern_service_petition"
        }
      },
      {
        "id": "service_accounts_review",
        "name": "Use the commissioned command",
        "text": "Confirm an ordinary order for the exact commissioned host while authority remains effective.",
        "criterion": {
          "kind": "mandate_transaction",
          "storyId": "eastern_service_household_493",
          "choiceId": "eastern_service_scope"
        }
      },
      {
        "id": "service_loss_review",
        "name": "Accept actual loss",
        "text": "Wait for actual dismissal or expiry, then accept the loss through its canonical review. A suspension or personal acknowledgment does not complete this goal.",
        "criterion": {
          "kind": "mandate_transaction",
          "storyId": "eastern_service_household_493",
          "choiceId": "eastern_service_loss"
        }
      }
    ],
    "contacts": []
  }
};
  Object.assign(FBDATA.householdTracks_imperial_service,
    FBDATA.rulerAgendas_imperial_service, FBDATA.openingProfiles_imperial_service);
  ['476','493'].forEach(function (id) {
    var world = FBDATA.bookmarks[id];
    if (!world) return;
    [world].concat(Object.keys(world.revisions || {}).map(function (key) {return world.revisions[key];})).forEach(function (def) {
      var policy = JSON.parse(JSON.stringify(def.startTrackOverrides || {schema:1,entries:{}}));
      if (id === '476') {
        policy.entries.court_service_household_476 = {tracks:['salona_service_household','imperial_service_commander','imperial_service_eastern_commander_476','opening_imperial_service'],
          trackLocations:{salona_service_household:['split'],imperial_service_commander:['split'],imperial_service_eastern_commander_476:['split'],opening_imperial_service:['split']}};
        policy.entries.nepos_476 = {tracks:['nepos_track_476','opening_nepos_476','imperial_service_emperor']};
      } else {
        policy.entries.farmer_493 = {tracks:['eastern_service_household_493','imperial_service_commander_493','imperial_service_emperor_493','opening_imperial_service_493'],
          trackLocations:{eastern_service_household_493:['constantinople'],imperial_service_commander_493:['constantinople'],imperial_service_emperor_493:['constantinople'],opening_imperial_service_493:['constantinople']}};
      }
      def.startTrackOverrides = policy;
    });
  });
});
