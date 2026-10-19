'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/guarded-principal-harbor.json'),
  dune:require('../fixtures/authoring/guarded-principal-dune.json')};

dependsOnRuntime(__filename, ['index.html','data/mobile_confederations.js','data/technology.js',
  'data/eras.js','data/economy.js','data/units.js','js/starts.js','js/main.js','js/world.js',
  'js/mods.js','js/bookmark_setup.js','js/stories.js','js/story_household.js','js/story_ruler_agenda.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_guard.js','js/mobile_camps.js',
  'js/mobile_columns.js','js/federates.js','js/government_selection.js','js/governments.js',
  'js/government_civic.js','js/government_support.js','js/authority.js','js/justice.js','js/model.js',
  'js/population.js','js/market.js','js/treasury.js','js/armies.js','js/station.js','js/travel.js',
  'js/story_household_party.js','js/household_party_travel.js','js/save.js','js/save_v4.js',
  'js/ui_misc.js','js/ui_modals.js','js/ui_mobile.js']);

async function imported(page, info, prefix) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/guarded-principal-' + prefix + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (p) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[p + '_world'];
  }, prefix);
}
async function choose(page) {
  await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showScreen('title'); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', {name:'New Game', exact:true}).click();
}
function code(prefix) {
  const sc = examples[prefix].startScenarios[0];
  return 'GUARDEDPERSON-' + prefix + '_world-' + sc.id + '-' + sc.fixedProvinceId + '-' +
    sc.sex + '-' + sc.characterName.replace(/ /g, '_') + '-standard';
}
async function begin(page, prefix, direct) {
  await choose(page);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code(prefix));
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  if (direct) await page.evaluate(function () { FB.game.start(); FB.game.setPaused(true); });
  else {
    await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
    await page.getByRole('button', {name:'Begin', exact:true}).click();
    await page.evaluate(function () { FB.game.setPaused(true); });
  }
}

