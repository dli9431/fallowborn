# Bundled mods

This folder holds **bundled mods**: classic scripts that register a total conversion or
content pack into `window.FBMODS`, giving it an Enable/Disable toggle in the Mods dialog
(title screen or ☰ menu).

To add one:

1. Drop a `.js` file here that pushes `{id, name, desc, data}` onto `window.FBMODS`
   (create the array if needed: `window.FBMODS = window.FBMODS || [];`). Classic script,
   no modules — same ES5 rules as the rest of the game.
2. Add `<script src="mods/yourmod.js"></script>` to `index.html` in the bundled-mods
   slot (after the `data/` files, before the engine files).
3. Enabled mods persist in localStorage and apply ahead of runtime-imported mods. Saves
   are stamped with the active mod set and only load while it matches.

The `data` payload uses the same schema as runtime JSON mods — see
[docs/MODDING.md](../docs/MODDING.md) for the full reference. Players can also import a
mod as JSON at runtime from the Mods menu without touching any files.
