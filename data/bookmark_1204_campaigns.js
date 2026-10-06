/* Conditional 1204 opportunities use the registered campaign factory.
   The engine owns war eligibility, hosts, succession, peace and save repair.
   No fixed-date transfers, invented coalition battles or Mongol spawning. */
window.FBDATA = window.FBDATA || {};
FBDATA.bookmarkContent['1204'].campaigns = {
  "latin_thessalonica_1204": {
    "id": "latin_thessalonica_1204",
    "type": "campaign",
    "name": "The Latin March into Macedonia",
    "desc": "The crusader court may contest Greek Thessalonica after the fall of Constantinople. The partition alone grants no county.",
    "firstYear": 1204,
    "lastYear": 1206,
    "durationDays": 1440,
    "actor": {
      "realmId": "latin_1204"
    },
    "target": {
      "provinceId": "thessaloniki",
      "ownerIds": [
        "thessalonica_1204"
      ]
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "constantinople",
        "realmId": "latin_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.latin_thessalonica_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.latin_thessalonica_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.latin_thessalonica_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.latin_thessalonica_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.latin_thessalonica_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "latin_bithynia_1204": {
    "id": "latin_bithynia_1204",
    "type": "campaign",
    "name": "The Bithynian Partition Claim",
    "desc": "The Latin court may press its projected Asian allotment against Nicaea. Laskarid possession must be overcome by an ordinary campaign.",
    "firstYear": 1204,
    "lastYear": 1208,
    "durationDays": 1440,
    "actor": {
      "realmId": "latin_1204"
    },
    "target": {
      "provinceId": "nicaea",
      "ownerIds": [
        "nicaea_1204"
      ]
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "constantinople",
        "realmId": "latin_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.latin_bithynia_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.latin_bithynia_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.latin_bithynia_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.latin_bithynia_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.latin_bithynia_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "nicaean_return_1204": {
    "id": "nicaean_return_1204",
    "type": "campaign",
    "name": "The Nicaean Road to Constantinople",
    "desc": "The Laskarid court may contest the Latin capital while it retains Nicaea. Restoration depends on armies and actual possession.",
    "firstYear": 1205,
    "lastYear": 1261,
    "durationDays": 1440,
    "actor": {
      "realmId": "nicaea_1204"
    },
    "target": {
      "provinceId": "constantinople",
      "ownerIds": [
        "latin_1204"
      ]
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "nicaea",
        "realmId": "nicaea_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.nicaean_return_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.nicaean_return_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.nicaean_return_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.nicaean_return_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.nicaean_return_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "bulgarian_thrace_1204": {
    "id": "bulgarian_thrace_1204",
    "type": "campaign",
    "name": "The Bulgarian Challenge in Thrace",
    "desc": "The Bulgarian court may challenge Latin possession of Adrianople while its own northern seat survives.",
    "firstYear": 1205,
    "lastYear": 1208,
    "durationDays": 1440,
    "actor": {
      "realmId": "bulgaria_1204"
    },
    "target": {
      "provinceId": "adrianople",
      "ownerIds": [
        "latin_1204"
      ]
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "pliska",
        "realmId": "bulgaria_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.bulgarian_thrace_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.bulgarian_thrace_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.bulgarian_thrace_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.bulgarian_thrace_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.bulgarian_thrace_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "epirote_macedonia_1204": {
    "id": "epirote_macedonia_1204",
    "type": "campaign",
    "name": "The Epirote Road to Thessalonica",
    "desc": "The Epirote court may seek Thessalonica from its current ruler. No date guarantees a Greek restoration.",
    "firstYear": 1215,
    "lastYear": 1225,
    "durationDays": 1440,
    "actor": {
      "realmId": "epirus_1204"
    },
    "target": {
      "provinceId": "thessaloniki"
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "ioannina",
        "realmId": "epirus_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.epirote_macedonia_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.epirote_macedonia_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.epirote_macedonia_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.epirote_macedonia_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.epirote_macedonia_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "castilian_frontier_1204": {
    "id": "castilian_frontier_1204",
    "type": "campaign",
    "name": "The Castilian Southern Campaign",
    "desc": "Castile may contest Almohad Cordoba during the renewed southern campaigns. This is a county objective, not a predetermined battle or coalition victory.",
    "firstYear": 1211,
    "lastYear": 1214,
    "durationDays": 1440,
    "actor": {
      "realmId": "castile_1204"
    },
    "target": {
      "provinceId": "cordoba",
      "ownerIds": [
        "almohad_1204"
      ]
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "burgos",
        "realmId": "castile_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.castilian_frontier_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.castilian_frontier_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.castilian_frontier_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.castilian_frontier_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.castilian_frontier_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "portuguese_algarve_1204": {
    "id": "portuguese_algarve_1204",
    "type": "campaign",
    "name": "The Portuguese Algarve Campaign",
    "desc": "Portugal may renew its campaign toward Silves while Coimbra remains in its hands. A conquest still requires the ordinary army and peace terms.",
    "firstYear": 1206,
    "lastYear": 1212,
    "durationDays": 1440,
    "actor": {
      "realmId": "portugal_1204"
    },
    "target": {
      "provinceId": "silves",
      "ownerIds": [
        "almohad_1204"
      ]
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "coimbra",
        "realmId": "portugal_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.portuguese_algarve_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.portuguese_algarve_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.portuguese_algarve_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.portuguese_algarve_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.portuguese_algarve_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "aragonese_valencia_1204": {
    "id": "aragonese_valencia_1204",
    "type": "campaign",
    "name": "The Aragonese Valencia Campaign",
    "desc": "The Aragonese crown may contest Valencia from its current ruler in a later generation. The realm must survive and keep its opening seat.",
    "firstYear": 1229,
    "lastYear": 1238,
    "durationDays": 1440,
    "actor": {
      "realmId": "aragon_1204"
    },
    "target": {
      "provinceId": "valencia"
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "zaragoza",
        "realmId": "aragon_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.aragonese_valencia_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.aragonese_valencia_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.aragonese_valencia_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.aragonese_valencia_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.aragonese_valencia_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  },
  "capetian_normandy_1204": {
    "id": "capetian_normandy_1204",
    "type": "campaign",
    "name": "The Capetian Normandy Campaign",
    "desc": "France may complete its campaign against the Angevin court at Rouen. The spring opening retains Norman possession until a campaign changes it.",
    "firstYear": 1204,
    "lastYear": 1206,
    "durationDays": 1440,
    "actor": {
      "realmId": "france_1204"
    },
    "target": {
      "provinceId": "rouen",
      "ownerIds": [
        "england_1204"
      ]
    },
    "conditions": [
      {
        "kind": "owner",
        "provinceId": "paris",
        "realmId": "france_1204"
      }
    ],
    "news": {
      "started": {
        "key": "news.1204.capetian_normandy_1204.started",
        "text": "The court of {realm} opens a campaign for {province}. Possession depends on the fighting."
      },
      "won": {
        "key": "news.1204.capetian_normandy_1204.won",
        "text": "The court of {realm} secures {province} through its campaign."
      },
      "failed": {
        "key": "news.1204.capetian_normandy_1204.failed",
        "text": "The campaign of {realm} ends without securing {province}."
      },
      "diverted": {
        "key": "news.1204.capetian_normandy_1204.diverted",
        "text": "The opportunity for {realm} to contest {province} closes as control changes."
      },
      "interrupted": {
        "key": "news.1204.capetian_normandy_1204.interrupted",
        "text": "A change of court interrupts the campaign of {realm} for {province}."
      }
    }
  }
};
Object.assign(FBDATA.storyCampaigns, FBDATA.bookmarkContent['1204'].campaigns);
FBDATA.bookmarkCandidates['1204'].stories = Object.keys(FBDATA.bookmarkContent['1204'].campaigns);
