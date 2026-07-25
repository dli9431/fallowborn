# Social networks, household service, and occupation perks

Status: implemented

The implementation keeps this document as the design rationale and guardrail record.
The shipped integration adds the Network tab, intentional canonical friendship, paid
capacity-limited retainers, a shared position registry, surfaced guild and office perks,
bounded guild and vassal favors, occupation preservation across landed elevation, and an
authoritative computed levy ledger. Owner-directed manual browser verification remains
the release handoff required by repository policy.

## Goal

Turn the game's existing named characters, household work, occupations, guild
standing, local offices, vassals, and military contributions into one legible
people-and-influence layer.

These systems already create good individual stories, but they are mostly
presented and resolved in isolation. A character can like the player without
becoming the friend used by events. Family livelihoods live in Work &
Enterprises, guild rank is visible mainly while changing a career, local offices
are one-time event rewards, vassals appear in land and realm interactions, and
the final levy is shown without explaining who supplied it. The player therefore
has relationships and positions, but not a coherent view of the network those
relationships form.

This proposal adds that coherence without simulating every court in the world.

## Current findings

### Regard is not friendship

Every named character has an `opinion` of the player. The character sheet's
**Spend the day in their company** action raises that particular character's
regard, but it does not assign `state.roles.friend`.

Events use the canonical `friend` role instead. When an event containing a
`{friend}` token needs that role and none exists, `FB.getRole` creates a new peer
character and installs that stranger as the friend. The `make_friend` event can
therefore introduce a friend unrelated to the person whose company the player
has deliberately cultivated.

The rival system has already moved toward named-character continuity: hostile
contacts record which existing character crossed the player, while
`state.roles.rival` remains the compatibility seat for events and saves.
Friendship should follow the same principle.

### Household work is family-only

`FB.householdMembers` consists of the player, resident spouses, and unmarried
children. Only those characters can be assigned occupations, contribute wages,
or staff household enterprises. The data already describes careers such as
soldier and courtier in household-service terms, but there is no way to retain a
capable outsider as an armsman, steward, clerk, or other paid dependant.

This makes a prosperous or landed household feel as small as a serf family even
when its fiction refers to servants and sworn men.

### Guild benefits exist but are poorly surfaced

Guild membership and rank already matter. `career.guildRank` progresses from
member through master, officer, and guildmaster; rank gates some enterprises,
improves enterprise yield, opens larger merchant partnerships, grants prestige,
and the legacy `guild_member` flag improves some player work.

Most of that value is only discoverable inside career selection, individual
enterprise requirements, or an action's arithmetic. There is no durable view of
the household's guild affiliations, current benefits, next privilege, or the
people through whom the household participates.

### Local positions stop at the event reward

The town `councilman` and military `sergeant` outcomes set flags and grant
immediate gold, prestige, or skill. Those flags do not provide a continuing
office description, income, influence, military benefit, duty, or relationship.
The story says the player now holds a position; the simulation treats the
position as a completed event.

### Landed status obscures the occupation that earned it

The career record can retain a mercantile or craft background, but
`FB.syncPlayerCareer` exposes most tier 3+ player characters as `noble` through
`player.profession`. Event eligibility and prominent presentation consequently
replace the merchant identity with noble occupation when the player becomes
landed.

Rank and occupation are doing two different jobs and should not overwrite one
another. A merchant who acquires a barony is a landed merchant and noble, not a
person with no remaining trade history, guild connections, or commercial
advantages.

### The levy has a total but not a ledger

`FB.playerComposition` correctly combines:

- development from directly held counties;
- building levy, men-at-arms, and archers;
- technology and Royal Council modifiers;
- the ruler's Martial modifier;
- the over-domain penalty;
- the standing barony retinue; and
- a share of each vassal's county levy.

`FB.playerLevy` then reduces that composition to one total. The Land and war
interfaces show the result or broad troop classes, but not a source-by-source
account. A player cannot readily tell how much came from a county, building,
vassal, officer, skill, or penalty, or why granting land changed the host.

## Recommendation: one contextual Network tab

Add a **Network** tab that assembles existing people and institutions around the
current household. It should be contextual rather than permanently dense:
sections appear when the player has relevant relationships, property, guild
standing, retainers, offices, vassals, or a liege.

