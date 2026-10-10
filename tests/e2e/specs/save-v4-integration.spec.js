'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'index.html', 'js/save.js', 'js/save_v4.js', 'js/title_ids.js',
  'js/main.js', 'js/world.js', 'js/model.js', 'js/mods.js', 'js/messages.js', 'js/papacy.js',
  'data/papacy.js', 'data/cultures.js',
  'js/armies.js', 'js/wars.js', 'data/units.js',
  'js/authority.js', 'js/politics.js', 'js/stories.js',
  'js/story_courts.js', 'js/story_track.js', 'js/ui_modals.js',
  'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_1066_inhabited.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/political_institutions.js',
  'data/eras.js', 'js/governments.js',
  'data/story_instances.js', 'js/story_campaign.js', 'js/story_history.js',
  'js/story_polity_foundation.js', 'js/story_agreements.js', 'js/story_settlements.js',
    'js/settlement.js',
  'js/population.js', 'js/intrigue.js', 'js/justice.js', 'js/economy.js',
  'js/bookmark_setup.js', 'js/institutions.js', 'js/federates.js',
  'data/story_campaigns.js', 'data/story_campaigns_711.js', 'data/starts.js',
  'data/geographies.js', 'js/religion.js', 'js/royal_settlements.js',
  'data/bookmark_493.js', 'data/bookmark_493_history.js', 'data/bookmark_711.js',
  'data/bookmark_800.js', 'data/bookmark_800_history.js',
  'data/bookmark_1204.js', 'data/bookmark_1204_campaigns.js'
]);
const { test, expect } = require('../support/fixture');
const { startBaseline476 } = require('../support/game/476-wider');
const { openGame } = require('../support/game/navigation');
const { loadParitySave } = require('../support/game/parity');
const { corpusEntries, readCorpusExport } = require('../support/parity-fixtures');

