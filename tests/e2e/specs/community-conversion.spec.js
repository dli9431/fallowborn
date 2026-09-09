'use strict';
const { seedDoctrineContacts } = require('../support/game/doctrines');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'data/actions.js',
  'data/bookmarks.js',
  'data/events_communities.js',
  'data/cultures.js',
  'data/map_data.js',
  'data/modifiers.js',
  'js/actions.js',
  'js/agency.js',
  'js/events.js',
  'js/modifiers.js',
  'js/model.js',
  'js/technology.js',
  'js/armies.js',
  'data/units.js',
  'data/technology.js',
  'js/population.js',
  'js/settlement.js',
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
    const narrowestBreakdown = await panel.locator('.community-breakdowns')
      .evaluate(function (element) {
        return Math.min.apply(null, Array.prototype.map.call(
          element.children, function (card) {
            return card.getBoundingClientRect().width;
          }));
      });
    expect(narrowestBreakdown).toBeGreaterThanOrEqual(179);

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
      .toContainText('County Popular support and unrest:');
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
    await expect(page.locator('#gm-body')).toContainText('Popular support');
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

test('settlement sheets retain local context and never mutate remote browsing',
  async function ({ page }) {
    const setup = await configureCountyProjectUi(page);
    const settlement = await page.evaluate(function (pid) {
      const s = FB.state;
      s.dev[pid] = Math.max(5, s.dev[pid] || 1);
      const site = FB.settlementsOf(s, pid)[0];
      const before = JSON.stringify(s.population.counties[pid]);
      const rng = FB.getRngState();
      FB.ui.showSettlement(pid, 0);
      return {
        name:site.name,
        unchanged:before === JSON.stringify(s.population.counties[pid]),
        rngUnchanged:rng === FB.getRngState()
      };
    }, setup.pid);
    expect(settlement.unchanged).toBe(true);
    expect(settlement.rngUnchanged).toBe(true);
    await expect(page.locator('[data-settlement-community-axis="culture"]'))
      .toBeVisible();
    await expect(page.locator('[data-settlement-community-axis="faith"]'))
      .toBeVisible();
    await expect(page.locator(
      '[data-settlement-community-project="culture"]')).toContainText(
      'No active project.');

    await page.locator(
      '[data-settlement-community-project="culture"] ' +
      '.settlement-community-project-control').click();
    await expect(page.locator('#gm-title')).toContainText(settlement.name);
    await expect(page.locator('#gm-title')).toContainText(setup.county);
    await expect(page.locator('#gm-body')).not.toContainText(
      'personal or county-wide conversion');
    await page.locator('[data-county-project-target="norse"]').click();
    await expect(page.locator('.county-project-target-context'))
      .toContainText('Target');
    await expect(page.locator('.county-project-target-context'))
      .toContainText('Norse');
    await expect(page.locator('[data-county-project-policy="voluntary"]'))
      .toContainText('Start Voluntary outreach');
    await page.locator('[data-county-project-policy="voluntary"]').click();
    await expect(page.locator('#county-project-confirm')).toHaveCount(0);
    await expect(page.locator(
      '[data-settlement-community-project="culture"]')).toContainText(
      'Norse');
    const activeCulture = page.locator(
      '[data-settlement-community-project="culture"]');
    const activeCultureSummary = activeCulture.locator(
      '.community-project-summary');
    const activeCultureDetails = activeCulture.locator(
      '.community-project-details');
    await expect(activeCulture).toContainText('Cultural assimilation');
    await expect(activeCultureSummary).toContainText('Voluntary outreach');
    await expect(activeCultureSummary).toContainText('people/year');
    await expect(activeCultureSummary).toContainText('resistance');
    await expect(activeCultureSummary).not.toContainText(
      'Last annual transfer');
    await expect(activeCultureDetails).toContainText('Patronage and preaching');
    await expect(activeCultureDetails).toContainText('Last annual transfer: 0');
    await expect(activeCultureDetails).toContainText(
      'Progress resolves annually');
    await activeCulture.focus();
    await expect(page.locator('#tooltip')).toContainText(
      'Last annual transfer: 0');

    await page.setViewportSize({ width:390, height:740 });
    const activeCultureInfo = activeCulture.locator('.settcard-info');
    await expect(activeCultureInfo).toBeVisible();
    await activeCultureInfo.click();
    await expect(activeCultureInfo).toHaveAttribute('aria-expanded', 'true');
    await expect(activeCultureDetails).toBeVisible();
    const saved = await page.evaluate(function (pid) {
      const rec = FB.state.population.counties[pid];
      return {
        target:rec.settlementCommunityProjects[0].culture.target,
        materialized:rec.communities.every(function (community) {
          return Array.isArray(community.bySettlement);
        }),
        countyTotal:rec.communities.reduce(function (sum, community) {
          return sum + community.count;
        }, 0)
      };
    }, setup.pid);
    expect(saved).toEqual({
      target:'norse', materialized:true, countyTotal:1000
    });
    const annual = await page.evaluate(function (pid) {
      const s = FB.state;
      const rec = s.population.counties[pid];
      const project = rec.settlementCommunityProjects[0].culture;
      const otherBefore = JSON.stringify(FB.settlementCommunities(s, pid, 1));
      project.progress = 100;
      project.lastYear = s.date.year - 1;
      const result = FB.resolveSettlementCommunityProjects(
        s, pid, s.date.year);
      return {
        moved:result[0] && result[0].count,
        otherStable:otherBefore === JSON.stringify(
          FB.settlementCommunities(s, pid, 1)),
        countyTotal:FB.countyCommunities(s, pid).reduce(
          function (sum, community) { return sum + community.count; }, 0)
      };
    }, setup.pid);
    expect(annual.moved).toBeGreaterThan(0);
    expect(annual.otherStable).toBe(true);
    expect(annual.countyTotal).toBe(1000);

    await page.locator(
      '[data-settlement-community-project="faith"] ' +
      '.settlement-community-project-control').click();
    await page.locator('[data-county-project-target="orthodox"]').click();
    await page.locator('[data-county-project-policy="integrative"]').click();
    await expect(page.locator('#county-project-confirm')).toHaveCount(0);
    await expect(page.locator(
      '[data-settlement-community-project="faith"]')).toContainText(
      'Greek Christianity');

    await page.locator(
      '[data-settlement-community-project="faith"] ' +
      '.settlement-community-project-stop').click();
    await expect(page.locator('#gm-title')).toContainText(settlement.name);
    await expect(page.locator('#county-project-stop-confirm')).toHaveCount(0);
    await expect(page.locator(
      '[data-settlement-community-project="faith"]')).toContainText(
      'No active project.');
    expect(await page.evaluate(function (pid) {
      return FB.settlementCommunityProject(FB.state, pid, 0, 'faith');
    }, setup.pid)).toBeNull();

    const remote = await page.evaluate(function () {
      const s = FB.state;
      const pid = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== s.player.provinceId;
      })[0].id;
      const before = JSON.stringify(s.population.counties[pid]);
      const rng = FB.getRngState();
      FB.ui.showSettlement(pid, 0);
      return {
        unchanged:before === JSON.stringify(s.population.counties[pid]),
        rngUnchanged:rng === FB.getRngState()
      };
    });
    expect(remote).toEqual({ unchanged:true, rngUnchanged:true });
    await expect(page.locator('.settlement-community-project-control, ' +
      '.settlement-community-project-stop')).toHaveCount(0);
  });

