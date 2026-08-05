'use strict';

/* The way down (docs/designs/descent.md): title lapse, the loser's homage,
   felony & attainder, capture & ransom, distraint & debt bondage, and
   devastation — every descent is exercised at the engine level in a fresh
   deterministic context. */

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  // helpers live in the page: evaluate callbacks cannot close over Node scope
  await page.evaluate(function () {
    window.DSC = {
      /* shared reset: a clean, paused, independent count at home, no wars */
      resetLanded: function (s) {
        var p = s.player;
        var me = s.chars[p.charId];
        var homeId = p.provinceId;
        FB.game.setPaused(true);
        FB.game.observe = false;
        p.dead = false;
        p.tier = 4;
        p.liege = null;
        p.provs = [homeId];
        p.travel = null;
        p.war = null;
        p.greatHolyWar = null;
        p.gold = 100;
        p.prestige = 100;
        p.pop = 30;
        p.flags = {};
        delete me.bishopric;
        delete me.restorationRight;
        delete p.titleLapse;
        s.greatHolyWar = null;
        s.armies = [];
        for (var rid in s.realms) {
          if (s.realms[rid]) s.realms[rid].war = null;
        }
        s.owner[homeId] = 'player';
        s.holder[homeId] = 'player';
        s.dev[homeId] = 8;
        FB.foundPlayerRealm(s);
        s.realms.player.rank = 1;
        s.realms.player.liege = null;
        s.realms.player.capital = homeId;
        FB.invalidateRealmCache();
        return homeId;
      },
      makeRealm: function (s, id, name, rank, liege, capital, religion, culture) {
        s.realms[id] = {
          id:id,
          name:name,
          color:'#7a3f35',
          capital:capital,
          aggression:0,
          rank:rank,
          liege:liege,
          alive:true,
          favor:0,
          religion:religion,
          ruler:{
            name:name + ' Ruler',
            sex:'m',
            culture:culture,
            age:40,
            mar:7,
            trait:'ambitious',
            generation:1
          }
        };
      },
      queueIds: function (s) {
        return (s.eventQueue || []).map(function (item) { return item.id; });
      }
    };
  });
}

test('the hollow crown warns, can be defied, then falls one rung at a time',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var out = {};
      var B = FBDATA.balance;
      var homeId = DSC.resetLanded(s);

      // a crown without its kingdom: tier 6 over a single county
      p.tier = 6;
      p.prestige = 100;
      FB.foundPlayerRealm(s);
      s.realms.player.rank = 3;
      // an over-ranked vassal duke who cannot kneel to a mere duke
      DSC.makeRealm(s, 'lapse_vassal', 'Vassal Duchy', 2, 'player', homeId,
        me.religion, me.culture);

      FB.checkTierPromotions(s);
      out.stamped = !!p.titleLapse && p.titleLapse.tier === 6;
      out.warnQueueBefore = DSC.queueIds(s).indexOf('hc_hollow_crown') >= 0;

      s.turn += (B.titleLapseWarnDays || 180) + 1;
      FB.checkTierPromotions(s);
      out.warned = !!(p.titleLapse && p.titleLapse.warned);
      out.warnQueued = DSC.queueIds(s).indexOf('hc_hollow_crown') >= 0;

      // the paid escape: the style is bought a fresh window
      FB.fns.hc_defy(s);
      out.defyReset = p.titleLapse && p.titleLapse.since === s.turn &&
        !p.titleLapse.warned;

      // the window runs out: one rung down, peers unbound
      s.turn += (B.titleLapseDemoteDays || 540) + 1;
      FB.checkTierPromotions(s);
      out.fallenTier = p.tier;
      out.prestigeAfterFall = p.prestige;
      out.realmRank = s.realms.player.rank;
      out.vassalLoosed = s.realms.lapse_vassal.liege === null;
      out.lapseCleared = !p.titleLapse;

      // the slide continues while the substance is missing: a fresh duke
      // lapse stamps, then duke falls to count
      FB.checkTierPromotions(s);
      out.tierFiveStamped = !!p.titleLapse && p.titleLapse.tier === 5;
      s.turn += (B.titleLapseDemoteDays || 540) + 1;
      FB.checkTierPromotions(s);
      out.fallenAgain = p.tier;

      // a count holds his county: no lapse below tier 5
      out.countStamped = !!p.titleLapse;
      return out;
    });

    expect(result).toEqual({
      stamped: true,
      warnQueueBefore: false,
      warned: true,
      warnQueued: true,
      defyReset: true,
      fallenTier: 5,
      prestigeAfterFall: 60,
      realmRank: 2,
      vassalLoosed: true,
      lapseCleared: true,
      tierFiveStamped: true,
      fallenAgain: 4,
      countStamped: false
    });
  });

