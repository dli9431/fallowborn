/* Local household responses to existing world stories. All choices use the
   costless notice fallback; public transactions remain with their source. */
FBDATA.householdEffects_476_493 = {
  "household_effects_western_court_476": {
    "id": "household_effects_western_court_476",
    "type": "household_observer",
    "title": "Household business beside the western court",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "western_court_476",
    "requires": [
      "western_court_476"
    ],
    "requirements": {
      "provinces": [
        "ravenna",
        "pavia"
      ]
    },
    "provinceIds": [
      "ravenna",
      "pavia"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "court476_opening",
        "trigger": "opening",
        "reach": "local",
        "name": "Papers and daily work",
        "text": "The court and the following have unsettled business. Keep any existing household papers together, or continue your ordinary work. This notice creates no debt.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_pressure",
        "trigger": "pressure",
        "reach": "local",
        "name": "The court dispute presses closer",
        "text": "The dispute between court and following has become more pressing. Compare any real demand with the duties already recorded for your household.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_paid_accord",
        "trigger": "paid_accord",
        "reach": "local",
        "name": "An agreement has been made",
        "text": "The court and following have committed an agreement. Review any existing household entitlement through its own records; acknowledgment is not another wage payment.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_service_period",
        "trigger": "service_period",
        "reach": "service",
        "name": "A service payment is recorded",
        "text": "Your service account records another completed payment period. Keep that receipt with your household papers. The payment has already been handled by the service account.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_contest",
        "trigger": "contest",
        "reach": "local",
        "name": "A struggle for the court seat",
        "text": "The struggle for the court seat has become an actual campaign. Review ordinary travel and your existing duties if needed. This report neither enlists your household nor records an unassessed loss.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_contest_won",
        "trigger": "contest_won",
        "reach": "local",
        "name": "The successful following",
        "text": "The following has secured the court seat. Check the effective authority before presenting any existing claim. This notice grants no holding, immunity or change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_contest_failed",
        "trigger": "contest_failed",
        "reach": "previous",
        "name": "The local campaign has ended",
        "text": "This campaign has ended without securing its objective. Your household can return attention to daily work, while any independent war or obligation continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_diverged",
        "trigger": "diverged",
        "reach": "previous",
        "name": "The dispute takes another course",
        "text": "The earlier court opportunity has closed or lost its original parties. Set aside that report and use the current authorities for any real business.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_civic_result",
        "trigger": "civic_result",
        "reach": "local",
        "name": "The form of rule has been settled",
        "text": "The controlling court has recorded its choice of government. Review the actual civic and church arrangements separately from your private property and household faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_route_departure",
        "trigger": "route_departure",
        "reach": "local",
        "name": "A court escort is on the road",
        "text": "The court escort is actually travelling. Your household may continue ordinary work; this report offers neither escort wages nor a place for your relatives in the party.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_route_arrival",
        "trigger": "route_arrival",
        "reach": "local",
        "name": "The court escort has arrived",
        "text": "The escort has reached its receiving seat. Any further work or payment needs its own ordinary agreement. Your household has not moved with the court.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_route_interrupted",
        "trigger": "route_interrupted",
        "reach": "previous",
        "name": "The escort arrangement has changed",
        "text": "The court route or seat is no longer operating as before. Review any existing claim with the current authority. This report creates no displaced population or travel entitlement.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "court476_terms_changed",
        "trigger": "terms_changed",
        "reach": "service",
        "name": "The earlier terms need review",
        "text": "The service arrangement has lapsed or returned for review. Keep earlier receipts, and review any new offer through its own terms. Acknowledgment neither pays nor confiscates wages.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_zeno_return_476": {
    "id": "household_effects_zeno_return_476",
    "type": "household_observer",
    "title": "Household papers and the eastern court",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "zeno_return_476",
    "requires": [
      "zeno_return_476"
    ],
    "requirements": {
      "provinces": [
        "constantinople",
        "ikonion"
      ]
    },
    "provinceIds": [
      "constantinople",
      "ikonion"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "zeno476_pending",
        "trigger": "pending",
        "reach": "none",
        "name": "Awaiting an actual development",
        "text": "A pending opportunity alone gives your household no new duty.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "zeno476_restored",
        "trigger": "restored",
        "reach": "local",
        "name": "The returning ruler holds office",
        "text": "The eastern court has recorded the returning ruler in office. Check the present issuer of any existing warrant. This report promises no household gain or seizure.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "zeno476_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The return opportunity has closed",
        "text": "The earlier return opportunity has taken another course. Continue ordinary work under the actual local authorities.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "zeno476_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The return arrangement is interrupted",
        "text": "The original return arrangement has lost a necessary party or court. Existing household claims need the current authority, not an old report.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_western_office_476": {
    "id": "household_effects_western_office_476",
    "type": "household_observer",
    "title": "Household records and the western office",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "western_office_476",
    "requires": [
      "western_office_476"
    ],
    "requirements": {
      "provinces": [
        "ravenna",
        "roma"
      ]
    },
    "provinceIds": [
      "ravenna",
      "roma"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "office476_review",
        "trigger": "review",
        "reach": "local",
        "name": "The western office is under review",
        "text": "The office is being reviewed. Keep any existing appointment or household receipt available; the review itself levies nothing.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "office476_survived",
        "trigger": "survived",
        "reach": "local",
        "name": "The office continues",
        "text": "The existing office has survived its review. Continue ordinary household business under the effective authority.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "office476_deposed",
        "trigger": "deposed",
        "reach": "local",
        "name": "The old issuer has lost the seat",
        "text": "The office record now reports deposition. Check the actual issuer before taking an existing paper to court. No private estate is transferred by this notice.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "office476_restored",
        "trigger": "restored",
        "reach": "local",
        "name": "The office has been restored",
        "text": "The office record now reports restoration. Earlier receipts and obligations remain subject to their ordinary rules; there is no household restoration reward.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "office476_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The office arrangement has changed",
        "text": "The office has lost its former holder, mandate or court. Set aside any stale expectation and review the authority that exists now.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_sicilian_tribute_476": {
    "id": "household_effects_sicilian_tribute_476",
    "type": "household_observer",
    "title": "Household papers and the island agreement",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "sicilian_tribute_476",
    "requires": [
      "sicilian_tribute_476"
    ],
    "requirements": {
      "provinces": [
        "messina",
        "siracusa",
        "palermo"
      ]
    },
    "provinceIds": [
      "messina",
      "siracusa",
      "palermo"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "sicily476_pending",
        "trigger": "pending",
        "reach": "local",
        "name": "The courts are considering terms",
        "text": "A real proposal is before the courts. Your household may review its existing papers, but has neither a treaty veto nor a new tribute bill.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "sicily476_active",
        "trigger": "active",
        "reach": "local",
        "name": "The island agreement is in force",
        "text": "The courts have committed their agreement and its first payment. Review actual possession and existing household rights; the retained foothold remains distinct from the ceded counties.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "sicily476_installment",
        "trigger": "installment",
        "reach": "previous",
        "name": "Another public payment is recorded",
        "text": "The public agreement records another successful tribute installment. This is a transfer between courts. It establishes no household surcharge or supplier wage.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "sicily476_breached",
        "trigger": "breached",
        "reach": "previous",
        "name": "The public payment has lapsed",
        "text": "The agreement records an unpaid installment. Current county possession remains. Review actual claims without inventing a household debt or a new war.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "sicily476_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The proposed agreement has closed",
        "text": "The earlier proposal has closed without its proposed settlement. Set aside that report and continue ordinary household business.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "sicily476_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The agreement has been interrupted",
        "text": "The agreement no longer has its former parties or scope. Review actual current authority. Already committed transfers are not undone by this notice.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_norican_evacuation_476": {
    "id": "household_effects_norican_evacuation_476",
    "type": "household_observer",
    "title": "Households along the civilian route",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "norican_evacuation_476",
    "requires": [
      "norican_evacuation_476"
    ],
    "requirements": {
      "provinces": [
        "wien",
        "ravenna"
      ]
    },
    "provinceIds": [
      "wien",
      "ravenna"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "noricum476_pending",
        "trigger": "pending",
        "reach": "none",
        "name": "Awaiting a real authorization",
        "text": "A date window or an eligible route is not an order moving your family.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "noricum476_active",
        "trigger": "active",
        "reach": "local",
        "name": "A civilian route has been authorized",
        "text": "The court has authorized a civilian relocation route. Review its actual endpoints and counts. Your named relatives remain governed by ordinary travel and settlement rules.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "noricum476_batch",
        "trigger": "batch",
        "reach": "local",
        "name": "Civilians have moved along the route",
        "text": "The relocation account records an actual batch reaching its destination. Receiving households may review existing local business; no extra people, relief payment or owned plot is created here.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "noricum476_completed",
        "trigger": "completed",
        "reach": "local",
        "name": "The authorized relocation is complete",
        "text": "The planned cohorts have finished moving along their recorded routes. Review the surviving local arrangements. This does not say that everyone left or that your family moved.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "noricum476_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The relocation opportunity has closed",
        "text": "The earlier relocation opportunity has closed without its proposed move. Ordinary household travel remains separate.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "noricum476_interrupted",
        "trigger": "interrupted",
        "reach": "local",
        "name": "The remaining route has been interrupted",
        "text": "The route can no longer continue under its earlier authorization. People already relocated remain at their actual destinations. Review existing household papers and ordinary travel eligibility.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_cashel_recognition_476": {
    "id": "household_effects_cashel_recognition_476",
    "type": "household_observer",
    "title": "Household business during recognition",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "cashel_recognition_476",
    "requires": [
      "cashel_recognition_476"
    ],
    "requirements": {
      "provinces": [
        "cashel"
      ]
    },
    "provinceIds": [
      "cashel"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "cashel476_open",
        "trigger": "open",
        "reach": "local",
        "name": "Local recognition is unsettled",
        "text": "The canonical succession remains open. Keep any existing household papers ready. Your household is not selecting a ruler through this notice.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "cashel476_resolved",
        "trigger": "resolved",
        "reach": "previous",
        "name": "An accession has been recorded",
        "text": "The succession account records a resolved accession. Check the effective issuer for any existing claim. Your private property and livelihood retain their ordinary rules.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "cashel476_changed",
        "trigger": "changed",
        "reach": "previous",
        "name": "The recognition arrangement has changed",
        "text": "The earlier succession or its court is no longer the same. Set aside stale expectations without inventing a successor or cancelling a real household obligation.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_clovis_syagrius_476": {
    "id": "household_effects_clovis_syagrius_476",
    "type": "household_observer",
    "title": "Households near the Soissons objective",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "clovis_syagrius_476",
    "requires": [
      "clovis_syagrius_476"
    ],
    "requirements": {
      "provinces": [
        "laon"
      ]
    },
    "provinceIds": [
      "laon"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c01_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c01_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c01_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c01_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c01_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_theoderic_italy_476": {
    "id": "household_effects_theoderic_italy_476",
    "type": "household_observer",
    "title": "Households along the Italian campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "theoderic_italy_476",
    "requires": [
      "theoderic_italy_476"
    ],
    "requirements": {
      "provinces": [
        "ravenna"
      ]
    },
    "provinceIds": [
      "ravenna"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c02_negotiating",
        "trigger": "negotiating",
        "reach": "local",
        "name": "The following is negotiating",
        "text": "The actual following is negotiating its route and commission. Review existing local papers; no settlement, enlistment or supplier payment is promised here.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c02_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c02_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c02_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c02_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c02_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_eastern_africa_476": {
    "id": "household_effects_eastern_africa_476",
    "type": "household_observer",
    "title": "Households near the African campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "eastern_africa_476",
    "requires": [
      "eastern_africa_476"
    ],
    "requirements": {
      "provinces": [
        "tunis"
      ]
    },
    "provinceIds": [
      "tunis"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c03_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c03_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c03_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c03_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c03_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_eastern_italy_476": {
    "id": "household_effects_eastern_italy_476",
    "type": "household_observer",
    "title": "Households near the eastern Italian campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "eastern_italy_476",
    "requires": [
      "eastern_italy_476"
    ],
    "requirements": {
      "provinces": [
        "ravenna"
      ]
    },
    "provinceIds": [
      "ravenna"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c04_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c04_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c04_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c04_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c04_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_rugian_frontier_476": {
    "id": "household_effects_rugian_frontier_476",
    "type": "household_observer",
    "title": "Households on the Danubian frontier",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "rugian_frontier_476",
    "requires": [
      "rugian_frontier_476"
    ],
    "requirements": {
      "provinces": [
        "wien"
      ]
    },
    "provinceIds": [
      "wien"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c05_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c05_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c05_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c05_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c05_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_thracian_pressure_476": {
    "id": "household_effects_thracian_pressure_476",
    "type": "household_observer",
    "title": "Households near the Thracian pressure",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "thracian_pressure_476",
    "requires": [
      "thracian_pressure_476"
    ],
    "requirements": {
      "provinces": [
        "constantinople"
      ]
    },
    "provinceIds": [
      "constantinople"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c06_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c06_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c06_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c06_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c06_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_amal_epirus_476": {
    "id": "household_effects_amal_epirus_476",
    "type": "household_observer",
    "title": "Households near the Epirus campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "amal_epirus_476",
    "requires": [
      "amal_epirus_476"
    ],
    "requirements": {
      "provinces": [
        "dyrrachion"
      ]
    },
    "provinceIds": [
      "dyrrachion"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c07_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c07_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c07_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c07_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c07_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_clovis_alamanni_476": {
    "id": "household_effects_clovis_alamanni_476",
    "type": "household_observer",
    "title": "Households near the Alamannic campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "clovis_alamanni_476",
    "requires": [
      "clovis_alamanni_476"
    ],
    "requirements": {
      "provinces": [
        "strasbourg"
      ]
    },
    "provinceIds": [
      "strasbourg"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c08_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c08_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c08_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c08_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c08_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_suevic_frontier_476": {
    "id": "household_effects_suevic_frontier_476",
    "type": "household_observer",
    "title": "Households near the northwestern frontier",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "suevic_frontier_476",
    "requires": [
      "suevic_frontier_476"
    ],
    "requirements": {
      "provinces": [
        "astorga"
      ]
    },
    "provinceIds": [
      "astorga"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c09_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c09_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c09_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c09_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c09_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_cantabrian_campaign_476": {
    "id": "household_effects_cantabrian_campaign_476",
    "type": "household_observer",
    "title": "Households near the Cantabrian objective",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "cantabrian_campaign_476",
    "requires": [
      "cantabrian_campaign_476"
    ],
    "requirements": {
      "provinces": [
        "santander"
      ]
    },
    "provinceIds": [
      "santander"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c10_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c10_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c10_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c10_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c10_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_vasconian_campaign_476": {
    "id": "household_effects_vasconian_campaign_476",
    "type": "household_observer",
    "title": "Households near the Vasconian objective",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "vasconian_campaign_476",
    "requires": [
      "vasconian_campaign_476"
    ],
    "requirements": {
      "provinces": [
        "alava"
      ]
    },
    "provinceIds": [
      "alava"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c11_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c11_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c11_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c11_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c11_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_gallaecian_campaign_476": {
    "id": "household_effects_gallaecian_campaign_476",
    "type": "household_observer",
    "title": "Households near the Gallaecian objective",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "gallaecian_campaign_476",
    "requires": [
      "gallaecian_campaign_476"
    ],
    "requirements": {
      "provinces": [
        "lugo"
      ]
    },
    "provinceIds": [
      "lugo"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c12_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c12_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c12_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c12_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c12_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_alamannic_campaign_493": {
    "id": "household_effects_alamannic_campaign_493",
    "type": "household_observer",
    "title": "Households near the Alamannic campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "alamannic_campaign_493",
    "requires": [
      "alamannic_campaign_493"
    ],
    "requirements": {
      "provinces": [
        "strasbourg"
      ]
    },
    "provinceIds": [
      "strasbourg"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c13_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c13_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c13_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c13_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c13_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_burgundian_campaign_493": {
    "id": "household_effects_burgundian_campaign_493",
    "type": "household_observer",
    "title": "Households near the Burgundian objective",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "burgundian_campaign_493",
    "requires": [
      "burgundian_campaign_493"
    ],
    "requirements": {
      "provinces": [
        "lyon"
      ]
    },
    "provinceIds": [
      "lyon"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c14_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c14_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c14_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c14_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c14_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_visigothic_campaign_493": {
    "id": "household_effects_visigothic_campaign_493",
    "type": "household_observer",
    "title": "Households near the Visigothic campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "visigothic_campaign_493",
    "requires": [
      "visigothic_campaign_493"
    ],
    "requirements": {
      "provinces": [
        "toulouse"
      ]
    },
    "provinceIds": [
      "toulouse"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c15_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c15_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c15_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c15_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c15_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_sirmium_campaign_493": {
    "id": "household_effects_sirmium_campaign_493",
    "type": "household_observer",
    "title": "Households near the Sirmium campaign",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "sirmium_campaign_493",
    "requires": [
      "sirmium_campaign_493"
    ],
    "requirements": {
      "provinces": [
        "sirmium"
      ]
    },
    "provinceIds": [
      "sirmium"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c16_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c16_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c16_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c16_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c16_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_african_campaign_493": {
    "id": "household_effects_african_campaign_493",
    "type": "household_observer",
    "title": "Households near the African expedition",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "african_campaign_493",
    "requires": [
      "african_campaign_493"
    ],
    "requirements": {
      "provinces": [
        "tunis"
      ]
    },
    "provinceIds": [
      "tunis"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c17_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c17_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c17_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c17_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c17_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_italian_campaign_493": {
    "id": "household_effects_italian_campaign_493",
    "type": "household_observer",
    "title": "Households near the Italian expedition",
    "intro": "Local reports reach your household when an actual development concerns your home. Your response changes no public settlement.",
    "sourceStoryId": "italian_campaign_493",
    "requires": [
      "italian_campaign_493"
    ],
    "requirements": {
      "provinces": [
        "ravenna"
      ]
    },
    "provinceIds": [
      "ravenna"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "c18_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign concerns your home",
        "text": "An actual campaign now concerns your home or a host present here. Keep household papers together and use ordinary travel reviews if needed. This report records no unassessed loss, levy or siege.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c18_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign objective is secured",
        "text": "The campaign reports its objective secured. Check who actually governs your home before presenting any existing claim. This notice grants neither land nor a change of faith.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c18_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign has ended",
        "text": "This campaign has ended without securing its objective. Return attention to daily work while any independent war, debt or service duty continues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c18_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity took another course",
        "text": "The earlier opportunity has closed as the situation changed. Set aside that report; no battle, displaced household or new border is implied.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "c18_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "The campaign arrangement is interrupted",
        "text": "The campaign has lost a necessary party, host or mandate. Review existing claims under the current authority. Other wars and ordinary household choices continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare this report with existing rights, obligations and receipts. This costs no money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to daily work",
            "detail": "Acknowledge the report and leave ordinary household choices available.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  }
};
(function () {
  'use strict';
  Object.assign(FBDATA.storyInstances, FBDATA.householdEffects_476_493);
  ['476','493'].forEach(function (id) {
    var raw = FBDATA.bookmarks[id], original = (raw.stories || []).slice();
    function attach(bookmark, inherited) {
      var stories = (bookmark.stories || inherited).slice();
      Object.keys(FBDATA.householdEffects_476_493).forEach(function (key) {
        var def = FBDATA.householdEffects_476_493[key];
        if (stories.indexOf(def.sourceStoryId) >= 0 && stories.indexOf(key) < 0) stories.push(key);
      });
      bookmark.stories = stories;
    }
    attach(raw, original);
    var baseline = Object.assign({}, raw, raw.revisions && raw.revisions.baseline);
    Object.keys(raw.revisions || {}).forEach(function (revision) { attach(raw.revisions[revision], baseline.stories); });
  });
})();
