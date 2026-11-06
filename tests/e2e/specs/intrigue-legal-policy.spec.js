'use strict';
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/justice.js','js/intrigue.js','js/events.js','js/authority.js',
  'js/mods.js','js/save.js','js/ui_modals.js','data/events_intrigue.js','data/intrigue.js']);
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');

async function start(page, info, name) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(__dirname, '../fixtures/intrigue-legal-policy', name + '.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('HEARING-867-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('button', { name:'Begin', exact:true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function (name) {
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    const s = FB.state;
    const rid = s.holder[s.player.provinceId] || s.owner[s.player.provinceId];
    const actor = FB.materializeRealmRuler(s, rid);
    actor.traits = []; actor.culture = 'frankish'; actor.religion = 'catholic';
    FB.authoritySetGovernment(s, rid, 'territorial');
    FB.authoritySetIdentity(s, rid, { eliteCultureId:'frankish', eliteFaithId:'catholic',
      legalIdentityId:name + '_hearing', tolerance:'tolerant', taxation:'equal', justicePolicy:'elite' });
    s.player.gold = 500; s.player.piety = 100; s.player.prestige = 100;
    s.eventQueue = []; delete s.player.flags.tutorial;
    window.hearingCourt = { actorId:actor.id, rid:rid, name:name };
    window.queueHearing = function (crime, evidence) {
      const s = FB.state, c = window.hearingCourt;
      const offense = FB.justiceExposeScheme(s, { id:crime || 'abduction', actorId:s.player.charId,
        recordId:'hearing-proof', context:{ characterId:c.actorId } }, evidence || 'redhanded', false);
      const custody = FB.captureIntrigue(s, c.actorId, s.player.charId, 'judicial', c.rid);
      const queued = FB.justiceApplyPunishment(s, c.actorId, s.player.charId, c.name + '_term', offense.id);
      if (!queued.ok) throw new Error('Hearing not queued: ' + JSON.stringify(queued));
      return { offense:offense, custody:custody, ctx:{ justiceId:s.justice.pending.id, studentId:c.actorId } };
    };
  }, name);
}

for (const name of ['harbor','upland']) {
  test(name + ' imported public policy governs real responses and seasonal AI', async function ({ page }, info) {
    await start(page, info, name);
    const r = await page.evaluate(function () {
      const s = FB.state, c = window.hearingCourt, h = window.queueHearing();
      const ev = FB.eventById('justice_hearing');
      const before = JSON.stringify(s), rng = FB.getRngState();
      const uid = FB.getUidCounter();
      const params = FB.justiceHearingParams(s, h.ctx);
      const pay = FB.fns.justice_can_pay(s, h.ctx), penance = FB.fns.justice_can_penance(s, h.ctx);
      const options = FB.justiceSentenceOptions(s, c.actorId, s.player.charId);
      const secular = FB.justiceTradition(s, c.actorId).id;
      const religious = FB.justiceTradition(s, c.actorId, 'religious').id;
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      h.offense.evidence = 'testimony';
      const proofBefore = JSON.stringify(s);
      const testimony = FB.justicePunishmentProjection(s, c.actorId, s.player.charId, c.name + '_term', h.offense.id);
      const proofPure = proofBefore === JSON.stringify(s) && rng === FB.getRngState();
      h.offense.evidence = 'redhanded';
      const applied = FB.resolveEventOption(s, ev, ev.options.find(function (o) { return o.effects.custom === 'justice_submit'; }), h.ctx);
      const after = JSON.stringify(s), afterRng = FB.getRngState();
      const replay = FB.resolveEventOption(s, ev, ev.options.find(function (o) { return o.effects.custom === 'justice_submit'; }), h.ctx);
      const replayPure = after === JSON.stringify(s) && afterRng === FB.getRngState();
      const npc = FB.makeCharacter(s, { name:'Witness', sex:'m', culture:'frankish', religion:'catholic', born:s.date.year - 30, station:0, traitsN:0 });
      npc.homeProvinceId = s.player.provinceId;
      FB.intrigueAutoSentence(s, { id:'abduction', actorId:npc.id, recordId:'ai-proof', context:{ characterId:c.actorId } }, 'redhanded', false);
      const uncaptured = !FB.justiceCustodyOf(s, npc.id);
      FB.captureIntrigue(s, c.actorId, npc.id, 'judicial', c.rid);
      delete s.justice.lastSeason; FB.justiceSeason(s);
      return { secular:secular, religious:religious, params:params, pure:pure, pay:pay, penance:penance,
        testimony:testimony.ready, proofPure:proofPure,
        options:options.map(function (p) { return p.sentence; }), applied:!!applied,
        closed:h.offense.closed, term:h.custody.endTurn - h.custody.captureTurn,
        replay:replay, replayPure:replayPure, uncaptured:uncaptured,
        ai:s.justice.last.sentence, aiTerm:FB.justiceCustodyOf(s, npc.id).endTurn - s.turn };
    });
    expect(r).toMatchObject({ secular:name + '_hearing', religious:'latin', pure:true,
      testimony:name === 'harbor', proofPure:true,
      pay:name === 'harbor', penance:name === 'harbor', applied:true, closed:true,
      term:name === 'harbor' ? 120 : 75, replay:false, replayPure:true, uncaptured:true,
      ai:name + '_term', aiTerm:name === 'harbor' ? 120 : 75 });
    expect(r.params.sentenceName.id).toBe(name + '_term');
    expect(r.options).toContain(name + '_term');
    expect(r.options).not.toContain('imprisonment');
  });

  test(name + ' rejects costs, stale policy and stale authority before receipts', async function ({ page }, info) {
    await start(page, info, name);
    const rows = await page.evaluate(function () {
      const s = FB.state, c = window.hearingCourt, h = window.queueHearing();
      const ev = FB.eventById('justice_hearing'), rows = [];
      function reject(action) {
        const before = JSON.stringify(s), rng = FB.getRngState();
        const uid = FB.getUidCounter();
        const option = ev.options.find(function (o) { return o.effects.custom === action; });
        const result = FB.resolveEventOption(s, ev, option, h.ctx);
        const direct = action === 'justice_submit' && FB.justiceApplyPunishment(s, c.actorId, s.player.charId,
          c.name + '_term', h.offense.id, h.ctx.justiceId);
        // Insufficient funds/merit reject only their alternatives; stale reviews
        // must also reject attempts to bypass the event resolver.
        rows.push({ result:result, pure:before === JSON.stringify(s) && rng === FB.getRngState() &&
          uid === FB.getUidCounter(), directRejected:!direct || !direct.ok });
      }
      s.player.gold = 0; reject('justice_pay'); s.player.gold = 500;
      s.player.piety = 0; reject('justice_penance'); s.player.piety = 100;
      const law = FBDATA.legalTraditions[c.name + '_hearing'];
      law.procedures.compensationMaxSeverity = law.procedures.compensationMaxSeverity === 3 ? 2 : 1;
      reject('justice_submit');
      law.procedures.compensationMaxSeverity = c.name === 'harbor' ? 3 : 0;
      const def = FBDATA.justiceSentences[c.name + '_term']; def.termDays++;
      reject('justice_submit'); def.termDays--;
      const county = FB.justiceCounties(s, c.actorId)[0], prior = s.holder[county];
      s.holder[county] = null; FB.invalidateRealmCache(); reject('justice_submit');
      s.holder[county] = prior; FB.invalidateRealmCache();
      h.offense.victimId = s.player.charId; reject('justice_submit');
      return rows;
    });
    expect(rows).toHaveLength(6);
    rows.forEach(function (r) { expect(r).toEqual({ result:false, pure:true, directRejected:true }); });
  });
}

test('legacy hearing queries are pure and restore preserves saved parties and court without replay', async function ({ page }, info) {
  await start(page, info, 'harbor');
  const r = await page.evaluate(function () {
    let s = FB.state; const c = window.hearingCourt;
    const victim = FB.makeCharacter(s, { name:'Original victim', sex:'m', culture:'frankish', religion:'catholic', born:s.date.year - 25, station:0, traitsN:0 });
    FB.ensureIntrigue(s);
    s.intrigue.hearing = { id:'old-hearing', plotId:'abduction', accusedId:s.player.charId,
      accusedGeneration:s.generation, targetId:victim.id, context:{ characterId:c.actorId },
      authority:c.rid, evidence:'material', severity:2, successful:false };
    const before = JSON.stringify(s), rng = FB.getRngState();
    const ctx = { hearingId:'old-hearing' };
    const valid = FB.fns.intrigue_hearing_valid(s, ctx);
    FB.fns.intrigue_hearing_can_pay(s, ctx); FB.fns.intrigue_hearing_can_penance(s, ctx);
    const ev = FB.eventById('intrigue_hearing');
    const rejected = FB.resolveEventOption(s, ev, ev.options.find(function (o) { return o.effects.custom === 'intrigue_hearing_submit'; }), ctx);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState();
    FB.save.restore(FB.save.parseExport(FB.save.exportState())); s = FB.state;
    const first = JSON.stringify(s.justice.offenses), gold = s.player.gold;
    const offense = s.justice.offenses[0];
    FB.save.restore(FB.save.parseExport(FB.save.exportState())); s = FB.state;
    return { valid:valid, rejected:rejected, pure:pure, victim:offense.victimId === victim.id,
      authority:offense.authority === c.rid, accused:offense.accusedId === s.player.charId,
      replay:first === JSON.stringify(s.justice.offenses), money:gold === s.player.gold,
      custody:!!FB.justiceCustodyOf(s, s.player.charId), pending:!!s.justice.pending };
  });
  expect(r).toEqual({ valid:false, rejected:false, pure:true, victim:true, authority:true,
    accused:true, replay:true, money:true, custody:false, pending:false });
});

test('matching imported saves retain reviews and judgments; changed content is incompatible', async function ({ page }, info) {
  await start(page, info, 'harbor');
  const r = await page.evaluate(function () {
    let s = FB.state; const h = window.queueHearing();
    const review = s.justice.pending.review;
    const saved = FB.save.parseExport(FB.save.exportState());
    const matching = FB.mods.saveCompatibility(saved).compatible;
    FB.save.restore(saved); s = FB.state;
    const retained = s.justice.pending.review === review && FB.fns.justice_response_valid(s, h.ctx);
    const ev = FB.eventById('justice_hearing');
    const applied = FB.resolveEventOption(s, ev, ev.options.find(function (o) { return o.effects.custom === 'justice_submit'; }), h.ctx);
    const judgment = JSON.stringify(s.justice.last), gold = s.player.gold;
    FB.save.restore(FB.save.parseExport(FB.save.exportState())); s = FB.state;
    const noReplay = judgment === JSON.stringify(s.justice.last) && gold === s.player.gold;
    const changed = JSON.parse(JSON.stringify(FBDATA.legalTraditions.harbor_hearing));
    changed.procedures.compensationMaxSeverity = 0;
    FB.mods.apply({ legalTraditions:{ harbor_hearing:changed } });
    return { matching:matching, retained:retained, applied:!!applied, noReplay:noReplay,
      mismatch:!FB.mods.saveCompatibility(saved).compatible };
  });
  expect(r).toEqual({ matching:true, retained:true, applied:true, noReplay:true, mismatch:true });
});

test('private captivity grants no public court and both distributions retain permitted sentences', async function ({ page }, info) {
  await start(page, info, 'harbor');
  const r = await page.evaluate(function () {
    const s = FB.state, c = window.hearingCourt;
    const npc = FB.makeCharacter(s, { name:'Private captive', sex:'m', culture:'frankish', religion:'catholic', born:s.date.year - 30, station:0, traitsN:0 });
    FB.captureIntrigue(s, s.player.charId, npc.id, 'abduction');
    const before = JSON.stringify(s), rng = FB.getRngState();
    const privateResult = FB.justiceApplyPunishment(s, s.player.charId, npc.id, 'harbor_term');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState();
    const h = window.queueHearing('assassination');
    const ordinary = FB.justiceSentenceOptions(s, c.actorId, s.player.charId).map(function (p) { return p.sentence; });
    const old = FB.platform.isCrazyGames;
    let restricted, normalized;
    try {
      FB.platform.isCrazyGames = true;
      restricted = FB.justiceSentenceOptions(s, c.actorId, s.player.charId).map(function (p) { return p.sentence; });
      normalized = FB.justicePunishmentProjection(s, c.actorId, s.player.charId, 'execution', h.offense.id);
    } finally { FB.platform.isCrazyGames = old; }
    return { privateOk:privateResult.ok, pure:pure, ordinary:ordinary, restricted:restricted,
      normalized:normalized.sentence, ready:normalized.ready };
  });
  expect(r).toMatchObject({ privateOk:false, pure:true, normalized:'harbor_term', ready:true });
  expect(r.ordinary).toContain('execution'); expect(r.restricted).not.toContain('execution');
});

test('real player exposure records a public case; compensation and penance apply declared costs once', async function ({ page }, info) {
  await start(page, info, 'harbor');
  const r = await page.evaluate(function () {
    const s = FB.state, c = window.hearingCourt;
    // Bounded attempts exercise the real evidence roll, including suspicion.
    for (let i = 0; i < 12 && !(s.justice && s.justice.offenses.length); i++) {
      FB.resolveIntrigueScheme(s, { id:'blackmail', actorId:s.player.charId,
        recordId:'exposure-' + i, context:{ characterId:c.actorId }, methodId:'careful',
        power:FBDATA.plots.blackmail.need }, { success:false, exposed:true, playerActor:true });
    }
    const exposed = !!(s.justice && s.justice.offenses.some(function (o) {
      return o.accusedId === s.player.charId && o.victimId === c.actorId && o.authority === c.rid;
    }));
    const notCaptured = !FB.justiceCustodyOf(s, s.player.charId);
    const ev = FB.eventById('justice_hearing'), results = [];
    ['justice_pay','justice_penance'].forEach(function (action, index) {
      const offense = FB.justiceRecordOffense(s, c.actorId, s.player.charId, 'blackmail', 'redhanded', false, c.actorId, 'cost-' + index);
      FB.captureIntrigue(s, c.actorId, s.player.charId, 'judicial', c.rid);
      FB.justiceApplyPunishment(s, c.actorId, s.player.charId, 'harbor_term', offense.id);
      const ctx = { justiceId:s.justice.pending.id, studentId:c.actorId };
      const gold = s.player.gold, piety = s.player.piety, prestige = s.player.prestige;
      const quote = FB.justicePunishmentProjection(s, c.actorId, s.player.charId, 'harbor_fine', offense.id);
      const result = FB.resolveEventOption(s, ev, ev.options.find(function (o) { return o.effects.custom === action; }), ctx);
      results.push({ ok:!!result, closed:offense.closed, released:!FB.justiceCustodyOf(s, s.player.charId),
        gold:gold - s.player.gold, fine:quote.fine, piety:piety - s.player.piety, prestige:prestige - s.player.prestige });
    });
    return { exposed:exposed, notCaptured:notCaptured, results:results };
  });
  expect(r.exposed).toBe(true); expect(r.notCaptured).toBe(true);
  expect(r.results[0]).toEqual({ ok:true, closed:true, released:true, gold:r.results[0].fine,
    fine:r.results[0].fine, piety:0, prestige:0 });
  expect(r.results[1]).toMatchObject({ ok:true, closed:true, released:true, gold:0, piety:7, prestige:3 });
});

test('invalid imported policy candidates and invalid saved authority cannot create public rights', async function ({ page }, info) {
  await start(page, info, 'upland');
  const r = await page.evaluate(function () {
    const s = FB.state, c = window.hearingCourt;
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA.legalTraditions), rng = FB.getRngState();
    const storage = localStorage.getItem('fb_mods'), signature = FB.mods.sig();
    const bad = JSON.parse(JSON.stringify(FBDATA.legalTraditions.upland_hearing));
    bad.sentences.push('missing_sentence'); bad.procedures.compensationMaxSeverity = 4;
    const errors = FB.mods.validate({ legalTraditions:{ bad_hearing:bad } });
    const pure = before === JSON.stringify(s) && data === JSON.stringify(FBDATA.legalTraditions) &&
      rng === FB.getRngState() && storage === localStorage.getItem('fb_mods') && signature === FB.mods.sig();
    FB.ensureIntrigue(s);
    s.intrigue.hearing = { id:'invalid-court', plotId:'abduction', accusedId:s.player.charId,
      accusedGeneration:s.generation, targetId:c.actorId, context:{ characterId:c.actorId },
      authority:'missing-court', evidence:'material', severity:2 };
    FB.save.restore(FB.save.parseExport(FB.save.exportState()));
    return { faults:errors.length > 0, pure:pure, hearing:!!FB.state.intrigue.hearing,
      cases:FB.state.justice && FB.state.justice.offenses.length || 0,
      pending:!!(FB.state.justice && FB.state.justice.pending) };
  });
  expect(r).toEqual({ faults:true, pure:true, hearing:false, cases:0, pending:false });
});

