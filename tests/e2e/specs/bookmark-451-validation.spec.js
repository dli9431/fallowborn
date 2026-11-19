'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle} = require('../support/game/navigation');
const {beginBookmark,advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {installPageGuards} = require('../support/page-contract');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const gameRoot = path.resolve(__dirname,'../../..');
const fixtureDirectory = path.resolve(__dirname,'../fixtures/authoring');
const {prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {expectModAdmission} = require('../support/game/mod-admission');
const governmentFixture = require('../fixtures/authoring/government-451-catalogues.json');
governmentFixture.malformedGroups.push.apply(governmentFixture.malformedGroups,require('../fixtures/authoring/stories-451-validation.json').malformedGroups);
const courtPersonImport = require('../fixtures/authoring/court-person-451-import.json');
const startFixtureFiles = ['starts-451-openings.json'];
const {useReleasedStartRules} = require('../support/game/released-starts');
dependsOnRuntime(__filename,['js/story_household_party.js','js/story_household.js','js/story_opening_goals.js','js/story_ruler_agenda.js','js/events.js','data/starts.js','data/economy.js']);
dependsOnRuntime(__filename,['data/actions.js','js/actions.js','js/day_phases.js','js/treasury.js','js/ui_misc.js','js/ui_panels.js']);

for (const file of startFixtureFiles) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDirectory,file),'utf8'));
  test(file + ': complete offered starts and explicit holds',async function ({page},info) {
    await useReleasedStartRules(page);
    await openGame(page,info);
    const result = await page.evaluate(function (fixture) {
      const bm = FB.bookmark('451');
      const offered = bm.starts.filter(function (id) {
        const sc = FBDATA.startScenarios.find(function (sc) { return sc.id === id; });
        return sc && !sc.hidden;
      });
      return {ids:offered.filter(function (id) { return id !== 'farmer_451'; }).sort(),
        held:fixture.held.filter(function (id) { return offered.indexOf(id) >= 0; }),
        hidden:fixture.heldDefinitions.map(function (row) {
          const sc = FBDATA.startScenarios.find(function (sc) { return sc.id === row.id; });
          return {id:row.id,hidden:sc && sc.hidden};
        }),
        starts:fixture.starts.map(function (row) {
          const sc = FBDATA.startScenarios.find(function (sc) { return sc.id === row.id; });
          if (!sc) return {id:row.id,errors:FB.bookmarkSources.reports()};
          return {id:row.id,report:FB.startRuntimeReport(sc,bm),families:Object.keys(sc.familyPresets),
            tracks:sc.tracks};
        })};
    },fixture);
    expect(result.ids).toEqual(fixture.starts.map(function (row) { return row.id; }).sort());
    expect(result.held).toEqual([]);
    result.hidden.forEach(function (row) { expect(row.hidden,row.id).toBe(true); });
    result.starts.forEach(function (row,index) {
      const expected = fixture.starts[index];
      expect(row.report,JSON.stringify(row)).toMatchObject({valid:true});
      expect(row.families).toEqual(expected.families);
      expect(row.tracks).toContain(expected.story);
      expect(row.tracks).toContain(expected.opening);
      if (expected.party) expect(row.tracks).toContain(expected.party);
    });
  });
  for (const row of fixture.starts) for (const family of row.families) {
    test(row.id + ' / ' + family + ': code, actual person and first decision',async function ({page},info) {
      await useReleasedStartRules(page);
      await openGame(page,info);
      await page.evaluate(function () { FBDATA.bookmarks['451'].hidden = false; });
      const full = page.locator('#btn-choose-beginning');
      if (await full.isVisible()) await full.click();
      else await page.getByRole('button',{name:'New Game',exact:true}).click();
      await page.locator('#btn-bm-seed').click();
      await page.locator('#ng-seed').fill('OPENINGS-451-' + row.id + '-' + row.province + '-m-' + (row.name || 'Review') + '-' + family + '-0-' + row.culture + '.' + row.religion);
      await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
      await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
      await page.getByRole('button',{name:'Begin',exact:true}).click();
      const result = await page.evaluate(function (row) {
        FB.game.setPaused(true);
        const s = FB.state, sc = FB.campaignStart(s), me = s.chars[s.player.charId];
        const tracks = FB.startTracks(sc,row.province);
        return {scenario:s.start.scenarioId,code:s.seed,name:me.name,culture:me.culture,religion:me.religion,
          tracks:tracks,choices:FB.stories.choices(s,row.story).map(function (c) { return c.id; }),
          opening:!!s.stories[row.opening],
          actor:row.actor ? FB.bookmarkActor(s,row.actor).id === me.id : null,
          forces:row.mandate ? FB.officeMandates.snapshot(s,s.bookmarkSetup.appointments[row.mandate].id).forces : null};
      },row);
      expect(result.scenario).toBe(row.id);
      expect(result.culture).toBe(row.culture);
      expect(result.religion).toBe(row.religion);
      expect(result.code).toContain('-451-' + row.id + '-' + row.province + '-');
      expect(result.code.split('-')[6] || 'standard').toBe(family);
      expect(result.tracks).toContain(row.story);
      expect(result.tracks).toContain(row.opening);
      expect(result.opening).toBe(true);
      expect(result.choices).toContain(row.choice);
      if (row.name) expect(result.name).toBe(row.name);
      if (row.actor) expect(result.actor).toBe(true);
      if (row.mandate) expect(result.forces).toEqual([]);
      await page.evaluate(function () { FB.ui.showMenu(); });
      await expect(page.locator('#m-seed')).toHaveValue(result.code);
      await page.evaluate(function (row) { FB.ui.closeModal();FB.ui.showStorySheet(row.story); },row);
      const choice = page.locator('[data-story-choice="' + row.choice + '"]');
      await expect(choice).toBeVisible();
      // Blocked service still exposes its canonical review and actual blocker.
      if (!row.reviewOnly) {
        await expect(choice).toHaveAttribute('aria-disabled','false');
        await choice.click();
        await expect(page.locator('#gm-story-confirm')).toBeVisible();
        await page.locator('#gm-story-confirm').click();
        await expect(page.locator('#gm-story-continue')).toBeVisible();
      }
      if (row.party) {
        const party = await page.evaluate(function (row) {
          const s = FB.state;
          return {attached:!!s.stories[row.party],choices:FB.stories.choices(s,row.party).length};
        },row);
        expect(party.attached).toBe(true);
        expect(party.choices).toBeGreaterThan(0);
      }
    });
  }
  test(file + ': held definitions reject ordinary start codes',async function ({page},info) {
    await useReleasedStartRules(page);
    await openGame(page,info);
    await page.evaluate(function () { FBDATA.bookmarks['451'].hidden = false; });
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    for (const row of fixture.heldDefinitions) {
      await page.locator('#ng-seed').fill('HELD-451-' + row.id + '-' + row.province + '-m-Review-standard');
      await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#ng-seed-err')).not.toHaveText('');
      await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    }
  });
}
test.describe.configure({mode:'parallel'});
// Append registrations. Regional corrections, declarations, starts and stories
// share the canonical checks and literal value assertions below.
const fixtureFiles = [
  'government-451-catalogues.json',
  'bookmark-451-a-western-provinces.json',
  'bookmark-451-b.json',
  'world-451-corrections-c.json',
  'bookmark-451-d-eastern-frontiers.json',
  'bookmark-451-scaffold.json'
];
const slots = ['bookmark_451','bookmark_451_composition','bookmark_451_scaffold_a','bookmark_451_scaffold_b',
  'bookmark_451_scaffold_c','bookmark_451_scaffold_d','bookmark_451_identities','bookmark_451_governments',
  'bookmark_451_presentation','starts_451','story_451','campaigns_451','events_451'];
