'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/wars.js', 'js/world.js', 'js/treasury.js', 'js/ui_wars.js', 'js/ui_misc.js',
  'data/technology.js', 'data/map_data.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

/* Starts a defensive war over the second home county, closing the fixture's
   offensive war if it is still active. */
async function defendSecondCounty(page, ids) {
  return page.evaluate(function (ids) {
    const s = FB.state;
    FB.realmWars(s, 'player').forEach(function (w) {
      FB.settleOrdinaryWar(s, w.id, 'invalid');
    });
    s.truces = {};
    const war = FB.registerOrdinaryWar(s, 'player', {
      enemy:ids.enemy, target:ids.second, wins:0, losses:2, seasons:6, strength:1,
      defending:true, casus:{ type:'fabricated' } });
    FB.warFooting(s);
    s.eventQueue = [];
    return war.id;
  }, ids);
}

test('war balance is a bounded read-only projection that sets offer chances', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, id = FB.realmWars(s, 'player')[0].id;
    const before = JSON.stringify(s), rng = FB.getRngState();
    const balance = FB.warBalance(s, id), options = FB.warPeaceOptions(s, id);
    const w = FB.ordinaryWarById(s, id);
    w.losses = 9; w.wins = 0;
    const losing = FB.warPeaceOptions(s, id);
    w.losses = 2; w.wins = 3;
    return { same:JSON.stringify(s) === before && FB.getRngState() === rng,
      bounded:balance.total >= -100 && balance.total <= 100,
      sum:balance.total === FB.clamp(balance.occupation + balance.battles + balance.strength, -100, 100),
      whiteDrops:losing.white.chance < options.white.chance,
      demandBlocked:!losing.demand.ready && /war balance/.test(losing.demand.reason) };
  });
  expect(result).toEqual({ same:true, bounded:true, sum:true, whiteDrops:true, demandBlocked:true });
});

test('a refused white peace keeps the war and blocks another offer for a season', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, id = FB.realmWars(s, 'player')[0].id, chance = FB.chance;
    FB.chance = function () { return false; };
    let refused, retry;
    try { refused = FB.proposeWarPeace(s, id, 'white'); retry = FB.proposeWarPeace(s, id, 'white'); }
    finally { FB.chance = chance; }
    const blocked = FB.warPeaceOptions(s, id).white;
    s.turn += 90;
    FB.chance = function () { return true; };
    let accepted;
    try { accepted = FB.proposeWarPeace(s, id, 'white'); } finally { FB.chance = chance; }
    return { refused:refused.accepted, retry:retry, blocked:!blocked.ready && /days/.test(blocked.reason),
      accepted:accepted.accepted, ended:!FB.ordinaryWarById(s, id), provs:s.player.provs.slice().sort() };
  });
  expect(result).toEqual({ refused:false, retry:null, blocked:true, accepted:true, ended:true,
    provs:[ids.home, ids.second].sort() });
});

test('a winning side can demand tribute without taking land', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, id = FB.realmWars(s, 'player')[0].id, w = FB.ordinaryWarById(s, id);
    // Field wins plus a held (not yet awarded) objective guarantee a winning balance.
    w.wins = 6; w.losses = 0;
    w.occupations[w.objectives[0].target] = Object.assign({}, w.occupations[w.objectives[0].target], { occupied:true });
    const option = FB.warPeaceOptions(s, id).demand;
    const gold = s.player.gold, prestige = s.player.prestige, chance = FB.chance;
    FB.chance = function () { return true; };
    let outcome;
    try { outcome = FB.proposeWarPeace(s, id, 'demand'); } finally { FB.chance = chance; }
    return { ready:option.ready, kind:option.kind, ended:!FB.ordinaryWarById(s, id),
      gold:s.player.gold - gold === outcome.gold, withinCap:outcome.gold <= 25,
      prestige:s.player.prestige - prestige === option.prestige,
      targetKept:s.owner[w.target] !== 'player' };
  });
  expect(result).toEqual({ ready:true, kind:'tribute', ended:true, gold:true, withinCap:true,
    prestige:true, targetKept:true });
});

