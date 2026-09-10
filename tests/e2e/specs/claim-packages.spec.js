'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/wars.js', 'js/world.js', 'js/actions.js',
  'js/fortifications.js', 'js/mapview.js', 'js/ui_wars.js', 'js/ui_modals.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function claimSetup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  return page.evaluate(function (ids) {
    const s = FB.state;
    FB.realmWars(s, 'player').forEach(function (w) { FB.settleOrdinaryWar(s, w.id, 'invalid'); });
    s.truces = {};
    const frontier = FB.realmTerritory(s, 'player');
    const border = Object.keys(FB.world.adj[ids.home]).filter(function (pid) {
      return !FB.world.byId[pid].wasteland && s.player.provs.indexOf(pid) < 0;
    }).sort();
    let first, second;
    for (const pid of border) {
      const beyond = Object.keys(FB.world.adj[pid]).filter(function (nb) {
        return !FB.world.byId[nb].wasteland && frontier.indexOf(nb) < 0 && nb !== pid &&
          !frontier.some(function (home) { return !!(FB.world.adj[home] || {})[nb]; });
      }).sort()[0];
      if (beyond) { first = pid; second = beyond; break; }
    }
    if (!second) throw new Error('Claim fixture needs a county beyond the player frontier.');
    ids.targets = [first, second];
    ids.targets.forEach(function (pid) {
      s.owner[pid] = ids.enemy; s.holder[pid] = ids.enemy;
      s.buildings[pid] = []; s.dev[pid] = 1;
    });
    FB.invalidateRealmCache(); FB.invalidateFortIndex();
    ids.targets.forEach(function (pid) { FB.saveFabricatedClaim(s, pid); });
    ids.causes = ids.targets.map(function (pid) { return { type:'fabricated', target:pid, enemy:ids.enemy }; });
    return ids;
  }, ids);
}

test('connected lawful claims combine while aggression and duplicate objectives cannot', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, rng = FB.getRngState(), before = JSON.stringify(s);
    const legal = FB.warDeclarationPreview(s, 'player', ids.causes).valid;
    const aggression = ids.causes.map(function (c) { return Object.assign({}, c, { type:'aggression' }); });
    const unjust = FB.warDeclarationPreview(s, 'player', aggression).valid;
    const duplicate = FB.warDeclarationPreview(s, 'player', [ids.causes[0], ids.causes[0]]).valid;
    return { legal:legal, unjust:unjust, duplicate:duplicate, readonly:before === JSON.stringify(s), rngSame:rng === FB.getRngState() };
  }, ids);
  expect(result).toEqual({ legal:true, unjust:false, duplicate:false, readonly:true, rngSame:true });
});

test('claim packages inspect only defender territory and compute each county right once', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    const expected = Object.keys(FB.world.byId).sort().filter(function (pid) {
      return FB.warTargetDefender(s, 'player', pid) === ids.enemy;
    }).map(function (pid) {
      return { target:pid, enemy:ids.enemy, justifications:FB.territorialWarRights(s, 'player', pid) };
    }).filter(function (entry) { return entry.justifications.length; });
    const before = JSON.stringify(s), rng = FB.getRngState();
    const keys = Object.keys, rights = FB.territorialWarRights, calls = {};
    let worldScans = 0, actual;
    Object.keys = function (o) { if (o === FB.world.byId) worldScans++; return keys(o); };
    FB.territorialWarRights = function (state, rid, pid) {
      calls[pid] = (calls[pid] || 0) + 1;
      return rights(state, rid, pid);
    };
    try { actual = FB.claimPackageCandidates(s, 'player', ids.enemy); }
    finally { Object.keys = keys; FB.territorialWarRights = rights; }
    return { actual:actual, expected:expected, worldScans:worldScans,
      singleReads:Object.keys(calls).every(function (pid) { return calls[pid] === 1; }),
      readonly:before === JSON.stringify(s), rngSame:rng === FB.getRngState() };
  }, ids);
  expect(result.actual).toEqual(result.expected);
  expect(result.actual).toHaveLength(2);
  expect(result.worldScans).toBe(0);
  expect(result.singleReads).toBe(true);
  expect(result.readonly).toBe(true);
  expect(result.rngSame).toBe(true);
});

test('partial occupation grants no land and completing the package transfers both counties', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    const started = FB.startClaimPackageWar(s, ids.causes);
    const w = FB.realmWars(s, 'player')[0];
    w.occupations[ids.targets[0]] = { occupied:true, progress:0 };
    const partial = ids.targets.every(function (pid) { return s.owner[pid] === ids.enemy; });
    w.occupations[ids.targets[1]] = { occupied:true, progress:0 };
    FB.withOrdinaryWar(s, w.id, function () { FB.warCapture(s); });
    return { started:started, partial:partial, awarded:ids.targets.every(function (pid) { return s.holder[pid] === 'player'; }),
      ended:!FB.ordinaryWarById(s, w.id), claims:FB.fabricatedClaimsOf(s).length };
  }, ids);
  expect(result).toEqual({ started:true, partial:true, awarded:true, ended:true, claims:0 });
});

