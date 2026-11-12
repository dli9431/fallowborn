'use strict';
const {test, expect} = require('../support/fixture');
const {beginBookmark, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/authority.js','js/ledger_retention.js','js/save_v4.js',
  'js/save.js','js/government_assembly.js','js/government_civic.js','js/ecclesiastical_strategies.js','js/main.js','js/day_phases.js','js/institutions.js','js/government_support.js','js/tournaments.js','js/messages.js']);

async function start(page, info, bookmark, scenario) {
  if (scenario === 'mobile_household_476') return beginBookmark(page,info,bookmark,scenario);
  await openGame(page,info);
  await prepareGameContent(page);
  const code = await page.evaluate(function (input) {
    const b = FB.bookmark(input.bookmark);
    const source = FBDATA.startScenarios.find(function (s) { return s.id === input.scenario; });
    source.hidden = false; b.hidden = false; FBDATA.bookmarks[input.bookmark].hidden = false;
    FB.startProgression.noteTier(3);
    const sc = FB.startIdentity(source,b);
    const p = b.provinces.find(function (p) { return FB.startProvinceAllowed(sc,b,p.id); });
    const base = 'RETENTION-' + input.bookmark + '-' + sc.id + '-' + p.id + '-' + sc.sex + '-' +
      sc.characterName.replace(/-/g,'').replace(/\s+/g,'_');
    return sc.startCulture !== p.culture || sc.startReligion !== p.religion
      ? base + '-standard-0-' + sc.startCulture + '.' + sc.startReligion : base;
  }, {bookmark,scenario});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const [bookmark,scenario] of [['476','mobile_household_476'],['476','peroz_sasanian_476'],
  ['1096','yaghi_siyan_1096'],['1204','muhammad_1204']]) {
  test(scenario + ' customary observations fold without changing political outcomes', async function ({page}, info) {
    await start(page, info, bookmark, scenario);
    // Existing uncompressed current-content authority survives before any fold.
    await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
    const result = await page.evaluate(function () {
      const s = FB.state;
      function bytes(v) { return new TextEncoder().encode(JSON.stringify(v)).length; }
      function inventory(t) {
        const a = t.authority || {};
        const out = {};
        ['appointments','recognitions','contracts','rights','receipts','governments'].forEach(function (key) {
          out[key] = {count:Object.keys(a[key] || {}).length, bytes:bytes(a[key] || (key === 'governments' ? {} : []))};
        });
        out.history = {count:(a.rights || []).reduce(function (n,r) { return n + r.history.length; },0),
          bytes:(a.rights || []).reduce(function (n,r) { return n + bytes(r.history); },0)};
        out.history.kinds = {};
        (a.rights || []).forEach(function (r) {
          r.history.forEach(function (entry) {
            const item = out.history.kinds[entry.event] ||
              (out.history.kinds[entry.event] = {count:0,bytes:0});
            item.count++; item.bytes += bytes(entry);
          });
        });
        ['localInstitutions','governmentSupport','tournaments','chronicle'].forEach(function (root) {
          const value = t[root] || {};
          const rows = root === 'governmentSupport' ? Object.values(value.polities || {}) :
            root === 'localInstitutions' ? Object.values(value) : [value];
          out[root] = {count:rows.length,bytes:bytes(value),kinds:{}};
          rows.forEach(function (row) {
            Object.keys(row).forEach(function (key) {
              const v = row[key];
              if (!v || typeof v !== 'object') return;
              const item = out[root].kinds[key] || (out[root].kinds[key] = {count:0,bytes:0});
              item.count += ['mandate','selection','dues'].indexOf(key) >= 0 ? 1 : Object.keys(v).length;
              item.bytes += bytes(v);
            });
          });
        });
        out.authorityBytes = bytes(a);
        return out;
      }
      const opening = inventory(s);
      // Four directly staged boundaries, not a year of daily simulation.
      for (let season = 1; season <= 4; season++) {
        s.turn = season * 90; s.date.season = season % 4; s.date.day = 1;
        if (season === 4) s.date.year++;
        FB.authoritySeason(s); FB.localInstitutionsSeason(s);
        Object.keys(s.governmentSupport && s.governmentSupport.polities || {}).forEach(function (rid) {
          FB.governments.support.tick(s,rid);
        });
        FB.governments.support.day(s); FB.tournaments.season(s);
      }
      FB.authorityYear(s);
      const annual = inventory(s);
      const freshHistory = JSON.stringify(s.authority);
      FB.authorityCompact(s);
      const firstYearRetained = freshHistory === JSON.stringify(s.authority);
      const growth = {};
      Object.keys(annual).forEach(function (key) {
        if (typeof annual[key] !== 'object') return;
        growth[key] = {count:annual[key].count - opening[key].count,
          bytes:annual[key].bytes - opening[key].bytes};
        if (annual[key].kinds) {
          growth[key].kinds = {};
          Object.keys(annual[key].kinds).forEach(function (kind) {
            const a = annual[key].kinds[kind], o = opening[key].kinds[kind] || {count:0,bytes:0};
            growth[key].kinds[kind] = {count:a.count-o.count,bytes:a.bytes-o.bytes,
              share:annual[key].bytes === opening[key].bytes ? null :
                (a.bytes-o.bytes)/(annual[key].bytes-opening[key].bytes)};
          });
        }
      });
      // Directly stage thirty annual observations per right, without simulating years.
      const baseYear = s.date.year;
      s.authority.rights.forEach(function (r) {
        for (let y = 1; y <= 30; y++) r.history.push({turn:y * 360, year:baseYear + y - 1,
          event:'possession', evidence:null});
      });
      s.turn = 31 * 360; s.date.year = baseYear + 30;
      const sample = s.authority.rights[0];
      if (!sample) throw new Error('Missing annual customary rights');
      sample.history.push({turn:1,year:baseYear,event:'disputed',evidence:null});
      sample.history.push({turn:1,year:baseYear,event:'abandoned',evidence:null});
      sample.history.push({turn:s.turn - 3600,year:baseYear,event:'possession',evidence:null});
      sample.history.push({turn:s.turn - 3599,year:baseYear,event:'abandoned',evidence:null});
      sample.history.push({turn:1,year:baseYear,event:'judgment',evidence:'permanent-proof'});
      sample.history.push({turn:1,year:baseYear,event:'disputed',evidence:'permanent-dispute'});
      function observationBytes(t) {
        return bytes(t.authority.rights.map(function (r) {
          return {history:r.history,retiredHistory:r.retiredHistory};
        }));
      }
      const historyBefore = observationBytes(s);
      const before = bytes(s.authority);
      const full = JSON.parse(JSON.stringify(s));
      const environment = JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter(),s.start]);
      s.date.day = 2;
      const offBoundary = JSON.stringify(s);
      const deferred = !FB.authorityCompact(s) && offBoundary === JSON.stringify(s);
      s.date.day = 1;
      const changed = FB.authorityCompact(s);
      const once = JSON.stringify(s);
      const twice = FB.authorityCompact(s);
      const twin = JSON.parse(JSON.stringify(full));
      FB.authorityCompact(twin);
      const deterministic = once === JSON.stringify(twin);
      // Canonical comparison removes only the deliberately folded observations.
      function canonical(t) {
        t = JSON.parse(JSON.stringify(t));
        t.authority.rights.forEach(function (r) { delete r.history; delete r.retiredHistory; });
        return JSON.stringify(t);
      }
      const preserved = canonical(full) === canonical(s);
      function observations(t) {
        return t.authority.rights.map(function (r) {
          const counts = {possession:0,disputed:0,abandoned:0};
          Object.keys(counts).forEach(function (event) {
            counts[event] = r.history.filter(function (h) { return h.event === event; }).length +
              (r.retiredHistory && r.retiredHistory[event] || 0);
          });
          return counts;
        });
      }
      const exactTotals = JSON.stringify(observations(full)) === JSON.stringify(observations(s));
      const summaryTotals = {possession:0,disputed:0,abandoned:0};
      s.authority.rights.forEach(function (r) {
        Object.keys(summaryTotals).forEach(function (event) {
          summaryTotals[event] += r.retiredHistory && r.retiredHistory[event] || 0;
        });
      });
      const folded = s.authority.rights.reduce(function (n,r) { return n + (r.retiredHistory ? r.retiredHistory.possession : 0); },0);
      const evidence = s.authority.rights[0].history.filter(function (r) { return r.evidence; });
      const windowPreserved = s.authority.rights[0].history.some(function (h) {
        return h.event === 'abandoned' && h.turn === s.turn - 3599;
      }) && !s.authority.rights[0].history.some(function (h) { return h.turn === s.turn - 3600; });
      const after = bytes(s.authority), historyAfter = observationBytes(s);
      // Same staged seasonal authority hook, same RNG/UID: effective state is identical.
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.authoritySeason(full);
      const baseline = JSON.stringify(full), baselineRng = FB.getRngState(), baselineUid = FB.getUidCounter();
      FB.setRngState(rng); FB.setUidCounter(uid);
      FB.authoritySeason(s);
      const parity = baseline === JSON.stringify(s) && baselineRng === FB.getRngState() && baselineUid === FB.getUidCounter();
      const bad = JSON.parse(JSON.stringify(s));
      bad.authority.rights[0].retiredHistory.possession = -1;
      let rejected = false;
      try { FB.save.v4.validateAuthority(bad.authority,bad); } catch (e) { rejected = true; }
      return {opening,annual,growth,firstYearRetained,windowPreserved,before,after,historyBefore,historyAfter,summaryTotals,folded,changed,twice,deterministic,preserved,parity,rejected,evidence,deferred,exactTotals,
        environment:environment === JSON.stringify([FBDATA,rng,uid,s.start]),
        failure:FB.ledgerRetention.lastFailure, text:FB.save.serialize(), authority:JSON.stringify(s.authority)};
    });
    expect(result).toMatchObject({changed:true,twice:false,deterministic:true,preserved:true,parity:true,
      rejected:true,environment:true,failure:null,deferred:true,exactTotals:true,firstYearRetained:true,windowPreserved:true});
    expect(result.evidence.map(function (r) { return r.evidence; })).toEqual(['permanent-proof','permanent-dispute']);
    expect(result.folded).toBeGreaterThan(0);
    expect(result.after).toBeLessThan(result.before * 0.6);
    expect(result.historyAfter).toBeLessThanOrEqual(result.historyBefore * 0.5);
    console.log(scenario + ' staged authority survey ' + JSON.stringify({opening:result.opening,annual:result.annual,growth:result.growth,
      units:"UTF-8 bytes",before:result.before,after:result.after,historyBefore:result.historyBefore,historyAfter:result.historyAfter,summaryTotals:result.summaryTotals,folded:result.folded}));
    await restoreBookmark(page,result.text);
    expect(await page.evaluate(function () { return JSON.stringify(FB.state.authority); })).toBe(result.authority);
    await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
    expect(await page.evaluate(function () { return JSON.stringify(FB.state.authority); })).toBe(result.authority);
  });
}


