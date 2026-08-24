# Events are data

Exceptional sibling courtship uses three queued, context-validated events:
the one-time approach, illicit exposure, and the final proposal. Pair status,
target id, route, and resource checks are revalidated when the event reaches
the front of the queue. Dynamic consent and proposal odds use seeded game
RNG; custom effects write only stable ids and enum-like outcomes, while all
displayed prose remains in event data or localization-aware UI calls. The
approach queues its reviewed route and response chance, then rejects the event
if the live route or hard gates change before resolution. Autoresolution takes
the first authored option: make an already-reviewed approach, end an exposed
relationship, or make an already-reviewed proposal.

The ordinary `proposal_made` refusal stamps the life-local `match_refused` flag while
clearing the failed courtship. Marriage onboarding and the Deeds renderer use it to say
**Seek another match** and to contextualize the existing prospect-search cooldown; a
new courtship or successful wedding clears it. The flag changes presentation only and
has no technology impact.

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

Phase 4C declarative mod deeds may name one effective event to queue instead of applying
their small scalar effect map. The deed validates that reference, including a same-mod
event, but does not inherit the event interpreter vocabulary: its own record cannot carry
triggers, custom handlers, choices, identity mutation, or arbitrary effects. It pays any
fixed deed costs and queues the event with ordinary protagonist/location context; the
event definition remains the sole owner of later choices and consequences. Replacing a
mod event invalidates the lazy event-id index before a queued deed can resolve it.
Phase 4E `resource_choice` options may use that same single-event transaction. The selected
option is revalidated before queuing, while merely opening or cancelling its picker never
touches the event queue.

The daily picker moves at most one valid queued event into the UI. A random slot event
is selected only when no queued event claimed that day, so a pause after resolving one
choice stops the stream with later events still in the serializable queue. As a second
guard, if another caller supplies a UI batch and the player pauses while answering it,
the unread tail is returned to `state.eventQueue` instead of being opened immediately.
Context validation runs both when the picker dequeues an event and immediately before
the modal displays it.

Random slot selection keeps an unsaved index of effective, non-`never` event definitions,
split by the wartime and childhood gates that otherwise reject most of the catalogue. Mod
event replacement invalidates this index beside the event-id index. Within one selection
pass, immutable trigger reads such as age, role, technologies, holdings, buildings, and
vassal status are retained, and each named context selector is evaluated at most once.
These caches are discarded after the pass: they neither enter saves nor change trigger,
chance-roll, weighting, or authored-order semantics.

**Guild-path stories stay declarative.** An event may use
`trigger.career:{profession,specialization,guildRankMin,guildStandingMin}` to require
the protagonist's current working career. This is distinct from broad `professions`:
landed protagonists retain their calling as biography but cannot receive active-work
guild stories. Craft and Trade paths each have a small weighted, seasonal-cooldown
pool whose choices exchange coin, Guild Standing, prestige, skill, or a normal local
modifier. `guildStanding:n` is a clamp-aware declarative effect on the active guild
career. There is no guild-day tick, settlement membership list, or generated guild
population.

The rare market invitation is also an ordinary cooldown-controlled event. Its custom
effect opens the same bounded household auction as the deed; it does not start a
separate event chain or market simulator.

Faith fracture uses that same data boundary. `foundFaith` validates and stores a
JSON-safe definition, optionally converts the founder, household, and player realm, and
places the resulting id in `ctx.faithId`. A following `faithRelation` effect may refer to
it as `$founded` and persist directional recognition changes. `marriageEndReady` gates
the doctrine-defined petition route, while `marriageEnd` charges its snapshotted
success or failure costs. These keys keep authored schisms and marriage doctrine in
event data without allowing events to mutate `FBDATA`.

`collective_privilege_demand` is another code-queued boundary. Once per annual
institution tick, deterministic pressure gates choose at most the highest eligible demand
and save only stable demand, privilege, constituency, scope, polity, reason, and turn
ids. `contextValidator:'collective_demand_valid'` prevents a stale audience from granting
or refusing a different demand. Grant and negotiated settlement create the privilege
through its owning API; refusal lowers political support and adds bounded constituency
opposition, which increases that constituency's later demand pressure after the cooldown.
None of the choices creates an autonomous realm or starts a revolt directly.

