Stories and start scenarios

Institution restore hook

Optional restore(state, record) runs after the saved world and political ledgers are adopted and repaired, before generic institution repair. It binds missing institutions to existing story actors without restarting init, repeating choices or paying commitments. Detached migrate and validate remain separate from this world-dependent boundary.

A story is a registered module with one lifecycle and one shared presentation. A start scenario carries its own rules as data. Engine code calls only the story registry and reads scenario fields; it never names a story or a start.

Story kinds

A world story belongs to a bookmark and runs whether or not the player takes part, for example a court that moves, a claimant who returns or a historical campaign. A bookmark lists its world stories in its stories array. A player track is the protagonist's part in a story, such as the choices of a federate soldier. A start scenario lists its tracks in its tracks array. A track may require a world story; it attaches only when that story is attached.

Registration

js/stories.js owns FB.stories. Each story module calls FB.stories.register once at load time with an id (a lowercase slug), a kind (world or track), an optional requires list and its hooks. A required story must be registered first, so registration order is also the attachment and dispatch order. The registry is sealed when boot finishes; a later registration throws. Duplicate ids, unknown kinds, a missing init hook and non-function hooks are rejected.

Hooks

init(state) creates the story's record at campaign creation and returns it, or returns nothing to stay detached. appliesTo(state) can veto attachment. day, season and year receive the state and the story's own record. title, intro, status, choices, quote, blocker, review and apply drive the shared story sheet. Period vocabulary is not a story hook: it lives in the lexicon (data/lexicons.js, see i18n.md). validate checks a saved record before a save is adopted. migrate moves a legacy save field into state.stories on the detached copy before validation.

Lifecycle

At creation the registry attaches the bookmark's world stories in registration order, then the scenario's tracks. An observer has no scenario, so only world stories attach. The day ticker calls every attached story's day hook after the army phase, in registration order; the season hook runs after the authority season, and the year hook after the annual world and authority work. A campaign with no attached story has no state.stories field, so 867 and 1066 campaigns and their saves are unchanged.

Saved state

Each attached story keeps one record at state.stories[id]. Records hold semantic ids, statuses and turn stamps, never rendered text. Save validation rejects an unknown story id, a malformed record (through the story's validate hook) and a save that holds both state.stories and the legacy state.situation476. See state-and-saves.md.

Shared presentation

Every attached story whose status hook answers shows one card in Deeds with its title and current stage. The card opens the shared story sheet: the intro, the stage name, status lines and every current choice with its effect and conditions. Each choice opens a reviewed modal that shows its detail, the first blocker when it is unavailable, and any review lines the story adds, such as a grant's revenue. Confirmation rechecks the stamped quote; a changed decision shows Terms changed instead of applying. Back and Escape return to the choice list; Close and the outcome acknowledgment return to the Deeds card with its scroll position and focus. See ui.md.

Start scenarios

data/starts.js declares each scenario's rules. bookmarkIds and eras limit where it is offered; eras match the bookmark's declared or resolved era. alwaysUnlocked skips the starting-rank progression lock. familyPresets maps the family shapes it allows, in picker order, to optional authored name, diff and desc labels; the first is the default. A scenario without the map keeps every shape. tracks names the player tracks to attach. intro, intro_f, intro_muslim and intro_other hold the opening text. The start picker, start codes and the family picker all apply the same rules, so a start code for a scenario or family shape its bookmark does not offer is rejected.

The 476 stories

The 476 bookmark attaches seven world stories in order: western_court_476 owns the cast, opening hosts, court displacement and the courts' service bargain; zeno_return_476 owns the eastern return; clovis_syagrius_476, theoderic_italy_476, eastern_africa_476 and eastern_italy_476 are campaign instances; western_office_476 observes the western mandate and its successive outcomes. The Federate Soldier scenario then attaches federate_track_476, which owns the household's delegate, commission, contract, civic, church, claimant, escort and contest choices. Bargains belong to the parties that made them. The story modules share FB.story476 helpers; engine dispatch uses only the registry. An observer has no player track and the courts negotiate independently. See situation-476.md.

The Curialis scenario attaches js/story_curialis_track_476.js after the western court story. Its opening keeps the civic household separate from the soldiers' political track. Mandate acceptance reviews registration and the current ladder recognition cost, rechecks living local actors and creates a scoped judicial appointment before using the shared standing transaction. Declining leaves the occupation and household intact. Both outcomes complete the opening and let the world court's independent bargaining proceed. The serialized track records phase, semantic result, office ID and outcome turn; validation does not replay the choice.

Technology impact: none. The registry and scenario fields change no gameplay eligibility.

Authored migration consumer

The theoderic_italy_476 campaign definition names the existing theoderic_italy migration in FBDATA.federateMigrations. The shared campaign type obtains a living commission, starts one moving polity with the original host and offers its contract template through government AI. It retains the host's actual troops and position. General movement, payments, claims and territorial settlement belong to js/federates.js. An interruption closes the migration commitment without extinguishing a surviving polity or erasing an ordinary war. A legacy declared Gothic war continues without creating a new migration or commission.

Reusable story types

FB.stories.registerType registers a trusted factory before boot sealing, and FB.stories.registerData passes a data definition to that factory and registers the returned world story. The campaign factory in js/story_campaign.js has no historical-person, bookmark or campaign-id dispatch. data/story_campaigns.js supplies the four 476 instances. Later bookmarks may register their own definitions through a classic script and attach their ids in stories. JSON runtime mods cannot register executable factories.

Campaigns have a date window, actor and target, explicit conditions, optional commission and migration, bounded duration, optional civic settlement and durable outcome messages. Pending opportunities wait for inheritance and peaceful courts; death, extinction and incompatible control resolve them. A started campaign records the exact ruler generation and commitment ids. Its result follows actual ownership or a completed migration claims session. Authority loss interrupts a political opportunity while the underlying ordinary war remains independent. Timeout bounds an unfinished opportunity. Resolved campaign records never reopen, pay again or award territory on restore.

World-story cards use the existing shared story sheet. Future pending campaign cards are omitted until their first year; active and resolved records remain readable. Political and campaign status cards have no gameplay choices. Household choices retain their existing reviewed flow and scroll/focus return.


Regional campaign ownership

The Clovis-Syagrius campaign record is authored in data/bookmark_476_gaul_iberia.js and referenced from the first entry in FBDATA.storyCampaigns. Its id, registration order, attached story, named living actors, date window, objective and durable message keys remain stable. Existing opening ownership already includes Euric's gains in Auvergne, Provence and Iberia; this content pass adds no unsupported future Visigothic conquest date. The shared campaign engine still waits for inheritance, declares an ordinary war and observes its outcome. No regional lifecycle code or new engine selector is introduced, and conditional campaigns retain their existing technology decision of none.
