# National technology

Technology belongs to sovereign nations, not dynasties. It models durable knowledge and
institutional practice from inherited late-antique foundations through the medieval
diffusions of 476–1300. The campaign remains playable after 1300: projects do not acquire
hard calendar locks, exposure continues, and the historical cost curve becomes a catch-up
discount rather than stopping.

The live catalogue is `FBDATA.tech` in `data/technology.js`. It contains 180 entries in a
directed prerequisite graph across seven domains:

- agriculture and animal power;
- crafts, materials, and industry;
- commerce, transport, and infrastructure;
- learning, medicine, and natural knowledge;
- governance, law, and institutions;
- warfare and fortification;
- seafaring and navigation.

Every core definition has `domain`, `cost`, all-of `req`, optional any-of `reqAny`,
`history.attested`, `history.adoption`, a localized `desc`, `unlocks`, and `fx`. The
research catalogue and bibliography are in
[../research/medieval-technology-catalogue.md](../research/medieval-technology-catalogue.md).
The validator rejects unknown domains or traditions, malformed or reversed dates, missing
prerequisites, cycles, invalid effects or unlock references, and bad bookmark seed
overrides.

## National records and sovereignty

Every realm may retain a dormant record in `state.realmTech[realmId]`:

```js
{
  completed:[],
  exposed:[],
  active:[],
  progress:{},
  reserve:0,
  priorities:{}
}
```

All lookups resolve through `FB.techRealmId`/`FB.topRealm`, so vassals use their
sovereign's knowledge and contribute research to that national pool. Changing fealty
changes the knowledge currently available to a vassal without erasing either sovereign
record. A restored or newly independent realm resumes its dormant record.

Absorption and secession merge completed and exposed sets by union, partial progress and
reserve by maximum, and compatible active projects up to the surviving realm's slot
count. The maximum rule prevents research once shared by two polities from being
duplicated by separation and reunion.

Knowledge and exposure are permanent. `FB.hasTech`, `FB.techExposed`,
`FB.techRequirementMet`, and `FB.hasTechUnlock` are the normal gameplay queries.

The Land tab summarizes the effective sovereign's completed knowledge as a
0–10 **Technological development** rating: completed entries still present in
the loaded `FBDATA.tech` catalogue divided by the total loaded catalogue,
multiplied by 10 and rounded to the nearest integer. Exposed and active but
incomplete entries do not count. This is a compact comparison display only;
technology's gameplay effects continue to come from its individual unlocks and
`fx`.

## Traditions and bookmark seeding

Technology traditions describe overlapping routes of transmission, not mutually
exclusive civilization levels. The built-ins are Latin West, Byzantine, Islamic
Mediterranean, Persianate, Slavic, Nordic, Steppe, Baltic-Finnic, Caucasian, and Northeast
African. A realm may have more than one.

`techTraditions` and `techSeed:{complete,expose,omit}` may be authored on a bookmark realm.
Otherwise traditions derive from the capital/ruler culture and religion. On a fresh
bookmark, `FB.seedRealmTechnologies`:

1. completes entries whose regional widespread-adoption date has passed;
2. exposes entries whose regional emergence date has passed;
3. applies authored complete/expose/omit exceptions; and
4. closes completed entries over all required prerequisites.

This produces distinct 867 and 1066 starting knowledge for Byzantine, Islamic, Latin,
Nordic, Slavic, Steppe, and other realms without treating a single calendar as universal.

## Soft historical cost

Prerequisites are hard. Dates are not. `FB.techCostBreakdown` starts from the authored
base cost and applies the sovereign's regional historical window. Core default base costs
rise by first-attestation era: 20 before 476, 50 for 476–799, 100 for 800–999,
150 for 1000–1149, and 200 from 1150 onward. The full curve keeps even a dedicated
scholarly realm's remaining catalogue a multi-generation undertaking, while historical
and exposure discounts still let lagging nations catch up.

```text
before first attestation:
  4× + 1× per additional 50 years early, capped at 8×

attestation → regional emergence:
  linear 4× → 2×

regional emergence → widespread adoption:
  linear 2× → 1×

after widespread adoption:
  linear 1× → 0.7× across 300 years, then a 0.7× floor

permanent exposure:
  multiply the resulting cost by 0.65
```

The main catalogue groups entries by domain and leaves dates off the scanning view. Each
detail sheet displays the attestation and regional-adoption windows alongside the
effective research cost, exposure discount, and remaining progress. The historical and
exposure multipliers remain engine inputs rather than UI arithmetic. A far-ahead project
is therefore possible but expensive. Eligible and active projects also estimate completion
seasons from remaining progress, current research rate, the active-project share, and any
reserve the project would receive on the next seasonal distribution. The estimate does not
include time spent completing missing prerequisites and may shorten when another active
project completes.

The detail sheet's shared asset/effect row identifies the sovereign nation and
vassal-wide scope, effective research setup cost, occupied slot while active,
concrete effects and unlocks, allegiance-based access rule, and permanent
completion. Historical dates, exposure, progress, and clickable prerequisites
remain separate supporting rows.

## Research slots, reserve, and completion

A sovereign begins with one slot. `scholarly_networks` unlocks the second and
`universities` the third. Display names can use religion-sensitive variants such as
universities, madrasas, and colleges without changing the saved id.

There is one national research pool. Each season `FB.techSeason` calculates:

