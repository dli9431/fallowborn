'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/fortifications.js',
  'js/actions.js',
  'js/events.js',
  'js/mods.js',
  'js/world.js',
  'js/population.js',
  'data/map_data.js',
  'data/events_noble.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* The AI construction order and settlement-draw set that engine code
   listed by building id before roles; data must reproduce them exactly. */
const LEGACY_AI_ORDER = [
  'cathedral', 'university', 'guildhall', 'arsenal', 'foundry', 'exchange',
  'hospital', 'mill', 'windmill', 'market', 'harbor', 'granary', 'bridge',
  'temple', 'library', 'keep', 'barracks'
];
const LEGACY_SETTLEMENT_DRAW = ['bridge', 'harbor', 'market', 'mill'];

test('shipped buildings declare known roles and exactly one fortification',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const ids = Object.keys(FBDATA.buildings);
      return {
        errors:FB.validateBuildingData(FBDATA.buildings, true),
        fortification:FB.fortificationBuildingId(),
        unknown:ids.filter(function (id) {
          return !FB.BUILDING_ROLES[FBDATA.buildings[id].role];
        }),
        /* A role named like a building id would keep that id quoted in
           engine code and hide it from the content-id ratchet. */
        roleNamedLikeBuilding:Object.keys(FB.BUILDING_ROLES).filter(function (role) {
          return Object.prototype.hasOwnProperty.call(FBDATA.buildings, role);
        })
      };
    });
    expect(result.errors).toEqual([]);
    expect(result.fortification).toBe('walls');
    expect(result.unknown).toEqual([]);
    expect(result.roleNamedLikeBuilding).toEqual([]);
  });

test('AI construction order and settlement draw keep their former sets',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const table = FBDATA.buildings;
      return {
        order:Object.keys(table).filter(function (id) {
          return typeof table[id].aiBuildOrder === 'number';
        }).sort(function (a, b) {
          return table[a].aiBuildOrder - table[b].aiBuildOrder;
        }),
        draw:Object.keys(table).filter(function (id) {
          return table[id].settlementDraw === true;
        }).sort()
      };
    });
    expect(result.order).toEqual(LEGACY_AI_ORDER);
    expect(result.draw).toEqual(LEGACY_SETTLEMENT_DRAW);
  });

test('a regional building with an existing role acts in that role',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      FB.mods.apply({
        buildings:{
          e2e_horreum:{
            role:'food_store', name:'Horreum', icon:'🌾', cost:40, upkeep:1,
            populationFamineProtection:0.35, desc:'A test storehouse.'
          }
        }
      });
    });
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const state = FB.state;
      const home = state.player.provinceId;
      state.player.tier = 4;
      state.player.provs = [home];
      state.holder[home] = state.owner[home] = 'player';
      FB.foundPlayerRealm(state);
      FB.invalidateSettlementLordships(state);
      state.buildings[home] = [];
      FB.invalidateBuildingIndex(state, home);

      const famine = FBDATA.events.filter(function (ev) {
        return ev.id === 'famine_relief';
      })[0];
      const granaryOption = famine.options[0];
      const before = {
        role:FB.hasBuildingRole(state, 'food_store'),
        option:FB.checkTrigger(state, granaryOption.require, {})
      };

      state.buildings[home].push({ s:0, id:'e2e_horreum' });
      FB.invalidateBuildingIndex(state, home);
      return {
        before:before,
        role:FB.buildingRole('e2e_horreum'),
        fortification:FB.isFortificationBuilding('e2e_horreum'),
        hasRole:FB.hasBuildingRole(state, 'food_store'),
        option:FB.checkTrigger(state, granaryOption.require, {}),
        notRole:FB.checkTrigger(state, { notBuildingRoles:['food_store'] }, {}),
        granaryStillAbsent:FB.hasBuilding(state, 'granary')
      };
    });

    expect(result.before).toEqual({ role:false, option:false });
    expect(result.role).toBe('food_store');
    expect(result.fortification).toBe(false);
    expect(result.hasRole).toBe(true);
    expect(result.option).toBe(true);
    expect(result.notRole).toBe(false);
    expect(result.granaryStillAbsent).toBe(false);
  });

test('mod buildings must keep roles valid and a single fortification',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      function attempt(buildings) {
        try {
          FB.mods.apply({ buildings:buildings });
          return '';
        } catch (error) {
          return String(error && error.message || error);
        }
      }
      const base = { name:'Test', icon:'🏠', cost:10, desc:'A test building.' };
      function building(extra) { return Object.assign({}, base, extra); }
      return {
        unknownRole:attempt({ e2e_unknown:building({ role:'mystery' }) }),
        secondFort:attempt({ e2e_castrum:building({ role:'fortification', fort:true }) }),
        fortWithoutRole:attempt({ e2e_tower:building({ fort:true }) }),
        fortRoleWithoutFlag:attempt({ e2e_palisade:building({ role:'fortification' }) }),
        badOrder:attempt({ e2e_order:building({ role:'civic', aiBuildOrder:'first' }) }),
        unknownTableUnchanged:!Object.prototype.hasOwnProperty.call(FBDATA.buildings, 'e2e_unknown'),
        legacy:attempt({ e2e_legacy:building({}) }),
        legacyRole:FB.buildingRole('e2e_legacy'),
        fortification:FB.fortificationBuildingId()
      };
    });

    expect(result.unknownRole).toMatch(/unknown role mystery/);
    expect(result.secondFort).toMatch(/Exactly one building/);
    expect(result.fortWithoutRole).toMatch(/Exactly one building/);
    expect(result.fortRoleWithoutFlag).toMatch(/fort exactly when/);
    expect(result.badOrder).toMatch(/aiBuildOrder/);
    expect(result.unknownTableUnchanged).toBe(true);
    expect(result.legacy).toBe('');
    expect(result.legacyRole).toBe('unassigned');
    expect(result.fortification).toBe('walls');
  });
