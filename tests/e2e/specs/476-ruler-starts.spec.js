'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/starts.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/eras.js', 'data/technology.js',
  'data/political_institutions.js', 'data/story_campaigns.js',
  'js/starts.js', 'js/stories.js', 'js/story_western_court_476.js',
  'js/story_476_rails.js', 'js/story_campaign.js', 'js/story_nepos_track_476.js',
  'js/main.js', 'js/world.js', 'js/model.js', 'js/armies.js', 'js/wars.js',
  'js/authority.js', 'js/federates.js', 'js/institutions.js', 'js/treasury.js',
  'js/station.js', 'js/governments.js', 'js/technology.js', 'js/logistics.js',
  'js/mods.js', 'js/save.js', 'js/save_v4.js', 'js/ui_panels.js',
  'js/modifiers.js', 'js/events.js', 'js/bookmark_setup.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { injectBrowserHarness } = require('../support/game/browser-harness');

const STARTS = [
  { id:'nepos_476', realm:'croatia', province:'split', name:'Julius_Nepos', age:46,
    worldField:'neposId', form:'roman_civic', tier:6, track:'nepos_track_476' },
  { id:'odoacer_476', realm:'federates_476', province:'pavia', name:'Odoacer', age:43,
    worldField:'odoacerId', form:'federate_polity', tier:4 },
  { id:'syagrius_476', realm:'west_francia', province:'laon', name:'Syagrius', age:46,
    worldField:'syagriusId', form:'roman_civic', tier:6 }
];
async function fullStart(page) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
}
async function start(page, testInfo, def) {
  await openGame(page, testInfo);
  // Owner review enables only this candidate in this fresh browser context.
  await page.evaluate(function (id) {
    FBDATA.startScenarios.find(function (sc) { return sc.id === id; }).hidden = false;
  }, def.id);
  await fullStart(page);
  await page.locator('#ng-seed').fill('RULERS-476-' + def.id + '-' + def.province + '-m-' + def.name);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue(def.name.replace(/_/g, ' '));
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('#cg-reroll')).toBeDisabled();
  await expect(page.locator('#cg-community')).toHaveClass(/hidden/);
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
}

async function winRavenna(page) {
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'western_court_476', w = s.stories[id];
    const launched = FB.stories.apply(s, id, 'contest_ravenna', FB.stories.quote(s, id, 'contest_ravenna'));
    const noAward = s.owner.ravenna === 'italy';
    // Stage the ordinary campaign award boundary, without simulating a siege.
    FB.transferProvince(s, 'ravenna', 'player');
    FB.settleOrdinaryWar(s, w.aiWarId, 'victory');
    FB.stories.day(s);
    return { launched:launched, noAward:noAward, phase:w.aiResolution };
  });
  expect(result).toEqual({ launched:true, noAward:true, phase:'won' });
}

test('unreviewed ruler starts reject start codes and direct creation', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const hidden = await page.evaluate(function () {
    return FBDATA.startScenarios.filter(function (sc) { return sc.rulerRealmId; })
      .every(function (sc) { return sc.hidden && sc.alwaysUnlocked; });
  });
  expect(hidden).toBe(true);
  await fullStart(page);
  await page.locator('#ng-seed').fill('RULERS-476-nepos_476-split-m-Julius_Nepos');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  const result = await page.evaluate(function () {
    FB.activateBookmark('476');
    FB.game.pending = { scenario:FBDATA.startScenarios.find(function (sc) { return sc.id === 'nepos_476'; }),
      seed:'RULERS', bookmarkId:'476', provinceId:'split' };
    return FB.game.start();
  });
  expect(result).toBe(false);
  await expect(page.getByRole('button', { name:'Julius Nepos at Salona' })).toHaveCount(0);
  await expect(page.getByRole('button', { name:'Odoacer and the federate host' })).toHaveCount(0);
  await expect(page.getByRole('button', { name:'Syagrius at Soissons' })).toHaveCount(0);
});

