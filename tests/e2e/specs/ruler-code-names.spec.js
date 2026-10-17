'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const harbor = require('../fixtures/authoring/harbor-mod.json');
dependsOnRuntime(__filename, ['index.html', 'js/main.js', 'js/starts.js', 'js/mods.js', 'js/world.js',
  'js/model.js', 'js/save.js', 'js/ui_misc.js', 'js/ui_modals.js', 'data/starts.js', 'data/eras.js']);

for (const name of ['Orin Vale-Sen','Orin-Vale-Sen','Orin Vale']) {
  test('an imported ruler named ' + name + ' reopens its generated code with its exact identity', async function ({ page }, info) {
    const mod = JSON.parse(JSON.stringify(harbor)), world = mod.bookmarks.harbor_world;
    world.realms.find(function (r) { return r.id === 'harbor_upland'; }).ruler.name = name;
    world.starts.push('encoded_court');
    mod.startScenarios.push({ id:'encoded_court', bookmarkIds:['harbor_world'], alwaysUnlocked:true,
      name:'Encoded court', desc:'An existing fictional court.', fixedProvinceId:'harbor_ridge',
      rulerRealmId:'harbor_upland', governmentForm:'regnum', characterName:name, sex:'f',
      startCulture:'harbor_folk', startReligion:'harbor_belief', tier:5, profession:'noble',
      gold:20, prestige:0, piety:0, familyPresets:{ standard:{} }, onboarding:'ruler', intro:'Your court awaits.' });
    await useReleasedStartRules(page);
    await openGame(page, info);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({ name:'encoded-court.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(mod)) });
    await page.locator('#mod-apply').click();
    await page.waitForFunction(function () {
      return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks.harbor_world;
    });
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{ name:'New Game',exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    const prefix = 'ENCODED-harbor_world-encoded_court-harbor_ridge-f-';
    const token = name.replace(/-/g,'').replace(/ /g,'_');
    for (const code of [prefix+'Another_Name',prefix.replace('-f-','-m-')+token,
      prefix.replace('-harbor_ridge-','-harbor_quay-')+token,prefix+token+'-established']) {
      await page.locator('#ng-seed').fill(code); await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
      await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
    }
    await page.locator('#ng-seed').fill(prefix+token); await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#cg-name')).toHaveValue(name);
    await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
    await page.getByRole('button',{ name:'Begin Your Story',exact:true }).click();
    await page.getByRole('button',{ name:'Begin',exact:true }).click();
    const saved = await page.evaluate(function () {
      const s = FB.state, before = JSON.parse(FB.save.serialize());
      FB.save.restore(before);
      return { code:FB.state.seed,name:FB.state.chars[FB.state.player.charId].name,source:FB.state.start.rulerRealmId };
    });
    expect(saved).toEqual({ code:prefix+token,name,source:'harbor_upland' });
    await page.evaluate(function () { FB.game.setPaused(true); FB.ui.closeModal(); FB.ui.showScreen('title'); });
    const again = page.locator('#btn-choose-beginning');
    if (await again.isVisible()) await again.click();
    else await page.getByRole('button',{ name:'New Game',exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(saved.code); await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#cg-name')).toHaveValue(name);
  });
}
