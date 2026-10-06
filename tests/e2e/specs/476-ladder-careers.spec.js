'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/eras.js', 'data/lexicons.js', 'data/starts.js',
  'data/economy.js', 'data/technology.js', 'data/actions.js',
  'data/bookmark_476.js', 'data/bookmark_476_italy.js',
  'data/bookmark_476_dalmatia_east.js', 'data/bookmark_476_gaul_iberia.js',
  'data/bookmark_476_africa.js', 'data/political_institutions.js',
  'js/station.js', 'js/governments.js', 'js/progression.js', 'js/actions.js',
  'js/economy.js', 'js/events.js', 'js/world.js', 'js/lordships.js',
  'js/authority.js', 'js/treasury.js', 'js/armies.js', 'js/lexicon.js', 'js/institutions.js',
  'js/main.js', 'js/ui_panels.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'js/stories.js', 'js/story_western_court_476.js',
  'js/story_curialis_track_476.js', 'js/story_federate_track_476.js',
  'js/save.js', 'js/save_v4.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, scenario) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(scenario === 'curialis_476'
    ? 'CURIAL476-476-curialis_476-ravenna-m-Marcus-established-0-roman.nicene'
    : 'LADDER476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
    FB.ui.refresh();
  });
}

test('period ladder validates, separates civic standing from land and preserves medieval routes',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'federate_476');
    const result = await page.evaluate(function () {
      const s = FB.state;
      const before = JSON.stringify(s), rng = FB.getRngState();
      const q = FB.rankElevationStatus(s);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      const medieval = ['early_medieval','high_medieval'].map(function (era) {
        const context = { start:{ era:era, defaultGovernment:'territorial' } };
        return [0,1,2,3,4,5,6].map(function (tier) { return FB.station.promotion(tier, context).route; });
      });
      const malformed = JSON.parse(JSON.stringify(FBDATA.stationLadders.late_antique));
      malformed.bands[1].promotion.paths[0].wealth = -1;
      return { pure:pure, route:q.route, blocked:!q.ready, medieval:medieval,
        errors:FB.validateEraData().concat(FB.governments.validate()),
        faults:FB.station.validateLadder(malformed, 'test', false),
        decurion:{ landed:FB.station.isLanded(3, s), county:FB.station.holdsCounty(3, s),
          seeksCounty:FB.station.maySeekCounty(3, s), estates:FB.station.sitsInEstates(3, s) },
        routes:[0,1,2,3,4,5,6].map(function (tier) { return FB.station.promotion(tier, s).route; }),
        tech:['period_station_recognition','period_476_civic_career','period_tenant_work'].map(function (id) {
          return FBDATA.techImpactReviews.features[id].mode;
        }) };
    });
    expect(result.pure).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.faults.join('\n')).toContain('Invalid standing requirements.');
    expect(result.route).toBe('standing');
    expect(result.blocked).toBe(true);
    expect(result.routes).toEqual(['freedom'].concat(Array(6).fill('standing')));
    expect(result.medieval).toEqual(Array(2).fill(['freedom','manor','barony','county','higher','higher','higher']));
    expect(result.decurion).toEqual({ landed:false, county:false, seeksCounty:true, estates:false });
    expect(result.tech).toEqual(['none','none','none']);
  });

test('staged resources verify every period band and reviewed county-grant boundary',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'federate_476');
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, me = s.chars[p.charId];
      p.gold = 10000; p.prestige = 2000;
      FB.adjustStanding(s, { kind:'realm', id:'italy' }, 100, 'e2e:patron');
      const rows = [], errors = [];
      function claim() {
        const q = FB.rankElevationStatus(s), before = { gold:p.gold, prestige:p.prestige };
        if (!q || !q.ready) { errors.push(q && q.reason || 'no quote'); return; }
        const paid = FB.attemptRankElevation(s, 'standing', FB.rankElevationContext(s, q));
        rows.push({ target:q.targetTier, claimed:paid.claimed,
          costMatches:before.gold - p.gold === q.cost.gold && before.prestige - p.prestige === q.cost.prestige });
        s.eventQueue = [];
      }
      claim(); claim(); claim();
      const counties = FB.realmHeldCounties(s, 'italy').filter(function (pid) { return pid !== s.realms.italy.capital; });
      function acquire(count) {
        while (p.provs.length < count && counties.length) {
          const pid = counties.shift();
          if (FB.settlementCountyHolder(s, pid) === 'italy') FB.countyInvestiture(s, pid, 'italy', 'italy');
        }
      }
      acquire(2); claim();
      acquire(4);
      FB.changePlayerLiege(s, null, 'e2e:sovereignty');
      claim();
      acquire(8);
      FB.changePlayerLiege(s, null, 'e2e:sovereignty');
      claim();
      FB.checkTierPromotions(s);
      return { rows:rows, errors:errors, tier:p.tier, counties:p.provs.length,
        noManor:!p.manor, noCharter:!FB.activeSettlementFounding(s), noFeudalLapse:!p.titleLapse,
        career:me.career.profession, noNext:FB.station.next(p, s) === null };
    });
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([2,3,4,5,6,7].map(function (tier) {
      return { target:tier, claimed:true, costMatches:true };
    }));
    expect(result).toMatchObject({ tier:7, noManor:true, noCharter:true, noFeudalLapse:true, career:'soldier', noNext:true });
    expect(result.counties).toBeGreaterThanOrEqual(8);
  });

