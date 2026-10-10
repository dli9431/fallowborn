'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['js/mods.js','js/world.js','js/model.js','js/governments.js',
  'js/save.js','js/save_v4.js','js/main.js','data/cultures.js','data/eras.js',
  'data/bookmarks.js','data/geographies.js','data/political_institutions.js']);

test('canonical effective fingerprints match SHA-256 for Unicode and multi-block JSON', async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(async function () {
    const values = [null,{},'abc','Église ☀ 🏰',Array(100).fill('long'),{a:1,b:[2,{a:false,z:null}]}];
    const results = [];
    for (const value of values) {
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
      const expected = Array.from(digest).map(function (n) { return n.toString(16).padStart(2,'0'); }).join('');
      results.push(FB.mods.fingerprint(value) === expected);
    }
    results.push(FB.mods.fingerprint({b:2,a:1}) === FB.mods.fingerprint({a:1,b:2}));
    return results;
  })).toEqual([true,true,true,true,true,true,true]);
});

test('imported overrides leave the shipped fixture intact and round trip only under their exact effective catalogue',
  async function ({page},testInfo) {
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    await openGame(page,testInfo);
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
    const sourceMod = await page.evaluate(function () {
      const faith = JSON.parse(JSON.stringify(FBDATA.religions.catholic));
      faith.name = 'Modded Latin tradition';
      const form = JSON.parse(JSON.stringify(FBDATA.governmentForms.territorial));
      form.strategyParameters = {ai:{warChance:0.0002}};
      const mod = {name:'Explicit catalogue override',religions:{catholic:faith},governmentForms:{territorial:form}};
      const faults = FB.mods.validate(mod);
      if (faults.length) throw new Error(faults.join('\n'));
      const text = JSON.stringify(mod);
      localStorage.setItem('fb_mods',JSON.stringify([text]));
      return text;
    });
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    const save = await page.evaluate(function () { return FB.save.serialize(); });
    expect(JSON.parse(save).mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
    await openGame(page,testInfo);
    await restoreBookmark(page,save);
    expect(await page.evaluate(function () { return FB.religionOf('catholic').name; })).toBe('Modded Latin tradition');
    expect(await page.evaluate(function (saved) {
      return JSON.parse(FB.save.serialize()).mods === JSON.parse(saved).mods;
    },save)).toBe(true);
    // Same named JSON mod with different effective content is a different world.
    await page.evaluate(function (text) {
      const mod = JSON.parse(text); mod.religions.catholic.name = 'Changed modded tradition';
      localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
    },sourceMod);
    await openGame(page,testInfo);
    expect(await page.evaluate(function (text) {
      const source = JSON.parse(text), before = JSON.stringify(source);
      const live = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.game.loadData(source) === false && before === JSON.stringify(source) &&
        live === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter();
    },save)).toBe(true);
    await page.evaluate(function () { localStorage.removeItem('fb_mods'); });
    await openGame(page,testInfo);
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
    expect(await page.evaluate(function (text) { return FB.game.loadData(JSON.parse(text)); },save)).toBe(false);
  });

test('bundled payload changes cannot reuse an id-only fingerprint',async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    const faith = JSON.parse(JSON.stringify(FBDATA.religions.catholic));
    const mod = {id:'e2e_bundle',data:{religions:{catholic:faith}}};
    window.FBMODS.push(mod); localStorage.setItem('fb_mods_bundled',JSON.stringify([mod.id]));
    FB.mods.applyStored(); const first = FB.mods.sig();
    mod.data.religions.catholic.name = 'Revised bundled tradition';
    FB.mods.applyStored(); const second = FB.mods.sig();
    return first !== second && /^effective-1-/.test(second);
  })).toBe(true);
});

for (const kind of ['missing','invalid','malformed']) test('a ' + kind + ' mod configuration cannot fall back to the shipped world',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function (kind) {
      const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      if (kind === 'missing') localStorage.setItem('fb_mods_bundled','["e2e_missing"]');
      if (kind === 'invalid') localStorage.setItem('fb_mods',JSON.stringify(['{"unsupported_table":{}}']));
      if (kind === 'malformed') localStorage.setItem('fb_mods','{broken');
      FB.mods.applyStored();
      let rejected = false;
      try { FB.mods.sig(); } catch (error) { rejected = true; }
      return rejected && state === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter();
    },kind)).toBe(true);
  });
