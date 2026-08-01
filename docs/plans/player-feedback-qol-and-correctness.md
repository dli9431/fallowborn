# Player feedback: QoL and correctness plan

Status: in progress — Milestones 1–4 implemented
Audit baseline: Fallowborn v1.93.3, 2026-07-30

## Purpose

This plan turns a broad player-feedback thread into a prioritized backlog. The
thread spans several game versions, so not every report still describes the
current game. The first work should fix rules that contradict the UI or produce
an incoherent family state, then make existing systems easier to discover and
navigate. Balance changes and large new simulations follow only after those
foundations are sound.

The priority order is:

1. correctness bugs that can corrupt the player's understanding of a run;
2. small, high-value discoverability improvements;
3. scalable controls for long lists and repeated actions;
4. larger QoL systems such as retirement;
5. balance, simulation, and content expansion.

This is a planning document, not a promise that every long-term idea will be
implemented. Each implementation must still follow the relevant design document,
save compatibility rules, i18n authoring rules, and keyboard/mobile requirements.

## Triage vocabulary

Every item has one primary category:

- **Bug** — current behavior contradicts another game rule, displayed promise, or
  the family/world state.
- **QoL** — the underlying rule can remain, but the player needs a faster or more
  legible way to use it.
- **Writing** — an existing rule or consequence is missing, unclear, or difficult
  to discover.
- **Balance** — the rule exists but its tuning, incentives, or simulation scope
  needs review.

Validity means:

- **Valid** — the reported problem is still present in the audited code.
- **Partial** — later work addresses part of the report, but a meaningful gap
  remains.
- **Resolved** — current code addresses the report; retain it as a regression
  concern rather than new feature work.
- **Playtest** — source inspection cannot establish whether the current tuning
  produces the reported player experience.

## Delivery plan

### Milestone 1 — restore rule and family-state consistency

These fixes come first because they create outcomes the player cannot reasonably
predict from the UI.

#### 1. Correct gendered religious and patronymic names

Category: **Bug**  
Validity: **Resolved**

The female novice introduction can still call the protagonist “Brother.”
Scandinavian founder naming can also construct a woman as `Fastvisson`, and the
generated father, siblings, and protagonist can receive surnames that imply the
wrong parent-child relationship.

Required outcome:

- religious address uses the character's gender;
- patronymic cultures select the correct son/daughter form;
- each generated patronym is derived from that character's actual parent rather
  than copying the protagonist's dynasty label across generations;
- siblings share the appropriate parent-derived name without making parents look
  like their own descendants;
- non-patronymic dynasty naming remains unchanged.

Implemented outcome: character-specific bynames now derive from recorded parents,
female patronyms use the daughter form, patronymic starts include the required
paternal generation, and female Christian novices are introduced as Sister.

Regression coverage should include a female novice, male and female Scandinavian
siblings, their father, and at least one prior generation.

Relevant design: [characters.md](../designs/characters.md),
[i18n.md](../designs/i18n.md).

#### 2. Make marriage transfers follow the displayed marriage arrangement

Category: **Bug**  
Validity: **Resolved**

The protagonist currently receives the spouse's dowry regardless of the
protagonist's gender, while marrying off a daughter charges the player's house.
The transfer direction therefore follows which UI path was used rather than one
coherent marriage rule.

Required outcome:

- one marriage rule determines which household pays and receives;
- the rule follows the spouse/house arrangement, not an implicit assumption that
  the protagonist is male;
- proposal and confirmation UI show the amount, payer, recipient, and effect
  before commitment;
- AI-child and protagonist marriages use the same rule;
- no transfer is applied twice when a courtship becomes a marriage.

Implemented outcome: the bride's house pays under one shared marriage-terms
function. Protagonist terms are frozen for the active courtship and displayed
before proposal; formal weddings settle once, while explicitly informal story
weddings transfer no dowry.

The exact historical convention is a balance/design choice, but the rule must be
consistent and visible before money moves.

Relevant design: [marriage.md](../designs/marriage.md),
[finance.md](../designs/finance.md).

#### 3. Integrate stepchildren into the visible family

Category: **Bug**  
Validity: **Resolved**

A spouse's children from an earlier relationship can exist in ruler succession
data without appearing as that spouse's children in the player's family tree or
being available for ordinary character interactions.