test('religious hearings apply faith costs and restricted public hearings apply only custody', async function ({ page }, info) {
  await start(page, info, 'harbor');
  const r = await page.evaluate(function () {
    const s = FB.state, c = window.hearingCourt, ev = FB.eventById('justice_hearing');
    const offense = FB.justiceRecordOffense(s, c.actorId, s.player.charId, 'blackmail', 'redhanded', false, c.actorId, 'religious-case');
    const row = FB.captureIntrigue(s, c.actorId, s.player.charId, 'judicial', c.rid);
    row.courtKind = 'religious';
    const queued = FB.justiceApplyPunishment(s, c.actorId, s.player.charId, 'penance', offense.id, null, 'religious');
    const ctx = { justiceId:s.justice.pending.id, studentId:c.actorId };
    const params = FB.justiceHearingParams(s, ctx), piety = s.player.piety;
    const religious = FB.resolveEventOption(s, ev, ev.options.find(function (o) { return o.effects.custom === 'justice_submit'; }), ctx);
    const religiousCost = piety - s.player.piety;
    const old = FB.platform.isCrazyGames;
    let restricted;
    try {
      FB.platform.isCrazyGames = true;
      const cause = FB.justiceRecordOffense(s, c.actorId, s.player.charId, 'assassination', 'redhanded', true, c.actorId, 'restricted-case');
      FB.captureIntrigue(s, c.actorId, s.player.charId, 'judicial', c.rid);
      const queued = FB.justiceApplyPunishment(s, c.actorId, s.player.charId, 'execution', cause.id);
      const ctx = { justiceId:s.justice.pending.id, studentId:c.actorId };
      const sentence = s.justice.pending.sentence;
      const result = FB.resolveEventOption(s, ev, ev.options.find(function (o) { return o.effects.custom === 'justice_submit'; }), ctx);
      restricted = { queued:queued.ok, sentence:sentence, applied:!!result,
        dead:!!s.chars[s.player.charId].dead, imposed:s.justice.last.sentence };
    } finally { FB.platform.isCrazyGames = old; }
    return { queued:queued.ok, cost:params.sentencePietyCost, religious:!!religious,
      religiousCost:religiousCost, restricted:restricted };
  });
  expect(r).toEqual({ queued:true, cost:40, religious:true, religiousCost:40,
    restricted:{ queued:true, sentence:'harbor_term', applied:true, dead:false, imposed:'harbor_term' } });
});