test('barons can direct only their saved home settlement',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      s.dev[pid] = Math.max(5, s.dev[pid] || 1);
      s.player.tier = 3;
      s.player.provs = [];
      s.player.homeSettlement = 1;
      const rec = s.population.counties[pid];
      const first = Math.floor(rec.count / 2);
      rec.communities = [
        { culture:'gaelic', religion:'catholic', count:first },
        { culture:'norse', religion:'catholic', count:rec.count - first }
      ];
      FB.reconcileCountyCommunities(s, pid);
      return {
        head:FB.playerControlsSettlementCommunity(s, pid, 0),
        home:FB.playerControlsSettlementCommunity(s, pid, 1),
        otherCounty:FB.playerControlsSettlementCommunity(
          s, FB.world.provs.filter(function (province) {
            return !province.wasteland && province.id !== pid;
          })[0].id, 1),
        countyReady:FB.countyCommunityProjectOrderStatus(
          s, pid, 'culture', 'norse', 'voluntary').ready,
        localReady:FB.settlementCommunityProjectOrderStatus(
          s, pid, 1, 'culture', 'norse', 'voluntary').ready
      };
    });
    expect(result).toEqual({
      head:false,
      home:true,
      otherCounty:false,
      countyReady:false,
      localReady:true
    });
  });

test('settlement policy penalties are weighted instead of county modifiers',
  async function ({ page }) {
    const setup = await configureCountyProjectUi(page);
    await page.evaluate(function (pid) {
      FB.state.dev[pid] = Math.max(5, FB.state.dev[pid] || 1);
      FB.ui.showSettlement(pid, 0);
    }, setup.pid);
    await page.locator(
      '[data-settlement-community-project="culture"] ' +
      '.settlement-community-project-control').click();
    await page.locator('[data-county-project-target="norse"]').click();
    const coercive = page.locator(
      '[data-county-project-policy="coercive"]');
    const coerciveCard = page.locator(
      '[data-county-project-policy-card="coercive"]');
    const coerciveDetails = coerciveCard.locator('.settcard-details');
    await expect(coercive).toContainText('Start Coercive enforcement');
    await expect(coercive).toContainText('people/year');
    await expect(coercive).toContainText('resistance');
    await expect(coercive).not.toContainText('Officials compel conformity');
    await expect(coerciveDetails).toContainText('Officials compel conformity');
    await expect(coerciveDetails).toContainText('This settlement is');
    await expect(coerciveDetails).toContainText('county-wide share');
    await expect(coerciveDetails).not.toContainText('for 720 days');
    await coercive.focus();
    await expect(page.locator('#tooltip')).toContainText(
      'Officials compel conformity');

    await page.setViewportSize({ width:390, height:740 });
    await expect(page.locator('#tooltip')).toBeHidden();
    const disclosure = coerciveCard.locator('.settcard-info');
    await expect(disclosure).toBeVisible();
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(coerciveDetails).toBeVisible();

    const result = await page.evaluate(function (pid) {
      const s = FB.state;
      const keys = ['tax', 'levy', 'commonVoice', 'unrest', 'marketFlow'];
      const before = {};
      keys.forEach(function (key) { before[key] = FB.modBonus(s, key, pid); });
      const startedCulture = FB.orderSettlementCommunityProject(
        s, pid, 0, 'culture', 'norse', 'coercive');
      const share = FB.settlementPopulation(s, pid, 0) /
        s.population.counties[pid].count;
      const afterCulture = {};
      keys.forEach(function (key) {
        afterCulture[key] = FB.modBonus(s, key, pid);
      });
      const startedFaith = FB.orderSettlementCommunityProject(
        s, pid, 0, 'faith', 'norse_pagan', 'coercive');
      const afterBoth = {};
      keys.forEach(function (key) { afterBoth[key] = FB.modBonus(s, key, pid); });
      const hasCountyModifier = FB.countyModifierRecords(s, pid).some(
        function (record) { return record.id === 'community_coercion'; });
      FB.cancelSettlementCommunityProject(s, pid, 0, 'culture');
      const afterOneStop = FB.modBonus(s, 'tax', pid);
      FB.cancelSettlementCommunityProject(s, pid, 0, 'faith');
      const afterBothStop = FB.modBonus(s, 'tax', pid);
      return {
        startedCulture:startedCulture,
        startedFaith:startedFaith,
        share:share,
        before:before,
        afterCulture:afterCulture,
        afterBoth:afterBoth,
        hasCountyModifier:hasCountyModifier,
        afterOneStop:afterOneStop,
        afterBothStop:afterBothStop
      };
    }, setup.pid);

    expect(result.startedCulture).toBe(true);
    expect(result.startedFaith).toBe(true);
    expect(result.hasCountyModifier).toBe(false);
    expect(result.afterCulture.tax - result.before.tax)
      .toBeCloseTo(-0.05 * result.share, 8);
    expect(result.afterCulture.levy - result.before.levy)
      .toBeCloseTo(-0.08 * result.share, 8);
    expect(result.afterCulture.commonVoice - result.before.commonVoice)
      .toBeCloseTo(-8 * result.share, 8);
    expect(result.afterCulture.unrest - result.before.unrest)
      .toBeCloseTo(0.40 * result.share, 8);
    expect(result.afterCulture.marketFlow - result.before.marketFlow)
      .toBeCloseTo(-0.10 * result.share, 8);
    expect(result.afterBoth).toEqual(result.afterCulture);
    expect(result.afterOneStop).toBeCloseTo(result.afterCulture.tax, 8);
    expect(result.afterBothStop).toBeCloseTo(result.before.tax, 8);
  });

