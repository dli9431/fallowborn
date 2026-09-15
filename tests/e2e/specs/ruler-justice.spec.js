'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'js/justice.js', 'js/intrigue.js',
  'js/events.js', 'js/model.js', 'js/items.js', 'js/i18n.js', 'js/world.js', 'js/wars.js', 'js/actions.js',
  'js/travel.js', 'js/treasury.js', 'js/modifiers.js', 'js/save.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/keys.js', 'js/portrait.js', 'data/intrigue.js', 'data/events_intrigue.js',
  'data/technology.js', 'js/agency.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function finishJusticeSentence(page) {
  await expect(page.locator('#gm-title')).toHaveText('Review judgment');
  await page.waitForFunction(function () { return !FB.ui.eventInputGuarded(); });
  await page.locator('#justice-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Sentence carried out');
  await expect(page.locator('[data-guarded-outcome]')).toContainText('sentence has been carried out');
  await page.waitForFunction(function () { return !FB.ui.eventInputGuarded(); });
  await page.locator('#justice-continue').click();
  await expect(page.locator('#justice-search')).toBeVisible();
  await expect(page.locator('.justice-roster-receipt, [data-guarded-outcome]')).toHaveCount(0);
}

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

test('judgment review is separate from execution and Back does not sentence', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    FB.ui.showJusticeCharacter(f.target);
  });
  await page.locator('[data-justice-sentence="execution"]').click();
  await expect(page.locator('#gm-title')).toHaveText('Review judgment');
  expect(await page.evaluate(function () { return !!FB.state.chars[window.justiceFixture.target].dead; })).toBe(false);
  await page.locator('#justice-cancel').click();
  await expect(page.locator('[data-justice-sentence="execution"]')).toBeFocused();
  expect(await page.evaluate(function () { return !!FB.state.chars[window.justiceFixture.target].dead; })).toBe(false);
  await page.locator('[data-justice-sentence="execution"]').click();
  await finishJusticeSentence(page);
  expect(await page.evaluate(function () { return !!FB.state.chars[window.justiceFixture.target].dead; })).toBe(true);
});

test('governance justice entry shares political action typography', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showGovernance('actions'); });
  const entry = page.locator('#governance-justice');
  await expect(entry).toBeVisible();
  await expect(entry).toContainText('⚖️ Justice and prisoners');
  await expect(entry.locator('b, strong')).toHaveCount(0);
  const styles = await page.evaluate(function () {
    const justice = document.getElementById('governance-justice');
    const peer = document.querySelector('#governance-actions [data-governance-action]');
    function typography(node) {
      const style = getComputedStyle(node);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.color, style.lineHeight];
    }
    return {
      label:typography(justice), peerLabel:typography(peer),
      description:typography(justice.querySelector('.adesc')),
      peerDescription:typography(peer.querySelector('.adesc'))
    };
  });
  expect(styles.label).toEqual(styles.peerLabel);
  expect(styles.description).toEqual(styles.peerDescription);
  await entry.click();
  await expect(page.locator('#justice-search')).toBeVisible();
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

test('justice card grid sorts current titles and names while retaining filtered rows', async function ({ page }) {
  const ids = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    const low = s.chars[f.target];
    low.name = 'Roster Alpha'; low.dyn = null; low.station = 1;
    const high = FB.materializeRealmRuler(s, f.enemy);
    high.name = 'Roster Bravo'; high.dyn = null; high.station = 1;
    s.realms[f.enemy].rank = 3;
    FB.captureIntrigue(s, f.actor, high.id, 'judicial', 'player');
    const mid = FB.makeCharacter(s, { name:'Roster Zulu', sex:'m',
      culture:'frankish', religion:'catholic', born:s.date.year - 30, station:3, traitsN:0 });
    mid.dyn = null; mid.homeProvinceId = f.home;
    FB.ui.showJustice();
    return { low:low.id, mid:mid.id, high:high.id,
      title:FB.renderTitleSnapshot(FB.realmRulerTitleSnapshot(s, s.realms[f.enemy], high)) };
  });
  await expect(page.locator('#justice-sort')).toHaveValue('highest');
  await page.locator('#justice-search').fill('Roster ');
  const rows = page.locator('#justice-list [data-justice-row]:visible');
  async function order() {
    return rows.evaluateAll(function (nodes) { return nodes.map(function (n) { return n.dataset.justiceRow; }); });
  }
  expect(await order()).toEqual([ids.high, ids.mid, ids.low]);
  await expect(rows.locator('.justice-person canvas.pface')).toHaveCount(3);
  await expect(page.locator('[data-justice-row="' + ids.high + '"] .justice-person-title')).toHaveText(ids.title);
  await page.locator('#justice-sort').selectOption('lowest');
  expect(await order()).toEqual([ids.high, ids.low, ids.mid]);
  await page.locator('#justice-sort').selectOption('name');
  expect(await order()).toEqual([ids.high, ids.mid, ids.low]);
  await expect(page.locator('#justice-search')).toHaveValue('Roster ');
  await page.locator('#justice-search').fill('No matching roster name');
  await expect(rows).toHaveCount(0);
  await expect(page.locator('#justice-empty')).toBeVisible();
});

