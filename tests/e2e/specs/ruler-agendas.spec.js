'use strict';
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/story_ruler_agendas.js','js/story_ruler_agenda.js',
  'data/starts.js','data/bookmark_476.js','data/bookmark_476_wider.js','data/story_courts_476.js',
  'data/bookmark_476_gaul_iberia.js','data/bookmark_476_dalmatia_east.js','data/story_campaigns.js',
  'data/bookmark_1204_terrain.js','data/aristocratic_courts.js','data/technology.js','data/story_instances.js',
  'js/starts.js','js/stories.js','js/story_track.js','js/story_courts.js','js/story_campaign.js',
  'js/government_aristocracy.js','js/government_administration.js','js/government_recognition.js',
  'js/government_support.js','js/government_collective.js','js/government_assembly.js','js/government_selection.js',
  'js/mobile_confederations.js','js/institutions.js','js/authority.js','js/treasury.js',
  'js/world.js','js/wars.js','js/main.js','js/save.js','js/save_v4.js','js/ui_misc.js']);

const starts = [
  ['peroz_476','peroz_agenda_476'], ['peroz_sasanian_476','peroz_agenda_476'],
  ['odoacer_476','odoacer_agenda_476'], ['syagrius_476','syagrius_agenda_476'],
  ['muhammad_1204','muhammad_agenda_1204'], ['siwa_delegate_1204','siwa_agenda_1204']
];
async function start(page, info, scenario) {
  await startParityGame(page, info, { bookmark:scenario.endsWith('1204') ? '1204' : '476', scenario:scenario, declaredOpening:true });
}

for (const pair of starts) {
  test(pair[0] + ' attaches only its own bounded program, reviews four dates and can decline', async function ({ page }, info) {
    await start(page, info, pair[0]);
    const result = await page.evaluate(function (pair) {
      const s = FB.state, id = pair[1], story = FB.stories.get(id), t = s.stories[id], d = story.declaration;
      const attached = Object.keys(FBDATA.rulerAgendas).filter(function (key) { return !!s.stories[key]; });
      const pending = JSON.parse(FB.save.serialize()), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.stories.cards(s); FB.stories.choices(s,id);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const possessions = JSON.stringify([s.owner,s.holder,s.player.gold,s.authority.contracts,s.armies]);
      const dates = [], advanced = [];
      d.stages.forEach(function (st) {
        // Stage only the boundary under review. No daily or multi-year simulation.
        s.date = { year:st.year, season:st.season, day:1 }; s.turn++;
        const c = st.choices.find(function (c) { return c.operation === 'agenda_priority'; });
        dates.push([st.year,st.season]);
        advanced.push(FB.stories.apply(s,id,c.id,FB.stories.quote(s,id,c.id)));
      });
      const status = t.status, noRewards = possessions === JSON.stringify([s.owner,s.holder,s.player.gold,s.authority.contracts,s.armies]);
      FB.save.restore(pending);
      const stopped = FB.stories.apply(FB.state,id,'agenda_stop_program',FB.stories.quote(FB.state,id,'agenda_stop_program'));
      const ended = JSON.stringify(FB.state.stories[id]), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return { attached:attached, pure:pure, advanced:advanced, dates:dates, status:status, noRewards:noRewards,
        stopped:stopped, retained:ended === JSON.stringify(FB.state.stories[id]), original:FB.state.stories[id].subjectId === FB.state.player.charId };
    }, pair);
    expect(result).toMatchObject({ attached:[pair[1]], pure:true, advanced:[true,true,true,true],
      status:'agenda_complete', noRewards:true, stopped:true, retained:true, original:true });
    expect(result.dates).toHaveLength(4);
  });
}

