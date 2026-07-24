# Political attention and foreign relations

Status: implemented

## Goal

Give an independent landed ruler a limited amount of political attention that can
be assigned to neighboring states. An assignment persists and automatically
improves or worsens that state's opinion of the player each season.

The system should make diplomacy something the player directs over time without
adding a bankable currency that rewards hoarding or duplicates gold and prestige.

## Recommendation

Political attention is a capacity, not a stored resource.

- Counts and Dukes have 2 attention.
- Kings have 3 attention.
- Emperors have 4 attention.
- One active foreign-policy assignment consumes one attention.
- Each neighboring sovereign can be set to **Improve**, **Neutral**, or
  **Provoke**.
- Assignments run automatically at every season boundary and remain in force
  until changed.
- Diplomacy affects the strength of an assignment, not the number of
  assignments available.

Suggested seasonal relation change:

```js
1 + Math.min(1, FB.skillOf(me, 'dip') / 20)
```

Improving applies the positive amount and provoking applies the negative amount.
The existing yearly 10% opinion decay remains in place. With 10 Diplomacy, a
continuously supported relation settles at roughly +54 or -54 instead of
inevitably reaching an extreme.

The feature unlocks at tier 4 and requires an independent player realm, matching
the current envoy and pact system. A vassal continues to manage personal
relations through homage, appeals, and the existing liege-chain actions rather
than conducting sovereign foreign policy.

## Existing foundations

The current architecture already supplies most of the required pieces:

- `player.liegeOps` stores the opinion of any realm toward the player. Despite
  its historical name, `FB.liegeOpOf` and `FB.adjustLiegeOp` already work for the
  direct liege, the rest of the liege chain, player vassals, and arbitrary realm
  ids.
- Realm opinion is clamped to -100 through 100 and decays 10% toward zero each
  year in `yearlyLife` (`js/main.js`).
- `FB.envoyTargets` already identifies adjacent sovereign courts and excludes
  the player, vassals, war enemies, and active pact partners.
- `state.pacts` and `FB.warTargets` already enforce hard non-aggression pacts.
- The season boundary in `G.passDay` is the natural place to run saved
  assignments.
- Realm ruler sheets already display `FB.liegeOpOf`, so foreign values can use
  the existing opinion presentation.

Do not use the unused `realm.op` field for this feature. A realm-owned scalar
suggests a general realm-to-realm diplomacy matrix, while this feature only needs
each realm's opinion of the player. Reusing the existing player-relative store
also preserves current council, vassal, and liege behavior.

Add clearer aliases such as `FB.realmOpinionOf` and
`FB.adjustRealmOpinion` if useful, but retain the old helpers for compatibility.

## Saved state

Store target-specific assignments in the life, not in browser automation
preferences:

```js
player.foreignPolicy = {
  west_francia: 1,  // improve
  denmark: -1       // provoke
};
```

Values are:

- `1`: improve relations
- `-1`: provoke
- missing/`0`: neutral

Initialize the object lazily so existing version-3 saves continue to load without
a migration or save-version bump. Remove dead or invalid realm ids when the list
is read or when a seasonal tick runs.

Clear the assignments on succession together with `player.liegeOps`. The network
represents the current ruler's personal court diplomacy, and the new ruler must
choose where to direct attention. Pacts remain state-level promises and continue
through succession as they do now.

Do not put assignments in `G.auto`. That object is a browser-local preference
stored in `fb_automation`; a target realm belongs to one particular saved world
and must survive save/export/import with that life.

## Target rules

For the first implementation, policy targets should be:

- alive sovereign realms;
- adjacent to the independent player realm;
- not the player realm itself.

An active war enemy may remain visible, but its policy should be marked suspended
until the war ends. An active pact does not prevent improving or provoking the
underlying relationship; the pact remains the hard guarantee that neither side
can declare war during its term.

If changing borders makes an assigned realm non-adjacent, remove or suspend the
assignment and free its attention. Prefer suspending it for the current UI
session and removing it at the next seasonal tick, with at most one durable
Chronicle message. Do not emit a message for the normal seasonal relation
change.

## Required gameplay consequences

Changing a foreign number is not enough. At present foreign opinion can be
stored and displayed, but neither envoy success nor AI declarations use it.

### Envoys and pacts

Add the target realm's opinion to `FB.sendEnvoy`:

```js
chance += FB.realmOpinionOf(state, rid) / 400;
```

Clamp the final chance after all modifiers. Friendly preparation therefore
helps secure a pact, while a provoked court is harder to reconcile. The existing
gold cost and two-year pact duration remain unchanged.

### AI declarations against the player

Apply a relation multiplier to the existing annual declaration chance:

```js
var relationMult = FB.clamp(
  1 - FB.realmOpinionOf(state, id) / 100,
  0.25,
  2
);
```

The existing declaration chance becomes:

```js
0.04 * r.aggression * relationMult
```

At high positive relations, attacks become less likely but never impossible.
Only a pact provides absolute protection. At deep hostility, the risk can
double.

This gives **Provoke** a deliberate risk/reward purpose: the player may invite a
defensive war, whose successful defense currently awards prestige, while risking
the loss of a province.

Do not make relation a hard gate on the player's declarations in the first
version. A later legitimacy or casus-belli system could make antagonism reduce a
war cost, but that is a separate expansion.

