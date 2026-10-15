'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_instances.js',
  'data/story_courts_476.js',
  'index.html', 'js/religion.js', 'js/model.js', 'js/authority.js', 'js/institutions.js',
  'js/actions.js', 'js/world.js', 'js/agency.js', 'js/politics.js', 'js/systems.js',
  'js/treasury.js', 'js/population.js', 'js/modifiers.js', 'js/events.js',
  'js/economy.js', 'js/save.js', 'js/save_v4.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'js/ui_panels.js', 'js/station.js', 'js/stories.js', 'js/story_courts.js',
  'data/actions.js', 'data/systems.js', 'data/eras.js', 'data/political_institutions.js',
  'data/bookmark_476.js', 'data/bookmark_476_italy.js', 'data/cultures.js',
  'data/map_data.js', 'data/modifiers.js', 'data/technology.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');

async function start476(page, testInfo) {
  await startParityGame(page, testInfo, {
    bookmark:'476', code:'RELIGION476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
  });
}
async function adultWesternCourt(page, faith) {
  await page.evaluate(function (faithId) {
    const s = FB.state, c = FB.realmRulerCharacterSnapshot(s, 'italy');
    c.born = s.date.year - 30;
    c.religion = faithId;
    s.realms.italy.religion = faithId;
    s.realms.italy.ruler.born = c.born;
    s.authority.governments.italy.eliteFaithId = faithId;
    FB.treasuryTransfer(s, null, 'italy', 500);
  }, faith);
}
async function playerCourt(page) {
  await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    c.born = s.date.year - 30; c.religion = 'homoian';
    p.tier = 4; p.gold = 1000; p.piety = 2000; p.prestige = 2000;
    p.provs = ['ravenna','roma','milano']; p.liege = null;
    s.realms.player = { id:'player', name:'Test Court', alive:true, rank:1,
      capital:'ravenna', religion:'homoian', ruler:{ generation:1 } };
    p.provs.forEach(function (pid) { s.owner[pid] = 'player'; s.holder[pid] = 'player'; });
    FB.invalidateRealmCache();
    FB.authoritySetIdentity(s, 'player', { eliteCultureId:'gothic', eliteFaithId:'homoian',
      legalIdentityId:'gothic_custom', tolerance:'preference', taxation:'equal', justicePolicy:'personal' });
  });
}

test('patriarchal appointment succeeds without a medieval institution', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, old = s.religiousHeads.constantinople_patriarch;
    s.chars[old].dead = true;
    FB.religiousHeadCharacterDied(s, old);
    const next = FB.religiousOfficeSnapshot(s, 'constantinople_patriarch');
    return { successor:!!next && !next.dead && next.id !== old,
      faith:next && next.religion, clergy:next && next.role, vacantCarthage:s.religiousHeads.carthage_bishop === null,
      headStrategy:FB.religionOf('chalcedonian', s).head.succession,
      disabled:['papacy','great_holy_wars','abbeys'].every(function (id) { return !FB.systemEnabled(s, id); }),
      medievalDeeds:FB.listInstants(s).filter(function (entry) {
        return ['papacy','call_great_holy_war','abbeys','convene_synod'].indexOf(entry.a.id) >= 0;
      }).length };
  });
  expect(result).toEqual({ successor:true, faith:'chalcedonian', clergy:'priest', vacantCarthage:true,
    headStrategy:'appointment', disabled:true, medievalDeeds:0 });
});

test('a protected Nicene council under a Homoian ruler grants scoped recognition without conversion', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await adultWesternCourt(page, 'homoian');
  const result = await page.evaluate(function () {
    const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.churchCouncilQuote(s, 'italy', 'nicene');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const population = JSON.stringify(s.population), land = JSON.stringify([s.owner, s.holder]);
    const funds = FB.treasuryAvailable(s, 'italy');
    const support = FB.countySupportBase(s, 'ravenna');
    const result = FB.conveneChurchCouncil(s, q);
    const after = JSON.stringify(s);
    const repeated = FB.conveneChurchCouncil(s, q);
    return { allowed:q.allowed, pure:pure, result:!!result, cost:funds - FB.treasuryAvailable(s, 'italy'),
      support:FB.countySupportBase(s, 'ravenna') - support,
      recognition:FB.political.legitimacy(s, { kind:'realm', id:'italy' }, { kind:'county', id:'ravenna' }, 'church_support').length > 0,
      unchanged:population === JSON.stringify(s.population) && land === JSON.stringify([s.owner, s.holder]) && s.realms.italy.religion === 'homoian',
      repeated:repeated === null && after === JSON.stringify(s) };
  });
  expect(result).toEqual({ allowed:true, pure:true, result:true, cost:30, support:8,
    recognition:true, unchanged:true, repeated:true });
});

