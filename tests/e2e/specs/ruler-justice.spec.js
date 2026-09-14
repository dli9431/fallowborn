'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'js/justice.js', 'js/intrigue.js',
  'js/events.js', 'js/model.js', 'js/items.js', 'js/i18n.js', 'js/world.js', 'js/wars.js', 'js/actions.js',
  'js/travel.js', 'js/treasury.js', 'js/modifiers.js', 'js/save.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'data/intrigue.js', 'data/events_intrigue.js',
  'data/technology.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test.beforeEach(async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function (ids) {
    const s = FB.state;
    FB.endPlayerWar(s, true);
    s.eventQueue = [];
    s.countySupport = {};
    s.chars[s.player.charId].culture = 'frankish';
    s.chars[s.player.charId].religion = 'catholic';
    const target = FB.makeCharacter(s, { name:'Justice Target', sex:'m',
      culture:'frankish', religion:'catholic', born:s.date.year - 30, station:1, traitsN:0 });
    target.homeProvinceId = ids.home; target.wealth = 500; target.traits = [];
    window.justiceFixture = Object.assign(ids, { target:target.id, actor:s.player.charId });
  }, ids);
});

test('evidence of a failed assassination permits arrest, never remote execution', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    const before = FB.countySupportBase(s, f.home);
    FB.intrigueAutoSentence(s, { id:'assassination', actorId:f.target,
      context:{ characterId:f.actor } }, 'redhanded', false);
    const offense = FB.justiceOffenseFor(s, f.actor, f.target);
    const remote = FB.justiceApplyPunishment(s, f.actor, f.target, 'execution', offense.id);
    const old = FB.chance;
    let arrest;
    try { FB.chance = function () { return true; }; arrest = FB.justiceAttemptArrest(s, f.actor, f.target, offense.id); }
    finally { FB.chance = old; }
    const captured = FB.justiceCustodyOf(s, f.target);
    const execution = FB.justiceApplyPunishment(s, f.actor, f.target, 'execution', offense.id);
    const duplicate = FB.justiceApplyPunishment(s, f.actor, f.target, 'execution', offense.id);
    return { severity:offense.severity, remote:remote, arrest:arrest.captured,
      captor:captured.captorId, actor:f.actor, executed:execution.ok, duplicate:duplicate.ok,
      dead:s.chars[f.target].dead, support:FB.countySupportBase(s, f.home) - before };
  });
  expect(result).toMatchObject({ severity:3, remote:{ ok:false, blocker:'custody' },
    arrest:true, executed:true, duplicate:false, dead:true, support:0 });
  expect(result.captor).toBe(result.actor);
});

test('unjust capture and imprisonment cost twenty once, execution costs sixty more', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, old = FB.chance;
    try { FB.chance = function () { return true; }; FB.justiceAttemptArrest(s, f.actor, f.target); }
    finally { FB.chance = old; }
    const afterArrest = FB.countySupportBase(s, f.home);
    const prison = FB.justiceApplyPunishment(s, f.actor, f.target, 'imprisonment');
    const afterPrison = FB.countySupportBase(s, f.home);
    const repeat = FB.justiceApplyPunishment(s, f.actor, f.target, 'imprisonment');
    const death = FB.justiceApplyPunishment(s, f.actor, f.target, 'execution');
    return { afterArrest:afterArrest, prison:prison.ok, afterPrison:afterPrison,
      repeat:repeat.ok, death:death.ok, home:FB.countySupportBase(s, f.home),
      second:FB.countySupportBase(s, f.second), foreign:FB.countySupportBase(s, s.realms[f.enemy].capital) };
  });
  expect(result).toEqual({ afterArrest:-20, prison:true, afterPrison:-20, repeat:false,
    death:true, home:-80, second:-80, foreign:0 });
});

