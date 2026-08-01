'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame, START_CODE } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

/* Ages the deterministic protagonist past the retirement threshold and gives
   her a same-house child of the requested age. Returns the child's id. */
function arrangeFamily(page, childAge) {
  return page.evaluate(function (childAge) {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    me.born = s.date.year - 55;
    const child = FB.makeCharacter(s, {
      name:'Edwin', sex:'m', culture:me.culture, religion:me.religion,
      born:s.date.year - childAge, motherId:me.id, dyn:me.dyn, traitsN:0
    });
    child.health = 8;
    me.childrenIds.push(child.id);
    FB.touchFamily();
    return child.id;
  }, childAge);
}

test('blocks retirement while imprisoned, at war, traveling, or on campaign',
  async function ({ page }) {
    await startDeterministicGame(page);
    await arrangeFamily(page, 20);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const deed = FB.instants.filter(function (a) { return a.id === 'retire'; })[0];
      function probe(setup, teardown) {
        setup();
        const preview = FB.game.retirePreview();
        const out = {
          eligible:preview.eligible,
          blockers:preview.blockers,
          can:deed.can(s)
        };
        FB.ui.showRetirement();
        out.modalText = document.getElementById('gm-body').textContent;
        FB.ui.closeModal();
        teardown();
        return out;
      }
      return {
        deedShown: !!deed && deed.show(s),
        prison: probe(function () { s.player.flags.in_prison = 1; },
          function () { delete s.player.flags.in_prison; }),
        war: probe(function () { s.player.war = { enemy:'francia' }; },
          function () { s.player.war = null; }),
        travel: probe(function () { s.player.travel = { purpose:'visit' }; },
          function () { s.player.travel = null; }),
        campaign: probe(function () { s.player.flags.on_campaign = 1; },
          function () { delete s.player.flags.on_campaign; }),
        eligibleAfter: FB.game.retirePreview().eligible
      };
    });

    expect(result.deedShown).toBe(true);
    expect(result.prison.eligible).toBe(false);
    expect(result.prison.can).toMatch(/prisoner/);
    expect(result.prison.modalText).toMatch(/prisoner/);
    expect(result.war.eligible).toBe(false);
    expect(result.war.can).toMatch(/peace/);
    expect(result.travel.eligible).toBe(false);
    expect(result.travel.can).toMatch(/journey/);
    expect(result.campaign.eligible).toBe(false);
    expect(result.campaign.can).toMatch(/campaign/);
    expect(result.eligibleAfter).toBe(true);
  });

test('retirement hands control to an adult heir without death dues',
  async function ({ page }) {
    await startDeterministicGame(page);
    await arrangeFamily(page, 20);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const heir = s.chars[me.childrenIds[me.childrenIds.length - 1]];
      s.player.gold = 500;
      s.player.prestige = 100;
      s.player.flags.story_marker = 1;
      s.player.fired.personal_story = s.turn;
      s.player.cooldowns.personal_story = s.turn;
      s.player.plot = { id:'claim' };
      const preview = FB.game.retirePreview();
      const ok = FB.game.retireTo(heir.id);
      const old = s.chars[me.id];
      return {
        eligible:preview.eligible,
        ok:ok,
        playerCharId:s.player.charId,
        heirId:heir.id,
        oldAlive:!old.dead,
        oldRetired:old.retired === true,
        gold:s.player.gold,
        prestige:s.player.prestige,
        flags:Object.keys(s.player.flags),
        fired:Object.keys(s.player.fired),
        cooldowns:Object.keys(s.player.cooldowns),
        plot:s.player.plot,
        oldIsKin:!!FB.kinOf(s).byId[old.id],
        oldResidence:FB.characterResidence(s, old),
        home:s.player.provinceId,
        oldHousehold:FB.isHouseholdCharacter(s, old.id),
        retirementNews:s.log.some(function (entry) {
          return entry.msg && entry.msg.key === 'news.life.retirement';
        })
      };
    });

    expect(result.eligible).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.playerCharId).toBe(result.heirId);
    expect(result.oldAlive).toBe(true);
    expect(result.oldRetired).toBe(true);
    expect(result.gold).toBe(500); // no 10% death dues on retirement
    expect(result.prestige).toBe(60); // ordinary succession reduction still applies
    expect(result.flags).not.toContain('story_marker');
    expect(result.fired).toEqual([]);
    expect(result.cooldowns).toEqual([]);
    expect(result.plot).toBeNull();
    expect(result.oldIsKin).toBe(true);
    expect(result.oldResidence).toBe(result.home);
    expect(result.oldHousehold).toBe(false);
    expect(result.retirementNews).toBe(true);
  });

