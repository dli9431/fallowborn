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
travel balance values. The core purposes are pilgrimage, trade, study, paid
service, adventuring expedition, frontier withdrawal, and a character-targeted
relationship visit:

- pilgrimage uses authored sites filtered by the traveler's exact faith or any faith
  in its inheritance lineage;
- trade routes the player into the self-founded venture setup, whose finance
  definition accepts developed counties at or above `minDevelopment`;
- study uses authored learned/urban sites;
- paid service reads the current capitals of living realms, including generated
  vassal realms;
- expedition (`mode:'foreign'`) offers every reachable settled county whose culture
  differs from the traveler's own, nearest first, bounded by
  `balance.travelExpeditionMaxDestinations` (40); each foreign county can be
  charted once per character through the ordinary completed-destination rule;
- frontier withdrawal (`mode:'frontier'`, tiers 1–2 only) offers every wasteland
  bordering a reachable settled gateway county — see the frontier section below;
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
two-argument compatibility path. Passing the optional state applies the active maintained
transport multiplier and the origin county's provisions/transport market quote to the
route supplies, then adds the purpose's fixed service fee without multiplying it.
`FB.travelLegDays(state)` is the
shared preview/departure helper: a leg takes `balance.travelLegDays` (three by default),
or the active transport level's three, two, or one days. The current protagonist's
grouped `travel.legDays` trait effect is then added and the result is clamped to at
least one day. Roadwise supplies −1 day, so it changes only journeys whose departure
snapshot is taken after the trait is earned.
`FB.travelRouteOverhead` applies the same transport multiplier and market quote to the
route supplies alone. Self-founded ventures use that helper so their selected
10/20/50-gold stake is always charged in full. `FB.developedMarketDestinations` supplies the same reachable
map/list choices to Finance and Travel without applying the personal travel cooldown.

Arrival begins a destination stay rather than an immediate return-or-settle choice.
The traveler must remain for `balance.travelMinStayDays` (90) before returning,
receives a destination event every
`travelWorkEventMinDays`–`travelWorkEventMaxDays` (55–85), and may remain
indefinitely. For tier-1/2 travelers, permanent settlement becomes available
after `travelSettleOfferDays` (360) and at least `travelSettleWorkEvents` (four)
destination stories.

A tier-3+ protagonist who marries the exact target of an arrived relationship
visit receives a separate post-wedding residence decision immediately after the
wedding. The visit remains in its ordinary arrived stay instead of becoming
invalid when courtship ends. The ruler may abdicate and remain as landless
gentry at the destination, abdicate and continue as the current lawful heir, or
defer. Deferral removes only the automatic prompt: **Stay after marriage…**
remains in Deeds until the journey ends, alongside the unchanged return deed.

The departure cooldown begins when `FB.travelStart` or `FB.socialVisitStart`
actually spends the cost, not when the purpose or destination picker opens.
Pilgrimage is once per character (the legacy Pilgrim trait also counts); a
purpose repeats at a completed destination only when its definition sets
`repeatable:true`. Succession clears the history.
Dispatching a venture does not start or consult this cooldown and may revisit a
market. Accompanying one uses ordinary travel eligibility and preserves the
per-character completed-destination rule.
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
and last work event). A signed mercenary contract adds `travel.contract`
(`realmId`, `startedTurn`, `paidSeasons`, `renewals`), described below. Accompanied trade ventures also save an optional `venture` child for outbound cargo
and an optional `returnVenture` child (`kind`, `goodId`, `stake`, `ladingFee`, `quantity`, `strategy`, `status`)
when cargo is loaded at the destination market before returning. A targeted journey also saves optional `targetCharId`, whether
departure initiated courtship, and a reigning-ruler realm/generation stamp when
applicable. A qualifying destination wedding adds
`marriageResidence:{spouseId,destinationId,promptPending}`. This child is
additive and lazily validated; `promptPending:false` means the automatic modal
was deferred, not that the decision has expired. `player.travelHistory` is an array of completed
`{purpose,destinationId,turn}` records. `player.travelSettlement` is `null` or the
current character’s completed `{turn,destinationId}` permanent move. All initialize
lazily, so version-3 saves need no migration.
Recording a new unique non-targeted history entry adds one Roadwise acquisition point;
targeted relationship visits do not count. Three entries award the trait through the
shared life-local trait-progress API.

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
The ordinary non-destination road roll starts at 38% and multiplies
`1 + FB.traitBonus(protagonist,'travel','roadIncident')`; Roadwise's −15% rate
therefore makes it 32.3%. Culture encounters, destination guarantees, and option
success chances are separate and unchanged.

