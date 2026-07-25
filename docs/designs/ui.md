# UI: keyboard & mobile

**Keyboard support is a requirement** (`js/keys.js` + focus management in `ui.js`): the game
must stay fully playable mouse-free on desktop. New buttons/dialogs need to stay reachable —
modals autofocus their first control, list dialogs get 1–9 / ⇧1–⇧9 `keyhint` badges via
`UI.openModal` (`UI.hintFor`; Shift+digit reaches items 10–18, resolved by physical key
code in keys.js), and dialogs that must not be Esc-dismissed pass `{dismissable:false}`.
`UI.openModal` also takes `{modalClass}` to tag `#genmodal` with a per-dialog CSS modifier
(cleared on the next open): the Changelog uses `changelog-modal`, and the Menu, Automation,
and end-game dialogs use `fullsheet-modal` for their own mobile layouts (see below). A dialog
that dismisses from a footer button rather than the (mobile-invisible) backdrop puts that
button in a `.gm-footer` — centered on desktop, and on mobile a large tap target pinned to
the bottom middle of the sheet.

**Mobile layout lives in css/style.css.** `#panels` wraps the two side panels — invisible
on desktop (`display:contents`). On phones the Deeds/Land/Chronicle panel takes the full
width and Self/Kin becomes a drawer (`#left` fixed, shown by `body.showself` — toggled in
`setTab`, opened by tapping the topbar portrait, closed by `#btn-closeself`). The time
controls become a fixed thumb-zone bar above the drawer (hidden by `body.picking` during
the birthplace pick), most modals render as bottom sheets, and touch targets stay ≥44 px
with safe-area insets. In portrait the topbar wraps to three rows: identity and ☰ up top,
then the full date (with year) on its own line, then the four resources on their own
full-width row (`#tb-date` order 4, `#tb-stats` order 5; a single stats row clips its
leftmost figures on narrow screens, and the date is hidden in the tighter landscape bar).
The play/pause button shows only ▶/❚❚ and its `Space` badge — the running date is not
repeated there, so the button never changes width as the days flow.

Two families of dialog break the bottom-sheet default, both with the footer button pinned to
the bottom middle so a long body needs no scroll to shut and nothing reaches for the top edge
to dismiss: the Changelog (`.changelog-modal`) stays an evenly margined centered panel, while
the Menu, Automation, and end-game dialogs (`.fullsheet-modal`) fill the whole screen edge to
edge. Both share a flex-column card with a scrolling `#gm-body` under a sticky, centered
`.gm-footer`; the full-screen flavour additionally makes `#gm-body` a column and gives the
footer `margin-top:auto`, so the Close sits at the very bottom even when the body is short.
Hover-only affordances need a tap path (item chips toast their description).
The building deed's county ledger stays open after **Raise Next**, so repeated construction
does not traverse province and settlement dialogs for every work. Its nine building rows
retain the modal's 1–9 keyboard hints, show the exact live price, and explicitly warn that
repeat copies in one county become 50% dearer each time. Exact settlement placement and
permanent demolition remain available from the Land-tab settlement view.
The topbar resources (money/prestige/piety) are real buttons: hover shows the
instant `#tooltip` with the per-season source breakdown (`FB.incomeBreakdown`
in js/actions.js — focus, rents, vassal dues, buildings, household holdings,
treasures, station upkeep, resident-family provisions, and school fees), tap or click opens the same rows as a small modal
(`UI.showStatModal`), and keyboard users Tab to them with native Enter/Space
activation. The money button uses `FB.money`: compact formatting for its visible
balance, the configured `icon` for the mark, and localized long denomination names
for its accessible label. Compound amounts may therefore use multiple units without
changing the underlying `player.gold`. The deprecated
`FBDATA.balance.coinageSymbol` changes only the default icon when no full currency
definition is active.

**Managed household sheets keep compact bust portraits and open equipment separately.**
The Self sheet and the sheets for living spouses and resident unmarried children each offer
an **Equip items…** button. It opens a dedicated modal with one deterministic full-body
figure and eight native slot buttons in a two-column grid. The modal is centered on desktop
and becomes a scrolling full-screen sheet with a bottom-pinned close control on mobile.
Every slot button is at least 44 px high, participates in ordinary Tab/Enter/Space
navigation, and opens a numbered compatible-armory list; no drag-and-drop path is required.
Two-handed and replacement moves receive a confirmation that names every displaced hand
object and prior wearer. Equipment controls disable during travel or an unresolved event.
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
seasonal fee; unavailable town/focus/age combinations remain visible with their reason.
The upbringing summary repeats the current arrangement, projected chance, fee, and paused
payment state.

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
Independent counts and higher also get a compact political-attention summary above those
groups. The Foreign Policy deed opens a numbered neighboring-court list and then numbered
Improve/Neutral/Provoke controls; both use the standard keyboard-focusable, mobile
bottom-sheet modal. Foreign province panels link their sovereign to the ruler sheet, and
both views show opinion and the current direction.

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