test('Faith details open personal conversion without territorial navigation',
  async function ({ page }) {
    await page.setViewportSize({ width:1280, height:800 });
    await configureCountyProjectUi(page);
    await page.evaluate(function () { FB.ui.showFaithDetails('catholic'); });
    const action = page.locator('.identity-conversion-action', {
      has:page.locator('#faith-details-convert')
    });
    await expect(page.locator('#faith-details-convert')).toBeVisible();
    await expect(page.locator('[data-faith-land-pid]')).toHaveCount(0);
    await expect(page.locator('.faith-details-land')).toHaveCount(0);
    await expect(action.locator('.settcard-info')).toBeHidden();
    await expect(action.locator('.identity-conversion-action-details'))
      .toBeHidden();
    await action.hover();
    await expect(page.locator('#tooltip')).toContainText(
      'Open the personal, household, or realm faith picker.');

    await page.setViewportSize({ width:390, height:740 });
    const info = action.locator('.settcard-info');
    await expect(info).toBeVisible();
    const faithActionBox = await page.locator(
      '#faith-details-convert').boundingBox();
    const faithInfoBox = await info.boundingBox();
    expect(Math.abs(faithActionBox.y - faithInfoBox.y))
      .toBeLessThanOrEqual(1);
    expect(Math.abs(faithActionBox.height - faithInfoBox.height))
      .toBeLessThanOrEqual(1);

    await page.locator('#faith-details-convert').click();
    await expect(page.locator('#gm-title')).toHaveText('Convert faith');
    await expect(page.locator('#conv-search')).toBeVisible();
  });

test('Self culture details show traditions and open personal conversion',
  async function ({ page }) {
    await configureCountyProjectUi(page);
    await page.evaluate(function () {
      FB.ui.showTab('char');
      FB.ui.refresh();
    });

    const cultureButton = page.locator('#self-culture-details');
    await expect(cultureButton).toHaveText('Gaelic');
    await cultureButton.click();
    await expect(page.locator('#gm-title')).toContainText('Gaelic');
    const body = page.locator('#gm-body');
    await expect(body.locator('.kv').filter({
      has:page.locator('span', { hasText:'Current culture' })
    }).locator('b')).toHaveText('Gaelic');
    await expect(body.locator('.kv').filter({
      has:page.locator('span', { hasText:'Regional tradition' })
    }).locator('b')).toHaveText('☘ Celtic Traditions');
    await expect(body.locator('.kv').filter({
      has:page.locator('span', { hasText:'Dynasty style' })
    }).locator('b')).toHaveText('Clan prefix (mac)');
    await expect(body.locator('.kv').filter({
      has:page.getByText('Men’s names', { exact:true })
    }).locator('b')).toHaveText('Aed, Niall, Domnall, Cormac');
    await expect(body.locator('.kv').filter({
      has:page.getByText('Women’s names', { exact:true })
    }).locator('b')).toHaveText('Gormlaith, Derbail, Mor, Eithne');
    const action = page.locator('.identity-conversion-action', {
      has:page.locator('#culture-details-adopt')
    });
    await expect(page.locator('#culture-details-adopt'))
      .toContainText('Adopt a new culture…');
    await expect(page.locator('[data-culture-land-pid]')).toHaveCount(0);
    await expect(page.locator('.modal-title-info')).toHaveCount(0);
    await expect(action.locator('.identity-conversion-action-details'))
      .toBeHidden();

    await page.setViewportSize({ width:390, height:740 });
    const info = action.locator('.settcard-info');
    await expect(info).toBeVisible();
    const cultureActionBox = await page.locator(
      '#culture-details-adopt').boundingBox();
    const cultureInfoBox = await info.boundingBox();
    expect(Math.abs(cultureActionBox.y - cultureInfoBox.y))
      .toBeLessThanOrEqual(1);
    expect(Math.abs(cultureActionBox.height - cultureInfoBox.height))
      .toBeLessThanOrEqual(1);
    await info.click();
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect(action.locator('.identity-conversion-action-details'))
      .toBeVisible();
    await expect(action.locator('.identity-conversion-action-details'))
      .toContainText('Open the personal or household culture picker.');

    await page.locator('#culture-details-adopt').click();
    await expect(page.locator('#gm-title')).toHaveText('Adopt a new culture');
    await expect(page.locator('#conv-search')).toBeVisible();
  });

