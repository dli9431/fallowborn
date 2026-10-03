'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/eras.js', 'data/political_institutions.js', 'data/lexicons.js',
  'data/actions.js', 'data/bookmarks.js', 'data/map_data.js', 'data/starts.js', 'data/cultures.js',
  'js/station.js', 'js/governments.js', 'js/authority.js', 'js/world.js',
  'js/model.js', 'js/events.js', 'js/main.js', 'js/actions.js',
  'js/council.js', 'js/parliament.js', 'js/justice.js', 'js/armies.js',
  'js/lexicon.js', 'js/portrait.js', 'js/save.js', 'js/mods.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { FRESH_JOURNEYS, startParityGame } = require('../support/game/parity');

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' keeps the feudal permissions across all eight bands and save restore',
    async function ({ page }, testInfo) {
      await startParityGame(page, testInfo, FRESH_JOURNEYS.find(function (j) {
        return j.bookmark === bookmark && j.scenario === 'baron';
      }));
      const result = await page.evaluate(function () {
        const s = FB.state, S = FB.station, original = FB.save.serialize();
        const before = JSON.stringify(s), rng = FB.getRngState(), rows = [];
        for (let tier = 0; tier < 8; tier++) {
          const copy = Object.assign({}, s, { player:Object.assign({}, s.player, { tier:tier }) });
          rows.push({ tier:tier, landed:S.isLanded(copy.player, copy),
            county:S.holdsCounty(copy.player, copy), council:FB.councilActive(copy),
            estates:FB.parliamentActive(copy),
            social:FB.playerStation(copy), rank:S.realmRank(copy.player, copy),
            next:S.next(copy.player, copy), previous:S.previous(copy.player, copy),
            justice:S.mayAdministerJustice(copy.player, copy),
            command:S.mayCommand(copy.player, copy),
            dynastic:S.mayArrangeDynasticMarriage(copy.player, copy),
            feast:FB.instantStatus(copy, 'hold_feast').shown });
        }
        const unchanged = before === JSON.stringify(s) && rng === FB.getRngState();
        FB.save.restore(JSON.parse(original));
        const restored = FB.state;
        return { rows:rows, unchanged:unchanged,
          restore:{ tier:restored.player.tier, landed:S.isLanded(restored.player, restored),
            social:FB.playerStation(restored), estates:FB.parliamentActive(restored),
            council:FB.councilActive(restored) },
          faults:FB.validateEraData().concat(FB.governments.validate()) };
      });
      expect(result.rows).toEqual(Array.from({ length:8 }, function (_, tier) {
        return { tier:tier, landed:tier >= 3, county:tier >= 4, council:tier >= 6,
          estates:tier >= 3 && tier <= 5, social:Math.min(tier, 4),
          rank:Math.max(0, tier - 3), next:tier === 7 ? null : tier + 1,
          previous:Math.max(0, tier - 1), justice:tier >= 3,
          command:tier >= 3, dynastic:tier >= 3, feast:tier >= 3 };
      }));
      expect(result.unchanged).toBe(true);
      expect(result.restore).toEqual({ tier:3, landed:true, social:3, estates:true, council:false });
      expect(result.faults).toEqual([]);
    });
}

