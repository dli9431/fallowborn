'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/bookmark_800.js','data/bookmark_800_history.js',
  'data/story_instances.js','data/technology.js','js/starts.js','js/stories.js',
  'js/story_settlements.js','js/royal_settlements.js','js/world.js','js/main.js',
  'js/save.js','js/save_v4.js','js/mods.js']);

async function adopted(page, info, kind) {
  await openGame(page, info);
  const fixture = path.resolve(__dirname, '../fixtures/authoring/player-dynastic-' + kind + '.json');
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, require(fixture))).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(fixture);
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }),
    page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  const fault = await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('800', null, function (error) {
        if (error) { resolve(error.message); return; }
        FB.game.pending = { seed:'PLAYER-DYNASTIC-SETTLEMENTS' };
        FB.game.startObserve(); FB.game.setPaused(true); resolve(null);
      });
    });
  });
  expect(fault).toBe(null);
  const adopted = await page.evaluate(function (input) {
    const s = FB.state, cast = s.stories.divisio_800.cast;
    const rid = input === 'actor' ? 'carolingian_800' : 'aquitaine';
    const c = s.chars[input === 'actor' ? cast.charlemagne : cast.louis];
    const scenario = { id:'fixture_' + input + '_800', bookmarkIds:['800'],
      rulerRealmId:rid, governmentForm:'territorial', tier:input === 'actor' ? 7 : 6,
      gold:120, onboarding:'ruler' };
    FBDATA.startScenarios.push(scenario);
    s.player.charId = c.id; s.player.houseFounderId = c.id;
    s.player.tier = scenario.tier; s.player.profession = 'noble';
    s.player.provinceId = input === 'actor' ? 'roma' : 'bordeaux';
    FB.game.observe = false;
    return FB.adoptStartingRealm(s, scenario, { deferSetup:true });
  }, kind);
  expect(adopted).toBe(true);
}

test('adopted senior actor retains one family and approves a reviewed plan', async function ({ page }, info) {
  await adopted(page, info, 'actor');
  const result = await page.evaluate(function () {
    const s = FB.state, rec = s.stories.divisio_800, cast = rec.cast;
    const father = s.chars[cast.charlemagne], louis = s.chars[cast.louis];
    s.date.year = 806;
    const reviewBefore = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const story = FB.stories.get('divisio_800'), q = FB.stories.quote(s, 'divisio_800', 'approve');
    const pureReview = reviewBefore === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const before = JSON.stringify({ owner:s.owner, holder:s.holder });
    const stale = JSON.parse(JSON.stringify(q)); stale.stamp = 'stale';
    const refused = !FB.stories.apply(s, 'divisio_800', 'approve', stale);
    const authorized = FB.stories.apply(s, 'divisio_800', 'approve', q);
    const chance = FB.chance;
    try { FB.chance = function () { return true; }; story.season(s, rec); }
    finally { FB.chance = chance; }
    const noPrematureGrant = before === JSON.stringify({ owner:s.owner, holder:s.holder });
    const liege = s.realms.aquitaine.liege;
    s.realms.aquitaine.liege = 'byzantium';
    const blockedRelease = !FB.releaseRoyalRegion(s, 'player', 'aquitaine') && rec.phase === 'planned';
    s.realms.aquitaine.liege = liege;
    const saved = JSON.parse(FB.save.serialize());
    const snapshot = JSON.stringify({ stories:s.stories, owner:s.owner, holder:s.holder });
    FB.save.restore(saved);
    return { actor:s.start.rulerRealmId, genealogy:louis.fatherId === father.id,
      oneLouis:Object.values(s.chars).filter(function (c) {
        return c.name === louis.name && c.born === louis.born && c.dyn === louis.dyn;
      }).length === 1,
      family:!!s.realms.player.succession.settlementGenealogy, cast:cast.louis === louis.id,
      date:FB.stories.get('divisio_800').declaration.firstYear, allowed:q.allowed, pureReview:pureReview,
      parties:Object.keys(rec.approvals), refused:refused, authorized:authorized,
      planned:rec.phase === 'planned', noPrematureGrant:noPrematureGrant,
      blockedRelease:blockedRelease, retained:snapshot === JSON.stringify({
        stories:FB.state.stories, owner:FB.state.owner, holder:FB.state.holder }) };
  });
  expect(result).toEqual({ actor:'carolingian_800', genealogy:true, oneLouis:true,
    family:true, cast:true, date:806, allowed:true, pureReview:true, parties:['player'],
    refused:true, authorized:true, planned:true, noPrematureGrant:true,
    blockedRelease:true, retained:true });
});

