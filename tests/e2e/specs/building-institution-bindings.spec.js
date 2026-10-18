'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = {
  see:require('../fixtures/authoring/building-institutions-see.json'),
  house:require('../fixtures/authoring/building-institutions-house.json')
};
dependsOnRuntime(__filename, [
  'data/building_profiles.js','js/building_profiles.js','js/building_operations.js','js/building_seasons.js',
  'index.html','data/building_institutions.js','data/technology.js','data/map_data.js',
  'data/religious_institutions.js','data/religious_activities.js','data/political_institutions.js',
  'js/building_institutions.js','js/fortifications.js','js/actions.js','js/world.js',
  'js/lordships.js','js/treasury.js','js/institutions.js','js/religious_institutions.js',
  'js/religious_activities.js','js/religion.js','js/abbeys.js','js/mods.js','js/save.js',
  'js/save_v4.js','js/main.js','js/model.js','js/population.js','js/ui_modals.js','js/ui_misc.js'
]);

async function start(page, info, label, npc, required) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  if (required) {
    const source = JSON.parse(JSON.stringify(examples[label]));
    source.buildingInstitutionProfiles.seat_works.requiresBinding = true;
    source.bookmarks.inventory_estuary.openingInfrastructure.placements = [
      {countyId:'inventory_quay',siteId:'inventory_quay_hall',buildingId:'binding_work',condition:'standing'}
    ];
    await page.locator('#modfile').setInputFiles({name:'required-foundation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  } else await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/building-institutions-' + label + '.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FBDATA.buildings.binding_work; });
  const world = label === 'see' ? 'inventory_estuary' : 'inventory_uplands';
  await beginBookmark(page, info, world, world + '_household');
  await page.evaluate(function (npc) {
    const s = FB.state, pid = s.player.provinceId;
    window.bindingCounty = pid;
    s.player.gold = 10000; s.player.travel = null; s.player.manor = null;
    s.player.landPlots = [{ provinceId:pid, settlement:0 }, { provinceId:pid, settlement:0 }];
    if (!npc) {
      FB.setPlayerTier(s, 4, { stationFarewell:false });
      s.player.provs = [pid]; s.owner[pid] = s.holder[pid] = 'player';
      FB.foundPlayerRealm(s); FB.rememberSettlementSites(s, pid);
      for (let slot = 1; slot < FB.settlementVisibleCount(s, pid); slot++) FB.assignSettlementLordship(s, pid, slot, s.player.charId);
      FB.invalidateSettlementLordships(s);
    }
    window.endowBindingHouse = function () {
      const q = FB.religiousPatronageQuote(s, 'binding_foundation', s.player.charId, 'foundation', { land:{ provinceId:pid, settlement:0, count:2 } });
      if (!q || !q.allowed || !FB.religiousPatronageApply(s, q)) throw new Error('Endowment rejected: ' + (q && q.reason));
    };
  }, !!npc);
}

test('an opted-in inherited unbound facility stays dormant through restore until explicit current permission', async function ({ page }, info) {
  await start(page, info, 'see', false, true);
  const r = await page.evaluate(function () {
    let s = FB.state; const pid = bindingCounty;
    const before = JSON.stringify(s.buildings), gold = s.player.gold;
    const idle = ['tax','upkeep'].every(function (key) { return FB.buildingBonusAt(s,pid,0,key) === 0; });
    const occupied = !FB.buildingInstitutionStatus(s,pid,0,'temple').allowed;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = before === JSON.stringify(s.buildings) && !s.buildings[pid][0].institutionBinding;
    const q = FB.buildingInstitutionQuote(s,pid,0,'binding_work',undefined,'reaffirm');
    const reviewed = FB.buildingInstitutionApply(s,q), repeat = FB.buildingInstitutionApply(s,q);
    return {idle:idle,occupied:occupied,retained:retained,reviewed:reviewed,repeat:repeat,
      noCharge:gold===s.player.gold,tax:FB.buildingBonusAt(s,pid,0,'tax'),upkeep:FB.buildingBonusAt(s,pid,0,'upkeep')};
  });
  expect(r).toEqual({idle:true,occupied:true,retained:true,reviewed:true,repeat:false,noCharge:true,tax:2,upkeep:2});
});

test('an unbound required facility exposes the existing phone permission review and retains focus', async function ({ page }, info) {
  await start(page,info,'see',false,true);await page.setViewportSize({width:390,height:844});
  await page.evaluate(function(){FB.ui.showBuildings(bindingCounty);});
  const button=page.locator('[data-institution-building="binding_work"]');
  await expect(page.locator('#gm-body')).toContainText('No current institutional permission.');
  await button.focus();await button.press('Enter');
  await expect(page.locator('#gm-binding-apply')).toBeEnabled();
  await expect(page.locator('#gm-body')).toContainText('No payment');
  await page.keyboard.press('Escape');await expect(button).toBeFocused();
  await button.click();await page.locator('#gm-cancel').click();await expect(button).toBeFocused();
});

test('the see import binds the actual office and pays construction and maintenance once', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const gold = s.player.gold, people = Object.keys(s.chars).length, institutions = JSON.stringify(s.localInstitutions);
    const built = FB.buildingInstitutionApply(s, q), paid = gold - s.player.gold;
    const repeated = FB.buildingInstitutionApply(s, q), b = s.buildings[pid][0].institutionBinding;
    return { pure:pure, built:built, repeated:repeated, paid:paid, price:q.cost,
      samePeople:people === Object.keys(s.chars).length, sameInstitutions:institutions === JSON.stringify(s.localInstitutions),
      incumbent:b.incumbentId === s.religiousHeads.binding_bishop, property:b.propertyId, payer:b.payer,
      player:s.player.charId, upkeep:FB.buildingBonusAt(s, pid, 0, 'upkeep'),
      review:FBDATA.techImpactReviews.features.building_institution_binding.mode };
  });
  expect(r).toMatchObject({ pure:true, built:true, repeated:false, samePeople:true, sameInstitutions:true,
    incumbent:true, property:null, upkeep:2, review:'none' });
  expect(r.paid).toBe(r.price); expect(r.payer).toEqual({ kind:'character', id:r.player });
});