test('existing target list highlights compatible claims and retains checks through review', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarTargets(); });
  function card(pid) { return page.locator('.war-target-card').filter({ has:page.locator('[data-war-cause-target="' + pid + '"]') }); }
  const first = card(ids.targets[0]), second = card(ids.targets[1]);
  const labels = await page.locator('[data-war-claim-status]').allTextContents();
  expect(labels.every(function (label) { return label === 'Single' || label === 'Multi'; })).toBe(true);
  await first.locator('[data-war-claim]').focus();
  await page.keyboard.press('Space');
  await expect(first.locator('[data-war-claim]')).toBeChecked();
  await expect(second).toHaveClass(/claim-compatible/);
  await expect(second.locator('[data-war-claim-status]')).toHaveText('Multi');
  await second.locator('[data-war-claim]').check();
  await page.locator('#war-claims-review').click();
  await expect(page.locator('[data-war-justification-panel]:visible')).toHaveCount(2);
  await expect(page.locator('[data-claim-package]')).toHaveCount(0);
  await page.locator('#war-justification-back').click();
  await expect(first.locator('[data-war-claim]')).toBeChecked();
  await expect(second.locator('[data-war-claim]')).toBeChecked();
  await first.locator('[data-war-claim]').uncheck();
  await expect(first).toHaveClass(/claim-compatible/);
});

test('list and map share the package and declare it through the existing review', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarTargets(); });
  const first = page.locator('.war-target-card').filter({ has:page.locator('[data-war-cause-target="' + ids.targets[0] + '"]') });
  await first.locator('[data-war-claim]').check();
  await page.locator('#war-pick-map').click();
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, ids.targets[1]);
  await expect(page.locator('#war-map-claim')).toHaveCount(0);
  expect(await page.evaluate(function () { return FB.map.warClaimSelected.length; })).toBe(2);
  await page.locator('#war-picker-list').click();
  await expect(page.locator('[data-war-claim]:checked')).toHaveCount(2);
  await page.locator('#war-claims-review').click();
  await page.locator('#war-justification-confirm').click();
  const goals = await page.evaluate(function () { return FB.realmWars(FB.state, 'player')[0].objectives.map(function (o) { return o.target; }).sort(); });
  expect(goals).toEqual(ids.targets.slice().sort());
});

test('map county clicks add multiple claims and clicking again removes their highlights', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarTargets(); });
  await page.locator('#war-pick-map').click();
  await expect(page.locator('#war-picker-review')).toBeDisabled();
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, ids.targets[0]);
  expect(await page.evaluate(function () { return FB.map.warClaimSelected; })).toEqual([ids.targets[0]]);
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, ids.targets[1]);
  expect(await page.evaluate(function () { return FB.map.warClaimSelected; })).toEqual(ids.targets);
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, ids.targets[1]);
  const remaining = await page.evaluate(function (pid) {
    return { selected:FB.map.warClaimSelected, cursor:FB.map.warSelected,
      highlighted:FB.map.focusMembers[FB.world.provs.findIndex(function (p) { return p.id === pid; })] };
  }, ids.targets[1]);
  expect(remaining).toEqual({ selected:[ids.targets[0]], cursor:ids.targets[0], highlighted:false });
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, ids.targets[0]);
  expect(await page.evaluate(function () { return [FB.map.warClaimSelected, FB.map.warSelected, FB.map.selected]; })).toEqual([[], null, null]);
  await expect(page.locator('#war-picker-review')).toBeDisabled();
  await page.locator('#war-picker-list').click();
  await expect(page.locator('[data-war-claim]:checked')).toHaveCount(0);
});