for (const prefix of ['harbor', 'dune']) {
  test(prefix + ' picker adopts one original guarded person at the declared county or exact site', async function ({page}, info) {
    await imported(page, info, prefix); await choose(page);
    await page.locator('[data-bookmark="' + prefix + '_world"]').click();
    const card = page.locator('[data-scenario="' + prefix + '_guarded_principal"]');
    await expect(card).toContainText('Story start'); await card.click();
    await expect(page.locator('#cg-name-field')).toBeHidden();
    await expect(page.locator('#cg-fixed')).toContainText('Protective guard');
    await expect(page.locator('#cg-community')).toBeHidden();
    await expect(page.locator('#cg-name')).toHaveValue(examples[prefix].startScenarios[0].characterName);
    if (prefix === 'dune') await expect(page.locator('#cg-place')).toContainText('Well Court');
    await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
    await page.getByRole('button', {name:'Begin', exact:true}).click();
    const result = await page.evaluate(function (prefix) {
      FB.game.setPaused(true);
      const s = FB.state, b = s.start.originalPrincipal, M = FB.mobile, r = M.row(s, b.realmId), me = s.chars[s.player.charId];
      const publicGold = FB.treasuryAvailable(s,b.realmId), privateGold = s.player.gold;
      s.player.gold = 0; const separateFunds = FB.treasuryAvailable(s,b.realmId) === publicGold;
      s.player.gold = privateGold;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const sc = FBDATA.startScenarios.find(function (sc) { return sc.id === s.start.scenarioId; });
      const repeated = FB.adoptStartingPrincipal(s, sc);
      M.initialize(s, FB.campaignBookmark(s).realms);
      return {same:me === FB.bookmarkActor(s, b.actorId) && me.id === r.leaderId && me.id === r.guardedParty.characterIds[0],
        one:Object.values(s.chars).filter(function (c) { return c.name === me.name; }).length,
        family:[me.fatherId, me.motherId, me.spouseId].filter(Boolean).length + me.childrenIds.length,
        noPublicRealm:!s.realms.player, noOffice:!FB.realmRulerCharacterSnapshot(s, b.realmId),
        noLand:s.player.provs.length === 0 && s.player.landPlots.length === 0, noCommand:!M.commandValid(s, b.realmId),
        separateFunds:separateFunds,
        noCarriage:r.guardedParty.characterIds.every(function (id) { return M.migration(s, b.realmId).courtIds.indexOf(id) < 0; }),
        location:FB.characterLocation(s, me) === b.location.countyId && s.player.provinceId === b.location.countyId,
        slot:s.player.homeSettlement, tier:s.player.tier, station:me.station, gold:s.player.gold,
        total:M.total(s, b.realmId), camps:r.camps ? r.camps.entries.length : 1,
        track:s.stories[prefix + '_guarded_track'].actorId === me.id,
        repeated:repeated, pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        reviewed:FB.validateStartingPrincipal(s) === undefined && M.validate(s)};
    }, prefix);
    expect(result).toMatchObject({same:true, one:1, family:0, noPublicRealm:true, noOffice:true,
      noLand:true, noCommand:true, separateFunds:true, noCarriage:true, location:true, track:true, repeated:false, pure:true, reviewed:true,
      slot:prefix === 'harbor' ? 0 : 1, tier:prefix === 'harbor' ? 1 : 2,
      station:prefix === 'harbor' ? 1 : 3, gold:prefix === 'harbor' ? 29 : 53,
      total:prefix === 'harbor' ? 1400 : 1600, camps:prefix === 'harbor' ? 1 : 2});
  });

  test(prefix + ' code rejects changed identity and home, and direct entry replays the same guarded world', async function ({page}, info) {
    await imported(page, info, prefix); await choose(page); await page.locator('#btn-bm-seed').click();
    const sc = examples[prefix].startScenarios[0];
    for (const invalid of [code(prefix).replace(sc.characterName.replace(/ /g, '_'), 'Other_Person'),
      code(prefix).replace('-' + sc.sex + '-', '-m-'), code(prefix).replace('-standard', '-established'),
      code(prefix).replace(sc.fixedProvinceId, prefix === 'harbor' ? 'harbor_quay' : 'dune_pass'),
      code(prefix) + (prefix === 'harbor' ? '-1' : '-0')]) {
      await page.locator('#ng-seed').fill(invalid); await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
    }
    await begin(page, prefix);
    const snapshot = function () { return page.evaluate(function () {
      const s = FB.state;
      return JSON.stringify([s.seed,s.chars,s.player,s.start,s.stories,s.authority,s.armies,FB.getRngState() >>> 0,FB.getUidCounter()]);
    }); };
    const first = await snapshot(); await begin(page, prefix, true); expect(await snapshot()).toBe(first);
  });

  test(prefix + ' detached imports reject mismatched principal, authority, identity, home and track without publication', async function ({page}, info) {
    await imported(page, info, prefix);
    const result = await page.evaluate(function (mod) {
      const clone = function (x) { return JSON.parse(JSON.stringify(x)); };
      const sc = mod.startScenarios[0], rid = sc.originalPrincipal.realmId;
      const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),FB.englishMessages()]);
      const stories = FB.stories.list(), stored = localStorage.getItem('fb_mods');
      const changes = [function (m) { m.startScenarios[0].originalPrincipal = null; },
        function (m) { m.startScenarios[0].originalPrincipal.extra = true; },
        function (m) { m.startScenarios[0].originalPrincipal.actorId = 'missing'; },
        function (m) { m.startScenarios[0].originalPrincipal.realmId = 'missing'; },
        function (m) { m.startScenarios[0].rulerRealmId = rid; },
        function (m) { m.startScenarios[0].existingPerson = {}; },
        function (m) { m.startScenarios[0].governmentForm = 'regnum'; },
        function (m) { m.startScenarios[0].onboarding = 'ruler'; },
        function (m) { m.startScenarios[0].startAge++; },
        function (m) { m.startScenarios[0].characterName = 'A different person'; },
        function (m) { m.startScenarios[0].sex = 'm'; },
        function (m) { m.startScenarios[0].startCulture = 'frankish'; },
        function (m) { m.startScenarios[0].startReligion = 'catholic'; },
        function (m) { m.startScenarios[0].tracks = []; },
        function (m) { m.startScenarios[0].familyPresets.established = {}; },
        function (m) { m.startScenarios[0].tier = 3; },
        function (m) { const b = Object.values(m.bookmarks)[0]; delete b.realms.find(function (r) {return r.id === rid;}).mobile.guardedParty; },
        function (m) { const b = Object.values(m.bookmarks)[0]; b.realms.find(function (r) {return r.id === rid;}).mobile.guardedParty.location.countyId = 'missing'; }];
      const rejected = changes.map(function (change) { const m = clone(mod); change(m); return FB.mods.validate(m).length > 0; });
      return {rejected:rejected, valid:FB.mods.validate(mod).length === 0,
        pure:before === JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),FB.englishMessages()]) &&
          stored === localStorage.getItem('fb_mods') && stories.every(function (row, i) {return row === FB.stories.list()[i];})};
    }, examples[prefix]);
    expect(result).toEqual({rejected:Array(18).fill(true), valid:true, pure:true});
  });

  test(prefix + ' guarded personal records remain usable while command, travel and self release are denied', async function ({page}, info) {
    await imported(page, info, prefix); await begin(page, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, M = FB.mobile, b = s.start.originalPrincipal, id = prefix + '_guarded_track';
      const before = JSON.stringify([s.player.gold,M.row(s,b.realmId),M.migration(s,b.realmId),s.armies,s.realms[b.realmId].treasury]);
      const q = FB.stories.quote(s,id,'stay'), applied = FB.stories.apply(s,id,'stay',q);
      return {allowed:q.allowed, applied:applied, repeated:FB.stories.apply(s,id,'stay',q), phase:s.stories[id].phase,
        actor:s.stories[id].decisions.review.actorId === b.charId,
        unchanged:before === JSON.stringify([s.player.gold,M.row(s,b.realmId),M.migration(s,b.realmId),s.armies,s.realms[b.realmId].treasury]),
        command:!M.commandValid(s,b.realmId), travel:FB.travelEligible(s,prefix+'_guard_visit',{readOnly:true}) !== true,
        selfRelease:!M.reviewGuard(s,{realmId:b.realmId,action:'release',actor:{kind:'character',id:b.charId}}).review.allowed};
    }, prefix);
    expect(result).toEqual({allowed:true, applied:true, repeated:false, phase:'done', actor:true, unchanged:true,
      command:true, travel:true, selfRelease:true});
  });

  test(prefix + ' host release rechecks stale terms, moves nobody and requires ordinary paid travel for command reach', async function ({page}, info) {
    await imported(page, info, prefix); await begin(page, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, M = FB.mobile, b = s.start.originalPrincipal, g = M.row(s,b.realmId).guardedParty;
      const host = s.chars[g.authority.characterId], request = {realmId:b.realmId,action:'release',actor:{kind:'character',id:host.id}};
      const q = M.reviewGuard(s,request); host.captive = true; const stale = !M.commit(s,q); delete host.captive;
      const gold = s.player.gold, at = s.player.provinceId;
      const released = M.commit(s,M.reviewGuard(s,request)), repeated = M.commit(s,M.reviewGuard(s,request));
      const noGrant = gold === s.player.gold && at === s.player.provinceId && !M.commandValid(s,b.realmId);
      const choice = FB.travelDestinations(s,prefix+'_guard_visit')[0];
      const paid = !!choice && FB.travelStart(s,prefix+'_guard_visit',choice.destinationId,choice.destinationRealm) &&
        s.player.gold < gold && !M.commandValid(s,b.realmId);
      // Only this journey's bounded daily owner is under test.
      for (let i = 0; i < 90 && s.player.travel && s.player.travel.phase !== 'arrived'; i++) {
        s.turn++; s.date = FB.dateAtTurn(s,s.turn); FB.travelTick(s);
      }
      const arrived = !!s.player.travel && s.player.travel.phase === 'arrived';
      const travelling = !M.commandValid(s,b.realmId);
      // Stage the later ordinary residence boundary independently. Travel
      // alone is not a household move and guard provenance remains unchanged.
      s.player.travel = null; s.player.provinceId = M.migration(s,b.realmId).at;
      s.chars[b.charId].homeProvinceId = s.player.provinceId;
      const local = M.guardCommandReach(s,b.realmId,b.charId);
      return {allowed:q.review.allowed, stale:stale, released:released, repeated:repeated, noGrant:noGrant,
        paid:paid, arrived:arrived, travelling:travelling, local:local,
        party:g.characterIds.every(function (id) {return M.migration(s,b.realmId).courtIds.indexOf(id) < 0;})};
    }, prefix);
    expect(result).toEqual({allowed:true, stale:true, released:true, repeated:false, noGrant:true,
      paid:true, arrived:true, travelling:true, local:true, party:true});
  });

  test(prefix + ' matching guarded and released saves retain depleted pools and strict original provenance', async function ({page}, info) {
    await imported(page, info, prefix); await begin(page, prefix);
    const result = await page.evaluate(function (prefix) {
      const M = FB.mobile, s = FB.state, b = s.start.originalPrincipal, id = prefix+'_guarded_track';
      s.player.gold = 2; const r = M.row(s,b.realmId);
      if (r.camps) r.camps.entries[0].food -= 7; else r.food -= 7;
      FB.stories.apply(s,id,'postpone',FB.stories.quote(s,id,'postpone'));
      const facts = function (s) {return JSON.stringify([s.start,s.player.gold,s.chars,s.stories,M.row(s,b.realmId),s.armies,s.bookmarkSetup]);};
      const before = facts(s), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      const guarded = before === facts(FB.state), stable = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      const mutations = [function (s) { delete s.start.originalPrincipal; }, function (s) {s.start.originalPrincipal = null;},
        function (s) {s.start.originalPrincipal.version = 2;}, function (s) {s.start.originalPrincipal.extra = true;},
        function (s) {s.start.originalPrincipal.actorId = 'other';}, function (s) {s.start.originalPrincipal.realmId = 'other';},
        function (s) {s.start.originalPrincipal.charId = s.start.originalPrincipal.partyIds[1] || 'other';},
        function (s) {s.start.originalPrincipal.partyIds.pop();}, function (s) {s.start.originalPrincipal.guardId = 'other';},
        function (s) {s.start.originalPrincipal.location.countyId = 'other';}, function (s) {delete s.chars[b.charId];},
        function (s) {delete s.stories[id];}];
      const rejected = mutations.map(function (change) {
        const invalid = JSON.parse(JSON.stringify(saved)); change(invalid.state);
        try {FB.save.restore(invalid);return false;} catch (error) {return FB.state === stable && rng === FB.getRngState() && uid === FB.getUidCounter();}
      });
      const g = M.row(FB.state,b.realmId).guardedParty;
      M.commit(FB.state,M.reviewGuard(FB.state,{realmId:b.realmId,action:'release',actor:{kind:'character',id:g.authority.characterId}}));
      FB.stories.apply(FB.state,id,'finish',FB.stories.quote(FB.state,id,'finish'));
      const after = facts(FB.state); FB.save.restore(JSON.parse(FB.save.serialize()));
      return {guarded:guarded, rejected:rejected, released:after === facts(FB.state), phase:FB.state.stories[id].phase};
    }, prefix);
    expect(result).toEqual({guarded:true, rejected:Array(12).fill(true), released:true, phase:'done'});
  });
}

