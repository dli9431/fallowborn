'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame, FRESH_JOURNEYS } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/government_selection.js', 'js/government_lineage.js', 'js/governments.js',
  'data/aristocratic_courts.js', 'js/government_aristocracy.js', 'js/government_recognition.js', 'js/government_administration.js', 'js/bookmark_setup.js',
  'js/government_levy.js', 'js/government_revenue.js', 'js/government_continuity.js',
  'js/world.js', 'js/model.js', 'js/main.js', 'js/starts.js', 'js/station.js', 'js/actions.js',
  'js/authority.js', 'js/politics.js', 'js/institutions.js', 'js/modifiers.js', 'js/treasury.js', 'js/justice.js',
  'js/fiscal.js', 'js/lordships.js', 'js/wars.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_modals.js', 'js/stories.js', 'js/story_government_selection.js',
  'data/bookmark_476_outer.js', 'data/political_institutions.js', 'data/technology.js',
  'data/lexicons.js', 'data/actions.js', 'data/story_instances.js'
]);

async function start(page, testInfo, fictional) {
  await openGame(page, testInfo);
  if (fictional) {
    await page.addScriptTag({ path:path.resolve(__dirname, '../fixtures/lineage-kingship.js') });
    await page.evaluate(function () {
      const f = FB_LINEAGE_FIXTURE;
      FBDATA.governmentForms[f.formId] = Object.assign({}, FBDATA.governmentForms.lineage_kingship, { selectionProfile:f.profile });
      const row = FBDATA.bookmarks['476_outer'].realms.find(function (r) { return r.id === f.realmId; });
      Object.assign(row, { name:'River Kin Fixture', government:f.formId, ruler:f.ruler, royalCourt:f.royalCourt });
      FB.governments.invalidate();
    });
  }
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('LINEAGE-476_outer-farmer_476_outer-cashel-m-Review-established-0-gaelic.nicene');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const fictional of [false, true]) {
  test((fictional ? 'fictional river kin' : '476 Cashel') + ' uses declared eligibility, pure reviews and one accession', async function ({ page }, testInfo) {
    await start(page, testInfo, fictional);
    const result = await page.evaluate(function (fictional) {
      const s = FB.state, S = FB.governmentSelection, rid = fictional ? FB_LINEAGE_FIXTURE.realmId : 'cashel_local_476';
      const t = s.realms[rid].succession, p = S.profile(s, rid), actor = { kind:'realm', id:rid };
      FB.realmHeldCounties(s, rid).forEach(function (pid) { FB.setCountySupport(s, pid, 40); });
      FB.treasuryCredit(s, rid, 50);
      const opening = S.quote(s, rid, { action:'open', actor:actor, cause:'abdication' });
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      for (let i = 0; i < 8; i++) { S.constituency(s, rid); S.candidates(s, rid); S.recognized(s, rid); S.quote(s, rid, opening.request); }
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const candidates = S.candidates(s, rid), sexes = candidates.map(function (id) { return t.members[id].sex; });
      const minimum = candidates.every(function (id) { return s.date.year - t.members[id].born >= p.eligibility.minAge; });
      const owner = JSON.stringify(s.owner), holder = JSON.stringify(s.holder), property = JSON.stringify(s.player.holdings), gen = t.rulerGeneration;
      const opened = S.apply(s, opening), cash = FB.treasuryAvailable(s, rid), playerGold = s.player.gold;
      const negotiated = S.apply(s, S.quote(s, rid, { action:'negotiate', actor:actor, candidateId:candidates[0], terms:p.terms }));
      const charged = cash - FB.treasuryAvailable(s, rid);
      const review = S.quote(s, rid, { action:'resolve', actor:actor }), winner = review.winnerId;
      const resolved = S.apply(s, review), after = JSON.stringify(s), duplicate = S.apply(s, review);
      const source = JSON.parse(FB.save.serialize());
      FB.save.restore(source);
      return { pure:pure, minimum:minimum, sexes:sexes, opened:opened, negotiated:negotiated, charged:charged, cost:p.negotiationCost,
        resolved:resolved, duplicate:duplicate, duplicatePure:after === JSON.stringify(s), playerPurse:s.player.gold === playerGold,
        winner:winner, expected:candidates[0], generation:t.rulerGeneration === gen + 1,
        preserved:owner === JSON.stringify(s.owner) && holder === JSON.stringify(s.holder) && property === JSON.stringify(s.player.holdings),
        restored:S.state(FB.state, rid).vacancy.accessionId === winner && S.recognized(FB.state, rid),
        rng:(FB.getRngState() >>> 0) === (source.rng >>> 0), uid:FB.getUidCounter() === source.uid,
        forms:FB.governments.validate(), bookmark:FB.validateBookmark(FB.bookmark('476_outer')) };
    }, fictional);
    expect(result.pure).toBe(true); expect(result.minimum).toBe(true);
    if (fictional) expect(result.sexes).toEqual(['f', 'f']);
    expect(result.opened && result.negotiated && result.resolved).toBe(true);
    expect(result.charged).toBe(result.cost); expect(result.playerPurse).toBe(true);
    expect(result.winner).toBe(result.expected); expect(result.generation).toBe(true);
    expect(result.duplicate).toBe(false); expect(result.duplicatePure).toBe(true);
    expect(result.preserved && result.restored && result.rng && result.uid).toBe(true);
    expect(result.forms).toEqual([]); expect(result.bookmark).toEqual([]);
  });
}