test('regaining the de jure substance clears the lapse', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    DSC.resetLanded(s);
    p.tier = 5;
    FB.foundPlayerRealm(s);
    s.realms.player.rank = 2;

    FB.checkTierPromotions(s);
    var stamped = !!p.titleLapse;

    // take both counties of a two-county duchy
    var duchyId = null;
    for (var did in FBDATA.duchies) {
      if (FB.duchyCounties(did).length === 2) { duchyId = did; break; }
    }
    var counties = duchyId ? FB.duchyCounties(duchyId) : [];
    for (var i = 0; i < counties.length; i++) {
      s.owner[counties[i]] = 'player';
      s.holder[counties[i]] = 'player';
      if (p.provs.indexOf(counties[i]) < 0) p.provs.push(counties[i]);
    }
    FB.invalidateRealmCache();
    FB.checkTierPromotions(s);
    return {
      stamped: stamped,
      duchyFound: !!duchyId,
      holdsDuchy: !!FB.playerDuchy(s),
      lapseCleared: !p.titleLapse,
      stillTier: p.tier
    };
  });

  expect(result).toEqual({
    stamped: true,
    duchyFound: true,
    holdsDuchy: true,
    lapseCleared: true,
    stillTier: 5
  });
});

test('a losing defender may kneel and keep his lands', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var out = {};
    var homeId = DSC.resetLanded(s);

    // a much stronger king presses the war home
    DSC.makeRealm(s, 'great_king', 'Great Kingdom', 3, null, homeId, me.religion, me.culture);
    var settled = FB.world.provs.filter(function (province) {
      return !province.wasteland && province.id !== homeId;
    });
    for (var i = 0; i < 6; i++) {
      s.owner[settled[i].id] = 'great_king';
      s.holder[settled[i].id] = 'great_king';
      s.dev[settled[i].id] = 12;
    }
    FB.invalidateRealmCache();

    p.war = { enemy:'great_king', target:null, wins:0, losses:0, seasons:2,
      defending:true, casus:{ type:'conquest' }, enemySiege:2 };

    out.eligible = FB.submissionOfferEligible(s);
    FB.maybeOfferSubmission(s);
    out.offered = DSC.queueIds(s).indexOf('war_submission_offer') >= 0;
    FB.maybeOfferSubmission(s);
    out.onceOnly = DSC.queueIds(s).filter(function (id) {
      return id === 'war_submission_offer';
    }).length === 1;
    out.stillValid = FB.fns.war_submission_valid(s);

    // kneel: the war dies, the land stays, the banner changes
    FB.fns.war_submit(s);
    out.warOver = p.war === null;
    out.newLiege = p.liege;
    out.landsKept = p.provs.length === 1 && s.holder[homeId] === 'player';
    out.ownerNow = s.owner[homeId];
    out.prestigeAfter = p.prestige;

    // and a count kneeling to a king keeps his rank — no lapse below tier 5
    FB.checkTierPromotions(s);
    out.tierAfter = p.tier;
    return out;
  });

  expect(result).toEqual({
    eligible: true,
    offered: true,
    onceOnly: true,
    stillValid: true,
    warOver: true,
    newLiege: 'great_king',
    landsKept: true,
    ownerNow: 'great_king',
    prestigeAfter: 85,
    tierAfter: 4
  });
});

