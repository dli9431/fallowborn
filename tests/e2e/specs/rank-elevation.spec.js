'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/events_noble.js',
  'data/events_paths.js',
  'data/map_data.js',
  'css/style.css',
  'js/actions.js',
  'js/events.js',
  'js/main.js',
  'js/model.js',
  'js/world.js',
  'js/ui_modals.js',
  'js/ui_panels.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('per-rung prices and multi-rank claims use the complete crossed cost',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const rows = [];
      for (let tier = 2; tier <= 7; tier++) {
        rows.push(FB.rankElevationCost(s, tier - 1, tier));
      }
      return {
        rows:rows,
        countToKing:FB.rankElevationCost(s, 4, 6),
        countToEmperor:FB.rankElevationCost(s, 4, 7),
        emperorToEmperor:FB.rankElevationCost(s, 7, 7)
      };
    });

    expect(result.rows).toEqual([
      { gold:200, prestige:100, piety:0 },
      { gold:500, prestige:250, piety:0 },
      { gold:800, prestige:400, piety:0 },
      { gold:1500, prestige:600, piety:0 },
      { gold:3000, prestige:1000, piety:300 },
      { gold:6000, prestige:1500, piety:600 }
    ]);
    expect(result.countToKing).toEqual({
      gold:4500, prestige:1600, piety:300
    });
    expect(result.countToEmperor).toEqual({
      gold:10500, prestige:3100, piety:900
    });
    expect(result.emperorToEmperor).toEqual({ gold:0, prestige:0, piety:0 });
  });

test('opening a rank review is free and confirmation spends the day and cost',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const requirement = FBDATA.balance.manorPlotRequirement;
      p.tier = 1;
      p.gold = 200;
      p.prestige = FBDATA.balance.manorPrestige;
      p.piety = 0;
      p.manor = null;
      p.landPlots = [];
      p.landPlotMigration = 1;
      for (let i = 0; i < requirement; i++) {
        p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
      }
      s.eventQueue = [];
      const before = {
        turn:s.turn, gold:p.gold, prestige:p.prestige, piety:p.piety,
        tier:p.tier
      };
      FB.runInstant(s, 'declare_manor');
      return {
        before:before,
        afterOpen:{
          turn:s.turn, gold:p.gold, prestige:p.prestige, piety:p.piety,
          tier:p.tier, manor:p.manor
        },
        modalOpen:!document.getElementById('genmodal').classList.contains('hidden')
      };
    });

    expect(setup.afterOpen).toEqual({
      turn:setup.before.turn,
      gold:setup.before.gold,
      prestige:setup.before.prestige,
      piety:setup.before.piety,
      tier:1,
      manor:null
    });
    expect(setup.modalOpen).toBe(true);
    await expect(page.locator('[data-rank-transition]')).toContainText(
      'Freeholder');
    await expect(page.locator('[data-rank-transition]')).toContainText(
      'Gentry');
    await expect(page.locator('[data-rank-elevation-sheet]')).toContainText(
      'Benefits');
    await expect(page.locator('#rank-elevation-confirm'))
      .not.toHaveAttribute('aria-disabled', 'true');

    await page.locator('#rank-elevation-confirm').click();
    const result = await page.evaluate(function () {
      const s = FB.state;
      return {
        turn:s.turn,
        gold:s.player.gold,
        prestige:s.player.prestige,
        piety:s.player.piety,
        tier:s.player.tier,
        manor:s.player.manor
      };
    });
    expect(result).toEqual({
      turn:setup.before.turn + 1,
      gold:0,
      prestige:setup.before.prestige - 100,
      piety:0,
      tier:2,
      manor:{ provinceId:expect.any(String), settlement:0 }
    });
  });

