'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/save.js',
  'js/model.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/world.js',
  'js/events.js',
  'js/actions.js',
  'data/map_data.js',
  'data/actions.js',
  'data/economy.js',
  'data/events_peasant.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame, unlockStartTier } = require('../support/game/start');

async function startWithCode(page, code, name) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.getByRole('heading', {
    name:'Use a Seed or Start Code', exact:true
  }).waitFor();
  await page.locator('#ng-seed').fill(code);
  await page.getByRole('button', { name:/Use this seed/ }).click();
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue(name);
  await page.getByRole('button', {
    name:'Begin Your Story',
    exact:true
  }).click();
  await expect(page.getByRole('heading', {
    name:'Your Story Begins',
    exact:true
  })).toBeVisible();
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await unlockStartTier(page, 1);
});

test('uses sex-aware novice address and recorded Norse patronyms',
  async function ({ page }) {
    await startWithCode(page,
      'NOVICE-867-monk-london-f-Alberada', 'Alberada');
    await expect(page.locator('#gm-body')).toContainText(
      'You are Sister Alberada');
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    await page.getByRole('button', { name:'Menu', exact:true }).click();
    await page.getByRole('button', { name:/Abandon to title/ }).click();
    await startWithCode(page,
      'PATRONYM-867-farmer-arhus-f-Fastvi', 'Fastvi');
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const dad = state.chars[me.fatherId];
      const granddad = state.chars[dad.fatherId];
      const sibling = FB.siblingsOf(state, me)[0];
      const before = {
        me:FB.fullName(me),
        dad:FB.fullName(dad),
        sibling:FB.fullName(sibling),
        meByname:me.byname,
        dadByname:dad.byname,
        siblingByname:sibling.byname,
        expectedMe:FB.patronym(dad.name, me.sex),
        expectedDad:FB.patronym(granddad.name, dad.sex),
        expectedSibling:FB.patronym(dad.name, sibling.sex),
        granddadId:granddad.id,
        house:[me.dyn, dad.dyn, granddad.dyn]
      };
      const data = JSON.parse(FB.save.serialize());
      FB.save.restore(data);
      const restored = FB.state.chars[FB.state.player.charId];
      return {
        before:before,
        restoredName:FB.fullName(restored),
        restoredByname:restored.byname
      };
    });

    expect(result.before.meByname).toBe(result.before.expectedMe);
    expect(result.before.dadByname).toBe(result.before.expectedDad);
    expect(result.before.siblingByname).toBe(result.before.expectedSibling);
    expect(result.before.me).toMatch(/datter$/);
    expect(result.before.granddadId).toBeTruthy();
    expect(new Set(result.before.house).size).toBe(1);
    expect(result.restoredName).toBe(result.before.me);
    expect(result.restoredByname).toBe(result.before.meByname);
  });

test('a widow succeeding after her son retains her children in Kin and succession',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const founder = s.chars[s.player.charId];
      const wife = FB.makeCharacter(s, {
        name:'Bebinn', sex:'f', born:s.date.year - 32,
        culture:founder.culture, religion:founder.religion,
        dyn:'Wife House', role:'spouse', traitsN:0
      });
      founder.spouseId = wife.id;
      wife.spouseId = founder.id;
      s.roles.spouse = wife.id;
      const son = FB.makeCharacter(s, {
        name:'Domnall', sex:'m', born:s.date.year - 18,
        culture:founder.culture, religion:founder.religion,
        dyn:founder.dyn, fatherId:founder.id, motherId:wife.id,
        traitsN:0
      });
      const daughter = FB.makeCharacter(s, {
        name:'Ornat', sex:'f', born:s.date.year - 16,
        culture:founder.culture, religion:founder.religion,
        dyn:founder.dyn, fatherId:founder.id, motherId:wife.id,
        traitsN:0
      });
      founder.childrenIds.push(son.id, daughter.id);
      /* Reproduce the one-sided record shown by the regression: the tree can
         follow each child's motherId, but the widow has no saved backlinks. */
      wife.childrenIds = [];
      FB.touchFamily();

      FB.game.die('Synthetic founder death');
      FB.ui.closeModal();
      const sonSucceeded = FB.game.succeedTo(son.id);
      FB.game.die('Synthetic son death');
      FB.ui.closeModal();
      const wifeWasEligible = FB.heirReview(s).some(function (row) {
        return row.character.id === wife.id && row.eligible;
      });
      const wifeSucceeded = FB.game.succeedTo(wife.id);
      const kin = FB.kinOf(s);
      const daughterReview = FB.heirReview(s).filter(function (row) {
        return row.character.id === daughter.id;
      })[0];
      FB.ui.refresh();
      return {
        sonSucceeded:sonSucceeded,
        wifeWasEligible:wifeWasEligible,
        wifeSucceeded:wifeSucceeded,
        protagonistId:s.player.charId,
        wifeId:wife.id,
        rawBacklinks:wife.childrenIds.slice(),
        kinChildren:kin.children.map(function (entry) {
          return entry.c.id;
        }),
        daughterId:daughter.id,
        daughterName:daughter.name,
        daughterReview:daughterReview && {
          eligible:daughterReview.eligible,
          code:daughterReview.code,
          group:daughterReview.group
        }
      };
    });

    expect(result.sonSucceeded).toBe(true);
    expect(result.wifeWasEligible).toBe(true);
    expect(result.wifeSucceeded).toBe(true);
    expect(result.protagonistId).toBe(result.wifeId);
    expect(result.rawBacklinks).toEqual([]);
    expect(result.kinChildren).toContain(result.daughterId);
    expect(result.daughterReview).toEqual({
      eligible:true,
      code:'child',
      group:'children'
    });
    await page.locator('#lefttabs .tab[data-tab="family"]').click();
    await expect(page.locator('#tab-family')).toContainText(result.daughterName);
    await expect(page.locator('#tab-family')).not.toContainText(
      'No living children');
  });