Required outcome:

- a spouse's existing children appear under their biological parent in the family
  tree;
- their character sheet and allowed relationship interactions are reachable;
- their biological parents, dynasty, residence, and succession rights do not
  change merely because their parent marries the protagonist;
- they are not silently treated as the protagonist's direct descendants or heirs;
- death, divorce, remarriage, and save/load do not duplicate or detach them.

Implemented outcome: spouse children retain their biological and political state,
gain an additive step-parent link, and appear in Kin and a separate Stepfamily
tree branch. Royal spouse children materialize through the same link repair;
stepchildren remain outside the managed household and blood-heir walk.

Relevant design: [marriage.md](../designs/marriage.md),
[state-and-saves.md](../designs/state-and-saves.md).

#### 4. Enforce locality when a household relocates

Category: **Bug**  
Validity: **Resolved**

Permanent relocation changes the household home while owned enterprises remain in
their original settlements. The relocation warning acknowledges separation, but
enterprise production does not currently require the assigned family worker to
remain co-located. A child can therefore continue working in Århus after the
household moves to Fustat.

Required outcome:

- relocation preserves enterprise ownership but removes or suspends invalid
  worker assignments;
- a household member cannot personally staff an enterprise outside the locality
  allowed by the enterprise system;
- relocation confirmation identifies enterprises and workers that will be
  affected;
- Work & Enterprises explains why a remote enterprise is idle;
- a future local-manager or remote-administration mechanic may restore production,
  but distance must not be ignored implicitly.

Implemented outcome: staffing eligibility and yield now require the worker's
resolved residence to match the enterprise province. Relocation previews exact
affected worker/property pairs, clears invalid assignments and locks, and leaves
the remote enterprise visibly owned but idle.

Relevant design: [holdings.md](../designs/holdings.md),
[travel.md](../designs/travel.md).

#### 5. Give Guild Standing a renewable recovery path

Category: **Bug**  
Validity: **Resolved**

Guild ranks grant a finite amount of Standing, guild commissions consume it, and
only a rare story outcome restores a small amount. A character can permanently
lose access to commissions with no ordinary way to rebuild the required resource.

Required outcome:

- every eligible career has at least one reliable, repeatable way to earn Guild
  Standing after spending it;
- the Work UI identifies that source and the next relevant threshold;
- commission costs cannot strand an otherwise active master indefinitely;
- gain and spend rates receive a later balance pass, but recovery must not depend
  only on a rare event.

Implemented outcome: an active adult guild vocation renews 5 Standing per
vocational year up to 100 by default. The values are balance keys and the Work
and guild detail surfaces explain the source and cap; inactive and landed
callings remain frozen.

Relevant design: [characters.md](../designs/characters.md),
[finance.md](../designs/finance.md).

#### 6. Preserve career history when a calling is set aside

Category: **Bug**  
Validity: **Resolved**

The UI describes an old occupation as a calling that was “set aside,” but the
single career record is overwritten when occupations change. Returning to a
previous profession starts its guild progression from scratch.

Required outcome:

- store career-specific history keyed by career;
- changing occupations suspends the former career rather than erasing it;
- returning restores earned rank and the appropriate career-specific progress;
- current occupation, former calling, and unavailable tier-3+ career changes remain
  clearly distinct;
- old saves initialize missing history additively without a save-version bump.

Implemented outcome: each character archives complete profession-specific career
records. Resuming restores rank, experience, guild rank, Standing, and start
year without another fee; inactive records do not progress or decay.

Whether unused Standing decays is a separate balance decision and must be stated
explicitly if introduced.

Relevant design: [characters.md](../designs/characters.md),
[state-and-saves.md](../designs/state-and-saves.md).

### Milestone 2 — make existing rules discoverable

This milestone should begin with small changes that answer a player's immediate
question in the screen where it arises. A full codex can then consolidate the
same material instead of becoming a second, divergent rules source.

**Implementation status: complete.** Contextual screens now expose their live rule
sources and deep-link into one searchable offline Guide. The implementation adds no
second numeric rules table: technology unlocks/effects, career requirements,
successor eligibility, child identity, resource values, and settlement thresholds
are derived from the same definitions and functions used by simulation.

