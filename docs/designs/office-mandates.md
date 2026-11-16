# Court office mandates

Optional `authorityOffices[id].mandate` delegates personal court business on the
existing appointment ledger. It grants no land, troops or private access to
public funds. Qualifications, public sources, remuneration and succession keep
their existing owners. The exact declaration and operation schemas are in
[MODDING.md](../MODDING.md#court-office-mandates).

Opted-in offices carry only the corresponding basic Ban, or no basic power for
civil warrants. Other basic powers, `homePowers` and public governor/fiscal roles
are rejected; these would introduce authority outside the declared delegation.

`FB.officeMandates.definitionFaults` uses the shared declarative validator against
the effective candidate catalogue. `review(state, actor, appointmentId,
operation, input)` is pure and detached. `commit(state, review)` recomputes the
whole decision before mutation, binding the original appointment, holder, court,
generation, terms, favor, availability, forces, targets and public funds. Stale
rejection spends nothing and consumes no RNG or UID. `snapshot` projects these
same facts for player presentation.

`command` controls the exact commissioned host plus optional bounded declared
hosts. Each host must still belong to the court or serve it through an effective
federate contract. Public commissions retain their source and ownership gates.
Map permissions read the same live authority; reviews use the ordinary route
planner. Revocation leaves existing routes to the ordinary army owner.

`negotiate` offers, refuses and renews listed service templates without land or
recognition awards. Positive obligations independently require `pay`. Both
parties need actual public accounts; private cash cannot substitute for them.
Reviews disclose initial payment, one season of reserve and continuing seasonal
pay. The ordinary contract owner requires bilateral current-generation consent,
pays initial support once and later seasons once, and handles breach, release
and renewal. Optional `publicPayer:true` retains this account requirement after
the officer leaves service.

`propose` records one bounded third-person appointment intent. It grants no
office. Only fresh lawful court acceptance invokes the Roman or public owner,
retaining qualification, occupancy, productive source, capacity, cost and home
authority checks. Refusal grants nothing. Officers cannot promote themselves
through this route.

Favor reuses existing person-specific patron standing: ordinary court Standing
for the protagonist, realm favor for an NPC ruler serving its liege, and that
NPC's own recorded local institutional standing otherwise, defaulting to neutral
zero. It never borrows the player's reputation or creates a new favor pool.
Suspended appointments reserve their seats and public source shares; a temporary
favor loss cannot create overlapping commissions when authority recovers.
Finite tenure caps rather than extends a shorter public or annual commission.
Lost favor and temporary unavailability suspend acts and command while retaining
the appointment. Recovery may restore an otherwise live mandate. Death, expiry,
lost scope and removal retain ordinary lifecycle rules. Appointer succession
requires the existing confirmation transaction where declared, retaining the
original id, holder, term and mandate generation without another fee.

Only the lawful court dismisses the holder. The household may acknowledge loss,
request eligible reaffirmation or use a declared acclamation response within its
dismissal window. Acceptance restores no authority. Future office pay ends;
accepted court contracts and public arrears retain their owners. Private
property and cash remain separate.

Acclamation records a contested claim using the declared office and army
legitimacy source. An actual commissioned host supplies its own recognition.
Other courts, cities, armies and religious principals retain independent support;
the candidate cannot cast their assent. Support counts distinct effective
issuers and requires all declared mandate kinds. Renunciation withdraws only
the original army support. Recognition alone never installs a ruler.

Lawful accession requires an actual vacancy or the incumbent court's consent to
abdication. Public courts additionally require ordinary officer admission and
the public recognition owner's selected candidate. Existing accession/ruler
transactions install that person. Protagonist accession uses ordinary realm
absorption, retaining the real public account separately from private cash and
keeping the original service appointment and claimant history.

A declared Roman dispute moves only eligible declared hosts into a landless
ordinary-war banner. It creates no levy, treasury or dynastic household. Real
soldiers, equipment and provisions remain on their original records; defecting
federate service breaches through its ordinary owner. Lawful spending and
proposal powers end. Ordinary movement, fighting, supply and capital occupation
determine the result. Lost candidature, changed court generation, withdrawn
support or destroyed forces fail the bid, as do withdrawal and white peace.
Valid victory uses the ruler owner without a separate county conquest award.
Surviving defeated hosts return to their former institutions with actual losses.
Ordinary standing-force terms and peacetime demobilization still govern those
hosts; the mandate does not extend their service.
Public courts use their public recognition procedure rather than this Roman
dispute adapter. No result restores a revoked mandate.

The free 476 household in the Dalmatian court's territory seeks a commission when a
real host exists; it receives no opening office or public funds. The warrant is
a gameplay abstraction, not a claim about every historical military count.
The earlier [Notitia Dignitatum](https://sourcebooks.fordham.edu/source/notitiadignitatum.asp)
provides office and commissioned-force context, not an exact roster for 476.
Favor thresholds, fees, deadlines and resolution conditions are simulation
choices. The independent ordinary `office-mandates-lantern.json` import varies
180-day continuing terms, public commissions, a command-only captain, a civil
proposing clerk and payment terms through the same owners. Empty literal
`householdTracks_imperial_service` is registered before story compilation and
discovered by the existing household-track extractor.

Offices & Legitimacy and Public administration expose shared mandate reviews
with portraits, fact/action cards, labeled native selectors and retained modal
navigation. Powers, favor, term, public funds, private property, commitments and
dismissal/claim risks are visible before confirmation. Chrome uses `FB.T`; office
display fields keep structured owners. No rendered prose is saved.

Optional schema-1 `appointment.mandate` retains the exact declaration key,
original institution and generation, and bounded response/proposal/claim
provenance. It adds no ledger, envelope or subsystem version. Detached validation
rejects missing opted-in terms, changed definitions, unknown fields and broken
references. Matching load–save–load preserves appointments, funds, hosts, RNG and
UID without replay. Referenced people remain retained. The seasonal authority
scheduler uses these same reviews for AI court proposal acceptance, dismissal,
delegated consent, NPC proposals and acceptance of loss. It manufactures no
other principal's recognition or historical winner.

Technology impact `court_office_mandates` is **none**: relationships, authority,
support and resources govern service; ordinary military/material gates remain.
Focused coverage is `tests/e2e/specs/office-mandates.spec.js`.
