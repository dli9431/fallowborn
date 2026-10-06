Stories and start scenarios

Institution restore hook

Optional restore(state, record) runs after the saved world and political ledgers are adopted and repaired, before generic institution repair. It binds missing institutions to existing story actors without restarting init, repeating choices or paying commitments. Detached migrate and validate remain separate from this world-dependent boundary.

A story is a registered module with one lifecycle and one shared presentation. A start scenario carries its own rules as data. Engine code calls only the story registry and reads scenario fields; it never names a story or a start.

Story kinds

A world story belongs to a bookmark and runs whether or not the player takes part, for example a court that moves, a claimant who returns or a historical campaign. A bookmark lists its world stories in its stories array. A player track is the protagonist's part in a story, such as the choices of a federate soldier. A start scenario lists its tracks in its tracks array. A track may require a world story; it attaches only when that story is attached.

Registration

js/stories.js owns FB.stories. Each story module calls FB.stories.register once at load time with an id (a lowercase slug), a kind (world or track), an optional requires list and its hooks. A required story must be registered first, so registration order is also the attachment and dispatch order. The registry is sealed when boot finishes; a later registration throws. Duplicate ids, unknown kinds, a missing init hook and non-function hooks are rejected.

Hooks

Bookmark authoring may declare requirements on a registered module or reusable story declaration and a pure appliesToBookmark(definition) hook on a native module. FB.validateBookmark checks attachment dependencies, typed content references and applicability before world generation. registerData retains the original declaration on the registry module for this check; it is never saved. Authoring does not invoke init, appliesTo(state), choices or other mutation hooks. See docs/designs/bookmarks.md for requirement keys.

init(state) creates the story's record at campaign creation and returns it, or returns nothing to stay detached. appliesTo(state) can veto attachment. day, season and year receive the state and the story's own record. title, intro, status, choices, quote, blocker, review and apply drive the shared story sheet. Period vocabulary is not a story hook: it lives in the lexicon (data/lexicons.js, see i18n.md). validate checks a saved record before a save is adopted. migrate moves a legacy save field into state.stories on the detached copy before validation.

Lifecycle

At creation the registry attaches the bookmark's world stories in registration order, then the scenario's tracks. An observer has no scenario, so only world stories attach. The day ticker calls every attached story's day hook after the army phase, in registration order; the season hook runs after the authority season, and the year hook after the annual world and authority work. A campaign with no attached story has no state.stories field, so 867 and 1066 campaigns and their saves are unchanged.

Declarative opening actors initialize before world-story attachment. Remaining declared appointments submit after the attachment call, when a story has created any deferred host scope. An appointment already submitted by a story is retained by its saved declaration id. This shared boundary lets a bookmark without western_court_476 declare offices through ordinary authority transactions. Restore never invokes opening initialization or repeats an appointment.

Saved state

Each attached story keeps one record at state.stories[id]. Records hold semantic ids, statuses and turn stamps, never rendered text. Save validation first checks every id, record shape and required story dependency before invoking a story's validate hook. Missing dependencies name both ids, and malformed legacy situation476 records fail even if state.stories is absent. Valid legacy records migrate through the owning hook; conflicts remain rejected. See state-and-saves.md.

The final v4 contract is frozen. New saved story fields or changed meanings require reopening that contract and its migration coverage. The federate track validates its enumerated phases, roles, outcomes, proposals and claimant choices, optional semantic references, boolean payment/award facts, payment periods, outcome turns and veteran settlement references. Optional fields absent from supported prototypes stay absent; validation never invents a bargain, choice or payment.

Shared presentation

Story-sheet dismissal resolves the current Deeds card after modal navigation completes, because a live refresh may replace the original node. The scroll position belongs to sidebody, and Deeds refresh retains focus by data-story-card as well as its ordinary action keys. An intervening modal or event keeps its own focus.