#### 7. Search technologies by what they unlock

Category: **Writing**  
Validity: **Partial**

Status: **Implemented**

Technology details list their unlocks, but catalogue search indexes only technology
name, description, and domain. Searching for “Orchard” therefore does not lead to
Seed Selection even though the relationship is already authored.

Required outcome:

- technology search indexes unlock labels and relevant effect labels;
- a locked enterprise or action links directly to its prerequisite technology;
- an “Orchard” search finds Seed Selection;
- an unlock result explains whether every prerequisite or any one of several
  prerequisites is required;
- results remain generated from technology data rather than duplicated prose.

Relevant design: [tech.md](../designs/tech.md).

#### 8. Explain what every skill affects

Category: **Writing**  
Validity: **Valid**

Status: **Implemented**

Learning is used by research, education, events, rights, religion, and Papal
systems, but the player-facing explanation does not summarize those uses. Similar
gaps make skills look decorative until a check happens.

Required outcome:

- every skill has a short plain-language purpose;
- the explanation names its major current consumers without claiming to enumerate
  every event check;
- character skill details link to the relevant help entry;
- Learning explicitly mentions research, education, religious advancement, and
  knowledge-oriented checks;
- the text remains accurate when a system is unavailable to the current character.

Relevant design: [characters.md](../designs/characters.md),
[tech.md](../designs/tech.md).

#### 9. Add role-aware onboarding

Category: **Writing**  
Validity: **Partial**

Status: **Implemented**

Grouped Deeds, dashboard cards, Household Plan, and Governance reduce some overload,
but a promotion can still expose Serf, Freeholder, monastic, noble, territorial, or
royal actions without explaining the new role.

Required outcome:

- the first entry into a new social or religious role presents a short, dismissible
  orientation;
- it identifies the role's new resources, recurring duties, and two or three
  sensible first actions;
- it links to deeper help without blocking experienced players;
- each orientation is shown once per save unless reopened manually;
- contextual empty states explain why a role-specific panel currently has nothing
  actionable.

Relevant design: [ui.md](../designs/ui.md),
[characters.md](../designs/characters.md).

#### 10. Create a searchable in-game guide

Category: **QoL**  
Validity: **Valid**

Status: **Implemented**

“How to Play” is a long modal and the external repository documentation is fuller,
but the game has no general searchable knowledge base.

Required outcome:

- Help opens a searchable, categorized guide that works offline and under
  `file://`;
- entries cover skills, resources, social roles, careers, family scope,
  inheritance, settlements, technology, travel, and government systems;
- search indexes entry titles, aliases, unlock names, and key terms;
- major screens deep-link to their relevant entry;
- content is concise and generated from live data where practical;
- the guide remains fully keyboard accessible and usable as a mobile full sheet.

The guide must not become a manually maintained copy of numeric rules that can be
read from `FBDATA`. It should describe concepts and render live values or unlocks
from their source data.

Relevant design: [ui.md](../designs/ui.md),
[i18n.md](../designs/i18n.md).

#### 11. Clarify family, house, and inheritance scope

Category: **Writing**  
Validity: **Partial**

Status: **Implemented**

Current succession reaches beyond direct descendants, but the UI does not clearly
distinguish the playable line, dynasty/house, managed household, royal branch, and
relatives who are visible but not controllable.

Required outcome:

- Help defines each scope and states what carries through succession;
- the successor view explains why each candidate is or is not eligible;
- Work & Enterprises identifies which relatives can be assigned and why;
- child culture, faith, and dynasty previews state which parent supplies each
  identity;
- protagonist-line and collateral-birth rules are documented where they differ.

Relevant design: [characters.md](../designs/characters.md),
[marriage.md](../designs/marriage.md),
[state-and-saves.md](../designs/state-and-saves.md).

#### 12. Expose settlement and development rules

Category: **Writing**  
Validity: **Partial**

Status: **Implemented**

Settlements now grow from development, but the player cannot easily learn the
thresholds that create extra villages, towns, or cities or how buildings and
technology contribute.

Required outcome:

- province and settlement UI show current development and the next settlement
  threshold;
- Help explains that settlement composition is derived rather than manually
  founded;
- building and technology effects identify their development contribution;
- the UI distinguishes a historical bookmark advantage from growth during play.