test('justice navigation preserves search and keyboard return without applying a cancelled arrest', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showJustice(); });
  await page.locator('#justice-search').fill('Justice Target');
  await page.locator('#justice-sort').selectOption('lowest');
  await page.locator('[data-justice-character]:visible').click();
  await expect(page.locator('#justice-arrest')).toBeEnabled();
  await page.locator('#justice-character-back').click();
  await expect(page.locator('#justice-search')).toHaveValue('Justice Target');
  await expect(page.locator('#justice-sort')).toHaveValue('lowest');
  await expect(page.locator('[data-justice-character]:visible')).toBeFocused();
  expect(await page.evaluate(function () {
    return FB.justiceCustodyOf(FB.state, window.justiceFixture.target);
  })).toBeNull();
});

test('justice roster has no positional shortcuts and remains keyboard accessible', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showJustice(); });
  await page.locator('#justice-search').fill('Justice Target');
  await expect(page.locator('#genmodal .keyhint')).toHaveCount(0);
  const person = page.locator('[data-justice-character]:visible');
  await person.focus();
  for (const key of ['1', 'Shift+1', 'q', 'Shift+q', 'c', 'Shift+c']) {
    await page.keyboard.press(key);
    await expect(page.locator('#justice-search')).toBeVisible();
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('#justice-arrest')).toBeVisible();
});

test('compact justice Details controls fit inside cards beside the text', async function ({ page }) {
  for (const width of [390, 1000]) {
    await page.setViewportSize({ width:width, height:844 });
    await page.evaluate(function () { FB.ui.showJustice(); });
    const row = page.locator('[data-justice-row]').first();
    const details = row.locator(':scope > .settcard-actions .settcard-info');
    await expect(details).toBeVisible();
    const bounds = await row.evaluate(function (node) {
      const card = node.querySelector('.justice-person').getBoundingClientRect();
      const text = node.querySelector('.justice-person-text').getBoundingClientRect();
      const button = node.querySelector('.settcard-info').getBoundingClientRect();
      return { beside:button.left >= text.right, aligned:Math.abs(button.top - text.top) <= 1,
        inside:button.left >= card.left && button.right <= card.right && button.bottom <= card.bottom,
        touch:button.width >= 44 && button.height >= 44 };
    });
    expect(bounds).toEqual({ beside:true, aligned:true, inside:true, touch:true });
    await details.click();
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#justice-search')).toBeVisible();
    await expect(row.locator(':scope > .settcard-details')).toBeVisible();
  }
});

test('failed arrest shows a roster notice and toast without losing search or sort', async function ({ page }) {
  await page.evaluate(function () {
    window.failedArrestChance = FB.chance;
    window.failedArrestToast = FB.ui.toast;
    window.failedArrestMessages = [];
    FB.chance = function () { return false; };
    FB.ui.toast = function (message) {
      window.failedArrestMessages.push(message);
      return window.failedArrestToast.apply(this, arguments);
    };
    FB.ui.showJustice();
  });
  try {
    await page.locator('#justice-search').fill('Justice Target');
    await page.locator('#justice-sort').selectOption('lowest');
    await page.locator('[data-justice-character]:visible').click();
    await page.locator('#justice-arrest').click();
    const notice = page.locator('.justice-arrest-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Justice Target');
    await expect(notice).toContainText('remains free');
    await expect(notice).toContainText('You can attempt another arrest on');
    await expect(notice.locator('canvas.pface')).toBeVisible();
    await expect(page.locator('#justice-search')).toHaveValue('Justice Target');
    await expect(page.locator('#justice-sort')).toHaveValue('lowest');
    expect(await page.evaluate(function () { return window.failedArrestMessages; }))
      .toContain('The arrest failed. The character remains free.');
    await page.locator('#justice-sort').selectOption('name');
    await page.locator('#justice-search').fill('');
    await expect(notice).toBeVisible();
    await page.evaluate(function () { FB.ui.showJustice(); });
    await expect(notice).toHaveCount(0);
  } finally {
    await page.evaluate(function () {
      FB.chance = window.failedArrestChance;
      FB.ui.toast = window.failedArrestToast;
    });
  }
});

