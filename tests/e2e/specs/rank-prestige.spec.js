'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['data/economy.js', 'js/economy.js', 'js/main.js',
  'js/actions.js', 'js/ui_topbar.js', 'js/papacy.js', 'js/save.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('current ranks add flat yearly prestige and inactive ranks stop contributing', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    c.born = s.date.year - 35;
    c.religion = 'catholic';
    c.career = { profession:'craftsman', rank:'master', chosen:true,
      guildRank:'guildmaster', experience:20, guildStanding:60 };
    c.religiousRanks = { catholic_lay:3, catholic_clerical:5 };
    s.player.flags = {};
    s.player.tier = 4;
    const guild = ['none', 'member', 'master', 'officer', 'guildmaster'].map(function (rank) {
      c.career.guildRank = rank;
      return FB.rankPrestigeYearly(s).guild;
    });
    c.career.guildRank = 'guildmaster';
    const combined = FB.rankPrestigeYearly(s);
    const ruling = [0, 1, 2, 3, 4, 5, 6, 7].map(function (tier) {
      s.player.tier = tier;
      return FB.rankPrestigeYearly(s).ruling;
    });
    s.player.tier = 1;
    // An archived clerical ladder alone is not a live office after leaving it.
    c.bishopricVacatedTurn = s.turn;
    const inactive = FB.rankPrestigeYearly(s);
    c.career.profession = 'priest';
    c.religiousRanks.catholic_clerical = 4;
    const clergy = FB.rankPrestigeYearly(s);
    c.religion = 'muslim';
    const converted = FB.rankPrestigeYearly(s);
    c.career.profession = 'monk';
    c.religiousRanks.muslim_scholar = 5;
    const scholar = FB.rankPrestigeYearly(s);
    c.religion = 'catholic';
    s.papacy = { cardinals:{}, obediences:{} };
    s.papacy.cardinals[c.id] = { office:'cardinal' };
    const cardinal = FB.rankPrestigeYearly(s);
    s.papacy.obediences.test = { status:'active', claimantId:c.id };
    const pope = FB.rankPrestigeYearly(s);
    c.born = s.date.year - 12;
    const child = FB.rankPrestigeYearly(s);
    c.dead = true;
    s.player.tier = 6;
    const dead = FB.rankPrestigeYearly(s);
    return { guild:guild, combined:combined, ruling:ruling, inactive:inactive,
      clergy:clergy, converted:converted, scholar:scholar, cardinal:cardinal,
      pope:pope, child:child, dead:dead };
  });
  expect(result.guild).toEqual([0, 2, 5, 10, 20]);
  expect(result.ruling).toEqual([0, 0, 0, 12, 24, 40, 60, 90]);
  expect(result.combined).toEqual({ ruling:24, guild:20, religious:24, total:68 });
  expect(result.inactive).toEqual({ ruling:0, guild:20, religious:4, total:24 });
  expect(result.clergy).toEqual({ ruling:0, guild:0, religious:12, total:12 });
  expect(result.converted.total).toBe(0);
  expect(result.scholar.religious).toBe(24);
  expect(result.cardinal.religious).toBe(40);
  expect(result.pope.religious).toBe(60);
  expect(result.child.total).toBe(0);
  expect(result.dead.total).toBe(0);
});

test('prestige breakdown separates yearly ranks from seasonal income and survives loading', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    s.player.tier = 1;
    c.born = s.date.year - 30;
    c.career = { profession:'craftsman', rank:'master', chosen:true,
      guildRank:'guildmaster', experience:15, guildStanding:50 };
    c.religion = 'catholic';
    c.religiousRanks = { catholic_lay:0 };
    const before = FB.incomeBreakdown(s).prestige;
    const html = FB.ui._shared.statBreakdownHtml('prestige');
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const loaded = FB.incomeBreakdown(FB.state).prestige;
    return { before:before, loaded:loaded, html:html };
  });
  expect(result.before.annualTotal).toBe(20);
  expect(result.before.annualLines).toEqual([{ label:'Guild rank (yearly)', amount:20 }]);
  expect(result.before.lines.some(function (line) { return line.label === 'Guild rank (yearly)'; })).toBe(false);
  expect(result.loaded.annualLines).toEqual(result.before.annualLines);
  expect(result.loaded.annualTotal).toBe(20);
  expect(result.html).toContain('Each new year');
  expect(result.html).toContain('Paid once when the year turns');
});

[
  { name:'new year', season:3, day:90, observe:false, expected:20 },
  { name:'ordinary season', season:1, day:90, observe:false, expected:0 },
  { name:'ordinary day', season:3, day:40, observe:false, expected:0 },
  { name:'Observe year', season:3, day:90, observe:true, expected:0 }
].forEach(function (scenario) {
  test('rank prestige payment at ' + scenario.name, async function ({ page }) {
    const result = await page.evaluate(function (scenario) {
      const s = FB.state, c = s.chars[s.player.charId];
      FB.game.setPaused(true);
      s.player.tier = 1;
      s.player.gold = 10000;
      s.player.prestige = 10000;
      s.player.flags.tutorial_done = 1;
      delete s.player.flags.tutorial;
      c.born = s.date.year - 30;
      c.career = { profession:'craftsman', rank:'master', chosen:true,
        guildRank:'guildmaster', experience:15, guildStanding:50 };
      c.religion = 'catholic';
      c.religiousRanks = { catholic_lay:0 };
      s.date.season = scenario.season;
      s.date.day = scenario.day;
      s.eventQueue = [];
      s.slotDays = [];
      const snapshot = FB.save.serialize();
      const rates = FBDATA.rankPrestigeYearly;
      const pick = FB.pickDailyEvents;
      FB.pickDailyEvents = function () { return []; };
      function advance(enabled) {
        FB.save.restore(JSON.parse(snapshot));
        FB.game.observe = scenario.observe;
        FBDATA.rankPrestigeYearly = enabled ? rates : {};
        FB.game.passDay({ skipFocus:true, deferUi:true });
        const first = FB.state.player.prestige;
        FB.save.restore(JSON.parse(FB.save.serialize()));
        FB.game.observe = scenario.observe;
        FB.state.eventQueue = [];
        FB.game.passDay({ skipFocus:true, deferUi:true });
        return { first:first, second:FB.state.player.prestige };
      }
      try {
        const baseline = advance(false), bonus = advance(true);
        return { first:bonus.first - baseline.first, second:bonus.second - baseline.second };
      } finally {
        FBDATA.rankPrestigeYearly = rates;
        FB.pickDailyEvents = pick;
        FB.game.observe = false;
      }
    }, scenario);
    expect(result.first).toBeCloseTo(scenario.expected, 6);
    expect(result.second).toBeCloseTo(scenario.expected, 6);
  });
});
