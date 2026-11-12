Fallowborn game instructions

Project and runtime constraints

This is the public github.com/dli9431/fallowborn browser game. It uses classic JavaScript scripts, no runtime dependencies, no build step and no root package requirement. index.html must run directly from file:// and in the itch.io iframe on desktop and mobile. Keep all assets self-contained. The self-hosted Opus soundtrack is the authored-media exception to procedural art. Development-only dependencies and fixtures stay under tests/e2e/ and never ship.

Keep private workspace files and content out of this repository, comments, Git messages and uploads. Keep game code separate from the marketing site. Ordinary itch/play builds and the explicit CrazyGames distribution remain isolated; never infer a distribution from hostname or screen size. Shared changes must preserve both flag paths. Read docs/agents/integration.md for distribution or packaging changes.

Reading efficiently

Read this file once, then only the relevant contracts below. Use docs/agents/navigation.md to locate the owning engine module and design document. Search for symbols and section labels before reading large files. Read every applicable section and expand to its referenced invariants; a context limit is not permission to omit a contract. Full-file reading is not required for large schema, UI, test or historical reference documents.

Before changing a system, read its relevant sections under docs/designs/ and update the owning design documentation when behavior changes. Before event, map or other data work, read the owning schema sections in docs/MODDING.md. New or converted gameplay capabilities also require the relevant sections of docs/data-authoring.md and the data-authoring contract in docs/agents/authoring.md. Trusted strategies stay in engine code; meaningful supported variation must work through typed data and ordinary JSON mods. Preserve stable saved identities, exact fingerprints, pure candidate validation and player/AI transaction parity. Author two independent configurations, including a real JSON import.

For any UI/UX change, read the shared visual standard, navigation/decision presentation and relevant feature sections of docs/designs/ui.md, the owning system design and relevant sections of docs/i18n-authoring.md before implementation. Follow existing styles, clear costs/benefits, tooltip/disclosure patterns, keyboard/mobile accessibility and view/scroll preservation across every modal return path. Update documentation for new shared rules. Detailed UI and authoring obligations are in docs/agents/authoring.md.

Before changing boot, data registration, script loading, bookmark composition or story registration, read docs/agents/architecture.md. index.html is the classic-script dependency order; preserve ordered defer execution. Engine-dependent validation waits for the complete engine. Preserve early metadata capture, private source staging, selected-date readiness, full-catalogue/mod baselines, retained revisions and deterministic source/dispatch order. FB.game.bootReady is title readiness; contentReady is complete catalogue preparation. UI shared internals are owned by ui_misc.js; preserve the lazy ui_modals.js boundary.

Code and text

Match the surrounding namespace-object and function style. The compatibility floor is approximately Safari 10 / Chrome 49. const, let, for...of and arrow functions are permitted. No template literals (the i18n lexer cannot extract them), class syntax, ES modules or build step. Game logic stays synchronous and deterministic: no Promises or async/await. Use seeded FB.rng, FB.ri and FB.pick for randomness, never Math.random except existing initial seed creation; visual noise uses FB.noise2. Apostrophes in single-quoted event prose use the typographic apostrophe. Comments and docs are English.

Route all player-visible strings while authoring: FB.T/FB.TC for UI, placeholder-bearing display fields for structured data, and opaque FB.msg descriptors for durable saved messages. Never save rendered prose, mutate FBDATA display fields or put grammar in JS. IDs, numbers and generated proper names are not translated. English fallback is valid; unreachable strings are bugs. Read docs/i18n-authoring.md for the relevant authoring contract.

Every new or materially expanded independently gateable gameplay capability needs a technology-impact decision in FBDATA.techImpactReviews and the owning design doc. Use hard, soft or none honestly, preserving meaningful fallback and existing records/commitments. No backfill before v1.127.1. Pure fixes, numeric balance, localization, presentation, accessibility, docs, tooling and internal refactors are exempt unless eligibility changes. Full rules: docs/agents/authoring.md.

Testing policy

Agents author or update bounded regression tests for observable behavior changes and fixes, but never execute tests, syntax gates, runtime verification, browsers, servers, profilers or any game harness command on the local machine. Do not install test dependencies or browsers. Tests run in GitHub Actions: agents may trigger the workflows and read their results, summaries and artifacts (docs/agents/testing.md, Continuous integration). Visual/device/play acceptance belongs to the owner. Report authored test files and whether and where they ran in the final handoff, never in Git messages.

Before test authoring or profiling-related changes, read docs/agents/testing.md and the relevant sections of docs/TESTS.md. Register focused dependsOnRuntime inputs. Use leaf helpers; do not change universal fixtures or shared navigation for scenario-local behavior. Never import or execute game scripts as Node modules. Keep tests deterministic and isolated. Advance at most one season (90 days), only when the daily loop itself is under test; stage longer boundaries directly. Do not raise timeouts to fit long journeys. Documentation-only changes need no artificial gameplay tests.

Git, versions and generated artifacts

Read docs/agents/integration.md before committing, merging, deployment changes or catalog work. Default work in the primary checkout commits directly to main only when the owner requests a commit; do not invent a branch or PR. An assigned branch/worktree workflow takes precedence. Commit authorization covers the changes then in view, not later follow-ups. main, dev and 476 are deploying branches: push to them only when explicitly requested (main pushes auto-deploy play.fallowborn.com). Agents may push other branches, such as their own worktree or automation branches, without asking.

On a feature or automatic-integration branch, leave FB.VERSION, FB.CHANGELOG and generated language catalogs unchanged. Assign a fresh FB.VERSION when shipped changes land directly on main or through a branch merge into main/dev. Include that exact version in the integration subject as vMAJOR.MINOR.PATCH: description. Add only uncovered player-facing changelog changes; preserve dev entries once on promotion to main. Docs-only changes need no version. Never add committed index.html cache query strings because file:// must work. Save-format changes require explicit owner review and are separate from cache versioning. Full policy: docs/VERSIONS.md.

Catalog extraction, translation and validation require a separate explicit owner request. Ordinary implementation, review, commit or merge requests do not authorize those commands. Never regenerate on feature branches or hand-merge generated catalogs. When requested, run the full integration recipe from docs/i18n-authoring.md and include only validated complete outputs; unavailable translation does not block code integration with English fallback.

Git messages describe the durable repository/player change only. Exclude test-execution status, prompt text, agent/model identity, tooling/approval details, handoff boilerplate and cleanup metadata. Keep long-lived dev and integration branches. Cleanup uses git worktree remove and git branch -d only after full merge. Never force-delete an unmerged branch.

Reference ownership

The concise routing above replaces blanket reading of large guides. docs/agents/testing.md owns test and local measurement details; integration.md owns Git/distribution procedures; architecture.md owns loading and composition contracts; authoring.md owns UI, technology and data obligations; navigation.md maps modules and system docs. These references contain only this public repository's guidance. Update the owning reference when its contract changes instead of growing this entry file with feature history.
