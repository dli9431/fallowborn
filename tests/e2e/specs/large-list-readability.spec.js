'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/keys.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

async function startListGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function makeLargeListFixture(page) {
  var fixture = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var home = FB.world.byId[p.provinceId];
    var workerIds = [];

    /* The seeded start rolls 1-2 siblings; as manageable kin they would
       join the Work roster. Send them away so the constructed counts
       stay exact. */
    var sibs = FB.siblingsOf(s, me);
    for (var sb = 0; sb < sibs.length; sb++) {
      sibs[sb].homeProvinceId = 'arhus';
    }

    p.tier = 3;
    p.retainers = [];
    p.enterpriseMigration = 1;
    p.enterprises = [];
    p.friendContacts = {};
    p.socialAttention = {};
    p.panelIntrosSeen = p.panelIntrosSeen || {};
    p.panelIntrosSeen.network = 1;
    me.childrenIds = me.childrenIds || [];
    FB.careerOf(s, me).rank = 'unassigned';

    for (var i = 0; i < 14; i++) {
      var child = FB.makeCharacter(s, {
        name:'Routine Worker ' + (i < 9 ? '0' : '') + (i + 1),
        sex:i % 2 ? 'm' : 'f',
        culture:home.culture,
        religion:home.religion,
        born:s.date.year - (i < 2 ? 13 : 22 + i),
        dyn:me.dyn,
        station:1,
        traits:[],
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null
      });
      child.career = {
        profession:'farmer',
        rank:i < 2 ? 'unassigned' : 'journeyman',
        experience:4,
        startedYear:s.date.year - 4,
        guildRank:'none',
        chosen:i >= 2
      };
      child.religiousRanks = {};
      me.childrenIds.push(child.id);
      workerIds.push(child.id);
    }

    var guildWorker = s.chars[workerIds[2]];
    guildWorker.career = {
      profession:'craftsman',
      rank:'journeyman',
      experience:8,
      startedYear:s.date.year - 8,
      guildRank:'member',
      guildStanding:55,
      chosen:true
    };

    for (var j = 0; j < 9; j++) {
      p.enterprises.push({
        uid:'large_list_enterprise_' + j,
        type:'field_strip',
        provinceId:p.provinceId,
        settlement:0,
        workerId:j < 3 ? null : workerIds[j],
        workerLocked:j === 5
      });
    }

    var shared = FB.makeCharacter(s, {
      name:'Alexandria Extremely-Long Connection Name',
      sex:'f',
      culture:home.culture,
      religion:home.religion,
      born:s.date.year - 31,
      station:2,
      traits:[]
    });
    shared.homeProvinceId = p.provinceId;
    p.friendContacts[shared.id] = {
      startedTurn:s.turn,
      lastTurn:s.turn
    };
    p.courtingId = shared.id;
    s.roles.friend = shared.id;
    s.roles.rival = shared.id;
    s.roles.priest = shared.id;
    s.roles.lord = shared.id;
    p.socialAttention[shared.id] = {
      startedTurn:s.turn,
      lastTurn:s.turn
    };

    var second = FB.makeCharacter(s, {
      name:'Searchable Network Witness',
      sex:'m',
      culture:home.culture,
      religion:home.religion,
      born:s.date.year - 39,
      station:1,
      traits:[]
    });
    second.homeProvinceId = p.provinceId;
    p.friendContacts[second.id] = {
      startedTurn:s.turn,
      lastTurn:s.turn
    };

    var third = FB.makeCharacter(s, {
      name:'Another Routine Network Witness',
      sex:'f',
      culture:home.culture,
      religion:home.religion,
      born:s.date.year - 36,
      station:1,
      traits:[]
    });
    third.homeProvinceId = p.provinceId;
    p.friendContacts[third.id] = {
      startedTurn:s.turn,
      lastTurn:s.turn
    };

    FB.ensureHouseholdStandards(s);
    FB.ensureItems(s);
    FB.socialAttentionEnsure(s);
    FB.retainerRecords(s);
    FB.enterpriseList(s);
    var workers = FB.householdWorkers(s);
    for (var k = 0; k < workers.length; k++) {
      FB.careerOf(s, workers[k]);
    }
    FB.ui.characterInteractionCard(s, shared.id);
    /* Resolving the canonical lord role is an intentional one-time repair —
       FB.getRole restores the character's role tag on first read. Settle it
       in the fixture so the state-purity test below measures only accidental
       mutations from filters, search, collapse, and navigation. */
    FB.getRole(s, 'lord', false);
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    return {
      headId:me.id,
      guildWorkerId:guildWorker.id,
      sharedId:shared.id,
      secondId:second.id,
      thirdId:third.id,
      lockedUid:'large_list_enterprise_5',
      unlockedUid:'large_list_enterprise_4'
    };
  });
  await waitForUiRefresh(page);
  return fixture;
}

