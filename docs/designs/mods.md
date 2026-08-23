# Mods

**Mods** (`js/mods.js`) merge JSON from localStorage over `FBDATA` **before** world
generation — anything reading FBDATA at load time must run after `FB.mods.applyStored()` in
the boot path. Same-`id` entries replace; new ids are added. A mod's optional cosmetic
`name` labels it on the title screen (`refreshTitle` in main.js) and in the Mods dialog
(which lists active mods with per-mod removal); re-applying a same-name mod replaces the
stored copy.

Saves store only province/realm ids, so map changes can orphan old saves — every save is
therefore stamped with `FB.mods.sig()` (the `mods` field in save.js, covering stored mods
and enabled bundled mods alike) and `G.loadSlot` refuses to load a save whose mod set
differs from the active one.

**Bookmarks are atomic world definitions.** A mod may provide `bookmarks` keyed by
bookmark id; each value replaces that entire bookmark and must include its date,
provinces, realms, de jure hierarchy, straits, optional crossing classes, and scripted
history. It is validated
only when activated, after all enabled mods have applied. The existing top-level
`provinces`/`realms`/hierarchy/straits/crossingClasses/scripted fields remain the public
867 merge API. `straits` keep their two-id pair format; `crossingClasses` merges by its
canonical pair key and may classify an existing edge as `narrow`, `coastal`, or `open`.
An omitted classification defaults to `narrow`.
An optional `religiousHeads` map binds faith ids or stable `head.officeId` values to
realm ids inside that atomic bookmark. Activation rejects unknown offices, effective
faiths without head metadata, and mapped realms absent from the bookmark; omission uses
each office's effective `head.realm` fallback.

A legacy mod that changes any world-shaping top-level field—provinces, realms,
hierarchy, straits, crossing classes, scripted history, coastline, seas, or bounds—without also providing
its own complete `1066` bookmark makes 1066 unavailable for new games. The picker
explains the restriction; 867 still works. Non-world mods leave both bookmarks
available. Hidden bookmarks are not deleted, so an existing matching mod-stamped save
can still load its recorded bookmark. Decorative `rivers` are shared across bookmarks and
do not trigger this restriction by themselves. Legacy top-level `straits` are append-only;
removing or replacing crossings requires an atomic bookmark definition.

`defaultBookmark` is an optional last-mod-wins scalar. It must name a complete bookmark
present after the mod stack merges and controls the title-map/fallback world activated at
boot. An invalid id is a boot error rather than a request to fall back silently to 867.

Physical settlement sites are the shared coordinate table, not a bookmark world field:
an optional top-level `settlementSites` object merges by site id into
`FBDATA.settlementSites` before validation. The per-county ordered `settlements`
presentation lists ride inside the atomic bookmark provinces (or a legacy 867
`provinces` replacement, which already replaces the whole same-id record). Missing
physical data or invalid presentation data fails bookmark validation; a mod supplying
neither field receives deterministic generated sites and keeps its current names,
kinds, and indices. See the Settlements section of `docs/MODDING.md`.

**Bundled mods** (`mods/*.js`) register
`{id, name, desc, data}` into `window.FBMODS` via a script tag after the data files; the
Mods dialog toggles them, and enabled ids persist in localStorage (`fb_mods_bundled`) and
apply ahead of pasted mods.

Localization catalogs describe the core English data, but are never allowed to mutate it.
The source hash is calculated after mods are applied. Effective event sources are indexed
before locale validation so newly added mod text always has an English fallback. A mod's
authored name, description, and prose remain English unless they exactly match a known
catalog source; translation packs for third-party mods are outside the core v1 contract.

Culture definitions replace or add atomically by id under `cultures`, while cultural
affinity definitions replace or add by id under `cultureTraditions`. A culture's
optional `tradition` points at the resulting table; new definitions without one fall
back to `other`. For compatibility, a replacement of an existing culture that omits
`tradition` retains that culture's previous membership. Tradition `name`, `icon`, and
`order` drive conversion grouping and their labels use structured-data localization.

Religion definitions replace or add atomically by id under `religions`, then compile as
one inheritance graph after the complete mod stack is applied. `group` is the parent
definition, broad `assignable:false` nodes can hold shared doctrine, and nested
`properties` objects inherit recursively; arrays, scalars, and `null` replace inherited
values. The compiler also accepts old top-level qualities such as `head`, so existing
religion mods remain valid. New definitions should use `properties`, directional
`relationToParent`, and a stable `head.officeId` where applicable. Runtime faiths use the
same definition shape in saved state and remain covered by the existing active-mod
fingerprint because their parent and inherited sources must resolve against the same mod
set. See [religions.md](religions.md) and `docs/MODDING.md`.
Legacy `titles.christian|muslim|pagan|jewish` and `_f` overrides are mirrored into
the corresponding root's `rankTitles`, so title-only mods keep their former live effect.

