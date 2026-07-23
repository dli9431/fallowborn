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

**Lower-station stories have two paces.** The Old Custom landmark chain starts randomly
for an adult at tier 0–2, then advances through high-weight stage flags so its five
chapters unfold across later event slots. Its hearing uses four stat-specific formulas,
with accumulated evidence and the player's situation modifying the case. The Mill's Due,
Master's Empty Bench, and Words Before Dawn are two-part stories whose second decision is
queued immediately; they are once per life. Short lower-station incidents remain ordinary
cooldown events. Chain flags are life-local and disappear at succession with the rest of
`player.flags`.

Related: [war.md](war.md) for the war-council events, [characters.md](characters.md) for
the childhood event filter, [time.md](time.md) for slot days and autoresolve.
