'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/save.js', 'js/save_v4.js', 'js/title_ids.js',
  'js/main.js', 'js/world.js', 'js/model.js', 'js/mods.js', 'js/messages.js',
  'js/authority.js', 'js/situation476.js', 'js/ui_modals.js',
  'data/bookmarks.js', 'data/bookmark_476.js', 'data/political_institutions.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, bookmark) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(bookmark === '476'
    ? 'SAVEV4-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
    : 'SAVEV4-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

for (const bookmark of ['476', '867', '1066']) {
  test(bookmark + ' v3 imports and v4 slots preserve political and personal facts',
    async function ({ page }, testInfo) {
      await start(page, testInfo, bookmark);
      const result = await page.evaluate(async function () {
        const authorityBefore = JSON.stringify(FB.state.authority);
        const source = JSON.parse(FB.save.serialize());
        const serializerPure = authorityBefore === JSON.stringify(FB.state.authority);
        const legacy = JSON.parse(JSON.stringify(source));
        legacy.v = 3;
        delete legacy.titleIds;
        delete legacy.authoritySchema;
        if (legacy.state.authority) delete legacy.state.authority.schema;
        function facts(state) {
          return JSON.stringify({
            owner:state.owner, holder:state.holder,
            player:[state.player.charId, state.player.provinceId,
              state.player.provs, state.player.gold, state.player.tier],
            population:state.population, buildings:state.buildings,
            treasury:state.treasuryAccounting, authority:state.authority,
            situation:state.situation476, armies:state.armies,
            wars:state.wars,
            family:Object.keys(state.chars).sort().map(function (id) {
              const c = state.chars[id];
              return [id, c.born, c.culture, c.religion, c.fatherId,
                c.motherId, c.spouseId || null, c.childrenIds || []];
            })
          });
        }
        const original = JSON.stringify(legacy);
        const oldExport = 'FBS1.' + btoa(unescape(encodeURIComponent(original)));
        const imported = FB.save.parseExport(oldExport);
        const migrated = FB.save.v4.migrate(imported);
        const twice = FB.save.v4.migrate(migrated);
        const expected = facts(migrated.state);
        FB.save.restore(imported);
        const first = facts(JSON.parse(FB.save.serialize()).state);
        FB.save.restore(imported);
        const second = facts(JSON.parse(FB.save.serialize()).state);
        const exported = FB.save.parseExport(FB.save.exportState());
        const saved = await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
        const slot = FB.save.read(1);
        const chronicle = FB.save.chronicleFromSave(slot);
        return {
          header:[source.v, source.titleIds, source.authoritySchema],
          serializerPure:serializerPure,
          immutable:original === JSON.stringify(legacy),
          idempotent:JSON.stringify(migrated) === JSON.stringify(twice),
          facts:first === expected && second === first,
          rng:(FB.getRngState() >>> 0) === (source.rng >>> 0),
          uid:FB.getUidCounter() === source.uid,
          saved:saved, slotVersion:slot.v, exportVersion:exported.v,
          bookmark:slot.state.start.id,
          authority:!!slot.state.authority,
          chronicle:!!chronicle && chronicle.format === 'fallowborn-chronicle'
        };
      });
      expect(result).toEqual({
        header:[4, 1, 4], serializerPure:true, immutable:true, idempotent:true, facts:true,
        rng:true, uid:true, saved:true, slotVersion:4, exportVersion:4,
        bookmark:bookmark, authority:bookmark === '476', chronicle:true
      });
      await page.reload({ waitUntil:'domcontentloaded' });
      await page.waitForFunction(function () { return FB.game.bootReady; });
      expect(await page.evaluate(function () {
        const saved = FB.save.read(1);
        return { v:saved.v, bookmark:saved.state.start.id };
      })).toEqual({ v:4, bookmark:bookmark });
      await page.evaluate(function () { FB.game.loadSlot(1); });
      await expect.poll(function () {
        return page.evaluate(function () { return FB.state && FB.state.start.id; });
      }).toBe(bookmark);
      expect(await page.evaluate(function () { return FB.game.lastLoadError; })).toBeNull();
    });
}

test('invalid v4 input preserves live state, RNG, identity counters and stored saves',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const errors = await page.evaluate(async function () {
      await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
      const source = FB.save.read(1), stored = JSON.stringify(source);
      const changes = [
        function (d) { d.v = 5; },
        function (d) { delete d.authoritySchema; },
        function (d) { d.titleIds = 99; },
        function (d) { d.state.start.id = 'missing_bookmark'; },
        function (d) { d.mods = 'missing-mod'; },
        function (d) { delete d.state.chars[d.state.player.charId]; },
        function (d) { d.state.authority.nextId = 1; },
        function (d) { d.state.authority.appointments[0].scope.kind = 'invalid'; },
        function (d) { d.state.authority.appointments[0].quote = {}; },
        function (d) {
          d.state.authority.appointments.push(d.state.authority.appointments[0]);
        }
      ];
      return changes.map(function (change) {
        const input = JSON.parse(stored);
        change(input);
        const bytes = JSON.stringify(input), live = FB.state;
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        let message = '';
        try { FB.save.restore(input); } catch (error) { message = error.message; }
        return { message:message, unchanged:FB.state === live &&
          FB.getRngState() === rng && FB.getUidCounter() === uid &&
          JSON.stringify(input) === bytes && JSON.stringify(FB.save.read(1)) === stored };
      });
    });
    expect(errors).toHaveLength(10);
    for (const error of errors) {
      expect(error.message).not.toBe('');
      expect(error.unchanged).toBe(true);
    }
    expect(errors[3].message).toContain('Missing bookmark');
    expect(errors[4].message).toContain('different mod set');
    expect(errors[6].message).toContain('authority.nextId');
    expect(errors[9].message).toContain('Duplicate v4 authority id');
  });

test('invalid live authority cannot overwrite an accepted slot',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(async function () {
      const accepted = await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
      const previous = JSON.stringify(FB.save.read(1));
      const next = FB.state.authority.nextId;
      let written;
      try {
        FB.state.authority.nextId = 0;
        written = await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
      } finally { FB.state.authority.nextId = next; }
      return { accepted:accepted, written:written,
        preserved:previous === JSON.stringify(FB.save.read(1)) };
    });
    expect(result).toEqual({ accepted:true, written:false, preserved:true });
  });

test('localStorage v3 Continue upgrades only on a successful v4 save',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () {
      Object.defineProperty(window, 'indexedDB', { configurable:true, value:undefined });
    });
    await start(page, testInfo, '867');
    const legacy = await page.evaluate(function () {
      FB.save.flushPending();
      const data = JSON.parse(FB.save.serialize());
      data.v = 3;
      delete data.titleIds;
      delete data.authoritySchema;
      const raw = JSON.stringify(data);
      localStorage.setItem('fb_auto', raw);
      FB.state = null;
      return raw;
    });
    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForFunction(function () { return FB.game.bootReady; });
    expect(await page.evaluate(function () { return localStorage.getItem('fb_auto'); })).toBe(legacy);
    await page.locator('#btn-continue').click();
    await expect.poll(function () {
      return page.evaluate(function () { return FB.state && FB.state.start.id; });
    }).toBe('867');
    expect(await page.evaluate(function () {
      FB.save.autosave();
      FB.save.flushPending();
      return { version:FB.save.read('auto').v, authority:!!FB.state.authority };
    })).toEqual({ version:4, authority:false });
  });
