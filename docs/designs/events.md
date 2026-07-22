# Events are data

`js/events.js` interprets declarative triggers/effects (documented exhaustively in
docs/MODDING.md). New effect/trigger keys must be added there *and* documented in
docs/MODDING.md. Events fired from code use `trigger:{never:true}` and are queued via
`state.eventQueue` / effect `queue`.

Event-data `cooldown` stays in seasons — the engine multiplies by 90 (see
[time.md](time.md)).

The event modal shows a character card for the event's `charCard` role and for every
`{role}` token the event's strings mention (js/ui.js `showEvent`); cards carry the
character's house arms, home county, and the arms of the realm holding it.

A queued event with `nameChild: true` (births, `ctx.childId`) adds a rename field to the
modal — prefilled with the generated name, applied when any option is chosen; autoresolve
keeps the generated name.

Related: [war.md](war.md) for the war-council events, [characters.md](characters.md) for
the childhood event filter, [time.md](time.md) for slot days and autoresolve.
