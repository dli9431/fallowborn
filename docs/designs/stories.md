Stories and start scenarios

A story is a registered module with one lifecycle and one shared presentation. A start scenario carries its own rules as data. Engine code calls only the story registry and reads scenario fields; it never names a story or a start.

Story kinds

A world story belongs to a bookmark and runs whether or not the player takes part, for example a court that moves, a claimant who returns or a historical campaign. A bookmark lists its world stories in its stories array. A player track is the protagonist's part in a story, such as the choices of a federate soldier. A start scenario lists its tracks in its tracks array. A track may require a world story; it attaches only when that story is attached.

Registration

js/stories.js owns FB.stories. Each story module calls FB.stories.register once at load time with an id (a lowercase slug), a kind (world or track), an optional requires list and its hooks. A required story must be registered first, so registration order is also the attachment and dispatch order. The registry is sealed when boot finishes; a later registration throws. Duplicate ids, unknown kinds, a missing init hook and non-function hooks are rejected.

Hooks

init(state) creates the story's record at campaign creation and returns it, or returns nothing to stay detached. appliesTo(state) can veto attachment. day, season and year receive the state and the story's own record. title, intro, status, choices, quote, blocker, review and apply drive the shared story sheet. text supplies display-only relabels for data text while the story is attached. validate checks a saved record before a save is adopted. migrate moves a legacy save field into state.stories on the detached copy before validation.

Lifecycle

At creation the registry attaches the bookmark's world stories in registration order, then the scenario's tracks. An observer has no scenario, so only world stories attach. The day ticker calls every attached story's day hook after the army phase, in registration order; the season hook runs after the authority season, and the year hook after the annual world and authority work. A campaign with no attached story has no state.stories field, so 867 and 1066 campaigns and their saves are unchanged.

Saved state

Each attached story keeps one record at state.stories[id]. Records hold semantic ids, statuses and turn stamps, never rendered text. Save validation rejects an unknown story id, a malformed record (through the story's validate hook) and a save that holds both state.stories and the legacy state.situation476. See state-and-saves.md.

Shared presentation

Every attached story whose status hook answers shows one card in Deeds with its title and current stage. The card opens the shared story sheet: the intro, the stage name, status lines and every current choice with its effect and conditions. Each choice opens a reviewed modal that shows its detail, the first blocker when it is unavailable, and any review lines the story adds, such as a grant's revenue. Confirmation rechecks the stamped quote; a changed decision shows Terms changed instead of applying. Back and Escape return to the choice list; Close and the outcome acknowledgment return to the Deeds card with its scroll position and focus. See ui.md.

Start scenarios

data/starts.js declares each scenario's rules. bookmarkIds and eras limit where it is offered; eras match the bookmark's declared or resolved era. alwaysUnlocked skips the starting-rank progression lock. familyPresets maps the family shapes it allows, in picker order, to optional authored name, diff and desc labels; the first is the default. A scenario without the map keeps every shape. tracks names the player tracks to attach. intro, intro_f, intro_muslim and intro_other hold the opening text. The start picker, start codes and the family picker all apply the same rules, so a start code for a scenario or family shape its bookmark does not offer is rejected.

The 476 stories

The 476 bookmark lists the western court world story (js/story_western_court_476.js). It authors the court's actors and standing hosts, moves displaced courts, runs Zeno's conditional return, lets the courts settle the federate dispute when the household declines, and runs the conditional historical campaigns. The Federate Soldier scenario attaches the federate track (js/story_federate_track_476.js): the delegate, commission, contract, civic, church, claimant, court and contest choices. Each bargain record belongs to whoever made it, the track or the courts. The two modules share helpers through FB.story476, which engine code does not use. See situation-476.md.

Technology impact: none. The registry and scenario fields change no gameplay eligibility.
