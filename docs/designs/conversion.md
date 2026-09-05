# Conversion: adopting a new faith or culture

Players may deliberately convert — themselves, their household, or their ruled realm —
to another culture or religion through two deeds on the Deeds tab: **Convert faith…**
and **Adopt a new culture…**. Both open a picker sheet that previews the exact cost and
every penalty before anything is spent. Neither deed consumes the day.

Historical shape: a private change of heart is cheap and quiet; dragging your kin along
is a public act; turning a whole realm is the kind of decision that tore kingdoms apart
(the Arian revolts after the Visigoths accepted Catholicism at Toledo in 589, the pagan
reactions against royal baptisms in Scandinavia and Poland, apostasy penalties under the
headed faiths). Costs and penalties therefore escalate steeply with scope.

## Scopes

- `self` — the player character only.
- `household` — the player and `FB.householdMembers` (the same managed-household unit
  `FB.foundFaith` uses).
- `realm` — **religion only**: sets `state.realms.player.religion` in addition to
  converting the household. Requires a living landed ruler (`tier >= 3` with an alive
  player realm). Culture has no realm scope: realms carry no `culture` field (realm
  culture is derived from ruler and capital). County culture and faith are live saved
  demographic identities, but a realm conversion deliberately does not transfer any
  county community population.

## County and settlement community projects

County conversion is a territorial demographic process, separate from every character
scope above. `FB.convertCountyCommunity(state, pid, request)` is the atomic boundary: a
faith transfer preserves the culture of every converted cohort, while a culture transfer
preserves its faith. The request names `kind`, `target`, an integer `amount` or bounded
`rate`, and optionally one source identity. Without a source, all eligible non-target
cohorts contribute proportionally through deterministic largest-remainder allocation.
The county and world population totals never change.

`FB.convertSettlementCommunity(state, pid, settlementIndex, request)` uses the
same request contract but transfers only inside the named settlement row. The exact
change rolls up into the county's combined community counts and dominant identity while
the settlement population and every other settlement row remain unchanged. The first
local write materializes the county's optional community-by-settlement matrix; read-only
settlement identity and share helpers never do.

Each county may save at most one faith and one culture project under
`communityProjects`. A project records only semantic inputs and numeric outcomes:
`target`, `sponsor`, `startTurn`, `policy`, fractional `progress`, cumulative `converted`,
the last calculated `resistance`, `lastTransfer`, and `lastYear`. A project survives
ordinary conquest as part of county population state, but progress stops whenever its
saved sponsor no longer controls the county. Ownership transfer and ruler, household, or
realm conversion never create a project implicitly.

Projects resolve once per year after conserved migration. The pure
`FB.countyCommunityProjectStatus` explanation separates pressure from the bounded annual
rate. Sponsor identity, target-community support, and target-faith temples or cathedrals
raise pressure. Population size, relation between source and target faiths or culture
groups, years of entrenched dominant identity, unrest, war, occupation, religious
tolerance, and policy holdouts shape resistance or reduce the rate. Sub-person minimum
work is carried as fractional progress until it reaches the data-defined meaningful
transfer floor; no RNG is consumed.

`FBDATA.countyCommunityPolicies` supplies localized policy identity and consequences,
while `balance.countyCommunityProjectPolicies` supplies mechanics:

- `voluntary` is slow outreach with low resistance and no forced flight;
- `integrative` uses office, marriage, schooling, and patronage for the strongest
  non-coercive rate;
- `coercive` adds the `community_coercion` county modifier and migration pressure, then
  pays substantially greater resistance, holdout pressure, and a lower rate cap. As the
  target share grows, those holdouts make its returns diminish sharply.

