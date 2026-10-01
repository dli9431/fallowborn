# 867/1066 baseline corpus and comparison journeys

Baseline code: dev e178db16cdd10a624c134dbebb75fcdd27df4db2, v1.184.0.
Capture record date: 2026-09-23. **Runtime acceptance is pending.** This document
records static save evidence and specifies owner-controlled measurements. It
contains no inferred timings or unobserved gameplay results.

## Existing local evidence

[save-manifest.json](save-manifest.json) records original byte counts, SHA-256,
format, bookmark, current date, tier, direct counties and workload metadata for
15 selected exports. Static decoding used the existing data-only FBS1/FBS2 reader
in tools/logistics_stress_save.py; game scripts were not executed. Compact default
fields were not repaired. Original exports remain untouched under ignored saves/.
Do not add megabytes of private campaign saves to the game distribution.

| Corpus id | Local source under saves/ | Static role | Export bytes | Evidence limit |
| --- | --- | --- | ---: | --- |
| S1 | fallowborn-save.txt | 867 bookmark, year 875, Serf at Barcelona | 593269 | Owner export; baseline import pending |
| S2 | fallowborn-save (1).txt | Same bookmark/seed, year 905, Serf | 832453 | Owner export; winter-to-spring timing must use an actual prepared capture |
| S3 | fallowborn-save (5).txt | Same bookmark/seed, year 949, Serf, 41 serialized armies | 1013969 | Long campaign candidate (82 years), not a 1066 start |
| S4 | v1.182.2-test-saves/01-wealthy-freeholder.txt | Edited Freeholder and successive household heirs | 5270321 | FBS1; prepared fixture, not earned progression |
| S5 | v1.182.2-test-saves/02-count-and-settlements.txt | Edited vassal Count, one direct county | 5270753 | FBS1; grant and succession review fixture |
| S6 | settlement-lordship-test-saves/03-landed-baron.txt | Edited Baron with a settlement and no county | 4498129 | Separates settlement from county authority |
| S7 | settlement-lordship-test-saves/08-count-delegated.txt | Edited Count and delegated hereditary barony | 4499433 | Baron succession and retained property fixture |
| S8 | settlement-lordship-test-saves/10-legacy-landless-baron.txt | Edited old Baron without concrete lordship table | 4497689 | Legacy migration case, not evidence of present office eligibility |
| S9 | fiscal-test-saves/01-king-crisis.txt | 867 bookmark, year 1076, tier 6, Council, no liege | 5036341 | Edited fiscal fixture; a year after 1066 does not make this a 1066 bookmark |
| S10 | logistics-stress-save.txt | Edited winter workload with 56 armies | 5113865 | Synthetic load; import, routes and year crossing need owner confirmation |
| S11 | settlement-performance/01-control.txt | Edited direct Count, year 905 | 4696829 | Control for settlement workload only |
| S12 | settlement-performance/03-dense-delegated.txt | Same origin with dense delegation | 5613077 | Deliberate stress case, not an ordinary mobile budget |

Intermediate owner exports (2), (3) and (4), years 923, 934 and 946, are also
hashed in the manifest. Select a single input hash for each before/after pair.
Chronicle-only files labeled 500/1000 years are historical exports, not full
campaign state; they cannot substitute for a supported long-campaign save.
The file named settlement-performance/yearly baseline.txt is an FBS2 save, not
a timing report. No boot or device timing is inferred from its filename.

FBS1 is base64 JSON and FBS2 is compressed. The large FBS1 fixture byte counts
cannot be used to claim a regression relative to compressed owner exports.
Record serialized UTF-8 JSON, local storage representation and portable export
bytes separately when measuring the running game.

## Phase 1 baseline adoption (2026-09-23)

The owner identified the saves and benchmarks in saves/ and explicitly requested
Phase 1. Use the existing corpus and the following benchmark inputs for later
comparisons; additional device/journey captures do not block implementation.
The manifest's phase1BenchmarkInputs records current byte hashes separately from
the original Phase 0 inventory, since the logistics fixture was revised.

- Settlement comparisons: 01-control, 02-dense-direct and 03-dense-delegated under
  saves/settlement-performance/, with the procedure in that directory's README.
  The dense pair has eight sites per county; the delegated case assigns six.
  Shared date, RNG, characters and population make this a bounded scaling probe.
- Annual starting save: saves/settlement-performance/yearly baseline.txt.
- Revised logistics stress: saves/logistics-stress-save-stage3.txt, described by
  saves/logistics-stress-save-stage3.json. Current SHA-256 is
  8c87170bb2bb389234c4312518ccc1f8b11e91aff10c7ab049dc7982b2678c54.
  Its metadata specifies winter 949, turn 29790, 53 hosts, 134100 soldiers and
  260 accounts. It schedules 53 transfers/day for 90 days (up to 4770 arrivals)
  and prepares funded annual construction. Those are configured workloads,
  not measured results. The metadata explicitly supersedes earlier UI samples
  and warns that older timings are not matched baselines for this changed hash.