test('an adopted successor stays parentless and does not absorb founder siblings on restore',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const founder = s.chars[s.player.charId];
      const founderSibling = FB.siblingsOf(s, founder)[0];
      const siblingParents = [founderSibling.fatherId, founderSibling.motherId];
      FB.applyEffects(s, { adoptChild:true }, {}, { id:'e2e_adoption' });
      const adoptedId = founder.childrenIds[founder.childrenIds.length - 1];
      const adopted = s.chars[adoptedId];

      FB.game.die('Synthetic succession test');
      FB.ui.closeModal();
      const succeeded = FB.game.succeedTo(adopted.id);
      const siblingsBefore = FB.siblingsOf(s, adopted).map(function (c) {
        return c.id;
      });
      const kinshipBefore = FB.kinshipDegreeSnapshot(
        s, adopted, founderSibling);
      const manageableBefore = FB.manageableKinKind(s, founderSibling.id);
      const payload = JSON.parse(FB.save.serialize());
      /* Model a campaign saved by the preceding release: it has the recorded
         house founder but predates the explicit migration marker. */
      delete payload.state.player.familyParentMigration;
      const parentRoleIds = Object.keys(s.chars).filter(function (id) {
        return s.chars[id].role === 'parent';
      }).sort();
      const savedRng = JSON.stringify(payload.rng);

      FB.save.restore(payload);
      const restored = FB.state;
      const restoredAdopted = restored.chars[restored.player.charId];
      const restoredSibling = restored.chars[founderSibling.id];
      return {
        succeeded:succeeded,
        sameHead:restoredAdopted.id === adopted.id,
        parents:[restoredAdopted.fatherId, restoredAdopted.motherId],
        siblingsBefore:siblingsBefore,
        siblingsAfter:FB.siblingsOf(restored, restoredAdopted).map(function (c) {
          return c.id;
        }),
        kinshipBefore:kinshipBefore,
        kinshipAfter:FB.kinshipDegreeSnapshot(
          restored, restoredAdopted, restoredSibling),
        manageableBefore:manageableBefore,
        manageableAfter:FB.manageableKinKind(restored, restoredSibling.id),
        siblingParents:[restoredSibling.fatherId, restoredSibling.motherId],
        expectedSiblingParents:siblingParents,
        parentRoleIds:Object.keys(restored.chars).filter(function (id) {
          return restored.chars[id].role === 'parent';
        }).sort(),
        expectedParentRoleIds:parentRoleIds,
        migration:restored.player.familyParentMigration,
        rngStable:JSON.stringify(FB.getRngState()) === savedRng
      };
    });

    expect(result.succeeded).toBe(true);
    expect(result.sameHead).toBe(true);
    expect(result.parents).toEqual([null, null]);
    expect(result.siblingsBefore).toEqual([]);
    expect(result.siblingsAfter).toEqual([]);
    expect(result.kinshipBefore).toBe('unrelated');
    expect(result.kinshipAfter).toBe('unrelated');
    expect(result.manageableBefore).toBeNull();
    expect(result.manageableAfter).toBeNull();
    expect(result.siblingParents).toEqual(result.expectedSiblingParents);
    expect(result.parentRoleIds).toEqual(result.expectedParentRoleIds);
    expect(result.migration).toBe(1);
    expect(result.rngStable).toBe(true);
  });

