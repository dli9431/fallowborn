'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { startParityGame, advanceTo } = require('../support/game/parity');
const { startHistoricalGame } = require('../support/game/historical-start');

dependsOnRuntime(__filename, [
  'index.html', 'data/assembly_polities.js', 'data/bookmark_476_outer.js',
  'data/lexicons.js', 'data/actions.js', 'data/technology.js', 'data/political_institutions.js',
  'js/government_support.js', 'js/government_collective.js', 'js/government_assembly.js',
  'js/government_continuity.js', 'js/government_levy.js', 'js/government_revenue.js',
  'js/government_selection.js', 'js/government_lineage.js',
  'js/governments.js', 'js/authority.js', 'js/world.js', 'js/station.js', 'js/lexicon.js',
  'js/treasury.js', 'js/wars.js', 'js/armies.js', 'js/events.js', 'js/economy.js',
  'js/modifiers.js', 'js/actions.js', 'js/ui_assembly.js', 'js/ui_misc.js',
  'js/ui_modals.js', 'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/mods.js'
]);

async function start(page, testInfo, fictional, crazygames) {
  const journey = { bookmark:'476',
    code:'ASSEMBLY-476-farmer_476-tallinn-m-Review-established-0-finnic.baltic_pagan' };
  if (crazygames) await startHistoricalGame(page, testInfo, journey, true);
  else await startParityGame(page, testInfo, journey);
  return page.evaluate(function (fictional) {
    const s = FB.state, C = FB.governments.support;
    let rid = 'north_coast_476';
    if (fictional) {
      // A second declaration uses the same engine in this isolated campaign.
      // Its fictional opening is deliberately absent from historical bookmarks.
      const d = FBDATA.assemblyOpenings.federation_example;
      rid = d.id;
      s.realms[rid] = { id:rid, name:d.name, color:d.color, capital:d.capital,
        rank:d.rank, alive:true, liege:null, religion:d.religion, aggression:0,
        ruler:{ name:d.representative.name, born:d.representative.born, age:36, sex:'m', generation:1, mar:3 }, war:null, op:0 };
      s.owner[d.capital] = rid; s.holder[d.capital] = rid;
      FB.invalidateRealmCache();
      if (!FB.authoritySetGovernment(s, rid, d.government)) throw new Error('Fixture form was not installed');
      C.initialize(s, [d]);
      FB.treasuryInitialize(s);
    }
    s.realms[rid].treasury.gold = 100;
    return rid;
  }, !!fictional);
}

async function qualifyPlayer(page, rid) {
  await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, c = s.chars[s.player.charId];
    s.player.provinceId = C.row(s, rid).scopes[0]; s.player.liege = rid;
    s.player.tier = 1; s.player.gold = 100;
    c.homeProvinceId = s.player.provinceId; c.born = s.date.year - 30;
    delete c.unfree;
    FB.SKILLS.forEach(function (k) { c.skills[k] = 10; });
    FB.careerOf(s, c).experience = 3;
  }, rid);
}

async function electPlayer(page, rid) {
  await qualifyPlayer(page, rid);
  await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support;
    C.openVacancy(s, rid, 'resign');
    if (!C.apply(s, C.quote(s, rid, 'nominate', { candidateId:s.player.charId }))) throw new Error('Nomination failed');
    C.members(s, rid).forEach(function (m) {
      if (!C.apply(s, C.quote(s, rid, 'recognize', { memberId:m.id, candidateId:s.player.charId }))) throw new Error('Recognition failed');
    });
    if (!C.apply(s, C.quote(s, rid, 'select', {}))) throw new Error('Selection failed');
  }, rid);
}

