# Service bargains and neighboring households

The `federate_life` pack has twenty events. Twelve late-antique conversations
cover 450–650; the four Italian opening conversations narrow that to 476–493.
Eight hosted-following conversations cover 1096–1250. All have explicit era
membership and year windows, excluding fresh 867 and 1066 campaigns. These are
conditional situations, not dated orders or evidence that an attack, debt,
service call or eviction occurred.

Soldiers and followers need pay, secure terms and homes; neighboring households
need provisions, working land, shared facilities and reliable help. Every event
binds a local household neighbor. A diplomacy-based chance affects only personal
Standing. The unconditional second option declines involvement without a public
commitment. Twelve events additionally offer a canonical transaction review;
opening it and cancelling spend nothing. The existing event confirmation retains
portraits, disclosures, focus and scroll on Cancel, Back and Escape.

| Events | Existing review |
| --- | --- |
| `federate_pay_table` | Consent to an outstanding service offer |
| `federate_changed_terms`, `federate_empty_purse`, `federate_term_calendar`, `hosted_changed_price`, `hosted_expiry_question` | Reopen service terms for both courts' fresh consent |
| `federate_season_call` | End the selected service commitment |
| `federate_allotment_neighbors`, `federate_settlement_copy`, `hosted_land_request` | Existing moving-court county claim |
| `federate_departure_bundle` | Authorize an attached civilian migration |
| `hosted_refuge_question` | Request places from an attached refuge provider |
| `federate_pay_rumor`, `federate_boundary_stone`, `federate_shared_well`, `federate_lodging_door`, `hosted_shared_oven`, `hosted_guest_debt`, `hosted_bad_season`, `hosted_civilian_route` | Personal conversation only |

Government form is an audience condition, not service authority. Contract and
settlement review events require actual current rulers. Other conversations
remain available to households. Refuge and civilian-route conversations instead
observe an attached story of the relevant type. They never attach a story or use
an unloaded date's declaration. An ordinary household can request refuge; it
cannot consent for other adults, authorize public spending or offer a place.
The two term-calendar events additionally require an effective service contract
with at most thirty days remaining. The existing `federate_contract` reader's
optional `endsWithinDays` (1–360) observes that live boundary without ending or
renewing the commitment; omitted fields retain the original reader behavior.

The eight conversations without a public review use `federate_host_household`:
`status` is `offered`, `active` or `breached`, and optional `realmId` selects the
service polity. A living household must be home and physically present beside a
halted, surviving host of an existing contract between living courts. Active
service requires canonical effectiveness. The county can belong to the host's
patron: local households need no following membership or command authority to
hear these concerns. The reader grants no lodging, water, field or service right.

## Typed review routing

These adapters register through the shared event review and state reader APIs.
They select existing records only. An omitted instance selector requires exactly
one matching source; ambiguity fails closed. New contexts bind the source and
exact existing people. Supplied/restored context identities are authoritative:
missing, dead, replaced or unavailable parties cannot be recast. Confirmation
rechecks the detached canonical quote, current protagonist and exact parties.
Automation obtains and commits that same quote or takes the declared refusal.
No review quote or eligibility cache is saved.

`federate_contract` review arguments are `action` (`consent`, `renew`, `release`)
and optional `contractId` (1–200 characters). Renewal requires `extensionDays`
(1–1440), extending the later of the live turn and old expiry; optional
`payPerSeason` is finite, 0–100000. Those fields are rejected on other actions.
Consent alone permits optional boolean `publicPayer`; only the patron can select
it. The current protagonist must rule one of the existing contract parties.
Required context portraits are `patron` and `captain`. The corresponding
`federate_contract_review` reader accepts the same arguments and tests current
eligibility without committing.

Consent uses `authorityConsentContract`: one court cannot approve for the other,
and the second approval transfers any unpaid initial amount from the actual
finite payer. Renewal uses `contractRenegotiationQuote` and
`authorityRenegotiateContract`, resetting approvals. Release uses the existing
contract transition, preserving the closed record. Seasonal payment remains with
the authority owner. A failed payment is a breach, not a newly created debt.

`federate_settlement` accepts optional `migrationId` (1–200 characters), with
the same two portraits. Its `federate_settlement_review` reader observes the
existing `federateSettlementQuote`. Confirmation calls
`federateResolveSettlement` only for the current moving court's ruler, an arrived
living host and a consented county award or a county already won. The canonical
claims session owns settlement, government adoption and contract closure. Events
never move a host, grant a county, settle a people or alter a contract through a
parallel effect.

`civilian_migration` accepts `action` (`authorize`, `decline`) and optional
`storyId` (1–80 characters), with required `civil_ruler` portrait. Its matching
`civilian_migration_review` reader tests an existing offered story choice.
Confirmation uses `stories.quote/apply`. Current peaceful control, prerequisites,
date window, original cohort identity and conserved seasonal population batches
remain with the agreement owner. No army or household party is moved.

`household_refuge` accepts `action` (`request`, `consent`, `authorize`, `offer`,
`enter`, `decline`, `leave`), optional `storyId` and `partyId` (1–80 characters),
and optional `requestId` and `personId` (1–200). `partyId` selects requests only;
`requestId` selects later actions; `personId` selects individual consent only.
The adapter resolves the current dynamic menu to one exact full-group choice;
it never chooses an arbitrary first request, person or care group. Required
portraits are `refuge_host`, `refuge_ruler` and `refuge_guest`. The matching
`household_refuge_review` reader is pure. Ordinary named-party consent, separate
shelter consent, civil authorization, institutional offer, finite capacity,
prepaid public cost and actual local entry retain their own transactions.

`attached_story_type` observes an existing unresolved `household_refuge` or
`civilian_migration` attachment, without claiming that a choice is allowed.
Explicit story references validate against the detached candidate declaration;
when the event or pack specifies `bookmarkIds`, the story must be reachable in
each specified date's actual retained or fresh composition. Runtime selection
always requires the actual campaign attachment. Legacy `story_choice`
declarations retain their static choice validation and exclude day-advancing
operations; validation no longer compiles unrelated dated graphs.

The federate adapters retain the `event_federates` availability gate; story
adapters/readers retain `event_story_tracks`. Disabling observation does not
disable ordinary simulation, and negation cannot bypass it. Cancellation and
denied or stale confirmation mutate no state, account, RNG or UID. Current-content
restore retains commitments and source context without attaching, paying,
consenting, moving or dispatching again. Exact JSON fingerprints remain required.

Technology impact remains **none** under `state_aware_events` and
`event_canonical_reviews`: these are observation and entry points to existing
capabilities. The existing service, moving-court settlement, temporary-refuge and
civilian-evacuation decisions and their underlying gates remain authoritative.

Semantic rows cover every event through the shared pack validator. The focused
federate-event-reviews spec covers native consumers and an independent ordinary
JSON world, real reviews and commits, refusal, cancellation, authority and funds,
disabled systems, pure repeated reads and exact current-content restoration.
