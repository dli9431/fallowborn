/* Fallowborn: station and realm rank queries.
   Every engine check of a household's ladder tier or a realm's rank asks a
   named query here instead of comparing numbers, so a check says what it
   means (free, landed, rules a realm, sits in the estates, keeps a council)
   and the answers can later come from a government form's ladder without
   touching the callers again. Today each query is exactly the numeric
   comparison it replaced, on the one feudal ladder:

     tier  0 serf, 1 freeholder, 2 gentry, 3 baron, 4 count, 5 duke,
           6 king, 7 emperor (integers; state.player.tier, a scenario's
           tier, a portrait spec's tier, a character's station)
     rank  0 non-territorial (rebel or holy-war faction), 1 county,
           2 duchy, 3 kingdom, 4 empire (integers; realm.rank and the
           rank of a holy-war crown award)

   FB.station queries take a subject with a tier field, or a bare tier
   number; FB.realmRank queries take a realm (or award) with a rank field, or
   a bare rank number. This file is the only engine code that compares a
   tier or rank with a number; the station lint spec enforces that. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function tierOf(subject) {
    return subject !== null && typeof subject === 'object' ? subject.tier : subject;
  }
  function rankOf(subject) {
    return subject !== null && typeof subject === 'object' ? subject.rank : subject;
  }

  const S = FB.station = {};

  /* Single ladder bands. */
  S.isSerf = function (subject) { return tierOf(subject) === 0; };
  S.isFreeholder = function (subject) { return tierOf(subject) === 1; };
  S.isGentry = function (subject) { return tierOf(subject) === 2; };
  S.isBaron = function (subject) { return tierOf(subject) === 3; };
  S.isCount = function (subject) { return tierOf(subject) === 4; };
  S.isDuke = function (subject) { return tierOf(subject) === 5; };
  S.isKing = function (subject) { return tierOf(subject) === 6; };
  S.isEmperor = function (subject) { return tierOf(subject) === 7; };

  /* Free of servile obligation: freeholder or above. */
  S.isFree = function (subject) { return tierOf(subject) >= 1; };
  /* Of gentle standing, holding a manor or better: gentry or above. */
  S.isGentle = function (subject) { return tierOf(subject) >= 2; };
  /* A titled, landed lord: baron or above. */
  S.isLanded = function (subject) { return tierOf(subject) >= 3; };
  /* Free but below the landed nobility: freeholder or gentry. */
  S.isFreeUnlanded = function (subject) {
    const tier = tierOf(subject);
    return tier >= 1 && tier <= 2;
  };
  /* Rules a realm of one's own: count or above. */
  S.rulesRealm = function (subject) { return tierOf(subject) >= 4; };
  /* Holds counties on the map (state.player.provs): count or above. */
  S.holdsCounty = function (subject) { return tierOf(subject) >= 4; };
  /* Sworn lords below the crown who sit in a liege's estates: baron, count
     or duke. */
  S.sitsInEstates = function (subject) {
    const tier = tierOf(subject);
    return tier >= 3 && tier <= 5;
  };
  /* Duke or above. */
  S.isDucal = function (subject) { return tierOf(subject) >= 5; };
  /* Wears a crown: king or emperor. */
  S.isRoyal = function (subject) { return tierOf(subject) >= 6; };
  /* Keeps a royal council, crown authority and council confirmation: king
     or emperor. */
  S.mayHoldCouncil = function (subject) { return tierOf(subject) >= 6; };
  /* Emperor. */
  S.isImperial = function (subject) { return tierOf(subject) >= 7; };

  /* The broader societal role an event audience keys on (FB.societalRole):
     serf, commoner, gentry, lord or crowned. */
  S.societalRole = function (subject) {
    const tier = tierOf(subject);
    if (tier <= 0) return 'serf';
    if (tier === 1) return 'commoner';
    if (tier === 2) return 'gentry';
    if (tier <= 5) return 'lord';
    return 'crowned';
  };

  /* Data-driven thresholds (tierMin, minTier, tierMax, maxTier). reaches is
     false only when the subject stands below minTier, and exceeds is true
     only when it stands above maxTier, so an absent threshold never blocks. */
  S.reaches = function (subject, minTier) { return !(tierOf(subject) < minTier); };
  S.exceeds = function (subject, maxTier) { return tierOf(subject) > maxTier; };

  const R = FB.realmRank = {};

  /* Single ranks. */
  R.isCounty = function (realm) { return rankOf(realm) === 1; };
  R.isDuchy = function (realm) { return rankOf(realm) === 2; };
  R.isKingdom = function (realm) { return rankOf(realm) === 3; };
  R.isEmpire = function (realm) { return rankOf(realm) === 4; };

  /* A territorial realm of county rank or above, not a rank-0 faction. */
  R.isTerritorial = function (realm) { return rankOf(realm) >= 1; };
  /* Duchy rank or above. */
  R.isDucal = function (realm) { return rankOf(realm) >= 2; };
  /* A crown: kingdom or empire. */
  R.isRoyal = function (realm) { return rankOf(realm) >= 3; };
  /* An empire. */
  R.isImperial = function (realm) { return rankOf(realm) >= 4; };
})();
