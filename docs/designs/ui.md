# UI: keyboard & mobile

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

**Keyboard support is a requirement** (`js/keys.js` + focus management in `ui.js`): the game
must stay fully playable mouse-free on desktop. New buttons/dialogs need to stay reachable —
modals autofocus their first control, list dialogs get 1–9 / ⇧1–⇧9 `keyhint` badges via
`UI.openModal` (`UI.hintFor`; Shift+digit reaches items 10–18, resolved by physical key
code in keys.js), and dialogs that must not be Esc-dismissed pass `{dismissable:false}`.
Tab and Shift+Tab wrap between the first and last focusable controls of an open generic
dialog, so keyboard focus cannot move into the obscured game until the dialog closes.
Dialogs whose first choice must be deliberate focus the dialog container on entry rather
than preselecting a choice; the first Tab still enters the dialog's controls.
Closing a generic dialog restores its activating control after keyboard or pointer
activation, including browsers that do not focus a button when it is clicked.
Desktop panel tabs render the matching label letter as a compact keycap (`[S]elf`, `[K]in`,
`[D]eeds`, `[L]and`, `[N]etwork`, `[C]hronicle`) rather than repeating it in the remaining
text; narrow or short non-desktop layouts and coarse-pointer touch layouts keep the ordinary
localized labels because keyboard hints do not apply.
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