test('refuses retirement when no adult successor exists',
  async function ({ page }) {
    await startDeterministicGame(page);
    const childId = await arrangeFamily(page, 10);
    const result = await page.evaluate(function (childId) {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const preview = FB.game.retirePreview();
      const ok = FB.game.retireTo(childId);
      return {
        eligible:preview.eligible,
        blockers:preview.blockers,
        heirCount:preview.heirs.length,
        ok:ok,
        playerCharId:s.player.charId,
        meId:me.id,
        retired:me.retired === true
      };
    }, childId);

    expect(result.eligible).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/adult successor/);
    expect(result.heirCount).toBe(0);
    expect(result.ok).toBe(false);
    expect(result.playerCharId).toBe(result.meId);
    expect(result.retired).toBe(false);
  });

test('save and restore preserve the retired elder marker',
  async function ({ page }) {
    await startDeterministicGame(page);
    await arrangeFamily(page, 20);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const oldId = s.player.charId;
      const heirId = s.chars[oldId].childrenIds[
        s.chars[oldId].childrenIds.length - 1];
      if (!FB.game.retireTo(heirId)) return { ok:false };
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const rs = FB.state;
      const old = rs.chars[oldId];
      return {
        ok:true,
        playerCharId:rs.player.charId,
        heirId:heirId,
        oldRetired:!!old && old.retired === true,
        oldAlive:!!old && !old.dead,
        oldIsKin:!!old && !!FB.kinOf(rs).byId[oldId]
      };
    });

    expect(result.ok).toBe(true);
    expect(result.playerCharId).toBe(result.heirId);
    expect(result.oldRetired).toBe(true);
    expect(result.oldAlive).toBe(true);
    expect(result.oldIsKin).toBe(true);
  });

