'use strict';
const path = require('path');
const fs = require('fs');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/eras.js', 'data/political_institutions.js',
  'data/aristocratic_courts.js', 'js/government_aristocracy.js',
  'js/governments.js', 'js/government_levy.js', 'js/government_revenue.js',
  'js/government_council.js', 'js/government_diplomacy.js', 'js/government_ai.js',
  'js/government_selection.js', 'js/government_lineage.js', 'js/government_support.js',
  'js/government_elective.js',
  'js/government_collective.js', 'js/government_assembly.js', 'data/assembly_polities.js',
  'data/civic_profiles.js', 'js/government_civic.js', 'js/civic_transactions.js', 'js/civic_strategies.js', 'js/civic_conversion.js', 'js/civic_validation.js',
  'js/government_continuity.js', 'js/government_recognition.js', 'js/government_administration.js', 'js/world.js', 'js/actions.js', 'js/council.js',
  'js/authority.js', 'js/armies.js', 'js/lordships.js', 'js/treasury.js', 'js/fiscal.js',
  'js/economy.js', 'js/wars.js', 'js/federates.js', 'js/politics.js', 'js/mods.js',
  'js/station.js', 'js/save.js', 'js/save_v4.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame, advanceTo, FRESH_JOURNEYS } = require('../support/game/parity');
const fixture = path.resolve(__dirname, '../fixtures/government-strategies.js');

async function start(page, testInfo, bookmark) {
  const journey = FRESH_JOURNEYS.find(function (row) {
    return row.bookmark === bookmark && row.scenario === (bookmark === '476' ? 'federate_476' : 'serf');
  });
  await startParityGame(page, testInfo, journey);
}

test('forms have complete named interfaces; legacy mods delegate and invalid forms fail', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const G = FB.governments;
    const explicit = ['territorial','regnum','roman_civic','federate_polity','lineage_kingship','elective_monarchy','assembly_polity','administrative_monarchy','aristocratic_monarchy','city_republic'].every(function (id) {
      return G.slots().every(function (slot) { return typeof FBDATA.governmentForms[id][slot] === 'string'; });
    });
    let empty = '', unknown = '', retired = '', parameters = '', incomplete = '';
    try { G.register('levy', 'fixture_empty', {}); } catch (error) { empty = error.message; }
    function reject(id, patch) {
      FBDATA.governmentForms[id] = Object.assign({}, FBDATA.governmentForms.territorial, patch);
      try { G.resolve(id); return ''; } catch (error) { return error.message; }
      finally { delete FBDATA.governmentForms[id]; }
    }
    unknown = reject('fixture_unknown', { revenue:'fixture_unknown' });
    retired = reject('fixture_retired', { vocabulary:'engine_default' });
    parameters = reject('fixture_parameters', { strategyParameters:{ ai:{ warChance:2 } } });
    G.register('levy', 'fixture_incomplete', { mayCall:function () { return true; } });
    incomplete = reject('fixture_incomplete_form', { levy:'fixture_incomplete' });
    FB.mods.apply({ governmentForms:{ fixture_legacy:{ holders:'direct', succession:'dynastic', territory:'fixed', consent:'territorial' } } });
    const legacy = G.resolve('fixture_legacy');
    return { explicit:explicit, slots:G.slots(), interfaces:G.interfaces(), errors:G.validate(),
      empty:empty, unknown:unknown, retired:retired, parameters:parameters, incomplete:incomplete,
      legacy:legacy.use.levy === G.strategy('levy','feudal_levy'),
      delegated:typeof G.strategy('succession','office').accession === 'function' &&
        typeof G.strategy('succession','acclamation').eligible === 'function' };
  });
  expect(result.explicit).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.slots).not.toContain('vocabulary');
  expect(result.empty).toContain('Empty government strategy');
  expect(result.unknown).toContain('not registered');
  expect(result.retired).toContain('retired vocabulary');
  expect(result.parameters).toContain('Invalid strategy parameters');
  expect(result.incomplete).toContain('incomplete levy strategy');
  expect(result.legacy).toBe(true);
  expect(result.delegated).toBe(true);
  expect(Object.keys(result.interfaces).sort()).toEqual(result.slots.filter(function (slot) { return slot !== 'ladder'; }).sort());
  expect(fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8')).not.toContain('fixtures/government-strategies');
});

