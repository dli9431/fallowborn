'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/settlement.js',
  'js/technology.js',
  'js/world.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'data/map_data.js',
  'data/technology.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.use({
  viewport:{ width:390, height:844 },
  hasTouch:true
});

test('forming an independent count seeds building technology for empty settlements',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      s.player.tier = 4;
      s.player.liege = null;
      s.player.provs = [pid];
      s.player.gold = 1000;
      s.buildings[pid] = [];
      delete s.realms.player;
      delete s.realmTech.player;
      s.techSeeded = 1;

      FB.foundPlayerRealm(s);
      const settlements = FB.settlementsOf(s, pid);
      const options = settlements.map(function (settlement, index) {
        return FB.buildable(s, pid, index).map(function (entry) {
          return entry.id;
        });
      });
      FB.ui.showSettlement(pid, settlements.length - 1);
      return {
        effectiveRealm:FB.techRealmId(s),
        historicalSeeded:s.realmTech.player.historicalSeeded,
        templeKnown:FB.techRequirementMet(s, 'lime_mortar'),
        options:options
      };
    });

    expect(result.effectiveRealm).toBe('player');
    expect(result.historicalSeeded).toBe(1);
    expect(result.templeKnown).toBe(true);
    expect(result.options.length).toBeGreaterThan(1);
    for (const options of result.options) expect(options).toContain('temple');
    await expect(page.locator('#gm-raise')).toBeVisible();
  });

test('legacy numeric settlement indices stay visible and canonicalize on write',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      s.player.tier = 4;
      s.player.liege = null;
      s.player.provs = [pid];
      s.player.gold = 1000;
      delete s.realms.player;
      delete s.realmTech.player;
      FB.foundPlayerRealm(s);
      s.buildings[pid] = [{ s:'1', id:'mill' }];
      if (FB.invalidateBuildingIndex) FB.invalidateBuildingIndex(s, pid);

      const projected = FB.builtIn(s, pid);
      const duplicateBlocked = !FB.canBuildAt(s, pid, 1, 'mill');
      const raised = FB.build(s, pid, 0, 'temple');
      FB.ui.showSettlement(pid, 1);
      return {
        projectedSettlement:projected[0].s,
        duplicateBlocked:duplicateBlocked,
        raised:raised,
        storedSettlement:s.buildings[pid][0].s,
        storedType:typeof s.buildings[pid][0].s
      };
    });

    expect(result).toEqual({
      projectedSettlement:1,
      duplicateBlocked:true,
      raised:true,
      storedSettlement:1,
      storedType:'number'
    });
    await expect(page.locator('#gm-body')).toContainText('Watermill');
    await expect(page.locator('#gm-body')).not.toContainText('No buildings yet');
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

    // compact cards: name, one-line effect, cost meta; audit table behind ?
    const millWorkCard = page.locator('#gm-body .settcard', {
      hasText:'Watermill' });
    await expect(millWorkCard).toHaveCount(1);
    await expect(millWorkCard.locator('.settcard-fx')).toContainText('+2');
    await expect(millWorkCard.locator('.settcard-meta'))
      .toContainText('standing');
    const workDetails = millWorkCard.locator('.settcard-details');
    await expect(workDetails).toBeHidden();
    const workInfo = millWorkCard.locator('.settcard-info');
    await workInfo.click();
    await expect(workDetails).toBeVisible();
    await expect(workDetails).toContainText('Grinds the valley');
    await workInfo.click();
    await expect(workDetails).toBeHidden();

    // the raise control is a primary button inside the card
    const workRaise = millWorkCard.locator(
      'button.settcard-raise[data-bquick="mill"]');
    await expect(workRaise).toBeEnabled();
    const compactAlignment = await millWorkCard.evaluate(function (card) {
      const info = card.querySelector('.settcard-info').getBoundingClientRect();
      const raise = card.querySelector('.settcard-raise').getBoundingClientRect();
      return {
        top:Math.abs(info.top - raise.top),
        bottom:Math.abs(info.bottom - raise.bottom),
        infoHeight:info.height,
        raiseHeight:raise.height
      };
    });
    expect(compactAlignment.top).toBeLessThanOrEqual(1);
    expect(compactAlignment.bottom).toBeLessThanOrEqual(1);
    expect(compactAlignment.infoHeight).toBe(48);
    expect(compactAlignment.raiseHeight).toBe(48);

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

