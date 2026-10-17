Revision-scoped fixed starts

The Constantinople household start carries constantinople_household_track_1204 from data/story_households_1204.js on every offered 1204 revision. Its reconstruction begins after the sack without a second opening loss. Supplies are a small private expense; local, Latin and effective Venetian-quarter customer contexts use actual ordinary craft income. Informational religious choices neither require an optional congregation nor change the household’s faith. The personal Nicaean journey requires current Nicaean possession and ordinary routes and funds, with family settlement remaining a separate later transaction. Death interrupts this protagonist’s unfinished plan. World campaigns, courts, households and baseline geography retain their existing declarations.

Technology impact for constantinople_foothold_journey is none. The dated civilian journey uses ordinary route costs, free status and later residence and work gates. Its arrival event grants no payment, enlistment, office or household move. Exact historical workshop rights, wages, parish buildings and alternative Epirote or Trebizond routes remain outside this declaration.

Mod validation checks a fixed resident-community start against every revision that offers it, using the same offering rules as fixed existing-ruler starts. It does not require an expanded-only start to fit an older fresh selection that does not offer it. Start identity, settled location and required community still validate in each offering revision.

Bookmark platform and authoring

Purpose

A bookmark is an atomic political opening on a reusable physical geography. It declares a date, era, sovereign realms, county communities, title hierarchy, crossings, optional institutions and opening people, world stories and available starts. Shared simulation code resolves these declarations through registries. Content authors do not add date selectors to the engine.

The shipped dates are 476, 493, 711, 800, 867, 1066 and 1204. Registration and acceptance are separate: a registered definition with hidden:true is unavailable for every new-campaign route while inspection and matching saves remain accessible. Changing hidden to false is an owner acceptance decision. Candidate source tables are organizational conveniences; only FBDATA.bookmarks is the runtime registry.

Ownership and lifetime

FBDATA.bookmarks holds authored definitions. FB.bookmark(id) reads one, FB.bookmarks(true) includes hidden definitions, and FB.bookmarks() lists dates available for new campaigns. FB.bookmarkAvailable is the shared visibility boundary used by the picker, quick starts, start-code parser, direct creation and observer creation. A hidden bookmark never becomes available because a start is unlocked. Existing legacy-mod restrictions remain additional availability conditions.

FB.activateBookmark prepares a detached definition: it normalizes rank-scoped title ids, fills seeds and terrain from the geography, resolves dated place names and copies the selected settlement layout. It validates before installing any world tables, switching the active era, composing balance or starting raster generation. A requirement failure returns named diagnostics and leaves the active world, state and RNG intact. Successful activation caches its raster by bookmark and geography. Runtime mod installation normally reloads the page, so changed world data receives a fresh raster cache.

A new campaign stamps its bookmark, creation date, era, geography and default government. FB.campaignEra uses this stamp rather than changing era when the live year crosses an era boundary. Saves retain semantic ids and facts, not rendered display text or copied registry definitions. Restoration activates the matching bookmark, then adopts validated saved facts; it does not recreate authored relatives, incumbent bishops, appointments, grants or story rewards.

Personal ruler programs

data/story_ruler_agendas.js attaches four dated reviews to each existing Peroz, Odoacer, Syagrius, Muhammad II and Siwa Delegate opening. Both retained and expanded Peroz scenario ids share one agenda. Existing revision/start eligibility and hidden flags remain authoritative; the Nepos restoration track retains its separate identity and behavior. The agendas use the existing courts, conditional campaigns and public institutions. Date windows pace reviews without forcing battles, deaths, border transfers, conversion or a renewed mandate. Unavailable or unsupported political operations retain explicit priority/conclusion alternatives.

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

Spring 867 district revision

data/bookmark_867_expansion.js loads before data/government_rollout.js and authors inhabited_v2 with eight inhabited additions, complete title groups and its own settlement layout on europe_regional_2. The composer makes inhabited_v2_governments_v2 available for explicit review while preserving governments_v2 as the fresh default on europe_regional. The released baseline remains unchanged. Acceptance of the expanded default is a separate owner decision.

The dated research ledger is docs/research/867-districts.md. It accounts for every shared addition and all 21 original scenery anchors, identifies reconstructed local institutions and marks unresolved habitation/government consumers as scenery. Existing ordinary counties and their complete ordered settlement slots are preserved. No new start scenario, story or save field is required. period_867_district_habitation has technology impact none because established households and ordinary local authority do not require discovery; existing travel and equipment requirements still apply. Historical and runtime acceptance of this candidate remain owner work.

Expanded spring 1066

data/bookmark_1066_inhabited.js authors independent inhabited_v2 province, realm, layout, climate and opening declarations before government_rollout.js. The combined inhabited_v2_governments_v2 revision is opt-in. governments_v2 retains the fresh 1066 default and original geography; unstamped old saves still resolve baseline. The habitation composer adds no government form and preserves Seljuk and Makurian constitutions.