The tab has four sections:

1. **Household** — resident family, paid retainers, occupations, enterprise
   assignments, upkeep, capacity, and household offices.
2. **Connections** — the canonical friend, other cultivated contacts, rivals,
   suitors, tutors, and important personal regard.
3. **Trade & Guild** — household guild members, rank and standing, unlocked
   privileges, enterprises, partnerships, and local civic or trade positions.
4. **Realm** — liege relationships, vassals, land grants, levy contributions,
   pacts and sovereign contacts where applicable, and a summary link to the
   Royal Council.

This is a presentation layer over focused systems, not a second character
database. Character sheets remain the place for dealings with one person, Work
& Enterprises remains the place to change careers and staff property, and the
Royal Council remains the place to manage great officers and crown authority.
The Network tab answers the broader question: "Who is tied to this household,
how, and what does that tie currently do?"

## Friendship integration

Keep `state.roles.friend` as the canonical event and save compatibility seat,
but fill it from an existing relationship whenever possible.

- Cultivating a named character should be capable of making that character the
  canonical friend. Crossing a clear regard threshold should reveal an explicit
  **Call friend** or equivalent action so the transition is intentional.
- If there is no canonical friend, friendship events should prefer a living,
  eligible cultivated contact over generating a new character.
- If a canonical friend already exists, cultivating another character should
  create a warm connection, not silently replace the friend. Replacement should
  require an explicit choice and should address any sworn-brotherhood state.
- Friend event tokens and effects continue to use `state.roles.friend`, so
  existing events and mods need no new role vocabulary.
- The Connections section should distinguish descriptive regard from the
  mechanical relationship: "warm toward you" is not the same as "your friend."

Friendship is personal to the current player character. On succession it should
end or be reconsidered, while household arrangements that were explicitly
contracted may pass to the heir under their own rules.

## Retainers and household offices

Add a small roster of paid, named retainers outside the immediate family.
Retainers should reuse normal characters and careers; they are not anonymous
resource cards.

A retainer record needs only the relationship-specific state that does not
belong on the character, such as character id, agreed seasonal pay, start date,
and household office. Occupation, skills, traits, religion, culture, health, and
regard remain on the character.

Possible household services include:

- steward or clerk for administration and enterprise support;
- armsman or sergeant for the professional military core;
- factor for trade and partnership support; and
- tutor, chaplain, or household servant where existing career and religious
  rules permit.

Hiring should start from a known contact, event candidate, or generated local
candidate presented to the player. Service should create an ongoing economic
and social relationship: pay is charged seasonally, low regard or unpaid wages
can end service, and dismissal remains available.

Household offices are additive assignments, not replacement occupations. A
merchant can serve as factor, a soldier as captain, and a courtier as steward.
Only offices with a clear gameplay responsibility should be added. The first
implementation should use a compact roster rather than a general-purpose job
simulator.

## Occupations, offices, and position perks

Separate three concepts in both data and presentation:

- **station/title** — serf through emperor and any landed title;
- **occupation/career** — farmer, merchant, craftsman, soldier, courtier,
  cleric, or noble livelihood; and
- **position/office** — councilman, sergeant, guild officer, household steward,
  royal constable, and similar appointments.

Landed elevation should change station and title without erasing the underlying
career. Noble can remain the default livelihood for characters who truly enter
landed estate management, but elevation alone should not discard a developed
merchant or craft identity. Noble event eligibility should test station where
the story is about rank, not use `player.profession` as a proxy.

Define continuing position perks through one small registry and one computed
bonus path. Existing flags can remain as migration and mod-compatibility inputs,
but the UI and calculations should not depend on scattered special cases.

Initial perks should be modest and legible:

- **Councilman** should supply a civic or trade benefit and make local influence
  visible in Trade & Guild.
- **Sergeant** should supply a continuing military-service benefit, such as pay,
  drill effectiveness, or a small professional-troop contribution.
- Guild offices should expose the income, access, partnership, and prestige
  benefits already attached to guild rank before adding more bonuses.

Perks should state their source wherever their effect is shown. The goal is to
make earned positions matter, not to create a pile of invisible percentage
modifiers.

## Guild affiliation and favors

