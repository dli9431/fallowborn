FB.bookmarkSources.stage({source:'data/story_451.js',bookmarks:['451'],catalogs:[],shared:[]}, function (FBDATA) {
/* Personal graphs attach through their owning start, never through world stories. */
FBDATA.householdTracks_451 = {
  "gallic_curialis_track_451": {
    "id": "gallic_curialis_track_451",
    "type": "household_track",
    "title": "Records work in Aurelianum",
    "intro": "Earn for your household by keeping records in Aurelianum. Local war and a change of sovereign may affect when you review the work. Council service and relocation have their own decisions.",
    "homeProvinceId": "orleans",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "livelihood",
    "requirements": {
      "provinces": [
        "orleans"
      ]
    },
    "stages": {
      "livelihood": {
        "name": "Choose records work",
        "text": "Keeping records earns private income on worked days. Selecting it costs no gold or time. To defer, close this review and return to it in Deeds.",
        "choices": [
          {
            "id": "work",
            "label": "Keep records",
            "detail": "Choose Keep records as your Daily Focus. Earnings go to the household after a worked day. Council appointments are separate.",
            "when": {
              "kind": "home",
              "provinceId": "orleans"
            },
            "operation": {
              "kind": "set_focus",
              "focusId": "keep_records"
            },
            "next": "working"
          }
        ],
        "transitions": [
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          },
          {
            "when": {
              "kind": "at_war",
              "provinceId": "orleans"
            },
            "next": "upheaval"
          }
        ]
      },
      "working": {
        "name": "Await records earnings",
        "text": "The household goal stays pending until a day of records work pays in Aurelianum. If you change your Daily Focus, you can resume records work here.",
        "choices": [
          {
            "id": "continue_work",
            "label": "Resume records work",
            "detail": "Select Keep records again. Your first paid day in Aurelianum completes the goal.",
            "when": {
              "kind": "home",
              "provinceId": "orleans"
            },
            "operation": {
              "kind": "set_focus",
              "focusId": "keep_records"
            },
            "next": "working"
          }
        ],
        "afterWork": {
          "focusId": "keep_records",
          "provinceId": "orleans",
          "next": "paid"
        },
        "transitions": [
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          },
          {
            "when": {
              "kind": "at_war",
              "provinceId": "orleans"
            },
            "next": "upheaval"
          }
        ]
      },
      "upheaval": {
        "name": "War beside the home",
        "text": "The county is actually at war. Ordinary travel, household-party consent and institutional refuge have their own reviews. Keeping work selected grants no protection or safety.",
        "choices": [
          {
            "id": "retain_livelihood",
            "label": "Keep records during the war",
            "detail": "Select Keep records and stay at your current home. Travel and refuge require separate decisions.",
            "when": {
              "kind": "home",
              "provinceId": "orleans"
            },
            "operation": {
              "kind": "set_focus",
              "focusId": "keep_records"
            },
            "next": "wartime_work"
          }
        ],
        "transitions": [
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          }
        ]
      },
      "wartime_work": {
        "name": "Await wartime records earnings",
        "text": "Records work continues at home. The household goal stays pending until a day of this work pays.",
        "choices": [
          {
            "id": "continue_work",
            "label": "Resume records work",
            "detail": "Select Keep records again. Your first paid day in Aurelianum completes the goal.",
            "when": {
              "kind": "home",
              "provinceId": "orleans"
            },
            "operation": {
              "kind": "set_focus",
              "focusId": "keep_records"
            },
            "next": "wartime_work"
          }
        ],
        "afterWork": {
          "focusId": "keep_records",
          "provinceId": "orleans",
          "next": "paid"
        },
        "transitions": [
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          }
        ]
      },
      "control": {
        "name": "A different sovereign",
        "text": "Control of this county has actually changed. Household property, dues and public offices keep their ordinary owners; this review grants none.",
        "incident": {
          "source": "control",
          "milestone": "rule_changed",
          "provinceId": "orleans"
        },
        "afterIncident": "resettled_work",
        "choices": [
          {
            "id": "resume_work",
            "label": "Resume records work under the present rule",
            "detail": "Record the change of sovereign and select Keep records. Your household keeps its home and existing obligations.",
            "when": {
              "kind": "home",
              "provinceId": "orleans"
            },
            "operation": {
              "kind": "set_focus",
              "focusId": "keep_records"
            },
            "next": "resettled_work"
          }
        ],
        "transitions": []
      },
      "paid": {
        "name": "Work has supported the household",
        "text": "A day of records work paid into the private purse. The opening goal is complete.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original worker is unavailable",
        "text": "Death or succession closes the original person’s unfinished plan without a promised wage.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "resettled_work": {
        "name": "Await records earnings",
        "text": "The household goal stays pending until a day of records work pays in Aurelianum. If you change your Daily Focus, you can resume records work here.",
        "choices": [
          {
            "id": "continue_work",
            "label": "Resume records work",
            "detail": "Select Keep records again. Your first paid day in Aurelianum completes the goal.",
            "when": {
              "kind": "home",
              "provinceId": "orleans"
            },
            "operation": {
              "kind": "set_focus",
              "focusId": "keep_records"
            },
            "next": "resettled_work"
          }
        ],
        "afterWork": {
          "focusId": "keep_records",
          "provinceId": "orleans",
          "next": "paid"
        },
        "transitions": []
      }
    }
  },
  "gallic_colonus_track_451": {
    "id": "gallic_colonus_track_451",
    "type": "household_track",
    "title": "A livelihood amid uncertain rule",
    "intro": "Local war and a changed sovereign open reviews; distant reports and calendar dates do not move the household. Ordinary work must actually pay before this opening completes.",
    "homeProvinceId": "arles",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "livelihood",
    "requirements": {
      "provinces": [
        "arles"
      ]
    },
    "stages": {
      "livelihood": {
        "name": "Keep the household supplied",
        "text": "Choose ordinary work, then wait for actual earnings. No story wage or military enlistment is granted. You may close this sheet without spending.",
        "choices": [
          {
            "id": "work",
            "label": "Select ordinary work",
            "detail": "Set the daily focus; earnings depend on actual work and its ordinary eligibility.",
            "operation": {
              "kind": "set_focus",
              "focusId": "toil"
            },
            "next": "working"
          }
        ],
        "transitions": [
          {
            "when": {
              "kind": "at_war",
              "provinceId": "arles"
            },
            "next": "upheaval"
          },
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          }
        ]
      },
      "working": {
        "name": "Wait for real earnings",
        "text": "Selecting a focus has not paid the household. Continue work through ordinary days. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "continue_work",
            "label": "Keep ordinary work selected",
            "detail": "No immediate wage, public authority or refuge is granted.",
            "operation": {
              "kind": "set_focus",
              "focusId": "toil"
            },
            "next": "working"
          }
        ],
        "afterWork": {
          "focusId": "toil",
          "provinceId": "arles",
          "next": "paid"
        },
        "transitions": [
          {
            "when": {
              "kind": "at_war",
              "provinceId": "arles"
            },
            "next": "upheaval"
          },
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          }
        ]
      },
      "upheaval": {
        "name": "War beside the home",
        "text": "The county is actually at war. Ordinary travel, household-party consent and institutional refuge have their own reviews. Keeping work selected grants no protection or safety.",
        "choices": [
          {
            "id": "retain_livelihood",
            "label": "Retain ordinary livelihood",
            "detail": "Return to the earnings review without claiming evacuation, refuge or exemption from dues.",
            "operation": {
              "kind": "set_focus",
              "focusId": "toil"
            },
            "next": "working"
          }
        ],
        "transitions": []
      },
      "control": {
        "name": "A different sovereign",
        "text": "Control of this county has actually changed. Household property, dues and public offices keep their ordinary owners; this review grants none.",
        "incident": {
          "source": "control",
          "milestone": "rule_changed",
          "provinceId": "arles"
        },
        "afterIncident": "resettled_work",
        "choices": [
          {
            "id": "resume_work",
            "label": "Review work under the present rule",
            "detail": "Retain ordinary work without a conversion, grant or free journey.",
            "operation": {
              "kind": "set_focus",
              "focusId": "toil"
            },
            "next": "resettled_work"
          }
        ],
        "transitions": []
      },
      "paid": {
        "name": "Work has supported the household",
        "text": "Actual ordinary earnings completed this local opening. No further reward is added.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original worker is unavailable",
        "text": "Death or succession closes the original person’s unfinished plan without a promised wage.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "resettled_work": {
        "name": "Wait for real earnings",
        "text": "Selecting a focus has not paid the household. Continue work through ordinary days. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "continue_work",
            "label": "Keep ordinary work selected",
            "detail": "No immediate wage, public authority or refuge is granted.",
            "operation": {
              "kind": "set_focus",
              "focusId": "toil"
            },
            "next": "resettled_work"
          }
        ],
        "afterWork": {
          "focusId": "toil",
          "provinceId": "arles",
          "next": "paid"
        },
        "transitions": []
      }
    }
  },
  "federate_soldier_track_451": {
    "id": "federate_soldier_track_451",
    "type": "household_track",
    "title": "A livelihood amid uncertain rule",
    "intro": "Local war and a changed sovereign open reviews; distant reports and calendar dates do not move the household. Ordinary work must actually pay before this opening completes.",
    "homeProvinceId": "toulouse",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "livelihood",
    "requirements": {
      "provinces": [
        "toulouse"
      ]
    },
    "stages": {
      "livelihood": {
        "name": "Keep the household supplied",
        "text": "Choose ordinary work, then wait for actual earnings. No story wage or military enlistment is granted. You may close this sheet without spending.",
        "choices": [
          {
            "id": "work",
            "label": "Select ordinary work",
            "detail": "Set the daily focus; earnings depend on actual work and its ordinary eligibility.",
            "operation": {
              "kind": "set_focus",
              "focusId": "stand_guard"
            },
            "next": "working"
          }
        ],
        "transitions": [
          {
            "when": {
              "kind": "at_war",
              "provinceId": "toulouse"
            },
            "next": "upheaval"
          },
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          }
        ]
      },
      "working": {
        "name": "Wait for real earnings",
        "text": "Selecting a focus has not paid the household. Continue work through ordinary days. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "continue_work",
            "label": "Keep ordinary work selected",
            "detail": "No immediate wage, public authority or refuge is granted.",
            "operation": {
              "kind": "set_focus",
              "focusId": "stand_guard"
            },
            "next": "working"
          }
        ],
        "afterWork": {
          "focusId": "stand_guard",
          "provinceId": "toulouse",
          "next": "paid"
        },
        "transitions": [
          {
            "when": {
              "kind": "at_war",
              "provinceId": "toulouse"
            },
            "next": "upheaval"
          },
          {
            "when": {
              "kind": "control_changed",
              "stageId": "control"
            },
            "next": "control"
          }
        ]
      },
      "upheaval": {
        "name": "War beside the home",
        "text": "The county is actually at war. Ordinary travel, household-party consent and institutional refuge have their own reviews. Keeping work selected grants no protection or safety.",
        "choices": [
          {
            "id": "retain_livelihood",
            "label": "Retain ordinary livelihood",
            "detail": "Return to the earnings review without claiming evacuation, refuge or exemption from dues.",
            "operation": {
              "kind": "set_focus",
              "focusId": "stand_guard"
            },
            "next": "working"
          }
        ],
        "transitions": []
      },
      "control": {
        "name": "A different sovereign",
        "text": "Control of this county has actually changed. Household property, dues and public offices keep their ordinary owners; this review grants none.",
        "incident": {
          "source": "control",
          "milestone": "rule_changed",
          "provinceId": "toulouse"
        },
        "afterIncident": "resettled_work",
        "choices": [
          {
            "id": "resume_work",
            "label": "Review work under the present rule",
            "detail": "Retain ordinary work without a conversion, grant or free journey.",
            "operation": {
              "kind": "set_focus",
              "focusId": "stand_guard"
            },
            "next": "resettled_work"
          }
        ],
        "transitions": []
      },
      "paid": {
        "name": "Work has supported the household",
        "text": "Actual ordinary earnings completed this local opening. No further reward is added.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original worker is unavailable",
        "text": "Death or succession closes the original person’s unfinished plan without a promised wage.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "resettled_work": {
        "name": "Wait for real earnings",
        "text": "Selecting a focus has not paid the household. Continue work through ordinary days. Closing this sheet leaves the goal pending.",
        "choices": [
          {
            "id": "continue_work",
            "label": "Keep ordinary work selected",
            "detail": "No immediate wage, public authority or refuge is granted.",
            "operation": {
              "kind": "set_focus",
              "focusId": "stand_guard"
            },
            "next": "resettled_work"
          }
        ],
        "afterWork": {
          "focusId": "stand_guard",
          "provinceId": "toulouse",
          "next": "paid"
        },
        "transitions": []
      }
    }
  },
  "aetius_service_track_451": {
    "id": "aetius_service_track_451",
    "type": "household_track",
    "title": "Aetius’s warrant at Ravenna",
    "intro": "Your warrant from the western court lets you arrange paid service for it. The court’s money and soldiers do not become yours.",
    "homeProvinceId": "ravenna",
    "continuity": "protagonist",
    "interruptedStage": "interrupted",
    "initialStage": "service",
    "requirements": {
      "provinces": [
        "ravenna"
      ],
      "realms": [
        "italy"
      ]
    },
    "stages": {
      "service": {
        "name": "Agree to paid service",
        "text": "Your warrant lasts 360 days, and the court may suspend or remove it sooner. Once another court has agreed to serve for pay, you can consent for the western court, which pays from its public funds.",
        "choices": [
          {
            "id": "consent_service",
            "label": "Consent to the paid service offer",
            "detail": "Binds the western court to pay from public funds for service another court has agreed to give. You need that open offer and your warrant.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "italy",
                "officeId": "senior_service_451",
                "action": "consent",
                "input": {
                  "templateId": "court_paid_service"
                }
              }
            },
            "next": "consented"
          },
          {
            "id": "accept_loss",
            "label": "Accept the loss of your office",
            "detail": "Closes your court service once the court has dismissed you or your term has ended. It does not give the office back.",
            "operation": {
              "kind": "mandate_service",
              "service": {
                "realmId": "italy",
                "officeId": "senior_service_451",
                "action": "accept_loss",
                "input": {}
              }
            },
            "next": "released"
          }
        ],
        "transitions": []
      },
      "consented": {
        "name": "You consented to the service",
        "text": "The western court has your consent to the paid service contract and has made the first payment. The service itself is still to come.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "released": {
        "name": "Your warrant has ended",
        "text": "You have accepted the loss of your office. Your private life goes on, and the court keeps the promises it made.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "Aetius can no longer serve",
        "text": "Death or succession ended Aetius’s court service. The warrant does not pass to an heir.",
        "terminal": true,
        "choices": [],
        "transitions": []
      }
    }
  }
};
FBDATA.rulerAgendas_451 = {
  "attila_agenda_451": {
    "id": "attila_agenda_451",
    "type": "ruler_agenda",
    "subjectRealmId": "hunnic_coalition_451",
    "title": "From Sirmium to Mursa",
    "intro": "Your members must agree to demands, raids and settlement, and other courts may refuse you. Make Sirmium pay, raid it, share the takings, move to Mursa and settle your people.",
    "stages": [
      {
        "id": "demand",
        "name": "Make Sirmium pay tribute",
        "text": "Put a demand on Sirmium to the members, add your assent in Mobile coalition, then send it. This step is done when Sirmium pays.",
        "year": 451,
        "season": 0,
        "completion": {
          "kind": "demand"
        },
        "choices": [
          {
            "id": "propose_demand",
            "label": "Put the Sirmium demand to the members",
            "detail": "Asks the members to approve demanding {money:1} for 30 days under threat of a raid, replacing any pending proposal. Then add your assent in Mobile coalition.",
            "operation": "agenda_mobile_prepare",
            "action": "demand",
            "terms": {
              "kind": "demand",
              "countyId": "sirmium",
              "agreementKind": "tribute",
              "threat": "raid",
              "price": 1,
              "duration": 30,
              "levy": 0
            }
          },
          {
            "id": "commit_demand",
            "label": "Send the demand to Sirmium",
            "detail": "Demands {money:1} for 30 days under threat of a raid. The coalition is paid only if Sirmium accepts.",
            "operation": "agenda_mobile",
            "action": "demand",
            "terms": {
              "kind": "demand",
              "countyId": "sirmium",
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
            "detail": "Marks this step done once Sirmium has paid.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_demand",
            "label": "Leave the demand for later",
            "detail": "Spends nothing. This step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "raid",
        "name": "Raid Sirmium",
        "text": "Once the 30 days of tribute end, put a raid on Sirmium to the members, add your assent in Mobile coalition, then send the host. Fighters may die, and the raid brings coin and food but no land. This step is done when the raid is over.",
        "year": 451,
        "season": 0,
        "completion": {
          "kind": "raid"
        },
        "choices": [
          {
            "id": "propose_raid",
            "label": "Put the Sirmium raid to the members",
            "detail": "Asks the members to approve the raid, replacing any pending proposal. Then add your assent in Mobile coalition.",
            "operation": "agenda_mobile_prepare",
            "action": "raid",
            "terms": {
              "kind": "raid",
              "countyId": "sirmium"
            }
          },
          {
            "id": "commit_raid",
            "label": "Send the host to raid Sirmium",
            "detail": "Raids at once for coin and food, at the risk of your fighters. The members must agree and any tribute term must be over.",
            "operation": "agenda_mobile",
            "action": "raid",
            "terms": {
              "kind": "raid",
              "countyId": "sirmium"
            }
          },
          {
            "id": "observed_raid",
            "label": "Record the finished raid",
            "detail": "Marks this step done once the raid on Sirmium is over.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_raid",
            "label": "Leave the raid for later",
            "detail": "Spends nothing. This step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "distribution",
        "name": "Share or keep the takings",
        "text": "Share the oldest undivided payment or spoils among the members by their weight, or keep it for the coalition. Shared food is eaten at once. Either choice completes this step.",
        "year": 451,
        "season": 0,
        "completion": {
          "kind": "distribution"
        },
        "choices": [
          {
            "id": "commit_distribution",
            "label": "Share the takings by member weight",
            "detail": "Divides the oldest takings and raises the members’ support. Coin goes to their private purses and their food is eaten at once.",
            "operation": "agenda_mobile",
            "action": "distribute",
            "terms": {
              "mode": "weight",
              "memberIds": []
            }
          },
          {
            "id": "keep_receipt",
            "label": "Keep the takings for the coalition",
            "detail": "Keeps the oldest takings in the coalition’s coin and food stores. The members get nothing and their support falls.",
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
            "label": "Leave the takings for later",
            "detail": "Spends nothing. This step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "move",
        "name": "Move the camp to Mursa",
        "text": "Put access to Mursa to the members, add your assent in Mobile coalition, send the offer and wait for the holder to accept. Every ruler on the way must let you pass, and a lost host must be raised again in Mobile coalition. Then move the camp, which costs food; this step is done when the camp and host reach Mursa.",
        "year": 451,
        "season": 0,
        "completion": {
          "kind": "arrival"
        },
        "choices": [
          {
            "id": "propose_access",
            "label": "Ask the members to seek Mursa access",
            "detail": "Puts an access offer for Mursa to the members, replacing any pending proposal. Then add your assent in Mobile coalition.",
            "operation": "agenda_mobile_prepare",
            "action": "access",
            "terms": {
              "groundId": "mursa_grounds"
            }
          },
          {
            "id": "send_access",
            "label": "Offer to pay for Mursa access",
            "detail": "Offers {money:6} for 90 days of access, paid from the coalition treasury if Mursa’s holder accepts.",
            "operation": "agenda_mobile",
            "action": "access",
            "terms": {
              "groundId": "mursa_grounds"
            }
          },
          {
            "id": "stay_ground",
            "label": "Keep the camp at Sirmium",
            "detail": "Stays this season at no travel cost. The move to Mursa stays open.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "sirmium_grounds"
            }
          },
          {
            "id": "commit_move",
            "label": "Move the camp to Mursa",
            "detail": "Sets out at once and spends camp food on a journey of at least 8 days. The step is done only on arrival.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "mursa_grounds"
            }
          },
          {
            "id": "observed_move",
            "label": "Record the arrival at Mursa",
            "detail": "Marks this step done once the camp and host have arrived.",
            "operation": "agenda_mobile_result"
          },
          {
            "id": "defer_move",
            "label": "Leave the move for later",
            "detail": "Spends nothing. This step stays open.",
            "operation": "agenda_defer"
          }
        ]
      },
      {
        "id": "settlement",
        "name": "Settle at Mursa",
        "text": "Settle some or all of your people at Mursa. The camp must be there and at peace, the coalition must hold the land or a recognized award to it, and the members must agree.",
        "year": 451,
        "season": 0,
        "completion": {
          "kind": "settlement"
        },
        "choices": [
          {
            "id": "propose_settlement",
            "label": "Propose settling fifty at Mursa",
            "detail": "Asks the members to approve settling 50 people, replacing any pending proposal. Then add your assent in Mobile coalition.",
            "operation": "agenda_mobile_prepare",
            "action": "settle",
            "terms": {
              "countyId": "osijek",
              "count": 50,
              "final": false
            }
          },
          {
            "id": "commit_settlement",
            "label": "Settle fifty people at Mursa",
            "detail": "Moves 50 civilians into Mursa once the members agree. The rest of the following stays on the move.",
            "operation": "agenda_mobile",
            "action": "settle",
            "terms": {
              "countyId": "osijek",
              "count": 50,
              "final": false
            }
          },
          {
            "id": "propose_final",
            "label": "Propose settling everyone at Mursa",
            "detail": "Asks the members to approve settling all remaining people, fighters included, replacing any pending proposal. Then add your assent in Mobile coalition.",
            "operation": "agenda_mobile_prepare",
            "action": "settle",
            "terms": {
              "countyId": "osijek",
              "count": 1,
              "final": true
            }
          },
          {
            "id": "commit_final",
            "label": "Settle everyone at Mursa",
            "detail": "Settles all remaining people, fighters included, once the members agree. The coalition stops wandering and becomes a settled realm.",
            "operation": "agenda_mobile",
            "action": "settle",
            "terms": {
              "countyId": "osijek",
              "count": 1,
              "final": true
            }
          },
          {
            "id": "stay_mobile",
            "label": "Stay on the move",
            "detail": "Keeps the following wandering for now. Spends nothing, and settlement stays open.",
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
            "label": "Leave settlement for later",
            "detail": "Spends nothing. This step stays open.",
            "operation": "agenda_defer"
          }
        ]
      }
    ]
  }
};
FBDATA.openingProfiles_451 = {
  "opening_attila_451": {
    "id": "opening_attila_451",
    "type": "opening_profile",
    "title": "Attila’s first goals",
    "intro": "Four goals follow your first tribute, raid, division of takings and march to Mursa.",
    "scenarioIds": [
      "attila_451"
    ],
    "provinceIds": [
      "sirmium"
    ],
    "officeRealmId": "hunnic_coalition_451",
    "requires": [
      "attila_agenda_451"
    ],
    "goals": [
      {
        "id": "demand",
        "name": "Make Sirmium pay tribute",
        "text": "In Deeds, open From Sirmium to Mursa; this goal is done when Sirmium pays your demand.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "attila_agenda_451",
          "stageId": "demand"
        }
      },
      {
        "id": "raid",
        "name": "Raid Sirmium",
        "text": "In Deeds, open From Sirmium to Mursa; this goal is done when you have raided Sirmium after the tribute term ends.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "attila_agenda_451",
          "stageId": "raid"
        }
      },
      {
        "id": "distribution",
        "name": "Share or keep the takings",
        "text": "In Deeds, open From Sirmium to Mursa; this goal is done when you share or keep the oldest takings.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "attila_agenda_451",
          "stageId": "distribution"
        }
      },
      {
        "id": "move",
        "name": "Bring the camp to Mursa",
        "text": "In Deeds, open From Sirmium to Mursa; this goal is done when your camp and host reach Mursa.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "attila_agenda_451",
          "stageId": "move"
        }
      }
    ],
    "contacts": []
  },
  "opening_gallic_curialis_451": {
    "id": "opening_gallic_curialis_451",
    "type": "opening_profile",
    "title": "A day’s earnings in Aurelianum",
    "intro": "One goal: earn your household’s first pay from records work in Aurelianum.",
    "scenarioIds": [
      "gallic_curialis_451"
    ],
    "provinceIds": [
      "orleans"
    ],
    "requires": [
      "gallic_curialis_track_451"
    ],
    "goals": [
      {
        "id": "earned",
        "name": "Earn a day’s pay keeping records",
        "text": "In Deeds, choose records work in your household story; this goal is done when a day of it pays in Aurelianum.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "gallic_curialis_track_451",
          "phases": [
            "paid"
          ]
        }
      }
    ],
    "contacts": []
  },
  "opening_gallic_colonus_451": {
    "id": "opening_gallic_colonus_451",
    "type": "opening_profile",
    "title": "A day’s earnings in Arelate",
    "intro": "One goal: earn your household’s first pay from fieldwork in Arelate.",
    "scenarioIds": [
      "gallic_colonus_451"
    ],
    "provinceIds": [
      "arles"
    ],
    "requires": [
      "gallic_colonus_track_451"
    ],
    "goals": [
      {
        "id": "earned",
        "name": "Earn a day’s pay in the fields",
        "text": "In Deeds, take up work in your household story; this goal is done when a day in the fields pays in Arelate.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "gallic_colonus_track_451",
          "phases": [
            "paid"
          ]
        }
      }
    ],
    "contacts": []
  },
  "opening_federate_soldier_451": {
    "id": "opening_federate_soldier_451",
    "type": "opening_profile",
    "title": "A day’s pay in Tolosa",
    "intro": "One goal: earn your household’s first guard pay in Tolosa.",
    "scenarioIds": [
      "federate_soldier_451"
    ],
    "provinceIds": [
      "toulouse"
    ],
    "requires": [
      "federate_soldier_track_451"
    ],
    "goals": [
      {
        "id": "earned",
        "name": "Earn a day’s guard pay",
        "text": "In Deeds, take up work in your household story; this goal is done when a day of guard duty pays in Tolosa.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "federate_soldier_track_451",
          "phases": [
            "paid"
          ]
        }
      }
    ],
    "contacts": []
  },
  "opening_aetius_451": {
    "id": "opening_aetius_451",
    "type": "opening_profile",
    "title": "Aetius’s first goal",
    "intro": "One goal: decide what becomes of your service warrant from the western court.",
    "scenarioIds": [
      "aetius_451"
    ],
    "provinceIds": [
      "ravenna"
    ],
    "requires": [
      "aetius_service_track_451"
    ],
    "goals": [
      {
        "id": "service_decision",
        "name": "Settle your Ravenna court service",
        "text": "In Deeds, open Aetius’s warrant at Ravenna; this goal is done when you consent to a paid service offer or accept the loss of your office.",
        "criterion": {
          "kind": "household_phase",
          "storyId": "aetius_service_track_451",
          "phases": [
            "consented",
            "released"
          ]
        }
      }
    ],
    "contacts": []
  }
};
FBDATA.storyExpeditions_451 = {
  "western_objective_451": {
    "name": "The march on Aurelianum",
    "desc": "In 451 the coalition can march on Aurelianum, held by the western court. The members must agree, and the host must take the city by force."
  }
};
});