const checkRoots = ['bookmark','cultures','religions','governmentForms','authorityOffices','mobileProfiles',
  'administrationProfiles','aristocraticProfiles','lexicons','wardrobes','historicalAmbitions','startScenarios','storyInstances'];
dependsOnRuntime(__filename,['index.html','data/bookmark_manifest.js','data/bookmark_sources.js',
  'data/bookmark_476.js','data/bookmark_476_wider.js','data/geographies.js','data/eras.js','data/technology.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/world.js','js/mods.js','js/main.js',
  'js/mobile_confederations.js','js/office_mandates.js','js/government_aristocracy.js','js/government_administration.js',
  'js/authority.js','data/office_mandates.js','data/aristocratic_courts.js','data/political_institutions.js',
  'data/lexicons.js','data/wardrobes.js',
  'js/starts.js','js/stories.js','js/bookmark_setup.js','js/save.js','js/save_v4.js']
  .concat(slots.map(function (name) { return 'data/' + name + '.js'; })));

test('all regional fixtures and dated source slots are registered exactly once',async function ({page},info) {
  expect(fixtureFiles.slice().sort()).toEqual(fs.readdirSync(fixtureDirectory).filter(function (file) {
    if (file === 'government-451-catalogues.json') return true;
    if (file === 'world-451-corrections-c.json') return true;
    return /^bookmark-451.*\.json$/.test(file);
  }).sort());
  expect(new Set(fixtureFiles).size).toBe(fixtureFiles.length);
  await openTitle(page,info);
  const cold = await page.evaluate(function () {
    return {offered:FB.bookmarkSources.menuData().bookmarks.map(function (row) { return row.id; }),
      loaded:FB.bookmarkSources.dateLoaded('451')};
  });
  expect(cold.loaded).toBe(false);
  expect(cold.offered).not.toContain('451');
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.bookmarkSources.loadDates(['451'],function (error) { if (error) reject(error); else resolve(); });
    });
  });
  const selected = await page.evaluate(function () {
    const report = FB.bookmarkSources.prepareSetup('451'), bm = FB.bookmark('451');
    return {report:report,exists:!!bm,faults:bm && FB.validateBookmark(bm),available:FB.bookmarkAvailable('451'),
      hidden:bm && bm.hidden,coverage:FBDATA.techCoverage,technology:FBDATA.eras.late_antique.technology,
      technologyFaults:bm && FB.bookmarkTechnologyFaults(bm,'late_antique'),
      paths:Array.prototype.map.call(document.querySelectorAll('script[data-bookmark-source]'),
        function (script) { return script.getAttribute('data-bookmark-source'); }),manifest:FB.bookmarkSources.manifestReport()};
  });
  expect(selected.exists,JSON.stringify(selected.report)).toBe(true);
  expect(selected.faults).toEqual([]);
  expect(selected.available).toBe(false);
  expect(selected.hidden).toBe(true);
  expect(selected.coverage).toEqual({from:375,to:1300});
  expect(selected.technology).toEqual({from:375,to:649,startingKnowledge:'historical'});
  expect(selected.technologyFaults).toEqual([]);
  expect(selected.manifest.faults).toEqual([]);
  slots.forEach(function (name) { expect(selected.paths.filter(function (p) { return p === 'data/' + name + '.js'; })).toHaveLength(1); });
});