test('rank launchers defer every eligibility scan until their sheet opens',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const originalRankStatus = FB.rankElevationStatus;
      const originalPetitionStatus = FB.freedomPetitionStatus;
      const originalPurchaseStatus = FB.freedomPurchaseStatus;
      const originalPurchaseQuote = FB.freedomPurchaseQuote;
      const calls = { rank:0, petition:0, purchase:0, quote:0 };
      FB.rankElevationStatus = function () {
        calls.rank++;
        return originalRankStatus.apply(FB, arguments);
      };
      FB.freedomPetitionStatus = function () {
        calls.petition++;
        return originalPetitionStatus.apply(FB, arguments);
      };
      FB.freedomPurchaseStatus = function () {
        calls.purchase++;
        return originalPurchaseStatus.apply(FB, arguments);
      };
      FB.freedomPurchaseQuote = function () {
        calls.quote++;
        return originalPurchaseQuote.apply(FB, arguments);
      };
      const ranks = [
        { tier:0, ids:['petition_freedom', 'buy_freedom'] },
        { tier:1, ids:['declare_manor'] },
        { tier:2, ids:['petition_barony'] },
        { tier:3, ids:['petition_liege'] },
        { tier:4, ids:['claim_higher_title'] }
      ];
      const launcherStatuses = [];
      const travelLaunchers = [];
      for (let i = 0; i < ranks.length; i++) {
        p.tier = ranks[i].tier;
        for (let j = 0; j < ranks[i].ids.length; j++) {
          const status = FB.instantStatus(s, ranks[i].ids[j]);
          launcherStatuses.push({
            id:ranks[i].ids[j], shown:status.shown, can:status.can,
            desc:status.action.desc(s)
          });
        }
      }
      p.travel = { phase:'outbound' };
      for (let i = 0; i < ranks.length; i++) {
        p.tier = ranks[i].tier;
        const listed = FB.listInstants(s, { deferEligibility:true }).map(
          function (item) { return item.a.id; });
        for (let j = 0; j < ranks[i].ids.length; j++) {
          travelLaunchers.push(listed.indexOf(ranks[i].ids[j]) >= 0);
        }
      }
      p.travel = null;
      const beforeOpen = {
        rank:calls.rank, petition:calls.petition,
        purchase:calls.purchase, quote:calls.quote
      };
      p.tier = 4;
      FB.runInstant(s, 'claim_higher_title');
      const afterOpen = {
        rank:calls.rank, petition:calls.petition,
        purchase:calls.purchase, quote:calls.quote
      };
      FB.rankElevationStatus = originalRankStatus;
      FB.freedomPetitionStatus = originalPetitionStatus;
      FB.freedomPurchaseStatus = originalPurchaseStatus;
      FB.freedomPurchaseQuote = originalPurchaseQuote;
      return {
        launcherStatuses:launcherStatuses,
        travelLaunchers:travelLaunchers,
        beforeOpen:beforeOpen,
        afterOpen:afterOpen,
        sheet:!!document.querySelector('[data-rank-elevation-sheet="higher"]')
      };
    });

    expect(result.launcherStatuses).toEqual([
      { id:'petition_freedom', shown:true, can:true,
        desc:'Review a lawful petition from Serf to Freeholder.' },
      { id:'buy_freedom', shown:true, can:true,
        desc:'Review a family charter from Serf to Freeholder.' },
      { id:'declare_manor', shown:true, can:true,
        desc:'Review recognition from Freeholder to Gentry.' },
      { id:'petition_barony', shown:true, can:true,
        desc:'Review a petition from Gentry to Baron.' },
      { id:'petition_liege', shown:true, can:true,
        desc:'Review a petition from Baron to Count.' },
      { id:'claim_higher_title', shown:true, can:true,
        desc:'Review the next supported noble dignity.' }
    ]);
    expect(result.beforeOpen).toEqual({
      rank:0, petition:0, purchase:0, quote:0
    });
    expect(result.travelLaunchers).toEqual([
      true, true, true, true, true, true
    ]);
    expect(result.afterOpen.rank).toBeGreaterThan(0);
    expect(result.afterOpen.petition).toBe(0);
    expect(result.afterOpen.purchase).toBe(0);
    expect(result.afterOpen.quote).toBe(0);
    expect(result.sheet).toBe(true);
  });

