'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/start_ambitions.js','data/starts.js','data/story_courts_476.js',
  'data/story_ruler_agendas.js','data/story_campaigns.js','data/story_households_711.js','data/story_households_800.js',
  'data/story_households_1204.js','data/story_households_pontic_476.js','data/starts_perspectives.js',
  'data/story_households_perspectives.js','data/bookmark_476_wider.js','data/economy.js','js/actions.js',
  'data/bookmark_1204_terrain.js','data/technology.js','data/actions.js','js/story_opening_goals.js','js/stories.js',
  'js/story_household.js','js/story_track.js','js/story_ruler_agenda.js','js/mobile_confederations.js','js/starts.js','js/main.js','js/world.js','js/events.js','js/treasury.js',
  'js/government_aristocracy.js','js/government_support.js','js/government_collective.js','js/government_recognition.js',
  'js/save.js','js/save_v4.js','js/ui_modals.js','js/mods.js']);

const starts = [
  ['peroz_476','opening_peroz_476'], ['peroz_sasanian_476','opening_peroz_476'],
  ['nepos_476','opening_nepos_476'], ['odoacer_476','opening_odoacer_476'], ['syagrius_476','opening_syagrius_476'],
  ['federate_476','opening_federate_476'], ['curialis_476','opening_curialis_476'], ['mobile_household_476','opening_pontic_476'],
  ['toledo_household_711','opening_toledo_711'], ['aachen_household_800','opening_aachen_800'],
  ['constantinople_household_1204','opening_constantinople_1204'],
  ['constantinople_merchant_household_1204','opening_constantinople_merchant_1204'],
  ['muhammad_1204','opening_muhammad_1204'], ['siwa_delegate_1204','opening_siwa_1204']
];

for (const pair of starts) {
  test(pair[0] + ' receives three personal goals and a fixed existing person', async function ({ page }, info) {
    await startParityGame(page, info, { bookmark:pair[0].split('_').pop(), scenario:pair[0], declaredOpening:true });
    const result = await page.evaluate(function (pair) {
      const s = FB.state, id = pair[1], t = s.stories[id], story = FB.stories.get(id);
      const profiles = Object.keys(FBDATA.openingProfiles).filter(function (key) { return !!s.stories[key]; });
      const people = story.people(s,t), person = s.chars[people[0].characterId];
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.stories.cards(s); FB.stories.status(s,id); story.people(s,t);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const record = JSON.stringify(t), cash = s.player.gold, saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restored = FB.state, retained = record === JSON.stringify(restored.stories[id]) && cash === restored.player.gold;
      const friends = restored.player.friendContacts || {};
      return { profiles:profiles, ready:t.ready, actor:t.actorId === s.player.charId, goals:Object.keys(t.goals).length,
        people:people.length, person:!!person, noFriend:!friends[person.id], pure:pure, retained:retained,
        named:person.name,
        faithSame:restored.chars[restored.player.charId].religion === s.chars[s.player.charId].religion };
    }, pair);
    expect(result).toMatchObject({ profiles:[pair[1]], ready:true, actor:true, goals:3, people:1, person:true,
      noFriend:true, pure:true, retained:true, faithSame:true });
    if (pair[0].startsWith('peroz')) expect(result.named).toBe('Balash');
    if (pair[0] === 'constantinople_merchant_household_1204') expect(result.named).toBe('Baldwin of Flanders');
  });
}

test('all offering revisions validate their profiles and retain the two separate Peroz starts', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const errors = [], peroz = [];
    ['476','711','800','1204'].forEach(function (id) {
      FB.bookmarkRevisions(id, FBDATA.bookmarks[id]).forEach(function (bm) {
        errors.push.apply(errors, FB.validateBookmark(bm));
        if (id === '476') peroz.push((bm.starts || []).filter(function (key) { return ['peroz_476','peroz_sasanian_476'].indexOf(key) >= 0; }).length);
      });
    });
    return { errors:errors, peroz:peroz, profiles:Object.keys(FBDATA.openingProfiles).length,
      goals:Object.keys(FBDATA.openingProfiles).reduce(function (n,id) { return n + FBDATA.openingProfiles[id].goals.length; },0),
      technology:['opening_goals','opening_contacts'].map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }) };
  });
  expect(result.errors).toEqual([]);
  expect(result.peroz.every(function (n) { return n <= 1; })).toBe(true);
  expect(result).toMatchObject({ profiles:13, goals:39, technology:['none','none'] });
});

