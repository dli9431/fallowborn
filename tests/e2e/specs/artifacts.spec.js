'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/items.js',
  'js/actions.js',
  'js/events.js',
  'js/world.js',
  'data/map_data.js',
  'data/cultures.js',
  'data/events_artifacts.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Legendary and sacred artifacts: each definition's `artifact` gate (faith,
   culture, de jure region of the home county) decides whether the rumor can
   surface; claiming one stamps state.artifacts once per save; loss is derived
   from FB.itemOwner so a departed artifact never re-enters a pool. Every
   artifact carries a double-edged fx profile, and alienating a sacred
   artifact of the player's own faith costs piety and Common Voice. */

test('gates each artifact by faith, culture, and de jure region',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      function move(empireOrKingdom, key) {
        const prov = FB.world.provs.filter(function (p) {
          return FB.dejureOf(p.id)[key] === empireOrKingdom;
        })[0];
        s.player.provinceId = prov.id;
        return prov.id;
      }
      const out = {};

      /* Excalibur: a christian in Britannia only */
      me.religion = 'norse_pagan';
      move('e_britannia', 'empire');
      out.paganInBritannia = FB.artifactEligible(s, 'excalibur');
      me.religion = 'catholic';
      out.catholicInBritannia = FB.artifactEligible(s, 'excalibur');
      move('e_persia', 'empire');
      out.catholicInPersia = FB.artifactEligible(s, 'excalibur');

      /* Mjölnir: norse pagan in Scandinavia */
      me.religion = 'norse_pagan';
      move('e_scandinavia', 'empire');
      out.norseInScandinavia = FB.artifactEligible(s, 'mjolnir_amulet');
      me.religion = 'catholic';
      out.catholicInScandinavia = FB.artifactEligible(s, 'mjolnir_amulet');

      /* the Book of Kells adds a culture gate: gaelic only */
      me.religion = 'catholic';
      move('k_ireland', 'kingdom');
      const oldCulture = me.culture;
      me.culture = 'frankish';
      out.frankishInIreland = FB.artifactEligible(s, 'book_of_kells');
      me.culture = 'gaelic';
      out.gaelicInIreland = FB.artifactEligible(s, 'book_of_kells');
      me.culture = oldCulture;

      /* the rumor selector sees exactly the eligible set */
      me.religion = 'catholic';
      move('e_britannia', 'empire');
      const rumors = FB.artifactRumorContexts(s).map(function (c) {
        return c.artifact;
      });
      out.rumorHasExcalibur = rumors.indexOf('excalibur') >= 0;
      out.rumorHasMjolnir = rumors.indexOf('mjolnir_amulet') >= 0;
      out.selectorMatches = FB.eventContextOptions(s, 'artifact_rumors')
        .length === rumors.length;
      return out;
    });

    expect(result.paganInBritannia).toBe(false);
    expect(result.catholicInBritannia).toBe(true);
    expect(result.catholicInPersia).toBe(false);
    expect(result.norseInScandinavia).toBe(true);
    expect(result.catholicInScandinavia).toBe(false);
    expect(result.frankishInIreland).toBe(false);
    expect(result.gaelicInIreland).toBe(true);
    expect(result.rumorHasExcalibur).toBe(true);
    expect(result.rumorHasMjolnir).toBe(false);
    expect(result.selectorMatches).toBe(true);
  });

test('claims an artifact exactly once and derives its loss forever',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      s.player.provinceId = FB.world.provs.filter(function (p) {
        return FB.dejureOf(p.id).empire === 'e_britannia';
      })[0].id;
      const out = {};
      out.granted = FB.fns.artifact_grant(s, { artifact:'excalibur' });
      out.stamped = !!(s.artifacts && s.artifacts.excalibur);
      out.held = FB.artifactStatus(s, 'excalibur');
      out.regrant = FB.fns.artifact_grant(s, { artifact:'excalibur' });
      out.stillRumored = FB.artifactRumorContexts(s).some(function (c) {
        return c.artifact === 'excalibur';
      });
      out.coveted = FB.eventContextOptions(s, 'artifact_held').some(
        function (c) { return c.artifact === 'excalibur'; });
      /* succession wipes per-life event memory, not the artifact stamp */
      s.player.fired = {};
      s.player.cooldowns = {};
      s.player.flags = {};
      out.eligibleAfterSuccessionReset = FB.artifactEligible(s, 'excalibur');
      /* selling the legend ends it for this save */
      s.player.gold = 0;
      FB.sellItem(s, 'excalibur');
      out.goneStatus = FB.artifactStatus(s, 'excalibur');
      out.eligibleAfterLoss = FB.artifactEligible(s, 'excalibur');
      out.rumoredAfterLoss = FB.artifactRumorContexts(s).some(function (c) {
        return c.artifact === 'excalibur';
      });
      return out;
    });

    expect(result.granted).toBe(true);
    expect(result.stamped).toBe(true);
    expect(result.held).toBe('held');
    expect(result.regrant).toBe(false);
    expect(result.stillRumored).toBe(false);
    expect(result.coveted).toBe(true);
    expect(result.eligibleAfterSuccessionReset).toBe(false);
    expect(result.goneStatus).toBe('gone');
    expect(result.eligibleAfterLoss).toBe(false);
    expect(result.rumoredAfterLoss).toBe(false);
  });

