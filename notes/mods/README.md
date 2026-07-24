# Westeros — A Song of Ice and Fire mod

A total-conversion runtime mod for Fallowborn: the map becomes **Westeros in 297 AC**,
the year before the events of *A Game of Thrones*. Robert Baratheon holds the Iron
Throne, the great houses keep an uneasy peace, Mance Rayder is gathering the free folk,
and winter is coming.

## Installing

The mod is **bundled with the game** — no files to copy:

1. Open the game, click **Mods** on the title screen (or **☰ Menu → 🧩 Mods** in game).
2. Click **Enable** next to *Westeros — A Song of Ice and Fire*. The page reloads with
   the mod active — the title screen now says **🧩 Mod active: Westeros…**.
3. Start a **new life** — old saves reference the European map and will not fit the
   new one.

Saves remember their world: a life saved in Westeros loads only while the mod is
enabled, and European saves wait until it is disabled (the game refuses cross-world
loads instead of corrupting them). To go back to 867 AD Europe: Mods → **Disable**
(or **Remove all mods**). Your Westeros saves are kept and work again when you
re-enable the mod. If you previously pasted an older JSON copy of this mod into the
Mods dialog, remove it there — the bundled edition replaces it.

## What it changes

- **Map** — Westeros drawn from Dorne to the Lands of Always Winter: the mainland,
  the Iron Islands, Bear Island, Skagos, the Three Sisters, Dragonstone, Tarth,
  Greenstone, Fair Isle and the Arbor. The Trident, Blackwater, Mander, Greenblood,
  White Knife and Milkwater are drawn; the Gods Eye and Long Lake are carved out as
  lakes. Impassable wastelands: the Red Mountains, the Mountains of the Moon, the
  Deep Sands, the Wolfswood, the Frostfangs and the Land of Always Winter.
- **Start date** — 297 AC (the game's UI still prints "AD" in a few fixed strings;
  read it as *After Conquest*).
- **49 realms** — the great houses (Stark, Lannister, Baratheon ×3, Tully, Arryn,
  Tyrell, Martell, Greyjoy) plus their most storied bannermen (Bolton, Frey, Umber,
  Karstark, Manderly, Mormont, Reed, Blackwood, Bracken, Whent, Hightower, Redwyne,
  Dayne, Yronwood…), the Night's Watch, and the free folk beyond the Wall.
- **141 provinces** — Winterfell to Sunspear, Castle Black to Oldtown.
- **Cultures** — Northmen, Ironborn, Rivermen, Valemen, Westermen, Reachmen,
  Stormlanders, Crownlanders, Dornish, Free Folk and Valyrian (Dragonstone), each
  with lore-flavored name lists and settlement names.
- **Faiths** — the Old Gods, the Faith of the Seven, the Drowned God, and R'hllor.
- **Titles** — Smallfolk → Freeholder → Landed Knight → Petty Lord → Lord →
  High Lord → Lord Paramount → King (northern/ironborn line uses Master/Warden).
- **Scripted history** — 298: Robert dies; 299: the War of the Five Kings opens;
  300: the ironborn strike the North's western shores; 302: **the Others** come for
  the lands beyond the Wall.
- **Events** — ~20 new ones: direwolf pups and wolf dreams, taking the black and
  ranging beyond the Wall, wildling raids, tourneys, hedge knights, maesters,
  heart-tree vigils, drownings and reavings, the red comet, greyscale, the white
  raven, executing deserters in the old way, and more.
- **Tech, buildings, items** — innovations re-dated for 297 AC (Ravenry, Maesters of
  the Citadel, Knightly Cavalry…); the Great Sept / Godswood / Red Temple and the
  Maester's Tower; Valyrian steel, dragonglass, dragon eggs and weirwood bows.
- **Balance** — monogamy everywhere (no polygyny in Westeros), slightly calmer AI
  wars during Robert's peace.

## For modders: the id mapping

The engine merges mods by id and never deletes, so this mod **reuses every base
province and realm id** — otherwise the old European seeds would still claim pixels
on the new map. Ids are invisible in play, but if you want to extend the mod
(scripted `targets`, `straits`, events), you need the mapping. Realms:

| id | is now | | id | is now |
|---|---|---|---|---|
| west_francia | Baratheon (Iron Throne) | | norway | Frey |
| east_francia | Lannister | | sweden | Blackwood |
| lotharingia | Tully | | rus | Bracken |
| italy | Tyrell | | poland | Mallister |
| papacy | Hightower | | wends | Darry |
| benevento | Redwyne | | prussia | Mooton |
| emirate_bari | Florent | | lithuania | Whent |
| venice | Tarly | | finland | Bolton |
| byzantium | Stark | | bohemia | Karstark |
| cordoba | Martell | | moravia | Umber |
| asturias | Yronwood | | croatia | Manderly |
| navarre | Dayne | | serbia | Mormont |
| brittany | Arryn | | bulgaria | Glover |
| wessex | Baratheon (Storm's End) | | magyars | Reed |
| mercia | Baratheon (Dragonstone) | | khazaria | Dustin |
| east_anglia | Swann | | armenia | Ryswell |
| york | Dondarrion | | georgia | Hornwood |
| alba | Tarth | | abbasid | Night's Watch |
| gwynedd | Estermont | | emirate_crete | Free Folk |
| dublin | Grafton | | aghlabids | Thenns |
| munster | Royce | | idrisids | Hardhome |
| connacht | Baelish | | rustamids | Frozen Shore |
| ulster | Skagos | | sijilmasa | Crakehall |
| denmark | Greyjoy | | yemen | Marbrand |
| — | | | makuria | Farman |

Province ids follow the same trick (e.g. `baghdad` is Winterfell, `wessex` is
King's Landing, `jutland` is Pyke, `tahert` is Castle Black); the `name` field in
`westeros.js` is the source of truth — search the file for the place name to find
its id. Base strait pairs (which a mod cannot remove) were deliberately assigned to
islands so they stay sensible: e.g. `sicily`→Fair Isle keeps its old straits to
`calabria`→the Crag and `kairouan`→Lannisport.

## Known cosmetic limits (engine strings a JSON mod can't reach)

- Years print as "AD"; the intro and help text still describe 867 Europe.
- The Faith of the Seven uses the engine's christian-group wording (priest/church
  for `{holy}`/`{temple}`); R'hllor uses "the Lord" for `{god}`.
- Dorne's ruler is styled Lord Paramount, not Prince.