test('changed funds, principals, support and candidates reject without spending or allocating', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476', actor = { kind:'realm', id:rid };
    const t = s.realms[rid].succession;
    FB.setCountySupport(s, 'cashel', 40); FB.treasuryCredit(s, rid, 100);
    S.apply(s, S.quote(s, rid, { action:'open', actor:actor, cause:'abdication' }));
    const id = S.candidates(s, rid)[0], p = S.profile(s, rid), outcomes = [];
    [function () { FB.treasurySpend(s, rid, 1); },
      function () { FB.setCountySupport(s, 'cashel', 39); },
      function () { S.state(s, rid).members[0].weight++; },
      function () { t.members[id].alive = false; if (t.members[id].charId) s.chars[t.members[id].charId].dead = true; }
    ].forEach(function (change) {
      const q = S.quote(s, rid, { action:'negotiate', actor:actor, candidateId:id, terms:p.terms });
      change();
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      outcomes.push(!S.apply(s, q) && before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter());
    });
    return outcomes;
  });
  expect(result).toEqual([true, true, true, true]);
});

test('candidates cannot force abdication; a current lawful judgment can open displacement', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476';
    const id = S.candidates(s, rid)[0], c = FB.materializeRoyalChild(s, rid, id), actor = { kind:'character', id:c.id };
    const abdication = S.quote(s, rid, { action:'open', cause:'abdication', actor:actor, candidateId:id });
    const unsupported = S.quote(s, rid, { action:'open', cause:'lawful_removal', actor:actor, candidateId:id });
    const ruler = FB.realmRulerCharacterSnapshot(s, rid);
    s.justice = s.justice || {};
    s.justice.last = { actorId:s.player.charId, targetId:ruler.id, justified:true, turn:s.turn,
      sentence:Object.keys(FBDATA.justiceSentences).find(function (key) { return FBDATA.justiceSentences[key].kind === 'corporal'; }) };
    const review = S.quote(s, rid, { action:'open', cause:'lawful_removal', actor:actor, candidateId:id });
    const property = JSON.stringify(s.player.holdings), opened = S.apply(s, review);
    return { abdication:abdication.allowed, unsupported:unsupported.allowed, opened:opened,
      cause:S.state(s, rid).vacancy.cause, property:property === JSON.stringify(s.player.holdings) };
  });
  expect(result).toEqual({ abdication:false, unsupported:false, opened:true, cause:'lawful_removal', property:true });
});

test('large canonical kin pools produce a stable bounded candidate projection without allocation', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476', t = s.realms[rid].succession;
    for (let i = 0; i < 80; i++) {
      const id = 'royal_fixture_bounded_' + i;
      t.members[id] = { id:id, name:'Fixture Kin ' + i, sex:'m', born:450, alive:true, fatherId:t.founderId,
        parentId:t.founderId, culture:'gaelic', religion:'nicene', mar:5 };
    }
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const first = S.candidates(s, rid), again = S.candidates(s, rid);
    return { size:first.length, stable:JSON.stringify(first) === JSON.stringify(again),
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ size:64, stable:true, pure:true });
});