test('minor guilt does not justify execution and resolved guilt cannot fund a second sentence', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    const o = FB.justiceRecordOffense(s, f.actor, f.target, 'sabotage', 'material', true, f.actor);
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    const quote = FB.justicePunishmentProjection(s, f.actor, f.target, 'execution', o.id);
    const fine = FB.justiceApplyPunishment(s, f.actor, f.target, 'fine', o.id);
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    return { excessive:quote.support, justified:quote.justified, fine:fine.ok,
      consumed:!FB.justiceOffenseFor(s, f.actor, f.target),
      oldCase:FB.justiceApplyPunishment(s, f.actor, f.target, 'execution', o.id).ok };
  });
  expect(result).toEqual({ excessive:-60, justified:false, fine:true, consumed:true, oldCase:false });
});

test('baron jurisdiction covers local non-rulers but not the liege or foreign residents', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    s.player.tier = 2;
    const gentry = FB.justiceArrestProjection(s, f.actor, f.target).blocker;
    s.player.tier = 3; s.player.provs = []; s.player.liege = f.liege;
    s.holder[f.home] = f.liege; s.owner[f.home] = FB.topRealm(s, f.liege);
    FB.invalidateRealmCache();
    const local = FB.justiceArrestProjection(s, f.actor, f.target).ready;
    const lord = FB.materializeRealmRuler(s, f.liege);
    s.realms[f.liege].capital = f.home;
    const superior = FB.justiceArrestProjection(s, f.actor, lord.id).blocker;
    s.chars[f.target].homeProvinceId = s.realms[f.enemy].capital;
    return { gentry:gentry, local:local, superior:superior,
      foreign:FB.justiceArrestProjection(s, f.actor, f.target).blocker,
      counties:FB.justiceCounties(s, f.actor), home:f.home };
  });
  expect(result).toMatchObject({ gentry:'ruler', local:true, superior:'authority', foreign:'outside' });
  expect(result.counties).toEqual([result.home]);
});

test('a player baron can resist a superior but cannot be arrested by a peer baron', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    s.player.tier = 3; s.player.provs = []; s.player.liege = f.liege;
    s.holder[f.home] = f.liege; s.owner[f.home] = FB.topRealm(s, f.liege);
    FB.invalidateRealmCache();
    const lord = FB.materializeRealmRuler(s, f.liege);
    const peer = s.chars[f.target]; peer.role = 'lord'; peer.homeProvinceId = f.home;
    const superior = FB.justiceArrestProjection(s, lord.id, f.actor);
    return { ready:superior.ready, resistance:superior.resistance,
      peer:FB.justiceArrestProjection(s, peer.id, f.actor).blocker };
  });
  expect(result).toEqual({ ready:true, resistance:true, peer:'authority' });
});

test('loss of ruling authority invalidates a pending sentence', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, captor = s.chars[f.target];
    captor.role = 'lord';
    FB.captureIntrigue(s, captor.id, f.actor, 'abduction', null);
    FB.justiceApplyPunishment(s, captor.id, f.actor, 'execution');
    const ctx = { justiceId:s.justice.pending.id };
    captor.role = 'courtier';
    const valid = FB.fns.justice_response_valid(s, ctx);
    const applied = FB.fns.justice_submit(s, ctx);
    FB.justiceDay(s);
    return { valid:valid, applied:applied, pending:!!s.justice.pending, alive:!s.chars[f.actor].dead };
  });
  expect(result).toEqual({ valid:false, applied:false, pending:false, alive:true });
});

test('failed arrest charges the attempt, enforces a cooldown, and never grants custody', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, old = FB.chance;
    let failed;
    try { FB.chance = function () { return false; }; failed = FB.justiceAttemptArrest(s, f.actor, f.target); }
    finally { FB.chance = old; }
    const repeated = FB.justiceAttemptArrest(s, f.actor, f.target);
    const custody = FB.justiceCustodyOf(s, f.target);
    s.turn += 90; FB.justiceDay(s);
    return { captured:failed.captured, repeated:repeated, custody:custody,
      support:FB.countySupportBase(s, f.home), retry:FB.justiceArrestProjection(s, f.actor, f.target).ready };
  });
  expect(result).toEqual({ captured:false, repeated:{ ok:false, blocker:'cooldown' },
    custody:null, support:-10, retry:true });
});

