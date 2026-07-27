# Overland travel

Adult serfs cannot travel overland. Freeholders and gentry (tiers 1–2) may use
every ordinary purpose; barons and higher may make relationship visits,
pilgrimages, and study journeys. A journey begins as personal and temporary:
`player.provinceId` remains the household home while `player.travel.currentId`
follows the traveler. This keeps holdings, enterprises, contracts, pregnancies,
household work, and local political ownership anchored to the household unless
an eligible tier-1/2 traveler later makes the character’s one permanent lifetime
move.

## Data and destinations

`data/travel.js` defines `FBDATA.travelPurposes`, `FBDATA.travelSites`, and the
travel balance values. The five core purposes are pilgrimage, trade, study, paid
service, and a character-targeted relationship visit:

- pilgrimage uses authored sites filtered by the traveler’s exact religion or
  religion group;
- trade accepts developed counties at or above the purpose’s `minDev`;
- study uses authored learned/urban sites;
- paid service reads the current capitals of living realms, including generated
  vassal realms;
- relationship visits use `FB.characterResidence` for one named character and
  therefore do not appear in the generic destination picker.

Purpose definitions may set `minTier`, `maxTier`, `targeted`, and `repeatable`.
A definition with neither tier bound retains the historical tier-1–2 range.
Supplying either bound opts into an explicit range: the omitted lower bound is
1 and the omitted upper bound is 7. Serfs remain excluded. `targeted:true`
removes a purpose from the generic picker, while `repeatable:true` permits later
journeys to the same county. Core relationship visits are both targeted and
repeatable; pilgrimage retains its once-per-life rule.

`FB.travelRoute` is a breadth-first route over county adjacency. It excludes
wastelands and counties without culture/religion, while authored straits remain
ordinary valid adjacency. The unmodified cost is
`ceil(2 + roundTripLegs × 0.25) + purpose.cost`. `FB.travelCost` retains that
two-argument compatibility path; passing the optional state applies the active maintained
transport multiplier to the complete cost and rounds up. `FB.travelLegDays(state)` is the
shared preview/departure helper: a leg takes `balance.travelLegDays` (three by default),
or the active transport level's three, two, or one days.

Arrival begins a destination stay rather than an immediate return-or-settle choice.
The traveler must remain for `balance.travelMinStayDays` (90) before returning,
receives a destination event every
`travelWorkEventMinDays`–`travelWorkEventMaxDays` (55–85), and may remain
indefinitely. For tier-1/2 travelers, permanent settlement becomes available
after `travelSettleOfferDays` (360) and at least `travelSettleWorkEvents` (four)
destination stories.

The departure cooldown begins when `FB.travelStart` or `FB.socialVisitStart`
actually spends the cost, not when the purpose or destination picker opens.
Pilgrimage is once per character
(the legacy Pilgrim trait also counts); a purpose repeats at a completed
destination only when its definition sets `repeatable:true`. Succession clears
the history.
The destination picker remembers whether time was already paused: canceling it or
confirming departure restores a running clock, while a game that was paused before
the picker remains paused. Leaving the current game closes the picker without
resuming its clock.

## Saved state and ticking

`player.travel` is either `null` or a plain JSON record containing the purpose,
home/destination/current county ids, optional service realm, phase
(`outbound`, `arrived`, or `return`), remaining and original routes, visited
counties, leg clock, departure turn/cost, encounter counts, seen cultures/events,
and additive destination-stay fields (`stayStartTurn`, `nextWorkTurn`, `workEvents`,
and last work event). A targeted journey also saves optional `targetCharId` and
whether departure initiated courtship. `player.travelHistory` is an array of completed
`{purpose,destinationId,turn}` records. `player.travelSettlement` is `null` or the
current character’s completed `{turn,destinationId}` permanent move. All initialize
lazily, so version-3 saves need no migration.

Cost and `legDays` are copied into the journey when departure spends the purse.
Return travel uses that saved leg duration. Reducing, upgrading, losing, or dormancy of
household transport after departure therefore cannot change a journey already underway;
old journey records missing a valid leg duration repair to the unmodified base value.

`FB.travelTick` runs once per normal game day after household/pregnancy and army
simulation and before daily events are picked. The player’s focus does not tick
while traveling, and an enterprise staffed by the player yields nothing; all
other household income and world systems continue. Personal attention is
presence-aware: it is paused on outbound and return roads, but after arrival it
advances whenever the assigned character resides in the same county, even when
the journey has another purpose. Ordinary random home events are
suppressed, but already queued events still resolve. In the `arrived` phase the
same daily tick schedules repeatable `travel.kind: "work"` stories; it does not
advance a route.

County arrivals can queue `travel.kind: "culture"` or `"road"` events. A journey
has caps of three culture and four road encounters. A genuinely foreign
destination guarantees a culture event if the route supplied none. A purpose
capstone then introduces the required stay. Once 90 days have passed the
**Turn back toward home** deed follows the saved outbound route; turning back
before reaching the destination still reverses the counties already reached and
refunds nothing. Staying longer keeps producing destination stories.

Death, succession, imprisonment, personal war, or moving outside the current
purpose’s tier range cancels the journey and removes queued travel events. If a
targeted character dies, becomes unavailable to an initiated courtship, or no
longer resides in the quoted destination, invalid attention/courtship state is
cleared and the traveler starts home immediately without serving the destination
stay. If a paid-service realm dies or moves its
capital before arrival, the traveler receives the patron-gone capstone rather than
following an invalid realm reference.

Commoner destination stays retain local-work choices. Tier-3+ stays use guest
quarters and court-residence events, and relationship journeys use personal-visit
events at every rank.

## Settlement

`FB.travelSettle` is restricted to freeholders and gentry and moves
`player.provinceId` only after the destination capstone.
Culture, faith, dynasty property, enterprises, finance contracts, and the active
rival remain unchanged. Home-local lord, priest, friend, notable, cultivated-friend
contacts, courtship, and personal social attention are cleared; the lord and priest are
immediately regenerated from the destination.
The map’s household marker then moves to the new home. The action is exposed only
after a year and four work stories, uses an explicit confirmation, writes
`player.travelSettlement`, and cannot succeed again during the same character’s
life. Succession clears that lifetime marker for the heir.

The public surface is `FB.travelLocation`, `FB.travelRoute`,
`FB.travelDestinations`, `FB.travelCost`, `FB.travelLegDays`, `FB.travelStart`,
`FB.travelEligible(state, purposeId?)`, `FB.socialVisitPreview`,
`FB.socialVisitStart`, `FB.travelTick`,
`FB.travelStayDays`, `FB.travelReturnEligible`, `FB.travelSettlementEligible`,
`FB.travelTurnBack`, `FB.travelReturn`, `FB.travelSettle`, and `FB.travelCancel`.
`FB.socialVisitPreview(state, character)` returns an object with `eligible` and
an optional localized `reason`, or the resolved destination, route, legs, leg
duration, one-way days, cost, minimum stay, daily Regard rate, active days to
the relationship threshold, and estimated days from departure. Passing
`{courtship:true}` to `FB.socialVisitStart` begins a geographically valid suit
as part of the same departure.
