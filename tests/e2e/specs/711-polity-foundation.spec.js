'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_711.js', 'data/story_campaigns_711.js',
  'data/technology.js', 'data/map_data.js', 'data/cultures.js', 'data/modifiers.js', 'data/eras.js',
  'js/stories.js', 'js/story_polity_foundation.js', 'js/world.js',
  'js/rebellions.js', 'js/fortifications.js', 'js/politics.js', 'js/authority.js', 'js/population.js',
  'js/technology.js', 'js/treasury.js', 'js/armies.js', 'js/wars.js',
  'js/save.js', 'js/save_v4.js', 'js/model.js', 'js/station.js', 'js/starts.js', 'js/events.js', 'js/governments.js',
  'js/messages.js', 'js/i18n.js', 'js/main.js', 'js/crazygames.js',
  'data/distribution_crazygames.js'
]);
const STORY = 'asturias_foundation_711';

async function observe(page, testInfo, crazygames, bookmark) {
  if (crazygames) {
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page, testInfo);
  } else await openGame(page, testInfo);
  const error = await page.evaluate(function (bookmark) {
    return new Promise(function (resolve) {
      FB.activateBookmark(bookmark, null, function (fault) {
        if (fault) { resolve(fault.message); return; }
        FB.game.pending = { seed:'PELAYOFOUNDATION711' };
        FB.game.startObserve(); FB.game.setPaused(true);
        resolve(null);
      });
    });
  }, bookmark || '711');
  expect(error).toBeNull();
}

// Scenario-local setup advances only the date to a political opportunity.
// The real transfer transaction supplies conquest facts; no story is injected.
async function opening(page, conquered) {
  await page.evaluate(function (conquered) {
    const s = FB.state;
    s.date = { year:718, season:0, day:1 }; s.turn = 7 * 360;
    FB.transferProvince(s, 'toledo', 'umayyad_711');
    if (conquered) FB.transferProvince(s, 'oviedo', 'umayyad_711');
  }, conquered);
}

test('711 opens without Asturias or Pelayo and waits for a real Gothic collapse',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (id) {
      const s = FB.state, rec = s.stories[id], story = FB.stories.get(id);
      const before = JSON.stringify(s), rng = FB.getRngState();
      story.day(s, rec);
      const inert = before === JSON.stringify(s) && rng === FB.getRngState();
      const quiet = !FB.stories.cards(s).some(function (card) { return card.id === id; });
      s.date.year = 718; s.turn = 2520;
      story.day(s, rec);
      return { inert:inert, quiet:quiet, phase:rec.phase,
        noCourt:!s.realms.asturias_711,
        noFounder:rec.founderId === null && rec.founderMemberId === null,
        owner:s.owner.oviedo, toledo:s.owner.toledo,
        mode:FBDATA.techImpactReviews.features.conditional_polity_foundation.mode };
    }, STORY);
    expect(result).toEqual({ inert:true, quiet:true, phase:'pending', noCourt:true,
      noFounder:true, owner:'visigoths_711', toledo:'visigoths_711', mode:'none' });
  });

