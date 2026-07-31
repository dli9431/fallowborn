'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('semantic shortcuts reject conflicts, explain blocks, persist, and follow promotion',
  async function ({ page }) {
    await page.evaluate(function () { FB.ui.showShortcutSettings(); });
    const rows = page.locator('[data-shortcut-row]');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('[data-shortcut-key]')).toHaveValue('q');
    await expect(rows.first().locator('[data-shortcut-target]'))
      .toHaveValue('action:livelihoods');
    await expect(page.locator('#shortcut-reset')).toBeVisible();

    await page.locator('#shortcut-add').click();
    await rows.nth(1).locator('[data-shortcut-key]').selectOption('q');
    await rows.nth(1).locator('[data-shortcut-target]')
      .selectOption('focus-family:farmer-work');
    await expect(page.locator('#shortcut-conflict')).toContainText(
      'Q is assigned more than once');
    await expect(page.locator('#shortcut-save')).toBeDisabled();

    await rows.nth(1).locator('[data-shortcut-key]').selectOption('w');
    await expect(page.locator('#shortcut-conflict')).toBeHidden();
    await page.locator('#shortcut-add').click();
    await rows.nth(2).locator('[data-shortcut-key]').selectOption('a');
    await rows.nth(2).locator('[data-shortcut-target]')
      .selectOption('action:declare_war');
    await expect(rows.nth(2).locator('[data-shortcut-status]')).toContainText(
      'Reserved but unavailable');
    await page.locator('#shortcut-save').click();
    await expect(page.getByRole('heading', { name:'Settings', exact:true }))
      .toBeVisible();

    await page.evaluate(function () {
      FB.ui.closeModal();
      FB.state.player.focus = 'rest';
    });
    await page.keyboard.press('w');
    expect(await page.evaluate(function () { return FB.state.player.focus; }))
      .toBe('toil');
    await page.evaluate(function () {
      FB.state.player.tier = 1;
      FB.state.player.profession = 'farmer';
      FB.state.player.focus = 'rest';
      FB.state.player.roleOrientationsSeen['role-tier-1'] = 1;
    });
    await page.keyboard.press('w');
    expect(await page.evaluate(function () { return FB.state.player.focus; }))
      .toBe('work_land');
    await page.keyboard.press('a');
    await expect(page.locator('#toasts .toast').last()).toContainText(
      'not available in your current role or situation');

    await page.reload({ waitUntil:'domcontentloaded' });
    await expect.poll(function () {
      return page.evaluate(function () {
        return window.FB && FB.game && FB.game.uiPrefs &&
          FB.game.uiPrefs.actionBindings.w;
      });
    }).toBe('focus-family:farmer-work');
  });

test('family tree searches, collapses, and jumps without changing genealogy',
  async function ({ page }) {
    const family = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Edwin Treeward', sex:'m', born:s.date.year - 26,
        culture:me.culture, religion:me.religion, dyn:'Treeward'
      });
      const child = FB.makeCharacter(s, {
        name:'Beatrice Branch', sex:'f', born:s.date.year - 18,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:spouse.id, motherId:me.id
      });
      const partner = FB.makeCharacter(s, {
        name:'Hugh Bough', sex:'m', born:s.date.year - 20,
        culture:me.culture, religion:me.religion, dyn:'Bough'
      });
      const grandchild = FB.makeCharacter(s, {
        name:'Clara Searchleaf', sex:'f', born:s.date.year - 2,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:partner.id, motherId:child.id
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      me.childrenIds.push(child.id);
      spouse.childrenIds.push(child.id);
      child.spouseId = partner.id;
      partner.spouseId = child.id;
      child.childrenIds.push(grandchild.id);
      partner.childrenIds.push(grandchild.id);
      FB.touchFamily();
      const before = JSON.stringify({
        child:[child.fatherId, child.motherId],
        grandchild:[grandchild.fatherId, grandchild.motherId]
      });
      FB.ui.showFamilyTree();
      return {
        meId:me.id, spouseId:spouse.id, childId:child.id,
        grandchildId:grandchild.id, before:before
      };
    });

    const branch = page.locator('[data-ft-toggle="' + family.meId + '"]');
    await branch.click();
    await expect(branch).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.ftchip[data-cid="' + family.grandchildId + '"]')
      .first()).toBeHidden();

    await page.locator('#family-tree-search').fill('Searchleaf');
    await page.locator('[data-ft-result="' + family.grandchildId + '"]').click();
    await expect(branch).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.ftchip[data-cid="' + family.grandchildId + '"]')
      .first()).toBeFocused();

    await page.getByRole('button', { name:'Successor', exact:true }).click();
    await expect(page.locator('.ftchip[data-cid="' + family.childId + '"]')
      .first()).toBeFocused();
    await page.getByRole('button', { name:'Spouse', exact:true }).click();
    await expect(page.locator('.ftchip[data-cid="' + family.spouseId + '"]')
      .first()).toBeFocused();
    await page.getByRole('button', { name:'House founder', exact:true }).click();
    await expect(page.locator('.ftchip[data-cid="' + family.meId + '"]')
      .first()).toBeFocused();

    expect(await page.evaluate(function (ids) {
      const s = FB.state;
      const child = s.chars[ids.childId];
      const grandchild = s.chars[ids.grandchildId];
      return JSON.stringify({
        child:[child.fatherId, child.motherId],
        grandchild:[grandchild.fatherId, grandchild.motherId]
      });
    }, family)).toBe(family.before);
  });