for (const def of STARTS) {
  test(def.id + ' keeps the authored actor, family, government, realm and save identity', async function ({ page }, testInfo) {
    await start(page, testInfo, def);
    const result = await page.evaluate(function (def) {
      const s = FB.state, p = s.player, me = s.chars[p.charId], w = s.stories.western_court_476;
      const baseline = FB.bookmark('476').provinces.filter(function (row) { return row.realm === def.realm; })
        .map(function (row) { return row.id; }).sort();
      const family = [me.spouseId].concat(me.childrenIds).filter(Boolean);
      const owned = Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort();
      const original = JSON.stringify(FBDATA.storyCampaigns);
      const facts = { sameActor:p.charId === w[def.worldField], age:FB.ageOf(me, s.date.year),
        name:me.name, owner:JSON.stringify(owned) === JSON.stringify(baseline),
        held:JSON.stringify(p.provs.slice().sort()) === JSON.stringify(baseline),
        noDuplicate:!s.realms[def.realm], tier:p.tier, noAiFamily:!s.realms.player.succession &&
          family.concat([me.id]).every(function (id) { return !s.chars[id].royalLine; }),
        form:FB.political.government(s, { kind:'realm', id:'player' }).formId,
        noSoldierTrack:!s.stories.federate_track_476,
        track:!!s.stories.nepos_track_476,
        host:def.id !== 'odoacer_476' || s.armies.some(function (a) {
          return a.id === 'host_476_federates' && a.realm === 'player' && a.men === 120 &&
            FB.playerControlsHost(s, a) && FB.scenarioHostStanding(s, a);
        }), identity:s.start.rulerRealmId, seed:s.seed };
      const saved = JSON.parse(FB.save.serialize()), snapshot = saved.state;
      const savedMe = snapshot.chars[snapshot.player.charId];
      facts.before = [snapshot.owner,snapshot.holder,snapshot.authority,snapshot.armies,
        snapshot.stories,savedMe.childrenIds,savedMe.spouseId];
      FB.save.restore(saved);
      const after = FB.state, restored = after.chars[after.player.charId];
      facts.after = [after.owner,after.holder,after.authority,after.armies,
        after.stories,restored.childrenIds,restored.spouseId];
      facts.definitions = original === JSON.stringify(FBDATA.storyCampaigns);
      return facts;
    }, def);
    expect(result).toMatchObject({ sameActor:true, age:def.age, name:def.name.replace(/_/g, ' '),
      owner:true, held:true, noDuplicate:true, noAiFamily:true, form:def.form, tier:def.tier,
      noSoldierTrack:true, track:!!def.track, host:true, identity:def.realm, definitions:true });
    expect(result.after).toEqual(result.before);
    expect(result.seed).toContain('-' + def.id + '-');
  });

  test(def.id + ' advances ten calendar years in the isolated world-ordering journey', async function ({ page }, testInfo) {
    test.setTimeout(180000);
    await start(page, testInfo, def);
    await page.evaluate(function (def) {
      const s = FB.state;
      if (def.track) {
        const q = FB.stories.quote(s, def.track, 'keep_dalmatia');
        if (!FB.stories.apply(s, def.track, 'keep_dalmatia', q)) throw new Error('Opening failed');
      } else if (def.id === 'odoacer_476') {
        const q = FB.stories.quote(s, 'western_court_476', 'keep_host');
        if (!FB.stories.apply(s, 'western_court_476', 'keep_host', q)) throw new Error('Opening failed');
      }
      // Remove stochastic mortality/event interruptions from this bounded
      // world-ordering journey; other specs own those personal effects.
      FB.pickDailyEvents = function () { return []; };
      FB.game.die = function () {};
      FB.ui.runEvents = function (events, done) { if (typeof done === 'function') done(); };
      FB.ui.eventsBusy = function () { return false; };
      FB.game.paused = true;
      FB.game.uiPrefs.hideBeginnerHints = true;
      s.player.flags.tutorial_done = 1;
    }, def);
    for (let year = 0; year < 10; year++) {
      await page.evaluate(function () {
        for (let day = 0; day < 360; day++) {
          FB.state.eventQueue = [];
          FB.game.passDay({ deferUi:true });
        }
      });
    }
    const result = await page.evaluate(function () {
      const s = FB.state;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return { year:FB.state.date.year, identity:FB.state.start.rulerRealmId,
        valid:FB.save.v4.validatePlatform(FB.state) && FB.save.v4.validateAuthority(FB.state.authority, FB.state),
        finite:Number.isFinite(s.player.gold), noDuplicate:!s.realms[s.start.rulerRealmId] };
    });
    expect(result).toMatchObject({ year:486, identity:def.realm, valid:true, finite:true, noDuplicate:true });
  });

  test(def.id + ' retains ordinary household play and succession over ten years', async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served', 'Run each bounded household journey once; smoke covers every browser project.');
    test.setTimeout(10 * 60 * 1000);
    await start(page, testInfo, def);
    await injectBrowserHarness(page);
    await page.evaluate(function (def) {
      const s = FB.state;
      if (def.track) {
        if (!FB.stories.apply(s, def.track, 'keep_dalmatia', FB.stories.quote(s, def.track, 'keep_dalmatia')))
          throw new Error('Opening failed');
      } else if (def.id === 'odoacer_476') {
        if (!FB.stories.apply(s, 'western_court_476', 'keep_host', FB.stories.quote(s, 'western_court_476', 'keep_host')))
          throw new Error('Opening failed');
      }
      FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
      FB.game.uiPrefs.hideBeginnerHints = true; FB.ui.coachmarkReset();
      delete s.player.flags.tutorial;
      FB.game.auto.all = true; FB.game.auto.style = 'first';
    }, def);
    for (let quarter = 0; quarter < 40; quarter++) {
      const result = await page.evaluate(function () {
        const target = FB.state.turn + 90;
        for (let attempts = 0; attempts < 120 && FB.state.turn < target; attempts++) {
          if (FB.state.player.dead) {
            const heirs = FB.heirsOf(FB.state);
            if (!heirs.length) throw new Error('The natural ruler-start dynasty ended before its review boundary.');
            FB.ui.closeModal(); FB.game.succeedTo(heirs[0].id); FB.ui.closeModal();
            FB.game.auto.all = true;
          }
          FB.game.passDay({ deferUi:true });
        }
        return { remaining:target - FB.state.turn, errors:FBTEST.checkInvariants() };
      });
      expect(result).toEqual({ remaining:0, errors:[] });
      if (quarter === 19) await page.evaluate(function () { FB.save.restore(JSON.parse(FB.save.serialize())); });
    }
    const end = await page.evaluate(function () {
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { year:FB.state.date.year, turn:FB.state.turn, ordinary:!FB.game.observe,
        identity:FB.state.start.rulerRealmId, errors:FBTEST.checkInvariants(),
        valid:FB.save.v4.validatePlatform(FB.state) };
    });
    expect(end).toEqual({ year:486, turn:3600, ordinary:true, identity:def.realm, errors:[], valid:true });
  });
}

