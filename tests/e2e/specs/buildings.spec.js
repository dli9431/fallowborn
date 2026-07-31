'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.use({
  viewport:{ width:390, height:844 },
  hasTouch:true
});

test('raises buildings in two held counties from the narrow county ledger',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const counties = await page.evaluate(function () {
      const state = FB.state;
      const home = state.player.provinceId;
      const other = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      })[0].id;
      const record = FB.realmTechRecord(state);

      state.player.tier = 4;
      state.player.provs = [home, other];
      state.player.gold = 1000;
      state.dev[home] = 10;
      state.dev[other] = 10;
      for (const id in FBDATA.buildings) {
        const requirement = FBDATA.buildings[id].requiresTech;
        if (requirement && record.completed.indexOf(requirement) < 0) {
          record.completed.push(requirement);
        }
      }
      state.player.roleOrientationsSeen =
        state.player.roleOrientationsSeen || {};
      state.player.roleOrientationsSeen[
        'role-tier-' + state.player.tier] = 1;
      FB.ui.refresh();
      FB.ui.showBuildings();
      return {
        home:home,
        homeName:FB.world.byId[home].name,
        other:other,
        otherName:FB.world.byId[other].name
      };
    });

    await expect(page.getByRole('heading', { name: 'Build Where?', exact: true }))
      .toBeVisible();
    await page.locator('[data-bprov="' + counties.home + '"]').click();

    const picker = page.locator('#gm-building-county');
    await expect(picker).toBeVisible();
    await expect(picker.locator('option')).toHaveCount(2);
    await expect(picker).toHaveValue(counties.home);
    await expect(page.getByRole('heading', {
      name:'Building Works in ' + counties.homeName, exact:true
    })).toBeVisible();

    await picker.selectOption(counties.other);
    await expect(picker).toHaveValue(counties.other);
    await expect(page.getByRole('heading', {
      name:'Building Works in ' + counties.otherName, exact:true
    })).toBeVisible();
    await page.locator('[data-bquick="mill"]').click();

    await expect.poll(function () {
      return page.evaluate(function (pid) {
        return FB.builtIn(FB.state, pid).filter(function (entry) {
          return entry.id === 'mill' && !entry.ruined;
        }).length;
      }, counties.other);
    }).toBe(1);

    await picker.selectOption(counties.home);
    await expect(picker).toHaveValue(counties.home);
    await page.locator('[data-bquick="mill"]').click();

    const built = await page.evaluate(function (ids) {
      return {
        home:FB.builtIn(FB.state, ids.home).filter(function (entry) {
          return entry.id === 'mill' && !entry.ruined;
        }).length,
        other:FB.builtIn(FB.state, ids.other).filter(function (entry) {
          return entry.id === 'mill' && !entry.ruined;
        }).length
      };
    }, counties);
    expect(built).toEqual({ home:1, other:1 });
  });