Treat the current guild career state as an institutional relationship and show
it in Trade & Guild:

- member and occupation;
- rank and standing;
- current unlocked enterprises and partnership stakes;
- current income modifier;
- requirements and cost for the next rank; and
- household members or retainers who carry the affiliation.

Later guild favors can spend standing or call on named guild connections for
credit, contracts, apprentices, mediation, or political help. These should be
bounded opportunities with costs or obligations, not another universally
bankable currency.

Noble favors should similarly attach to existing vassal and liege relationships.
A favor can explain a concrete exception or request, but it should not reproduce
the Royal Council's authority, consent, officer temperament, or crown politics.

## Position perks and the levy ledger

Extract the military calculation into a numeric breakdown that is also the
source of truth for `FB.playerComposition`. Suggested ledger groups are:

- direct county levy, itemized by county;
- flat building contributions;
- technology percentage;
- Royal Council percentage;
- ruler Martial percentage;
- domain-limit penalty;
- vassal levy, itemized by vassal or county;
- standing barony men-at-arms;
- building and technology men-at-arms;
- archers; and
- any retainer or position contribution.

The calculation order matters. Percentage modifiers and the domain penalty
currently affect the player's own levy before vassal contributions are added.
The ledger must preserve and explain that behavior rather than recompute an
approximation for display.

`FB.playerLevy`, host raising, realm comparisons, and the Network display should
all consume the same computed result. The Realm section can then show each
vassal's contribution and the Household section can show professional troops
supplied by buildings, retainers, or offices.

## Royal Council integration

The tier 6+ Royal Council already has the correct scope for crowned government:
five great offices filled by vassal magnates, continuing tax/levy/build/piety/
plot bonuses, officer opinion, schemes, and crown authority.

Do not duplicate those seats as household retainer offices or rebuild their
management inside Network. The Network Realm section should summarize:

- which vassals sit on the Council;
- each active office bonus;
- the Council's levy contribution in the ledger;
- notable opinion or vacancy warnings; and
- a direct route to the existing Royal Council interface.

Personal household service exists below and beside the crown. A trusted steward
can run the ruler's household without becoming Seneschal of the realm, and a
household captain can lead retainers without becoming Royal Constable.

## Implementation priorities

1. **Correct friendship semantics and surface existing occupational perks.**
   Make cultivated characters eligible to become the canonical friend; stop
   friendship prose from unexpectedly creating an unrelated friend when an
   eligible contact exists. Show current guild and career benefits, and give
   existing councilman and sergeant positions explicit continuing meaning.
2. **Add the Network view and computed levy breakdown.** Assemble existing
   household, connection, trade, guild, liege, vassal, pact, and Council data in
   the four contextual sections. Make one numeric composition breakdown drive
   both the army total and its ledger.
3. **Add paid retainers and household offices.** Introduce the small,
   capacity-limited roster, seasonal pay, assignment rules, departures, and
   household-level perks.
4. **Expand guild and noble favors without duplicating the Royal Council.**
   Add bounded institutional and relationship opportunities only after the
   underlying people, affiliations, and effects are visible.

Each phase should update the relevant system design documents when implemented,
especially characters, holdings, war, council, state and saves, UI, and i18n.

## Guardrails and non-goals

- Retainers are paid and capacity-limited. They must not become free extra
  workers, an unlimited skill farm, or a substitute for resident family.
- Do not store a separate levy total or a display-only approximation. Store only
  durable inputs; derive the breakdown, troop classes, and total together.
- Personal friendships are distinct from inherited household arrangements.
  Succession should not make the heir personally close to the late ruler's
  friend, while a paid service contract may be explicitly renewed or inherited.
- Do not simulate every AI court, household, guild roster, or friendship graph.
  Materialize named people when they interact with the player and summarize
  institutions elsewhere.
- Do not turn the Network tab into a second management screen for every system.
  It should summarize relationships, expose their effects, and link to the
  focused action that changes them.
- Do not duplicate Royal Council offices, crown authority, or Council consent
  with a parallel household-office system.
- Keep new state lazy and serializable so old saves remain valid. Prefer
  character ids and compact relationship records over rendered prose or copied
  character data.
- Route all eventual player-facing labels and durable messages through the
  existing localization and message-descriptor systems.
