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

   The remaining slots are declared here and filled by later systems:
   costume, vocabulary, ladder, systems, technology (window and starting
   knowledge), eventEras, currency and architecture. null means the era adds
   nothing and today's shared behavior applies.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.eras = {
  late_antique:{
    from:375, to:649,
    defaultGovernment:'regnum', defaultCulture:'roman',
    costume:null, vocabulary:null, ladder:null, systems:null,
    technology:null, eventEras:null, currency:null, architecture:null
  },
  early_medieval:{
    from:650, to:999,
    defaultGovernment:'territorial', defaultCulture:'frankish',
    costume:null, vocabulary:null, ladder:null, systems:null,
    technology:null, eventEras:null, currency:null, architecture:null
  },
  high_medieval:{
    from:1000, to:1300,
    defaultGovernment:'territorial', defaultCulture:'frankish',
    costume:null, vocabulary:null, ladder:null, systems:null,
    technology:null, eventEras:null, currency:null, architecture:null
  }
};
