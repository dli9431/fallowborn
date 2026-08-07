# Plan: trait-gated sibling courtship and exceptional recognition

Status: implemented in the working tree; automated coverage authored but not run
Baseline: Fallowborn v1.113.0, 2026-08-06

## Purpose

Players should be able to attempt to court an adult sibling, but the interaction
must remain exceptional. It should emerge from the two characters' dispositions,
their relationship, and their religious setting rather than from a universal
“allow incest” switch or an expensive button that anyone can eventually buy.

The key distinction is:

- **the protagonist's traits decide whether they can voice the intent at all;**
- **the sibling's own traits and Standing decide whether they entertain it;**
- **faith decides whether a resulting union can be solemnized or is an illicit
  defiance with serious consequences.**

This keeps the feature available across campaigns while making it uncommon even
before its social, religious, and health costs arrive.

## Historical basis and limits

There are two legitimate historical frames, and the game should not confuse
them.

### Individual transgression

[Jean V, Count of Armagnac](https://www.universalis.fr/encyclopedie/jean-v-armagnac/)
publicly kept his sister Isabelle as his partner in the fifteenth century and had
three children with her. A modern scholarly study in the
[Cahiers de Fanjeaux](https://www.persee.fr/doc/cafan_0575-061x_2019_act_52_1_2318)
describes the case as well documented by judicial, papal, and narrative sources.
It was a scandal and a matter for Church and royal intervention, not evidence
that Latin Christianity accepted sibling marriage.

This supports a non-authorizing-faith route based on unusual individual
dispositions. Such characters may begin a forbidden courtship and even defy
their institutions, but they do not receive a fictional lawful dispensation.

### Religious recognition

[Encyclopaedia Iranica's survey of xwēdōdah](https://www.iranicaonline.org/articles/marriage-next-of-kin/)
reports that Middle Persian religious texts apply the rite to brother-sister
unions and describe it as pious, while emphasizing that the prevalence of
actual practice is uncertain. Zoroastrian priest-scholars compiled major Pahlavi
digests in the ninth and tenth centuries, and
[Zoroastrian communities still flourished in Fars](https://www.iranicaonline.org/articles/fars-iii/)
after Islam became dominant in Persia.

This supports a narrow faith-doctrine route that changes recognition and trait
interpretation. It does not make Persian culture itself permissive, does not
prove that most Zoroastrians practiced the rite, and does not make the action
easy.

### Health model

[NCBI describes consanguinity](https://www.ncbi.nlm.nih.gov/medgen/3213) as
increasing homozygosity and the chance of recessive disorders. The
[National Academies](https://www.ncbi.nlm.nih.gov/books/n/nap5141/pdf/) gives an
inbreeding coefficient of 1/4 for offspring of full siblings and 1/8 for half
siblings. These establish direction and relative severity, not clinical
incidence percentages for the UI.

Only sibling courtship is in scope. Parent-child, grandparent-grandchild, and
aunt/uncle-niece/nephew relationships remain prohibited in every route. AI and
arranged-match systems remain prohibited from choosing siblings.

## Core player flow

1. The sibling's character sheet shows **Make an exceptional approach…** whenever the
   pair passes ordinary identity and availability gates. The action remains
   visible while blocked so the player can see which traits or circumstances
   would make it possible.
2. `FB.siblingCourtshipStatus` evaluates the protagonist's disposition.
   A qualifying score allows the player to make one pair-specific approach.
3. The review shows the exact player traits that motivate the approach, the
   sibling traits that affect the response, current Standing, the response odds,
   discovery risk, religious status, and eventual consequences.
4. Confirming queues **A word that cannot be recalled**. Only now does the sibling
   make one seeded acceptance roll. No courtship or social-attention assignment
   exists before acceptance.
5. Refusal records a permanent refusal for that pair. Acceptance starts the
   ordinary courtship and consumes the player's one personal-attention slot.
6. The accepted courtship must reach +80 Standing before proposal. An illicit
   courtship also faces periodic exposure.
7. At proposal, a shared authorizing rite may produce a recognized sacred union.
   Otherwise the player can withdraw or publicly declare an irregular union and
   accept the disclosed religious and political consequences.

## Hard ordinary gates

The approach is relevant only when:

- both people are living, at least sixteen, opposite-sex under the current
  marriage model, unmarried, and unbetrothed;
- neither holds a celibate office or has a vocation whose effective faith forbids
  marriage;
- they are actual full or half siblings by recorded parentage, or siblings by the
  old-save role-and-house fallback;
- they are co-located, because this is a private personal approach rather than a
  remote diplomatic proposal;
- the sibling has at least +40 personal Standing;
- the protagonist has no active courtship and the pair has no refusal record;
- ordinary spouse capacity remains available.

These gates are not substitutes for traits. They ensure the interaction uses the
same adulthood, presence, vow, betrothal, and relationship rules as every other
courtship.

## Trait-gated initiation

Add numeric effects under the existing grouped trait-effect system:

```js
courtship:{
  siblingInitiate:0,
  siblingAccept:0,
  siblingDynastic:0,
  siblingRite:0,
  siblingExposure:0
}
```

`FB.traitBonus` can sum ordinary numeric fields, while two small helpers apply
the dynastic and faith conditions. Mods may tune or add qualifying traits without
hard-coding trait ids into `FB.courtshipStatus`.

Initial protagonist effects:

| Trait | Initiation effect | Interpretation |
| --- | ---: | --- |
| Lustful | +2 | personal desire crosses the taboo |
| Cynical | +1 | religious prohibition carries less weight |
| Deceitful | +1 | willing to begin a hidden relationship |
| Ambitious | +1 when dynastically relevant | preserve a crown, title, or exposed succession inside the house |
| Chaste | −2 | strong personal resistance |
| Honest | −1 | unwilling to begin through secrecy |
| Zealous | +1 with an authorizing rite; −2 otherwise | sacred duty under xwēdōdah, taboo under other doctrine |
| Lettered | +1 with an authorizing rite | learned access to the textual tradition |

The action requires a final initiation score of at least +1. This is a real trait
gate: gold, prestige, high skills, or repeated clicking cannot replace the
character's disposition. `Ambitious` counts only when the sibling or their likely
children have a visible succession or title-consolidation relevance; it is not a
generic synonym for desire.

Because traits can oppose each other, a Chaste Ambitious character does not
automatically qualify. A Zealous character is pushed in opposite directions by
an authorizing rite and a prohibiting faith. The UI shows the arithmetic in plain
language rather than presenting a mysterious disabled button.

## Independent sibling response

The target's response is a separate named chance. No trait guarantees acceptance,
and the protagonist's initiating trait does not get counted a second time as the
sibling's consent.

Initial formula:

```text
5% base
+ (Standing − 40) / 200, capped at +30%
+ target trait acceptance modifiers
clamp to 2–70%, or 2–85% under an authorizing rite
```

Initial target effects:

| Sibling trait | Response modifier | Condition |
| --- | ---: | --- |
| Lustful | +25% | always |
| Ambitious | +15% | only with real dynastic relevance |
| Cynical | +15% | when their faith prohibits the union |
| Deceitful | +10% | on the illicit/secret route |
| Zealous | +25% | with an authorizing rite |
| Zealous | −35% | when their faith prohibits the union |
| Chaste | −35% | always |
| Content | −15% | dynastic ambition is the stated rationale |
| Honest | −10% | on the illicit/secret route |

A target with no receptive trait remains possible but is capped at 10% unless a
shared authorizing rite applies. This is the “soft” side of the trait gate: the
sibling remains a person with an uncertain response, not a key that unlocks when
one trait is present. Resistant traits can reduce the chance to the 2% floor.

The review displays the final percentage and every applicable trait modifier.
Confirmation is irreversible. A refusal saves `status:'refused'` for the sorted
character pair and the action never appears as available for that pair again.
Save/reload therefore cannot create a fresh response roll.

## Courtship after acceptance

Acceptance calls `FB.beginCourtship`; it does not invent a parallel relationship
system. The existing courtship terms, attention assignment, presence checks,
breakoff handling, travel cleanup, death cleanup, and proposal path remain
authoritative, with these exceptions:

- `FB.courtshipStandingThreshold(state,target)` returns +80 for a sibling suit and
  today's +40 for every ordinary suit;
- `FB.courtshipTerms` shows zero dowry because both partners are already members
  of the same house;
- sibling courtship never forms a royal compact or marriage alliance;
- a special `sibling_proposal` named chance uses the normal proposal formula,
  adds the target's response traits, and caps at 60%;
- proposal refusal permanently closes the pair and releases social attention;
- breakoff by the player records the normal Standing loss and a five-year pair
  cooldown, preventing casual cycling.

### Exposure for a prohibited courtship

When the effective faith does not authorize sibling marriage, the relationship
is illicit. Once per season it makes one bounded exposure roll, initially 12%:

- each Deceitful partner reduces risk by 2 percentage points;
- each Honest partner increases it by 2 points;
- high Intrigue reduces it by at most 4 points;
- the roll clamps to 4–18%.

Exposure queues one event, never repeated notices in the same season. The player
may end the courtship, deny it through an Intrigue chance, or openly persist.
Persistence costs piety, prestige, Common Voice, and liege Standing but does not
force the sibling to marry. These are consequences for defying the surrounding
institution, not a universal moral penalty attached to the characters in all
faiths.

## Recognition and marriage

### Authorizing-faith route

Extend effective marriage doctrine with:

```js
kinship:{ siblingRite:'xwedodah' }
```

Both partners must share the same exact faith and resolve
`siblingRite:'xwedodah'`.
At proposal, the rite requires 75 piety, 25 gold, and a short confirmation before
the sacred-fire wedding. This is deterministic once the sibling accepts and the
ordinary proposal succeeds; there is no second clerical lottery. The completed
marriage is recognized without the scandal reputation or institutional penalties
of the irregular route.

The implementation seeds an assignable Zoroastrian definition and an 867 Istakhr
access point. The 1066 Seljuk realm-faith override continues to represent the
later Sunni conquest of Fars.

### Prohibiting-faith route

The proposal review must call the outcome an **irregular union**, not a lawful
dispensation. If the player confirms and the sibling accepts the final proposal:

- use the ordinary spouse-link and family mechanics so the relationship is not a
  stateless affair;
- charge 75 piety, 25 prestige, −15 Common Voice, and −20 liege Standing;
- add a non-inherited `scandalous_union` reputation to both partners;
- apply faith-specific authority consequences: Papal Standing and possible
  excommunication for a Catholic, and equivalent condemnation text and Standing
  loss rather than a fictional Pope for other faiths;
- do not create a dowry, alliance, or royal compact.

The exact legal status of children is deferred until Fallowborn has a general
legitimacy system. They remain ordinary children in the current inheritance model
rather than receiving a one-off sibling-union legitimacy rule.

## Kinship architecture

The current close-kin checks are spread across `FB.courtshipStatus`,
`closeMatchKin`, and `FB.royalCloseKinSnapshot`. Add one read-only classifier:

```text
FB.kinshipDegreeSnapshot(state, a, b)
  -> self | parent_child | grandparent | full_sibling | half_sibling |
     avuncular | cousin | unrelated
```

`FB.closeMarriageKinSnapshot(state,a,b)` consumes that degree for the shared
ordinary prohibition. Player courtship routes an accepted sibling record around
that prohibition; arranged matches and AI callers consume it without an exception.
Every ordinary caller therefore blocks self, lineal, sibling, and avuncular
relations while cousins retain today's eligibility.

Rendering uses snapshot-only helpers. Explicit actions may perform existing
royal-tree repair before authoritative revalidation. No sheet render may consume
RNG, materialize a royal character, or create a response record.

## Save state

Store the pair's decision outside `player` so it survives succession:

```js
state.siblingCourtships = {
  '<lower-id>|<higher-id>': {
    initiatorId:'c1',
    targetId:'c2',
    status:'accepted|refused|cooldown|married',
    route:'illicit|xwedodah',
    approachedTurn:0,
    acceptedTurn:null,
    cooldownUntil:null,
    exposed:false
  }
}
```

Do not save prose, names, displayed odds, or trait labels in the pair record. The
queued approach context freezes the exact target id, reviewed route, and response
chance, then revalidates all live gates before rolling. Restore supplies `{}` to
old saves, removes malformed or orphaned records, normalizes saved fields, and
reconciles accepted current-player records with the live courtship without ever
silently starting one.

## Children and repeated close kinship

At birth, classify the recorded parents rather than trusting the courtship route.
Make one seeded additional-risk roll that may add one existing constitutional
trait (`frail` or `sickly`) or reduce starting health by one.

Initial balance targets are 20% additional risk for full-sibling parents and 10%
for half-sibling parents, plus 5 percentage points for each parent who was also
born to a sibling union, capped at 35%. These are declared game-balance values,
not clinical incidence claims. Healthy children remain possible. Never add a
“pure blood” reward or present the roll as genetic counseling.

Store only locale-neutral provenance — degree, parent ids, balance risk, and a
neutral or rolled outcome — so one preceding generation can compound risk. The
child's identity, house, legitimacy, succession, and playability remain ordinary.

## UI and accessibility

- Keep the action on the sibling's existing character card.
- Show the protagonist's initiation score and each contributing trait.
- Show the sibling's response chance and each visible target-trait modifier.
- Disclose permanent refusal, exposure risk, proposal threshold, religious route,
  resource/opinion consequences, no dowry/alliance, and child-health risk before
  confirmation.
- Use “forbidden courtship,” “recognized rite,” and “irregular union” accurately;
  never imply that a prohibiting faith granted permission.
- Use real buttons, keyboard focus, Escape/back behavior, and the existing mobile
  bottom-sheet layout.
- Route every new string through event data or `FB.T`; saved records remain
  locale-neutral.

## Milestones

### 1. Centralize kinship and trait effects

- Add kinship-degree and mode-aware marriage-status helpers.
- Add grouped courtship trait effects and mod documentation.
- Preserve every existing close-kin result outside explicit player courtship.

### 2. Add the one-time approach

- Add initiation scoring, target response odds, review UI, the queued response
  event, permanent refusal, and save/restore repair.
- Ensure no RNG or mutation occurs during rendering.

### 3. Integrate courtship and exposure

- Reuse ordinary attention/courtship mechanics with the +80 threshold.
- Add pair cooldowns, illicit seasonal exposure, event choices, and exact
  religious/political consequences.

### 4. Integrate proposal and marriage

- Add target-aware proposal chance, permanent rejection, zero dowry, no compact or
  alliance, authorizing-rite solemnization, irregular-union consequences, and the
  `scandalous_union` reputation.

### 5. Add bounded child consequences

- Derive parental kinship at birth, add the seeded capped risk, store neutral
  provenance, and update child preview/Guide explanations.

### 6. Historical faith route and coverage

- Add a researched Zoroastrian definition and Fars access point if approved.
- Update marriage, religions, events, state/save, character, UI, and modding docs.
- Add deterministic browser coverage for every trait score, conditional Zealous
  and Ambitious behavior, displayed odds, acceptance/refusal persistence,
  exposure bounds, faith routes, proposal rejection, save/restore, full/half
  siblings, arranged/AI exclusions, ordinary-faith regressions, and seeded child
  outcomes.

## Acceptance criteria

- A protagonist without a qualifying net trait score cannot initiate sibling
  courtship, regardless of wealth, skills, rank, or repeated attempts.
- The sibling's own traits independently alter a disclosed response chance; no
  protagonist trait stands in for their response.
- Refusal and proposal rejection are pair-specific, persistent, and cannot be
  rerolled by reopening the sheet or reloading a save.
- Zealous characters favor a shared authorizing rite and strongly resist a faith-
  prohibited union; Persian culture alone changes nothing.
- Acceptance begins the ordinary courtship only after the response event and uses
  the one personal-attention slot.
- Non-authorizing faiths call the relationship illicit and impose disclosed
  consequences rather than granting a fictional dispensation.
- AI, Match Assistant, and arranged descendant matches never choose siblings.
- Parent-child, grandparent, and avuncular courtship remain impossible.
- Completed unions use ordinary spouse, family, birth, succession, death, and save
  mechanics without dowry, alliance, or royal compact.
- Child risks are deterministic, capped, and non-rewarding; healthy children
  remain possible.

## Explicit non-goals

- A universal incest doctrine or culture toggle.
- Parent-child, grandparent-grandchild, or avuncular courtship.
- AI sibling relationships or arranged sibling matches.
- A gold-only, royal, papal, or cultural permission shortcut.
- Automatic acceptance from Lustful, Ambitious, or any other single trait.
- Repeated approaches after refusal, explicit sexual content, coercive prose, or
  genetic “purity” bonuses.
