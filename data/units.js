/* =========================================================================
   Fallowborn — UNIT CLASSES (moddable)

   The single source of truth for host composition: every field host's
   `units` record is keyed by these class ids (`men` stays the total).
   Each entry:
     name          — localized display name (a plural group noun)
     icon          — display emoji
     quality       — battle quality of one man of the class
     upkeepPer100  — seasonal logistics per 100 live men of the class
                     (absent on hired classes, which cost fixed contracts)
     casualtyOrder — battle losses fall on the lowest order first
     counters      — { <enemyClassId>: <multiplier> } — the class fights
                     above its quality against that enemy class (the battle
                     weights each side's counter edge by the enemy's
                     composition shares and caps the swing at
                     balance.battleCounterMaxSwing)
     terrainFactors — optional per-terrain quality override; a missing class
                     reads balance.terrainBattleFactors, a missing terrain
                     reads as 1
     share         — optional fraction of the mustered levy that fields as
                     this class when the realm qualifies
     requiresTech  — optional technology id (or array) gating the class
     cultures / notCultures — optional culture gates (data/cultures.js ids)
     hired         — true for hired companies: never mustered from the levy,
                     costed per contract instead of per head

   The five baseline classes (levy, arch, cav, ret, mercs) are the migration
   baseline: saves and hosts from before this table default every missing
   class to 0. Later classes unlock by technology or culture — see
   docs/designs/war.md.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.unitClasses = {
  levy: { name:'Levy', icon:'🌾', quality:0.85, upkeepPer100:0.5,
    casualtyOrder:0,
    basket:{ provisions:0.75, materials:0.20, transport:0.05 } },
  arch: { name:'Archers', icon:'🏹', quality:1.2, upkeepPer100:1,
    casualtyOrder:1,
    counters:{ pike:1.3 },
    basket:{ provisions:0.60, materials:0.30, transport:0.10 } },
  cav: { name:'Cavalry', icon:'🐎', quality:2.0, upkeepPer100:2,
    casualtyOrder:5,
    counters:{ crossbow:1.25 },
    basket:{ provisions:0.35, materials:0.10, transport:0.55 } },
  ret: { name:'Men-at-arms', icon:'🛡', quality:2.5, upkeepPer100:2,
    casualtyOrder:8,
    basket:{ provisions:0.45, materials:0.35, transport:0.20 } },
  mercs: { name:'Mercenaries', icon:'⚔', quality:1.5, casualtyOrder:4,
    hired:true,
    basket:{ provisions:0.50, materials:0.30, transport:0.20 } },

  /* Mechanical bows punch through armored foot but reload too slowly to
     answer a cavalry rush. */
  crossbow: { name:'Crossbowmen', icon:'🎯', quality:1.5, upkeepPer100:1.2,
    casualtyOrder:3, share:0.15, requiresTech:'crossbows',
    counters:{ ret:1.35, huscarl:1.35, pike:1.2, levy:1.1 },
    terrainFactors:{ farmland:1.05, forest:1.05, hills:1.1, mountains:1,
      desert:1, steppe:1, marsh:1, tundra:0.95 },
    basket:{ provisions:0.55, materials:0.35, transport:0.10 } },

  /* Ordered pike blocks stop mounted charges cold and struggle under
     archery or on broken ground. */
  pike: { name:'Pikemen', icon:'🔱', quality:1.1, upkeepPer100:0.8,
    casualtyOrder:2, share:0.2, requiresTech:'infantry_polearms',
    counters:{ cav:1.6, horsearcher:1.35, camel:1.35, cataphract:1.25 },
    terrainFactors:{ farmland:1.05, forest:0.85, hills:0.95, mountains:0.85,
      desert:1, steppe:1, marsh:0.85, tundra:0.95 },
    basket:{ provisions:0.70, materials:0.25, transport:0.05 } },

  horsearcher: { name:'Horse archers', icon:'🏇', quality:1.9,
    upkeepPer100:2.2, casualtyOrder:6, share:0.25,
    cultures:['magyar','turkic'],
    counters:{ levy:1.2, arch:1.15 },
    terrainFactors:{ farmland:1.1, forest:0.7, hills:0.9, mountains:0.7,
      desert:1.15, steppe:1.25, marsh:0.7, tundra:1 },
    basket:{ provisions:0.40, materials:0.15, transport:0.45 } },

  huscarl: { name:'Huscarls', icon:'🪓', quality:2.3, upkeepPer100:2,
    casualtyOrder:9, share:0.15, cultures:['norse','english'],
    counters:{ cav:1.4, levy:1.15 },
    terrainFactors:{ farmland:1, forest:1, hills:1.1, mountains:1.05,
      desert:0.95, steppe:1, marsh:0.95, tundra:1 },
    basket:{ provisions:0.50, materials:0.35, transport:0.15 } },

  camel: { name:'Camel riders', icon:'🐪', quality:1.8, upkeepPer100:2.2,
    casualtyOrder:7, share:0.2, cultures:['arabic','berber'],
    counters:{ cav:1.35, horsearcher:1.15 },
    terrainFactors:{ farmland:1, forest:0.7, hills:0.9, mountains:0.7,
      desert:1.3, steppe:1.1, marsh:0.7, tundra:0.8 },
    basket:{ provisions:0.45, materials:0.10, transport:0.45 } },

  /* Fully armored lancers — irresistible on open ground, helpless in close
     country, and checked by a steady pike block. */
  cataphract: { name:'Cataphracts', icon:'♞', quality:3.2, upkeepPer100:3.5,
    casualtyOrder:10, share:0.1, requiresTech:'cataphract_armor',
    cultures:['greek','armenian'],
    counters:{ levy:1.3, arch:1.2 },
    terrainFactors:{ farmland:1.2, forest:0.55, hills:0.8, mountains:0.55,
      desert:1, steppe:1.15, marsh:0.55, tundra:0.85 },
    basket:{ provisions:0.35, materials:0.25, transport:0.40 } }
};

/* Legacy `unit:*` unlock targets (unit:archers and friends predate the
   class ids) resolve through this alias table. */
FBDATA.unitClassAliases = {
  levy:'levy', archers:'arch', cavalry:'cav', retinue:'ret'
};