for (const fictional of [false, true]) {
  test('typed constituency ' + (fictional ? 'federation' : 'coastal households') + ' has pure reads and bounded public powers', async function ({ page }, testInfo) {
    const rid = await start(page, testInfo, fictional);
    await qualifyPlayer(page, rid);
    const result = await page.evaluate(function (rid) {
      const s = FB.state, C = FB.governments.support, r = C.row(s, rid), p = C.profile(s, rid);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const people = C.candidates(s, rid), memberCopy = C.members(s, rid);
      memberCopy[0].weight = 10;
      C.quote(s, rid, 'nominate', { candidateId:s.player.charId });
      C.assentQuote(s, rid, 'extraordinary_tax', { amount:2, duration:90 });
      const levy = FB.aiBaseHost(s, rid), income = FB.treasurySnapshot(s).rows[rid].income;
      const delegate = C.delegate(s, rid);
      const noGrant = !FB.political.consent(s, { kind:'character', id:s.player.charId }, 'grant', { provinceId:r.scopes[0] }).allowed;
      const household = C.consent(s, rid, { kind:'character', id:s.player.charId }, 'household', {}).allowed;
      return { errors:FB.governments.validate(), technology:FB.validateTechnologyData(true),
        review:FBDATA.techImpactReviews.features.assembly_delegation.mode,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        people:people.length, noGrant:noGrant, household:household,
        noCrown:!FB.station.rulesRealm(s.player, s) && !FB.station.maySeekCounty(s.player, s),
        ordinary:!delegate.royalLine && !delegate.dyn && !s.realms[rid].succession,
        influence:r.members.map(function (m) { return m.weight; }), fee:p.selection.nominationCost,
        service:p.eligibility.minServiceYears, term:p.selection.termDays, levy:levy, maxLevy:p.obligations.maxLevy,
        income:income, maxDues:p.obligations.maxDues,
        original:FB.bookmark('476').provinces.find(function (q) { return q.id === 'tallinn'; }).wasteland,
        visible:FB.instantStatus(s, 'community_assembly').shown };
    }, rid);
    expect(result).toMatchObject({ errors:[], technology:[], review:'none', pure:true, noGrant:true,
      household:true, noCrown:true, ordinary:true, original:true, visible:true,
      influence:fictional ? [2,2,1] : [3,2,1], fee:fictional ? 3 : 0,
      service:fictional ? 2 : 0, term:fictional ? 720 : null });
    expect(result.people).toBeGreaterThanOrEqual(3);
    expect(result.levy).toBeGreaterThanOrEqual(0);
    expect(result.levy).toBeLessThanOrEqual(result.maxLevy);
    expect(result.income).toBeLessThanOrEqual(result.maxDues);
  });
}

test('nomination fees and selection reject stale funds, eligibility and membership without granting a crown', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo, true);
  await qualifyPlayer(page, rid);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid), c = s.chars[s.player.charId];
    const household = JSON.stringify({ plots:s.player.landPlots, dyn:c.dyn, children:c.childrenIds, spouse:c.spouseId });
    C.openVacancy(s, rid, 'resign');
    const first = C.quote(s, rid, 'nominate', { candidateId:c.id });
    s.player.gold++;
    const fundsRejected = !C.apply(s, first), gold = s.player.gold;
    const second = C.quote(s, rid, 'nominate', { candidateId:c.id });
    c.skills.ste++;
    const skillsRejected = !C.apply(s, second) && s.player.gold === gold;
    const third = C.quote(s, rid, 'nominate', { candidateId:c.id });
    c.born = s.date.year - 10;
    const minorRejected = !C.apply(s, third) && C.eligible(s, rid, c.id).reason === 'minor';
    c.born = s.date.year - 30;
    c.career.experience = 0;
    const serviceRejected = C.quote(s, rid, 'nominate', { candidateId:c.id }).reason === 'service';
    c.career.experience = 3;
    const nomination = C.quote(s, rid, 'nominate', { candidateId:c.id });
    const paid = C.apply(s, nomination), repeat = C.apply(s, nomination);
    C.members(s, rid).forEach(function (m) { C.apply(s, C.quote(s, rid, 'recognize', { memberId:m.id, candidateId:c.id })); });
    const selection = C.quote(s, rid, 'select', {});
    r.members[0].weight++;
    const staleMembers = !C.apply(s, selection);
    const current = C.quote(s, rid, 'select', {}), selected = C.apply(s, current);
    const mandate = r.mandate.id, generation = r.mandate.generation;
    r.members[0].weight++;
    return { fundsRejected:fundsRejected, skillsRejected:skillsRejected, minorRejected:minorRejected,
      serviceRejected:serviceRejected, paid:paid, repeat:repeat, fee:gold - s.player.gold,
      staleMembers:staleMembers, selected:selected, replay:!C.apply(s, current) && !C.recognition(s, rid),
      unchanged:r.mandate.id === mandate && r.mandate.generation === generation,
      household:household === JSON.stringify({ plots:s.player.landPlots, dyn:c.dyn, children:c.childrenIds, spouse:c.spouseId }),
      tier:s.player.tier, delegate:C.delegate(s, rid).id === c.id,
      grant:FB.political.consent(s, { kind:'character', id:c.id }, 'grant', {}).allowed,
      ban:FB.political.power(s, { kind:'character', id:c.id }, 'ban', { provinceId:r.scopes[0] }).allowed };
  }, rid);
  expect(result).toEqual({ fundsRejected:true, skillsRejected:true, minorRejected:true, serviceRejected:true,
    paid:true, repeat:false, fee:3, staleMembers:true, selected:true, replay:true, unchanged:true,
    household:true, tier:1, delegate:true, grant:false, ban:true });
});

