'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, advanceBookmark, restoreBookmark, facts } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
// This whole-runtime smoke canary intentionally covers every registered date.
dependsOnRuntime(__filename, ['index.html', 'data', 'js', 'css']);
const { installStoryProof } = require('../support/game/story-proof');
const proofMod = require('../fixtures/bookmarks/proof-mod.json');
const fs = require('fs');
const path = require('path');

// UTF-8 bytes of the ordinary uncompressed v4 JSON, excluding transport codecs
// and browser-storage overhead. Budgets are acceptance ceilings, not measured
// claims. Each owner run attaches actual checkpoint and final byte counts.
const SAVE_BUDGETS = { fresh:4 * 1024 * 1024, checkpoint:6 * 1024 * 1024, continued:6 * 1024 * 1024 };
const BOOKMARK_IDS = ['476','493','568','711','800','867','1066','1096','1204','1241'];

test('every authored bookmark data file is loaded and the authoring template is unloaded', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const dataDirectory = path.resolve(__dirname, '..', '..', '..', 'data');
  const authored = fs.readdirSync(dataDirectory).filter(function (name) { return /^bookmark_\d+.*\.js$/.test(name); });
  const scripts = await page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('script[src]'), function (script) { return script.getAttribute('src'); });
  });
  for (const file of authored) expect(scripts).toContain('data/' + file);
  expect(scripts).not.toContain('docs/bookmark-template.js');
});

async function saveWithinBudget(page, testInfo, label, budget) {
  const text = await page.evaluate(function () { return FB.save.serialize(); });
  const bytes = Buffer.byteLength(text, 'utf8');
  expect(bytes, label + ' uncompressed save bytes').toBeLessThanOrEqual(budget);
  await testInfo.attach(label + '-save-size.json', {
    body:Buffer.from(JSON.stringify({ bytes:bytes, budget:budget, format:4 })), contentType:'application/json'
  });
  expect(JSON.parse(text).v).toBe(4);
  return text;
}

for (const sample of [
  { bookmark:'867', scenario:'serf', parts:7 },
  { bookmark:'476', scenario:'federate_476', parts:9 }
]) {
  test('bookmark smoke codes preserve the ' + sample.parts + '-part identity at ' + sample.bookmark,
    async function ({ page }, testInfo) {
      await beginBookmark(page, testInfo, sample.bookmark, sample.scenario);
      const result = await page.evaluate(function () {
        const s = FB.state, me = s.chars[s.player.charId];
        const county = FB.bookmark(s.start.id).provinces.filter(function (p) { return p.id === s.player.provinceId; })[0];
        return { parts:s.seed.split('-').length,
          principal:me.culture === county.culture && me.religion === county.religion,
          authored:Array.isArray(county.communities) && county.communities.some(function (c) {
            return c.culture === me.culture && c.religion === me.religion;
          }) };
      });
      expect(result).toEqual({ parts:sample.parts, principal:sample.parts === 7, authored:sample.parts === 9 });
    });
}

test('bookmark facts preserve RNG bits across signed and unsigned representations', async function ({ page }, testInfo) {
  await beginBookmark(page, testInfo, '867');
  const signed = await page.evaluate(function () {
    FB.seedRng(0); FB.rng(); FB.rng();
    return FB.getRngState();
  });
  expect(signed).toBeLessThan(0);
  const original = await facts(page);
  expect(original.campaign.rng).toBe(signed >>> 0);
  expect(original.snapshot.rng).toBe(signed >>> 0);
  await page.evaluate(function (value) { FB.setRngState(value); }, signed >>> 0);
  expect(await facts(page)).toEqual(original);
  await page.evaluate(function (value) { FB.setRngState(value ^ 1); }, signed);
  const changed = await facts(page);
  expect(changed.campaign.rng).not.toBe(original.campaign.rng);
  expect(changed.snapshot.rng).not.toBe(original.snapshot.rng);
});

