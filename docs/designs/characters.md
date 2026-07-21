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

Related: [marriage.md](marriage.md) for spouses and child matches,
[events.md](events.md) for the event picker.
