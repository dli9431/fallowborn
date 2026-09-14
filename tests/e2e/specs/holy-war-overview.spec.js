'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/ui_modals.js', 'js/ui_panels.js', 'js/ui_misc.js',
  'js/holywar.js', 'js/fortifications.js', 'js/mapview.js', 'js/world.js', 'js/model.js', 'js/i18n.js', 'js/messages.js', 'js/util.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('campaign activity shows live battles and sieges and links to their counties', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const fixture = await page.evaluate(function () {
    const s = FB.state;
    const ids = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege;
    }).slice(0, 5);
    const counties = ids.map(function (id) { return s.realms[id].capital; });
    const c = s.greatHolyWar = { id:'activity', phase:'active', callingReligion:'catholic',
      callerRealm:ids[0], leaderRealm:ids[0], targetKingdom:'syria', contribution:{},
      participants:{ attackers:[{ realm:ids[0], sovereign:true }],
        defenders:[{ realm:ids[1], sovereign:true, mandatory:true }] },
      objectiveCounties:counties.slice(1), occupations:{} };
    c.occupations[counties[1]] = { occupied:false, progressCamp:'attackers', fortLevel:0 };
    c.occupations[counties[1]].progress = FB.greatHolyWarSiegeRequirement(s, counties[1]) / 2;
    c.occupations[counties[2]] = { occupied:false, progress:0, fortLevel:4 };
    c.occupations[counties[3]] = { occupied:true, progress:0, fortLevel:0 };
    s.armies = [
      { id:'battle-a', realm:ids[0], at:counties[0], men:1000, warId:'holy' },
      { id:'battle-d', realm:ids[1], at:counties[0], men:1000, warId:'holy' },
      { id:'siege', realm:ids[0], at:counties[1], men:1000, warId:'holy' },
      { id:'stalled', realm:ids[0], at:counties[2], men:1, warId:'holy' },
      { id:'occupied', realm:ids[0], at:counties[3], men:1000, warId:'holy' },
      { id:'unrelated', realm:ids[0], at:counties[4], men:1000, warId:'ordinary' }
    ];
    const before = JSON.stringify(s);
    FB.ui.showHolyWarOverview();
    return { counties:counties, unchanged:before === JSON.stringify(s) };
  });
  expect(fixture.unchanged).toBe(true);
  const links = page.locator('[data-holy-war-county]');
  await expect(links).toHaveCount(4);
  await expect(page.locator('[data-holy-war-county="' + fixture.counties[0] + '"]')).toHaveCount(2);
  const siege = page.locator('[data-holy-war-county="' + fixture.counties[1] + '"]');
  await expect(siege).toContainText('(50%)');
  await expect(page.locator('[data-holy-war-county="' + fixture.counties[2] + '"]')).toContainText('Siege stalled');
  await expect(page.locator('[data-holy-war-county="' + fixture.counties[3] + '"]')).toHaveCount(0);
  await expect(page.locator('[data-holy-war-county="' + fixture.counties[4] + '"]')).toHaveCount(0);
  await siege.focus();
  await siege.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return FB.map.selected; })).toBe(fixture.counties[1]);
});