Debt enforcement uses that code-queued boundary for its last claim. Once distraint
exhausts seizable property, `js/economy.js` queues exactly one station-specific event:
`manor_forfeit` for gentry, `bondage_sentence` for freeholders, or
`debt_labor_sentence` for serfs. They share the existing settlement and flight handlers
but keep foreclosure, enserfment, and extraordinary labor as distinct player-facing
outcomes rather than a second social-status system.

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

Ordinary campaign writing uses the same random-event and effect-interpreter path at
three scales. Personal stories cover the ruler's fear, wounds, courage, command
friction, illness, and reputation; host stories cover pay, food, discipline,
desertion, officers, camp followers, and requisition; whole-war stories cover the
objective, allies, enemy offers, exhaustion, occupation, and withdrawal. Their custom
gates inspect facts already present in the active player war and live host rather than
inventing narrative state. Their custom effects either adjust the abstract campaign
condition, mutate the live host through the shared deterministic allocator, or end the
ordinary war, and write the affected ledger into the campaign-feedback record. Because
visible choices and non-`first` autoresolve both finish through `FB.applyEffects`, they
produce the same mechanical outcome for a selected option.

The ordinary-war operational queue is distinct from those cooldown-bound stories:
`FB.queueWarEvent` stamps musters, councils, offers, and captivity audiences with the
active war serial and enemy. `war_event_context_valid` expires them after peace or war
replacement, while primary-host field reports remain historical results that may still
be read after their battle settles the war. Detached-host battles write only Chronicle
and campaign-ledger results, avoiding a second protagonist-facing modal. After daily
movement and battles, the first uncontested player host strong enough to work the war
target queues `war_occupation_policy` through the same exact-war path. It is a once-per-war
operational event, not a random slot story.

**Tournaments are bounded invitations, not a simulation.** `data/events_tournament.js`
holds the jousting family: a gentry tourney (tier 2, noble vocation) and a great
tourney for landed lords (tier 3+), each gated to spring/summer with a multi-year
cooldown so the stories remain occasions. Every mounted contest resolves through the
ordinary `battle` named chance, so Martial, Brave/Craven, holdings, worn battle
equipment, and blessings apply with no jousting-specific formula. The joust charges
an entry purse through ordinary option effects beside its chance branches; the melee
is free with smaller stakes. The wager option is hidden in Muslim lands, where a
host-gift or patronage counterpart keeps every faith at the same number of choices,
and default/Muslim/pagan text variants keep the ceremony's form and idiom
faith-appropriate. Attendance and withdrawal choices trade host Standing for safety.
Participation only: hosting, brackets, entrant rosters, and AI tournament calendars
are deliberately deferred.

The joust option requires the effective sovereign's `cavalry_lances`. It remains visible
when locked: gentry receive the exact technology name, while tier-3+ rulers can open its
detail. Melee, wagers or patronage, attendance, and withdrawal remain available, so an AI
research choice never removes the invitation itself.

Formal market-charter choices in Council, Estates, and the coastal wreck's market
compact require both Permanent Urban Markets and Authenticated Seals. Written
confirmation of local custom requires Recorded Customary Law. Each affected story
retains at least one ordinary response when the formal option is locked.

**Social audience is explicit.** `FB.societalRole` maps tier 0 to `serf`, tier 1
to `commoner`, tier 2 to `gentry`, tiers 3–5 to `lord`, and tiers 6–7 to
`crowned`. Event triggers and option requirements may use `societalRoles`; vassal,
sovereign, and liege checks remain independent. A `professions` requirement means
the player is personally practicing that vocation, so it never passes at tier 3+.
Queued and random events snapshot societal role and profession in their context,
allowing saved events and autoresolve to retain the wording with which they began.

Event-data `cooldown` stays in seasons — the engine multiplies by 90 (see
[time.md](time.md)).

**Serf life carries a dedicated customary-burden pool.** Ten ordinary tier-0
stories cover demesne boon-harvest, revised week-work, mill multure, pannage,
marriage leave, the Christian tithe sheaf, bridge cartage, the common oven,
deadwood amercement, and wartime quartering. Seasonal, terrain, faith, marriage,
and war gates keep the narrower customs in their proper circumstances. Most
choices exchange household coin or health for compliance, risk a larger fine,
or preserve one resource at the expense of another; this pool is pressure, not
an alternate early-game reward track.

