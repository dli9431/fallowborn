'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { installStoryProof } = require('../support/game/story-proof');
dependsOnRuntime(__filename, ['index.html','data/bookmark_800.js','data/bookmark_800_history.js',
  'data/story_instances.js','data/political_institutions.js','js/stories.js','js/story_settlements.js',
  'js/royal_settlements.js','js/starts.js','js/world.js','js/model.js','js/main.js','js/save.js','js/save_v4.js']);

test('each settlement type plays a second data-only instance with a different family and regions', async function ({ page }, testInfo) {
  await installStoryProof(page);
  await openGame(page, testInfo);
  const result = await page.evaluate(async function () {
    await new Promise(function (resolve, reject) {
      FB.activateBookmark('proof_settlements_900', null, function (error) { if (error) reject(error); else resolve(); });
    });
    FB.game.pending = { seed:'GENERIC-SETTLEMENT-PROOF' }; FB.game.startObserve(); FB.game.setPaused(true);
    let s = FB.state, cast = s.stories.proof_partition.cast;
    const order = FB.stories.attached(s), source = JSON.stringify(FB.bookmark(s.start.id));
    function approve(id) { return FB.stories.apply(s, id, 'approve', FB.stories.quote(s, id, 'approve')); }
    s.realms.proof_senior.treasury.gold = 100; s.realms.proof_partner.treasury.gold = 100;
    s.date.year = 902;
    const exchange = approve('proof_exchange'), funds = [s.realms.proof_senior.treasury.gold,s.realms.proof_partner.treasury.gold];
    s.date.year = 906;
    const owners = JSON.stringify([s.owner,s.holder]), partition = approve('proof_partition');
    const pendingBorders = owners === JSON.stringify([s.owner,s.holder]);
    s.date.year = 912;
    FB.transferProvince(s, 'venezia', 'proof_senior');
    const recognition = approve('proof_recognition');
    const family = s.realms.proof_senior.succession;
    const successor = Object.keys(family.members).find(function (id) { return family.members[id].charId === cast.successor; });
    FB.designateRoyalHeir(s, 'proof_senior', successor);
    FB.killChar(s, s.chars[cast.parent]);
    FB.stories.get('proof_partition').day(s, s.stories.proof_partition);
    // A third child is an ordinary counterfactual birth, never a historical seed.
    const father = s.chars[cast.successor], mother = FB.spouseSnapshot(s, father);
    s.date.year = 906;
    const baby = FB.makeCharacter(s, { name:'Proof third child', sex:'m', born:906,
      culture:'frankish', religion:'catholic', dyn:'Proof House', fatherId:father.id, motherId:mother.id });
    father.childrenIds.push(baby.id); mother.childrenIds.push(baby.id); FB.registerRoyalBirth(s, baby, father, mother);
    s.date.year = 917;
    const designation = approve('proof_designation'), shares = s.stories.proof_designation.plan.shares;
    const capitals = shares.map(function (share) { return s.realms[share.realmId].capital; });
    FB.killChar(s, father);
    s.date.year = 943;
    const treaty = approve('proof_treaty');
    const saved = JSON.parse(FB.save.serialize()), rng = FB.getRngState() >>> 0;
    FB.save.restore(saved); s = FB.state;
    return { order:order, exchange:exchange, funds:funds, partition:partition, pendingBorders:pendingBorders,
      recognition:recognition, designation:designation, capitals:capitals, treaty:treaty,
      free:shares.every(function (share) { return !s.realms[share.realmId].liege; }),
      retained:JSON.stringify(s.stories) === JSON.stringify(saved.state.stories), rng:rng === (FB.getRngState() >>> 0),
      data:source === JSON.stringify(FB.bookmark(s.start.id)), faults:FB.validateBookmark(FB.bookmark(s.start.id)) };
  });
  expect(result).toEqual({ order:['proof_partition','proof_designation','proof_exchange','proof_recognition','proof_treaty'],
    exchange:true, funds:[106,94], partition:true, pendingBorders:true, recognition:true,
    designation:true, capitals:['paris','regensburg'], treaty:true, free:true, retained:true, rng:true, data:true, faults:[] });
});

test('shared references resolve opening actors, required fields, rulers and both region forms without mutation', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(async function () {
    await new Promise(function (resolve, reject) { FB.activateBookmark('476', null, function (e) { if (e) reject(e); else resolve(); }); });
    FB.game.pending = { seed:'STORY-REFERENCE-PROOF' }; FB.game.startObserve(); FB.game.setPaused(true);
    const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
    const actorId = Object.keys(s.bookmarkSetup.actors)[0];
    const opening = FB.stories.resolve(s, { kind:'opening_actor', actorId:actorId });
    const ruler = FB.stories.resolve(s, { kind:'realm_ruler', realmId:'italy' });
    const legacy = FB.stories.resolve(s, { storyId:'western_court_476', field:'westRulerId' });
    const field = FB.stories.resolve(s, { kind:'story', storyId:'western_court_476', field:'westRulerId' });
    const counties = FB.stories.resolve(s, { kind:'provinces', provinceIds:['ravenna','roma'] });
    return { opening:opening === s.bookmarkSetup.actors[actorId], ruler:ruler === FB.realmRulerCharacterSnapshot(s, 'italy').id,
      field:field === legacy && typeof field === 'string', counties:counties,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() };
  });
  expect(result).toEqual({ opening:true, ruler:true, field:true, counties:['ravenna','roma'], pure:true });
});

for (const [name, expected] of [['type','unknown story type'],['date','invalid date window'],
  ['requires','unreachable requires'],['field','unresolved story field'],['opening','unresolved opening actor'],
  ['region','unresolved region'],['province','unresolved province'],['ruler','unresolved ruler'],['cost','Invalid diplomatic exchange']]) {
  test('bookmark requirements reject malformed story ' + name + ' before generation', async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function (name) {
      const bm = JSON.parse(JSON.stringify(FB.bookmark('800'))), d = FB.stories.get('gifts_800').declaration;
      const old = JSON.parse(JSON.stringify(d)), rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state;
      if (name === 'type') d.type = 'missing_type';
      if (name === 'date') d.lastYear = d.firstYear - 1;
      if (name === 'requires') d.requires = ['recognition_800'];
      if (name === 'field') d.actor.character.field = 'cast.missing';
      if (name === 'opening') d.actor.character = { kind:'opening_actor', actorId:'missing_actor' };
      if (name === 'region') d.extra = { kind:'region', regionId:'missing_region' };
      if (name === 'province') d.extra = { kind:'provinces', provinceIds:['missing_province'] };
      if (name === 'ruler') d.actor.character = { kind:'realm_ruler', realmId:'missing_realm' };
      if (name === 'cost') d.actorGift = -1;
      const faults = FB.validateBookmark(bm);
      Object.keys(d).forEach(function (key) { delete d[key]; }); Object.assign(d, old);
      return { faults:faults, pure:rng === FB.getRngState() && uid === FB.getUidCounter() && state === FB.state };
    }, name);
    expect(result.faults.join('\n')).toContain(expected);
    expect(result.pure).toBe(true);
  });
}