test('death, justified recall, unavailable interests and term expiry preserve local continuity', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo, true);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid);
    const first = C.delegate(s, rid), generation = r.mandate.generation;
    FB.killChar(s, first);
    const replaced = !!C.delegate(s, rid) && C.delegate(s, rid).id !== first.id && r.mandate.generation === generation + 1;
    const ids = C.members(s, rid).map(function (m) { return m.id; });
    const unjustified = !C.quote(s, rid, 'recall', { reason:'overreach', members:ids }).allowed;
    C.attemptOverreach(s, rid, 'pledge', { amount:10 });
    const recall = C.quote(s, rid, 'recall', { reason:'overreach', members:ids });
    const recalled = C.apply(s, recall), vacancy = !C.delegate(s, rid);
    const defence = C.consent(s, rid, { kind:'realm', id:rid }, 'defence', {}).allowed;
    C.tick(s, rid);
    const current = C.delegate(s, rid), selectionId = r.selection.id, mandateId = r.mandate.id;
    const other = C.candidates(s, rid).find(function (id) { return id !== current.id && id !== s.player.charId; });
    r.members[0].principal = { kind:'character', id:other };
    s.chars[other].dead = true;
    const suspended = !C.delegate(s, rid);
    const repaired = C.apply(s, C.quote(s, rid, 'repair_member', { memberId:r.members[0].id }));
    const notReplayed = r.selection.id === selectionId && r.mandate.id === mandateId && !!C.delegate(s, rid);
    const beforeTerm = r.mandate.id;
    s.turn = r.mandate.endTurn; s.date.year += 2;
    C.day(s);
    const expired = r.mandate.id !== beforeTerm && r.selection.cause === 'term_end';
    C.candidates(s, rid).forEach(function (id) { s.chars[id].born = s.date.year - 5; });
    C.day(s);
    return { replaced:replaced, unjustified:unjustified, recalled:recalled, vacancy:vacancy, defence:defence,
      suspended:suspended, repaired:repaired, notReplayed:notReplayed, expired:expired,
      noAdults:!C.delegate(s, rid) && r.selection.status === 'open', noDynasty:!s.realms[rid].succession,
      valid:C.validate(s) };
  }, rid);
  expect(result).toEqual({ replaced:true, unjustified:true, recalled:true, vacancy:true, defence:true,
    suspended:true, repaired:true, notReplayed:true, expired:true, noAdults:true, noDynasty:true, valid:true });
});

