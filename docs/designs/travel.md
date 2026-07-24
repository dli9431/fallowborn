# Overland travel

The **Take to the road…** deed is available to adult freeholders and gentry
(tiers 1–2). A journey is personal and temporary: `player.provinceId` remains the
household home while `player.travel.currentId` follows the traveler. This keeps
holdings, enterprises, contracts, pregnancies, household work, and local political
ownership anchored to the household until the player explicitly settles elsewhere.

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

The departure cooldown begins when `FB.travelStart` actually spends the cost, not
when the purpose or destination picker opens. Pilgrimage is once per character
(the legacy Pilgrim trait also counts); every other purpose may repeat except at a
destination already completed by that character. Succession clears the history.

## Saved state and ticking

`player.travel` is either `null` or a plain JSON record containing the purpose,
home/destination/current county ids, optional service realm, phase
(`outbound`, `arrived`, or `return`), remaining and original routes, visited
counties, leg clock, departure turn/cost, encounter counts, and seen
cultures/events. `player.travelHistory` is an array of completed
`{purpose,destinationId,turn}` records. Both are initialized lazily, so version-3
saves need no migration.

`FB.travelTick` runs once per normal game day after household/pregnancy and army
simulation and before daily events are picked. The player’s focus does not tick
while traveling, and an enterprise staffed by the player yields nothing; all other
household income and world systems continue. Ordinary random home events are
suppressed, but already queued events still resolve.

County arrivals can queue `travel.kind: "culture"` or `"road"` events. A journey
has caps of three culture and four road encounters. A genuinely foreign
destination guarantees a culture event if the route supplied none. A purpose
capstone then queues the shared return-or-settle decision. The return follows the
saved outbound route; turning back reverses the counties already reached and
refunds nothing.

Death, succession, imprisonment, personal war, or leaving tiers 1–2 cancels the
journey and removes queued travel events. If a paid-service realm dies or moves its
capital before arrival, the traveler receives the patron-gone capstone rather than
following an invalid realm reference.

## Settlement

`FB.travelSettle` moves `player.provinceId` only after the destination capstone.
Culture, faith, dynasty property, enterprises, finance contracts, and the active
rival remain unchanged. Home-local lord, priest, friend, and notable seats are
cleared; the lord and priest are immediately regenerated from the destination.
The map’s household marker then moves to the new home.

The public surface is `FB.travelLocation`, `FB.travelRoute`,
`FB.travelDestinations`, `FB.travelCost`, `FB.travelStart`, `FB.travelTick`,
`FB.travelTurnBack`, `FB.travelReturn`, `FB.travelSettle`, and
`FB.travelCancel`.
