'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/model.js', 'js/actions.js', 'js/economy.js',
  'js/travel.js', 'js/world.js', 'js/lordships.js', 'js/events.js', 'js/main.js',
  'js/save.js', 'js/save_v4.js', 'js/ui_panels.js', 'js/ui_modals.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, info) {
  await openGame(page, info);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
});

test('committed acquisitions and settlement survive two played lives without replay', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, founder = s.chars[p.charId];
    p.gold = 100000; p.landPlots = []; p.landPlotMigration = 1; p.enterprises = [];
    const site = FB.landAvailable(s)[0];
    const bought = FB.buyLandPlot(s, site.settlement);
    FB.buyLandPlot(s, site.settlement);
    let business = null;
    const sites = FB.settlementsOf(s, p.provinceId);
    for (let i = 0; i < sites.length && !business; i++) {
      const available = FB.enterpriseAvailable(s, p.provinceId, i, false);
      if (available.length) business = FB.buyEnterprise(s, available[0].id, i);
    }
    const home = p.provinceId;
    const destination = Object.keys(FB.world.byId).filter(function (id) {
      return id !== home && !FB.world.byId[id].wasteland;
    })[0];
    p.travel = { purpose:'work', phase:'arrived', homeId:home, destinationId:destination,
      completed:true, stayStartTurn:s.turn - 400, workEvents:4,
      outboundRoute:[destination], remainingRoute:[], legDays:3, legDaysLeft:0 };
    const beforeMove = FB.lifeHistory(s, founder.id).entries.length;
    FB.travelSettlementEligible(s);
    const reviewPure = beforeMove === FB.lifeHistory(s, founder.id).entries.length;
    const moved = FB.travelSettle(s);
    const repeated = FB.travelSettle(s);
    FB.noteLifeEvent(s, founder.id, 'appointment', { office:'Steward', patron:'Recorded patron' });
    FB.noteLifeEvent(s, founder.id, 'rank', { title:{ $title:FB.characterRankTitleSnapshot(s, founder, 2, 'Recorded seat') } });
    FB.noteLifeEvent(s, founder.id, 'battle', { men:100, enemyMen:90, place:'Recorded field' });
    FB.noteLifeEvent(s, founder.id, 'conquest', { place:'Recorded county' });
    p.familyFreedom = { version:1, first:{ route:'purchase', lawful:true, protagonistId:founder.id,
      lordId:null, provinceId:home, settlementIndex:0, turn:s.turn, year:s.date.year,
      price:12, serviceDays:0 } };
    founder.born = s.date.year - 55;
    const heir = FB.makeCharacter(s, { name:'Landmark heir', sex:'m', born:s.date.year - 20,
      dyn:founder.dyn, culture:founder.culture, religion:founder.religion, traitsN:0 });
    heir.motherId = founder.id; founder.childrenIds.push(heir.id); FB.touchFamily();
    const retired = FB.game.retireTo(heir.id);
    s.turn++;
    FB.noteLifeEvent(s, heir.id, 'rank', { title:{ $title:FB.characterRankTitleSnapshot(s, heir, 2, 'Later seat') } });
    FB.noteFamilyMilestone(s, 'property', home, site.settlement);
    FB.noteFamilyMilestone(s, 'enterprise', home, 0, FB.dataParam('enterprise', business.type));
    FB.killChar(s, founder);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const before = JSON.stringify(s.lifeHistories);
    for (let i = 0; i < 3; i++) FB.familyLandmarks(s);
    const pure = before === JSON.stringify(s.lifeHistories) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const expected = FB.familyLandmarks(s).map(function (row) {
      return { id:row.record.identity.id, entries:row.entries };
    });
    const wealth = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state;
    const actual = FB.familyLandmarks(restored).map(function (row) {
      return { id:row.record.identity.id, entries:row.entries };
    });
    FB.ui.showLifeHistoryCollection(0, false, null, true);
    const original = FB.lifeHistory(restored, founder.id);
    return { bought:bought, business:!!business, moved:moved, repeated:repeated,
      reviewPure:reviewPure, retired:retired, pure:pure, expected:expected, actual:actual,
      wealth:wealth === restored.player.gold,
      keys:original.entries.map(function (e) { return e.msg.key; }),
      property:original.entries.filter(function (e) { return e.msg.key === 'news.biography.property'; })[0],
      place:site.settlementName,
      heirKeys:FB.lifeHistory(restored, heir.id).entries.map(function (e) { return e.msg.key; }) };
  });
  expect(result).toMatchObject({ bought:true, business:true, moved:true, repeated:false,
    reviewPure:true, retired:true, pure:true, wealth:true });
  expect(result.actual).toEqual(result.expected);
  expect(result.actual).toHaveLength(2);
  for (const kind of ['property', 'enterprise', 'relocation', 'appointment', 'rank', 'battle', 'conquest', 'retirement', 'death']) {
    expect(result.keys.filter(function (key) { return key === 'news.biography.' + kind; })).toHaveLength(1);
  }
  expect(result.property.msg.params.place).toBe(result.place);
  expect(result.heirKeys).not.toContain('news.biography.property');
  expect(result.heirKeys).not.toContain('news.biography.enterprise');
  expect(result.actual.reduce(function (n, row) {
    return n + row.entries.filter(function (e) { return e.msg.key === 'news.biography.rank'; }).length;
  }, 0)).toBe(1);
  expect(await page.locator('[data-family-landmark]').count()).toBeGreaterThan(0);
  await expect(page.locator('#gm-body')).toContainText('bought lawful freedom');
});

