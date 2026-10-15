'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startGames, bookGames } = require('../support/game/tournaments');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['data/markets.js','js/population.js','js/politics.js','js/holywar.js','data/policies.js','js/ecclesiastical_validation.js','js/government_ecclesiastical.js','js/religion.js','js/federates.js','js/ambitions.js','index.html','data/political_institutions.js','data/civic_profiles.js',
  'data/ambitions.js','js/technology.js','js/parliament.js','data/papacy.js','js/papacy.js','data/actions.js','js/ui_panels.js','data/economy.js','data/starts.js','data/cultures.js','js/abbeys.js','js/market.js','js/council.js','js/institutions.js','js/ui_modals.js','js/starts.js',
  'data/tournaments.js','js/tournaments.js','js/ui_tournaments.js','js/travel.js','data/travel.js',
  'data/traits.js','js/model.js','js/agency.js','js/actions.js','js/intrigue.js','js/economy.js',
  'data/mobile_confederations.js','data/events_common.js','js/stories.js','js/story_courts.js','js/story_track.js',
  'js/story_campaign.js','js/story_government_selection.js','js/mods.js','js/events.js','js/authority.js',
  'js/ui_civic.js','js/governments.js','js/civic_validation.js','js/civic_transactions.js','js/government_civic.js',
  'js/mobile_confederations.js','js/government_support.js','js/government_selection.js','js/treasury.js',
  'js/world.js','js/main.js','js/save.js','js/save_v4.js']);

async function importProof(page, info, prefix, begin) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/' + prefix + '-contracts.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function (prefix) { return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get(prefix + '_court'); }, prefix);
  if (begin !== false) await beginBookmark(page, info, prefix + '_courts_900', prefix + '_court_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported discipline changes shared focus previews and bounded AI priorities', async function ({ page }, info) {
    await importProof(page, info, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, me = s.chars[s.player.charId];
      me.traits = [];
      FB.addTrait(me, prefix + '_discipline');
      const before = JSON.stringify(s), rng = FB.getRngState();
      const focus = FB.focuses.find(function (f) { return f.id === 'pray'; });
      return { yield:focus.gain(s).piety, literate:FB.traitMechanic(me, 'literacy'),
        peace:FB.traitAimWeight(me, 'keep_peace'), wealth:FB.traitAimWeight(me, 'amass_wealth'),
        pure:before === JSON.stringify(s) && rng === FB.getRngState(), faults:FB.validateTraitMechanics(FBDATA.traitMechanics) };
    }, prefix);
    expect(result).toEqual({ yield:prefix === 'harbor' ? 6 : 8, literate:1,
      peace:prefix === 'harbor' ? 70 : 0, wealth:prefix === 'dune' ? 60 : 0, pure:true, faults:[] });
  });
  test(prefix + ' JSON declares its own branches, prices, office scope and recognition source', async function ({ page }, info) {
    await importProof(page, info, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, id = prefix + '_service', t = s.stories[id], patron = prefix + '_senior';
      const borders = JSON.stringify([s.owner,s.holder,s.settlementLordships]);
      const gold = FB.treasuryAvailable(s, patron);
      function choose(choice) { return FB.stories.apply(s, id, prefix + '_' + choice, FB.stories.quote(s, id, prefix + '_' + choice)); }
      const choices = [choose('accept_delegate'),choose('keep_serving'),choose('offer_pay')];
      const contract = FB.political.contract(s, t.contractId), definition = FB.stories.get(id).declaration;
      const rid = prefix + '_partner', office = prefix + '_receiver', at = prefix === 'harbor' ?
        { kind:'county', id:s.realms[rid].capital } : { kind:'realm', id:rid };
      const request = { institutionId:rid, officeId:office, holder:{ kind:'character', id:s.player.charId }, scope:at };
      const q = FB.officeAppointmentQuote(s, { kind:'realm', id:rid }, request);
      const granted = FB.officeSeekAppointment(s, q), repeated = FB.officeSeekAppointment(s, q);
      const proof = s.authority.recognitions.find(function (r) { return r.source === prefix + '_commission'; });
      const saved = JSON.parse(FB.save.serialize()), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.save.restore(saved);
      return { choices:choices, paid:gold - FB.treasuryAvailable(s, patron), expected:definition.parameters.immediatePay,
        duration:contract.endTurn - contract.startTurn, expectedDuration:definition.parameters.serviceDays,
        granted:!!granted, repeated:!!repeated, source:proof && proof.source,
        mandate:!!proof && FB.legitimacyByMandate(s,proof.subject,proof.scope,'court').some(function (row) { return row.id === proof.id; }), scope:granted && granted.scope.kind,
        borders:borders === JSON.stringify([s.owner,s.holder,s.settlementLordships]),
        restored:JSON.stringify(FB.state.stories) === JSON.stringify(saved.state.stories) &&
          JSON.stringify(FB.state.authority) === JSON.stringify(saved.state.authority),
        rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter() };
    }, prefix);
    expect(result.choices).toEqual([true,true,true]);
    expect(result.paid).toBe(result.expected);
    expect(result.duration).toBe(result.expectedDuration);
    expect(result).toMatchObject({ granted:true, repeated:false, mandate:true, source:prefix + '_commission',
      scope:prefix === 'harbor' ? 'county' : 'realm', borders:true, restored:true, rng:true, uid:true });
  });
}