Relevant design: [development.md](../designs/development.md),
[provinces.md](../designs/provinces.md).

### Milestone 3 — make growing interfaces manageable

**Implementation status: complete.** Desktop shortcuts now bind semantic deeds and
focus families, the bounded family tree has search/collapse/jump navigation, conquest
targets expose live search/filter/sort controls and blocked reasons, and enterprises
share session ordering between Work and Household Plan.

#### 13. Add stable, configurable shortcuts

Category: **QoL**  
Validity: **Valid**

Status: **Implemented**

Number shortcuts currently select the visible position in a dialog. Their meaning
changes when deeds appear, disappear, or are replaced after promotion.

Required outcome:

- configurable bindings target semantic action identifiers, not list positions;
- unavailable actions leave the binding reserved and show why it cannot currently
  fire;
- conflicts are detected before a binding is saved;
- Reset to Defaults is always available;
- positional 1–9 and Shift+1–9 modal navigation can coexist with global bindings;
- bindings persist across sessions and remain safe when actions are added or
  removed;
- touch UI does not expose desktop-only key hints.

The implementation must define whether a promoted replacement such as “Toil in the
Lord's fields” → “Work your land” shares an action family or requires a new binding.

Implemented outcome: configurable unused-letter bindings persist in `fb_ui`, reject
duplicate keys, retain unavailable semantic targets with a live explanation, and reset
to Q for Work & Enterprises. Daily focuses normally bind by exact id; Toil and Work your
land share the explicit `farmer-work` family so promotion preserves the binding.

Relevant design: [ui.md](../designs/ui.md).

#### 14. Add family-tree navigation tools

Category: **QoL**  
Validity: **Partial**

Status: **Implemented**

The family tree is hierarchical and depth-bounded, but large houses still lack
search and branch collapsing.

Required outcome:

- search by character name;
- collapse and expand branches;
- jump to the protagonist, current successor, spouse, and house founder;
- preserve biological relationships when stepchildren and remarriages are shown;
- keep controls usable by keyboard and touch;
- avoid rendering the entire unbounded dynasty at once.

Relevant design: [ui.md](../designs/ui.md),
[characters.md](../designs/characters.md).

Implemented outcome: the existing depth bound remains, while native controls search the
rendered scope, collapse biological branches, and jump to the protagonist, first current
successor, spouse, or recorded house founder. A standalone founder card keeps that target
available after later generations move beyond the nearby tree.

#### 15. Filter and sort war targets

Category: **QoL**  
Validity: **Valid**

Status: **Implemented**

The royal war-target picker is still a flat list and becomes difficult to scan as
the realm grows.

Required outcome:

- search by realm, ruler, and territory;
- filters for claim/de jure basis, adjacency, rank, and diplomatic availability;
- deterministic sorting with a clear default;
- each row exposes the main eligibility or blocking reason;
- keyboard item hints apply to the filtered order visible on screen.

Relevant design: [war.md](../designs/war.md),
[ui.md](../designs/ui.md).

Implemented outcome: one live catalogue searches objectives, realms, rulers, and enemy
territory; filters cause, adjacency, relative rank, and diplomatic availability; and
offers deterministic recommended, name, rank, and strength sorts. Blocked causes remain
visible and disabled with the shared reason, and visible number hints follow filtered
DOM order.

#### 16. Add enterprise grouping and sorting

Category: **QoL**  
Validity: **Partial**

Status: **Implemented**

Work & Enterprises gained search and state-priority ordering, but newly acquired
enterprises otherwise retain acquisition order. There is no grouping by Farming,
Craft, or Trade and no sort by price, yield, or settlement.

Required outcome:

- group by category or settlement;
- sort by name, acquisition, value, yield, and staffing state;
- preserve the selected view while drilling into an enterprise and returning;
- expose a compact default that keeps idle/problem enterprises first;
- use the same ordering model in Household Plan where applicable.

Relevant design: [holdings.md](../designs/holdings.md),
[ui.md](../designs/ui.md).

Implemented outcome: enterprise groups cover profession category and exact settlement;
sorts cover problems-first, localized name, acquisition, base value, live yield,
settlement, and staffing state. The session view survives enterprise drill-down, and
Household Plan reuses and can change the shared enterprise sort.

