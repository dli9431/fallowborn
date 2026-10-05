'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/justice.js', 'js/intrigue.js', 'js/model.js', 'js/station.js', 'js/authority.js',
  'js/governments.js', 'js/world.js', 'js/mods.js', 'js/economy.js', 'js/events.js',
  'js/i18n.js', 'js/messages.js', 'js/save.js', 'js/ui_modals.js',
  'data/intrigue.js', 'data/events_intrigue.js', 'data/cultures.js', 'data/political_institutions.js',
  'data/technology.js', 'data/bookmarks.js', 'data/lexicons.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function startCourt(page, testInfo, bookmark) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('LEGAL-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('button', { name:'Begin', exact:true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    const s = FB.state, p = s.player, home = p.provinceId;
    p.tier = 4; p.provs = [home]; p.liege = null; p.gold = 500;
    FB.foundPlayerRealm(s);
    s.owner[home] = 'player'; s.holder[home] = 'player';
    s.eventQueue = []; s.countySupport = {}; delete p.flags.tutorial;
    s.chars[p.charId].culture = 'frankish'; s.chars[p.charId].religion = 'catholic';
    FB.invalidateRealmCache();
    window.legalTarget = function () {
      const c = FB.makeCharacter(s, { name:'Court prisoner', sex:'m', culture:'frankish',
        religion:'catholic', born:s.date.year - 30, station:1, traitsN:0 });
      c.traits = []; c.wealth = 500; c.piety = 100; c.prestige = 100; c.homeProvinceId = home;
      return c;
    };
  });
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(bookmark);
}