test('imported civic tenure supports an ordinary resignation without giving private property', async function ({ page }, info) {
  await importProof(page, info, 'harbor');
  const result = await page.evaluate(function () {
    const s = FB.state, V = FB.civicGovernment, rid = 'harbor_commune', r = V.row(s, rid);
    const before = JSON.stringify([s.owner,s.holder,s.settlementLordships]), office = r.offices[0];
    const previous = office.incumbentId;
    const resigned = V.officeApply(s, V.officeQuote(s, rid, office.id, 'resign', { characterId:previous }));
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return { term:V.profile(FB.state, rid).offices[0].termDays, threshold:V.profile(FB.state, rid).consent.war,
      resigned:!!resigned, vacant:!V.row(FB.state, rid).offices[0].incumbentId,
      unchanged:before === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.settlementLordships]),
      story:FB.stories.cards(FB.state).some(function (card) { return card.id === 'harbor_offices'; }) };
  });
  expect(result).toEqual({ term:90, threshold:0.8, resigned:true, vacant:true, unchanged:true, story:true });
});

test('imported mobile access conserves payment, rejects replay and restores saved commitments', async function ({ page }, info) {
  await importProof(page, info, 'dune');
  const result = await page.evaluate(function () {
    const s = FB.state, M = FB.mobile, rid = 'dune_coalition', row = M.row(s, rid), profile = M.profile(s, rid);
    const terms = { kind:'access', partnerId:'papacy', countyIds:['roma'], capacity:100,
      allowRecruit:true, price:profile.accessPrice, duration:profile.accessDays };
    function act(action, terms, actor) { return M.commit(s, M.review(s, { realmId:rid, action:action,
      terms:terms, actor:actor || { kind:'realm', id:rid } })); }
    const proposed = act('propose', { operation:'agreement', proposal:terms });
    const assents = M.members(s, rid).map(function (m) { return !!act('assent', { assent:true }, m.principal); });
    const offered = act('offer', terms), id = row.agreements[0].id;
    const total = FB.treasuryAvailable(s, rid) + FB.treasuryAvailable(s, 'papacy');
    const accepted = act('accept', { agreementId:id }, { kind:'realm', id:'papacy' });
    const repeated = act('accept', { agreementId:id }, { kind:'realm', id:'papacy' });
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return { proposed:!!proposed, assents:assents, offered:!!offered, accepted:!!accepted, repeated:!!repeated,
      conserved:total === FB.treasuryAvailable(FB.state, rid) + FB.treasuryAvailable(FB.state, 'papacy'),
      retained:JSON.stringify(M.row(FB.state, rid)) === JSON.stringify(row),
      noLand:FB.realmTerritory(FB.state, rid).length === 0, threshold:profile.threshold, price:profile.accessPrice };
  });
  expect(result.assents.every(Boolean)).toBe(true);
  expect(result).toMatchObject({ proposed:true, offered:true, accepted:true, repeated:false,
    conserved:true, retained:true, noLand:true, threshold:0.75, price:6 });
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported event subscribes to a lifecycle point with declared conditions', async function ({ page }, info) {
    await importProof(page, info, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, id = prefix + '_greeting', hook = prefix === 'harbor' ? 'household_birth' : 'travel_arrival';
      s.player.gold = 10;
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const absent = FB.queueLifecycleEvents(s, hook, {}).filter(function (q) { return q.id === id; });
      s.player.flags[prefix + '_greetings'] = true;
      const present = FB.queueLifecycleEvents(s, hook, { destinationId:s.player.provinceId });
      const queue = present.filter(function (q) { return q.id === id; });
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return { absent:absent.length, present:queue.length, owner:queue[0] && queue[0].ctx.protagonistId,
        expected:s.player.charId, retained:JSON.stringify(FB.state.eventQueue) === JSON.stringify(saved.state.eventQueue),
        rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter(),
        reward:FB.eventById(id).options[0].effects.prestige };
    }, prefix);
    expect(result).toMatchObject({ absent:0, present:1, retained:true, rng:true, uid:true, reward:prefix === 'harbor' ? 3 : 6 });
    expect(result.owner).toBe(result.expected);
  });
  test(prefix + ' new contest and tactic ids use shared booking, preview, resolution and restore', async function ({ page }, info) {
    await importProof(page, info, prefix);
    const ids = await startGames(page, info);
    const eventId = await bookGames(page, ids, false, { programme:prefix + '_festival', scale:prefix + '_gathering' });
    const result = await page.evaluate(function (args) {
      const s = FB.state, T = FB.tournaments, e = T.get(s, args.eventId), track = args.prefix + '_contest';
      const entered = T.enter(s, T.entry(s, e.id, s.player.charId, track));
      s.turn = e.startTurn + 1;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const q = T.roundPreview(s, e.id, s.player.charId, args.prefix + '_method');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const pending = JSON.parse(FB.save.serialize());
      function resolve() {
        const state = FB.state, review = T.roundPreview(state, e.id, state.player.charId, args.prefix + '_method');
        const first = T.resolveRound(state, review), repeated = T.resolveRound(state, review);
        return { first:first, repeated:repeated, state:JSON.stringify(state), rng:FB.getRngState(), uid:FB.getUidCounter() };
      }
      const first = resolve(); FB.save.restore(pending); const replay = resolve();
      return { entered:!!entered, pure:pure, ready:q && q.ok, scored:q && q.scored,
        first:first.first, repeated:first.repeated, replay:JSON.stringify(first) === JSON.stringify(replay),
        contests:Object.keys(e.contests), policy:T.trackPolicy(track).resolution };
    }, { prefix:prefix, eventId:eventId });
    expect(result).toMatchObject({ entered:true, pure:true, ready:true, scored:prefix === 'harbor', first:true, repeated:false,
      replay:true, policy:prefix === 'harbor' ? 'score' : 'duel' });
    expect(result.contests[0]).toBe(prefix + '_contest');
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported quick start uses the normal character constructor', async function ({ page }, info) {
    await importProof(page, info, prefix, false);
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('[data-quick-start="' + prefix + '_beginning"]').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      return { name:c.name, province:s.player.provinceId, profession:s.player.profession,
        start:s.start.scenarioId, quickStart:s.telemetry.quickStart };
    });
    expect(result).toMatchObject({ name:prefix === 'harbor' ? 'Mara' : 'Tal',
      province:prefix === 'harbor' ? 'barcelona' : 'galway', start:'serf', quickStart:prefix + '_beginning' });
  });
  test(prefix + ' imported appointment pays once, teaches its declared trait and restores the same day', async function ({ page }, info) {
    await importProof(page, info, prefix, false);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, c = s.chars[s.player.charId], roleId = prefix + '_attendant';
      const q = FB.householdServiceStatus(s, roleId);
      const accepted = FB.acceptHouseholdService(s, roleId, { employerId:q.patron.id, charId:c.id, serial:0 });
      const r = s.player.householdService, def = FBDATA.householdServiceRoles[roleId];
      r.learnedDays = def.teachesTrait.days - 1;
      const gold = s.player.gold, saved = JSON.parse(FB.save.serialize());
      function work() {
        const state = FB.state, char = state.chars[state.player.charId];
        const first = FB.tickHouseholdService(state), repeated = FB.tickHouseholdService(state);
        return { first:first, repeated:repeated, paid:state.player.gold - gold,
          learned:char.traits.indexOf(prefix + '_discipline') >= 0,
          record:JSON.stringify(state.player.householdService), rng:FB.getRngState(), uid:FB.getUidCounter() };
      }
      const first = work(); FB.save.restore(saved); const replay = work();
      return { accepted:accepted, first:first, replay:JSON.stringify(first) === JSON.stringify(replay), wage:def.wage / 90 };
    }, prefix);
    expect(result.accepted).toBe(true);
    expect(result.first).toMatchObject({ first:true, repeated:false, learned:true });
    expect(result.first.paid).toBeCloseTo(result.wage, 10); expect(result.replay).toBe(true);
  });
  test(prefix + ' imported workyard supplies its declared basket from real staffed production', async function ({ page }, info) {
    await importProof(page, info, prefix, false);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, c = s.chars[s.player.charId];
      const e = { uid:991, type:prefix + '_workyard', workerId:c.id, provinceId:s.player.provinceId, settlement:0, level:0 };
      s.player.enterprises.push(e);
      const yieldValue = FB.enterpriseYield(s, e), output = FB.marketEnterpriseOutput(s, e);
      const distribution = FB.marketEnterpriseDistribution(s, e);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      const restored = FB.state.player.enterprises.find(function (row) { return row.uid === e.uid; });
      return { yieldValue:yieldValue, output:output, distribution:distribution,
        replay:JSON.stringify(output) === JSON.stringify(FB.marketEnterpriseOutput(FB.state, restored)) };
    }, prefix);
    expect(result.yieldValue).toBeGreaterThan(0); expect(result.replay).toBe(true);
    if (prefix === 'harbor') {
      expect(result.output.wares / result.output.provisions).toBeCloseTo(3, 10);
      expect(result.output.materials).toBe(0); expect(result.distribution.local).toBe(.05);
    } else {
      expect(result.output.materials / result.output.transport).toBeCloseTo(1.5, 10);
      expect(result.output.provisions).toBe(0); expect(result.distribution.overland).toBe(.15);
    }
  });
  test(prefix + ' imported abbey action spends institutional money and saves its own cooldown', async function ({ page }, info) {
    await importProof(page, info, prefix, false);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, c = s.chars[s.player.charId], p = s.player;
      p.tier = 2; c.station = 2; c.sex = 'f'; c.religion = 'catholic'; p.gold = 1000; p.piety = 300; p.prestige = 300;
      const h = FB.foundAbbey(s); h.holderId = c.id; h.treasury = 100; h.support = 50;
      const id = prefix + '_alms', def = FBDATA.abbeys.actions[id], privateGold = p.gold, piety = p.piety;
      const q = FB.abbeyActionStatus(s, h, id), first = FB.runAbbeyAction(s, h, id), repeated = FB.runAbbeyAction(s, h, id);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      const restored = FB.state.abbeys.houses.find(function (row) { return row.id === h.id; });
      return { ready:q.ready, first:!!first, repeated:repeated, treasury:h.treasury,
        expected:100 - def.cost, piety:p.piety - piety, expectedPiety:def.piety,
        property:p.gold === privateGold, retained:JSON.stringify(h) === JSON.stringify(restored),
        cooldown:FB.abbeyActionStatus(FB.state, restored, id).ready };
    }, prefix);
    expect(result).toMatchObject({ ready:true, first:true, repeated:false, property:true, retained:true, cooldown:false });
    expect(result.treasury).toBe(result.expected); expect(result.piety).toBe(result.expectedPiety);
  });
  test(prefix + ' declared religious ranks use contested offices rather than buying a promotion', async function ({ page }, info) {
    await importProof(page, info, prefix, false);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, c = s.chars[s.player.charId], id = prefix + '_vocation';
      c.sex = 'm'; c.religion = prefix + '_rite'; c.born = s.date.year - 40;
      s.player.profession = 'monk'; s.player.piety = 500; s.player.prestige = 500;
      c.career = { profession:'monk', rank:'master', chosen:true, experience:20, guildRank:'none', guildStanding:0 };
      c.skills.lea = 15; c.religiousRanks = {}; c.religiousRanks[id] = 1;
      const before = JSON.stringify(s), rng = FB.getRngState();
      const path = FB.religiousPathOf(s, c), q = FB.abbotAppointmentStatus(s, c);
      const office = FB.religiousOfficePath(s, c, 'abbot');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      return { id:path.id, next:path.next.id, visible:q.visible, office:office.step.id,
        pure:pure, automatic:FB.takeReligiousStep(s, c), rank:c.religiousRanks[id] };
    }, prefix);
    expect(result).toEqual({ id:prefix + '_vocation', next:'keeper', visible:true, office:'keeper', pure:true, automatic:false, rank:1 });
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported focus shares preview, work, and deterministic replay', async function ({ page }, info) {
    await importProof(page, info, prefix, false); await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, c = s.chars[s.player.charId], id = prefix + '_practice';
      c.health = 7;
      const status = FB.focusStatus(s,id), f = FB.focuses.find(function (row) { return row.id === id; });
      const expected = (prefix === 'harbor' ? 2 : 5) + FB.skillOf(c,'ste') / (prefix === 'harbor' ? 4 : 8);
      const before = JSON.stringify(s), rng = FB.getRngState(), preview = f.preview(s), gain = f.gain(s);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState(), save = JSON.parse(FB.save.serialize());
      function run() { const state = FB.state, gold = state.player.gold; f.tick(state); return { paid:state.player.gold-gold,health:state.chars[state.player.charId].health,rng:FB.getRngState(),uid:FB.getUidCounter() }; }
      const first = run(); FB.save.restore(save); const replay = run();
      return { can:status.can, expected:expected, gain:gain.gold, preview:preview.seasonal[0].amount, pure:pure, first:first, replay:JSON.stringify(first) === JSON.stringify(replay) };
    }, prefix);
    expect(result).toMatchObject({ can:true,pure:true,replay:true });
    expect(result.gain).toBe(result.expected); expect(result.preview).toBe(result.expected);
    expect(result.first.paid).toBeCloseTo(result.expected/90,10);
    expect(result.first.health).toBe(prefix === 'harbor' ? 7.01 : 7.02);
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported papal orders, tactics and investiture share canonical records', async function ({ page }, info) {
    await importProof(page, info, prefix, false); await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, c = s.chars[s.player.charId], papacy = FB.ensurePapacy(s), obedience = papacy.obediences[papacy.romanObedience];
      const generatedOrder = obedience.college.some(function (id) { return papacy.cardinals[id].order === prefix + '_reader'; });
      c.sex = 'm'; c.religion = 'catholic'; s.player.prestige = 500;
      const appointed = FB.appointCardinal(s, c, obedience.id, obedience.claimantId, { order:prefix + '_reader', silent:true });
      const election = FB.startPapalElection(s, obedience.id, 'authoring');
      s.turn = Math.max(s.turn, election.waitUntil);
      const prestige = s.player.prestige, saved = JSON.parse(FB.save.serialize());
      function ballot() {
        const state = FB.state, p = FB.ensurePapacy(state), e = p.elections[obedience.id];
        const outcome = FB.papalElectionBallot(state, obedience.id, prefix + '_appeal');
        return { outcome:!!outcome, paid:prestige-state.player.prestige, backing:e.backing[state.player.charId],round:e.round,rng:FB.getRngState(),uid:FB.getUidCounter() };
      }
      const first = ballot(); FB.save.restore(saved); const replay = ballot();
      const realm = FB.state.owner[FB.state.player.provinceId];
      const policy = FB.setInvestiturePolicy(FB.state, prefix + '_appointment', realm, false);
      const policySave = JSON.parse(FB.save.serialize()); FB.save.restore(policySave);
      return { generatedOrder:generatedOrder, appointed:appointed.order, first:first, replay:JSON.stringify(first) === JSON.stringify(replay),
        policy:policy.policy, retained:FB.investiturePolicyForRealm(FB.state, realm).policy,
        kind:FB.papalPolicyKind(policy.policy), strength:FB.papacyRealmStrengthMultiplier(FB.state, realm) };
    }, prefix);
    expect(result).toMatchObject({ generatedOrder:true, appointed:prefix + '_reader', replay:true, policy:prefix + '_appointment', retained:prefix + '_appointment', kind:prefix === 'harbor' ? 'lay' : 'concordat' });
    expect(result.first).toMatchObject({ outcome:true, paid:prefix === 'harbor' ? 10 : 20, backing:prefix === 'harbor' ? 3 : 6 });
    expect(result.strength).toBeCloseTo(prefix === 'harbor' ? 1.03 : .97,10);
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported journey keeps its identity through arrival and replay', async function ({ page }, info) {
    await importProof(page, info, prefix, false); await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      let s = FB.state;
      s.player.gold = 1000;
      for (const rid in s.realms) if (s.realms[rid]) delete s.realms[rid].war;
      const id = prefix + '_journey', dest = FB.travelDestinations(s,id)[0];
      const gold = s.player.gold, started = FB.travelStart(s,id,dest.destinationId,dest.destinationRealm);
      const charge = gold - s.player.gold, saved = JSON.parse(FB.save.serialize());
      function arrive() {
        s = FB.state; s.player.travel.remainingRoute = []; s.player.travel.legDaysLeft = 0;
        FB.travelTick(s);
        const queued = s.eventQueue.find(function (row) { return row.id === prefix + '_arrival'; });
        const event = FB.eventById(queued.id), prestige = s.player.prestige;
        const receipt = FB.resolveEventOption(s,event,event.options[0],queued.ctx,{ automated:false });
        return { receipt:!!receipt,prestige:s.player.prestige-prestige,purpose:s.player.travel.purpose,
          completed:s.player.travel.completed,history:s.player.travelHistory,rng:FB.getRngState(),uid:FB.getUidCounter() };
      }
      const first = arrive(); FB.save.restore(saved); const replay = arrive();
      return { started:started, charge:charge, expected:dest.cost, first:first, replay:JSON.stringify(first) === JSON.stringify(replay) };
    }, prefix);
    expect(result).toMatchObject({ started:true,replay:true }); expect(result.charge).toBe(result.expected);
    expect(result.first).toMatchObject({ receipt:true,prestige:prefix === 'harbor' ? 4 : 9,purpose:prefix + '_journey',completed:true });
  });
  test(prefix + ' imported estates agenda follows its declared aid condition without mutating terms', async function ({ page }, info) {
    await importProof(page, info, prefix, false); await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, p = s.player, c = s.chars[p.charId];
      p.tier = 3; c.station = 3; p.liege = s.owner[p.provinceId];
      for (const rid in s.realms) if (s.realms[rid]) delete s.realms[rid].war;
      const terms = FB.parliamentEnsure(s); terms.aid = .25;
      const before = JSON.stringify(s), rng = FB.getRngState(), first = FB.parliamentSessionCandidates(s);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      terms.aid = FBDATA.balance.parliamentAidMax || .4;
      const second = FB.parliamentSessionCandidates(s);
      return { pure:pure, first:first.indexOf(prefix + '_assembly') >= 0, second:second.indexOf(prefix + '_assembly') >= 0 };
    }, prefix);
    expect(result).toEqual({ pure:true,first:prefix === 'harbor',second:prefix === 'dune' });
  });
  test(prefix + ' imported research preference changes the ordinary ruler score', async function ({ page }, info) {
    await importProof(page, info, prefix, false); await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, rid = s.owner[s.player.provinceId], r = s.realms[rid];
      const candidate = FB.techCandidates(s,rid,true).find(function (row) { return row.available && row.def.domain === 'learning'; });
      r.ruler.trait = null; const ordinary = FB.techAIScore(s,candidate.id,rid);
      r.ruler.trait = prefix + '_discipline'; const preferred = FB.techAIScore(s,candidate.id,rid);
      return { ratio:preferred/ordinary,faults:FB.validateAgencyRules(FBDATA.agencyRules),
        chance:FBDATA.agencyRules.familyProgressChance, cooldown:FBDATA.agencyRules.approachCooldownYears };
    }, prefix);
    expect(result).toEqual({ ratio:prefix === 'harbor' ? 2 : .5,faults:[],chance:prefix === 'harbor' ? .8 : .2,cooldown:prefix === 'harbor' ? 3 : 7 });
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported deed binding uses the ordinary action gate and event queue', async function ({ page },info) {
    await importProof(page,info,prefix,false); await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, status = FB.instantStatus(s,'seek_blessing');
      FB.instants.find(function (d) { return d.id === 'seek_blessing'; }).run(s);
      const item = s.eventQueue.find(function (row) { return row.id === prefix + '_assembly'; });
      const event = FB.eventById(item.id), prestige = s.player.prestige;
      FB.resolveEventOption(s,event,event.options[0],item.ctx,{ automated:false });
      return { can:status.can,prestige:s.player.prestige-prestige,old:s.eventQueue.some(function (row) { return row.id === 'seek_blessing'; }) };
    },prefix);
    expect(result).toEqual({ can:true,prestige:prefix === 'harbor' ? 2 : 5,old:false });
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported track is playable through the shared choice review', async function ({ page },info) {
    await importProof(page,info,prefix);
    const before = await page.evaluate(function () { return { people:Object.keys(FB.state.chars).length,uid:FB.getUidCounter() }; });
    await page.evaluate(function (prefix) { FB.ui.showStorySheet(prefix + '_service'); },prefix);
    await page.locator('[data-story-choice="' + prefix + '_refuse_involvement"]').click();
    await page.locator('#gm-story-confirm').click();
    const result = await page.evaluate(function (prefix) {
      const saved = JSON.parse(FB.save.serialize()), facts = JSON.stringify(FB.state.stories);
      FB.save.restore(saved); FB.save.restore(saved);
      return { result:FB.state.stories[prefix + '_service'].result,people:Object.keys(FB.state.chars).length,
        uid:FB.getUidCounter(),retained:facts === JSON.stringify(FB.state.stories) };
    },prefix);
    expect(result).toEqual({ result:'declined',people:before.people,uid:before.uid,retained:true });
  });
}