test('small Work roster keeps all ordinary rows visible without search',
  async function ({ page }, testInfo) {
    await startListGame(page, testInfo);
    await page.evaluate(function () {
      FB.ui.showLivelihoods();
    });

    await expect(page.locator('[data-large-list-surface="work"]')).toBeVisible();
    await expect(page.locator('#work-list-search')).toHaveCount(0);
    await expect(page.locator('.enterprise-list-summary')).toHaveCount(0);
    await expect(page.locator('.gm-body-text')).toHaveCount(0);

    const filterSection = page.locator('[data-list-section="filters"]');
    await expect(filterSection).toBeVisible();
    const filterToggle = page.locator('[data-list-toggle="filters"]');
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
    const filterBody = page.locator('.large-list-filters-body');
    await expect(filterBody).toBeHidden();

    await filterToggle.click();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(filterBody).toBeVisible();
    await expect(page.locator('[data-enterprise-group]')).toBeVisible();
    await expect(page.locator('[data-enterprise-sort]')).toBeVisible();

    var smallRows = await page.locator(
      '[data-list-section="household-work"] [data-large-list-row]').count();
    var visibleRows = await page.locator(
      '[data-list-section="household-work"] [data-large-list-row]:visible').count();
    expect(smallRows).toBeLessThanOrEqual(12);
    expect(visibleRows).toBe(smallRows);
    await expect(page.locator(
      '[data-list-section="household-work"] .large-list-section-count'))
      .toContainText(smallRows + ' total');
    await expect(page.locator(
      '[data-list-section="family-enterprises"] .large-list-empty')).toBeVisible();
    await expect(page.locator(
      '[data-list-section="family-enterprises"] .large-list-no-results')).toBeHidden();
  });

