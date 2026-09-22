'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/crazygames.js', 'index.html', 'data/distribution_crazygames.js', 'data/events_paths.js',
  'data/events_common.js', 'data/events_war.js', 'data/events_travel.js',
  'data/events_world.js', 'data/events_intrigue.js', 'data/events_noble.js',
  'data/events_tournament.js', 'data/events_lifepaths.js', 'data/events_peasant.js',
  'data/events_artifacts.js', 'data/events_council.js', 'data/events_parliament.js',
  'data/events_politics.js', 'data/events_communities.js', 'data/traits.js',
  'data/intrigue.js', 'data/map_data.js', 'js/util.js', 'js/events.js',
  'js/justice.js', 'js/intrigue.js', 'js/model.js', 'js/mods.js', 'js/save.js',
  'js/main.js', 'js/i18n.js', 'js/ui_modals.js', 'js/world.js',
  'data/lang_en.js', 'data/lang_fr.js'
]);
const { test, expect } = require('../support/fixture');
const { mockCrazyGames } = require('../support/crazygames');
test.beforeEach(async function ({ page }) { await mockCrazyGames(page); });
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startWarSafety } = require('../support/game/war-safety');

async function restrictedBoot(page, testInfo) {
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

for (const distribution of ['standard', 'crazygames']) {
  test(distribution + ' resolves the camp activity with its own mechanics', async function ({ page }, testInfo) {
    if (distribution === 'crazygames') {
      await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    }
    await openGame(page, testInfo);
    if (distribution === 'crazygames') await expect(page.locator('#btn-mods')).toBeHidden();
    else await expect(page.locator('#btn-mods')).toBeVisible();
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const event = FB.eventById('first_muster');
      const before = s.player.gold;
      const originalChance = FB.chance;
      let receipt;
      try {
        FB.chance = function () { return true; };
        receipt = FB.resolveEventOption(s, event, event.options[1], {}, { automated:true });
      } finally { FB.chance = originalChance; }
      return {
        resolved:!!receipt, gold:s.player.gold - before, label:event.options[1].label,
        plotAvailable:!!FBDATA.plots.assassination,
        spousePlotAvailable:!!FBDATA.plots.widow_veil,
        traitName:FBDATA.traits.drunkard.name,
        savedProfile:JSON.parse(FB.save.serialize()).mods
      };
    });
    expect(result.resolved).toBe(true);
    expect(result.gold).toBe(distribution === 'crazygames' ? 0 : 3);
    expect(result.plotAvailable).toBe(distribution !== 'crazygames');
    expect(result.spousePlotAvailable).toBe(distribution !== 'crazygames');
    expect(result.traitName).toBe(distribution === 'crazygames' ? 'Overindulgent' : 'Drunkard');
    if (distribution === 'crazygames') {
      expect(result.label).toBe('Trade stories with the veterans.');
      expect(result.savedProfile).toBe('crazygames-content-1');
    } else {
      expect(result.label).toBe('Dice with the veterans instead.');
      expect(result.savedProfile).toBe('');
    }
  });
}

test('CrazyGames save round-trip preserves profile and rejects ordinary imports before mutation', async function ({ page }, testInfo) {
  await restrictedBoot(page, testInfo);
  const result = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const state = FB.state;
    const rng = FB.getRngState();
    const foreign = JSON.parse(JSON.stringify(saved));
    delete foreign.mods;
    let refused = false;
    try { FB.save.restore(foreign); } catch (error) { refused = true; }
    let modRefused = false;
    const event = FB.eventById('camp_fires');
    try { FB.mods.apply({ events:[{ id:'camp_fires', text:'Unreviewed replacement' }] }); }
    catch (error) { modRefused = true; }
    return {
      profile:JSON.parse(FB.save.serialize()).mods,
      refused:refused, sameState:FB.state === state, sameRng:FB.getRngState() === rng,
      incompatible:FB.save.otherWorld(foreign), modRefused:modRefused,
      unchanged:FB.eventById('camp_fires') === event
    };
  });
  expect(result).toEqual({
    profile:'crazygames-content-1', refused:true, sameState:true, sameRng:true,
    incompatible:true, modRefused:true, unchanged:true
  });
});