Livelihood and instruction definitions are moddable data too. Top-level `careers`,
`schooling`, `enterprises`, `auctionLotTypes`, and `householdStandards` tables
merge into `FBDATA` by id before a new campaign begins. Their `name` and `desc` fields, plus
career rank, license, and specialty names and household-standard level
names/descriptions, use the same
structured-data localization path as other core definitions;
new mod-authored display text falls back to its English source.
Learned career definitions may declare a literacy threshold, one license examination,
and a table of permanent specialty examinations. Career and specialty technology
requirements are validated and participate in reverse technology discovery.
The three recognized auction lot families replace by id with `{weight,requiresTech?}`.
Their requirements control new lot selection and appear in the same reverse technology
discovery; an already opened saved lot keeps its frozen eligibility through resolution.

Political-bloc archetype definitions replace atomically by id under the
top-level `politicalBlocs` key. Core behavior currently consumes the `crown`,
`mercantile`, `magnate`, and `independent` ids; a replacement supplies the
complete localized name/description, icon, order, affiliation threshold, and
redress/scutage posture. Runtime state keeps generated magnate/independent
bloc ids and allegiances, not a frozen copy of the definition. The active mod
fingerprint therefore remains the compatibility boundary for saves whose
forecast is affected by a replacement.

Election, privilege, and collective-demand definitions replace atomically by id under
the top-level `elections`, `privileges`, and `collectiveDemands` keys. Elections define
office, term, eligibility, constituencies, rivals, and tactics; privileges describe legal
parties and point to one existing effect ledger; demands name a privilege, constituency,
rank range, cooldown, and an engine-registered gate. Saved campaigns and contracts retain
only stable ids and semantic facts, so the active mod fingerprint is their compatibility
boundary. See `docs/MODDING.md` for the complete schemas.

The Catholic Papacy is a top-level atomic definition. A mod with `papacy` replaces
`FBDATA.papacy` as one complete value before a campaign begins; nested arrays and tables
are not deep-merged. This keeps election eras, thresholds, ids, and saved Papal state
coherent. A replacement must therefore retain the full schema described in
`docs/MODDING.md`; ordinary religion-head metadata still controls the territorial Roman
office.

Trait definitions remain replaced or added by id under the top-level `traits` key.
`class` selects Disposition, Formation, Reputation, or Condition grouping; omission
preserves compatibility by placing the trait under Other. Omission of `noRandom` also
preserves ordinary random-generation eligibility. Root skill, health, fertility, and
Standing (`opinion`) fields retain their old meaning, while numeric objects such as `assembly`, `travel`,
`war`, `estate`, and `household` are read only by their owning systems through
`FB.traitBonus`. Acquisition guidance in `earned` is display text; `earn.threshold`
is mechanical progress state.

Fortification tuning is exposed under the top-level `forts` key. Scalar campaign,
maintenance, migration, and AI-work values replace individually, while `forts.levels`
merges by numeric tier so a focused override does not discard the other three tiers.
Each supplied tier is a complete record: sequential construction, technology validation,
localized tier names, siege snapshots, and saved `walls` records all read the resulting
shared table. The active mod fingerprint remains the save compatibility boundary for
those changed rules.

Technology domain, tradition, and technology definitions merge by id under the top-level
`techDomains`, `techTraditions`, and `tech` keys before validation. Domain display order
comes from its numeric `order`, and domain/tradition names use the structured-data
localization path so mod-authored labels fall back to their English source. `techCaps`
merges scalar members and merges members of `costFloor`, `units`, and `aiUnits` one level
deeper; this permits a focused cap override without erasing unrelated built-in caps. The graph
engine also merges optional developer-facing entries under
`techImpactReviews.features`. These entries participate in validation and document a mod's
hard, soft, or no-gate decision, but they do not create runtime eligibility by themselves.
The graph engine normalizes legacy `branch` to `domain`, scalar `req` to an array, and `yearMin` to
an inferred soft attestation/adoption window; legacy `cultures` and `notCultures`
restrictions remain valid. New definitions should author `domain`, `cost`, `req`,
optional `reqAny`, full `history`, localized `name`/`desc`, `unlocks`, and `fx`.
Bookmark realms may add `techTraditions` and `techSeed` overrides. Cycles, unknown
prerequisites/domains/traditions/unlocks, malformed historical ranges, invalid domain or
tradition definitions, and invalid cap values reject the bookmark.
Mod technologies may add capped fractional `fx.seaMovement`; `fx.seaTransport` must be a
finite positive integer and competes by maximum value rather than summing. These effects
automatically appear in Technology details and require no ship, port, or fleet objects.