test('failed arrest of a vassal starts an ordinary independence campaign', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    const rid = f.enemy, r = s.realms[rid];
    r.liege = 'player';
    const territory = FB.realmTerritory(s, rid).slice();
    territory.forEach(function (pid) { s.owner[pid] = 'player'; });
    FB.invalidateRealmCache();
    const target = FB.materializeRealmRuler(s, rid), old = FB.chance;
    let attempt;
    try { FB.chance = function () { return false; }; attempt = FB.justiceAttemptArrest(s, f.actor, target.id); }
    finally { FB.chance = old; }
    const war = FB.ordinaryWarBetween(s, 'player', rid);
    return { ok:attempt.ok, captured:attempt.captured, liege:r.liege, war:!!war,
      casus:war && war.casus.type, offense:FB.justiceOffenseFor(s, f.actor, target.id).kind };
  });
  expect(result).toEqual({ ok:true, captured:false, liege:null, war:true, casus:'independence', offense:'rebellion' });
});

test('regional sentencing reads the ruler and qisas requires a proven killing', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, actor = s.chars[f.actor];
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    s.chars[f.target].culture = 'greek';
    const latin = FB.justicePunishmentProjection(s, f.actor, f.target, 'blinding_deposition');
    actor.culture = 'greek'; actor.religion = 'orthodox';
    const greek = FB.justicePunishmentProjection(s, f.actor, f.target, 'blinding_deposition');
    actor.culture = 'arab'; actor.religion = 'sunni';
    const attempt = FB.justiceRecordOffense(s, f.actor, f.target, 'assassination', 'redhanded', false, f.actor, 'attempt');
    const noQisas = FB.justicePunishmentProjection(s, f.actor, f.target, 'qisas', attempt.id);
    const killing = FB.justiceRecordOffense(s, f.actor, f.target, 'assassination', 'material', true, f.actor, 'killing');
    const qisas = FB.justicePunishmentProjection(s, f.actor, f.target, 'qisas', killing.id);
    return { latin:latin.ready, greek:greek.ready, noQisas:noQisas.ready, qisas:qisas.ready, lawful:qisas.justified };
  });
  expect(result).toEqual({ latin:false, greek:true, noQisas:false, qisas:true, lawful:true });
});

test('judicial save repair preserves sentences and multiple prisoners, then expires custody once', async function ({ page }) {
  const result = await page.evaluate(function () {
    let s = FB.state;
    const f = window.justiceFixture, old = FB.chance;
    const second = FB.makeCharacter(s, { name:'Second Prisoner', sex:'m', culture:'frankish',
      religion:'catholic', born:s.date.year - 30, station:1, traitsN:0 });
    second.homeProvinceId = f.home;
    try {
      FB.chance = function () { return true; };
      FB.justiceAttemptArrest(s, f.actor, f.target);
      FB.justiceAttemptArrest(s, f.actor, second.id);
    } finally { FB.chance = old; }
    FB.justiceApplyPunishment(s, f.actor, f.target, 'imprisonment');
    const due = FB.justiceCustodyOf(s, f.target).endTurn;
    const payload = FB.save.parseExport(FB.save.exportState());
    FB.save.restore(payload); s = FB.state;
    const count = s.intrigue.captives.filter(function (r) { return r.source === 'judicial'; }).length;
    const restored = FB.justiceCustodyOf(s, f.target);
    s.turn = due; FB.justiceDay(s); FB.justiceDay(s);
    return { count:count, end:restored.endTurn, due:due, version:payload.v,
      gone:!FB.justiceCustodyOf(s, f.target), support:FB.countySupportBase(s, f.home) };
  });
  expect(result).toMatchObject({ count:2, version:3, gone:true, support:-40 });
  expect(result.end).toBe(result.due);
});