test('a bound foundation also excludes ordinary unbound worship after ruin and loss of permission', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty;
    const built = FB.build(s, pid, 0, 'binding_work');
    const row = s.buildings[pid].find(function (v) { return v.id === 'binding_work'; });
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const blocked = ['temple','cathedral'].every(function (id) {
      return !FB.buildingInstitutionStatus(s, pid, 0, id).allowed;
    });
    const separate = FB.buildingInstitutionStatus(s, pid, 1, 'temple').allowed;
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    row.ruined = true;
    s.holder[pid] = 'inventory_estuary_court';
    FB.invalidateSettlementLordships(s); FB.invalidateBuildingIndex(s, pid);
    const retained = !FB.buildingInstitutionStatus(s, pid, 0, 'temple').allowed;
    return { built:built, blocked:blocked, separate:separate, pure:pure, retained:retained };
  });
  expect(r).toEqual({ built:true, blocked:true, separate:true, pure:true, retained:true });
});

test('the house import needs a real paid endowment and never spends its restricted property account', async function ({ page }, info) {
  await start(page, info, 'house');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty, before = JSON.stringify(s);
    const q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work');
    const rejected = FB.buildingInstitutionApply(s, q), pure = before === JSON.stringify(s);
    const gold = s.player.gold; endowBindingHouse(); const endowmentPaid = gold - s.player.gold;
    const property = JSON.stringify(s.abbeys), price = FB.buildCost(s, pid, 'binding_work'), funds = s.player.gold;
    const built = FB.buildingInstitutionApply(s, FB.buildingInstitutionQuote(s, pid, 0, 'binding_work'));
    return { rejected:rejected, pure:pure, reason:q.reason, endowmentPaid:endowmentPaid, built:built,
      price:price, paid:funds - s.player.gold, propertyUntouched:property === JSON.stringify(s.abbeys),
      propertyId:s.buildings[pid][0].institutionBinding.propertyId, upkeep:FB.buildingBonusAt(s, pid, 0, 'upkeep') };
  });
  expect(r).toMatchObject({ rejected:false, pure:true, endowmentPaid:20, built:true, propertyUntouched:true, propertyId:'binding_property', upkeep:1 });
  expect(r.reason).toContain('endowed'); expect(r.paid).toBe(r.price);
});