test('an active title lapse wakes hierarchy repair only at its deadline',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const original = FB.checkTierPromotions;
      const since = s.turn;
      let calls = 0;
      p.tier = 5;
      p.titleLapse = { tier:5, since:since };
      FB.checkTierPromotions = function () { calls++; };
      FB.game.afterEvents({ forcePromotionCheck:true, deferUi:true });
      const initial = calls;
      for (let day = 1; day <= 20; day++) {
        s.turn = since + day;
        FB.game.afterEvents({ deferUi:true });
      }
      const betweenDeadlines = calls;
      s.turn = since + (FBDATA.balance.titleLapseWarnDays || 180);
      FB.game.afterEvents({ deferUi:true });
      const onDeadline = calls;
      p.titleLapse.warned = 1;
      s.turn++;
      FB.game.afterEvents({ deferUi:true });
      const afterWarning = calls;
      s.turn = since + (FBDATA.balance.titleLapseDemoteDays || 540);
      FB.game.afterEvents({ deferUi:true });
      const onDemotionDeadline = calls;
      FB.checkTierPromotions = original;
      delete p.titleLapse;
      return {
        initial:initial,
        betweenDeadlines:betweenDeadlines,
        onDeadline:onDeadline,
        afterWarning:afterWarning,
        onDemotionDeadline:onDemotionDeadline
      };
    });

    expect(result).toEqual({
      initial:1,
      betweenDeadlines:1,
      onDeadline:2,
      afterWarning:2,
      onDemotionDeadline:3
    });
  });

test('a stale or unaffordable offer cannot partially charge the household',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const requirement = FBDATA.balance.manorPlotRequirement;
      p.tier = 1;
      p.gold = 200;
      p.prestige = FBDATA.balance.manorPrestige;
      p.piety = 0;
      p.manor = null;
      p.landPlots = [];
      p.landPlotMigration = 1;
      for (let i = 0; i < requirement; i++) {
        p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
      }
      s.eventQueue = [];
      const offer = FB.queueRankElevationOffer(s, 'manor');
      const event = FB.eventById('rank_elevation_offer');
      p.gold = 199;
      const status = FB.eventOptionStatus(
        s, event, event.options[0], offer.ctx);
      const before = {
        gold:p.gold, prestige:p.prestige, piety:p.piety, tier:p.tier,
        manor:p.manor
      };
      const rejected = FB.resolveEventOption(
        s, event, event.options[0], offer.ctx);
      const withdrew = !!FB.resolveEventOption(
        s, event, event.options[1], offer.ctx);
      return {
        visible:status.visible,
        ready:status.ready,
        reason:status.reason,
        rejected:rejected === false,
        withdrew:withdrew,
        before:before,
        after:{
          gold:p.gold, prestige:p.prestige, piety:p.piety, tier:p.tier,
          manor:p.manor
        }
      };
    });

    expect(result.visible).toBe(true);
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('200');
    expect(result.rejected).toBe(true);
    expect(result.withdrew).toBe(true);
    expect(result.after).toEqual(result.before);
  });

