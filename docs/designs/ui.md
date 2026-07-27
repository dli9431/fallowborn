# UI: keyboard & mobile

**Keyboard support is a requirement** (`js/keys.js` + focus management in `ui.js`): the game
must stay fully playable mouse-free on desktop. New buttons/dialogs need to stay reachable —
modals autofocus their first control, list dialogs get 1–9 / ⇧1–⇧9 `keyhint` badges via
`UI.openModal` (`UI.hintFor`; Shift+digit reaches items 10–18, resolved by physical key
code in keys.js), and dialogs that must not be Esc-dismissed pass `{dismissable:false}`.
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
staffing remain available.
The building deed's county ledger stays open after **Raise Next**, so repeated construction
does not traverse province and settlement dialogs for every work. Its nine building rows
retain the modal's 1–9 keyboard hints, show the exact live price, and explicitly warn that
repeat copies in one county become 50% dearer each time. Exact settlement placement and
permanent demolition remain available from the Land-tab settlement view. Province settlement
lists wrap between places, never inside a settlement name, so each link stays readable.
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
the projected purse after one season before listing five general standards, relevant
profession outfits, and permanent holdings as separate sections. Each standard row opens
a native-button detail view. Upgrade confirmation states setup cost, complete new upkeep,
benefit, seasonal net, and projected purse; a negative projection warns without disabling
an otherwise affordable purchase. Reduction requires a second explicit confirmation that
names the lost level and no-refund/re-purchase rule. `UI.showHoldings` remains an alias to
this sheet for older deeds and mods.

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
The Self sheet and the sheets for living spouses and resident unmarried children each offer
an **Equip items…** button. It opens a dedicated modal with one deterministic full-body
figure and eight native slot buttons in a two-column grid. The modal is centered on desktop
and becomes a scrolling full-screen sheet with a bottom-pinned close control on mobile.
Its centered title stacks the character's full name above **Equipment**, keeping the heading
readable on narrow screens.
The Self overview places its skill bars beside the compact portrait; both the portrait and
the narrow button directly beneath it open the equipment sheet. Traits sit below the
overview, before the full identity and household details. Titles and Possessions use collapsed-by-default,
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
The mechanically active totals from worn items appear beneath the figure, including an
explicit empty state. On narrow phones the figure and bonus summary stack above the same
two-column grid.

The item card reuses the isolated procedural object renderer and reports exact quality,
quality-adjusted effects, value, current wearer, pledge state, and valid equip/unequip,
gift, and sale actions. Family/event/topbar cards retain compact bust portraits, with only
readable equipment cues such as a helmet, pendant, crown, or armor edge. The succession
modal is the other full-body surface: it paints the frozen final loadout beside the
“Worn at death” list before any heir may be selected.

Minor character sheets separate the education-focus picker from the instruction picker.
Every school/tutor row shows the projected full-year directed-learning chance and exact
training-cost-modified seasonal fee; unavailable rank, technology, town, focus, and age
combinations remain visible with their exact reason. A school with annual mortality states
its per-term and four-term danger in the picker. The upbringing summary repeats the current
arrangement, projected chance, fee, paused payment state, and any completed dangerous terms
even after the child switches to another arrangement.

Living character sheets also own personal relationship controls. **Cultivate relationship**
and **Stop cultivating** assign or withdraw the one social-attention slot without spending
a day; while courting, the suitor holds that slot until the courtship ends. The assigned
person's sheet repeats their Regard, fixed daily rate, and estimated days to +40. **Call
friend** and **Propose marriage** remain visibly disabled below the shared threshold.
Cash-gift controls show their +Regard value and either readiness or recipient-specific days
remaining on the shared cash/item gift cooldown.

The no-day-cost **Coin & Credit** deed opens a full-screen-capable Finance sheet. Active
obligations are ordered by deadline before metrics so the urgent contract remains first on
a narrow phone. The sheet shows purse, price index, last movement and purse adjustment,
reliable net income, credit capacity and defaults, exact loan faces/current values/dates,
pledges, and investment maturities. Borrowing, investment, debasement, and recoinage use a
final confirmation whose first action receives focus; every term and default consequence is
visible above the buttons. The money source sheet also carries a non-recurring **Coin and
prices this year** line.