test('divided recognition, minority, empty kin and coercion retain the court without invented heirs', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476', actor = { kind:'realm', id:rid };
    const t = s.realms[rid].succession, gen = t.rulerGeneration;
    FB.setCountySupport(s, 'cashel', 40);
    S.apply(s, S.quote(s, rid, { action:'open', actor:actor, cause:'abdication' }));
    const ids = S.candidates(s, rid), rows = S.constituency(s, rid), p = S.profile(s, rid);
    rows.forEach(function (m, i) { S.apply(s, S.quote(s, rid, { action:'support', actor:{ kind:'constituency', realmId:rid, id:m.id },
      memberId:m.id, candidateId:ids[i], terms:p.terms })); });
    const contested = S.state(s, rid).vacancy.status, winner = S.winner(s, rid);
    s.realms[rid].liege = 'dumnonia_476';
    const coercion = S.quote(s, rid, { action:'negotiate', actor:actor, candidateId:ids[0], terms:p.terms }).responses.every(function (r) { return r.reason === 'external_coercion'; });
    s.realms[rid].liege = null;
    ids.forEach(function (id) { t.members[id].born = s.date.year - 10; if (t.members[id].charId) s.chars[t.members[id].charId].born = t.members[id].born; });
    S.ai(s, rid); const minority = S.state(s, rid).vacancy.status;
    ids.forEach(function (id) { t.members[id].alive = false; if (t.members[id].charId) s.chars[t.members[id].charId].dead = true; });
    delete S.state(s, rid).lastPeriod;
    const count = Object.keys(t.members).length, uid = FB.getUidCounter();
    S.ai(s, rid); FB.refreshRealmSuccession(s, rid);
    return { contested:contested, winner:winner, coercion:coercion, minority:minority, vacant:S.state(s, rid).vacancy.status,
      generation:t.rulerGeneration === gen, bounded:Object.keys(t.members).length === count && uid === FB.getUidCounter(),
      controlled:s.owner.cashel === rid && s.holder.cashel === rid,
      ban:FB.political.power(s, actor, 'ban', { provinceId:'cashel' }).allowed };
  });
  expect(result).toEqual({ contested:'contested', winner:null, coercion:true, minority:'minority', vacant:'vacant', generation:true, bounded:true, controlled:true, ban:false });
});

test('conquest needs enrollment and separate assent; transformation preserves property and commitments', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476', actor = { kind:'realm', id:rid };
    FB.setCountySupport(s, 'cashel', 40); FB.treasuryCredit(s, rid, 100);
    FB.transferProvince(s, 'exeter', rid); FB.setCountySupport(s, 'exeter', 40);
    s.buildings.exeter = [{ id:'market', settlement:0 }];
    const occupied = S.recognized(s, rid, 'exeter');
    const unpaid = FB.settlementFiscalProjection(s, 'exeter', 0).amounts;
    const enrolled = S.apply(s, S.quote(s, rid, { action:'enroll', actor:actor, provinceId:'exeter' }));
    const afterEnrollment = S.recognized(s, rid, 'exeter');
    const id = s.realms[rid].succession.rulerMemberId;
    const assent = S.apply(s, S.quote(s, rid, { action:'assent', actor:actor, candidateId:id, terms:S.profile(s, rid).terms }));
    const recognized = S.recognized(s, rid, 'exeter');
    const paid = FB.settlementFiscalProjection(s, 'exeter', 0).amounts;
    const kept = JSON.stringify([s.owner, s.holder, s.player.holdings, s.authority.rights, s.authority.contracts, s.localInstitutions]);
    const transform = S.quote(s, rid, { action:'transform', actor:actor, formId:'regnum' });
    const direct = FB.authoritySetGovernment(s, rid, 'regnum');
    const changed = S.apply(s, transform);
    return { occupied:occupied, enrolled:enrolled, afterEnrollment:afterEnrollment, assent:assent, recognized:recognized,
      direct:direct, changed:changed, form:FB.governments.forRealm(s, rid).id,
      publicReceipts:unpaid.tax === 0 && unpaid.tolls === 0 && paid.tax > 0 && paid.tolls > 0,
      kept:kept === JSON.stringify([s.owner, s.holder, s.player.holdings, s.authority.rights, s.authority.contracts, s.localInstitutions]) };
  });
  expect(result).toEqual({ occupied:false, enrolled:true, afterEnrollment:false, assent:true, recognized:true, direct:false, changed:true, form:'regnum', publicReceipts:true, kept:true });
});

