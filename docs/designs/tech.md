# National technology

Technology belongs to sovereign nations, not dynasties. Every realm may retain a dormant
record in `state.realmTech[realmId]`:

```js
{ completed:[], active:null, progress:{}, reserve:0 }
```

All gameplay lookups resolve a character or realm through `FB.topRealm`, so vassals receive
their sovereign's completed technology and contribute to the sovereign's current project.
Changing fealty therefore changes the technology currently available to a vassal without
deleting either nation's knowledge. A restored or newly independent realm resumes its own
dormant record.

`FBDATA.tech` (in `data/map_data.js`) defines three linear branches—`military`, `economy`,
and `administrative`—with five levels each. `branch` and `level` place a definition in a
branch; `req`, `cost`, and `yearMin` gate it. `cultures` and `notCultures` choose mutually
exclusive variants when a project begins. This is how a Greek sovereign begins `tagmata`
instead of `stirrups`; the chosen id remains completed even if the ruler's culture later
changes. There are no repeatable technologies.

Only a sovereign player may choose or switch the one active project. Switching preserves
the old project's value in `progress[id]`. Vassals see the sovereign ruler and project
read-only; Patronize Scholars, libraries, and `research` event effects still add to that
project. If no project is active, additions collect in `reserve` and pour into the next
selection. AI sovereigns use saved RNG to choose among each branch's next eligible level,
with aggression and ruler traits weighting the branch.

Every season each living sovereign gains:

```text
2 + min(4, realm development × 0.04) + completed research bonuses
```

`FB.techSeason` applies the gain and lets AI nations select their next project. The player
automation switch, “Choose the next technology automatically,” is available only while
the player is sovereign. Completion emits one structured Chronicle message and toast to a
player who belongs to that nation. Succession does not interrupt a project.

Bonuses resolve through `FB.techBonus`. Signed cost modifiers use
`FB.techCostModifier`/`FB.techCostFactor`; unit additions use `FB.techUnits`, and AI army
fractions use `FB.techAIUnits`. The nested effects are:

- `fx.tax`, `levy`, `battle`, `devCap`, `health`, `research`, and `domain`
- `fx.costs.{build,enterprise,training}` as signed fractional changes
- `fx.units.{levy,arch,cav,ret}` as flat player-host contributions
- `fx.aiUnits.{arch,cav,ret}` as AI professional composition fractions

For mod compatibility, flat `build`, `retinue`, and `archers` effects remain readable as
aliases for a building-cost discount, `units.ret`, and `units.arch`.

Secession and restoration merge the new sovereign's record with its former sovereign by
completed-set union and the maximum value of each partial progress entry and reserve.
Absorption uses the same merge into the surviving sovereign and retains that sovereign's
active project. The maximum rule prevents two realms that previously shared research from
duplicating it by separating and reuniting.

Save format remains 3. On the first restore of an older life, `FB.ensureRealmTech` moves
`state.tech` and `player.research` into the player's effective sovereign record. Duplicate
legacy repeatable capstones collapse to one completion, and their historical additional
purchase costs are refunded into `reserve`. Fresh bookmarks and AI realms begin at level
0 in all branches.

Events gate `techs`/`notTechs` against the player's effective national completed set.
Careers and enterprises may declare `requiresTech`; the built-in Administration career
requires `royal_chancery`.

Related: [development.md](development.md) for costs and the development cap,
[war.md](war.md) for technology-shaped host composition, and [time.md](time.md) for
seasonal progress and automation.