Every attached story whose status hook answers shows one card in Deeds with its title and current stage. The card opens the shared story sheet: the intro, the stage name, status lines and every current choice with its effect and conditions. Each choice opens a reviewed modal that shows its detail, the first blocker when it is unavailable, and any review lines the story adds, such as a grant's revenue. Confirmation rechecks the stamped quote; a changed decision shows Terms changed instead of applying. Back and Escape return to the choice list; Close and the outcome acknowledgment return to the Deeds card with its scroll position and focus. See ui.md.

Start scenarios

data/starts.js declares each scenario's rules. bookmarkIds and eras limit where it is offered; eras match the bookmark's declared or resolved era. alwaysUnlocked skips the starting-rank progression lock. familyPresets maps the family shapes it allows, in picker order, to optional authored name, diff and desc labels; the first is the default. A scenario without the map keeps every shape. tracks names the player tracks to attach. intro, intro_f, intro_muslim and intro_other hold the opening text. The start picker, start codes and the family picker all apply the same rules, so a start code for a scenario or family shape its bookmark does not offer is rejected.

The 476 stories

The 476 bookmark attaches eight world stories in order: western_court_476 owns the cast, opening hosts, court displacement and the courts' service bargain; zeno_return_476 owns the eastern return; clovis_syagrius_476, theoderic_italy_476, eastern_africa_476 and eastern_italy_476 are campaign instances; western_office_476 observes the western mandate and its successive outcomes; rugian_frontier_476 is the Italian regional campaign instance. The Federate Soldier scenario then attaches federate_track_476, which owns the household's delegate, commission, contract, civic, church, claimant, escort and contest choices. Bargains belong to the parties that made them. The story modules share FB.story476 helpers; engine dispatch uses only the registry. An observer has no player track and the courts negotiate independently. See situation-476.md.

The Curialis scenario attaches js/story_curialis_track_476.js after the western court story. Its opening keeps the civic household separate from the soldiers' political track. Mandate acceptance reviews registration and the current ladder recognition cost, rechecks living local actors and creates a scoped judicial appointment before using the shared standing transaction. Declining leaves the occupation and household intact. Both outcomes complete the opening and let the world court's independent bargaining proceed. The serialized track records phase, semantic result, office ID and outcome turn; validation does not replay the choice.

Technology impact: none. The registry and scenario fields change no gameplay eligibility.

Authored migration consumer

An active commissioned campaign checks the issuer's living court, current ruler and saved ruler generation before continuing negotiation, even when no replacement service contract is affordable. Issuer death, extinction or succession interrupts the opportunity and its migration once, preserving the surviving host and independent ordinary wars. A completed settlement remains durable.

The theoderic_italy_476 campaign definition names the existing theoderic_italy migration in FBDATA.federateMigrations. The shared campaign type obtains a living commission, starts one moving polity with the original host and offers its contract template through government AI. It retains the host's actual troops and position. General movement, payments, claims and territorial settlement belong to js/federates.js. An interruption closes the migration commitment without extinguishing a surviving polity or erasing an ordinary war. A legacy declared Gothic war continues without creating a new migration or commission.

Reusable story types

FB.stories.registerType registers a trusted factory before boot sealing, and FB.stories.registerData passes a data definition to that factory and registers the returned world story. The campaign factory in js/story_campaign.js has no historical-person, bookmark or campaign-id dispatch. data/story_campaigns.js supplies four shared 476 instances and composes the regional instance declared in data/bookmark_476_italy.js. Later bookmarks may register their own definitions through a classic script and attach their ids in stories. JSON runtime mods cannot register executable factories.

Campaigns have a date window, actor and target, explicit conditions, optional commission and migration, bounded duration, optional civic settlement and durable outcome messages. Pending opportunities wait for inheritance and peaceful courts; death, extinction and incompatible control resolve them. A started campaign records the exact ruler generation and commitment ids. Its result follows actual ownership or a completed migration claims session. Authority loss interrupts a political opportunity while the underlying ordinary war remains independent. Timeout bounds an unfinished opportunity. Resolved campaign records never reopen, pay again or award territory on restore.

World-story cards use the existing shared story sheet. Future pending campaign cards are omitted until their first year; active and resolved records remain readable. Political observers have no gameplay choices; pending campaigns involving a player-controlled party offer the reviewed decisions described below. Household choices retain their existing reviewed flow and scroll/focus return.