test('adopted actor restores pending legacy aggregate settlements without replay', async function ({ page }, info) {
  await adopted(page, info, 'actor');
  const result = await page.evaluate(function () {
    function snapshot(rows) { return JSON.stringify(Object.keys(rows).sort().map(function (id) { return [id, rows[id]]; })); }
    const saved = JSON.parse(FB.save.serialize()), expected = snapshot(saved.state.stories);
    const cast = saved.state.stories.divisio_800.cast;
    const pressure = saved.state.stories.verdun_800.pressure;
    const opportunities = {};
    ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
      const id = key + '_800', row = saved.state.stories[id];
      delete row.approvals; delete row.cast; delete row.pressure;
      opportunities[key] = row; delete saved.state.stories[id];
    });
    saved.state.stories.carolingian_settlements_800 = { cast:cast, pressure:pressure, opportunities:opportunities };
    const detached = JSON.stringify(saved), live = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const migrated = FB.save.v4.migrate(saved);
    const untouched = detached === JSON.stringify(saved) && live === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.save.restore(saved);
    return { untouched:untouched, migrated:snapshot(migrated.state.stories) === expected,
      restored:snapshot(FB.state.stories) === expected,
      pending:FB.state.stories.divisio_800.phase === 'pending',
      noReplay:FB.state.owner.aachen === 'player' && FB.state.realms.aquitaine.liege === 'player' };
  });
  expect(result).toEqual({ untouched:true, migrated:true, restored:true, pending:true, noReplay:true });
});

test('adopted beneficiary uses ordinary sons for later designation and rejects damaged saved plans', async function ({ page }, info) {
  await adopted(page, info, 'beneficiary');
  const result = await page.evaluate(function () {
    const s = FB.state, divisio = s.stories.divisio_800, cast = divisio.cast;
    const source = s.realms.carolingian_800.succession;
    const charles = Object.values(source.members).find(function (m) { return m.localId === 'charles'; });
    FB.killChar(s, s.chars[charles.charId]);
    const louis = Object.values(source.members).find(function (m) {
      return m.branchRef && m.branchRef.realmId === 'player' && m.charId === cast.louis;
    });
    FB.designateRoyalHeir(s, 'carolingian_800', louis.id);
    s.date.year = 807;
    FB.stories.apply(s, 'divisio_800', 'approve', FB.stories.quote(s, 'divisio_800', 'approve'));
    const chance = FB.chance;
    try { FB.chance = function () { return true; }; FB.stories.get('divisio_800').season(s, divisio); }
    finally { FB.chance = chance; }
    FB.killChar(s, s.chars[cast.charlemagne]);
    FB.stories.get('divisio_800').day(s, divisio);
    s.date.year = 817;
    const ordinary = FB.childrenOf(s, s.chars[s.player.charId]).filter(function (c) {
      return !c.dead && c.sex === 'm';
    }).sort(function (a, b) { return a.born - b.born; });
    const current = FB.stories.quote(s, 'ordinatio_800', 'approve');
    const old = JSON.parse(FB.save.serialize()), before = JSON.stringify(old);
    const invalid = JSON.parse(before);
    invalid.state.stories.divisio_800.plan.primaryId = 'missing_member';
    const liveBefore = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false;
    try { FB.save.restore(invalid); } catch (_) { rejected = true; }
    const detached = before === JSON.stringify(old) && liveBefore === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter();
    const valid = FB.stories.apply(s, 'ordinatio_800', 'approve', current);
    try { FB.chance = function () { return true; }; FB.stories.get('ordinatio_800').season(s, s.stories.ordinatio_800); }
    finally { FB.chance = chance; }
    const plan = s.stories.ordinatio_800.plan;
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return { sons:ordinary.map(function (c) { return c.name; }), allowed:current.allowed,
      primary:current.facts.check.plan.primaryId === 'royal_aquitaine_authored_lothair',
      rejected:rejected, detached:detached, consent:valid, agreed:FB.state.stories.ordinatio_800.result === 'agreed',
      named:FB.state.player.namedHeirId === ordinary[0].id,
      grant:plan.shares.length === 1 && FB.state.realms[plan.shares[0].realmId].liege === 'player',
      restored:FB.state.stories.ordinatio_800.plan.shares[0].charId === ordinary[1].id };
  });
  expect(result).toEqual({ sons:['Lothair','Pippin'], allowed:true, primary:true,
    rejected:true, detached:true, consent:true, agreed:true, named:true,
    grant:true, restored:true });
});

