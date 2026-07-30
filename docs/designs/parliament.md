# The Estates (parliament)

**A sworn lord below the crown (tiers 3–5) does not only pay and serve — he
sits in the liege's assembly.** `js/parliament.js` is the vassal-side mirror of
the royal council ([council.md](council.md)): where the council lets the
player-king lean on his magnates, the estates let the player-vassal haggle over
the terms of his own service. The machinery deliberately reuses the council's
patterns — a self-healing state blob, `FB.fns.parliament_*` custom
trigger/effect fns, a dedicated event pack (`data/events_parliament.js`), and
Standing through the canonical facade over the shared `liegeOps` backing store.

**The terms of service live on the liege realm** (`liege.obl = { aid, scutage }`,
created and healed by `FB.parliamentEnsure` in the season tick — old saves and
new lieges get the customary terms on first sight, no save-version bump):

- **The aid** — the liege's cut of the player's noble revenue, applied in
  `FB.playerTax`. Once a hardcoded 25%, it is now a per-realm term voted
  between `balance.parliamentAidMin` (10%) and `parliamentAidMax` (40%) in
  `parliamentAidStep` (5%) steps, starting at `parliamentAidBase` (25%).
- **Scutage** — once voted through, the `liege_summons` banner call gains a
  cheap shield-tax option (8 gold, −2 Standing) alongside the old buy-out; the
  aid creeps up 2 points in exchange. Gated by the `parliament_has_scutage`
  option `require`.

**Sessions arrive once a year** (`FB.parliamentYearly` in the yearly tick,
`balance.parliamentSessionChance` odds): a queued event fires the next day.
`FB.parliamentSessionCandidates` derives the locale-neutral agenda pool. Its standing
business remains a quiet sitting, a fellow lord's grievance, and—below the maximum—a
demand for greater aid. Peacetime adds a market-charter dispute and a sanctuary/relief
bargain; wartime replaces those with the existing subsidy and a
service-beyond-custom bargain. Active Contested Tolls or Settlement Grudge adds a
focused redress hearing. The yearly cadence is unchanged; the broader pool prevents the
new stories from occupying every event slot. Between sittings the
🏛 **Estates** deed (`UI.showParliament`) shows the current terms and the
player's voice, and sells a motion of the player's own — redress
(`parliament_redress`, aid down a step) or scutage (`parliament_scutage`) —
for `balance.parliamentMotionCost` gold, one motion per calendar year
(`obl.lastMotion`).

For territorial players, **Governance** is now the authoritative overview and entry
point. `FB.parliamentTerms` and `FB.parliamentSummary` expose the current saved terms,
pending session or motion, yearly-use status, and exact vote factors without creating
`liege.obl`; the customary defaults are projected until the season tick or a successful
motion calls `FB.parliamentEnsure`. `FB.parliamentMotionStatus` is the shared gate used
by both Governance and `UI.showParliament`, and `FB.parliamentMove` performs the existing
gold spend and event queueing only after that gate succeeds. The focused Estates view
therefore remains mechanically authoritative without mutating state when opened. Its
visible and browser Back actions return to Governance's Institution section when it was
opened there. The former `the_estates` deed id remains a direct-call compatibility alias.

**Votes are decided by the `parliament_vote` named chance**
(`FB.parliamentVoteChance`): a 30% base plus a rank bonus (baron +5, count
+12, duke +20 — a duke's word outweighs a baron's), diplomacy ×2%, prestige,
Standing with the liege, and grouped `assembly.voteChance` trait effects, clamped
10–85%. Moot-Speaker contributes +5 percentage points in addition to its +1
Diplomacy. The player redress motion uses `parliament_redress_vote`, the same formula
with any exact-contract plot evidence added; unrelated votes never consume or benefit
from that evidence. Every vote moves `liegeOp` as well
as the terms: consenting to a demand buys the crown's notice, leading a
refusal is remembered, and winning redress binds the liege while displeasing
him. Only the player's own terms are simulated; AI vassals of the realm are
the unnamed benches, exactly as AI realms stay lightweight elsewhere.

The named **Bend the Feudal Obligation** plot is a deliberate player exception to
the otherwise systemic vote flow. It targets the protagonist's exact current
liege obligation contract rather than a general lord. Evidence gathered by the
plot adds 15 percentage points to the next redress vote and is cleared when that
vote resolves. The saved evidence flag repeats the exact realm, institution, and
contract context, so changing liege cannot carry it into another assembly. A paid
immediate settlement instead moves ordinary aid one step
downward at a serious Standing cost; failure moves it one step upward. Changing
liege, institution, or obligation contract invalidates the target and ends the
plot without redirecting it. The plot is unavailable once aid already rests at the
customary minimum.

Every successful contested `parliament_vote` adds one Moot-Speaker progress point;
three wins award the reputation and write its localized Chronicle notice. A failed
contested vote removes an existing Moot-Speaker and resets its progress. Because
event-driven progress resets only when removal actually occurred, failures before the
first award do not erase accumulated wins. Moot-Speaker also multiplies only positive
`popularOpinion` event effects by 1.2; losses and non-event Common Voice changes remain
unchanged.

Related: [council.md](council.md) for the king-side mirror,
[realms.md](realms.md) for the liege chain and Standing, [events.md](events.md)
for the interpreter.

A successful player motion for redress also grants `Custom Confirmed` to the event's
snapshotted home county for 3,600 days. Its Common Voice is demesne-wide only while that
county remains directly held; the levy and unrest effects remain attached to the county.
See [modifiers.md](modifiers.md).

The four authored institution agendas use the same county contract. Market settlements
grant Market Charter or Contested Tolls; wartime service grants Muster Burden, Levy
Exemption, or Roads Patrolled; local redress declaratively removes a dispute and
replaces it with Market Charter or Custom Confirmed; sanctuary choices grant relief or
leave a Settlement Grudge. Only the trade-redress success needs a custom handler,
because it moves the authoritative aid one ordinary step. No event creates a second
obligation or institution state.