test('Odoacer choices, stale review, standing host and contract consent stay player-controlled', async function ({ page }, testInfo) {
  await start(page, testInfo, STARTS[1]);
  const result = await page.evaluate(function () {
    let s = FB.state, w = s.stories.western_court_476;
    const owners = JSON.stringify(s.owner), contracts = s.authority.contracts.length;
    s.turn = 120; FB.stories.day(s); FB.armyTick(s);
    const deferred = !w.aiResolution && contracts === s.authority.contracts.length && !w.aiWarId;
    const survived = s.armies.some(function (a) { return a.id === 'host_476_federates' && a.realm === 'player'; });
    const q = FB.stories.quote(s, 'western_court_476', 'keep_host');
    s.realms.italy.treasury.gold++;
    const stale = !FB.stories.apply(s, 'western_court_476', 'keep_host', q);
    const declined = FB.stories.apply(s, 'western_court_476', 'keep_host',
      FB.stories.quote(s, 'western_court_476', 'keep_host'));
    const offer = FB.authorityOfferContract(s, { patronRealmId:'italy', federateRealmId:'player',
      hostId:'host_476_federates', payPerSeason:1, endTurn:300 });
    FB.authorityConsentContract(s, offer.id, 'italy');
    FB.federateContractSeason(s);
    const aiDeferred = !FB.political.contract(s, offer.id).effective;
    FB.authorityConsentContract(s, offer.id, 'player');
    const accepted = FB.political.contract(s, offer.id).effective;
    const before = JSON.stringify(s.stories);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return { deferred:deferred, survived:survived, stale:stale, declined:declined,
      aiDeferred:aiDeferred, accepted:accepted, durable:before === JSON.stringify(s.stories),
      owners:owners === JSON.stringify(s.owner) };
  });
  expect(result).toEqual({ deferred:true, survived:true, stale:true, declined:true,
    aiDeferred:true, accepted:true, durable:true, owners:true });
});

test('visible ruler codes reject changes to bookmark, named actor, family, site and community', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await page.evaluate(function () {
    FBDATA.startScenarios.find(function (sc) { return sc.id === 'odoacer_476'; }).hidden = false;
  });
  await fullStart(page);
  const codes = [
    'RULERS-867-odoacer_476-pavia-m-Odoacer',
    'RULERS-476-odoacer_476-ravenna-m-Odoacer',
    'RULERS-476-odoacer_476-pavia-m-Marcus',
    'RULERS-476-odoacer_476-pavia-f-Odoacer',
    'RULERS-476-odoacer_476-pavia-m-Odoacer-established',
    'RULERS-476-odoacer_476-pavia-m-Odoacer-standard-1',
    'RULERS-476-odoacer_476-pavia-m-Odoacer-standard-0-roman.nicene'
  ];
  for (const code of codes) {
    await page.locator('#ng-seed').fill(code);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  }
});

