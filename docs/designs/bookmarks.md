Bookmark platform and authoring

Purpose

A bookmark is an atomic political opening on a reusable physical geography. It declares a date, era, sovereign realms, county communities, title hierarchy, crossings, optional institutions and opening people, world stories and available starts. Shared simulation code resolves these declarations through registries. Content authors do not add date selectors to the engine.

The shipped dates are 476, 493, 711, 800, 867, 1066 and 1204. Registration and acceptance are separate: a registered definition with hidden:true is unavailable for every new-campaign route while inspection and matching saves remain accessible. Changing hidden to false is an owner acceptance decision. Candidate source tables are organizational conveniences; only FBDATA.bookmarks is the runtime registry.

Ownership and lifetime

FBDATA.bookmarks holds authored definitions. FB.bookmark(id) reads one, FB.bookmarks(true) includes hidden definitions, and FB.bookmarks() lists dates available for new campaigns. FB.bookmarkAvailable is the shared visibility boundary used by the picker, quick starts, start-code parser, direct creation and observer creation. A hidden bookmark never becomes available because a start is unlocked. Existing legacy-mod restrictions remain additional availability conditions.

FB.activateBookmark prepares a detached definition: it normalizes rank-scoped title ids, fills seeds and terrain from the geography, resolves dated place names and copies the selected settlement layout. It validates before installing any world tables, switching the active era, composing balance or starting raster generation. A requirement failure returns named diagnostics and leaves the active world, state and RNG intact. Successful activation caches its raster by bookmark and geography. Runtime mod installation normally reloads the page, so changed world data receives a fresh raster cache.

A new campaign stamps its bookmark, creation date, era, geography and default government. FB.campaignEra uses this stamp rather than changing era when the live year crosses an era boundary. Saves retain semantic ids and facts, not rendered display text or copied registry definitions. Restoration activates the matching bookmark, then adopts validated saved facts; it does not recreate authored relatives, incumbent bishops, appointments, grants or story rewards.

Requirement gate

FB.validateBookmark combines the existing geography, era, government-strategy, technology, faith, culture, legal-tradition, wardrobe, lexicon, item-presentation, system, balance, opening and world-reference validators with FB.bookmarkRequirementFaults. Validation includes hidden definitions. Hiding incomplete content prevents new campaigns; it does not exempt malformed data from the authoring gate.

Dates use whole years, calendar seasons 0 through 3 and days 1 through 90. The year must fit the resolved era, its optional technology window and the authored technology catalogue coverage. Unknown eras, geographies, forms, behavior strategies, world stories, player tracks, offered starts and optional systems fail by name. Every attached story dependency must be in that campaign's attached world/track set.

World references resolve against the prepared bookmark, not whichever map is currently active. County owners and capitals must be valid; title parents, sites, layouts, straits, scripted targets, community identities and local institution seats must resolve. Geography name maps refer to their physical base's counties and sites. Geography knowledge basins and routes use base counties, and optional knowledge.starts hooks name registered starts, campaign provinces and known basins.

Realm, ruler, court, opening-actor, community, institution and offered-start identities contribute to the culture/faith requirement set. An inherited or period culture profile must exist; male and female name pools must resolve, as must a family pool for a plain dynasty naming pattern. Architecture follows culture, era, then the registered manuscript default. Currency follows geography, era, then the global definition. Faith law may inherit the existing default tradition. Government law may delegate to faith or name its own validated tradition and jurisdiction mappings. Careers, buildings and unit classes require registered behavior roles. Wardrobe rules may name only registered garment and headwear shapes.

Parentless regional cultures in the wider 476 opening declare their own tone, fair and red appearance values alongside their independent name pools and mechanical defaults. These palettes are portrait presentation defaults, not ancestry claims. The portrait renderer's era fallback does not satisfy the bookmark requirement gate.

Reusable data-defined stories expose their original declaration to validation without adding it to saved records. Their typed province, realm, culture, faith, government and kingdom references must resolve. The future realm created by a partition or foundation is not required to exist at creation; dependent stories can refer to that declared polity only through their attached prerequisite chain. Native story modules may provide declarative requirements and a pure appliesToBookmark hook. Validation never invokes init, day, appliesTo(state), choices or any story mutation hook.

Requirements declarations