test('ruler confirmation rejects a changed reviewed sentence and preserves the prisoner view', async function ({ page }, info) {
  await start(page, info, 'harbor');
  await page.evaluate(function () {
    const s = FB.state, home = s.player.provinceId;
    s.player.tier = 4; s.player.provs = [home]; s.player.liege = null;
    FB.foundPlayerRealm(s); s.owner[home] = 'player'; s.holder[home] = 'player'; FB.invalidateRealmCache();
    FB.authoritySetIdentity(s, 'player', { eliteCultureId:'frankish', eliteFaithId:'catholic',
      legalIdentityId:'harbor_hearing', tolerance:'tolerant', taxation:'equal', justicePolicy:'elite' });
    const target = FB.makeCharacter(s, { name:'Reviewed prisoner', sex:'m', culture:'frankish', religion:'catholic', born:s.date.year - 30, station:0, traitsN:0 });
    target.homeProvinceId = home;
    FB.justiceRecordOffense(s, s.player.charId, target.id, 'abduction', 'redhanded', false, s.player.charId);
    FB.captureIntrigue(s, s.player.charId, target.id, 'judicial', 'player');
    FB.ui.showJusticeCharacter(target.id);
  });
  await page.locator('[data-justice-sentence="harbor_term"]').click();
  await expect(page.locator('#gm-title')).toHaveText('Review judgment');
  await page.evaluate(function () {
    FBDATA.justiceSentences.harbor_term.termDays++;
    window.beforeJudgment = JSON.stringify(FB.state); window.beforeJudgmentRng = FB.getRngState();
  });
  await page.locator('#justice-confirm').click();
  await expect(page.locator('[data-justice-sentence="harbor_term"]')).toBeVisible();
  expect(await page.evaluate(function () {
    return window.beforeJudgment === JSON.stringify(FB.state) && window.beforeJudgmentRng === FB.getRngState();
  })).toBe(true);
  await page.locator('[data-justice-sentence="harbor_term"]').click();
  await page.locator('#justice-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Sentence carried out');
});