test('judicial custody follows realm succession while private abduction ends', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, rid = f.enemy;
    const captor = FB.materializeRealmRuler(s, rid);
    const second = FB.makeCharacter(s, { name:'Private Captive', sex:'m', culture:'frankish',
      religion:'catholic', born:s.date.year - 30, station:1, traitsN:0 });
    const row = FB.captureIntrigue(s, captor.id, f.target, 'judicial', rid);
    row.authority = rid; row.endTurn = s.turn + 360;
    FB.captureIntrigue(s, captor.id, second.id, 'abduction', rid);
    FB.advanceRealmSuccession(s, rid);
    const next = FB.realmRulerCharacterSnapshot(s, rid);
    const custody = FB.justiceCustodyOf(s, f.target);
    return { changed:next.id !== captor.id, inherited:custody && custody.captorId === next.id,
      privateReleased:!FB.justiceCustodyOf(s, second.id) };
  });
  expect(result).toEqual({ changed:true, inherited:true, privateReleased:true });
});

test('another captor, release, and consumed cases invalidate confirmation', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    const captor = FB.materializeRealmRuler(s, f.enemy);
    FB.captureIntrigue(s, captor.id, f.target, 'abduction', f.enemy);
    const foreign = FB.justiceApplyPunishment(s, f.actor, f.target, 'execution');
    FB.justiceReleaseCustody(s, FB.justiceCustodyOf(s, f.target));
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    const quote = FB.justicePunishmentProjection(s, f.actor, f.target, 'execution');
    FB.justiceApplyPunishment(s, f.actor, f.target, 'release');
    return { foreign:foreign.ok, quoted:quote.ready,
      stale:FB.justiceApplyPunishment(s, f.actor, f.target, 'execution').ok, alive:!s.chars[f.target].dead };
  });
  expect(result).toEqual({ foreign:false, quoted:true, stale:false, alive:true });
});

test('AI sentencing against the player pauses, survives reload, and does not accept old ransom offers', async function ({ page }) {
  const result = await page.evaluate(function () {
    let s = FB.state;
    const f = window.justiceFixture, captor = FB.materializeRealmRuler(s, f.enemy);
    const offense = FB.justiceRecordOffense(s, captor.id, f.actor, 'assassination', 'material', false, captor.id);
    const row = FB.captureIntrigue(s, captor.id, f.actor, 'judicial', f.enemy);
    row.authority = f.enemy; row.endTurn = s.turn + 90;
    const attempted = FB.justiceApplyPunishment(s, captor.id, f.actor, 'execution', offense.id);
    const pending = s.justice.pending.id, alive = !s.chars[f.actor].dead;
    const ransom = FB.payIntrigueRansom(s);
    const payload = FB.save.parseExport(FB.save.exportState()); FB.save.restore(payload); s = FB.state;
    const ctx = { justiceId:pending }, old = FB.chance;
    let pardoned;
    try { FB.chance = function () { return true; }; pardoned = FB.fns.justice_plead(s, ctx); }
    finally { FB.chance = old; }
    return { pending:attempted.pending, alive:alive, ransom:ransom, pardoned:pardoned,
      freed:!FB.justiceCustodyOf(s, f.actor), duplicate:FB.fns.justice_submit(s, ctx) };
  });
  expect(result).toEqual({ pending:true, alive:true, ransom:false, pardoned:true, freed:true, duplicate:false });
});

test('war peace releases its captive but cannot release a judicial prisoner', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    const captor = FB.materializeRealmRuler(s, f.enemy);
    const w = FB.registerOrdinaryWar(s, 'player', { enemy:f.enemy, defending:true, casus:{ type:'border' } });
    s.player.flags.in_prison = 1; s.player.captiveWarId = w.id;
    const warCustody = FB.justiceCustodyOf(s, f.actor);
    FB.justiceReleaseCustody(s, warCustody);
    const row = FB.captureIntrigue(s, captor.id, f.actor, 'judicial', f.enemy);
    row.authority = f.enemy; row.endTurn = s.turn + 360;
    FB.endPlayerWar(s, true, w.id);
    return { identified:warCustody.captorId === captor.id,
      imprisoned:!!s.player.flags.in_prison, retained:!!FB.justiceCustodyOf(s, f.actor),
      oldRansom:FB.fns.prison_still(s, {}) };
  });
  expect(result).toEqual({ identified:true, imprisoned:true, retained:true, oldRansom:false });
});