test('ruler scenario mod fields validate atomically and preserve the source court rank', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const def = FBDATA.startScenarios.find(function (sc) { return sc.id === 'odoacer_476'; });
    const before = JSON.stringify(FBDATA.startScenarios);
    const cases = [ { hidden:'yes' }, { characterName:'Someone Else' },
      { rulerRealmId:'missing' }, { governmentForm:'feudal' },
      { onboarding:'commoner' }, { tier:6 }, { familyPresets:{ established:{} } } ];
    const rejected = cases.map(function (changes) {
      let failed = false;
      try { FB.mods.apply({ startScenarios:[Object.assign({}, def, changes)] }); }
      catch (_) { failed = true; }
      return failed && before === JSON.stringify(FBDATA.startScenarios);
    });
    FB.mods.apply({ startScenarios:[Object.assign({}, def, { hidden:false })] });
    return { rejected:rejected, accepted:FBDATA.startScenarios.find(function (sc) {
      return sc.id === 'odoacer_476';
    }).hidden === false, technology:FB.validateTechnologyData() };
  });
  expect(result).toEqual({ rejected:[true,true,true,true,true,true,true], accepted:true, technology:[] });
});

test('Odoacer explicitly accepts paid service without receiving Ravenna or an imperial mandate', async function ({ page }, testInfo) {
  await start(page, testInfo, STARTS[1]);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'western_court_476', w = s.stories[id];
    const owned = JSON.stringify(s.owner), purse = s.player.gold;
    const q = FB.stories.quote(s, id, 'accept_service');
    const accepted = FB.stories.apply(s, id, 'accept_service', q);
    const deal = FB.political.contract(s, w.contractId);
    return { allowed:q.allowed, accepted:accepted, phase:w.aiResolution,
      effective:deal && deal.effective, pay:deal && deal.payPerSeason,
      landUnchanged:owned === JSON.stringify(s.owner), arrears:s.player.gold - purse,
      office:FB.political.offices(s, { kind:'character', id:s.player.charId })
        .some(function (row) { return row.ref.officeId === 'imperial_office'; }),
      replay:FB.stories.apply(s, id, 'accept_service', q) };
  });
  expect(result).toEqual({ allowed:true, accepted:true, phase:'negotiated', effective:true,
    pay:10, landUnchanged:true, arrears:30, office:false, replay:false });
});

for (const choice of ['accept_civic_rule','retain_host_rule']) {
  test('Odoacer reviews government after actually winning Ravenna: ' + choice, async function ({ page }, testInfo) {
    await start(page, testInfo, STARTS[1]);
    const result = await page.evaluate(function (choice) {
      let s = FB.state;
      const id = 'western_court_476', w = s.stories[id];
      const noSettlement = FB.stories.choices(s, id).every(function (row) { return row.id !== choice; });
      const launched = FB.stories.apply(s, id, 'contest_ravenna', FB.stories.quote(s, id, 'contest_ravenna'));
      const noAward = s.owner.ravenna === 'italy';
      FB.transferProvince(s, 'ravenna', 'player');
      FB.settleOrdinaryWar(s, w.aiWarId, 'victory');
      FB.stories.day(s);
      if (choice === 'accept_civic_rule') {
        const subject = { kind:'realm', id:'player' };
        if (!FB.localInstitutionMediate(s, 'rome_see', subject, 'ravenna') ||
            !FB.localInstitutionSettle(s, 'ravenna_council', subject,
              { courts:true, protection:true, tolerance:true })) throw new Error('Council agreement failed');
      }
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      const q = FB.stories.quote(s, id, choice);
      const accepted = FB.stories.apply(s, id, choice, q);
      const bytes = JSON.stringify(s.stories[id]);
      const counts = [s.authority.recognitions.length, s.authority.rights.length];
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      const replay = FB.stories.apply(s, id, choice, q);
      return { noSettlement:noSettlement, launched:launched, noAward:noAward, accepted:accepted,
        owner:s.owner.ravenna, phase:s.stories[id].aiResolution, government:s.stories[id].governanceResolved,
        durable:bytes === JSON.stringify(s.stories[id]), replay:replay,
        once:JSON.stringify(counts) === JSON.stringify([s.authority.recognitions.length, s.authority.rights.length]),
        form:FB.political.government(s, { kind:'realm', id:'player' }).formId };
    }, choice);
    expect(result).toEqual({ noSettlement:true, launched:true, noAward:true, accepted:true,
      owner:'player', phase:'won', government:choice === 'accept_civic_rule' ? 'civic' : 'federate',
      durable:true, replay:false, once:true,
      form:choice === 'accept_civic_rule' ? 'roman_civic' : 'federate_polity' });
  });
}