test.describe('sibling and collateral-household agency', function () {

  /* Returns the id of a living, unmarried, resident sibling of the
     protagonist, normalizing age and marital state so the manageable-kin
     rule is the only thing under test. */
  function arrangeSibling(page) {
    return page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      let sib = FB.siblingsOf(s, me).filter(function (c) {
        return !c.dead;
      })[0];
      if (!sib) {
        sib = FB.makeCharacter(s, {
          name:'Wulfric', sex:'m', culture:me.culture, religion:me.religion,
          born:s.date.year - 20, role:'sibling', dyn:me.dyn,
          fatherId:me.fatherId, motherId:me.motherId, traitsN:0
        });
        sib.health = 8;
      }
      sib.born = s.date.year - 20;
      sib.spouseId = null;
      sib.career = {
        profession:'farmer', rank:'journeyman', experience:4,
        startedYear:s.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      FB.touchFamily();
      return sib.id;
    });
  }

  test('resident unwed sibling joins the labor pool and accepts work',
    async function ({ page }) {
      await startDeterministicGame(page);
      const sibId = await arrangeSibling(page);
      const result = await page.evaluate(function (sibId) {
        const s = FB.state;
        const sib = s.chars[sibId];
        const enterprise = {
          uid:'sibling_enterprise_fixture',
          type:'orchard_business',
          provinceId:s.player.provinceId,
          settlement:0,
          workerId:null
        };
        s.player.enterprises = [enterprise];
        const assigned = FB.assignEnterprise(s, enterprise.uid, sibId);
        return {
          kind:FB.manageableKinKind(s, sibId),
          blocker:FB.manageableKinBlocker(s, sibId),
          inWorkers:FB.householdWorkers(s).some(function (c) {
            return c.id === sibId;
          }),
          inMembers:FB.householdMembers(s).some(function (c) {
            return c.id === sibId;
          }),
          choices:FB.careerChoices(s, sib).length,
          eligible:FB.enterpriseWorkersFor(s, enterprise).some(
            function (c) { return c.id === sibId; }),
          assigned:assigned,
          workerId:enterprise.workerId
        };
      }, sibId);

      expect(result.kind).toBe('sibling');
      expect(result.blocker).toBeNull();
      expect(result.inWorkers).toBe(true);
      expect(result.inMembers).toBe(false); // labor only, never membership
      expect(result.choices).toBeGreaterThan(0);
      expect(result.eligible).toBe(true);
      expect(result.assigned).toBe(true);
      expect(result.workerId).toBe(sibId);
    });

  test('married, vowed, landed, or absent siblings stay independent',
    async function ({ page }) {
      await startDeterministicGame(page);
      const sibId = await arrangeSibling(page);
      const result = await page.evaluate(function (sibId) {
        const s = FB.state;
        const sib = s.chars[sibId];
        const me = s.chars[s.player.charId];
        function probe() {
          return {
            kind:FB.manageableKinKind(s, sibId),
            blocker:FB.manageableKinBlocker(s, sibId),
            inWorkers:FB.householdWorkers(s).some(function (c) {
              return c.id === sibId;
            }),
            choices:FB.careerChoices(s, sib).length
          };
        }
        const out = { baseline:probe() };
        const spouse = FB.makeCharacter(s, {
          sex:sib.sex === 'm' ? 'f' : 'm',
          culture:me.culture, religion:me.religion,
          born:s.date.year - 20, role:'kinspouse'
        });
        spouse.health = 8;
        sib.spouseId = spouse.id; spouse.spouseId = sib.id;
        FB.touchFamily();
        out.married = probe();
        sib.spouseId = null; spouse.spouseId = null; spouse.dead = true;
        FB.touchFamily();
        out.widowed = probe();
        sib.career.profession = 'monk';
        out.vowed = probe();
        sib.career.profession = 'farmer';
        sib.station = 3;
        out.landed = probe();
        delete sib.station;
        const awayId = FB.world.provs.filter(function (province) {
          return !province.wasteland && province.id !== s.player.provinceId;
        })[0].id;
        sib.homeProvinceId = awayId;
        out.away = probe();
        delete sib.homeProvinceId;
        out.restored = probe();
        return out;
      }, sibId);

      expect(result.baseline.kind).toBe('sibling');
      expect(result.married).toEqual({
        kind:null, blocker:'married', inWorkers:false, choices:0
      });
      expect(result.widowed.kind).toBe('sibling');
      expect(result.vowed).toEqual({
        kind:null, blocker:'vowed', inWorkers:false, choices:0
      });
      expect(result.landed).toEqual({
        kind:null, blocker:'landed', inWorkers:false, choices:0
      });
      expect(result.away).toEqual({
        kind:null, blocker:'away', inWorkers:false, choices:0
      });
      expect(result.restored.kind).toBe('sibling');
    });

  test('marrying a managed sibling strips work and equipment',
    async function ({ page }) {
      await startDeterministicGame(page);
      const sibId = await arrangeSibling(page);
      const result = await page.evaluate(function (sibId) {
        const s = FB.state;
        const sib = s.chars[sibId];
        const me = s.chars[s.player.charId];
        const enterprise = {
          uid:'sibling_wedding_enterprise_fixture',
          type:'orchard_business',
          provinceId:s.player.provinceId,
          settlement:0,
          workerId:null
        };
        s.player.enterprises = [enterprise];
        FB.assignEnterprise(s, enterprise.uid, sibId);
        FB.ensureItems(s);
        s.player.loadouts[sibId] = { chest:'sibling_fixture_item' };
        const spouse = FB.makeCharacter(s, {
          sex:sib.sex === 'm' ? 'f' : 'm',
          culture:me.culture, religion:me.religion,
          born:s.date.year - 20, role:'kinspouse'
        });
        spouse.health = 8;
        const wed = FB.doKinWedding(s, sib, spouse);
        return {
          wed:wed,
          spouseId:sib.spouseId,
          workerId:enterprise.workerId,
          loadoutKept:Object.prototype.hasOwnProperty.call(
            s.player.loadouts, sibId),
          kind:FB.manageableKinKind(s, sibId),
          blocker:FB.manageableKinBlocker(s, sibId),
          inWorkers:FB.householdWorkers(s).some(function (c) {
            return c.id === sibId;
          })
        };
      }, sibId);

      expect(result.wed).toBe(true);
      expect(result.spouseId).toBeTruthy();
      expect(result.workerId).toBeNull();
      expect(result.loadoutKept).toBe(false);
      expect(result.kind).toBeNull();
      expect(result.blocker).toBe('married');
      expect(result.inWorkers).toBe(false);
    });

  test('Household Plan shows the sibling row with scoped cells',
    async function ({ page }) {
      await startDeterministicGame(page);
      const sibId = await arrangeSibling(page);
      /* A minor sibling hits the descent-line gates on the education and
         instruction cells; an adult would show the ordinary Completed
         state instead. */
      await page.evaluate(function (sibId) {
        const s = FB.state;
        s.chars[sibId].born = s.date.year - 12;
        FB.ui.showHouseholdPlan();
      }, sibId);
      const row = page.locator('tr.household-plan-kin' +
        ':has([data-household-plan-cid="' + sibId + '"])');
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('lives with the household');
      await expect(row.locator(
        '[data-household-plan-action="work"]')).toBeVisible();
      await expect(row.locator(
        '[data-household-plan-action="assignment"]')).toBeVisible();
      await expect(row.locator(
        '[data-household-plan-action="equipment"]')).toBeVisible();
      await expect(row).toContainText(
        'Education is managed for the household head and descendants');
      await expect(row).toContainText(
        'Matches are arranged for the descent line only');
      await expect(row.locator(
        '[data-household-plan-action="match"]')).toHaveCount(0);
      await expect(row.locator(
        '[data-household-plan-action="education"]')).toHaveCount(0);
      await expect(row.locator(
        '[data-household-plan-action="instruction"]')).toHaveCount(0);
      await page.locator('#household-plan-close').click();
    });

  test('a manageable sibling remains an eligible heir',
    async function ({ page }) {
      await startDeterministicGame(page);
      const sibId = await arrangeSibling(page);
      const result = await page.evaluate(function (sibId) {
        const s = FB.state;
        return {
          kind:FB.manageableKinKind(s, sibId),
          heir:FB.heirsOf(s).some(function (candidate) {
            return candidate.id === sibId;
          })
        };
      }, sibId);

      expect(result.kind).toBe('sibling');
      expect(result.heir).toBe(true);
    });
});

