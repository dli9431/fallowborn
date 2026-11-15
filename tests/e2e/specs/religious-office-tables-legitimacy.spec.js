'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { routeListReader, installReadProbe, listStateSnapshot, politicalOfficeMod, importOfficeMod } =
  require('../support/game/religious-office-tables');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/model.js', 'js/institutions.js', 'js/politics.js',
  'js/religious_institutions.js', 'js/systems.js', 'js/government_ecclesiastical.js',
  'js/government_selection.js', 'js/papacy.js', 'js/authority.js', 'js/ecclesiastical_strategies.js',
  'js/governments.js', 'js/government_support.js', 'js/world.js', 'js/mods.js', 'js/save.js',
  'js/save_v4.js', 'js/religion.js', 'data/cultures.js', 'data/systems.js',
  'data/ecclesiastical_profiles.js', 'data/religious_institutions.js', 'data/distribution_crazygames.js']);

for (const bookmark of ['476', '1096', '1204']) {
  test('legitimacy lists preserve complete ordinary and boundary outputs in ' + bookmark, async function ({page}, info) {
    const outputs = [], evidence = [];
    for (const reference of [true, false]) {
      await routeListReader(page, reference);
      await beginBookmark(page, info, bookmark);
      await page.evaluate(installReadProbe);
      const phases = [], scans = [];
      for (const phase of ['ordinary', 'season', 'year']) {
        const measured = await page.evaluate(function (phase) {
          const s = FB.state;
          if (phase !== 'ordinary') {
            const season = phase === 'year' ? 3 : s.date.season;
            s.turn += (season - s.date.season) * 90 + 90 - s.date.day;
            s.date.season = season; s.date.day = 90;
          }
          const turn = s.turn;
          const result = measureOfficeRead(function () { FB.game.passDay({deferUi:true}); });
          return {phase:phase, counts:result.counts, error:result.error, days:s.turn - turn};
        }, phase);
        expect(measured.error).toBe(null);
        expect(measured.days).toBe(1);
        scans.push(measured);
        phases.push(await listStateSnapshot(page));
      }
      outputs.push(phases); evidence.push(scans);
      await info.attach((reference ? 'reference' : 'candidate') + '-list-boundary-counts', {
        body:JSON.stringify({bookmark:bookmark, phases:scans}), contentType:'application/json'});
    }
    expect(outputs[1]).toEqual(outputs[0]);
    for (let i = 0; i < evidence[0].length; i++) {
      expect(evidence[1][i].counts.direct).toBeLessThanOrEqual(evidence[0][i].counts.direct);
      expect(evidence[1][i].counts.independent).toBe(evidence[0][i].counts.independent);
    }
    if (bookmark === '476') {
      expect(evidence[1][1].counts.direct).toBeLessThan(evidence[0][1].counts.direct);
      expect(evidence[1][2].counts.direct).toBeLessThan(evidence[0][2].counts.direct);
    }
    console.log('LEGITIMACY_LIST_BOUNDARIES ' + JSON.stringify({bookmark:bookmark, reference:evidence[0], candidate:evidence[1]}));
  });
}

