'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/systems.js', 'data/eras.js', 'data/starts.js',
  'data/economy.js', 'data/actions.js', 'data/technology.js', 'data/events_peasant.js',
  'data/bookmark_476.js', 'data/bookmark_493.js', 'data/bookmarks.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_gaul_iberia.js',
  'data/bookmark_476_africa.js', 'data/political_institutions.js',
  'js/systems.js', 'js/events.js', 'js/actions.js', 'js/economy.js',
  'js/main.js', 'js/model.js', 'js/station.js', 'js/progression.js', 'js/travel.js',
  'js/institutions.js', 'js/religion.js', 'js/save.js', 'js/save_v4.js',
  'js/technology.js', 'js/fiscal.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startBaseline476 } = require('../support/game/476-wider');
const { startHistoricalGame } = require('../support/game/historical-start');

async function start(page, testInfo, options) {
  options = options || {};
  const bookmark = options.bookmark || '476';
  const scenario = options.scenario || 'colonus_476';
  const province = options.province || 'ravenna';
  await startHistoricalGame(page, testInfo, { bookmark:bookmark,
    code:'COLONATE-' + bookmark + '-' + scenario + '-' + province + '-m-Marcus-' +
      (options.family || 'standard') + '-0-roman.nicene' }, !!options.crazygames);
}

for (const site of [
  { province:'ravenna', archetype:'roman_estate' },
  { province:'laon', archetype:'roman_gaul' },
  { province:'tunis', archetype:'roman_africa' }
]) {
  test(site.province + ' opens a bound Roman household without granting estate or county ownership',
    async function ({ page }, testInfo) {
      await start(page, testInfo, { province:site.province, family:'established' });
      const result = await page.evaluate(function () {
        const s = FB.state, p = s.player, me = s.chars[p.charId];
        const t = FB.colonateTenure(s), owner = FB.colonatePossessor(s);
        const before = JSON.stringify(s), rng = JSON.stringify(FB.getRngState()), uid = FB.getUidCounter();
        const status = FB.colonateReleaseStatus(s, 'military_service');
        const view = FB.tenureView(s);
        return { archetype:t.archetypeId, tier:p.tier, career:me.career.profession,
          manorial:FB.systemEnabled(s, 'manorial_tenure'), colonate:FB.systemEnabled(s, 'colonate'),
          ownerSeparate:owner.id !== p.charId && owner.id !== (s.roles && s.roles.lord),
          ownerHome:FB.characterResidence(s, owner), ownerId:owner.id, viewOwner:view.lordId,
          owned:(p.provs || []).length, plots:FB.landPlots(s).length,
          bound:[me.spouseId].concat(me.childrenIds).filter(Boolean).every(function (id) {
            return FB.isUnfreeCharacter(s, s.chars[id]);
          }), duties:t.duties.map(function (d) { return d.id; }),
          rights:t.rights, blocked:!status.ready, noStandingBypass:!FB.standingProgression(s),
          noOrdinationBypass:!FB.setCareer(s, me, 'priest'),
          review:FB.instantStatus(s, 'review_colonate').shown,
          medievalHidden:!FB.instantStatus(s, 'review_serf_tenure').shown,
          validation:FB.validateActionData(), tenureData:!!FB.validateTenureData(),
          tech:['colonate_tenure','colonate_military_release','colonate_ordination_release','colonate_flight']
            .map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
          pure:before === JSON.stringify(s) && rng === JSON.stringify(FB.getRngState()) && uid === FB.getUidCounter()
        };
      });
      expect(result).toMatchObject({ archetype:site.archetype, tier:0, career:'colonus',
        manorial:false, colonate:true, ownerSeparate:true, ownerHome:site.province,
        owned:0, plots:0, bound:true, blocked:true, review:true, medievalHidden:true,
        noStandingBypass:true, noOrdinationBypass:true, validation:[], tenureData:true, pure:true,
        duties:['estate_crop_share','estate_accounts'], rights:['estate_dwelling','estate_cultivation'],
        tech:['none','none','none','none'] });
      expect(result.viewOwner).toBe(result.ownerId);
    });
}

