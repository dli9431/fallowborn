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
    "title": "Court service without an estate",
    "intro": "The original western court appointment supplies finite negotiating authority, never private ownership of the court’s money or soldiers. Every action uses the actual mandate.",
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
        "name": "Review actual paid service",
        "text": "The court-service warrant expires after 360 days and may be suspended or removed earlier. Consent applies only to an actual offered paid-service contract under this mandate. The outside party must separately agree; public obligations remain separate from private gold. Close the sheet to retain current arrangements.",
        "choices": [
          {
            "id": "consent_service",
            "label": "Review a real service agreement",
            "detail": "Use the current mandate to consent to an offered court-paid-service contract. No host, land, private wage or outside consent is created by viewing it.",
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
            "label": "Accept an actual loss of office",
            "detail": "Available only after the ordinary mandate owner records removal, expiry or another supported loss. No office is restored.",
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
        "name": "The mandate holder consented",
        "text": "The actual holder supplied consent through the mandate owner. The contract still needs its other party and ordinary public funding; no completed service or battlefield result is claimed.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "released": {
        "name": "Service authority has ended",
        "text": "The original mandate’s ordinary loss is recorded. Private life and surviving commitments retain their existing owners.",
        "terminal": true,
        "choices": [],
        "transitions": []
      },
      "interrupted": {
        "name": "The original officeholder is unavailable",
        "text": "Death or succession ended this person’s unfinished review without transferring the commission.",
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
    "title": "The coalition: receipts, cohesion and a place to live",
    "intro": "Members decide actual proposals. Outside courts may refuse. Completed payments, resolved sorties, distributed receipts, physical arrival and lawful settlement supply the evidence. No anniversary decides the following’s future.",
    "stages": [
      {
        "id": "demand",
        "name": "Receive one accepted demand",
        "text": "Propose these exact terms here. In Mobile coalition, assent as your own member and wait for the other members to answer. Return here to send the demand. The outside court may refuse; only its actual public payment completes this stage.",
        "year": 451,
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
            "label": "Send the demand",
            "detail": "Ask for one money unit under an explicit raid threat for thirty days. No payment occurs unless the outside court accepts.",
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
        "year": 451,
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
              "countyId": "sirmium"
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
              "countyId": "sirmium"
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
        "year": 451,
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
        "year": 451,
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
              "groundId": "mursa_grounds"
            }
          },
          {
            "id": "send_access",
            "label": "Send the reviewed access offer",
            "detail": "The outside holder must accept separately. The public treasury pays its finite price. Intervening counties need ordinary access.",
            "operation": "agenda_mobile",
            "action": "access",
            "terms": {
              "groundId": "mursa_grounds"
            }
          },
          {
            "id": "stay_ground",
            "label": "Review staying at the present ground",
            "detail": "No travel charge or arrival evidence. The movement goal remains pending.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "sirmium_grounds"
            }
          },
          {
            "id": "commit_move",
            "label": "Review the seasonal departure",
            "detail": "Spend the quoted camp food surcharge and use the actual route clock. Departure is not completion.",
            "operation": "agenda_mobile",
            "action": "round",
            "terms": {
              "groundId": "mursa_grounds"
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
        "text": "The Mursa ground is this program’s settlement objective. Partial or final settlement needs actual presence, lawful owned land or a recognized land award, peace and exact member assent. An optional campaign can attempt to secure land but guarantees none. Stay mobile and defer leave this stage pending. Set the program aside closes the agenda without claiming settlement.",
        "year": 451,
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
              "countyId": "osijek",
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
              "countyId": "osijek",
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
              "countyId": "osijek",
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
              "countyId": "osijek",
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
FBDATA.openingProfiles_451 = {
  "opening_attila_451": {
    "id": "opening_attila_451",
    "type": "opening_profile",
    "title": "Learn the following’s real decisions",
    "intro": "Optional goals observe completed actions and pay no rewards. Set any goal aside without changing the following.",
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
        "name": "Receive one accepted demand",
        "text": "In Deeds, open Lead the living following. Propose these exact terms here. In Mobile coalition, assent as your own member and wait for the other members to answer. Return here to send the demand. The outside court may refuse; only its actual public payment completes this stage.",
        "office": true,
        "criterion": {
          "kind": "mobile_transaction",
          "storyId": "attila_agenda_451",
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
          "storyId": "attila_agenda_451",
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
          "storyId": "attila_agenda_451",
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
    "title": "Support the household through actual work",
    "intro": "Optional goals add no rewards. War, public service and shelter retain separate authority and consent.",
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
        "name": "Earn through records work",
        "text": "Earn private income from a worked day of keeping records in Aurelianum.",
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
    "title": "Support the household through actual work",
    "intro": "Optional goals add no rewards. War, public service and shelter retain separate authority and consent.",
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
        "name": "Earn through ordinary work",
        "text": "Complete the local opening only after ordinary work actually pays.",
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
    "title": "Support the household through actual work",
    "intro": "Optional goals add no rewards. War, public service and shelter retain separate authority and consent.",
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
        "name": "Earn through ordinary work",
        "text": "Complete the local opening only after ordinary work actually pays.",
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
    "title": "Use the finite western warrant",
    "intro": "Observe actual consent or loss of the original mandate. No extra office, money or host is awarded.",
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
        "name": "Resolve a real mandate decision",
        "text": "Complete an actual service-consent or recorded office-loss transaction.",
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
    "name": "A western objective",
    "desc": "The coalition may seek Aurelianum through an ordinary aggression review. Members must assent, the actual host must campaign and defenders may prevail. This opportunity grants no route, supplies, army, land or settlement."
  }
};
});