**Mobile layout lives in css/style.css.** `#panels` wraps the two side panels — invisible
on desktop (`display:contents`). On phones the Deeds/Land/Chronicle panel takes the full
width and Self/Kin becomes a drawer (`#left` fixed, shown by `body.showself` — toggled in
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
The play/pause button shows only ▶/❚❚ and its `Space` badge — the running date is not
repeated there, so the button never changes width as the days flow.

Mobile-layout UI states mirror their navigation in the browser's same-document history:
switches among Deeds/Land/Network/Chronicle, the Self/Kin drawer, generic dialogs, selected
nested dialog views, the travel picker, and the equipment-slot overlay each add a same-URL
entry. Browser/device Back unwinds one state at a time, returning through previously selected
panels before leaving the game, and visible Close/Back controls consume the same owned entry
so dead entries do not accumulate. This uses only the game's own frame history and never
reaches into an embed's parent page. Android consumes physical Back to leave itch's
browser-owned iframe fullscreen before it traverses that history, so nested equipment
pickers show a sticky in-game Back control on embedded mobile layouts; it invokes the same
owned history entry and keeps fullscreen active. Generic dialogs do not add a shared header
control and instead rely on their modal-specific visible controls. Direct play on
`play.fallowborn.com` continues to use device Back normally. Entries carry UI descriptors
only; gameplay actions and mandatory event decisions are never made undoable. If the History
API is unavailable or rejects an entry, all existing visible controls remain the fallback.

Every generic modal uses a flex-column card with a scrolling `#gm-body` and a sticky,
centered `.gm-footer`, so its terminal controls remain at the bottom middle while long
content scrolls behind them. Two families break only the bottom-sheet framing: the Changelog
(`.changelog-modal`) stays an evenly margined centered panel, while the Menu, Automation,
and end-game dialogs (`.fullsheet-modal`) fill the whole screen edge to edge.
Action buttons never flex-shrink inside these columns, so wrapped descriptions and expanded
translations remain inside their button borders and contribute their full height to scrolling.
Ordinary modals (including event, settlement, and resource dialogs), the nested equipment
picker, and the travel destination picker float above the device's bottom safe area with a
complete rounded frame. Only deliberate full-screen sheets and the Self/Kin drawer meet the
bottom edge.
Desktop scroll containers share narrow, rounded bronze thumbs over transparent tracks so
panels, sheets, lists, and modals retain the parchment styling without prominent scrollbars.
Touch devices keep their platform-native overlay scrolling.
The title screen scales its crest, heading, button height, gaps, and footer spacing against
viewport height so the full menu fits common standalone and itch iframe heights; genuinely
short viewports retain `.screen` scrolling as the fallback.

Surface-specific browser behavior is centralized in `FB.platform`, initialized by
`js/util.js` before boot. Its current `isPlay` flag is true only for the HTTPS
`play.fallowborn.com` origin; `file://`, local test servers, and itch-owned embeds remain false.
Only the play surface injects web-app manifest metadata and registers the offline worker. The
title-screen offline status is an `aria-live` region that stays absent from layout until a worker
actually controls the page, at which point it shows localized **Available offline** copy. A
rendered page alone is never treated as proof that its complete bundle was cached.

New Game proceeds through bookmark → social scenario → province → character. Bookmark
cards use the same responsive grid and native-button keyboard behavior as scenario
cards. Selecting one activates its world before the province picker is shown, so the
preview owner colors, county details, headings, era help, Observe mode, and character
birth year all read the same active definition. Tapping a settled birthplace or choosing
**Random Province** proceeds directly to character creation; there is no redundant Next
step. Returning from scenarios goes back to the bookmark list without wiring another set
of map listeners.

Hover-only affordances need a tap path (item chips toast their description).
The Work & Enterprises sheet treats a tier-3+ protagonist's career as a read-only
former calling. Career changes, guild steps, and personal enterprise assignment are
removed while household occupations, religious-office advancement, and business
staffing remain available. Each staffed enterprise has a saved **Lock this worker to
this enterprise** checkbox; locked pairings are marked in both this sheet and Household
Plan. Whenever an owned enterprise is idle, **Staff all idle enterprisesâ€¦** opens a
no-day static review of the maximum-yield result across all unlocked assignments. The
review shows current/proposed totals, every kept or changed pairing, and every unresolved
enterprise with its eligibility, lock-contention, or higher-yield-allocation reason.
Apply is enabled only for a changed plan, revalidates stale reviews, and never spends
time or money. Back remains available in the sticky footer; applying from Household Plan
returns to its refreshed overview. When none is idle, the entry point is replaced by an
all-staffed hint.
The building deed's county ledger stays open after **Raise Next**, so repeated construction
does not traverse province and settlement dialogs for every work. Its nine building rows
retain the modal's 1–9 keyboard hints, show the exact live price, and explicitly warn that
repeat copies in one county become 50% dearer each time. A sticky native county selector stays
in reach above the scrolling ledger, including on narrow touch layouts, and switches directly
among all held counties. Exact settlement placement and permanent demolition remain available
from the Land-tab settlement view. Province settlement lists wrap between places, never inside
a settlement name, so each link stays readable.
The Land tab's **Notable folk** list is ruler-first: it shows the county holder, all of
that holder's direct vassal realms, then every liege through the sovereign, without a
row cap or duplicates. Every entry is a native focusable row with the reigning
character's procedural portrait. AI entries open the realm-ruler sheet; a protagonist
entry opens the character sheet. Each row states realm, political relationship, age,
Martial, and the player-relative Standing. Generated local characters appear only as a
defensive fallback when no political ruler can be resolved.
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
treasures, station upkeep, resident-family provisions, maintained standards, wartime
necessities, raised-host logistics by component, and school fees), tap or click opens
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
that total. These surfaces read `FB.playerMusterUpkeepParts` and
`FB.playerHostUpkeepParts`, so great levies, reinforcements, casualties, mercenary
companies, disbanding, and re-raising stay in agreement with the seasonal gold ledger.

**Managed household sheets keep compact bust portraits and open equipment separately.**
The Self sheet and the sheets for living spouses, resident unmarried children and
grandchildren, and paid retainers each offer an **Equip items…** button. It opens a
dedicated modal with one deterministic full-body
figure and eight native slot buttons in a two-column grid. The modal is centered on desktop
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
effects, while click, tap, Enter, or Space opens the same detail modal. Unclassed mod
traits appear under Other. Titles and Possessions use collapsed-by-default,
counted accordion rows matching the Deeds group controls so large realms and armories do
not dominate the Self panel. Active maintained standards appear in the livelihood summary
as compact icons with numeric levels; dormant purchased levels stay off that active row.
The full-name heading leads the mobile/short-screen drawer,
where that drawer covers the topbar, and is hidden in the desktop panel because the
persistent topbar already names the character. On desktop, a subtle divider separates
Traits from the rank, age, culture, faith, and health details below.
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
The mechanically active totals from worn items appear beneath the figure, including an
explicit empty state. On narrow phones the figure and bonus summary stack above the same
two-column grid.