test('tenure behavior, career targets, flight events and review deeds resolve from data',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], owner = FB.colonatePossessor(s);
      const rules = FB.colonateRules(), military = FB.colonateReleaseRoute('military_service');
      const flight = FB.colonateReleaseRoute('flight'), system = FBDATA.systems.colonate;
      const sees = FBDATA.systems.episcopal_sees;
      sees.providesOrdination = false;
      const ordinationBlocked = !FB.systems.ordinationEnabled(s);
      sees.providesOrdination = true;
      const ordinationEnabled = !!FB.systems.ordinationEnabled(s);
      // A differently named system retains the declared tenure behavior.
      FBDATA.systems.fixture_estate = Object.assign({}, system, { id:'fixture_estate', defaultEnabled:true });
      delete FBDATA.systems.colonate;
      FBDATA.tenureArchetypes[s.player.tenure.archetypeId].systems = ['fixture_estate'];
      const enabled = FB.tenureEnabled(s) && FB.colonateTenure(s) === s.player.tenure;
      rules.reviewDeedId = 'review_serf_tenure';
      const deed = FB.colonateReviewDeed().id;
      flight.eventId = 'flee_serfdom';
      const event = FB.colonateFlightEvent().id;
      const stillBlocked = !FB.setCareer(s, me, 'priest');
      rules.blockedCareerRoles = [];
      const permitted = FB.setCareer(s, me, 'priest');
      // Restore the bound household's career before reviewing release.
      FB.setCareer(s, me, 'colonus');
      FB.adjustStanding(s, { kind:'character', id:owner.id }, 50, 'fixture:consent');
      me.skills.mar = 8;
      military.careerId = 'craftsman'; military.careerRank = 'apprentice';
      const oldQuote = FB.colonateReleaseStatus(s, military.id).quote;
      military.careerRank = 'master';
      const before = JSON.stringify(s), rng = FB.getRngState();
      const stale = !FB.resolveColonateRelease(s, military.id, oldQuote) &&
        before === JSON.stringify(s) && rng === FB.getRngState();
      const quote = FB.colonateReleaseStatus(s, military.id);
      const released = !!FB.resolveColonateRelease(s, military.id, quote.quote);
      return { enabled:!!enabled, deed:deed, event:event, stillBlocked:stillBlocked, permitted:permitted,
        ordinationBlocked:ordinationBlocked, ordinationEnabled:ordinationEnabled,
        stale:stale, released:released, career:me.career.profession, rank:me.career.rank };
    });
    expect(result).toEqual({ enabled:true, deed:'review_serf_tenure', event:'flee_serfdom',
      stillBlocked:true, permitted:true, ordinationBlocked:true, ordinationEnabled:true,
      stale:true, released:true, career:'craftsman', rank:'master' });
  });

test('tenure declarations reject unknown careers, roles, deeds and flight events',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const def = FBDATA.systems.colonate, original = JSON.parse(JSON.stringify(def.tenure));
      const edits = [
        function (t) { t.reviewDeedId = 'unknown'; },
        function (t) { t.blockedCareerRoles = ['unknown']; },
        function (t) { t.releaseRoutes[0].careerId = 'unknown'; },
        function (t) { t.releaseRoutes[0].careerRank = ''; },
        function (t) { t.releaseRoutes[2].eventId = 'unknown'; },
        function (t) { t.releaseRoutes.push(t.releaseRoutes[0]); },
        function (t) { t.estatePossessor = 'invalid'; }
      ];
      const rejected = edits.map(function (edit) {
        def.tenure = JSON.parse(JSON.stringify(original)); edit(def.tenure);
        return FB.systems.validate().length > 0;
      });
      def.tenure = original;
      return { rejected:rejected, valid:FB.systems.validate() };
    });
    expect(result).toEqual({ rejected:[true,true,true,true,true,true,true], valid:[] });
  });