test('large Work roster counts choices, orders attention, and preserves exact enterprises',
  async function ({ page }, testInfo) {
    await startListGame(page, testInfo);
    var fixture = await makeLargeListFixture(page);
    await page.evaluate(function () {
      FB.ui.showLivelihoods();
    });

    await expect(page.locator('[data-list-section="filters"]')).toBeVisible();
    await page.locator('[data-list-toggle="filters"]').click();
    await expect(page.locator('#work-list-search')).toBeVisible();
    await expect(page.locator(
      '[data-list-section="household-work"] .large-list-section-count'))
      .toContainText('15 total');
    await expect(page.locator(
      '[data-list-section="household-work"] .large-list-attention-count'))
      .toContainText('2 need attention');
    await expect(page.locator(
      '[data-list-section="family-enterprises"] .large-list-section-count'))
      .toContainText('9 total');
    await expect(page.locator('#enterprise-staffing-preview')).toBeVisible();

    var workOrder = await page.locator(
      '[data-list-section="household-work"] [data-large-list-row]').evaluateAll(
      function (rows) {
        return rows.map(function (row) {
          return row.getAttribute('data-list-attention');
        });
      });
    expect(workOrder.slice(0, 2)).toEqual(['true', 'true']);
    expect(workOrder.slice(2).every(function (value) {
      return value === 'false';
    })).toBe(true);

    var head = page.locator('[data-list-identity="' + fixture.headId + '"]');
    await expect(head).toHaveAttribute('data-list-attention', 'false');
    await expect(head).toContainText('Former calling');

    var enterpriseOrder = await page.locator(
      '[data-list-section="family-enterprises"] [data-large-list-row]')
      .evaluateAll(function (rows) {
        return rows.map(function (row) {
          return {
            attention:row.getAttribute('data-list-attention'),
            uid:row.getAttribute('data-list-identity')
          };
        });
      });
    expect(enterpriseOrder.slice(0, 3).every(function (row) {
      return row.attention === 'true';
    })).toBe(true);
    expect(enterpriseOrder.slice(3).every(function (row) {
      return row.attention === 'false';
    })).toBe(true);

    await page.locator(
      '[data-list-section="family-enterprises"] [data-list-show-all]').click();
    await expect(page.locator(
      '[data-list-toggle="family-enterprises"]')).toBeFocused();
    await expect(page.locator(
      '[data-list-section="family-enterprises"] [data-large-list-row]:visible'))
      .toHaveCount(9);

    var lockedRow = page.locator(
      '[data-enterprise="' + fixture.lockedUid + '"]');
    var workScroll = await lockedRow.evaluate(function (row) {
      row.scrollIntoView({ block:'center' });
      return document.getElementById('gm-body').scrollTop;
    });
    await lockedRow.click();
    await expect(page.locator('#enterprise-worker-lock')).toBeChecked();
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#work-list-search')).not.toBeFocused();
    await expect(page.locator(
      '[data-enterprise="' + fixture.lockedUid + '"]')).toBeFocused();
    await expect.poll(function () {
      return page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      });
    }).toBeGreaterThanOrEqual(Math.max(0, workScroll - 5));

    await page.locator('[data-enterprise="' + fixture.unlockedUid + '"]').click();
    await expect(page.locator('#enterprise-worker-lock')).not.toBeChecked();
  });