test('arrest opens sentencing directly and imprisoned cards return to sentencing', async function ({ page }) {
  const id = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.justiceRecordOffense(s, f.actor, f.target, 'sabotage', 'material', true, f.actor);
    window.justiceFlowChance = FB.chance;
    FB.chance = function () { return true; };
    FB.ui.showJustice();
    return f.target;
  });
  try {
    await page.locator('#justice-search').fill('Justice Target');
    await page.locator('[data-justice-character="' + id + '"]').click();
    await expect(page.locator('#justice-arrest')).toHaveText('Attempt arrest');
    await page.locator('#justice-arrest').click();
    await expect(page.locator('.justice-custody-card')).toBeVisible();
    await expect(page.locator('#justice-confirm, #justice-continue')).toHaveCount(0);
    await page.waitForFunction(function () { return !FB.ui.eventInputGuarded(); });
    await page.locator('[data-justice-sentence="imprisonment"]').click();
    await finishJusticeSentence(page);
    await expect(page.locator('#justice-search')).toHaveValue('Justice Target');
    const imprisoned = page.locator('[data-justice-tier="9"]');
    await expect(imprisoned.locator('h4')).toHaveText('Imprisoned');
    await expect(imprisoned.locator('.justice-person-crime')).toContainText('Sabotage');
    await expect(imprisoned.locator('.justice-person-release')).toContainText('Release due:');
    await page.locator('#justice-sort').selectOption('lowest');
    await expect(page.locator('.justice-roster-group:visible').first()).toHaveAttribute('data-justice-tier', '9');
    await imprisoned.locator('[data-justice-character]').click();
    await expect(page.locator('.justice-custody-card')).toBeVisible();
    await expect(page.locator('#justice-arrest')).toHaveCount(0);
    await page.waitForFunction(function () { return !FB.ui.eventInputGuarded(); });
    await page.locator('[data-justice-sentence="release"]').click();
    await finishJusticeSentence(page);
    await expect(page.locator('#justice-search')).toBeVisible();
    await expect(page.locator('[data-justice-tier="9"]')).toHaveCount(0);
  } finally {
    await page.evaluate(function () { FB.chance = window.justiceFlowChance; });
  }
});

test('justified sentence previews and outcomes explain no support loss without an affected county ledger', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.justiceRecordOffense(s, f.actor, f.target, 'assassination', 'material', false, f.actor);
    FB.captureIntrigue(s, f.actor, f.target, 'judicial', 'player');
    FB.ui.showJusticeCharacter(f.target);
  });
  const choice = page.locator('.justice-sentence-choice').filter({ has:page.locator('[data-justice-sentence="execution"]') });
  await expect(choice.locator('.settcard-details')).toContainText('No loss — justified action');
  await choice.locator('[data-justice-sentence]').click();
  await expect(page.locator('.justice-card-facts')).toContainText('No loss');
  await finishJusticeSentence(page);
  await expect(page.locator('#justice-search')).toBeVisible();
  await expect(page.locator('#justice-confirm, #justice-continue')).toHaveCount(0);
});

test('custody groups sentence actions and distinguishes provisional detention from a sentence', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.justiceRecordOffense(s, f.actor, f.target, 'assassination', 'material', false, f.actor);
    const row = FB.captureIntrigue(s, f.actor, f.target, 'judicial', 'player');
    row.endTurn = s.turn + 90; row.sentenced = false;
    FB.ui.showJusticeCharacter(f.target);
  });
  const custody = page.locator('.justice-custody-card');
  await expect(custody).toContainText('Held by');
  await expect(custody).toContainText('Provisional custody ends');
  await expect(custody).toContainText('released when it ends unless sentenced');
  await expect(custody).toContainText('Material proof');
  await expect(custody.locator('[data-justice-sentence="release"]')).toHaveText('Release');
  await expect(custody.getByRole('button', { name:'Review', exact:true })).toHaveCount(0);
  await custody.locator('[data-justice-sentence="imprisonment"]').click();
  await finishJusticeSentence(page);
  await expect(page.locator('#justice-search')).toBeVisible();
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.ui.showJusticeCharacter(f.target);
  });
  await expect(custody).toContainText('Sentence ends');
  await expect(custody).not.toContainText('No sentence has been imposed');
});

