# Distribution content profiles

The explicit CrazyGames flag selects authored alternatives in
`data/distribution_crazygames.js`, after the event packs and before the engine.
The script is inert in standard itch/play/file builds. It clones definitions,
replaces exact text and fields for 57 event IDs, validates its targets, and then
publishes the effective data. Original event packs remain unchanged. Event IDs
and option positions remain stable; triggers and chains remain unless the
profile explicitly closes an unavailable route.

The overlay replaces wagers with practice or social activities, alcohol with
meals/rest, cruel punishment choices with nonlethal alternatives, and explicit
battlefield detail with restrained descriptions. A failed final raid escape
now uses the existing recapture/bondage handler, with no lethal health effect.
Disease, bereavement, ordinary combat and historical bondage still exist.

Host discipline involves anonymous soldiers, so dismissal and reprimand retain
the existing aggregate opinion/prestige effects without claiming named-character
transactions. Deserter discipline already changes campaign effectiveness only.
The spouse-murder plot and assassination definitions are unavailable; the forced
spouse-plot event closes without killing anyone. Other hostile intrigue remains.

Shared justice projections, queueing, AI selection and application normalize
execution, qisas and blinding to imprisonment. Restricted sentences are absent
from the chooser; actual state changes, previews and messages agree. Intrigue
sentence projections similarly return prison. Sibling approaches and proposals
remain unavailable even with a previously accepted record; exposure cannot queue
or validate in this profile. Ordinary AI close-kin prohibitions remain intact.

The drunkard trait keeps its stable mechanical ID and modifiers but is presented
as Overindulgent. Event display fields and trait replacements use normal
source-hashed localization. A changed English source cannot reuse an old
translation; missing alternatives fall back to English. Catalog regeneration
remains owner-initiated.

CrazyGames disables runtime/bundled mods and uses the save fingerprint
`crazygames-content-1`. Saves without that profile, including older silent builds,
are rejected before state/RNG adoption. Standard builds also reject CrazyGames
saves. A new CrazyGames campaign is required; there is no destructive migration of
an existing life or its Chronicle. The profile is compatibility metadata, not an
anti-tampering mechanism.

Technology impact is **none**, recorded as `crazygames_content_profile`: platform
content restrictions are independent of in-world research. Technology gates on
retained tournament and other choices stay in place.

Public regression coverage is `tests/e2e/specs/distribution-content.spec.js`.
The source distribution itself does not claim an official PEGI rating.