The Deeds panel uses accessible accordion groups for Work & Wealth, Life & Family,
Faith & Community, Rank & Realm, and War & Diplomacy. Group headers are real buttons
with `aria-expanded`; closed actions are not rendered, so number-key selection can never
activate an invisible deed. The current daily focus remains pinned above the groups.
The Self sheet's faith block names the live religious head or the number of days its
office has been vacant, and states excommunication separately from the trait chip.
Faith & Community contains the contextual absolution, Papal-restoration, and
Caliphate-claim deeds. Their resource/land consequences use ordinary focusable
confirmation sheets. A Catholic Papal conquest is marked as sacrilege in the war list
and uses its own second confirmation; no penalty is applied until that final button.
A separate personal-attention summary names the assigned character, current Regard, fixed
daily rate, estimated days to the relationship threshold, and travel-pause state; attention
never replaces the work focus.
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
Independent counts and higher also get a compact political-attention summary above those
groups. The Foreign Policy deed opens a numbered neighboring-court list and then numbered
Improve/Neutral/Provoke controls; both use the standard keyboard-focusable, mobile
bottom-sheet modal. Foreign province panels link their sovereign to the ruler sheet, and
both views show opinion and the current direction.

The contextual **Network** panel (`N`) answers who is tied to the current household and
what that relationship does. Its four sections are Household (resident family,
capacity-limited retainers, office, pay, work assignment, and maintained-standard
summary/upkeep), Connections (canonical
friend, cultivated contacts, rival, suitor, priest, and lord), Trade & Guild (career,
rank, standing, exact income modifier, enterprises, partnerships, positions, and bounded
guild commissions), and Realm (liege, vassals and levy favors, foreign ties, Royal
Council summary/link, and the computed levy ledger). Empty sections explain what is
absent rather than inventing placeholder people.

Connections begins with the same personal-attention summary as Deeds. Item-gift recipient
buttons show the exact +Regard tier and are disabled with the remaining cooldown days when
that person has already received either cash or an item gift. All assignment, friendship,
courtship, and gift buttons are native focusable controls, so the same labels and disabled
state remain available to keyboard and mobile users.

The panel summarizes other systems and links to their focused controls. Character sheets
remain the place to call a friend or manage one retainer; Work & Enterprises remains the
staffing surface; Royal Council remains the crown-office manager. Retainer hire,
dismissal, and friendship replacement use the standard focusable modal and confirmation
patterns. Guild and vassal favors are direct focusable Network actions whose buttons state
their full cost and duration before activation. Network is hidden in observe mode alongside
other protagonist-only panels.

The tier-1/2 **Take to the road…** deed opens a purpose dialog, then a map picker
with marked valid destinations and a synchronized, focusable destination list.
Map taps and list buttons select the same county and preview the settled-only
route; the final confirmation states county legs, days each way, and exact cost.
It also states the 90-day destination stay and whether this character’s one lifetime
permanent move remains available.
The picker pauses time, supports the normal map keyboard navigation, number keys,
Tab, Enter, and Escape, and becomes a bottom sheet on narrow screens. During a
journey the map keeps the gold household flag at home, draws a separate traveler
compass and remaining route, and the Deeds panel replaces focuses/actions with
current journey status and **Turn back toward home**. At the destination the status
also counts days living and working there. Return unlocks after 90 days; after a
year and four work stories, **Settle here permanently…** opens a confirmation that
names the destination, preserved property/culture/faith, and the once-per-character-life
limit.

Because the event modal opens as a bottom sheet under the thumb, its choice buttons ignore
input for 350 ms after they render (`EVENT_INPUT_GUARD_MS` in `ui.js`, touch only, via
`armEventGuard`/`eventInputGuarded`): a tap already travelling down toward the fixed time bar
must not pick an outcome by accident, while a deliberate next tap should feel immediate. The
guard rearms for each queued event and each outcome screen. Autoresolved events render no
buttons, so they bypass the guard naturally; exceptional choices that automation intentionally
shows remain protected.

Related: [items.md](items.md) for the item card's hover/tap duality.

## Great holy-war presentation

An active call adds a compact Deeds summary and a focusable campaign action. The
full-sheet campaign dialog names caller, military leader, schedule, camp strengths,
resolve, both participant lists, every frozen objective and occupation/siege state,
and the protagonist's contribution share and current reward band. A player religious
head gets a target picker; eligible adults get pledge, renewal, and withdrawal
confirmations. A pending territorial grant is a non-dismissable accept/decline dialog
that explains whether acceptance founds a realm, relocates a vassal, attaches a
secondary grant, or unites a crown.

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