for (const justified of [true, false]) {
  test('arrest card contains evidence and explains support ' + (justified ? 'exemption' : 'penalties'), async function ({ page }) {
    await page.evaluate(function (justified) {
      const s = FB.state, f = window.justiceFixture;
      if (justified) FB.justiceRecordOffense(s, f.actor, f.target, 'sabotage', 'material', true, f.actor);
      FB.ui.showJusticeCharacter(f.target);
    }, justified);
    const card = page.locator('.justice-card').filter({ has:page.locator('#justice-arrest') });
    await expect(card.locator('.justice-card-facts')).toContainText(justified ? 'Material proof' : 'No proven offense');
    await expect(page.locator('#gm-body > .justice-evidence')).toHaveCount(0);
    if (justified) {
      await expect(card).toContainText('No loss — justified arrest');
      await expect(card).not.toContainText('0 per county');
    } else {
      await expect(card).toContainText('Popular support loss if caught');
      await expect(card).toContainText('20 per directly governed county');
      await expect(card).toContainText('Popular support loss if arrest fails');
      await expect(card).toContainText('10 per directly governed county');
    }
    await expect(page.locator('#gm-body')).toContainText(justified ? 'No loss — justified arrest' : '20 per directly governed county');
  });
}

test('justice groups noble house members by recorded realm rank without granting ruler titles', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    s.realms[f.enemy].rank = 2;
    s.realms[f.liege].rank = 1;
    const members = [];
    [f.enemy, f.liege, null].forEach(function (rid, index) {
      const c = FB.makeCharacter(s, { name:'House member ' + index, sex:'f',
        born:s.date.year - 25, station:3, culture:'frankish', religion:'catholic', traitsN:0 });
      c.homeProvinceId = f.home;
      // A misleading display name must never grant rank to an unaffiliated noble.
      c.dyn = 'of Duchy of Example';
      if (rid) c.royalLine = { realmId:rid, memberId:'justice-house-' + index };
      members.push(c.id);
    });
    FB.ui.showJustice();
    return { ids:members, duchy:s.realms[f.enemy].name, county:s.realms[f.liege].name };
  });
  for (let i = 0; i < result.ids.length; i++) {
    const card = page.locator('[data-justice-row="' + result.ids[i] + '"]');
    expect(await card.evaluate(function (node) { return node.closest('[data-justice-tier]').dataset.justiceTier; }))
      .toBe(['5', '4', '3'][i]);
    await expect(card.locator('.justice-person-title')).toHaveText(
      i === 0 ? 'House of ' + result.duchy : i === 1 ? 'House of ' + result.county : 'Noble');
  }
});

test('justice tiers occupy separate rows and justified arrest excludes blocked or innocent targets', async function ({ page }) {
  await page.setViewportSize({ width:1280, height:900 });
  const ids = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    const result = {};
    ['justified', 'innocent', 'held', 'cooldown', 'outside'].forEach(function (kind, index) {
      const c = FB.makeCharacter(s, { name:'Filter ' + kind, sex:'m', culture:'frankish',
        religion:'catholic', born:s.date.year - 30, station:index === 1 ? 3 : 1, traitsN:0 });
      c.homeProvinceId = kind === 'outside' ? s.realms[f.enemy].capital : f.home;
      result[kind] = c.id;
      if (kind !== 'innocent') FB.justiceRecordOffense(s, f.actor, c.id, 'sabotage', 'material', true, f.actor);
      if (kind === 'held') FB.captureIntrigue(s, f.actor, c.id, 'judicial', 'player');
      if (kind === 'cooldown') s.justice.cooldowns[f.actor + ':' + c.id] = s.turn + 90;
    });
    FB.ui.showJustice();
    return result;
  });
  await page.locator('#justice-search').fill('Filter ');
  const groups = page.locator('.justice-roster-group:visible');
  expect(await groups.locator('h4').allTextContents()).toEqual(['Imprisoned', 'Barons and other nobles', 'Freeholders']);
  const separate = await groups.evaluateAll(function (nodes) {
    return nodes[1].getBoundingClientRect().top >= nodes[0].getBoundingClientRect().bottom;
  });
  expect(separate).toBe(true);
  const card = page.locator('[data-justice-character="' + ids.justified + '"]');
  await card.hover();
  await expect(page.locator('#tooltip')).toContainText('Filter justified');
  await expect(page.locator('#tooltip')).toContainText('Material proof');
  expect(await page.locator('#tooltip .charcard').evaluate(function (card) {
    return card.previousElementSibling.textContent.indexOf('Material proof') >= 0;
  })).toBe(true);
  await page.locator('#justice-sort').selectOption('justified');
  await expect(page.locator('[data-justice-row]:visible')).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(groups.locator('h4')).toHaveText('Freeholders');
  await page.setViewportSize({ width:390, height:844 });
  const details = page.locator('[data-justice-row="' + ids.justified + '"] > .settcard-actions .settcard-info');
  await details.click();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await card.click();
  await page.locator('#justice-character-back').click();
  await expect(page.locator('#justice-sort')).toHaveValue('justified');
  await expect(page.locator('#justice-search')).toHaveValue('Filter ');
  await expect(details).toHaveAttribute('aria-expanded', 'true');
});