for (const file of fixtureFiles) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDirectory,file),'utf8'));
  test(file + ': canonical world, declarations, starts and stories',async function ({page},info) {
    (fixture.checks || []).forEach(function (check) { expect(checkRoots).toContain(check.root || 'bookmark'); });
    await openGame(page,info);
    const result = await page.evaluate(function (fixture) {
      const bm = FB.bookmark(fixture.bookmarkId), faults = [];
      if (!bm) return {missing:FB.bookmarkSources.reports().filter(function (row) { return row.bookmarkId === '451'; })};
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      faults.push.apply(faults,FB.validateBookmark(bm));
      const regions = {};
      Object.keys(FBDATA.bookmarkRegions451).forEach(function (key) {
        const region = FBDATA.bookmarkRegions451[key];
        regions[key] = {counties:region.provinces.map(function (row) { return row.id; }),
          realms:region.realms.map(function (row) { return row.id; })};
      });
      const values = (fixture.checks || []).map(function (check) {
        let target = !check.root || check.root === 'bookmark' ? bm : FBDATA[check.root];
        check.path.forEach(function (key) {
          if (target === undefined || target === null) return;
          target = typeof key === 'string' && key.charAt(0) === '@'
            ? target.find(function (row) { return row.id === key.slice(1); }) : target[key];
        });
        return target;
      });
      const starts = (fixture.starts || []).map(function (id) {
        const definition = FBDATA.startScenarios.find(function (row) { return row.id === id; });
        return {id:id,offered:bm.starts.indexOf(id) >= 0,report:definition && FB.startRuntimeReport(definition,bm)};
      });
      const stories = (fixture.stories || []).map(function (id) {
        return {id:id,registered:!!FB.stories.get(id),attached:bm.stories.indexOf(id) >= 0 ||
          FBDATA.startScenarios.some(function (start) { return bm.starts.indexOf(start.id) >= 0 && start.tracks && start.tracks.indexOf(id) >= 0; })};
      });
      return {faults:faults,regions:regions,values:values,starts:starts,stories:stories,
        physical:FBDATA.geographies.europe_regional.provinces.concat(FBDATA.geographies.europe_regional_2.provinceAdditions)
          .map(function (row) { return row.id; }),world:bm.provinces.map(function (row) { return row.id; }),
        pack:FBDATA.eventPacks.dated_451,periodFault:FB.contentPeriodFault(FBDATA.eventPacks.dated_451),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },fixture);
    expect(result.missing).toBeUndefined();
    expect(result.faults).toEqual([]);
    expect(result.pure).toBe(true);
    expect(result.world.slice().sort()).toEqual(result.physical.slice().sort());
    const counties = Object.keys(result.regions).reduce(function (all,key) { return all.concat(result.regions[key].counties); },[]);
    const realms = Object.keys(result.regions).reduce(function (all,key) { return all.concat(result.regions[key].realms); },[]);
    expect(new Set(counties).size).toBe(counties.length);
    expect(new Set(realms).size).toBe(realms.length);
    expect(counties.slice().sort()).toEqual(result.world.slice().sort());
    if (fixture.regions) {
      expect(Object.keys(result.regions).sort()).toEqual(Object.keys(fixture.regions).sort());
      Object.keys(fixture.regions).forEach(function (key) {
        expect(result.regions[key].counties.slice().sort()).toEqual(fixture.regions[key].counties.slice().sort());
      });
    }
    (fixture.checks || []).forEach(function (check,index) { expect(result.values[index],check.path.join('.')).toEqual(check.equals); });
    result.starts.forEach(function (row) { expect(row.offered,row.id).toBe(true);expect(row.report,row.id).toMatchObject({valid:true}); });
    result.stories.forEach(function (row) { expect(row,row.id).toMatchObject({registered:true,attached:true}); });
    expect(result.pack).toEqual({bookmarkIds:['451'],eras:['late_antique'],yearMin:451,yearMax:453});
    expect(result.periodFault).toBeFalsy();
  });
}