test('service and live offices qualify independently of wealth, and changed reviews cannot charge',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'federate_476');
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, c = s.chars[p.charId];
      p.gold = 40; p.prestige = 40; c.career.experience = 3;
      const q = FB.rankElevationStatus(s);
      const ctx = FB.rankElevationContext(s, q);
      c.career.experience = 0;
      const before = JSON.stringify(s), rng = FB.getRngState();
      const refused = FB.attemptRankElevation(s, 'standing', ctx);
      const noMutation = before === JSON.stringify(s) && rng === FB.getRngState();
      const w = s.stories.western_court_476;
      const rec = FB.story476.recognizeOrExisting(s, 'civic_acceptance', { kind:'county', id:'ravenna' },
        { kind:'character', id:c.id }, { kind:'county', id:'ravenna' });
      const office = FB.story476.appointment(s, 'judicial_vicar', 'italy',
        { kind:'character', id:c.id }, { kind:'county', id:'ravenna' }, rec.id);
      const live = FB.rankElevationStatus(s);
      FB.authorityAppointmentTransition(s, office.id, 'remove');
      const revoked = FB.rankElevationStatus(s);
      return { service:q.ready, refused:!refused.attempted, noMutation:noMutation,
        live:live.ready, revoked:!revoked.ready, world:!!w };
    });
    expect(result).toEqual({ service:true, refused:true, noMutation:true, live:true, revoked:true, world:true });
  });

test('senior Roman and imperial routes require live recognition when their wealth alternatives are unmet',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'federate_476');
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player;
      const counties = FB.realmHeldCounties(s, 'italy').filter(function (pid) { return pid !== s.realms.italy.capital; });
      counties.slice(0, 8).forEach(function (pid) { FB.countyInvestiture(s, pid, 'italy', 'italy'); });
      FB.authoritySetGovernment(s, 'player', 'roman_civic');
      FB.setPlayerTier(s, 5, { attachLiege:false });
      p.gold = 800; p.prestige = 350;
      const noCommission = !FB.rankElevationStatus(s).ready;
      const imperial = FB.authorityRecognize(s, { source:'imperial_commission',
        issuer:{ kind:'realm', id:'byzantium' }, subject:{ kind:'character', id:p.charId }, endTurn:s.turn + 1 });
      const commission = FB.rankElevationStatus(s), ctx = FB.rankElevationContext(s, commission);
      s.turn++;
      const expired = !FB.rankElevationStatus(s).ready;
      const before = JSON.stringify(s);
      const stale = !FB.attemptRankElevation(s, 'standing', ctx).attempted && before === JSON.stringify(s);
      FB.changePlayerLiege(s, null, 'e2e:sovereign');
      FB.setPlayerTier(s, 6, { attachLiege:false });
      p.prestige = 850;
      const noAcclaim = !FB.rankElevationStatus(s).ready;
      const acclaim = FB.authorityRecognize(s, { source:'army_acclamation',
        issuer:{ kind:'host', id:'host_476_federates' }, subject:{ kind:'character', id:p.charId } });
      const acclaimed = FB.rankElevationStatus(s).ready;
      FB.authorityRecognitionTransition(s, acclaim.id, 'revoke');
      return { created:!!imperial && !!acclaim, noCommission:noCommission, commissioned:commission.ready,
        expired:expired, stale:stale, noAcclaim:noAcclaim, acclaimed:acclaimed, revoked:!FB.rankElevationStatus(s).ready };
    });
    expect(result).toEqual({ created:true, noCommission:true, commissioned:true,
      expired:true, stale:true, noAcclaim:true, acclaimed:true, revoked:true });
  });