test('restore removes parents fabricated for an adopted successor by the old repair',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const founder = s.chars[s.player.charId];
      const founderSiblings = FB.siblingsOf(s, founder).slice();
      const originalParents = {};
      for (let i = 0; i < founderSiblings.length; i++) {
        originalParents[founderSiblings[i].id] = [
          founderSiblings[i].fatherId, founderSiblings[i].motherId
        ];
      }
      FB.applyEffects(s, { adoptChild:true }, {}, { id:'e2e_adoption' });
      const adopted = s.chars[founder.childrenIds[
        founder.childrenIds.length - 1]];
      FB.game.die('Synthetic succession test');
      FB.ui.closeModal();
      FB.game.succeedTo(adopted.id);

      /* Recreate the exact bad state written by the former unguarded restore
         repair: a consecutive dead pair replaces the adopted head's absent
         parents and overwrites the founder siblings' true links. */
      const dad = FB.makeCharacter(s, {
        sex:'m', culture:adopted.culture, religion:adopted.religion,
        born:adopted.born - 25, role:'parent', quality:1
      });
      const mom = FB.makeCharacter(s, {
        sex:'f', culture:adopted.culture, religion:adopted.religion,
        born:adopted.born - 23, role:'parent'
      });
      dad.dyn = adopted.dyn;
      dad.dead = true;
      mom.dead = true;
      dad.died = s.date.year;
      mom.died = s.date.year;
      dad.spouseId = mom.id;
      mom.spouseId = dad.id;
      const rewired = [adopted].concat(founderSiblings);
      for (let i = 0; i < rewired.length; i++) {
        rewired[i].fatherId = dad.id;
        rewired[i].motherId = mom.id;
        dad.childrenIds.push(rewired[i].id);
        mom.childrenIds.push(rewired[i].id);
      }
      FB.touchFamily();
      const payload = JSON.parse(FB.save.serialize());
      delete payload.state.player.familyParentMigration;
      const corruptCount = Object.keys(payload.state.chars).length;
      const savedRng = JSON.stringify(payload.rng);

      FB.save.restore(payload);
      const restored = FB.state;
      const restoredAdopted = restored.chars[restored.player.charId];
      return {
        fakeParentsRemain:!!restored.chars[dad.id] || !!restored.chars[mom.id],
        adoptedParents:[restoredAdopted.fatherId, restoredAdopted.motherId],
        siblingParents:founderSiblings.map(function (sibling) {
          const c = restored.chars[sibling.id];
          return [c.fatherId, c.motherId];
        }),
        expectedSiblingParents:founderSiblings.map(function (sibling) {
          return originalParents[sibling.id];
        }),
        removedCount:corruptCount - Object.keys(restored.chars).length,
        migration:restored.player.familyParentMigration,
        rngStable:JSON.stringify(FB.getRngState()) === savedRng
      };
    });

    expect(result.fakeParentsRemain).toBe(false);
    expect(result.adoptedParents).toEqual([null, null]);
    expect(result.siblingParents).toEqual(result.expectedSiblingParents);
    expect(result.removedCount).toBe(2);
    expect(result.migration).toBe(1);
    expect(result.rngStable).toBe(true);
  });

test('founder siblings become a child successor\'s aunts or uncles, not siblings',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const founder = s.chars[s.player.charId];
      const founderSibling = FB.siblingsOf(s, founder)[0];
      const childOptions = {
        name:'Later Head', sex:'f', born:s.date.year - 18,
        culture:founder.culture, religion:founder.religion,
        dyn:founder.dyn, traitsN:0
      };
      childOptions[founder.sex === 'f' ? 'motherId' : 'fatherId'] = founder.id;
      const child = FB.makeCharacter(s, childOptions);
      founder.childrenIds.push(child.id);
      FB.touchFamily();

      FB.game.die('Synthetic succession test');
      FB.ui.closeModal();
      FB.game.succeedTo(child.id);
      const relation = FB.kinOf(s).byId[founderSibling.id];
      const card = FB.ui.charCardHtml(s, founderSibling, false, true);
      const interactions = FB.ui.characterInteractionCard(
        s, founderSibling.id);
      return {
        relation:relation,
        expected:founderSibling.sex === 'f' ? 'Aunt' : 'Uncle',
        inSiblingList:FB.siblingsOf(s, child).some(function (c) {
          return c.id === founderSibling.id;
        }),
        mislabeled:card.indexOf(FB.T('Your sibling')) >= 0,
        hostilityAvailable:interactions.actions.some(function (action) {
          return action.id === 'relationship.hostility.insult';
        })
      };
    });

    expect(result.relation).toBe(result.expected);
    expect(result.inSiblingList).toBe(false);
    expect(result.mislabeled).toBe(false);
    expect(result.hostilityAvailable).toBe(true);
  });