const COMMON = ['release','pardon','ransom','fine','imprisonment','exile','forfeiture','execution'];
for (const bookmark of ['867','1066']) {
  test(bookmark + ' preserves offered sentences for every faith and Byzantine precedence', async function ({ page }, testInfo) {
    await startCourt(page, testInfo, bookmark);
    const results = await page.evaluate(function () {
      const s = FB.state, actor = s.chars[s.player.charId], target = window.legalTarget();
      FB.captureIntrigue(s, actor.id, target.id, 'judicial', 'player');
      FB.justiceRecordOffense(s, actor.id, target.id, 'assassination', 'material', true, actor.id);
      const rows = Object.keys(FBDATA.religions).map(function (faith) {
        actor.religion = faith; actor.culture = 'frankish';
        const declared = FB.faithValue(s, faith, 'legalTradition').value;
        const before = JSON.stringify(s), rng = FB.getRngState();
        const options = FB.justiceSentenceOptions(s, actor.id, target.id).map(function (p) { return p.sentence; });
        return { faith:faith, declared:declared, options:options.sort(), pure:before === JSON.stringify(s) && rng === FB.getRngState() };
      });
      actor.religion = 'sunni'; actor.culture = 'greek';
      rows.push({ faith:'Greek ruler', declared:'byzantine', pure:true,
        options:FB.justiceSentenceOptions(s, actor.id, target.id).map(function (p) { return p.sentence; }).sort() });
      return rows;
    });
    for (const row of results) {
      const extra = row.declared === 'latin' ? ['penance'] : row.declared === 'muslim' ? ['diya','qisas'] :
        row.declared === 'byzantine' ? ['monastic_exile','blinding_deposition'] : [];
      expect(row.options, row.faith).toEqual(COMMON.concat(extra).sort());
      expect(row.pure, row.faith).toBe(true);
    }
  });

  test(bookmark + ' preserves sentence effects, cause consumption and title forfeiture', async function ({ page }, testInfo) {
    await startCourt(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, actor = s.chars[s.player.charId], rows = {};
      ['release','pardon','ransom','fine','penance','imprisonment','exile','monastic_exile',
        'blinding_deposition','diya','qisas','execution'].forEach(function (id) {
        actor.religion = ['diya','qisas'].indexOf(id) >= 0 ? 'sunni' : 'catholic';
        actor.culture = ['monastic_exile','blinding_deposition'].indexOf(id) >= 0 ? 'greek' : 'frankish';
        const target = window.legalTarget();
        const offense = FB.justiceRecordOffense(s, actor.id, target.id, 'assassination', 'redhanded', true, actor.id);
        const captive = FB.captureIntrigue(s, actor.id, target.id, 'judicial', 'player');
        const before = s.player.gold, projection = FB.justicePunishmentProjection(s, actor.id, target.id, id, offense.id);
        const applied = FB.justiceApplyPunishment(s, actor.id, target.id, id, offense.id);
        rows[id] = { ok:applied.ok, justified:projection.justified, support:projection.support,
          paid:s.player.gold - before, purse:target.wealth, closed:offense.closed,
          held:!!FB.justiceCustodyOf(s, target.id), dead:!!target.dead,
          piety:target.piety, prestige:target.prestige,
          term:captive.endTurn - captive.captureTurn, traits:target.traits.slice(),
          moved:!!projection.destination && FB.characterResidence(s, target) === projection.destination,
          cloister:!!target.career && target.career.profession === FB.roleCareer('cloister') };
      });
      actor.culture = 'frankish'; actor.religion = 'catholic';
      const rid = Object.keys(s.realms).sort().filter(function (id) {
        return id !== 'player' && s.realms[id].alive && !s.realms[id].liege && FB.realmHeldCounties(s, id).length;
      })[0];
      const realm = s.realms[rid], counties = FB.realmHeldCounties(s, rid).slice();
      realm.liege = 'player'; FB.realmTerritory(s, rid).forEach(function (pid) { s.owner[pid] = 'player'; });
      FB.invalidateRealmCache();
      const target = FB.materializeRealmRuler(s, rid);
      const offense = FB.justiceRecordOffense(s, actor.id, target.id, 'rebellion', 'redhanded', true, actor.id);
      FB.captureIntrigue(s, actor.id, target.id, 'judicial', 'player');
      rows.forfeiture = { ok:FB.justiceApplyPunishment(s, actor.id, target.id, 'forfeiture', offense.id).ok,
        ended:!realm.alive, transferred:counties.every(function (pid) { return s.holder[pid] === 'player'; }) };
      return rows;
    });
    for (const id of Object.keys(result).filter(function (id) { return id !== 'forfeiture'; })) {
      expect(result[id], id).toMatchObject({ ok:true, justified:true, support:0,
        closed:['release','ransom'].indexOf(id) < 0, held:id === 'imprisonment', dead:['qisas','execution'].indexOf(id) >= 0 });
    }
    expect(result.fine).toMatchObject({ paid:48, purse:452 });
    expect(result.diya).toMatchObject({ paid:48, purse:452 });
    expect(result.ransom).toMatchObject({ paid:10, purse:490 });
    expect(result.penance).toMatchObject({ piety:60, prestige:80 });
    expect(result.imprisonment.term).toBe(360);
    expect(result.exile.moved).toBe(true);
    expect(result.monastic_exile).toMatchObject({ moved:true, cloister:true });
    expect(result.blinding_deposition.traits).toEqual(expect.arrayContaining(['one_eyed','maimed']));
    expect(result.forfeiture).toEqual({ ok:true, ended:true, transferred:true });
  });

  test(bookmark + ' AI selects the existing regional sentence through the player projection', async function ({ page }, testInfo) {
    await startCourt(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, rid = Object.keys(s.realms).sort().filter(function (id) {
        return id !== 'player' && s.realms[id].alive && FB.realmRank.isTerritorial(s.realms[id], s);
      })[0];
      const actor = FB.materializeRealmRuler(s, rid); actor.traits = [];
      FB.authoritySetGovernment(s, rid, 'territorial');
      return [
        { culture:'frankish', faith:'catholic', crime:'blackmail', expected:'fine' },
        { culture:'frankish', faith:'catholic', crime:'abduction', expected:'imprisonment' },
        { culture:'frankish', faith:'catholic', crime:'assassination', expected:'execution' },
        { culture:'greek', faith:'orthodox', crime:'assassination', expected:'blinding_deposition' },
        { culture:'arabic', faith:'sunni', crime:'assassination', expected:'qisas' },
        { culture:'norse', faith:'norse_pagan', crime:'assassination', expected:'execution' }
      ].map(function (scenario) {
        actor.culture = scenario.culture; actor.religion = scenario.faith;
        const target = window.legalTarget();
        const offense = FB.justiceRecordOffense(s, actor.id, target.id, scenario.crime, 'redhanded', true, actor.id);
        FB.captureIntrigue(s, actor.id, target.id, 'judicial', rid);
        const quoted = FB.justicePunishmentProjection(s, actor.id, target.id, scenario.expected, offense.id);
        delete s.justice.lastSeason;
        FB.justiceSeason(s);
        return { expected:scenario.expected, actual:s.justice.last.sentence, ready:quoted.ready, lawful:s.justice.last.justified };
      });
    });
    for (const row of result) expect(row).toEqual({ expected:row.expected, actual:row.expected, ready:true, lawful:true });
  });
}