test('Odoacer paid service uses one source payment and summarizes a decision already made', async function ({ page }, info) {
  await start(page, info, 'odoacer_476');
  const result = await page.evaluate(function () {
    let s = FB.state; const id = 'odoacer_agenda_476', w = s.stories.western_court_476;
    const gold = s.player.gold, owners = JSON.stringify(s.owner), contracts = s.authority.contracts.length;
    const q = FB.stories.quote(s,id,'odoacer_paid_service');
    const accepted = FB.stories.apply(s,id,'odoacer_paid_service',q);
    const repeated = FB.stories.apply(s,id,'odoacer_paid_service',q);
    const payment = s.player.gold - gold, newContracts = s.authority.contracts.length - contracts;
    const saved = JSON.parse(FB.save.serialize());
    // The source decision may have preceded opening the personal agenda.
    s.stories[id] = FB.stories.get(id).init(s);
    const already = FB.stories.apply(s,id,'odoacer_record_bargain',FB.stories.quote(s,id,'odoacer_record_bargain'));
    const noSecondPay = s.player.gold - gold === payment && s.authority.contracts.length - contracts === newContracts;
    FB.save.restore(saved); s = FB.state;
    return { accepted:accepted, repeated:repeated, payment:payment, newContracts:newContracts, already:already, noSecondPay:noSecondPay,
      resolution:w.aiResolution, sameOwners:owners === JSON.stringify(s.owner), restored:s.player.gold - gold === payment };
  });
  expect(result).toEqual({ accepted:true, repeated:false, payment:30, newContracts:1, already:true, noSecondPay:true,
    resolution:'negotiated', sameOwners:true, restored:true });
});

for (const choice of ['odoacer_civic_rule','odoacer_host_rule']) {
  test('Odoacer actual conquest and ' + choice + ' retain one ruler agenda across government changes', async function ({ page }, info) {
    await start(page, info, 'odoacer_476');
    const result = await page.evaluate(function (choice) {
      const s = FB.state, id = 'odoacer_agenda_476', w = s.stories.western_court_476, t = s.stories[id];
      const early = FB.stories.quote(s,id,choice).allowed;
      const launched = FB.stories.apply(s,id,'odoacer_contest_city',FB.stories.quote(s,id,'odoacer_contest_city'));
      const noAward = s.owner.ravenna !== 'player';
      FB.transferProvince(s,'ravenna','player'); FB.settleOrdinaryWar(s,w.aiWarId,'victory');
      FB.stories.get('western_court_476').day(s,w);
      if (choice === 'odoacer_civic_rule') {
        const actor = { kind:'realm', id:'player' };
        if (!FB.localInstitutionMediate(s,'rome_see',actor,'ravenna') ||
            !FB.localInstitutionSettle(s,'ravenna_council',actor,{ courts:true, protection:true, tolerance:true })) throw new Error('Missing civic agreement');
      }
      const q = FB.stories.quote(s,id,choice), accepted = FB.stories.apply(s,id,choice,q);
      const repeated = FB.stories.apply(s,id,choice,q);
      FB.stories.get(id).day(s,t);
      return { early:early, launched:launched, noAward:noAward, accepted:accepted, repeated:repeated,
        form:FB.political.government(s,{kind:'realm',id:'player'}).formId, status:t.status, step:t.step };
    }, choice);
    expect(result).toEqual({ early:false, launched:true, noAward:true, accepted:true, repeated:false,
      form:choice === 'odoacer_civic_rule' ? 'roman_civic' : 'federate_polity', status:'agenda_open', step:2 });
  });
}

test('Odoacer can decline the bargain and conclude without conquest or a forced later opportunity', async function ({ page }, info) {
  await start(page, info, 'odoacer_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'odoacer_agenda_476', owners = JSON.stringify(s.owner), count = s.authority.contracts.length;
    function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const declined = apply('odoacer_keep_host'), ended = apply('odoacer_finish_host');
    return { declined:declined, ended:ended, status:s.stories[id].status, decision:s.stories.western_court_476.aiResolution,
      unchanged:owners === JSON.stringify(s.owner) && count === s.authority.contracts.length, noCampaign:!s.stories.western_court_476.aiWarId };
  });
  expect(result).toEqual({ declined:true, ended:true, status:'agenda_complete', decision:'declined', unchanged:true, noCampaign:true });
});

test('Syagrius retains conditional Clovis gates and observes a divergent source without another war', async function ({ page }, info) {
  await start(page, info, 'syagrius_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'syagrius_agenda_476', campaign = s.stories.clovis_syagrius_476;
    function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    apply('syagrius_keep_receipts'); s.date.year = 477; apply('syagrius_keep_independence');
    const premature = FB.stories.quote(s,id,'syagrius_face_challenge').allowed;
    s.date.year = 486;
    const inherited = FB.stories.quote(s,id,'syagrius_face_challenge').allowed;
    // Clovis has not inherited. Stage the source's own divergent target boundary.
    FB.transferProvince(s,'laon','aquitaine');
    FB.stories.get('clovis_syagrius_476').day(s,campaign);
    const wars = JSON.stringify(s.wars), owner = JSON.stringify(s.owner);
    const observed = apply('syagrius_record_challenge'), concluded = apply('syagrius_record_result');
    return { premature:premature, inherited:inherited, observed:observed, concluded:concluded,
      result:campaign.result, status:s.stories[id].status, unchanged:wars === JSON.stringify(s.wars) && owner === JSON.stringify(s.owner) };
  });
  expect(result).toEqual({ premature:false, inherited:false, observed:true, concluded:true, result:'diverted', status:'agenda_complete', unchanged:true });
});

