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
An optional `religiousHeads` map binds centralized faith offices to realm ids inside
that atomic bookmark. Activation rejects unknown faiths, faiths without head metadata,
and mapped realms absent from the bookmark; omission uses each religion's global
`head.realm` fallback.

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

**Bundled mods** (`mods/*.js`) register
`{id, name, desc, data}` into `window.FBMODS` via a script tag after the data files; the
Mods dialog toggles them, and enabled ids persist in localStorage (`fb_mods_bundled`) and
apply ahead of pasted mods.

Localization catalogs describe the core English data, but are never allowed to mutate it.
The source hash is calculated after mods are applied. Effective event sources are indexed
before locale validation so newly added mod text always has an English fallback. A mod's
authored name, description, and prose remain English unless they exactly match a known
catalog source; translation packs for third-party mods are outside the core v1 contract.

Livelihood and instruction definitions are moddable data too. Top-level `careers`,
`schooling`, `enterprises`, and `householdStandards` tables
merge into `FBDATA` by id before a new campaign begins. Their `name` and `desc` fields, plus
career rank names and household-standard level names/descriptions, use the same
structured-data localization path as other core definitions;
new mod-authored display text falls back to its English source.

Political-bloc archetype definitions replace atomically by id under the
top-level `politicalBlocs` key. Core behavior currently consumes the `crown`,
`mercantile`, `magnate`, and `independent` ids; a replacement supplies the
complete localized name/description, icon, order, affiliation threshold, and
redress/scutage posture. Runtime state keeps generated magnate/independent
bloc ids and allegiances, not a frozen copy of the definition. The active mod
fingerprint therefore remains the compatibility boundary for saves whose
forecast is affected by a replacement.

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

Technology domain, tradition, and technology definitions merge by id under the top-level
`techDomains`, `techTraditions`, and `tech` keys before validation. Domain display order
comes from its numeric `order`, and domain/tradition names use the structured-data
localization path so mod-authored labels fall back to their English source. `techCaps`
merges scalar members and merges members of `costFloor`, `units`, and `aiUnits` one level
deeper; this permits a focused cap override without erasing unrelated built-in caps. The graph
engine normalizes legacy `branch` to `domain`, scalar `req` to an array, and `yearMin` to
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