test('a defender can cede only the contested objective to end the war', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const id = await defendSecondCounty(page, ids);
  const result = await page.evaluate(function (args) {
    const s = FB.state, option = FB.warPeaceOptions(s, args.id).concede;
    const ceded = FB.concedeWarObjectives(s, args.id);
    return { counties:option.counties, ceded:ceded, ended:!FB.ordinaryWarById(s, args.id),
      provs:s.player.provs.slice(), lost:s.owner[args.second] !== 'player' };
  }, { id:id, second:ids.second });
  expect(result).toEqual({ counties:[ids.second], ceded:true, ended:true, provs:[ids.home], lost:true });
});

test('submission is offered only when the enemy qualifies and makes them liege', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const id = await defendSecondCounty(page, ids);
  const result = await page.evaluate(function (args) {
    const s = FB.state, eligible = FB.submissionOfferEligible;
    // Eligibility is authored in world.js; the stub isolates the settlement itself.
    FB.submissionOfferEligible = function () { return true; };
    let offered, submitted;
    try { offered = !!FB.warPeaceOptions(s, args.id).submit; submitted = FB.submitInWar(s, args.id); }
    finally { FB.submissionOfferEligible = eligible; }
    return { offered:offered, submitted:submitted, liege:s.player.liege === args.enemy,
      kept:s.player.provs.indexOf(args.second) >= 0 };
  }, { id:id, enemy:ids.enemy, second:ids.second });
  expect(result).toEqual({ offered:true, submitted:true, liege:true, kept:true });
});

test('the campaign peace section shows chances, blockers and always-available exits', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:740 });
  await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state, id = FB.realmWars(s, 'player')[0].id, w = FB.ordinaryWarById(s, id);
    w.wins = 0; w.losses = 2;
    FB.ui.showCampaign(id);
  });
  await expect(page.locator('#campaign-balance-details-section .kv').first()).toContainText('War balance');
  await expect(page.locator('#campaign-white-peace')).toContainText('% chance');
  await expect(page.locator('#campaign-demand')).toBeDisabled();
  await expect(page.locator('#campaign-demand')).toContainText('war balance');
  await expect(page.locator('#campaign-peace')).toBeEnabled();
  await expect(page.locator('#campaign-concede')).toHaveCount(0);
  await expect(page.locator('#campaign-white-peace-details')).toBeHidden();
});

test('unilateral peace is always accepted but expensive', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const withdraw = await page.evaluate(function () {
    const s = FB.state, id = FB.realmWars(s, 'player')[0].id, w = FB.ordinaryWarById(s, id);
    const cost = FB.warTermsCost(s, w), prestige = s.player.prestige;
    const support = s.player.provs.map(function (pid) { return FB.countySupportBase(s, pid); });
    FB.withOrdinaryWar(s, id, function () { FB.fns.war_terms(s); });
    return { cost:cost.prestige, lost:prestige - s.player.prestige, ended:!FB.ordinaryWarById(s, id),
      support:s.player.provs.map(function (pid, i) { return FB.countySupportBase(s, pid) - support[i]; }) };
  });
  expect(withdraw.cost).toBe(30);
  expect(withdraw.lost).toBe(30);
  expect(withdraw.ended).toBe(true);
  withdraw.support.forEach(function (change) { expect(change).toBeLessThan(0); });

  const id = await defendSecondCounty(page, ids);
  const bought = await page.evaluate(function (id) {
    const s = FB.state, w = FB.ordinaryWarById(s, id), enemy = s.realms[w.enemy];
    const cost = FB.warTermsCost(s, w);
    const expected = Math.max(50, 40 * (enemy.rank || 1) + 10 * (w.losses || 0));
    s.player.gold = cost.gold - 1;
    const refused = FB.withOrdinaryWar(s, id, function () { return FB.fns.war_terms(s); });
    const stillAtWar = !!FB.ordinaryWarById(s, id);
    s.player.gold = cost.gold + 5;
    FB.withOrdinaryWar(s, id, function () { FB.fns.war_terms(s); });
    return { gold:cost.gold, expected:expected, prestige:cost.prestige, refused:refused,
      stillAtWar:stillAtWar, left:s.player.gold, ended:!FB.ordinaryWarById(s, id) };
  }, id);
  expect(bought).toEqual({ gold:bought.expected, expected:bought.expected, prestige:20, refused:false,
    stillAtWar:true, left:5, ended:true });
});

