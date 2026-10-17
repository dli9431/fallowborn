/* Optional goals and named people for existing openings. These declarations
   observe campaign facts and grant no additional rewards or access. */
FBDATA.openingProfiles = {
  "opening_peroz_476": {
    "id": "opening_peroz_476",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "peroz_476",
      "peroz_sasanian_476"
    ],
    "goals": [
      {
        "id": "court_accounts_476",
        "name": "Settle the court receipts",
        "text": "Receive a positive ordinary public receipt, assessed under the current provincial limits.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "sasanian_476"
        },
        "office": true
      },
      {
        "id": "court_service_476",
        "name": "Review provincial burdens",
        "text": "Complete a funded provincial negotiation through its ordinary consent and treasury checks.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_provincial_bargain",
          "realmId": "sasanian_476"
        },
        "office": true
      },
      {
        "id": "royal_choice_476",
        "name": "Record a royal recognition decision",
        "text": "Commit an ordinary recognition decision for an eligible royal candidate. This neither installs a successor nor excludes other candidates.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_royal_choice",
          "realmId": "sasanian_476"
        },
        "office": true
      }
    ],
    "contacts": [
      {
        "id": "balash_link",
        "label": "Royal kin",
        "text": "This existing royal relative can be consulted through the ordinary kin and court interfaces. No succession pledge is supplied.",
        "linkKind": "kin",
        "required": true,
        "person": {
          "source": "royal_member",
          "realmId": "sasanian_476",
          "memberId": "balash"
        }
      }
    ],
    "officeRealmId": "sasanian_476"
  },
  "opening_nepos_476": {
    "id": "opening_nepos_476",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "nepos_476"
    ],
    "goals": [
      {
        "id": "dalmatian_accounts_476",
        "name": "Settle Dalmatian receipts",
        "text": "Receive an ordinary public payment from the domain actually held.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "croatia"
        },
        "office": true
      },
      {
        "id": "dalmatian_defence_476",
        "name": "Meet a host payment",
        "text": "Fund an actual host expense from an available purse through the ordinary military account.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_host_payment",
          "realmId": "croatia"
        },
        "office": true
      },
      {
        "id": "western_course_476",
        "name": "Choose a western course",
        "text": "Commit a recognition, restoration or retained-Dalmatian decision on the personal track. Reviewing it is insufficient.",
        "criterion": {
          "kind": "story_choice",
          "storyId": "nepos_track_476",
          "choiceIds": [
            "seek_recognition",
            "confirm_restoration",
            "restore_by_campaign",
            "keep_dalmatia"
          ]
        },
        "office": true
      }
    ],
    "contacts": [
      {
        "id": "zeno_link",
        "label": "Named eastern claimant",
        "text": "This is the same displaced claimant through any later restoration. An audience and recognition remain separate.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "story",
          "storyId": "western_court_476",
          "field": "zenoId"
        }
      }
    ],
    "requires": [
      "western_court_476",
      "nepos_track_476"
    ],
    "officeRealmId": "croatia"
  },
  "opening_odoacer_476": {
    "id": "opening_odoacer_476",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "odoacer_476"
    ],
    "goals": [
      {
        "id": "host_course_476",
        "name": "Choose the host?s course",
        "text": "Commit paid service, independent command or the existing military contest through the western court.",
        "criterion": {
          "kind": "story_choice",
          "storyId": "western_court_476",
          "choiceIds": [
            "accept_service",
            "contest_ravenna",
            "keep_host"
          ]
        },
        "office": true
      },
      {
        "id": "host_payroll_476",
        "name": "Meet a host payment",
        "text": "Pay an actual host expense with sufficient available funds. This adds no second wage.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_host_payment",
          "realmId": "federates_476"
        },
        "office": true
      },
      {
        "id": "italian_status_476",
        "name": "Resolve the civic arrangement",
        "text": "Commit the existing civic-government offer or retain host government after actual possession permits that choice.",
        "criterion": {
          "kind": "story_choice",
          "storyId": "western_court_476",
          "choiceIds": [
            "accept_civic_rule",
            "retain_host_rule"
          ]
        },
        "office": true
      }
    ],
    "contacts": [
      {
        "id": "orestes_link",
        "label": "Military authority",
        "text": "This named authority may be adverse. Knowing his identity grants no friendship, audience or command.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "opening_actor",
          "actorId": "orestes"
        }
      }
    ],
    "requires": [
      "western_court_476"
    ],
    "officeRealmId": "federates_476"
  },
  "opening_syagrius_476": {
    "id": "opening_syagrius_476",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "syagrius_476"
    ],
    "goals": [
      {
        "id": "gallic_accounts_476",
        "name": "Settle Gallic receipts",
        "text": "Receive an ordinary positive public receipt from the surviving domain.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "west_francia"
        },
        "office": true
      },
      {
        "id": "gallic_defence_476",
        "name": "Meet a host payment",
        "text": "Fund an actual host expense through the ordinary military account.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_host_payment",
          "realmId": "west_francia"
        },
        "office": true
      },
      {
        "id": "northern_course_476",
        "name": "Resolve a northern approach",
        "text": "Conclude a new ordinary peace pact with the actual Frankish court, or commit a decision if the existing Frankish challenge opens.",
        "criterion": {
          "kind": "any",
          "conditions": [
            {
              "kind": "pact",
              "realmId": "franks_476"
            },
            {
              "kind": "story_choice",
              "storyId": "clovis_syagrius_476",
              "choiceIds": [
                "face_campaign",
                "leave_campaign"
              ]
            }
          ]
        },
        "office": true
      }
    ],
    "contacts": [
      {
        "id": "childeric_link",
        "label": "Neighboring ruler",
        "text": "This personal link stays with the opening ruler. A court-directed peace pact follows the current court independently.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "franks_476"
        }
      }
    ],
    "requires": [
      "clovis_syagrius_476"
    ],
    "officeRealmId": "west_francia"
  },
  "opening_federate_476": {
    "id": "opening_federate_476",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "federate_476"
    ],
    "goals": [
      {
        "id": "earned_service_476",
        "name": "Receive funded service pay",
        "text": "Receive an actual due household installment through the personal service contract.",
        "criterion": {
          "kind": "service_payment",
          "storyId": "federate_track_476"
        }
      },
      {
        "id": "free_reserve_476",
        "name": "Keep a free household reserve",
        "text": "Hold 40 private gold while remaining lawfully free.",
        "criterion": {
          "kind": "reserve",
          "amount": 40
        }
      },
      {
        "id": "service_course_476",
        "name": "Resolve the service offer",
        "text": "Commit a personal service decision, including an ordinary refusal or withdrawal.",
        "criterion": {
          "kind": "story_choice",
          "storyId": "federate_track_476",
          "choiceIds": [
            "accept_delegate",
            "remain_service",
            "refuse_involvement",
            "leave_dispute"
          ]
        }
      }
    ],
    "contacts": [
      {
        "id": "odoacer_link",
        "label": "Host commander",
        "text": "A named commander, whose actual location and ordinary access still apply. No office or audience is granted.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "federates_476"
        }
      }
    ],
    "requires": [
      "federate_track_476"
    ],
    "provinceIds": [
      "ravenna"
    ]
  },
  "opening_curialis_476": {
    "id": "opening_curialis_476",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "curialis_476"
    ],
    "goals": [
      {
        "id": "civic_course_476",
        "name": "Resolve the council offer",
        "text": "Accept the actual civic mandate or commit the choice to keep the household independent.",
        "criterion": {
          "kind": "story_choice",
          "storyId": "curialis_track_476",
          "choiceIds": [
            "serve_council",
            "keep_household"
          ]
        }
      },
      {
        "id": "civic_mandate_476",
        "name": "Obtain a civic mandate",
        "text": "Complete the lawful consent and appointment route. Refusal leaves this optional aim unfinished.",
        "criterion": {
          "kind": "civic_mandate",
          "storyId": "curialis_track_476"
        }
      },
      {
        "id": "civic_reserve_476",
        "name": "Keep a private reserve",
        "text": "Hold 100 private gold. Public receipts do not become household property.",
        "criterion": {
          "kind": "reserve",
          "amount": 100
        }
      }
    ],
    "contacts": [
      {
        "id": "orestes_link",
        "label": "Named court authority",
        "text": "The opening military authority is a person to approach through ordinary channels, without a military appointment or friendship.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "opening_actor",
          "actorId": "orestes"
        }
      }
    ],
    "requires": [
      "curialis_track_476"
    ],
    "provinceIds": [
      "ravenna"
    ]
  },
  "opening_pontic_476": {
    "id": "opening_pontic_476",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "mobile_household_476"
    ],
    "goals": [
      {
        "id": "pontic_livelihood_476",
        "name": "Complete a paid camp service",
        "text": "Commit an eligible paid work choice at the actual living camp. The canonical treasury and food costs still apply.",
        "criterion": {
          "kind": "story_choice",
          "storyId": "pontic_household_track_476",
          "choiceIds": [
            "work",
            "another_service"
          ]
        }
      },
      {
        "id": "pontic_reserve_476",
        "name": "Keep a household reserve",
        "text": "Hold 40 private gold.",
        "criterion": {
          "kind": "reserve",
          "amount": 40
        }
      },
      {
        "id": "pontic_home_476",
        "name": "Conclude the home decision",
        "text": "Complete the stationary-farm conclusion or actually return home after the personal journey. Camp membership alone is insufficient.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "pontic_household_track_476",
          "phases": [
            "rooted_household",
            "returned_household"
          ]
        }
      }
    ],
    "contacts": [
      {
        "id": "basiliscus_link",
        "label": "Imperial authority",
        "text": "A remote named court authority, separate from the following?s local employer. No local meeting is asserted.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "byzantium"
        }
      }
    ],
    "requires": [
      "pontic_household_track_476"
    ],
    "provinceIds": [
      "cherson"
    ]
  },
  "opening_toledo_711": {
    "id": "opening_toledo_711",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "toledo_household_711"
    ],
    "goals": [
      {
        "id": "toledo_livelihood_711",
        "name": "Earn an ordinary livelihood",
        "text": "Receive 15 gold from actual ordinary craft work after the opening. Loans, gifts, opening stock and public money do not count.",
        "criterion": {
          "kind": "earnings",
          "amount": 15,
          "focusIds": [
            "craft_work"
          ]
        }
      },
      {
        "id": "toledo_reserve_711",
        "name": "Keep a household reserve",
        "text": "Hold 30 private gold.",
        "criterion": {
          "kind": "reserve",
          "amount": 30
        }
      },
      {
        "id": "toledo_home_711",
        "name": "Complete the household course",
        "text": "Finish the chosen local-life or actual permanent-settlement conclusion. Changing faith earns no additional recognition.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "toledo_household_track_711",
          "phases": [
            "stayed",
            "converted_self",
            "converted_household",
            "settled"
          ]
        }
      }
    ],
    "contacts": [
      {
        "id": "roderic_link",
        "label": "Named royal authority",
        "text": "An identified court target. The king?s actual whereabouts, survival and ordinary audience rules remain authoritative.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "visigoths_711"
        }
      }
    ],
    "requires": [
      "toledo_household_track_711"
    ],
    "provinceIds": [
      "toledo"
    ]
  },
  "opening_aachen_800": {
    "id": "opening_aachen_800",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "aachen_household_800"
    ],
    "goals": [
      {
        "id": "aachen_livelihood_800",
        "name": "Complete paid work",
        "text": "Finish the funded palace delivery or receive 20 gold of actual ordinary farm work after the opening.",
        "criterion": {
          "kind": "any",
          "conditions": [
            {
              "kind": "job_complete",
              "storyId": "aachen_household_track_800",
              "jobId": "palace_delivery"
            },
            {
              "kind": "earnings",
              "amount": 20,
              "focusIds": [
                "toil",
                "work_land"
              ]
            }
          ]
        }
      },
      {
        "id": "aachen_reserve_800",
        "name": "Keep a household reserve",
        "text": "Hold 40 private gold.",
        "criterion": {
          "kind": "reserve",
          "amount": 40
        }
      },
      {
        "id": "aachen_petition_800",
        "name": "Resolve the disputed fee",
        "text": "Complete the actual local hearing, accept the ordinary settlement or waive the disputed balance. No royal audience is promised.",
        "criterion": {
          "kind": "story_choice",
          "storyId": "aachen_household_track_800",
          "choiceIds": [
            "take_settlement",
            "seek_hearing",
            "abandon_balance"
          ]
        }
      }
    ],
    "contacts": [
      {
        "id": "charlemagne_link",
        "label": "Named royal authority",
        "text": "Approach the court through ordinary channels. This link asserts no personal meeting at Aachen.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "carolingian_800"
        }
      }
    ],
    "requires": [
      "aachen_household_track_800"
    ],
    "provinceIds": [
      "aachen"
    ]
  },
  "opening_constantinople_1204": {
    "id": "opening_constantinople_1204",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "constantinople_household_1204"
    ],
    "goals": [
      {
        "id": "city_livelihood_1204",
        "name": "Earn an ordinary craft livelihood",
        "text": "Receive 15 gold of actual ordinary craft earnings after the opening. Gifts, loans, booty and opening stock do not count.",
        "criterion": {
          "kind": "earnings",
          "amount": 15,
          "focusIds": [
            "craft_work"
          ]
        }
      },
      {
        "id": "city_reserve_1204",
        "name": "Keep a household reserve",
        "text": "Hold 30 private gold.",
        "criterion": {
          "kind": "reserve",
          "amount": 30
        }
      },
      {
        "id": "city_home_1204",
        "name": "Complete the household course",
        "text": "Finish the stay, actual-work service or ordinary permanent-emigration conclusion. Service does not require conversion.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "constantinople_household_track_1204",
          "phases": [
            "stayed",
            "served",
            "resettled"
          ]
        }
      }
    ],
    "contacts": [
      {
        "id": "baldwin_link",
        "label": "Current opening authority",
        "text": "A named incumbent to approach through ordinary channels. No loyalty, conversion, property grant or citizenship follows.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "latin_1204"
        }
      }
    ],
    "requires": [
      "constantinople_household_track_1204"
    ],
    "provinceIds": [
      "constantinople"
    ]
  },
  "opening_muhammad_1204": {
    "id": "opening_muhammad_1204",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "muhammad_1204"
    ],
    "goals": [
      {
        "id": "khwarazm_accounts_1204",
        "name": "Settle ordinary court receipts",
        "text": "Receive a positive ordinary public receipt in the court actually adopted.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "khwarazm_1204"
        },
        "office": true
      },
      {
        "id": "suzerain_course_1204",
        "name": "Resolve the superior obligation",
        "text": "An actual tribute installment or concluded renegotiation needs a canonical obligation receipt.",
        "criterion": {
          "kind": "hold",
          "reason": "No recorded tribute or renegotiation transaction is available for this opening relationship. A policy priority cannot settle it."
        },
        "office": true
      },
      {
        "id": "eastern_diplomacy_1204",
        "name": "Conclude an ordinary peace approach",
        "text": "Conclude a new ordinary peace pact with the living Ghurid court. A preview or unrecorded refusal is insufficient.",
        "criterion": {
          "kind": "pact",
          "realmId": "ghurid_1204"
        },
        "office": true
      }
    ],
    "contacts": [
      {
        "id": "ghurid_link",
        "label": "Named foreign ruler",
        "text": "This possibly adverse personal target stays with the opening ruler. Court-directed diplomacy may address an actual successor separately.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "ghurid_1204"
        }
      }
    ],
    "officeRealmId": "khwarazm_1204"
  },
  "opening_siwa_1204": {
    "id": "opening_siwa_1204",
    "type": "opening_profile",
    "title": "Opening goals and people",
    "intro": "These optional goals belong to this life. They grant no extra payment or reward. Named people retain their ordinary access rules.",
    "scenarioIds": [
      "siwa_delegate_1204"
    ],
    "goals": [
      {
        "id": "oasis_accounts_1204",
        "name": "Settle a public receipt",
        "text": "Receive an actual ordinary assessed public receipt within the constituency?s existing limits.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "siwa_households_1204"
        },
        "office": true
      },
      {
        "id": "oasis_consent_1204",
        "name": "Resolve a reserved proposal",
        "text": "Complete an ordinary constituent-consent decision. A recorded approval or refusal resolves this aim without a second charge.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_consent",
          "realmId": "siwa_households_1204"
        },
        "office": true
      },
      {
        "id": "oasis_reserve_1204",
        "name": "Contribute to the public reserve",
        "text": "A private contribution must use an existing permitted transfer and preserve the institution?s reserve.",
        "criterion": {
          "kind": "hold",
          "reason": "No ordinary private-to-institution reserve contribution is available. Public funds cannot be relabeled as your donation."
        },
        "office": true
      }
    ],
    "contacts": [
      {
        "id": "al_adil_link",
        "label": "Remote contemporary ruler",
        "text": "A named court target with ordinary access. This supplies no Siwa overlord, local official, garrison or treaty.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "ayyubid_1204"
        }
      }
    ],
    "officeRealmId": "siwa_households_1204"
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.openingProfiles).forEach(function (id) {
    var profile = FBDATA.openingProfiles[id];
    if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
    FBDATA.storyInstances[id] = profile;
    FBDATA.startScenarios.forEach(function (scenario) {
      if (profile.scenarioIds.indexOf(scenario.id) < 0) return;
      scenario.tracks = (scenario.tracks || []).concat([id]);
      if (profile.provinceIds) {
        scenario.trackLocations = Object.assign({}, scenario.trackLocations);
        scenario.trackLocations[id] = profile.provinceIds.slice();
      }
    });
  });
})();
