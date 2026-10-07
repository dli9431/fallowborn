'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { installCourtProof } = require('../support/game/court-story-proof');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/story_courts_476.js','data/story_instances.js',
  'data/settlements.js','data/geographies.js',
  'js/stories.js','js/story_courts.js','js/story_track.js','js/bookmark_setup.js','js/starts.js',
  'js/authority.js','js/federates.js','js/institutions.js','js/lordships.js','js/treasury.js','js/world.js','js/model.js',
  'js/main.js','js/save.js','js/save_v4.js','js/messages.js','js/i18n.js']);

test('fictional court instances and all three track profiles play and restore from literal data', async function ({ page }, testInfo) {
  await installCourtProof(page);
  await beginBookmark(page, testInfo, 'proof_courts_900', 'proof_court_household');
  const result = await page.evaluate(function () {
    let s = FB.state;
    const w = s.stories.proof_court, restored = s.stories.proof_return;
    const order = FB.stories.attached(s), owners = JSON.stringify([s.owner,s.holder]);
    const rng = (FB.getRngState() >>> 0), before = JSON.stringify(s);
    const cards = FB.stories.cards(s), choices = FB.stories.choices(s, 'proof_service');
    const claimReview = FB.stories.quote(s, 'proof_claim', 'proof_keep_dalmatia');
    const issuer = FB.political.actor(s, { kind:'realm', id:'proof_issuer' });
    const pure = before === JSON.stringify(s) && rng === (FB.getRngState() >>> 0);
    function apply(story, id) { return FB.stories.apply(s, story, id, FB.stories.quote(s, story, id)); }
    const paths = [apply('proof_service','proof_refuse_involvement'),
      apply('proof_civic','proof_keep_household'), apply('proof_claim','proof_keep_dalmatia')];
    s.turn = 24;
    FB.stories.get('proof_return').day(s, restored);
    const returned = FB.realmRulerCharacterSnapshot(s, 'proof_issuer').id === w.proof_zenoId;
    const commanders = ['proof_commander_0','proof_commander_1'].every(function (field) {
      return s.chars[restored[field]].homeProvinceId === 'constantinople';
    });
    FB.transferProvince(s, 'paris', 'proof_north');
    FB.stories.get('proof_office').day(s, s.stories.proof_office);
    const displaced = s.stories.proof_office.result;
    FB.transferProvince(s, 'paris', 'proof_senior');
    FB.stories.get('proof_office').day(s, s.stories.proof_office);
    const records = JSON.stringify(s.stories), counts = [s.authority.appointments.length,s.authority.recognitions.length,s.armies.length];
    const saved = JSON.parse(FB.save.serialize()), savedRng = (FB.getRngState() >>> 0);
    FB.save.restore(saved); s = FB.state;
    FB.stories.get('proof_return').day(s, s.stories.proof_return);
    FB.stories.get('proof_office').day(s, s.stories.proof_office);
    return { order:order, paths:paths, pure:pure, returned:returned, commanders:commanders,
      displaced:displaced, restored:s.stories.proof_office.result,
      noAward:owners === JSON.stringify([s.owner,s.holder]),
      retained:records === JSON.stringify(s.stories), rng:savedRng === (FB.getRngState() >>> 0),
      replay:JSON.stringify(counts) === JSON.stringify([s.authority.appointments.length,s.authority.recognitions.length,s.armies.length]),
      cards:cards.map(function (row) { return row.id; }), choices:choices.map(function (row) { return row.id; }),
      claimReview:{ reason:claimReview.reason, issuerMatches:!!issuer && claimReview.facts.issuer === issuer.characterId,
        genericRole:Object.prototype.hasOwnProperty.call(claimReview.facts, 'issuer') &&
          !Object.prototype.hasOwnProperty.call(claimReview.facts, 'east') },
      results:[s.stories.proof_service.result,s.stories.proof_civic.result,s.stories.proof_claim.result] };
  });
  expect(result).toMatchObject({ order:['proof_court','proof_return','proof_office','proof_service','proof_civic','proof_claim'],
    paths:[true,true,true], pure:true, returned:true, commanders:true, displaced:'deposed', restored:'restored',
    noAward:true, retained:true, rng:true, replay:true,
    claimReview:{ reason:'claim_restoration',issuerMatches:true,genericRole:true },
    results:['declined','household','retained'] });
  expect(result.choices).toContain('proof_accept_delegate');
  expect(result.cards).toEqual(['proof_return','proof_office','proof_service','proof_civic','proof_claim']);
});