test('expiry and replaced hosting authority preserve original identity without release or replacement', async function ({page}, info) {
  await imported(page,info,'harbor'); await begin(page,'harbor');
  const result = await page.evaluate(function () {
    const M = FB.mobile;
    return ['expiry','host','holder','death'].map(function (kind) {
      const original = FB.state, s = JSON.parse(JSON.stringify(original)), b = s.start.originalPrincipal;
      const r = M.row(s,b.realmId), g = r.guardedParty;
      if (kind === 'host') s.chars[g.authority.characterId].captive = true;
      if (kind === 'holder') s.holder[g.declaration.location.countyId] = 'harbor_commune';
      if (kind === 'death') {s.chars[b.charId].dead = true;s.player.dead = true;}
      s.turn = kind === 'expiry' ? g.endTurn : 1; s.date = FB.dateAtTurn(s,s.turn); r.lastAI = Math.floor(s.turn/90);
      M.day(s); FB.stories.get('harbor_guarded_track').day(s,s.stories.harbor_guarded_track);
      const noRelease = !M.commandValid(s,b.realmId) && g.status === (kind === 'expiry' ? 'expired' : 'interrupted');
      FB.state = s;
      try {
        const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
        return noRelease && FB.state.start.originalPrincipal.charId === b.charId &&
          M.row(FB.state,b.realmId).leaderId === b.charId &&
          (kind !== 'death' || FB.state.stories.harbor_guarded_track.phase === 'interrupted');
      } finally {FB.state = original;}
    });
  });
  expect(result).toEqual(Array(4).fill(true));
});