test('Governance opens a concise rank review with a focusable blocked confirm',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      let duchyId = null;
      for (const did in FBDATA.duchies) {
        if (FB.duchyCounties(did).length === 2) {
          duchyId = did;
          break;
        }
      }
      const counties = FB.duchyCounties(duchyId);
      p.tier = 4;
      p.liege = null;
      p.provinceId = counties[0];
      p.provs = counties.slice();
      p.gold = 0;
      p.prestige = 0;
      p.piety = 0;
      for (let i = 0; i < counties.length; i++) {
        s.owner[counties[i]] = 'player';
        s.holder[counties[i]] = 'player';
      }
      FB.foundPlayerRealm(s);
      s.realms.player.liege = null;
      FB.invalidateRealmCache();
      const status = FB.rankElevationStatus(s);
      const originalRankStatus = FB.rankElevationStatus;
      let governanceRankChecks = 0;
      FB.rankElevationStatus = function () {
        governanceRankChecks++;
        return originalRankStatus.apply(FB, arguments);
      };
      FB.ui.showGovernance('domain');
      FB.rankElevationStatus = originalRankStatus;
      return {
        eligible:status.eligible,
        costText:FB.T('{money:gold}', { gold:status.cost.gold }) + ' · ' +
          FB.T('{prestige} prestige', { prestige:status.cost.prestige }),
        reason:status.reason,
        governanceRankChecks:governanceRankChecks
      };
    });

    expect(setup.eligible).toBe(true);
    expect(setup.governanceRankChecks).toBe(0);
    const button = page.locator(
      '#governance-domain [data-governance-action="claim_higher_title"]');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(button).toContainText('Review higher dignity');
    await button.click();

    const sheet = page.locator('[data-rank-elevation-sheet="higher"]');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(setup.costText);
    await expect(sheet).toContainText('Benefits');
    await expect(sheet).toContainText(setup.reason);
    await expect(page.locator('#rank-elevation-confirm'))
      .toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#rank-elevation-confirm'))
      .toHaveAttribute('aria-describedby', 'rank-elevation-confirm-details');
    await expect(page.locator('#genmodal .gm-footer .btn').nth(0))
      .toHaveText('Cancel');
    await expect(page.locator('#genmodal .gm-footer .btn').nth(1))
      .toHaveAttribute('id', 'rank-elevation-confirm');
    const heading = page.getByRole('heading', {
      name:'Rank elevation', exact:true
    });
    await heading.hover();
    await expect(page.locator('#tooltip')).toContainText(
      'Eligibility is calculated when this sheet opens');
    await expect(page.locator('#rank-elevation-guide')).toHaveAttribute(
      'data-modal-guide', 'roles');

    await page.setViewportSize({ width:390, height:700 });
    const titleInfo = page.locator('.modal-title-info');
    await expect(titleInfo).toBeVisible();
    await titleInfo.click();
    await expect(page.locator('#gm-title-details')).toBeVisible();
    await expect(page.locator('#gm-title-details')).toContainText(
      'Opening or closing it spends no day or resources');
  });

test('restoring a lost dignity pays the full rung again',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      let duchyId = null;
      for (const did in FBDATA.duchies) {
        if (FB.duchyCounties(did).length === 2) {
          duchyId = did;
          break;
        }
      }
      const counties = FB.duchyCounties(duchyId);
      p.tier = 4;
      p.liege = null;
      p.provinceId = counties[0];
      p.provs = counties.slice();
      for (let i = 0; i < counties.length; i++) {
        s.owner[counties[i]] = 'player';
        s.holder[counties[i]] = 'player';
      }
      FB.foundPlayerRealm(s);
      s.realms.player.liege = null;
      FB.invalidateRealmCache();

      p.gold = 1500;
      p.prestige = 600;
      p.piety = 0;
      const first = FB.queueRankElevationOffer(s, 'higher');
      const firstClaim = !!first && FB.claimRankElevation(s, first.ctx);
      const firstAfter = {
        tier:p.tier, gold:p.gold, prestige:p.prestige, piety:p.piety
      };

      FB.setPlayerTier(s, 4, { attachLiege:false });
      FB.foundPlayerRealm(s);
      p.gold = 1500;
      p.prestige = 600;
      const restoredStatus = FB.rankElevationStatus(s);
      const second = FB.queueRankElevationOffer(s, 'higher');
      const secondClaim = !!second && FB.claimRankElevation(s, second.ctx);
      return {
        firstClaim:firstClaim,
        firstAfter:firstAfter,
        restoredCost:restoredStatus.cost,
        secondClaim:secondClaim,
        secondAfter:{
          tier:p.tier, gold:p.gold, prestige:p.prestige, piety:p.piety
        }
      };
    });

    expect(result).toEqual({
      firstClaim:true,
      firstAfter:{ tier:5, gold:0, prestige:0, piety:0 },
      restoredCost:{ gold:1500, prestige:600, piety:0 },
      secondClaim:true,
      secondAfter:{ tier:5, gold:0, prestige:0, piety:0 }
    });
  });

