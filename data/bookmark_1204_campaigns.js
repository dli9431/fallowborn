FB.bookmarkSources.stage({"source":"data/bookmark_1204_campaigns.js","bookmarks":["1204"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Conditional 1204 opportunities use shared campaign and history factories.
   The engine owns war eligibility, hosts, succession, peace and save repair.
   No fixed-date transfers, invented coalition battles or Mongol spawning. */
window.FBDATA = window.FBDATA || {};
FBDATA.bookmarkContent['1204'].campaigns = {
  "latin_thessalonica_1204": {
    "id": "latin_thessalonica_1204",
    "type": "campaign",
    "name": "The Latin March into Macedonia",
    "desc": "Boniface of Montferrat wants Thessalonica, where the deposed emperor Alexios III holds a Greek court. The crusaders mean to take the city for their new empire.",
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
    "requires": ["thessalonica_partition_1204"],
    "name": "The Bithynian Partition Claim",
    "desc": "The crusaders’ partition gave Bithynia to the Latin crown, but Theodore Laskaris holds Nicaea and rallies the Greeks there.",
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
    "desc": "The Laskarid court at Nicaea wants Constantinople back from the Latins and, with it, the seat of the Greek emperors.",
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
    "desc": "The Latins rebuffed Kaloyan’s overtures, and the Greeks of Thrace chafe under their new masters. Bulgaria wants Adrianople from the Latin Empire.",
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
    "desc": "The Komnenos Doukas court of Epirus wants Thessalonica, a prize that would put it at the head of the Greek revival.",
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
    "desc": "Alfonso VIII of Castile is renewing the war in the south and wants Cordoba from the Almohad Caliphate.",
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
    "desc": "Portugal wants Silves back from the Almohads, who retook the Algarve town in 1191 after the Portuguese crown had held it for two years.",
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
    "desc": "The Crown of Aragon looks south to Valencia and wants its rich coast and farmland under Aragonese rule.",
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
    "desc": "Philip Augustus wants to finish taking Normandy from King John, whose Angevin court still holds Rouen.",
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
  },
  "thessalonica_partition_1204": {
    "id":"thessalonica_partition_1204", "type":"partition",
    "name":"Boniface's Thessalonican Settlement",
    "desc":"Boniface of Montferrat, passed over for the imperial crown, wants Thessalonica as his own {term:kingdom} under the Latin emperor. The emperor must hold the city in peace before he can grant it.",
    "firstDate":{"year":1204,"season":1,"day":60},
    "lastDate":{"year":1206,"season":3,"day":90},
    "actor":{"realmId":"latin_1204","capital":"constantinople"},
    "beneficiary":{"name":"Boniface of Montferrat","dyn":"of Montferrat","sex":"m","born":1150,"culture":"lombard","religion":"catholic","trait":"ambitious"},
    "grant":{"realmId":"thessalonica_latin_1204","liege":"latin_1204","capital":"thessaloniki","rank":3,"kind":"kingdom","place":"Thessalonica","counties":["thessaloniki"]},
    "news":{
      "granted":{"key":"news.1204.thessalonica_partition_1204.granted","text":"Boniface of Montferrat accepts the Thessalonican settlement beneath the Latin emperor. Possession and consent turn the claim into a kingdom."},
      "declined":{"key":"news.1204.thessalonica_partition_1204.declined","text":"The Thessalonican partition is declined. The current holdings remain with their holders."},
      "diverted":{"key":"news.1204.thessalonica_partition_1204.diverted","text":"The opportunity for Boniface's Thessalonican settlement closes without a grant."},
      "interrupted":{"key":"news.1204.thessalonica_partition_1204.interrupted","text":"Changed parties or possession interrupt Boniface's Thessalonican settlement."}
    }
  },
  "athens_partition_1204": {
    "id":"athens_partition_1204", "type":"partition",
    "name":"Othon's Athenian Lordship",
    "desc":"Othon de la Roche, who followed Boniface of Montferrat into Greece, wants Athens as a lordship of his own beneath the Thessalonican crown.",
    "firstDate":{"year":1205,"season":0,"day":1},
    "lastDate":{"year":1208,"season":3,"day":90},
    "requires":["thessalonica_partition_1204"], "parentStoryId":"thessalonica_partition_1204",
    "actor":{"realmId":"latin_1204","capital":"constantinople"},
    "beneficiary":{"name":"Othon de la Roche","dyn":"de la Roche","sex":"m","born":1170,"culture":"frankish","religion":"catholic"},
    "grant":{"realmId":"athens_latin_1204","liege":"thessalonica_latin_1204","capital":"athens","rank":2,"kind":"duchy","place":"Athens","counties":["athens"]},
    "news":{
      "granted":{"key":"news.1204.athens_partition_1204.granted","text":"Othon de la Roche receives the Athenian lordship beneath the Thessalonican crown through an accepted partition."},
      "declined":{"key":"news.1204.athens_partition_1204.declined","text":"Othon's proposed Athenian grant is declined. Possession remains unchanged."},
      "diverted":{"key":"news.1204.athens_partition_1204.diverted","text":"History takes another course: the opportunity for Othon's Athenian lordship closes."},
      "interrupted":{"key":"news.1204.athens_partition_1204.interrupted","text":"Changed parties or possession interrupt Othon's proposed Athenian grant."}
    }
  },
  "achaia_partition_1204": {
    "id":"achaia_partition_1204", "type":"partition",
    "name":"William's Achaean Principality",
    "desc":"William of Champlitte wants an Achaean principality in the Morea, beneath the Thessalonican crown, as his reward for the campaign in Greece.",
    "firstDate":{"year":1205,"season":0,"day":1},
    "lastDate":{"year":1208,"season":3,"day":90},
    "requires":["thessalonica_partition_1204"], "parentStoryId":"thessalonica_partition_1204",
    "actor":{"realmId":"latin_1204","capital":"constantinople"},
    "beneficiary":{"name":"William of Champlitte","dyn":"of Champlitte","sex":"m","born":1160,"culture":"frankish","religion":"catholic"},
    "grant":{"realmId":"achaia_latin_1204","liege":"thessalonica_latin_1204","capital":"sparta","rank":2,"kind":"duchy","place":"Achaea","counties":["sparta"]},
    "news":{
      "granted":{"key":"news.1204.achaia_partition_1204.granted","text":"William of Champlitte receives the conquered Morean county as an Achaean principality beneath the Thessalonican crown. Corinth remains outside the grant."},
      "declined":{"key":"news.1204.achaia_partition_1204.declined","text":"William's proposed Achaean grant is declined. Possession remains unchanged."},
      "diverted":{"key":"news.1204.achaia_partition_1204.diverted","text":"History takes another course: the opportunity for William's Achaean principality closes."},
      "interrupted":{"key":"news.1204.achaia_partition_1204.interrupted","text":"Changed parties or possession interrupt William's proposed Achaean grant."}
    }
  },
  "latin_athens_1204": {
    "id":"latin_athens_1204", "type":"campaign", "name":"The Latin March into Athens",
    "desc":"The Latin court wants Athens from Leo Sgouros to open central Greece to the crusaders, and Othon de la Roche hopes to rule it.",
    "firstYear":1205,"lastYear":1208,"durationDays":1080,
    "actor":{"realmId":"latin_1204"},
    "target":{"provinceId":"athens","ownerIds":["sgouros_1204"]},
    "conditions":[{"kind":"owner","provinceId":"constantinople","realmId":"latin_1204"},{"kind":"owner","provinceId":"thessaloniki","realmId":"latin_1204"}],
    "news":{
      "started":{"key":"news.1204.latin_athens_1204.started","text":"The court of {realm} opens a campaign for {province}. The proposed partition grants no possession."},
      "won":{"key":"news.1204.latin_athens_1204.won","text":"The court of {realm} secures {province} through its campaign."},
      "failed":{"key":"news.1204.latin_athens_1204.failed","text":"The campaign of {realm} ends without securing {province}."},
      "diverted":{"key":"news.1204.latin_athens_1204.diverted","text":"Changed possession closes the opportunity for {realm} to contest {province}."},
      "interrupted":{"key":"news.1204.latin_athens_1204.interrupted","text":"A change of court interrupts the campaign of {realm} for {province}."}
    }
  },
  "latin_achaia_1204": {
    "id":"latin_achaia_1204", "type":"campaign", "name":"The Latin Morean Campaign",
    "desc":"The Latin court wants Sparta from the Greeks of the Morea to carry the crusade into the Peloponnese, and William of Champlitte hopes to rule what they win.",
    "firstYear":1205,"lastYear":1208,"durationDays":1080,
    "actor":{"realmId":"latin_1204"},
    "target":{"provinceId":"sparta","ownerIds":["morea_1204"]},
    "conditions":[{"kind":"owner","provinceId":"constantinople","realmId":"latin_1204"},{"kind":"owner","provinceId":"thessaloniki","realmId":"latin_1204"}],
    "news":{
      "started":{"key":"news.1204.latin_achaia_1204.started","text":"The court of {realm} opens a campaign for {province}. The proposed partition grants no possession."},
      "won":{"key":"news.1204.latin_achaia_1204.won","text":"The court of {realm} secures {province} through its campaign."},
      "failed":{"key":"news.1204.latin_achaia_1204.failed","text":"The campaign of {realm} ends without securing {province}."},
      "diverted":{"key":"news.1204.latin_achaia_1204.diverted","text":"Changed possession closes the opportunity for {realm} to contest {province}."},
      "interrupted":{"key":"news.1204.latin_achaia_1204.interrupted","text":"A change of court interrupts the campaign of {realm} for {province}."}
    }
  },
  "fifth_crusade_call_1204": {
    "id":"fifth_crusade_call_1204", "type":"holy_war", "systemId":"great_holy_wars",
    "name":"The Fifth Crusade Call",
    "desc":"From 1213 Innocent III preaches a new crusade for the Holy Land, renewed at the Lateran Council of 1215. Whoever is pope then decides whether to call it.",
    "firstDate":{"year":1213,"season":0,"day":1},
    "lastDate":{"year":1215,"season":3,"day":90},
    "religion":"catholic","target":{"kingdomId":"syria"},
    "historySeed":[
      {"id":"crusade_first_1099","date":{"year":1099,"season":1,"day":45},"target":"syria","outcome":"attackers"},
      {"id":"crusade_second_1149","date":{"year":1149,"season":0,"day":1},"target":"syria","outcome":"defenders"},
      {"id":"crusade_third_1192","date":{"year":1192,"season":2,"day":1},"target":"syria","outcome":"partial"},
      {"id":"crusade_fourth_1204","date":{"year":1204,"season":0,"day":43},"target":"hellas","outcome":"diverted"}
    ],
    "news":{
      "called":{"key":"news.1204.fifth_crusade_call_1204.called","text":"The current Catholic head answers the dated appeal for a Fifth Crusade. Authority and hostile objectives permit a call; the armies must still gather and fight."},
      "won":{"key":"news.1204.fifth_crusade_call_1204.won","text":"The campaign answering the Fifth Crusade appeal reaches a victorious settlement."},
      "failed":{"key":"news.1204.fifth_crusade_call_1204.failed","text":"The campaign answering the Fifth Crusade appeal ends without its intended victory."},
      "declined":{"key":"news.1204.fifth_crusade_call_1204.declined","text":"The current Catholic head declines the dated Fifth Crusade appeal."},
      "diverted":{"key":"news.1204.fifth_crusade_call_1204.diverted","text":"The dated Fifth Crusade opportunity closes as history takes another course."}
    }
  }
};
Object.assign(FBDATA.storyCampaigns, FBDATA.bookmarkContent['1204'].campaigns);
FBDATA.bookmarkCandidates['1204'].stories = FBDATA.bookmarkCandidates['1204'].stories.concat(
  Object.keys(FBDATA.bookmarkContent['1204'].campaigns));
});