test('vacancy, persecution, stale bishops and disabled systems reject a council without spending', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await adultWesternCourt(page, 'nicene');
  const result = await page.evaluate(function () {
    const s = FB.state, funds = FB.treasuryAvailable(s, 'italy');
    const solitary = FB.churchCouncilQuote(s, 'italy', 'homoian').allowed;
    const q = FB.churchCouncilQuote(s, 'italy', 'nicene');
    const id = q.bishops[0].charId;
    s.chars[id].dead = true;
    const stale = FB.conveneChurchCouncil(s, q) === null;
    s.chars[id].dead = false;
    s.authority.governments.italy.tolerance = 'persecution';
    const persecution = FB.churchCouncilQuote(s, 'italy', 'nicene').allowed;
    s.authority.governments.italy.tolerance = 'preference';
    FB.bookmark('476').systems.disable.push('church_councils');
    const disabled = FB.conveneChurchCouncil(s, q) === null;
    return { solitary:solitary, stale:stale, persecution:persecution, disabled:disabled,
      funds:funds === FB.treasuryAvailable(s, 'italy'), absent:s.churchCouncils === undefined };
  });
  expect(result).toEqual({ solitary:false, stale:true, persecution:false, disabled:true, funds:true, absent:true });
});

test('AI public conversion changes court faith, recognition, regard and support while conserving communities', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await adultWesternCourt(page, 'homoian');
  const result = await page.evaluate(function () {
    const s = FB.state, subject = { kind:'realm', id:'italy' };
    const old = FB.localInstitutionMediate(s, 'ravenna_homoian_see', subject, 'ravenna');
    const population = JSON.stringify(s.population), land = JSON.stringify([s.owner, s.holder]);
    const law = FB.political.governingIdentity(s, 'italy').legalIdentityId;
    const gold = FB.treasuryAvailable(s, 'italy'), support = FB.countySupportBase(s, 'ravenna');
    const regard = FB.rulerRegard(s, 'rugi_476', 'italy');
    const q = FB.rulerFaithConversionStatus(s, 'italy', 'nicene');
    const ok = FB.applyRulerFaithConversion(s, 'italy', 'nicene', q);
    const after = JSON.stringify(s), repeated = FB.applyRulerFaithConversion(s, 'italy', 'homoian');
    return { ok:ok, ruler:FB.realmRulerCharacterSnapshot(s, 'italy').religion,
      official:s.realms.italy.religion, elite:FB.political.governingIdentity(s, 'italy').eliteFaithId,
      paid:gold - FB.treasuryAvailable(s, 'italy'), support:FB.countySupportBase(s, 'ravenna') - support,
      unrest:FB.hasModifier(s, 'zealot_unrest', 'ravenna'), regard:FB.rulerRegard(s, 'rugi_476', 'italy') - regard,
      oldRevoked:s.authority.recognitions.find(function (r) { return r.id === old.id; }).status === 'revoked',
      newChurch:FB.political.legitimacy(s, subject, { kind:'county', id:'ravenna' }, 'church_support').some(function (r) { return r.issuer.id === 'ravenna_nicene_bishop'; }),
      preserved:population === JSON.stringify(s.population) && land === JSON.stringify([s.owner, s.holder]) && law === FB.political.governingIdentity(s, 'italy').legalIdentityId,
      noReplay:!repeated && after === JSON.stringify(s) };
  });
  expect(result).toEqual({ ok:true, ruler:'nicene', official:'nicene', elite:'nicene', paid:48,
    support:10, unrest:true, regard:-35, oldRevoked:true, newChurch:true, preserved:true, noReplay:true });
});