test('justice roster uses compact portrait cards with standing and family relationship', async function ({ page }) {
  await page.setViewportSize({ width:1280, height:900 });
  const target = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, me = s.chars[f.actor];
    const child = s.chars[f.target];
    child.fatherId = me.id;
    me.childrenIds = (me.childrenIds || []).concat(child.id);
    FB.touchFamily();
    FB.ui.showJustice();
    return child.id;
  });
  const card = page.locator('[data-justice-character="' + target + '"]');
  await expect(card.locator('canvas.pface')).toBeVisible();
  await expect(card.locator('.justice-person-title')).toBeVisible();
  await expect(card.locator('.justice-person-name')).toHaveText(/Justice Target/);
  await expect(card.locator('.justice-person-standing')).toContainText('Standing:');
  await expect(card.locator('.justice-person-relation')).toHaveText('Your child');
  await expect(card.locator('.justice-person-custody')).toHaveCount(0);
  await expect(page.locator('#justice-list table, #justice-list .keyhint')).toHaveCount(0);
  for (const layout of [{ width:1280, columns:4 }, { width:700, columns:2 }, { width:390, columns:1 }]) {
    await page.setViewportSize({ width:layout.width, height:900 });
    const geometry = await page.locator('.justice-roster-grid').first().evaluate(function (grid) {
      return { columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        overflow:grid.scrollWidth > grid.clientWidth + 1 };
    });
    expect(geometry).toEqual({ columns:layout.columns, overflow:false });
  }
  await card.click();
  await expect(page.locator('#justice-arrest')).toBeVisible();
});

test('modal section and action shortcuts exclude unbounded list entries', async function ({ page }) {
  await page.evaluate(function () {
    window.shortcutClicks = [];
    let html = '<button data-ui-section-hotkey id="shortcut-section">Section</button>' +
      '<input id="shortcut-search" type="search"><select id="shortcut-sort"><option>Alpha</option><option>Zulu</option></select>';
    for (let i = 0; i < 25; i++) html += '<button class="actionbtn" data-person="' + i + '">Person ' + i + '</button>';
    for (let i = 0; i < 18; i++) html += '<button class="actionbtn" data-ui-action-hotkey data-command="' + i + '"' +
      (i === 1 ? ' disabled' : '') + '>Action</button>';
    html += '<div hidden><button data-ui-action-hotkey data-command="hidden">Hidden</button></div>';
    FB.ui.openModal('Shortcut contract', html);
    // A displayed action wins when the same letter opened the modal.
    FB.ui._gmModalKey = 'q';
    document.getElementById('gm-body').addEventListener('click', function (event) {
      const button = event.target.closest('button');
      if (button) window.shortcutClicks.push(button.id || button.dataset.command || 'person');
    });
  });
  await expect(page.locator('[data-person] .keyhint')).toHaveCount(0);
  await expect(page.locator('#shortcut-section .keyhint')).toHaveText('1');
  await expect(page.locator('[data-command="0"] .keyhint')).toHaveText('Q');
  await expect(page.locator('[data-command="9"] .keyhint')).toHaveText('⇧Q');
  await expect(page.locator('[data-command="hidden"] .keyhint')).toHaveCount(0);
  for (const key of ['1', 'Shift+1', 'q', 'w', 'Shift+q', 'Shift+c']) await page.keyboard.press(key);
  expect(await page.evaluate(function () { return window.shortcutClicks; }))
    .toEqual(['shortcut-section', '0', '9', '17']);
  await page.locator('#shortcut-search').fill('qwe123');
  await page.locator('#shortcut-sort').focus();
  await page.keyboard.press('q');
  await page.keyboard.press('1');
  expect(await page.evaluate(function () { return window.shortcutClicks.length; })).toBe(4);
  await page.locator('[data-person="24"]').focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(function () { return window.shortcutClicks.slice(-1); })).toEqual(['person']);
  await page.evaluate(function () {
    FB.ui.openModal('No shortcuts', '<button data-ui-section-hotkey>Section</button>' +
      '<button data-ui-action-hotkey>Action</button>', { noHotkeys:true });
    window.disabledShortcutClicks = 0;
    document.getElementById('gm-body').querySelectorAll('button').forEach(function (button) {
      button.onclick = function () { window.disabledShortcutClicks++; };
    });
  });
  await expect(page.locator('#genmodal .keyhint')).toHaveCount(0);
  await page.keyboard.press('1');
  await page.keyboard.press('q');
  expect(await page.evaluate(function () { return window.disabledShortcutClicks; })).toBe(0);
});