test('existing raw worlds and every retained revision keep their fingerprints',async function ({page,browser},info) {
  await openGame(page,info);
  async function signatures(target) {
    return target.evaluate(function () {
      return Object.keys(FBDATA.bookmarks).filter(function (id) { return id !== '451'; }).map(function (id) {
        return {id:id,raw:FB.mods.fingerprint(FBDATA.bookmarks[id]),revisions:FB.bookmarkRevisions(id).map(function (world) {
          return {id:world.revision || 'baseline',signature:FB.mods.fingerprint(world)};
        })};
      });
    });
  }
  const context = await browser.newContext(), control = await context.newPage(), guard = installPageGuards(control);
  try {
    await control.route('**/data/bookmark_manifest.js',function (route) {
      const source = fs.readFileSync(path.join(gameRoot,'data/bookmark_manifest.js'),'utf8')
        .replace(/    '451':\{[\s\S]*?requires:\['476'\]\},\r?\n/,'')
        .split('\n').filter(function (line) { return !/\['data\/[^']*451[^']*\.js',\['451'\]\]/.test(line); }).join('\n');
      return route.fulfill({status:200,contentType:'application/javascript',body:source});
    });
    await control.route('**/data/bookmark_sources.js',function (route) {
      const source = fs.readFileSync(path.join(gameRoot,'data/bookmark_sources.js'),'utf8').replace("finish(['451',","finish([");
      return route.fulfill({status:200,contentType:'application/javascript',body:source});
    });
    await openGame(control,info);
    expect(await control.evaluate(function () { return Object.keys(FBDATA.bookmarks).indexOf('451'); })).toBe(-1);
    expect(await signatures(page)).toEqual(await signatures(control));
    expect(guard.faults).toEqual([]);
  } finally { await context.close(); }
});