test('collective refusal, bounded dues and public payments share the reviewed transaction', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid), pid = r.scopes[0];
    const partner = Object.keys(s.realms).find(function (id) { return id !== rid && !C.isDelegated(s, id) && FB.treasuryCounterparty(s, id); });
    const terms = { kind:'tribute', externalRealmId:partner, amount:5, duration:360 };
    const wallet = s.player.gold, local = FB.treasuryAvailable(s, rid), outside = FB.treasuryAvailable(s, partner);
    FB.setCountySupport(s, pid, -100);
    const refusal = C.assentQuote(s, rid, 'treaty', terms), refused = !C.assent(s, refusal);
    const durable = r.decisions[0].status === 'refused', serial = r.serial;
    C.assent(s, refusal);
    const once = serial === r.serial;
    FB.setCountySupport(s, pid, 0);
    const q = C.agreementQuote(s, rid, terms);
    r.members[0].weight++;
    const stale = !C.agree(s, q) && local === FB.treasuryAvailable(s, rid);
    r.members[0].weight--;
    const fresh = C.agreementQuote(s, rid, terms), accepted = C.agree(s, fresh);
    const repeated = C.agree(s, fresh);
    const beforeDues = FB.treasurySnapshot(s).rows[rid].income;
    const dues = C.imposeDues(s, C.duesQuote(s, rid, { amount:3, duration:90 }));
    const afterDues = FB.treasurySnapshot(s).rows[rid].income;
    const render = FB.political.renderQuote(s, { kind:'realm', id:rid },
      { provinceId:pid, payerRealmId:partner, amount:100, obligationId:'invented-charge' });
    return { refused:refused, durable:durable, once:once, stale:stale, accepted:accepted, repeated:repeated,
      publicDebit:local - FB.treasuryAvailable(s, rid), publicCredit:FB.treasuryAvailable(s, partner) - outside,
      wallet:s.player.gold === wallet, owner:s.owner[pid] === rid && s.holder[pid] === rid,
      dues:dues, duesGain:afterDues - beforeDues, bounded:afterDues <= C.profile(s, rid).obligations.maxDues,
      duplicateDues:!C.duesQuote(s, rid, { amount:3, duration:90 }).allowed, noInventedRender:render === null,
      pledge:!C.assentQuote(s, rid, 'pledge', { amount:10 }).allowed, valid:C.validate(s) };
  }, rid);
  expect(result).toMatchObject({ refused:true, durable:true, once:true, stale:true, accepted:true, repeated:false,
    publicDebit:5, publicCredit:5, wallet:true, owner:true, dues:true, bounded:true, duplicateDues:true, noInventedRender:true, pledge:true, valid:true });
  expect(result.duesGain).toBeGreaterThan(0);
  expect(result.duesGain).toBeLessThanOrEqual(3);
});

test('service conserves troops and external authority has one declared power and duration', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid), pid = r.scopes[0];
    s.dev[pid] = 6;
    const partner = Object.keys(s.realms).find(function (id) { return id !== rid && !C.isDelegated(s, id) && FB.treasuryCounterparty(s, id) && FB.aiBaseHost(s, id) > 100; });
    s.realms[partner].treasury.gold = 1000;
    const ownBefore = FB.aiBaseHost(s, rid), otherBefore = FB.aiBaseHost(s, partner);
    const levy = Math.max(1, Math.floor(ownBefore / 2));
    const service = C.agree(s, C.agreementQuote(s, rid, { kind:'service', externalRealmId:partner, amount:0, duration:90, levy:levy }));
    const ownAfter = FB.aiBaseHost(s, rid), otherAfter = FB.aiBaseHost(s, partner);
    const authority = C.agree(s, C.agreementQuote(s, rid,
      { kind:'delegated_authority', externalRealmId:partner, amount:0, duration:90, power:'ban' }));
    const actor = { kind:'realm', id:partner };
    const command = FB.political.power(s, actor, 'ban', { provinceId:pid }).allowed;
    const noRevenue = !FB.political.power(s, actor, 'revenue', { provinceId:pid }).allowed;
    const deniedQuote = C.agreementQuote(s, rid, { kind:'protection', externalRealmId:partner, amount:5, duration:90, levy:10 });
    s.realms[partner].treasury.gold = 0;
    const partnerRefusal = !C.agree(s, deniedQuote) && C.agreementQuote(s, rid,
      { kind:'protection', externalRealmId:partner, amount:5, duration:90, levy:10 }).reason === 'partner_withheld';
    s.turn += 90;
    return { service:service, authority:authority, conserved:Math.abs((ownBefore - ownAfter) - (otherAfter - otherBefore)) <= 1,
      reduced:ownAfter < ownBefore, command:command, noRevenue:noRevenue, partnerRefusal:partnerRefusal,
      expired:!FB.political.power(s, actor, 'ban', { provinceId:pid }).allowed && FB.aiBaseHost(s, rid) === ownBefore };
  }, rid);
  expect(result).toEqual({ service:true, authority:true, conserved:true, reduced:true, command:true, noRevenue:true, partnerRefusal:true, expired:true });
});

