'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js', 'data/eras.js', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/political_institutions.js',
  'js/balance.js', 'js/governments.js', 'js/world.js', 'js/authority.js',
  'js/politics.js', 'js/mods.js', 'js/main.js', 'js/save.js', 'js/save_v4.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start867(page, testInfo) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('LAYERS-867-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe('867');
}

test('with no overrides every bookmark leaves the balance table untouched',
  async function ({ page }, testInfo) {
    test.slow();
    await openGame(page, testInfo);
    const result = await page.evaluate(async function () {
      function activate(id) {
        return new Promise(function (resolve, reject) {
          FB.activateBookmark(id, null, function (error) {
            if (error) reject(error); else resolve();
          });
        });
      }
      const table = FBDATA.balance, before = JSON.stringify(FBDATA.balance), out = {};
      for (const id of ['867', '1066', '476', '867']) {
        await activate(id);
        out[id] = { same:JSON.stringify(FBDATA.balance) === before,
          active:FB.balanceLayers.active() };
      }
      return { out:out, identity:FBDATA.balance === table,
        data:FB.validateEraData().concat(FB.governments.validate()),
        eras:Object.keys(FBDATA.eras).map(function (id) { return FBDATA.eras[id].balance; }) };
    });
    for (const id of ['867', '1066', '476']) {
      expect(result.out[id].same).toBe(true);
      expect(result.out[id].active).toMatchObject({ bookmark:id,
        campaignKeys:[], bookmarkKeys:[], modKeys:[] });
    }
    expect(result.out['476'].active.era).toBe('late_antique');
    expect(result.out['867'].active.era).toBe('early_medieval');
    expect(result.identity).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.eras).toEqual([null, null, null]);
  });

test('era and bookmark overrides apply in order and clear on the next activation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(async function () {
      function activate(id) {
        return new Promise(function (resolve, reject) {
          FB.activateBookmark(id, null, function (error) {
            if (error) reject(error); else resolve();
          });
        });
      }
      const B = FBDATA.balance, table = B;
      const global = { levyPerDev:B.levyPerDev, mortalityBase:B.mortalityBase,
        settleGold:B.settleGold, startAge:B.startAge };
      const era = FBDATA.eras.early_medieval, bookmark = FBDATA.bookmarks['867'];
      function read() {
        return { levyPerDev:B.levyPerDev, mortalityBase:B.mortalityBase,
          settleGold:B.settleGold, startAge:B.startAge };
      }
      const out = { global:global };
      try {
        era.balance = { levyPerDev:77, mortalityBase:0.02 };
        bookmark.balance = { mortalityBase:0.03, settleGold:5 };
        await activate('867');
        out.layered = read();
        out.active = FB.balanceLayers.active();
        await activate('1066');
        out.otherEra = read();
        delete bookmark.balance;
        await activate('867');
        out.eraOnly = read();
      } finally {
        era.balance = null;
        delete bookmark.balance;
        await activate('867');
      }
      out.cleared = read();
      out.identity = FBDATA.balance === table;
      return out;
    });
    expect(result.layered).toEqual({ levyPerDev:77, mortalityBase:0.03,
      settleGold:5, startAge:result.global.startAge });
    expect(result.active).toMatchObject({ era:'early_medieval', bookmark:'867',
      campaignKeys:['levyPerDev', 'mortalityBase', 'settleGold'],
      bookmarkKeys:['mortalityBase', 'settleGold'] });
    expect(result.otherEra).toEqual(result.global);
    expect(result.eraOnly).toEqual(Object.assign({}, result.global,
      { levyPerDev:77, mortalityBase:0.02 }));
    expect(result.cleared).toEqual(result.global);
    expect(result.identity).toBe(true);
  });

test('mod balance stays the last layer and policy tables still merge',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(async function () {
      function activate(id) {
        return new Promise(function (resolve, reject) {
          FB.activateBookmark(id, null, function (error) {
            if (error) reject(error); else resolve();
          });
        });
      }
      const B = FBDATA.balance, bookmark = FBDATA.bookmarks['867'];
      const policies = Object.keys(B.countyCommunityProjectPolicies || {});
      const out = { globalLevy:B.levyPerDev };
      FB.balanceLayers.applyMod('settleGold', 9, false);
      FB.balanceLayers.applyMod('countyCommunityProjectPolicies',
        { e2e_layer_policy:{ e2e:true } }, true);
      try {
        bookmark.balance = { settleGold:5, levyPerDev:66 };
        await activate('867');
        out.withBookmark = { settleGold:B.settleGold, levyPerDev:B.levyPerDev };
      } finally {
        delete bookmark.balance;
        await activate('867');
      }
      out.after = { settleGold:B.settleGold, levyPerDev:B.levyPerDev };
      out.policies = Object.keys(B.countyCommunityProjectPolicies);
      out.basePolicies = policies;
      out.modKeys = FB.balanceLayers.active().modKeys;
      return out;
    });
    expect(result.withBookmark).toEqual({ settleGold:9, levyPerDev:66 });
    expect(result.after).toEqual({ settleGold:9, levyPerDev:result.globalLevy });
    expect(result.policies).toEqual(result.basePolicies.concat(['e2e_layer_policy']));
    expect(result.modKeys).toEqual(['countyCommunityProjectPolicies', 'settleGold']);
  });

