'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_instances.js',
  'data/story_courts_476.js',
  'index.html', 'data/actions.js', 'data/cultures.js', 'data/eras.js',
  'data/bookmark_476.js', 'data/bookmarks.js', 'data/settlements.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/bookmark_476_outer.js', 'data/bookmark_476_wider.js',
  'data/political_institutions.js', 'data/technology.js', 'data/systems.js',
  'data/modifiers.js', 'js/institutions.js', 'js/politics.js', 'js/parliament.js',
  'js/model.js', 'js/authority.js', 'js/federates.js', 'js/station.js', 'js/governments.js',
  'js/treasury.js', 'js/modifiers.js', 'js/population.js',
  'js/actions.js', 'js/systems.js', 'js/stories.js', 'js/story_courts.js',
  'js/story_track.js', 'js/save.js', 'js/save_v4.js', 'js/main.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/ui_panels.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');

async function start476(page, testInfo) {
  await startParityGame(page, testInfo, {
    bookmark:'476', code:'CIVIC476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
  });
}

test('researched civic seats and head offices are distinct, pure and period scoped', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, w = s.stories.western_court_476;
    const before = JSON.stringify(s), rng = FB.getRngState();
    const cities = FB.localInstitutionList(s, 'city');
    const sees = FB.localInstitutionList(s, 'church');
    const offices = FB.political.offices(s, { kind:'character', id:s.religiousHeads.ravenna_nicene_bishop });
    cities[0].record.demands.length = 0;
    const quote = FB.localInstitutionQuote(s, 'milan_council', { kind:'realm', id:'italy' }, 'petition');
    return {
      cities:cities.map(function (r) { return r.id; }).sort(), sees:sees.length,
      periodRoute:FB.station.promotion(1, { start:{ era:FB.campaignEra(s), defaultGovernment:'regnum' } }).route,
      pure:before === JSON.stringify(s) && rng === FB.getRngState(), quote:quote.allowed,
      rome:FB.religiousOfficeSnapshot(s, 'rome_bishop').name,
      ravenna:FB.religiousOfficeSnapshot(s, 'ravenna_nicene_bishop').name,
      salona:FB.religiousOfficeSnapshot(s, 'salona_bishop').name,
      carthage:FB.religiousOfficeSnapshot(s, 'carthage_bishop'),
      oneOffice:offices.filter(function (r) { return r.ref.officeId === 'ravenna_nicene_bishop'; }).length,
      delegate:s.localInstitutions.ravenna_council.representativeId === w.civicDelegateId,
      senator:s.localInstitutions.rome_senate.representativeId === w.senatorId,
      older:['867','1066'].map(function (id) {
        const state = { start:{ id:id, era:FB.bookmark(id).era }, realms:{}, chars:{}, player:{} };
        FB.ensureLocalInstitutions(state);
        return { civic:FB.systemEnabled(state, 'civic_institutions'), sees:FB.systemEnabled(state, 'episcopal_sees'),
          absent:state.localInstitutions === undefined,
          noLateHeads:!FB.religiousOffices(state).rome_bishop };
      }),
      reviews:[FBDATA.techImpactReviews.features.local_institution_bargains.mode,
        FBDATA.techImpactReviews.features.episcopal_institution_mediation.mode],
      techErrors:FB.validateTechnologyData()
    };
  });
  expect(result.cities).toEqual(['aleria_council','altava_council','ancyra_council','angers_council',
    'aquileia_council','arles_council','astorga_council','athens_council','attalea_council',
    'barcelona_council','bononia_danube_council','bordeaux_council','caesarea_council',
    'capua_council','carales_council','carthage_council','cologne_council','constantinople_senate',
    'cordoba_council','corinth_council','durostorum_council','dyrrachium_council','ephesus_council',
    'favianis_council','geneva_council','hadrianopolis_council','hippo_council','iconium_council',
    'iuvavum_council','lauriacum_council','lisboa_council','lugo_council','lychnidus_council',
    'lyon_council','marseille_council','merida_council','metz_council','milan_council','mursa_council',
    'nantes_council','narbonne_council','neapolis_council','nicaea_council','orleans_council',
    'panormus_council','paris_council','philippopolis_council','ravenna_council','reims_council',
    'rennes_council','rome_senate','rouen_council','salona_council','santiago_council','sardis_council',
    'scupi_council','sebastea_council','serdica_council','sevilla_council','sirmium_council',
    'soissons_council','strasbourg_council','sufetula_council','syracusae_council','tarragona_council',
    'thessalonica_council','ticinum_council','toledo_council','toulouse_council','tournai_council',
    'tours_council','trier_council','troyes_council','vannes_council','verona_council','vienne_council',
    'zaragoza_council',
    'alexandria_council_476','antioch_council','candia_council_476','ctesiphon_council_476',
    'edessa_council_476','fayyum_council_476','fustat_council_476','nicosia_council_476',
    'trebizond_council_476','uppakra_assembly_476','viroconium_assembly_476','weser_assembly_476'].sort());
  expect(result.sees).toBe(108);
  expect(result.periodRoute).toBe('standing');
  expect(result.pure).toBe(true);
  expect(result.quote).toBe(true);
  expect(result.rome).toBe('Simplicius');
  expect(result.ravenna).toBe('Exuperantius');
  expect(result.salona).toBe('Glycerius');
  expect(result.carthage).toBeNull();
  expect(result.oneOffice).toBe(1);
  expect(result.delegate).toBe(true);
  expect(result.senator).toBe(true);
  expect(result.older).toEqual([0, 1].map(function () { return { civic:false, sees:false, absent:true, noLateHeads:true }; }));
  expect(result.reviews).toEqual(['none','none']);
  expect(result.techErrors).toEqual([]);
});