for (const crazygames of [false, true]) {
  test('a surviving Gothic remnant founds Pelayo once, CrazyGames flag ' + crazygames,
    async function ({ page }, testInfo) {
      await observe(page, testInfo, crazygames);
      await opening(page, false);
      const result = await page.evaluate(function (id) {
        let s = FB.state;
        const story = FB.stories.get(id), authored = JSON.stringify(FB.bookmark('711'));
        const before = Object.assign({}, s.owner), communities = JSON.stringify(FB.countyCommunities(s, 'oviedo'));
        const armies = JSON.stringify(s.armies);
        story.day(s, s.stories[id]);
        const rec = s.stories[id], founder = FB.realmRulerCharacterSnapshot(s, rec.realmId);
        const sourceTech = FB.realmTechRecord(s, 'visigoths_711');
        const foundedTech = FB.realmTechRecord(s, rec.realmId);
        const inherited = sourceTech.completed.every(function (tech) { return foundedTech.completed.indexOf(tech) >= 0; });
        const facts = { phase:rec.phase, result:rec.result, reason:rec.reason,
          founder:founder.name, born:founder.born, owner:s.owner.oviedo, holder:s.holder.oviedo,
          counties:rec.counties, sovereign:s.realms[rec.realmId].liege,
          sourceAlive:s.realms.visigoths_711.alive,
          inherited:inherited,
          onlyNorth:Object.keys(before).every(function (pid) { return pid === 'oviedo' || before[pid] === s.owner[pid]; }),
          communities:communities === JSON.stringify(FB.countyCommunities(s, 'oviedo')),
          armies:armies === JSON.stringify(s.armies) };
        const record = JSON.stringify(rec);
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        const rng = FB.getRngState(), beforeReplay = JSON.stringify(s);
        story.day(s, s.stories[id]);
        return { facts:facts, restored:record === JSON.stringify(s.stories[id]),
          once:beforeReplay === JSON.stringify(s) && rng === FB.getRngState(),
          authored:authored === JSON.stringify(FB.bookmark('711')),
          valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
      }, STORY);
      expect(result).toEqual({ facts:{ phase:'resolved', result:'founded', reason:'surviving_remnant',
        founder:'Pelayo', born:685, owner:'asturias_711', holder:'asturias_711',
        counties:['oviedo'], sovereign:null, sourceAlive:true, inherited:true,
        onlyNorth:true, communities:true, armies:true }, restored:true, once:true, authored:true, valid:true });
    });
}

test('delayed conquest may open the foundation while a busy Gothic court waits',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (id) {
      const s = FB.state, story = FB.stories.get(id), rec = s.stories[id];
      s.date.year = 718; s.turn = 2520; story.day(s, rec);
      const waiting = rec.phase === 'pending';
      s.date.year = 724; s.turn = 13 * 360;
      FB.transferProvince(s, 'toledo', 'umayyad_711');
      const war = FB.registerOrdinaryWar(s, 'visigoths_711', {
        enemy:'umayyad_711', target:'toledo', legacy:false,
        casus:{ type:'border', target:'toledo' }, objectives:[{ type:'border', target:'toledo' }] });
      story.day(s, rec);
      return { waiting:waiting, ordinary:!!war, phase:rec.phase, noCourt:!s.realms.asturias_711,
        north:s.owner.oviedo };
    }, STORY);
    expect(result).toEqual({ waiting:true, ordinary:true, phase:'pending', noCourt:true, north:'visigoths_711' });
  });

test('a delayed peaceful northern opening can still found Asturias inside its window',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (id) {
      const s = FB.state, story = FB.stories.get(id), rec = s.stories[id];
      s.date.year = 718; s.turn = 2520; story.day(s, rec);
      const waited = rec.phase === 'pending';
      s.date.year = 724; s.turn = 13 * 360;
      FB.transferProvince(s, 'toledo', 'umayyad_711'); story.day(s, rec);
      return { waited:waited, result:rec.result, owner:s.owner.oviedo };
    }, STORY);
    expect(result).toEqual({ waited:true, result:'founded', owner:'asturias_711' });
  });

test('local Catholic continuity is required without converting the uplands for the story',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    await opening(page, false);
    const result = await page.evaluate(function (id) {
      const s = FB.state, story = FB.stories.get(id), rec = s.stories[id];
      const population = s.population.counties.oviedo, original = population.communities;
      population.communities = [{ culture:'hispano_roman', religion:'umayyad_sunni_711', count:population.count }];
      const communities = JSON.stringify(population.communities), rng = FB.getRngState();
      story.day(s, rec);
      const waited = rec.phase === 'pending' && !s.realms.asturias_711;
      const unchanged = communities === JSON.stringify(population.communities) && rng === FB.getRngState();
      population.communities = original; story.day(s, rec);
      return { waited:waited, unchanged:unchanged, result:rec.result, owner:s.owner.oviedo };
    }, STORY);
    expect(result).toEqual({ waited:true, unchanged:true, result:'founded', owner:'asturias_711' });
  });