The eastern_africa_476 instance is authored in data/bookmark_476_africa.js and composed into storyCampaigns by data/story_campaigns.js. Its identity and durable message keys remain stable for saves and localization. It retains the ordinary campaign type, the 533-550 window, an eastern Constantinople condition and Carthage's current sovereign as target. A changed coastal dynasty, including a Moorish owner, does not force the target back to the Vandals. Regional authoring adds no campaign capability or technology gate.

Regional campaign ownership

The Clovis-Syagrius campaign record is authored in data/bookmark_476_gaul_iberia.js and referenced from the first entry in FBDATA.storyCampaigns. Its id, registration order, attached story, named living actors, date window, objective and durable message keys remain stable. Existing opening ownership already includes Euric's gains in Auvergne, Provence and Iberia; this content pass adds no unsupported future Visigothic conquest date. The shared campaign engine still waits for inheritance, declares an ordinary war and observes its outcome. No regional lifecycle code or new engine selector is introduced, and conditional campaigns retain their existing technology decision of none.

Existing-ruler openings

Opening standing hosts materialize every registered unit-class count before they enter the army list. Fresh hosts and restored hosts therefore use the same composition shape without changing troop totals or consuming RNG. When a separately restored western claimant loses Ravenna or its mandate, the western-office record retains that claimant's displacement; the original court's automatic restoration does not replace this recorded claimant outcome.

A scenario may declare rulerRealmId, governmentForm, characterName and onboarding: ruler together with a fixed bookmark, county, sex and community. Its standard family choice means the existing court household, not a newly generated commoner family. js/starts.js adopts that court once after the world stories initialize and before the selected player tracks initialize. The same living character becomes the player; typed realm references, ownership, direct holdings, authority, contracts and hosts move to the ordinary player key. FB.startRealmId resolves an authored source realm in subsequent story hooks. FB.startRealmDefinition copies and resolves campaign definitions without mutating FBDATA.

hidden: true excludes an unaccepted scenario from the picker, start codes and direct creation. Visibility is a content acceptance decision. Previously saved review campaigns remain loadable while their definition is hidden. Ruler names, sex, community and existing household are fixed. Ordinary family presets and the seven baseline starts keep their existing creation order.

Nepos attaches nepos_track_476 for recognition and a possible restoration through ordinary war. Odoacer uses reviewed choices on western_court_476 rather than a second household track. Syagrius uses ordinary ruler play and the campaign factory's reviewed opportunity when Clovis can actually challenge him. A pending campaign involving the player as actor, target controller or commission issuer waits for a stamped decision before its declaration or commission. Declining closes only that authored opportunity; independent diplomacy and ordinary war continue. The same shared story review preserves focus and scroll.

Odoacer's civic-government review requires a current Ravenna council agreement for courts, protection and tolerance, ratified through ordinary City dealings with episcopal mediation. Community goodwill and recognition of a delegate do not replace that agreement. Death or succession closes his unfinished opening or civic decision once, with rulerInterruptionTurn recording the durable interrupted outcome. The world story continues observing any existing campaign; ordinary wars and contracts are not erased or accepted for the successor. Completed service, declined involvement and government decisions remain recorded.

Technology impact: existing_ruler_starts and western_claim_restoration use none. Existing political institutions, living actors and actual military possession constrain these baseline openings and recovery paths. There is no discovery prerequisite for taking control of an authored court or maintaining a living claim.

Spring 711 review campaigns

data/story_campaigns_711.js declares four ordinary campaign instances for the selectable 711 bookmark: a southern Iberian crossing, Toledo, Narbonne and Aquitaine. They register through the existing data batch before story sealing but attach only when a bookmark lists them. Possession prerequisites resolve divergence when their window opens; busy courts can wait within that window. Dates grant no territory, hosts, ruler deaths or community conversions. Each campaign opportunity has a separate technology-impact decision of none. The same file declares the separate conditional Asturian foundation; see bookmark-711.md for registration and timing approximations.

Reusable conditional polity foundations

