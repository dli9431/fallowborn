FB.bookmarkSources.stage({"source":"data/start_ambitions.js","bookmarks":["476","493","711","800","867","1066","1204"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Optional goals and named people for existing openings. These declarations
   observe campaign facts and grant no additional rewards or access. */
FBDATA.openingProfiles = {
  "opening_peroz_476": {
    "id": "opening_peroz_476",
    "type": "opening_profile",
    "title": "Peroz’s first goals",
    "intro": "Three optional goals for your reign as King of Kings at Ctesiphon.",
    "scenarioIds": [
      "peroz_476",
      "peroz_sasanian_476"
    ],
    "goals": [
      {
        "id": "court_accounts_476",
        "name": "Collect royal revenue",
        "text": "Receive income or dues into the royal treasury at a season’s end.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "sasanian_476"
        },
        "office": true
      },
      {
        "id": "court_service_476",
        "name": "Bargain with a great house",
        "text": "Agree a new revenue and troop bargain with a great house through Public administration.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_provincial_bargain",
          "realmId": "sasanian_476"
        },
        "office": true
      },
      {
        "id": "royal_choice_476",
        "name": "Back a royal candidate",
        "text": "Declare your support for an eligible royal candidate; the succession stays open.",
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
        "label": "Your brother",
        "text": "Balash, your brother and a possible successor, lives at your court in Ctesiphon.",
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
    "title": "Julius Nepos’s first goals",
    "intro": "Three optional goals for your rule over Dalmatia from Salona.",
    "scenarioIds": [
      "nepos_476"
    ],
    "goals": [
      {
        "id": "dalmatian_accounts_476",
        "name": "Collect Dalmatian revenue",
        "text": "Receive income or dues into your Dalmatian treasury at a season’s end.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "croatia"
        },
        "office": true
      },
      {
        "id": "dalmatian_defence_476",
        "name": "Pay your army",
        "text": "Pay your army’s wages from the treasury in full once.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_host_payment",
          "realmId": "croatia"
        },
        "office": true
      },
      {
        "id": "western_course_476",
        "name": "Settle your western claim",
        "text": "Choose to seek recognition, campaign for Ravenna, confirm a restored mandate or keep ruling Dalmatia.",
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
        "label": "Eastern emperor",
        "text": "Zeno, the eastern emperor who matters to your western claim, is displaced in Isauria as you begin.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "story",
          "storyId": "western_court_476",
          "stateField": "zenoId"
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
    "title": "Odoacer’s first goals",
    "intro": "Three optional goals for you and your federate host, camped near Ticinum.",
    "scenarioIds": [
      "odoacer_476"
    ],
    "goals": [
      {
        "id": "host_course_476",
        "name": "Choose the host’s course",
        "text": "Choose to accept paid service, contest Ravenna or keep the host out of the dispute.",
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
        "name": "Pay the host’s wages",
        "text": "Pay the host’s wages from the treasury once.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_host_payment",
          "realmId": "federates_476"
        },
        "office": true
      },
      {
        "id": "italian_status_476",
        "name": "Settle Ravenna’s government",
        "text": "Once you possess Ravenna, accept its civic settlement or keep the host’s government.",
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
        "label": "Western commander",
        "text": "Orestes commands the western army from Ravenna and may oppose you.",
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
    "title": "Syagrius’s first goals",
    "intro": "Three optional goals for your rule in northern Gaul from Soissons.",
    "scenarioIds": [
      "syagrius_476"
    ],
    "goals": [
      {
        "id": "gallic_accounts_476",
        "name": "Collect Gallic revenue",
        "text": "Receive income or dues into your Gallic treasury at a season’s end.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "west_francia"
        },
        "office": true
      },
      {
        "id": "gallic_defence_476",
        "name": "Pay your army",
        "text": "Pay your army’s wages from the treasury in full once.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_host_payment",
          "realmId": "west_francia"
        },
        "office": true
      },
      {
        "id": "northern_course_476",
        "name": "Make peace with the Franks",
        "text": "Make a new peace pact with the Frankish court.",
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
        "label": "Frankish king",
        "text": "Childeric rules the Salian Franks on your northern border.",
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
    "title": "A federate soldier’s first goals",
    "intro": "Three optional goals for your life as a federate soldier at Ravenna.",
    "scenarioIds": [
      "federate_476"
    ],
    "goals": [
      {
        "id": "earned_service_476",
        "name": "Draw your service pay",
        "text": "Receive a seasonal payment to your household under a service contract with the federate host.",
        "criterion": {
          "kind": "service_payment",
          "storyId": "federate_track_476"
        }
      },
      {
        "id": "free_reserve_476",
        "name": "Keep {money:40} in reserve",
        "text": "Hold {money:40} in your household purse while you remain free.",
        "criterion": {
          "kind": "reserve",
          "amount": 40
        }
      },
      {
        "id": "service_course_476",
        "name": "Answer the service offer",
        "text": "Choose to speak for the soldiers, remain in the ranks or stay out of their dispute.",
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
        "text": "Odoacer commands your federate host, which is camped near Ticinum as you begin.",
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
    "title": "A curialis’s first goals",
    "intro": "Three optional goals for your civic household at Ravenna.",
    "scenarioIds": [
      "curialis_476"
    ],
    "goals": [
      {
        "id": "civic_course_476",
        "name": "Answer the curia’s offer",
        "text": "Accept the civic mandate or choose to keep your household outside the dispute.",
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
        "name": "Win a civic mandate",
        "text": "Accept the mandate with the consent it needs and receive Ravenna’s judicial appointment.",
        "criterion": {
          "kind": "civic_mandate",
          "storyId": "curialis_track_476"
        }
      },
      {
        "id": "civic_reserve_476",
        "name": "Keep {money:100} in reserve",
        "text": "Hold {money:100} in your own household purse.",
        "criterion": {
          "kind": "reserve",
          "amount": 100
        }
      }
    ],
    "contacts": [
      {
        "id": "orestes_link",
        "label": "Western commander",
        "text": "Orestes commands the western army and is the military power over your city, Ravenna.",
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
    "title": "A Cherson household’s first goals",
    "intro": "Three optional goals for your farming household at Cherson.",
    "scenarioIds": [
      "mobile_household_476"
    ],
    "goals": [
      {
        "id": "pontic_livelihood_476",
        "name": "Earn pay at the camp",
        "text": "Take a day of paid service at the Pontic following’s camp.",
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
        "name": "Keep {money:40} in reserve",
        "text": "Hold {money:40} in your household purse.",
        "criterion": {
          "kind": "reserve",
          "amount": 40
        }
      },
      {
        "id": "pontic_home_476",
        "name": "Decide where home is",
        "text": "Finish your household story by putting the farm first or by returning home after a journey.",
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
        "label": "Eastern emperor",
        "text": "Basiliscus is the emperor over Cherson as you begin, ruling far away in Constantinople.",
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
    "title": "A Toledo household’s first goals",
    "intro": "Three optional goals for your craft household in Toledo.",
    "scenarioIds": [
      "toledo_household_711"
    ],
    "goals": [
      {
        "id": "toledo_livelihood_711",
        "name": "Earn {money:15} at your craft",
        "text": "Earn {money:15} from your own craft work after the start.",
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
        "name": "Keep {money:30} in reserve",
        "text": "Hold {money:30} in your household purse.",
        "criterion": {
          "kind": "reserve",
          "amount": 30
        }
      },
      {
        "id": "toledo_home_711",
        "name": "Decide your household’s future",
        "text": "Finish your household story by staying, changing faith or settling elsewhere for good.",
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
        "label": "Gothic king",
        "text": "Roderic is the Gothic king whose royal city, Toledo, is your home.",
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
    "title": "An Aachen household’s first goals",
    "intro": "Three optional goals for your farming household at Aachen.",
    "scenarioIds": [
      "aachen_household_800"
    ],
    "goals": [
      {
        "id": "aachen_livelihood_800",
        "name": "Earn from paid work",
        "text": "Finish the palace delivery or earn {money:20} from work in the fields after the start.",
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
        "name": "Keep {money:40} in reserve",
        "text": "Hold {money:40} in your household purse.",
        "criterion": {
          "kind": "reserve",
          "amount": 40
        }
      },
      {
        "id": "aachen_petition_800",
        "name": "Settle the disputed fee",
        "text": "Take the settlement, seek a local hearing or give up the disputed balance.",
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
        "label": "Your emperor",
        "text": "Charlemagne, whose palace stands in your town of Aachen, is newly crowned at Rome as you begin.",
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
    "title": "An artisan household’s first goals",
    "intro": "Three optional goals for your artisan household in Constantinople.",
    "scenarioIds": [
      "constantinople_household_1204"
    ],
    "goals": [
      {
        "id": "city_livelihood_1204",
        "name": "Earn {money:15} at your craft",
        "text": "Earn {money:15} from your own craft work after the start.",
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
        "name": "Keep {money:30} in reserve",
        "text": "Hold {money:30} in your household purse.",
        "criterion": {
          "kind": "reserve",
          "amount": 30
        }
      },
      {
        "id": "city_home_1204",
        "name": "Decide your household’s future",
        "text": "Finish your household story by staying, securing a paid livelihood or settling elsewhere for good.",
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
        "label": "Latin emperor",
        "text": "Baldwin of Flanders is the Latin emperor who rules your city, Constantinople, as you begin.",
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
  "opening_constantinople_merchant_1204": {
    "id": "opening_constantinople_merchant_1204",
    "type": "opening_profile",
    "title": "A harbor merchant’s first goals",
    "intro": "Three optional goals for your trading household by the harbor of Constantinople.",
    "scenarioIds": [
      "constantinople_merchant_household_1204"
    ],
    "goals": [
      {
        "id": "merchant_livelihood_1204",
        "name": "Earn {money:15} at market",
        "text": "Earn {money:15} from your own market trading after the start.",
        "criterion": {
          "kind": "earnings",
          "amount": 15,
          "focusIds": [
            "market"
          ]
        }
      },
      {
        "id": "merchant_reserve_1204",
        "name": "Keep {money:30} in reserve",
        "text": "Hold {money:30} in your household purse.",
        "criterion": {
          "kind": "reserve",
          "amount": 30
        }
      },
      {
        "id": "merchant_home_1204",
        "name": "Decide your household’s future",
        "text": "Finish your household story by choosing to stay or by moving your household for good.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "constantinople_merchant_track_1204",
          "phases": [
            "stayed",
            "resettled"
          ]
        }
      }
    ],
    "contacts": [
      {
        "id": "baldwin_link",
        "label": "Latin emperor",
        "text": "Baldwin of Flanders is the Latin emperor who rules the harbor city where you trade.",
        "linkKind": "target",
        "required": true,
        "person": {
          "source": "realm_ruler",
          "realmId": "latin_1204"
        }
      }
    ],
    "requires": [
      "constantinople_merchant_track_1204"
    ],
    "provinceIds": [
      "constantinople"
    ]
  },
  "opening_muhammad_1204": {
    "id": "opening_muhammad_1204",
    "type": "opening_profile",
    "title": "Muhammad II’s first goals",
    "intro": "Three optional goals for your court at Gurganj.",
    "scenarioIds": [
      "muhammad_1204"
    ],
    "goals": [
      {
        "id": "khwarazm_accounts_1204",
        "name": "Collect Khwarazm’s revenue",
        "text": "Receive income or dues into your Khwarazmian treasury at a season’s end.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "khwarazm_1204"
        },
        "office": true
      },
      {
        "id": "suzerain_course_1204",
        "name": "Settle with the Qara Khitai",
        "text": "A tribute payment or new terms with your Qara Khitai overlords would complete this goal.",
        "criterion": {
          "kind": "hold",
          "reason": "Neither can be recorded yet, so you can only set this goal aside."
        },
        "office": true
      },
      {
        "id": "eastern_diplomacy_1204",
        "name": "Make peace with the Ghurids",
        "text": "Make a new peace pact with the Ghurid court.",
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
        "label": "Ghurid sultan",
        "text": "Muizz al-Din Muhammad rules the Ghurid Sultanate from Ghazni and may be your enemy.",
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
    "title": "A Siwa delegate’s first goals",
    "intro": "Three optional goals for your public mandate at Siwa.",
    "scenarioIds": [
      "siwa_delegate_1204"
    ],
    "goals": [
      {
        "id": "oasis_accounts_1204",
        "name": "Collect the oasis dues",
        "text": "Receive income or dues into the oasis treasury at a season’s end.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_receipt",
          "realmId": "siwa_households_1204"
        },
        "office": true
      },
      {
        "id": "oasis_consent_1204",
        "name": "Seek the households’ consent",
        "text": "Put a proposal to the households and record their approval or refusal.",
        "criterion": {
          "kind": "event",
          "eventKind": "profile_consent",
          "realmId": "siwa_households_1204"
        },
        "office": true
      },
      {
        "id": "oasis_reserve_1204",
        "name": "Add to the oasis reserve",
        "text": "A gift from your own purse to the oasis reserve would complete this goal.",
        "criterion": {
          "kind": "hold",
          "reason": "Your own money cannot be given to the oasis reserve yet, so you can only set this goal aside."
        },
        "office": true
      }
    ],
    "contacts": [
      {
        "id": "al_adil_link",
        "label": "Ayyubid sultan",
        "text": "Al-Adil I rules the Ayyubid Sultanate from Fustat, far from Siwa, and is not your overlord.",
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
      if (!scenario || !Array.isArray(profile.scenarioIds) || scenario.tracks !== undefined && !Array.isArray(scenario.tracks)) return;
      if (profile.scenarioIds.indexOf(scenario.id) < 0) return;
      scenario.tracks = (scenario.tracks || []).concat([id]);
      if (profile.provinceIds) {
        scenario.trackLocations = Object.assign({}, scenario.trackLocations);
        scenario.trackLocations[id] = profile.provinceIds.slice();
      }
    });
  });
})();
});
