# UI: keyboard & mobile

The character interaction card exposes exceptional sibling courtship only on
an actual full- or half-sibling target. Its disabled state explains the first
failed hard gate or trait score. The approach review shows player trait score,
target response chance, permanent refusal, and illicit exposure versus shared
xwēdōdah recognition before spending a day. The proposal review shows the
60%-capped final chance, exact rite or irregular-union costs, absence of dowry,
compact, and alliance, plus child health-risk bands. The Guide's Family
category preserves the complete rule summary and searchable trait list.

**Where the UI code lives.** The former `js/ui.js` is split into four files that load
consecutively in this order and augment one `FB.ui` namespace:

| File | Contents |
| --- | --- |
| `js/ui_misc.js` | Shared name/format/standing helpers, large-list surfaces, interaction cards, mobile back navigation, screens, toasts, hint coachmarks, the generic modal engine, boot wiring. Loads first and owns `FB.ui._shared`, the internal namespace the other three bind at load. |
| `js/ui_panels.js` | The retained panels — Deeds, Self, Kin, Network, Land, Chronicle — plus tabs, drawers, and the family tree. |
| `js/ui_topbar.js` | Top bar refresh: stats and per-season breakdowns, portrait, date, pause/skip controls. |
| `js/ui_modals.js` | The event modal, autoresolve, and every dialog sheet: pickers, coin & credit, household, technology, character sheets, death, menu, settings, save/load, the Guide. |

Cross-file module state (`travelPicker`, `activeTab`, `logRenderedTail`,
`logRenderedLen`, `portraitKey`) lives as properties of `FB.ui._shared`; shared
functions are exported onto that object by their owning file and bound by later
files at load. Keep new cross-file internals on `FB.ui._shared` rather than
inventing a second channel.

The loading screen keeps its title, progress state, and first-visit music choice inside one
explicit dynamic-viewport-height wrapper. It does not use the other pregame screens’
auto-margin pseudo-elements, because mobile device emulation in Opera can drop flex content
when the music choice expands that scroll container. The wrapper remains vertically centered
when it fits and scrolls from a reachable top edge when narrow or translated copy makes it tall.

The Papacy deed opens `fullsheet-modal papacy-modal`: a responsive two-column summary
collapses to one column on narrow/short screens, and the College grid does the same.
Every elector, obedience, election tactic, regnal name, policy, sanction, and governance
action is a native button or labeled checkbox, so normal modal focus, number-key hints,
screen-reader labels, sticky footer behavior, and browser-history navigation apply.
Mandatory Papal name, investiture, sponsorship, and deposition choices pause time and
reopen this sheet until resolved. The Work picker exposes “Petition for the red hat”
with exact unmet requirements. See [papacy.md](papacy.md).

Religious progression keeps Lay standing and the active Vocation visible together. Abbot
and Bishop rows open appointment previews instead of deducting a rank price; the previews
name every unmet gate, appointing authority, current chance, cooldown, and optional
cathedral endowment. An appointed player gains a Bishopric full-sheet from the Self panel.
It shows the see, tenure, authority and investiture policy, Papal recognition and Standing,
episcopal focus, temporalities, office piety, household retinue, non-hereditary succession,
and the four church powers with their costs and cooldowns.

The Work picker presents eligible Craft and Trade **Guild paths** beside existing learned
career examinations. Each induction button derives the configured fee and complete rank,
Guild Standing, skill, and technology requirements from the owning career definition;
unmet rows include current values. The Deeds panel offers **Attend auction…** only when a
town/city market can present one valid bounded lot. At title-owning station its description
keeps the exact Notarial Contracts lock for county-title lots visible without disabling
the rest of the auction. The auction sheet shows the exact current call and round, keeps
unaffordable bids visibly disabled,
and offers a deliberate leave control; countered bids replace the same modal view.
Opening and closing it uses the generic modal's normal activating-control restoration.

**Keyboard support is a requirement** (`js/keys.js` + focus management in `ui_misc.js`): the game
must stay fully playable mouse-free on desktop. New buttons/dialogs need to stay reachable —
modals autofocus their first control, list dialogs get 1–9 / ⇧1–⇧9 `keyhint` badges via
`UI.openModal` (`UI.hintFor`; Shift+digit reaches items 10–18, resolved by physical key
code in keys.js). Pressing Escape on any modal closes it, and pressing a modal's opening hotkey
again (such as `V` for Automation, `M` for Menu, or a custom action shortcut) closes the open modal.
Tab and Shift+Tab wrap between the first and last focusable controls of an open generic
dialog or mandatory event, so keyboard focus cannot move into the obscured game until the
dialog closes. Event option number shortcuts target only the resolving Choice buttons;
their separate Details buttons are ordinary Tab stops and cannot resolve an event.
Dialogs whose first choice must be deliberate focus the dialog container on entry rather
than preselecting a choice; the first Tab still enters the dialog's controls.
Costed election tactics, full default settlement, family ambition and office changes,
unlawful privilege revocation, and exceptional sibling courtship use that neutral entry.
Closing a generic dialog restores its activating control after keyboard or pointer
activation, including browsers that do not focus a button when it is clicked.
An Enter handler that closes a dialog and changes screens must prevent the key's
native default before focus restoration; otherwise that same key can activate the
restored opener and place the old dialog over the new screen.
Desktop Settings also owns persistent semantic action bindings. They map an otherwise
unused letter to `action:<instant id>`, `focus:<focus id>`, or an authored
`focus-family:<family id>` instead of a rendered list position. The default Q binding
opens `livelihoods`; Reset to Defaults restores it. Duplicate keys block saving, removed
action ids remain visible as unavailable saved bindings, and hidden or disabled targets
keep their key while reporting the current reason. `toil` and `work_land` deliberately
share the `farmer-work` focus family, so promotion preserves that binding's meaning.
Modal 1–9/Shift+1–9 navigation still wins while a dialog is open. Desktop Settings places the
shortcut entry in its own Keyboard section. Touch and compact layouts omit that section and
global-key badges.
The desktop Deeds panel has its own two-stage keyboard layer. `1` selects Daily Focus and
`2`–`6` select Work & Wealth, Life & Family, Faith & Community, Rank & Realm, and War &
Diplomacy respectively. Selection opens a closed category, scrolls its heading to the top of
the panel, focuses and highlights it, and assigns `Q W E / A S D / Z X C` to its first nine
rendered focuses or deeds. Pressing the active section's number again collapses it; its next
press reopens it. Daily Focus is the active, expanded section by default when a life opens on
desktop, so its letter badges and shortcuts are present from the panel's first render rather
than appearing after the first click. Touch layouts have no default keyboard section. If a
section extends beyond nine items, subsequent items are
assigned `Shift+Q, Shift+W, Shift+E, Shift+A, Shift+S, Shift+D, Shift+Z, Shift+X, Shift+C`
(items 10–18). Only the active section shows these letter badges. These local
letters take precedence over panel, time, autoresolve, and configurable semantic shortcuts
while that Deeds section is active; modal and event digit handling still takes precedence over
the panel layer. Shift+digit does not extend the Deeds list.
Panel tabs keep their full localized titles on every layout: Self, Kin, Deeds, Land, Network,
and Chronicle. Desktop navigation uses `T`, `G`, `B`, `Y`, `N`, and `U` respectively, shown
as separate trailing key badges beside those titles in the same style as the fast-forward
control's `F` badge. Touch layouts retain the plain titles without badges. These six letters
are reserved from semantic action bindings so panel navigation cannot be intercepted by an
older saved shortcut.
`UI.openModal` also takes `{modalClass}` to tag `#genmodal` with a per-dialog CSS modifier
(cleared on the next open): the Changelog uses `changelog-modal`, and the Menu, Automation,
and end-game dialogs use `fullsheet-modal` for their own mobile layouts (see below).
`modalClass` may contain multiple whitespace-separated classes; open and history-restore
paths apply and clear each token individually. A dialog
that dismisses, cancels, goes back, finishes, or begins from a terminal control puts that
control in a `.gm-footer`. `UI.openModal` normalizes legacy loose Close/Done/Cancel/Back
buttons into that footer while leaving substantive choices in the scrolling body. Footer
controls are centered, 200 px wide, and at least 52 px high on every layout; multiple
controls wrap as equal-sized rows rather than changing width.

The Family Tree uses its own near-viewport sheet instead of the generic narrow dialog, so
wide generations have the available desktop map area. Names and relationships remain
legible on the face of every portrait. Fine-pointer users can drag any non-interactive tree
background to pan its viewport, and hovering or keyboard-focusing a portrait opens the
standard character summary in the shared side tooltip. Opening a character from the tree
creates a modal-history entry: **Back** restores the same tree view, including branch,
focus and internal scroll state, while **Close** dismisses the complete stack.

The primary canvas roots itself at the nearest recorded common ancestor of the house founder
and current player, then follows every recorded descendant generation without an arbitrary
depth cutoff. This keeps a collateral succession connected by its real bloodline rather than
falsely drawing the founder as the heir's parent. A genuinely disconnected founder from an
old or modified save shares that canvas with the current recorded lineage instead of creating
a separate founder scroll area. Direct ancestors beyond grandparents remain identified as
Great-grandfather or Great-grandmother, then 2× great-grandparent and onward. The same
recorded-parent paths identify deep descendants, great-aunts and great-uncles,
great-nieces and great-nephews, and cousins by degree and generational removal. A house
founder retains the founder role alongside any direct or collateral relationship.

On every initial opening, the canvas and modal body explicitly center and focus the current
player after layout rather than depending on nested `scrollIntoView` behavior or beginning at
the founder. This applies equally to desktop and narrow/mobile layouts. Returning from a nested
character sheet restores the player's later pan position normally. The house founder keeps a
dedicated copper border accent at every viewport size, independent of their relationship label.
The blood-line, portrait, and panning instructions live behind the title's compact info tooltip
instead of consuming vertical canvas space; hover, keyboard focus, and tap all expose it.

Compact in-panel edits, such as House rename, sit inline beside the value they change as a
small bordered icon button with an accessible localized name and tooltip; the icon is
decorative and the button expands to the 44 px touch target on compact layouts. Its modal
form keeps only Rename/Cancel-style terminal controls in the shared sticky `.gm-footer`,
never in an ad-hoc action row in the scrolling body.

**Card details follow one tooltip convention per layout — never both.** The most
crucial facts stay visible on the card face at all times — identity, standing, and
the numbers a player acts on — while supplementary detail (audit tables,
descriptions, charter and tenure terms, siege math) lives in a hidden
`.settcard-details` div keyed by the card head's `.settcard-info` `?` button. The
canonical example runs from the Deeds tab: the buildings ledger's county link opens
the settlement sheet (`UI.showSettlement`), whose building and fort cards carry this
pattern; the Governance Vassals section follows it too, keeping each vassal's
standing, territory, and tax/levy contribution on the card and moving the service
charter, tenure, political terms, council office, and exceptional levy into the
details. On desktop (fine pointer, wider than 1100 px and taller than 520 px) the `?`
button stays hidden and hovering or focusing the card opens the shared `#tooltip`
side panel just right of the card (flipping left near the viewport edge); the pointer
may move onto the tooltip without closing it, so buttons rendered inside it — the
fort card's `data-fort-tech` technology link and `data-fort-start` construction
button — stay clickable from the tooltip itself. Shared tooltip copy is 15 px so
supplemental information remains legible without competing with the card face. On touch and tablet-width or short
layouts the hover tooltip never opens and the `?` button toggles the same details
inline instead. `eventChoiceUsesDisclosure` in `ui_misc.js` is the JS half of the
switch (it also gates the settcard tooltip), and the `.settcard-info` media query in
`css/style.css` is the CSS half; event-choice stakes follow the same rule with their
`.event-details-button`.
One-time deed rows use this convention too: the card face keeps only the enlarged action
name, with gold, green, or blue-green border accents distinguishing day-spending immediate,
choice-backed, and no-day immediate actions. Timing and descriptive copy live together in
the hidden details, exposed through the desktop side tooltip or compact-layout `?`.
Daily Focus rows use the same enlarged action-name treatment and move their descriptive
helper copy into that disclosure. Network management actions match the Deeds action-name
size and weight and likewise keep helper, eligibility, cost, and duration prose in their
desktop tooltip or compact `?` disclosure instead of beneath the button label.
Technology detail sheets use the same convention for the seven-field national-research
audit (owner, scope, setup and recurring costs, effect, transfer, and expiry), leaving
historical dates, exposure, progress, prerequisites, and controls on the sheet face.
Royal Council seat and candidate heraldry use the shared ruler-card tooltip on desktop
hover. Occupied heraldry also supports keyboard focus and opens that ruler's full sheet
when activated; candidate heraldry remains part of its assignment action. The preview is
placed outside the modal's left edge to keep the seat actions clear. Mobile Back restores
the originating occupied heraldry and its exact Council scroll position.
Network uses the same disclosure for routine **Established**, **Known tie**, and **Vacancy**
labels instead of rendering those words as face chips. Household and Connections
disclosures add the character's age, home, section-relevant roles or ties, standing, and
the gameplay significance of that relationship. Political-bloc disclosures add the
bloc's definition, leader, influence, any current forecast or posture, the four most
influential member houses, and the three strongest interest reasons. Larger member and
interest lists show their omitted count and direct the player to the complete Governance
breakdown instead of creating a viewport-height tooltip. Urgent warnings, opportunities,
and active commitments remain visible on the card face, except a realm's redundant war
warning chip: its visible war-status line already carries that state. The player's own Household entry
is explicitly identified as **You — Household head** on both its card and disclosure.

