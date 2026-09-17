'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmarks.js', 'data/map_data.js', 'data/settlements.js', 'data/economy.js',
  'data/technology.js', 'js/lordships.js', 'js/world.js', 'js/model.js',
  'js/events.js', 'js/actions.js', 'js/main.js', 'js/save.js', 'js/population.js', 'js/technology.js', 'js/modifiers.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

/* Bookmark selection belongs to this migration scenario, not the universal
   fixture or the ordinary CADENCE journey. */
async function startBookmark(page, bookmark) {
  await page.evaluate(function () { FB.startProgression.noteTier(1); });
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('LORDSHIPS-' + bookmark + '-farmer-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true })).toBeVisible();
  await page.getByRole('button', { name:'Begin', exact:true }).press('Enter');
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const bookmark of ['867', '1066']) {
  test('migration preserves the ' + bookmark + ' county world and survives the save codec',
    async function ({ page }) {
      await startBookmark(page, bookmark);
      const result = await page.evaluate(function () {
        const s = FB.state, p = s.player;
        const pid = p.provinceId;
        delete s.settlementLordships;
        p.tier = 3;
        p.homeSettlement = 0;
        p.manor = { provinceId:pid, settlement:1 };
        const before = JSON.stringify({ owner:s.owner, holder:s.holder,
          buildings:s.buildings, population:s.population, manor:p.manor,
          holdings:p.holdings, enterprises:p.enterprises, gold:p.gold,
          prestige:p.prestige, turn:s.turn, provs:p.provs });
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.ensureSettlementLordships(s);
        const migrated = JSON.stringify(s.settlementLordships);
        FB.ensureSettlementLordships(s);
        const twice = JSON.stringify(s.settlementLordships);
        const preserved = before === JSON.stringify({ owner:s.owner, holder:s.holder,
          buildings:s.buildings, population:s.population, manor:p.manor,
          holdings:p.holdings, enterprises:p.enterprises, gold:p.gold,
          prestige:p.prestige, turn:s.turn, provs:p.provs });
        const rngStable = JSON.stringify(rng) === JSON.stringify(FB.getRngState());
        const uidStable = uid === FB.getUidCounter();
        const seat = FB.settlementHolder(s, pid, 0);
        const estate = FB.settlementHolder(s, pid, 1);
        const saved = FB.save.serialize();
        FB.save.restore(JSON.parse(saved));
        const loaded = JSON.stringify(FB.state.settlementLordships);
        return { bookmark:FB.state.start.id, preserved:preserved,
          idempotent:migrated === twice, roundTrip:migrated === loaded,
          rngStable:rngStable, uidStable:uidStable,
          seat:seat, expectedCount:FB.settlementCountyHolder(FB.state, pid),
          estate:estate, playerId:p.charId,
          status:FB.state.settlementLordships.legacyBarony };
      });
      expect(result.bookmark).toBe(bookmark);
      expect(result.preserved).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.roundTrip).toBe(true);
      expect(result.rngStable).toBe(true);
      expect(result.uidStable).toBe(true);
      expect(result.status).toBe('granted');
      expect(result.seat).toEqual({ kind:'realm', id:result.expectedCount });
      expect(result.estate).toEqual({ kind:'character', id:result.playerId });
    });
}

test('reads are detached and do not repair saves, generate courts, or consume RNG',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      FB.assignSettlementLordship(s, pid, 1, s.player.charId);
      const before = JSON.stringify(s), rng = JSON.stringify(FB.getRngState());
      const holder = FB.settlementHolder(s, pid, 1);
      holder.id = 'changed';
      const record = FB.settlementLordship(s, pid, 1);
      record.obligations.charterId = 'changed';
      FB.homeCountyAuthority(s);
      FB.directSettlements(s);
      FB.settlementCapacityProjection(s);
      FB.settlementFiscalProjection(s, pid, 1);
      FB.settlementContributionProjection(s, pid, 1);
      const founding = FB.settlementFoundingEligibility(s, pid);
      const direct = FB.settlementConstructionAuthority(s, pid, 1);
      const count = FB.settlementConstructionAuthority(s, pid, 1,
        FB.settlementCountyHolder(s, pid));
      return { unchanged:before === JSON.stringify(s),
        rng:rng === JSON.stringify(FB.getRngState()), direct:direct.direct,
        count:count.direct, integrated:direct.integrated, founding:founding.ready,
        charter:FB.settlementLordship(s, pid, 1).obligations.charterId };
    });
    expect(result).toEqual({ unchanged:true, rng:true, direct:true, count:false,
      integrated:true, founding:false, charter:'customary_service' });
  });

