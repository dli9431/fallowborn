FB.bookmarkSources.stage({source:'data/story_mobile_leadership.js',bookmarks:['476','493','568','634','711','800','867','1066','1096','1204','1241'],catalogs:[],shared:[]}, function (FBDATA) {
/* Camp work and goals delegate payment to the ordinary mobile owner. */
FBDATA.rulerAgendas_mobile_leadership = {
  "qipchaq_leadership_1204": {
    "id": "qipchaq_leadership_1204",
    "type": "ruler_agenda",
    "subjectRealmId": "qipchaq_following_1204",
    "title": "Lead the Qipchaq following",
    "intro": "You lead the eastern Qipchaq following. Win tribute, raid, divide the takings, move the camp to Kath and decide where your people settle. Members decide in Mobile coalition, and outside rulers answer for themselves.",
    "stages": [
      {
        "id": "demand",
        "name": "Win a tribute payment",
        "text": "Ask your members to approve a tribute demand on the ruler of the Lower Syr Darya settlements, add your own assent in Mobile coalition, then send it. This step is done when that ruler pays.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "demand"
        },
        "choices": [
          {
            "id": "propose_demand",
            "label": "Put the tribute demand to the members",
            "detail": "Replaces any pending proposal. Add your own assent in Mobile coalition; the other members decide for themselves.",
            "operation": "agenda_mobile_prepare",
            "action": "demand",
            "terms": {
              "kind": "demand",
              "countyId": "lower_syr_darya",
              "agreementKind": "tribute",
              "threat": "raid",
              "price": 1,
              "duration": 30,
              "levy": 0
            }
          },
          {
            "id": "commit_demand",
            "label": "Send the tribute demand",
            "detail": "Demand {money:1} in tribute for thirty days, under threat of a raid. The ruler may refuse.",
            "operation": "agenda_mobile",
            "action": "demand",
            "terms": {
              "kind": "demand",
              "countyId": "lower_syr_darya",
              "agreementKind": "tribute",
              "threat": "raid",
              "price": 1,
              "duration": 30,
              "levy": 0
            }
          },
          {
            "id": "observed_demand",
            "label": "Record the paid demand",
            "detail": "Marks this step done once the ruler has paid.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_demand",
            "label": "Decide later",
            "detail": "Nothing is spent, and this step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "raid",
        "name": "Raid the lower Syr Darya",
        "text": "A tribute agreement holds your host back until its term ends. Then put the raid to your members, add your assent in Mobile coalition and launch it for coin and food. Your host may lose fighters and takes no land.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "raid"
        },
        "choices": [
          {
            "id": "propose_raid",
            "label": "Put the raid to the members",
            "detail": "Replaces any pending proposal. Add your own assent in Mobile coalition; the other members decide for themselves.",
            "operation": "agenda_mobile_prepare",
            "action": "raid",
            "terms": {
              "kind": "raid",
              "countyId": "lower_syr_darya"
            }
          },
          {
            "id": "commit_raid",
            "label": "Launch the raid",
            "detail": "Your host attacks for coin and county food. Expect resistance and lost fighters.",
            "operation": "agenda_mobile",
            "action": "raid",
            "terms": {
              "kind": "raid",
              "countyId": "lower_syr_darya"
            }
          },
          {
            "id": "observed_raid",
            "label": "Record the finished raid",
            "detail": "Marks this step done once the raid on the lower Syr Darya is over.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_raid",
            "label": "Decide later",
            "detail": "Nothing is spent, and this step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "distribution",
        "name": "Divide the takings",
        "text": "Tribute and raid takings wait for your decision, oldest first. Share them among your members by weight or keep them for the following. This step is done when you do either.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "distribution"
        },
        "choices": [
          {
            "id": "commit_distribution",
            "label": "Share the takings by member weight",
            "detail": "The treasury pays coin into members’ private purses. They eat their food shares now.",
            "operation": "agenda_mobile",
            "action": "distribute",
            "terms": {
              "mode": "weight",
              "memberIds": []
            }
          },
          {
            "id": "keep_receipt",
            "label": "Keep the takings for the following",
            "detail": "Members receive nothing from these takings, and their support falls.",
            "operation": "agenda_mobile",
            "action": "distribute",
            "terms": {
              "mode": "keep",
              "memberIds": []
            }
          },
          {
            "id": "observed_distribution",
            "label": "Record the division of takings",
            "detail": "Marks this step done once takings have been shared or kept.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_distribution",
            "label": "Decide later",
            "detail": "Nothing is spent, and this step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "move",
        "name": "Move the camp to Kath",
        "text": "Put passage to Kath to your members, add your assent in Mobile coalition, send the offer and march once Kath’s ruler accepts. Other rulers on the road must let you pass, and a lost host must be raised again in Mobile coalition. This step is done when camp and host reach Kath.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "arrival"
        },
        "choices": [
          {
            "id": "propose_access",
            "label": "Put passage to Kath to the members",
            "detail": "Replaces any pending proposal. Add your own assent in Mobile coalition; the other members decide for themselves.",
            "operation": "agenda_mobile_prepare",
            "action": "access",
            "terms": {
              "groundId": "kath_ground"
            }
          },
          {
            "id": "send_access",
            "label": "Send the passage offer to Kath",
            "detail": "Kath’s ruler may refuse. If accepted, your following’s treasury pays the price.",
            "operation": "agenda_mobile",
            "action": "access",
            "terms": {
              "groundId": "kath_ground"
            }
          },
          {
            "id": "stay_ground",
            "label": "Stay on the lower Syr Darya",
            "detail": "The camp stays put and spends no travel food. This step stays open.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "river_ground"
            }
          },
          {
            "id": "commit_move",
            "label": "March the camp to Kath",
            "detail": "The camp sets out and spends the travel food shown. The step is done on arrival.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "kath_ground"
            }
          },
          {
            "id": "observed_move",
            "label": "Record the arrival at Kath",
            "detail": "Marks this step done once camp and host have reached Kath.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_move",
            "label": "Decide later",
            "detail": "Nothing is spent, and this step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "settlement",
        "name": "Settle at Kath or keep moving",
        "text": "To settle people at Kath, your camp must be there, you must hold the county or a land award for it, no war or service may bind you and the members must agree. A campaign for Kath can try to win the land. This step is done when a group settles.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "settlement"
        },
        "choices": [
          {
            "id": "propose_settlement",
            "label": "Put settling fifty civilians to the members",
            "detail": "Replaces any pending proposal. Add your own assent in Mobile coalition; the other members decide for themselves.",
            "operation": "agenda_mobile_prepare",
            "action": "settle",
            "terms": {
              "countyId": "kath_district",
              "count": 50,
              "final": false
            }
          },
          {
            "id": "commit_settlement",
            "label": "Settle fifty civilians at Kath",
            "detail": "They stay at Kath with their share of the food. The rest of the following keeps moving.",
            "operation": "agenda_mobile",
            "action": "settle",
            "terms": {
              "countyId": "kath_district",
              "count": 50,
              "final": false
            }
          },
          {
            "id": "propose_final",
            "label": "Put full settlement to the members",
            "detail": "Proposes settling everyone at Kath, fighters included. Add your own assent in Mobile coalition.",
            "operation": "agenda_mobile_prepare",
            "action": "settle",
            "terms": {
              "countyId": "kath_district",
              "count": 1,
              "final": true
            }
          },
          {
            "id": "commit_final",
            "label": "Settle the whole following at Kath",
            "detail": "Everyone settles at Kath, fighters included. The host disbands and the following stops moving.",
            "operation": "agenda_mobile",
            "action": "settle",
            "terms": {
              "countyId": "kath_district",
              "count": 1,
              "final": true
            }
          },
          {
            "id": "stay_mobile",
            "label": "Keep the following moving",
            "detail": "Nothing is spent, and settlement stays open.",
            "operation": "agenda_defer"
          },
          {
            "id": "observed_settlement",
            "label": "Record the settlement of your people",
            "detail": "Marks this step done once some of your people have settled.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_settlement",
            "label": "Decide later",
            "detail": "Nothing is spent, and this step stays open.",
            "operation": "agenda_defer"
          }
        ]
      }
    ]
  }
};
FBDATA.householdTracks_mobile_leadership = {
  "qipchaq_camp_household_1204": {
    "id": "qipchaq_camp_household_1204",
    "type": "household_track",
    "title": "Work in the Qipchaq camp",
    "intro": "Your household belongs to the eastern Qipchaq following. Its camp can pay you for a day’s work.",
    "homeProvinceId": "lower_syr_darya",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "work",
    "requirements": {
      "provinces": [
        "lower_syr_darya"
      ],
      "realms": [
        "qipchaq_following_1204"
      ]
    },
    "stages": {
      "work": {
        "name": "A day’s work for the camp",
        "text": "You must be at the camp, and it needs coin in its treasury and food in store. You can take paid work once a day.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Work one day for the camp",
            "detail": "You are paid from the camp’s treasury, and the camp spends one food.",
            "operation": {
              "kind": "mobile_work",
              "realmId": "qipchaq_following_1204"
            },
            "next": "paid"
          }
        ],
        "transitions": []
      },
      "paid": {
        "name": "Your work was paid",
        "text": "The camp paid your day’s wage from its treasury into your private purse and spent one food.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The offer of work has ended",
        "text": "The person offered this work can no longer take it. The offer does not pass to an heir.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  }
};
FBDATA.openingProfiles_mobile_leadership = {
  "opening_qipchaq_member_1204": {
    "id": "opening_qipchaq_member_1204",
    "type": "opening_profile",
    "title": "Earn your first camp wage",
    "intro": "One optional goal: take a day’s paid work in the Qipchaq camp.",
    "scenarioIds": [
      "qipchaq_member_1204"
    ],
    "provinceIds": [
      "lower_syr_darya"
    ],
    "requires": [
      "qipchaq_camp_household_1204"
    ],
    "goals": [
      {
        "id": "service",
        "name": "Work a paid day in camp",
        "text": "In Deeds, open Work in the Qipchaq camp; this goal is done when the camp pays you for a day’s work.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "qipchaq_camp_household_1204",
          "phases": [
            "paid"
          ]
        }
      }
    ],
    "contacts": []
  }
};
FBDATA.openingProfiles_mobile_leadership_loop = {
  "opening_qipchaq_leader_1204": {
    "id": "opening_qipchaq_leader_1204",
    "type": "opening_profile",
    "title": "Learn to lead the Qipchaq",
    "intro": "Four optional goals: win tribute, raid, divide the takings and move the camp to Kath.",
    "scenarioIds": [
      "qipchaq_leader_1204"
    ],
    "provinceIds": [
      "lower_syr_darya"
    ],
    "officeRealmId": "qipchaq_following_1204",
    "requires": [
      "qipchaq_leadership_1204"
    ],
    "goals": [
      {
        "id": "demand",
        "name": "Win a tribute payment",
        "text": "In Deeds, open Lead the Qipchaq following; this goal is done when the ruler of the Lower Syr Darya settlements pays your tribute demand.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "qipchaq_leadership_1204",
          "stageId": "demand"
        }
      },
      {
        "id": "raid",
        "name": "Raid the lower Syr Darya",
        "text": "In Deeds, open Lead the Qipchaq following; this goal is done when your host raids the lower Syr Darya after the tribute term ends.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "qipchaq_leadership_1204",
          "stageId": "raid"
        }
      },
      {
        "id": "distribution",
        "name": "Divide the takings",
        "text": "In Deeds, open Lead the Qipchaq following; this goal is done when you share the oldest takings with your members or keep them.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "qipchaq_leadership_1204",
          "stageId": "distribution"
        }
      },
      {
        "id": "move",
        "name": "Move the camp to Kath",
        "text": "In Deeds, open Lead the Qipchaq following; this goal is done when your camp and host reach Kath.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "qipchaq_leadership_1204",
          "stageId": "move"
        }
      }
    ],
    "contacts": []
  }
};
Object.assign(FBDATA.openingProfiles_mobile_leadership,FBDATA.openingProfiles_mobile_leadership_loop);
FBDATA.householdTracks_mobile_leadership_pontic = {
  "pontic_camp_household_476": {
    "id": "pontic_camp_household_476",
    "type": "household_track",
    "title": "Work in the Pontic camp",
    "intro": "Your household belongs to the Pontic Followings. Their camp can pay you for a day’s work.",
    "homeProvinceId": "cherson",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "work",
    "requirements": {
      "provinces": [
        "cherson"
      ],
      "realms": [
        "pontic_following_476"
      ]
    },
    "stages": {
      "work": {
        "name": "A day’s work for the camp",
        "text": "You must be at the camp, and it needs coin in its treasury and food in store. You can take paid work once a day.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Work one day for the camp",
            "detail": "You are paid from the camp’s treasury, and the camp spends one food.",
            "operation": {
              "kind": "mobile_work",
              "realmId": "pontic_following_476"
            },
            "next": "paid"
          }
        ],
        "transitions": []
      },
      "paid": {
        "name": "Your work was paid",
        "text": "The camp paid your day’s wage from its treasury into your private purse and spent one food.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The offer of work has ended",
        "text": "The person offered this work can no longer take it. The offer does not pass to an heir.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  },
  "saragur_camp_household_476": {
    "id": "saragur_camp_household_476",
    "type": "household_track",
    "title": "Work in the Saragur camp",
    "intro": "Your household belongs to the Saragur Following. Its camp can pay you for a day’s work.",
    "homeProvinceId": "sarkel",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "work",
    "requirements": {
      "provinces": [
        "sarkel"
      ],
      "realms": [
        "saragur_following_476"
      ]
    },
    "stages": {
      "work": {
        "name": "A day’s work for the camp",
        "text": "You must be at the camp, and it needs coin in its treasury and food in store. You can take paid work once a day.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Work one day for the camp",
            "detail": "You are paid from the camp’s treasury, and the camp spends one food.",
            "operation": {
              "kind": "mobile_work",
              "realmId": "saragur_following_476"
            },
            "next": "paid"
          }
        ],
        "transitions": []
      },
      "paid": {
        "name": "Your work was paid",
        "text": "The camp paid your day’s wage from its treasury into your private purse and spent one food.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The offer of work has ended",
        "text": "The person offered this work can no longer take it. The offer does not pass to an heir.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  },
  "oghur_camp_household_476": {
    "id": "oghur_camp_household_476",
    "type": "household_track",
    "title": "Work in the Oghur camp",
    "intro": "Your household belongs to the Oghur Following. Its camp can pay you for a day’s work.",
    "homeProvinceId": "atil",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "work",
    "requirements": {
      "provinces": [
        "atil"
      ],
      "realms": [
        "oghur_following_476"
      ]
    },
    "stages": {
      "work": {
        "name": "A day’s work for the camp",
        "text": "You must be at the camp, and it needs coin in its treasury and food in store. You can take paid work once a day.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Work one day for the camp",
            "detail": "You are paid from the camp’s treasury, and the camp spends one food.",
            "operation": {
              "kind": "mobile_work",
              "realmId": "oghur_following_476"
            },
            "next": "paid"
          }
        ],
        "transitions": []
      },
      "paid": {
        "name": "Your work was paid",
        "text": "The camp paid your day’s wage from its treasury into your private purse and spent one food.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The offer of work has ended",
        "text": "The person offered this work can no longer take it. The offer does not pass to an heir.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  }
};
Object.assign(FBDATA.householdTracks_mobile_leadership,FBDATA.householdTracks_mobile_leadership_pontic);
FBDATA.storyExpeditions_mobile_leadership = {
  "qipchaq_land_campaign_1204": {
    "id": "qipchaq_land_campaign_1204",
    "type": "campaign",
    "name": "The march on Kath",
    "desc": "The eastern Qipchaq want a lasting home at Kath, which Khwarazm holds under the Qara Khitai. Their host would have to take it by force.",
    "actor": {
      "realmId": "qipchaq_following_1204"
    },
    "target": {
      "provinceId": "kath_district",
      "ownerIds": [
        "qara_khitai_1204"
      ]
    },
    "firstYear": 1204,
    "lastYear": 1209,
    "durationDays": 90,
    "conditions": [
      {
        "kind": "landless",
        "realmId": "qipchaq_following_1204"
      }
    ],
    "admission": {
      "schema": 1,
      "mode": "ordinary_declaration",
      "cause": "aggression"
    },
    "mobileReview": {
      "schema": 1
    }
  }
};
Object.assign(FBDATA.storyInstances,FBDATA.storyExpeditions_mobile_leadership);
if (FBDATA.bookmarks['1204']) {
  var world = FBDATA.bookmarks['1204'];
  Object.keys(world.revisions || {}).forEach(function (id) {
    var revision = world.revisions[id];
    if ((revision.realms || world.realms || []).some(function (r) {return r.id === 'qipchaq_following_1204';}))
      revision.stories = (revision.stories || world.stories || []).concat(['qipchaq_land_campaign_1204']);
  });
}
if (FBDATA.mobileProfiles.eastern_qipchaq_1204) Object.assign(FBDATA.mobileProfiles.eastern_qipchaq_1204,{
  "extractionPolicy": {
    "schema": 1,
    "demand": {
      "kinds": [
        "tribute"
      ],
      "maxPayment": 6,
      "maxDays": 90
    },
    "raid": {
      "maxGold": 8,
      "maxFood": 80,
      "stockShare": 0.08,
      "cooldownDays": 90
    }
  },
  "cohesionPolicy": {
    "schema": 1,
    "initialSupport": 70,
    "victory": 4,
    "defeat": -8,
    "receiptShare": 18,
    "scarcity": {
      "days": 10,
      "support": -0.5
    },
    "idle": {
      "seasons": 3,
      "support": -6
    },
    "standing": {
      "target": 0,
      "factor": 0.03
    },
    "thresholds": {
      "depart": 10,
      "withhold": 30,
      "rival": 45
    },
    "distribution": {
      "mode": "weight",
      "favorites": 1
    }
  },
  "seasonalRound": {
    "schema": 1,
    "automate": false,
    "travelFoodRate": 0.25,
    "grounds": [
      {
        "id": "river_ground",
        "name": "Lower Syr Darya settlements",
        "countyId": "lower_syr_darya",
        "climateZone": "arid",
        "seasonKinds": [
          "spring",
          "autumn"
        ],
        "capacity": 1800,
        "offSeasonYield": 0.25,
        "access": {
          "capacity": 1600,
          "allowRecruit": false,
          "price": 3,
          "duration": 90
        },
        "neighbors": [
          {
            "groundId": "kath_ground",
            "distanceDays": 14
          }
        ]
      },
      {
        "id": "kath_ground",
        "name": "Kath",
        "countyId": "kath_district",
        "climateZone": "arid",
        "seasonKinds": [
          "spring",
          "autumn"
        ],
        "capacity": 1800,
        "offSeasonYield": 0.25,
        "access": {
          "capacity": 1600,
          "allowRecruit": false,
          "price": 3,
          "duration": 90
        },
        "neighbors": [
          {
            "groundId": "river_ground",
            "distanceDays": 14
          }
        ]
      }
    ]
  }
});
FBDATA.techImpactReviews.features.mobile_story_transactions = {mode:'none',rationale:'Personal reviews expose existing coalition transactions and observe receipts and actual arrival. Ordinary authority, consent, resource, equipment and movement gates remain binding.'};
FBDATA.techImpactReviews.features.mobile_campaign_principal_review = {mode:'none',rationale:'The actual player-controlled coalition leader reviews existing campaigns through canonical member consent without changing institutional identity or granting authority.'};
Object.assign(FBDATA.storyInstances,FBDATA.rulerAgendas_mobile_leadership,FBDATA.householdTracks_mobile_leadership,FBDATA.openingProfiles_mobile_leadership);
});