`FB.startCountyCommunityProject`, `FB.stopCountyCommunityProject`, and the player-facing
order boundary in `js/actions.js` remain UI-neutral. Land owns the player controls and
always carries the selected county id through target, policy, review, confirmation, and
stop. Only a living count-or-higher ruler who directly holds that county may issue them.
The pure `FB.countyCommunityProjectPreview` evaluates an unopened proposal through the
same pressure/resistance calculation as an active project, without temporarily writing it
to state. Starting or changing a baseline project has no immediate piety, prestige,
Standing, or relationship charge; the confirmation says so explicitly and presents the
actual Common Voice, unrest, economic, and migration consequences of its policy. The Self
Faith sheet remains about personal, household, and realm conversion. It links separately
to that picker and to explicitly named Land counties, but never owns or silently targets a
territorial project.

Settlement projects reuse the same saved project fields, annual pressure/resistance
model, and policy consequences under `settlementCommunityProjects[settlementIndex]`.
Their eligible population, target share, and potential transfer come only from that
slot. The selected settlement sheet owns start, change, and stop controls and retains
both the settlement and county name at every step. Its target and policy picker is a
two-step local flow: target rows keep only identity and current share visible, while
policy rows keep the immediate action, estimated annual pace, and resistance visible.
Descriptions, scaled county consequences, replacement terms, and annual timing use the
shared desktop tooltip or compact-layout `?` disclosure. Selecting a policy starts or
replaces the local project immediately; settlement policy has no separate confirmation
sheet. A count can direct any settlement in a directly held county; a baron can direct
only the saved home settlement. County Land controls remain county-wide and retain their
review/confirmation step, and Self/Faith never chooses a settlement implicitly.

On the settlement sheet, each local-project card keeps only the axis, target, policy,
current annual estimate or paused state, and resistance visible. The policy description,
last annual transfer, exact scaled county contribution, local-only scope, and annual
timing live in that card's shared desktop tooltip or compact `?` disclosure. Inactive
cards say only that no project is active and offer the start action; their disclosure
explains scope and timing. Because the surrounding sheet already supplies the settlement
context, these actions use concise Start/Change/Stop project labels.

Tax, levy, Common Voice, unrest, and market flow are county aggregates rather than
separate settlement ledgers. A local coercive project therefore contributes its policy
effects dynamically in proportion to that settlement's share of county population; it
does not create the full `community_coercion` county modifier. The settlement picker and
active-project card show the scaled county contribution, and stopping the local project
ends it immediately. County-wide coercion retains the ordinary temporary modifier and
expiry behavior.

## Costs

Piety pays for religion, prestige for culture, scaled by scope; larger scopes charge
both. All numbers are `FBDATA.balance` knobs.

| Scope | Faith | Culture |
|---|---|---|
| self | 100 piety | 150 prestige |
| household | 250 piety + 150 prestige | 450 prestige + 150 piety |
| realm | 600 piety + 400 prestige | — |

The realm faith cost sits deliberately near claiming the Caliphate (300 piety + 500
prestige), the other deed that reroutes the religious world.

Faith costs are further multiplied by how far the target is from the current faith on
the relation graph (`FB.faithRelation`): in-fold ×0.6, schismatic ×0.8, foreign ×1.0,
hostile ×1.25. Swimming to a neighboring branch of your own tradition is the historical
norm and the cheap path; apostasy to a hostile faith is the ruinous one. Culture costs
are similarly scaled by regional tradition distance (`FB.cultureRelation`): same
tradition group ×0.8, foreign culture group ×1.25.

## Penalties

Conversion is never just a purchase. Every scope carries penalties beyond the resource
cost:

- **Standing re-base (automatic).** Because Standing is stored relative to a faith
  baseline (`faithStandingBase` / `faithAdjustedStanding`), simply changing
  `char.religion` re-bases every character and realm Standing against the old faith:
  old co-religionists fall from +15 toward −10 or −25 with no extra code.
- **Popular opinion**: −10 (self), −30 (household), −50 (realm) via
  `FB.applyEffects({popularOpinion})`.