test('CrazyGames failed captive escape recaptures the living household', async function ({ page }, testInfo) {
  await restrictedBoot(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 1;
    p.gold = 20;
    const id = p.charId;
    const destination = Object.keys(FB.world.byId).find(function (pid) {
      const province = FB.world.byId[pid];
      return pid !== p.provinceId && province && !province.wasteland;
    });
    const context = { protagonistId:id, raidProfile:'northmen', destinationId:destination };
    const event = FB.eventById('historic_raid_captive');
    const chance = FB.chance;
    let receipt;
    try {
      FB.chance = function () { return false; };
      receipt = FB.resolveEventOption(s, event, event.options[1], context);
    } finally { FB.chance = chance; }
    return {
      resolved:!!receipt, samePlayer:p.charId === id,
      alive:!s.chars[id].dead, province:p.provinceId, destination:destination,
      tier:p.tier, gold:p.gold, outcome:event.options[1].failure.text
    };
  });
  expect(result).toMatchObject({ resolved:true, samePlayer:true, alive:true, tier:0, gold:0 });
  expect(result.province).toBe(result.destination);
  expect(result.outcome).toContain('escorts you back');
});

test('CrazyGames blocks forced sibling and assassination routes', async function ({ page }, testInfo) {
  await restrictedBoot(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const target = FB.makeCharacter(s, {
      name:'Sibling', sex:me.sex === 'm' ? 'f' : 'm',
      culture:me.culture, religion:me.religion, born:s.date.year - 24,
      role:'sibling', dyn:me.dyn, traitsN:0
    });
    target.fatherId = me.fatherId;
    target.motherId = me.motherId;
    target.homeProvinceId = s.player.provinceId;
    const context = { siblingTargetId:target.id };
    const event = FB.eventById('sibling_courtship_approach');
    const rng = FB.getRngState();
    const status = FB.siblingCourtshipStatus(s, target);
    const receipt = FB.resolveEventOption(s, event, event.options[0], context);
    const plot = FB.beginIntriguePlot(s, 'assassination', { characterId:target.id }, 'careful');
    return {
      ready:status.ready, relevant:status.relevant, rejected:receipt === false,
      married:me.spouseId === target.id, plotStarted:!!plot,
      sameRng:FB.getRngState() === rng
    };
  });
  expect(result).toEqual({
    ready:false, relevant:false, rejected:true, married:false, plotStarted:false, sameRng:true
  });
});

test('CrazyGames sentencing preview and execution both use imprisonment', async function ({ page }, testInfo) {
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.endPlayerWar(s, true);
    s.eventQueue = [];
    const actor = s.player.charId;
    const target = FB.makeCharacter(s, { name:'Prisoner', sex:'m',
      culture:'frankish', religion:'catholic', born:s.date.year - 30, station:1, traitsN:0 });
    target.homeProvinceId = ids.home;
    target.traits = [];
    FB.captureIntrigue(s, actor, target.id, 'abduction', 'player');
    const options = FB.justiceSentenceOptions(s, actor, target.id).map(function (p) { return p.sentence; });
    const preview = FB.justicePunishmentProjection(s, actor, target.id, 'execution');
    const applied = FB.justiceApplyPunishment(s, actor, target.id, 'execution');
    const custody = FB.justiceCustodyOf(s, target.id);
    const intrigue = FB.intrigueSentenceProjection(s, {
      targetId:actor, accusedId:target.id, authority:'player', severity:4, evidence:'redhanded'
    });
    FB.ui.showJusticeCharacter(target.id);
    return {
      options:options, preview:preview.sentence, applied:applied,
      alive:!target.dead, maimed:target.traits.indexOf('maimed') >= 0,
      held:!!custody, endTurn:custody && custody.endTurn, turn:s.turn,
      intrigue:intrigue.outcome
    };
  }, ids);
  expect(result.options).not.toContain('execution');
  expect(result.options).not.toContain('qisas');
  expect(result.options).not.toContain('blinding_deposition');
  expect(result).toMatchObject({
    preview:'imprisonment', applied:{ ok:true, sentence:'imprisonment' },
    alive:true, maimed:false, held:true, intrigue:'prison'
  });
  expect(result.endTurn).toBeGreaterThan(result.turn);
  await expect(page.locator('[data-justice-sentence="execution"]')).toHaveCount(0);
  await expect(page.locator('[data-justice-sentence="blinding_deposition"]')).toHaveCount(0);
});

test('CrazyGames replacement prose falls back to English in a stale French catalog', async function ({ page }, testInfo) {
  await restrictedBoot(page, testInfo);
  const result = await page.evaluate(function () {
    localStorage.setItem('fb_lang', 'fr');
    return new Promise(function (resolve) {
      FB.loadSelectedLocale(function (loaded) {
        FB.finalizeLocale(loaded);
        const s = FB.state, event = FB.eventById('first_muster');
        resolve({
          locale:FB.locale,
          label:FB.eventText(s, s.player.charId, event, 'options.1.label', {}),
          trait:FB.dataText(s, s.player.charId, 'trait', 'drunkard',
            FBDATA.traits.drunkard, 'name', {})
        });
      });
    });
  });
  expect(result).toEqual({
    locale:'fr', label:'Trade stories with the veterans.', trait:'Overindulgent'
  });
});