Death, succession, imprisonment, personal war, or moving outside the current
purpose’s tier range cancels the journey and removes queued travel events. If a
targeted character dies, becomes unavailable to an initiated courtship, or no
longer resides in the quoted destination, invalid attention/courtship state is
cleared and the traveler starts home immediately without serving the destination
stay. The post-wedding child is the narrow exception: a living spouse keeps the
relationship visit valid after courtship is cleared. An ordinary spouse shares
the temporary destination stay; a reigning spouse must still rule from that
destination. If a paid-service realm dies or moves its
capital before arrival, the traveler receives the patron-gone capstone rather than
following an invalid realm reference.

Commoner destination stays retain local-work choices. Tier-3+ stays use guest
quarters and court-residence events, and relationship journeys use personal-visit
events at every rank.

## Mercenary contracts and expeditions

A paid-service arrival at a **warring** realm's capital offers a sustained
mercenary contract instead of the ordinary court-service capstone when the
traveler is a working soldier (journeyman or master — the career is itself
male-gated and tier 1–2, so the offer inherits both bounds). Accepting saves
`travel.contract = {realmId, startedTurn, paidSeasons, renewals}` on the journey
record; nothing else is stored. The destination-stay tick pays
`balance.mercContractSeasonPay` (6) at each crossed season boundary, and after
`balance.mercContractSeasons` (4) it queues the completion audience once per
term: collect the `balance.mercContractCompletionGold` (20) purse and take the
road home (the first collected contract in a life also grants the family
**Company Standard** and the Veteran trait), renew on the same terms while the
patron's war lasts, or release the contract and remain. Contract work stories
(patrol, storming parties, camp life) replace the court-service stories while
the contract stands. If the patron's war ends or the realm dies mid-term, a
peace audience ends the contract honestly with a small severance.

The contract never blocks the road home. Coming home by any ordinary route —
the return or turn-back deeds, or an invalidated journey — settles the record in
`finishAtHome`: a served-out term pays its purse even without the audience,
while an abandoned term costs `balance.mercContractAbandonStanding` (−8) with
the patron realm. Death, succession, imprisonment, and personal war cancel the
journey and the contract together through the existing cleanup. Old saves simply
lack the field; a damaged record is dropped by `travelEnsure`, never invented.

An **expedition** is the adventuring counterpart for any non-serf tier (a landed
ruler deliberately accepts a temporary expedition; it changes no career). Its
capstone offers recording or profiteering; the first recording at a genuinely
foreign destination writes the family **Travel Journal** exactly once per
protagonist life (`player.flags.expedition_journal`), and expedition work
stories cover guides, foreign markets, and lawless miles. Return, settlement,
and the destination cooldowns follow the ordinary travel rules, so an
expedition can never strand the traveler.

## Frontier withdrawal and commoner settlement

The **Withdraw into the wastes** purpose (`mode:'frontier'`, tiers 1–2,
`repeatable`) sends a freeholder or gentry household beyond the settled world
without granting noble land. Destinations are wasteland provinces that border
at least one reachable settled gateway county: the route is computed through
the ordinary settled-only BFS to the nearest reachable gateway (county ids
break ties), then extended by a single final wasteland leg. Wastelands remain
impassable for every generic mover — personal routes, gift couriers, and trade
ventures still run through the settled-only `FB.travelRoute`, and the army
route search never uses a wasteland as a leg. Departure snapshots
`travel.frontier = {gatewayId, holderId, sovereignId, charId, milestones}`
beside the journey's own frozen route, cost, and start turn; a damaged record
is dropped by `travelEnsure`, never invented, and the tick cancels a journey
whose attempt can no longer resolve (wrong protagonist, missing gateway, or a
destination no longer empty).