Eleven additions have dated occupation, communities and provisional local authority. Eighteen additions and all original scenery remain scenery. Original ordinary counties and layout slots are unchanged. One demanded outside claim uses the existing opening schema; no speculative provincial delegates are initialized. Wagadu kin recognition remains a documented approximation, and Jenne-jeno's assembly assignment is deferred. Public evidence and all scenery dispositions are in docs/research/1066-inhabited-terrain.md. 1204 retains its independent declaration and layout.

Date expansion review boundaries (2026-10-10)

The 493 world_v2 revision assigns all 272 new counties to date-owned geographic title groups and supplies their complete parent catalogues without altering baseline. Holder strategies still decide whether counties belong to a court, public officers or vassals; a duchy is not itself a grant or evidence for a feudal constitution. The expanded 867 title groups follow the same distinction.

1204 omits a start whitelist in both its baseline and inhabited_v2 revisions. Later eligible mod scenarios remain available through the ordinary start-screen and start-code predicates. Fixed birthplace and ruler-reference validation exclude expanded-only starts from worlds that lack those declarations. An explicit author-supplied starts list continues to narrow a bookmark normally.

Islamic court review revisions

data/islamic_profiles.js loads after data/government_rollout.js. It composes an opt-in _islamic_v1 revision for each 800, 867 and 1066 government revision, replacing only the complete realm list. The Rustamid court uses ibadi in 800 and 867, the Tabarestan court uses zaydi in 867, and the Fatimid court uses ismaili_fatimid in 1066. These are bounded court reconstructions. Existing ruler biographies, county religion, community proportions, institutions, governments, geography, starts and all retained revisions remain independently authored. The current fresh revision is not selected by this composer; acceptance and rollout selection remain an owner decision.

Saved campaigns resolve their stamped revision and retain their saved court and community identities. A different fresh selection must not rewrite a reviewed court or retrofit a retained baseline. Seven dated catalogue profiles supply potential character/institution eligibility, but a new catalogue record alone does not add an incumbent, site or population. Local membership, household rules and leadership recognition are described in docs/designs/religions.md. Both distribution paths load the same shipped data script, with their existing separate package and save rules.

Jewish and Samaritan communal review revisions

The existing date-owned expansion scripts additionally author jewish_samaritan_v3 from wider_v2 (476), world_v2 (493), terrain_v2 (711) and inhabited_v2 (800, 867, 1066, 1204). government_rollout.js composes jewish_samaritan_v3_governments_v2 for its four applicable dates. No default selection changes. These remain opt-in worlds under the existing whole-field revision contract.

Each revision preserves the complete source world and replaces only copied community, settlement-layout and local-institution fields when required. Nablus is appended without moving retained slots, and Cairo uses its existing separate settlement. All source realm, ruler and opening-actor identities remain intact. The 867 revision adds only an activity eligibility scope. Historical claims and holds are described in docs/designs/religions.md. Fresh-only institution declarations do not backfill missing saved rows, and a retained campaign continues to resolve its stamped revision.

African local participation review revisions

data/african_religious_rollout.js loads after data/islamic_profiles.js and appends _african_v1 to the existing 476 wider_v2, 493 world_v2, 711 terrain_v2, 800/867/1066 inhabited_v2 and 1204 inhabited_v2 source revisions and their current descendants. Each revision supplies a complete localInstitutions table preserving all prior declarations and adding one leaderless freshOnly lay group. Source geography, layouts, opening actors, populations, courts, governments, starts and fresh selectors remain intact. Existing composed Islamic court revisions retain their court identities when an African review group is added.

The groups locate bounded household participation at existing Garama, Kairouan, Kumbi district and Gao settlement anchors. These simulation bindings establish no historical building, sacred destination, specialist, population proportion or public office. Ghana references possible voluntary learning property but seeds no house or land. Saved source revisions retain their original institution definitions; restoration also preserves missing freshOnly groups rather than creating new records. Historical holds and independent opening decisions are recorded in docs/research/african-religious-rollout.md. Owner acceptance and fresh selection remain separate from declaration composition.


Aachen household opening

data/story_households_800.js attaches aachen_household_track_800 only to aachen_household_800 at Aachen, retaining the ordinary family shapes, Frankish Latin Christian identity and existing free farm. The household hears a relative report of the Roman coronation, may accept a funded three-day delivery in 801, resolve its reserved disputed fee, hear a one-day explanation of imperial instructions in 802 and consider a separately funded voluntary supply day. Refusal, missed windows, changed control, a dead original payer and departure preserve ordinary household play. The opening closes after 802. A calendar creates no levy, tax, office, royal audience or distant campaign participation. Further work and any actual duty remain with ordinary systems. No local displaced-neighbor encounter is added.

Imported story references