test('legacy parent synthesis runs once for a genuinely old founder save',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const payload = JSON.parse(FB.save.serialize());
      const player = payload.state.player;
      const founder = payload.state.chars[player.charId];
      const oldParentIds = [founder.fatherId, founder.motherId];
      delete player.familyParentMigration;
      delete player.houseFounderId;
      founder.fatherId = null;
      founder.motherId = null;
      for (const id in payload.state.chars) {
        const c = payload.state.chars[id];
        if (c.role === 'sibling' && c.dyn === founder.dyn) {
          c.fatherId = null;
          c.motherId = null;
        }
      }
      for (let i = 0; i < oldParentIds.length; i++) {
        delete payload.state.chars[oldParentIds[i]];
      }

      FB.save.restore(payload);
      const first = FB.state;
      const firstHead = first.chars[first.player.charId];
      const firstParents = [firstHead.fatherId, firstHead.motherId];
      const firstCount = Object.keys(first.chars).length;
      const secondPayload = JSON.parse(FB.save.serialize());
      const firstRng = JSON.stringify(secondPayload.rng);
      FB.save.restore(secondPayload);
      const second = FB.state;
      const secondHead = second.chars[second.player.charId];
      return {
        firstParents:firstParents,
        secondParents:[secondHead.fatherId, secondHead.motherId],
        firstCount:firstCount,
        secondCount:Object.keys(second.chars).length,
        migration:second.player.familyParentMigration,
        secondRestoreRngStable:JSON.stringify(FB.getRngState()) === firstRng
      };
    });

    expect(result.firstParents[0]).toBeTruthy();
    expect(result.firstParents[1]).toBeTruthy();
    expect(result.secondParents).toEqual(result.firstParents);
    expect(result.secondCount).toBe(result.firstCount);
    expect(result.migration).toBe(1);
    expect(result.secondRestoreRngStable).toBe(true);
  });

test('previews and settles protagonist dowries in the bride-pays direction',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const original = JSON.parse(FB.save.serialize());

      function suitor(sex) {
        const state = FB.state;
        const me = state.chars[state.player.charId];
        const c = FB.makeCharacter(state, {
          name:sex === 'f' ? 'Beatrice' : 'Edwin',
          sex:sex,
          culture:me.culture,
          religion:me.religion,
          born:state.date.year - 22,
          role:'suitor',
          station:2,
          traitsN:0,
          opinion:100
        });
        state.player.courtingId = c.id;
        state.player.flags.courting = 1;
        FB.courtshipTerms(state, c, true);
        return c;
      }

      let state = FB.state;
      let me = state.chars[state.player.charId];
      me.sex = 'f';
      let match = suitor('m');
      let terms = FB.courtshipTerms(state, match, false);
      FB.ui.runEvents([{ id:'proposal_made', ctx:{} }]);
      const confirmation = document.getElementById('ev-text').textContent;
      state.player.gold = terms.amount - 1;
      const blocked = FB.proposalStatus(state, match);
      const refused = FB.doMarry(state);
      const untouched = !me.spouseId && !match.spouseId;
      state.player.gold = terms.amount + 10;
      const paid = FB.doMarry(state);
      const afterPaid = state.player.gold;

      FB.save.restore(original);
      state = FB.state;
      me = state.chars[state.player.charId];
      me.sex = 'm';
      match = suitor('f');
      terms = FB.courtshipTerms(state, match, false);
      state.player.gold = 10;
      const received = FB.doMarry(state);
      const afterReceived = state.player.gold;
      const receivedAmount = terms.amount;

      FB.save.restore(original);
      state = FB.state;
      me = state.chars[state.player.charId];
      me.sex = 'f';
      match = suitor('m');
      state.player.gold = 10;
      const informal = FB.doMarry(state, { settleDowry:false });

      return {
        femalePays:terms.playerPays === false,
        confirmation:confirmation,
        blockedReady:blocked.ready,
        blockedReason:blocked.reason,
        refused:refused,
        untouched:untouched,
        paid:paid,
        afterPaid:afterPaid,
        received:received,
        afterReceived:afterReceived,
        receivedAmount:receivedAmount,
        informal:informal,
        afterInformal:state.player.gold
      };
    });

    expect(result.blockedReady).toBe(false);
    expect(result.confirmation).toContain('your house will provide');
    expect(result.blockedReason).toContain('must provide');
    expect(result.refused).toBe(false);
    expect(result.untouched).toBe(true);
    expect(result.paid).toBe(true);
    expect(result.afterPaid).toBe(10);
    expect(result.received).toBe(true);
    expect(result.afterReceived).toBe(10 + result.receivedAmount);
    expect(result.femalePays).toBe(true);
    expect(result.informal).toBe(true);
    expect(result.afterInformal).toBe(10);
  });