**Responsive layout lives in css/style.css.** `#panels` wraps the two side panels — invisible
on desktop (`display:contents`). From the 821 px desktop breakpoint through 1440 px, the
persistent Self/Kin and Deeds/Land/Network/Chronicle bars scale together from 80% to their
established 290 px and 340 px widths. This preserves a useful center-map column on the
smallest desktop layouts without changing wide-desktop sizing. On phones the
Deeds/Land/Chronicle panel takes the full width and Self/Kin becomes a drawer (`#left`
fixed, shown by `body.showself` — toggled in
`setTab`, opened by tapping the mobile-only topbar portrait, closed by `#btn-closeself`).
The drawer Close uses the same footer control at the bottom middle, immediately above the
fixed time bar.
The redundant topbar portrait is hidden when the Self panel is persistently visible on
desktop. The time controls become a fixed thumb-zone bar above the drawer (hidden by
`body.picking` during
the birthplace pick), most modals render as bottom sheets, and touch targets stay ≥44 px
with safe-area insets. In portrait the topbar wraps to three rows: identity and ☰ up top,
then the full date (with year) on its own line, then the four resources on their own
full-width row (`#tb-date` order 4, `#tb-stats` order 5; a single stats row clips its
leftmost figures on narrow screens, and the date is hidden in the tighter landscape bar).
Below that bar, portrait play uses a balanced split: the map is bounded to roughly one-third
of the remaining height (190–260 px) and the Deeds/Land/Network/Chronicle workspace receives
the rest. A 44 px drag target straddles the boundary without consuming its full height in the
panel. Dragging it resizes continuously and release snaps to Panel-first, Balanced, or Map-first;
tapping cycles those states, while Up/Down and Home/End provide the equivalent keyboard path.
The chosen snap state lasts for the page session and is recalculated when the viewport changes.
Panel-first leaves a small live map strip and hides its dense HUD and overlays until the map is
expanded again. The map HUD uses two columns while the map is below 324 px so all seven controls
retain their 44 px touch targets without forcing the old minimum; dragging into a tall Map-first
pane returns them to a single right-hand rail. Map overlays and toasts recalculate their clearance
for the active HUD arrangement. The portrait toast rail remains clipped inside the map; while a
map sheet is open, new notices compact to one line and sit beneath the sheet instead of covering
its controls.
The play/pause button shows only ▶/❚❚ and its `Space` badge — the running date is not
repeated there, so the button never changes width as the days flow.

Natural clock ticks use a low-priority `UI.refresh({ liveTick:true })`: the lightweight
topbar and date remain daily, but the expensive Deeds and Land trees stay mounted without
an automatic repaint while natural time flows. A changing host value otherwise makes Land
recompute and replace the host card, county economy, settlements, population, people, and
all their bindings; Deeds likewise reconstructs every action and eligibility description.
Those whole-panel frame spikes matter more than their average frequency, so the live clock
does not invoke either renderer. An ordinary refresh — used by pauses, tab/selection
changes, orders, deeds, and modal outcomes — bypasses the live snapshot and makes every
value exact immediately.

Live refreshes also never compete with a direct map gesture. While a pointer drag, pinch,
or wheel-zoom is active, refresh requests retain the last completed topbar and panel DOM
and collapse into one deferred refresh. Pointer release, cancellation, or 120 ms of wheel
idleness flushes it without raising its priority: deferred natural ticks remain lightweight
and cannot cause a whole-panel rebuild between repeated drags, while a deferred pause or
other exact request still repaints immediately. The simulation updates daily throughout;
only repeated text calculation and DOM replacement are skipped.

The Land tab groups realm, county, and development facts into compact cards. A county
with authored communities keeps its principal Culture and Faith rows and adds the full
ordered culture-and-faith list, so the political baseline and every available local
start identity are both visible. Short facts
use aligned label and value columns on desktop, while explanatory values such as alliances,
de jure paths, and development history use a full-width stacked row. Narrow and short
layouts stack every Land fact with its label above the value, keeping long translations and
proper names readable without horizontal overflow.

Mobile-layout UI states mirror their navigation in the browser's same-document history:
switches among Deeds/Land/Network/Chronicle, the Self/Kin drawer, generic dialogs, selected
nested dialog views, the travel picker, and the equipment-slot overlay each add a same-URL
entry. Browser/device Back unwinds one state at a time, returning through previously selected
panels before leaving the game, and visible Close/Back controls consume the same owned entry
so dead entries do not accumulate. This uses only the game's own frame history and never
reaches into an embed's parent page. Android consumes physical Back to leave itch's
browser-owned iframe fullscreen before it traverses that history, so nested equipment
pickers show a sticky in-game Back control on embedded mobile layouts; it invokes the same
owned history entry and keeps fullscreen active. A dialog with contextual Guide help puts a
compact, accessible info icon beside its optically vertically centered title; it retains the exact Guide destination. Closing
the Guide restores its originating dialog, while footers remain for terminal modal controls only. Direct play on
`play.fallowborn.com` continues to use device Back normally. Entries carry UI descriptors
only; gameplay actions and mandatory event decisions are never made undoable. If the History
API is unavailable or rejects an entry, all existing visible controls remain the fallback.

**Contextual Back Routing.** Whenever any tooltip, interaction card, requirement button, or
contextual action inside a modal opens a different modal dialog (such as jumping from a
fortification or building requirement into a technology sheet, or opening an enterprise or
charter prerequisite), the newly opened modal's **Back** button and back navigation must always
favor linking back directly to that specific originating context modal rather than falling back to
a generic top-level catalogue or root screen. When navigating prerequisite chains or jumping
between entries within the destination modal, that originating return context is preserved so
backing out returns to the original source sheet.

Every generic modal uses a flex-column card with a scrolling `#gm-body` and a sticky,
centered `.gm-footer`, so its terminal controls remain at the bottom middle while long
content ends at the footer's opaque, bordered cutoff rather than fading behind it. Search
and select controls inside a sticky modal toolbar keep a small horizontal inset, so their
focus border never visually merges with the card edge. Sticky modal toolbars (such as
`.war-target-toolbar`, `.raid-target-toolbar`, `.market-lens-controls`, `.guide-controls`, and
`.tech-controls`) standardize on dark parchment inputs (`#201a13`/`#211a12`), bronze borders
(`#66522f`/`#775f32`), gold focus rings (`#ffd24a`/`#e0c060`), custom chevron wrappers
(`.raid-strategy-select-wrap`/`.market-lens-select-wrap`), search input wrappers with leading
magnifying icons and dismissible clear buttons, and minimum 44 px touch heights on mobile.
Dropdown options inside these toolbars must remain short and concise (e.g. `⚔ Deep Sack`, `🐎 Swift Skirmish`);
never embed long multi-clause explanations or parenthetical descriptions inside `<option>` labels, which
cause text to extend past dropdown bounds or clip horizontally on narrow screens. Any dynamic explanatory
helper or hint text belongs immediately below the dropdown when a selection is picked.
Two families break only the bottom-sheet framing: the Changelog
(`.changelog-modal`) stays an evenly margined centered panel, while the Menu, Automation,
and end-game dialogs (`.fullsheet-modal`) fill the whole screen edge to edge.
Action buttons never flex-shrink inside these columns, so wrapped descriptions and expanded
translations remain inside their button borders and contribute their full height to scrolling.
Ordinary modals (including event, settlement, and resource dialogs), the nested equipment
picker, the raid map picker (`.raid-picker`), and the travel destination picker float above the device's bottom safe area with a
complete rounded frame. Only deliberate full-screen sheets and the Self/Kin drawer meet the
bottom edge.

**Readability is a layout budget.** The standard UI body starts at 16 px; actions, modal
copy, cards, and Guide entries use a readable 15 px-or-larger role, while supporting labels
and metadata remain at least 12 px. Narrow layouts preserve or increase these roles rather
than shrinking text to fit. Prefer a compact label or one-sentence state over explanatory
empty prose. Keep the immediate cost, gate, or consequence beside an action; put durable
rules, background, and exceptions behind the modal's contextual Guide icon (or an existing
tap-safe tooltip). This keeps the first screen scannable without hiding information from
desktop, keyboard, or touch players.
Desktop scroll containers share narrow, rounded bronze thumbs over transparent tracks so
panels, sheets, lists, and modals retain the parchment styling without prominent scrollbars.
Modal-owned scroll bodies keep a small content gutter before that track so prose, sliders,
and buttons do not press against the thumb. Touch devices keep their platform-native
overlay scrolling.
The title screen scales its crest, heading, button height, gaps, and footer spacing against
viewport height so the full menu fits common standalone and itch iframe heights; genuinely
short viewports retain `.screen` scrolling as the fallback.
Each main-menu action has a distinct leading system icon in a fixed-width slot. The icons are
decorative and hidden from assistive technology, leaving the localized text as the accessible
button name.
The title and its pregame flow share a compact pair of lower-left music buttons, away from the
itch.io fullscreen control. The first button's pause or music icon reflects whether the title
theme is currently playing. Pausing retains the current title-track position for an in-session
resume and remembers silent title playback for the next visit. Resuming stores title autoplay
again. The adjacent next icon cycles through the three title themes and wraps to the first; while
paused it selects the theme that will play on resume without enabling music. The controls remain
hidden while loading, during gameplay, or when the soundtrack cannot play.
During gameplay, the song title opens the full music controls and a separate compact button
immediately to its right pauses or resumes playback. Desktop centers the pair below the map. Mobile
uses a narrower lower-right presentation, opposite the lower-left toast region; shallow portrait
maps keep the HUD in a tighter vertical rail above the playback cluster. Both the HUD
and native music buttons retain 44-pixel minimum
touch targets. Settings keeps focus-loss pausing as the default and
offers an opt-in background-playback checkbox for inactive tabs, windows, and locked screens.

The map HUD also exposes a **Find location** overlay, with `?` as its desktop
shortcut. Its local, cached index covers settlements, counties, duchies, and
kingdoms in the active bookmark; choosing a result selects its county and
centers the map at a scale appropriate to the result type. Arrow keys move
through matches, Enter chooses one, and Escape returns focus to the HUD button.
The overlay and Market lens are mutually exclusive so their controls never
compete for the map corner. Portrait maps reserve enough height to keep the
seven 44-pixel HUD targets in one rail; shallow landscape maps use a compact
two-column HUD cluster while preserving the same touch floor.

Surface-specific browser behavior is centralized in `FB.platform`, initialized by
`js/util.js` before boot. Its current `isPlay` flag is true only for the HTTPS
`play.fallowborn.com` origin; `file://`, local test servers, and itch-owned embeds remain false.
Only the play surface injects web-app manifest metadata and registers the offline worker. The
title-screen offline status is an `aria-live` region that stays absent from layout until a worker
actually controls the page, at which point it shows localized **Game available offline** copy.
That status covers the core game and intro; soundtrack banks have separate download controls. A
rendered page alone is never treated as proof that its complete bundle was cached.
While a play-host tab remains open, it asks the worker to check for a deployment at boot, every
five visible minutes, and when the tab regains focus. A newly activated worker reports its stamped
deployment fingerprint; only a fingerprint different from the page's stamped `main.js` reveals
the persistent, localized **New version available** status banner. Its **Save and reload** action
writes the current playable life synchronously before reloading. First worker installation,
`file://`, localhost, mirrors, and itch never reveal the banner.

