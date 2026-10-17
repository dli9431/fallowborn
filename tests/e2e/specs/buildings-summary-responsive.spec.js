'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_panels.js', 'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_mobile.js',
  'js/keys.js', 'js/actions.js', 'js/lordships.js', 'js/settlement.js',
  'js/fortifications.js', 'js/i18n.js', 'js/main.js', 'js/world.js', 'js/technology.js',
  'data/map_data.js', 'data/actions.js', 'data/technology.js', 'data/settlements.js',
  'data/lang_en.js', 'data/lang_fr.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

async function stageSummary(page, many) {
  const setup = await page.evaluate(function (many) {
    const s = FB.state, p = s.player, pid = p.provinceId;
    FB.game.setPaused(true);
    p.tier = 4; p.provs = [pid]; p.liege = null; p.gold = 100000;
    s.owner[pid] = s.holder[pid] = 'player';
    s.dev[pid] = 9;
    FB.foundPlayerRealm(s);
    FB.rememberSettlementSites(s, pid);
    FB.invalidateSettlementLordships(s, pid);
    const sites = FB.directSettlements(s).filter(function (site) {
      return site.provinceId === pid;
    });
    FBDATA.buildings.summary_extra = {
      name:'Garden workshop', icon:'⚒', role:'care', cost:10, upkeep:1
    };
    FBDATA.buildings.summary_absent = {
      name:'Absent catalogue workshop', icon:'⚒', role:'care', cost:10
    };
    const types = many ? Object.keys(FBDATA.buildings).filter(function (id) {
      return id !== 'summary_absent';
    }).slice(0, 20) : ['mill'];
    s.buildings[pid] = types.map(function (id) {
      return { s:sites[0].settlement, id:id, level:id === 'walls' ? 1 : undefined };
    });
    s.buildings[pid].push({ s:sites[0].settlement, id:'mill' });
    s.buildings[pid].push({ s:sites[0].settlement, id:'mill', ruined:true });
    s.buildings[pid].push({ s:sites[1].settlement, id:'mill', ruined:true });
    FB.invalidateBuildingIndex(s, pid);
    FB.invalidateFortIndex();
    const tech = FB.realmTechRecord(s);
    for (const id of Object.keys(FBDATA.tech)) {
      if (tech.completed.indexOf(id) < 0) tech.completed.push(id);
    }
    sites.forEach(function (site, i) {
      FB.world.sitesByProv[pid].list[site.settlement].name = 'Site ' + (i + 1);
    });
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    FB.ui.showTab('actions', { history:false });
    return { pid:pid, sites:sites, types:types };
  }, many);
  await expect(page.locator('.bldsummary button.bldprov')).toHaveCount(setup.sites.length);
  return setup;
}

for (const width of [320, 360, 390]) {
  test('twenty present types and long localized labels wrap at ' + width + ' CSS pixels', async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    const setup = await stageSummary(page, true);
    expect(setup.types).toHaveLength(20);
    const labels = await page.evaluate(function (setup) {
      return new Promise(function (resolve) {
        localStorage.setItem('fb_lang', 'fr');
        FB.loadSelectedLocale(function (loaded) {
          const entries = FBDATA.lang.fr.entries;
          setup.types.forEach(function (id) {
            const definition = FBDATA.buildings[id];
            const name = typeof definition.name === 'string' ? definition.name : definition.name.default;
            entries['building.' + id + '.name.default'] = {
              text:'Atelier communautaire pour la conservation et la réparation des installations ' + name,
              hash:FB.i18nHash({ text:name })
            };
          });
          function chrome(source, text) {
            entries['ui:' + source] = { text:text, hash:FB.i18nHash({ text:source }) };
          }
          chrome('{building} ×{count}', '{building} : {count} exemplaires');
          chrome('{building} ×{count} (ruined)', '{building} : {count} exemplaires en ruines');
          chrome('No buildings', 'Aucun bâtiment dans cet établissement');
          FB.finalizeLocale(loaded);
          FB.world.sitesByProv[setup.pid].list[setup.sites[0].settlement].name =
            'Saint-Établissement-des-Très-Longues-Rives ' + 'LongueRive'.repeat(12);
          FB.ui.refresh();
          resolve({ locale:FB.locale,
            mill:FB.dataText(FB.state, FB.state.player.charId, 'building', 'mill', FBDATA.buildings.mill, 'name', {}) });
        });
      });
    }, setup);
    expect(labels.locale).toBe('fr');
    expect(labels.mill).toContain('Atelier communautaire');
    const summary = page.locator('.bldsummary');
    await expect(summary).not.toHaveClass(/bldmatrix/);
    await expect(summary.locator('.bldstanding').filter({ hasText:labels.mill })).toHaveText(labels.mill + ' : 2 exemplaires');
    await expect(summary.locator('.bldruined').first()).toHaveText(labels.mill + ' : 1 exemplaires en ruines');
    await expect(summary.locator('.bldprov').nth(2)).toContainText('Aucun bâtiment dans cet établissement');
    await expect(summary).not.toContainText('Absent catalogue workshop');
    const fit = await summary.evaluate(function (summary) {
      const bounds = summary.getBoundingClientRect();
      const rows = Array.from(summary.querySelectorAll('button.bldprov'));
      return {
        fits:summary.scrollWidth <= summary.clientWidth + 1,
        rows:rows.every(function (row) {
          const box = row.getBoundingClientRect();
          return box.height >= 44 && box.left >= bounds.left && box.right <= bounds.right + 1 &&
            row.scrollWidth <= row.clientWidth + 1;
        }),
        labels:rows.every(function (row) {
          const box = row.getBoundingClientRect();
          return Array.from(row.querySelectorAll('.bldname, .bldstanding, .bldruined, .bldempty')).every(function (label) {
            const text = label.getBoundingClientRect();
            return text.left >= box.left && text.right <= box.right + 1;
          });
        })
      };
    });
    expect(fit).toEqual({ fits:true, rows:true, labels:true });
  });
}