js/story_polity_foundation.js registers the polity_foundation type and the definitions in FBDATA.storyFoundations before boot sealing. The factory names no bookmark, person or historical realm. Its data declares a date window, a captured-seat collapse predicate, remnant and revolt owners, a local faith-share threshold, a new court and outcome messages. A pending story waits for actual collapse and community continuity within its window. A peaceful remnant can found its local court through FB.foundPolity; conquered territory requires a victorious ordinary county revolt. Player ownership and player holder chains are protected, including ordinary existing-ruler identity mapping.

The optional foundRevolt(state, record, group, counties) story hook runs only at the existing armed-revolt independence boundary after real occupation and surviving hosts. The first attached story accepting a won connected component supplies its court; otherwise the ordinary generated independent realm remains the outcome. A definition never starts or strengthens an uprising, manufactures troops or awards an unconquered component. Detached stories do nothing and consume no RNG. The generic founding transaction keeps former territorial, treasury, technology, dynasty and community rules. Other surviving former-sovereign counties are unchanged.

Foundation records hold pending, rebelling or resolved phase, semantic result and reason, commitment and outcome turns, rebellion and former-owner ids, and the founded realm, founder and actual county ids. An observed revolt may finish beyond the opening window within its frozen duration. Defeat, changed prerequisites and timeout close only the historical foundation opportunity. Terminal results never recreate courts, reissue a ruler or change a later ordinary revolt outcome. A missing record in an older save of a bookmark listing the story gains only pending facts through detached migration, without effects during restore. Presentation is a passive card using the existing shared story sheet, quiet before the first year.

Technology impact: conditional_polity_foundation uses none. Political collapse, surviving local communities and ordinary military independence supply credible constraints; baseline recovery and independence need no invented research prerequisite.

800 review campaigns

The loaded data/bookmark_800_history.js adds four definitions to the existing storyCampaigns table before the shared registration pass. The 800 review candidate attaches Barcelona, Danish coast, Anatolian frontier and Adriatic campaign instances; other bookmarks attach none of them. Capital and target-owner conditions, date windows, living court generations, peace and ordinary war outcomes control their lifecycle. Barcelona and the Adriatic rivalry act through the Carolingian sovereign because Aquitaine and Italy are subordinate holders, while war ownership is sovereign. There are no date-forced territorial awards.

Technology impact: period_800_conditional_campaigns uses none. This extends existing regional campaign content without a new political or military capability; ordinary army and equipment gates remain. The campaign factory remains specific to wars. The attached carolingian_settlements_800 world story separately owns inheritance plans, sibling pressure and court agreements through the shared dynasty, treasury, war and authority APIs. Its read-only Deeds card uses the existing story sheet. See carolingian-800.md and docs/research/800-bookmark.md for the conditions and abstractions.

1204 campaign instances

The 1204 bookmark attaches fifteen stories declared in data/bookmark_1204_campaigns.js: eleven ordinary campaigns, three negotiated partitions and one dated holy-war call. The classic data script composes this literal table into storyCampaigns before the registration loop. js/story_history.js registers reusable partition and holy_war factories before that loop; shared engine dispatch names neither bookmark nor story. Campaigns retain their existing war eligibility and possession rules. Closed outcomes remain closed through restore.

partition declares actor, opening capital, firstDate/lastDate, a named landless beneficiary and an exact grant with realm id, capital, rank, proper place, counties and liege. An optional parentStoryId must also appear in requires and have result granted. Each beneficiary is an ordinary seeded character created once on new-game attachment. Actual sovereign ownership and direct grantor holdings, civic consent power, peace, living parties, captivity and higher liege rank are checked again at settlement. AI parties consent only to eligible current terms; a controlled court uses the existing reviewed story sheet. Approvals bind exact party identities, ruler generations and holdings and are discarded if those terms change. The transaction creates a generated realm through makeVassalRealm and installs the existing person through assignRealmRulerCharacter. Sovereign owners, communities, development, physical sites and private property stay intact. The three 1204 instances create Boniface's kingdom and the Athenian and Achaean subordinate lordships only after possession and consent. This factory grants an NPC recipient; player holdings use the ordinary player grant and promotion systems.