test('Odoacer cannot replace a missing, pending or refused council vote with goodwill', async function ({ page }, testInfo) {
  await start(page, testInfo, STARTS[1]);
  await winRavenna(page);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'western_court_476', subject = { kind:'realm', id:'player' };
    FB.setCountySupport(s, 'ravenna', 20);
    const mediated = !!FB.localInstitutionMediate(s, 'rome_see', subject, 'ravenna');
    function blockedWithoutMutation() {
      const bytes = JSON.stringify(s), rng = FB.getRngState();
      const q = FB.stories.quote(s, id, 'accept_civic_rule');
      const applied = FB.stories.apply(s, id, 'accept_civic_rule', q);
      return !q.allowed && !applied && bytes === JSON.stringify(s) && rng === FB.getRngState();
    }
    const missing = blockedWithoutMutation();
    const petition = FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'ravenna_council', subject, 'petition'));
    const pending = blockedWithoutMutation();
    const bargain = FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'ravenna_council', subject, 'bargain', {}));
    const unratified = blockedWithoutMutation();
    const vote = FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'ravenna_council', subject, 'ratify'));
    const refused = blockedWithoutMutation();
    return { mediated:mediated, goodwill:FB.political.civicConsent(s, 'ravenna').allowed,
      petition:petition.stage, bargain:bargain.stage, vote:vote.stage,
      missing:missing, pending:pending, unratified:unratified, refused:refused,
      retainAllowed:FB.stories.quote(s, id, 'retain_host_rule').allowed,
      government:FB.political.government(s, subject).formId };
  });
  expect(result).toEqual({ mediated:true, goodwill:true, petition:'petition', bargain:'bargain', vote:'refused',
    missing:true, pending:true, unratified:true, refused:true, retainAllowed:true, government:'federate_polity' });
});

for (const invalidation of ['expired','delegate_dead','incomplete_terms']) {
  test('Odoacer civic government rejects a council agreement that is ' + invalidation, async function ({ page }, testInfo) {
    await start(page, testInfo, STARTS[1]);
    await winRavenna(page);
    const result = await page.evaluate(function (invalidation) {
      const s = FB.state, id = 'western_court_476', w = s.stories[id], subject = { kind:'realm', id:'player' };
      FB.localInstitutionMediate(s, 'rome_see', subject, 'ravenna');
      const terms = invalidation === 'incomplete_terms' ? { courts:true, protection:true, provision:true } :
        { courts:true, protection:true, tolerance:true };
      const agreement = FB.localInstitutionSettle(s, 'ravenna_council', subject, terms);
      const reviewed = FB.stories.quote(s, id, 'accept_civic_rule');
      if (invalidation === 'expired') s.turn = agreement.expiresTurn;
      if (invalidation === 'delegate_dead') FB.killChar(s, s.chars[w.civicDelegateId]);
      const bytes = JSON.stringify(s), rng = FB.getRngState();
      const fresh = FB.stories.quote(s, id, 'accept_civic_rule');
      const applied = FB.stories.apply(s, id, 'accept_civic_rule', reviewed);
      return { ratified:agreement.stage, originallyAllowed:reviewed.allowed,
        blocked:!fresh.allowed, applied:applied,
        pure:bytes === JSON.stringify(s) && rng === FB.getRngState(),
        unresolved:!w.governanceResolved, government:FB.political.government(s, subject).formId };
    }, invalidation);
    expect(result).toEqual({ ratified:'ratified', originallyAllowed:invalidation !== 'incomplete_terms',
      blocked:true, applied:false, pure:true, unresolved:true, government:'federate_polity' });
  });
}

