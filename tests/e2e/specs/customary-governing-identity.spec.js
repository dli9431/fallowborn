'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/authority.js', 'js/justice.js', 'js/world.js', 'js/population.js', 'js/main.js',
  'js/politics.js', 'js/lordships.js', 'js/treasury.js', 'js/title_ids.js',
  'js/modifiers.js', 'js/model.js', 'js/actions.js', 'js/institutions.js',
  'js/save.js', 'js/save_v4.js', 'js/ui_misc.js', 'js/ui_modals.js',
  'js/governments.js', 'js/station.js', 'js/story_western_court_476.js',
  'data/cultures.js', 'data/bookmark_476.js', 'data/bookmark_476_italy.js',
  'data/bookmark_476_dalmatia_east.js', 'data/bookmark_476_gaul_iberia.js',
  'data/bookmark_476_africa.js', 'data/bookmarks.js', 'data/intrigue.js',
  'data/political_institutions.js', 'data/policies.js', 'data/technology.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');

async function startWorld(page, testInfo, id, crazy) {
  if (crazy) await openCrazyGame(page, testInfo);
  else await openGame(page, testInfo);
  const error = await page.evaluate(function (bookmark) {
    return new Promise(function (resolve) {
      FB.activateBookmark(bookmark, null, function (fault) {
        if (fault) { resolve(fault.message); return; }
        FB.game.pending = { seed:'CUSTOMARY-GOVERNING-IDENTITY' };
        FB.game.startObserve();
        FB.game.setPaused(true);
        resolve(null);
      });
    });
  }, id || '476');
  expect(error).toBe(null);
}

test('476 seeds provincial court rights and elite identities separately from communities', async function ({ page }, testInfo) {
  await startWorld(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
    const g = FB.political.governingIdentity(s, 'aquitaine');
    const rights = s.authority.rights.filter(function (r) { return r.basis === 'tenure'; });
    const local = FB.political.communityGovernance(s, 'toulouse');
    const b = FB.bookmark('476');
    const counties = ['ravenna','roma','split','laon','toulouse','tunis','constantinople'];
    const seeded = rights.length === counties.length * 2 && counties.every(function (pid) {
      return ['peace','revenue'].every(function (power) {
        return rights.some(function (r) {
          return r.scope.id === pid && r.power === power && r.beneficiary.kind === 'realm' &&
            r.beneficiary.id === s.holder[pid] && r.basisRef === 'provincial_court_476:' + pid;
        });
      });
    });
    const declared = b.realms.every(function (realm) {
      const authored = realm.governingIdentity;
      const live = FB.political.governingIdentity(s, realm.id);
      const law = FB.cultureIsA(realm.ruler.culture, 'gothic', s) ? 'gothic_custom' :
        ['roman','greek'].indexOf(realm.ruler.culture) >= 0 ? 'late_roman' : 'customary';
      return authored && live.declared && authored.eliteCultureId === realm.ruler.culture &&
        authored.eliteFaithId === realm.religion && authored.legalIdentityId === law &&
        ['eliteCultureId','eliteFaithId','legalIdentityId','tolerance','taxation','justicePolicy']
          .every(function (key) { return live[key] === authored[key]; });
    });
    const detached = FB.political.governingIdentity(s, 'aquitaine');
    detached.rules.consent = 'missing'; detached.eliteCultureId = 'missing';
    return { errors:FB.validateBookmark(b), seeded:seeded, declared:declared,
      courtSeat:s.realms.west_francia.capital,
      culture:g.eliteCultureId, faith:g.eliteFaithId, law:g.legalIdentityId,
      faithShare:local.otherFaithShare, cultureShare:local.otherCultureShare,
      annual:local.annualSupport, communities:FB.countyCommunities(s, 'toulouse').map(function (r) {
        return [r.culture, r.religion];
      }), pure:JSON.stringify(s) === before && FB.getRngState() === rng,
      tech:['governing_identity','dual_jurisdiction','community_tolerance','community_taxation',
        'community_justice'].every(function (id) { return FBDATA.techImpactReviews.features[id].mode === 'none'; }) };
  });
  expect(result).toMatchObject({ errors:[], seeded:true, declared:true, courtSeat:'laon',
    culture:'gothic', faith:'homoian',
    law:'gothic_custom', communities:[['roman','nicene'],['gothic','homoian']], pure:true, tech:true });
  expect(result.faithShare).toBeCloseTo(0.8, 3);
  expect(result.cultureShare).toBeCloseTo(0.8, 3);
  expect(result.annual).toBeCloseTo(-0.8, 3);
});