### Aggression default bug

Fix the existing authored-aggression default while touching AI declarations:

```js
aggression: r.aggression !== undefined ? r.aggression : 1
```

`r.aggression || 1` currently turns authored `aggression: 0` realms into
aggression 1. Apply the same fix when scripted realms are created. Without it,
relation-adjusted behavior would still ignore the intended peaceful realms in
the world data.

## Seasonal processing

Add a helper such as `FB.tickForeignPolicy(state)` in `js/actions.js`.

At each season boundary:

1. Lazily initialize and validate `player.foreignPolicy`.
2. Determine the player's current attention capacity.
3. Ignore invalid assignments beyond capacity in a stable order; the UI should
   prevent this normally.
4. Skip a current war enemy.
5. Apply the signed Diplomacy-scaled relation change through the existing
   opinion adjustment helper.
6. Remove assignments whose realms have died or are no longer valid targets.

Call it before the new-year `FB.worldTick`. The winter assignment then affects
the AI's declaration decision for the new year. Keep the operation deterministic;
it needs no random roll.

## User interface

Add a no-day-cost deed:

> 🕊 Foreign policy…

It is shown at tier 4+ when `state.realms.player` is alive. Opening the picker
does not spend the day or start a cooldown.

The modal should show:

- political attention used and available;
- neighboring sovereign realm and ruler;
- current numeric opinion and a descriptive opinion band;
- approximate field strength;
- active pact or war status;
- Improve, Neutral, and Provoke controls.

Use a two-step realm picker followed by the three stance choices if that produces
cleaner keyboard numbering. Every control must remain reachable with Tab and
usable on the mobile bottom-sheet layout.

Add a compact summary to the Deeds panel, for example:

> 🕊 Political attention 2/3 · West Francia ↑ +24 · Denmark ↓ -18

Do not add political attention to the top bar. The mobile top bar already gives
gold, prestige, piety, and health a full-width row, and attention is an assigned
capacity rather than a continuously changing resource.

Realm ruler sheets and foreign province panels should show the current relation
and policy stance. Where possible, link the sovereign name in the province panel
to the existing realm ruler sheet.

Use localized full phrases and placeholders for all new labels and descriptions.
Any Chronicle notification must use an opaque durable message descriptor.

## Balance data

Put tunable values in `FBDATA.balance`, for example:

```js
politicalAttentionCount: 2,
politicalAttentionKing: 3,
politicalAttentionEmperor: 4,
foreignPolicyBase: 1,
foreignPolicyDipCap: 1,
foreignOpinionEnvoyDivisor: 400,
foreignOpinionAttackMin: 0.25,
foreignOpinionAttackMax: 2
```

Exact key names may be shortened to match surrounding balance conventions.
Document public balance keys in `docs/MODDING.md`.

## File-level implementation

### `js/actions.js`

- Add attention capacity, target validation, order mutation, and seasonal tick
  helpers.
- Add the no-consume Foreign Policy deed.
- Reuse or wrap `FB.liegeOpOf`/`FB.adjustLiegeOp`.
- Add the opinion modifier to envoy success.

### `js/main.js`

- Add the seasonal tick call before the yearly world tick.
- Initialize the field in new-game state, or rely consistently on lazy
  initialization.
- Clear assignments during succession.
- Bump `FB.VERSION` and add the changelog entry when the feature is implemented.

### `js/world.js`

- Apply foreign opinion to AI declarations against the player.
- Correct the `aggression: 0` default handling for authored and scripted realms.

### `js/ui.js`

- Render the Deeds-panel attention summary.
- Add the target and stance dialogs.
- Show relation and stance on relevant realm/province views.
- Preserve keyboard, touch, and translated-text requirements.

### Documentation and localization

Update:

- `docs/designs/piety-intrigue-diplomacy.md`
- `docs/designs/time.md`
- `docs/designs/state-and-saves.md`
- `docs/designs/ui.md`
- `docs/README.md`
- `docs/MODDING.md`

Regenerate and validate all language catalogs after adding the user-facing text.

## Release and validation

This is a backward-compatible feature and should ship as the next minor version,
assigned when the work is integrated into `main`.

Permitted automated checks:

```text
node --check js/actions.js
node --check js/main.js
node --check js/world.js
node --check js/ui.js
python tools/i18n_catalog.py extract
python tools/i18n_catalog.py translate fr de it es
python tools/i18n_catalog.py validate
```

The game itself must not be run from a shell or a headless browser.

Manual browser checks should cover:

1. A new independent Count receives two attention and can assign both.
2. A third assignment is blocked until one is cleared.
3. Improve and Provoke move opinion in the expected direction each season.
4. Yearly decay still pulls unsupported and supported relations toward zero.
5. Diplomacy changes the seasonal rate.
6. Positive and negative opinion visibly change envoy odds and AI attack
   behavior without overriding pacts.
7. An assignment survives save/load and export/import.
8. Succession clears personal assignments and realm opinion while preserving
   active pacts.
9. Dead, conquered, and non-adjacent targets do not strand attention.
10. The picker is usable by keyboard and on a narrow mobile viewport.
11. French, German, Italian, and Spanish catalogs contain every new string and
    preserve placeholders.

