# 476 Phase 0: baseline and decisions

Date: 2026-09-23. Source: dev at e178db16cdd10a624c134dbebb75fcdd27df4db2,
FB.VERSION 1.184.0. This is the first phase of the
[476 implementation plan](../v2-476-phased-implementation.md).

Status: inventory, decisions and baseline inputs recorded. On 2026-09-23 the
owner identified the existing notes/ saves and benchmarks and requested Phase 1.
Those inputs are adopted for comparison; additional runtime/device captures do
not block that implementation. Static export inspection is not a passing journey.

## Deliverables

| Work | Artifact | Status |
| --- | --- | --- |
| Locate existing authority readers and writers, assign system owners and migration destinations | [Authority inventory](authority-inventory.md), [source reference ledger](authority-references.csv) | Static audit recorded; initial migration documented in Phase 1 |
| Catalog representative old saves and define comparison journeys | [Baselines](baselines.md), [save manifest](save-manifest.json) | Existing local exports cataloged; missing captures explicitly listed |
| Cold boot, annual work, storage and mobile measurements | [Capture protocol](baselines.md#owner-measurements) | Owner capture pending |
| Choose commoner path, offices, recognition and eastern scope | [First scenario](scenario.md) | Design decisions recorded, with historical uncertainties separated |
| Define shared queries and durable state boundaries | [Authority contract](../../designs/authority.md) | Phase 1 API implemented; Phase 2 durable model remains proposed |

## Decisions for subsequent implementation

1. The first playable path is a **federate soldier near Ravenna**. It exercises
   command, pay, appointment and recognition independently of land immediately.
   Colonus and curialis paths belong to completion of the regional experience.
2. The opening is spring 476, before Odoacer's acclamation and the deposition.
   Romulus holds the western imperial office in Italy; Orestes exercises military
   command; Nepos maintains a rival western claim from Dalmatia. Basiliscus holds
   Constantinople; Zeno is a displaced claimant whose return is conditional.
3. Eastern diplomacy uses the existing map and explicit claimants. A recognition
   reply comes from its actual issuer; possession of Constantinople is a separate
   fact. No new world regions or automatic eastern field expedition are required.
4. Phase 1 preserves existing 867/1066 decisions, costs, order and RNG. It provides
   shared facts and pure reads over current stores. Generalized powers and new
   appointments are Phase 2 work; save-v4 publication waits for the complete release.
5. Reuse territory, ruler, settlement and political indices. Do not persist or
   independently maintain another county-to-authority table.
6. The initial legitimacy sources are army acclamation, imperial commission,
   succession claim, civic acceptance and church support. They have issuers and
   scopes; one numerical legitimacy score cannot replace them.

The source notes and limits behind decision 2 are in [scenario.md](scenario.md).
These decisions are implementation defaults, not claims that fictional player
choices happened historically.

## Gate and handoff

For runtime parity and release acceptance, supplement the existing baseline
inputs with: at least one genuine 1066 export; reproducible 867 and 1066 landed/landless,
vassal/sovereign, war, succession, Council/Estates and religious-office journeys;
a long-campaign save; cold and warm measurements; and real mobile/iframe results.
Existing edited fixtures are useful stress cases but cannot substitute for those
campaign and device captures. Do not manufacture measured results from file sizes.

The inventory assigns owners by subsystem rather than by person. Its lexical
ledger is deliberately a superset: display rank and geometry occurrences are
retained and classified in the review guide. It is a navigation aid, not a proof
that arbitrary mod code or indirect aliases have no authority dependency. Each
converted consumer must still be traced through its callers and mutations.

[Phase 1](../v2-476-phase-1.md) implements interaction-card/place reads, office/role
snapshots and the settlement grant adapter. Its behavior gate still needs
owner-run comparisons; implementation proceeds under the explicit request.

This phase changes documentation and records static evidence only. It introduces
no gameplay capability, technology gate, localization record, release version,
or playable 476 bookmark. Existing regression coverage is mapped in baselines.md;
no artificial gameplay test is required for these documentation changes.