test('possession creates player and AI rights, hardens once yearly and decays after conquest', async function ({ page }, testInfo) {
  await startWorld(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, pid = FB.realmHeldCounties(s, 'aquitaine').filter(function (id) {
      return id !== 'toulouse';
    })[0];
    FB.authorityYear(s);
    const row = s.authority.rights.find(function (r) {
      return r.scope.id === pid && r.beneficiary.id === 'aquitaine' && r.power === 'peace' && r.basis === 'possession';
    });
    const first = row.strength, once = JSON.stringify(s);
    FB.authorityYear(s);
    const idempotent = once === JSON.stringify(s);
    s.date.year++; s.turn += 360; FB.authorityYear(s);
    const hardened = row.strength;
    const partitions = JSON.stringify(s.population), communities = JSON.stringify(FB.countyCommunities(s, pid));
    const sites = FB.settlementsOf(s, pid).map(function (_, i) {
      return FB.settlementCommunities(s, pid, i);
    });
    FB.transferProvince(s, pid, 'italy');
    const preserved = partitions === JSON.stringify(s.population) && communities === JSON.stringify(FB.countyCommunities(s, pid)) &&
      JSON.stringify(sites) === JSON.stringify(FB.settlementsOf(s, pid).map(function (_, i) {
        return FB.settlementCommunities(s, pid, i);
      }));
    s.date.year++; s.turn += 360; FB.authorityYear(s);
    const disputed = row.strength;
    s.date.year++; s.turn += 360; FB.authorityYear(s);
    const effective = FB.political.rights(s, { kind:'realm', id:'aquitaine' }).find(function (r) { return r.id === row.id; }).effective;
    const home = s.player.provinceId;
    s.player.provs = [home]; s.player.liege = null;
    FB.setPlayerTier(s, 4, { attachLiege:false }); FB.foundPlayerRealm(s);
    s.owner[home] = 'player'; s.holder[home] = 'player'; FB.invalidateRealmCache();
    s.date.year++; s.turn += 360; FB.authorityYear(s);
    return { first:first, idempotent:idempotent, hardened:hardened, disputed:disputed,
      weakened:row.strength, effective:effective, preserved:preserved,
      player:FB.political.territorialClaims(s, { kind:'realm', id:'player' }, home).length > 0,
      conqueror:FB.political.territorialClaims(s, { kind:'realm', id:'italy' }, pid).length > 0 };
  });
  expect(result).toEqual({ first:60, idempotent:true, hardened:70, disputed:55,
    weakened:25, effective:false, preserved:true, player:true, conqueror:true });
});

test('recognition accrues only existing powers and follows its exact evidence after revocation', async function ({ page }, testInfo) {
  await startWorld(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, scope = { kind:'county', id:'toulouse' }, subject = { kind:'realm', id:'aquitaine' };
    const proof = FB.authorityRecognize(s, { source:'imperial_commission',
      issuer:{ kind:'realm', id:'byzantium' }, subject:subject, scope:scope });
    const right = s.authority.rights.find(function (r) { return r.basisRef === proof.id && r.power === 'peace'; });
    FB.authorityYear(s);
    const strengthened = right.strength;
    FB.authorityRecognitionTransition(s, proof.id, 'revoke');
    const replacement = FB.authorityRecognize(s, { source:'church_support',
      issuer:{ kind:'religious-office', id:'rome_bishop' }, subject:subject, scope:scope });
    s.date.year++; s.turn += 360; FB.authorityYear(s);
    const after = right.strength;
    const renewed = FB.authorityRecognize(s, { source:'imperial_commission',
      issuer:{ kind:'realm', id:'byzantium' }, subject:subject, scope:scope });
    const newEvidence = right.basisRef === renewed.id;
    const privatePerson = FB.makeCharacter(s, { name:'Recognized observer', culture:'roman', religion:'nicene',
      sex:'m', born:450, station:1, traitsN:0 });
    const outsider = FB.authorityRecognize(s, { source:'civic_acceptance', issuer:scope,
      subject:{ kind:'character', id:privatePerson.id }, scope:scope });
    return { strengthened:strengthened, after:after, replacement:!!replacement, newEvidence:newEvidence,
      privateRecognition:!!outsider, noInventedPower:!s.authority.rights.some(function (r) {
        return r.basisRef === outsider.id;
      }), noBan:s.authority.rights.every(function (r) { return r.power !== 'ban'; }) };
  });
  expect(result).toEqual({ strengthened:65, after:50, replacement:true,
    newEvidence:true, privateRecognition:true, noInventedPower:true, noBan:true });
});