test('ruler holy-war card summarizes coalitions without the expanded opponent list', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const fixture = await page.evaluate(function () {
    const s = FB.state;
    const ids = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege;
    }).slice(0, 5);
    s.greatHolyWar = { id:'ruler-overview', callingReligion:'catholic', targetKingdom:'syria',
      callerRealm:ids[0], leaderRealm:ids[1], phase:'active', contribution:{},
      objectiveCounties:[], participants:{
        attackers:ids.slice(0, 2).map(function (id) { return { realm:id, sovereign:true }; }),
        defenders:ids.slice(2, 4).map(function (id) { return { realm:id, sovereign:true, mandatory:true }; })
      } };
    s.armies = [
      { id:'caller', realm:ids[0], men:1000, warId:'holy' },
      { id:'split', realm:ids[0], men:500, warId:'holy' },
      { id:'ally', realm:ids[1], men:2000, warId:'holy' },
      { id:'defender', realm:ids[2], men:4000, warId:'holy' },
      { id:'defender-ally', realm:ids[3], men:500, warId:'holy' },
      { id:'other-war', realm:ids[0], men:9000, warId:'unrelated' }
    ];
    const ordinary = FB.registerOrdinaryWar(s, ids[0], {
      enemy:ids[4], target:s.realms[ids[4]].capital, casus:{ type:'aggression' }
    });
    FB.ui.showLiegeModal(ids[0]);
    return { attacker:s.realms[ids[0]].name, defender:s.realms[ids[2]].name,
      ordinary:ordinary.id, county:s.realms[ids[0]].capital };
  });
  await expect(page.locator('[data-current-war]')).toHaveCount(0);
  const card = page.locator('[data-character-holy-war]');
  await expect(card).toContainText('Crusade');
  await expect(card).toContainText(fixture.attacker + ' + 1 other realm (3500 men in the field)');
  await expect(card).toContainText(fixture.defender + ' + 1 other realm (4500 men in the field)');
  await expect(card).not.toContainText('9000');
  await expect(page.locator('[data-war-campaign="' + fixture.ordinary + '"]')).toBeVisible();
  await card.getByRole('button', { name:'View all combatants', exact:true }).click();
  await expect(page.locator('[data-holy-war-participant]')).toHaveCount(4);
  await page.locator('#gm-body').getByRole('button', { name:'Back', exact:true }).click();
  await expect(card).toBeVisible();
  const rulerSummary = await card.textContent();
  await page.evaluate(function (county) {
    FB.ui.closeModal();
    FB.ui.selectProvince(county);
  }, fixture.county);
  await expect(page.locator('.land-current-war')).toHaveCount(0);
  await expect(page.locator('#county-holy-war-overview')).toHaveCount(0);
  const landCard = page.locator('[data-character-holy-war]:visible');
  await expect(landCard).toHaveCount(1);
  // Modal action hotkeys are deliberately absent from retained Land buttons.
  await expect(landCard).toContainText(fixture.attacker + ' + 1 other realm (3500 men in the field)');
  await expect(landCard).toContainText(fixture.defender + ' + 1 other realm (4500 men in the field)');
  expect(rulerSummary).toContain('Contest control of');
  await expect(page.locator('[data-holy-war-overview-link]:visible')).toHaveCount(1);
  await landCard.getByRole('button', { name:'View all combatants', exact:true }).click();
  await expect(page.locator('[data-holy-war-participant]')).toHaveCount(4);
});