New Game proceeds directly through bookmark → social scenario → province → character,
rolling a fresh seed before the starting-date screen so the ordinary path has no preliminary
choice dialog. The starting-date screen keeps **Use a Seed or Start Code** as a secondary
action; it opens the paste field for shared full starts or world seeds without placing that
advanced choice in every new player's path. Every
browser profile begins with Serf as its only playable social scenario. Reaching a higher
station during a life unlocks every authored starting scenario at that station: Freeholder
opens Free Farmer, Craftsman's Apprentice, Novice of the Faith, and Man-at-Arms; Gentry
opens Hedge Knight; Baron opens Petty Baron. Locked cards remain visible and focusable,
carry `aria-disabled`, use a clearly greyed presentation, and state the exact in-life
achievement required at the bottom. Beginning cards use a prominent role name and one short,
factual flavor sentence without a difficulty rating. Observe follows the same compact shape.
Observe remains
available because it creates no character. A locked shared start code stays in the seed dialog
above the starting-date screen and explains its missing station instead of bypassing progression.
This browser-profile
recognition is recorded as `earned_starting_stations` with `mode:'none'` in
`FBDATA.techImpactReviews`: it exists outside the simulated world, so no historical
technology credibly gates or improves it.

Bookmark
cards use the same responsive grid and native-button keyboard behavior as scenario
cards. Their date and bookmark name use a colon rather than a dash, and their heading
size matches the beginning-role cards. Selecting one activates its world before the
province picker is shown, so the
preview owner colors, county details, headings, era help, Observe mode, and character
birth year all read the same active definition. The birthplace screen asks only for a
province on the map; **Random Province** remains available without being advertised in
the instructional sentence. Once a county is chosen, its compact summary emphasizes the
county name, places realm and terrain beneath it without a dash, and offers one native
settlement select defaulted to the county seat. **Continue** commits that selection. The
province pick bar lists all authored communities, and character creation uses
native coupled culture-and-faith radio choices in the same authored order when more than one
community is present. A single-community county omits that redundant picker and selects its
principal pair; Back to the same county preserves the chosen pair. Family cards carry their own
age and household summaries, while the final card shows only the world seed and points to the full
shareable start code in the in-game menu. Returning from scenarios goes back to the bookmark list
without wiring another set of map listeners. Hosted telemetry emits a distinct viewed event for
starting date, the optional seed dialog, beginning, birthplace, and character creation. Each
screen emits once per New Game attempt, so revisiting it with Back does not inflate the setup
funnel; bookmark and scenario are the only step-specific context. Once character creation
commits the campaign, `campaign-started` records stable internal IDs for the starting county and
the character's selected culture and religion so start preferences can be compared without
sending names or the world seed.

Hover-only affordances need a tap path (item chips toast their description).
The enterprise catalogue shows every known enterprise for the selected settlement rather
than hiding geography-, development-, ownership-, technology-, or money-blocked choices.
Purchasable rows come first. Every row carries a compact Ready, Can buy—will be idle, or
Unavailable state and its primary explanation. An unavailable row remains a native,
keyboard- and touch-activatable button whose action is to open a compact requirements
sheet; it never attempts a purchase. That sheet lists every simultaneous blocker with
current and required values, links to missing technology when the player's role can inspect
it, and returns to the exact live catalogue view. A ready row still buys directly, while a
no-worker warning remains non-blocking and states that the property will produce nothing
until staffed. The Work sheet always exposes each household settlement's catalogue entry,
including when every enterprise there is unavailable.

The Work & Enterprises sheet treats a tier-3+ protagonist's career as a read-only
former calling. Career changes, guild steps, and personal enterprise assignment are
removed while household occupations, religious-office advancement, and business
staffing remain available. Its Group enterprises and Enterprise order selectors use the
same parchment treatment as the Market basket picker. Each staffed enterprise has a saved **Lock this worker to
this enterprise** checkbox; locked pairings are marked in both this sheet and Household
Plan. Whenever an owned enterprise is idle, **Staff all idle enterprisesâ€¦** opens a
no-day static review of the maximum-yield result across all unlocked assignments. The
review shows current/proposed totals, every kept or changed pairing, and every unresolved
enterprise with its eligibility, lock-contention, or higher-yield-allocation reason.
Owned enterprise rows and management sheets consume `FB.enterpriseStaffingStatus`: their
compact text and detail view therefore agree on remote residence, missing vocation,
missing guild rank, and reassignment availability. A management sheet with no candidate
shows an explicit empty state and the next useful step instead of an unexplained blank
list.
The enterprise and retainer managers also expose a person-level **Keep out of automatic
staffing** reservation. Reserved workers are visibly marked in candidate cards; an assigned
one stays where they are in the batch review, while an idle one is omitted.
Apply is enabled only for a changed plan, revalidates stale reviews, and never spends
time or money. Back remains available in the sticky footer; applying from Household Plan
returns to its refreshed overview. When none is idle, the entry point is replaced by an
all-staffed hint.

For an active learned career, the career sheet presents the whole path rather than hiding
future branches: trainee and license, both permanent specialties, personal skill/year
requirements, and their national technology gates. Currently attemptable examinations are
native buttons showing the live pass chance and training-adjusted fee; unmet requirements
and a failed-attempt cooldown remain visible as explanations. Passing or failing spends a
day and returns to the originating person or Household Plan flow. Landed protagonists see
the preserved path as biography but receive no examination actions.
The building deed's county ledger stays open after **Raise**, so repeated construction
does not traverse province and settlement dialogs for every work. Its building cards
retain the modal's 1–9 keyboard hints, show the exact live price, and explicitly warn that
repeat copies in one county become 50% dearer each time. A sticky native county selector stays
in reach above the scrolling ledger, including on narrow touch layouts, and switches directly
among all held counties. Exact settlement placement and permanent demolition remain available
from the Land-tab settlement view. Every settlement name there links to that settlement's
sheet and centers the map on its parent county. Province settlement lists wrap between
places, never inside a settlement name, so each link stays readable.
The Land tab's **Notable folk** list is ruler-first: it shows the county holder, all of
that holder's direct vassal realms, then every liege through the sovereign, without a
row cap or duplicates. Every entry is a native focusable row with the reigning
character's procedural portrait and opens that ruler's character sheet. Each row states
realm, political relationship, age,
Martial, and the player-relative Standing. Generated local characters appear only as a
defensive fallback when no political ruler can be resolved.

Every reigning ruler uses the standard character sheet, rather than a duplicate
realm-ruler sheet. Their title, **Realm muster** line, court, political actions, and
personal actions share that one sheet; the muster names the current approximate troops
the realm can raise. An active war is the first notice under the card, and the Land tab
places the same linked status line directly below its county heading. The notice's realm links always
open the linked ruler's sheet — including the player's own realm, whose self sheet wears
the same ruler frame (rank title, muster, war notice) while still skipping the foreign
Standing and diplomacy card. Each ruler notice follows the live war record with a compact
goal for the attacker and defender (or both great-holy-war coalitions), so either linked
sheet explains what both sides are trying to achieve. A sheet reached through a return
chain shows both **Back**
(walk the chain) and **Close** (dismiss the modal outright), so linked sheets can never
trap the player in a back-and-forth loop. The larger skill line carries
the same compact Skills Guide icon as an ordinary character sheet. Every
character-sheet portrait centers the map on that
character's home county without dismissing the sheet. A decorated ruler portrait frame and a quieter heir
portrait frame make the line of succession legible at a glance. The ruler's bounded consort-and-children
portrait bar becomes the royal family's local navigator: opening a consort or child
keeps their matching portrait bar beneath their card (a consort sees spouse and children),
omits the repeated context grid, and uses Close rather than Back. Selecting another
portrait replaces the card in place, so court browsing never needs a stack of return
screens.

**Portrait-heavy panels retain unchanged markup.** Self, Kin, Network, and Land keep a
module-local record of the state reference, locale, and unlocalized HTML used for their
last insertion. An identical refresh preserves the existing nodes and listeners, skips
localization and large-list setup, and still calls `FB.paintFaces`; the portrait target
stamp then decides whether a retained canvas needs new pixels. A state replacement or
locale transition resets these records. This content-equivalence optimization is
deliberately limited to the four named panels and does not cover active forms, event choices,
or modal history.
Direct tab navigation renders only the newly selected pane. It does not recompute the
other desktop panel column: right-side navigation therefore leaves Self/Kin untouched,
and Self/Kin navigation leaves Deeds/Land/Network/Chronicle untouched. Exact UI refreshes
after game-state changes still update both visible columns, while opening the mobile
Self/Kin drawer renders its selected pane immediately.
For a count or higher, the selected current seat is marked **capital and home**.
Every other directly held demesne county shows **Move capital here…**; the native
button remains visible but disabled with the exact prestige, journey, campaign, or
lifetime-limit reason. Its focus-managed confirmation names both seats, the prestige,
popular-opinion and direct-vassal Standing changes, every affected vassal, the
once-per-ruler rule, unchanged county-bound property, and any province-scoped incoming
monopoly that will end. Confirming applies without advancing the day; cancel returns
focus to the unchanged Land button. The ordinary generic-modal bottom sheet supplies
keyboard numbering, scrolling, safe-area spacing, and minimum touch targets on narrow
layouts.
The topbar resources (money/prestige/piety) are real buttons: hover shows the
instant `#tooltip` with the per-season source breakdown (`FB.incomeBreakdown`
in js/actions.js — focus, rents, vassal dues, buildings, household holdings,
treasures, station upkeep, resident-family provisions, maintained standards, local-market
adjustments and hardship, raised-host logistics by component, and school fees), tap or click opens
the same rows as a small modal
(`UI.showStatModal`), and keyboard users Tab to them with native Enter/Space
activation. The money button uses `FB.money`: compact formatting for its visible
balance, the configured `icon` for the mark, and localized long denomination names
for its accessible label. Compound amounts may therefore use multiple units without
changing the underlying `player.gold`. The deprecated
`FBDATA.balance.coinageSymbol` changes only the default icon when no full currency
definition is active.

The commoner **Better the household…** deed opens the full-screen-capable Household
standards & property sheet. It shows active standards upkeep, reliable seasonal net, and
the projected purse after one season in a compact three-cell summary before listing five
general standards, relevant profession outfits, and permanent holdings as separate
catalogue sections. The catalogue follows Technology's dense scan rhythm: one row shows
the icon, name, level/status, current or next effect, next setup price, and current upkeep.
Owned property uses the same compact row treatment and a distinct completed state. Each
standard remains a native button and opens the complete asset/effect detail view. Upgrade
confirmation states setup cost, complete new upkeep, benefit, seasonal net, and projected
purse; a negative projection warns without disabling an otherwise affordable purchase.
Reduction requires a second explicit confirmation that names the lost level and
no-refund/re-purchase rule. `UI.showHoldings` remains an alias to this sheet for older
deeds and mods.

Maintained transport and outfits are explicitly described as expenses rather than
productive or combat property. The permanent section keeps Pack Mule, Fine Tools, Good
Mail, Warhorse, and other existing assets under their old one-time ownership rules.
The sheet uses ordinary numbered action buttons, nested same-document history, a sticky
footer, and the `fullsheet-modal` narrow/mobile layout.

The conquest picker previews the current household's normal-muster logistics before
the player declares. Selecting the player's raised host in the Land panel shows the
current live logistics total beside its composition; ordinary war-status text repeats
the component breakdown and total. These surfaces read `FB.playerMusterUpkeepParts` and
`FB.playerHostUpkeepParts`, so great levies, reinforcements, casualties, mercenary
companies, disbanding, and re-raising stay in agreement with the seasonal gold ledger.
The conquest picker is a session-state catalogue over `FB.warCauses(state, true, true)`:
blocked causes stay present with the pact, alliance, or diplomatic reason preventing
declaration. Search covers objective, enemy realm, ruler, and enemy territory. Cause,
adjacency, relative-rank, and diplomatic filters compose; deterministic sorts offer the
recommended available-rights-first order plus realm, territory, rank, and defensive
strength. Filtering and sorting only hide or reorder semantic cause rows, then rebuild
visible modal number badges from that DOM order.
The selected-host Land panel and Deeds war summary also show the bounded battle record,
recent streak, live composition, campaign losses by class, and recent non-battle
effects. Every effect is labeled as changing abstract strength, live troops, or both;
the accompanying explanation keeps supply, thin ranks, and discipline from implying
unrecorded casualties.