test('actual player succession archives the personal review while the original guarded selection remains save provenance', async function ({page}, info) {
  await imported(page,info,'harbor'); await begin(page,'harbor');
  const result = await page.evaluate(function () {
    const s = FB.state, original = s.player.charId, me = s.chars[original];
    // A later child is staged here; the original opening has no invented kin.
    const child = FB.makeCharacter(s,{name:'Later Reed',sex:'m',born:882,culture:me.culture,religion:me.religion,station:me.station});
    child.motherId = me.id; me.childrenIds.push(child.id);
    FB.game.die('A bounded succession fixture.'); FB.game.succeedTo(child.id);
    FB.stories.get('harbor_guarded_track').day(s,s.stories.harbor_guarded_track);
    const phase = s.stories.harbor_guarded_track.phase;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {dead:FB.state.chars[original].dead, player:FB.state.player.charId === child.id,
      original:FB.state.start.originalPrincipal.charId === original, phase:phase,
      noCommand:!FB.mobile.commandValid(FB.state,FB.state.start.originalPrincipal.realmId),
      noRestart:FB.state.stories.harbor_guarded_track.actorId === original};
  });
  expect(result).toEqual({dead:true,player:true,original:true,phase:'interrupted',noCommand:true,noRestart:true});
});

test('a retained world without the principal declaration cannot offer the new personal beginning', async function ({page}, info) {
  await imported(page,info,'harbor');
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (sc) {return sc.id === 'harbor_guarded_principal';});
    const bm = FB.bookmark('harbor_world'), retained = FB.bookmark('harbor_world','unbound');
    return FB.originalPrincipalStartProfile(sc,retained) === null && !FB.startProvinceAllowed(sc,retained,sc.fixedProvinceId) &&
      !!FB.originalPrincipalStartProfile(sc,bm) && FB.validateBookmark(bm).length === 0 && FB.validateBookmark(retained).length === 0;
  })).toBe(true);
  await begin(page,'harbor');
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), original = FB.state;
    saved.state.start.revision = 'unbound';
    try {FB.save.restore(saved);return false;} catch (error) {return FB.state === original;}
  })).toBe(true);
});

