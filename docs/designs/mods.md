# Mods

**Mods** (`js/mods.js`) merge JSON from localStorage over `FBDATA` **before** world
generation — anything reading FBDATA at load time must run after `FB.mods.applyStored()` in
the boot path. Same-`id` entries replace; new ids are added. A mod's optional cosmetic
`name` labels it on the title screen (`refreshTitle` in main.js) and in the Mods dialog
(which lists active mods with per-mod removal); re-applying a same-name mod replaces the
stored copy.

Saves store only province/realm ids, so map changes can orphan old saves — every save is
therefore stamped with `FB.mods.sig()` (the `mods` field in save.js, covering stored mods
and enabled bundled mods alike) and `G.loadSlot` refuses to load a save whose mod set
differs from the active one.

**Bundled mods** (`mods/*.js`) register
`{id, name, desc, data}` into `window.FBMODS` via a script tag after the data files; the
Mods dialog toggles them, and enabled ids persist in localStorage (`fb_mods_bundled`) and
apply ahead of pasted mods.

Localization catalogs describe the core English data, but are never allowed to mutate it.
The source hash is calculated after mods are applied. Effective event sources are indexed
before locale validation so newly added mod text always has an English fallback. A mod's
authored name, description, and prose remain English unless they exactly match a known
catalog source; translation packs for third-party mods are outside the core v1 contract.

Related: `docs/MODDING.md` is the full mod authoring reference.
