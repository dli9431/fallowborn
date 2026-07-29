# Plan: one Standing system

Date: 2026-07-28

Status: step 1 of the
[systems-audit roadmap](systems-audit-00-roadmap.md); implemented 2026-07-29. This
design finding follows the
[systems audit](../2026-07-27-systems-audit.md) and supersedes its conservative
recommendation to preserve Regard, Favor, and Opinion as three player-facing meters.

## Finding

Regard, Favor, and Opinion should become one player-facing **Standing** system.
They describe the same core fact: how positively or negatively a particular person
or ruler regards the current protagonist. Their different contexts justify different
actions and consequences, but not different scales, terminology, or interaction
patterns.

The current implementation is already partly unified:

- Personal Regard is stored as `character.opinion`.
- Feudal Favor and foreign Opinion both use the same player-relative realm store:
  `player.liegeOp` for the direct liege and `player.liegeOps[realmId]` for other
  rulers. `FB.realmOpinionOf` and `FB.adjustRealmOpinion` are aliases over the
  historical liege-opinion helpers.
- `FB.rulerGiftUsesFavor` changes only the displayed label according to whether the
  ruler is in the player's upward or downward feudal chain. It does not select a
  different value.
- When a realm ruler is materialized as a full character,
  `FB.syncRealmRulerStanding` reconciles `character.opinion` with the realm standing
  store. Regard and political standing are therefore explicitly made into two views
  of one score for that ruler.

The game consequently has two legacy storage shapes, three names, and synchronization
code that tries to make them behave as one system. Presenting them as distinct systems
adds conceptual load without adding a meaningful decision.

## Unified model

Every eligible counterpart has one Standing toward the current protagonist, clamped
to `-100..100`.

The UI uses one name, one signed-number treatment, and one set of descriptive bands.
For example:

- `Standing with Alice: +45`
- `Standing with your liege: +20`
- `Standing with the ruler of Francia: -35`

The counterpart's context determines which actions change Standing and which outcomes
it unlocks:

| Context | Typical sources | Typical consequences |
| --- | --- | --- |
| Personal | Attention, visits, gifts, event choices, insults, family conduct | Friendship, courtship, marriage willingness, rivalry, service loyalty |
| Feudal | Homage, service, grants, taxation, petitions, council conduct | Title petitions, appointments, council behavior, grants, revolt risk, exceptional levies |
| Diplomatic | Envoys, foreign policy, ruler gifts, pacts, religious acts, war | Pact and alliance chances, aid, hostility, attack likelihood |

These are consumers and sources of Standing, not separate meters. A ruler who is also
a personal acquaintance must show the same value on the character sheet, realm sheet,
Council, Estates, and diplomatic interfaces.

## Shared interface

Introduce a canonical interface and route new work through it:

```js
FB.standingOf(state, target)
FB.adjustStanding(state, target, amount, source)
```

`target` must identify the kind and id of the counterpart rather than relying on the
caller to know which legacy field to mutate. The exact ES5-compatible shape can be
settled during implementation, for example:

```js
{ kind:'character', id:characterId }
{ kind:'realm', id:realmId }
```

The adjustment `source` is optional metadata for a future itemized explanation. It
must not become saved rendered prose; durable notices continue to use message
descriptors.

The first implementation should keep `character.opinion`, `player.liegeOp`, and
`player.liegeOps` behind compatibility adapters. Existing saves, event effects, mods,
and data keys such as `opinionLiege` and `roleOpinionAbove` should continue to work.
A physical state migration is a later decision and is not required to deliver one
coherent system to the player.

## Presentation

All Standing displays should share:

- the same `-100..100` scale and rounding;
- the same positive, neutral, and negative bands;
- the same signed-number and color conventions;
- one source/effect row renderer;
- predictable action placement on character and realm interaction cards;
- contextual explanations of what the current value enables.

Context remains visible as a descriptor or group of actions, not as a renamed meter.
For example, a liege sheet may say that Standing affects petitions and assembly votes,
while a courtship sheet says that Standing affects a proposal.

## Succession rule

Unification exposes an existing inconsistency. On player succession,
`player.liegeOp`, `player.liegeOps`, and foreign-policy assignments reset, while
ordinary `character.opinion` values are not comprehensively reset. The game therefore
does not currently apply one clear rule to personal and political relationships.

Standing is a relationship between the current protagonist and the current
counterpart:

- standing with a predecessor must not silently become the heir's identical personal
  relationship;
- standing already earned between the heir and a counterpart should be preserved if
  the game has actually tracked that pair;
- dynastic reputation may provide a bounded starting modifier, but should not copy the
  predecessor's full score;
- a ruler change must not leave a stale score attached to the realm merely because the
  realm id is unchanged.

The current character model stores only one player-relative opinion on each character,
not a pairwise relationship matrix. Protagonist succession therefore resets every
personal and realm Standing score to neutral. It does not invent the heir's relationship
by copying the predecessor's. Systems with an explicit inherited commitment may then
apply a bounded fresh modifier: inherited retainers renew at −15 Standing, for example.
Friendship, courtship, political attention, rival contacts, and other life-local
commitments keep their own existing succession cleanup.

AI ruler succession follows the same identity rule. A compact, unmaterialized heir starts
at neutral even though the realm id survives. A materialized heir keeps the Standing
already tracked with that exact person, replacing rather than inheriting the predecessor's
realm score.

## Implemented shape

`FB.standingOf` and `FB.adjustStanding` are the canonical typed facade. The historical
`character.opinion`, `player.liegeOp`, and `player.liegeOps` fields remain the saved
backing stores, and the old realm helpers and event/mod opinion keys remain compatibility
adapters. Direct-liege transitions preserve each realm's score while moving the dedicated
`liegeOp` slot. Historical durable-message keys and parameter names remain intact for
saved Chronicle entries. No save migration was added.

The shared UI renderer clamps and rounds the value, uses signed numbers, consistent
positive/neutral/negative colors, and the bands Hostile, Guarded, Neutral, Favorable,
and Warm. Character and realm sheets also explain the relevant consequences. A
materialized ruler resolves through the realm store, so their character, realm, Council,
Estates, gift, and diplomatic views show the same score.

## Boundaries

Do not merge the following into Standing:

- Common Voice or Popular Opinion, which represents a population;
- Crown Authority, which represents institutional power;
- religious vocation standing and guild rank, which are progression tracks;
- callable guild favors or exceptional-levy promises, which are discrete benefits;
- prestige and piety, which are spendable or threshold resources;
- alliance, pact, friendship, rivalry, courtship, and feud state, which are
  relationships or commitments unlocked and influenced by Standing rather than
  aliases for it.

## Implementation order

1. Adopt **Standing** as the player-facing term and provide one renderer and set of
   bands.
2. Add `FB.standingOf` and `FB.adjustStanding` as compatibility facades over the
   existing fields.
3. Route character sheets, realm sheets, gifts, personal attention, foreign policy,
   Council, and Estates through the shared readers and writers.
4. Remove duplicate Regard/Favor/Opinion UI helpers and ensure a materialized ruler
   has one displayed value everywhere.
5. Specify and implement succession behavior.
6. Reassess whether a canonical saved `standings` structure provides enough value to
   justify a save-healing migration. Do not migrate merely to rename fields.

## Completion criteria

- The player learns one relationship score rather than three synonymous terms.
- The same ruler displays the same Standing in every interface.
- Personal, feudal, and diplomatic actions retain their distinct requirements and
  consequences.
- Existing saves and mod/event opinion keys continue to work.
- Succession behavior is documented and consistent before legacy storage is removed.