test('no homage is offered by a weaker or equal foe', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var homeId = DSC.resetLanded(s);

    // a peer count with a weaker realm: no homage worth the name
    DSC.makeRealm(s, 'petty_foe', 'Petty March', 1, null, homeId, me.religion, me.culture);
    var settled = FB.world.provs.filter(function (province) {
      return !province.wasteland && province.id !== homeId;
    });
    s.owner[settled[0].id] = 'petty_foe';
    s.holder[settled[0].id] = 'petty_foe';
    s.dev[settled[0].id] = 1;
    FB.invalidateRealmCache();

    p.war = { enemy:'petty_foe', target:null, wins:0, losses:2, seasons:2,
      defending:true, casus:{ type:'conquest' }, enemySiege:2 };
    FB.maybeOfferSubmission(s);
    var peerOffered = DSC.queueIds(s).indexOf('war_submission_offer') >= 0;

    // a strong but equal-rank foe is no lord to kneel to
    DSC.makeRealm(s, 'strong_peer', 'Strong March', 1, null, homeId, me.religion, me.culture);
    for (var i = 1; i < 8; i++) {
      s.owner[settled[i].id] = 'strong_peer';
      s.holder[settled[i].id] = 'strong_peer';
      s.dev[settled[i].id] = 12;
    }
    FB.invalidateRealmCache();
    p.war = { enemy:'strong_peer', target:null, wins:0, losses:2, seasons:2,
      defending:true, casus:{ type:'conquest' }, enemySiege:2 };
    FB.maybeOfferSubmission(s);
    var equalOffered = DSC.queueIds(s).indexOf('war_submission_offer') >= 0;

    return { peerOffered: peerOffered, equalOffered: equalOffered };
  });

  expect(result).toEqual({ peerOffered: false, equalOffered: false });
});

async function configureAttainder(page) {
  await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var homeId = DSC.resetLanded(s);
    DSC.makeRealm(s, 'attainder_liege', 'High Duchy', 2, null, homeId, me.religion, me.culture);
    p.liege = 'attainder_liege';
    s.owner[homeId] = 'attainder_liege';
    s.realms.player.liege = 'attainder_liege';
    FB.adjustStanding(s, { kind:'realm', id:'attainder_liege' }, -100, 'test');
    p.flags.felony_mark = 1;
    FB.invalidateRealmCache();
  });
}

test('felony can be paid off and the mark buried', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  await configureAttainder(page);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var fine = FBDATA.balance.attainderFineByTier[p.tier];
    var before = p.gold;
    var standingBefore = FB.standingOf(s, { kind:'realm', id:'attainder_liege' });
    var risk = FB.fns.attainder_risk(s);
    var canPay = FB.fns.attainder_can_pay(s);
    FB.fns.attainder_pay(s);
    return {
      risk: risk,
      canPay: canPay,
      fine: fine,
      paid: before - p.gold,
      markCleared: !p.flags.felony_mark && !p.flags.felony_doom,
      standingRose: FB.standingOf(s, { kind:'realm', id:'attainder_liege' }) - standingBefore,
      tierKept: p.tier
    };
  });

  expect(result).toEqual({
    risk: true,
    canPay: true,
    fine: 30,
    paid: 30,
    markCleared: true,
    standingRose: 15,
    tierKept: 4
  });
});

test('yielding the fief escheats it to the liege and casts the family down', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  await configureAttainder(page);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var homeId = p.provinceId;
    p.flags.felony_doom = 1;
    FB.fns.attainder_yield(s);
    return {
      tier: p.tier,
      provsLeft: p.provs.length,
      escheatedOwner: s.owner[homeId],
      escheatedHolder: s.holder[homeId],
      liegeGone: p.liege === null,
      marksCleared: !p.flags.felony_mark && !p.flags.felony_doom
    };
  });

  expect(result).toEqual({
    tier: 2,
    provsLeft: 0,
    escheatedOwner: 'attainder_liege',
    escheatedHolder: 'attainder_liege',
    liegeGone: true,
    marksCleared: true
  });
});

test('resisting the sentence raises a rebellion against the liege', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  await configureAttainder(page);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    p.flags.felony_doom = 1;
    FB.fns.attainder_resist(s);
    return {
      atWar: !!(p.war && p.war.enemy === 'attainder_liege' && p.war.defending),
      liegeGone: p.liege === null,
      landsKept: p.provs.length === 1,
      tierKept: p.tier,
      marksCleared: !p.flags.felony_mark && !p.flags.felony_doom
    };
  });

  expect(result).toEqual({
    atWar: true,
    liegeGone: true,
    landsKept: true,
    tierKept: 4,
    marksCleared: true
  });
});

