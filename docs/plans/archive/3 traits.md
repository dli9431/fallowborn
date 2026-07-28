# Design: trait layers and earned traits

Date: 2026-07-27

Status: implementation plan against Fallowborn v1.67.0. Companion plans:
[settlement council and vows](1%20settlement.md) (Oathfast feeds the vow claim basis)
and [temporary county and campaign modifiers](2%20modifiers.md) (the famine/unrest tag
convention several depth effects read). The framework lands once, then the earned set
grows across releases.

## Goal

Formalize the four trait classes (disposition, formation, reputation, condition) on top
of the existing catalog and the ailment boundary, make acquisition part of the fiction
(a life story rather than a birth bundle), and grow the event-earned set with entries
whose depth effects have live hooks. Add layers and system-grouped modifiers while
retaining current root fields through a compatibility reader.

## Current implementation (v1.67.0)

- **The catalog.** `data/traits.js` holds 38 entries. Field union: `name`, `icon`,
  `desc` (display, localized), `dip`/`mar`/`ste`/`int`/`lea` (integer skill bonuses),
  `opinion`, `health` (additive survival modifier), `fert` (multiplier), `inherit`
  (0..1 birth chance), `opposite` (mutual exclusion), and a latent `noRandom` boolean
  that the random-generation filter honors (`model.js:254`) but no entry sets.
- **No class field exists.** The only structural partitions are implicit: `opposite`
  marks the thirteen personality pairs, `inherit` marks the congenital set, and a
  hardcoded array in `FB.makeCharacter` (`model.js:255`) excludes the eight acquired
  traits (`veteran, literate, pilgrim, scarred, one_eyed, maimed, kinslayer,
  excommunicated`) from random generation. No code switches on a category.
- **The earned set today**: Scarred, Lettered (id `literate`), Veteran, Pilgrim,
  Kinslayer, Excommunicated, plus the wound-permanents One-Eyed and Maimed. A gap
  worth fixing: **Kinslayer is defined but has no grant path anywhere**; it is only
  referenced by a death-legend quip (`main.js:1866`).
- **Aggregation.** `FB.traitAgg(c)` (`model.js:334`) sums skills, health, and opinion
  and multiplies `fert`. `FB.skillOf` adds it to trained skills and item bonuses;
  yearly mortality subtracts the health term; conception multiplies both parents'
  `fert`; the opinion term scales positive opinion gains
  (`amt * (1 + agg.opinion/200)`, `events.js:2217`).
- **Grant and loss.** `FB.addTrait` strips the `opposite` and has no count cap;
  `fx.addTrait` / `fx.addTraitOnce` / `fx.removeTrait` are the event keys (the two
  add forms are literally the same function). Inheritance rolls each parent trait's
  `inherit`, adds a flat 2% genius chance, and caps inherited traits at three.
- **Ailments are already the transient layer.** `FBDATA.ailments` (same file) has a
  real discriminator (`kind: 'wound' | 'sickness'`), severity, portrait `mark` cues,
  a cap of three, and healing rules (wounds knit yearly at high health, sickness
  clears with the `ill` flag). Several event sites already promote a bad ailment
  outcome into a permanent trait (scarred, one_eyed, maimed), which is exactly the
  ailment-to-condition boundary described below.
- **UI.** `traitChips` renders a flat, ungrouped list; tooltips summarize effects via
  `traitFxText`; `UI.showTraitModal` itemizes skills, constitution, fertility, and
  regard. Ailment chips already sit under their own header, so grouped presentation
  has a precedent.
- **Save surface: near zero.** Characters store traits as id-string arrays serialized
  verbatim under save v3. Classes and new effects live in `FBDATA` and code, so the
  layering itself touches no saved state; only acquisition counters (below) are new
  state, additive as usual.

## Design

### The four classes

Add a `class` field to every entry, with definitions chosen so the existing catalog
partitions cleanly:

- **disposition**: a persistent tendency of character; the personality pairs, genius,
  quick, dull, drunkard.
- **formation**: upbringing, service, or learned practice; Lettered, Veteran, Pilgrim,
  and most of the new set.
- **reputation**: what courts and communities believe; Kinslayer, Excommunicated, and
  the new social entries. Normally `inherit:0`, event-earned, and losable: later
  events can contradict or convert them.
- **condition**: a physical or material circumstance, congenital or acquired; strong,
  frail, comely, homely, sickly, robust, scarred, one_eyed, maimed. Lasting
  circumstances that outlive an ailment land here (for example, Scarcity-Hardened).

Inheritance stays orthogonal: `inherit` keeps meaning what it means today, on whatever
class carries it. Formation, reputation, and condition entries default to `inherit:0`
unless explicitly congenital.

What the class drives:

1. **Random generation.** Set the latent `noRandom:true` on every event-earned entry
   and delete the hardcoded exclusion array at `model.js:255`. The mechanism already
   exists and is tested by its absence; this makes it data-driven for mods too.