test('one physical foundation excludes alternatives and ruins without excluding unrelated facilities', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty;
    const first = FB.build(s, pid, 0, 'binding_work'), gold = s.player.gold;
    const alternative = FB.build(s, pid, 0, 'binding_alternative'), lost = gold - s.player.gold;
    const unrelated = FB.build(s, pid, 0, 'binding_ordinary');
    const remote = FB.build(s, pid, 1, 'binding_alternative');
    const removed = FB.demolishBuilding(s, pid, 0, 'binding_work');
    const second = FB.build(s, pid, 0, 'binding_alternative');
    const entry = s.buildings[pid].filter(function (v) { return v.id === 'binding_alternative' && v.s === 0; })[0];
    entry.ruined = true; FB.invalidateBuildingIndex(s, pid);
    const ruinBlocks = !FB.build(s, pid, 0, 'binding_work');
    return { first:first, alternative:alternative, lost:lost, unrelated:unrelated, remote:remote, removed:removed, second:second, ruinBlocks:ruinBlocks };
  });
  expect(r).toEqual({ first:true, alternative:false, lost:0, unrelated:true, remote:true, removed:true, second:true, ruinBlocks:true });
});

test('an existing ordinary worship footprint blocks a second institutional construction award', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty;
    const knowledge = FB.realmTechRecord(s);
    if (knowledge.completed.indexOf('lime_mortar') < 0) knowledge.completed.push('lime_mortar');
    if (!FB.build(s, pid, 0, 'temple')) throw new Error('Ordinary worship setup failed');
    const before = JSON.stringify(s), q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work');
    return { blocked:!q.allowed && !FB.buildingInstitutionApply(s, q), pure:before === JSON.stringify(s), reason:q.reason };
  });
  expect(r.blocked).toBe(true); expect(r.pure).toBe(true); expect(r.reason).toContain('foundation');
});

test('death and replacement office suspend operation and require a fresh exact review', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty, stale = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work');
    const original = s.religiousHeads.binding_bishop; s.chars[original].dead = true;
    const deathBlocked = !FB.buildingInstitutionApply(s, stale);
    s.chars[original].dead = false; FB.build(s, pid, 0, 'binding_work');
    const raw = JSON.stringify(s.buildings[pid]); s.chars[original].dead = true;
    const inactive = FB.buildingBonusAt(s, pid, 0, 'upkeep') === 0;
    const current = FB.makeCharacter(s, { name:'Second keeper', born:s.date.year - 35, religion:'catholic', culture:'frankish', role:'priest', traits:[] });
    s.religiousHeads.binding_bishop = current.id;
    const before = s.player.gold, q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work', undefined, 'reaffirm');
    const stillInactive = FB.buildingBonusAt(s, pid, 0, 'tax') === 0;
    const noRepair = raw === JSON.stringify(s.buildings[pid]);
    const approved = FB.buildingInstitutionApply(s, q), repeat = FB.buildingInstitutionApply(s, q);
    return { deathBlocked:deathBlocked, inactive:inactive, stillInactive:stillInactive, noRepair:noRepair,
      approved:approved, repeat:repeat, paid:before - s.player.gold, upkeep:FB.buildingBonusAt(s, pid, 0, 'upkeep') };
  });
  expect(r).toEqual({ deathBlocked:true, inactive:true, stillInactive:true, noRepair:true, approved:true, repeat:false, paid:0, upkeep:2 });
});