test('a second city ratifies guarantees and refuses a coercive bargain without paying twice', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, subject = { kind:'realm', id:'italy' };
    const gold = FB.treasuryAvailable(s, 'italy'), owner = s.owner.milano;
    const culture = FB.countyCultureShare(s, 'milano', 'roman');
    const religion = FB.countyReligionShare(s, 'milano', 'nicene');
    const accepted = FB.localInstitutionSettle(s, 'milan_council', subject,
      { provision:true, protection:true, courts:true, tolerance:true, taxRelief:true });
    const after = FB.treasuryAvailable(s, 'italy');
    const repeated = FB.localInstitutionSettle(s, 'milan_council', subject,
      { provision:true, protection:true, courts:true, tolerance:true, taxRelief:true });
    const refused = FB.localInstitutionSettle(s, 'salona_council', { kind:'realm', id:'croatia' }, { protection:true });
    const refusal = s.localInstitutions.salona_council.petitions['realm:croatia'];
    const rights = FB.political.rights(s, { kind:'character', id:s.localInstitutions.milan_council.representativeId });
    return { accepted:accepted.stage, repeated:repeated.recognitionId === accepted.recognitionId,
      cost:gold - after, twice:after === FB.treasuryAvailable(s, 'italy'),
      passed:accepted.ballot.passed, support:accepted.ballot.supportWeight,
      refuseNull:refused === null, refused:refusal.stage, retry:refusal.retryTurn - s.turn,
      rights:rights.filter(function (r) { return r.effective; }).map(function (r) { return r.power; }).sort(),
      provision:FB.hasModifier(s, 'civic_provisioning', 'milano'),
      guarantees:FB.hasModifier(s, 'civic_guarantees', 'milano'),
      resistance:FB.hasModifier(s, 'institutional_resistance', 'split'),
      taxRelief:FB.hasModifier(s, 'tax_concession', 'milano'),
      preserved:s.owner.milano === owner && FB.countyCultureShare(s, 'milano', 'roman') === culture &&
        FB.countyReligionShare(s, 'milano', 'nicene') === religion };
  });
  expect(result.accepted).toBe('ratified');
  expect(result.passed).toBe(true);
  expect(result.support).toBe(10);
  expect(result.cost).toBe(5);
  expect(result.twice).toBe(true);
  expect(result.repeated).toBe(true);
  expect(result.refuseNull).toBe(true);
  expect(result.refused).toBe('refused');
  expect(result.retry).toBe(90);
  expect(result.rights).toEqual(['consent','peace']);
  expect(result.provision).toBe(true);
  expect(result.guarantees).toBe(true);
  expect(result.resistance).toBe(true);
  expect(result.taxRelief).toBe(true);
  expect(result.preserved).toBe(true);
});

