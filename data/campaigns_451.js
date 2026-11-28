FB.bookmarkSources.stage({source:'data/campaigns_451.js',bookmarks:['451'],catalogs:[],shared:[]}, function (FBDATA) {
/* Windows admit reviews; ordinary transactions alone determine outcomes. */
FBDATA.storyCampaigns451 = {
  "western_objective_451": {
    "id": "western_objective_451",
    "type": "campaign",
    "name": "The march on Aurelianum",
    "desc": "In 451 the coalition can march on Aurelianum, held by the western court. The members must agree, and the host must take the city by force.",
    "firstYear": 451,
    "lastYear": 452,
    "durationDays": 180,
    "actor": {
      "realmId": "hunnic_coalition_451"
    },
    "target": {
      "provinceId": "orleans",
      "ownerIds": [
        "italy"
      ]
    },
    "admission": {
      "schema": 1,
      "mode": "ordinary_declaration",
      "cause": "aggression"
    },
    "mobileReview": {
      "schema": 1
    },
    "conditions": [],
    "news": {
      "started": {
        "key": "news.451.western_objective.started",
        "text": "The coalition has opened an ordinary campaign for Aurelianum. Its armies must still reach and secure the objective."
      },
      "won": {
        "key": "news.451.western_objective.won",
        "text": "The coalition secured its western objective through actual war. Settlement and the following’s future remain separate decisions."
      },
      "failed": {
        "key": "news.451.western_objective.failed",
        "text": "The western campaign ended without securing its objective. Ordinary war and member cohesion retain their consequences."
      },
      "diverted": {
        "key": "news.451.western_objective.diverted",
        "text": "Changed control or a declined opportunity closed this western campaign."
      },
      "interrupted": {
        "key": "news.451.western_objective.interrupted",
        "text": "Changed leadership or authority interrupted this western campaign."
      }
    }
  },
  "gallic_relocation_451": {
    "id": "gallic_relocation_451",
    "type": "civilian_migration",
    "requires": [
      "western_objective_451"
    ],
    "name": "Relocation after the western fighting",
    "desc": "If the coalition’s march fails, the western court may move some Gallo-Roman Nicene families from the fought-over city of Aurelianum to Parisii. No source records this evacuation.",
    "firstYear": 451,
    "lastYear": 453,
    "actor": {
      "realmId": "italy"
    },
    "community": {
      "culture": "gallo_roman",
      "religion": "nicene"
    },
    "share": 0.1,
    "batchSize": 100,
    "routes": [
      {
        "from": "orleans",
        "to": "paris"
      }
    ],
    "conditions": [
      {
        "kind": "story_result",
        "storyId": "western_objective_451",
        "result": "failed"
      },
      {
        "kind": "owner",
        "provinceId": "orleans",
        "realmId": "italy"
      },
      {
        "kind": "owner",
        "provinceId": "paris",
        "realmId": "italy"
      }
    ]
  }
};
FBDATA.bookmarkWorldStories451 = ['western_objective_451','gallic_relocation_451'];
});