The Phase 1 spec starts real 867 and 1066 games through their start codes and
covers same-turn political transitions and save restore. Benchmark execution and
mobile comparison remain owner-controlled; no timing result is inferred here.

## Additional owner captures

All 15 inspected exports explicitly identify the **867** bookmark. A genuine
1066 export is still required; this is not a claim that no other local file
contains one. Capture both a fresh 1066 campaign and a progressed landed campaign,
with start.id preserved. Never relabel an 867 save or simply change its date.

Other required captures: active Estates decision; living landless bishop or other
personal office; an appointed military commander; religious head/vacancy or papal
schism; a sovereign government with normal funds; actual pre/post succession;
a supported old/modded save with its definition fingerprint; and cold boot,
year-boundary, storage and mobile/iframe measurements. S9's Council field alone
does not prove that a Council decision is active or usable after restore.

Place new owner captures under saves/476-baselines/ with a manifest of hashes,
code commit, bookmark, setup provenance, environment and capture date. Keep source
exports immutable. Separate derived fixtures from natural-play exports. Add a
tracked summary/evidence location here once captured; do not publish private
saves merely to close a documentation checkbox.

## Journey matrix

Run every applicable journey from both 867 and 1066 on the baseline and again on
the candidate. Reload the identical source before each alternate branch. Existing
spec files below are relevant coverage, not claims that every one already covers
both bookmarks or the entire journey. Any missing parameterization belongs in
the corresponding Phase 1 migration commit with focused runtime dependencies.

For each capture preserve input/output save hashes, RNG state, action sequence,
actor/target ids, owner and holder maps, ruler member/generation, permission and
blocker, shown costs, actual resource deltas, office/consent changes and queued
scripted identities. Stable values must compare exactly; performance compares
repeated measurements under the same environment. Record exceptions explicitly.

| Id | Setup and journey | Expected comparison | Existing coverage in tests/e2e/specs/ |
| --- | --- | --- | --- |
| B1 Landless local authority | Fresh commoner and S1/S4. Open home county, ruler and freedom/progression preview; return without accepting. | County holder, sovereign and local ruler remain distinct from personal station. Pure previews preserve state/RNG and displayed costs; ordinary sheet court-fill is recorded separately. | interaction-cards, serf-freedom, serf-opening-integration, start-progression |
| B2 Settlement vs county | S6/S7. Review grant/construction, cancel, then grant an eligible non-seat site and compare. | Site holder changes only on confirmation; county holder/owner and unrelated property remain. Construction and revenue follow the correct holder. | settlement-lordship, settlement-lordship-grants, settlement-lordship-economy, excess-land-grants |
| B3 Vassal vs sovereign | S5 and an owner-captured sovereign. Open Governance and liege sheets; review fealty/independence or title recognition. | Immediate liege, top sovereign, direct counties and subtree agree; same eligibility and price; titles alone grant no land. | governance, fealty-rank, crown-recognition, rank-access, rank-elevation |
| B4 Command and war | Landed ruler plus a separate landless military-command capture. Review muster/order/peace; save mid-campaign; reload. | Same recruitment counties, host owner vs controller, pay, campaign participants, truce and legal order choices. A commander receives no county from appointment. | life-paths, army-control-labels, army-muster-plan, vassal-war-laws, concurrent-campaigns, war-participants-truces |
| B5 Succession | S4/S7 and a captured reigning ruler/compact court. Retire/die through ordinary play; repeat after reload. | Same heir, ruler generation, holdings, treasury, office expiry/continuity and private family links; no duplicate character or grant. | gentry-succession, eager-courts, identity-lookup-performance, settlement-lordship, succession-relation-labels |
| B6 Council/Estates | A funded sovereign with a real Council motion and a vassal with an active Estates session. Review vote/appointment, cancel, confirm. | Same constituency, consent threshold, seat holder, authority, aid/scutage and payments. Compare both acceptance and refusal. | politics, political-choice-step-6, policies, commitments, institution-modifiers |
| B7 Religious authority | Capture a landless bishop, recognized head and explicit vacancy; where supported include a papal schism. Open character/realm sheets; restore office or succeed. | Spiritual office, recognized claimant and territorial realm remain distinct; no county grant or conversion merely from recognition. | papacy, religions, religious-daily-performance, conversion, religious-settlement-policy |
| B8 Justice and conversion | Baron and Count saves; eligible local target, foreign/superior target and actual captive. Review arrest/sentence; convert one actor. | Same jurisdiction and custody, support/Standing costs and blockers. Personal conversion preserves county/site communities. | ruler-justice, household-authority, community-conversion, county-communities |
| B9 Tax and grants | S5/S7/S9 plus normal funded sovereign. Compare fiscal and grant previews, a season, and a confirmed award. | Same payer, beneficiary, price, dues, treasury movement and upkeep; no payment from a read or double charge after reload. | realm-government, ai-treasury, ai-treasury-transfers, fiscal-crises, finance-collateral |
| B10 Long campaign and restore | S3 plus genuine progressed 1066, one older save and supported mod definitions. Import, export/reimport, advance through a year boundary. | Same political/personal facts, communities, court identities, wars and scripted identity/order. Repeated repair is idempotent and records warnings rather than inventing authority. | storage, mods, history-retention, determinism, simulation, journeys |
| B11 Same-turn changes | During each converted operation's review, change holder, appointee, liege, ruler generation, faith or restore another same-turn save. | Fresh projection and stale confirmation rejection before funds/RNG; dependent caches rebuild once per logical transaction. | Add focused cases to the migrated operation's spec; existing identity-lookup-performance and revolt-query-performance provide examples |
| B12 Navigation and mobile | Home/realm/office/grant/war lists to modal and Back, Cancel, Not now; repeat with keyboard/touch. | Same position, disclosure, focus, visible costs and touch access. | modal-navigation, interaction-cards, ui-conventions, land-panel-layout, war-sheet-ui; real-device evidence remains manual |

