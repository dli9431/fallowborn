'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const { installCourtProof } = require('../support/game/court-story-proof');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/story_courts_476.js','data/story_instances.js',
  'data/settlements.js','data/geographies.js',
  'js/stories.js','js/story_courts.js','js/story_track.js','js/bookmark_setup.js','js/starts.js',
  'js/authority.js','js/federates.js','js/institutions.js','js/lordships.js','js/treasury.js','js/world.js','js/model.js',
  'js/main.js','js/save.js','js/save_v4.js','js/messages.js','js/i18n.js','js/mods.js','js/bookmark_sources.js',
  'js/ui_misc.js']);

async function beginCourtProof(page, testInfo) {
  await installCourtProof(page);
  await openGame(page, testInfo);
  await page.evaluate(function () { FB.mods.assertReady(); });
  await beginBookmarkFromTitle(page, 'proof_courts_900', 'proof_court_household');
}

test('fictional court instances and all three track profiles play and restore from literal data', async function ({ page }, testInfo) {
  await beginCourtProof(page, testInfo);
  expect(await page.evaluate(function () {
    FB.mods.assertReady();
    const mod = JSON.parse(JSON.parse(localStorage.getItem('fb_mods'))[0]);
    return { faults:FB.mods.validate(mod), signed:FB.mods.sig() !== '',
      stories:Object.keys(mod.storyInstances) };
  })).toEqual({ faults:[], signed:true,
    stories:Object.keys(require('../fixtures/bookmarks/court-proof.json').storyInstances) });
  const result = await page.evaluate(function () {
    let s = FB.state;
    const w = s.stories.proof_court, restored = s.stories.proof_return;
    function borders() {
      return JSON.stringify([s.owner,s.holder].map(function (rows) {
        return Object.keys(rows).sort().map(function (id) { return [id,rows[id]]; });
      }));
    }
    const order = FB.stories.attached(s), owners = borders();
    const rng = (FB.getRngState() >>> 0), before = JSON.stringify(s);
    const cards = FB.stories.cards(s), choices = FB.stories.choices(s, 'proof_service');
    const claimReview = FB.stories.quote(s, 'proof_claim', 'proof_keep_dalmatia');
    const issuer = FB.political.actor(s, { kind:'realm', id:'proof_issuer' });
    const pure = before === JSON.stringify(s) && rng === (FB.getRngState() >>> 0);
    function apply(story, id) { return FB.stories.apply(s, story, id, FB.stories.quote(s, story, id)); }
    const paths = [apply('proof_service','proof_refuse_involvement'),
      apply('proof_civic','proof_keep_household'), apply('proof_claim','proof_keep_dalmatia')];
    const noAward = owners === borders();
    s.turn = 24;
    FB.stories.get('proof_return').day(s, restored);
    const returned = FB.realmRulerCharacterSnapshot(s, 'proof_issuer').id === w.proof_zenoId;
    const commanders = ['proof_commander_0','proof_commander_1'].every(function (field) {
      return s.chars[restored[field]].homeProvinceId === 'constantinople';
    });
    const restorationNoAward = owners === borders();
    // Conquest replaces the holder even when the sovereign later recovers Paris.
    // Compare restored borders with this deliberately staged saved boundary.
    FB.transferProvince(s, 'paris', 'proof_north');
    FB.stories.get('proof_office').day(s, s.stories.proof_office);
    const displaced = s.stories.proof_office.result;
    FB.transferProvince(s, 'paris', 'proof_senior');
    FB.stories.get('proof_office').day(s, s.stories.proof_office);
    const stagedBorders = borders();
    const records = JSON.stringify(s.stories), counts = [s.authority.appointments.length,s.authority.recognitions.length,s.armies.length];
    const saved = JSON.parse(FB.save.serialize()), savedRng = (FB.getRngState() >>> 0);
    FB.save.restore(saved); s = FB.state;
    FB.stories.get('proof_return').day(s, s.stories.proof_return);
    FB.stories.get('proof_office').day(s, s.stories.proof_office);
    return { order:order, paths:paths, pure:pure, returned:returned, commanders:commanders,
      displaced:displaced, restored:s.stories.proof_office.result,
      noAward:noAward, restorationNoAward:restorationNoAward, bordersRetained:stagedBorders === borders(),
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
    noAward:true, restorationNoAward:true, bordersRetained:true, retained:true, rng:true, replay:true,
    claimReview:{ reason:'claim_restoration',issuerMatches:true,genericRole:true },
    results:['declined','household','retained'] });
  expect(result.choices).toContain('proof_accept_delegate');
  expect(result.cards).toEqual(['proof_return','proof_office','proof_service','proof_civic','proof_claim']);
});

test('a fictional track negotiates its own declared payments and duration without awarding land', async function ({ page }, testInfo) {
  await beginCourtProof(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, track = 'proof_service', t = s.stories[track];
    const terms = FB.stories.get(track).declaration.parameters;
    // The patron must personally hold the estate it promises in this contract.
    s.holder[terms.targetProvinceId] = terms.patronRealmId;
    FB.invalidateRealmCache();
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
    function facts(s) { return [s.stories,s.owner,s.holder,s.authority,s.armies,s.bookmarkSetup]; }
    const before = facts(saved.state);
    const rng = (FB.getRngState() >>> 0), uid = FB.getUidCounter();
    FB.save.restore(saved);
    const retained = facts(JSON.parse(FB.save.serialize()).state);
    const live = FB.state;
    const invalidPhases = ['arbitrary_stage',['delegate'],null];
    const rejected = invalidPhases.every(function (phase) {
      const corrupt = JSON.parse(JSON.stringify(saved)); corrupt.state.stories.federate_track_476.phase = phase;
      try { FB.save.restore(corrupt); } catch (error) { return error.message.indexOf('state.stories.federate_track_476') >= 0; }
      return false;
    });
    return { before:before,retained:retained, rejected:rejected, detached:FB.state === live,
      rng:rng === (FB.getRngState() >>> 0), uid:uid === FB.getUidCounter(),
      ids:Object.keys(FB.state.stories), noReplay:FB.state.armies.length === saved.state.armies.length };
  });
  expect(result.retained).toEqual(result.before);
  expect(result).toMatchObject({ rejected:true,detached:true,rng:true,uid:true,noReplay:true });
  expect(result.ids).toContain('western_court_476');
  expect(result.ids).toContain('federate_track_476');
});