#### 17. Extend large-list treatment only where still needed

Category: **QoL**  
Validity: **Resolved** for Work & Enterprises and Network

Status: **Preserved**

Search, filtering, state-priority ordering, and collapsible sections already
address the original readability complaint in these two screens. Preserve that
behavior with regression coverage. Do not redesign them again merely because the
old report predates the current UI; add only the enterprise grouping controls in
item 16 and reuse established large-list patterns elsewhere.

Relevant design: [ui.md](../designs/ui.md).

### Milestone 4 — succession and household agency

**Implementation status: complete.** An aging head can hand the house to an eligible
adult heir through a previewed retirement deed; resident unwed siblings join the
manageable labor pool with clear independence rules; new games offer three authored
starting-family presets encoded in the shareable start code; and the player can rename
the house within safe limits while personal names stay separate.

#### 18. Add voluntary retirement

Category: **QoL**  
Validity: **Partial**

Status: **Implemented**

Succession normally requires death. A destination-wedding path can already hand
over control, but there is no general retirement action for an aging family head.

Required outcome:

- an eligible adult successor can receive control without killing the current
  protagonist;
- retirement preview shows the new protagonist, inherited assets, offices that
  cannot transfer, and the old protagonist's continuing household role;
- the retired character remains in the family, can die normally, and cannot be
  retired repeatedly for duplicate benefits;
- succession law and contested-heir consequences are respected;
- retirement cannot bypass imprisonment, mandatory crises, or other states that
  require explicit resolution.

Rival heirs, rebellion, and forced abdication are later content layers. The first
version should establish a clean, predictable handover.

Implemented outcome: a retirement deed opens a preview naming the new protagonist,
what passes in full (no death dues), which personal offices and standings lapse, and
the old head's retired-elder role. Retirement requires the balance-age threshold and
an adult heir from the existing heir review, is blocked with stated reasons by
imprisonment, war, campaign, travel, and great-holy-war hosting, and hands over
through the living-abdication succession path. The retired head keeps a `retired`
marker, stays in the family at home, and dies normally.

Relevant design: [characters.md](../designs/characters.md),
[state-and-saves.md](../designs/state-and-saves.md).

#### 19. Review sibling and collateral-household agency

Category: **QoL**  
Validity: **Valid**

Status: **Implemented**

Siblings can inherit, but the player cannot manage their work to the same extent as
resident descendants. This makes collateral investment feel disconnected from the
playable house.

Required outcome:

- explicitly define which resident relatives are manageable;
- allow the same safe household actions for siblings who meet that definition, or
  clearly explain why they are independent;
- never allow the player to redirect married-away, landed, vowed, or otherwise
  independent relatives merely because they share a dynasty;
- show which house investments affect all members and which affect only the
  protagonist or resident household.

Implemented outcome: `FB.manageableKinKind` defines the rule — a living same-dynasty
sibling who is unmarried, not reigning, not landed, not vowed, and resident. Such kin
join the labor pool for careers, enterprise staffing, and equipment (labor only, never
household membership), while education, instruction, and match cells explain why they
stay descent-line only. Marriage, vows, land, or departure end manageability and strip
assignments; Kin and Work surfaces state each sibling's scope, and house-wide
purchases label their beneficiary.

Relevant design: [characters.md](../designs/characters.md),
[holdings.md](../designs/holdings.md).

#### 20. Add optional starting-family presets

Category: **QoL**  
Validity: **Valid**

Status: **Implemented**

Starting age and family situation are fixed by the selected scenario.

This is lower priority than retirement because it expands new-game balance and
seed reproducibility. A future version may offer a small set of authored presets
rather than unconstrained age and kin editing. Every preset must produce a valid
successor state, disclose its difficulty, and remain deterministic under the
shareable start seed.

Implemented outcome: three authored presets — the historical youth of sixteen, an
established householder of thirty with a spouse and young children, and an elder of
forty-eight with an adult heir — are picked on the character screen with difficulty
disclosed, generate deterministically on the shared seed without shifting the default
start's draws, always leave a valid heir, and encode as an optional seventh part of
the start code (existing codes round-trip unchanged).

Relevant design: [seeds.md](../designs/seeds.md),
[characters.md](../designs/characters.md).