for (const id of BOOKMARK_IDS) {
  test(id + ' restores across bookmarks and continues one natural season', async function ({ page }, testInfo) {
    await beginBookmark(page, testInfo, id);
    const ids = await page.evaluate(function () { return FB.bookmarks(true).map(function (bm) { return bm.id; }).sort(); });
    expect(ids).toEqual(BOOKMARK_IDS.slice().sort());
    await saveWithinBudget(page, testInfo, id + '-fresh', SAVE_BUDGETS.fresh);
    await advanceBookmark(page, 45);
    const checkpoint = await saveWithinBudget(page, testInfo, id + '-midseason', SAVE_BUDGETS.checkpoint);
    const checkpointFacts = await facts(page);
    const checkpointState = JSON.parse(checkpoint).state;
    for (const key of ['bookmarkSetup', 'religiousHeadVacancies']) {
      if (checkpointState[key] !== undefined) expect(checkpointFacts.campaign[key]).toEqual(checkpointState[key]);
    }
    // Matching hidden saves activate their own definition without creation hooks.
    await page.evaluate(function (other) {
      return new Promise(function (resolve, reject) {
        FB.activateBookmark(other, null, function (error) { if (error) reject(error); else resolve(); });
      });
    }, ids.find(function (other) { return other !== id; }));
    await page.evaluate(function (id) { FB.bookmark(id).hidden = true; }, id);
    await restoreBookmark(page, checkpoint);
    expect(await facts(page)).toEqual(checkpointFacts);
    await advanceBookmark(page, 45);
    expect((await facts(page)).campaign.turn).toBe(checkpointFacts.campaign.turn + 45);
    await saveWithinBudget(page, testInfo, id + '-season', SAVE_BUDGETS.continued);
  });
}

test('a cardinal public officer retains recognition references after death and restore', async function ({page},testInfo) {
  await beginBookmark(page,testInfo,'711');
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'byzantium_711', R = FB.governmentRecognition;
    const c = Object.keys(s.papacy.cardinals).map(function (id) { return s.chars[id]; }).find(function (c) {
      return c && !c.dead && s.papacy.cardinals[c.id].office === 'cardinal' &&
        s.holder[c.homeProvinceId] === rid && FB.publicCountyIncome(s,rid,c.homeProvinceId) > 0;
    });
    if (!c) throw new Error('Expected a cardinal in a productive public county');
    const cid = c.id, pid = c.homeProvinceId;
    FB.SKILLS.forEach(function (key) { c.skills[key] = 20; });
    s.realms[rid].treasury.gold = 1000;
    const appointment = FB.publicAppoint(s,FB.publicAppointmentQuote(s,{kind:'realm',id:rid},{
      institutionId:rid,officeId:FB.administrationProfile(s,rid).governor,
      holderId:cid,provinceId:pid,scope:{kind:'county',id:pid}
    }));
    if (!appointment) throw new Error('Cardinal public appointment failed');
    const seat = R.members(s,rid).find(function (seat) { return seat.principal.id === cid; });
    const candidate = R.candidates(s,rid)[0];
    if (!seat || !candidate || !R.applySupport(s,R.supportQuote(s,seat.principal,rid,seat.id,candidate.id)))
      throw new Error('Cardinal recognition failed');
    const votes = JSON.parse(JSON.stringify(s.authority.governments[rid].recognition));
    const archive = s.papacy.archive.length;
    FB.killChar(s,c);
    const retained = !!s.chars[cid] && s.chars[cid].dead;
    const ineffective = !FB.publicOfficeRows(s,rid).find(function (row) { return row.id === appointment.id; }).effective;
    const fault = FB.validatePublicAdministrationState(s);
    if (fault) return {retained:retained,ineffective:ineffective,fault:fault};
    const save = FB.save.serialize(); FB.save.restore(JSON.parse(save));
    return {retained:retained,ineffective:ineffective,fault:fault,original:votes,
      restored:FB.state.authority.governments[rid].recognition,
      dead:FB.state.chars[cid].dead,archived:FB.state.papacy.archive.length === archive + 1,
      retired:!FB.state.papacy.cardinals[cid]};
  });
  expect(result).toMatchObject({retained:true,ineffective:true,fault:null,dead:true,archived:true,retired:true});
  expect(result.restored).toEqual(result.original);
});