test('deeds tab shows demesne buildings as a county grid that opens settlements',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const names = await page.evaluate(function () {
      const state = FB.state;
      const home = state.player.provinceId;
      const other = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      })[0].id;

      state.player.tier = 4;
      state.player.liege = null;
      state.player.provs = [home, other];
      FB.foundPlayerRealm(state);
      state.buildings = state.buildings || {};
      state.buildings[home] = [
        { s:0, id:'mill' }, { s:0, id:'mill' }, { s:0, id:'granary' }
      ];
      state.buildings[other] = [
        { s:0, id:'mill', ruined:true }, { s:0, id:'market' }
      ];
      const record = FB.realmTechRecord(state);
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
      return {
        home:FB.world.byId[home].name,
        other:FB.world.byId[other].name,
        homeSettlement:FB.settlementsOf(state, home)[0].name
      };
    });

    await page.locator('#sidetabs [data-tab="actions"]').click();
    const grid = page.locator('#tab-actions .bldsummary .bldgrid');
    await expect(grid).toBeVisible();

    // one column per building type standing in the demesne, in data order
    const heads = grid.locator('.bldcell.bldcolhead');
    await expect(heads).toHaveCount(3);
    await expect(heads.nth(0)).toHaveText('⚙');
    await expect(heads.nth(1)).toHaveText('🌾');
    await expect(heads.nth(2)).toHaveText('⚖');

    // both counties appear as clickable name cells
    const countyCells = grid.locator('button.bldprov');
    await expect(countyCells).toHaveCount(2);

    // the two watermills fold into one cell with a count badge
    const millPair = grid.locator('.bldcell[title="Watermill ×2"]');
    await expect(millPair).toHaveCount(1);
    await expect(millPair.locator('.bldcnt')).toHaveText('2');

    // gaps read as dimmed markers: home lacks a market, the other county's
    // ruined watermill does not fill its mill cell, and it has no granary
    await expect(grid.locator('.bldcell.bldmiss[title="No Market Square"]'))
      .toHaveCount(1);
    await expect(grid.locator('.bldcell.bldmiss[title="No Watermill"]'))
      .toHaveCount(1);
    await expect(grid.locator('.bldcell.bldmiss[title="No Granary"]'))
      .toHaveCount(1);
    await expect(grid.locator('.bldcell[title="Market Square"]:not(.bldcolhead)'))
      .toHaveCount(1);

    // clicking a county name opens its head settlement's sheet
    await grid.locator('button.bldprov', { hasText:names.home }).click();
    await expect(page.locator('#gm-title')).toContainText(names.homeSettlement);
    await expect(page.locator('#gm-body')).toContainText('County development:');

    // the header no longer narrates growth history
    await expect(page.locator('#gm-body'))
      .not.toContainText('Started at development');

    // each building card shows just a name and a one-line effect; the audit
    // table and description stay hidden behind the card's ? button
    const cards = page.locator('#gm-body .settcard');
    await expect(cards).toHaveCount(3);
    const millCard = cards.first();
    await expect(millCard.locator('b')).toContainText('Watermill');
    await expect(millCard.locator('.settcard-fx')).toContainText('+2');
    const details = millCard.locator('.settcard-details');
    await expect(details).toBeHidden();

    const infoBtn = millCard.locator('.settcard-info');
    await infoBtn.click();
    await expect(details).toBeVisible();
    await expect(details).toContainText('Grinds the valley');
    await expect(infoBtn).toHaveAttribute('aria-expanded', 'true');

    // demolish is an icon button inside the card, not a text button below it
    const demolish = millCard.locator(
      'button.sett-demolish[data-demolish="mill"]');
    await expect(demolish).toHaveCount(1);
    await expect(demolish).toHaveAttribute('aria-label', 'Demolish Watermill');
    await expect(demolish).toHaveText('🗑');

    // raise a building button sits near the top above the cards list
    const raiseBtn = page.locator('#gm-raise');
    await expect(raiseBtn).toBeVisible();

    // clicking raise opens the raise modal, and Back returns to this settlement sheet
    await raiseBtn.click();
    await expect(page.getByRole('heading', {
      name:'Raise a Building in ' + names.homeSettlement, exact:true
    })).toBeVisible();
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#gm-title')).toContainText(names.homeSettlement);
  });