test('a fictional track negotiates its own declared payments and duration without awarding land', async function ({ page }, testInfo) {
  await installCourtProof(page);
  await beginBookmark(page, testInfo, 'proof_courts_900', 'proof_court_household');
  const result = await page.evaluate(function () {
    const s = FB.state, track = 'proof_service', t = s.stories[track];
    const before = JSON.stringify([s.owner,s.holder,s.settlementLordships]);
    const patronGold = FB.treasuryAvailable(s, 'proof_senior');
    function apply(id) { return FB.stories.apply(s, track, id, FB.stories.quote(s, track, id)); }
    const steps = [apply('proof_accept_delegate'),apply('proof_keep_serving'),apply('proof_offer_pay')];
    const contract = FB.political.contract(s, t.contractId);
    const declaration = FB.stories.get(track).declaration;
    const display = declaration.choices.offer_pay.detailParams;
    const result = { steps:steps, phase:t.phase, patronPayment:patronGold - FB.treasuryAvailable(s, 'proof_senior'),
      servicePayment:FB.treasuryAvailable(s, 'proof_north'),
      contract:contract && { pay:contract.payPerSeason, duration:contract.endTurn - contract.startTurn,
        patron:contract.patronRealmId, service:contract.federateRealmId },
      courtPay:FB.stories.get('proof_court').declaration.parameters.seasonalPay,
      display:display, noAward:before === JSON.stringify([s.owner,s.holder,s.settlementLordships]) };
    FB.authorityContractTransition(s, t.contractId, 'breach', 'proof_senior');
    FB.stories.get(track).day(s, t);
    result.recovery = t.phase;
    const saved = JSON.parse(FB.save.serialize()), record = JSON.stringify(t);
    FB.save.restore(saved);
    result.recoveryRetained = record === JSON.stringify(FB.state.stories[track]);
    return result;
  });
  expect(result).toEqual({ steps:[true,true,true], phase:'town_terms', patronPayment:12, servicePayment:12,
    contract:{ pay:6,duration:181,patron:'proof_senior',service:'proof_north' }, courtPay:4,
    display:{ immediate:12,seasonal:6,share:1,days:181 }, noAward:true, recovery:'renewal', recoveryRetained:true });
});

for (const variant of ['cost','window','culture','choice','stage','cast','actor','office','character','court_stage',
  'initial_stage','mechanic','next_stage','route','autonomous','unreachable','duplicate_choice','phase_stage','stage_transition']) {
  test('political declarations reject malformed ' + variant + ' without changing the campaign or RNG', async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function (variant) {
      const id = ['actor','office','character','court_stage'].indexOf(variant) >= 0 ? 'western_court_476' : 'federate_track_476';
      const d = FB.stories.get(id).declaration, old = JSON.parse(JSON.stringify(d));
      const rng = (FB.getRngState() >>> 0), uid = FB.getUidCounter(), state = FB.state;
      if (variant === 'cost') d.parameters.immediatePay = -1;
      if (variant === 'window') d.parameters.returnDeadline = 1;
      if (variant === 'culture') d.parameters.civicCultureId = 'missing_culture';
      if (variant === 'choice') d.choices.accept_delegate.operation = 'arbitrary_effect';
      if (variant === 'stage') d.stages.delegate.choices = ['missing_choice'];
      if (variant === 'cast') delete d.cast.recipient;
      if (variant === 'actor') d.opening.cast[0].ref.realmId = 'missing_realm';
      if (variant === 'office') d.opening.authority[3].officeId = 'missing_office';
      if (variant === 'character') d.opening.cast[5].character.station = 'courtier';
      if (variant === 'court_stage') delete d.stages.government;
      if (variant === 'initial_stage') d.initialStage = 'missing_stage';
      if (variant === 'mechanic') d.stages.delegate.mechanic = 'arbitrary_effect';
      if (variant === 'next_stage') d.choices.accept_delegate.nextStage = 'missing_stage';
      if (variant === 'route') d.choices.accept_delegate.nextStage = 'complete';
      if (variant === 'autonomous') delete d.phaseStages.aftermath;
      if (variant === 'unreachable') d.stages.isolated = { name:'Isolated', mechanic:'complete', choices:[] };
      if (variant === 'duplicate_choice') d.stages.delegate.choices.push('accept_delegate');
      if (variant === 'phase_stage') d.phaseStages.contract = ['contract'];
      if (variant === 'stage_transition') d.stages.civic.transitions = { contract:'' };
      const faults = FB.validateBookmark(FB.bookmark('476'));
      Object.keys(d).forEach(function (key) { delete d[key]; }); Object.assign(d, old);
      return { faults:faults, pure:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter() && state === FB.state };
    }, variant);
    expect(result.faults.length).toBeGreaterThan(0);
    expect(result.pure).toBe(true);
  });
}