test('player realm conversion reuses the ordinary picker costs and rejects stale review or spent resources', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await playerCourt(page);
  const result = await page.evaluate(function () {
    const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.conversionStatus(s, 'faith', 'nicene', 'realm');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.adjustCountySupport(s, 'ravenna', -1);
    const stale = FB.applyConversion(s, 'faith', 'nicene', 'realm', q);
    const unspent = s.player.piety === 2000 && s.player.prestige === 2000;
    const fresh = FB.conversionStatus(s, 'faith', 'nicene', 'realm');
    const population = JSON.stringify(s.population);
    const ok = FB.applyConversion(s, 'faith', 'nicene', 'realm', fresh);
    return { pure:pure, costs:[q.pietyCost, q.prestigeCost], stale:stale, unspent:unspent, ok:ok,
      remaining:[s.player.piety, s.player.prestige], household:FB.householdMembers(s).every(function (c) { return c.religion === 'nicene'; }),
      preserved:population === JSON.stringify(s.population), once:!FB.conversionStatus(s, 'faith', 'homoian', 'realm').ok };
  });
  expect(result).toEqual({ pure:true, costs:[480,320], stale:false, unspent:true, ok:true,
    remaining:[1520,1680], household:true, preserved:true, once:true });
});

test('annual AI evaluation considers live local following and runs once per year', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await adultWesternCourt(page, 'homoian');
  const result = await page.evaluate(function () {
    const s = FB.state, old = FBDATA.balance.rulerConversionAIChance;
    const ruler = FB.realmRulerCharacterSnapshot(s, 'italy');
    ruler.traits = ruler.traits.filter(function (id) { return id !== 'zealous'; });
    const before = JSON.stringify(s), rng = FB.getRngState();
    const evaluation = FB.rulerFaithConversionEvaluation(s, 'italy', 'nicene');
    const alternatives = FBDATA.rulerFaithTargets.map(function (target) {
      return FB.rulerFaithConversionEvaluation(s, 'italy', target);
    }).filter(function (row) { return row.allowed; }).sort(function (a, b) {
      return b.score - a.score || a.quote.targetId.localeCompare(b.quote.targetId);
    });
    const preferred = alternatives[0].quote.targetId;
    const pure = before === JSON.stringify(s) && rng === FB.getRngState();
    ruler.traits.push('zealous');
    const zealousBefore = JSON.stringify(s), zealousRng = FB.getRngState();
    const zealous = FB.rulerFaithConversionEvaluation(s, 'italy', 'nicene');
    const zealousPure = zealousBefore === JSON.stringify(s) && zealousRng === FB.getRngState();
    ruler.traits.pop();
    try {
      FBDATA.balance.rulerConversionAIChance = 1;
      FB.religionYear(s);
      const after = JSON.stringify(s), nextRng = FB.getRngState();
      FB.religionYear(s);
      const once = after === JSON.stringify(s) && nextRng === FB.getRngState();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.state, restoredBefore = JSON.stringify(restored), restoredRng = FB.getRngState();
      FB.religionYear(restored);
      return { eligible:evaluation.allowed, pure:pure, preferred:preferred,
        converted:s.realms.italy.religion === preferred,
        decision:s.rulerFaithDecisions.conversions.italy.to,
        zealPenalty:evaluation.score - zealous.score, zealousPure:zealousPure,
        once:once, year:restored.rulerFaithDecisions.lastAIYear,
        restoredOnce:restoredBefore === JSON.stringify(restored) && restoredRng === FB.getRngState() };
    } finally { FBDATA.balance.rulerConversionAIChance = old; }
  });
  expect(result).toEqual({ eligible:true, pure:true, preferred:'chalcedonian', decision:'chalcedonian',
    converted:true, zealPenalty:20, zealousPure:true,
    once:true, year:476, restoredOnce:true });
});

