'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_instances.js',
  'data/story_courts_476.js',
  'data/political_institutions.js', 'data/actions.js', 'data/technology.js',
  'data/systems.js', 'data/eras.js', 'data/bookmarks.js', 'data/bookmark_476.js', 'data/government_rollout.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js', 'data/starts.js',
  'js/authority.js', 'js/governments.js', 'js/federates.js', 'js/actions.js',
  'js/story_courts.js', 'js/story_track.js', 'js/stories.js', 'js/systems.js', 'js/progression.js',
  'js/politics.js', 'js/world.js', 'js/model.js', 'js/treasury.js', 'js/justice.js',
  'js/main.js', 'js/lordships.js', 'js/armies.js',
  'js/ui_panels.js', 'js/ui_modals.js', 'js/ui_misc.js', 'js/save.js', 'js/save_v4.js',
  'js/i18n.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, bookmark = '476') {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(bookmark === '476'
    ? 'OFFICES476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
    : 'OFFICEPARITY-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

test('every period office grants exactly its declared powers without land', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, actor = { kind:'character', id:s.player.charId };
    const patron = { kind:'realm', id:'croatia' };
    s.armies.push({ id:'office-test-host', realm:'croatia', at:'split', men:80,
      units:{ levy:80 }, path:[], supply:100 });
    const land = JSON.stringify([s.owner,s.holder,s.player.provs,s.player.tier]);
    const outcomes = Object.keys(FBDATA.authorityOffices).filter(function (id) {
      return !!FBDATA.authorityOffices[id].appointment;
    }).map(function (id) {
      const def = FBDATA.authorityOffices[id];
      const at = def.scopes.includes('host') ? { kind:'host', id:'office-test-host' } :
        def.scopes.includes('realm') ? patron : { kind:'county', id:'split' };
      const row = FB.authorityAppoint(s, { officeId:id, institutionId:'croatia',
        appointer:patron, holder:actor, scope:at });
      const powers = ['ban','peace','revenue','consent'].filter(function (power) {
        return FB.political.power(s, actor, power, { hostId:'office-test-host', provinceId:'split' }).allowed;
      });
      const external = ['peace','revenue','consent'].some(function (power) {
        return FB.political.power(s, actor, power, { provinceId:'roma' }).allowed;
      });
      const listed = FB.political.grantedCounties(s, actor, 'peace');
      const removed = !!row && FB.authorityAppointmentTransition(s, row.id, 'remove');
      return { id:id, created:!!row, powers:powers, expected:def.powers,
        external:external, listed:listed, removed:removed };
    });
    return { outcomes:outcomes, sameLand:land === JSON.stringify([s.owner,s.holder,s.player.provs,s.player.tier]),
      errors:FB.validateAuthorityData(), reviews:[FBDATA.techImpactReviews.features.roman_office_petitions,
        FBDATA.techImpactReviews.features.imperial_claim_contestation].map(function (row) { return row.mode; }) };
  });
  expect(result.sameLand).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.reviews).toEqual(['none','none']);
  expect(result.outcomes.length).toBeGreaterThanOrEqual(20);
  for (const outcome of result.outcomes) {
    expect(outcome, outcome.id).toMatchObject({ created:true, external:false, removed:true });
    expect(outcome.powers.slice().sort(), outcome.id).toEqual(outcome.expected.slice().sort());
    expect(outcome.listed.includes('split'), outcome.id).toBe(outcome.expected.includes('peace'));
  }
});

test('appointment review is pure, rejects stale cost and charges once outside Ravenna', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], actor = { kind:'character', id:c.id };
    s.player.provinceId = 'split'; s.player.gold = 200; s.player.prestige = 200; c.skills.dip = 20;
    const terms = { institutionId:'croatia', officeId:'defensor_civitatis',
      holder:actor, scope:{ kind:'county', id:'split' } };
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.officeAppointmentQuote(s, actor, terms);
    FB.officeCourts(s); FB.officeClaimants(s); FB.officeRecognitionMandates(s, actor);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.gold++;
    const staleBefore = JSON.stringify(s);
    const stale = FB.officeSeekAppointment(s, q);
    const stalePure = staleBefore === JSON.stringify(s);
    const current = FB.officeAppointmentQuote(s, actor, terms);
    const appointment = FB.officeSeekAppointment(s, current);
    const after = JSON.stringify(s), gold = s.player.gold;
    const duplicate = FB.officeSeekAppointment(s, current);
    return { allowed:q.allowed, pure:pure, stale:stale, stalePure:stalePure,
      created:!!appointment, gold:gold, cost:current.cost, prestige:s.player.prestige,
      duplicate:duplicate, unchanged:JSON.stringify(s) === after,
      peace:FB.political.power(s, actor, 'peace', { provinceId:'split' }).allowed,
      command:FB.political.power(s, actor, 'ban', { hostId:'host_476_italy' }).allowed };
  });
  expect(result).toEqual({ allowed:true, pure:true, stale:false, stalePure:true,
    created:true, gold:191, cost:10, prestige:200, duplicate:false, unchanged:true, peace:true, command:false });
});