/* A count sworn to a duke who is himself sworn to a king. */
async function renounceIntermediateLord(page) {
  return page.evaluate(function () {
    const s = FB.state, p = s.player;
    FB.settleOrdinaryWar(s, FB.realmWars(s, 'player')[0].id, 'invalid');
    s.truces = {};
    const duke = Object.keys(s.realms).sort().filter(function (rid) {
      const r = s.realms[rid];
      return rid !== 'player' && r.alive && r.liege && s.realms[r.liege] &&
        s.realms[r.liege].alive && !s.realms[r.liege].liege && r.rank > 1;
    })[0];
    const king = s.realms[duke].liege;
    FB.changePlayerLiege(s, duke, 'test');
    FB.foundPlayerRealm(s);
    FB.doIndependence(s);
    s.eventQueue = [];
    const w = FB.realmWars(s, 'player')[0];
    return { duke:duke, king:king, id:w.id, enemy:w.enemy, former:w.casus.formerLiege, liege:p.liege };
  });
}

test('abandoning a rebellion against an intermediate lord returns the player to that lord', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const setup = await renounceIntermediateLord(page);
  expect(setup.enemy).toBe(setup.king);
  expect(setup.former).toBe(setup.duke);
  expect(setup.liege).toBeNull();
  const result = await page.evaluate(function (setup) {
    const s = FB.state;
    const options = FB.warPeaceOptions(s, setup.id);
    s.player.gold = 5000;
    FB.withOrdinaryWar(s, setup.id, function () { FB.fns.war_terms(s); });
    return { quoted:options.returnLiege, demand:options.demand.kind, liege:s.player.liege,
      realmLiege:s.realms.player.liege, owner:s.owner[s.player.provs[0]], top:FB.topRealm(s, 'player') };
  }, setup);
  expect(result).toEqual({ quoted:setup.duke, demand:'recognition', liege:setup.duke,
    realmLiege:setup.duke, owner:setup.king, top:setup.king });
});

for (const pressed of [false, true]) {
  test('exhaustion of a ' + (pressed ? 'contested' : 'never contested') + ' rebellion ' +
      (pressed ? 'returns the rebel' : 'secures independence'), async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    const setup = await renounceIntermediateLord(page);
    const result = await page.evaluate(function (args) {
      const s = FB.state, w = FB.ordinaryWarById(s, args.setup.id), chance = FB.chance;
      w.seasons = 9; w.wins = 0; w.losses = 0; w.enemySiege = 0; w.enemyTarget = null; w.battles = [];
      if (args.pressed) w.sovereignPressed = 1;
      FB.chance = function () { return false; };
      try { FB.playerWarTick(s); } finally { FB.chance = chance; }
      return { ended:!FB.ordinaryWarById(s, args.setup.id) || FB.ordinaryWarById(s, args.setup.id).status === 'ended',
        liege:s.player.liege };
    }, { setup:setup, pressed:pressed });
    expect(result).toEqual({ ended:true, liege:pressed ? setup.duke : null });
  });
}

test('a rebel who submits kneels to the renounced lord', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const setup = await renounceIntermediateLord(page);
  const submitted = await page.evaluate(function (setup) {
    const s = FB.state, eligible = FB.submissionOfferEligible;
    FB.submissionOfferEligible = function () { return true; };
    try { FB.submitInWar(s, setup.id); } finally { FB.submissionOfferEligible = eligible; }
    return s.player.liege;
  }, setup);
  expect(submitted).toBe(setup.duke);
});

test('an accepted demand for recognition keeps the rebel independent', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const setup = await renounceIntermediateLord(page);
  const recognized = await page.evaluate(function (setup) {
    const s = FB.state, chance = FB.chance, balance = FB.warBalance;
    // A fixed winning balance isolates the settlement from relative realm strength.
    FB.warBalance = function () { return { total:60, occupation:0, battles:30, strength:30,
      occupied:0, objectives:0, seasons:4 }; };
    FB.chance = function () { return true; };
    let option;
    try {
      option = FB.warPeaceOptions(s, setup.id).demand;
      FB.proposeWarPeace(s, setup.id, 'demand');
    } finally { FB.chance = chance; FB.warBalance = balance; }
    return { ready:option.ready, kind:option.kind, gold:option.gold, liege:s.player.liege,
      ended:!FB.ordinaryWarById(s, setup.id) };
  }, setup);
  expect(recognized).toEqual({ ready:true, kind:'recognition', gold:0, liege:null, ended:true });
});
