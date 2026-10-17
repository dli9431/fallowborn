Data authoring contract

A JSON mod defines content by stable id and composes registered mechanics. A trusted engine module implements algorithms, pure definition validators and canonical transactions. JSON cannot provide executable code, arbitrary function calls, expressions, unrestricted state paths or direct saved-state writes.

Authoring checklist

Identify the owning catalogue and its actual gameplay, AI, UI and restore consumers. A public key alone is not proof that a newly added id has behavior. Use the complete per-system schema in docs/MODDING.md and retain its merge or replacement semantics.

Name stable ids, supported fields, reference scopes, bounded values, defaults, permitted policies, localization fields and saved identities. Resolve references against the candidate effective catalogues, including same-file additions. Reject unknown operations and incompatible combinations before storing or installing a mod.

Keep candidate compilation detached from active registries. Type factories and validators may construct products and read declared references; they must not consume RNG, allocate identities, initialize people, charge costs, register messages or mutate a campaign. Publication follows complete validation. Rebuild indexes from matching declarations on reload.

Use the existing canonical owner for people, offices, property, population, treasuries, movement and contracts. Previews are pure. Apply rechecks current authority, scope, consent, resources and reviewed terms, then commits once. AI uses these same checks. UI presents the actual declared costs, conditions and outcomes through shared components.

Use structured-data localization for display fields and stable message descriptors for saved news. Imported text retains its effective English fallback. Instance publication registers story news before locale finalization. Do not save rendered prose or compiled strategies.

Preserve released definition meanings, saved content ids and type-owned records. Exact active-mod fingerprints cover imported content, including changed graphs or policies under the same mod name. Matching restore resumes facts without initializing missing stories or replaying rewards. New authoring fields alone do not require a saved-schema increment.

Supply two independently authored configurations with meaningful behavioral differences, including an ordinary JSON import through Mods. Cover malformed input without mutation, changed-content rejection, stale reviews, repeated apply, matching restore and deterministic replay. Register focused test runtime dependencies. Test execution and performance/device acceptance are owner-controlled under AGENTS.md.

Keep per-tick work bounded. Resolve declaration graphs at import or activation; iterate only active records and bounded selectors during simulation. Retain existing performance and save-size budgets and use owner-run measurements when accepting a larger workload.

Implemented extension surfaces

The household_track story type supports bounded household graphs, explicit location/identity/date/source conditions, semantic incident references and canonical conversion, sites-mode journey and later settlement adapters. It shares the ordinary story sheet and detached JSON compilation path. The household-graphs.json fixture supplies independent costless and conditional graphs plus a dated journey. Immediate family evacuation, finite work contracts and world-incident delivery are separate capabilities; the type does not implement them by accepting arbitrary effects.

The household-work.json fixture supplies independent artisan and farmer graphs through an ordinary JSON import. They expose the reviewed private-expense and vocational-focus adapters, actual paid-focus completion edges, and protagonist versus household continuity. Civic-right predicates read the existing effective public right. These extensions retain the same semantic record shape and never manufacture wages or imported executable behavior.

Runtime storyInstances uses registered world-story and political-track types. eventChances uses bounded arithmetic or registered chance policies. authorityOffices and legitimacySources expose the existing scoped authority transactions. Government forms compose registered strategies and their effective profiles. Religious institutions, activities and affiliations retain their owning canonical schemas. Existing declarative deeds and focuses retain their bounded resource, choice, training and fallback adapters. Other public keys keep the individual extension limits stated in docs/MODDING.md; metadata editing does not imply an executable extension interface.

Examples and distribution

The standalone harbor-mod.json and dune-mod.json files in tests/e2e/fixtures/authoring are normal JSON imports. They require no script tag, custom factory or test-only registration. They remain development authoring assets outside runtime and shipping allowlists. The ordinary editions support custom imports. CrazyGames keeps its existing restriction against custom mods and its silent English-only distribution behavior.

Lifecycle and tournament authoring

eventSubscriptions and tournamentRules are public behaviour catalogues. The former binds existing or same-import events to typed simulation moments. The latter supplies tournament resolution, participation, capability, prize routing, team support and AI/default selection alongside the existing tournament content tables. The harbor-contracts.json and dune-contracts.json subsystem fixtures add different subscriptions, contest rules, tactics, programmes and scales. Definitions are validated against their effective counterpart tables before application. Detailed fields and limits are in docs/MODDING.md.

traitMechanics is also a public behaviour root. Its supported channels include tournamentPower and tournamentElitePenalty (0-100) in addition to the documented family, religious, intrigue, justice and ruler preference channels. The strongest value on the character applies for each tournament channel; the elite penalty applies only to an elite track.

Additional supported roots are abbeys, householdServiceRoles, enterpriseMechanics, specializationMarketEffects, householdStandardDemand, councilSeatRoles, religiousOfficeRanks and quickStarts. The two subsystem fixtures exercise their effects through normal imports. Reusable office and action kinds remain bounded engine contracts; ids do not select historical consumers.

Travel, estates and AI

The public travelRules, travelDefaults, parliamentAgendas and agencyRules contracts expose the existing journey, assembly and bounded AI algorithms. The two subsystem fixtures include different prices, arrival rewards, assembly conditions, family policy and research preferences. Their tests import the files through the ordinary Mods dialog and retain saved ids and exact mod fingerprints. New gameplay algorithms still require reviewed engine code; data cannot register callbacks or arbitrary writes.


The JSON surface also includes tenure catalogues, freedom bargaining/bands, regional foundations, federate contract templates and annual rank prestige. Their candidate validators use effective references without publishing messages or invalidating live tenure/freedom caches. Publication owns those changes; saved commitments retain their existing semantic identities and exact mod checks.

Stateful work and social deeds expose bounded actionPolicies alongside shared focusRoutines/deedRoutines. Council, privilege and collective-demand schemas validate references and supported operations. Religious and court recognition consumers resolve declared mandate roles while preserving saved source identities.

Independent world examples

The playable harbor-mod.json and dune-mod.json use different small geographies, identities, rulers and story graphs. Their journeys are authored in authoring-world-journeys.spec.js and advance through reviewed transactions and normal daily dispatch. The exhaustive parallel subsystem fixtures are separately named harbor-contracts.json and dune-contracts.json. Sharing a large baseline world for a focused subsystem test is not evidence of independent fictional-world authoring.

positionRules, policyGovernance, marketRaidYields and authoringDefaults close the retained position, faith-law, raid-endowment and identity-fallback branches. Local council motion effects were already declarative and now receive bounded validation. Additional trait channels cover holy-war preferences, conversion resistance, court loyalty and rivalry. civic_candidacy composes the existing office nomination owner into a bounded household story branch. See docs/MODDING.md for exact schemas and local opt-in boot/import measurement instructions.
