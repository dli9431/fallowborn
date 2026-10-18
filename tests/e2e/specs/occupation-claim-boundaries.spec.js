'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'js/authority.js', 'js/politics.js', 'js/world.js', 'js/wars.js', 'js/armies.js',
  'js/lordships.js', 'js/settlement.js', 'js/treasury.js', 'js/government_revenue.js', 'js/governments.js',
  'js/population.js', 'js/model.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js',
  'js/starts.js', 'js/main.js', 'js/station.js',
  'data/political_institutions.js', 'data/eras.js', 'data/starts.js', 'data/geographies.js',
  'data/cultures.js', 'data/settlements.js'
]);

function example(prefix) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/authoring/' + prefix + '-control.json'), 'utf8'));
}

async function beginExample(page, info, prefix) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(__dirname, '../fixtures/authoring/' + prefix + '-control.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function (id) {
    return window.FB && FB.game && FB.game.bootReady && !!FBDATA.bookmarks[id];
  }, prefix + '_control_world');
  await beginBookmark(page, info, prefix + '_control_world');
}

for (const prefix of ['river', 'upland']) {
  test(prefix + ' control example validates detached and rejects invented rights without mutation', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (input) {
      const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const id = Object.keys(input.bookmarks)[0], local = input.bookmarks[id].realms[0].id;
      const rejected = ['unknown_beneficiary', 'unproved_judgment', 'opening_recognition'].map(function (kind) {
        const bad = JSON.parse(JSON.stringify(input));
        bad.bookmarks[id].provinces[0].customaryRights = [{ power:'peace', basis:'judgment',
          realmId:local, basisRef:'fictional_judgment' }];
        const right = bad.bookmarks[id].provinces[0].customaryRights[0];
        if (kind === 'unknown_beneficiary') right.realmId = 'absent_court';
        else if (kind === 'unproved_judgment') delete right.basisRef;
        else right.basis = 'recognition';
        return FB.mods.validate(bad).length > 0;
      });
      return { errors:FB.mods.validate(input), rejected:rejected,
        pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
          rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, example(prefix));
    expect(result).toEqual({ errors:[], rejected:[true, true, true], pure:true });
  });

  test(prefix + ' imported outside court has only its declared jurisdiction and no county revenue', async function ({ page }, info) {
    await beginExample(page, info, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, q = FB.political, pid = prefix + '_ford';
      const local = prefix + '_local', outside = prefix + '_outside';
      const actor = { kind:'realm', id:outside };
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const place = q.place(s, { kind:'county', id:pid });
      const right = q.territorialClaims(s, actor, pid);
      const fiscal = FB.treasurySnapshot(s);
      const row = fiscal.rows[outside];
      const revenue = q.power(s, actor, 'revenue', { provinceId:pid }).allowed;
      const peace = q.power(s, actor, 'peace', { provinceId:pid }).allowed;
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      return { owner:place.ownerId, holder:place.holderId, expected:local,
        counties:FB.realmHeldCounties(s, outside), claims:right.map(function (r) { return r.power; }),
        peace:peace, revenue:revenue, tax:row ? row.tax : 0, income:row ? row.income : 0,
        dues:row ? row.duesIn : 0, localTax:fiscal.rows[local].tax,
        culture:FB.countyCommunities(s, pid)[0].culture,
        faith:FB.countyCommunities(s, pid)[0].religion, pure:pure };
    }, prefix);
    expect(result.owner).toBe(result.expected);
    expect(result.holder).toBe(result.expected);
    expect(result).toMatchObject({ counties:[], claims:prefix === 'upland' ? ['peace'] : [],
      peace:prefix === 'upland', revenue:false, tax:0, income:0, dues:0, pure:true,
      culture:prefix === 'river' ? 'german' : 'greek', faith:prefix === 'river' ? 'catholic' : 'orthodox' });
    expect(result.localTax).toBeGreaterThan(0);
  });
}

