# Settlement lordship: Phase 7 handoff

## Prepared saves

Owner-local imports are in `notes/settlement-lordship-test-saves/`. The directory
contains twelve independent `.txt` exports, a scenario-by-scenario `README.md`,
and a SHA-256 manifest. `notes/` is ignored by Git. Original exports are untouched.

The preparation tool only edits JSON data and writes FBS1 interchange exports;
it does not execute the game or establish that an import works. Recreate this
specific scenario pack from the repository root with:

```powershell
python tools/settlement_lordship_saves.py "notes/fallowborn-save (1).txt"
```

The source needs the Barcelona holder and West Francia realms. The pack gives
generous resources/Standing and clears active wars. It is for focused feature
review, not balance measurements or proof of a naturally reachable campaign.

| Save | Primary review |
| --- | --- |
| 01 | Established Gentry petition, named grantor and existing settlement |
| 02 | First-generation founding, funding, cancellation and completion |
| 03 | Baron income, dues, construction, higher-ruler county petition |
| 04 | Unclaimed challenge, superior opposition, victory and defeat |
| 05 | Claim, superior authorization, changed defender and recognition |
| 06 | Independent count challenge with no superior recognition |
| 07 | Direct settlement cap, penalties, delegation and tall county tradeoffs |
| 08 | Delegated income, AI investment, revocation, restoration and inheritance |
| 09 | Disputed county recognition, refusal cooldown and surviving rival claims |
| 10 | Legacy landless-Baron migration and repeated import |
| 11 | Funded founding project with one day remaining |
| 12 | Funded project waiting for completion prestige |

## Source audit and changes

The first ownership-consumer pass covered the fiscal/construction seams in
`lordships`, `actions`, `world`, `treasury` and `modifiers`; market property and
demand scope; army/war county scope; population projects; succession and save
records; household relocation; governance and community agency; and map/retained
panel settlement projections. Earlier phases already changed the principal tax,
levy, construction, succession and save boundaries.

Two remaining authority leaks were corrected in this pass:

- Governance now requires an actual barony rather than only Baron rank and a liege.
- Local community projects follow direct settlement ownership. Residence does not
  grant control, and counts cannot issue local projects in delegated settlements.
  County-wide policy remains with the county holder. Community event candidates
  include counties containing actual holdings, including holdings away from home.

These fixes enforce the existing lordship model and introduce no separately
gateable capability. The owning realm/conversion docs and in-game settlement
guide reflect the distinction. The six lordship/progression technology decisions
match `docs/designs/tech.md`; the existing exact-ledger regression was updated
to include their IDs and modes.

This is a source audit, not a declaration that every legacy event, office or
automation path has been exhaustively exercised. Those broad final checks remain
open in the parent plan. UI source review covered the new grant, charter,
challenge, recognition and revoke/restore reviews: named targets, immediate
costs/benefits, acceptance versus refusal, shared Details, buttons and modal
history. Mobile/keyboard/locale appearance and complete return journeys still
require owner validation.

## Regression authoring

This pass updates:

- `tests/e2e/specs/governance.spec.js`: landed fixtures and rejection of a
  title-only Baron.
- `tests/e2e/specs/community-conversion.spec.js`: residence versus ownership,
  delegation removing local authority, and retained county policy authority.
- `tests/e2e/specs/settlement-founding.spec.js`: replay the same funded save
  twice; compare completion, population/community conservation, fiscal rights,
  resources, ownership and RNG; assert the technology review modes.
- `tests/e2e/specs/technology-impact-gates.spec.js`: full ledger IDs and the six
  lordship/progression modes.

The earlier phase work also authors settlement-lordship, settlement-lordship-economy,
settlement-lordship-grants and settlement-county-progression coverage, and updates
the affected rank-elevation, liege-grants, gentry-succession, start-progression,
late-game-buildings, AI-treasury and player-feedback fixtures. Runtime dependency
declarations accompany the relevant specifications.

No tests, syntax gates, validators, browsers, servers or profiling were run.
The owner should run the approved changed-file harness and relevant focused
specifications, then complete the parent plan's visual, gameplay, conservation,
performance and integration checklist. No results are recorded as passed.
