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
  culture is derived from ruler and capital), and county culture/faith remains authored
  world data — a realm conversion deliberately does not convert provinces.

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
- **Geography & Lands**: home county, realm provinces, capital, or bordering neighbor counties.
- **Diplomacy & Trade**: liege, vassals, trade partner realms, treaties, or active wars.
- **Travel & Pilgrimage**: visited destinations, campaign chronicles, and founded faiths.

Distant, unencountered traditions remain hidden from the picker and gated until the player
comes into contact with them through marriage, expansion, diplomacy, or travel.

## Implementation notes

- `FB.conversionStatus(state, kind, targetId, scope)` in `js/actions.js` is the single
  gate/preview function; `FB.applyConversion(state, kind, targetId, scope)` revalidates
  and then performs the writes. `FB.conversionTargetPresence(state, kind, targetId)` and
  `FB.conversionTargetEncountered(state, kind, targetId)` determine soft-gated availability.
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
- Technology impact review: `faith_conversion` and `culture_adoption` are recorded in
  `FBDATA.techImpactReviews` as `mode:'none'` — personal and social acts with no
  credible technology dependency; rulers converted long before (and regardless of)
  literacy or law innovations.