The existing mobile_household_476 opening attaches pontic_household_track_476 only at Cherson. data/story_households_pontic_476.js declares farm and paid-work choices, live supply/access reviews and a first-campaign-season conclusion if the civilian camp stays. Only actual court movement opens the departure branch; an ordinary field march does not. Optional personal travel follows the current stationary court through ordinary Paid service and requires actual camp presence before work. Return completion waits for actual arrival home. Membership remains a separate Mobile coalition Deed; the story neither transfers named kin nor changes property, identity, diplomacy or the following's political choices. The following and its exact location are simulation choices, without a dated historical migration or compulsory shortage.

Bookmark and start validation accepts an explicit detached story context from the mod loader. Same-file storyInstances and startScenarios can therefore refer to each other without temporary publication into the active registry. Every affected retained world revision is checked. Fresh campaign creation initializes only declared attachments; loading an older matching campaign never fills absent story records.

The two playable authoring examples own separate three-county geography bases and fictional people and identities. They use ordinary bookmark, local-institution, household-start and story declarations. They contain no copied historical bookmark or central historical office dependency.

Local household responses in the early openings

data/story_household_effects_711_800_1204.js appends observers only to revisions of those three dates that already attach the corresponding source. Twenty-nine sources have 143 milestone and closure declarations, covering their 122 news milestones, the real Asturian rebellion transition and silent family/diplomatic settlement endings. Campaigns, foundations, grants, inheritance plans and execution, funded public gifts, recognition, ordinary pressure wars and the live religious call keep their original owners. Household responses review existing records or return to ordinary life without payments or action days. Local campaigning does not itself prove civilian harm. Historical crusades remain opening history; unsupported relief, commissions, preaching, contributions and accompanied-family movement are not offered. Released 867/1066 worlds and all opening identities retain their declarations.

data/story_household_effects_476_493.js appends one household_observer per existing source to every 476 and 493 revision that already lists that source. The twenty-four sources retain their original campaigns, courts, public payments, populations and recognition records. The declarations cover 128 local beats, with pending restoration and unissued civilian-route notices explicitly silent. Households receive costless reports and reviews of existing records, including the actual route counts and public tribute account. Paid supply, relief transfers, immediate named-family evacuation and new legal duties are outside these notices. No released 867 or 1066 world declaration changes.

Household perspectives

Toledo's ordinary community picker supplies Hispano-Roman Catholic, Gothic Catholic and Jewish households. The shared household track reads the selected protagonist's identity for its opening, keeps ordinary craft income separate from intentions and offers a Jewish-continuity response only for a Jewish protagonist after actual changed rule. Each unnamed family's occupation, station, budget and decisions are simulation choices. The track creates no collective alliance, conversion, special levy or assumed conquest outcome.

Constantinople's artisan start describes residents and newcomers without fixing a Greek identity in the picker. A Frankish Catholic household has a new-arrival branch; Greek and Latin worship choices require the corresponding selected faith. Both can buy a small bundle of private supplies to share or keep their reserves after actual craft work. The ordinary cost is explicit, with no social reward or property grant. These invented families establish no historical household address or claim to a confiscated home.

data/starts_perspectives.js adds constantinople_merchant_household_1204, Harbor Merchant Household, with Italian/Catholic defaults and the ordinary resident-community selector. Its established and standard family shapes begin with a modest private purse, the merchant profession and constantinople_merchant_track_1204 from data/story_households_perspectives.js. Local market work, quarter customers while the public right is effective, optional private supplies and ordinary personal travel form its storyline. The household receives no opening enterprise, ship, citizenship or special tax status. All existing offering revisions retain their own worlds and community tables. No geography, ruler or population declaration changes.

Technology decision: these perspectives author content through existing household identity, work, expense and travel contracts. They add no independently gateable capability; their existing technology reviews and transaction requirements remain authoritative.

Optional goals for existing beginnings

The existing historical rulers and fixed households receive optional opening profiles from data/start_ambitions.js. Thirteen scenario ids share twelve profiles, including one profile for both revision-specific Peroz starts. Federate Soldier and Curialis receive theirs only at Ravenna; other birthplaces retain ordinary open play. Profiles do not change visibility, resident identity, family presets, territory or opening resources. They observe completed ordinary work, actual public receipts, funded host costs, existing source decisions and lawful household conclusions without a second payment or completion reward.

Named contacts retain the opening person's actual identity through succession and death. Royal kin use the seeded family member, displaced claimants use their existing story identity, and outside authorities remain named targets with ordinary access. No invented local official, friendship, guaranteed audience or automatic court allegiance is granted. The tribute/renegotiation aim for Muhammad and private reserve-contribution aim for the Siwa delegate remain visibly held because their necessary transactions are unavailable. A policy priority or a balance change cannot substitute for them. All other goals describe their actual supported completion route; declined council service resolves its decision aim while leaving the mandate aim unfinished.