async function installTestCourt(page) {
  await page.evaluate(function () {
    const custom = {
      name:'Test court', sentences:['release','pardon','ransom','restitution','detention','atonement'],
      procedures:{ arrest:false, hearing:true, ransom:false, pardon:false, compensationMaxSeverity:3, penanceMaxSeverity:2 },
      justification:{ evidence:['redhanded'], sentences:{ detention:{ level:1 } } },
      ai:{ minor:['detention'], serious:['detention'], severe:['restitution'], arbitrary:['detention'], excessive:['detention'] }
    };
    FB.mods.apply({ legalTraditions:{ test_court:custom },
      justiceSentences:{
        restitution:{ name:'Restitution', desc:'Pay compensation.', kind:'fine', level:1, penalty:10 },
        detention:{ name:'Detention', desc:'Serve a half-year term.', kind:'custody', level:2, penalty:20, termDays:180, extensionWindow:30 },
        atonement:{ name:'Atonement', desc:'Lose piety and prestige.', kind:'penance', level:1, penalty:10, pietyCost:10, prestigeCost:5 }
      }, governmentForms:{ test_court:Object.assign({}, FBDATA.governmentForms.territorial, { legalTradition:'test_court' }) }
    });
    FB.authoritySetGovernment(FB.state, 'player', 'test_court');
  });
}

test('custom government traditions change procedures, proof and renamed sentence effects', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '867'); await installTestCourt(page);
  const result = await page.evaluate(function () {
    const s = FB.state, actor = s.player.charId, target = window.legalTarget();
    const arrest = FB.justiceArrestProjection(s, actor, target.id);
    FB.captureIntrigue(s, actor, target.id, 'judicial', 'player');
    const offense = FB.justiceRecordOffense(s, actor, target.id, 'blackmail', 'material', true, actor);
    const unsupported = FB.justicePunishmentProjection(s, actor, target.id, 'detention', offense.id);
    const proof = FB.justiceRecordOffense(s, actor, target.id, 'blackmail', 'redhanded', true, actor, 'proof');
    const options = FB.justiceSentenceOptions(s, actor, target.id);
    const quote = FB.justicePunishmentProjection(s, actor, target.id, 'detention', proof.id);
    const imposed = FB.justiceApplyPunishment(s, actor, target.id, 'detention', proof.id);
    const term = FB.justiceCustodyOf(s, target.id).endTurn - s.turn;
    FB.justiceReleaseCustody(s, FB.justiceCustodyOf(s, target.id));
    FB.captureIntrigue(s, actor, target.id, 'judicial', 'player');
    const penance = FB.justiceApplyPunishment(s, actor, target.id, 'atonement');
    const other = window.legalTarget();
    FB.captureIntrigue(s, actor, other.id, 'judicial', 'player');
    FBDATA.legalTraditions.test_court.procedures.hearing = false;
    const hearing = FB.justicePunishmentProjection(s, actor, other.id, 'restitution');
    const blocked = FB.justiceApplyPunishment(s, actor, other.id, 'restitution');
    const release = FB.justiceApplyPunishment(s, actor, other.id, 'release');
    return { arrest:arrest.blocker, options:options.map(function (p) { return p.sentence; }),
      ransom:options.filter(function (p) { return p.sentence === 'ransom'; })[0].blocker,
      pardon:options.filter(function (p) { return p.sentence === 'pardon'; })[0].blocker,
      unsupported:unsupported.blocker, lawful:quote.justified, imposed:imposed.ok, term:term,
      penance:penance.ok, piety:target.piety, prestige:target.prestige,
      hearing:hearing.blocker, hearingApplied:blocked.ok, release:release.ok,
      tradition:FB.justiceTradition(s, actor).id,
      religious:FB.justiceTradition(s, actor, 'religious').id,
      ledger:FBDATA.techImpactReviews.features.judicial_religious_courts.mode };
  });
  expect(result).toEqual({ arrest:'procedure', options:['release','pardon','ransom','restitution','detention','atonement'],
    ransom:'procedure', pardon:'procedure', unsupported:'case', lawful:true, imposed:true, term:180,
    penance:true, piety:90, prestige:95, hearing:'procedure', hearingApplied:false, release:true,
    tradition:'test_court', religious:'latin', ledger:'none' });
});