test('identity sheets expose every doctrine and confirm paid branch reforms',
  async function ({ page }) {
    await configureCountyProjectUi(page);
    await seedDoctrineContacts(page);
    await page.evaluate(function () {
      FB.state.player.piety = 2000;
      FB.state.player.prestige = 2000;
      FB.state.player.war = null;
      FB.state.player.cooldowns = {};
      var me = FB.state.chars[FB.state.player.charId];
      me.religion = 'catholic';
      me.culture = 'gaelic';
      FB.ui.showFaithDetails(me.religion);
    });

    const faithBody = page.locator('#gm-body');
    await expect(faithBody).toContainText('Marriage form');
    await expect(faithBody).toContainText('Marriage with other faiths');
    await expect(faithBody).toContainText('Divorce');
    await expect(faithBody).toContainText('Close-kin marriage');
    await expect(faithBody).toContainText('Clergy marriage');
    await expect(page.locator('#faith-details-reform')).toBeVisible();
    await page.locator('#faith-details-reform').click();
    await expect(page.locator('#gm-title')).toHaveText('Reform Faith');
    await page.locator('[data-doctrine-id="close_kin"]').click();
    await expect(page.locator('#gm-title')).toHaveText('Close-kin marriage');
    await page.locator('[data-doctrine-option="sanctioned"]').click();
    await expect(page.locator('#gm-title')).toHaveText(
      'Confirm Doctrine Reform');
    await expect(page.locator('#gm-body')).toContainText('400 piety');
    await expect(page.locator('#gm-body')).toContainText(
      'Creates a new branch and changes only your character’s identity');
    await page.locator('#doctrine-confirm').click();
    await expect(page.locator('#gm-title')).toContainText(
      'Reformed Latin Christianity');
    await expect(page.locator('#gm-body')).toContainText(
      'Religiously sanctioned');
    await expect(page.locator('#gm-body')).toContainText(
      '1 doctrine · In the parent’s fold');

    await page.evaluate(function () {
      delete FB.state.player.cooldowns['reform_doctrine:culture'];
      var me = FB.state.chars[FB.state.player.charId];
      FB.ui.showCultureDetails(me.culture);
    });
    const cultureBody = page.locator('#gm-body');
    await expect(cultureBody).toContainText('Raiding tradition');
    await expect(cultureBody).toContainText('Seafaring tradition');
    await expect(cultureBody).toContainText('Military tradition');
    await expect(cultureBody).toContainText('Learning tradition');
    await expect(page.locator('#culture-details-reform')).toBeVisible();
    await page.locator('#culture-details-reform').click();
    await page.locator('[data-doctrine-id="military"]').click();
    await page.locator('[data-doctrine-option="huscarl"]').click();
    await expect(page.locator('#gm-body')).toContainText('350 prestige');
    await expect(page.locator('#gm-body')).toContainText(
      'local populations keep their current identities');
    await page.locator('#doctrine-confirm').click();
    await expect(page.locator('#gm-title')).toContainText('Reformed Gaelic');
    await expect(page.locator('#gm-body')).toContainText('Huscarls');
    await expect(page.locator('#gm-body')).toContainText(
      '1 doctrine · Related to parent');
    await expect(page.locator('#gm-body')).toContainText(
      'Home settlement followers');
    await expect(page.locator('#culture-details-spread')).toBeVisible();
    await expect(page.locator('[data-doctrine-adoption]')).toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('Adoption in your recruiting lands');
    await page.evaluate(function () {
      delete FB.state.player.cooldowns['reform_doctrine:culture'];
      FB.ui.showDoctrineConfirm('culture', 'seafaring', 'oceanic');
    });
    await expect(page.locator('#gm-body')).toContainText(
      'Changes the existing branch’s doctrines for every current follower');
    await page.evaluate(function () {
      var s = FB.state;
      FB.ui.showCultureDetails(s.chars[s.player.charId].culture);
    });
    await page.locator('#culture-details-spread').click();
    await expect(page.locator('#gm-title')).toContainText('Choose policy');
    await expect(page.locator('#gm-body')).toContainText('Reformed Gaelic');
    expect(await page.evaluate(function () {
      var s = FB.state;
      return FB.settlementCommunityProject(
        s, s.player.provinceId, s.player.homeSettlement || 0, 'culture');
    })).toBeNull();
  });

test('general culture adoption lists generated cultures only after three dominant counties',
  async function ({ page }) {
    await configureCountyProjectUi(page);
    const setup = await page.evaluate(function () {
      var s = FB.state;
      var id = FB.createCulture(s, { name:'Test regional branch', parent:'gaelic', doctrineBranch:true });
      var pids = FB.world.provs.filter(function (pr) { return !pr.wasteland; })
        .slice(0, 3).map(function (pr) { return pr.id; });
      for (var i = 0; i < 2; i++) {
        FB.convertCountyCommunity(s, pids[i], { kind:'culture', target:id, rate:1 });
      }
      FB.ui.showConversionPicker('culture');
      return { id:id, pids:pids };
    });
    await expect(page.locator('[data-conv-target="' + setup.id + '"]')).toHaveCount(0);
    await expect(page.locator('#gm-body')).toContainText('dominant in at least 3 counties');
    await page.evaluate(function (setup) {
      FB.convertCountyCommunity(FB.state, setup.pids[2], {
        kind:'culture', target:setup.id, rate:1
      });
      FB.ui.showConversionPicker('culture');
    }, setup);
    await expect(page.locator('[data-conv-target="' + setup.id + '"]')).toBeVisible();
    await page.locator('#conv-search').fill('Test regional branch');
    await expect(page.locator('[data-conv-target="' + setup.id + '"]')).toBeVisible();
    await page.evaluate(function (setup) {
      FB.convertCountyCommunity(FB.state, setup.pids[2], {
        kind:'culture', target:'gaelic', rate:1
      });
      FB.ui.showConversionPicker('culture');
    }, setup);
    await expect(page.locator('[data-conv-target="' + setup.id + '"]')).toHaveCount(0);
  });

for (const kind of ['culture', 'faith']) {
  test('return to parent ' + kind + ' uses personal conversion and preserves the branch',
    async function ({ page }) {
      await configureCountyProjectUi(page);
      await seedDoctrineContacts(page);
      const setup = await page.evaluate(function (kind) {
        var s = FB.state, p = s.player, me = s.chars[p.charId];
        p.piety = 5000; p.prestige = 5000; p.cooldowns = {}; p.war = null;
        me.culture = 'gaelic'; me.religion = 'catholic';
        var parent = kind === 'faith' ? me.religion : me.culture;
        var doctrine = kind === 'faith' ? 'close_kin' : 'military';
        var branch = FB.applyDoctrineReform(s, kind, doctrine,
          kind === 'faith' ? 'sanctioned' : 'huscarl');
        FB.convertCountyCommunity(s, p.provinceId, { kind:kind, target:branch, rate:0.5 });
        var status = FB.conversionStatus(s, kind, parent, 'self');
        var snapshot = {
          branch:JSON.stringify((kind === 'faith' ? s.faiths : s.cultures)[branch]),
          communities:JSON.stringify(FB.countyCommunities(s, p.provinceId))
        };
        if (kind === 'faith') FB.ui.showFaithDetails(branch);
        else FB.ui.showCultureDetails(branch);
        return { parent:parent, branch:branch, snapshot:snapshot, doctrine:doctrine,
          parentOption:FB.doctrineOption(s, kind, parent, doctrine).definition.id,
          piety:p.piety, prestige:p.prestige, status:status };
      }, kind);
      expect(setup.status.ok).toBe(true);
      await expect(page.locator('#' + kind + '-details-return')).toBeVisible();
      await page.evaluate(function (args) {
        FB.ui.showDoctrineOptions(args.kind, args.doctrine);
      }, { kind:kind, doctrine:setup.doctrine });
      await expect(page.locator('[data-doctrine-option="' + setup.parentOption + '"]')).toHaveCount(0);
      await page.locator('#' + kind + '-details-return').click();
      await expect(page.locator('#gm-body')).toContainText('Only your character returns');
      await expect(page.locator('#doctrine-confirm')).toHaveCount(0);
      await page.locator('#conv-confirm').click();
      const after = await page.evaluate(function (args) {
        var s = FB.state, p = s.player;
        return { identity:s.chars[p.charId][args.kind === 'faith' ? 'religion' : 'culture'],
          piety:p.piety, prestige:p.prestige,
          branch:JSON.stringify((args.kind === 'faith' ? s.faiths : s.cultures)[args.branch]),
          communities:JSON.stringify(FB.countyCommunities(s, p.provinceId)) };
      }, { kind:kind, branch:setup.branch });
      expect(after.identity).toBe(setup.parent);
      expect(after.branch).toBe(setup.snapshot.branch);
      expect(after.communities).toBe(setup.snapshot.communities);
      expect(after.piety).toBe(setup.piety - setup.status.pietyCost);
      expect(after.prestige).toBe(setup.prestige - setup.status.prestigeCost);
    });
}

