# Works and technology events

The works pack contains 24 practical decisions for high-medieval campaigns in
1204–1215. Eligibility reads current finite accounts at the protagonist’s actual
county. It adds no facility, supplier, stock, resource, demand, worker or buyer
money to a campaign. Fresh 867 and 1066 campaigns are outside its explicit era
and year window. The period is a narrative scope, not an installation inventory
or a claim that a process was invented then.

Decisions concern short inputs, owned delivery, paid batches, unavailable labor,
processing funds, completed work, optional learned recipes, funded and unfunded
buyers, next-stage enterprise work, empty stores, paid water service, competing demand,
existing reservations, seasonal grazing and care, fish drying, milling
construction and maintained maritime invoices. Local season policies and existing
operation metadata distinguish those uses; terrain and broad market baskets do
not establish a resource or a typed material. Work scheduling reflections use the
ordinary stewardship chance policy and grant no materials or labor.

## Event inventory

| Event id | Observed account | Review |
| --- | --- | --- |
| `works_input_short` | Input shortage | `production_exchange` |
| `works_owned_delivery` | Owned finite delivery | `production_exchange` |
| `works_reserve_batch` | A funded stored batch | `production_batch` |
| `works_processing_purse` | Processing funds short | `production_batch` |
| `works_late_worker` | Unavailable original worker | `production_batch` |
| `works_finished_work` | All paid work recorded | `production_batch` |
| `works_hold_inputs` | Pending input reservations | `production_batch` |
| `works_new_recipe` | Known optional recipe | `production_batch` |
| `works_seller_waiting` | Buyer funds short | `production_exchange` |
| `works_buyer_ready` | A funded finite sale | `production_exchange` |
| `works_boat_upgrade` | Existing enterprise next stage | `maritime_operation` |
| `works_dry_cistern` | Empty connected storage | `building_operation` |
| `works_water_route` | Paid conserved storage | `building_operation` |
| `works_service_due` | A fundable finite service | `building_operation` |
| `works_shared_demand` | Another funded shared demand | `building_operation` |
| `works_water_reserved` | Existing water reservations | `building_operation` |
| `works_pasture_open` | A lawful grazing window | `seasonal_operation` |
| `works_pasture_care` | Missing local care | `seasonal_operation` |
| `works_drying_window` | A permitted drying window | `seasonal_operation` |
| `works_drying_stock` | Actual allocatable dried stock | `seasonal_operation` |
| `works_boat_invoice` | Completed paid material work | `maritime_operation` |
| `works_mill_now` | Knowledge and ordinary siting | `works_construction` |
| `works_boat_complete` | An unchanged payable invoice | `maritime_operation` |
| `works_boat_release` | A pending material reservation | `maritime_operation` |

## Registered observation and review surfaces

The pack declares the optional `event_works` observation system with owner
`works`, enabled by default. The ordinary system layers may disable these event
readers and reviews without changing the underlying simulations. A disabled
reader fails even under negation. No new moment is needed: all decisions read
existing accounts, and no observer publishes or replays a transaction.

All argument objects reject unknown fields and reserved keys. Optional identifiers
use lowercase stable ids of at most 80 characters. Static catalogue references
resolve against the detached effective candidate, including same-import records.
A missing live assignment returns false or an unavailable review. Optional fields
preserve existing event declarations and canonical transactions.

| Reader | Required arguments | Optional arguments and meaning |
| --- | --- | --- |
| `works_payer` | `minimum` (finite 0–1,000,000) | Living, free adult protagonist with that much actual private money; this grants no property authority. |
| `production_account` | `status`: `ready`, `inputs_short`, `labor_unavailable`, `funds_short`, `technology_ready`, `pending`, `finish_ready`, `cancellable`, `stock` | `countyId`, production `siteId`, catalogue `recipeId`; `goodId` and `minimum` (1–10,000) narrow available stock. Original owned assets and canonical recipe/work quotes remain authoritative. |
| `production_exchange` | `operation`: `buy`, `sell`, `transfer`; `quantity` (1–10,000); `status`: `available`, `funds_short`, `stock_short`, `demand_spent` | `routeId`, `goodId`, `countyId`. Reads actual lots, finite route demand/budget and the original buyer’s money and reserves. |
| `works_resource` | `unit`: `water`, `grazing`, `launching`; `status`: `available`, `exhausted`, `stored`, `reserved`, `used` | `sourceId`, catalogue `profileId`, `kind`: `flow`, `storage`, `access`, and `minimum` (1–1,000,000). Observes the existing local resource account; observation grants no rights. |
| `works_water` | `status`: `ready`, `active`, `dry`, `demand_busy`, `unfunded` | `assignmentId`, catalogue `profileId`, `countyId`, `mode`: `store` or `use`. Uses actual bound assets, connected stores and paid shared-demand receipts. |
| `works_season` | `status`: `open_ready`, `active`, `care_unavailable`, `out_of_season`, `allocate_ready`, `stock_expiring` | `assignmentId`, catalogue `profileId`, `resourceUnit`: `water` or `grazing`. Reads local kinds, original care, terms, finite resources and stock. Expiring means available stock with at most two turns remaining. |
| `works_maritime` | `status`: `prepare_ready`, `pending`, `complete_ready`, `launch_unavailable`, `funds_short` | `assignmentId`, catalogue `profileId`, `target`: `new` (default) or `upgrade`. The target selects preparation; completion and cancellation retain the original invoice. Only the existing household invoice owner is supported. |
| `works_construction` | `status`: `ready`, `technology_missing` | `buildingId`, matching `profileId`, `countyId`, `technologyOnly`. Reads ordinary nonfort construction choices and exact technology requirements. |

