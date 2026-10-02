'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/authority.js',
  'js/politics.js', 'js/lordships.js', 'js/world.js', 'js/model.js',
  'js/economy.js', 'js/armies.js', 'js/wars.js', 'js/council.js', 'js/papacy.js',
  'js/actions.js', 'js/agency.js', 'js/institutions.js', 'js/settlement.js',
  'js/population.js', 'js/modifiers.js', 'js/technology.js', 'js/treasury.js',
  'js/save.js', 'js/save_v4.js', 'js/main.js', 'js/util.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'data/bookmarks.js', 'data/map_data.js', 'data/counties.js',
  'data/settlements.js', 'data/settlements_real.js', 'data/economy.js',
  'data/cultures.js', 'data/technology.js', 'data/political_institutions.js',
  'data/eras.js', 'js/governments.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

// Bookmark selection belongs to this spec; keep the shared start journey stable.
async function startPoliticalGame(page, testInfo, bookmark) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const code = 'POLITICAL-' + bookmark + '-serf-london-f-Ada';
  await page.locator('#ng-seed').fill(code);
  await expect(page.locator('#ng-seed')).toHaveValue(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true })).toBeVisible();
  await expect(page.getByRole('button', { name:'Begin', exact:true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.uiPrefs.hideTips = true;
    FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(bookmark);
}

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' political snapshots preserve legacy facts, state, RNG and detached results', async function ({ page }, testInfo) {
    await startPoliticalGame(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, q = FB.political, pid = s.player.provinceId;
      const rid = FB.settlementCountyHolder(s, pid), ref = { kind:'realm', id:rid };
      const me = { kind:'character', id:s.player.charId };
      const oldRuler = FB.realmRulerCharacterSnapshot(s, rid);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const revisions = [FB.realmStateRevision(), FB.settlementLordshipRevision(), FB.militaryInputRevision];
      function read() {
        return { actor:q.actor(s, ref), place:q.place(s, { kind:'county', id:pid }),
          site:q.place(s, { kind:'settlement', provinceId:pid, settlement:0 }),
          relation:q.relationship(s, me, ref), offices:q.offices(s, ref),
          personal:q.offices(s, me), role:q.role(s, 'lord', { provinceId:pid }),
          direct:q.territory(s, ref, 'direct'), subtree:q.territory(s, ref, 'subtree'),
          sovereign:q.territory(s, ref, 'sovereign') };
      }
      const first = read(), second = read();
      const parity = first.place.ownerId === s.owner[pid] && first.place.holderId === rid &&
        first.actor.characterId === (oldRuler && oldRuler.id || null) &&
        first.actor.realmId === rid && first.actor.rank === s.realms[rid].rank &&
        JSON.stringify(first.direct) === JSON.stringify(FB.realmHeldCounties(s, rid)) &&
        JSON.stringify(first.subtree) === JSON.stringify(FB.realmTerritory(s, rid)) &&
        JSON.stringify(first.sovereign) === JSON.stringify(FB.realmProvinces(s, FB.topRealm(s, rid))) &&
        JSON.stringify(first.site.holder) === JSON.stringify(FB.settlementHolder(s, pid, 0));
      first.direct.push('invalid-county'); first.actor.ref.id = 'invalid-realm';
      first.place.ruler.ref.id = 'invalid-ruler'; first.relation.liegeChain.push('invalid-liege');
      first.site.holder.id = 'invalid-holder';
      if (first.offices.length) first.offices[0].holder.id = 'invalid-officeholder';
      const detached = JSON.stringify(read()) === JSON.stringify(second);
      return { parity:parity, detached:detached, unchanged:before === JSON.stringify(s),
        rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter(),
        revisions:JSON.stringify(revisions) === JSON.stringify([
          FB.realmStateRevision(), FB.settlementLordshipRevision(), FB.militaryInputRevision]),
        home:FB.homeCountyAuthority(s), expectedHome:{ provinceId:pid, realmId:rid,
          characterId:oldRuler && oldRuler.id || null },
        invalid:[q.actor(s, { kind:'realm', id:'missing' }), q.place(s, { kind:'county', id:'missing' }),
          q.role(s, 'lord'), q.office(s, { kind:'office' })],
        invalidScope:q.territory(s, ref, 'unspecified'),
        denied:q.permission(s, ref, 'invented_power', {}).allowed };
    });
    expect(result.parity).toBe(true); expect(result.detached).toBe(true);
    expect(result.unchanged).toBe(true); expect(result.rng).toBe(true);
    expect(result.uid).toBe(true); expect(result.revisions).toBe(true);
    expect(result.home).toEqual(result.expectedHome);
    expect(result.invalid).toEqual([null, null, null, null]);
    expect(result.invalidScope).toEqual([]); expect(result.denied).toBe(false);
  });

  test(bookmark + ' offices remain separate from land and reflect appointment, vacancy and conversion in the same turn', async function ({ page }, testInfo) {
    await startPoliticalGame(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, q = FB.political, c = s.chars[p.charId];
      const ref = { kind:'character', id:c.id }, pid = p.provinceId;
      p.tier = 2; c.religion = 'catholic';
      c.bishopric = { seeProvinceId:pid, appointedTurn:s.turn, appointerKind:'legacy' };
      p.familyOffices = { steward:c.id };
      c.spouseId = 'missing-spouse';
      const land = JSON.stringify([s.owner, s.holder, p.provs]), tier = p.tier, station = FB.stationOf(c);
      const turn = s.turn, before = JSON.stringify(s), rng = FB.getRngState();
      const rows = q.offices(s, ref), bishop = rows.find(function (row) { return row.ref.officeId === 'bishop'; });
      const family = rows.find(function (row) { return row.ref.source === 'player.familyOffices'; });
      const roundTrip = JSON.stringify(q.office(s, bishop.ref)) === JSON.stringify(bishop);
      bishop.terms.seeProvinceId = 'changed-copy';
      const detached = q.office(s, bishop.ref).terms.seeProvinceId === pid;
      const spouse = q.role(s, 'spouse');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      delete p.familyOffices.steward;
      const removed = q.office(s, family.ref);
      c.religion = 'orthodox';
      const converted = q.offices(s, ref).some(function (row) { return row.ref.officeId === 'bishop'; });
      c.religion = 'catholic';
      const head = FB.religiousHeadSnapshot(s, 'catholic'), office = FB.faithOfficeId('catholic', s);
      const headRef = { kind:'realm', id:head.id };
      const wasHead = q.offices(s, headRef).some(function (row) { return row.ref.source === 'religiousHeads'; });
      s.religiousHeads[office] = null;
      const vacant = q.offices(s, headRef).some(function (row) { return row.ref.institutionId === 'religion:' + office; });
      // An exact host commission gives no county or realm to its commander.
      const patron = FB.settlementCountyHolder(s, pid), sovereign = FB.topRealm(s, patron);
      s.realms[sovereign].war = { enemy:head.id };
      s.wars = { queryWar:{ id:'queryWar', status:'active', attacker:sovereign,
        defender:head.id, legacyOwner:sovereign, musterPool:100, startedTurn:s.turn } };
      s.armies = [{ id:'query-host', realm:sovereign }];
      p.militaryCommand = { charId:c.id, patronRealmId:patron, sovereignRealmId:sovereign, hostId:'query-host' };
      const command = q.offices(s, ref).find(function (row) { return row.ref.officeId === 'military_command'; });
      s.armies = [];
      const expired = q.offices(s, ref).some(function (row) { return row.ref.officeId === 'military_command'; });
      return { bishop:!!bishop, roundTrip:roundTrip, detached:detached, pure:pure,
        spouse:spouse, staleSpouse:c.spouseId, removed:removed, converted:converted,
        wasHead:wasHead, vacant:vacant, commandScope:command && command.scope,
        expired:expired, realm:q.actor(s, ref).realmId,
        land:land === JSON.stringify([s.owner, s.holder, p.provs]),
        station:station === FB.stationOf(c), tier:tier === p.tier, sameTurn:turn === s.turn };
    });
    expect(result).toEqual({ bishop:true, roundTrip:true, detached:true, pure:true,
      spouse:null, staleSpouse:'missing-spouse', removed:null, converted:false,
      wasHead:true, vacant:false, commandScope:{ kind:'host', id:'query-host' }, expired:false,
      realm:null, land:true, station:true, tier:true, sameTurn:true });
  });

  test(bookmark + ' current ruler, liege and holder reads survive same-turn changes and save restore', async function ({ page }, testInfo) {
    await startPoliticalGame(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, q = FB.political, p = s.player, pid = p.provinceId;
      const rid = FB.settlementCountyHolder(s, pid), ref = { kind:'realm', id:rid };
      FB.ensureRealmSuccession(s, rid);
      const old = FB.materializeRealmRuler(s, rid);
      const compact = JSON.parse(JSON.stringify(s));
      delete compact.realms[rid].succession.members[compact.realms[rid].succession.rulerMemberId].charId;
      const compactBefore = JSON.stringify(compact), compactActor = q.actor(compact, ref);
      const compactPure = compactBefore === JSON.stringify(compact);
      q.territory(s, ref, 'subtree'); // warm the existing hierarchy index
      p.liege = rid;
      const relation = q.relationship(s, { kind:'character', id:p.charId }, ref);
      p.liege = null; s.realms[rid].liege = 'player';
      const reparented = q.relationship(s, { kind:'character', id:p.charId }, ref);
      // Query current Council records without councilEnsure or a territory rewrite.
      p.tier = 6; s.council = { authority:60, seats:{} };
      const seat = FB.councilSeats(s)[0]; s.council.seats[seat.id] = rid;
      const council = q.offices(s, ref).some(function (row) { return row.ref.source === 'council.seats'; });
      s.realms[rid].liege = null;
      const dismissed = q.offices(s, ref).some(function (row) { return row.ref.source === 'council.seats'; });
      p.tier = 2; s.dev[pid] = 8; FB.rememberSettlementSites(s, pid);
      const grantSite = FB.settlementGrantSites(s, pid, rid)[0];
      const reviewed = FB.settlementGrantQuote(s, pid, grantSite.settlement, p.charId, rid);
      const next = FB.makeCharacter(s, { name:'Next Ruler', station:2, born:s.date.year - 30,
        culture:old.culture, religion:old.religion, traits:[] });
      // This existing assignment boundary registers the new ruler in the shared index.
      s.realms[rid].generated = true;
      const assigned = !!FB.assignRealmRulerCharacter(s, rid, next.id);
      s.realms[rid].ruler.generation = (s.realms[rid].ruler.generation || 1) + 1;
      const successor = q.actor(s, ref);
      const staleBefore = JSON.stringify(s), staleRng = FB.getRngState();
      const staleRejected = !FB.confirmSettlementGrant(s, reviewed);
      const stalePure = staleBefore === JSON.stringify(s) && staleRng === FB.getRngState();
      const freshQuote = FB.settlementGrantQuote(s, pid, grantSite.settlement, p.charId, rid);
      const previous = q.actor(s, { kind:'character', id:old.id });
      const destination = Object.keys(s.realms).find(function (id) {
        return id !== rid && id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
          FB.realmTerritory(s, id).length > 1;
      });
      s.roles.lord = old.id;
      const turn = s.turn;
      FB.transferProvince(s, pid, destination);
      const transferred = q.place(s, { kind:'county', id:pid });
      const freshRole = q.role(s, 'lord', { provinceId:pid });
      const direct = q.territory(s, { kind:'realm', id:destination }, 'direct');
      // Restore the actual v3 envelope into a new state at the same turn.
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const restored = FB.state, before = JSON.stringify(restored), rng = FB.getRngState();
      const place = q.place(restored, { kind:'county', id:pid });
      const afterRestore = q.territory(restored, { kind:'realm', id:destination }, 'direct');
      return { compact:compactActor.characterId === null && !!compactActor.rulerMemberId && compactPure,
        directLiege:relation.directLiege, directVassal:reparented.directVassal,
        council:council, dismissed:dismissed, assigned:assigned,
        successor:successor.characterId === next.id && successor.rulerGeneration === s.realms[rid].ruler.generation,
        stale:!!reviewed && staleRejected && stalePure && freshQuote.grantorId === next.id,
        previous:previous.realmId, transferred:transferred.ownerId === destination && transferred.holderId === destination,
        role:freshRole.realmId === destination, contains:direct.indexOf(pid) >= 0,
        version:payload.v, replaced:restored !== s, sameTurn:restored.turn === turn,
        restore:place.ownerId === destination && place.holderId === destination && afterRestore.indexOf(pid) >= 0,
        pure:before === JSON.stringify(restored) && rng === FB.getRngState(),
        noSavedQueries:!Object.prototype.hasOwnProperty.call(restored, 'political') };
    });
    expect(result).toEqual({ compact:true, directLiege:true, directVassal:true, council:true,
      dismissed:false, assigned:true, successor:true, stale:true, previous:null, transferred:true, role:true,
      contains:true, version:4, replaced:true, sameTurn:true, restore:true, pure:true, noSavedQueries:true });
  });

  test(bookmark + ' grant permission, quote and confirmation retain terms and invalidate once', async function ({ page }, testInfo) {
    await startPoliticalGame(page, testInfo, bookmark);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = p.provinceId, me = s.chars[p.charId];
      p.tier = 4; p.provs = [pid]; p.liege = null; p.gold = 10000;
      s.owner[pid] = 'player'; s.holder[pid] = 'player'; s.dev[pid] = 8;
      FB.foundPlayerRealm(s); FB.rememberSettlementSites(s, pid);
      FB.invalidateSettlementLordships(s, pid);
      const c = FB.makeCharacter(s, { name:'Query Grantee', station:2, born:s.date.year - 30,
        culture:me.culture, religion:me.religion, traits:[] });
      c.homeProvinceId = pid;
      const sites = FB.settlementGrantSites(s, pid, 'player'), slot = sites[sites.length - 1].settlement;
      const ref = { kind:'realm', id:'player' }, context = { provinceId:pid, settlement:slot, recipientId:c.id };
      const before = JSON.stringify(s), rng = FB.getRngState();
      const permission = FB.political.permission(s, ref, 'grant_settlement', context);
      const quote = FB.settlementGrantQuote(s, pid, slot, c.id, 'player');
      const fiscal = FB.settlementFiscalProjection(s, pid, slot).amounts;
      const terms = quote.lostRevenue === fiscal.gross + fiscal.national && quote.grantorId === me.id &&
        quote.recipientId === c.id && quote.provinceId === pid && quote.settlement === slot;
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      const badScope = FB.political.permission(s, ref, 'grant_settlement',
        { provinceId:pid, settlement:0, recipientId:c.id }).allowed;
      const self = FB.political.permission(s, ref, 'grant_settlement',
        { provinceId:pid, settlement:slot, recipientId:me.id }).allowed;
      const missing = FB.political.permission(s, ref, 'grant_settlement', {}).allowed;
      const revisions = [FB.realmStateRevision(), FB.settlementLordshipRevision(), FB.militaryInputRevision];
      const badQuote = Object.assign({}, quote, { grantorId:'stale-ruler' });
      const rejected = FB.confirmSettlementGrant(s, badQuote);
      const rejectionPure = before === JSON.stringify(s) && rng === FB.getRngState();
      const rejectionRevision = JSON.stringify(revisions) === JSON.stringify([
        FB.realmStateRevision(), FB.settlementLordshipRevision(), FB.militaryInputRevision]);
      const gold = p.gold, turn = s.turn;
      const committed = FB.confirmSettlementGrant(s, quote);
      const deltas = [FB.realmStateRevision() - revisions[0],
        FB.settlementLordshipRevision() - revisions[1], FB.militaryInputRevision - revisions[2]];
      const after = JSON.stringify(s), again = FB.confirmSettlementGrant(s, quote);
      const place = FB.political.place(s, { kind:'settlement', provinceId:pid, settlement:slot });
      const militaryBeforeBuilding = FB.militaryInputRevision;
      FB.invalidateBuildingIndex(s, pid);
      const standaloneBuilding = FB.militaryInputRevision - militaryBeforeBuilding;
      return { allowed:permission.allowed, terms:terms, pure:pure, badScope:badScope,
        self:self, missing:missing, rejected:rejected, rejectionPure:rejectionPure,
        rejectionRevision:rejectionRevision, committed:committed, deltas:deltas,
        again:again, repeatPure:after === JSON.stringify(s), holder:place.holder,
        standaloneBuilding:standaloneBuilding, expected:{ kind:'character', id:c.id }, county:place.holderId, owner:place.ownerId,
        costs:gold === p.gold && turn === s.turn && rng === FB.getRngState(), station:c.station };
    });
    expect(result.allowed).toBe(true); expect(result.terms).toBe(true); expect(result.pure).toBe(true);
    expect(result.badScope).toBe(false); expect(result.self).toBe(false); expect(result.missing).toBe(false);
    expect(result.rejected).toBe(false); expect(result.rejectionPure).toBe(true); expect(result.rejectionRevision).toBe(true);
    expect(result.committed).toBe(true); expect(result.deltas).toEqual([1, 1, 1]);
    expect(result.standaloneBuilding).toBe(1);
    expect(result.again).toBe(false); expect(result.repeatPure).toBe(true);
    expect(result.holder).toEqual(result.expected); expect(result.county).toBe('player');
    expect(result.owner).toBe('player'); expect(result.costs).toBe(true); expect(result.station).toBe(3);
  });
}