**Managed household sheets keep compact bust portraits and open equipment separately.**
The Self sheet and the sheets for living spouses, resident unmarried children and
grandchildren, and paid retainers each offer an **Equip items…** button. It opens a
dedicated modal with one deterministic 192×360 full-body
figure and eight native slot buttons in a two-column grid. Bust and figure are two frames
of the same normalized identity and one-pass Canvas painter; the figure does not compose a
second temporary face canvas. Only the most recently rendered opaque figure is retained,
so reopening an unchanged sheet is one MRU blit rather than another cold illustration.
The modal is centered on desktop
and becomes a scrolling full-screen sheet with a bottom-pinned close control on mobile.
Its centered title stacks the character's full name above **Equipment**, keeping the heading
readable on narrow screens.
The Self overview places its skill bars beside the compact portrait; both the portrait and
the narrow button directly beneath it open the equipment sheet. Traits sit below the
overview, before the full identity and household details. Self and full character sheets
group trait chips in the fixed order Disposition, Formation, Reputation, Condition,
then Other, preserving the character's stored order inside each class. Compact event,
family, and other character cards keep one flat chip row. Trait chips are native
focusable buttons: hover gives the class, acquisition guidance, and exact root/grouped
effects, while click, tap, Enter, or Space opens the same detail modal. Sibling-courtship
trait effects are the exception: both surfaces name the affected stage and show only a
directional hint, leaving the exact live score and chance to the courtship review. Unclassed
mod traits appear under Other. Titles and Possessions use collapsed-by-default,
counted accordion rows matching the Deeds group controls so large realms and armories do
not dominate the Self panel. When expanded, Titles presents high dignities as aligned rank-and-style rows and renders
directly held demesne counties as a dedicated multi-line list under a clear count header,
preventing large territorial rosters from squishing dignity labels. Title styles and county
names are interactive links that navigate directly to the target county (or duchy/kingdom/empire
capital) on the map and Land panel. Active maintained standards appear in the livelihood summary
as compact icons with numeric levels; dormant purchased levels stay off that active row.
The full-name heading leads the mobile/short-screen drawer,
where that drawer covers the topbar, and is hidden in the desktop panel because the
persistent topbar already names the character. On desktop, a subtle divider separates
Traits from the rank, age, culture, faith, and health details below.
The rank value is a native link-styled button. It opens a compact realm-and-demesne
sheet showing the current seat, direct holdings and capacity, realm-wide territory,
vassals, landed tax and levy, and the directly held county names. Settings owns separate
Accessibility controls for the two neutral text roles. Ordinary labels, values, and body copy
share a brighter ivory main-text default; explanations beneath actions, event choices, cards,
form controls, and compact metadata share a higher-contrast parchment helper-text default.
Each has a browser-local custom color that applies live without replacing gold accents or
semantic gain, danger, and warning colors. Settings also owns a dedicated Map section with the
browser-local realm-map color and fill-opacity controls. They set the
focus outline and the independent player realm's displayed political fill without mutating
saved political state; lowering opacity reveals terrain while keeping the outline clear.
The map also exposes a keyboard/touch **Market** lens with one styled native basket
selector. Narrow screens stack its label above an action area that keeps the selector
and Market button paired when they fit and wraps them into full-width rows before they
clip; the Market sheet uses a full-width disclosure menu beneath its label. Its
keyboard-navigable options overlay the sheet without expanding it and remain bounded
to the modal and viewport.
Compact desktop widths also stack the lens within the center map column and reserve
the right HUD lane, rather than allowing its wide toolbar to overlap the Land panel.
A centered, high-contrast teal/gold/coral legend matches the colored
`▼`/`●`/`▲` map symbols and stronger county price bands, so scarcity remains legible
without relying on color alone. Only the player's active ventures and corridor charters
draw patterned routes, bounded to four; the simulated adjacency-flow graph is never
rendered. The lens, the Land panel's Development Market card, the county-head settlement
sheet, venture review, and Network → Trade & Guild all open the same county Market sheet.
Its selector, textual trend, stock and seasonal report, named endowments, disruptions,
ventures, charters, and hardship duplicate every canvas meaning for keyboard, touch,
screen-reader, and color-vision access. See [markets.md](markets.md).
Every slot button is at least 44 px high, participates in ordinary Tab/Enter/Space
navigation, and opens a numbered compatible-armory list over the still-visible equipment
sheet; no drag-and-drop path is required.
Choosing an object applies the equipment change immediately; displaced objects return to
the armory without a second confirmation. Equipment controls disable during travel or an
unresolved event.
The same sheet’s **Equip Best…** button opens a keyboard- and mobile-safe review instead of
mutating immediately. The review lists the proposed outfit, names the armory or current
wearer for each selected object, and spells out every move and displaced object before an
explicit apply. If an assignment changes while the review is open, it shows a fresh plan
and requires another confirmation. Applying returns to the selected character’s equipment
sheet; manual slot buttons remain the primary fine-grained control.
Only the current protagonist's Equipment sheet also shows **Visit Barber…**. Its nested
full-sheet picker paints a large equipment- and headwear-free bust. The preview, whole-coin
gold quote, and status stay stationary while only the adjacent options pane scrolls.
Desktop offers every ordinary hairstyle as native, minimum-44-pixel choice buttons. Mobile
replaces each full grid with minimum-44-pixel **Previous / current / Next** cycling controls
for hair and, where applicable, facial-hair family and style. Adult men choose among
clean-shaven, stubble, moustache, beard, beard with moustache, goatee, and sideburn families;
the style group immediately filters to valid designs in that family, including six distinct
moustaches. Women and minors do not render those controls. Every choice updates only the preview,
the desktop grid's `aria-pressed` state, and the mobile current-value announcement. Only
**Pay and apply** may mutate the character. Apply re-quotes and revalidates travel, unresolved
events, funds, and a changed appearance, deducts gold once, consumes no day, then returns to
Equipment. The visible Back control and browser Back both return to the same Equipment sheet
without mutation. On narrow screens the stationary preview stacks above the independently
scrolling cycling controls without horizontal overflow. Short phone viewports compact the
preview beside its quote and keep both footer actions on one row so the cycling pane retains
usable height.
Each owned item card has a **Protect from automatic equipment changes** checkbox. Protected
armory items are omitted from Equip Best and succession, protected worn items keep their
assignment when possible, and the hand pair is preserved together if either hand is
protected. Manual equipment controls remain available.
The mechanically active totals from worn items appear beneath the figure, including an
explicit empty state. On narrow phones the figure and bonus summary stack above the same
two-column grid.

The item card reuses the isolated procedural object renderer and reports exact quality,
quality-adjusted effects, value, current wearer, pledge state, and valid equip/unequip,
gift, and sale actions. Family/event/topbar cards retain compact bust portraits, with only
readable equipment cues such as a helmet, pendant, crown, or armor edge. The succession
modal is the other full-body surface: it paints the frozen final loadout beside the
“Worn at death” list before any heir may be selected. That render passes the explicit
snapshot map to the descriptor and never consults the successor's live loadout.

Managed minor character sheets — the protagonist, children, and resident unmarried
grandchildren — separate the education-focus picker from the instruction picker.
Every school/tutor row shows the projected full-year directed-learning chance and exact
training-cost-modified seasonal fee; unavailable rank, technology, town, focus, and age
combinations remain visible with their exact reason. A school with annual mortality states
its per-term and four-term danger in the picker. The upbringing summary repeats the current
arrangement, projected chance, fee, paused payment state, and any completed dangerous terms
even after the child switches to another arrangement. From age 12, child and grandchild
sheets also expose the same arranged-match picker. Career, guild, religious-standing,
enterprise, and equipment controls use managed household eligibility at both render and
action time, so a stale sheet cannot manage someone who has married out or otherwise left.

Person-selection flows for education tutors, enterprise workers, household retainers,
and council offices use the shared `UI.personAssignmentCard`. The component is a
render-only native button: it consistently presents the candidate, eligibility,
expected benefit or yield, cost or pay, present occupation or assignment, relevant
Standing, and any replacement consequence. Each picker still computes eligibility and
performs assignment through its own existing mechanic, so the common presentation does
not merge the underlying roles. Cards retain modal number keys, native keyboard
activation, focus styling, and a stacked narrow-screen layout.

Asset and persistent-effect surfaces use the render-only
`UI.assetEffectSummary`. Detailed asset views ordinarily keep the same owner,
scope, setup cost, recurring cost, effect, transfer rule, and expiry order
across freehold plots, enterprises, buildings, items, temporary modifiers,
technology, and purchase confirmations. Household-standard details are the
deliberate compact exception: they show the current state once, keep invariant
scope, succession, no-resale, and lapse rules in one note, and limit the
next-level choice to its changing name, effect, setup cost, and upkeep. The
upgrade and reduction confirmations still repeat the complete terms beside
their projected finances. Dense catalogue overviews may likewise summarize
self-evident fields and keep rule differences inline; Better Household does so
to keep standards and permanent property scannable. Callers supply live values
from their own APIs; renderers escape and label them, apply the shared
not-affordable cue, and point seasonal money to the existing resource ledger.
Every surface presents the terms as compact single-line label/value rows
(the same rhythm as the `kv` stat rows), not a boxed cell grid: ordinary
dialogs use one row per field, wide full sheets flow the same rows into two
columns, and narrow layouts stack each label above its value. Shared
presentation does not create a common asset record or mutation path.

The Deeds panel begins with the responsive **Ongoing commitments** ledger
rendered by `UI.ongoingCommitmentsHtml`. Its title is an accessible
collapse/expand button, and the browser-local collapsed state (`fb_ui`) changes
only its presentation. Serfs hold almost none of these levers — no travel, no
research say, no political attention — so the ledger is omitted entirely at
that station. On full desktop layouts the ledger omits the redundant
daily-focus row; on compact layouts that row appears first and routes to the
top of the combined focus list. When expanded it shows the personal-attention
assignment; national research projects/policy appear only at landed rank
(vassals review, sovereigns manage), since commoners have no voice in the
sovereign's research;
political attention appears only when the independent ruler has that capacity,
while travel and financial-contract rows appear only while active. Each native
row routes to the authoritative existing control: the compact focus-list
heading, the assigned character or Network Connections, Foreign Policy,
Technology, the available travel deeds, or Coin & Credit. A journey marks focus as paused and
non-editable because travel replaces its daily tick; return travel is likewise
read-only because no route decision remains. The ledger creates no
shared capacity, saved record, or mutation path; it only consolidates status
and navigation. The compact-layout daily-focus route focuses and aligns the
focus-list heading with the top of the scrolling panel, rather than dropping
the player into the middle at the currently selected focus. On narrow screens
its rows keep full-width touch targets and
move their action label beneath the status rather than overflowing the panel.

Living character sheets also own personal relationship controls. **Cultivate relationship**
and **Stop cultivating** assign or withdraw the one social-attention slot without spending
a day when the character is local; while courting, the suitor holds that slot until the
courtship ends. A distant character instead offers **Travel to cultivate…**, or
**Travel to continue cultivating…** beside Stop for an existing paused assignment.
The review names the person and county, route, days, cost, 90-day minimum stay,
rank-access-adjusted daily rate, and estimated time to +40. Confirming assigns attention and
departs as one operation. The assigned person's sheet repeats their Standing,
access-adjusted daily rate, and estimated active days to the relevant threshold. **Call
friend** remains visibly disabled below the shared +40 threshold; **Propose marriage**
uses the candidate's exact courtship threshold, including culture and faith premiums.
**Offer a gift…** opens a numbered cash-and-armory picker. Cash and every exact armory
object show their access-adjusted cost and +Standing value and either readiness or
recipient-specific days remaining
on the shared cash/item gift cooldown. Equipped and pledged objects remain visible but
disabled with the blocking reason. Managed household recipients see cash only and an
explanation that their objects remain under shared-armory management. A cross-sovereign
recipient instead shows the frozen courier days and explains that Standing/cooldown begin
on arrival. While a delivery is outbound or returning, both the character button and
picker show its destination, phase, and remaining ETA and disable another gift.

All counterpart sheets use the shared Standing presentation: a clamped signed value,
the Hostile/Guarded/Neutral/Favorable/Warm band, and the same positive/neutral/negative
colors. The character card already carries identity and rank, so its interaction card
starts with Standing and commitments rather than repeating an identity grid. A
materialized ruler resolves through the realm target, so the unified character sheet,
Council, Estates, and gift interfaces cannot display different values. Standing explains
whether it affects personal, feudal, or diplomatic consequences, and a blocked action
names the station of intermediary still needed.

