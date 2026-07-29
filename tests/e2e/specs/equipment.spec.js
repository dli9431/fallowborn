'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test('previews and applies Equip Best for one managed character',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const s = FB.state;
      const head = s.chars[s.player.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Beatrice',
        sex:'f',
        culture:head.culture,
        religion:head.religion,
        born:s.date.year - 25,
        dyn:head.dyn,
        role:'spouse',
        traits:[]
      });
      spouse.health = 8;
      head.spouseId = spouse.id;
      spouse.spouseId = head.id;

      const weak = FB.grantItem(s, 'round_shield', {
        quality:'plain',
        visualSeed:101
      });
      const strong = FB.grantItem(s, 'hero_sword');
      const armoryHand = FB.grantItem(s, 'keen_seax', {
        quality:'plain',
        visualSeed:202
      });
      FB.equipItem(s, spouse.id, 'rightHand', weak);
      FB.equipItem(s, head.id, 'rightHand', strong);

      const stalePreview = FB.equipBestPreview(s, spouse.id);
      FB.unequipItem(s, head.id, 'rightHand');
      const staleResult = FB.applyEquipBest(s, stalePreview);
      FB.equipItem(s, head.id, 'rightHand', strong);

      const before = JSON.stringify(s.player.loadouts);
      const rngBefore = JSON.stringify(FB.getRngState());
      const preview = FB.equipBestPreview(s, spouse.id);
      const after = JSON.stringify(s.player.loadouts);
      const rngAfter = JSON.stringify(FB.getRngState());
      FB.ui.showEquipmentModal(spouse.id, 'close');
      return {
        headId:head.id,
        headName:FB.fullName(head),
        targetId:spouse.id,
        targetName:FB.fullName(spouse),
        weak:weak,
        strong:strong,
        armoryHand:armoryHand,
        before:before,
        after:after,
        rngBefore:rngBefore,
        rngAfter:rngAfter,
        staleCode:staleResult.code,
        preview:preview
      };
    });

    expect(setup.staleCode).toBe('stale');
    expect(setup.preview.ok).toBe(true);
    expect(setup.preview.changed).toBe(true);
    expect(setup.preview.refs).toEqual(expect.arrayContaining([
      setup.strong,
      setup.armoryHand
    ]));
    expect(setup.preview.movements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ref:setup.strong,
        fromCid:setup.headId,
        toCid:setup.targetId
      }),
      expect.objectContaining({
        ref:setup.armoryHand,
        fromCid:null,
        toCid:setup.targetId
      }),
      expect.objectContaining({
        ref:setup.weak,
        fromCid:setup.targetId,
        toCid:null
      })
    ]));
    expect(setup.after).toBe(setup.before);
    expect(setup.rngAfter).toBe(setup.rngBefore);

    await expect(page.getByRole('heading', {
      name:'Equipment for ' + setup.targetName,
      exact:true
    })).toBeVisible();
    await expect(page.locator('[data-equip-cid="' + setup.targetId + '"]'))
      .toHaveCount(8);
    await page.getByRole('button', { name:/Equip Best/ }).click();

    await expect(page.getByRole('heading', {
      name:'Equip Best for ' + setup.targetName,
      exact:true
    })).toBeVisible();
    const movements = page.locator('.equip-best-movements');
    await expect(movements).toContainText(
      'Blade with a Name moves from ' + setup.headName);
    await expect(movements).toContainText(
      'Plain Round Shield returns from ' + setup.targetName + ' to the family armory.');
    await expect(movements).toContainText(
      'Plain Keen Seax moves from the family armory');

    await page.getByRole('button', { name:'Apply Equip Best', exact:true }).click();

    await expect(page.getByRole('heading', {
      name:'Equipment for ' + setup.targetName,
      exact:true
    })).toBeVisible();
    const applied = await page.evaluate(function (ids) {
      const s = FB.state;
      const loadout = FB.loadoutOf(s, ids.targetId);
      return {
        left:loadout.leftHand,
        right:loadout.rightHand,
        sourceItems:FB.equippedItemRefs(s, ids.headId),
        weakAssignment:FB.itemAssignment(s, ids.weak),
        rng:JSON.stringify(FB.getRngState())
      };
    }, setup);
    expect(applied.left).toBe(setup.armoryHand);
    expect(applied.right).toBe(setup.strong);
    expect(applied.sourceItems).not.toContain(setup.strong);
    expect(applied.weakAssignment).toBeNull();
    expect(applied.rng).toBe(setup.rngBefore);
    await expect(page.locator('[data-equip-cid="' + setup.targetId + '"]'))
      .toHaveCount(8);
  });
