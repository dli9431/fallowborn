'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/ambitions.js', 'data/actions.js', 'data/bookmarks.js', 'data/map_data.js',
  'data/counties.js', 'data/technology.js', 'css/style.css',
  'js/ambitions.js', 'js/actions.js', 'js/main.js', 'js/model.js', 'js/world.js',
  'js/modifiers.js', 'js/armies.js', 'js/save.js', 'js/ui_misc.js',
  'js/ui_modals.js', 'js/ui_panels.js', 'js/messages.js', 'js/i18n.js', 'js/keys.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

// This setup is local to historical ambitions; it does not widen shared journeys.
async function ruler(page, regions, tier) {
  await page.evaluate(function (args) {
    const s = FB.state, p = s.player;
    FB.game.setPaused(true);
    const counties = [];
    args.regions.forEach(function (region) {
      const ids = region.indexOf('d_') === 0 ? FB.duchyCounties(region) : FB.kingdomCounties(region);
      ids.forEach(function (id) { if (counties.indexOf(id) < 0) counties.push(id); });
    });
    p.tier = args.tier;
    p.provs = counties;
    p.provinceId = counties[0];
    p.liege = null;
    p.war = null;
    p.travel = null;
    p.dead = false;
    p.flags.in_prison = false;
    p.gold = 50000; p.prestige = 50000; p.piety = 50000;
    const c = s.chars[p.charId];
    c.culture = 'norse'; c.born = s.date.year - 30; c.dead = false;
    Object.keys(s.realms).forEach(function (id) { s.realms[id].war = null; });
    s.eventQueue = [];
    s.historicalAmbitions = {};
    delete s.historicalAmbitionSeason;
    FB.foundPlayerRealm(s);
    FB.invalidateRealmCache();
  }, { regions:regions, tier:tier || 4 });
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('deed opens relevant blocked cards without spending resources or evaluating while closed', async function ({ page }) {
  await ruler(page, ['d_normandy']);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 0;
    let playerChecks = 0;
    const original = FB.historicalAmbitionStatus;
    FB.historicalAmbitionStatus = function (state, id, rid) {
      if (!rid || rid === 'player') playerChecks++;
      return original(state, id, rid);
    };
    const before = { gold:s.player.gold, prestige:s.player.prestige, turn:s.turn };
    FB.ui.refresh();
    FB.historicalAmbitionsSeason(s);
    const closed = playerChecks;
    FB.runInstant(s, 'historical_ambitions');
    const opened = playerChecks;
    FB.ui.closeModal();
    FB.ui.refresh();
    FB.historicalAmbitionsSeason(s);
    const afterClosed = playerChecks;
    FB.historicalAmbitionStatus = original;
    FB.ui.showHistoricalAmbitions();
    return { before:before, after:{ gold:s.player.gold, prestige:s.player.prestige, turn:s.turn },
      closed:closed, opened:opened, afterClosed:afterClosed,
      catalogErrors:FB.validateActionData(),
      registered:FB.instants.filter(function (deed) { return deed.id === 'historical_ambitions'; }).length };
  });
  expect(result.catalogErrors).toEqual([]);
  expect(result.registered).toBe(1);
  expect(result.before).toEqual(result.after);
  expect(result.closed).toBe(0);
  expect(result.opened).toBe(1);
  expect(result.afterClosed).toBe(result.opened);
  await expect(page.locator('[data-ambition-card]')).toHaveCount(1);
  await expect(page.locator('[data-ambition-complete="normandy"]')).toBeDisabled();
  await expect(page.locator('[data-ambition-card="normandy"]')).toContainText('Recognition cost');
});

test('Normandy targets its own duchy, charges once, and returns from one success sheet', async function ({ page }) {
  await ruler(page, ['d_normandy', 'k_norway']);
  const before = await page.evaluate(function () {
    const s = FB.state;
    const quote = FB.historicalAmbitionStatus(s, 'normandy');
    FB.ui.showHistoricalAmbitions();
    return { cost:quote.cost, gold:s.player.gold, prestige:s.player.prestige,
      place:quote.elevation.titleData.place };
  });
  expect(before.place).toBe('Normandy');
  await page.locator('[data-ambition-complete="normandy"]').click();
  await expect(page.locator('#ambition-continue')).toBeVisible();
  const after = await page.evaluate(function () {
    const s = FB.state;
    return { tier:s.player.tier, gold:s.player.gold, prestige:s.player.prestige,
      title:FB.titleSnapshot(s).place, repeat:FB.completeHistoricalAmbition(s, 'normandy'),
      duplicate:s.eventQueue.filter(function (e) { return e.id === 'rank_elevation_result'; }).length };
  });
  expect(after.tier).toBe(5);
  expect(after.title).toBe('Normandy');
  expect(after.gold).toBe(before.gold - before.cost.gold);
  expect(after.prestige).toBe(before.prestige - before.cost.prestige + 150);
  expect(after.repeat).toBeNull();
  expect(after.duplicate).toBe(0);
  await expect.poll(function () {
    return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
  }).toBe(false);
  await page.locator('#ambition-continue').click();
  await expect(page.locator('[data-ambition-complete="normandy"]')).toBeDisabled();
  await expect(page.locator('[data-ambition-card="normandy"]')).toContainText('Completed');
});

