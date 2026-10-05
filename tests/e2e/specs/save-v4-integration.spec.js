'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/save.js', 'js/save_v4.js', 'js/title_ids.js',
  'js/main.js', 'js/world.js', 'js/model.js', 'js/mods.js', 'js/messages.js',
  'js/armies.js', 'js/wars.js', 'data/units.js',
  'js/authority.js', 'js/politics.js', 'js/stories.js',
  'js/story_western_court_476.js', 'js/story_federate_track_476.js', 'js/ui_modals.js',
  'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/political_institutions.js',
  'data/eras.js', 'js/governments.js'
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
        delete legacy.platformSchema;
        if (legacy.state.authority) delete legacy.state.authority.schema;
        function facts(state) {
          // Missing legacy classes and explicit zero counts describe the same
          // host. Preserve all other fields and any unexpected unit keys.
          const armies = JSON.parse(JSON.stringify(state.armies || []));
          armies.forEach(function (army) {
            const units = army.units || (army.units = {});
            FB.unitClassIds().forEach(function (key) {
              if (!Object.prototype.hasOwnProperty.call(units, key)) units[key] = 0;
            });
          });
          return JSON.stringify({
            owner:state.owner, holder:state.holder,
            player:[state.player.charId, state.player.provinceId,
              state.player.provs, state.player.gold, state.player.tier],
            population:state.population, buildings:state.buildings,
            treasury:state.treasuryAccounting, authority:state.authority,
            stories:state.stories, armies:armies,
            wars:state.wars || {},
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
          header:[source.v, source.titleIds, source.authoritySchema, source.platformSchema],
          migratedHeader:migrated.platformSchema,
          serializerPure:serializerPure,
          immutable:original === JSON.stringify(legacy),
          idempotent:JSON.stringify(migrated) === JSON.stringify(twice),
          facts:{ expected:JSON.parse(expected), first:JSON.parse(first), second:JSON.parse(second) },
          rng:(FB.getRngState() >>> 0) === (source.rng >>> 0),
          uid:FB.getUidCounter() === source.uid,
          saved:saved, slotVersion:slot.v, exportVersion:exported.v,
          bookmark:slot.state.start.id,
          authority:!!slot.state.authority,
          chronicle:!!chronicle && chronicle.format === 'fallowborn-chronicle'
        };
      });
      expect(result.facts.first).toEqual(result.facts.expected);
      expect(result.facts.second).toEqual(result.facts.first);
      delete result.facts;
      expect(result).toEqual({
        header:[4, 1, 4, 1], migratedHeader:1, serializerPure:true, immutable:true,
        idempotent:true,
        rng:true, uid:true, saved:true, slotVersion:4, exportVersion:4,
        bookmark:bookmark, authority:bookmark === '476', chronicle:true
      });
      await page.reload({ waitUntil:'domcontentloaded' });
      await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
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
        },
        function (d) { d.platformSchema = 2; },
        function (d) { d.state.start.era = 'missing_era'; },
        function (d) { d.state.start.geography = 'missing_geography'; },
        function (d) {
          const rid = Object.keys(d.state.authority.governments)[0];
          d.state.authority.governments[rid].formId = 'missing_form';
        },
        function (d) { d.state.stories = { missing_story:{} }; },
        function (d) { d.state.situation476 = {}; },
        function (d) { d.state.start.defaultGovernment = 'missing_default'; }
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
    expect(errors).toHaveLength(17);
    for (const error of errors) {
      expect(error.message).not.toBe('');
      expect(error.unchanged).toBe(true);
    }
    expect(errors[3].message).toContain('Missing bookmark');
    expect(errors[4].message).toContain('different mod set');
    expect(errors[6].message).toContain('authority.nextId');
    expect(errors[9].message).toContain('Duplicate v4 authority id');
    expect(errors[11].message).toContain('Unknown era missing_era');
    expect(errors[12].message).toContain('Unknown geography missing_geography');
    expect(errors[13].message).toContain('Unknown government form missing_form');
    expect(errors[14].message).toContain('Unknown story missing_story');
    expect(errors[15].message).toContain('state.situation476');
    expect(errors[16].message).toContain('Unknown government form missing_default');
  });

