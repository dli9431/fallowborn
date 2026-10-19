'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/existing-person-harbor.json'),
  dune:require('../fixtures/authoring/existing-person-dune.json')};

dependsOnRuntime(__filename, ['index.html', 'data/starts.js', 'data/technology.js',
  'data/economy.js', 'data/government_rollout.js', 'data/eras.js',
  'js/starts.js', 'js/main.js', 'js/world.js', 'js/mods.js', 'js/model.js', 'js/items.js',
  'js/economy.js', 'js/station.js', 'js/governments.js', 'js/stories.js', 'js/story_household.js',
  'js/treasury.js', 'js/authority.js', 'js/population.js', 'js/travel.js', 'js/household_party_travel.js',
  'js/save.js', 'js/save_v4.js', 'js/ui_misc.js', 'js/ui_modals.js']);

async function importExample(page, info, prefix) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/existing-person-' + prefix + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
  }, prefix);
}
function code(prefix, index) {
  const sc = examples[prefix].startScenarios[index || 0];
  return 'ONEFAMILY-' + prefix + '_world-' + sc.id + '-' + sc.fixedProvinceId + '-' +
    (sc.sex || 'm') + '-' + (sc.characterName || 'Oren').replace(/ /g, '_') + '-standard';
}
async function seedScreen(page) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', {name:'New Game', exact:true}).click();
  await page.locator('#btn-bm-seed').click();
}
async function begin(page, prefix, index) {
  await seedScreen(page);
  await page.locator('#ng-seed').fill(code(prefix, index));
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
  await page.getByRole('button', {name:'Begin', exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const prefix of ['harbor', 'dune']) {
  test(prefix + ' picker opens the same fixed household identity without generated-family controls', async function ({page}, info) {
    await importExample(page, info, prefix);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button', {name:'New Game', exact:true}).click();
    await page.locator('[data-bookmark="' + prefix + '_world"]').click();
    const card = page.locator('[data-scenario="' + prefix + '_existing_household"]');
    await expect(card).toContainText('Story start');
    await card.click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-name')).toHaveValue(examples[prefix].startScenarios[0].characterName);
    await expect(page.locator('#cg-name-field')).toBeHidden();
    await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
    await page.getByRole('button', {name:'Begin', exact:true}).click();
    const result = await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state;
      return {selected:s.player.charId === s.start.existingPerson.charId, slot:s.player.homeSettlement};
    });
    expect(result).toEqual({selected:true, slot:0});
  });

  test(prefix + ' offers a fixed Story identity and creates its original family through an ordinary import', async function ({page}, info) {
    await importExample(page, info, prefix);
    await seedScreen(page);
    const sc = examples[prefix].startScenarios[0];
    for (const invalid of [code(prefix).replace(sc.characterName.replace(/ /g, '_'), 'Someone_Else'),
      code(prefix).replace('-' + sc.sex + '-', sc.sex === 'm' ? '-f-' : '-m-'),
      code(prefix).replace('-standard', '-established'),
      code(prefix).replace(sc.fixedProvinceId, prefix === 'harbor' ? 'harbor_ridge' : 'dune_pass'),
      code(prefix) + '-1']) {
      await page.locator('#ng-seed').fill(invalid);
      await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
      await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    }
    await page.locator('#ng-seed').fill(code(prefix));
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#cg-name')).toHaveValue(sc.characterName);
    await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
    await expect(page.locator('#cg-fixed')).toContainText(sc.characterName);
    await expect(page.locator('#cg-community')).toBeHidden();
    await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
    await page.getByRole('button', {name:'Begin', exact:true}).click();
    const result = await page.evaluate(function (prefix) {
      FB.game.setPaused(true);
      const s = FB.state, me = s.chars[s.player.charId], rid = prefix + '_house';
      const member = function (id) { return FB.authoredRoyalMemberSnapshot(s, rid, id); };
      const person = function (id) { return s.chars[member(id).charId]; };
      const before = JSON.stringify([s, FB.getRngState(), FB.getUidCounter()]);
      const replayBlocked = FB.adoptStartingPerson(s, FBDATA.startScenarios.find(function (sc) { return sc.id === s.start.scenarioId; })) === null;
      const pure = before === JSON.stringify([s, FB.getRngState(), FB.getUidCounter()]);
      return {same:me === person('chosen'), one:Object.values(s.chars).filter(function (c) { return c.name === me.name; }).length,
        father:me.fatherId === person('father').id && person('father').dead,
        mother:me.motherId === person('mother').id,
        spouse:me.spouseId === person('partner').id && person('partner').spouseId === me.id,
        child:me.childrenIds.indexOf(person('child').id) >= 0 &&
          (me.sex === 'm' ? person('child').fatherId : person('child').motherId) === me.id,
        sibling:person('sibling').fatherId === me.fatherId && person('sibling').motherId === me.motherId,
        remote:FB.characterResidence(s, person('sibling')), home:s.player.provinceId,
        retainedMother:FB.isHouseholdCharacter(s, person('mother').id),
        unrelated:FB.isHouseholdCharacter(s, person('other').id),
        ruler:FB.realmRulerCharacterSnapshot(s, rid).name, noPublicRealm:!s.realms.player,
        noLand:s.player.provs.length === 0, noCommand:!s.player.militaryCommand,
        tier:s.player.tier, profession:s.player.profession, gold:s.player.gold,
        personalStation:me.station, tracks:!!s.stories[prefix + '_existing_track'],
        marker:s.start.existingPerson.memberId, replayBlocked:replayBlocked, pure:pure};
    }, prefix);
    expect(result).toMatchObject({same:true, one:1, father:true, mother:true, spouse:true, child:true, sibling:true,
      retainedMother:true, unrelated:false, noPublicRealm:true, noLand:true, noCommand:true, tracks:true,
      marker:'chosen', replayBlocked:true, pure:true, tier:sc.tier, profession:sc.profession, gold:sc.gold,
      home:sc.fixedProvinceId, remote:prefix === 'harbor' ? 'harbor_ridge' : 'dune_pass',
      ruler:prefix === 'harbor' ? 'Aren Reed' : 'Maren Ash'});
    expect(result.personalStation).toBeGreaterThanOrEqual(3);
  });

  test(prefix + ' rejects malformed selectors and mismatched revisions without changing a registry or campaign', async function ({page}, info) {
    await importExample(page, info, prefix);
    const result = await page.evaluate(function (input) {
      const clone = function (value) { return JSON.parse(JSON.stringify(value)); };
      const prefix = input.prefix, mod = input.mod, sc = mod.startScenarios[0], bm = mod.bookmarks[prefix + '_world'];
      const baseline = JSON.stringify([FBDATA.startScenarios, FBDATA.bookmarks, FB.state, FB.getRngState(), FB.getUidCounter()]);
      const changes = [
        function (m) { m.startScenarios[0].existingPerson = null; },
        function (m) { m.startScenarios[0].existingPerson.extra = true; },
        function (m) { m.startScenarios[0].existingPerson.memberId = 'missing'; },
        function (m) { m.startScenarios[0].existingPerson.realmId = 'missing'; },
        function (m) { m.startScenarios[0].rulerRealmId = prefix + '_house'; },
        function (m) { m.startScenarios[0].governmentForm = 'regnum'; },
        function (m) { m.startScenarios[0].startAge++; },
        function (m) { m.startScenarios[0].sex = sc.sex === 'm' ? 'f' : 'm'; },
        function (m) { m.startScenarios[0].startReligion = 'catholic'; },
        function (m) { m.startScenarios[0].startCulture = 'frankish'; },
        function (m) { m.startScenarios[0].existingPerson.householdMemberIds.push('chosen'); },
        function (m) { m.startScenarios[0].existingPerson.householdMemberIds.push('other'); },
        function (m) { m.startScenarios[0].existingPerson.householdMemberIds = ['chosen']; },
        function (m) { m.startScenarios[0].tracks = []; },
        function (m) { m.bookmarks[prefix + '_world'].realms[0].royalCourt.members.find(function (p) { return p.id === 'chosen'; }).alive = false; },
        function (m) { m.bookmarks[prefix + '_world'].realms[0].royalCourt.members.find(function (p) { return p.id === 'chosen'; }).born = 890; },
        function (m) { m.bookmarks[prefix + '_world'].realms[0].royalCourt.members.find(function (p) { return p.id === 'chosen'; }).homeProvinceId = prefix === 'harbor' ? 'harbor_ridge' : 'dune_pass'; }
      ];
      const rejected = changes.map(function (change) {
        const candidate = clone(mod); change(candidate);
        try { FB.mods.validate(candidate); return false; } catch (error) { return true; }
      });
      const wrong = clone(bm); wrong.revision = 'different'; delete wrong.realms[0].royalCourt;
      const absent = FB.existingPersonStartProfile(sc, wrong) === null;
      const valid = !!FB.existingPersonStartProfile(sc, FB.bookmark(prefix + '_world'));
      return {rejected:rejected, absent:absent, valid:valid,
        pure:baseline === JSON.stringify([FBDATA.startScenarios, FBDATA.bookmarks, FB.state, FB.getRngState(), FB.getUidCounter()])};
    }, {prefix:prefix, mod:examples[prefix]});
    expect(result.rejected).toEqual(Array(17).fill(true));
    expect(result).toMatchObject({absent:true, valid:true, pure:true});
  });

  test(prefix + ' matching saves preserve selection and actual later homes while forged provenance fails detached adoption', async function ({page}, info) {
    await importExample(page, info, prefix); await begin(page, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, rid = prefix + '_house', b = s.start.existingPerson;
      const remote = prefix === 'harbor' ? 'harbor_ridge' : 'dune_pass';
      // Ordinary residence may diverge after the opening; provenance is historical.
      const mother = s.chars[b.household.find(function (r) { return r.memberId === 'mother'; }).charId];
      mother.homeProvinceId = remote; mother.householdResidenceId = remote;
      s.player.gold = 2;
      const before = JSON.stringify([s.chars, s.start, s.player.gold, s.realms[rid].treasury, s.stories]);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      const matching = before === JSON.stringify([FB.state.chars, FB.state.start, FB.state.player.gold, FB.state.realms[rid].treasury, FB.state.stories]);
      const mutations = [function (b) { b.version = 0; }, function (b) { b.memberId = 'sibling'; },
        function (b) { b.charId = 'someone_else'; }, function (b) { b.realmId = 'other'; },
        function (b) { b.extra = 1; }, function (b) { b.household.pop(); },
        function (b) { b.household[0].charId = b.household[1].charId; }, function (b) { b.familyIds.pop(); }];
      const stable = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      const rejected = mutations.map(function (change) {
        const invalid = JSON.parse(JSON.stringify(saved)); change(invalid.state.start.existingPerson);
        try { FB.save.restore(invalid); return false; } catch (error) {
          return FB.state === stable && rng === FB.getRngState() && uid === FB.getUidCounter();
        }
      });
      const missing = JSON.parse(JSON.stringify(saved)); delete missing.state.chars[b.charId];
      let noRepair = false;
      try { FB.save.restore(missing); } catch (error) { noRepair = FB.state === stable; }
      const legacy = JSON.parse(JSON.stringify(saved)); delete legacy.state.start.existingPerson;
      FB.save.restore(legacy);
      return {matching:matching, rejected:rejected, noRepair:noRepair,
        absent:!Object.prototype.hasOwnProperty.call(FB.state.start, 'existingPerson'),
        noReplay:FB.state.player.gold === 2, remote:FB.characterResidence(FB.state, FB.state.chars[mother.id])};
    }, prefix);
    expect(result).toEqual({matching:true, rejected:Array(8).fill(true), noRepair:true, absent:true, noReplay:true,
      remote:prefix === 'harbor' ? 'harbor_ridge' : 'dune_pass'});
  });

  test(prefix + ' code replay and ordinary direct creation preserve deterministic world and family identity', async function ({page}, info) {
    await importExample(page, info, prefix); await begin(page, prefix);
    const snapshot = async function () {
      return page.evaluate(function () {
        const s = FB.state; return JSON.stringify([s.seed, s.chars, s.player, s.owner, s.holder, s.start, s.stories, FB.getRngState() >>> 0, FB.getUidCounter()]);
      });
    };
    const first = await snapshot();
    await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showScreen('title'); });
    await seedScreen(page);
    await page.locator('#ng-seed').fill(code(prefix)); await page.locator('#ng-seed').press('Enter');
    // Direct creation uses the same pending choices and canonical constructor.
    await page.evaluate(function () { FB.game.start(); FB.game.setPaused(true); });
    expect(await snapshot()).toBe(first);
  });

  test(prefix + ' selected and ordinary households have identical source government, public funds, land and armies', async function ({page}, info) {
    await importExample(page, info, prefix); await begin(page, prefix);
    const publicFacts = async function () {
      return page.evaluate(function (prefix) {
        const s = FB.state, rid = prefix + '_house';
        return JSON.stringify([s.owner, s.holder, s.realms[rid].ruler, s.realms[rid].treasury,
          s.authority.governments[rid], s.armies]);
      }, prefix);
    };
    const first = await publicFacts();
    await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showScreen('title'); });
    await begin(page, prefix, 1);
    expect(await publicFacts()).toBe(first);
  });

  test(prefix + ' source succession keeps private property separate and can crown the same existing person', async function ({page}, info) {
    await importExample(page, info, prefix); await begin(page, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, rid = prefix + '_house', me = s.chars[s.player.charId], r = s.realms[rid];
      const family = r.succession;
      const heir = FB.authoredRoyalMemberSnapshot(s, rid, prefix === 'harbor' ? 'chosen' : 'sibling');
      family.designatedHeirId = heir.id; FB.refreshRealmSuccession(s, rid);
      const gold = r.treasury.gold, ownership = JSON.stringify([s.owner, s.holder]), privateGold = s.player.gold;
      const old = FB.realmRulerCharacterSnapshot(s, rid), generation = family.rulerGeneration;
      FB.killChar(s, old);
      const crownedPlayer = prefix === 'harbor';
      const result = {same:heir.charId === (crownedPlayer ? me.id : FB.realmRulerCharacterSnapshot(s, rid).id),
        generations:family.rulerGeneration - generation, alive:!me.dead,
        noCopy:Object.values(s.chars).filter(function (c) { return c.name === me.name; }).length === 1,
        ordinary:crownedPlayer ? s.player.provs.length > 0 && !r.alive && !!s.realms.player :
          ownership === JSON.stringify([s.owner, s.holder]) && privateGold === s.player.gold && gold === r.treasury.gold && !s.realms.player};
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      result.restored = FB.state.start.existingPerson.charId === me.id;
      return result;
    }, prefix);
    expect(result).toEqual({same:true, generations:1, alive:true, noCopy:true, ordinary:true, restored:true});
  });

  test(prefix + ' original player death updates the source line once and keeps family through player succession', async function ({page}, info) {
    await importExample(page, info, prefix); await begin(page, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, original = s.player.charId, rid = prefix + '_house';
      const child = FB.authoredRoyalMemberSnapshot(s, rid, 'child'), me = s.chars[original], partnerId = me.spouseId;
      const sourceRuler = FB.realmRulerCharacterSnapshot(s, rid).id;
      FB.game.die('A bounded succession fixture.');
      const dead = me.dead && FB.authoredRoyalMemberSnapshot(s, rid, 'chosen').alive === false;
      FB.game.succeedTo(child.charId);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {dead:dead, successor:FB.state.player.charId === child.charId,
        original:FB.state.start.existingPerson.charId === original,
        ruler:FB.realmRulerCharacterSnapshot(FB.state, rid).id === sourceRuler,
        retained:!!FB.state.chars[original] && FB.state.chars[original].dead,
        noNewParents:FB.state.chars[child.charId].fatherId === (me.sex === 'm' ? me.id : partnerId)};
    }, prefix);
    expect(result).toEqual({dead:true, successor:true, original:true, ruler:true, retained:true, noNewParents:true});
  });

  test(prefix + ' one annual boundary leaves protagonist mortality with the player and unrelated compaction with the court', async function ({page}, info) {
    await importExample(page, info, prefix); await begin(page, prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, me = s.chars[s.player.charId], born = me.born;
      const rid = prefix + '_house', family = s.realms[rid].succession;
      const other = FB.authoredRoyalMemberSnapshot(s, rid, 'other');
      const ancestor = FB.authoredRoyalMemberSnapshot(s, rid, 'father');
      const kept = FB.courtRecordRetained(s, s.chars[ancestor.charId]);
      const compacted = FB.courtMemberDied(s, other, s.chars[other.charId]);
      const chance = FB.chance, world = FB.worldTick, trait = FB.traitAgg;
      const tech = FB.techBonus, holding = FB.holdingBonus, item = FB.itemBonus;
      const standards = FB.householdStandardEffect, medical = FB.householdMedicalProtection, market = FB.marketMortalityPressure;
      let rolls = 0, courtHandled = false;
      try {
        s.date.season = 3; s.date.day = 90; s.turn = 359;
        delete s.player.flags.ill; delete s.player.flags.plague_here; me.health = 8;
        const nextAge = s.date.year + 1 - born, base = nextAge < 30 ? 0.008 : 0.012;
        const target = 0.123456789;
        FB.traitAgg = function (c) {
          const out = trait(c); return c.id === me.id ? Object.assign({}, out, {health:base - target}) : out;
        };
        FB.techBonus = function (s, key, rid) { return key === 'health' ? 0 : tech(s, key, rid); };
        FB.holdingBonus = function (s, key) { return key === 'health' ? 0 : holding(s, key); };
        FB.itemBonus = function (s, key, cid) { return key === 'health' ? 0 : item(s, key, cid); };
        FB.householdStandardEffect = function (s, key) { return key === 'mortality' ? 0 : standards(s, key); };
        FB.householdMedicalProtection = function () { return 0; };
        FB.marketMortalityPressure = function () { return 0; };
        FB.chance = function (q) { if (Math.abs(q - target) < 0.000000001) rolls++; return false; };
        FB.worldTick = function (s) {
          const context = world(s); courtHandled = !!context.courtMortalityHandled[me.id]; return context;
        };
        FB.game.passDay({deferUi:true});
      } finally {
        FB.chance = chance; FB.worldTick = world; FB.traitAgg = trait;
        FB.techBonus = tech; FB.holdingBonus = holding; FB.itemBonus = item;
        FB.householdStandardEffect = standards; FB.householdMedicalProtection = medical; FB.marketMortalityPressure = market;
      }
      return {rolls:rolls, courtHandled:courtHandled, kept:kept, compacted:compacted,
        ancestor:!!s.chars[ancestor.charId], unrelated:other.charId === null,
        alive:!me.dead, born:me.born === born, age:FB.ageOf(me, s.date.year),
        one:family.members[me.royalLine.memberId].charId === me.id};
    }, prefix);
    expect(result).toEqual({rolls:1, courtHandled:false, kept:true, compacted:true, ancestor:true, unrelated:true,
      alive:true, born:true, age:prefix === 'harbor' ? 25 : 31, one:true});
  });

  for (const index of [1, 2]) {
    test(prefix + ' leaves the ' + (index === 1 ? 'ordinary' : 'ruler') + ' start on its original constructor', async function ({page}, info) {
      await importExample(page, info, prefix); await begin(page, prefix, index);
      const result = await page.evaluate(function (index) {
        const s = FB.state, me = s.chars[s.player.charId];
        return {absent:!Object.prototype.hasOwnProperty.call(s.start, 'existingPerson'),
          parents:index === 1 ? !!me.fatherId && !!me.motherId : true,
          royal:index === 2 ? !!s.start.rulerRealmId && !!s.realms.player : !s.realms.player};
      }, index);
      expect(result).toEqual({absent:true, parents:true, royal:true});
    });
  }
}