async function start(page, testInfo, bookmark, revision) {
  if (bookmark === '476') return startBaseline476(page,testInfo,'SAVEV4-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian');
  await openGame(page, testInfo);
  if (revision) await page.evaluate(function (input) {
    FBDATA.bookmarks[input.bookmark].revision = input.revision;
  },{bookmark:bookmark,revision:revision});
  if (bookmark === '493' || bookmark === '711') await page.evaluate(function (id) {
    // Review hidden candidates only inside this test's isolated page.
    FBDATA.bookmarks[id].hidden = false;
  }, bookmark);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const codes = {
    '476':'SAVEV4-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian',
    '493':'SAVEV4-493-farmer_493-ravenna-m-Marcus-standard-0-roman.nicene',
    '711':'SAVEV4-711-serf-toledo-m-Paulus-standard-0-hispano_roman.catholic'
  };
  await page.locator('#ng-seed').fill(codes[bookmark] || 'SAVEV4-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

for (const bookmark of ['476', '867', '1066']) {
  test(bookmark + ' v3 imports and v4 slots preserve political and personal facts',
    async function ({ page }, testInfo) {
      // Import an actual retained world. Removing a revision marker from an
      // expanded geography would manufacture an unsupported legacy fixture.
      await start(page, testInfo, bookmark, 'baseline');
      const result = await page.evaluate(async function () {
        const authorityBefore = JSON.stringify(FB.state.authority);
        const source = JSON.parse(FB.save.serialize());
        const serializerPure = authorityBefore === JSON.stringify(FB.state.authority);
        const legacy = JSON.parse(JSON.stringify(source));
        legacy.v = 3;
        delete legacy.titleIds;
        delete legacy.authoritySchema;
        delete legacy.platformSchema;
        delete legacy.state.start.revision;
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
        header:[4, 1, 4, 2], migratedHeader:2, serializerPure:true, immutable:true,
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
        function (d) { d.platformSchema = 3; },
        function (d) { d.state.start.era = 'missing_era'; },
        function (d) { d.state.start.geography = 'missing_geography'; },
        function (d) {
          const rid = Object.keys(d.state.authority.governments)[0];
          d.state.authority.governments[rid].formId = 'missing_form';
        },
        function (d) { d.state.stories = { missing_story:{} }; },
        function (d) { d.state.situation476 = {}; },
        function (d) { d.state.start.defaultGovernment = 'missing_default'; },
        function (d) { d.state.stories.federate_track_476.phase = 'invalid'; },
        function (d) { delete d.state.stories.western_court_476; },
        function (d) { d.state.stories.western_court_476 = null; },
        function (d) { d.rng = 4294967296; },
        function (d) { d.uid = -1; },
        function (d) { d.state.start = []; },
        function (d) {
          delete d.state.stories;
          d.state.situation476 = null;
        },
        function (d) {
          d.v = 3;
          d.platformSchema = 3;
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
    expect(errors).toHaveLength(25);
    for (const error of errors) {
      expect(error.message).not.toBe('');
      expect(error.unchanged).toBe(true);
    }
    expect(errors[3].message).toContain('Missing bookmark');
    expect(errors[0].message).toContain('Unsupported save schema at v: 5');
    expect(errors[1].message).toContain('authoritySchema');
    expect(errors[2].message).toContain('titleIds');
    expect(errors[10].message).toContain('platformSchema');
    expect(errors[4].message).toContain('different mod set');
    expect(errors[6].message).toContain('authority.nextId');
    expect(errors[9].message).toContain('Duplicate v4 authority id');
    expect(errors[11].message).toContain('Unknown era missing_era');
    expect(errors[12].message).toContain('Unknown geography missing_geography');
    expect(errors[13].message).toContain('Unknown government form missing_form');
    expect(errors[14].message).toContain('Unknown story missing_story');
    expect(errors[15].message).toContain('state.situation476');
    expect(errors[16].message).toContain('Unknown government form missing_default');
    expect(errors[17].message).toContain('state.stories.federate_track_476.phase');
    expect(errors[18].message).toContain('requires story western_court_476');
    expect(errors[19].message).toContain('state.stories.western_court_476');
    expect(errors[20].message).toContain('rng');
    expect(errors[21].message).toContain('uid');
    expect(errors[22].message).toContain('state.start');
    expect(errors[23].message).toContain('state.situation476');
    expect(errors[24].message).toContain('Unsupported save schema at platformSchema: 3');
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
    const none = { platformSchema:2, era:undefined, geography:undefined,
      defaultGovernment:undefined, stories:undefined };
    const stampedFields = { platformSchema:2, era:'save_test_era',
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

test('prototype v4 without a platform stamp migrates the old situation exactly once',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const source = JSON.parse(FB.save.serialize());
      const input = JSON.parse(JSON.stringify(source));
      delete input.platformSchema;
      delete input.state.start.revision;
      delete input.state.authority.schema;
      input.state.situation476 = Object.assign({}, input.state.stories.western_court_476,
        input.state.stories.federate_track_476);
      // Move only the merged records. Linked rails retain their saved cast
      // and remain required by bookmarkSetup's opening actor references.
      delete input.state.stories.western_court_476;
      delete input.state.stories.federate_track_476;
      const bytes = JSON.stringify(input), live = FB.state;
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const once = FB.save.v4.migrate(input), twice = FB.save.v4.migrate(once);
      const pure = FB.state === live && FB.getRngState() === rng && FB.getUidCounter() === uid;
      FB.save.restore(once);
      const first = FB.save.serialize();
      FB.save.restore(twice);
      return { supported:FB.save.isSupported(input),
        header:[once.v, once.titleIds, once.authoritySchema, once.platformSchema],
        immutable:bytes === JSON.stringify(input), pure:pure,
        idempotent:JSON.stringify(once) === JSON.stringify(twice),
        records:{ all:once.state.stories, originalAll:source.state.stories,
          world:once.state.stories.western_court_476,
          originalWorld:source.state.stories.western_court_476,
          track:once.state.stories.federate_track_476,
          originalTrack:source.state.stories.federate_track_476 },
        removed:!Object.prototype.hasOwnProperty.call(once.state, 'situation476'),
        repeatedRestore:first === FB.save.serialize(),
        alias:Object.prototype.hasOwnProperty.call(FB.save, 'prototypeV4') };
    });
    expect(result.records.all).toEqual(result.records.originalAll);
    expect(result.records.world).toEqual(result.records.originalWorld);
    expect(result.records.track).toEqual(result.records.originalTrack);
    delete result.records;
    expect(result).toEqual({ supported:true, header:[4,1,4,2], immutable:true, pure:true,
      idempotent:true, removed:true, repeatedRestore:true, alias:false });
  });

test('invalid live story records cannot replace a stored campaign',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(async function () {
      await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
      const stored = JSON.stringify(FB.save.read(1)), track = FB.state.stories.federate_track_476;
      const original = track.phase;
      try {
        track.phase = 'missing_phase';
        const written = await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
        return { written:written, preserved:stored === JSON.stringify(FB.save.read(1)) };
      } finally { track.phase = original; }
    });
    expect(result).toEqual({ written:false, preserved:true });
  });

test('federate facts reject invalid choices, references and future payment stamps before adoption',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const source = FB.save.serialize(), live = FB.state;
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const invalid = { role:'missing_role', result:'missing_result', proposal:'missing_proposal',
        backedClaimant:'missing_claimant', contractId:1, awardGranted:1,
        lastAllocatedPeriod:Math.floor(FB.state.turn / 90) + 1, outcomeTurn:FB.state.turn + 1,
        veteranMigration:{ provinceId:'missing_county', settlement:1, turn:FB.state.turn } };
      return Object.keys(invalid).map(function (field) {
        const input = JSON.parse(source);
        input.state.stories.federate_track_476[field] = invalid[field];
        const bytes = JSON.stringify(input);
        let message = '';
        try { FB.save.restore(input); } catch (error) { message = error.message; }
        return { field:field, message:message, preserved:FB.state === live &&
          FB.getRngState() === rng && FB.getUidCounter() === uid && JSON.stringify(input) === bytes };
      });
    });
    for (const row of result) {
      expect(row.message).toContain('state.stories.federate_track_476.' + row.field);
      expect(row.preserved).toBe(true);
    }
  });

test('an invalid live identity counter cannot replace a stored campaign',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '867');
    const result = await page.evaluate(async function () {
      await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
      const previous = JSON.stringify(FB.save.read(1)), uid = FB.getUidCounter();
      try {
        FB.setUidCounter(-1);
        const accepted = await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
        return { accepted:accepted, preserved:previous === JSON.stringify(FB.save.read(1)) };
      } finally { FB.setUidCounter(uid); }
    });
    expect(result).toEqual({ accepted:false, preserved:true });
  });