test('merchant market earnings stay separate from the opening purse and private reserve', async function ({ page }, info) {
  await startParityGame(page, info, { bookmark:'1204', scenario:'constantinople_merchant_household_1204', declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_merchant_track_1204', t = s.stories.opening_constantinople_merchant_1204;
    const profile = FB.stories.get('opening_constantinople_merchant_1204');
    const opening = s.player.gold === 15 && t.earnings.market === 0 &&
      Object.keys(t.goals).every(function (key) { return t.goals[key].status === 'pending'; });
    s.player.gold = 30; profile.day(s,t);
    const reserveOnly = t.goals.merchant_reserve_1204.status === 'completed' && t.goals.merchant_livelihood_1204.status === 'pending';
    FB.householdStories.focusPaid(s,'craft_work',15);
    const otherWork = t.earnings.market === 0;
    const cash = s.player.gold, applied = FB.stories.apply(s,id,'local_trade',FB.stories.quote(s,id,'local_trade'));
    const noWage = cash === s.player.gold && t.earnings.market === 0 && s.player.focus === 'market';
    s.turn++; FB.tickFocus(s);
    const paid = s.player.gold - cash, actual = paid > 0 && t.earnings.market === Math.min(15,paid);
    t.earnings.market = 15 - 0.000001;
    s.turn++; FB.tickFocus(s);
    const afterWork = s.player.gold, record = JSON.stringify(t); profile.day(s,t); profile.day(s,t);
    return { opening:opening, reserveOnly:reserveOnly, otherWork:otherWork, applied:applied, noWage:noWage, actual:actual,
      completed:t.goals.merchant_livelihood_1204.status, once:record === JSON.stringify(t), noReward:afterWork === s.player.gold };
  });
  expect(result).toEqual({ opening:true, reserveOnly:true, otherWork:true, applied:true, noWage:true, actual:true,
    completed:'completed', once:true, noReward:true });
});

test('merchant household goals accept staying and resettlement while leaving other endings pending', async function ({ page }, info) {
  await startParityGame(page, info, { bookmark:'1204', scenario:'constantinople_merchant_household_1204', declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_merchant_track_1204', profileId = 'opening_constantinople_merchant_1204';
    function choose(choice) { return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)); }
    const planned = choose('decline_deal') && choose('keep_reserves');
    const baseline = JSON.stringify(s.stories[profileId]), cash = s.player.gold;
    const stayed = choose('stay') && s.stories[profileId].goals.merchant_home_1204.status === 'completed';
    const statuses = {};
    ['resettled','deferred','temporary','remote','destination_changed','interrupted_journey','interrupted'].forEach(function (phase) {
      // Stage terminal source records to exercise the profile's exact conclusion boundary.
      s.stories[id].phase = phase;
      const profile = s.stories[profileId] = JSON.parse(baseline);
      FB.stories.get(profileId).day(s,profile);
      statuses[phase] = profile.goals.merchant_home_1204.status;
    });
    return { planned:planned, stayed:stayed, statuses:statuses, noReward:cash === s.player.gold };
  });
  expect(result).toEqual({ planned:true, stayed:true, statuses:{ resettled:'completed', deferred:'pending', temporary:'pending',
    remote:'pending', destination_changed:'pending', interrupted_journey:'pending', interrupted:'pending' }, noReward:true });
});

for (const scenario of ['federate_476','curialis_476']) {
  test(scenario + ' outside Ravenna receives no location-bound opening profile', async function ({ page }, info) {
    await openGame(page, info);
    expect(await page.evaluate(function (scenario) {
      const sc = FBDATA.startScenarios.find(function (row) { return row.id === scenario; });
      const bm = FB.bookmark('476'), pid = bm.provinces.find(function (p) { return p.id !== 'ravenna' && FB.startProvinceAllowed(sc,bm,p.id); }).id;
      return FB.startTracks(sc,pid).every(function (id) { return FB.stories.get(id).declaration.type !== 'opening_profile'; });
    }, scenario)).toBe(true);
  });
}

test('a refused council offer resolves the decision but does not confer a civic mandate or goal reward', async function ({ page }, info) {
  await startParityGame(page, info, { bookmark:'476',scenario:'curialis_476',declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'curialis_track_476', t = s.stories.opening_curialis_476, cash = s.player.gold;
    const quote = FB.stories.quote(s,id,'keep_household');
    const previewPending = t.goals.civic_course_476.status === 'pending';
    const applied = FB.stories.apply(s,id,'keep_household',quote);
    return { previewPending:previewPending, applied:applied, course:t.goals.civic_course_476.status,
      mandate:t.goals.civic_mandate_476.status, cashSame:cash === s.player.gold };
  });
  expect(result).toEqual({ previewPending:true, applied:true, course:'completed', mandate:'pending', cashSame:true });
});