test('official faith scope explains that local populations need separate conversion',
  async function ({ page }) {
    await configureCountyProjectUi(page);
    await page.evaluate(function () { FB.ui.showConversionPicker('faith', 'realm'); });
    await expect(page.locator('[data-conv-scope="realm"]')).toHaveText('Realm’s official faith');
    await expect(page.locator('#conv-scope-desc')).toContainText('County and settlement populations keep their faith');
  });

test('community triggers and effects retain exact county and settlement context',
  async function ({ page }) {
    const setup = await configureCountyProjectUi(page);
    const result = await page.evaluate(function (pid) {
      const s = FB.state;
      const other = Object.keys(FB.world.adj[pid]).filter(function (id) {
        return FB.world.byId[id] && !FB.world.byId[id].wasteland;
      })[0];
      s.population.counties[other] = {
        count:1200, natural:0, migration:0, losses:0,
        communities:[
          { culture:'gaelic', religion:'catholic', count:840 },
          { culture:'norse', religion:'norse_pagan', count:360 }
        ],
        identity:{ culture:'gaelic', religion:'catholic',
          cultureSince:s.date.year, religionSince:s.date.year },
        communityChange:{ faithConverted:0, cultureAssimilated:0 }
      };
      FB.reconcileCountyCommunities(s, pid);
      FB.reconcileCountyCommunities(s, other);
      const ctx = { locationId:pid, settlementIndex:0 };
      const trigger = FB.checkTrigger(s, {
        countyCulture:'gaelic', countyFaith:'catholic',
        settlementCulture:{ target:'gaelic', settlement:'$context' },
        settlementFaith:{ target:'catholic', settlement:'$context' },
        countyCommunityShare:{ kind:'culture', target:'norse',
          min:0.20, max:0.30 },
        countyCommunityMixed:{ kind:'faith', minCommunities:2,
          minorityShareMin:0.30 },
        settlementCommunityMixed:{ kind:'culture', minCommunities:2,
          settlement:'$context' },
        countyCommunityProject:{ kind:'culture', active:false },
        settlementCommunityProject:{ kind:'faith', active:false,
          settlement:'$context' }
      }, ctx);
      function communityCount(communities, culture, religion) {
        const match = communities.filter(function (community) {
          return community.culture === culture &&
            community.religion === religion;
        })[0];
        return match ? match.count : 0;
      }
      const beforeCombined = s.population.counties[pid].count +
        s.population.counties[other].count;
      const beforeLocal = FB.settlementCommunities(s, pid, 0);
      const beforeNeighbor = FB.settlementCommunities(s, pid, 1);
      let receipts = FB.applyEffects(s, {
        settlementCommunityTransfer:{ kind:'faith', target:'catholic',
          source:'orthodox', amount:10, settlement:'$context' },
        settlementCommunityProject:{ kind:'culture', target:'norse',
          policy:'voluntary', sponsor:'$player', settlement:'$context' }
      }, ctx, { id:'e2e_community_effects' });
      const afterTransferLocal = FB.settlementCommunities(s, pid, 0);
      const afterTransferNeighbor = FB.settlementCommunities(s, pid, 1);
      const exactSettlementTransfer =
        communityCount(afterTransferLocal, 'english', 'catholic') ===
          communityCount(beforeLocal, 'english', 'catholic') + 10 &&
        communityCount(afterTransferLocal, 'english', 'orthodox') ===
          communityCount(beforeLocal, 'english', 'orthodox') - 10 &&
        JSON.stringify(afterTransferNeighbor) === JSON.stringify(beforeNeighbor);
      receipts = receipts.concat(FB.applyEffects(s, {
        communityResettlement:{ fromProvinceId:other,
          toProvinceId:'$context', toSettlement:'$context',
          community:{ culture:'norse' }, amount:20 }
      }, ctx, { id:'e2e_community_resettlement' }));
      receipts = receipts.concat(FB.applyEffects(s, {
        communityMigration:{ fromProvinceId:'$context', toProvinceId:other,
          fromSettlement:'$context', community:{ culture:'norse' }, amount:5 }
      }, ctx, { id:'e2e_community_migration' }));
      receipts = receipts.concat(FB.applyEffects(s, {
        communityExpulsion:{ fromProvinceId:other, toProvinceId:'$context',
          toSettlement:'$context', community:{ religion:'norse_pagan' },
          amount:5 }
      }, ctx, { id:'e2e_community_expulsion' }));
      return {
        trigger:trigger,
        combined:s.population.counties[pid].count +
          s.population.counties[other].count,
        beforeCombined:beforeCombined,
        exactSettlementTransfer:exactSettlementTransfer,
        localConserved:FB.settlementCommunities(s, pid, 0).reduce(
          function (sum, community) { return sum + community.count; }, 0) ===
            FB.settlementPopulation(s, pid, 0),
        project:FB.settlementCommunityProject(s, pid, 0, 'culture'),
        otherProject:FB.settlementCommunityProject(s, pid, 1, 'culture'),
        receiptActions:receipts.filter(function (entry) {
          return entry.type === 'population';
        }).map(function (entry) { return entry.action; })
      };
    }, setup.pid);
    expect(result.trigger).toBe(true);
    expect(result.combined).toBe(result.beforeCombined);
    expect(result.exactSettlementTransfer).toBe(true);
    expect(result.localConserved).toBe(true);
    expect(result.project.target).toBe('norse');
    expect(result.otherProject).toBeNull();
    expect(result.receiptActions).toEqual(expect.arrayContaining([
      'settlement_community_transfer', 'resettlement',
      'migration', 'expulsion',
      'settlement_community_project_start'
    ]));
  });