test('the trial offering charges exactly the scaled value once',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'norse_pagan';
      s.player.provinceId = FB.world.provs.filter(function (p) {
        return FB.dejureOf(p.id).empire === 'e_scandinavia';
      })[0].id;
      const cost = FB.artifactOfferingCost(s, 'gungnir');
      const expected = Math.max(1, Math.ceil(
        FBDATA.items.gungnir.value * FBDATA.balance.artifactOfferingRatio));
      s.player.gold = cost - 1;
      const poor = FB.fns.artifact_offering(s, { artifact:'gungnir' });
      s.player.gold = cost;
      const rich = FB.fns.artifact_offering(s, { artifact:'gungnir' });
      return {
        cost:cost,
        expected:expected,
        poorRefused:poor === false,
        richPaid:rich === true && s.player.gold === 0,
        held:FB.artifactStatus(s, 'gungnir')
      };
    });

    expect(result.cost).toBe(result.expected);
    expect(result.poorRefused).toBe(true);
    expect(result.richPaid).toBe(true);
    expect(result.held).toBe('held');
  });

test('a held artifact can be seized and never returns',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      s.player.provinceId = FB.world.provs.filter(function (p) {
        return FB.dejureOf(p.id).empire === 'e_britannia';
      })[0].id;
      const out = {};
      out.seizeUnclaimed = FB.fns.artifact_seize(s, { artifact:'excalibur' });
      FB.fns.artifact_grant(s, { artifact:'excalibur' });
      out.seized = FB.fns.artifact_seize(s, { artifact:'excalibur' });
      out.status = FB.artifactStatus(s, 'excalibur');
      out.owner = FB.itemOwner(s, 'excalibur');
      out.eligible = FB.artifactEligible(s, 'excalibur');
      return out;
    });

    expect(result.seizeUnclaimed).toBe(false);
    expect(result.seized).toBe(true);
    expect(result.status).toBe('gone');
    expect(result.owner).toBe(null);
    expect(result.eligible).toBe(false);
  });

test('selling a sacred artifact of your own faith costs the devout',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      s.player.provinceId = FB.world.provs.filter(function (p) {
        return FB.dejureOf(p.id).empire === 'e_francia';
      })[0].id;
      s.player.piety = 50;
      s.player.pop = 0;
      FB.fns.artifact_grant(s, { artifact:'durendal' });
      FB.sellItem(s, 'durendal');
      const out = {
        piety:s.player.piety,
        pop:s.player.pop
      };
      /* a non-sacred legend parts without the muttering */
      s.player.provinceId = FB.world.provs.filter(function (p) {
        return FB.dejureOf(p.id).empire === 'e_britannia';
      })[0].id;
      s.player.piety = 50;
      s.player.pop = 0;
      FB.fns.artifact_grant(s, { artifact:'excalibur' });
      FB.sellItem(s, 'excalibur');
      out.pietyAfterMundane = s.player.piety;
      out.popAfterMundane = s.player.pop;
      return out;
    });

    expect(result.piety).toBe(42);
    expect(result.pop).toBe(-4);
    expect(result.pietyAfterMundane).toBeGreaterThan(42);
    expect(result.popAfterMundane).toBe(0);
  });

test('artifact drawbacks flow through the same bonus channels as boons',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      s.player.provinceId = FB.world.provs.filter(function (p) {
        return FB.dejureOf(p.id).empire === 'e_britannia';
      })[0].id;
      FB.fns.artifact_grant(s, { artifact:'excalibur' });
      FB.equipItem(s, s.player.charId, 'rightHand', 'excalibur');
      return {
        mar:FB.itemBonus(s, 'mar'),
        battle:FB.itemBonus(s, 'battle'),
        health:FB.itemBonus(s, 'health'),
        prestige:FB.itemBonus(s, 'prestige'),
        skillFloor:FB.skillOf(me, 'mar') >= 0
      };
    });

    expect(result.mar).toBe(3);
    expect(result.battle).toBeCloseTo(0.05, 5);
    expect(result.prestige).toBe(2);
    expect(result.health).toBeCloseTo(-0.004, 5);
    expect(result.skillFloor).toBe(true);
  });