test('recognition grants neither possession nor revenue, and a commissioned render pays its institution once', async function ({ page }, info) {
  await beginExample(page, info, 'river');
  const result = await page.evaluate(function () {
    const s = FB.state, q = FB.political, pid = 'river_ford';
    const local = { kind:'realm', id:'river_local' }, outside = { kind:'realm', id:'river_outside' };
    const me = { kind:'character', id:s.player.charId };
    const land = JSON.stringify([s.owner, s.holder]);
    const recognition = FB.authorityRecognize(s, { source:'imperial_commission', issuer:local,
      subject:outside, scope:{ kind:'county', id:pid } });
    const recognized = q.legitimacy(s, outside, { kind:'county', id:pid }).length === 1;
    const noRevenue = !q.power(s, outside, 'revenue', { provinceId:pid }).allowed;
    const noPossession = !FB.authorityEstablishRight(s, { issuer:local, beneficiary:outside,
      scope:{ kind:'county', id:pid }, power:'revenue', basis:'possession' });
    const appointment = FB.authorityAppoint(s, { officeId:'fiscal_agent', institutionId:local.id,
      appointer:local, holder:me, scope:{ kind:'county', id:pid } });
    s.treasuryAccounting.mode = 'active';
    s.realms.river_local.treasury.gold = 20;
    s.realms.river_neighbor.treasury.gold = 30;
    const terms = { provinceId:pid, payerRealmId:'river_neighbor', amount:5,
      obligationId:'fictional_reviewed_render' };
    const quote = q.renderQuote(s, me, terms);
    const privateGold = s.player.gold;
    const paid = !!quote && FB.authorityCollectRender(s, quote);
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const duplicate = !FB.authorityCollectRender(s, quote);
    const unchanged = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    return { recognition:!!recognition, recognized:recognized, noRevenue:noRevenue, noPossession:noPossession,
      land:land === JSON.stringify([s.owner, s.holder]), appointment:!!appointment, paid:paid,
      duplicate:duplicate, unchanged:unchanged, institutional:s.realms.river_local.treasury.gold,
      payer:s.realms.river_neighbor.treasury.gold, private:s.player.gold === privateGold,
      receipts:s.authority.receipts.filter(function (r) { return r.obligationId === terms.obligationId; }).length };
  });
  expect(result).toEqual({ recognition:true, recognized:true, noRevenue:true, noPossession:true,
    land:true, appointment:true, paid:true, duplicate:true, unchanged:true,
    institutional:25, payer:25, private:true, receipts:1 });
  const snapshot = await page.evaluate(function () {
    const s = FB.state;
    return { receipts:s.authority.receipts, uid:FB.getUidCounter(), people:Object.keys(s.chars).sort(),
      institutional:s.realms.river_local.treasury.gold, payer:s.realms.river_neighbor.treasury.gold };
  });
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page, saved);
  const restored = await page.evaluate(function () {
    const s = FB.state;
    const quote = FB.political.renderQuote(s, { kind:'character', id:s.player.charId },
      { provinceId:'river_ford', payerRealmId:'river_neighbor', amount:5,
        obligationId:'fictional_reviewed_render' });
    return { snapshot:{ receipts:s.authority.receipts, uid:FB.getUidCounter(), people:Object.keys(s.chars).sort(),
      institutional:s.realms.river_local.treasury.gold, payer:s.realms.river_neighbor.treasury.gold }, quote:quote };
  });
  expect(restored).toEqual({ snapshot:snapshot, quote:null });
});

test('temporary military control preserves legal holders and communities and grants no second tax stream', async function ({ page }, info) {
  await beginExample(page, info, 'river');
  const prepared = await page.evaluate(function () {
    const s = FB.state, pid = 'river_fields';
    const initial = FB.treasurySnapshot(s).rows.river_neighbor;
    const war = FB.registerOrdinaryWar(s, 'river_neighbor', { enemy:'river_local', target:pid,
      casus:{ type:'aggression', target:pid }, legacy:false });
    // Stage a completed siege, without advancing daily simulation or inventing an opening war.
    war.occupations[pid] = { occupied:true, progress:0, homeRealm:'river_local' };
    const land = JSON.stringify([s.owner, s.holder]);
    const communities = JSON.stringify(FB.countyCommunities(s, pid));
    const snapshot = FB.treasurySnapshot(s);
    const invader = { realm:'river_neighbor', warId:war.id }, defender = { realm:'river_local', warId:war.id };
    return { warId:war.id, land:land, communities:communities,
      attacker:FB.ordinaryOccupationControl(s, invader, pid),
      defender:FB.ordinaryOccupationControl(s, defender, pid),
      holder:FB.settlementCountyHolder(s, pid),
      income:snapshot.rows.river_neighbor.income, tax:snapshot.rows.river_neighbor.tax,
      noExtraIncome:initial.income === snapshot.rows.river_neighbor.income &&
        initial.tax === snapshot.rows.river_neighbor.tax,
      counts:[snapshot.rows.river_neighbor.counties, snapshot.rows.river_local.counties],
      collect:FB.political.power(s, { kind:'realm', id:'river_neighbor' }, 'revenue', { provinceId:pid }).allowed };
  });
  expect(prepared).toMatchObject({ attacker:true, defender:false, holder:'river_local', counts:[1, 2], collect:false, noExtraIncome:true });
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page, saved);
  const result = await page.evaluate(function (prepared) {
    const s = FB.state, pid = 'river_fields', w = FB.ordinaryWarById(s, prepared.warId);
    const snapshot = FB.treasurySnapshot(s);
    const matching = !!w && w.occupations[pid].occupied &&
      prepared.land === JSON.stringify([s.owner, s.holder]) &&
      prepared.communities === JSON.stringify(FB.countyCommunities(s, pid));
    const tax = snapshot.rows.river_neighbor.tax, income = snapshot.rows.river_neighbor.income;
    // Recapture affects this campaign's control, without transferring a county.
    w.occupations[pid].occupied = false;
    const recaptured = !FB.ordinaryOccupationControl(s, { realm:'river_neighbor', warId:w.id }, pid);
    FB.settleOrdinaryWar(s, w.id, 'white_peace');
    return { matching:matching, tax:tax, income:income, recaptured:recaptured,
      ended:!FB.ordinaryWarById(s, prepared.warId),
      land:prepared.land === JSON.stringify([s.owner, s.holder]),
      communities:prepared.communities === JSON.stringify(FB.countyCommunities(s, pid)) };
  }, prepared);
  expect(result).toEqual({ matching:true, tax:prepared.tax, income:prepared.income,
    recaptured:true, ended:true, land:true, communities:true });
});
