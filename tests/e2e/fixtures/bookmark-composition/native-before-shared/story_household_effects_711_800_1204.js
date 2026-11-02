/* Local reports follow committed public records; household transactions keep their ordinary owners. */
FBDATA.householdEffects_711_800_1204 = {
  "household_effects_strait_crossing_711": {
    "id": "household_effects_strait_crossing_711",
    "type": "household_observer",
    "title": "The contested southern coast",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "strait_crossing_711",
    "requires": [
      "strait_crossing_711"
    ],
    "requirements": {
      "provinces": [
        "malaga"
      ]
    },
    "provinceIds": [
      "malaga"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "strait_crossing_711_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "A crossing has opened a campaign around Malaga. Watch the actual frontier while keeping food and household papers in order.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "strait_crossing_711_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "strait_crossing_711_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "strait_crossing_711_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "strait_crossing_711_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_toledo_campaign_711": {
    "id": "household_effects_toledo_campaign_711",
    "type": "household_observer",
    "title": "A household in contested Toledo",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "toledo_campaign_711",
    "requires": [
      "toledo_campaign_711"
    ],
    "requirements": {
      "provinces": [
        "toledo"
      ]
    },
    "provinceIds": [
      "toledo"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "toledo_campaign_711_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "The campaign for Toledo has begun. Your household can keep its records together while the courts and armies decide possession.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "toledo_campaign_711_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "toledo_campaign_711_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "toledo_campaign_711_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "toledo_campaign_711_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_septimania_campaign_711": {
    "id": "household_effects_septimania_campaign_711",
    "type": "household_observer",
    "title": "A household beside the Narbonne campaign",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "septimania_campaign_711",
    "requires": [
      "septimania_campaign_711"
    ],
    "requirements": {
      "provinces": [
        "narbonne"
      ]
    },
    "provinceIds": [
      "narbonne"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "septimania_campaign_711_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "A campaign contests Narbonne. Check the local situation before arranging work or an ordinary journey.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "septimania_campaign_711_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "septimania_campaign_711_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "septimania_campaign_711_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "septimania_campaign_711_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_gaul_campaign_711": {
    "id": "household_effects_gaul_campaign_711",
    "type": "household_observer",
    "title": "A household beside the Toulouse campaign",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "gaul_campaign_711",
    "requires": [
      "gaul_campaign_711"
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
        "id": "gaul_campaign_711_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "Toulouse is now a campaign objective. The household must follow actual fighting rather than a promised outcome.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gaul_campaign_711_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gaul_campaign_711_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gaul_campaign_711_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gaul_campaign_711_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_barcelona_800": {
    "id": "household_effects_barcelona_800",
    "type": "household_observer",
    "title": "Household life on the Barcelona frontier",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "barcelona_800",
    "requires": [
      "barcelona_800"
    ],
    "requirements": {
      "provinces": [
        "barcelona"
      ]
    },
    "provinceIds": [
      "barcelona"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "barcelona_800_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "Barcelona is contested. Keep track of local conditions before committing the household to work or a journey.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "barcelona_800_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "barcelona_800_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "barcelona_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "barcelona_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_danish_friesland_800": {
    "id": "household_effects_danish_friesland_800",
    "type": "household_observer",
    "title": "A household on the Frisian coast",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "danish_friesland_800",
    "requires": [
      "danish_friesland_800"
    ],
    "requirements": {
      "provinces": [
        "groningen"
      ]
    },
    "provinceIds": [
      "groningen"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "danish_friesland_800_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "The coastal campaign has opened around Groningen. Keep household supplies in mind; actual armies and ordinary markets govern what happens here.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "danish_friesland_800_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "danish_friesland_800_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "danish_friesland_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "danish_friesland_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_abbasid_anatolia_800": {
    "id": "household_effects_abbasid_anatolia_800",
    "type": "household_observer",
    "title": "A household on the Anatolian frontier",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "abbasid_anatolia_800",
    "requires": [
      "abbasid_anatolia_800"
    ],
    "requirements": {
      "provinces": [
        "ikonion"
      ]
    },
    "provinceIds": [
      "ikonion"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "abbasid_anatolia_800_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "The frontier campaign contests Iconium. Observe the local situation before making household plans.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "abbasid_anatolia_800_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "abbasid_anatolia_800_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "abbasid_anatolia_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "abbasid_anatolia_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_italian_lagoon_800": {
    "id": "household_effects_italian_lagoon_800",
    "type": "household_observer",
    "title": "A household beside the Adriatic rivalry",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "italian_lagoon_800",
    "requires": [
      "italian_lagoon_800"
    ],
    "requirements": {
      "provinces": [
        "venezia"
      ]
    },
    "provinceIds": [
      "venezia"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "italian_lagoon_800_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "Venice is contested. Consider household work and ordinary travel against the actual local fighting.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "italian_lagoon_800_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "italian_lagoon_800_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "italian_lagoon_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "italian_lagoon_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_latin_thessalonica_1204": {
    "id": "household_effects_latin_thessalonica_1204",
    "type": "household_observer",
    "title": "Daily life in contested Thessalonica",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "latin_thessalonica_1204",
    "requires": [
      "latin_thessalonica_1204"
    ],
    "requirements": {
      "provinces": [
        "thessaloniki"
      ]
    },
    "provinceIds": [
      "thessaloniki"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "latin_thessalonica_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "A campaign contests Thessalonica. A projected royal settlement does not yet settle your household’s local rights.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_thessalonica_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_thessalonica_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_thessalonica_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_thessalonica_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_latin_bithynia_1204": {
    "id": "household_effects_latin_bithynia_1204",
    "type": "household_observer",
    "title": "A household in contested Bithynia",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "latin_bithynia_1204",
    "requires": [
      "latin_bithynia_1204"
    ],
    "requirements": {
      "provinces": [
        "nicaea"
      ]
    },
    "provinceIds": [
      "nicaea"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "latin_bithynia_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "The Latin campaign contests Nicaea. Check present possession before arranging work, residence or travel.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_bithynia_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_bithynia_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_bithynia_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_bithynia_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_nicaean_return_1204": {
    "id": "household_effects_nicaean_return_1204",
    "type": "household_observer",
    "title": "A household awaiting a contest for the city",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "nicaean_return_1204",
    "requires": [
      "nicaean_return_1204"
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
        "id": "nicaean_return_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "A Nicaean campaign contests Constantinople. The household can review its present rights while the armies decide possession.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "nicaean_return_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "nicaean_return_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "nicaean_return_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "nicaean_return_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_bulgarian_thrace_1204": {
    "id": "household_effects_bulgarian_thrace_1204",
    "type": "household_observer",
    "title": "Household life in contested Thrace",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "bulgarian_thrace_1204",
    "requires": [
      "bulgarian_thrace_1204"
    ],
    "requirements": {
      "provinces": [
        "adrianople"
      ]
    },
    "provinceIds": [
      "adrianople"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "bulgarian_thrace_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "Adrianople is contested. Consider provisions and work in light of the actual local fighting.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "bulgarian_thrace_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "bulgarian_thrace_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "bulgarian_thrace_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "bulgarian_thrace_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_epirote_macedonia_1204": {
    "id": "household_effects_epirote_macedonia_1204",
    "type": "household_observer",
    "title": "A household beside the Epirote campaign",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "epirote_macedonia_1204",
    "requires": [
      "epirote_macedonia_1204"
    ],
    "requirements": {
      "provinces": [
        "thessaloniki"
      ]
    },
    "provinceIds": [
      "thessaloniki"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "epirote_macedonia_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "The Epirote court contests Thessalonica. The campaign alone establishes no new household tax or property settlement.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "epirote_macedonia_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "epirote_macedonia_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "epirote_macedonia_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "epirote_macedonia_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_castilian_frontier_1204": {
    "id": "household_effects_castilian_frontier_1204",
    "type": "household_observer",
    "title": "A household beside the Cordoban frontier",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "castilian_frontier_1204",
    "requires": [
      "castilian_frontier_1204"
    ],
    "requirements": {
      "provinces": [
        "cordoba"
      ]
    },
    "provinceIds": [
      "cordoba"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "castilian_frontier_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "A Castilian campaign contests Cordoba. Its result depends on this campaign’s fighting and negotiations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "castilian_frontier_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "castilian_frontier_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "castilian_frontier_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "castilian_frontier_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_portuguese_algarve_1204": {
    "id": "household_effects_portuguese_algarve_1204",
    "type": "household_observer",
    "title": "Household life in contested Silves",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "portuguese_algarve_1204",
    "requires": [
      "portuguese_algarve_1204"
    ],
    "requirements": {
      "provinces": [
        "silves"
      ]
    },
    "provinceIds": [
      "silves"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "portuguese_algarve_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "A Portuguese campaign contests Silves. Check actual local control before making household plans.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "portuguese_algarve_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "portuguese_algarve_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "portuguese_algarve_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "portuguese_algarve_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_aragonese_valencia_1204": {
    "id": "household_effects_aragonese_valencia_1204",
    "type": "household_observer",
    "title": "A household in contested Valencia",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "aragonese_valencia_1204",
    "requires": [
      "aragonese_valencia_1204"
    ],
    "requirements": {
      "provinces": [
        "valencia"
      ]
    },
    "provinceIds": [
      "valencia"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "aragonese_valencia_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "Valencia is contested. Keep household plans tied to the actual local situation and ordinary routes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "aragonese_valencia_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "aragonese_valencia_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "aragonese_valencia_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "aragonese_valencia_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_capetian_normandy_1204": {
    "id": "household_effects_capetian_normandy_1204",
    "type": "household_observer",
    "title": "A household awaiting the fate of Rouen",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "capetian_normandy_1204",
    "requires": [
      "capetian_normandy_1204"
    ],
    "requirements": {
      "provinces": [
        "rouen"
      ]
    },
    "provinceIds": [
      "rouen"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "capetian_normandy_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "The French campaign contests Rouen. The household can review its obligations while fighting and negotiations continue.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "capetian_normandy_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "capetian_normandy_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "capetian_normandy_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "capetian_normandy_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_latin_athens_1204": {
    "id": "household_effects_latin_athens_1204",
    "type": "household_observer",
    "title": "Daily life in contested Athens",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "latin_athens_1204",
    "requires": [
      "latin_athens_1204"
    ],
    "requirements": {
      "provinces": [
        "athens"
      ]
    },
    "provinceIds": [
      "athens"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "latin_athens_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "Athens is contested. A future grant requires its own completed settlement after possession is secured.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_athens_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_athens_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_athens_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_athens_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_latin_achaia_1204": {
    "id": "household_effects_latin_achaia_1204",
    "type": "household_observer",
    "title": "A household beside the Morean campaign",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "latin_achaia_1204",
    "requires": [
      "latin_achaia_1204"
    ],
    "requirements": {
      "provinces": [
        "sparta"
      ]
    },
    "provinceIds": [
      "sparta"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "latin_achaia_1204_started",
        "trigger": "started",
        "reach": "local",
        "name": "A campaign reaches the local horizon",
        "text": "The campaign contests the mapped Morean county at Sparta. A proposed principality still requires a separate accepted grant.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_achaia_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The campaign reports success",
        "text": "The campaign reports that it secured its objective. Review current local authority and existing household rights before choosing what comes next.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_achaia_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The campaign ends without its objective",
        "text": "The campaign has ended without securing its objective. Keep existing household obligations in view and assess work or recovery through ordinary choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_achaia_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The opportunity takes another course",
        "text": "The campaign opportunity has closed as circumstances changed. Base household plans on current control and any ordinary war that remains.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "latin_achaia_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "A change of court interrupts the campaign",
        "text": "The campaign’s court has changed and the opportunity is interrupted. Existing property, debts and ordinary fighting retain their actual outcomes.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_asturias_foundation_711": {
    "id": "household_effects_asturias_foundation_711",
    "type": "household_observer",
    "title": "A household beside the Asturian foundation",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "asturias_foundation_711",
    "requires": [
      "asturias_foundation_711"
    ],
    "requirements": {
      "provinces": [
        "oviedo"
      ]
    },
    "provinceIds": [
      "oviedo"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "asturias_foundation_711_rebelling",
        "trigger": "rebelling",
        "reach": "local",
        "name": "A local revolt is underway",
        "text": "A real local revolt now contests authority around Oviedo. Keep household choices tied to the fighting and current residence.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "asturias_foundation_711_founded",
        "trigger": "founded",
        "reach": "local",
        "name": "A new local court is established",
        "text": "A court has actually formed here. Review your household’s position under the new local authority; this report grants no land, office or safe route.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "asturias_foundation_711_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The local attempt ends",
        "text": "The attempt to establish a court has ended without founding it. Ordinary control and household rights still govern your choices.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "asturias_foundation_711_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The foundation opportunity closes",
        "text": "Changed circumstances close the foundation opportunity. A northern destination is safe only if ordinary travel and current conditions permit it.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_divisio_800": {
    "id": "household_effects_divisio_800",
    "type": "household_observer",
    "title": "A household beside the inheritance plan",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "divisio_800",
    "requires": [
      "divisio_800"
    ],
    "requirements": {
      "provinces": [
        "aachen",
        "bordeaux",
        "pavia"
      ]
    },
    "provinceIds": [
      "aachen",
      "bordeaux",
      "pavia"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "divisio_800_agreed",
        "trigger": "agreed",
        "reach": "local",
        "name": "An inheritance plan is agreed",
        "text": "The court has agreed a future inheritance plan. The present ruler still governs; your household’s property has not been divided by this plan.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "divisio_800_executed",
        "trigger": "executed",
        "reach": "local",
        "name": "The surviving inheritance shares take effect",
        "text": "Succession has allowed the surviving regional shares to separate. Review current authority and existing obligations rather than assuming a new household assessment.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "divisio_800_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "divisio_800_expired",
        "trigger": "expired",
        "reach": "previous",
        "name": "The opportunity expires",
        "text": "The public opportunity has expired. No unfinished household commission or travel booking is created by this report.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "divisio_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "divisio_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_ordinatio_800": {
    "id": "household_effects_ordinatio_800",
    "type": "household_observer",
    "title": "A household beside the imperial arrangement",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "ordinatio_800",
    "requires": [
      "ordinatio_800"
    ],
    "requirements": {
      "provinces": [
        "aachen",
        "bordeaux",
        "regensburg"
      ]
    },
    "provinceIds": [
      "aachen",
      "bordeaux",
      "regensburg"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "ordinatio_800_agreed",
        "trigger": "agreed",
        "reach": "local",
        "name": "Living heirs receive regional government",
        "text": "The court has designated a successor and granted regional government to living younger heirs. Household property and dues retain their ordinary terms.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "ordinatio_800_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "ordinatio_800_expired",
        "trigger": "expired",
        "reach": "previous",
        "name": "The opportunity expires",
        "text": "The public opportunity has expired. No unfinished household commission or travel booking is created by this report.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "ordinatio_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "ordinatio_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_gifts_800": {
    "id": "household_effects_gifts_800",
    "type": "household_observer",
    "title": "A household beside the exchange of gifts",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "gifts_800",
    "requires": [
      "gifts_800"
    ],
    "requirements": {
      "provinces": [
        "aachen",
        "baghdad"
      ]
    },
    "provinceIds": [
      "aachen",
      "baghdad"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "gifts_800_agreed",
        "trigger": "agreed",
        "reach": "local",
        "name": "The courts complete their exchange",
        "text": "The courts have funded their gifts and concluded a limited peace. Household work remains an ordinary choice; the public exchange offers no private wage.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gifts_800_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gifts_800_expired",
        "trigger": "expired",
        "reach": "previous",
        "name": "The opportunity expires",
        "text": "The public opportunity has expired. No unfinished household commission or travel booking is created by this report.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gifts_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "gifts_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_recognition_800": {
    "id": "household_effects_recognition_800",
    "type": "household_observer",
    "title": "A household beside the Adriatic agreement",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "recognition_800",
    "requires": [
      "recognition_800"
    ],
    "requirements": {
      "provinces": [
        "aachen",
        "constantinople",
        "venezia",
        "split"
      ]
    },
    "provinceIds": [
      "aachen",
      "constantinople",
      "venezia",
      "split"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "recognition_800_agreed",
        "trigger": "agreed",
        "reach": "local",
        "name": "The imperial agreement is completed",
        "text": "The courts have concluded their recognition agreement. Review current local government and your existing records; recognition itself promises no new private right.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "recognition_800_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "recognition_800_expired",
        "trigger": "expired",
        "reach": "previous",
        "name": "The opportunity expires",
        "text": "The public opportunity has expired. No unfinished household commission or travel booking is created by this report.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "recognition_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "recognition_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_verdun_800": {
    "id": "household_effects_verdun_800",
    "type": "household_observer",
    "title": "A household beside the surviving brothers’ settlement",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "verdun_800",
    "requires": [
      "verdun_800"
    ],
    "requirements": {
      "provinces": [
        "aachen",
        "bordeaux",
        "regensburg",
        "paris"
      ]
    },
    "provinceIds": [
      "aachen",
      "bordeaux",
      "regensburg",
      "paris"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "verdun_800_pressure",
        "trigger": "pressure",
        "reach": "local",
        "name": "The regional dispute becomes a real war",
        "text": "A recorded regional dispute has become an ordinary war. Check actual armies and current local control before changing household plans.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "verdun_800_agreed",
        "trigger": "agreed",
        "reach": "local",
        "name": "The surviving courts agree a division",
        "text": "The living parties have concluded their territorial agreement. Review current authority while retaining your household’s existing property and obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "verdun_800_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "verdun_800_expired",
        "trigger": "expired",
        "reach": "previous",
        "name": "The opportunity expires",
        "text": "The public opportunity has expired. No unfinished household commission or travel booking is created by this report.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "verdun_800_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "verdun_800_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_thessalonica_partition_1204": {
    "id": "household_effects_thessalonica_partition_1204",
    "type": "household_observer",
    "title": "A household beneath the Thessalonican grant",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "thessalonica_partition_1204",
    "requires": [
      "thessalonica_partition_1204"
    ],
    "requirements": {
      "provinces": [
        "thessaloniki"
      ]
    },
    "provinceIds": [
      "thessaloniki"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "thessalonica_partition_1204_granted",
        "trigger": "granted",
        "reach": "local",
        "name": "An accepted grant changes local lordship",
        "text": "The living parties have completed a grant here. Review the actual new holder and existing household rights; this notice establishes no invented local dues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "thessalonica_partition_1204_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "thessalonica_partition_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "thessalonica_partition_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_athens_partition_1204": {
    "id": "household_effects_athens_partition_1204",
    "type": "household_observer",
    "title": "A household beneath the Athenian grant",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "athens_partition_1204",
    "requires": [
      "athens_partition_1204"
    ],
    "requirements": {
      "provinces": [
        "athens"
      ]
    },
    "provinceIds": [
      "athens"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "athens_partition_1204_granted",
        "trigger": "granted",
        "reach": "local",
        "name": "An accepted grant changes local lordship",
        "text": "The living parties have completed a grant here. Review the actual new holder and existing household rights; this notice establishes no invented local dues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "athens_partition_1204_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "athens_partition_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "athens_partition_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_achaia_partition_1204": {
    "id": "household_effects_achaia_partition_1204",
    "type": "household_observer",
    "title": "A household beneath the Achaean grant",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "achaia_partition_1204",
    "requires": [
      "achaia_partition_1204"
    ],
    "requirements": {
      "provinces": [
        "sparta"
      ]
    },
    "provinceIds": [
      "sparta"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "achaia_partition_1204_granted",
        "trigger": "granted",
        "reach": "local",
        "name": "An accepted grant changes local lordship",
        "text": "The living parties have completed a grant here. Review the actual new holder and existing household rights; this notice establishes no invented local dues.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "achaia_partition_1204_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The proposal is declined",
        "text": "The public proposal was declined. Review the current situation and keep any completed household transactions in force.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "achaia_partition_1204_interrupted",
        "trigger": "interrupted",
        "reach": "previous",
        "name": "Changed parties close the proposal",
        "text": "Changed parties interrupt the public proposal. Keep household plans tied to the present courts and their ordinary obligations.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "achaia_partition_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "Changed circumstances close the proposal",
        "text": "The proposal takes another course. Existing private rights and completed payments retain their ordinary meaning.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  },
  "household_effects_fifth_crusade_call_1204": {
    "id": "household_effects_fifth_crusade_call_1204",
    "type": "household_observer",
    "title": "A household beside the live religious call",
    "intro": "Local developments give your household decisions to consider. Public agreements and ordinary household obligations keep their own terms.",
    "sourceStoryId": "fifth_crusade_call_1204",
    "requires": [
      "fifth_crusade_call_1204"
    ],
    "requirements": {
      "provinces": [
        "jerusalem",
        "acre",
        "antioch",
        "damascus",
        "aleppo",
        "edessa"
      ]
    },
    "provinceIds": [
      "jerusalem",
      "acre",
      "antioch",
      "damascus",
      "aleppo",
      "edessa"
    ],
    "expiryTurns": 90,
    "beats": [
      {
        "id": "fifth_crusade_call_1204_called",
        "trigger": "called",
        "reach": "local",
        "name": "A live call names this place as an objective",
        "text": "The current religious call includes this place among its actual objectives. Your household keeps its own faith and ordinary choices; this report imposes no vow or contribution.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "fifth_crusade_call_1204_won",
        "trigger": "won",
        "reach": "local",
        "name": "The matching campaign reaches its settlement",
        "text": "The campaign answering this call has recorded a victorious settlement. Review actual local control and household rights; the report promises no private reward.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "fifth_crusade_call_1204_failed",
        "trigger": "failed",
        "reach": "previous",
        "name": "The live call has ended",
        "text": "The campaign answering this call is closed without its intended victory. A missing campaign record closes the notice only; it establishes no casualties or household loss.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "fifth_crusade_call_1204_declined",
        "trigger": "declined",
        "reach": "previous",
        "name": "The religious head declines the opportunity",
        "text": "The dated opportunity was declined. No household contribution or vow is charged by closing this report.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      },
      {
        "id": "fifth_crusade_call_1204_diverted",
        "trigger": "diverted",
        "reach": "previous",
        "name": "The dated call opportunity closes",
        "text": "Changed eligibility closes the opportunity. The household incurs no invented vow, cost or punishment.",
        "choices": [
          {
            "id": "records",
            "label": "Review household records",
            "detail": "Compare the report with your existing rights and obligations. No money or action days.",
            "operation": "review_records"
          },
          {
            "id": "continue",
            "label": "Return to household life",
            "detail": "Acknowledge this report and continue with ordinary work, family and travel choices.",
            "operation": "continue_livelihood"
          }
        ]
      }
    ]
  }
};
(function () {
  'use strict';
  Object.assign(FBDATA.storyInstances, FBDATA.householdEffects_711_800_1204);
  ['711','800','1204'].forEach(function (id) {
    var raw = FBDATA.bookmarks[id], original = (raw.stories || []).slice();
    function attach(bookmark, inherited) {
      var stories = (bookmark.stories || inherited).slice();
      Object.keys(FBDATA.householdEffects_711_800_1204).forEach(function (key) {
        var def = FBDATA.householdEffects_711_800_1204[key];
        if (stories.indexOf(def.sourceStoryId) >= 0 && stories.indexOf(key) < 0) stories.push(key);
      });
      bookmark.stories = stories;
    }
    attach(raw, original);
    var baseline = Object.assign({}, raw, raw.revisions && raw.revisions.baseline);
    Object.keys(raw.revisions || {}).forEach(function (revision) { attach(raw.revisions[revision], baseline.stories); });
  });
})();