test('Network limits section hotkeys to actions and discloses status context',
  async function ({ page }, testInfo) {
    await startListGame(page, testInfo);
    var fixture = await makeLargeListFixture(page);
    await page.evaluate(function () {
      FB.ui.showTab('network', { history:false });
    });

    await expect(page.locator('#network-list-search')).toHaveCount(0);
    await expect(page.locator('#tab-network [data-list-filter]')).toHaveCount(0);
    await expect(page.locator('[data-list-section]')).toHaveCount(5);
    const householdToggle = page.locator('[data-list-toggle="household"]');
    const tradeToggle = page.locator('[data-list-toggle="trade"]');
    expect(await page.locator('.large-list-section-keyhint').allTextContents())
      .toEqual(['1', '2', '3', '4', '5']);
    await expect(householdToggle).toHaveAttribute('aria-current', 'true');
    const householdPlan = page.locator('#network-household-plan');
    const householdPlanRow = householdPlan.locator('..');
    await expect(householdPlan.locator('.network-item-keyhint'))
      .toHaveText('Q');
    await expect(householdPlan).toHaveClass(/network-main-action/);
    await expect(householdPlan.locator('.adesc')).toHaveCount(0);
    await expect(householdPlanRow.locator('.network-action-details'))
      .toContainText('Review education, work, assignments');
    expect(await householdPlan.evaluate(function (button) {
      const style = getComputedStyle(button);
      return { fontSize:style.fontSize, fontWeight:style.fontWeight };
    })).toEqual({ fontSize:'16px', fontWeight:'600' });
    await householdPlan.hover();
    await expect(page.locator('#tooltip'))
      .toContainText('Review education, work, assignments');
    await expect.poll(function () {
      return page.locator('#tooltip').evaluate(function (tooltip) {
        return getComputedStyle(tooltip).fontSize;
      });
    }).toBe('15px');
    await expect(page.locator('#network-hire .network-item-keyhint'))
      .toHaveText('W');
    await expect(page.locator('#network-hire .adesc')).toHaveCount(0);
    await expect(page.locator(
      '[data-list-section="household"] button[data-cid] ' +
      '.network-item-keyhint')).toHaveCount(0);
    var playerHouseholdRow = page.locator(
      '[data-list-section="household"] [data-list-identity="' +
      fixture.headId + '"]');
    await expect(playerHouseholdRow).toContainText('You — Household head');
    await expect(playerHouseholdRow.locator('.settcard-details'))
      .toContainText('You — Household head');
    var establishedRow = page.locator(
      '[data-list-section="household"] [data-list-identity="' +
      fixture.guildWorkerId + '"]');
    await expect(establishedRow.locator('.large-list-state')).toHaveCount(0);
    await expect(establishedRow.locator('.settcard-details'))
      .toContainText('Established');
    await expect(establishedRow.locator('.settcard-details'))
      .toContainText('Age ');
    await expect(establishedRow.locator('.settcard-details'))
      .toContainText('Standing ');
    await expect(establishedRow.locator('.settcard-info'))
      .toHaveAttribute('aria-controls');
    await establishedRow.hover();
    await expect(page.locator('#tooltip')).toContainText('Established');
    await expect(page.locator('#tooltip')).toContainText('Age ');
    var vacancyRow = page.locator(
      '[data-list-section="household"] ' +
      '[data-list-identity="retainer-vacancy"]');
    await expect(vacancyRow.locator('.large-list-state')).toHaveCount(0);
    await expect(vacancyRow.locator('.settcard-details'))
      .toContainText('Vacancy');
    await expect(vacancyRow.locator('.settcard-details'))
      .toContainText('household service slots are open');
    var routineConnection = page.locator(
      '[data-list-section="connections"] [data-list-identity="' +
      fixture.secondId + '"]');
    await expect(routineConnection.locator('.large-list-state')).toHaveCount(0);
    await expect(routineConnection.locator('.settcard-details'))
      .toContainText('Known tie');
    await expect(routineConnection.locator('.settcard-details'))
      .toContainText('Cultivated connection');
    await expect(routineConnection.locator('.settcard-details'))
      .toContainText('Standing ');
    await routineConnection.hover();
    await expect(page.locator('#tooltip')).toContainText('Known tie');
    await expect(page.locator('#tooltip'))
      .toContainText('affects friendship, courtship, marriage');
    await page.setViewportSize({ width:900, height:720 });
    await householdPlanRow.locator('.settcard-info').click();
    await expect(householdPlanRow.locator('.network-action-details'))
      .toBeVisible();
    await householdPlanRow.locator('.settcard-info').click();
    await expect(householdPlanRow.locator('.network-action-details'))
      .toBeHidden();
    await establishedRow.locator('.settcard-info').click();
    await expect(establishedRow.locator('.settcard-details')).toBeVisible();
    await establishedRow.locator('.settcard-info').click();
    await expect(establishedRow.locator('.settcard-details')).toBeHidden();
    await expect(page.locator(
      '[data-list-section="connections"] .large-list-section-count'))
      .toContainText('3 total');
    await expect(page.locator(
      '[data-list-section="connections"] .large-list-attention-count'))
      .toContainText('1 need attention');
    var sharedConnection = page.locator(
      '[data-list-section="connections"] [data-list-identity="' +
      fixture.sharedId + '"]');
    await expect(sharedConnection).toHaveCount(1);
    await expect(sharedConnection).toContainText('Your friend');
    await expect(sharedConnection).toContainText('Rival');
    await expect(sharedConnection).toContainText('Suitor');
    await page.keyboard.press('Digit2');
    await expect(page.locator(
      '[data-list-section="connections"] .network-item-keyhint'))
      .toHaveCount(0);
    await sharedConnection.locator('button[data-cid]').evaluate(
      function (button) {
        button.click = function () {
          window.__networkInfoShortcutTarget = 'character';
        };
      });
    await page.keyboard.press('q');
    expect(await page.evaluate(function () {
      return window.__networkInfoShortcutTarget;
    })).toBeUndefined();
    await page.keyboard.press('Digit1');

    await expect(page.locator(
      '[data-list-section="household"] [data-list-identity="' +
      fixture.guildWorkerId + '"]')).toHaveCount(1);
    await expect(page.locator(
      '[data-list-section="trade"] [data-list-identity="' +
      fixture.guildWorkerId + '"]')).toHaveCount(1);

    var connectionOrder = await page.locator(
      '[data-list-section="connections"] [data-large-list-row]').evaluateAll(
      function (rows) {
        return rows.map(function (row) {
          return row.getAttribute('data-list-identity');
        });
      });
    await page.evaluate(function (id) {
      FB.adjustStanding(FB.state, { kind:'character', id:id }, 100,
        'test:list_order');
      FB.ui.refresh();
    }, fixture.secondId);
    var reordered = await page.locator(
      '[data-list-section="connections"] [data-large-list-row]').evaluateAll(
      function (rows) {
        return rows.map(function (row) {
          return row.getAttribute('data-list-identity');
        });
      });
    expect(reordered).toEqual(connectionOrder);

    await page.locator('[data-list-toggle="household"]').click();
    await expect(page.locator(
      '[data-list-section="household"] .large-list-section-body')).toBeHidden();
    await expect(page.locator(
      '[data-list-section="connections"] .large-list-section-body')).toBeVisible();
    await expect(page.locator('[data-list-toggle="household"]'))
      .toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(
      '[data-list-section="household"] .large-list-attention-count'))
      .toBeVisible();

    await page.keyboard.press('Digit3');
    await expect(tradeToggle).toBeFocused();
    await expect(tradeToggle).toHaveAttribute('aria-current', 'true');
    await expect(householdToggle).not.toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#network-market .network-item-keyhint'))
      .toHaveText('Q');
    await expect(page.locator('#network-work .network-item-keyhint'))
      .toHaveText('W');
    await expect(page.locator(
      '[data-list-section="trade"] button[data-cid] ' +
      '.network-item-keyhint')).toHaveCount(0);
    await page.evaluate(function () {
      document.getElementById('network-market').click = function () {
        window.__networkShortcutTarget = 'market';
      };
    });
    await page.keyboard.press('q');
    expect(await page.evaluate(function () {
      return window.__networkShortcutTarget;
    })).toBe('market');

    await page.keyboard.press('Digit3');
    await expect(page.locator(
      '[data-list-section="trade"] .large-list-section-body')).toBeHidden();
    await page.keyboard.press('Digit3');
    await expect(page.locator(
      '[data-list-section="trade"] .large-list-section-body')).toBeVisible();
    await expect(tradeToggle).toBeFocused();

    var warRealm = await page.evaluate(function () {
      var s = FB.state;
      var rid = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive;
      })[0];
      s.player.war = { enemy:rid, defending:true };
      FB.ui.refresh();
      return { id:rid, name:s.realms[rid].name };
    });
    var warRealmRow = page.locator(
      '[data-list-section="realm"] [data-list-identity="' +
      warRealm.id + '"]');
    await expect(warRealmRow).toContainText('At war with ' + warRealm.name);
    await expect(warRealmRow.locator('.large-list-state')).toHaveCount(0);
    await expect(warRealmRow).not.toContainText('Warning');
  });