The item card reuses the isolated procedural object renderer and reports exact quality,
quality-adjusted effects, value, current wearer, pledge state, and valid equip/unequip,
gift, and sale actions. Family/event/topbar cards retain compact bust portraits, with only
readable equipment cues such as a helmet, pendant, crown, or armor edge. The succession
modal is the other full-body surface: it paints the frozen final loadout beside the
“Worn at death” list before any heir may be selected.

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
Wide full sheets use a compact comparison grid, ordinary dialogs use two
columns, and narrow layouts stack every labeled field. Shared presentation
does not create a common asset record or mutation path.

The Deeds panel begins with the responsive **Ongoing commitments** ledger
rendered by `UI.ongoingCommitmentsHtml`. Its title is an accessible
collapse/expand button, and the browser-local collapsed state (`fb_ui`) changes
only its presentation. On full desktop layouts the ledger omits the redundant
daily-focus row; on compact layouts that row appears first and routes to the
top of the combined focus list. When expanded it shows the personal-attention
assignment and national research projects/policy;
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
fixed daily rate, and estimated time to +40. Confirming assigns attention and
departs as one operation. The assigned person's sheet repeats their Standing,
fixed daily rate, and estimated active days to +40. **Call
friend** and **Propose marriage** remain visibly disabled below the shared threshold.
**Offer a gift…** opens a numbered cash-and-armory picker. Cash and every exact armory
object show their +Standing value and either readiness or recipient-specific days remaining
on the shared cash/item gift cooldown. Equipped and pledged objects remain visible but
disabled with the blocking reason. Managed household recipients see cash only and an
explanation that their objects remain under shared-armory management. A cross-sovereign
recipient instead shows the frozen courier days and explains that Standing/cooldown begin
on arrival. While a delivery is outbound or returning, both the character button and
picker show its destination, phase, and remaining ETA and disable another gift.

All counterpart sheets use the shared Standing presentation: a clamped signed value,
the Hostile/Guarded/Neutral/Favorable/Warm band, and the same positive/neutral/negative
colors. Character and ruler sheets add a context note explaining whether the score
affects personal, feudal, or diplomatic consequences. A materialized ruler resolves
through the realm target, so the character sheet, realm sheet, Council, Estates, and
gift interfaces cannot display different values.

The no-day-cost **Coin & Credit** deed opens a full-screen-capable Finance sheet. Active
obligations are ordered by deadline before metrics so the urgent contract remains first on
a narrow phone. The sheet shows purse, price index, last movement and purse adjustment,
reliable net income, credit capacity and defaults, exact loan faces/current values/dates,
pledges, and investment maturities. Passive partnerships are labeled as backing another
merchant. A separate self-founded venture section shows its destination, strategy, stake,
separately paid overhead, and exact resolution date, and opens the shared stake/market
setup. Borrowing, investment, debasement, and recoinage use a
final confirmation whose first action receives focus; every term and default consequence is
visible above the buttons. The money source sheet also carries a non-recurring **Coin and
prices this year** line.

The Deeds panel uses accessible accordion groups for Work & Wealth, Life & Family,
Faith & Community, Rank & Realm, and War & Diplomacy. Group headers are real buttons
with `aria-expanded`; closed actions are not rendered, so number-key selection can never
activate an invisible deed. Every available daily focus appears together in one block
above the category accordions; the accordions split and count only deeds by category.
The promotion-path note is new-player guidance rather than a mechanic. Settings offers
a browser-local **Hide beginner hints** preference (`fb_ui`) so experienced players can
remove it without changing progression or available deeds. The preference deliberately
covers future beginner guidance as that layer grows.
The Self sheet's faith block names the live religious head or the number of days its
office has been vacant, and states excommunication separately from the trait chip.
Faith & Community contains the contextual absolution, Papal-restoration, and
Caliphate-claim deeds. Their resource/land consequences use ordinary focusable
confirmation sheets. The occupied Caliphate deed remains visible but disabled while
the player realm is already at war or committed to a great holy war, and its final
confirmation revalidates the live succession cause. A Catholic Papal conquest is marked as sacrilege in the war list
and uses its own second confirmation; no penalty is applied until that final button.
A separate personal-attention summary names the assigned character, current Standing, fixed
daily rate, estimated active days to the relationship threshold, and whether progress is
active, paused while on the road, or paused because the target is in another county; attention
never replaces the work focus.

