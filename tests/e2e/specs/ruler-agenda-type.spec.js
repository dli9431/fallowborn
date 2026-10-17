'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const proof = require('../fixtures/authoring/ruler-agendas.json');
dependsOnRuntime(__filename, ['index.html','js/story_ruler_agenda.js','js/story_campaign.js','data/story_campaigns.js','js/stories.js','js/starts.js',
  'js/government_aristocracy.js','js/government_administration.js','js/government_recognition.js',
  'js/government_support.js','js/government_collective.js','js/government_assembly.js','js/mobile_confederations.js',
  'js/government_selection.js','js/treasury.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/main.js','data/starts.js','data/aristocratic_courts.js','data/bookmark_1204_terrain.js','data/technology.js']);

async function importedStart(page, info, scenario) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/ruler-agendas.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FB.stories.get('proof_royal_agenda'); });
  await startParityGame(page, info, { bookmark:scenario === 'peroz_476' ? '476' : '1204', scenario:scenario, declaredOpening:true });
}

test('ordinary JSON royal agenda funds one canonical bargain, preserves review purity and restores without replay', async function ({ page }, info) {
  await importedStart(page, info, 'peroz_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'proof_royal_agenda', t = s.stories[id];
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.stories.quote(s, id, 'proof_negotiate');
    FB.stories.cards(s); FB.stories.choices(s, id);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const pending = JSON.parse(FB.save.serialize()), funds = FB.treasuryAvailable(s, 'player');
    const applied = FB.stories.apply(s, id, 'proof_negotiate', q);
    const repeated = FB.stories.apply(s, id, 'proof_negotiate', q);
    const charge = funds - FB.treasuryAvailable(s, 'player');
    const terms = FB.aristocracy.constituency(s, 'player').find(function (m) { return m.id === 'mihran'; }).terms;
    const waitingChoices = FB.stories.choices(s, id).map(function (c) { return c.id; });
    const saved = JSON.parse(FB.save.serialize()), record = JSON.stringify(t), paidFunds = FB.treasuryAvailable(s, 'player');
    FB.save.restore(saved);
    const retained = record === JSON.stringify(FB.state.stories[id]) && paidFunds === FB.treasuryAvailable(FB.state, 'player');
    FB.save.restore(pending);
    const resumed = FB.stories.apply(FB.state, id, 'proof_negotiate', FB.stories.quote(FB.state, id, 'proof_negotiate'));
    const replay = record === JSON.stringify(FB.state.stories[id]) && paidFunds === FB.treasuryAvailable(FB.state, 'player');
    return { pure:pure, applied:applied, repeated:repeated, charge:charge, terms:terms, waitingChoices:waitingChoices, retained:retained, resumed:resumed, replay:replay };
  });
  expect(result).toEqual({ pure:true, applied:true, repeated:false, charge:8,
    terms:{ revenue:0.65, levy:0.6, status:'assent' }, waitingChoices:['agenda_stop_program'], retained:true, resumed:true, replay:true });
});

test('royal agenda rejects changed funds and insufficient funds, and can stop before a future review', async function ({ page }, info) {
  await importedStart(page, info, 'peroz_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'proof_royal_agenda';
    const q = FB.stories.quote(s, id, 'proof_negotiate'); s.player.gold -= 1;
    const before = JSON.stringify(s);
    const stale = FB.stories.apply(s, id, 'proof_negotiate', q);
    const unchanged = before === JSON.stringify(s);
    s.player.gold = 0;
    const poor = FB.stories.quote(s, id, 'proof_negotiate').allowed;
    const keep = FB.stories.apply(s, id, 'proof_keep_terms', FB.stories.quote(s, id, 'proof_keep_terms'));
    const stopped = FB.stories.apply(s, id, 'agenda_stop_program', FB.stories.quote(s, id, 'agenda_stop_program'));
    return { stale:stale, unchanged:unchanged, poor:poor, keep:keep, stopped:stopped, status:s.stories[id].status };
  });
  expect(result).toEqual({ stale:false, unchanged:true, poor:false, keep:true, stopped:true, status:'agenda_stopped' });
});