test('a malformed ordinary JSON bookmark replacement rejects without mutation',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const mod = {name:'Invalid regional owner',bookmarks:{'451':JSON.parse(JSON.stringify(FB.bookmark('451')))}};
    mod.bookmarks['451'].provinces[0].realm = 'missing_regional_owner';
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state;
    const faults = FB.mods.validate(JSON.parse(JSON.stringify(mod)));
    return {faults:faults,pure:before === JSON.stringify(FBDATA) && state === FB.state &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.faults.join('\n')).toContain('missing_regional_owner');
  expect(result.pure).toBe(true);
});

test('the generic hidden scaffold household completes a bounded journey and save replay',async function ({page},info) {
  await beginBookmark(page,info,'451','farmer_451');
  await advanceBookmark(page,10);
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  await advanceBookmark(page,8);
  const finish = await facts(page);
  await restoreBookmark(page,source);
  await advanceBookmark(page,8);
  expect(await facts(page)).toEqual(finish);
  const spent = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,spent);
  expect(await facts(page)).toEqual(finish);
});

for (const group of governmentFixture.malformedGroups) {
  test('dated declarations reject malformed ' + group.name + ' atomically',async function ({page},info) {
    await openGame(page,info);
    const results = await page.evaluate(function (rows) {
      const baseline = JSON.stringify(FBDATA), state = JSON.stringify(FB.state),
        rng = FB.getRngState(), uid = FB.getUidCounter(), storage = JSON.stringify(localStorage);
      return rows.map(function (row) {
        const candidate = {name:'Malformed dated declaration'}, root = row.path[0], id = row.path[1];
        candidate[root] = {};
        candidate[root][id] = JSON.parse(JSON.stringify(root === 'bookmarks' ? FB.bookmark(id) : FBDATA[root][id]));
        let target = candidate;
        row.path.slice(0,-1).forEach(function (key) {
          target = typeof key === 'string' && key.charAt(0) === '@'
            ? target.find(function (entry) { return entry.id === key.slice(1); }) : target[key];
        });
        target[row.path[row.path.length-1]] = row.value;
        const input = JSON.stringify(candidate), faults = FB.mods.validate(candidate);
        return {path:row.path.join('.'),faults:faults,pure:input === JSON.stringify(candidate) &&
          baseline === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
          rng === FB.getRngState() && uid === FB.getUidCounter() && storage === JSON.stringify(localStorage)};
      });
    },group.rows);
    results.forEach(function (row) {
      expect(row.faults.length,row.path).toBeGreaterThan(0);
      expect(row.pure,row.path).toBe(true);
    });
  });
}