for (const choice of ['serve_council','keep_household']) {
  test('curialis opening completes and saves the ' + choice + ' choice without replay',
    async function ({ page }, testInfo) {
      await start(page, testInfo, 'curialis_476');
      const initial = await page.evaluate(function () {
        const s = FB.state, c = s.chars[s.player.charId];
        return { age:FB.ageOf(c, s.date.year), career:c.career.profession,
          children:FB.childrenOf(s, c).length, federate:!!s.stories.federate_track_476 };
      });
      expect(initial).toMatchObject({ age:30, career:'curialis', federate:false });
      expect(initial.children).toBeGreaterThan(0);
      await page.locator('[data-tab="actions"]').click();
      await page.locator('[data-story-card="curialis_track_476"]').click();
      await page.locator('[data-story-choice="' + choice + '"]').click();
      if (choice === 'serve_council') await expect(page.locator('#genmodal')).toContainText('60');
      await page.locator('#gm-story-confirm').click();
      await page.locator('#gm-story-continue').click();
      const result = await page.evaluate(function () {
        const s = FB.state, t = s.stories.curialis_track_476;
        const before = { gold:s.player.gold, prestige:s.player.prestige,
          tier:s.player.tier, phase:t.phase, result:t.result, office:t.officeId, owner:s.owner.ravenna };
        const count = s.authority.appointments.length;
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const loaded = FB.state, q = FB.stories.quote(loaded, 'curialis_track_476', 'serve_council');
        return { before:before, gold:loaded.player.gold, phase:loaded.stories.curialis_track_476.phase,
          appointments:loaded.authority.appointments.length === count, replay:!q.allowed,
          peace:FB.political.permission(loaded, { kind:'character', id:loaded.player.charId }, 'judge', { provinceId:'ravenna' }).allowed };
      });
      expect(result.before).toMatchObject(choice === 'serve_council'
        ? { gold:20, prestige:10, tier:3, phase:'complete', result:'civic_mandate', owner:'italy' }
        : { gold:80, prestige:30, tier:2, phase:'complete', result:'household', owner:'italy' });
      expect(result).toMatchObject({ gold:result.before.gold, phase:'complete', appointments:true, replay:true,
        peace:choice === 'serve_council' });
    });
}

test('curial reviews reject changed age, insufficient total funds and an occupied mandate without partial writes',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'curialis_476');
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], w = s.stories.western_court_476;
      const ready = FB.stories.quote(s, 'curialis_track_476', 'serve_council');
      const beforeQuote = JSON.stringify(s), rng = FB.getRngState();
      FB.stories.quote(s, 'curialis_track_476', 'serve_council');
      const pure = beforeQuote === JSON.stringify(s) && rng === FB.getRngState();
      s.player.gold = 59;
      const funds = !FB.stories.quote(s, 'curialis_track_476', 'serve_council').allowed;
      s.player.gold = 80; c.born = s.date.year - 15;
      const before = JSON.stringify(s);
      const underage = !FB.stories.apply(s, 'curialis_track_476', 'serve_council', ready);
      const noWrites = before === JSON.stringify(s);
      c.born = s.date.year - 30;
      const person = { kind:'character', id:w.civicDelegateId }, at = { kind:'county', id:'ravenna' };
      const rec = FB.story476.recognizeOrExisting(s, 'civic_acceptance', at, person, at);
      FB.story476.appointment(s, 'judicial_vicar', 'italy', person, at, rec.id);
      const occupied = FB.stories.quote(s, 'curialis_track_476', 'serve_council');
      const beforeOccupied = JSON.stringify(s);
      const rejected = !FB.stories.apply(s, 'curialis_track_476', 'serve_council', occupied);
      return { ready:ready.allowed, pure:pure, funds:funds, underage:underage, noWrites:noWrites,
        occupied:!occupied.allowed, rejected:rejected, unchanged:beforeOccupied === JSON.stringify(s) };
    });
    expect(result).toEqual({ ready:true, pure:true, funds:true, underage:true, noWrites:true,
      occupied:true, rejected:true, unchanged:true });
  });

test('NPC recognition uses the resident government ladder and careers remain period gated',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'federate_476');
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      const npc = Object.assign({}, c, { id:'e2e_curial', station:1, gold:150, prestige:50,
        homeProvinceId:'ravenna', career:Object.assign({}, c.career, { profession:'civic_clerk', experience:3 }) });
      s.chars[npc.id] = npc;
      const before = FB.station.subject(npc, s), quote = FB.standingElevationStatus(s, npc);
      const advanced = FB.advanceNPCStanding(s, npc);
      const choices = FB.careerChoices(s, c).map(function (q) { return q.id; });
      const other = { start:{ era:'early_medieval' }, date:{ year:867 } };
      return { form:before.formId, route:quote.route, ready:quote.ready, advanced:advanced,
        after:FB.station.subject(npc, s).tier,
        choices:choices, noMedieval:['colonus','curialis','decurion'].every(function (id) {
          return !FB.contentPeriodEnabled(other, FBDATA.careers[id]);
        }), church:FBDATA.religiousPaths.late_antique_clerical.ranks.map(function (r) { return r.name; }) };
    });
    expect(result).toMatchObject({ form:'roman_civic', route:'standing', ready:true, advanced:true, after:2, noMedieval:true });
    expect(result.choices).toContain('colonus');
    expect(result.choices).not.toContain('decurion');
    expect(result.church).toEqual(['Lector','Deacon','Presbyter','Bishop']);
  });