test('justice previews are read-only and every new capability declares no technology gate', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    delete s.justice;
    const before = JSON.stringify(s);
    FB.justiceArrestProjection(s, f.actor, f.target);
    FB.justiceSentenceOptions(s, f.actor, f.target);
    const names = ['ruler_arrest','judicial_custody','judicial_release','judicial_fines',
      'judicial_penance','judicial_imprisonment','judicial_exile','judicial_forfeiture',
      'judicial_monastic_exile','judicial_blinding','judicial_execution'];
    return { unchanged:JSON.stringify(s) === before,
      modes:names.map(function (name) { return FBDATA.techImpactReviews.features[name].mode; }) };
  });
  expect(result.unchanged).toBe(true);
  expect(result.modes).toEqual(Array(11).fill('none'));
});

test('exile moves the prisoner out of the realm and blocks voluntary return', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    const p = FB.justicePunishmentProjection(s, f.actor, f.target, 'exile');
    const outcome = FB.justiceApplyPunishment(s, f.actor, f.target, 'exile');
    const where = FB.characterResidence(s, s.chars[f.target]);
    const blocked = FB.justiceExileBlocks(s, f.target, f.home);
    s.turn += 1800; FB.justiceDay(s);
    return { ok:outcome.ok, destination:p.destination, where:where, blocked:blocked,
      freed:!FB.justiceCustodyOf(s, f.target), expired:!FB.justiceExileBlocks(s, f.target, f.home) };
  });
  expect(result).toMatchObject({ ok:true, blocked:true, freed:true, expired:true });
  expect(result.where).toBe(result.destination);
});

test('justice navigation preserves search and keyboard return without applying a cancelled arrest', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showJustice(); });
  await page.locator('#justice-search').fill('Justice Target');
  await page.locator('[data-justice-character]:visible').click();
  await page.locator('#justice-arrest').click();
  await expect(page.locator('#justice-confirm')).toBeEnabled();
  await page.locator('#justice-cancel').click();
  await expect(page.locator('#justice-arrest')).toBeFocused();
  await page.locator('#justice-character-back').click();
  await expect(page.locator('#justice-search')).toHaveValue('Justice Target');
  await expect(page.locator('[data-justice-character]:visible')).toBeFocused();
  expect(await page.evaluate(function () {
    return FB.justiceCustodyOf(FB.state, window.justiceFixture.target);
  })).toBeNull();
});

test('fines transfer only available wealth and release the prisoner', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    s.chars[f.target].wealth = 3;
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    const before = s.player.gold;
    const quote = FB.justicePunishmentProjection(s, f.actor, f.target, 'fine');
    const outcome = FB.justiceApplyPunishment(s, f.actor, f.target, 'fine');
    return { amount:quote.amount, ok:outcome.ok, gain:s.player.gold - before,
      remaining:s.chars[f.target].wealth, captive:!!FB.justiceCustodyOf(s, f.target) };
  });
  expect(result).toEqual({ amount:3, ok:true, gain:3, remaining:0, captive:false });
});

test('forfeiture escheats local holdings without changing sovereign ownership', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, rid = f.enemy;
    const r = s.realms[rid], territory = FB.realmTerritory(s, rid).slice();
    const held = FB.realmHeldCounties(s, rid).slice();
    r.liege = 'player';
    territory.forEach(function (pid) { s.owner[pid] = 'player'; });
    FB.invalidateRealmCache();
    const target = FB.materializeRealmRuler(s, rid);
    const offense = FB.justiceRecordOffense(s, f.actor, target.id, 'rebellion', 'redhanded', true, f.actor);
    FB.captureIntrigue(s, f.actor, target.id, 'abduction', 'player');
    const outcome = FB.justiceApplyPunishment(s, f.actor, target.id, 'forfeiture', offense.id);
    return { ok:outcome.ok, alive:!target.dead, realmEnded:!r.alive, heldCount:held.length,
      transferred:held.every(function (pid) { return s.holder[pid] === 'player' && s.owner[pid] === 'player' &&
        s.player.provs.indexOf(pid) >= 0; }), captive:!!FB.justiceCustodyOf(s, target.id) };
  });
  expect(result).toMatchObject({ ok:true, alive:true, realmEnded:true, transferred:true, captive:false });
  expect(result.heldCount).toBeGreaterThan(0);
});