test('AI justice uses the same custom preferences and cause rules as the player', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '1066'); await installTestCourt(page);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = Object.keys(s.realms).sort().filter(function (id) {
      return id !== 'player' && s.realms[id].alive && FB.realmRank.isTerritorial(s.realms[id], s);
    })[0];
    FB.authoritySetGovernment(s, rid, 'test_court');
    const actor = FB.materializeRealmRuler(s, rid), target = window.legalTarget(); actor.traits = [];
    const offense = FB.justiceRecordOffense(s, actor.id, target.id, 'blackmail', 'redhanded', true, actor.id);
    FB.captureIntrigue(s, actor.id, target.id, 'judicial', rid);
    const quote = FB.justicePunishmentProjection(s, actor.id, target.id, 'detention', offense.id);
    FB.justiceSeason(s);
    const custody = FB.justiceCustodyOf(s, target.id);
    return { quoted:quote.justified, sentence:s.justice.last.sentence, lawful:s.justice.last.justified,
      term:custody.endTurn - custody.captureTurn, closed:offense.closed };
  });
  expect(result).toEqual({ quoted:true, sentence:'detention', lawful:true, term:180, closed:true });
});

test('religious court scope survives save restoration while a government override remains secular', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '867'); await installTestCourt(page);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const actor = s.player.charId, target = window.legalTarget();
    const offense = FB.justiceRecordOffense(s, actor, target.id, 'abduction', 'material', true, actor);
    const chance = FB.chance;
    let arrest;
    try { FB.chance = function () { return true; }; arrest = FB.justiceAttemptArrest(s, actor, target.id, offense.id, 'religious'); }
    finally { FB.chance = chance; }
    const before = FB.justicePunishmentProjection(s, actor, target.id, 'imprisonment', offense.id);
    FB.save.restore(FB.save.parseExport(FB.save.exportState())); s = FB.state;
    const after = FB.justicePunishmentProjection(s, actor, target.id, 'imprisonment', offense.id);
    const imposed = FB.justiceApplyPunishment(s, actor, target.id, 'imprisonment', offense.id);
    return { captured:arrest.captured, before:before.traditionId, after:after.traditionId,
      scope:FB.justiceCustodyOf(s, target.id).courtKind, imposed:imposed.ok };
  });
  expect(result).toEqual({ captured:true, before:'latin', after:'latin', scope:'religious', imposed:true });
});

test('custom labels use the shared review flow and lexicon without sentencing on Back', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '867'); await installTestCourt(page);
  await page.evaluate(function () {
    const s = FB.state, target = window.legalTarget();
    FB.captureIntrigue(s, s.player.charId, target.id, 'judicial', 'player');
    FB.mods.apply({ lexicons:{ governments:{ test_court:{ labels:{
      justiceSentence:{ restitution:{ name:'Court compensation' } }, legalTradition:{ test_court:{ name:'Civic justice' } }
    } } } } });
    FB.ui.showJusticeCharacter(target.id);
  });
  await page.locator('[data-justice-sentence="restitution"]').click();
  await expect(page.locator('#gm-title')).toHaveText('Review judgment');
  await expect(page.locator('#gm-body')).toContainText('Court compensation');
  await expect(page.locator('#gm-body')).toContainText('Civic justice');
  await page.locator('#justice-cancel').click();
  await expect(page.locator('[data-justice-sentence="restitution"]')).toBeFocused();
  expect(await page.evaluate(function () { return !FB.state.justice || !FB.state.justice.last; })).toBe(true);
});