#### 21. Add house naming and cadet identity

Category: **QoL**  
Validity: **Partial**

Status: **Implemented** (first increment)

Some rulers now receive territorial names, but generic NPCs often lack family
names, the player cannot rename the house, and title acquisition does not support
cadet branches or a new territorial identity.

Required outcome for the first increment:

- allow a player to choose or rename the house within safe length and character
  limits;
- keep personal names separate from stable dynasty identity;
- show the dynasty consistently in character, marriage, and kinship UI.

Cadet branches, title-derived surname changes, heraldic splits, and close-kin
marriage checks should be designed as a later coherent genealogy feature rather
than separate string substitutions.

Implemented outcome: the Self tab offers a house rename validated for length and
character set (letters of any script, spaces, hyphens, apostrophes; 2–20 chars).
`FB.renameHouse` rewrites the shared dynasty string on every house member, updates
the player realm's dynastic identity, reseeds heraldry, and records a chronicle
news entry; personal names and patronymic bynames are untouched, and historical
chronicle text keeps the old name. Generic NPC family names remain a noted gap for
the later genealogy feature.

Relevant design: [characters.md](../designs/characters.md),
[marriage.md](../designs/marriage.md).

## Deferred balance and simulation backlog

These reports remain useful, but they should not displace correctness and
navigation work.

### Orchard and Press House progression

Category: **Balance**  
Validity: **Valid**

Orchard is locked behind Seed Selection while Press House is commonly available
earlier and does not require an orchard. Review cost, yield, input relationships,
and technology order together. The eventual rule should give Orchard a clear
economic purpose and make a Press House's early availability intelligible; simply
swapping one gate without checking the production chain is insufficient.

### Route quality and geographic distance

Category: **Balance**  
Validity: **Valid**

Travel currently favors the fewest county-adjacency steps. It does not weight road
quality, terrain, sea travel, or geographic distance, so an implausible route can
be mechanically shortest. A future path-cost model should use deterministic,
player-visible weights and explain why the selected route is faster.

### Peddler stock by market and customer

Category: **Balance**  
Validity: **Valid**

The offer pool is not meaningfully conditioned on social tier or wealth. Famed,
very expensive goods can be offered to a serf, while depletion of owned unique
items can leave a wealthy house seeing mostly ordinary stock. Review stock bands,
regional availability, merchant quality, and a rare aspirational offer. Do not
make every offer perfectly affordable; make extreme mismatches exceptional and
legible.

### Value of house-wide investment

Category: **Balance**  
Validity: **Partial**

Property, standards, and items already benefit the house in several ways, but
personal Standing and religious/career rank largely remain personal. Audit every
“house” purchase or upgrade and label its beneficiary scope. Add a mechanical
benefit only where the current reward fails to match the stated scope.

### Religious-vocation dynasty continuity

Category: **Balance**  
Validity: **Resolved** for the reported game-over concern

Wider sibling and collateral succession now lets a vowed protagonist continue the
dynasty without marriage or accidental adoption. Preserve this path. Additional
vocation stories may enrich play but are not required to fix succession.

### Pace of social ascent and conquest

Category: **Balance**  
Validity: **Playtest**

Source inspection cannot determine whether a min-maxed serf-to-emperor climb over
two or three generations is too fast. Collect seeded playthrough evidence before
changing promotion costs, prestige, claims, war tempo, or inheritance. Measure
ordinary and optimized play separately.

### Papal politics

Category: **Balance**  
Validity: **Partial**

The game already has Bishops, Cardinals, a College, elections, a playable Pope,
authority, investiture, excommunication, nepotism, schism, rival Popes,
deposition, and reunification. The original request is therefore substantially
implemented. Puppet/vassal Papacy, an Avignon-style relocation, explicit
hereditary capture, and additional order politics are future expansions, not
missing baseline functionality.

### Settlement distribution and Abbasid advantage

Category: **Balance**  
Validity: **Partial**

Development now derives settlement growth, including additional villages, towns,
and cities. The Abbasid world begins with a substantial developed-region advantage
and later historical fragmentation. First expose the rules as described in
milestone 2; then compare bookmark development and long-run economic outcomes with
seeded simulations before retuning the map.

### Downward social mobility

Category: **Balance**  
Validity: **Partial**