test('the countyless coalition feeds its camp and preserves generated hosting authority on repeated restore',async function ({page},info) {
  await beginBookmark(page,info,'451','farmer_451');
  const opening = await page.evaluate(function () {
    const s = FB.state, M = FB.mobile, rid = 'hunnic_coalition_451', row = M.row(s,rid),
      source = FB.campaignBookmark(s).realms.find(function (r) { return r.id === 'sirmium_local_451'; }),
      custodian = FB.bookmarkActor(s,'sirmium_custodian_451');
    return {forms:new Set(FB.campaignBookmark(s).realms.map(function (r) { return r.government; })).size,
      counties:Object.keys(s.owner).filter(function (pid) { return s.owner[pid] === rid || s.holder[pid] === rid; }),
      generated:source.ruler.generated === true && source.ruler.name === undefined && !!custodian.name,
      original:custodian.id === FB.openingRulerCharacterId(source),
      marker:row.openingAccess.authority[0].characterId === custodian.id,
      valid:M.validate(s),total:M.total(s,rid),food:row.food+M.host(s,rid).mobileFood};
  });
  expect(opening.forms).toBeGreaterThanOrEqual(5);
  expect(opening).toMatchObject({counties:[],generated:true,original:true,marker:true,valid:true,total:1300,food:1170});
  await advanceBookmark(page,14);
  const supplied = await page.evaluate(function () {
    const s = FB.state, M = FB.mobile, rid = 'hunnic_coalition_451';
    return {food:M.row(s,rid).food,used:s.mobilePastures.used.sirmium,total:M.total(s,rid),valid:M.validate(s)};
  });
  expect(supplied.food).toBeGreaterThan(0);
  expect(supplied.used).toBeGreaterThan(0);
  expect(supplied).toMatchObject({total:1300,valid:true});
  const expected = await facts(page), saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await facts(page)).toEqual(expected);
  const again = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,again);
  expect(await facts(page)).toEqual(expected);
  const invalid = await page.evaluate(function () {
    const baseline = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter(), storage = JSON.stringify(localStorage);
    const damaged = JSON.parse(baseline), rid = 'hunnic_coalition_451', other = FB.bookmarkActor(FB.state,'aetius_451').id;
    FB.mobile.row(damaged,rid).openingAccess.authority[0].characterId = other;
    let rejected = false;
    try { FB.mobile.validate(damaged); } catch (error) { rejected = /openingAccess/.test(error.message); }
    return {rejected:rejected,pure:baseline === JSON.stringify(FB.state) && rng === FB.getRngState() &&
      uid === FB.getUidCounter() && storage === JSON.stringify(localStorage)};
  });
  expect(invalid).toEqual({rejected:true,pure:true});
});