test('AI justice resolves at most two new actions and does not repeat within a season', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, actor = FB.materializeRealmRuler(s, f.enemy);
    actor.traits = [];
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const target = FB.makeCharacter(s, { name:'AI Prisoner ' + i, sex:'m', culture:'frankish',
        religion:'catholic', born:s.date.year - 30, station:1, traitsN:0 });
      target.wealth = 100; ids.push(target.id);
      FB.justiceRecordOffense(s, actor.id, target.id, 'blackmail', 'material', true, actor.id, 'bounded-' + i);
      const row = FB.captureIntrigue(s, actor.id, target.id, 'judicial', f.enemy);
      row.authority = f.enemy; row.endTurn = s.turn + 90;
    }
    FB.justiceSeason(s);
    const remaining = ids.filter(function (id) { return FB.justiceCustodyOf(s, id); }).length;
    const after = JSON.stringify(s.justice);
    FB.justiceSeason(s);
    return { remaining:remaining, unchanged:JSON.stringify(s.justice) === after,
      closed:s.justice.offenses.filter(function (o) { return o.closed; }).length };
  });
  expect(result).toEqual({ remaining:1, unchanged:true, closed:2 });
});

test('the player heir inherits judicial prisoners and the old court cases', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, oldChance = FB.chance;
    FB.justiceRecordOffense(s, f.actor, f.target, 'abduction', 'material', true, f.actor);
    try { FB.chance = function () { return true; }; FB.justiceAttemptArrest(s, f.actor, f.target); }
    finally { FB.chance = oldChance; }
    const heir = FB.makeCharacter(s, { name:'Judicial Successor', sex:'f', culture:'frankish',
      religion:'catholic', born:s.date.year - 25, station:4, traitsN:0 });
    FB.intrigueCharacterDied(s, s.chars[f.actor]);
    s.chars[f.actor].dead = true; s.player.dead = true;
    FB.ensureIntrigue(s);
    const preserved = s.intrigue.captives.some(function (r) { return r.captiveId === f.target; });
    s.player.charId = heir.id; s.player.dead = false; s.generation++;
    FB.intriguePlayerSuccession(s, f.actor, heir.id);
    return { preserved:preserved, captor:FB.justiceCustodyOf(s, f.target).captorId,
      heir:heir.id, inheritedCase:!!FB.justiceOffenseFor(s, heir.id, f.target) };
  });
  expect(result.preserved).toBe(true);
  expect(result.captor).toBe(result.heir);
  expect(result.inheritedCase).toBe(true);
});

test('judicial escape invalidates a pending sentence and ambiguous prison flags grant no captor', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, a = FB.materializeRealmRuler(s, f.enemy);
    s.player.flags.in_prison = 1;
    const ambiguous = FB.justiceCustodyOf(s, f.actor);
    delete s.player.flags.in_prison;
    const row = FB.captureIntrigue(s, a.id, f.actor, 'judicial', f.enemy);
    row.authority = f.enemy; row.endTurn = s.turn + 360;
    FB.justiceApplyPunishment(s, a.id, f.actor, 'execution');
    const ctx = { justiceId:s.justice.pending.id }, old = FB.chance;
    try { FB.chance = function () { return true; }; FB.intrigueSeason(s); }
    finally { FB.chance = old; }
    return { ambiguous:ambiguous, escaped:!FB.justiceCustodyOf(s, f.actor),
      valid:FB.fns.justice_response_valid(s, ctx), alive:!s.chars[f.actor].dead };
  });
  expect(result).toEqual({ ambiguous:null, escaped:true, valid:false, alive:true });
});