Landed houses can fall back to gentry, but the ordinary ladder does not support a
Freeholder-to-Serf reversal. A future downfall system may include debt bondage,
capture, confiscation, outlawry, or loss of a lord's favor. It must offer recovery
play rather than function as an opaque random demotion. The same review should
clarify what higher-station starts gain in exchange for missing early commoner
property accumulation.

### Gender, inheritance, and government laws

Category: **Balance**  
Validity: **Partial**

Gender and doctrine already affect some marriage, religious, and office rules, but
there is no general selectable system for inheritance gender preference, equal
division, assemblies, or matriarchal exceptions. Treat these as interoperating
realm laws with opinion and succession consequences, not isolated male/female
penalties. This is a major simulation feature and requires a dedicated design
before implementation.

## Deferred writing and content backlog

### Foreign settlement, conversion, and suspicion

Category: **Writing**  
Validity: **Partial**

A narrow pagan-to-Christian conversion path exists, but permanent relocation does
not broadly model conversion, cultural adaptation, a foreign lord's suspicion, or
spying for the former homeland. These are event and diplomacy expansions. Before
adding them, child identity and residence rules must be visible as required by
milestone 2.

### Downfall, captivity, retirement, and succession stories

Category: **Writing**  
Validity: **Partial**

Some loss-of-land chains exist, but ordinary imprisonment producers, rival-heir
rebellions, forced abdication, and rich retirement stories are not a complete
system. Add these only after the underlying retirement and succession transition
is safe.

### Culture and religion after conquest

Category: **Writing**  
Validity: **Partial**

Current systems express only part of the requested conflict between a conqueror
and culturally or religiously different subjects. Future events should consume
actual county, ruler, faith, culture, authority, and policy state rather than
firing as generic flavor.

### Historical actors

Category: **Writing**  
Validity: **Partial**

Bookmarks and scripted shocks already include historical rulers and events, but
there is no general system for conditionally appearing figures such as Joan of Arc
or Genghis Khan. A future historical-actor framework should define date windows,
location, prerequisites, alternate-history suppression, mortality, and what
happens if the expected polity does not exist.

### Occupation locking

Category: **Writing**  
Validity: **Resolved**

Tier-3+ characters intentionally retain their former calling but cannot freely
change personal occupation. The current Work UI explains this and removes invalid
controls while retaining household and enterprise management. Preserve the
explanation with regression coverage.

### Child surname and identity rules

Category: **Writing**  
Validity: **Partial**

Children of the playable line intentionally continue the protagonist's dynasty,
including when the protagonist is a woman; collateral births follow a different
rule. This can look like a surname bug when the rule is invisible. The immediate
fix belongs in the family-scope and marriage previews in milestone 2. More
historical naming conventions belong to the later house/cadet design.

## Resolved bug reports to retain as regressions

### Death during an active storyline

Category: **Bug**  
Validity: **Resolved**

Succession now clears predecessor-specific personal flags and derives career state
from the heir, preventing war and role events from continuing as though the dead
protagonist were still alive. Maintain a regression case that kills a protagonist
mid-story and verifies the heir does not inherit personal event state.

### Game over despite living cousins

Category: **Bug**  
Validity: **Resolved**

The heir search now includes children, grandchildren, siblings, nieces and
nephews, uncles and aunts, and cousins of the same dynasty. The death dialog may
display only the first candidates, but any valid candidate prevents game over.
Maintain regression coverage for a childless protagonist whose nearest eligible
heir is collateral kin.

## Complete feedback inventory

This table is the traceability list for the original thread. “Plan” points to the
section that owns further work.

