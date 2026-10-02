'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/justice.js', 'js/wars.js', 'js/world.js',
  'js/model.js', 'js/save.js', 'js/fortifications.js', 'js/treasury.js', 'js/intrigue.js',
  'data/map_data.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test.beforeEach(async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function (ids) {
    const s = FB.state;
    FB.endPlayerWar(s, true);
    s.armies = []; s.eventQueue = []; s.truces = {};
    const rebel = ids.enemy, lord = ids.other, crown = ids.liege;
    const seat = s.realms[rebel].capital;
    const border = Object.keys(FB.world.adj[seat]).sort().filter(function (pid) {
      return !FB.world.byId[pid].wasteland && s.player.provs.indexOf(pid) < 0;
    })[0];
    if (!border) throw new Error('AI rebellion fixture needs a neighboring crown county');
    s.holder[border] = lord;
    s.realms[lord].liege = crown;
    s.realms[rebel].liege = lord;
    FB.invalidateRealmCache();
    FB.realmTerritory(s, lord).forEach(function (pid) { s.owner[pid] = crown; });
    FB.invalidateRealmCache();
    const actor = FB.materializeRealmRuler(s, lord);
    const ruler = FB.materializeRealmRuler(s, crown);
    const target = FB.materializeRealmRuler(s, rebel);
    actor.traits = []; ruler.traits = []; target.traits = [];
    window.aiRebellion = { rebel:rebel, lord:lord, crown:crown,
      actor:actor.id, ruler:ruler.id, target:target.id };
    window.startAIRebellion = function () {
      const f = window.aiRebellion, chance = FB.chance;
      let arrest;
      try {
        FB.chance = function () { return false; };
        arrest = FB.justiceAttemptArrest(FB.state, f.actor, f.target);
      } finally { FB.chance = chance; }
      if (!arrest.ok || arrest.captured) throw new Error('AI arrest must meet resistance');
      const war = FB.ordinaryWarBetween(FB.state, f.crown, f.rebel);
      if (!war || !war.objectives.length) throw new Error('AI rising needs a real campaign objective');
      return war;
    };
  }, ids);
});

for (const ending of ['exhaustion', 'occupation']) {
  test('AI arrest resistance ends by ' + ending + ' and settles only its rebellion cases', async function ({ page }) {
    const result = await page.evaluate(function (ending) {
      const s = FB.state, f = window.aiRebellion, w = window.startAIRebellion();
      const original = FB.justiceOffenseFor(s, f.actor, f.target);
      const crownCase = FB.justiceRecordRebellion(s, f.crown, f.target, 'test:crown-rising');
      const murder = FB.justiceRecordOffense(s, f.actor, f.target,
        'assassination', 'material', false, f.actor, 'test:murder');
      const foreign = FB.justiceRecordRebellion(s, 'player', f.target, 'test:unrelated-rising');
      const target = w.target, before = s.owner[target];
      if (ending === 'occupation') {
        w.objectives.forEach(function (o) { w.occupations[o.target] = { occupied:true, progress:0 }; });
        FB.advanceOrdinaryObjectives(s, w.id);
      } else {
        w.seasons = 30;
        const chance = FB.chance;
        try {
          FB.chance = function () { return false; };
          s.turn += 90; FB.playerWarTick(s);
          if (w.status !== 'active' || w.seasons !== 31) throw new Error('AI war must advance before exhaustion');
          s.turn += 90; FB.playerWarTick(s);
        } finally { FB.chance = chance; }
      }
      return { ended:w.status, result:w.result, rebel:w.casus.rebel === f.rebel,
        formerLiege:w.casus.formerLiege === f.lord, origin:w.casus.rebelCharId === f.target,
        original:original.closed && original.settled, crown:crownCase.closed && crownCase.settled,
        murderOpen:!murder.closed, foreignOpen:!foreign.closed,
        truce:FB.truceExpiry(s, f.crown, f.rebel) === s.turn + 720,
        land:ending === 'occupation' ? s.owner[target] === f.crown : s.owner[target] === before };
    }, ending);
    expect(result).toEqual({ ended:'ended', result:ending === 'occupation' ? 'victory' : 'white_peace',
      rebel:true, formerLiege:true, origin:true, original:'peace', crown:'peace',
      murderOpen:true, foreignOpen:true, truce:true, land:true });
  });
}