test('justice sentence choices condense terms into disclosures and show them before confirmation', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    FB.ui.showJusticeCharacter(f.target);
  });
  const sentence = page.locator('.justice-card').filter({ has:page.locator('[data-justice-sentence="execution"]') });
  const details = sentence.locator('.settcard-details');
  await expect(details).toBeHidden();
  await expect(sentence.locator('.justice-card-facts')).toBeEmpty();
  await expect(sentence.locator('.kv').filter({ hasText:'Consequence' })).toContainText('Death');
  await expect(sentence.locator('.kv').filter({ hasText:'Popular support loss' })).toContainText('60 per directly governed county');
  await sentence.locator('.settcard-info').click();
  await expect(details).toBeVisible();
  await sentence.locator('[data-justice-sentence]').click();
  await finishJusticeSentence(page);
  await expect(page.locator('#justice-search')).toBeVisible();
});

for (const width of [390, 1280]) {
  test('justice arrest cards align facts and separate actions at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:900 });
    await page.evaluate(function () { FB.ui.showJusticeCharacter(window.justiceFixture.target); });
    const card = page.locator('.justice-card').filter({ has:page.locator('#justice-arrest') });
    const layout = await card.evaluate(function (node) {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      const facts = node.querySelector('.justice-card-facts').getBoundingClientRect();
      const actions = node.querySelector('.justice-card-actions').getBoundingClientRect();
      const button = node.querySelector('#justice-arrest').getBoundingClientRect();
      const row = node.querySelector('.kv'), label = row.firstElementChild.getBoundingClientRect();
      const value = row.lastElementChild.getBoundingClientRect();
      return { border:parseFloat(style.borderTopWidth), padding:parseFloat(style.paddingLeft),
        actionGap:actions.top - facts.bottom, height:button.height,
        inside:button.left >= box.left && button.right <= box.right,
        stacked:value.top >= label.bottom, aligned:Math.abs(value.left - label.left) < 1,
        sameRow:Math.abs(value.top - label.top) < 1,
        fullWidth:Math.abs(button.width - actions.width) < 1 };
    });
    expect(layout.border).toBe(1);
    expect(layout.padding).toBe(12);
    expect(layout.actionGap).toBeGreaterThanOrEqual(12);
    expect(layout.height).toBeGreaterThanOrEqual(44);
    expect(layout.inside).toBe(true);
    if (width === 390) expect(layout).toMatchObject({ stacked:true, aligned:true, fullWidth:true });
    else expect(layout.sameRow).toBe(true);
    await expect(card.locator('#justice-arrest')).toHaveText(/Attempt arrest$/);
    await expect(card.locator('#justice-arrest-details')).toBeHidden();
    if (width === 390) {
      await card.locator('.settcard-info').click();
      await expect(card.locator('#justice-arrest-details')).toBeVisible();
    } else {
      await card.hover();
      await expect(page.locator('#tooltip')).toContainText('Arrest requires local authority');
    }
  });
}

test('unavailable justice sentences remain keyboard-inspectable', async function ({ page }) {
  await page.setViewportSize({ width:1280, height:900 });
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    FB.ui.showJusticeCharacter(f.target);
  });
  const card = page.locator('.justice-card').filter({ has:page.locator('[data-justice-sentence="forfeiture"]') });
  await expect(card.locator('[data-justice-sentence]')).toBeDisabled();
  await expect(card.locator('.justice-blocker')).toBeVisible();
  const penance = page.locator('.justice-card').filter({ has:page.locator('[data-justice-sentence="penance"]') });
  await penance.hover();
  await expect(page.locator('#tooltip')).toContainText('Lose 40 piety');
  await card.focus();
  await expect(card).toBeFocused();
  await expect(page.locator('#tooltip')).toContainText('Surrender titles and lands');
  await page.mouse.move(0, 0);
  await penance.hover();
  await expect(page.locator('#tooltip')).toContainText('Lose 40 piety');
});

test('punishment support previews show whole numbers without changing stored fractions', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  const before = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.setCountySupport(s, f.home, 3.9999999999999996);
    FB.setCountySupport(s, f.second, -95.6);
    FB.ui.showJusticeCharacter(f.target);
    return { home:FB.countySupportBase(s, f.home), second:FB.countySupportBase(s, f.second),
      homeName:FB.world.byId[f.home].name, secondName:FB.world.byId[f.second].name };
  });
  await page.locator('.justice-card').filter({ has:page.locator('#justice-arrest') }).locator('.settcard-info').click();
  const disclosure = page.locator('#gm-body details').filter({ hasText:'Affected counties' });
  await disclosure.locator('summary').click();
  await expect(disclosure).toContainText(before.homeName + ': 4 → -16');
  await expect(disclosure).toContainText(before.secondName + ': -96 → -100');
  expect(await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    return { home:FB.countySupportBase(s, f.home), second:FB.countySupportBase(s, f.second) };
  })).toEqual({ home:before.home, second:before.second });
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