test('all foundations use their geographic conditions and have no historical deadline', async function ({ page }) {
  await ruler(page, ['d_normandy', 'k_norway', 'k_england', 'k_sicily'], 7);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.date.year = 1400;
    const completed = FBDATA.historicalAmbitions.map(function (d) {
      const q = FB.historicalAmbitionStatus(s, d.id);
      const result = FB.completeHistoricalAmbition(s, d.id);
      return { id:d.id, ready:q.ready, cost:q.cost, prestige:result && result.prestige,
        duration:result && result.endTurn - result.turn };
    });
    return { completed:completed, tier:s.player.tier };
  });
  expect(result.tier).toBe(7);
  expect(result.completed.map(function (r) { return r.ready; })).toEqual([true, true, true, true]);
  expect(result.completed.map(function (r) { return r.prestige; })).toEqual([150, 250, 250, 200]);
  for (const row of result.completed) {
    expect(row.cost).toEqual({ gold:0, prestige:0, piety:0 });
    expect(row.duration).toBe(1800);
  }
});

for (const actor of ['player', 'ai']) {
  test('all foundation announcements preserve the completing ' + actor + ' character name', async function ({ page }) {
    await ruler(page, ['d_normandy', 'k_norway', 'k_england', 'k_sicily'], 7);
    const result = await page.evaluate(function (actor) {
      const s = FB.state;
      let rid = 'player';
      let founder;
      if (actor === 'player') {
        const c = s.chars[s.player.charId];
        c.name = 'Astrid'; c.byname = 'the Founder';
        founder = FB.fullName(c);
      } else {
        rid = Object.keys(s.realms).sort().filter(function (id) {
          return id !== 'player' && s.realms[id].alive && s.realms[id].ruler;
        })[0];
        const r = s.realms[rid];
        r.liege = null; r.rank = 1; r.ruler.culture = 'norse';
        r.ruler.name = 'Harald the Founder'; founder = r.ruler.name;
        s.player.provs.forEach(function (pid) { s.owner[pid] = rid; s.holder[pid] = rid; });
        FB.invalidateRealmCache();
      }
      const completions = FBDATA.historicalAmbitions.map(function (d) {
        return !!FB.completeHistoricalAmbition(s, d.id, rid);
      });
      const messages = s.log.filter(function (entry) {
        return entry.msg && /^news\.ambition\.(normandy|norway|england|sicily)$/.test(entry.msg.key);
      }).map(function (entry) { return JSON.parse(JSON.stringify(entry.msg)); });
      // Saved Chronicle descriptors must not resolve the successor or renamed realm.
      s.chars[s.player.charId].name = 'Successor';
      s.realms[rid].ruler.name = 'Another successor';
      s.realms[rid].name = 'Renamed realm';
      return { completions:completions, founder:founder,
        messages:messages.map(function (msg) { return FB.renderMessage(msg, { state:s }); }) };
    }, actor);
    expect(result.completions).toEqual([true, true, true, true]);
    expect(result.messages.sort()).toEqual([
      result.founder + ' establishes Normandy.',
      result.founder + ' unifies Norway.',
      result.founder + ' unites England.',
      result.founder + ' establishes the Sicilian crown.'
    ].sort());
  });
}

test('stale costs, war, culture, liege, and territorial requirements block without partial effects', async function ({ page }) {
  await ruler(page, ['d_normandy', 'k_norway', 'k_sicily']);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const failures = [];
    function blocked(id, change, undo) {
      change();
      const before = JSON.stringify({ gold:p.gold, prestige:p.prestige, tier:p.tier, records:s.historicalAmbitions });
      failures.push(FB.completeHistoricalAmbition(s, id) === null && before ===
        JSON.stringify({ gold:p.gold, prestige:p.prestige, tier:p.tier, records:s.historicalAmbitions }));
      undo();
    }
    blocked('normandy', function () { p.gold = 0; }, function () { p.gold = 50000; });
    blocked('normandy', function () { p.prestige = 500; }, function () { p.prestige = 50000; });
    blocked('normandy', function () { s.chars[p.charId].culture = 'frankish'; },
      function () { s.chars[p.charId].culture = 'norse'; });
    blocked('normandy', function () { p.war = { enemy:'west_francia' }; }, function () { p.war = null; });
    blocked('norway', function () { p.liege = 'west_francia'; }, function () { p.liege = null; });
    const rouen = s.holder.rouen;
    blocked('normandy', function () { s.holder.rouen = 'west_francia'; }, function () { s.holder.rouen = rouen; });
    const island = FB.duchyCounties('d_sicily');
    blocked('sicily', function () {
      island.forEach(function (pid) { s.holder[pid] = 'west_francia'; });
    }, function () { island.forEach(function (pid) { s.holder[pid] = 'player'; }); });
    return failures;
  });
  expect(result).toEqual([true, true, true, true, true, true, true]);
});

