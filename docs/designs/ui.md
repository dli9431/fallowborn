# UI: keyboard & mobile

**Keyboard support is a requirement** (`js/keys.js` + focus management in `ui.js`): the game
must stay fully playable mouse-free on desktop. New buttons/dialogs need to stay reachable —
modals autofocus their first control, list dialogs get 1–9 / ⇧1–⇧9 `keyhint` badges via
`UI.openModal` (`UI.hintFor`; Shift+digit reaches items 10–18, resolved by physical key
code in keys.js), and dialogs that must not be Esc-dismissed pass `{dismissable:false}`.

**Mobile layout lives in css/style.css.** `#panels` wraps the two side panels — invisible
on desktop (`display:contents`). On phones the Deeds/Land/Chronicle panel takes the full
width and Self/Kin becomes a drawer (`#left` fixed, shown by `body.showself` — toggled in
`setTab`, opened by tapping the topbar portrait, closed by `#btn-closeself`). The time
controls become a fixed thumb-zone bar above the drawer (hidden by `body.picking` during
the birthplace pick), modals render as bottom sheets, and touch targets stay ≥44 px with
safe-area insets. Hover-only affordances need a tap path (item chips toast their
description).

Related: [items.md](items.md) for the item card's hover/tap duality.
