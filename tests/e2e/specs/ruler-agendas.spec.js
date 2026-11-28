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
  'js/world.js','js/wars.js','js/main.js','js/save.js','js/save_v4.js','js/ui_misc.js',
  'data/bookmark_1241.js','data/bookmark_1241_frederick.js','data/starts_frederick_1241.js']);

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
    // The defending court forwards no campaign choice; its removed rows are never quoted.
    const retired = ['syagrius_face_challenge','syagrius_leave_challenge'];
    const premature = retired.some(function (c) { return FB.stories.quote(s,id,c).allowed; });
    s.date.year = 486;
    const inherited = retired.some(function (c) { return FB.stories.quote(s,id,c).allowed; });
    const offered = FB.stories.choices(s,id).map(function (c) { return c.id; });
    // Clovis has not inherited. Stage the source's own divergent target boundary.
    FB.transferProvince(s,'laon','aquitaine');
    FB.stories.get('clovis_syagrius_476').day(s,campaign);
    const wars = JSON.stringify(s.wars), owner = JSON.stringify(s.owner);
    const observed = apply('syagrius_record_challenge'), concluded = apply('syagrius_record_result');
    return { premature:premature, inherited:inherited, offered:offered, observed:observed, concluded:concluded,
      result:campaign.result, status:s.stories[id].status, unchanged:wars === JSON.stringify(s.wars) && owner === JSON.stringify(s.owner) };
  });
  expect(result).toEqual({ premature:false, inherited:false, offered:['syagrius_record_challenge','syagrius_keep_policy','agenda_stop_program'],
    observed:true, concluded:true, result:'diverted', status:'agenda_complete', unchanged:true });
});

test('Odoacer offers no campaign choice for the Amal opportunity and keeps its outcome record', async function ({ page }, info) {
  await start(page, info, 'odoacer_476');
  const result = await page.evaluate(function () {
    const d = FB.stories.get('odoacer_agenda_476').declaration;
    const stage = d.stages.find(function (st) { return st.id === 'odoacer_amal_opportunity'; });
    return { rows:stage.choices.map(function (c) { return c.id; }), retired:stage.retiredChoiceIds,
      refused:stage.retiredChoiceIds.every(function (c) { return !FB.stories.quote(FB.state,'odoacer_agenda_476',c).allowed; }) };
  });
  expect(result).toEqual({ rows:['odoacer_record_campaign','odoacer_keep_defense'],
    retired:['odoacer_face_campaign','odoacer_leave_campaign'], refused:true });
});