for (const width of [390, 1280]) {
  test('paged played landmarks retain scroll and focus at ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:700 });
    const staged = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      for (let i = 0; i < 23; i++) {
        const c = FB.makeCharacter(s, { name:'Played record ' + i, sex:'m', born:s.date.year - 30 - i,
          dyn:me.dyn, culture:me.culture, religion:me.religion, traitsN:0 });
        FB.lifeHistoryPlayed(s, c);
        FB.noteLifeEvent(s, c.id, 'property', { place:'Staged property' });
        FB.noteLifeEvent(s, c.id, 'enterprise', { place:'Staged workshop', asset:'Staged enterprise' });
        FB.noteLifeEvent(s, c.id, 'relocation', { place:'Staged home' });
        for (let n = 0; n < 60; n++) {
          s.turn++;
          FB.noteLifeEvent(s, c.id, 'battle', { men:100 + n, enemyMen:200, place:'Staged field' });
        }
        FB.noteFamilyMilestone(s, 'relocation', s.player.provinceId);
      }
      const rows = FB.familyLandmarks(s);
      FB.ui.showLifeHistoryCollection(0, false, null, true);
      return { count:rows.length, bounded:rows.every(function (row) { return row.record.entries.length <= 40; }),
        condensed:rows.filter(function (row) { return row.record.identity.id !== me.id; })
          .every(function (row) {
            return row.record.condensed && row.record.entries.length === 40 &&
              ['property', 'enterprise', 'relocation'].every(function (kind) {
                return row.entries.some(function (e) { return e.msg.key === 'news.biography.' + kind; });
              });
          }) };
    });
    expect(staged).toEqual({ count:24, bounded:true, condensed:true });
    const target = page.locator('[data-life-open]').nth(15);
    await target.scrollIntoViewIfNeeded();
    await target.focus();
    const remembered = await target.evaluate(function (button) {
      return { id:button.getAttribute('data-life-open'), scroll:document.getElementById('gm-body').scrollTop };
    });
    expect(remembered.scroll).toBeGreaterThan(0);
    await target.click();
    await page.locator('#life-back').click();
    await expect(page.locator('#gm-title')).toHaveText('Family landmarks');
    await expect(page.locator('[data-life-open="' + remembered.id + '"]')).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(remembered.scroll);
    await page.locator('#life-list-next').click();
    await expect(page.locator('[data-life-open]')).toHaveCount(4);
    await expect(page.locator('#gm-body')).toContainText('Page 2 of 2');
  });
}

test('capital and founded-seat moves record only committed permanent homes', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 2; p.provs = []; p.gold = 10000; p.prestige = 1000; p.piety = 1000;
    p.gentryGeneration = 0;
    const pid = Object.keys(s.owner).sort().find(function (id) {
      if (!FB.world.sitesByProv[id] || !FB.settlementCountyHolder(s, id)) return false;
      const previous = s.dev[id];
      s.dev[id] = 9;
      const available = FB.settlementCapacity(s, id) > FB.settlementVisibleCount(s, id);
      if (previous === undefined) delete s.dev[id]; else s.dev[id] = previous;
      return available;
    });
    p.provinceId = pid; p.homeSettlement = 0; p.travel = null;
    s.dev[pid] = 9; FB.ensurePopulationState(s);
    const q = FB.settlementFoundingEligibility(s, pid);
    const funded = FB.beginSettlementFounding(s, q);
    const before = FB.lifeHistory(s, p.charId).entries.filter(function (e) { return e.msg.key === 'news.biography.relocation'; }).length;
    s.turn += q.days;
    const completed = FB.settlementFoundingDay(s);
    const repeated = FB.completeSettlementFounding(s);
    const rows = FB.lifeHistory(s, p.charId).entries;
    const founding = rows.filter(function (e) { return e.msg.key === 'news.biography.relocation'; });
    const foundedPlace = FB.settlementsOf(s, pid)[q.settlement].name;
    // A separate played head stages a territorial capital boundary directly.
    const founder = s.chars[p.charId];
    const heir = FB.makeCharacter(s, { name:'Capital head', sex:'m', born:s.date.year - 25,
      dyn:founder.dyn, culture:founder.culture, religion:founder.religion, traitsN:0 });
    p.charId = heir.id; FB.lifeHistoryPlayed(s, heir); FB.touchFamily();
    p.tier = 4; p.provs = [pid]; p.prestige = 1000;
    s.owner[pid] = 'player'; s.holder[pid] = 'player'; FB.foundPlayerRealm(s);
    const destination = Object.keys(s.owner).filter(function (id) {
      return id !== pid && FB.world.byId[id] && !FB.world.byId[id].wasteland;
    })[0];
    p.provs.push(destination); s.owner[destination] = 'player'; s.holder[destination] = 'player';
    const preview = FB.capitalRelocationStatus(s, destination);
    const moved = FB.relocatePlayerCapital(s, destination);
    const again = FB.relocatePlayerCapital(s, destination);
    const capital = FB.lifeHistory(s, heir.id).entries.filter(function (e) { return e.msg.key === 'news.biography.relocation'; });
    return { ready:q.ready, funded:funded, before:before, completed:completed, repeated:repeated,
      founding:founding, foundedPlace:foundedPlace, preview:preview.ok, moved:moved, again:again,
      capital:capital, capitalPlace:FB.world.byId[destination].name };
  });
  expect(result).toMatchObject({ ready:true, funded:true, before:0, completed:true, repeated:false,
    preview:true, moved:true, again:false });
  expect(result.founding).toHaveLength(1);
  expect(result.founding[0].msg.params.place).toBe(result.foundedPlace);
  expect(result.capital).toHaveLength(1);
  expect(result.capital[0].msg.params.place).toBe(result.capitalPlace);
});