test('settlement modal encapsulates fort siege details and upgrade actions inside the fort info tooltip',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const state = FB.state;
      const pid = state.player.provinceId;
      state.player.tier = 4;
      /* the fort record IS the walls building entry; its level lives on the
         record itself, so reindex after the direct data write */
      state.buildings = state.buildings || {};
      state.buildings[pid] = [{ s: 0, id: 'walls', level: 2 }];
      FB.invalidateFortIndex();
      FB.ui.refresh();
      FB.ui.showSettlement(pid, 0);
      return {
        settlement: FB.settlementsOf(state, pid)[0].name
      };
    });

    await expect(page.locator('#gm-title')).toContainText(setup.settlement);

    // fort card is compact; siege burden and upgrade actions are inside the hidden details
    const fortCard = page.locator('#gm-body .fort-asset-row');
    await expect(fortCard).toBeVisible();
    const fortDetails = fortCard.locator('.settcard-details');
    await expect(fortDetails).toBeHidden();
    await expect(fortCard.locator('.fort-detail')).toBeHidden();

    // clicking ? reveals the siege burden, next tier, and upgrade/tech actions
    const fortInfo = fortCard.locator('.settcard-info');
    await fortInfo.click();
    await expect(fortDetails).toBeVisible();
    await expect(fortCard.locator('.fort-detail')).toContainText('Garrison and field-army burden');
    await expect(fortCard.locator('.fort-next-tier')).toContainText('Next:');
  });

test('raise a building modal shows existing buildings at top and highlighted cost atop each card',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const state = FB.state;
      const pid = state.player.provinceId;
      state.player.tier = 4;
      state.player.gold = 20; // the first card (watermill, ~40 gold) is out of reach
      state.buildings = state.buildings || {};
      state.buildings[pid] = [{ s:0, id:'granary' }];
      const record = FB.realmTechRecord(state);
      for (const id in FBDATA.buildings) {
        const requirement = FBDATA.buildings[id].requiresTech;
        if (requirement && record.completed.indexOf(requirement) < 0) {
          record.completed.push(requirement);
        }
      }
      FB.ui.refresh();
      FB.ui.showBuildings(pid, 0);
      return {
        settlement:FB.settlementsOf(state, pid)[0].name
      };
    });

    await expect(page.getByRole('heading', {
      name:'Raise a Building in ' + setup.settlement, exact:true
    })).toBeVisible();

    // existing buildings occupying the settlement sit at the top of the modal body
    const occupyingHint = page.locator('#gm-body > p.hint').first();
    await expect(occupyingHint).toContainText('Already occupying ' + setup.settlement);
    await expect(occupyingHint).toContainText('Granary');

    // the list of cards follows the hint
    const firstCard = page.locator('#gm-body .gm-list .settcard').first();
    await expect(firstCard).toBeVisible();

    // cost meta sits above the effects line (.settcard-meta + .settcard-fx)
    await expect(firstCard.locator('.settcard-meta + .settcard-fx')).toHaveCount(1);
    await expect(firstCard.locator('.settcard-meta')).toContainText('gold');
    await expect(firstCard.locator('.settcard-meta')).toHaveClass(/unaffordable/);

    // card has the ? info button and the Raise button
    await expect(firstCard.locator('.settcard-info')).toBeVisible();
    await expect(firstCard.locator('.settcard-raise')).toBeVisible();
  });