test('AI sponsorship requires authority, community support, stability, and motive',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      const rid = 'e2e_community_ruler';
      s.realms[rid] = {
        id:rid, name:'March Court', alive:true, capital:pid,
        religion:'norse_pagan', rank:1,
        ruler:{ culture:'norse', religion:'norse_pagan', age:38,
          generation:1, traits:['zealous'] }
      };
      s.owner[pid] = rid;
      s.holder = s.holder || {};
      s.holder[pid] = rid;
      s.population.counties[pid] = {
        count:1000, natural:0, migration:0, losses:0,
        communities:[
          { culture:'gaelic', religion:'catholic', count:700 },
          { culture:'norse', religion:'norse_pagan', count:300 }
        ],
        identity:{ culture:'gaelic', religion:'catholic',
          cultureSince:s.date.year, religionSince:s.date.year },
        communityChange:{ faithConverted:0, cultureAssimilated:0 }
      };
      s.agency = s.agency || {};
      s.agency.rulerAims = s.agency.rulerAims || {};
      s.agency.rulerAims[rid] = {
        id:'defend_faith', generation:1, sinceYear:s.date.year
      };
      const candidate = FB.communityProjectAICandidates(s).filter(
        function (entry) { return entry.rid === rid && entry.kind === 'faith'; }
      )[0];
      s.realms.e2e_community_enemy = {
        id:'e2e_community_enemy', name:'Enemy Court', alive:true,
        capital:'missing', religion:'catholic', rank:1,
        ruler:{ culture:'gaelic', religion:'catholic', age:40,
          generation:1, traits:[] }
      };
      s.realms[rid].war = { enemy:'e2e_community_enemy' };
      const noWar = !FB.communityProjectAICandidates(s).some(
        function (entry) { return entry.rid === rid; });
      delete s.realms[rid].war;
      s.occupations = s.occupations || {};
      s.occupations[pid] = { progress:1 };
      const noSiege = !FB.communityProjectAICandidates(s).some(
        function (entry) { return entry.rid === rid; });
      delete s.occupations[pid];
      s.realms[rid].capital = 'missing';
      s.agency.rulerAims[rid].id = 'keep_peace';
      s.population.counties[pid].communities = [
        { culture:'gaelic', religion:'catholic', count:850 },
        { culture:'norse', religion:'norse_pagan', count:150 }
      ];
      FB.reconcileCountyCommunities(s, pid);
      const noMotive = !FB.communityProjectAICandidates(s).some(
        function (entry) { return entry.rid === rid; });
      s.holder[pid] = 'player';
      const noAuthority = !FB.communityProjectAICandidates(s).some(
        function (entry) { return entry.rid === rid; });
      s.holder[pid] = rid;
      s.realms[rid].capital = pid;
      s.agency.rulerAims[rid].id = 'defend_faith';
      s.population.counties[pid].communities = [
        { culture:'gaelic', religion:'catholic', count:700 },
        { culture:'norse', religion:'norse_pagan', count:300 }
      ];
      FB.reconcileCountyCommunities(s, pid);
      const oldCandidates = FB.communityProjectAICandidates;
      const oldChanceFunction = FB.chance;
      const oldChance = FBDATA.balance.countyCommunityAIAnnualChance;
      const oldCap = FBDATA.balance.countyCommunityAIMaxActiveProjects;
      let chanceCalls = 0;
      FB.communityProjectAICandidates = function () {
        return candidate ? [candidate, candidate] : [];
      };
      FB.chance = function () {
        chanceCalls++;
        return true;
      };
      FBDATA.balance.countyCommunityAIAnnualChance = 0.16;
      FBDATA.balance.countyCommunityAIMaxActiveProjects = 1;
      const started = FB.communityProjectAIYearly(s);
      const blockedAtCap = FB.communityProjectAIYearly(s);
      const project = FB.countyCommunityProject(s, pid, 'faith');
      const activeProjects = FB.communityProjectAIActiveCount(s);
      FB.stopCountyCommunityProject(s, pid, 'faith');
      let rejectedCandidateScans = 0;
      FB.communityProjectAICandidates = function () {
        rejectedCandidateScans++;
        return candidate ? [candidate] : [];
      };
      FB.chance = function () {
        chanceCalls++;
        return false;
      };
      const rejected = FB.communityProjectAIYearly(s);
      FB.communityProjectAICandidates = oldCandidates;
      FB.chance = oldChanceFunction;
      FBDATA.balance.countyCommunityAIAnnualChance = oldChance;
      FBDATA.balance.countyCommunityAIMaxActiveProjects = oldCap;
      return {
        candidate:!!candidate,
        noWar:noWar,
        noSiege:noSiege,
        noMotive:noMotive,
        noAuthority:noAuthority,
        share:candidate && candidate.share,
        motive:candidate && candidate.aim,
        policy:candidate && candidate.policy,
        started:started.length,
        blockedAtCap:blockedAtCap.length,
        activeProjects:activeProjects,
        chanceCalls:chanceCalls,
        rejected:rejected.length,
        rejectedCandidateScans:rejectedCandidateScans,
        sponsor:project && project.sponsor
      };
    });
    expect(result.candidate).toBe(true);
    expect(result.noWar).toBe(true);
    expect(result.noSiege).toBe(true);
    expect(result.noMotive).toBe(true);
    expect(result.noAuthority).toBe(true);
    expect(result.share).toBeCloseTo(0.3, 8);
    expect(result.motive).toBe('defend_faith');
    expect(['voluntary','integrative','coercive']).toContain(result.policy);
    expect(result.started).toBe(1);
    expect(result.blockedAtCap).toBe(0);
    expect(result.activeProjects).toBe(1);
    expect(result.chanceCalls).toBe(2);
    expect(result.rejected).toBe(0);
    expect(result.rejectedCandidateScans).toBe(0);
    expect(result.sponsor).toBe('e2e_community_ruler');
  });