Spec names in the table omit the .spec.js suffix. Follow docs/TESTS.md: add or
update meaningful tests when a consumer changes; register its focused inputs via
dependsOnRuntime; keep scenario setup local and import shared leaf journeys.
Do not change universal navigation or fixtures to introduce a 476 baseline path.

## Owner measurements

Measurements are owner-run only under AGENTS.md. No agent-run browser, profiler,
server, syntax gate or test harness is authorized by this capture protocol.
The approved harness and built-in localhost/file profiler are documented in
[TESTS.md](../../TESTS.md#profiling-a-reported-save). Do not create a second runner.

Use one desktop reference device, one real Android browser and one real iOS
browser, recording exact hardware, OS/browser version, viewport, device pixel
ratio, power state and storage availability. Compare file:// where supported,
served Chromium and the itch.io iframe; record unsupported device/origin
combinations explicitly. Browser emulation is not a real-device result.

For a reproducible before/after pair, preserve the same input save, bookmark,
locale, enabled mods, automation preferences, court eagerness, music state,
event decisions, origin and device. Repeat three cold runs and three warm runs;
retain individual observations and report median and maximum. Treat a small
sample as descriptive, not a statistical performance guarantee.

| Measurement | Capture method | Current baseline |
| --- | --- | --- |
| Cold title boot and interactive readiness | Browser recording from navigation to painted usable title and bootReady; separate asset/cache condition and origin | Pending |
| New-game and import readiness | Same deterministic start or hashed export; record completed playable frame and restore warnings | Pending |
| Ordinary season | Built-in fastForwardTiming report from identical paused save/season; preserve whole report and workload counters | Pending |
| Year-boundary season | Start from an actual winter save; confirm worldTick.calls is present; preserve selfMs, totalMs, maxMs, batches and simulated days | Pending |
| Serialization/storage | UTF-8 serialized JSON bytes, exported bytes, stored representation and available quota; capture serialization and deferred completion separately | Static portable-export sizes only; runtime pending |
| Memory and responsiveness | Same device/browser tooling, workload and observation point; record unsupported measures rather than invent a heap estimate | Pending |
| Mobile and iframe interaction | B12 on real devices, orientation change, touch, modal return, storage reload; screenshots and observed failures | Pending |

Reports' parent totals include child work: do not sum parent and child totalMs.
Use selfMs for attribution. Built-in reports exclude deferred paint and IndexedDB
completion; use the existing opt-in save-season-profile diagnostic if the owner
needs those and record its instrumentation separately. The diagnostic's event and
automation settings must match across comparisons. A warm cache and changed war
count can alter work; preserve the counters, not just elapsed milliseconds.

Do not set arbitrary optimization targets before measuring. Any repeatable
regression under comparable conditions gets investigated; an approved budget or
intentional change must be recorded with its owner decision and evidence. Phase 1
requires unchanged political outcomes even if timing improves.

## Capture receipt template

Copy one receipt for each input/environment/journey combination:

~~~text
Capture id:
Date and owner:
Baseline commit/version:
Candidate commit/version (comparison only):
Input path and SHA-256:
Bookmark / current date / turn:
Natural export or edited fixture, and preparation:
Device / OS / browser / viewport / DPR:
Origin / cache condition / locale / mods / preferences:
Journey id and exact action/choice sequence:
Before/after political facts and RNG evidence:
Shown costs / paid deltas / blockers:
Raw timing reports and counters (three runs):
JSON / export / stored bytes and memory evidence:
Mobile/iframe observations and evidence paths:
Import/restore warnings:
Comparison result / explanation of any difference:
Accepted by / date:
~~~

Phase 0 closes when the missing inputs and measurements have receipts, every
journey has applicable 867/1066 coverage or a documented applicability exception,
and the owner accepts the comparison corpus. Until then these are prepared
baselines and static evidence, not a completed runtime gate.
