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

Related: [marriage.md](marriage.md) for spouses and child matches,
[events.md](events.md) for the event picker.