for (const choice of ['syagrius_face_challenge','syagrius_leave_challenge']) {
  test('Syagrius delegates the live campaign choice once: ' + choice, async function ({ page }, info) {
    await start(page,info,'syagrius_476');
    const result = await page.evaluate(function (choice) {
      const s = FB.state, id = 'syagrius_agenda_476', source = 'clovis_syagrius_476';
      function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
      apply('syagrius_keep_receipts'); s.date.year = 477; apply('syagrius_keep_independence');
      FB.assignRealmRulerCharacter(s,'franks_476',s.stories.western_court_476.clovisId,{replaceAuthored:true});
      s.date.year = 486; FB.stories.get(source).day(s,s.stories[source]);
      const owner = s.owner.laon, q = FB.stories.quote(s,id,choice), accepted = FB.stories.apply(s,id,choice,q);
      const repeated = FB.stories.apply(s,id,choice,q), rec = s.stories[source], bytes = JSON.stringify([rec,s.stories[id]]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { accepted:accepted, repeated:repeated, phase:rec.phase, noAward:owner === FB.state.owner.laon,
        retained:bytes === JSON.stringify([FB.state.stories[source],FB.state.stories[id]]) };
    },choice);
    expect(result).toEqual({ accepted:true, repeated:false, phase:choice === 'syagrius_face_challenge' ? 'started' : 'resolved', noAward:true, retained:true });
  });
}

test('Peroz observes actual provincial offices and current-generation royal support without accession', async function ({ page }, info) {
  await start(page, info, 'peroz_sasanian_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'peroz_agenda_476', R = FB.governmentRecognition;
    function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    apply('peroz_keep_terms'); s.date.season = 1;
    const service = apply('peroz_record_service'); s.date.year = 477; s.date.season = 0;
    const candidate = R.candidates(s,'player')[0];
    const voice = R.members(s,'player').find(function (m) { return m.id !== 'court'; });
    if (!R.applySupport(s,R.supportQuote(s,voice.principal,'player',voice.id,candidate.id,FB.aristocracy.profile(s,'player').defaultTerms))) throw new Error('Recognition failed');
    const generation = FB.realmRulerGeneration(s,'player'), person = s.player.charId, owners = JSON.stringify(s.owner), money = s.player.gold;
    const recognition = apply('peroz_record_recognition');
    return { service:service, recognition:recognition, unchanged:person === s.player.charId && generation === FB.realmRulerGeneration(s,'player') &&
      owners === JSON.stringify(s.owner) && money === s.player.gold, step:s.stories[id].step };
  });
  expect(result).toEqual({ service:true, recognition:true, unchanged:true, step:3 });
});