test('a claim beyond the current frontier is available through its connecting claim and centers the map', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  const catalogue = await page.evaluate(function (ids) {
    const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
    const beyond = FB.warCauses(s, true, true).some(function (c) { return c.target === ids.targets[1]; });
    const alone = FB.warDeclarationPreview(s, 'player', [ids.causes[1]]).valid;
    return { beyond:beyond, alone:alone, readonly:before === JSON.stringify(s), rngSame:rng === FB.getRngState() };
  }, ids);
  expect(catalogue).toEqual({ beyond:true, alone:false, readonly:true, rngSame:true });
  await page.evaluate(function (ids) { FB.ui.showWarTargets(ids.enemy); }, ids);
  const first = page.locator('.war-target-card').filter({ has:page.locator('[data-war-cause-target="' + ids.targets[0] + '"]') });
  const second = page.locator('.war-target-card').filter({ has:page.locator('[data-war-cause-target="' + ids.targets[1] + '"]') });
  await expect(second.locator('[data-war-claim]')).toBeDisabled();
  await first.locator('[data-war-claim]').check();
  await expect(second.locator('[data-war-claim]')).toBeEnabled();
  await page.evaluate(function () {
    const center = FB.map.centerOn;
    window.claimPickerCenter = null;
    FB.map.centerOn = function (pid, zoom) { window.claimPickerCenter = pid; return center.call(FB.map, pid, zoom); };
  });
  await page.locator('#war-pick-map').click();
  expect(await page.evaluate(function () { return window.claimPickerCenter; })).toBe(ids.targets[0]);
  const picked = await page.evaluate(function (pid) {
    return { available:FB.map.warTargets.indexOf(pid) >= 0, picked:FB.ui.warPickProvince(pid), selected:FB.map.warClaimSelected.slice() };
  }, ids.targets[1]);
  expect(picked).toEqual({ available:true, picked:true, selected:ids.targets });
});

test('a checked claim leaves other opponents outside the package', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  await page.evaluate(function (ids) {
    const s = FB.state;
    // A remote capital is not necessarily reachable. Give the other opponent
    // an independent frontier claim, outside the first opponent's package.
    const pid = FB.realmTerritory(s, 'player').flatMap(function (home) {
      return Object.keys(FB.world.adj[home] || {});
    }).filter(function (pid) {
      return !FB.world.byId[pid].wasteland && ids.targets.indexOf(pid) < 0 &&
        FB.realmTerritory(s, 'player').indexOf(pid) < 0;
    }).sort()[0];
    if (!pid) throw new Error('Claim fixture needs a separate frontier county.');
    s.owner[pid] = ids.other; s.holder[pid] = ids.other;
    FB.invalidateRealmCache();
    FB.saveFabricatedClaim(s, pid);
    FB.ui.showWarTargets();
  }, ids);
  const first = page.locator('.war-target-card').filter({ has:page.locator('[data-war-cause-target="' + ids.targets[0] + '"]') });
  await first.locator('[data-war-claim]').check();
  const others = page.locator('.war-target-card').filter({ has:page.locator('[data-war-target-realm="' + ids.other + '"]') });
  expect(await others.count()).toBeGreaterThan(0);
  for (const card of await others.all()) {
    await expect(card).not.toHaveClass(/claim-compatible/);
    await expect(card.locator('[data-war-claim]')).toBeDisabled();
  }
});

test('an isolated lawful claim hides its package controls while connected claims show Multi', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarTargets(); });
  function card(pid) { return page.locator('.war-target-card').filter({ has:page.locator('[data-war-cause-target="' + pid + '"]') }); }
  await expect(card(ids.targets[0]).locator('[data-war-claim-status]')).toHaveText('Multi');
  await expect(card(ids.targets[1]).locator('[data-war-claim-status]')).toHaveText('Multi');
  await page.evaluate(function (ids) {
    const s = FB.state;
    // The adjoining county still has a claim, but its different defender prevents bundling.
    s.owner[ids.targets[1]] = ids.other; s.holder[ids.targets[1]] = ids.other;
    FB.invalidateRealmCache();
    FB.ui.closeModal(); FB.ui.showWarTargets();
  }, ids);
  await expect(card(ids.targets[0]).locator('[data-war-claim-status]')).toBeHidden();
  await expect(card(ids.targets[0]).locator('[data-war-claim]')).toBeHidden();
  await expect(card(ids.targets[0]).locator('[data-war-cause]')).toBeEnabled();
});

test('multiple-claim filters and sorting use available packages and retain selection', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarTargets(); });
  await page.locator('#war-target-filters summary').click();
  const multi = page.locator('.war-target-card:not(.single-target):visible');
  const singles = page.locator('.war-target-card.single-target:visible');
  expect(await singles.count()).toBeGreaterThan(0);
  await page.locator('#war-target-package').selectOption('multi');
  await expect(multi).toHaveCount(2);
  await expect(singles).toHaveCount(0);
  const first = page.locator('.war-target-card').filter({ has:page.locator('[data-war-cause-target="' + ids.targets[0] + '"]') });
  await first.locator('[data-war-claim]').check();
  await page.locator('#war-target-package').selectOption('single');
  await expect(multi).toHaveCount(0);
  expect(await singles.count()).toBeGreaterThan(0);
  await expect(page.locator('.single-target [data-war-claim]:visible')).toHaveCount(0);
  await expect(page.locator('.single-target [data-war-claim-status]:visible')).toHaveCount(0);
  await page.locator('#war-target-package').selectOption('all');
  await page.locator('#war-target-sort').selectOption('multi');
  const firstTwo = await page.locator('.war-target-card:visible').evaluateAll(function (cards) {
    return cards.slice(0, 2).map(function (card) { return card.querySelector('[data-war-cause-target]').dataset.warCauseTarget; }).sort();
  });
  expect(firstTwo).toEqual(ids.targets.slice().sort());
  await expect(first.locator('[data-war-claim]')).toBeChecked();
});