test('alternate strategies change public consumers without changing pure-read state', async function ({ page }, testInfo) {
  await start(page, testInfo, '867');
  await page.addScriptTag({ path:fixture });
  const result = await page.evaluate(function () {
    const s = FB.state, G = FB.governments;
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
      !(s.realms[id].succession && s.realms[id].succession.papalElective) && FB.realmHeldCounties(s,id).length &&
      Object.keys(s.realms).some(function (child) { return s.realms[child].alive && s.realms[child].liege === id; }); });
    const pid = FB.realmHeldCounties(s, rid)[0];
    function select(slot, target) {
      const id = 'fixture_' + slot;
      FBDATA.governmentForms[id] = Object.assign({}, FBDATA.governmentForms.territorial);
      FBDATA.governmentForms[id][slot] = 'fixture_alternative';
      s.authority = s.authority || {};
      s.authority.governments = s.authority.governments || {};
      s.authority.governments[target || rid] = { formId:id, sinceTurn:s.turn };
      G.invalidate();
    }
    select('levy');
    const levy = FB.aiBaseHost(s, rid);
    const site = FB.settlementFiscalProjection(s,pid,0);
    const settlementLevy = site.amounts.levy;
    const expectedSettlementLevy = 77 * (site.amounts.settlementPenalty * site.amounts.countyPenalty);
    select('revenue');
    const fiscal = FB.treasurySnapshot(s).rows[rid];
    const revenue = fiscal && fiscal.income;
    select('ai');
    const breakaway = FB.vassalBreakawayChance(s,rid);
    select('diplomacy');
    const declaration = FB.warDeclarationPreview(s,rid,[]).reason;
    select('succession');
    delete s.realms[rid].succession.policyId;
    const ruler = s.realms[rid].ruler.generation;
    const accession = FB.advanceRealmSuccession(s,rid);
    const unchangedRuler = ruler === s.realms[rid].ruler.generation;
    select('territory');
    const other = Object.keys(s.owner).find(function (id) { return s.owner[id] !== rid; });
    const owner = s.owner[other], holder = s.holder[other];
    FB.transferProvince(s,other,rid);
    const refusedCounty = s.owner[other] === owner && s.holder[other] === holder;
    select('holders');
    const expectedHolder = Object.keys(s.realms).sort().find(function (id) { return s.realms[id].alive && s.realms[id].liege === rid; });
    FB.transferProvince(s,other,rid);
    const holderChoice = s.holder[other];
    select('consent');
    const consent = FB.political.consent(s,{kind:'realm',id:rid},'extraordinary_tax',{});
    // The fixture gives the protagonist a living realm only inside this test.
    s.realms.player = Object.assign({}, s.realms[rid], { id:'player', alive:true });
    s.player.tier = 6;
    select('council','player');
    const council = FB.councilSeats(s);
    select('consent','player');
    const characterConsent = FB.political.consent(s,{kind:'character',id:s.player.charId},'grant',{}).allowed;
    const invalidConsent = FB.political.consent(s,{kind:'realm',id:'fixture_missing'},'war',{}).allowed;
    select('levy','player');
    const deniedMuster = FB.raisePlayerHost(s) === null;
    select('ladder','player');
    const ladder = FB.station.mayHoldCouncil(s.player,s);
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.playerTaxParts(s); FB.playerLevy(s); FB.councilSummary(s); FB.warCauses(s,true,true);
    G.forRealm(s,rid); FB.political.consent(s,{kind:'realm',id:rid},'war',{});
    return { levy:levy, revenue:revenue, settlementLevy:settlementLevy, expectedSettlementLevy:expectedSettlementLevy,
      breakaway:breakaway, declaration:declaration, accession:accession, unchangedRuler:unchangedRuler,
      refusedCounty:refusedCounty, holderChoice:holderChoice, expectedHolder:expectedHolder, consent:consent.allowed,
      council:council.length, characterConsent:characterConsent, invalidConsent:invalidConsent, deniedMuster:deniedMuster, ladder:ladder,
      pure:JSON.stringify(s) === before && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toMatchObject({ levy:19, revenue:31, breakaway:0, declaration:'fixture refusal',
    accession:null, unchangedRuler:true, refusedCounty:true, consent:false, council:0,
    characterConsent:false, invalidConsent:false, deniedMuster:true, ladder:false, pure:true });
  expect(result.settlementLevy).toBe(result.expectedSettlementLevy);
  expect(result.holderChoice).toBe(result.expectedHolder);
});

for (const bookmark of ['867','1066','476']) {
  test(bookmark + ' data-only composed form plays a season and replays after restore', async function ({ page }, testInfo) {
    test.setTimeout(180000);
    await start(page,testInfo,bookmark);
    const opening = await page.evaluate(function () {
      const s = FB.state;
      FB.mods.apply({ governmentForms:{ fixture_composed:Object.assign({}, FBDATA.governmentForms.territorial, {
        holders:'direct', strategyParameters:{ council:{ seats:[] }, ai:{ warChance:0 } }
      }) } });
      const rid = Object.keys(s.realms).find(function (id) {
        const r = s.realms[id];
        return id !== 'player' && r.alive && r.succession && !r.succession.papalElective && !r.nonTerritorial;
      });
      if (!FB.authoritySetGovernment(s,rid,'fixture_composed')) throw new Error('Fixture form was not installed');
      const data = JSON.parse(FB.save.serialize());
      FB.save.restore(data);
      return { rid:rid, data:JSON.parse(FB.save.serialize()) };
    });
    const firstAdvance = await advanceTo(page,'season',100);
    expect(firstAdvance.stop).toBeNull();
    const first = await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize());
      return { state:data.state, rng:data.rng, uid:data.uid };
    });
    const restored = await page.evaluate(function (opening) {
      FB.save.restore(opening.data);
      return { rng:FB.getRngState(), uid:FB.getUidCounter(),
        form:FB.governments.forRealm(FB.state,opening.rid).id };
    },opening);
    expect(restored).toEqual({ rng:opening.data.rng, uid:opening.data.uid, form:'fixture_composed' });
    const secondAdvance = await advanceTo(page,'season',100);
    expect(secondAdvance).toEqual(firstAdvance);
    const second = await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize());
      return { state:data.state, rng:data.rng, uid:data.uid };
    });
    expect(second).toEqual(first);
  });
}