for (const scenario of [
  { sentence:'detention', name:'Detention', term:180, served:30, remaining:150 },
  { sentence:'imprisonment', name:'Imprisonment', term:540, served:75, remaining:465 },
  { sentence:'detention', name:'Detention', term:180, served:120, existing:15, remaining:195 }
]) {
  test('prisoner hearing projects ' + scenario.sentence + (scenario.existing ? ' extensions' : ' authored terms'), async function ({ page }, testInfo) {
    await startCourt(page, testInfo, '867'); await installTestCourt(page);
    const result = await page.evaluate(function (scenario) {
      let s = FB.state;
      const rid = Object.keys(s.realms).sort().filter(function (id) {
        return id !== 'player' && s.realms[id].alive && FB.realmRank.isTerritorial(s.realms[id], s);
      })[0];
      FB.authoritySetGovernment(s, rid, scenario.sentence === 'detention' ? 'test_court' : 'territorial');
      const actor = FB.materializeRealmRuler(s, rid);
      actor.culture = 'frankish'; actor.religion = 'catholic';
      FBDATA.justiceSentences[scenario.sentence].termDays = scenario.term;
      const target = s.player.charId;
      s.turn += scenario.served;
      const offense = FB.justiceRecordOffense(s, actor.id, target, 'assassination', 'redhanded', true, actor.id);
      const row = FB.captureIntrigue(s, actor.id, target, 'judicial', rid);
      row.captureTurn = s.turn - scenario.served;
      if (scenario.existing) { row.sentenced = true; row.endTurn = s.turn + scenario.existing; }
      const queued = FB.justiceApplyPunishment(s, actor.id, target, scenario.sentence, offense.id);
      // Legacy contexts need only the pending response identity, even after reload.
      const ctx = { justiceId:s.justice.pending.id, studentId:actor.id };
      FB.save.restore(FB.save.parseExport(FB.save.exportState())); s = FB.state;
      const ev = FB.eventById('justice_hearing'), before = JSON.stringify(s), rng = FB.getRngState();
      const text = FB.eventText(s, target, ev, 'text', ctx);
      const semantic = FB.textParams(s, target, ev.text, ctx, true);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      // A definition change after queueing must agree with the committing projection.
      FBDATA.justiceSentences[scenario.sentence].termDays = scenario.term + 30;
      const updated = FB.eventText(s, target, ev, 'text', ctx);
      const applied = FB.fns.justice_submit(s, ctx);
      return { queued:queued.pending, text:text, updated:updated, pure:pure,
        label:semantic.sentenceName, applied:applied,
        remaining:FB.justiceCustodyOf(s, target).endTurn - s.turn };
    }, scenario);
    expect(result.queued).toBe(true);
    expect(result.text).toContain('The proposed sentence is ' + scenario.name);
    expect(result.text).toContain(scenario.existing ? 'add ' + scenario.term + ' days' : scenario.term + '-day prison term');
    expect(result.text).toContain('Release is due in ' + scenario.remaining + ' days.');
    expect(result.text).not.toContain('a year in prison');
    expect(result.updated).toContain('Release is due in ' + (scenario.remaining + 30) + ' days.');
    expect(result).toMatchObject({ pure:true, applied:true, remaining:scenario.remaining + 30,
      label:{ $data:'justiceSentence', id:scenario.sentence, path:'name' } });
  });
}

test('custom prisoner hearings display sentence labels, payment and penance costs', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '867'); await installTestCourt(page);
  const rows = await page.evaluate(function () {
    const s = FB.state, rid = Object.keys(s.realms).sort().filter(function (id) {
      return id !== 'player' && s.realms[id].alive && FB.realmRank.isTerritorial(s.realms[id], s);
    })[0];
    FB.authoritySetGovernment(s, rid, 'test_court');
    const actor = FB.materializeRealmRuler(s, rid), target = s.player.charId;
    const ev = FB.eventById('justice_hearing');
    return ['restitution','atonement'].map(function (sentence) {
      FB.captureIntrigue(s, actor.id, target, 'judicial', rid);
      s.player.gold = 7;
      s.player.piety = 100; s.player.prestige = 100;
      const piety = s.player.piety, prestige = s.player.prestige;
      FB.justiceApplyPunishment(s, actor.id, target, sentence);
      const ctx = s.eventQueue.filter(function (item) { return item.id === 'justice_hearing'; }).slice(-1)[0].ctx;
      const quote = FB.justicePunishmentProjection(s, actor.id, target, sentence);
      const text = FB.eventText(s, target, ev, 'text', ctx);
      const applied = FB.fns.justice_submit(s, ctx);
      return { sentence:sentence, text:text, amount:FB.money(quote.amount), applied:applied,
        gold:s.player.gold, pietyLoss:piety - s.player.piety, prestigeLoss:prestige - s.player.prestige,
        released:!FB.justiceCustodyOf(s, target) };
    });
  });
  expect(rows[0].text).toContain('The proposed sentence is Restitution: pay ' + rows[0].amount + ' and be released.');
  expect(rows[0]).toMatchObject({ applied:true, gold:0, released:true });
  expect(rows[1].text).toContain('The proposed sentence is Atonement: lose 10 piety and 5 prestige, then be released.');
  expect(rows[1]).toMatchObject({ applied:true, released:true, pietyLoss:10, prestigeLoss:5 });
});

