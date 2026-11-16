FB.bookmarkSources.stage({source:'data/story_mobile_leadership.js',bookmarks:['476','493','568','634','711','800','867','1066','1096','1204','1241'],catalogs:[],shared:[]}, function (FBDATA) {
/* Camp work and goals delegate payment to the ordinary mobile owner. */
FBDATA.rulerAgendas_mobile_leadership = {
  "qipchaq_leadership_1204": {
    "id": "qipchaq_leadership_1204",
    "type": "ruler_agenda",
    "subjectRealmId": "qipchaq_following_1204",
    "title": "Lead the living following",
    "intro": "Follow actual member decisions, finite receipts and physical arrival. Every review may be cancelled. Deferral grants no completion or reward.",
    "stages": [
      {
        "id": "demand",
        "name": "Receive one accepted demand",
        "text": "Propose these exact terms here. In Mobile coalition, assent as your own member and wait for the other members to answer. Return here to send the demand. The outside court may refuse; only its actual public payment completes this stage.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "demand"
        },
        "choices": [
          {
            "id": "propose_demand",
            "label": "Propose these terms to the members",
            "detail": "No payment or outcome. Replaces the pending proposal. Supply only your own assent in Mobile coalition; other members decide separately.",
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
            "label": "Send the demand",
            "detail": "Ask for one money unit under an explicit raid threat for thirty days. No payment occurs unless the outside court accepts.",
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
            "label": "Record the actual completed transaction",
            "detail": "Available only after the actual action succeeds. Records its outcome and adds no money, food or authority.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_demand",
            "label": "Defer this review",
            "detail": "Spend nothing and leave this stage pending. Return later or set the program aside.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "raid",
        "name": "Resolve one bounded raid",
        "text": "An accepted demand reserves a finite tribute commitment. Wait for its thirty-day term to end before raiding. Propose the local sortie here, assent in Mobile coalition and wait for other members. Return to commit the reviewed sortie. It risks fighter losses and provides finite spoils, without occupation or land.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "raid"
        },
        "choices": [
          {
            "id": "propose_raid",
            "label": "Propose these terms to the members",
            "detail": "No payment or outcome. Replaces the pending proposal. Supply only your own assent in Mobile coalition; other members decide separately.",
            "operation": "agenda_mobile_prepare",
            "action": "raid",
            "terms": {
              "kind": "raid",
              "countyId": "lower_syr_darya"
            }
          },
          {
            "id": "commit_raid",
            "label": "Review and commit the sortie",
            "detail": "Resolve ordinary resistance, casualties and finite public coin and county food. No land is granted.",
            "operation": "agenda_mobile",
            "action": "raid",
            "terms": {
              "kind": "raid",
              "countyId": "lower_syr_darya"
            }
          },
          {
            "id": "observed_raid",
            "label": "Record the actual completed transaction",
            "detail": "Available only after the actual action succeeds. Records its outcome and adds no money, food or authority.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_raid",
            "label": "Defer this review",
            "detail": "Spend nothing and leave this stage pending. Return later or set the program aside.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "distribution",
        "name": "Decide one actual receipt",
        "text": "Share the oldest actual receipt by living member weight or retain it publicly. Food shares are consumed now. This resolves existing resources, without another story reward.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "distribution"
        },
        "choices": [
          {
            "id": "commit_distribution",
            "label": "Share by member weight",
            "detail": "Distribute the oldest actual receipt once. Coin enters private purses; food allotments are consumed.",
            "operation": "agenda_mobile",
            "action": "distribute",
            "terms": {
              "mode": "weight",
              "memberIds": []
            }
          },
          {
            "id": "keep_receipt",
            "label": "Retain the receipt publicly",
            "detail": "Resolve the oldest receipt without private payment or food allotments, with ordinary support consequences.",
            "operation": "agenda_mobile",
            "action": "distribute",
            "terms": {
              "mode": "keep",
              "memberIds": []
            }
          },
          {
            "id": "observed_distribution",
            "label": "Record the actual completed transaction",
            "detail": "Available only after the actual action succeeds. Records its outcome and adds no money, food or authority.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_distribution",
            "label": "Defer this review",
            "detail": "Spend nothing and leave this stage pending. Return later or set the program aside.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "move",
        "name": "Arrive at a seasonal ground",
        "text": "Propose access here, assent in Mobile coalition and wait for the other members. Send the offer here and wait for outside acceptance. Every intervening county needs ordinary access. If the host was lost, use Mobile coalition to recruit from actual member pledges and pay the current public cost. Review departure here and let days pass. Only actual camp and host arrival completes the stage.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "arrival"
        },
        "choices": [
          {
            "id": "propose_access",
            "label": "Propose access to the next ground",
            "detail": "No permission is granted. Obtain member assent in Mobile coalition.",
            "operation": "agenda_mobile_prepare",
            "action": "access",
            "terms": {
              "groundId": "kath_ground"
            }
          },
          {
            "id": "send_access",
            "label": "Send the reviewed access offer",
            "detail": "The outside holder must accept separately. The public treasury pays its finite price. Intervening counties need ordinary access.",
            "operation": "agenda_mobile",
            "action": "access",
            "terms": {
              "groundId": "kath_ground"
            }
          },
          {
            "id": "stay_ground",
            "label": "Review staying at the present ground",
            "detail": "No travel charge or arrival evidence. The movement goal remains pending.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "river_ground"
            }
          },
          {
            "id": "commit_move",
            "label": "Review the seasonal departure",
            "detail": "Spend the quoted camp food surcharge and use the actual route clock. Departure is not completion.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "kath_ground"
            }
          },
          {
            "id": "observed_move",
            "label": "Record the actual completed transaction",
            "detail": "Available only after the actual action succeeds. Records its outcome and adds no money, food or authority.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_move",
            "label": "Defer this review",
            "detail": "Spend nothing and leave this stage pending. Return later or set the program aside.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "settlement",
        "name": "Choose the following’s future",
        "text": "The Kath ground is this program’s settlement objective. Partial or final settlement needs actual presence, lawful owned land or a recognized land award, peace and exact member assent. An optional campaign can attempt to secure land but guarantees none. Stay mobile and defer leave this stage pending. Set the program aside closes the agenda without claiming settlement.",
        "year": 1204,
        "season": 0,
        "completion": {
          "kind": "settlement"
        },
        "choices": [
          {
            "id": "propose_settlement",
            "label": "Propose these terms to the members",
            "detail": "No payment or outcome. Replaces the pending proposal. Supply only your own assent in Mobile coalition; other members decide separately.",
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
            "label": "Settle a partial group",
            "detail": "Transfer fifty civilians at the actual camp county through existing land rights and assent. The remaining following stays mobile.",
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
            "label": "Propose final settlement",
            "detail": "Quotes every remaining person, including field fighters. Obtain exact member assent in Mobile coalition.",
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
            "label": "Review final settlement",
            "detail": "Settle every remaining person under the following’s current rights and member decision. No outcome is recorded before it succeeds.",
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
            "label": "Stay mobile",
            "detail": "Spend nothing and leave settlement pending. Ordinary camp decisions remain available.",
            "operation": "agenda_defer"
          },
          {
            "id": "observed_settlement",
            "label": "Record the actual completed transaction",
            "detail": "Available only after the actual action succeeds. Records its outcome and adds no money, food or authority.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_settlement",
            "label": "Defer this review",
            "detail": "Spend nothing and leave this stage pending. Return later or set the program aside.",
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
    "title": "Work in the living camp",
    "intro": "Your household belongs to this following. Review one paid service at its actual civilian camp. You may close the sheet without accepting; no future wage or public power is promised.",
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
        "name": "One actual service",
        "text": "The following must have public money and at least one food unit. Your payment enters the private purse; food leaves the camp. Service is available once per day and requires your actual presence. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Review one paid camp service",
            "detail": "Receive the ordinary service payment from the public treasury and consume one camp food unit. Confirm only after reviewing current eligibility and cost. This grants no troops, office or future payment.",
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
        "name": "The service was paid",
        "text": "One canonical service payment reached your private purse. The following paid from its own account and consumed one food unit. No other household member moved and no future wage was reserved.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original worker is no longer available",
        "text": "This personal work opportunity has ended. A successor inherits no promised payment or public mandate.",
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
    "title": "Earn one camp payment",
    "intro": "This optional goal observes a paid service, never an acknowledgment or opening cash. It adds no reward.",
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
        "name": "Complete one paid camp service",
        "text": "In Deeds, open Work in the living camp and review one paid camp service. The current camp, public treasury, food and daily work limit determine availability. Cancel leaves this goal pending.",
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
    "title": "Learn the following’s real decisions",
    "intro": "Optional goals observe completed actions and pay no rewards. Set any goal aside without changing the following.",
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
        "name": "Receive one accepted demand",
        "text": "In Deeds, open Lead the living following. Propose these exact terms here. In Mobile coalition, assent as your own member and wait for the other members to answer. Return here to send the demand. The outside court may refuse; only its actual public payment completes this stage.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "qipchaq_leadership_1204",
          "stageId": "demand"
        }
      },
      {
        "id": "raid",
        "name": "Resolve one bounded raid",
        "text": "In Deeds, open Lead the living following. An accepted demand reserves a finite tribute commitment. Wait for its thirty-day term to end before raiding. Propose the local sortie here, assent in Mobile coalition and wait for other members. Return to commit the reviewed sortie. It risks fighter losses and provides finite spoils, without occupation or land.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "qipchaq_leadership_1204",
          "stageId": "raid"
        }
      },
      {
        "id": "distribution",
        "name": "Decide one actual receipt",
        "text": "In Deeds, open Lead the living following. Share the oldest actual receipt by living member weight or retain it publicly. Food shares are consumed now. This resolves existing resources, without another story reward.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "qipchaq_leadership_1204",
          "stageId": "distribution"
        }
      },
      {
        "id": "move",
        "name": "Arrive at a seasonal ground",
        "text": "In Deeds, open Lead the living following. Propose access here, assent in Mobile coalition and wait for the other members. Send the offer here and wait for outside acceptance. Every intervening county needs ordinary access. If the host was lost, use Mobile coalition to recruit from actual member pledges and pay the current public cost. Review departure here and let days pass. Only actual camp and host arrival completes the stage.",
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
    "title": "Work in the living camp",
    "intro": "Your household belongs to this following. Review one paid service at its actual civilian camp. You may close the sheet without accepting; no future wage or public power is promised.",
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
        "name": "One actual service",
        "text": "The following must have public money and at least one food unit. Your payment enters the private purse; food leaves the camp. Service is available once per day and requires your actual presence. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Review one paid camp service",
            "detail": "Receive the ordinary service payment from the public treasury and consume one camp food unit. Confirm only after reviewing current eligibility and cost. This grants no troops, office or future payment.",
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
        "name": "The service was paid",
        "text": "One canonical service payment reached your private purse. The following paid from its own account and consumed one food unit. No other household member moved and no future wage was reserved.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original worker is no longer available",
        "text": "This personal work opportunity has ended. A successor inherits no promised payment or public mandate.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  },
  "saragur_camp_household_476": {
    "id": "saragur_camp_household_476",
    "type": "household_track",
    "title": "Work in the living camp",
    "intro": "Your household belongs to this following. Review one paid service at its actual civilian camp. You may close the sheet without accepting; no future wage or public power is promised.",
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
        "name": "One actual service",
        "text": "The following must have public money and at least one food unit. Your payment enters the private purse; food leaves the camp. Service is available once per day and requires your actual presence. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Review one paid camp service",
            "detail": "Receive the ordinary service payment from the public treasury and consume one camp food unit. Confirm only after reviewing current eligibility and cost. This grants no troops, office or future payment.",
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
        "name": "The service was paid",
        "text": "One canonical service payment reached your private purse. The following paid from its own account and consumed one food unit. No other household member moved and no future wage was reserved.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original worker is no longer available",
        "text": "This personal work opportunity has ended. A successor inherits no promised payment or public mandate.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  },
  "oghur_camp_household_476": {
    "id": "oghur_camp_household_476",
    "type": "household_track",
    "title": "Work in the living camp",
    "intro": "Your household belongs to this following. Review one paid service at its actual civilian camp. You may close the sheet without accepting; no future wage or public power is promised.",
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
        "name": "One actual service",
        "text": "The following must have public money and at least one food unit. Your payment enters the private purse; food leaves the camp. Service is available once per day and requires your actual presence. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "paid_service",
            "label": "Review one paid camp service",
            "detail": "Receive the ordinary service payment from the public treasury and consume one camp food unit. Confirm only after reviewing current eligibility and cost. This grants no troops, office or future payment.",
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
        "name": "The service was paid",
        "text": "One canonical service payment reached your private purse. The following paid from its own account and consumed one food unit. No other household member moved and no future wage was reserved.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original worker is no longer available",
        "text": "This personal work opportunity has ended. A successor inherits no promised payment or public mandate.",
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
    "name": "A permanent foothold",
    "desc": "The following may seek a permanent foothold through an uncertain ordinary campaign. The actual leader decides with member assent. No historical conquest, land entitlement or settlement is promised; ordinary diplomacy remains available.",
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