for (const stage of ['opening','campaign','civic']) {
  for (const transition of ['death','handover']) {
    test('Odoacer unfinished ' + stage + ' closes durably after ' + transition, async function ({ page }, testInfo) {
      await start(page, testInfo, STARTS[1]);
      const result = await page.evaluate(function (params) {
        let s = FB.state;
        const id = 'western_court_476', w = s.stories[id];
        let choice = 'contest_ravenna', reviewed = FB.stories.quote(s, id, choice);
        if (params.stage !== 'opening') FB.stories.apply(s, id, choice, reviewed);
        if (params.stage === 'civic') {
          FB.transferProvince(s, 'ravenna', 'player');
          FB.settleOrdinaryWar(s, w.aiWarId, 'victory');
          FB.stories.day(s);
          const subject = { kind:'realm', id:'player' };
          FB.localInstitutionMediate(s, 'rome_see', subject, 'ravenna');
          FB.localInstitutionSettle(s, 'ravenna_council', subject, { courts:true, protection:true, tolerance:true });
          choice = 'accept_civic_rule'; reviewed = FB.stories.quote(s, id, choice);
        }
        const heir = FB.heirsOf(s)[0];
        if (!heir) throw new Error('Authored court has no eligible successor');
        const owners = JSON.stringify(s.owner), warId = w.aiWarId, resolution = w.aiResolution;
        let atDeath = true;
        if (params.transition === 'death') {
          FB.game.die('Synthetic Odoacer death'); FB.ui.closeModal();
          FB.stories.day(s);
          atDeath = FB.stories.status(s, id).phase === 'interrupted';
        }
        const succeeded = FB.game.succeedTo(heir.id, { livingAbdication:params.transition === 'handover' });
        FB.stories.day(s);
        const outcomeTurn = w.rulerInterruptionTurn;
        const stale = FB.stories.apply(s, id, choice, reviewed);
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        s.turn++;
        FB.stories.day(s);
        const restored = s.stories[id];
        return { reviewed:reviewed.allowed, atDeath:atDeath, succeeded:succeeded,
          sameHeir:s.player.charId === heir.id, originalAlive:!s.chars[w.odoacerId].dead,
          phase:FB.stories.status(s, id).phase, choices:FB.stories.choices(s, id).length, stale:stale,
          durable:restored.rulerInterruptionTurn === outcomeTurn && Number.isInteger(outcomeTurn),
          resolutionPreserved:restored.aiResolution === resolution,
          warPreserved:restored.aiWarId === warId && (params.stage !== 'campaign' || !!FB.ordinaryWarById(s, warId)),
          host:s.armies.some(function (a) { return a.id === 'host_476_federates' && a.realm === 'player'; }),
          owners:owners === JSON.stringify(s.owner),
          government:FB.political.government(s, { kind:'realm', id:'player' }).formId };
      }, { stage:stage, transition:transition });
      expect(result).toEqual({ reviewed:true, atDeath:true, succeeded:true, sameHeir:true,
        originalAlive:transition === 'handover', phase:'interrupted', choices:0, stale:false,
        durable:true, resolutionPreserved:true, warPreserved:true, host:true, owners:true, government:'federate_polity' });
      if (stage === 'campaign') {
        const campaign = await page.evaluate(function () {
          let s = FB.state;
          const id = 'western_court_476', w = s.stories[id], outcomeTurn = w.rulerInterruptionTurn;
          FB.transferProvince(s, 'ravenna', 'player');
          FB.settleOrdinaryWar(s, w.aiWarId, 'victory');
          FB.stories.day(s);
          FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
          return { resolution:s.stories[id].aiResolution, phase:FB.stories.status(s, id).phase,
            outcomePreserved:s.stories[id].rulerInterruptionTurn === outcomeTurn,
            owner:s.owner.ravenna, capital:s.realms.player.capital,
            territorial:!s.realms.player.nonTerritorial, choices:FB.stories.choices(s, id).length };
        });
        expect(campaign).toEqual({ resolution:'won', phase:'interrupted', outcomePreserved:true,
          owner:'player', capital:'ravenna', territorial:true, choices:0 });
      }
    });
  }
}

for (const choice of ['accept_service','keep_host','retain_host_rule']) {
  test('Odoacer completed ' + choice + ' stays recorded after succession', async function ({ page }, testInfo) {
    await start(page, testInfo, STARTS[1]);
    if (choice === 'retain_host_rule') await winRavenna(page);
    const result = await page.evaluate(function (choice) {
      const s = FB.state, id = 'western_court_476', w = s.stories[id];
      const accepted = FB.stories.apply(s, id, choice, FB.stories.quote(s, id, choice));
      const heir = FB.heirsOf(s)[0], resolution = w.aiResolution, governance = w.governanceResolved;
      FB.game.die('Synthetic Odoacer death'); FB.ui.closeModal();
      FB.stories.day(s);
      const succeeded = FB.game.succeedTo(heir.id);
      FB.stories.day(s);
      return { accepted:accepted, succeeded:succeeded, interrupted:w.rulerInterruptionTurn !== undefined,
        recorded:w.aiResolution === resolution && w.governanceResolved === governance,
        contractPreserved:choice !== 'accept_service' || !!FB.political.contract(s, w.contractId),
        choices:FB.stories.choices(s, id).length };
    }, choice);
    expect(result).toEqual({ accepted:true, succeeded:true, interrupted:false, recorded:true, contractPreserved:true, choices:0 });
  });
}

