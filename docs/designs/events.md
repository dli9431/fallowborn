# Events are data

Plot definitions may add a `target` selector. Beginning such a plot presents the
selector first and stores its JSON-safe choice in `player.plot.context`; that same
context is supplied to discovery and resolution events. The built-in
`border_county_without_dejure` selector has shape `{pid: "<province id>"}` and powers
`fabricate_claim`. Named chances `fabricate_claim` and `plot_discovery` keep its exact
claim formula consistent whether the plot reaches resolution or is discovered early,
and custom effects settle success/failure and end the plot. See `docs/MODDING.md` for
the full authoring shape.

The expanded political plots use the same boundary with compound semantic contexts:
liege obligation `{realmId,institution:"estates",contractId:"obl"}`, exact guild charter
`{contractId}`, Council schemer `{realmId,institution:"council",rulerGeneration}`, foreign
correspondence `{realmId}`, and a political rival `{characterId,...relevant connection}`.
`FB.plotTargetOptions` is authoritative; daily and resolution-time validation never
silently substitutes another realm, charter, officer, or rival. Discovery containment
stores only additive `exposure` on the active plot, lowers current power, and leaves the
single plot/focus lifecycle intact.
Estates and Council target discovery is read-only: projected customary Estates terms
may be selected without creating `liege.obl`, and an unformed Council yields no schemer
target without forming seats, consuming RNG, or writing Chronicle news.

Several random stories may share a top-level `contextSelector`. Eligibility calls the
selector without RNG; only after the story is selected does the picker choose and
snapshot one returned semantic context. Improve, Provoke, pact, and alliance stories use
this to speak about the same exact court their effects address. The selector is rerun
when the pending story actually reaches display or autoresolve, so an earlier choice that
ends the pact, alliance, or direction expires the later story. Code-queued succession
stories instead use `contextValidator:"diplomacy_succession_valid"` with a saved
`rulerGeneration`; stale queued embassies are dropped before either visible or automated
resolution. Custom triggers and option requirements receive that same context.
Plot discovery and all plot resolution events use
`contextValidator:"plot_event_context_valid"` in the same way. Their queued context
carries `plotId`, so losing the active plot or changing any target component expires the
story before a choice can spend resources or apply a partial effect. Legacy queued
resolutions without `plotId` infer it only from an exact active-plot/event match.

`standingRealm:n` is the reusable declarative diplomatic effect. It adjusts the existing
player-relative Standing facade for `ctx.realmId` and is scored by autoresolve alongside
the visible resource effects. Pact, alliance, monopoly, obligation, and Council mutations
remain small custom handlers because their owning APIs are authoritative.

`js/events.js` interprets declarative triggers/effects (documented exhaustively in
docs/MODDING.md). New effect/trigger keys must be added there *and* documented in
docs/MODDING.md. Events fired from code use `trigger:{never:true}` and are queued via
`FB.queueEvent` / effect `queue`.

The `guild_monopoly_petition` event is one such code-queued contract. Its JSON-safe
context freezes the selected profession, grantor/scope identity, tier-scaled terms, and
display percentages before the event opens. The deed stamps its 360-day cooldown and
spends the day before any option resolves, so paying, persuading, or withdrawing cannot
avoid either cost. Its choice hints intentionally disclose exact contract costs, odds,
and failure penalties.

Bishop powers use the same code-queued boundary. Diocesan visitation, ecclesiastical
court, synod, and extraordinary tithe stamp their own cooldowns and queue exact events;
their choices expose the religious, popular, liege, Papal, health, and resource tradeoffs.
A separate five-event Bishop pool covers sanctuary, clergy misconduct, cathedral-chapter
resistance, tithe disputes, and doubtful relics. Failed ordinary episcopal appointment may
queue the rare simony event with the exact candidate in context. Its custom handler grants
the see to that candidate, while the `papalOpinion` effect adjusts the recognized Pope's
opinion of the context candidate (or the protagonist when no candidate is supplied).

Great holy-war transitions use that same blocking path. The religious head's call
queues `ghw_called` on the call day, and the first active-day tick queues
`ghw_muster_complete` after the campaign hosts have had their raising pass. With
war-event automation off, both open normally and stop fast-forward; war-event
automation may resolve them into the Chronicle like other wartime notices.

Great holy-war field recruitment instead uses the ordinary random-event path.
`ghw_pilgrims_under_arms` has a 1% slot-day gate, low weight, and a 36-season
cooldown. `ghw_swords_seeking_banner` has a 25% gate, requires at least 15 gold,
and has a four-season cooldown; its individual paid options repeat their own purse
requirements, so filtering and automation cannot overspend. Both also use the
`ghw_has_field_host` custom trigger, excluding preparation, personal expeditions,
liege service, and a shattered or absent player host. The custom outcomes reinforce
the live host immediately, while non-`first` automation scores every recruit above
refusal and prefers the larger mercenary package by default.