test('stale personal review and wrong direct home cannot change the guarded beginning', async function ({page}, info) {
  await imported(page,info,'dune'); await begin(page,'dune');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'dune_guarded_track', before = JSON.stringify(s.stories[id]);
    const q = FB.stories.quote(s,id,'stay'); s.turn = 1; s.date = FB.dateAtTurn(s,1);
    const stale = !FB.stories.apply(s,id,'stay',q) && before === JSON.stringify(s.stories[id]);
    FB.game.pending.settlementIdx = 0;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = FB.game.start() === false;
    return stale && rejected && FB.state === s && rng === FB.getRngState() && uid === FB.getUidCounter();
  })).toBe(true);
});

test('ordinary starts retain absent legacy selection and reject unsolicited principal provenance', async function ({page}, info) {
  await imported(page,info,'harbor'); await choose(page); await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('GUARDEDLEGACY-harbor_world-harbor_household-harbor_quay-m-Oren-standard');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result = await page.evaluate(function () {
    FB.game.setPaused(true);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    const stable = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const absent = stable.start.originalPrincipal === undefined;
    saved.state.start.originalPrincipal = {version:1};
    let rejected = false;
    try {FB.save.restore(saved);} catch (error) {rejected = FB.state === stable && rng === FB.getRngState() && uid === FB.getUidCounter();}
    return {absent:absent,rejected:rejected};
  });
  expect(result).toEqual({absent:true,rejected:true});
});
