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
`data/policies.js`; see [MODDING](../MODDING.md) for the contract). The
catalog also carries `institution:'crown'` royal policy — standing religious
tolerance and settlement levels the sovereign player proclaims directly
([council.md](council.md)) — which the Estates machinery skips: no Estates
gate, forecast, or motion button ever reads a crown def. Each policy
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

The focused Estates sheet includes a responsive semicircular chamber. It draws one
seat per influence vote in deterministic concentric rows. DOM and accessible order
remain bloc then member house, while an active forecast spatially divides the plotted
seats into support on the left, undecided in the center, and opposition on the right.
The three camps use labelled totals and distinct check, question, and cross marks as
well as stronger fills; bloc color remains the seat outline. With no motion the same
chamber shows neutral composition, and lobbying immediately reflows the forecast.
The visible legend keeps bloc name, posture, influence, eligible lobbying, and native
focusable ruler links compact. Exact natural-support probability, ruler age, economic
power, influence, and every reason-coded factor use the shared desktop hover/focus
tooltip or compact-layout `?` disclosure instead of permanent explanatory rows. The
chamber heading likewise owns the assembly rules, campaign status, and lobbying result
as on-demand detail. Seats are pointer/touch shortcuts to the existing ruler sheet and
stay out of keyboard tab order; closing that ruler sheet restores this exact Estates
view before Estates itself returns to Governance. Governance and Network retain their
existing card/list presentations.
The chamber is a non-shrinking item inside the sheet's scrollable column, so a
long campaign action list scrolls beneath it instead of collapsing its plotted area.
At phone width its camp totals become three full-width rows. The legend has no nested
vertical scroller in compact layouts and permits vertical panning across its cards and
member links, so the sheet continues moving when a swipe starts inside the legend.

`fallowborn-parliament-demo-save.txt` at the game root is an ordinary unmodded
FBS2 export for inspecting this surface. It resumes a tier-4 vassal during an active
Redress campaign with all four core archetypes, mixed postures, unused lobbying,
motion-relevant technology, and spare gold. It has no runtime hooks or special-case
loading behavior.

**Player policy motions are decided by political blocs.** The
shared court, allegiances, influence, and forecast are described in
[realms.md](realms.md). A bloc begins from its archetype's per-policy weight
(`politicalBlocs.motions.<policyId>`), then the policy's own `posture` adds
visible reason-coded adjustments: the current aid (`aidSlope`), member-ruler
traits (`traits`), and average member Martial (`martialSlope`, scutage uses
this). Optional `ageSlope` applies
`clamp(round(((influence-weighted average age - 40) / 10) × slope), -8, 8)`.
Optional `economicPowerSlope` compares the bloc's influence-weighted average
territorial economic power with the influence-weighted court average, multiplies
that relative difference by the slope, rounds it, and clamps it to ±8. A house's
economic power is the development of its directly held counties plus half the
development held by its vassal subtree. Both factors are derived, reason-coded,
and RNG-neutral. They add no saved fields, so save format 3 and existing
bloc-keyed outcomes remain unchanged. Scores at +25 or above lock support;
scores at −25 or below lock opposition. An undecided bloc's support chance is
`clamp(50% + score, 15%, 85%)`.

The initial demographic/material posture is deliberately conservative. Redress
uses age `+2` and economic power `+6`; Emergency Subsidy uses economic power `+6`;
Scutage uses age `+4` and economic power `+6`; Levy Relief uses age `+2`; Market
Charter uses economic power `+6`; Confirmation of Custom uses age `+2`; War
Authorization uses age `−4` and economic power `+4`; War Condemnation uses age
`+4` and economic power `−4`. Consent of the Estates is unchanged.

The same forecast includes two bounded agency factors. Magnate affiliation uses
sparse ruler regard toward the proposed leader, while a motion's posture uses
the bloc's influence-weighted relationship with the player's house and the
members' generation-stamped ruler aims. Both appear as signed explanation rows.
They consume no RNG during display and do not create relationships for unrelated
courts.

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
`popularOpinion` event effects by 1.2; losses and non-event Popular support changes remain
unchanged.

## Technology gates