test('unknown keys and mistyped values are rejected in every override table',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const base = FB.bookmark('867'), era = FBDATA.eras.early_medieval;
      const out = {};
      out.problems = FB.balanceLayers.problems({ levyPerDev:'90', e2e_missing_knob:1,
        countyCommunityProjectPolicies:[], startAge:20 });
      out.notTable = FB.balanceLayers.problems([1]);
      out.bookmark = FB.validateBookmark(Object.assign({}, base,
        { balance:{ e2e_missing_knob:1, levyPerDev:NaN } }));
      try {
        era.balance = { e2e_missing_knob:1 };
        out.era = FB.validateEraData();
        out.eraBlocksBookmark = FB.validateBookmark(base);
      } finally {
        era.balance = null;
      }
      FBDATA.governmentForms.e2e_layer_form = Object.assign({},
        FBDATA.governmentForms.territorial, { balance:{ levyPerDev:true } });
      try {
        out.form = FB.governments.validate();
      } finally {
        delete FBDATA.governmentForms.e2e_layer_form;
      }
      out.clean = FB.validateEraData().concat(FB.governments.validate(),
        FB.validateBookmark(base));
      return out;
    });
    expect(result.problems).toEqual([
      { kind:'number', key:'levyPerDev' },
      { kind:'unknown', key:'e2e_missing_knob' },
      { kind:'type', key:'countyCommunityProjectPolicies' }
    ]);
    expect(result.notTable).toEqual([{ kind:'table', key:null }]);
    expect(result.bookmark).toContain(
      'Bookmark 867: balance key e2e_missing_knob is not in the balance table.');
    expect(result.bookmark).toContain('Bookmark 867: balance key levyPerDev must be a number.');
    expect(result.era).toEqual([
      'Era early_medieval: balance key e2e_missing_knob is not in the balance table.']);
    expect(result.eraBlocksBookmark).toContain(
      'Era early_medieval: balance key e2e_missing_knob is not in the balance table.');
    expect(result.form).toEqual([
      'Government form e2e_layer_form: balance key levyPerDev must be a number.']);
    expect(result.clean).toEqual([]);
  });

test('a government form override applies to its own realms only',
  async function ({ page }, testInfo) {
    await start867(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, forms = FBDATA.governmentForms;
      const rids = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm.alive && !realm.liege;
      }).sort(function (a, b) { return FB.aiBaseHost(s, b) - FB.aiBaseHost(s, a); });
      const target = rids[0], other = rids[1];
      const before = { target:FB.aiBaseHost(s, target), other:FB.aiBaseHost(s, other) };
      const levy = FBDATA.balance.levyPerDev, reserve = FBDATA.balance.realmReserveSeasons;
      forms.e2e_layer_form = Object.assign({}, forms.territorial,
        { balance:{ levyPerDev:levy / 10, realmReserveSeasons:reserve + 5 } });
      const out = { target:target, other:other, before:before };
      try {
        out.set = FB.authoritySetGovernment(s, target, 'e2e_layer_form');
        out.read = {
          target:FB.balanceFor(s, target, 'levyPerDev'),
          other:FB.balanceFor(s, other, 'levyPerDev'),
          reserve:FB.balanceFor(s, target, 'realmReserveSeasons'),
          unlayered:FB.balanceFor(s, target, 'settleGold') === FBDATA.balance.settleGold,
          active:FBDATA.balance.levyPerDev === levy
        };
        out.after = { target:FB.aiBaseHost(s, target), other:FB.aiBaseHost(s, other) };
        FB.balanceLayers.applyMod('levyPerDev', levy, false);
        out.modShadow = FB.balanceFor(s, target, 'levyPerDev');
      } finally {
        delete s.authority.governments[target];
        delete forms.e2e_layer_form;
      }
      out.levy = levy;
      out.reserve = reserve;
      return out;
    });
    expect(result.target).toBeTruthy();
    expect(result.other).toBeTruthy();
    expect(result.set).toBe(true);
    expect(result.read).toEqual({ target:result.levy / 10, other:result.levy,
      reserve:result.reserve + 5, unlayered:true, active:true });
    expect(result.after.target).toBeLessThan(result.before.target);
    expect(result.after.other).toBe(result.before.other);
    expect(result.modShadow).toBe(result.levy);
  });

test('restore rebuilds the active table from the stamped era',
  async function ({ page }, testInfo) {
    await start867(page, testInfo);
    const result = await page.evaluate(function () {
      const eras = FBDATA.eras, B = FBDATA.balance, out = {};
      try {
        eras.early_medieval.balance = { levyPerDev:77 };
        eras.high_medieval.balance = { levyPerDev:55, settleGold:3 };
        FB.balanceLayers.applyCampaign(FB.state);
        const table = JSON.stringify(B);
        const saved = JSON.parse(FB.save.serialize());
        out.played = B.levyPerDev;
        FB.balanceLayers.activate('high_medieval', FB.bookmark('1066'));
        out.disturbed = B.levyPerDev;
        FB.save.restore(saved);
        out.same = JSON.stringify(B) === table;
        out.active = FB.balanceLayers.active();
        const stamped = JSON.parse(JSON.stringify(saved));
        stamped.state.start.era = 'high_medieval';
        FB.save.restore(stamped);
        out.stamped = { levyPerDev:B.levyPerDev, settleGold:B.settleGold,
          era:FB.balanceLayers.active().era };
        FB.save.restore(saved);
      } finally {
        eras.early_medieval.balance = null;
        eras.high_medieval.balance = null;
        FB.balanceLayers.applyCampaign(FB.state);
      }
      out.cleared = B.levyPerDev;
      return out;
    });
    expect(result.played).toBe(77);
    expect(result.disturbed).toBe(55);
    expect(result.same).toBe(true);
    expect(result.active).toMatchObject({ era:'early_medieval', bookmark:'867',
      campaignKeys:['levyPerDev'] });
    expect(result.stamped).toEqual({ levyPerDev:55, settleGold:3, era:'high_medieval' });
    expect(result.cleared).toBe(90);
  });