test('English message sources exist before completion for saved chronicles with stale catalogs', async function ({ page }) {
  const result = await page.evaluate(function () {
    return ['normandy', 'norway', 'england', 'sicily', 'tax_reward', 'levy_reward'].map(function (id) {
      const source = FB.englishMessage('news.ambition.' + id);
      return !!(source && source.text);
    });
  });
  expect(result).toEqual([true, true, true, true, true, true]);
});

test('Norway counts subordinate counties at the exact threshold but excludes a superior realm', async function ({ page }) {
  await ruler(page, ['k_norway'], 6);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const counties = FB.kingdomCounties('k_norway');
    const need = Math.ceil(counties.length * 0.75);
    const outsider = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege;
    })[0];
    s.realms.ambition_vassal = { id:'ambition_vassal', alive:true, rank:1, liege:'player' };
    p.provs = counties.slice(0, need - 1);
    counties.forEach(function (pid, i) {
      s.holder[pid] = i < need - 1 ? 'player' : outsider;
    });
    FB.invalidateRealmCache();
    const short = FB.historicalAmbitionStatus(s, 'norway');
    s.holder[counties[need - 1]] = 'ambition_vassal';
    FB.invalidateRealmCache();
    const exact = FB.historicalAmbitionStatus(s, 'norway');
    s.realms.ambition_vassal.liege = outsider;
    p.liege = outsider;
    const superior = FB.historicalAmbitionStatus(s, 'norway');
    return { short:short.ready, exact:exact.ready, have:exact.have, need:need,
      superiorHave:superior.have, superiorReady:superior.ready };
  });
  expect(result.short).toBe(false);
  expect(result.exact).toBe(true);
  expect(result.have).toBe(result.need);
  expect(result.superiorHave).toBe(result.need - 1);
  expect(result.superiorReady).toBe(false);
});

test('county rewards change actual tax and levy projections and survive rightful absorption', async function ({ page }) {
  await ruler(page, ['d_normandy', 'k_norway'], 6);
  const result = await page.evaluate(function () {
    const s = FB.state;
    const taxBefore = FB.playerTaxParts(s).total, levyBefore = FB.playerLevy(s);
    FB.completeHistoricalAmbition(s, 'normandy');
    FB.completeHistoricalAmbition(s, 'norway');
    const taxAfter = FB.playerTaxParts(s).total, levyAfter = FB.playerLevy(s);
    const levyEntries = FB.playerCompositionBreakdown(s).entries.filter(function (entry) {
      return entry.kind === 'historical_ambition' && entry.amount > 0;
    }).length;
    const end = s.historicalAmbitions.normandy.endTurn;
    s.historicalAmbitions.normandy.realmId = 'inherited_probe';
    s.realms.inherited_probe = { id:'inherited_probe', alive:true, rank:2, liege:null };
    FB.historicalAmbitionRealmInherited(s, 'inherited_probe', 'player');
    FB.markRealmDead(s, 'inherited_probe');
    return { taxBefore:taxBefore, taxAfter:taxAfter, levyBefore:levyBefore, levyAfter:levyAfter, levyEntries:levyEntries,
      endUnchanged:s.historicalAmbitions.normandy.endTurn === end,
      inheritedBonus:FB.historicalAmbitionBonus(s, 'rouen', 'tax') };
  });
  expect(result.taxAfter).toBeGreaterThan(result.taxBefore);
  expect(result.levyAfter).toBeGreaterThanOrEqual(result.levyBefore);
  expect(result.levyEntries).toBeGreaterThan(0);
  expect(result.endUnchanged).toBe(true);
  expect(result.inheritedBonus).toBe(0.1);
});