test('legitimacy lists preserve mixed filters, ordinary holder rules and independent reads', async function ({page}, info) {
  await routeListReader(page, false);
  await beginBookmark(page, info, '476');
  await page.evaluate(installReadProbe);
  const result = await page.evaluate(function () {
    const s = FB.state, Q = FB.political, subject = {kind:'character', id:s.player.charId};
    const offices = FB.religiousOffices(s), scans = [], values = [];
    let proof;
    for (const oid of Object.keys(offices)) {
      if (offices[oid].head.succession === 'political_incumbent') continue;
      proof = FB.authorityRecognize(s, {source:'church_support', issuer:{kind:'religious-office', id:oid}, subject:subject});
      if (proof) break;
    }
    if (!proof) throw new Error('No ordinary office recognition');
    const original = s.authority.recognitions, copy = function (value) { return JSON.parse(JSON.stringify(value)); };
    const priest = Object.keys(s.chars).find(function (id) { return !s.chars[id].dead && ['priest','monk'].indexOf(s.chars[id].role) >= 0; });
    if (!priest) throw new Error('No ordinary priest');
    const pid = s.player.provinceId, other = FB.campaignBookmark(s).provinces.find(function (row) { return row.id !== pid; }).id;
    function row(id, patch) { return Object.assign(copy(proof), {id:id}, patch || {}); }
    const rows = [row('list_a'), row('list_priest', {issuer:{kind:'character', id:priest}, issuerGeneration:priest}),
      row('list_b', {scope:{kind:'county', id:pid}}), row('list_c', {scope:{kind:'county', id:other}}),
      row('list_expired', {endTurn:s.turn}), row('list_revoked', {status:'revoked'}),
      row('list_unknown', {source:'missing_source'}), row('list_foreign', {subject:{kind:'character', id:'missing_subject'}})];
    function check(name, who, at, source) {
      const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const prior = measureOfficeRead(function () { return FB.listPriorLegitimacy(s, who || subject, at, source); });
      const current = measureOfficeRead(function () { return Q.legitimacy(s, who || subject, at, source); });
      if (prior.error !== current.error || JSON.stringify(prior.value) !== JSON.stringify(current.value)) throw new Error('List parity ' + name);
      if (before !== JSON.stringify(s) || data !== JSON.stringify(FBDATA) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure list ' + name);
      scans.push({name:name, reference:prior.counts, candidate:current.counts});
      values.push([name, current.value && current.value.map(function (r) { return r.id; }), current.error]);
      return current;
    }
    s.authority.recognitions = rows;
    try {
      check('mixed'); check('scope', null, {kind:'county', id:pid}); check('filtered-source', null, null, 'missing_source');
      const escaped = Q.legitimacy(s, subject)[0]; escaped.issuer.id = 'poison'; escaped.subject.id = 'poison';
      check('returned-copy');
      check('invalid-subject', {kind:'character', id:'missing_subject'});
      check('invalid-scope', null, {kind:'county', id:'missing_county'});
      s.authority.recognitions = []; check('empty');
      s.authority.recognitions = [rows[1]]; check('non-office');
      s.authority.recognitions = rows;
      const holderId = s.religiousHeads[proof.issuer.id], holder = s.chars[holderId] || s.realms[holderId];
      const dead = holder.dead, alive = holder.alive, captive = holder.captive;
      holder.captive = true; check('ordinary-captive');
      if (captive === undefined) delete holder.captive; else holder.captive = captive;
      if (s.chars[holderId]) holder.dead = true; else holder.alive = false;
      check('holder-dead');
      if (dead === undefined) delete holder.dead; else holder.dead = dead;
      if (alive === undefined) delete holder.alive; else holder.alive = alive;
      s.religiousHeads[proof.issuer.id] = null; check('holder-vacant');
      s.religiousHeads[proof.issuer.id] = holderId; check('holder-restored');
      const installed = FBDATA;
      try { window.FBDATA = Object.assign({}, installed); check('catalogue-replaced'); }
      finally { window.FBDATA = installed; }
      check('catalogue-restored');
      const detached = copy(s);
      const prior = FB.listPriorLegitimacy(detached, subject), current = Q.legitimacy(detached, subject);
      if (JSON.stringify(prior) !== JSON.stringify(current)) throw new Error('Detached state parity');
      check('after-detached');
      const getter = FB.religiousOffices;
      FB.religiousOffices = function () { throw new Error('list-definition-sentinel'); };
      try { check('definition-error'); }
      finally { FB.religiousOffices = getter; }
      check('after-error');
      const standalone = measureOfficeRead(function () { return FB.listReadActive(s, rows[0]); });
      if (standalone.error || standalone.counts.direct !== 1) throw new Error('Standalone row lifetime changed');
    } finally { s.authority.recognitions = original; }
    return {scans:scans, values:values};
  });
  for (const name of ['mixed','scope','filtered-source','returned-copy','ordinary-captive','holder-dead',
    'holder-vacant','holder-restored','catalogue-replaced','catalogue-restored','after-detached','after-error']) {
    const row = result.scans.find(function (r) { return r.name === name; });
    expect(row.reference.direct, name).toBe(3);
    expect(row.candidate.direct, name).toBe(1);
  }
  for (const name of ['invalid-subject','invalid-scope','empty','non-office']) {
    expect(result.scans.find(function (r) { return r.name === name; }).candidate.direct, name).toBe(0);
  }
  expect(result.values.find(function (r) { return r[0] === 'mixed'; })[1]).toEqual(['list_a','list_priest','list_b','list_c']);
  expect(result.values.find(function (r) { return r[0] === 'scope'; })[1]).toEqual(['list_a','list_priest','list_b']);
  expect(result.values.find(function (r) { return r[0] === 'filtered-source'; })[1]).toEqual([]);
  expect(result.values.find(function (r) { return r[0] === 'definition-error'; })[2]).toBe('list-definition-sentinel');
  await info.attach('ordinary-list-validation-counts', {body:JSON.stringify(result), contentType:'application/json'});
});

for (const minAge of [18, 22]) {
  test('JSON political lists keep live row checks, nesting and restore at minimum age ' + minAge, async function ({page}, info) {
    await routeListReader(page, false);
    await openGame(page, info);
    const mod = JSON.parse(JSON.stringify(politicalOfficeMod));
    mod.religions.estuary_tradition_demo.properties.head.minAge = minAge;
    await importOfficeMod(page, mod);
    await beginBookmarkFromTitle(page, 'paired_office_world', 'estuary_household_demo');
    await page.evaluate(installReadProbe);
    const result = await page.evaluate(function () {
      const s = FB.state, Q = FB.political, S = FB.governmentSelection, scans = [];
      const subject = {kind:'character', id:s.player.charId}, oid = 'southern_office_demo', rid = 'southern_court_demo';
      const proof = FB.authorityRecognize(s, {source:'church_support', issuer:{kind:'religious-office', id:oid}, subject:subject});
      if (!proof) throw new Error('Political list setup failed');
      const original = s.authority.recognitions, row = original.find(function (r) { return r.id === proof.id; });
      const rows = [Object.assign({}, row, {id:'political_list_a'}), Object.assign({}, row, {id:'political_list_b'})];
      const t = s.realms[rid].succession, c = s.chars[t.members[t.rulerMemberId].charId];
      function check(name, reset) {
        const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
        if (reset) reset();
        const prior = measureOfficeRead(function () { return FB.listPriorLegitimacy(s, subject); });
        if (reset) reset();
        const current = measureOfficeRead(function () { return Q.legitimacy(s, subject); });
        if (prior.error !== current.error || JSON.stringify(prior.value) !== JSON.stringify(current.value)) throw new Error('Political list parity ' + name);
        if (before !== JSON.stringify(s) || data !== JSON.stringify(FBDATA) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure political list ' + name);
        scans.push({name:name, reference:prior.counts, candidate:current.counts,
          value:current.value && current.value.map(function (r) { return r.id; }), error:current.error});
      }
      s.authority.recognitions = rows;
      try {
        check('qualified');
        const born = c.born; c.born = s.date.year - 1; check('underage'); c.born = born;
        const consent = S.state(s, rid).recognition;
        S.state(s, rid).recognition = null; check('consent-lost'); S.state(s, rid).recognition = consent;
        s.religiousHeads[oid] = null; check('vacant'); s.religiousHeads[oid] = c.id;
        check('recovered');
        const reader = FB.religiousOfficeSnapshot;
        let calls = 0;
        FB.religiousOfficeSnapshot = function () { return ++calls === 3 ? null : reader.apply(this, arguments); };
        try { check('second-row-live', function () { calls = 0; }); }
        finally { FB.religiousOfficeSnapshot = reader; }
        let nested = false, nestedCalls = 0;
        FB.religiousOfficeSnapshot = function () {
          if (!nested) { nested = true; nestedCalls++; Q.legitimacy(s, subject); }
          return reader.apply(this, arguments);
        };
        try {
          const prior = measureOfficeRead(function () { return FB.listPriorLegitimacy(s, subject); });
          nested = false;
          const current = measureOfficeRead(function () { return Q.legitimacy(s, subject); });
          if (prior.error || current.error || JSON.stringify(prior.value) !== JSON.stringify(current.value)) throw new Error('Nested list parity');
          scans.push({name:'nested', reference:prior.counts, candidate:current.counts, nestedCalls:nestedCalls});
        } finally { FB.religiousOfficeSnapshot = reader; }
        FB.religiousOfficeSnapshot = function () { throw new Error('list-holder-sentinel'); };
        try { check('holder-error'); }
        finally { FB.religiousOfficeSnapshot = reader; }
        check('after-error');
      } finally { s.authority.recognitions = original; }
      return {scans:scans, save:FB.save.serialize(), subject:subject};
    });
    for (const row of result.scans) {
      if (row.name === 'nested') {
        expect(row.candidate.direct).toBe(2);
        expect(row.reference.direct).toBeGreaterThan(row.candidate.direct);
        expect(row.nestedCalls).toBe(2);
      } else {
        expect(row.candidate.direct, row.name).toBe(1);
        expect(row.candidate.snapshots, row.name).toBe(row.reference.snapshots);
      }
    }
    expect(result.scans.find(function (r) { return r.name === 'qualified'; }).value).toEqual(['political_list_a','political_list_b']);
    expect(result.scans.find(function (r) { return r.name === 'qualified'; }).candidate.snapshots).toBe(4);
    expect(result.scans.find(function (r) { return r.name === 'second-row-live'; }).value).toEqual(['political_list_a']);
    for (const name of ['underage','consent-lost','vacant']) expect(result.scans.find(function (r) { return r.name === name; }).value, name).toEqual([]);
    expect(result.scans.find(function (r) { return r.name === 'holder-error'; }).error).toBe('list-holder-sentinel');
    const beforeRestore = await listStateSnapshot(page);
    await restoreBookmark(page, result.save);
    expect(await page.evaluate(function (subject) {
      return FB.political.legitimacy(FB.state, subject);
    }, result.subject)).toEqual(await page.evaluate(function (subject) {
      return FB.listPriorLegitimacy(FB.state, subject);
    }, result.subject));
    const afterRestore = await listStateSnapshot(page);
    expect(afterRestore.data).toBe(beforeRestore.data);
    await info.attach('political-list-validation-counts', {body:JSON.stringify(result.scans), contentType:'application/json'});
  });
}