Rank & Realm exposes one no-day-cost **Governance…** entry for every territorial
baron-or-greater player. Its desktop-wide and mobile full-sheet layout is the
authoritative political presentation: Position, Domain, Liege & Obligations (or
Independence), Vassals, Political Blocs, the rank-appropriate Institution, and grouped Political
Actions. `FB.governanceSummary` supplies locale-neutral ids and exact numeric values;
the UI localizes complete phrases and delegates every enabled or disabled action to
`FB.instantStatus` and `FB.runInstant`. County buttons return to Land, realm buttons
open the existing ruler sheet, and focused Estates/Council views preserve a Governance
Back path. The section strip is a keyboard-navigable tab list that exposes one consistent
content surface at a time; its content viewport and exit footer remain fixed while only
the active section scrolls. Direct vassals use a compact aligned ledger on desktop and
two-column stat cards on narrow screens. Controls are native buttons, ordinary number
hints and shortcuts apply only to actions in the active section, and no layout hides
blocked reasons. The legacy Estates and Royal Council
deed ids remain callable compatibility aliases but are omitted from the ordinary Deeds
list.

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
Opening or navigating Network, Governance, Estates, or any forecast consumes
no RNG and writes no simulation state.

Governance's Institution section also repeats every active modifier record from the
player's directly held counties. These are the same native-button chips as Land—not a
second inventory—and open the same accessible detail sheet with semantic source,
remaining days, exact effects, upkeep, expiry, and transfer behavior. Event choices
that grant or remove a modifier append the same information in text before the choice;
icons and color never carry a consequence alone. County transfer automatically removes
the record from Governance while Land continues to show it on the selected county.

Work & Wealth includes **Petition for a guild monopoly** only for a Craft or Trade
guildmaster; its locked description exposes the exact missing technology, guild standing,
Standing with the grantor, grantor, cooldown, or occupied-slot condition. Rank & Realm includes
**Grant a guild monopoly…** for every baron and greater ruler. Its numbered,
keyboard-focusable profession picker previews Craft and Trade with the current
tier-scaled fee, tax, enterprise, duration, and Common Voice terms, then repeats all effects
in a confirmation sheet before spending the day.
Rank & Realm keeps the no-day-cost **Technology…** deed at every social tier. Its
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
is chosen; the general Automation sheet exposes the same linked setting. Eligible tier-3+
vassals receive advocacy controls. Foreign ruler sheets show the same nation's
completed/exposed totals and active projects read-only.
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
rank, standing, exact income modifier, enterprises, partnerships, positions, and bounded
guild commissions), Political Blocs, and Realm. For a qualified territorial ruler,
Political Blocs is the compact shared-court summary and Realm contains one
Governance route, foreign ties, and the computed levy ledger rather than duplicating
liege, vassal, Estates, or Council prose. Other protagonists retain the compact legacy
relationship summary. Empty sections explain what is absent rather than inventing
placeholder people.

Work & Enterprises and Network share a render-only large-list grammar. Every semantic
section is a native, independently collapsible button with a total and a needs-attention
count. Rows are ordered by attention state, stable role/state priority, their existing
meaningful order, and stable identity; changing income, Standing, or another daily number
does not reorder otherwise equivalent rows. Filters, disclosure, search, focus, and scroll
are in-memory UI state only. They consume no RNG and never enter a save.

The shared large-list threshold is **12 total rows per surface**. Above it, an explicitly
labeled literal local search appears and each section initially shows every
needs-attention row plus **5 routine rows**. **Show all {count}** reveals the remaining
routine rows in that section. Search and non-All filters show every match rather than
applying the routine budget. All and Needs attention are shared filters; Work adds
Assigned, Staffed, Idle, and Unavailable, while Network adds People and Realms. Empty
sections distinguish no records from a filter/search with no matches. Hidden rows use the
native `hidden` state, receive no number-key position, and leave the accessibility tree.

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
context is collapsed.