The no-day-cost **Coin & Credit** deed opens a full-screen-capable Finance sheet. It is
listed for every free station; a serf sees it only once the sheet holds
something actionable for that station — obligations on the book, or collateral
that secures an actual pledge offer (`FB.financeUiRelevant`) — and the Network
panel's **Finance…** shortcut follows the same rule. Active
obligations are ordered by deadline before metrics so the urgent contract remains first on
a narrow phone. The sheet shows purse, price index, last movement and purse adjustment,
reliable net income, credit capacity and defaults, exact loan faces/current values/dates,
pledges, and investment maturities. A revenue default at commoner station keeps a
direct full-balance settlement action and shows the exact days until its writ becomes
eligible; the signing confirmation discloses that unresolved default may expose
holdings, land, and station. The writ event defines distraint as court-authorized
property seizure and lists the live debt, named holdings, plot count, and
station-specific final consequence. Passive partnerships are labeled as backing another
merchant. A separate self-founded venture section shows its destination, strategy, stake,
separately paid overhead, and exact resolution date, and opens the shared stake/market
setup. Borrowing, investment, debasement, and recoinage use a
final confirmation whose first action receives focus; every term and default consequence is
visible above the buttons. The money source sheet also carries a non-recurring **Coin and
prices this year** line.

The Deeds panel uses accessible accordion groups for Work & Wealth, Life & Family,
Faith & Community, Rank & Realm, and War & Diplomacy. Group headers are real buttons
with `aria-expanded`; closed actions are not rendered, so a section-local letter can never
activate an invisible deed. Opening or closing a group updates that group in place without
rebuilding the commitments, focus, or other group controls. Every available daily focus
appears together in one block above the category accordions; the accordions split and count
only deeds by category. The stable `1`–`6` section keys do not renumber when a role has no
actions in one category, preserving muscle memory across promotions and temporary states.
Building Deeds first evaluates only each deed's visibility so every accordion retains an
exact count. Cooldowns, technology gates, and potentially expensive eligibility reasons are
evaluated only for open groups, when their controls are constructed. Returning through a
player tab click or panel-cycle shortcut reuses the mounted Deeds tree if no UI refresh has
been requested since its last render, preserving its controls, listeners, disclosure state,
and expanded details. Any exact or natural state refresh marks that tree stale immediately;
the next Deeds visit then performs the full exact render before reuse is allowed again.
The promotion-path note is new-player guidance rather than a mechanic. Settings offers
a browser-local **Disable guide hints** preference (`fb_ui`) so experienced players can
remove it without changing progression or available deeds. The preference covers the
whole beginner-guidance layer: the path note, tutorial checklist and scripted tutorial
chain, tab nudges, first-player map tip, empty-state
guidance lines, stat teaching lines, the contextual one-line hints below, and the
first-time tips further below. The complete Guide remains available from the menu.

Only the first campaign begun by a fresh browser profile carries
`player.flags.tutorial`, which puts a dismissible tutorial
checklist at the top of the Deeds panel. `uiPrefs.onboardingStarted` records that the
checklist was offered; profiles that already hold a save when this preference first
appears are grandfathered out. The checklist is staged in tracks (`TUTORIAL_TRACKS`
in `js/main.js`), and the first eligible unfinished track shows: **First steps**
(complete a one-time deed rather than merely changing Daily Focus, let the days flow,
answer an event),
**Family & legacy** (open the Kin tab, wed a first spouse, welcome a first child), then
**Making a living** (tier 0–2 only: take up a livelihood, start an enterprise, and
reach a first land plot; a serf is told to buy freedom first). Landed ranks skip
Making a living and finish with the family track. If the protagonist dies before the
checklist finishes, its `tutorial`/`tut_*` progress follows the household through the
chosen succession while ordinary life-local flags reset. The resumed card identifies
whether play continues as the previous head's child or another relative. A minor's
livelihood, enterprise, and land wording first explains that adult deeds unlock at
sixteen; inherited enterprises and land still satisfy their live-state objectives.
Step state comes from `FB.tutorialStatus` (live state plus one-time flags
written at each action's single choke point: `G.setPaused`, direct
`FB.runInstant` resolution or `G.passDay({skipFocus:true})`, the event-option handler,
`setTab`). Direct deeds stamp completion as soon as their action resolves, with the
opening poaching lesson retaining its own `tut_poach` evidence; picker-backed
deeds stamp only when a confirmed choice actually spends the day. Opening and cancelling a
picker therefore never completes the lesson. Tutorial
lives saved before that shared stamp also accept a retained authored deed cooldown as
read-only completion evidence. If an affected action left no cooldown, completing every
other First steps outcome likewise repairs the stranded deed item; neither path requires
replaying the deed.
`FB.tutorialCheck` runs from the coalesced
`UI.refresh` before the repaint, so a finished track disappears in that same frame.
It does not stamp steps, show completion toasts, or launch chapters from a later track
until the preceding track is complete, even when the player satisfied that goal early.
Completion detection uses only state reads and no RNG; it toasts each completion
once (`tut_seen_*` flags survive a hints-off phase), marks each finished track
(`tut_track_*`) with a chronicle line, and retires the tutorial when every eligible
track is done. Dismiss deletes the flag per save; old saves without the flag never
see the card.

Track progress also advances a scripted **tutorial event chain**
(`data/events_tutorial.js`): a neighbor’s welcome queues a couple of days into the
life, and one chapter queues as each later track completes. The chain is ordinary
declarative event data — `trigger:{never:true}`, `once:true`, queued via
`FB.queueEvent` — with small all-positive options so autoresolve stays sane. With
**Disable guide hints** enabled, the stage flags still advance but these chapters are
not queued.

Around the checklist, the rest of the beginner layer for a tutorial life
(`FB.tutorialLife` — the checklist was offered, finished or not): tab **nudge
dots** mark the tab holding the next unfinished lesson (Deeds until the first deed,
then Kin after First steps until the first look); each topbar stat’s breakdown carries one teaching line,
served by the shared renderer to both the desktop hover tooltip and the mobile tap
sheet; and the Kin and Network panels add a guidance line when they would otherwise
be empty. (The older first-open **panel intro sheets** and tier/role **orientation
sheets** were retired in favor of the coachmark lessons below; their content lives
on as Guide entries.)

Contextual hints (`UI.hintDue` / `UI.maybeHint` in `ui_misc.js`) deliver a single
one-line lesson the first time its moment arrives — for example, "events pause
time" inside the first event modal — each recorded as a
per-save `hint_*` flag so a life teaches it exactly once. The new-game intro modal
keeps only the scenario flavor and a one-line pointer to the Deeds tab.

A lesson fired to the screen shows as a **coachmark** (`UI.coachmark` in
`ui_misc.js`), not a toast: corner toasts faded before a lesson could be read,
so each coachmark is a tooltip anchored to the button or area it teaches (the
time buttons, a tab, a topbar stat, the map), with that target lit by a pulsing
outline. The player moves on with **Got it** or chooses **Stop tips** directly on
the coachmark. Clicking the highlighted control learns and immediately closes a
one-step tip before the control's own handler runs; this lets the requested deed or
time action respond to that first click and prevents a lesson hidden behind a picker
from silently blocking fast-forward.
If an exact refresh rebuilds the Deeds or Land panel while a lesson is open, the
coachmark reacquires the replacement target and reattaches its glow and interaction
listeners; a detached pre-refresh button never becomes the lesson's stale target.
First-time tips are persisted only at one of those acknowledgement points, not
when they are queued, so leaving mid-prompt does not lose the lesson; Continue
reconstructs the unfinished opening prompt from tutorial progress. Nothing
auto-fades, and only the
buttons take pointer input, so a waiting lesson never blocks the map or a panel
beneath it. A popping lesson also pauses a running game on the spot (the day
flow and an F-skip burst both respect that pause), so a fresh event modal cannot
bury it mid-read. One coachmark shows at
a time; later lessons queue behind it, and while an event or dialog holds the
screen a fired lesson waits its turn (pumped by `UI.refresh` and the modal
close path) rather than fighting the modal. A missing or hidden target drops
the arrow and rests by the toast corner, except targets with a natural
revealer: on small layouts the Self/Kin tabs live in a drawer that a portrait
tap exposes, so their lessons point at the topbar portrait instead
(`COACH_ALT_TARGETS`). The Self lesson explicitly tells compact-layout players to tap
that portrait; using it leaves the drawer open for inspection, while **Got it** closes the
drawer before family guidance continues. Only a truly tall area
(the map) is pointed at near its top edge;
a lesson targeting either retained side panel places its card in the adjacent visible map
space and points back with a side arrow (or an up/down arrow when the portrait layout stacks
map and panel). This keeps the lesson from layering parchment over dense panel text. A
full-screen Self/Kin drawer overlaps the map and therefore retains ordinary safe placement.
a short full-width bar (the mobile time controls) gets the ordinary
above-or-below placement, so the lesson never covers the controls. Screen
switches retire any lesson in flight.

The once-per-profile succession lesson is created only after the player chooses the
actual successor, so its wording distinguishes a child from another relative and adds
the childhood limitation for a minor. It targets the Chronicle tab rather than the
departed protagonist's portrait. On desktop that retained-panel target uses the standard
over-map placement instead of falling back to the bottom-left toast corner.

First-time **player tips** (`UI.tipDue` / `UI.maybeTip` in `ui_misc.js`) teach a
brand-new player once ever per install rather than once per save. The opening tips
begin with the map before any other coachmark: map controls hand off in order to the **Home**
button (recenter on the current home county) and **Map filters** (cycle realm, personal,
liege, de jure, and war views); Continue resumes at the first unread lesson in this map
sequence. The opening then follows the playable loop: do a one-time deed, let time pass,
answer the queued welcome event, read its result toast, and try **Poach the lord’s game**.
When that deed resolves, the coachmark returns to Deeds and highlights the newly active
**Family & legacy** checklist before continuing to **Self**. A prior opening poach is
recognized from its tutorial flag or retained cooldown and skips directly to that checklist.
On mobile and tablet
layouts the Self lesson targets the always-visible portrait because the Self/Kin drawer tabs
are hidden. Afterward, ranks 0–2 finish **Family & legacy** before unfinished
**Making a living** steps hand off to
**Work, training & enterprises…** for the first business, then to the rank-aware land
route in **Rank & Realm**: serfs are shown **Buy your freedom**, while freeholders are
shown **Buy a plot of land** directly. The lesson opens the owning Deeds section before
anchoring its coachmark, waits for the enterprise objective to be completed before teaching
land, skips an objective already completed, and Continue resumes at
the first unread lesson. Family coachmarks, including the Kin-area lesson, remain gated
until **First steps** is complete. The marriage objective ends with the first spouse;
when doctrine permits more, the checklist and a one-time Kin coachmark say that additional
marriages are optional while the Deeds action changes to **Seek an additional spouse…**.
A refused proposal changes it to **Seek another match…** and exposes any remaining search
cooldown in the same guidance. The Kin panel's beginner courtship line follows the same
gate. If Kin was opened early, its coachmark resumes once the gate clears instead of being
lost. After the checklist handoff and Self, the Family & legacy action guidance begins
when the player acknowledges
the Kin-area lesson: it opens **Life & Family** and points to **Seek a match**, then sends an
active courtship back to the Kin panel for personal attention. Once the authoritative
proposal gate is ready, it opens **Life & Family** again and points directly to **Propose
marriage**; it never advertises that action while it is hidden or unavailable.
The intervening courtship coachmark states the current calculated number of personal-attention
days required before the proposal gate will be ready.
If the protagonist is already married when the family track first becomes eligible, all
three family checklist items complete silently (without inventing a child or showing Kin,
courtship, proposal, or legacy-event guidance) and the next eligible track takes over.
Acknowledging the opening Deeds prompt immediately
hands off to the Play controls with the instruction to unpause after choosing a deed;
completing a day-consuming deed is a second trigger for that same once-only prompt.
Kin, Land, Network, and Chronicle otherwise teach themselves only when the player first
opens that area; Settings and the full Guide
are not pushed into the opening. Other contextual one-liners fire from engine choke
points the first time a situation occurs: the first wage, marriage offer, war
declared on the player, child, land plot, burning of the home county, household
hardship, and succession. Every tip
carries the selector of the control or area it teaches and shows through the
coachmark layer above. Learned tips are recorded in the browser-local
`uiPrefs.tipsSeen`, so no campaign ever re-teaches them. The layer has its own
Settings switch, **Disable first-time tips**
(`uiPrefs.hideTips`), is also silenced by the wider **Disable guide hints** switch,
and never starts on an install that already held a save when the layer first
initialized — the upgrade case — decided once from `FB.save.hasAnySave()` when the
prefs load and kept as `uiPrefs.tipsGrandfathered`. The per-save `hint_*` layer
above is unchanged: those are lessons a life may need again, while tips are lessons
only the very first player needs. Hosted telemetry emits low-cardinality
`hint-shown`, `hint-interacted`, `hint-dismissed`, and `tips-disabled` events keyed
by authored hint ID and kind; no hint text or save content is sent.
The Self sheet's faith block names the live religious head, the number of days its office
has been vacant, or the branch's lack of a centralized office, and states excommunication
separately from the trait chip. Faith names on Self and Land are focusable links to a
details sheet with an in-world origin account, founder/date/place, lineage,
directional parent relations, authority, spouse and clergy rules, and doctrine sources.
Faith & Community contains the contextual absolution, Papal-restoration, and
Caliphate-claim deeds. Their resource/land consequences use ordinary focusable
confirmation sheets. The occupied Caliphate deed remains visible but disabled while
the player realm is already at war or committed to a great holy war, and its final
confirmation revalidates the live succession cause. A Catholic Papal conquest is marked as sacrilege in the war list
and uses its own second confirmation; no penalty is applied until that final button.
A county with no recognized right is instead labeled **War of Aggression**, never as a
claim. Its war-picker row contrasts the political and victory consequences with lawful
causes. Selecting it opens a dedicated confirmation naming the target and siege
objective, exact immediate prestige/Common Voice/Standing costs, recent-war escalation,
continuing vassal breakaway pressure, the full Conquered Without Right duration/effects,
and the most likely commons, bloc, vassal, and foreign opposition. The final button
revalidates the cause; cancel and browser/modal Back return without mutation or RNG use.
An aggressive attack on the active Papacy combines both sets of warnings and accepts
both consequences through that one explicit final action.
A separate personal-attention summary names the assigned character, current Standing, fixed
daily rate, estimated active days to the relationship threshold, and whether progress is
active, paused while on the road, or paused because the target is in another county; attention
never replaces the work focus.