test('succession suspends civil powers, keeps personal honors, and annual consulship expires', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], actor = { kind:'character', id:c.id };
    s.player.provinceId = 'split'; s.player.gold = 1000; s.player.prestige = 200;
    c.skills.dip = 20; c.skills.ste = 20;
    const seek = function (id) {
      return FB.officeSeekAppointment(s, FB.officeAppointmentQuote(s, actor,
        { institutionId:'croatia', officeId:id, holder:actor, scope:{ kind:'realm', id:'croatia' } }));
    };
    const prefect = seek('praetorian_prefect'), honor = seek('patricius'), consul = seek('consul');
    const generation = FB.realmRulerGeneration(s, 'croatia');
    s.realms.croatia.ruler.generation = generation + 1;
    const suspended = !FB.political.power(s, actor, 'peace', { provinceId:'split' }).allowed;
    const continuing = FB.political.offices(s, actor).find(function (row) { return row.ref.appointmentId === honor.id; }).status;
    const reaffirm = FB.officeTransitionQuote(s, { kind:'realm', id:'croatia' }, prefect.id, 'confirm');
    const confirmed = FB.officeTransition(s, reaffirm);
    const restored = FB.political.power(s, actor, 'peace', { provinceId:'split' }).allowed;
    s.turn = consul.endTurn;
    // Expiration cleanup is separate from the AI appointment assertions below.
    s.officeCourtPeriod = Math.floor(s.turn / 90);
    FB.authoritySeason(s);
    return { suspended:suspended, honor:continuing, confirmed:confirmed, restored:restored,
      consul:s.authority.appointments.find(function (row) { return row.id === consul.id; }).status,
      inherited:FB.political.offices(s, { kind:'character', id:c.childrenIds[0] }).some(function (row) {
        return row.ref.source === 'authority.appointments';
      }) };
  });
  expect(result).toEqual({ suspended:true, honor:'active', confirmed:true, restored:true, consul:'expired', inherited:false });
});

test('an ordinary kingdom cannot create imperial honors from its own commission', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, ruler = FB.materializeRealmRuler(s, 'franks_476');
    const actor = { kind:'realm', id:'franks_476' };
    const before = JSON.stringify(s), rng = FB.getRngState();
    const q = FB.officeAppointmentQuote(s, actor, { institutionId:actor.id,
      officeId:'patricius', holder:{ kind:'character', id:ruler.id }, scope:actor });
    return { allowed:q.allowed, reason:q.reason, apply:FB.officeSeekAppointment(s, q),
      pure:before === JSON.stringify(s) && rng === FB.getRngState() };
  });
  expect(result).toEqual({ allowed:false,
    reason:'This honor or senior command needs an appointing ruler with a live imperial claim.', apply:false, pure:true });
});

test('conquest removes a prefect’s jurisdiction immediately before seasonal cleanup', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, me = { kind:'character', id:s.player.charId }, patron = { kind:'realm', id:'croatia' };
    FB.authorityAppoint(s, { officeId:'praetorian_prefect', institutionId:'croatia',
      appointer:patron, holder:me, scope:patron });
    const before = FB.political.power(s, me, 'peace', { provinceId:'split' }).allowed;
    FB.transferProvince(s, 'split', 'italy');
    const snapshot = JSON.stringify(s), rng = FB.getRngState();
    const after = ['peace','revenue'].some(function (power) {
      return FB.political.power(s, me, power, { provinceId:'split' }).allowed;
    });
    const listed = FB.political.grantedCounties(s, me, 'peace').includes('split');
    return { before:before, after:after, listed:listed,
      pure:snapshot === JSON.stringify(s) && rng === FB.getRngState() };
  });
  expect(result).toEqual({ before:true, after:false, listed:false, pure:true });
});