test.describe('starting-family presets', function () {

  /* Drives the shared-code path: paste a start code, reach the character
     screen, and begin. Mirrors startDeterministicGame's modal sequence. */
  async function startWithCode(page, code, name) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await expect(page.getByRole('heading', { name:'New Game', exact:true }))
      .toBeVisible();
    await page.locator('#ng-seed').fill(code);
    await page.getByRole('button', { name:/Use this seed/ }).click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-name')).toHaveValue(name);
    await page.getByRole('button', {
      name:'Begin Your Story', exact:true
    }).click();
    await expect(page.getByRole('heading', {
      name:'Your Story Begins', exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    await expect(page.getByRole('heading', { name:'Guide', exact:true }))
      .toBeVisible();
    await page.getByRole('button', { name:'Close', exact:true }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!(FB.state && FB.state.player &&
          FB.state.chars[FB.state.player.charId]);
      });
    }).toBe(true);
  }

  /* The household facts a preset start must guarantee, read back as plain
     data: protagonist age, spouse linkage, and each child's age and links. */
  function familyShape(page) {
    return page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const spouse = me.spouseId ? s.chars[me.spouseId] : null;
      return {
        seed:s.seed,
        seedParts:s.seed.split('-').length,
        age:s.date.year - me.born,
        spouse:spouse ? {
          linkedBoth:spouse.spouseId === me.id,
          role:spouse.role,
          inRoles:s.roles.spouse === spouse.id,
          oppositeSex:spouse.sex !== me.sex,
          health:spouse.health
        } : null,
        kids:me.childrenIds.map(function (id) {
          const c = s.chars[id];
          const father = s.chars[c.fatherId];
          const mother = s.chars[c.motherId];
          return {
            age:s.date.year - c.born,
            houseDyn:c.dyn === me.dyn,
            parents:(c.fatherId === me.id || c.motherId === me.id) &&
              spouse &&
              (c.fatherId === spouse.id || c.motherId === spouse.id),
            fatherLists:!!father && father.childrenIds.indexOf(c.id) >= 0,
            motherLists:!!mother && mother.childrenIds.indexOf(c.id) >= 0,
            health:c.health
          };
        }),
        heirs:FB.heirsOf(s).length
      };
    });
  }

  test('seven-part codes preselect their preset; bad presets are rejected',
    async function ({ page }, testInfo) {
      // an unknown preset id must be refused, not silently become another world
      await page.getByRole('button', { name:'New Game', exact:true }).click();
      await expect(page.getByRole('heading', { name:'New Game', exact:true }))
        .toBeVisible();
      await page.locator('#ng-seed').fill('CADENCE-867-farmer-london-f-Ada-nope');
      await page.getByRole('button', { name:/Use this seed/ }).click();
      await expect(page.locator('#ng-seed-err'))
        .toContainText('doesn’t parse');

      // a seven-part code per non-standard preset reaches a pre-filled chargen
      for (const preset of ['established', 'elder']) {
        await openGame(page, testInfo); // back to a fresh title screen
        await page.getByRole('button', { name:'New Game', exact:true }).click();
        await page.locator('#ng-seed')
          .fill('CADENCE-867-farmer-london-f-Ada-' + preset);
        await page.getByRole('button', { name:/Use this seed/ }).click();
        await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
        await expect(page.locator(
          'input[name=cg-family][value="' + preset + '"]')).toBeChecked();
      }

      // a six-part code still parses and implies the standard preset
      await openGame(page, testInfo);
      await page.getByRole('button', { name:'New Game', exact:true }).click();
      await page.locator('#ng-seed').fill(START_CODE);
      await page.getByRole('button', { name:/Use this seed/ }).click();
      await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
      await expect(page.locator('input[name=cg-family][value="standard"]'))
        .toBeChecked();
    });

  test('the character screen picker updates the summary and the start code',
    async function ({ page }) {
      await page.getByRole('button', { name:'New Game', exact:true }).click();
      await page.locator('#ng-seed').fill(START_CODE);
      await page.getByRole('button', { name:/Use this seed/ }).click();
      await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
      await expect(page.locator('#cg-summary')).toContainText('aged 16');

      await page.locator('input[name=cg-family][value="elder"]').check();
      await expect(page.locator('#cg-summary')).toContainText('aged 48');
      await expect(page.locator('#cg-summary'))
        .toContainText('grown children');

      await page.getByRole('button', {
        name:'Begin Your Story', exact:true
      }).click();
      await expect(page.getByRole('heading', {
        name:'Your Story Begins', exact:true
      })).toBeVisible();
      await page.getByRole('button', { name:'Begin', exact:true }).click();
      await expect(page.getByRole('heading', { name:'Guide', exact:true }))
        .toBeVisible();
      await page.getByRole('button', { name:'Close', exact:true }).click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      const shape = await familyShape(page);
      expect(shape.age).toBe(48);
      expect(shape.seedParts).toBe(7);
      expect(shape.seed.split('-')[6]).toBe('elder');
    });

  test('the established preset starts married with young children',
    async function ({ page }) {
      await startWithCode(page, 'HOUSE-867-farmer-london-m-Aldred-established',
        'Aldred');
      const shape = await familyShape(page);

      expect(shape.age).toBe(30);
      expect(shape.seedParts).toBe(7);
      expect(shape.seed.split('-')[6]).toBe('established');
      expect(shape.spouse).toEqual({
        linkedBoth:true, role:'spouse', inRoles:true,
        oppositeSex:true, health:8
      });
      expect(shape.kids.length).toBeGreaterThanOrEqual(1);
      expect(shape.kids.length).toBeLessThanOrEqual(2);
      for (const kid of shape.kids) {
        expect(kid.age).toBeGreaterThanOrEqual(1);
        expect(kid.age).toBeLessThan(30 - 16 + 1); // born after either parent turned 16
        expect(kid.houseDyn).toBe(true);
        expect(kid.parents).toBe(true);
        expect(kid.fatherLists).toBe(true);
        expect(kid.motherLists).toBe(true);
        expect(kid.health).toBe(8);
      }
      expect(shape.heirs).toBeGreaterThan(0);
    });

  test('the elder preset starts with an adult heir ready',
    async function ({ page }) {
      await startWithCode(page, 'ELDER-867-farmer-london-f-Ada-elder', 'Ada');
      const shape = await familyShape(page);

      expect(shape.age).toBe(48);
      expect(shape.seedParts).toBe(7);
      expect(shape.seed.split('-')[6]).toBe('elder');
      expect(shape.spouse).toEqual({
        linkedBoth:true, role:'spouse', inRoles:true,
        oppositeSex:true, health:8
      });
      expect(shape.kids.length).toBeGreaterThanOrEqual(2);
      expect(shape.kids.length).toBeLessThanOrEqual(3);
      for (const kid of shape.kids) {
        expect(kid.age).toBeGreaterThanOrEqual(1);
        expect(kid.houseDyn).toBe(true);
        expect(kid.parents).toBe(true);
        expect(kid.fatherLists).toBe(true);
        expect(kid.motherLists).toBe(true);
        expect(kid.health).toBe(8);
      }
      expect(Math.max.apply(null, shape.kids.map(function (kid) {
        return kid.age;
      }))).toBeGreaterThanOrEqual(16);
      expect(shape.heirs).toBeGreaterThan(0);
    });

  test('the standard start keeps the historical family shape and code',
    async function ({ page }) {
      await startDeterministicGame(page);
      const result = await page.evaluate(function () {
        const s = FB.state;
        const me = s.chars[s.player.charId];
        return {
          seed:s.seed,
          born:me.born,
          expectedBorn:s.start.year - FBDATA.balance.startAge,
          spouseId:me.spouseId,
          children:me.childrenIds.length,
          siblings:FB.siblingsOf(s, me).length,
          heirs:FB.heirsOf(s).length
        };
      });

      expect(result.seed).toBe(START_CODE); // still the old six-part shape
      expect(result.born).toBe(result.expectedBorn);
      expect(result.spouseId).toBeNull();
      expect(result.children).toBe(0);
      expect(result.siblings).toBeGreaterThanOrEqual(1);
      expect(result.heirs).toBeGreaterThan(0);
    });

  test('a seven-part code started twice serializes identically',
    async function ({ browser, page }, testInfo) {
      test.skip(testInfo.project.name !== 'chromium-file',
        'The preset determinism canary runs against the primary file target.');

      async function fingerprint(targetPage) {
        await startWithCode(targetPage,
          'ELDER-867-farmer-london-f-Ada-elder', 'Ada');
        return targetPage.evaluate(function () {
          const s = FB.state;
          const me = s.chars[s.player.charId];
          const family = {};
          [me.id, me.fatherId, me.motherId, me.spouseId]
            .concat(me.childrenIds)
            .forEach(function (id) {
              const c = s.chars[id];
              if (c) family[id] = JSON.stringify(c);
            });
          return {
            seed:s.seed,
            rng:FB.getRngState(),
            uid:FB.getUidCounter(),
            family:family
          };
        });
      }

      const first = await fingerprint(page);
      const secondContext = await browser.newContext({
        viewport:{ width:1280, height:800 },
        locale:'en-US',
        timezoneId:'UTC'
      });
      try {
        const secondPage = await secondContext.newPage();
        await openGame(secondPage, testInfo);
        const second = await fingerprint(secondPage);
        expect(second).toEqual(first);
      } finally {
        await secondContext.close();
      }
    });
});