**Social audience is explicit.** `FB.societalRole` maps tier 0 to `serf`, tier 1
to `commoner`, tier 2 to `gentry`, tiers 3–5 to `lord`, and tiers 6–7 to
`crowned`. Event triggers and option requirements may use `societalRoles`; vassal,
sovereign, and liege checks remain independent. A `professions` requirement means
the player is personally practicing that vocation, so it never passes at tier 3+.
Queued and random events snapshot societal role and profession in their context,
allowing saved events and autoresolve to retain the wording with which they began.

Event-data `cooldown` stays in seasons — the engine multiplies by 90 (see
[time.md](time.md)).

Earned traits use ordinary declarative effects. `traitProgress:{id,amount?}` adds
progress for the current protagonist (default one), clamps it at the trait definition's
`earn.threshold`, and awards the trait with a durable localized Chronicle notice when
the threshold is first reached. Removing an earned trait with `removeTrait` resets that
trait's progress only when a trait was actually removed, so a later acquisition can
start again. A failed pre-award removal therefore does not erase accumulated progress.

`kinslayer:true` is a qualifier for `killRole`; it records that the player directly
caused the resolved role's death and grants Kinslayer only if that character was the
protagonist's spouse or blood relative. It has no independent effect and does not make
ordinary `killRole`, `killChild`, or incidental lethal effects culpable.

Road content in `data/events_travel.js` is still ordinary declarative event data,
but carries top-level `travel:{kind}` metadata. `kind` is `culture`, `road`,
`capstone`, `decision`, or repeatable destination `work`; a capstone or work story
may also name its `purpose`. The travel driver chooses unseen culture/road events
at county arrivals, code-queues capstones with `trigger:{never:true}`, and schedules
work stories every 55–85 days during a destination stay without immediate repeats.
While traveling, already queued events remain valid, but the random home-event
picker does not add a slot event. Returning and the once-per-life permanent move
are destination deeds rather than automatic event choices.

## Localized display

English event data remains authoritative and moddable. Localization is a shadow catalog:
the engine never rewrites `FBDATA` text. Core event fields use stable owner paths such as
`event.<id>.text` and `event.<id>.options.<authored index>.label`; filtering an option at
runtime does not renumber its localization key. Effective event data is indexed after stored
and bundled mods have been applied, so mod-provided English remains a valid fallback.

`FB.prepareEvent` materializes roles in the same deterministic order as the original English
renderer. Display helpers then render without changing game state, and event option keys use
their authored indices rather than their filtered visible positions. An event that uses the
localized war summary declares `warStatus: true`; the summary is rendered as independent
structured clauses instead of being spliced into surrounding prose.

New chronicle and event-log entries store locale-neutral `{key, params}` message descriptors
and are rendered in the player's current locale. Legacy saves and unstructured mod prose keep
their frozen English text as a compatibility fallback. Scripted-history descriptors use the
legacy entry's year and realm/new-realm id, not its array position, so inserting another
scripted event cannot change the meaning of a saved key. Precise-date entries use their
stable event id plus the active bookmark id. The daily scheduler described in
[time.md](time.md) makes `season` and `day` optional while preserving Spring day 1
behavior and flag keys for every existing 867 entry.

The event modal shows a character card for the event's `charCard` role and for every
`{role}` token the event's strings mention (js/ui.js `showEvent`); cards carry the
character's house arms, home county, and the arms of the realm holding it.
Diplomatic events that name `{rname}` or `{rulername}` from `ctx.realmId` add the matching
realm card with arms, ruler, rank, Standing, and current relationship, so a compact AI
ruler is not presented as bare prose.

A queued event with `nameChild: true` (births, `ctx.childId`) adds a rename field to the
modal — prefilled with the generated name, applied when any option is chosen; autoresolve
keeps the generated name.

Annual schooling stories are also ordinary queued event data. A schooling definition's
`annualEvents` ids are considered at New Year after its `schoolTerms` mortality rolls.
Across the household, surviving terms produce at most one story; `ctx.studentId`,
`ctx.studentFocus`, and `ctx.schoolId` freeze the selected student and arrangement. The
`{student}` token resolves that exact character and automatically adds their character card
to the modal. Noble Academy effects in `js/events.js` train that student rather than the
protagonist, can withdraw their current academy arrangement, and can introduce a generated
or existing noble through the current protagonist's normal Network contact API.

**Rival events require a real rival.** `FB.prepareEvent` and `FB.applyEffects` never create
the `rival` role from a `{rival}` token or `opinion:{role:'rival'}`. The random picker must
gate such events with `hasRole:'rival'`; code-queued rivalry events assign the exact
character before queueing. An event records a genuine hostile encounter with
`rivalContact:{role,score,cause}`, adjusts an existing feud with `rivalHeat`, and resolves
one through `endRivalry:true`. The `rivalHeatMin` / `rivalHeatMax` triggers separate ordinary
quarrels from the high-heat claim and murder cascades. The settlement stories use
compensation, third-party mediation, witnessed oaths, common labor, and satisfaction by
duel; Muslim, pagan, and Jewish branches phrase the public settlement in their own legal
and religious idiom. Rivalries can also begin without any event: the seasonal
`FB.tickRivalry` driver (see [time.md](time.md)) ages a character’s accumulated hostile
contacts and may have a slighted NPC declare a feud on its own, and a non-kin, non-spouse
rivalry outlives its holder — passing to the heir as a legacy feud ([characters.md](characters.md)).

