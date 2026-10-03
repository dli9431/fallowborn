/* =========================================================================
   Fallowborn: ERAS
   =========================================================================
   An era holds period-wide rules with no territory. Every bookmark declares
   one, and a campaign stamps it at creation (state.start.era), so later
   edits here never move a running campaign to another period.

   Each entry:
     from, to: inclusive year window; a bookmark's start year must fall
       inside the window of the era it declares
     defaultGovernment: FBDATA.governmentForms id for a realm whose bookmark
       declares no government; stamped at creation as
       state.start.defaultGovernment
     defaultCulture: FBDATA.cultures id used when generation needs a culture
       and the map supplies none

     costume: FBDATA.wardrobes id (data/wardrobes.js) that dresses portraits
       in this era, unless the campaign's government form names its own
     balance: optional overrides of existing FBDATA.balance keys for every
       campaign of the era, applied over the global table and beneath the
       government form, bookmark and mod layers (js/balance.js); a value must
       keep its default's type, and an unknown key fails validation

     technology: the years the era's technology content supports and how a
       fresh campaign's starting knowledge is seeded (js/technology.js):
         from, to: inclusive year window inside the era window and inside
           the catalogue's authored coverage (FBDATA.techCoverage); a
           bookmark's start year must fall inside it
         startingKnowledge: a registered starting-knowledge policy
           (FB.techStartingKnowledge). historical completes what each
           realm's traditions had widely adopted by the start year and
           exposes what had emerged there; at 476 that is the inherited
           late-antique foundations
     military: null, or the unit and equipment sets the era restricts for
       its whole campaign (a campaign keeps its stamped era as years pass):
         excludeRoles: unit roles (FB.UNIT_ROLES) the era never fields; only
           roles that are not core may be excluded
         equipment: { from, to }: the era's equipment window; fresh stock and
           finds skip an item whose own production window (yearMin, yearMax)
           lies wholly outside it

   The remaining slots are declared here and filled by later systems:
   vocabulary, systems, eventEras, currency and architecture. null
   means the era adds nothing and today's shared behavior applies.
   vocabulary stays null: an era's words and rank labels are its entry in
   FBDATA.lexicons.eras (data/lexicons.js). ladder is the permission definition
   below, separate from those display labels.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

/* Eight stable station bands. Permissions, eligibility thresholds, social
   classes, realm mappings and promotion routes are data, not tier arithmetic.
   Government ladder strategies may override individual row fields. */
FBDATA.stationLadders = { feudal:{
  bands:{
    0:{'used':true,'order':0,'eligibilityTier':0,'socialStation':0,'realmRank':0,'previous':0,'role':'serf','succession':'personal','promotion':{'route':'freedom','next':1},'isSerf':true},
    1:{'used':true,'order':1,'eligibilityTier':1,'socialStation':1,'realmRank':0,'previous':0,'role':'commoner','succession':'personal','promotion':{'route':'manor','next':2},'isFreeholder':true,'isFree':true,'isFreeUnlanded':true},
    2:{'used':true,'order':2,'eligibilityTier':2,'socialStation':2,'realmRank':0,'previous':1,'role':'gentry','succession':'dynastic','promotion':{'route':'barony','next':3},'isGentry':true,'isFree':true,'isGentle':true,'isFreeUnlanded':true},
    3:{'used':true,'order':3,'eligibilityTier':3,'socialStation':3,'realmRank':0,'previous':2,'role':'lord','succession':'dynastic','promotion':{'route':'county','next':4},'isBaron':true,'isFree':true,'isGentle':true,'isLanded':true,'sitsInEstates':true,'mayCommand':true,'mayAdministerJustice':true,'mayArrangeDynasticMarriage':true},
    4:{'used':true,'order':4,'eligibilityTier':4,'socialStation':4,'realmRank':1,'previous':3,'role':'lord','succession':'dynastic','promotion':{'route':'higher','next':5},'isCount':true,'isFree':true,'isGentle':true,'isLanded':true,'rulesRealm':true,'holdsCounty':true,'sitsInEstates':true,'mayCommand':true,'mayAdministerJustice':true,'mayArrangeDynasticMarriage':true},
    5:{'used':true,'order':5,'eligibilityTier':5,'socialStation':4,'realmRank':2,'previous':4,'role':'lord','succession':'dynastic','promotion':{'route':'higher','next':6},'isDuke':true,'isFree':true,'isGentle':true,'isLanded':true,'rulesRealm':true,'holdsCounty':true,'sitsInEstates':true,'isDucal':true,'mayCommand':true,'mayAdministerJustice':true,'mayArrangeDynasticMarriage':true},
    6:{'used':true,'order':6,'eligibilityTier':6,'socialStation':4,'realmRank':3,'previous':5,'role':'crowned','succession':'dynastic','promotion':{'route':'higher','next':7},'isKing':true,'isFree':true,'isGentle':true,'isLanded':true,'rulesRealm':true,'holdsCounty':true,'isDucal':true,'isRoyal':true,'mayHoldCouncil':true,'mayCommand':true,'mayAdministerJustice':true,'mayArrangeDynasticMarriage':true},
    7:{'used':true,'order':7,'eligibilityTier':7,'socialStation':4,'realmRank':4,'previous':6,'role':'crowned','succession':'dynastic','promotion':null,'isEmperor':true,'isFree':true,'isGentle':true,'isLanded':true,'rulesRealm':true,'holdsCounty':true,'isDucal':true,'isRoyal':true,'mayHoldCouncil':true,'isImperial':true,'mayCommand':true,'mayAdministerJustice':true,'mayArrangeDynasticMarriage':true}
  },
  ranks:{
    0:{'order':0,'tier':0},
    1:{'order':1,'tier':4,'isCounty':true,'isTerritorial':true},
    2:{'order':2,'tier':5,'isDuchy':true,'isTerritorial':true,'isDucal':true},
    3:{'order':3,'tier':6,'isKingdom':true,'isTerritorial':true,'isDucal':true,'isRoyal':true},
    4:{'order':4,'tier':7,'isEmpire':true,'isTerritorial':true,'isDucal':true,'isRoyal':true,'isImperial':true}
  },
  social:{
    0:{'order':0,'isLowborn':true},
    1:{'order':1,'isFree':true},
    2:{'order':2,'isFree':true,'isGentle':true},
    3:{'order':3,'isFree':true,'isGentle':true,'isNoble':true},
    4:{'order':4,'isFree':true,'isGentle':true,'isNoble':true,'isRoyal':true}
  }
} };

FBDATA.eras = {
  late_antique:{
    from:375, to:649,
    defaultGovernment:'regnum', defaultCulture:'roman',
    costume:'late_antique', vocabulary:null, ladder:FBDATA.stationLadders.feudal, systems:null,
    technology:{ from:476, to:649, startingKnowledge:'historical' },
    military:null, eventEras:null, currency:null, architecture:null,
    balance:null
  },
  early_medieval:{
    from:650, to:999,
    defaultGovernment:'territorial', defaultCulture:'frankish',
    costume:'medieval', vocabulary:null, ladder:FBDATA.stationLadders.feudal, systems:null,
    technology:{ from:650, to:999, startingKnowledge:'historical' },
    military:null, eventEras:null, currency:null, architecture:null,
    balance:null
  },
  high_medieval:{
    from:1000, to:1300,
    defaultGovernment:'territorial', defaultCulture:'frankish',
    costume:'medieval', vocabulary:null, ladder:FBDATA.stationLadders.feudal, systems:null,
    technology:{ from:1000, to:1300, startingKnowledge:'historical' },
    military:null, eventEras:null, currency:null, architecture:null,
    balance:null
  }
};