| Feedback topic | Category | Validity | Plan |
|---|---|---:|---|
| Systems and resources appear without enough explanation | Writing | Valid | Milestone 2 |
| Learning skill purpose is unclear | Writing | Valid | Item 8 |
| Orchard unlock is hard to discover | Writing | Partial | Item 7 |
| New social/religious roles arrive without introduction | Writing | Partial | Item 9 |
| General wiki or searchable knowledge base | QoL | Valid | Item 10 |
| Permanent custom keyboard shortcuts | QoL | Valid | Item 13 |
| Family tree becomes unreadable | QoL | Partial | Item 14 |
| Work & Enterprises becomes unreadable | QoL | Resolved | Item 17 |
| Network becomes unreadable | QoL | Resolved | Item 17 |
| Royal war targets become unreadable | QoL | Valid | Item 15 |
| Dead protagonist's storyline continues on the heir | Bug | Resolved | Regression section |
| Remote children keep working in old enterprises | Bug | Resolved | Item 4 |
| Travel chooses implausible routes | Balance | Valid | Deferred balance |
| Child culture, religion, and house after foreign marriage | Writing | Partial | Item 11 |
| Foreign conversion, suspicion, and homeland spying | Writing | Partial | Deferred writing |
| Peddlers offer luxury goods to serfs and mundane goods to the rich | Balance | Valid | Deferred balance |
| Unclear house versus direct-family succession | Writing | Partial | Item 11 |
| Siblings can inherit but cannot be managed | QoL | Valid | Item 19 |
| House investment has unclear value for collateral relatives | Balance | Partial | Deferred balance |
| Returning to a former career loses progression | Bug | Resolved | Item 6 |
| Guild Standing has no reliable renewal loop | Bug | Resolved | Item 5 |
| Career changes become unavailable without explanation | Writing | Resolved | Deferred writing |
| Vowed protagonist has no dynasty continuation | Balance | Resolved | Deferred balance |
| Voluntary retirement or abdication | QoL | Partial | Item 18 |
| Rival-heir and succession-rebellion stories | Writing | Valid | Deferred writing |
| Starting age and family configuration | QoL | Valid | Item 20 |
| Very rapid serf-to-emperor progression | Balance | Playtest | Deferred balance |
| Papal capture, rival Popes, and playable Papacy | Balance | Partial | Deferred balance |
| Settlement count and development rules | Writing | Partial | Item 12 |
| Abbasid settlement/economic advantage | Balance | Partial | Deferred balance |
| Downward mobility and fall from favor | Balance | Partial | Deferred balance |
| Captivity/downfall storylines | Writing | Partial | Deferred writing |
| Distinct male/female play and selectable inheritance laws | Balance | Partial | Deferred balance |
| Culture/religion conflicts after conquest | Writing | Partial | Deferred writing |
| Timed or conditional unique historical NPCs | Writing | Partial | Deferred writing |
| NPCs lack traceable family names | Writing | Partial | Item 21 |
| House rename, territorial names, and cadet branches | QoL | Partial | Item 21 |
| Female Scandinavian patronym uses a male suffix | Bug | Resolved | Item 1 |
| Female novice is called Brother | Bug | Resolved | Item 1 |
| Parents and siblings receive impossible copied patronyms | Bug | Resolved | Item 1 |
| Dowry direction is inconsistent for a female protagonist | Bug | Resolved | Item 2 |
| Female protagonist's children keep her dynasty name | Writing | Partial | Item 11 |
| Spouse's prior children are missing and cannot be interacted with | Bug | Resolved | Item 3 |
| Enterprise list lacks category, value, and settlement grouping | QoL | Partial | Item 16 |
| Orchard is gated later than Press House | Balance | Valid | Deferred balance |

## Cross-cutting implementation requirements

For every milestone:

- author or update deterministic browser tests for observable behavior, but leave
  all test execution to the owner;
- preserve existing saves through lazy defaults and additive state where possible;
- do not raise the save-format version without owner review;
- route every new player-facing string through the i18n layer;
- update the design document for each changed system;
- keep all controls keyboard reachable and touch friendly;
- ensure help and data-driven labels work offline from `file://`;
- avoid fixing explanatory gaps with numeric prose duplicated from source data;
- retain the resolved death, cousin-heir, occupation-lock, and large-list behavior.

## Suggested implementation slices

The milestones need not ship as one large release. Prefer reviewable slices:

1. novice address and patronym correctness;
2. marriage transfer preview and direction;
3. stepchildren in family views and interactions;
4. relocation staffing validation;
5. renewable Guild Standing;
6. per-career history;
7. unlock-aware technology search and skill explanations;
8. role onboarding and searchable guide;
9. enterprise sorting, tree navigation, and war-target filtering;
10. semantic shortcut bindings;
11. retirement and expanded household agency.

Balance and content work should be proposed separately after the relevant rule is
visible and measurable.