test.describe('house renaming', function () {

  test('renameHouse rewrites every house member and the player realm identity',
    async function ({ page }) {
      await startDeterministicGame(page);
      const result = await page.evaluate(function () {
        const s = FB.state;
        const me = s.chars[s.player.charId];
        const oldDyn = me.dyn;
        const founderId = s.player.houseFounderId;
        const memberIds = [];
        for (const id in s.chars) {
          if (s.chars[id].dyn === oldDyn) memberIds.push(id);
        }
        /* a different house sharing the world must stay untouched */
        const outsider = FB.makeCharacter(s, {
          name:'Marta', sex:'f', culture:me.culture, religion:me.religion,
          born:s.date.year - 30, dyn:'NotTheHouse', traitsN:0
        });
        /* the derived realm identity foundPlayerRealm produces */
        s.realms.player = { id:'player', name:'Realm of ' + oldDyn,
          dynasty:oldDyn, alive:true };
        const res = FB.renameHouse(s, 'Nightingale');
        return {
          ok:res.ok, name:res.name, old:res.old, oldDyn:oldDyn,
          memberCount:memberIds.length,
          membersAfter:memberIds.map(function (id) {
            return s.chars[id].dyn;
          }),
          outsiderAfter:s.chars[outsider.id].dyn,
          realmName:s.realms.player.name,
          realmDynasty:s.realms.player.dynasty,
          founderKept:s.player.houseFounderId === founderId,
          news:s.log.some(function (entry) {
            return entry.msg && entry.msg.key === 'news.house.renamed' &&
              entry.msg.params.dynasty === 'Nightingale' &&
              entry.msg.params.old === oldDyn;
          })
        };
      });

      expect(result.ok).toBe(true);
      expect(result.old).toBe(result.oldDyn);
      expect(result.memberCount).toBeGreaterThan(2); // parents and siblings share the house
      for (const dyn of result.membersAfter) expect(dyn).toBe('Nightingale');
      expect(result.outsiderAfter).toBe('NotTheHouse');
      expect(result.realmName).toBe('Realm of Nightingale');
      expect(result.realmDynasty).toBe('Nightingale');
      expect(result.founderKept).toBe(true);
      expect(result.news).toBe(true);
    });

  test('renameHouse rejects invalid names without mutating anything',
    async function ({ page }) {
      await startDeterministicGame(page);
      const result = await page.evaluate(function () {
        const s = FB.state;
        const me = s.chars[s.player.charId];
        const dyn = me.dyn;
        const logLen = s.log.length;
        function probe(name) {
          const res = FB.renameHouse(s, name);
          return { ok:res.ok, reason:res.ok ? null : res.reason,
            dynKept:me.dyn === dyn };
        }
        const out = {
          empty:probe(''),
          whitespace:probe('   '),
          short:probe('A'),
          long:probe('Abcdefghijklmnopqrstuvw'), // 23 letters
          digits:probe('Ada2'),
          emoji:probe('House 😀'),
          punctuation:probe('O’Brien!'),
          unchanged:probe(dyn)
        };
        /* the inverse canary: apostrophes, hyphens, and spaces are legal */
        const valid = FB.renameHouse(s, 'O’Brien-Wells');
        out.valid = { ok:valid.ok, dyn:me.dyn };
        out.logDelta = s.log.length - logLen;
        return out;
      });

      expect(result.empty).toEqual({ ok:false, reason:'empty', dynKept:true });
      expect(result.whitespace).toEqual({ ok:false, reason:'empty', dynKept:true });
      expect(result.short).toEqual({ ok:false, reason:'short', dynKept:true });
      expect(result.long).toEqual({ ok:false, reason:'long', dynKept:true });
      expect(result.digits).toEqual({ ok:false, reason:'chars', dynKept:true });
      expect(result.emoji).toEqual({ ok:false, reason:'chars', dynKept:true });
      expect(result.punctuation).toEqual({ ok:false, reason:'chars', dynKept:true });
      expect(result.unchanged).toEqual({ ok:false, reason:'unchanged', dynKept:true });
      expect(result.valid).toEqual({ ok:true, dyn:'O’Brien-Wells' });
      expect(result.logDelta).toBe(1); // only the accepted rename records news
    });

  test('a byname still shadows the renamed house in fullName',
    async function ({ page }) {
      await startDeterministicGame(page);
      const result = await page.evaluate(function () {
        const s = FB.state;
        const me = s.chars[s.player.charId];
        me.byname = 'Andersdatter'; // patronymic-style personal surname
        const res = FB.renameHouse(s, 'Hrafn');
        return {
          ok:res.ok,
          dyn:me.dyn,
          byname:me.byname,
          fullName:FB.fullName(me),
          expected:me.name + ' Andersdatter'
        };
      });

      expect(result.ok).toBe(true);
      expect(result.dyn).toBe('Hrafn'); // the house identity still moved
      expect(result.byname).toBe('Andersdatter');
      expect(result.fullName).toBe(result.expected);
    });

  test('the Self tab renames the house through the modal',
    async function ({ page }) {
      await startDeterministicGame(page);
      const oldDyn = await page.evaluate(function () {
        FB.ui.showTab('char');
        return FB.state.chars[FB.state.player.charId].dyn;
      });

      const renameButton = page.locator('#self-rename-house');
      await expect(renameButton).toBeVisible();
      await renameButton.click();
      await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
      const input = page.locator('#rename-house-name');
      await expect(input).toHaveValue(oldDyn);

      /* an invalid name keeps the dialog open and explains itself */
      await input.fill('Ada2');
      await page.locator('[data-rename-house="confirm"]').click();
      await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
      await expect(page.locator('#rename-house-err'))
        .toContainText('letters, spaces, hyphens, and apostrophes');

      await input.fill('Nightingale');
      await page.locator('[data-rename-house="confirm"]').click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      const houseRow = page.locator(
        '#tab-char .kv:has(span:text-is("House")) b');
      await expect(houseRow).toHaveText('Nightingale');
      const stateDyn = await page.evaluate(function () {
        return FB.state.chars[FB.state.player.charId].dyn;
      });
      expect(stateDyn).toBe('Nightingale');
    });

  test('save and restore preserve the renamed house',
    async function ({ page }) {
      await startDeterministicGame(page);
      const result = await page.evaluate(function () {
        const s = FB.state;
        const me = s.chars[s.player.charId];
        const siblingIds = FB.siblingsOf(s, me).map(function (c) {
          return c.id;
        });
        FB.renameHouse(s, 'Nightingale');
        const saved = JSON.parse(FB.save.serialize());
        FB.save.restore(saved);
        const rs = FB.state;
        const rme = rs.chars[rs.player.charId];
        return {
          dyn:rme.dyn,
          fullName:FB.fullName(rme),
          siblingsRestored:siblingIds.map(function (id) {
            return rs.chars[id] ? rs.chars[id].dyn : null;
          })
        };
      });

      expect(result.dyn).toBe('Nightingale');
      expect(result.fullName).toContain('Nightingale');
      for (const dyn of result.siblingsRestored) {
        expect(dyn).toBe('Nightingale');
      }
    });
});