test('property transfer suspends the original payer and cannot debit the house or a new patron', async function ({ page }, info) {
  await start(page, info, 'house');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty; endowBindingHouse(); FB.build(s, pid, 0, 'binding_work');
    const h = s.abbeys.houses.filter(function (v) { return v.id === 'binding_property'; })[0], original = h.patronDyn;
    const q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_alternative'); h.patronDyn = 'foreign_patron';
    const before = JSON.stringify(s), reason = FB.buildingInstitutionStatus(s, pid, 0, 'binding_work', undefined, s.buildings[pid][0]).reason;
    const inactive = FB.buildingBonusAt(s, pid, 0, 'tax') === 0 && FB.buildingBonusAt(s, pid, 0, 'upkeep') === 0;
    const failed = !FB.buildingInstitutionApply(s, q), untouched = before === JSON.stringify(s);
    h.patronDyn = original;
    return { inactive:inactive, failed:failed, untouched:untouched, reason:reason, sameProperty:h.id === 'binding_property' };
  });
  expect(r).toMatchObject({ inactive:true, failed:true, untouched:true, sameProperty:true }); expect(r.reason).toContain('patron');
});

test('spiritual rank and custody cannot bypass physical lordship or the current builder', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty, bishop = s.religiousHeads.binding_bishop;
    const bishopQuote = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work', { kind:'character', id:bishop });
    const q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work'); s.chars[s.player.charId].captive = true;
    const before = JSON.stringify(s), blocked = !FB.buildingInstitutionApply(s, q) && !FB.build(s, pid, 0, 'binding_work');
    return { bishop:!bishopQuote.allowed, blocked:blocked, pure:before === JSON.stringify(s) };
  });
  expect(r).toEqual({ bishop:true, blocked:true, pure:true });
});

test('realm AI uses its own treasury, the same authority gate and ordinary construction reserves', async function ({ page }, info) {
  await start(page, info, 'see', true);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty, rid = FB.settlementCountyHolder(s, pid);
    FB.treasuryCredit(s, rid, 5000);
    const q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work', { kind:'realm', id:rid });
    const before = FB.treasuryAvailable(s, rid), household = s.player.gold;
    const allowed = FB.aiCanBuildAt(s, rid, pid, 0, 'binding_work'), built = FB.buildingInstitutionApply(s, q);
    const paid = before - FB.treasuryAvailable(s, rid), repeated = FB.buildingInstitutionApply(s, q);
    const payer = s.buildings[pid][0].institutionBinding.payer;
    return { allowed:allowed, built:built, repeated:repeated, paid:paid, cost:q.cost, sameHousehold:household === s.player.gold,
      correctPayer:payer.kind === 'realm' && payer.id === rid, upkeep:FB.buildingBonusAt(s, pid, 0, 'upkeep') };
  });
  expect(r).toMatchObject({ allowed:true, built:true, repeated:false, sameHousehold:true, correctPayer:true, upkeep:2 }); expect(r.paid).toBe(r.cost);
});

test('annual AI creates an exact binding and leaves a later vacancy unfilled', async function ({ page }, info) {
  await start(page, info, 'see', true);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty, rid = FB.settlementCountyHolder(s, pid);
    Object.keys(FBDATA.buildings).forEach(function (id) { if (id !== 'binding_work') delete FBDATA.buildings[id].aiBuildOrder; });
    FB.treasuryCredit(s, rid, 5000); FB.aiBuildingsYear(s);
    const entry = s.buildings[pid].filter(function (v) { return v.id === 'binding_work'; })[0];
    const original = s.religiousHeads.binding_bishop; s.chars[original].dead = true;
    const rows = JSON.stringify(s.buildings[pid]); FB.aiBuildingsYear(s);
    return { bound:!!entry.institutionBinding, inactive:!FB.buildingInstitutionOperating(s, pid, entry), noReplacement:rows === JSON.stringify(s.buildings[pid]) && s.religiousHeads.binding_bishop === original };
  });
  expect(r).toEqual({ bound:true, inactive:true, noReplacement:true });
});