test('malformed Odoacer interruption saves reject without replacing live state', async function ({ page }, testInfo) {
  await start(page, testInfo, STARTS[1]);
  const result = await page.evaluate(function () {
    const original = FB.state, rng = FB.getRngState(), saved = JSON.parse(FB.save.serialize());
    return [-1, 0.5, '0', saved.state.turn + 1, 'completed'].map(function (value) {
      const copy = JSON.parse(JSON.stringify(saved)), w = copy.state.stories.western_court_476;
      w.rulerInterruptionTurn = value === 'completed' ? copy.state.turn : value;
      if (value === 'completed') w.governanceResolved = 'federate';
      let rejected = false;
      try { FB.save.restore(copy); } catch (_) { rejected = true; }
      return rejected && FB.state === original && rng === FB.getRngState();
    });
  });
  expect(result).toEqual([true,true,true,true,true]);
});

for (const choice of ['face_campaign','leave_campaign']) {
  test('Syagrius reviews the Frankish opportunity: ' + choice, async function ({ page }, testInfo) {
    await start(page, testInfo, STARTS[2]);
    const result = await page.evaluate(function (choice) {
      const s = FB.state, w = s.stories.western_court_476, id = 'clovis_syagrius_476';
      FB.assignRealmRulerCharacter(s, 'franks_476', w.clovisId, { replaceAuthored:true });
      s.date.year = 486;
      const owner = s.owner.laon, rec = s.stories[id];
      FB.stories.get(id).day(s, rec);
      const deferred = rec.phase === 'pending' && !rec.warId;
      const choices = FB.stories.choices(s, id).map(function (row) { return row.id; });
      const q = FB.stories.quote(s, id, choice);
      const accepted = FB.stories.apply(s, id, choice, q);
      const war = FB.ordinaryWarById(s, rec.warId), bytes = JSON.stringify(rec);
      const replay = FB.stories.apply(s, id, choice, q);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { deferred:deferred, choices:choices, accepted:accepted, replay:replay,
        phase:rec.phase, defender:war && war.defender, noAward:owner === FB.state.owner.laon,
        durable:bytes === JSON.stringify(FB.state.stories[id]) };
    }, choice);
    expect(result).toMatchObject({ deferred:true, choices:['face_campaign','leave_campaign'],
      accepted:true, replay:false, phase:choice === 'face_campaign' ? 'started' : 'resolved',
      noAward:true, durable:true });
    if (choice === 'face_campaign') expect(result.defender).toBe('player');
  });
}

test('Nepos recognition and restoration observe actual ownership and survive saves without replay', async function ({ page }, testInfo) {
  await start(page, testInfo, STARTS[0]);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const id = 'nepos_track_476', t = s.stories[id], w = s.stories.western_court_476;
    const owners = JSON.stringify(s.owner), funds = s.player.gold;
    const original = FB.stories.quote(s, id, 'seek_recognition');
    const pure = owners === JSON.stringify(s.owner) && funds === s.player.gold;
    const claim = FB.stories.apply(s, id, 'seek_recognition', original);
    const noAward = owners === JSON.stringify(s.owner) && funds === s.player.gold;
    const claimOutcome = s.stories.western_office_476.result;
    const restorationBlocked = !FB.stories.quote(s, id, 'confirm_restoration').allowed;
    const launched = FB.stories.apply(s, id, 'restore_by_campaign',
      FB.stories.quote(s, id, 'restore_by_campaign'));
    const declared = FB.ordinaryWarById(s, t.warId);
    // Stage the ordinary campaign award boundary. Recognition is not the award.
    FB.transferProvince(s, 'ravenna', 'player');
    FB.settleOrdinaryWar(s, t.warId, 'victory');
    FB.stories.day(s);
    const q = FB.stories.quote(s, id, 'confirm_restoration');
    const restored = FB.stories.apply(s, id, 'confirm_restoration', q);
    const outcome = s.stories.western_office_476.result;
    const bytes = JSON.stringify(t), counts = [s.authority.appointments.length,s.authority.recognitions.length];
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    FB.stories.day(s);
    return { pure:pure, claim:claim, noAward:noAward, claimOutcome:claimOutcome,
      restorationBlocked:restorationBlocked, launched:launched, target:declared && declared.objectives[0].target,
      restored:restored, outcome:outcome, durable:bytes === JSON.stringify(s.stories[id]),
      once:JSON.stringify(counts) === JSON.stringify([s.authority.appointments.length,s.authority.recognitions.length]),
      claimant:w.neposId === s.player.charId, owner:s.owner.ravenna };
  });
  expect(result).toEqual({ pure:true, claim:true, noAward:true, claimOutcome:'nepos',
    restorationBlocked:true, launched:true, target:'ravenna', restored:true, outcome:'restored',
    durable:true, once:true, claimant:true, owner:'player' });
});