test('protection and occupied autonomy preserve the community and conserve support', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid), pid = r.scopes[0];
    const partner = Object.keys(s.realms).find(function (id) { return id !== rid && !C.isDelegated(s, id) &&
      FB.treasuryCounterparty(s, id) && !FB.isRealmAtWar(s, id) && FB.aiBaseHost(s, id) > 100; });
    const enemy = Object.keys(s.realms).find(function (id) { return id !== rid && id !== partner &&
      s.realms[id].alive && !C.isDelegated(s, id); });
    s.realms[partner].treasury.gold = 1000;
    const mandate = r.mandate.id, wallet = s.player.gold;
    FB.transferProvince(s, pid, partner);
    const autonomy = C.agree(s, C.agreementQuote(s, rid,
      { kind:'protection', externalRealmId:partner, amount:5, duration:90, levy:10, occupationSettlement:true }));
    const local = FB.aiBaseHost(s, rid), outside = FB.aiBaseHost(s, partner);
    const war = FB.registerOrdinaryWar(s, enemy, { enemy:rid, target:pid, legacy:false });
    const gain = FB.aiBaseHost(s, rid) - local, loss = outside - FB.aiBaseHost(s, partner);
    const obligations = C.conversionQuote(s, rid, { formId:'regnum', externalRealmId:partner }).reason;
    return { autonomy:autonomy, localControl:s.owner[pid] === rid && s.holder[pid] === rid,
      mandate:r.mandate.id === mandate, wallet:s.player.gold === wallet, war:!!war,
      gain:gain, loss:loss, obligations:obligations, valid:C.validate(s) };
  }, rid);
  expect(result).toMatchObject({ autonomy:true, localControl:true, mandate:true, wallet:true,
    war:true, obligations:'existing_obligations', valid:true });
  expect(result.gain).toBeGreaterThan(0);
  expect(Math.abs(result.gain - result.loss)).toBeLessThanOrEqual(1);
});

test('a protagonist delegate death closes public office before household inheritance', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  await electPlayer(page, rid);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid), me = s.chars[s.player.charId];
    const mandate = r.mandate.id, plots = JSON.stringify(s.player.landPlots);
    me.dead = true; me.died = s.date.year;
    // Mirror the notification boundary used by the protagonist death flow.
    FB.royalCharDied(s, me);
    const next = r.mandate.id, serial = r.serial;
    FB.royalCharDied(s, me);
    return { replaced:next !== mandate && C.delegate(s, rid).id !== me.id,
      once:r.serial === serial && r.mandate.id === next,
      property:plots === JSON.stringify(s.player.landPlots), valid:C.validate(s) };
  }, rid);
  expect(result).toEqual({ replaced:true, once:true, property:true, valid:true });
});

