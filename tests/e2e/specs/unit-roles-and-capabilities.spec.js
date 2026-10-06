'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js',
  'js/logistics.js',
  'js/technology.js',
  'js/actions.js',
  'js/economy.js',
  'js/mods.js',
  'data/units.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Each core role's default class must stay the class engine code named
   before roles, so musters, retinue sources and hired companies land in
   the same host keys. */
const CORE_DEFAULTS = {
  levy_infantry:'levy', missile:'arch', cavalry:'cav', household:'ret', mercenary:'mercs'
};

/* The technologies that engine code named before capabilities, grouped by
   the capability that replaced them. */
const CAPABILITY_GRANTS = {
  seafaring_raids:['longships'],
  oceanic_navigation:['celestial_navigation', 'naval_logbooks', 'mariners_compass'],
  mounted_reach:['mounted_archery', 'cavalry_lances'],
  couched_lance:['cavalry_lances'],
  chartered_guilds:['guild_charters'],
  assayed_coinage:['mint_assay'],
  customary_law_courts:['customary_law'],
  permanent_markets:['urban_markets'],
  sealed_documents:['authenticated_seals'],
  parallel_research:['scholarly_networks', 'universities']
};

test('shipped unit classes declare known roles with the former defaults',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function (coreRoles) {
      const ids = Object.keys(FBDATA.unitClasses);
      const defaults = {};
      for (const role in coreRoles) defaults[role] = FB.unitRoleClass(role);
      return {
        errors:FB.validateUnitClassRoles(FBDATA.unitClasses, true),
        defaults:defaults,
        roles:ids.reduce(function (out, id) {
          out[id] = FB.unitClassRole(id);
          return out;
        }, {}),
        mounted:ids.filter(function (id) { return FB.unitClassMounted(id); }).sort(),
        hired:ids.filter(function (id) { return FBDATA.unitClasses[id].hired; }),
        /* a role named like a class id would hide that id from the ratchet */
        roleNamedLikeClass:Object.keys(FB.UNIT_ROLES).filter(function (role) {
          return Object.prototype.hasOwnProperty.call(FBDATA.unitClasses, role);
        }),
        aliases:['levy', 'archers', 'cavalry', 'retinue'].map(function (target) {
          return FB.unitClassForTarget(target);
        }),
        technologyErrors:FB.validateTechnologyData()
      };
    }, CORE_DEFAULTS);

    expect(result.errors).toEqual([]);
    expect(result.defaults).toEqual(CORE_DEFAULTS);
    expect(result.roles).toEqual({
      levy:'levy_infantry', arch:'missile', cav:'cavalry', ret:'household',
      mercs:'mercenary', crossbow:'missile', pike:'polearm',
      horsearcher:'horse_archer', huscarl:'heavy_infantry', camel:'cavalry',
      cataphract:'heavy_cavalry'
    });
    /* exactly the classes whose basket made them eat as horsemen before */
    expect(result.mounted).toEqual(['camel', 'cataphract', 'cav', 'horsearcher']);
    expect(result.hired).toEqual(['mercs']);
    expect(result.roleNamedLikeClass).toEqual([]);
    expect(result.aliases).toEqual(['levy', 'arch', 'cav', 'ret']);
    expect(result.technologyErrors).toEqual([]);
  });