County defaults are the event’s existing `locationId`, otherwise the protagonist’s
current county. Production reviews retain the original asset owner represented by that
protagonist. Exchange, water, season and new maritime reviews choose only a
current holder represented by the protagonist. Existing maritime invoices retain
the original household actor. The ordinary original-owner cancellation remains
available after property authority is lost; another controller cannot act as the
former owner. Resource observation can
also see other actual uses of the local source, but grants no operation authority.
Missing production configuration never counts as a shortage or as stock.

| Review type | Arguments | Canonical owner |
| --- | --- | --- |
| `works_construction` | Optional `buildingId`, matching `profileId`, `countyId`, `technologyOnly` | `buildingProfiles.quote/commit`, including the default unprofiled definition; ordinary player, baron and realm construction remain the payment owners. Strategic forts retain their separate path. |
| `production_batch` | `operation`: `reserve`, `finish`, `cancel`; optional `countyId`, `siteId`; reserve alone permits `technologyOnly`, `recipeId` and `disposition`: `store` (default) or `use` | `production.quote/commit`. Workdays remain on the ordinary day action; events cannot perform them. |
| `production_exchange` | `operation`, `quantity`; optional `routeId`, `goodId`, `countyId` | `productionEconomy.quote/commit`, for purchases, sales and owned transfers with the same finite accounts and declared outlet terms. |
| `building_operation` | Optional `assignmentId`, `profileId`, `countyId`, `mode`, `when` (one of the water reader statuses, used only to select the original binding) | `buildingOperations.quote/commit`; exact route, resource rights, shared demand, materials, work price and prepaid upkeep remain binding. |
| `seasonal_operation` | `operation`: `open`, `allocate`; optional `assignmentId`, `profileId`, `resourceUnit` | `buildingSeasons.quote/commit`; opening creates no output or paid service, and allocation consumes an actual eligible lot once. |
| `maritime_operation` | `operation`: `prepare`, `complete`, `cancel`; optional `assignmentId`, `profileId`, `target` | `maritimeWork.quote/commit`; prepare reserves completed paid work, complete uses the unchanged private invoice and actual launching capacity, cancel releases materials without refunding processing. |

Reviews bind an exact `operator` context participant and portrait card. Exchanges
also require an exact `counterparty` context participant and card, even for an
owned transfer where both identities coincide. Trusted binding projects only
existing people, original actor/generation, physical asset and source record.
The JSON context’s `worksSource` retains those identities, including selected
batch, lot or invoice ids where needed; it is provenance, not another authority
or inventory store. Supplied/restored participant maps are authoritative and are
never recast. A vanished source, changed holder, generation, original person or
asset denies the old context. Actual transaction terms are quoted again and the
complete reviewed envelope must match immediately before commit.

Each review has its own unconditional refusal option and no parallel effects or
chance. Manual confirmation and automation call the same canonical owner.
Automation takes that declared refusal when the review is unavailable. Cancel,
Back and Escape retain the shared mounted event, portraits, disclosures, scroll
and originating focus. Cancelling confirmation does not resolve the event or
spend resources. Rejected or stale confirmation changes no accounts, RNG or UID.
Maritime feasibility probes leave unchanged generator and identity counters untouched.
Unfunded water quotes retain their actual required work and upkeep price.
Terms disclose actual costs and commitments using existing localized owners and
literal translation calls; no rendered prose or quote cache is saved.

## Conservation and persistence

All accounts, receipts and identity markers retain their existing owners and
versions. Construction may review a default definition as well as a selected
profile, using the same ordinary purchase and reserves. Its quote uses the actual ordinary works payment account, including protected
public funds for an explicitly preserved adopted treasury. Private money cannot
substitute for that account. Quotes work on a detached state because existing
fiscal readers can normalize legacy fields.
Physical construction supplies no stock, worker or operating term. Batch
processing remains nonrefundable, uses actual inputs and paid action days, and
cannot count a worker twice. Existing resource rights, institutional permission,
local care, water routes, expiry and public/private payment separation remain
canonical. A declared market route supplies bounded demand, never buyer cash.
No event supplies outside consent or overrides a canonical refusal.

Matching saves retain spent resources, original people, property, queued review
contexts and exact mod fingerprints through repeated loads. Restore initializes
nothing and never replays a service, term, trade, workday or invoice. Unsupported
or malformed content still rejects before adoption. Released legacy declarations
remain accepted, with absent optional owners remaining absent. There is no save
envelope change.

These adapters expose existing decisions rather than new gameplay eligibility.
The existing `state_aware_events` and `event_canonical_reviews` technology decisions
remain **none**. Facilities, optional machinery and advanced recipes retain their
own existing technology reviews, exact missing technologies and ordinary
fallbacks; learning supplies no material or labor.

The independent `works-production-event-reviews-shore.json` and
`works-production-event-reviews-river.json` authoring examples use ordinary Mods
imports with different weather, quantities, processing prices/days, source
capacity, construction profiles and maritime terms. The focused capability spec
exercises native and imported consumers, canonical commits, payment/stock parity,
refusal, confirmation cancellation, denied/stale identity, disabled observation,
pure repeated reads and current-content round trips. Shared semantic fixture rows
exercise each native option’s live payer gate and period exclusion; the focused
spec separately exercises the finite-account transitions behind native triggers.
Visual, device and ordinary-play acceptance remain separate.