test('a revoked or expired recognition cannot be revived by office reaffirmation', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, me = { kind:'character', id:s.player.charId }, court = { kind:'realm', id:'croatia' };
    const proof = FB.authorityRecognize(s, { source:'imperial_commission', issuer:court,
      subject:me, scope:{ kind:'county', id:'split' } });
    const row = FB.authorityAppoint(s, { officeId:'vicarius', institutionId:'croatia', appointer:court,
      holder:me, scope:{ kind:'county', id:'split' }, recognitionId:proof.id, contested:true });
    FB.authorityRecognitionTransition(s, proof.id, 'revoke');
    const before = JSON.stringify(s), q = FB.officeTransitionQuote(s, court, row.id, 'confirm');
    const rejected = FB.officeTransition(s, q), unchanged = before === JSON.stringify(s);
    const shortProof = FB.authorityRecognize(s, { source:'imperial_commission', issuer:court,
      subject:me, scope:{ kind:'realm', id:'croatia' }, endTurn:s.turn + 1 });
    const prefect = FB.authorityAppoint(s, { officeId:'praetorian_prefect', institutionId:'croatia', appointer:court,
      holder:me, scope:{ kind:'realm', id:'croatia' }, recognitionId:shortProof.id, contested:true });
    s.turn++;
    const expired = FB.officeTransitionQuote(s, court, prefect.id, 'confirm');
    return { allowed:q.allowed, result:rejected, unchanged:unchanged, expired:expired.allowed,
      expiredApply:FB.officeTransition(s, expired) };
  });
  expect(result).toEqual({ allowed:false, result:false, unchanged:true, expired:false, expiredApply:false });
});

test('competing imperial claims keep independent sources and require a real mandate', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], actor = { kind:'character', id:c.id };
    s.player.prestige = 200;
    const claims = FB.officeClaimants(s), west = claims.filter(function (row) { return row.institutionId === 'italy'; });
    const first = west.find(function (row) { return s.chars[row.holder.id].name === 'Romulus Augustulus'; });
    const rival = west.find(function (row) { return s.chars[row.holder.id].name === 'Julius Nepos'; });
    const fake = { source:'imperial_commission', issuer:{ kind:'realm', id:'byzantium' } };
    const unmandated = FB.officeClaimQuote(s, actor, rival, fake, 'recognize');
    FB.authorityAppoint(s, { officeId:'civic_delegate', institutionId:'croatia',
      appointer:{ kind:'realm', id:'croatia' }, holder:actor, scope:{ kind:'county', id:'split' } });
    const mandate = FB.officeRecognitionMandates(s, actor).find(function (row) { return row.source === 'civic_acceptance'; });
    const land = JSON.stringify([s.owner,s.holder,s.player.provs]);
    const firstSupport = FB.officeDeclareClaim(s, FB.officeClaimQuote(s, actor, first, mandate, 'recognize'));
    const firstPure = JSON.stringify(s);
    const repeat = FB.officeDeclareClaim(s, FB.officeClaimQuote(s, actor, first, mandate, 'recognize'));
    const duplicatePure = firstPure === JSON.stringify(s);
    const rivalSupport = FB.officeDeclareClaim(s, FB.officeClaimQuote(s, actor, rival, mandate, 'recognize'));
    const afterRival = FB.officeClaimants(s).filter(function (row) { return row.institutionId === 'italy'; });
    const firstCivic = afterRival.find(function (row) { return row.holder.id === first.holder.id; }).legitimacy.filter(function (row) { return row.source === 'civic_acceptance'; }).length;
    const rivalCivic = afterRival.find(function (row) { return row.holder.id === rival.holder.id; }).legitimacy.filter(function (row) { return row.source === 'civic_acceptance'; }).length;
    const withdrawn = FB.officeDeclareClaim(s, FB.officeClaimQuote(s, actor, rival, mandate, 'contest'));
    const independent = FB.political.legitimacy(s, rival.holder, rival.scope, 'imperial_commission').length;
    return { names:claims.map(function (row) { return s.chars[row.holder.id].name; }).sort(),
      unmandated:unmandated.allowed, firstSupport:firstSupport, repeat:repeat, duplicatePure:duplicatePure,
      rivalSupport:rivalSupport, firstCivic:firstCivic, rivalCivic:rivalCivic, withdrawn:withdrawn,
      independent:independent, prestige:s.player.prestige,
      unchangedLand:land === JSON.stringify([s.owner,s.holder,s.player.provs]) };
  });
  expect(result.names).toEqual(['Basiliscus','Julius Nepos','Romulus Augustulus','Zeno']);
  expect(result).toMatchObject({ unmandated:false, firstSupport:true, repeat:false, duplicatePure:true,
    rivalSupport:true, firstCivic:0, rivalCivic:1, withdrawn:true, independent:1, prestige:185, unchangedLand:true });
});