Rank & Realm exposes one no-day-cost **Governance…** entry for every territorial
baron-or-greater player and every appointed Castellan. Its desktop-wide and mobile
full-sheet layout is the
authoritative political presentation: Position, Domain, Liege & Obligations (or
Independence), Vassals, Political Blocs, the rank-appropriate Institution, and grouped Political
Actions. `FB.governanceSummary` supplies locale-neutral ids and exact numeric values;
the UI localizes complete phrases and delegates every enabled or disabled action to
`FB.instantStatus` and `FB.runInstant`. County buttons open a compact Governance county
summary with an explicit **Open in Land** route; its visible and browser Back actions restore
the exact originating section. Realm buttons, political actions, gifts, levy favors, and
focused Estates/Council views likewise preserve their Governance section after cancellation
or completion. The section strip is a keyboard-navigable tab list that exposes one consistent
content surface at a time; its content viewport and exit footer remain fixed while only
the active section scrolls. Direct vassals use a compact aligned ledger on desktop and
two-column stat cards on narrow screens. Controls are native buttons, ordinary number
hints and shortcuts apply only to actions in the active section, and no layout hides
blocked reasons. The legacy Estates and Royal Council
deed ids remain callable compatibility aliases but are omitted from the ordinary Deeds
list.
The Domain section exposes per-county **Reserve from grants** and **No autobuild** controls.
Choosing a county or duchy to grant opens a recipient sheet and then a non-mutating terms
sheet. It keeps service charter and tenure as separate controls and shows the selected
grant's exact projected gold per season, soldiers, initial Standing, extraordinary-tax
eligibility, and breakaway effect before confirmation. Customary, Scutage, Host Duty, and Liberties
therefore remain legible choices without requiring the player to infer results from
percentages. A direct-vassal row repeats the saved charter and tenure; the player's own
row separately reports any appointed tenure and the Estates' current aid and scutage.
When over the domain cap it also offers a review-first cleanup proposal that keeps the
capital and household home, omits reserved counties, prefers whole duchies, shows the exact
grants and land tax/levy estimate, and revalidates before applying. Vassal rows expose the
equivalent reservation from automatic Council appointment.
Manual **Grant Land** is a three-step modal: first choose a single county or complete held
duchy, then choose a generated loyal vassal or an eligible adult relative, and finally set
the service charter and tenure. Family rows name
the character, relationship, and age and expose the complete grant sentence as their
accessible label. Visible and browser Back from the recipient step restore the unchanged
land picker; Back from the terms step restores the recipient picker; canceling still returns
through the original Governance Domain context.
The generated option preserves the same path used by Domain Cleanup, while a family choice
is revalidated before mutation and returns to Governance after a successful grant.
Charter and tenure are labeled native-button groups whose current choices expose
`aria-pressed` and the standard selected action styling. Confirm and Back share the sticky
`.gm-footer`; only Confirm may mutate the grant. A technology-locked charter remains in
the group with its exact missing innovation. Tier-3+ players may use that locked row as a
technology-detail link; confirmation rechecks the same requirement.

The Town Council motion and Castellan petition dialogs likewise keep their substantive,
number-keyed choices in a scrolling `.gm-list` and **Not now** in the sticky footer. Because
choosing a motion or appointment tenure immediately rolls the result and spends the day,
both sheets initially focus the dialog container instead of preselecting the first action.

Political Blocs consumes `FB.politicalSummary` directly. Its full cards show
each archetype, leader and member-ruler links, influence, interests, current
motion reasons, locked or pledged posture, natural uncertainty, pledged
totals, and the strict-majority threshold. Network consumes that same summary
in compact rows and routes the row or section action back to Governance's
Political Blocs tab; it does not keep a second faction projection.
The Estates sheet replaces "Vote chance" with bloc totals and "Lobbying
strength." During a 90-day campaign it exposes one eligible lobbying button
per undecided bloc, then Call Vote and Withdraw controls. Campaign re-renders
replace the current modal view while preserving its existing history token,
so visible Back and browser Back return directly to Governance rather than to
a stale pre-campaign sheet. Political cards and motion rows stack on narrow
layouts, and lobbying controls retain the 44-pixel minimum touch target.
Technology-locked motions remain visible with the exact missing innovation and open its
detail sheet instead of beginning a campaign. Other unavailable motions keep their ordinary
disabled reason and selector behavior.
Opening or navigating Network, Governance, Estates, or any forecast consumes
no RNG and writes no simulation state.

Governance's Institution section also repeats every active modifier record from the
player's directly held counties. These are the same native-button chips as Land—not a
second inventory—and open the same accessible detail sheet with semantic source,
remaining days, exact effects, upkeep, expiry, and transfer behavior. Event choices
that grant or remove a modifier show exact adverse terms and qualitative favorable terms
before the choice; the receipt shows the resolved record exactly. Icons and color never
carry a consequence alone. County transfer automatically removes
the record from Governance while Land continues to show it on the selected county.

The Choice control retains only its label and authored flavor description; mechanical
consequence chips do not repeat beneath that text. On pointer/focus desktop the full
Guaranteed / If successful / If failed breakdown uses the shared accessible tooltip,
positioned beside the choice and clamped within the viewport, and there is no separate
Details button. Touch, tablet-width, and short layouts never depend on hover: a
question-mark control with an accessible Details label toggles that breakdown inline and
remains at least 44 pixels high. The event surface is an `aria-modal` dialog labelled by
its title and description, and expanded details remain inside the modal's scroll area.
Authored `showWhenTechLocked` choices stay in their original order with an exact requirement;
they are disabled below tier 3 and act only as technology-detail links for tier-3+ players.
Autoresolve excludes them until the technology is complete.

The Institution section and Network's Trade & Guild summary also open the shared
**Privileges & collective demands** sheet. Each contract names its holder, grantor,
territorial scope, exact authoritative-ledger effect, remaining or indefinite duration,
rights, exemptions, obligations, and revocation rule. A deliberate confirmation sheet
precedes unlawful early revocation and states the Common Voice, mistreatment, and organized
opposition consequences. Pending demands and bounded opposition remain visible below the
contract roll.

Guild officer/guildmaster and chartered Council confirmation campaigns use one election
sheet. It always shows the office, weighted electorate, fixed term, candidates, expected
support, campaign closing date, and pending result. One native-button tactic may be chosen;
the final result view records each constituency and the weighted tally. Career and Council
management expose active campaigns and preserve their originating Back route.

Work & Wealth includes **Petition for a guild monopoly** only for a Craft or Trade
guildmaster; its locked description exposes the exact missing technology, guild standing,
Standing with the grantor, grantor, cooldown, or occupied-slot condition. Rank & Realm includes
**Grant a guild monopoly…** for every baron and greater ruler. Its numbered,
keyboard-focusable profession picker previews Craft and Trade with the current
tier-scaled fee, tax, enterprise, duration, and Common Voice terms, then repeats all effects
in a confirmation sheet before spending the day.
Rank & Realm keeps the no-day-cost **Technology…** deed at landed rank and above; commoners
have no research controls (sovereigns direct projects, vassals may advocate
them), so the deed stays hidden below tier 3. `FB.techUiRelevant` is the shared
eligibility rule for every dedicated technology route: below tier 3 the
commitment row, deed, Land rating, Guide category and generated entries,
contextual detail links, and modal entry points are absent. A common household
still sees the exact named national prerequisite where it gates one of its
careers, standards, schools, or enterprises, because that text explains the
household choice without presenting an authority surface it cannot use. Its
mobile-safe full sheet names the effective sovereign nation and traditions, seasonal
rate, reserve, occupied slots, and active projects. The catalogue supports domain,
status, and text filters; Active/Available/Exposed/Completed/All views; and stable domain
sections rather than historical-era headings. Entries open keyboard-focusable details
with clickable prerequisite chips, attestation and
regional-adoption windows, historical context, effects, unlocks, exposure, and an exact
effective research cost and progress. The modal title is the sole icon/name heading;
exposure is presented as its percentage discount. Eligible and active projects put an
estimated number of research seasons beside the cost. The effects section names only concrete
gameplay changes—numeric modifiers and content actually gated by the technology—and is
omitted when there are none; historical practice/rule tags and per-entry bibliography stay
in the design/research documentation. Sovereigns receive start controls for free slots;
a successful start returns to the catalogue so its active-project strip and updated status
are immediately visible. The catalogue's Automatic research button selects manual,
cheapest-first, or a preferred domain and fills open slots as soon as an automatic mode
is chosen; the general Automation sheet exposes the same linked setting. An incomplete
inactive technology's detail sheet can reserve it from both automatic modes while retaining
the manual start action; reserved entries are marked in the catalogue. Eligible tier-3+
vassals receive advocacy controls. Foreign ruler sheets show the same nation's
completed/exposed totals and active projects read-only.

Help opens the offline **Guide**, a single `fullsheet-modal` whose native search field,
category selector, inline expandable entries, sticky footer, and normal modal history
remain usable by keyboard, touch, and `file://`. Opened from another dialog — a context
sheet or the menu — the guide also gains a **Back** button that restores that dialog
with its listeners intact (its live nodes move aside and return), while **Close**
always dismisses the guide outright rather than dropping to the menu. Expanding an
entry reveals its complete
guidance in place without replacing the search and result screen. Entries cover basics,
skills, resources,
roles, careers, family and inheritance scope, settlements, technology, travel, intrigue,
war, and government. The Technology category and its generated catalogue appear only
while the current protagonist is a landed ruler. Search indexes titles, aliases, key terms, and generated technology
effects/unlocks. Career and technology entries read live definitions; current
resource and settlement entries read live state. Self skill links close back to the
existing Self panel or phone drawer; character-sheet links restore their source modal.
Self/character skills, Work,
Technology, settlement, travel, inheritance, Governance, and the conquest picker
deep-link to the relevant entry. The War entry explains recognized claims, explicit
aggression costs, siege requirements, and the difference between field victory and
territorial conquest. Every expanded entry ends with a **More info** link to the
corresponding GitHub player, design, or research-document heading; document-root links are
not used. Fixed topics and generated skill, role, and career entries resolve to focused
sections, while generated technology entries select the catalogue heading for their
authored domain. These external links are optional; searching and reading the complete
in-game Guide remains offline-capable.

`player.roleOrientationsSeen` is a retired save field: the one-time per-save
orientation sheets for the current social tier and religious vocation/office were
dropped in favor of the coachmark lessons, and the same complete orientation
remains available as an inline Guide entry. Old saves may still carry the field;
nothing reads it now.