test('restricted prisoner hearings announce the normalized custody sentence', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '867');
  const result = await page.evaluate(function () {
    const s = FB.state, rid = Object.keys(s.realms).sort().filter(function (id) {
      return id !== 'player' && s.realms[id].alive && FB.realmRank.isTerritorial(s.realms[id], s);
    })[0];
    FB.authoritySetGovernment(s, rid, 'territorial');
    const actor = FB.materializeRealmRuler(s, rid), target = s.player.charId;
    actor.culture = 'frankish'; actor.religion = 'catholic';
    FB.captureIntrigue(s, actor.id, target, 'judicial', rid);
    const original = FB.platform.isCrazyGames;
    try {
      FB.platform.isCrazyGames = true;
      FB.justiceApplyPunishment(s, actor.id, target, 'execution');
      const ctx = s.eventQueue.filter(function (item) { return item.id === 'justice_hearing'; })[0].ctx;
      return { sentence:s.justice.pending.sentence,
        text:FB.eventText(s, target, FB.eventById('justice_hearing'), 'text', ctx) };
    } finally { FB.platform.isCrazyGames = original; }
  });
  expect(result.sentence).toBe('imprisonment');
  expect(result.text).toContain('The proposed sentence is Imprisonment: a 360-day prison term');
  expect(result.text).not.toContain('death');
});

test('legal mod validation rejects bad references atomically', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '867');
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA.legalTraditions), errors = [];
    [
      { justiceSentences:{ bad:{ name:'Bad', desc:'Invalid kind.', kind:'unknown', level:1, penalty:0 } } },
      { governmentForms:{ bad:Object.assign({}, FBDATA.governmentForms.territorial, { legalTradition:'missing' }) } },
      { legalTraditions:{ bad:Object.assign({}, FBDATA.legalTraditions.latin, { sentences:['missing'] }) } },
      { religions:{ bad:{ name:'Bad faith', properties:{ legalTradition:'missing' } } } }
    ].forEach(function (mod) { try { FB.mods.apply(mod); errors.push(false); } catch (e) { errors.push(true); } });
    return { errors:errors, unchanged:before === JSON.stringify(FBDATA.legalTraditions),
      defaults:FB.validateLegalTraditions(), faiths:FB.validateReligionData(FB.state) };
  });
  expect(result).toEqual({ errors:[true,true,true,true], unchanged:true, defaults:[], faiths:[] });
});

test('CrazyGames restrictions follow sentence kinds even for renamed mod sentences', async function ({ page }, testInfo) {
  await startCourt(page, testInfo, '867');
  const result = await page.evaluate(function () {
    const s = FB.state, actor = s.player.charId, target = window.legalTarget();
    const form = Object.assign({}, FBDATA.governmentForms.territorial, { legalTradition:'restricted_test' });
    FB.mods.apply({ governmentForms:{ restricted_test:form },
      justiceSentences:{ capital:{ name:'Capital judgment', desc:'A death sentence.', kind:'death', level:3, penalty:60 } },
      legalTraditions:{ restricted_test:Object.assign({}, FBDATA.legalTraditions.latin, {
        sentences:['release','imprisonment','capital'],
        ai:{ minor:['imprisonment'], serious:['imprisonment'], severe:['capital'], arbitrary:['imprisonment'], excessive:['capital'] }
      }) } });
    FB.authoritySetGovernment(s, 'player', 'restricted_test');
    FB.captureIntrigue(s, actor, target.id, 'judicial', 'player');
    const ordinary = FB.justicePunishmentProjection(s, actor, target.id, 'capital').sentence;
    const original = FB.platform.isCrazyGames;
    let restricted, applied, offered;
    try {
      FB.platform.isCrazyGames = true;
      restricted = FB.justicePunishmentProjection(s, actor, target.id, 'capital').sentence;
      offered = FB.justiceSentenceOptions(s, actor, target.id).map(function (p) { return p.sentence; });
      applied = FB.justiceApplyPunishment(s, actor, target.id, 'capital').ok;
    } finally { FB.platform.isCrazyGames = original; }
    return { ordinary:ordinary, restricted:restricted, offered:offered, applied:applied, alive:!target.dead };
  });
  expect(result).toEqual({ ordinary:'capital', restricted:'imprisonment', offered:['release','imprisonment'], applied:true, alive:true });
});