test('offensive declaration needs exact assent while ordinary defence remains available', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo, true);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid);
    const cause = C.frontierCauses(s, rid)[0];
    if (!cause) throw new Error('The federation fixture needs an inhabited frontier');
    const money = FB.treasuryAvailable(s, rid), count = FB.realmWars(s, rid).length;
    const rejected = FB.registerOrdinaryWar(s, rid, { enemy:cause.enemy, target:cause.target, casus:cause, legacy:false }) === null;
    const overreach = r.overreach && FB.realmWars(s, rid).length === count && FB.treasuryAvailable(s, rid) === money;
    const assent = C.assent(s, C.assentQuote(s, rid, 'war', { causes:[cause] }));
    const quote = C.warQuote(s, rid, { causes:[cause] });
    const launched = C.launchWar(s, quote), repeat = C.launchWar(s, quote);
    const w = FB.realmWars(s, rid)[0];
    const peaceBlocked = !FB.settleOrdinaryWar(s, w.id, 'white_peace');
    w.seasons = 4;
    const peace = C.makePeace(s, C.peaceQuote(s, rid, { warId:w.id, kind:'white_peace' }));
    const defence = FB.registerOrdinaryWar(s, cause.enemy, { enemy:rid, target:r.scopes[0], legacy:false });
    return { rejected:rejected, overreach:overreach, assent:assent, launched:launched, repeat:repeat,
      peaceBlocked:peaceBlocked, peace:peace, defended:!!defence && defence.defender === rid,
      defensiveConsent:C.consent(s, rid, { kind:'realm', id:rid }, 'defence', {}).allowed };
  }, rid);
  expect(result).toEqual({ rejected:true, overreach:true, assent:true, launched:true, repeat:false,
    peaceBlocked:true, peace:true, defended:true, defensiveConsent:true });
});

test('occupation preserves ownership rights and requires a distinct reviewed settlement', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid), pid = r.scopes[0];
    const partner = Object.keys(s.realms).find(function (id) { return id !== rid && !C.isDelegated(s, id) && FB.treasuryCounterparty(s, id); });
    const property = JSON.stringify({ plots:s.player.landPlots, communities:s.communities, rights:s.authority.rights });
    FB.transferProvince(s, pid, partner);
    const occupation = s.owner[pid] === partner && s.holder[pid] === rid && s.realms[rid].alive;
    const blocked = !FB.authoritySetGovernment(s, rid, 'regnum');
    const q = C.conversionQuote(s, rid, { formId:'regnum', externalRealmId:partner });
    r.members[0].weight++;
    const stale = !C.acceptConversion(s, q) && C.isDelegated(s, rid);
    r.members[0].weight--;
    const accepted = C.acceptConversion(s, C.conversionQuote(s, rid, { formId:'regnum', externalRealmId:partner }));
    const restored = s.owner[pid] === rid && s.holder[pid] === rid;
    return { occupation:occupation, blocked:blocked, stale:stale, accepted:accepted, restored:restored,
      ended:r.mandate.status === 'ended' && !C.isDelegated(s, rid),
      noReselection:C.quote(s, rid, 'select', {}) === null,
      property:property === JSON.stringify({ plots:s.player.landPlots, communities:s.communities, rights:s.authority.rights }),
      valid:C.validate(s) };
  }, rid);
  expect(result).toEqual({ occupation:true, blocked:true, stale:true, accepted:true, restored:true,
    ended:true, noReselection:true, property:true, valid:true });
});

test('assembly and lineage institutions retain independent mandates across a shared restore', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, S = FB.governmentSelection;
    const lineage = Object.keys(s.realms).find(function (id) { return !!S.state(s, id); });
    if (!lineage) throw new Error('The mixed opening must contain a lineage institution');
    const kin = JSON.stringify(S.state(s, lineage)), kinTree = JSON.stringify(s.realms[lineage].succession);
    C.openVacancy(s, rid, 'resign'); C.tick(s, rid);
    const assembly = JSON.stringify(C.row(s, rid));
    const independent = kin === JSON.stringify(S.state(s, lineage)) && kinTree === JSON.stringify(s.realms[lineage].succession);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return { independent:independent, assembly:assembly === JSON.stringify(C.row(FB.state, rid)),
      lineage:kin === JSON.stringify(S.state(FB.state, lineage)), delegate:!!C.delegate(FB.state, rid),
      noDynasty:!FB.state.realms[rid].succession, errors:FB.governments.validate() };
  }, rid);
  expect(result).toEqual({ independent:true, assembly:true, lineage:true, delegate:true, noDynasty:true, errors:[] });
});