test('reviewed votes reject succession, conquest, altered terms and insufficient funds before mutation', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, subject = { kind:'realm', id:'italy' };
    const terms = { provision:true, protection:true, courts:true, tolerance:true };
    ['petition','bargain'].forEach(function (action) {
      FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'milan_council', subject, action, terms));
    });
    const q = FB.localInstitutionQuote(s, 'milan_council', subject, 'ratify');
    const detached = FB.localInstitutionQuote(s, 'milan_council', subject, 'ratify');
    const before = JSON.stringify(s);
    detached.facts.pending.stage = 'tampered';
    const pure = before === JSON.stringify(s);
    const altered = FB.localInstitutionQuote(s, 'milan_council', subject, 'ratify', { courts:true });
    const oldGen = s.realms.italy.ruler.generation;
    s.realms.italy.ruler.generation = (oldGen || 1) + 1;
    const successorState = JSON.stringify(s), rng = FB.getRngState();
    const succession = FB.localInstitutionApply(s, q);
    const noSuccessionMutation = successorState === JSON.stringify(s) && rng === FB.getRngState();
    s.realms.italy.ruler.generation = oldGen;
    FB.transferProvince(s, 'milano', 'federates_476');
    const conquestState = JSON.stringify(s);
    const conquest = FB.localInstitutionApply(s, q);
    const noConquestMutation = conquestState === JSON.stringify(s);
    FB.transferProvince(s, 'milano', 'italy');
    s.realms.italy.treasury.gold = 0;
    const poor = FB.localInstitutionQuote(s, 'milan_council', subject, 'ratify');
    return { pure:pure, altered:altered.allowed, succession:succession, conquest:conquest,
      noSuccessionMutation:noSuccessionMutation, noConquestMutation:noConquestMutation, poor:poor.allowed };
  });
  expect(result.pure).toBe(true);
  expect(result.altered).toBe(false);
  expect(result.succession).toBe(false);
  expect(result.conquest).toBe(false);
  expect(result.noSuccessionMutation).toBe(true);
  expect(result.noConquestMutation).toBe(true);
  expect(result.poor).toBe(false);
});

test('expired petitions reopen and service contracts authorize only their controller’s cities', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, subject = { kind:'realm', id:'italy' };
    FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'milan_council', subject, 'petition'));
    const original = s.localInstitutions.milan_council.petitions['realm:italy'];
    s.turn = original.expiresTurn;
    const renewed = FB.localInstitutionSettle(s, 'milan_council', subject,
      { provision:true, protection:true, courts:true, tolerance:true });
    const service = FB.authorityOfferContract(s, { patronRealmId:'italy', federateRealmId:'federates_476',
      payPerSeason:0, endTurn:s.turn + 360 });
    FB.authorityConsentContract(s, service.id, 'italy');
    FB.authorityConsentContract(s, service.id, 'federates_476');
    const partner = { kind:'realm', id:'federates_476' }, terms = { contractId:service.id };
    const local = FB.localInstitutionQuote(s, 'ravenna_council', partner, 'petition', terms);
    const foreign = FB.localInstitutionQuote(s, 'carthage_council', partner, 'petition', terms);
    FB.authorityContractTransition(s, service.id, 'breach', 'italy');
    const before = JSON.stringify(s), rng = FB.getRngState();
    const revoked = FB.localInstitutionApply(s, local);
    return { renewed:renewed.stage, newTerm:renewed.startedTurn === s.turn,
      local:local.allowed, foreign:foreign.allowed, revoked:revoked,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() };
  });
  expect(result).toEqual({ renewed:'ratified', newTerm:true, local:true, foreign:false, revoked:false, pure:true });
});