test('matrix follows the actual container width while retaining keyboard targets', async function ({ page }) {
  await page.setViewportSize({ width:1280, height:900 });
  await stageSummary(page, false);
  const summary = page.locator('.bldsummary');
  const origin = summary.locator('.bldprov').nth(1);
  await origin.focus();
  await origin.evaluate(function (row) { row.dataset.retainedSummary = 'yes'; });
  await summary.evaluate(function (node) { node.style.width = '1100px'; });
  await expect(summary).toHaveClass(/bldmatrix/);
  expect(await summary.evaluate(function (node) {
    return node.scrollWidth <= node.clientWidth + 1;
  })).toBe(true);
  await expect(origin).toBeFocused();
  // No viewport resize: a narrow card within a desktop viewport must adapt too.
  await summary.evaluate(function (node) { node.style.width = '180px'; });
  await expect(summary).not.toHaveClass(/bldmatrix/);
  await expect(origin).toHaveAttribute('data-retained-summary', 'yes');
  await expect(origin).toBeFocused();
  expect(await summary.evaluate(function (node) {
    return node.scrollWidth <= node.clientWidth + 1;
  })).toBe(true);
  await page.keyboard.press('Tab');
  await expect(summary.locator('.bldprov').nth(2)).toBeFocused();
});

test('all-empty holdings show only their localized empty summary', async function ({ page }) {
  const setup = await stageSummary(page, false);
  await page.evaluate(function (pid) {
    FB.state.buildings[pid] = [];
    FB.invalidateBuildingIndex(FB.state, pid);
    FB.ui.refresh();
  }, setup.pid);
  const summary = page.locator('.bldsummary');
  await expect(summary.locator('.bldprov')).toHaveCount(setup.sites.length);
  await expect(summary.locator('.bldcolhead')).toHaveCount(0);
  await expect(summary.locator('.bldcell')).toHaveCount(0);
  await expect(summary.locator('.bldempty')).toHaveCount(setup.sites.length);
  for (const row of await summary.locator('.bldprov').all()) {
    await expect(row).toContainText('No buildings');
  }
});

test('settlement and construction returns retain exact site, scroll and focus after redraw', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  const setup = await stageSummary(page, false);
  const slot = setup.sites[2].settlement;
  const origin = page.locator('[data-bldprov="' + setup.pid + '"][data-bldsett="' + slot + '"]');
  await origin.scrollIntoViewIfNeeded();
  await origin.focus();
  const scroll = await page.locator('#sidebody').evaluate(function (node) { return node.scrollTop; });
  await origin.evaluate(function (row) { row.dataset.retainedSummary = 'yes'; });
  for (const back of ['cancel', 'escape', 'browser']) {
    await origin.press('Enter');
    await expect(page.locator('#gm-title')).toContainText('Site 3');
    await expect(page.locator('.settlement-context')).toContainText('held by you');
    if (back === 'cancel') {
      await page.locator('#gm-raise').click();
      await expect(page.locator('#gm-title')).toContainText('Raise a Building in Site 3');
      await page.locator('#gm-cancel').click();
      await expect(page.locator('#gm-title')).toContainText('Site 3');
      await page.evaluate(function (target) {
        FB.state.buildings[target.pid].push({ s:target.slot, id:'granary' });
        FB.invalidateBuildingIndex(FB.state, target.pid);
        FB.ui.refresh();
      }, { pid:setup.pid, slot:slot });
      await expect(origin).toContainText('Granary ×1');
      await expect(origin).toHaveAttribute('data-retained-summary', 'yes');
      await page.locator('#gm-cancel').click();
    } else if (back === 'escape') {
      await page.keyboard.press('Escape');
    } else {
      await page.evaluate(function () { window.history.back(); });
    }
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(origin).toBeFocused();
    await expect.poll(async function () {
      return page.locator('#sidebody').evaluate(function (node) { return node.scrollTop; });
    }).toBe(scroll);
  }
});

test('without ResizeObserver the wrapping summary and window resize remain usable', async function ({ page }) {
  await page.evaluate(function () { window.ResizeObserver = undefined; });
  await page.setViewportSize({ width:390, height:844 });
  await stageSummary(page, true);
  const summary = page.locator('.bldsummary');
  await expect(summary).not.toHaveClass(/bldmatrix/);
  await summary.evaluate(function (node) {
    node.style.width = '180px';
    window.dispatchEvent(new Event('resize'));
  });
  expect(await summary.evaluate(function (node) {
    return node.scrollWidth <= node.clientWidth + 1;
  })).toBe(true);
  await summary.locator('.bldprov').nth(1).press('Space');
  await expect(page.locator('#gm-title')).toContainText('Site 2');
});