test('migration preserves direct holdings and excludes personal or appointed offices',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const original = FB.state;
      const rows = [];
      ['county', 'bishop', 'chief_qadi', 'castellan'].forEach(function (kind) {
        const s = JSON.parse(JSON.stringify(original)), p = s.player;
        delete s.settlementLordships;
        p.tier = kind === 'county' ? 6 : 3;
        if (kind === 'bishop') s.chars[p.charId].bishopric = { provinceId:p.provinceId };
        if (kind === 'chief_qadi') p.flags.chief_qadi = true;
        if (kind === 'castellan') p.castellany = { tenure:'life' };
        const before = JSON.stringify([s.owner, s.holder, p.provs, p.gold]);
        FB.ensureSettlementLordships(s);
        let delegated = 0, total = 0;
        Object.keys(s.settlementLordships.counties).forEach(function (pid) {
          const c = s.settlementLordships.counties[pid];
          delegated += Object.keys(c.lordships).length;
          total += c.established;
        });
        rows.push({ kind:kind, delegated:delegated, populated:total > 100,
          stable:before === JSON.stringify([s.owner, s.holder, p.provs, p.gold]) });
      });
      return rows;
    });
    for (const row of result) {
      expect(row.delegated, row.kind).toBe(0);
      expect(row.populated, row.kind).toBe(true);
      expect(row.stable, row.kind).toBe(true);
    }
  });

test('the county ruler replaces the generated local lord and remains authoritative after transfer',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = p.provinceId;
      const oldContact = FB.makeCharacter(s, { role:'lord', name:'Old Patron', station:3,
        born:s.date.year - 40, culture:s.chars[p.charId].culture,
        religion:s.chars[p.charId].religion, traits:[] });
      s.roles.lord = oldContact.id;
      p.tier = 2;
      p.gentryGeneration = 0;
      p.lineDepth = 2;
      const ruler = FB.getRole(s, 'lord', true);
      const grantor = FB.rankElevationStatus(s, null, { route:'barony' }).grantorId;
      const target = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && id !== FB.settlementCountyHolder(s, pid) &&
          s.realms[id].alive && s.realms[id].rank >= 1 &&
          FB.realmRulerCharacterSnapshot(s, id);
      }).sort()[0];
      FB.assignSettlementLordship(s, pid, 1, p.charId);
      const before = JSON.stringify(s.settlementLordships.counties[pid]);
      FB.transferProvince(s, pid, target);
      return { oldAlive:!s.chars[oldContact.id].dead,
        retired:oldContact.role !== 'lord', originalIsRuler:ruler.id !== oldContact.id,
        grantor:grantor, ruler:ruler.id,
        newLord:FB.getRole(s, 'lord', false).id,
        expected:FB.realmRulerCharacterSnapshot(s, target).id,
        indexed:s.roles.lord, held:FB.settlementHolder(s, pid, 1), player:p.charId,
        preserved:before === JSON.stringify(s.settlementLordships.counties[pid]) };
    });
    expect(result.oldAlive).toBe(true);
    expect(result.retired).toBe(true);
    expect(result.originalIsRuler).toBe(true);
    expect(result.grantor).toBe(result.ruler);
    expect(result.newLord).toBe(result.expected);
    expect(result.indexed).toBe(result.expected);
    expect(result.held).toEqual({ kind:'character', id:result.player });
    expect(result.preserved).toBe(true);
  });