Overland movement and sea-crossing speed use distinct effect labels, and a transport-tier
technology states its concrete men-per-crossing-cycle capacity. A manual host order uses
the same weighted route assigned to the army to report destination ETA, water-crossing
count, and the limiting crossing's capacity and cycles. Pointer and keyboard orders share
that path. When a moving host is selected, Land reports the immediate leg and remaining
days as either marching or preparing a crossing; the marker remains on the departure
county. These long feedback lines wrap naturally in narrow layouts and add no fixed-width
controls.
Independent counts and higher also get a compact political-attention summary above those
groups. The Foreign Policy deed opens a numbered neighboring-court list and then numbered
Improve/Neutral/Provoke controls; both use the standard keyboard-focusable, mobile
bottom-sheet modal. Foreign province panels link their sovereign to the ruler sheet, and
both views show Standing and the current direction.

Semantic plot targets use the same identity-card convention. Realm targets show arms,
ruler, Standing, pact/alliance status, and current foreign-policy direction; character
targets show a portrait and role context. The picker submits the full canonical target
context rather than a display label or list index, so a saved plot continues to point at
the same realm, character, institution, or contract after reload.
The discovery modal repeats that target label and reuses the same character or realm card
when one exists, making the endangered relationship explicit before the player abandons,
contains, or rushes the scheme.
The Estates sheet keeps the ordinary assembly voice visible and, when obligation evidence
matches the current liege contract, adds the higher redress-only percentage beside it and
uses that exact chance in the motion preview.

Every living AI ruler sheet exposes **Cultivate relationship…** and **Offer a gift…**.
Cultivation materializes that ruler only when chosen and opens the ordinary capital-visit
review; once materialized, the ruler identity card and **Open full character sheet**
action expose applicable friendship, rivalry, courtship, marriage, and spouse actions.
Both sheets route gifts back through the
ruler picker, so its numbered cash choice uses the rank price, exact armory influence,
Standing, and the ruler-generation cooldown rather than the ordinary five-gold path.
Foreign-sovereign choices preview courier time and later show outbound/return ETA. The
Royal Council opens this same picker for seated vassals. Its Back/Close behavior uses
generic-modal history, and all choices are native buttons, retaining number-key selection,
Tab/Enter/Space, and mobile bottom-sheet navigation.

The contextual **Network** panel (`N`) answers who is tied to the current household and
what that relationship does. Its five sections are Household (resident family,
capacity-limited retainers, office, pay, work assignment, and maintained-standard
summary/upkeep), Connections (canonical
friend, cultivated contacts, rival, suitor, priest, and lord), Trade & Guild (career,
rank, standing, exact income modifier, enterprises, partnerships, positions, bounded
guild commissions, and the shared privilege roll), Political Blocs, and Realm. For a qualified territorial ruler,
Political Blocs is the compact shared-court summary and Realm contains one
Governance route, foreign ties, and the computed levy ledger rather than duplicating
liege, vassal, Estates, or Council prose. Other protagonists retain the compact legacy
relationship summary. A Town Councilman sees the seat's county, active ordinance and
expiry, and next available session in this Realm section; these are reads of the local
office record and consume no RNG. Empty sections explain what is absent rather than inventing
placeholder people.

Work & Enterprises and Network share a render-only large-list grammar. Every semantic
section is a native, independently collapsible button with a total and a needs-attention
count. Rows are ordered by attention state, stable role/state priority, their existing
meaningful order, and stable identity; changing income, Standing, or another daily number
does not reorder otherwise equivalent rows. Disclosure, focus, and scroll, plus Work's
filters and search, are in-memory UI state only. They consume no RNG and never enter a save.

The shared large-list threshold is **12 total rows per surface**. Above it, each section
initially shows every needs-attention row plus **5 routine rows**. **Show all {count}**
reveals the remaining routine rows in that section. Work also exposes an explicitly labeled
literal local search and All, Needs attention, Assigned, Staffed, Idle, and Unavailable
filters; search and non-All filters show every match rather than applying the routine
budget. Network omits this toolbar so its five sections remain the navigation. Work
distinguishes no records from a filter/search with no matches; Network simply explains an
empty section. Hidden rows use the native `hidden` state, receive no positional shortcut,
and leave the accessibility tree.

Work adds a session-only enterprise view on top of that grammar. Its compact default
keeps idle and blocked property before staffed property; alternate deterministic sorts
cover localized name, acquisition order, authored base value, live yield, settlement,
and staffing state. Enterprises may remain in one section or be grouped by Farming,
Craft, and Trade profession or by exact derived settlement. The selected view survives
opening and returning from an enterprise. Household Plan consumes the same sorted
enterprise records for assignment labels and exposes the shared order selector, but it
does not pretend its person rows can be grouped as properties.

Work keeps Household work and Family enterprises separate. Household rows label settled
careers/offices, genuinely available career choices, former callings, and authoritative
unavailability without treating every unassigned character as a problem. Enterprise rows
are exact uid-backed instances ordered idle/actionable before staffed; they show worker,
lock, settlement, and live yield. The summary reports owned, staffed, idle, blocked, and
approximate seasonal yield totals, while **Staff all idle enterprises…** remains the
explicit bounded bulk review.

Network keeps Household, Connections, Trade & Guild, Political Blocs, and Realm
distinct. A person or realm
appears once within a section with combined role labels, but may still appear in another
section for a genuinely different context. Character and ruler rows open the consolidated
authoritative cards; Governance, Household Plan, Council, guild favors, vassal favors, and
other focused management routes remain separate. Section attention covers active
commitments, warnings, opportunities, missed retainer pay, and vacancies even when routine
context is collapsed. On desktop, `1`-`5` select those sections in order, opening a closed
section, scrolling its heading to the top, and focusing and highlighting it. Pressing the
active section's number again collapses it; its next press reopens it. The active
section assigns `Q W E / A S D / Z X C`, then their Shift variants, to its first 18 visible
management actions, matching Deeds. Character, ruler, and political-bloc rows that only
open an information sheet never receive a letter shortcut. Household is active by default
for a newly opened life; touch layouts show no keyboard selection or badges.

Network → Household also opens the responsive **Household Plan**. Its desktop modal uses a
wide seven-column table ordered as household head, resident family, then paid retainers.
On narrow or short layouts, each person becomes a stacked card and every cell repeats its
localized column label. Education, instruction, work/standing, assignment, match, and
equipment summaries are derived from their owning APIs; actionable cells are native
buttons that retain modal focus, number shortcuts, Tab/Enter/Space, minimum touch sizes,
and browser-history Back. Picker cancellation and no-day changes re-render the plan, while
day-spending career, retainer, enterprise-purchase, religious-office, and match choices
advance the day and then rebuild the originating plan or person manager beneath any queued
event. Its bottom-pinned footer is outside the ledger's own scroll pane and also offers the
enterprise-staffing preview
whenever an enterprise is idle, and a successful no-day apply returns to this authoritative
table rather than the intermediate Work & Enterprises sheet.

An **Education Policy** summary and native management button sit above the Household Plan
ledger. Its keyboard/mobile-safe flow uses a native focus select, instruction checkbox,
and non-negative number input, then requires a preview before saving. The preview names
every currently affected eligible child and shows the proposed focus, instruction,
projected yearly chance, per-child seasonal fee, and any institutional mortality warning.
It explicitly states that existing choices stay unchanged, the cap is per child, and no
coin is reserved. Education and instruction cells label policy choices, manual overrides,
unrecorded choices, and instruction waiting for a focus. Both detailed pickers retain a
Follow household policy action which clears and reapplies only that picker’s dimension.
Both pickers also expose a whole-student manual-management reservation. Reserved students
are omitted from education-policy previews and application until the reservation is removed;
**Follow household policy** removes it and immediately reapplies that picker’s dimension.

A separate **Descendant Match Assistant** summary and native management button sit above
the same ledger. Its keyboard/mobile-safe policy form exposes an enable checkbox, station
select, and optional non-negative caps for dowry, immediate gold, and required prestige,
then requires a preview before saving. The preview shows every currently eligible
resident child or grandchild, the recommended family (or the absence of one), station,
age, dowry, immediate gold, and prestige requirement. It explicitly states that no pledge,
resource spend, or day advance occurs. Recommended match cells name the candidate and
terms; their ordinary match picker puts that candidate first with a visible marker while
retaining every manual family choice.
The match picker exposes a whole-descendant manual-management reservation. It removes an
existing recommendation and omits that descendant from future assistant passes without
removing their candidates or manual pledge choices.

Trade & Guild begins with explicit incoming and outgoing monopoly slots. Active rows name
the profession, issuer or abstract recipient, optional household advocate, grantor tier,
enterprise strength, tax effect, scope, and exact days remaining; empty slots say None.
The panel also states the +50% overlap cap and that active charters have no renewal or
early-revocation control.

Connections begins with the same personal-attention summary as Deeds. The item card's
compatibility recipient picker still shows exact +Standing and disables a person for the
remaining shared cooldown; character and ruler sheets are the primary unified gifting
surface. All assignment, friendship, courtship, and gift buttons are native focusable
controls, so the same labels and disabled state remain available to keyboard and mobile
users.

The panel summarizes other systems and links to their focused controls. Character sheets
remain the place to call a friend or manage one retainer; Work & Enterprises remains the
staffing surface; Royal Council remains the crown-office manager. Retainer hire,
dismissal, and friendship replacement use the standard focusable modal and confirmation
patterns. Guild and vassal favors are direct focusable Network actions whose buttons state
their full cost and duration before activation. Network is hidden in observe mode alongside
other protagonist-only panels.

The **Take to the road…** deed opens a purpose dialog filtered by the traveler’s
rank, then a map picker
with marked valid destinations and a synchronized, focusable destination list.
Map taps and list buttons select the same county and preview the settled-only
route; the final confirmation states county legs, days each way, and exact cost.
It also states the 90-day destination stay and whether this character’s one lifetime
permanent move remains available. Freeholders and gentry see every ordinary
purpose; barons and higher see pilgrimage and study, while relationship travel
begins from a named character sheet. Ruler reviews describe guest residence and
never expose permanent-settlement controls.
The Trade Venture purpose and Coin & Credit’s **Form your own venture…** action share
that picker. Their setup chooses 10/20/50 gold, lists only reachable development-4+
markets, and previews stake, transport-adjusted route overhead, road time, exact
dispatch date, and cautious/bold loss risk before any payment. Dispatch controls remain
available during the personal travel cooldown; the accompanied option displays its
ordinary travel/cooldown rejection in place.
The picker pauses time, supports the normal map keyboard navigation, number keys,
Tab, Enter, and Escape, and becomes a bottom sheet on narrow screens. During a
journey the map keeps the gold household flag at home, draws a separate traveler
compass and remaining route, and the Deeds panel replaces focuses/actions with
current journey status and **Turn back toward home**. At the destination the status
also counts days into the visit, guest residence, or local stay. Return unlocks
after 90 days; for freeholders and gentry, a year and four work stories unlock
**Settle here permanently…**, whose confirmation names the destination,
preserved property/culture/faith, and the once-per-character-life limit.

A tier-3+ courtship-visit review also previews the possible post-wedding
residence choice. If that wedding occurs at the destination, the event flow
immediately opens a non-dismissable three-action generic modal: remain as the
abdicated protagonist, continue as the live lawful heir, or decide later.
Unavailable abdication paths stay visible with localized reasons; the first
enabled native button receives focus and all three choices receive the ordinary
number-key hints and mobile bottom-sheet layout. Deferral leaves **Stay after
marriage…** in Life & Family until the journey ends, so keyboard and touch users
can reopen the same live-validated decision.

Because the event modal opens as a bottom sheet under the thumb, its choice buttons ignore
input for 350 ms after they render (`EVENT_INPUT_GUARD_MS` in `ui_modals.js`, touch only, via
`armEventGuard`/`eventInputGuarded`): a tap already travelling down toward the fixed time bar
must not pick an outcome by accident, while a deliberate next tap should feel immediate. The
guard rearms for each queued event. Autoresolved events render no buttons, so they bypass
the guard naturally; question-mark detail controls never resolve and need no guard. Chance choices no
longer create a blocking outcome screen: one receipt toast appears for six seconds above
the event layer in the map's bottom-left toast region, and the queue advances immediately.
It remains the bottom-most toast when tutorial notices stack above it and stays within the
map on narrow layouts, including throughout its fade-in, so it cannot cover panel action
buttons or climb into the top bar.
The toast replaces an older receipt instead of stacking; when no event blocks input,
activating it opens the Chronicle's Choices filter. Exceptional choices that automation
intentionally shows remain protected.