test('optional save state stays absent and malformed selection fails on a detached copy', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const S = FB.governmentSelection, rid = 'cashel_local_476', source = JSON.parse(FB.save.serialize());
    const bad = [function (d) { d.members[0] = null; }, function (d) { d.members[0].weight = 99; },
      function (d) { d.members.push(d.members[0]); }, function (d) { d.roots = ['missing_kin']; },
      function (d) { d.schema = 2; }, function (d) { d.recognition.terms.revenue = 2; }];
    const failures = bad.map(function (alter) {
      const input = JSON.parse(JSON.stringify(source)); alter(input.state.authority.governments[rid].selection);
      const text = JSON.stringify(input), before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
      let rejected = false; try { FB.save.v4.migrate(input); } catch (error) { rejected = /selection/.test(error.message); }
      return rejected && text === JSON.stringify(input) && before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    const old = JSON.parse(JSON.stringify(source)); delete old.state.authority.governments[rid].selection;
    const members = JSON.stringify(old.state.realms[rid].succession.members);
    const once = FB.save.v4.migrate(old), twice = FB.save.v4.migrate(once);
    FB.save.restore(once);
    return { failures:failures, absent:!S.state(FB.state, rid), idempotent:JSON.stringify(once) === JSON.stringify(twice),
      genealogy:members === JSON.stringify(FB.state.realms[rid].succession.members),
      rng:(FB.getRngState() >>> 0) === (source.rng >>> 0), uid:FB.getUidCounter() === source.uid };
  });
  expect(result.failures).toEqual([true, true, true, true, true, true]);
  expect(result.absent && result.idempotent && result.genealogy && result.rng && result.uid).toBe(true);
});

test('commoners can improve standing but cannot buy lineage; the review retains navigation', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const p = FB.station.promotion(s.player, s);
    FB.ui.showLocalKingship();
    return { route:p && p.route, county:FB.station.maySeekCounty({ tier:3, formId:'lineage_kingship' }, s),
      outsider:S.candidates(s, 'cashel_local_476', true).every(function (id) { return s.realms.cashel_local_476.succession.members[id].charId !== s.player.charId; }),
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ route:'standing', county:false, outsider:true, pure:true });
  await expect(page.locator('#gm-title')).toHaveText('Local kingship');
  await expect(page.locator('[data-lineage-review="abdicate"]')).toBeDisabled();
  await expect(page.locator('#gm-body')).toContainText('Local households');
  await page.keyboard.press('Escape');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
});

test('natural death opens one bounded AI round and a later season can resolve a refusal', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476';
    const ruler = FB.materializeRealmRuler(s, rid), t = s.realms[rid].succession, gen = t.rulerGeneration;
    FB.treasuryCredit(s, rid, 100); FB.setCountySupport(s, 'cashel', -100);
    const gold = s.player.gold, properties = JSON.stringify(s.player.holdings), count = Object.keys(t.members).length;
    FB.killChar(s, ruler);
    const data = S.state(s, rid), cash = FB.treasuryAvailable(s, rid), first = JSON.stringify(data);
    for (let i = 0; i < 20; i++) S.ai(s, rid);
    const bounded = first === JSON.stringify(data) && cash === FB.treasuryAvailable(s, rid) && Object.keys(t.members).length === count;
    const contested = data.vacancy.status === 'contested' && t.rulerGeneration === gen;
    s.turn += 90; FB.setCountySupport(s, 'cashel', 40); S.ai(s, rid);
    return { cause:data.vacancy.cause, bounded:bounded, contested:contested, resolved:data.vacancy.status === 'resolved',
      once:t.rulerGeneration === gen + 1, properties:properties === JSON.stringify(s.player.holdings), playerGold:gold === s.player.gold,
      charged:cash - FB.treasuryAvailable(s, rid) === S.profile(s, rid).negotiationCost };
  });
  expect(result).toEqual({ cause:'death', bounded:true, contested:true, resolved:true, once:true, properties:true, playerGold:true, charged:true });
});

test('a selected protagonist adopts the canonical court and abdication preserves personal property', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476';
    FB.setCountySupport(s, 'cashel', 40); FB.treasuryCredit(s, rid, 50);
    const candidateId = S.candidates(s, rid)[0], candidate = FB.materializeRoyalChild(s, rid, candidateId);
    FB.game.succeedTo(candidate.id, { livingAbdication:true }); FB.ui.closeModal(); FB.game.setPaused(true);
    const actor = { kind:'realm', id:rid };
    S.apply(s, S.quote(s, rid, { action:'open', actor:actor, cause:'abdication' }));
    S.apply(s, S.quote(s, rid, { action:'negotiate', actor:actor, candidateId:candidateId, terms:S.profile(s, rid).terms }));
    const resolved = S.apply(s, S.quote(s, rid, { action:'resolve', actor:actor }));
    const adopted = S.recognized(s, 'player') && s.realms.player.succession.rulerMemberId === candidateId;
    const adoptedSave = FB.save.v4.migrate(JSON.parse(FB.save.serialize()));
    const adoptedValid = adoptedSave.state.authority.governments.player.selection.originRealmId === rid;
    const purse = s.player.gold, property = JSON.stringify(s.player.holdings);
    const abdicated = S.apply(s, S.quote(s, 'player', { action:'open', actor:{ kind:'realm', id:'player' }, cause:'abdication' }));
    const serialized = JSON.parse(FB.save.serialize()); FB.save.restore(serialized);
    return { resolved:resolved, adopted:adopted, adoptedValid:adoptedValid, abdicated:abdicated, separate:!FB.state.realms.player && !!S.state(FB.state, rid),
      property:property === JSON.stringify(FB.state.player.holdings), purse:purse === FB.state.player.gold,
      story:FB.state.stories.cashel_recognition_476.realmId === rid };
  });
  expect(result).toEqual({ resolved:true, adopted:true, adoptedValid:true, abdicated:true, separate:true, property:true, purse:true, story:true });
});