```text
2 + min(4, realm development × 0.04) + completed research bonuses
```

The total, including reserve, is divided evenly among active projects. Each project's
share is applied independently; completion overflow returns to reserve. If fewer slots
are occupied, unused research remains reserve. Direct `research` effects, building
research, and Patronize Scholars enter the same pool.
Patronize Scholars contributes `2 + min(3, Learning / 10)` research per season, capped at
5, in exchange for its continuing focus and gold cost. It accelerates a national project
without overwhelming the passive realm rate or the historical cost curve.

Only a sovereign player chooses projects. Player automation may select the cheapest
eligible technologies or prioritize one domain. A domain preference fills from that
domain first and falls back to the cheapest eligible projects elsewhere, so cross-domain
prerequisites cannot leave slots idle. It fills open slots immediately and after each
completion, deterministically and without consuming random rolls.

AI sovereigns fill every slot and use saved RNG to choose from a weighted score. Exposure,
affordability, historical currency, ruler traits, contextual military/economic needs,
and useful unlocks raise that score; projects still at 4× or more receive a strong
penalty. A seasonal pass builds each AI realm's eligible-project and scoring context once;
additional open slots reuse that context because selecting a project does not change
completed knowledge, research rate, or historical cost.

## Exposure and diffusion

On the first day of each year, every sovereign can gain permanent exposure to knowledge
it has not completed. Exposure may precede the prerequisites needed to research it;
`FB.techDiffusionChance` combines:

- 12% when an adjacent or strait-connected sovereign knows the entry;
- 15% when an ally knows it;
- 20% from a wartime opponent for warfare/fortification entries, 5% otherwise;
- 4% when another sovereign sharing a technology tradition knows it;
- 3% through the broader same-faith scholarly and commercial network.

The combined annual chance is capped at 50%, and all rolls use the saved game RNG.
Exposure is not completion: it is a durable contact record and the 0.65 cost multiplier.
The annual pass snapshots sovereign records and contact networks once, then preserves the
realm/technology iteration and RNG-roll order while evaluating diffusion from those
snapshots.

## Vassal advocacy

A tier-3+ vassal with at least 40 Standing with the liege may advocate one currently
prerequisite-valid technology per year. Advocacy costs 20 gold and lowers Standing by 15. The
priority lasts four years or until the liege selects or completes the entry, multiplies
the AI selection weight by six, and never interrupts an active project.

## Gameplay effects and caps

Most entries expose a discrete practice, rule, building, enterprise, career, unit access,
or research slot through `unlocks`. Data definitions use `requiresTech` for buildings,
schooling, household standards, careers, enterprises, credit, and trade partnerships.
Warfare technologies alter the existing levy/archer/cavalry/retinue classes, movement,
quality, siege progress, and composition; they do not add a second unit taxonomy.

The in-game detail sheet reports only effects that gameplay consumes: numeric `fx`,
concrete typed unlocks, and content or contracts gated by `requiresTech`. Every technology
used as a prerequisite for another technology also provides a modest direct benefit; early
foundations keep smaller bonuses than the later entries they enable so inherited 867
knowledge does not overwhelm the starting balance. Historical `practice:*`, `rule:*`, and
`unit:*` catalogue tags are documentation metadata and are not presented as mechanics.
Per-entry confidence and source references remain in the research catalogue rather than
the play UI.

Guild Charters is a consumed `rule:*` exception with a concrete deed surface: it unlocks
Craft/Trade guildmaster petitions and the baron+ local-monopoly grant picker. Eligibility
always follows the effective sovereign nation's completed record, so a vassal gains or
loses access with the sovereign technology relationship; an already issued charter keeps
its frozen numeric terms until expiry or scope invalidation.

Scalar effects resolve through `FB.techBonus`. Signed costs use
`FB.techCostModifier`/`FB.techCostFactor`; unit additions use `FB.techUnits`, and AI
composition uses `FB.techAIUnits`. `FBDATA.techCaps` limits tax, levy, battle, health,
research, domain, siege, movement, education, finance, trade, cost reductions, and unit
additions. Inherited foundations deliberately carry almost no scalar bonuses, so normal
867 income, health, development, and military power remain the baseline.

For mod compatibility, flat `build`, `retinue`, and `archers` effects remain aliases for a
building-cost discount, `units.ret`, and `units.arch`.

## Saves and legacy definitions

Save format remains 3. `realmTechMigration:2` marks the one-time graph migration.
`FB.ensureRealmTech` converts a legacy active string to an array, preserves every known
completed id, progress value, and reserve, historically backfills every living sovereign
through the current year and derived traditions, and then unions the legacy state. Old
`state.tech` and `player.research` are still imported into the effective player
sovereign. After that one-time migration, records normalize lazily at their individual
access boundary and are remembered outside serialized state for the lifetime of that
loaded record; ordinary technology lookups neither rescan every sovereign record nor
renormalize an unchanged record on every bonus query.

Runtime mods are normalized before validation: `branch` becomes `domain`, scalar or array
`req` is accepted, and `yearMin` becomes an inferred soft history window rather than a
lock. Existing `cultures` and `notCultures` restrictions remain supported.

Related: [state-and-saves.md](state-and-saves.md), [development.md](development.md),
[war.md](war.md), [finance.md](finance.md), [time.md](time.md),
[ui.md](ui.md), and [mods.md](mods.md).