test('a regional unit class with an existing role fights and supplies like that role',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      FB.mods.apply({
        unitClasses:{
          /* a mounted class with a foot soldier's basket: its role, not
             the basket, decides how it eats */
          e2e_equites:{
            role:'cavalry', name:'Equites', icon:'🐎', quality:2.0,
            upkeepPer100:2, casualtyOrder:5,
            basket:{ provisions:0.75, materials:0.20, transport:0.05 }
          },
          e2e_comites:{
            role:'household', name:'Comites', icon:'🛡', quality:2.5,
            upkeepPer100:2, casualtyOrder:8,
            basket:{ provisions:0.45, materials:0.35, transport:0.20 }
          },
          /* a spear block that answers any cavalry by role */
          e2e_contarii:{
            role:'polearm', name:'Contarii', icon:'🔱', quality:1.1,
            upkeepPer100:0.8, casualtyOrder:2, counters:{ cavalry:1.6 },
            basket:{ provisions:0.70, materials:0.25, transport:0.05 }
          }
        }
      });
      const state = FB.state;
      const at = state.player.provinceId;
      function commitment(units) {
        let men = 0;
        for (const key in units) men += units[key];
        return FB.armyProvisionCommitment(state, {
          realm:'player', at:at, men:men, supply:50, units:units
        }, 1);
      }
      const pike = { pike:100 };
      const spears = { e2e_contarii:100 };
      return {
        roles:{
          equites:FB.unitClassRole('e2e_equites'),
          comites:FB.unitClassRole('e2e_comites')
        },
        defaultsUnchanged:[FB.unitRoleClass('cavalry'), FB.unitRoleClass('household')],
        supply:{
          cav:commitment({ cav:100 }),
          equites:commitment({ e2e_equites:100 }),
          levy:commitment({ levy:100 })
        },
        household:FB.unitRoleMen({ levy:50, e2e_comites:20, total:70 }, 'household'),
        mercenary:FB.unitRoleMen({ mercs:150, levy:10 }, 'mercenary'),
        counters:{
          /* shipped pike names cav by class only */
          pikeVsCav:FB.armyBattleCounterMultiplier(pike, { cav:100 }),
          pikeVsEquites:FB.armyBattleCounterMultiplier(pike, { e2e_equites:100 }),
          spearsVsCav:FB.armyBattleCounterMultiplier(spears, { cav:100 }),
          spearsVsEquites:FB.armyBattleCounterMultiplier(spears, { e2e_equites:100 }),
          spearsVsLevy:FB.armyBattleCounterMultiplier(spears, { levy:100 })
        },
        displayedCounters:FB.unitClassBattleStats('e2e_contarii').counters.map(function (row) {
          return row.id;
        }).sort()
      };
    });

    expect(result.roles).toEqual({ equites:'cavalry', comites:'household' });
    expect(result.defaultsUnchanged).toEqual(['cav', 'ret']);
    expect(result.supply.equites).toBeCloseTo(result.supply.cav, 9);
    expect(result.supply.levy).toBeLessThan(result.supply.cav);
    expect(result.household).toBe(20);
    expect(result.mercenary).toBe(150);
    expect(result.counters.pikeVsCav).toBeGreaterThan(1);
    expect(result.counters.pikeVsEquites).toBe(1);
    expect(result.counters.spearsVsCav).toBeCloseTo(result.counters.pikeVsCav, 9);
    expect(result.counters.spearsVsEquites).toBeCloseTo(result.counters.pikeVsCav, 9);
    expect(result.counters.spearsVsLevy).toBe(1);
    expect(result.displayedCounters).toEqual(['camel', 'cav', 'e2e_equites']);
  });

test('shipped technologies grant the capabilities that replaced their id checks',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function (grants) {
      const out = {};
      for (const capability in grants) out[capability] = FB.capabilityTechIds(capability);
      return {
        grants:out,
        defined:Object.keys(FBDATA.capabilities).sort(),
        stacking:Object.keys(FBDATA.capabilities).filter(function (id) {
          return FBDATA.capabilities[id].stacks;
        }).sort(),
        namedLikeTechnology:Object.keys(FBDATA.capabilities).filter(function (id) {
          return Object.prototype.hasOwnProperty.call(FBDATA.tech, id);
        })
      };
    }, CAPABILITY_GRANTS);

    expect(result.grants).toEqual(CAPABILITY_GRANTS);
    expect(result.defined).toEqual(Object.keys(CAPABILITY_GRANTS).sort());
    expect(result.stacking).toEqual(['mounted_reach', 'oceanic_navigation', 'parallel_research']);
    expect(result.namedLikeTechnology).toEqual([]);
  });

