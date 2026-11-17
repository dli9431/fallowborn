# Shared event reviews

Events select trusted readers and canonical transaction adapters by id. Ordinary
JSON declarations contain only typed arguments; they cannot register code, write
state paths, supply consent or introduce another account. The existing industry
operation and story choice consumers retain their transactions and save records.

## Registration and validation

`FB.eventStateReaders.register` accepts `id`, `system` (the observation owner),
an object argument schema and a pure `read(state,args,context)` function. Review
owners register `owner`, an object `args` schema, pure `quote` and `details`
functions, canonical `apply`, and optional `report`. Both registries seal during
complete-engine definition validation. Registration metadata is immutable.

Both registrations optionally accept `systemId`, naming an exact system rather
than an observation owner. Without it, the existing unique `eventReaderOwner`
lookup remains authoritative; an owner string is never implicitly a system id.
Present malformed metadata rejects registration. Unknown systems reject candidate
definitions and cannot enable runtime reads or reviews. Disabled readers fail
even under negation. Adapters must retain the underlying transaction's own gates.

Event argument schemas receive the containing declaration as `context.event`,
alongside the effective candidate `context.data`. This also applies to lifecycle
requirements. Runtime schemas receive `runtime:true` and the bound event context
as `context.context`. Cross-field predicates remain pure and cannot cast people.

## Exact parties

A trusted review adapter may declare `partySlots:{slot:true,...}` with one to four
unique participant identifiers. Every slot requires an event participant with
`source:'context'`, `required:true`, and explicit inclusion in `participantCards`.
This ensures that named canonical parties have portraits even when the narrative
does not mention their tokens. The adapter still checks current life, authority,
source identity and procedural eligibility in its canonical quote.

Optional `bind(state,args,context)` projects existing people and immutable source
facts when creating a new event context. It returns null when unavailable, or a
JSON object with `participants` and any necessary source facts. Participant keys
must be declared by that adapter and identify existing characters. Binding may
not replace existing context facts. Multiple review options merge in declaration
order; conflicting facts or identities reject delivery. The hook must never
create a person, receipt, resource or commitment. System-moment delivery uses the
same pure binding before its existing-only participant checks.

A supplied participant map, including an empty map, is authoritative and bypasses
binding. Existing-only context checks do not bind missing parties. Queued/restored
identities therefore cannot be recast when a person or source disappears.
Quote envelopes include opted-in exact party ids in addition
to the original protagonist, arguments and detached canonical quote. Unopted
envelopes keep their existing shape. No review quote or eligibility cache is saved.

Manual resolution rejects missing, denied or changed quotes before event message
and participant preparation, then rechecks at the canonical commit. Automation
uses the same synchronous quote/commit or the declared unconditional refusal.
Cancellation and stale rejection spend nothing and consume no RNG or UID.

## Campaign-scoped periods

Event and pack periods optionally declare `bookmarkIds`, a nonempty unique list
of at most 64 known campaign bookmark ids. Event fields override pack fields as
with era/year metadata; both original declarations must validate. Eligibility
uses the saved `state.start.id`, never the live year or selected title bookmark
as an identity substitute. Missing or unknown identity fails closed. Unscoped
declarations retain their previous era/year behavior.

`validateEventPeriod(event,packs,context)` and
`validateEventPacks(packs,context)` expose pure candidate checks. Compilation,
random pools, queue/context delivery and option resolution share the period
gate. Year-pool caches also distinguish saved campaign id and revision. These
event-layer hooks do not change world composition, source loading or manifests.

## Presentation and coverage

Confirmation moves the existing participant cards beside the canonical terms.
Cancel, Back and Escape return those exact nodes to the event, retaining their
listeners, disclosures, scroll and originating focus. Character-sheet returns
retain the mounted confirmation. Mobile browser Back uses the same cancellation
path. Stale rejection restores the same event.
Successful outcomes retain those participant cards alongside the settled result;
portrait detail returns preserve the outcome's position and focus.

The focused event-review-foundation spec exercises the native permission review,
the independent ordinary JSON import, and a trusted owner fixture delegating to
the existing story transaction. It covers metadata rejection, event-aware
schemas, disabled and legacy systems, exact parties, pure stale/denied reads,
canonical payment parity, current-content restores, scoped caches and desktop/
compact confirmation returns. Fixtures remain development-only.

This foundation is observation and presentation over existing capabilities.
The existing `state_aware_events` and `event_canonical_reviews` technology-impact
decisions remain **none**; no new technology eligibility or save envelope is added.