test('fixed-seed daily season has identical saves with retention enabled or deferred', async function ({page}, info) {
  await beginBookmark(page,info,'867','farmer');
  const initial = await page.evaluate(function () {
    const s = FB.state;
    FB.authorityYear(s);
    s.turn = 7200; s.date.year += 20; s.date.season = 0; s.date.day = 1;
    s.authority.rights.forEach(function (r) {
      for (let y = 1; y <= 20; y++) r.history.push({turn:y * 360,year:s.date.year - 20 + y,
        event:'possession',evidence:null});
    });
    return FB.save.serialize();
  });
  async function season(defer) {
    await restoreBookmark(page,initial);
    return page.evaluate(function (defer) {
      const compact = FB.authorityCompact;
      const catalogue = JSON.stringify(FBDATA);
      FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
      FB.ui.closeModal();
      if (defer) FB.authorityCompact = function () { return false; };
      const startTurn = FB.state.turn;
      try {
        for (let day = 0; day < 90; day++) FB.game.passDay();
      } finally { FB.authorityCompact = compact; }
      const advanced = FB.state.turn - startTurn;
      // Compare exact saves in the same folded representation, including all live outcomes.
      compact(FB.state);
      return {advanced:advanced,save:FB.save.serialize(),rng:FB.getRngState(),uid:FB.getUidCounter(),
        catalogue:catalogue === JSON.stringify(FBDATA)};
    },defer);
  }
  const before = await season(true), after = await season(false);
  expect(before.advanced).toBe(90);
  expect(before.catalogue).toBe(true);
  expect(after).toEqual(before);
});