test('a beaten lord is taken, ransomed, or freed with the peace', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var out = {};
    var homeId = DSC.resetLanded(s);
    var oldChance = FBDATA.balance.captureChanceBase;

    DSC.makeRealm(s, 'captor', 'Captor March', 1, null, homeId, me.religion, me.culture);
    p.war = { enemy:'captor', target:null, wins:0, losses:1, seasons:1,
      defending:true, casus:{ type:'conquest' } };

    // certain capture when the dice leave no escape
    FBDATA.balance.captureChanceBase = 2;
    FB.maybeCapturePlayer(s);
    out.taken = p.flags.in_prison === 1;
    out.ransomQueued = DSC.queueIds(s).indexOf('prison_ransom') >= 0;
    out.still = FB.fns.prison_still(s);
    out.canPay = FB.fns.prison_can_pay(s);

    var ransom = FBDATA.balance.ransomByTier[p.tier];
    var before = p.gold;
    FB.fns.prison_pay(s);
    out.ransom = ransom;
    out.paid = before - p.gold;
    out.freed = !p.flags.in_prison;

    // taken again — and this time the price is a county (the last one)
    FB.maybeCapturePlayer(s);
    out.takenAgain = p.flags.in_prison === 1;
    FB.fns.prison_cede_land(s);
    out.countyLost = s.owner[homeId] === 'captor' && p.provs.length === 0;
    out.landlessTier = p.tier;
    out.realmDead = !s.realms.player || !s.realms.player.alive;

    // the peace opens a cell too
    p.tier = 4;
    p.war = { enemy:'captor', target:null, wins:0, losses:1, seasons:1,
      defending:true, casus:{ type:'conquest' } };
    FB.maybeCapturePlayer(s);
    out.takenOnceMore = p.flags.in_prison === 1;
    FB.endPlayerWar(s);
    out.releasedWithPeace = !p.flags.in_prison && p.war === null;

    // commoners are robbed, not ransomed: no capture below tier 3
    p.tier = 2;
    p.war = { enemy:'captor', target:null, wins:0, losses:1, seasons:1,
      defending:true, casus:{ type:'conquest' } };
    FB.maybeCapturePlayer(s);
    out.commonerSafe = !p.flags.in_prison;

    FBDATA.balance.captureChanceBase = oldChance;
    return out;
  });

  expect(result).toEqual({
    taken: true,
    ransomQueued: true,
    still: true,
    canPay: true,
    ransom: 40,
    paid: 40,
    freed: true,
    takenAgain: true,
    countyLost: true,
    landlessTier: 2,
    realmDead: true,
    takenOnceMore: true,
    releasedWithPeace: true,
    commonerSafe: true
  });
});