test('476 records retain their ids and old schema, and invalid track records fail detached restore', async function ({ page }, testInfo) {
  await beginBookmark(page, testInfo, '476', 'federate_476');
  const result = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), state = FB.state;
    function facts(s) { return JSON.stringify([s.stories,s.owner,s.holder,s.authority,s.armies,s.bookmarkSetup]); }
    const before = facts(saved.state);
    const rng = (FB.getRngState() >>> 0), uid = FB.getUidCounter();
    FB.save.restore(saved);
    const retained = before === facts(JSON.parse(FB.save.serialize()).state);
    const live = FB.state;
    const invalidPhases = ['arbitrary_stage',['delegate'],null];
    const rejected = invalidPhases.every(function (phase) {
      const corrupt = JSON.parse(JSON.stringify(saved)); corrupt.state.stories.federate_track_476.phase = phase;
      try { FB.save.restore(corrupt); } catch (error) { return error.message.indexOf('state.stories.federate_track_476') >= 0; }
      return false;
    });
    return { retained:retained, rejected:rejected, detached:FB.state === live,
      rng:rng === (FB.getRngState() >>> 0), uid:uid === FB.getUidCounter(),
      ids:Object.keys(FB.state.stories), noReplay:FB.state.armies.length === saved.state.armies.length };
  });
  expect(result).toMatchObject({ retained:true,rejected:true,detached:true,rng:true,uid:true,noReplay:true });
  expect(result.ids).toContain('western_court_476');
  expect(result.ids).toContain('federate_track_476');
});

test('authored track branches, shortened stages and changed routes survive the shared lifecycle', async function ({ page }, testInfo) {
  await installCourtProof(page);
  await beginBookmark(page, testInfo, 'proof_courts_900', 'proof_court_household');
  const result = await page.evaluate(function () {
    let s = FB.state;
    const service = FB.stories.get('proof_service'), civic = FB.stories.get('proof_civic');
    const sizes = [Object.keys(service.declaration.stages).length, Object.keys(civic.declaration.stages).length,
      Object.keys(FB.stories.get('proof_claim').declaration.stages).length];
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const reviewed = FB.stories.quote(s, 'proof_service', 'proof_accept_delegate');
    const choice = service.declaration.choices.accept_delegate;
    choice.nextStage = 'orders';
    const stale = FB.stories.apply(s, 'proof_service', 'proof_accept_delegate', reviewed);
    const unchanged = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    choice.nextStage = 'commission_audience';
    function apply(story, id) { return FB.stories.apply(s, story, id, FB.stories.quote(s, story, id)); }
    const branch = apply('proof_service', 'proof_accept_delegate'), branchPhase = s.stories.proof_service.phase;
    const civicDone = apply('proof_civic', 'proof_keep_household'), claimDone = apply('proof_claim', 'proof_keep_dalmatia');
    const labels = [FB.stories.status(s, 'proof_service').name, FB.stories.status(s, 'proof_civic').name];
    const saved = JSON.parse(FB.save.serialize()), phases = JSON.stringify(s.stories), savedRng = FB.getRngState(), savedUid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const restored = phases === JSON.stringify(s.stories) && savedRng === FB.getRngState() && savedUid === FB.getUidCounter();
    const phasesBefore = [s.stories.proof_service.phase,s.stories.proof_civic.phase,s.stories.proof_claim.phase];
    const finished = apply('proof_service', 'proof_leave_dispute');
    s.turn = FB.stories.get('proof_court').declaration.parameters.pressureTurn;
    FB.stories.get('proof_court').day(s, s.stories.proof_court);
    const noPressure = !s.stories.proof_court.pressureNoted;
    // A civic-only household must release independent court bargaining even
    // when its completed stage id differs from the mechanic's spelling.
    delete s.stories.proof_service;
    s.turn = Math.max(s.turn, FB.stories.get('proof_court').declaration.parameters.settlementTurn);
    FB.stories.get('proof_court').day(s, s.stories.proof_court);
    const independent = !!s.stories.proof_court.aiResolution;
    const completedPhase = FB.storyCourts.trackPhase('proof_civic', s.stories.proof_civic);
    const corrupt = JSON.parse(JSON.stringify(saved)); corrupt.state.stories.proof_service.phase = 'commission';
    const live = FB.state;
    let rejected = false;
    try { FB.save.restore(corrupt); } catch (error) { rejected = error.message.includes('state.stories.proof_service'); }
    return { sizes:sizes, stale:stale, unchanged:unchanged, branch:branch, branchPhase:branchPhase,
      done:[civicDone,claimDone], phases:phasesBefore, labels:labels, restored:restored,
      completedPhase:completedPhase, finished:finished, noPressure:noPressure, independent:independent,
      rejected:rejected, detached:FB.state === live };
  });
  expect(result).toEqual({ sizes:[14,3,3], stale:false, unchanged:true, branch:true,
    branchPhase:'commission_audience', done:[true,true], phases:['commission_audience','private_house','domain_house'],
    labels:['A delegate receives orders','The private household continues'], restored:true,
    completedPhase:'complete', finished:true, noPressure:true, independent:true, rejected:true, detached:true });
});