An optional requirements object is supported on bookmarks, starts, registered stories, reusable story declarations, system definitions and effective faith properties or head metadata. Allowed keys are eras, geographies, governments, provinces, sites, realms, starts, stories, systems, capabilities and titles. Except titles, values are lists of unique, nonempty ids. titles is a list of typed objects with kind (duchy, kingdom or empire) and id. Unknown keys fail rather than becoming silently ignored requirements.

A faith with head:null has no head requirements to validate. Its own requirements still apply, and an explicitly declared requirements:null remains malformed on either the faith or an existing head. Headless Buddhist and Hindu communities in 711 therefore pass the same gate used for activation and runtime mods.

eras and geographies list acceptable alternatives; the resolved campaign must match one. governments requires at least one named form to be present among the opening realms. Other lists name required records. stories requires attachment, systems requires enabled availability in the declaration's scope, and capabilities requires an invention granting that capability within the era's supported technology window. Earlier inherited inventions qualify; later hard prerequisites and unavailable alternative-prerequisite chains do not. Module requirements are authoring dependencies, not a substitute for the existing player technology gate or ordinary eligibility checks.

The requirement check and visibility rules are internal authoring, compatibility and presentation boundaries. They introduce no independently researchable gameplay capability and need no additional technology-impact ledger entry. Existing capability gates and technology-impact decisions remain with their owning systems.

Starts and fresh institutions

An optional bookmark starts list narrows its scenario catalogue. Omission retains all scenarios whose bookmarkIds and eras restrictions match. Listed starts must be registered and compatible. An ordinary fixed start's culture/faith pair must occur in the starting county. An existing-ruler start instead matches its named realm's ruler, government and rank, retaining its court identity even among residents of another culture. Bookmark replacements recheck these references even when the mod does not edit startScenarios. Both start-code and direct creation use the same offered-scenario predicate.

localInstitutions replaces the complete global catalogue for that bookmark when supplied, including an empty object. Stable institution ids, seat province/site, culture, faith, kind and church office id are validated together. An on-map seat must occur in an inhabited county's resolved settlement layout. An off-map episcopal office has both provinceId:null and site:null. A see may seed its faith's existing character-held episcopal head office, including a head inherited by that faith; realm-held heads, unrelated faith offices and duplicate local office seeds are rejected. representative is a bounded fresh-campaign profile; vacant:true forbids an incumbent name or representative. Saved living/dead representatives, vacancies, rights and transactions remain authoritative on restore.

Runtime mods

FB.mods.validate and FB.mods.apply compose detached effective catalogues, then run the same bookmark gate before any accepted mod data is installed. Same-mod eras, inherited cultures, faiths, forms, wardrobes, layouts, geography and starts can satisfy one another. A rejected mod leaves live FBDATA, campaign state and RNG untouched. The store path reports the diagnostic before writing browser storage or reloading. Era and content edits also recheck existing registered bookmarks, so a replacement cannot silently break another date.

Bookmarks replace atomically by id. Bookmark arrays reject missing, invalid or duplicate ids before composition. Era, wardrobe and layout tables merge complete records by id. Effective buildings and unit classes require explicit registered roles; existing unit replacements that omit a role retain their prior role, and decorative buildings can declare unassigned. Legacy top-level world patches retain their existing default-world compatibility semantics and the legacy 1066 restriction. JSON mods cannot register executable stories, government strategies, garment shapes or engine modules. They can reuse already registered behavior. Package-specific mod restrictions remain in force; CrazyGames does not accept custom mods.

Authoring sequence

Start from docs/bookmark-template.js, which is deliberately absent from index.html. Choose a supported date, era and geography. Declare independent owners, courts, county communities and title groups; use the geography's coordinates and physical site ids rather than borrowing another campaign's saved state. Add new inherited cultures, laws or presentation data only where required. Supply local institution incumbents or vacancies explicitly when they differ from the global opening. Add ordinary starts and reuse registered story modules whose requirements your world satisfies.

Keep display labels in literal structured-data fields, use lexicon terms for changing political vocabulary, and use durable message descriptors for saved news. Names of people, semantic ids, role names and capability ids remain locale-neutral. Do not regenerate integration-owned language catalogues on a feature branch.

A new classic data file must load in index.html before its consumers and story registration. Add it to each distribution's existing allowlist and offline/runtime manifest through the owning packaging workflow. Confirm that standard itch/play and CrazyGames retain their independent asset and behavior rules. docs/ content and test fixtures are authoring artifacts, never runtime script dependencies. Run the owning public-data tests and bookmark acceptance journey through the approved harness; device, iframe, historical and gameplay acceptance remain owner review tasks.