for (const refusal of [false, true]) {
  test('ordinary JSON local agenda retains public ownership with refusal ' + refusal, async function ({ page }, info) {
    await importedStart(page, info, 'siwa_delegate_1204');
    const result = await page.evaluate(function (refusal) {
      const s = FB.state, id = 'proof_local_agenda', rid = 'siwa_households_1204', C = FB.governments.support;
      if (refusal) C.profile(s, rid).members.forEach(function (m) { m.support = 0; });
      const privateGold = s.player.gold, publicGold = FB.treasuryAvailable(s, rid), owners = JSON.stringify([s.owner,s.holder]);
      const q = FB.stories.quote(s, id, 'proof_impose_dues'), before = JSON.stringify(s);
      const accepted = FB.stories.apply(s, id, 'proof_impose_dues', q);
      const rejectedUnchanged = !refusal || before === JSON.stringify(s);
      if (refusal) FB.stories.apply(s, id, 'proof_keep_dues', FB.stories.quote(s, id, 'proof_keep_dues'));
      const row = C.row(s, rid), saved = JSON.parse(FB.save.serialize()), facts = JSON.stringify([row.dues,row.decisions,s.stories[id]]);
      FB.save.restore(saved);
      const retained = facts === JSON.stringify([C.row(FB.state,rid).dues,C.row(FB.state,rid).decisions,FB.state.stories[id]]);
      return { allowed:q.allowed, accepted:accepted, rejectedUnchanged:rejectedUnchanged, retained:retained,
        privateSame:privateGold === FB.state.player.gold, publicSame:publicGold === FB.treasuryAvailable(FB.state,rid),
        ownersSame:owners === JSON.stringify([FB.state.owner,FB.state.holder]), status:FB.state.stories[id].status,
        dues:row.dues && row.dues.amount, executed:row.decisions.filter(function (d) { return d.status === 'executed'; }).length };
    }, refusal);
    expect(result).toEqual({ allowed:!refusal, accepted:!refusal, rejectedUnchanged:true, retained:true,
      privateSame:true, publicSame:true, ownersSame:true, status:'agenda_complete', dues:refusal ? null : 1, executed:refusal ? 0 : 1 });
  });
}

for (const scenario of ['peroz_476','siwa_delegate_1204']) {
  test('personal agenda interrupts once after incumbent loss for ' + scenario, async function ({ page }, info) {
    await importedStart(page, info, scenario);
    const result = await page.evaluate(function (scenario) {
      const s = FB.state, id = scenario === 'peroz_476' ? 'proof_royal_agenda' : 'proof_local_agenda', t = s.stories[id];
      const pending = FB.stories.quote(s, id, scenario === 'peroz_476' ? 'proof_keep_terms' : 'proof_keep_dues');
      if (scenario === 'peroz_476') s.realms.player.ruler.generation++;
      else FB.governments.support.row(s, 'siwa_households_1204').mandate.status = 'ended';
      const stale = FB.stories.apply(s, id, pending.id, pending);
      FB.stories.get(id).day(s, t); const closed = JSON.stringify(t);
      FB.stories.get(id).day(s, t);
      return { stale:stale, status:t.status, once:closed === JSON.stringify(t), choices:FB.stories.choices(s,id) };
    }, scenario);
    expect(result).toEqual({ stale:false, status:'agenda_interrupted', once:true, choices:[] });
  });
}