holy_war declares a religion, target kingdom and firstDate/lastDate. Optional historySeed rows record earlier ids, dates, targets and attacker victory, defender victory, partial or diverted outcomes. New attachment seeds only dates before the campaign opening into bounded greatHolyWarHistory, with negative opening-relative turns and prior-call/launch flags. Restore performs no initialization. A dated call uses callGreatHolyWar with the current religious head and every existing authority, target, cooldown and coalition gate. A controlled head can call or decline in the shared story sheet. The story saves the created campaign id and caller identities, waits for that campaign and consumes its recorded real result once. No historical expedition route, forced death, conversion, host or victory is synthesized. Ordinary preparation still applies. The Mongol arrival remains deferred pending a shared steppe form and arrival rail.

Technology impact: negotiated_historical_partition and dated_holy_war_calls use none. Possession and current political or religious consent are their constraints; ordinary conquest, unpartitioned rule and religious decisions remain available without research. Existing troop and equipment technology gates remain authoritative.

Bilateral tribute and civilian evacuation

js/story_agreements.js registers tribute_cession and civilian_migration factories before the data stories attach. Campaign data registration resolves declared dependencies before registering a dependent story. Both types use the shared card, quote, review, apply, day and save validation lifecycle; UI reads remain detached from mutations. Opening households are initialized by bookmark_setup before story init, with host-scoped appointments deferred until the owning initializer creates its hosts.

tribute_cession records both living courts and ruler generations at opening. The inclusive date window and optional firstTurn open negotiation. Both current courts must consent, the recipient must afford the first installment, and every ceded and retained county must remain directly held by the source. Player consent is explicit; NPC courts may consent through the same live quote. Payment occurs once before ordinary county transfers. Active agreements pay one installment when intervalDays elapses, retain the declared foothold and interrupt on succession, changed possession or war. Unpaid agreements end as breached. Previously ceded land stays with its current possessor. A stale review cannot approve or decline.

civilian_migration waits for its date window, declared story result, current control of both ends and peace. A player court authorizes explicitly. Authorization freezes a ceiling from the eligible live culture-faith cohort; one batch per 90-day period uses the existing conserved population transaction. Court or route changes interrupt; war pauses; an exhausted source closes the route without inventing residents. Completion requires every planned cohort to arrive. The engine creates no host, territorial award or forced historical victory. Restore resumes stamps and counters without repeating cohorts or payments and does not attach missing new agreements to old saves.

Technology impact tribute_cession_agreements and civilian_evacuation is none. Current consent, treasury, territorial control and conserved civilian eligibility provide the constraints. Ordinary warfare and community movement remain independent capabilities.

The Bithynian campaign declares the Thessalonican partition as a registration dependency so its daily dispatch follows the partition review. This gives a peaceful court the chance to settle newly won Thessalonica before opening another foreign campaign. It is ordering, not a requirement for a granted outcome; ordinary conquest remains available if the partition is declined. Named partition beneficiaries may declare a proper dyn string for their ordinary family identity.

Declared campaign settlement and regional cast references

A campaign may declare settlementForm for a landless actor and a fixed-territory government form. This is mutually exclusive with migrationId, whose existing migration transaction already owns settlement. When ordinary war has won and the actor actually owns the objective, the shared campaign factory clears nonTerritorial, sets that objective as capital and adopts the declared government. It never creates a host or transfers a county. settlementApplied stamps the outcome once; an optional subsequent civic settlement still requires its existing living mediation and consent. Technology impact campaign_territorial_settlement is none because conquest and present political eligibility constrain baseline settlement.

The 476 eastern declaration owns thracian_pressure_476, amal_epirus_476 and the existing theoderic_italy_476 definition. Catalogues compose these instances before shared registration. Their windows and ordinary war outcomes preserve alternatives: a successful Balkan Amal settlement closes the later landless Italian opportunity, while failure leaves its original living-host conditions intact. Declared opening references to realm rulers and initialized story fields reuse the same people for regional offices; restore retains the saved ids and does not create missing stories or cast members.