Policies may declare all-of `requiresTech`. Scutage uses `scutage`; Market Charter uses
`urban_markets` plus `authenticated_seals`; Confirmation of Custom uses `customary_law`;
and Consent of the Estates uses `representative_estates`. The shared motion status exposes
the exact missing ids before spending gold, and the Estates sheet keeps a locked motion
visible as a technology-detail link. A pending campaign is grandfathered and may finish if
the effective sovereign changes before the vote.

Ordinary Redress remains ungated. Without Recorded Customary Law it lowers the aid only;
a campaign begun with that technology also records Custom Confirmed on the snapshotted
home county. The yearly Market Charter agenda is not queued without both market
technologies. Mixed local-redress choices for a market charter or written custom stay
visible and locked until their own requirements are met, while leaving the petition
outstanding remains available. Existing scutage, consent, privileges, and modifiers never
lapse merely because technology or allegiance later changes.

Technology-impact review: `estates_demographic_material_interests` is `none`.
Age and territorial economic power describe baseline political interests rather than
a new capability; each motion keeps its existing technology gate.

Related: [council.md](council.md) for the king-side mirror,
[realms.md](realms.md) for the liege chain and Standing, [events.md](events.md)
for the interpreter.

The yearly session is queued with an explicit `locationId` of the player's home county.
Its agenda is chosen by reading the modifiers on that county, so an unstamped context
would let `FB.travelLocation` aim a New Year session at whatever county the player
happened to be visiting, and carry its modifier effects there with it.

A successful player motion for redress also grants `Custom Confirmed` to the event's
snapshotted home county for 3,600 days. Its Popular support is demesne-wide only while that
county is one of `FB.modifierCounties`, which is the county itself for a baron who holds
none directly; the levy and unrest effects remain attached to the county.
See [modifiers.md](modifiers.md).

Estates laws and story grants also participate in the shared privilege roll.
`market_charter`, `custom_confirmed`, and `levy_exemption` modifier records remain the
sole mechanical source of tax, construction, Popular support, and levy arithmetic; the
parallel `state.privileges` entry records holder, grantor, territorial scope, rights,
exemptions, obligations, protected duration, revocation rule, and semantic source.
`obl.revocationConsent` likewise remains the authoritative law while its privilege record
describes the institutional holder and estates-vote revocation rule. This is provenance,
not a second modifier or law calculation. The shared privilege sheet reflects that boundary:
identity, scope, authoritative effect, duration, and revocation availability stay on the
contract face, while grantor provenance, legal terms, rights, exemptions, and obligations
use the standard desktop tooltip or compact disclosure. This is a presentation-only split;
the saved privilege schema and every mechanical source remain unchanged. Load-time
institution repair discovers legacy modifier provenance; the normalized modifier APIs
maintain it afterward, so the daily
institution pass does not rescan every county merely to rediscover the same records. A
refused demand or unlawful revocation stores organized pressure for that constituency from
one to five steps. Each step adds 10 points when currently eligible collective demands are
ranked, so the highest-pressure eligible petition leads the next event; the pressure alone
never creates a revolt or battle. Further refusals increase it to a +50 cap, while granting
that constituency’s eventual demand clears it. The UI calls this an organized grievance and
keeps the exact points and clearing rule in its standard details disclosure rather than
showing the internal step counter. Its
normalized policy, election, privilege, demand, guild, and council inputs are retained
while unchanged, with the next saved expiry or cooldown waking repair on its exact turn.
Political-court alignment follows the same rule: realm, Standing, commerce, council,
relationship, and modifier changes invalidate the retained evaluation, while quiet days
do not rebuild every house's territory and adjacency interests.

The four authored institution agendas use the same county contract. Market settlements
grant Market Charter or Contested Tolls; wartime service grants Muster Burden, Levy
Exemption, or Roads Patrolled; local redress declaratively removes a dispute and
replaces it with Market Charter or Custom Confirmed; sanctuary choices grant relief or
leave a Settlement Grudge. Only the trade-redress success needs a custom handler,
because it moves the authoritative aid one ordinary step. No event creates a second
obligation or institution state.


## Local commons uprisings

