# Kingship and succession conversations

The `kingship_succession` pack contains twenty events in the late antique and
early medieval eras, from 450 through 850. It reads current political records;
it schedules no historical succession, chooses no ruler and transfers no realm.
Fresh 867 and 1066 campaigns exclude every event in this pack. The extended
window permits the existing inheritance consultation after an 800 opening.

Kin recognition, elective admission and aristocratic recognition use the actual
home county holder's government. Existing inheritance and personal agenda
stories instead follow their original ruler, including when that ruler resides
outside the public court. An inheritance consultation is not restricted to a
particular form: it retains its declared constitutional parties. A regnum with
surviving provincial facts can encounter a blocked retained court program;
changing form never supplies the missing authority.

## Invitations and observations

These adapters register through the shared event review and reader APIs. They
accept ordinary JSON declarations, with no callback, state path or supplied
actor. They reuse existing government selection, recognition and story records.

| Review | Typed arguments | Canonical decision |
| --- | --- | --- |
| `political_nomination` | `participant:"candidate"` | The protagonist's current political interest admits one qualified existing local person through `governmentSelection.quote/apply`. |
| `constituent_decision` | `participant`, `action:"support"`, `"withhold"` or `"withdraw"`; optional `terms:{levy,revenue}` and `selection:"first"` or `"minor"` | Only the protagonist's own current principal casts support or refusal. Selection uses its existing support/withdrawal transaction; royal recognition uses `supportQuote/applySupport`. |
| `political_succession` | `participant`, `action:"negotiate"` or `"designate"`; optional terms and selection | Current selection or royal recognition reviews a preference or a funded offer. Neither operation installs a ruler. |
| `political_story` | `participant`, and either `storyId`/`choiceId` or `storyType`/`choiceKind` | A ruler agenda's costless priority, finish, defer or stop decision. |
| `political_partition` | The same story selectors, restricted to `succession_partition` | The existing inheritance agreement's approval/refusal, with its prospective senior heir's exact portrait. |

`participant` is always the literal slot `candidate`. Its event declaration must
use `source:"context"`, `required:true`, and include it in `participantCards`.
The shared foundation enforces this portrait contract. Terms have exactly two
numeric rates, each in [0,1]. Omitted terms retain the canonical profile's terms.
Succession reviews also require the context slot `principal` and its portrait.
This binds the negotiating magnate, or the proposing actor for a selection or
court preference. A changed hereditary principal cannot replace that person in
an already queued invitation.
Partition reviews likewise require the context slot `heir` and its portrait.
It binds the existing character behind the canonical proposed primary share;
an unmaterialized member cannot be replaced with an invented person. A changed
primary share or person invalidates the original invitation.
`minor` filters royal candidates only; selection keeps its existing adult rule.
No review supplies another constituent's consent. A court's negotiated royal
recognition still requires the target interest's canonical response and actual
public funds. Personal and court payment follow the same actors as the existing
political sheets, and the confirmation identifies the paying account.
Existing combined court/household accounts remain combined and are disclosed
as such. Personal spending, including a charge to that combined account, appears
in the ordinary event outcome; these adapters create no public account.
A retained provincial proposal under a form without an active aristocratic
profile quotes a zero-cost denial instead of throwing. Pure saved ancestry
validation also recognizes the existing codec's omitted character id and exact
derived royal-member id. It repairs neither the input nor explicit conflicting
identities; current recognition votes survive ordinary compact save restoration.

| Reader | Exact arguments | Meaning |
| --- | --- | --- |
| `political_selection` | `status`: `active`, `vacancy`, `contested`, `withheld`, `competing`, `minority`, `nomination`, `losing_lord` | Existing selection and constituency facts at the home county holder. Withheld support requires the same live principal; competing means multiple currently eligible candidates in an open vacancy. Nomination requires the protagonist's own current interest and the profile's admission timing. |
| `royal_recognition` | `status`: `active`, `withheld`, `competing`, `minor_candidate`, `stewardship` | Existing royal pool, exact current principal refusal, or the canonical capable minority stewardship projection. |
| `political_story` | Either story selector above, plus `status`: `pending_partition`, `blocked_agenda`, `active_agenda` | The original ruler can currently see the declared story choice. Pending partition requires its canonical terms to remain available. Blocked agenda requires an offered choice whose canonical quote is denied. |

Explicit story and choice ids validate against the effective candidate, including
same-import definitions. The alternative selector names `storyType` as
`succession_partition` or `ruler_agenda`; `choiceKind` is `approve`/`decline` for
the former, or `agenda_priority`, `agenda_finish`, `agenda_defer`,
`agenda_stop_program` or `agenda_provincial_terms` for the latter. The selector
visits only already attached stories in canonical registry order and current
offered choices. It loads no date and creates no attachment. Binding freezes the
chosen story and choice ids, so a later stage or another available story cannot
replace a queued review's original source. Native shared events use this
selector without referring to unavailable dated definitions during partial loading.
Provincial negotiation is observation-only in this story adapter: it can certify
an actual blocked proposal, while direct spending retains the ordinary agenda
sheet. These event reviews offer its existing costless alternative.