for (const fault of ['operation','unknown_field','duplicate_choice','reserved_choice','source','source_choice','terms','date','no_fallback']) {
  test('agenda declaration rejects ' + fault + ' without registry, campaign, RNG or identity mutation', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (input) {
      const table = Object.assign({}, FBDATA.storyInstances, input.storyInstances), d = table.proof_royal_agenda;
      const c = d.stages[0].choices[0];
      if (input.fault === 'operation') c.operation = 'arbitrary_write';
      if (input.fault === 'unknown_field') c.statePath = 'player.gold';
      if (input.fault === 'duplicate_choice') d.stages[1].choices[0].id = c.id;
      if (input.fault === 'reserved_choice') c.id = 'agenda_stop_program';
      if (input.fault === 'source') { c.operation = 'agenda_story_choice'; c.storyId = 'missing_source'; c.choiceId = 'accept'; }
      if (input.fault === 'source_choice') {
        d.requires = ['theoderic_italy_476'];
        d.stages[0].choices[0] = { id:'proof_unknown_source_choice', label:'Unknown', detail:'Invalid source choice.',
          operation:'agenda_story_choice', storyId:'theoderic_italy_476', choiceId:'not_a_campaign_choice' };
      }
      if (input.fault === 'terms') c.revenue = 2;
      if (input.fault === 'date') d.stages[0].season = 4;
      if (input.fault === 'no_fallback') d.stages[0].choices.pop();
      const state = JSON.stringify(FB.state), ids = FB.stories.list().map(function (r) { return r.id; }).join(), rng = FB.getRngState(), uid = FB.getUidCounter();
      let error = ''; try { FB.stories.compile(table); } catch (e) { error = e.message; }
      return { rejected:!!error, pure:state === JSON.stringify(FB.state) && ids === FB.stories.list().map(function (r) { return r.id; }).join() &&
        rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, { storyInstances:proof.storyInstances, fault:fault });
    expect(result).toEqual({ rejected:true, pure:true });
  });
}

test('optional agenda save extension preserves absence and rejects malformed records before adoption', async function ({ page }, info) {
  await importedStart(page, info, 'peroz_476');
  const result = await page.evaluate(function () {
    const id = 'proof_royal_agenda', saved = JSON.parse(FB.save.serialize()), broken = JSON.parse(JSON.stringify(saved));
    broken.state.stories[id].step = 1;
    const live = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter(), source = JSON.stringify(broken);
    let rejected = false; try { FB.save.restore(broken); } catch (_) { rejected = true; }
    const pure = live === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() && source === JSON.stringify(broken);
    delete saved.state.stories[id]; FB.save.restore(saved); FB.stories.day(FB.state);
    return { rejected:rejected, pure:pure, absent:!FB.state.stories[id] };
  });
  expect(result).toEqual({ rejected:true, pure:true, absent:true });
});

test('a territorial ruler losing the whole domain cannot continue the original court program', async function ({ page }, info) {
  await importedStart(page, info, 'peroz_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'proof_royal_agenda', t = s.stories[id], person = s.player.charId;
    const q = FB.stories.quote(s,id,'proof_keep_terms');
    FB.realmTerritory(s,'player').slice().forEach(function (pid) { FB.transferProvince(s,pid,'byzantium'); });
    const stale = FB.stories.apply(s,id,'proof_keep_terms',q);
    FB.stories.get(id).day(s,t);
    return { stale:stale, samePerson:person === s.player.charId, status:t.status };
  });
  expect(result).toEqual({ stale:false, samePerson:true, status:'agenda_interrupted' });
});

test('changing an imported agenda under the same mod name rejects its old campaign fingerprint', async function ({ page }, info) {
  await importedStart(page,info,'peroz_476');
  const saved = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  const changed = JSON.parse(JSON.stringify(proof));
  changed.storyInstances.proof_royal_agenda.stages[1].year = 478;
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({ name:'ruler-agendas.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(changed)) });
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FB.stories.get('proof_royal_agenda'); });
  const result = await page.evaluate(function (saved) {
    const live = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter(), source = JSON.stringify(saved);
    let rejected = false; try { FB.save.restore(saved); } catch (_) { rejected = true; }
    return { rejected:rejected, pure:live === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() && source === JSON.stringify(saved) };
  },saved);
  expect(result).toEqual({ rejected:true, pure:true });
});