test('Work filters and Network navigation do not mutate play state',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startListGame(page, testInfo);
    var fixture = await makeLargeListFixture(page);
    var before = await page.evaluate(function () {
      return {
        state:JSON.stringify(FB.state),
        rng:FB.getRngState(),
        uid:FB.getUidCounter()
      };
    });

    await page.evaluate(function () {
      FB.ui.showLivelihoods();
    });
    const filterToggle = page.locator('[data-list-toggle="filters"]');
    if (await filterToggle.count()) {
      await filterToggle.click();
    }
    await page.locator('#gm-body [data-list-filter="attention"]').click();
    await page.locator('[data-list-toggle="family-enterprises"]').click();
    await page.locator('#work-list-search').fill('Routine Worker 01');
    await page.locator('#gm-cancel').click();

    await page.evaluate(function () {
      FB.ui.showTab('network', { history:false });
    });
    await expect(page.locator('#network-list-search')).toHaveCount(0);
    await expect(page.locator('#sidebody [data-list-filter]')).toHaveCount(0);
    await page.locator('[data-list-toggle="trade"]').click();
    var networkTarget = page.locator(
      '[data-list-section="connections"] button[data-cid="' +
      fixture.sharedId + '"]');
    var networkScroll = await networkTarget.evaluate(function (row) {
      row.scrollIntoView({ block:'center' });
      return document.getElementById('sidebody').scrollTop;
    });
    await networkTarget.click();
    await expect(page.locator('.character-interaction-modal')).toBeVisible();
    await page.locator('#cm-close').click();
    await expect(networkTarget).toBeFocused();
    await expect(page.locator('#network-list-search')).toHaveCount(0);
    await expect(page.locator(
      '[data-list-section="trade"] .large-list-section-body')).toBeHidden();
    await expect.poll(function () {
      return page.locator('#sidebody').evaluate(function (body) {
        return body.scrollTop;
      });
    }).toBeGreaterThanOrEqual(Math.max(0, networkScroll - 5));

    var after = await page.evaluate(function () {
      var side = document.getElementById('sidebody');
      return {
        state:JSON.stringify(FB.state),
        rng:FB.getRngState(),
        uid:FB.getUidCounter(),
        scrollWidth:side.scrollWidth,
        clientWidth:side.clientWidth,
        bodyScrollWidth:document.body.scrollWidth,
        viewportWidth:window.innerWidth
      };
    });
    expect(after.state).toBe(before.state);
    expect(after.rng).toBe(before.rng);
    expect(after.uid).toBe(before.uid);
    expect(after.scrollWidth).toBeLessThanOrEqual(after.clientWidth + 1);
    expect(after.bodyScrollWidth).toBeLessThanOrEqual(after.viewportWidth + 1);
  });