test('records ordinary and royal stepchildren without changing inheritance',
  async function ({ page }) {
    await startDeterministicGame(page);
    const ordinary = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const spouse = FB.makeCharacter(state, {
        name:'Edgar',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:state.date.year - 35,
        role:'suitor',
        station:1,
        traitsN:0
      });
      const former = FB.makeCharacter(state, {
        name:'Maud',
        sex:'f',
        culture:me.culture,
        religion:me.religion,
        born:state.date.year - 34,
        traitsN:0
      });
      const child = FB.makeCharacter(state, {
        name:'Oswin',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:state.date.year - 18,
        dyn:spouse.dyn,
        fatherId:spouse.id,
        motherId:former.id,
        traitsN:0
      });
      spouse.childrenIds.push(child.id);
      former.childrenIds.push(child.id);
      state.player.courtingId = spouse.id;
      FB.doMarry(state, { settleDowry:false });
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restoredState = FB.state;
      const restoredChild = restoredState.chars[child.id];
      const restoredMe = restoredState.chars[restoredState.player.charId];
      FB.ui.refresh();
      return {
        childId:child.id,
        childName:child.name,
        stepParentIds:restoredChild.stepParentIds,
        stepParentCount:restoredChild.stepParentIds.filter(function (id) {
          return id === restoredMe.id;
        }).length,
        relation:FB.kinOf(restoredState).byId[child.id],
        heir:FB.heirsOf(restoredState).some(function (c) {
          return c.id === child.id;
        }),
        household:FB.isHouseholdCharacter(restoredState, child.id),
        affinity:FB.courtshipStatus(restoredState, restoredChild).code
      };
    });

    expect(ordinary.stepParentIds).toContain(
      await page.evaluate(function () { return FB.state.player.charId; }));
    expect(ordinary.relation).toBe('Stepson');
    expect(ordinary.stepParentCount).toBe(1);
    expect(ordinary.heir).toBe(false);
    expect(ordinary.household).toBe(false);
    expect(ordinary.affinity).toBe('affinity');
    await page.locator('#lefttabs .tab[data-tab="family"]').click();
    await expect(page.locator('#tab-family')).toContainText('Stepchildren');
    await expect(page.locator('#tab-family')).toContainText(ordinary.childName);
    await page.evaluate(function () { FB.ui.showFamilyTree(); });
    await expect(page.getByRole('heading', {
      name:'The Family Tree',
      exact:true
    })).toBeVisible();
    await expect(page.locator('#gm-body .ftwrap')).toHaveCount(1);
    await expect(page.locator('#gm-body .fttree')).toHaveCount(1);
    await expect(page.locator('#gm-body')).not.toContainText('Stepfamily');
    await expect(page.locator(
      '.family-tree-primary .ftchip[data-cid="' + ordinary.childId + '"]'))
      .toHaveCount(1);
    await page.getByRole('button', { name:'Close', exact:true }).click();

    await page.reload({ waitUntil:'domcontentloaded' });
    await startDeterministicGame(page);
    const royal = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      let rid = null;
      for (const id in state.realms) {
        const realm = state.realms[id];
        if (id !== 'player' && realm && realm.alive && realm.generated) {
          rid = id;
          break;
        }
      }
      const spouse = FB.materializeRealmRuler(state, rid);
      const succession = FB.ensureRealmSuccession(state, rid);
      const root = succession.members[succession.rulerMemberId];
      let childMember = null;
      for (const id in succession.members) {
        const member = succession.members[id];
        if (member.parentId === root.id && member.alive !== false) {
          childMember = member;
          break;
        }
      }
      if (!childMember) {
        childMember = {
          id:'royal_step_fixture',
          name:'Royal Child',
          sex:'m',
          born:state.date.year - 17,
          alive:true,
          parentId:root.id,
          childIds:[],
          charId:null
        };
        succession.members[childMember.id] = childMember;
        root.childIds.push(childMember.id);
      }
      /* A reigning ruler now has a consort of record, and the courtship gate
         refuses a wed target. Widow this one so the fixture reaches doMarry
         in the state a player would actually have reached it in. */
      const consort = FB.realmConsortCharacter(state, rid);
      if (consort) FB.killChar(state, consort);
      me.sex = spouse.sex === 'm' ? 'f' : 'm';
      state.player.courtingId = spouse.id;
      FB.doMarry(state, { settleDowry:false });
      const childId = childMember.charId;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restoredState = FB.state;
      const restoredSpouse = restoredState.chars[spouse.id];
      const restoredMe = restoredState.chars[restoredState.player.charId];
      const child = restoredState.chars[childId];
      return {
        materialized:!!child,
        biologicalParent:child &&
          (child.fatherId === restoredSpouse.id ||
            child.motherId === restoredSpouse.id),
        parentListsChild:restoredSpouse.childrenIds.indexOf(child.id) >= 0,
        stepParent:child.stepParentIds.indexOf(restoredMe.id) >= 0,
        stepParentCount:child.stepParentIds.filter(function (id) {
          return id === restoredMe.id;
        }).length,
        relation:FB.kinOf(restoredState).byId[child.id],
        heir:FB.heirsOf(restoredState).some(function (candidate) {
          return candidate.id === child.id;
        }),
        household:FB.isHouseholdCharacter(restoredState, child.id)
      };
    });

    expect(royal).toEqual({
      materialized:true,
      biologicalParent:true,
      parentListsChild:true,
      stepParent:true,
      stepParentCount:1,
      relation:expect.stringMatching(/^Step/),
      heir:false,
      household:false
    });
  });