test('government AI appoints and contests on succession without reversing a deposition', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state;
    // Exercise the three relevant courts through their real government AI.
    // Repeated whole-world seasonal passes obscure this local succession case.
    function courtAI(state, rid) { FB.governments.forRealm(state, rid).use.ai.offices(state, rid); }
    const regionalRuler = FB.materializeRealmRuler(s, 'croatia');
    regionalRuler.skills.dip = 10;
    s.turn = 90;
    courtAI(s, 'croatia');
    const regional = s.authority.appointments.filter(function (row) {
      return row.institutionId === 'croatia' &&
        FBDATA.authorityOffices[row.officeId].appointment && row.startTurn === 90;
    });
    const once = JSON.stringify(s.authority), rng = FB.getRngState();
    courtAI(s, 'croatia');
    const idempotent = once === JSON.stringify(s.authority) && rng === FB.getRngState();
    const w = s.stories.western_court_476;
    FB.authorityAppointmentTransition(s, w.westOfficeId, 'remove');
    s.turn = 180; courtAI(s, 'italy');
    const depositionKept = !s.authority.appointments.some(function (row) {
      return row.institutionId === 'italy' && row.officeId === 'imperial_office' && row.status === 'active';
    });
    const former = FB.realmRulerCharacterSnapshot(s, 'byzantium');
    const zeno = s.chars[w.zenoId];
    FB.assignRealmRulerCharacter(s, 'byzantium', zeno.id, { replaceAuthored:true });
    s.turn = 270; courtAI(s, 'byzantium');
    const claims = FB.officeClaimants(s).filter(function (row) { return row.institutionId === 'byzantium'; });
    const current = claims.find(function (row) { return row.holder.id === zeno.id; });
    const old = claims.find(function (row) { return row.holder.id === former.id; });
    const saved = JSON.parse(FB.save.serialize());
    const authority = saved.state.authority;
    const identity = { rng:FB.getRngState() >>> 0, uid:FB.getUidCounter() };
    FB.save.restore(saved);
    courtAI(FB.state, 'byzantium');
    return { regional:regional.length, idempotent:idempotent, depositionKept:depositionKept,
      current:current.status, old:old.status,
      before:authority, after:FB.state.authority,
      identity:identity.rng === (FB.getRngState() >>> 0) && identity.uid === FB.getUidCounter() };
  });
  expect(result.regional).toBe(1);
  expect(result).toMatchObject({ idempotent:true, depositionKept:true, current:'active', old:'contested', identity:true });
  expect(result.after).toEqual(result.before);
});

test('a completed office season remains settled across restore', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.turn = 90; s.officeCourtPeriod = 1;
    const before = JSON.stringify(s);
    const rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
    FB.officeCourtSeason(s);
    const pure = before === JSON.stringify(s);
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const restored = JSON.stringify(FB.state);
    FB.officeCourtSeason(FB.state);
    return { authority:saved.state.authority, after:FB.state.authority,
      pure:pure, restoredPure:restored === JSON.stringify(FB.state),
      period:FB.state.officeCourtPeriod,
      identity:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter() };
  });
  expect(result.after).toEqual(result.authority);
  expect(result).toMatchObject({ pure:true, restoredPure:true, period:1, identity:true });
});