test('Homoian households need living episcopal mediation, and vacant sees cannot mediate', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, subject = { kind:'character', id:s.player.charId };
    const terms = { protection:true, courts:true, tolerance:true };
    ['petition','bargain'].forEach(function (action) {
      FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'ravenna_council', subject, action, terms));
    });
    const blocked = FB.localInstitutionQuote(s, 'ravenna_council', subject, 'ratify').allowed;
    const mediation = FB.localInstitutionMediate(s, 'ravenna_see', subject, 'ravenna');
    const vote = FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'ravenna_council', subject, 'ratify'));
    const consent = FB.localInstitutionConsent(s, 'ravenna_council', subject);
    const vacant = FB.localInstitutionMediationQuote(s, 'carthage_see', subject, 'ravenna').allowed;
    const bishopId = s.religiousHeads.ravenna_nicene_bishop;
    s.chars[bishopId].dead = true;
    FB.religiousHeadCharacterDied(s, bishopId);
    const afterDeath = FB.localInstitutionConsent(s, 'ravenna_council', subject);
    FB.ensureLocalInstitutions(s);
    return { blocked:blocked, mediation:!!mediation, vote:vote.stage, consent:consent,
      vacant:vacant, afterDeath:afterDeath, retainedVacancy:s.religiousHeads.ravenna_nicene_bishop === null,
      noCommand:!FB.political.permission(s, subject, 'command_host', { hostId:'host_476_federates' }).allowed,
      noLand:s.player.provs.length === 0 };
  });
  expect(result).toEqual({ blocked:false, mediation:true, vote:'ratified', consent:true,
    vacant:false, afterDeath:false, retainedVacancy:true, noCommand:true, noLand:true });
});

test('governing treatment invalidates civic reviews, mediation and effective consent', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, subject = { kind:'realm', id:'italy' }, city = 'milan_council';
    const terms = { provision:true, protection:true, courts:true, tolerance:true, taxRelief:true };
    for (const action of ['petition','bargain'])
      FB.localInstitutionApply(s, FB.localInstitutionQuote(s, city, subject, action, terms));
    const vote = FB.localInstitutionQuote(s, city, subject, 'ratify');
    const mediation = FB.localInstitutionMediationQuote(s, 'milan_see', subject, 'milano');
    const identity = FB.political.governingIdentity(s, 'italy');
    const population = JSON.stringify(s.population);
    FB.authoritySetIdentity(s, 'italy', Object.assign({}, identity,
      { eliteCultureId:'gothic', tolerance:'persecution', taxation:'discriminatory' }));
    const before = JSON.stringify(s), rng = FB.getRngState();
    const staleVote = !FB.localInstitutionApply(s, vote);
    const staleMediation = !FB.localInstitutionMediate(s, 'milan_see', subject, 'milano', mediation);
    const protectedWorship = FB.political.worshipProtected(s, 'milano');
    const clean = before === JSON.stringify(s) && rng === FB.getRngState();
    FB.authoritySetIdentity(s, 'italy', Object.assign({}, identity,
      { eliteCultureId:'gothic', tolerance:'tolerant', taxation:'discriminatory' }));
    const taxes = !FB.localInstitutionQuote(s, city, subject, 'ratify').allowed;
    FB.authoritySetIdentity(s, 'italy', identity);
    const accepted = FB.localInstitutionApply(s, FB.localInstitutionQuote(s, city, subject, 'ratify'));
    const recognition = accepted.recognitionId;
    FB.setCountySupport(s, 'milano', -100);
    const opposed = !FB.localInstitutionConsent(s, city, subject);
    const retained = s.authority.recognitions.some(function (row) { return row.id === recognition && row.status === 'active'; });
    FB.setCountySupport(s, 'milano', 0);
    const recovered = FB.localInstitutionConsent(s, city, subject);
    FB.authoritySetIdentity(s, 'italy', Object.assign({}, identity, { tolerance:'persecution' }));
    const lapsed = !FB.localInstitutionConsent(s, city, subject);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return { ready:vote.allowed && mediation.allowed, staleVote:staleVote, staleMediation:staleMediation,
      protectedWorship:protectedWorship, clean:clean, taxes:taxes, accepted:accepted.stage,
      opposed:opposed, retained:retained, recovered:recovered, lapsed:lapsed,
      restored:!FB.localInstitutionConsent(FB.state, city, subject),
      communities:population === JSON.stringify(FB.state.population) };
  });
  expect(result).toEqual({ ready:true, staleVote:true, staleMediation:true, protectedWorship:false,
    clean:true, taxes:true, accepted:'ratified', opposed:true, retained:true, recovered:true,
    lapsed:true, restored:true, communities:true });
});