test('authored track branches, shortened stages and changed routes survive the shared lifecycle', async function ({ page }, testInfo) {
  await beginCourtProof(page, testInfo);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const service = FB.stories.get('proof_service'), civic = FB.stories.get('proof_civic');
    const sizes = [Object.keys(service.declaration.stages).length, Object.keys(civic.declaration.stages).length,
      Object.keys(FB.stories.get('proof_claim').declaration.stages).length];
    const before = JSON.stringify(s), rng = (FB.getRngState() >>> 0), uid = FB.getUidCounter();
    const reviewed = FB.stories.quote(s, 'proof_service', 'proof_accept_delegate');
    const choice = service.declaration.choices.accept_delegate;
    choice.nextStage = 'orders';
    const stale = FB.stories.apply(s, 'proof_service', 'proof_accept_delegate', reviewed);
    const unchanged = before === JSON.stringify(s) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
    choice.nextStage = 'commission_audience';
    function apply(story, id) { return FB.stories.apply(s, story, id, FB.stories.quote(s, story, id)); }
    const branch = apply('proof_service', 'proof_accept_delegate'), branchPhase = s.stories.proof_service.phase;
    const civicDone = apply('proof_civic', 'proof_keep_household'), claimDone = apply('proof_claim', 'proof_keep_dalmatia');
    const labels = [FB.stories.status(s, 'proof_service').name, FB.stories.status(s, 'proof_civic').name];
    const saved = JSON.parse(FB.save.serialize()), phases = JSON.stringify(s.stories), savedRng = (FB.getRngState() >>> 0), savedUid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const restored = phases === JSON.stringify(s.stories) && savedRng === (FB.getRngState() >>> 0) && savedUid === FB.getUidCounter();
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

test('court settlement blockers name the first unmet condition with the old allowed result and stamp', async function ({ page }, testInfo) {
  await beginCourtProof(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, story = FB.stories.get('proof_court'), w = s.stories.proof_court;
    const p = story.declaration.parameters, patron = p.patronRealmId;
    const province = FB.world.byId[p.targetProvinceId].name, realm = FB.realmNameParam(s, patron);
    function alive(id) { return !!(id && s.chars[id] && !s.chars[id].dead); }
    function read(id) {
      const q = FB.stories.quote(s, 'proof_court', id);
      return { allowed:q.allowed, reason:q.reason, text:story.blocker(s, w, q.reason), facts:q.facts,
        reasonInFacts:Object.prototype.hasOwnProperty.call(q.facts, 'reason') };
    }
    // The previous allowed expressions, evaluated from the quote's own facts.
    function oldService(f) {
      return !!(f.funds >= p.immediatePay && f.agreement.allowed && f.civic && f.bishop && f.mediation.allowed &&
        alive(w[p.fields.commander]) && f.majority >= p.majorityShare);
    }
    function oldCivic(f) {
      return !!(alive(w[p.fields.delegate]) && f.representative === w[p.fields.delegate] && f.consent.allowed &&
        f.councilAgreement && f.councilTerms.courts && f.councilTerms.protection && f.councilTerms.tolerance &&
        f.bishop && f.mediation.allowed && f.majority >= p.majorityShare);
    }
    function oldContest(f) { return !!(f.host && f.host.men > 0 && !f.wars[0] && !f.wars[1]); }
    function brief(row, old) { return { allowed:row.allowed, old:old, reason:row.reason, text:row.text, reasonInFacts:row.reasonInFacts }; }
    // A household player is not offered the court choices: the declaration fallback stays.
    const unoffered = read('proof_accept_service');
    // Stage the player directly as the fictional service ruler so the opening choices are offered.
    s.start.rulerRealmId = p.serviceRealmId;
    w[p.fields.serviceRuler] = s.player.charId;
    const offered = FB.stories.choices(s, 'proof_court').map(function (row) { return row.id; });
    const keepBefore = FB.stories.quote(s, 'proof_court', 'proof_keep_host');
    const account = s.realms[patron].treasury, gold = account.gold;
    account.gold = (account.militaryAccrued || 0) + 5;
    // Old results are read before each restore: quote facts hold the live host row.
    const funds = read('proof_accept_service'), fundsOld = oldService(funds.facts);
    account.gold = gold;
    const host = s.armies.filter(function (row) { return row.id === p.serviceHostId; })[0], men = host.men;
    host.men = 0;
    const emptied = read('proof_contest_ravenna'), emptiedOld = oldContest(emptied.facts);
    host.men = men;
    const keepAfter = FB.stories.quote(s, 'proof_court', 'proof_keep_host');
    const service = read('proof_accept_service'), contest = read('proof_contest_ravenna');
    // Holding the county opens the civic government choice; the quote reads the owner table directly.
    s.owner[p.targetProvinceId] = 'player';
    s.chars[w[p.fields.delegate]].dead = true;
    const delegate = read('proof_accept_civic_rule'), delegateOld = oldCivic(delegate.facts);
    s.chars[w[p.fields.delegate]].dead = false;
    s.localInstitutions[p.civicId].representativeId = w[p.fields.delegate];
    const council = read('proof_accept_civic_rule');
    return { unoffered:brief(unoffered, false), offered:offered,
      funds:brief(funds, fundsOld), fundsSeen:funds.facts.funds,
      emptied:brief(emptied, emptiedOld),
      probes:[service.allowed === oldService(service.facts), contest.allowed === oldContest(contest.facts)],
      delegate:brief(delegate, delegateOld),
      council:brief(council, oldCivic(council.facts)), consent:council.facts.consent, agreement:council.facts.councilAgreement,
      keep:{ allowed:keepAfter.allowed, reason:keepAfter.reason, same:keepBefore.stamp === keepAfter.stamp,
        stamp:keepAfter.stamp === JSON.stringify(keepAfter.facts), keys:Object.keys(keepAfter.facts) },
      expected:{
        funds:FB.T('The {realm} treasury holds {money:funds}; the first payment needs {money:pay}.', { realm:realm, funds:5, pay:p.immediatePay }),
        delegate:FB.T('{province}’s civic delegate has died or no longer speaks for the council.', { province:province }),
        council:FB.T('{province}’s council has not ratified terms protecting its courts, order and worship.', { province:province }) },
      named:{ commander:story.blocker(s, w, 'commander'), host:story.blocker(s, w, 'host'), unknown:story.blocker(s, w, 'arbitrary') } };
  });
  expect(result.unoffered).toEqual({ allowed:false, old:false, reason:'not_offered', text:'Fictional text22', reasonInFacts:false });
  expect(result.offered).toEqual(['proof_accept_service','proof_contest_ravenna','proof_keep_host']);
  expect(result.fundsSeen).toBe(5);
  expect(result.funds).toEqual({ allowed:false, old:false, reason:'funds', text:result.expected.funds, reasonInFacts:false });
  expect(result.funds.text).toContain('treasury holds');
  expect(result.emptied).toEqual({ allowed:false, old:false, reason:'host', text:'Your host has no soldiers left.', reasonInFacts:false });
  expect(result.probes).toEqual([true,true]);
  expect(result.delegate).toEqual({ allowed:false, old:false, reason:'delegate', text:result.expected.delegate, reasonInFacts:false });
  expect(result.council).toEqual({ allowed:false, old:false, reason:'council', text:result.expected.council, reasonInFacts:false });
  expect(result.council.text).toContain('has not ratified terms protecting its courts, order and worship.');
  expect(result.keep).toEqual({ allowed:true, reason:'ruler_settlement', same:true, stamp:true,
    keys:['turn','player','resolution','interruption','governance','owner','host','dead','living','west',
      'patronGeneration','funds','agreement','civic','bishop','representative','consent','councilAgreement',
      'councilTerms','mediation','institutions','churchHolder','majority','wars','operation','terms'] });
  expect(result.named).toEqual({ commander:'The host’s commander has died.', host:'Your host has no soldiers left.', unknown:'Fictional text22' });
});

test('claim restoration and service track blockers name the missing condition', async function ({ page }, testInfo) {
  await beginCourtProof(page, testInfo);
  const first = await page.evaluate(function () {
    const s = FB.state, service = FB.stories.get('proof_service'), w = s.stories.proof_court;
    const fields = FB.stories.get('proof_court').declaration.parameters.fields;
    function quote(story, id) { return FB.stories.quote(s, story, id); }
    const accepted = FB.stories.apply(s, 'proof_service', 'proof_accept_delegate', quote('proof_service', 'proof_accept_delegate'));
    const phase = s.stories.proof_service.phase, ready = quote('proof_service', 'proof_keep_serving');
    s.chars[w[fields.serviceRuler]].dead = true;
    const dead = quote('proof_service', 'proof_keep_serving');
    const serviceRow = { accepted:accepted, phase:phase, ready:ready.allowed, allowed:dead.allowed, reason:dead.reason,
      text:service.blocker(s, s.stories.proof_service, dead.reason),
      claimant:service.blocker(s, s.stories.proof_service, 'claimant_unavailable'),
      unknown:service.blocker(s, s.stories.proof_service, 'arbitrary') };
    // Author a confirmation stage into the fictional claim track and stage the record there.
    const claim = FB.stories.get('proof_claim'), d = claim.declaration, t = s.stories.proof_claim;
    const keepBefore = quote('proof_claim', 'proof_keep_dalmatia');
    d.choices.confirm_restoration = { id:'proof_confirm_restoration', operation:'confirm_restoration',
      label:'Fictional confirm_restoration', detail:'Review confirm_restoration through ordinary transactions.' };
    d.stages.claim_hold = { name:'Fictional claim stage', mechanic:'claim', choices:['confirm_restoration'] };
    t.phase = 'claim_hold';
    const pid = d.parameters.targetProvinceId;
    const held = quote('proof_claim', 'proof_confirm_restoration');
    return { service:serviceRow, keepStamp:keepBefore.stamp,
      notHeld:{ allowed:held.allowed, old:held.facts.owner === 'player', reason:held.reason,
        text:claim.blocker(s, t, held.reason),
        reasonInFacts:Object.prototype.hasOwnProperty.call(held.facts, 'reason') },
      expected:FB.T('You must hold {province} yourself to confirm the restoration.', { province:FB.world.byId[pid].name }) };
  });
  expect(first.service).toEqual({ accepted:true, phase:'commission_audience', ready:true, allowed:false,
    reason:'no_federate_command', text:'The host’s ruler has died or the host has disbanded.',
    claimant:'This claimant can no longer be backed: he has died or lost his seat.', unknown:null });
  expect(first.notHeld).toEqual({ allowed:false, old:false, reason:'not_held', text:first.expected, reasonInFacts:false });
  expect(first.notHeld.text).toContain('yourself to confirm the restoration.');
  // The shared sheet review shows the specific sentence for the blocked choice.
  await page.evaluate(function () { FB.ui.showStorySheet('proof_claim'); });
  // The blocked choice is aria-disabled but still opens its review.
  await page.locator('[data-story-choice="proof_confirm_restoration"]').dispatchEvent('click');
  await expect(page.locator('#gm-body')).toContainText(first.expected);
  await expect(page.locator('#gm-body')).not.toContainText('Fictional text10');
  const second = await page.evaluate(function (keepStamp) {
    FB.ui.closeModal();
    const s = FB.state, claim = FB.stories.get('proof_claim'), d = claim.declaration, t = s.stories.proof_claim;
    const p = d.parameters, owner = s.owner[p.targetProvinceId], travel = s.player.travel;
    s.owner[p.targetProvinceId] = 'player';
    s.player.travel = { proof:true };
    const away = FB.stories.quote(s, 'proof_claim', 'proof_confirm_restoration');
    s.player.travel = travel;
    const home = FB.stories.quote(s, 'proof_claim', 'proof_confirm_restoration');
    const oldHome = home.facts.owner === 'player' && !home.facts.travel && home.facts.recognition.length > 0;
    // Remove the authored stage and restore the record: the allowed quote keeps its stamp.
    s.owner[p.targetProvinceId] = owner;
    delete d.stages.claim_hold; delete d.choices.confirm_restoration; t.phase = 'claim_review';
    const keepAfter = FB.stories.quote(s, 'proof_claim', 'proof_keep_dalmatia');
    return { away:{ allowed:away.allowed, old:false, reason:away.reason, text:claim.blocker(s, t, away.reason) },
      home:{ allowed:home.allowed, old:oldHome, recognitions:home.facts.recognition.length, reason:home.reason },
      keep:{ allowed:keepAfter.allowed, reason:keepAfter.reason, same:keepAfter.stamp === keepStamp,
        keys:Object.keys(keepAfter.facts) },
      fallback:claim.blocker(s, t, 'claim_restoration'),
      applied:FB.stories.apply(s, 'proof_claim', 'proof_keep_dalmatia', { id:'proof_keep_dalmatia', stamp:keepStamp }) };
  }, first.keepStamp);
  expect(second.away).toEqual({ allowed:false, old:false, reason:'travel', text:'Return from your journey first.' });
  expect(second.home).toEqual({ allowed:false, old:false, recognitions:0, reason:'no_recognition' });
  expect(second.keep).toEqual({ allowed:true, reason:'claim_restoration', same:true,
    keys:['phase','claimant','player','dead','turn','owner','holder','senate','senateId','issuer','issuerGeneration',
      'playerGeneration','at','travel','recognition','appointments','wars','graph','operation','terms'] });
  expect(second.fallback).toBe('Fictional text10');
  expect(second.applied).toBe(true);
});
