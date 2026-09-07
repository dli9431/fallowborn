'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js', 'data/events_common.js', 'data/cultures.js', 'data/map_data.js', 'data/technology.js', 'js/events.js',
  'js/model.js', 'js/actions.js', 'js/world.js', 'js/agency.js', 'js/main.js',
  'js/save.js', 'js/ui_modals.js', 'js/ui_misc.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

async function prospect(page) {
  return page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    head.culture = 'nubian'; head.sex = 'f'; head.born = s.date.year - 25;
    head.traits = []; head.skills.dip = 10;
    FB.clearLoadout(s, head.id);
    s.player.gold = 5000; s.player.prestige = 5000;
    const target = FB.makeCharacter(s, { sex:'m', culture:'coptic', religion:head.religion,
      born:s.date.year - 25, station:1, traitsN:0, opinion:80, role:'suitor' });
    target.skills.dip = 10; target.homeProvinceId = s.player.provinceId;
    FB.adjustStanding(s, { kind:'character', id:target.id },
      80 - FB.standingOf(s, { kind:'character', id:target.id }), 'test:standing');
    return target.id;
  });
}

for (const accepted of [false, true]) {
  test('invitation ' + (accepted ? 'acceptance converts only the target' : 'refusal persists across cultural branches and save restore'), async function ({ page }) {
    const id = await prospect(page);
    const result = await page.evaluate(function (args) {
      const s = FB.state, head = s.chars[s.player.charId], target = s.chars[args.id];
      const before = JSON.stringify(s);
      const status = FB.marriageCulturePersuasionStatus(s, target, head);
      const pure = before === JSON.stringify(s);
      const originalTarget = { dynasty:target.dyn, faith:target.religion,
        children:JSON.stringify(target.childrenIds), spouse:target.spouseId };
      const oldChance = FB.chance;
      let rolled;
      FB.chance = function (chance) { rolled = chance; return args.accepted; };
      const result = FB.persuadeMarriageCulture(s, target, head);
      FB.chance = oldChance;
      const prestige = s.player.prestige;
      const standing = FB.standingOf(s, { kind:'character', id:target.id });
      const changedTarget = { dynasty:target.dyn, faith:target.religion,
        children:JSON.stringify(target.childrenIds), spouse:target.spouseId };
      const culture = target.culture, cooldown = target.cultureAdoptionUntil;
      const branch = FB.createCulture(s, { name:'Another maternal branch', parent:'nubian' });
      head.culture = branch;
      const serialized = JSON.parse(FB.save.serialize());
      FB.save.restore(serialized);
      const loaded = FB.state;
      const retry = FB.persuadeMarriageCulture(loaded, loaded.chars[args.id]);
      let cooldownBlocks = false;
      if (args.accepted) {
        loaded.player.charId = args.id;
        cooldownBlocks = !FB.conversionStatus(loaded, 'culture', 'coptic', 'self').ok;
      }
      return { pure:pure, ready:status.ready, chance:status.chance, rolled:rolled,
        cost:status.prestigeCost, prestige:prestige, resolved:result.resolved,
        accepted:result.accepted, standing:standing, originalTarget:originalTarget,
        changedTarget:changedTarget, culture:culture, cooldown:cooldown,
        retry:retry.resolved, cooldownBlocks:cooldownBlocks,
        attempts:Object.keys(loaded.marriageCultureAttempts).length };
    }, { id:id, accepted:accepted });
    expect(result).toMatchObject({ pure:true, ready:true, chance:0.35, rolled:0.35,
      cost:120, prestige:4880, resolved:true, accepted:accepted, retry:false, attempts:1 });
    expect(result.changedTarget).toEqual(result.originalTarget);
    expect(result.culture).toBe(accepted ? 'nubian' : 'coptic');
    expect(result.standing).toBe(accepted ? 80 : 70);
    if (accepted) {
      expect(result.cooldown).toBeGreaterThanOrEqual(730);
      expect(result.cooldownBlocks).toBe(true);
    }
  });
}

test('minor and remote targets fail preflight without spending or rolling', async function ({ page }) {
  const id = await prospect(page);
  const result = await page.evaluate(function (id) {
    const s = FB.state, target = s.chars[id];
    target.born = s.date.year - 15;
    const before = JSON.stringify(s);
    const minor = FB.persuadeMarriageCulture(s, target);
    const minorPure = before === JSON.stringify(s);
    target.born = s.date.year - 25; target.homeProvinceId = 'dongola';
    const remoteBefore = JSON.stringify(s);
    const remote = FB.persuadeMarriageCulture(s, target);
    return { minor:minor.resolved, minorPure:minorPure,
      remote:remote.resolved, remotePure:remoteBefore === JSON.stringify(s) };
  }, id);
  expect(result).toEqual({ minor:false, minorPure:true, remote:false, remotePure:true });
});