test('NPC and vassal recognition is independent of player Standing', async function ({ page }, testInfo) {
  await start(page, testInfo, 'federate_476');
  const result = await page.evaluate(function () {
    const s = FB.state, player = s.chars[s.player.charId];
    const npc = Object.assign({}, player, { id:'e2e_dependent', station:0, gold:80, prestige:0,
      homeProvinceId:'ravenna', career:null });
    s.chars[npc.id] = npc;
    function ready() { return FB.standingElevationStatus(s, npc).ready; }
    FB.adjustStanding(s, { kind:'realm', id:'italy' }, 100, 'e2e:unrelated');
    const neutral = ready();
    s.localInstitutions.ravenna_council.standing['character:' + npc.id] = 30;
    const respected = ready();
    FB.adjustStanding(s, { kind:'realm', id:'italy' }, -200, 'e2e:unrelated');
    const unchanged = ready();
    const r = s.realms.croatia;
    r.liege = 'byzantium'; r.rank = 1; r.stationPrestige = 300; r.treasury.gold = 1000; r.favor = 60;
    FB.invalidateRealmCache();
    const ruler = FB.realmRulerCharacterSnapshot(s, 'croatia');
    const favored = FB.standingElevationStatus(s, ruler).ready;
    r.favor = -60;
    const disfavored = FB.standingElevationStatus(s, ruler).ready;
    return { neutral:neutral, respected:respected, unchanged:unchanged, favored:favored, disfavored:disfavored };
  });
  expect(result).toEqual({ neutral:false, respected:true, unchanged:true, favored:true, disfavored:false });
});

test('AI spends its own treasury using the same ladder and accrues prestige once per year',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'federate_476');
    const result = await page.evaluate(function () {
      const s = FB.state, r = s.realms.italy;
      r.rank = 1; r.stationPrestige = 300;
      const player = JSON.stringify(s.player), money = FB.treasuryAvailable(s, 'italy');
      const c = FB.realmRulerCharacterSnapshot(s, 'italy');
      const q = FB.standingElevationStatus(s, c);
      FB.realmStandingYearly(s);
      const first = { rank:r.rank, money:FB.treasuryAvailable(s, 'italy'), prestige:r.stationPrestige };
      FB.realmStandingYearly(s);
      const repeat = { rank:r.rank, money:FB.treasuryAvailable(s, 'italy'), prestige:r.stationPrestige };
      const noPlayerCharge = JSON.stringify(s.player) === player;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { q:q.ready, first:first, repeat:repeat, paid:money - first.money,
        cost:q.cost.gold, noPlayerCharge:noPlayerCharge,
        year:FB.state.realms.italy.stationStandingYear, currentYear:FB.state.date.year,
        savedPrestige:FB.state.realms.italy.stationPrestige };
    });
    expect(result).toMatchObject({ q:true, noPlayerCharge:true });
    expect(result.first.rank).toBe(2);
    expect(result.repeat).toEqual(result.first);
    expect(result.paid).toBe(result.cost);
    expect(result.year).toBe(result.currentYear);
    expect(result.savedPrestige).toBe(result.first.prestige);
  });

test('the late antique church route reaches bishop without a secular estate',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'federate_476');
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, c = s.chars[p.charId];
      p.gold = 500; p.piety = 500; p.prestige = 500;
      FB.beginCareer(s, c, 'priest');
      s.date.year += 14; c.career.experience = 14; c.skills.lea = 14;
      const ranks = [];
      for (let i = 0; i < 3; i++) {
        ranks.push(FB.takeReligiousStep(s, c));
      }
      const path = FB.religiousPathOf(s, c);
      return { ranks:ranks, path:path.id, index:path.index, tier:p.tier,
        bishop:!!p.flags.bishop, landed:FB.station.isLanded(p, s), counties:p.provs.length,
        career:FB.careerRole(s, c) };
    });
    expect(result).toEqual({ ranks:[true,true,true], path:'late_antique_clerical', index:3,
      tier:3, bishop:true, landed:false, counties:0, career:'clergy' });
  });
