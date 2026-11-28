FB.bookmarkSources.stage({"source":"data/story_courts_476.js","bookmarks":["476"],"catalogs":[],"shared":[]}, function (FBDATA) {
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
      "text2": "Your court rules Ravenna in Roman civic form for as long as the council’s agreement holds. Through City dealings, the bishop must first mediate and the council ratify terms protecting its courts, order and Nicene worship.",
      "text3": "Keep the host’s own government",
      "text4": "The host keeps its federate government, and Ravenna’s civic demands stay open.",
      "text5": "Take the western court’s pay",
      "text6": "The host serves the western court for {money:pay} a season for a year and claims {money:arrears} in back pay. The western court must agree.",
      "text7": "Fight the western court for Ravenna",
      "text8": "Declare war on the western court for Ravenna. Your host must take the city.",
      "text9": "Keep the host out of the quarrel",
      "text10": "The host takes no pay and makes no war over Ravenna, and this offer closes.",
      "text12": "The federate ruler and Ravenna",
      "text13": "Odoacer’s soldiers want land or pay. Take service with the western court, fight it for Ravenna, or keep the host out of the quarrel.",
      "text14": "Odoacer no longer leads the host",
      "text15": "Odoacer died or lost the host before deciding. Wars and contracts he already made still stand.",
      "text16": "Ravenna’s government is settled",
      "text17": "The host is at war with the western court for Ravenna",
      "text18": "The host serves the western court for pay",
      "text19": "The host holds Ravenna; the city awaits terms",
      "text20": "The host goes on without a bargain at Ravenna",
      "text21": "The host’s pay is in arrears at Ravenna",
      "text22": "Not possible now: the host, the western court or Ravenna’s council has changed."
    },
    "choices": {
      "accept_civic_rule": {
        "id": "accept_civic_rule",
        "operation": "accept_civic_rule",
        "label": "Accept Ravenna’s civic settlement",
        "detail": "Your court rules Ravenna in Roman civic form for as long as the council’s agreement holds. Through City dealings, the bishop must first mediate and the council ratify terms protecting its courts, order and Nicene worship."
      },
      "retain_host_rule": {
        "id": "retain_host_rule",
        "operation": "retain_host_rule",
        "label": "Keep the host’s own government",
        "detail": "The host keeps its federate government, and Ravenna’s civic demands stay open."
      },
      "accept_service": {
        "id": "accept_service",
        "operation": "accept_service",
        "label": "Take the western court’s pay",
        "detail": "The host serves the western court for {money:pay} a season for a year and claims {money:arrears} in back pay. The western court must agree.",
        "detailParams": {
          "pay": 10,
          "arrears": 30
        }
      },
      "contest_ravenna": {
        "id": "contest_ravenna",
        "operation": "contest_capital",
        "label": "Fight the western court for Ravenna",
        "detail": "Declare war on the western court for Ravenna. Your host must take the city."
      },
      "keep_host": {
        "id": "keep_host",
        "operation": "keep_host",
        "label": "Keep the host out of the quarrel",
        "detail": "The host takes no pay and makes no war over Ravenna, and this offer closes."
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
      "text3": "Zeno has fled to Isauria while Basiliscus rules in Constantinople. Within the year, if his generals Illus and Trocundes still live, they can desert Basiliscus and bring Zeno home, once the eastern court holds the city and is at peace.",
      "text4": "Zeno is back in Constantinople",
      "text5": "Zeno’s return fell through",
      "text6": "Zeno stays in exile",
      "text7": "Zeno waits in Isauria"
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
      "text3": "Romulus holds the western imperial office at Ravenna, while Nepos still claims it from Dalmatia. Whoever loses Ravenna loses the office, and a court that wins the city back can restore it.",
      "text4": "The western emperor has lost Ravenna",
      "text5": "Romulus keeps the western office",
      "text6": "The western office is restored at Ravenna",
      "text7": "Nepos claims the western office from Dalmatia",
      "text8": "The western office stands vacant",
      "text9": "The western mandate has lapsed",
      "text10": "A new ruler leads the western court",
      "text11": "Romulus holds a contested western office"
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
        "name": "Soldiers seek a spokesman",
        "mechanic": "delegate"
      },
      "civic_service": {
        "choices": [
          "petition_city_office",
          "leave_city_service",
          "leave_dispute"
        ],
        "name": "You serve the Ravenna council",
        "mechanic": "civic_service"
      },
      "church_service": {
        "choices": [
          "seek_minority_commission",
          "mediate_communities",
          "leave_church_service",
          "leave_dispute"
        ],
        "name": "You serve the Homoian congregation at Ravenna",
        "mechanic": "church_service"
      },
      "commission": {
        "choices": [
          "seek_commission",
          "back_commander",
          "keep_serving",
          "leave_dispute"
        ],
        "name": "The host needs a commander",
        "mechanic": "commission"
      },
      "contract": {
        "choices": [
          "offer_pay",
          "refuse_pay",
          "leave_dispute"
        ],
        "name": "The soldiers demand their back pay",
        "mechanic": "contract"
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
        "name": "Ravenna weighs the host’s bargain",
        "mechanic": "civic"
      },
      "recognition": {
        "choices": [
          "petition_sitting_ruler",
          "back_returning_claimant",
          "back_rival_claimant",
          "forgo_recognition",
          "leave_dispute"
        ],
        "name": "The host seeks an emperor’s recognition",
        "mechanic": "recognition"
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
        "name": "The western court moves to Ticinum",
        "mechanic": "court"
      },
      "resolution": {
        "choices": [
          "ratify",
          "reject_ratification",
          "leave_dispute"
        ],
        "name": "The terms are ready for ratification",
        "mechanic": "resolution"
      },
      "battle": {
        "choices": [
          "withdraw"
        ],
        "name": "The host marches on Ravenna",
        "mechanic": "battle"
      },
      "aftermath": {
        "choices": [
          "accept_aftermath"
        ],
        "name": "The fight for Ravenna is over",
        "mechanic": "aftermath"
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
        "name": "The Ravenna dispute is settled",
        "mechanic": "complete"
      }
    },
    "choices": {
      "leave_dispute": {
        "id": "leave_dispute",
        "operation": "leave_dispute",
        "label": "Leave the court dispute",
        "detail": "Your household steps out of the quarrel over Ravenna and keeps its career. Contracts and offices you hold keep their own terms."
      },
      "accept_delegate": {
        "id": "accept_delegate",
        "operation": "accept_delegate",
        "label": "Serve as the soldiers’ delegate",
        "detail": "You speak for the soldiers in the quarrel over their pay, without command of the host."
      },
      "remain_service": {
        "id": "remain_service",
        "operation": "remain_service",
        "label": "Stay in the ranks",
        "detail": "Your household stays free, and you go on to the quarrel over who commands the host."
      },
      "refuse_involvement": {
        "id": "refuse_involvement",
        "operation": "refuse_involvement",
        "label": "Stay out of the quarrel",
        "detail": "Your household leaves the dispute and goes on with its work and family."
      },
      "seek_city_service": {
        "id": "seek_city_service",
        "operation": "seek_city_service",
        "label": "Serve the Ravenna council",
        "detail": "You become a clerk to Ravenna’s council. A later appointment from the western court can give you the city’s local Peace."
      },
      "seek_church_service": {
        "id": "seek_church_service",
        "operation": "seek_church_service",
        "label": "Serve the Homoian congregation",
        "detail": "You begin as a clerk in Ravenna’s Homoian congregation. Mediating with the Nicene bishop can open civic service."
      },
      "petition_city_office": {
        "id": "petition_city_office",
        "operation": "petition_city_office",
        "label": "Petition for Ravenna’s local court",
        "detail": "The western court appoints you to Ravenna’s local Peace; a new ruler may have to confirm it. It needs a living civic delegate, a Nicene majority and the western court holding Ravenna."
      },
      "leave_city_service": {
        "id": "leave_city_service",
        "operation": "leave_city_service",
        "label": "Stay a clerk of the council",
        "detail": "You keep your civic career without a court office."
      },
      "mediate_communities": {
        "id": "mediate_communities",
        "operation": "mediate_communities",
        "label": "Mediate with the Nicene bishop",
        "detail": "The Nicene bishop accepts you as mediator, and you can then petition the city court. Both bishops must be alive, and you need the Homoian commission."
      },
      "leave_church_service": {
        "id": "leave_church_service",
        "operation": "leave_church_service",
        "label": "Stay in the congregation",
        "detail": "You keep your clerical career without a civic office."
      },
      "seek_commission": {
        "id": "seek_commission",
        "operation": "seek_commission",
        "label": "Seek command of the host",
        "detail": "Your fellow soldiers acclaim you, and Odoacer appoints you to command this host for 360 days, with no land or taxes."
      },
      "keep_serving": {
        "id": "keep_serving",
        "operation": "keep_serving",
        "label": "Keep serving without a command",
        "detail": "You go on to the quarrel over pay as a free soldier."
      },
      "offer_pay": {
        "id": "offer_pay",
        "operation": "offer_pay",
        "label": "Offer the western court a year’s service",
        "detail": "The western court pays the host {money:immediate} now, then {money:seasonal} in each of the next four seasons. Your household’s share is {money:share} of each payment. Classis can be granted to a veteran later, at ratification.",
        "detailParams": {
          "immediate": 30,
          "seasonal": 10,
          "share": 2
        }
      },
      "refuse_pay": {
        "id": "refuse_pay",
        "operation": "refuse_pay",
        "label": "Refuse the western court’s terms",
        "detail": "No money changes hands and no contract is made. You can still revise the civic proposal or fight for Ravenna."
      },
      "seek_mediation": {
        "id": "seek_mediation",
        "operation": "seek_mediation",
        "label": "Seek the bishop’s mediation",
        "detail": "Promise to protect Nicene worship, and the bishop can back the bargain. Neither your household nor the city changes faith."
      },
      "renegotiate_pay": {
        "id": "renegotiate_pay",
        "operation": "renegotiate_pay",
        "label": "Reopen the pay talks",
        "detail": "Take a new pay offer to the western treasury. The back pay is still owed."
      },
      "revise_civic": {
        "id": "revise_civic",
        "operation": "revise_civic",
        "label": "Promise Ravenna its own courts",
        "detail": "Drop the demand for force and guarantee that Ravenna’s civic courts keep their jurisdiction."
      },
      "present_civic": {
        "id": "present_civic",
        "operation": "present_civic",
        "label": "Present the bargain to Ravenna",
        "detail": "Ravenna’s council can accept the bargain for the city, which keeps its own courts. It needs paid service in force, a living civic delegate, a Roman majority, and Nicene standing or the bishop’s mediation."
      },
      "demand_force": {
        "id": "demand_force",
        "operation": "demand_force",
        "label": "March on Ravenna",
        "detail": "The bargain breaks, and the federate host marches on Ravenna to face the western host. Taking the city does not make Ravenna or an emperor recognize you."
      },
      "forgo_recognition": {
        "id": "forgo_recognition",
        "operation": "forgo_recognition",
        "label": "Proceed without imperial recognition",
        "detail": "The contract and the civic bargain can stand while the rival emperors’ claims stay open."
      },
      "escort_court": {
        "id": "escort_court",
        "operation": "escort_court",
        "label": "Escort the court to Ticinum",
        "detail": "The western host takes the court from Ravenna to Ticinum. Moving the court does not change who holds either city."
      },
      "court_maintenance": {
        "id": "court_maintenance",
        "operation": "court_maintenance",
        "label": "Ask the court to pay the escort",
        "detail": "Once the court reaches Ticinum, the western treasury pays the host {money:amount} once for the escort, apart from service pay.",
        "detailParams": {
          "amount": 5
        }
      },
      "move_to_ratification": {
        "id": "move_to_ratification",
        "operation": "move_to_ratification",
        "label": "Put the settlement to ratification",
        "detail": "The court must have reached Ticinum, service pay must be in force and Ravenna’s council must consent."
      },
      "demand_force_29": {
        "id": "demand_force",
        "operation": "demand_force",
        "label": "Break talks and march on Ravenna",
        "detail": "The service contract is broken, and the two hosts fight for Ravenna on the map."
      },
      "ratify": {
        "id": "ratify",
        "operation": "ratify",
        "label": "Ratify the settlement",
        "detail": "The pay, Ravenna’s consent, the court’s arrival and any Classis grant are confirmed. Romulus keeps the western office, and the host keeps only its commissioned command."
      },
      "reject_ratification": {
        "id": "reject_ratification",
        "operation": "reject_ratification",
        "label": "Reject the terms and fight for Ravenna",
        "detail": "The agreement breaks, and the two hosts decide Ravenna. Your household plays on whatever the result."
      },
      "withdraw": {
        "id": "withdraw",
        "operation": "withdraw",
        "label": "Withdraw the federate demand",
        "detail": "The host gives up its demand on Ravenna, and your free household goes on."
      },
      "accept_aftermath": {
        "id": "accept_aftermath",
        "operation": "accept_aftermath",
        "label": "Accept the outcome at Ravenna",
        "detail": "The quarrel over Ravenna ends here. Your household and the city’s people, communities and property go on."
      },
      "adopt_civic_rule": {
        "id": "adopt_civic_rule",
        "operation": "adopt_civic_rule",
        "label": "Recognize Ravenna’s civic courts",
        "detail": "The host takes Roman civic government and confirms Ravenna’s local Peace and consent as customary rights. The city and Nicene church delegates must be alive; no one is made to convert."
      },
      "affirm_host_rule": {
        "id": "affirm_host_rule",
        "operation": "affirm_host_rule",
        "label": "Keep the host’s federate government",
        "detail": "The host keeps its form of rule, and Ravenna’s civic rights stay in dispute; conquest alone does not win the city’s consent."
      },
      "retire_western_office": {
        "id": "retire_western_office",
        "operation": "retire_contested_office",
        "label": "Leave the western office vacant",
        "detail": "Seek an eastern commission for the federate court and leave the western throne empty. No eastern land changes hands."
      },
      "restore_western_office": {
        "id": "restore_western_office",
        "operation": "restore_contested_office",
        "label": "Restore Romulus to the western office",
        "detail": "Romulus takes back the western office. He must be alive, and the western court must hold Ravenna again."
      },
      "back_commander": {
        "id": "back_odoacer",
        "operation": "back_commander",
        "label": "Back Odoacer as commander",
        "detail": "Odoacer takes command of the host. You can still serve as the soldiers’ delegate."
      },
      "petition_sitting_ruler": {
        "id": "petition_basiliscus",
        "operation": "seek_issuer_commission",
        "label": "Petition Basiliscus",
        "detail": "Basiliscus, the sitting eastern {term:emperor}, may recognize the host’s service. If his rule ends, his successor must confirm it."
      },
      "back_returning_claimant": {
        "id": "back_zeno",
        "operation": "back_returning_claimant",
        "label": "Back Zeno in exile",
        "detail": "Zeno cannot commission anyone from exile. If he regains Constantinople alive, he can recognize the host’s service."
      },
      "back_rival_claimant": {
        "id": "uphold_nepos",
        "operation": "back_rival_claimant",
        "label": "Uphold Julius Nepos",
        "detail": "Nepos recognizes the host from Dalmatia, and Romulus stays in office at Ravenna."
      },
      "request_settlement": {
        "id": "request_classis",
        "operation": "request_settlement",
        "label": "Ask for land at Classis",
        "detail": "Ask that a named veteran receive the port of Classis at ratification, when the grant is checked again. Its other landholders and residents stay."
      },
      "seek_minority_commission": {
        "id": "seek_homoian_commission",
        "operation": "seek_minority_commission",
        "label": "Seek the Homoian bishop’s commission",
        "detail": "Ravenna’s Homoian bishop recognizes your service. Your faith and everyone else’s stay as they are."
      },
      "recognize_rival_office": {
        "id": "recognize_nepos_west",
        "operation": "recognize_rival_office",
        "label": "Recognize Nepos for the western office",
        "detail": "The host and the Roman senate back Nepos as western emperor. Nepos must be alive in Dalmatia, and a living senator in Rome must give civic consent."
      }
    },
    "text": {
      "text1": "Soldiers seek a spokesman",
      "text2": "You serve the Ravenna council",
      "text3": "You serve the Homoian congregation at Ravenna",
      "text4": "The host needs a commander",
      "text5": "The soldiers demand their back pay",
      "text6": "Ravenna weighs the host’s bargain",
      "text7": "The host seeks an emperor’s recognition",
      "text8": "The western court moves to Ticinum",
      "text9": "The terms are ready for ratification",
      "text10": "The host marches on Ravenna",
      "text11": "The fight for Ravenna is over",
      "text12": "The Ravenna dispute is settled",
      "text13": "Western court: {location}.",
      "text14": "Ticinum",
      "text15": "displaced",
      "text16": "Ravenna",
      "text17": "Service pay: {status}, {money:amount} a season for 360 days.",
      "text18": "active",
      "text19": "breached",
      "text20": "expired",
      "text21": "offered",
      "text22": "Service pay: none agreed.",
      "text23": "Ravenna’s council consents to the bargain.",
      "text24": "Ravenna’s council has not yet consented.",
      "text25": "You command the federate host until your commission ends.",
      "text26": "The veteran holds the Classis allotment.",
      "text27": "Classis allotment: requested, granted only at ratification.",
      "text28": "An emperor has commissioned the host.",
      "text29": "You back Zeno; he can commission the host once he returns.",
      "text30": "No emperor has commissioned the host.",
      "text31": "The host marches on Ravenna; the battle on the map decides who holds the city.",
      "text32": "Settled by agreement: the western court and Ravenna keep their own powers.",
      "text33": "Your household goes on with its life.",
      "text34": "You keep Ravenna’s local Peace by court appointment.",
      "text35": "Your appointment to Ravenna’s Peace has lapsed and needs a living mandate.",
      "text36": "Ravenna’s civic rights are on record, whoever holds the city.",
      "text37": "The host governs in Roman civic form, with Ravenna’s own courts.",
      "text38": "The host keeps its own government; Ravenna’s claims stay open.",
      "text39": "Nepos claims the western office from Dalmatia.",
      "text40": "The western office is vacant, and the host serves under an eastern commission.",
      "text41": "Romulus is restored to the western office.",
      "text42": "After you stood aside, the western court took the host into paid service.",
      "text43": "The host and the western court are at war over Ravenna.",
      "text44": "Theoderic’s campaign for Ravenna is underway.",
      "text45": "The Eastern Roman Court’s campaign for Carthage is underway.",
      "text46": "The Eastern Roman Court’s campaign for Ravenna is underway.",
      "text47": "The western court can no longer pay, or the host, its appointer or the Classis grant has changed.",
      "text48": "Ravenna’s delegate needs paid service in force, protected city courts, and Nicene support or the bishop’s mediation.",
      "text49": "Classis grant: the veteran gains about {money:income} a year and the western treasury loses {money:loss}. He holds the port alone, not Ravenna.",
      "text51": "The Western Court, 476",
      "text52": "In spring 476 the western court at Ravenna owes its federate soldiers their pay. As one of them, you can speak for the host, serve the city or its church, or stay out of the quarrel."
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
    },
    "initialStage": "delegate",
    "phaseStages": {
      "delegate": "delegate",
      "civic_service": "civic_service",
      "church_service": "church_service",
      "commission": "commission",
      "contract": "contract",
      "civic": "civic",
      "recognition": "recognition",
      "court": "court",
      "resolution": "resolution",
      "battle": "battle",
      "aftermath": "aftermath",
      "complete": "complete"
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
        ],
        "mechanic": "opening"
      },
      "complete": {
        "name": "The civic household continues",
        "choices": [],
        "mechanic": "complete"
      }
    },
    "choices": {
      "serve_council": {
        "id": "serve_council",
        "operation": "serve_council",
        "label": "Accept Ravenna’s judicial mandate",
        "detail": "You pay to register and receive Ravenna’s local judicial appointment, rising to the next station. The western court, civic delegate and bishop must be alive, and most of Ravenna must be Nicene."
      },
      "keep_household": {
        "id": "keep_household",
        "operation": "keep_household",
        "label": "Keep to your curial work",
        "detail": "Your household goes on without payment, promotion or appointment."
      }
    },
    "text": {
      "text1": "A civic household, 476",
      "text2": "Your curial household serves Ravenna’s council while the host and the western court quarrel. The court can make you a judge, keeper of the city’s local Peace.",
      "text3": "Ravenna needs civic service",
      "text4": "The civic household continues",
      "text5": "You keep Ravenna’s local Peace by the court’s mandate.",
      "text6": "Your mandate has lapsed; you no longer judge in Ravenna.",
      "text7": "Cost: {money:amount}, {prestige} prestige and {piety} piety. You become a judge at Ravenna and rise to the next station.",
      "text8": "You must be an adult curialis at Ravenna with {money:amount} and {prestige} prestige, and the court, civic delegate and bishop must be alive with Nicene support."
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
    },
    "initialStage": "opening",
    "phaseStages": {
      "opening": "opening",
      "complete": "complete"
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
        ],
        "mechanic": "opening"
      },
      "claim": {
        "name": "Recognized, but without Italy",
        "choices": [
          "restore_by_campaign",
          "confirm_restoration",
          "seek_recognition_2",
          "retain_domain"
        ],
        "mechanic": "claim"
      },
      "campaign": {
        "name": "Nepos’s armies march for Ravenna",
        "choices": [
          "confirm_restoration",
          "seek_recognition_2",
          "retain_domain"
        ],
        "mechanic": "campaign"
      },
      "complete": {
        "name": "Nepos rules on in Dalmatia",
        "choices": [],
        "mechanic": "complete"
      },
      "interrupted": {
        "name": "Nepos’s claim has lapsed",
        "choices": [],
        "mechanic": "interrupted"
      }
    },
    "choices": {
      "seek_recognition": {
        "id": "seek_recognition",
        "operation": "seek_recognition",
        "label": "Seek recognition of the western claim",
        "detail": "The eastern court and Rome’s civic delegate back your claim to the west, at no cost. The eastern ruler and the delegate must be alive."
      },
      "seek_recognition_2": {
        "id": "seek_recognition",
        "operation": "seek_recognition",
        "label": "Renew recognition of the western claim",
        "detail": "If your recognition has lapsed, ask the eastern court and Rome’s civic delegate again, at no cost."
      },
      "confirm_restoration": {
        "id": "confirm_restoration",
        "operation": "confirm_restoration",
        "label": "Take up the western office at Ravenna",
        "detail": "Your court gains the western imperial office. You must hold Ravenna yourself and still be recognized."
      },
      "restore_by_campaign": {
        "id": "restore_by_campaign",
        "operation": "restore_by_campaign",
        "label": "Declare war for Ravenna",
        "detail": "Declare war on whoever holds Ravenna. Your armies must take the city, at the usual cost and risk of war."
      },
      "retain_domain": {
        "id": "keep_dalmatia",
        "operation": "retain_domain",
        "label": "Continue ruling Dalmatia",
        "detail": "Set the western claim aside and rule Dalmatia. The claims and lands you hold stay as they are."
      }
    },
    "text": {
      "text1": "Nepos’s western claim",
      "text2": "Julius Nepos rules Dalmatia but still claims the western throne Romulus holds at Ravenna. Win the eastern court’s and Rome’s recognition, then take Ravenna to be restored.",
      "text3": "Dalmatia and a contested office",
      "text4": "Recognized, but without Italy",
      "text5": "Nepos’s armies march for Ravenna",
      "text6": "Nepos rules on in Dalmatia",
      "text7": "Nepos’s claim has lapsed",
      "text8": "Nepos is restored as western emperor",
      "text9": "Offices & Legitimacy shows who recognizes your claim.",
      "text10": "Nepos cannot take this step now; see Offices & Legitimacy for who recognizes the claim."
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
    },
    "initialStage": "opening",
    "phaseStages": {
      "opening": "opening",
      "claim": "claim",
      "campaign": "campaign",
      "complete": "complete",
      "interrupted": "interrupted"
    }
  }
};
});