test('public arrest response enters custody and queues the same declared hearing', async function ({ page }, info) {
  await start(page, info, 'upland');
  const r = await page.evaluate(function () {
    const s = FB.state, c = window.hearingCourt;
    const offense = FB.justiceExposeScheme(s, { id:'abduction', actorId:s.player.charId,
      recordId:'arrest-proof', context:{ characterId:c.actorId } }, 'redhanded', false);
    const attempt = FB.justiceAttemptArrest(s, c.actorId, s.player.charId, offense.id);
    const arrest = FB.eventById('justice_arrest'), ctx = { justiceId:s.justice.pending.id, studentId:c.actorId };
    const accepted = FB.resolveEventOption(s, arrest,
      arrest.options.find(function (o) { return o.effects.custom === 'justice_submit'; }), ctx);
    const pending = s.justice.pending, custody = FB.justiceCustodyOf(s, s.player.charId);
    const hearing = FB.eventById('justice_hearing');
    const sentence = pending.sentence;
    const applied = FB.resolveEventOption(s, hearing,
      hearing.options.find(function (o) { return o.effects.custom === 'justice_submit'; }),
      { justiceId:pending.id, studentId:c.actorId });
    return { queued:attempt.ok && attempt.pending, accepted:!!accepted,
      captor:custody.captorId === c.actorId, sentence:sentence, applied:!!applied,
      imposed:s.justice.last.sentence, term:custody.endTurn - custody.captureTurn, closed:offense.closed };
  });
  expect(r).toEqual({ queued:true, accepted:true, captor:true, sentence:'upland_term', applied:true,
    imposed:'upland_term', term:75, closed:true });
});