for (const ended of ['death','removal']) {
  test('imperial succession after every prior claimant ends by ' + ended, async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function (ended) {
      const s = FB.state, w = s.stories.western_court_476;
      const prior = s.authority.appointments.filter(function (row) {
        return row.institutionId === 'byzantium' && row.officeId === 'imperial_office';
      });
      for (const row of prior) {
        if (ended === 'death') s.chars[row.holder.id].dead = true;
        else FB.authorityAppointmentTransition(s, row.id, 'remove');
      }
      const absent = FB.officeClaimants(s).filter(function (row) { return row.institutionId === 'byzantium'; }).length;
      FB.assignRealmRulerCharacter(s, 'byzantium', w.senatorId, { replaceAuthored:true });
      s.turn = 90; FB.authoritySeason(s);
      const current = FB.political.offices(s, { kind:'character', id:w.senatorId }).filter(function (row) {
        return row.ref.officeId === 'imperial_office' && row.status === 'active';
      });
      const count = s.authority.appointments.length;
      FB.officeCourtAI(s, 'byzantium');
      FB.save.restore(JSON.parse(FB.save.serialize()));
      FB.authoritySeason(FB.state);
      return { absent:absent, current:current.length, once:count === FB.state.authority.appointments.length,
        restored:FB.officeClaimants(FB.state).some(function (row) {
          return row.institutionId === 'byzantium' && row.holder.id === w.senatorId && row.status === 'active';
        }) };
    }, ended);
    expect(result).toEqual({ absent:ended === 'death' ? 0 : 2, current:ended === 'death' ? 1 : 0,
      once:true, restored:ended === 'death' });
  });
}

for (const bookmark of ['867','1066']) {
  test(bookmark + ' omits office Deeds and court AI without inventing authority', async function ({ page }, testInfo) {
    await start(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
      const authorityBefore = JSON.parse(JSON.stringify(s.authority));
      const sections = FB.deeds.sections(s, 'theme');
      const enabled = FB.systemEnabled(s, 'roman_offices');
      const courts = FB.officeCourts(s), claims = FB.officeClaimants(s);
      FB.officeCourtSeason(s); FB.ui.showOffices();
      return { enabled:enabled, courts:courts, claims:claims,
        visible:sections.some(function (row) { return row.id === 'offices'; }),
        pure:before === JSON.stringify(s) && rng === FB.getRngState(),
        authorityBefore:authorityBefore, authorityAfter:s.authority,
        romanAppointments:(s.authority.appointments || []).filter(function (row) {
          const def = FBDATA.authorityOffices[row.officeId];
          return !!def.appointment && !def.publicRole;
        }) };
    });
    expect(result).toMatchObject({ enabled:false, courts:[], claims:[], visible:false, pure:true, romanAppointments:[] });
    expect(result.authorityBefore.governments).not.toEqual({});
    expect(result.authorityAfter).toEqual(result.authorityBefore);
  });
}

for (const width of [390,1280]) {
  test('office review retains selectors, details and focus at ' + width + 'px', async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:850 });
    await start(page, testInfo);
    await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      s.player.provinceId = 'split'; s.player.gold = 200; s.player.prestige = 200; c.skills.dip = 20;
      FB.ui.refresh();
    });
    await page.locator('[data-tab="actions"]').click();
    await page.locator('[data-action-section="offices"]').click();
    await page.locator('[data-action-id="offices_legitimacy"]').click();
    await page.locator('#office-court').selectOption('croatia');
    await page.locator('#office-kind').selectOption('defensor_civitatis');
    const review = page.locator('[data-office-petition] [data-office-review]');
    const details = page.locator('[data-office-petition] .settcard-info');
    if (width === 390) {
      await details.click();
      await expect(details).toHaveAttribute('aria-expanded','true');
    } else {
      await expect(details).toBeHidden();
      await review.focus();
      await expect(page.locator('#tooltip')).toBeVisible();
    }
    await review.click();
    await expect(page.locator('#office-confirm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#office-court')).toHaveValue('croatia');
    if (width === 390) await expect(details).toHaveAttribute('aria-expanded','true');
    else await expect(details).toBeHidden();
    await expect(review).toBeFocused();
    await review.click();
    await page.evaluate(function () { FB.state.player.gold++; });
    await page.locator('#office-confirm').click();
    await expect(page.locator('#gm-title')).toHaveText('Terms changed');
    await page.locator('#office-continue').click();
    await expect(review).toBeFocused();
    await review.click();
    await page.locator('#office-confirm').click();
    await page.locator('#office-continue').click();
    await expect(page.locator('[data-held-office]')).toHaveCount(1);
    expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(191);
    const overflow = await page.evaluate(function () {
      const body = document.getElementById('gm-body');
      return body.scrollWidth > body.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });
}