test('Homoian government treatment changes Popular support and actual civic consent without converting communities', async function ({ page }, testInfo) {
  await startWorld(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, g = FB.political.governingIdentity(s, 'aquitaine');
    const values = { eliteCultureId:g.eliteCultureId, eliteFaithId:g.eliteFaithId,
      legalIdentityId:g.legalIdentityId, tolerance:'persecution', taxation:'discriminatory', justicePolicy:'elite' };
    const communities = JSON.stringify(s.population);
    const consent = FB.political.power(s, { kind:'realm', id:'aquitaine' }, 'consent', { provinceId:'toulouse' }).allowed;
    FB.authoritySetIdentity(s, 'aquitaine', values);
    FB.setCountySupport(s, 'toulouse', -20);
    const harsh = FB.political.communityGovernance(s, 'toulouse');
    const rejected = FB.political.permission(s, { kind:'realm', id:'aquitaine' }, 'civic_agreement', { provinceId:'toulouse' });
    FB.authorityYear(s);
    const support = FB.countySupportBase(s, 'toulouse');
    values.tolerance = 'tolerant'; values.taxation = 'equal'; values.justicePolicy = 'personal';
    FB.authoritySetIdentity(s, 'aquitaine', values);
    const tolerant = FB.political.communityGovernance(s, 'toulouse');
    FB.setCountySupport(s, 'toulouse', -20);
    const accepted = FB.political.permission(s, { kind:'realm', id:'aquitaine' }, 'civic_agreement', { provinceId:'toulouse' });
    return { consent:consent, harsh:harsh.annualSupport, support:support, tolerant:tolerant.annualSupport,
      reason:rejected.reason, accepted:accepted.allowed, preserved:communities === JSON.stringify(s.population) };
  });
  expect(result).toMatchObject({ consent:true, reason:'community_opposition', accepted:true, preserved:true });
  expect(result.harsh).toBeCloseTo(-8.8, 2);
  expect(result.support).toBeCloseTo(-28.8, 2);
  expect(result.tolerant).toBeCloseTo(1.6, 2);
});

for (const distribution of ['standard', 'crazygames']) {
  test(distribution + ' selects Roman, Gothic and mixed courts through actual sentences and judgment rights', async function ({ page }, testInfo) {
    if (distribution === 'crazygames') {
      await mockCrazyGames(page);
      await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    }
    await startWorld(page, testInfo, '476', distribution === 'crazygames');
    const result = await page.evaluate(function () {
      const s = FB.state, actor = FB.materializeRealmRuler(s, 'aquitaine');
      function party(culture) {
        const c = FB.makeCharacter(s, { name:'Court party', culture:culture, religion:'nicene',
          sex:'m', born:450, station:1, traitsN:0 });
        c.homeProvinceId = 'toulouse'; c.wealth = 500; c.traits = []; return c;
      }
      const roman = party('roman'), gothic = party('gothic'), victim = party('roman');
      const before = JSON.stringify(s), rng = FB.getRngState();
      const own = FB.justiceTradition(s, actor.id, 'secular', { accusedId:roman.id, otherPartyId:victim.id });
      const mixed = FB.justiceTradition(s, actor.id, 'secular', { accusedId:gothic.id, otherPartyId:victim.id });
      const religious = FB.justiceTradition(s, actor.id, 'religious', { accusedId:roman.id });
      const pure = JSON.stringify(s) === before && FB.getRngState() === rng;
      const offense = FB.justiceRecordOffense(s, actor.id, gothic.id, 'blackmail', 'material', true, victim.id);
      FB.captureIntrigue(s, actor.id, gothic.id, 'judicial', 'aquitaine');
      const projection = FB.justicePunishmentProjection(s, actor.id, gothic.id, 'fine', offense.id);
      const applied = FB.justiceApplyPunishment(s, actor.id, gothic.id, 'fine', offense.id);
      const right = s.authority.rights.find(function (r) { return r.basis === 'judgment' && r.basisRef === offense.id; });
      const rightOnce = JSON.stringify(right);
      const repeat = FB.authorityJudgment(s, { kind:'realm', id:'aquitaine' }, 'toulouse', offense.id);
      const severe = FB.justiceRecordOffense(s, actor.id, roman.id, 'assassination', 'redhanded', true, victim.id);
      FB.captureIntrigue(s, actor.id, roman.id, 'judicial', 'aquitaine');
      const options = FB.justiceSentenceOptions(s, actor.id, roman.id);
      return { own:own.id, mixed:mixed.id, assessor:mixed.assessorId, religious:religious.source,
        pure:pure, selected:projection.traditionId, applied:applied.ok, closed:offense.closed,
        right:!!right, repeat:repeat, unchanged:rightOnce === JSON.stringify(right),
        noBlinding:options.every(function (p) { return p.sentence !== 'blinding_deposition'; }),
        safe:!FB.platform.isCrazyGames || options.every(function (p) {
          return ['death','corporal'].indexOf(FBDATA.justiceSentences[p.sentence].kind) < 0;
        }) };
    });
    expect(result).toEqual({ own:'late_roman', mixed:'gothic_custom', assessor:'late_roman', religious:'faith',
      pure:true, selected:'gothic_custom', applied:true, closed:true, right:true, repeat:false, unchanged:true,
      noBlinding:true, safe:true });
  });
}