test('distraint strips goods, then applies the station-specific last claim', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var out = {};
    FB.game.setPaused(true);
    p.tier = 1;
    p.travel = null;
    p.flags = {};
    p.prestige = 20;

    function defaultedLoan(id, face, defaultTurn) {
      FB.ensureEconomy(s).loans.push({
        id:id, kind:'merchant', defaultKind:'revenue', status:'default',
        face:face, dueTurn:s.turn, defaultTurn:defaultTurn, arrears:1
      });
    }

    // fresh default inside the grace window: no writ yet
    defaultedLoan(9001, 30, s.turn - 10);
    out.graceSafe = !FB.fns.finance_in_default(s);
    out.graceDays = FB.financeDistraintDaysRemaining(s);
    // an old default past the grace window: the writ is due
    defaultedLoan(9002, 50, s.turn - 100);
    out.writDue = FB.fns.finance_in_default(s);

    // the bailiffs take holdings, then the plot, until the debt is covered
    p.holdings = ['hearth_garden', 'pack_mule'];
    p.landPlots = [{ provinceId:p.provinceId, settlement:0 }];
    FB.fns.distraint_seize(s);
    out.holdingsLeft = p.holdings.length;
    out.plotsLeft = p.landPlots.length;
    out.allSettled = FB.financeActiveLoans(s).filter(function (loan) {
      return loan.status === 'default';
    }).length === 0;
    out.noBondageYet = DSC.queueIds(s).indexOf('bondage_sentence') < 0;

    // nothing left to take: the bondage court sits
    defaultedLoan(9003, 60, s.turn - 100);
    FB.fns.distraint_seize(s);
    out.bondageQueued = DSC.queueIds(s).indexOf('bondage_sentence') >= 0;
    out.freeholderEvent = FB.eventById('bondage_sentence').title;
    FB.fns.bondage_submit(s);
    out.serfTier = p.tier;
    out.debtCleared = FB.financeActiveLoans(s).filter(function (loan) {
      return loan.status === 'default';
    }).length === 0;

    // gentry lose the manor first, their freedom later
    s.eventQueue = [];
    p.tier = 2;
    p.manor = { provinceId:p.provinceId, settlement:0 };
    defaultedLoan(9004, 40, s.turn - 100);
    FB.fns.distraint_seize(s);
    out.gentryQueued = DSC.queueIds(s).indexOf('manor_forfeit') >= 0;
    out.gentryEvent = FB.eventById('manor_forfeit').title;
    FB.fns.bondage_submit(s);
    out.gentryFallenTo = p.tier;
    out.manorGone = p.manor === null;

    // a serf cannot fall further: the debt is worked off in the lord's fields
    s.eventQueue = [];
    p.tier = 0;
    var prestigeBefore = p.prestige;
    defaultedLoan(9005, 20, s.turn - 100);
    FB.fns.distraint_seize(s);
    out.serfLaborQueued = DSC.queueIds(s).indexOf('debt_labor_sentence') >= 0;
    out.serfEvent = FB.eventById('debt_labor_sentence').title;
    FB.fns.bondage_submit(s);
    out.serfFloor = p.tier;
    out.serfPrestigeCost = prestigeBefore - p.prestige;
    return out;
  });

  expect(result).toEqual({
    graceSafe: true,
    graceDays: 80,
    writDue: true,
    holdingsLeft: 0,
    plotsLeft: 0,
    allSettled: true,
    noBondageYet: true,
    bondageQueued: true,
    freeholderEvent: 'Bound to the Land',
    serfTier: 0,
    debtCleared: true,
    gentryQueued: true,
    gentryEvent: 'The Manor Forfeit',
    gentryFallenTo: 1,
    manorGone: true,
    serfLaborQueued: true,
    serfEvent: 'Labor for the Debt',
    serfFloor: 0,
    serfPrestigeCost: 5
  });
});

test('finance discloses writ risk and permits a default to be settled',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var economy = FB.ensureEconomy(s);
      FB.game.setPaused(true);
      p.tier = 1;
      p.flags = {};
      p.gold = 100;
      economy.price = 1;
      economy.loans = [{
        id:9101, kind:'merchant', defaultKind:'revenue', status:'default',
        denomination:'real', face:30, dueTurn:s.turn,
        dueSeason:s.date.season, dueYear:s.date.year,
        defaultTurn:s.turn - 10, arrears:1
      }];
      FB.ui.showFinance();
    });

    await expect(page.locator('#gm-body')).toContainText(
      '80-day grace remaining before a creditor may seek a writ');
    const settle = page.getByRole('button', {
      name:/Settle default balance/
    });
    await expect(settle).toBeEnabled();
    await settle.click();
    await expect(page.getByRole('heading', {
      name:'Settle the default', exact:true
    })).toBeVisible();
    await page.getByRole('button', {
      name:/Settle defaults for/
    }).click();

    const result = await page.evaluate(function () {
      return {
        gold:FB.state.player.gold,
        defaults:FB.financeActiveLoans(FB.state).filter(function (loan) {
          return loan.status === 'default';
        }).length
      };
    });
    expect(result).toEqual({ gold:70, defaults:0 });

    await page.evaluate(function () {
      var offers = FB.financeLoanOffers;
      FB.financeLoanOffers = function () {
        return [{ kind:'merchant', principal:20, collateral:null }];
      };
      FB.ui.showFinanceLoanConfirm('merchant', null);
      FB.financeLoanOffers = offers;
    });
    await expect(page.locator('#gm-body')).toContainText(
      'If the default remains after 90 days');
    await expect(page.locator('#gm-body')).toContainText(
      'the lord’s court may seize household holdings and land');
  });