test('daily cache is bounded and same-day changes, definitions and restore invalidate it', async function ({ page }, testInfo) {
  await start(page,testInfo,'867');
  const result = await page.evaluate(function () {
    const s = FB.state, G = FB.governments;
    const ids = Object.keys(s.realms).filter(function (id) { return s.realms[id].alive; });
    G.invalidate();
    const resolve = G.resolve; let resolutions = 0;
    G.resolve = function (id) { resolutions++; return resolve(id); };
    const begin = performance.now(), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    try {
      ids.forEach(function (rid) { for (let i=0;i<50;i++) G.forRealm(s,rid); });
      const first = resolutions;
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      s.turn++;
      ids.forEach(function (rid) { G.forRealm(s,rid); });
      const second = resolutions; s.turn--;
      const rid = ids.find(function (id) { return id !== 'player'; });
      G.forRealm(s,rid);
      FB.authoritySetGovernment(s,rid,'regnum');
      const changed = G.forRealm(s,rid).id;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restored = G.forRealm(FB.state,rid).id;
      FB.mods.apply({ governmentForms:{ fixture_cache:Object.assign({},FBDATA.governmentForms.regnum) } });
      FB.authoritySetGovernment(FB.state,rid,'fixture_cache');
      G.forRealm(FB.state,rid);
      FB.mods.apply({ governmentForms:{ fixture_cache:Object.assign({},FBDATA.governmentForms.regnum,{ levy:'engine_default' }) } });
      const replaced = G.forRealm(FB.state,rid).strategies.levy;
      return { pure:pure, realms:ids.length, first:first, second:second, changed:changed, restored:restored,
        replaced:replaced, milliseconds:performance.now()-begin,
        serializedCache:/governmentCache|realmCache/.test(JSON.stringify(saved.state)) };
    } finally { G.resolve = resolve; G.invalidate(); }
  });
  expect(result.first).toBe(result.realms);
  expect(result.second).toBe(result.realms*2);
  expect(result).toMatchObject({ pure:true,changed:'regnum',restored:'regnum',replaced:'engine_default',serializedCache:false });
  await testInfo.attach('government-dispatch-cost.json',{ body:JSON.stringify(result,null,2),contentType:'application/json' });
});