test('estate duties use saved dates, charge once, and retain the possessor across county transfers',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, t = FB.colonateTenure(s), p = s.player;
      const owner = t.landownerId;
      // Change public control without changing a private estate.
      const oldAuthority = FB.serfHomeAuthority(s);
      s.holder[p.provinceId] = 'croatia'; s.owner[p.provinceId] = 'croatia';
      const politicalReview = FB.noteSerfHomeTransition(s, 'county_transfer', oldAuthority, FB.serfHomeAuthority(s));
      s.eventQueue = [];
      t.duties[0].nextDueTurn = s.turn;
      t.duties[1].nextDueTurn = s.turn + 90;
      FB.refreshSerfTenureDueCache(s, t);
      p.gold = 100;
      FB.tenureDay(s); FB.tenureDay(s);
      const rows = s.eventQueue.filter(function (e) { return e.id === 'colonus_crop_due'; });
      const event = FB.eventById('colonus_crop_due'), context = rows[0].ctx;
      p.gold = 0;
      const unpaidState = JSON.stringify(s);
      const underfunded = FB.resolveEventOption(s, event, event.options[1], context) === false &&
        unpaidState === JSON.stringify(s);
      p.gold = 100;
      const before = p.gold;
      const receipt = FB.resolveEventOption(s, event, event.options[1], context);
      const repeat = FB.resolveEventOption(s, event, event.options[1], context);
      const frozen = JSON.stringify({ tenure:t, owner:s.owner, holder:s.holder });
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { politicalReview:politicalReview, noManorialReview:!s.player.tenureTransition,
        ownerStable:owner === FB.state.player.tenure.landownerId, queued:rows.length,
        underfunded:underfunded, paid:!!receipt, repeated:repeat, spent:before - p.gold,
        next:t.duties[0].nextDueTurn, turn:s.turn,
        restored:frozen === JSON.stringify({ tenure:FB.state.player.tenure,
          owner:FB.state.owner, holder:FB.state.holder }) };
    });
    expect(result).toMatchObject({ politicalReview:false, noManorialReview:true,
      ownerStable:true, queued:1, underfunded:true, paid:true, repeated:false, spent:3, restored:true });
    expect(result.next).toBe(result.turn + 360);
  });

for (const route of ['purchase','military_service','ordination']) {
  test(route + ' releases the household once, records lawful history and conveys no land',
    async function ({ page }, testInfo) {
      await start(page, testInfo, { family:'established' });
      const result = await page.evaluate(function (route) {
        const s = FB.state, p = s.player, me = s.chars[p.charId], owner = FB.colonatePossessor(s);
        FB.adjustStanding(s, { kind:'character', id:owner.id }, 50, 'fixture:consent');
        me.skills.mar = 8; me.skills.lea = 8; p.piety = 100; p.gold = 10000;
        const members = FB.freedomCoveredCharacterIds(s, []);
        const collateral = FB.parentsOf(s, me).concat(FB.siblingsOf(s, me)).map(function (c) { return c.id; });
        const quote = route === 'purchase' ? FB.freedomPurchaseQuote(s) : FB.colonateReleaseStatus(s, route);
        const before = p.gold, ownerMap = JSON.stringify(s.owner);
        const released = route === 'purchase' ? FB.resolveSerfFreedom(s, { route:route })
          : FB.resolveColonateRelease(s, route, quote.quote);
        const again = route === 'purchase' ? FB.resolveSerfFreedom(s, { route:route })
          : FB.resolveColonateRelease(s, route, quote.quote);
        const saved = JSON.parse(FB.save.serialize());
        const rng = JSON.stringify(FB.getRngState()), uid = FB.getUidCounter();
        FB.save.restore(saved);
        const restored = FB.state;
        return { released:!!released, again:again, spent:before - p.gold,
          expectedCost:route === 'purchase' ? quote.price : 0,
          tier:restored.player.tier, ended:restored.player.tenure.status,
          route:restored.player.familyFreedom.first.route, lawful:restored.player.familyFreedom.first.lawful,
          career:restored.player.profession,
          noLand:ownerMap === JSON.stringify(restored.owner) && !FB.landPlots(restored).length,
          familyFree:members.every(function (id) { return !FB.isUnfreeCharacter(restored, restored.chars[id]); }),
          collateralBound:collateral.every(function (id) { return FB.isUnfreeCharacter(restored, restored.chars[id]); }),
          historyRestored:JSON.stringify(saved.state.player.familyFreedom) === JSON.stringify(restored.player.familyFreedom),
          rngStable:rng === JSON.stringify(FB.getRngState()), uidStable:uid === FB.getUidCounter() };
      }, route);
      expect(result).toMatchObject({ released:true, again:false, tier:1, ended:'closed',
        route:route, lawful:true, noLand:true, familyFree:true, collateralBound:true,
        historyRestored:true, rngStable:true, uidStable:true });
      expect(result.spent).toBe(result.expectedCost);
      expect(result.career).toBe(route === 'military_service' ? 'soldier' : route === 'ordination' ? 'priest' : 'colonus');
    });
}