test('Muhammad accepts only a real outside-party offer and observes its canonical agreement without duplicating payment', async function ({ page }, info) {
  await start(page, info, 'muhammad_1204');
  const result = await page.evaluate(function () {
    let s = FB.state; const id = 'muhammad_agenda_1204', rid = 'qipchaq_following_1204', M = FB.mobile;
    function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    apply('muhammad_keep_relations'); s.date.season = 1; apply('muhammad_keep_dispositions'); s.date.season = 2;
    const absent = FB.stories.quote(s,id,'muhammad_accept_offer').allowed;
    function act(action,terms,actor) { return M.commit(s,M.review(s,{ realmId:rid, action:action, terms:terms, actor:actor || {kind:'realm',id:rid} })); }
    const terms = { kind:'access', partnerId:'player', countyIds:['lower_syr_darya'], capacity:100, allowRecruit:true, price:4, duration:270 };
    if (!act('propose',{operation:'agreement',proposal:terms})) throw new Error('Proposal failed');
    M.members(s,rid).forEach(function (m) { if (!act('assent',{assent:true},m.principal)) throw new Error('Assent failed'); });
    if (!act('offer',terms)) throw new Error('Offer failed');
    const q = FB.stories.quote(s,id,'muhammad_accept_offer'), publicGold = FB.treasuryAvailable(s,'player'), followingGold = FB.treasuryAvailable(s,rid);
    const owners = JSON.stringify([s.owner,s.holder]), total = M.total(s,rid), host = M.host(s,rid).men;
    s.owner.lower_syr_darya = 'ayyubid_1204';
    const before = JSON.stringify(s), stale = FB.stories.apply(s,id,'muhammad_accept_offer',q), pure = before === JSON.stringify(s);
    s.owner.lower_syr_darya = 'player';
    const accepted = apply('muhammad_accept_offer'), repeated = FB.stories.apply(s,id,'muhammad_accept_offer',q);
    const saved = JSON.parse(FB.save.serialize()), record = JSON.stringify(s.stories[id]);
    FB.save.restore(saved); s = FB.state;
    return { absent:absent, stale:stale, pure:pure, accepted:accepted, repeated:repeated, payment:FB.treasuryAvailable(s,'player') - publicGold,
      debit:followingGold - FB.treasuryAvailable(s,rid), retained:record === JSON.stringify(s.stories[id]),
      sovereignty:owners === JSON.stringify([s.owner,s.holder]), population:total === M.total(s,rid), host:host === M.host(s,rid).men };
  });
  expect(result).toEqual({ absent:false, stale:false, pure:true, accepted:true, repeated:false, payment:4, debit:4,
    retained:true, sovereignty:true, population:true, host:true });
});

test('Siwa observes executed consent once and interruption follows occupation without a private award', async function ({ page }, info) {
  await start(page, info, 'siwa_delegate_1204');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'siwa_agenda_1204', rid = 'siwa_households_1204', C = FB.governments.support;
    function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    apply('siwa_keep_mandate'); s.date.season = 1;
    const row = C.row(s,rid), privateGold = s.player.gold, publicGold = FB.treasuryAvailable(s,rid);
    if (!C.imposeDues(s,C.duesQuote(s,rid,{amount:1,duration:90}))) throw new Error('Dues failed');
    const before = JSON.stringify([row.dues,row.decisions]), observed = apply('siwa_record_dues');
    const once = before === JSON.stringify([row.dues,row.decisions]);
    s.owner.siwa_oasis = 'ayyubid_1204'; FB.stories.get(id).day(s,s.stories[id]);
    return { observed:observed, once:once, privateSame:privateGold === s.player.gold, publicSame:publicGold === FB.treasuryAvailable(s,rid),
      interrupted:s.stories[id].status, scope:s.player.provs.length === 0 };
  });
  expect(result).toEqual({ observed:true, once:true, privateSame:true, publicSame:true, interrupted:'agenda_interrupted', scope:true });
});

for (const scenario of ['nepos_476','farmer_476']) {
  test(scenario + ' gains no unrelated ruler agenda', async function ({ page }, info) {
    await start(page, info, scenario);
    const result = await page.evaluate(function () { return {
      agendas:Object.keys(FBDATA.rulerAgendas).filter(function (id) { return !!FB.state.stories[id]; }),
      nepos:!!FB.state.stories.nepos_track_476
    }; });
    expect(result).toEqual({ agendas:[], nepos:scenario === 'nepos_476' });
  });
}
for (const bookmark of ['867','1066']) {
  test(bookmark + ' ordinary baseline gains no agenda or story state', async function ({ page }, info) {
    await beginBookmark(page,info,bookmark);
    expect(await page.evaluate(function () { return FB.state.stories; })).toBeUndefined();
  });
}

test('a 476 observer attaches world stories without personal ruler programs', async function ({ page }, info) {
  await openGame(page,info);
  await page.evaluate(function () {
    FBDATA.bookmarks['476'].hidden = false;
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('476',function () {},function (error) { if (error) reject(error); else resolve(); });
    });
  });
  const result = await page.evaluate(function () {
    FB.game.pending = { seed:'AGENDA-OBSERVER' }; FB.game.startObserve(); FB.game.setPaused(true);
    return { observing:FB.game.observe, agendas:Object.keys(FBDATA.rulerAgendas).filter(function (id) { return !!FB.state.stories[id]; }) };
  });
  expect(result).toEqual({ observing:true, agendas:[] });
});