test('optional platform fields round trip absent, stamped and present',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '867');
    const result = await page.evaluate(function () {
      const own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
      const bookmark = FBDATA.bookmarks['867'];
      const saved = { eras:FBDATA.eras, geographies:FBDATA.geographies, stories:FB.stories,
        era:[own(bookmark, 'era'), bookmark.era],
        geography:[own(bookmark, 'geography'), bookmark.geography] };
      const original = FB.save.serialize();
      function clean() {
        const data = JSON.parse(original);
        delete data.state.start.era;
        delete data.state.start.geography;
        delete data.state.start.defaultGovernment;
        delete data.state.stories;
        return data;
      }
      function roundTrip(data) {
        FB.save.restore(data);
        return JSON.parse(FB.save.serialize());
      }
      function fields(data) {
        return { platformSchema:data.platformSchema, era:data.state.start.era,
          geography:data.state.start.geography,
          defaultGovernment:data.state.start.defaultGovernment,
          stories:data.state.stories };
      }
      function forms() {
        const a = FB.state.authority, unique = {};
        Object.keys(FB.state.realms).forEach(function (id) {
          if (!FB.state.realms[id].alive || a && a.governments && own(a.governments, id)) return;
          const form = FB.political.government(FB.state, { kind:'realm', id:id });
          if (form) unique[form.formId] = true;
        });
        return Object.keys(unique).sort();
      }
      try {
        FBDATA.eras = Object.assign({}, saved.eras, {
          save_test_era:{ defaultGovernment:'roman_civic' },
          save_test_later_era:{ defaultGovernment:'roman_civic' }
        });
        FBDATA.geographies = Object.assign({}, saved.geographies,
          { save_test_geography:{} });
        FB.stories = Object.assign(Object.create(saved.stories || null), {
          get:function (id) {
            if (id === 'save_test_story') return { id:id, validate:function (record) {
              if (record.phase !== 2) throw new Error('Invalid test story record.');
            } };
            return saved.stories && saved.stories.get ? saved.stories.get(id) : null;
          }
        });
        delete bookmark.era;
        delete bookmark.geography;
        const absent = roundTrip(clean());
        const absentForms = forms();
        bookmark.era = 'save_test_era';
        bookmark.geography = 'save_test_geography';
        const migrated = FB.save.v4.migrate(clean());
        const stamped = roundTrip(clean());
        bookmark.era = 'save_test_later_era';
        const kept = roundTrip(stamped);
        const present = clean();
        present.state.start.era = 'save_test_era';
        present.state.start.geography = 'save_test_geography';
        present.state.start.defaultGovernment = 'roman_civic';
        present.state.stories = { save_test_story:{ phase:2 } };
        const once = FB.save.v4.migrate(present);
        const twice = FB.save.v4.migrate(once);
        const restored = roundTrip(present);
        const presentForms = forms();
        const bad = JSON.parse(JSON.stringify(present));
        bad.state.stories.save_test_story.phase = 3;
        const live = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
        let message = '';
        try { FB.save.restore(bad); } catch (error) { message = error.message; }
        return {
          absent:fields(absent), migrated:fields(migrated), stamped:fields(stamped),
          kept:fields(kept), present:fields(restored),
          absentForms:absentForms, presentForms:presentForms,
          idempotent:JSON.stringify(once) === JSON.stringify(twice),
          rejected:message, unchanged:FB.state === live &&
            FB.getRngState() === rng && FB.getUidCounter() === uid
        };
      } finally {
        if (saved.era[0]) bookmark.era = saved.era[1]; else delete bookmark.era;
        if (saved.geography[0]) bookmark.geography = saved.geography[1];
        else delete bookmark.geography;
        FBDATA.eras = saved.eras;
        FBDATA.geographies = saved.geographies;
        FB.stories = saved.stories;
        FB.save.restore(JSON.parse(original));
      }
    });
    const none = { platformSchema:1, era:undefined, geography:undefined,
      defaultGovernment:undefined, stories:undefined };
    const stampedFields = { platformSchema:1, era:'save_test_era',
      geography:'save_test_geography', defaultGovernment:undefined, stories:undefined };
    expect(result).toEqual({
      absent:none, migrated:stampedFields, stamped:stampedFields, kept:stampedFields,
      present:Object.assign({}, stampedFields, { defaultGovernment:'roman_civic',
        stories:{ save_test_story:{ phase:2 } } }),
      absentForms:['territorial'], presentForms:['roman_civic'],
      idempotent:true, rejected:'Invalid test story record.', unchanged:true
    });
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
    await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
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