test('clears predecessor story state and keeps a living cousin eligible',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const old = state.chars[state.player.charId];
      const heir = FB.siblingsOf(state, old)[0];
      heir.career = {
        profession:'craftsman',
        rank:'master',
        experience:11,
        startedYear:state.date.year - 11,
        guildRank:'master',
        guildStanding:45,
        chosen:true
      };
      state.player.profession = 'soldier';
      state.player.professionBack = 'farmer';
      state.player.warService = 8;
      state.player.flags.on_campaign = 1;
      state.player.flags.polly_disguised = 1;
      state.player.fired.personal_story = state.turn;
      state.player.cooldowns.personal_story = state.turn;
      state.eventQueue.push({
        id:'personal_story_fixture',
        ctx:{ protagonistId:old.id }
      });
      FB.game.succeedTo(heir.id, { livingAbdication:true });
      const succession = {
        charId:state.player.charId,
        profession:state.player.profession,
        professionBack:state.player.professionBack,
        warService:state.player.warService,
        flags:Object.keys(state.player.flags),
        fired:Object.keys(state.player.fired),
        cooldowns:Object.keys(state.player.cooldowns),
        oldQueue:state.eventQueue.some(function (event) {
          return event.ctx && event.ctx.protagonistId === old.id;
        })
      };

      const me = state.chars[state.player.charId];
      for (const id in state.chars) {
        const c = state.chars[id];
        if (c.id !== me.id && c.dyn === me.dyn) c.dead = true;
      }
      const granddad = FB.makeCharacter(state, {
        name:'Aldred',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:me.born - 65,
        dyn:me.dyn,
        traitsN:0
      });
      const dad = FB.makeCharacter(state, {
        name:'Baldwin',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:me.born - 35,
        fatherId:granddad.id,
        dyn:me.dyn,
        traitsN:0
      });
      const uncle = FB.makeCharacter(state, {
        name:'Cuthbert',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:me.born - 30,
        fatherId:granddad.id,
        dyn:me.dyn,
        traitsN:0
      });
      const cousin = FB.makeCharacter(state, {
        name:'Dunstan',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:me.born - 2,
        fatherId:uncle.id,
        dyn:me.dyn,
        traitsN:0
      });
      granddad.childrenIds = [dad.id, uncle.id];
      dad.childrenIds = [me.id];
      uncle.childrenIds = [cousin.id];
      granddad.dead = true;
      dad.dead = true;
      uncle.dead = true;
      me.fatherId = dad.id;
      const heirs = FB.heirsOf(state);
      return {
        succession:succession,
        cousinId:cousin.id,
        heirIds:heirs.map(function (candidate) { return candidate.id; })
      };
    });

    expect(result.succession).toMatchObject({
      profession:'craftsman',
      professionBack:null,
      warService:0,
      oldQueue:false
    });
    expect(result.succession.flags).not.toContain('on_campaign');
    expect(result.succession.flags).not.toContain('polly_disguised');
    expect(result.succession.fired).toEqual([]);
    expect(result.succession.cooldowns).toEqual([]);
    expect(result.heirIds).toContain(result.cousinId);
  });