test('AI candidate scans snapshot global war and siege state once',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const oldWarSnapshot = FB.realmWarSnapshot;
      const oldConflictSnapshot = FB.countyConflictSnapshot;
      const oldWarQuery = FB.isRealmAtWar;
      const oldConflictQuery = FB.countyOccupiedOrBesieged;
      let warSnapshots = 0;
      let conflictSnapshots = 0;
      let repeatedWarQueries = 0;
      let repeatedConflictQueries = 0;
      FB.realmWarSnapshot = function (state) {
        warSnapshots++;
        return oldWarSnapshot(state);
      };
      FB.countyConflictSnapshot = function (state) {
        conflictSnapshots++;
        return oldConflictSnapshot(state);
      };
      FB.isRealmAtWar = function (state, rid) {
        repeatedWarQueries++;
        return oldWarQuery(state, rid);
      };
      FB.countyOccupiedOrBesieged = function (state, pid) {
        repeatedConflictQueries++;
        return oldConflictQuery(state, pid);
      };
      let candidateCount = 0;
      try {
        candidateCount = FB.communityProjectAICandidates(FB.state).length;
      } finally {
        FB.realmWarSnapshot = oldWarSnapshot;
        FB.countyConflictSnapshot = oldConflictSnapshot;
        FB.isRealmAtWar = oldWarQuery;
        FB.countyOccupiedOrBesieged = oldConflictQuery;
      }
      return {
        candidateCount:candidateCount,
        warSnapshots:warSnapshots,
        conflictSnapshots:conflictSnapshots,
        repeatedWarQueries:repeatedWarQueries,
        repeatedConflictQueries:repeatedConflictQueries
      };
    });
    expect(result.candidateCount).toBeGreaterThanOrEqual(0);
    expect(result.warSnapshots).toBe(1);
    expect(result.conflictSnapshots).toBe(1);
    expect(result.repeatedWarQueries).toBe(0);
    expect(result.repeatedConflictQueries).toBe(0);
  });

test('historical situations, long-horizon observations, and save diagnostics are bounded',
  async function ({ page }) {
    const setup = await configureCountyProjectUi(page);
    const result = await page.evaluate(function (pid) {
      const s = FB.state;
      const customFaith = FB.foundFaith(s, {
        id:'e2e_observed_faith', name:'Observed Faith', group:'$current',
        relationToParent:'in_fold'
      }, { convertFounder:false });
      const me = s.chars[s.player.charId];
      me.religion = customFaith;
      s.realms.player.religion = customFaith;
      FB.convertCountyCommunity(s, pid, {
        kind:'faith', target:customFaith, amount:80,
        cause:'e2e founded faith observation'
      });
      const before = JSON.stringify(s);
      const observation = FB.observeCommunityProject(s, pid, {
        kind:'culture', target:'norse', policy:'voluntary', sponsor:'player'
      }, [25, 50, 100]);
      const foundedFaith = FB.observeCommunityProject(s, pid, {
        kind:'faith', target:customFaith,
        policy:'integrative', sponsor:'player'
      }, [25, 50, 100]);
      const diagnostics = FB.populationSaveDiagnostics(s);
      const ids = [
        'community_peaceful_adoption',
        'community_elite_led_conversion',
        'community_frontier_settlement',
        'community_urban_minority',
        'community_coercive_backlash'
      ];
      return {
        unchanged:before === JSON.stringify(s),
        years:observation.observations.map(function (entry) {
          return entry.years;
        }),
        shares:observation.observations.map(function (entry) {
          return entry.share;
        }),
        foundedInitial:foundedFaith.initialShare,
        foundedShares:foundedFaith.observations.map(function (entry) {
          return entry.share;
        }),
        diagnostics:diagnostics,
        situations:ids.map(function (id) {
          const event = FB.eventById(id);
          return !!event && FB.validateCommunityEvent(event);
        })
      };
    }, setup.pid);
    expect(result.unchanged).toBe(true);
    expect(result.years).toEqual([25, 50, 100]);
    expect(result.shares[0]).toBeGreaterThan(0.25);
    expect(result.shares[0]).toBeLessThan(0.9);
    expect(result.shares[1]).toBeGreaterThanOrEqual(result.shares[0]);
    expect(result.shares[2]).toBeGreaterThanOrEqual(result.shares[1]);
    expect(result.foundedInitial).toBeGreaterThan(0);
    expect(result.foundedShares[0]).toBeGreaterThan(result.foundedInitial);
    expect(result.foundedShares[1]).toBeGreaterThanOrEqual(result.foundedShares[0]);
    expect(result.foundedShares[2]).toBeGreaterThanOrEqual(result.foundedShares[1]);
    expect(result.foundedShares[2]).toBeLessThan(0.98);
    expect(result.diagnostics.bytes).toBeGreaterThan(0);
    expect(result.diagnostics.counties).toBeGreaterThan(400);
    expect(result.situations).toEqual([true, true, true, true, true]);
  });