test('a landless command band changes its own permissions without changing another realm or campaign',
  async function ({ page }, testInfo) {
    await startParityGame(page, testInfo, FRESH_JOURNEYS.find(function (j) {
      return j.bookmark === '867' && j.scenario === 'baron';
    }));
    const result = await page.evaluate(function () {
      const live = FB.state, copy = JSON.parse(JSON.stringify(live));
      const rid = Object.keys(copy.realms).find(function (id) {
        return copy.realms[id].alive && copy.realms[id].rank === 1;
      });
      copy.player.liege = rid;
      copy.holder[copy.player.provinceId] = rid;
      const other = Object.keys(copy.realms).find(function (id) {
        return id !== rid && copy.realms[id].alive && copy.realms[id].rank === 1;
      });
      const npc = { id:'e2e_npc', tier:3, station:1, homeProvinceId:copy.realms[other].capital };
      copy.chars[npc.id] = npc;
      const before = JSON.stringify(copy), rng = FB.getRngState();
      FB.governments.register('ladder', 'e2e_command_ladder', {
        bands:{ 3:{ isLanded:false, mayCommand:true, mayHoldCouncil:true,
          mayAdministerJustice:false, mayArrangeDynasticMarriage:false,
          sitsInEstates:false, eligibilityTier:6, socialStation:1,
          promotion:{ route:'higher', next:5 }, previous:1 } },
        ranks:{ 1:{ isRoyal:true, tier:2 } }, social:{ 1:{ isGentle:true } }
      });
      FBDATA.governmentForms.e2e_command = Object.assign({}, FBDATA.governmentForms.territorial,
        { ladder:'e2e_command_ladder' });
      let answer;
      try {
        FB.authoritySetGovernment(copy, rid, 'e2e_command');
        const changed = JSON.stringify(copy);
        const p = copy.player, S = FB.station;
        answer = { landed:S.isLanded(p, copy), command:S.mayCommand(p, copy),
          council:FB.councilActive(copy), seats:FB.councilSeats(copy).length,
          estates:FB.parliamentActive(copy), justice:FB.justiceRulerEligible(copy, p.charId),
          dynastic:S.mayArrangeDynasticMarriage(p, copy),
          feast:FB.instantStatus(copy, 'hold_feast').shown,
          reachesSix:S.reaches(p, 6, copy), social:FB.playerStation(copy),
          gentle:FB.socialStation.isGentle({ station:1, homeProvinceId:p.provinceId }, copy),
          next:S.next(p, copy), previous:S.previous(p, copy),
          localRoyal:FB.realmRank.isRoyal(copy.realms[rid], copy),
          localCloneRoyal:FB.realmRank.isRoyal(Object.assign({}, copy.realms[rid]), copy),
          unrelatedNpcLanded:S.isLanded(npc, copy),
          unrelatedRoyal:FB.realmRank.isRoyal(copy.realms[other], copy),
          localTier:FB.realmRank.tier(copy.realms[rid], copy),
          liveLanded:S.isLanded(live.player, live),
          liveCouncil:FB.councilActive(live),
          pure:changed === JSON.stringify(copy) && rng === FB.getRngState(),
          didChangeGovernment:before !== changed, faults:FB.governments.validate() };
      } finally { delete FBDATA.governmentForms.e2e_command; }
      return answer;
    });
    expect(result).toEqual({ landed:false, command:true, council:true, seats:5,
      estates:false, justice:false, dynastic:false, feast:false,
      reachesSix:true, social:1, gentle:true, next:5, previous:1,
      localRoyal:true, localCloneRoyal:true, unrelatedNpcLanded:true, unrelatedRoyal:false, localTier:2,
      liveLanded:true, liveCouncil:false, pure:true, didChangeGovernment:true, faults:[] });
  });

test('unused bands permit sparse titles and never shift a saved band to a neighboring title',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const titles = FBDATA.lexicons.base.rank;
      FB.governments.register('ladder', 'e2e_sparse_ladder', { bands:{ 7:{ used:false } } });
      FBDATA.governmentForms.e2e_sparse = Object.assign({}, FBDATA.governmentForms.territorial,
        { ladder:'e2e_sparse_ladder' });
      FBDATA.lexicons.governments.e2e_sparse = {
        rank:{ m:titles.m.slice(0, 7), f:titles.f.slice(0, 7) }
      };
      const s = { start:{ era:'early_medieval', defaultGovernment:'e2e_sparse' },
        player:{ charId:'e2e', tier:6 }, chars:{ e2e:{ id:'e2e', sex:'m' } },
        faiths:{ e2e_sparse:{ name:'Sparse titles',
          properties:{ rankTitles:{ m:titles.m.slice(0, 7), f:titles.f.slice(0, 7) } } } },
        realms:{ player:{ id:'player', alive:true, rank:3 } } };
      try {
        const ladder = FB.station.definition(s.player, s);
        FB.lexicon.reset();
        return { titles:FB.station.titlesValid(FBDATA.lexicons.governments.e2e_sparse.rank, ladder),
          faults:FB.lexicon.validate().concat(FB.validateReligionData(s)), imperial:FB.station.isImperial(7, s),
          min:FB.station.reaches(7, 0, s), max:FB.station.exceeds(7, 7, s),
          next:FB.station.next(s.player, s),
          sixth:FB.lexicon.rank(s, 6), seventh:FB.lexicon.rank(s, 7),
          invalidUsed:FB.station.titlesValid({ m:titles.m.slice(0, 6), f:titles.f.slice(0, 6) }, ladder),
          sharedFaults:FB.validateReligionData(Object.assign({}, s,
            { start:{ era:'early_medieval', defaultGovernment:'territorial' } })) };
      } finally {
        delete FBDATA.lexicons.governments.e2e_sparse;
        delete FBDATA.governmentForms.e2e_sparse;
        FB.lexicon.reset();
      }
    });
    expect(result).toMatchObject({ titles:true, faults:[], imperial:false,
      min:false, max:true, next:null, invalidUsed:false,
      sixth:{ source:'governments.e2e_sparse', tier:6 },
      seventh:{ source:'base', tier:7 } });
    expect(result.sharedFaults.join('\n')).toContain('rankTitles needs m and f labels for every used ladder band.');
  });

