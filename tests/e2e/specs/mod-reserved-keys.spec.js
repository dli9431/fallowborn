'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/mods.js', 'js/modifiers.js', 'js/events.js', 'js/main.js',
  'js/ui_misc.js', 'js/ui_modals.js']);

const fixturePath = path.resolve(__dirname, '../fixtures/mod-reserved-keys/charter.json');
const charterText = fs.readFileSync(fixturePath, 'utf8');
const RESERVED = ' is a reserved key; mods cannot use __proto__, constructor or prototype as a field name.';

// JSON text may carry "__proto__" as an ordinary key. Build each variant as an
// own enumerable property so JSON.stringify writes it exactly as a hostile file would.
function inject(target, key, value) {
  Object.defineProperty(target, key, { value:value, enumerable:true, writable:true, configurable:true });
}
function variant(edit) {
  const mod = JSON.parse(charterText);
  edit(mod);
  return JSON.stringify(mod);
}
const cases = [
  { id:'top level', message:'Mod data __proto__' + RESERVED,
    text:variant(function (mod) { inject(mod, '__proto__', { polluted:true }); }) },
  { id:'table key', message:'Mod data modifiers.__proto__' + RESERVED,
    text:variant(function (mod) {
      inject(mod.modifiers, '__proto__', { polluted:true, e2e_injected_modifier:{ name:'Injected' } });
    }) },
  { id:'nested object', message:'Mod data modifiers.e2e_reserved_charter.fx.constructor' + RESERVED,
    text:variant(function (mod) {
      inject(mod.modifiers.e2e_reserved_charter.fx, 'constructor', { prototype:{ polluted:true } });
    }) },
  { id:'array row', message:'Mod data events[0].options[0].prototype' + RESERVED,
    text:variant(function (mod) { inject(mod.events[0].options[0], 'prototype', { polluted:true }); }) },
  { id:'bookmark id', message:'Mod data bookmarks[0].id is a reserved key.',
    text:JSON.stringify({ name:'Reserved bookmark id', bookmarks:[{ id:'__proto__', polluted:true }] }) }
];

// Shared page-side purity probe: catalogue JSON, every table prototype,
// inherited for-in entries, global prototype pollution, RNG and UID.
function catalogueProbe() {
  const prototypes = {}, inherited = [];
  Object.keys(FBDATA).forEach(function (key) {
    const table = FBDATA[key];
    if (!table || typeof table !== 'object') return;
    prototypes[key] = Object.getPrototypeOf(table);
    for (const field in table) {
      if (!Object.prototype.hasOwnProperty.call(table, field)) inherited.push(key + '.' + field);
    }
  });
  return {
    json:JSON.stringify(FBDATA), prototypes:prototypes, inherited:inherited,
    polluted:({}).polluted !== undefined || Object.prototype.hasOwnProperty('polluted') ||
      Object.prototype.hasOwnProperty('e2e_injected_modifier'),
    rng:JSON.stringify(FB.getRngState()), uid:FB.getUidCounter()
  };
}

test('reserved keys at every mod depth reject validation and apply atomically; a valid import still applies',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function (input) {
      const probe = new Function('return (' + input.probe + ')();');
      const before = probe();
      const rows = input.cases.map(function (row) {
        const validation = FB.mods.validate(JSON.parse(row.text));
        let applied = 'accepted';
        try { FB.mods.apply(JSON.parse(row.text)); } catch (error) { applied = error.message; }
        return { id:row.id, validation:validation, applied:applied };
      });
      const after = probe();
      const sameProtos = Object.keys(before.prototypes).every(function (key) {
        return Object.getPrototypeOf(FBDATA[key]) === before.prototypes[key];
      });
      const valid = JSON.parse(input.valid);
      const validValidation = FB.mods.validate(JSON.parse(input.valid));
      FB.mods.apply(valid);
      const installed = probe();
      return {
        rows:rows,
        unchanged:before.json === after.json, sameProtos:sameProtos,
        inherited:after.inherited, polluted:after.polluted,
        rng:before.rng === after.rng, uid:before.uid === after.uid,
        validValidation:validValidation,
        charter:FBDATA.modifiers.e2e_reserved_charter && FBDATA.modifiers.e2e_reserved_charter.name,
        event:FBDATA.events.some(function (event) { return event.id === 'e2e_reserved_charter_event'; }),
        modifierProto:Object.getPrototypeOf(FBDATA.modifiers) === Object.prototype,
        installedInherited:installed.inherited, installedPolluted:installed.polluted,
        installedRng:before.rng === installed.rng, installedUid:before.uid === installed.uid
      };
    }, { cases:cases, valid:charterText, probe:catalogueProbe.toString() });

    expect(result.rows).toEqual(cases.map(function (row) {
      return { id:row.id, validation:[row.message], applied:row.message };
    }));
    expect(result).toMatchObject({
      unchanged:true, sameProtos:true, inherited:[], polluted:false, rng:true, uid:true,
      validValidation:[], charter:'Reserved Key Check Charter', event:true, modifierProto:true,
      installedInherited:[], installedPolluted:false, installedRng:true, installedUid:true
    });
  });