test('church eligibility and public-faith authoring reject lay, child and malformed candidates', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, lay = FB.realmRulerCharacterSnapshot(s, 'italy');
    const child = FB.makeCharacter(s, { name:'Young lector', sex:'m', culture:'roman',
      religion:'nicene', role:'priest', born:s.date.year - 12 });
    const cleric = FB.makeCharacter(s, { name:'Adult presbyter', sex:'m', culture:'roman',
      religion:'nicene', role:'priest', born:s.date.year - 35 });
    const eligibility = [lay,child,cleric].map(function (c) { return FB.religiousHeadHolderEligible(s, 'nicene', c.id); });
    cleric.role = null;
    FB.setCareer(s, cleric, 'priest', 'novice');
    const vocation = FB.religiousHeadHolderEligible(s, 'nicene', cleric.id);
    const original = FBDATA.rulerFaithTargets;
    let invalid;
    try {
      FBDATA.rulerFaithTargets = ['nicene','nicene','christian'];
      invalid = FB.validateReligionInstitutionsData().length;
    } finally { FBDATA.rulerFaithTargets = original; }
    return { eligibility:eligibility, vocation:vocation, invalid:invalid,
      valid:FB.validateReligionInstitutionsData(), technology:FB.validateTechnologyData(),
      reviews:[FBDATA.techImpactReviews.features.provincial_church_councils.mode,
        FBDATA.techImpactReviews.features.public_ruler_conversion.mode] };
  });
  expect(result).toEqual({ eligibility:[false,false,true], vocation:true, invalid:2, valid:[], technology:[], reviews:['none','none'] });
});

test('public profession remains available after a personal change and a successor can decide again', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await playerCourt(page);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.chars[s.player.charId].religion = 'nicene';
    const official = FB.conversionStatus(s, 'faith', 'nicene', 'realm');
    const ok = FB.applyConversion(s, 'faith', 'nicene', 'realm', official);
    const successor = FB.makeCharacter(s, { name:'Successor', sex:'m', culture:'gothic',
      religion:'nicene', role:'ruler', born:s.date.year - 25 });
    s.player.charId = successor.id;
    s.realms.player.ruler.generation++;
    s.turn += 1460;
    const next = FB.conversionStatus(s, 'faith', 'homoian', 'realm');
    return { ready:official.ok, ok:ok, next:next.ok };
  });
  expect(result).toEqual({ ready:true, ok:true, next:true });
});

test('communions already in the same fold do not create artificial population backlash', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await playerCourt(page);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.chars[s.player.charId].religion = 'nicene';
    s.realms.player.religion = 'nicene';
    s.authority.governments.player.eliteFaithId = 'nicene';
    const q = FB.rulerFaithConversionStatus(s, 'player', 'chalcedonian');
    return { ok:q.ok, relation:q.relation, oldRealms:q.oldFoldRealmIds.length,
      counties:q.counties.every(function (row) { return row.support === 0 && !row.unrest; }),
      ai:FB.rulerFaithConversionEvaluation(s, 'player', 'chalcedonian').allowed };
  });
  expect(result).toEqual({ ok:true, relation:'in_fold', oldRealms:0, counties:true, ai:false });
});

test('council and conversion records round trip without payments and reject malformed records', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await adultWesternCourt(page, 'homoian');
  const result = await page.evaluate(function () {
    const s = FB.state;
    FB.conveneChurchCouncil(s, FB.churchCouncilQuote(s, 'italy', 'nicene'));
    FB.applyRulerFaithConversion(s, 'italy', 'nicene');
    const saved = JSON.parse(FB.save.serialize());
    const records = JSON.stringify([s.churchCouncils, s.rulerFaithDecisions]);
    const funds = FB.treasuryAvailable(s, 'italy');
    FB.save.restore(saved); FB.save.restore(saved);
    const r = FB.state;
    const preserved = records === JSON.stringify([r.churchCouncils, r.rulerFaithDecisions]);
    const invalid = JSON.parse(JSON.stringify(saved.state));
    invalid.rulerFaithDecisions.conversions.italy.generation = 'one';
    let rejected = false;
    try { FB.save.v4.validatePlatform(invalid); } catch (error) { rejected = /rulerFaithDecisions/.test(error.message); }
    const compacted = JSON.parse(JSON.stringify(saved.state));
    delete compacted.chars[compacted.rulerFaithDecisions.conversions.italy.charId];
    compacted.churchCouncils.italy.bishops.forEach(function (b) { delete compacted.chars[b.charId]; });
    const historical = FB.validateReligionInstitutionState(compacted);
    const legacy = JSON.parse(JSON.stringify(saved));
    delete legacy.state.rulerFaithDecisions; delete legacy.state.churchCouncils;
    FB.save.restore(legacy);
    return { preserved:preserved, funds:funds === FB.treasuryAvailable(FB.state, 'italy'), rejected:rejected, historical:historical,
      legacy:FB.state.rulerFaithDecisions === undefined && FB.state.churchCouncils === undefined,
      noReplay:!FB.applyRulerFaithConversion(r, 'italy', 'homoian') };
  });
  expect(result).toEqual({ preserved:true, funds:true, rejected:true, historical:true, legacy:true, noReplay:true });
});