test('royal heirs face resistance and accession invalidates an unconfirmed invitation', async function ({ page }) {
  const id = await prospect(page);
  const result = await page.evaluate(function (id) {
    const s = FB.state, target = s.chars[id], head = s.chars[s.player.charId];
    const rid = Object.keys(s.realms).filter(function (rid) {
      return rid !== 'player' && s.realms[rid].generated && s.realms[rid].alive && s.realms[rid].succession &&
        !s.realms[rid].succession.papalElective;
    })[0];
    const realm = s.realms[rid], succession = realm.succession;
    const memberId = 'persuasion_test_heir';
    succession.members[memberId] = { id:memberId, charId:target.id, alive:true,
      name:target.name, sex:target.sex, born:target.born, childIds:[] };
    succession.heirId = memberId;
    target.royalLine = { realmId:rid, memberId:memberId };
    s.player.provinceId = realm.capital; s.player.tier = 4; s.player.liege = rid;
    head.skills.dip = 100;
    const heir = FB.marriageCulturePersuasionStatus(s, target);
    FB.adjustStanding(s, { kind:'character', id:target.id }, -1, 'test:standing');
    const low = FB.marriageCulturePersuasionStatus(s, target);
    // Accession uses the real authority assignment and then the transaction rechecks it.
    FB.assignRealmRulerCharacter(s, rid, target.id);
    const before = JSON.stringify(s);
    const ruler = FB.persuadeMarriageCulture(s, target);
    return { heir:heir, low:low.ready, ruler:ruler.resolved,
      reason:ruler.status.reason, unchanged:before === JSON.stringify(s) };
  }, id);
  expect(result.heir).toMatchObject({ ready:true, heir:true, threshold:80, chance:0.25 });
  expect(result).toMatchObject({ low:false, ruler:false, unchanged:true });
  expect(result.reason).toContain('Reigning rulers');
});

test('invitation confirmation discloses consequences and spends exactly one day', async function ({ page }) {
  const id = await prospect(page);
  const turn = await page.evaluate(function (id) {
    FB.ui.showMarriageCultureInvitation(id, FB.state.player.charId);
    return FB.state.turn;
  }, id);
  await expect(page.locator('#gm-body')).toContainText('Acceptance: 35%');
  await expect(page.locator('#gm-body')).toContainText('120 prestige and one day');
  await expect(page.locator('#gm-body')).toContainText('Faith, dynasty, relatives, territory, and marriage status');
  await page.locator('#culture-invitation-confirm').click();
  expect(await page.evaluate(function () { return FB.state.turn; })).toBe(turn + 1);
});

test('the proposal deed reviews lineage before spending its day or starting recovery', async function ({ page }) {
  const id = await prospect(page);
  const initial = await page.evaluate(function (id) {
    const s = FB.state, target = s.chars[id];
    target.culture = 'nubian'; s.player.flags.polly_ever = 1;
    FB.beginCourtship(s, target);
    const turn = s.turn;
    FB.runInstant(s, 'propose');
    return { turn:turn, after:s.turn, cooldown:s.player.cooldowns.propose };
  }, id);
  expect(initial.after).toBe(initial.turn);
  expect(initial.cooldown).toBeUndefined();
  await expect(page.locator('#marriage-lineage')).toHaveValue('paternal');
  await page.locator('#marriage-lineage').selectOption('maternal');
  await page.locator('#marriage-lineage-confirm').click();
  const proposed = await page.evaluate(function () {
    return { turn:FB.state.turn, cooldown:FB.state.player.cooldowns.propose,
      lineage:FB.state.player.courtshipTerms.lineage };
  });
  expect(proposed).toEqual({ turn:initial.turn + 1, cooldown:initial.turn, lineage:'maternal' });
});

test('a managed match invitation changes the prospect without converting the descendant or pledging the pair', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    head.culture = 'nubian'; s.player.prestige = 5000; s.player.gold = 5000;
    const child = FB.makeCharacter(s, { sex:'f', culture:'coptic', religion:head.religion,
      born:s.date.year - 18, dyn:head.dyn, traitsN:0, role:'child' });
    child.motherId = head.id; head.childrenIds.push(child.id); FB.touchFamily();
    const target = FB.spawnMatchCandidates(s, child)[0];
    target.culture = 'coptic'; target.born = s.date.year - 25;
    target.homeProvinceId = s.player.provinceId;
    FB.adjustStanding(s, { kind:'character', id:target.id },
      100 - FB.standingOf(s, { kind:'character', id:target.id }), 'test:standing');
    const oldChance = FB.chance;
    FB.chance = function () { return true; };
    const invited = FB.persuadeMarriageCulture(s, target, child);
    FB.chance = oldChance;
    return { resolved:invited.resolved, accepted:invited.accepted,
      targetCulture:target.culture, childCulture:child.culture,
      pledged:!!(child.betrothedId || child.spouseId || target.betrothedId || target.spouseId),
      maternal:FB.marriageLineageStatus(s, child, target, 'maternal').ok };
  });
  expect(result).toEqual({ resolved:true, accepted:true, targetCulture:'nubian',
    childCulture:'coptic', pledged:false, maternal:false });
});