- **Old-fold and old-culture realms**: household and realm conversions apply an explicit
  Standing hit (−10 / −25 for faith, −15 for culture) with every realm of the abandoned
  fold or culture via `FB.adjustStanding`, on top of the automatic re-base.
- **Vassals**: a realm faith conversion costs −35 Standing with every vassal realm; a
  household culture conversion by a landed ruler costs −25 Standing with every vassal realm.
- **Zealot & Cultural unrest**: the `zealot_unrest` county modifier (1440 days: unrest +0.35,
  common voice −12, tax −8%, levy −5%) is applied to the home county on a household
  faith conversion, and to **every player-held county** on a realm faith conversion.
  The `cultural_unrest` county modifier (1440 days: unrest +0.35, common voice −12, tax −8%,
  levy −5%) is applied to the home county and player-held counties that do not share the new
  culture on a household culture conversion. This ongoing unrest depresses popular opinion
  and raises the long-term risk of traditionalist rebellions and peasant revolts
  (`cultural_backlash`, `peasant_revolt`, `df_murmurs` → `df_league` → `df_revolt`).
- **Excommunication**: abandoning a faith served by the papacy system while a Pope
  reigns earns an excommunication sentence through the ordinary papacy record path.
- **Great holy wars**: a realm converted out of the fold becomes a valid crusade/jihad
  target automatically, since great-holy-war targeting already filters on
  `FB.faithInFold`.
- **Doctrine fallout (automatic)**: marriage spouse limits, divorce cost, accepted
  relations, clergy access, blessings, and absolution all follow the new faith's
  position in the graph without conversion-specific code. Existing marriages stand;
  doctrine applies from the conversion onward.

## Limits

Both deeds carry a 730-day cooldown for personal `self` conversion (`faithConversionSelfCooldown` /
`cultureAdoptionSelfCooldown`) and a 1,460-day (4-year) cooldown for `household` or `realm` conversion
(`faithConversionHouseholdCooldown` / `cultureAdoptionHouseholdCooldown`), disabling subsequent
conversions across all scopes while active. Realm faith conversion is additionally **once per
ruler**, recorded as `player.realmFaithConversion = {charId, turn, from, to}` (the same
pattern as the once-per-ruler capital move) — a crowned convert does not get to shop
for religions.

## Soft gating (Interaction & Presence)

Conversion choices are soft-gated to traditions the player character or dynasty has
encountered through organic gameplay interactions:

- **Shared tradition / fold**: branches of your own religious tradition or culture group.
- **Kin & Court**: spouse, betrothed, household members, personal network contacts, or captives.
- **Geography & Lands**: any live community in the home county, realm provinces, capital,
  or bordering neighbor counties.
- **Diplomacy & Trade**: liege, vassals, trade partner realms, treaties, or active wars.
- **Travel & Pilgrimage**: visited destinations, campaign chronicles, and founded faiths.

Distant, unencountered traditions remain hidden from the picker and gated until the player
comes into contact with them through marriage, expansion, diplomacy, or travel.

Culture affinity is data-driven. Each `FBDATA.cultures` record may name one
`tradition`, resolved through `FBDATA.cultureTraditions`; missing memberships fall back
to `other` for legacy and newly added mod cultures. The same records supply both
same-tradition conversion distance and the picker's localized heading, icon, and order,
so engine and UI grouping cannot drift apart.

## Implementation notes

- `FB.conversionStatus(state, kind, targetId, scope)` in `js/actions.js` is the single
  gate/preview function; `FB.applyConversion(state, kind, targetId, scope)` revalidates
  and then performs the writes. `FB.conversionTargetPresence(state, kind, targetId)` and
  `FB.conversionTargetEncountered(state, kind, targetId)` determine soft-gated availability.
  County and neighbor presence uses positive live culture/faith share rather than the
  immutable bookmark principal, so migration can introduce an encountered tradition.
  Apostasy previews read the normalized saved Roman obedience without running the full
  Papacy repair for every candidate card; applying the conversion still enters the
  ordinary mutating Papacy path before recording the sentence.