test('private barons use their real account and a public title supplies no second purse', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty;
    const baron = FB.makeCharacter(s, { name:'Foundation patron', station:3, born:s.date.year - 30, culture:'frankish', religion:'catholic', traits:[] });
    if (!FB.assignSettlementLordship(s, pid, 1, baron.id)) throw new Error('Grant failed');
    FB.settleBaronyAccounts(s, Math.floor(s.turn / 90) + 1);
    s.settlementLordships.accounts[baron.id].gold = 1000;
    const q = FB.buildingInstitutionQuote(s, pid, 1, 'binding_work', { kind:'character', id:baron.id });
    const before = s.player.gold, built = FB.buildingInstitutionApply(s, q);
    const b = s.buildings[pid].filter(function (v) { return v.id === 'binding_work'; })[0].institutionBinding;
    const publicRejected = !FB.buildingInstitutionApply(s, FB.buildingInstitutionQuote(s, pid, 0, 'binding_work', { kind:'realm', id:'player' }));
    return { built:built, paid:1000 - FB.baronyAccount(s, baron.id).gold, cost:q.cost, private:b.payer.kind === 'character' && b.payer.id === baron.id,
      householdUntouched:before === s.player.gold, publicRejected:publicRejected };
  });
  expect(r).toMatchObject({ built:true, private:true, householdUntouched:true, publicRejected:true }); expect(r.paid).toBe(r.cost);
});

test('public construction cannot lower the ordinary reserve through a caller-supplied value', async function ({ page }, info) {
  await start(page, info, 'see', true);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty, rid = FB.settlementCountyHolder(s, pid);
    s.realms[rid].treasury.gold = FB.buildCost(s, pid, 'binding_work', rid) + 1;
    const before = JSON.stringify(s), q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work', { kind:'realm', id:rid });
    const refused = !FB.buildRealm(s, rid, pid, 0, 'binding_work', 0);
    return { enoughPrice:q.funds >= q.cost, refused:refused, pure:before === JSON.stringify(s) };
  });
  expect(r).toEqual({ enoughPrice:true, refused:true, pure:true });
});

for (const label of ['see','house']) test(label + ' matching restore preserves exact bindings and never creates property or rewards', async function ({ page }, info) {
  await start(page, info, label);
  const before = await page.evaluate(function (label) {
    const s = FB.state, pid = bindingCounty;
    if (label === 'house') endowBindingHouse();
    FB.build(s, pid, 0, 'binding_work');
    return { save:FB.save.serialize(), records:JSON.stringify(s.buildings), property:JSON.stringify(s.abbeys || null),
      gold:s.player.gold, dev:s.dev[pid], institutions:JSON.stringify(s.localInstitutions) };
  }, label);
  await restoreBookmark(page, before.save);
  const after = await page.evaluate(function () {
    const s = FB.state;
    return { records:JSON.stringify(s.buildings), property:JSON.stringify(s.abbeys || null),
      gold:s.player.gold, dev:s.dev[bindingCounty], institutions:JSON.stringify(s.localInstitutions) };
  });
  delete before.save; expect(after).toEqual(before);
});

