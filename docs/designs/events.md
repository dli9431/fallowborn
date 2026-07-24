# Events are data

`js/events.js` interprets declarative triggers/effects (documented exhaustively in
docs/MODDING.md). New effect/trigger keys must be added there *and* documented in
docs/MODDING.md. Events fired from code use `trigger:{never:true}` and are queued via
`state.eventQueue` / effect `queue`.

Event-data `cooldown` stays in seasons — the engine multiplies by 90 (see
[time.md](time.md)).

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
entry's year and realm/new-realm id, not its array position, so inserting another scripted
event cannot change the meaning of a saved key.

The event modal shows a character card for the event's `charCard` role and for every
`{role}` token the event's strings mention (js/ui.js `showEvent`); cards carry the
character's house arms, home county, and the arms of the realm holding it.

A queued event with `nameChild: true` (births, `ctx.childId`) adds a rename field to the
modal — prefilled with the generated name, applied when any option is chosen; autoresolve
keeps the generated name.

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

**Lower-station stories have two paces.** The Old Custom landmark chain starts randomly
for an adult at tier 0–2, then advances through high-weight stage flags so its five
chapters unfold across later event slots. Its hearing uses four stat-specific formulas,
with accumulated evidence and the player's situation modifying the case. The Mill's Due,
Master's Empty Bench, and Words Before Dawn are two-part stories whose second decision is
queued immediately; they are once per life. Short lower-station incidents remain ordinary
cooldown events. Chain flags are life-local and disappear at succession with the rest of
`player.flags`.

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
through every chapter, and the reunion weds him with a plain `marry:true` or dismisses him with
`clearSuitor`. The shield-wall chapter can win loot, leave scars, or kill: the grave wound is a
visible `health` hit (so the autoresolve guard in [time.md](time.md) can see it) plus a small,
martial-tempered `FB.fns.polly_rout` roll that the rout proved mortal. It fires for women of
every faith — the woman-in-arms motif is at home in the Persian and Arabic epics too (Gordāfarid,
Khawla bint al-Azwar) — so the setup, drill, and reveal carry `{default, muslim, pagan}` text
variants: the *amir’s* muster and a nod to the warrior-women of the old tales in Muslim lands,
the *chief’s* war-band and the shield-ring among the pagans (Christian/Jewish players get the
`default` Frankish register).

Related: [war.md](war.md) for the war-council events, [characters.md](characters.md) for
the childhood event filter, [time.md](time.md) for slot days and autoresolve.
