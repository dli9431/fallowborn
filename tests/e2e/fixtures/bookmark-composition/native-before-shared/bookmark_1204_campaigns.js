/* Conditional 1204 opportunities use shared campaign and history factories.
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
    "requires": ["thessalonica_partition_1204"],
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
  },
  "thessalonica_partition_1204": {
    "id":"thessalonica_partition_1204", "type":"partition",
    "name":"Boniface's Thessalonican Settlement",
    "desc":"Boniface of Montferrat seeks a kingdom beneath the Latin emperor. The projected partition grants no land: the imperial court must first hold Thessalonica directly and peacefully, and all living parties must accept.",
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
    "desc":"Othon de la Roche seeks Athens beneath Boniface's Thessalonican crown. Only a completed Thessalonican settlement, actual peaceful imperial possession of Athens and the consent of the living courts can establish this lordship.",
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
    "desc":"William of Champlitte seeks an Achaean principality beneath the Thessalonican crown. The map's coarse Morea county at Sparta must actually be won and held before an accepted grant. It represents the wider Morean campaign rather than exact 1205 borders; Corinth is excluded.",
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
    "desc":"After securing Thessalonica, the Latin court may contest Athens. Fighting determines possession; Othon's proposed lordship requires a separate accepted partition.",
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
    "desc":"After securing Thessalonica, the Latin court may contest the mapped Morean county at Sparta. A victory supplies actual possession for William's separate partition opportunity. This coarse county represents a regional campaign, not an exact historical border.",
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
    "desc":"The appeals begun in 1213 and renewed at the Fourth Lateran Council open a conditional call for the Holy Land. The current Catholic head must have authority and an eligible hostile target. The existing campaign rules govern preparation, fighting and settlement; this opportunity promises no victory or Egyptian expedition.",
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