Legacy data names remain stable: `opinion`, `opinionLiege`,
`roleOpinionAbove/Below`, and related mod keys still use their established schemas.
The interpreter routes their reads and writes through the typed Standing facade, so
existing events and mods affect the same score shown on character and realm sheets.

**Friend events also require a real relationship.** Lazy `{friend}` resolution never
generates a peer. Without a canonical `state.roles.friend`, it can resolve only the exact
living, eligible character currently receiving social attention at
`balance.relationshipOpinionThreshold`. The random `make_friend` story adds that same
readiness trigger and formalizes that exact person in both visible and autoresolved paths;
it does not add a second lump of Standing. Other events remain gated by `hasRole:'friend'`
when they require a canonical friendship.

**Lower-station stories have two paces.** The Old Custom landmark chain starts randomly
for an adult at tier 0–2, then advances through high-weight stage flags so its five
chapters unfold across later event slots. Its hearing uses four stat-specific formulas,
with accumulated evidence and the player's situation modifying the case. The Mill's Due,
Master's Empty Bench, and Words Before Dawn are two-part stories whose second decision is
queued immediately; they are once per life. Short lower-station incidents remain ordinary
cooldown events. Chain flags are life-local and disappear at succession with the rest of
`player.flags`.

Prepared and queued event contexts record `protagonistId`. Succession discards
any pending story owned by the outgoing protagonist before the heir's events
can be selected. This prevents a dead character's station, profession, or war
chain from continuing under a renamed heir; legacy coming-of-age and
station-transition queues retain their explicit compatibility cleanup.

Promotion does not cut one of these stories short. The Old Custom, Mill's Due,
Master's Empty Bench, Words Before Dawn, levy-service, and Sweet Polly stage flags
remain eligible until their final decision. No new lower-station opener begins
after promotion. Once those flags clear, a once-per-character `station_farewell`
decision asks the new ruler to honor or renounce the former life; succession or
demotion cancels an unresolved farewell belonging to the prior station.

**A woman’s road to arms.** With the martial training foci closed to women (see
[characters.md](characters.md)), the *Sweet Polly Oliver* chain is one of the few ways a
low-station woman gains real martial skill: when the man she has set her heart on is swept into
the war levy, she cuts her hair, takes a man’s name, and follows him into the ranks. It has two
openers, both **once per life** via a `polly_ever` guard flag: a random one (`polly_farewell`,
gated female + unwed + *not* courting + serf–gentry) when a man she fancies is levied, and a
`never`-triggered one (`polly_propose_war`) that the 💒 Propose deed rolls ~1-in-4 of the time
for an eligible woman, when her intended is called up before he can answer. From there it is a
five-flag chain (`polly_1 → polly_2 → polly_3 → polly_4 → polly_reunion`, each chapter
`once:true` and high-weight so it unfolds across ~a year of slot days). The random opener spawns
the soldier into the `{suitor}` role via `FB.fns.polly_court`; the proposal opener simply reuses
the suitor she is already courting (and clears the `courting` flag so the ordinary
courtship/proposal events stand down while she is afield). Either way his card and name carry
through every chapter, and the reunion weds him with `marry:'informal'` or dismisses him with
`clearSuitor`. The informal wedding uses the ordinary marriage and family-link mechanics but
does not settle a second dowry after the story's own arrangements. The shield-wall chapter can
win loot, leave scars, or kill: the grave wound is a
visible `health` hit (so the autoresolve guard in [time.md](time.md) can see it) plus a small,
martial-tempered `FB.fns.polly_rout` roll that the rout proved mortal. It fires for women of
every faith — the woman-in-arms motif is at home in the Persian and Arabic epics too (Gordāfarid,
Khawla bint al-Azwar) — so the setup, drill, and reveal carry `{default, muslim, pagan}` text
variants: the *amir’s* muster and a nod to the warrior-women of the old tales in Muslim lands,
the *chief’s* war-band and the shield-ring among the pagans (Christian/Jewish players get the
`default` Frankish register).

Related: [war.md](war.md) for the war-council events, [characters.md](characters.md) for
the childhood event filter, [time.md](time.md) for slot days and autoresolve.

Temporary modifier integration is described in [modifiers.md](modifiers.md). Event
contexts snapshot `locationId`; top-level `tags` scale only negative signed effects
through county/estate tag bonuses; and declarative content may use the `hasModifier`
trigger or `addModifier:{id,pid?}` / `removeModifier:{id,pid?}` effects. Grants record
the event's stable id, never its rendered title, as the modifier's optional semantic
source. The interpreter clones a scaled effect object and never rewrites the source
event definition.

The event modal derives modifier consequences from those ordinary effect objects.
Before a choice, it states the modifier name, snapshotted county, catalog duration,
exact supported effects, upkeep, and county-transfer rule. Chance branches label their
success and failure consequences separately. Autoresolve scores the same modifier
objects and applies them through the same interpreter path; presentation adds no
parallel mutation.