test('war catalogue searches and filters semantic available and blocked causes',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      let home = null, neighbors = [];
      for (const province of FB.world.provs) {
        if (province.wasteland) continue;
        const candidates = Object.keys(FB.world.adj[province.id] || {}).filter(
          function (id) {
            return FB.world.byId[id] && !FB.world.byId[id].wasteland;
          });
        if (candidates.length >= 2) {
          home = province;
          neighbors = candidates.slice(0, 2);
          break;
        }
      }
      function makeRealm(id, name, rank, capital, rulerName) {
        s.realms[id] = {
          id:id, name:name, color:'#784336', capital:capital,
          aggression:0, rank:rank, liege:null, alive:true, favor:0,
          religion:me.religion,
          ruler:{
            name:rulerName, sex:'m', culture:me.culture, age:42,
            mar:7, trait:'ambitious', generation:1
          }
        };
        s.owner[capital] = id;
        s.holder[capital] = id;
        s.dev[capital] = 7;
      }
      p.tier = 4;
      p.liege = null;
      p.provinceId = home.id;
      p.provs = [home.id];
      p.war = null;
      p.greatHolyWar = null;
      s.greatHolyWar = null;
      s.owner[home.id] = 'player';
      s.holder[home.id] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 1;
      s.realms.player.capital = home.id;
      makeRealm('catalogue_claim', 'Amber March', 1, neighbors[0],
        'Osric Amberlord');
      makeRealm('catalogue_blocked', 'Zinc Crown', 2, neighbors[1],
        'Wulfric Zincward');
      p.fabricatedClaim = { pid:neighbors[0], madeTurn:s.turn };
      s.pacts = {};
      s.pacts.catalogue_blocked = s.turn + 180;
      s.alliances = [];
      FB.invalidateRealmCache();
      FB.ui.showWarTargets();
      return {
        claimTarget:neighbors[0], blockedTarget:neighbors[1]
      };
    });

    const claim = page.locator('[data-war-cause-target="' +
      setup.claimTarget + '"]');
    const blocked = page.locator('[data-war-cause-target="' +
      setup.blockedTarget + '"]');
    await expect(claim).toContainText('Osric Amberlord');
    await expect(blocked).toBeDisabled();
    await expect(blocked).toContainText('peace pact');

    await page.locator('#war-target-sort').selectOption('territory');
    const territoryOrder = await page.locator(
      '#war-target-list [data-war-cause]:visible').evaluateAll(function (nodes) {
        return nodes.map(function (node) {
          return FB.world.byId[node.dataset.warCauseTarget].name;
        });
      });
    const sortedTerritories = await page.evaluate(function (names) {
      return names.slice().sort(function (a, b) { return a.localeCompare(b); });
    }, territoryOrder);
    expect(territoryOrder).toEqual(sortedTerritories);

    await page.locator('#war-target-search').fill('Osric Amberlord');
    await expect(claim).toBeVisible();
    await expect(blocked).toBeHidden();
    await page.locator('#war-target-search').fill('');
    await page.locator('#war-target-basis').selectOption('claim');
    await expect(claim).toBeVisible();
    await expect(blocked).toBeHidden();
    await page.locator('#war-target-basis').selectOption('all');
    await page.locator('#war-target-diplomacy').selectOption('blocked');
    await expect(blocked).toBeVisible();
    await expect(blocked.locator('.keyhint')).toHaveText('1');
    await page.locator('#war-target-rank').selectOption('higher');
    await expect(blocked).toBeVisible();
  });