test('identity reviews recheck same-day community, territory and policy changes and survive save restore', async function ({ page }, testInfo) {
  await startWorld(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, g = FB.political.governingIdentity(s, 'aquitaine');
    const value = { eliteCultureId:'gothic', eliteFaithId:'homoian', legalIdentityId:'gothic_custom',
      tolerance:'tolerant', taxation:'equal', justicePolicy:'personal' };
    const quote = FB.political.identityQuote(s, 'aquitaine', value), rng = FB.getRngState();
    FB.adjustCountySupport(s, 'toulouse', -1);
    const before = JSON.stringify(s), stale = FB.authorityApplyIdentity(s, quote);
    const unchanged = before === JSON.stringify(s) && rng === FB.getRngState();
    function staleAfter(change, undo) {
      const reviewed = FB.political.identityQuote(s, 'aquitaine', value);
      change();
      const snapshot = JSON.stringify(s), savedRng = FB.getRngState();
      const rejected = !FB.authorityApplyIdentity(s, reviewed);
      const pure = snapshot === JSON.stringify(s) && savedRng === FB.getRngState();
      undo();
      return rejected && pure;
    }
    const community = s.population.counties.toulouse.communities[0];
    const staleCommunity = staleAfter(function () { community.count--; }, function () { community.count++; });
    const oldPolicy = s.authority.governments.aquitaine.tolerance;
    const stalePolicy = staleAfter(function () { s.authority.governments.aquitaine.tolerance = 'persecution'; },
      function () { s.authority.governments.aquitaine.tolerance = oldPolicy; });
    const staleTerritory = staleAfter(function () { s.holder.toulouse = 'italy'; FB.invalidateRealmCache(); },
      function () { s.holder.toulouse = 'aquitaine'; FB.invalidateRealmCache(); });
    const applied = FB.authorityApplyIdentity(s, FB.political.identityQuote(s, 'aquitaine', value));
    FB.authoritySetGovernment(s, 'aquitaine', 'roman_civic');
    const retained = FB.political.governingIdentity(s, 'aquitaine').eliteCultureId === 'gothic';
    const encoded = JSON.parse(FB.save.serialize()), snapshot = JSON.stringify(encoded.state.authority);
    const invalid = ['legalIdentityId','tolerance','taxation','justicePolicy'].map(function (key) {
      const broken = JSON.parse(JSON.stringify(encoded));
      broken.state.authority.governments.aquitaine[key] = 'missing';
      try { FB.save.v4.migrate(broken); return false; } catch (_) { return true; }
    });
    FB.save.restore(encoded);
    return { stale:stale, unchanged:unchanged, staleCommunity:staleCommunity, stalePolicy:stalePolicy,
      staleTerritory:staleTerritory, applied:applied, retained:retained, invalid:invalid,
      restored:JSON.stringify(FB.state.authority) === snapshot,
      law:FB.political.governingIdentity(FB.state, 'aquitaine').legalIdentityId };
  });
  expect(result).toEqual({ stale:false, unchanged:true, staleCommunity:true, stalePolicy:true,
    staleTerritory:true, applied:true, retained:true,
    invalid:[true,true,true,true], restored:true, law:'gothic_custom' });
});