/* Browser-only corpus/storage journey. No game scripts execute in Node. */
async function checkStorageRoundTrip() {
  FB.game.setPaused(true);
  FB.save.flushPending();
  function facts(data) {
    const s = data.state, p = s.player;
    return {
      date:s.date, turn:s.turn, owner:s.owner, holder:s.holder,
      population:s.population, buildings:s.buildings, settlementLordships:s.settlementLordships,
      authority:s.authority && Object.assign({}, s.authority, { schema:undefined }),
      courts:Object.keys(s.realms).sort().map(function (id) { return [id,s.realms[id].succession]; }),
      intrigue:s.intrigue, justice:s.justice, wars:s.wars || {}, armies:s.armies,
      treasury:s.treasuryAccounting, fiscal:s.fiscalCrisis, market:s.market,
      abbeys:s.abbeys, campaigns:s.stories,
      player:[p.charId,p.provinceId,p.provs,p.gold,p.tier,p.holdings,p.enterprises,
        p.landPlots,p.loans,p.captiveWarId,p.captiveTurn],
      family:Object.keys(s.chars).sort().map(function (id) {
        const c = s.chars[id];
        return [id,c.born,c.culture,c.religion,c.fatherId,c.motherId,c.spouseId,c.spouseIds,c.childrenIds];
      }), rng:data.rng >>> 0, uid:data.uid
    };
  }
  function orderedFacts(value) {
    if (Array.isArray(value)) return value.map(orderedFacts);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    Object.keys(value).sort().forEach(function (key) {
      if (value[key] !== undefined) out[key] = orderedFacts(value[key]);
    });
    return out;
  }
  function changed(a, b) {
    // Object insertion order is not a saved fact; array ordering still is.
    return Object.keys(a).filter(function (key) {
      return JSON.stringify(orderedFacts(a[key])) !== JSON.stringify(orderedFacts(b[key]));
    });
  }
  const source = window.__saveFreezeSource || JSON.parse(FB.save.serialize());
  const bytes = JSON.stringify(source), live = FB.state;
  const rng = FB.getRngState(), uid = FB.getUidCounter();
  const once = FB.save.v4.migrate(source), twice = FB.save.v4.migrate(once);
  const pure = FB.state === live && FB.getRngState() === rng && FB.getUidCounter() === uid;
  const normalized = Object.assign({}, source, { state:FB.titleIds.migrateState(source.state,
    FB.bookmark(source.state.start && source.state.start.id || '867')) });
  const migrationChanges = changed(facts(normalized), facts(once));
  const canonical = JSON.parse(FB.save.serialize()), expected = facts(canonical);
  FB.save.restore(canonical);
  const restoreChanges = changed(expected, facts(JSON.parse(FB.save.serialize())));
  FB.save.restore(canonical);
  const repeatedChanges = changed(expected, facts(JSON.parse(FB.save.serialize())));
  // 5 MiB aggregate UTF-16 budget, including keys and unrelated preferences.
  const limit = 5 * 1024 * 1024;
  const original = Storage.prototype.setItem;
  let rejectedPlain = false;
  function usage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      total += 2 * (key.length + localStorage.getItem(key).length);
    }
    return total;
  }
  localStorage.setItem('__save_freeze_reserve', 'r'.repeat(256 * 1024));
  Storage.prototype.setItem = function (key, value) {
    if (this === localStorage) {
      const previous = this.getItem(key);
      const size = usage() - (previous === null ? 0 : 2 * (key.length + previous.length)) +
        2 * (key.length + String(value).length);
      if (size > limit) {
        if (key === 'fb_auto' && String(value).charAt(0) === '{') rejectedPlain = true;
        throw new DOMException('Save format quota probe', 'QuotaExceededError');
      }
    }
    return original.apply(this, arguments);
  };
  try {
    const saved = [], slotChanges = [];
    const previousAuto = JSON.stringify(FB.save.read('auto'));
    for (const slot of [1,2,3]) {
      saved.push(await new Promise(function (resolve) { FB.save.toSlot(slot, resolve); }));
      const reread = FB.save.read(slot);
      slotChanges.push(reread ? changed(expected, facts(reread)) : ['missing']);
    }
    const previousAutoPreserved = previousAuto === JSON.stringify(FB.save.read('auto'));
    FB.save.autosave(); FB.save.flushPending();
    const auto = FB.save.read('auto');
    const exported = FB.save.exportState(), imported = FB.save.parseExport(exported);
    const result = {
      header:[canonical.v,canonical.titleIds,canonical.authoritySchema,canonical.platformSchema],
      pure:pure, immutable:bytes === JSON.stringify(source),
      identity:(canonical.rng >>> 0) === (source.rng >>> 0) && canonical.uid === source.uid,
      idempotent:JSON.stringify(once) === JSON.stringify(twice),
      migrationChanges:migrationChanges, restoreChanges:restoreChanges, repeatedChanges:repeatedChanges,
      saved:saved, slotChanges:slotChanges, previousAutoPreserved:previousAutoPreserved,
      autoChanges:auto ? changed(expected, facts(auto)) : ['missing'],
      exportChanges:imported ? changed(expected, facts(imported)) : ['missing'],
      prefixes:[localStorage.getItem('fb_slot1').slice(0,5),exported.slice(0,5)],
      bytes:usage(), limit:limit, jsonBytes:JSON.stringify(canonical).length * 2,
      rejectedPlain:rejectedPlain,
      authority:JSON.stringify(canonical.state.authority) === JSON.stringify(FB.state.authority)
    };
    return result;
  } finally {
    Storage.prototype.setItem = original;
    localStorage.removeItem('__save_freeze_reserve');
  }
}