test('seasonal AI uses declared tolerance and tax treatment in its terms and standing', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, identity = FB.political.governingIdentity(s, 'italy');
    FB.authoritySetIdentity(s, 'italy', Object.assign({}, identity,
      { eliteCultureId:'gothic', tolerance:'persecution', taxation:'discriminatory' }));
    s.turn = 90; FB.localInstitutionsSeason(s);
    const row = s.localInstitutions.milan_council, p = row.petitions['realm:italy'];
    return { tolerance:p.terms.tolerance, taxRelief:p.terms.taxRelief, standing:row.standing['realm:italy'], stage:p.stage,
      demand:row.demands.indexOf('taxRelief') >= 0, guarantees:FB.hasModifier(s, 'civic_guarantees', 'milano') };
  });
  // Peace gives +1, extraction -10 and persecution -8; the narrower bargain's
  // successful ballot then restores 10 standing without guaranteeing tolerance.
  expect(result).toEqual({ tolerance:false, taxRelief:false, standing:-7, stage:'ratified', demand:true, guarantees:false });
});

test('seasonal AI uses the same ballots, responds to extraction and does not replay a season', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.turn = 90;
    FB.localInstitutionsSeason(s);
    const record = s.localInstitutions.milan_council;
    const p = record.petitions['realm:italy'];
    const before = JSON.stringify(s), rng = FB.getRngState();
    FB.localInstitutionsSeason(s);
    const stable = before === JSON.stringify(s) && rng === FB.getRngState();
    FB.addModifier(s, 'fiscal_extraction', 'milano');
    const consent = FB.localInstitutionConsent(s, 'milan_council', { kind:'realm', id:'italy' });
    s.turn = 180;
    FB.localInstitutionsSeason(s);
    return { result:p.stage, ballot:p.ballot.passed, stable:stable,
      consent:consent, changedTerms:record.petitions['realm:italy'].terms.taxRelief === false,
      taxDemand:record.demands.indexOf('taxRelief') >= 0,
      carthageVacant:s.religiousHeads.carthage_bishop === null };
  });
  expect(result).toEqual({ result:'ratified', ballot:true, stable:true, consent:false,
    changedTerms:true, taxDemand:true, carthageVacant:true });
});