test('a local conclusion resolves the Toledo goal without conversion or an observer payout', async function ({ page }, info) {
  await beginBookmark(page,info,'711','toledo_household_711');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711', t = s.stories[id], g = s.stories.opening_toledo_711;
    t.phase = 'stay';
    const cash = s.player.gold, faith = s.chars[s.player.charId].religion;
    const applied = FB.stories.apply(s,id,'resume',FB.stories.quote(s,id,'resume'));
    const record = JSON.stringify(g); FB.stories.day(s); FB.stories.day(s);
    return { applied:applied, completed:g.goals.toledo_home_711.status, once:record === JSON.stringify(g),
      cashSame:cash === s.player.gold, faithSame:faith === s.chars[s.player.charId].religion };
  });
  expect(result).toEqual({ applied:true, completed:'completed', once:true, cashSame:true, faithSame:true });
});

test('a source decision committed through the ruler agenda resolves its opening goal once', async function ({ page }, info) {
  await startParityGame(page,info,{ bookmark:'476',scenario:'odoacer_476',declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'odoacer_agenda_476', choice = 'odoacer_keep_host', t = s.stories.opening_odoacer_476;
    const cash = s.player.gold, applied = FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
    const record = JSON.stringify(t); FB.stories.day(s);
    return { applied:applied, completed:t.goals.host_course_476.status, once:record === JSON.stringify(t), cashSame:cash === s.player.gold,
      source:s.stories.western_court_476.aiResolution };
  });
  expect(result).toEqual({ applied:true, completed:'completed', once:true, cashSame:true, source:'declined' });
});

test('Peroz can complete royal recognition without a forbidden public-candidate nomination', async function ({ page }, info) {
  await startParityGame(page,info,{ bookmark:'476',scenario:'peroz_sasanian_476',declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, R = FB.governmentRecognition, t = s.stories.opening_peroz_476;
    const candidate = R.candidates(s,'player').find(function (c) { return !c.minor; });
    const q = R.supportQuote(s,{ kind:'realm', id:'player' },'player','court',candidate.id);
    const cash = s.player.gold, previewPending = t.goals.royal_choice_476.status === 'pending';
    const applied = R.applySupport(s,q);
    return { previewPending:previewPending, applied:applied, completed:t.goals.royal_choice_476.status,
      cashSame:cash === s.player.gold, nominationForbidden:!FB.administrationProfile(s,'player').accession.officeCandidates };
  });
  expect(result).toEqual({ previewPending:true, applied:true, completed:'completed', cashSame:true, nominationForbidden:true });
});

test('held operations remain explicit, pending and dismissible', async function ({ page }, info) {
  await startParityGame(page,info,{ bookmark:'1204',scenario:'siwa_delegate_1204',declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'opening_siwa_1204', t = s.stories[id], cash = s.player.gold;
    const visible = FB.stories.status(s,id).lines.some(function (line) { return line.indexOf('No ordinary private-to-institution') >= 0; });
    const pending = t.goals.oasis_reserve_1204.status;
    const choice = 'dismiss_oasis_reserve_1204', applied = FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
    return { visible:visible, pending:pending, applied:applied, status:t.goals.oasis_reserve_1204.status, cashSame:cash === s.player.gold };
  });
  expect(result).toEqual({ visible:true, pending:'pending', applied:true, status:'dismissed', cashSame:true });
});

test('a settled public fiscal receipt completes only the public goal and creates no second receipt', async function ({ page }, info) {
  await startParityGame(page,info,{ bookmark:'1204',scenario:'siwa_delegate_1204',declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'siwa_households_1204', t = s.stories.opening_siwa_1204;
    const cash = s.player.gold; s.turn = 90; s.date.season = 1;
    const settled = FB.treasurySeason(s), row = s.realms[rid].treasury;
    const publicGold = row.gold, record = JSON.stringify(t), repeated = FB.treasurySeason(s);
    return { settled:settled, positive:row.lastSummary.income + row.lastSummary.duesIn > 0,
      completed:t.goals.oasis_accounts_1204.status, repeated:repeated, once:record === JSON.stringify(t),
      publicSame:publicGold === row.gold, privateSame:cash === s.player.gold };
  });
  expect(result).toEqual({ settled:true, positive:true, completed:'completed', repeated:false, once:true, publicSame:true, privateSame:true });
});

for (const funds of [1, 5]) {
  test('a host-payment goal requires actual available funding of ' + funds, async function ({ page }, info) {
    await startParityGame(page,info,{ bookmark:'476',scenario:'nepos_476',declaredOpening:true });
    const result = await page.evaluate(function (funds) {
      const s = FB.state, t = s.stories.opening_nepos_476;
      s.turn++; s.player.gold = funds;
      const batch = { costs:{ player:2 }, playerMercs:0 };
      FB.treasuryCommitMilitary(s,batch);
      const cash = s.player.gold, record = JSON.stringify(t); FB.treasuryCommitMilitary(s,batch);
      return { completed:t.goals.dalmatian_defence_476.status === 'completed', once:record === JSON.stringify(t), noExtraCharge:cash === s.player.gold };
    }, funds);
    expect(result).toEqual({ completed:funds >= 2, once:true, noExtraCharge:true });
  });
}