test('the writ explains distraint and the exact property and station at risk',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var economy = FB.ensureEconomy(s);
      FB.game.setPaused(true);
      p.tier = 1;
      p.flags = {};
      p.gold = 0;
      p.holdings = ['hearth_garden'];
      p.landPlots = [{ provinceId:p.provinceId, settlement:0 }];
      economy.price = 1;
      economy.loans = [{
        id:9102, kind:'merchant', defaultKind:'revenue', status:'default',
        denomination:'real', face:40, dueTurn:s.turn,
        dueSeason:s.date.season, dueYear:s.date.year,
        defaultTurn:s.turn - 100, arrears:1
      }];
      FB.ui.runEvents([{ id:'distraint_writ', ctx:{} }]);
    });

    await expect(page.locator('#ev-title')).toHaveText('A Writ of Distraint');
    const text = page.locator('#ev-text');
    await expect(text).toContainText('What distraint means');
    await expect(text).toContainText(
      'Distraint is a court order allowing bailiffs to seize household property');
    await expect(text.locator('.kv').filter({
      hasText:'Outstanding default'
    }).locator('b')).toContainText('40');
    await expect(text).toContainText('Hearth Garden');
    await expect(text.locator('.kv').filter({
      hasText:'Land plots at risk'
    }).locator('b')).toHaveText('1');
    await expect(text).toContainText(
      'The debt is extinguished and the household becomes Serf.');
  });

test('raiders burn the home parish and the lord sells his wall', async function ({ page }, testInfo) {
  await startGame(page, testInfo);
  var result = await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var out = {};
    FB.game.setPaused(true);
    p.tier = 1;
    p.travel = null;
    p.flags = {};
    p.gold = 10;
    var homeId = p.provinceId;
    var sovereignId = s.owner[homeId];
    var oldChance = FBDATA.balance.devastationChance;

    DSC.makeRealm(s, 'raid_realm', 'Raid Host', 3, null, homeId, me.religion, me.culture);
    s.realms.raid_realm.war = { enemy:sovereignId };
    s.armies = [{ realm:'raid_realm', at:homeId, men:120 }];
    s.greatHolyWar = null;

    out.sovereignFound = !!sovereignId && sovereignId !== 'player';
    out.hostAtHome = FB.hostileHostAtHome(s);

    FBDATA.balance.devastationChance = 1;
    FB.devastationSeason(s);
    out.firstBurning = p.flags.home_burned === 1;
    out.raidersQueued = DSC.queueIds(s).indexOf('devastation_raiders') >= 0;

    FB.devastationSeason(s);
    out.secondBurning = p.flags.home_burned2 === 1;
    out.bargainQueued = DSC.queueIds(s).indexOf('devastation_protection') >= 0;

    // the raid takes a holding when luck fails
    p.holdings = ['orchard'];
    FB.fns.devastation_lose_holding(s);
    out.holdingBurned = p.holdings.length === 0;
    // and bare coin when there is nothing else
    var goldBefore = p.gold;
    FB.fns.devastation_lose_holding(s);
    out.coinLost = goldBefore - p.gold;

    // the old bargain: his wall for the family's freedom
    FB.fns.devastation_commend(s);
    out.commendedTier = p.tier;
    out.protected = p.flags.lord_protection === 1;
    FB.devastationSeason(s);
    out.noMoreBurning = !p.flags.home_burned && !p.flags.home_burned2;

    // when the host marches on, the memory of burning fades
    delete p.flags.lord_protection;
    p.flags.home_burned = 1;
    s.armies = [];
    FB.devastationSeason(s);
    out.memoryFaded = !p.flags.home_burned;

    FBDATA.balance.devastationChance = oldChance;
    return out;
  });

  expect(result).toEqual({
    sovereignFound: true,
    hostAtHome: true,
    firstBurning: true,
    raidersQueued: true,
    secondBurning: true,
    bargainQueued: true,
    holdingBurned: true,
    coinLost: 5,
    commendedTier: 0,
    protected: true,
    noMoreBurning: true,
    memoryFaded: true
  });
});