test('changed consent, bishop, family, custody and disabled systems reject stale release without mutation',
  async function ({ page }, testInfo) {
    await start(page, testInfo, { family:'established' });
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, me = s.chars[p.charId], owner = FB.colonatePossessor(s);
      FB.adjustStanding(s, { kind:'character', id:owner.id }, 50, 'fixture:consent');
      me.skills.mar = 8; me.skills.lea = 8; p.piety = 100;
      const military = FB.colonateReleaseStatus(s, 'military_service').quote;
      const church = FB.colonateReleaseStatus(s, 'ordination').quote;
      function refused(route, quote) {
        const before = JSON.stringify(s), rng = JSON.stringify(FB.getRngState());
        return FB.resolveColonateRelease(s, route, quote) === false &&
          before === JSON.stringify(s) && rng === JSON.stringify(FB.getRngState());
      }
      owner.dead = true;
      const dead = refused('military_service', military); owner.dead = false;
      p.flags.in_prison = true;
      const custody = refused('military_service', military); delete p.flags.in_prison;
      const oldPiety = p.piety; p.piety = 0;
      const piety = refused('ordination', church); p.piety = oldPiety;
      FB.adjustStanding(s, { kind:'character', id:owner.id }, -100, 'fixture:refusal');
      const consent = refused('military_service', military);
      FB.adjustStanding(s, { kind:'character', id:owner.id }, 100, 'fixture:consent');
      const bishop = FB.religiousOfficeSnapshot(s, 'ravenna_nicene_bishop');
      bishop.dead = true; const bishopGone = refused('ordination', church); bishop.dead = false;
      const child = s.chars[me.childrenIds[0]];
      child.dead = true; const family = refused('military_service', military); child.dead = false;
      p.tenure.revision++; const revision = refused('military_service', military); p.tenure.revision--;
      const bm = FB.bookmark(s.start.id), systems = bm.systems;
      bm.systems = { disable:['colonate'] };
      const disabled = refused('military_service', military) && !FB.activeSerfTenure(s) &&
        FB.ensureSerfTenure(s, 'legacy_repair') === null && !FB.instantStatus(s, 'review_colonate').shown;
      bm.systems = systems;
      return { dead:dead, custody:custody, piety:piety, consent:consent,
        bishopGone:bishopGone, family:family, revision:revision, disabled:disabled };
    });
    expect(result).toEqual({ dead:true, custody:true, piety:true, consent:true,
      bishopGone:true, family:true, revision:true, disabled:true });
  });

for (const success of [true, false]) {
  test('Roman flight ' + (success ? 'escapes without lawful freedom' : 'returns the household to its dues'),
    async function ({ page }, testInfo) {
      await start(page, testInfo, { family:'established' });
      const result = await page.evaluate(function (success) {
        const s = FB.state, p = s.player, me = s.chars[p.charId];
        p.gold = 10;
        const quote = FB.colonateReleaseStatus(s, 'flight');
        const requested = FB.resolveColonateRelease(s, 'flight', quote.quote);
        const row = s.eventQueue.find(function (e) { return e.id === 'colonus_flight'; });
        const ev = FB.eventById(row.id), health = me.health, before = p.gold;
        const saved = JSON.parse(FB.save.serialize());
        FB.save.restore(saved);
        const restored = FB.state, restoredRow = restored.eventQueue.find(function (e) { return e.id === row.id; });
        // Isolate the existing seeded branch boundary; no simulation runs in Node.
        const rng = FB.rng;
        FB.rng = function () { return success ? 0 : 0.999; };
        let receipt;
        try { receipt = FB.resolveEventOption(restored, ev, ev.options[0], restoredRow.ctx); }
        finally { FB.rng = rng; }
        const again = FB.resolveEventOption(restored, ev, ev.options[0], restoredRow.ctx);
        return { requested:requested, receipt:!!receipt, again:again,
          tier:restored.player.tier, tenure:restored.player.tenure.status,
          lawful:restored.player.familyFreedom && restored.player.familyFreedom.first.lawful,
          spent:before - restored.player.gold, damage:health - restored.chars[restored.player.charId].health,
          cooled:!FB.colonateReleaseStatus(restored, 'flight').ready,
          originalHome:s.player.provinceId, home:restored.player.provinceId,
          text:FB.eventText(restored, restored.player.charId, ev, 'text', restoredRow.ctx) };
      }, success);
      expect(result).toMatchObject({ requested:true, receipt:true, again:false,
        tier:success ? 1 : 0, tenure:success ? 'closed' : 'active',
        spent:success ? 3 : 0, damage:success ? 0 : 2, cooled:true });
      if (success) { expect(result.lawful).toBe(false); expect(result.home).not.toBe(result.originalHome); }
      else expect(result.home).toBe(result.originalHome);
      expect(result.text).not.toContain('year and a day');
    });
}