test('candidate review returns with the same terms and rejects a stale confirmation', async function ({ page }, testInfo) {
  await start(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'cashel_local_476';
    const c = FB.materializeRoyalChild(s, rid, S.candidates(s, rid)[0]);
    FB.game.succeedTo(c.id, { livingAbdication:true }); FB.ui.closeModal(); FB.game.setPaused(true);
    s.player.gold = 100;
    S.apply(s, S.quote(s, rid, { action:'open', actor:{ kind:'realm', id:rid }, cause:'abdication' }));
    FB.ui.showLocalKingship({ realmId:rid });
  });
  await page.locator('#lineage-terms').selectOption('1');
  await page.locator('[data-lineage-review="negotiate"]').click();
  await expect(page.locator('#gm-title')).toHaveText('Review local kingship decision');
  await page.keyboard.press('Escape');
  await expect(page.locator('#lineage-terms')).toHaveValue('1');
  await expect(page.locator('[data-lineage-review="negotiate"]')).toBeFocused();
  await page.locator('[data-lineage-review="negotiate"]').click();
  await page.evaluate(function () { FB.adjustCountySupport(FB.state, 'cashel', -1); });
  await page.locator('#lineage-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Terms changed');
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(100);
  await page.locator('#lineage-continue').click();
  await expect(page.locator('#lineage-terms')).toHaveValue('1');
});

test('canonical selection adapters observe existing owners and reject stale acknowledgments', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const officeId = Object.keys(FB.religiousOffices(s)).find(function (id) { return !!FB.religiousOfficeSnapshot(s, id); });
    const religious = S.reviewSource(s, 'religious_office_result', { officeId:officeId });
    const civic = S.reviewSource(s, 'civic_election', { electionId:'missing_election' });
    const crown = S.reviewSource(s, 'elective_crown', { realmId:'cashel_local_476', decision:{ action:'resolve', actor:{ kind:'realm', id:'cashel_local_476' } } });
    const administrative = S.reviewSource(s, 'administrative_appointment', { actor:{ kind:'character', id:s.player.charId },
      terms:{ institutionId:'cashel_local_476', officeId:'defensor_civitatis', holder:{ kind:'character', id:s.player.charId }, scope:{ kind:'county', id:'cashel' } } });
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const acknowledged = S.commitSource(s, religious);
    delete s.religiousHeads[officeId]; const changed = JSON.stringify(s);
    return { pure:pure, acknowledged:!!acknowledged, civic:civic.review.allowed, crown:crown.review.allowed,
      administrative:administrative.review.allowed, stale:S.commitSource(s, religious), untouched:changed === JSON.stringify(s) };
  });
  expect(result).toEqual({ pure:true, acknowledged:true, civic:false, crown:false, administrative:false, stale:false, untouched:true });
});

for (const bookmark of ['476', '867', '1066']) {
  test(bookmark + ' keeps its original government assignments and no selection initialization on restore', async function ({ page }, testInfo) {
    const journey = FRESH_JOURNEYS.find(function (r) { return r.bookmark === bookmark; });
    await startParityGame(page, testInfo, journey);
    const result = await page.evaluate(function () {
      const source = JSON.parse(FB.save.serialize()), before = JSON.stringify(source.state.authority.governments);
      FB.save.restore(source);
      return { absent:!Object.values(FB.state.authority.governments).some(function (r) { return r.selection; }),
        stable:before === JSON.stringify(FB.state.authority.governments),
        rng:(FB.getRngState() >>> 0) === (source.rng >>> 0), uid:FB.getUidCounter() === source.uid };
    });
    expect(result).toEqual({ absent:true, stable:true, rng:true, uid:true });
  });
}