2. **UI grouping.** `traitChips` groups by class with small headers (the ailment-chip
   pattern), and the trait modal gains a class tag and an acquisition line ("Earned:
   survived the shield-wall") so the life story reads on the sheet.
3. **Authoring discipline.** New earned content declares its class; validators and
   MODDING.md describe the taxonomy instead of a folk convention.

### System-grouped modifiers

Keep every current root field working unchanged (`traitAgg` is the compatibility
reader and does not change). New depth effects go in named groups, read by the systems
that own them through a generic reader mirroring `FB.techBonus`:

```js
fieldwise:{
  name:'Fieldwise', icon:'🌾', class:'formation', inherit:0,
  ste:2,
  estate:{ famine:-0.10 },
  vow:{}, travel:{}, assembly:{}          // groups exist only where used
}
```

`FB.traitBonus(c, group, key)` sums `def[group][key]` over a character's traits. Each
group is owned by one consumer: `vow` by the settlement engine, `travel` by
`travelLegDays`/encounter rolls, `assembly` by `parliamentVoteChance`, `estate` by the
tax ledger and the event tag convention. A depth effect only ships when its consumer
hook exists; the proposed numbers are starting values, not commitments.

### Growing the earned set

Wave 1 contains entries whose depth hooks are live now or land with the sibling arcs.
Acquisition is event-driven, with small additive counters on `state.player`
where memory is needed (journeys completed, vows kept, disputes won); several can read
existing state instead (`greatHolyWarHistory` for vows, the travel record, war
history).

| Trait | Class | Ships when | Depth hook |
| --- | --- | --- | --- |
| Oathfast | reputation | with or right after the settlement arc | vow claim basis +15%, broken-vow penalties +50% ([settlement plan](1%20settlement.md)) |
| Moot-Speaker | reputation | any time | `FB.parliamentVoteChance` bonus, Common Voice gain scaling |
| Roadwise | formation | any time | `travelLegDays` -10%, encounter danger -15% |
| Muster-Bred | formation | any time | levy rate term in the composition ledger |
| Rent-Shrewd | reputation | any time | direct-rent term in `FB.playerTax`, Common Voice -5 |
| Hearth-Steady | disposition | any time | spouse/close-kin opinion, household crisis events |
| Scarcity-Hardened | condition | after the modifier arc | famine tag scaling ([modifier plan](2%20modifiers.md)); earned by surviving a serious dearth |
| Fieldwise | formation | after the modifier arc | famine tag scaling; survey effects wait for Counted Ploughlands content |

Wave 2, no scheduled slot: Hall-Reared and Fostered Abroad (childhood content),
Seal-Wise (chancery/charter content), Feud-Minder (the rivalry system already ticks
seasonally and is the natural hook), Boundary-Walker, and Custom-Keeper, which should
wait until a customary-right system provides a real claim-strength hook.

Also in wave 1: **give Kinslayer its grant path** (kin-death plots and succession
violence already exist as content; the trait is sitting defined and unreachable).

### Losing and converting

Reputations are the losable layer. The existing `fx.removeTrait` is enough machinery;
the work is content: a broken vow strips Oathfast (and the
settlement history remembers), absolution already clears Excommunicated
(`FB.seekAbsolution`), a lost public dispute can strip Moot-Speaker. Conversion
(Rent-Shrewd hardening into a disposition, say) is authored as remove-plus-add in one
event; no new mechanism.

### Ailment boundary

Unchanged and explicit: ailments remain the transient physical layer with their own
catalog, cap, and healing; the condition class is for what outlives them. The existing
ad hoc promotions (a festering wound leaving Scarred or Maimed) become the documented
pattern for new conditions like Scarcity-Hardened.

## Save, compatibility, testing

- No save impact from classes or grouped effects (data plus code only). Acquisition
  counters are additive under v3 with lazy init, one small `ensure` touch.
- Mods that add traits without `class` keep working: unclassed entries render in an
  "Other" group and are treated as `noRandom` only if they set it, exactly today's
  behavior.
- `docs/MODDING.md` gains the class taxonomy, group schema, and reader; new display
  text is routed through i18n as authored (`dt` already localizes trait fields).
- Manual browser checklist: random generation excludes earned entries (data-driven
  path), inheritance unchanged, chips grouped with correct classes, each wave-1
  acquisition event fires and the depth effect shows in its ledger (tax line, levy
  ledger, travel days, vote chance), removal events strip reputations, and an old
  save loads with its pre-arc characters displaying correctly.

## Ship

The framework (classes on the existing 38, grouped-modifier reader, UI grouping,
noRandom migration) is one MINOR with a devlog beat; wave-1 traits land with it or
trail as PATCH/MINOR content alongside their consumer arcs. This arc has no single
finish line; the earned set keeps growing as systems give new effects somewhere to
live.

## Open questions

- A soft cap or diminishing presentation for earned traits over a long life? Nothing
  caps `addTrait` today; recommendation: no cap, but the grouped UI keeps long lists
  readable, revisit if late-game sheets bloat.
- Should education formalize as formation content (Lettered is the only education
  trait today), or wait for childhood-play depth? Recommendation: wait; Hall-Reared
  and Fostered Abroad are the natural first childhood entries.
- Whether AI characters acquire wave-1 traits through the same events or through
  cheaper generation-time seeding. Recommendation: same events where they already
  fire for NPCs, seeding only if courts feel too uniform.