Technology impact `local_commons_uprisings` remains `none`: local resistance, its
spread, and an overlord-backed settlement are baseline rule and recovery. An
uprising settlement guarantees the demanded county privilege across the ruler's
own holdings and subordinate vassals without changing ownership, fealty, or offices.
The original approved terms remain available after research changes.

A refused commons demand at effective Popular support -20 or lower starts a final
petition involving up to three directly held counties. Deferring gives those counties
90 days to receive the concession or recover support above -10. Each unresolved
county then suffers 180 days of tax and levy disruption, scaling live from 25% at
-20 support to 100% at -100. Bonuses cannot offset a complete shutdown.

After an outbreak, 30 consecutive days at support -20 or lower may threaten one
neighbor of an active county, selected in stable id order. Land/strait adjacency
uses `FB.world.adj`. Direct and vassal-held counties under the player's authority
are eligible; an independent ruler can reach the entire connected sovereign realm,
while a vassal ruler cannot spread a personal incident into their liege's or sibling
vassals' lands. No foreign county or already protected county is eligible. Each
county joins at most once per incident, so settled or expired counties never cycle
back in. Each new county receives its own queued warning. Its 90-day grace starts
only when that warning is answered, then its 180-day disruption starts at outbreak.
Support above -20 resets the spread timer; support above -10 cancels outstanding
warnings. Existing active penalties continue to follow support until resolved or expired.

The original outbreak offers concession, paid Diplomacy negotiation, paid suppression
(65%), or enduring the disruption. Money, prestige, and stored Popular support changes
occur once; the concession or suppression covers every pending and active county.
Failed responses do not extend any county deadline. The privilege roll offers a later
concession covering the current roster. No army or war record is created or changed.

Internal grants and transfers between subordinate vassals preserve county stages and
deadlines. Leaving the player's authority/sovereign realm or receiving an individual
concession removes only that county. Succession, demotion, death, or a change of the
player's liege/sovereign clears the incident. One shared three-year cooldown starts
when no counties remain. Existing commons downfall flags prevent a new local incident;
the local incident and its cooldown prevent that downfall chain from starting.

Saved per-county phases and deadlines, visited county ids, and the next spread turn
are additive to save format 3. Legacy shared-deadline incidents migrate without
changing their remaining time or adding counties. Stale event contexts cannot act
on a changed roster or phase. Load repair requeues missing unanswered warnings once.
Privileges & collective demands lists each county's phase and next deadline, with
the spread countdown or the reason spreading is paused. Land shows active modifiers.


### Local settlements within a spreading uprising

Technology impact: **none** (`local_commons_settlements`). A direct holder can negotiate
customary relief in their own counties without their overlord's permission or research.
The incident still originates in the player's refused demand; this adds local responses
by the player and subordinate AI rulers, not a separate AI demand-generation system.

One local negotiation per lordship per incident covers its currently affected directly
held counties, including warnings. The player pays 20 gold, with the existing Diplomacy
chance (30% plus 4 percentage points per skill, clamped to 10-90%). Success grants the
original demanded privilege with the local ruler as grantor and removes only those
counties from the incident. Failure preserves their existing phases and deadlines.
Neither result directly changes stored Popular support, prestige, ownership, or fealty.
The granted privilege retains its ordinary county effects, including support modifiers.
The overlord's existing realm-wide responses remain available on their original terms.

AI direct holders attempt these talks after their earliest affected county has been in
the incident for 30 days, in stable holder-id order. Their chance uses their actual
ruler's Diplomacy. AI realms have no gold treasury; their settlement cost is represented
by the demanded county privilege's ordinary economic burden. They never spend the
player's money. A saved `localNegotiations` map records attempts, preventing repeated
rolls on ticks, reloads, or failed player choices. Settled counties stay visited and
cannot rejoin. Contexts capture the negotiator's identity and exact direct county list;
a changed holder, stale incident, or spent attempt invalidates a choice before cost/RNG.

Inline concessions and local talks show a settled result before returning to the
privilege roll. Actual costs and effects, including a failed negotiation fee, remain
visible. Continue, Escape, and mobile Back acknowledge once and restore the roll
scroll and expanded disclosures; the outcome shares the event input guard.