test('an accepted petitioned barony charges its rank resources',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 2;
      p.lineDepth = Math.max(1, p.lineDepth || 1);
      p.gentryGeneration = p.lineDepth - 1;
      p.gold = 500;
      p.prestige = 400;
      p.piety = 0;
      p.liegeGrants = 0;
      const lord = FB.getRole(s, 'lord', true);
      FB.adjustStanding(s, { kind:'character', id:lord.id },
        100 - FB.standingOf(s, { kind:'character', id:lord.id }),
        'test:rank_elevation');
      const offer = FB.queueRankElevationOffer(s, 'barony');
      const claimed = !!offer && FB.claimRankElevation(s, offer.ctx);
      return {
        claimed:claimed,
        tier:p.tier,
        gold:p.gold,
        prestige:p.prestige,
        piety:p.piety,
        grants:p.liegeGrants
      };
    });

    expect(result).toEqual({
      claimed:true,
      tier:3,
      gold:0,
      prestige:150,
      piety:0,
      grants:1
    });
  });

test('a refused barony petition keeps its investiture and starts its cooldown',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 2;
      p.lineDepth = Math.max(1, p.lineDepth || 1);
      p.gentryGeneration = p.lineDepth - 1;
      p.gold = 500;
      p.prestige = 400;
      p.piety = 0;
      const lord = FB.getRole(s, 'lord', true);
      FB.adjustStanding(s, { kind:'character', id:lord.id },
        100 - FB.standingOf(s, { kind:'character', id:lord.id }),
        'test:rank_elevation_refusal');
      const standingBefore = FB.standingOf(s, {
        kind:'character', id:lord.id
      });
      const chance = FB.chance;
      FB.chance = function () { return false; };
      const attempt = FB.attemptRankElevation(s, 'barony');
      FB.chance = chance;
      const afterStatus = FB.rankElevationStatus(
        s, null, { route:'barony' });
      const launcherAfter = FB.instantStatus(s, 'petition_barony');
      return {
        attempted:attempt.attempted,
        claimed:attempt.claimed,
        tier:p.tier,
        gold:p.gold,
        prestige:p.prestige,
        standingLoss:standingBefore - FB.standingOf(s, {
          kind:'character', id:lord.id
        }),
        cooldown:p.cooldowns.petition_barony,
        turn:s.turn,
        readyAfter:afterStatus.ready,
        reasonAfter:afterStatus.reason,
        launcherAfter:launcherAfter.shown && launcherAfter.can,
        queue:(s.eventQueue || []).map(function (item) { return item.id; })
      };
    });

    expect(result).toEqual({
      attempted:true,
      claimed:false,
      tier:2,
      gold:500,
      prestige:400,
      standingLoss:5,
      cooldown:result.turn,
      turn:result.turn,
      readyAfter:false,
      reasonAfter:'You may try again in 360 days.',
      launcherAfter:true,
      queue:expect.arrayContaining(['rank_elevation_refused'])
    });
  });

test('an unsolicited barony and generic tierSet remain free exceptions',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 2;
      p.gold = 777;
      p.prestige = 500;
      p.piety = 44;
      p.gentryGeneration = Math.max(0, (p.lineDepth || 1) - 1);
      const event = FB.eventById('grant_of_barony');
      const ctx = FB.eventContextFor(s, event, {});
      const resolved = !!FB.resolveEventOption(
        s, event, event.options[0], ctx);
      const afterOffer = {
        tier:p.tier, gold:p.gold, prestige:p.prestige, piety:p.piety
      };
      FB.applyEffects(s, { tierSet:4 });
      return {
        resolved:resolved,
        afterOffer:afterOffer,
        afterGeneric:{
          tier:p.tier, gold:p.gold, prestige:p.prestige, piety:p.piety
        }
      };
    });

    expect(result).toEqual({
      resolved:true,
      afterOffer:{ tier:3, gold:777, prestige:560, piety:44 },
      afterGeneric:{ tier:4, gold:777, prestige:560, piety:44 }
    });
  });