Network → Household also opens the responsive **Household Plan**. Its desktop modal uses a
wide seven-column table ordered as household head, resident family, then paid retainers.
On narrow or short layouts, each person becomes a stacked card and every cell repeats its
localized column label. Education, instruction, work/standing, assignment, match, and
equipment summaries are derived from their owning APIs; actionable cells are native
buttons that retain modal focus, number shortcuts, Tab/Enter/Space, minimum touch sizes,
and browser-history Back. Picker cancellation and no-day changes re-render the plan, while
day-spending career, enterprise-purchase, and match choices keep their existing
close-and-advance behavior. Its sticky footer also offers the enterprise-staffing preview
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

A separate **Descendant Match Assistant** summary and native management button sit above
the same ledger. Its keyboard/mobile-safe policy form exposes an enable checkbox, station
select, and optional non-negative caps for dowry, immediate gold, and required prestige,
then requires a preview before saving. The preview shows every currently eligible
resident child or grandchild, the recommended family (or the absence of one), station,
age, dowry, immediate gold, and prestige requirement. It explicitly states that no pledge,
resource spend, or day advance occurs. Recommended match cells name the candidate and
terms; their ordinary match picker puts that candidate first with a visible marker while
retaining every manual family choice.

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
input for 350 ms after they render (`EVENT_INPUT_GUARD_MS` in `ui.js`, touch only, via
`armEventGuard`/`eventInputGuarded`): a tap already travelling down toward the fixed time bar
must not pick an outcome by accident, while a deliberate next tap should feel immediate. The
guard rearms for each queued event and each outcome screen. Autoresolved events render no
buttons, so they bypass the guard naturally; exceptional choices that automation intentionally
shows remain protected.

Related: [items.md](items.md) for the item card's hover/tap duality.

## Character and realm interaction cards

One target now has one detail-and-action surface. Character rows open the
personal sheet; realm and political-ruler rows open the realm sheet. Both use
the shared interaction-card renderer and the fixed group order: current
commitments, relationship/attention, gifts, travel, diplomacy, feudal actions,
hostility/war, then focused management. Empty groups disappear, while a
progression-relevant blocked action remains visible with its authoritative
reason.

Card builders are read-only derived projections. They may call status and
preview adapters but never assign attention, spend resources or days,
materialize a character, start travel, send an envoy, or declare war.
`interactionActionRow` renders every action as a native button with a stable
semantic id and accessible name. Detail text states exact cost, duration,
Standing effect, cooldown, and replacement consequence supplied by the owning
system. Clicking routes to the existing action or confirmation, which
revalidates its own gate.

Every living AI reigning ruler has a materialized character record. The realm
sheet therefore begins with the standard full character card and a bounded
court strip for the current consort and displayed heirs; each court member is
a native character-sheet button, and all faces use the shared portrait
pipeline. A crest-only header remains a defensive fallback for malformed or
temporarily incomplete state.

The ruler still keeps two deliberately separate sheets. The realm sheet owns
office, realm faith, capital, succession, courier gifts, diplomacy, feudal
dealings, and war. The character sheet owns personal traits, courtship,
rivalry, and household dealings. Typed Standing resolves to the same value on
both. Reciprocal **Personal character** and **Realm and court** links preserve
the distinction, and the personal sheet omits a duplicate gift action.

Modal return context records only the originating view, not simulation state.
Governance, Council, Estates, and card-to-card routes reconstruct the exact
source on Back; Network, Land, and Deeds remain beneath an ordinary overlay
and are revealed by Close. Focused gift, visit, foreign-policy, envoy,
alliance, and war sheets participate in that same history contract. Both card
types use the full-sheet mobile layout, sticky footer, focus containment,
number-key action behavior, and expansion-safe text wrapping.

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
time-bar badges (`Space`/`F`/`Z`) are re-emitted on every `refreshNow`, so a locale reload or
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