Two once-per-life stories are deliberately extraordinary no-win burdens:
`serf_extraordinary_tallage` and `serf_seed_grain_requisition`. Both have low
slot gates, weight 2, and three unconditional choices. Every choice applies an
immediate resource loss; the wartime seed seizure can also cause a lean winter.
They never hide a safe refusal behind an unaffordable option or a chance roll.

The motifs come from recorded obligations rather than a single universal
“serf law.” The ninth-century [*Capitulary de
Villis*](https://sourcebooks.web.fordham.edu/source/carol-devillis.asp) accounts
for tenant ploughing, pigs, rents, fines, forests, mills, bridges, transport,
grain, and livestock. The later [manorial management
texts](https://sourcebooks.web.fordham.edu/source/1275manors1.asp) describe
closely tallied boon-work and harvest service, while the recorded obligations
of [Matilda de Herdeby](https://www.nottingham.ac.uk/manuscriptsandspecialcollections/learning/medievalwomen/theme1/natureornurture.aspx)
include autumn work by the family except the housewife, pannage, and merchet.
The extraordinary levy draws on documented
[tallage-at-will](https://ueaeprints.uea.ac.uk/id/eprint/71006/) against unfree
tenants. The event gates treat these as geographically broad historical motifs,
not claims that every manor imposed every custom.

**A rare captive raid can strike every non-ruler life.** `historic_raid` is a
once-per-life, childhood-capable tier-0–2 opener with the same 3.5% slot gate and
weight 2 used by extraordinary tallage. A pure `historic_raider` context
selector snapshots both a semantic `raidProfile` and one of the six geographically
nearest counties matching that profile. Christian protagonists face Northmen;
Muslim protagonists face cross-bannered Byzantine or Frankish frontier troops;
Norse and Baltic pagans face Christian march forces; Slavic pagans and Iranian
traditions face steppe riders; Tengri and Turkic/Khazar Jewish traditions face Rus
raiders; remaining cultures receive a foreign rival war-band. The selector falls
back to a culturally or religiously foreign county when a modded map contains no
profile match. Every later chapter carries that exact `{raidProfile,destinationId}`
through `historic_raid_context_valid`, so the prose and captivity destination never
change midway through the chase.

The opener and `historic_raid_pursuit` each provide two kinds of survival: a skilled
clean escape with no loss, or a guaranteed escape bought by `raid_plunder`. Plunder
uses the saved RNG and chooses only among wealth the household actually has: one
armory item, household holding, maintained household-standard level, land plot, or a
bounded share of loose coin. Failure in the chase queues `historic_raid_captive`.
Submitting there invokes `raid_enslave`: all local property and loose coin are lost,
the household moves to the snapshotted captor county, and the protagonist falls to
the faith-appropriate tier-0 station without changing culture or religion. The only
alternative is a disclosed 25% escape attempt; success escapes after plunder, while
failure applies an explicit lethal health blow with raid provenance.

The severity follows period evidence rather than treating capture as a short prison
term. The [National Museum of Denmark](https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/power-and-aristocracy/slaves-and-thralls/)
describes Viking expeditions in the British Isles and eastern Europe as a principal
source of captives and records their sale through long-distance markets. Research on
the [Arab–Byzantine frontier](https://pmc.ncbi.nlm.nih.gov/articles/PMC10962249/)
likewise distinguishes civilians taken in raids and sacked settlements amid the
ninth-century cycle of pillage, captivity, ransom, and forced labor. The eastern
profiles draw on evidence for Rus seizure and trafficking of captives across the
[Baltic and river networks](https://doi.org/10.1080/0144039X.2019.1592976), while
[Iranian evidence](https://www.iranicaonline.org/articles/barda-iii/) records war
captives and slave routes through the Caucasus and Transoxania. These were grave but
episodic hazards, so one low-gate chain per protagonist represents them better than a
repeatable seasonal tax on every household.

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
are destination deeds rather than automatic event choices. A work story may also
declare `contract:true` (only while the journey carries an active mercenary
contract) or `contract:false` (stood down for the contract's duration), and
contract stories read the frozen `mercPay`/`mercSeasons`/`mercPurse`/`mercServed`
context the travel driver supplies.

**Life-path content lives in `data/events_lifepaths.js`.** The pack extends the
existing careers rather than duplicating them: soldier command assignments and
operational war decisions (wartime, `battle`-resolved), physician outbreaks and
bedside calls, scholarly disputation, astronomer observations, and author
commissions. Its travel chapters are the mercenary contract family (a service
capstone substitute, contract work stories, and the completion and peace
audiences, whose effects call the `merc_contract_*` handlers in `js/travel.js`)
and the expedition family (`travel_expedition_record`). The once-per-life durable
works — Book of Remedies, Star Tables — use ordinary declarative `giveItem`;
the randomized commissioned treatise uses `lifepath_author_work` in
`js/economy.js`. All of them resolve identically when autoresolved.

## Localized display

English event data remains authoritative and moddable. Localization is a shadow catalog:
the engine never rewrites `FBDATA` text. Core event fields use stable owner paths such as
`event.<id>.text` and `event.<id>.options.<authored index>.label`; filtering an option at
runtime does not renumber its localization key. Effective event data is indexed after stored
and bundled mods have been applied, so mod-provided English remains a valid fallback.

`FB.prepareEvent` materializes roles in the same deterministic order as the original English
renderer. Display helpers then render without changing game state, and event option keys use
their authored indices rather than their filtered visible positions. An event that uses the
localized war summary declares `warStatus: true`; the summary is a compact
one-paragraph status line (host strength and condition, urgent supply or pinning
warnings, streak, logistics total, enemy host, siege progress) rendered as
independent structured clauses instead of being spliced into surrounding prose.
The full battle record, campaign losses, campaign effects, and the itemized
upkeep ledger stay in the war panels, not in the event modal.

New chronicle and event-log entries store locale-neutral `{key, params}` message descriptors
and are rendered in the player's current locale. Legacy saves and unstructured mod prose keep
their frozen English text as a compatibility fallback. Scripted-history descriptors use the
legacy entry's year and realm/new-realm id, not its array position, so inserting another
scripted event cannot change the meaning of a saved key. Precise-date entries use their
stable event id plus the active bookmark id. The daily scheduler described in
[time.md](time.md) makes `season` and `day` optional while preserving Spring day 1
behavior and flag keys for every existing 867 entry.

## Choice stakes and resolution receipts

Authored option `desc` text remains narrative flavor. `FB.previewEventOption(state, event,
option, ctx)` derives the mechanical layer from the live effect objects without writing
state, creating roles, or consuming RNG. The choice row itself retains only authored label and
description prose; its desktop contextual tooltip, or the question-mark disclosure on touch and
tablet-width or short layouts, separates non-empty **Guaranteed**, **If successful**, and
**If failed** effects. **Guaranteed** is omitted when the choice has no direct guaranteed
mechanical consequence. Guaranteed costs, penalties,
property losses, upkeep/duration, meaningful permanent outcomes, and lethal risks are exact.
Internal set/clear-flag bookkeeping is omitted because it does not explain a useful player-facing
consequence. Favorable
rewards remain qualitative until resolution. Numeric and named chance formulas render only as
Very likely (80%+), Likely (60–79%), Even (40–59%), Risky (20–39%), or Long shot (under 20%);
branch narrative is never shown early.

An option may declare all-of `requiresTech` and `showWhenTechLocked:true`.
`FB.eventOptionStatus` combines its ordinary `require` with the technology requirement.
Ordinary failed requirements retain the established hidden behavior; an opted-in missing
technology instead keeps the option visible, disabled as a choice, and annotated with the
exact missing ids. Tier-3+ players may use that row as a technology-detail link.
Autoresolve filters on the same ready status. Direct resolution rechecks the technology
portion before any RNG or mutation, so a custom caller cannot bypass a hard gate; ordinary
`require` remains an authored-flow condition for compatibility with direct event tooling.

An option may also declare `manualOnly:true` when its effect opens an interactive flow
that cannot be completed by a policy score. It remains an ordinary manual choice, but
autoresolve removes it from the candidate list and direct automated resolution rejects it
before RNG or mutation. The rare auction invitation uses this contract, leaving **Send
regrets** as its automation-safe outcome; a manual acceptance defers its auction sheet
until the current event queue has cleared.

`FB.resolveEventOption` is the single manual/autoresolve authority. It rolls once, consumes
one-shot chance bonuses, applies the top-level effects and then the selected branch in the
established order, and returns a structured receipt. `FB.applyEffects` remains safe for old
callers that ignore its return value, but now returns semantic before/after impacts with
actual clamp-aware deltas. Resolution suppresses transient effect toasts, not their durable
Chronicle messages, and adds one `kind:"choice"` entry containing the event/option/outcome
descriptors plus the complete player-facing impact ledger.
For outcome prose, concrete named-character role parameters are snapshotted before effects
run and merged into the otherwise post-effect descriptor. Marriage, annulment, friendship,
and similar relationship mutations can therefore clear their live role without replacing
the person named in the durable outcome with a generic fallback.
An autoresolved queue performs the shared post-event health, ruler-standing,
and promotion reconciliation once after the queue drains. The daily driver
does not repeat that pass after `runEvents` has already completed it.

`marketShock:{id?,provinceId?,goodId?,production?,demand?,flow?,seasons?,severe?}` is the
declarative bridge from authored harvest, disease, war, and local-disruption stories into
county markets. `provinceId` may use `home` or `context`; omitted goods affect every basket.
The preview and resolution receipt disclose the affected county, basket, direction, and
duration. Application stores only the normalized, locale-neutral shock record; it does not
consume RNG or bake rendered prose into the save.

Declarative effects are formatted by the engine. A custom option effect also registers
`FB.eventImpactAdapters[customId]` with pure `preview(state, ctx, event, effects)` and
post-resolution `report(state, captured, ctx, event, effects)` functions; `capture` is an
optional pre-effect snapshot hook. Core custom effects must have an adapter. Unregistered
mod effects degrade to **Story-specific consequence** while the authored `desc` remains
visible, so a third-party story is never blocked by missing presentation metadata.

The event modal shows a character card for the event's `charCard` role and for every
`{role}` token the event's strings mention (js/ui.js `showEvent`); cards carry the
character's house arms, home county, and the arms of the realm holding it.
Diplomatic events that name `{rname}` or `{rulername}` from `ctx.realmId` add the matching
realm card with arms, ruler, rank, Standing, and current relationship, so a compact AI
ruler is not presented as bare prose.

`data/events_agency.js` contains the four code-queued ruler/family agency
decisions. Their validators recheck the exact ruler generation, managed family
member, marriage pair, or active rebel-sponsorship record before either visible
or automated resolution. `{partner}` reads `ctx.partnerId` and adds that exact
character's card beside `{student}`; `{ambition}` renders the locale-neutral
managed ambition attached to `ctx.studentId`.

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

**The tutorial chain is code-queued teaching content.**
`data/events_tutorial.js` holds three `trigger:{never:true}`, once-per-life chapters
queued from `FB.tutorialCheck` (js/main.js): `tut_welcome` a couple of days into a
tutorial life, `tut_legacy` when the Family-and-legacy checklist track completes through
play, and `tut_livelihood` when the lower-rank Making-a-living track completes. A protagonist
who is already married when family guidance becomes eligible silently completes that track
and skips `tut_legacy`, whose child-and-inheritance framing would otherwise be misleading.
Stage flags live in `player.flags`. While the checklist remains unfinished, its
`tutorial`/`tut_*` subset follows the household through succession so a child or
collateral relative resumes the remaining chapter; other protagonist-local flags and
event memory still reset. Dismissing the checklist stops further chapters.
Options are small and all-positive so automation scores them sanely.

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
exact adverse effects, qualitative favorable effects, upkeep, and county-transfer rule.
After resolution the receipt states every supported effect exactly. Chance branches label their
success and failure consequences separately. Autoresolve scores the same modifier
objects and applies them through the same interpreter path; presentation adds no
parallel mutation.

## Intrigue decisions and evidence

Hostile attempts resolve in `js/intrigue.js`, but player-facing uncertainty remains
declarative event data in `data/events_intrigue.js`. `intrigue_warning` is a mandatory
pre-attempt choice for AI murder or abduction aimed at the protagonist or managed
household. Its context validator stamps the AI scheme id and actor generation, so a
cancelled scheme or succession silently expires the warning. Investigation, security,
counter-trap, and ignore effects update only that exact scheme.

`intrigue_hearing` is the sole gate to severe punishment of a player plotter. Queued
context contains a hearing id, exact victim/county ids, target kind, and the derived
sentence/fine preview shown before the choice; the durable
hearing holds locale-neutral evidence, severity, offense, success, and authority fields.
Suspicion never queues a hearing. Testimony, material proof, and red-handed capture do.
Challenge, compensation, penance, sentence, flight, and resistance are ordinary options
backed by custom validators/effects. Ransom demands likewise queue an exact captive and
captor-generation context. No queued intrigue event stores rendered prose.