test('the original western court person holds a working finite warrant without adopting the public account',async function ({page},info) {
  await beginBookmark(page,info,'451','farmer_451');
  const result = await page.evaluate(function () {
    const s = FB.state, c = FB.bookmarkActor(s,'aetius_451'), member = FB.authoredRoyalMemberSnapshot(s,'italy','aetius'),
      saved = s.bookmarkSetup.appointments.aetius_service_451, M = FB.officeMandates,
      target = {officeId:'comes_largitionum',holderId:FB.bookmarkActor(s,'western_receiver_451').id,scope:{kind:'realm',id:'italy'}},
      actor = {kind:'character',id:c.id}, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter(),
      q = M.review(s,actor,saved.id,'propose',{target:target}), snapshot = M.snapshot(s,saved.id);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const privateGold = s.player.gold, publicGold = s.realms.italy.treasury.gold;
    const proposed = M.commit(s,q), appointment = s.authority.appointments.find(function (r) { return r.id === saved.id; });
    return {same:c.id === member.charId,count:Object.keys(s.chars).filter(function (id) { return s.chars[id].name === 'Aetius'; }).length,
      status:snapshot.status,suspension:snapshot.suspension,term:appointment.endTurn,powers:snapshot.terms.powers,
      publicAccount:!!snapshot.publicAccount,allowed:q.allowed,reason:q.reason,pure:pure,proposed:proposed,
      pending:appointment.mandate.proposal && appointment.mandate.proposal.status,
      unchangedFunds:privateGold === s.player.gold && publicGold === s.realms.italy.treasury.gold,
      ruler:FB.realmRulerCharacterSnapshot(s,'italy').name,forces:snapshot.forces};
  });
  expect(result,JSON.stringify(result)).toMatchObject({same:true,count:1,status:'active',term:360,
    powers:['negotiate','pay','propose'],publicAccount:true,allowed:true,pure:true,proposed:true,pending:'pending',
    unchangedFunds:true,ruler:'Valentinian III',forces:[]});
  expect(result.suspension).toBeFalsy();
  const expected = await facts(page), saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await facts(page)).toEqual(expected);
  const again = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,again);
  expect(await facts(page)).toEqual(expected);
  const invalid = await page.evaluate(function () {
    const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter(),
      damaged = JSON.parse(before), original = damaged.bookmarkSetup.actors.aetius_451;
    damaged.bookmarkSetup.actors.aetius_451 = damaged.player.charId;
    // Keep the appointment mapping internally consistent: the original-person
    // binding itself must still reject substitution.
    damaged.authority.appointments.forEach(function (a) {
      if (a.holder.kind === 'character' && a.holder.id === original) a.holder.id = damaged.bookmarkSetup.actors.aetius_451;
    });
    let rejected = false;
    try { FB.save.v4.validatePlatform(damaged); } catch (error) { rejected = /bookmarkSetup\.actors\.aetius_451/.test(error.message); }
    return {rejected:rejected,pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(invalid).toEqual({rejected:true,pure:true});
});

test('an ordinary JSON import binds a different court person and retains the exact original identity',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await expectModAdmission(page,courtPersonImport);
  await page.locator('#modfile').setInputFiles(path.join(fixtureDirectory,'court-person-451-import.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'mandate_coast','mandate_household');
  const result = await page.evaluate(function () {
    const s = FB.state, c = FB.bookmarkActor(s,'lantern_notable'), member = FB.authoredRoyalMemberSnapshot(s,'lantern_court','clerk'),
      id = s.bookmarkSetup.appointments.clerk_warrant.id, snapshot = FB.officeMandates.snapshot(s,id);
    return {same:c.id === member.charId,name:c.name,count:Object.keys(s.chars).filter(function (id) { return s.chars[id].name === 'Sen Lark'; }).length,
      status:snapshot.status,powers:snapshot.terms.powers,term:snapshot.appointment.endTurn};
  });
  expect(result).toEqual({same:true,name:'Sen Lark',count:1,status:'active',powers:['propose'],term:180});
  const expected = await facts(page), saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await facts(page)).toEqual(expected);
  const again = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,again);
  expect(await facts(page)).toEqual(expected);
});