test('estate replacement and bound succession preserve dues, ownership and household flight cooldown',
  async function ({ page }, testInfo) {
    await start(page, testInfo, { family:'established' });
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, t = p.tenure, me = s.chars[p.charId];
      const firstOwner = FB.colonatePossessor(s), revision = t.revision;
      const duties = JSON.stringify(t.duties), land = JSON.stringify(s.owner);
      firstOwner.dead = true;
      const before = JSON.stringify(s), rng = JSON.stringify(FB.getRngState());
      const missingOwner = FB.tenureView(s).lordId === null &&
        !FB.colonateReleaseStatus(s, 'military_service').ready;
      const pure = before === JSON.stringify(s) && rng === JSON.stringify(FB.getRngState());
      FB.tenureDay(s);
      const replacement = FB.colonatePossessor(s);
      const quote = FB.colonateReleaseStatus(s, 'flight');
      FB.resolveColonateRelease(s, 'flight', quote.quote);
      const row = s.eventQueue.find(function (e) { return e.id === 'colonus_flight'; });
      const ev = FB.eventById(row.id);
      FB.resolveEventOption(s, ev, ev.options[1], row.ctx);
      const cooldown = p.flags.colonus_flight_until, attempt = p.flags.colonus_flight_resolved_turn;
      const heir = s.chars[me.childrenIds[0]];
      heir.born = s.date.year - 18;
      FB.game.succeedTo(heir.id, { livingAbdication:true });
      const inherited = p.charId === heir.id && p.tier === 0 && p.tenure === t;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.state;
      return { missingOwner:missingOwner, pure:pure,
        replaced:replacement.id !== firstOwner.id && t.revision === revision + 1,
        noPoliticalReview:!p.tenureTransition, inherited:inherited,
        dues:JSON.stringify(restored.player.tenure.duties) === duties,
        owner:restored.player.tenure.landownerId === replacement.id,
        noLand:land === JSON.stringify(restored.owner),
        cooldown:restored.player.flags.colonus_flight_until === cooldown &&
          restored.player.flags.colonus_flight_resolved_turn === attempt &&
          !FB.colonateReleaseStatus(restored, 'flight').ready };
    });
    expect(result).toEqual({ missingOwner:true, pure:true, replaced:true,
      noPoliticalReview:true, inherited:true, dues:true, owner:true, noLand:true, cooldown:true });
  });

test('a paid estate final-service agreement restores and completes without charging twice',
  async function ({ page }, testInfo) {
    await start(page, testInfo, { family:'established' });
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, owner = FB.colonatePossessor(s);
      const target = { kind:'character', id:owner.id };
      FB.adjustStanding(s, target, 60 - FB.standingOf(s, target), 'fixture:terms');
      p.gold = 10000;
      const offer = FB.createFreedomOffer(s, 'petition'), before = p.gold;
      const accepted = FB.acceptFreedomOffer(s, { spendDay:false });
      const paid = before - p.gold;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.state, q = restored.player;
      const savedGold = q.gold;
      restored.turn = q.freedomOffer.serviceEndTurn - 1;
      FB.freedomDay(restored);
      const pending = q.tier === 0 && q.tenure.status === 'active';
      restored.turn++;
      FB.freedomDay(restored); FB.freedomDay(restored);
      return { accepted:!!accepted, owner:offer.lordId === owner.id,
        serviceDays:offer.serviceDays, paid:paid, price:offer.price, pending:pending,
        tier:q.tier, status:q.freedomOffer.status, tenure:q.tenure.status,
        once:q.gold === savedGold, route:q.familyFreedom.first.route,
        lawful:q.familyFreedom.first.lawful, noLand:!FB.landPlots(restored).length };
    });
    expect(result).toMatchObject({ accepted:true, owner:true, serviceDays:90, pending:true,
      tier:1, status:'resolved', tenure:'closed', once:true, route:'manumission', lawful:true, noLand:true });
    expect(result.paid).toBe(result.price);
  });

test('malformed saved estate references, rights and duty dates fail before replacing live state',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const source = JSON.parse(FB.save.serialize());
      return ['owner','rights','due','flight'].map(function (kind) {
        const input = JSON.parse(JSON.stringify(source)), t = input.state.player.tenure;
        if (kind === 'owner') t.landownerId = 'missing-estate-owner';
        if (kind === 'rights') t.rights = ['estate_cultivation'];
        if (kind === 'due') t.duties[0].nextDueTurn = -1;
        if (kind === 'flight') input.state.player.flags.colonus_flight_until = -1;
        const bytes = JSON.stringify(input), live = FB.state;
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        let rejected = false;
        try { FB.save.restore(input); } catch (error) { rejected = true; }
        return rejected && FB.state === live && FB.getRngState() === rng &&
          FB.getUidCounter() === uid && JSON.stringify(input) === bytes;
      });
    });
    expect(result).toEqual([true,true,true,true]);
  });