test('enterprise groups and sorts persist and share their order with Household Plan',
  async function ({ page }) {
    const fixture = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const workers = [];
      function worker(name, profession, guildRank) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'m', born:s.date.year - 24,
          culture:me.culture, religion:me.religion, dyn:me.dyn,
          fatherId:me.id
        });
        me.childrenIds.push(c.id);
        c.career = {
          profession:profession, rank:'journeyman', experience:4,
          startedYear:s.date.year - 4, guildRank:guildRank || 'none',
          guildStanding:guildRank ? 40 : 0, chosen:true
        };
        workers.push(c);
        return c;
      }
      const farmer = worker('Farmer Sorter', 'farmer');
      const crafter = worker('Craft Sorter', 'craftsman', 'member');
      const merchant = worker('Trade Sorter', 'merchant', 'member');
      p.enterpriseMigration = 1;
      p.enterprises = [
        {
          uid:'enterprise_trade_sort', type:'trade_house_business',
          provinceId:p.provinceId, settlement:2, workerId:merchant.id
        },
        {
          uid:'enterprise_farm_sort', type:'field_strip',
          provinceId:p.provinceId, settlement:0, workerId:null
        },
        {
          uid:'enterprise_craft_sort', type:'workshop_business',
          provinceId:p.provinceId, settlement:1, workerId:crafter.id
        }
      ];
      FB.touchFamily();
      FB.enterpriseList(s);
      const before = JSON.stringify(s);
      FB.ui.showLivelihoods();
      return { before:before };
    });

    const group = page.locator('[data-enterprise-group]');
    await group.selectOption('category');
    await expect(page.locator(
      '[data-list-section="family-enterprises-category-farmer"]')).toBeVisible();
    await expect(page.locator(
      '[data-list-section="family-enterprises-category-craftsman"]')).toBeVisible();
    await expect(page.locator(
      '[data-list-section="family-enterprises-category-merchant"]')).toBeVisible();

    await page.locator('[data-enterprise-group]').selectOption('settlement');
    await expect(page.locator(
      '[data-list-section^="family-enterprises-settlement-"]')).toHaveCount(3);

    await page.locator('[data-enterprise-group]').selectOption('none');
    await page.locator('[data-enterprise-sort]').selectOption('value');
    const order = await page.locator(
      '[data-list-section="family-enterprises"] [data-enterprise]')
      .evaluateAll(function (nodes) {
        return nodes.map(function (node) { return node.dataset.enterprise; });
      });
    expect(order).toEqual([
      'enterprise_trade_sort', 'enterprise_craft_sort', 'enterprise_farm_sort'
    ]);

    await page.locator('[data-enterprise="enterprise_craft_sort"]').click();
    await page.locator('#gm-cancel').click();
    await expect(page.locator('[data-enterprise-sort]')).toHaveValue('value');
    expect(await page.evaluate(function () { return JSON.stringify(FB.state); }))
      .toBe(fixture.before);

    await page.evaluate(function () { FB.ui.showHouseholdPlan(); });
    await expect(page.locator('[data-enterprise-view-controls="household"] ' +
      '[data-enterprise-sort]')).toHaveValue('value');
    await page.locator('[data-enterprise-view-controls="household"] ' +
      '[data-enterprise-sort]').selectOption('yield');
    await expect(page.locator('[data-enterprise-view-controls="household"] ' +
      '[data-enterprise-sort]')).toHaveValue('yield');
    await page.evaluate(function () { FB.ui.showLivelihoods(null, true); });
    await expect(page.locator('[data-enterprise-view-controls="work"] ' +
      '[data-enterprise-sort]')).toHaveValue('yield');
  });