test('visible number-key order ignores filtered Work rows and search typing stays local',
  async function ({ page }, testInfo) {
    await startListGame(page, testInfo);
    await makeLargeListFixture(page);
    await page.evaluate(function () {
      FB.ui.showLivelihoods();
    });
    const filterToggle = page.locator('[data-list-toggle="filters"]');
    if (await filterToggle.count()) {
      await filterToggle.click();
    }

    await page.locator('#work-list-search').fill('Routine Worker 14');
    await page.locator('#work-list-search').press('n');
    await expect(page.getByRole('heading', {
      name:'🧰 Work & Enterprises', exact:true
    })).toBeVisible();
    await expect(page.locator('#work-list-search')).toHaveValue(
      'Routine Worker 14n');
    await page.locator('#work-list-search').fill('Routine Worker 14');
    await page.locator('[data-list-toggle="household-work"]').focus();
    await page.keyboard.press('Digit1');
    await expect(page.getByRole('heading', {
      name:/Work of Routine Worker 14/
    })).toBeVisible();
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#work-list-search')).toHaveValue(
      'Routine Worker 14');

    await page.locator('[data-list-clear]').click();
    await page.getByRole('button', { name:'Idle', exact:true }).click();
    await page.keyboard.press('Digit1');
    await expect(page.getByRole('heading', {
      name:/Leased Field/
    })).toBeVisible();
  });