Political selection and royal recognition use the `governments` observation
owner; story observation uses `story_tracks` and additionally requires government
observation. Public royal recognition retains the underlying `public_offices`
gate. Disabling observation fails closed, including negated conditions, without
disabling the underlying simulation.

`losing_lord` requires a living character who actually holds the household's home
settlement and backed another recorded candidate in a resolved selection. A
cached lord role, an unsupported rumor or the player's own holding is insufficient.
This household observation accepts any declared selection profile, including
independent imported crowns. A profile requiring unanimous support cannot
produce a resolved losing vote; the event never invents one to fill that gap.
The local friend bound by this conversation must be that same holder, whose
portrait accompanies the household's concern. The event observes that retained
vote; it invents no punishment, compensation or
continuing political mandate for the household.

## Identity, consent and continuity

Binding selects existing characters in deterministic canonical order and stores
their exact ids, source court, ruler generation, province and candidate/seat
references in the ordinary event context. Supplied and restored contexts never
recast a missing person. Quotes recheck that binding, current life, current
principal, eligibility, source story, generation and authority. Canonical commits
then re-quote the complete transaction, including funds, terms and stale facts.
Rejected reviews and cancellation change no state, money, RNG or UID. Automated
resolution uses the same commit or the event's distinct unconditional refusal.

Partition approval records only the player's own court authorization through the
existing story owner. Other living parties and the ordinary seasonal settlement
remain separate. This adapter excludes designated-successor grants and other
story operations that immediately transfer territory. A personal agenda priority
does not acknowledge an unrecorded political success. Household heir choices are
not political succession and are never substituted here.

The shared event confirmation retains participant portraits, costs, blockers,
Cancel, Back, Escape, focus and scroll. Durable outcomes use existing event and
transaction message descriptors. Literal event fields and `FB.T` review phrases
provide English fallback through the existing localization owners.

No save schema or envelope changes. Only ordinary canonical transaction state
and exact event contexts persist; quotes and reader answers remain transient.
Matching current-content saves restore without admission, payment, assent,
story replay or replacement people. Changed JSON fingerprints still reject.
These event invitations extend existing observation and political decisions;
the existing state-aware events, canonical reviews, kin recognition, elective
nomination and aristocratic recognition technology decisions remain **none**.
They add no independently gateable gameplay capacity.

## Event inventory and coverage

The five kin conversations are `kingship_kin_unspoken_assent`,
`kingship_kin_two_branches`, `kingship_kin_obligations_first`,
`kingship_kin_young_claimant` and `kingship_kin_lord_risk`. They observe withheld
recognition, competing adult kin, an open vacancy, minority and the active
constituency. The five elective conversations are
`kingship_crown_canvassed_names`, `kingship_crown_outside_house`,
`kingship_crown_quiet_refusal`, `kingship_crown_losing_household` and
`kingship_crown_promise_and_vote`: nomination, refusal, actual losing support and
competing qualified candidates.

The aristocratic conversations are `kingship_magnate_minor_terms`,
`kingship_magnate_royal_cousins`, `kingship_magnate_provincial_share`,
`kingship_magnate_steward_limits` and `kingship_magnate_agenda_objection`.
They observe the real royal pool, provincial recognition, capable stewardship
and a blocked offered agenda choice. The inheritance and retained-program
conversations are `kingship_regnum_partition_paper`,
`kingship_regnum_relatives_expect`, `kingship_regnum_agenda_resisted`,
`kingship_regnum_heir_household` and `kingship_regnum_partition_road`.
Every event has a state condition. Sixteen offer canonical reviews; the remaining
household conversations retain exact existing friends and personal Standing.
The losing-patron conversation uses the named `kingship_household_heard` chance:
Diplomacy improves a bounded chance of personal goodwill. Its preview is pure;
neither outcome changes votes, money, public authority or the election result.

The semantic pack fixture covers every event with positive/negative detached
states, including different government forms on the same household. The focused
succession review spec covers native decisions and independent ordinary JSON
imports, actual confirmation and canonical commits, explicit refusal,
cancellation, current and stale authority, disabled observations, repeated pure
reads, finite accounts and matching current-content restore. Definition rejection
retains input, live state, catalogue, storage, RNG and UID. Visual, device and
natural campaign acceptance remain owner review.

The independent river profile uses unequal weights and majority assent. Its
real admission, lawful vacancy, individual votes and canonical accession retain
a losing vote by the actual holder of a secondary household estate. That current
record makes the native household conversation eligible, without adding a
political history store or assuming that the unanimous native crown profile
can produce the same result.
Restore comparisons retain canonical records, balances, bills, payment stamps,
array order, RNG and UID. As in the existing public-account contract, only the
`necessary` and `reserveTarget` treasury forecasts refresh from current
commitments rather than form part of ledger equality.
