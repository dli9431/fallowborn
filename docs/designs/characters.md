# Characters: skills & growing up

**Skills grow on a soft cap.** Every skill gain (focus training, event `skills` effects,
education, coming of age) goes through `FB.gainSkill` (model.js): below
`balance.skillSoftCap` (20) each point lands; past it each must beat a
`(softCap/current)^2` roll, so single-stat stacking diminishes hard toward
`balance.skillHardCap` (40), the true ceiling `FB.skillOf` also reads up to.
Never write `c.skills[k]++` directly outside it.

**Children are players too.** When a minor heir succeeds (age < 16), the daily picker
fires only events tagged `childhood:true` (the childhood section of events_common.js plus
age-neutral events like sickness and plague) until they come of age.

**Tutors are household and neighbors.** A child aged 6–15 with an education focus learns
from a named tutor: a parent, a spouse, the priest, a friend, or a hired master. The lord
fosters only gentle children — the tutor picker offers him only at
`FB.playerStation(state) >= 2` (gentry and up); a serf's child is never sent to his hall.

**Childhood pacing.** A child's total skill income (Study focus, education tick,
childhood events) is tuned to land only modestly above an adult's (~5/yr vs ~3–4/yr):
Study runs at `dch(0.5)` — below the best adult focus's `dch(0.7)` — and childhood
lesson events carry 6–8-season cooldowns so the same lesson can't recur constantly.
Keep new childhood content inside that envelope.

**Wounds & sickness have names.** Beneath the 0–10 health number, the player carries
`c.ails` — a short list (≤3) of ailment ids into `FBDATA.ailments` (data/traits.js).
Hard blows (`fx.health` ≤ −2) add a random wound, severity 2 at −4 or worse;
`setFlag:'ill'` adds a random sickness; an explicit `fx.ailment` names one precisely.
Ailments are flavor, portrait marks, and a chip list on the character sheet — the
mechanics stay with health and the `ill` flag exactly as before (low health and
illness still drive mortality in `yearlyLife`). Wounds heal one per year once health
is back at 7+ and the character is not ill; sicknesses clear only with
`clearFlag:'ill'` (the recovery event). Portraits read `c.ails`/`c.health` directly
(`opts.ill` covers pre-ailment saves), so marks come and go with the condition;
`scarred` and `one_eyed` trait marks are drawn for every character, NPCs included.

**Regard earns its keep.** Every character carries one `opinion` of the player (−100…100).
It gates deeds and events (courtship, petitions, `roleOpinionAbove/Below` triggers), and
three multipliers make it felt everywhere: the dead `traitAgg(me).opinion` aggregate now
scales positive opinion effects in `FB.applyEffects` (likeable traits warm folk faster),
and the `scheme_rival` deed and the `plot` named chance (for plots with a personal victim)
add the target's `opinion/500` to success — a trusting victim is easier to undo. The rival
seat (`state.roles.rival`) is **player-declared**: nothing assigns it automatically — a
⚡ Declare rival button appears on a non-family character's sheet at opinion ≤ −40, and
🕊 Let the feud die clears it; events that speak of `{rival}` are all gated behind
`hasRole:'rival'` so the interpreter's lazy role creation can no longer invent one.

Related: [marriage.md](marriage.md) for spouses and child matches,
[events.md](events.md) for the event picker.
