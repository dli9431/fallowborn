/* Historical foundations are opportunities, not calendar deadlines. */
window.FBDATA = window.FBDATA || {};
FBDATA.historicalAmbitions = [
  { id:'normandy', news:'{realm} establishes Normandy.', name:'Establish Normandy',
    desc:'Give a Norse foothold around Rouen a lasting place among the duchies.',
    region:'normandy', tier:5, culture:'norse', capital:'rouen', share:0.5,
    prestige:150, bonus:'tax', amount:0.1, days:1800, foundedYear:911 },
  { id:'norway', news:'{realm} unifies Norway.', name:'Unify Norway',
    desc:'Bring the Norwegian lands together beneath one recognized crown.',
    region:'norway', tier:6, share:0.75,
    prestige:250, bonus:'levy', amount:0.1, days:1800, foundedYear:872 },
  { id:'england', news:'{realm} unites England.', name:'Unite England',
    desc:'Bind the English kingdoms into a lasting royal settlement.',
    region:'england', tier:6, share:0.75,
    prestige:250, bonus:'tax', amount:0.1, days:1800, foundedYear:927 },
  { id:'sicily', news:'{realm} establishes the Sicilian crown.', name:'Establish the Sicilian crown',
    desc:'Unite the island and southern mainland under the Sicilian crown.',
    region:'sicily', tier:6, share:0.5, island:'sicily',
    mainland:['apulia','calabria'],
    prestige:200, bonus:'tax', amount:0.1, days:1800, foundedYear:1130 }
];

/* Agency policy values keep the bounded canonical decision algorithms shared. */
FBDATA.agencyRules = {
  "hostileLiegeFavor": -20,
  "secureFamilySize": 2,
  "marriageAimAge": 45,
  "relationYears": 8,
  "familyProgressChance": 0.55,
  "familyProgressSteps": 3,
  "familyPrestige": 3,
  "familyRequestChance": 0.35,
  "familyRequestAge": 10,
  "rebelChance": 0.14,
  "rebelRegardMax": 20,
  "rebelFavorMax": -15,
  "rebelYears": 5,
  "rebelMultiplier": 1.75,
  "approachChance": 0.45,
  "approachCooldownYears": 4,
  "marriagePriority": 25,
  "aims": {
    "secure_dynasty": {
      "cultivation": 3,
      "peerCultivation": 1,
      "sponsorRebels": false,
      "courtshipBonus": 0.12,
      "liegeGrantBonus": 0,
      "countyPetitionBonus": 0,
      "intrigueAggression": 0,
      "intrigueRestraint": 0,
      "marriageApproach": true,
      "marriageScore": 20,
      "conversionMotivations": [],
      "coerciveFaith": false,
      "conversionFaithScore": 0,
      "conversionScore": 0,
      "motions": []
    },
    "expand_realm": {
      "cultivation": -2,
      "peerCultivation": -1,
      "sponsorRebels": true,
      "courtshipBonus": 0,
      "liegeGrantBonus": 0.04,
      "countyPetitionBonus": 0.05,
      "intrigueAggression": 0.5,
      "intrigueRestraint": 0,
      "marriageApproach": false,
      "marriageScore": 0,
      "conversionMotivations": [],
      "coerciveFaith": false,
      "conversionFaithScore": 0,
      "conversionScore": 0,
      "motions": [
        {
          "motion": "war_authorization",
          "value": 14
        },
        {
          "motion": "war_condemnation",
          "value": -10
        },
        {
          "family": "service",
          "value": -10
        }
      ]
    },
    "amass_wealth": {
      "cultivation": 1,
      "peerCultivation": 1,
      "sponsorRebels": false,
      "courtshipBonus": 0,
      "liegeGrantBonus": 0,
      "countyPetitionBonus": 0,
      "intrigueAggression": 0.5,
      "intrigueRestraint": 0,
      "marriageApproach": false,
      "marriageScore": 0,
      "conversionMotivations": [],
      "coerciveFaith": false,
      "conversionFaithScore": 0,
      "conversionScore": 0,
      "motions": [
        {
          "family": "commerce",
          "value": 12
        },
        {
          "motion": "emergency_subsidy",
          "value": -8
        }
      ]
    },
    "defend_faith": {
      "cultivation": 1,
      "peerCultivation": 1,
      "sponsorRebels": false,
      "courtshipBonus": 0,
      "liegeGrantBonus": 0,
      "countyPetitionBonus": 0,
      "intrigueAggression": 0,
      "intrigueRestraint": 0,
      "marriageApproach": false,
      "marriageScore": 0,
      "conversionMotivations": [
        "faith"
      ],
      "coerciveFaith": true,
      "conversionFaithScore": 20,
      "conversionScore": 0,
      "motions": [
        {
          "motion": "war_authorization",
          "value": 8
        }
      ]
    },
    "strengthen_crown": {
      "cultivation": 1,
      "peerCultivation": 1,
      "sponsorRebels": true,
      "courtshipBonus": -0.05,
      "liegeGrantBonus": -0.04,
      "countyPetitionBonus": -0.05,
      "intrigueAggression": 0.5,
      "intrigueRestraint": 0,
      "marriageApproach": true,
      "marriageScore": 0,
      "conversionMotivations": [
        "faith",
        "culture"
      ],
      "coerciveFaith": false,
      "conversionFaithScore": 0,
      "conversionScore": 10,
      "motions": [
        {
          "motion": "redress",
          "value": -12
        },
        {
          "motion": "revocation_consent",
          "value": -12
        },
        {
          "motion": "emergency_subsidy",
          "value": 10
        }
      ]
    },
    "win_independence": {
      "cultivation": -2,
      "peerCultivation": -1,
      "sponsorRebels": false,
      "courtshipBonus": 0,
      "liegeGrantBonus": 0,
      "countyPetitionBonus": 0,
      "intrigueAggression": 0,
      "intrigueRestraint": 0,
      "marriageApproach": false,
      "marriageScore": 0,
      "conversionMotivations": [],
      "coerciveFaith": false,
      "conversionFaithScore": 0,
      "conversionScore": 0,
      "motions": [
        {
          "motion": "redress",
          "value": 10
        },
        {
          "family": "custom",
          "value": 10
        }
      ]
    },
    "keep_peace": {
      "cultivation": 3,
      "peerCultivation": 3,
      "sponsorRebels": false,
      "courtshipBonus": 0.04,
      "liegeGrantBonus": 0,
      "countyPetitionBonus": 0,
      "intrigueAggression": 0,
      "intrigueRestraint": 0.15,
      "marriageApproach": true,
      "marriageScore": 0,
      "conversionMotivations": [],
      "coerciveFaith": false,
      "conversionFaithScore": 0,
      "conversionScore": 0,
      "motions": [
        {
          "motion": "war_condemnation",
          "value": 14
        },
        {
          "motion": "war_authorization",
          "value": -12
        }
      ]
    }
  },
  "familySkills": {
    "learn": "lea",
    "marry_well": "dip",
    "prosper": "ste",
    "serve_house": "mar",
    "serve_faith": "lea",
    "build_household": "dip"
  }
};