for (const choice of ['syagrius_face_challenge','syagrius_leave_challenge']) {
  test('a Syagrius save holding the retired ' + choice + ' restores with that stage decided', async function ({ page }, info) {
    await start(page,info,'syagrius_476');
    const result = await page.evaluate(function (choice) {
      const s = FB.state, id = 'syagrius_agenda_476', source = 'clovis_syagrius_476';
      function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
      apply('syagrius_keep_receipts'); s.date.year = 477; apply('syagrius_keep_independence');
      FB.assignRealmRulerCharacter(s,'franks_476',s.stories.western_court_476.clovisId,{replaceAuthored:true});
      s.date.year = 486;
      const owner = s.owner.laon, face = choice === 'syagrius_face_challenge';
      // The defending court no longer decides; the attack starts on the source's own day.
      if (face) FB.stories.get(source).day(s,s.stories[source]);
      const started = !face || s.stories[source].phase === 'started' && s.stories[source].playerDecision === null;
      // Rebuild the shape the earlier forwarded choice wrote: the agenda decision and its source decision.
      const saved = JSON.parse(FB.save.serialize()), t = saved.state.stories[id], rec = saved.state.stories[source];
      t.decisions.push({ stageId:'syagrius_frankish_challenge', choiceId:choice, turn:s.turn }); t.step++;
      rec.playerDecision = face ? 'campaign' : 'declined'; rec.playerDecisionGeneration = FB.realmRulerGeneration(s,'player');
      if (!face) Object.assign(rec, { phase:'resolved', result:'diverted', reason:'player_declined', outcomeTurn:s.turn });
      const wire = JSON.stringify([t,rec]);
      FB.save.restore(saved);
      const live = FB.state, r = live.stories[id], story = FB.stories.get(id);
      const restored = wire === JSON.stringify([r,live.stories[source]]), step = r.step;
      const name = story.status(live,r).name, next = FB.stories.choices(live,id).map(function (c) { return c.id; });
      const resumed = FB.stories.apply(live,id,'syagrius_keep_domain',FB.stories.quote(live,id,'syagrius_keep_domain'));
      return { started:started, restored:restored, step:step, name:name, next:next, resumed:resumed,
        status:live.stories[id].status, noAward:owner === live.owner.laon };
    },choice);
    expect(result).toEqual({ started:true, restored:true, step:3, name:'The surviving domain',
      next:['syagrius_record_result','syagrius_keep_domain','agenda_stop_program'], resumed:true, status:'agenda_complete', noAward:true });
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

test('Syagrius in 486 lists the Soissons campaign by its own stage line and keeps its record and policy rows', async function ({ page }, info) {
  await start(page, info, 'syagrius_476');
  const result = await page.evaluate(function () {
    function nowFact(status) { return status.facts.find(function (f) { return f[0] === FB.T('Now'); })[1]; }
    const s = FB.state, id = 'syagrius_agenda_476', source = 'clovis_syagrius_476', d = FB.stories.get(id).declaration;
    function apply(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    apply('syagrius_keep_receipts'); s.date.year = 477; apply('syagrius_keep_independence');
    // Stage the boundary the way the retired-choice cases do: Clovis rules the Franks in 486.
    FB.assignRealmRulerCharacter(s,'franks_476',s.stories.western_court_476.clovisId,{replaceAuthored:true});
    s.date.year = 486;
    const status = FB.stories.status(s,id), campaign = FB.stories.status(s,source);
    const linked = [FB.T('Linked story'),FB.T('{story}: {stage}',{story:FB.stories.get(source).title(s,s.stories[source]),stage:campaign.stage})];
    const card = FB.stories.cards(s).find(function (c) { return c.id === id; });
    return { linked:JSON.stringify(status.facts).indexOf(JSON.stringify(linked)) >= 0, campaignStage:/^War for /.test(campaign.stage),
      step:status.facts[0], now:nowFact(status) === FB.T('Ready.'), text:status.lines[0] === FB.T(d.stages[2].text),
      stage:status.stage === FB.T(d.stages[2].name), card:card.stage === status.stage,
      offered:FB.stories.choices(s,id).map(function (c) { return c.id; }) };
  });
  expect(result).toEqual({ linked:true, campaignStage:true, step:['Step','3 of 4'], now:true, text:true, stage:true, card:true,
    offered:['syagrius_record_challenge','syagrius_keep_policy','agenda_stop_program'] });
});

test('Peroz names the next review date and the missing appointment instead of a catch-all', async function ({ page }, info) {
  await start(page, info, 'peroz_476');
  const result = await page.evaluate(function () {
    function nowFact(status) { return status.facts.find(function (f) { return f[0] === FB.T('Now'); })[1]; }
    const s = FB.state, id = 'peroz_agenda_476', story = FB.stories.get(id), t = s.stories[id];
    function blocker(c) { const q = FB.stories.quote(s,id,c); return q.allowed ? null : story.blocker(s,t,q.reason); }
    const kept = FB.stories.apply(s,id,'peroz_keep_terms',FB.stories.quote(s,id,'peroz_keep_terms'));
    const spring = FB.stories.status(s,id), opens = FB.T('Opens in {season} {year}.',{season:FB.seasonName(1),year:476});
    const early = blocker('peroz_record_service');
    s.date.season = 1;
    // Stage a court without any public appointment since the program opened.
    s.authority.appointments = s.authority.appointments.filter(function (r) { return !(r.publicTerms && r.institutionId === 'player'); });
    const summer = FB.stories.status(s,id);
    return { kept:kept, date:[s.date.year,s.date.season], springNow:nowFact(spring) === opens,
      springStage:spring.stage === FB.T('{stage}: opens {season} {year}',{stage:FB.T(story.declaration.stages[1].name),season:FB.seasonName(1),year:476}),
      early:early === opens, summerNow:nowFact(summer) === FB.T('Ready.'), summerStage:summer.stage === FB.T(story.declaration.stages[1].name),
      service:blocker('peroz_record_service') === FB.T('No new appointment since the program began. Make one in Public administration first.'),
      keep:FB.stories.quote(s,id,'peroz_keep_officers').allowed };
  });
  expect(result).toEqual({ kept:true, date:[476,1], springNow:true, springStage:true, early:true, summerNow:true, summerStage:true,
    service:true, keep:true });
});

test('Odoacer reads as the ruler without process boilerplate and names a source that no longer offers its choice', async function ({ page }, info) {
  await start(page, info, 'odoacer_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'odoacer_agenda_476', story = FB.stories.get(id), t = s.stories[id], w = 'western_court_476';
    const title = FB.stories.get(w).title(s,s.stories[w]), name = FB.realmNameParam(s,'player');
    const realm = name && name.$realmName ? FB.renderRealmNameSnapshot(name.$realmName) : name;
    function blocker(c) { const q = FB.stories.quote(s,id,c); return q.allowed ? null : story.blocker(s,t,q.reason); }
    const status = FB.stories.status(s,id), people = story.people(s,t), choices = FB.stories.choices(s,id);
    const paid = FB.stories.quote(s,id,'odoacer_paid_service');
    const text = [status.stage].concat(status.facts.map(function (f) { return f[0] + ' ' + f[1]; }), status.lines,
      people.map(function (p) { return p.label + ' ' + p.detail; }), choices.map(function (c) { return c.label + ' ' + c.detail; }),
      paid.allowed ? story.review(s,t,'odoacer_paid_service',paid) : []).join('\n');
    const banned = ['Recording this agenda adds no reward','This program waits','Original incumbent','Original person'].filter(function (p) {
      return text.indexOf(p) >= 0;
    });
    const stop = choices.find(function (c) { return c.id === 'agenda_stop_program'; });
    const unreached = blocker('odoacer_record_bargain');
    // The western court's own refusal closes its paid service; the agenda stays on this stage.
    const declined = FB.stories.apply(s,w,'keep_host',FB.stories.quote(s,w,'keep_host'));
    return { banned:banned, person:people[0].label, personDetail:people[0].detail === FB.T('The program ends if you lose {realm}.',{realm:realm}),
      stop:[stop.label,stop.detail], paidAllowed:paid.allowed,
      unreached:unreached === FB.T('{story} has not reached this point yet.',{story:title}), declined:declined, step:t.step,
      offered:FB.stories.get(w).choices(s,s.stories[w]).some(function (c) { return c.id === 'accept_service'; }),
      refused:blocker('odoacer_paid_service') === FB.T('{story} does not offer this choice to you now.',{story:title}) };
  });
  expect(result).toEqual({ banned:[], person:'Ruler', personDetail:true, stop:['Set this program aside','Ends the program.'], paidAllowed:true,
    unreached:true, declined:true, step:0, offered:false, refused:true });
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
    const originalOwner = s.owner.lower_syr_darya;
    s.owner.lower_syr_darya = 'ayyubid_1204';
    FB.invalidateRealmCache();
    const before = JSON.stringify(s), stale = FB.stories.apply(s,id,'muhammad_accept_offer',q), pure = before === JSON.stringify(s);
    s.owner.lower_syr_darya = originalOwner;
    FB.invalidateRealmCache();
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

const wording = [
  { bookmark:'476', scenario:'odoacer_476', ids:['peroz_agenda_476','odoacer_agenda_476','syagrius_agenda_476'] },
  { bookmark:'1204', scenario:'muhammad_1204', ids:['muhammad_agenda_1204','siwa_agenda_1204'] },
  { bookmark:'1241', scenario:'frederick_1241', ids:['frederick_agenda_1241'],
    code:'FREDERICK-1241-frederick_1241-ravenna-m-Frederick_II-standard-0-german.catholic' }
];
for (const group of wording) {
  test(group.bookmark + ' ruler agendas word their choices as plain decisions', async function ({ page }, info) {
    await startParityGame(page, info, group.code ? { bookmark:group.bookmark, scenario:group.scenario, code:group.code } :
      { bookmark:group.bookmark, scenario:group.scenario, declaredOpening:true });
    const result = await page.evaluate(function (ids) {
      const processWords = /\b(ordinary|actual|actually|existing|current|original|authored|declared)\b/i;
      const disclaimers = /grants? no |creates? no |Record (a |an )?(costless )?(priority|intention|preference)|Record attention|\bordinary\b|\bactual(ly)?\b|\bexisting\b|\boriginal\b|\bauthored\b|historical opportunity|political opportunity/i;
      const lostApostrophe = /[A-Za-z]\?[A-Za-z]/;
      const limit = 'These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map.';
      const faults = [], counts = {};
      ids.forEach(function (id) {
        const d = FBDATA.rulerAgendas[id];
        function prose(where, value) {
          if (!value || disclaimers.test(value) || lostApostrophe.test(value)) faults.push(where + ': ' + value);
        }
        counts[id] = 0;
        prose(id + ' intro', d.intro);
        if (d.intro.split(limit).length !== 2 || !d.intro.endsWith(limit)) faults.push(id + ' limit sentence');
        d.stages.forEach(function (st) {
          prose(st.id + ' text', st.text);
          st.choices.forEach(function (c) {
            counts[id]++;
            prose(c.id + ' detail', c.detail);
            if (c.label.trim().split(/\s+/).length > 8 || processWords.test(c.label) || lostApostrophe.test(c.label)) {
              faults.push(c.id + ' label: ' + c.label);
            }
            // The sheet appends the linked story's detail, so a forwarding row never repeats it.
            if (c.operation !== 'agenda_story_choice') return;
            const source = FBDATA.storyInstances[c.storyId].choices[c.choiceId].detail;
            const repeated = (source.match(/[^.]+\./g) || []).some(function (part) { return c.detail.indexOf(part.trim()) >= 0; });
            if (repeated || source.indexOf(c.detail) >= 0) faults.push(c.id + ' repeats ' + c.choiceId);
          });
        });
      });
      return { faults:faults, counts:counts };
    }, group.ids);
    expect(result.faults).toEqual([]);
    expect(Object.keys(result.counts)).toEqual(group.ids);
    expect(Object.values(result.counts).every(function (n) { return n > 0; })).toBe(true);
  });
}

test('Syagrius names Clovis and Soissons for 486 and Odoacer appends each linked detail once', async function ({ page }, info) {
  await start(page, info, 'odoacer_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'odoacer_agenda_476';
    const challenge = FBDATA.rulerAgendas.syagrius_agenda_476.stages.find(function (st) { return st.id === 'syagrius_frankish_challenge'; });
    const rows = FB.stories.choices(s,id), linked = FB.stories.choices(s,'western_court_476');
    const forwarded = FBDATA.rulerAgendas[id].stages[0].choices.filter(function (c) { return c.operation === 'agenda_story_choice'; });
    return { clovis:challenge.text.indexOf('Clovis') >= 0, soissons:challenge.text.indexOf('Soissons') >= 0,
      forwarded:forwarded.map(function (c) {
        const row = rows.find(function (r) { return r.id === c.id; }), source = linked.find(function (r) { return r.id === c.choiceId; });
        return !!row && !!source && row.detail === FB.T(c.detail) + ' ' + source.detail && row.detail.split(source.detail).length === 2;
      }) };
  });
  expect(result).toEqual({ clovis:true, soissons:true, forwarded:[true,true,true] });
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