Household-standard definitions replace atomically by id. Their ordered `levels` arrays are
never deep-merged: a replacement supplies its complete rank gates, setup/upkeep values,
display fields, and effects. This keeps saved numeric levels stable and makes definition
order a deterministic tie-break for work-outfit lapses.

Currency presentation is a top-level atomic mod value. `M.apply` lets each
`mod.currency` replace `FBDATA.currency`; after every enabled bundled and pasted mod
has applied, `FB.configureCurrency` validates and caches the final definition. The
last supplied definition wins, denomination arrays are never deep-merged, and one
invalid field falls back to the complete built-in definition without blocking the
rest of that mod. The Mods dialog reports that fallback.

The resource remains internal game gold: no saved value, cost, contract, or balance
number is converted. `balance.coinageSymbol` remains a deprecated compatibility
alias that changes only the default topbar icon when no full `currency` object was
supplied. A full currency definition always takes precedence. Display strings are
escaped at the DOM boundary, and active mod text remains covered by the existing
save fingerprint.

Item definitions remain backwards compatible. A mod item without equipment metadata is
treated as a unique, one-handed object with generic deterministic art; its definition id
is its stable reference in old and new saves. Mods may opt into repeatable generated gear
with `unique:false`, add `slot`, `grip`, `ageMin`, `qualityFx`, and procedural `art`
ranges, but should use the exact-instance APIs in `js/items.js` rather than mutating
`player.items` or `c.items`. Mod effects may grant a definition through `giveItem`; the
subsystem creates an instance automatically when that definition is repeatable.

Small configuration registries now share the same pre-world mod boundary. `itemPools`
merges complete ordered item-id arrays by pool id; `intrigue` merges bounded scalar
tuning and method profiles by profile id; `raidingTraditions` replaces any supplied
culture, exact-faith, or root-faith-group list; and `rulerTraits` atomically replaces the
ordered generated-ruler pool. Their validators resolve same-mod `items`, `plots`,
`cultures`, `religions`, and `traits` additions before anything mutates. These tables add
no saved fields: exact item instances, ruler traits, schemes, and raid state retain their
existing shapes and active mods remain protected by the save fingerprint.

New-campaign content uses the same boundary. `startScenarios` and `familyPresets`
merge complete definitions by stable id before the player opens the beginning picker.
Scenario `startEffects` are deliberately bounded to constructor-owned state: birthplace
plots, holding ids, career rank/experience, scalar flags, war service, exact items or
named item pools, skill adjustments, and one known focus. The engine still owns seeded
selection, item instancing/equipment, character and kin wiring, and save construction.
The seven baseline scenario ids retain their original tiers, all three baseline family
ids remain, and `standard` retains its age-zero, unmarried, no-extra-draw meaning.
Cross-references resolve against same-mod careers, holdings, items, and pools before any
mutation. Missing or malformed definitions reject the mod before world activation.

Religious progression uses the same pre-world boundary. `religiousPaths` merges complete
path definitions by stable id, while effective religion
`properties.religiousPaths` route one lay path and exact career ids to vocation paths.
Validation resolves same-mod faith, career, path, and route references and protects each
baseline rank's numeric index before mutation. Rank names use stable structured-data keys;
the engine retains advancement, costs, appointments, compatibility side effects, and
seasonal application. Saved `character.religiousRanks` maps remain numeric and unknown
path ids stay inert, so the existing mod fingerprint and save format remain sufficient.

Royal Council definitions use two validated pre-world keys. `councilSeats` merges complete
seat records by stable id and protects all five baseline ids; `councilRules` atomically
replaces the schemer-trait list. Same-mod trait references resolve before mutation. Added
seats receive generic activation, vacancy, direct-vassal appointment, Standing,
effectiveness, and bonus behavior, while the baseline special consumers continue to use
their stable office ids. Saved holders remain keyed by id and an absent mod seat stays
inert without deleting its value, so no save migration is required.

