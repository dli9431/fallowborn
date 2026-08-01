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
new stories from occupying every event slot. Once the estates have sworn the
liege to seek their consent (the `revocation_consent` policy below), the
liege's unilateral aid demand leaves the agenda for good. Between sittings the
🏛 **Estates** deed (`UI.showParliament`) shows the current terms and the
player's political court, and begins a motion of the player's own for
`balance.parliamentMotionCost` gold. The available motions are not hard-coded:
they come from the **policy catalog** (`FBDATA.policies` in
`data/policies.js`; see [MODDING](../MODDING.md) for the contract). Each policy
declares its family, gate, cost, bloc posture, and result event; the catalog
ships redress (`parliament_redress`, aid down a step), an emergency war
subsidy, scutage (`parliament_scutage`), levy relief (a timed county exemption
bought with an aid step), a market charter, confirmation of local custom,
consent of the estates, and wartime authorization or condemnation. The payment
opens a 90-day campaign rather than queueing the result immediately, and spends
the year's hearing for that policy's **family** (`obl.motionYears`, healed from
the legacy single `obl.lastMotion` stamp on old saves); `emergency` policies
waive the family cooldown. The payment and yearly use remain spent if the
motion is withdrawn or expires.

For territorial players, **Governance** is now the authoritative overview and entry
point. `FB.parliamentTerms` and `FB.parliamentSummary` expose the current saved terms,
pending session or motion, yearly-use status, and exact vote factors without creating
`liege.obl`; the customary defaults are projected until the season tick or a successful
motion calls `FB.parliamentEnsure`. `FB.parliamentMotionStatus` is the shared gate used
by both Governance and `UI.showParliament`. `FB.parliamentBeginMotion` performs the
gold spend and creates the pending campaign only after that gate succeeds;
`FB.parliamentMove` remains its compatibility alias. The focused Estates view
therefore remains mechanically authoritative without mutating state when opened. Its
visible and browser Back actions return to Governance's Institution section when it was
opened there. The former `the_estates` deed id remains a direct-call compatibility alias.

**Player policy motions are decided by political blocs.** The
shared court, allegiances, influence, and forecast are described in
[realms.md](realms.md). A bloc begins from its archetype's per-policy weight
(`politicalBlocs.motions.<policyId>`), then the policy's own `posture` adds
visible reason-coded adjustments: the current aid (`aidSlope`), member-ruler
traits (`traits`), and average member Martial (`martialSlope`, scutage uses
this). Scores at +25 or above lock support;
scores at −25 or below lock opposition. An undecided bloc's support chance is
`clamp(50% + score, 15%, 85%)`.

One targeted lobbying attempt is included in the motion cost. It may target
only an undecided bloc, and its visible chance is the average of that bloc's
natural support chance and `FB.parliamentVoteChance`. Exact-contract redress
evidence remains part of the player side of that average. Success saves a
support pledge; failure saves only that the attempt was used and leaves the
bloc undecided.

`FB.parliamentCallVote` resolves undecided blocs in stable bloc-id order with
one saved-RNG roll each. Locked and pledged blocs consume no roll. The summed
support influence must reach a strict majority; there is no final global
success roll. The policy's result event (its `resultEvent`, defaulting to
`parliament_<policyId>`) is then queued with a semantic predetermined result.
Its two gated, no-chance options make visible and automated event handling
apply the same effects. A liege change or invalid court clears the campaign,
and the queued
event's exact polity/motion id validator prevents it from applying in another
realm. Expiry and withdrawal preserve unused redress evidence; a resolved
redress vote consumes it as before.

The `parliament_vote` and `parliament_redress_vote` named chances remain
available for mods and for all other authored Estates stories. Their formula
is still a 30% base plus rank, Diplomacy, prestige, Standing, grouped
`assembly.voteChance` trait effects, and (only for the redress variant)
exact-contract evidence, clamped 10–85%. Moot-Speaker continues to contribute
through that compatibility formula. Every resolved motion retains the
existing aid, scutage, Standing, prestige, trait-progress, modifier, and
Chronicle effects.

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

The yearly session is queued with an explicit `locationId` of the player's home county.
Its agenda is chosen by reading the modifiers on that county, so an unstamped context
would let `FB.travelLocation` aim a New Year session at whatever county the player
happened to be visiting, and carry its modifier effects there with it.

A successful player motion for redress also grants `Custom Confirmed` to the event's
snapshotted home county for 3,600 days. Its Common Voice is demesne-wide only while that
county is one of `FB.modifierCounties`, which is the county itself for a baron who holds
none directly; the levy and unrest effects remain attached to the county.
See [modifiers.md](modifiers.md).

The four authored institution agendas use the same county contract. Market settlements
grant Market Charter or Contested Tolls; wartime service grants Muster Burden, Levy
Exemption, or Roads Patrolled; local redress declaratively removes a dispute and
replaces it with Market Charter or Custom Confirmed; sanctuary choices grant relief or
leave a Settlement Grudge. Only the trade-redress success needs a custom handler,
because it moves the authoritative aid one ordinary step. No event creates a second
obligation or institution state.