test('lordships inherit through recorded children and revert on extinction without touching property',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      const me = s.chars[s.player.charId];
      const baron = FB.makeCharacter(s, { name:'Baron', born:820, station:3,
        culture:me.culture, religion:me.religion, traits:[] });
      const child = FB.makeCharacter(s, { name:'Heir', fatherId:baron.id, born:850, station:3,
        culture:me.culture, religion:me.religion, traits:[] });
      baron.childrenIds = [];
      const countyHolder = FB.settlementCountyHolder(s, pid);
      FB.assignSettlementLordship(s, pid, 1, baron.id);
      const founder = FB.settlementLordship(s, pid, 1).founderId;
      const assets = JSON.stringify([s.buildings, s.player.holdings, s.player.manor,
        s.player.enterprises, s.owner, s.holder]);
      FB.killChar(s, baron);
      const inherited = FB.settlementHolder(s, pid, 1);
      const continued = FB.settlementLordship(s, pid, 1).founderId === founder;
      FB.killChar(s, child);
      return { inherited:inherited, child:child.id, continued:continued,
        reverted:FB.settlementHolder(s, pid, 1), countyHolder:countyHolder,
        removed:FB.settlementLordship(s, pid, 1) === null,
        property:assets === JSON.stringify([s.buildings, s.player.holdings,
          s.player.manor, s.player.enterprises, s.owner, s.holder]) };
    });
    expect(result.inherited).toEqual({ kind:'character', id:result.child });
    expect(result.continued).toBe(true);
    expect(result.reverted).toEqual({ kind:'realm', id:result.countyHolder });
    expect(result.removed).toBe(true);
    expect(result.property).toBe(true);
  });

test('player succession follows the selected heir and grants no county',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = p.provinceId, oldId = p.charId;
      FB.setPlayerTier(s, 3);
      FB.assignSettlementLordship(s, pid, 1, oldId);
      const child = FB.makeCharacter(s, { name:'Successor', fatherId:oldId,
        born:s.date.year - 20, station:3, culture:s.chars[oldId].culture,
        religion:s.chars[oldId].religion, traits:[] });
      const owners = JSON.stringify([s.owner, s.holder, p.provs]);
      const founder = FB.settlementLordship(s, pid, 1).founderId;
      FB.game.succeedTo(child.id);
      return { held:FB.settlementHolder(s, pid, 1), child:child.id,
        family:FB.settlementLordship(s, pid, 1).playerHouse,
        founder:FB.settlementLordship(s, pid, 1).founderId === founder,
        counties:owners === JSON.stringify([s.owner, s.holder, p.provs]) };
    });
    expect(result.held).toEqual({ kind:'character', id:result.child });
    expect(result.family).toBe(true);
    expect(result.founder).toBe(true);
    expect(result.counties).toBe(true);
  });

test('established settlements survive development loss and invalid grants change nothing',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      FB.changeCountyDevelopment(s, pid, 20, 'community');
      const count = FB.settlementVisibleCount(s, pid);
      FB.changeCountyDevelopment(s, pid, -20, 'community');
      const after = FB.settlementVisibleCount(s, pid);
      const before = JSON.stringify(s);
      const rejects = [0, -1, 0.5, 100].map(function (slot) {
        return FB.assignSettlementLordship(s, pid, slot, s.player.charId);
      });
      rejects.push(FB.assignSettlementLordship(s, pid, 1, 'missing'));
      return { count:count, after:after, rejects:rejects,
        unchanged:before === JSON.stringify(s),
        review:FBDATA.techImpactReviews.features.settlement_lordship.mode };
    });
    expect(result.after).toBe(result.count);
    expect(result.rejects).toEqual([false, false, false, false, false]);
    expect(result.unchanged).toBe(true);
    expect(result.review).toBe('none');
  });