The Chronicle has session-local **All / Choices / News** filters. Choices are typed event
receipts with rich exact-change chips; News includes legacy untyped entries and ordinary
notices. Each filter renders its newest 80 matches while saved history retains the existing
300-entry cap. Recorded-choice cards use a generous inner inset to separate their date, title,
selected option, outcome, and impact chips from the card border. The incremental prepend cache
includes the active filter, so switching views cannot reuse markup from another category.

Related: [items.md](items.md) for the item card's hover/tap duality.

## Character and realm interaction cards

One target now has one detail-and-action surface. Character, realm, and
political-ruler rows open the same character sheet; a reigning ruler merges
their realm and personal actions there. It uses the shared interaction-card
renderer and the fixed group order: current
commitments, relationship/attention, gifts, travel, diplomacy, feudal actions,
hostility/war, then focused management. Empty groups disappear, while a
progression-relevant blocked action remains visible with its authoritative
reason.

Card builders are read-only derived projections. They may call status and
preview adapters but never assign attention, spend resources or days,
materialize a character, start travel, send an envoy, or declare war.
`interactionActionRow` renders every action as a native button with a stable
semantic id and accessible name. Its face keeps only a Deeds-sized primary
label; desktop number hints sit immediately after that label. Detail text states
exact cost, duration, Standing effect, cooldown, and replacement consequence
supplied by the owning system, using the shared hover/focus tooltip on roomy
desktop layouts and the shared `?` disclosure on touch, narrow, or short layouts.
An unavailable row shows its authoritative blocking reason alone, rather than
repeating its normal detail and consequence text. Clicking routes
to the existing action or confirmation, which
revalidates its own gate.

Focused household management is also derived from the shared authority boundary.
`FB.isExternalHouseholdAuthority` suppresses equipment, career, and prospective-retainer
actions for a reigning ruler or local lord even when that character is a spouse or cultivated
contact; the owning mutations revalidate the same exclusion.

Every living AI reigning ruler has a materialized character record. Their
single character sheet carries a bounded court strip for the current consort
and displayed heirs; each court member is a native character-sheet button, and
all faces use the shared portrait pipeline. A crest-only realm fallback remains
only for malformed or temporarily incomplete state. Realm office, faith,
capital, succession, courier gifts, diplomacy, feudal dealings, and war appear
alongside personal traits, courtship, rivalry, and household dealings. Typed
Standing is shared. War notices render both realm names as links: in Land they
open the named ruler's character sheet, while a ruler-sheet link opens the
opposing ruler or returns to the current realm's capital county.

Modal return context records only the originating view, not simulation state.
Governance, Council, Estates, Household Plan, and card-to-card routes reconstruct the exact
source on visible/browser Back and after an in-scope completed management action; Network,
Land, and Deeds remain beneath an ordinary overlay and are revealed by Close. Focused gift,
visit, foreign-policy, envoy,
alliance, and war sheets participate in that same history contract. Both card
types use the full-sheet mobile layout, sticky footer, focus containment,
number-key action behavior, and expansion-safe text wrapping.
A gift opened from a unified ruler character sheet returns to that sheet without
inserting a duplicate character-card entry before its original source surface.

## Great holy-war presentation

An active call adds a compact Deeds summary and a focusable campaign action. The
full-sheet campaign dialog names caller, military leader, schedule, camp strengths,
resolve, both participant lists, every frozen objective and occupation/siege state,
and the protagonist's vow progress, desire, occupation evidence, contribution, share,
and projected weighted claim. A player religious head gets a target picker. Joining is
a numbered, keyboard/mobile-safe sequence for four/eight/twelve seasons, desire, exact
duchy/county where needed, optional eligible beneficiary, and final review. Renewal and
withdrawal state the inherited choice or exact fulfilled/broken-vow costs.

An attacker victory opens one non-dismissable full-sheet council. It shows the current
asset, ordered claimant weights, all six basis scores, exact press/object odds and term
cost, two-point standing, blessing and next-claim-boost state, prior awards, and every
available move. `bless` redraws the same asset without resolving it; other moves advance
to the next asset. The last step shows the complete settlement summary. A personal,
beneficiary-free territorial grant adds its existing final accept/decline decision and
explains founding, relocation, attachment, or crown union. Time stays paused whenever
the player is seated, claiming, or deciding that grant; observe and AI-only cases
resolve automatically.

The map draws target rings, temporary occupation color, and siege arcs underneath
field hosts. The Land panel repeats the selected objective's occupation and progress,
so the information remains accessible without relying on canvas color. All dialogs
use ordinary action buttons, number-key ordering, focus management, Escape/history
rules, and the existing mobile bottom-sheet layout.

Fortified holy-war objectives additionally name the fort, total occupation-day target,
minimum besieger strength, and seasonal attrition. Ordinary war summaries give the
snapshotted step count and exact shortage, while map-order feedback distinguishes a host
that will stop at a strongpoint from one whose weighted route bypasses it.

## Settlement markers and the settlement sheet

The canvas adds a settlement layer in screen space between the selection overlay and
the army/objective/traveler passes. The layer is reserved for close inspection: below
zoom 6 there is no settlement rendering at all, so ordinary panning and zooming never
pays for it. From zoom 6, county heads and authored cities show as shape-coded
markers — circle village, square town, diamond city — never by color alone. From zoom
12, every currently visible settlement of a county draws as its procedural emblem
(`js/siteart.js`: a deterministic cottage cluster, towered town, or walled city
generated from the physical site slug, one fixed canvas cached per rank/site and
scaled to the zoom at draw), sized in css pixels and growing with zoom up to a cap,
with a heavier ring spaced clear of the emblem marking the county head (the county
seat); the map zooms to 80x so dense historical
clusters separate. Settlement name labels live only in this emblem band, so the
intermediate band stays bare markers. From zoom 6 the backdrop cross-fades from the
noisy base raster into a flat sibling — one solid tone per county, no baked
borders — and county boundaries draw as an anti-aliased vector pass that cuts the
raster staircase into smooth diagonals with the same demesne/realm/sovereign
strength graduation, so the close-up reads crisp rather than blocky or blurred.

A fort adds a shape-coded shield badge with one to four internal marks over its existing
settlement emblem; construction adds a crossed corner. Neither meaning depends on color,
and the badge does not change cached site art. The settlement sheet shows current and
target tier, project dates, upfront/no-refund terms, upkeep, local defense, garrison and
field burden, movement control, siege minimum/attrition, and the next sequential tier.
Owned sheets provide keyboard-numbered, mobile-size project and demolition controls;
foreign sheets remain read-only. A locked tier stays visible and its action opens the
exact technology detail.

Labels reject
deterministically on rectangle overlap in priority order (kind, head status,
authored status, province/index), each name label sits below its emblem and moves
above only under collision pressure, drawn emblems
count as obstacles for later settlement and county labels, and a rejected label
keeps its marker and tap target. Only markers drawn on the last frame are hit targets, in a
reused `FB.map.visibleSites` list cleared on bookmark switches; the named hit radii
(7 mouse, 15 touch/pen screen px) are a floor that widens to the drawn emblem's
half-size, with overlap resolved by nearest center, then that same priority.

An ordinary marker tap selects the parent county and opens the settlement sheet for
the exact slot. Every explicit county-targeting mode — new-game province picking, the
travel picker, army selection and march orders — keeps receiving the parent county, so
a marker never blocks the county beneath it; keyboard province navigation stays
province-based. `UI.showSettlement(pid, index)` is universal: it names the county,
holder, localized kind, and development explanation, lists the buildings and ruins of
the exact slot, and shows matching household plots, manor, and enterprises when
present. Each building, ruin, or fort renders as a compact card — icon, name, and a
one-line effect — with the full audit table and description behind a per-card
details disclosure (a hover/focus tooltip on desktop, an inline tap toggle
elsewhere — one or the other per layout, per the tooltip convention above), and demolition rides inside the owned card as an icon button.
Authorization lives inside the sheet, so foreign and non-demesne settlements
are read-only while a valid demesne settlement keeps construction and demolition.

## Localization

Settings exposes English plus French, German, Italian, and Spanish as AI-translated Preview
locales. The preference is browser-local and takes effect after a reload. The selected
query-free locale script is loaded before final catalog validation; a missing, stale, or
invalid catalog falls back to English and records a diagnostic instead of blocking boot.
Settings is reachable from both the title screen and the in-game menu. Changing language
during a life autosaves before reloading; observe mode remains intentionally unsaved.

Authored static controls use `data-i18n`, `data-i18n-title`, and `data-i18n-aria-label`.
Completed modal and panel trees may receive an exact-source localization pass for legacy
markup, but localization must never replace substrings or fragments inside mixed text.
Dynamic UI uses message keys or localized parts plus proper names. Rendered messages are
plain text and substitutions are escaped before insertion into HTML. Keyboard hint badges
(`.keyhint`) label physical keys, so they are authored as literals and never localized; the
time-bar badges (`Space`/`F`/`V`) are re-emitted on every `refreshNow`, so a locale reload or
any DOM re-render cannot leave them stripped.

New UI must tolerate longer translations, keep translated labels out of fixed-width
assumptions, preserve keyboard focus and accessible names, and remain usable in the mobile
bottom-sheet layouts. The pseudo-locale is the development check for expansion and missed
routing.

**Heraldry is procedural** (`FB.drawCrest` in js/util.js, seeded by house name or realm id —
the same seed gives the same shield everywhere, from the topbar to the liege sheet).
Character cards carry the character's house arms and the arms of the realm holding their
home county (`FB.homeOf` resolves the county). `FB.paintFaces` also paints every
`canvas.crest[data-seed]` under its root, so any panel that renders faces gets crests for
free.

**Temporary modifiers use one accessible chip pattern.** The selected Land county lists
its active county records, and the great-holy-war service section lists the
protagonist's campaign records. Each native-button chip exposes localized icon, name,
and remaining duration. Pointer hover shows description/effects; click, tap, Enter, or
Space opens the same information in a focus-managed modal. County chips remain visible
when ownership changes. See [modifiers.md](modifiers.md).

**Hostile intrigue remains in Deeds.** Begin a Plot opens the ordinary plot list; a
hostile choice then uses exact target, method, optional accomplice, and review sheets.
The target sheet groups named people by rulers/officeholders, household, and other realm
residents, groups sabotage counties by own realm/foreign border, and supplies a live
search over names, station, county, and realm. Every named target and accomplice keeps an
identity card. Method and review sheets disclose exact success, estimated duration,
up-front cost, annual exposure, acceptance, and refusal-leak chances before mutation.

The Ongoing Commitments card and Intrigue Affairs deed expose the active scheme, exact
target/method progress, captive, player captivity, and leverage actions without adding a
tab. Eligible character sheets add **Plot against…**, including kin, spouses, and minors;
the route still applies the authoritative target gates. All sheets use generic-modal
focus, keyboard action ordering, nested history Back, minimum touch targets, and mobile
bottom-sheet behavior. UI strings use `FB.T` or localized data fields, while saved
contexts keep ids and numbers only.

**Numeric and Decimal Formatting Standards.**
- *Whole Numbers by Default*: Never display raw floating-point decimals to players. All general gameplay quantities — including troops, hosts, levies, population counts, opinion, standing, prestige, piety, development scores, distances, and percentages — must be rounded to whole integers (`Math.round`, `Math.floor`, or `Math.ceil`).
- *Strict Decimal Limits for Finances*: Decimals are restricted strictly to financial, coinage, and economic interfaces where sub-unit fractions are required for comprehension (such as fine interest rates, per-season coin rates, or investment dividends). In these exceptional cases, values must be strictly capped and formatted to at most **2 decimal places** (`.toFixed(2)` or `Math.round(n * 100) / 100`).
- *Realm Host Capacity Formatting*: Realm host displays show current available forces versus maximum capacity (`~{current}/{max} men`) when recovering or rearming across the rearm window. When fully mustered at maximum strength, the display simplifies to `~{max} men`. The player's own realm card shows the real muster composition (`FB.playerLevy` current against the `FB.playerMaxLevy` full-population baseline), matching muster previews and expedition reports; AI realms show the dev-and-population levy estimate. Maximum capacity counts the overpopulation bonus (the population factor above its baseline, capped at ×1.5), so a thriving county's realm host never reads below its province levy; the fraction appears only for genuine deficits — the rearm window or a population fallen below baseline.