test('the hidden date review offers a civic household whose records earnings survive a cold Continue',async function ({page},info) {
  const fixture = require('../fixtures/authoring/starts-451-openings.json');
  const {civicReview} = require('../fixtures/authoring/stories-451-validation.json');
  await useReleasedStartRules(page);
  await openGame(page,info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  const date = page.locator('#bookmarklist [data-bookmark="451"]');
  await expect(date).toHaveCount(0);
  await page.locator('#btn-bm-seed').click();
  const seed = page.locator('#ng-seed');
  await seed.fill(civicReview.code);
  await seed.press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('This starting date is hidden for new campaigns.');
  await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);

  await page.evaluate(function () { FBDATA.bookmarks['451'].hidden = false; });
  await seed.fill('CIVICREVIEW');
  await seed.press('Enter');
  await date.click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  const cards = page.locator('#scenariolist [data-scenario]');
  const offered = await cards.evaluateAll(function (rows) {
    return rows.map(function (row) { return row.getAttribute('data-scenario'); }).sort();
  });
  expect(offered).toEqual(fixture.starts.map(function (row) { return row.id; }).concat('farmer_451').sort());
  for (const id of fixture.held) expect(offered).not.toContain(id);
  await cards.filter({hasText:'Aurelianum civic household'}).click();
  await expect(page.locator('#btn-pick-random')).toHaveText('Continue');
  await page.locator('#btn-pick-random').click();
  await expect(page.locator('#cg-family label')).toHaveCount(2);
  await expect(page.locator('input[name=cg-family][value="established"]')).toBeChecked();
  await page.locator('#cg-name').fill('Review');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();

  function snapshot(input) {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    return {start:s.start,code:s.seed,turn:s.turn,date:s.date,focus:p.focus,
      identity:{id:me.id,name:me.name,sex:me.sex,born:me.born,culture:me.culture,religion:me.religion,
        profession:me.career.profession,rank:me.career.rank,home:p.provinceId,tier:p.tier},
      family:{founder:p.houseFounderId,spouse:me.spouseId,children:me.childrenIds},
      finances:{gold:p.gold,prestige:p.prestige,piety:p.piety},
      story:s.stories[input.storyId],goal:s.stories[input.openingId].goals.earned};
  }
  const opening = await page.evaluate(snapshot,civicReview);
  expect(opening).toMatchObject({start:{id:'451',scenarioId:civicReview.scenarioId},
    code:'CIVICREVIEW-451-gallic_curialis_451-orleans-m-Review-established',turn:0,
    identity:{name:'Review',sex:'m',born:421,culture:'gallo_roman',religion:'nicene',
      profession:'curialis',rank:'journeyman',home:'orleans',tier:2},
    finances:{gold:80,prestige:30,piety:10},story:{actorId:opening.identity.id,phase:'livelihood'},
    goal:{status:'pending'}});
  expect(opening.family.founder).toBe(opening.identity.id);
  expect(opening.family.spouse).toBeTruthy();
  expect(opening.family.children.length).toBeGreaterThan(0);

  await page.locator('[data-tab="actions"]').click();
  await page.locator('[data-story-card="' + civicReview.storyId + '"]').click();
  const work = page.locator('[data-story-choice="work"]');
  await expect(work).toHaveAttribute('aria-disabled','false');
  await work.click();
  await page.locator('#gm-story-confirm').click();
  await page.locator('#gm-story-continue').click();
  const selected = await page.evaluate(snapshot,civicReview);
  expect(selected).toMatchObject({turn:opening.turn,date:opening.date,identity:opening.identity,
    family:opening.family,finances:opening.finances,focus:'keep_records',goal:{status:'pending'},
    story:{phase:'working',decisions:{livelihood:{choiceId:'work',actorId:opening.identity.id,turn:0}}}});

  const payment = await page.evaluate(function () {
    const s = FB.state, ordinaryTick = FB.tickFocus, payments = [];
    FB.game.auto.all = true;
    FB.game.auto.style = 'first';
    delete s.player.flags.tutorial;
    FB.tickFocus = function (state) {
      const gold = state.player.gold, sovereign = FB.topRealm(state,state.owner.orleans);
      const publicGold = FB.treasuryAvailable(state,sovereign);
      ordinaryTick(state);
      payments.push({gain:state.player.gold - gold,
        publicFundsUnchanged:FB.treasuryAvailable(state,sovereign) === publicGold});
    };
    try { FB.game.passDay({deferUi:true}); }
    finally { FB.tickFocus = ordinaryTick; }
    return payments;
  });
  expect(payment).toHaveLength(1);
  expect(payment[0].gain).toBeGreaterThan(0);
  expect(payment[0].publicFundsUnchanged).toBe(true);
  const paid = await page.evaluate(snapshot,civicReview);
  expect(paid).toMatchObject({turn:1,identity:opening.identity,family:opening.family,
    finances:{gold:opening.finances.gold + payment[0].gain},focus:'keep_records',
    story:{phase:'paid'},goal:{status:'completed'}});

  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.save.toSlot('auto',function (ok) { if (ok) resolve(); else reject(new Error('Save failed')); });
    });
  });
  await openTitle(page,info);
  expect(await page.evaluate(function () { return FB.bookmarkSources.dateLoaded('451'); })).toBe(false);
  await page.locator('#btn-continue').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
  expect(await page.evaluate(snapshot,civicReview)).toEqual(paid);
  expect(await page.evaluate(function () { return FB.bookmarkAvailable('451'); })).toBe(false);
});
