FB.bookmarkSources.stage({source:'data/story_imperial_service.js',bookmarks:['476','493'],catalogs:[],shared:[]}, function (FBDATA) {
  'use strict';
  FBDATA.householdTracks_imperial_service = {
  "salona_service_household": {
    "id": "salona_service_household",
    "type": "household_track",
    "title": "A household in imperial service",
    "intro": "Win a commission from the Dalmatian court at Salona, lead its host where ordered, and keep your household’s money apart from the court’s. You can set the plan aside at any step.",
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
        "text": "The Dalmatian court at Salona gives commissions to officers who can lead its hosts. You need Military skill 6, prestige 20 and enough Standing with the court, and you pay a fee of {money:15} from your own purse. The petition is also in Offices & Legitimacy in Deeds, or you may stay a private soldier.",
        "choices": [
          {
            "id": "service_petition",
            "label": "Petition for the service commission",
            "detail": "If the Dalmatian court has a host free, you pay {money:15} and take command of it at once. Your prestige is checked, not spent.",
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
            "detail": "You stay a private soldier at Salona and keep your {money:15}.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "service_seek_eastern_court",
            "label": "Seek service at the eastern court",
            "detail": "You pay the fare and set out for Constantinople. The eastern court promises you no commission or host there.",
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
        "name": "Leading the court’s host",
        "text": "The host you lead belongs to the Dalmatian court, and you may move only the host your commission names. The court orders it to Iader.",
        "choices": [
          {
            "id": "service_scope",
            "label": "March the host as ordered",
            "detail": "The host sets out for Iader. Your commission must still be valid when it arrives.",
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
            "detail": "The story ends before you march to Iader. Your commission stays in force.",
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
        "text": "A band from another court comes to Salona seeking paid service, with families to feed and a demand for pay. Their own ruler must agree before they serve, and their pay comes from the Dalmatian treasury, not your household.",
        "choices": [
          {
            "id": "service_gates",
            "label": "Hear out the men at the gates",
            "detail": "You hear their terms and turn to the Dalmatian court’s accounts. Nobody is hired yet.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "accounts"
          },
          {
            "id": "service_stop_gates",
            "label": "Set the service plan aside",
            "detail": "The story ends, and the band at Salona’s gates is left to the court.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "salona_service_household_gates_consent",
            "label": "Hire the band for the court",
            "detail": "Once their ruler agrees, the Dalmatian treasury pays {money:12} at once and {money:8} each season for a year.",
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
        "text": "The emperor at Salona asks you to explain what your command costs. Hosts and hired bands are paid from the Dalmatian treasury; your fee and your wages stay in your household purse.",
        "choices": [
          {
            "id": "service_accounts",
            "label": "Keep the accounts separate",
            "detail": "You answer the emperor with the court’s spending set apart from your own, then turn to Salona’s senators and bishop.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "interests"
          },
          {
            "id": "service_stop_accounts",
            "label": "Set the service plan aside",
            "detail": "The story ends before the emperor at Salona sees your accounts.",
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
        "text": "The landowning senators of Salona and its bishop have interests of their own. You can win their support, but your commission cannot speak for them.",
        "choices": [
          {
            "id": "service_interests",
            "label": "Weigh the senators and the bishop",
            "detail": "You take the Salona senators’ and bishop’s interests into account. None of them is bound to back you.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "favor"
          },
          {
            "id": "service_stop_interests",
            "label": "Set the service plan aside",
            "detail": "The story ends with Salona’s senators and bishop left to themselves.",
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
        "text": "The soldiers’ praise cannot lift a suspension. Your commission needs Standing of at least -20 with the Dalmatian court and lasts at most 720 days. Below that you cannot act on it; it ends when its term runs out or the court dismisses you.",
        "choices": [
          {
            "id": "service_favor",
            "label": "Mind your Standing at court",
            "detail": "You watch your Standing with the Dalmatian court and look ahead to how your commission ends.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "loss"
          },
          {
            "id": "service_stop_favor",
            "label": "Set the service plan aside",
            "detail": "The story ends; your Standing with the Dalmatian court is your own affair.",
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
        "text": "Your commission ends when the Dalmatian court dismisses you or its 720 days run out; a suspension alone does not end it. Until then, wait here or go about your household’s work.",
        "choices": [
          {
            "id": "service_loss",
            "label": "Accept the end of your commission",
            "detail": "Opens once the Dalmatian court dismisses you or your term runs out. You give up command, and the court’s contracts stay in force.",
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
            "detail": "The story ends while your Dalmatian commission runs its course.",
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
        "text": "Soldiers at Salona urge you to claim the purple. Their cheers do not unseat the living emperor: a claim needs recognition beyond the army, and any bid for the throne has its own review and may fail.",
        "choices": [
          {
            "id": "service_purple",
            "label": "Turn the soldiers’ offer down",
            "detail": "You refuse the soldiers at Salona and close this story without a claim to the throne.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "complete"
          },
          {
            "id": "service_stop_purple",
            "label": "Set the service plan aside",
            "detail": "The story ends with the soldiers’ offer at Salona unanswered.",
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
        "name": "Your service story is done",
        "text": "What you did in service stays on record. Your commission, hosts and contracts keep their own terms.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "deferred": {
        "name": "Private life continues",
        "text": "You set the service plan aside. Your household goes on with its work without seeking an office.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "elsewhere": {
        "name": "Away from the court",
        "text": "You left the court where this service began, so this story ends. No office, household move or new commission follows from it.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The officer’s story ended",
        "text": "Death or succession ended this story with the officer who began it. The heir gains no office from it.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "eastern_road": {
        "name": "The road to Constantinople",
        "text": "You are on the road to Constantinople to seek service with the eastern court. Once there, live a year in the city before you can move your household. The journey can fail or be cut short.",
        "choices": [
          {
            "id": "service_road_stop",
            "label": "Set this program aside",
            "detail": "You keep travelling, but this story ends.",
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
        "text": "After a year living in Constantinople you may move your household here for good. Until then you can wait or end this story; living here earns you no commission.",
        "choices": [
          {
            "id": "service_eastern_settle",
            "label": "Settle your household in Constantinople",
            "detail": "Uses your one household move once the year’s residence is complete. No office or land comes with it.",
            "operation": {
              "kind": "settle_household"
            },
            "next": "east_petition"
          },
          {
            "id": "service_residence_stop",
            "label": "Set this program aside",
            "detail": "You keep your present home, and this story ends.",
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
        "text": "The eastern court at Constantinople already has officers for most of its hosts. You need a host it has free, Military skill 6, prestige 20, enough Standing with the court and a fee of {money:15} from your own purse. A host with a commander, or one that is lost, cannot be yours.",
        "choices": [
          {
            "id": "east_service_petition",
            "label": "Petition for the service commission",
            "detail": "If the eastern court has a host free, you pay {money:15} and take command of it at once. Your prestige is checked, not spent.",
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
            "detail": "You stay a private soldier in Constantinople and keep your {money:15}.",
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
        "name": "Leading the court’s host",
        "text": "The host you lead belongs to the eastern court, and you may move only the host your commission names. The court orders it to Hadrianopolis.",
        "choices": [
          {
            "id": "east_service_scope",
            "label": "March the host as ordered",
            "detail": "The host sets out for Hadrianopolis. Your commission must still be valid when it arrives.",
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
            "detail": "The story ends before you march to Hadrianopolis. Your commission stays in force.",
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
        "text": "A band from another court comes to Constantinople seeking paid service, with families to feed and a demand for pay. Their own ruler must agree before they serve, and their pay comes from the eastern treasury, not your household.",
        "choices": [
          {
            "id": "east_service_gates",
            "label": "Hear out the men at the gates",
            "detail": "You hear their terms and turn to the eastern court’s accounts. Nobody is hired yet.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_accounts"
          },
          {
            "id": "east_service_stop_gates",
            "label": "Set the service plan aside",
            "detail": "The story ends, and the band at the city gates is left to the court.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "salona_service_household_east_gates_consent",
            "label": "Hire the band for the court",
            "detail": "Once their ruler agrees, the eastern treasury pays {money:12} at once and {money:8} each season for a year.",
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
        "text": "The emperor in Constantinople asks you to explain what your command costs. Hosts and hired bands are paid from the eastern treasury; your fee and your wages stay in your household purse.",
        "choices": [
          {
            "id": "east_service_accounts",
            "label": "Keep the accounts separate",
            "detail": "You answer the emperor with the court’s spending set apart from your own, then turn to the senators and bishops of Constantinople.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_interests"
          },
          {
            "id": "east_service_stop_accounts",
            "label": "Set the service plan aside",
            "detail": "The story ends before the emperor in Constantinople sees your accounts.",
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
        "text": "The senators of Constantinople and its bishops have interests of their own. You can win their support, but your commission cannot speak for them.",
        "choices": [
          {
            "id": "east_service_interests",
            "label": "Weigh the senators and bishops",
            "detail": "You take the interests of the city’s senators and bishops into account. None of them is bound to back you.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_favor"
          },
          {
            "id": "east_service_stop_interests",
            "label": "Set the service plan aside",
            "detail": "The story ends with the city’s senators and bishops left to themselves.",
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
        "text": "The soldiers’ praise cannot lift a suspension. Your commission needs Standing of at least -20 with the eastern court and lasts at most 720 days. Below that you cannot act on it; it ends when its term runs out or the court dismisses you.",
        "choices": [
          {
            "id": "east_service_favor",
            "label": "Mind your Standing at court",
            "detail": "You watch your Standing with the eastern court and look ahead to how your commission ends.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "east_loss"
          },
          {
            "id": "east_service_stop_favor",
            "label": "Set the service plan aside",
            "detail": "The story ends; your Standing with the eastern court is your own affair.",
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
        "text": "Your commission ends when the eastern court dismisses you or its 720 days run out; a suspension alone does not end it. Until then, wait here or go about your household’s work.",
        "choices": [
          {
            "id": "east_service_loss",
            "label": "Accept the end of your commission",
            "detail": "Opens once the eastern court dismisses you or your term runs out. You give up command, and the court’s contracts stay in force.",
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
            "detail": "The story ends while your eastern commission runs its course.",
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
        "text": "Soldiers in Constantinople urge you to claim the purple. Their cheers do not unseat the living emperor: a claim needs recognition beyond the army, and any bid for the throne has its own review and may fail.",
        "choices": [
          {
            "id": "east_service_purple",
            "label": "Turn the soldiers’ offer down",
            "detail": "You refuse the soldiers in Constantinople and close this story without a claim to the throne.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "complete"
          },
          {
            "id": "east_service_stop_purple",
            "label": "Set the service plan aside",
            "detail": "The story ends with the soldiers’ offer in Constantinople unanswered.",
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
    "intro": "Win a commission from the eastern court at Constantinople, lead its host where ordered, and keep your household’s money apart from the court’s. You can set the plan aside at any step.",
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
        "text": "In Constantinople the eastern court commissions officers when it has a host free; it raises no new host for you. You need Military skill 6, prestige 20, enough Standing with the court and a fee of {money:15} from your own purse. Until then, work and training go on at home.",
        "choices": [
          {
            "id": "eastern_service_petition",
            "label": "Petition for the service commission",
            "detail": "When a court host is free, you pay the {money:15} fee and command it from that day. Prestige 20 is required but not spent.",
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
            "detail": "You keep your {money:15} and your household’s work, and seek no commission.",
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
        "name": "Leading the court’s host",
        "text": "Your host is the eastern court’s force, not yours, and your commission covers that host alone. The court wants it at Hadrianopolis.",
        "choices": [
          {
            "id": "eastern_service_scope",
            "label": "March the host as ordered",
            "detail": "Your host marches for Hadrianopolis. The march needs your commission to hold until the host arrives.",
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
            "detail": "The story ends with your host still short of Hadrianopolis; you keep the commission.",
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
        "text": "Fighters from a neighboring court reach Constantinople asking to be hired, with families in tow and pay to settle. Their ruler must agree to the contract, and the eastern treasury pays them, not your household.",
        "choices": [
          {
            "id": "eastern_service_gates",
            "label": "Hear out the men at the gates",
            "detail": "You listen to the fighters’ demands, then turn to the court’s books. No one is hired yet.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "accounts"
          },
          {
            "id": "eastern_service_stop_gates",
            "label": "Set the service plan aside",
            "detail": "The story ends; the court deals with the fighters without you.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "deferred"
          },
          {
            "id": "eastern_service_household_493_gates_consent",
            "label": "Hire the fighters for the court",
            "detail": "After their ruler agrees, the court treasury in Constantinople pays {money:12} now and {money:8} a season for a year.",
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
        "text": "The emperor wants to know where the money for your command goes. The eastern treasury pays for hosts and hired fighters; your fee and private earnings belong to your household.",
        "choices": [
          {
            "id": "eastern_service_accounts",
            "label": "Keep the accounts separate",
            "detail": "You keep the court’s books and your household’s purse apart, and look next to the senate and the clergy.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "interests"
          },
          {
            "id": "eastern_service_stop_accounts",
            "label": "Set the service plan aside",
            "detail": "The story ends with the emperor’s question about your accounts unanswered.",
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
        "text": "The senate of Constantinople holds great estates and the clergy hold the city’s ear. Their support is theirs to give; your commission cannot give it for them.",
        "choices": [
          {
            "id": "eastern_service_interests",
            "label": "Weigh the senate and the clergy",
            "detail": "You keep the senate’s and the clergy’s wishes in mind. Neither owes you its support.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "favor"
          },
          {
            "id": "eastern_service_stop_interests",
            "label": "Set the service plan aside",
            "detail": "The story ends before you deal with the senate or the clergy.",
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
        "text": "Cheering soldiers cannot restore a suspended commission. You need Standing of at least -20 with the eastern court to act, and the commission runs for at most 720 days. It ends when that term is over or the court dismisses you.",
        "choices": [
          {
            "id": "eastern_service_favor",
            "label": "Mind your Standing at court",
            "detail": "You keep your Standing in Constantinople at -20 or better and prepare for the day your term ends.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "loss"
          },
          {
            "id": "eastern_service_stop_favor",
            "label": "Set the service plan aside",
            "detail": "The story ends; court favor in Constantinople is left to you.",
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
        "text": "Your eastern commission lasts until the court dismisses you or its 720 days are up; a suspension does not end it. Meanwhile your household carries on its work in Constantinople.",
        "choices": [
          {
            "id": "eastern_service_loss",
            "label": "Accept the end of your commission",
            "detail": "Available after dismissal or the end of your term. Your command ends; contracts the court made remain its obligations.",
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
            "detail": "The story ends and your commission runs on until its term or a dismissal.",
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
        "text": "Some soldiers would raise you to the purple. The reigning emperor stays on the throne until a claim wins recognition beyond the army, and any bid has its own review and can fail.",
        "choices": [
          {
            "id": "eastern_service_purple",
            "label": "Turn the soldiers’ offer down",
            "detail": "You send the soldiers away, make no claim to the throne and close this story.",
            "operation": {
              "kind": "record_decision"
            },
            "next": "complete"
          },
          {
            "id": "eastern_service_stop_purple",
            "label": "Set the service plan aside",
            "detail": "The story ends, and you leave the soldiers without an answer.",
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
        "name": "Your service story is done",
        "text": "Your service in Constantinople stays on record. Any commission, host or contract keeps its own terms.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "deferred": {
        "name": "Private life continues",
        "text": "You set the service plan aside. Your household keeps working in Constantinople without an office.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "elsewhere": {
        "name": "Away from the court",
        "text": "You left Constantinople, so this story ends. Your household keeps its property, and the court keeps its contracts.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The officer’s story ended",
        "text": "This story ended with the death or succession of the officer who began it. The heir inherits no office from it.",
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
    "intro": "Rule from Salona through your commander: keep the host paid and loyal, and dismiss the commander who fails you. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.",
    "stages": [
      {
        "id": "imperial_service_emperor_service",
        "name": "Command and public obligations",
        "text": "Your commander leads a Dalmatian host and spends from the court’s treasury. Each commander commands only the host named in the commission, and no commander’s own purse belongs to the court.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_service_priority",
            "label": "Put the host’s pay first",
            "detail": "You turn first to the host and what the Dalmatian treasury owes it.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_service_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda before weighing Salona’s senators and bishop.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_interests",
        "name": "Civil and religious interests",
        "text": "Salona’s senators, its bishop and commanders outside your court each answer to their own interests. Their support must be won from them, not assumed.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_interests_priority",
            "label": "Court Salona’s senators and bishop",
            "detail": "You turn to the senators and bishop of Salona and the commanders beyond your court.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_interests_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda before judging how your commander serves.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_continuity",
        "name": "Service, loss and continuation",
        "text": "Your commander answers to you. You can dismiss the commander who holds your service commission now; the court’s contracts with hired men stand, and the dismissed commander loses command.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "service_emperor_dismiss",
            "label": "Dismiss your commander",
            "detail": "The commander loses command, spending and negotiation at once. Contracts the court has made stay in force, and the commander keeps their own property.",
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
            "label": "Keep your commander in post",
            "detail": "You keep faith with your Dalmatian commander and watch how the host serves.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_continuity_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda and leave your commander’s commission as it stands.",
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
    "intro": "Serve the Dalmatian court as its commander: lead the host it gives you, keep its money apart from yours and accept the end of your commission when it comes. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.",
    "stages": [
      {
        "id": "imperial_service_commander_service",
        "name": "Command and public obligations",
        "text": "You lead only the host your commission names, and the Dalmatian treasury pays for it. Other commanders’ soldiers and your household’s purse are not yours to spend on it.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_command",
            "label": "March the host to Iader",
            "detail": "Your Dalmatian host marches to Iader on the court’s order, as long as your commission holds.",
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
            "label": "Put your host first",
            "detail": "You turn to your Dalmatian host, its pay and its readiness to march.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_service_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda and keep your Dalmatian command as it is.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_interests",
        "name": "Civil and religious interests",
        "text": "The senators and bishop of Salona, and commanders outside the court, follow their own interests. You can seek their support, but your commission does not command it.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_commander_interests_priority",
            "label": "Seek friends among Salona’s notables",
            "detail": "You look for allies among Salona’s senators and clergy.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_interests_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda without seeking allies in Salona.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_continuity",
        "name": "Service, loss and continuation",
        "text": "Lost favor, the end of its term, a new ruler or a dismissal can end your Dalmatian commission. Past acclaim does not bring it back.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_accept_loss",
            "label": "Accept the end of your commission",
            "detail": "Once the court at Salona dismisses you or your term runs out, you hand back your command. Nothing is paid.",
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
            "label": "Prepare for life after command",
            "detail": "You plan for the day your Dalmatian commission ends.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_continuity_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda while your Dalmatian commission runs on.",
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
    "intro": "If you come to rule the eastern court in Constantinople, rule through your commander: keep the host paid and loyal, and dismiss the commander who fails you. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.",
    "stages": [
      {
        "id": "imperial_service_emperor_service_493",
        "name": "Command and public obligations",
        "text": "Your commander leads an eastern host and draws on the treasury in Constantinople. A commission covers one named host, and the commander’s own money is not the court’s.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_service_priority_493",
            "label": "Put the host’s pay first",
            "detail": "You see first to the eastern host and the pay the treasury owes it.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_service_finish_493",
            "label": "Conclude the program",
            "detail": "You close this agenda before turning to the senate and the clergy.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_interests_493",
        "name": "Civil and religious interests",
        "text": "The senate of Constantinople, its clergy and commanders beyond your court follow interests of their own. You must win their support; your rule does not supply it.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_emperor_interests_priority_493",
            "label": "Court the senate and the clergy",
            "detail": "You turn to the senate, the clergy of Constantinople and the commanders outside your court.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_interests_finish_493",
            "label": "Conclude the program",
            "detail": "You close this agenda before judging your eastern commander.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_emperor_continuity_493",
        "name": "Service, loss and continuation",
        "text": "Your eastern commander answers to you, and you may dismiss whoever holds your service commission now. Contracts the court has made stand after the dismissal.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "service_emperor_dismiss_493",
            "label": "Dismiss your commander",
            "detail": "Your commander’s command and powers to pay and negotiate end at once. The court’s contracts stand, and the commander’s own property is untouched.",
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
            "label": "Keep your commander in post",
            "detail": "You stand by your eastern commander and watch the host’s conduct.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_emperor_continuity_finish_493",
            "label": "Conclude the program",
            "detail": "You close this agenda and leave the eastern commander’s commission as it stands.",
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
    "intro": "Serve the eastern court in Constantinople as its commander: lead the host it entrusts to you, keep its treasury apart from your purse and accept your dismissal when it comes. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.",
    "stages": [
      {
        "id": "imperial_service_commander_service_493",
        "name": "Command and public obligations",
        "text": "Your commission covers one eastern host, paid from the treasury in Constantinople. You cannot take another commander’s soldiers, and your own money stays your household’s.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_command_493",
            "label": "March the host to Hadrianopolis",
            "detail": "On the eastern court’s order your host sets out for Hadrianopolis. Your commission must hold for the march.",
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
            "label": "Put your host first",
            "detail": "You see to your eastern host’s pay, supplies and readiness.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_service_finish_493",
            "label": "Conclude the program",
            "detail": "You close this agenda and carry on commanding your eastern host.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_interests_493",
        "name": "Civil and religious interests",
        "text": "The senate of Constantinople, the clergy and commanders outside the court each pursue their own interests. Your commission gives you no claim on their support.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "imperial_service_commander_interests_priority_493",
            "label": "Seek friends in the senate and clergy",
            "detail": "You look for allies among the senators and clergy of Constantinople.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_interests_finish_493",
            "label": "Conclude the program",
            "detail": "You close this agenda without courting the senate or the clergy.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "imperial_service_commander_continuity_493",
        "name": "Service, loss and continuation",
        "text": "Falling from favor, the end of your term, a new emperor or a dismissal can end your eastern commission. Old acclaim will not restore it.",
        "year": 493,
        "season": 0,
        "choices": [
          {
            "id": "service_commander_accept_loss_493",
            "label": "Accept the end of your commission",
            "detail": "After the eastern court dismisses you or your term expires, you give up the host. It costs you nothing.",
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
            "label": "Prepare for life after command",
            "detail": "You make plans for when your eastern commission ends.",
            "operation": "agenda_priority"
          },
          {
            "id": "imperial_service_commander_continuity_finish_493",
            "label": "Conclude the program",
            "detail": "You close this agenda while your eastern commission lasts.",
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
    "intro": "If you take service in Constantinople, serve the Eastern Roman Court as its commander: lead the host it hands you, spend its treasury only on that host and accept the end of your commission when it comes. These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.",
    "stages": [
      {
        "id": "eastern_imperial_service_commander_service",
        "name": "Command and public obligations",
        "text": "The Eastern Roman Court pays for the one host your commission names. Soldiers under other commanders, and the money your household earns, stay outside your command.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "eastern_service_commander_command",
            "label": "Lead the host to Hadrianopolis",
            "detail": "The court orders your host to Hadrianopolis, and it goes while your eastern commission is valid.",
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
            "label": "Put your eastern host first",
            "detail": "You give your attention to the eastern host you lead and what it needs to march.",
            "operation": "agenda_priority"
          },
          {
            "id": "eastern_imperial_service_commander_service_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda and go on leading the Eastern Roman host.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "eastern_imperial_service_commander_interests",
        "name": "Civil and religious interests",
        "text": "In Constantinople the senators, the bishops and commanders outside the court answer to their own interests. Serving the court does not win you their backing.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "eastern_imperial_service_commander_interests_priority",
            "label": "Make allies in Constantinople",
            "detail": "You seek backers among the city’s senators and bishops.",
            "operation": "agenda_priority"
          },
          {
            "id": "eastern_imperial_service_commander_interests_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda without seeking backers in Constantinople.",
            "operation": "agenda_finish"
          }
        ]
      },
      {
        "id": "eastern_imperial_service_commander_continuity",
        "name": "Service, loss and continuation",
        "text": "Losing the emperor’s favor, reaching the end of your term, a change of ruler or a dismissal can end your service to the Eastern Roman Court. Earlier acclaim does not renew it.",
        "year": 476,
        "season": 0,
        "choices": [
          {
            "id": "eastern_service_commander_accept_loss",
            "label": "Accept the end of your commission",
            "detail": "When the Eastern Roman Court dismisses you or your term is over, you step down from command at no cost.",
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
            "label": "Prepare for life after command",
            "detail": "You think ahead to life after your service in Constantinople.",
            "operation": "agenda_priority"
          },
          {
            "id": "eastern_imperial_service_commander_continuity_finish",
            "label": "Conclude the program",
            "detail": "You end this agenda and serve the Eastern Roman Court until your term ends.",
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
    "title": "First steps in Dalmatian service",
    "intro": "Three goals for an officer of the Dalmatian court, or of the eastern court if you move to Constantinople: win a commission, march its host as ordered, and accept the commission’s end when it comes.",
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
        "name": "Win a service commission",
        "text": "Done when the Dalmatian or eastern court confirms your petition and you pay its {money:15} fee.",
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
        "name": "March your host as ordered",
        "text": "Done when you march your host to Iader or Hadrianopolis while your commission is in force.",
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
        "name": "Accept the end of your commission",
        "text": "Done when you accept your commission’s end after a dismissal or the end of its term; a suspension does not count.",
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
    "title": "First steps in eastern service",
    "intro": "Three goals for an officer of the eastern court in Constantinople: win a commission, march its host as ordered, and accept the commission’s end when it comes.",
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
        "name": "Win a service commission",
        "text": "Done when the eastern court confirms your petition and you pay its {money:15} fee.",
        "criterion": {
          "kind": "mandate_transaction",
          "storyId": "eastern_service_household_493",
          "choiceId": "eastern_service_petition"
        }
      },
      {
        "id": "service_accounts_review",
        "name": "March your host as ordered",
        "text": "Done when you march your host to Hadrianopolis while your commission is in force.",
        "criterion": {
          "kind": "mandate_transaction",
          "storyId": "eastern_service_household_493",
          "choiceId": "eastern_service_scope"
        }
      },
      {
        "id": "service_loss_review",
        "name": "Accept the end of your commission",
        "text": "Done when you accept the end of your eastern commission after a dismissal or its term runs out; a suspension does not count.",
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