test('a reserved-key JSON file import and stored mod text never reach storage or FBDATA',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Origin-backed localStorage is required for the storage contract.');
    await openGame(page, testInfo);
    const before = await page.evaluate(function (source) {
      const probe = new Function('return (' + source + ')();');
      window.__e2eReservedProbe = probe();
      window.__e2eReservedDocument = true;
      return { stored:localStorage.getItem('fb_mods') };
    }, catalogueProbe.toString());
    expect(before.stored).toBeNull();

    // Ordinary Mods dialog file import: rejected before storage or reload.
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({
      name:'reserved-table.json', mimeType:'application/json', buffer:Buffer.from(cases[1].text, 'utf8')
    });
    await page.locator('#mod-apply').click();
    await expect(page.locator('#toasts .toast').filter({ hasText:'Mod requirements failed:' }))
      .toContainText(cases[1].message);

    const imported = await page.evaluate(function (input) {
      const results = input.cases.map(function (row) { return FB.mods.store(row.text); });
      const probe = new Function('return (' + input.probe + ')();');
      const after = probe(), before = window.__e2eReservedProbe;
      return {
        sameDocument:window.__e2eReservedDocument === true,
        results:results, stored:localStorage.getItem('fb_mods'), count:FB.mods.count(),
        unchanged:before.json === after.json,
        sameProtos:Object.keys(before.prototypes).every(function (key) {
          return Object.getPrototypeOf(FBDATA[key]) === before.prototypes[key];
        }),
        inherited:after.inherited, polluted:after.polluted,
        rng:before.rng === after.rng, uid:before.uid === after.uid
      };
    }, { cases:cases, probe:catalogueProbe.toString() });
    expect(imported).toEqual({
      sameDocument:true, results:[false, false, false, false, false], stored:null, count:0,
      unchanged:true, sameProtos:true, inherited:[], polluted:false, rng:true, uid:true
    });

    // Text already in storage (from an older build or edited by hand) is
    // rejected by activation without installing any of its records.
    const stored = await page.evaluate(function (input) {
      const text = JSON.stringify([input.text]);
      localStorage.setItem('fb_mods', text);
      const before = window.__e2eReservedProbe;
      FB.mods.applyStored();
      let failure = '';
      try { FB.mods.assertReady(); } catch (error) { failure = error.message; }
      let signature = '';
      try { FB.mods.sig(); signature = 'issued'; } catch (error) { signature = 'refused'; }
      const probe = new Function('return (' + input.probe + ')();');
      const after = probe();
      return {
        failure:failure, signature:signature,
        storedUnchanged:localStorage.getItem('fb_mods') === text,
        previews:FB.mods.menuDeclarations().length,
        unchanged:before.json === after.json,
        sameProtos:Object.keys(before.prototypes).every(function (key) {
          return Object.getPrototypeOf(FBDATA[key]) === before.prototypes[key];
        }),
        inherited:after.inherited, polluted:after.polluted,
        rng:before.rng === after.rng, uid:before.uid === after.uid
      };
    }, { text:cases[1].text, probe:catalogueProbe.toString() });
    expect(stored).toEqual({
      failure:'Invalid stored mod: ' + cases[1].message, signature:'refused',
      storedUnchanged:true, previews:0,
      unchanged:true, sameProtos:true, inherited:[], polluted:false, rng:true, uid:true
    });
  });

test('a valid JSON file import stores, reloads and installs its records',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Origin-backed localStorage is required for the reload contract.');
    await openGame(page, testInfo);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(fixturePath);
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      page.locator('#mod-apply').click()
    ]);
    await prepareGameContent(page);
    const result = await page.evaluate(function (source) {
      FB.mods.assertReady();
      const probe = new Function('return (' + source + ')();');
      const after = probe();
      return {
        count:FB.mods.count(),
        names:FB.mods.list().map(function (row) { return row.name; }),
        signature:FB.mods.sig(),
        charter:FBDATA.modifiers.e2e_reserved_charter.name,
        event:FBDATA.events.some(function (event) { return event.id === 'e2e_reserved_charter_event'; }),
        modifierProto:Object.getPrototypeOf(FBDATA.modifiers) === Object.prototype,
        inherited:after.inherited, polluted:after.polluted
      };
    }, catalogueProbe.toString());
    expect(result).toEqual({
      count:1, names:['Reserved key check charter'],
      signature:expect.stringMatching(/^effective-1-[a-f0-9]{64}$/),
      charter:'Reserved Key Check Charter', event:true, modifierProto:true,
      inherited:[], polluted:false
    });
  });