Focus and deed metadata lives under `FBDATA.focuses` and `FBDATA.deeds`. Phase 4B exposes
both as partial-override arrays for baseline ids only. Mods may replace presentation,
ordering, deed grouping, fixed cooldowns, technology requirements, and bounded static
eligibility. Private handlers, flow capabilities, execution timing, modal ownership, and
tutorial behavior remain non-overridable. Static eligibility composes after the handler's
invariant guard, so it may narrow availability but never manufacture missing execution
context. Validation builds both complete effective catalogues against same-mod technology,
career, trait, faith, and culture tables before mutation; successful application then
replaces definitions, projections, and id indexes together. The stable action ids remain
the save-format-3 focus and cooldown identities. This authoring boundary changes no
baseline gameplay eligibility, so it requires no technology-impact ledger entry.

County market definitions are three atomic top-level values: `marketGoods`,
`marketEndowmentTypes`, and `marketEndowments`. Supplying one replaces that complete
table; it is validated together with the two effective companion tables before any of
the three mutates. Unknown basket, endowment, duchy, or county ids and malformed bonus
maps reject the mod, leaving both definitions and save state unchanged. This atomic rule
prevents a partial replacement from changing saved vector meaning. Saved
`state.market.goods` remaps valid complete replacements by stable id. Tangible
definitions may opt into local prices with a `marketBasket` weight map; omission
preserves multiplier 1. The full schemas and typed guild-monopoly compatibility fields
are documented in `docs/MODDING.md` and their engine semantics in
[markets.md](markets.md).

Related: `docs/MODDING.md` is the full mod authoring reference.

Religious-head overlays may add or replace `head.greatHolyWar`. Activation validates
the localized campaign name, minimum date, chances, crisis kingdoms, and every sacred
kingdom/county reference against the selected atomic bookmark. A religion without
both a live centralized head and this metadata has no caller; therefore decentralized
core faiths remain unable to call unless a mod deliberately supplies both pieces.
The runtime freezes ids and numeric campaign state only, and the active mod
fingerprint continues to protect saves that reference mod-added targets.

Temporary modifier definitions merge under the top-level `modifiers` key. A later mod
replaces the complete same-id record rather than deep-merging `scope`, duration, upkeep,
or `fx`; runtime state stores only the stable id and optional expiry. `name` and `desc`
remain localized structured display fields. See [modifiers.md](modifiers.md).

## Top-level `FBDATA` ownership audit

`js/mods.js` keeps one explicit allowlist and rejects any other top-level JSON-mod key
before applying the mod. The audit of every table authored or installed under `FBDATA`
is:

| Classification | Top-level keys | Contract |
| --- | --- | --- |
| Public runtime-mod API | `ailments`, `auctionLotTypes`, `balance`, `bookmarks`, `bounds`, `buildings`, `careers`, `collectiveDemands`, `councilRules`, `councilSeats`, `crossingClasses`, `cultures`, `cultureTraditions`, `currency`, `deeds`, `defaultBookmark`, `duchies`, `elections`, `empires`, `enterprises`, `events`, `familyPresets`, `feudalServiceCharters`, `finance`, `focuses`, `forts`, `holdings`, `householdStandards`, `intrigue`, `itemPools`, `items`, `kingdoms`, `land`, `localCouncilMotions`, `marketEndowments`, `marketEndowmentTypes`, `marketGoods`, `modifiers`, `papacy`, `plots`, `policies`, `politicalBlocs`, `positions`, `privileges`, `provinces`, `raidingTraditions`, `realms`, `religions`, `religiousPaths`, `rivers`, `rulerTraits`, `schooling`, `scripted`, `seas`, `settlementNames`, `settlementSites`, `startScenarios`, `straits`, `tech`, `techCaps`, `techDomains`, `techImpactReviews`, `techTraditions`, `titles`, `traits`, `travelPurposes`, `travelSites`, `unitClasses` | Accepted by `M.apply` with the merge/atomic behavior documented here and in `docs/MODDING.md`. `settlementSites` is partly generated in core but remains a public shared site table. |
| Generated-only | `lang`, `musicCatalog` | Produced by the localization and soundtrack catalog pipelines. Runtime mods may author ordinary English display fields, but may not replace core locale caches or the shipped media manifest. |
| Intentionally internal | `fortLevels`, `unitClassAliases` | `fortLevels` is the live compatibility alias of `forts.levels`; mods use `forts`. Unit aliases normalize legacy saved or authored class ids; mods use canonical `unitClasses`. |

The barber hair, beard-kind, beard-cut, family, and composed-style catalogues remain
inside `js/items.js` for this milestone. Their ids are accepted saved appearance values
and must also be understood by `js/portrait.js`; exposing only the picker lists would
pretend unsupported renderer ids were generic data. Cosmetic modding therefore remains
an independent feature requiring a shared renderer/schema decision, not an unvalidated
milestone-zero registry.