test('focus and deed restrictions use named permissions and the form eligibility scale',
  async function ({ page }, testInfo) {
    await startParityGame(page, testInfo, FRESH_JOURNEYS.find(function (j) {
      return j.bookmark === '867' && j.scenario === 'baron';
    }));
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player;
      const ladder = { bands:{ 3:{ isLanded:false, mayCommand:false, eligibilityTier:6 } } };
      FB.governments.register('ladder', 'e2e_action_ladder', ladder);
      FBDATA.governmentForms.e2e_action = Object.assign({}, FBDATA.governmentForms.territorial,
        { ladder:'e2e_action_ladder' });
      FB.authoritySetGovernment(s, p.liege, 'e2e_action');
      FB.mods.apply({
        focuses:[{ id:'rest', eligibility:{ station:'mayCommand', tierMin:6, reason:'Military command is required.' } }],
        deeds:[{ id:'give_alms', eligibility:{ station:'mayCommand', tierMin:6, reason:'Military command is required.' } }]
      });
      p.gold = 100;
      function visible() {
        return { focus:FB.listFocuses(s).some(function (focus) { return focus.id === 'rest'; }),
          deed:FB.instantStatus(s, 'give_alms').can };
      }
      try {
        const blocked = visible();
        const before = JSON.stringify(s), rng = FB.getRngState();
        const quoteBlocked = FB.playerMusterSelectionQuote(s) === null;
        const raiseBlocked = FB.raisePlayerHost(s) === null;
        const pure = before === JSON.stringify(s) && rng === FB.getRngState();
        ladder.bands[3].mayCommand = true;
        const allowed = visible();
        ladder.bands[3].eligibilityTier = 5;
        const thresholdBlocked = visible();
        ladder.bands[3].eligibilityTier = 6;
        ladder.bands[3].mayCommand = 'yes';
        return { blocked:blocked, allowed:allowed, thresholdBlocked:thresholdBlocked,
          quoteBlocked:quoteBlocked, raiseBlocked:raiseBlocked, pure:pure,
          landed:FB.station.isLanded(p, s), faults:FB.governments.validate() };
      } finally { delete FBDATA.governmentForms.e2e_action; }
    });
    expect(result.blocked).toEqual({ focus:false, deed:false });
    expect(result.allowed).toEqual({ focus:true, deed:true });
    expect(result.thresholdBlocked).toEqual({ focus:false, deed:false });
    expect(result.landed).toBe(false);
    expect(result.quoteBlocked).toBe(true);
    expect(result.raiseBlocked).toBe(true);
    expect(result.pure).toBe(true);
    expect(result.faults.join('\n')).toContain('Permission flags must be boolean.');
  });

test('era ladders answer without an active game and malformed ladder data fails validation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const original = FBDATA.eras.early_medieval.ladder;
      const copy = JSON.parse(JSON.stringify(original));
      copy.bands[2].isLanded = true;
      copy.bands[2].order = 6;
      copy.bands[2].previous = 5;
      copy.bands[3].used = false;
      copy.bands[6].used = false;
      copy.ranks[4].order = 0;
      const s = { start:{ era:'early_medieval', defaultGovernment:'territorial' } };
      try {
        FBDATA.eras.early_medieval.ladder = copy;
        const changed = FB.station.isLanded({ tier:2 }, s);
        const baseline = FB.station.isLanded({ tier:2 }, null);
        const explicit = { tier:2, era:'early_medieval', formId:'territorial' };
        const derived = { next:FB.station.next(explicit, null),
          landedTier:FB.station.tierFor('isLanded', explicit, null),
          higherTier:FB.station.higherTier(2, 4, s),
          higherRank:FB.realmRank.higherRank(1, 4, s),
          cost:FB.rankElevationCost(s, 4, 2),
          breakdown:FB.rankElevationBreakdown(Object.assign({}, s, {
            player:{ charId:'e2e', tier:4 }, chars:{ e2e:{ id:'e2e', sex:'m' } }
          }), 4, 2).map(function (row) { return row.tier; }),
          context:FB.station.context(explicit, null) };
        copy.bands[2].isLanded = 'yes';
        const errors = FB.validateEraData();
        return { changed:changed, baseline:baseline, derived:derived, errors:errors,
          badBand:FB.station.validateLadder({ bands:{ 8:{ used:true } } }, 'test', true),
          badRule:FB.station.validateLadder({ bands:{ 2:{ promotion:{ route:'unknown', next:9 } } } }, 'test', true),
          unknown:FB.station.validateLadder({ bands:{ 2:{ secretPermission:true } } }, 'test', true) };
      } finally { FBDATA.eras.early_medieval.ladder = original; }
    });
    expect(result.changed).toBe(true);
    expect(result.baseline).toBe(false);
    expect(result.derived).toEqual({ next:null, landedTier:2, higherTier:2, higherRank:1,
      cost:{ gold:1700, prestige:700, piety:0 }, breakdown:[5, 2],
      context:{ era:'early_medieval', formId:'territorial' } });
    expect(result.errors.join('\n')).toContain('Permission flags must be boolean.');
    expect(result.badBand.join('\n')).toContain('Invalid ladder row.');
    expect(result.badRule.join('\n')).toContain('Invalid promotion rule.');
    expect(result.unknown.join('\n')).toContain('Unknown ladder field.');
  });