test('pending and ratified records round trip, legacy cast is reused, and malformed records fail closed', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, subject = { kind:'realm', id:'italy' };
    FB.localInstitutionSettle(s, 'milan_council', subject, { provision:true, protection:true, courts:true, tolerance:true });
    FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'rome_senate', subject, 'petition'));
    const saved = JSON.parse(FB.save.serialize());
    const ledger = JSON.stringify(saved.state.localInstitutions), funds = FB.treasuryAvailable(s, 'italy');
    FB.save.restore(saved);
    const restored = ledger === JSON.stringify(FB.state.localInstitutions);
    FB.save.restore(saved);
    const second = ledger === JSON.stringify(FB.state.localInstitutions);
    const stableFunds = FB.treasuryAvailable(FB.state, 'italy') === funds;
    const broken = JSON.parse(JSON.stringify(saved.state));
    broken.localInstitutions.milan_council.petitions['realm:italy'].terms.courts = 'yes';
    let rejected = false;
    try { FB.save.v4.validatePlatform(broken); } catch (error) { rejected = /localInstitutions/.test(error.message); }
    const legacy = JSON.parse(JSON.stringify(saved));
    delete legacy.state.localInstitutions;
    delete legacy.state.localInstitutionPeriod;
    FB.save.restore(legacy);
    const w = FB.state.stories.western_court_476;
    const reused = FB.state.localInstitutions.ravenna_council.representativeId === w.civicDelegateId &&
      FB.state.localInstitutions.rome_senate.representativeId === w.senatorId;
    const vacant = FB.state.religiousHeads.carthage_bishop === null;
    return { restored:restored, second:second, stableFunds:stableFunds, rejected:rejected, reused:reused, vacant:vacant };
  });
  expect(result).toEqual({ restored:true, second:true, stableFunds:true, rejected:true, reused:true, vacant:true });
});

test('phone reviews retain terms, disclosures, scroll and focus on Back and after confirmation', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:844 });
  await start476(page, testInfo);
  await page.evaluate(function () { FB.ui.showLocalInstitutions('city'); });
  const city = page.locator('[data-local-institution="ravenna_council"]');
  await city.locator('[data-local-action="petition"]').click();
  await page.locator('#local-confirm').click();
  await page.locator('#local-continue').click();
  await expect(city.locator('[data-local-terms]')).toBeVisible();
  await city.locator('[data-local-terms]').selectOption('force');
  await city.locator('.settcard-info').click();
  const review = city.locator('[data-local-action="bargain"]');
  await review.focus();
  const before = await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; });
  await review.press('Enter');
  await expect(page.locator('[data-modal-nav="back"]')).toBeEnabled();
  await page.locator('[data-modal-nav="back"]').click();
  await expect(city.locator('[data-local-terms]')).toHaveValue('force');
  await expect(city.locator('.settcard-info')).toHaveAttribute('aria-expanded', 'true');
  await expect(review).toBeFocused();
  const after = await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; });
  expect(Math.abs(after - before)).toBeLessThan(3);
  await review.click();
  await page.locator('#local-confirm').click();
  await page.locator('#local-continue').click();
  await expect(city).toContainText('Ready for a vote');
  await page.locator('[data-modal-nav="close"]').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
});

test('the shared ballot keeps explicit commitments free of RNG and preserves undecided draw order', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const rng = FB.getRngState();
    const fixed = FB.politicalBallot([{ id:'yes', weight:3, posture:'support' }, { id:'no', weight:2, posture:'oppose' }]);
    const pure = rng === FB.getRngState();
    const expected = [FB.rng() < 0.4, FB.rng() < 0.7], next = FB.getRngState();
    FB.setRngState(rng);
    const drawn = FB.politicalBallot([{ id:'a', weight:2, supportChance:0.4 }, { id:'b', weight:1, supportChance:0.7 }]);
    const ordered = drawn.outcomes.a === (expected[0] ? 'support' : 'oppose') && drawn.outcomes.b === (expected[1] ? 'support' : 'oppose');
    const sameRng = next === FB.getRngState();
    FB.setRngState(rng);
    return { fixed:fixed.passed, support:fixed.supportWeight, pure:pure, ordered:ordered, sameRng:sameRng };
  });
  expect(result).toEqual({ fixed:true, support:3, pure:true, ordered:true, sameRng:true });
});