for (const bookmark of ['867','1066']) {
  test(bookmark + ' released baseline v3 envelope migrates, folds and re-saves', async function ({page},info) {
    await openGame(page,info);
    await page.evaluate(function (id) { FBDATA.bookmarks[id].revision = 'baseline'; },bookmark);
    await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('RETENTION-' + bookmark + '-serf-london-f-Ada');
    await page.locator('#ng-seed').press('Enter');
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    const legacy = await page.evaluate(function () {
      FB.game.setPaused(true);
      const saved = JSON.parse(FB.save.serialize());
      if (saved.state.start.revision !== 'baseline') throw new Error('Expected released geography');
      saved.v = 3;
      delete saved.titleIds; delete saved.authoritySchema; delete saved.platformSchema;
      delete saved.state.start.revision;
      if (saved.state.authority) delete saved.state.authority.schema;
      return JSON.stringify(saved);
    });
    // A generated envelope exercises the released migration contract; it is not an owner save export.
    await restoreBookmark(page,legacy);
    const result = await page.evaluate(function () {
      const s = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      const player = JSON.stringify(s.player), start = JSON.stringify(s.start);
      FB.authorityYear(s);
      s.turn = 7200; s.date.day = 1; s.date.year += 20;
      s.authority.rights.forEach(function (r) {
        r.history.push({turn:1,year:s.date.year - 20,event:'possession',evidence:null});
      });
      const changed = FB.authorityCompact(s);
      return {changed:changed,random:rng === FB.getRngState() && uid === FB.getUidCounter(),
        facts:player === JSON.stringify(s.player) && start === JSON.stringify(s.start),
        // Newly created legacy authority has no live schema stamp until serialization.
        // Expect the exact published stamp as well as every original ledger field.
        authority:JSON.stringify(Object.assign({},s.authority,{schema:4})),text:FB.save.serialize()};
    });
    expect(result).toMatchObject({changed:true,random:true,facts:true});
    await restoreBookmark(page,result.text);
    expect(await page.evaluate(function () { return JSON.stringify(FB.state.authority); })).toBe(result.authority);
    await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
    expect(await page.evaluate(function () { return JSON.stringify(FB.state.authority); })).toBe(result.authority);
  });
}