test('map links join compatible claims and disappear when the defender changes', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarTargets(); });
  await page.locator('#war-pick-map').click();
  const links = await page.evaluate(function () { return FB.map.warClaimLinks; });
  expect(links).toContainEqual(ids.targets.slice().sort());
  await page.locator('#war-picker-list').click();
  await page.evaluate(function (ids) {
    FB.state.owner[ids.targets[1]] = ids.other; FB.state.holder[ids.targets[1]] = ids.other;
    FB.invalidateRealmCache(); FB.ui.closeModal(); FB.ui.showWarTargets();
  }, ids);
  await page.locator('#war-pick-map').click();
  expect(await page.evaluate(function () { return FB.map.warClaimLinks; })).toEqual([]);
});

test('clicking another map target replaces the package and compatible clicks still add', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  const alternate = await page.evaluate(function (ids) {
    const s = FB.state;
    const cause = FB.warCauses(s, false, true).filter(function (c) {
      return c.type === 'aggression' && c.enemy !== ids.enemy && FB.warDeclarationPreview(s, 'player', [c]).valid;
    })[0];
    if (!cause) throw new Error('Fixture needs a separate available border target.');
    FB.saveFabricatedClaim(s, cause.target);
    FB.ui.showWarTargets();
    return cause.target;
  }, ids);
  await page.locator('#war-pick-map').click();
  await page.evaluate(function (ids) { FB.ui.warPickProvince(ids.targets[0]); FB.ui.warPickProvince(ids.targets[1]); }, ids);
  expect(await page.evaluate(function () { return FB.map.warClaimSelected; })).toEqual(ids.targets);
  expect(await page.evaluate(function (pid) { return FB.map.warTargets.indexOf(pid) >= 0; }, alternate)).toBe(true);
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, alternate);
  expect(await page.evaluate(function () { return FB.map.warClaimSelected; })).toEqual([alternate]);
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, ids.targets[0]);
  expect(await page.evaluate(function () { return FB.map.warClaimSelected; })).toEqual([ids.targets[0]]);
  await page.evaluate(function (pid) { FB.ui.warPickProvince(pid); }, ids.targets[1]);
  expect(await page.evaluate(function () { return FB.map.warClaimSelected; })).toEqual(ids.targets);
  await page.locator('#war-picker-list').click();
  await expect(page.locator('[data-war-claim]:checked')).toHaveCount(2);
});

test('real siege pulses occupy and recapture a claim without transferring ownership', async function ({ page }, testInfo) {
  const ids = await claimSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.startClaimPackageWar(s, ids.causes);
    const w = FB.realmWars(s, 'player')[0], pid = ids.targets[0];
    const host = FB.playerHost(s);
    host.at = pid; host.path = []; host.moveLeft = 0;
    host.men = host.size = 100000; host.units = { levy:100000 };
    FB.assignHostCampaign(s, host.id, w.id);
    for (let i = 0; i < 16 && !(w.occupations[pid] && w.occupations[pid].occupied); i++) {
      s.turn += 90; FB.advanceOrdinaryObjectives(s, w.id);
    }
    const occupied = !!w.occupations[pid].occupied;
    const blocked = FB.recruitmentCountyBlocked(s, ids.enemy, pid, []);
    host.at = ids.home;
    s.armies.push({ id:'recapture-host', realm:ids.enemy, warId:w.id, at:pid,
      from:pid, path:[], moveLeft:0, men:100000, size:100000, units:{ levy:100000 } });
    for (let i = 0; i < 16 && w.occupations[pid].occupied; i++) {
      s.turn += 90; FB.advanceOrdinaryObjectives(s, w.id);
    }
    return { occupied:occupied, blocked:blocked, recaptured:!w.occupations[pid].occupied,
      unchanged:s.owner[pid] === ids.enemy, active:!!FB.ordinaryWarById(s, w.id) };
  }, ids);
  expect(result).toEqual({ occupied:true, blocked:true, recaptured:true, unchanged:true, active:true });
});