test('typed mod profiles reject invalid policy without installing content', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(function () {
    const C = FB.governments.support, source = FBDATA.constituencyProfiles.coastal_households;
    const before = JSON.stringify(FBDATA.constituencyProfiles), rng = FB.getRngState(), uid = FB.getUidCounter();
    const changes = [
      function (p) { p.selection.termDays = 1; },
      function (p) { p.members.push(p.members[0]); },
      function (p) { p.members[0].weight = 0; },
      function (p) { p.reserved.push('invented_power'); },
      function (p) { p.eligibility.skills.invented = 1; },
      function (p) { p.obligations.revenueRate = 2; },
      function (p) { p.selection.effect = { gold:100 }; }
    ];
    const rejected = changes.map(function (change) {
      const p = JSON.parse(JSON.stringify(source)); change(p);
      return C.validateProfiles({ example:p }).length > 0;
    });
    return { valid:C.validateProfiles({ example:source }).length === 0, rejected:rejected,
      pure:before === JSON.stringify(FBDATA.constituencyProfiles) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ valid:true, rejected:Array(7).fill(true), pure:true });
});

test('save round trips preserve institution ids and malformed records never replace live state', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  const result = await page.evaluate(function (rid) {
    const current = FB.state, support = FB.governments.support;
    support.assent(current, support.assentQuote(current, rid, 'extraordinary_tax', { amount:2, duration:90 }));
    const source = JSON.parse(FB.save.serialize()), C = FB.governments.support;
    const before = JSON.stringify(C.row(FB.state, rid));
    FB.save.restore(source);
    const restored = before === JSON.stringify(C.row(FB.state, rid));
    const identity = (FB.getRngState() >>> 0) === (source.rng >>> 0) && FB.getUidCounter() === source.uid;
    const mutations = [
      function (s, r) { r.profileId = 'missing_profile'; },
      function (s, r) { r.members.push(r.members[0]); },
      function (s, r) { r.members[0].principal = { kind:'character', id:'missing_person' }; },
      function (s, r) { r.members[0].scope = ['missing_county']; },
      function (s, r) { r.mandate.delegateId = 'missing_delegate'; },
      function (s, r) { r.mandate.generation++; },
      function (s, r) { r.selection.resolvedId = r.selection.id; },
      function (s, r) { r.selection.status = 'open'; r.selection.resolvedId = null; },
      function (s, r) { s.holder[r.scopes[0]] = 'missing_holder'; },
      function (s, r) { r.decisions[0].terms.amount = 'two'; },
      function (s, r) { r.decisions[0].terms.duration = 100000; },
      function (s) { s.governmentSupport.schema = 2; }
    ];
    const rejected = mutations.map(function (change) {
      const input = JSON.parse(JSON.stringify(source)), r = input.state.governmentSupport.polities[rid];
      change(input.state, r);
      const bytes = JSON.stringify(input), live = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      let failed = false;
      try { FB.save.restore(input); } catch (error) { failed = true; }
      return failed && FB.state === live && rng === FB.getRngState() && uid === FB.getUidCounter() && bytes === JSON.stringify(input);
    });
    const absent = JSON.parse(JSON.stringify(source)); delete absent.state.governmentSupport;
    FB.save.restore(absent);
    return { restored:restored, identity:identity, rejected:rejected,
      legacy:!FB.state.governmentSupport && !C.delegate(FB.state, rid) && !FB.state.realms[rid].succession };
  }, rid);
  expect(result).toEqual({ restored:true, identity:true, rejected:Array(12).fill(true), legacy:true });
});