test('strict optional save bindings reject corruption before adopting state, RNG or identities', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty; FB.build(s, pid, 0, 'binding_work');
    const changes = [function (b) { b.v = 2; }, function (b) { b.propertyId = 'invented'; },
      function (b) { b.incumbentId = 'missing'; }, function (b) { b.builder.id = 'missing'; },
      function (b) { b.siteId = 'foreign'; }, function (b) { b.boundTurn = s.turn + 1; },
      function (b) { b.revision = 0; }, function (b) { b.generation = 'bad'; },
      function (b) { b.extra = true; }, function (b) { delete b.payer; }];
    const payload = JSON.parse(FB.save.serialize()), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = changes.map(function (change) {
      const input = JSON.parse(JSON.stringify(payload)); change(input.state.buildings[pid][0].institutionBinding);
      try { FB.save.restore(input); return false; } catch (e) { return true; }
    });
    return { rejected:rejected, pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(r).toEqual({ rejected:Array(10).fill(true), pure:true });
});

test('detached imports reject unknown, foreign and ambiguous declarations without publication', async function ({ page }, info) {
  await openGame(page, info);
  const r = await page.evaluate(function (source) {
    const changes = [function (d) { d.buildingInstitutionProfiles = []; },
      function (d) { d.buildingInstitutionProfiles.seat_works.extra = true; },
      function (d) { d.buildingInstitutionProfiles.seat_works.requiresBinding = 'yes'; },
      function (d) { d.buildingInstitutionProfiles.seat_works.permission = 'spiritual_title'; },
      function (d) { d.buildingInstitutionProfiles.seat_works.kinds = ['unknown']; },
      function (d) { d.buildings.binding_work.institutionProfile = 'unknown'; },
      function (d) { d.bookmarks.inventory_estuary.buildingInstitutionAssignments.push(d.bookmarks.inventory_estuary.buildingInstitutionAssignments[0]); },
      function (d) { d.bookmarks.inventory_estuary.buildingInstitutionAssignments[0].institutionId = 'unknown'; },
      function (d) { d.bookmarks.inventory_estuary.localInstitutions.binding_institution.site = 'inventory_ridge_tower'; },
      function (d) { d.bookmarks.inventory_estuary.buildingInstitutionAssignments[0].freeMoney = 1; }];
    return changes.map(function (change) {
      const d = JSON.parse(JSON.stringify(source)); change(d);
      const before = JSON.stringify([FBDATA, FB.state, d]), signature = FB.mods.sig(), rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.mods.validate(d).length > 0 && before === JSON.stringify([FBDATA, FB.state, d]) && signature === FB.mods.sig() && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  }, examples.see);
  expect(r).toEqual(Array(10).fill(true));
});

test('unbound legacy buildings keep their effects and are not enrolled by restore or review', async function ({ page }, info) {
  await start(page, info, 'see');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = bindingCounty;
    s.buildings[pid] = [{ s:0, id:'binding_work' }]; FB.invalidateBuildingIndex(s, pid);
    const q = FB.buildingInstitutionQuote(s, pid, 0, 'binding_work', undefined, 'reaffirm');
    const before = JSON.stringify(s.buildings), upkeep = FB.buildingBonusAt(s, pid, 0, 'upkeep');
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return { upkeep:upkeep, rejected:!q.allowed, exact:before === JSON.stringify(FB.state.buildings), bound:!!FB.state.buildings[pid][0].institutionBinding };
  });
  expect(r).toEqual({ upkeep:2, rejected:true, exact:true, bound:false });
});

test('narrow-screen permission review retains the county, position and keyboard focus', async function ({ page }, info) {
  await start(page, info, 'see'); await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.build(FB.state, bindingCounty, 0, 'binding_work'); FB.ui.showBuildings(bindingCounty); });
  const button = page.locator('[data-institution-building="binding_work"]');
  await button.click(); await expect(page.locator('#gm-title')).toHaveText('Review permission');
  await expect(page.locator('#gm-body')).toContainText('Your household account');
  await page.keyboard.press('Escape'); await expect(button).toBeFocused();
  await button.click(); await page.locator('#gm-cancel').click(); await expect(button).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollWidth <= el.clientWidth + 1; })).toBe(true);
});