test('ruler onboarding uses the existing story review and rank sheet at phone width', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:844 });
  await start(page, testInfo, STARTS[0]);
  await page.evaluate(function () { FB.state.player.flags.tutorial = 1; FB.ui.refresh(); });
  await page.locator('[data-tab="actions"]').click();
  await expect(page.locator('#tutorial-guidance')).toHaveAttribute('data-tutorial-track', 'ruler_play');
  const card = page.locator('[data-story-card="nepos_track_476"]');
  await card.click();
  await page.locator('[data-story-choice="keep_dalmatia"]').click();
  await page.locator('#gm-story-confirm').click();
  await page.locator('#gm-story-continue').click();
  await expect(card).toBeFocused();
  await page.evaluate(function () { FB.ui.showRankDetails(); });
  const flags = await page.evaluate(function () {
    return { story:FB.state.player.flags.tut_ruler_story, rank:FB.state.player.flags.tut_ruler_governance };
  });
  expect(flags).toEqual({ story:1, rank:1 });
});

test('Nepos renews lapsed recognition and loses a restored mandate with Ravenna', async function ({ page }, testInfo) {
  await start(page, testInfo, STARTS[0]);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'nepos_track_476', t = s.stories[id], w = s.stories.western_court_476;
    FB.stories.apply(s, id, 'seek_recognition', FB.stories.quote(s, id, 'seek_recognition'));
    // Use an ordinary eastern succession boundary to invalidate the old issuer.
    FB.assignRealmRulerCharacter(s, 'byzantium', w.zenoId, { replaceAuthored:true });
    const lapsed = !FB.stories.quote(s, id, 'restore_by_campaign').allowed;
    const review = FB.stories.quote(s, id, 'seek_recognition');
    const wrongAction = FB.stories.apply(s, id, 'keep_dalmatia', review);
    const renewed = FB.stories.apply(s, id, 'seek_recognition', review);
    const campaignAllowed = FB.stories.quote(s, id, 'restore_by_campaign').allowed;
    FB.transferProvince(s, 'ravenna', 'player');
    const restored = FB.stories.apply(s, id, 'confirm_restoration', FB.stories.quote(s, id, 'confirm_restoration'));
    FB.transferProvince(s, 'ravenna', 'italy'); FB.story476.syncWestOffice(s);
    return { lapsed:lapsed, wrongAction:wrongAction, renewed:renewed,
      campaignAllowed:campaignAllowed, restored:restored,
      outcome:s.stories.western_office_476.result,
      removed:s.authority.appointments.find(function (row) { return row.id === t.officeId; }).status === 'removed' };
  });
  expect(result).toEqual({ lapsed:true, wrongAction:false, renewed:true, campaignAllowed:true,
    restored:true, outcome:'deposed', removed:true });
});

test('malformed ruler identity and track saves reject before adopting state', async function ({ page }, testInfo) {
  await start(page, testInfo, STARTS[0]);
  const result = await page.evaluate(function () {
    const original = FB.state, rng = FB.getRngState(), saved = JSON.parse(FB.save.serialize());
    return ['identity','onboarding','track','missing_track'].map(function (kind) {
      const copy = JSON.parse(JSON.stringify(saved));
      if (kind === 'identity') copy.state.start.rulerRealmId = 'west_francia';
      if (kind === 'onboarding') copy.state.start.onboarding = 'commoner';
      if (kind === 'track') copy.state.stories.nepos_track_476.phase = 'forever';
      if (kind === 'missing_track') delete copy.state.stories.nepos_track_476;
      let rejected = false;
      try { FB.save.restore(copy); } catch (_) { rejected = true; }
      return rejected && FB.state === original && rng === FB.getRngState();
    });
  });
  expect(result).toEqual([true,true,true,true]);
});