- The picker sheet (`FB.ui.showConversionPicker` in `js/ui_modals.js`) presents encountered
  candidates grouped by tradition (Christian, Islamic, Pagan, Zoroastrian, Jewish,
  Reformed/Custom, or Cultural regions) with segmented scope controls, live search, clean cards,
  highlighted costs, and interactive doctrine tooltips, previewing the exact cost, distance tier,
  and penalty list before confirming.
- Deeds: `convert_faith` (Faith group) and `adopt_culture` (Life group), both
  `noConsume:true`, adult-only, war-locked like other religious deeds.
- Technology impact review: `faith_conversion`, `culture_adoption`, and
  `county_community_conversion` are recorded in
  `FBDATA.techImpactReviews` as `mode:'none'` — personal and social acts with no
  credible technology dependency; rulers and county or settlement communities converted
  long before (and regardless of) literacy or law innovations. A later independently gateable
  administrative improvement must receive its own review instead of gating the baseline.

## Declarative events and ruler policy

Community-aware events test the live saved population rather than bookmark labels. County
and settlement triggers cover dominant culture or faith, an identity’s minimum/maximum
share, mixed-population thresholds, and active/inactive project state. Settlement checks
must retain a numeric slot, `$context`, or `$home`; county checks resolve an explicit
province, the snapshotted event location, then the player’s home.

Event transfers accept exactly one positive integer `amount` or fractional `rate` and call
`FB.convertCountyCommunity` or `FB.convertSettlementCommunity`. `communityMigration`,
`communityExpulsion`, and `communityResettlement` preserve the selected culture-faith
cohorts through `FB.moveCommunityPopulationByPolicy`; expulsion must name the affected
community. County and settlement project start/stop effects call the same project boundaries
as Land. None of these outcomes changes a realm, named character, or political faith.

AI rulers consider county-wide projects once per year after demographic resolution. A
ruler must directly hold the county; the ruler’s identity must already represent at least
12% of a stable local population; and a capital, a 25% local base, or a durable
`defend_faith`/`strengthen_crown` aim must supply a motive. War, occupation, high unrest,
and an existing project exclude a candidate. Related communities tend toward integrative
policy, unrelated communities toward voluntary policy, and coercion is reserved for a
zealous defender confronting a hostile faith under unusually stable conditions. A saved-RNG
16% annual choice and a four-project world cap keep intervention sparse. These values are
data-driven under the `countyCommunityAI*` balance keys.

`FB.observeCommunityProject` is a read-only 25/50/100-year calibration helper. It clones the
serializable campaign and runs the real project resolver without world simulation or RNG;
`FB.populationSaveDiagnostics` reports serialized population bytes, materialized settlement
matrices, cohorts, and projects. Calibration covers both bookmarks and deliberately expects
mixed communities to persist for generations. The reusable situations in
`data/events_communities.js` are informed by Nora Berend’s *Christianization and the Rise of
Christian Monarchy* ([Cambridge excerpt](https://assets.cambridge.org/97805218/76162/excerpt/9780521876162_excerpt.pdf)),
Miri Rubin’s [*Cities of Strangers*](https://www.cambridge.org/core/books/cities-of-strangers/DF614DA2B1B257B2F771EE9C412550E3),
and the Cambridge Economic History chapter
[“Settlement and Colonization of Europe”](https://www.cambridge.org/core/books/abs/cambridge-economic-history-of-europe-from-the-decline-of-the-roman-empire/settlement-and-colonization-of-europe/82F19CC44B726D691C367968AACCFB2F): gradual adoption, elite sponsorship,
frontier resettlement, durable urban minorities, and coercive flight remain choices rather
than scripted geographic outcomes. The annual agency pass may queue at most one currently
valid player-relevant situation, with a 10% roll and an eight-year saved cooldown; opening or
ignoring a different county never retargets the queued context.
