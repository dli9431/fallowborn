# Customary history retention measurements

## Method and scope

The focused `tests/e2e/specs/authority-retention.spec.js` cases use fixed starts, four directly staged 90-day boundaries and one annual authority pass. Each boundary invokes authority, local institutions, government-support decisions and tournament season hooks. This measures one staged year of those owners, not a full year of daily simulation. Long histories are staged directly with thirty annual observations per right; only the separate parity case runs daily simulation, for one 90-day season per compared trajectory.

Every size below is UTF-8 bytes from `TextEncoder().encode(JSON.stringify(value))`. These are uncompressed selected state values, not compressed save sizes or storage-quota measurements. An absent optional root is measured as `{}` (2 bytes) for comparison; those bytes are not actually saved when the root is absent. Counts are collection entries; mandate, selection and dues objects count as one record each. Tournament sample counts count people with sample windows, not individual quarterly samples.

Nested fields and customary histories are already included in their parent root. Do not add the nested tables to root totals. Growth shares use the named parent's byte increase; a dash means that parent did not grow. Negative shares represent shrinking fields. Scalar metadata, object keys, null slots and separators are shown as a residual so each parent reconciles exactly.

## Validation

[Focused CI run](https://github.com/dli9431/fallowborn/actions/runs/43159855518): seven passed, none failed or skipped. [Syntax check](https://github.com/dli9431/fallowborn/actions/runs/43159733051) covered the changed runtime and specification JavaScript; the final spec run also compiled the added measurement fields.

The cases assert exact per-right conservation of possession/disputed/abandoned totals, deterministic and idempotent folding, the exact 3600-day cutoff, off-boundary no-ops, permanent evidence retention, unchanged first-year authority, malformed-total rejection and repeated current-build save round trips. The 90-day replay compares complete serialized saves (including catalogue revision and mod fingerprints), RNG, UID and FBDATA with folding enabled versus deferred, using the same folded representation for comparison. Generated v3 envelopes on the retained 867 and 1066 baselines exercise released migration and load/fold/re-save/load; they are not historical owner exports.

The saved authority envelope and definition fingerprints are unchanged. Season timing, device acceptance and historical owner-export testing are outside these results.

## Root sizes after a staged year

| Start | Root | Opening bytes | After bytes | Growth bytes |
| --- | --- | ---: | ---: | ---: |
| mobile_household_476 | authority | 373089 | 929602 | 556513 |
| mobile_household_476 | localInstitutions | 49634 | 194386 | 144752 |
| mobile_household_476 | governmentSupport | 43839 | 181067 | 137228 |
| mobile_household_476 | tournaments | 2 | 2 | 0 |
| mobile_household_476 | chronicle | 547 | 66263 | 65716 |
| peroz_sasanian_476 | authority | 372170 | 917209 | 545039 |
| peroz_sasanian_476 | localInstitutions | 49634 | 190170 | 140536 |
| peroz_sasanian_476 | governmentSupport | 43839 | 181067 | 137228 |
| peroz_sasanian_476 | tournaments | 2 | 2 | 0 |
| peroz_sasanian_476 | chronicle | 607 | 64511 | 63904 |
| yaghi_siyan_1096 | authority | 8839 | 361562 | 352723 |
| yaghi_siyan_1096 | localInstitutions | 1508 | 2370 | 862 |
| yaghi_siyan_1096 | governmentSupport | 2 | 2 | 0 |
| yaghi_siyan_1096 | tournaments | 101 | 65221 | 65120 |
| yaghi_siyan_1096 | chronicle | 606 | 1318 | 712 |
| muhammad_1204 | authority | 11763 | 361271 | 349508 |
| muhammad_1204 | localInstitutions | 1983 | 1983 | 0 |
| muhammad_1204 | governmentSupport | 1725 | 4498 | 2773 |
| muhammad_1204 | tournaments | 101 | 65310 | 65209 |
| muhammad_1204 | chronicle | 456 | 731 | 275 |

## Mature history folding

The retention window remains 3600 days. History bytes include every retained history entry and the exact `retiredHistory` summary objects, including JSON wrapper overhead. Total authority bytes are reported separately. Strength, status, original ids, appointments, recognitions, contracts, receipts and government records remain unchanged by folding.

| Start | History before | History after (with totals) | Reduction | Authority before | Authority after | Folded possession / disputed / abandoned |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mobile_household_476 | 3449995 | 1205046 | 65.07% | 4183010 | 1938061 | 38025 / 9 / 1 |
| peroz_sasanian_476 | 3426007 | 1195914 | 65.09% | 4148285 | 1918192 | 37773 / 9 / 1 |
| yaghi_siyan_1096 | 1954295 | 664819 | 65.98% | 2207564 | 918088 | 21473 / 1 / 1 |
| muhammad_1204 | 1966295 | 668893 | 65.98% | 2218619 | 921217 | 21605 / 1 / 1 |

First-year observations remain inside the window and are not folded. These mature-history reductions do not imply a reduction of fresh first-year growth.

## Record disposition

| Kind | Classification and retention |
| --- | --- |
| Authority appointments, recognitions, contracts and receipts | Live commitments and settled history still read for scoped power, legitimacy, imperial succession, original commitments and duplicate payments. Retain all. |
| Authority rights and governments | Live jurisdiction, strength, status and current government state. Retain all original identities. |
| Possession, disputed and abandoned observations | Settled observations without evidence are no longer read by outcome rules after their turn. Fold only at or before the shared cutoff. Their existing ordered/clamped outcome remains in strength/status. |
| Evidence-bearing observations; establishment, revocation, recognition, tenure, judgment and unknown kinds | Retain provenance and permanent duplicate guards, including old evidence-bearing disputed observations. |
| Local institution standing, demands, consentRights, petitions and rightIds | Live counterparty/scoped-right state. Petition slots replace per subject, including retry and assent terms. No new lifetime cap. |
| Local institution history | Settled outcomes not used by live consent decisions; already bounded to 24 entries per institution. Keep that policy. |
| Government support scopes, members, mandate, selection, dues and agreements | Live constituency, nominations, current terms and commitments. Existing member/candidate bounds and replacing slots remain; expired agreements prune on new commitments. |
| Government support decisions | Live reserved-operation consent and its settled recent history. Existing twelve-entry rolling window remains. |
| Government support history | Settled outcomes not used by live mandate decisions; existing twelve-entry rolling window remains. |
| Tournament events and annual commitments | Live editions/return travel and recurring commitments. Existing concurrent capacities and close-boundary cleanup remain. |
| Tournament samples, starts and cursors | Live solvency/cooldown/rotation state. Four quarterly samples per eligible person; obsolete unreferenced owners prune. Existing policy remains. |
| Tournament summaries | Settled player-visible recent results under the existing summary cap. |
| Chronicle strings, entries and protagonist heads | Settled history still read by the complete journal and portable export. Retain it; the separate 300-entry log is only a presentation window. |

## Per-kind staged-year inventory

Each row reports opening to staged-year counts and bytes, plus its share of parent growth. Zero-growth kinds are included. Authority observation kinds form a separate nested table; their bytes are sums of entry objects, with array punctuation reconciled separately.

### mobile_household_476 / authority

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| appointments | 43 | 277 | 234 | 14610 | 96462 | 81852 | 14.71% |
| recognitions | 7 | 460 | 453 | 1729 | 123644 | 121915 | 21.91% |
| contracts | 2 | 2 | 0 | 807 | 903 | 96 | 0.02% |
| rights | 988 | 1748 | 760 | 306411 | 657470 | 351059 | 63.08% |
| receipts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| governments | 110 | 110 | 0 | 48367 | 49937 | 1570 | 0.28% |
| Scalar metadata / JSON structure | - | - | - | 1163 | 1184 | 21 | 0.00% |

### mobile_household_476 / authority.rights[].history (nested)

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| established | 988 | 1748 | 760 | 31616 | 57092 | 25476 | 18.16% |
| possession | 0 | 1316 | 1316 | 0 | 78960 | 78960 | 56.29% |
| disputed | 0 | 8 | 8 | 0 | 464 | 464 | 0.33% |
| recognition | 0 | 428 | 428 | 0 | 32098 | 32098 | 22.88% |
| Scalar metadata / JSON structure | - | - | - | 1976 | 5248 | 3272 | 2.33% |

### mobile_household_476 / localInstitutions

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| standing | 0 | 197 | 197 | 394 | 4482 | 4088 | 2.82% |
| demands | 985 | 487 | -498 | 11623 | 5450 | -6173 | -4.26% |
| consentRights | 286 | 286 | 0 | 3273 | 3273 | 0 | 0.00% |
| petitions | 0 | 195 | 195 | 394 | 110914 | 110520 | 76.35% |
| history | 0 | 183 | 183 | 394 | 34660 | 34266 | 23.67% |
| rightIds | 0 | 152 | 152 | 394 | 2445 | 2051 | 1.42% |
| Scalar metadata / JSON structure | - | - | - | 33162 | 33162 | 0 | 0.00% |

### mobile_household_476 / governmentSupport

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| scopes | 55 | 55 | 0 | 632 | 632 | 0 | 0.00% |
| mandate | 38 | 38 | 0 | 4522 | 4522 | 0 | 0.00% |
| selection | 38 | 38 | 0 | 8520 | 8520 | 0 | 0.00% |
| decisions | 0 | 152 | 152 | 76 | 132802 | 132726 | 96.72% |
| history | 38 | 38 | 0 | 5125 | 5125 | 0 | 0.00% |
| members | 114 | 114 | 0 | 16357 | 16357 | 0 | 0.00% |
| agreements | 0 | 0 | 0 | 76 | 76 | 0 | 0.00% |
| dues | 0 | 38 | 38 | 0 | 4616 | 4616 | 3.36% |
| Scalar metadata / JSON structure | - | - | - | 8531 | 8417 | -114 | -0.08% |

### mobile_household_476 / tournaments

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Scalar metadata / JSON structure | - | - | - | 2 | 2 | 0 | - |

### mobile_household_476 / chronicle

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| strings | 3 | 10 | 7 | 80 | 257 | 177 | 0.27% |
| heads | 1 | 1 | 0 | 209 | 209 | 0 | 0.00% |
| entries | 3 | 673 | 670 | 204 | 65743 | 65539 | 99.73% |
| Scalar metadata / JSON structure | - | - | - | 54 | 54 | 0 | 0.00% |

### peroz_sasanian_476 / authority

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| appointments | 43 | 275 | 232 | 14550 | 95247 | 80697 | 14.81% |
| recognitions | 7 | 445 | 438 | 1729 | 119395 | 117666 | 21.59% |
| contracts | 2 | 2 | 0 | 807 | 903 | 96 | 0.02% |
| rights | 988 | 1736 | 748 | 305547 | 651372 | 345825 | 63.45% |
| receipts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| governments | 110 | 110 | 0 | 48372 | 49106 | 734 | 0.13% |
| Scalar metadata / JSON structure | - | - | - | 1163 | 1184 | 21 | 0.00% |

### peroz_sasanian_476 / authority.rights[].history (nested)

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| established | 988 | 1736 | 748 | 31616 | 56680 | 25064 | 18.06% |
| possession | 0 | 1316 | 1316 | 0 | 78960 | 78960 | 56.90% |
| disputed | 0 | 8 | 8 | 0 | 464 | 464 | 0.33% |
| recognition | 0 | 414 | 414 | 0 | 31048 | 31048 | 22.37% |
| Scalar metadata / JSON structure | - | - | - | 1976 | 5210 | 3234 | 2.33% |

### peroz_sasanian_476 / localInstitutions

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| standing | 0 | 197 | 197 | 394 | 4440 | 4046 | 2.88% |
| demands | 985 | 493 | -492 | 11623 | 5522 | -6101 | -4.34% |
| consentRights | 286 | 286 | 0 | 3273 | 3273 | 0 | 0.00% |
| petitions | 0 | 189 | 189 | 394 | 107613 | 107219 | 76.29% |
| history | 0 | 178 | 178 | 394 | 33715 | 33321 | 23.71% |
| rightIds | 0 | 152 | 152 | 394 | 2445 | 2051 | 1.46% |
| Scalar metadata / JSON structure | - | - | - | 33162 | 33162 | 0 | 0.00% |

### peroz_sasanian_476 / governmentSupport

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| scopes | 55 | 55 | 0 | 632 | 632 | 0 | 0.00% |
| mandate | 38 | 38 | 0 | 4522 | 4522 | 0 | 0.00% |
| selection | 38 | 38 | 0 | 8520 | 8520 | 0 | 0.00% |
| decisions | 0 | 152 | 152 | 76 | 132802 | 132726 | 96.72% |
| history | 38 | 38 | 0 | 5125 | 5125 | 0 | 0.00% |
| members | 114 | 114 | 0 | 16357 | 16357 | 0 | 0.00% |
| agreements | 0 | 0 | 0 | 76 | 76 | 0 | 0.00% |
| dues | 0 | 38 | 38 | 0 | 4616 | 4616 | 3.36% |
| Scalar metadata / JSON structure | - | - | - | 8531 | 8417 | -114 | -0.08% |

### peroz_sasanian_476 / tournaments

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Scalar metadata / JSON structure | - | - | - | 2 | 2 | 0 | - |

### peroz_sasanian_476 / chronicle

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| strings | 3 | 10 | 7 | 80 | 257 | 177 | 0.28% |
| heads | 1 | 1 | 0 | 270 | 270 | 0 | 0.00% |
| entries | 3 | 657 | 654 | 203 | 63930 | 63727 | 99.72% |
| Scalar metadata / JSON structure | - | - | - | 54 | 54 | 0 | 0.00% |

### yaghi_siyan_1096 / authority

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| appointments | 0 | 2 | 2 | 2 | 1144 | 1142 | 0.32% |
| recognitions | 0 | 1 | 1 | 2 | 284 | 282 | 0.08% |
| contracts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| rights | 22 | 976 | 954 | 6892 | 357684 | 350792 | 99.45% |
| receipts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| governments | 8 | 8 | 0 | 1833 | 2317 | 484 | 0.14% |
| Scalar metadata / JSON structure | - | - | - | 106 | 129 | 23 | 0.01% |

### yaghi_siyan_1096 / authority.rights[].history (nested)

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| established | 22 | 976 | 954 | 704 | 33140 | 32436 | 34.19% |
| possession | 0 | 976 | 976 | 0 | 59536 | 59536 | 62.76% |
| Scalar metadata / JSON structure | - | - | - | 44 | 2928 | 2884 | 3.04% |

### yaghi_siyan_1096 / localInstitutions

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| standing | 0 | 2 | 2 | 12 | 60 | 48 | 5.57% |
| demands | 10 | 7 | -3 | 126 | 90 | -36 | -4.18% |
| consentRights | 2 | 2 | 0 | 34 | 34 | 0 | 0.00% |
| petitions | 0 | 1 | 1 | 12 | 615 | 603 | 69.95% |
| history | 0 | 1 | 1 | 12 | 207 | 195 | 22.62% |
| rightIds | 0 | 0 | 0 | 12 | 12 | 0 | 0.00% |
| members | 0 | 0 | 0 | 8 | 8 | 0 | 0.00% |
| assents | 0 | 0 | 0 | 8 | 8 | 0 | 0.00% |
| Scalar metadata / JSON structure | - | - | - | 1284 | 1336 | 52 | 6.03% |

### yaghi_siyan_1096 / governmentSupport

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Scalar metadata / JSON structure | - | - | - | 2 | 2 | 0 | - |

### yaghi_siyan_1096 / tournaments

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| events | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| annual | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| samples | 0 | 371 | 371 | 2 | 64505 | 64503 | 99.05% |
| starts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| summaries | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| cursors | 0 | 51 | 51 | 2 | 604 | 602 | 0.92% |
| Scalar metadata / JSON structure | - | - | - | 89 | 104 | 15 | 0.02% |

### yaghi_siyan_1096 / chronicle

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| strings | 2 | 5 | 3 | 52 | 140 | 88 | 12.36% |
| heads | 1 | 1 | 0 | 231 | 231 | 0 | 0.00% |
| entries | 2 | 8 | 6 | 269 | 893 | 624 | 87.64% |
| Scalar metadata / JSON structure | - | - | - | 54 | 54 | 0 | 0.00% |

### muhammad_1204 / authority

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| appointments | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| recognitions | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| contracts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| rights | 28 | 982 | 954 | 8644 | 357816 | 349172 | 99.90% |
| receipts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| governments | 11 | 11 | 0 | 2619 | 2932 | 313 | 0.09% |
| Scalar metadata / JSON structure | - | - | - | 492 | 515 | 23 | 0.01% |

### muhammad_1204 / authority.rights[].history (nested)

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| established | 28 | 982 | 954 | 896 | 33332 | 32436 | 34.06% |
| possession | 0 | 982 | 982 | 0 | 59902 | 59902 | 62.90% |
| Scalar metadata / JSON structure | - | - | - | 56 | 2946 | 2890 | 3.03% |

### muhammad_1204 / localInstitutions

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| standing | 0 | 0 | 0 | 16 | 16 | 0 | - |
| demands | 15 | 15 | 0 | 187 | 187 | 0 | - |
| consentRights | 3 | 3 | 0 | 49 | 49 | 0 | - |
| petitions | 0 | 0 | 0 | 16 | 16 | 0 | - |
| history | 0 | 0 | 0 | 16 | 16 | 0 | - |
| rightIds | 0 | 0 | 0 | 16 | 16 | 0 | - |
| members | 0 | 0 | 0 | 10 | 10 | 0 | - |
| assents | 0 | 0 | 0 | 10 | 10 | 0 | - |
| Scalar metadata / JSON structure | - | - | - | 1663 | 1663 | 0 | - |

### muhammad_1204 / governmentSupport

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| scopes | 3 | 3 | 0 | 33 | 33 | 0 | 0.00% |
| mandate | 1 | 1 | 0 | 122 | 122 | 0 | 0.00% |
| selection | 1 | 1 | 0 | 215 | 215 | 0 | 0.00% |
| decisions | 0 | 4 | 4 | 4 | 2657 | 2653 | 95.67% |
| history | 1 | 1 | 0 | 140 | 140 | 0 | 0.00% |
| members | 5 | 5 | 0 | 750 | 750 | 0 | 0.00% |
| agreements | 0 | 0 | 0 | 4 | 4 | 0 | 0.00% |
| dues | 0 | 1 | 1 | 0 | 123 | 123 | 4.44% |
| Scalar metadata / JSON structure | - | - | - | 457 | 454 | -3 | -0.11% |

### muhammad_1204 / tournaments

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| events | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| annual | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| samples | 0 | 383 | 383 | 2 | 64592 | 64590 | 99.05% |
| starts | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| summaries | 0 | 0 | 0 | 2 | 2 | 0 | 0.00% |
| cursors | 0 | 51 | 51 | 2 | 606 | 604 | 0.93% |
| Scalar metadata / JSON structure | - | - | - | 89 | 104 | 15 | 0.02% |

### muhammad_1204 / chronicle

| Kind | Count before | Count after | Added records | Bytes before | Bytes after | Growth bytes | Share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| strings | 1 | 2 | 1 | 30 | 53 | 23 | 8.36% |
| heads | 1 | 1 | 0 | 268 | 268 | 0 | 0.00% |
| entries | 1 | 3 | 2 | 104 | 356 | 252 | 91.64% |
| Scalar metadata / JSON structure | - | - | - | 54 | 54 | 0 | 0.00% |
