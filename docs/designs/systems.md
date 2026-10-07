Optional systems

colonate defaults to disabled and is enabled by late_antique. It registers the events, actions and economy module boundaries for Roman land-bound households. FB.tenureEnabled permits either registered tenure system to dispatch the shared scheduler; saved archetypes still check their own membership, so a disabled manorial record cannot become active merely because colonate is enabled. Roman events and the estate review Deed require colonate, while medieval events and their review continue to require manorial_tenure. Scenario availability checks its declarative system requirements before picker, code and direct creation. No system availability is stamped into saves.

Local institutions

church_councils and ruler_conversion also default to disabled and are enabled by late_antique. js/religion.js guards their direct mutations and annual AI hook and requires episcopal_sees in the acting court's context. Disabled saved decisions remain dormant; reads and restore allocate no new decision ledger. The 476 bookmark explicitly disables abbeys alongside its other medieval institutions. Medieval bookmarks keep their prior availability sets.

civic_institutions and episcopal_sees default to disabled and are enabled by late_antique. They guard site councils, senates, bishoprics and patriarchates, their Deeds sections, active head offices and owning transactions. Disabled records remain dormant. The 867 and 1066 systems layers are unchanged and allocate no local institutional state.

data/systems.js owns the stable optional-institution ids. A definition records id, desc, defaultEnabled and the engine modules responsible for its behavior. The medieval defaults are enabled except papacy, which requires an enabling faith; civic_institutions and episcopal_sees require an enabling campaign layer. Availability is a content rule, separate from an institution's ordinary eligibility and technology requirements.

Resolution

FB.systemEnabled(state, systemId, context) resolves the registry default, campaign era, scoped government form, scoped faith and bookmark, in that order. Each layer can explicitly enable or disable a known id, or inherit the earlier answer by omitting it. Boolean maps and enable/disable lists are equivalent. Faith lists normalize before property inheritance. Unknown ids and malformed layers fail authoring validation.

Context can identify a realm, faith or character. A character supplies their faith and their own realm, liege or residence holder for the government rule. Without context the protagonist supplies the scope. Explicit faith:null omits that layer. A campaign uses its stamped era, so passing a date boundary never changes institutional membership. An explicit bookmark override is final and can be answered without evaluating lower layers. The compatibility FB.faithHasSystem query uses this same resolver for the named faith; greatHolyWars bookmark booleans remain a final great_holy_wars override below explicit systems declarations.

FB.systemAvailable is the world-hook query. It checks the unscoped rule, static and generated faiths and living realms for potential availability. A non-Catholic protagonist therefore does not stop the medieval world's papal elections. Personal content and scoped mutations still use FB.systemEnabled. Both queries are read-only and consume no RNG or ids; their answers are never saved.

Character residence reads saved abbey holders and residents directly through FB.abbeyResidenceHouse. Physical residence remains recorded when abbeys are disabled. This read never asks whether abbeys are available, so government scoping cannot recurse through institution eligibility.

Content and lifecycle

FB.systemContentEnabled checks every requirement in a definition's systems list, or its single system field. Disabled Deeds and focuses, events and options, policies, privileges, elections, paths, traits and political blocs are absent from their live projections. Validation covers nested event requirements and action definitions before application. Event filtering happens before context binding and random selection. Shared action and option mutations recheck requirements so a stale UI or saved choice cannot invoke disabled content.

FB.systems.enabledForBookmark resolves the same layer precedence from declared era, form, faith and bookmark data before a state exists. Module requirements can name capabilities that must have an earlier or in-window technology grant with reachable prerequisites. The bookmark gate checks requirement metadata on enabled modules and rejects unknown system membership in careers, buildings, units, items, enterprises, starts and event packs as well as the existing action/event catalogues. These checks are authoring dependencies and do not replace player technology or ordinary eligibility gates.

The scheduler skips disabled daily, seasonal and annual hooks. Initialization and restore likewise skip Papacy, abbey, games and holy-war repair when unavailable. Their saved records do not require a new schema. Disabled tenure and contracts expose inert reads; ordinary hereditary land transfers remain available. A disabled saved holy war cannot block the daily pass, settle its grants or earn service. Saved traits stay recorded but contribute no effects. Disabling scutage removes its entitlement while allowing other enabled assembly business.

The registered boundaries are customary household tenure, feudal service charters, scutage, the crown political bloc, papal institutions, excommunication and absolution, abbey houses, tournaments and scheduled games, great holy wars, guild leadership elections, the Royal Council and the Estates. Each owning module guards direct calls in addition to scheduler gates; optional content uses declarative requirements rather than era-id comparisons.

Authored campaigns

867 and 1066 explicitly retain the eleven nonpapal systems. Papacy remains enabled by Catholic faith properties, preserving its existing faith boundary. Medieval nonpapal religious-head sanctions retain excommunication. The 476 bookmark disables papacy, scutage, manorial_tenure, excommunication, feudal_service, crown_bloc, tournaments and great_holy_wars. Government forms and the late antique era carry their defaults beneath that final campaign layer.

Technology and verification

optional_system_availability has a none technology-impact review. Membership is an authored political and religious condition; enabled content keeps its existing technology gates. tests/e2e/specs/systems-availability.spec.js exercises precedence, pure reads, validation, campaign membership, hidden content, dormant records, scheduler boundaries and restore. The declarative 476 baseline is tests/e2e/fixtures/systems-476.json. The full seeded world parity snapshots use the unchanged owner-controlled capture workflow in docs/TESTS.md.

Papal world-hook availability permits dispatch but does not enable every office. Each papal_election office checks its own faith and holder-realm context before work. Existing saved office models remain untouched while disabled, and explicit disabled office callbacks are rejected.

Data-owned dependent tenure

A system may declare tenure metadata; enabled declarations permit the shared dependent-household scheduler. estatePossessor marks registered estate tenancy and declares blockedCareerRoles, reviewDeedId and releaseRoutes. Each release route names a target careerId and careerRank or an eventId resolved through the existing registry. providesOrdination marks a system that enables local bishop consent. Engine readers select these properties rather than named system, career, event or deed ids. Trusted system validation rejects unknown references and duplicate routes. These internal selectors preserve existing eligibility and saved record shapes.