test('execution result returns to the roster without reopening the dead character', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    FB.ui.showJusticeCharacter(f.target);
  });
  await page.locator('[data-justice-sentence="execution"]').click();
  await finishJusticeSentence(page);
  await expect(page.locator('#justice-search')).toBeVisible();
  await expect(page.locator('#justice-confirm, #justice-continue, #justice-arrest')).toHaveCount(0);
  expect(await page.evaluate(function () { return !!FB.state.chars[window.justiceFixture.target].dead; })).toBe(true);
});

test('justice trait inspection retains the original sheet and controls on Back', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    s.chars[f.target].traits = ['strong'];
    FB.ui.showJusticeCharacter(f.target);
  });
  const chip = page.locator('#gm-body .traitchip[data-trait="strong"]');
  await chip.evaluate(function (node) { node.dataset.returnWitness = 'justice'; });
  await chip.click();
  await expect(page.locator('#genmodal [data-modal-nav="back"]')).toBeEnabled();
  await page.locator('#genmodal [data-modal-nav="back"]').click();
  await expect(chip).toHaveAttribute('data-return-witness', 'justice');
  await expect(chip).toBeFocused();
  await expect(page.locator('#justice-arrest')).toBeEnabled();
});

test('arrest outcome sums both charges per county', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    window.justiceOriginalChance = FB.chance;
    FB.chance = function () { return true; };
    FB.ui.showJusticeCharacter(f.target);
  });
  try {
    await page.locator('#justice-arrest').click();
    await expect(page.locator('.justice-roster-receipt')).toHaveCount(0);
    const changes = await page.evaluate(function () {
      return FB.state.justice ? FB.justiceCustodyOf(FB.state, window.justiceFixture.target).unjustPaid : 0;
    });
    expect(changes).toBe(20);
  } finally {
    await page.evaluate(function () { FB.chance = window.justiceOriginalChance; });
  }
});

test('unjust sentences reduce all subordinate and liege standing with proportional, clamped penalties', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    // The selected sovereigns already have generated vassals. Isolate this
    // fixture's direct vassal, indirect vassal and liege before asserting three.
    Object.keys(s.realms).forEach(function (id) {
      if (['player', f.enemy, f.other].indexOf(s.realms[id].liege) >= 0) s.realms[id].liege = null;
    });
    s.realms[f.enemy].liege = 'player';
    s.realms[f.other].liege = f.enemy;
    FB.changePlayerLiege(s, f.liege, 'test:justice');
    FB.invalidateRealmCache();
    const ids = [f.enemy, f.other, f.liege];
    ids.forEach(function (id) { FB.setRealmRulerStanding(s, id, id === f.other ? -95 : 0); });
    FB.captureIntrigue(s, f.actor, f.target, 'abduction', 'player');
    const preview = FB.justiceStandingProjection(s, f.actor, -60);
    const before = ids.map(function (id) { return FB.rulerRegard(s, id, 'player'); });
    const applied = FB.justiceApplyPunishment(s, f.actor, f.target, 'execution');
    const after = ids.map(function (id) { return FB.rulerRegard(s, id, 'player'); });
    const repeat = FB.justiceApplyPunishment(s, f.actor, f.target, 'execution');
    return { ready:applied.ok, count:preview.length, before:before, after:after, repeat:repeat.ok,
      receipts:applied.impacts.filter(function (r) { return r.type === 'justiceStanding'; }).length };
  });
  expect(result).toEqual({ ready:true, count:3, before:[0,-95,0], after:[-30,-100,-30], repeat:false, receipts:3 });
});

test('AI unjust punishment damages vassal regard but justified punishment does not', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    s.realms[f.other].liege = f.enemy; s.realms[f.other].favor = 0;
    const actor = FB.materializeRealmRuler(s, f.enemy);
    FB.captureIntrigue(s, actor.id, f.target, 'abduction', f.enemy);
    const offense = FB.justiceRecordOffense(s, actor.id, f.target, 'assassination', 'material', false, actor.id);
    FB.justiceApplyPunishment(s, actor.id, f.target, 'imprisonment', offense.id);
    const lawful = FB.rulerRegard(s, f.other, f.enemy);
    FB.justiceApplyPunishment(s, actor.id, f.target, 'execution');
    return { lawful:lawful, unjust:FB.rulerRegard(s, f.other, f.enemy) };
  });
  expect(result).toEqual({ lawful:0, unjust:-30 });
});