Acceptance and ratchet

tests/e2e/specs/bookmark-requirements.spec.js covers named rejection diagnostics, transactional activation and mod application, and capability-window dependencies. tests/e2e/specs/bookmark-acceptance.spec.js discovers every registered bookmark, explicitly reviews hidden definitions inside isolated tests, plays one year, saves at opening/year one, switches to another world and restores the matching hidden year-one save. It compares restored facts plus RNG/uid, plays one more year with quarterly invariant checks, verifies exact turn/date advancement and saves at year two. The JSON-only proof-mod.json fixture supplies year 500, an independent coastal realm and inherited culture, two starts, a reused campaign and independent episcopal incumbents/vacancies through its separate persisted-mod reload and replay journey.

Save-size ceilings are 4 MiB at opening, 6 MiB at years one and two, and 8 MiB for the separate proof-mod year-three checkpoint, measured as UTF-8 bytes of ordinary uncompressed v4 JSON. Test attachments record actual bytes and the ceiling for each bookmark. These are review budgets, not measured save-size claims or browser-storage guarantees. The test does not regenerate parity snapshots, language catalogues or ratchet baselines.

Bookmark-id lint permits only reviewed legacy defaults, legacy contracts and identity keys, matched to exact engine source lines. Content-id checks require a reason and a maximum count per engine file for every deliberate quoted reference, including schema-token collisions. Unallowlisted residuals must remain zero. Static source authoring records existing ceilings; owner-run browser collection remains the acceptance check. New content belongs in data and reusable registries; a deliberate new implementation hook requires its own reviewed reason and file scope.

Missing bookmark definitions return the named authoring diagnostic before opening-declaration hooks inspect their provinces. Bookmark validation uses detached technology normalization, and a rejected activation leaves the catalogue unchanged. The bookmark-id comparison lint distinguishes typeof checks from id comparisons while retaining the quoted-id ratchet and reviewed legacy-save defaults.

The 800 opening retains Byzantine possession of Palermo, Messina and Syracuse with Greek Orthodox principal communities. It does not import the later Aghlabid conquest into the coronation world. Chronology reference: https://edinburghuniversitypress.com/pub/media/ebooks/9781399536837.pdf

The fresh 476 opening uses wider_v1, which adds the Sasanian aristocratic court households to balkans_v1. balkans_v1 stays in the catalogue and core_v1 remains the legacy revision for unversioned openings. data/aristocratic_courts.js clones the current 476 opening and revises the Sasanian realm declaration, leaving the regional sources and other dated bookmarks intact. Opening validation requires the declared compact royal court, adult local households, owned family scopes and any declared governor actor. Restore uses the saved revision and saved form; it never calls aristocratic seeding to repair an earlier life. See docs/designs/aristocratic-monarchy.md.
Revision catalogue compatibility

A revision may use opening as a string naming an entry in its effective openingRevisions catalogue. Resolution installs that retained declaration and sets openingRevision to the same id. Existing object-valued openings remain supported. This gives data authors whole-field replacement without an engine patch language. Unknown opening aliases fail before activation.

Released baseline hashes are checked independently of the current fresh revision. Era government defaults stay frozen, and revised courts declare their forms per realm. Retained saves continue selecting their own revision and form records. Fresh faith assignment rejects legacy profiles; retained revisions still validate against them. No government retrofit or world regeneration is performed on restore.

Expanded spring 1066

data/bookmark_1066_inhabited.js loads after the shared geography and 476 declarations and before government_rollout.js. It adds inhabited_v2 on europe_regional_2, with complete date-owned province, realm, layout, climate and opening fields. The composer retains original-geography governments_v2 and selects inhabited_v2_governments_v2 for fresh campaigns. baseline, governments_v2 and inhabited_v2 remain independently resolvable. Older unstamped campaigns still select baseline.

Eleven additions have explicitly dated occupation, communities and authority. Eighteen additions and all original scenery remain scenery. The original ordinary counties and layout entries are unchanged. Five generated delegates and one demanded outside claim use the existing opening schema; there is no new saved-state owner. Public evidence, approximations and every scenery decision are in docs/research/1066-inhabited-terrain.md. 1204 retains its independent declaration and layout.
