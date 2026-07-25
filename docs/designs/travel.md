# Overland travel

The **Take to the road…** deed is available to adult freeholders and gentry
(tiers 1–2). A journey begins as personal and temporary: `player.provinceId` remains
the household home while `player.travel.currentId` follows the traveler. This keeps
holdings, enterprises, contracts, pregnancies, household work, and local political
ownership anchored to the household unless the player later makes the character’s
one permanent lifetime move.

## Data and destinations

`data/travel.js` defines `FBDATA.travelPurposes`, `FBDATA.travelSites`, and the
travel balance values. The four core purposes are pilgrimage, trade, study, and
paid service:

- pilgrimage uses authored sites filtered by the traveler’s exact religion or
  religion group;
- trade accepts developed counties at or above the purpose’s `minDev`;
- study uses authored learned/urban sites;
- paid service reads the current capitals of living realms, including generated
  vassal realms.

`FB.travelRoute` is a breadth-first route over county adjacency. It excludes
wastelands and counties without culture/religion, while authored straits remain
ordinary valid adjacency. Cost is
`ceil(2 + roundTripLegs × 0.25) + purpose.cost`. A leg takes
`balance.travelLegDays` (three by default).

Arrival begins a destination stay rather than an immediate return-or-settle choice.
The traveler must remain for `balance.travelMinStayDays` (90) before returning,
receives a local work event every `travelWorkEventMinDays`–`travelWorkEventMaxDays`
(55–85), and may keep working indefinitely. Permanent settlement becomes available
after `travelSettleOfferDays` (360) and at least `travelSettleWorkEvents` (four)
local work stories.

The departure cooldown begins when `FB.travelStart` actually spends the cost, not
when the purpose or destination picker opens. Pilgrimage is once per character
(the legacy Pilgrim trait also counts); every other purpose may repeat except at a
destination already completed by that character. Succession clears the history.
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
and last work event). `player.travelHistory` is an array of completed
`{purpose,destinationId,turn}` records. `player.travelSettlement` is `null` or the
current character’s completed `{turn,destinationId}` permanent move. All initialize
lazily, so version-3 saves need no migration.

`FB.travelTick` runs once per normal game day after household/pregnancy and army
simulation and before daily events are picked. The player’s focus does not tick
while traveling, and an enterprise staffed by the player yields nothing; all other
household income and world systems continue. Ordinary random home events are
suppressed, but already queued events still resolve. In the `arrived` phase the
same daily tick schedules repeatable `travel.kind: "work"` stories; it does not
advance a route.

County arrivals can queue `travel.kind: "culture"` or `"road"` events. A journey
has caps of three culture and four road encounters. A genuinely foreign
destination guarantees a culture event if the route supplied none. A purpose
capstone then introduces the required stay. Once 90 days have passed the
**Turn back toward home** deed follows the saved outbound route; turning back
before reaching the destination still reverses the counties already reached and
refunds nothing. Staying longer keeps producing local work stories.

Death, succession, imprisonment, personal war, or leaving tiers 1–2 cancels the
journey and removes queued travel events. If a paid-service realm dies or moves its
capital before arrival, the traveler receives the patron-gone capstone rather than
following an invalid realm reference.

## Settlement

`FB.travelSettle` moves `player.provinceId` only after the destination capstone.
Culture, faith, dynasty property, enterprises, finance contracts, and the active
rival remain unchanged. Home-local lord, priest, friend, and notable seats are
cleared; the lord and priest are immediately regenerated from the destination.
The map’s household marker then moves to the new home. The action is exposed only
after a year and four work stories, uses an explicit confirmation, writes
`player.travelSettlement`, and cannot succeed again during the same character’s
life. Succession clears that lifetime marker for the heir.

The public surface is `FB.travelLocation`, `FB.travelRoute`,
`FB.travelDestinations`, `FB.travelCost`, `FB.travelStart`, `FB.travelTick`,
`FB.travelStayDays`, `FB.travelReturnEligible`, `FB.travelSettlementEligible`,
`FB.travelTurnBack`, `FB.travelReturn`, `FB.travelSettle`, and `FB.travelCancel`.
