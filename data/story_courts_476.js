/* Historical court and household instances. No executable story hooks live here. */
FBDATA.storyCourts476 = {
  "western_court_476": {
    "id": "western_court_476",
    "type": "court_settlement",
    "requires": [],
    "parameters": {
      "patronRealmId": "italy",
      "issuerRealmId": "byzantium",
      "claimantRealmId": "croatia",
      "serviceRealmId": "federates_476",
      "northernRealmId": "franks_476",
      "siblingRealmId": "burgundy",
      "remnantRealmId": "west_francia",
      "migrantRealmId": "pannonia",
      "southernRealmId": "aghlabids",
      "rivalRealmId": "thracian_goths_476",
      "targetProvinceId": "ravenna",
      "retreatProvinceId": "pavia",
      "senateProvinceId": "roma",
      "issuerProvinceId": "constantinople",
      "claimantProvinceId": "split",
      "civicId": "ravenna_council",
      "senateId": "rome_senate",
      "churchId": "rome_see",
      "minorityChurchId": "ravenna_homoian_see",
      "religiousOfficeId": "rome_bishop",
      "minorityOfficeId": "ravenna_homoian_bishop",
      "patronHostId": "host_476_italy",
      "serviceHostId": "host_476_federates",
      "majorityFaithId": "nicene",
      "minorityFaithId": "homoian",
      "civicCultureId": "roman",
      "successionSource": "dynastic_succession",
      "commissionSource": "imperial_commission",
      "acclamationSource": "army_acclamation",
      "churchSource": "church_support",
      "civicSource": "civic_acceptance",
      "sovereignOfficeId": "imperial_office",
      "judicialOfficeId": "judicial_vicar",
      "commandOfficeId": "field_command",
      "civicGovernmentForm": "roman_civic",
      "civicCareerId": "civic_clerk",
      "churchCareerId": "priest",
      "civicPermission": "civic_agreement",
      "returnStoryId": "zeno_return_476",
      "officeStoryId": "western_office_476",
      "serviceTrackId": "federate_track_476",
      "civicTrackId": "curialis_track_476",
      "migrationStoryId": "theoderic_italy_476",
      "southernStoryId": "eastern_africa_476",
      "reconquestStoryId": "eastern_italy_476",
      "northernStoryId": "clovis_syagrius_476",
      "returningClaimant": "zeno",
      "sittingClaimant": "basiliscus",
      "rivalClaimant": "nepos",
      "retainedResult": "dalmatia",
      "contestWarId": "476_ravenna",
      "serviceDays": 361,
      "immediatePay": 30,
      "seasonalPay": 10,
      "householdShare": 2,
      "paymentPeriods": 4,
      "escortPay": 5,
      "majorityShare": 0.5,
      "registrationFee": 10,
      "prestigeMinimum": 30,
      "pressureTurn": 120,
      "settlementTurn": 90,
      "returnTurn": 180,
      "backedReturnTurn": 150,
      "returnDeadline": 360,
      "officeReviewTurn": 361,
      "settlementIndex": 1,
      "fields": {
        "patronRuler": "westRulerId",
        "sittingRuler": "eastRulerId",
        "rival": "neposId",
        "serviceRuler": "odoacerId",
        "returningRuler": "zenoId",
        "commander": "orestesId",
        "delegate": "civicDelegateId",
        "bishop": "bishopId",
        "recipient": "veteranId",
        "senator": "senatorId",
        "minorityBishop": "homoianBishopId",
        "northernHeir": "clovisId",
        "sibling": "gundobadId",
        "juniorSibling": "godegiselId",
        "remnantRuler": "syagriusId",
        "migrantRuler": "theodericId",
        "northernRuler": "childericId",
        "displacedCourt": "zenoCourt",
        "patronOffice": "westOfficeId",
        "issuerOffice": "eastOfficeId",
        "serviceAcclamation": "odoacerAcclamationId",
        "deposed": "romulusDeposed"
      }
    },
    "requirements": {
      "eras": [
        "late_antique"
      ],
      "realms": [
        "italy",
        "byzantium",
        "federates_476"
      ],
      "provinces": [
        "ravenna"
      ]
    },
    "opening": {
      "record": {
        "courtAt": "ravenna",
        "courtMove": null,
        "railsSchema": 1,
        "zenoCourt": {
          "region": "isauria",
          "provinceId": "ikonion",
          "site": "isauria_476",
          "status": "displaced"
        },
        "pressureNoted": false,
        "governanceResolved": false,
        "westernOfficeResolved": false,
        "courtAnchors": {
          "italy": "ravenna",
          "croatia": "split",
          "byzantium": "constantinople",
          "west_francia": "laon",
          "aghlabids": "tunis",
          "pannonia": "thessaloniki"
        }
      },
      "cast": [
        {
          "field": "westRulerId",
          "ref": {
            "kind": "realm_ruler",
            "realmId": "italy"
          }
        },
        {
          "field": "eastRulerId",
          "ref": {
            "kind": "realm_ruler",
            "realmId": "byzantium"
          }
        },
        {
          "field": "neposId",
          "ref": {
            "kind": "realm_ruler",
            "realmId": "croatia"
          }
        },
        {
          "field": "odoacerId",
          "ref": {
            "kind": "realm_ruler",
            "realmId": "federates_476"
          }
        },
        {
          "field": "orestesId",
          "ref": {
            "kind": "opening_actor",
            "actorId": "orestes"
          }
        },
        {
          "field": "zenoId",
          "kind": "created",
          "character": {
            "name": "Zeno",
            "culture": "greek",
            "religion": "chalcedonian",
            "age": 51,
            "station": 4,
            "role": "claimant",
            "home": "ikonion"
          }
        },
        {
          "field": "civicDelegateId",
          "ref": {
            "kind": "opening_actor",
            "actorId": "civic_delegate"
          }
        },
        {
          "field": "bishopId",
          "ref": {
            "kind": "opening_actor",
            "actorId": "simplicius"
          }
        },
        {
          "field": "veteranId",
          "ref": {
            "kind": "opening_actor",
            "actorId": "veteran"
          }
        },
        {
          "field": "senatorId",
          "ref": {
            "kind": "opening_actor",
            "actorId": "senator"
          }
        },
        {
          "field": "homoianBishopId",
          "ref": {
            "kind": "opening_actor",
            "actorId": "homoian_bishop"
          }
        },
        {
          "field": "clovisId",
          "kind": "royal_member",
          "realmId": "franks_476",
          "memberId": "clovis"
        },
        {
          "field": "gundobadId",
          "kind": "royal_member",
          "realmId": "burgundy",
          "memberId": "gundobad"
        },
        {
          "field": "godegiselId",
          "kind": "royal_member",
          "realmId": "burgundy",
          "memberId": "godegisel"
        },
        {
          "field": "childericId",
          "ref": {
            "kind": "realm_ruler",
            "realmId": "franks_476"
          }
        },
        {
          "field": "syagriusId",
          "ref": {
            "kind": "realm_ruler",
            "realmId": "west_francia"
          }
        },
        {
          "field": "theodericId",
          "ref": {
            "kind": "realm_ruler",
            "realmId": "pannonia"
          }
        }
      ],
      "family": {
        "parentField": "orestesId",
        "childField": "westRulerId"
      },
      "hosts": [
        {
          "id": "host_476_italy",
          "realm": "italy",
          "at": "ravenna",
          "from": "ravenna",
          "men": 180,
          "size": 180,
          "units": {
            "levy": 130,
            "ret": 50
          },
          "supply": 100,
          "warId": null,
          "path": [],
          "goal": null,
          "moveLeft": 0,
          "scenarioStanding": true,
          "scenarioEndTurn": 361
        },
        {
          "id": "host_476_federates",
          "realm": "federates_476",
          "at": "pavia",
          "from": "pavia",
          "men": 120,
          "size": 120,
          "units": {
            "levy": 70,
            "ret": 50
          },
          "supply": 100,
          "warId": null,
          "path": [],
          "goal": null,
          "moveLeft": 0,
          "scenarioStanding": true,
          "scenarioEndTurn": 361
        },
        {
          "id": "host_476_amal",
          "realm": "pannonia",
          "at": "thessaloniki",
          "from": "thessaloniki",
          "men": 160,
          "size": 160,
          "units": {
            "levy": 100,
            "ret": 60
          },
          "supply": 100,
          "warId": null,
          "path": [],
          "goal": null,
          "moveLeft": 0,
          "scenarioStanding": true,
          "scenarioEndTurn": 6480
        },
        {
          "id": "host_476_thracian",
          "realm": "thracian_goths_476",
          "at": "adrianople",
          "from": "adrianople",
          "men": 140,
          "size": 140,
          "units": {
            "levy": 90,
            "ret": 50
          },
          "supply": 100,
          "warId": null,
          "path": [],
          "goal": null,
          "moveLeft": 0,
          "scenarioStanding": true,
          "scenarioEndTurn": 2160
        }
      ],
      "heads": [
        {
          "officeId": "rome_bishop",
          "field": "bishopId"
        },
        {
          "officeId": "ravenna_homoian_bishop",
          "field": "homoianBishopId"
        }
      ],
      "seededOffices": [
        {
          "actorId": "orestes_command",
          "field": "orestesOfficeId"
        },
        {
          "actorId": "ravenna_delegate",
          "field": "civicOfficeId",
          "proofField": "civicProofId"
        },
        {
          "actorId": "senate_delegate",
          "field": "senateOfficeId",
          "proofField": "senateProofId"
        }
      ],
      "treasuries": [
        {
          "realmId": "italy",
          "gold": 120
        },
        {
          "realmId": "federates_476",
          "gold": 0
        }
      ],
      "institutions": [
        {
          "institutionId": "ravenna_council",
          "field": "civicDelegateId"
        },
        {
          "institutionId": "rome_senate",
          "field": "senatorId"
        },
        {
          "institutionId": "rome_see",
          "field": "bishopId"
        },
        {
          "institutionId": "ravenna_homoian_see",
          "field": "homoianBishopId"
        }
      ],
      "authority": [
        {
          "field": "westRulerId",
          "issuerRealmId": "italy",
          "source": "dynastic_succession",
          "scopeRealmId": null,
          "kind": "recognition",
          "key": "0"
        },
        {
          "field": "eastRulerId",
          "issuerRealmId": "byzantium",
          "source": "dynastic_succession",
          "scopeRealmId": null,
          "kind": "recognition",
          "key": "1"
        },
        {
          "field": "neposId",
          "issuerRealmId": "croatia",
          "source": "dynastic_succession",
          "scopeRealmId": null,
          "kind": "recognition",
          "key": "2"
        },
        {
          "field": "westRulerId",
          "institutionId": "italy",
          "officeId": "imperial_office",
          "claim": "0",
          "contested": false,
          "recordField": "westOfficeId",
          "kind": "appointment"
        },
        {
          "field": "eastRulerId",
          "institutionId": "byzantium",
          "officeId": "imperial_office",
          "claim": "1",
          "contested": false,
          "recordField": "eastOfficeId",
          "kind": "appointment"
        },
        {
          "field": "neposId",
          "issuerRealmId": "byzantium",
          "source": "imperial_commission",
          "scopeRealmId": "italy",
          "kind": "recognition",
          "key": "3"
        },
        {
          "field": "zenoId",
          "issuerRealmId": "byzantium",
          "source": "dynastic_succession",
          "scopeRealmId": "byzantium",
          "kind": "recognition",
          "key": "4"
        },
        {
          "field": "neposId",
          "institutionId": "italy",
          "officeId": "imperial_office",
          "claim": "3",
          "contested": true,
          "recordField": null,
          "kind": "appointment"
        },
        {
          "field": "zenoId",
          "institutionId": "byzantium",
          "officeId": "imperial_office",
          "claim": "4",
          "contested": true,
          "recordField": null,
          "kind": "appointment"
        }
      ]
    },
    "legacyRails": [
      "zeno_return_476",
      "western_office_476",
      "clovis_syagrius_476",
      "theoderic_italy_476",
      "eastern_africa_476",
      "eastern_italy_476"
    ],
    "legacy": {
      "stateField": "situation476",
      "trackId": "federate_track_476"
    },
    "news": {
      "message1": {
        "key": "news.476.ai_victory",
        "text": "⚔ Without your service, Odoacer’s host wins Ravenna through an ordinary campaign. The city’s surviving delegates negotiate their rights."
      },
      "message2": {
        "key": "news.476.ai_accord",
        "text": "📜 The western and federate courts agree on paid service while Ravenna keeps its civic Peace."
      },
      "message3": {
        "key": "news.476.ai_contest",
        "text": "⚔ With no service agreement, Odoacer’s host contests Ravenna through an ordinary campaign."
      },
      "message4": {
        "key": "news.476.ruler_decision",
        "text": "📜 The federate ruler records a decision on Ravenna. Territory, service and civic authority remain separate."
      },
      "message5": {
        "key": "news.476.court_arrives",
        "text": "🏛 The western court reaches Ticinum. Its escort asks for maintenance and a settlement."
      },
      "message6": {
        "key": "news.476.court_interrupted",
        "text": "🏛 The court’s route is broken; its requested settlement must be reviewed again."
      },
      "message7": {
        "key": "news.476.pressure",
        "text": "⚠ Arrears and rival claims sharpen the dispute around Ravenna."
      },
      "opening": {
        "key": "news.476.opening",
        "text": "🏛 The western court sits at Ravenna. Its federate soldiers seek a spokesman for their arrears."
      }
    },
    "text": {
      "text1": "Accept Ravenna’s civic settlement",
      "text2": "In Ravenna, use City dealings to obtain episcopal mediation and a ratified council agreement protecting civic courts, public order and Nicene worship. Adopt Roman civic government only while that agreement remains effective; no new territory is granted.",
      "text3": "Retain the host’s government",
      "text4": "Keep the federate government while civic demands remain unresolved. No new mandate, recognition or territory is granted.",
      "text5": "Review paid service",
      "text6": "Agree to {money:pay} per season for 361 days and request {money:arrears} in arrears from the western court. Both courts must consent. The veteran’s Classis settlement promise grants neither Ravenna nor an imperial office.",
      "text7": "Contest Ravenna",
      "text8": "Declare an ordinary campaign against the western court. Your existing host must win the objective; no civic recognition or office is granted by declaring war.",
      "text9": "Keep the host outside the dispute",
      "text10": "End this opening without pay, promises or a campaign. Use ordinary diplomacy and contract reviews for later dealings.",
      "text12": "The federate ruler and Ravenna",
      "text13": "You decide for the host. Paid service, a campaign and a civic settlement are separate commitments, each using the ordinary authority rules.",
      "text14": "Odoacer’s opening ended",
      "text15": "The original ruler’s unfinished decision ended with death or succession. Existing wars and contracts continue through ordinary dealings.",
      "text16": "Government settlement recorded",
      "text17": "Ravenna is contested",
      "text18": "Paid service agreed",
      "text19": "Ravenna awaits civic terms",
      "text20": "The host continues",
      "text21": "Choose the host’s settlement",
      "text22": "Review the living host and peaceful courts. Paid service requires thirty available in the western treasury, effective civic consent and a living bishop. Civic government requires surviving delegates, Nicene support and an effective Ravenna council agreement for courts, protection and tolerance, ratified through City dealings with episcopal mediation."
    },
    "choices": {
      "accept_civic_rule": {
        "id": "accept_civic_rule",
        "operation": "accept_civic_rule",
        "label": "Accept Ravenna’s civic settlement",
        "detail": "In Ravenna, use City dealings to obtain episcopal mediation and a ratified council agreement protecting civic courts, public order and Nicene worship. Adopt Roman civic government only while that agreement remains effective; no new territory is granted."
      },
      "retain_host_rule": {
        "id": "retain_host_rule",
        "operation": "retain_host_rule",
        "label": "Retain the host’s government",
        "detail": "Keep the federate government while civic demands remain unresolved. No new mandate, recognition or territory is granted."
      },
      "accept_service": {
        "id": "accept_service",
        "operation": "accept_service",
        "label": "Review paid service",
        "detail": "Agree to {money:pay} per season for 361 days and request {money:arrears} in arrears from the western court. Both courts must consent. The veteran’s Classis settlement promise grants neither Ravenna nor an imperial office.",
        "detailParams": {
          "pay": 10,
          "arrears": 30
        }
      },
      "contest_ravenna": {
        "id": "contest_ravenna",
        "operation": "contest_capital",
        "label": "Contest Ravenna",
        "detail": "Declare an ordinary campaign against the western court. Your existing host must win the objective; no civic recognition or office is granted by declaring war."
      },
      "keep_host": {
        "id": "keep_host",
        "operation": "keep_host",
        "label": "Keep the host outside the dispute",
        "detail": "End this opening without pay, promises or a campaign. Use ordinary diplomacy and contract reviews for later dealings."
      }
    },
    "stages": {
      "opening": {
        "choices": [
          "accept_service",
          "contest_ravenna",
          "keep_host"
        ]
      },
      "government": {
        "choices": [
          "accept_civic_rule",
          "retain_host_rule"
        ]
      }
    }
  },
  "zeno_return_476": {
    "id": "zeno_return_476",
    "type": "ruler_restoration",
    "requires": [
      "western_court_476"
    ],
    "parameters": {
      "patronRealmId": "italy",
      "issuerRealmId": "byzantium",
      "claimantRealmId": "croatia",
      "serviceRealmId": "federates_476",
      "northernRealmId": "franks_476",
      "siblingRealmId": "burgundy",
      "remnantRealmId": "west_francia",
      "migrantRealmId": "pannonia",
      "southernRealmId": "aghlabids",
      "rivalRealmId": "thracian_goths_476",
      "targetProvinceId": "ravenna",
      "retreatProvinceId": "pavia",
      "senateProvinceId": "roma",
      "issuerProvinceId": "constantinople",
      "claimantProvinceId": "split",
      "civicId": "ravenna_council",
      "senateId": "rome_senate",
      "churchId": "rome_see",
      "minorityChurchId": "ravenna_homoian_see",
      "religiousOfficeId": "rome_bishop",
      "minorityOfficeId": "ravenna_homoian_bishop",
      "patronHostId": "host_476_italy",
      "serviceHostId": "host_476_federates",
      "majorityFaithId": "nicene",
      "minorityFaithId": "homoian",
      "civicCultureId": "roman",
      "successionSource": "dynastic_succession",
      "commissionSource": "imperial_commission",
      "acclamationSource": "army_acclamation",
      "churchSource": "church_support",
      "civicSource": "civic_acceptance",
      "sovereignOfficeId": "imperial_office",
      "judicialOfficeId": "judicial_vicar",
      "commandOfficeId": "field_command",
      "civicGovernmentForm": "roman_civic",
      "civicCareerId": "civic_clerk",
      "churchCareerId": "priest",
      "civicPermission": "civic_agreement",
      "returnStoryId": "zeno_return_476",
      "officeStoryId": "western_office_476",
      "serviceTrackId": "federate_track_476",
      "civicTrackId": "curialis_track_476",
      "migrationStoryId": "theoderic_italy_476",
      "southernStoryId": "eastern_africa_476",
      "reconquestStoryId": "eastern_italy_476",
      "northernStoryId": "clovis_syagrius_476",
      "returningClaimant": "zeno",
      "sittingClaimant": "basiliscus",
      "rivalClaimant": "nepos",
      "retainedResult": "dalmatia",
      "contestWarId": "476_ravenna",
      "serviceDays": 361,
      "immediatePay": 30,
      "seasonalPay": 10,
      "householdShare": 2,
      "paymentPeriods": 4,
      "escortPay": 5,
      "majorityShare": 0.5,
      "registrationFee": 10,
      "prestigeMinimum": 30,
      "pressureTurn": 120,
      "settlementTurn": 90,
      "returnTurn": 180,
      "backedReturnTurn": 150,
      "returnDeadline": 360,
      "officeReviewTurn": 361,
      "settlementIndex": 1,
      "fields": {
        "patronRuler": "westRulerId",
        "sittingRuler": "eastRulerId",
        "rival": "neposId",
        "serviceRuler": "odoacerId",
        "returningRuler": "zenoId",
        "commander": "orestesId",
        "delegate": "civicDelegateId",
        "bishop": "bishopId",
        "recipient": "veteranId",
        "senator": "senatorId",
        "minorityBishop": "homoianBishopId",
        "northernHeir": "clovisId",
        "sibling": "gundobadId",
        "juniorSibling": "godegiselId",
        "remnantRuler": "syagriusId",
        "migrantRuler": "theodericId",
        "northernRuler": "childericId",
        "displacedCourt": "zenoCourt",
        "patronOffice": "westOfficeId",
        "issuerOffice": "eastOfficeId",
        "serviceAcclamation": "odoacerAcclamationId",
        "deposed": "romulusDeposed"
      }
    },
    "courtStoryId": "western_court_476",
    "commanders": [
      {
        "field": "illusId",
        "character": {
          "name": "Illus",
          "culture": "isaurian",
          "religion": "chalcedonian",
          "age": 40,
          "station": 4,
          "role": "commander",
          "home": "ikonion"
        }
      },
      {
        "field": "trocundesId",
        "character": {
          "name": "Trocundes",
          "culture": "isaurian",
          "religion": "chalcedonian",
          "age": 40,
          "station": 4,
          "role": "commander",
          "home": "ikonion"
        }
      }
    ],
    "text": {
      "text2": "Zeno’s Eastern Return",
      "text3": "Zeno’s court is displaced in Isauria. The living commanders Illus and Trocundes can abandon Basiliscus while Constantinople remains eastern and the court is at peace.",
      "text4": "Zeno returned",
      "text5": "Return interrupted",
      "text6": "The eastern court took another course",
      "text7": "A displaced claimant"
    },
    "news": {
      "message1": {
        "key": "news.476.zeno_interrupted",
        "text": "📜 Zeno’s return is interrupted by the loss of a claimant, commander or sitting court."
      },
      "message2": {
        "key": "news.476.zeno_diverted",
        "text": "📜 The eastern court loses Constantinople. Zeno’s original return opportunity closes."
      },
      "message3": {
        "key": "news.476.zeno_delayed_outcome",
        "text": "📜 The eastern court’s continuing wars prevent Zeno’s expected return."
      },
      "message4": {
        "key": "news.476.zeno_returns",
        "text": "🏛 Zeno returns to Constantinople. Basiliscus can no longer issue a fresh imperial commission."
      }
    },
    "cast": {
      "patronRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "westRulerId"
      },
      "sittingRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "eastRulerId"
      },
      "rival": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "neposId"
      },
      "serviceRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "odoacerId"
      },
      "returningRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "zenoId"
      },
      "commander": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "orestesId"
      },
      "delegate": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "civicDelegateId"
      },
      "bishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "bishopId"
      },
      "recipient": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "veteranId"
      },
      "senator": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "senatorId"
      },
      "minorityBishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "homoianBishopId"
      }
    }
  },
  "western_office_476": {
    "id": "western_office_476",
    "type": "contested_office",
    "requires": [
      "western_court_476"
    ],
    "parameters": {
      "patronRealmId": "italy",
      "issuerRealmId": "byzantium",
      "claimantRealmId": "croatia",
      "serviceRealmId": "federates_476",
      "northernRealmId": "franks_476",
      "siblingRealmId": "burgundy",
      "remnantRealmId": "west_francia",
      "migrantRealmId": "pannonia",
      "southernRealmId": "aghlabids",
      "rivalRealmId": "thracian_goths_476",
      "targetProvinceId": "ravenna",
      "retreatProvinceId": "pavia",
      "senateProvinceId": "roma",
      "issuerProvinceId": "constantinople",
      "claimantProvinceId": "split",
      "civicId": "ravenna_council",
      "senateId": "rome_senate",
      "churchId": "rome_see",
      "minorityChurchId": "ravenna_homoian_see",
      "religiousOfficeId": "rome_bishop",
      "minorityOfficeId": "ravenna_homoian_bishop",
      "patronHostId": "host_476_italy",
      "serviceHostId": "host_476_federates",
      "majorityFaithId": "nicene",
      "minorityFaithId": "homoian",
      "civicCultureId": "roman",
      "successionSource": "dynastic_succession",
      "commissionSource": "imperial_commission",
      "acclamationSource": "army_acclamation",
      "churchSource": "church_support",
      "civicSource": "civic_acceptance",
      "sovereignOfficeId": "imperial_office",
      "judicialOfficeId": "judicial_vicar",
      "commandOfficeId": "field_command",
      "civicGovernmentForm": "roman_civic",
      "civicCareerId": "civic_clerk",
      "churchCareerId": "priest",
      "civicPermission": "civic_agreement",
      "returnStoryId": "zeno_return_476",
      "officeStoryId": "western_office_476",
      "serviceTrackId": "federate_track_476",
      "civicTrackId": "curialis_track_476",
      "migrationStoryId": "theoderic_italy_476",
      "southernStoryId": "eastern_africa_476",
      "reconquestStoryId": "eastern_italy_476",
      "northernStoryId": "clovis_syagrius_476",
      "returningClaimant": "zeno",
      "sittingClaimant": "basiliscus",
      "rivalClaimant": "nepos",
      "retainedResult": "dalmatia",
      "contestWarId": "476_ravenna",
      "serviceDays": 361,
      "immediatePay": 30,
      "seasonalPay": 10,
      "householdShare": 2,
      "paymentPeriods": 4,
      "escortPay": 5,
      "majorityShare": 0.5,
      "registrationFee": 10,
      "prestigeMinimum": 30,
      "pressureTurn": 120,
      "settlementTurn": 90,
      "returnTurn": 180,
      "backedReturnTurn": 150,
      "returnDeadline": 360,
      "officeReviewTurn": 361,
      "settlementIndex": 1,
      "fields": {
        "patronRuler": "westRulerId",
        "sittingRuler": "eastRulerId",
        "rival": "neposId",
        "serviceRuler": "odoacerId",
        "returningRuler": "zenoId",
        "commander": "orestesId",
        "delegate": "civicDelegateId",
        "bishop": "bishopId",
        "recipient": "veteranId",
        "senator": "senatorId",
        "minorityBishop": "homoianBishopId",
        "northernHeir": "clovisId",
        "sibling": "gundobadId",
        "juniorSibling": "godegiselId",
        "remnantRuler": "syagriusId",
        "migrantRuler": "theodericId",
        "northernRuler": "childericId",
        "displacedCourt": "zenoCourt",
        "patronOffice": "westOfficeId",
        "issuerOffice": "eastOfficeId",
        "serviceAcclamation": "odoacerAcclamationId",
        "deposed": "romulusDeposed"
      }
    },
    "courtStoryId": "western_court_476",
    "legacyCampaigns": {
      "clovis": "clovis_syagrius_476",
      "theoderic": "theoderic_italy_476",
      "africa": "eastern_africa_476",
      "italy": "eastern_italy_476"
    },
    "legacyRails": [
      "zeno_return_476",
      "western_office_476",
      "clovis_syagrius_476",
      "theoderic_italy_476",
      "eastern_africa_476",
      "eastern_italy_476"
    ],
    "legacyDisplacedCourt": {
      "region": "isauria",
      "provinceId": "ikonion",
      "site": "isauria_476",
      "status": "displaced"
    },
    "legacyStateField": "situation476",
    "text": {
      "text2": "The Western Imperial Office",
      "text3": "Deposition, survival, rival recognition and restoration describe an office. Each mandate depends on living issuers and its authority scope; it grants no county.",
      "text4": "Western office displaced",
      "text5": "Western office survived",
      "text6": "Western office restored",
      "text7": "Nepos’s western claim",
      "text8": "Western office vacant",
      "text9": "Original mandate interrupted",
      "text10": "A different western court",
      "text11": "A contested western office"
    },
    "news": {
      "message1": {
        "key": "news.476.office_restored",
        "text": "🏛 Romulus returns to the western office after Ravenna returns to his court."
      },
      "message2": {
        "key": "news.476.office_deposed",
        "text": "📜 Loss of Ravenna displaces the western office. Territorial possession and rival office claims remain separate."
      },
      "message3": {
        "key": "news.476.office_survived",
        "text": "🏛 The western office survives the opening dispute with its living court and mandate."
      },
      "message4": {
        "key": "news.476.office_interrupted",
        "text": "📜 The original western office opportunity ends as its holder or court changes."
      }
    },
    "cast": {
      "patronRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "westRulerId"
      },
      "sittingRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "eastRulerId"
      },
      "rival": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "neposId"
      },
      "serviceRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "odoacerId"
      },
      "returningRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "zenoId"
      },
      "commander": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "orestesId"
      },
      "delegate": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "civicDelegateId"
      },
      "bishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "bishopId"
      },
      "recipient": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "veteranId"
      },
      "senator": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "senatorId"
      },
      "minorityBishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "homoianBishopId"
      }
    }
  },
  "federate_track_476": {
    "id": "federate_track_476",
    "type": "political_track",
    "requires": [
      "western_court_476"
    ],
    "parameters": {
      "patronRealmId": "italy",
      "issuerRealmId": "byzantium",
      "claimantRealmId": "croatia",
      "serviceRealmId": "federates_476",
      "northernRealmId": "franks_476",
      "siblingRealmId": "burgundy",
      "remnantRealmId": "west_francia",
      "migrantRealmId": "pannonia",
      "southernRealmId": "aghlabids",
      "rivalRealmId": "thracian_goths_476",
      "targetProvinceId": "ravenna",
      "retreatProvinceId": "pavia",
      "senateProvinceId": "roma",
      "issuerProvinceId": "constantinople",
      "claimantProvinceId": "split",
      "civicId": "ravenna_council",
      "senateId": "rome_senate",
      "churchId": "rome_see",
      "minorityChurchId": "ravenna_homoian_see",
      "religiousOfficeId": "rome_bishop",
      "minorityOfficeId": "ravenna_homoian_bishop",
      "patronHostId": "host_476_italy",
      "serviceHostId": "host_476_federates",
      "majorityFaithId": "nicene",
      "minorityFaithId": "homoian",
      "civicCultureId": "roman",
      "successionSource": "dynastic_succession",
      "commissionSource": "imperial_commission",
      "acclamationSource": "army_acclamation",
      "churchSource": "church_support",
      "civicSource": "civic_acceptance",
      "sovereignOfficeId": "imperial_office",
      "judicialOfficeId": "judicial_vicar",
      "commandOfficeId": "field_command",
      "civicGovernmentForm": "roman_civic",
      "civicCareerId": "civic_clerk",
      "churchCareerId": "priest",
      "civicPermission": "civic_agreement",
      "returnStoryId": "zeno_return_476",
      "officeStoryId": "western_office_476",
      "serviceTrackId": "federate_track_476",
      "civicTrackId": "curialis_track_476",
      "migrationStoryId": "theoderic_italy_476",
      "southernStoryId": "eastern_africa_476",
      "reconquestStoryId": "eastern_italy_476",
      "northernStoryId": "clovis_syagrius_476",
      "returningClaimant": "zeno",
      "sittingClaimant": "basiliscus",
      "rivalClaimant": "nepos",
      "retainedResult": "dalmatia",
      "contestWarId": "476_ravenna",
      "serviceDays": 361,
      "immediatePay": 30,
      "seasonalPay": 10,
      "householdShare": 2,
      "paymentPeriods": 4,
      "escortPay": 5,
      "majorityShare": 0.5,
      "registrationFee": 10,
      "prestigeMinimum": 30,
      "pressureTurn": 120,
      "settlementTurn": 90,
      "returnTurn": 180,
      "backedReturnTurn": 150,
      "returnDeadline": 360,
      "officeReviewTurn": 361,
      "settlementIndex": 1,
      "fields": {
        "patronRuler": "westRulerId",
        "sittingRuler": "eastRulerId",
        "rival": "neposId",
        "serviceRuler": "odoacerId",
        "returningRuler": "zenoId",
        "commander": "orestesId",
        "delegate": "civicDelegateId",
        "bishop": "bishopId",
        "recipient": "veteranId",
        "senator": "senatorId",
        "minorityBishop": "homoianBishopId",
        "northernHeir": "clovisId",
        "sibling": "gundobadId",
        "juniorSibling": "godegiselId",
        "remnantRuler": "syagriusId",
        "migrantRuler": "theodericId",
        "northernRuler": "childericId",
        "displacedCourt": "zenoCourt",
        "patronOffice": "westOfficeId",
        "issuerOffice": "eastOfficeId",
        "serviceAcclamation": "odoacerAcclamationId",
        "deposed": "romulusDeposed"
      }
    },
    "profile": "service_negotiation",
    "courtStoryId": "western_court_476",
    "stages": {
      "delegate": {
        "choices": [
          "accept_delegate",
          "remain_service",
          "refuse_involvement",
          "seek_city_service",
          "seek_church_service"
        ],
        "name": "Soldiers seek a spokesman"
      },
      "civic_service": {
        "choices": [
          "petition_city_office",
          "leave_city_service",
          "leave_dispute"
        ],
        "name": "Service to the Ravenna council"
      },
      "church_service": {
        "choices": [
          "seek_minority_commission",
          "mediate_communities",
          "leave_church_service",
          "leave_dispute"
        ],
        "name": "Service to the Ravenna congregation"
      },
      "commission": {
        "choices": [
          "seek_commission",
          "back_commander",
          "keep_serving",
          "leave_dispute"
        ],
        "name": "A disputed command"
      },
      "contract": {
        "choices": [
          "offer_pay",
          "refuse_pay",
          "leave_dispute"
        ],
        "name": "Arrears and service"
      },
      "civic": {
        "choices": [
          "seek_mediation",
          "renegotiate_pay",
          "revise_civic",
          "present_civic",
          "demand_force",
          "leave_dispute"
        ],
        "name": "Ravenna civic bargain"
      },
      "recognition": {
        "choices": [
          "petition_sitting_ruler",
          "back_returning_claimant",
          "back_rival_claimant",
          "forgo_recognition",
          "leave_dispute"
        ],
        "name": "Imperial recognition"
      },
      "court": {
        "choices": [
          "escort_court",
          "court_maintenance",
          "request_settlement",
          "move_to_ratification",
          "demand_force_29",
          "leave_dispute"
        ],
        "name": "The moving court"
      },
      "resolution": {
        "choices": [
          "ratify",
          "reject_ratification",
          "leave_dispute"
        ],
        "name": "Ratify the settlement"
      },
      "battle": {
        "choices": [
          "withdraw"
        ],
        "name": "Contest for Ravenna"
      },
      "aftermath": {
        "choices": [
          "accept_aftermath"
        ],
        "name": "Review the peace"
      },
      "complete": {
        "choices": [],
        "groups": [
          {
            "visibility": "service_victory",
            "choices": [
              "adopt_civic_rule",
              "affirm_host_rule",
              "recognize_rival_office",
              "retire_western_office"
            ]
          },
          {
            "visibility": "patron_restoration",
            "choices": [
              "restore_western_office"
            ]
          }
        ],
        "name": "Situation concluded"
      }
    },
    "choices": {
      "leave_dispute": {
        "id": "leave_dispute",
        "operation": "leave_dispute",
        "label": "Leave the court dispute",
        "detail": "End this political sequence. Your household and its current career survive; live contracts and existing offices retain their own terms."
      },
      "accept_delegate": {
        "id": "accept_delegate",
        "operation": "accept_delegate",
        "label": "Serve as the soldiers’ delegate",
        "detail": "Gain a service role. No land, command, or civil jurisdiction changes hands."
      },
      "remain_service": {
        "id": "remain_service",
        "operation": "remain_service",
        "label": "Remain an ordinary soldier",
        "detail": "Keep your free household and continue to the command dispute without becoming delegate."
      },
      "refuse_involvement": {
        "id": "refuse_involvement",
        "operation": "refuse_involvement",
        "label": "Refuse involvement",
        "detail": "Leave the political sequence; ordinary livelihood and family play continue."
      },
      "seek_city_service": {
        "id": "seek_city_service",
        "operation": "seek_city_service",
        "label": "Serve the Ravenna council",
        "detail": "Enter civic service as a clerk. The city delegate and senator remain separate actors; a later court appointment can grant Peace but no land or revenue."
      },
      "seek_church_service": {
        "id": "seek_church_service",
        "operation": "seek_church_service",
        "label": "Enter clerical service",
        "detail": "Begin as a priestly clerk in the Homoian congregation. Church progression follows your faith’s ordinary path; episcopal mediation can lead to civic service."
      },
      "petition_city_office": {
        "id": "petition_city_office",
        "operation": "petition_city_office",
        "label": "Petition for Ravenna’s local court",
        "detail": "Requires a living civic delegate, a Nicene majority and a western court holding Ravenna. A judicial appointment grants local Peace only; succession can require reaffirmation."
      },
      "leave_city_service": {
        "id": "leave_city_service",
        "operation": "leave_city_service",
        "label": "Continue as a clerk",
        "detail": "Keep the civic career without acquiring a court office or county."
      },
      "mediate_communities": {
        "id": "mediate_communities",
        "operation": "mediate_communities",
        "label": "Mediate with the Nicene bishop",
        "detail": "Requires both living bishops and a Homoian commission. The Nicene bishop recognizes your mediation; you may then petition the civic court."
      },
      "leave_church_service": {
        "id": "leave_church_service",
        "operation": "leave_church_service",
        "label": "Continue in the congregation",
        "detail": "Keep the clerical career and its ordinary faith progression without a civic office."
      },
      "seek_commission": {
        "id": "seek_commission",
        "operation": "seek_commission",
        "label": "Seek the detachment commission",
        "detail": "Peers acclaim you; Odoacer appoints you for 360 days to command this host only. No land, tax, or court follows."
      },
      "keep_serving": {
        "id": "keep_serving",
        "operation": "keep_serving",
        "label": "Keep serving without a command",
        "detail": "Continue to the pay dispute as a free soldier."
      },
      "offer_pay": {
        "id": "offer_pay",
        "operation": "offer_pay",
        "label": "Offer a one-year service contract",
        "detail": "Western treasury pays {money:immediate} now to the federate body, then {money:seasonal} at the next four seasonal settlements during the 360-day term. Your household receives {money:share} from each payment, included in that amount. Classis may be awarded later only by a separate reviewed grant.",
        "detailParams": {
          "immediate": 30,
          "seasonal": 10,
          "share": 2
        }
      },
      "refuse_pay": {
        "id": "refuse_pay",
        "operation": "refuse_pay",
        "label": "Refuse these terms",
        "detail": "No treasury transfer or contract. You can revise the civic proposal or contest Ravenna."
      },
      "seek_mediation": {
        "id": "seek_mediation",
        "operation": "seek_mediation",
        "label": "Seek the bishop’s mediation",
        "detail": "Promise protected Nicene worship. The bishop can support the bargain without converting your household or the city."
      },
      "renegotiate_pay": {
        "id": "renegotiate_pay",
        "operation": "renegotiate_pay",
        "label": "Reopen the service terms",
        "detail": "Return to the western treasury with a reviewed pay proposal. Existing arrears are not forgiven."
      },
      "revise_civic": {
        "id": "revise_civic",
        "operation": "revise_civic",
        "label": "Revise the civic proposal",
        "detail": "Replace a demand for force with a guarantee that Ravenna’s civic courts keep jurisdiction. No county or tax right is granted."
      },
      "present_civic": {
        "id": "present_civic",
        "operation": "present_civic",
        "label": "Present the bargain to Ravenna",
        "detail": "Requires an active paid contract, a living civic delegate, a Roman civic majority, and Nicene standing or episcopal mediation. Acceptance is scoped to Ravenna; civil courts remain with the city."
      },
      "demand_force": {
        "id": "demand_force",
        "operation": "demand_force",
        "label": "Demand a settlement by force",
        "detail": "Breach the bargain, march the real federate host on Ravenna, and face the western host. Victory does not itself grant civic or imperial recognition."
      },
      "forgo_recognition": {
        "id": "forgo_recognition",
        "operation": "forgo_recognition",
        "label": "Proceed without imperial recognition",
        "detail": "The contract and civic bargain may stand while rival imperial claims remain unresolved."
      },
      "escort_court": {
        "id": "escort_court",
        "operation": "escort_court",
        "label": "Escort the court to Ticinum",
        "detail": "The western host follows the existing route from Ravenna to Pavia. Arrival changes the court’s location, not territorial ownership."
      },
      "court_maintenance": {
        "id": "court_maintenance",
        "operation": "court_maintenance",
        "label": "Ask for court maintenance",
        "detail": "After arrival, the western treasury pays {money:amount} once to the federate body for escort. This is separate from service pay.",
        "detailParams": {
          "amount": 5
        }
      },
      "move_to_ratification": {
        "id": "move_to_ratification",
        "operation": "move_to_ratification",
        "label": "Review final settlement",
        "detail": "Requires court arrival, active service pay, and Ravenna civic consent. No award is made by opening the review."
      },
      "demand_force_29": {
        "id": "demand_force",
        "operation": "demand_force",
        "label": "Break talks and march on Ravenna",
        "detail": "The active service contract is breached. The two field hosts resolve the contest on the map."
      },
      "ratify": {
        "id": "ratify",
        "operation": "ratify",
        "label": "Ratify the negotiated settlement",
        "detail": "Confirm live pay, civic consent, court arrival, and any requested Classis grant. Romulus remains in western office; the federate host retains only its commissioned command."
      },
      "reject_ratification": {
        "id": "reject_ratification",
        "operation": "reject_ratification",
        "label": "Reject and contest Ravenna",
        "detail": "Breach the agreement and let the field hosts decide Ravenna. Your household remains playable after either result."
      },
      "withdraw": {
        "id": "withdraw",
        "operation": "withdraw",
        "label": "Withdraw the federate demand",
        "detail": "End this contest without a county award. Your free household continues."
      },
      "accept_aftermath": {
        "id": "accept_aftermath",
        "operation": "accept_aftermath",
        "label": "Continue after the contest",
        "detail": "Close the political sequence. Surviving people, communities, property, and the household remain in play."
      },
      "adopt_civic_rule": {
        "id": "adopt_civic_rule",
        "operation": "adopt_civic_rule",
        "label": "Recognize Ravenna’s civic courts",
        "detail": "Requires living city and Nicene church delegates. Record their local Peace and consent as customary rights; the federate government becomes Roman civic. No resident is converted."
      },
      "affirm_host_rule": {
        "id": "affirm_host_rule",
        "operation": "affirm_host_rule",
        "label": "Keep federate government",
        "detail": "The host keeps its political form. Ravenna’s civic rights remain contested; no automatic local consent follows conquest."
      },
      "retire_western_office": {
        "id": "retire_western_office",
        "operation": "retire_western_office",
        "label": "Leave the western office vacant",
        "detail": "Seek an eastern commission for the federate polity. The western title remains vacant; no eastern territory transfers."
      },
      "restore_western_office": {
        "id": "restore_western_office",
        "operation": "restore_western_office",
        "label": "Restore Romulus’s western office",
        "detail": "Requires Romulus alive and Ravenna back under the western court. Restore the office without granting new counties."
      },
      "back_commander": {
        "id": "back_odoacer",
        "operation": "back_commander",
        "label": "Back Odoacer as commander",
        "detail": "Odoacer holds the scoped host commission. You may still serve as delegate."
      },
      "petition_sitting_ruler": {
        "id": "petition_basiliscus",
        "operation": "petition_sitting_ruler",
        "label": "Petition Basiliscus",
        "detail": "The sitting eastern {term:emperor} may recognize federate service. His commission needs reaffirmation if his rule ends."
      },
      "back_returning_claimant": {
        "id": "back_zeno",
        "operation": "back_returning_claimant",
        "label": "Back the displaced Zeno",
        "detail": "A displaced claimant cannot issue an imperial commission now. If Zeno regains Constantinople alive, he can recognize the backed service claim."
      },
      "back_rival_claimant": {
        "id": "uphold_nepos",
        "operation": "back_rival_claimant",
        "label": "Uphold Julius Nepos",
        "detail": "The Dalmatian claimant recognizes the federate body. This does not move a county or remove Romulus."
      },
      "request_settlement": {
        "id": "request_classis",
        "operation": "request_settlement",
        "label": "Request a Classis allotment",
        "detail": "Ask to grant the existing port settlement to a named veteran at ratification. The grant is reviewed again then; other holdings and residents remain."
      },
      "seek_minority_commission": {
        "id": "seek_homoian_commission",
        "operation": "seek_minority_commission",
        "label": "Seek the Homoian bishop’s commission",
        "detail": "A living local bishop recognizes your service in Ravenna. This does not grant a county, office, or change anyone’s faith."
      },
      "recognize_rival_office": {
        "id": "recognize_nepos_west",
        "operation": "recognize_rival_office",
        "label": "Recognize Nepos for the western office",
        "detail": "Requires Nepos alive in Dalmatia and a living Rome senator with civic consent. Senate and imperial recognition support his office without moving a county."
      }
    },
    "text": {
      "text1": "Soldiers seek a spokesman",
      "text2": "Service to the Ravenna council",
      "text3": "Service to the Ravenna congregation",
      "text4": "A disputed command",
      "text5": "Arrears and service",
      "text6": "Ravenna civic bargain",
      "text7": "Imperial recognition",
      "text8": "The moving court",
      "text9": "Ratify the settlement",
      "text10": "Contest for Ravenna",
      "text11": "Review the peace",
      "text12": "Situation concluded",
      "text13": "Western court: {location}.",
      "text14": "Ticinum",
      "text15": "displaced",
      "text16": "Ravenna",
      "text17": "Federate contract: {status}; {money:amount} per season during its 360-day term.",
      "text18": "active",
      "text19": "breached",
      "text20": "expired",
      "text21": "offered",
      "text22": "Federate contract: none.",
      "text23": "Ravenna civic consent: recorded.",
      "text24": "Ravenna civic consent: pending.",
      "text25": "Your commission commands the federate host for this term only.",
      "text26": "Classis allotment: granted to the veteran.",
      "text27": "Classis allotment: requested, subject to the final grant review.",
      "text28": "Imperial commission: recorded.",
      "text29": "Zeno’s claim: backed, awaiting his return.",
      "text30": "Imperial commission: none.",
      "text31": "The host marches on the map. Its real battle and route determine control of Ravenna.",
      "text32": "Negotiated outcome: the court and city retain their separate powers.",
      "text33": "The household remains free to continue its story.",
      "text34": "Ravenna’s local Peace: your court appointment is effective.",
      "text35": "Ravenna’s local Peace: your former appointment needs a live mandate.",
      "text36": "Ravenna civic rights: recorded separately from county ownership.",
      "text37": "Federate government: Roman civic form with local courts.",
      "text38": "Federate government: host form; city claims unresolved.",
      "text39": "Western office: claimed by Nepos from Dalmatia.",
      "text40": "Western office: vacant under an eastern commission.",
      "text41": "Western office: restored to Romulus.",
      "text42": "The courts agreed on service after you declined involvement.",
      "text43": "The courts are fighting for Ravenna through an ordinary war.",
      "text44": "Theoderic’s campaign for Ravenna is underway.",
      "text45": "The eastern African reconquest campaign is underway.",
      "text46": "The eastern Italian reconquest campaign is underway.",
      "text47": "The western treasury, appointer, host, or Classis allotment has changed. Review the current situation.",
      "text48": "The civic delegate needs an active contract, protected local courts, and Nicene support or episcopal mediation.",
      "text49": "Classis grant: about {money:income} yearly revenue to the veteran; {money:loss} leaves the western treasury. The veteran holds this one port, not Ravenna county.",
      "text51": "The Western Court, 476",
      "text52": "Spring 476: court, soldiers, and city"
    },
    "news": {
      "message1": {
        "key": "news.476.contest",
        "text": "⚔ The federate host marches on Ravenna. The city and the imperial court remain separate stakes."
      },
      "message2": {
        "key": "news.476.leave_dispute",
        "text": "🏳 Your household leaves the court dispute and remains free to continue its life."
      },
      "message3": {
        "key": "news.476.delegate",
        "text": "📜 The soldiers name you their delegate. You hold no land or civil jurisdiction."
      },
      "message4": {
        "key": "news.476.city_service",
        "text": "🏛 The Ravenna council accepts your service as a clerk; civic jurisdiction remains with the city."
      },
      "message5": {
        "key": "news.476.church_service",
        "text": "☧ You enter the Ravenna congregation’s clerical service. The bishop holds its local commission."
      },
      "message6": {
        "key": "news.476.interfaith",
        "text": "✝ Ravenna’s congregations accept a mediator without changing their faiths or their civic courts."
      },
      "message7": {
        "key": "news.476.city_office",
        "text": "⚖ The court appoints you to Ravenna’s local Peace. The county and its revenue remain separate."
      },
      "message8": {
        "key": "news.476.command",
        "text": "🚩 The federate host accepts your limited command for this service term."
      },
      "message9": {
        "key": "news.476.contract",
        "text": "🪙 Ravenna pays the federate body {money:amount} now and owes four seasonal installments."
      },
      "message10": {
        "key": "news.476.mediation",
        "text": "✝ The bishop supports protected Nicene worship in a federate settlement; he grants no command."
      },
      "message11": {
        "key": "news.476.civic",
        "text": "🏛 Ravenna accepts the bargain while its civic courts keep their jurisdiction."
      },
      "message12": {
        "key": "news.476.court_depart",
        "text": "🏛 The western court departs Ravenna under escort for Ticinum."
      },
      "message13": {
        "key": "news.476.maintenance",
        "text": "🪙 The court pays {money:amount} for its escort at Ticinum."
      },
      "message14": {
        "key": "news.476.ratified",
        "text": "📜 The federate service settlement is ratified. The host keeps its commission, Ravenna its civic courts."
      },
      "message15": {
        "key": "news.476.withdraw",
        "text": "🏳 The host withdraws. Your household remains free and may seek ordinary service."
      },
      "message16": {
        "key": "news.476.civic_rule",
        "text": "🏛 Odoacer accepts Ravenna’s civic courts and Nicene worship under a Roman civic government."
      },
      "message17": {
        "key": "news.476.host_rule",
        "text": "🚩 The federate host keeps its own government. Ravenna’s civic claims remain unsettled."
      },
      "message18": {
        "key": "news.476.nepos_west",
        "text": "📜 Nepos receives a western office claim while his Dalmatian court remains separate."
      },
      "message19": {
        "key": "news.476.office_retired",
        "text": "📜 The host seeks eastern recognition and leaves the western office vacant."
      },
      "message20": {
        "key": "news.476.service_share",
        "text": "🪙 Your household receives {money:amount} from the federate body’s seasonal service pay."
      },
      "message21": {
        "key": "news.476.terms_lapsed",
        "text": "📜 A change of court or service command ends the old terms. The parties must review a new contract."
      },
      "message22": {
        "key": "news.476.review_bargain",
        "text": "🏛 The court route or city consent has changed. The settlement returns for review."
      },
      "message23": {
        "key": "news.476.defeat",
        "text": "🏳 The federate attack fails. Your household survives and can continue in service."
      },
      "message24": {
        "key": "news.476.victory",
        "text": "⚔ The federates take Ravenna. Odoacer is acclaimed; the western office is contested, while the city’s people and property remain."
      }
    },
    "cast": {
      "patronRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "westRulerId"
      },
      "sittingRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "eastRulerId"
      },
      "rival": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "neposId"
      },
      "serviceRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "odoacerId"
      },
      "returningRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "zenoId"
      },
      "commander": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "orestesId"
      },
      "delegate": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "civicDelegateId"
      },
      "bishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "bishopId"
      },
      "recipient": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "veteranId"
      },
      "senator": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "senatorId"
      },
      "minorityBishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "homoianBishopId"
      }
    }
  },
  "curialis_track_476": {
    "id": "curialis_track_476",
    "type": "political_track",
    "requires": [
      "western_court_476"
    ],
    "parameters": {
      "patronRealmId": "italy",
      "issuerRealmId": "byzantium",
      "claimantRealmId": "croatia",
      "serviceRealmId": "federates_476",
      "northernRealmId": "franks_476",
      "siblingRealmId": "burgundy",
      "remnantRealmId": "west_francia",
      "migrantRealmId": "pannonia",
      "southernRealmId": "aghlabids",
      "rivalRealmId": "thracian_goths_476",
      "targetProvinceId": "ravenna",
      "retreatProvinceId": "pavia",
      "senateProvinceId": "roma",
      "issuerProvinceId": "constantinople",
      "claimantProvinceId": "split",
      "civicId": "ravenna_council",
      "senateId": "rome_senate",
      "churchId": "rome_see",
      "minorityChurchId": "ravenna_homoian_see",
      "religiousOfficeId": "rome_bishop",
      "minorityOfficeId": "ravenna_homoian_bishop",
      "patronHostId": "host_476_italy",
      "serviceHostId": "host_476_federates",
      "majorityFaithId": "nicene",
      "minorityFaithId": "homoian",
      "civicCultureId": "roman",
      "successionSource": "dynastic_succession",
      "commissionSource": "imperial_commission",
      "acclamationSource": "army_acclamation",
      "churchSource": "church_support",
      "civicSource": "civic_acceptance",
      "sovereignOfficeId": "imperial_office",
      "judicialOfficeId": "judicial_vicar",
      "commandOfficeId": "field_command",
      "civicGovernmentForm": "roman_civic",
      "civicCareerId": "civic_clerk",
      "churchCareerId": "priest",
      "civicPermission": "civic_agreement",
      "returnStoryId": "zeno_return_476",
      "officeStoryId": "western_office_476",
      "serviceTrackId": "federate_track_476",
      "civicTrackId": "curialis_track_476",
      "migrationStoryId": "theoderic_italy_476",
      "southernStoryId": "eastern_africa_476",
      "reconquestStoryId": "eastern_italy_476",
      "northernStoryId": "clovis_syagrius_476",
      "returningClaimant": "zeno",
      "sittingClaimant": "basiliscus",
      "rivalClaimant": "nepos",
      "retainedResult": "dalmatia",
      "contestWarId": "476_ravenna",
      "serviceDays": 361,
      "immediatePay": 30,
      "seasonalPay": 10,
      "householdShare": 2,
      "paymentPeriods": 4,
      "escortPay": 5,
      "majorityShare": 0.5,
      "registrationFee": 10,
      "prestigeMinimum": 30,
      "pressureTurn": 120,
      "settlementTurn": 90,
      "returnTurn": 180,
      "backedReturnTurn": 150,
      "returnDeadline": 360,
      "officeReviewTurn": 361,
      "settlementIndex": 1,
      "fields": {
        "patronRuler": "westRulerId",
        "sittingRuler": "eastRulerId",
        "rival": "neposId",
        "serviceRuler": "odoacerId",
        "returningRuler": "zenoId",
        "commander": "orestesId",
        "delegate": "civicDelegateId",
        "bishop": "bishopId",
        "recipient": "veteranId",
        "senator": "senatorId",
        "minorityBishop": "homoianBishopId",
        "northernHeir": "clovisId",
        "sibling": "gundobadId",
        "juniorSibling": "godegiselId",
        "remnantRuler": "syagriusId",
        "migrantRuler": "theodericId",
        "northernRuler": "childericId",
        "displacedCourt": "zenoCourt",
        "patronOffice": "westOfficeId",
        "issuerOffice": "eastOfficeId",
        "serviceAcclamation": "odoacerAcclamationId",
        "deposed": "romulusDeposed"
      }
    },
    "profile": "civic_mandate",
    "courtStoryId": "western_court_476",
    "stages": {
      "opening": {
        "name": "Ravenna needs civic service",
        "choices": [
          "serve_council",
          "keep_household"
        ]
      },
      "complete": {
        "name": "The civic household continues",
        "choices": []
      }
    },
    "choices": {
      "serve_council": {
        "id": "serve_council",
        "operation": "serve_council",
        "label": "Accept the civic mandate",
        "detail": "Register the mandate, fund station recognition and receive Ravenna’s local judicial appointment. A living western court, delegate and bishop and a Nicene majority are required."
      },
      "keep_household": {
        "id": "keep_household",
        "operation": "keep_household",
        "label": "Keep the household outside the dispute",
        "detail": "Continue in curial work without payment, promotion or an appointment. Your family remains playable."
      }
    },
    "text": {
      "text1": "A civic household, 476",
      "text2": "Council service can raise personal standing. The court’s mandate supplies local Peace; it leaves land, revenue and host command separate.",
      "text3": "Ravenna needs civic service",
      "text4": "The civic household continues",
      "text5": "Your local judicial mandate is effective.",
      "text6": "The former mandate has lapsed; standing grants no judicial power by itself.",
      "text7": "Registration and recognition: {money:amount}, {prestige} prestige and {piety} piety. The mandate grants local Peace and the next station, with no county, revenue or host command.",
      "text8": "An adult curialis at Ravenna needs an available judicial mandate, a living court, civic delegate and bishop, Nicene support, {money:amount} and {prestige} prestige before payment."
    },
    "news": {
      "message1": {
        "key": "news.476.curial_mandate",
        "text": "🏛 Your civic household accepts Ravenna’s local judicial mandate. Land and revenue stay with their existing holders."
      }
    },
    "cast": {
      "patronRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "westRulerId"
      },
      "sittingRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "eastRulerId"
      },
      "rival": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "neposId"
      },
      "serviceRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "odoacerId"
      },
      "returningRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "zenoId"
      },
      "commander": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "orestesId"
      },
      "delegate": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "civicDelegateId"
      },
      "bishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "bishopId"
      },
      "recipient": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "veteranId"
      },
      "senator": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "senatorId"
      },
      "minorityBishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "homoianBishopId"
      }
    }
  },
  "nepos_track_476": {
    "id": "nepos_track_476",
    "type": "political_track",
    "requires": [
      "western_court_476",
      "western_office_476"
    ],
    "parameters": {
      "patronRealmId": "italy",
      "issuerRealmId": "byzantium",
      "claimantRealmId": "croatia",
      "serviceRealmId": "federates_476",
      "northernRealmId": "franks_476",
      "siblingRealmId": "burgundy",
      "remnantRealmId": "west_francia",
      "migrantRealmId": "pannonia",
      "southernRealmId": "aghlabids",
      "rivalRealmId": "thracian_goths_476",
      "targetProvinceId": "ravenna",
      "retreatProvinceId": "pavia",
      "senateProvinceId": "roma",
      "issuerProvinceId": "constantinople",
      "claimantProvinceId": "split",
      "civicId": "ravenna_council",
      "senateId": "rome_senate",
      "churchId": "rome_see",
      "minorityChurchId": "ravenna_homoian_see",
      "religiousOfficeId": "rome_bishop",
      "minorityOfficeId": "ravenna_homoian_bishop",
      "patronHostId": "host_476_italy",
      "serviceHostId": "host_476_federates",
      "majorityFaithId": "nicene",
      "minorityFaithId": "homoian",
      "civicCultureId": "roman",
      "successionSource": "dynastic_succession",
      "commissionSource": "imperial_commission",
      "acclamationSource": "army_acclamation",
      "churchSource": "church_support",
      "civicSource": "civic_acceptance",
      "sovereignOfficeId": "imperial_office",
      "judicialOfficeId": "judicial_vicar",
      "commandOfficeId": "field_command",
      "civicGovernmentForm": "roman_civic",
      "civicCareerId": "civic_clerk",
      "churchCareerId": "priest",
      "civicPermission": "civic_agreement",
      "returnStoryId": "zeno_return_476",
      "officeStoryId": "western_office_476",
      "serviceTrackId": "federate_track_476",
      "civicTrackId": "curialis_track_476",
      "migrationStoryId": "theoderic_italy_476",
      "southernStoryId": "eastern_africa_476",
      "reconquestStoryId": "eastern_italy_476",
      "northernStoryId": "clovis_syagrius_476",
      "returningClaimant": "zeno",
      "sittingClaimant": "basiliscus",
      "rivalClaimant": "nepos",
      "retainedResult": "dalmatia",
      "contestWarId": "476_ravenna",
      "serviceDays": 361,
      "immediatePay": 30,
      "seasonalPay": 10,
      "householdShare": 2,
      "paymentPeriods": 4,
      "escortPay": 5,
      "majorityShare": 0.5,
      "registrationFee": 10,
      "prestigeMinimum": 30,
      "pressureTurn": 120,
      "settlementTurn": 90,
      "returnTurn": 180,
      "backedReturnTurn": 150,
      "returnDeadline": 360,
      "officeReviewTurn": 361,
      "settlementIndex": 1,
      "fields": {
        "patronRuler": "westRulerId",
        "sittingRuler": "eastRulerId",
        "rival": "neposId",
        "serviceRuler": "odoacerId",
        "returningRuler": "zenoId",
        "commander": "orestesId",
        "delegate": "civicDelegateId",
        "bishop": "bishopId",
        "recipient": "veteranId",
        "senator": "senatorId",
        "minorityBishop": "homoianBishopId",
        "northernHeir": "clovisId",
        "sibling": "gundobadId",
        "juniorSibling": "godegiselId",
        "remnantRuler": "syagriusId",
        "migrantRuler": "theodericId",
        "northernRuler": "childericId",
        "displacedCourt": "zenoCourt",
        "patronOffice": "westOfficeId",
        "issuerOffice": "eastOfficeId",
        "serviceAcclamation": "odoacerAcclamationId",
        "deposed": "romulusDeposed"
      }
    },
    "profile": "claim_restoration",
    "courtStoryId": "western_court_476",
    "stages": {
      "opening": {
        "name": "Dalmatia and a contested office",
        "choices": [
          "seek_recognition",
          "retain_domain"
        ]
      },
      "claim": {
        "name": "Recognition without Italy",
        "choices": [
          "restore_by_campaign",
          "confirm_restoration",
          "seek_recognition_2",
          "retain_domain"
        ]
      },
      "campaign": {
        "name": "Restoration depends on the armies",
        "choices": [
          "confirm_restoration",
          "seek_recognition_2",
          "retain_domain"
        ]
      },
      "complete": {
        "name": "The Dalmatian household continues",
        "choices": []
      },
      "interrupted": {
        "name": "The claimant’s opportunity ended",
        "choices": []
      }
    },
    "choices": {
      "seek_recognition": {
        "id": "seek_recognition",
        "operation": "seek_recognition",
        "label": "Pursue western recognition",
        "detail": "Seek current eastern recognition and Roman civic support for the western claim. A living eastern ruler and an effective Roman civic delegate are required. No payment or territorial transfer occurs."
      },
      "seek_recognition_2": {
        "id": "seek_recognition",
        "operation": "seek_recognition",
        "label": "Renew western recognition",
        "detail": "If the former mandate has lapsed, seek recognition from the current eastern court and the Roman civic delegate. This creates no territorial award and costs no payment."
      },
      "confirm_restoration": {
        "id": "confirm_restoration",
        "operation": "confirm_restoration",
        "label": "Confirm the restored western mandate",
        "detail": "Requires actual possession of Ravenna and living recognition. Creates an imperial appointment in your own court, with no additional land or fiscal power."
      },
      "restore_by_campaign": {
        "id": "restore_by_campaign",
        "operation": "restore_by_campaign",
        "label": "Campaign for Ravenna",
        "detail": "Declare an ordinary war against Ravenna’s actual owner. Your armies must win the objective; military costs and risks follow the normal campaign rules."
      },
      "retain_domain": {
        "id": "keep_dalmatia",
        "operation": "retain_domain",
        "label": "Continue ruling Dalmatia",
        "detail": "Finish this opening without payment, a campaign or a new office. Existing claims and territory remain subject to ordinary rules."
      }
    },
    "text": {
      "text1": "Nepos’s western claim",
      "text2": "Review a living claim, then decide whether to pursue Ravenna through ordinary war. Eastern recognition and Roman civic support create no territorial award.",
      "text3": "Dalmatia and a contested office",
      "text4": "Recognition without Italy",
      "text5": "Restoration depends on the armies",
      "text6": "The Dalmatian household continues",
      "text7": "The claimant’s opportunity ended",
      "text8": "Western mandate restored",
      "text9": "Review Offices & Legitimacy for current issuers and effective mandates.",
      "text10": "The original living claimant needs the current eastern ruler and Roman civic delegate for recognition. Restoration also requires actual possession of Ravenna; a campaign requires peaceful courts."
    },
    "news": {
      "message1": {
        "key": "news.476.nepos_player_claim",
        "text": "📜 Nepos pursues the western claim with eastern recognition and Roman civic support. Dalmatia and Italy remain separate."
      },
      "message2": {
        "key": "news.476.nepos_player_restored",
        "text": "🏛 Nepos confirms a restored western mandate after actually securing Ravenna. The office itself grants no additional land."
      }
    },
    "cast": {
      "patronRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "westRulerId"
      },
      "sittingRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "eastRulerId"
      },
      "rival": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "neposId"
      },
      "serviceRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "odoacerId"
      },
      "returningRuler": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "zenoId"
      },
      "commander": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "orestesId"
      },
      "delegate": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "civicDelegateId"
      },
      "bishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "bishopId"
      },
      "recipient": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "veteranId"
      },
      "senator": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "senatorId"
      },
      "minorityBishop": {
        "kind": "story",
        "storyId": "western_court_476",
        "field": "homoianBishopId"
      }
    }
  }
};