test('a regional technology granting an existing capability unlocks the same feature',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      function tech(capabilities) {
        return {
          name:'Test practice', icon:'📜', domain:'governance', cost:50, req:[],
          desc:'A test practice.', unlocks:[], capabilities:capabilities, fx:{},
          history:{ attested:[400, 500], adoption:{ default:[450, 500] } },
          sources:['MOD'], confidence:'modded'
        };
      }
      FB.mods.apply({
        tech:{
          e2e_madrasa_network:tech(['parallel_research']),
          e2e_guild_register:tech(['chartered_guilds']),
          e2e_star_tables:tech(['oceanic_navigation'])
        }
      });
      const state = FB.state;
      const record = FB.realmTechRecord(state);
      function without(ids) {
        record.completed = record.completed.filter(function (id) {
          return ids.indexOf(id) < 0;
        });
      }
      without(['scholarly_networks', 'universities', 'guild_charters',
        'celestial_navigation', 'naval_logbooks', 'mariners_compass']);
      const before = {
        slots:FB.techSlotCount(state),
        guilds:FB.hasCapability(state, 'chartered_guilds'),
        navigation:FB.capabilityLevel(state, 'oceanic_navigation')
      };

      record.completed.push('e2e_madrasa_network', 'e2e_guild_register', 'e2e_star_tables');
      const regional = {
        slots:FB.techSlotCount(state),
        guilds:FB.hasCapability(state, 'chartered_guilds'),
        navigation:FB.capabilityLevel(state, 'oceanic_navigation')
      };

      without(['e2e_madrasa_network', 'e2e_guild_register', 'e2e_star_tables']);
      record.completed.push('scholarly_networks', 'guild_charters', 'celestial_navigation');
      const shipped = {
        slots:FB.techSlotCount(state),
        guilds:FB.hasCapability(state, 'chartered_guilds'),
        navigation:FB.capabilityLevel(state, 'oceanic_navigation')
      };

      record.completed.push('universities', 'naval_logbooks', 'mariners_compass');
      const stacked = {
        slots:FB.techSlotCount(state),
        navigation:FB.capabilityLevel(state, 'oceanic_navigation'),
        /* non-stacking capabilities stay at level 1 */
        guilds:FB.capabilityLevel(state, 'chartered_guilds')
      };
      return {
        before:before, regional:regional, shipped:shipped, stacked:stacked,
        errors:FB.validateTechnologyData().filter(function (error) {
          return error.indexOf('e2e_') >= 0;
        })
      };
    });

    expect(result.errors).toEqual([]);
    expect(result.before).toEqual({ slots:1, guilds:false, navigation:0 });
    expect(result.regional).toEqual({ slots:2, guilds:true, navigation:1 });
    expect(result.shipped).toEqual(result.regional);
    expect(result.stacked).toEqual({ slots:3, navigation:3, guilds:1 });
  });

test('mods must keep unit roles and capability grants valid',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      function attempt(mod) {
        try {
          FB.mods.apply(mod);
          return '';
        } catch (error) {
          return String(error && error.message || error);
        }
      }
      const base = { name:'Test', icon:'⚔', quality:1, casualtyOrder:3 };
      function unitClass(extra) { return Object.assign({}, base, extra); }
      return {
        unknownRole:attempt({ unitClasses:{ e2e_mystery:unitClass({ role:'mystery' }) } }),
        hiredMismatch:attempt({ unitClasses:{ e2e_band:unitClass({ role:'mercenary' }) } }),
        hiredFoot:attempt({ unitClasses:{ e2e_paid:unitClass({ role:'missile', hired:true }) } }),
        roleAsId:attempt({ unitClasses:{ cavalry:unitClass({ role:'cavalry' }) } }),
        roleKeyCounter:attempt({ unitClasses:{
          e2e_slingers:unitClass({ role:'missile', counters:{ polearm:1.2 } })
        } }),
        legacy:attempt({ unitClasses:{ e2e_legacy:unitClass({}) } }),
        legacyRole:FB.unitClassRole('e2e_legacy'),
        /* a replacement without role keeps the replaced class's role */
        replacement:attempt({ unitClasses:{ levy:unitClass({ name:'Fyrd' }) } }),
        replacedRole:FB.unitClassRole('levy'),
        unknownCapability:attempt({ tech:{ e2e_tech:{ name:'T', domain:'governance',
          cost:10, capabilities:['flying_machines'] } } }),
        badStacks:attempt({ capabilities:{ e2e_capability:{ stacks:'yes' } } }),
        newCapability:attempt({ capabilities:{ e2e_capability:{ stacks:true } } }),
        capabilityAdded:Object.prototype.hasOwnProperty.call(FBDATA.capabilities, 'e2e_capability')
      };
    });

    expect(result.unknownRole).toMatch(/unknown role mystery/);
    expect(result.hiredMismatch).toMatch(/hired exactly/);
    expect(result.hiredFoot).toMatch(/hired exactly/);
    expect(result.roleAsId).toMatch(/share its id with a unit role/);
    expect(result.roleKeyCounter).toBe('');
    expect(result.legacy).toMatch(/Unit class e2e_legacy needs a role/);
    expect(result.legacyRole).toBe(null);
    expect(result.replacement).toBe('');
    expect(result.replacedRole).toBe('levy_infantry');
    expect(result.unknownCapability).toMatch(/unknown capability flying_machines/);
    expect(result.badStacks).toMatch(/stacks/);
    expect(result.newCapability).toBe('');
    expect(result.capabilityAdded).toBe(true);
  });