test('711 public recognition remains serializable at the annual boundary', async function ({page},testInfo) {
  await beginBookmark(page,testInfo,'711');
  const checkpoints = await page.evaluate(function () {
    const out = [], s = FB.state;
    for (let year = 0; year < 2; year++) {
      s.date.year++; s.date.season = 0; s.date.day = 1; s.turn += 360;
      FB.worldTick(s);
      const fault = FB.validatePublicAdministrationState(s);
      out.push({year:s.date.year,fault:fault,recognition:!fault ? null :
        Object.keys(s.authority.governments).filter(function (rid) {
          return s.authority.governments[rid].recognition;
        }).map(function (rid) {
          const row = s.authority.governments[rid], tree = s.realms[rid].succession;
          return {realmId:rid,votes:row.recognition,generation:FB.realmRulerGeneration(s,rid),
            members:tree && Object.keys(tree.members || {}),
            principals:Object.values(row.recognition).map(function (vote) {
              return {principal:vote.principal,present:!!(vote.principal.kind === 'realm'
                ? s.realms[vote.principal.id] : s.chars[vote.principal.id])};
            })};
        })});
      if (fault) break;
      FB.save.serialize();
    }
    return out;
  });
  await testInfo.attach('annual-recognition.json', {body:Buffer.from(JSON.stringify(checkpoints)),contentType:'application/json'});
  expect(checkpoints.map(function (row) { return row.fault; })).toEqual([null,null]);
  const checkpoint = await saveWithinBudget(page,testInfo,'711-annual-boundaries',SAVE_BUDGETS.continued);
  const before = await facts(page);
  await restoreBookmark(page,checkpoint);
  expect(await facts(page)).toEqual(before);
});

test('a persisted data-only mod supplies a different campaign and independent institution seeds', async function ({ page }, testInfo) {
  await installStoryProof(page);
  // Load the literal JSON through the ordinary stored-mod boot boundary.
  await page.addInitScript(function (source) { localStorage.setItem('fb_mods', JSON.stringify([source])); }, JSON.stringify(proofMod));
  await beginBookmark(page, testInfo, 'proof_bookmark', 'proof_coastal');
  const opening = await page.evaluate(function () {
    const s = FB.state, bishop = FB.religiousOfficeSnapshot(s, 'rome_bishop');
    return { date:s.date.year, owner:s.owner.rennes, culture:FB.world.byId.rennes.culture,
      playerCulture:s.chars[s.player.charId].culture,
      bishop:bishop.name, vacant:s.religiousHeads.constantinople_patriarch === null,
      stories:FB.stories.attached(s), signature:FB.mods.sig(),
      original:FBDATA.localInstitutions.rome_see.historicalName,
      communities:FB.bookmark('proof_bookmark').provinces.filter(function (p) {
        return p.realm === 'proof_coast';
      }).map(function (p) { return { id:p.id, communities:p.communities }; }),
      starts:FB.bookmark('proof_bookmark').starts, errors:FB.validateBookmark(FB.bookmark('proof_bookmark')) };
  });
  expect(opening).toMatchObject({ date:500, owner:'proof_coast', culture:'proof_culture',
    playerCulture:'proof_culture', bishop:'Proof Roman bishop', vacant:true,
    starts:['proof_farmer','proof_coastal'], errors:[] });
  // Independent attachments follow declaration registration anchors, not
  // the bookmark list's order. Require the exact declared story set.
  expect(opening.stories.slice().sort()).toEqual(proofMod.bookmarks.proof_bookmark.stories.slice().sort());
  expect(opening.signature).not.toBe('');
  expect(opening.original).not.toBe('Proof Roman bishop');
  expect(opening.communities).toHaveLength(5);
  for (const province of opening.communities) expect(province.communities).toEqual([
    { culture:'proof_culture', religion:'nicene', populationShare0:10000 }
  ]);
  await advanceBookmark(page, 30);
  const checkpoint = await saveWithinBudget(page, testInfo, 'proof-checkpoint', SAVE_BUDGETS.checkpoint);
  const original = await facts(page);
  // openGame navigates and waits for boot. A separate reload would start a
  // deferred ui_modals.js request and immediately abort it with that navigation.
  await openGame(page, testInfo);
  await restoreBookmark(page, checkpoint);
  expect(await facts(page)).toEqual(original);
  await advanceBookmark(page, 30);
  const continuation = await facts(page);
  await restoreBookmark(page, checkpoint);
  await advanceBookmark(page, 30);
  expect(await facts(page)).toEqual(continuation);
  await saveWithinBudget(page, testInfo, 'proof-continued', SAVE_BUDGETS.continued);
});