test('legacy seat fallback and missing county authority never manufacture a grantor',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = p.provinceId;
      p.tier = 3;
      p.homeSettlement = 0;
      p.manor = { provinceId:pid, settlement:0 };
      delete s.settlementLordships;
      FB.ensureSettlementLordships(s);
      const held = FB.settlementHolder(s, pid, 1);
      const seat = FB.settlementHolder(s, pid, 0);
      const patron = FB.makeCharacter(s, { name:'Unlanded Patron', role:'lord', station:3,
        born:s.date.year - 40, culture:s.chars[p.charId].culture,
        religion:s.chars[p.charId].religion, traits:[] });
      s.roles.lord = patron.id;
      s.holder[pid] = patron.id;
      s.owner[pid] = patron.id;
      FB.invalidateRealmCache();
      const count = Object.keys(s.chars).length;
      const lord = FB.getRole(s, 'lord', true);
      return { held:held, player:p.charId, seatKind:seat.kind,
        lord:lord, unchangedCast:count === Object.keys(s.chars).length,
        cleared:!s.roles.lord, oldContact:!!s.chars[patron.id] };
    });
    expect(result.held).toEqual({ kind:'character', id:result.player });
    expect(result.seatKind).toBe('realm');
    expect(result.lord).toBeNull();
    expect(result.unchangedCast).toBe(true);
    expect(result.cleared).toBe(true);
    expect(result.oldContact).toBe(true);
  });

test('restore repairs dead delegations without RNG and preserves unknown future schemas',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      const me = s.chars[s.player.charId];
      const baron = FB.makeCharacter(s, { name:'Former Baron', born:820, station:3,
        culture:me.culture, religion:me.religion, traits:[] });
      const adopted = FB.makeCharacter(s, { name:'Adopted Heir', born:850, station:3,
        culture:me.culture, religion:me.religion, traits:[] });
      baron.childrenIds = [adopted.id];
      FB.touchFamily();
      FB.assignSettlementLordship(s, pid, 1, baron.id);
      baron.dead = true;
      const rng = JSON.stringify(FB.getRngState());
      FB.ensureSettlementLordships(s);
      const inherited = FB.settlementHolder(s, pid, 1);
      const retained = FB.courtRecordRetained(s, adopted);
      const root = JSON.stringify(s.settlementLordships);
      FB.ensureSettlementLordships(s);
      const stable = root === JSON.stringify(s.settlementLordships);
      const rngStable = rng === JSON.stringify(FB.getRngState());
      s.settlementLordships = { version:99, future:{ keep:true } };
      const future = JSON.stringify(s.settlementLordships);
      const supported = FB.ensureSettlementLordships(s);
      return { inherited:inherited, adopted:adopted.id, stable:stable,
        retained:retained, rngStable:rngStable, supported:supported,
        future:future === JSON.stringify(s.settlementLordships) };
    });
    expect(result.inherited).toEqual({ kind:'character', id:result.adopted });
    expect(result.stable).toBe(true);
    expect(result.retained).toBe(true);
    expect(result.rngStable).toBe(true);
    expect(result.supported).toBe(false);
    expect(result.future).toBe(true);
  });

test('a dead legacy baron keeps the estate pending a playable heir and terminal extinction reverts it',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = p.provinceId;
      p.tier = 3;
      p.dead = true;
      p.homeSettlement = 0;
      p.manor = { provinceId:pid, settlement:0 };
      s.chars[p.charId].dead = true;
      delete s.settlementLordships;
      FB.ensureSettlementLordships(s);
      const held = FB.settlementHolder(s, pid, 1);
      const saved = JSON.stringify(s.settlementLordships);
      FB.ensureSettlementLordships(s);
      const waiting = saved === JSON.stringify(s.settlementLordships);
      FB.settlementLordshipsPlayerSuccession(s, p.charId, null);
      return { held:held, player:p.charId, waiting:waiting,
        reverted:FB.settlementHolder(s, pid, 1),
        count:FB.settlementCountyHolder(s, pid) };
    });
    expect(result.held).toEqual({ kind:'character', id:result.player });
    expect(result.waiting).toBe(true);
    expect(result.reverted).toEqual({ kind:'realm', id:result.count });
  });