test('repeated terms and selection history stay bounded without a generated dynasty', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo, true);
  const result = await page.evaluate(function (rid) {
    const s = FB.state, C = FB.governments.support, r = C.row(s, rid);
    const people = Object.keys(s.chars).length;
    for (let i = 0; i < 8; i++) {
      s.turn = r.mandate.endTurn; s.date.year += 2;
      s.realms[rid].treasury.gold = 100;
      C.day(s);
      if (!C.delegate(s, rid)) throw new Error('Finite-term mandate did not renew');
    }
    const partner = Object.keys(s.realms).find(function (id) { return !C.isDelegated(s, id) && FB.treasuryCounterparty(s, id); });
    for (let i = 1; i <= 30; i++) C.assent(s, C.assentQuote(s, rid, 'treaty',
      { kind:'tribute', externalRealmId:partner, amount:0, duration:i }));
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    for (let i = 0; i < 10; i++) { C.members(s, rid); C.candidates(s, rid); C.delegate(s, rid); }
    return { people:Object.keys(s.chars).length === people, history:r.history.length, decisions:r.decisions.length,
      bytes:JSON.stringify(r).length, valid:C.validate(s), noDynasty:!s.realms[rid].succession,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, rid);
  expect(result).toMatchObject({ people:true, decisions:12, valid:true, noDynasty:true, pure:true });
  expect(result.history).toBeLessThanOrEqual(12);
  expect(result.bytes).toBeLessThan(32000);
});

test('an ordinary household replays a season across restore', async function ({ page }, testInfo) {
  const rid = await start(page, testInfo);
  const source = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  async function snapshot() {
    return page.evaluate(function (rid) { return { institution:FB.governments.support.row(FB.state, rid),
      owner:FB.state.owner, holder:FB.state.holder, rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(), date:FB.state.date }; }, rid);
  }
  expect((await advanceTo(page, 'season', 100)).stop).toBeNull();
  const first = await snapshot();
  await page.evaluate(function (source) { FB.save.restore(source); }, source);
  expect((await advanceTo(page, 'season', 100)).stop).toBeNull();
  expect(await snapshot()).toEqual(first);
});

for (const crazygames of [false, true]) {
  test('assembly review retains navigation and rejects stale confirmation with distribution flag ' + crazygames, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:720 });
    const rid = await start(page, testInfo, false, crazygames);
    await electPlayer(page, rid);
    await page.evaluate(function (rid) { FB.ui.showCommunityAssembly(rid); }, rid);
    const tribute = page.getByRole('button', { name:/^Review tribute/ });
    await expect(tribute).toBeEnabled();
    const id = await tribute.getAttribute('id');
    await page.locator('[aria-controls="' + id + '-details"]').click();
    await tribute.focus();
    const scroll = await page.evaluate(function () { const n = document.getElementById('gm-body'); n.scrollTop = 160; return n.scrollTop; });
    await tribute.click();
    await expect(page.locator('#assembly-confirm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tribute).toBeFocused();
    await expect(page.locator('[aria-controls="' + id + '-details"]')).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(function () { return document.getElementById('gm-body').scrollTop; })).toBeGreaterThan(0);
    expect(scroll).toBeGreaterThan(0);
    await tribute.click();
    const gold = await page.evaluate(function (rid) {
      const r = FB.governments.support.row(FB.state, rid); r.members[0].weight++;
      return FB.treasuryAvailable(FB.state, rid);
    }, rid);
    await page.locator('#assembly-confirm').click();
    await expect(page.getByRole('heading', { name:'Terms changed', exact:true })).toBeVisible();
    expect(await page.evaluate(function (rid) { return FB.treasuryAvailable(FB.state, rid); }, rid)).toBe(gold);
    await page.locator('#assembly-continue').click();
    await expect(tribute).toBeFocused();
  });
}