test('regional rewards survive saves and succession, exclude lost land, and expire exactly', async function ({ page }) {
  await ruler(page, ['d_normandy', 'k_norway'], 6);
  const result = await page.evaluate(function () {
    let s = FB.state;
    FB.completeHistoricalAmbition(s, 'normandy');
    const completed = FB.completeHistoricalAmbition(s, 'norway');
    const county = FB.kingdomCounties('k_norway')[0];
    const baseline = FB.modBonus(s, 'levy', county);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    s = FB.state;
    const saved = FB.historicalAmbitionBonus(s, county, 'levy');
    s.realms.player.ruler.generation++;
    const successor = FB.historicalAmbitionBonus(s, county, 'levy');
    s.holder[county] = 'west_francia';
    const lost = FB.historicalAmbitionBonus(s, county, 'levy');
    s.holder[county] = 'player';
    const recovered = FB.historicalAmbitionBonus(s, county, 'levy');
    const outside = FB.historicalAmbitionBonus(s, 'rouen', 'levy');
    s.turn = completed.endTurn - 1;
    const lastDay = FB.historicalAmbitionBonus(s, county, 'levy');
    s.turn++;
    const expired = FB.historicalAmbitionBonus(s, county, 'levy');
    return { baseline:baseline, saved:saved, successor:successor, lost:lost,
      recovered:recovered, outside:outside, lastDay:lastDay, expired:expired,
      repeat:FB.completeHistoricalAmbition(s, 'norway') };
  });
  expect(result.baseline).toBeGreaterThanOrEqual(0.1);
  expect(result.saved).toBe(0.1);
  expect(result.successor).toBe(0.1);
  expect(result.lost).toBe(0);
  expect(result.recovered).toBe(0.1);
  expect(result.outside).toBe(0);
  expect(result.lastDay).toBe(0.1);
  expect(result.expired).toBe(0);
  expect(result.repeat).toBeNull();
});

test('later-bookmark defaults and realm dissolution cannot replay a foundation', async function ({ page }) {
  await ruler(page, ['d_normandy'], 5);
  const result = await page.evaluate(function () {
    const s = FB.state;
    FB.completeHistoricalAmbition(s, 'normandy');
    FB.markRealmDead(s, 'player');
    s.realms.player.alive = true;
    const revivedBonus = FB.historicalAmbitionBonus(s, 'rouen', 'tax');
    const repeat = FB.completeHistoricalAmbition(s, 'normandy');
    delete s.historicalAmbitions;
    s.start.id = '1066';
    FB.ensureHistoricalAmbitions(s);
    return { revivedBonus:revivedBonus, repeat:repeat,
      established:Object.keys(s.historicalAmbitions).sort(),
      sicily:FB.historicalAmbitionStatus(s, 'sicily').completed };
  });
  expect(result.revivedBonus).toBe(0);
  expect(result.repeat).toBeNull();
  expect(result.established).toEqual(['england', 'normandy', 'norway']);
  expect(result.sicily).toBeNull();
});

test('seasonal AI completes once without opening UI and increases ordinary muster capacity', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const rid = Object.keys(s.realms).sort().filter(function (id) {
      return s.realms[id].alive && !s.realms[id].liege && id !== 'player';
    })[0];
    Object.keys(s.realms).forEach(function (id) { s.realms[id].war = null; });
    s.player.war = null;
    FB.kingdomCounties('k_norway').forEach(function (pid) {
      s.owner[pid] = rid; s.holder[pid] = rid;
    });
    FB.invalidateRealmCache();
    const before = FB.aiBaseHost(s, rid);
    const rng = FB.getRngState();
    FB.historicalAmbitionsSeason(s);
    const after = FB.aiBaseHost(s, rid);
    const saved = JSON.stringify(s.historicalAmbitions);
    FB.historicalAmbitionsSeason(s);
    return { before:before, after:after, founder:s.historicalAmbitions.norway.realmId,
      rngUnchanged:rng === FB.getRngState(), expected:rid, same:saved === JSON.stringify(s.historicalAmbitions),
      modal:document.getElementById('genmodal').classList.contains('hidden') };
  });
  expect(result.founder).toBe(result.expected);
  expect(result.after).toBeGreaterThan(result.before);
  expect(result.same).toBe(true);
  expect(result.rngUnchanged).toBe(true);
  expect(result.modal).toBe(true);
});

test('compact cards and success Back preserve a nonzero list position and focus', async function ({ page }) {
  await page.setViewportSize({ width:360, height:640 });
  await ruler(page, ['d_normandy', 'k_norway', 'k_england', 'k_sicily'], 7);
  await page.evaluate(function () { FB.ui.showHistoricalAmbitions(); });
  const action = page.locator('[data-ambition-complete="sicily"]');
  await action.scrollIntoViewIfNeeded();
  const before = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
  expect(before).toBeGreaterThan(0);
  await action.click();
  await expect(page.locator('#ambition-continue')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-ambition-card="sicily"]')).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBeGreaterThan(0);
  expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollWidth <= el.clientWidth; })).toBe(true);
  await expect(page.locator('[data-ambition-complete="sicily"]')).toBeDisabled();
});