test('the memoized kin walk tracks marriages, births, deaths, and consorts',
  async function ({ page }) {
    await startWithCode(page, 'KINMEMO-867-farmer-london-f-Ada', 'Ada');
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const before = FB.kinOf(s);
      const cached = FB.kinOf(s) === before;

      /* A birth inside the same turn must be visible immediately: the kin
         answer is memoized on a stamp the family writers bump, not merely on
         the day turning. */
      const baby = FB.makeCharacter(s, {
        culture:me.culture, religion:me.religion, born:s.date.year,
        traitsN:0, fatherId:null, motherId:me.id
      });
      me.childrenIds.push(baby.id);
      FB.touchFamily();
      const sawBirth = !!FB.kinOf(s).byId[baby.id];

      FB.killChar(s, baby);
      const deadStillKin = !!FB.kinOf(s).byId[baby.id];

      /* A consort is a court character's spouse, and a spouse is not kin -
         the walk must not start dragging whole courts into the panel. */
      let consort = null;
      for (const rid in s.realms) {
        consort = FB.realmConsortCharacter(s, rid);
        if (consort) break;
      }
      const kin = FB.kinOf(s);
      let courtInKin = 0;
      for (const id in kin.byId) {
        if (s.chars[id] && s.chars[id].royalLine) courtInKin++;
      }
      return {
        cached:cached,
        sawBirth:sawBirth,
        deadStillKin:deadStillKin,
        foundConsort:!!consort,
        consortIsKin:!!(consort && kin.byId[consort.id]),
        courtInKin:courtInKin
      };
    })).toEqual({
      cached:true,
      sawBirth:true,
      deadStillKin:true,
      foundConsort:true,
      consortIsKin:false,
      courtInKin:0
    });
  });

test('divorce and spouse promotion invalidate family views in the same turn',
  async function ({ page }) {
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const first = FB.makeCharacter(s, {
        name:'First Spouse',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:me.religion,
        born:s.date.year - 22,
        traitsN:0
      });
      me.spouseId = first.id;
      first.spouseId = me.id;
      FB.touchFamily();
      const beforeDivorce = FB.spousesOf(s, me).length;
      FB.doDivorce(s, first.id);
      const afterDivorce = FB.spousesOf(s, me).length;

      const next = FB.makeCharacter(s, {
        name:'Next Spouse',
        sex:first.sex,
        culture:me.culture,
        religion:me.religion,
        born:s.date.year - 21,
        traitsN:0
      });
      next.spouseId = me.id;
      FB.touchFamily();
      FB.spousesOf(s, me);
      FB.promoteSpouse(s);
      return {
        sawMarriage:beforeDivorce === 1,
        divorceVisible:afterDivorce === 0,
        promoted:me.spouseId === next.id &&
          s.roles.spouse === next.id,
        promotionVisible:FB.spousesOf(s, me).some(function (spouse) {
          return spouse.id === next.id;
        })
      };
    })).toEqual({
      sawMarriage:true,
      divorceVisible:true,
      promoted:true,
      promotionVisible:true
    });
  });

test('a materialized consort links to the ruler in both directions',
  async function ({ page }) {
    await startWithCode(page, 'CONSORT-867-farmer-london-f-Ada', 'Ada');
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    expect(await page.evaluate(function () {
      const s = FB.state;
      const faults = [];
      let checked = 0;
      const ids = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (r && r.alive && rid !== 'player') ids.push(rid);
      }
      ids.sort();
      for (const rid of ids) {
        if (FB.papacyTerritorialRealm &&
            FB.papacyTerritorialRealm(s, rid)) continue;
        const ruler = FB.realmRulerCharacterSnapshot(s, rid);
        if (!ruler) { faults.push(rid + ': missing ruler'); continue; }
        const consortMember = FB.realmConsortMember(s, rid);
        const consort = FB.realmConsortCharacter(s, rid);
        /* A child ruler deliberately has only an unmaterialized reservation;
           the marriage is installed when both partners reach adulthood. */
        if (FB.ageOf(ruler, s.date.year) < 16 ||
            (consortMember && s.date.year - consortMember.born < 16)) {
          if (consort) faults.push(rid + ': minor has a consort');
          continue;
        }
        if (!consortMember || !consort) {
          faults.push(rid + ': incomplete couple');
          continue;
        }
        checked++;
        const fromRuler = FB.spousesOf(s, ruler).map(function (c) { return c.id; });
        const fromConsort = FB.spousesOf(s, consort).map(function (c) { return c.id; });
        if (fromRuler.indexOf(consort.id) < 0) faults.push(rid + ': ruler side');
        if (fromConsort.indexOf(ruler.id) < 0) faults.push(rid + ': consort side');
        if (FB.stepchildrenOf(s, consort).length) {
          faults.push(rid + ': consort has invented stepchildren');
        }
        if (checked === 20) break;
      }
      return { checked:checked, faults:faults.slice(0, 6) };
    })).toEqual({ checked:20, faults:[] });
  });

