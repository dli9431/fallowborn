'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/save.js',
  'js/model.js',
  'js/world.js'
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
    await expect(page.locator('#gm-body')).toContainText('Stepfamily');
    await expect(page.locator('#gm-body')).toContainText(ordinary.childName);
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