function expectStorageRoundTrip(result) {
  expect(result.header).toEqual([4,1,4,2]);
  expect(result.pure).toBe(true);
  expect(result.immutable).toBe(true);
  expect(result.identity).toBe(true);
  expect(result.idempotent).toBe(true);
  expect(result.migrationChanges).toEqual([]);
  expect(result.restoreChanges).toEqual([]);
  expect(result.repeatedChanges).toEqual([]);
  expect(result.saved).toEqual([true,true,true]);
  expect(result.slotChanges).toEqual([[],[],[]]);
  expect(result.previousAutoPreserved).toBe(true);
  expect(result.autoChanges).toEqual([]);
  expect(result.exportChanges).toEqual([]);
  expect(result.prefixes).toEqual(['FBC1.','FBS2.']);
  expect(result.bytes).toBeLessThanOrEqual(result.limit);
  expect(result.authority).toBe(true);
}

for (const bookmark of ['493','711','800','1204']) {
  test(bookmark + ' retains every registered story and platform fact in the frozen format',
    async function ({ page }, testInfo) {
      test.setTimeout(180 * 1000);
      await page.addInitScript(function () {
        Object.defineProperty(window, 'indexedDB', { configurable:true, value:undefined });
      });
      await start(page, testInfo, bookmark);
      expectStorageRoundTrip(await page.evaluate(checkStorageRoundTrip));
    });
}