test('unjust arrest standing is charged once when imprisonment follows', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture, chance = FB.chance;
    s.realms[f.enemy].liege = 'player'; FB.setRealmRulerStanding(s, f.enemy, 0);
    try { FB.chance = function () { return true; }; FB.justiceAttemptArrest(s, f.actor, f.target); }
    finally { FB.chance = chance; }
    const captured = FB.rulerRegard(s, f.enemy, 'player');
    FB.justiceApplyPunishment(s, f.actor, f.target, 'imprisonment');
    return { captured:captured, imprisoned:FB.rulerRegard(s, f.enemy, 'player') };
  });
  expect(result).toEqual({ captured:-10, imprisoned:-10 });
});

for (const playerRuler of [true, false]) {
  test('justice support stays with direct holdings for ' + (playerRuler ? 'player' : 'AI') + ' rulers', async function ({ page }) {
    const result = await page.evaluate(function (playerRuler) {
      const s = FB.state, f = window.justiceFixture;
      const rid = playerRuler ? 'player' : f.enemy;
      const actor = playerRuler ? f.actor : FB.materializeRealmRuler(s, rid).id;
      const direct = playerRuler ? f.home : s.realms[rid].capital;
      const delegated = f.second, vassal = f.other;
      s.realms[vassal].liege = rid; s.realms[vassal].favor = 0;
      s.holder[delegated] = vassal; s.owner[delegated] = rid;
      s.player.provs = s.player.provs.filter(function (pid) { return pid !== delegated; });
      s.chars[f.target].homeProvinceId = delegated;
      FB.invalidateRealmCache();
      FB.setCountySupport(s, direct, 0); FB.setCountySupport(s, delegated, 17);
      if (playerRuler) FB.setRealmRulerStanding(s, vassal, 0);
      const preview = FB.justiceArrestProjection(s, actor, f.target);
      const chance = FB.chance;
      let arrest;
      try { FB.chance = function () { return true; }; arrest = FB.justiceAttemptArrest(s, actor, f.target); }
      finally { FB.chance = chance; }
      const prison = FB.justiceApplyPunishment(s, actor, f.target, 'imprisonment');
      const sentence = FB.justicePunishmentProjection(s, actor, f.target, 'execution');
      const execution = FB.justiceApplyPunishment(s, actor, f.target, 'execution');
      const impacts = arrest.impacts.concat(prison.impacts, execution.impacts);
      return { jurisdiction:preview.counties.indexOf(delegated) >= 0,
        arrestAllowed:preview.ready, arrested:arrest.captured,
        previewExcludesVassal:preview.supportCounties.indexOf(delegated) < 0,
        sentenceExcludesVassal:sentence.supportCounties.indexOf(delegated) < 0,
        direct:FB.countySupportBase(s, direct), delegated:FB.countySupportBase(s, delegated),
        standing:FB.rulerRegard(s, vassal, rid),
        chargedVassal:impacts.some(function (r) { return r.type === 'commonVoice' && r.pid === delegated; }) };
    }, playerRuler);
    expect(result).toEqual({ jurisdiction:true, arrestAllowed:true, arrested:true,
      previewExcludesVassal:true, sentenceExcludesVassal:true, direct:-80, delegated:17,
      standing:-40, chargedVassal:false });
  });
}

test('justice review lists only directly governed counties while retaining affected vassals', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  const names = await page.evaluate(function () {
    const s = FB.state, f = window.justiceFixture;
    s.realms[f.enemy].liege = 'player'; s.holder[f.second] = f.enemy;
    s.player.provs = [f.home]; FB.invalidateRealmCache();
    FB.ui.showJusticeCharacter(f.target);
    return { direct:FB.world.byId[f.home].name, delegated:FB.world.byId[f.second].name,
      vassal:s.realms[f.enemy].name };
  });
  await page.locator('.justice-card').filter({ has:page.locator('#justice-arrest') }).locator('.settcard-info').click();
  const counties = page.locator('#gm-body details').filter({ hasText:'Affected counties' });
  await counties.locator('summary').click();
  await expect(counties.locator('li')).toHaveCount(1);
  await expect(counties).toContainText(names.direct);
  await expect(counties).not.toContainText(names.delegated + ':');
  const rulers = page.locator('#gm-body details').filter({ hasText:'Affected rulers' });
  await rulers.locator('summary').click();
  await expect(rulers).toContainText(names.vassal);
});