test.describe('building ledger keyboard and tooltip access', function () {
  test.use({ viewport:{ width:1280, height:800 }, hasTouch:false });

  test('building cards display side tooltips on desktop without overflowing viewport',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      await startDeterministicGame(page);

      await page.evaluate(function () {
        const state = FB.state;
        const pid = state.player.provinceId;
        state.player.tier = 4;
        state.player.gold = 500;
        FB.ui.refresh();
        FB.ui.showBuildings(pid, 0);
      });

      const firstCard = page.locator('#gm-body .gm-list .settcard').first();
      await expect(firstCard).toBeVisible();
      /* one affordance per layout: on desktop the ? disclosure stays hidden
         and hovering the card opens the side tooltip */
      await expect(firstCard.locator('.settcard-info')).toBeHidden();
      await firstCard.hover();

      const tip = page.locator('#tooltip');
      await expect(tip).toBeVisible();

      const placement = await page.evaluate(function () {
        const tooltip = document.getElementById('tooltip');
        const card = document.querySelector('#gm-body .gm-list .settcard');
        const tooltipRect = tooltip.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        return {
          tipLeft:tooltipRect.left,
          tipRight:tooltipRect.right,
          tipBottom:tooltipRect.bottom,
          cardRight:cardRect.right,
          viewportHeight:window.innerHeight,
          viewportWidth:window.innerWidth
        };
      });

      expect(placement.tipBottom).toBeLessThanOrEqual(placement.viewportHeight - 7);
      if (placement.cardRight + 10 + 320 <= placement.viewportWidth - 8) {
        expect(placement.tipLeft).toBeGreaterThanOrEqual(placement.cardRight + 9);
      }
    });

  test('tooltip remains interactive on hover and buttons inside tooltip can be clicked',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      await startDeterministicGame(page);

      const setup = await page.evaluate(function () {
        const state = FB.state;
        const pid = state.player.provinceId;
        state.player.tier = 4;
        /* the upgrade/tech actions render only for a county the player
           actually holds (fortProjectStatus's playerHolds gate) */
        state.player.liege = null;
        state.player.provs = [pid];
        FB.foundPlayerRealm(state);
        /* the fort record IS the walls building entry; its level lives on
           the record itself, so reindex after the direct data write */
        state.buildings = state.buildings || {};
        state.buildings[pid] = [{ s: 0, id: 'walls', level: 2 }];
        FB.invalidateFortIndex();
        FB.ui.refresh();
        FB.ui.showSettlement(pid, 0);
        return {
          settlement: FB.settlementsOf(state, pid)[0].name
        };
      });

      const fortCard = page.locator('#gm-body .fort-asset-row');
      await expect(fortCard).toBeVisible();
      await expect(fortCard.locator('.settcard-info')).toBeHidden();
      await fortCard.hover();

      const tip = page.locator('#tooltip');
      await expect(tip).toBeVisible();
      const widthBefore = await tip.evaluate(function (el) { return el.getBoundingClientRect().width; });

      // move mouse directly onto the tooltip - it remains visible, maintains stable width, and stays on-screen
      await tip.hover();
      await expect(tip).toBeVisible();
      const boundsAfter = await tip.evaluate(function (el) {
        const r = el.getBoundingClientRect();
        return { width: r.width, bottom: r.bottom, vh: window.innerHeight };
      });
      expect(boundsAfter.width).toBeCloseTo(widthBefore, 1);
      expect(boundsAfter.bottom).toBeLessThanOrEqual(boundsAfter.vh);

      // clicking a technology requirement button inside the tooltip opens the tech sheet
      const techBtn = tip.locator('button[data-fort-tech]');
      await expect(techBtn).toBeVisible();
      await techBtn.click();

      // tech modal opened (the level-2 fort's next tier needs Stone Castles)
      await expect(page.locator('#gm-title')).toContainText('Stone Castles');

      // clicking Back on the tech modal returns directly to the settlement sheet
      await page.locator('#tech-back').click();
      await expect(page.locator('#gm-title')).toContainText(setup.settlement);
    });

  test('tablet-width layouts swap the hover tooltip for the ? disclosure',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      await startDeterministicGame(page);
      await page.setViewportSize({ width:1000, height:700 });

      await page.evaluate(function () {
        const state = FB.state;
        const pid = state.player.provinceId;
        state.player.tier = 4;
        state.player.gold = 500;
        FB.ui.refresh();
        FB.ui.showBuildings(pid, 0);
      });

      const firstCard = page.locator('#gm-body .gm-list .settcard').first();
      await expect(firstCard).toBeVisible();
      const infoBtn = firstCard.locator('.settcard-info');
      await expect(infoBtn).toBeVisible();

      // the disclosure layout never opens the hover/focus side tooltip
      await firstCard.hover();
      await expect(page.locator('#tooltip')).toBeHidden();

      // the ? button toggles the same details inline instead
      await infoBtn.click();
      await expect(infoBtn).toHaveAttribute('aria-expanded', 'true');
      await expect(firstCard.locator('.settcard-details')).toBeVisible();
      await infoBtn.click();
      await expect(firstCard.locator('.settcard-details')).toBeHidden();
    });

  test('digit keys raise buildings from the compact ledger',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      await startDeterministicGame(page);

      await page.evaluate(function () {
        const state = FB.state;
        const pid = state.player.provinceId;
        state.player.tier = 4;
        state.player.liege = null;
        state.player.provs = [pid];
        FB.foundPlayerRealm(state);
        state.player.gold = 1000;
        state.dev[pid] = 10;
        const record = FB.realmTechRecord(state);
        for (const id in FBDATA.buildings) {
          const requirement = FBDATA.buildings[id].requiresTech;
          if (requirement && record.completed.indexOf(requirement) < 0) {
            record.completed.push(requirement);
          }
        }
        state.player.roleOrientationsSeen =
          state.player.roleOrientationsSeen || {};
        state.player.roleOrientationsSeen['role-tier-4'] = 1;
        FB.ui.refresh();
        FB.ui.showBuildings(pid);
      });
      await expect(page.getByRole('heading', { name:/Building Works/ }))
        .toBeVisible();

      // the compact cards keep the modal's numbered keyboard hints on the raise button
      const firstRaise = page.locator('#gm-body .settcard-raise').first();
      await expect(firstRaise.locator('.keyhint')).toHaveText('1');

      // mill is the first building in data order, so 1 raises it
      await page.keyboard.press('1');
      await expect.poll(function () {
        return page.evaluate(function () {
          return FB.buildingCountIn(FB.state, FB.state.player.provinceId,
            'mill', false);
        });
      }).toBe(1);
    });
});