test('personal and mixed jurisdiction enforce their selected procedures and reject malformed rules', async function ({ page }, testInfo) {
  await startWorld(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, actor = FB.materializeRealmRuler(s, 'aquitaine');
    function person(culture) {
      const c = FB.makeCharacter(s, { name:'Jurisdiction party', culture:culture, religion:'nicene',
        sex:'m', born:450, station:1, traitsN:0 });
      c.homeProvinceId = 'toulouse'; return c;
    }
    const roman = person('roman'), goth = person('gothic'), victim = person('roman');
    FBDATA.legalTraditions.late_roman.procedures.arrest = false;
    const romanOffense = FB.justiceRecordOffense(s, actor.id, roman.id, 'blackmail', 'material', true, victim.id);
    const gothicOffense = FB.justiceRecordOffense(s, actor.id, goth.id, 'blackmail', 'material', true, victim.id);
    const romanCourt = FB.justiceArrestProjection(s, actor.id, roman.id, romanOffense.id);
    const mixedCourt = FB.justiceArrestProjection(s, actor.id, goth.id, gothicOffense.id);
    const g = FB.political.governingIdentity(s, 'aquitaine');
    FB.authoritySetIdentity(s, 'aquitaine', Object.assign({}, g, { justicePolicy:'elite' }));
    const imposed = FB.justiceArrestProjection(s, actor.id, roman.id, romanOffense.id);
    const tables = JSON.parse(JSON.stringify(FBDATA.legalTraditions));
    tables.gothic_custom.jurisdiction.mixed = 'missing';
    const badCourt = FB.validateLegalTraditions(tables).length > 0;
    tables.gothic_custom.jurisdiction.mixed = 'gothic_custom';
    tables.gothic_custom.jurisdiction.cultures.missing = 'late_roman';
    return { roman:romanCourt.blocker, mixed:mixedCourt.ready, imposed:imposed.ready,
      badCourt:badCourt, badCulture:FB.validateLegalTraditions(tables).length > 0,
      missing:FB.political.civicConsent(s, null).reason };
  });
  expect(result).toEqual({ roman:'procedure', mixed:true, imposed:true,
    badCourt:true, badCulture:true, missing:'missing_scope' });
});

for (const bookmark of ['867','1066']) {
  test(bookmark + ' retains undeclared identity and baseline community treatment', async function ({ page }, testInfo) {
    await startWorld(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = 'london', before = JSON.stringify(s), rng = FB.getRngState();
      const local = FB.political.communityGovernance(s, pid);
      const query = FB.political.civicConsent(s, pid);
      return { declared:local.identity.declared, delta:local.annualSupport, consent:query.allowed,
        pure:JSON.stringify(s) === before && FB.getRngState() === rng };
    });
    expect(result).toEqual({ declared:false, delta:0, consent:true, pure:true });
  });
}

for (const width of [1280, 390]) {
  test('governing review retains form and focus on return at width ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:900 });
    await startWorld(page, testInfo);
    await page.evaluate(function () {
      const s = FB.state, home = 'toulouse';
      FB.game.observe = false; s.player.dead = false;
      document.body.classList.remove('observing');
      s.player.provinceId = home; s.player.provs = [home]; s.player.liege = null;
      FB.setPlayerTier(s, 4, { attachLiege:false }); FB.foundPlayerRealm(s);
      s.owner[home] = 'player'; s.holder[home] = 'player'; FB.invalidateRealmCache();
      FB.ui.showGovernance('position');
    });
    await page.locator('#governance-identity').click();
    await page.locator('#identity-eliteCultureId').selectOption('gothic');
    await page.locator('#identity-eliteFaithId').selectOption('homoian');
    await page.locator('#identity-legalIdentityId').selectOption('gothic_custom');
    await page.locator('#identity-tolerance').selectOption('persecution');
    await page.locator('#identity-review').click();
    await expect(page.locator('#gm-body')).toContainText('Annual support:');
    await expect(page.locator('#identity-confirm')).toContainText('No payment or time cost');
    await page.locator('#identity-cancel').click();
    await expect(page.locator('#identity-tolerance')).toHaveValue('persecution');
    await expect(page.locator('#identity-review')).toBeFocused();
    await page.locator('#identity-review').click();
    await page.evaluate(function () { FB.adjustCountySupport(FB.state, 'toulouse', -1); });
    await page.locator('#identity-confirm').click();
    await expect(page.locator('#identity-confirm')).toBeVisible();
    expect(await page.evaluate(function () {
      return FB.political.governingIdentity(FB.state, 'player').declared;
    })).toBe(false);
    await page.locator('#identity-cancel').click();
    await page.locator('#identity-review').click();
    await page.locator('#identity-confirm').click();
    expect(await page.evaluate(function () {
      return FB.political.governingIdentity(FB.state, 'player').tolerance;
    })).toBe('persecution');
  });
}