test('holy-war overview lists both full coalitions and sums campaign detachments only', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.setViewportSize({ width:1366, height:768 });
  const result = await page.evaluate(function () {
    const s = FB.state;
    const participants = { attackers:[], defenders:[] };
    ['attackers', 'defenders'].forEach(function (side) {
      for (let i = 0; i < 40; i++) {
        const id = 'overview_' + side + '_' + i;
        s.realms[id] = { id:id, name:side + ' Realm ' + i, alive:true };
        participants[side].push({ realm:id, sovereign:i !== 23, mandatory:side === 'defenders' });
      }
    });
    const leader = participants.attackers[10].realm;
    s.greatHolyWar = { id:'overview', callingReligion:'catholic', targetKingdom:'syria',
      callerRealm:participants.attackers[0].realm, leaderRealm:leader,
      phase:'active', participants:participants, contribution:{} };
    s.greatHolyWar.contribution[leader] = 42.5;
    s.armies = [
      { id:'one', realm:leader, men:2000, warId:'holy' },
      { id:'split', realm:leader, men:1000, warId:'holy' },
      { id:'rival', realm:participants.attackers[2].realm, men:2500, warId:'holy' },
      { id:'defender', realm:participants.defenders[2].realm, men:750, warId:'holy' },
      { id:'ordinary', realm:leader, men:9000, warId:'ordinary' },
      { id:'rebel', realm:leader, men:8000, warId:'holy', rebellionId:'rebel' },
      { id:'legacy', realm:participants.defenders[0].realm, men:500 }
    ];
    const before = JSON.stringify(s);
    FB.ui.showHolyWarOverview();
    return { leader:leader, unchanged:before === JSON.stringify(s) };
  });
  expect(result.unchanged).toBe(true);
  await expect(page.locator('#gm-title')).toContainText('Crusade');
  const attackers = page.locator('[data-holy-war-side="attackers"]');
  const defenders = page.locator('[data-holy-war-side="defenders"]');
  await expect(attackers.locator('[data-holy-war-participant]')).toHaveCount(40);
  await expect(defenders.locator('[data-holy-war-participant]')).toHaveCount(40);
  await expect(attackers.locator('[data-holy-war-participant]').first()).toHaveAttribute('data-holy-war-participant', 'overview_attackers_0');
  await expect(defenders.locator('[data-holy-war-participant]').first()).toHaveAttribute('data-holy-war-participant', 'overview_defenders_0');
  const sortButton = page.locator('#holy-war-sort');
  await expect(sortButton).toHaveAttribute('data-sort', 'name');
  await expect(sortButton).toHaveText('A↓');
  await sortButton.focus();
  await sortButton.press('Enter');
  await expect(sortButton).toBeFocused();
  await expect(sortButton).toHaveAttribute('data-sort', 'size');
  await expect(sortButton).toHaveText('9↓');
  await expect(attackers.locator('[data-holy-war-participant]').first()).toHaveAttribute('data-holy-war-participant', result.leader);
  await expect(attackers.locator('[data-holy-war-participant]').nth(1)).toHaveAttribute('data-holy-war-participant', 'overview_attackers_2');
  await expect(defenders.locator('[data-holy-war-participant]').first()).toHaveAttribute('data-holy-war-participant', 'overview_defenders_2');
  await expect(defenders.locator('[data-holy-war-participant]').nth(1)).toHaveAttribute('data-holy-war-participant', 'overview_defenders_0');
  await expect(defenders.locator('[data-holy-war-participant]').nth(2)).toHaveAttribute('data-holy-war-participant', 'overview_defenders_1');
  const leaderRow = page.locator('[data-holy-war-participant="' + result.leader + '"]');
  await expect(leaderRow).toContainText('3000');
  await expect(leaderRow).toContainText('42.5');
  await expect(leaderRow).not.toContainText('9000');
  await expect(defenders).toContainText('500');
  await expect(attackers).toContainText('Expedition service');
  await expect(page.locator('[data-holy-war-overview]')).toContainText('Each realm commands its own host');
  await expect(page.locator('.holy-war-name canvas.crest')).toHaveCount(80);
  await expect(leaderRow.locator('.hidden')).toBeHidden();
  const desktop = await page.locator('#gm-body').evaluate(function (body) {
    const card = body.closest('.modalcard');
    return { bodyFits:body.scrollHeight <= body.clientHeight + 1,
      cardFits:card.scrollHeight <= card.clientHeight + 1,
      screenFits:card.getBoundingClientRect().bottom <= window.innerHeight };
  });
  expect(desktop).toEqual({ bodyFits:true, cardFits:true, screenFits:true });
  await leaderRow.locator('button').hover();
  await expect(page.locator('#tooltip')).toBeVisible();
  await expect(page.locator('#tooltip')).toContainText('3000');
  await expect(page.locator('#tooltip')).toContainText('42.5');
  // A wide desktop leaves room outside the modal: the tooltip must still follow
  // the combatant rather than the modal's left edge.
  await page.setViewportSize({ width:1920, height:1080 });
  await leaderRow.locator('button').hover();
  const nameBox = await leaderRow.locator('button').boundingBox();
  const tipBox = await page.locator('#tooltip').boundingBox();
  expect(Math.abs(tipBox.x - (nameBox.x + nameBox.width + 10))).toBeLessThan(2);
  expect(Math.abs(tipBox.y - nameBox.y)).toBeLessThan(2);
  await page.setViewportSize({ width:1366, height:768 });
  const edgeName = defenders.locator('.holy-war-name').nth(2);
  await edgeName.hover();
  const edgeBox = await edgeName.boundingBox();
  const flippedBox = await page.locator('#tooltip').boundingBox();
  expect(Math.abs(flippedBox.x + flippedBox.width + 10 - edgeBox.x)).toBeLessThan(2);
  expect(flippedBox.x).toBeGreaterThanOrEqual(8);
  expect(flippedBox.y + flippedBox.height).toBeLessThanOrEqual(760);
  await leaderRow.locator('button').focus();
  await expect(page.locator('#tooltip')).toBeVisible();
  await leaderRow.locator('button').press('Enter');
  await expect(page.locator('#gm-body')).toContainText('Contribution points');
  await page.locator('#gm-body').getByRole('button', { name:'Back', exact:true }).click();
  await expect(page.locator('.holy-war-name')).toHaveCount(80);
  await expect(sortButton).toHaveAttribute('data-sort', 'size');
  await expect(attackers.locator('[data-holy-war-participant]').first()).toHaveAttribute('data-holy-war-participant', result.leader);
  await sortButton.click();
  await expect(sortButton).toHaveAttribute('data-sort', 'name');
  await expect(sortButton).toHaveText('A↓');
  await expect(attackers.locator('[data-holy-war-participant]').first()).toHaveAttribute('data-holy-war-participant', 'overview_attackers_0');
  await expect(defenders.locator('[data-holy-war-participant]').first()).toHaveAttribute('data-holy-war-participant', 'overview_defenders_0');

  await page.setViewportSize({ width:390, height:844 });
  const layout = await page.locator('.holy-war-sides').evaluate(function (el) {
    const left = el.children[0].getBoundingClientRect();
    const right = el.children[1].getBoundingClientRect();
    return { stacked:right.top >= left.bottom, fits:document.documentElement.scrollWidth <= window.innerWidth };
  });
  expect(layout).toEqual({ stacked:true, fits:true });
  await page.locator('#holy-war-overview-close').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
});