for (const bookmark of ['711','800','1204']) {
  test(bookmark + ' opening pope keeps the same elective root through repeated restores',
    async function ({ page }, testInfo) {
      await start(page, testInfo, bookmark);
      const result = await page.evaluate(function () {
        const source = JSON.parse(FB.save.serialize());
        const rid = Object.keys(FB.state.realms).find(function (id) {
          return FB.state.realms[id].succession && FB.state.realms[id].succession.papalElective;
        });
        const court = source.state.realms[rid].succession;
        const root = court.members[court.rulerMemberId];
        const expected = JSON.stringify(court), generation = court.rulerGeneration;
        FB.save.restore(source);
        const first = JSON.parse(FB.save.serialize()).state.realms[rid].succession;
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const second = JSON.parse(FB.save.serialize()).state.realms[rid].succession;
        return { role:root.role, first:expected === JSON.stringify(first),
          second:expected === JSON.stringify(second), generation:second.rulerGeneration === generation,
          claimant:first.members[first.rulerMemberId].charId === root.charId,
          warnings:FB.save.lastRestoreWarnings.length };
      });
      expect(result).toEqual({ role:null, first:true, second:true, generation:true, claimant:true, warnings:0 });
    });
}

for (const entry of corpusEntries()) {
  test('frozen v4 corpus round trip and WebKit-sized budget: ' + entry.id,
    async function ({ page }, testInfo) {
      const source = readCorpusExport(entry);
      test.skip(!!source.missing, 'Set FB_PARITY_CORPUS to the checkout containing the Phase 0 saves.');
      expect(source.sha256).toBe(entry.sha256);
      test.setTimeout(180 * 1000);
      await page.addInitScript(function () {
        Object.defineProperty(window, 'indexedDB', { configurable:true, value:undefined });
      });
      await loadParitySave(page, testInfo, source.text);
      await page.evaluate(function (text) { window.__saveFreezeSource = FB.save.parseExport(text); }, source.text);
      const result = await page.evaluate(checkStorageRoundTrip);
      await testInfo.attach('save-size.json', { body:JSON.stringify({ source:entry.id,
        utf16Bytes:result.bytes, jsonUtf16Bytes:result.jsonBytes, quota:result.limit,
        autosaveCompressedAfterQuota:result.rejectedPlain }), contentType:'application/json' });
      expectStorageRoundTrip(result);
    });
}

test('476 campaign after two annual steps round trips stories and payments within the WebKit-sized budget',
  async function ({ page }, testInfo) {
    test.setTimeout(180 * 1000);
    await page.addInitScript(function () {
      Object.defineProperty(window, 'indexedDB', { configurable:true, value:undefined });
    });
    await start(page, testInfo, '476');
    // Two annual steps age courts and communities without claiming a full daily
    // replay, keeping this storage check in line with the other bounded journeys.
    await page.evaluate(function () {
      FB.game.setPaused(true);
      for (let year = 0; year < 2; year++) {
        FB.state.date.year++; FB.state.turn += 360;
        FB.worldTick(FB.state);
        FB.stories.year(FB.state);
      }
      // Direct annual staging skips daily host cleanup and can end just after
      // a replacement heir is declared. Finish that fixture's court and war
      // preparation before measuring exact storage preservation.
      FB.ensureDynasticState(FB.state);
      FB.repairWars(FB.state);
    });
    const result = await page.evaluate(checkStorageRoundTrip);
    await testInfo.attach('save-size.json', { body:JSON.stringify({ years:2,
      utf16Bytes:result.bytes, jsonUtf16Bytes:result.jsonBytes, quota:result.limit }),
      contentType:'application/json' });
    expectStorageRoundTrip(result);
  });