test('foundation remains historical after Pelayo dies, his record compacts and Asturias is conquered',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    await opening(page, false);
    const result = await page.evaluate(function (id) {
      const s = FB.state, story = FB.stories.get(id), rec = s.stories[id];
      story.day(s, rec);
      const realm = s.realms[rec.realmId], founder = s.chars[rec.founderId];
      const member = realm.succession.members[rec.founderMemberId];
      FB.killChar(s, founder);
      const compacted = FB.compactCourtRecord(s, member, founder, { retentionChecked:true });
      const succeeded = realm.succession.rulerMemberId !== rec.founderMemberId;
      FB.transferProvince(s, 'oviedo', 'umayyad_711');
      const record = JSON.stringify(rec);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const rng = FB.getRngState(), before = JSON.stringify(FB.state);
      story.day(FB.state, FB.state.stories[id]);
      return { compacted:compacted, succeeded:succeeded,
        extinct:!FB.state.realms.asturias_711.alive, founderGone:!FB.state.chars[rec.founderId],
        unchanged:record === JSON.stringify(FB.state.stories[id]) && before === JSON.stringify(FB.state) && rng === FB.getRngState(),
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    }, STORY);
    expect(result).toEqual({ compacted:true, succeeded:true, extinct:true, founderGone:true, unchanged:true, valid:true });
  });

test('conquered uplands need actual revolt occupation and retain that commitment through restore',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    await opening(page, true);
    const result = await page.evaluate(function (id) {
      let s = FB.state;
      const story = FB.stories.get(id);
      story.day(s, s.stories[id]);
      const healthy = s.stories[id].phase === 'pending' && !FB.countyInOpenRevolt(s, 'oviedo') && !s.realms.asturias_711;
      FB.setCountySupport(s, 'oviedo', -80);
      const revolt = FB.startOpenRevolt(s, 'oviedo');
      story.day(s, s.stories[id]);
      FB.rebellionsAfterArmies(s);
      const beforeVictory = { phase:s.stories[id].phase, owner:s.owner.oviedo, court:!!s.realms.asturias_711 };
      function hosts(state) {
        return JSON.stringify(state.armies.map(function (a) {
          return { id:a.id, realm:a.realm, rebellionId:a.rebellionId, at:a.at, men:a.men, units:a.units };
        }));
      }
      const record = JSON.stringify(s.stories[id]), armies = hosts(s);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      const restored = record === JSON.stringify(s.stories[id]) && armies === hosts(s);
      const group = FB.rebellionById(s, revolt.id);
      // Stage an earned battlefield occupation, then use the real settlement.
      group.counties.oviedo.occupied = true;
      FB.rebellionsAfterArmies(s);
      const rec = s.stories[id], founder = FB.realmRulerCharacterSnapshot(s, 'asturias_711');
      const saved = JSON.stringify(rec);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      story.day(FB.state, FB.state.stories[id]);
      return { healthy:healthy, beforeVictory:beforeVictory, restored:restored,
        result:rec.result, reason:rec.reason, counties:rec.counties,
        owner:FB.state.owner.oviedo, founder:founder.name,
        ended:!FB.rebellionById(FB.state, revolt.id),
        noRebelHosts:!FB.state.armies.some(function (a) { return a.rebellionId === revolt.id; }),
        once:saved === JSON.stringify(FB.state.stories[id]),
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    }, STORY);
    expect(result).toEqual({ healthy:true, beforeVictory:{ phase:'rebelling', owner:'umayyad_711', court:false },
      restored:true, result:'founded', reason:'revolt_independence', counties:['oviedo'],
      owner:'asturias_711', founder:'Pelayo', ended:true, noRebelHosts:true, once:true, valid:true });
  });

for (const ending of ['defeat', 'timeout', 'restored_toledo']) {
  test('an Asturian attempt closes after ' + ending + ' without erasing ordinary revolt outcomes',
    async function ({ page }, testInfo) {
      await observe(page, testInfo);
      await opening(page, true);
      const result = await page.evaluate(function (args) {
        const s = FB.state, rec = s.stories[args.id], story = FB.stories.get(args.id);
        FB.setCountySupport(s, 'oviedo', -80);
        const group = FB.startOpenRevolt(s, 'oviedo'); story.day(s, rec);
        if (args.ending === 'defeat') {
          s.armies = s.armies.filter(function (a) { return a.rebellionId !== group.id; });
          FB.rebellionsAfterArmies(s);
        } else if (args.ending === 'timeout') {
          s.turn = rec.deadline; s.date.year = 721;
        } else FB.transferProvince(s, 'toledo', 'visigoths_711');
        story.day(s, rec);
        const ordinarySurvived = args.ending === 'defeat' || !!FB.rebellionById(s, group.id);
        const record = JSON.stringify(rec);
        if (args.ending !== 'defeat') {
          group.counties.oviedo.occupied = true; FB.rebellionsAfterArmies(s);
        }
        const noReplacement = !s.realms.asturias_711 && JSON.stringify(rec) === record;
        FB.save.restore(JSON.parse(FB.save.serialize())); story.day(FB.state, FB.state.stories[args.id]);
        return { phase:rec.phase, result:rec.result, reason:rec.reason, ordinarySurvived:ordinarySurvived,
          noReplacement:noReplacement, once:record === JSON.stringify(FB.state.stories[args.id]) };
      }, { id:STORY, ending:ending });
      expect(result).toEqual({ phase:'resolved', result:ending === 'restored_toledo' ? 'diverted' : 'failed',
        reason:{ defeat:'revolt_ended', timeout:'revolt_timeout', restored_toledo:'conditions_changed' }[ending],
        ordinarySurvived:true, noReplacement:true, once:true });
    });
}