test('a crown truce blocks AI arrests by an intermediate lord until it expires', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.aiRebellion;
    const offense = FB.justiceRecordRebellion(s, f.lord, f.target, 'test:old-rising');
    s.truces[JSON.stringify([f.crown, f.rebel].sort())] = s.turn + 720;
    const rng = FB.getRngState(), before = JSON.stringify(s);
    const quote = FB.justiceArrestProjection(s, f.actor, f.target, offense.id);
    const attempt = FB.justiceAttemptArrest(s, f.actor, f.target, offense.id);
    const unchanged = before === JSON.stringify(s) && rng === FB.getRngState();
    FB.justiceSeason(s);
    const peaceful = !FB.ordinaryWarBetween(s, f.crown, f.rebel) &&
      !FB.justiceCustodyOf(s, f.target) && s.realms[f.rebel].liege === f.lord;
    s.turn += 720;
    return { blocker:quote.blocker, until:quote.truceUntil === s.turn, attempt:attempt,
      unchanged:unchanged, peaceful:peaceful,
      after:FB.justiceArrestProjection(s, f.actor, f.target, offense.id).ready };
  });
  expect(result).toEqual({ blocker:'truce', until:true, attempt:{ ok:false, blocker:'truce' },
    unchanged:true, peaceful:true, after:true });
});

for (const cause of ['independence', 'border']) {
  test('save repair recognizes legacy AI ' + cause + ' rebellions without new identity fields', async function ({ page }) {
    const result = await page.evaluate(function (cause) {
      const f = window.aiRebellion, w = window.startAIRebellion();
      const arrestCase = FB.justiceOffenseFor(FB.state, f.actor, f.target).id;
      w.casus = cause === 'border' ? { type:'border', label:'Breakaway war' } : { type:'independence' };
      // Old saves identify the crown and opposing realm, but not the old lord.
      const offense = FB.justiceRecordRebellion(FB.state, f.crown, f.target, 'test:legacy-rising');
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const s = FB.state, repaired = FB.ordinaryWarById(s, w.id);
      const rng = FB.getRngState();
      FB.repairWars(s);
      const once = JSON.stringify(s);
      FB.repairWars(s);
      const stable = once === JSON.stringify(s) && rng === FB.getRngState();
      FB.settleOrdinaryWar(s, repaired.id, 'white_peace');
      const closed = s.justice.offenses.filter(function (o) { return o.id === offense.id; })[0];
      const original = s.justice.offenses.filter(function (o) { return o.id === arrestCase; })[0];
      return { rebel:repaired.casus.rebel === f.rebel,
        person:repaired.casus.rebelCharId === f.target, stable:stable,
        settled:closed.closed && closed.settled, arrestSettled:original.closed && original.settled,
        truce:FB.truceExpiry(s, f.crown, f.rebel) > s.turn };
    }, cause);
    expect(result).toEqual({ rebel:true, person:true, stable:true,
      settled:'peace', arrestSettled:'peace', truce:true });
  });
}

test('peace still settles the original rebel ruler after succession', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.aiRebellion, w = window.startAIRebellion();
    const offense = FB.justiceOffenseFor(s, f.actor, f.target);
    FB.advanceRealmSuccession(s, f.rebel);
    const successor = FB.realmRulerCharacterSnapshot(s, f.rebel);
    FB.settleOrdinaryWar(s, w.id, 'white_peace');
    return { changed:successor && successor.id !== f.target,
      original:w.casus.rebelCharId === f.target, settled:offense.closed && offense.settled };
  });
  expect(result).toEqual({ changed:true, original:true, settled:'peace' });
});

test('ordinary AI border peace does not pardon an unrelated rebellion', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.aiRebellion;
    const offense = FB.justiceRecordRebellion(s, f.crown, f.target, 'test:unrelated-rising');
    const w = FB.registerOrdinaryWar(s, f.crown, { enemy:f.rebel,
      target:s.realms[f.rebel].capital, casus:{ type:'border' } });
    FB.settleOrdinaryWar(s, w.id, 'white_peace');
    return { closed:offense.closed, result:w.result };
  });
  expect(result).toEqual({ closed:false, result:'white_peace' });
});