test('both bookmarks retain mixed communities across 25, 50, and 100 year observations',
  async function ({ page }) {
    const result = await page.evaluate(async function () {
      function activate(bookmarkId) {
        return new Promise(function (resolve, reject) {
          FB.activateBookmark(bookmarkId, function () {}, function (error) {
            if (error) reject(error);
            else resolve();
          });
        });
      }
      function observeBookmark() {
        const year = FB.activeBookmark.date.year;
        const state = {
          start:{ id:FB.activeBookmarkId, year:year },
          date:{ year:year }, turn:0,
          player:{ charId:'calibrator', provinceId:'', tier:4 },
          chars:{ calibrator:{ id:'calibrator', culture:'', religion:'',
            traits:[] } },
          owner:{}, holder:{}, buildings:{}, dev:{}, realms:{},
          realmTechMigration:2, realmTech:{}
        };
        FB.ensurePopulationState(state);
        const holyWarCounties = {};
        for (const faithId in FBDATA.religions) {
          const faith = FBDATA.religions[faithId];
          const campaign = faith && faith.properties &&
            faith.properties.head && faith.properties.head.greatHolyWar;
          const rows = campaign && campaign.sacredTargets || [];
          for (let ri = 0; ri < rows.length; ri++) {
            const counties = rows[ri].counties || [];
            for (let ci = 0; ci < counties.length; ci++) {
              holyWarCounties[counties[ci]] = true;
            }
          }
        }
        const sacredPids = Object.keys(holyWarCounties).sort();
        for (let spi = 0; spi < sacredPids.length; spi++) {
          const sacredPid = sacredPids[spi];
          const sacred = state.population.counties[sacredPid];
          if (!sacred) continue;
          const currentFaith = sacred.identity.religion;
          const targetFaith = Object.keys(FBDATA.religions).sort().filter(
            function (faithId) {
              const relation = FB.faithRelation(
                state, currentFaith, faithId);
              return faithId !== currentFaith &&
                (!FB.faithAssignable || FB.faithAssignable(faithId, state)) &&
                (relation === 'hostile' || relation === 'foreign');
            })[0];
          if (!targetFaith) continue;
          FB.convertCountyCommunity(state, sacredPid, {
            kind:'faith', target:targetFaith,
            amount:Math.max(1, Math.round(sacred.count * 0.15)),
            cause:'e2e holy-war-region calibration'
          });
          break;
        }
        const candidates = [];
        const pids = Object.keys(state.population.counties).sort();
        for (let pi = 0; pi < pids.length; pi++) {
          const pid = pids[pi];
          const rec = state.population.counties[pid];
          const communities = rec.communities || [];
          if (communities.length < 2) continue;
          for (const kind of ['culture','faith']) {
            const field = kind === 'culture' ? 'culture' : 'religion';
            const dominant = rec.identity[field];
            const targets = [];
            for (let ci = 0; ci < communities.length; ci++) {
              const target = communities[ci][field];
              if (target !== dominant && targets.indexOf(target) < 0) {
                targets.push(target);
              }
            }
            targets.sort();
            if (!targets.length) continue;
            const target = targets[0];
            const adjacent = FB.world.adj[pid] || {};
            const borderland = Object.keys(adjacent).some(function (otherPid) {
              const other = state.population.counties[otherPid];
              return other && other.identity[field] !== dominant;
            });
            const tradeCenter = (FB.settlementsOf(state, pid) || []).some(
              function (site) {
                return site.kind === 'city' || site.kind === 'town';
              });
            const relation = kind === 'faith' && FB.faithRelation
              ? FB.faithRelation(state, dominant, target) : null;
            const opposedFaith = relation === 'hostile' || relation === 'foreign';
            candidates.push({
              pid:pid, kind:kind, target:target,
              dominantCulture:rec.identity.culture,
              dominantFaith:rec.identity.religion,
              borderland:borderland, tradeCenter:tradeCenter,
              holyWarRegion:!!holyWarCounties[pid] && opposedFaith
            });
          }
        }
        const wanted = {
          culture:function (entry) { return entry.kind === 'culture'; },
          faith:function (entry) { return entry.kind === 'faith'; },
          borderland:function (entry) { return entry.borderland; },
          trade_center:function (entry) { return entry.tradeCenter; },
          holy_war_region:function (entry) { return entry.holyWarRegion; }
        };
        const selected = [];
        const coverage = {};
        for (const category in wanted) {
          const candidate = candidates.filter(wanted[category])[0];
          coverage[category] = !!candidate;
          if (!candidate) continue;
          const key = candidate.pid + '|' + candidate.kind + '|' + candidate.target;
          let row = selected.filter(function (entry) {
            return entry.key === key;
          })[0];
          if (!row) {
            row = { key:key, candidate:candidate, categories:[] };
            selected.push(row);
          }
          row.categories.push(category);
        }
        const observations = [];
        for (let si = 0; si < selected.length; si++) {
          const candidate = selected[si].candidate;
          state.player.provinceId = candidate.pid;
          state.owner[candidate.pid] = 'player';
          state.holder[candidate.pid] = 'player';
          state.chars.calibrator.culture = candidate.kind === 'culture'
            ? candidate.target : candidate.dominantCulture;
          state.chars.calibrator.religion = candidate.kind === 'faith'
            ? candidate.target : candidate.dominantFaith;
          state.realms.player = {
            id:'player', alive:true, capital:candidate.pid, ruler:'calibrator',
            religion:state.chars.calibrator.religion
          };
          const observation = FB.observeCommunityProject(
            state, candidate.pid, {
              kind:candidate.kind, target:candidate.target,
              policy:'voluntary', sponsor:'player'
            }, [25, 50, 100]);
          if (observation) {
            observations.push({
              categories:selected[si].categories,
              observation:observation
            });
          }
        }
        return { coverage:coverage, observations:observations };
      }
      await activate('867');
      const bookmark867 = observeBookmark();
      await activate('1066');
      const bookmark1066 = observeBookmark();
      return { bookmark867:bookmark867, bookmark1066:bookmark1066 };
    });
    for (const bookmark of [result.bookmark867, result.bookmark1066]) {
      expect(bookmark.observations.length).toBeGreaterThanOrEqual(3);
      expect(bookmark.coverage).toEqual({
        culture:true, faith:true, borderland:true,
        trade_center:true, holy_war_region:true
      });
      for (const sample of bookmark.observations) {
        const observation = sample.observation;
        expect(observation.observations.map(function (entry) {
          return entry.years;
        })).toEqual([25, 50, 100]);
        expect(observation.observations[0].share)
          .toBeGreaterThan(observation.initialShare);
        for (const horizon of observation.observations) {
          expect(horizon.share).toBeLessThan(0.98);
        }
        expect(observation.observations[1].share)
          .toBeGreaterThanOrEqual(observation.observations[0].share);
        expect(observation.observations[2].share)
          .toBeGreaterThanOrEqual(observation.observations[1].share);
      }
    }
  });