test('imported civic household wins and resigns a declared office through shared review', async function ({ page },info) {
  await importProof(page,info,'harbor',false);
  await beginBookmark(page,info,'harbor_courts_900','harbor_civic_household');
  const property = await page.evaluate(function () {
    const s = FB.state, V = FB.civicGovernment, o = V.row(s,'harbor_commune').offices[0];
    if (o.incumbentId) V.officeApply(s,V.officeQuote(s,'harbor_commune',o.id,'resign',{ characterId:o.incumbentId }));
    FB.ui.showCivicGovernment('harbor_commune');
    return JSON.stringify([s.owner,s.holder,s.settlementLordships,s.player.provs]);
  });
  await page.getByRole('button',{ name:/Seek office: Quay magistrate/ }).click();
  await page.locator('#civic-confirm').click(); await page.locator('#civic-continue').click();
  await page.getByRole('button',{ name:/Review selection: Quay magistrate/ }).click();
  await page.locator('#civic-confirm').click(); await page.locator('#civic-continue').click();
  expect(await page.evaluate(function () {
    return FB.civicGovernment.row(FB.state,'harbor_commune').offices[0].incumbentId === FB.state.player.charId;
  })).toBe(true);
  await page.getByRole('button',{ name:/Resign: Quay magistrate/ }).click();
  await page.locator('#civic-confirm').click();
  const result = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return { vacant:!FB.civicGovernment.row(FB.state,'harbor_commune').offices[0].incumbentId,
      property:JSON.stringify([FB.state.owner,FB.state.holder,FB.state.settlementLordships,FB.state.player.provs]) };
  });
  expect(result).toEqual({ vacant:true,property:property });
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported tenancy and freedom terms freeze their own calendar and offer', async function ({ page }, info) {
    await importProof(page, info, prefix, false);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, p = s.player;
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      FB.ensureSerfTenure(s, 'new_game');
      const lord = FB.getRole(s, 'lord', true), target = { kind:'character',id:lord.id };
      FB.adjustStanding(s, target, 65 - FB.standingOf(s,target), 'test:authored_offer');
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const status = FB.freedomPetitionStatus(s);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const offer = FB.createFreedomOffer(s, 'petition');
      const repeat = FB.createFreedomOffer(s, 'petition') === offer;
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return { pure:pure,ready:status.ready,repeat:repeat,arch:p.tenure.archetypeId,
        interval:FBDATA.tenureArchetypes[p.tenure.archetypeId].duties[0].intervalTurns,
        days:offer && offer.serviceDays,
        retained:JSON.stringify([FB.state.player.tenure,FB.state.player.freedomOffer]) === JSON.stringify([p.tenure,offer]) };
    },prefix);
    expect(result).toEqual({pure:true,ready:true,repeat:true,arch:prefix + '_tenancy',
      interval:prefix === 'harbor' ? 360 : 720,days:prefix === 'harbor' ? 60 : 120,retained:true});
  });
  test(prefix + ' imported foundation rewards once and retains its declaration through restore', async function ({ page }, info) {
    await importProof(page,info,prefix,false); await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, p = s.player, id = prefix + '_foundation', d = FBDATA.historicalAmbitions.find(function (r) { return r.id === id; });
      p.tier = 5; p.provs = FB.duchyCounties(d.region); p.provinceId = p.provs[0];
      p.liege = null; p.war = null; p.travel = null; p.flags.in_prison = false;
      Object.keys(s.realms).forEach(function (id) { s.realms[id].war = null; });
      FB.foundPlayerRealm(s); FB.invalidateRealmCache();
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const quote = FB.historicalAmbitionStatus(s,id);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const prestige = p.prestige, done = FB.completeHistoricalAmbition(s,id), repeat = FB.completeHistoricalAmbition(s,id);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return { ready:quote.ready,pure:pure,done:!!done,repeat:repeat,gain:p.prestige-prestige,
        duration:done && done.endTurn-done.turn,bonus:FB.historicalAmbitionBonus(FB.state,p.provs[0],d.bonus),
        retained:JSON.stringify(FB.state.historicalAmbitions[id]) === JSON.stringify(done),
        message:FB.englishMessage('news.ambition.' + id).text,rate:FB.rankPrestigeYearly(FB.state).ruling };
    },prefix);
    expect(result).toMatchObject({ready:true,pure:true,done:true,repeat:null,retained:true,rate:40,
      gain:prefix === 'harbor' ? 40 : 70,duration:prefix === 'harbor' ? 720 : 1080,bonus:prefix === 'harbor' ? .08 : .12});
    expect(result.message).toContain(prefix === 'harbor' ? 'Quay League' : 'Well Compact');
  });
  test(prefix + ' imported contract template uses shared consent and treasury conservation', async function ({ page }, info) {
    await importProof(page,info,prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, patron = prefix + '_senior', federate = prefix + '_partner', id = prefix + '_compact';
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const terms = FB.political.contractTerms(s,id,{patronRealmId:patron,federateRealmId:federate});
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const total = FB.treasuryAvailable(s,patron) + FB.treasuryAvailable(s,federate);
      const offered = FB.authorityOfferContractTemplate(s,id,{patronRealmId:patron,federateRealmId:federate});
      const first = FB.authorityConsentContract(s,offered.id,patron);
      const second = FB.authorityConsentContract(s,offered.id,federate);
      const after = FB.treasuryAvailable(s,patron);
      FB.authorityConsentContract(s,offered.id,federate);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return { pure:pure,expanded:!!terms,first:!!first,second:!!second,
        conserved:total === FB.treasuryAvailable(FB.state,patron) + FB.treasuryAvailable(FB.state,federate),
        replayNoPayment:after === FB.treasuryAvailable(FB.state,patron),
        duration:FB.political.contract(FB.state,offered.id).endTurn-FB.political.contract(FB.state,offered.id).startTurn,pay:offered.payPerSeason,
        retained:JSON.stringify(FB.state.authority.contracts) === JSON.stringify(saved.state.authority.contracts) };
    },prefix);
    expect(result).toEqual({pure:true,expanded:true,first:true,second:true,conserved:true,replayNoPayment:true,
      duration:prefix === 'harbor' ? 180 : 540,pay:prefix === 'harbor' ? 3 : 7,retained:true});
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported deed transaction previews and charges its declared effects once', async function ({ page },info) {
    await importProof(page,info,prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, id = prefix + '_gift'; s.player.gold = 50;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const status = FB.instantStatus(s,id);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const gold = s.player.gold, piety = s.player.piety;
      FB.runInstant(s,id);
      const paid = s.player.gold;
      FB.runInstant(s,id);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return {pure:pure,ready:status.can,cost:gold-paid,piety:s.player.piety-piety,
        replay:paid === s.player.gold,flag:FB.state.player.flags[prefix + '_gift_made'],
        retained:JSON.stringify(FB.state.player.cooldowns) === JSON.stringify(saved.state.player.cooldowns)};
    },prefix);
    expect(result).toEqual({pure:true,ready:true,cost:prefix === 'harbor' ? 3 : 6,piety:prefix === 'harbor' ? 4 : 9,replay:true,flag:1,retained:true});
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported opening creates only its declared service commitment', async function ({ page },info) {
    await importProof(page,info,prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, rows = s.authority.contracts.filter(function (r) { return r.templateId === prefix + '_host_service'; });
      const row = rows[0], saved = JSON.parse(FB.save.serialize()), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.save.restore(saved); FB.save.restore(saved);
      return {count:rows.length,host:row && row.hostId,pay:row && row.payPerSeason,
        duration:row && row.endTurn,faith:FBDATA.rulerFaithTargets.indexOf(prefix + '_rite') >= 0,
        retained:JSON.stringify(FB.state.authority.contracts) === JSON.stringify(saved.state.authority.contracts),
        pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    },prefix);
    expect(result).toEqual({count:1,host:prefix + '_independent_host',pay:prefix === 'harbor' ? 2 : 4,
      duration:prefix === 'harbor' ? 180 : 270,faith:true,retained:true,pure:true});
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' policies change work, mediation, rank income and AI votes through shared consumers', async function ({ page }, info) {
    await importProof(page,info,prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, p = s.player, me = s.chars[p.charId], rid = prefix + '_partner';
      p.gold = 50; p.tier = 4;
      const aim = FB.rulerAimSnapshot(s,rid);
      s.agency.rulerAims[rid] = Object.assign({},aim,{id:'keep_peace'});
      const motion = Object.keys(FBDATA.policies).find(function (id) { return FBDATA.policies[id].family === 'commerce'; });
      const focus = FB.focuses.find(function (d) { return d.id === 'trade_run'; });
      const mediation = FB.instants.find(function (d) { return d.id === 'mediate'; });
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const projected = focus.gain(s).gold, preview = focus.preview(s), social = mediation.preview(s);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const gold = p.gold, prestige = p.prestige;
      focus.tick(s); mediation.run(s);
      return {pure:pure,projected:projected,preview:preview.seasonal[0].amount,actual:(p.gold - gold) * 90,
        chance:social.chance,prestige:p.prestige - prestige,rank:FB.rankPrestigeYearly(s).ruling,
        vote:FB.rulerAimMotionValue(s,rid,motion)};
    },prefix);
    expect(result.pure).toBe(true); expect(result.chance).toBe(1);
    expect(result.actual).toBeCloseTo(result.projected,8);
    // The imported household is not a trading vocation; the ordinary focus preview includes its vocational factor.
    expect(result.preview).toBeGreaterThan(0);
    expect(result.prestige).toBe(prefix === 'harbor' ? 5 : 9);
    expect(result.rank).toBe(prefix === 'harbor' ? 16 : 32);
    expect(result.vote).toBe(prefix === 'harbor' ? 18 : -6);
  });
  test(prefix + ' independent council charter and tax demand preserve their own privilege identity', async function ({ page }, info) {
    await importProof(page,info,prefix,false);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, p = s.player, seat = prefix + '_warden', charter = prefix + '_confirmation';
      FB.setPlayerTier(s,6); p.provs = [p.provinceId]; s.owner[p.provinceId] = 'player'; s.holder[p.provinceId] = 'player';
      FB.foundPlayerRealm(s); FB.councilEnsure(s);
      const before = FB.councilSeatRequiresConfirmation(s,seat);
      const grant = FB.grantPrivilege(s,charter,{});
      const after = FB.councilSeatRequiresConfirmation(s,seat);
      const demand = FBDATA.collectiveDemands[prefix + '_tax_petition'];
      FB.notePoliticalMistreatment(s,'extraordinary_tax',{provinceId:p.provinceId});
      const demanded = !!FB.fns[demand.gate](s,demand);
      const relief = FB.grantPrivilege(s,demand.privilege,{scopeId:p.provinceId});
      const satisfied = !FB.fns[demand.gate](s,demand);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return {before:before,after:after,granted:!!grant,id:grant && grant.defId,demanded:demanded,relief:!!relief,
        satisfied:satisfied,restored:FB.councilSeatRequiresConfirmation(FB.state,seat),
        same:JSON.stringify(FB.state.privileges) === JSON.stringify(saved.state.privileges)};
    },prefix);
    expect(result).toEqual({before:false,after:true,granted:true,id:prefix + '_confirmation',demanded:true,relief:true,satisfied:true,restored:true,same:true});
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported remaining mechanics drive positions, laws, raids and AI temperament', async function ({page},info) {
    await importProof(page,info,prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, p = s.player, me = s.chars[p.charId];
      const hired = FB.hireRetainer(s,prefix + '_mentor');
      const teacher = FB.retainerRecords(s).find(function (row) { return row.office === prefix + '_mentor'; });
      const child = FB.makeCharacter(s,{culture:me.culture,religion:me.religion,born:s.date.year - 8,sex:'f',station:1});
      child.fatherId = me.id; child.homeProvinceId = p.provinceId;
      const options = FB.educationOptions(s,child,'lea');
      const availableTeacher = options.some(function (option) { return teacher && option.tutorId === teacher.charId; });
      const identity = {traits:[prefix + '_discipline']};
      const temperament = ['holyWarParticipation','holyWarStanding','courtLoyalty','courtSharedFaithLoyalty','rivalryWeight','conversionResistance'].map(function (key) { return FB.traitMechanic(identity,key,true); });
      const raid = ['gold','provisions','wares','transport'].map(function (key) { return FB.marketRaidYield([prefix + '_stores'],key); });
      FB.setPlayerTier(s,6); p.provs = [p.provinceId]; s.owner[p.provinceId] = 'player'; s.holder[p.provinceId] = 'player'; p.liege = null; FB.foundPlayerRealm(s);
      p.gold = 100;
      const proclaimed = FB.realmPolicyProclaim(s,prefix + '_peace','edict');
      const before = JSON.stringify(s), rng = FB.getRngState(), governance = FB.realmPolicyGovernance(s);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      const restored = JSON.stringify(FB.realmPolicyGovernance(FB.state)) === JSON.stringify(governance);
      // Focused stub of the minority-county reader only; the declared policy hooks run unchanged.
      const minorityCounties = FB.realmPolicyMinorityCounties, live = FB.state;
      FB.realmPolicyMinorityCounties = function () { return [live.player.provinceId]; };
      let policyEvents;
      try {
        policyEvents = {persecution:FB.fns.realm_policy_persecution_due(live),
          refugees:FB.fns.realm_policy_protected_worship_due(live)};
        FB.realmPolicyYearly(live);
        policyEvents.noted = ((live.collectiveDemands || {}).mistreatment || []).filter(function (row) {
          return row.kind === 'religious_persecution' && row.sustained;
        }).map(function (row) { return row.policyId; });
      } finally { FB.realmPolicyMinorityCounties = minorityCounties; }
      return {hired:!!hired,teacher:availableTeacher,temperament:temperament,raid:raid,proclaimed:!!proclaimed,
        governance:governance,pure:pure,restored:restored,policyEvents:policyEvents};
    },prefix);
    expect(result).toMatchObject({hired:true,teacher:prefix === 'harbor',proclaimed:true,pure:true,restored:true});
    expect(result.temperament).toEqual(prefix === 'harbor' ? [110,-.2,18,7,-.25,5] : [330,.3,-12,3,.35,35]);
    expect(result.raid).toEqual(prefix === 'harbor' ? [9,0,13,0] : [0,19,0,11]);
    expect(result.governance).toEqual(prefix === 'harbor' ? {tolerance:'tolerant',coercivePressure:-.25,coerciveResistance:.2,peacefulResistance:-.1} :
      {tolerance:'persecution',coercivePressure:.3,coerciveResistance:.4,peacefulResistance:0});
    // Persecution and worship-protection events follow the imported declarations, not baseline policy ids.
    expect(result.policyEvents).toEqual(prefix === 'harbor' ? {persecution:false,refugees:true,noted:[]} :
      {persecution:true,refugees:false,noted:['dune_peace']});
  });
  test(prefix + ' new local ordinance uses the normal annual motion transaction', async function ({page},info) {
    await importProof(page,info,prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, p = s.player;
      // Focused setup of the existing council qualification; the ordinance is committed normally.
      p.profession = 'merchant';
      FB.fns.local_council_elected(s);
      const baseline = JSON.stringify(s), initialRng = FB.getRngState();
      let trial, motion;
      for (let seed = 1; seed <= 32; seed++) {
        trial = JSON.parse(baseline); FB.setRngState(seed);
        motion = FB.proposeLocalCouncilMotion(trial,prefix + '_ordinance');
        if (motion && motion.passed) break;
      }
      FB.setRngState(initialRng);
      const effects = FB.positionContributions(trial,prefix === 'harbor' ? 'gold' : 'retinue');
      return {passed:motion && motion.passed,days:trial.player.localCouncil.ordinance && trial.player.localCouncil.ordinance.endTurn - trial.turn,
        amount:effects.filter(function (row) { return row.id === prefix + '_ordinance'; }).reduce(function (sum,row) { return sum + row.amount; },0),
        repeated:FB.proposeLocalCouncilMotion(trial,prefix + '_ordinance')};
    },prefix);
    expect(result).toEqual({passed:true,days:360,amount:prefix === 'harbor' ? 2 : 24,repeated:false});
  });
}