Arrival queues the frontier capstone and begins the ordinary destination stay,
but the work-event pool admits only purpose-written frontier stories —
shelter, water, food, weather, solitude, visitors, faith, illness, tools, and
the persist-or-turn-back decision (`data/events_travel.js`). Their genuine
work options advance the saved `frontier.milestones` count through
`frontier_milestone`; survival options grant nothing. The turn-back option
appears only once the ordinary minimum stay has passed and then performs the
ordinary return.

`FB.frontierSettlementEligible` requires the arrived phase, tiers 1–2, the
character's unused lifetime permanent move, a still-settled adjacent gateway,
the ordinary one-year residence (`balance.travelSettleOfferDays`), and
`balance.frontierMilestonesRequired` (4) successful work milestones.
`FB.frontierStatus` derives the unsaved progress summary (gateway, phase,
milestones, residence, availability) shown in the Deeds travel commitment row,
the journey review, and the settlement sheet.

`FB.frontierSettle` materializes the county through the shared
`FB.materializeWasteland` helper (see [provinces.md](provinces.md)): the
settler's culture and faith, development 1, no de jure membership, and the
gateway county's **live** political holder and sovereign (the departure
snapshot is the fallback and the deterministic reference). The household then
moves through the ordinary travel-settlement cleanup — which consumes the
one-per-character `player.travelSettlement`, so the same protagonist can never
chain frontier colonies — and receives `balance.frontierSettlementPlots` (1)
starter land plots at the new county's head settlement through the ordinary
`player.landPlots` holdings rules. No county title and no `player.provs`
entry is ever granted. Death, succession, imprisonment, personal war, and
leaving tiers 1–2 end the attempt through the existing journey cleanup, and
turning back abandons it without any property changing hands. No autonomous
unowned population, demographic migration, wilderness inventory, or parallel
hermit economy is simulated; once the county exists, ordinary holdings,
household work, development, mortality, and political rules take over.

Technology impact: `commoner_frontier_settlement` is `none`. Withdrawing onto
empty land is a core life-path and recovery choice riding ordinary travel and
holdings; no innovation credibly unlocks or improves it.

## Gift couriers

`FB.giftDeliveryPreview` compares the sovereign owning `player.provinceId` with the
sovereign owning the recipient’s destination. Same-sovereign gifts retain the immediate
path. A foreign ruler’s destination is the current capital; an ordinary character’s is
`FB.characterResidence`. Foreign dispatch uses `FB.travelRoute` from the permanent home
and freezes the route, `FB.travelLegDays` result, exact cash/item, effect, recipient
identity, and outbound ETA. Passing `{readOnly:true}` makes the preview inspect courier
records without running legacy repair or synchronizing a materialized ruler. Read-only
visit and courier previews also inspect the saved travel, Transport standard, and realm
technology records through snapshot helpers rather than normalizing them. Interaction card
builders use these forms so opening a target never changes saved state.

`player.giftDeliveries` is an additive array of JSON-only records. Each record saves its
sender character, ruler-generation or character recipient, gift kind and exact payload,
semantic item snapshot, effect, dispatch home, destination and sovereign, current county,
phase (`outbound` or `return`), remaining/original route, leg clock, start/arrival turns,
and any failure reason/return home. Multiple recipients may have couriers, but
`FB.giftDeliveryPending` permits only one record per recipient.

`FB.giftDeliveryTick` runs once beside `FB.travelTick` on every ordinary player day and
never in Observe mode. Delivery applies standing and starts the existing recipient
cooldown only on successful arrival. A dead sender, dead or succeeded recipient, moved
recipient, or moved capital marks failure without reversing the outbound road. At the
original destination the courier starts a new route to the player’s current permanent
home; a later permanent move reroutes that return. Cash is refunded or the exact item is
restored only on reaching that home. Dispatch, delivery, failed return, and restoration
write durable localized Chronicle descriptors.