test('customary tenure persists across real character succession with duty requeue for successor, and closes upon tier promotion',
  async function ({ page }) {
    await startWithCode(page, 'ASCENT-867-serf-london-f-Ada', 'Ada');
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    expect(await page.evaluate(function () {
      const s = FB.state;
      const initialTenure = FB.ensureSerfTenure(s, 'family_test');
      const firstDuty = initialTenure.duties[0];
      const initialNextDueTurn = firstDuty.nextDueTurn;
      const ev = FB.eventById(firstDuty.eventId);
      s.turn = firstDuty.nextDueTurn;

      const oldProtagonistId = s.player.charId;
      const oldCtx = {
        tenureFormedTurn: initialTenure.formedTurn,
        archetypeId: initialTenure.archetypeId,
        dutyId: firstDuty.id,
        dueTurn: firstDuty.nextDueTurn,
        protagonistId: oldProtagonistId,
        locationId: s.player.provinceId
      };

      // Queue event for the initial protagonist
      s.eventQueue = [{ id: firstDuty.eventId, ctx: oldCtx }];
      const validBeforeDeath = FB.fns.serf_tenure_context_valid(s, oldCtx, ev);

      const me = s.chars[oldProtagonistId];
      const child = FB.makeCharacter(s, {
        name:'Alden', sex:'m', born:s.date.year - 18,
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null,
        culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0
      });
      me.childrenIds = [child.id];

      // Execute engine succession via FB.game.succeedTo
      FB.game.succeedTo(child.id);
      const postSuccessionTenure = FB.activeSerfTenure(s);
      const postSuccessionStatus = postSuccessionTenure ? postSuccessionTenure.status : null;
      const postSuccessionArchetypeId = postSuccessionTenure ? postSuccessionTenure.archetypeId : null;

      // 1. Succession drops the deceased protagonist's queued item, and the
      // original snapshotted context independently fails validation.
      const queuedDeceasedRemoved = !s.eventQueue.some(function (item) {
        return item.id === firstDuty.eventId && item.ctx &&
          item.ctx.protagonistId === oldProtagonistId;
      });
      const invalidForDeceased = FB.fns.serf_tenure_context_valid(s, oldCtx, ev);

      // 2. Daily tick clears invalid queue and requeues for the living heir
      s.eventQueue = [];
      FB.tenureDay(s);
      const requeuedEvent = s.eventQueue.filter(function (e) { return e.id === firstDuty.eventId; })[0];
      const validForHeir = requeuedEvent && FB.fns.serf_tenure_context_valid(s, requeuedEvent.ctx, ev);
      const heirProtagonistMatched = requeuedEvent && requeuedEvent.ctx.protagonistId === child.id;

      // 3. Tier promotion closes tenure and prevents future duty scheduling
      s.player.gold = FB.freedomPurchasePrice(s);
      FB.getRole(s, 'lord', true);
      FB.resolveSerfFreedom(s, { route:'purchase' }, {});
      const promotionClosed = s.player.tenure && s.player.tenure.status === 'closed';
      s.eventQueue = [];
      FB.tenureDay(s);
      const noEventsAfterPromotion = s.eventQueue.length === 0;

      // 4. Forced relocation replaces active tenure and preserves priorClosure
      s.player.tier = 0;
      delete s.player.tenure;
      FB.ensureSerfTenure(s, 'forced_origin');
      s.player.home = 'paris';
      s.player.provinceId = 'paris';
      const replacedTenure = FB.replaceSerfTenure(s, 'forced_settlement', 'forced_relocation');

      return {
        hasTenure: !!postSuccessionTenure,
        status: postSuccessionStatus,
        matchesArchetype: postSuccessionArchetypeId === initialTenure.archetypeId,
        provinceId: postSuccessionTenure && postSuccessionTenure.provinceId,
        schedulePreserved: postSuccessionTenure && postSuccessionTenure.duties[0].nextDueTurn === initialNextDueTurn,
        validBeforeDeath: validBeforeDeath,
        queuedDeceasedRemoved: queuedDeceasedRemoved,
        invalidForDeceased: invalidForDeceased,
        validForHeir: validForHeir,
        heirProtagonistMatched: heirProtagonistMatched,
        promotionClosed: promotionClosed,
        noEventsAfterPromotion: noEventsAfterPromotion,
        replacedProvince: replacedTenure && replacedTenure.provinceId,
        hasPriorClosure: !!(replacedTenure && replacedTenure.priorClosure)
      };
    })).toEqual({
      hasTenure: true,
      status: 'active',
      matchesArchetype: true,
      provinceId: 'london',
      schedulePreserved: true,
      validBeforeDeath: true,
      queuedDeceasedRemoved: true,
      invalidForDeceased: false,
      validForHeir: true,
      heirProtagonistMatched: true,
      promotionClosed: true,
      noEventsAfterPromotion: true,
      replacedProvince: 'paris',
      hasPriorClosure: true
    });
  });