for (const divergence of ['third_party', 'expired', 'player_holder']) {
  test('Asturias respects ' + divergence + ' instead of awarding northern land',
    async function ({ page }, testInfo) {
      await observe(page, testInfo);
      await opening(page, false);
      const result = await page.evaluate(function (args) {
        const s = FB.state, rec = s.stories[args.id];
        if (args.divergence === 'third_party') FB.transferProvince(s, 'oviedo', 'achila_711');
        if (args.divergence === 'expired') { s.date.year = 731; s.turn = 7200; }
        if (args.divergence === 'player_holder') { s.holder.oviedo = 'player'; FB.invalidateRealmCache(); }
        const owner = s.owner.oviedo, rng = FB.getRngState();
        FB.stories.get(args.id).day(s, rec);
        return { result:rec.result, reason:rec.reason, noCourt:!s.realms.asturias_711,
          ownership:owner === s.owner.oviedo, rng:rng === FB.getRngState() };
      }, { id:STORY, divergence:divergence });
      expect(result).toEqual({ result:'diverted',
        reason:{ third_party:'local_control_changed', expired:'window_closed', player_holder:'player_control' }[divergence],
        noCourt:true, ownership:true, rng:true });
    });
}

test('foundation save validation rejects malformed records before adoption, and old 711 saves gain only pending facts',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (id) {
      const saved = JSON.parse(FB.save.serialize()), live = FB.state;
      const malformed = [
        { phase:'unknown' }, { result:'founded' }, { startedTurn:4 },
        { counties:['oviedo'] }, { outcomeTurn:0 }, { deadline:-1 }
      ].map(function (patch) {
        const data = JSON.parse(JSON.stringify(saved)); Object.assign(data.state.stories[id], patch);
        const rng = FB.getRngState(); let message = '';
        try { FB.save.restore(data); } catch (error) { message = error.message; }
        return { rejected:message.indexOf('state.stories.' + id) >= 0,
          unchanged:FB.state === live && rng === FB.getRngState() };
      });
      const old = JSON.parse(JSON.stringify(saved)); delete old.state.stories[id];
      FB.save.restore(old);
      const once = JSON.stringify(FB.state.stories[id]), before = JSON.stringify(FB.state);
      const rng = FB.getRngState(); FB.stories.migrate(FB.state);
      return { malformed:malformed, phase:FB.state.stories[id].phase,
        noCourt:!FB.state.realms.asturias_711,
        once:once === JSON.stringify(FB.state.stories[id]) && before === JSON.stringify(FB.state) && rng === FB.getRngState() };
    }, STORY);
    expect(result).toEqual({ malformed:Array(6).fill({ rejected:true, unchanged:true }),
      phase:'pending', noCourt:true, once:true });
  });

for (const bookmark of ['476', '867', '1066']) {
  test(bookmark + ' remains detached from the Asturian foundation and its RNG',
    async function ({ page }, testInfo) {
      await observe(page, testInfo, false, bookmark);
      const result = await page.evaluate(function (id) {
        const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
        FB.stories.migrate(s);
        const foundation = FB.stories.get(id);
        return { attached:FB.stories.attached(s).indexOf(id) >= 0,
          noCourt:!s.realms.asturias_711,
          inert:before === JSON.stringify(s) && rng === FB.getRngState(),
          registered:!!foundation };
      }, STORY);
      expect(result).toEqual({ attached:false, noCourt:true, inert:true, registered:true });
    });
}