## Settlement

`FB.travelSettle` is restricted to freeholders and gentry and moves
`player.provinceId` only after the destination capstone.
Culture, faith, enterprise ownership, finance contracts, and the active rival
remain unchanged. Enterprise staffing does not: the confirmation lists every
assigned worker who will no longer share the enterprise's province, and
settlement clears those worker ids and locks so the remote property stands idle.
Home-local lord, priest, friend, notable, cultivated-friend
contacts, courtship, and personal social attention are cleared; the lord and priest are
immediately regenerated from the destination.
The map’s household marker then moves to the new home. The action is exposed only
after a year and four work stories, uses an explicit confirmation, writes
`player.travelSettlement`, and cannot succeed again during the same character’s
life. A province-scoped incoming guild monopoly is a local right and ends during this
permanent move; other household property and institutional records keep their own
ordinary rules. Succession clears the lifetime settlement marker for the heir.

The marriage-residence move deliberately bypasses the year and four-story
requirements, but it consumes the same one-per-character
`player.travelSettlement`. Continuing as the same character uses the ordinary
settlement cleanup for destination-local roles and relationships while keeping
marriage, household wealth, items, holdings, enterprise ownership, and finance
contracts. Its confirmation uses the same exact enterprise staffing-impact
preview.
Continuing as the heir cancels the journey through living succession instead:
the household home does not move, and the former protagonist and wedding spouse
receive explicit residence in the destination county.

An accompanied self-founded venture adds only `travel.venture`: its kind, selected
commodity, origin quote, purchased quantity, stake, separately paid overhead,
destination/route snapshot, status, and irreversible settlement fields. No matching
finance investment record is created. The normal trade capstone multiplies the quantity
by the live arrival price and its former 1.2× cautious, 2.5× bold-success, or 0.3×
bold-failure outcome; delivered stock never exceeds the purchased quantity. A legacy
travel venture without commodity fields retains its fixed-stake payout. Turning back before arrival, death, succession,
imprisonment, personal war, or leaving tiers 1–2 discards or cancels this travel-owned
record without a refund or later payout.

The public surface is `FB.travelLocation`, `FB.travelRoute`,
`FB.developedMarketDestinations`, `FB.travelDestinations`, `FB.travelCost`,
`FB.travelRouteOverhead`, `FB.travelLegDays`, `FB.travelStart`,
`FB.travelEligible(state, purposeId?)`, `FB.socialVisitPreview`,
`FB.socialVisitStart`, `FB.travelTick`, `FB.travelStayDays`,
`FB.travelReturnEligible`, `FB.travelSettlementEligible`,
`FB.travelMarriageResidenceEligible`, `FB.travelMarriageResidence`,
`FB.travelTurnBack`, `FB.travelReturn`, `FB.travelSettle`, and `FB.travelCancel`.
The contract surface is `FB.mercContractOffer` and `FB.mercContractActive`.
The frontier surface is `FB.frontierSettlementEligible`, `FB.frontierStatus`,
and `FB.frontierSettle`, with the event handlers `frontier_milestone`,
`frontier_leave_ready`, and `frontier_go_home`.
The courier surface is `FB.giftDeliveryEnsure`, `FB.giftDeliveryPreview`,
`FB.giftDeliveryPending`, `FB.dispatchGiftDelivery`, and `FB.giftDeliveryTick`.
`FB.socialVisitPreview(state, character)` returns an object with `eligible` and
an optional localized `reason`, or the resolved destination, route, legs, leg
duration, one-way days, cost, minimum stay, daily Standing rate, active days to
the relationship threshold, and estimated days from departure. Passing
`{courtship:true}` to `FB.socialVisitStart` begins a geographically valid suit
as part of the same departure.