test('existing free 476 saves restore without creating a tenancy, possessor or freedom history',
  async function ({ page }, testInfo) {
    await startBaseline476(page,testInfo,'COLONATEOLD-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian');
    const result = await page.evaluate(function () {
      const source = JSON.parse(FB.save.serialize()), legacy = JSON.parse(JSON.stringify(source));
      legacy.v = 3; delete legacy.titleIds; delete legacy.authoritySchema; delete legacy.platformSchema; delete legacy.state.start.revision;
      if (legacy.state.authority) delete legacy.state.authority.schema;
      FB.save.restore(legacy);
      const s = FB.state;
      const first = JSON.parse(FB.save.serialize());
      FB.save.restore(first);
      return { tier:s.player.tier, tenure:s.player.tenure || null,
        freedom:s.player.familyFreedom || null,
        people:Object.keys(source.state.chars).sort().join('|') === Object.keys(s.chars).sort().join('|'),
        repeat:JSON.stringify(first.state.player) === JSON.stringify(FB.state.player) };
    });
    expect(result).toEqual({ tier:1, tenure:null, freedom:null, people:true, repeat:true });
  });

for (const bookmark of ['867','1066']) {
  test(bookmark + ' retains medieval tenure, events, lawful release and dormant colonate',
    async function ({ page }, testInfo) {
      await startHistoricalGame(page, testInfo, { bookmark:bookmark,
        code:'COLONATEPARITY-' + bookmark + '-serf-london-m-Osric' }, false);
      const result = await page.evaluate(function () {
        const s = FB.state, t = FB.activeSerfTenure(s), before = JSON.stringify(s);
        const disabled = FB.colonateReleaseStatus(s, 'military_service');
        const pure = before === JSON.stringify(s);
        const original = JSON.stringify(t);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return { archetype:t.archetypeId, duties:t.duties.map(function (d) { return d.id; }),
          noOwner:!t.landownerId, colonate:FB.systemEnabled(s, 'colonate'),
          review:FB.instantStatus(s, 'review_serf_tenure').shown,
          romanHidden:!FB.instantStatus(s, 'review_colonate').shown,
          oldCustom:FB.systemContentEnabled(s, FB.eventById('old_custom_end')),
          flight:FB.systemContentEnabled(s, FB.eventById('flee_serfdom')),
          disabled:!disabled.ready, pure:pure,
          same:original === JSON.stringify(FB.state.player.tenure) };
      });
      expect(result).toEqual({ archetype:'latin_manorial',
        duties:['week_work','demesne_harvest','tithe_sheaf','local_facility_due'],
        noOwner:true, colonate:false, review:true, romanHidden:true,
        oldCustom:true, flight:true, disabled:true, pure:true, same:true });
    });
}

test('the estate route review retains Back navigation and handles stale consent in the mounted sheet',
  async function ({ page }, testInfo) {
    await start(page, testInfo, { crazygames:true });
    await page.evaluate(function () { FB.ui.showRankDetails(); });
    await expect(page.locator('[data-serf-tenure]')).toBeVisible();
    await expect(page.locator('[data-colonate-route="ordination"]')).toBeVisible();
    await page.locator('[data-colonate-route="military_service"]').click();
    await expect(page.locator('#colonus-release-confirm')).toBeDisabled();
    await page.locator('#colonus-release-back').click();
    await expect(page.locator('[data-colonate-route="military_service"]')).toBeFocused();
    await page.evaluate(function () {
      const s = FB.state, owner = FB.colonatePossessor(s);
      s.chars[s.player.charId].skills.mar = 8;
      FB.adjustStanding(s, { kind:'character', id:owner.id }, 50, 'fixture:consent');
    });
    await page.locator('[data-colonate-route="military_service"]').click();
    await expect(page.locator('#colonus-release-confirm')).toBeEnabled();
    await page.evaluate(function () { FB.colonatePossessor(FB.state).dead = true; });
    await page.locator('#colonus-release-confirm').click();
    await expect(page.locator('#colonus-release-confirm')).toBeDisabled();
    expect(await page.evaluate(function () { return FB.state.player.tier; })).toBe(0);
  });
