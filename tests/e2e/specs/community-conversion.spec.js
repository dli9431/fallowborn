'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'data/actions.js',
  'data/cultures.js',
  'data/map_data.js',
  'data/modifiers.js',
  'js/actions.js',
  'js/modifiers.js',
  'js/population.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/world.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

async function configureCountyProjectUi(page) {
  return page.evaluate(function () {
    const s = FB.state;
    const p = s.player;
    const me = s.chars[p.charId];
    const pid = p.provinceId;
    const year = s.date.year;
    p.tier = 4;
    p.provs = [pid];
    p.panelIntrosSeen = p.panelIntrosSeen || {};
    p.panelIntrosSeen.prov = 1;
    me.culture = 'gaelic';
    me.religion = 'catholic';
    s.owner[pid] = 'player';
    s.holder = s.holder || {};
    s.holder[pid] = 'player';
    s.realms.player = {
      id:'player', name:'Test Realm', alive:true, capital:pid,
      ruler:me.id, religion:'catholic'
    };
    s.population.counties[pid] = {
      count:1000,
      natural:18,
      migration:-7,
      losses:-3,
      communities:[
        { culture:'gaelic', religion:'catholic', count:400 },
        { culture:'norse', religion:'catholic', count:250 },
        { culture:'english', religion:'orthodox', count:200 },
        { culture:'brezhon', religion:'norse_pagan', count:150 }
      ],
      identity:{
        culture:'gaelic', religion:'catholic',
        cultureSince:year, religionSince:year
      },
      communityChange:{ faithConverted:35, cultureAssimilated:12 },
      communityProjects:{
        faith:{
          target:'norse_pagan', sponsor:'player', startTurn:s.turn,
          policy:'integrative', progress:0, converted:35,
          resistance:0.24, lastTransfer:35, lastYear:year
        }
      }
    };
    FB.ui.selectProvince(pid);
    return { pid:pid, county:FB.world.byId[pid].name };
  });
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('Land aggregates culture and faith independently and explains projects',
  async function ({ page }) {
    await configureCountyProjectUi(page);
    await waitForUiRefresh(page);
    const panel = page.locator('#tab-prov');
    await expect(panel.locator('.land-kv').filter({
      has:page.locator('span', { hasText:'County population' })
    }).locator('b')).toHaveText('1,000');

    const culture = panel.locator('[data-community-axis="culture"]');
    const faith = panel.locator('[data-community-axis="faith"]');
    await expect(culture.locator('[data-community-id="gaelic"] b'))
      .toHaveText('400 people · 40%');
    await expect(culture.locator('[data-community-id="norse"] b'))
      .toHaveText('250 people · 25%');
    await expect(faith.locator('[data-community-id="catholic"] b'))
      .toHaveText('650 people · 65%');
    await expect(faith.locator('[data-community-id="norse_pagan"] b'))
      .toHaveText('150 people · 15%');
    await expect(panel.locator('.community-change-note'))
      .toContainText('35 changed faith · 12 assimilated · -7 net migration');

    const project = panel.locator('[data-community-project="faith"]');
    await expect(project).toContainText('Norse Paganism');
    await expect(project).toContainText('Integrative settlement');
    await expect(project).toContainText('Last annual transfer: 35');
    await expect(project).toContainText('Resistance:');

    await page.evaluate(function () {
      FB.state.player.tier = 3;
      FB.state.player.provs = [];
      FB.ui.selectProvince(FB.state.player.provinceId);
    });
    await expect(panel.locator('[data-community-project="faith"]'))
      .toBeVisible();
    await expect(panel.locator('.community-project-control, ' +
      '.community-project-stop')).toHaveCount(0);

    await page.setViewportSize({ width:390, height:740 });
    await page.evaluate(function () {
      FB.ui.selectProvince(FB.state.player.provinceId);
    });
    await expect(panel.locator('.community-share-more')).toHaveCount(2);
    await expect(panel.locator('.community-share-more').first())
      .not.toHaveAttribute('open', '');
  });

test('county controls retain context, preview consequences, and start change and stop',
  async function ({ page }) {
    const setup = await configureCountyProjectUi(page);
    await waitForUiRefresh(page);
    const panel = page.locator('#tab-prov');
    const before = await page.evaluate(function (pid) {
      return {
        county:JSON.stringify(FB.state.population.counties[pid]),
        piety:FB.state.player.piety,
        prestige:FB.state.player.prestige,
        rng:FB.getRngState()
      };
    }, setup.pid);

    await panel.locator('[data-community-project="culture"] ' +
      '.community-project-control').click();
    await expect(page.locator('#gm-title')).toContainText(setup.county);
    const opened = await page.evaluate(function (pid) {
      return {
        county:JSON.stringify(FB.state.population.counties[pid]),
        piety:FB.state.player.piety,
        prestige:FB.state.player.prestige,
        rng:FB.getRngState()
      };
    }, setup.pid);
    expect(opened).toEqual(before);

    await page.locator('[data-county-project-target="norse"]').click();
    await page.locator('[data-county-project-policy="voluntary"]').click();
    await expect(page.locator('#gm-body')).toContainText('Piety: 0');
    await expect(page.locator('#gm-body')).toContainText('Prestige: 0');
    await expect(page.locator('#gm-body'))
      .toContainText('Standing and relationships: No immediate change.');
    await expect(page.locator('#gm-body'))
      .toContainText('County Common Voice and unrest:');
    await expect(page.locator('#county-project-confirm'))
      .toContainText(setup.county);
    const reviewed = await page.evaluate(function (pid) {
      return {
        county:JSON.stringify(FB.state.population.counties[pid]),
        piety:FB.state.player.piety,
        prestige:FB.state.player.prestige,
        rng:FB.getRngState()
      };
    }, setup.pid);
    expect(reviewed).toEqual(before);
    await page.locator('#county-project-confirm').click();

    let changed = await page.evaluate(function (pid) {
      const rec = FB.state.population.counties[pid];
      return {
        total:rec.count,
        communityTotal:rec.communities.reduce(function (sum, community) {
          return sum + community.count;
        }, 0),
        target:rec.communityProjects.culture.target,
        policy:rec.communityProjects.culture.policy,
        piety:FB.state.player.piety,
        prestige:FB.state.player.prestige
      };
    }, setup.pid);
    expect(changed).toEqual({
      total:1000, communityTotal:1000, target:'norse', policy:'voluntary',
      piety:before.piety, prestige:before.prestige
    });

    await panel.locator('[data-community-project="faith"] ' +
      '.community-project-control').click();
    await page.locator('[data-county-project-target="norse_pagan"]').click();
    await page.locator('[data-county-project-policy="coercive"]').click();
    await expect(page.locator('#gm-body')).toContainText('Common Voice');
    await expect(page.locator('#gm-body')).toContainText('unrest');
    await expect(page.locator('#gm-body')).toContainText('migration pressure');
    await page.locator('#county-project-confirm').click();
    changed = await page.evaluate(function (pid) {
      return {
        policy:FB.state.population.counties[pid].communityProjects.faith.policy,
        modifier:FB.countyModifierRecords(FB.state, pid).some(
          function (record) { return record.id === 'community_coercion'; })
      };
    }, setup.pid);
    expect(changed).toEqual({ policy:'coercive', modifier:true });

    await panel.locator('[data-community-project="faith"] ' +
      '.community-project-stop').click();
    await expect(page.locator('#gm-title')).toContainText(setup.county);
    await page.locator('#county-project-stop-confirm').click();
    expect(await page.evaluate(function (pid) {
      return FB.countyCommunityProject(FB.state, pid, 'faith');
    }, setup.pid)).toBeNull();
  });

test('Faith details links to personal conversion and an explicit Land county',
  async function ({ page }) {
    const setup = await configureCountyProjectUi(page);
    await page.evaluate(function () { FB.ui.showFaithDetails('catholic'); });
    await expect(page.locator('#faith-details-convert')).toBeVisible();
    await page.locator('#faith-details-convert').click();
    await expect(page.locator('#gm-title')).toHaveText('Convert faith');
    await expect(page.locator('#conv-search')).toBeVisible();
    await page.locator('#conv-close').click();
    await page.evaluate(function () { FB.ui.showFaithDetails('catholic'); });
    const land = page.locator(
      '[data-faith-land-pid="' + setup.pid + '"]');
    await expect(land).toContainText(setup.county);
    await expect(land).toContainText('territorial projects remain there');
    await land.click();
    expect(await page.evaluate(function () {
      return {
        selected:FB.map.selected,
        tab:FB.ui._shared.activeTab,
        modalClosed:document.getElementById('genmodal').classList.contains('hidden')
      };
    })).toEqual({ selected:setup.pid, tab:'prov', modalClosed:true });
  });