for (const bookmark of ['867','1066']) {
  test(bookmark + ' keeps these institutions dormant and the normal conversion preview', async function ({ page }, testInfo) {
    await startParityGame(page, testInfo, { bookmark:bookmark, code:'RELIGION-' + bookmark + '-serf-london-m-Osric' });
    const result = await page.evaluate(function () {
      const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
      const q = FB.churchCouncilQuote(s, 'player', 'nicene');
      const convert = FB.rulerFaithConversionStatus(s, 'player', 'nicene');
      FB.religionYear(s);
      return { council:q.allowed, conversion:convert.ok, absent:s.churchCouncils === undefined && s.rulerFaithDecisions === undefined,
        pure:before === JSON.stringify(s) && rng === FB.getRngState(),
        ordinary:!FB.conversionStatus(s, 'faith', 'orthodox', 'self').rulerDecision,
        abbeys:FB.systemEnabled(s, 'abbeys') };
    });
    expect(result).toEqual({ council:false, conversion:false, absent:true, pure:true, ordinary:true, abbeys:true });
  });
}

test('phone council review retains nonzero scroll, disclosure and focus across Back and conclusion', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await playerCourt(page);
  await page.setViewportSize({ width:390, height:720 });
  await page.evaluate(function () { FB.ui.showChurchCouncils(); });
  const review = page.locator('[data-church-council-review="nicene"]');
  const disclosure = page.locator('[aria-controls="church-council-nicene"]');
  await disclosure.click();
  await review.focus();
  const before = await page.locator('#gm-body').evaluate(function (node) {
    node.scrollTop = 90; return node.scrollTop;
  });
  expect(before).toBeGreaterThan(0);
  await review.press('Enter');
  await expect(page.locator('#church-council-confirm')).toBeVisible();
  await page.locator('[data-modal-nav="back"]').click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(review).toBeFocused();
  const after = await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; });
  expect(Math.abs(after - before)).toBeLessThan(3);
  await review.click();
  await page.locator('#church-council-confirm').click();
  await expect(page.locator('#church-council-continue')).toBeVisible();
  await page.locator('#church-council-continue').click();
  await expect(review).toBeFocused();
});

test('phone official-faith review discloses tension, rejects stale terms and retains the picker', async function ({ page }, testInfo) {
  await start476(page, testInfo);
  await playerCourt(page);
  await page.setViewportSize({ width:390, height:720 });
  await page.evaluate(function () { FB.ui.showConversionPicker('faith', 'realm'); });
  await page.locator('#conv-search').fill('Nicene');
  await page.locator('[data-conv-select="nicene"]').click();
  await expect(page.locator('[data-conversion-review]')).toContainText('abandoned faith share');
  await expect(page.locator('[data-conversion-review]')).toContainText('Zealot unrest');
  await expect(page.locator('#gm-body .review-person')).not.toHaveCount(0);
  await expect(page.locator('#gm-body')).not.toContainText('lawful target for the holy wars');
  await page.evaluate(function () { FB.adjustCountySupport(FB.state, 'ravenna', -1); });
  await page.locator('#conv-confirm').click();
  await expect(page.locator('#gm-body')).toContainText('Nothing was spent.');
  await page.locator('#ruler-conversion-retry').click();
  await expect(page.locator('#conv-search')).toHaveValue('Nicene');
  expect(await page.evaluate(function () { return FB.state.player.piety; })).toBe(2000);
  await page.locator('[data-conv-select="nicene"]').click();
  await page.locator('#conv-confirm').click();
  await expect(page.locator('#ruler-conversion-continue')).toBeVisible();
  expect(await page.evaluate(function () { return FB.state.realms.player.religion; })).toBe('nicene');
  await page.locator('#ruler-conversion-continue').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
});