test('adopted regional beneficiary must consent and can inherit the original crown', async function ({ page }, info) {
  await adopted(page, info, 'beneficiary');
  const result = await page.evaluate(function () {
    const s = FB.state, rec = s.stories.divisio_800, cast = rec.cast;
    const source = s.realms.carolingian_800.succession;
    const charles = Object.values(source.members).find(function (m) { return m.localId === 'charles'; });
    const linked = Object.values(source.members).find(function (m) {
      return m.branchRef && m.branchRef.realmId === 'player' && m.charId === cast.louis;
    });
    FB.killChar(s, s.chars[charles.charId]);
    FB.designateRoyalHeir(s, 'carolingian_800', linked.id);
    s.date.year = 807;
    const story = FB.stories.get('divisio_800'), q = FB.stories.quote(s, 'divisio_800', 'approve');
    const before = JSON.stringify({ owner:s.owner, holder:s.holder, liege:s.player.liege });
    const consent = FB.stories.apply(s, 'divisio_800', 'approve', q);
    const consentUnchanged = before === JSON.stringify({ owner:s.owner, holder:s.holder, liege:s.player.liege });
    const chance = FB.chance;
    try { FB.chance = function () { return true; }; story.season(s, rec); }
    finally { FB.chance = chance; }
    const planned = rec.phase === 'planned' && rec.plan.primaryId === linked.id;
    FB.killChar(s, s.chars[cast.charlemagne]);
    const italianOwner = s.owner.pavia;
    s.owner.pavia = 'byzantium';
    story.day(s, rec);
    const refusedRelease = rec.phase === 'planned' && rec.result === null;
    s.owner.pavia = italianOwner;
    story.day(s, rec);
    const inherited = !s.realms.carolingian_800.alive &&
      s.realms.carolingian_800.settlementSuccessorId === 'player' &&
      s.owner.aachen === 'player';
    const saved = JSON.parse(FB.save.serialize());
    const beforeRestore = JSON.stringify({ stories:s.stories, owner:s.owner, holder:s.holder });
    FB.save.restore(saved);
    return { linked:!!linked, date:story.declaration.firstYear, allowed:q.allowed,
      consent:consent, approval:!!rec.approvals.player, unchanged:consentUnchanged,
      planned:planned, inherited:inherited, refusedRelease:refusedRelease, executed:rec.result === 'executed',
      restored:beforeRestore === JSON.stringify({ stories:FB.state.stories,
        owner:FB.state.owner, holder:FB.state.holder }) };
  });
  expect(result).toEqual({ linked:true, date:807, allowed:true, consent:true,
    approval:true, unchanged:true, planned:true, inherited:true, refusedRelease:true, executed:true,
    restored:true });
});

test('a dead original beneficiary leaves an interrupted saved partition', async function ({ page }, info) {
  await adopted(page, info, 'beneficiary');
  const result = await page.evaluate(function () {
    const s = FB.state, rec = s.stories.divisio_800, cast = rec.cast;
    const charles = Object.values(s.realms.carolingian_800.succession.members).find(function (m) {
      return m.localId === 'charles';
    });
    FB.killChar(s, s.chars[charles.charId]);
    s.date.year = 807;
    const q = FB.stories.quote(s, 'divisio_800', 'approve');
    FB.stories.apply(s, 'divisio_800', 'approve', q);
    const chance = FB.chance;
    try { FB.chance = function () { return true; }; FB.stories.get('divisio_800').season(s, rec); }
    finally { FB.chance = chance; }
    const planned = rec.phase === 'planned';
    FB.killChar(s, s.chars[cast.pippin]);
    FB.killChar(s, s.chars[cast.charlemagne]);
    FB.stories.get('divisio_800').day(s, rec);
    const interrupted = rec.result === 'interrupted';
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return { planned:planned, interrupted:interrupted,
      restored:FB.state.stories.divisio_800.result === 'interrupted',
      noFalseRelease:FB.state.realms.italy.liege === 'player' };
  });
  expect(result).toEqual({ planned:true, interrupted:true, restored:true, noFalseRelease:true });
});
