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
   vocabulary, ladder, systems, eventEras, currency and architecture. null
   means the era adds nothing and today's shared behavior applies.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.eras = {
  late_antique:{
    from:375, to:649,
    defaultGovernment:'regnum', defaultCulture:'roman',
    costume:'late_antique', vocabulary:null, ladder:null, systems:null,
    technology:{ from:476, to:649, startingKnowledge:'historical' },
    military:null, eventEras:null, currency:null, architecture:null
  },
  early_medieval:{
    from:650, to:999,
    defaultGovernment:'territorial', defaultCulture:'frankish',
    costume:'medieval', vocabulary:null, ladder:null, systems:null,
    technology:{ from:650, to:999, startingKnowledge:'historical' },
    military:null, eventEras:null, currency:null, architecture:null
  },
  high_medieval:{
    from:1000, to:1300,
    defaultGovernment:'territorial', defaultCulture:'frankish',
    costume:'medieval', vocabulary:null, ladder:null, systems:null,
    technology:{ from:1000, to:1300, startingKnowledge:'historical' },
    military:null, eventEras:null, currency:null, architecture:null
  }
};
